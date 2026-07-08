/**
 * Верификация номера телефона через входящий звонок (SMSC.ru, метод wait_call).
 *
 * Сценарий (как описано заказчиком):
 *  1. Пользователь вводит номер телефона.
 *  2. Фронтенд спрашивает подтверждение "номер введён верно?" — и только
 *     после "да" бэкенд инициирует звонок (чтобы не тратить лимит звонков зря).
 *  3. Бэкенд вызывает SMSC wait_call.php. В ответе SMSC СРАЗУ возвращает номер,
 *     с которого будет совершён звонок (поле `phone`), а также список всех
 *     номеров, которые теоретически могут позвонить (`all_phones`).
 *  4. Последние 6 цифр номера `phone` — это и есть код подтверждения.
 *     Бэкенд сохраняет его (expected_code) и НЕ показывает пользователю —
 *     пользователь должен сам увидеть номер входящего звонка на телефоне
 *     и ввести его последние 6 цифр в форму.
 *  5. Звонок пользователю совершает сам SMSC, отвечать на звонок не нужно.
 *  6. Пользователь вводит 6 цифр → бэкенд сверяет с expected_code.
 *
 * Документация: https://smsc.ru/api/http/miscellaneous/waitcall/
 */

const fetch = require('node-fetch');
const pool = require('../config/db');

const SMSC_URL = 'https://smsc.ru/sys/wait_call.php';
const CODE_LENGTH = 6;

// Коды ошибок SMSC (см. документацию wait_call)
const SMSC_ERRORS = {
  1: 'Ошибка авторизации (неверные логин/пароль)',
  2: 'Неверный логин/пароль или IP-адрес не входит в список разрешённых',
  3: 'Недостаточно средств на счету SMSC',
  4: 'IP-адрес отправителя запроса заблокирован',
  5: 'Неверный номер телефона',
  6: 'Превышен лимит попыток дозвона на этот номер за сегодня (антифрод SMSC)',
  9: 'Слишком много одновременных запросов, повторите позже',
};

function normalizePhone(rawPhone) {
  // Приводим к формату 7XXXXXXXXXX (11 цифр, без +, 7/8 -> 7)
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return '7' + digits.slice(1);
  }
  if (digits.length === 10) {
    return '7' + digits;
  }
  return digits;
}

function lastDigits(phoneNumber, n = CODE_LENGTH) {
  const digits = String(phoneNumber).replace(/\D/g, '');
  return digits.slice(-n);
}

/**
 * Инициирует звонок-подтверждение и создаёт запись в логе.
 * @param {string} rawPhone - номер телефона в любом формате ввода
 * @param {{ip: string, userAgent: string}} meta
 */
async function requestCall(rawPhone, meta = {}) {
  const phone = normalizePhone(rawPhone);
  if (!/^7\d{10}$/.test(phone)) {
    throw new Error('Некорректный формат номера телефона');
  }

  const params = new URLSearchParams({
    login: process.env.SMSC_LOGIN,
    psw: process.env.SMSC_PASSWORD,
    phone,
    fmt: '3', // JSON-ответ
  });

  const response = await fetch(`${SMSC_URL}?${params.toString()}`);
  const data = await response.json();

  const ttlSeconds = Number(process.env.PHONE_CODE_TTL_SECONDS || 180);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  if (data.error) {
    // Логируем неуспешную попытку
    await pool.query(
      `INSERT INTO phone_verification_attempts
        (phone, caller_number, expected_code, all_phones, status, smsc_error_code, ip_address, user_agent, expires_at)
       VALUES (:phone, '', '', NULL, 'failed', :errorCode, :ip, :ua, :expiresAt)`,
      {
        phone,
        errorCode: data.error_code,
        ip: meta.ip || null,
        ua: meta.userAgent || null,
        expiresAt,
      }
    );

    const message = SMSC_ERRORS[data.error_code] || `Ошибка SMSC: ${data.error}`;
    const err = new Error(message);
    err.smscErrorCode = data.error_code;
    throw err;
  }

  const callerNumber = data.phone; // номер, с которого будет звонок
  const allPhones = data.all_phones || [];
  const expectedCode = lastDigits(callerNumber, CODE_LENGTH);

  const [result] = await pool.query(
    `INSERT INTO phone_verification_attempts
      (phone, caller_number, expected_code, all_phones, status, ip_address, user_agent, expires_at)
     VALUES (:phone, :callerNumber, :expectedCode, :allPhones, 'requested', :ip, :ua, :expiresAt)`,
    {
      phone,
      callerNumber,
      expectedCode,
      allPhones: JSON.stringify(allPhones),
      ip: meta.ip || null,
      ua: meta.userAgent || null,
      expiresAt,
    }
  );

  return {
    attemptId: result.insertId,
    phone,
    // фронтенду показываем ТОЛЬКО список возможных номеров-звонилок
    // (чтобы пользователь понимал, с какого номера ждать звонок),
    // сам код подтверждения на фронт не передаётся
    possibleCallerNumbers: allPhones,
    expiresAt,
    ttlSeconds,
  };
}

/**
 * Проверяет введённый пользователем код (последние 6 цифр номера звонка).
 */
async function verifyCall(rawPhone, enteredCode, meta = {}) {
  const phone = normalizePhone(rawPhone);
  const code = String(enteredCode).replace(/\D/g, '');

  const [rows] = await pool.query(
    `SELECT * FROM phone_verification_attempts
     WHERE phone = :phone AND status = 'requested'
     ORDER BY id DESC LIMIT 1`,
    { phone }
  );

  const attempt = rows[0];
  if (!attempt) {
    throw new Error('Активный запрос на подтверждение не найден. Запросите звонок заново.');
  }

  if (new Date(attempt.expires_at).getTime() < Date.now()) {
    await pool.query(
      `UPDATE phone_verification_attempts SET status = 'expired' WHERE id = :id`,
      { id: attempt.id }
    );
    throw new Error('Время ожидания кода истекло. Запросите звонок заново.');
  }

  await pool.query(
    `UPDATE phone_verification_attempts SET attempts_count = attempts_count + 1 WHERE id = :id`,
    { id: attempt.id }
  );

  if (code !== attempt.expected_code) {
    throw new Error('Неверный код подтверждения');
  }

  await pool.query(
    `UPDATE phone_verification_attempts
       SET status = 'verified', verified_at = NOW()
     WHERE id = :id`,
    { id: attempt.id }
  );

  return { phone, verified: true };
}

module.exports = { requestCall, verifyCall, normalizePhone };
