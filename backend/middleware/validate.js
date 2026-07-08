const { isAllowedEmail, ALLOWED_DOMAIN } = require('../services/email.service');

function validatePhoneBody(req, res, next) {
  const { phone } = req.body;
  if (!phone || !/^[\d+\s()-]{10,20}$/.test(phone)) {
    return res.status(400).json({ error: 'Укажите корректный номер телефона' });
  }
  next();
}

function validateEmailBody(req, res, next) {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Укажите корректный email' });
  }
  if (!isAllowedEmail(email)) {
    return res.status(400).json({ error: `Регистрация возможна только с почтой в домене @${ALLOWED_DOMAIN}` });
  }
  next();
}

module.exports = { validatePhoneBody, validateEmailBody };
