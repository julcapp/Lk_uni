# Архитектура Lk_uni v1.0

## 1. Концепция

Lk_uni проектируется как самостоятельная Identity & Auth Platform.

Сервис отвечает за:

- регистрацию;
- вход;
- подтверждение пользователя;
- управление профилем;
- управление способами входа;
- хранение сессий;
- аудит;
- проектные настройки;
- быстрое встраивание в другие продукты.

## 2. Общая схема

```text
External Project
      |
      | REST API / SDK / Widget
      v
+-------------------------------+
|            Lk_uni             |
| Identity & Auth Platform      |
+-------------------------------+
| Auth                          |
| Users                         |
| Projects                      |
| Verification                  |
| Identities                    |
| Sessions                      |
| OAuth / External Providers    |
| Audit                         |
| Admin                         |
+-------------------------------+
      |
      v
PostgreSQL
```

## 3. Модульная структура backend

```text
backend/
  src/
    app.js
    server.js

    config/
      env.js
      database.js
      security.js

    modules/
      auth/
        auth.controller.js
        auth.routes.js
        auth.service.js
        token.service.js
        passwordless.service.js

      users/
        users.controller.js
        users.routes.js
        users.service.js

      projects/
        projects.controller.js
        projects.routes.js
        projects.service.js

      verification/
        verification.controller.js
        verification.routes.js
        verification.service.js
        email.provider.js
        phone.provider.js
        max.provider.js
        telegram.provider.js

      identities/
        identities.service.js
        identities.repository.js

      providers/
        provider.interface.js
        registry.js
        max/
          max.client.js
          max.provider.js
          max.webhook.js
        telegram/
        vk/
        sberid/

      sessions/
        sessions.service.js
        refresh-token.service.js

      audit/
        audit.service.js

      admin/
        admin.routes.js
        admin.controller.js

    db/
      migrations/
      schema/
```

## 4. Frontend

```text
frontend/
  src/
    app/
    pages/
      LoginPage.jsx
      RegisterPage.jsx
      VerifyPage.jsx
      MaxVerifyPage.jsx
      ProfilePage.jsx
      AdminProjectSettingsPage.jsx

    components/
      auth/
        AuthLayout.jsx
        LoginForm.jsx
        RegisterForm.jsx
        ProviderButton.jsx
        VerificationMethodCard.jsx

      profile/
        IdentityList.jsx
        LinkedProviderCard.jsx

      admin/
        ProjectAuthSettingsForm.jsx
        ProviderSettingsPanel.jsx

    sdk/
      LkAuthWidget.jsx
      useLkAuth.js
```

## 5. Доменная модель

### 5.1. User

Единая сущность человека или аккаунта.

Статусы:

- `draft`;
- `pending_verification`;
- `verified`;
- `active`;
- `blocked`;
- `deleted`.

### 5.2. Identity

Способ идентификации пользователя.

Примеры:

- `email`;
- `phone`;
- `max`;
- `telegram`;
- `vk`;
- `sberid`.

Каждая identity имеет:

- provider;
- provider_user_id;
- verified;
- verified_at;
- linked_at;
- metadata.

### 5.3. Project

Проект, который использует Lk_uni.

### 5.4. ProjectAuthSettings

Настройки авторизации конкретного проекта.

Именно здесь определяется, какие каналы включены и какие из них обязательны.

## 6. Принцип one user — many identities

Пользователь может иметь несколько способов входа.

```text
user: Иван
  identities:
    email: ivan@example.ru
    phone: +79990000000
    max: 123456789
    telegram: 987654321
```

Вход через любой verified identity открывает тот же аккаунт.

## 7. Каналы подтверждения

Каналы подтверждения реализуются через единый интерфейс.

```js
class VerificationProvider {
  async start(context) {}
  async confirm(context) {}
  async getStatus(context) {}
}
```

Каждый канал должен возвращать унифицированный результат:

```json
{
  "provider": "max",
  "status": "verified",
  "identity": {
    "provider_user_id": "123456789"
  }
}
```

## 8. MAX как verification provider

MAX не является обязательным каналом для всей платформы.

Он включается или отключается в настройках проекта.

Сценарии MAX:

- подтверждение регистрации;
- вход;
- привязка MAX к существующему аккаунту;
- получение номера телефона через request_contact, если это разрешено проектом.

## 9. Сессии

Используется модель:

- короткоживущий `access_token`;
- долгоживущий `refresh_token`;
- refresh token хранится в БД в хешированном виде;
- поддерживается отзыв сессии;
- поддерживается список активных устройств.

## 10. Интеграция внешнего проекта

Варианты встраивания:

### 10.1. Redirect flow

Проект перенаправляет пользователя в Lk_uni.

```text
https://lk.example.ru/auth?project=utimoshi&redirect_uri=https://utimoshi.ru/callback
```

### 10.2. Widget flow

Проект подключает React-компонент.

```jsx
<LkAuthWidget projectSlug="utimoshi" />
```

### 10.3. API flow

Проект сам рисует UI и вызывает REST API Lk_uni.

## 11. Безопасность

Обязательные меры:

- HTTPS;
- HMAC/state для внешних flow;
- PKCE для OAuth, где применимо;
- rate limit;
- audit log;
- хранение refresh tokens только в виде хеша;
- одноразовые verification challenge;
- TTL для всех временных токенов;
- проверка project domain/callback URL;
- запрет повторного использования state/token.

## 12. Дальнейшее развитие

v1.1:

- RBAC/permissions;
- организации и команды;
- magic links;
- Passkeys/WebAuthn;
- админский audit viewer;
- SDK для Next.js;
- Docker compose;
- CI/CD.
