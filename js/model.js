export const APP_VERSION = 1;
const DB_NAME = 'home-manager-local';
const STORE = 'kv';
const STATE_KEY = 'state';

export const categories = ['Küche','Bad','Wohnbereich','Schlafbereich','Wäsche','Müll & Recycling','Einkauf','Aufräumen','Reinigung','Außenbereich','Organisation','Pflege & Wartung','Sonstiges'];
export const statusLabels = { done:'Erledigt', partial:'Teilweise', missed:'Nicht erledigt' };
export const effortLabels = { small:'Klein', medium:'Normal', large:'Groß' };
export const repeatLabels = { none:'Keine', daily:'Täglich', weekly:'Wöchentlich', monthly:'Monatlich' };

export const store = { db:null, state:defaultState() };

export function defaultState(){
  return {
    version: APP_VERSION,
    settings: { householdName:'', members:[], theme:'system', greenThreshold:75, orangeThreshold:45, weights:{small:1,medium:2,large:3} },
    activities: [], tasks: []
  };
}

export function uid(prefix='id'){
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;
}

export function todayISO(){
  const d=new Date();
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
}

export function formatDate(dateStr){
  if(!dateStr) return '—';
  const [y,m,d]=dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(y,m-1,d));
}

export function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

export function sanitizeText(value,max=1000){
  return String(value??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,max);
}

async function openDB(){
  if(!window.indexedDB) return null;
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

export function cleanActivity(a){
  if(!a||typeof a!=='object') return null;
  const status=['done','partial','missed'].includes(a.status)?a.status:'done';
  const effort=['small','medium','large'].includes(a.effort)?a.effort:'medium';
  return {
    id:sanitizeText(a.id||uid('a'),80), title:sanitizeText(a.title,120),
    date:/^\d{4}-\d{2}-\d{2}$/.test(a.date||'')?a.date:todayISO(),
    category:categories.includes(a.category)?a.category:'Sonstiges', status, effort,
    member:sanitizeText(a.member,40), notes:sanitizeText(a.notes,1000),
    minutes:Number.isFinite(Number(a.minutes))?Math.min(1440,Math.max(0,Number(a.minutes))):0,
    createdAt:sanitizeText(a.createdAt||new Date().toISOString(),40), updatedAt:sanitizeText(a.updatedAt||'',40)
  };
}

export function cleanTask(t){
  if(!t||typeof t!=='object') return null;
  return {
    id:sanitizeText(t.id||uid('t'),80), title:sanitizeText(t.title,120),
    dueDate:/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate||'')?t.dueDate:'',
    category:categories.includes(t.category)?t.category:'Sonstiges',
    priority:['low','normal','high'].includes(t.priority)?t.priority:'normal',
    member:sanitizeText(t.member,40), effort:['small','medium','large'].includes(t.effort)?t.effort:'medium',
    repeat:['none','daily','weekly','monthly'].includes(t.repeat)?t.repeat:'none', notes:sanitizeText(t.notes,1000),
    done:Boolean(t.done), completedAt:sanitizeText(t.completedAt||'',40), createdAt:sanitizeText(t.createdAt||new Date().toISOString(),40)
  };
}

export function migrateState(input){
  const base=defaultState();
  if(!input||typeof input!=='object') return base;
  return {
    version:APP_VERSION,
    settings:{...base.settings,...(input.settings||{}),weights:{...base.settings.weights,...(input.settings?.weights||{})},members:Array.isArray(input.settings?.members)?input.settings.members.map(x=>sanitizeText(x,40)).filter(Boolean).slice(0,20):[]},
    activities:Array.isArray(input.activities)?input.activities.map(cleanActivity).filter(Boolean).slice(-10000):[],
    tasks:Array.isArray(input.tasks)?input.tasks.map(cleanTask).filter(Boolean).slice(-10000):[]
  };
}

export async function loadState(){
  try{
    store.db=await openDB();
    if(store.db){
      const stored=await new Promise((resolve,reject)=>{
        const req=store.db.transaction(STORE,'readonly').objectStore(STORE).get(STATE_KEY);
        req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
      });
      if(stored) store.state=migrateState(stored);
    }else{
      const raw=localStorage.getItem('homeManagerState');
      if(raw) store.state=migrateState(JSON.parse(raw));
    }
  }catch(err){ console.error('State load failed',err); }
}

export async function saveState(){
  store.state.version=APP_VERSION;
  try{
    if(store.db){
      await new Promise((resolve,reject)=>{
        const tx=store.db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(store.state,STATE_KEY);
        tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
      });
    }else localStorage.setItem('homeManagerState',JSON.stringify(store.state));
    return true;
  }catch(err){ console.error('State save failed',err); return false; }
}

export function replaceState(next){ store.state=migrateState(next); }
export function resetState(){ store.state=defaultState(); }

export function weightFor(effort){ return Number(store.state.settings.weights[effort]||1); }
export function daysAgoISO(days){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-days); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
export function inRange(dateStr,days){ return days==='all'||dateStr>=daysAgoISO(Number(days)-1); }
export function activityPoints(items){ return items.reduce((sum,a)=>sum+weightFor(a.effort),0); }
export function completedPoints(items){ return items.reduce((sum,a)=>sum+weightFor(a.effort)*(a.status==='done'?1:a.status==='partial'?.5:0),0); }
export function trafficFor(items){
  const total=activityPoints(items); if(!total) return {level:'neutral',label:'Noch offen',ratio:0};
  const ratio=Math.round(completedPoints(items)/total*100), g=Number(store.state.settings.greenThreshold), o=Number(store.state.settings.orangeThreshold);
  return ratio>=g?{level:'green',label:'Grün',ratio}:ratio>=o?{level:'orange',label:'Orange',ratio}:{level:'red',label:'Rot',ratio};
}

export function nextRepeatDate(dateStr,repeat){
  if(!dateStr||repeat==='none') return '';
  const [y,m,d]=dateStr.split('-').map(Number), dt=new Date(y,m-1,d);
  if(repeat==='daily') dt.setDate(dt.getDate()+1); if(repeat==='weekly') dt.setDate(dt.getDate()+7); if(repeat==='monthly') dt.setMonth(dt.getMonth()+1);
  return new Date(dt.getTime()-dt.getTimezoneOffset()*60000).toISOString().slice(0,10);
}
