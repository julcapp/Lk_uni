function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function assertActiveSession(db, auth) {
  const session = await db('sessions').where({
    id: auth.sid,
    user_id: auth.sub,
    project_id: auth.projectId,
    status: 'active',
  }).whereNull('revoked_at').first();
  if (!session) throw httpError(401, 'SESSION_REVOKED', 'Сессия завершена');
  return session;
}

async function getMembership(db, auth) {
  const membership = await db('project_members').where({
    project_id: auth.projectId,
    user_id: auth.sub,
    status: 'active',
  }).first();
  if (!membership) throw httpError(403, 'PROJECT_ACCESS_DENIED', 'Нет доступа к рабочему пространству');
  return membership;
}

async function getOrganizationRow(db, auth) {
  const row = await db('projects as p')
    .join('organizations as o', 'o.id', 'p.organization_id')
    .where({ 'p.id': auth.projectId, 'p.status': 'active' })
    .first([
      'o.id','o.name','o.description','o.website','o.email','o.phone','o.address','o.logo_url',
      'o.language','o.timezone','o.status','o.created_at','o.updated_at'
    ]);
  if (!row) throw httpError(404, 'ORGANIZATION_NOT_FOUND', 'Организация не найдена');
  return row;
}

function mapOrganization(row, role) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    website: row.website || '',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    logoUrl: row.logo_url || null,
    language: row.language || 'ru',
    timezone: row.timezone || 'Europe/Moscow',
    status: row.status,
    role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getOrganization(db, auth) {
  await assertActiveSession(db, auth);
  const membership = await getMembership(db, auth);
  return { organization: mapOrganization(await getOrganizationRow(db, auth), membership.role) };
}

async function updateOrganization(db, auth, input) {
  await assertActiveSession(db, auth);
  const membership = await getMembership(db, auth);
  if (!['OWNER', 'ADMIN'].includes(membership.role)) {
    throw httpError(403, 'ORGANIZATION_WRITE_FORBIDDEN', 'Недостаточно прав для изменения организации');
  }

  const allowed = ['name','description','website','email','phone','address','language','timezone'];
  const changed = Object.keys(input || {}).filter((key) => allowed.includes(key));
  if (!changed.length) throw httpError(400, 'ORGANIZATION_UPDATE_EMPTY', 'Нет данных для обновления');
  if (input.language != null && !['ru','en'].includes(input.language)) {
    throw httpError(400, 'LANGUAGE_INVALID', 'Поддерживаются языки ru и en');
  }

  return db.transaction(async (trx) => {
    const current = await getOrganizationRow(trx, auth);
    const patch = { updated_at: trx.fn.now() };
    for (const key of changed) {
      const column = ({ logoUrl: 'logo_url' })[key] || key;
      patch[column] = typeof input[key] === 'string' ? input[key].trim() : input[key];
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'name') && !patch.name) {
      throw httpError(400, 'ORGANIZATION_NAME_REQUIRED', 'Название организации обязательно');
    }
    await trx('organizations').where({ id: current.id }).update(patch);
    await trx('audit_log').insert({
      project_id: auth.projectId,
      user_id: auth.sub,
      actor_type: 'user',
      actor_id: auth.sub,
      action: 'organization.updated',
      entity_type: 'organization',
      entity_id: current.id,
      metadata: JSON.stringify({ changed, role: membership.role }),
    });
    return { organization: mapOrganization(await getOrganizationRow(trx, auth), membership.role) };
  });
}

module.exports = { getOrganization, updateOrganization };
