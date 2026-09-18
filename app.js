import {store,loadState,saveState} from './js/model.js';
import {populateCategorySelects,renderAll,renderActivities,renderTasks,renderReports,navTo,setTaskFilter} from './js/render.js';
import {applyTheme,cycleTheme,openActivity,openTask,saveActivityFromForm,saveTaskFromForm,toggleTask,deleteActivity,deleteTask,resolveConfirm,exportJson,exportActivitiesCsv,exportTasksCsv,importJson,resetData,saveSettings,startSpeech} from './js/actions.js';

const $=sel=>document.querySelector(sel), $$=sel=>[...document.querySelectorAll(sel)];
let deferredInstallPrompt=null;

function bindEvents(){
  $$('.tab').forEach(t=>t.addEventListener('click',()=>navTo(t.dataset.view))); $$('[data-nav]').forEach(b=>b.addEventListener('click',()=>navTo(b.dataset.nav)));
  $('#themeBtn').addEventListener('click',cycleTheme); ['#quickAddBtn','#heroAddBtn','#addActivityBtn'].forEach(id=>$(id).addEventListener('click',()=>openActivity())); $('#addTaskBtn').addEventListener('click',()=>openTask());
  $$('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  $('#activityForm').addEventListener('submit',async e=>{e.preventDefault();if(await saveActivityFromForm())$('#activityDialog').close();}); $('#taskForm').addEventListener('submit',async e=>{e.preventDefault();if(await saveTaskFromForm())$('#taskDialog').close();});
  ['input','change'].forEach(evt=>$('#activitySearch').addEventListener(evt,renderActivities)); $('#activityStatusFilter').addEventListener('change',renderActivities); $('#activityRangeFilter').addEventListener('change',renderActivities);
  $('#activityTableBody').addEventListener('click',e=>{const edit=e.target.closest('.edit-activity'),del=e.target.closest('.delete-activity');if(edit)openActivity(edit.dataset.id);if(del)deleteActivity(del.dataset.id);});
  $$('.seg').forEach(b=>b.addEventListener('click',()=>{setTaskFilter(b.dataset.taskFilter);$$('.seg').forEach(x=>x.classList.toggle('active',x===b));renderTasks();}));
  $('#taskList').addEventListener('change',e=>{const c=e.target.closest('.task-check');if(c)toggleTask(c.dataset.id,c.checked);}); $('#taskList').addEventListener('click',e=>{const edit=e.target.closest('.edit-task'),del=e.target.closest('.delete-task');if(edit)openTask(edit.dataset.id);if(del)deleteTask(del.dataset.id);});
  $('#reportRange').addEventListener('change',renderReports); $('#reportMember').addEventListener('change',renderReports); $('#printReportBtn').addEventListener('click',()=>window.print());
  $('#exportJsonBtn').addEventListener('click',exportJson); $('#exportActivitiesCsvBtn').addEventListener('click',exportActivitiesCsv); $('#exportTasksCsvBtn').addEventListener('click',exportTasksCsv); $('#importFile').addEventListener('change',e=>{if(e.target.files[0])importJson(e.target.files[0]);}); $('#resetDataBtn').addEventListener('click',resetData);
  $('#greenThreshold').addEventListener('input',e=>$('#greenThresholdOut').textContent=`${e.target.value}%`); $('#orangeThreshold').addEventListener('input',e=>$('#orangeThresholdOut').textContent=`${e.target.value}%`); $('#saveSettingsBtn').addEventListener('click',saveSettings);
  $('#activityVoiceBtn').addEventListener('click',e=>startSpeech('activityTitle',e.currentTarget)); $('#activityNotesVoiceBtn').addEventListener('click',e=>startSpeech('activityNotes',e.currentTarget)); $('#confirmDialog').addEventListener('close',resolveConfirm);
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('#installBtn').hidden=false;}); $('#installBtn').addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('#installBtn').hidden=true;});
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(store.state.settings.theme==='system')applyTheme();});
}

async function init(){
  populateCategorySelects(); await loadState(); applyTheme(); bindEvents(); renderAll();
  if('serviceWorker'in navigator) navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service worker registration failed',err));
}

document.addEventListener('DOMContentLoaded',init);
