exports.seed = async function seed(knex) {
  const [project] = await knex('projects')
    .insert({
      slug: 'devhub',
      name: 'DevHub',
      status: 'active',
      branding: { primaryColor: '#2563eb' },
      allowed_redirect_urls: JSON.stringify([]),
    })
    .onConflict('slug')
    .merge({ name: 'DevHub', status: 'active', updated_at: knex.fn.now() })
    .returning(['id']);

  await knex('project_auth_settings')
    .insert({
      project_id: project.id,
      enabled_providers: JSON.stringify(['email', 'phone', 'max', 'telegram', 'vk']),
      required_verification: { mode: 'one_of', channels: ['email', 'phone', 'max'] },
    })
    .onConflict('project_id')
    .merge({
      enabled_providers: JSON.stringify(['email', 'phone', 'max', 'telegram', 'vk']),
      required_verification: { mode: 'one_of', channels: ['email', 'phone', 'max'] },
      updated_at: knex.fn.now(),
    });
};
