# Preview Deploy для Lk_uni UI

## 1. Что добавлено

Для проверки интерфейса добавлено нормальное React/Vite preview-приложение.

Файлы:

```text
package.json
frontend/package.json
frontend/index.html
frontend/src/main.jsx
frontend/src/App.jsx
frontend/LkUniPrototype.jsx
frontend/LkUniPrototype.css
vercel.json
```

## 2. Локальный запуск из корня репозитория

Находясь в папке:

```text
C:\Users\iav\Documents\GitHub\Lk_uni
```

выполнить:

```bash
npm install
npm run dev
```

После запуска открыть адрес в браузере:

```text
http://localhost:5173
```

Важно: адрес нужно открывать в браузере, не вводить его как команду в PowerShell.

## 3. Локальный запуск из папки frontend

Альтернативный вариант:

```bash
cd frontend
npm install
npm run dev
```

После запуска открыть:

```text
http://localhost:5173
```

## 4. Проверка production build

Из корня репозитория:

```bash
npm run build
npm run preview
```

или из `frontend`:

```bash
cd frontend
npm run build
npm run preview
```

## 5. Публикация на Vercel

### Вариант через сайт Vercel

1. Открыть Vercel.
2. Import Project.
3. Выбрать репозиторий `julcapp/Lk_uni`.
4. Vercel должен увидеть `vercel.json`.
5. Build command:

```bash
cd frontend && npm install && npm run build
```

6. Output directory:

```text
frontend/dist
```

7. Нажать Deploy.

После публикации Vercel выдаст ссылку вида:

```text
https://lk-uni-*.vercel.app
```

## 6. Назначение preview

Preview нужен для проверки:

- экрана входа;
- экрана регистрации;
- выбора способа подтверждения;
- подтверждения через MAX;
- восстановления доступа;
- выбора способа восстановления;
- профиля пользователя;
- админ-настроек проекта.

## 7. Важно

На текущем этапе это кликабельный UI-прототип на моковых данных.

Backend API ещё не подключён.
