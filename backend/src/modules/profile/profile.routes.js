const express = require('express');
const { authenticate } = require('../auth/auth.middleware');
const service = require('./profile.service');

function requireFields(body, fields) {
  const missing = fields.filter((field) => body?.[field] == null || body[field] === '');
  if (missing.length) {
    const error = new Error(`Не заполнены поля: ${missing.join(', ')}`);
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
}

function createProfileRouter({ db }) {
  const router = express.Router();
  router.use(authenticate);

  router.get('/', async (req, res, next) => {
    try { res.json(await service.getProfile(db, req.auth)); } catch (error) { next(error); }
  });

  router.patch('/', async (req, res, next) => {
    try { res.json(await service.updateProfile(db, req.auth, req.body || {})); } catch (error) { next(error); }
  });

  router.get('/settings', async (req, res, next) => {
    try { res.json((await service.getProfile(db, req.auth)).settings); } catch (error) { next(error); }
  });

  router.patch('/settings', async (req, res, next) => {
    try { res.json(await service.updateSettings(db, req.auth, req.body || {})); } catch (error) { next(error); }
  });

  router.post('/change-password', async (req, res, next) => {
    try {
      requireFields(req.body, ['currentPassword', 'newPassword']);
      res.json(await service.changePassword(db, req.auth, req.body));
    } catch (error) { next(error); }
  });

  router.get('/sessions', async (req, res, next) => {
    try { res.json(await service.listSessions(db, req.auth)); } catch (error) { next(error); }
  });

  router.delete('/sessions/:sessionId', async (req, res, next) => {
    try { res.json(await service.revokeSession(db, req.auth, req.params.sessionId)); } catch (error) { next(error); }
  });

  return router;
}

module.exports = { createProfileRouter };
