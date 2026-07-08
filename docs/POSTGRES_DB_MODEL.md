# Модель данных PostgreSQL для Lk_uni v1.0

## 1. Общие принципы

- Основная БД: PostgreSQL.
- UUID используется как основной тип идентификаторов.
- Гибкие настройки хранятся в `jsonb`.
- Все временные токены и refresh tokens хранятся только в хешированном виде.
- Все изменения критичных данных фиксируются в `audit_log`.

## 2. Расширения

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

## 3. Таблицы

### 3.1. projects

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  public_base_url TEXT,
  allowed_redirect_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2. project_auth_settings

```sql
CREATE TABLE project_auth_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  enabled_providers JSONB NOT NULL DEFAULT '["email","phone"]'::jsonb,

  registration_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  login_settings JSONB NOT NULL DEFAULT '{}'::jsonb,

  required_verification JSONB NOT NULL DEFAULT
  '{
    "mode": "one_of",
    "channels": ["email", "phone"]
  }'::jsonb,

  token_settings JSONB NOT NULL DEFAULT
  '{
    "accessTokenTtlMinutes": 15,
    "refreshTokenTtlDays": 30,
    "verificationTtlMinutes": 10
  }'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(project_id)
);
```

### 3.3. users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  display_name VARCHAR(255),
  first_name VARCHAR(120),
  last_name VARCHAR(120),

  status VARCHAR(40) NOT NULL DEFAULT 'pending_verification',
  verified_at TIMESTAMPTZ,

  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  consents JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_project_id ON users(project_id);
CREATE INDEX idx_users_status ON users(status);
```

### 3.4. auth_identities

```sql
CREATE TABLE auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  provider VARCHAR(50) NOT NULL,
  provider_user_id TEXT NOT NULL,

  normalized_value TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(project_id, provider, provider_user_id)
);

CREATE INDEX idx_auth_identities_user_id ON auth_identities(user_id);
CREATE INDEX idx_auth_identities_provider ON auth_identities(provider);
CREATE INDEX idx_auth_identities_normalized_value ON auth_identities(normalized_value);
```

Примеры `provider`:

- `email`;
- `phone`;
- `max`;
- `telegram`;
- `vk`;
- `sberid`.

### 3.5. verification_challenges

```sql
CREATE TABLE verification_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  provider VARCHAR(50) NOT NULL,
  purpose VARCHAR(50) NOT NULL,

  challenge_hash TEXT NOT NULL,
  public_token TEXT UNIQUE,

  target_value TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',

  attempts_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_challenges_user ON verification_challenges(user_id);
CREATE INDEX idx_verification_challenges_public_token ON verification_challenges(public_token);
CREATE INDEX idx_verification_challenges_status ON verification_challenges(status);
```

`purpose`:

- `registration`;
- `login`;
- `link_identity`;
- `password_reset`.

### 3.6. sessions

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  user_agent TEXT,
  ip_address INET,
  device_name TEXT,

  status VARCHAR(40) NOT NULL DEFAULT 'active',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
```

### 3.7. refresh_tokens

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  token_hash TEXT NOT NULL UNIQUE,
  previous_token_hash TEXT,

  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_session_id ON refresh_tokens(session_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

### 3.8. oauth_states

```sql
CREATE TABLE oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  provider VARCHAR(50) NOT NULL,
  state_hash TEXT NOT NULL UNIQUE,
  code_verifier_hash TEXT,

  purpose VARCHAR(50) NOT NULL,
  redirect_uri TEXT,

  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.9. provider_events

```sql
CREATE TABLE provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(120),
  external_event_id TEXT,

  payload JSONB NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'received',

  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_provider_events_provider ON provider_events(provider);
CREATE INDEX idx_provider_events_event_type ON provider_events(event_type);
```

### 3.10. audit_log

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  actor_type VARCHAR(40) NOT NULL DEFAULT 'system',
  actor_id UUID,

  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80),
  entity_id UUID,

  ip_address INET,
  user_agent TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_project_id ON audit_log(project_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
```

## 4. Пример проектных настроек

```json
{
  "enabled_providers": ["email", "phone", "max", "telegram", "vk"],
  "required_verification": {
    "mode": "one_of",
    "channels": ["email", "phone", "max"]
  },
  "token_settings": {
    "accessTokenTtlMinutes": 15,
    "refreshTokenTtlDays": 30,
    "verificationTtlMinutes": 10
  }
}
```

## 5. Миграционная стратегия

Рекомендуется использовать Prisma или Knex.

Предпочтительно:

```text
backend/
  prisma/
    schema.prisma
    migrations/
```

или

```text
backend/
  db/
    migrations/
      001_init_projects.sql
      002_init_users.sql
      003_init_identities.sql
      004_init_sessions.sql
```

## 6. Что переносим из MySQL

Текущую `backend/db/schema.sql` считать legacy-схемой.

Целевая задача:

- создать PostgreSQL-схему;
- заменить `mysql2` на `pg` или ORM;
- вынести конфигурацию подключения в `DATABASE_URL`;
- подготовить миграции.
