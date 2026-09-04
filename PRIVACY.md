# Privacy — Job Search CRM

**Anostosio° / Product Lab**  
Updated: **4 September 2026**

This page explains how the current local-first version handles data. It describes the product's actual behavior and does not claim complete legal compliance.

## English

### Local workspace

Your CRM workspace is stored in `localStorage` in the current browser. Job Search CRM does not send vacancy records, notes, recruiter contacts, candidate profiles, pasted analyzer text, imports or exports to an application server.

### Local processing

Vacancy matching runs in the browser using transparent deterministic rules. JSON/CSV exports are created locally, and JSON imports are read locally.

### No cloud sync or product tracking

This version has no account system, cloud database, cloud synchronization, advertising tracker, Yandex Metrica or Google Analytics.

The **Analytics** screen inside the CRM means local pipeline statistics calculated from your own browser-stored workspace. It is not visitor tracking.

### Technical hosting

The page itself is served by Vercel. Like normal web hosting, Vercel may process technical request data such as an IP address, HTTP request metadata and platform/access logs. This infrastructure data is separate from the CRM content stored in `localStorage`.

### Fonts

Manrope and Unbounded are self-hosted. They are copied from OFL-licensed Fontsource packages during the build and served from the same application origin. The browser does not need to contact Google Fonts to render them.

### Backups

Clearing browser or site storage can delete the workspace. Data is not synchronized between devices. Keeping exported backup files is the user's responsibility.

Backup files can contain vacancy details, recruiter contact information and private notes. Store and share them carefully.

### External links

Opening a vacancy or portfolio link takes you to a third-party website. That site then handles the request under its own terms.

---

## Русский

### Локальное рабочее пространство

Данные CRM хранятся в `localStorage` текущего браузера. Job Search CRM не отправляет на сервер приложения карточки вакансий, заметки, контакты рекрутеров, профили кандидата, вставленный в анализатор текст, импортируемые или экспортируемые данные.

### Локальная обработка

Сопоставление вакансии с профилем выполняется в браузере по прозрачным детерминированным правилам. Экспорт JSON/CSV создаётся локально, импорт JSON читается локально.

### Без облачной синхронизации и продуктового трекинга

В этой версии нет аккаунтов, облачной базы данных, cloud sync, рекламных трекеров, Яндекс Метрики или Google Analytics.

Раздел **«Аналитика»** внутри CRM — это локальная статистика собственной воронки пользователя, рассчитанная из данных в браузере. Это не аналитика посещений сайта.

### Технический хостинг

Сама страница загружается с инфраструктуры Vercel. Как обычный технический хостинг, Vercel может обрабатывать IP-адрес, метаданные HTTP-запросов и технические access/platform logs. Это отдельный инфраструктурный слой и не содержимое CRM в `localStorage`.

### Шрифты

Manrope и Unbounded self-hosted: при сборке они копируются из Fontsource-пакетов с лицензией OFL и затем отдаются с того же домена приложения. Браузеру не нужно обращаться к Google Fonts для их загрузки.

### Резервные копии

Очистка данных сайта или браузера может удалить рабочее пространство. Данные не синхронизируются между устройствами. За сохранность экспортированных резервных копий отвечает пользователь.

Резервные файлы могут содержать данные вакансий, контакты рекрутеров и личные заметки. Хранить и передавать их нужно внимательно.

### Внешние ссылки

При открытии ссылки на вакансию или портфолио пользователь переходит на сторонний сайт, который далее обрабатывает запрос по собственным правилам.
