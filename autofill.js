import {loadWorkspace} from './lib/storage.js';
import {duplicateOf, sanitizeUrl} from './lib/jobs.js';

const $ = id => document.getElementById(id);
let duplicateId = '';

const ui = {
  en: {
    fill:'Fill from link', loading:'Reading vacancy…', hint:'Paste a vacancy link and fill the details automatically. You can review everything before saving.',
    found:n=>`${n} field${n===1?'':'s'} filled · review before saving.`, partial:n=>`${n} field${n===1?'':'s'} found · complete the rest manually.`,
    bad:'Enter a valid http(s) vacancy link.', duplicate:'This vacancy is already in your pipeline.', open:'Open existing',
    unavailable:'This page could not be read automatically. You can still fill the vacancy manually.'
  },
  ru: {
    fill:'Заполнить по ссылке', loading:'Читаю вакансию…', hint:'Вставь ссылку на вакансию — данные заполнятся автоматически. Перед сохранением всё можно проверить.',
    found:n=>`Заполнено полей: ${n} · проверь перед сохранением.`, partial:n=>`Найдено полей: ${n} · остальное заполни вручную.`,
    bad:'Вставь корректную http(s)-ссылку на вакансию.', duplicate:'Эта вакансия уже есть в воронке.', open:'Открыть существующую',
    unavailable:'Эту страницу не удалось прочитать автоматически. Вакансию всё равно можно заполнить вручную.'
  }
};

function lang(){ return document.documentElement.lang === 'ru' ? 'ru' : 'en'; }
function text(){ return ui[lang()]; }

function installStyles(){
  const style=document.createElement('style');
  style.textContent=`
    .url-autofill-wrap{display:grid;gap:8px}.url-autofill-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}.url-autofill-row input{min-width:0}.autofill-helper{font-size:11px;color:var(--muted);font-weight:500;line-height:1.45}.autofill-status{display:flex;gap:10px;align-items:center;min-height:20px;font-size:11px;font-weight:600;color:var(--muted)}.autofill-status[data-state="success"]{color:var(--positive)}.autofill-status[data-state="warning"]{color:var(--warning)}.autofill-status[data-state="error"]{color:var(--accent)}.autofill-status button{border:0;background:transparent;padding:0;color:inherit;text-decoration:underline;font:inherit;cursor:pointer}.autofill-spinner{width:12px;height:12px;border:2px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:autofill-spin .7s linear infinite}@keyframes autofill-spin{to{transform:rotate(360deg)}}@media(max-width:560px){.url-autofill-row{grid-template-columns:1fr}.url-autofill-row button{width:100%}}
  `;
  document.head.appendChild(style);
}

function setStatus(message='', state='', action=''){
  const el=$('autofillStatus'); if(!el)return;
  el.dataset.state=state;
  el.innerHTML='';
  if(state==='loading'){const spinner=document.createElement('span');spinner.className='autofill-spinner';el.append(spinner)}
  const span=document.createElement('span');span.textContent=message;el.append(span);
  if(action){const button=document.createElement('button');button.type='button';button.textContent=action;button.onclick=openExisting;el.append(button)}
}

function refreshCopy(){
  const c=text();
  const button=$('fillFromLinkBtn'); if(button) button.textContent=c.fill;
  const hint=$('autofillHint'); if(hint) hint.textContent=c.hint;
}

function openExisting(){
  if(!duplicateId)return;
  $('jobDialog')?.close();
  document.querySelector('[data-view-target="pipeline"]')?.click();
  document.querySelector('[data-pipeline-mode="table"]')?.click();
  const search=$('searchInput'); if(search){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}))}
  const status=$('statusFilter'); if(status){status.value='';status.dispatchEvent(new Event('input',{bubbles:true}))}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const target=[...document.querySelectorAll('[data-open-job]')].find(el=>el.dataset.openJob===duplicateId);
    target?.click();
  }));
}

function fillIfBlank(id, value){
  const el=$(id); if(!el || value===undefined || value===null || String(value).trim()==='' || String(el.value||'').trim()!=='') return false;
  el.value=String(value);
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}

async function fillFromLink(){
  const c=text();
  const input=$('url');
  const button=$('fillFromLinkBtn');
  const safe=sanitizeUrl(input?.value);
  if(!safe){setStatus(c.bad,'error');input?.focus();return}
  duplicateId='';
  const isNew=$('deleteJobBtn')?.hidden !== false;
  const existing=isNew ? duplicateOf({url:safe},loadWorkspace().jobs, '') : null;
  if(existing){duplicateId=existing.id;setStatus(`${c.duplicate} ${existing.company} · ${existing.role}`,'warning',c.open);return}
  button.disabled=true;button.setAttribute('aria-busy','true');setStatus(c.loading,'loading');
  try{
    const response=await fetch('/api/parse-vacancy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:safe})});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||!payload.ok) throw new Error(payload.error||c.unavailable);
    const d=payload.data||{};
    input.value=d.url||safe;
    const fields=[['company',d.company],['role',d.role],['source',d.source],['location',d.location],['workMode',d.workMode],['salary',d.salary],['description',d.description]];
    const filled=fields.reduce((n,[id,value])=>n+(fillIfBlank(id,value)?1:0),0);
    const missing=(payload.needsReview||[]).length;
    setStatus(missing?c.partial(filled):c.found(filled),missing?'warning':'success');
    const open=$('openJobLink');if(open){open.href=d.url||safe;open.hidden=false}
  }catch(error){setStatus(error?.message||c.unavailable,'error')}
  finally{button.disabled=false;button.removeAttribute('aria-busy')}
}

function install(){
  document.querySelector('.project-meta')?.remove();
  const input=$('url');
  if(!input||$('fillFromLinkBtn'))return;
  const label=input.closest('label'); if(!label)return;
  label.classList.add('url-autofill-wrap');
  const row=document.createElement('div');row.className='url-autofill-row';
  input.before(row);row.append(input);
  const button=document.createElement('button');button.id='fillFromLinkBtn';button.type='button';button.className='secondary-button compact';button.onclick=fillFromLink;row.append(button);
  const hint=document.createElement('span');hint.id='autofillHint';hint.className='autofill-helper';label.append(hint);
  const status=document.createElement('div');status.id='autofillStatus';status.className='autofill-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');label.append(status);
  input.addEventListener('input',()=>{duplicateId='';setStatus('')});
  input.addEventListener('paste',()=>setTimeout(()=>{if(sanitizeUrl(input.value))setStatus(text().hint)},0));
  refreshCopy();
  new MutationObserver(refreshCopy).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
}

installStyles();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
