const express = require('express');

function parseJson(value, fallback) {
  if (value == null) return fallback;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function createProjectRouter({ db }) {
  const router = express.Router();

  router.get('/public/:slug', async (req, res, next) => {
    try {
      const project = await db('projects as p')
        .leftJoin('project_auth_settings as s', 's.project_id', 'p.id')
        .where({ 'p.slug': req.params.slug, 'p.status': 'active' })
        .first([
          'p.slug', 'p.name', 'p.branding', 's.enabled_providers', 's.required_verification',
        ]);

      if (!project) return res.status(404).json({ ok: false, code: 'PROJECT_NOT_FOUND' });

      return res.json({
        project: {
          slug: project.slug,
          name: project.name,
          branding: parseJson(project.branding, {}),
        },
        auth: {
          enabledProviders: parseJson(project.enabled_providers, []),
          requiredVerification: parseJson(project.required_verification, { mode: 'one_of', channels: [] }),
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createProjectRouter };
