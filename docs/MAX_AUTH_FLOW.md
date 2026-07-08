# MAX Auth Flow для Lk_uni v1.0

## 1. Статус MAX в архитектуре

MAX реализуется как один из каналов:

- подтверждения регистрации;
- входа;
- привязки аккаунта;
- подтверждения номера телефона через `request_contact`, если включено проектом.

MAX не является обязательным каналом для всей платформы. Обязательность MAX задаётся в настройках конкретного проекта.

Пример:

```json
{
  "required_verification": {
    "mode": "one_of",
    "channels": ["email", "phone", "max"]
  }
}
```

## 2. Основание по документации MAX

Согласно документации MAX:

- API MAX работает через HTTPS-запросы к `platform-api2.max.ru`.
- Передача токена через query-параметры не поддерживается; токен нужно передавать через заголовок `Authorization`.
- Для production рекомендуется использовать Webhook.
- Long Polling не подходит для production-окружения.
- Webhook на HTTP и самоподписных сертификатах не поддерживается для production.
- Deeplink позволяет открыть бота с параметром `start`.
- Кнопка `request_contact` позволяет запросить у пользователя контакт и номер телефона, привязанный к MAX.
- Для проверки контакта используется HMAC-SHA256 с токеном бота и `vcf_info`.

## 3. Канонический сценарий подтверждения регистрации через MAX

```text
1. Пользователь заполняет форму регистрации в Lk_uni.
2. Backend создаёт user со статусом pending_verification.
3. Backend создаёт verification_challenge:
   provider = max
   purpose = registration
   status = pending
4. Backend генерирует public_token.
5. Frontend показывает кнопку "Подтвердить через MAX".
6. Пользователь открывает deeplink:
   https://max.ru/<bot_username>?start=<public_token>
7. MAX отправляет событие bot_started/message_created на webhook Lk_uni.
8. Backend находит verification_challenge по public_token.
9. Backend связывает MAX user_id с user_id.
10. Бот отправляет пользователю сообщение с кнопкой "Подтвердить регистрацию".
11. Пользователь нажимает кнопку.
12. Backend получает callback event.
13. Backend переводит challenge в confirmed.
14. Backend создаёт или обновляет auth_identity provider=max.
15. Если правила проекта выполнены, user.status = active.
16. Frontend получает успешный статус и выдаёт сессию.
```

## 4. Вход через MAX

```text
1. Пользователь нажимает "Войти через MAX".
2. Backend создаёт verification_challenge:
   provider = max
   purpose = login
3. Пользователь открывает deeplink MAX.
4. MAX webhook передаёт user_id.
5. Backend ищет auth_identity:
   project_id + provider=max + provider_user_id=max_user_id
6. Если identity найдена и verified=true:
   - создаётся session;
   - выдаются access_token и refresh_token.
7. Если identity не найдена:
   - пользователь получает сценарий регистрации или привязки.
```

## 5. Привязка MAX к существующему аккаунту

```text
1. Пользователь уже авторизован в Lk_uni.
2. В профиле нажимает "Привязать MAX".
3. Backend создаёт challenge:
   purpose = link_identity
   user_id = current_user_id
4. Пользователь открывает deeplink.
5. MAX webhook возвращает max_user_id.
6. Backend проверяет, что max_user_id не привязан к другому пользователю.
7. Создаётся auth_identity provider=max.
8. Пользователь видит MAX в списке связанных способов входа.
```

## 6. Получение телефона через MAX request_contact

MAX request_contact может использоваться как дополнительный способ подтверждения телефона.

Важное правило:

- номер, полученный через `request_contact`, можно использовать только для взаимодействия с текущим ботом и сервисом;
- нельзя считать этот механизм универсальной заменой KYC;
- нужно проверять `hash` через HMAC-SHA256.

Сценарий:

```text
1. Бот отправляет кнопку request_contact.
2. Пользователь делится контактом.
3. MAX передаёт контакт в событии.
4. Backend извлекает vcf_info и hash.
5. Backend считает HMAC-SHA256(bot_access_token, vcf_info).
6. Если значения совпадают:
   - телефон считается подтверждённым для данного проекта;
   - создаётся или обновляется auth_identity provider=phone.
```

## 7. Webhook endpoint

```http
POST /api/auth/max/webhook
```

### Проверки webhook

Backend обязан:

- принимать только HTTPS в production;
- проверять секрет webhook, если настроен;
- логировать raw payload в `provider_events`;
- не доверять query-параметрам;
- проверять подпись/секрет;
- обеспечивать идемпотентность обработки;
- не обрабатывать просроченные challenge.

## 8. Таблицы

Минимально используются:

- `verification_challenges`;
- `auth_identities`;
- `provider_events`;
- `users`;
- `sessions`;
- `refresh_tokens`;
- `audit_log`.

## 9. Ошибочные сценарии

### 9.1. Challenge истёк

Пользователь должен получить сообщение:

```text
Срок подтверждения истёк. Вернитесь в личный кабинет и начните подтверждение заново.
```

### 9.2. MAX уже привязан к другому аккаунту

```text
Этот MAX-аккаунт уже привязан к другому пользователю.
```

### 9.3. Пользователь начал вход, но identity не найдена

```text
MAX пока не привязан к аккаунту. Зарегистрируйтесь или войдите другим способом и привяжите MAX в профиле.
```

## 10. Green API

Green API рассматривается как внешний адаптер/транспорт для MAX, но не как ядро архитектуры.

Целевая стратегия:

```text
v1.0: официальный MAX Bot API
v1.1+: опциональный provider adapter для Green API
```

## 11. Подписание документов в MAX

Функция подписания документов не входит в базовый auth-flow.

Она может быть выделена в отдельный модуль:

```text
modules/max-docsign/
```

Связь с Lk_uni:

- пользователь авторизован;
- identity MAX подтверждена;
- документ передаётся в модуль подписания;
- результат подписания сохраняется во внешней бизнес-системе.

## 12. Переменные окружения

```env
MAX_BOT_TOKEN=
MAX_BOT_USERNAME=
MAX_WEBHOOK_SECRET=
MAX_WEBHOOK_URL=https://example.ru/api/auth/max/webhook
MAX_API_BASE_URL=https://platform-api2.max.ru
MAX_DEEPLINK_BASE=https://max.ru
```

## 13. API Lk_uni для MAX

```http
POST /api/auth/max/start
POST /api/auth/max/status
POST /api/auth/max/webhook
POST /api/auth/max/link/start
POST /api/auth/max/unlink
```

## 14. Решение

Для Lk_uni принимается следующая модель:

```text
MAX = verification/login/link provider
обязательность = project_auth_settings.required_verification
production transport = official MAX Bot API webhook
Green API = optional adapter later
```
