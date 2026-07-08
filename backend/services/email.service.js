const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('../config/db');

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || 'yuodomen.ru').toLowerCase();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

function isAllowedEmail(email) {
  const domain = String(email).split('@')[1]?.toLowerCase();
  return domain === ALLOWED_DOMAIN;
}

function generateCode() {
  return String(crypto.randomInt(100000, 999999)); // 6 цифр
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function sendVerificationCode(email, meta = {}) {
  if (!isAllowedEmail(email)) {
    throw new Error(`Регистрация возможна только с почтой в домене @${ALLOWED_DOMAIN}`);
  }

  const code = generateCode();
  const ttlSeconds = Number(process.env.EMAIL_CODE_TTL_SECONDS || 600);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await pool.query(
    `INSERT INTO email_verification_attempts (email, code_hash, status, ip_address, expires_at)
     VALUES (:email, :codeHash, 'requested', :ip, :expiresAt)`,
    { email, codeHash: hashCode(code), ip: meta.ip || null, expiresAt }
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Код подтверждения регистрации',
    text: `Ваш код подтверждения: ${code}\nКод действителен ${Math.round(ttlSeconds / 60)} минут.`,
    html: `<p>Ваш код подтверждения: <b>${code}</b></p><p>Код действителен ${Math.round(ttlSeconds / 60)} минут.</p>`,
  });

  return { email, expiresAt, ttlSeconds };
}

async function verifyCode(email, enteredCode) {
  const [rows] = await pool.query(
    `SELECT * FROM email_verification_attempts
     WHERE email = :email AND status = 'requested'
     ORDER BY id DESC LIMIT 1`,
    { email }
  );

  const attempt = rows[0];
  if (!attempt) {
    throw new Error('Активный запрос на подтверждение почты не найден. Запросите код заново.');
  }

  if (new Date(attempt.expires_at).getTime() < Date.now()) {
    await pool.query(`UPDATE email_verification_attempts SET status = 'expired' WHERE id = :id`, { id: attempt.id });
    throw new Error('Срок действия кода истёк. Запросите новый.');
  }

  await pool.query(
    `UPDATE email_verification_attempts SET attempts_count = attempts_count + 1 WHERE id = :id`,
    { id: attempt.id }
  );

  if (hashCode(String(enteredCode)) !== attempt.code_hash) {
    throw new Error('Неверный код подтверждения');
  }

  await pool.query(
    `UPDATE email_verification_attempts SET status = 'verified', verified_at = NOW() WHERE id = :id`,
    { id: attempt.id }
  );

  return { email, verified: true };
}

module.exports = { isAllowedEmail, sendVerificationCode, verifyCode, ALLOWED_DOMAIN };
