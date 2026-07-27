# Roadmap Lk_uni

Roadmap отражает продуктовые этапы. Конкретные задачи ведутся через GitHub Issues и Pull Requests.

## Этап 1. Foundation

Статус: **в работе**

- PostgreSQL foundation;
- миграции и seed;
- health endpoint;
- CI;
- базовый Auth Core;
- open source документация и шаблоны GitHub.

## Этап 2. Identity Core

- единая модель пользователя;
- identities и их связывание;
- подтверждение email и телефона;
- provider registry;
- изоляция подключённых проектов;
- аудит изменений identity.

## Этап 3. Authentication Core

- регистрация и вход;
- refresh rotation;
- восстановление доступа;
- rate limits и anti-abuse;
- негативные сценарии;
- production provider adapters.

## Этап 4. User Profile

- профиль пользователя;
- контакты;
- настройки;
- согласия;
- экспорт и удаление данных по политикам проекта.

## Этап 5. Personal Cabinet

- готовый пользовательский интерфейс;
- безопасность и устройства;
- активные сессии;
- подключённые identities;
- история значимых действий.

## Этап 6. SDK

- JavaScript/TypeScript SDK;
- React bindings;
- серверные примеры;
- стабильное версионирование контрактов.

## Этап 7. Ready-made Widgets

- hosted login;
- регистрация;
- восстановление доступа;
- profile widget;
- настраиваемая тема.

## Этап 8. Admin Console

- управление проектами;
- auth policies;
- провайдеры;
- пользователи и сессии;
- аудит и диагностика.

## Этап 9. Первый публичный alpha-релиз

- версия `v1.0.0-alpha`;
- Docker quick start;
- OpenAPI;
- SDK preview;
- демонстрационная интеграция;
- release notes;
- security review.

## Правило завершения этапа

Этап завершён только когда готовы:

1. рабочая реализация;
2. автоматические тесты;
3. документация;
4. примеры интеграции;
5. обновлённый CHANGELOG;
6. успешный CI.
