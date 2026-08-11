const path = require('node:path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { createAuthRouter } = require('./modules/auth/auth.routes');
const { createProjectRouter } = require('./modules/projects/project.routes');
const { createProfileRouter } = require('./modules/profile/profile.routes');
const { createOrganizationRouter } = require('./modules/organization/organization.routes');

function createApp({ db }) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '64kb' }));

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get('/health', async (req, res) => {
    try {
      await db.raw('select 1');
      res.json({ ok: true, database: 'postgresql' });
    } catch (error) {
      res.status(503).json({ ok: false, database: 'unavailable' });
    }
  });

  app.use('/api/v1/projects', createProjectRouter({ db }));
  app.use('/api/v1/auth', authLimiter, createAuthRouter({ db }));
  app.use('/api/v1/profile', createProfileRouter({ db }));
  app.use('/api/v1/organization', createOrganizationRouter({ db }));

  const wizardDirectory = path.resolve(__dirname, '../../prototype/project-wizard');
  const loginDirectory = path.resolve(__dirname, '../../prototype/login');
  const workspaceDirectory = path.resolve(__dirname, '../../prototype/workspace');
  const profileDirectory = path.resolve(__dirname, '../../prototype/profile');
  const organizationDirectory = path.resolve(__dirname, '../../prototype/organization');
  const forgotPasswordDirectory = path.resolve(__dirname, '../../prototype/forgot-password');
  const resetPasswordDirectory = path.resolve(__dirname, '../../prototype/reset-password');
  app.use('/create-project', express.static(wizardDirectory));
  app.use('/login', express.static(loginDirectory));
  app.use('/workspace', express.static(workspaceDirectory));
  app.use('/profile', express.static(profileDirectory));
  app.use('/organization', express.static(organizationDirectory));
  app.use('/forgot-password', express.static(forgotPasswordDirectory));
  app.use('/reset-password', express.static(resetPasswordDirectory));
  app.get('/', (req, res) => res.redirect('/login/'));

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = Number(error.status || 500);
    const body = {
      ok: false,
      error: status >= 500 ? 'Внутренняя ошибка сервиса' : error.message,
      code: error.code || 'INTERNAL_ERROR',
    };
    if (status >= 500) console.error(error);
    return res.status(status).json(body);
  });

  return app;
}

module.exports = { createApp };
