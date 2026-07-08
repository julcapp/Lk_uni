# Account Recovery для Lk_uni v1.0

## 1. Назначение

Account Recovery — обязательный модуль восстановления доступа пользователя к личному кабинету.

Модуль нужен для случаев:

- пользователь забыл email;
- пользователь забыл телефон;
- пользователь не помнит, каким способом регистрировался;
- пользователь потерял доступ к одному из каналов;
- пользователь хочет восстановить вход через MAX, Telegram, email или телефон;
- проект использует парольную авторизацию и требуется сброс пароля.

## 2. Ключевой принцип

Lk_uni не должен зависеть от одного поля `login`.

Пользователь восстанавливает доступ через подтверждённые identities:

```text
email / phone / max / telegram / vk / sberid
```

То есть система ищет не "логин", а связанный с пользователем подтверждённый способ идентификации.

## 3. Пользовательский сценарий

### 3.1. Старт

На экране входа отображается ссылка:

```text
Не удаётся войти?
```

После нажатия открывается мастер восстановления доступа.

### 3.2. Поиск аккаунта

Пользователь вводит любой известный идентификатор:

- email;
- телефон;
- MAX;
- Telegram;
- VK;
- SberID.

Система не должна раскрывать, существует ли такой пользователь, в открытом виде.

Правильный ответ:

```text
Если аккаунт найден, мы покажем доступные способы восстановления или отправим инструкцию.
```

### 3.3. Выбор способа восстановления

Если пользователь найден и есть доступные verified identities, система показывает маскированные варианты:

```text
Email: i***@mail.ru
Телефон: +7 *** *** 12 34
MAX: привязан
Telegram: привязан
```

### 3.4. Подтверждение личности

Пользователь выбирает канал и проходит подтверждение.

Доступные каналы:

- email-код;
- телефонный код или звонок;
- MAX deeplink/webhook;
- Telegram login/deeplink;
- VK ID;
- SberID.

### 3.5. Завершение

После успешного подтверждения:

- пользователь авторизуется автоматически; или
- пользователь создаёт новый пароль, если проект использует парольную модель; или
- пользователь обновляет основной способ входа.

## 4. Восстановление через MAX

```text
1. Пользователь выбирает "Восстановить через MAX".
2. Backend создаёт recovery_request.
3. Backend создаёт verification_challenge:
   provider = max
   purpose = recovery
4. Frontend показывает deeplink MAX.
5. Пользователь открывает MAX-бота.
6. MAX webhook возвращает MAX user_id.
7. Backend ищет auth_identity provider=max.
8. Если identity найдена и verified=true:
   - recovery_request переводится в verified;
   - создаётся новая session;
   - пользователю выдаются access/refresh tokens.
9. Если identity не найдена:
   - система сообщает, что MAX не привязан к аккаунту.
```

## 5. Таблицы

### 5.1. recovery_requests

```sql
CREATE TABLE recovery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  lookup_type VARCHAR(50),
  lookup_hash TEXT,

  status VARCHAR(40) NOT NULL DEFAULT 'started',
  selected_provider VARCHAR(50),

  ip_address INET,
  user_agent TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recovery_requests_project_id ON recovery_requests(project_id);
CREATE INDEX idx_recovery_requests_user_id ON recovery_requests(user_id);
CREATE INDEX idx_recovery_requests_status ON recovery_requests(status);
CREATE INDEX idx_recovery_requests_lookup_hash ON recovery_requests(lookup_hash);
```

### 5.2. recovery_attempts

```sql
CREATE TABLE recovery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recovery_request_id UUID NOT NULL REFERENCES recovery_requests(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',

  ip_address INET,
  user_agent TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_recovery_attempts_request_id ON recovery_attempts(recovery_request_id);
CREATE INDEX idx_recovery_attempts_provider ON recovery_attempts(provider);
```

## 6. API

### 6.1. Старт восстановления

```http
POST /api/auth/recovery/start
```

Тело:

```json
{
  "projectSlug": "utimoshi",
  "lookup": "ivan@example.ru"
}
```

Ответ должен быть безопасным:

```json
{
  "status": "started",
  "message": "Если аккаунт найден, будут доступны способы восстановления."
}
```

### 6.2. Получить доступные варианты

```http
GET /api/auth/recovery/:recoveryRequestId/options
```

Ответ:

```json
{
  "options": [
    {
      "provider": "email",
      "maskedValue": "i***@mail.ru"
    },
    {
      "provider": "phone",
      "maskedValue": "+7 *** *** 12 34"
    },
    {
      "provider": "max",
      "maskedValue": "MAX привязан"
    }
  ]
}
```

### 6.3. Запуск выбранного канала

```http
POST /api/auth/recovery/:recoveryRequestId/verify/start
```

Тело:

```json
{
  "provider": "max"
}
```

Ответ для MAX:

```json
{
  "status": "pending",
  "deeplinkUrl": "https://max.ru/bot_username?start=public_token"
}
```

### 6.4. Подтверждение

```http
POST /api/auth/recovery/:recoveryRequestId/verify/confirm
```

Тело для email/phone:

```json
{
  "code": "123456"
}
```

Ответ:

```json
{
  "status": "verified",
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### 6.5. Сброс пароля

Если проект использует парольную модель:

```http
POST /api/auth/recovery/:recoveryRequestId/password/reset
```

Тело:

```json
{
  "newPassword": "new-secure-password"
}
```

## 7. Безопасность

Обязательные требования:

- не раскрывать наличие аккаунта по email/телефону;
- маскировать email и телефон;
- rate limit по IP, project_id, lookup_hash;
- TTL для recovery request;
- одноразовые challenge;
- журналировать все попытки;
- не позволять восстановление через непроверенную identity;
- не позволять отвязать последний способ входа;
- уведомлять пользователя о восстановлении доступа через доступные каналы.

## 8. UI

Экраны:

- `Не удаётся войти?`;
- ввод email/телефона/идентификатора;
- выбор способа восстановления;
- подтверждение через email;
- подтверждение через телефон;
- подтверждение через MAX;
- успешное восстановление;
- создание нового пароля, если требуется проектом.

## 9. Решение

Account Recovery входит в v1.0 как обязательный модуль.

Понятие "забыл логин" трактуется как восстановление доступа через любую подтверждённую identity.
