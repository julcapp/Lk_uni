const crypto = require('crypto');
const OAuthProvider = require('./provider.interface');

/**
 * Telegram Login Widget. Документация: https://core.telegram.org/widgets/login
 * У Telegram нет классического redirect-flow — фронтенд встраивает виджет,
 * который сам присылает подписанные данные пользователя (id, first_name,
 * username, photo_url, auth_date, hash) на callback-эндпоинт.
 * Требует TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME в .env.
 */
class TelegramProvider extends OAuthProvider {
  constructor() {
    super('telegram');
  }

  getAuthUrl() {
    // Для Telegram нет URL редиректа — фронт использует Login Widget
    // с data-onauth, который сам вызовет наш callback. Возвращаем
    // имя бота, чтобы фронт мог отрендерить виджет.
    return { widget: true, botUsername: process.env.TELEGRAM_BOT_USERNAME };
  }

  /**
   * Проверка подлинности данных, присланных Telegram Login Widget.
   * Алгоритм из официальной документации Telegram.
   */
  async handleCallback(query) {
    const { hash, ...data } = query;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    const checkString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    if (computedHash !== hash) {
      throw new Error('Подпись Telegram не прошла проверку — данные могли быть подделаны');
    }

    const authAge = Date.now() / 1000 - Number(data.auth_date);
    if (authAge > 86400) {
      throw new Error('Данные авторизации Telegram устарели, повторите вход');
    }

    return {
      providerUid: String(data.id),
      profile: data,
    };
  }
}

module.exports = new TelegramProvider();
