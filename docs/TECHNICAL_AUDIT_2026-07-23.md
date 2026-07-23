# Lk_uni — технический аудит

Дата аудита: 23.07.2026  
Основание: статический анализ ветки `main`, истории коммитов, конфигурации, backend, frontend, ChatGPT App, CI и проектной документации.

## 1. Граница достоверности

Аудит разделяет три состояния:

- **подтверждено кодом** — функция присутствует в текущей ветке `main`;
- **заявлено CI или документацией** — есть конфигурация или запись, но в рамках удалённого аудита запуск не воспроизводился;
- **запланировано** — код отсутствует либо представлен только интерфейсом/заготовкой.

Локальный запуск на чистой машине, применение миграций, реальные HTTP-запросы и прогон тестов остаются обязательной частью Iteration 001.

## 2. Подтверждённая техническая база

### Backend

Фактический стек:

- Node.js;
- Express;
- PostgreSQL;
- Knex;
- JWT access/refresh tokens;
- CommonJS.

Backend запускается через `backend/server.js`. Приложение собирается фабрикой `createApp({ db })`.

Подтверждённые маршруты:

- `GET /health`;
- `POST /api/v1/auth/register`;
- `POST /api/v1/auth/verify/start`;
- `POST /api/v1/auth/verify/confirm`;
- `POST /api/v1/auth/login`;
- `GET /api/v1/auth/me`;
- `POST /api/v1/auth/refresh`;
- `POST /api/v1/auth/logout`;
- `GET /api/v1/auth/sessions`;
- `POST /api/v1/auth/sessions/:sessionId/revoke`;
- project routes under `/api/v1/projects`.

Подтверждённые механизмы:

- project-aware поиск проекта и его auth-настроек;
- регистрация пользователя с email и/или телефоном;
- обязательное согласие на обработку персональных данных;
- verification challenge с HMAC-хешированием кода;
- ограничение числа попыток и срок действия challenge;
- создание сессии;
- хранение хеша refresh token;
- rotation refresh token;
- обнаружение повторного использования refresh token с отзывом сессии;
- logout;
- список и отзыв собственных сессий;
- audit log для основных событий;
- rate limit для auth API;
- health check с проверкой PostgreSQL.

### Database

Подтверждено:

- PostgreSQL является текущей runtime-базой;
- Knex использует `DATABASE_URL`;
- миграции находятся в `backend/db/migrations`;
- seeds находятся в `backend/db/seeds`;
- предусмотрены development, test и production environments;
- присутствуют скрипты `db:migrate`, `db:rollback`, `db:seed`, `db:check`, `db:test`.

### Tests and CI

Подтверждено конфигурацией:

- migration contract test на `pg-mem`;
- Auth Core integration test через `supertest`;
- CI-сценарий с PostgreSQL 16;
- применение миграций и seed в CI;
- отдельный запуск Auth Core test против PostgreSQL 16.

Факт прохождения текущего commit через GitHub Checks не подтверждён: combined status для commit не содержит опубликованных статусов. Поэтому отметка «проверено в CI» в `PROJECT_STATUS.md` должна быть подтверждена фактическим run либо смягчена.

### Frontend

Фактический стек:

- React;
- Vite;
- JavaScript/JSX.

Текущий frontend является UI preview/prototype. Корневой `App.jsx` отображает `LkUniPrototype`. В package scripts есть `dev`, `build`, `preview`.

Не подтверждено:

- подключение frontend к текущему Auth Core API;
- рабочие пользовательские сценарии регистрации, входа, восстановления и управления сессиями;
- маршрутизация и production-ready state management;
- frontend tests;
- зафиксированные версии React/Vite, поскольку используются зависимости `latest`.

### ChatGPT App

Присутствует отдельный workspace `chatgpt-app` версии `0.1.0`.

Подтверждено:

- MCP SDK и ext-apps;
- команды `dev`, `start`, `check`;
- архитектурно отделённый read-only контур.

Не подтверждено:

- production deployment;
- end-to-end связь с реальным Lk_uni API;
- security review инструментов;
- automated tests.

## 3. Ключевые расхождения

### 3.1 Документация опережает продукт

В документации описаны Communication Hub, Developer Sandbox, Recovery UX, provider integrations, Demo Inbox, Error Handling Center и другие модули. Большая часть этих элементов не подтверждена рабочим кодом.

Решение: документы должны явно маркировать `implemented`, `prototype`, `planned`.

### 3.2 Два уровня backend-кода

В истории проекта присутствовал legacy MySQL backend. Последний Auth Core commit удалил старые controller/service/config пути и перевёл runtime на PostgreSQL-модули в `backend/src`.

Решение: проверить, что в `main` не осталось неиспользуемых legacy-файлов, импортов, зависимостей и инструкций.

### 3.3 Verification работает только в demo mode

`startVerification` и `login` возвращают `VERIFICATION_PROVIDER_NOT_CONFIGURED`, если `AUTH_DEMO_MODE !== true`.

Следствие: email, phone, MAX, Telegram, VK и SberID нельзя считать подключёнными провайдерами. Сейчас существует только demo challenge flow.

### 3.4 Password authentication отсутствует

Текущий Auth Core реализует passwordless challenge flow. Парольная регистрация, password hashing, password login и password recovery в подтверждённом коде отсутствуют.

Решение: до реализации не использовать формулировки, что парольный сценарий уже работает. Отдельно принять продуктовое решение: passwordless-first либо добавить password credential provider.

### 3.5 Account Recovery не реализован как отдельный lifecycle

В API нет подтверждённых recovery endpoints и моделей recovery requests/attempts в рабочем маршруте.

### 3.6 Multi-tenant модель частичная

Project-aware изоляция реализована через `project_id` и `projectSlug`. Полная tenant/organization модель, роли организации и административное управление tenant не подтверждены.

### 3.7 Security gaps до production

До production необходимо проверить и реализовать:

- CORS policy;
- Helmet/security headers;
- единый request/correlation ID;
- structured logging;
- secret validation при старте;
- access-token deny/revocation strategy или строго короткий TTL;
- session idle и absolute timeout;
- ограничение количества устройств;
- audit access control;
- CSRF strategy для browser deployment;
- redirect/proxy policy;
- dependency pinning и vulnerability scanning;
- PII masking в логах;
- encryption/key rotation policy;
- user enumeration resistance во всех сценариях;
- project/tenant isolation tests.

### 3.8 Frontend пока не является продуктовым клиентом

UI preview нельзя считать User App. Нужна реальная интеграция с API, обработка ошибок, токенов, сессий и состояний verification.

### 3.9 Воспроизводимость не подтверждена

В репозитории нет подтверждённого общего запуска всего продукта одной командой. Корневой package workspace включает frontend и ChatGPT App, но backend управляется отдельно. `docker-compose.yml` в корне не подтверждён.

## 4. Текущий статус по подсистемам

| Подсистема | Статус | Основание |
|---|---|---|
| PostgreSQL foundation | Implemented, needs clean-run verification | Knex config, migrations/scripts, CI config |
| Auth Core passwordless | Implemented baseline | routes and service code |
| Verification providers | Demo only | guarded by `AUTH_DEMO_MODE` |
| Sessions and refresh rotation | Implemented baseline | service code |
| Audit events | Implemented baseline | `audit_log` writes |
| Project-aware isolation | Implemented baseline | `project_id` and project settings |
| User App | Prototype | React preview only |
| Account Recovery | Planned | no confirmed production route |
| External providers | Planned/stubs | no confirmed live adapters |
| Project Admin | Planned | no confirmed working UI/API |
| Platform Owner Console | Planned | no confirmed working UI/API |
| OAuth/OIDC provider | Planned | no confirmed authorization server |
| Developer Portal | Prototype/planned | documentation and UI ideas exceed code |
| Communication Hub | Planned | no confirmed runtime module |
| ChatGPT User App | Read-only prototype | separate MCP workspace |
| Billing/Commercial/Enterprise | Deferred | intentionally excluded from current product baseline |

## 5. Решения, которые считаются принятыми

- Не менять backend на FastAPI: текущая реальная база — Node.js/Express/PostgreSQL.
- PostgreSQL остаётся основной БД.
- Lk_uni строится как встраиваемый identity/auth module.
- User App, Project Admin и Platform Owner Console должны иметь разные контуры доступа.
- ChatGPT App на первом этапе остаётся read-only и не получает концептуальные настройки платформы.
- MAX — один из каналов, а не обязательный глобальный канал.
- Новые крупные модули не разрабатываются до стабилизации существующего Auth Core.
- GitHub workflow: Issue → branch → code/tests/docs → PR → merge.

## 6. Приоритетные риски

1. Документация создаёт впечатление большей готовности, чем есть в коде.
2. Нет подтверждённого clean-clone запуска.
3. Frontend не доказан как клиент Auth Core.
4. Provider integrations отсутствуют вне demo mode.
5. Recovery отсутствует.
6. Нет опубликованного OpenAPI как источника API-контракта.
7. Security controls недостаточны для production.
8. Зависимости frontend на `latest` делают сборки невоспроизводимыми.
9. Нет единой release/versioning политики и подтверждённого release artifact.
10. Нет доказанной end-to-end tenant isolation.

## 7. Итог аудита

Lk_uni не является пустым проектом. В `main` уже есть первая серьёзная вертикаль PostgreSQL Auth Core: project-aware регистрация, demo verification, passwordless login, JWT, refresh rotation, sessions и audit events.

При этом Lk_uni пока нельзя считать готовым продуктом или полноценной Identity Platform. Наиболее точная стадия: **working backend foundation plus UI and integration prototypes**.

Ближайшая цель — не расширение функций, а получение воспроизводимой, протестированной вертикали:

`clean clone → PostgreSQL → migrations → backend → API tests → frontend client → registration/login/session demo`.
