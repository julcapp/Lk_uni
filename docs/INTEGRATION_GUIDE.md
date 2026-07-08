# Integration Guide Lk_uni

## 1. Назначение

Этот документ описывает, как внешний проект должен подключаться к Lk_uni.

## 2. Варианты подключения

### 2.1. Redirect flow

Проект перенаправляет пользователя на страницу Lk_uni.

```text
https://lk.example.ru/auth?project=utimoshi&redirect_uri=https://utimoshi.ru/auth/callback
```

После успешного входа Lk_uni возвращает пользователя на `redirect_uri`.

### 2.2. Widget flow

Проект встраивает React-компонент.

```jsx
import { LkAuthWidget } from "@lk_uni/react";

export function LoginPage() {
  return (
    <LkAuthWidget
      projectSlug="utimoshi"
      onSuccess={(session) => {
        console.log(session);
      }}
    />
  );
}
```

### 2.3. API-only flow

Проект полностью сам рисует интерфейс и вызывает REST API Lk_uni.

## 3. Минимальная настройка проекта

В Lk_uni создаётся проект:

```json
{
  "slug": "utimoshi",
  "name": "У Тимоши",
  "publicBaseUrl": "https://utimoshi.ru",
  "allowedRedirectUrls": [
    "https://utimoshi.ru/auth/callback"
  ],
  "branding": {
    "primaryColor": "#7C3AED",
    "logoUrl": "https://utimoshi.ru/logo.png"
  }
}
```

## 4. Настройка каналов авторизации

```json
{
  "enabledProviders": ["email", "phone", "max", "telegram", "vk"],
  "requiredVerification": {
    "mode": "one_of",
    "channels": ["email", "phone", "max"]
  }
}
```

## 5. Логика подтверждения

Если `mode = one_of`, пользователю достаточно подтвердить один канал из списка.

Если `mode = all_of`, пользователь обязан подтвердить все каналы из списка.

## 6. Быстрое подключение нового проекта

Порядок:

```text
1. Создать project.
2. Указать allowed redirect URLs.
3. Настроить branding.
4. Включить нужные providers.
5. Настроить requiredVerification.
6. Подключить redirect/widget/API flow.
7. Проверить регистрацию.
8. Проверить вход.
9. Проверить /me.
```

## 7. Что должен получить внешний проект

После входа внешний проект получает:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "uuid",
    "displayName": "Иван",
    "status": "active"
  }
}
```

## 8. Проверка пользователя

Внешний проект вызывает:

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

## 9. Рекомендованная интеграция для первых проектов

Для первых проектов использовать redirect flow.

Причина:

- проще внедрить;
- меньше ошибок безопасности;
- быстрее проверить архитектуру;
- единый UI для всех проектов.

После стабилизации добавить React widget.
