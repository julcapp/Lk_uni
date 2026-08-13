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

function validationError(code, message) {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

function validateDisplayName(value, language = 'ru') {
  const name = String(value || '').trim();
  if (!name) throw validationError('DISPLAY_NAME_REQUIRED', language === 'en' ? 'Enter your display name.' : 'Введите отображаемое имя.');
  if (name.length < 2 || name.length > 120) throw validationError('DISPLAY_NAME_LENGTH', language === 'en' ? 'The name must contain 2 to 120 characters.' : 'Имя должно содержать от 2 до 120 символов.');
  if (!/^[\p{L}\p{M} .’'\-]+$/u.test(name)) throw validationError('DISPLAY_NAME_CHARACTERS', language === 'en' ? 'Use letters, spaces, hyphens or apostrophes in the name.' : 'В имени используйте буквы, пробелы, дефисы или апострофы.');

  const hasCyrillic = /\p{Script=Cyrillic}/u.test(name);
  const hasLatin = /\p{Script=Latin}/u.test(name);
  if (hasCyrillic && hasLatin) {
    throw validationError('DISPLAY_NAME_MIXED_ALPHABETS', language === 'en'
      ? 'Do not mix Cyrillic and Latin letters in one name.'
      : 'Не смешивайте кириллицу и латиницу в одном имени.');
  }
  if (language === 'ru' && hasLatin) {
    throw validationError('DISPLAY_NAME_LANGUAGE_MISMATCH', 'При русском интерфейсе используйте кириллицу для имени. Переключите интерфейс на EN, если имя нужно указать латиницей.');
  }
  if (language === 'en' && hasCyrillic) {
    throw validationError('DISPLAY_NAME_LANGUAGE_MISMATCH', 'With the English interface, use Latin letters for the name. Switch the interface to RU to enter the name in Cyrillic.');
  }
  return name;
}

async function profileLanguage(db, auth) {
  const settings = await db('user_settings')
    .where({ user_id: auth.sub, project_id: auth.projectId })
    .first();
  return settings?.language === 'en' ? 'en' : 'ru';
}

function createProfileRouter({ db }) {
  const router = express.Router();
  router.use(authenticate);

  router.get('/', async (req, res, next) => {
    try { res.json(await service.getProfile(db, req.auth)); } catch (error) { next(error); }
  });

  router.patch('/', async (req, res, next) => {
    try {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, 'displayName')) {
        const language = await profileLanguage(db, req.auth);
        req.body.displayName = validateDisplayName(req.body.displayName, language);
      }
      res.json(await service.updateProfile(db, req.auth, req.body || {}));
    } catch (error) { next(error); }
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
