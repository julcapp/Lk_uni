const crypto = require('crypto');
const fetch = require('node-fetch');
const OAuthProvider = require('./provider.interface');

/**
 * VK ID — авторизация по протоколу OAuth 2.1 + PKCE.
 * Это НЕ старый oauth.vk.com (Implicit/Authorization Code с client_secret),
 * а новый протокол id.vk.com/id.vk.ru, который VK требует для всех новых
 * приложений (регистрация в личном кабинете https://id.vk.com -> «Мои приложения»).
 *
 * Ключевые отличия от классического OAuth2, которые важно не перепутать:
 *  - Обмен authorization code на токен идёт БЕЗ client_secret — вместо этого
 *    используется code_verifier/code_challenge (PKCE, S256).
 *  - VK в callback возвращает не только `code` и `state`, но и `device_id` —
 *    его обязательно нужно передать при обмене кода на токен, иначе обмен
 *    завершится ошибкой.
 *  - Обновление токена (`refresh_token`) — единственное место, где всё ещё
 *    нужен `client_secret`.
 *
 * Эндпоинты:
 *   Авторизация:      https://id.vk.com/authorize
 *   Обмен токена:      https://id.vk.com/oauth2/auth   (POST, form-urlencoded)
 *   Данные профиля:    https://id.vk.ru/oauth2/user_info (POST, form-urlencoded)
 *
 * !! Важно про хранение code_verifier: для простоты здесь используется
 * in-memory Map с TTL. Это нормально для одного процесса/инстанса. Если
 * бэкенд будет работать в нескольких процессах/контейнерах (кластер, PM2 -i,
 * несколько подов) — Map нужно заменить на Redis/MySQL, иначе обмен токена
 * будет падать всякий раз, когда callback обработает не тот процесс, что
 * выдавал ссылку авторизации. Сообщите, если нужно сразу сделать на Redis —
 * пока сделал в памяти, чтобы не плодить лишнюю инфраструктуру без запроса.
 */

const AUTHORIZE_URL = 'https://id.vk.com/authorize';
const TOKEN_URL = 'https://id.vk.com/oauth2/auth';
const USER_INFO_URL = 'https://id.vk.ru/oauth2/user_info';

const PKCE_TTL_MS = 10 * 60 * 1000; // 10 минут на прохождение авторизации в VK
const pkceStore = new Map(); // state -> { codeVerifier, createdAt }

function cleanupExpiredPkce() {
  const now = Date.now();
  for (const [key, value] of pkceStore.entries()) {
    if (now - value.createdAt > PKCE_TTL_MS) {
      pkceStore.delete(key);
    }
  }
}

function base64UrlEncode(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier() {
  return base64UrlEncode(crypto.randomBytes(32)); // 43 символа, укладывается в требуемые 43-128
}

function generateCodeChallenge(codeVerifier) {
  return base64UrlEncode(crypto.createHash('sha256').update(codeVerifier).digest());
}

class VKProvider extends OAuthProvider {
  constructor() {
    super('vk');
  }

  getAuthUrl(state) {
    cleanupExpiredPkce();

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    pkceStore.set(state, { codeVerifier, createdAt: Date.now() });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.VK_CLIENT_ID,
      redirect_uri: process.env.VK_REDIRECT_URI,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: 'email phone',
    });

    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async handleCallback(query) {
    const { code, state, device_id: deviceId } = query;

    if (!code || !state) {
      throw new Error('VK ID не вернул code или state — авторизация не завершена');
    }
    if (!deviceId) {
      throw new Error('VK ID не вернул device_id — без него нельзя обменять code на токен');
    }

    const pkce = pkceStore.get(state);
    if (!pkce) {
      throw new Error('Истёк срок ожидания авторизации VK ID (10 минут) либо state неизвестен — попробуйте войти заново');
    }
    pkceStore.delete(state); // одноразовое использование

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.VK_REDIRECT_URI,
      client_id: process.env.VK_CLIENT_ID,
      device_id: deviceId,
      code_verifier: pkce.codeVerifier,
      state,
    });

    const tokenResp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });
    const tokenData = await tokenResp.json();

    if (tokenData.error) {
      throw new Error(`VK ID: ошибка обмена кода на токен — ${tokenData.error_description || tokenData.error}`);
    }

    const userInfoParams = new URLSearchParams({
      client_id: process.env.VK_CLIENT_ID,
      access_token: tokenData.access_token,
    });

    const userResp = await fetch(USER_INFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: userInfoParams.toString(),
    });
    const userData = await userResp.json();

    if (userData.error) {
      throw new Error(`VK ID: ошибка получения профиля — ${userData.error_description || userData.error}`);
    }

    const profile = userData.user || userData;

    return {
      providerUid: String(profile.user_id || tokenData.user_id),
      profile: {
        ...profile,
        tokens: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
        },
      },
    };
  }

  /**
   * Обновление access_token — единственное место, где VK ID всё ещё требует
   * client_secret (в отличие от обмена authorization code, где используется PKCE).
   */
  async refreshToken(refreshToken) {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.VK_CLIENT_ID,
      client_secret: process.env.VK_CLIENT_SECRET,
    });

    const resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await resp.json();

    if (data.error) {
      throw new Error(`VK ID: ошибка обновления токена — ${data.error_description || data.error}`);
    }
    return data;
  }
}

module.exports = new VKProvider();
