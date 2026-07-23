# Lk_uni — полный рабочий план разработки

Версия: 1.0  
Дата: 23.07.2026  
Основание: технический аудит текущей ветки `main` и принятые продуктовые решения.

## 1. Принцип планирования

План построен не по вымышленным будущим модулям, а по зависимостям реального продукта.

Сроки указаны в **рабочих днях активной разработки**, а не как обещанные календарные даты. Они уточняются после выполнения Iteration 001 и измерения фактической скорости команды.

Каждый этап начинается только после прохождения exit criteria предыдущего этапа.

## 2. Целевая ближайшая версия

Ближайший релиз: **Lk_uni v0.1 — Verified Auth Baseline**.

Версия v0.1 должна доказать один законченный сценарий:

1. проект DevHub существует в PostgreSQL;
2. пользователь регистрируется через разрешённую identity;
3. проходит demo verification;
4. получает access/refresh tokens;
5. открывает свой профиль;
6. обновляет токены;
7. видит и отзывает свои сессии;
8. frontend выполняет этот сценарий через реальный API;
9. процесс запускается по документированной инструкции.

В v0.1 не входят боевые внешние провайдеры, OAuth/OIDC server, billing, marketplace и enterprise-функции.

---

# Этап A — Baseline and Truth

## Iteration 001 — Reproducible Product Baseline

Оценка после начала локальной проверки: 3–5 рабочих дней.

### Задачи

- проверить clean clone;
- зафиксировать поддерживаемые версии Node.js, npm и PostgreSQL;
- проверить `.env.example`;
- поднять чистую PostgreSQL;
- применить migrations и seeds;
- запустить `db:test`;
- запустить `auth:test` на in-memory и реальной PostgreSQL;
- запустить backend;
- проверить `GET /health`;
- собрать frontend;
- проверить ChatGPT App syntax check;
- исправить README;
- зарегистрировать каждый обнаруженный дефект отдельным Issue;
- устранить ложные утверждения в `PROJECT_STATUS.md`.

### Exit criteria

- все команды воспроизводятся на чистой машине;
- тесты либо проходят, либо имеют открытые blocking Issues;
- README соответствует факту;
- PR #6 содержит утверждённый audit и delivery plan;
- отсутствуют скрытые критические ошибки запуска.

---

# Этап B — Stabilize Existing Auth Core

## Iteration 002 — Auth Core Correctness

Оценка: 5–8 рабочих дней.

### Задачи

- проверить database constraints и индексы;
- проверить project isolation во всех запросах;
- добавить negative tests;
- проверить race conditions регистрации и verification;
- проверить refresh token reuse и concurrent refresh;
- унифицировать error contract;
- добавить startup validation обязательных secrets;
- удалить остатки legacy MySQL runtime;
- закрепить версии backend dependencies;
- добавить lint/format baseline.

### Exit criteria

- Auth Core integration suite покрывает happy path и основные abuse cases;
- project isolation подтверждена тестами;
- backend не стартует с небезопасной конфигурацией;
- нет runtime-зависимости от MySQL.

## Iteration 003 — Session Policy

Оценка: 4–6 рабочих дней.

### Подтверждённые требования

- idle timeout: 30 минут;
- absolute timeout: 8 часов;
- максимум пять устройств;
- уведомления о новом входе, новом устройстве и смене пароля — только после появления Communication/Notification adapter.

### Задачи

- добавить `last_seen_at` enforcement;
- добавить absolute expiration;
- реализовать лимит пяти активных устройств;
- определить поведение при шестом устройстве;
- реализовать revoke all other sessions;
- добавить session policy tests;
- обновить API contract.

### Exit criteria

- политики сессий исполняются сервером;
- все сценарии покрыты integration tests.

---

# Этап C — Real User App Vertical

## Iteration 004 — Frontend API Foundation

Оценка: 5–7 рабочих дней.

### Задачи

- зафиксировать версии React/Vite;
- добавить API client;
- добавить environment configuration;
- определить token storage strategy;
- реализовать общий error mapper;
- добавить маршрутизацию;
- добавить auth state;
- удалить или изолировать неиспользуемые preview screens.

### Exit criteria

- frontend запускается и обращается к `/health` и Auth Core;
- production build воспроизводим;
- preview не маскируется под готовый User App.

## Iteration 005 — Registration and Verification UI

Оценка: 5–8 рабочих дней.

### Подтверждённые UX-правила

- email только латиницей, пример `example@mail.ru`;
- имя — кириллица, цифры разрешены, латиница запрещена;
- согласие с условиями использования и обработкой персональных данных;
- verification выполняется через доступный канал проекта;
- MAX не является обязательным глобально.

### Задачи

- форма регистрации;
- client/server validation alignment;
- start/confirm verification;
- состояния timeout, incorrect code, attempts exceeded;
- успешный вход после verification;
- UX tests для основных состояний.

### Exit criteria

- пользователь проходит регистрацию из браузера до кабинета через реальный API.

## Iteration 006 — Login, Profile and Sessions UI

Оценка: 5–7 рабочих дней.

### Задачи

- passwordless login UI;
- token refresh handling;
- `/me`;
- список identities;
- список сессий;
- отзыв сессии;
- logout;
- обработка истёкшей и отозванной сессии.

### Exit criteria

- browser end-to-end сценарий login → profile → sessions → logout работает.

### Release checkpoint

После Iteration 006 выпускается **v0.1 — Verified Auth Baseline**.

---

# Этап D — Recovery and Security Baseline

## Iteration 007 — Account Recovery

Оценка: 6–9 рабочих дней.

### Принятый сценарий

`Не удаётся войти? → подтверждение через связанную identity → восстановление доступа → уведомление`.

Пароли по email не отправляются.

### Задачи

- recovery requests/attempts lifecycle;
- one-time recovery challenge;
- provider-agnostic recovery service;
- anti-enumeration response;
- revoke existing sessions после критического восстановления;
- audit events;
- UI recovery flow;
- tests.

### Решение до начала реализации

Нужно утвердить один из двух вариантов:

1. **passwordless-first** — recovery восстанавливает доступ к identity и сессиям;
2. **password credential** — дополнительно реализуется установка нового пароля.

Пока password provider отсутствует, нельзя обещать сценарий «новый пароль» как реализованный.

## Iteration 008 — Web Security Baseline

Оценка: 5–8 рабочих дней.

### Задачи

- Helmet/security headers;
- CORS allowlist;
- CSRF decision and implementation для выбранной token strategy;
- structured logs и correlation ID;
- PII masking;
- tighter rate limits по операциям;
- brute-force/abuse tests;
- dependency audit;
- secret rotation notes;
- security checklist.

### Exit criteria

- security review не содержит блокирующих High/Critical проблем для закрытого beta environment.

### Release checkpoint

После Iteration 008 выпускается **v0.2 — Secure Recovery Baseline**.

---

# Этап E — Provider Architecture

## Iteration 009 — Verification Provider Contract

Оценка: 4–6 рабочих дней.

### Задачи

- определить интерфейс provider adapter;
- вынести demo provider в отдельный adapter;
- добавить delivery result/status model;
- idempotency;
- retry policy;
- webhook verification contract;
- provider test kit.

## Iteration 010 — Email Provider

Оценка: 4–6 рабочих дней.

- SMTP/provider configuration;
- email template;
- send and delivery errors;
- no secrets in repository;
- integration tests с mock transport;
- staging verification.

## Iteration 011 — Phone Provider

Оценка: 5–8 рабочих дней.

- выбрать конкретного поставщика;
- реализовать adapter;
- нормализация российских номеров;
- cost/abuse controls;
- provider callback/status;
- integration tests.

## Iteration 012 — MAX Provider Research and Adapter

Оценка назначается только после проверки актуальной официальной документации MAX и доступных credentials.

MAX остаётся одним из каналов. Реализация не блокирует email/phone baseline.

## Iteration 013 — Telegram/VK Providers

Оценка назначается после определения конкретных требований проектов и официальных auth flows.

### Release checkpoint

После минимум двух рабочих каналов подтверждения выпускается **v0.3 — Provider-enabled Auth**.

---

# Этап F — Project Administration

## Iteration 014 — Project Settings API

Оценка: 6–9 рабочих дней.

- CRUD проекта в разрешённом контуре;
- enabled providers;
- verification policy;
- session policy;
- allowed origins/redirects;
- audit;
- RBAC foundation.

## Iteration 015 — Project Admin UI

Оценка: 7–10 рабочих дней.

- один разрешённый проект;
- provider settings;
- project users read-only baseline;
- audit events;
- безопасные настройки;
- запрет доступа к Platform Owner configuration.

### Release checkpoint

**v0.4 — Embeddable Project Admin**.

---

# Этап G — Platform Governance

## Iteration 016 — Platform Owner Console Foundation

Оценка: 8–12 рабочих дней.

- отдельный owner access contour;
- проекты/tenants;
- platform policies;
- provider registry;
- global audit;
- строгая изоляция от User App и Project Admin.

## Iteration 017 — Organization/Tenant Model

Оценка: 8–12 рабочих дней.

Начинается только если реальные проекты требуют нескольких организаций и делегированного администрирования.

### Release checkpoint

**v0.5 — Governed Multi-project Platform**.

---

# Этап H — OAuth/OIDC Productization

Этот этап не начинается до стабилизации User App, Project Admin и security baseline.

## Iteration 018 — OAuth 2.1 Authorization Server Foundation

Оценка после отдельного threat model: 10–15 рабочих дней.

- Authorization Code + PKCE;
- registered redirect URIs;
- consent;
- authorization code single use;
- token endpoint;
- scopes;
- client authentication.

## Iteration 019 — OpenID Connect

Оценка: 8–12 рабочих дней.

- ID Token;
- UserInfo;
- discovery;
- JWKS;
- key rotation;
- nonce/state validation tests.

## Iteration 020 — Developer Portal

Оценка: 8–12 рабочих дней.

- application registration;
- OAuth clients;
- secrets lifecycle;
- API documentation;
- API playground;
- usage visibility baseline.

### Release checkpoint

**v0.8 — OAuth/OIDC Preview**.

---

# Этап I — Beta and Production Readiness

## Iteration 021 — OpenAPI and SDK Baseline

Оценка: 5–8 рабочих дней.

## Iteration 022 — Observability and Operations

Оценка: 7–10 рабочих дней.

- logs;
- metrics;
- traces;
- health/readiness;
- alerts;
- backup/restore verification.

## Iteration 023 — Deployment Environments

Оценка: 7–12 рабочих дней.

- Docker production images;
- staging;
- beta;
- secret management;
- migration deployment strategy;
- rollback.

## Iteration 024 — Beta Hardening

Оценка: 10–15 рабочих дней.

- load tests;
- security tests;
- accessibility baseline;
- user and admin documentation;
- release candidate checklist.

### Release checkpoint

**v0.9 Beta**.

---

# Этап J — Commercialization, only after Beta evidence

Billing, subscriptions, invoices, SLA, support, marketplace, partner program and enterprise compliance are not part of the active engineering backlog.

Они открываются только после:

- появления реальных beta customers;
- подтверждённых сценариев оплаты;
- измеренного usage model;
- юридического и финансового проектирования;
- стабильного production identity core.

Это предотвращает разработку коммерческого слоя без готового продукта.

---

## 3. Сводная последовательность

| Порядок | Версия/этап | Результат | Оценка |
|---:|---|---|---:|
| 1 | Iteration 001 | Воспроизводимый baseline | 3–5 дней |
| 2 | Iterations 002–003 | Стабильный Auth Core и session policy | 9–14 дней |
| 3 | Iterations 004–006 | Реальный User App и v0.1 | 15–22 дня |
| 4 | Iterations 007–008 | Recovery и security, v0.2 | 11–17 дней |
| 5 | Iterations 009–013 | Provider architecture и рабочие каналы, v0.3 | после выбора providers |
| 6 | Iterations 014–015 | Project Admin, v0.4 | 13–19 дней |
| 7 | Iterations 016–017 | Platform governance, v0.5 | 16–24 дня при подтверждённой потребности |
| 8 | Iterations 018–020 | OAuth/OIDC и Developer Portal, v0.8 | 26–39 дней |
| 9 | Iterations 021–024 | Beta/production readiness, v0.9 | 29–45 дней |
| 10 | Commercialization | Только после beta evidence | не оценивать заранее |

Оценки не суммируются в обещанную дату релиза: они зависят от числа разработчиков, найденных дефектов, внешних провайдеров и инфраструктуры.

## 4. Что запрещено делать параллельно сейчас

До завершения v0.1 не начинать:

- billing;
- marketplace;
- enterprise compliance;
- полный Communication Hub;
- production OAuth server;
- новые AI assistants;
- расширение ChatGPT App на write operations;
- смену технологического стека;
- отдельные красивые интерфейсы без API integration.

## 5. Управление работой в GitHub

- один активный implementation milestone;
- каждая задача — отдельный Issue;
- blocking defects помечаются отдельно;
- одна feature branch на Issue или связанную малую группу;
- PR содержит тесты и обновление документации;
- merge только после проверки Definition of Done;
- release tag создаётся только для воспроизводимой версии.

## 6. Следующее действие

Текущий активный элемент: **Issue #5 / Iteration 001**.

После merge документационного PR создаётся отдельная implementation branch для локального clean-run аудита и исправлений. До завершения Issue #5 новые продуктовые функции не открываются.
