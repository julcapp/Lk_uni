# Lk_uni — универсальный личный кабинет и модуль авторизации

Lk_uni — самостоятельный модуль личного кабинета, регистрации, входа, восстановления доступа и управления пользовательской идентичностью для быстрого встраивания в разные проекты.

Целевая архитектура v1.0: **Node.js / Express / PostgreSQL / React**.

Текущая реализация v0.1 использует MySQL и форму регистрации, но MySQL считается legacy-направлением. Дальнейшая разработка ведётся в сторону PostgreSQL и универсальной Identity Platform.

## Цель проекта

Создать типовой кабинет, который можно быстро подключать к разным сервисам:

- CRM;
- SaaS-сервисам;
- корпоративным порталам;
- Telegram/MAX/VK-ботам;
- клиентским кабинетам;
- программам лояльности;
- внутренним административным панелям.

## Главный принцип

Пользователь — единая сущность.

Email, телефон, MAX, Telegram, VK ID, SberID и другие каналы — это связанные способы идентификации одного пользователя, а не отдельные аккаунты.

```text
User
  └── Identities
        ├── email
        ├── phone
        ├── max
        ├── telegram
        ├── vk
        └── sberid
```

## Каналы регистрации, входа, подтверждения и восстановления

Lk_uni должен поддерживать:

- email;
- телефон;
- MAX;
- Telegram;
- VK ID;
- SberID.

MAX реализуется как один из каналов подтверждения, входа, восстановления и привязки аккаунта. Он не является обязательным глобально. Обязательность MAX определяется настройками конкретного проекта.

Пример:

```json
{
  "required_verification": {
    "mode": "one_of",
    "channels": ["email", "phone", "max"]
  }
}
```

## Восстановление доступа

В v1.0 добавляется обязательный модуль Account Recovery.

Пользователь может нажать «Не удаётся войти?» и восстановить доступ через любую подтверждённую identity:

- email;
- телефон;
- MAX;
- Telegram;
- VK ID;
- SberID.

Отдельный логин не является обязательной сущностью. Если пользователь забыл логин, система ищет аккаунт через связанные подтверждённые identities.

## Документация v1.0

Основные документы:

- [Техническое задание v1.0](docs/TZ_v1.0.md)
- [Архитектура v1.0](docs/ARCHITECTURE_v1.0.md)
- [PostgreSQL-модель данных](docs/POSTGRES_DB_MODEL.md)
- [MAX Auth Flow](docs/MAX_AUTH_FLOW.md)
- [Account Recovery](docs/ACCOUNT_RECOVERY.md)
- [API Contract v1.0](docs/API_CONTRACT_v1.0.md)
- [Integration Guide](docs/INTEGRATION_GUIDE.md)
- [Roadmap](docs/ROADMAP.md)

## Текущая база v0.1

В репозитории уже есть:

- Node.js / Express backend;
- React RegisterForm;
- MySQL schema;
- подтверждение телефона через SMSC call;
- подтверждение email кодом;
- JWT access/refresh;
- OAuth registry;
- VK provider;
- Telegram provider;
- MAX provider как заготовка;
- SberID provider как заготовка.

## Целевые модули

```text
backend/
  src/
    modules/
      auth/
      users/
      projects/
      verification/
      recovery/
      identities/
      providers/
      sessions/
      audit/
      admin/
```

## Следующий этап разработки

1. Перевести БД с MySQL на PostgreSQL.
2. Добавить `projects` и `project_auth_settings`.
3. Добавить `auth_identities`.
4. Добавить `verification_challenges`.
5. Добавить `recovery_requests` и `recovery_attempts`.
6. Реализовать project-aware регистрацию.
7. Реализовать вход через `/api/auth/login`.
8. Реализовать восстановление доступа через `/api/auth/recovery/*`.
9. Реализовать `/api/auth/me`.
10. Реализовать MAX deeplink + webhook flow.
11. Подготовить интерфейс входа, регистрации, выбора канала подтверждения и восстановления доступа.
