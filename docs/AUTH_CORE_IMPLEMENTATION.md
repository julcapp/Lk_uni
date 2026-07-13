# Auth Core v1 — реализация

## Статус

Первая рабочая вертикаль реализована в ветке `feature/auth-core-v1` поверх PostgreSQL.
Старые MySQL controller/routes/services и runtime-зависимость `mysql2` удалены; точка входа backend использует только PostgreSQL.

## Маршруты

Базовый префикс: `/api/v1`.

### Публичные

- `GET /projects/public/:slug`
- `POST /auth/register`
- `POST /auth/verify/start`
- `POST /auth/verify/confirm`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### Требуют access token

- `GET /auth/me`
- `GET /auth/sessions`
- `POST /auth/sessions/:sessionId/revoke`

## Безопасность

- access и refresh JWT имеют разные секреты и типы;
- в базе хранятся только SHA-256-хеши refresh-токенов;
- refresh-токен одноразовый, повторное использование отзывает всю сессию;
- коды challenge хранятся как HMAC, имеют TTL и лимит попыток;
- неверные попытки подтверждения фиксируются;
- пользователь видит и отзывает только свои сессии;
- события регистрации, подтверждения и отзыва сессий записываются в audit log;
- ответ login не раскрывает, существует ли аккаунт.

## Demo mode и provider-адаптеры

При `AUTH_DEMO_MODE=true` API возвращает `demoCode`, чтобы тесты и локальная демонстрация не зависели от внешних сервисов. По умолчанию demo mode выключен; до подключения provider-адаптера API отвечает `VERIFICATION_PROVIDER_NOT_CONFIGURED` и не имитирует отправку кода.

Доставка email, phone, MAX и других каналов — следующий отдельный слой `Verification Providers`.
