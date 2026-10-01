# OWT — Ost West Technology · сайт

Редизайн owt.com.ua. Основной язык — украинский; английская версия пока только главная (`/en/`).

## Страницы

| URL | Страница |
|---|---|
| `/` | Главная |
| `/posluhy/` | Послуги — обзор направлений |
| `/posluhy/hidrotekhnika/` | Гідротехнічні роботи |
| `/posluhy/budivnytstvo-na-vodi/` | Будівництво на воді |
| `/posluhy/peresadka-derev/` | Пересадка великих дерев |
| `/tekhnika/` | Техніка (каталог оренди) |
| `/proekty/` | Реалізовані проєкти |
| `/proekty/<slug>/` | Шаблон проєкту (4 проєкти) |
| `/pro-kompaniiu/` | Про компанію |
| `/kontakty/` | Контакти |

Старые адреса owt.com.ua перенаправляются на новые (`redirects` в `astro.config.mjs`).

## Запуск

Node.js 22 установлен локально в `~/.local/node` (без изменений в системе).

```bash
cd ~/Desktop/OWT
export PATH="$HOME/.local/node/bin:$PATH"
npm run build      # production-сборка в dist/ (первая — ~5 мин из-за AVIF, дальше кэш)
npm run preview    # http://localhost:4321 — смотреть сайт нужно так (EN: /en/)
npm run dev        # режим разработки: фото обрабатываются на лету, поэтому медленно
node scripts/prepare-photos.mjs     # единая обработка всех фото (art direction)
node scripts/check-links.mjs        # проверка внутренних ссылок и якорей в dist/
```

Режим `dev` не подходит для оценки скорости: каждое изображение
генерируется при первом запросе. Реальную скорость показывает `build` + `preview`.

## Структура

```
src/
  assets/brand/     логотип, трассированный 1:1 из assets/owt-logo.png (full + mark)
  assets/photos/    фото главной — генерируются scripts/prepare-photos.mjs
  assets/projects/  фотосерия проектов 4:3 — тот же скрипт
                    (исходники: assets/source/{photos,projects}/, реальные фото OWT)
  data/             телефоны, мессенджеры, соцсети, видео, фото, адреса (routes),
                    проекты (projects.ts), архив работ (archive.ts)
  assets/gallery/   галереи проектов (тот же скрипт обработки)
  assets/archive/   архив работ — миниатюры 640×400 со старого сайта
  i18n/             uk.ts (основной), en.ts — весь текст главной
  styles/           tokens.css (дизайн-токены), global.css (база, утилиты, reveal)
  components/
    layout/         Header (+ мобильное меню, выпадающий список услуг), Footer, MobileDock
    page/           блоки внутренних страниц: PageHead, SectionHead, SubNav, Figures,
                    ProjectCard, RelatedProjects, OtherDirections, Archive, VideoPoster, CtaBand
    sections/       Hero, Intro, Directions, Projects, Fleet, Process, Contact
    forms/          ConsultForm (только интерфейс, отправка не подключена)
    ui/             Logo, Button, Icon, Img (AVIF/WebP/JPEG), SectionLabel, VideoDialog
  layouts/          BaseLayout (head), PageLayout (оболочка всех страниц)
  scripts/site.ts   анимации и интерактив для всех страниц (progressive enhancement)
  pages/            все страницы (см. таблицу выше), en/index.astro, 404.astro
```

Фото, которым нужна ручная ретушь: `photos-to-retouch.md`.

Все факты о компании взяты с текущего сайта; новые данные не добавлялись.
