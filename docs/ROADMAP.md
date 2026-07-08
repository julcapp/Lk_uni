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
- [x] Зафиксировать API contract.
- [ ] Подготовить ADR по отказу от MySQL.
- [ ] Подготовить integration guide.

### Этап 2. PostgreSQL

- [ ] Добавить PostgreSQL schema.
- [ ] Выбрать миграционный инструмент: Prisma или Knex.
- [ ] Перенести users.
- [ ] Перенести verification attempts.
- [ ] Добавить projects.
- [ ] Добавить project_auth_settings.
- [ ] Добавить auth_identities.
- [ ] Добавить sessions.
- [ ] Добавить refresh_tokens.
- [ ] Добавить oauth_states.
- [ ] Добавить provider_events.
- [ ] Добавить audit_log.

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
- [ ] Добавить provider_events.
- [ ] Добавить защиту webhook secret.

### Этап 6. UI/UX

- [ ] Экран входа.
- [ ] Экран регистрации.
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

### Этап 7. SDK и быстрое встраивание

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
