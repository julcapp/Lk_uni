# Тестирование Lk_uni ChatGPT App через Secure MCP Tunnel

## Цель

Подключить локальный read-only MCP-сервер Lk_uni к ChatGPT без открытия входящих портов и без публикации сервера в интернете.

## Что потребуется

- Node.js 20 или новее;
- доступ к ветке `feature/chatgpt-user-app`;
- режим разработчика ChatGPT;
- `tunnel_id`, созданный в OpenAI Platform tunnel settings;
- отдельный runtime API key для `tunnel-client`;
- утилита `tunnel-client` из официальной страницы OpenAI Platform.

Ключи и `tunnel_id` нельзя сохранять в Git, `.env` проекта, документацию или скриншоты.

## 1. Запуск Lk_uni MCP

В PowerShell из корня репозитория:

```powershell
git switch feature/chatgpt-user-app
npm install
npm run chatgpt:start
```

Проверка в браузере:

```text
http://127.0.0.1:8787/
```

Ожидаемый статус: `ok`.

## 2. Создание туннеля

1. Открыть OpenAI Platform tunnel settings.
2. Создать новый туннель для Lk_uni.
3. Связать его с нужной организацией Platform и рабочим пространством ChatGPT.
4. Скопировать `tunnel_id`.
5. Создать отдельный runtime API key с минимальными необходимыми правами.
6. Скачать `tunnel-client` по ссылке из настроек туннеля.

## 3. Настройка tunnel-client в Windows PowerShell

Ключ задаётся только для текущего окна PowerShell:

```powershell
$env:CONTROL_PLANE_API_KEY = "ВСТАВИТЬ_RUNTIME_KEY"
```

Создание профиля:

```powershell
.\tunnel-client.exe init `
  --profile lk-uni-local `
  --tunnel-id ВСТАВИТЬ_TUNNEL_ID `
  --mcp-server-url http://127.0.0.1:8787/mcp
```

Диагностика:

```powershell
.\tunnel-client.exe doctor --profile lk-uni-local --explain
```

Запуск:

```powershell
.\tunnel-client.exe run --profile lk-uni-local
```

Окно MCP-сервера и окно `tunnel-client` должны оставаться открытыми во время тестирования.

## 4. Подключение в ChatGPT

1. Открыть `Настройки → Безопасность и вход`.
2. Включить режим разработчика.
3. Открыть `Настройки → Плагины` или `https://chatgpt.com/plugins`.
4. Нажать `+` для создания приложения.
5. Выбрать тип подключения `Tunnel`.
6. Выбрать туннель Lk_uni или вставить его `tunnel_id`.
7. Название: `Lk_uni User App`.
8. Описание: `Безопасный пользовательский кабинет Lk_uni для просмотра собственного профиля, способов входа и состояния безопасности.`

После подключения ChatGPT должен обнаружить только три инструмента:

- `get_my_access_summary`;
- `get_my_profile`;
- `get_security_status`.

## 5. Проверочные запросы

```text
Покажи мои права в Lk_uni.
```

```text
Покажи мой профиль и связанные способы входа.
```

```text
Проверь безопасность моего аккаунта.
```

## 6. Критерии успешного теста

- отображается интерактивный виджет;
- доступны только три read-only инструмента User App;
- отсутствуют инструменты изменения настроек проекта;
- отсутствуют глобальные инструменты Platform Owner;
- данные остаются демонстрационными и обезличенными;
- повторный вызов каждого инструмента возвращает предсказуемый результат;
- интерфейс читаем на компьютере и мобильном устройстве.

## 7. Завершение теста

1. Остановить `tunnel-client` сочетанием `Ctrl+C`.
2. Остановить MCP-сервер сочетанием `Ctrl+C`.
3. Очистить переменную ключа:

```powershell
Remove-Item Env:CONTROL_PLANE_API_KEY
```

4. Не публиковать runtime key и не добавлять его в Git.
