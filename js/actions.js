import {APP_VERSION,store,statusLabels,effortLabels,repeatLabels,cleanActivity,cleanTask,saveState,migrateState,replaceState,resetState,sanitizeText,uid,todayISO,nextRepeatDate} from './model.js';
import {renderAll,renderMemberSelects} from './render.js';

const $=sel=>document.querySelector(sel);
let toastTimer=null, confirmResolver=null;

export function toast(message){ const el=$('#toast'); if(!el) return; clearTimeout(toastTimer); el.textContent=message; el.classList.add('show'); toastTimer=setTimeout(()=>el.classList.remove('show'),2600); }

export function applyTheme(){ const pref=store.state.settings.theme||'system', dark=pref==='dark'||(pref==='system'&&matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme=dark?'dark':'light'; }
export async function cycleTheme(){ const order=['system','light','dark'], cur=store.state.settings.theme||'system'; store.state.settings.theme=order[(order.indexOf(cur)+1)%order.length]; applyTheme(); await saveState(); toast(`Darstellung: ${store.state.settings.theme==='system'?'System':store.state.settings.theme==='light'?'Hell':'Dunkel'}`); }

export function openActivity(id=''){
  $('#activityForm').reset(); $('#activityId').value=''; $('#activityDate').value=todayISO(); $('#activityEffort').value='medium'; $('#activityStatus').value='done'; $('#activityCategory').value='Sonstiges'; renderMemberSelects(); $('#speechNotice').hidden=true;
  if(id){ const a=store.state.activities.find(x=>x.id===id); if(!a) return; $('#activityDialogTitle').textContent='Eintrag bearbeiten'; $('#activityId').value=a.id; $('#activityTitle').value=a.title; $('#activityDate').value=a.date; $('#activityCategory').value=a.category; $('#activityStatus').value=a.status; $('#activityEffort').value=a.effort; $('#activityMember').value=a.member; $('#activityMinutes').value=a.minutes||''; $('#activityNotes').value=a.notes; }
  else $('#activityDialogTitle').textContent='Eintrag dokumentieren'; $('#activityDialog').showModal(); setTimeout(()=>$('#activityTitle').focus(),20);
}

export function openTask(id=''){
  $('#taskForm').reset(); $('#taskId').value=''; $('#taskPriority').value='normal'; $('#taskEffort').value='medium'; $('#taskRepeat').value='none'; $('#taskCategory').value='Sonstiges'; renderMemberSelects();
  if(id){ const t=store.state.tasks.find(x=>x.id===id); if(!t) return; $('#taskDialogTitle').textContent='Aufgabe bearbeiten'; $('#taskId').value=t.id; $('#taskTitle').value=t.title; $('#taskDueDate').value=t.dueDate; $('#taskCategory').value=t.category; $('#taskPriority').value=t.priority; $('#taskMember').value=t.member; $('#taskEffort').value=t.effort; $('#taskRepeat').value=t.repeat; $('#taskNotes').value=t.notes; }
  else $('#taskDialogTitle').textContent='Aufgabe anlegen'; $('#taskDialog').showModal(); setTimeout(()=>$('#taskTitle').focus(),20);
}

export async function saveActivityFromForm(){
  const id=$('#activityId').value, old=id?store.state.activities.find(x=>x.id===id):null;
  const item=cleanActivity({id:id||uid('a'),title:$('#activityTitle').value,date:$('#activityDate').value,category:$('#activityCategory').value,status:$('#activityStatus').value,effort:$('#activityEffort').value,member:$('#activityMember').value,minutes:Number($('#activityMinutes').value||0),notes:$('#activityNotes').value,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});
  if(!item.title){ toast('Bitte eine Tätigkeit eintragen.'); return false; }
  if(id) store.state.activities=store.state.activities.map(x=>x.id===id?item:x); else store.state.activities.push(item);
  if(!await saveState()) toast('Speichern fehlgeschlagen. Bitte Sicherung exportieren.'); renderAll(); toast(id?'Eintrag aktualisiert.':'Eintrag gespeichert.'); return true;
}

export async function saveTaskFromForm(){
  const id=$('#taskId').value, old=id?store.state.tasks.find(x=>x.id===id):null;
  const item=cleanTask({id:id||uid('t'),title:$('#taskTitle').value,dueDate:$('#taskDueDate').value,category:$('#taskCategory').value,priority:$('#taskPriority').value,member:$('#taskMember').value,effort:$('#taskEffort').value,repeat:$('#taskRepeat').value,notes:$('#taskNotes').value,done:old?.done||false,completedAt:old?.completedAt||'',createdAt:old?.createdAt||new Date().toISOString()});
  if(!item.title){ toast('Bitte eine Aufgabe eintragen.'); return false; }
  if(id) store.state.tasks=store.state.tasks.map(x=>x.id===id?item:x); else store.state.tasks.push(item);
  if(!await saveState()) toast('Speichern fehlgeschlagen. Bitte Sicherung exportieren.'); renderAll(); toast(id?'Aufgabe aktualisiert.':'Aufgabe gespeichert.'); return true;
}

export async function toggleTask(id,checked){
  const t=store.state.tasks.find(x=>x.id===id); if(!t) return; t.done=checked; t.completedAt=checked?new Date().toISOString():'';
  if(checked&&t.repeat!=='none') store.state.tasks.push(cleanTask({...t,id:uid('t'),done:false,completedAt:'',dueDate:nextRepeatDate(t.dueDate||todayISO(),t.repeat),createdAt:new Date().toISOString()}));
  await saveState(); renderAll(); toast(checked?'Aufgabe erledigt.':'Aufgabe wieder geöffnet.');
}

export function confirmAction(title,text,okLabel='Bestätigen'){ $('#confirmTitle').textContent=title; $('#confirmText').textContent=text; $('#confirmOk').textContent=okLabel; $('#confirmDialog').showModal(); return new Promise(resolve=>{confirmResolver=resolve;}); }
export function resolveConfirm(){ if(confirmResolver){ const resolve=confirmResolver; confirmResolver=null; resolve($('#confirmDialog').returnValue==='default'); } }

export async function deleteActivity(id){ const a=store.state.activities.find(x=>x.id===id); if(a&&await confirmAction('Eintrag löschen',`„${a.title}“ wirklich löschen?`,'Löschen')){ store.state.activities=store.state.activities.filter(x=>x.id!==id); await saveState(); renderAll(); toast('Eintrag gelöscht.'); } }
export async function deleteTask(id){ const t=store.state.tasks.find(x=>x.id===id); if(t&&await confirmAction('Aufgabe löschen',`„${t.title}“ wirklich löschen?`,'Löschen')){ store.state.tasks=store.state.tasks.filter(x=>x.id!==id); await saveState(); renderAll(); toast('Aufgabe gelöscht.'); } }

function download(filename,content,type='application/octet-stream'){ const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
function csvEscape(v){ const s=String(v??''); return /[";\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
export function exportJson(){ download(`home-manager-backup-${todayISO()}.json`,JSON.stringify({format:'home-manager-backup',exportedAt:new Date().toISOString(),version:APP_VERSION,data:store.state},null,2),'application/json;charset=utf-8'); toast('JSON-Sicherung erstellt.'); }
export function exportActivitiesCsv(){ const rows=[['Datum','Tätigkeit','Kategorie','Status','Aufwand','Person','Dauer Minuten','Notiz'],...store.state.activities.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(a=>[a.date,a.title,a.category,statusLabels[a.status],effortLabels[a.effort],a.member,a.minutes||'',a.notes])]; download(`home-manager-protokoll-${todayISO()}.csv`,'\ufeff'+rows.map(r=>r.map(csvEscape).join(';')).join('\r\n'),'text/csv;charset=utf-8'); toast('CSV exportiert.'); }
export function exportTasksCsv(){ const rows=[['Aufgabe','Fällig','Kategorie','Priorität','Aufwand','Person','Wiederholung','Status','Notiz'],...store.state.tasks.map(t=>[t.title,t.dueDate,t.category,t.priority,effortLabels[t.effort],t.member,repeatLabels[t.repeat],t.done?'Erledigt':'Offen',t.notes])]; download(`home-manager-aufgaben-${todayISO()}.csv`,'\ufeff'+rows.map(r=>r.map(csvEscape).join(';')).join('\r\n'),'text/csv;charset=utf-8'); toast('CSV exportiert.'); }

export async function importJson(file){
  try{
    if(file.size>5_000_000) throw new Error('Datei ist zu groß.'); const payload=JSON.parse(await file.text()); if(payload?.format!=='home-manager-backup'||!payload.data) throw new Error('Keine gültige Home-Manager-Sicherung.');
    const imported=migrateState(payload.data); if(!await confirmAction('Sicherung importieren','„Bestätigen“ ersetzt die aktuell lokalen Daten durch die ausgewählte Sicherung. Vorher ggf. selbst exportieren.','Importieren')) return;
    replaceState(imported); await saveState(); applyTheme(); renderAll(); toast('Sicherung importiert.');
  }catch(err){ toast(err.message||'Import fehlgeschlagen.'); } finally{ $('#importFile').value=''; }
}

export async function resetData(){ if(!await confirmAction('Lokale Daten löschen','Alle Protokolle, Aufgaben und lokalen Einstellungen auf diesem Gerät werden gelöscht. Dieser Schritt kann nicht rückgängig gemacht werden.','Alles löschen')) return; resetState(); await saveState(); applyTheme(); renderAll(); toast('Lokale Daten wurden gelöscht.'); }

export async function saveSettings(){
  const members=$('#membersInput').value.split(/\r?\n/).map(x=>sanitizeText(x,40)).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).slice(0,20);
  let green=Number($('#greenThreshold').value),orange=Number($('#orangeThreshold').value); if(orange>=green){orange=Math.max(10,green-5);$('#orangeThreshold').value=orange;}
  store.state.settings.householdName=sanitizeText($('#householdName').value,60); store.state.settings.members=members; store.state.settings.greenThreshold=green; store.state.settings.orangeThreshold=orange;
  store.state.settings.weights={small:Math.min(10,Math.max(1,Number($('#weightSmall').value)||1)),medium:Math.min(10,Math.max(1,Number($('#weightMedium').value)||2)),large:Math.min(10,Math.max(1,Number($('#weightLarge').value)||3))};
  await saveState(); renderAll(); toast('Einstellungen gespeichert.');
}

export function startSpeech(targetId,button){
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition; $('#speechNotice').hidden=false; if(!SpeechRecognition){toast('Spracheingabe wird von diesem Browser nicht unterstützt.');return;}
  try{ const r=new SpeechRecognition(); r.lang='de-DE'; r.interimResults=false; r.maxAlternatives=1; button.classList.add('listening');
    r.onresult=e=>{ const transcript=e.results?.[0]?.[0]?.transcript||'', target=$(`#${targetId}`); if(target){target.value=(target.value?target.value+' ':'')+transcript;target.dispatchEvent(new Event('input',{bubbles:true}));} };
    r.onerror=e=>toast(e.error==='not-allowed'?'Mikrofonzugriff wurde nicht erlaubt.':'Spracheingabe fehlgeschlagen.'); r.onend=()=>button.classList.remove('listening'); r.start();
  }catch{button.classList.remove('listening');toast('Spracheingabe konnte nicht gestartet werden.');}
}
