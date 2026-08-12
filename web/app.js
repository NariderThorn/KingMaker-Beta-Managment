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
// Kingdom activities carrying the Leadership trait (2e.aonprd.com/Traits.aspx?ID=439) —
// confirmed individually against each activity's own Actions.aspx page, not assumed from
// the name. Several activities that sound Leadership-flavored actually aren't (New
// Leadership is Downtime+Upkeep; Improve Lifestyle and Tap Treasury are Commerce+Downtime)
// and are deliberately left out. `skills` lists every option the activity allows.
//
// Every entry with `outcomes` is mechanically resolved the same way Commerce/Region
// activities are (openDegreePicker -> a resolve function that actually moves RP/Unrest/
// Ruin/Fame/XP/Commodities/hexes/settlements), not just logged. Two activities are
// deliberately left as log-only (no `outcomes`, see LEADERSHIP_MANUAL_ONLY below) because
// their real effect needs a concept the app doesn't track: Hire Adventurers ends a
// "continuous event," and the app has no persisted event registry to end; Focused Attention
// grants a bonus to another leader's *check*, and the app never rolls checks for the
// player, so — unlike other circumstance bonuses here, which at least land on a state
// value the player later reads off (RP, a die-size table, etc.) — there is no state that
// bonus could attach to. That's a real gap, not an oversight; see the Leadership Activities
// memory note if this file's context is unfamiliar with why it stays that way.
const LEADERSHIP_ACTIVITIES = {
  'Pledge of Fealty': {
    skills:['Intrigue','Statecraft','Warfare'], note:'Some groups respond better to a particular skill. DC = the group’s Negotiation DC.',
    needsGroupInput:true, needsHexInput:'optional',
    outcomes:{
      3:'The group joins your kingdom. If you haven’t already claimed their hex, you do so now (+10 kingdom XP). Add them to Diplomatic Relations.',
      2:'The group joins your kingdom (no hex claim). Add them to Diplomatic Relations. Roll 1 Resource Die and spend that RP to integrate them.',
      1:'The group refuses to pledge for now — you can retry next turn. +1 Unrest.',
      0:'The group refuses to pledge, permanently. +2 Unrest, and +1 to a Ruin of your choice (Abilities tab).'
    }
  },
  'Send Diplomatic Envoy': {
    skills:['Statecraft'], note:'Trained. DC = the group’s Negotiation DC. −4 and worsened one degree if the target is at war with you.',
    needsGroupInput:true,
    outcomes:{
      3:'Diplomatic relations established, with a +2 circumstance bonus to checks with that group until next Kingdom turn. First time ever: +60 kingdom XP milestone.',
      2:'Diplomatic relations established. First time ever: +60 kingdom XP milestone.',
      1:'The envoy is received, but the target isn’t ready — sending again next turn gets a +2 bonus. No relations yet.',
      0:'The envoy fails to arrive. +1d4 Unrest, and you can’t Send a Diplomatic Envoy to this target again for 3 turns.'
    }
  },
  'Creative Solution': {
    skills:['Scholarship'], note:'Untrained. A Fortune effect usable on any Kingdom skill check this turn.',
    outcomes:{
      3:'Free — usable to reroll one Kingdom check this turn with a +2 bonus.',
      2:'Costs 1d4 RP to research, usable the same way.',
      1:'Costs 2d6 RP and fails outright — no advantage gained.',
      0:'Costs 2d6 RP and fails; −1 circumstance penalty to Culture-based checks until the end of next Kingdom turn.'
    }
  },
  'Supernatural Solution': {
    skills:['Magic'], note:'Untrained. Like Creative Solution, but rolls Magic instead — can’t be combined with it the same turn.',
    outcomes:{
      3:'Free — usable to take the better of a Magic check or the triggering Kingdom check this turn.',
      2:'Costs 1d4 RP to research, usable the same way.',
      1:'Costs 2d6 RP and fails outright — no advantage gained.',
      0:'Costs 2d6 RP and fails; can’t attempt Supernatural Solution again for 2 Kingdom turns.'
    }
  },
  'Provide Care': {
    skills:['Defense'], note:'Untrained.',
    outcomes:{
      3:'Reduce Unrest by 1, and reduce a Ruin of your choice by 1 (Abilities tab).',
      2:'Reduce Unrest by 1.',
      1:'No effect either way.',
      0:'+1 Unrest (or, GM’s call, +1 to a Ruin of your choice instead).'
    }
  },
  'Quell Unrest': {
    skills:['Arts','Folklore','Intrigue','Magic','Politics','Warfare'], note:"Can't use the same skill two turns in a row.",
    outcomes:{
      3:'Reduce Unrest by 1d6.',
      2:'Reduce Unrest by 1.',
      1:'No reduction.',
      0:'+1d4 Unrest (or, GM’s call, +1 to two Ruins of your choice instead).'
    }
  },
  'Repair Reputation': {
    skills:['Arts','Trade','Engineering','Intrigue'], note:'Arts→Corruption, Trade→Crime, Engineering→Decay, Intrigue→Strife. DC is Control DC + 2.',
    needsRuinInput:true,
    outcomes:{
      3:'Reduce the targeted Ruin by 2, and reduce its current penalty by 1.',
      2:'Reduce the targeted Ruin by 1.',
      1:'No reduction — can’t retry this Ruin for 1 turn.',
      0:'Fails publicly: +1d4 Unrest, and can’t retry this Ruin for 3 turns.'
    }
  },
  'Request Foreign Aid': {
    skills:['Statecraft'], note:'Trained. Needs existing diplomatic relations with the group asked.',
    needsGroupInput:true,
    outcomes:{
      3:'+4 circumstance bonus to one Kingdom skill check this turn. Roll 2 Resource Dice and gain that RP.',
      2:'Choose: roll 1 Resource Die and gain that RP, or take a +2 circumstance bonus to a check this turn.',
      1:'Gain 1d4 RP at the start of next turn.',
      0:'No aid. +1d4 Unrest.'
    }
  },
  'Rest and Relax': {
    skills:['Arts','Boating','Scholarship','Trade','Wilderness'], note:'DC +4 if also used last turn.',
    outcomes:{
      3:'Reduce Unrest by 1. Your next Leadership activity this turn gets a +2 circumstance bonus.',
      2:'Reduce Unrest by 1.',
      1:'No notable benefit.',
      0:'No mechanical cost beyond a −2 penalty to your next Leadership-activity check.'
    }
  },
  'Celebrate Holiday': {
    skills:['Folklore'], note:'Untrained. DC +4 if also celebrated last turn.',
    outcomes:{
      3:'Free — +2 circumstance bonus to Loyalty-based checks until end of next Kingdom turn.',
      2:'Roll 1 Resource Die and spend that RP; +1 circumstance bonus to Loyalty-based checks until end of next turn.',
      1:'Same RP cost as success, but no bonus.',
      0:'Reduce next turn’s Resource Dice total by 4; −1 circumstance penalty to Loyalty-based checks until end of next turn.'
    }
  },
  'Craft Luxuries': {
    skills:['Trade'], note:'Untrained.',
    outcomes:{
      3:'Gain 1d4 Luxury Commodities.',
      2:'Gain 1 Luxury Commodity.',
      1:'Nothing produced.',
      0:'+1 to a Ruin of your choice (Abilities tab).'
    }
  },
  'Create a Masterpiece': {
    skills:['Arts'], note:'Once per Kingdom turn.',
    outcomes:{
      3:`Gain 2 ${'Fame'} points total (this turn’s +1, plus next turn’s early), and roll 2 Resource Dice for RP.`,
      2:'Gain 1 Fame/Infamy point.',
      1:'The masterpiece falls flat — no effect.',
      0:'Lose 1 Fame/Infamy point (if you have none, +1d4 Unrest instead).'
    }
  },
  'Establish Trade Agreement': {
    skills:['Trade'], note:'Trade by default — Boating if a navigable river connects, or Magic if the kingdom is Master+ in Magic. Needs existing diplomatic relations.',
    needsGroupInput:'optional',
    outcomes:{
      3:'Trade agreement established (+1 to Trade Agreements). Roll 2 Resource Dice and gain that RP.',
      2:'Trade agreement established (+1 to Trade Agreements).',
      1:'Choose: pay 2 Resource Dice worth of RP to still succeed, or let it fail this turn.',
      0:'Traders don’t return. +1 Unrest.'
    }
  },
  'Capital Investment': {
    skills:['Trade'], note:'Requires a Bank in the capital settlement’s influence.',
    outcomes:{
      3:'Roll 4 Resource Dice and gain that RP.',
      2:'Roll 2 Resource Dice and gain that RP.',
      1:'Gain 1d4 RP.',
      0:'Choose: roll 1 Resource Die and gain that RP, but add the same amount to Crime — or gain nothing and Crime +1.'
    }
  },
  'Clandestine Business': {
    skills:['Intrigue'], note:'DC = Control DC, +2 per consecutive turn pursued, −1 per turn skipped.',
    outcomes:{
      3:'Roll 2 Resource Dice and gain that RP, plus gain 1d4 Luxury Commodities.',
      2:'Choose: roll 2 Resource Dice and gain that RP, or gain 1d4 Luxury Commodities. Either way, +1 Unrest.',
      1:'Roll 1 Resource Die and gain that RP. +1 Unrest, +1 Corruption.',
      0:'+1d6 Unrest, +2 Corruption, and +1 to another Ruin of your choice (Abilities tab).'
    }
  },
  'Purchase Commodities': {
    skills:['Trade'], note:'Spend 8 RP for Luxuries, or 4 RP for any other Commodity, up front.',
    needsGoodInput:true,
    outcomes:{
      3:'Gain 4 of the chosen Commodity, plus 2 more of another type (not Luxuries).',
      2:'Gain 2 of the chosen Commodity.',
      1:'Gain 1 of the chosen Commodity.',
      0:'Gain none — the RP is still spent.'
    }
  },
  'Relocate Capital': {
    skills:['Engineering'], note:'Target settlement needs a Castle, Palace, or Town Hall. All leaders spend every remaining Leadership activity this turn on this. DC = Control DC + 5. 3-turn cooldown.',
    needsSettlementInput:true,
    outcomes:{
      3:'The capital relocates with no penalty.',
      2:'The capital relocates. +1 Unrest from the disruption.',
      1:'The move fails. +1 Unrest, and +1 to two Ruins of your choice (Abilities tab).',
      0:'The move fails badly. +1d4 Unrest, and +1 to three Ruins of your choice, +3 to a fourth (Abilities tab).'
    }
  },
  'Infiltration': {
    skills:['Intrigue'], note:'Untrained. Investigating your own kingdom’s health.',
    outcomes:{
      3:'Precise intelligence — reduce Unrest by 1d4.',
      2:'Vague intelligence — reduce Unrest by 1.',
      1:'Your spies learn nothing, but aren’t compromised.',
      0:'Spies are lost. −2 circumstance penalty to all kingdom checks until end of next turn.'
    }
  },
  'Prognostication': {
    skills:['Folklore'], note:'Foresight about this turn’s Event phase.',
    outcomes:{
      3:'If a random event occurs this turn, you get to pick between two rolled results, with a +2 bonus to resolve it.',
      2:'+1 circumstance bonus to the check made to resolve a random kingdom event this turn, if one occurs.',
      1:'No aid this turn.',
      0:'A random kingdom event is automatically triggered this turn, bypassing the DC 16 check.'
    }
  },
  'Hire Adventurers': {
    skills:['Statecraft'], note:'Ends an ongoing continuous kingdom event. Roll 1 Resource Die and spend that RP each attempt. This app doesn’t track continuous events as persisted entities yet, so this stays a reference-only activity — log the attempt and resolve its RP cost/effect by hand.'
  },
  'Focused Attention': {
    skills:['any'], note:'DC 20, aiding another leader’s upcoming check with a +2 circumstance bonus. AoN gives this activity no failure/critical text at all (success-only), and the bonus applies to a check the app never rolls for you, so there’s nothing here to automate — log it as a reminder for the table.'
  }
};
// Activities with no `outcomes` stay in the old log-only flow (see openLeadershipActivityPicker).
const LEADERSHIP_MANUAL_ONLY = Object.keys(LEADERSHIP_ACTIVITIES).filter(n=>!LEADERSHIP_ACTIVITIES[n].outcomes);
// Commerce Phase activities (2e.aonprd.com/Rules.aspx?ID=1800) — each may be attempted
// once per Kingdom turn independently of the others (not a shared pool), skill/trait and
// outcome text confirmed individually against each activity's own Actions.aspx page.
// Degrees with no listed effect on AoN (this is a beneficial-only activity) show 'No effect.'
const COMMERCE_ACTIVITIES = {
  'Collect Taxes': {
    skill:'Trade (Trained)', note:'Basic check.',
    outcomes:{
      3:'+2 circumstance bonus to Economy-based checks for the remainder of the Kingdom turn.',
      2:'+1 circumstance bonus to Economy-based checks for the remainder of the Kingdom turn. +1 Unrest if you also Collected Taxes last turn.',
      1:'As success — the bonus still applies — but +1 Unrest (+2 if you also Collected Taxes last turn).',
      0:'Taxes are still gathered for essential needs, but citizens are angered: +2 Unrest, and +1 to a Ruin of your choice.'
    }
  },
  'Improve Lifestyle': {
    skill:'Politics (Untrained)', note:'Basic check.',
    outcomes:{
      3:'+2 circumstance bonus to Culture-based checks for the remainder of the Kingdom turn.',
      2:'+1 circumstance bonus to Culture-based checks for the remainder of the Kingdom turn.',
      1:'As success, but also a −1 circumstance penalty to Economy-based checks for the remainder of the Kingdom turn.',
      0:'−1 circumstance penalty to Economy-based checks for the remainder of the Kingdom turn, +1 Unrest, and +1 to a Ruin of your choice.'
    }
  },
  'Tap Treasury': {
    skill:'Statecraft (Untrained)', note:'Basic check. A Bank structure grants a +1 item bonus.',
    outcomes:{
      3:'Withdraw a significant sum (or fund the unexpected event that required tapping the treasury).',
      2:'As critical success, but overdraw the treasury — −1 circumstance penalty to all Economy-based checks until the end of your next Kingdom turn.',
      1:'Fail to secure the funds — −1 circumstance penalty to all Loyalty- and Economy-based checks until the end of your next Kingdom turn.',
      0:'As failure, and the rumors spiral: +1 Unrest and +1 to a Ruin of your choice.'
    }
  },
  'Trade Commodities': {
    skill:'Industry (Untrained)', note:'Pick a Commodity your kingdom stockpiles and reduce it by up to 4, then attempt a basic check.', needsGoodPicker:true,
    outcomes:{
      3:'Gain 2 bonus Resource Dice per point of stockpile expended, at the start of your next Kingdom turn.',
      2:'Gain 1 bonus Resource Die per point of stockpile expended, at the start of your next Kingdom turn.',
      1:'Gain 1 bonus Resource Die at the start of your next Kingdom turn, regardless of how much was expended.',
      0:'Gain no bonus Resource Dice — the Commodity remains depleted.'
    }
  },
  'Manage Trade Agreements': {
    skill:'Trade (Untrained)', note:'Requires at least one existing trade agreement.',
    outcomes:{
      3:'At the start of your next Kingdom turn: 1 bonus Resource Die and 1 Commodity of your choice, per trade agreement (no more than half Luxuries).',
      2:'As critical success, but choose either the Resource Dice or the Commodities, not both.',
      1:'Gain 1 RP per trade agreement at the start of your next Kingdom turn.',
      0:"Gain no benefit, and you can't Manage Trade Agreements next Kingdom turn."
    }
  }
};
// Region Phase activities (2e.aonprd.com/Rules.aspx?ID=1805, "up to three Region
// activities" shared kingdom-wide per turn) — RP cost for the terrain ones is looked up
// from WORK_SITE_TERRAIN_RP_COST by the target hex's terrain at resolution time, per the
// "Building on Rough Terrain" table (Rules.aspx?ID=1775), same as Establish Work Site.
const REGION_ACTIVITIES = {
  'Claim Hex': {
    skill:'Exploration, Intrigue, Magic, or Wilderness', rpCost:1, note:'Hex must be reconnoitered and adjacent to kingdom territory; clear hazards/monsters first.',
    outcomes:{
      3:'Claim the hex, increase Size by 1, and immediately attempt another Region activity. (+10 kingdom XP)',
      2:'Claim the hex and increase Size by 1. (+10 kingdom XP)',
      1:'Fail to claim the hex.',
      0:'Fail to claim the hex; −1 circumstance penalty to Stability-based checks until the end of your next Kingdom turn.'
    }
  },
  'Clear Hex': {
    skill:'Engineering (to prepare/demolish) or Exploration (to remove a hazard/encounter)', rpCost:'terrain', note:'RP cost by the hex’s most inhospitable terrain feature.',
    outcomes:{
      3:'Clear the hex; refund half the RP spent. If removing dangerous creatures (not a hazard), also recover 2 Luxuries as treasure.',
      2:'Clear the hex.', 1:'Fail to clear the hex.',
      0:'Catastrophic failure — several workers die. Gain 1 Unrest.'
    }
  },
  'Fortify Hex': {
    skill:'Defense (Untrained)', rpCost:'terrain', note:'Hex must be claimed and have no settlement in it.',
    outcomes:{
      3:'Refund half the RP spent, then reduce Unrest by 1.', 2:'Reduce Unrest by 1.',
      1:'Fail to fortify the hex.', 0:'Gain 1 Unrest.'
    }
  },
  'Build Roads': {
    skill:'Engineering (Untrained)', rpCost:'terrain', note:'Hex must be claimed. Double the RP cost if a river crosses the hex (to also bridge it).',
    outcomes:{
      3:"Build roads into the target hex and one adjacent claimed hex without roads whose terrain is at least as hospitable (otherwise, as success).",
      2:'Build roads in the hex.', 1:'Fail to build roads in the hex.',
      0:'Disaster — lose several workers. Gain 1 Unrest.'
    }
  },
  'Establish Farmland': {
    skill:'Agriculture', rpCost:'farmland', note:'Plains or hills must be the predominant terrain, and the hex must be in a settlement’s influence. Plains: 1 RP vs Control DC. Hills: 2 RP vs Control DC+5.',
    outcomes:{
      3:'Establish two adjacent Farmland hexes instead of one (extra hex must be plains, or hills if the target was hills). If none available, treat as success.',
      2:'Establish one Farmland hex.', 1:'Fail to establish a Farmland hex.',
      0:'Fail, and risk a Crop Failure — DC 6 flat check at the start of each of the next two Event phases; on a failure, a Crop Failure event hits this hex and its neighbors.'
    }
  },
  'Irrigation': {
    skill:'Engineering (Trained)', rpCost:'terrain', note:'Hex must be adjacent to a river or lake and not itself contain one.',
    outcomes:{
      3:'The hex gains a river/lake terrain feature (or downgrades a prior critical-failure Irrigation attempt here to a failure); refund half the RP spent.',
      2:'The hex gains a river/lake terrain feature.', 1:'Fail — no river/lake feature gained.',
      0:'Fail, and it becomes a disease breeding ground — gain 1 Unrest; DC 4 flat check each Event phase (rising 1 per critically-failed Irrigation hex) or a Plague event occurs.'
    }
  }
};
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

/* update status cache — checked once per session from loadState(), then just
   read back on every picker render. See renderUpdateSection() below. */
let updateCheck = {status:'checking', tag:null};
let updateCheckedThisSession = false;
function isKingdomPickerVisible(){
  const el = document.getElementById('creation-screen');
  return !!el && el.style.display!=='none' && creationStep===0;
}
async function checkForUpdateOnce(){
  if(updateCheckedThisSession) return;
  updateCheckedThisSession = true;
  try{
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if(!res.ok) throw new Error('request failed');
    const data = await res.json();
    if(!data.tag_name) throw new Error('no release found');
    updateCheck = (data.tag_name === APP_VERSION)
      ? {status:'current', tag:data.tag_name}
      : {status:'available', tag:data.tag_name};
  }catch(e){
    updateCheck = {status:'error', tag:null};
  }
  if(isKingdomPickerVisible()) renderCreationScreen();
}
function isHotUpdated(){
  try{ return !!localStorage.getItem('hotupdate-app-js'); }catch(e){ return false; }
}
function renderUpdateStatusLine(){
  if(updateCheck.status==='checking') return 'Checking…';
  if(updateCheck.status==='error') return "Couldn't check for updates — check your connection.";
  if(updateCheck.status==='current') return "You're up to date.";
  if(updateCheck.status==='available') return `Update available: ${escapeHtml(updateCheck.tag)}`;
  return '';
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
      if(btn){ btn.textContent = 'Quick update (no reinstall)'; btn.disabled = false; }
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
    if(btn){ btn.textContent = 'Quick update (no reinstall)'; btn.disabled = false; }
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
  if(btn){ btn.textContent = 'Full update (new install)'; btn.disabled = false; }
}
const STORY_NPCS = [
  'Kesten Garess','Jhod Kavken','Jubilost Narthropple','Tristian','Harrim','Valerie',
  'Amiri','Regongar','Octavia','Linzi','Ekundayo','Nok-Nok','Shandra Mvashti',
  'Oleg Leveton','Svetlana Leveton'
];
const STORY_NPC_BONUS = {};
// Personality/background write-ups below are paraphrased from scratch in our own
// words — not lifted from Paizo's published prose — same split KM_STRUCTURES and
// KINGDOM_FEATS already follow, just applied to creative/flavor text instead of
// mechanical facts (which is a stricter bar: names/deities are bare facts, but HOW
// a character is described is Paizo's original writing, so every sentence here is
// written fresh, not reworded from a source passage.
//
// `status` is only set to 'Primary Companion' for the 7 names AoN's own Companions
// page (2e.aonprd.com/Rules.aspx?ID=1880) explicitly confirms: Amiri, Ekundayo,
// Jubilost, Linzi, Nok-Nok, Tristian, Valerie. That page also confirms exactly 5
// "secondary companions" exist, limited to downtime/kingdom-management roles — but
// does not name them, and their names are gated behind spoiler-hidden entries on
// AoN's Kingmaker Companion Guide sources index that couldn't be reached from here.
// Kesten Garess and Jhod Kavken are plausible candidates (both tied to specific
// Leadership roles across other sources) but that's not the same as confirmed, so
// none of the other 8 roster names are labeled a companion tier either way.
const STORY_NPC_INFO = {
  'Amiri': {status:'Primary Companion', deity:'Gorum', description:"A hard-traveling barbarian carrying an oversized greatsword from her homeland. She grew up in a northern tribe that had little patience for a woman built for battle, and channels that old resentment into a blunt, unapologetic love of a good fight. Loyalty, once earned, runs deep with her."},
  'Ekundayo': {status:'Primary Companion', deity:'Torag', description:"A quiet, grim-faced ranger who lost his wife and daughter to a troll raid and has never fully set the grief down. He tracks with methodical patience and keeps a loyal hound at his side, but rarely lets anyone get close enough to see past the armor he's built around himself."},
  'Jubilost Narthropple': {status:'Primary Companion', deity:null, description:"A gnome alchemist whose brilliance is matched only by his impatience with everyone slower than him. Sharp-tongued and perpetually irritated by incompetence, he sees the Stolen Lands as one long experiment he's begrudgingly agreed to supervise."},
  'Linzi': {status:'Primary Companion', deity:null, description:"A halfling bard who talked her way into the expedition specifically to chronicle it — she's convinced a founding story this good deserves a proper ballad. Cheerful, curious, and always scribbling notes, she treats the whole venture as the adventure of a lifetime."},
  'Nok-Nok': {status:'Primary Companion', deity:null, description:"A goblin who finds traps, ambushes, and general chaos delightful rather than dangerous. Fiercely loyal in his own unpredictable way, he treats the wilderness like a playground and everyone else's nerves like a minor inconvenience."},
  'Tristian': {status:'Primary Companion', deity:'Sarenrae', description:"A cleric raised in a temple in Kelesh, gentle and quick to see the good in people. He came to the Stolen Lands to investigate the region's curses, and leans on healing and protective magic more readily than a blade — his faith has quietly pulled him back from the brink more than once."},
  'Valerie': {status:'Primary Companion', deity:null, description:"A disciplined fighter who left a strict, regimented order behind her and rarely explains why. Dutiful almost to a fault, she holds herself and everyone around her to a high standard, and keeps her own history at arm's length."},
  'Kesten Garess': {status:null, deity:null, description:"A fighter from a noble Brevic house who was disowned for falling in love with a woman his family considered beneath him. He served as a guard captain before that, and carries himself with the discipline of that training and the quiet weight of what it cost him."},
  'Jhod Kavken': {status:null, deity:'Erastil', description:"An earnest, soft-spoken priest searching for a long-lost temple of his god somewhere in the Stolen Lands. Devout without being preachy, he's the kind of cleric who'd rather tend a garden or mend a fence than argue theology."},
  'Harrim': {status:null, deity:'Groetus', description:"A dwarf cleric who tried, and failed, again and again, to honor his people's god of craft — every project he touched fell apart. Worn down by the streak of bad luck, he found a grim sort of comfort in a god of endings instead, and now delivers doom-laden pronouncements with the flat calm of someone who's made peace with pessimism."},
  'Regongar': {status:null, deity:null, description:"A half-orc spellcaster who fights as fiercely with a blade as with magic, forged by years as a slave to a ruthless technological cult. Volatile and blunt, he has little patience for cowardice or hesitation, and holds few things sacred besides the freedom he fought hard to win."},
  'Octavia': {status:null, deity:null, description:"A half-elf trained in both arcane spellcraft and quiet, practical thievery, sold into slavery as a child alongside Regongar. Despite everything, she's kept a light, optimistic streak — freedom clearly means everything to her, even if she rarely says so directly."},
  'Shandra Mvashti': {status:null, deity:null, description:"A settler with a personal, long-standing claim to a homestead somewhere in the Stolen Lands. Practical and determined, she's less interested in glory than in seeing that claim honored."},
  'Oleg Leveton': {status:null, deity:null, description:"A gruff former city-dweller who traded noise and politics for a quiet trading post on the frontier. Prefers being master of his own small patch of land to answering to anyone else, but treats travelers who pass through fairly."},
  'Svetlana Leveton': {status:null, deity:null, description:"Oleg's wife and partner in running their trading post — warm, even-tempered, and the more approachable of the two. Minor nobility by birth, she never took to court intrigue and found she preferred an honest, hands-on life instead."}
};
let expandedNPCs = new Set(); // transient UI state — which roster cards are open
function toggleNPCCard(name){
  if(expandedNPCs.has(name)) expandedNPCs.delete(name); else expandedNPCs.add(name);
  renderNPCRoster();
}
function renderNPCRoster(){
  const el = document.getElementById('npc-roster-card');
  if(!el) return;
  el.innerHTML = `<div class="card">
    <h3>Kingmaker Roster</h3>
    <div class="hint" style="margin-top:0;">Tap a name for a quick reminder of who they are.</div>
    ${STORY_NPCS.map(name=>{
      const info = STORY_NPC_INFO[name] || {};
      const expanded = expandedNPCs.has(name);
      return `<div class="npc-entry">
        <button type="button" class="npc-entry-head" onclick="toggleNPCCard('${escapeAttr(name)}')">
          <span>${escapeHtml(name)}${info.status?` <span class="pill" style="font-size:10px;margin-left:4px;">${escapeHtml(info.status)}</span>`:''}</span>
          <span>${expanded?'−':'+'}</span>
        </button>
        ${expanded ? `<div class="npc-entry-body">
          ${info.deity?`<div class="hint" style="margin-top:0;"><b style="color:var(--text);">Deity:</b> ${escapeHtml(info.deity)}</div>`:''}
          <div class="hint" style="margin-top:4px;">${escapeHtml(info.description||'No description recorded yet.')}</div>
        </div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

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
// KM_STRUCTURES — full structure list, Kingmaker Adventure Path (core book) +
// two Companion Guide structures noted as companion-locked.
// Source: Archives of Nethys, https://2e.aonprd.com/KMStructures.aspx
//
// COPYRIGHT NOTE FOR WHOEVER IMPLEMENTS THIS:
// name / level / lots / cost / construction skill+rank+DC / upgradeFrom / upgradeTo /
// itemBonus / ruin are bare game facts — safe to use as-is, not copyrightable.
// `effect` has ALREADY been rewritten in our own words below — it is NOT copied from
// Paizo's text. If this list is ever extended, keep following that same split: pull
// the facts directly, write the effect description from scratch.
//
// `level` = minimum settlement level to build (shown as "Structure N" on AoN).
// `lots` = null means no lot cost (Infrastructure-type: walls, streets, sewers, etc.)
// `construction.rank` = null means no proficiency rank required, just the DC.
// `category` = AoN's own trait tags: Building / Residential / Edifice / Yard / Infrastructure
//   (Edifice/Yard/Infrastructure are themselves also "Building" except pure Yards/Infrastructure —
//   kept as AoN tags them, for the block-adjacency rules some structures reference)
// `companionLocked` = requires that specific companion be part of the kingdom (Companion Guide, not core book)
const KM_STRUCTURES = [
  { name:"Academy", level:10, lots:2, cost:{rp:52,lumber:12,luxuries:6,stone:12}, construction:{skill:"Scholarship",rank:"expert",dc:27}, category:["Building","Edifice"], upgradeFrom:"Library", upgradeTo:["Military Academy","University"], itemBonus:"+2 item bonus to Creative Solution", effect:"Grants a bonus to Lore checks made to Recall Knowledge, to Research checks, and to Decipher Writing while in this settlement." },
  { name:"Alchemy Laboratory", level:3, lots:1, cost:{rp:18,ore:2,stone:5}, construction:{skill:"Industry",rank:"trained",dc:16}, category:["Building"], itemBonus:"+1 item bonus to Demolish", effect:"Makes higher-level alchemical items available for sale here (stacks up to 3), and gives a bonus to Identify Alchemy checks in this settlement." },
  { name:"Arcanist's Tower", level:5, lots:1, cost:{rp:30,ore:6}, construction:{skill:"Magic",rank:"trained",dc:20}, category:["Building"], itemBonus:"+1 item bonus to Quell Unrest using Magic", effect:"Makes higher-level arcane items available for sale here (stacks up to 3), and gives a bonus to Borrow an Arcane Spell or Learn a Spell." },
  { name:"Arena", level:9, lots:4, cost:{rp:40,lumber:6,stone:12}, construction:{skill:"Warfare",rank:"expert",dc:26}, category:["Edifice","Yard"], upgradeTo:["Gladiatorial Arena"], itemBonus:"+2 item bonus to Celebrate Holiday and to Warfare checks to Quell Unrest", effect:"Lets you retrain combat feats faster while in this settlement." },
  { name:"Bank", level:5, lots:1, cost:{rp:28,ore:4,stone:6}, construction:{skill:"Trade",rank:"trained",dc:20}, category:["Building"], itemBonus:"+1 item bonus to Tap Treasury", effect:"Required in a settlement's influence area to use the Capital Investment activity." },
  { name:"Barracks", level:3, lots:1, cost:{rp:6,lumber:2,stone:1}, construction:{skill:"Defense",rank:null,dc:16}, category:["Building","Residential"], upgradeTo:["Garrison"], itemBonus:"+1 item bonus to Garrison Army, Recover Army, or Recruit Army", effect:"Helps recruit and recover armies. First one built in any settlement reduces Unrest by 1." },
  { name:"Brewery", level:1, lots:1, cost:{rp:6,lumber:2}, construction:{skill:"Agriculture",rank:null,dc:15}, category:["Building"], itemBonus:"+1 item bonus to Establish Trade Agreement", effect:"Reduces Unrest by 1 when built, as long as the settlement has fewer than 4 breweries already." },
  { name:"Bridge", level:2, lots:null, cost:{rp:6,lumber:1}, construction:{skill:"Engineering",rank:null,dc:16}, category:["Infrastructure"], effect:"Connects an island settlement across a Water Border, removing the usual trade penalty and letting the settlement contribute influence. Can only be built on a Water Border hex." },
  { name:"Castle", level:9, lots:4, cost:{rp:54,lumber:12,stone:12}, construction:{skill:"Defense/Industry/Magic/Statecraft",rank:"expert",dc:26}, category:["Building","Edifice","Famous","Infamous"], upgradeFrom:"Town Hall", upgradeTo:["Palace"], itemBonus:"+2 item bonus to New Leadership, Pledge of Fealty, Send Diplomatic Envoy, and to army recruitment/recovery/garrisoning", effect:"First one built each turn reduces Unrest by 1d4. In the capital, lets leaders take 3 Leadership activities per turn instead of 2." },
  { name:"Cathedral", level:15, lots:4, cost:{rp:58,lumber:20,stone:20}, construction:{skill:"Folklore",rank:"master",dc:34}, category:["Building","Edifice","Famous","Infamous"], upgradeFrom:"Temple", itemBonus:"+3 item bonus to Celebrate Holiday, Provide Care, and Repair Reputation (Corruption)", effect:"First one built in a turn reduces Unrest by 4. Bonus to Lore/Religion checks made while Investigating or Researching faith topics. Makes higher-level divine items available (doesn't stack with Shrine/Temple)." },
  { name:"Cemetery", level:1, lots:1, cost:{rp:4,stone:1}, construction:{skill:"Folklore",rank:null,dc:15}, category:["Yard"], effect:"Reduces Unrest gained from dangerous events in this settlement by 1 per cemetery, up to 4." },
  { name:"Construction Yard", level:10, lots:4, cost:{rp:40,lumber:10,stone:10}, construction:{skill:"Engineering",rank:null,dc:27}, category:["Yard"], itemBonus:"+1 item bonus to Build Structure and to Repair Reputation (Decay)", effect:"Speeds up future construction and helps counter Decay." },
  { name:"Dump", level:2, lots:1, cost:{rp:4}, construction:{skill:"Industry",rank:null,dc:16}, category:["Yard"], itemBonus:"+1 item bonus to Demolish", effect:"Softens the impact of certain events on settlements that have one. Cannot share a block with Residential structures." },
  { name:"Embassy", level:8, lots:2, cost:{rp:26,lumber:10,luxuries:6,stone:4}, construction:{skill:"Politics",rank:null,dc:24}, category:["Building"], itemBonus:"+1 item bonus to Send Diplomatic Envoy and Request Foreign Aid", effect:"Houses foreign diplomats and improves international relations." },
  { name:"Festival Hall", level:3, lots:1, cost:{rp:7,lumber:3}, construction:{skill:"Arts",rank:null,dc:18}, category:["Building"], upgradeTo:["Theater"], itemBonus:"+1 item bonus to Celebrate Holiday", effect:"A small venue for public gatherings and celebrations." },
  { name:"Foundry", level:3, lots:2, cost:{rp:16,lumber:5,ore:2,stone:3}, construction:{skill:"Industry",rank:"trained",dc:18}, category:["Building"], itemBonus:"+1 item bonus to Establish Work Site (mine)", effect:"Each foundry adds 1 to your kingdom's maximum Ore storage. Can't share a block with a Residential structure.", storageBonus:{good:"Ore", amt:1} },
  { name:"Garrison", level:5, lots:2, cost:{rp:28,lumber:6,stone:3}, construction:{skill:"Warfare",rank:"trained",dc:20}, category:["Building","Residential"], upgradeFrom:"Barracks", itemBonus:"+1 item bonus to Outfit Army or Train Army", effect:"Outfits and trains your armies. Reduces Unrest by 1 when built." },
  { name:"General Store", level:1, lots:1, cost:{rp:8,lumber:1}, construction:{skill:"Trade",rank:null,dc:15}, category:["Building"], upgradeTo:["Luxury Store","Marketplace"], effect:"Without a general store or marketplace, a settlement's effective level for item availability drops by 2." },
  { name:"Gladiatorial Arena", level:15, lots:4, cost:{rp:58,lumber:10,stone:30}, construction:{skill:"Warfare",rank:"master",dc:34}, category:["Edifice","Famous","Infamous","Yard"], upgradeFrom:"Arena", itemBonus:"+3 item bonus to Celebrate Holiday, Hire Adventurers, and Warfare checks to Quell Unrest", effect:"Lets a PC here retrain combat feats even faster than a plain Arena.", companionLocked:"Amiri" },
  { name:"Granary", level:1, lots:1, cost:{rp:12,lumber:2}, construction:{skill:"Agriculture",rank:null,dc:15}, category:["Building"], effect:"Each granary adds 1 to your kingdom's maximum Food storage.", storageBonus:{good:"Food", amt:1} },
  { name:"Guildhall", level:5, lots:2, cost:{rp:34,lumber:8}, construction:{skill:"Trade",rank:"expert",dc:20}, upgradeFrom:"Trade Shop", category:["Building"], itemBonus:"+1 item bonus to Economy checks tied to the guild's trade focus", effect:"A trade-specific headquarters (you choose the trade) — gives a bonus to Earn Income or Repair checks related to that trade while here." },
  { name:"Herbalist", level:1, lots:1, cost:{rp:10,lumber:1}, construction:{skill:"Wilderness",rank:null,dc:15}, category:["Building"], upgradeTo:["Hospital"], itemBonus:"+1 item bonus to Provide Care", effect:"Small medicinal garden and shop." },
  { name:"Hospital", level:9, lots:2, cost:{rp:30,lumber:10,stone:6}, construction:{skill:"Defense",rank:"expert",dc:26}, upgradeFrom:"Herbalist", category:["Building"], itemBonus:"+1 item bonus to Provide Care and Quell Unrest", effect:"Bonus to Medicine checks to Treat Disease and Treat Wounds while here." },
  { name:"Houses", level:1, lots:1, cost:{rp:3,lumber:1}, construction:{skill:"Industry",rank:null,dc:15}, category:["Building","Residential"], upgradeFrom:"Tenement", upgradeTo:["Mansion","Orphanage"], effect:"First one built each turn reduces Unrest by 1." },
  { name:"Illicit Market", level:6, lots:1, cost:{rp:50,lumber:5}, construction:{skill:"Intrigue",rank:"trained",dc:22}, category:["Building","Infamous"], itemBonus:"+1 item bonus to Clandestine Business", ruin:"+1 Crime", effect:"Makes higher-level items available for sale here (stacks up to 3), at the cost of raising Crime." },
  { name:"Inn", level:1, lots:1, cost:{rp:10,lumber:2}, construction:{skill:"Trade",rank:null,dc:15}, category:["Building","Residential"], itemBonus:"+1 item bonus to Hire Adventurers", effect:"Safe lodging for visitors." },
  { name:"Jail", level:2, lots:1, cost:{rp:14,lumber:4,ore:2,stone:4}, construction:{skill:"Defense",rank:null,dc:16}, category:["Building"], itemBonus:"+1 item bonus to Quell Unrest using Intrigue", effect:"First one built each turn reduces Crime by 1." },
  { name:"Keep", level:3, lots:2, cost:{rp:32,lumber:8,stone:8}, construction:{skill:"Defense",rank:"trained",dc:18}, category:["Building","Edifice"], itemBonus:"+1 item bonus to Deploy Army, Garrison Army, or Train Army", effect:"First one built each turn reduces Unrest by 1." },
  { name:"Library", level:2, lots:1, cost:{rp:6,lumber:4,stone:2}, construction:{skill:"Scholarship",rank:"trained",dc:16}, category:["Building"], upgradeTo:["Academy"], itemBonus:"+1 item bonus to Rest and Relax using Scholarship", effect:"Bonus to Lore checks to Recall Knowledge, to Research checks, and to Decipher Writing while here." },
  { name:"Lumberyard", level:3, lots:2, cost:{rp:16,lumber:5,ore:1}, construction:{skill:"Industry",rank:"trained",dc:18}, category:["Yard"], itemBonus:"+1 item bonus to Establish Work Site (lumber camp)", effect:"Each lumberyard adds 1 to your kingdom's maximum Lumber storage. Must be built on a lot next to a Water Border.", storageBonus:{good:"Lumber", amt:1} },
  { name:"Luxury Store", level:6, lots:1, cost:{rp:28,lumber:10,luxuries:6}, construction:{skill:"Trade",rank:"expert",dc:22}, upgradeFrom:"General Store", upgradeTo:["Magic Shop"], category:["Building"], itemBonus:"+1 item bonus to Establish Trade Agreement", effect:"Must be built on a block with a Mansion or Noble Villa. Makes higher-level luxury magic items available here (stacks up to 3, GM approval)." },
  { name:"Magic Shop", level:8, lots:1, cost:{rp:44,lumber:8,luxuries:6,stone:6}, construction:{skill:"Magic",rank:"expert",dc:24}, upgradeFrom:"Luxury Store", upgradeTo:["Occult Shop"], category:["Building"], itemBonus:"+1 item bonus to Supernatural Solution", effect:"Makes higher-level magic items available here (stacks up to 3)." },
  { name:"Magical Streetlamps", level:5, lots:null, cost:{rp:20}, construction:{skill:"Magic",rank:"expert",dc:20}, category:["Infrastructure"], effect:"Lights the whole settlement at night. First built in a turn reduces Crime by 1." },
  { name:"Mansion", level:5, lots:1, cost:{rp:10,lumber:6,luxuries:6,stone:3}, construction:{skill:"Industry",rank:"trained",dc:20}, upgradeFrom:"Houses", upgradeTo:["Noble Villa"], category:["Building","Residential"], itemBonus:"+1 item bonus to Improve Lifestyle", effect:"A larger home for a wealthy family." },
  { name:"Marketplace", level:4, lots:2, cost:{rp:48,lumber:4}, construction:{skill:"Trade",rank:"trained",dc:19}, upgradeFrom:"General Store", category:["Building","Residential"], itemBonus:"+1 item bonus to Establish Trade Agreement", effect:"Without a general store or marketplace, a town's effective level for item availability drops by 2." },
  { name:"Menagerie", level:12, lots:4, cost:{rp:26,lumber:14,ore:10,stone:10}, construction:{skill:"Wilderness",rank:"expert",dc:30}, upgradeFrom:"Park", category:["Building","Edifice"], itemBonus:"+2 item bonus to Rest and Relax using Wilderness", effect:"Houses captured low-level creatures for display; adding one grants Fame/Infamy or reduces a Ruin. Adds Unrest for each sapient creature on display." },
  { name:"Military Academy", level:12, lots:2, cost:{rp:36,lumber:12,ore:6,stone:10}, construction:{skill:"Warfare",rank:"expert",dc:30}, upgradeFrom:"Academy", category:["Building","Edifice"], itemBonus:"+2 item bonus to Pledge of Fealty using Warfare, +2 to Train Army", effect:"Trains elite soldiers and officers." },
  { name:"Mill", level:2, lots:1, cost:{rp:6,lumber:2,stone:1}, construction:{skill:"Industry",rank:"trained",dc:16}, category:["Building"], itemBonus:"+1 item bonus to Harvest Crops", effect:"If built next to a Water Border, reduces the settlement's Consumption by 1." },
  { name:"Mint", level:15, lots:1, cost:{rp:30,lumber:12,ore:20,stone:16}, construction:{skill:"Trade",rank:"master",dc:34}, category:["Building","Edifice"], itemBonus:"+3 item bonus to Capital Investment, Collect Taxes, and Repair Reputation (Crime)", effect:"Mints the kingdom's own coinage, boosting the economy." },
  { name:"Monument", level:3, lots:1, cost:{rp:6,stone:1}, construction:{skill:"Arts",rank:"trained",dc:18}, category:["Building","Edifice"], itemBonus:"First one built each turn reduces Unrest by 1 and one Ruin of your choice by 1", effect:"A commemorative landmark." },
  { name:"Museum", level:5, lots:2, cost:{rp:30,lumber:6,stone:2}, construction:{skill:"Exploration",rank:"trained",dc:20}, category:["Building","Famous","Infamous"], itemBonus:"+1 item bonus to Rest and Relax using Arts", effect:"Donating a significant magic item (level 6+) here reduces Unrest by 1; removing it later raises Unrest by 1." },
  { name:"Noble Villa", level:9, lots:2, cost:{rp:24,lumber:10,luxuries:6,stone:8}, construction:{skill:"Politics",rank:"expert",dc:19}, upgradeFrom:"Mansion", category:["Building","Residential"], itemBonus:"+1 item bonus to Improve Lifestyle and to Quell Unrest using Politics", effect:"First one built each turn reduces Unrest by 2." },
  { name:"Occult Shop", level:13, lots:1, cost:{rp:38,lumber:12,luxuries:12,stone:6}, construction:{skill:"Magic",rank:"master",dc:32}, upgradeFrom:"Magic Shop", category:["Building"], itemBonus:"+2 item bonus to Prognostication", effect:"Makes higher-level magic items available here (stacks up to 3). Bonus to Research or Recall Knowledge on esoteric subjects." },
  { name:"Opera House", level:15, lots:2, cost:{rp:40,lumber:20,luxuries:18,stone:16}, construction:{skill:"Arts",rank:"master",dc:34}, upgradeFrom:"Theater", category:["Building","Edifice","Famous","Infamous"], itemBonus:"+3 item bonus to Celebrate Holiday and Create a Masterpiece", effect:"First one built each turn reduces Unrest by 4. Bonus to Performance checks to Earn Income while here." },
  { name:"Orphanage", level:2, lots:1, cost:{rp:6,lumber:2}, construction:{skill:"Industry",rank:null,dc:16}, upgradeFrom:"Houses", category:["Building","Residential"], effect:"First one built each turn reduces Unrest by 1." },
  { name:"Palace", level:15, lots:4, cost:{rp:108,lumber:20,luxuries:12,ore:15,stone:20}, construction:{skill:"Defense/Industry/Magic/Statecraft",rank:"master",dc:34}, upgradeFrom:"Castle", category:["Building","Edifice","Famous","Infamous"], itemBonus:"+3 item bonus to New Leadership, Pledge of Fealty, Send Diplomatic Envoy, and army recruitment/recovery/garrisoning", effect:"Capital only. First built reduces Unrest by 10. Lets leaders take 3 Leadership activities per turn; the Ruler gets a further bonus to Leadership checks." },
  { name:"Park", level:3, lots:1, cost:{rp:5}, construction:{skill:"Wilderness",rank:null,dc:18}, upgradeTo:["Menagerie"], category:["Yard"], itemBonus:"+1 item bonus to Rest and Relax using Wilderness", effect:"First one built each turn reduces Unrest by 1." },
  { name:"Paved Streets", level:4, lots:null, cost:{rp:12,stone:6}, construction:{skill:"Industry",rank:"trained",dc:19}, category:["Infrastructure"], effect:"Speeds movement between lots within the settlement." },
  { name:"Pier", level:3, lots:1, cost:{rp:16,lumber:2}, construction:{skill:"Boating",rank:null,dc:18}, upgradeTo:["Waterfront"], category:["Yard"], itemBonus:"+1 item bonus to Go Fishing", effect:"Must be built next to a Water Border." },
  { name:"Printing House", level:10, lots:2, cost:{rp:48,lumber:12,luxuries:12}, construction:{skill:"Industry",rank:"master",dc:27}, category:["Building","Edifice"], itemBonus:"+2 item bonus to Improve Lifestyle and Quell Unrest", effect:"Bonus to Gather Information or Research checks made in a settlement that also has a library or similar structure.", companionLocked:"Linzi" },
  { name:"Sacred Grove", level:5, lots:1, cost:{rp:36}, construction:{skill:"Wilderness",rank:"trained",dc:20}, category:["Yard"], itemBonus:"+1 item bonus to Quell Unrest using Folklore", effect:"Makes higher-level primal magic items available here (stacks up to 3)." },
  { name:"Secure Warehouse", level:6, lots:2, cost:{rp:24,lumber:6,ore:4,stone:6}, construction:{skill:"Industry",rank:"expert",dc:22}, category:["Building"], itemBonus:"+1 item bonus to Craft Luxuries", effect:"Each secure warehouse adds 1 to your kingdom's maximum Luxuries storage.", storageBonus:{good:"Luxuries", amt:1} },
  { name:"Sewer System", level:7, lots:null, cost:{rp:24,lumber:8,stone:8}, construction:{skill:"Engineering",rank:"expert",dc:23}, category:["Infrastructure"], itemBonus:"+1 item bonus to Clandestine Business", effect:"Reduces the settlement's Consumption by 1." },
  { name:"Shrine", level:1, lots:1, cost:{rp:8,lumber:2,stone:1}, construction:{skill:"Folklore",rank:"trained",dc:15}, upgradeTo:["Temple"], category:["Building"], itemBonus:"+1 item bonus to Celebrate Holiday", effect:"Makes higher-level divine items available here (stacks up to 3; doesn't stack with Temple/Cathedral)." },
  { name:"Smithy", level:3, lots:1, cost:{rp:8,lumber:2,ore:1,stone:1}, construction:{skill:"Industry",rank:"trained",dc:18}, category:["Building"], itemBonus:"+1 item bonus to Trade Commodities, +1 to Outfit Army", effect:"Bonus to Craft checks involving metalwork while here." },
  { name:"Specialized Artisan", level:4, lots:1, cost:{rp:10,lumber:4,luxuries:1}, construction:{skill:"Trade",rank:"expert",dc:19}, category:["Building"], itemBonus:"+1 item bonus to Craft Luxuries", effect:"Bonus to Craft checks for fine/specialty goods while here." },
  { name:"Stable", level:3, lots:1, cost:{rp:10,lumber:2}, construction:{skill:"Wilderness",rank:"trained",dc:18}, category:["Yard"], itemBonus:"+1 item bonus to Establish Trade Agreement", effect:"Houses, trains, and sells mounts." },
  { name:"Stockyard", level:3, lots:4, cost:{rp:20,lumber:4}, construction:{skill:"Industry",rank:null,dc:18}, category:["Yard"], itemBonus:"+1 item bonus to Gather Livestock", effect:"Reduces the settlement's Consumption by 1.", consumptionBonus:1 },
  { name:"Stonemason", level:3, lots:2, cost:{rp:16,lumber:2}, construction:{skill:"Industry",rank:"trained",dc:18}, category:["Building"], itemBonus:"+1 item bonus to Establish Work Site (quarry)", effect:"Each stonemason adds 1 to your kingdom's maximum Stone storage.", storageBonus:{good:"Stone", amt:1} },
  { name:"Tannery", level:3, lots:1, cost:{rp:6,lumber:2}, construction:{skill:"Industry",rank:"trained",dc:18}, category:["Building"], itemBonus:"+1 item bonus to Trade Commodities", effect:"Cannot share a block with Residential structures except Tenements." },
  { name:"Tavern, Dive", level:1, lots:1, cost:{rp:12,lumber:1}, construction:{skill:"Trade",rank:"trained",dc:15}, upgradeTo:["Tavern, Popular"], category:["Building"], effect:"First one built in a turn reduces Unrest by 1 but raises Crime by 1." },
  { name:"Tavern, Popular", level:3, lots:1, cost:{rp:24,lumber:6,stone:2}, construction:{skill:"Trade",rank:"expert",dc:18}, upgradeFrom:"Tavern, Dive", upgradeTo:["Tavern, Luxury"], category:["Building"], itemBonus:"+1 item bonus to Hire Adventurers and Rest and Relax using Trade", effect:"First one built in a turn reduces Unrest by 2. Bonus to Performance checks to Earn Income, and to Gather Information, while here." },
  { name:"Tavern, Luxury", level:9, lots:2, cost:{rp:48,lumber:10,luxuries:8,stone:8}, construction:{skill:"Trade",rank:"master",dc:26}, upgradeFrom:"Tavern, Popular", upgradeTo:["Tavern, World-Class"], category:["Building","Famous"], itemBonus:"+2 item bonus to Hire Adventurers and Rest and Relax using Trade", effect:"First one built in a turn reduces Unrest by 1d4+1. Bonus to Performance checks to Earn Income, and to Gather Information, while here." },
  { name:"Tavern, World-Class", level:15, lots:2, cost:{rp:64,lumber:18,luxuries:15,stone:15}, construction:{skill:"Trade",rank:"master",dc:34}, upgradeFrom:"Tavern, Luxury", category:["Building","Edifice","Famous"], itemBonus:"+3 item bonus to Hire Adventurers, Rest and Relax using Trade, and Repair Reputation (Strife)", effect:"First one built in a turn reduces Unrest by 2d4. Bonus to Performance checks to Earn Income, and to Gather Information, while here." },
  { name:"Temple", level:7, lots:2, cost:{rp:32,lumber:6,stone:6}, construction:{skill:"Folklore",rank:"trained",dc:23}, upgradeFrom:"Shrine", upgradeTo:["Cathedral"], category:["Building","Famous","Infamous"], itemBonus:"+1 item bonus to Celebrate Holiday and Provide Care", effect:"First one built each turn reduces Unrest by 2. Makes higher-level divine items available here (stacks up to 3; doesn't stack with Shrine/Cathedral)." },
  { name:"Tenement", level:0, lots:1, cost:{rp:1,lumber:1}, construction:{skill:"Industry",rank:null,dc:14}, upgradeTo:["Houses"], category:["Building","Residential"], ruin:"+1 to a Ruin of your choice", effect:"First one built each turn reduces Unrest by 1, at the cost of raising a Ruin track." },
  { name:"Theater", level:9, lots:2, cost:{rp:24,lumber:8,stone:3}, construction:{skill:"Arts",rank:"expert",dc:26}, upgradeFrom:"Festival Hall", upgradeTo:["Opera House"], category:["Building"], itemBonus:"+2 item bonus to Celebrate Holiday", effect:"First one built each turn reduces Unrest by 1. Bonus to Performance checks to Earn Income while here." },
  { name:"Thieves' Guild", level:5, lots:1, cost:{rp:25,lumber:4}, construction:{skill:"Intrigue",rank:"trained",dc:20}, category:["Building","Infamous"], itemBonus:"+1 item bonus to Infiltration", ruin:"+1 Crime", effect:"Bonus to Create Forgeries checks while here, at the cost of raising Crime." },
  { name:"Town Hall", level:2, lots:2, cost:{rp:22,lumber:4,stone:4}, construction:{skill:"Defense/Industry/Magic/Statecraft",rank:"trained",dc:16}, upgradeTo:["Castle"], category:["Building","Edifice"], effect:"First one built each turn reduces Unrest by 1. In the capital, lets leaders take 3 Leadership activities per turn instead of 2." },
  { name:"Trade Shop", level:3, lots:1, cost:{rp:10,lumber:2}, construction:{skill:"Trade",rank:"trained",dc:18}, upgradeTo:["Guildhall"], category:["Building"], itemBonus:"+1 item bonus to Purchase Commodities", effect:"A trade-specific shop (you choose the trade) — bonus to related Crafting checks while here." },
  { name:"University", level:15, lots:4, cost:{rp:78,lumber:18,luxuries:18,stone:18}, construction:{skill:"Scholarship",rank:"master",dc:34}, upgradeFrom:"Academy", category:["Building","Edifice","Famous"], itemBonus:"+3 item bonus to Creative Solution", effect:"Bonus to Lore checks to Recall Knowledge, to Research checks, and to Decipher Writing while here." },
  { name:"Wall, Wooden", level:1, lots:null, cost:{rp:2,lumber:4}, construction:{skill:"Defense",rank:null,dc:15}, upgradeTo:["Wall, Stone"], category:["Infrastructure"], effect:"Built along a settlement border. First one built in each settlement reduces Unrest by 1." },
  { name:"Wall, Stone", level:5, lots:null, cost:{rp:4,stone:8}, construction:{skill:"Defense",rank:"trained",dc:20}, upgradeFrom:"Wall, Wooden", category:["Infrastructure"], effect:"Built along a settlement border. First one built in each settlement reduces Unrest by 1." },
  { name:"Watchtower", level:3, lots:1, cost:{rp:12,lumber:4,stone:4}, construction:{skill:"Defense",rank:"trained",dc:18}, category:["Building"], itemBonus:"+1 item bonus to checks made to resolve events affecting the settlement", effect:"First one built each turn reduces Unrest by 1." },
  { name:"Waterfront", level:8, lots:4, cost:{rp:90,lumber:10}, construction:{skill:"Boating",rank:"expert",dc:24}, upgradeFrom:"Pier", category:["Yard"], itemBonus:"+1 item bonus to Go Fishing, Establish Trade Agreement, and Rest and Relax using Boating", effect:"Must be built next to a Water Border. Raises the settlement's effective level by 1 for item availability." },
  { name:"Rubble", level:0, lots:1, cost:{}, construction:null, category:["Yard"], effect:"An unbuildable lot left over from a destroyed structure or failed Demolish — must be cleared with a successful Demolish activity before anything else can go there." }
];
// Structures buildable directly on a settlement's lot grid: excludes Infrastructure
// (lots:null — walls/streets/sewers, not lot-bound, and out of scope: no road/adjacency
// pathing here) and Rubble (construction:null — a Demolish-activity byproduct, not something
// you build). "Settlement-level requirement" is approximated with kingdom level (state.level)
// since the app doesn't track a separate numeric settlement level, only the four type tiers —
// combined with the lot-space filter this stays reasonably in line with a settlement's actual size.
// Same pattern as Kingdom Feats' featPrereqMet: does the kingdom actually have the
// required proficiency rank in one of the listed skills (construction.skill is
// sometimes slash-separated, e.g. "Defense/Industry/Magic/Statecraft" — any one qualifies)?
// construction.rank===null means no rank requirement, just the DC.
function structureRankMet(st){
  if(!st.construction || !st.construction.rank) return true;
  const required = {trained:1, expert:2, master:3}[st.construction.rank] || 0;
  return st.construction.skill.split('/').some(name=>{
    const s = state.skills[name];
    return s && RANK_ORDER[s.rank]>=required;
  });
}
function buildableStructuresFor(emptyLotsInBlock){
  return KM_STRUCTURES.filter(st=> st.construction && st.lots!=null && st.lots<=emptyLotsInBlock && st.level<=state.level && structureRankMet(st));
}
function structureCategoryClass(def){
  const cats = (def && def.category) || [];
  if(cats.includes('Edifice')) return 'cat-blue';
  if(cats.includes('Residential')) return 'cat-green';
  return 'cat-gold';
}

/* =====================================================================
   WARFARE (Beta) — Appendix 3 (2e.aonprd.com/Rules.aspx?ID=1845) and its
   linked pages (Army Stat Block ID=1848, Recruiting an Army ID=1849,
   Basic Armies KMWarArmies.aspx + the by-level table at ID=1858, Army
   Tactics KMWarTactics.aspx, Army Activities/basic+tactical War Actions
   KMWarActions.aspx, War Encounters ID=1864, Army Conditions ID=1878,
   Army Gear ID=1861). Every number below is a bare game fact (level
   thresholds, DCs, damage, RP costs) — safe to encode directly. Flavor
   text (tactic/action descriptions) is paraphrased in our own words, same
   split as KM_STRUCTURES/KINGDOM_FEATS.

   Two things confirmed during research that are worth flagging:
   - Recruit Army has NO up-front RP cost in the real rules — it only
     raises Consumption (ongoing) once recruited. Outfit Army (buying
     gear) is the one with a real RP cost, enforced the same way
     Structures/Work Sites are.
   - HP/Rout Threshold/Consumption are shown fixed per army type at their
     minimum level, with no by-level column in the scaling table (unlike
     Scouting/DC/AC/Saves/Attack, which all scale). Treated as constant
     per type here — flag this if it turns out wrong against the book.
===================================================================== */
const ARMY_TYPES = {
  Infantry:   {minLevel:1, maneuver:'low',  morale:'high', hp:4, rt:2, consumption:1, attackKind:'melee',
    special:'No special rules beyond the basics.'},
  Cavalry:    {minLevel:3, maneuver:'high', morale:'low',  hp:4, rt:2, consumption:2, attackKind:'melee',
    special:'+1 status bonus on weapon attacks against Infantry/Skirmisher armies; −1 status penalty on Maneuver/Morale saves against area and mental effects.'},
  Skirmisher: {minLevel:5, maneuver:'high', morale:'low',  hp:4, rt:2, consumption:1, attackKind:'melee', acAdjust:-2, savesAdjust:2,
    special:'AC is 2 lower than the standard value for its level; Maneuver and Morale are both 2 higher than standard (already applied below).'},
  Siege:      {minLevel:7, maneuver:'low',  morale:'high', hp:6, rt:3, consumption:1, attackKind:'ranged',
    special:"Can't be outfitted with gear or attack engaged armies; can damage fortifications; ranged Strikes are limited to 5 per war encounter."}
};
// Standard values for basic armies by level (Rules.aspx?ID=1858) — Scouting, standard
// DC (also Recruitment DC), AC, High save, Low save, Attack, Max Tactics. Index 0 = level 1.
const ARMY_LEVEL_TABLE = [
  {scouting:7,  dc:15, ac:16, high:10, low:4,  attack:9,  maxTactics:1},
  {scouting:8,  dc:16, ac:18, high:11, low:5,  attack:11, maxTactics:1},
  {scouting:9,  dc:18, ac:19, high:12, low:6,  attack:12, maxTactics:1},
  {scouting:11, dc:19, ac:21, high:14, low:8,  attack:14, maxTactics:2},
  {scouting:12, dc:20, ac:22, high:15, low:9,  attack:15, maxTactics:2},
  {scouting:14, dc:22, ac:24, high:17, low:11, attack:17, maxTactics:2},
  {scouting:15, dc:23, ac:25, high:18, low:12, attack:18, maxTactics:2},
  {scouting:16, dc:24, ac:27, high:19, low:13, attack:20, maxTactics:3},
  {scouting:18, dc:26, ac:28, high:21, low:15, attack:21, maxTactics:3},
  {scouting:19, dc:27, ac:30, high:22, low:16, attack:23, maxTactics:3},
  {scouting:21, dc:28, ac:31, high:24, low:18, attack:24, maxTactics:3},
  {scouting:22, dc:30, ac:33, high:25, low:19, attack:26, maxTactics:4},
  {scouting:23, dc:31, ac:34, high:26, low:20, attack:27, maxTactics:4},
  {scouting:25, dc:32, ac:36, high:28, low:22, attack:29, maxTactics:4},
  {scouting:26, dc:34, ac:37, high:29, low:23, attack:30, maxTactics:4},
  {scouting:28, dc:35, ac:39, high:30, low:25, attack:32, maxTactics:5},
  {scouting:29, dc:36, ac:40, high:32, low:26, attack:33, maxTactics:5},
  {scouting:30, dc:38, ac:42, high:33, low:27, attack:35, maxTactics:5},
  {scouting:32, dc:39, ac:43, high:35, low:29, attack:36, maxTactics:5},
  {scouting:33, dc:40, ac:45, high:36, low:30, attack:38, maxTactics:6}
];
function armyToughenedBonus(army){
  return (army.tactics||[]).filter(t=>t==='Toughened Soldiers').length; // stackable, +1 max HP each
}
function armyHoldTheLine(army){
  return (army.tactics||[]).includes('Hold the Line');
}
function armyStatsAtLevel(type, level){
  const def = ARMY_TYPES[type];
  const lvl = Math.max(def.minLevel, Math.min(20, level||def.minLevel));
  const row = ARMY_LEVEL_TABLE[lvl-1];
  return {
    level: lvl,
    scouting: row.scouting,
    recruitDC: row.dc,
    ac: row.ac + (def.acAdjust||0),
    maneuver: (def.maneuver==='high' ? row.high : row.low) + (def.savesAdjust||0),
    morale: (def.morale==='high' ? row.high : row.low) + (def.savesAdjust||0),
    attack: row.attack,
    baseHp: def.hp,
    baseRt: def.rt,
    consumption: def.consumption,
    maxTactics: row.maxTactics,
    attackKind: def.attackKind
  };
}
function armyEffectiveMaxHp(army){
  const s = armyStatsAtLevel(army.type, army.level);
  return s.baseHp + armyToughenedBonus(army);
}
function armyEffectiveRoutThreshold(army){
  const maxHp = armyEffectiveMaxHp(army);
  // Hold the Line changes Rout Threshold to 1/4 max HP instead of the usual 1/2
  return armyHoldTheLine(army) ? Math.max(1, Math.floor(maxHp/4)) : Math.max(1, Math.floor(maxHp/2));
}

// Army Tactics (KMWarTactics.aspx) — 21 entries. `unlocks` names the War Action a
// tactic grants access to, if any (used to gate the round-by-round action list).
// Training DC isn't published as its own table on AoN's page text; approximated as
// the Basic Armies standard DC for the tactic's level requirement, same spirit as
// using kingdom level for "settlement level" elsewhere in this app — flag if wrong.
const WAR_TACTICS = {
  'Ambush':               {level:8,  types:['Skirmisher'], unlocks:null, effect:'On round 1, can engage enemies that rolled lower initiative even without moving adjacent first; +2 bonus on the first attack that round.'},
  'Bloodied but Unbroken': {level:5, types:['Cavalry','Infantry','Skirmisher'], unlocks:null, effect:'+1 status bonus (+2 at level 10) to AC, Maneuver, Morale, and attacks while at or below the Rout Threshold.'},
  'Cavalry Experts':      {level:6,  types:['Cavalry'], unlocks:null, effect:'Overrun-style maneuver bonus increases to +2; at level 12, ignores Overrun penalties entirely.'},
  'Darkvision':           {level:1,  types:null, unlocks:null, effect:"Army's creatures see in darkness as if with darkvision."},
  'Defensive Tactics':    {level:3,  types:null, unlocks:'Defensive Stance', effect:'+1 bonus (+2 at 9th, +3 at 17th) on Guard actions; grants access to the Defensive Stance action.'},
  'Explosive Shot':       {level:11, types:['Siege'], unlocks:'Overwhelming Bombardment', effect:'Critical ranged hits deal 1 extra damage to a second, non-distant enemy; grants access to Overwhelming Bombardment.'},
  'Field Triage':         {level:6,  types:['Infantry','Skirmisher'], unlocks:'Battlefield Medicine', effect:'Grants access to the Battlefield Medicine action.'},
  'Flaming Shot':         {level:9,  types:null, unlocks:null, effect:'Successful ranged Strikes force a Maneuver check on the target; on a failure the Strike deals 1 extra damage.'},
  'Flexible Tactics':     {level:5,  types:['Infantry','Skirmisher'], unlocks:'Dirty Fighting', effect:'Grants access to Dirty Fighting, False Retreat, and Feint, plus the Counterattack reaction.'},
  'Focused Devotion':     {level:3,  types:null, unlocks:'Taunt', effect:'+1 bonus (+2 at 9th, +3 at 17th) on Rally actions; grants access to the Taunt action.'},
  'Hold the Line':        {level:1,  types:null, unlocks:null, effect:"+1 bonus resisting routs; the army's Rout Threshold becomes 1/4 its maximum HP instead of 1/2."},
  'Increased Ammunition':  {level:5, types:null, unlocks:null, effect:'+2 ranged Strikes available per war encounter; stacks if taken more than once.'},
  'Keen Eyed':            {level:1,  types:null, unlocks:null, effect:'+2 bonus on initiative (Scouting) rolls.'},
  'Keep up the Pressure': {level:3,  types:null, unlocks:null, effect:'Multiple-attack penalties are reduced to −4/−8 instead of the usual −5/−10.'},
  'Live off the Land':    {level:1,  types:['Cavalry','Infantry','Skirmisher'], unlocks:null, effect:'Consumption is reduced by 1 while stationed in a wilderness hex with no settlement.'},
  'Low-Light Vision':     {level:1,  types:null, unlocks:null, effect:"Army's creatures see in dim light as if it were bright light."},
  'Merciless':            {level:5,  types:['Cavalry','Infantry'], unlocks:'All-Out Assault', effect:'+2 bonus to the DC enemies use to Disengage from this army; grants access to All-Out Assault.'},
  'Opening Salvo':        {level:8,  types:['Cavalry','Siege','Skirmisher'], unlocks:null, effect:'The army can start a war encounter distant from the enemy on round 1 instead of adjacent.'},
  'Reckless Flankers':    {level:5,  types:['Cavalry','Skirmisher'], unlocks:'Outflank', effect:'Can trade −2 AC for +1 attack bonus while engaged; grants access to the Outflank action.'},
  'Sharpshooter':         {level:5,  types:['Cavalry','Infantry','Skirmisher'], unlocks:'Covering Fire', effect:'+1 bonus on ranged Strikes but −2 penalty on melee Strikes (−1 at 9th, none at 15th); grants access to Covering Fire.'},
  'Toughened Soldiers':   {level:1,  types:null, unlocks:null, effect:'+1 maximum HP; stacks if taken more than once.'}
};
function tacticTrainingDC(name){
  const t = WAR_TACTICS[name];
  if(!t) return 15;
  const row = ARMY_LEVEL_TABLE[Math.max(0, Math.min(19, t.level-1))];
  return row.dc;
}

// War Actions (KMWarActions.aspx) — 6 Basic (always available) + 13 Tactical (need the
// listed tactic trained first). `check` is what the acting army rolls (maneuver/morale/
// melee/ranged — melee/ranged use the army's Attack bonus, maneuver/morale use the
// matching save); `vs` says what degree of success is measured against: the target's AC,
// its Maneuver value, its Morale value, or a flat DC. Outcomes are simplified to their
// core, mechanically-applicable effect (damage + the primary condition change) — riders
// described only in text (e.g. "choose which of 2 targets") are left for the table to
// apply by hand, same as how structure effects that aren't a clean flat number stay text-only.
const WAR_ACTIONS = {
  'Advance':   {cost:1, tactic:null, check:'maneuver', vs:'maneuver', text:'Close the distance with an enemy army.',
    outcomes:{3:{targetCond:{distant:false,engaged:true}, text:'Enemy loses distant and becomes engaged.'}, 2:{targetCond:{distant:false}, text:'Enemy loses distant, or becomes engaged if already close.'}, 1:{text:'No effect.'}, 0:{selfCond:{mired:1}, text:'Becomes mired 1.'}}},
  'Battle':    {cost:1, tactic:null, check:'attack', vs:'ac', text:'A basic Strike against an engaged (or, for Siege/ranged, any valid) enemy.',
    outcomes:{3:{dmg:2, text:'2 damage.'}, 2:{dmg:1, text:'1 damage.'}, 1:{text:'No damage.'}, 0:{text:'No damage.'}}},
  'Disengage': {cost:2, tactic:null, check:'maneuver', vs:'maneuver', text:'Try to break away from an engaged enemy.',
    outcomes:{3:{selfCond:{engaged:false}, text:'No longer engaged with any enemy.'}, 2:{selfCond:{engaged:false}, text:'Breaks free of the target army.'}, 1:{text:'Remains engaged.'}, 0:{text:"Remains engaged; can't Disengage from others this turn."}}},
  'Guard':     {cost:1, tactic:null, check:'maneuver', vs:'flat', dc:10, text:'Brace defensively.',
    outcomes:{3:{selfCond:{guarding:'all'}, text:'+2 AC against all enemy armies until its next turn.'}, 2:{selfCond:{guarding:'one'}, text:'+2 AC against one chosen enemy army.'}, 1:{text:'No effect.'}, 0:{selfCond:{mired:1}, text:'Becomes mired 1.'}}},
  'Rally':     {cost:2, tactic:null, check:'morale', vs:'flat', dc:10, text:'Steady the troops.',
    outcomes:{3:{selfCond:{routed:false,shaken:-2}, text:'No longer routed; shaken reduced by 2.'}, 2:{selfCond:{shaken:-1}, text:'Shaken reduced by 1.'}, 1:{text:'No effect.'}, 0:{selfCond:{shaken:1}, text:'Shaken increases by 1.'}}},
  'Retreat':   {cost:3, tactic:null, check:'none', vs:'none', text:'Pull back from the fight.',
    outcomes:{3:{selfCond:{distant:true}, text:'Becomes distant.'}, 2:{selfCond:{distant:true}, text:'Becomes distant (or, if already distant, flees the field and becomes routed).'}, 1:{selfCond:{distant:true}, text:'Becomes distant.'}, 0:{selfCond:{distant:true}, text:'Becomes distant.'}}},
  'All-Out Assault':        {cost:2, tactic:'Merciless', check:'melee', vs:'ac', text:'An all-in strike, ignoring caution.',
    outcomes:{3:{dmg:3, text:'3 damage; +1 bonus if the next attack targets someone else.'}, 2:{dmg:2, text:'2 damage.'}, 1:{dmg:1, text:'1 damage.'}, 0:{selfCond:{outflanked:true}, text:'No damage; becomes outflanked.'}}},
  'Battlefield Medicine':   {cost:3, tactic:'Field Triage', check:'scouting', vs:'flat', dc:25, text:'Treat the wounded.',
    outcomes:{3:{healAlly:2, text:'Restore 2 HP to a damaged allied army.'}, 2:{healAlly:1, text:'Restore 1 HP to a damaged allied army.'}, 1:{text:'No effect.'}, 0:{targetCond:{weary:1}, text:"Increases the treated army's weary by 1."}}},
  'Counterattack':          {cost:0, tactic:'Flexible Tactics', check:'melee', vs:'ac', reaction:true, text:'Strike back when an engaged enemy attempts a maneuver.',
    outcomes:{3:{dmg:1, targetCond:{shaken:1}, text:'1 damage; target shaken increases by 1.'}, 2:{dmg:1, text:'1 damage.'}, 1:{text:'No effect.'}, 0:{text:'No effect.'}}},
  'Covering Fire':          {cost:2, tactic:'Sharpshooter', check:'ranged', vs:'ac', text:'Suppress an enemy with ranged fire.',
    outcomes:{3:{dmg:2, targetCond:{suppressed:true}, text:"2 damage; target can't take maneuver reactions until your next turn."}, 2:{dmg:1, targetCond:{suppressed:true}, text:"1 damage; target can't take maneuver reactions."}, 1:{dmg:1, text:'1 damage.'}, 0:{text:'No effect.'}}},
  'Defensive Stance':       {cost:2, tactic:'Defensive Tactics', check:'maneuver', vs:'flat', dc:10, text:'Cover an ally, shedding their disadvantage.',
    outcomes:{3:{allyCond:{outflanked:false}, text:'A chosen allied army loses all outflanked conditions.'}, 2:{allyCond:{outflanked:false}, text:'A chosen allied army loses outflanked from one source.'}, 1:{text:'No effect.'}, 0:{selfCond:{outflanked:true}, text:'Becomes outflanked.'}}},
  'Dirty Fighting':         {cost:1, tactic:'Flexible Tactics', check:'melee', vs:'ac', text:'Exploit an outflanked, non-distant enemy.',
    outcomes:{3:{targetCond:{weary:2}, text:'Target weary increases by 2.'}, 2:{targetCond:{weary:1}, text:'Target weary increases by 1.'}, 1:{text:'No effect.'}, 0:{targetCond:{weary:-1}, text:"No damage; target's weary is reduced by 1 instead."}}},
  'False Retreat':          {cost:0, tactic:'Flexible Tactics', check:'morale', vs:'morale', reaction:true, text:"Bait a pursuer after a successful Morale check.",
    outcomes:{3:{targetCond:{outflanked:true,suppressed:true}, text:"Target becomes outflanked and can't take reactions."}, 2:{targetCond:{outflanked:true}, text:'Target becomes outflanked.'}, 1:{text:'No effect.'}, 0:{selfCond:{outflanked:true}, text:'Becomes outflanked instead.'}}},
  'Feint':                  {cost:1, tactic:'Flexible Tactics', check:'maneuver', vs:'maneuver', text:'Draw an opening with a false attack.',
    outcomes:{3:{targetCond:{outflanked:true}, text:'Target is outflanked until the end of the turn.'}, 2:{targetCond:{outflanked:true}, text:"Target is outflanked against your next melee Strike this turn."}, 1:{text:'No effect.'}, 0:{selfCond:{outflanked:true}, text:'Becomes outflanked instead.'}}},
  'Outflank':               {cost:2, tactic:'Reckless Flankers', check:'maneuver', vs:'maneuver', text:'Circle around an enemy while staying clear of melee.',
    outcomes:{3:{targetCond:{outflanked:true}, text:'Target becomes outflanked; you choose whether to become engaged.'}, 2:{targetCond:{outflanked:true}, selfCond:{engaged:true}, text:'Target becomes outflanked; you become engaged.'}, 1:{text:'No effect.'}, 0:{selfCond:{outflanked:true}, text:'Becomes outflanked instead.'}}},
  'Overwhelming Bombardment':{cost:2, tactic:'Explosive Shot', check:'ranged', vs:'fortAC', text:"Bombard a fortification (and whatever's inside).",
    outcomes:{3:{dmg:2, text:'2 damage to the fortification, plus 1 damage to up to 2 armies inside.'}, 2:{dmg:1, text:'1 damage to the fortification, plus 1 to either it or an army inside (your choice).'}, 1:{dmg:1, text:'1 damage to the fortification only.'}, 0:{selfCond:{outflanked:true}, text:'No damage; becomes outflanked.'}}},
  'Taunt':                  {cost:1, tactic:'Focused Devotion', check:'morale', vs:'morale', text:'Draw enemy attention and rattle them.',
    outcomes:{3:{targetCond:{shaken:2}, text:'Target shaken increases by 2.'}, 2:{targetCond:{shaken:1}, text:'Target shaken increases by 1.'}, 1:{text:'No effect.'}, 0:{targetCond:{shaken:-1}, text:"Target's shaken is reduced by 1 instead."}}}
};
function warActionsAvailableTo(army){
  return Object.keys(WAR_ACTIONS).filter(name=>{
    const a = WAR_ACTIONS[name];
    return !a.tactic || (army.tactics||[]).includes(a.tactic);
  });
}
// Standard PF2 degree-of-success: beat the DC by 10+ for a crit, miss by 10+ for a crit
// fail, then a natural 20/1 shifts one step further. Returns 3/2/1/0 (crit success ..
// crit failure) — used for war actions specifically, since (unlike most of this app's
// reference-only checks) we actually have concrete opposing AC/DC numbers to check against.
function degreeOfSuccess(roll, bonus, dc){
  const total = roll + bonus;
  let degree = total>=dc ? (total>=dc+10 ? 3 : 2) : (total<=dc-10 ? 0 : 1);
  if(roll===20) degree = Math.min(3, degree+1);
  if(roll===1) degree = Math.max(0, degree-1);
  return degree;
}
const DEGREE_LABEL = {3:'Critical Success', 2:'Success', 1:'Failure', 0:'Critical Failure'};

/* ---------- Hex terrain & work sites (GM sets both manually — the app never infers or
   randomizes terrain). Work Site options are gated by terrain per Establish Work Site
   (2e.aonprd.com/Actions.aspx?ID=1392): Lumber Camps need forest, Mines/Quarries need hill
   or mountain. Farmland is a separate activity (Establish Farmland, Actions.aspx?ID=1383)
   needing plains or hills predominant terrain; it reduces Consumption rather than yielding
   a stockpiled commodity. ---------- */
const HEX_WORK_SITES = {
  'None':        {terrains:null, good:null},
  'Lumber Camp': {terrains:['Forest'], good:'Lumber'},
  'Mine':        {terrains:['Hill','Mountain'], good:'Ore'},
  'Quarry':      {terrains:['Hill','Mountain'], good:'Stone'},
  'Farmland':    {terrains:['Plains','Hill'], good:null, consumptionReduction:1}
};
function workSiteNamesForTerrain(terrain){
  return Object.keys(HEX_WORK_SITES).filter(name=>{
    const def = HEX_WORK_SITES[name];
    return !def.terrains || def.terrains.includes(terrain);
  });
}
// Establish Work Site (2e.aonprd.com/Actions.aspx?ID=1392) spends "RP as determined by
// the hex's most inhospitable terrain" via the "Building on Rough Terrain" sidebar
// (Kingmaker AP p.519) — AoN's page text references that sidebar but doesn't reproduce
// its numbers, so this table is compiled from community transcriptions of it, not the
// primary source directly. Worth double-checking against the book if it ever looks off.
const WORK_SITE_TERRAIN_RP_COST = {Forest:4, Hill:2, Mountain:12, Plains:1, Swamp:8};
function currentControlDC(){
  const baseDC = CONTROL_DC_BY_LEVEL[Math.min(20,Math.max(1,state.level))] || 14;
  return baseDC + sizeRow(state.size).mod;
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
const RANK_ORDER = {U:0, T:1, E:2, M:3, L:4};

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

/* ---------- Urban Grid — each settlement is a 3x3 grid of blocks (9), each block
   holding 4 lots (36 lots total). Metropolis settlements get a second identical grid
   (72 lots total). No road/adjacency/Water-Border pathing here — blocks unlock in a
   fixed sequential order (0..8) purely as counts, not positions. ---------- */
function defaultSettlementGrid(){
  return {
    blocks: 1,   // unlocked blocks in grid 1 (1-9)
    blocks2: 0,  // unlocked blocks in grid 2 (0 or 9) — only nonzero once Metropolis
    lots: Array.from({length:9}, ()=>[null,null,null,null]),
    lots2: Array.from({length:9}, ()=>[null,null,null,null])
  };
}
function gridBlockFillCount(block){ return block.filter(Boolean).length; }
function gridAllBlocksMinFill(lots, blockCount, min){
  for(let i=0;i<blockCount;i++){ if(gridBlockFillCount(lots[i])<min) return false; }
  return true;
}
// Village -> Town -> City -> Metropolis, gated by kingdom level + how full the
// settlement's current blocks are — see the task brief's exact thresholds. This is
// fully repeatable: nothing here is a one-shot, each tier re-evaluates from scratch
// every render, so filling more blocks after a grow always re-opens the next one.
function settlementGrowthTarget(s){
  if(s.type==='Village' && state.level>=3 && gridBlockFillCount(s.grid.lots[0])>=4) return 'Town';
  if(s.type==='Town' && state.level>=9 && gridAllBlocksMinFill(s.grid.lots, s.grid.blocks, 2)) return 'City';
  if(s.type==='City' && state.level>=15 && gridAllBlocksMinFill(s.grid.lots, 9, 2)) return 'Metropolis';
  return null;
}
// Explains exactly what's still missing for the next tier, so an ineligible settlement
// never just silently shows nothing — that silence is what read as "stuck forever".
function settlementGrowthProgress(s){
  if(s.type==='Metropolis') return '';
  const need = [];
  const blockCount = s.type==='Village' ? 1 : (s.type==='Town' ? s.grid.blocks : 9);
  const minFill = s.type==='Village' ? 4 : 2;
  const shortBlocks = [];
  for(let i=0;i<blockCount;i++){ if(gridBlockFillCount(s.grid.lots[i])<minFill) shortBlocks.push(i+1); }
  const levelNeeded = s.type==='Village' ? 3 : (s.type==='Town' ? 9 : 15);
  const nextTier = s.type==='Village' ? 'Town' : (s.type==='Town' ? 'City' : 'Metropolis');
  if(state.level<levelNeeded) need.push(`kingdom level ${levelNeeded} (currently ${state.level})`);
  if(shortBlocks.length) need.push(s.type==='Village'
    ? `the starting block full (${gridBlockFillCount(s.grid.lots[0])}/4 lots)`
    : `block${shortBlocks.length>1?'s':''} ${shortBlocks.join(', ')} to reach ${minFill}+ lots each`);
  return need.length ? `Needs ${need.join(' and ')} to grow to ${nextTier}.` : '';
}
function growSettlementTo(id, targetType, extraBlocks){
  const s = state.settlements.find(x=>x.id===id);
  if(!s || settlementGrowthTarget(s)!==targetType) return;
  if(targetType==='Town') s.grid.blocks = Math.min(9, 1+extraBlocks);
  else if(targetType==='City') s.grid.blocks = 9;
  else if(targetType==='Metropolis') s.grid.blocks2 = 9;
  s.type = targetType;
  scheduleSave(); renderNotesTab();
}
// Shared walk over every currently-placed structure instance (deduped by lot-group id
// so a multi-lot structure is only visited once) — storage/ruin/consumption bonuses
// all read off this the same way ability-score tags read off abilitySources().
function forEachPlacedStructure(cb){
  const seen = new Set();
  state.settlements.forEach(s=>{
    [s.grid.lots, s.grid.lots2].forEach(lots=>{
      lots.forEach(block=>block.forEach(slot=>{
        if(!slot || seen.has(slot.g)) return;
        seen.add(slot.g);
        const def = KM_STRUCTURES.find(x=>x.name===slot.name);
        if(def) cb(def, slot, s);
      }));
    });
  });
}
function structureStorageBonus(good){
  let bonus = 0;
  forEachPlacedStructure(def=>{ if(def.storageBonus && def.storageBonus.good===good) bonus += def.storageBonus.amt; });
  return bonus;
}
// Attribution tags for a commodity's storage bonus — one entry per contributing
// structure instance (not merged), matching the ability-tag "Republic +2" pattern.
function structureStorageTags(good){
  const tags = [];
  forEachPlacedStructure((def,slot,s)=>{ if(def.storageBonus && def.storageBonus.good===good) tags.push({label:`${def.name} (${s.name})`, amt:def.storageBonus.amt}); });
  return tags;
}
function structureConsumptionBonus(){
  let bonus = 0;
  forEachPlacedStructure(def=>{ if(def.consumptionBonus) bonus += def.consumptionBonus; });
  return bonus;
}
// Illicit Market/Thieves' Guild have a fixed "+1 Crime" ruin field; Tenement's is
// "of your choice" and gets resolved once at build time (see placeStructureInLot),
// stored on the lot slot itself as ruinChoice so it can still be attributed per-instance.
function structureRuinContribution(def, slot){
  if(slot.ruinChoice) return {ruin:slot.ruinChoice, amt:1};
  if(!def.ruin) return null;
  const m = /\+(\d+)\s+(Corruption|Crime|Decay|Strife)/.exec(def.ruin);
  return m ? {ruin:m[2], amt:parseInt(m[1],10)} : null;
}
function structureRuinTags(ruinName){
  const tags = [];
  forEachPlacedStructure((def,slot,s)=>{
    const c = structureRuinContribution(def, slot);
    if(c && c.ruin===ruinName) tags.push({label:`${def.name} (${s.name})`, amt:c.amt});
  });
  return tags;
}
function structureRuinBonus(ruinName){ return structureRuinTags(ruinName).reduce((sum,t)=>sum+t.amt,0); }
// r.points/r.penalty stay exactly what manual +/- adjustments (ruinAdjust) have always
// tracked; structure-sourced Ruin is layered on top live (removing the structure removes
// its influence, same as removing any other ongoing bonus) rather than baked into a
// one-time mutation, so it never needs separate refund/reversal bookkeeping.
function effectiveRuinPenalty(name){
  const r = state.ruin[name];
  return r.penalty + Math.floor((r.points + structureRuinBonus(name)) / r.threshold);
}
function goodStorageCap(g){ return sizeRow(state.size).storage + structureStorageBonus(g); }
// Settlement base Consumption by type (2e.aonprd.com/Rules.aspx?ID=1823, "Settlement
// Types" table) and each type's influence radius in hexes (same page) — a Farmland hex
// only reduces Consumption while it lies within some settlement's influence.
const SETTLEMENT_BASE_CONSUMPTION = {Village:1, Town:2, City:4, Metropolis:6};
const SETTLEMENT_INFLUENCE_RADIUS = {Village:0, Town:1, City:2, Metropolis:3};
function settlementConsumptionTotal(){
  return state.settlements.reduce((sum,s)=>sum+(SETTLEMENT_BASE_CONSUMPTION[s.type]||1), 0);
}
// state.consumption tracks army Consumption only (see DEFAULT_STATE) — this wrapper just
// names that clearly at the call site.
function armyConsumptionTotal(){ return state.consumption; }
// BFS hex distance over the same offset-coordinate neighbor function the war-encounter
// map already uses (hexNeighbors) — cheap for the small radii (0-3) influence needs.
function hexDistanceOffset(col1,row1,col2,row2){
  if(col1===col2 && row1===row2) return 0;
  let frontier = [[col1,row1]];
  const seen = new Set([hexKey(col1,row1)]);
  for(let dist=1; dist<=6; dist++){
    const next = [];
    for(const [c,r] of frontier){
      for(const [nc,nr] of hexNeighbors(c,r)){
        if(nc===col2 && nr===row2) return dist;
        const k = hexKey(nc,nr);
        if(seen.has(k)) continue;
        seen.add(k);
        next.push([nc,nr]);
      }
    }
    frontier = next;
  }
  return Infinity;
}
function hexConsumptionReduction(){
  let total = 0;
  Object.entries(state.hexes).forEach(([key,h])=>{
    if(!h || !h.workSite) return;
    const def = HEX_WORK_SITES[h.workSite];
    if(!def || !def.consumptionReduction) return;
    const [col,row] = key.split('_').map(Number);
    const influenced = state.settlements.some(s=> s.col!==undefined && hexDistanceOffset(s.col,s.row,col,row) <= (SETTLEMENT_INFLUENCE_RADIUS[s.type]??0));
    if(influenced) total += def.consumptionReduction;
  });
  return total;
}
// Consumption owed this turn — settlement + army Consumption, minus live reductions
// (Stockyard-style structures, in-influence Farmland hexes), floored at 0.
function effectiveConsumptionOwed(){
  const base = settlementConsumptionTotal() + armyConsumptionTotal();
  return Math.max(0, base - structureConsumptionBonus() - hexConsumptionReduction());
}
// A settlement is Overcrowded when its filled blocks outnumber its Residential lots
// (2e.aonprd.com/Rules.aspx?ID=1824) — it needs 1 Residential lot per block that has any
// structure in it, not one per block that's merely unlocked.
function overcrowdedSettlements(){
  return state.settlements.filter(s=>{
    const blocks = [...s.grid.lots.slice(0,s.grid.blocks), ...s.grid.lots2.slice(0,s.grid.blocks2)];
    const filledBlocks = blocks.filter(block=>block.some(Boolean)).length;
    if(!filledBlocks) return false;
    let residentialLots = 0;
    blocks.forEach(block=>block.forEach(slot=>{
      if(!slot) return;
      const def = KM_STRUCTURES.find(x=>x.name===slot.name);
      if(def && (def.category||[]).includes('Residential')) residentialLots++;
    }));
    return residentialLots < filledBlocks;
  });
}
function inAnarchy(){ return state.unrest>=20; }

/* =====================================================================
   STATE
===================================================================== */
let state = null;
const DEFAULT_STATE = () => ({
  started:false,
  name:'Unnamed Realm', playerCharacter:'', level:1, xp:0, size:1, unrest:0,
  // consumption is army Consumption only now — settlement Consumption is computed fresh
  // each time from settlementConsumptionTotal(), same spirit as claimedHexCount() for Size.
  consumption:0, turn:1, atWar:false, eventDC:16, taxesCollectedLastTurn:false,
  fameType:'Fame', fame:0, fameMax:3, rp:0, turnWizard:null, leadershipTurn:0, leadershipUsed:{}, leadershipUsedNames:{},
  rpSpentThisTurn:0, milestoneRP100Claimed:false, pendingBonusResourceDice:0, pendingBonusRP:0, tradeAgreements:0,
  diplomaticRelations:[], diplomacyMilestoneClaimed:false, relocateCapitalCooldownUntilTurn:0,
  creation:{charter:'', charterFreeBoost:'', heartland:'', government:'', governmentFreeBoost:'', bonusBoost1:'', bonusBoost2:''},
  levelBoosts:[],
  kingdomFeats:[],
  ruin:{Corruption:{points:0,threshold:10,penalty:0}, Crime:{points:0,threshold:10,penalty:0},
        Decay:{points:0,threshold:10,penalty:0}, Strife:{points:0,threshold:10,penalty:0}},
  skills: SKILLS.reduce((o,[n])=>{o[n]={rank:'U',status:0};return o;},{}),
  leaders: ROLES.reduce((o,[r])=>{o[r]={name:'',invested:false,vacant:false,pcHeld:false};return o;},{}),
  goods: GOODS.reduce((o,g)=>{o[g]=0;return o;},{}),
  settlements: [],
  log: [],
  hexes:{},
  armies: [],
  warfareRecruitBlockedTurn: 0,
  warEncounter: null
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
  for(const r of ROLES){ if(!state.leaders[r[0]]) state.leaders[r[0]]={name:'',invested:false,vacant:false,pcHeld:false}; }
  for(const r of ROLES){ if(state.leaders[r[0]].pcHeld===undefined) state.leaders[r[0]].pcHeld=false; }
  for(const g of GOODS){ if(state.goods[g]===undefined) state.goods[g]=0; }
  if(!state.hexes) state.hexes={};
  if(!state.settlements) state.settlements = [];
  state.settlements.forEach(s=>{
    if(!s.type) s.type = 'Village';
    if(s.notes===undefined) s.notes = '';
    if(!s.grid){
      // migrating a save from before the urban grid existed — give it a grid sized
      // to roughly match its old freeform type instead of visually demoting it to Village
      s.grid = defaultSettlementGrid();
      if(s.type==='Town') s.grid.blocks = 3;
      else if(s.type==='City'){ s.grid.blocks = 9; }
      else if(s.type==='Metropolis'){ s.grid.blocks = 9; s.grid.blocks2 = 9; }
      // carry the old freeform structure tags forward as text rather than losing them —
      // they don't map cleanly onto specific lots, so re-entering them into the grid is manual
      if(Array.isArray(s.structures) && s.structures.length){
        const carried = `Structures from before the lot grid (re-enter into the grid above if you want them tracked mechanically): ${s.structures.join(', ')}`;
        s.notes = s.notes ? s.notes+'\n'+carried : carried;
      }
    }
  });
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
  checkForUpdateOnce();
}
function downloadJsonFile(jsonText, nameHint){
  const blob = new Blob([jsonText], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (nameHint||'kingdom').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  const date = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `${safeName || 'kingdom'}-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function exportState(){
  downloadJsonFile(JSON.stringify(state, null, 2), state.name);
}
async function exportKingdomById(id){
  if(id===currentKingdomId && state) await saveCurrentKingdom();
  const raw = await storageGet(kingdomDataKey(id));
  if(!raw){ alert("Could not find that kingdom's data to export."); return; }
  const k = kingdomIndex.find(x=>x.id===id);
  downloadJsonFile(raw, k && k.name);
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
   TAP-TO-EXPLAIN — one consistent pattern for "what does this mean"
   across the whole app: a small ⓘ next to a term opens a centered card
   with a short explanation, tap anywhere to dismiss. Reused everywhere
   instead of a different treatment per screen.
===================================================================== */
const INFO_TIPS = {
  Culture:  'One of the four kingdom abilities. Governs Arts, Folklore, Magic, and Scholarship; its Ruin is Corruption.',
  Economy:  'One of the four kingdom abilities. Governs Boating, Exploration, Industry, and Trade; its Ruin is Crime.',
  Loyalty:  'One of the four kingdom abilities. Governs Intrigue, Politics, Statecraft, and Warfare; its Ruin is Strife.',
  Stability:'One of the four kingdom abilities. Governs Agriculture, Defense, Engineering, and Wilderness; its Ruin is Decay.',
  Corruption:'Ruin from decadence, vice, and moral decline. Linked to Culture — high Corruption drags down Culture-based checks.',
  Crime:    'Ruin from lawlessness and criminal enterprise. Linked to Economy — high Crime drags down Economy-based checks.',
  Decay:    'Ruin from neglected infrastructure and civic rot. Linked to Stability — high Decay drags down Stability-based checks.',
  Strife:   'Ruin from discord, factionalism, and conflict. Linked to Loyalty — high Strife drags down Loyalty-based checks.',
  'Control DC': "The difficulty for most kingdom-wide checks — your kingdom level's base DC, adjusted by its Size.",
  RP: 'Resource Points — the kingdom\'s spendable resource. Refilled by Resource Dice each turn (Upkeep), spent on structures, Work Sites, army gear, and recruitment/training costs.',
  Unrest: 'Kingdom-wide unhappiness. High Unrest imposes a penalty on kingdom skill checks, causes Ruin to accumulate each Upkeep at 10+, and pushes the kingdom into Anarchy at 20+.',
  Consumption: "Food owed each turn during Upkeep — settlement Consumption (by size) plus army Consumption, minus storage-bonus structures and in-influence Farmland hexes. Paid from the Food stockpile; unpaid Consumption costs 5 RP per point or raises Unrest by 1d4.",
  Overcrowded: "A settlement lacking enough Residential lots — it needs 1 Residential lot per block that has any structure built in it. An Overcrowded settlement adds +1 Unrest each Upkeep.",
  'At War': "A kingdom-wide flag you set manually. While at war, Upkeep's Adjust Unrest step adds +1 Unrest, and Army Activities become available during the Activity phase.",
  Ruler: 'Leadership role tied to Loyalty — traditionally the head of state.', Counselor: 'Leadership role tied to Culture — the voice of scholars, priests, and advisors.',
  General: 'Leadership role tied to Stability — commands the kingdom\'s military affairs.', Emissary: 'Leadership role tied to Loyalty — the kingdom\'s face in diplomacy.',
  Magister: 'Leadership role tied to Culture — oversees arcane and magical matters.', Treasurer: 'Leadership role tied to Economy — manages the kingdom\'s finances.',
  Viceroy: 'Leadership role tied to Economy — administers frontier and outlying territory.', Warden: 'Leadership role tied to Stability — protects the kingdom\'s borders and settlements.',
  Scouting: "An army's initiative modifier for a war encounter — also sets the DC (Scouting+10) for enemies to detect it while ambushing.",
  Maneuver: "An army's save against tactical, positioning, and physical effects — used for most non-attack war actions.",
  Morale: "An army's save against having its cohesion or will to fight undermined — used to resist Rout when at/below its Rout Threshold.",
  'Rout Threshold': "HP level (usually half an army's max HP) at or below which it must make a Morale check after each round or start routing.",
  Efficient: 'A condition granted by a critical success on most Army Activities — lets the army take a second Army Activity immediately, at a −5 penalty, or reduce another condition by 1.',
  Shaken: "A worsening condition — each point penalizes Morale checks. An army becomes routed at Shaken 4.",
  Weary: "A worsening condition — each point penalizes AC and Maneuver checks (and doubles the penalty on Deploy).",
  Mired: "A worsening condition — each point penalizes Maneuver checks. An army becomes pinned at Mired 4."
};
function showInfoTip(term){
  const text = INFO_TIPS[term] || 'No description available yet.';
  const overlay = document.createElement('div');
  overlay.id = 'info-tip-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:120;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:320px;width:100%;margin:0;">
    <h3 style="margin-bottom:6px;">${escapeHtml(term)}</h3>
    <div class="hint" style="margin-top:0;">${escapeHtml(text)}</div>
  </div>`;
  overlay.addEventListener('click', ()=>overlay.remove());
  document.body.appendChild(overlay);
}
function infoIcon(term){
  return `<span class="info-icon" onclick="event.stopPropagation();showInfoTip('${escapeAttr(term)}')" title="What's this?">ⓘ</span>`;
}

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
              <button type="button" class="kingdom-row-export" onclick="exportKingdomById('${k.id}')" title="Export">↓</button>
              <button type="button" class="kingdom-row-delete" onclick="confirmDeleteKingdom('${k.id}')" title="Delete">✕</button>
            </div>`).join('')}
        </div>` : ''}
      <input type="file" accept="application/json" id="creation-import-input" style="display:none;" onchange="importStateFile(this)">
      <button class="ghost" style="margin-top:14px;" onclick="document.getElementById('creation-import-input').click()">↑ Load from a backup file</button>

      <div class="card" style="margin-top:20px;">
        <h3>Backup</h3>
        <div class="hint" style="margin-top:0;">Your kingdoms are saved on this device only. Use the ↓ button on any kingdom above to back it up or move it to another device — import that file with the button above to pick up right where you left off.</div>
      </div>

      <div class="card">
        <h3>App Version <span class="sub">${APP_VERSION}${isHotUpdated()?' (hot-updated)':''}</span></h3>
        <div class="hint" style="margin-top:0;" id="update-check-result">${renderUpdateStatusLine()}</div>
        ${updateCheck.status==='available' ? `
          <button class="ghost" id="hot-update-btn" style="margin-top:8px;" onclick="applyHotUpdate()">Quick update (no reinstall)</button>
          ${window.AndroidUpdater ? `<button class="ghost" id="full-update-btn" style="margin-top:8px;" onclick="downloadAndInstallLatestApk()">Full update (new install)</button>` : ''}
        ` : ''}
        ${isHotUpdated() ? `<button class="ghost danger-ghost" style="margin-top:8px;" onclick="resetToBundledVersion()">Reset to version built into the app</button>` : ''}
      </div>`;
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
  safeRender(renderWarfareTab, 'tab-warfare');
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
      <div class="seal"><div class="val mono">${totalDC}</div><div class="lbl">Control DC${infoIcon('Control DC')}</div><div class="sub">${sz.type}</div></div>
      <div class="seal"><div class="val mono">${state.size}</div><div class="lbl">Size</div><div class="sub">hexes</div></div>
      <div class="seal"><div class="val mono">${state.rp}</div><div class="lbl">RP${infoIcon('RP')}</div><div class="sub">${sz.die}×${diceCount}${featResourceDieBonus()?`+${featResourceDieBonus()}`:''}/turn</div></div>
      <div class="seal"><div class="val mono">${state.unrest}</div><div class="lbl">Unrest${infoIcon('Unrest')}</div><div class="sub">${unrestPenalty(state.unrest)<0?fmt(unrestPenalty(state.unrest))+' checks':'no penalty'}</div>
        <div class="stepper" style="justify-content:center;margin-top:6px;"><button onclick="adjust('unrest',-1)">−</button><button onclick="adjust('unrest',1)">+</button></div>
      </div>
      <div class="seal"><div class="val mono">${state.fame}</div><div class="lbl">${state.fameType}</div><div class="sub">of ${state.fameMax}</div></div>
    </div>

    <div class="card">
      <div class="card-head-row"><h3 style="margin-bottom:0;">Commodities</h3><span class="pill">Base ${sz.storage}</span></div>
      <div class="commod-row">
        ${GOODS.map(g=>`
          <div class="commod-cell">
            <div class="icon">${GOODS_ICON[g]}</div>
            <div class="name">${g}</div>
            <div class="val">${state.goods[g]}<span style="color:var(--text-muted);font-size:10px;">/${goodStorageCap(g)}</span></div>
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
              <td>${l.vacant||!l.name ? '<span style="color:var(--rust);font-style:italic;">Vacant</span>' : (l.pcHeld?'★ ':'')+escapeHtml(l.name)}</td>
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
      <div class="card-head-row"><h3 style="margin-bottom:0;">Kingdom Turn</h3>${state.turnWizard ? `<span class="pill" style="color:var(--gold);border-color:var(--gold-dim);">Phase ${WIZARD_PHASES.indexOf(state.turnWizard.phase)+1} of 4</span>` : ''}</div>
      <div class="hint" style="margin-top:0;">Walks through all four Kingdom turn phases — Upkeep, Commerce, Activity, and Event. You can close it at any point (even mid-phase, to go build something on another tab) and resume exactly where you left off.</div>
      <button class="action" onclick="openKingdomTurnWizard()">${state.turnWizard ? 'Resume Kingdom Turn' : 'Start Kingdom Turn'}</button>
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

    `;
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
    const ruinTags = structureRuinTags(rn);
    const effPenalty = effectiveRuinPenalty(rn);
    const abSkills = SKILLS.filter(([,ab])=>ab===a);
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h3 style="margin-bottom:2px;">${a}${infoIcon(a)}</h3>
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
        <div class="label" style="display:flex;align-items:center;gap:6px;"><span style="color:var(--rust);">†</span>${rn}${infoIcon(rn)}</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="mono" style="font-size:12px;color:${effPenalty?'var(--rust)':'var(--text-muted)'};">${ruin.points}/${ruin.threshold}${effPenalty?` (${fmt(-effPenalty)})`:''}</span>
          <div class="stepper">
            <button onclick="ruinAdjust('${rn}',-1)">−</button>
            <button onclick="ruinAdjust('${rn}',1)">+</button>
          </div>
        </div>
      </div>
      ${ruinTags.length ? `<div class="ability-tags">${ruinTags.map(t=>`<span class="ability-tag neg">${escapeHtml(t.label)} +${t.amt} ${rn}</span>`).join('')}</div>` : ''}

      <div style="margin-top:6px;">
        ${abSkills.map(([name])=>{
          const s = state.skills[name];
          const profBonus = RANK_BONUS(s.rank, state.level);
          const featBonus = featSkillBonus(name);
          const total = mod(score) + profBonus + featBonus + (s.status||0) - effPenalty - Math.abs(Math.min(0,unrestPenalty(state.unrest)));
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
  const pcCount = ROLES.filter(([r])=>state.leaders[r].pcHeld).length;
  document.getElementById('leaders-list').innerHTML = `
    ${pcCount>0 ? `<button class="ghost" style="margin-bottom:10px;" onclick="investPCsFirst()">Invest PC-held roles first</button>` : ''}
    ${ROLES.map(([role,ab])=>{
    const l = state.leaders[role];
    const isPreset = STORY_NPCS.includes(l.name);
    const showCustomInput = customNameRoles.has(role) || (l.name && !isPreset && !l.pcHeld);
    return `<div class="row" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="label">${role}${infoIcon(role)}${l.pcHeld?' <span class="pill" style="color:var(--gold);border-color:var(--gold-dim);">★ PC-held</span>':''}<small>key ability: ${ab}</small></div>
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);">
          <input type="checkbox" ${l.invested?'checked':''} onchange="toggleInvest('${role}',this.checked)"> invested
        </label>
      </div>
      <div style="display:flex;gap:8px;margin-top:6px;flex-direction:column;">
        <select class="wide" onchange="handleLeaderSelect('${role}', this.value)">
          <option value="" ${!l.name?'selected':''}>— Vacant —</option>
          ${state.playerCharacter ? `<option value="__pc__" ${l.pcHeld?'selected':''}>★ ${escapeHtml(state.playerCharacter)} (your character)</option>` : ''}
          ${STORY_NPCS.map(n=>`<option value="${escapeAttr(n)}" ${l.name===n && !l.pcHeld?'selected':''}>${escapeHtml(n)}${STORY_NPC_BONUS[n]?' · '+escapeHtml(STORY_NPC_BONUS[n]):''}</option>`).join('')}
          <option value="__custom__" ${showCustomInput?'selected':''}>Custom…</option>
        </select>
        ${showCustomInput ? `<input class="wide" type="text" placeholder="Custom name" value="${escapeAttr(isPreset?'':l.name)}" onchange="state.leaders['${role}'].name=this.value;scheduleSave();render();">` : ''}
        <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--rust);white-space:nowrap;">
          <input type="checkbox" ${l.vacant?'checked':''} onchange="state.leaders['${role}'].vacant=this.checked;scheduleSave();render();"> vacant
        </label>
      </div>
    </div>`;
  }).join('')}`;
  renderLeadershipActivitiesCard();
  renderNPCRoster();
}
// PC-held is a real structural flag, not just a name string — matters for the Event-
// resolution bonus (a role's PC holder, no vacancy penalty, boosts that role's event
// checks) and is why picking it isn't the same as typing the name into Custom.
function handleLeaderSelect(role, val){
  if(val==='__custom__'){
    customNameRoles.add(role);
    state.leaders[role].pcHeld = false;
    if(STORY_NPCS.includes(state.leaders[role].name)) state.leaders[role].name = '';
  } else if(val==='__pc__'){
    customNameRoles.delete(role);
    state.leaders[role].name = state.playerCharacter;
    state.leaders[role].pcHeld = true;
    // soft default, not a hard rule: a newly PC-held role gets invested automatically
    // if there's room, since Step 7 of kingdom creation says PCs are invested first —
    // this never un-invests anything else, it's just a sensible starting point.
    const investedCount = ROLES.filter(([r])=>state.leaders[r].invested).length;
    if(!state.leaders[role].invested && investedCount<4) state.leaders[role].invested = true;
  } else {
    customNameRoles.delete(role);
    state.leaders[role].name = val;
    state.leaders[role].pcHeld = false;
  }
  scheduleSave(); render();
}
// Explicit, user-triggered re-ordering (not automatic) — invests every PC-held role
// first, then fills any remaining slots (up to 4) with whichever NPC roles were
// already invested. Never invests a role that wasn't already chosen by name.
function investPCsFirst(){
  const pcRoles = ROLES.filter(([r])=>state.leaders[r].pcHeld).map(([r])=>r);
  const otherInvested = ROLES.filter(([r])=>state.leaders[r].invested && !state.leaders[r].pcHeld).map(([r])=>r);
  ROLES.forEach(([r])=>{ state.leaders[r].invested = false; });
  let slots = 4;
  pcRoles.slice(0,slots).forEach(r=>{ state.leaders[r].invested = true; slots--; });
  otherInvested.slice(0,slots).forEach(r=>{ state.leaders[r].invested = true; });
  scheduleSave(); render();
}
function toggleInvest(role, checked){
  const investedCount = ROLES.filter(([r])=>state.leaders[r].invested).length;
  if(checked && investedCount>=4){ render(); return; }
  state.leaders[role].invested = checked;
  scheduleSave(); render();
}

/* ---------- LEADERSHIP ACTIVITIES — reference + logging, not dice-rolling: the app
   shows what's available and its skill, picking one from the list confirms it happened
   at the table, exactly like the Upkeep wizard's steps. ---------- */
function capitalSettlement(){
  const capitalEntry = Object.entries(state.hexes).find(([,h])=>h && h.type==='Capital');
  if(!capitalEntry) return null;
  const [col,row] = capitalEntry[0].split('_').map(Number);
  return state.settlements.find(s=>s.col===col && s.row===row) || null;
}
function capitalHasLeadershipBonusStructure(){
  const cap = capitalSettlement();
  if(!cap) return false;
  let found = false;
  forEachPlacedStructure((def,slot,s)=>{ if(s===cap && ['Castle','Palace','Town Hall'].includes(def.name)) found = true; });
  return found;
}
function ensureLeadershipTurnFresh(){
  if(state.leadershipTurn !== state.turn){ state.leadershipTurn = state.turn; state.leadershipUsed = {}; state.leadershipUsedNames = {}; }
}
// Base cap is 2 (3 with a Castle/Palace/Town Hall in the capital); a role that forfeited
// one of its three activities during Upkeep Step 1 (missed downtime — see the Kingdom
// Turn wizard) has that cap reduced by 1 for this turn only.
function leadershipActivityCap(role){
  const base = capitalHasLeadershipBonusStructure() ? 3 : 2;
  const forfeit = state.turnWizard && state.turnWizard.upkeep.leadership && role && state.turnWizard.upkeep.leadership.forfeit.includes(role);
  return Math.max(0, base - (forfeit?1:0));
}
function leadershipActivitiesRemaining(role){
  ensureLeadershipTurnFresh();
  return Math.max(0, leadershipActivityCap(role) - (state.leadershipUsed[role]||0));
}
// Reasons an otherwise-mechanized Leadership activity can't be picked right now — same
// "gray it out and say why" idiom used for unaffordable Build Structure options.
function leadershipActivityDisabledReason(name){
  if(name==='Capital Investment'){
    const cap = capitalSettlement();
    let hasBank = false;
    if(cap) forEachPlacedStructure((def,slot,s)=>{ if(s===cap && def.name==='Bank') hasBank = true; });
    if(!hasBank) return 'Needs a Bank in the capital.';
  }
  if(name==='Relocate Capital' && state.turn < state.relocateCapitalCooldownUntilTurn){
    return `On cooldown until turn ${state.relocateCapitalCooldownUntilTurn}.`;
  }
  return null;
}
function openLeadershipActivityPicker(role){
  const l = state.leaders[role];
  const remaining = leadershipActivitiesRemaining(role);
  const usedNames = state.leadershipUsedNames[role]||[];
  const overlay = document.createElement('div');
  overlay.id = 'leadership-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <h3>${role} — ${escapeHtml(l.name)}</h3>
    <div class="hint" style="margin-top:0;">${remaining} of ${leadershipActivityCap(role)} Leadership activities left this turn. Most of these resolve automatically once you tell it the check's outcome — a few (marked "log only") still just need the table's result written down.</div>
    <div style="margin-top:8px;max-height:55vh;overflow-y:auto;">
      ${Object.entries(LEADERSHIP_ACTIVITIES).map(([name,def])=>{
        const already = usedNames.includes(name);
        const disabledReason = already ? null : leadershipActivityDisabledReason(name);
        const disabled = already || disabledReason;
        return `<button type="button" class="option-card" ${disabled?'style="opacity:.4;pointer-events:none;"':''} onclick="startLeadershipActivity('${role}','${escapeAttr(name)}')">
          <div class="opt-name">${escapeHtml(name)}${!def.outcomes?' <span style="color:var(--text-muted);font-weight:400;font-size:11px;">(log only)</span>':''} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(${def.skills.join(' / ')})</span></div>
          <div class="opt-detail">${already?'Already used this turn. ':disabledReason?disabledReason+' ':''}${escapeHtml(def.note)}</div>
        </button>`;}).join('')}
    </div>
    <button class="ghost" style="margin-top:8px;" onclick="closeLeadershipOverlay()">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function closeLeadershipOverlay(){
  const el = document.getElementById('leadership-overlay');
  if(el) el.remove();
  const extra = document.getElementById('leadership-extra-overlay');
  if(extra) extra.remove();
}
// Log-only path — used for activities with no `outcomes` table (Hire Adventurers, Focused
// Attention) and as the fallback the mechanized path always ends at (finalizeLeadershipActivity).
function logLeadershipActivity(role, activityName){
  if(leadershipActivitiesRemaining(role)<=0) return;
  if((state.leadershipUsedNames[role]||[]).includes(activityName)) return;
  const l = state.leaders[role];
  const def = LEADERSHIP_ACTIVITIES[activityName];
  finalizeLeadershipActivity(role, activityName, `used ${activityName} (${def.skills.join('/')}).`, '');
}
function finalizeLeadershipActivity(role, name, text, mechNote){
  const l = state.leaders[role];
  state.leadershipUsed[role] = (state.leadershipUsed[role]||0)+1;
  state.leadershipUsedNames[role] = [...(state.leadershipUsedNames[role]||[]), name];
  state.log.unshift({turn:state.turn, note:`Leadership — ${role} (${l.name||'vacant'}) ${text}${mechNote}`});
  closeLeadershipOverlay();
  scheduleSave();
  render();
}
let leadershipRollCallback = null;
function promptLeadershipRoll(title, hint, max, cb){
  leadershipRollCallback = cb;
  const overlay = document.createElement('div');
  overlay.id = 'leadership-roll-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:115;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:320px;width:100%;margin:0;">
    <h3>${escapeHtml(title)}</h3>
    <div class="hint" style="margin-top:0;">${escapeHtml(hint)}</div>
    <input class="num" type="number" min="0" ${max?`max="${max}"`:''} id="leadership-roll-input" placeholder="Rolled result">
    <button class="action" style="margin-top:8px;" onclick="confirmLeadershipRoll(${max||0})">Confirm</button>
  </div>`;
  document.body.appendChild(overlay);
}
function confirmLeadershipRoll(max){
  const v = parseInt(document.getElementById('leadership-roll-input').value,10);
  if(isNaN(v) || v<0 || (max && v>max)){ alert('Enter a valid roll.'); return; }
  document.getElementById('leadership-roll-overlay').remove();
  const cb = leadershipRollCallback;
  leadershipRollCallback = null;
  if(cb) cb(v);
}
function startLeadershipActivity(role, name){
  if(leadershipActivitiesRemaining(role)<=0) return;
  if((state.leadershipUsedNames[role]||[]).includes(name)) return;
  if(leadershipActivityDisabledReason(name)) return;
  const def = LEADERSHIP_ACTIVITIES[name];
  if(!def.outcomes){ closeLeadershipOverlay(); logLeadershipActivity(role, name); return; }
  closeLeadershipOverlay();
  if(name==='Relocate Capital'){ openLeadershipSettlementPicker(role, name); return; }
  if(def.needsRuinInput){ openLeadershipRuinPicker(role, name); return; }
  if(def.needsGoodInput){ openLeadershipGoodPicker(role, name); return; }
  if(def.needsGroupInput || def.needsHexInput){ openLeadershipTextInput(role, name); return; }
  openDegreePicker(name, d=>resolveLeadershipActivity(role, name, d, {}));
}
function openLeadershipRuinPicker(role, name){
  const overlay = document.createElement('div');
  overlay.id = 'leadership-extra-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:110;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:340px;width:100%;margin:0;">
    <h3>${escapeHtml(name)} — which Ruin?</h3>
    <div class="hint" style="margin-top:0;">Arts→Corruption, Trade→Crime, Engineering→Decay, Intrigue→Strife.</div>
    <div class="boost-picker" style="margin-top:10px;">
      ${['Corruption','Crime','Decay','Strife'].map(r=>`<button type="button" onclick="document.getElementById('leadership-extra-overlay').remove();openDegreePicker('${escapeAttr(name)}', d=>resolveLeadershipActivity('${role}','${escapeAttr(name)}',d,{ruin:'${r}'}))">${r}</button>`).join('')}
    </div>
    <button class="ghost" style="margin-top:10px;" onclick="document.getElementById('leadership-extra-overlay').remove();">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function openLeadershipGoodPicker(role, name){
  const overlay = document.createElement('div');
  overlay.id = 'leadership-extra-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:110;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:340px;width:100%;margin:0;">
    <h3>${escapeHtml(name)} — pick a Commodity</h3>
    <div class="hint" style="margin-top:0;">Costs 8 RP for Luxuries, 4 RP for anything else, spent up front.</div>
    ${GOODS.map(g=>{ const cost = g==='Luxuries'?8:4; const short = state.rp<cost;
      return `<button type="button" class="option-card" ${short?'style="opacity:.45;pointer-events:none;"':''} onclick="document.getElementById('leadership-extra-overlay').remove();state.rp-=${cost};state.rpSpentThisTurn=(state.rpSpentThisTurn||0)+${cost};openDegreePicker('${escapeAttr(name)}', d=>resolveLeadershipActivity('${role}','${escapeAttr(name)}',d,{good:'${g}'}))">
        <div class="opt-name">${g} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(${cost} RP${short?', not enough':''})</span></div>
      </button>`;}).join('')}
    <button class="ghost" style="margin-top:8px;" onclick="document.getElementById('leadership-extra-overlay').remove();">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function openLeadershipSettlementPicker(role, name){
  const cap = capitalSettlement();
  const eligible = state.settlements.filter(s=>{
    if(cap && s.id===cap.id) return false;
    let hasBonus = false;
    forEachPlacedStructure((def,slot,st)=>{ if(st===s && ['Castle','Palace','Town Hall'].includes(def.name)) hasBonus = true; });
    return hasBonus;
  });
  const overlay = document.createElement('div');
  overlay.id = 'leadership-extra-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:110;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:340px;width:100%;margin:0;">
    <h3>${escapeHtml(name)} — new capital</h3>
    <div class="hint" style="margin-top:0;">Only settlements with a Castle, Palace, or Town Hall qualify. All leaders will spend every Leadership activity they have left this turn on this.</div>
    ${eligible.length ? eligible.map(s=>`<button type="button" class="option-card" onclick="startRelocateCapital('${role}',${s.id})">
      <div class="opt-name">${escapeHtml(s.name)}</div>
    </button>`).join('') : '<div class="hint" style="margin-top:0;">No settlement qualifies yet — needs a Castle, Palace, or Town Hall.</div>'}
    <button class="ghost" style="margin-top:8px;" onclick="document.getElementById('leadership-extra-overlay').remove();">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function startRelocateCapital(role, settlementId){
  document.getElementById('leadership-extra-overlay').remove();
  ROLES.forEach(([r])=>{ if(state.leaders[r].name && !state.leaders[r].vacant) state.leadershipUsed[r] = leadershipActivityCap(r); });
  openDegreePicker('Relocate Capital', d=>resolveLeadershipActivity(role, 'Relocate Capital', d, {settlementId}));
}
function openLeadershipTextInput(role, name){
  const def = LEADERSHIP_ACTIVITIES[name];
  const overlay = document.createElement('div');
  overlay.id = 'leadership-extra-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:110;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:340px;width:100%;margin:0;">
    <h3>${escapeHtml(name)}</h3>
    ${def.needsGroupInput ? `<div class="row"><div class="label">Group / faction${def.needsGroupInput==='optional'?' (optional)':''}</div><input type="text" class="wide" id="leadership-extra-group" placeholder="e.g. the Sootscale goblins"></div>` : ''}
    ${def.needsHexInput ? `<div class="row"><div class="label">Their hex${def.needsHexInput==='optional'?' (optional)':''}</div><input type="text" class="wide" id="leadership-extra-hex" style="max-width:100px;" placeholder="e.g. F6"></div>` : ''}
    <button class="action" style="margin-top:8px;" onclick="confirmLeadershipTextInput('${role}','${escapeAttr(name)}')">Continue</button>
    <button class="ghost" style="margin-top:8px;" onclick="document.getElementById('leadership-extra-overlay').remove();">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function confirmLeadershipTextInput(role, name){
  const def = LEADERSHIP_ACTIVITIES[name];
  const group = def.needsGroupInput ? (document.getElementById('leadership-extra-group').value||'').trim() : '';
  if(def.needsGroupInput===true && !group){ alert('Enter a group or faction name.'); return; }
  const hexInput = def.needsHexInput ? (document.getElementById('leadership-extra-hex').value||'').trim() : '';
  let hex = null;
  if(hexInput){
    const parsed = parseHexLabel(hexInput);
    if(!parsed){ alert("Couldn't read that hex label — try e.g. F6."); return; }
    hex = parsed;
  }
  document.getElementById('leadership-extra-overlay').remove();
  openDegreePicker(name, d=>resolveLeadershipActivity(role, name, d, {group, hex}));
}
// Mechanical resolution for every Leadership activity with an `outcomes` table — same
// pattern as resolveCommerceActivity/resolveRegionActivity: apply real state changes, build
// a mechNote showing the exact numbers (not just the outcome description), then log it.
// Two consistent simplifications apply everywhere below, to stay faithful without inventing
// UI the rest of the app doesn't have: "roll N Resource Dice, GAIN that RP" defers to
// pendingBonusResourceDice (rolled together with next turn's Resource Dice step, exactly
// how Commerce's Trade Commodities/Manage Trade Agreements already do it); RP/Unrest/
// Commodity COSTS or immediate dice gains prompt an actual roll via promptLeadershipRoll,
// same as the Ruin/Consumption steps already do.
function resolveLeadershipActivity(role, name, degree, extra){
  const def = LEADERSHIP_ACTIVITIES[name];
  const text = def.outcomes[degree];
  const finish = mechNote => finalizeLeadershipActivity(role, name, `used ${name}: ${text}`, mechNote||'');
  const addGood = (g, amt) => { state.goods[g] = addWithCap(state.goods[g], amt, goodStorageCap(g)); };
  switch(name){
    case 'Pledge of Fealty': {
      let note = '';
      if(degree>=2 && extra.group && !state.diplomaticRelations.includes(extra.group)){
        state.diplomaticRelations.push(extra.group); note += ` Added "${extra.group}" to Diplomatic Relations.`;
      }
      if(degree===3 && extra.hex){
        const key = hexKey(extra.hex.col, extra.hex.row);
        const h = state.hexes[key] || {name:'',note:'',resources:'',features:'',terrain:'',workSite:'',resourceFlag:false,type:''};
        if(!CLAIMED_HEX_TYPES.includes(h.type)){ h.type='Claimed Territory'; state.hexes[key]=h; state.xp+=10; note += ` Claimed ${hexLabel(extra.hex.col,extra.hex.row)} (+10 XP).`; }
      }
      if(degree===2){
        promptLeadershipRoll('Pledge of Fealty — integration cost', 'Roll 1 Resource Die — that RP is spent to integrate the group.', 12, v=>{
          state.rp = Math.max(0, state.rp-v); state.rpSpentThisTurn = (state.rpSpentThisTurn||0)+v;
          finish(note+` −${v} RP.`);
        });
        return;
      }
      if(degree===1){ state.unrest += 1; note += ' +1 Unrest.'; }
      if(degree===0){ state.unrest += 2; note += ' +2 Unrest (pick a Ruin to raise +1 on the Abilities tab).'; }
      finish(note);
      return;
    }
    case 'Send Diplomatic Envoy': {
      let note = '';
      if(degree>=2 && extra.group){
        if(!state.diplomaticRelations.includes(extra.group)) state.diplomaticRelations.push(extra.group);
        note += ` Diplomatic relations established with "${extra.group}".`;
        if(!state.diplomacyMilestoneClaimed){ state.xp += 60; state.diplomacyMilestoneClaimed = true; note += ' First-ever relations: +60 kingdom XP milestone.'; }
      }
      if(degree===0){
        promptLeadershipRoll('Send Diplomatic Envoy — setback', 'Roll 1d4 Unrest.', 4, v=>{ state.unrest += v; finish(note+` +${v} Unrest.`); });
        return;
      }
      finish(note);
      return;
    }
    case 'Creative Solution': case 'Supernatural Solution': {
      if(degree===3){ finish(''); return; }
      const label = degree===2 ? '1d4' : '2d6';
      const max = degree===2 ? 4 : 12;
      promptLeadershipRoll(`${name} — research cost`, `Roll ${label} RP to spend.`, max, v=>{
        state.rp = Math.max(0, state.rp-v); state.rpSpentThisTurn = (state.rpSpentThisTurn||0)+v;
        finish(` −${v} RP.`);
      });
      return;
    }
    case 'Provide Care': {
      let note = '';
      if(degree===3){ state.unrest = Math.max(0, state.unrest-1); note = ' −1 Unrest (pick a Ruin to lower −1 on the Abilities tab too).'; }
      else if(degree===2){ state.unrest = Math.max(0, state.unrest-1); note = ' −1 Unrest.'; }
      else if(degree===0){ state.unrest += 1; note = ' +1 Unrest.'; }
      finish(note);
      return;
    }
    case 'Quell Unrest': {
      if(degree===3){ promptLeadershipRoll('Quell Unrest', 'Roll 1d6 Unrest reduction.', 6, v=>{ state.unrest = Math.max(0, state.unrest-v); finish(` −${v} Unrest.`); }); return; }
      if(degree===2){ state.unrest = Math.max(0, state.unrest-1); finish(' −1 Unrest.'); return; }
      if(degree===0){ promptLeadershipRoll('Quell Unrest — backfire', 'Roll 1d4 Unrest gained.', 4, v=>{ state.unrest += v; finish(` +${v} Unrest.`); }); return; }
      finish('');
      return;
    }
    case 'Repair Reputation': {
      const ruin = extra.ruin;
      if(degree===3){ ruinAdjust(ruin,-2); state.ruin[ruin].penalty = Math.max(0, state.ruin[ruin].penalty-1); finish(` ${ruin} −2, penalty −1.`); return; }
      if(degree===2){ ruinAdjust(ruin,-1); finish(` ${ruin} −1.`); return; }
      if(degree===0){ promptLeadershipRoll('Repair Reputation — backfire', 'Roll 1d4 Unrest.', 4, v=>{ state.unrest += v; finish(` +${v} Unrest.`); }); return; }
      finish('');
      return;
    }
    case 'Request Foreign Aid': {
      if(degree===3){ state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0)+2; finish(' +2 bonus Resource Dice next turn.'); return; }
      if(degree===2){ state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0)+1; finish(' +1 bonus Resource Die next turn (or take a +2 check bonus instead, your choice).'); return; }
      if(degree===1){
        promptLeadershipRoll('Request Foreign Aid — delayed aid', 'Roll 1d4 RP, credited next turn.', 4, v=>{
          state.pendingBonusRP = (state.pendingBonusRP||0)+v; finish(` +${v} RP next turn.`);
        });
        return;
      }
      promptLeadershipRoll('Request Foreign Aid — refused', 'Roll 1d4 Unrest.', 4, v=>{ state.unrest += v; finish(` +${v} Unrest.`); });
      return;
    }
    case 'Rest and Relax': {
      if(degree===3 || degree===2){ state.unrest = Math.max(0, state.unrest-1); finish(' −1 Unrest.'); return; }
      finish('');
      return;
    }
    case 'Celebrate Holiday': {
      if(degree===3){ finish(''); return; }
      if(degree===2 || degree===1){
        promptLeadershipRoll('Celebrate Holiday — cost', 'Roll 1 Resource Die to spend.', 12, v=>{
          if(state.rp<v){ state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0)-4; finish(` Couldn't cover ${v} RP — downgraded to critical failure (−4 Resource Dice next turn).`); return; }
          state.rp -= v; state.rpSpentThisTurn = (state.rpSpentThisTurn||0)+v;
          finish(` −${v} RP.`);
        });
        return;
      }
      state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0)-4;
      finish(' −4 Resource Dice next turn.');
      return;
    }
    case 'Craft Luxuries': {
      if(degree===3){ promptLeadershipRoll('Craft Luxuries', 'Roll 1d4 Luxuries gained.', 4, v=>{ addGood('Luxuries', v); finish(` +${v} Luxuries.`); }); return; }
      if(degree===2){ addGood('Luxuries', 1); finish(' +1 Luxuries.'); return; }
      finish('');
      return;
    }
    case 'Create a Masterpiece': {
      if(degree===3){ state.fame = Math.min(state.fameMax, state.fame+2); state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0)+2; finish(` +2 ${state.fameType}, +2 bonus Resource Dice next turn.`); return; }
      if(degree===2){ state.fame = Math.min(state.fameMax, state.fame+1); finish(` +1 ${state.fameType}.`); return; }
      if(degree===0){
        if(state.fame>0){ state.fame -= 1; finish(` −1 ${state.fameType}.`); return; }
        promptLeadershipRoll('Create a Masterpiece — backfire', `No ${state.fameType} to lose — roll 1d4 Unrest instead.`, 4, v=>{ state.unrest += v; finish(` +${v} Unrest.`); });
        return;
      }
      finish('');
      return;
    }
    case 'Establish Trade Agreement': {
      if(degree===3){ state.tradeAgreements = (state.tradeAgreements||0)+1; state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0)+2; finish(' +1 Trade Agreement, +2 bonus Resource Dice next turn.'); return; }
      if(degree===2){ state.tradeAgreements = (state.tradeAgreements||0)+1; finish(' +1 Trade Agreement.'); return; }
      if(degree===0){ state.unrest += 1; finish(' +1 Unrest.'); return; }
      // failure: real player choice — pay to still succeed, or let it fail
      const overlay = document.createElement('div');
      overlay.id = 'leadership-extra-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:112;display:flex;align-items:center;justify-content:center;padding:20px;';
      overlay.innerHTML = `<div class="card" style="max-width:320px;width:100%;margin:0;">
        <h3>Establish Trade Agreement — failed</h3>
        <div class="hint" style="margin-top:0;">Pay 2 Resource Dice worth of RP to still succeed, or let it fail this turn.</div>
        <button class="action" onclick="document.getElementById('leadership-extra-overlay').remove();promptLeadershipRoll('Pay to succeed','Roll 2 Resource Dice to spend.',24,v=>{state.rp=Math.max(0,state.rp-v);state.rpSpentThisTurn=(state.rpSpentThisTurn||0)+v;state.tradeAgreements=(state.tradeAgreements||0)+1;finalizeLeadershipActivity('${role}','${escapeAttr(name)}','used ${escapeAttr(name)}: paid to succeed anyway.',' −'+v+' RP, +1 Trade Agreement.');})">Pay to succeed</button>
        <button class="ghost" style="margin-top:8px;" onclick="document.getElementById('leadership-extra-overlay').remove();finalizeLeadershipActivity('${role}','${escapeAttr(name)}','used ${escapeAttr(name)}: let it fail this turn.','')">Let it fail</button>
      </div>`;
      document.body.appendChild(overlay);
      return;
    }
    case 'Capital Investment': {
      if(degree===3){ state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0)+4; finish(' +4 bonus Resource Dice next turn.'); return; }
      if(degree===2){ state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0)+2; finish(' +2 bonus Resource Dice next turn.'); return; }
      if(degree===1){ promptLeadershipRoll('Capital Investment', 'Roll 1d4 RP gained.', 4, v=>{ state.rp += v; finish(` +${v} RP.`); }); return; }
      promptLeadershipRoll('Capital Investment — risky', 'Roll 1 Resource Die — gain that RP, but add the same to Crime.', 12, v=>{
        state.rp += v; ruinAdjust('Crime', v); finish(` +${v} RP, Crime +${v}.`);
      });
      return;
    }
    case 'Clandestine Business': {
      if(degree===3){
        state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0)+2;
        promptLeadershipRoll('Clandestine Business', 'Roll 1d4 Luxuries gained.', 4, v=>{ addGood('Luxuries', v); finish(` +2 bonus Resource Dice next turn, +${v} Luxuries.`); });
        return;
      }
      if(degree===2){
        const overlay = document.createElement('div');
        overlay.id = 'leadership-extra-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:112;display:flex;align-items:center;justify-content:center;padding:20px;';
        overlay.innerHTML = `<div class="card" style="max-width:320px;width:100%;margin:0;">
          <h3>Clandestine Business</h3>
          <div class="hint" style="margin-top:0;">Take the RP or the Luxuries — either way, +1 Unrest.</div>
          <button class="action" onclick="document.getElementById('leadership-extra-overlay').remove();state.unrest+=1;state.pendingBonusResourceDice=(state.pendingBonusResourceDice||0)+2;finalizeLeadershipActivity('${role}','${escapeAttr(name)}','used ${escapeAttr(name)}: ${text}',' +2 bonus Resource Dice next turn, +1 Unrest.')">Take the RP</button>
          <button class="ghost" style="margin-top:8px;" onclick="document.getElementById('leadership-extra-overlay').remove();promptLeadershipRoll('Clandestine Business','Roll 1d4 Luxuries gained.',4,v=>{addGood('Luxuries',v);state.unrest+=1;finalizeLeadershipActivity('${role}','${escapeAttr(name)}','used ${escapeAttr(name)}: ${text}',' +'+v+' Luxuries, +1 Unrest.');})">Take the Luxuries</button>
        </div>`;
        document.body.appendChild(overlay);
        return;
      }
      if(degree===1){
        state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0)+1;
        state.unrest += 1; ruinAdjust('Corruption', 1);
        finish(' +1 bonus Resource Die next turn, +1 Unrest, Corruption +1.');
        return;
      }
      promptLeadershipRoll('Clandestine Business — exposed', 'Roll 1d6 Unrest.', 6, v=>{
        state.unrest += v; ruinAdjust('Corruption', 2);
        finish(` +${v} Unrest, Corruption +2 (pick another Ruin to raise +1 on the Abilities tab).`);
      });
      return;
    }
    case 'Purchase Commodities': {
      const good = extra.good;
      if(degree===3){
        addGood(good, 4);
        const other = GOODS.find(g=>g!==good && g!=='Luxuries') || GOODS.find(g=>g!==good);
        addGood(other, 2);
        finish(` +4 ${good}, +2 ${other}.`);
        return;
      }
      if(degree===2){ addGood(good, 2); finish(` +2 ${good}.`); return; }
      if(degree===1){ addGood(good, 1); finish(` +1 ${good}.`); return; }
      finish(' Nothing gained — the RP was already spent.');
      return;
    }
    case 'Relocate Capital': {
      state.relocateCapitalCooldownUntilTurn = state.turn + 3;
      const target = state.settlements.find(s=>s.id===extra.settlementId);
      const doMove = ()=>{
        if(!target) return;
        const cap = capitalSettlement();
        if(cap && cap.col!==undefined){ const oldKey = hexKey(cap.col,cap.row); if(state.hexes[oldKey]) state.hexes[oldKey].type = 'Settlement'; }
        if(target.col!==undefined){ const newKey = hexKey(target.col,target.row); state.hexes[newKey] = state.hexes[newKey]||{name:target.name,note:'',resources:'',features:'',terrain:'',workSite:'',resourceFlag:false}; state.hexes[newKey].type = 'Capital'; }
      };
      if(degree===3){ doMove(); finish(` Capital moved to ${target?escapeHtml(target.name):'the new settlement'}, no penalty.`); return; }
      if(degree===2){ doMove(); state.unrest += 1; finish(` Capital moved to ${target?escapeHtml(target.name):'the new settlement'}. +1 Unrest.`); return; }
      if(degree===1){ state.unrest += 1; finish(' Move failed. +1 Unrest (pick two Ruins to raise +1 on the Abilities tab).'); return; }
      promptLeadershipRoll('Relocate Capital — disaster', 'Roll 1d4 Unrest.', 4, v=>{
        state.unrest += v; finish(` Move failed badly. +${v} Unrest (pick three Ruins +1, a fourth +3, on the Abilities tab).`);
      });
      return;
    }
    case 'Infiltration': {
      if(degree===3){ promptLeadershipRoll('Infiltration', 'Roll 1d4 Unrest reduction.', 4, v=>{ state.unrest = Math.max(0, state.unrest-v); finish(` −${v} Unrest.`); }); return; }
      if(degree===2){ state.unrest = Math.max(0, state.unrest-1); finish(' −1 Unrest.'); return; }
      finish('');
      return;
    }
    case 'Prognostication': {
      if(degree===0){
        if(state.turnWizard){ state.turnWizard.forceRandomEvent = true; finish(' A random event will trigger automatically this Event phase.'); }
        else finish(' No Kingdom Turn in progress — remember to force an event when you next open the Event phase.');
        return;
      }
      finish('');
      return;
    }
    default:
      finish('');
  }
}
function renderLeadershipActivitiesCard(){
  ensureLeadershipTurnFresh();
  const capBonus = capitalHasLeadershipBonusStructure();
  const cap = capBonus ? 3 : 2;
  const active = ROLES.filter(([r])=>state.leaders[r].name && !state.leaders[r].vacant);
  document.getElementById('leadership-activities-card').innerHTML = `<div class="card">
    <div class="card-head-row"><h3 style="margin-bottom:0;">Leadership Activities</h3><span class="pill">${cap}/turn each${capBonus?' · Castle/Palace/Town Hall':''}</span></div>
    <div class="hint" style="margin-top:0;">Pick what a leader did after resolving the check at the table — most activities apply their RP/Unrest/Ruin/Commodity effects automatically from there. Logged to the turn log below on Overview.</div>
    ${active.length ? active.map(([role])=>{
      const l = state.leaders[role];
      const remaining = leadershipActivitiesRemaining(role);
      return `<div class="row">
        <div class="label">${role}<small>${l.pcHeld?'★ ':''}${escapeHtml(l.name)}</small></div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="mono" style="font-size:12px;color:var(--text-muted);">${remaining}/${leadershipActivityCap(role)} left</span>
          <button class="small-ghost" ${remaining<=0?'style="opacity:.4;pointer-events:none;"':''} onclick="openLeadershipActivityPicker('${role}')">Log Activity</button>
        </div>
      </div>`;
    }).join('') : `<div class="hint" style="margin-top:0;">No leaders assigned yet — fill a role above first.</div>`}
    ${state.diplomaticRelations.length ? `<div class="hint" style="margin-top:8px;"><b style="color:var(--text);">Diplomatic Relations:</b> ${state.diplomaticRelations.map(escapeHtml).join(', ')}</div>` : ''}
  </div>`;
}

/* ---------- GOODS ---------- */
function renderGoods(){
  document.getElementById('storage-note').textContent = `base ${sizeRow(state.size).storage}, +storage structures`;
  document.getElementById('goods-list').innerHTML = GOODS.map(g=>{
    const tags = structureStorageTags(g);
    return `<div class="row" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="label">${GOODS_ICON[g]} ${g}<small>max ${goodStorageCap(g)}</small></div>
        <div class="stepper">
          <button onclick="goodsAdjust('${g}',-1)">−</button>
          <div class="amt mono">${state.goods[g]}</div>
          <button onclick="goodsAdjust('${g}',1)">+</button>
        </div>
      </div>
      ${tags.length ? `<div class="ability-tags">${tags.map(t=>`<span class="ability-tag pos">${escapeHtml(t.label)} +${t.amt}</span>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
}
// Adds delta toward a cap without ever moving the value further from 0 than it already
// was above that cap — e.g. if storage-bonus structures were removed and a stockpile is
// now sitting above its (lower) cap, further production/spending shouldn't suddenly snap
// it down to the cap; it should just stop growing past its current level.
function addWithCap(current, delta, cap){
  return Math.max(0, Math.min(current+delta, Math.max(current, cap)));
}
function goodsAdjust(g, delta){
  state.goods[g] = addWithCap(state.goods[g], delta, goodStorageCap(g));
  scheduleSave(); render();
}
// Work Site commodity collection now happens inside the guided Kingdom Turn wizard's
// Upkeep phase (openKingdomTurnWizard) alongside Ruin/Resource-Dice/Consumption, matching
// the real Upkeep Phase order instead of standing alone. See collectWorkSiteYields().
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

/* =====================================================================
   KINGDOM TURN WIZARD — guided walkthrough of all four real Kingdom turn
   phases: Upkeep (Rules.aspx?ID=1795), Commerce (ID=1800), Activity
   (ID=1805), Event (ID=1809). Doesn't replace the manual turn stepper —
   this is the primary way to advance a turn, alongside it. Every step
   navigates to the exact spot it needs (Leaders tab, a specific hex, a
   settlement) rather than just describing what to do, and progress is
   persisted in state.turnWizard so closing partway through — even to go
   do something on another tab — and resuming later both work.
===================================================================== */
const WIZARD_PHASES = ['upkeep','commerce','activity','event'];
const UPKEEP_STEPS = ['fame','leadership','unrest','ruin','resourceDice','workSites','consumption'];
function openKingdomTurnWizard(){
  if(!state.turnWizard){
    state.turnWizard = {
      phase:'upkeep',
      upkeep:{step:0, fame:null, leadership:null, unrest:null, ruin:null, resourceDice:null, workSites:null, consumption:null},
      commerce:{},
      activity:{regionLog:[], civicUsed:{}},
      event:{}
    };
    state.rpSpentThisTurn = 0;
  }
  renderKingdomTurnWizard();
}
function closeKingdomTurnWizard(){
  const el = document.getElementById('upkeep-overlay');
  if(el) el.remove();
  scheduleSave();
  render();
}
function renderKingdomTurnWizard(){
  const tw = state.turnWizard;
  if(!tw) return;
  let overlay = document.getElementById('upkeep-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'upkeep-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
    document.body.appendChild(overlay);
  }
  const phaseIdx = WIZARD_PHASES.indexOf(tw.phase);
  const phaseLabels = {upkeep:'Upkeep', commerce:'Commerce', activity:'Activity', event:'Event'};
  const body = tw.phase==='upkeep' ? renderUpkeepPhaseBody()
    : tw.phase==='commerce' ? renderCommercePhaseBody()
    : tw.phase==='activity' ? renderActivityPhaseBody()
    : renderEventPhaseBody();
  overlay.innerHTML = `<div class="card" style="max-width:460px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <div class="hint" style="margin-top:0;">Turn ${state.turn} — Phase ${phaseIdx+1} of 4: ${phaseLabels[tw.phase]}${inAnarchy()?' <span style="color:var(--rust);">· ANARCHY (Unrest 20+, only Quell Unrest; checks worsened one degree)</span>':''}</div>
    ${body}
  </div>`;
}
function wizardCloseButton(){
  return `<button class="ghost" style="flex:0 0 100%;" onclick="closeKingdomTurnWizard()">Close for now (resume later)</button>`;
}

/* =====================================================================
   PHASE 1: UPKEEP (2e.aonprd.com/Rules.aspx?ID=1795)
===================================================================== */
function renderUpkeepPhaseBody(){
  const u = state.turnWizard.upkeep;
  const stepKey = UPKEEP_STEPS[u.step];
  const renderers = {
    fame:renderUpkeepFameStep, leadership:renderUpkeepLeadershipStep, unrest:renderUpkeepUnrestStep,
    ruin:renderUpkeepRuinStep, resourceDice:renderUpkeepResourceDiceStep, workSites:renderUpkeepWorkSitesStep,
    consumption:renderUpkeepConsumptionStep
  };
  return `<div class="hint" style="margin:0 0 8px;">Upkeep step ${u.step+1} of ${UPKEEP_STEPS.length}</div>${renderers[stepKey]()}`;
}
function upkeepGoToStep(n){
  state.turnWizard.upkeep.step = Math.max(0, Math.min(UPKEEP_STEPS.length-1, n));
  scheduleSave();
  renderKingdomTurnWizard();
}
function upkeepSkipStep(){
  const u = state.turnWizard.upkeep;
  const key = UPKEEP_STEPS[u.step];
  u[key] = {skipped:true};
  if(u.step>=UPKEEP_STEPS.length-1) advanceToCommercePhase();
  else upkeepGoToStep(u.step+1);
}
function upkeepNav(canSkip){
  const u = state.turnWizard.upkeep;
  const last = u.step>=UPKEEP_STEPS.length-1;
  return `<div class="creation-nav" style="margin-top:14px;flex-wrap:wrap;gap:8px;">
    ${wizardCloseButton()}
    ${u.step>0 ? `<button class="ghost" onclick="upkeepGoToStep(${u.step-1})">Back</button>` : ''}
    ${canSkip ? `<button class="ghost" onclick="upkeepSkipStep()">Skip for now</button>` : ''}
    ${!last ? `<button class="action" onclick="upkeepGoToStep(${u.step+1})">Next</button>` : `<button class="action" onclick="advanceToCommercePhase()">Continue to Commerce Phase &rarr;</button>`}
  </div>`;
}

/* ---- step: Fame/Infamy — gained automatically at the start of each Kingdom turn
   (2e.aonprd.com/Rules.aspx?ID=1793); unspent Fame/Infamy is lost at the end of the turn. ---- */
function renderUpkeepFameStep(){
  const u = state.turnWizard.upkeep;
  if(u.fame){
    return `<h3>${state.fameType}</h3><div class="hint" style="margin-top:0;">Applied: +${u.fame.amount} ${state.fameType} (now ${state.fame}).</div>${upkeepNav(false)}`;
  }
  return `<h3>${state.fameType}</h3>
    <div class="hint" style="margin-top:0;">Automatic: your kingdom gains +1 ${state.fameType}, capped at ${state.fameMax}. Unspent ${state.fameType} is lost at the end of the turn.</div>
    <button class="action" onclick="applyUpkeepFame()">Apply +1 ${state.fameType}</button>
    ${upkeepNav(true)}`;
}
function applyUpkeepFame(){
  state.fame = Math.min(state.fameMax, state.fame+1);
  state.turnWizard.upkeep.fame = {applied:true, amount:1};
  scheduleSave();
  renderKingdomTurnWizard();
}

/* ---- step: Step 1, Assign Leadership Roles (Rules.aspx?ID=1796) — reassign freely via
   New Leadership, then resolve downtime: a named leader who didn't spend the required
   downtime must either forfeit one Leadership activity this turn or take the vacancy
   penalty until the start of next turn (vacancy re-evaluates fresh here each turn). ---- */
function renderUpkeepLeadershipStep(){
  const u = state.turnWizard.upkeep;
  if(u.leadership && u.leadership.done){
    const l = u.leadership;
    const parts = [];
    if(l.forfeit.length) parts.push(`forfeited an activity: ${l.forfeit.join(', ')}`);
    if(l.vacancy.length) parts.push(`took the vacancy penalty: ${l.vacancy.join(', ')}`);
    return `<h3>1. Assign Leadership Roles</h3><div class="hint" style="margin-top:0;">${parts.length?parts.join('; '):'All active leaders had their downtime covered.'}</div>${upkeepNav(false)}`;
  }
  if(!u.leadership) u.leadership = {downtime:{}, resolved:{}, forfeit:[], vacancy:[], initialized:false};
  const l = u.leadership;
  const activeRoles = ROLES.filter(([r])=>state.leaders[r].name).map(([r])=>r);
  if(!l.initialized){
    activeRoles.forEach(r=>{ state.leaders[r].vacant = false; });
    l.initialized = true;
  }
  const unresolved = activeRoles.filter(r=>!l.downtime[r] && !l.resolved[r]);
  return `<h3>1. Assign Leadership Roles</h3>
    <div class="hint" style="margin-top:0;">Reassign or swap anyone via New Leadership on the Leaders tab now if you want to, then confirm who spent their required downtime since last turn.</div>
    <button class="ghost" style="margin:6px 0 10px;" onclick="closeKingdomTurnWizard();switchTab('leaders');">Go to Leaders tab</button>
    ${activeRoles.length ? activeRoles.map(r=>{
      const resolved = l.resolved[r];
      return `<div class="row">
        <div class="label">${r}<small>${escapeHtml(state.leaders[r].name)}</small></div>
        ${resolved ? `<span class="pill">${resolved==='forfeit'?'forfeits an activity':(resolved==='vacancy'?'vacancy penalty':'downtime OK')}</span>` :
          `<label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);">
            <input type="checkbox" ${l.downtime[r]?'checked':''} onchange="upkeepSetDowntime('${r}',this.checked)"> spent downtime
          </label>`}
      </div>
      ${(!resolved && !l.downtime[r]) ? `<div style="display:flex;gap:6px;margin:2px 0 8px;">
        <button class="small-ghost" onclick="upkeepResolveDowntime('${r}','forfeit')">Forfeit an activity instead</button>
        <button class="small-ghost" onclick="upkeepResolveDowntime('${r}','vacancy')">Take vacancy penalty</button>
      </div>` : ''}`;
    }).join('') : `<div class="hint" style="margin-top:0;">No leaders assigned yet.</div>`}
    ${unresolved.length ? `<div class="hint" style="color:var(--rust);">${unresolved.length} role${unresolved.length>1?'s':''} still need${unresolved.length>1?'':'s'} downtime confirmed, or a choice made, before continuing.</div>` : `<button class="action" onclick="finishUpkeepLeadershipStep()">Confirm &amp; continue</button>`}
    ${upkeepNav(false)}`;
}
function upkeepSetDowntime(role, checked){
  const l = state.turnWizard.upkeep.leadership;
  l.downtime[role] = checked;
  delete l.resolved[role];
  renderKingdomTurnWizard();
}
function upkeepResolveDowntime(role, choice){
  const l = state.turnWizard.upkeep.leadership;
  l.resolved[role] = choice;
  if(choice==='forfeit'){ if(!l.forfeit.includes(role)) l.forfeit.push(role); }
  else { if(!l.vacancy.includes(role)) l.vacancy.push(role); state.leaders[role].vacant = true; }
  scheduleSave();
  renderKingdomTurnWizard();
}
function finishUpkeepLeadershipStep(){
  state.turnWizard.upkeep.leadership.done = true;
  scheduleSave();
  upkeepGoToStep(state.turnWizard.upkeep.step+1);
}

/* ---- step: Step 2, Adjust Unrest (Rules.aspx?ID=1797) — +1 per Overcrowded settlement,
   +1 if at war, before the Ruin-at-10+ check in the next step. ---- */
function renderUpkeepUnrestStep(){
  const u = state.turnWizard.upkeep;
  if(u.unrest){
    return `<h3>2. Adjust Unrest${infoIcon('Unrest')}</h3><div class="hint" style="margin-top:0;">${u.unrest.skipped ? 'Skipped for now.' : `+${u.unrest.added} Unrest applied (${u.unrest.overcrowded} Overcrowded settlement${u.unrest.overcrowded===1?'':'s'}${u.unrest.atWar?', at war':''}). Unrest is now ${state.unrest}.`}</div>${upkeepNav(false)}`;
  }
  const overcrowded = overcrowdedSettlements();
  const sum = overcrowded.length + (state.atWar?1:0);
  return `<h3>2. Adjust Unrest${infoIcon('Unrest')}</h3>
    <div class="hint" style="margin-top:0;">Overcrowded settlement${infoIcon('Overcrowded')}s: ${overcrowded.length ? overcrowded.map(s=>escapeHtml(s.name)).join(', ') : 'none'} (+${overcrowded.length}).</div>
    <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin:8px 0;">
      <input type="checkbox" ${state.atWar?'checked':''} onchange="state.atWar=this.checked;scheduleSave();render();"> Kingdom is at war${infoIcon('At War')} (+1 Unrest)
    </label>
    <button class="action" onclick="applyUpkeepUnrest(${overcrowded.length},${state.atWar})">Apply +${sum} Unrest</button>
    ${upkeepNav(true)}`;
}
function applyUpkeepUnrest(overcrowded, atWar){
  const added = overcrowded + (atWar?1:0);
  state.unrest += added;
  state.turnWizard.upkeep.unrest = {applied:true, overcrowded, atWar, added};
  scheduleSave();
  renderKingdomTurnWizard();
}

/* ---- step: Ruin — only triggers at Unrest 10+: 1d10 distributed among the four
   Ruins, then a DC 11 flat check; failure loses a hex (GM/player choice which one,
   resolved on the Map tab — not auto-selected here). Unrest 20+ is Anarchy, surfaced
   as a banner across the whole wizard rather than a separate step. ---- */
let upkeepRuinPending = null;
function renderUpkeepRuinStep(){
  const u = state.turnWizard.upkeep;
  if(u.ruin){
    let detail;
    if(u.ruin.skipped) detail = 'Skipped for now.';
    else if(u.ruin.triggered===false) detail = 'Not triggered — Unrest was below 10.';
    else{
      const dist = Object.entries(u.ruin.distributed).filter(([,v])=>v).map(([k,v])=>`${k} +${v}`).join(', ')||'none';
      detail = `Gained ${u.ruin.rolled} Ruin (${dist}). DC 11 flat check rolled ${u.ruin.checkRoll} — ${u.ruin.hexLost?'failed, a hex was lost (remove it on the Map tab)':'succeeded'}.`;
    }
    return `<h3>3. Ruin (from Unrest 10+)</h3><div class="hint" style="margin-top:0;">${detail}</div>${upkeepNav(false)}`;
  }
  if(state.unrest<10){
    return `<h3>3. Ruin (from Unrest 10+)</h3>
      <div class="hint" style="margin-top:0;">Not triggered this turn — Ruin only accumulates when Unrest is 10 or higher (currently ${state.unrest}).</div>
      <button class="action" onclick="applyUpkeepRuinNotTriggered()">Continue</button>
      ${upkeepNav(false)}`;
  }
  return `<h3>3. Ruin (from Unrest 10+)</h3>
    <div class="hint" style="margin-top:0;">Unrest is ${state.unrest} (10+) — the kingdom gains 1d10 Ruin. Roll it and enter the result:</div>
    <input class="num" type="number" id="upkeep-ruin-roll" min="1" max="10" placeholder="1d10 result">
    <button class="action" style="margin-top:8px;" onclick="upkeepRuinRolled()">Confirm roll</button>
    ${upkeepNav(true)}`;
}
function applyUpkeepRuinNotTriggered(){
  state.turnWizard.upkeep.ruin = {applied:true, triggered:false};
  scheduleSave();
  renderKingdomTurnWizard();
}
function upkeepRuinRolled(){
  const v = parseInt(document.getElementById('upkeep-ruin-roll').value,10);
  if(!v || v<1 || v>10){ alert('Enter the 1d10 result (1-10).'); return; }
  upkeepRuinPending = {rolled:v};
  const overlay = document.getElementById('upkeep-overlay');
  overlay.querySelector('.card').innerHTML = `
    <div class="hint" style="margin-top:0;">Turn ${state.turn} — Ruin</div>
    <h3>Ruin — distribute ${v} point${v>1?'s':''}</h3>
    <div class="hint" style="margin-top:0;">Split the ${v} points however you like among the four Ruins.</div>
    ${['Corruption','Crime','Decay','Strife'].map(r=>`
      <div class="row">
        <div class="label">${r}</div>
        <input class="num" type="number" min="0" max="${v}" value="0" id="upkeep-ruin-dist-${r}" onchange="upkeepValidateRuinDistribution()">
      </div>`).join('')}
    <div class="hint" id="upkeep-ruin-dist-hint" style="margin-top:6px;">0 of ${v} distributed.</div>
    <button class="action" id="upkeep-ruin-dist-confirm" style="margin-top:8px;opacity:.4;pointer-events:none;" onclick="confirmUpkeepRuinDistribution()">Confirm distribution</button>`;
}
function upkeepValidateRuinDistribution(){
  const rolled = upkeepRuinPending.rolled;
  const sum = ['Corruption','Crime','Decay','Strife'].reduce((t,r)=>t+(parseInt(document.getElementById(`upkeep-ruin-dist-${r}`).value,10)||0),0);
  document.getElementById('upkeep-ruin-dist-hint').textContent = `${sum} of ${rolled} distributed.`;
  const btn = document.getElementById('upkeep-ruin-dist-confirm');
  btn.style.opacity = sum===rolled ? '1' : '.4';
  btn.style.pointerEvents = sum===rolled ? 'auto' : 'none';
}
function confirmUpkeepRuinDistribution(){
  const distributed = {};
  ['Corruption','Crime','Decay','Strife'].forEach(r=>{ distributed[r] = parseInt(document.getElementById(`upkeep-ruin-dist-${r}`).value,10)||0; });
  Object.entries(distributed).forEach(([r,amt])=>{ if(amt) ruinAdjust(r, amt); });
  upkeepRuinPending.distributed = distributed;
  const overlay = document.getElementById('upkeep-overlay');
  overlay.querySelector('.card').innerHTML = `
    <div class="hint" style="margin-top:0;">Turn ${state.turn} — Ruin</div>
    <h3>Ruin — DC 11 flat check</h3>
    <div class="hint" style="margin-top:0;">Roll a flat check (d20, no modifiers) against DC 11. Failure loses one hex.</div>
    <input class="num" type="number" id="upkeep-ruin-check" min="1" max="20" placeholder="d20 result">
    <button class="action" style="margin-top:8px;" onclick="confirmUpkeepRuinCheck()">Confirm roll</button>`;
}
function confirmUpkeepRuinCheck(){
  const roll = parseInt(document.getElementById('upkeep-ruin-check').value,10);
  if(!roll || roll<1 || roll>20){ alert('Enter the d20 result (1-20).'); return; }
  const hexLost = roll<11;
  state.turnWizard.upkeep.ruin = {applied:true, triggered:true, rolled:upkeepRuinPending.rolled, distributed:upkeepRuinPending.distributed, checkRoll:roll, hexLost};
  upkeepRuinPending = null;
  scheduleSave();
  if(hexLost) alert('The flat check failed — the kingdom loses one hex. Choose which one and remove it from the Map tab.');
  upkeepGoToStep(state.turnWizard.upkeep.step+1);
}

/* ---- step: Step 3, Resource Collection part 1 — Resource Dice -> RP
   (Rules.aspx?ID=1798). Any bonus Resource Dice/RP earned via Commerce activities last
   turn are folded in here and cleared. ---- */
function renderUpkeepResourceDiceStep(){
  const u = state.turnWizard.upkeep;
  if(u.resourceDice){
    const detail = u.resourceDice.skipped ? 'Skipped for now.' : `Rolled ${u.resourceDice.rolled}${u.resourceDice.bonusRP?` +${u.resourceDice.bonusRP} bonus RP`:''} — added to RP (now ${state.rp}).`;
    return `<h3>4a. Resource Dice</h3><div class="hint" style="margin-top:0;">${detail}</div>${upkeepNav(false)}`;
  }
  const sz = sizeRow(state.size);
  const bonusDice = state.pendingBonusResourceDice||0;
  const bonusRP = state.pendingBonusRP||0;
  const diceCount = state.level + 4 + featResourceDieBonus() + bonusDice;
  return `<h3>4a. Resource Dice</h3>
    <div class="hint" style="margin-top:0;">Roll ${sz.die}×${diceCount}${bonusDice?` (includes +${bonusDice} bonus dice from last turn's Commerce activities)`:''} and enter the total — it's added to your RP balance (currently ${state.rp})${bonusRP?`, plus ${bonusRP} bonus RP from Manage Trade Agreements`:''}.</div>
    <input class="num" type="number" min="0" id="upkeep-rd-roll" placeholder="Rolled total">
    <button class="action" style="margin-top:8px;" onclick="confirmUpkeepResourceDice()">Add to RP</button>
    ${upkeepNav(true)}`;
}
function confirmUpkeepResourceDice(){
  const v = parseInt(document.getElementById('upkeep-rd-roll').value,10);
  if(isNaN(v) || v<0){ alert('Enter the rolled total.'); return; }
  const bonusRP = state.pendingBonusRP||0;
  state.rp += v + bonusRP;
  state.turnWizard.upkeep.resourceDice = {applied:true, rolled:v, bonusRP};
  state.pendingBonusResourceDice = 0;
  state.pendingBonusRP = 0;
  scheduleSave();
  renderKingdomTurnWizard();
}

/* ---- step: Step 3, Resource Collection part 2 — Work Site commodities, flat and
   automatic, not a roll. Attributed per hex, same tagging style as ability boosts. ---- */
function collectWorkSiteYields(){
  const gains = {};
  const tags = [];
  Object.entries(state.hexes).forEach(([key,h])=>{
    if(!h || !h.workSite) return;
    const def = HEX_WORK_SITES[h.workSite];
    if(!def || !def.good) return;
    const yieldAmt = h.resourceFlag ? 2 : 1;
    const before = state.goods[def.good];
    state.goods[def.good] = addWithCap(before, yieldAmt, goodStorageCap(def.good));
    const got = state.goods[def.good]-before;
    gains[def.good] = (gains[def.good]||0) + got;
    if(got>0){ const [col,row] = key.split('_').map(Number); tags.push({label:`${h.workSite} (${hexLabel(col,row)})`, good:def.good, amt:got}); }
  });
  return {gains, tags};
}
function renderUpkeepWorkSitesStep(){
  const u = state.turnWizard.upkeep;
  if(u.workSites){
    if(u.workSites.skipped) return `<h3>4b. Work Site commodities</h3><div class="hint" style="margin-top:0;">Skipped for now.</div>${upkeepNav(false)}`;
    const tags = u.workSites.tags||[];
    return `<h3>4b. Work Site commodities</h3>
      ${tags.length ? `<div class="ability-tags">${tags.map(t=>`<span class="ability-tag pos">${escapeHtml(t.label)} +${t.amt} ${t.good}</span>`).join('')}</div>` : `<div class="hint" style="margin-top:0;">No Work Sites produced anything (check storage caps and hex assignments).</div>`}
      ${upkeepNav(false)}`;
  }
  const activeCount = Object.values(state.hexes).filter(h=>h&&h.workSite).length;
  return `<h3>4b. Work Site commodities</h3>
    <div class="hint" style="margin-top:0;">Automatic — ${activeCount} active Work Site${activeCount===1?'':'s'}, each adding 1 commodity (2 if flagged as a Resource hex), capped at storage.</div>
    <button class="action" onclick="applyUpkeepWorkSites()">Collect</button>
    ${upkeepNav(true)}`;
}
function applyUpkeepWorkSites(){
  const {gains, tags} = collectWorkSiteYields();
  state.turnWizard.upkeep.workSites = {applied:true, summary:gains, tags};
  scheduleSave();
  renderKingdomTurnWizard();
}

/* ---- step: Step 4, Pay Consumption (Rules.aspx?ID=1799) — settlement + army
   Consumption, minus storage-bonus structures and in-influence Farmland hexes; paid from
   Food, shortfall costs 5 RP/point or +1d4 Unrest (one roll for the whole shortfall). ---- */
function renderUpkeepConsumptionStep(){
  const u = state.turnWizard.upkeep;
  if(u.consumption){
    if(u.consumption.skipped) return `<h3>5. Consumption${infoIcon('Consumption')}</h3><div class="hint" style="margin-top:0;">Skipped for now.</div>${upkeepNav(false)}`;
    const c = u.consumption;
    let detail = `Owed ${c.owed} Food, paid ${c.paidFromFood} from stockpile.`;
    if(c.shortfall) detail += c.choice==='rp' ? ` Spent ${c.shortfall*5} RP for the ${c.shortfall} unpaid.` : ` Gained ${c.unrestGain} Unrest for the ${c.shortfall} unpaid.`;
    return `<h3>5. Consumption${infoIcon('Consumption')}</h3><div class="hint" style="margin-top:0;">${detail}</div>${upkeepNav(false)}`;
  }
  const owed = effectiveConsumptionOwed();
  const available = state.goods.Food;
  const shortfall = Math.max(0, owed-available);
  const breakdown = `${settlementConsumptionTotal()} settlements + ${armyConsumptionTotal()} armies − ${structureConsumptionBonus()} structures − ${hexConsumptionReduction()} in-range Farmland`;
  if(shortfall===0){
    return `<h3>5. Consumption${infoIcon('Consumption')}</h3>
      <div class="hint" style="margin-top:0;">Owed ${owed} Food (${breakdown}). You have ${available} — fully covered.</div>
      <button class="action" onclick="applyUpkeepConsumption(${owed},${owed},0,null,0)">Pay ${owed} Food</button>
      ${upkeepNav(true)}`;
  }
  return `<h3>5. Consumption${infoIcon('Consumption')}</h3>
    <div class="hint" style="margin-top:0;">Owed ${owed} Food (${breakdown}), you have ${available} — a shortfall of ${shortfall}. For the unpaid amount, either spend 5 RP per point or increase Unrest by 1d4 (one roll covers the whole shortfall).</div>
    <button class="ghost" ${state.rp<shortfall*5?'style="opacity:.45;pointer-events:none;"':''} onclick="chooseUpkeepConsumptionShortfall(${owed},${available},${shortfall})">Spend ${shortfall*5} RP (have ${state.rp})</button>
    <div class="hint" style="margin:10px 0 4px;">Or roll 1d4 and add it to Unrest:</div>
    <input class="num" type="number" min="1" max="4" id="upkeep-consumption-unrest-roll" placeholder="1d4 result">
    <button class="ghost" style="margin-top:6px;" onclick="chooseUpkeepConsumptionShortfallUnrest(${owed},${available},${shortfall})">Add to Unrest</button>
    ${upkeepNav(true)}`;
}
function applyUpkeepConsumption(owed, paidFromFood, shortfall, choice, extra){
  state.goods.Food = Math.max(0, state.goods.Food - paidFromFood);
  state.turnWizard.upkeep.consumption = {applied:true, owed, paidFromFood, shortfall, choice, unrestGain:choice==='unrest'?extra:0};
  scheduleSave();
  renderKingdomTurnWizard();
}
function chooseUpkeepConsumptionShortfall(owed, available, shortfall){
  const cost = shortfall*5;
  if(state.rp<cost){ alert('Not enough RP.'); return; }
  state.rp -= cost;
  state.rpSpentThisTurn = (state.rpSpentThisTurn||0) + cost;
  applyUpkeepConsumption(owed, available, shortfall, 'rp', 0);
}
function chooseUpkeepConsumptionShortfallUnrest(owed, available, shortfall){
  const roll = parseInt(document.getElementById('upkeep-consumption-unrest-roll').value,10);
  if(!roll || roll<1 || roll>4){ alert('Enter the 1d4 result (1-4).'); return; }
  state.unrest += roll;
  applyUpkeepConsumption(owed, available, shortfall, 'unrest', roll);
}
function advanceToCommercePhase(){
  const u = state.turnWizard.upkeep;
  const lines = [];
  if(u.fame) lines.push(`${state.fameType} +${u.fame.amount}`);
  if(u.leadership && u.leadership.done){
    if(u.leadership.forfeit.length) lines.push(`forfeited activity: ${u.leadership.forfeit.join(', ')}`);
    if(u.leadership.vacancy.length) lines.push(`vacancy penalty: ${u.leadership.vacancy.join(', ')}`);
  }
  if(u.unrest) lines.push(u.unrest.skipped ? 'Unrest: skipped' : `Unrest +${u.unrest.added}`);
  if(u.ruin){
    if(u.ruin.skipped) lines.push('Ruin: skipped');
    else if(u.ruin.triggered===false) lines.push('Ruin: not triggered');
    else{
      const dist = Object.entries(u.ruin.distributed).filter(([,v])=>v).map(([k,v])=>`${k} +${v}`).join(', ')||'none';
      lines.push(`Ruin: +${u.ruin.rolled} (${dist}); DC 11 check ${u.ruin.checkRoll} — ${u.ruin.hexLost?'failed, hex lost':'succeeded'}`);
    }
  }
  if(u.resourceDice) lines.push(u.resourceDice.skipped ? 'Resource Dice: skipped' : `Resource Dice: +${u.resourceDice.rolled} RP`);
  if(u.workSites){
    if(u.workSites.skipped) lines.push('Work Sites: skipped');
    else{
      const parts = Object.keys(u.workSites.summary).filter(k=>u.workSites.summary[k]>0).map(k=>`+${u.workSites.summary[k]} ${k}`);
      lines.push(`Work Sites: ${parts.length?parts.join(', '):'no yield'}`);
    }
  }
  if(u.consumption){
    if(u.consumption.skipped) lines.push('Consumption: skipped');
    else{
      let s = `Consumption: paid ${u.consumption.paidFromFood} Food`;
      if(u.consumption.shortfall) s += u.consumption.choice==='rp' ? `, spent ${u.consumption.shortfall*5} RP` : `, +${u.consumption.unrestGain} Unrest`;
      lines.push(s);
    }
  }
  state.log.unshift({turn:state.turn, note:'Upkeep — '+(lines.join('; ')||'nothing processed')});
  state.turnWizard.phase = 'commerce';
  scheduleSave();
  renderKingdomTurnWizard();
}

/* =====================================================================
   PHASE 2: COMMERCE (2e.aonprd.com/Rules.aspx?ID=1800) — each activity may be attempted
   once per Kingdom turn, independently of the others (not a shared pool).
===================================================================== */
function renderCommercePhaseBody(){
  const c = state.turnWizard.commerce;
  return `<div class="hint" style="margin:0 0 8px;">Attempt any of these once this turn. Resolve the check at the table, then log the result.</div>
    ${Object.entries(COMMERCE_ACTIVITIES).map(([name,def])=>{
      const done = c[name];
      return `<div class="row" style="flex-direction:column;align-items:stretch;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="label">${name}<small>${def.skill}</small></div>
          ${done ? `<span class="pill">${['Crit. Failure','Failure','Success','Crit. Success'][done.degree]}</span>` : `<button class="small-ghost" onclick="openCommerceActivity('${escapeAttr(name)}')">Resolve</button>`}
        </div>
        <div class="hint" style="margin:2px 0 0;">${done ? escapeHtml(done.text) : escapeHtml(def.note)}</div>
      </div>`;
    }).join('')}
    <div class="row">
      <div class="label">Trade Agreements<small>manual count — used by Manage Trade Agreements</small></div>
      <div class="stepper">
        <button onclick="state.tradeAgreements=Math.max(0,(state.tradeAgreements||0)-1);scheduleSave();renderKingdomTurnWizard();">−</button>
        <div class="amt mono">${state.tradeAgreements||0}</div>
        <button onclick="state.tradeAgreements=(state.tradeAgreements||0)+1;scheduleSave();renderKingdomTurnWizard();">+</button>
      </div>
    </div>
    <div class="creation-nav" style="margin-top:14px;flex-wrap:wrap;gap:8px;">
      ${wizardCloseButton()}
      <button class="action" onclick="advanceToActivityPhase()">Continue to Activity Phase &rarr;</button>
    </div>`;
}
function openCommerceActivity(name){
  const def = COMMERCE_ACTIVITIES[name];
  if(def.needsGoodPicker){
    const overlay = document.createElement('div');
    overlay.id = 'commerce-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:110;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `<div class="card" style="max-width:340px;width:100%;margin:0;">
      <h3>${escapeHtml(name)} — pick a Commodity</h3>
      <div class="hint" style="margin-top:0;">Reduce its stockpile by up to 4 (as much as you have), then resolve the check.</div>
      ${GOODS.filter(g=>state.goods[g]>0).map(g=>`<button type="button" class="option-card" onclick="document.getElementById('commerce-overlay').remove();openDegreePicker('${escapeAttr(name)}', d=>resolveCommerceActivity('${escapeAttr(name)}', d, '${g}'))">
        <div class="opt-name">${g} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(have ${state.goods[g]})</span></div>
      </button>`).join('') || '<div class="hint">No Commodities in stock to trade.</div>'}
      <button class="ghost" style="margin-top:8px;" onclick="document.getElementById('commerce-overlay').remove();">Cancel</button>
    </div>`;
    document.body.appendChild(overlay);
    return;
  }
  openDegreePicker(name, d=>resolveCommerceActivity(name, d, null));
}
function resolveCommerceActivity(name, degree, goodChoice){
  const def = COMMERCE_ACTIVITIES[name];
  const text = def.outcomes[degree];
  state.turnWizard.commerce[name] = {degree, text, goodChoice};
  let mechNote = '';
  if(name==='Trade Commodities' && goodChoice){
    const spend = Math.min(4, state.goods[goodChoice]);
    state.goods[goodChoice] = Math.max(0, state.goods[goodChoice]-spend);
    if(degree===3){ state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0) + spend*2; mechNote = ` −${spend} ${goodChoice}, +${spend*2} bonus Resource Dice next turn.`; }
    else if(degree===2){ state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0) + spend; mechNote = ` −${spend} ${goodChoice}, +${spend} bonus Resource Dice next turn.`; }
    else if(degree===1){ state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0) + 1; mechNote = ` −${spend} ${goodChoice}, +1 bonus Resource Die next turn.`; }
    else mechNote = ` −${spend} ${goodChoice}, no bonus.`;
  }
  if(name==='Manage Trade Agreements'){
    const n = state.tradeAgreements||0;
    if(degree===1){ state.pendingBonusRP = (state.pendingBonusRP||0) + n; mechNote = ` +${n} bonus RP next turn.`; }
    else if(degree===3){ state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0) + n; mechNote = ` +${n} bonus Resource Dice next turn (add the ${n} chosen Commodities manually too).`; }
    else if(degree===2){ state.pendingBonusResourceDice = (state.pendingBonusResourceDice||0) + n; mechNote = ` +${n} bonus Resource Dice next turn (or add ${n} Commodities manually instead).`; }
  }
  if((name==='Improve Lifestyle' || name==='Tap Treasury') && degree===0){
    state.unrest += 1;
    mechNote = ' +1 Unrest (pick a Ruin to raise +1 on the Abilities tab).';
  }
  if(name==='Collect Taxes'){
    if(degree===2 && state.taxesCollectedLastTurn){ state.unrest += 1; mechNote = ' +1 Unrest (Collected Taxes last turn too).'; }
    else if(degree===1){ const gain = state.taxesCollectedLastTurn ? 2 : 1; state.unrest += gain; mechNote = ` +${gain} Unrest.`; }
    else if(degree===0){ state.unrest += 2; mechNote = ' +2 Unrest (pick a Ruin to raise +1 on the Abilities tab).'; }
  }
  state.log.unshift({turn:state.turn, note:`Commerce — ${name}: ${text}${mechNote}`});
  scheduleSave();
  renderKingdomTurnWizard();
}
function advanceToActivityPhase(){
  state.taxesCollectedLastTurn = !!state.turnWizard.commerce['Collect Taxes'];
  state.turnWizard.phase = 'activity';
  scheduleSave();
  renderKingdomTurnWizard();
}

/* =====================================================================
   PHASE 3: ACTIVITY (2e.aonprd.com/Rules.aspx?ID=1805) — Leadership Activities (2-3 per
   leader, tracked on the Leaders tab), up to 3 Region activities shared kingdom-wide, one
   Civic activity per settlement, and Army Activities only while at war.
===================================================================== */
function renderActivityPhaseBody(){
  const a = state.turnWizard.activity;
  const investedRoles = ROLES.filter(([r])=>state.leaders[r].name && !state.leaders[r].vacant);
  return `
    <div class="card" style="margin:0 0 10px;padding:12px;">
      <div class="card-head-row"><h3 style="margin-bottom:0;font-size:14px;">Leadership Activities</h3></div>
      <div class="hint" style="margin-top:0;">${investedRoles.length} active leader${investedRoles.length===1?'':'s'} — log activities on the Leaders tab.</div>
      <button class="ghost" onclick="closeKingdomTurnWizard();switchTab('leaders');">Go to Leaders tab</button>
    </div>
    <div class="card" style="margin:0 0 10px;padding:12px;">
      <div class="card-head-row"><h3 style="margin-bottom:0;font-size:14px;">Region Activities</h3><span class="pill">${a.regionLog.length} / 3 used</span></div>
      <div class="hint" style="margin-top:0;">Up to 3 shared kingdom-wide, on any hex(es).</div>
      ${Object.keys(REGION_ACTIVITIES).map(name=>`<button class="small-ghost" style="margin:2px 4px 2px 0;${a.regionLog.length>=3?'opacity:.4;pointer-events:none;':''}" onclick="openRegionActivityPicker('${escapeAttr(name)}')">${name}</button>`).join('')}
      ${a.regionLog.length ? `<div style="margin-top:8px;">${a.regionLog.map(r=>`<div class="hint" style="margin:2px 0;">${escapeHtml(r.name)} @ ${escapeHtml(r.hexLabel)}: ${escapeHtml(r.text)}</div>`).join('')}</div>` : ''}
    </div>
    <div class="card" style="margin:0 0 10px;padding:12px;">
      <div class="card-head-row"><h3 style="margin-bottom:0;font-size:14px;">Civic Activities</h3><span class="pill">${Object.keys(a.civicUsed).length} / ${state.settlements.length} used</span></div>
      <div class="hint" style="margin-top:0;">One per settlement — Build Structure, Demolish, etc. happen on the Notes tab's settlement grid.</div>
      ${state.settlements.map(s=>`<div class="row">
        <div class="label">${escapeHtml(s.name)}</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted);"><input type="checkbox" ${a.civicUsed[s.id]?'checked':''} onchange="toggleCivicUsed(${s.id},this.checked)"> used</label>
          <button class="small-ghost" onclick="closeKingdomTurnWizard();switchTab('notes');">Open</button>
        </div>
      </div>`).join('') || `<div class="hint" style="margin-top:0;">No settlements founded yet.</div>`}
    </div>
    <div class="card" style="margin:0 0 10px;padding:12px;">
      <div class="card-head-row"><h3 style="margin-bottom:0;font-size:14px;">Army Activities</h3></div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin:4px 0;">
        <input type="checkbox" ${state.atWar?'checked':''} onchange="state.atWar=this.checked;scheduleSave();render();renderKingdomTurnWizard();"> Kingdom is at war
      </label>
      ${state.atWar ? `<button class="ghost" onclick="closeKingdomTurnWizard();switchTab('warfare');">Go to Warfare tab</button>` : `<div class="hint" style="margin-top:0;">Not at war — Army Activities are skipped this turn.</div>`}
    </div>
    <div class="creation-nav" style="margin-top:4px;flex-wrap:wrap;gap:8px;">
      ${wizardCloseButton()}
      <button class="action" onclick="advanceToEventPhase()">Continue to Event Phase &rarr;</button>
    </div>`;
}
function toggleCivicUsed(sid, checked){
  const a = state.turnWizard.activity;
  if(checked) a.civicUsed[sid] = true; else delete a.civicUsed[sid];
  scheduleSave();
  renderKingdomTurnWizard();
}
let pendingRegionActivity = null;
function openRegionActivityPicker(name){
  if(state.turnWizard.activity.regionLog.length>=3) return;
  pendingRegionActivity = name;
  const def = REGION_ACTIVITIES[name];
  const overlay = document.createElement('div');
  overlay.id = 'region-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:110;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:360px;width:100%;margin:0;">
    <h3>${escapeHtml(name)}</h3>
    <div class="hint" style="margin-top:0;">${escapeHtml(def.note)} Skill: ${escapeHtml(def.skill)}.</div>
    <div class="row"><div class="label">Target hex</div><input type="text" class="wide" id="region-hex-label" style="max-width:100px;" placeholder="e.g. F6"></div>
    <div id="region-hex-detail" class="hint" style="margin-top:0;"></div>
    <button class="action" style="margin-top:8px;" onclick="lookupRegionHex('${escapeAttr(name)}')">Look up this hex</button>
    <button class="ghost" style="margin-top:8px;" onclick="pendingRegionActivity=null;document.getElementById('region-overlay').remove();">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function lookupRegionHex(name){
  const label = document.getElementById('region-hex-label').value;
  const parsed = parseHexLabel(label);
  const detail = document.getElementById('region-hex-detail');
  if(!parsed){ detail.textContent = "Couldn't read that hex label — try e.g. F6."; return; }
  const {col,row} = parsed;
  const h = state.hexes[hexKey(col,row)];
  const def = REGION_ACTIVITIES[name];
  if(!h || !h.terrain){
    detail.innerHTML = `${hexLabel(col,row)} has no tracked terrain yet. <span class="loc-link" onclick="document.getElementById('region-overlay').remove();closeKingdomTurnWizard();jumpToHex(${col},${row});">Go set it on the Map</span>`;
    return;
  }
  const rpCost = def.rpCost==='farmland'
    ? (h.terrain==='Plains' ? 1 : h.terrain==='Hill' ? 2 : null)
    : (WORK_SITE_TERRAIN_RP_COST[h.terrain] ?? null);
  if(rpCost==null){
    detail.textContent = `${h.terrain} isn't a valid terrain for ${name} at ${hexLabel(col,row)}.`;
    return;
  }
  detail.innerHTML = `${hexLabel(col,row)} — ${h.terrain}. Costs ${rpCost} RP.${state.rp<rpCost?' Not enough RP.':''} <button class="action" style="margin-top:6px;" ${state.rp<rpCost?'disabled style="opacity:.45;"':''} onclick="resolveRegionActivityStart('${escapeAttr(name)}',${col},${row},${rpCost})">Pay ${rpCost} RP &amp; resolve</button>`;
}
function resolveRegionActivityStart(name, col, row, rpCost){
  if(state.rp<rpCost) return;
  state.rp -= rpCost;
  state.rpSpentThisTurn = (state.rpSpentThisTurn||0) + rpCost;
  const el = document.getElementById('region-overlay');
  if(el) el.remove();
  openDegreePicker(name, d=>resolveRegionActivity(name, col, row, rpCost, d));
}
function resolveRegionActivity(name, col, row, rpCost, degree){
  const def = REGION_ACTIVITIES[name];
  const text = def.outcomes[degree];
  const key = hexKey(col,row);
  let mechNote = '';
  if(degree===3 && /refund half/i.test(text)){ state.rp += Math.floor(rpCost/2); mechNote = ` +${Math.floor(rpCost/2)} RP refunded.`; }
  if(name==='Claim Hex' && degree>=2){
    const h = state.hexes[key] || {name:'',note:'',resources:'',features:'',terrain:'',workSite:'',resourceFlag:false};
    if(!CLAIMED_HEX_TYPES.includes(h.type)){ h.type = 'Claimed Territory'; state.hexes[key] = h; }
    state.xp += 10; mechNote += ' +10 kingdom XP.';
  }
  if(name==='Establish Farmland' && degree>=2 && state.hexes[key]){ state.hexes[key].workSite = 'Farmland'; mechNote += ' Hex set to Farmland.'; }
  if(name==='Fortify Hex'){ if(degree>=2) state.unrest = Math.max(0, state.unrest-1); if(degree===0) state.unrest += 1; }
  if((name==='Clear Hex' || name==='Build Roads' || name==='Irrigation') && degree===0){ state.unrest += 1; }
  state.turnWizard.activity.regionLog.push({name, hexLabel:hexLabel(col,row), degree, text:text+mechNote, rpCost});
  state.log.unshift({turn:state.turn, note:`Region — ${name} at ${hexLabel(col,row)}: ${text}${mechNote}`});
  pendingRegionActivity = null;
  scheduleSave();
  renderKingdomTurnWizard();
}
function advanceToEventPhase(){
  state.turnWizard.phase = 'event';
  scheduleSave();
  renderKingdomTurnWizard();
}

/* =====================================================================
   PHASE 4: EVENT (2e.aonprd.com/Rules.aspx?ID=1809) — DC 16 flat check for a random
   event; a miss drops next turn's DC by 5 (floor 1), and a hit resets it to 16. Event
   resolution grants a PC-leader circumstance bonus if a non-vacant PC holds the role
   handling it (Rules.aspx?ID=1774: +1, or +2/+3 at kingdom level 9/15).
===================================================================== */
function pcLeaderEventBonus(role){
  if(!role) return 0;
  const l = state.leaders[role];
  if(!l || !l.pcHeld || l.vacant) return 0;
  return state.level>=15 ? 3 : state.level>=9 ? 2 : 1;
}
function renderEventPhaseBody(){
  const e = state.turnWizard.event;
  if(e.done){
    return `<h3>Event</h3><div class="hint" style="margin-top:0;">${escapeHtml(e.summary)}</div>
      <button class="action" style="margin-top:10px;" onclick="finishKingdomTurn()">Finish Turn</button>`;
  }
  if(e.checked===undefined || e.checked===null){
    if(state.turnWizard.forceRandomEvent){
      state.turnWizard.forceRandomEvent = false;
      state.eventDC = 16;
      state.turnWizard.event = {checked:'forced', priorDC:'forced (Prognostication)', triggered:true};
      scheduleSave();
      return renderEventPhaseBody();
    }
    return `<h3>Event</h3>
      <div class="hint" style="margin-top:0;">Attempt a DC ${state.eventDC} flat check. On a hit, a random kingdom event occurs this turn.</div>
      <input class="num" type="number" id="event-dc-roll" min="1" max="20" placeholder="d20 result">
      <button class="action" style="margin-top:8px;" onclick="rollEventCheck()">Confirm roll</button>
      <div class="creation-nav" style="margin-top:14px;flex-wrap:wrap;gap:8px;">
        ${wizardCloseButton()}
        <button class="ghost" onclick="skipEventCheck()">No event to check right now</button>
      </div>`;
  }
  if(!e.triggered){
    return `<h3>Event</h3><div class="hint" style="margin-top:0;">Rolled ${e.checked} vs DC ${e.priorDC} — no event. Next turn's DC drops to ${state.eventDC}.</div>
      <button class="action" style="margin-top:10px;" onclick="finishKingdomTurn()">Finish Turn</button>`;
  }
  return `<h3>Event triggered!</h3>
    <div class="hint" style="margin-top:0;">Rolled ${e.checked} vs DC ${e.priorDC}. Resolve the event at the table (a starter event library isn't built into the app yet — use the Kingmaker Events list), then log which Kingdom skill and leader handled it and what happened.</div>
    <div class="row"><div class="label">Kingdom skill</div><select id="event-skill" class="wide">${SKILLS.map(([n])=>`<option value="${n}">${n}</option>`).join('')}</select></div>
    <div class="row"><div class="label">Handled by</div><select id="event-role" class="wide" onchange="updateEventBonusPreview()">${ROLES.map(([r])=>`<option value="${r}">${r}${state.leaders[r].name?' — '+escapeHtml(state.leaders[r].name):''}</option>`).join('')}</select></div>
    <div class="hint" id="event-bonus-preview" style="margin-top:0;"></div>
    <button class="action" style="margin-top:8px;" onclick="openEventResolutionPicker()">Resolve</button>`;
}
function rollEventCheck(){
  const roll = parseInt(document.getElementById('event-dc-roll').value,10);
  if(!roll || roll<1 || roll>20){ alert('Enter the d20 result (1-20).'); return; }
  const priorDC = state.eventDC;
  const triggered = roll>=priorDC;
  state.eventDC = triggered ? 16 : Math.max(1, priorDC-5);
  state.turnWizard.event = {checked:roll, priorDC, triggered};
  scheduleSave();
  renderKingdomTurnWizard();
}
function skipEventCheck(){
  state.turnWizard.event = {done:true, summary:'Event check skipped for now.'};
  scheduleSave();
  renderKingdomTurnWizard();
}
function updateEventBonusPreview(){
  const role = document.getElementById('event-role').value;
  const bonus = pcLeaderEventBonus(role);
  document.getElementById('event-bonus-preview').textContent = bonus ? `+${bonus} circumstance bonus — ${state.leaders[role].name} (${role}) is a PC-held, non-vacant leader.` : 'No PC-leader bonus for this role right now.';
}
function openEventResolutionPicker(){
  const role = document.getElementById('event-role').value;
  const skill = document.getElementById('event-skill').value;
  openDegreePicker(`Event — ${skill} (${role})`, d=>resolveEvent(skill, role, d));
}
function resolveEvent(skill, role, degree){
  const bonus = pcLeaderEventBonus(role);
  state.xp += 30;
  const labels = ['Critical Failure','Failure','Success','Critical Success'];
  const summary = `Random event resolved with ${skill} (${role}${bonus?`, +${bonus} PC-leader bonus`:''}) — ${labels[degree]}. +30 kingdom XP.`;
  state.turnWizard.event = {done:true, summary};
  state.log.unshift({turn:state.turn, note:`Event — ${summary}`});
  scheduleSave();
  renderKingdomTurnWizard();
}
function finishKingdomTurn(){
  state.fame = 0;
  const rpXp = Math.min(120, state.rp);
  if(rpXp>0){ state.xp += rpXp; state.rp -= rpXp; }
  let milestoneNote = '';
  if(!state.milestoneRP100Claimed && (state.rpSpentThisTurn||0)>=100){
    state.xp += 80;
    state.milestoneRP100Claimed = true;
    milestoneNote = ' Milestone: first turn spending 100+ RP, +80 kingdom XP.';
  }
  state.log.unshift({turn:state.turn, note:`Turn complete — ${rpXp>0?`${rpXp} unspent RP converted to XP.`:'no unspent RP to convert.'}${milestoneNote}`});
  state.turn += 1;
  state.rpSpentThisTurn = 0;
  state.turnWizard = null;
  closeKingdomTurnWizard();
}

/* ---------- SETTLEMENTS ---------- */
function addSettlement(){
  const id = Date.now();
  state.settlements.push({id, name:'New Settlement', type:'Village', grid:defaultSettlementGrid()});
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

/* ---------- lot placement / upgrade / removal ---------- */
function lotsForGrid(s, gridNum){ return gridNum===2 ? s.grid.lots2 : s.grid.lots; }
const STRUCTURE_PICKER_CATEGORIES = ['All','Building','Residential','Edifice','Yard'];
let lotPickerState = null; // {sid,gridNum,blockIdx,category,search} while the picker overlay is open
function openLotPicker(sid, gridNum, blockIdx){
  const s = state.settlements.find(x=>x.id===sid);
  if(!s) return;
  lotPickerState = {sid, gridNum, blockIdx, category:'All', search:''};
  const overlay = document.createElement('div');
  overlay.id = 'lot-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <h3>Build in ${escapeHtml(s.name)}</h3>
    <div class="hint" style="margin-top:0;" id="lot-picker-hint"></div>
    <input type="text" class="wide" placeholder="Search structures…" style="margin-top:8px;" oninput="lotPickerState.search=this.value;renderLotPickerResults();">
    <div id="lot-picker-categories" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"></div>
    <div id="lot-picker-results" style="margin-top:8px;max-height:48vh;overflow-y:auto;"></div>
    <button class="ghost" style="margin-top:8px;" onclick="closeLotOverlay()">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
  renderLotPickerCategories();
  renderLotPickerResults();
}
function renderLotPickerCategories(){
  document.getElementById('lot-picker-categories').innerHTML = STRUCTURE_PICKER_CATEGORIES.map(c=>
    `<button type="button" class="small-ghost" style="${lotPickerState.category===c?'border-color:var(--gold);color:var(--gold);':''}" onclick="lotPickerState.category='${c}';renderLotPickerCategories();renderLotPickerResults();">${c}</button>`
  ).join('');
}
function renderLotPickerResults(){
  const {sid, gridNum, blockIdx, category, search} = lotPickerState;
  const s = state.settlements.find(x=>x.id===sid);
  if(!s) return;
  const block = lotsForGrid(s, gridNum)[blockIdx];
  const emptyCount = block.filter(v=>!v).length;
  let options = buildableStructuresFor(emptyCount);
  if(category!=='All') options = options.filter(st=>(st.category||[]).includes(category));
  const q = search.trim().toLowerCase();
  if(q) options = options.filter(st=>st.name.toLowerCase().includes(q));
  document.getElementById('lot-picker-hint').textContent = `This block has ${emptyCount} open lot${emptyCount===1?'':'s'}. RP balance: ${state.rp}.`;
  document.getElementById('lot-picker-results').innerHTML = options.length ? options.map(st=>{
    const pending = (s.pendingBuilds||[]).some(p=>p.gridNum===gridNum && p.blockIdx===blockIdx && p.structureName===st.name);
    const problem = pending ? null : affordabilityMessage(st.cost);
    return `<button type="button" class="option-card" ${problem?'style="opacity:.45;pointer-events:none;"':''} onclick="placeStructureInLot(${sid},${gridNum},${blockIdx},'${escapeAttr(st.name)}')">
      <div class="opt-name">${escapeHtml(st.name)} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(${st.lots} lot${st.lots>1?'s':''} · ${pending?'already paid — retry the check':formatCost(st.cost)})</span></div>
      <div class="opt-detail">${escapeHtml(st.effect)}${problem?` — <span style="color:var(--rust);">${escapeHtml(problem)}</span>`:''}</div>
    </button>`;
  }).join('') : `<div class="hint" style="margin-top:0;">Nothing matches — try a different filter, or check lot space, kingdom level, and proficiency.</div>`;
}
// Unlike skill-check DCs (resolved at the table), RP/commodity cost is pure arithmetic,
// so it's enforced here rather than just displayed.
function formatCost(cost){
  const parts = [];
  if(cost.rp) parts.push(cost.rp+' RP');
  GOODS.forEach(g=>{ const k=g.toLowerCase(); if(cost[k]) parts.push(cost[k]+' '+g); });
  return parts.length ? parts.join(', ') : 'free';
}
function shortCommodities(cost){
  return GOODS.filter(g=>{ const k=g.toLowerCase(); const need=cost[k]||0; return need>state.goods[g]; });
}
function affordabilityMessage(cost){
  const rpCost = cost.rp||0;
  if(state.rp < rpCost) return `Not enough RP — this costs ${rpCost} RP, you have ${state.rp}.`;
  const shorts = shortCommodities(cost);
  if(!shorts.length) return null;
  const short = shorts.map(g=>{ const k=g.toLowerCase(); const need=cost[k]||0; return `${need} ${g} (have ${state.goods[g]})`; });
  return `Not enough commodities — needs ${short.join(', ')}.`;
}
// Proactive fix suggestion for a commodity shortage: find an already-claimed hex that
// either already has the right terrain (just needs its Work Site set) or needs both.
// Doesn't distinguish "claimed" from "any hex GM has entered" — the app doesn't track
// claim status separately from having a hex entry at all, so any tracked hex counts.
function suggestCommodityFixHex(good){
  const site = Object.entries(HEX_WORK_SITES).find(([,def])=>def.good===good);
  if(!site) return null;
  const [siteName, siteDef] = site;
  const ready = Object.entries(state.hexes).find(([,h])=> h && h.terrain && siteDef.terrains && siteDef.terrains.includes(h.terrain) && h.workSite!==siteName);
  if(ready){
    const [col,row] = ready[0].split('_').map(Number);
    return {col, row, siteName, needsTerrainToo:false};
  }
  return {siteName, needsTerrainToo:true};
}
function showCommodityShortageHelp(cost, problemText){
  const shorts = shortCommodities(cost);
  const overlay = document.createElement('div');
  overlay.id = 'commodity-help-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:120;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:380px;width:100%;margin:0;">
    <h3 style="color:var(--rust);">Not enough commodities</h3>
    <div class="hint" style="margin-top:0;">${escapeHtml(problemText)}</div>
    ${shorts.map(good=>{
      const fix = suggestCommodityFixHex(good);
      if(!fix) return '';
      return fix.needsTerrainToo
        ? `<div class="hint" style="margin-top:10px;margin-bottom:2px;">${escapeHtml(good)}: no tracked hex has the right terrain for a ${escapeHtml(fix.siteName)} yet.</div>
           <button class="ghost" onclick="document.getElementById('commodity-help-overlay').remove();switchTab('map');">Go claim one on the Map</button>`
        : `<div class="hint" style="margin-top:10px;margin-bottom:2px;">${escapeHtml(good)}: hex ${hexLabel(fix.col,fix.row)} already has the right terrain — it just needs a ${escapeHtml(fix.siteName)}.</div>
           <button class="action" onclick="document.getElementById('commodity-help-overlay').remove();jumpToHex(${fix.col},${fix.row});">Take me to ${hexLabel(fix.col,fix.row)}</button>`;
    }).join('')}
    <button class="ghost" style="margin-top:10px;" onclick="document.getElementById('commodity-help-overlay').remove();">Close</button>
  </div>`;
  document.body.appendChild(overlay);
}
function spendResources(cost){
  const rpCost = cost.rp||0;
  state.rp = Math.max(0, state.rp - rpCost);
  if(rpCost) state.rpSpentThisTurn = (state.rpSpentThisTurn||0) + rpCost;
  GOODS.forEach(g=>{ const k=g.toLowerCase(); const need=cost[k]||0; if(need) state.goods[g] = Math.max(0, state.goods[g]-need); });
}
let pendingStructurePlacement = null; // {sid,gridNum,blockIdx,structureName,emptyIdxs} while a Tenement-style ruin choice is open
// Build Structure (2e.aonprd.com/Actions.aspx?ID=1372, Civic trait) — real 4-tier outcome:
// critical success = build + refund half the commodities; success = build; failure = no
// build, but costs already spent carry forward (no re-pay on a later attempt, tracked via
// s.pendingBuilds); critical failure = no build, and the lots fill with Rubble (per AoN's
// own text this applies "in either event," i.e. fresh construction too, not just repairs —
// Rubble must be cleared with Demolish before the lots are usable again).
function placeStructureInLot(sid, gridNum, blockIdx, structureName){
  const s = state.settlements.find(x=>x.id===sid);
  if(!s) return;
  const st = KM_STRUCTURES.find(x=>x.name===structureName);
  if(!st || st.lots==null || !st.construction) return;
  const block = lotsForGrid(s, gridNum)[blockIdx];
  const emptyIdxs = block.map((v,i)=>v?-1:i).filter(i=>i!==-1);
  if(emptyIdxs.length < st.lots) return;
  s.pendingBuilds = s.pendingBuilds||[];
  const pending = s.pendingBuilds.find(p=>p.gridNum===gridNum && p.blockIdx===blockIdx && p.structureName===structureName);
  if(!pending){
    const problem = affordabilityMessage(st.cost);
    if(problem){ shortCommodities(st.cost).length ? showCommodityShortageHelp(st.cost, problem) : alert(problem); return; }
    spendResources(st.cost);
  }
  closeLotOverlay();
  openDegreePicker(`Build Structure — ${structureName}`, d=>resolveBuildStructure(sid, gridNum, blockIdx, structureName, d));
}
function resolveBuildStructure(sid, gridNum, blockIdx, structureName, degree){
  const s = state.settlements.find(x=>x.id===sid);
  const st = KM_STRUCTURES.find(x=>x.name===structureName);
  if(!s || !st) return;
  s.pendingBuilds = (s.pendingBuilds||[]).filter(p=>!(p.gridNum===gridNum && p.blockIdx===blockIdx && p.structureName===structureName));
  const block = lotsForGrid(s, gridNum)[blockIdx];
  const emptyIdxs = block.map((v,i)=>v?-1:i).filter(i=>i!==-1);
  if(degree>=2){
    if(emptyIdxs.length < st.lots){ alert('Not enough open lots left to complete this build — it was crowded out in the meantime. Costs already spent are not refunded.'); scheduleSave(); render(); return; }
    if(st.ruin && /of your choice/i.test(st.ruin)){
      pendingStructurePlacement = {sid, gridNum, blockIdx, structureName, emptyIdxs, critRefund: degree===3};
      openRuinChoicePopup();
      return;
    }
    finishPlaceStructure(sid, gridNum, blockIdx, structureName, emptyIdxs, null, degree===3);
  } else if(degree===1){
    s.pendingBuilds.push({gridNum, blockIdx, structureName});
    state.log.unshift({turn:state.turn, note:`Structures — ${structureName} construction failed in ${s.name}; costs already spent carry forward to the next attempt.`});
    scheduleSave(); renderNotesTab(); render();
  } else {
    for(let i=0;i<st.lots && i<emptyIdxs.length;i++) block[emptyIdxs[i]] = {name:'Rubble', g:'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)+'_'+i};
    state.log.unshift({turn:state.turn, note:`Structures — ${structureName} construction critically failed in ${s.name}. The lots are now Rubble — clear them with Demolish before building here again.`});
    scheduleSave(); renderNotesTab(); render();
  }
}
function finishPlaceStructure(sid, gridNum, blockIdx, structureName, emptyIdxs, ruinChoice, critRefund){
  const s = state.settlements.find(x=>x.id===sid);
  const st = KM_STRUCTURES.find(x=>x.name===structureName);
  if(!s || !st) return;
  if(critRefund){
    if(st.cost.rp) state.rp += Math.floor(st.cost.rp/2);
    GOODS.forEach(g=>{ const k=g.toLowerCase(); const amt=st.cost[k]||0; if(amt) state.goods[g] = addWithCap(state.goods[g], Math.floor(amt/2), goodStorageCap(g)); });
  }
  const block = lotsForGrid(s, gridNum)[blockIdx];
  const g = 'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  for(let i=0;i<st.lots;i++){
    const slot = {name:structureName, g};
    if(ruinChoice) slot.ruinChoice = ruinChoice;
    block[emptyIdxs[i]] = slot;
  }
  state.log.unshift({turn:state.turn, note:`Structures — built ${structureName} in ${s.name}${critRefund?' (critical success — half commodities refunded)':''}.`});
  closeLotOverlay();
  scheduleSave();
  renderNotesTab();
  render();
}
function openRuinChoicePopup(){
  const overlay = document.createElement('div');
  overlay.id = 'lot-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:360px;width:100%;margin:0;">
    <h3>Which Ruin?</h3>
    <div class="hint" style="margin-top:0;">This structure raises one Ruin track of your choice by 1, for as long as it stands.</div>
    <div class="boost-picker" style="margin-top:10px;">
      ${['Corruption','Crime','Decay','Strife'].map(r=>`<button type="button" onclick="chooseRuinForPendingStructure('${r}')">${r}</button>`).join('')}
    </div>
    <button class="ghost" style="margin-top:10px;" onclick="pendingStructurePlacement=null;closeLotOverlay();">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function chooseRuinForPendingStructure(ruinName){
  if(!pendingStructurePlacement) return;
  const {sid, gridNum, blockIdx, structureName, emptyIdxs, critRefund} = pendingStructurePlacement;
  pendingStructurePlacement = null;
  finishPlaceStructure(sid, gridNum, blockIdx, structureName, emptyIdxs, ruinName, critRefund);
}
// Demolish (2e.aonprd.com/Actions.aspx?ID=1391, Civic trait) — clears an occupied lot
// (in practice, almost always a Rubble lot left by a critically-failed build) back to
// buildable. AoN gives no distinct critical-failure text, so critical failure here is
// treated the same as a plain failure (still Rubble) rather than guessed at.
function demolishLot(sid, gridNum, blockIdx, groupId){
  closeLotOverlay();
  openDegreePicker('Demolish', d=>resolveDemolish(sid, gridNum, blockIdx, groupId, d));
}
function clearRubbleGroup(s, gridNum, blockIdx, groupId){
  lotsForGrid(s, gridNum)[blockIdx].forEach((v,i,arr)=>{ if(v && v.g===groupId) arr[i]=null; });
}
function resolveDemolish(sid, gridNum, blockIdx, groupId, degree){
  const s = state.settlements.find(x=>x.id===sid);
  if(!s) return;
  if(degree===3){ openDemolishCritRewardPicker(sid, gridNum, blockIdx, groupId); return; }
  if(degree===2){
    clearRubbleGroup(s, gridNum, blockIdx, groupId);
    state.log.unshift({turn:state.turn, note:`Structures — demolished a Rubble lot in ${s.name}.`});
  } else {
    state.log.unshift({turn:state.turn, note:`Structures — Demolish failed in ${s.name}; the lot remains Rubble.`});
  }
  scheduleSave(); renderNotesTab(); render();
}
let pendingDemolishCrit = null;
function openDemolishCritRewardPicker(sid, gridNum, blockIdx, groupId){
  pendingDemolishCrit = {sid, gridNum, blockIdx, groupId};
  const overlay = document.createElement('div');
  overlay.id = 'lot-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:340px;width:100%;margin:0;">
    <h3>Critical Success — recover materials</h3>
    <div class="hint" style="margin-top:0;">Roll 1d6 and pick which Commodity your crews salvaged from the rubble.</div>
    <input class="num" type="number" min="1" max="6" id="demolish-crit-roll" placeholder="1d6 result">
    <div class="boost-picker" style="margin-top:10px;">
      ${['Lumber','Stone','Ore'].map(g=>`<button type="button" onclick="confirmDemolishCritReward('${g}')">${g}</button>`).join('')}
    </div>
    <button class="ghost" style="margin-top:10px;" onclick="pendingDemolishCrit=null;closeLotOverlay();">Skip reward</button>
  </div>`;
  document.body.appendChild(overlay);
}
function confirmDemolishCritReward(good){
  if(!pendingDemolishCrit) return;
  const roll = parseInt(document.getElementById('demolish-crit-roll').value,10);
  const {sid, gridNum, blockIdx, groupId} = pendingDemolishCrit;
  pendingDemolishCrit = null;
  const s = state.settlements.find(x=>x.id===sid);
  if(!s) return;
  let note = `Structures — demolished a Rubble lot in ${s.name} (critical success).`;
  if(roll && roll>=1 && roll<=6){
    state.goods[good] = addWithCap(state.goods[good], roll, goodStorageCap(good));
    note += ` Recovered ${roll} ${good}.`;
  }
  clearRubbleGroup(s, gridNum, blockIdx, groupId);
  state.log.unshift({turn:state.turn, note});
  closeLotOverlay();
  scheduleSave(); renderNotesTab(); render();
}
function openLotInfoPopup(sid, gridNum, blockIdx, groupId){
  const s = state.settlements.find(x=>x.id===sid);
  if(!s) return;
  const block = lotsForGrid(s, gridNum)[blockIdx];
  const slot = block.find(v=>v && v.g===groupId);
  if(!slot) return;
  const def = KM_STRUCTURES.find(x=>x.name===slot.name);
  const currentLots = block.filter(v=>v && v.g===groupId).length;
  const emptyCount = block.filter(v=>!v).length;
  const upgradeOptions = ((def && def.upgradeTo) || [])
    .map(n=>KM_STRUCTURES.find(x=>x.name===n)).filter(u=>u && u.level<=state.level && structureRankMet(u));
  const isRubble = slot.name==='Rubble';
  const overlay = document.createElement('div');
  overlay.id = 'lot-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <h3>${escapeHtml(slot.name)}</h3>
    ${def ? `<div class="hint" style="margin-top:0;">${escapeHtml(def.effect)}</div>` : ''}
    ${isRubble ? `<button type="button" class="action" style="margin-top:10px;" onclick="demolishLot(${sid},${gridNum},${blockIdx},'${groupId}')">Demolish (clear this lot)</button>` : ''}
    ${upgradeOptions.length ? `
      <div class="hint" style="margin:10px 0 4px;">Upgrade to:</div>
      ${upgradeOptions.map(u=>{
        const need = Math.max(0, u.lots - currentLots);
        const roomFits = need<=emptyCount;
        const problem = affordabilityMessage(u.cost);
        const fits = roomFits && !problem;
        return `<button type="button" class="option-card" ${fits?'':'style="opacity:.45;pointer-events:none;"'} onclick="upgradeStructureGroup(${sid},${gridNum},${blockIdx},'${groupId}','${escapeAttr(u.name)}')">
          <div class="opt-name">${escapeHtml(u.name)} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(${formatCost(u.cost)})</span></div>
          <div class="opt-detail">${escapeHtml(u.effect)}${!roomFits?' — not enough open lots in this block':(problem?' — '+escapeHtml(problem):'')}</div>
        </button>`;
      }).join('')}` : ''}
    <button class="ghost danger-ghost" style="margin-top:10px;" onclick="removeStructureGroup(${sid},${gridNum},'${groupId}');closeLotOverlay();">Remove <span style="opacity:.7;">(instant, no check — RP/commodities already spent aren't refunded)</span></button>
    <button class="ghost" style="margin-top:8px;" onclick="closeLotOverlay()">Close</button>
  </div>`;
  document.body.appendChild(overlay);
}
function upgradeStructureGroup(sid, gridNum, blockIdx, groupId, newName){
  const s = state.settlements.find(x=>x.id===sid);
  if(!s) return;
  const block = lotsForGrid(s, gridNum)[blockIdx];
  const oldSlots = [];
  block.forEach((v,i)=>{ if(v && v.g===groupId) oldSlots.push(i); });
  const newDef = KM_STRUCTURES.find(x=>x.name===newName);
  if(!oldSlots.length || !newDef) return;
  const need = newDef.lots - oldSlots.length;
  const emptyIdxs = need>0 ? block.map((v,i)=>v?-1:i).filter(i=>i!==-1) : [];
  if(need>0 && emptyIdxs.length<need){ alert('Not enough open lots in this block to upgrade to '+newName+'.'); return; }
  const problem = affordabilityMessage(newDef.cost);
  if(problem){ shortCommodities(newDef.cost).length ? showCommodityShortageHelp(newDef.cost, problem) : alert(problem); return; }
  spendResources(newDef.cost);
  if(need>0){
    for(let i=0;i<need;i++){ block[emptyIdxs[i]] = {name:newName, g:groupId}; oldSlots.push(emptyIdxs[i]); }
  } else if(need<0){
    for(let i=0;i<(-need);i++){ block[oldSlots.pop()] = null; }
  }
  oldSlots.forEach(i=>{ if(block[i]) block[i].name = newName; });
  closeLotOverlay();
  scheduleSave();
  renderNotesTab();
}
function removeStructureGroup(sid, gridNum, groupId){
  const s = state.settlements.find(x=>x.id===sid);
  if(!s) return;
  lotsForGrid(s, gridNum).forEach(block=>block.forEach((v,i)=>{ if(v && v.g===groupId) block[i]=null; }));
  scheduleSave();
  renderNotesTab();
}
function closeLotOverlay(){
  const el = document.getElementById('lot-overlay');
  if(el) el.remove();
}

let pickingForSettlement = null;
let pickingCapital = false;
let pickingForArmy = null;
let pendingPickHex = null; // {col,row} tapped but not yet confirmed, while in pick mode

function startPickLocation(id){
  const s = state.settlements.find(x=>x.id===id);
  if(!s) return;
  pickingForSettlement = id;
  pendingPickHex = null;
  switchTab('map');
  renderPickBanner(`Tap a hex to set as ${escapeHtml(s.name)}'s location`);
}
// Armies occupy a hex the same conceptual way a Capital/Settlement marker does, but
// don't own the hex's marker type (state.hexes[key].type) — several armies, or an army
// and a settlement, can share one hex. Reuses the same pick-a-hex flow as settlements/capital.
function startPickArmyLocation(id){
  const a = state.armies.find(x=>x.id===id);
  if(!a) return;
  pickingForArmy = id;
  pendingPickHex = null;
  switchTab('map');
  renderPickBanner(`Tap a hex to deploy ${escapeHtml(a.name)} to`);
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
  else if(pickingForArmy) pinArmyLocation(col,row);
}
function pinCapitalLocation(col,row){
  const key = hexKey(col,row);
  const existing = state.hexes[key] || {note:''};
  state.hexes[key] = {name: state.name, type:'Capital', note: existing.note||'', resources: existing.resources||'', features: existing.features||'', terrain: existing.terrain||'', workSite: existing.workSite||'', resourceFlag: existing.resourceFlag||false};
  // A capital is mechanically a settlement like any other (same grid, same
  // structures) — create and open a real Settlement here instead of leaving a bare
  // hex label with nothing underneath it. Reuses addSettlement()'s exact shape.
  let capSettlement = state.settlements.find(s=>s.col===col && s.row===row);
  if(!capSettlement){
    capSettlement = {id: Date.now(), name: state.name, type:'Village', grid: defaultSettlementGrid(), notes:'', col, row};
    state.settlements.push(capSettlement);
  }
  cancelPickLocation();
  scheduleSave();
  updateHexMarkers();
  renderNotesTab();
  render();
  switchTab('notes');
}
function cancelPickLocation(){
  pickingForSettlement = null;
  pickingCapital = false;
  pickingForArmy = null;
  pendingPickHex = null;
  document.getElementById('map-float-pick-banner').style.display = 'none';
  const svg = document.getElementById('hexoverlay');
  if(svg) svg.querySelectorAll('.hex-cell').forEach(p=>{ p.classList.remove('picking'); p.classList.remove('pending-confirm'); });
}
function pinArmyLocation(col,row){
  const a = state.armies.find(x=>x.id===pickingForArmy);
  cancelPickLocation();
  if(!a) return;
  a.col = col; a.row = row;
  scheduleSave();
  updateHexMarkers();
  renderWarfareTab();
  switchTab('warfare');
  render();
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
  const existing = state.hexes[key] || {name:'',type:'',note:'',resources:'',features:'',terrain:'',workSite:'',resourceFlag:false};
  state.hexes[key] = {name: s.name, type:'Settlement', note: existing.note||'', resources: existing.resources||'', features: existing.features||'', terrain: existing.terrain||'', workSite: existing.workSite||'', resourceFlag: existing.resourceFlag||false};
  scheduleSave();
  updateHexMarkers();
  renderNotesTab();
  switchTab('notes');
  render();
}

function renderUrbanGrid(s, gridNum){
  const unlockedCount = gridNum===2 ? s.grid.blocks2 : s.grid.blocks;
  const lots = lotsForGrid(s, gridNum);
  let html = '<div class="urban-grid">';
  for(let bi=0; bi<9; bi++){
    if(bi>=unlockedCount){
      html += `<div class="ug-block locked"><div class="ug-locked">locked</div></div>`;
      continue;
    }
    html += `<div class="ug-block">`;
    lots[bi].forEach(slot=>{
      if(slot){
        const def = KM_STRUCTURES.find(x=>x.name===slot.name);
        html += `<div class="ug-lot filled ${structureCategoryClass(def)}" onclick="openLotInfoPopup(${s.id},${gridNum},${bi},'${slot.g}')" title="${escapeAttr(slot.name)}">${escapeHtml(slot.name)}</div>`;
      } else {
        html += `<div class="ug-lot empty" onclick="openLotPicker(${s.id},${gridNum},${bi})" title="Build here">+</div>`;
      }
    });
    html += `</div>`;
  }
  html += '</div>';
  return html;
}
function renderGrowthPanel(s){
  const target = settlementGrowthTarget(s);
  if(!target){
    const progress = settlementGrowthProgress(s);
    return progress ? `<div class="hint" style="margin-top:10px;">${escapeHtml(progress)}</div>` : '';
  }
  if(target==='Town'){
    return `<div class="hint" style="margin-top:10px;">Ready to grow to Town — choose how many additional blocks to unlock (2–4):</div>
      <div style="display:flex;gap:6px;margin-top:4px;">
        ${[2,3,4].map(n=>`<button class="ghost" style="width:auto;flex:1;" onclick="growSettlementTo(${s.id},'Town',${n})">+${n} blocks</button>`).join('')}
      </div>`;
  }
  return `<button class="action" style="margin-top:10px;" onclick="growSettlementTo(${s.id},'${target}')">Grow to ${target}</button>`;
}
function renderSettlementsList(){
  document.getElementById('settlements-list').innerHTML = state.settlements.map(s=>`
    <div class="settlement">
      <div class="settlement-head">
        <input type="text" value="${escapeAttr(s.name)}" style="font-family:'Cinzel',serif;font-weight:600;background:none;border:none;font-size:16px;padding:0;flex:1;"
          onchange="renameSettlement(${s.id}, this.value)">
        <span class="pill">${s.type}</span>
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
      ${renderUrbanGrid(s, 1)}
      ${s.grid.blocks2>0 ? `<div class="hint" style="margin:10px 0 4px;">Second grid</div>${renderUrbanGrid(s, 2)}` : ''}
      ${renderGrowthPanel(s)}
      <textarea class="wide" placeholder="Notes about this settlement..." rows="2" style="margin-top:10px;" onchange="state.settlements.find(x=>x.id===${s.id}).notes=this.value;scheduleSave();">${escapeHtml(s.notes||'')}</textarea>
      <button class="ghost danger-ghost" style="margin-top:8px;" onclick="removeSettlement(${s.id})">Remove settlement</button>
    </div>`).join('') || '<div class="hint">No settlements founded yet.</div>';
}

/* =====================================================================
   ARMIES — recruit/train/outfit/deploy/garrison/recover/disband are all
   "app shows reference, table resolves the check, picking the outcome
   confirms it" like everywhere else — except where a cost is pure
   arithmetic (Outfit Army's RP cost), which is enforced for real.
===================================================================== */
const ARMY_GEAR = {
  'Additional Weapon':     {cost:{rp:10}, effect:'Adds a melee or ranged Strike of the other type.'},
  'Healing Potions':       {cost:{rp:15}, maxDoses:3, effect:'Use one dose as part of any Maneuver action to regain 1 HP.'},
  'Magic Armor':           {cost:{rp:25}, minLevel:5,  tier:1, replaces:null, effect:'+1 AC.'},
  'Greater Magic Armor':   {cost:{rp:50}, minLevel:11, tier:2, replaces:'Magic Armor', effect:'+2 AC.'},
  'Major Magic Armor':     {cost:{rp:75}, minLevel:18, tier:3, replaces:'Greater Magic Armor', effect:'+3 AC.'},
  'Magic Weapons':         {cost:{rp:20}, minLevel:2,  tier:1, replaces:null, effect:'+1 on Strikes with that weapon.'},
  'Greater Magic Weapons': {cost:{rp:40}, minLevel:10, tier:2, replaces:'Magic Weapons', effect:'+2 on Strikes with that weapon.'},
  'Major Magic Weapons':   {cost:{rp:60}, minLevel:16, tier:3, replaces:'Greater Magic Weapons', effect:'+3 on Strikes with that weapon.'}
};
function armyGearAcBonus(army){
  const g = army.gear||[];
  if(g.includes('Major Magic Armor')) return 3;
  if(g.includes('Greater Magic Armor')) return 2;
  if(g.includes('Magic Armor')) return 1;
  return 0;
}
function armyGearAttackBonus(army){
  const g = army.gear||[];
  if(g.includes('Major Magic Weapons')) return 3;
  if(g.includes('Greater Magic Weapons')) return 2;
  if(g.includes('Magic Weapons')) return 1;
  return 0;
}
function defaultArmyConditions(){
  return {shaken:0, weary:0, mired:0, outflanked:false, engaged:false, distant:false, routed:false, defeated:false, fortified:false, efficient:false, suppressed:false, guarding:null};
}
function armyActivityAvailable(army){ return army.activityUsedTurn !== state.turn; }
function markArmyActivityUsed(army){ army.activityUsedTurn = state.turn; }

/* ---- Recruit Army (Army, Downtime trait — not Leadership; no RP cost, just raises
   Consumption once recruited) ---- */
function openRecruitArmyPicker(){
  if(state.warfareRecruitBlockedTurn===state.turn){
    alert("Can't Recruit Army again this turn after a critical failure — try again next turn.");
    return;
  }
  const overlay = document.createElement('div');
  overlay.id = 'warfare-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <h3>Recruit Army</h3>
    <div class="hint" style="margin-top:0;">Warfare check (or Statecraft for a specialized army) against the Recruitment DC. Pick a type, resolve the check at the table, then confirm what happened.</div>
    ${Object.keys(ARMY_TYPES).map(type=>{
      const stats = armyStatsAtLevel(type, state.level);
      return `<button type="button" class="option-card" onclick="openDegreePicker('Recruit ${type}', d=>recruitArmy('${type}',d))">
        <div class="opt-name">${type} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(level ${stats.level}, Recruitment DC ${stats.recruitDC}, Consumption +${stats.consumption})</span></div>
        <div class="opt-detail">${escapeHtml(ARMY_TYPES[type].special)}</div>
      </button>`;
    }).join('')}
    <button class="ghost" style="margin-top:8px;" onclick="closeWarfareOverlay()">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function recruitArmy(type, degree){
  closeWarfareOverlay();
  if(degree<=1){
    if(degree===0){
      state.unrest += 1;
      state.warfareRecruitBlockedTurn = state.turn;
      state.log.unshift({turn:state.turn, note:`Warfare — Recruit Army (${type}) critically failed. +1 Unrest; can't try again this turn.`});
    } else {
      state.log.unshift({turn:state.turn, note:`Warfare — Recruit Army (${type}) failed.`});
    }
    scheduleSave(); render(); renderWarfareTab();
    return;
  }
  const stats = armyStatsAtLevel(type, state.level);
  const army = {
    id: newId(), name: `${type} ${state.armies.filter(a=>a.type===type).length+1}`, type,
    hp: stats.baseHp, tactics: [], gear: [],
    conditions: defaultArmyConditions(),
    col: undefined, row: undefined, activityUsedTurn: 0, rangedShotsUsed: 0
  };
  army.conditions.efficient = degree===3;
  state.armies.push(army);
  state.consumption += stats.consumption;
  state.log.unshift({turn:state.turn, note:`Warfare — Recruited ${army.name} (level ${stats.level})${degree===3?', efficient':''}. Consumption +${stats.consumption}.`});
  scheduleSave();
  render();
  renderWarfareTab();
}
/* Generic degree-of-success picker (crit success/success/failure/crit failure) used
   everywhere in Warfare that resolves a check — same "pick what happened" pattern as
   Structures/Leadership Activities, just with 4 outcomes instead of 1. */
let pendingDegreeCb = null;
function openDegreePicker(label, cb){
  pendingDegreeCb = cb;
  const overlay = document.createElement('div');
  overlay.id = 'degree-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:101;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:360px;width:100%;margin:0;">
    <h3>${escapeHtml(label)}</h3>
    <div class="hint" style="margin-top:0;">What happened at the table?</div>
    <button type="button" class="option-card" onclick="resolveDegreePicker(3)"><div class="opt-name">Critical Success</div></button>
    <button type="button" class="option-card" onclick="resolveDegreePicker(2)"><div class="opt-name">Success</div></button>
    <button type="button" class="option-card" onclick="resolveDegreePicker(1)"><div class="opt-name">Failure</div></button>
    <button type="button" class="option-card" onclick="resolveDegreePicker(0)"><div class="opt-name">Critical Failure</div></button>
    <button class="ghost" style="margin-top:8px;" onclick="document.getElementById('degree-overlay').remove();pendingDegreeCb=null;">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function resolveDegreePicker(degree){
  const el = document.getElementById('degree-overlay');
  if(el) el.remove();
  const cb = pendingDegreeCb;
  pendingDegreeCb = null;
  if(cb) cb(degree);
}
function closeWarfareOverlay(){
  const el = document.getElementById('warfare-overlay');
  if(el) el.remove();
}

/* ---- Army Activities (one per army per turn): Train / Outfit / Deploy / Garrison /
   Recover / Disband ---- */
function openArmyActivityPicker(armyId){
  const army = state.armies.find(a=>a.id===armyId);
  if(!army || !armyActivityAvailable(army)) return;
  const overlay = document.createElement('div');
  overlay.id = 'warfare-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <h3>${escapeHtml(army.name)} — Army Activity</h3>
    <div class="hint" style="margin-top:0;">One Army Activity per army per turn.</div>
    <button type="button" class="option-card" onclick="closeWarfareOverlay();openTrainArmyPicker('${armyId}')"><div class="opt-name">Train Army</div><div class="opt-detail">Learn a new Tactic (Scholarship or Warfare vs. its Training DC).</div></button>
    <button type="button" class="option-card" onclick="closeWarfareOverlay();openOutfitArmyPicker('${armyId}')"><div class="opt-name">Outfit Army</div><div class="opt-detail">Buy gear (Trade check) or distribute battle loot (Warfare check, free).</div></button>
    <button type="button" class="option-card" onclick="closeWarfareOverlay();markArmyActivityUsed(state.armies.find(a=>a.id==='${armyId}'));scheduleSave();startPickArmyLocation('${armyId}')"><div class="opt-name">Deploy Army</div><div class="opt-detail">Move this army to a new hex.</div></button>
    <button type="button" class="option-card" onclick="closeWarfareOverlay();openDegreePicker('Garrison Army',d=>garrisonArmy('${armyId}',d))"><div class="opt-name">Garrison Army</div><div class="opt-detail">Fortify in a hex with a Settlement/Capital/Work Site.</div></button>
    <button type="button" class="option-card" onclick="closeWarfareOverlay();openRecoverArmyPicker('${armyId}')"><div class="opt-name">Recover Army</div><div class="opt-detail">Heal HP or reduce a condition.</div></button>
    <button type="button" class="option-card" onclick="closeWarfareOverlay();disbandArmy('${armyId}')"><div class="opt-name">Disband Army</div><div class="opt-detail">No check needed. Removes the army and its Consumption.</div></button>
    <button class="ghost" style="margin-top:8px;" onclick="closeWarfareOverlay()">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function openTrainArmyPicker(armyId){
  const army = state.armies.find(a=>a.id===armyId);
  if(!army) return;
  const stats = armyStatsAtLevel(army.type, state.level);
  const options = Object.keys(WAR_TACTICS).filter(name=>{
    const t = WAR_TACTICS[name];
    return t.level<=stats.level && (!t.types || t.types.includes(army.type));
  });
  const overlay = document.createElement('div');
  overlay.id = 'warfare-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <h3>Train ${escapeHtml(army.name)}</h3>
    <div class="hint" style="margin-top:0;">Knows ${army.tactics.length}/${stats.maxTactics} tactics: ${army.tactics.join(', ')||'none'}.</div>
    <div style="margin-top:8px;max-height:55vh;overflow-y:auto;">
      ${options.map(name=>{
        const t = WAR_TACTICS[name];
        const known = army.tactics.includes(name);
        return `<button type="button" class="option-card" ${known?'style="opacity:.45;pointer-events:none;"':''} onclick="closeWarfareOverlay();openDegreePicker('Train Army — ${escapeAttr(name)}',d=>trainArmyResolve('${armyId}','${escapeAttr(name)}',d))">
          <div class="opt-name">${escapeHtml(name)} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(level ${t.level}, DC ${tacticTrainingDC(name)}${known?', known':''})</span></div>
          <div class="opt-detail">${escapeHtml(t.effect)}</div>
        </button>`;
      }).join('')}
    </div>
    <button class="ghost" style="margin-top:8px;" onclick="closeWarfareOverlay()">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function trainArmyResolve(armyId, tacticName, degree){
  const army = state.armies.find(a=>a.id===armyId);
  if(!army) return;
  markArmyActivityUsed(army);
  if(degree>=2){
    const stats = armyStatsAtLevel(army.type, state.level);
    if(army.tactics.length>=stats.maxTactics) army.tactics.shift(); // replace oldest, per the rules
    army.tactics.push(tacticName);
    if(degree===3) army.conditions.efficient = true;
    state.log.unshift({turn:state.turn, note:`Warfare — ${army.name} learned ${tacticName}${degree===3?' (efficient)':''}.`});
  } else {
    if(degree===0) army.conditions.weary += 1;
    state.log.unshift({turn:state.turn, note:`Warfare — ${army.name} failed to learn ${tacticName}${degree===0?'; weary +1':''}.`});
  }
  scheduleSave(); render(); renderWarfareTab();
}
function openOutfitArmyPicker(armyId){
  const army = state.armies.find(a=>a.id===armyId);
  if(!army) return;
  if(army.type==='Siege'){ alert("Siege armies can't be outfitted with gear."); return; }
  const stats = armyStatsAtLevel(army.type, state.level);
  const overlay = document.createElement('div');
  overlay.id = 'warfare-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <h3>Outfit ${escapeHtml(army.name)}</h3>
    <div class="hint" style="margin-top:0;">Current gear: ${army.gear.length?army.gear.join(', '):'none'}. RP balance: ${state.rp}.</div>
    <div style="margin-top:8px;max-height:55vh;overflow-y:auto;">
      ${Object.keys(ARMY_GEAR).map(name=>{
        const g = ARMY_GEAR[name];
        const doseCount = name==='Healing Potions' ? army.gear.filter(x=>x==='Healing Potions').length : 0;
        const maxedDoses = name==='Healing Potions' && doseCount>=g.maxDoses;
        const tooLow = g.minLevel && stats.level<g.minLevel;
        const problem = affordabilityMessage(g.cost) || (maxedDoses?'Already at max doses (3).':null) || (tooLow?`Needs army level ${g.minLevel}.`:null);
        return `<button type="button" class="option-card" ${problem?'style="opacity:.45;pointer-events:none;"':''} onclick="closeWarfareOverlay();openDegreePicker('Outfit Army — ${escapeAttr(name)}',d=>outfitArmyResolve('${armyId}','${escapeAttr(name)}',d))">
          <div class="opt-name">${escapeHtml(name)} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(${formatCost(g.cost)})</span></div>
          <div class="opt-detail">${escapeHtml(g.effect)}${problem?` — <span style="color:var(--rust);">${escapeHtml(problem)}</span>`:''}</div>
        </button>`;
      }).join('')}
    </div>
    <button class="ghost" style="margin-top:8px;" onclick="closeWarfareOverlay()">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function outfitArmyResolve(armyId, gearName, degree){
  const army = state.armies.find(a=>a.id===armyId);
  const g = ARMY_GEAR[gearName];
  if(!army || !g) return;
  markArmyActivityUsed(army);
  const problem = affordabilityMessage(g.cost);
  if(problem){ shortCommodities(g.cost).length ? showCommodityShortageHelp(g.cost, problem) : alert(problem); return; }
  if(degree>=2){
    spendResources(g.cost);
    if(g.replaces) army.gear = army.gear.filter(x=>x!==g.replaces);
    army.gear.push(gearName);
    if(degree===3) army.conditions.efficient = true;
    state.log.unshift({turn:state.turn, note:`Warfare — ${army.name} outfitted with ${gearName}${degree===3?' (efficient)':''}.`});
  } else if(degree===1){
    state.log.unshift({turn:state.turn, note:`Warfare — ${army.name} failed to acquire ${gearName}; RP not spent.`});
  } else {
    spendResources(g.cost);
    state.log.unshift({turn:state.turn, note:`Warfare — ${army.name} failed to acquire ${gearName}; RP spent anyway.`});
  }
  scheduleSave(); render(); renderWarfareTab();
}
function garrisonArmy(armyId, degree){
  const army = state.armies.find(a=>a.id===armyId);
  if(!army) return;
  markArmyActivityUsed(army);
  const key = army.col!==undefined ? hexKey(army.col,army.row) : null;
  const h = key ? state.hexes[key] : null;
  const validHex = h && ['Capital','Settlement'].includes(h.type) || (h && h.workSite);
  if(!validHex){
    state.log.unshift({turn:state.turn, note:`Warfare — ${army.name} couldn't Garrison here (needs a Capital/Settlement/Work Site hex).`});
  } else if(degree>=2){
    if(degree===3) army.conditions.fortified = true;
    state.log.unshift({turn:state.turn, note:`Warfare — ${army.name} garrisoned${degree===3?' and is fortified':''}.`});
  } else {
    state.log.unshift({turn:state.turn, note:`Warfare — ${army.name} failed to garrison.`});
  }
  scheduleSave(); render(); renderWarfareTab();
}
function openRecoverArmyPicker(armyId){
  const army = state.armies.find(a=>a.id===armyId);
  if(!army) return;
  const options = ['Heal 1 HP','Reduce shaken','Reduce weary','Reduce mired','Clear outflanked','Clear distant'];
  const overlay = document.createElement('div');
  overlay.id = 'warfare-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:400px;width:100%;margin:0;">
    <h3>Recover ${escapeHtml(army.name)}</h3>
    <div class="hint" style="margin-top:0;">${army.conditions.defeated ? 'This army is defeated — recovering it uses DC +5.' : ''}</div>
    ${options.map(o=>`<button type="button" class="option-card" onclick="closeWarfareOverlay();openDegreePicker('Recover Army — ${o}',d=>recoverArmyResolve('${armyId}','${o}',d))"><div class="opt-name">${o}</div></button>`).join('')}
    <button class="ghost" style="margin-top:8px;" onclick="closeWarfareOverlay()">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function recoverArmyResolve(armyId, choice, degree){
  const army = state.armies.find(a=>a.id===armyId);
  if(!army) return;
  markArmyActivityUsed(army);
  if(degree>=2){
    const maxHp = armyEffectiveMaxHp(army);
    if(choice==='Heal 1 HP') army.hp = Math.min(maxHp, army.hp + (degree===3?2:1));
    else if(choice==='Reduce shaken') army.conditions.shaken = Math.max(0, army.conditions.shaken-1);
    else if(choice==='Reduce weary') army.conditions.weary = Math.max(0, army.conditions.weary-1);
    else if(choice==='Reduce mired') army.conditions.mired = Math.max(0, army.conditions.mired-1);
    else if(choice==='Clear outflanked') army.conditions.outflanked = false;
    else if(choice==='Clear distant') army.conditions.distant = false;
    if(army.hp>0) army.conditions.defeated = false;
    state.log.unshift({turn:state.turn, note:`Warfare — ${army.name} recovered (${choice}).`});
  } else {
    state.log.unshift({turn:state.turn, note:`Warfare — ${army.name}'s Recover Army attempt failed (${choice}).`});
  }
  scheduleSave(); render(); renderWarfareTab();
}
function disbandArmy(armyId){
  const army = state.armies.find(a=>a.id===armyId);
  if(!army) return;
  if(!confirm(`Disband ${army.name}? This can't be undone — its gear is lost unless you've already noted where it's going.`)) return;
  const stats = armyStatsAtLevel(army.type, state.level);
  state.consumption = Math.max(0, state.consumption - stats.consumption);
  state.armies = state.armies.filter(a=>a.id!==armyId);
  state.log.unshift({turn:state.turn, note:`Warfare — Disbanded ${army.name}. Consumption −${stats.consumption}.`});
  scheduleSave(); render(); renderWarfareTab();
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
  const armiesByHex = {};
  state.armies.forEach(a=>{
    if(a.col===undefined || a.row===undefined) return;
    const k = hexKey(a.col,a.row);
    (armiesByHex[k] = armiesByHex[k]||[]).push(a);
  });
  Object.keys(armiesByHex).forEach(key=>{
    const [col,row] = key.split('_').map(Number);
    const [cx,cy] = hexCenter(col,row);
    const text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('x', (cx+HEX_S*0.5).toFixed(1));
    text.setAttribute('y', (cy-HEX_S*0.35).toFixed(1));
    text.setAttribute('class','hex-marker army-marker');
    const n = armiesByHex[key].length;
    text.textContent = '⚔' + (n>1 ? n : '');
    frag.appendChild(text);
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

const HEX_RESOURCE_PRESETS = ['Furs','Game','Herbs','Gems'];
const HEX_FEATURE_PRESETS = ['Ravine','Ruins','Cave','Sacred Site'];
function toggleHexCustomField(field){
  const sel = document.getElementById(`hex-${field}-select`);
  document.getElementById(`hex-${field}-custom-row`).style.display = sel.value==='__custom__' ? 'flex' : 'none';
}
// Old freeform text becomes the Custom… selection automatically — nothing is lost
// or silently blanked when a hex saved before this preset list existed is reopened.
function setHexPresetField(field, value){
  const presets = field==='resources' ? HEX_RESOURCE_PRESETS : HEX_FEATURE_PRESETS;
  const sel = document.getElementById(`hex-${field}-select`);
  const customRow = document.getElementById(`hex-${field}-custom-row`);
  const customInput = document.getElementById(`hex-${field}-custom`);
  if(value && !presets.includes(value)){
    sel.value = '__custom__';
    customRow.style.display = 'flex';
    customInput.value = value;
  } else {
    sel.value = value || '';
    customRow.style.display = 'none';
    customInput.value = '';
  }
}
function readHexPresetField(field){
  const sel = document.getElementById(`hex-${field}-select`);
  return sel.value==='__custom__' ? document.getElementById(`hex-${field}-custom`).value.trim() : sel.value;
}
function openHexPanel(col,row){
  activeHexKey = hexKey(col,row);
  const svg = document.getElementById('hexoverlay');
  if(svg){
    svg.querySelectorAll('.hex-cell.selected').forEach(p=>p.classList.remove('selected'));
    const poly = svg.querySelector(`[data-key="${activeHexKey}"]`);
    if(poly) poly.classList.add('selected');
  }
  const h = state.hexes[activeHexKey] || {name:'',type:'',note:'',resources:'',features:'',terrain:'',workSite:'',resourceFlag:false};
  document.getElementById('hex-panel-title').textContent = 'Hex '+hexLabel(col,row);
  document.getElementById('hex-name').value = h.name||'';
  document.getElementById('hex-type').value = h.type||'';
  document.getElementById('hex-note').value = h.note||'';
  document.getElementById('hex-terrain').value = h.terrain||'';
  document.getElementById('hex-isresource').checked = !!h.resourceFlag;
  setHexPresetField('resources', h.resources||'');
  setHexPresetField('features', h.features||'');
  document.getElementById('hex-worksite').value = h.workSite||'';
  renderWorkSiteOptions();
  document.getElementById('hex-panel').classList.add('open');
}
function closeHexPanel(){
  const svg = document.getElementById('hexoverlay');
  if(svg) svg.querySelectorAll('.hex-cell.selected').forEach(p=>p.classList.remove('selected'));
  activeHexKey = null;
  document.getElementById('hex-panel').classList.remove('open');
}
// Work Site is a picker (option-cards showing cost/DC), not a bare dropdown, and can be
// re-opened to change or clear an already-set site at any time — nothing here is one-shot.
function renderWorkSiteOptions(){
  const terrain = document.getElementById('hex-terrain').value;
  const current = document.getElementById('hex-worksite').value || 'None';
  const names = workSiteNamesForTerrain(terrain);
  const dc = currentControlDC();
  document.getElementById('hex-worksite-options').innerHTML = names.map(n=>{
    const isNone = n==='None';
    const cost = WORK_SITE_TERRAIN_RP_COST[terrain]||0;
    const detail = isNone
      ? 'Clears the Work Site on this hex. Already-spent RP is not refunded.'
      : `Engineering (untrained), basic check vs. Control DC ${dc}. Costs ${cost} RP to establish here (only charged if this isn't already the hex's Work Site).`;
    return `<button type="button" class="option-card ${current===n?'selected':''}" style="padding:9px 12px;margin-bottom:6px;" onclick="pickHexWorkSite('${n}')">
      <div class="opt-name" style="font-size:13px;">${n}</div>
      <div class="opt-detail">${detail}</div>
    </button>`;
  }).join('');
}
function pickHexWorkSite(name){
  document.getElementById('hex-worksite').value = name==='None' ? '' : name;
  renderWorkSiteOptions();
}
function onHexTerrainChange(){
  const names = workSiteNamesForTerrain(document.getElementById('hex-terrain').value);
  const current = document.getElementById('hex-worksite').value;
  if(current && !names.includes(current)) document.getElementById('hex-worksite').value = '';
  renderWorkSiteOptions();
}
function saveHex(){
  if(!activeHexKey) return;
  const name = document.getElementById('hex-name').value.trim();
  const type = document.getElementById('hex-type').value;
  const resources = readHexPresetField('resources');
  const features = readHexPresetField('features');
  const note = document.getElementById('hex-note').value.trim();
  const terrain = document.getElementById('hex-terrain').value;
  const workSite = document.getElementById('hex-worksite').value;
  const resourceFlag = document.getElementById('hex-isresource').checked;
  const oldWorkSite = (state.hexes[activeHexKey] && state.hexes[activeHexKey].workSite) || '';
  if(workSite && workSite!==oldWorkSite){
    const cost = WORK_SITE_TERRAIN_RP_COST[terrain]||0;
    if(state.rp < cost){
      alert(`Establishing a ${workSite} here costs ${cost} RP (${terrain||'no terrain set'}) — you only have ${state.rp} RP. Nothing was saved.`);
      return;
    }
    state.rp -= cost;
    if(cost) state.rpSpentThisTurn = (state.rpSpentThisTurn||0) + cost;
  }
  if(!name && !type && !note && !resources && !features && !terrain && !workSite && !resourceFlag){
    delete state.hexes[activeHexKey];
  } else {
    state.hexes[activeHexKey] = {name,type,note,resources,features,terrain,workSite,resourceFlag};
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
    .filter(e=>e.name || e.type || e.note || e.resources || e.features || e.terrain || e.workSite || e.resourceFlag)
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
    const tags = [e.terrain ? 'Terrain: '+e.terrain : '', e.workSite ? 'Work Site: '+e.workSite+(e.resourceFlag?' (Resource hex)':'') : '', e.resources ? 'Resources: '+e.resources : '', e.features ? 'Features: '+e.features : ''].filter(Boolean).join(' · ');
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

/* ---------- WARFARE TAB ---------- */
function renameArmy(id, name){
  const a = state.armies.find(x=>x.id===id);
  if(!a) return;
  a.name = name;
  scheduleSave();
}
function renderArmyCard(army){
  const stats = armyStatsAtLevel(army.type, state.level);
  const maxHp = armyEffectiveMaxHp(army);
  const rt = armyEffectiveRoutThreshold(army);
  const ac = stats.ac + armyGearAcBonus(army) - (army.conditions.weary||0) - (army.conditions.outflanked?2:0);
  const atk = stats.attack + armyGearAttackBonus(army);
  const locLabel = army.col!==undefined ? hexLabel(army.col,army.row) : null;
  const condParts = [];
  if(army.conditions.shaken) condParts.push(`Shaken ${army.conditions.shaken}`);
  if(army.conditions.weary) condParts.push(`Weary ${army.conditions.weary}`);
  if(army.conditions.mired) condParts.push(`Mired ${army.conditions.mired}`);
  if(army.conditions.outflanked) condParts.push('Outflanked');
  if(army.conditions.engaged) condParts.push('Engaged');
  if(army.conditions.distant) condParts.push('Distant');
  if(army.conditions.routed) condParts.push('Routed');
  if(army.conditions.defeated) condParts.push('Defeated');
  if(army.conditions.fortified) condParts.push('Fortified');
  if(army.conditions.efficient) condParts.push('Efficient');
  const belowRT = army.hp<=rt && army.hp>0;
  return `<div class="settlement">
    <div class="settlement-head">
      <input type="text" value="${escapeAttr(army.name)}" style="font-family:'Cinzel',serif;font-weight:600;background:none;border:none;font-size:16px;padding:0;flex:1;" onchange="renameArmy('${army.id}',this.value)">
      <span class="pill">${army.type} · Lv ${stats.level}</span>
    </div>
    <div class="settlement-loc">
      ${locLabel ? `<span class="loc-pin">⌖ ${locLabel}</span><button class="loc-link" onclick="jumpToHex(${army.col},${army.row})">view</button>` : `<span class="hint" style="margin:0;">Not deployed</span>`}
    </div>
    <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);margin:10px 0;">
      <div class="seal"><div class="val mono">${army.hp}/${maxHp}</div><div class="lbl">HP</div><div class="sub">RT ${rt}${infoIcon('Rout Threshold')}</div></div>
      <div class="seal"><div class="val mono">${ac}</div><div class="lbl">AC</div></div>
      <div class="seal"><div class="val mono">${fmt(stats.maneuver)}</div><div class="lbl">Maneuver${infoIcon('Maneuver')}</div></div>
      <div class="seal"><div class="val mono">${fmt(stats.morale)}</div><div class="lbl">Morale${infoIcon('Morale')}</div></div>
    </div>
    <div class="hint" style="margin-top:0;">Scouting ${fmt(stats.scouting)} · Attack ${fmt(atk)} (${stats.attackKind}) · Consumption ${stats.consumption}${belowRT?' · <span style="color:var(--rust);">at/below Rout Threshold</span>':''}</div>
    <div class="hint" style="margin-top:4px;">Tactics: ${army.tactics.length?escapeHtml(army.tactics.join(', ')):'none'}</div>
    <div class="hint" style="margin-top:2px;">Gear: ${army.gear.length?escapeHtml(army.gear.join(', ')):'none'}</div>
    ${condParts.length ? `<div class="ability-tags" style="margin-top:6px;">${condParts.map(c=>{
      const term = c.split(' ')[0];
      return INFO_TIPS[term] ? `<span class="ability-tag neg" style="cursor:pointer;" onclick="showInfoTip('${escapeAttr(term)}')">${escapeHtml(c)}</span>` : `<span class="ability-tag neg">${escapeHtml(c)}</span>`;
    }).join('')}</div>` : ''}
    <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
      <button class="small-ghost" ${armyActivityAvailable(army)?'':'style="opacity:.4;pointer-events:none;"'} onclick="openArmyActivityPicker('${army.id}')">${armyActivityAvailable(army)?'Army Activity':'Activity used'}</button>
      <button class="small-ghost" onclick="startPickArmyLocation('${army.id}')">Deploy</button>
    </div>
  </div>`;
}
function renderWarfareTab(){
  const el = document.getElementById('warfare-content');
  if(!el) return;
  el.innerHTML = `
    <div class="card">
      <h3>Armies <span class="sub">${state.armies.length}</span></h3>
      <div class="hint" style="margin-top:0;">Beta — full Kingmaker Warfare (Appendix 3). Same reference-and-log pattern as Structures: resolve the check at the table, then pick what happened.</div>
      <button class="action" onclick="openRecruitArmyPicker()">Recruit Army</button>
    </div>
    ${state.armies.length ? state.armies.map(renderArmyCard).join('') : '<div class="hint">No armies recruited yet.</div>'}
    <div class="card">
      <h3>War Encounter</h3>
      ${state.warEncounter ? renderWarEncounterCard() : `
        <div class="hint" style="margin-top:0;">Resolve a full round-by-round battle between armies on or near a hex — initiative, war actions, Morale/Rout, terrain and weather.</div>
        <button class="action" onclick="openStartWarEncounterPicker()">Start War Encounter</button>
      `}
    </div>`;
}
// War encounter setup/round engine — see openStartWarEncounterPicker below (built out
// alongside the rest of the battle resolver).
/* =====================================================================
   WAR ENCOUNTER RESOLVER — round structure per Rules.aspx?ID=1864: roll
   initiative, play a round (3 actions each, in initiative order), check
   for routs, next round, repeat until one side is fully routed/defeated,
   then resolve aftermath with a basic Warfare check. Combatants can be
   real armies (state.armies) or ad-hoc enemy stat blocks the GM enters
   for the encounter only — enemy forces aren't a persistent system here,
   the app's job is resolving the mechanical fight once both sides' stats
   are known, same as a GM would improvise them at the table.
===================================================================== */
function hexNeighbors(col,row){
  const evenRow = row%2===0;
  const d = evenRow ? [-1,0] : [0,1];
  return [[col-1,row],[col+1,row],[col+d[0],row-1],[col+d[1],row-1],[col+d[0],row+1],[col+d[1],row+1]];
}
function letterToCol(str){
  let n = 0;
  for(let i=0;i<str.length;i++) n = n*26 + (str.charCodeAt(i)-64);
  return n-1;
}
function parseHexLabel(label){
  const m = /^([A-Za-z]+)(\d+)$/.exec((label||'').trim());
  if(!m) return null;
  return {col: letterToCol(m[1].toUpperCase()), row: parseInt(m[2],10)-1};
}
function defaultEnemyCombatant(name, stats){
  return {id:newId(), name, ac:stats.ac, maneuver:stats.maneuver, morale:stats.morale, attack:stats.attack,
    scouting:stats.scouting, attackKind:stats.attackKind, maxHp:stats.maxHp, hp:stats.maxHp, rt:stats.rt,
    conditions: defaultArmyConditions(), tactics:[], rangedShotsUsed:0};
}
// Unified read for either a real army or an ad-hoc enemy combatant, with condition
// modifiers folded in — the single source of truth the whole battle engine reads from.
function encounterCombatantStats(c){
  let base, name, tactics, maxHp, rt, conditions, hp, rangedShotsUsed;
  if(c.ref==='army'){
    const army = state.armies.find(a=>a.id===c.armyId);
    const s = armyStatsAtLevel(army.type, state.level);
    base = {ac:s.ac+armyGearAcBonus(army), maneuver:s.maneuver, morale:s.morale, attack:s.attack+armyGearAttackBonus(army), scouting:s.scouting, attackKind:s.attackKind};
    name = army.name; tactics = army.tactics; maxHp = armyEffectiveMaxHp(army); rt = armyEffectiveRoutThreshold(army);
    conditions = army.conditions; hp = army.hp; rangedShotsUsed = army.rangedShotsUsed||0;
  } else {
    const e = c.enemy;
    base = {ac:e.ac, maneuver:e.maneuver, morale:e.morale, attack:e.attack, scouting:e.scouting, attackKind:e.attackKind};
    name = e.name; tactics = e.tactics||[]; maxHp = e.maxHp; rt = e.rt; conditions = e.conditions; hp = e.hp; rangedShotsUsed = e.rangedShotsUsed||0;
  }
  const weary = conditions.weary||0, mired = conditions.mired||0, shaken = conditions.shaken||0;
  const ac = base.ac - weary - mired - (conditions.outflanked?2:0) + (conditions.fortified?4:0) + (conditions.guarding?2:0);
  const maneuver = base.maneuver - weary - mired;
  const morale = base.morale - shaken - (conditions.routed?2:0) + (conditions.fortified?4:0);
  return {name, ac, maneuver, morale, attack:base.attack, scouting:base.scouting, attackKind:base.attackKind,
    maxHp, rt, hp, conditions, tactics, rangedShotsUsed};
}
function encounterApplyDamage(c, amt){
  if(!amt) return;
  if(c.ref==='army'){
    const army = state.armies.find(a=>a.id===c.armyId);
    army.hp = Math.max(0, army.hp-amt);
    if(army.hp<=0) army.conditions.defeated = true;
  } else {
    c.enemy.hp = Math.max(0, c.enemy.hp-amt);
    if(c.enemy.hp<=0) c.enemy.conditions.defeated = true;
  }
}
function encounterHeal(c, amt){
  if(!amt) return;
  if(c.ref==='army'){
    const army = state.armies.find(a=>a.id===c.armyId);
    army.hp = Math.min(armyEffectiveMaxHp(army), army.hp+amt);
    if(army.hp>0) army.conditions.defeated = false;
  } else {
    c.enemy.hp = Math.min(c.enemy.maxHp, c.enemy.hp+amt);
    if(c.enemy.hp>0) c.enemy.conditions.defeated = false;
  }
}
function encounterApplyCondition(c, condObj){
  const conditions = c.ref==='army' ? state.armies.find(a=>a.id===c.armyId).conditions : c.enemy.conditions;
  Object.entries(condObj).forEach(([k,v])=>{
    if(typeof v==='boolean') conditions[k] = v;
    else if(typeof v==='number') conditions[k] = Math.max(0, (conditions[k]||0)+v);
  });
}
function encounterIncRangedShots(c){
  if(c.ref==='army'){ const a = state.armies.find(x=>x.id===c.armyId); a.rangedShotsUsed = (a.rangedShotsUsed||0)+1; }
  else c.enemy.rangedShotsUsed = (c.enemy.rangedShotsUsed||0)+1;
}
function encounterModifier(checkType){
  const enc = state.warEncounter;
  let mod = 0;
  if(checkType==='maneuver' && enc.difficultTerrain) mod -= 2;
  if(checkType==='ranged' && enc.wind==='strong') mod -= 1;
  if(checkType==='ranged' && enc.wind==='storm') mod -= 2;
  if(checkType==='scouting' && enc.darkness) mod -= 4;
  return mod;
}
function actionCheckBonus(stats, checkType){
  if(checkType==='melee'||checkType==='ranged'||checkType==='attack') return stats.attack;
  if(checkType==='maneuver') return stats.maneuver;
  if(checkType==='morale') return stats.morale;
  if(checkType==='scouting') return stats.scouting;
  return 0;
}
function actionTargetDC(action, targetStats){
  if(action.vs==='ac' || action.vs==='fortAC') return targetStats.ac;
  if(action.vs==='maneuver') return targetStats.maneuver;
  if(action.vs==='morale') return targetStats.morale;
  if(action.vs==='flat') return action.dc;
  return 10;
}
const WAR_ACTION_TARGET_SIDE = {
  'Advance':'enemy','Battle':'enemy','Disengage':'enemy','Guard':'self','Rally':'self','Retreat':'none',
  'All-Out Assault':'enemy','Battlefield Medicine':'ally','Counterattack':'enemy','Covering Fire':'enemy',
  'Defensive Stance':'ally','Dirty Fighting':'enemy','False Retreat':'enemy','Feint':'enemy','Outflank':'enemy',
  'Overwhelming Bombardment':'enemy','Taunt':'enemy'
};

/* ---- setup ---- */
function openStartWarEncounterPicker(){
  const hexesWithArmies = [...new Set(state.armies.filter(a=>a.col!==undefined).map(a=>hexKey(a.col,a.row)))];
  const overlay = document.createElement('div');
  overlay.id = 'warfare-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <h3>Start War Encounter</h3>
    <div class="hint" style="margin-top:0;">Pick the hex where the battle happens. Your armies on that hex or adjacent to it join as Side A automatically.</div>
    ${hexesWithArmies.length ? hexesWithArmies.map(k=>{
      const [col,row] = k.split('_').map(Number);
      return `<button type="button" class="option-card" onclick="closeWarfareOverlay();beginWarEncounterSetup('${k}')">
        <div class="opt-name">${hexLabel(col,row)}</div>
        <div class="opt-detail">${escapeHtml(state.armies.filter(a=>a.col===col&&a.row===row).map(a=>a.name).join(', '))}</div>
      </button>`;
    }).join('') : '<div class="hint" style="margin-top:0;">No armies are deployed yet — deploy one first, or start at any hex below anyway.</div>'}
    <div class="hint" style="margin:10px 0 4px;">Or type a hex label (e.g. C5):</div>
    <input type="text" class="wide" id="war-hex-input" placeholder="e.g. C5">
    <button class="ghost" style="margin-top:6px;" onclick="const v=document.getElementById('war-hex-input').value.trim(); const p=parseHexLabel(v); if(p){closeWarfareOverlay();beginWarEncounterSetup(hexKey(p.col,p.row));} else alert('Type a hex label like C5.');">Use this hex</button>
    <button class="ghost" style="margin-top:8px;" onclick="closeWarfareOverlay()">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function beginWarEncounterSetup(hexKeyStr){
  const [col,row] = hexKeyStr.split('_').map(Number);
  const relevantKeys = [hexKeyStr, ...hexNeighbors(col,row).map(([c,r])=>hexKey(c,r))];
  const sideAArmies = state.armies.filter(a=>a.col!==undefined && relevantKeys.includes(hexKey(a.col,a.row)));
  state.warEncounter = {
    hexKey: hexKeyStr, round: 1, phase: 'setup',
    combatants: sideAArmies.map(a=>({side:'A', ref:'army', armyId:a.id, initiative:null, actionsLeft:3})),
    turnIndex: -1, difficultTerrain:false, wind:'none', darkness:false, log: [], winner: null
  };
  scheduleSave();
  renderWarfareTab();
}
function addEnemyCombatantPreset(type){
  const row = armyStatsAtLevel(type, state.level);
  const s = {ac:row.ac, maneuver:row.maneuver, morale:row.morale, attack:row.attack, scouting:row.scouting, attackKind:row.attackKind, maxHp:row.baseHp, rt:row.baseRt};
  const n = state.warEncounter.combatants.filter(c=>c.ref==='enemy').length+1;
  state.warEncounter.combatants.push({side:'B', ref:'enemy', enemy: defaultEnemyCombatant(`Enemy ${type} ${n}`, s), initiative:null, actionsLeft:3});
  scheduleSave(); renderWarfareTab();
}
function addEnemyCombatantCustom(){
  const name = document.getElementById('enemy-custom-name').value.trim() || 'Enemy force';
  const num = id => parseInt(document.getElementById(id).value,10)||0;
  const stats = {ac:num('enemy-custom-ac'), maneuver:num('enemy-custom-maneuver'), morale:num('enemy-custom-morale'),
    attack:num('enemy-custom-attack'), scouting:num('enemy-custom-scouting'), attackKind:document.getElementById('enemy-custom-kind').value,
    maxHp:Math.max(1,num('enemy-custom-hp')), rt:Math.max(1,Math.floor(Math.max(1,num('enemy-custom-hp'))/2))};
  state.warEncounter.combatants.push({side:'B', ref:'enemy', enemy: defaultEnemyCombatant(name, stats), initiative:null, actionsLeft:3});
  scheduleSave(); renderWarfareTab();
}
function removeEncounterCombatant(idx){
  state.warEncounter.combatants.splice(idx,1);
  scheduleSave(); renderWarfareTab();
}
function setEncounterFlag(field, value){
  state.warEncounter[field] = value;
  scheduleSave();
}
function startWarEncounterInitiative(){
  if(!state.warEncounter.combatants.some(c=>c.side==='A') || !state.warEncounter.combatants.some(c=>c.side==='B')){
    alert('Add at least one combatant to each side first.');
    return;
  }
  state.warEncounter.phase = 'initiative';
  scheduleSave();
  renderWarfareTab();
}
function confirmWarEncounterInitiative(){
  const combatants = state.warEncounter.combatants;
  combatants.forEach((c,i)=>{
    const roll = parseInt(document.getElementById(`init-roll-${i}`).value,10)||0;
    const s = encounterCombatantStats(c);
    c.initiative = roll + s.scouting + encounterModifier('scouting');
    c._tiebreak = s.scouting;
  });
  combatants.sort((a,b)=> b.initiative-a.initiative || b._tiebreak-a._tiebreak);
  combatants.forEach(c=>c.actionsLeft=3);
  state.warEncounter.phase = 'round';
  state.warEncounter.turnIndex = 0;
  state.warEncounter.log.unshift(`Round 1 begins. Initiative: ${combatants.map(c=>`${encounterCombatantStats(c).name} (${c.initiative})`).join(', ')}.`);
  scheduleSave();
  renderWarfareTab();
}
function cancelWarEncounter(){
  if(!confirm("Cancel this war encounter? Damage and conditions already applied will stick, but the battle stops here.")) return;
  state.warEncounter = null;
  scheduleSave();
  renderWarfareTab();
}

/* ---- round loop ---- */
let pendingWarAction = null; // {actionName, targetIndex}
function openWarActionPicker(){
  const enc = state.warEncounter;
  const actor = enc.combatants[enc.turnIndex];
  const stats = encounterCombatantStats(actor);
  const names = warActionsAvailableTo({tactics:stats.tactics}).filter(n=>{
    const a = WAR_ACTIONS[n];
    if(a.check==='ranged' && stats.rangedShotsUsed>=5) return false;
    return a.reaction || a.cost<=actor.actionsLeft;
  });
  const overlay = document.createElement('div');
  overlay.id = 'warfare-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <h3>${escapeHtml(stats.name)}'s turn</h3>
    <div class="hint" style="margin-top:0;">${actor.actionsLeft} action${actor.actionsLeft===1?'':'s'} left this turn.</div>
    <div style="margin-top:8px;max-height:55vh;overflow-y:auto;">
      ${names.map(n=>{
        const a = WAR_ACTIONS[n];
        return `<button type="button" class="option-card" onclick="closeWarfareOverlay();chooseWarAction('${escapeAttr(n)}')">
          <div class="opt-name">${escapeHtml(n)} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(${a.reaction?'reaction':a.cost+' action'+(a.cost>1?'s':'')})</span></div>
          <div class="opt-detail">${escapeHtml(a.text)}</div>
        </button>`;
      }).join('')}
    </div>
    <button class="ghost" style="margin-top:8px;" onclick="closeWarfareOverlay()">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function chooseWarAction(name){
  pendingWarAction = {actionName:name, targetIndex:null};
  const side = WAR_ACTION_TARGET_SIDE[name];
  if(side==='none' || side==='self') openWarActionRollInput();
  else openWarActionTargetPicker(side);
}
function openWarActionTargetPicker(side){
  const enc = state.warEncounter;
  const actor = enc.combatants[enc.turnIndex];
  const pool = enc.combatants.map((c,i)=>({c,i})).filter(({c,i})=> i!==enc.turnIndex && (side==='ally' ? c.side===actor.side : c.side!==actor.side) && !encounterCombatantStats(c).conditions.defeated);
  const overlay = document.createElement('div');
  overlay.id = 'warfare-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:400px;width:100%;margin:0;">
    <h3>Choose a target</h3>
    ${pool.length ? pool.map(({c,i})=>{
      const s = encounterCombatantStats(c);
      return `<button type="button" class="option-card" onclick="closeWarfareOverlay();pendingWarAction.targetIndex=${i};openWarActionRollInput();">
        <div class="opt-name">${escapeHtml(s.name)} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(HP ${s.hp}/${s.maxHp}, AC ${s.ac})</span></div>
      </button>`;
    }).join('') : '<div class="hint" style="margin-top:0;">No valid targets.</div>'}
    <button class="ghost" style="margin-top:8px;" onclick="pendingWarAction=null;closeWarfareOverlay()">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
function openWarActionRollInput(){
  const enc = state.warEncounter;
  const actor = enc.combatants[enc.turnIndex];
  const actorStats = encounterCombatantStats(actor);
  const action = WAR_ACTIONS[pendingWarAction.actionName];
  const targetC = pendingWarAction.targetIndex!=null ? enc.combatants[pendingWarAction.targetIndex] : null;
  const targetStats = targetC ? encounterCombatantStats(targetC) : null;
  const overlay = document.createElement('div');
  overlay.id = 'warfare-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  if(action.check==='none'){
    overlay.innerHTML = `<div class="card" style="max-width:360px;width:100%;margin:0;">
      <h3>${escapeHtml(pendingWarAction.actionName)}</h3>
      <div class="hint" style="margin-top:0;">No check needed.</div>
      <button class="action" onclick="closeWarfareOverlay();confirmWarActionRoll(3)">Confirm</button>
    </div>`;
  } else {
    const bonus = actionCheckBonus(actorStats, action.check) + encounterModifier(action.check);
    const dc = action.vs==='none' ? null : actionTargetDC(action, targetStats||actorStats);
    overlay.innerHTML = `<div class="card" style="max-width:360px;width:100%;margin:0;">
      <h3>${escapeHtml(pendingWarAction.actionName)}</h3>
      <div class="hint" style="margin-top:0;">${escapeHtml(actorStats.name)}'s bonus: ${fmt(bonus)}${dc!=null?`, vs. DC ${dc}`:''}. Roll a d20 and enter it:</div>
      <input class="num" type="number" min="1" max="20" id="war-action-roll" placeholder="d20 result">
      <button class="action" style="margin-top:8px;" onclick="const v=parseInt(document.getElementById('war-action-roll').value,10); if(!v||v<1||v>20){alert('Enter the d20 result (1-20).');return;} closeWarfareOverlay();confirmWarActionRoll(degreeOfSuccess(v,${bonus},${dc}));">Resolve</button>
    </div>`;
  }
  document.body.appendChild(overlay);
}
function confirmWarActionRoll(degree){
  const enc = state.warEncounter;
  const actor = enc.combatants[enc.turnIndex];
  const action = WAR_ACTIONS[pendingWarAction.actionName];
  const targetC = pendingWarAction.targetIndex!=null ? enc.combatants[pendingWarAction.targetIndex] : null;
  const outcome = action.outcomes[degree];
  const actorStats = encounterCombatantStats(actor);
  if(action.check==='ranged') encounterIncRangedShots(actor);
  if(outcome.dmg && targetC) encounterApplyDamage(targetC, outcome.dmg);
  if(outcome.healAlly && targetC) encounterHeal(targetC, outcome.healAlly);
  if(outcome.selfCond) encounterApplyCondition(actor, outcome.selfCond);
  if(outcome.targetCond && targetC) encounterApplyCondition(targetC, outcome.targetCond);
  if(outcome.allyCond && targetC) encounterApplyCondition(targetC, outcome.allyCond);
  const targetName = targetC ? encounterCombatantStats(targetC).name : null;
  enc.log.unshift(`${actorStats.name} used ${pendingWarAction.actionName}${targetName?' on '+targetName:''}: ${DEGREE_LABEL[degree]} — ${outcome.text}`);
  if(!action.reaction) actor.actionsLeft = Math.max(0, actor.actionsLeft - action.cost);
  pendingWarAction = null;
  scheduleSave();
  if(!checkWarEncounterEnded()){ render(); renderWarfareTab(); }
}
function endWarEncounterTurn(){
  const enc = state.warEncounter;
  if(checkWarEncounterEnded()) return;
  const nextIndex = enc.turnIndex+1;
  if(nextIndex>=enc.combatants.length){ beginRoutCheckPhase(); return; }
  enc.turnIndex = nextIndex;
  enc.combatants[nextIndex].actionsLeft = 3;
  scheduleSave();
  renderWarfareTab();
}

/* ---- check for routs (between rounds) ---- */
let routCheckQueue = [];
function beginRoutCheckPhase(){
  const enc = state.warEncounter;
  enc.phase = 'routCheck';
  routCheckQueue = [];
  enc.combatants.forEach((c,i)=>{
    const s = encounterCombatantStats(c);
    if(!s.conditions.defeated && !s.conditions.routed && s.hp<=s.rt) routCheckQueue.push(i);
  });
  scheduleSave();
  if(checkWarEncounterEnded()) return;
  renderWarfareTab();
}
function highestEnemyMorale(combatantIndex){
  const enc = state.warEncounter;
  const c = enc.combatants[combatantIndex];
  const enemies = enc.combatants.filter(x=>x.side!==c.side && !encounterCombatantStats(x).conditions.defeated);
  if(!enemies.length) return 10;
  return Math.max(...enemies.map(x=>encounterCombatantStats(x).morale));
}
function resolveRoutCheck(roll){
  const enc = state.warEncounter;
  const idx = routCheckQueue.shift();
  const c = enc.combatants[idx];
  const stats = encounterCombatantStats(c);
  const dc = highestEnemyMorale(idx);
  const degree = degreeOfSuccess(roll, stats.morale, dc);
  if(degree===1) encounterApplyCondition(c, {shaken:1});
  else if(degree===0) encounterApplyCondition(c, {routed:true});
  enc.log.unshift(`${stats.name} Morale check (DC ${dc}): ${DEGREE_LABEL[degree]}.`);
  scheduleSave();
  if(checkWarEncounterEnded()) return;
  renderWarfareTab();
}
function finishRoutCheckPhase(){
  const enc = state.warEncounter;
  if(checkWarEncounterEnded()) return;
  enc.round += 1;
  enc.turnIndex = 0;
  enc.combatants.forEach(c=>c.actionsLeft=3);
  enc.phase = 'round';
  enc.log.unshift(`Round ${enc.round} begins.`);
  scheduleSave();
  renderWarfareTab();
}

/* ---- end + aftermath ---- */
function checkWarEncounterEnded(){
  const enc = state.warEncounter;
  if(!enc || enc.phase==='ended') return enc && enc.phase==='ended';
  const alive = side => enc.combatants.some(c=>c.side===side && !encounterCombatantStats(c).conditions.defeated && !encounterCombatantStats(c).conditions.routed);
  const aAlive = alive('A'), bAlive = alive('B');
  if(!aAlive || !bAlive){
    enc.phase = 'ended';
    enc.winner = (!aAlive && !bAlive) ? 'draw' : (aAlive ? 'A' : 'B');
    enc.log.unshift(`Battle over — ${enc.winner==='draw' ? 'both sides routed or defeated' : 'Side '+enc.winner+' wins'}.`);
    scheduleSave();
    render();
    renderWarfareTab();
    return true;
  }
  return false;
}
function resolveWarEncounterAftermath(degree){
  const enc = state.warEncounter;
  const [col,row] = enc.hexKey.split('_').map(Number);
  const damagedArmies = enc.combatants.filter(c=>c.ref==='army').map(c=>state.armies.find(a=>a.id===c.armyId)).filter(a=>a && a.hp<armyEffectiveMaxHp(a));
  let note = `Warfare — War encounter at ${hexLabel(col,row)} ended (${enc.winner==='draw'?'draw':'Side '+enc.winner+' wins'}). Aftermath: ${DEGREE_LABEL[degree]}.`;
  if(degree>=2){ damagedArmies.forEach(a=>{ a.hp = Math.min(armyEffectiveMaxHp(a), a.hp+1); }); note += ' Restored 1 HP to each damaged army.'; }
  if(degree===3){ state.fame = Math.min(state.fameMax, state.fame+1); state.unrest = Math.max(0, state.unrest-1); note += ` +1 ${state.fameType}, Unrest −1.`; }
  if(degree===0){ damagedArmies.forEach(a=>{ a.conditions.weary += 1; }); note += ' Damaged armies gain weary +1.'; }
  state.log.unshift({turn:state.turn, note});
  state.warEncounter = null;
  scheduleSave();
  render();
  renderWarfareTab();
}

/* ---- render ---- */
function renderCombatantMiniStat(c, idx){
  const s = encounterCombatantStats(c);
  const isTurn = state.warEncounter.phase==='round' && state.warEncounter.turnIndex===idx;
  return `<div class="row" style="${isTurn?'border-left:3px solid var(--gold);padding-left:6px;':''}">
    <div class="label">${escapeHtml(s.name)} <small>Side ${c.side} · HP ${s.hp}/${s.maxHp} (RT ${s.rt}) · AC ${s.ac}</small></div>
    <div style="font-size:11px;color:var(--text-muted);text-align:right;">${[s.conditions.shaken?'Shaken '+s.conditions.shaken:'', s.conditions.weary?'Weary '+s.conditions.weary:'', s.conditions.outflanked?'Outflanked':'', s.conditions.routed?'Routed':'', s.conditions.defeated?'Defeated':''].filter(Boolean).join(', ')||'—'}</div>
  </div>`;
}
function renderWarEncounterCard(){
  const enc = state.warEncounter;
  const [col,row] = enc.hexKey.split('_').map(Number);
  if(enc.phase==='setup'){
    return `
      <div class="hint" style="margin-top:0;">Battle at ${hexLabel(col,row)}.</div>
      <div class="hint" style="margin:8px 0 4px;">Side A (yours)</div>
      ${enc.combatants.filter(c=>c.side==='A').length ? enc.combatants.map((c,i)=>c.side==='A'?renderCombatantMiniStat(c,i):'').join('') : '<div class="hint" style="margin-top:0;">No armies here.</div>'}
      <div class="hint" style="margin:8px 0 4px;">Side B (enemy)</div>
      ${enc.combatants.map((c,i)=>c.side==='B'?`<div style="display:flex;align-items:center;gap:6px;">${renderCombatantMiniStat(c,i)}<button class="loc-link" style="color:var(--rust);" onclick="removeEncounterCombatant(${i})">remove</button></div>`:'').join('') || '<div class="hint" style="margin-top:0;">Add at least one enemy.</div>'}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
        ${Object.keys(ARMY_TYPES).map(t=>`<button class="small-ghost" onclick="addEnemyCombatantPreset('${t}')">+ ${t}</button>`).join('')}
      </div>
      <div class="hint" style="margin:10px 0 4px;">Or a custom enemy:</div>
      <input type="text" class="wide" id="enemy-custom-name" placeholder="Name">
      <div class="two-col" style="margin-top:6px;">
        <div><div class="hint" style="margin-top:0;">AC</div><input class="num" type="number" id="enemy-custom-ac" value="15"></div>
        <div><div class="hint" style="margin-top:0;">HP</div><input class="num" type="number" id="enemy-custom-hp" value="4"></div>
      </div>
      <div class="two-col" style="margin-top:6px;">
        <div><div class="hint" style="margin-top:0;">Maneuver</div><input class="num" type="number" id="enemy-custom-maneuver" value="4"></div>
        <div><div class="hint" style="margin-top:0;">Morale</div><input class="num" type="number" id="enemy-custom-morale" value="10"></div>
      </div>
      <div class="two-col" style="margin-top:6px;">
        <div><div class="hint" style="margin-top:0;">Attack</div><input class="num" type="number" id="enemy-custom-attack" value="9"></div>
        <div><div class="hint" style="margin-top:0;">Scouting</div><input class="num" type="number" id="enemy-custom-scouting" value="7"></div>
      </div>
      <div class="hint" style="margin-top:0;">Attack kind</div>
      <select id="enemy-custom-kind"><option value="melee">Melee</option><option value="ranged">Ranged</option></select>
      <button class="ghost" style="margin-top:8px;" onclick="addEnemyCombatantCustom()">+ Add custom enemy</button>
      <div class="hint" style="margin:10px 0 4px;">Terrain &amp; weather</div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;"><input type="checkbox" onchange="setEncounterFlag('difficultTerrain',this.checked)"> Difficult terrain (−2 Maneuver)</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:4px;"><input type="checkbox" onchange="setEncounterFlag('darkness',this.checked)"> Darkness / heavy fog (−4 Scouting)</label>
      <select style="margin-top:6px;" onchange="setEncounterFlag('wind',this.value)">
        <option value="none">No wind</option><option value="strong">Strong wind (−1 ranged)</option><option value="storm">Windstorm (−2 ranged)</option>
      </select>
      <button class="action" style="margin-top:10px;" onclick="startWarEncounterInitiative()">Roll Initiative</button>
      <button class="ghost" style="margin-top:8px;" onclick="cancelWarEncounter()">Cancel Encounter</button>`;
  }
  if(enc.phase==='initiative'){
    return `
      <div class="hint" style="margin-top:0;">Each combatant rolls a Scouting check (d20 + Scouting) for initiative.</div>
      ${enc.combatants.map((c,i)=>{
        const s = encounterCombatantStats(c);
        return `<div class="row"><div class="label">${escapeHtml(s.name)}<small>Scouting ${fmt(s.scouting)}</small></div><input class="num" type="number" id="init-roll-${i}" placeholder="d20"></div>`;
      }).join('')}
      <button class="action" style="margin-top:8px;" onclick="confirmWarEncounterInitiative()">Confirm Initiative</button>
      <button class="ghost" style="margin-top:8px;" onclick="cancelWarEncounter()">Cancel Encounter</button>`;
  }
  if(enc.phase==='round'){
    const actor = enc.combatants[enc.turnIndex];
    const actorStats = encounterCombatantStats(actor);
    return `
      <div class="hint" style="margin-top:0;">Round ${enc.round} · ${escapeHtml(actorStats.name)}'s turn (${actor.actionsLeft} action${actor.actionsLeft===1?'':'s'} left)</div>
      ${enc.combatants.map((c,i)=>renderCombatantMiniStat(c,i)).join('')}
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
        <button class="action" style="width:auto;flex:1;" onclick="openWarActionPicker()">Take War Action</button>
        <button class="ghost" style="width:auto;flex:1;" onclick="endWarEncounterTurn()">End Turn</button>
      </div>
      <button class="ghost" style="margin-top:8px;" onclick="cancelWarEncounter()">Cancel Encounter</button>
      ${enc.log.length ? `<div class="divider"></div><div class="hint" style="margin-top:0;">Battle log</div>${enc.log.slice(0,10).map(l=>`<div class="hint" style="margin-top:4px;">${escapeHtml(l)}</div>`).join('')}` : ''}`;
  }
  if(enc.phase==='routCheck'){
    if(!routCheckQueue.length){
      return `<div class="hint" style="margin-top:0;">All Morale checks resolved.</div><button class="action" onclick="finishRoutCheckPhase()">Start Round ${enc.round+1}</button>`;
    }
    const idx = routCheckQueue[0];
    const c = enc.combatants[idx];
    const s = encounterCombatantStats(c);
    const dc = highestEnemyMorale(idx);
    return `
      <div class="hint" style="margin-top:0;">${escapeHtml(s.name)} is at or below its Rout Threshold (HP ${s.hp}/${s.maxHp}, RT ${s.rt}) — Morale check vs. DC ${dc} (highest enemy Morale).</div>
      <div class="hint" style="margin-top:0;">Morale bonus: ${fmt(s.morale)}.</div>
      <input class="num" type="number" min="1" max="20" id="rout-check-roll" placeholder="d20 result">
      <button class="action" style="margin-top:8px;" onclick="const v=parseInt(document.getElementById('rout-check-roll').value,10); if(!v||v<1||v>20){alert('Enter the d20 result (1-20).');return;} resolveRoutCheck(v);">Resolve</button>`;
  }
  if(enc.phase==='ended'){
    return `
      <div class="hint" style="margin-top:0;">Battle over — ${enc.winner==='draw'?'both sides routed or defeated.':'Side '+enc.winner+' wins.'}</div>
      <div class="hint" style="margin-top:0;">Resolve the aftermath with a basic Warfare check:</div>
      <button class="action" onclick="openWarEncounterAftermathPicker()">Resolve Aftermath</button>`;
  }
  return '';
}
function openWarEncounterAftermathPicker(){
  openDegreePicker('Resolve the battle aftermath (Warfare check)', d=>resolveWarEncounterAftermath(d));
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
