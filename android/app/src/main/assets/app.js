/* =====================================================================
   DATA MODEL
===================================================================== */
const ABILITIES = ['Culture','Economy','Loyalty','Stability'];
const RUIN_MAP = {Culture:'Corruption', Economy:'Crime', Stability:'Decay', Loyalty:'Strife'};
const SKILLS = [
  ['Agriculture','Stability'],['Arts','Culture'],['Boating','Economy'],['Defense','Stability'],
  ['Engineering','Stability'],['Exploration','Economy'],['Folklore','Culture'],['Industry','Economy'],
  ['Intrigue','Loyalty'],['Magic','Culture'],['Politics','Loyalty'],['Scholarship','Culture'],
  ['Statecraft','Loyalty'],['Trade','Economy'],['Warfare','Loyalty'],['Wilderness','Stability']
];
const ROLES = [
  ['Ruler','Loyalty'],['Counselor','Culture'],['General','Stability'],['Emissary','Loyalty'],
  ['Magister','Culture'],['Treasurer','Economy'],['Viceroy','Economy'],['Warden','Stability']
];
const GOODS = ['Food','Lumber','Ore','Stone','Luxuries'];
const GOODS_ICON = {Food:'●', Lumber:'▲', Ore:'■', Stone:'◆', Luxuries:'✦'};
const GOVERNMENTS = {
  Despotism:   {boosts:['Stability','Economy'], skills:['Intrigue','Warfare'],     feat:'Crush Dissent'},
  Feudalism:   {boosts:['Stability','Culture'], skills:['Defense','Trade'],        feat:'Fortified Fiefs'},
  Oligarchy:   {boosts:['Loyalty','Economy'],   skills:['Arts','Industry'],        feat:'Insider Trading'},
  Republic:    {boosts:['Stability','Loyalty'], skills:['Engineering','Politics'], feat:'Pull Together'},
  Thaumocracy: {boosts:['Economy','Culture'],   skills:['Folklore','Magic'],       feat:'Practical Magic'},
  Yeomanry:    {boosts:['Loyalty','Culture'],   skills:['Agriculture','Wilderness'], feat:'Muddle Through'}
};
const CHARTERS = {
  Conquest:    {boost:'Loyalty',  flaw:'Culture',  blurb:'Your kingdom was won by force of arms.'},
  Expansion:   {boost:'Culture',  flaw:'Stability', blurb:'Your kingdom grew outward from an existing settlement.'},
  Exploration: {boost:'Stability',flaw:'Economy',  blurb:'Your kingdom was founded to chart unknown land.'},
  Grant:       {boost:'Economy',  flaw:'Loyalty',  blurb:'Your kingdom exists because a crown gave you the land.'},
  Open:        {boost:null,       flaw:null,       blurb:'Your kingdom welcomes anyone, with no single founding story.'}
};
const HEARTLAND_BOOSTS = {
  'Forest or Swamp':  'Culture',
  'Hill or Plain':    'Loyalty',
  'Lake or River':    'Economy',
  'Mountain or Ruins':'Stability'
};
// Named NPCs from the Kingmaker story available as quick-pick leaders.
// Bonus text is intentionally blank — I don't have verified per-NPC role bonuses
// (that lives in the separate Kingmaker Companion Guide, not the core rules I can check).
// Fill in STORY_NPC_BONUS['Name'] = 'description' for any you want flagged; it'll
// only show up next to that NPC once it's non-empty.
// Bump APP_VERSION to match the tag whenever you cut a release, so the app
// can tell you whether a newer one exists. GITHUB_REPO is "owner/name" — update
// it if this ever moves to a different repository.
const APP_VERSION = 'v1.2.0';
const GITHUB_REPO = 'NariderThorn/KingMaker-Beta-Managment';
async function checkForUpdate(){
  const btn = document.getElementById('update-check-btn');
  const resultEl = document.getElementById('update-check-result');
  if(btn){ btn.textContent = 'Checking…'; btn.disabled = true; }
  try{
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if(!res.ok) throw new Error('request failed');
    const data = await res.json();
    if(!data.tag_name) throw new Error('no release found');
    if(data.tag_name === APP_VERSION){
      resultEl.textContent = `You're on the latest version (${APP_VERSION}).`;
    } else {
      resultEl.innerHTML = `A newer version is available: <b>${escapeHtml(data.tag_name)}</b>. <a href="${escapeAttr(data.html_url)}" target="_blank" rel="noopener">Open the release to download it</a> — installing it over this app keeps all your kingdoms.`;
    }
  }catch(e){
    resultEl.textContent = "Couldn't check for updates — check your connection and try again.";
  }
  if(btn){ btn.textContent = 'Check for update'; btn.disabled = false; }
}
function isHotUpdated(){
  try{ return !!localStorage.getItem('hotupdate-app-js'); }catch(e){ return false; }
}
async function applyHotUpdate(){
  const btn = document.getElementById('hot-update-btn');
  const resultEl = document.getElementById('update-check-result');
  if(btn){ btn.textContent = 'Updating…'; btn.disabled = true; }
  try{
    const relRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if(!relRes.ok) throw new Error('could not reach GitHub');
    const rel = await relRes.json();
    const tag = rel.tag_name;
    if(!tag) throw new Error('no release found');
    if(tag === APP_VERSION && !isHotUpdated()){
      resultEl.textContent = `Already on the latest version (${APP_VERSION}).`;
      if(btn){ btn.textContent = '↻ Update now (no reinstall)'; btn.disabled = false; }
      return;
    }
    const [jsRes, cssRes] = await Promise.all([
      fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/${tag}/web/app.js`),
      fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/${tag}/web/style.css`)
    ]);
    if(!jsRes.ok || !cssRes.ok) throw new Error('could not download the update files');
    const jsText = await jsRes.text();
    const cssText = await cssRes.text();
    // sanity check before trusting it — don't brick the app on a bad/partial fetch
    if(jsText.length < 1000 || jsText.indexOf('function render')===-1){
      throw new Error('the downloaded update looked incomplete, so nothing was changed');
    }
    localStorage.setItem('hotupdate-app-js', jsText);
    localStorage.setItem('hotupdate-style-css', cssText);
    resultEl.textContent = `Updated to ${tag} — reloading…`;
    setTimeout(()=>location.reload(), 700);
  }catch(e){
    resultEl.textContent = "Update failed: " + e.message + ". Nothing was changed.";
    if(btn){ btn.textContent = '↻ Update now (no reinstall)'; btn.disabled = false; }
  }
}
function resetToBundledVersion(){
  if(!confirm('This clears the downloaded update and goes back to the version built into the app. Your kingdoms are not affected. Continue?')) return;
  try{
    localStorage.removeItem('hotupdate-app-js');
    localStorage.removeItem('hotupdate-style-css');
  }catch(e){}
  location.reload();
}
async function downloadAndInstallLatestApk(){
  const btn = document.getElementById('full-update-btn');
  const resultEl = document.getElementById('update-check-result');
  if(!window.AndroidUpdater){
    resultEl.textContent = "This only works inside the installed app, not a browser.";
    return;
  }
  if(btn){ btn.textContent = 'Fetching release info…'; btn.disabled = true; }
  try{
    const relRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if(!relRes.ok) throw new Error('could not reach GitHub');
    const rel = await relRes.json();
    const apkAsset = (rel.assets||[]).find(a=>a.name && a.name.toLowerCase().endsWith('.apk'));
    if(!apkAsset) throw new Error('the latest release has no APK attached');
    resultEl.textContent = `Downloading ${rel.tag_name}… you'll get an Android notification, then a confirm screen to finish installing.`;
    window.AndroidUpdater.downloadAndInstall(apkAsset.browser_download_url);
  }catch(e){
    resultEl.textContent = "Couldn't start the update: " + e.message;
  }
  if(btn){ btn.textContent = '⬇ Download & install full update'; btn.disabled = false; }
}
const STORY_NPCS = [
  'Kesten Garess','Jhod Kavken','Jubilost Narezen','Tristian','Harrim','Valerie',
  'Amiri','Regongar','Octavia','Linzi','Ekundayo','Nok-Nok','Shandra Mvashti',
  'Oleg Leveton','Svetlana Leveton'
];
const STORY_NPC_BONUS = {};

// Kingdom Feats — names, levels, and prerequisites are game facts (not
// copyrightable); "effect" is our own short paraphrase of the mechanic, not
// Paizo's published wording. Sourced from the Kingmaker Player's Guide,
// which only covers feats up through level 11 — higher levels use the
// freeform "type your own" fallback in the level-up popup instead.
const KINGDOM_FEATS = {
  'Civil Service':          {level:1,  prereq:null, effect:'Pick a leadership role — it stops taking a vacancy penalty even if unfilled. +2 status bonus to New Leadership checks.'},
  'Cooperative Leadership':  {level:1,  prereq:null, effect:'Aiding another leader through Focused Attention grants a bigger bonus than normal.'},
  'Crush Dissent':          {level:1,  prereq:{skill:'Warfare'}, effect:'Once per turn, attempt a Warfare check to cancel Unrest you were about to gain.'},
  'Fortified Fiefs':        {level:1,  prereq:{skill:'Defense'}, effect:'Bonus to Fortify Hex checks and to building or repairing defensive structures.'},
  'Insider Trading':        {level:1,  prereq:{skill:'Industry'}, effect:'Bonus to trade-related activities, plus one bonus Resource Die every turn.', resourceDie:1},
  'Kingdom Assurance':      {level:1,  prereq:{skillCount:3}, repeatable:true, effect:'Once per turn, take a fixed result instead of rolling for a chosen trained skill.'},
  'Muddle Through':         {level:1,  prereq:{skill:'Wilderness'}, effect:'Raises two of your Ruin thresholds by 1 and one of them by 2.'},
  'Practical Magic':        {level:1,  prereq:{skill:'Magic'}, effect:'Bonus to Magic checks, and Magic can be used in place of Engineering checks.', skillBonus:{skill:'Magic', amt:1}},
  'Pull Together':          {level:1,  prereq:{skill:'Politics'}, effect:'Once per turn, a flat check can downgrade a critical failure to a regular failure.'},
  'Skill Training':         {level:1,  prereq:null, repeatable:true, effect:'Become trained in a Kingdom skill of your choice.', trainsSkill:true},
  'Endure Anarchy':         {level:3,  prereq:{ability:'Loyalty', min:14}, effect:'Unrest-reducing activities remove extra Unrest once it\u2019s high; anarchy kicks in later than normal.'},
  'Inspiring Entertainment':{level:3,  prereq:{ability:'Culture', min:14}, effect:'Can use Culture instead of Loyalty for the Unrest check, with a bonus while any Unrest is present.'},
  'Liquidate Resources':    {level:3,  prereq:{ability:'Economy', min:14}, effect:'Once per turn, avoid dropping to 0 RP at the cost of fewer Resource Dice next turn.'},
  'Quick Recovery':         {level:3,  prereq:{ability:'Stability', min:14}, effect:'Bonus to checks made to end an ongoing harmful kingdom event.'},
  'Free and Fair':          {level:7,  prereq:null, effect:'Bonus to Loyalty checks for New Leadership and Pledge of Fealty; failures can be rerolled for RP.'},
  'Quality of Life':        {level:7,  prereq:null, effect:'Reduces the kingdom\u2019s cost-of-living expenses.'},
  'Fame and Fortune':       {level:11, prereq:null, effect:'Critical successes on Kingdom skill checks grant a bonus Resource Die next turn.'}
};
function featPrereqMet(name){
  const f = KINGDOM_FEATS[name];
  if(!f || !f.prereq) return true;
  if(f.prereq.skill) return state.skills[f.prereq.skill] && state.skills[f.prereq.skill].rank !== 'U';
  if(f.prereq.ability) return abilityScore(f.prereq.ability) >= f.prereq.min;
  if(f.prereq.skillCount) return Object.values(state.skills).filter(s=>s.rank!=='U').length >= f.prereq.skillCount;
  return true;
}
function featAlreadyTaken(name){
  return state.kingdomFeats.some(f=>f.name===name);
}
function featSkillBonus(skillName){
  return state.kingdomFeats.reduce((sum,f)=>{
    const def = KINGDOM_FEATS[f.name];
    return (def && def.skillBonus && def.skillBonus.skill===skillName) ? sum+def.skillBonus.amt : sum;
  }, 0);
}
function featResourceDieBonus(){
  return state.kingdomFeats.reduce((sum,f)=>{
    const def = KINGDOM_FEATS[f.name];
    return (def && def.resourceDie) ? sum+def.resourceDie : sum;
  }, 0);
}
const HEX_TYPE_SYMBOLS = {
  'Capital':'♜\uFE0E', 'Claimed Territory':'⚑\uFE0E',
  'Settlement':'⌂\uFE0E', 'Friendly Camp':'⚐\uFE0E', 'Enemy Base':'⚔\uFE0E',
  'Point of Interest':'★\uFE0E', 'Side Quest':'!', 'Hazard':'☠\uFE0E'
};
const VB_W = 2048, VB_H = 768;
const HEX_S = 42.67;
const ORIGIN_X = 53.0, ORIGIN_Y = 49.0;
const HEX_W = Math.sqrt(3)*HEX_S;
const HEX_VSPACE = 1.5*HEX_S;
const HEX_COLS = Math.ceil((VB_W-ORIGIN_X)/HEX_W)+2;
const HEX_ROWS = Math.ceil((VB_H-ORIGIN_Y)/HEX_VSPACE)+2;
let activeHexKey = null;
const RANK_LABEL = {U:'Untrained', T:'Trained', E:'Expert', M:'Master', L:'Legendary'};
const RANK_BONUS = (rank, level) => rank==='U' ? 0 : level + ({T:2,E:4,M:6,L:8}[rank]);

function sizeRow(size){
  if(size<10) return {die:'1d4', mod:0, storage:4, type:'Territory'};
  if(size<25) return {die:'1d6', mod:1, storage:8, type:'Province'};
  if(size<50) return {die:'1d8', mod:2, storage:12, type:'State'};
  if(size<100) return {die:'1d10', mod:3, storage:16, type:'Country'};
  return {die:'1d12', mod:4, storage:20, type:'Dominion'};
}
const CLAIMED_HEX_TYPES = ['Capital','Claimed Territory','Settlement'];
// Kingdom Size is the number of hexes you've claimed (AoN Rules.aspx?ID=1781) — computed
// fresh from the map rather than hand-typed, same spirit as the ability-score engine below.
function claimedHexCount(){
  return Object.values(state.hexes).filter(h=>h && CLAIMED_HEX_TYPES.includes(h.type)).length;
}
const CONTROL_DC_BY_LEVEL = {1:14,2:15,3:16,4:18,5:20,6:22,7:23,8:24,9:26,10:27,11:28,12:30,13:31,14:32,15:34,16:35,17:36,18:38,19:39,20:40};

/* =====================================================================
   STATE
===================================================================== */
let state = null;
const DEFAULT_STATE = () => ({
  started:false,
  name:'Unnamed Realm', playerCharacter:'', level:1, xp:0, size:1, unrest:0, consumption:0, turn:1,
  fameType:'Fame', fame:0, fameMax:3,
  creation:{charter:'', charterFreeBoost:'', heartland:'', government:'', governmentFreeBoost:'', bonusBoost1:'', bonusBoost2:''},
  levelBoosts:[],
  kingdomFeats:[],
  ruin:{Corruption:{points:0,threshold:10,penalty:0}, Crime:{points:0,threshold:10,penalty:0},
        Decay:{points:0,threshold:10,penalty:0}, Strife:{points:0,threshold:10,penalty:0}},
  skills: SKILLS.reduce((o,[n])=>{o[n]={rank:'U',status:0};return o;},{}),
  leaders: ROLES.reduce((o,[r])=>{o[r]={name:'',invested:false,vacant:false};return o;},{}),
  goods: GOODS.reduce((o,g)=>{o[g]=0;return o;},{}),
  settlements: [],
  log: [],
  hexes:{}
});

/* ---------- computed ability engine: scores are never stored directly,
   they're derived fresh every render from creation choices + level-up boosts ---------- */
function abilitySources(){
  const src = {Culture:[], Economy:[], Loyalty:[], Stability:[]};
  const c = (state && state.creation) || {};
  if(c.charter && CHARTERS[c.charter]){
    const ch = CHARTERS[c.charter];
    if(ch.boost) src[ch.boost].push({label:c.charter, amt:2});
    if(ch.flaw) src[ch.flaw].push({label:c.charter+' flaw', amt:-2});
  }
  if(c.charterFreeBoost) src[c.charterFreeBoost].push({label:(c.charter||'Charter')+' (free)', amt:2});
  if(c.heartland && HEARTLAND_BOOSTS[c.heartland]) src[HEARTLAND_BOOSTS[c.heartland]].push({label:c.heartland, amt:2});
  if(c.government && GOVERNMENTS[c.government]){
    GOVERNMENTS[c.government].boosts.forEach(a=>src[a].push({label:c.government, amt:2}));
  }
  if(c.governmentFreeBoost) src[c.governmentFreeBoost].push({label:(c.government||'Government')+' (free)', amt:2});
  if(c.bonusBoost1) src[c.bonusBoost1].push({label:'Founding boost', amt:2});
  if(c.bonusBoost2) src[c.bonusBoost2].push({label:'Founding boost', amt:2});
  ((state && state.levelBoosts) || []).forEach(b=>{
    if(src[b.ability]) src[b.ability].push({label:`Level ${b.level}`, amt:b.amt});
  });
  return src;
}
function abilityScore(a){
  const sum = (abilitySources()[a]||[]).reduce((s,x)=>s+x.amt, 0);
  return 10 + sum;
}
function skillTrainedSource(skillName){
  const c = (state && state.creation) || {};
  if(c.government && GOVERNMENTS[c.government] && GOVERNMENTS[c.government].skills.includes(skillName)){
    return c.government;
  }
  return null;
}

/* =====================================================================
   PERSISTENCE — multiple kingdoms live side by side:
   kingdom-index -> [{id,name,government,level,updatedAt}, ...] (for the picker)
   kingdom-data-<id> -> that kingdom's full state JSON
===================================================================== */
let saveTimer = null;
let currentKingdomId = null;
let kingdomIndex = [];
const KINGDOM_INDEX_KEY = 'kingdom-index';
const LEGACY_KEY = 'kingdom-tracker-state'; // single-save key from before multi-kingdom support

function newId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function kingdomDataKey(id){ return 'kingdom-data-'+id; }

async function storageSet(key, json){
  if(window.storage && typeof window.storage.set === 'function'){
    try{ await window.storage.set(key, json); return; }
    catch(e){ /* fall through to localStorage */ }
  }
  try{ localStorage.setItem(key, json); }
  catch(e){ console.error('save failed', e); }
}
async function storageGet(key){
  if(window.storage && typeof window.storage.get === 'function'){
    try{
      const res = await window.storage.get(key);
      if(res && res.value) return res.value;
    }catch(e){ /* fall through to localStorage */ }
  }
  try{
    const v = localStorage.getItem(key);
    if(v) return v;
  }catch(e){}
  return null;
}
async function storageRemove(key){
  if(window.storage && typeof window.storage.delete === 'function'){
    try{ await window.storage.delete(key); }catch(e){}
  }
  try{ localStorage.removeItem(key); }catch(e){}
}

async function loadKingdomIndex(){
  const raw = await storageGet(KINGDOM_INDEX_KEY);
  try{ const list = raw ? JSON.parse(raw) : []; return Array.isArray(list) ? list : []; }
  catch(e){ return []; }
}
async function saveKingdomIndex(list){ await storageSet(KINGDOM_INDEX_KEY, JSON.stringify(list)); }
function indexSummary(id, s){
  return { id, name: s.name || 'Unnamed Realm', government: (s.creation && s.creation.government) || '', level: s.level || 1, updatedAt: Date.now() };
}
async function saveCurrentKingdom(){
  if(!currentKingdomId || !state) return;
  await storageSet(kingdomDataKey(currentKingdomId), JSON.stringify(state));
  const idx = kingdomIndex.findIndex(k=>k.id===currentKingdomId);
  const summary = indexSummary(currentKingdomId, state);
  if(idx>=0) kingdomIndex[idx] = summary; else kingdomIndex.push(summary);
  await saveKingdomIndex(kingdomIndex);
}
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveCurrentKingdom, 300);
}
function normalizeState(){
  const d = DEFAULT_STATE();
  for(const k in d){ if(!(k in state)) state[k]=d[k]; }
  if(!state.creation) state.creation = d.creation;
  for(const k in d.creation){ if(!(k in state.creation)) state.creation[k]=d.creation[k]; }
  if(!state.levelBoosts) state.levelBoosts = [];
  if(!state.kingdomFeats) state.kingdomFeats = [];
  if(state.playerCharacter===undefined) state.playerCharacter='';
  for(const s of SKILLS){ if(!state.skills[s[0]]) state.skills[s[0]]={rank:'U',status:0}; }
  for(const r of ROLES){ if(!state.leaders[r[0]]) state.leaders[r[0]]={name:'',invested:false,vacant:false}; }
  for(const g of GOODS){ if(state.goods[g]===undefined) state.goods[g]=0; }
  if(!state.hexes) state.hexes={};
  if(state.government && !state.creation.government){ state.creation.government = state.government; }
  if(state.heartland && state.heartland.terrain && !state.creation.heartland){ state.creation.heartland = state.heartland.terrain; }
  state.started = true;
}
async function migrateLegacySaveIfNeeded(){
  const index = await loadKingdomIndex();
  if(index.length > 0) return index;
  const legacyRaw = await storageGet(LEGACY_KEY);
  if(!legacyRaw) return index;
  try{
    const legacyState = JSON.parse(legacyRaw);
    if(!legacyState || !legacyState.started) return index;
    const id = newId();
    await storageSet(kingdomDataKey(id), JSON.stringify(legacyState));
    index.push(indexSummary(id, legacyState));
    await saveKingdomIndex(index);
  }catch(e){ /* corrupt legacy data — nothing to migrate */ }
  return index;
}
async function openKingdom(id){
  const raw = await storageGet(kingdomDataKey(id));
  if(!raw){
    alert("Could not find that kingdom's data — it may have been deleted.");
    kingdomIndex = await loadKingdomIndex();
    renderCreationScreen();
    return;
  }
  try{ state = JSON.parse(raw); }
  catch(e){ alert("That kingdom's save data looks corrupted and could not be opened."); return; }
  normalizeState();
  currentKingdomId = id;
  enterMainApp();
}
function confirmDeleteKingdom(id){
  const k = kingdomIndex.find(x=>x.id===id);
  const name = k ? k.name : 'this kingdom';
  if(!confirm(`Delete "${name}" permanently? This can't be undone — export a backup first from its Overview tab if you want to keep it.`)) return;
  deleteKingdom(id);
}
async function deleteKingdom(id){
  await storageRemove(kingdomDataKey(id));
  kingdomIndex = kingdomIndex.filter(k=>k.id!==id);
  await saveKingdomIndex(kingdomIndex);
  if(id===currentKingdomId){ currentKingdomId=null; state=null; }
  renderCreationScreen();
}
async function loadState(){
  kingdomIndex = await migrateLegacySaveIfNeeded();
  currentKingdomId = null;
  state = null;
  showKingdomPicker();
}
function exportState(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (state.name||'kingdom').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  const date = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `${safeName || 'kingdom'}-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function importStateFile(fileInput){
  const file = fileInput.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async (e)=>{
    let parsed;
    try{ parsed = JSON.parse(e.target.result); }
    catch(err){
      alert("That file isn't valid kingdom data — nothing was changed.");
      fileInput.value=''; return;
    }
    state = parsed;
    normalizeState();
    currentKingdomId = newId();
    fileInput.value='';
    await saveCurrentKingdom();
    enterMainApp();
  };
  reader.readAsText(file);
}

/* =====================================================================
   HELPERS
===================================================================== */
const mod = score => Math.floor((score-10)/2);
const fmt = n => (n>=0?'+':'')+n;
function unrestPenalty(u){
  if(u>=15) return -4; if(u>=10) return -3; if(u>=5) return -2; if(u>=1) return -1; return 0;
}
function escapeHtml(str){ return (str||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(str){ return escapeHtml(str); }

/* =====================================================================
   BOOT — the kingdom picker shows every launch; opening one enters the app
===================================================================== */
function showKingdomPicker(){
  creationStep = 0;
  document.getElementById('creation-screen').style.display='flex';
  document.getElementById('main-app').style.display='none';
  document.querySelector('nav.bottom').style.display='none';
  renderCreationScreen();
}
function enterMainApp(){
  document.getElementById('creation-screen').style.display='none';
  document.getElementById('main-app').style.display='block';
  document.querySelector('nav.bottom').style.display='flex';
  render();
  buildHexGrid();
}
function openSwitchKingdom(){ showKingdomPicker(); }
function closeSwitchKingdom(){
  if(!currentKingdomId || !state) return;
  enterMainApp();
}

/* =====================================================================
   CREATION SCREEN
===================================================================== */
let creationStep = 0; // 0 = picker, 1 charter, 2 heartland, 3 government, 4 bonus boosts, 5 name
let draft = null;
const CREATION_STEP_COUNT = 5;

function startCreation(){
  draft = {charter:'', charterFreeBoost:'', heartland:'', government:'', governmentFreeBoost:'', bonusBoost1:'', bonusBoost2:'', name:'', playerCharacter:''};
  creationStep = 1;
  renderCreationScreen();
}

function creationStepDots(){
  if(creationStep===0) return '';
  let dots='';
  for(let i=1;i<=CREATION_STEP_COUNT;i++){
    dots += `<div class="dot ${i<creationStep?'done':''} ${i===creationStep?'active':''}"></div>`;
  }
  return `<div class="creation-steps">${dots}</div>`;
}

function abilityBoostPicker(id, current, onPick){
  return `<div class="boost-picker">${ABILITIES.map(a=>
    `<button type="button" class="${current===a?'selected':''}" onclick="${onPick}('${a}')">${a}</button>`
  ).join('')}</div>`;
}

function renderCreationScreen(){
  const el = document.getElementById('creation-screen');
  let body = '';

  if(creationStep===0){
    const hasCurrent = !!(state && currentKingdomId);
    const rows = kingdomIndex.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    body = `
      <div class="creation-crest">
        <div class="glyph">⬡</div>
        <h1>Kingdom Ledger</h1>
        <div class="tag">Stolen Lands</div>
      </div>
      ${hasCurrent ? `<button class="action" onclick="closeSwitchKingdom()">← Back to ${escapeHtml(state.name)}</button>` : ''}
      <button class="${hasCurrent?'ghost':'action'}" style="margin-top:8px;" onclick="startCreation()">+ New Kingdom</button>
      ${rows.length ? `
        <div class="hint" style="margin:16px 0 6px;">Your kingdoms</div>
        <div class="kingdom-list">
          ${rows.map(k=>`
            <div class="kingdom-row ${k.id===currentKingdomId?'current':''}">
              <button type="button" class="kingdom-row-open" onclick="openKingdom('${k.id}')">
                <div class="opt-name">${escapeHtml(k.name)}</div>
                <div class="opt-detail">${k.government?escapeHtml(k.government)+' · ':''}Level ${k.level}${k.updatedAt?' · '+new Date(k.updatedAt).toLocaleDateString():''}</div>
              </button>
              <button type="button" class="kingdom-row-delete" onclick="confirmDeleteKingdom('${k.id}')" title="Delete">✕</button>
            </div>`).join('')}
        </div>` : ''}
      <input type="file" accept="application/json" id="creation-import-input" style="display:none;" onchange="importStateFile(this)">
      <button class="ghost" style="margin-top:14px;" onclick="document.getElementById('creation-import-input').click()">↑ Load from a backup file</button>`;
  }

  else if(creationStep===1){
    body = `
      ${creationStepDots()}
      <h3 style="margin-bottom:4px;">Choose a Charter</h3>
      <div class="hint" style="margin-top:0;margin-bottom:14px;">How your kingdom came to be — grants an ability boost and flaw, plus one free boost anywhere.</div>
      ${Object.entries(CHARTERS).map(([name,c])=>`
        <button type="button" class="option-card ${draft.charter===name?'selected':''}" onclick="pickCharter('${name}')">
          <div class="opt-name">${name}</div>
          <div class="opt-detail">${c.blurb} ${c.boost?`<br><b>+2 ${c.boost}</b>${c.flaw?`, <b style="color:var(--rust);">−2 ${c.flaw}</b>`:''}`:'<br>No fixed boost or flaw.'}</div>
        </button>`).join('')}
      ${draft.charter ? `<div style="margin-top:14px;"><div class="hint" style="margin-top:0;">Free boost — put it anywhere:</div>${abilityBoostPicker('charterFreeBoost', draft.charterFreeBoost, 'pickCharterFreeBoost')}</div>` : ''}
      <div class="creation-nav">
        <button class="ghost" onclick="creationStep=0;renderCreationScreen();">Back</button>
        <button class="action" ${(!draft.charter||!draft.charterFreeBoost)?'disabled style="opacity:.4;"':''} onclick="creationStep=2;renderCreationScreen();">Continue</button>
      </div>`;
  }

  else if(creationStep===2){
    body = `
      ${creationStepDots()}
      <h3 style="margin-bottom:4px;">Choose a Heartland</h3>
      <div class="hint" style="margin-top:0;margin-bottom:14px;">The terrain your capital rises from — grants an ability boost.</div>
      ${Object.entries(HEARTLAND_BOOSTS).map(([terrain,ab])=>`
        <button type="button" class="option-card ${draft.heartland===terrain?'selected':''}" onclick="pickHeartland('${terrain}')">
          <div class="opt-name">${terrain}</div>
          <div class="opt-detail"><b>+2 ${ab}</b></div>
        </button>`).join('')}
      <div class="creation-nav">
        <button class="ghost" onclick="creationStep=1;renderCreationScreen();">Back</button>
        <button class="action" ${!draft.heartland?'disabled style="opacity:.4;"':''} onclick="creationStep=3;renderCreationScreen();">Continue</button>
      </div>`;
  }

  else if(creationStep===3){
    body = `
      ${creationStepDots()}
      <h3 style="margin-bottom:4px;">Choose a Government</h3>
      <div class="hint" style="margin-top:0;margin-bottom:14px;">Grants two ability boosts, one free boost, training in two skills, and a bonus feat.</div>
      ${Object.entries(GOVERNMENTS).map(([name,g])=>`
        <button type="button" class="option-card ${draft.government===name?'selected':''}" onclick="pickGovernment('${name}')">
          <div class="opt-name">${name}</div>
          <div class="opt-detail"><b>+2 ${g.boosts.join('</b> &amp; <b>+2 ')}</b><br>Trained: ${g.skills.join(', ')} · Feat: ${g.feat}</div>
        </button>`).join('')}
      ${draft.government ? `<div style="margin-top:14px;"><div class="hint" style="margin-top:0;">Free boost — put it anywhere:</div>${abilityBoostPicker('governmentFreeBoost', draft.governmentFreeBoost, 'pickGovernmentFreeBoost')}</div>` : ''}
      <div class="creation-nav">
        <button class="ghost" onclick="creationStep=2;renderCreationScreen();">Back</button>
        <button class="action" ${(!draft.government||!draft.governmentFreeBoost)?'disabled style="opacity:.4;"':''} onclick="creationStep=4;renderCreationScreen();">Continue</button>
      </div>`;
  }

  else if(creationStep===4){
    body = `
      ${creationStepDots()}
      <h3 style="margin-bottom:4px;">Two more founding boosts</h3>
      <div class="hint" style="margin-top:0;margin-bottom:14px;">Every kingdom gets two additional free ability boosts — put them wherever you like.</div>
      <div class="hint" style="margin-top:0;">First boost:</div>
      ${abilityBoostPicker('bonusBoost1', draft.bonusBoost1, 'pickBonusBoost1')}
      <div class="hint" style="margin-top:10px;">Second boost:</div>
      ${abilityBoostPicker('bonusBoost2', draft.bonusBoost2, 'pickBonusBoost2')}
      <div class="creation-nav">
        <button class="ghost" onclick="creationStep=3;renderCreationScreen();">Back</button>
        <button class="action" ${(!draft.bonusBoost1||!draft.bonusBoost2)?'disabled style="opacity:.4;"':''} onclick="creationStep=5;renderCreationScreen();">Continue</button>
      </div>`;
  }

  else if(creationStep===5){
    body = `
      ${creationStepDots()}
      <h3 style="margin-bottom:4px;">Name it</h3>
      <div class="hint" style="margin-top:0;margin-bottom:14px;">Last step.</div>
      <div class="row" style="border:none;padding-top:0;">
        <div class="label" style="flex:0 0 90px;">Kingdom</div>
        <input class="wide" type="text" id="draft-name" value="${escapeAttr(draft.name)}" placeholder="Unnamed Realm" oninput="draft.name=this.value;">
      </div>
      <div class="row" style="border:none;">
        <div class="label" style="flex:0 0 90px;">Your Character</div>
        <input class="wide" type="text" id="draft-pc" value="${escapeAttr(draft.playerCharacter)}" placeholder="e.g. Bilbo" oninput="draft.playerCharacter=this.value;">
      </div>
      <div class="creation-nav">
        <button class="ghost" onclick="creationStep=4;renderCreationScreen();">Back</button>
        <button class="action" onclick="finishCreation(this);">Found Your Kingdom</button>
      </div>`;
  }

  el.innerHTML = `<div class="creation-wrap">
    ${creationStep>0 ? `<div class="creation-crest" style="margin-bottom:16px;"><div class="glyph" style="font-size:22px;">⬡</div></div>` : ''}
    ${body}
  </div>`;
}

function pickCharter(name){ draft.charter = draft.charter===name?'':name; draft.charterFreeBoost=''; renderCreationScreen(); }
function pickCharterFreeBoost(a){ draft.charterFreeBoost=a; renderCreationScreen(); }
function pickHeartland(name){ draft.heartland = draft.heartland===name?'':name; renderCreationScreen(); }
function pickGovernment(name){ draft.government = draft.government===name?'':name; draft.governmentFreeBoost=''; renderCreationScreen(); }
function pickGovernmentFreeBoost(a){ draft.governmentFreeBoost=a; renderCreationScreen(); }
function pickBonusBoost1(a){ draft.bonusBoost1=a; renderCreationScreen(); }
function pickBonusBoost2(a){ draft.bonusBoost2=a; renderCreationScreen(); }

async function finishCreation(btn){
  // prove the click was received, before anything else runs, regardless of what happens next
  if(btn){ btn.textContent = 'Founding…'; btn.style.opacity = '0.7'; }
  try{
    if(!draft){ alert('Something reset your progress — please go through the steps again.'); creationStep=0; renderCreationScreen(); return; }
    state = DEFAULT_STATE();
    state.started = true;
    state.name = (draft.name||'').trim() || 'Unnamed Realm';
    state.playerCharacter = (draft.playerCharacter||'').trim();
    state.creation = {
      charter: draft.charter, charterFreeBoost: draft.charterFreeBoost,
      heartland: draft.heartland,
      government: draft.government, governmentFreeBoost: draft.governmentFreeBoost,
      bonusBoost1: draft.bonusBoost1, bonusBoost2: draft.bonusBoost2
    };
    // auto-train the two skills your government grants
    if(GOVERNMENTS[draft.government]){
      GOVERNMENTS[draft.government].skills.forEach(sk=>{ state.skills[sk].rank='T'; });
    }
    currentKingdomId = newId();
    await saveCurrentKingdom();
    enterMainApp();
    startPickCapital();
  } catch(e){
    console.error('finishCreation failed:', e);
    if(btn){ btn.textContent = 'Found Your Kingdom'; btn.style.opacity = '1'; }
    alert('Something went wrong founding your kingdom: ' + e.message + '\n\nYour answers are still on this screen — try Found Your Kingdom again, and if it keeps failing, refresh the page fully (not just the preview) and retry.');
  }
}

/* =====================================================================
   MAIN RENDER
===================================================================== */
function safeRender(fn, tabId){
  try{ fn(); }
  catch(e){
    console.error(fn.name+' failed:', e);
    const el = tabId && document.getElementById(tabId);
    if(el) el.innerHTML = `<div class="card"><h3 style="color:var(--rust);">Something didn't render</h3><div class="hint" style="margin-top:0;">${fn.name} hit an error: ${escapeHtml(e.message)}. The rest of the app should still work — switch tabs and back, or refresh, to retry.</div></div>` + el.innerHTML;
  }
}
function render(){
  document.getElementById('kingdomName').value = state.name;
  safeRender(renderOverview, 'tab-overview');
  safeRender(renderAbilities, 'tab-abilities');
  safeRender(renderLeaders, 'tab-leaders');
  safeRender(renderGoods, 'tab-goods');
  safeRender(renderMapExtras, null);
  safeRender(renderNotesTab, 'tab-notes');
}

/* ---------- OVERVIEW (dashboard) ---------- */
function renderOverview(){
  state.size = Math.max(1, claimedHexCount());
  const sz = sizeRow(state.size);
  const baseDC = CONTROL_DC_BY_LEVEL[Math.min(20,Math.max(1,state.level))] || 14;
  const totalDC = baseDC + sz.mod;
  const diceCount = state.level + 4 + featResourceDieBonus();

  const govHtml = state.creation.government
    ? `<div class="hint" style="margin-top:0;">${state.creation.government} · ${state.creation.charter||'—'} charter · ${state.creation.heartland||'—'}</div>`
    : '';
  const hasCapital = Object.values(state.hexes).some(h=>h && h.type==='Capital');
  const capitalHtml = !hasCapital
    ? `<div class="hint" style="margin-top:6px;color:var(--rust);">Your capital isn't placed on the map yet. <span class="loc-link" style="color:var(--rust);" onclick="startPickCapital()">Place it now</span></div>`
    : '';

  document.getElementById('tab-overview').innerHTML = `
    <div class="card">
      <div class="row" style="border:none;padding-bottom:4px;">
        <div class="label">Your Character</div>
        <input type="text" id="in-pc" value="${escapeAttr(state.playerCharacter)}" placeholder="Character name" style="max-width:160px;" onchange="state.playerCharacter=this.value;scheduleSave();">
      </div>
      ${govHtml}
      ${capitalHtml}
    </div>

    <div class="stat-grid">
      <div class="seal"><div class="val mono">${state.level}</div><div class="lbl">Level</div><div class="sub">${state.xp} XP</div></div>
      <div class="seal"><div class="val mono">${totalDC}</div><div class="lbl">Control DC</div><div class="sub">${sz.type}</div></div>
      <div class="seal"><div class="val mono">${state.size}</div><div class="lbl">Size</div><div class="sub">hexes</div></div>
      <div class="seal"><div class="val mono">${sz.die}×${diceCount}</div><div class="lbl">Resources</div><div class="sub">${featResourceDieBonus()?`RP / turn (+${featResourceDieBonus()} feat)`:'RP / turn'}</div></div>
      <div class="seal"><div class="val mono">${state.unrest}</div><div class="lbl">Unrest</div><div class="sub">${unrestPenalty(state.unrest)<0?fmt(unrestPenalty(state.unrest))+' checks':'no penalty'}</div></div>
      <div class="seal"><div class="val mono">${state.fame}</div><div class="lbl">${state.fameType}</div><div class="sub">of ${state.fameMax}</div></div>
    </div>

    <div class="card">
      <div class="card-head-row"><h3 style="margin-bottom:0;">Commodities</h3><span class="pill">Max ${sz.storage}</span></div>
      <div class="commod-row">
        ${GOODS.map(g=>`
          <div class="commod-cell">
            <div class="icon">${GOODS_ICON[g]}</div>
            <div class="name">${g}</div>
            <div class="val">${state.goods[g]}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-head-row">
        <h3>Leadership</h3>
        <button class="small-ghost" onclick="switchTab('leaders')">Edit</button>
      </div>
      <table class="lead-table">
        <thead><tr><th>Role</th><th>Ability</th><th>Character</th><th>Invested</th></tr></thead>
        <tbody>
          ${ROLES.map(([role,ab])=>{
            const l = state.leaders[role];
            return `<tr>
              <td>${role}</td>
              <td style="color:var(--text-muted);">${ab}</td>
              <td>${l.vacant||!l.name ? '<span style="color:var(--rust);font-style:italic;">Vacant</span>' : escapeHtml(l.name)}</td>
              <td>${l.invested?'<span class="pill" style="color:var(--gold);border-color:var(--gold-dim);">yes</span>':'—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="summary-pair">
      <div class="summary-card">
        <div class="big mono">${Object.keys(state.hexes).length}</div>
        <div class="lbl">Hexes tracked</div>
        <button class="small-ghost" style="margin-top:10px;" onclick="switchTab('map')">View All</button>
      </div>
      <div class="summary-card">
        <div class="big mono">${state.settlements.length}</div>
        <div class="lbl">Settlements</div>
        <button class="small-ghost" style="margin-top:10px;" onclick="switchTab('notes')">View All</button>
      </div>
    </div>

    <div class="card">
      <div class="card-head-row">
        <h3 style="margin-bottom:0;">Turn ${state.turn}</h3>
        <div class="stepper">
          <button onclick="adjust('turn',-1)">−</button>
          <div class="amt mono">${state.turn}</div>
          <button onclick="adjust('turn',1)">+</button>
        </div>
      </div>
      <textarea class="wide" id="in-lognote" placeholder="What happened this turn..." rows="2" style="margin-top:10px;"></textarea>
      <button class="action" onclick="addLogEntry()">Log this turn</button>
      ${state.log.length ? `<div class="divider"></div><div id="log-list">${state.log.map((l,i)=>`
        <div class="log-entry">
          <div class="meta">Turn ${l.turn} <span onclick="removeLogEntry(${i})" style="cursor:pointer;color:var(--rust);float:right;">remove</span></div>
          <div class="note">${escapeHtml(l.note)}</div>
        </div>`).join('')}</div>` : `<div class="empty-state" style="margin-top:10px;"><div class="glyph">◇</div>No turns recorded yet.<div class="sub">Log one above to start tracking.</div></div>`}
    </div>

    <div class="card">
      <h3>Kingdom XP</h3>
      <div class="row">
        <div class="label">Current XP <small>${1000-state.xp>0 ? (1000-state.xp)+' to next level' : 'ready to level up'}</small></div>
        <input class="num" type="number" id="in-xp" value="${state.xp}" onchange="state.xp=Math.max(0,parseInt(this.value)||0);scheduleSave();render();">
      </div>
      <div class="xpbar"><div class="xpbar-fill" style="width:${Math.min(100,state.xp/10)}%"></div></div>
      <div class="row" style="border:none;padding-top:10px;">
        <div class="label">Add XP <small>from this turn's events</small></div>
        <div style="display:flex;gap:6px;">
          <input class="num" type="number" id="in-xp-add" placeholder="0" style="width:56px;">
          <button class="action" style="width:auto;margin:0;padding:7px 12px;" onclick="const v=parseInt(document.getElementById('in-xp-add').value)||0; if(v){state.xp+=v; document.getElementById('in-xp-add').value=''; scheduleSave(); render();}">Add</button>
        </div>
      </div>
      ${state.xp>=1000 && state.level<20 ? `<button class="action" style="background:var(--gold);color:var(--bg);border-color:var(--gold);margin-top:10px;" onclick="doLevelUp()">↑ Level Up to ${state.level+1}!</button>` : ''}
      <div class="hint">At 1,000 XP, level up and subtract 1,000. Max level = party level.</div>
      <div class="two-col" style="margin-top:10px;">
        <div>
          <div class="hint" style="margin-top:0;">Kingdom Level</div>
          <input class="num" type="number" min="1" max="20" value="${state.level}" onchange="state.level=Math.max(1,Math.min(20,parseInt(this.value)||1));scheduleSave();render();">
        </div>
        <div>
          <div class="hint" style="margin-top:0;">Size (hexes)</div>
          <div class="mono" style="font-size:16px;padding:7px 0;">${state.size} <span style="color:var(--text-muted);font-size:11px;">— claimed on the map</span></div>
        </div>
      </div>
    </div>

    ${state.kingdomFeats.length ? `
    <div class="card">
      <h3>Kingdom Feats</h3>
      ${state.kingdomFeats.map((f,i)=>{
        const def = KINGDOM_FEATS[f.name];
        return `
        <div class="row" style="flex-direction:column;align-items:stretch;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <div class="label" style="font-weight:600;">${escapeHtml(f.name)}<small>gained at level ${f.level}</small></div>
            <button class="loc-link" style="color:var(--rust);" onclick="state.kingdomFeats.splice(${i},1);scheduleSave();render();">remove</button>
          </div>
          ${def ? `<div class="hint" style="margin-top:2px;">${escapeHtml(def.effect)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>` : ''}

    <div class="card">
      <h3>Backup</h3>
      <div class="hint" style="margin-top:0;">Your kingdoms are saved on this device only. Export a file to back one up or move it to another device — import that file there to pick up right where you left off.</div>
      <button class="ghost" onclick="exportState()">↓ Export to file</button>
      <input type="file" accept="application/json" id="import-file-input" style="display:none;" onchange="importStateFile(this)">
      <button class="ghost" style="margin-top:8px;" onclick="document.getElementById('import-file-input').click()">↑ Import from file</button>
      <button class="ghost" style="margin-top:8px;" onclick="openSwitchKingdom()">⬡ Create new / load other kingdom</button>
    </div>

    <div class="card">
      <h3>App Version <span class="sub">${APP_VERSION}${isHotUpdated()?' (hot-updated)':''}</span></h3>
      <div class="hint" style="margin-top:0;" id="update-check-result">Installing a newer version over this one keeps all your kingdoms — no need to uninstall first.</div>
      <button class="ghost" id="update-check-btn" style="margin-top:8px;" onclick="checkForUpdate()">Check for update</button>
      <button class="ghost" id="hot-update-btn" style="margin-top:8px;" onclick="applyHotUpdate()">↻ Update app.js/style.css now</button>
      ${window.AndroidUpdater ? `<button class="ghost" id="full-update-btn" style="margin-top:8px;" onclick="downloadAndInstallLatestApk()">⬇ Download &amp; install full update</button>` : ''}
      ${isHotUpdated() ? `<button class="ghost danger-ghost" style="margin-top:8px;" onclick="resetToBundledVersion()">Reset to version built into the app</button>` : ''}
    </div>`;
}

function switchTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  document.getElementById('tab-'+tab).classList.add('active');
  // the header (name/eyebrow/switch-kingdom) only earns its space on the home tab
  document.querySelector('header.top').style.display = (tab==='overview') ? 'flex' : 'none';
  if(tab==='map') setTimeout(measureMapLayout, 0);
}

/* ---------- ABILITIES (cards with tags + integrated Ruin + skills) ---------- */
function renderAbilities(){
  document.getElementById('ability-cards').innerHTML = ABILITIES.map(a=>{
    const score = abilityScore(a);
    const tags = abilitySources()[a]||[];
    const rn = RUIN_MAP[a];
    const ruin = state.ruin[rn];
    const abSkills = SKILLS.filter(([,ab])=>ab===a);
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h3 style="margin-bottom:2px;">${a}</h3>
        </div>
        <div style="text-align:right;">
          <span class="mono" style="font-size:22px;color:var(--text);font-family:'Cinzel',serif;font-weight:700;">${score}</span>
          <span class="mono skill-mod" style="margin-left:8px;">${fmt(mod(score))}</span>
        </div>
      </div>
      ${tags.length ? `<div class="ability-tags">${tags.map(t=>
        `<span class="ability-tag ${t.amt<0?'neg':'pos'}">${escapeHtml(t.label)} ${t.amt>0?'+':''}${t.amt}</span>`
      ).join('')}</div>` : `<div class="hint" style="margin-top:6px;">No boosts yet.</div>`}

      <div class="row" style="margin-top:12px;">
        <div class="label" style="display:flex;align-items:center;gap:6px;"><span style="color:var(--rust);">†</span>${rn}</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="mono" style="font-size:12px;color:${ruin.penalty?'var(--rust)':'var(--text-muted)'};">${ruin.points}/${ruin.threshold}${ruin.penalty?` (${fmt(-ruin.penalty)})`:''}</span>
          <div class="stepper">
            <button onclick="ruinAdjust('${rn}',-1)">−</button>
            <button onclick="ruinAdjust('${rn}',1)">+</button>
          </div>
        </div>
      </div>

      <div style="margin-top:6px;">
        ${abSkills.map(([name])=>{
          const s = state.skills[name];
          const profBonus = RANK_BONUS(s.rank, state.level);
          const featBonus = featSkillBonus(name);
          const total = mod(score) + profBonus + featBonus + (s.status||0) - ruin.penalty - Math.abs(Math.min(0,unrestPenalty(state.unrest)));
          const trainedBy = skillTrainedSource(name);
          return `<div class="row">
            <div class="label">${name}${trainedBy?`<span class="skill-source-icon" title="Trained via ${escapeAttr(trainedBy)}">‡</span>`:''}${featBonus?`<span class="skill-source-icon" title="Feat bonus">✦</span>`:''}<small>${RANK_LABEL[s.rank]}</small></div>
            <div style="display:flex;gap:6px;align-items:center;">
              <select class="rank" onchange="state.skills['${name}'].rank=this.value;scheduleSave();render();">
                ${Object.keys(RANK_LABEL).map(k=>`<option value="${k}" ${s.rank===k?'selected':''}>${RANK_LABEL[k]}</option>`).join('')}
              </select>
              <span class="skill-mod">${fmt(total)}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

/* ---------- LEADERS ---------- */
let customNameRoles = new Set(); // transient UI-only state — which roles currently show the custom-name input
function renderLeaders(){
  const investedCount = ROLES.filter(([r])=>state.leaders[r].invested).length;
  document.getElementById('invested-count').textContent = `${investedCount} / 4 invested`;
  document.getElementById('leaders-list').innerHTML = ROLES.map(([role,ab])=>{
    const l = state.leaders[role];
    const isPreset = STORY_NPCS.includes(l.name);
    const showCustomInput = customNameRoles.has(role) || (l.name && !isPreset);
    return `<div class="row" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="label">${role}<small>key ability: ${ab}</small></div>
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);">
          <input type="checkbox" ${l.invested?'checked':''} onchange="toggleInvest('${role}',this.checked)"> invested
        </label>
      </div>
      <div style="display:flex;gap:8px;margin-top:6px;flex-direction:column;">
        <select class="wide" onchange="handleLeaderSelect('${role}', this.value)">
          <option value="" ${!l.name?'selected':''}>— Vacant —</option>
          ${STORY_NPCS.map(n=>`<option value="${escapeAttr(n)}" ${l.name===n?'selected':''}>${escapeHtml(n)}${STORY_NPC_BONUS[n]?' · '+escapeHtml(STORY_NPC_BONUS[n]):''}</option>`).join('')}
          <option value="__custom__" ${showCustomInput?'selected':''}>Custom…</option>
        </select>
        ${showCustomInput ? `<input class="wide" type="text" placeholder="Custom name" value="${escapeAttr(isPreset?'':l.name)}" onchange="state.leaders['${role}'].name=this.value;scheduleSave();render();">` : ''}
        <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--rust);white-space:nowrap;">
          <input type="checkbox" ${l.vacant?'checked':''} onchange="state.leaders['${role}'].vacant=this.checked;scheduleSave();render();"> vacant
        </label>
      </div>
    </div>`;
  }).join('');
}
function handleLeaderSelect(role, val){
  if(val==='__custom__'){
    customNameRoles.add(role);
    if(STORY_NPCS.includes(state.leaders[role].name)) state.leaders[role].name = '';
  } else {
    customNameRoles.delete(role);
    state.leaders[role].name = val;
  }
  scheduleSave(); render();
}
function toggleInvest(role, checked){
  const investedCount = ROLES.filter(([r])=>state.leaders[r].invested).length;
  if(checked && investedCount>=4){ render(); return; }
  state.leaders[role].invested = checked;
  scheduleSave(); render();
}

/* ---------- GOODS ---------- */
function renderGoods(){
  const sz = sizeRow(state.size);
  document.getElementById('storage-note').textContent = `storage limit ${sz.storage} each`;
  document.getElementById('goods-list').innerHTML = GOODS.map(g=>`
    <div class="row">
      <div class="label">${GOODS_ICON[g]} ${g}</div>
      <div class="stepper">
        <button onclick="goodsAdjust('${g}',-1)">−</button>
        <div class="amt mono">${state.goods[g]}</div>
        <button onclick="goodsAdjust('${g}',1)">+</button>
      </div>
    </div>`).join('');
}
function goodsAdjust(g, delta){
  const sz = sizeRow(state.size);
  state.goods[g] = Math.max(0, Math.min(sz.storage, state.goods[g]+delta));
  scheduleSave(); render();
}
function ruinAdjust(name, delta){
  const r = state.ruin[name];
  r.points = Math.max(0, r.points+delta);
  if(r.points >= r.threshold){ r.points -= r.threshold; r.penalty += 1; }
  scheduleSave(); render();
}
function adjust(key, delta){
  if(key==='unrest') state.unrest = Math.max(0, state.unrest+delta);
  if(key==='fame') state.fame = Math.max(0, Math.min(state.fameMax, state.fame+delta));
  if(key==='turn') state.turn = Math.max(1, state.turn+delta);
  scheduleSave(); render();
}

/* ---------- LEVEL UP ---------- */
function doLevelUp(){
  if(state.xp<1000 || state.level>=20) return;
  state.xp -= 1000;
  state.level += 1;
  scheduleSave();
  const lvl = state.level;
  const getsFeat = lvl>=2 && lvl%2===0;
  const getsSkill = lvl>=3 && lvl%2===1;
  if(getsFeat) showLevelUpPopup('feat', lvl);
  else if(getsSkill) showLevelUpPopup('skill', lvl);
  else render();
}
function showLevelUpPopup(kind, lvl){
  render();
  const overlay = document.createElement('div');
  overlay.id = 'levelup-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  let inner = '';
  if(kind==='feat'){
    const eligible = Object.keys(KINGDOM_FEATS).filter(name=>{
      const f = KINGDOM_FEATS[name];
      if(f.level > lvl) return false;
      if(featAlreadyTaken(name) && !f.repeatable) return false;
      return featPrereqMet(name);
    });
    inner = `
      <h3>Level ${lvl}: Kingdom Feat</h3>
      <div class="hint" style="margin-top:0;">Your kingdom gains a Kingdom Feat this level. Feats you qualify for so far:</div>
      <a href="https://2e.aonprd.com/Rules.aspx?ID=1780" target="_blank" rel="noopener" class="loc-link" style="display:inline-block;margin:4px 0 8px;">↗ Full feat list &amp; rules on Archives of Nethys</a>
      <div style="max-height:38vh;overflow-y:auto;">
        ${eligible.length ? eligible.map(name=>{
          const f = KINGDOM_FEATS[name];
          return `<button type="button" class="option-card" onclick="selectKingdomFeat('${name}',${lvl})">
            <div class="opt-name">${name} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(level ${f.level})</span></div>
            <div class="opt-detail">${escapeHtml(f.effect)}</div>
          </button>`;
        }).join('') : `<div class="hint" style="margin-top:0;">Nothing from our built-in list fits yet (level ${lvl}, current training/abilities) — this list only covers levels 1\u201311. Check the link above for the rest.</div>`}
      </div>
      <div class="hint" style="margin:10px 0 4px;">Or log a different one by name:</div>
      <input class="wide" type="text" id="levelup-feat-name" placeholder="Feat name">
      <button class="action" onclick="confirmFeatChoice(${lvl})">Confirm</button>
      <button class="ghost" style="margin-top:8px;" onclick="closeLevelUpPopup()">Skip for now</button>`;
  } else {
    const eligible = SKILLS.filter(([name])=>{
      const r = state.skills[name].rank;
      if(r==='U'||r==='T') return true;
      if(r==='E' && lvl>=7) return true;
      if(r==='M' && lvl>=15) return true;
      return false;
    });
    inner = `
      <h3>Level ${lvl}: Skill Increase</h3>
      <div class="hint" style="margin-top:0;">Train a new skill, or raise the rank of one you already have.</div>
      <div style="margin-top:10px;max-height:48vh;overflow-y:auto;">
        ${eligible.map(([name,ab])=>{
          const r = state.skills[name].rank;
          const next = r==='U'?'T':r==='T'?'E':r==='E'?'M':'L';
          return `<button type="button" class="option-card" onclick="confirmSkillIncrease('${name}','${next}')">
            <div class="opt-name">${name} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(${ab})</span></div>
            <div class="opt-detail">${RANK_LABEL[r]} → <b>${RANK_LABEL[next]}</b></div>
          </button>`;
        }).join('')}
      </div>
      <button class="ghost" style="margin-top:8px;" onclick="closeLevelUpPopup()">Skip for now</button>`;
  }
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">${inner}</div>`;
  document.body.appendChild(overlay);
}
function closeLevelUpPopup(){
  const el = document.getElementById('levelup-overlay');
  if(el) el.remove();
  render();
}
function selectKingdomFeat(name, lvl){
  if(KINGDOM_FEATS[name] && KINGDOM_FEATS[name].trainsSkill){
    showSkillTrainingSubPicker(name, lvl);
    return;
  }
  applyAndLogFeat(name, lvl);
  closeLevelUpPopup();
}
function showSkillTrainingSubPicker(name, lvl){
  const overlay = document.getElementById('levelup-overlay');
  const untrained = SKILLS.filter(([n])=>state.skills[n].rank==='U');
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <h3>${name}</h3>
    <div class="hint" style="margin-top:0;">Which skill?</div>
    <div style="margin-top:8px;max-height:48vh;overflow-y:auto;">
      ${untrained.length ? untrained.map(([n,ab])=>`
        <button type="button" class="option-card" onclick="applyAndLogFeat('${name}',${lvl},'${n}');closeLevelUpPopup();">
          <div class="opt-name">${n} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(${ab})</span></div>
        </button>`).join('') : `<div class="hint" style="margin-top:0;">Every skill is already trained.</div>`}
    </div>
    <button class="ghost" style="margin-top:8px;" onclick="closeLevelUpPopup()">Skip for now</button>
  </div>`;
}
function applyAndLogFeat(name, lvl, trainedSkill){
  const f = KINGDOM_FEATS[name];
  if(f && f.trainsSkill && trainedSkill){
    state.skills[trainedSkill].rank = 'T';
  }
  state.kingdomFeats.push({level:lvl, name});
  scheduleSave();
}
function confirmFeatChoice(lvl){
  const name = document.getElementById('levelup-feat-name').value.trim();
  if(name) applyAndLogFeat(name, lvl);
  closeLevelUpPopup();
}
function confirmSkillIncrease(name, newRank){
  state.skills[name].rank = newRank;
  scheduleSave();
  closeLevelUpPopup();
}

function addLogEntry(){
  const note = document.getElementById('in-lognote').value.trim();
  if(!note) return;
  state.log.unshift({turn:state.turn, note});
  scheduleSave(); render();
}
function removeLogEntry(i){ state.log.splice(i,1); scheduleSave(); render(); }

/* ---------- SETTLEMENTS ---------- */
function addSettlement(){
  const id = Date.now();
  state.settlements.push({id, name:'New Settlement', type:'Village', structures:[]});
  scheduleSave(); render();
  // send them straight to the map to place it, so it isn't a "floating" settlement with nowhere shown
  startPickLocation(id);
}
function removeSettlement(id){
  const s = state.settlements.find(x=>x.id===id);
  if(s && s.col!==undefined && s.row!==undefined){
    const key = hexKey(s.col,s.row);
    if(state.hexes[key] && state.hexes[key].type==='Settlement' && state.hexes[key].name===s.name){
      delete state.hexes[key];
    }
  }
  state.settlements = state.settlements.filter(s=>s.id!==id);
  scheduleSave(); render();
}
function addStructure(id, val){
  if(!val.trim()) return;
  const s = state.settlements.find(x=>x.id===id);
  s.structures.push(val.trim());
  scheduleSave(); render();
}
function removeStructure(id, idx){
  const s = state.settlements.find(x=>x.id===id);
  s.structures.splice(idx,1);
  scheduleSave(); render();
}
function renameSettlement(id, val){
  const s = state.settlements.find(s=>s.id===id);
  if(s.col!==undefined && s.row!==undefined){
    const key = hexKey(s.col,s.row);
    if(state.hexes[key] && state.hexes[key].type==='Settlement' && state.hexes[key].name===s.name){
      state.hexes[key].name = val;
    }
  }
  s.name = val;
  scheduleSave();
  renderNotesTab();
}
function retypeSettlement(id, val){ state.settlements.find(s=>s.id===id).type = val; scheduleSave(); }

let pickingForSettlement = null;
let pickingCapital = false;
let pendingPickHex = null; // {col,row} tapped but not yet confirmed, while in pick mode

function startPickLocation(id){
  const s = state.settlements.find(x=>x.id===id);
  if(!s) return;
  pickingForSettlement = id;
  pendingPickHex = null;
  switchTab('map');
  renderPickBanner(`Tap a hex to set as ${escapeHtml(s.name)}'s location`);
}
function startPickCapital(){
  pickingCapital = true;
  pendingPickHex = null;
  switchTab('map');
  renderPickBanner(`Tap a hex to place your capital — where does ${escapeHtml(state.name)} rise?`);
}
function renderPickBanner(promptText){
  document.getElementById('map-pick-text').textContent = promptText;
  document.getElementById('map-pick-actions').innerHTML = `<button class="ghost" style="margin:0;" onclick="cancelPickLocation()">Cancel</button>`;
  document.getElementById('map-float-pick-banner').style.display = 'block';
  const svg = document.getElementById('hexoverlay');
  if(svg) svg.querySelectorAll('.hex-cell').forEach(p=>{ p.classList.add('picking'); p.classList.remove('pending-confirm'); });
}
function onHexTapDuringPick(col,row){
  pendingPickHex = {col,row};
  const svg = document.getElementById('hexoverlay');
  if(svg){
    svg.querySelectorAll('.hex-cell').forEach(p=>p.classList.remove('pending-confirm'));
    const poly = svg.querySelector(`[data-key="${hexKey(col,row)}"]`);
    if(poly) poly.classList.add('pending-confirm');
  }
  document.getElementById('map-pick-text').textContent = `Place it at ${hexLabel(col,row)}?`;
  document.getElementById('map-pick-actions').innerHTML = `
    <button class="ghost" style="margin:0;" onclick="cancelPickLocation()">Cancel</button>
    <button class="action" style="margin:0;" onclick="confirmPick()">Confirm ${hexLabel(col,row)}</button>`;
}
function confirmPick(){
  if(!pendingPickHex) return;
  const {col,row} = pendingPickHex;
  if(pickingCapital) pinCapitalLocation(col,row);
  else if(pickingForSettlement) pinSettlementLocation(col,row);
}
function pinCapitalLocation(col,row){
  const key = hexKey(col,row);
  const existing = state.hexes[key] || {note:''};
  state.hexes[key] = {name: state.name, type:'Capital', note: existing.note||'', resources: existing.resources||'', features: existing.features||''};
  cancelPickLocation();
  scheduleSave();
  updateHexMarkers();
  renderNotesTab();
  render();
}
function cancelPickLocation(){
  pickingForSettlement = null;
  pickingCapital = false;
  pendingPickHex = null;
  document.getElementById('map-float-pick-banner').style.display = 'none';
  const svg = document.getElementById('hexoverlay');
  if(svg) svg.querySelectorAll('.hex-cell').forEach(p=>{ p.classList.remove('picking'); p.classList.remove('pending-confirm'); });
}
function pinSettlementLocation(col,row){
  const s = state.settlements.find(x=>x.id===pickingForSettlement);
  cancelPickLocation();
  if(!s) return;
  if(s.col!==undefined && s.row!==undefined){
    const oldKey = hexKey(s.col,s.row);
    if(state.hexes[oldKey] && state.hexes[oldKey].type==='Settlement' && state.hexes[oldKey].name===s.name){
      delete state.hexes[oldKey];
    }
  }
  s.col = col; s.row = row;
  const key = hexKey(col,row);
  const existing = state.hexes[key] || {name:'',type:'',note:'',resources:'',features:''};
  state.hexes[key] = {name: s.name, type:'Settlement', note: existing.note||'', resources: existing.resources||'', features: existing.features||''};
  scheduleSave();
  updateHexMarkers();
  renderNotesTab();
  switchTab('notes');
  render();
}

function renderSettlementsList(){
  document.getElementById('settlements-list').innerHTML = state.settlements.map(s=>`
    <div class="settlement">
      <div class="settlement-head">
        <input type="text" value="${escapeAttr(s.name)}" style="font-family:'Cinzel',serif;font-weight:600;background:none;border:none;font-size:16px;padding:0;flex:1;"
          onchange="renameSettlement(${s.id}, this.value)">
        <select class="type-select" style="width:auto;" onchange="retypeSettlement(${s.id}, this.value)">
          ${['Village','Town','City','Metropolis'].map(t=>`<option ${s.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="settlement-loc">
        ${s.col!==undefined ? `
          <span class="loc-pin">⌖ ${hexLabel(s.col,s.row)}</span>
          <button class="loc-link" onclick="jumpToHex(${s.col},${s.row})">view</button>
          <button class="loc-link" onclick="startPickLocation(${s.id})">move</button>
        ` : `
          <button class="loc-link" onclick="startPickLocation(${s.id})">⌖ Set location on map</button>
        `}
      </div>
      <div>${s.structures.map((st,idx)=>`<span class="tag">${escapeHtml(st)}<button onclick="removeStructure(${s.id},${idx})">✕</button></span>`).join('')}</div>
      <div class="tag-input-row">
        <input class="wide" type="text" placeholder="Add structure (e.g. Granary)" id="struct-in-${s.id}">
        <button class="action" style="width:auto;margin:0;" onclick="addStructure(${s.id}, document.getElementById('struct-in-${s.id}').value); document.getElementById('struct-in-${s.id}').value='';">Add</button>
      </div>
      <button class="ghost danger-ghost" style="margin-top:8px;" onclick="removeSettlement(${s.id})">Remove settlement</button>
    </div>`).join('') || '<div class="hint">No settlements founded yet.</div>';
}

/* =====================================================================
   HEX MAP
===================================================================== */
function colToLetter(col){
  let n = col, s = '';
  do { s = String.fromCharCode(65 + (n%26)) + s; n = Math.floor(n/26)-1; } while(n>=0);
  return s;
}
function hexKey(col,row){ return col+'_'+row; }
function hexLabel(col,row){ return colToLetter(col)+(row+1); }
function hexCenter(col,row){
  const x = ORIGIN_X + col*HEX_W + (row%2!==0 ? HEX_W/2 : 0);
  const y = ORIGIN_Y + row*HEX_VSPACE;
  return [x,y];
}
function hexPoints(cx,cy){
  let pts=[];
  for(let i=0;i<6;i++){
    const ang = Math.PI/180*(60*i-30);
    pts.push((cx+HEX_S*Math.cos(ang)).toFixed(1)+','+(cy+HEX_S*Math.sin(ang)).toFixed(1));
  }
  return pts.join(' ');
}

/* ---------- zoom / pan engine ---------- */
let mapZoom = 1, mapPanX = 0, mapPanY = 0;
let mapNaturalW = 0, mapNaturalH = 0;
const MAP_MIN_ZOOM = 1, MAP_MAX_ZOOM = 6;

function measureMapLayout(){
  const header = document.querySelector('header.top');
  const nav = document.querySelector('nav.bottom');
  const wrap = document.getElementById('map-fullscreen-wrap');
  if(!header || !nav || !wrap) return;
  // measure off window.innerWidth/innerHeight directly rather than trusting the
  // position:fixed wrapper's own clientWidth/clientHeight, which was reporting a
  // much smaller box than the real viewport in some embedded/preview contexts
  const headerH = header.style.display==='none' ? 0 : header.getBoundingClientRect().height;
  const navH = nav.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--map-top', headerH+'px');
  document.documentElement.style.setProperty('--map-bottom', navH+'px');
  const viewW = window.innerWidth;
  const viewH = window.innerHeight - headerH - navH;
  wrap.style.top = headerH+'px';
  wrap.style.bottom = 'auto';
  wrap.style.width = viewW+'px';
  wrap.style.height = viewH+'px';
  if(viewW>0 && viewH>0){
    const imgAspect = VB_W/VB_H;
    // always fill the full available height — width is whatever that implies (often
    // wider than the screen, which is fine, that's what panning is for). This is what
    // keeps the default view from looking small with empty space above/below it.
    mapNaturalH = viewH;
    mapNaturalW = viewH * imgAspect;
    document.getElementById('mapimg').style.width = mapNaturalW+'px';
    resetMapView();
  }
}
function applyMapTransform(){
  const canvas = document.getElementById('map-canvas');
  if(canvas) canvas.style.transform = `translate(${mapPanX}px, ${mapPanY}px) scale(${mapZoom})`;
}
function clampZoomVal(z){ return Math.max(MAP_MIN_ZOOM, Math.min(MAP_MAX_ZOOM, z)); }
function clampMapPan(){
  const wrap = document.getElementById('map-fullscreen-wrap');
  if(!wrap || !mapNaturalW) return;
  const viewW = wrap.clientWidth, viewH = wrap.clientHeight;
  const contentW = mapNaturalW*mapZoom, contentH = mapNaturalH*mapZoom;
  mapPanX = contentW<=viewW ? (viewW-contentW)/2 : Math.min(0, Math.max(viewW-contentW, mapPanX));
  mapPanY = contentH<=viewH ? (viewH-contentH)/2 : Math.min(0, Math.max(viewH-contentH, mapPanY));
}
function zoomMapAt(clientX, clientY, newZoom){
  const wrap = document.getElementById('map-fullscreen-wrap');
  if(!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const localX = clientX - rect.left, localY = clientY - rect.top;
  const canvasX = (localX - mapPanX) / mapZoom;
  const canvasY = (localY - mapPanY) / mapZoom;
  mapZoom = clampZoomVal(newZoom);
  mapPanX = localX - canvasX*mapZoom;
  mapPanY = localY - canvasY*mapZoom;
  clampMapPan();
  applyMapTransform();
}
function mapZoomStep(factor){
  const wrap = document.getElementById('map-fullscreen-wrap');
  if(!wrap) return;
  const rect = wrap.getBoundingClientRect();
  zoomMapAt(rect.left+rect.width/2, rect.top+rect.height/2, mapZoom*factor);
}
function resetMapView(){
  mapZoom = 1; mapPanX = 0; mapPanY = 0;
  clampMapPan();
  applyMapTransform();
}

/* pointer-driven pan + pinch, with tap-vs-drag detection */
let mapPointers = new Map();
let mapDragMoved = false;
let mapPanStart = null;
let mapPinchStartDist = 0, mapPinchStartZoom = 1;

function mapOnPointerDown(e){
  const wrap = document.getElementById('map-fullscreen-wrap');
  mapPointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
  mapDragMoved = false;
  if(mapPointers.size===1){
    mapPanStart = {x:e.clientX, y:e.clientY, panX:mapPanX, panY:mapPanY};
  } else if(mapPointers.size===2){
    const pts = [...mapPointers.values()];
    mapPinchStartDist = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y) || 1;
    mapPinchStartZoom = mapZoom;
    mapPanStart = null;
  }
  if(wrap && wrap.setPointerCapture){ try{ wrap.setPointerCapture(e.pointerId); }catch(err){} }
}
function mapOnPointerMove(e){
  if(!mapPointers.has(e.pointerId)) return;
  mapPointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if(mapPointers.size===2){
    const pts = [...mapPointers.values()];
    const dist = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
    const midX = (pts[0].x+pts[1].x)/2, midY = (pts[0].y+pts[1].y)/2;
    zoomMapAt(midX, midY, mapPinchStartZoom * (dist/mapPinchStartDist));
    mapDragMoved = true;
  } else if(mapPointers.size===1 && mapPanStart){
    const dx = e.clientX-mapPanStart.x, dy = e.clientY-mapPanStart.y;
    if(Math.hypot(dx,dy) > 5) mapDragMoved = true;
    mapPanX = mapPanStart.panX + dx;
    mapPanY = mapPanStart.panY + dy;
    clampMapPan();
    applyMapTransform();
  }
}
function mapOnPointerUp(e){
  mapPointers.delete(e.pointerId);
  if(mapPointers.size<2) mapPinchStartDist = 0;
  if(mapPointers.size===0) mapPanStart = null;
}
function mapOnWheel(e){
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.18 : 1/1.18;
  zoomMapAt(e.clientX, e.clientY, mapZoom*factor);
}

/* screen position (fixed-coords) of a hex, for placing the tap popup */
function hexScreenPos(col,row){
  const wrap = document.getElementById('map-fullscreen-wrap');
  const rect = wrap.getBoundingClientRect();
  const [svgX,svgY] = hexCenter(col,row);
  const pxX = (svgX/VB_W) * mapNaturalW;
  const pxY = (svgY/VB_H) * mapNaturalH;
  return { x: rect.left + pxX*mapZoom + mapPanX, y: rect.top + pxY*mapZoom + mapPanY };
}

function buildHexGrid(){
  const svg = document.getElementById('hexoverlay');
  if(!svg) return;
  svg.innerHTML = '';
  const frag = document.createDocumentFragment();
  for(let col=0; col<HEX_COLS; col++){
    for(let row=0; row<HEX_ROWS; row++){
      const [cx,cy] = hexCenter(col,row);
      if(cy - HEX_S*2 > VB_H || cx - HEX_W > VB_W) continue;
      const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
      poly.setAttribute('points', hexPoints(cx,cy));
      poly.setAttribute('class','hex-cell');
      poly.dataset.key = hexKey(col,row);
      poly.dataset.col = col;
      poly.dataset.row = row;
      poly.addEventListener('click', ()=>{
        if(mapDragMoved){ mapDragMoved=false; return; }
        handleHexTap(col,row);
      });
      frag.appendChild(poly);
    }
  }
  svg.appendChild(frag);
  updateHexMarkers();
}
function updateHexMarkers(){
  const svg = document.getElementById('hexoverlay');
  if(!svg) return;
  svg.querySelectorAll('.hex-marker, .hex-marker-label').forEach(t=>t.remove());
  const frag = document.createDocumentFragment();
  Object.keys(state.hexes).forEach(key=>{
    const h = state.hexes[key];
    if(!h || !h.type || !HEX_TYPE_SYMBOLS[h.type]) return;
    const [col,row] = key.split('_').map(Number);
    const [cx,cy] = hexCenter(col,row);
    const text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('x', cx.toFixed(1));
    text.setAttribute('y', cy.toFixed(1));
    text.setAttribute('class','hex-marker');
    text.textContent = HEX_TYPE_SYMBOLS[h.type];
    frag.appendChild(text);
    if(h.name){
      const label = document.createElementNS('http://www.w3.org/2000/svg','text');
      label.setAttribute('x', cx.toFixed(1));
      label.setAttribute('y', (cy+HEX_S*0.55).toFixed(1));
      label.setAttribute('class','hex-marker-label');
      label.textContent = h.name.length>16 ? h.name.slice(0,15)+'…' : h.name;
      frag.appendChild(label);
    }
  });
  svg.appendChild(frag);
}

/* ---------- tap routing: pick-mode (confirm step) vs normal (contextual popup) ---------- */
function handleHexTap(col,row){
  closeHexTapPopup();
  if(pickingForSettlement || pickingCapital){ onHexTapDuringPick(col,row); return; }
  showHexTapPopup(col,row);
}
let hexTapDismissListener = null;
function showHexTapPopup(col,row){
  const pos = hexScreenPos(col,row);
  const h = state.hexes[hexKey(col,row)];
  const svg = document.getElementById('hexoverlay');
  if(svg){
    svg.querySelectorAll('.hex-cell.selected').forEach(p=>p.classList.remove('selected'));
    const poly = svg.querySelector(`[data-key="${hexKey(col,row)}"]`);
    if(poly) poly.classList.add('selected');
  }
  const popup = document.createElement('div');
  popup.id = 'hex-tap-popup';
  popup.style.visibility = 'hidden';
  popup.innerHTML = `
    <div class="popup-caption">${hexLabel(col,row)}${h && h.name ? ' · '+escapeHtml(h.name) : ''}</div>
    <button type="button" data-action="marker">${h && h.type ? '✎ Edit marker' : '+ Add marker'}</button>
    <button type="button" data-action="note">${h && h.note ? '✎ Edit note' : '+ Add note'}</button>
  `;
  // real click handlers on real element references, not inline attribute strings —
  // and stopPropagation so the outside-click dismiss logic below never sees these
  popup.addEventListener('click', e=>{
    e.stopPropagation();
    const action = e.target.closest && e.target.closest('button[data-action]');
    if(action){ openHexPanel(col,row); closeHexTapPopup(); }
  });
  document.body.appendChild(popup);

  // measure its real rendered size, then place it clear of the hex itself:
  // right by default, left only if the right side genuinely doesn't have room
  const popupW = popup.offsetWidth || 180;
  const popupH = popup.offsetHeight || 110;
  const hexRadiusPx = HEX_S * (mapNaturalW/VB_W) * mapZoom;
  const margin = 10, gap = 10;

  let left;
  if(pos.x + hexRadiusPx + gap + popupW <= window.innerWidth - margin){
    left = pos.x + hexRadiusPx + gap; // fits on the right
  } else {
    left = pos.x - hexRadiusPx - gap - popupW; // fall back to the left
  }
  left = Math.max(margin, Math.min(left, window.innerWidth - popupW - margin));

  let top = pos.y - popupH/2;
  top = Math.max(margin, Math.min(top, window.innerHeight - popupH - margin));

  popup.style.left = left+'px';
  popup.style.top = top+'px';
  popup.style.visibility = 'visible';

  // deliberately deferred: document is an ancestor this same click hasn't bubbled
  // to yet, so attaching synchronously would let it catch its own opening tap and
  // immediately close the popup it just opened. Next tick avoids that, and the
  // popup's own stopPropagation (above) keeps its own button clicks from reaching this.
  // Tracked in a variable (rather than just {once:true}) so closeHexTapPopup can always
  // clean it up explicitly too — otherwise a listener skipped via stopPropagation is
  // never "consumed" and lingers to wrongly fire on some later, unrelated click.
  hexTapDismissListener = closeHexTapPopup;
  setTimeout(()=>{
    if(hexTapDismissListener) document.addEventListener('click', hexTapDismissListener, {once:true});
  }, 0);
}
function closeHexTapPopup(){
  if(hexTapDismissListener){
    document.removeEventListener('click', hexTapDismissListener);
    hexTapDismissListener = null;
  }
  const el = document.getElementById('hex-tap-popup');
  if(el) el.remove();
  // only clear the highlight here if the full edit panel isn't the one now showing it
  if(!document.getElementById('hex-panel').classList.contains('open')){
    const svg = document.getElementById('hexoverlay');
    if(svg) svg.querySelectorAll('.hex-cell.selected').forEach(p=>p.classList.remove('selected'));
  }
}

function openHexPanel(col,row){
  activeHexKey = hexKey(col,row);
  const svg = document.getElementById('hexoverlay');
  if(svg){
    svg.querySelectorAll('.hex-cell.selected').forEach(p=>p.classList.remove('selected'));
    const poly = svg.querySelector(`[data-key="${activeHexKey}"]`);
    if(poly) poly.classList.add('selected');
  }
  const h = state.hexes[activeHexKey] || {name:'',type:'',note:'',resources:'',features:''};
  document.getElementById('hex-panel-title').textContent = 'Hex '+hexLabel(col,row);
  document.getElementById('hex-name').value = h.name||'';
  document.getElementById('hex-type').value = h.type||'';
  document.getElementById('hex-resources').value = h.resources||'';
  document.getElementById('hex-features').value = h.features||'';
  document.getElementById('hex-note').value = h.note||'';
  document.getElementById('hex-panel').classList.add('open');
}
function closeHexPanel(){
  const svg = document.getElementById('hexoverlay');
  if(svg) svg.querySelectorAll('.hex-cell.selected').forEach(p=>p.classList.remove('selected'));
  activeHexKey = null;
  document.getElementById('hex-panel').classList.remove('open');
}
function saveHex(){
  if(!activeHexKey) return;
  const name = document.getElementById('hex-name').value.trim();
  const type = document.getElementById('hex-type').value;
  const resources = document.getElementById('hex-resources').value.trim();
  const features = document.getElementById('hex-features').value.trim();
  const note = document.getElementById('hex-note').value.trim();
  if(!name && !type && !note && !resources && !features){
    delete state.hexes[activeHexKey];
  } else {
    state.hexes[activeHexKey] = {name,type,note,resources,features};
  }
  scheduleSave();
  updateHexMarkers();
  renderNotesTab();
  render();
  closeHexPanel();
}
function renderMapExtras(){
  document.getElementById('map-legend').innerHTML = Object.keys(HEX_TYPE_SYMBOLS).map(t=>
    `<span class="legend-item"><span class="legend-swatch">${HEX_TYPE_SYMBOLS[t]}</span>${t}</span>`
  ).join('');
  updateHexMarkers();
}

/* ---------- NOTES ---------- */
function renderNotesTab(){
  renderSettlementsList();
  const list = document.getElementById('notes-list');
  if(!list) return;
  const typeOrder = Object.keys(HEX_TYPE_SYMBOLS);
  const entries = Object.keys(state.hexes)
    .map(key=>{ const [col,row] = key.split('_').map(Number); return {key, col, row, ...state.hexes[key]}; })
    .filter(e=>e.name || e.type || e.note || e.resources || e.features)
    .sort((a,b)=>{
      const ta = typeOrder.indexOf(a.type), tb = typeOrder.indexOf(b.type);
      if(ta !== tb) return (ta===-1?999:ta) - (tb===-1?999:tb);
      return hexLabel(a.col,a.row).localeCompare(hexLabel(b.col,b.row));
    });
  if(!entries.length){
    list.innerHTML = '<div class="notes-empty">No notes yet — tap any hex on the map to mark a side quest, camp, point of interest, or hazard.</div>';
    return;
  }
  list.innerHTML = entries.map(e=>{
    const symbol = e.type && HEX_TYPE_SYMBOLS[e.type] ? HEX_TYPE_SYMBOLS[e.type] : '·';
    const tags = [e.resources ? 'Resources: '+e.resources : '', e.features ? 'Features: '+e.features : ''].filter(Boolean).join(' · ');
    return `<button class="note-item" onclick="jumpToHex(${e.col},${e.row})">
      <span class="note-dot">${symbol}</span>
      <span class="note-body">
        <span class="note-toprow">
          <span class="note-name">${escapeHtml(e.name) || '(unnamed)'}</span>
          <span class="note-hexlabel">${hexLabel(e.col,e.row)}</span>
        </span>
        ${e.type ? `<div class="note-type">${escapeHtml(e.type)}</div>` : ''}
        ${tags ? `<div class="note-type">${escapeHtml(tags)}</div>` : ''}
        ${e.note ? `<div class="note-text">${escapeHtml(e.note)}</div>` : ''}
      </span>
    </button>`;
  }).join('');
}
function jumpToHex(col,row){
  switchTab('map');
  openHexPanel(col,row);
}

/* =====================================================================
   BINDINGS
===================================================================== */
document.getElementById('kingdomName').addEventListener('input', e=>{ state.name=e.target.value; scheduleSave(); });
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>switchTab(btn.dataset.tab));
});
(function(){
  const wrap = document.getElementById('map-fullscreen-wrap');
  wrap.addEventListener('pointerdown', mapOnPointerDown);
  wrap.addEventListener('pointermove', mapOnPointerMove);
  wrap.addEventListener('pointerup', mapOnPointerUp);
  wrap.addEventListener('pointercancel', mapOnPointerUp);
  wrap.addEventListener('wheel', mapOnWheel, {passive:false});
})();
window.addEventListener('resize', ()=>{ if(document.getElementById('tab-map').classList.contains('active')) measureMapLayout(); });

loadState();
