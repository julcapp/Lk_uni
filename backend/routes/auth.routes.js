const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/auth.controller');
const { validatePhoneBody, validateEmailBody } = require('../middleware/validate');

const router = express.Router();

// Ограничиваем частоту запросов звонка/кода, чтобы не тратить лимиты SMSC зря
const callLimiter = rateLimit({ windowMs: 60 * 1000, max: 3, message: { ok: false, error: 'Слишком частые запросы, подождите минуту' } });
const emailLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

// Шаг 1: телефон (звонок-подтверждение через SMSC.ru)
router.post('/phone/request-call', callLimiter, validatePhoneBody, ctrl.requestPhoneCall);
router.post('/phone/verify-call', ctrl.verifyPhoneCall);

// Шаг 2: email (только @yuodomen.ru)
router.post('/email/request-code', emailLimiter, validateEmailBody, ctrl.requestEmailCode);
router.post('/email/verify-code', ctrl.verifyEmailCode);

// Шаг 3: привязка внешних сервисов (VK / MAX / Telegram / SberID / ...)
router.get('/providers', ctrl.listAvailableProviders);
router.get('/:providerId/redirect', ctrl.redirectToProvider);
router.get('/:providerId/callback', ctrl.handleProviderCallback);

module.exports = router;
