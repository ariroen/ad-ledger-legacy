# Цифровая система личности

Кибер-бруталистский сайт-визитка в формате закрытого командного центра. Пользователь проходит через boot sequence, видит 3D-ядро личности, управляет интерфейсом через терминал и исследует досье, модули возможностей, архив проектов, карту навыков и секретный раздел.

## Стек

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Framer Motion
- GSAP + ScrollTrigger
- React Three Fiber, Three.js, Drei
- Lenis smooth scroll
- Zustand
- Web Audio API
- Lucide React

## Запуск

```bash
npm install
npm run dev
```

Открыть: `http://localhost:3000`.

## Команды

```bash
npm run lint
npm run typecheck
npm run build
npm run start
```

## Где менять контент

Основной контент лежит в `lib/data.ts`:

- `identity` — имя, роль, описание, ссылки и статус
- `capabilities` — модули возможностей
- `projects` — карточки архива проектов
- `skillNodes` — интерактивная карта навыков
- `process` — этапы процесса
- `signals` — отзывы и внешние сигналы
- `contactModes`, `urgencyLevels`, `budgetRanges` — поля контактного протокола

## Режимы интерфейса

Переключатель в правом верхнем углу включает:

- Строго — премиальный, более спокойный командный центр
- Хаос — больше glitch, scanlines и системной дерзости
- Лайт — меньше тяжелых эффектов, 3D скрывается

Через терминал режимы тоже переключаются:

```text
executive
chaos
minimal
```

## Терминал

Команды:

```text
help
about
skills
projects
services
contact
chaos
classified
classified blacksignal
clear
```

## Как отключить 3D

Включить режим `Лайт` в интерфейсе или поставить начальный `mode` в `"minimal"` в `store/useInterfaceStore.ts`. 3D-сцена подключается через dynamic import, поэтому тяжелый canvas изолирован от основной страницы.

## Заметки

Звук по умолчанию выключен и включается только по действию пользователя. Контактная форма работает как красивый mock-передатчик и не отправляет данные на backend.
