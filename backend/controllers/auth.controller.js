const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const callVerification = require('../services/callVerification.service');
const emailService = require('../services/email.service');
const { getProvider, listProviders } = require('../services/oauth/registry');

function getMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

// ---------- Шаг 1: телефон ----------

// Инициировать звонок-подтверждение (после того как пользователь
// подтвердил на фронте "да, номер верный")
async function requestPhoneCall(req, res) {
  try {
    const result = await callVerification.requestCall(req.body.phone, getMeta(req));
    res.json({
      ok: true,
      phone: result.phone,
      possibleCallerNumbers: result.possibleCallerNumbers,
      ttlSeconds: result.ttlSeconds,
      message: 'Ожидайте короткий звонок. Отвечать не нужно — введите последние 6 цифр номера входящего звонка.',
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

// Проверить код (последние 6 цифр номера звонка)
async function verifyPhoneCall(req, res) {
  const { phone, code } = req.body;
  try {
    await callVerification.verifyCall(phone, code, getMeta(req));

    const normalizedPhone = callVerification.normalizePhone(phone);
    await pool.query(
      `INSERT INTO users (phone, phone_verified, status)
       VALUES (:phone, 1, 'pending')
       ON DUPLICATE KEY UPDATE phone_verified = 1`,
      { phone: normalizedPhone }
    );

    res.json({ ok: true, message: 'Телефон подтверждён' });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

// ---------- Шаг 2: email (@yuodomen.ru) ----------

async function requestEmailCode(req, res) {
  try {
    const result = await emailService.sendVerificationCode(req.body.email, getMeta(req));
    res.json({ ok: true, email: result.email, ttlSeconds: result.ttlSeconds, message: 'Код отправлен на почту' });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

async function verifyEmailCode(req, res) {
  const { phone, email, code } = req.body;
  try {
    await emailService.verifyCode(email, code);

    const normalizedPhone = callVerification.normalizePhone(phone);
    await pool.query(
      `UPDATE users SET email = :email, email_verified = 1, status = 'active'
       WHERE phone = :phone`,
      { email, phone: normalizedPhone }
    );

    const [rows] = await pool.query(`SELECT * FROM users WHERE phone = :phone`, { phone: normalizedPhone });
    const user = rows[0];

    const tokens = issueTokens(user);
    res.json({ ok: true, message: 'Регистрация завершена', user: publicUser(user), ...tokens });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

// ---------- Шаг 3 (опционально): привязка внешних сервисов ----------

function listAvailableProviders(req, res) {
  res.json({ providers: listProviders() });
}

function redirectToProvider(req, res) {
  try {
    const provider = getProvider(req.params.providerId);
    const state = jwt.sign({ purpose: 'oauth-state' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '10m' });
    const authUrl = provider.getAuthUrl(state);
    res.json({ ok: true, authUrl });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

async function handleProviderCallback(req, res) {
  try {
    const provider = getProvider(req.params.providerId);
    const { providerUid, profile } = await provider.handleCallback(req.query);

    // Требуется user_id уже зарегистрированного (по телефону/email) пользователя —
    // передаётся, например, в query ?uid= или через сессию/JWT на фронте.
    const userId = req.query.uid;
    if (!userId) {
      return res.status(400).json({ ok: false, error: 'Не передан идентификатор пользователя для привязки' });
    }

    await pool.query(
      `INSERT INTO user_identities (user_id, provider, provider_uid, raw_profile)
       VALUES (:userId, :provider, :providerUid, :profile)
       ON DUPLICATE KEY UPDATE raw_profile = VALUES(raw_profile)`,
      { userId, provider: provider.id, providerUid, profile: JSON.stringify(profile) }
    );

    res.json({ ok: true, message: `Аккаунт ${provider.id} успешно привязан` });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

// ---------- Вспомогательное ----------

function issueTokens(user) {
  const payload = { uid: user.id, phone: user.phone };
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_TTL || '15m',
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_TTL || '30d',
  });
  return { accessToken, refreshToken };
}

function publicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    status: user.status,
  };
}

module.exports = {
  requestPhoneCall,
  verifyPhoneCall,
  requestEmailCode,
  verifyEmailCode,
  listAvailableProviders,
  redirectToProvider,
  handleProviderCallback,
};
