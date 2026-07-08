const { isAllowedEmail } = require('../services/email.service');

function validatePhoneBody(req, res, next) {
  const { phone } = req.body;
  const digits = String(phone || '').replace(/\D/g, '');
  const normalized = digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits;
  if (!phone || !/^[\d+()\- ]+$/.test(phone) || normalized.length !== 10) {
    return res.status(400).json({ error: 'Укажите номер телефона в формате +7 и 10 цифр, без букв и лишних символов' });
  }
  next();
}

function validateEmailBody(req, res, next) {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Укажите корректный email' });
  }
  if (!isAllowedEmail(email)) {
    return res.status(400).json({ error: 'Регистрация возможна только с почтой в российской зоне (.ru, .su, .рф)' });
  }
  next();
}

module.exports = { validatePhoneBody, validateEmailBody };
