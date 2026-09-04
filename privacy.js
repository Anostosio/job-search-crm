const copy = {
  en: {
    button: 'Privacy',
    title: 'Privacy & local data',
    backup: 'Backup files can contain vacancy details, recruiter contact information and private notes. Store them carefully; Job Search CRM does not upload your JSON or CSV backups.',
    content: `
      <p><strong>Local workspace.</strong> Your CRM workspace is stored in this browser's localStorage. Job Search CRM does not send vacancy records, notes, recruiter contacts, candidate profiles, pasted analyzer text, imports or exports to an application server.</p>
      <p><strong>Local processing.</strong> Vacancy matching runs in your browser. JSON/CSV exports are created locally, and JSON imports are read locally.</p>
      <p><strong>No cloud sync or product analytics.</strong> This version has no account system, cloud database, cloud sync, advertising tracker, Yandex Metrica or Google Analytics.</p>
      <p><strong>Hosting.</strong> The page itself is served by Vercel. Like normal web hosting, Vercel may process technical request data such as an IP address, request metadata and platform/access logs. This infrastructure data is separate from the CRM content stored in localStorage.</p>
      <p><strong>Your backups.</strong> Clearing browser or site storage can delete the workspace. Data is not synchronized between devices. Keeping exported backup files is your responsibility.</p>
      <p><strong>External links.</strong> Opening a vacancy or portfolio link takes you to a third-party website, which handles that request under its own terms.</p>
      <p class="privacy-updated">Updated 4 September 2026.</p>`
  },
  ru: {
    button: 'Конфиденциальность',
    title: 'Конфиденциальность и локальные данные',
    backup: 'Резервные JSON/CSV-файлы могут содержать данные вакансий, контакты рекрутеров и личные заметки. Храните их внимательно: Job Search CRM не загружает ваши резервные копии на сервер.',
    content: `
      <p><strong>Локальное рабочее пространство.</strong> Данные CRM хранятся в localStorage этого браузера. Job Search CRM не отправляет на сервер приложения карточки вакансий, заметки, контакты рекрутеров, профили кандидата, вставленный в анализатор текст, импортируемые или экспортируемые данные.</p>
      <p><strong>Локальная обработка.</strong> Сопоставление вакансии с профилем выполняется в браузере. Экспорт JSON/CSV создаётся локально, импорт JSON читается локально.</p>
      <p><strong>Без облачной синхронизации и продуктовой аналитики.</strong> В этой версии нет аккаунтов, облачной базы, cloud sync, рекламных трекеров, Яндекс Метрики или Google Analytics.</p>
      <p><strong>Хостинг.</strong> Сама страница загружается с инфраструктуры Vercel. Как обычный технический хостинг, Vercel может обрабатывать IP-адрес, метаданные HTTP-запросов и технические access/platform logs. Это отдельный инфраструктурный слой и не содержимое CRM в localStorage.</p>
      <p><strong>Резервные копии.</strong> Очистка данных сайта или браузера может удалить рабочее пространство. Данные не синхронизируются между устройствами. За сохранность экспортированных резервных копий отвечает пользователь.</p>
      <p><strong>Внешние ссылки.</strong> При открытии ссылки на вакансию или портфолио пользователь переходит на сторонний сайт, который обрабатывает запрос по собственным правилам.</p>
      <p class="privacy-updated">Обновлено 4 сентября 2026 года.</p>`
  }
};

function language() {
  return document.documentElement.lang === 'ru' ? 'ru' : 'en';
}

function refresh() {
  const t = copy[language()];
  const button = document.getElementById('privacyOpenBtn');
  const title = document.getElementById('privacyTitle');
  const content = document.getElementById('privacyContent');
  const backup = document.getElementById('backupPrivacyWarning');
  if (button) button.textContent = t.button;
  if (title) title.textContent = t.title;
  if (content) content.innerHTML = t.content;
  if (backup) backup.textContent = t.backup;
}

function install() {
  const dialog = document.getElementById('privacyDialog');
  const open = document.getElementById('privacyOpenBtn');
  const close = document.getElementById('privacyCloseBtn');
  if (!dialog || !open || !close) return;

  // Remove the obsolete consent flag left by older builds that contained Metrica.
  try { localStorage.removeItem('jobSearchCrm.analyticsConsent.v1'); } catch { /* localStorage may be unavailable */ }

  open.addEventListener('click', () => dialog.showModal());
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  refresh();
  new MutationObserver(refresh).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang']
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
else install();
