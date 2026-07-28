# Backend Lk_uni

Каталог содержит текущую реализацию Auth Core на Node.js, Express и PostgreSQL.

## Статус

Backend является рабочей основой проекта, но до первого alpha-релиза его публичные контракты и внутренняя структура могут изменяться. Существующую реализацию необходимо развивать эволюционно: сначала подтверждать поведение тестами, затем выделять Kernel и предметные модули без параллельного переписывания системы.

## Требования

- Node.js 20 или новее;
- npm;
- PostgreSQL 16;
- локальный файл `backend/.env`, созданный на основе `backend/.env.example`.

## Безопасная конфигурация

Не добавляйте реальные пароли, токены и секреты в Git.

Минимальный набор переменных:

```env
PORT=3000
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=lk_uni
DATABASE_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10
JWT_ACCESS_SECRET=replace-with-at-least-32-characters
JWT_REFRESH_SECRET=replace-with-at-least-32-characters
CHALLENGE_SECRET=replace-with-at-least-32-characters
AUTH_DEMO_MODE=true
```

`AUTH_DEMO_MODE=true` допускается только для локальной разработки и автоматических проверок. В production должны использоваться реальные адаптеры провайдеров подтверждения.

## Чистый запуск

Из корня репозитория:

```bash
cd backend
npm ci
npm run db:test
npm run auth:test
npm run db:migrate
npm run db:seed
npm run db:check
npm start
```

В другом терминале:

```bash
curl http://localhost:3000/health
```

Ожидаемый результат: HTTP 200 и `ok: true` при доступной PostgreSQL.

## Команды

| Команда | Назначение |
|---|---|
| `npm start` | Запуск backend |
| `npm run dev` | Запуск через nodemon |
| `npm run db:migrate` | Применение миграций PostgreSQL |
| `npm run db:rollback` | Откат последнего пакета миграций |
| `npm run db:seed` | Загрузка данных разработки |
| `npm run db:check` | Проверка соединения с PostgreSQL |
| `npm run db:test` | Контрактные тесты миграций |
| `npm run auth:test` | Интеграционные тесты Auth Core |

## Критерии подтверждённого baseline

Backend считается воспроизводимым только после подтверждения всех пунктов:

- зависимости устанавливаются из чистого клона;
- миграции применяются к чистой PostgreSQL 16;
- seed выполняется без ошибки;
- тесты базы данных и Auth Core проходят;
- сервер запускается без необработанных ошибок;
- `/health` подтверждает доступность PostgreSQL;
- реальные секреты отсутствуют в репозитории.

Связанные задачи: #5, #7, #8 и #13.
