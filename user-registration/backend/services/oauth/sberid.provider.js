const fetch = require('node-fetch');
const OAuthProvider = require('./provider.interface');

/**
 * Сбер ID — авторизация по протоколу OAuth2/OpenID Connect.
 * Официальная документация выдаётся при подключении в личном кабинете
 * разработчика Сбера — точные URL авторизации/токена/userinfo зависят
 * от того, к какому контуру (сайт/приложение) подключение оформлено.
 *
 * !! ВАЖНО: ниже — типовой OAuth2 authorization-code flow с placeholder-
 * эндпоинтами. Перед реальным запуском нужно подставить точные URL и
 * параметры из документации, которую выдаст Сбер при регистрации
 * приложения. Прошу уточнить/прислать эту документацию — сам не
 * додумываю конкретные эндпоинты, чтобы не ошибиться в интеграции
 * с реальным банком.
 */
class SberIDProvider extends OAuthProvider {
  constructor() {
    super('sberid');
  }

  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: process.env.SBERID_CLIENT_ID,
      redirect_uri: process.env.SBERID_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid name email',
      state,
    });
    // TODO: подставить реальный authorization endpoint из документации Сбера
    return `https://id.sber.ru/CSAFront/oidc/authorize.do?${params.toString()}`;
  }

  async handleCallback(query) {
    const { code } = query;
    // TODO: подставить реальный token endpoint из документации Сбера
    const tokenResp = await fetch('https://id.sber.ru/CSAFront/api/rest/oidc/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.SBERID_CLIENT_ID,
        client_secret: process.env.SBERID_CLIENT_SECRET,
        redirect_uri: process.env.SBERID_REDIRECT_URI,
      }),
    });
    const tokenData = await tokenResp.json();

    if (tokenData.error) {
      throw new Error(`SberID OAuth ошибка: ${tokenData.error_description || tokenData.error}`);
    }

    // TODO: подставить реальный userinfo endpoint
    const userResp = await fetch('https://id.sber.ru/CSAFront/api/rest/oidc/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userResp.json();

    return {
      providerUid: String(profile.sub || profile.id),
      profile,
    };
  }
}

module.exports = new SberIDProvider();
