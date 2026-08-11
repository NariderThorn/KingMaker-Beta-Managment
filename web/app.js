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
function buildableStructuresFor(emptyLotsInBlock){
  return KM_STRUCTURES.filter(st=> st.construction && st.lots!=null && st.lots<=emptyLotsInBlock && st.level<=state.level);
}
function structureCategoryClass(def){
  const cats = (def && def.category) || [];
  if(cats.includes('Edifice')) return 'cat-blue';
  if(cats.includes('Residential')) return 'cat-green';
  return 'cat-gold';
}

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
function hexConsumptionReduction(){
  let total = 0;
  Object.values(state.hexes).forEach(h=>{
    if(!h || !h.workSite) return;
    const def = HEX_WORK_SITES[h.workSite];
    if(def && def.consumptionReduction) total += def.consumptionReduction;
  });
  return total;
}
// Consumption owed this turn — base tracked value minus live reductions (Stockyard
// structures, Farmland hexes), floored at 0. See the Upkeep wizard's Consumption step.
function effectiveConsumptionOwed(){
  return Math.max(0, state.consumption - structureConsumptionBonus() - hexConsumptionReduction());
}

/* =====================================================================
   STATE
===================================================================== */
let state = null;
const DEFAULT_STATE = () => ({
  started:false,
  name:'Unnamed Realm', playerCharacter:'', level:1, xp:0, size:1, unrest:0, consumption:0, turn:1,
  fameType:'Fame', fame:0, fameMax:3, rp:0, turnUpkeep:null,
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
      <div class="seal"><div class="val mono">${state.rp}</div><div class="lbl">RP</div><div class="sub">${sz.die}×${diceCount}${featResourceDieBonus()?`+${featResourceDieBonus()}`:''}/turn</div></div>
      <div class="seal"><div class="val mono">${state.unrest}</div><div class="lbl">Unrest</div><div class="sub">${unrestPenalty(state.unrest)<0?fmt(unrestPenalty(state.unrest))+' checks':'no penalty'}</div></div>
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
      <div class="card-head-row"><h3 style="margin-bottom:0;">Upkeep</h3>${state.turnUpkeep ? `<span class="pill" style="color:var(--gold);border-color:var(--gold-dim);">step ${state.turnUpkeep.step+1} of 5</span>` : ''}</div>
      <div class="hint" style="margin-top:0;">Walks through Fame, Ruin, Resource Dice, Work Site production, and Consumption for this turn. You can close it partway through and resume later — nothing is lost.</div>
      <button class="action" onclick="openTurnUpkeepWizard()">${state.turnUpkeep ? 'Resume Process Turn' : 'Process Turn'}</button>
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
// Work Site commodity collection now happens inside the guided Upkeep wizard
// (openTurnUpkeepWizard, step 4) alongside Ruin/Resource-Dice/Consumption, matching
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
   TURN UPKEEP WIZARD — guided walkthrough of the Upkeep Phase only
   (2e.aonprd.com/Rules.aspx?ID=1795); Commerce/Activity/Event phases are
   separate future work. Doesn't replace the manual turn stepper — this is
   the primary way to advance a turn, alongside it. Progress is persisted
   in state.turnUpkeep so closing partway through and resuming later (or
   skipping a step whose roll hasn't happened at the table yet) both work.
===================================================================== */
const UPKEEP_STEPS = ['fame','ruin','resourceDice','workSites','consumption'];
function openTurnUpkeepWizard(){
  if(!state.turnUpkeep) state.turnUpkeep = {step:0, fame:null, ruin:null, resourceDice:null, workSites:null, consumption:null};
  renderTurnUpkeepWizard();
}
function closeTurnUpkeepWizard(){
  const el = document.getElementById('upkeep-overlay');
  if(el) el.remove();
  scheduleSave();
  render();
}
function upkeepGoToStep(n){
  state.turnUpkeep.step = Math.max(0, Math.min(4, n));
  scheduleSave();
  renderTurnUpkeepWizard();
}
function upkeepSkipStep(){
  const key = UPKEEP_STEPS[state.turnUpkeep.step];
  state.turnUpkeep[key] = {skipped:true};
  if(state.turnUpkeep.step>=4) finishTurnUpkeep();
  else upkeepGoToStep(state.turnUpkeep.step+1);
}
function upkeepNav(canSkip){
  const u = state.turnUpkeep;
  return `<div class="creation-nav" style="margin-top:14px;flex-wrap:wrap;gap:8px;">
    <button class="ghost" style="flex:0 0 100%;" onclick="closeTurnUpkeepWizard()">Close for now (resume later)</button>
    ${u.step>0 ? `<button class="ghost" onclick="upkeepGoToStep(${u.step-1})">Back</button>` : ''}
    ${canSkip ? `<button class="ghost" onclick="upkeepSkipStep()">Skip for now</button>` : ''}
    ${u.step<4 ? `<button class="action" onclick="upkeepGoToStep(${u.step+1})">Next</button>` : `<button class="action" onclick="finishTurnUpkeep()">Finish &amp; log turn</button>`}
  </div>`;
}
function renderTurnUpkeepWizard(){
  const u = state.turnUpkeep;
  if(!u) return;
  let overlay = document.getElementById('upkeep-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'upkeep-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
    document.body.appendChild(overlay);
  }
  const stepKey = UPKEEP_STEPS[u.step];
  const renderers = {fame:renderUpkeepFameStep, ruin:renderUpkeepRuinStep, resourceDice:renderUpkeepResourceDiceStep, workSites:renderUpkeepWorkSitesStep, consumption:renderUpkeepConsumptionStep};
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <div class="hint" style="margin-top:0;">Turn ${state.turn} Upkeep — step ${u.step+1} of 5</div>
    ${renderers[stepKey]()}
  </div>`;
}

/* ---- step 1: Fame/Infamy ---- */
function renderUpkeepFameStep(){
  const u = state.turnUpkeep;
  if(u.fame){
    return `<h3>1. ${state.fameType}</h3><div class="hint" style="margin-top:0;">Applied: +${u.fame.amount} ${state.fameType} (now ${state.fame}).</div>${upkeepNav(false)}`;
  }
  return `<h3>1. ${state.fameType}</h3>
    <div class="hint" style="margin-top:0;">Automatic: your kingdom gains +1 ${state.fameType}, capped at ${state.fameMax}.</div>
    <button class="action" onclick="applyUpkeepFame()">Apply +1 ${state.fameType}</button>
    ${upkeepNav(true)}`;
}
function applyUpkeepFame(){
  state.fame = Math.min(state.fameMax, state.fame+1);
  state.turnUpkeep.fame = {applied:true, amount:1};
  scheduleSave();
  renderTurnUpkeepWizard();
}

/* ---- step 2: Ruin — only triggers at Unrest 10+: 1d10 distributed among the four
   Ruins, then a DC 11 flat check; failure loses a hex (GM/player choice which one,
   resolved on the Map tab — not auto-selected here). ---- */
let upkeepRuinPending = null;
function renderUpkeepRuinStep(){
  const u = state.turnUpkeep;
  if(u.ruin){
    let detail;
    if(u.ruin.skipped) detail = 'Skipped for now.';
    else if(u.ruin.triggered===false) detail = 'Not triggered — Unrest was below 10.';
    else{
      const dist = Object.entries(u.ruin.distributed).filter(([,v])=>v).map(([k,v])=>`${k} +${v}`).join(', ')||'none';
      detail = `Gained ${u.ruin.rolled} Ruin (${dist}). DC 11 flat check rolled ${u.ruin.checkRoll} — ${u.ruin.hexLost?'failed, a hex was lost (remove it on the Map tab)':'succeeded'}.`;
    }
    return `<h3>2. Ruin</h3><div class="hint" style="margin-top:0;">${detail}</div>${upkeepNav(false)}`;
  }
  if(state.unrest<10){
    return `<h3>2. Ruin</h3>
      <div class="hint" style="margin-top:0;">Not triggered this turn — Ruin only accumulates when Unrest is 10 or higher (currently ${state.unrest}).</div>
      <button class="action" onclick="applyUpkeepRuinNotTriggered()">Continue</button>
      ${upkeepNav(false)}`;
  }
  return `<h3>2. Ruin</h3>
    <div class="hint" style="margin-top:0;">Unrest is ${state.unrest} (10+) — the kingdom gains 1d10 Ruin. Roll it and enter the result:</div>
    <input class="num" type="number" id="upkeep-ruin-roll" min="1" max="10" placeholder="1d10 result">
    <button class="action" style="margin-top:8px;" onclick="upkeepRuinRolled()">Confirm roll</button>
    ${upkeepNav(true)}`;
}
function applyUpkeepRuinNotTriggered(){
  state.turnUpkeep.ruin = {applied:true, triggered:false};
  scheduleSave();
  renderTurnUpkeepWizard();
}
function upkeepRuinRolled(){
  const v = parseInt(document.getElementById('upkeep-ruin-roll').value,10);
  if(!v || v<1 || v>10){ alert('Enter the 1d10 result (1-10).'); return; }
  upkeepRuinPending = {rolled:v};
  const overlay = document.getElementById('upkeep-overlay');
  overlay.querySelector('.card').innerHTML = `
    <div class="hint" style="margin-top:0;">Turn ${state.turn} Upkeep — step 2 of 5</div>
    <h3>2. Ruin — distribute ${v} point${v>1?'s':''}</h3>
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
    <div class="hint" style="margin-top:0;">Turn ${state.turn} Upkeep — step 2 of 5</div>
    <h3>2. Ruin — DC 11 flat check</h3>
    <div class="hint" style="margin-top:0;">Roll a flat check (d20, no modifiers) against DC 11. Failure loses one hex.</div>
    <input class="num" type="number" id="upkeep-ruin-check" min="1" max="20" placeholder="d20 result">
    <button class="action" style="margin-top:8px;" onclick="confirmUpkeepRuinCheck()">Confirm roll</button>`;
}
function confirmUpkeepRuinCheck(){
  const roll = parseInt(document.getElementById('upkeep-ruin-check').value,10);
  if(!roll || roll<1 || roll>20){ alert('Enter the d20 result (1-20).'); return; }
  const hexLost = roll<11;
  state.turnUpkeep.ruin = {applied:true, triggered:true, rolled:upkeepRuinPending.rolled, distributed:upkeepRuinPending.distributed, checkRoll:roll, hexLost};
  upkeepRuinPending = null;
  scheduleSave();
  if(hexLost) alert('The flat check failed — the kingdom loses one hex. Choose which one and remove it from the Map tab.');
  upkeepGoToStep(state.turnUpkeep.step+1);
}

/* ---- step 3: Resource Dice -> RP (a real roll the app only used to label before) ---- */
function renderUpkeepResourceDiceStep(){
  const u = state.turnUpkeep;
  if(u.resourceDice){
    const detail = u.resourceDice.skipped ? 'Skipped for now.' : `Rolled ${u.resourceDice.rolled} — added to RP (now ${state.rp}).`;
    return `<h3>3. Resource Dice</h3><div class="hint" style="margin-top:0;">${detail}</div>${upkeepNav(false)}`;
  }
  const sz = sizeRow(state.size);
  const diceCount = state.level + 4 + featResourceDieBonus();
  return `<h3>3. Resource Dice</h3>
    <div class="hint" style="margin-top:0;">Roll ${sz.die}×${diceCount} and enter the total — it's added to your RP balance (currently ${state.rp}).</div>
    <input class="num" type="number" min="0" id="upkeep-rd-roll" placeholder="Rolled total">
    <button class="action" style="margin-top:8px;" onclick="confirmUpkeepResourceDice()">Add to RP</button>
    ${upkeepNav(true)}`;
}
function confirmUpkeepResourceDice(){
  const v = parseInt(document.getElementById('upkeep-rd-roll').value,10);
  if(isNaN(v) || v<0){ alert('Enter the rolled total.'); return; }
  state.rp += v;
  state.turnUpkeep.resourceDice = {applied:true, rolled:v};
  scheduleSave();
  renderTurnUpkeepWizard();
}

/* ---- step 4: Work Site commodities — flat and automatic, not a roll ---- */
function collectWorkSiteYields(){
  const gains = {};
  Object.values(state.hexes).forEach(h=>{
    if(!h || !h.workSite) return;
    const def = HEX_WORK_SITES[h.workSite];
    if(!def || !def.good) return;
    const yieldAmt = h.resourceFlag ? 2 : 1;
    const before = state.goods[def.good];
    state.goods[def.good] = addWithCap(before, yieldAmt, goodStorageCap(def.good));
    gains[def.good] = (gains[def.good]||0) + (state.goods[def.good]-before);
  });
  return gains;
}
function renderUpkeepWorkSitesStep(){
  const u = state.turnUpkeep;
  if(u.workSites){
    if(u.workSites.skipped) return `<h3>4. Work Site commodities</h3><div class="hint" style="margin-top:0;">Skipped for now.</div>${upkeepNav(false)}`;
    const parts = Object.keys(u.workSites.summary).filter(k=>u.workSites.summary[k]>0).map(k=>`+${u.workSites.summary[k]} ${k}`);
    return `<h3>4. Work Site commodities</h3><div class="hint" style="margin-top:0;">${parts.length?parts.join(', '):'No Work Sites produced anything (check storage caps and hex assignments).'}</div>${upkeepNav(false)}`;
  }
  const activeCount = Object.values(state.hexes).filter(h=>h&&h.workSite).length;
  return `<h3>4. Work Site commodities</h3>
    <div class="hint" style="margin-top:0;">Automatic — ${activeCount} active Work Site${activeCount===1?'':'s'}, each adding 1 commodity (2 if flagged as a Resource hex), capped at storage.</div>
    <button class="action" onclick="applyUpkeepWorkSites()">Collect</button>
    ${upkeepNav(true)}`;
}
function applyUpkeepWorkSites(){
  state.turnUpkeep.workSites = {applied:true, summary:collectWorkSiteYields()};
  scheduleSave();
  renderTurnUpkeepWizard();
}

/* ---- step 5: Consumption — paid from Food; shortfall costs 5 RP/point or +1d4 Unrest ---- */
function renderUpkeepConsumptionStep(){
  const u = state.turnUpkeep;
  if(u.consumption){
    if(u.consumption.skipped) return `<h3>5. Consumption</h3><div class="hint" style="margin-top:0;">Skipped for now.</div>${upkeepNav(false)}`;
    const c = u.consumption;
    let detail = `Owed ${c.owed} Food, paid ${c.paidFromFood} from stockpile.`;
    if(c.shortfall) detail += c.choice==='rp' ? ` Spent ${c.shortfall*5} RP for the ${c.shortfall} unpaid.` : ` Gained ${c.unrestGain} Unrest for the ${c.shortfall} unpaid.`;
    return `<h3>5. Consumption</h3><div class="hint" style="margin-top:0;">${detail}</div>${upkeepNav(false)}`;
  }
  const owed = effectiveConsumptionOwed();
  const available = state.goods.Food;
  const shortfall = Math.max(0, owed-available);
  if(shortfall===0){
    return `<h3>5. Consumption</h3>
      <div class="hint" style="margin-top:0;">Owed ${owed} Food (base ${state.consumption}, reduced by storage-bonus structures and Farmland hexes). You have ${available} — fully covered.</div>
      <button class="action" onclick="applyUpkeepConsumption(${owed},${owed},0,null,0)">Pay ${owed} Food</button>
      ${upkeepNav(true)}`;
  }
  return `<h3>5. Consumption</h3>
    <div class="hint" style="margin-top:0;">Owed ${owed} Food, you have ${available} — a shortfall of ${shortfall}. Per the rules, for the unpaid amount you either spend 5 RP per point or increase Unrest by 1d4 (not per point — one roll covers the whole shortfall).</div>
    <button class="ghost" ${state.rp<shortfall*5?'style="opacity:.45;pointer-events:none;"':''} onclick="chooseUpkeepConsumptionShortfall(${owed},${available},${shortfall})">Spend ${shortfall*5} RP (have ${state.rp})</button>
    <div class="hint" style="margin:10px 0 4px;">Or roll 1d4 and add it to Unrest:</div>
    <input class="num" type="number" min="1" max="4" id="upkeep-consumption-unrest-roll" placeholder="1d4 result">
    <button class="ghost" style="margin-top:6px;" onclick="chooseUpkeepConsumptionShortfallUnrest(${owed},${available},${shortfall})">Add to Unrest</button>
    ${upkeepNav(true)}`;
}
function applyUpkeepConsumption(owed, paidFromFood, shortfall, choice, extra){
  state.goods.Food = Math.max(0, state.goods.Food - paidFromFood);
  state.turnUpkeep.consumption = {applied:true, owed, paidFromFood, shortfall, choice, unrestGain:choice==='unrest'?extra:0};
  scheduleSave();
  renderTurnUpkeepWizard();
}
function chooseUpkeepConsumptionShortfall(owed, available, shortfall){
  const cost = shortfall*5;
  if(state.rp<cost){ alert('Not enough RP.'); return; }
  state.rp -= cost;
  applyUpkeepConsumption(owed, available, shortfall, 'rp', 0);
}
function chooseUpkeepConsumptionShortfallUnrest(owed, available, shortfall){
  const roll = parseInt(document.getElementById('upkeep-consumption-unrest-roll').value,10);
  if(!roll || roll<1 || roll>4){ alert('Enter the 1d4 result (1-4).'); return; }
  state.unrest += roll;
  applyUpkeepConsumption(owed, available, shortfall, 'unrest', roll);
}

function finishTurnUpkeep(){
  const u = state.turnUpkeep;
  const lines = [];
  if(u.fame) lines.push(`${state.fameType} +${u.fame.amount}`);
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
  state.turnUpkeep = null;
  closeTurnUpkeepWizard();
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
function openLotPicker(sid, gridNum, blockIdx){
  const s = state.settlements.find(x=>x.id===sid);
  if(!s) return;
  const block = lotsForGrid(s, gridNum)[blockIdx];
  const emptyCount = block.filter(v=>!v).length;
  const options = buildableStructuresFor(emptyCount);
  const overlay = document.createElement('div');
  overlay.id = 'lot-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <h3>Build in ${escapeHtml(s.name)}</h3>
    <div class="hint" style="margin-top:0;">This block has ${emptyCount} open lot${emptyCount===1?'':'s'}. RP balance: ${state.rp}. Structures that fit:</div>
    <div style="margin-top:8px;max-height:55vh;overflow-y:auto;">
      ${options.length ? options.map(st=>{
        const problem = affordabilityMessage(st.cost);
        return `<button type="button" class="option-card" ${problem?'style="opacity:.45;pointer-events:none;"':''} onclick="placeStructureInLot(${sid},${gridNum},${blockIdx},'${escapeAttr(st.name)}')">
          <div class="opt-name">${escapeHtml(st.name)} <span style="color:var(--text-muted);font-weight:400;font-size:12px;">(${st.lots} lot${st.lots>1?'s':''} · ${formatCost(st.cost)})</span></div>
          <div class="opt-detail">${escapeHtml(st.effect)}${problem?` — <span style="color:var(--rust);">${escapeHtml(problem)}</span>`:''}</div>
        </button>`;
      }).join('') : `<div class="hint" style="margin-top:0;">Nothing fits here yet — needs more open lots in this block, or a higher kingdom level.</div>`}
    </div>
    <button class="ghost" style="margin-top:8px;" onclick="closeLotOverlay()">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
}
// Unlike skill-check DCs (resolved at the table), RP/commodity cost is pure arithmetic,
// so it's enforced here rather than just displayed.
function formatCost(cost){
  const parts = [];
  if(cost.rp) parts.push(cost.rp+' RP');
  GOODS.forEach(g=>{ const k=g.toLowerCase(); if(cost[k]) parts.push(cost[k]+' '+g); });
  return parts.length ? parts.join(', ') : 'free';
}
function affordabilityMessage(cost){
  const rpCost = cost.rp||0;
  if(state.rp < rpCost) return `Not enough RP — this costs ${rpCost} RP, you have ${state.rp}.`;
  const short = [];
  GOODS.forEach(g=>{ const k=g.toLowerCase(); const need=cost[k]||0; if(need>state.goods[g]) short.push(`${need} ${g} (have ${state.goods[g]})`); });
  return short.length ? `Not enough commodities — needs ${short.join(', ')}.` : null;
}
function spendResources(cost){
  state.rp = Math.max(0, state.rp - (cost.rp||0));
  GOODS.forEach(g=>{ const k=g.toLowerCase(); const need=cost[k]||0; if(need) state.goods[g] = Math.max(0, state.goods[g]-need); });
}
let pendingStructurePlacement = null; // {sid,gridNum,blockIdx,structureName,emptyIdxs} while a Tenement-style ruin choice is open
function placeStructureInLot(sid, gridNum, blockIdx, structureName){
  const s = state.settlements.find(x=>x.id===sid);
  if(!s) return;
  const st = KM_STRUCTURES.find(x=>x.name===structureName);
  if(!st || st.lots==null) return;
  const block = lotsForGrid(s, gridNum)[blockIdx];
  const emptyIdxs = block.map((v,i)=>v?-1:i).filter(i=>i!==-1);
  if(emptyIdxs.length < st.lots) return;
  const problem = affordabilityMessage(st.cost);
  if(problem){ alert(problem); return; }
  if(st.ruin && /of your choice/i.test(st.ruin)){
    pendingStructurePlacement = {sid, gridNum, blockIdx, structureName, emptyIdxs};
    openRuinChoicePopup();
    return;
  }
  finishPlaceStructure(sid, gridNum, blockIdx, structureName, emptyIdxs, null);
}
function finishPlaceStructure(sid, gridNum, blockIdx, structureName, emptyIdxs, ruinChoice){
  const s = state.settlements.find(x=>x.id===sid);
  const st = KM_STRUCTURES.find(x=>x.name===structureName);
  if(!s || !st) return;
  spendResources(st.cost);
  const block = lotsForGrid(s, gridNum)[blockIdx];
  const g = 'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  for(let i=0;i<st.lots;i++){
    const slot = {name:structureName, g};
    if(ruinChoice) slot.ruinChoice = ruinChoice;
    block[emptyIdxs[i]] = slot;
  }
  closeLotOverlay();
  scheduleSave();
  renderNotesTab();
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
  const {sid, gridNum, blockIdx, structureName, emptyIdxs} = pendingStructurePlacement;
  pendingStructurePlacement = null;
  finishPlaceStructure(sid, gridNum, blockIdx, structureName, emptyIdxs, ruinName);
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
    .map(n=>KM_STRUCTURES.find(x=>x.name===n)).filter(u=>u && u.level<=state.level);
  const overlay = document.createElement('div');
  overlay.id = 'lot-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:440px;width:100%;max-height:85vh;overflow-y:auto;margin:0;">
    <h3>${escapeHtml(slot.name)}</h3>
    ${def ? `<div class="hint" style="margin-top:0;">${escapeHtml(def.effect)}</div>` : ''}
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
    <button class="ghost danger-ghost" style="margin-top:10px;" onclick="removeStructureGroup(${sid},${gridNum},'${groupId}');closeLotOverlay();">Remove <span style="opacity:.7;">(RP/commodities already spent aren't refunded)</span></button>
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
  if(problem){ alert(problem); return; }
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
  state.hexes[key] = {name: state.name, type:'Capital', note: existing.note||'', resources: existing.resources||'', features: existing.features||'', terrain: existing.terrain||'', workSite: existing.workSite||'', resourceFlag: existing.resourceFlag||false};
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
