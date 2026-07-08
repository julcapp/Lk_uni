const fetch = require('node-fetch');
const OAuthProvider = require('./provider.interface');

/**
 * VK OAuth2 (VK ID). Документация: https://id.vk.com/about/business/go/docs
 * Требует VK_CLIENT_ID, VK_CLIENT_SECRET, VK_REDIRECT_URI в .env.
 */
class VKProvider extends OAuthProvider {
  constructor() {
    super('vk');
  }

  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: process.env.VK_CLIENT_ID,
      redirect_uri: process.env.VK_REDIRECT_URI,
      response_type: 'code',
      scope: 'email',
      state,
    });
    return `https://id.vk.com/authorize?${params.toString()}`;
  }

  async handleCallback(query) {
    const { code } = query;
    const params = new URLSearchParams({
      client_id: process.env.VK_CLIENT_ID,
      client_secret: process.env.VK_CLIENT_SECRET,
      redirect_uri: process.env.VK_REDIRECT_URI,
      code,
      grant_type: 'authorization_code',
    });

    const tokenResp = await fetch(`https://id.vk.com/oauth2/auth?${params.toString()}`, { method: 'POST' });
    const tokenData = await tokenResp.json();

    if (tokenData.error) {
      throw new Error(`VK OAuth ошибка: ${tokenData.error_description || tokenData.error}`);
    }

    // TODO: уточнить у Александра точный endpoint получения профиля для
    // используемой версии VK ID API (может отличаться в зависимости от
    // того, какое приложение VK зарегистрировано — Standalone/VK Mini Apps/VK ID).
    return {
      providerUid: String(tokenData.user_id),
      profile: tokenData,
    };
  }
}

module.exports = new VKProvider();
