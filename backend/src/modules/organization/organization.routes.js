const express = require('express');
const { authenticate } = require('../auth/auth.middleware');
const service = require('./organization.service');

function createOrganizationRouter({ db }) {
  const router = express.Router();

  router.use(authenticate);

  router.get('/', async (req, res, next) => {
    try {
      res.json(await service.getOrganization(db, req.auth));
    } catch (error) { next(error); }
  });

  router.patch('/', async (req, res, next) => {
    try {
      res.json(await service.updateOrganization(db, req.auth, req.body || {}));
    } catch (error) { next(error); }
  });

  return router;
}

module.exports = { createOrganizationRouter };
