# Архитектура Lk_uni — обзор

## 1. Назначение

Lk_uni — универсальная Identity Platform для регистрации, входа, подтверждения личности, восстановления доступа, управления сессиями, уведомлениями и интеграциями внешних проектов.

Первый и единственный демонстрационный проект версии Demo v0.1 — DevHub.

## 2. Контуры платформы

```text
Lk_uni Platform
├── Core Preview
├── Demo Runtime
├── Identity Core
├── Security Layer
├── Communication Hub
├── Error Handling Center
├── Developer Sandbox
├── API Platform
└── Production Runtime
```

## 3. Identity Core

```text
Identity Core
├── Users
├── Identities
├── Authentication
├── Verification
├── Recovery
├── Sessions
├── Claims
└── Audit
```

## 4. Базовые принципы

- Identity ID неизменяем.
- Email, телефон, MAX, Telegram и другие каналы являются связанными identities.
- Lk_uni не хранит бизнес-данные внешнего проекта.
- Проектные данные расширяются через claims.
- Пользователь не видит внутренний project slug.
- Demo и Production используют одно ядро.
- Новая функция должна иметь UI, API, документацию и Demo-сценарий.

## 5. Multi-Tenant

Каждый проект рассматривается как tenant и имеет собственные:

- настройки авторизации;
- провайдеры;
- branding;
- session policy;
- security policy;
- API credentials;
- webhooks;
- audit context.

В Demo v0.1 реализуется только DevHub.

## 6. Session Management

Session Management включает:

- access token;
- refresh token;
- idle timeout;
- absolute timeout;
- предупреждение перед завершением;
- список активных сессий;
- отзыв отдельной или всех сессий;
- повторную авторизацию после истечения.

## 7. Communication Hub

Служебные сообщения доставляются через подтверждённые каналы:

- email;
- MAX;
- Telegram;
- телефон/SMS;
- Internal Inbox.

Communication Hub работает через события:

```text
user.registered
identity.verified
user.login.first
user.login.new_device
user.recovery.completed
session.revoked
security.alert
```

## 8. Error Handling Center

Каждая ошибка содержит:

- внутренний код;
- пользовательское сообщение;
- рекомендуемое действие;
- severity;
- trace/event ID;
- запись в audit log.

Пользователь всегда получает понятное действие: повторить, выбрать другой канал, восстановить доступ, подождать или обратиться в поддержку.

## 9. Developer Sandbox

Developer Sandbox включает:

- tenant configuration;
- API credentials;
- providers;
- session policy;
- security policy;
- API Explorer;
- webhook events;
- test users;
- error simulator.

## 10. Demo First

До проверки Demo v0.1 не расширяется Production Core.

```text
Welcome → Экскурсия → DevHub → Регистрация → Verification →
Communication Hub → Кабинет → Login → Recovery → Session → Sandbox
```
