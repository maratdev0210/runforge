# Runforge

React + TypeScript + Vite. Для стилей используется встроенная поддержка CSS Modules в Vite: файлы `*.module.css` импортируются в компоненты как объект классов (пример — `src/App.tsx`).

## Запуск

```sh
npm install
npm run dev
```

Приложение доступно по адресу http://localhost:5173. Если порт занят, Vite завершится с ошибкой: освободите порт и повторите запуск.

## Сборка

```sh
npm run build
```

Команда проверяет типы TypeScript и собирает приложение в `dist/`. Для локального просмотра сборки выполните `npm run preview`.

## Mock API

MSW мокирует запросы к бэкенду в браузере: `getRuns()` делает обычный `fetch` к `GET /api/runs`, а MSW возвращает JSON с задержкой 700 мс.  MSW запускается до отрисовки React, чтобы перехватить первый запрос.

- Данные восьми фиксированных запусков: `src/app/mocks/fixtures/runs.ts`.
- Обработчики запросов: `src/app/mocks/handlers.ts`.

Моки включены и при разработке, и в production-сборке демо. Для отключения задайте `VITE_ENABLE_MOCKS=false` при запуске dev-сервера или сборке;

Для проверки ошибки откройте страницу с `?mockError=1`: `getRuns()` передаст флаг в API-запрос. Первый запрос вернёт HTTP 500, повторные — HTTP 200. Перезагрузка страницы сбрасывает сценарий. 

## Тесты

```sh
npm test            
npm run test:watch  
```

Среда — Vitest + jsdom, компоненты проверяются через React Testing Library и jest-dom. 
