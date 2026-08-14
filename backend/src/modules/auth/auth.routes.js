const express = require('express');
const { authenticate } = require('./auth.middleware');
const service = require('./auth.service');
const { passwordLogin } = require('./password-login.service');
const {
  requestPasswordReset,
  validatePasswordReset,
  confirmPasswordReset,
} = require('./password-reset.service');

function normalizeIp(ip) {
  return String(ip || '').startsWith('::ffff:') ? String(ip).slice(7) : (ip || null);
}

function meta(req) {
  return {
    ip: normalizeIp(req.ip),
    userAgent: req.get('user-agent'),
    deviceName: req.get('x-device-name'),
  };
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => body?.[field] == null || body[field] === '');
  if (missing.length) {
    const error = new Error(`Не заполнены поля: ${missing.join(', ')}`);
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
}

function createAuthRouter({ db }) {
  const router = express.Router();

  router.post('/register', async (req, res, next) => {
    try {
      requireFields(req.body, ['projectSlug', 'displayName']);
      res.status(201).json(await service.register(db, req.body, meta(req)));
    } catch (error) { next(error); }
  });

  router.post('/verify/start', async (req, res, next) => {
    try {
      requireFields(req.body, ['projectSlug', 'userId', 'provider']);
      res.status(201).json(await service.startVerification(db, req.body, meta(req)));
    } catch (error) { next(error); }
  });

  router.post('/verify/confirm', async (req, res, next) => {
    try {
      requireFields(req.body, ['projectSlug', 'challengeId', 'code']);
      res.json(await service.confirmVerification(db, req.body, meta(req)));
    } catch (error) { next(error); }
  });

  router.post('/login', async (req, res, next) => {
    try {
      requireFields(req.body, ['projectSlug', 'provider', 'login']);
      res.status(202).json(await service.login(db, req.body, meta(req)));
    } catch (error) { next(error); }
  });

  router.post('/password-login', async (req, res, next) => {
    try {
      requireFields(req.body, ['email', 'password']);
      res.json(await passwordLogin(db, req.body, meta(req)));
    } catch (error) { next(error); }
  });

  router.post('/password-reset/request', async (req, res, next) => {
    try {
      requireFields(req.body, ['email']);
      res.json(await requestPasswordReset(db, req.body, meta(req)));
    } catch (error) { next(error); }
  });

  router.get('/password-reset/validate', async (req, res, next) => {
    try {
      res.json(await validatePasswordReset(db, req.query.token));
    } catch (error) { next(error); }
  });

  router.post('/password-reset/confirm', async (req, res, next) => {
    try {
      requireFields(req.body, ['token', 'password']);
      res.json(await confirmPasswordReset(db, req.body, meta(req)));
    } catch (error) { next(error); }
  });

  router.get('/me', authenticate, async (req, res, next) => {
    try { res.json(await service.getMe(db, req.auth)); } catch (error) { next(error); }
  });

  router.post('/refresh', async (req, res, next) => {
    try {
      requireFields(req.body, ['refreshToken']);
      res.json(await service.refresh(db, req.body.refreshToken, meta(req)));
    } catch (error) { next(error); }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      requireFields(req.body, ['refreshToken']);
      res.json(await service.logout(db, req.body.refreshToken));
    } catch (error) { next(error); }
  });

  router.get('/sessions', authenticate, async (req, res, next) => {
    try { res.json(await service.listSessions(db, req.auth)); } catch (error) { next(error); }
  });

  router.post('/sessions/:sessionId/revoke', authenticate, async (req, res, next) => {
    try { res.json(await service.revokeSession(db, req.auth, req.params.sessionId)); } catch (error) { next(error); }
  });

  return router;
}

module.exports = { createAuthRouter, normalizeIp };
