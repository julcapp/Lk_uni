/**
 * Единая точка регистрации всех провайдеров верификации/входа.
 * Чтобы добавить нового провайдера в будущем:
 *   1. Создать файл my_provider.provider.js, реализующий provider.interface.js
 *   2. Импортировать его и добавить в объект PROVIDERS ниже.
 * Контроллер и роуты трогать не придётся.
 */
const vk = require('./vk.provider');
const max = require('./max.provider');
const telegram = require('./telegram.provider');
const sberid = require('./sberid.provider');

const PROVIDERS = {
  vk,
  max,
  telegram,
  sberid,
};

function getProvider(id) {
  const provider = PROVIDERS[id];
  if (!provider) {
    throw new Error(`Неизвестный провайдер верификации: "${id}"`);
  }
  return provider;
}

function listProviders() {
  return Object.keys(PROVIDERS);
}

module.exports = { getProvider, listProviders, PROVIDERS };
