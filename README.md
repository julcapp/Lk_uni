# Lk_uni — универсальный личный кабинет и модуль авторизации

Lk_uni — самостоятельный модуль личного кабинета, регистрации, входа и управления пользовательской идентичностью для быстрого встраивания в разные проекты.

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

## Каналы регистрации, входа и подтверждения

Lk_uni должен поддерживать:

- email;
- телефон;
- MAX;
- Telegram;
- VK ID;
- SberID.

MAX реализуется как один из каналов подтверждения, входа и привязки аккаунта. Он не является обязательным глобально. Обязательность MAX определяется настройками конкретного проекта.

Пример:

```json
{
  "required_verification": {
    "mode": "one_of",
    "channels": ["email", "phone", "max"]
  }
}
```

## Документация v1.0

Основные документы:

- [Техническое задание v1.0](docs/TZ_v1.0.md)
- [Архитектура v1.0](docs/ARCHITECTURE_v1.0.md)
- [PostgreSQL-модель данных](docs/POSTGRES_DB_MODEL.md)
- [MAX Auth Flow](docs/MAX_AUTH_FLOW.md)
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
5. Реализовать project-aware регистрацию.
6. Реализовать вход через `/api/auth/login`.
7. Реализовать `/api/auth/me`.
8. Реализовать MAX deeplink + webhook flow.
9. Подготовить интерфейс входа, регистрации и выбора канала подтверждения.
