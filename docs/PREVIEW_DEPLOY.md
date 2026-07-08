# Preview Deploy для Lk_uni UI

## 1. Что добавлено

Для проверки интерфейса добавлено отдельное React/Vite preview-приложение в папке `frontend`.

Файлы:

```text
frontend/package.json
frontend/index.html
frontend/src/main.jsx
frontend/LkUniPrototype.jsx
frontend/LkUniPrototype.css
vercel.json
```

## 2. Локальный запуск

```bash
cd frontend
npm install
npm run dev
```

После запуска открыть адрес, который покажет Vite, обычно:

```text
http://localhost:5173
```

## 3. Проверка production build

```bash
cd frontend
npm install
npm run build
npm run preview
```

## 4. Публикация на Vercel

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

## 5. Публикация через Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

При вопросах:

```text
Root Directory: ./
Build Command: cd frontend && npm install && npm run build
Output Directory: frontend/dist
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
