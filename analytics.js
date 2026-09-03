const METRICA_ID = 112266574;
const CONSENT_KEY = 'jobSearchCrm.analyticsConsent.v1';

const copy = {
  en: {
    settings: 'Analytics settings',
    title: 'Help improve Job Search CRM?',
    text: 'With your permission, Yandex Metrica measures visits and interface usage. Vacancy content, notes and form values are not recorded with Session Replay.',
    decline: 'Not now',
    accept: 'Allow analytics'
  },
  ru: {
    settings: 'Настройки аналитики',
    title: 'Помочь улучшить Job Search CRM?',
    text: 'С твоего согласия Яндекс Метрика будет считать посещения и использование интерфейса. Содержимое вакансий, заметки и значения полей не записываются Вебвизором.',
    decline: 'Не сейчас',
    accept: 'Разрешить аналитику'
  }
};

function language() {
  return document.documentElement.lang === 'ru' ? 'ru' : 'en';
}

function readConsent() {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
}

function saveConsent(value) {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* Consent still applies for this page. */ }
}

function loadMetrica() {
  if (window.ym) return;

  (function initQueue(m, e, t, r, i, k, a) {
    m[i] = m[i] || function queueCall() { (m[i].a = m[i].a || []).push(arguments); };
    m[i].l = 1 * new Date();
    for (let j = 0; j < document.scripts.length; j += 1) {
      if (document.scripts[j].src === r) return;
    }
    k = e.createElement(t);
    a = e.getElementsByTagName(t)[0];
    k.async = true;
    k.src = r;
    a.parentNode.insertBefore(k, a);
  }(window, document, 'script', `https://mc.yandex.ru/metrika/tag.js?id=${METRICA_ID}`, 'ym'));

  window.ym(METRICA_ID, 'init', {
    ssr: true,
    webvisor: false,
    clickmap: true,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true
  });
}

function installStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .analytics-settings{border:0;padding:0;background:transparent;color:var(--muted);cursor:pointer;text-decoration:underline;text-underline-offset:3px;font:inherit}.analytics-settings:hover{color:var(--accent)}.analytics-settings:focus-visible{outline:3px solid rgba(131,28,24,.22);outline-offset:3px;border-radius:3px}.analytics-consent{position:fixed;z-index:80;left:50%;bottom:22px;transform:translateX(-50%);width:min(760px,calc(100% - 32px));display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;padding:20px 22px;border:1px solid var(--line);border-radius:18px;background:var(--card);box-shadow:0 24px 70px rgba(33,19,17,.18)}.analytics-consent[hidden]{display:none!important}.analytics-consent strong{display:block;margin-bottom:5px}.analytics-consent p{margin:0;color:var(--muted);font-size:13px;line-height:1.55}.analytics-consent-actions{display:flex;gap:8px}.analytics-consent button{border-radius:10px;padding:10px 13px;cursor:pointer;white-space:nowrap;font-weight:700;font-size:12px;min-height:40px}.analytics-consent-accept{border:1px solid var(--accent);background:var(--accent);color:#fff}.analytics-consent-decline{border:1px solid var(--line);background:transparent;color:var(--muted)}.analytics-consent button:focus-visible{outline:3px solid rgba(131,28,24,.22);outline-offset:3px}@media(max-width:620px){.analytics-consent{grid-template-columns:1fr;gap:16px}.analytics-consent-actions{display:grid;grid-template-columns:1fr 1fr}.analytics-consent button{width:100%}.site-footer{gap:10px;align-items:flex-start}}
  `;
  document.head.appendChild(style);
}

function installUi() {
  const footer = document.querySelector('.site-footer');
  if (!footer || document.querySelector('#analyticsSettings')) return;

  const settings = document.createElement('button');
  settings.id = 'analyticsSettings';
  settings.type = 'button';
  settings.className = 'analytics-settings';
  const portfolio = footer.querySelector('a');
  if (portfolio) footer.insertBefore(settings, portfolio);
  else footer.append(settings);

  const banner = document.createElement('aside');
  banner.id = 'analyticsConsent';
  banner.className = 'analytics-consent';
  banner.hidden = true;
  banner.setAttribute('aria-labelledby', 'analyticsConsentTitle');
  banner.innerHTML = `
    <div><strong id="analyticsConsentTitle"></strong><p id="analyticsConsentText"></p></div>
    <div class="analytics-consent-actions">
      <button type="button" class="analytics-consent-decline" id="analyticsDecline"></button>
      <button type="button" class="analytics-consent-accept" id="analyticsAccept"></button>
    </div>`;
  document.body.append(banner);

  const refreshCopy = () => {
    const t = copy[language()];
    settings.textContent = t.settings;
    document.querySelector('#analyticsConsentTitle').textContent = t.title;
    document.querySelector('#analyticsConsentText').textContent = t.text;
    document.querySelector('#analyticsDecline').textContent = t.decline;
    document.querySelector('#analyticsAccept').textContent = t.accept;
  };

  const showBanner = () => {
    banner.hidden = false;
    document.querySelector('#analyticsAccept')?.focus({preventScroll:true});
  };
  const hideBanner = () => { banner.hidden = true; };

  settings.addEventListener('click', showBanner);
  document.querySelector('#analyticsAccept').addEventListener('click', () => {
    saveConsent('accepted');
    loadMetrica();
    hideBanner();
  });
  document.querySelector('#analyticsDecline').addEventListener('click', () => {
    const wasAccepted = readConsent() === 'accepted';
    saveConsent('declined');
    hideBanner();
    if (wasAccepted) location.reload();
  });

  refreshCopy();
  new MutationObserver(refreshCopy).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});

  const consent = readConsent();
  if (consent === 'accepted') loadMetrica();
  else if (consent !== 'declined') showBanner();
}

installStyles();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installUi, {once:true});
else installUi();
