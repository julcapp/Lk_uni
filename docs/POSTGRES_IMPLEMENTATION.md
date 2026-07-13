# PostgreSQL Foundation v1.0

## Принятое решение

Для миграций выбран `Knex`, для подключения — официальный драйвер `pg`.

Причины:

- backend уже использует Node.js, CommonJS и SQL;
- миграции остаются прозрачными и проверяемыми;
- не требуется генерация ORM-клиента;
- в Auth Core можно вводить репозитории постепенно.

## Граница этапа

Ветка `feature/postgresql-foundation` создаёт целевую схему PostgreSQL и инфраструктуру миграций. Старые MySQL-маршруты остаются legacy до ветки `feature/auth-core-v1`, где запросы будут перенесены в новые repositories и зависимость `mysql2` будет удалена.

## Локальный запуск

```bash
docker compose -f docker-compose.postgres.yml up -d
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run db:check
```

Быстрый автоматический тест миграции без внешнего PostgreSQL:

```bash
cd backend
npm run db:test
```

Он проверяет создание 12 таблиц, идемпотентный seed DevHub и полный rollback. Перед объединением ветки дополнительно выполняется миграция на реальном PostgreSQL 16.

## Создаваемые таблицы

- `projects`;
- `project_auth_settings`;
- `users`;
- `auth_identities`;
- `verification_challenges`;
- `sessions`;
- `refresh_tokens`;
- `oauth_states`;
- `provider_events`;
- `recovery_requests`;
- `recovery_attempts`;
- `audit_log`.

## Следующий этап

После проверки миграции создаётся `feature/auth-core-v1`:

1. repositories поверх PostgreSQL;
2. project-aware регистрация;
3. login, `/me`, refresh rotation и logout;
4. перенос verification providers;
5. удаление `mysql2` и legacy schema.
