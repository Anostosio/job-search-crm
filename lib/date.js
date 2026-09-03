export function uid(){return globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`}
export function localDateKey(date=new Date()){const y=date.getFullYear();const m=String(date.getMonth()+1).padStart(2,'0');const d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`}
export function addLocalDays(days,date=new Date()){const copy=new Date(date.getFullYear(),date.getMonth(),date.getDate());copy.setDate(copy.getDate()+days);return localDateKey(copy)}
export function startOfWeekKey(date=new Date()){const copy=new Date(date.getFullYear(),date.getMonth(),date.getDate());const day=(copy.getDay()+6)%7;copy.setDate(copy.getDate()-day);return localDateKey(copy)}
export function isToday(value,date=new Date()){return value===localDateKey(date)}
export function isOverdue(value,date=new Date()){return Boolean(value)&&value<localDateKey(date)}
export function safeDateLabel(value,locale='en-GB'){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return '';const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString(locale,{day:'2-digit',month:'short'})}
