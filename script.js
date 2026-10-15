/* ═══════════════════════════════════════
   STATE & PERSISTENCE (localStorage)
═══════════════════════════════════════ */
const SK = 'habitgrid_mobile_v1';

function loadState(){
  try{ const r=localStorage.getItem(SK); if(r) return JSON.parse(r); }catch(e){}
  return { habits:[], records:{} };
}
function saveState(){
  try{ localStorage.setItem(SK, JSON.stringify(state)); }catch(e){}
}
let state = loadState();

/* ═══════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════ */
const EMOJIS=['⏰','🚭','🔕','💰','📱','🎯','📚','🚿','💻','🧘','🏃','💪','✍️','🥗','💧','😴','🧹','🎸','🌿','☕','🏋️','🧠','💊','🌞','🛏️','📝','🎵','🔥','🚶','🍺'];
const COLORS=['#4F6EF7','#16A34A','#DC2626','#D97706','#7C3AED','#EC4899','#0891B2','#059669','#EA580C','#4F46E5','#0D9488','#CA8A04'];
const MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

let curTab='dash';
let viewYear=new Date().getFullYear();
let viewMonth=new Date().getMonth();
let selEmoji=EMOJIS[0], selColor=COLORS[0];
let editingId=null;
let selectedCalDay=null;
let pendingDeleteId=null;

/* ═══════════════════════════════════════
   DATE UTILS
═══════════════════════════════════════ */
function todayKey(){ return fmtD(new Date()); }
function fmtD(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function pad(n){ return String(n).padStart(2,'0'); }
function isFuture(k){ return k > todayKey(); }
function isToday(k){ return k === todayKey(); }

function monthDays(y,m){
  const out=[], total=new Date(y,m+1,0).getDate();
  for(let d=1;d<=total;d++){
    const dt=new Date(y,m,d);
    out.push({ key:fmtD(dt), day:d, wd:dt.getDay(), date:dt });
  }
  return out;
}

/* ═══════════════════════════════════════
   SCORE HELPERS
═══════════════════════════════════════ */
function dayScore(key){
  if(!state.habits.length) return {done:0,total:0,pct:0};
  const rec=state.records[key]||{}, total=state.habits.length;
  const done=state.habits.filter(h=>rec[h.id]).length;
  return {done,total,pct:total?Math.round(done/total*100):0};
}

function habitStreak(hid){
  let s=0; const now=new Date(); now.setHours(0,0,0,0);
  for(let i=0;i<366;i++){
    const d=new Date(now); d.setDate(now.getDate()-i);
    const k=fmtD(d);
    if(state.records[k]&&state.records[k][hid]) s++;
    else break;
  }
  return s;
}

function overallStreak(){
  if(!state.habits.length) return 0;
  let s=0; const now=new Date(); now.setHours(0,0,0,0);
  for(let i=0;i<366;i++){
    const d=new Date(now); d.setDate(now.getDate()-i);
    if(dayScore(fmtD(d)).pct>=50) s++;
    else break;
  }
  return s;
}

function monthPct(y,m){
  const days=monthDays(y,m).filter(d=>!isFuture(d.key));
  if(!days.length||!state.habits.length) return 0;
  const sum=days.reduce((s,d)=>s+dayScore(d.key).pct,0);
  return Math.round(sum/days.length);
}

function habitCompletion(hid, days){
  return days.filter(d=>!isFuture(d.key)&&state.records[d.key]&&state.records[d.key][hid]).length;
}

/* ═══════════════════════════════════════
   TOGGLE
═══════════════════════════════════════ */
function toggle(hid, key){
  if(isFuture(key)) return;
  if(!state.records[key]) state.records[key]={};
  const was=!!state.records[key][hid];
  state.records[key][hid]=!was;
  if(!state.records[key][hid]) delete state.records[key][hid];
  saveState();
  if(!was && isToday(key)){
    const sc=dayScore(key);
    if(sc.done===sc.total&&sc.total>0){launchConfetti();toast('🏆 Perfect day!');}
  }
  renderCurrent();
  // re-render day detail if open
  if(selectedCalDay===key) showDayDetail(key);
}

/* ═══════════════════════════════════════
   NAV
═══════════════════════════════════════ */
function switchTab(tab){
  curTab=tab;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+tab).classList.add('active');
  document.querySelectorAll('.bnav-item').forEach(b=>{
    b.classList.toggle('active', b.dataset.tab===tab);
  });
  renderCurrent();
}

function renderCurrent(){
  if(curTab==='dash') renderDash();
  else if(curTab==='history') renderHistory();
  else if(curTab==='analysis') renderAnalysis();
  else if(curTab==='settings') renderSettings();
}

/* ═══════════════════════════════════════
   DASHBOARD RENDER
═══════════════════════════════════════ */
function renderDash(){
  const now=new Date();
  const tk=todayKey();
  const sc=dayScore(tk);
  const streak=overallStreak();
  const mPct=monthPct(now.getFullYear(),now.getMonth());
  const hr=now.getHours();
  const greeting=hr<12?'Good morning! 🌅':hr<17?'Good afternoon! ☀️':'Good evening! 🌙';

  // Header date
  document.getElementById('headerDate').textContent=now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

  // Ring
  const circ=226.2, off=circ-(circ*sc.pct/100);
  const col=sc.pct>=90?'#16A34A':sc.pct>=60?'#4F6EF7':sc.pct>=30?'#D97706':'#DC2626';
  const rf=document.getElementById('heroRingFill');
  rf.style.stroke=col;
  setTimeout(()=>{rf.style.strokeDashoffset=off;},50);
  document.getElementById('heroPct').textContent=sc.pct+'%';
  document.getElementById('heroTitle').textContent=greeting;
  document.getElementById('heroRows').innerHTML=`
    <div class="hero-row"><span>Completed</span><strong style="color:#16A34A">${sc.done}/${sc.total}</strong></div>
    <div class="hero-row"><span>Streak</span><strong style="color:#D97706">🔥 ${streak}d</strong></div>
    <div class="hero-row"><span>This month</span><strong style="color:#4F6EF7">${mPct}%</strong></div>
  `;

  // Stat tiles
  const totalDone=Object.values(state.records).reduce((a,r)=>a+Object.values(r).filter(Boolean).length,0);
  const perfDays=state.habits.length>0?Object.keys(state.records).filter(k=>dayScore(k).pct===100).length:0;
  document.getElementById('dashStats').innerHTML=`
    <div class="stat-tile fade-up">
      <div class="st-icon" style="background:rgba(79,110,247,.12)">📋</div>
      <div><div class="st-val" style="color:#4F6EF7">${state.habits.length}</div><div class="st-lbl">Habits</div></div>
    </div>
    <div class="stat-tile fade-up" style="animation-delay:.05s">
      <div class="st-icon" style="background:rgba(217,119,6,.12)">🔥</div>
      <div><div class="st-val" style="color:#D97706">${streak}</div><div class="st-lbl">Day Streak</div></div>
    </div>
    <div class="stat-tile fade-up" style="animation-delay:.1s">
      <div class="st-icon" style="background:rgba(22,163,74,.12)">✅</div>
      <div><div class="st-val" style="color:#16A34A">${totalDone}</div><div class="st-lbl">All-time</div></div>
    </div>
    <div class="stat-tile fade-up" style="animation-delay:.15s">
      <div class="st-icon" style="background:rgba(124,58,237,.12)">⭐</div>
      <div><div class="st-val" style="color:#7C3AED">${perfDays}</div><div class="st-lbl">Perfect Days</div></div>
    </div>
  `;

  // Week dots
  const today=new Date(); today.setHours(0,0,0,0);
  const dow=today.getDay();
  const sun=new Date(today); sun.setDate(today.getDate()-dow);
  const wlabels=['S','M','T','W','T','F','S'];
  let whtml='';
  for(let i=0;i<7;i++){
    const d=new Date(sun); d.setDate(sun.getDate()+i);
    const k=fmtD(d); const sc2=dayScore(k); const fut=isFuture(k); const isT=isToday(k);
    let cls='';
    if(fut) cls='d-future';
    else if(sc2.pct===100&&sc2.total>0) cls='d-full';
    else if(sc2.pct>=50) cls='d-part';
    else if(!isT&&sc2.total>0) cls='d-miss';
    else if(isT) cls='d-today';
    const txt=fut?'·':isT&&sc2.pct===0?'●':sc2.pct>0?sc2.pct+'%':'—';
    whtml+=`<div class="wd-col"><div class="wd-lbl">${wlabels[i]}</div><div class="wd-dot ${cls}">${txt}</div></div>`;
  }
  document.getElementById('weekDots').innerHTML=whtml;

  // Today habit list
  const rec=state.records[tk]||{};
  if(!state.habits.length){
    document.getElementById('todayList').innerHTML=`<div class="empty-state"><div class="empty-icon">🌱</div><div class="empty-title">No habits yet</div><div class="empty-sub">Tap + to add your first habit!</div></div>`;
  } else {
    document.getElementById('todayList').innerHTML=state.habits.map((h,i)=>{
      const done=!!rec[h.id]; const st=habitStreak(h.id);
      return `<div class="today-habit ${done?'done':''} fade-up" style="animation-delay:${i*.04}s" onclick="handleHabitClick(event,'${h.id}','${tk}')">
        <div class="th-cb" style="${done?'background:'+h.color:''}">${done?'✓':''}</div>
        <div class="th-emoji">${h.emoji}</div>
        <div class="th-info">
          <div class="th-name">${h.name}</div>
          <div class="th-streak ${st>=3?'hot':''}">${st>0?'🔥 '+st+' day streak':st===0?'Start today!':''}</div>
        </div>
        <div class="th-remove" onclick="event.stopPropagation();openDeleteConfirm('${h.id}')">🗑️</div>
      </div>`;
    }).join('');
  }
}

/* ═══════════════════════════════════════
   HISTORY RENDER
═══════════════════════════════════════ */
function renderHistory(){
  document.getElementById('monthLabel').textContent=`${MONTH_NAMES[viewMonth]} ${viewYear}`;
  const days=monthDays(viewYear,viewMonth);
  const pastDays=days.filter(d=>!isFuture(d.key));
  const mPct=monthPct(viewYear,viewMonth);
  const totalDone=state.habits.reduce((s,h)=>s+habitCompletion(h.id,days),0);
  const perfDays=state.habits.length>0?pastDays.filter(d=>dayScore(d.key).pct===100).length:0;

  document.getElementById('monthStats').innerHTML=`
    <div class="ms-card"><div class="ms-val" style="color:#4F6EF7">${mPct}%</div><div class="ms-lbl">Avg Score</div></div>
    <div class="ms-card"><div class="ms-val" style="color:#16A34A">${totalDone}</div><div class="ms-lbl">Done</div></div>
    <div class="ms-card"><div class="ms-val" style="color:#7C3AED">${perfDays}</div><div class="ms-lbl">Perfect</div></div>
  `;

  // Calendar cells
  const firstWd=days[0].wd; // Sunday=0
  let cells='';
  for(let i=0;i<firstWd;i++) cells+=`<div class="cal-cell empty"></div>`;
  days.forEach(d=>{
    const sc=dayScore(d.key); const fut=isFuture(d.key); const isT=isToday(d.key);
    let cls='';
    if(fut) cls='c-future';
    else if(sc.total===0) cls='c-empty-day';
    else if(sc.pct===100) cls='c-full';
    else if(sc.pct>=50) cls='c-part';
    else if(!isT) cls='c-miss';
    else cls='c-today';
    cells+=`<div class="cal-cell ${cls}" onclick="showDayDetail('${d.key}')">${d.day}</div>`;
  });
  document.getElementById('calCells').innerHTML=cells;

  // Show detail if selected
  if(selectedCalDay) showDayDetail(selectedCalDay);
  else document.getElementById('dayDetail').style.display='none';
}

function showDayDetail(key){
  selectedCalDay=key;
  if(isFuture(key)){
    document.getElementById('dayDetail').style.display='none';
    return;
  }
  const d=new Date(key+'T00:00:00');
  const sc=dayScore(key);
  const rec=state.records[key]||{};
  const dateStr=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  
  let html=`<div class="dd-title">${dateStr}<span class="dd-badge">${sc.pct}%</span></div>`;
  if(!state.habits.length){
    html+=`<div style="color:var(--t3);font-size:13px;padding:10px 0;">No habits tracked on this day.</div>`;
  } else {
    state.habits.forEach(h=>{
      const done=!!rec[h.id];
      const clickable=!isFuture(key)?`onclick="toggle('${h.id}','${key}')"`:''
      html+=`<div class="dd-habit ${done?'done':''}" ${clickable}>
        <div class="dd-cb" style="${done?'background:'+h.color:''}">${done?'✓':''}</div>
        <div class="dd-emoji">${h.emoji}</div>
        <div class="dd-name">${h.name}</div>
      </div>`;
    });
  }
  const detail=document.getElementById('dayDetail');
  detail.innerHTML=html;
  detail.style.display='block';
  detail.scrollIntoView({behavior:'smooth',block:'nearest'});
}

/* ═══════════════════════════════════════
   ANALYSIS RENDER
═══════════════════════════════════════ */
function renderAnalysis(){
  if(!state.habits.length){
    document.getElementById('analysisContent').innerHTML=`<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">No data yet</div><div class="empty-sub">Add habits and start tracking!</div></div>`;
    return;
  }
  
  const now=new Date(); now.setHours(0,0,0,0);
  const last30=[]; for(let i=29;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);last30.push(fmtD(d));}
  const last14=[]; for(let i=13;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);last14.push(fmtD(d));}
  
  // Habit performance
  const maxSt=Math.max(...state.habits.map(h=>habitStreak(h.id)),1);
  const maxComp=Math.max(...state.habits.map(h=>habitCompletion(h.id,last30.map(k=>({key:k})))),1);
  
  let habitsHtml=state.habits.map(h=>{
    const st=habitStreak(h.id);
    const comp=habitCompletion(h.id,last30.map(k=>({key:k})));
    const pct=Math.round(comp/30*100);
    return `<div class="ha-row fade-up">
      <div class="ha-emoji">${h.emoji}</div>
      <div class="ha-info">
        <div class="ha-name">${h.name}</div>
        <div class="ha-bar-bg"><div class="ha-bar" style="width:${pct}%;background:${h.color}"></div></div>
        <div class="ha-meta"><span>${comp}/30 days</span><span>${pct}%</span></div>
      </div>
      <div class="ha-streak ${st>=3?'hot':''}">${st>=3?'🔥':''}${st}d</div>
    </div>`;
  }).join('');

  // 14-day trend
  const scores14=last14.map(k=>dayScore(k).pct);
  const maxP=Math.max(...scores14,1);
  const trendHtml=scores14.map((p,i)=>{
    const h=Math.max(p/maxP*54,p>0?3:1);
    return `<div class="trend-bar ${isToday(last14[i])?'tdy':''}" style="height:${h}px" title="${last14[i]}: ${p}%"></div>`;
  }).join('');

  // Best/worst day
  const allDaysWithData=Object.keys(state.records).filter(k=>!isFuture(k)&&state.habits.length>0);
  const perfDays=allDaysWithData.filter(k=>dayScore(k).pct===100).length;
  const streak=overallStreak();
  const totalCheck=Object.values(state.records).reduce((a,r)=>a+Object.values(r).filter(Boolean).length,0);
  
  document.getElementById('analysisContent').innerHTML=`
    <div class="an-section">
      <div class="sec-title" style="padding:0 0 8px">Overall Stats</div>
      <div class="an-card">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div style="text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#D97706;">${streak}</div>
            <div style="font-size:10px;color:var(--t3);font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-top:3px;">Day Streak</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#7C3AED;">${perfDays}</div>
            <div style="font-size:10px;color:var(--t3);font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-top:3px;">Perfect Days</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#16A34A;">${totalCheck}</div>
            <div style="font-size:10px;color:var(--t3);font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-top:3px;">Total Done</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#4F6EF7;">${monthPct(viewYear,viewMonth)}%</div>
            <div style="font-size:10px;color:var(--t3);font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-top:3px;">This Month</div>
          </div>
        </div>
      </div>
    </div>

    <div class="an-section">
      <div class="sec-title" style="padding:0 0 8px">14-Day Trend</div>
      <div class="an-card">
        <div class="trend-wrap">${trendHtml}</div>
        <div style="display:flex;justify-content:space-between;margin-top:8px">
          <span style="font-size:10px;color:var(--t3);font-family:'DM Mono',monospace;">14 days ago</span>
          <span style="font-size:10px;color:var(--t3);font-family:'DM Mono',monospace;">Today</span>
        </div>
      </div>
    </div>

    <div class="an-section">
      <div class="sec-title" style="padding:0 0 8px">Habit Performance (30 days)</div>
      <div class="an-card">${habitsHtml}</div>
    </div>
  `;
}

/* ═══════════════════════════════════════
   SETTINGS RENDER
═══════════════════════════════════════ */
function renderSettings(){
  const totalHabits=state.habits.length;
  const totalDays=Object.keys(state.records).length;
  const totalChecks=Object.values(state.records).reduce((a,r)=>a+Object.values(r).filter(Boolean).length,0);
  const si=document.getElementById('settingsInfo'); if(si) si.textContent=`${totalHabits} habits · ${totalDays} days tracked · ${totalChecks} total completions`;
  updateSettingsName();
}

/* ═══════════════════════════════════════
   MONTH NAV
═══════════════════════════════════════ */
function changeMonth(dir){
  viewMonth+=dir;
  if(viewMonth>11){viewMonth=0;viewYear++;}
  if(viewMonth<0){viewMonth=11;viewYear--;}
  selectedCalDay=null;
  renderCurrent();
}

/* ═══════════════════════════════════════
   HABIT MODAL
═══════════════════════════════════════ */
function openAdd(){
  editingId=null;
  document.getElementById('modalTitle').textContent='✦ Add Habit';
  document.getElementById('hNameInput').value='';
  selEmoji=EMOJIS[0]; selColor=COLORS[0];
  buildEmojiGrid(); buildColorGrid();
  document.getElementById('habitModal').classList.add('open');
  setTimeout(()=>document.getElementById('hNameInput').focus(),300);
}

function openEdit(hid){
  const h=state.habits.find(x=>x.id===hid); if(!h) return;
  editingId=hid;
  document.getElementById('modalTitle').textContent='✎ Edit Habit';
  document.getElementById('hNameInput').value=h.name;
  selEmoji=h.emoji; selColor=h.color;
  buildEmojiGrid(); buildColorGrid();
  document.getElementById('habitModal').classList.add('open');
}

function closeHabitModal(){
  document.getElementById('habitModal').classList.remove('open');
  editingId=null;
}

function saveHabit(){
  const name=document.getElementById('hNameInput').value.trim();
  if(!name){ toast('Please enter a habit name'); return; }
  if(editingId){
    const h=state.habits.find(x=>x.id===editingId);
    if(h){h.name=name;h.emoji=selEmoji;h.color=selColor;}
    toast(`✎ "${name}" updated`);
  } else {
    state.habits.push({id:Date.now().toString(),name,emoji:selEmoji,color:selColor,createdAt:Date.now()});
    toast(`${selEmoji} "${name}" added!`);
  }
  saveState(); closeHabitModal(); renderCurrent();
}

/* ═══════════════════════════════════════
   EMOJI / COLOR PICKERS
═══════════════════════════════════════ */
function buildEmojiGrid(){
  document.getElementById('emojiGrid').innerHTML=EMOJIS.map(e=>
    `<div class="ep ${e===selEmoji?'sel':''}" onclick="selEmoji='${e}';buildEmojiGrid()">${e}</div>`
  ).join('');
}
function buildColorGrid(){
  document.getElementById('colorGrid').innerHTML=COLORS.map(c=>
    `<div class="cp ${c===selColor?'sel':''}" style="background:${c}" onclick="selColor='${c}';buildColorGrid()"></div>`
  ).join('');
}

/* ═══════════════════════════════════════
   DELETE / CONFIRM
═══════════════════════════════════════ */
function openDeleteConfirm(hid){
  const h=state.habits.find(x=>x.id===hid); if(!h) return;
  pendingDeleteId=hid;
  document.getElementById('confirmTitle').textContent='🗑️ Delete Habit';
  document.getElementById('confirmMsg').textContent=`Remove "${h.emoji} ${h.name}"? Your completion history will be kept.`;
  document.getElementById('confirmOkBtn').onclick=()=>{ deleteHabit(pendingDeleteId); closeConfirm(); };
  document.getElementById('confirmOkBtn').textContent='Delete';
  document.getElementById('confirmOkBtn').style.background='var(--red)';
  document.getElementById('confirmModal').classList.add('open');
}

function deleteHabit(hid){
  state.habits=state.habits.filter(h=>h.id!==hid);
  exitRemoveMode();
  saveState(); renderCurrent(); toast('🗑️ Habit removed');
}

function openResetConfirm(){
  document.getElementById('confirmTitle').textContent='⚠️ Reset All Data';
  document.getElementById('confirmMsg').textContent='This will permanently delete ALL habits and history. This cannot be undone!';
  document.getElementById('confirmOkBtn').textContent='Yes, delete everything';
  document.getElementById('confirmOkBtn').style.background='var(--red)';
  document.getElementById('confirmOkBtn').onclick=()=>{
    state={habits:[],records:{}}; saveState(); closeConfirm(); renderCurrent(); toast('🗑️ All data cleared');
  };
  document.getElementById('confirmModal').classList.add('open');
}

function closeConfirm(){ document.getElementById('confirmModal').classList.remove('open'); }

/* ═══════════════════════════════════════
   DATA EXPORT / IMPORT
═══════════════════════════════════════ */
function exportData(){
  if(!state.habits.length){ toast('❌ No habits to export'); return; }
  toast('⏳ Building Excel...');

  const wb = XLSX.utils.book_new();

  /* ── Helper: hex color → ARGB (openpyxl-style, no #) ── */
  function argb(hex){ return 'FF' + hex.replace('#','').toUpperCase(); }

  /* ══════════════════════════════════════
     SHEET 1 — FULL LOG (habit × day grid)
  ══════════════════════════════════════ */
  // Collect all past dates sorted ascending
  const allKeys = Object.keys(state.records)
    .filter(k => k <= todayKey())
    .sort();

  // Header row: Habit | Emoji | Color | Date1 | Date2 | ...
  const hdr = ['Habit Name','Emoji','Color',...allKeys];
  const logRows = [hdr];

  state.habits.forEach(h => {
    const row = [h.name, h.emoji, h.color];
    allKeys.forEach(k => {
      const done = !!(state.records[k] && state.records[k][h.id]);
      row.push(done ? '✅ Done' : '❌ Missed');
    });
    logRows.push(row);
  });

  // Summary rows at bottom
  logRows.push([]);
  const pctRow = ['Daily Score %','',''];
  const doneRow = ['Habits Done','',''];
  const missRow = ['Habits Missed','',''];
  allKeys.forEach(k => {
    const sc = dayScore(k);
    pctRow.push(sc.pct + '%');
    doneRow.push(sc.done);
    missRow.push(sc.total - sc.done);
  });
  logRows.push(pctRow, doneRow, missRow);

  const wsLog = XLSX.utils.aoa_to_sheet(logRows);

  // Column widths
  wsLog['!cols'] = [
    {wch:22}, {wch:7}, {wch:10},
    ...allKeys.map(() => ({wch:12}))
  ];

  // Freeze first 3 cols + header row
  wsLog['!freeze'] = { xSplit:3, ySplit:1 };

  XLSX.utils.book_append_sheet(wb, wsLog, '📋 Full Log');

  /* ══════════════════════════════════════
     SHEET 2 — HABIT SUMMARY
  ══════════════════════════════════════ */
  const summaryRows = [
    ['Habit Summary — Generated on ' + new Date().toLocaleDateString('en-IN')],
    [],
    ['Habit','Emoji','Current Streak (days)','Total Days Done','Total Days Tracked','Completion Rate %','Best Streak (est.)']
  ];

  const pastKeys = allKeys; // already filtered to <= today

  state.habits.forEach(h => {
    const streak = habitStreak(h.id);
    const totalDone = pastKeys.filter(k => state.records[k] && state.records[k][h.id]).length;
    const tracked = pastKeys.length;
    const rate = tracked > 0 ? Math.round(totalDone / tracked * 100) : 0;
    summaryRows.push([h.name, h.emoji, streak, totalDone, tracked, rate + '%', streak]);
  });

  // Totals
  summaryRows.push([]);
  const allDone = state.habits.reduce((s,h) =>
    s + pastKeys.filter(k => state.records[k] && state.records[k][h.id]).length, 0);
  summaryRows.push(['TOTAL ALL HABITS','','','',allDone,'','']);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{wch:24},{wch:7},{wch:22},{wch:18},{wch:20},{wch:20},{wch:18}];
  wsSummary['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:6} }];
  XLSX.utils.book_append_sheet(wb, wsSummary, '📊 Habit Summary');

  /* ══════════════════════════════════════
     SHEET 3 — DAILY REPORT
  ══════════════════════════════════════ */
  const dailyRows = [
    ['Daily Report'],
    [],
    ['Date','Day','Habits Done','Habits Missed','Total Habits','Score %','Status']
  ];

  allKeys.forEach(k => {
    const sc = dayScore(k);
    const d = new Date(k + 'T00:00:00');
    const dayName = d.toLocaleDateString('en-US',{weekday:'long'});
    const status = sc.pct === 100 ? '🏆 Perfect' :
                   sc.pct >= 75 ? '🔥 Great' :
                   sc.pct >= 50 ? '👍 Good' :
                   sc.pct >= 25 ? '⚠️ Low' : '❌ Poor';
    dailyRows.push([k, dayName, sc.done, sc.total - sc.done, sc.total, sc.pct + '%', status]);
  });

  // Overall stats at bottom
  const perfectDays = allKeys.filter(k => dayScore(k).pct === 100 && state.habits.length > 0).length;
  const avgScore = allKeys.length > 0
    ? Math.round(allKeys.reduce((s,k) => s + dayScore(k).pct, 0) / allKeys.length) : 0;
  dailyRows.push([]);
  dailyRows.push(['OVERALL STATS']);
  dailyRows.push(['Total Days Tracked', allKeys.length]);
  dailyRows.push(['Perfect Days (100%)', perfectDays]);
  dailyRows.push(['Average Daily Score', avgScore + '%']);
  dailyRows.push(['Current Streak', overallStreak() + ' days']);

  const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
  wsDaily['!cols'] = [{wch:14},{wch:14},{wch:15},{wch:16},{wch:15},{wch:10},{wch:14}];
  wsDaily['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:6} }];
  XLSX.utils.book_append_sheet(wb, wsDaily, '📅 Daily Report');

  /* ══════════════════════════════════════
     DOWNLOAD
  ══════════════════════════════════════ */
  const fileName = `HabitGrid_${todayKey()}.xlsx`;
  XLSX.writeFile(wb, fileName);
  toast('✅ Excel exported: ' + fileName);
}
function exportJSON(){
  const blob = new Blob([JSON.stringify(state)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `HabitGrid_backup_${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  toast('✅ Backup saved');
}
function importClick(){ document.getElementById('importFile').click(); }

/* ═══════════════════════════════════════
   PDF EXPORT — html2canvas (preserves emojis)
═══════════════════════════════════════ */
function exportPDF(){
  if(!state.habits.length){ toast('❌ No habits to export'); return; }
  toast('⏳ Building PDF...');

  function loadScript(src, cb){
    if(document.querySelector(`script[src="${src}"]`)){ cb(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = cb; s.onerror = ()=>toast('❌ Network error loading PDF library');
    document.head.appendChild(s);
  }

  loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', ()=>{
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', ()=>{
      generateAndDownloadPDF();
    });
  });
}

function generateAndDownloadPDF(){
  const userName  = state.userName || 'HabitGrid User';
  const userAge   = state.userAge  ? ' · Age ' + state.userAge : '';
  const today     = new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const allKeys   = Object.keys(state.records).filter(k=>k<=todayKey()).sort();
  const perfectDays = allKeys.filter(k=>dayScore(k).pct===100&&state.habits.length>0).length;
  const avgScore  = allKeys.length>0 ? Math.round(allKeys.reduce((s,k)=>s+dayScore(k).pct,0)/allKeys.length) : 0;
  const totalChecks = allKeys.reduce((s,k)=>s+Object.values(state.records[k]||{}).filter(Boolean).length,0);

  /* ── TABLE STYLE HELPERS ── */
  const thStyle = (first,last) =>
    `padding:9px 10px;text-align:center;color:#fff;font-size:11px;font-weight:700;letter-spacing:.4px;`
    +(first?'text-align:left;':'')
    +(first?'border-radius:6px 0 0 0;':last?'border-radius:0 6px 0 0;':'');

  const sectionTitle = txt =>
    `<div style="font-size:15px;font-weight:800;color:#0F172A;margin:28px 0 10px;padding-left:4px;border-left:4px solid #4F6EF7;">${txt}</div>`;

  const tableHead = (cols) =>
    `<thead><tr style="background:linear-gradient(135deg,#4F6EF7,#818CF8);">`
    + cols.map((c,i)=>`<th style="${thStyle(i===0,i===cols.length-1)}">${c}</th>`).join('')
    + `</tr></thead>`;

  /* ══ TABLE 1 — HABIT SUMMARY ══ */
  const habitSummaryRows = state.habits.map((h,i)=>{
    const streak = habitStreak(h.id);
    const done   = allKeys.filter(k=>state.records[k]&&state.records[k][h.id]).length;
    const missed = allKeys.length - done;
    const rate   = allKeys.length>0?Math.round(done/allKeys.length*100):0;
    const rateColor = rate>=75?'#16A34A':rate>=50?'#D97706':'#DC2626';
    const bg = i%2===0?'#ffffff':'#F8F9FF';
    return `<tr style="background:${bg}">
      <td style="text-align:left;padding:7px 10px;">${h.emoji} ${h.name}</td>
      <td style="text-align:center;padding:7px 6px;font-weight:700;color:#D97706">${streak}d</td>
      <td style="text-align:center;padding:7px 6px;color:#16A34A;font-weight:600">${done}</td>
      <td style="text-align:center;padding:7px 6px;color:#DC2626;font-weight:600">${missed}</td>
      <td style="text-align:center;padding:7px 6px;">${allKeys.length}</td>
      <td style="text-align:center;padding:7px 6px;color:${rateColor};font-weight:800">${rate}%</td>
    </tr>`;
  }).join('');

  /* ══ TABLE 2 — FULL HABIT×DAY LOG ══ */
  // Column headers: Date | Day | habit1 | habit2 | ... | Score
  const habitCols = state.habits.map(h=>`<th style="text-align:center;padding:8px 4px;color:#fff;font-size:10px;font-weight:700;max-width:60px;word-break:break-word;">${h.emoji}<br>${h.name.length>8?h.name.slice(0,8)+'…':h.name}</th>`).join('');
  const fullLogHead = `<thead><tr style="background:linear-gradient(135deg,#4F6EF7,#818CF8);">
    <th style="padding:8px 10px;text-align:left;color:#fff;font-size:11px;font-weight:700;border-radius:6px 0 0 0;">DATE</th>
    <th style="padding:8px 6px;text-align:center;color:#fff;font-size:11px;font-weight:700;">DAY</th>
    ${habitCols}
    <th style="padding:8px 6px;text-align:center;color:#fff;font-size:11px;font-weight:700;">DONE</th>
    <th style="padding:8px 6px;text-align:center;color:#fff;font-size:11px;font-weight:700;">SCORE</th>
    <th style="padding:8px 6px;text-align:center;color:#fff;font-size:11px;font-weight:700;border-radius:0 6px 0 0;">STATUS</th>
  </tr></thead>`;

  const fullLogRows = allKeys.map((k,i)=>{
    const sc = dayScore(k);
    const d  = new Date(k+'T00:00:00');
    const dayName = d.toLocaleDateString('en-US',{weekday:'short'});
    const status  = sc.pct===100?'🏆 Perfect':sc.pct>=75?'🔥 Great':sc.pct>=50?'👍 Good':sc.pct>=25?'⚠️ Low':'❌ Poor';
    const sColor  = sc.pct===100?'#16A34A':sc.pct>=75?'#4F6EF7':sc.pct>=50?'#D97706':'#DC2626';
    const bg = i%2===0?'#ffffff':'#F8F9FF';
    const habitCells = state.habits.map(h=>{
      const done = !!(state.records[k]&&state.records[k][h.id]);
      return `<td style="text-align:center;padding:6px 4px;font-size:13px;">${done?'✅':'❌'}</td>`;
    }).join('');
    return `<tr style="background:${bg}">
      <td style="text-align:left;padding:6px 10px;font-size:11px;font-weight:600;">${k}</td>
      <td style="text-align:center;padding:6px 4px;font-size:11px;color:#64748B;">${dayName}</td>
      ${habitCells}
      <td style="text-align:center;padding:6px 4px;color:#16A34A;font-weight:700;">${sc.done}/${sc.total}</td>
      <td style="text-align:center;padding:6px 4px;color:${sColor};font-weight:800;">${sc.pct}%</td>
      <td style="text-align:center;padding:6px 4px;color:${sColor};font-weight:700;font-size:11px;">${status}</td>
    </tr>`;
  }).join('');

  /* ══ TABLE 3 — DAILY REPORT ══ */
  const dailyReportRows = allKeys.map((k,i)=>{
    const sc = dayScore(k);
    const d  = new Date(k+'T00:00:00');
    const dayName = d.toLocaleDateString('en-US',{weekday:'long'});
    const status  = sc.pct===100?'🏆 Perfect':sc.pct>=75?'🔥 Great':sc.pct>=50?'👍 Good':sc.pct>=25?'⚠️ Low':'❌ Poor';
    const sColor  = sc.pct===100?'#16A34A':sc.pct>=75?'#4F6EF7':sc.pct>=50?'#D97706':'#DC2626';
    const bg = i%2===0?'#ffffff':'#F8F9FF';
    return `<tr style="background:${bg}">
      <td style="text-align:left;padding:6px 10px;font-size:12px;">${k}</td>
      <td style="text-align:center;padding:6px 8px;font-size:12px;color:#64748B;">${dayName}</td>
      <td style="text-align:center;padding:6px 8px;color:#16A34A;font-weight:700;">${sc.done}</td>
      <td style="text-align:center;padding:6px 8px;color:#DC2626;font-weight:700;">${sc.total-sc.done}</td>
      <td style="text-align:center;padding:6px 8px;">${sc.total}</td>
      <td style="text-align:center;padding:6px 8px;color:${sColor};font-weight:800;">${sc.pct}%</td>
      <td style="text-align:center;padding:6px 8px;color:${sColor};font-weight:700;font-size:11px;">${status}</td>
    </tr>`;
  }).join('');

  const reportHTML = `
  <div id="pdf-report" style="width:900px;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#0F172A;background:#fff;padding:36px;">

    <!-- Header Banner -->
    <div style="background:linear-gradient(135deg,#4F6EF7,#818CF8);border-radius:14px;padding:22px 28px;margin-bottom:28px;">
      <div style="font-size:24px;font-weight:800;color:#fff;margin-bottom:5px;">📊 HabitGrid — Complete Report</div>
      <div style="font-size:13px;color:rgba(255,255,255,.85);">${userName}${userAge} &nbsp;·&nbsp; Generated on ${today}</div>
    </div>

    <!-- Stats Overview -->
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:32px;">
      ${[
        ['🎯','#4F6EF7',state.habits.length,'Habits'],
        ['📅','#0891B2',allKeys.length,'Days Tracked'],
        ['🏆','#16A34A',perfectDays,'Perfect Days'],
        ['📈','#D97706',avgScore+'%','Avg Score'],
        ['✅','#7C3AED',totalChecks,'Total Done'],
        ['🔥','#DC2626',overallStreak()+'d','Streak'],
      ].map(([icon,color,val,lbl])=>`
        <div style="background:#EEF1FB;border-radius:10px;padding:14px 8px;text-align:center;">
          <div style="font-size:18px;">${icon}</div>
          <div style="font-size:22px;font-weight:800;color:${color};margin:4px 0;">${val}</div>
          <div style="font-size:9px;color:#64748B;text-transform:uppercase;letter-spacing:.4px;">${lbl}</div>
        </div>`).join('')}
    </div>

    <!-- TABLE 1: Habit Summary -->
    ${sectionTitle('Table 1 — Habit Summary')}
    <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
      ${tableHead(['HABIT','STREAK','DONE','MISSED','TRACKED','RATE'])}
      <tbody style="font-size:13px;">${habitSummaryRows}</tbody>
    </table>
    <div style="font-size:10px;color:#94A3B8;margin-bottom:8px;padding-left:4px;">Showing all ${state.habits.length} habits across ${allKeys.length} tracked days.</div>

    <!-- TABLE 2: Full Habit × Day Log -->
    ${sectionTitle('Table 2 — Full Daily Habit Log')}
    <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
      ${fullLogHead}
      <tbody style="font-size:12px;">${fullLogRows}</tbody>
    </table>
    <div style="font-size:10px;color:#94A3B8;margin-bottom:8px;padding-left:4px;">✅ = Completed &nbsp;&nbsp; ❌ = Missed</div>

    <!-- TABLE 3: Daily Report -->
    ${sectionTitle('Table 3 — Daily Report')}
    <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
      ${tableHead(['DATE','DAY','DONE','MISSED','TOTAL','SCORE %','STATUS'])}
      <tbody style="font-size:12px;">${dailyReportRows}</tbody>
    </table>
    <!-- Overall stats -->
    <div style="background:#EEF1FB;border-radius:10px;padding:14px 20px;margin-top:16px;display:flex;gap:32px;flex-wrap:wrap;">
      <div><span style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:.4px;">Total Days</span><br><strong style="font-size:16px;">${allKeys.length}</strong></div>
      <div><span style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:.4px;">Perfect Days</span><br><strong style="font-size:16px;color:#16A34A;">${perfectDays}</strong></div>
      <div><span style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:.4px;">Avg Score</span><br><strong style="font-size:16px;color:#D97706;">${avgScore}%</strong></div>
      <div><span style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:.4px;">Current Streak</span><br><strong style="font-size:16px;color:#DC2626;">${overallStreak()}d</strong></div>
      <div><span style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:.4px;">Total Completions</span><br><strong style="font-size:16px;color:#7C3AED;">${totalChecks}</strong></div>
    </div>

    <!-- Footer -->
    <div style="margin-top:28px;text-align:center;font-size:10px;color:#94A3B8;border-top:1px solid #E2E8F0;padding-top:14px;">
      HabitGrid &nbsp;·&nbsp; Complete Report &nbsp;·&nbsp; ${today} &nbsp;·&nbsp; ${userName}${userAge}
    </div>
  </div>`;

  // Inject hidden render div
  let container = document.getElementById('__pdf_render__');
  if(container) container.remove();
  container = document.createElement('div');
  container.id = '__pdf_render__';
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
  container.innerHTML = reportHTML;
  document.body.appendChild(container);

  const target = container.querySelector('#pdf-report');

  html2canvas(target, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: 900,
    windowWidth: 900
  }).then(canvas=>{
    container.remove();
    const { jsPDF } = window.jspdf;
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const pageW = 210, pageH = 297;
    const margin = 8;
    const imgW = pageW - margin*2;
    const imgH = canvas.height * imgW / canvas.width;
    const pageContentH = pageH - margin*2;

    let heightLeft = imgH;
    let position = margin;
    let page = 0;

    while(heightLeft > 0){
      if(page > 0){ pdf.addPage(); position = margin - page * pageContentH; }
      pdf.addImage(imgData,'JPEG', margin, position, imgW, imgH);
      heightLeft -= pageContentH;
      page++;
    }

    const fileName = 'HabitGrid_'+todayKey()+'.pdf';
    pdf.save(fileName);
    toast('✅ PDF downloaded with emojis!');
  }).catch(err=>{
    container.remove();
    console.error(err);
    toast('❌ PDF error: '+err.message);
  });
}
function importData(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=ev=>{
    try{
      const d=JSON.parse(ev.target.result);
      if(!d.habits||!d.records) throw new Error('Invalid');
      state=d; saveState(); renderCurrent(); toast('📥 Data imported!');
    }catch(err){ toast('❌ Invalid file format'); }
  };
  r.readAsText(f); e.target.value='';
}

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */
let toastTimer;
function toast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),2600);
}

/* ═══════════════════════════════════════
   CONFETTI
═══════════════════════════════════════ */
function launchConfetti(){
  const canvas=document.getElementById('confetti-canvas');
  const ctx=canvas.getContext('2d');
  canvas.width=innerWidth; canvas.height=innerHeight;
  const cols=['#4F6EF7','#16A34A','#DC2626','#D97706','#7C3AED','#EC4899','#0891B2','#059669','#FCD34D'];
  const ps=Array.from({length:70},()=>({
    x:Math.random()*canvas.width, y:-20,
    r:Math.random()*6+3, c:cols[Math.floor(Math.random()*cols.length)],
    vx:(Math.random()-.5)*5, vy:Math.random()*4+3,
    ang:Math.random()*360, spin:(Math.random()-.5)*8,
    shape:Math.random()>.5?'r':'c'
  }));
  let fr=0;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ps.forEach(p=>{
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.ang*Math.PI/180);
      ctx.fillStyle=p.c; ctx.globalAlpha=Math.max(0,1-fr/80);
      p.shape==='c'?(ctx.beginPath(),ctx.arc(0,0,p.r,0,Math.PI*2),ctx.fill()):ctx.fillRect(-p.r/2,-p.r*.3,p.r,p.r*.6);
      ctx.restore();
      p.x+=p.vx; p.y+=p.vy; p.vy+=.08; p.ang+=p.spin;
    });
    fr++; if(fr<100) requestAnimationFrame(draw); else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  draw();
}


/* ═══════════════════════════════════════
   EDIT HABIT SHEET
═══════════════════════════════════════ */
function openEditHabitSheet(){
  document.getElementById('editHabitSheet').classList.add('open');
}
function closeEditHabitSheet(){
  document.getElementById('editHabitSheet').classList.remove('open');
}

function openExportSheet(){
  document.getElementById('exportSheet').classList.add('open');
}
function closeExportSheet(){
  document.getElementById('exportSheet').classList.remove('open');
}

/* ═══════════════════════════════════════
   HELP MODAL
═══════════════════════════════════════ */
function openHelpModal(){
  document.getElementById('helpOverlay').classList.add('open');
}
function closeHelpModal(){
  document.getElementById('helpOverlay').classList.remove('open');
}


/* ═══════════════════════════════════════
   PROFILE PICTURE
═══════════════════════════════════════ */
function openPicPicker(){
  // Always show the sheet with both options
  const hasPhoto = !!state.profilePic;
  document.getElementById('removePicBtn').style.display = hasPhoto ? '' : 'none';
  document.getElementById('picOverlay').classList.add('open');
}
function closePicPicker(){
  document.getElementById('picOverlay').classList.remove('open');
}
function triggerPicInput(mode){
  closePicPicker();
  if(mode === 'camera'){
    openCameraModal();
  } else {
    document.getElementById('picInputGallery').click();
  }
}

/* ═══════════════════════════════════════
   LIVE CAMERA MODAL
═══════════════════════════════════════ */
let cameraStream = null;

function openCameraModal(){
  const modal = document.getElementById('cameraModal');
  modal.classList.add('open');
  const video = document.getElementById('cameraVideo');
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    .then(stream => {
      cameraStream = stream;
      video.srcObject = stream;
      video.play();
    })
    .catch(err => {
      closeCameraModal();
      // fallback to file input
      document.getElementById('picInputCamera').click();
    });
}

function closeCameraModal(){
  document.getElementById('cameraModal').classList.remove('open');
  if(cameraStream){
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  const video = document.getElementById('cameraVideo');
  video.srcObject = null;
}

function capturePhoto(){
  const video = document.getElementById('cameraVideo');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 480;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  closeCameraModal();
  state.profilePic = dataUrl;
  saveState();
  renderProfileAvatar();
  toast('✅ Profile photo updated!');
}

function flipCamera(){
  if(!cameraStream) return;
  const track = cameraStream.getVideoTracks()[0];
  const settings = track.getSettings();
  const newFacing = settings.facingMode === 'user' ? 'environment' : 'user';
  closeCameraModal();
  setTimeout(()=>{
    const modal = document.getElementById('cameraModal');
    modal.classList.add('open');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacing }, audio: false })
      .then(stream => {
        cameraStream = stream;
        const video = document.getElementById('cameraVideo');
        video.srcObject = stream;
        video.play();
      }).catch(()=>{ closeCameraModal(); document.getElementById('picInputCamera').click(); });
  }, 100);
}
function handlePicFile(event){
  const file = event.target.files[0];
  if(!file) return;
  event.target.value = '';
  const reader = new FileReader();
  reader.onload = function(e){
    state.profilePic = e.target.result;
    saveState();
    renderProfileAvatar();
    toast('✅ Profile photo updated!');
  };
  reader.readAsDataURL(file);
}
function removeProfilePic(){
  closePicPicker();
  state.profilePic = null;
  saveState();
  renderProfileAvatar();
  toast('Profile photo removed');
}
function renderProfileAvatar(){
  const avatar  = document.getElementById('profileAvatar');
  const imgEl   = document.getElementById('profileAvatarImg');
  const emojiEl = document.getElementById('profileAvatarEmoji');
  if(!avatar) return;
  if(state.profilePic){
    imgEl.src = state.profilePic;
    imgEl.style.display = 'block';
    emojiEl.style.display = 'none';
    avatar.style.background = 'transparent';
  } else {
    imgEl.src = '';
    imgEl.style.display = 'none';
    emojiEl.style.display = 'block';
    avatar.style.background = 'linear-gradient(135deg,#C7D2FE,#DDD6FE)';
  }
}


function seedDemo(){
  if(state.habits.length) return; // Don't overwrite existing data!

  const habits=[
    {id:'h1', name:'5:30 AM Wake Up',   emoji:'⏰', color:'#4F6EF7'},
    {id:'h2', name:'No Social Media',   emoji:'📵', color:'#DC2626'},
    {id:'h3', name:'Exercise / Gym',    emoji:'🏃', color:'#16A34A'},
    {id:'h4', name:'Read 10 Pages',     emoji:'📚', color:'#D97706'},
    {id:'h5', name:'Meditation',        emoji:'🧘', color:'#7C3AED'},
    {id:'h6', name:'Cold Shower',       emoji:'🚿', color:'#0891B2'},
    {id:'h7', name:'Deep Work (2hr)',   emoji:'💻', color:'#4F46E5'},
    {id:'h8', name:'Budget Tracking',  emoji:'💰', color:'#059669'},
    {id:'h9', name:'Drink 3L Water',   emoji:'💧', color:'#0284C7'},
    {id:'h10',name:'No Junk Food',     emoji:'🥗', color:'#65A30D'},
  ];
  state.habits = habits.map(h=>({...h, createdAt: Date.now()}));

  const now = new Date(); now.setHours(0,0,0,0);

  // Per-habit completion rates (realistic — some habits harder than others)
  const habitRates = {
    h1:  0.88,  // Early wake — pretty consistent
    h2:  0.60,  // Social media — struggles on weekends
    h3:  0.72,  // Exercise — skips occasionally
    h4:  0.80,  // Reading — strong
    h5:  0.65,  // Meditation — inconsistent
    h6:  0.55,  // Cold shower — hardest
    h7:  0.75,  // Deep work — weekday only mostly
    h8:  0.90,  // Budget — very consistent
    h9:  0.83,  // Water — usually done
    h10: 0.68,  // Diet — weekends slip
  };

  // Seed 60 days of history with realistic patterns
  for(let i=60; i>=1; i--){
    const d = new Date(now); d.setDate(now.getDate()-i);
    const k = fmtD(d);
    const isWeekend = d.getDay()===0 || d.getDay()===6;
    state.records[k] = {};

    habits.forEach(h=>{
      let rate = habitRates[h.id];
      // Weekend penalty for work habits, bonus for leisure ones
      if(isWeekend && (h.id==='h7'||h.id==='h1')) rate -= 0.20;
      if(isWeekend && (h.id==='h2'||h.id==='h10')) rate -= 0.15;
      // Improvement trend: last 20 days are better
      if(i <= 20) rate = Math.min(rate + 0.12, 0.97);
      if(i <= 7)  rate = Math.min(rate + 0.08, 0.99);
      // Simulate a "bad week" around day 40-47
      if(i>=40 && i<=47) rate = Math.max(rate - 0.35, 0.05);
      if(Math.random() < rate) state.records[k][h.id] = true;
    });
  }

  // Today — mark 6 out of 10 as done (partially complete for demo)
  const tk = todayKey();
  state.records[tk] = {};
  ['h1','h3','h4','h7','h8','h9'].forEach(id=>{
    state.records[tk][id] = true;
  });

  saveState();
}

/* ═══════════════════════════════════════
   FAB MENU
═══════════════════════════════════════ */
let fabMenuOpen = false;

function toggleFabMenu(e){
  if(e) e.stopPropagation();
  fabMenuOpen ? closeFabMenu() : openFabMenu();
}

function openFabMenu(){
  fabMenuOpen = true;
  document.getElementById('fabMenu').classList.add('open');
  document.getElementById('fabBackdrop').classList.add('open');
}

function closeFabMenu(){
  fabMenuOpen = false;
  document.getElementById('fabMenu').classList.remove('open');
  document.getElementById('fabBackdrop').classList.remove('open');
}

/* ═══════════════════════════════════════
   REMOVE MODE
═══════════════════════════════════════ */
let removeModeActive = false;

function enterRemoveMode(){
  if(!state.habits.length){ toast('No habits to remove'); return; }
  removeModeActive = true;
  document.getElementById('todayList').classList.add('remove-mode');
  document.getElementById('fabAdd').innerHTML = '<span class="fab-edit-icon">✏️</span> Edit';
  toast('Tap 🗑️ on a habit to remove it');
}

function exitRemoveMode(){
  if(!removeModeActive) return;
  removeModeActive = false;
  document.getElementById('todayList').classList.remove('remove-mode');
}

function handleHabitClick(event, hid, tk){
  if(removeModeActive) return;
  toggle(hid, tk);
}

/* ═══════════════════════════════════════
   USER NAME
═══════════════════════════════════════ */
function promptUserName(){
  const modal = document.getElementById('nameModal');
  document.getElementById('nameInput').value = state.userName || '';
  document.getElementById('ageInput').value = state.userAge || '';
  modal.classList.add('open');
  // Don't auto-focus — let user tap the field to avoid keyboard covering button
}

function saveUserName(){
  const name = document.getElementById('nameInput').value.trim();
  const ageVal = document.getElementById('ageInput').value.trim();
  if(!name){ toast('Please enter your name'); return; }
  if(!ageVal || isNaN(ageVal) || +ageVal < 1 || +ageVal > 120){ toast('Please enter a valid age (1–120)'); return; }
  state.userName = name;
  state.userAge = +ageVal;
  saveState();
  document.getElementById('nameModal').classList.remove('open');
  document.activeElement && document.activeElement.blur(); // dismiss keyboard
  updateSettingsName();
  toast('👋 Welcome, ' + name + '!');
}

function updateSettingsName(){
  const nameEl = document.getElementById('settingsUserName');
  const ageEl  = document.getElementById('settingsUserAge');
  if(nameEl) nameEl.textContent = state.userName ? state.userName : 'Tap Edit to set your name';
  if(ageEl)  ageEl.textContent  = state.userAge  ? 'Age ' + state.userAge : '';
}

function checkFirstLaunch(){
  if(!state.userName || !state.userAge){
    setTimeout(()=>{
      document.getElementById('nameModal').classList.add('open');
      // No auto-focus — user taps field themselves
    }, 600);
  }
  updateSettingsName();
  renderProfileAvatar();
}

/* ═══════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════ */
document.querySelectorAll('.bnav-item').forEach(btn=>{
  btn.addEventListener('click',()=>{ exitRemoveMode(); switchTab(btn.dataset.tab); });
});
document.getElementById('fabAdd').addEventListener('click', toggleFabMenu);
document.getElementById('fabMenuAdd').addEventListener('click',()=>{ closeFabMenu(); openAdd(); });
document.getElementById('fabMenuRemove').addEventListener('click',()=>{ closeFabMenu(); enterRemoveMode(); });
document.getElementById('fabBackdrop').addEventListener('click', closeFabMenu);
document.getElementById('modalCancelBtn').addEventListener('click',closeHabitModal);
document.getElementById('modalSaveBtn').addEventListener('click',saveHabit);
document.getElementById('prevMonBtn').addEventListener('click',()=>changeMonth(-1));
document.getElementById('nextMonBtn').addEventListener('click',()=>changeMonth(1));
document.getElementById('habitModal').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeHabitModal(); });
document.getElementById('confirmModal').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeConfirm(); });
document.getElementById('hNameInput').addEventListener('keydown',e=>{ if(e.key==='Enter') saveHabit(); });
document.getElementById('nameSaveBtn').addEventListener('click', saveUserName);
document.getElementById('nameInput').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); document.getElementById('ageInput').focus(); } });
document.getElementById('ageInput').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); saveUserName(); } });

/* Shift name modal up when keyboard opens so button stays visible */
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', ()=>{
    const modal = document.getElementById('nameModal');
    if(!modal.classList.contains('open')) return;
    const vvh = window.visualViewport.height;
    const wh  = window.innerHeight;
    const keyboardH = wh - vvh;
    modal.style.paddingBottom = keyboardH > 50 ? (keyboardH + 12) + 'px' : '24px';
  });
}

/* ═══════════════════════════════════════
   THEME
═══════════════════════════════════════ */
function applyTheme(dark){
  if(dark){
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
  updateThemeToggleUI(dark);
}

function updateThemeToggleUI(dark){
  const icon  = document.getElementById('themeToggleIcon');
  const label = document.getElementById('themeToggleLabel');
  const sub   = document.getElementById('themeToggleSub');
  const badge = document.getElementById('themeBadge');
  if(!icon) return;
  if(dark){
    // Currently dark → offer to switch to light
    icon.textContent  = '☀️';
    label.textContent = 'Light Theme';
    sub.textContent   = 'Switch to light mode';
    badge.textContent = '☀️ Light';
    badge.className   = 'theme-badge to-light';
  } else {
    // Currently light → offer to switch to dark
    icon.textContent  = '🌙';
    label.textContent = 'Dark Theme';
    sub.textContent   = 'Switch to dark mode';
    badge.textContent = '🌙 Dark';
    badge.className   = 'theme-badge to-dark';
  }
}

function toggleTheme(){
  const isDark = document.body.classList.contains('dark-theme');
  const newDark = !isDark;
  state.darkTheme = newDark;
  saveState();
  applyTheme(newDark);
  toast(newDark ? '🌙 Dark theme on' : '☀️ Light theme on');
}

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
/* Data is loaded from localStorage and NEVER wiped on open.
   Ticks are stored per date (state.records['YYYY-MM-DD']), so a new day
   automatically starts with all habits unticked, while every past day's
   ticks and all calculations stay saved permanently. */
state = loadState();
if(!state.habits) state.habits = [];
if(!state.records) state.records = {};

// Ask the browser not to auto-delete our storage (keeps data permanent)
if(navigator.storage && navigator.storage.persist){
  navigator.storage.persist().catch(()=>{});
}

viewMonth=new Date().getMonth();
viewYear=new Date().getFullYear();
renderDash();
checkFirstLaunch();
applyTheme(!!state.darkTheme);

/* Midnight rollover: if the app stays open past 12 AM (or the tab is
   brought back next day), refresh so "Today" becomes the new date and
   today's habits show as unticked. History is untouched. */
let lastDayKey = todayKey();
function checkDayChange(){
  const k = todayKey();
  if(k !== lastDayKey){
    lastDayKey = k;
    viewMonth = new Date().getMonth();
    viewYear = new Date().getFullYear();
    selectedCalDay = null;
    renderCurrent();
  }
}
setInterval(checkDayChange, 30000);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) checkDayChange(); });
