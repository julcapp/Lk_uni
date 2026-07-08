# API Contract Lk_uni v1.0

## 1. Общие правила

Базовый префикс:

```http
/api
```

Все методы, зависящие от проекта, должны принимать `project_slug` или `project_id`.

Рекомендуемый публичный вариант — `project_slug`.

## 2. Получение публичных настроек проекта

```http
GET /api/projects/public/:slug
```

Ответ:

```json
{
  "project": {
    "slug": "utimoshi",
    "name": "У Тимоши",
    "branding": {
      "logoUrl": "...",
      "primaryColor": "#..."
    }
  },
  "auth": {
    "enabledProviders": ["email", "phone", "max", "telegram", "vk"],
    "requiredVerification": {
      "mode": "one_of",
      "channels": ["email", "phone", "max"]
    }
  }
}
```

## 3. Регистрация

```http
POST /api/auth/register
```

Тело:

```json
{
  "projectSlug": "utimoshi",
  "displayName": "Иван",
  "email": "ivan@example.ru",
  "phone": "+79990000000",
  "consents": {
    "personalData": true,
    "marketing": false
  }
}
```

Ответ:

```json
{
  "userId": "uuid",
  "status": "pending_verification",
  "availableVerificationChannels": ["email", "phone", "max"]
}
```

## 4. Запуск подтверждения

```http
POST /api/auth/verify/start
```

Тело:

```json
{
  "projectSlug": "utimoshi",
  "userId": "uuid",
  "provider": "max",
  "purpose": "registration"
}
```

Ответ для MAX:

```json
{
  "challengeId": "uuid",
  "provider": "max",
  "status": "pending",
  "deeplinkUrl": "https://max.ru/bot_username?start=public_token",
  "expiresAt": "2026-07-08T12:00:00Z"
}
```

Ответ для email/phone:

```json
{
  "challengeId": "uuid",
  "provider": "email",
  "status": "code_sent",
  "expiresAt": "2026-07-08T12:00:00Z"
}
```

## 5. Подтверждение кода

```http
POST /api/auth/verify/confirm
```

Тело:

```json
{
  "projectSlug": "utimoshi",
  "challengeId": "uuid",
  "code": "123456"
}
```

Ответ:

```json
{
  "status": "verified",
  "user": {
    "id": "uuid",
    "status": "active"
  },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

## 6. Проверка статуса подтверждения

```http
POST /api/auth/verify/status
```

Тело:

```json
{
  "projectSlug": "utimoshi",
  "challengeId": "uuid"
}
```

Ответ:

```json
{
  "status": "pending"
}
```

или

```json
{
  "status": "verified",
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

## 7. Вход

```http
POST /api/auth/login
```

Тело:

```json
{
  "projectSlug": "utimoshi",
  "provider": "email",
  "login": "ivan@example.ru"
}
```

Ответ:

```json
{
  "status": "verification_required",
  "challengeId": "uuid",
  "provider": "email"
}
```

## 8. Вход через MAX

```http
POST /api/auth/max/start
```

Тело:

```json
{
  "projectSlug": "utimoshi",
  "purpose": "login"
}
```

Ответ:

```json
{
  "challengeId": "uuid",
  "deeplinkUrl": "https://max.ru/bot_username?start=public_token",
  "expiresAt": "2026-07-08T12:00:00Z"
}
```

## 9. MAX webhook

```http
POST /api/auth/max/webhook
```

Тело зависит от события MAX.

Backend должен:

- сохранить raw event в `provider_events`;
- определить `public_token`;
- определить MAX user_id;
- обработать `bot_started`, `message_created`, `message_callback`, `contact`;
- обновить challenge;
- создать или обновить identity.

Ответ:

```json
{
  "ok": true
}
```

## 10. Refresh token

```http
POST /api/auth/refresh
```

Тело:

```json
{
  "refreshToken": "..."
}
```

Ответ:

```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

## 11. Logout

```http
POST /api/auth/logout
```

Тело:

```json
{
  "refreshToken": "..."
}
```

Ответ:

```json
{
  "ok": true
}
```

## 12. Текущий пользователь

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

Ответ:

```json
{
  "user": {
    "id": "uuid",
    "displayName": "Иван",
    "status": "active"
  },
  "identities": [
    {
      "provider": "email",
      "verified": true
    },
    {
      "provider": "max",
      "verified": true
    }
  ]
}
```

## 13. Привязка провайдера

```http
POST /api/auth/identities/:provider/link/start
Authorization: Bearer <access_token>
```

Ответ для MAX:

```json
{
  "challengeId": "uuid",
  "deeplinkUrl": "https://max.ru/bot_username?start=public_token"
}
```

## 14. Отвязка провайдера

```http
POST /api/auth/identities/:provider/unlink
Authorization: Bearer <access_token>
```

Тело:

```json
{
  "identityId": "uuid"
}
```

Правило: нельзя отвязать последний активный способ входа.

## 15. Админ: настройки проекта

```http
GET /api/admin/projects/:projectId/auth-settings
PUT /api/admin/projects/:projectId/auth-settings
```

Тело обновления:

```json
{
  "enabledProviders": ["email", "phone", "max", "telegram", "vk"],
  "requiredVerification": {
    "mode": "one_of",
    "channels": ["email", "phone", "max"]
  }
}
```
