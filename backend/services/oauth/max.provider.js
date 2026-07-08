const OAuthProvider = require('./provider.interface');

/**
 * MAX (мессенджер от VK) — заглушка.
 *
 * !! Я не располагаю проверенной официальной документацией по OAuth-входу
 * через MAX для сторонних сайтов на момент написания кода — фантазировать
 * конкретные эндпоинты не буду, как вы и просили. Как только пришлёте
 * ссылку на документацию/личный кабинет разработчика MAX — заполню
 * getAuthUrl() и handleCallback() по аналогии с vk.provider.js
 * (структура интерфейса уже готова и не потребует правок в остальном коде).
 */
class MaxProvider extends OAuthProvider {
  constructor() {
    super('max');
  }

  getAuthUrl() {
    throw new Error(
      'Провайдер MAX ещё не сконфигурирован: нужна документация/данные приложения от Александра'
    );
  }

  async handleCallback() {
    throw new Error(
      'Провайдер MAX ещё не сконфигурирован: нужна документация/данные приложения от Александра'
    );
  }
}

module.exports = new MaxProvider();
