# Roadmap Lk_uni

## v0.1 — текущая база

Статус: частично готово.

- Node.js / Express backend.
- React RegisterForm.
- MySQL schema.
- Подтверждение телефона через SMSC call.
- Подтверждение email кодом.
- JWT access/refresh.
- OAuth registry.
- VK provider.
- Telegram provider.
- MAX provider как заглушка.
- SberID provider как заготовка.

## v1.0 — универсальная Identity Platform

Цель: превратить текущую форму регистрации в самостоятельный модуль ЛК для быстрого встраивания в другие проекты.

### Этап 1. Документация и архитектура

- [x] Зафиксировать ТЗ v1.0.
- [x] Зафиксировать архитектуру.
- [x] Зафиксировать переход с MySQL на PostgreSQL.
- [x] Зафиксировать MAX как один из каналов подтверждения/входа.
- [x] Зафиксировать Account Recovery.
- [x] Зафиксировать API contract.
- [ ] Подготовить ADR по отказу от MySQL.
- [x] Подготовить integration guide.

### Этап 2. PostgreSQL

- [x] Добавить PostgreSQL schema.
- [x] Выбрать миграционный инструмент: Knex + pg.
- [ ] Перенести users.
- [ ] Перенести verification attempts.
- [x] Добавить projects.
- [x] Добавить project_auth_settings.
- [x] Добавить auth_identities.
- [x] Добавить sessions.
- [x] Добавить refresh_tokens.
- [x] Добавить oauth_states.
- [x] Добавить provider_events.
- [x] Добавить recovery_requests.
- [x] Добавить recovery_attempts.
- [x] Добавить audit_log.

### Этап 3. Auth Core

- [ ] Переписать db layer под PostgreSQL.
- [ ] Реализовать project-aware регистрацию.
- [ ] Реализовать login flow.
- [ ] Реализовать `/me`.
- [ ] Реализовать refresh token rotation.
- [ ] Реализовать logout.
- [ ] Реализовать revoke sessions.
- [ ] Добавить rate limits.
- [ ] Добавить audit events.

### Этап 4. Verification Providers

- [ ] Email provider.
- [ ] Phone provider.
- [ ] MAX provider.
- [ ] Telegram provider.
- [ ] VK provider.
- [ ] SberID provider.
- [ ] Единый интерфейс provider.
- [ ] Единый статус challenge.

### Этап 5. MAX

- [ ] Настроить env для MAX.
- [ ] Реализовать deeplink start.
- [ ] Реализовать webhook endpoint.
- [ ] Реализовать обработку bot_started.
- [ ] Реализовать обработку callback button.
- [ ] Реализовать request_contact.
- [ ] Реализовать привязку MAX к аккаунту.
- [ ] Реализовать вход через MAX.
- [ ] Реализовать восстановление через MAX.
- [ ] Добавить provider_events.
- [ ] Добавить защиту webhook secret.

### Этап 6. Account Recovery

- [ ] Реализовать `recovery_requests`.
- [ ] Реализовать `recovery_attempts`.
- [ ] Реализовать `/api/auth/recovery/start`.
- [ ] Реализовать `/api/auth/recovery/:id/options`.
- [ ] Реализовать `/api/auth/recovery/:id/verify/start`.
- [ ] Реализовать `/api/auth/recovery/:id/verify/confirm`.
- [ ] Реализовать восстановление через email.
- [ ] Реализовать восстановление через телефон.
- [ ] Реализовать восстановление через MAX.
- [ ] Реализовать восстановление через Telegram.
- [ ] Добавить маскирование email/телефона.
- [ ] Добавить защиту от перебора логинов.
- [ ] Добавить уведомления о восстановлении доступа.

### Этап 7. UI/UX

- [ ] Экран входа.
- [ ] Экран регистрации.
- [ ] Экран `Не удаётся войти?`.
- [ ] Экран поиска аккаунта.
- [ ] Экран выбора способа восстановления.
- [ ] Экран восстановления через MAX.
- [ ] Экран выбора способа подтверждения.
- [ ] Экран подтверждения через MAX.
- [ ] Экран подтверждения email.
- [ ] Экран подтверждения телефона.
- [ ] Главная страница ЛК.
- [ ] Профиль пользователя.
- [ ] Связанные способы входа.
- [ ] Админ-панель проекта.
- [ ] Настройка каналов авторизации.
- [ ] Светлая и тёмная темы.

### Этап 8. SDK и быстрое встраивание

- [ ] React widget.
- [ ] `useLkAuth`.
- [ ] Redirect flow.
- [ ] API-only flow.
- [ ] Документация подключения.
- [ ] Пример проекта.
- [ ] Docker compose.

## v1.1 — расширение

- [ ] RBAC.
- [ ] Organizations/Teams.
- [ ] Magic links.
- [ ] Passkeys/WebAuthn.
- [ ] Admin audit viewer.
- [ ] Green API adapter для MAX.
- [ ] MAX document signing module.
- [ ] Next.js SDK.
- [ ] OpenAPI спецификация.
