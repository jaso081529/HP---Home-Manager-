import {store,categories,statusLabels,effortLabels,repeatLabels,formatDate,escapeHtml,todayISO,inRange,activityPoints,completedPoints,trafficFor} from './model.js';

const $=(sel,root=document)=>root.querySelector(sel);
const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
let taskFilter='open';

export function setTaskFilter(value){ taskFilter=value; }
export function getTaskFilter(){ return taskFilter; }

export function navTo(view){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===view));
  $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===view));
  window.scrollTo({top:0,behavior:'smooth'});
  if(view==='reports') renderReports();
}

export function statusHtml(status){ return `<span class="status"><span class="dot ${status}"></span>${escapeHtml(statusLabels[status]||status)}</span>`; }

export function renderMemberSelects(){
  const members=store.state.settings.members, ac=$('#activityMember')?.value||'', tc=$('#taskMember')?.value||'', rc=$('#reportMember')?.value||'all';
  const opts='<option value="">Nicht zugeordnet</option>'+members.map(m=>`<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
  if($('#activityMember')){ $('#activityMember').innerHTML=opts; if(members.includes(ac)) $('#activityMember').value=ac; }
  if($('#taskMember')){ $('#taskMember').innerHTML=opts; if(members.includes(tc)) $('#taskMember').value=tc; }
  if($('#reportMember')){ $('#reportMember').innerHTML='<option value="all">Alle</option>'+members.map(m=>`<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join(''); if(rc==='all'||members.includes(rc)) $('#reportMember').value=rc; }
}

export function populateCategorySelects(){
  const html=categories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  $('#activityCategory').innerHTML=html; $('#taskCategory').innerHTML=html;
}

export function renderSettings(){
  $('#householdName').value=store.state.settings.householdName||''; $('#membersInput').value=(store.state.settings.members||[]).join('\n');
  $('#greenThreshold').value=store.state.settings.greenThreshold; $('#greenThresholdOut').textContent=`${store.state.settings.greenThreshold}%`;
  $('#orangeThreshold').value=store.state.settings.orangeThreshold; $('#orangeThresholdOut').textContent=`${store.state.settings.orangeThreshold}%`;
  $('#weightSmall').value=store.state.settings.weights.small; $('#weightMedium').value=store.state.settings.weights.medium; $('#weightLarge').value=store.state.settings.weights.large;
}

export function renderDashboard(){
  const today=todayISO(), todayItems=store.state.activities.filter(a=>a.date===today), weekItems=store.state.activities.filter(a=>inRange(a.date,7)), openTasks=store.state.tasks.filter(t=>!t.done);
  const stats=[
    ['Heute dokumentiert',todayItems.length,'Einträge'],
    ['Heute erledigt',todayItems.filter(a=>a.status==='done').length,`${completedPoints(todayItems).toFixed(1).replace('.0','')} Punkte`],
    ['7 Tage',weekItems.length,'protokollierte Tätigkeiten'],
    ['Offene Aufgaben',openTasks.length,openTasks.filter(t=>t.dueDate&&t.dueDate<today).length+' überfällig']
  ];
  $('#statGrid').innerHTML=stats.map(([l,v,n])=>`<div class="stat"><div class="stat-label">${escapeHtml(l)}</div><div class="stat-value">${escapeHtml(v)}</div><div class="stat-note">${escapeHtml(n)}</div></div>`).join('');
  const traffic=trafficFor(weekItems); $('#weekTraffic').className=`traffic-pill ${traffic.level}`; $('#weekTraffic').textContent=traffic.level==='neutral'?'Noch keine Daten':`${traffic.label} · ${traffic.ratio}%`;
  $('#weekTrafficHint').textContent=weekItems.length?'Gewichtet nach Aufwandspunkten; teilweise erledigt zählt zur Hälfte.':'Sobald Tätigkeiten erfasst werden, entsteht hier eine nachvollziehbare 7-Tage-Auswertung.';
  const grouped={done:0,partial:0,missed:0}; weekItems.forEach(a=>grouped[a.status]++); const max=Math.max(1,...Object.values(grouped));
  $('#weekProgress').innerHTML=['done','partial','missed'].map(k=>`<div class="progress-row"><span>${statusLabels[k]}</span><div class="progress-track"><div class="progress-fill" style="width:${grouped[k]/max*100}%"></div></div><strong>${grouped[k]}</strong></div>`).join('');
  const next=openTasks.slice().sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).slice(0,5);
  $('#nextTasks').innerHTML=next.length?next.map(t=>`<div class="list-item"><div class="list-main"><div class="list-title">${escapeHtml(t.title)}</div><div class="list-meta">${escapeHtml(t.category)}${t.dueDate?' · '+formatDate(t.dueDate):''}</div></div><span class="chip ${t.dueDate&&t.dueDate<today?'overdue':''}">${escapeHtml(effortLabels[t.effort])}</span></div>`).join(''):'<div class="empty">Keine offenen Aufgaben.</div>';
  const recent=store.state.activities.slice().sort((a,b)=>(b.date+b.createdAt).localeCompare(a.date+a.createdAt)).slice(0,6);
  $('#recentActivities').innerHTML=recent.length?recent.map(a=>`<div class="list-item"><div class="list-main"><div class="list-title">${escapeHtml(a.title)}</div><div class="list-meta">${formatDate(a.date)} · ${escapeHtml(a.category)} · ${escapeHtml(effortLabels[a.effort])}${a.member?' · '+escapeHtml(a.member):''}</div></div>${statusHtml(a.status)}</div>`).join(''):'<div class="empty">Noch keine Einträge. Mit „Eintrag dokumentieren“ geht es los.</div>';
}

function filteredActivities(){
  const q=$('#activitySearch').value.trim().toLowerCase(), status=$('#activityStatusFilter').value, range=$('#activityRangeFilter').value;
  return store.state.activities.filter(a=>inRange(a.date,range)&&(status==='all'||a.status===status)&&(!q||[a.title,a.category,a.member,a.notes].join(' ').toLowerCase().includes(q))).sort((a,b)=>(b.date+b.createdAt).localeCompare(a.date+a.createdAt));
}

export function renderActivities(){
  const items=filteredActivities();
  $('#activityTableBody').innerHTML=items.map(a=>`<tr><td>${formatDate(a.date)}</td><td><strong>${escapeHtml(a.title)}</strong>${a.notes?`<div class="small muted">${escapeHtml(a.notes)}</div>`:''}</td><td>${escapeHtml(a.category)}</td><td>${escapeHtml(effortLabels[a.effort])}${a.minutes?`<div class="small muted">${a.minutes} Min.</div>`:''}</td><td>${statusHtml(a.status)}</td><td>${escapeHtml(a.member||'—')}</td><td><div class="row-actions"><button class="mini-btn edit-activity" data-id="${escapeHtml(a.id)}" title="Bearbeiten">✎</button><button class="mini-btn delete-activity" data-id="${escapeHtml(a.id)}" title="Löschen">⌫</button></div></td></tr>`).join('');
  $('#activityEmpty').hidden=items.length>0; if(!items.length){ $('#activityEmpty').hidden=false; $('#activityEmpty').textContent='Keine passenden Einträge gefunden.'; }
}

export function renderTasks(){
  const today=todayISO(); let items=store.state.tasks.slice();
  if(taskFilter==='open') items=items.filter(t=>!t.done); if(taskFilter==='today') items=items.filter(t=>!t.done&&t.dueDate===today); if(taskFilter==='overdue') items=items.filter(t=>!t.done&&t.dueDate&&t.dueDate<today); if(taskFilter==='done') items=items.filter(t=>t.done);
  items.sort((a,b)=>Number(a.done)-Number(b.done)||({high:0,normal:1,low:2}[a.priority]-({high:0,normal:1,low:2}[b.priority]))||(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
  $('#taskList').innerHTML=items.length?items.map(t=>{ const overdue=!t.done&&t.dueDate&&t.dueDate<today; return `<article class="task-card ${t.done?'done':''}"><input class="task-check" type="checkbox" data-id="${escapeHtml(t.id)}" ${t.done?'checked':''} aria-label="${t.done?'Als offen markieren':'Als erledigt markieren'}"><div><div class="task-title">${escapeHtml(t.title)}</div><div class="task-meta"><span class="chip">${escapeHtml(t.category)}</span><span class="chip">${escapeHtml(effortLabels[t.effort])}</span>${t.member?`<span class="chip">${escapeHtml(t.member)}</span>`:''}${t.dueDate?`<span class="chip ${overdue?'overdue':''}">${overdue?'Überfällig · ':''}${formatDate(t.dueDate)}</span>`:''}${t.priority==='high'?'<span class="chip high">Hohe Priorität</span>':''}${t.repeat!=='none'?`<span class="chip">↻ ${escapeHtml(repeatLabels[t.repeat])}</span>`:''}</div>${t.notes?`<div class="small muted" style="margin-top:8px">${escapeHtml(t.notes)}</div>`:''}</div><div class="row-actions"><button class="mini-btn edit-task" data-id="${escapeHtml(t.id)}" title="Bearbeiten">✎</button><button class="mini-btn delete-task" data-id="${escapeHtml(t.id)}" title="Löschen">⌫</button></div></article>`; }).join(''):'<div class="card empty">Keine Aufgaben in dieser Ansicht.</div>';
}

function reportItems(){ const range=$('#reportRange')?.value||'30', member=$('#reportMember')?.value||'all'; return store.state.activities.filter(a=>inRange(a.date,range)&&(member==='all'||a.member===member)).sort((a,b)=>b.date.localeCompare(a.date)); }
function renderBarChart(sel,entries){ const max=Math.max(1,...entries.map(x=>x[1])); $(sel).innerHTML=entries.length?entries.map(([label,val])=>`<div class="bar-row"><div class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${val/max*100}%"></div></div><div class="bar-value">${val}</div></div>`).join(''):'<div class="empty">Noch keine Daten.</div>'; }

export function renderReports(){
  const items=reportItems(), traffic=trafficFor(items), totalPoints=activityPoints(items), donePoints=completedPoints(items), minutes=items.reduce((s,a)=>s+(Number(a.minutes)||0),0);
  const stats=[['Einträge',items.length,'im Zeitraum'],['Aufwandspunkte',totalPoints,'gesamt'],['Erledigt',`${donePoints.toFixed(1).replace('.0','')} / ${totalPoints}`,traffic.level==='neutral'?'keine Bewertung':`${traffic.label} · ${traffic.ratio}%`],['Dokumentierte Zeit',minutes?`${Math.round(minutes/60*10)/10} h`:'—',minutes?'nur freiwillige Angaben':'keine Pflichtangabe']];
  $('#reportStats').innerHTML=stats.map(([l,v,n])=>`<div class="stat"><div class="stat-label">${escapeHtml(l)}</div><div class="stat-value">${escapeHtml(v)}</div><div class="stat-note">${escapeHtml(n)}</div></div>`).join('');
  const sc={done:0,partial:0,missed:0}; items.forEach(a=>sc[a.status]++); renderBarChart('#statusChart',Object.entries(sc).map(([k,v])=>[statusLabels[k],v]));
  const cats={}; items.forEach(a=>cats[a.category]=(cats[a.category]||0)+1); renderBarChart('#categoryChart',Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,10));
  $('#reportTableBody').innerHTML=items.length?items.map(a=>`<tr><td>${formatDate(a.date)}</td><td>${escapeHtml(a.title)}</td><td>${escapeHtml(a.category)}</td><td>${escapeHtml(effortLabels[a.effort])}</td><td>${escapeHtml(statusLabels[a.status])}</td><td>${escapeHtml(a.member||'—')}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">Keine Einträge im ausgewählten Zeitraum.</td></tr>';
  $('#printMeta').textContent=`Erstellt am ${new Intl.DateTimeFormat('de-DE',{dateStyle:'long'}).format(new Date())} · ${store.state.settings.householdName||'lokale Auswertung'}`;
}

export function renderAll(){ renderMemberSelects(); renderDashboard(); renderActivities(); renderTasks(); renderReports(); renderSettings(); }
