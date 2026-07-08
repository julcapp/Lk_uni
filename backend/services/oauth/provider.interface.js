/**
 * Общий интерфейс, которому должен следовать любой провайдер верификации/входа
 * (VK, MAX, Telegram, SberID и все, что добавится позже).
 *
 * Каждый провайдер обязан реализовать:
 *   - id: строковый идентификатор ('vk' | 'max' | 'telegram' | 'sberid' | ...)
 *   - getAuthUrl(state): вернуть URL, на который редиректить пользователя
 *   - handleCallback(query): обменять code/параметры на профиль пользователя
 *       -> должен вернуть { providerUid, profile } — provider-специфичный uid
 *          и сырой профиль (для сохранения в user_identities.raw_profile)
 *
 * Это позволяет добавлять новых провайдеров, просто реализуя данный интерфейс
 * и регистрируя их в registry.js — без изменений в контроллере/роутах.
 */
class OAuthProvider {
  constructor(id) {
    if (!id) throw new Error('Provider id is required');
    this.id = id;
  }

  // eslint-disable-next-line no-unused-vars
  getAuthUrl(state) {
    throw new Error(`getAuthUrl() не реализован для провайдера "${this.id}"`);
  }

  // eslint-disable-next-line no-unused-vars
  async handleCallback(query) {
    throw new Error(`handleCallback() не реализован для провайдера "${this.id}"`);
  }
}

module.exports = OAuthProvider;
