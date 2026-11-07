/* =====================================================================
   KINGDOM LEDGER — rules v2 (simplified homebrew Kingmaker rules)
   ---------------------------------------------------------------------
   Every rule number in this file comes from the group's own rules sheet
   ("killeme" PDF). Where that sheet is ambiguous, the choice made here is
   marked "ASSUMPTION" so it's easy to find and change in one place.
===================================================================== */
const RULES_VERSION = 2;

/* ---------- Virtues & Flaws — six pairs. A check subtracts the opposing flaw. ---------- */
const VIRTUES = ['Culture','Economy','Stability','Loyalty','Education','Might'];
const FLAW_OF = {Culture:'Decay', Economy:'Mismanagement', Stability:'Strife', Loyalty:'Corruption', Education:'Superstition', Might:'Weakness'};
const FLAWS = VIRTUES.map(v=>FLAW_OF[v]);
const VIRTUE_OF = Object.fromEntries(VIRTUES.map(v=>[FLAW_OF[v], v]));
const VIRTUE_SHORT = {Culture:'CULT', Economy:'ECON', Stability:'STA', Loyalty:'LO', Education:'EDU', Might:'MI'};
const TRAIT_BLURB = {
  Culture:'Art, tradition and community zeal.',
  Decay:'Stagnation and a disinterest in community.',
  Economy:'Monetary strength and savvy.',
  Mismanagement:'Economic dysfunction.',
  Stability:'Infrastructure, safety and trust that society protects its citizens.',
  Strife:'Fear, failing safety systems, war and famine.',
  Loyalty:'Patriotism, spy assets and the collective effort to build a nation.',
  Corruption:'Corruption, enemy spies and selfish, destructive lords.',
  Education:'Knowledge, science and literacy.',
  Superstition:'Witch hunts, misinformation and illiteracy.',
  Might:'Military might and strategic advantage.',
  Weakness:'Military disorganization and strategic fumbles.'
};

/* ---------- Resources — Gold replaces RP; four commodities ---------- */
const COMMODITIES = ['Food','Lumber','Ore','Luxuries'];
const RES_ICON = {Gold:'◎', Food:'●', Lumber:'▲', Ore:'■', Luxuries:'✦'};
const RES_SHORT = {Gold:'G', Food:'Food', Lumber:'Lum', Ore:'Ore', Luxuries:'Lux'};
// Which hex buildings produce which commodity, and where they can stand.
const RESOURCE_BUILDINGS = {
  Farmland:   {good:'Food',   terrains:['Hill','Plains']},
  Lumberyard: {good:'Lumber', terrains:['Forest','Swamp']},
  Mine:       {good:'Ore',    terrains:['Mountain','Ruins']}
};
const BUILDING_FOR_GOOD = {Food:'Farmland', Lumber:'Lumberyard', Ore:'Mine'};
const TERRAINS = ['Forest','Hill','Mountain','Plains','Swamp','Water','Ruins'];

/* ---------- Creation ---------- */
const CHARTERS = {
  Conquest:    {blurb:'Restov offers soldiers. It demands war.', mods:{Loyalty:2, Might:2, Decay:2}},
  Expansion:   {blurb:'Depend on Restov. Be its ally. Die with it.', mods:{Culture:2, Stability:2, Mismanagement:2}},
  Exploration: {blurb:'Scout the wilderness. Settle it for Restov.', mods:{Culture:2, Education:2, Strife:2}},
  Grant:       {blurb:'Restov funds you. Its citizens always watch you.', mods:{Economy:2, Stability:2, Corruption:2}},
  Open:        {blurb:'You are given nothing. You are alone.', mods:{}, freeVirtue:true}
};
const HEARTLANDS = {
  'Forest or Swamp':   {virtue:'Culture',   advantage:'Lumber',   blurb:'Your people are imaginative, filled with a good attitude.', terrains:['Forest','Swamp']},
  'Hill or Plain':     {virtue:'Loyalty',   advantage:'Food',     blurb:'Your people trust in your ability to ease their suffering.', terrains:['Hill','Plains']},
  'Lake or River':     {virtue:'Economy',   advantage:'Luxuries', blurb:'Merchants and travelers swarm your lands.', terrains:['Water']},
  'Mountain or Ruins': {virtue:'Stability', advantage:'Ore',      blurb:'Your people are healthy, tough and stubborn.', terrains:['Mountain','Ruins']}
};
const GOVERNMENTS = {
  Despotism:   {blurb:'You are a dictator.', mods:{Stability:2, Decay:2}},
  Feudalism:   {blurb:'You reign over Lords who own Serfs.', mods:{Economy:2, Strife:2}},
  Oligarchy:   {blurb:'A council of influential leaders.', mods:{Might:2, Mismanagement:2}},
  Republic:    {blurb:'Your people vote and elect.', mods:{Culture:2, Corruption:2}},
  Thaumocracy: {blurb:'Mages or Priests govern.', mods:{Education:2, Weakness:2}},
  Yeomancy:    {blurb:'Your land has no central government.', mods:{Loyalty:2, Superstition:2}}
};

/* ---------- Councilors ---------- */
const COUNCIL_ROLES = ['Leader','Counselor','Viceroy','Treasurer','Warden','Emissary','Magister','General'];
const ROLE_BLURB = {
  Leader:'The head of state.',
  Counselor:"Assists the head of state — their bonus is added to ALL kingdom checks.",
  Viceroy:'Manages building and Stability projects.',
  Treasurer:'Manages Economy projects.',
  Warden:'Manages the police and law of the state.',
  Emissary:'Manages both diplomacy and spying.',
  Magister:'Manages Education and the mages, clerics and druids of the land.',
  General:'Manages war, armies and Might.'
};
// ASSUMPTION: which councilor's bonus applies to a check of each virtue. The sheet names
// Viceroy/Stability, Treasurer/Economy, Magister/Education and General/Might outright;
// Culture -> Leader and Loyalty -> Warden fill the two gaps. Diplomacy/spying actions
// use the Emissary instead (set per action below).
const VIRTUE_COUNCILOR = {Culture:'Leader', Economy:'Treasurer', Stability:'Viceroy', Loyalty:'Warden', Education:'Magister', Might:'General'};
// Companion bonus per council seat, straight from the sheet's COMPANIONS table ("Ruler" = Leader).
const COMPANION_BONUS = {
  'Amiri':     {Leader:2,  Counselor:1,  Viceroy:-1, Treasurer:-1, Warden:3,  Emissary:0,  Magister:-2, General:0},
  'Ekundayo':  {Leader:1,  Counselor:0,  Viceroy:3,  Treasurer:1,  Warden:2,  Emissary:-1, Magister:-2, General:0},
  'Jubilost':  {Leader:1,  Counselor:1,  Viceroy:2,  Treasurer:3,  Warden:0,  Emissary:0,  Magister:-1, General:-2},
  'Linzi':     {Leader:0,  Counselor:3,  Viceroy:0,  Treasurer:-1, Warden:-1, Emissary:1,  Magister:0,  General:-2},
  'Nok-Nok':   {Leader:-2, Counselor:0,  Viceroy:0,  Treasurer:-2, Warden:1,  Emissary:3,  Magister:-2, General:1},
  'Tristian':  {Leader:0,  Counselor:1,  Viceroy:1,  Treasurer:0,  Warden:-2, Emissary:-1, Magister:3,  General:-2},
  'Valerie':   {Leader:0,  Counselor:0,  Viceroy:0,  Treasurer:-1, Warden:1,  Emissary:2,  Magister:-2, General:3},
  'Harrim':    {Leader:0,  Counselor:0,  Viceroy:-1, Treasurer:-1, Warden:1,  Emissary:-1, Magister:3,  General:1},
  'Jaethal':   {Leader:-1, Counselor:0,  Viceroy:-1, Treasurer:0,  Warden:2,  Emissary:3,  Magister:1,  General:0},
  'Kalikke':   {Leader:0,  Counselor:3,  Viceroy:1,  Treasurer:0,  Warden:-1, Emissary:-1, Magister:2,  General:-1},
  'Kanerah':   {Leader:1,  Counselor:-2, Viceroy:-1, Treasurer:0,  Warden:1,  Emissary:3,  Magister:2,  General:1},
  'Octavia':   {Leader:0,  Counselor:1,  Viceroy:1,  Treasurer:0,  Warden:-1, Emissary:1,  Magister:3,  General:-1},
  'Regongar':  {Leader:-1, Counselor:0,  Viceroy:0,  Treasurer:1,  Warden:1,  Emissary:-1, Magister:1,  General:3}
};
const COMPANIONS = Object.keys(COMPANION_BONUS);
// Bio lookup keys used by STORY_NPC_INFO (kept from v1) when the short name differs.
const COMPANION_BIO_KEY = {'Jubilost':'Jubilost Narthropple'};

/* ---------- Level table: boon, DC and Ruin threshold per level ---------- */
const LEVEL_TABLE = {
  1:{dc:14, ruin:10, boon:'Founding: 1 action in every category, 1d4 Resource Die'},
  2:{dc:15, ruin:10, boon:'Ability +2', virtueBoost:true},
  3:{dc:16, ruin:10, boon:'Towns, 2 Hex Actions'},
  4:{dc:18, ruin:10, boon:'1d6 Resource Die'},
  5:{dc:20, ruin:12, boon:'Ability +2', virtueBoost:true},
  6:{dc:22, ruin:12, boon:'Roll 2 Resources in Collect Resources'},
  7:{dc:23, ruin:12, boon:'2 Leadership Actions'},
  8:{dc:24, ruin:14, boon:'Ability +2, 1d8 Resource Die, +2 Councilor Bonus', virtueBoost:true},
  9:{dc:26, ruin:14, boon:'Cities'},
  10:{dc:27, ruin:14, boon:'3 Hex Actions'},
  11:{dc:28, ruin:16, boon:'Ability +2', virtueBoost:true},
  12:{dc:30, ruin:16, boon:'1d10 Resource Die'},
  13:{dc:31, ruin:16, boon:'2 Settlements can be chosen in Building Actions'},
  14:{dc:32, ruin:18, boon:'Ability +2', virtueBoost:true},
  15:{dc:34, ruin:18, boon:'Metropolises'},
  16:{dc:35, ruin:18, boon:'1d12 Resource Die, +3 Councilor Bonus'},
  17:{dc:36, ruin:20, boon:'Ability +2', virtueBoost:true},
  18:{dc:38, ruin:20, boon:'2 Army Actions'},
  19:{dc:39, ruin:20, boon:'Roll 3 Resources in Collect Resources'},
  20:{dc:40, ruin:22, boon:'Ability +2', virtueBoost:true}
};
const XP_PER_LEVEL = 1000;
const VIRTUE_BOOST_LEVELS = Object.keys(LEVEL_TABLE).map(Number).filter(l=>LEVEL_TABLE[l].virtueBoost);
function lvl(){ return Math.max(1, Math.min(20, (state && state.level) || 1)); }
function kingdomDC(){ return LEVEL_TABLE[lvl()].dc; }
function ruinThreshold(){ return LEVEL_TABLE[lvl()].ruin; }
function resourceDieSides(){ const L=lvl(); return L>=16?12 : L>=12?10 : L>=8?8 : L>=4?6 : 4; }
function resourceChoicesPerTurn(){ const L=lvl(); return L>=19?3 : L>=6?2 : 1; }
function hexActionsPerTurn(){ const L=lvl(); return L>=10?3 : L>=3?2 : 1; }
function leadershipActionsPerTurn(){ return (lvl()>=7?2:1) + buildingCountWithFlag('leadershipAction'); }
function buildingSettlementsPerTurn(){ return lvl()>=13?2:1; }
function armyActionsPerTurn(){ return lvl()>=18?2:1; }
// ASSUMPTION: "+2 / +3 Councilor Bonus" adds that much to every filled council seat (not stacking).
function councilorLevelBonus(){ const L=lvl(); return L>=16?3 : L>=8?2 : 0; }
const SETTLEMENT_SIZES = ['Village','Town','City','Metropolis'];
const SETTLEMENT_UNLOCK_LEVEL = {Village:1, Town:3, City:9, Metropolis:15};
const SETTLEMENT_UPGRADE_COST = {Town:500, City:1000, Metropolis:1750};
const TAX_DICE = {Village:2, Town:5, City:7, Metropolis:10};

/* ---------- Settlement buildings ----------
   `req` is the parent building that must already stand in that settlement.
   The sheet's indentation was flattened in the PDF, so the tree below is rebuilt
   from its markers: ➢ starts a tree, plain entries hang off that root, • entries
   hang off the entry above them. ASSUMPTION: Town Hall and Pier start their own
   trees (Keep/Castle/Palace and Port follow them) even though their ➢ was lost.
   The second "Cemetery" (Level 15, recruits Artillery) is the Siege Workshop. */
function B(name, level, cost, opts){ return Object.assign({name, level, cost, virtue:null, req:null, flags:{}, note:''}, opts||{}); }
const BUILDINGS = [
  B('Herbalist', 1, {Food:1, Gold:100}, {virtue:'Education'}),
  B('Hospital', 9, {Food:10, Luxuries:6, Gold:300}, {virtue:'Stability', req:'Herbalist'}),
  B('Alchemist', 3, {Food:1, Ore:2, Luxuries:5, Gold:180}, {virtue:'Education', req:'Herbalist'}),
  B('Mage Tower', 5, {Food:1, Ore:6, Luxuries:3, Gold:300}, {req:'Herbalist', flags:{portals:true}, note:'Deploy Army by Magic Portals.'}),

  B('Stable', 1, {Lumber:2, Gold:100}, {virtue:'Economy', flags:{recruit:['Cavalry']}, note:'Recruit Cavalry units.'}),
  B('Barns', 3, {Lumber:4, Gold:200}, {virtue:'Economy', req:'Stable'}),
  B('Tannery', 3, {Lumber:2, Gold:200}, {virtue:'Economy', req:'Stable'}),

  B('Shrine', 1, {Ore:3, Lumber:1, Luxuries:2, Gold:100}, {virtue:'Culture'}),
  B('Sacred Grove', 5, {Food:5, Gold:360}, {virtue:'Culture', req:'Shrine'}),
  B('Cemetery', 1, {Ore:7, Gold:40}, {virtue:'Stability', req:'Shrine'}),
  B('Temple', 7, {Lumber:12, Gold:320}, {virtue:'Loyalty', req:'Shrine'}),
  B('Siege Workshop', 15, {Lumber:20, Luxuries:10, Gold:580}, {req:'Shrine', flags:{recruit:['Artillery']}, note:'Recruit Artillery/Mages.'}),

  B('Inn', 1, {Lumber:4, Ore:2, Luxuries:4, Gold:100}, {virtue:'Loyalty'}),
  B('Tavern, Dive', 2, {Luxuries:1, Gold:120}, {req:'Inn'}),
  B('Tavern, Popular', 3, {Lumber:2, Luxuries:6, Gold:240}, {virtue:'Loyalty', req:'Inn'}),
  B('Tavern, Luxury', 9, {Ore:8, Lumber:10, Luxuries:8, Gold:480}, {req:'Tavern, Popular'}),
  B('Tavern, World Class', 15, {Lumber:15, Ore:18, Luxuries:15, Gold:640}, {req:'Tavern, Popular', flags:{advantage:'Hire Adventurers'}, note:'Advantage on Hire Adventurers.'}),

  B('General Store', 1, {Luxuries:1, Gold:80}, {virtue:'Economy'}),
  B('Marketplace', 4, {Lumber:4, Gold:480}, {virtue:'Economy', req:'General Store'}),
  B('Trade Shop', 3, {Luxuries:2, Gold:100}, {virtue:'Culture', req:'General Store'}),
  B('Guildhall', 5, {Ore:8, Gold:340}, {req:'General Store', note:'House a guild of your choice and become its member.'}),
  B('Luxury Store', 6, {Lumber:10, Luxuries:6, Gold:280}, {virtue:'Economy', req:'General Store'}),
  B('Magic Shop', 8, {Lumber:8, Ore:6, Luxuries:6, Gold:440}, {virtue:'Economy', req:'General Store'}),
  B('Occult Shop', 13, {Lumber:12, Ore:6, Luxuries:12, Gold:680}, {virtue:'Economy', req:'Magic Shop'}),

  B('Streetlamps', 3, {Ore:2, Gold:200}, {virtue:'Stability', flags:{lamps:true}}),
  B('Magical Streetlamps', 5, {Gold:200}, {virtue:'Stability', req:'Streetlamps', flags:{lamps:true}}),

  B('Wall, Wooden', 2, {Lumber:4, Gold:150}, {flags:{walls:1}, note:'Enemy army attacks are delayed by 1 turn.'}),
  B('Wall, Stone', 5, {Ore:4, Gold:250}, {req:'Wall, Wooden', flags:{walls:3}, note:'Enemy army attacks are delayed by 3 turns.'}),

  B('Cisterns', 1, {Lumber:1, Ore:5, Gold:160}, {virtue:'Stability', flags:{water:true}}),
  B('Sewer System', 7, {Lumber:6, Ore:10, Gold:240}, {virtue:'Stability', req:'Cisterns', flags:{water:true}}),

  B('Paved Streets', 4, {Ore:5, Gold:120}, {virtue:'Stability', flags:{paved:true}}),

  B('Library', 2, {Lumber:2, Luxuries:4, Gold:60}, {virtue:'Education'}),
  B('Academy', 10, {Lumber:12, Ore:12, Luxuries:6, Gold:520}, {virtue:'Education', req:'Library'}),
  B('Military Academy', 12, {Ore:6, Lumber:12, Luxuries:10, Gold:360}, {req:'Library', flags:{advantage:'Offensive Gambit'}, note:'Advantage on Offensive Gambit.'}),
  B('University', 15, {Ore:18, Lumber:20, Luxuries:15, Gold:640}, {req:'Library', flags:{portals:true, recruit:['Artillery']}, note:'Deploy Army by Portals; recruit Artillery/Mages.'}),

  B('Tenements', 1, {Gold:1, Lumber:1}, {virtue:'Loyalty'}),
  B('Houses', 2, {Food:1, Gold:30}, {virtue:'Loyalty', req:'Tenements'}),
  B('Orphanage', 3, {Lumber:2, Gold:60}, {virtue:'Loyalty', req:'Tenements'}),
  B('Mansion', 5, {Lumber:6, Ore:3, Luxuries:6, Gold:100}, {req:'Tenements'}),
  B('Embassy', 8, {Lumber:6, Ore:10, Gold:260}, {req:'Mansion', flags:{advantage:'Send Diplomatic Envoy'}, note:'Advantage on Send Diplomatic Envoy.'}),
  B('Noble Villa', 9, {Ore:16, Luxuries:10, Gold:240}, {virtue:'Loyalty', req:'Mansion'}),

  B('Watchtower', 1, {Lumber:5, Gold:60}),
  B('Jail', 2, {Food:4, Lumber:2, Ore:4, Gold:140}, {virtue:'Might', req:'Watchtower'}),
  B('Barracks', 3, {Ore:1, Lumber:2, Gold:60}, {req:'Watchtower', flags:{recruit:['Knights','Archers']}, note:'Recruit Infantry and Ranged units.'}),
  B('Garrison', 5, {Lumber:6, Ore:3, Gold:280}, {req:'Watchtower', flags:{train:true}, note:'Allows Train Unit.'}),

  B('Town Hall', 2, {Ore:4, Lumber:4, Gold:220}),
  B('Keep', 3, {Lumber:8, Ore:8, Gold:320}, {req:'Town Hall', flags:{leadershipAction:true}, note:'+1 Leadership Action.'}),
  B('Castle', 9, {Lumber:12, Ore:12, Gold:540}, {req:'Keep', flags:{leadershipAction:true}, note:'+1 Leadership Action.'}),
  B('Palace', 15, {Food:12, Lumber:10, Ore:15, Luxuries:20, Gold:1080}, {req:'Keep', flags:{leadershipAction:true}, note:'+1 Leadership Action.'}),

  B('Mill', 2, {Ore:2, Lumber:1, Gold:60}),
  B('Blacksmith', 3, {Food:3, Lumber:5, Ore:6, Gold:160}, {req:'Mill', flags:{outfit:true}, note:'Allows Outfit Unit.'}),
  B('Mint', 5, {Ore:4, Luxuries:6}, {req:'Mill', note:'Make your own coins.'}),
  B('Bank', 15, {Lumber:20, Ore:12, Luxuries:16, Gold:300}, {req:'Mill', flags:{advantage:'Capital Investment'}, note:'Advantage on Capital Investment.'}),

  B('Pier', 3, {Lumber:2, Gold:160}, {virtue:'Economy'}),
  B('Port', 9, {Lumber:10, Ore:10, Gold:400}, {req:'Pier', flags:{boats:true}, note:'Deploy Army by Boat.'}),

  B('Park', 1, {Lumber:4, Gold:50}, {virtue:'Culture'}),
  B('Menagerie', 12, {Food:14, Ore:10, Luxuries:10, Gold:250}, {req:'Park', note:'Collect pets and animal friends and house them.'}),
  B('Arena', 9, {Food:3, Lumber:6, Ore:12, Gold:300}, {virtue:'Might', req:'Park'}),
  B('Colosseum', 15, {Lumber:20, Ore:12, Luxuries:16, Gold:400}, {virtue:'Might', req:'Park'}),
  B('Monument', 3, {Luxuries:1, Gold:60}, {virtue:'Culture', req:'Park'}),
  B('Museum', 5, {Luxuries:8, Gold:300}, {virtue:'Culture', req:'Park'}),
  B('Festival Hall', 3, {Lumber:3, Gold:70}, {req:'Park'}),
  B('Theater', 9, {Food:2, Lumber:2, Ore:2, Luxuries:2, Gold:240}, {virtue:'Culture', req:'Park'}),
  B('Opera House', 15, {Luxuries:16, Lumber:18, Ore:20, Gold:400}, {req:'Theater', flags:{advantage:'Celebrate Holiday'}, note:'Advantage on Celebrate Holiday.'})
];
const BUILDING_BY_NAME = Object.fromEntries(BUILDINGS.map(b=>[b.name,b]));
const BUILDING_ROOTS = BUILDINGS.filter(b=>!b.req).map(b=>b.name);
function buildingRoot(name){ let b = BUILDING_BY_NAME[name]; while(b && b.req) b = BUILDING_BY_NAME[b.req]; return b ? b.name : name; }

/* ---------- War — units ---------- */
const UNIT_TYPES = {
  Peasants:  {label:'Peasants', size:20, recruit:{Gold:10, Food:10}, upkeep:{Gold:5, Food:5}, stationed:{Gold:2, Food:2}, die:4,  range:'Melee', move:25, ac:13, actions:2,
              notes:[], needs:null},
  Knights:   {label:'Knights', size:10, recruit:{Gold:20, Food:20}, upkeep:{Gold:10, Food:10}, stationed:{Gold:5, Food:5}, die:8, range:'Melee', move:20, ac:20, actions:2,
              notes:['Advantage against Cavalry when attacked in melee from the front.','Advantage against Peasants.'], needs:'Barracks'},
  Archers:   {label:'Archers / Musketmen', size:20, recruit:{Gold:20, Food:20}, upkeep:{Gold:10, Food:10}, stationed:{Gold:5, Food:5}, die:6, range:'50 ft', move:25, ac:15, actions:2,
              notes:['Disadvantage in melee.','Advantage against Knights from range.'], needs:'Barracks'},
  Cavalry:   {label:'Cavalry', size:20, recruit:{Gold:40, Food:40}, upkeep:{Gold:20, Food:20}, stationed:{Gold:10, Food:10}, die:8, range:'Melee', move:50, ac:17, actions:3,
              notes:['Advantage against all units when attacking in melee from the sides or back.','Does not trigger reactions.'], needs:'Stable'},
  Artillery: {label:'Artillery / Mages', size:1, recruit:{Gold:80, Food:80}, upkeep:{Gold:40, Food:40}, stationed:{Gold:20, Food:20}, die:12, range:'100 ft', move:10, ac:10, actions:1,
              notes:['Advantage against all units when attacking from range.','Disadvantage in melee.','Can destroy buildings.'], needs:'Siege Workshop or University'}
};

/* ---------- Turn actions ----------
   check: virtue rolled (null = no roll). councilor overrides VIRTUE_COUNCILOR.
   cost: paid when the action is attempted. */
const LEADERSHIP_ACTIONS = {
  'Capital Investment':   {check:'Economy', choices:['Gain 5d20 Gold','Reduce Mismanagement'], desc:'Gain 5d20 Gold, or attempt to reduce Mismanagement.'},
  'Celebrate Holiday':    {check:'Culture', cost:{Gold:100}, choices:['Gain a Boon from a God','Reduce Decay'], desc:'Gain a Boon from a God, or reduce Decay.'},
  'Focused Attention':    {check:null, desc:"Increase a companion's councilor stats (+1 to that seat's bonus)."},
  'Hire Adventurers':     {check:'Might', cost:{Gold:100}, desc:'Complete a task or explore a hex.'},
  'Infiltration':         {check:'Loyalty', councilor:'Emissary', choices:['Learn a secret of another kingdom','Reduce Corruption'], desc:'Learn a secret of another kingdom, or reduce Corruption.'},
  'Pledge Fealty':        {check:'Might', altCheck:'Loyalty', desc:'Demand an occupied hex joins your kingdom.'},
  'Supernatural Studies': {check:'Education', choices:['Your spellcasters see a vision','Reduce Superstition'], desc:'Your spellcasters see a vision, or reduce Superstition.'},
  'Request Foreign Aid':  {check:null, desc:'Gain 5d6 of a resource — but you OWE A DEBT.'},
  'Send Diplomatic Envoy':{check:'Loyalty', councilor:'Emissary', desc:'Make contact with a foreign state. Needed before Trade Agreements with it.'},
  'Repair Reputation':    {check:'Loyalty', choices:['Become more popular','Reduce Strife'], desc:'Become more popular, or reduce Strife.'},
  'Go Fishing':           {check:null, desc:'Gain 1d4 Food.'}
};
// ASSUMPTION: a successful "reduce" lowers that flaw by 2 (4 on a critical success),
// mirroring Collect Taxes' +2 / +4 Mismanagement on failure.
const FLAW_REDUCE = {2:2, 3:4};
const HEX_ACTIONS = {
  'Claim Hex':                    {desc:'Increase Kingdom Size by 1.'},
  'Abandon Hex':                  {desc:'Reduce Kingdom Size by 1.'},
  'Establish Resource Building':  {cost:{Gold:100}, desc:'Build a Farmland, Lumberyard or Mine on a matching hex.'},
  'Establish Settlement':         {cost:{Gold:200}, desc:'Build a Village.'},
  'Level Up Settlement':          {desc:'Grow a settlement: 500 G Town, 1000 G City, 1750 G Metropolis.'},
  'Establish Fort':               {cost:{Gold:100}, desc:'Be alerted of invaders, station troops there.'},
  'Build Roads':                  {cost:{Gold:500, Ore:50}, desc:'Double travel speed within your kingdom.'},
  'Irrigation':                   {cost:{Gold:200}, desc:'Turn a hex into a lake or part of a river.'},
  'Relocate Capital':             {cost:{Gold:500}, desc:'Move your capital and change your Heartland.'}
};
const ARMY_ACTIONS = {
  'Recruit Unit':      {desc:'Recruit a single unit.'},
  'Deploy Army':       {desc:'Move an army: 10 hexes by land, 20 by boat (Port), 30 by magic portals (Mage Tower / University).'},
  'Disband':           {desc:'Disband a unit, several units or an entire army.'},
  'Train Unit':        {desc:'Increase unit damage (+1). Requires a Garrison.'},
  'Outfit Unit':       {desc:'Increase unit armor (+1 AC). Requires a Blacksmith.'},
  'Recover Unit':      {desc:'Heal unit health back to full.'},
  'Recruit':           {desc:'Increase unit health — add another batch of soldiers (pays the recruitment cost again).'},
  'Offensive Gambit':  {desc:'Attempt to engage an enemy army with Advantage.'}
};
const XP_SOURCES = ['Claimed a Landmark Hex','Established a Village','Established a Fort','Reached a Size milestone','Established Diplomatic Relations','Expanded a Settlement','Won a Battle','Completed a Quest','Resolved a Kingdom Event','Other'];
const SIZE_MILESTONES = [10,25,50,100];

const APP_VERSION = 'v2.0.0';
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

/* Companion bios and Kingmaker-region nations (written for v1, still used). */
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
  'Harrim': {status:'Secondary Companion', deity:'Groetus', description:"A dwarf cleric who tried, and failed, again and again, to honor his people's god of craft — every project he touched fell apart. Worn down by the streak of bad luck, he found a grim sort of comfort in a god of endings instead, and now delivers doom-laden pronouncements with the flat calm of someone who's made peace with pessimism."},
  'Regongar': {status:'Secondary Companion', deity:null, description:"A half-orc spellcaster who fights as fiercely with a blade as with magic, forged by years as a slave to a ruthless technological cult. Volatile and blunt, he has little patience for cowardice or hesitation, and holds few things sacred besides the freedom he fought hard to win."},
  'Octavia': {status:'Secondary Companion', deity:'Calistria', description:"A half-elf trained in both arcane spellcraft and quiet, practical thievery, sold into slavery as a child alongside Regongar. Despite everything, she's kept a light, optimistic streak — freedom clearly means everything to her, even if she rarely says so directly."},
  'Shandra Mvashti': {status:null, deity:null, description:"A settler with a personal, long-standing claim to a homestead somewhere in the Stolen Lands. Practical and determined, she's less interested in glory than in seeing that claim honored."},
  'Oleg Leveton': {status:null, deity:null, description:"A gruff former city-dweller who traded noise and politics for a quiet trading post on the frontier. Prefers being master of his own small patch of land to answering to anyone else, but treats travelers who pass through fairly."},
  'Svetlana Leveton': {status:null, deity:null, description:"Oleg's wife and partner in running their trading post — warm, even-tempered, and the more approachable of the two. Minor nobility by birth, she never took to court intrigue and found she preferred an honest, hands-on life instead."},
  'Jaethal': {status:'Secondary Companion', deity:'Urgathoa', description:"An undead elf inquisitor sworn to Urgathoa, exiled from Kyonin generations ago after taking part in the ritual killing of her own family. Death didn't end her service — she rose again in the goddess's name — but Urgathoa has since gone quiet, leaving Jaethal's purpose oddly adrift. Cold and clinical even by undead standards, she keeps a living daughter alive less out of love than a refusal to waste the effort already spent."},
  'Kalikke': {status:'Secondary Companion', deity:null, description:"A tiefling kineticist who fled Qadira under a false name, staying quiet about whatever drove her out. Good-hearted and easier to get along with than her twin, she's bound to Kanerah by a shared curse that lets only one of them walk the world at a time — the other waits somewhere just out of reach."},
  'Kanerah': {status:'Secondary Companion', deity:null, description:"A tiefling kineticist and Kalikke's twin, sharing the same flight from Qadira under the same false name — and the same curse that ties their fates together, swapping one for the other. Where Kalikke leans warm, Kanerah is cold and self-serving, and the two sisters make no secret of how little they trust each other."}
};
// Reference-only picker data for the "which group/nation?" fields on Send Diplomatic
// Envoy, Pledge of Fealty, Request Foreign Aid, and Establish Trade Agreement — purely
// flavor, no mechanical effect. Real Golarion nations from the Kingmaker region (Brevoy
// and the River Kingdoms bordering the Stolen Lands, plus Numeria), verified against
// Archives of Nethys and Pathfinder wiki sources. Descriptions below are paraphrased
// fresh in our own words from bare facts (ruler, government type, a notable trait) —
// not reworded from any source passage, same split the NPC bios above already follow.
const KM_NATIONS = [
  {name:'Brevoy', description:"A young hereditary monarchy to the north, formed three centuries ago when Choral the Conqueror unified two older realms. Its ruling line vanished without a trace decades later, and House Surtova has held an uneasy throne from New Stetven ever since — it's Brevoy's charter that let the Stolen Lands be settled at all."},
  {name:'Rostland', description:"The southern half of Brevoy, once its own realm ruled by the sword-dueling Aldori swordlords. The city of Restov still governs itself by that old council of duelists, chafing against the crown up north."},
  {name:'Issia', description:"The northern half of Brevoy — harsher land, thinner soil, held for a thousand years by House Surtova. They built their power on raiding and shrewd marriages long before they ever wore a crown."},
  {name:'Daggermark', description:"A River Kingdoms city that runs on guild power more than on its nominal ruler, who keeps his seat only because the assassins' guild, the poisoners' guild, and the city's own warlord all back him. Hosts the region's one yearly attempt at cooperation, the Outlaw Council."},
  {name:'Pitax', description:"A kingdom won at a card table — its king cheated his own brothers out of the throne. Known for a lavish annual tournament and a royal arts academy that draws more flattery than real talent."},
  {name:'Mivon', description:"Settled generations ago by Aldori swordlords fleeing Rostland, where the way to rule is still to win the seat in single combat. Splinters into rival dueling houses more often than it unites behind one leader."},
  {name:'Gralton', description:"Run by a small council of lifetime members who appoint their own public-facing governor — the real power stays a step behind whoever's actually waving from the balcony."},
  {name:'Lambreth', description:"Seized in a single bloody night by an exiled foreign knight, who “helped” the old ruling council fend off an invasion and then killed the one member who wouldn't honor the deal afterward."},
  {name:'Tymon', description:"Founded by a company of gladiators under four laws their leader declared unbreakable. Still ruled by whoever currently holds the title of Champion."},
  {name:'Sevenarches', description:"Guarded by a secretive druidic order watching over an ancient rift to the fey realm — who controversially bar elves from the very site their own legends are tied to."},
  {name:'Protectorate of the Black Marquis', description:"A stretch of river run like a toll racket by a self-styled pirate lord. Pay at the bridge, or expect to get boarded."},
  {name:'Numeria', description:"Ruled by a former tribal warlord whose capital is built around the wreck of something not of this world. Once controlled by a cabal of scavenger-mages who exploited that wreckage's strange effects on him, he's since turned on them."}
];

const V2_CSS = "\n  /* ---------- rules v2 screens ---------- */\n  .attention-card{border-color:var(--gold-dim);background:rgba(201,162,75,0.06);}\n  .attention-item{font-size:12px;line-height:1.5;color:var(--text);padding:7px 0;border-bottom:1px solid var(--border);}\n  .attention-item:last-child{border-bottom:none;}\n  .attention-item .loc-link{color:var(--gold);}\n  .turn-card{border-color:var(--gold-dim);}\n  .vf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px;}\n  .vf-cell{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:7px 8px;}\n  .vf-v,.vf-f{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;}\n  .vf-v span{color:var(--text);} .vf-v b{font-family:'IBM Plex Mono',monospace;color:var(--gold);font-size:15px;}\n  .vf-f span{color:var(--text-muted);} .vf-f b{font-family:'IBM Plex Mono',monospace;color:#d99a82;font-size:12px;}\n  .vf-f.over span,.vf-f.over b{color:var(--rust);font-weight:700;}\n  .vf-mod{font-size:10px;color:var(--text-muted);margin-top:3px;font-family:'IBM Plex Mono',monospace;}\n  .vf-head{display:flex;justify-content:space-between;align-items:center;gap:10px;}\n  .vf-name{font-family:'Cinzel',serif;font-weight:600;font-size:14px;color:var(--text);}\n  .vf-name.over,.vf-big.over{color:var(--rust);}\n  .vf-big{font-size:28px;color:var(--gold);line-height:1.1;}\n  .vf-head > div:last-child .vf-big{color:#d99a82;}\n  .vf-head > div:last-child .vf-big.over{color:var(--rust);}\n  .vf-vs{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;}\n  .ruin-bar{height:5px;background:var(--surface);border-radius:3px;overflow:hidden;margin-top:8px;border:1px solid var(--border);}\n  .ruin-bar > div{height:100%;background:linear-gradient(90deg,#8a5a42,var(--rust));}\n  .check-box{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px 10px;margin:10px 0 4px;}\n  .check-line{display:flex;justify-content:space-between;gap:8px;font-size:13px;color:var(--text);}\n  .degree-banner{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;border-radius:8px;padding:9px 11px;font-size:13px;border:1px solid var(--border);}\n  .degree-banner .mono{font-size:11px;opacity:0.85;}\n  .deg-crit{background:rgba(201,162,75,0.16);border-color:var(--gold);color:var(--gold);}\n  .deg-success{background:rgba(92,139,114,0.16);border-color:var(--forest);color:#8fbf9e;}\n  .deg-fail{background:rgba(177,92,66,0.12);border-color:#7d4a3a;color:#d99a82;}\n  .deg-critfail{background:rgba(177,92,66,0.22);border-color:var(--rust);color:#e8a58c;}\n  .draft-preview{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-top:14px;}\n  .draft-preview > div{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:5px 2px;text-align:center;display:flex;flex-direction:column;}\n  .draft-preview span{font-size:9px;color:var(--text-muted);letter-spacing:0.05em;}\n  .draft-preview b{font-family:'IBM Plex Mono',monospace;color:var(--gold);font-size:15px;}\n  .draft-preview i{font-style:normal;font-family:'IBM Plex Mono',monospace;color:#d99a82;font-size:10px;min-height:12px;}\n  .council-card select{width:100%;}\n  .seat-bonus-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:6px 0;}\n  .seat-bonus-grid > div{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:4px;text-align:center;display:flex;flex-direction:column;font-size:9px;color:var(--text-muted);}\n  .seat-bonus-grid b{font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--text);}\n  .seat-bonus-grid .pos b{color:#8fbf9e;} .seat-bonus-grid .neg b{color:#d99a82;}\n  .trait-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;}\n  .trait{font-size:10px;padding:2px 7px;border-radius:10px;border:1px solid var(--border);color:var(--text-muted);}\n  .trait.on{border-color:var(--forest);color:#8fbf9e;}\n  .bld-group{margin-top:6px;}\n  .bld-root{display:block;font-size:10px;color:var(--gold-dim);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;}\n  .option-card.locked{opacity:0.55;cursor:default;}\n  .bld-card{cursor:default;padding:10px 12px;}\n  .turn-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;}\n  .turn-head .small-ghost{flex:0 0 auto;}\n  .turn-dots{display:grid;grid-template-columns:repeat(10,1fr);gap:3px;margin:12px 0 10px;}\n  .turn-dots button{background:var(--surface);border:1px solid var(--border);color:var(--text-muted);border-radius:5px;font-size:11px;padding:5px 0;cursor:pointer;font-family:'IBM Plex Mono',monospace;}\n  .turn-dots button.done{border-color:var(--forest);color:#8fbf9e;}\n  .turn-dots button.active{border-color:var(--gold);color:var(--bg);background:var(--gold);}\n  .turn-body{min-height:120px;}\n  .step-tag{display:inline-block;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;padding:2px 8px;border-radius:10px;border:1px solid var(--border);}\n  .step-tag.roll{color:var(--blue);border-color:var(--blue);}\n  .step-tag.check{color:var(--gold);border-color:var(--gold-dim);}\n  .step-tag.auto{color:#8fbf9e;border-color:var(--forest);}\n  .step-tag.done{color:var(--bg);background:var(--forest);border-color:var(--forest);}\n  .counter-line{font-size:12px;color:var(--text);background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:6px 10px;margin:8px 0;}\n  .counter-line b{color:var(--gold);font-family:'IBM Plex Mono',monospace;}\n  .counter-line.spent{color:var(--text-muted);} .counter-line.spent b{color:var(--text-muted);}\n  .big-roll{font-size:34px;color:var(--gold);text-align:center;margin:8px 0;}\n  .unit-row{border-top:1px solid var(--border);padding:9px 0;}\n  .unit-top{display:flex;justify-content:space-between;font-size:13px;}\n  .hp-bar{height:5px;background:var(--surface);border-radius:3px;overflow:hidden;margin-top:4px;border:1px solid var(--border);}\n  .hp-bar > div{height:100%;background:var(--forest);}\n  .unit-ref{border-top:1px solid var(--border);padding:8px 0;}\n  .unit-ref .opt-name{font-family:'Cinzel',serif;font-weight:600;font-size:13px;}\n  .kl-overlay .card{box-shadow:0 10px 40px rgba(0,0,0,0.5);}\n\n  .vf-v span,.vf-f span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;margin-right:4px;}\n  .vf-f span{font-size:10px;}\n  .boost-picker.three{grid-template-columns:repeat(3,1fr);}\n  .hex-panel-inner textarea{width:100%;}\n";


/* =====================================================================
   STATE
===================================================================== */
let state = null;
function emptyCouncilSeat(){ return {holder:'', customName:'', customBonus:0, focus:0}; }
const DEFAULT_STATE = () => ({
  rulesVersion: RULES_VERSION,
  started:false,
  name:'Unnamed Realm', playerCharacter:'', level:1, xp:0, turn:1,
  creation:{charter:'', charterVirtue:'', heartland:'', government:'', bonusVirtue:''},
  levelBoosts:[],            // [{level, virtue}]
  pendingBoostLevels:[],     // levels whose Ability +2 hasn't been chosen yet
  flawAdjust: Object.fromEntries(FLAWS.map(f=>[f,0])),     // changes from play (taxes, events, actions)
  virtueAdjust: Object.fromEntries(VIRTUES.map(v=>[v,0])), // GM-granted changes
  resources:{Gold:0, Food:0, Lumber:0, Ore:0, Luxuries:0},
  council: Object.fromEntries(COUNCIL_ROLES.map(r=>[r, emptyCouncilSeat()])),
  advantages:0,
  relations:[],              // [{nation, trade}] — contacted foreign states
  debts:[],                  // [{text, turn}]
  events:[],                 // [{text, turn}] active kingdom events
  roads:false,
  foundingResourceDone:false,
  hexes:{},
  settlements:[],            // [{id,name,type,col,row,buildings:[],notes}]
  armies:[],                 // [{id,name,col,row,units:[{id,type,hp,maxHp,dmg,ac}]}]
  log:[],
  xpLog:[],
  turnState:null
});

/* =====================================================================
   COMPUTED ENGINE — virtues/flaws are never stored as totals; they're
   rebuilt from their sources every render so every number has attribution.
===================================================================== */
function virtueSources(v){
  const src = [];
  const c = (state && state.creation) || {};
  const ch = CHARTERS[c.charter];
  if(ch && ch.mods[v]) src.push({label:c.charter+' charter', amt:ch.mods[v]});
  if(ch && ch.freeVirtue && c.charterVirtue===v) src.push({label:'Open charter', amt:2});
  const hl = HEARTLANDS[c.heartland];
  if(hl && hl.virtue===v) src.push({label:c.heartland+' heartland', amt:2});
  const gov = GOVERNMENTS[c.government];
  if(gov && gov.mods[v]) src.push({label:c.government, amt:gov.mods[v]});
  if(c.bonusVirtue===v) src.push({label:'Founding boost', amt:2});
  (state.levelBoosts||[]).forEach(b=>{ if(b.virtue===v) src.push({label:'Level '+b.level, amt:2}); });
  // settlement buildings — one entry per building so the source is always named
  (state.settlements||[]).forEach(s=>(s.buildings||[]).forEach(name=>{
    const b = BUILDING_BY_NAME[name];
    if(b && b.virtue===v) src.push({label:`${name} (${s.name})`, amt:1});
  }));
  const adj = (state.virtueAdjust||{})[v]||0;
  if(adj) src.push({label:'Adjusted in play', amt:adj});
  return src;
}
function flawSources(f){
  const src = [];
  const c = (state && state.creation) || {};
  const ch = CHARTERS[c.charter];
  if(ch && ch.mods[f]) src.push({label:c.charter+' charter', amt:ch.mods[f]});
  const gov = GOVERNMENTS[c.government];
  if(gov && gov.mods[f]) src.push({label:c.government, amt:gov.mods[f]});
  const adj = (state.flawAdjust||{})[f]||0;
  if(adj) src.push({label:'From play (events, taxes, actions)', amt:adj});
  return src;
}
const sumAmt = list => list.reduce((s,x)=>s+x.amt, 0);
function virtueValue(v){ return sumAmt(virtueSources(v)); }
function flawValue(f){ return Math.max(0, sumAmt(flawSources(f))); }
// A flaw over the Ruin threshold triggers a Kingdom Event.
// ASSUMPTION: only flaws are checked against Ruin; virtues have no cap.
function flawsOverRuin(){ return FLAWS.filter(f=>flawValue(f) > ruinThreshold()); }
// Change a flaw from play. Never lets the total go below 0 (a reduction can't bank credit).
function changeFlaw(f, delta){
  const before = flawValue(f);
  state.flawAdjust[f] = (state.flawAdjust[f]||0) + delta;
  if(sumAmt(flawSources(f)) < 0) state.flawAdjust[f] -= sumAmt(flawSources(f));
  return flawValue(f) - before;
}

/* ---------- council ---------- */
function seatHolderName(role){
  const s = state.council[role];
  if(!s || !s.holder) return '';
  if(s.holder==='__pc__') return state.playerCharacter || 'Your character';
  if(s.holder==='__custom__') return s.customName || 'Custom councilor';
  return s.holder;
}
function seatBaseBonus(role){
  const s = state.council[role];
  if(!s || !s.holder) return 0;
  if(s.holder==='__pc__' || s.holder==='__custom__') return parseInt(s.customBonus)||0;
  return (COMPANION_BONUS[s.holder]||{})[role]||0;
}
function seatBonusParts(role){
  const s = state.council[role];
  if(!s || !s.holder) return [];
  const parts = [{label:seatHolderName(role), amt:seatBaseBonus(role)}];
  if(s.focus) parts.push({label:'Focused Attention', amt:s.focus});
  if(councilorLevelBonus()) parts.push({label:'Level '+(lvl()>=16?16:8)+' councilor bonus', amt:councilorLevelBonus()});
  return parts;
}
function seatBonus(role){ return sumAmt(seatBonusParts(role)); }
function companionSeat(name){ return COUNCIL_ROLES.find(r=>state.council[r].holder===name) || null; }

/* ---------- checks: d20 + virtue − opposing flaw + councilor (+ Counselor on every check) ---------- */
function checkParts(virtue, councilor){
  const role = councilor || VIRTUE_COUNCILOR[virtue];
  const parts = [{label:virtue, amt:virtueValue(virtue)}];
  const fl = flawValue(FLAW_OF[virtue]);
  if(fl) parts.push({label:FLAW_OF[virtue], amt:-fl});
  if(role && state.council[role].holder) parts.push({label:`${role} · ${seatHolderName(role)}`, amt:seatBonus(role)});
  if(role!=='Counselor' && state.council.Counselor.holder) parts.push({label:`Counselor · ${seatHolderName('Counselor')}`, amt:seatBonus('Counselor')});
  return parts;
}
function checkModifier(virtue, councilor){ return sumAmt(checkParts(virtue, councilor)); }
// 3 crit success, 2 success, 1 failure, 0 crit failure — beat the DC by 10 for a critical,
// and a natural 20 / 1 shifts the result one step up / down.
function degreeOf(nat, total, dc){
  let d = total>=dc+10 ? 3 : total>=dc ? 2 : total<=dc-10 ? 0 : 1;
  if(nat===20) d = Math.min(3, d+1);
  if(nat===1) d = Math.max(0, d-1);
  return d;
}
const DEGREE_LABEL = {3:'Critical Success', 2:'Success', 1:'Failure', 0:'Critical Failure'};
const DEGREE_CLASS = {3:'deg-crit', 2:'deg-success', 1:'deg-fail', 0:'deg-critfail'};

/* ---------- dice ---------- */
function rollDie(sides){ return 1 + Math.floor(Math.random()*sides); }
function rollDice(count, sides){
  const rolls = [];
  for(let i=0;i<count;i++) rolls.push(rollDie(sides));
  return {rolls, total: rolls.reduce((a,b)=>a+b,0)};
}
function rollDiceAdv(count, sides, adv){
  const a = rollDice(count, sides);
  if(!adv) return a;
  const b = rollDice(count, sides);
  return a.total>=b.total ? Object.assign(a,{other:b.total}) : Object.assign(b,{other:a.total});
}

/* ---------- kingdom geography ---------- */
const CLAIMED_HEX_TYPES = ['Capital','Claimed Territory','Settlement','Fort'];
function claimedHexCount(){ return Object.values(state.hexes).filter(h=>h && CLAIMED_HEX_TYPES.includes(h.type)).length; }
function kingdomSize(){ return Math.max(1, claimedHexCount()); }
function capitalHex(){
  const k = Object.keys(state.hexes).find(k=>state.hexes[k] && state.hexes[k].type==='Capital');
  if(!k) return null;
  const [col,row] = k.split('_').map(Number);
  return {col,row,key:k};
}
function capitalSettlement(){
  const cap = capitalHex();
  return cap ? state.settlements.find(s=>s.col===cap.col && s.row===cap.row) || null : null;
}
function fortCount(){ return Object.values(state.hexes).filter(h=>h && h.type==='Fort').length; }
function resourceBuildingHexes(name){
  return Object.keys(state.hexes).filter(k=>state.hexes[k] && state.hexes[k].resourceBuilding===name);
}
function tradeAgreementCount(){ return (state.relations||[]).reduce((s,r)=>s+(r.trade||0),0); }
function producerCount(good){
  if(good==='Luxuries') return tradeAgreementCount();
  return resourceBuildingHexes(BUILDING_FOR_GOOD[good]).length;
}
function heartlandAdvantage(good){ const h = HEARTLANDS[state.creation.heartland]; return !!h && h.advantage===good; }

/* ---------- settlement buildings ---------- */
function allBuildings(){
  const out = [];
  state.settlements.forEach(s=>(s.buildings||[]).forEach(name=>out.push({settlement:s, name})));
  return out;
}
function buildingCountWithFlag(flag){
  if(!state) return 0;
  return allBuildings().filter(x=>{ const b=BUILDING_BY_NAME[x.name]; return b && b.flags[flag]; }).length;
}
function kingdomHasFlag(flag, value){
  return allBuildings().some(x=>{
    const b = BUILDING_BY_NAME[x.name];
    if(!b || !b.flags[flag]) return false;
    if(value===undefined) return true;
    const f = b.flags[flag];
    return Array.isArray(f) ? f.includes(value) : f===value;
  });
}
function advantageSourceFor(actionName){
  const hit = allBuildings().find(x=>{ const b=BUILDING_BY_NAME[x.name]; return b && b.flags.advantage===actionName; });
  return hit ? `${hit.name} (${hit.settlement.name})` : null;
}
function settlementHas(s, name){ return (s.buildings||[]).includes(name); }
function buildingAvailability(s, b){
  if(settlementHas(s, b.name)) return {ok:false, why:'Already built here'};
  if(b.level > lvl()) return {ok:false, why:`Needs kingdom level ${b.level}`};
  if(b.req && !settlementHas(s, b.req)) return {ok:false, why:`Needs ${b.req} in ${s.name} first`};
  return {ok:true};
}
function settlementTraits(s){
  const has = flag => (s.buildings||[]).some(n=>{ const b=BUILDING_BY_NAME[n]; return b && b.flags[flag]; });
  return {Lamps:has('lamps'), Walls:has('walls'), 'Paved Streets':has('paved'), 'Cisterns or Sewers':has('water')};
}
function settlementWallDelay(s){
  return Math.max(0, ...(s.buildings||[]).map(n=>{ const b=BUILDING_BY_NAME[n]; return (b && b.flags.walls)||0; }));
}

/* ---------- costs ---------- */
function formatCost(cost){
  if(!cost) return 'free';
  const order = ['Gold','Food','Lumber','Ore','Luxuries'];
  const parts = order.filter(k=>cost[k]).map(k=>`${cost[k]} ${RES_SHORT[k]}`);
  return parts.length ? parts.join(', ') : 'free';
}
function missingFor(cost){
  return Object.keys(cost||{}).filter(k=>(state.resources[k]||0) < cost[k]).map(k=>({res:k, need:cost[k], have:state.resources[k]||0}));
}
function canAfford(cost){ return missingFor(cost).length===0; }
function spend(cost){ Object.keys(cost||{}).forEach(k=>{ state.resources[k] = (state.resources[k]||0) - cost[k]; }); }
function gain(res, amt){ state.resources[res] = Math.max(0, (state.resources[res]||0) + amt); }
// Points the player at how to get a missing commodity instead of a dead end.
function shortageHelp(missing){
  return missing.map(m=>{
    if(m.res==='Gold') return `<b>${m.need} Gold</b> (you have ${m.have}) — Gold comes from Collect Taxes (turn step 3) and Capital Investment.`;
    if(m.res==='Luxuries') return `<b>${m.need} Luxuries</b> (you have ${m.have}) — Luxuries come only from Trade Agreements: send a Diplomatic Envoy to a foreign state, then use the Resource Action to set up a Trade Agreement.`;
    const bname = BUILDING_FOR_GOOD[m.res];
    const rb = RESOURCE_BUILDINGS[bname];
    const count = producerCount(m.res);
    return `<b>${m.need} ${m.res}</b> (you have ${m.have}) — ${m.res} comes from ${bname}s on ${rb.terrains.join(' or ')} hexes (you have ${count}). Claim a matching hex and build a ${bname} with the Resource Action or a Hex Action, then roll for it in Collect Resources.`;
  }).join('<br>');
}

/* ---------- war ---------- */
function unitBatches(u){ const t=UNIT_TYPES[u.type]; return Math.max(1, Math.ceil((u.maxHp||t.size)/t.size)); }
function armyIsStationed(a){
  if(a.col===undefined) return true; // not deployed — sitting at home
  const h = state.hexes[hexKey(a.col,a.row)];
  return !!h && ['Capital','Settlement','Fort'].includes(h.type);
}
function armyUpkeep(){
  const total = {Gold:0, Food:0};
  state.armies.forEach(a=>{
    const stationed = armyIsStationed(a);
    a.units.forEach(u=>{
      const t = UNIT_TYPES[u.type]; if(!t) return;
      const c = stationed ? t.stationed : t.upkeep;
      total.Gold += c.Gold*unitBatches(u);
      total.Food += c.Food*unitBatches(u);
    });
  });
  return total;
}
function canRecruitType(type){
  const t = UNIT_TYPES[type];
  if(!t.needs) return true;
  return kingdomHasFlag('recruit', type);
}
function unitAttackBonus(){ return virtueValue('Might') - flawValue('Weakness'); }


/* =====================================================================
   PERSISTENCE
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
  return { id, name: s.name || 'Unnamed Realm', government: (s.creation && s.creation.government) || '', level: s.level || 1, updatedAt: Date.now(), rulesVersion: s.rulesVersion || 1 };
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
  if(!state.rulesVersion || state.rulesVersion < RULES_VERSION) convertFromOfficialRules();
  const d = DEFAULT_STATE();
  for(const k in d){ if(!(k in state)) state[k]=d[k]; }
  for(const k in d.creation){ if(!(k in state.creation)) state.creation[k]=d.creation[k]; }
  FLAWS.forEach(f=>{ if(typeof state.flawAdjust[f]!=='number') state.flawAdjust[f]=0; });
  VIRTUES.forEach(v=>{ if(typeof state.virtueAdjust[v]!=='number') state.virtueAdjust[v]=0; });
  ['Gold'].concat(COMMODITIES).forEach(r=>{ if(typeof state.resources[r]!=='number') state.resources[r]=0; });
  COUNCIL_ROLES.forEach(r=>{
    if(!state.council[r]) state.council[r] = emptyCouncilSeat();
    const seat = state.council[r];
    if(seat.focus===undefined) seat.focus=0;
    if(seat.customBonus===undefined) seat.customBonus=0;
    if(seat.customName===undefined) seat.customName='';
  });
  state.settlements.forEach(s=>{
    if(!s.type) s.type='Village';
    if(!Array.isArray(s.buildings)) s.buildings=[];
    if(s.notes===undefined) s.notes='';
  });
  state.armies.forEach(a=>{ if(!Array.isArray(a.units)) a.units=[]; });
  state.started = true;
}

/* ---------- one-time conversion of a save made under the official Kingmaker rules ----------
   Keeps: name, character, level/XP, turn, log, map hexes and notes, settlement names,
   sizes and locations, and companions already seated. The founding choices carry over
   because the charter/heartland/government names are the same in both rule sets.
   Resets: flaws, structures, armies and RP — those don't map onto the new rules. */
function convertFromOfficialRules(){
  const old = state;
  const fresh = DEFAULT_STATE();
  fresh.started = true;
  fresh.name = old.name || 'Unnamed Realm';
  fresh.playerCharacter = old.playerCharacter || '';
  fresh.level = Math.max(1, Math.min(20, old.level||1));
  fresh.xp = old.xp||0;
  fresh.turn = old.turn||1;
  fresh.log = Array.isArray(old.log) ? old.log.slice() : [];

  const oc = old.creation || {};
  if(CHARTERS[oc.charter]) fresh.creation.charter = oc.charter;
  if(fresh.creation.charter==='Open' && VIRTUES.includes(oc.charterFreeBoost)) fresh.creation.charterVirtue = oc.charterFreeBoost;
  const heart = oc.heartland || (old.heartland && old.heartland.terrain);
  if(HEARTLANDS[heart]) fresh.creation.heartland = heart;
  let gov = oc.government || old.government || '';
  if(gov==='Yeomanry') gov = 'Yeomancy';
  if(GOVERNMENTS[gov]) fresh.creation.government = gov;
  if(VIRTUES.includes(oc.bonusBoost1)) fresh.creation.bonusVirtue = oc.bonusBoost1;
  fresh.pendingBoostLevels = VIRTUE_BOOST_LEVELS.filter(l=>l<=fresh.level);

  const goods = old.goods || {};
  COMMODITIES.forEach(g=>{ fresh.resources[g] = Math.max(0, parseInt(goods[g])||0); });

  const SITE_MAP = {'Farmland':'Farmland', 'Lumber Camp':'Lumberyard', 'Mine':'Mine', 'Quarry':'Mine'};
  Object.keys(old.hexes||{}).forEach(k=>{
    const h = old.hexes[k]; if(!h) return;
    fresh.hexes[k] = {
      name:h.name||'', type:h.type||'', note:h.note||'', terrain:h.terrain||'',
      resources:h.resources||'', features:h.features||'',
      resourceBuilding: SITE_MAP[h.workSite] || ''
    };
  });

  (old.settlements||[]).forEach(s=>{
    const oldStructures = [];
    const grids = s.grid ? [s.grid.lots, s.grid.lots2] : [];
    grids.forEach(lots=>(lots||[]).forEach(block=>(block||[]).forEach(slot=>{ if(slot && slot.name && !oldStructures.includes(slot.name)) oldStructures.push(slot.name); })));
    if(Array.isArray(s.structures)) s.structures.forEach(n=>{ if(!oldStructures.includes(n)) oldStructures.push(n); });
    let notes = s.notes || '';
    if(oldStructures.length) notes = (notes ? notes+'\n' : '') + `Structures under the old rules (rebuild them with the new building list): ${oldStructures.join(', ')}`;
    fresh.settlements.push({id:s.id||Date.now()+Math.random(), name:s.name||'Settlement', type:SETTLEMENT_SIZES.includes(s.type)?s.type:'Village', col:s.col, row:s.row, buildings:[], notes});
  });

  const ROLE_MAP = {Ruler:'Leader', Counselor:'Counselor', General:'General', Emissary:'Emissary', Magister:'Magister', Treasurer:'Treasurer', Viceroy:'Viceroy', Warden:'Warden'};
  Object.keys(old.leaders||{}).forEach(oldRole=>{
    const l = old.leaders[oldRole]; const role = ROLE_MAP[oldRole];
    if(!l || !role || l.vacant || !l.name) return;
    const short = COMPANIONS.find(c=>l.name===c || l.name===COMPANION_BIO_KEY[c]);
    if(l.pcHeld) fresh.council[role] = {holder:'__pc__', customName:'', customBonus:0, focus:0};
    else if(short && !COUNCIL_ROLES.some(r=>fresh.council[r].holder===short)) fresh.council[role] = {holder:short, customName:'', customBonus:0, focus:0};
    else fresh.council[role] = {holder:'__custom__', customName:l.name, customBonus:0, focus:0};
  });

  fresh.log.unshift({turn:fresh.turn, note:'Converted to the new kingdom rules. Flaws, structures, armies and RP were reset; map, notes and settlements were kept. Choose any pending Ability +2 boosts on the Virtues tab.'});
  state = fresh;
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
  if(!confirm(`Delete "${name}" permanently? This can't be undone — export a backup first with its ↓ button if you want to keep it.`)) return;
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
const fmt = n => (n>=0?'+':'')+n;
function escapeHtml(str){ return String(str==null?'':str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(str){ return escapeHtml(str); }
// For values dropped into single-quoted JS strings inside onclick="..." attributes.
function jsArg(str){ return escapeAttr(String(str).replace(/\\/g,'\\\\').replace(/'/g,"\\'")); }
function addLog(note){ state.log.unshift({turn:state.turn, note}); }

/* ---------- tags with attribution (same look as v1's ability tags) ---------- */
function sourceTags(list){
  if(!list.length) return '<span class="hint" style="margin:0;">nothing yet</span>';
  return `<div class="ability-tags">${list.map(x=>`<span class="ability-tag ${x.amt>=0?'pos':'neg'}">${escapeHtml(x.label)} ${fmt(x.amt)}</span>`).join('')}</div>`;
}

/* =====================================================================
   TAP-TO-EXPLAIN
===================================================================== */
const INFO_TIPS = Object.assign({
  'Kingdom DC': 'The difficulty for kingdom checks, set by your kingdom level.',
  'Ruin Threshold': 'If any flaw goes above this number, a Kingdom Event occurs. It rises as your kingdom levels up.',
  'Resource Die': 'Rolled in Collect Resources once per building (or Trade Agreement) you have for the chosen resource. Grows from d4 to d12 with kingdom level.',
  'Gold': 'Replaces RP. Earned mainly from Collect Taxes; spent on actions, buildings and armies.',
  'Advantage': 'Banked from a critical success on Collect Taxes. Spend one to roll a check twice and keep the higher result.',
  'Kingdom Check': 'Roll d20 + the virtue − its opposing flaw + the matching councilor\'s bonus + the Counselor\'s bonus. Meet the DC to succeed; beat it by 10 for a critical success. A natural 20 or 1 moves the result one step.',
  'Councilor Bonus': 'Each seated councilor adds their bonus for that seat (from the Companions table) to checks of their area. The Counselor\'s bonus is added to every check.',
  'Trade Agreement': 'Made with a foreign state you have contacted with Send Diplomatic Envoy. Each one lets you roll the Resource Die once for Luxuries.',
  'Kingdom Size': 'The number of hexes you\'ve claimed on the map (Capital, Claimed Territory, Settlements and Forts). Reaching 10, 25, 50 and 100 earns XP.',
  'Stationed': 'A unit whose army sits on a Settlement, Capital or Fort hex — or hasn\'t been deployed — pays the cheaper stationed cost.',
  'Debt': 'Owed after Request Foreign Aid. Track who you owe and what — the GM decides how it comes due.'
}, Object.fromEntries(Object.entries(TRAIT_BLURB).map(([k,v])=>[k, v + (VIRTUES.includes(k) ? ` Opposed by ${FLAW_OF[k]}.` : ` Opposes ${VIRTUE_OF[k]}: it is subtracted from ${VIRTUE_OF[k]} checks.`)])),
   Object.fromEntries(COUNCIL_ROLES.map(r=>[r, ROLE_BLURB[r]])));
function showInfoTip(term){
  const text = INFO_TIPS[term] || 'No description available yet.';
  const overlay = document.createElement('div');
  overlay.id = 'info-tip-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:140;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div class="card" style="max-width:320px;width:100%;margin:0;">
    <h3 style="margin-bottom:6px;">${escapeHtml(term)}</h3>
    <div class="hint" style="margin-top:0;">${escapeHtml(text)}</div>
  </div>`;
  overlay.addEventListener('click', ()=>overlay.remove());
  document.body.appendChild(overlay);
}
function infoIcon(term){
  return `<span class="info-icon" onclick="event.stopPropagation();showInfoTip('${jsArg(term)}')" title="What's this?">ⓘ</span>`;
}

/* =====================================================================
   OVERLAYS — one stack of modal cards, newest on top
===================================================================== */
function openOverlay(id, html, z){
  closeOverlay(id);
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.className = 'kl-overlay';
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.74);z-index:${z||110};display:flex;align-items:center;justify-content:center;padding:16px;`;
  overlay.innerHTML = `<div class="card" style="max-width:460px;width:100%;max-height:88vh;overflow-y:auto;margin:0;">${html}</div>`;
  document.body.appendChild(overlay);
  return overlay;
}
function closeOverlay(id){ const el=document.getElementById(id); if(el) el.remove(); }

/* =====================================================================
   THE CHECK DIALOG — every kingdom roll in the app goes through here.
   opts: {title, virtue, councilor, altVirtue, advantageAction, note, onResolve(degree, roll)}
===================================================================== */
let pendingCheck = null;
function openCheck(opts){
  pendingCheck = Object.assign({useBanked:false, virtueChosen:opts.virtue}, opts);
  renderCheckDialog();
}
function renderCheckDialog(){
  const c = pendingCheck; if(!c) return;
  const virtue = c.virtueChosen;
  const parts = checkParts(virtue, c.councilor);
  const mod = sumAmt(parts);
  const dc = kingdomDC();
  const buildingAdv = c.extraAdvantage || (c.advantageAction ? advantageSourceFor(c.advantageAction) : null);
  const adv = !!buildingAdv || c.useBanked;
  openOverlay('check-overlay', `
    <h3 style="margin-bottom:4px;">${escapeHtml(c.title)}</h3>
    ${c.note ? `<div class="hint" style="margin-top:0;">${c.note}</div>` : ''}
    ${c.altVirtue ? `<div class="boost-picker" style="margin-top:8px;">${[c.virtue,c.altVirtue].map(v=>`<button type="button" class="${virtue===v?'selected':''}" onclick="pendingCheck.virtueChosen='${v}';renderCheckDialog();">${v} check</button>`).join('')}</div>` : ''}
    <div class="check-box">
      <div class="check-line"><span>${VIRTUE_SHORT[virtue]} check</span><span class="mono">d20 ${mod>=0?'+':'−'} ${Math.abs(mod)} vs DC ${dc}${infoIcon('Kingdom Check')}</span></div>
      ${sourceTags(parts)}
      ${buildingAdv ? `<div class="hint">Advantage from ${escapeHtml(buildingAdv)} — roll twice, keep the higher.</div>` : ''}
      ${!buildingAdv && state.advantages>0 ? `<label class="hint" style="display:flex;gap:6px;align-items:center;"><input type="checkbox" ${c.useBanked?'checked':''} onchange="pendingCheck.useBanked=this.checked;renderCheckDialog();"> Spend a banked Advantage (${state.advantages} left)</label>` : ''}
    </div>
    <button class="action" onclick="rollCheckForMe()">Roll for me${adv?' (with Advantage)':''}</button>
    <div class="row" style="border:none;padding-top:10px;">
      <div class="label">…or enter your own d20<small>the natural roll, before modifiers${adv?' — the higher of your two':''}</small></div>
      <input class="num" type="number" min="1" max="20" id="check-manual-d20" placeholder="d20">
    </div>
    <button class="ghost" onclick="resolveCheckManual()">Use my roll</button>
    <button class="ghost" style="margin-top:8px;" onclick="cancelCheck()">Cancel</button>
  `, 125);
}
function rollCheckForMe(){
  const c = pendingCheck; if(!c) return;
  const adv = !!(c.extraAdvantage || (c.advantageAction && advantageSourceFor(c.advantageAction))) || c.useBanked;
  let nat = rollDie(20), other = null;
  if(adv){ other = rollDie(20); if(other>nat){ const t=nat; nat=other; other=t; } }
  finishCheck(nat, other);
}
function resolveCheckManual(){
  const v = parseInt(document.getElementById('check-manual-d20').value,10);
  if(!v || v<1 || v>20){ alert('Enter the natural d20 result (1–20).'); return; }
  finishCheck(v, null);
}
function finishCheck(nat, other){
  const c = pendingCheck; if(!c) return;
  if(c.useBanked && !(c.extraAdvantage || (c.advantageAction && advantageSourceFor(c.advantageAction)))) state.advantages = Math.max(0, state.advantages-1);
  const mod = checkModifier(c.virtueChosen, c.councilor);
  const total = nat + mod;
  const dc = kingdomDC();
  const degree = degreeOf(nat, total, dc);
  const roll = {nat, other, mod, total, dc, virtue:c.virtueChosen, text:`${VIRTUE_SHORT[c.virtueChosen]} ${nat}${other!==null?` (other ${other})`:''} ${fmt(mod)} = ${total} vs DC ${dc}`};
  pendingCheck = null;
  closeOverlay('check-overlay');
  c.onResolve(degree, roll);
}
function cancelCheck(){ pendingCheck = null; closeOverlay('check-overlay'); }
function degreeBanner(degree, roll){
  return `<div class="degree-banner ${DEGREE_CLASS[degree]}"><b>${DEGREE_LABEL[degree]}</b><span class="mono">${escapeHtml(roll.text)}</span></div>`;
}
// A short result card shown after anything resolves, so the outcome is never silent.
function showResult(title, degree, roll, bodyHtml){
  openOverlay('result-overlay', `
    <h3 style="margin-bottom:6px;">${escapeHtml(title)}</h3>
    ${roll ? degreeBanner(degree, roll) : ''}
    <div class="hint" style="margin-top:8px;">${bodyHtml||''}</div>
    <button class="action" style="margin-top:12px;" onclick="closeOverlay('result-overlay');render();">OK</button>
  `, 130);
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
  applyTabLabels();
  render();
  buildHexGrid();
}
function openSwitchKingdom(){ showKingdomPicker(); }
function closeSwitchKingdom(){ if(!currentKingdomId || !state) return; enterMainApp(); }
// Labels are set from JS because a hot update replaces app.js but keeps the
// index.html that shipped inside the installed APK.
const TAB_LABELS = {overview:['⛭','Kingdom'], abilities:['◈','Virtues'], leaders:['♛','Council'], goods:['⚖','Resources'], map:['⬡','Map'], notes:['⌂','Towns'], warfare:['⚔','War (Beta)']};
function applyTabLabels(){
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    const l = TAB_LABELS[btn.dataset.tab];
    if(l) btn.innerHTML = `<span class="icon">${l[0]}</span>${l[1]}`;
  });
}

/* =====================================================================
   CREATION SCREEN
===================================================================== */
let creationStep = 0; // 0 picker, 1 charter, 2 heartland, 3 government, 4 bonus boost, 5 name
let draft = null;
const CREATION_STEP_COUNT = 5;
function startCreation(){
  draft = {charter:'', charterVirtue:'', heartland:'', government:'', bonusVirtue:'', name:'', playerCharacter:''};
  creationStep = 1;
  renderCreationScreen();
}
function creationStepDots(){
  let dots='';
  for(let i=1;i<=CREATION_STEP_COUNT;i++) dots += `<div class="dot ${i<creationStep?'done':''} ${i===creationStep?'active':''}"></div>`;
  return `<div class="creation-steps">${dots}</div>`;
}
function virtuePicker(current, onPick){
  return `<div class="boost-picker">${VIRTUES.map(v=>`<button type="button" class="${current===v?'selected':''}" onclick="${onPick}('${v}')">${v}</button>`).join('')}</div>`;
}
function modsLine(mods){
  return Object.entries(mods).map(([k,v])=> FLAWS.includes(k) ? `<b style="color:var(--rust);">+${v} ${k}</b>` : `<b>+${v} ${k}</b>`).join(', ');
}
// Running total of the draft's founding stats, shown on every creation step.
function draftPreview(){
  const saved = state;
  state = DEFAULT_STATE();
  state.creation = {charter:draft.charter, charterVirtue:draft.charterVirtue, heartland:draft.heartland, government:draft.government, bonusVirtue:draft.bonusVirtue};
  const html = `<div class="draft-preview">${VIRTUES.map(v=>`<div><span>${VIRTUE_SHORT[v]}</span><b>${virtueValue(v)}</b><i>${flawValue(FLAW_OF[v])||''}</i></div>`).join('')}</div>
    <div class="hint" style="margin-top:4px;text-align:center;">Virtue on top, opposing flaw underneath — everything starts at 0.</div>`;
  state = saved;
  return html;
}
function renderCreationScreen(){
  const el = document.getElementById('creation-screen');
  let body = '';
  if(creationStep===0){
    const hasCurrent = !!(state && currentKingdomId);
    const rows = kingdomIndex.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    body = `
      <div class="creation-crest"><div class="glyph">⬡</div><h1>Kingdom Ledger</h1><div class="tag">Stolen Lands</div></div>
      ${hasCurrent ? `<button class="action" onclick="closeSwitchKingdom()">← Back to ${escapeHtml(state.name)}</button>` : ''}
      <button class="${hasCurrent?'ghost':'action'}" style="margin-top:8px;" onclick="startCreation()">+ New Kingdom</button>
      ${rows.length ? `
        <div class="hint" style="margin:16px 0 6px;">Your kingdoms</div>
        <div class="kingdom-list">
          ${rows.map(k=>`
            <div class="kingdom-row ${k.id===currentKingdomId?'current':''}">
              <button type="button" class="kingdom-row-open" onclick="openKingdom('${k.id}')">
                <div class="opt-name">${escapeHtml(k.name)}</div>
                <div class="opt-detail">${k.government?escapeHtml(k.government)+' · ':''}Level ${k.level}${k.updatedAt?' · '+new Date(k.updatedAt).toLocaleDateString():''}${k.rulesVersion===RULES_VERSION?'':' · old rules — converts when opened'}</div>
              </button>
              <button type="button" class="kingdom-row-export" onclick="exportKingdomById('${k.id}')" title="Export">↓</button>
              <button type="button" class="kingdom-row-delete" onclick="confirmDeleteKingdom('${k.id}')" title="Delete">✕</button>
            </div>`).join('')}
        </div>` : ''}
      <input type="file" accept="application/json" id="creation-import-input" style="display:none;" onchange="importStateFile(this)">
      <button class="ghost" style="margin-top:14px;" onclick="document.getElementById('creation-import-input').click()">↑ Load from a backup file</button>
      <div class="card" style="margin-top:20px;">
        <h3>Backup</h3>
        <div class="hint" style="margin-top:0;">Kingdoms are saved on this device only. Use ↓ on a kingdom to back it up or move it to another device, then load that file with the button above. Kingdoms made under the old official rules convert automatically the first time you open them — export one first if you want to keep the old version.</div>
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
    body = `${creationStepDots()}
      <h3 style="margin-bottom:4px;">1 · Charter</h3>
      <div class="hint" style="margin-top:0;margin-bottom:12px;">Your contract with Restov.</div>
      ${Object.entries(CHARTERS).map(([name,c])=>`
        <button type="button" class="option-card ${draft.charter===name?'selected':''}" onclick="pickDraft('charter','${name}')">
          <div class="opt-name">${name}</div>
          <div class="opt-detail">${c.blurb}<br>${c.freeVirtue ? '<b>+2 to any one virtue</b>' : modsLine(c.mods)}</div>
        </button>`).join('')}
      ${draft.charter==='Open' ? `<div class="hint">Open charter — choose your +2:</div>${virtuePicker(draft.charterVirtue,'pickCharterVirtue')}` : ''}
      ${draftPreview()}
      <div class="creation-nav">
        <button class="ghost" onclick="creationStep=0;renderCreationScreen();">Back</button>
        <button class="action" ${(!draft.charter||(draft.charter==='Open'&&!draft.charterVirtue))?'disabled style="opacity:.4;"':''} onclick="creationStep=2;renderCreationScreen();">Continue</button>
      </div>`;
  }
  else if(creationStep===2){
    body = `${creationStepDots()}
      <h3 style="margin-bottom:4px;">2 · Heartland</h3>
      <div class="hint" style="margin-top:0;margin-bottom:12px;">The homeland of your people. Your capital must stand on a hex of this terrain.</div>
      ${Object.entries(HEARTLANDS).map(([name,h])=>`
        <button type="button" class="option-card ${draft.heartland===name?'selected':''}" onclick="pickDraft('heartland','${name}')">
          <div class="opt-name">${name}</div>
          <div class="opt-detail">${h.blurb}<br><b>+2 ${h.virtue}</b>, Advantage on ${h.advantage==='Luxuries'?'Trade Agreements':h.advantage+' rolls'}</div>
        </button>`).join('')}
      ${draftPreview()}
      <div class="creation-nav">
        <button class="ghost" onclick="creationStep=1;renderCreationScreen();">Back</button>
        <button class="action" ${!draft.heartland?'disabled style="opacity:.4;"':''} onclick="creationStep=3;renderCreationScreen();">Continue</button>
      </div>`;
  }
  else if(creationStep===3){
    body = `${creationStepDots()}
      <h3 style="margin-bottom:4px;">3 · Government</h3>
      <div class="hint" style="margin-top:0;margin-bottom:12px;">This is who rules.</div>
      ${Object.entries(GOVERNMENTS).map(([name,g])=>`
        <button type="button" class="option-card ${draft.government===name?'selected':''}" onclick="pickDraft('government','${name}')">
          <div class="opt-name">${name}</div>
          <div class="opt-detail">${g.blurb}<br>${modsLine(g.mods)}</div>
        </button>`).join('')}
      ${draftPreview()}
      <div class="creation-nav">
        <button class="ghost" onclick="creationStep=2;renderCreationScreen();">Back</button>
        <button class="action" ${!draft.government?'disabled style="opacity:.4;"':''} onclick="creationStep=4;renderCreationScreen();">Continue</button>
      </div>`;
  }
  else if(creationStep===4){
    body = `${creationStepDots()}
      <h3 style="margin-bottom:4px;">4 · One more +2</h3>
      <div class="hint" style="margin-top:0;margin-bottom:12px;">Boost an additional virtue of your choice by +2.</div>
      ${virtuePicker(draft.bonusVirtue,'pickBonusVirtue')}
      ${draftPreview()}
      <div class="creation-nav">
        <button class="ghost" onclick="creationStep=3;renderCreationScreen();">Back</button>
        <button class="action" ${!draft.bonusVirtue?'disabled style="opacity:.4;"':''} onclick="creationStep=5;renderCreationScreen();">Continue</button>
      </div>`;
  }
  else if(creationStep===5){
    body = `${creationStepDots()}
      <h3 style="margin-bottom:4px;">5 · Name your kingdom</h3>
      <div class="hint" style="margin-top:0;margin-bottom:12px;">You start at level 1, size 1, with a d4 Resource Die, a Ruin threshold of 10 and one action in every category. Next you'll place your capital and your first resource building.</div>
      <div class="row" style="border:none;padding-top:0;">
        <div class="label" style="flex:0 0 90px;">Kingdom</div>
        <input class="wide" type="text" value="${escapeAttr(draft.name)}" placeholder="Unnamed Realm" oninput="draft.name=this.value;">
      </div>
      <div class="row" style="border:none;">
        <div class="label" style="flex:0 0 90px;">Your Character</div>
        <input class="wide" type="text" value="${escapeAttr(draft.playerCharacter)}" placeholder="e.g. Bilbo" oninput="draft.playerCharacter=this.value;">
      </div>
      ${draftPreview()}
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
function pickDraft(field, value){
  draft[field] = draft[field]===value ? '' : value;
  if(field==='charter') draft.charterVirtue = '';
  renderCreationScreen();
}
function pickCharterVirtue(v){ draft.charterVirtue = v; renderCreationScreen(); }
function pickBonusVirtue(v){ draft.bonusVirtue = v; renderCreationScreen(); }
async function finishCreation(btn){
  if(btn){ btn.textContent = 'Founding…'; btn.style.opacity = '0.7'; }
  try{
    if(!draft){ alert('Something reset your progress — please go through the steps again.'); creationStep=0; renderCreationScreen(); return; }
    state = DEFAULT_STATE();
    state.started = true;
    state.name = (draft.name||'').trim() || 'Unnamed Realm';
    state.playerCharacter = (draft.playerCharacter||'').trim();
    state.creation = {charter:draft.charter, charterVirtue:draft.charterVirtue, heartland:draft.heartland, government:draft.government, bonusVirtue:draft.bonusVirtue};
    addLog(`Founded ${state.name}: ${draft.charter} charter, ${draft.heartland} heartland, ${draft.government}.`);
    currentKingdomId = newId();
    await saveCurrentKingdom();
    enterMainApp();
    startPickCapital();
  }catch(e){
    console.error('finishCreation failed:', e);
    if(btn){ btn.textContent = 'Found Your Kingdom'; btn.style.opacity = '1'; }
    alert('Something went wrong founding your kingdom: ' + e.message);
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
  if(!state) return;
  document.getElementById('kingdomName').value = state.name;
  safeRender(renderOverview, 'tab-overview');
  safeRender(renderVirtuesTab, 'tab-abilities');
  safeRender(renderCouncilTab, 'tab-leaders');
  safeRender(renderResourcesTab, 'tab-goods');
  safeRender(renderMapExtras, null);
  safeRender(renderTownsTab, 'tab-notes');
  safeRender(renderWarfareTab, 'tab-warfare');
  if(document.getElementById('turn-overlay')) safeRender(renderTurnGuide, null);
}
function switchTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if(btn) btn.classList.add('active');
  document.getElementById('tab-'+tab).classList.add('active');
  document.querySelector('header.top').style.display = (tab==='overview') ? 'flex' : 'none';
  if(tab==='map') setTimeout(measureMapLayout, 0);
  window.scrollTo(0,0);
}
function stepperHtml(onMinus, onPlus){
  return `<div class="stepper"><button onclick="${onMinus}">−</button><button onclick="${onPlus}">+</button></div>`;
}

/* ---------- alerts that need the player's attention, shown on the Kingdom tab ---------- */
function attentionItems(){
  const items = [];
  if(!capitalHex()) items.push(`Your capital isn't on the map yet. <span class="loc-link" onclick="startPickCapital()">Place it now</span>`);
  else if(!state.foundingResourceDone) items.push(`Founding step 8: place one resource building next to your capital, or take a Trade Agreement. <span class="loc-link" onclick="openFoundingResource()">Do it now</span>`);
  if(state.pendingBoostLevels.length) items.push(`You have ${state.pendingBoostLevels.length} Ability +2 to choose. <span class="loc-link" onclick="switchTab('abilities')">Choose</span>`);
  if(state.xp>=XP_PER_LEVEL && state.level<20) items.push(`You have ${state.xp} XP — ready to reach level ${state.level+1}. <span class="loc-link" onclick="doLevelUp()">Level up</span>`);
  flawsOverRuin().forEach(f=>items.push(`<b>${f}</b> is ${flawValue(f)}, above the Ruin threshold of ${ruinThreshold()} — a Kingdom Event occurs. <span class="loc-link" onclick="switchTab('abilities')">See ${f}</span>`));
  const size = kingdomSize();
  SIZE_MILESTONES.forEach(m=>{
    if(size>=m && !(state.sizeMilestonesNoted||[]).includes(m)) items.push(`Kingdom Size reached ${m} — that earns XP. <span class="loc-link" onclick="noteSizeMilestone(${m})">Got it</span>`);
  });
  return items;
}
function noteSizeMilestone(m){
  state.sizeMilestonesNoted = (state.sizeMilestonesNoted||[]).concat(m);
  addLog(`Kingdom Size reached ${m}.`);
  scheduleSave(); render();
}

/* ---------- KINGDOM (overview) ---------- */
function renderOverview(){
  const c = state.creation;
  const attention = attentionItems();
  const ts = state.turnState;
  const nextLevelXp = XP_PER_LEVEL;
  document.getElementById('tab-overview').innerHTML = `
    <div class="card">
      <div class="row" style="border:none;padding-bottom:4px;">
        <div class="label">Your Character</div>
        <input type="text" value="${escapeAttr(state.playerCharacter)}" placeholder="Character name" style="max-width:160px;" onchange="state.playerCharacter=this.value;scheduleSave();">
      </div>
      <div class="hint" style="margin-top:0;">${escapeHtml(c.charter||'—')} charter · ${escapeHtml(c.heartland||'—')} · ${escapeHtml(c.government||'—')}${capitalSettlement()?' · Capital: '+escapeHtml(capitalSettlement().name):''}</div>
    </div>

    ${attention.length ? `<div class="card attention-card"><h3>Needs your attention</h3>${attention.map(a=>`<div class="attention-item">${a}</div>`).join('')}</div>` : ''}

    <div class="card turn-card">
      <div class="card-head-row"><h3 style="margin-bottom:0;">Kingdom Turn ${state.turn}</h3>${ts ? `<span class="pill" style="color:var(--gold);border-color:var(--gold-dim);">Step ${ts.step} of 10</span>` : ''}</div>
      <div class="hint" style="margin-top:4px;">Walks you through all 10 steps in order — councilors, event, taxes, resources, then your actions and army costs. Close it any time and pick up where you left off.</div>
      <button class="action" onclick="openTurnGuide()">${ts ? 'Resume Kingdom Turn' : 'Start Kingdom Turn'}</button>
    </div>

    <div class="stat-grid">
      <div class="seal"><div class="val mono">${state.level}</div><div class="lbl">Level</div><div class="sub">${state.xp} / ${nextLevelXp} XP</div></div>
      <div class="seal"><div class="val mono">${kingdomDC()}</div><div class="lbl">Kingdom DC${infoIcon('Kingdom DC')}</div><div class="sub">for checks</div></div>
      <div class="seal"><div class="val mono">${kingdomSize()}</div><div class="lbl">Size${infoIcon('Kingdom Size')}</div><div class="sub">hexes</div></div>
      <div class="seal"><div class="val mono">${ruinThreshold()}</div><div class="lbl">Ruin${infoIcon('Ruin Threshold')}</div><div class="sub">threshold</div></div>
      <div class="seal"><div class="val mono">d${resourceDieSides()}</div><div class="lbl">Resource Die${infoIcon('Resource Die')}</div><div class="sub">${resourceChoicesPerTurn()} resource${resourceChoicesPerTurn()>1?'s':''}/turn</div></div>
      <div class="seal"><div class="val mono">${state.advantages}</div><div class="lbl">Advantages${infoIcon('Advantage')}</div><div class="sub">banked</div></div>
    </div>

    <div class="card">
      <div class="card-head-row"><h3 style="margin-bottom:0;">Treasury</h3><button class="small-ghost" onclick="switchTab('goods')">Manage</button></div>
      <div class="commod-row" style="grid-template-columns:repeat(5,1fr);">
        ${['Gold'].concat(COMMODITIES).map(g=>`
          <div class="commod-cell"><div class="icon">${RES_ICON[g]}</div><div class="name">${g}</div><div class="val">${state.resources[g]}</div></div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-head-row"><h3 style="margin-bottom:0;">Virtues &amp; Flaws</h3><button class="small-ghost" onclick="switchTab('abilities')">Details</button></div>
      <div class="vf-grid">
        ${VIRTUES.map(v=>{
          const f = FLAW_OF[v], fv = flawValue(f), over = fv>ruinThreshold();
          return `<div class="vf-cell"><div class="vf-v"><span>${v}</span><b>${virtueValue(v)}</b></div><div class="vf-f ${over?'over':''}"><span>${f}</span><b>${fv}</b></div><div class="vf-mod">check ${fmt(checkModifier(v))}</div></div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-head-row"><h3 style="margin-bottom:0;">Council</h3><button class="small-ghost" onclick="switchTab('leaders')">Edit</button></div>
      <table class="lead-table">
        <thead><tr><th>Seat</th><th>Councilor</th><th>Bonus</th></tr></thead>
        <tbody>${COUNCIL_ROLES.map(r=>`<tr><td>${r}</td><td>${state.council[r].holder?escapeHtml(seatHolderName(r)):'<span style="color:var(--rust);font-style:italic;">Vacant</span>'}</td><td class="mono">${state.council[r].holder?fmt(seatBonus(r)):'—'}</td></tr>`).join('')}</tbody>
      </table>
    </div>

    <div class="summary-pair">
      <div class="summary-card"><div class="big mono">${state.settlements.length}</div><div class="lbl">Settlements</div><button class="small-ghost" style="margin-top:10px;" onclick="switchTab('notes')">View</button></div>
      <div class="summary-card"><div class="big mono">${fortCount()}</div><div class="lbl">Forts · Roads ${state.roads?'built':'none'}</div><button class="small-ghost" style="margin-top:10px;" onclick="switchTab('map')">Map</button></div>
    </div>

    <div class="card">
      <h3>Kingdom XP</h3>
      <div class="xpbar"><div class="xpbar-fill" style="width:${Math.min(100,state.xp/XP_PER_LEVEL*100)}%"></div></div>
      <div class="hint">${state.xp>=XP_PER_LEVEL ? 'Ready to level up.' : (XP_PER_LEVEL-state.xp)+' XP to level '+(state.level+1)+' — '+escapeHtml(LEVEL_TABLE[Math.min(20,state.level+1)].boon)+'.'}</div>
      <div class="row" style="border:none;padding-top:10px;gap:6px;">
        <select id="xp-reason" style="flex:1;min-width:0;">${XP_SOURCES.map(s=>`<option>${s}</option>`).join('')}</select>
        <input class="num" type="number" id="xp-add" placeholder="XP" style="width:64px;">
        <button class="action" style="width:auto;margin:0;padding:7px 12px;" onclick="addXp()">Add</button>
      </div>
      ${state.xp>=XP_PER_LEVEL && state.level<20 ? `<button class="action" style="background:var(--gold);color:var(--bg);border-color:var(--gold);margin-top:10px;" onclick="doLevelUp()">↑ Level Up to ${state.level+1}</button>` : ''}
      ${(state.xpLog||[]).length ? `<div class="divider"></div>${state.xpLog.slice(0,6).map(x=>`<div class="hint" style="margin-top:2px;">Turn ${x.turn}: +${x.amt} — ${escapeHtml(x.reason)}</div>`).join('')}` : ''}
      <div class="two-col" style="margin-top:10px;">
        <div><div class="hint" style="margin-top:0;">Set XP</div><input class="num" type="number" value="${state.xp}" onchange="state.xp=Math.max(0,parseInt(this.value)||0);scheduleSave();render();"></div>
        <div><div class="hint" style="margin-top:0;">Set Level</div><input class="num" type="number" min="1" max="20" value="${state.level}" onchange="setLevelDirect(this.value)"></div>
      </div>
    </div>

    <div class="card">
      <h3>Active Events</h3>
      ${state.events.length ? state.events.map((e,i)=>`<div class="log-entry"><div class="meta">Turn ${e.turn} <span class="loc-link" style="float:right;" onclick="resolveEventEntry(${i})">resolved</span></div><div class="note">${escapeHtml(e.text)}</div></div>`).join('') : '<div class="hint" style="margin-top:0;">No active events.</div>'}
      <div class="tag-input-row"><input class="wide" type="text" id="new-event-text" placeholder="Add an ongoing event"><button class="action" style="width:auto;margin:0;" onclick="addEventEntry(document.getElementById('new-event-text').value)">Add</button></div>
    </div>

    <div class="card">
      <div class="card-head-row"><h3 style="margin-bottom:0;">Turn Log</h3></div>
      <textarea class="wide" id="in-lognote" placeholder="What happened this turn..." rows="2" style="margin-top:10px;"></textarea>
      <button class="action" onclick="addLogEntry()">Add to log</button>
      ${state.log.length ? `<div class="divider"></div>${state.log.slice(0,40).map((l,i)=>`
        <div class="log-entry"><div class="meta">Turn ${l.turn} <span onclick="removeLogEntry(${i})" style="cursor:pointer;color:var(--rust);float:right;">remove</span></div><div class="note">${escapeHtml(l.note)}</div></div>`).join('')}` : ''}
    </div>`;
}
function addXp(){
  const amt = parseInt(document.getElementById('xp-add').value)||0;
  if(!amt) return;
  const reason = document.getElementById('xp-reason').value;
  state.xp = Math.max(0, state.xp + amt);
  state.xpLog = [{turn:state.turn, amt, reason}].concat(state.xpLog||[]).slice(0,50);
  scheduleSave(); render();
}
function setLevelDirect(v){
  const n = Math.max(1, Math.min(20, parseInt(v)||1));
  if(n>state.level){
    VIRTUE_BOOST_LEVELS.filter(l=>l>state.level && l<=n).forEach(l=>{ if(!state.pendingBoostLevels.includes(l)) state.pendingBoostLevels.push(l); });
  } else {
    state.levelBoosts = state.levelBoosts.filter(b=>b.level<=n);
    state.pendingBoostLevels = state.pendingBoostLevels.filter(l=>l<=n);
  }
  state.level = n;
  scheduleSave(); render();
}
function addLogEntry(){
  const v = document.getElementById('in-lognote').value.trim();
  if(!v) return;
  addLog(v); scheduleSave(); render();
}
function removeLogEntry(i){ state.log.splice(i,1); scheduleSave(); render(); }
function addEventEntry(text){
  text = (text||'').trim(); if(!text) return;
  state.events.unshift({text, turn:state.turn});
  scheduleSave(); render();
}
function resolveEventEntry(i){
  const e = state.events.splice(i,1)[0];
  if(e) addLog('Event resolved: '+e.text+' (resolving a Kingdom Event earns XP).');
  scheduleSave(); render();
}

/* ---------- level up ---------- */
function doLevelUp(){
  if(state.xp < XP_PER_LEVEL || state.level>=20) return;
  state.xp -= XP_PER_LEVEL;
  state.level += 1;
  const row = LEVEL_TABLE[state.level];
  if(row.virtueBoost) state.pendingBoostLevels.push(state.level);
  addLog(`Reached kingdom level ${state.level}: ${row.boon}.`);
  scheduleSave();
  openOverlay('levelup-overlay', `
    <h3>Level ${state.level}!</h3>
    <div class="hint" style="margin-top:0;">${escapeHtml(row.boon)}.</div>
    <div class="hint">Kingdom DC is now <b>${row.dc}</b> and the Ruin threshold is <b>${row.ruin}</b>.</div>
    ${row.virtueBoost ? `<div class="hint" style="margin-top:10px;">Choose a virtue for your +2:</div>${VIRTUES.map(v=>`<button class="option-card" style="padding:9px 12px;margin-bottom:6px;" onclick="chooseBoost(${state.level},'${v}');closeOverlay('levelup-overlay');"><div class="opt-name" style="font-size:13px;">${v} <span class="mono" style="float:right;">${virtueValue(v)} → ${virtueValue(v)+2}</span></div></button>`).join('')}<button class="ghost" onclick="closeOverlay('levelup-overlay');render();">Decide later</button>` : `<button class="action" style="margin-top:10px;" onclick="closeOverlay('levelup-overlay');render();">OK</button>`}
  `, 120);
  render();
}
function chooseBoost(level, virtue){
  state.pendingBoostLevels = state.pendingBoostLevels.filter(l=>l!==level);
  state.levelBoosts = state.levelBoosts.filter(b=>b.level!==level).concat({level, virtue});
  addLog(`Level ${level} Ability +2 → ${virtue}.`);
  scheduleSave(); render();
}

/* ---------- VIRTUES & FLAWS tab ---------- */
let showLevelTable = false;
function renderVirtuesTab(){
  const el = document.getElementById('tab-abilities');
  const ruin = ruinThreshold();
  el.innerHTML = `
    ${state.pendingBoostLevels.length ? `<div class="card attention-card"><h3>Choose your Ability +2</h3>
      ${state.pendingBoostLevels.slice().sort((a,b)=>a-b).map(l=>`<div class="hint" style="margin-top:6px;">Level ${l}:</div>${virtuePicker('', 'chooseBoost.bind(null,'+l+')')}`).join('')}
    </div>` : ''}
    <div class="card">
      <h3>How checks work${infoIcon('Kingdom Check')}</h3>
      <div class="hint" style="margin-top:0;">d20 + virtue − opposing flaw + councilor bonus vs <b>DC ${kingdomDC()}</b>. If a flaw goes above <b>${ruin}</b> (Ruin threshold), a Kingdom Event occurs.</div>
    </div>
    ${VIRTUES.map(v=>{
      const f = FLAW_OF[v];
      const fv = flawValue(f);
      const over = fv>ruin;
      const role = VIRTUE_COUNCILOR[v];
      return `<div class="card vf-card">
        <div class="vf-head">
          <div><div class="vf-name">${v}${infoIcon(v)}</div><div class="vf-big mono">${virtueValue(v)}</div></div>
          <div class="vf-vs">vs</div>
          <div style="text-align:right;"><div class="vf-name ${over?'over':''}">${f}${infoIcon(f)}</div><div class="vf-big mono ${over?'over':''}">${fv}</div></div>
        </div>
        ${over ? `<div class="hint" style="color:var(--rust);margin-top:0;">Above the Ruin threshold (${ruin}) — a Kingdom Event occurs.</div>` : `<div class="ruin-bar"><div style="width:${Math.min(100, fv/ruin*100)}%"></div></div><div class="hint" style="margin-top:2px;">${f} ${fv} of ${ruin} before Ruin</div>`}
        <div class="hint" style="margin-top:8px;">${v} from:</div>${sourceTags(virtueSources(v))}
        <div class="hint" style="margin-top:8px;">${f} from:</div>${sourceTags(flawSources(f))}
        <div class="row" style="margin-top:8px;">
          <div class="label">${v} check<small>${role} seat · ${state.council[role].holder?escapeHtml(seatHolderName(role)):'vacant'}</small></div>
          <div class="mono" style="font-size:16px;">${fmt(checkModifier(v))}</div>
        </div>
        <div class="row">
          <div class="label">Adjust ${f}<small>events, failed taxes, reductions</small></div>
          ${stepperHtml(`adjustFlaw('${f}',-1)`, `adjustFlaw('${f}',1)`)}
        </div>
        <div class="row">
          <div class="label">Adjust ${v}<small>GM rewards or penalties</small></div>
          ${stepperHtml(`adjustVirtue('${v}',-1)`, `adjustVirtue('${v}',1)`)}
        </div>
      </div>`;
    }).join('')}
    <div class="card">
      <div class="card-head-row"><h3 style="margin-bottom:0;">Level Table</h3><button class="small-ghost" onclick="showLevelTable=!showLevelTable;renderVirtuesTab();">${showLevelTable?'Hide':'Show'}</button></div>
      ${showLevelTable ? `<table class="lead-table" style="margin-top:8px;"><thead><tr><th>Lvl</th><th>Boon</th><th>DC</th><th>Ruin</th></tr></thead><tbody>
        ${Object.keys(LEVEL_TABLE).map(Number).map(l=>`<tr style="${l===state.level?'color:var(--gold);':''}"><td>${l}</td><td>${escapeHtml(LEVEL_TABLE[l].boon)}${state.levelBoosts.find(b=>b.level===l)?` → ${state.levelBoosts.find(b=>b.level===l).virtue}`:''}</td><td>${LEVEL_TABLE[l].dc}</td><td>${LEVEL_TABLE[l].ruin}</td></tr>`).join('')}
      </tbody></table>` : ''}
    </div>`;
}
function adjustFlaw(f, d){ changeFlaw(f, d); scheduleSave(); render(); }
function adjustVirtue(v, d){ state.virtueAdjust[v] = (state.virtueAdjust[v]||0)+d; scheduleSave(); render(); }

/* ---------- COUNCIL tab ---------- */
let expandedNPCs = new Set();
function toggleNPCCard(name){ if(expandedNPCs.has(name)) expandedNPCs.delete(name); else expandedNPCs.add(name); renderCouncilTab(); }
function renderCouncilTab(){
  const el = document.getElementById('tab-leaders');
  const lb = councilorLevelBonus();
  el.innerHTML = `
    <div class="card">
      <h3>Council${infoIcon('Councilor Bonus')}</h3>
      <div class="hint" style="margin-top:0;">Seat a companion and their bonus for that seat applies to checks of its area. The Counselor's bonus is added to every check. You can swap councilors at any time.${lb?` Level ${lvl()>=16?16:8}: +${lb} to every seated councilor.`:''}</div>
    </div>
    ${COUNCIL_ROLES.map(role=>{
      const seat = state.council[role];
      const area = role==='Counselor' ? 'all checks' : role==='Emissary' ? 'diplomacy & spying actions' : (Object.keys(VIRTUE_COUNCILOR).find(v=>VIRTUE_COUNCILOR[v]===role)||'') + ' checks';
      return `<div class="card council-card">
        <div class="card-head-row"><h3 style="margin-bottom:0;">${role}${infoIcon(role)}</h3><span class="pill">${area}</span></div>
        <select style="width:100%;margin-top:8px;" onchange="seatCouncilor('${role}', this.value)">
          <option value="">— Vacant —</option>
          <option value="__pc__" ${seat.holder==='__pc__'?'selected':''}>★ ${escapeHtml(state.playerCharacter||'Your character')}</option>
          ${COMPANIONS.map(n=>{
            const elsewhere = companionSeat(n);
            const b = COMPANION_BONUS[n][role];
            return `<option value="${n}" ${seat.holder===n?'selected':''}>${n} (${fmt(b)})${elsewhere && elsewhere!==role?' — now '+elsewhere:''}</option>`;
          }).join('')}
          <option value="__custom__" ${seat.holder==='__custom__'?'selected':''}>Someone else…</option>
        </select>
        ${seat.holder==='__custom__' ? `<div class="row"><div class="label">Name</div><input type="text" value="${escapeAttr(seat.customName)}" style="max-width:170px;" onchange="state.council['${role}'].customName=this.value;scheduleSave();render();"></div>` : ''}
        ${(seat.holder==='__custom__'||seat.holder==='__pc__') ? `<div class="row"><div class="label">Base bonus<small>agree it with your GM</small></div><input class="num" type="number" value="${seat.customBonus||0}" onchange="state.council['${role}'].customBonus=parseInt(this.value)||0;scheduleSave();render();"></div>` : ''}
        ${seat.holder ? `<div class="row" style="border:none;"><div class="label">Seat bonus</div><div class="mono" style="font-size:16px;">${fmt(seatBonus(role))}</div></div>${sourceTags(seatBonusParts(role))}` : `<div class="hint">Vacant — no bonus.</div>`}
        ${seat.holder && seat.focus ? `<div class="hint">Focused Attention +${seat.focus} <span class="loc-link" onclick="state.council['${role}'].focus=Math.max(0,state.council['${role}'].focus-1);scheduleSave();render();">remove one</span></div>` : ''}
      </div>`;
    }).join('')}
    <div class="card">
      <h3>Companions</h3>
      <div class="hint" style="margin-top:0;">Tap a name for who they are and their bonus in every seat.</div>
      ${COMPANIONS.map(name=>{
        const info = STORY_NPC_INFO[COMPANION_BIO_KEY[name]||name] || {};
        const open = expandedNPCs.has(name);
        const seat = companionSeat(name);
        const best = COUNCIL_ROLES.reduce((a,r)=>COMPANION_BONUS[name][r]>COMPANION_BONUS[name][a]?r:a, 'Leader');
        return `<div class="npc-entry">
          <button type="button" class="npc-entry-head" onclick="toggleNPCCard('${name}')">
            <span>${name}${seat?` <span class="pill" style="font-size:10px;margin-left:4px;">${seat}</span>`:''}</span>
            <span class="hint" style="margin:0;">best: ${best} ${fmt(COMPANION_BONUS[name][best])} ${open?'−':'+'}</span>
          </button>
          ${open ? `<div class="npc-entry-body">
            <div class="seat-bonus-grid">${COUNCIL_ROLES.map(r=>`<div class="${COMPANION_BONUS[name][r]>0?'pos':COMPANION_BONUS[name][r]<0?'neg':''}"><span>${r}</span><b>${fmt(COMPANION_BONUS[name][r])}</b></div>`).join('')}</div>
            ${info.deity?`<div class="hint"><b style="color:var(--text);">Deity:</b> ${escapeHtml(info.deity)}</div>`:''}
            <div class="hint" style="margin-top:4px;">${escapeHtml(info.description||'')}</div>
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}
function seatCouncilor(role, holder){
  if(holder && holder!=='__custom__' && holder!=='__pc__'){
    const prev = companionSeat(holder);
    if(prev && prev!==role){
      if(!confirm(`${holder} is currently the ${prev}. Move them to ${role}? The ${prev} seat becomes vacant.`)){ render(); return; }
      state.council[prev] = emptyCouncilSeat();
    }
  }
  if(holder==='__pc__'){
    const prev = COUNCIL_ROLES.find(r=>r!==role && state.council[r].holder==='__pc__');
    if(prev) state.council[prev] = emptyCouncilSeat();
  }
  const keep = state.council[role];
  state.council[role] = {holder, customName: holder==='__custom__'?keep.customName:'', customBonus: (holder==='__custom__'||holder==='__pc__')?keep.customBonus:0, focus: keep.holder===holder?keep.focus:0};
  scheduleSave(); render();
}

/* ---------- RESOURCES tab ---------- */
function renderResourcesTab(){
  const el = document.getElementById('tab-goods');
  const known = (state.relations||[]).map(r=>r.nation);
  el.innerHTML = `
    <div class="card">
      <h3>Treasury</h3>
      <div class="hint" style="margin-top:0;">Gold replaces RP. Adjust by hand for anything that happens outside the turn guide.</div>
      ${['Gold'].concat(COMMODITIES).map(g=>{
        const producers = g==='Gold' ? null : producerCount(g);
        return `<div class="row">
          <div class="label">${RES_ICON[g]} ${g}<small>${g==='Gold' ? 'from Collect Taxes and Capital Investment' : g==='Luxuries' ? `${producers} Trade Agreement${producers===1?'':'s'}` : `${producers} ${BUILDING_FOR_GOOD[g]}${producers===1?'':'s'} on ${RESOURCE_BUILDINGS[BUILDING_FOR_GOOD[g]].terrains.join('/')}`}${heartlandAdvantage(g)?' · Heartland Advantage':''}</small></div>
          <div style="display:flex;align-items:center;gap:6px;">
            <button class="small-ghost" onclick="gain('${g}',-1);scheduleSave();render();">−</button>
            <input class="num" type="number" value="${state.resources[g]}" style="width:70px;" onchange="state.resources['${g}']=Math.max(0,parseInt(this.value)||0);scheduleSave();render();">
            <button class="small-ghost" onclick="gain('${g}',1);scheduleSave();render();">+</button>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="card">
      <h3>Resource Buildings</h3>
      <div class="hint" style="margin-top:0;">Each one lets you roll the Resource Die (d${resourceDieSides()}) once for its resource in Collect Resources.</div>
      ${Object.keys(RESOURCE_BUILDINGS).map(b=>{
        const keys = resourceBuildingHexes(b);
        return `<div class="row" style="flex-direction:column;align-items:stretch;">
          <div style="display:flex;justify-content:space-between;"><div class="label">${b} → ${RESOURCE_BUILDINGS[b].good}<small>${RESOURCE_BUILDINGS[b].terrains.join(' or ')} hexes</small></div><span class="mono">${keys.length}</span></div>
          ${keys.length ? `<div>${keys.map(k=>{ const [c,r]=k.split('_').map(Number); return `<span class="loc-link" style="margin-right:8px;" onclick="jumpToHex(${c},${r})">${hexLabel(c,r)}</span>`; }).join('')}</div>` : ''}
        </div>`;
      }).join('')}
    </div>

    <div class="card">
      <h3>Foreign Relations${infoIcon('Trade Agreement')}</h3>
      <div class="hint" style="margin-top:0;">States you've contacted with Send Diplomatic Envoy. Trade Agreements with them produce Luxuries.</div>
      ${known.length ? state.relations.map((r,i)=>`<div class="row">
        <div class="label">${escapeHtml(r.nation)}<small>${r.trade||0} Trade Agreement${r.trade===1?'':'s'}</small></div>
        ${stepperHtml(`changeTrade(${i},-1)`, `changeTrade(${i},1)`)}
      </div>`).join('') : '<div class="hint">No foreign states contacted yet.</div>'}
      <div class="tag-input-row">
        <select id="new-relation" style="flex:1;min-width:0;"><option value="">Record a contacted state…</option>${KM_NATIONS.filter(n=>!known.includes(n.name)).map(n=>`<option>${escapeHtml(n.name)}</option>`).join('')}</select>
        <button class="action" style="width:auto;margin:0;" onclick="addRelation(document.getElementById('new-relation').value)">Add</button>
      </div>
    </div>

    <div class="card">
      <h3>Advantages${infoIcon('Advantage')}</h3>
      <div class="row" style="border:none;"><div class="label">Banked Advantages</div><div style="display:flex;align-items:center;gap:8px;"><span class="mono">${state.advantages}</span>${stepperHtml("state.advantages=Math.max(0,state.advantages-1);scheduleSave();render();","state.advantages++;scheduleSave();render();")}</div></div>
    </div>

    <div class="card">
      <h3>Debts${infoIcon('Debt')}</h3>
      ${state.debts.length ? state.debts.map((d,i)=>`<div class="log-entry"><div class="meta">Turn ${d.turn} <span class="loc-link" style="float:right;" onclick="state.debts.splice(${i},1);scheduleSave();render();">paid off</span></div><div class="note">${escapeHtml(d.text)}</div></div>`).join('') : '<div class="hint" style="margin-top:0;">You owe nothing.</div>'}
    </div>

    <div class="card">
      <h3>Roads</h3>
      <label class="hint" style="display:flex;gap:6px;align-items:center;margin-top:0;"><input type="checkbox" ${state.roads?'checked':''} onchange="state.roads=this.checked;scheduleSave();render();"> Roads built — travel speed within the kingdom is doubled</label>
    </div>`;
}
function addRelation(name){
  if(!name) return;
  if(!state.relations.find(r=>r.nation===name)) state.relations.push({nation:name, trade:0});
  scheduleSave(); render();
}
function changeTrade(i, d){
  const r = state.relations[i]; if(!r) return;
  r.trade = Math.max(0, (r.trade||0)+d);
  if(r.trade===0 && d<0 && confirm(`Also remove ${r.nation} from your contacted states?`)) state.relations.splice(i,1);
  scheduleSave(); render();
}


/* =====================================================================
   TOWNS — settlements, their buildings, and the Field Notes list
===================================================================== */
let expandedSettlements = new Set();
function buildingUnlockedFor(sid){
  const ts = state.turnState;
  return !!(ts && ts.turn===state.turn && (ts.buildingUnlocked||[]).includes(sid));
}
function renderTownsTab(){
  const el = document.getElementById('tab-notes');
  el.innerHTML = `
    <div class="card">
      <h3>Settlements</h3>
      <div class="hint" style="margin-top:0;">New settlements are founded with the <b>Establish Settlement</b> hex action and grown with <b>Level Up Settlement</b>. Buildings go up during the turn's <b>Building Action</b> (step 8). Towns unlock at level 3, Cities at 9, Metropolises at 15.</div>
    </div>
    ${state.settlements.length ? state.settlements.map(renderSettlementCard).join('') : `<div class="card"><div class="empty-state"><div class="glyph">⌂</div>No settlements yet.<div class="sub">Place your capital from the Kingdom tab.</div></div></div>`}
    <div class="card">
      <h3>Field Notes</h3>
      <div class="hint" style="margin-top:0;">Every marked hex from the map. Tap one to jump to it.</div>
      <div id="notes-list"></div>
    </div>`;
  renderNotesList();
}
function renderSettlementCard(s){
  const traits = settlementTraits(s);
  const open = expandedSettlements.has(s.id);
  const unlocked = buildingUnlockedFor(s.id);
  const isCap = capitalSettlement() && capitalSettlement().id===s.id;
  const byRoot = {};
  (s.buildings||[]).forEach(n=>{ const r = buildingRoot(n); (byRoot[r]=byRoot[r]||[]).push(n); });
  const bonusTags = [];
  (s.buildings||[]).forEach(n=>{ const b=BUILDING_BY_NAME[n]; if(b && b.virtue) bonusTags.push({label:`${n}: ${b.virtue}`, amt:1}); });
  const delay = settlementWallDelay(s);
  return `<div class="card settlement">
    <div class="settlement-head">
      <input type="text" value="${escapeAttr(s.name)}" style="font-family:'Cinzel',serif;font-weight:600;background:none;border:none;font-size:16px;padding:0;flex:1;min-width:0;" onchange="renameSettlement(${s.id}, this.value)">
      <span class="pill">${isCap?'♜ Capital · ':''}${s.type}</span>
    </div>
    <div class="settlement-loc">
      ${s.col!==undefined ? `<span class="loc-pin">⌖ ${hexLabel(s.col,s.row)}</span><button class="loc-link" onclick="jumpToHex(${s.col},${s.row})">view on map</button>` : `<span class="hint" style="margin:0;">Not on the map</span>`}
    </div>
    <div class="trait-row">${Object.entries(traits).map(([k,v])=>`<span class="trait ${v?'on':''}">${v?'✓':'○'} ${k}</span>`).join('')}</div>
    ${delay ? `<div class="hint">Walls delay enemy army attacks by ${delay} turn${delay>1?'s':''}.</div>` : ''}
    <div class="hint" style="margin-top:8px;">${(s.buildings||[]).length} building${(s.buildings||[]).length===1?'':'s'}${bonusTags.length?' · gives':''}</div>
    ${bonusTags.length ? sourceTags(bonusTags) : ''}
    ${Object.keys(byRoot).length ? Object.entries(byRoot).map(([root,list])=>`<div class="bld-group"><span class="bld-root">${escapeHtml(root)} line</span>${list.map(n=>`<span class="tag">${escapeHtml(n)}<button onclick="removeBuilding(${s.id},'${jsArg(n)}')" title="Remove">✕</button></span>`).join('')}</div>`).join('') : ''}
    ${unlocked
      ? `<button class="action" style="margin-top:10px;" onclick="openBuildPicker(${s.id},false)">＋ Build here (Building Action)</button>`
      : `<div class="hint" style="margin-top:10px;">To build here, succeed at the Building Action in step 8 of the Kingdom Turn.</div>`}
    <button class="small-ghost" style="margin-top:6px;" onclick="openBuildPicker(${s.id},true)">Record a building that already stands (no cost)</button>
    <button class="small-ghost" style="margin-top:6px;" onclick="toggleSettlementMore(${s.id})">${open?'Less':'Notes & more'}</button>
    ${open ? `
      <textarea class="wide" placeholder="Notes about this settlement..." rows="3" style="margin-top:10px;" onchange="state.settlements.find(x=>x.id===${s.id}).notes=this.value;scheduleSave();">${escapeHtml(s.notes||'')}</textarea>
      <div class="row"><div class="label">Size<small>set directly (normally via Level Up Settlement)</small></div>
        <select onchange="setSettlementType(${s.id}, this.value)">${SETTLEMENT_SIZES.map(t=>`<option ${s.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
      ${isCap ? '' : `<button class="ghost danger-ghost" style="margin-top:8px;" onclick="removeSettlement(${s.id})">Remove settlement</button>`}
    ` : ''}
  </div>`;
}
function toggleSettlementMore(id){ if(expandedSettlements.has(id)) expandedSettlements.delete(id); else expandedSettlements.add(id); renderTownsTab(); }
function setSettlementType(id, type){ const s = state.settlements.find(x=>x.id===id); if(s){ s.type=type; scheduleSave(); render(); } }
function renameSettlement(id, val){
  const s = state.settlements.find(x=>x.id===id);
  if(!s) return;
  if(s.col!==undefined){
    const h = state.hexes[hexKey(s.col,s.row)];
    if(h && (h.type==='Settlement'||h.type==='Capital') && (h.name===s.name || !h.name)) h.name = val;
  }
  s.name = val;
  scheduleSave(); render();
}
function removeSettlement(id){
  const s = state.settlements.find(x=>x.id===id);
  if(!s || !confirm(`Remove ${s.name} and all its buildings? This can't be undone.`)) return;
  if(s.col!==undefined){
    const k = hexKey(s.col,s.row);
    if(state.hexes[k] && state.hexes[k].type==='Settlement') state.hexes[k].type = 'Claimed Territory';
  }
  state.settlements = state.settlements.filter(x=>x.id!==id);
  scheduleSave(); render();
}
function removeBuilding(sid, name){
  const s = state.settlements.find(x=>x.id===sid);
  if(!s) return;
  const dependents = (s.buildings||[]).filter(n=>BUILDING_BY_NAME[n] && BUILDING_BY_NAME[n].req===name);
  if(!confirm(`Remove ${name} from ${s.name}?${dependents.length?` ${dependents.join(', ')} depend${dependents.length===1?'s':''} on it and will stay, but couldn't be built without it.`:''} No resources are refunded.`)) return;
  s.buildings = s.buildings.filter(n=>n!==name);
  scheduleSave(); render();
}

/* ---------- building picker ---------- */
let buildPicker = null; // {sid, free, filter, search}
function openBuildPicker(sid, free){
  buildPicker = {sid, free, filter:'Available', search:''};
  renderBuildPicker();
}
function renderBuildPicker(){
  const bp = buildPicker; if(!bp) return;
  const s = state.settlements.find(x=>x.id===bp.sid); if(!s) return;
  const q = bp.search.toLowerCase();
  const rows = BUILDINGS.filter(b=>{
    if(q && !(b.name.toLowerCase().includes(q) || (b.virtue||'').toLowerCase().includes(q) || b.note.toLowerCase().includes(q))) return false;
    const av = buildingAvailability(s, b);
    if(bp.filter==='Available') return av.ok;
    if(bp.filter==='Built') return settlementHas(s, b.name);
    return true;
  });
  const html = `
    <h3 style="margin-bottom:2px;">${bp.free?'Record a building':'Build'} · ${escapeHtml(s.name)}</h3>
    <div class="hint" style="margin-top:0;">${bp.free?'For buildings that already stand (setup or GM-granted). Nothing is spent.':'Cost is paid when you build. Requires the parent building in this settlement and the listed kingdom level.'}</div>
    <div class="boost-picker three" style="margin-top:8px;">${['Available','All','Built'].map(f=>`<button type="button" class="${bp.filter===f?'selected':''}" onclick="buildPicker.filter='${f}';renderBuildPicker();">${f}</button>`).join('')}</div>
    <input class="wide" type="text" placeholder="Search (name, virtue, effect)" value="${escapeAttr(bp.search)}" style="margin-top:8px;" oninput="buildPicker.search=this.value;clearTimeout(window._bpT);window._bpT=setTimeout(()=>{renderBuildPicker();const i=document.querySelector('#build-overlay input[type=text]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},250);">
    <div style="margin-top:8px;">
      ${rows.length ? rows.map(b=>{
        const av = buildingAvailability(s, b);
        const missing = missingFor(b.cost);
        const affordable = bp.free || !missing.length;
        const effect = [b.virtue?`+1 ${b.virtue}`:'', b.note].filter(Boolean).join(' · ');
        return `<div class="option-card bld-card ${av.ok?'':'locked'}">
          <div class="opt-name">${escapeHtml(b.name)} <span class="pill" style="font-size:10px;">Lv ${b.level}</span></div>
          <div class="opt-detail">${escapeHtml(effect||'No listed effect')}<br>${formatCost(b.cost)}${b.req?` · needs ${escapeHtml(b.req)}`:''}</div>
          ${av.ok
            ? (affordable
                ? `<button class="small-ghost" style="margin-top:6px;" onclick="confirmBuild(${s.id},'${jsArg(b.name)}')">${bp.free?'Record':'Build'}</button>`
                : `<div class="hint" style="color:var(--rust);">${shortageHelp(missing)}</div>`)
            : `<div class="hint" style="margin-top:4px;">${escapeHtml(av.why)}</div>`}
        </div>`;
      }).join('') : '<div class="hint">Nothing matches.</div>'}
    </div>
    <button class="ghost" style="margin-top:10px;" onclick="buildPicker=null;closeOverlay('build-overlay');">Close</button>`;
  openOverlay('build-overlay', html, 112);
}
function confirmBuild(sid, name){
  const s = state.settlements.find(x=>x.id===sid);
  const b = BUILDING_BY_NAME[name];
  if(!s || !b) return;
  const av = buildingAvailability(s, b);
  if(!av.ok){ alert(av.why); return; }
  if(!buildPicker.free){
    if(!buildingUnlockedFor(sid)){ alert('Building happens during a successful Building Action (turn step 8).'); return; }
    const missing = missingFor(b.cost);
    if(missing.length){ alert('Not enough resources.'); return; }
    spend(b.cost);
    addLog(`Built ${name} in ${s.name} (${formatCost(b.cost)}).`);
  } else {
    addLog(`Recorded existing ${name} in ${s.name}.`);
  }
  s.buildings.push(name);
  scheduleSave();
  renderBuildPicker();
  render();
}

/* ---------- field notes ---------- */
function renderNotesList(){
  const list = document.getElementById('notes-list');
  if(!list) return;
  const typeOrder = Object.keys(HEX_TYPE_SYMBOLS);
  const entries = Object.keys(state.hexes)
    .map(key=>{ const [col,row] = key.split('_').map(Number); return Object.assign({key, col, row}, state.hexes[key]); })
    .filter(e=>e.name || e.type || e.note || e.resources || e.features || e.terrain || e.resourceBuilding)
    .sort((a,b)=>{
      const ta = typeOrder.indexOf(a.type), tb = typeOrder.indexOf(b.type);
      if(ta !== tb) return (ta===-1?999:ta) - (tb===-1?999:tb);
      return hexLabel(a.col,a.row).localeCompare(hexLabel(b.col,b.row));
    });
  if(!entries.length){ list.innerHTML = '<div class="notes-empty">No notes yet — tap any hex on the map to mark a side quest, camp, point of interest, or hazard.</div>'; return; }
  list.innerHTML = entries.map(e=>{
    const symbol = e.type && HEX_TYPE_SYMBOLS[e.type] ? HEX_TYPE_SYMBOLS[e.type] : '·';
    const tags = [e.terrain?'Terrain: '+e.terrain:'', e.resourceBuilding?'Building: '+e.resourceBuilding:'', e.resources?'Resources: '+e.resources:'', e.features?'Features: '+e.features:''].filter(Boolean).join(' · ');
    return `<button class="note-item" onclick="jumpToHex(${e.col},${e.row})">
      <span class="note-dot">${symbol}</span>
      <span class="note-body">
        <span class="note-toprow"><span class="note-name">${escapeHtml(e.name) || '(unnamed)'}</span><span class="note-hexlabel">${hexLabel(e.col,e.row)}</span></span>
        ${e.type ? `<div class="note-type">${escapeHtml(e.type)}</div>` : ''}
        ${tags ? `<div class="note-type">${escapeHtml(tags)}</div>` : ''}
        ${e.note ? `<div class="note-text">${escapeHtml(e.note)}</div>` : ''}
      </span>
    </button>`;
  }).join('');
}


/* =====================================================================
   PICK A HEX — one flow for every "tap a hex on the map" step.
   If the turn guide was open, it comes back afterwards.
===================================================================== */
let pickMode = null; // {prompt, validate(col,row)->string|null, onConfirm(col,row), reopenTurn}
let pendingPickHex = null;
function startPick(prompt, onConfirm, validate){
  const reopenTurn = !!document.getElementById('turn-overlay');
  closeOverlay('turn-overlay');
  pickMode = {prompt, onConfirm, validate: validate || (()=>null), reopenTurn};
  pendingPickHex = null;
  switchTab('map');
  renderPickBanner(prompt);
}
function renderPickBanner(promptText){
  document.getElementById('map-pick-text').textContent = promptText;
  document.getElementById('map-pick-actions').innerHTML = `<button class="ghost" style="margin:0;" onclick="cancelPickLocation()">Cancel</button>`;
  document.getElementById('map-float-pick-banner').style.display = 'block';
  const svg = document.getElementById('hexoverlay');
  if(svg) svg.querySelectorAll('.hex-cell').forEach(p=>{ p.classList.add('picking'); p.classList.remove('pending-confirm'); });
}
function onHexTapDuringPick(col,row){
  const err = pickMode.validate(col,row);
  const svg = document.getElementById('hexoverlay');
  if(svg){
    svg.querySelectorAll('.hex-cell').forEach(p=>p.classList.remove('pending-confirm'));
    const poly = svg.querySelector(`[data-key="${hexKey(col,row)}"]`);
    if(poly) poly.classList.add('pending-confirm');
  }
  if(err){
    pendingPickHex = null;
    document.getElementById('map-pick-text').innerHTML = `<span style="color:var(--rust);">${hexLabel(col,row)}: ${escapeHtml(err)}</span><br>${escapeHtml(pickMode.prompt)}`;
    document.getElementById('map-pick-actions').innerHTML = `<button class="ghost" style="margin:0;" onclick="cancelPickLocation()">Cancel</button>`;
    return;
  }
  pendingPickHex = {col,row};
  const h = state.hexes[hexKey(col,row)];
  document.getElementById('map-pick-text').textContent = `Use ${hexLabel(col,row)}${h&&h.name?' ('+h.name+')':''}${h&&h.terrain?' · '+h.terrain:''}?`;
  document.getElementById('map-pick-actions').innerHTML = `
    <button class="ghost" style="margin:0;" onclick="cancelPickLocation()">Cancel</button>
    <button class="action" style="margin:0;" onclick="confirmPick()">Confirm ${hexLabel(col,row)}</button>`;
}
function confirmPick(){
  if(!pendingPickHex || !pickMode) return;
  const {col,row} = pendingPickHex;
  const pm = pickMode;
  endPickUi();
  pm.onConfirm(col,row);
}
function endPickUi(){
  pickMode = null; pendingPickHex = null;
  document.getElementById('map-float-pick-banner').style.display = 'none';
  const svg = document.getElementById('hexoverlay');
  if(svg) svg.querySelectorAll('.hex-cell').forEach(p=>{ p.classList.remove('picking'); p.classList.remove('pending-confirm'); });
}
function cancelPickLocation(){
  const reopen = pickMode && pickMode.reopenTurn;
  endPickUi();
  if(reopen) openTurnGuide();
}
function backToTurn(){ if(state.turnState) openTurnGuide(); }
function ensureHex(col,row){
  const k = hexKey(col,row);
  if(!state.hexes[k]) state.hexes[k] = {name:'', type:'', note:'', terrain:'', resources:'', features:'', resourceBuilding:''};
  return state.hexes[k];
}
function isClaimed(col,row){ const h = state.hexes[hexKey(col,row)]; return !!h && CLAIMED_HEX_TYPES.includes(h.type); }
// Ask for a hex's terrain when it hasn't been set yet (the GM decides terrain).
function withTerrain(col,row, allowed, cb){
  const h = ensureHex(col,row);
  if(h.terrain) return cb(h.terrain);
  openOverlay('terrain-overlay', `
    <h3>What terrain is ${hexLabel(col,row)}?</h3>
    <div class="hint" style="margin-top:0;">It hasn't been set yet. Check the map and pick it.</div>
    ${(allowed||TERRAINS).map(t=>`<button class="option-card" style="padding:9px 12px;margin-bottom:6px;" onclick="closeOverlay('terrain-overlay');state.hexes['${hexKey(col,row)}'].terrain='${t}';window._terrainCb('${t}');"><div class="opt-name" style="font-size:13px;">${t}</div></button>`).join('')}
    ${allowed ? `<div class="hint">Only terrains that fit are listed. If it's something else, this hex can't be used.</div>` : ''}
    <button class="ghost" onclick="closeOverlay('terrain-overlay');backToTurn();">Cancel</button>`, 118);
  window._terrainCb = cb;
}

/* =====================================================================
   CAPITAL + FOUNDING RESOURCE (creation steps 7 & 8)
===================================================================== */
function startPickCapital(){
  const hl = HEARTLANDS[state.creation.heartland];
  startPick(`Tap the hex for your capital — it must be ${hl?hl.terrains.join(' or '):'your heartland'} terrain (${state.creation.heartland||'heartland'}).`, (col,row)=>{
    withTerrain(col,row, hl?hl.terrains:null, ()=>pinCapitalLocation(col,row));
  }, (col,row)=>{
    const h = state.hexes[hexKey(col,row)];
    if(h && h.terrain && hl && !hl.terrains.includes(h.terrain)) return `this hex is ${h.terrain}, not ${state.creation.heartland}.`;
    return null;
  });
}
function pinCapitalLocation(col,row){
  const old = capitalHex();
  if(old){ state.hexes[old.key].type = 'Settlement'; }
  const h = ensureHex(col,row);
  h.type = 'Capital';
  let s = state.settlements.find(x=>x.col===col && x.row===row);
  if(!s){
    s = {id:Date.now(), name: state.name, type:'Village', col, row, buildings:[], notes:''};
    state.settlements.push(s);
  }
  if(!h.name) h.name = s.name;
  addLog(`Capital ${s.name} placed at ${hexLabel(col,row)}.`);
  scheduleSave();
  updateHexMarkers();
  render();
  if(!state.foundingResourceDone) openFoundingResource(); else switchTab('overview');
}
function openFoundingResource(){
  if(!capitalHex()){ startPickCapital(); return; }
  switchTab('overview');
  openOverlay('founding-overlay', `
    <h3>Founding: your first resource</h3>
    <div class="hint" style="margin-top:0;">Choose a hex next to your capital and place one resource building there — or establish a single Trade Agreement instead. This one is free.</div>
    ${Object.entries(RESOURCE_BUILDINGS).map(([b,r])=>`<button class="option-card" style="padding:9px 12px;margin-bottom:6px;" onclick="closeOverlay('founding-overlay');foundingPickBuilding('${b}')"><div class="opt-name" style="font-size:13px;">${b} → ${r.good}</div><div class="opt-detail">${r.terrains.join(' or ')} hex${heartlandAdvantage(r.good)?' · your Heartland gives Advantage on these rolls':''}</div></button>`).join('')}
    <button class="option-card" style="padding:9px 12px;margin-bottom:6px;" onclick="closeOverlay('founding-overlay');foundingTrade()"><div class="opt-name" style="font-size:13px;">Trade Agreement → Luxuries</div><div class="opt-detail">With a neighboring state of your choice.</div></button>
    <button class="ghost" onclick="closeOverlay('founding-overlay');">Later</button>`, 115);
}
function hexNeighbors(col,row){
  const odd = row%2!==0;
  const d = odd ? [[1,0],[-1,0],[0,-1],[1,-1],[0,1],[1,1]] : [[1,0],[-1,0],[-1,-1],[0,-1],[-1,1],[0,1]];
  return d.map(([dc,dr])=>[col+dc,row+dr]);
}
function hexDistance(c1,r1,c2,r2){
  const toCube = (c,r)=>{ const x = c - (r - (r&1))/2; const z = r; return [x, -x-z, z]; };
  const a = toCube(c1,r1), b = toCube(c2,r2);
  return Math.max(Math.abs(a[0]-b[0]), Math.abs(a[1]-b[1]), Math.abs(a[2]-b[2]));
}
function resourceBuildingValidate(bname){
  return (col,row)=>{
    const h = state.hexes[hexKey(col,row)];
    if(h && h.resourceBuilding) return `already has a ${h.resourceBuilding}.`;
    if(h && h.terrain && !RESOURCE_BUILDINGS[bname].terrains.includes(h.terrain)) return `${h.terrain} — a ${bname} needs ${RESOURCE_BUILDINGS[bname].terrains.join(' or ')}.`;
    if(h && (h.type==='Capital'||h.type==='Settlement')) return 'settlement hexes hold towns, not resource buildings.';
    return null;
  };
}
function placeResourceBuilding(col,row,bname){
  const h = ensureHex(col,row);
  h.resourceBuilding = bname;
  if(!CLAIMED_HEX_TYPES.includes(h.type)) h.type = 'Claimed Territory';
}
function foundingPickBuilding(bname){
  const cap = capitalHex();
  const validate = resourceBuildingValidate(bname);
  startPick(`Tap a hex next to your capital for the ${bname}.`, (col,row)=>{
    withTerrain(col,row, RESOURCE_BUILDINGS[bname].terrains, ()=>{
      placeResourceBuilding(col,row,bname);
      state.foundingResourceDone = true;
      addLog(`Founding: ${bname} placed at ${hexLabel(col,row)}.`);
      scheduleSave(); updateHexMarkers(); render(); switchTab('overview');
    });
  }, (col,row)=>{
    if(cap && !hexNeighbors(cap.col,cap.row).some(([c,r])=>c===col&&r===row)) return 'not next to your capital.';
    return validate(col,row);
  });
}
function foundingTrade(){
  pickNation('Trade Agreement with which state?', name=>{
    let r = state.relations.find(x=>x.nation===name);
    if(!r){ r = {nation:name, trade:0}; state.relations.push(r); }
    r.trade += 1;
    state.foundingResourceDone = true;
    addLog(`Founding: Trade Agreement with ${name}.`);
    scheduleSave(); render();
  }, null);
}
function pickNation(title, cb, onlyKnown){
  const list = onlyKnown ? state.relations.map(r=>r.nation) : KM_NATIONS.map(n=>n.name).filter(n=>!state.relations.find(r=>r.nation===n) || onlyKnown===false);
  window._nationCb = cb;
  openOverlay('nation-overlay', `
    <h3>${escapeHtml(title)}</h3>
    ${list.length ? list.map(n=>{
      const info = KM_NATIONS.find(x=>x.name===n);
      return `<button class="option-card" style="padding:9px 12px;margin-bottom:6px;" onclick="closeOverlay('nation-overlay');window._nationCb('${jsArg(n)}')"><div class="opt-name" style="font-size:13px;">${escapeHtml(n)}</div>${info?`<div class="opt-detail">${escapeHtml(info.description)}</div>`:''}</button>`;
    }).join('') : `<div class="hint">${onlyKnown ? 'You haven\'t contacted any foreign state yet — use Send Diplomatic Envoy first.' : 'No states left to contact.'}</div>`}
    <div class="tag-input-row"><input class="wide" type="text" id="nation-custom" placeholder="Or type another name"><button class="action" style="width:auto;margin:0;" onclick="const v=document.getElementById('nation-custom').value.trim(); if(v){closeOverlay('nation-overlay');window._nationCb(v);}">Use</button></div>
    <button class="ghost" style="margin-top:8px;" onclick="closeOverlay('nation-overlay');backToTurn();">Cancel</button>`, 118);
}

/* =====================================================================
   KINGDOM TURN — the 10 steps from the rules sheet, in order
===================================================================== */
const TURN_STEPS = [
  null,
  {title:'Councilors & Level', short:'Council'},
  {title:'Random Kingdom Event', short:'Event'},
  {title:'Collect Taxes', short:'Taxes'},
  {title:'Collect Resources', short:'Resources'},
  {title:'Resource Action', short:'Resource Action'},
  {title:'Leadership Actions', short:'Leadership'},
  {title:'Hex Actions', short:'Hex'},
  {title:'Building Action', short:'Building'},
  {title:'Army Cost', short:'Army Cost'},
  {title:'Army Actions', short:'Army'}
];
function newTurnState(){
  return {turn:state.turn, step:1, done:{}, collected:[], used:{leadership:0, hex:0, building:0, army:0}, buildingUnlocked:[], buildingTried:[], notes:[]};
}
function openTurnGuide(){
  if(!state.turnState || state.turnState.turn!==state.turn) state.turnState = newTurnState();
  scheduleSave();
  renderTurnGuide();
}
function closeTurnGuide(){ closeOverlay('turn-overlay'); render(); }
function turnGoTo(n){ state.turnState.step = Math.max(1, Math.min(10, n)); scheduleSave(); renderTurnGuide(); }
function markStepDone(n){ state.turnState.done[n] = true; }
function turnNote(text){ state.turnState.notes.push({step:state.turnState.step, text}); }
function renderTurnGuide(){
  const ts = state.turnState; if(!ts) return;
  const n = ts.step;
  const body = ({1:stepCouncil, 2:stepEvent, 3:stepTaxes, 4:stepCollect, 5:stepResourceAction, 6:stepLeadership, 7:stepHex, 8:stepBuilding, 9:stepArmyCost, 10:stepArmyActions})[n]();
  const html = `
    <div class="turn-head">
      <div><div class="eyebrow" style="margin:0;">Kingdom Turn ${state.turn}</div><h3 style="margin:2px 0 0;">${n}. ${TURN_STEPS[n].title}</h3></div>
      <button class="small-ghost" onclick="closeTurnGuide()">Close</button>
    </div>
    <div class="turn-dots">${TURN_STEPS.slice(1).map((s,i)=>`<button class="${i+1===n?'active':''} ${ts.done[i+1]?'done':''}" onclick="turnGoTo(${i+1})" title="${s.title}">${i+1}</button>`).join('')}</div>
    <div class="turn-body">${body}</div>
    <div class="creation-nav" style="margin-top:14px;">
      <button class="ghost" ${n===1?'disabled style="opacity:.4;"':''} onclick="turnGoTo(${n-1})">Back</button>
      ${n<10 ? `<button class="action" onclick="markStepDone(${n});turnGoTo(${n+1})">Next: ${TURN_STEPS[n+1].short}</button>` : `<button class="action" onclick="finishTurn()">Finish Turn ${state.turn}</button>`}
    </div>`;
  const existing = document.getElementById('turn-overlay');
  if(existing){ existing.querySelector('.card').innerHTML = html; return; }
  openOverlay('turn-overlay', html, 105);
}
function finishTurn(){
  const ts = state.turnState;
  const summary = (ts.notes||[]).map(x=>x.text);
  addLog(`Turn ${state.turn} complete.${summary.length?' '+summary.join(' · '):''}`);
  state.turn += 1;
  state.turnState = null;
  scheduleSave();
  closeOverlay('turn-overlay');
  render();
  switchTab('overview');
}
function stepTag(kind, text){ return `<span class="step-tag ${kind}">${text}</span>`; }
function counterLine(used, max, what){
  const left = max - used;
  return `<div class="counter-line ${left<=0?'spent':''}"><b>${Math.max(0,left)}</b> of ${max} ${what} left this turn</div>`;
}

/* ---------- 1. Councilors ---------- */
function stepCouncil(){
  const vacant = COUNCIL_ROLES.filter(r=>!state.council[r].holder);
  return `${stepTag('auto','Review')}
    <div class="hint" style="margin-top:6px;">Confirm your councilors — swap anyone you want. Level up your kingdom if you have the XP.</div>
    <table class="lead-table" style="margin-top:8px;"><tbody>${COUNCIL_ROLES.map(r=>`<tr><td>${r}</td><td>${state.council[r].holder?escapeHtml(seatHolderName(r)):'<span style="color:var(--rust);">Vacant</span>'}</td><td class="mono">${state.council[r].holder?fmt(seatBonus(r)):''}</td></tr>`).join('')}</tbody></table>
    ${vacant.length ? `<div class="hint" style="color:var(--rust);">${vacant.length} seat${vacant.length>1?'s are':' is'} vacant — no bonus on ${vacant.join(', ')} checks.</div>` : ''}
    <button class="ghost" style="margin-top:8px;" onclick="closeOverlay('turn-overlay');switchTab('leaders');">Change councilors</button>
    <div class="divider"></div>
    <div class="hint" style="margin-top:0;">Level ${state.level} · ${state.xp} / ${XP_PER_LEVEL} XP</div>
    ${state.xp>=XP_PER_LEVEL && state.level<20 ? `<button class="action" onclick="doLevelUp()">↑ Level up to ${state.level+1}</button>` : ''}
    ${state.pendingBoostLevels.length ? `<div class="hint" style="color:var(--gold);">You still have an Ability +2 to choose (Virtues tab).</div>` : ''}`;
}

/* ---------- 2. Random event ---------- */
function stepEvent(){
  const ts = state.turnState;
  const over = flawsOverRuin();
  return `${stepTag('roll','Roll d100')}
    <div class="hint" style="margin-top:6px;">Roll a d100 on your GM's Kingdom Event table.</div>
    ${ts.eventRoll ? `<div class="big-roll mono">${ts.eventRoll}</div>` : ''}
    <div style="display:flex;gap:6px;">
      <button class="action" style="flex:1;" onclick="state.turnState.eventRoll=rollDie(100);turnNote('Event roll '+state.turnState.eventRoll);scheduleSave();renderTurnGuide();">${ts.eventRoll?'Re-roll':'Roll d100'}</button>
      <input class="num" type="number" min="1" max="100" placeholder="or type" style="width:80px;" onchange="state.turnState.eventRoll=Math.max(1,Math.min(100,parseInt(this.value)||1));scheduleSave();renderTurnGuide();">
    </div>
    ${over.length ? `<div class="attention-item" style="margin-top:10px;"><b>Ruin:</b> ${over.map(f=>`${f} ${flawValue(f)}`).join(', ')} ${over.length>1?'are':'is'} above the threshold of ${ruinThreshold()} — that triggers a Kingdom Event too.</div>` : ''}
    <div class="hint" style="margin-top:10px;">What happened? If it lasts, it's added to Active Events on the Kingdom tab.</div>
    <div class="tag-input-row"><input class="wide" type="text" id="turn-event-text" placeholder="Describe the event"><button class="action" style="width:auto;margin:0;" onclick="const v=document.getElementById('turn-event-text').value.trim(); if(v){addEventEntry(v);turnNote('Event: '+v);markStepDone(2);renderTurnGuide();}">Add</button></div>
    ${state.events.length ? `<div class="hint">Active: ${state.events.map(e=>escapeHtml(e.text)).join(' · ')}</div>` : ''}
    <div class="hint">Unrest-style changes from events go straight onto the flaws — adjust them on the Virtues tab.</div>`;
}

/* ---------- 3. Taxes ---------- */
function taxDiceCount(){ return state.settlements.reduce((s,x)=>s+(TAX_DICE[x.type]||0),0); }
function stepTaxes(){
  const ts = state.turnState;
  const count = taxDiceCount();
  const bySize = SETTLEMENT_SIZES.map(t=>{ const n = state.settlements.filter(s=>s.type===t).length; return n?`${n} ${t}${n>1?'s':''} × ${TAX_DICE[t]}d20`:''; }).filter(Boolean).join(' + ');
  if(ts.taxes) return `${stepTag('done','Done')}<div style="margin-top:8px;">${degreeBanner(ts.taxes.degree, ts.taxes.roll)}</div><div class="hint">${ts.taxes.text}</div>`;
  return `${stepTag('check','Economy check')}
    <div class="hint" style="margin-top:6px;">Roll Economy. Success: <b>${bySize||'no settlements yet'}</b> = <b>${count}d20 Gold</b>. Critical success also banks an Advantage. Failure: Mismanagement +2. Critical failure: Mismanagement +4.</div>
    <button class="action" ${count?'':'disabled style="opacity:.4;"'} onclick="rollTaxes()">Roll Economy check</button>`;
}
function rollTaxes(){
  openCheck({title:'Collect Taxes', virtue:'Economy', note:`Success: ${taxDiceCount()}d20 Gold.`, onResolve:(degree, roll)=>{
    const ts = state.turnState;
    let text;
    if(degree>=2){
      const g = rollDice(taxDiceCount(), 20);
      gain('Gold', g.total);
      text = `Collected <b>${g.total} Gold</b> (${g.rolls.join(' + ')}).`;
      if(degree===3){ state.advantages += 1; text += ' Critical success — you bank an Advantage.'; }
    } else {
      const d = degree===1 ? 2 : 4;
      changeFlaw('Mismanagement', d);
      text = `No taxes collected. Mismanagement +${d} (now ${flawValue('Mismanagement')}).`;
    }
    ts.taxes = {degree, roll, text};
    turnNote('Taxes: '+text.replace(/<[^>]+>/g,''));
    markStepDone(3);
    scheduleSave();
    renderTurnGuide();
  }});
}

/* ---------- 4. Collect resources ---------- */
function stepCollect(){
  const ts = state.turnState;
  const max = resourceChoicesPerTurn();
  const left = max - ts.collected.length;
  return `${stepTag('roll','Dice')}
    <div class="hint" style="margin-top:6px;">Choose ${max===1?'a resource':max+' different resources'}. Roll your Resource Die (<b>d${resourceDieSides()}</b>) once for each building or Trade Agreement you have for it.</div>
    ${counterLine(ts.collected.length, max, 'resource choice'+(max>1?'s':''))}
    ${COMMODITIES.map(g=>{
      const n = producerCount(g);
      const done = ts.collected.find(c=>c.good===g);
      const adv = heartlandAdvantage(g);
      return `<div class="row">
        <div class="label">${RES_ICON[g]} ${g}<small>${n} ${g==='Luxuries'?'Trade Agreement':BUILDING_FOR_GOOD[g]}${n===1?'':'s'}${adv?' · Heartland Advantage':''}</small></div>
        ${done ? `<span class="mono">+${done.total}</span>` : n===0 ? `<span class="loc-link" onclick="explainNoProducer('${g}')">how to get</span>` : `<button class="small-ghost" ${left<=0?'disabled style="opacity:.4;"':''} onclick="collectResource('${g}')">Roll ${n}d${resourceDieSides()}${adv?' adv':''}</button>`}
      </div>`;
    }).join('')}
    ${ts.collected.length ? `<div class="hint">${ts.collected.map(c=>`${c.good}: ${c.rolls.join(' + ')} = ${c.total}`).join('<br>')}</div>` : ''}`;
}
function explainNoProducer(g){ showResult(`No ${g} producers yet`, null, null, shortageHelp([{res:g, need:1, have:state.resources[g]||0}]).replace(/<b>1 [^<]+<\/b> \(you have \d+\) — /,'')); }
function collectResource(g){
  const ts = state.turnState;
  if(ts.collected.length >= resourceChoicesPerTurn() || ts.collected.find(c=>c.good===g)) return;
  const n = producerCount(g), sides = resourceDieSides(), adv = heartlandAdvantage(g);
  const rolls = [];
  for(let i=0;i<n;i++){ const a=rollDie(sides); rolls.push(adv ? Math.max(a, rollDie(sides)) : a); }
  const total = rolls.reduce((a,b)=>a+b,0);
  gain(g, total);
  ts.collected.push({good:g, rolls, total});
  turnNote(`Collected ${total} ${g}`);
  if(ts.collected.length >= resourceChoicesPerTurn()) markStepDone(4);
  scheduleSave(); renderTurnGuide();
}

/* ---------- 5. Resource action ---------- */
const RESOURCE_ACTION_COST = {Gold:50};
function stepResourceAction(){
  const ts = state.turnState;
  if(ts.resourceAction) return `${stepTag('done','Done')}<div style="margin-top:8px;">${ts.resourceAction.roll?degreeBanner(ts.resourceAction.degree, ts.resourceAction.roll):''}</div><div class="hint">${ts.resourceAction.text}</div>`;
  const missing = missingFor(RESOURCE_ACTION_COST);
  return `${stepTag('check','Check · 50 Gold')}
    <div class="hint" style="margin-top:6px;">Spend 50 Gold to build a resource building on a hex (Stability check), or to set up a Trade Agreement with a state you've contacted (Economy check).</div>
    ${missing.length ? `<div class="hint" style="color:var(--rust);">${shortageHelp(missing)}</div>` : `
      ${Object.entries(RESOURCE_BUILDINGS).map(([b,r])=>`<button class="option-card" style="padding:9px 12px;margin-bottom:6px;" onclick="resourceActionBuilding('${b}')"><div class="opt-name" style="font-size:13px;">Build a ${b} → ${r.good}</div><div class="opt-detail">On a ${r.terrains.join(' or ')} hex · Stability check</div></button>`).join('')}
      <button class="option-card" style="padding:9px 12px;margin-bottom:6px;" onclick="resourceActionTrade()"><div class="opt-name" style="font-size:13px;">Trade Agreement → Luxuries</div><div class="opt-detail">${state.relations.length?`With ${state.relations.map(r=>r.nation).join(', ')}`:'Contact a state with Send Diplomatic Envoy first'} · Economy check${heartlandAdvantage('Luxuries')?' with Heartland Advantage':''}</div></button>`}
    <button class="small-ghost" onclick="state.turnState.resourceAction={text:'Skipped.'};markStepDone(5);scheduleSave();renderTurnGuide();">Skip this turn</button>`;
}
function resourceActionBuilding(bname){
  startPick(`Resource Action: tap a ${RESOURCE_BUILDINGS[bname].terrains.join(' or ')} hex for the ${bname}.`, (col,row)=>{
    withTerrain(col,row, RESOURCE_BUILDINGS[bname].terrains, ()=>{
      openTurnGuide();
      openCheck({title:`Build a ${bname} at ${hexLabel(col,row)}`, virtue:'Stability', note:'Costs 50 Gold whatever the result.', onResolve:(degree, roll)=>{
        spend(RESOURCE_ACTION_COST);
        let text;
        if(degree>=2){ placeResourceBuilding(col,row,bname); text = `${bname} built at ${hexLabel(col,row)}.`; updateHexMarkers(); }
        else text = `The ${bname} wasn't built. 50 Gold spent.`;
        state.turnState.resourceAction = {degree, roll, text};
        turnNote(text); markStepDone(5); scheduleSave(); renderTurnGuide();
      }});
    });
  }, resourceBuildingValidate(bname));
}
function resourceActionTrade(){
  pickNation('Trade Agreement with which contacted state?', name=>{
    openTurnGuide();
    const adv = heartlandAdvantage('Luxuries');
    openCheck({title:`Trade Agreement with ${name}`, virtue:'Economy', useBanked:false, note:`Costs 50 Gold whatever the result.${adv?' Lake or River heartland: roll with Advantage.':''}`, extraAdvantage: adv ? 'your Lake or River heartland' : null, onResolve:(degree, roll)=>{
      spend(RESOURCE_ACTION_COST);
      let text;
      if(degree>=2){ const r = state.relations.find(x=>x.nation===name); r.trade = (r.trade||0)+1; text = `Trade Agreement with ${name} (now ${r.trade}).`; }
      else text = `${name} turned the agreement down. 50 Gold spent.`;
      state.turnState.resourceAction = {degree, roll, text};
      turnNote(text); markStepDone(5); scheduleSave(); renderTurnGuide();
    }});
  }, true);
}

/* ---------- 6. Leadership ---------- */
function stepLeadership(){
  const ts = state.turnState;
  const max = leadershipActionsPerTurn();
  const left = max - ts.used.leadership;
  const extra = buildingCountWithFlag('leadershipAction');
  return `${stepTag('check','Choose & check')}
    <div class="hint" style="margin-top:6px;">${max} Leadership Action${max>1?'s':''} (level ${lvl()>=7?'7: 2':'1: 1'}${extra?` + ${extra} from Keep/Castle/Palace`:''}).</div>
    ${counterLine(ts.used.leadership, max, 'Leadership Action'+(max>1?'s':''))}
    ${Object.entries(LEADERSHIP_ACTIONS).map(([name,a])=>{
      const missing = missingFor(a.cost);
      const advSrc = advantageSourceFor(name);
      const blocked = left<=0 || missing.length;
      return `<button class="option-card ${blocked?'locked':''}" style="padding:9px 12px;margin-bottom:6px;" ${blocked?'':`onclick="startLeadership('${jsArg(name)}')"`}>
        <div class="opt-name" style="font-size:13px;">${name} ${a.check?`<span class="pill" style="font-size:10px;">${VIRTUE_SHORT[a.check]}${a.altCheck?' or '+VIRTUE_SHORT[a.altCheck]:''}</span>`:''}${a.cost?` <span class="pill" style="font-size:10px;">${formatCost(a.cost)}</span>`:''}</div>
        <div class="opt-detail">${a.desc}${advSrc?` Advantage from ${escapeHtml(advSrc)}.`:''}${missing.length?`<br><span style="color:var(--rust);">Needs ${formatCost(a.cost)}.</span>`:''}</div>
      </button>`;
    }).join('')}
    ${ts.notes.filter(x=>x.step===6).map(x=>`<div class="hint">✓ ${escapeHtml(x.text)}</div>`).join('')}`;
}
function useAction(kind){ state.turnState.used[kind] += 1; }
function chooseOption(title, options, cb){
  window._optCb = cb;
  openOverlay('option-overlay', `<h3>${escapeHtml(title)}</h3>${options.map((o,i)=>`<button class="option-card" style="padding:9px 12px;margin-bottom:6px;" onclick="closeOverlay('option-overlay');window._optCb(${i})"><div class="opt-name" style="font-size:13px;">${escapeHtml(o)}</div></button>`).join('')}<button class="ghost" onclick="closeOverlay('option-overlay');backToTurn();">Cancel</button>`, 118);
}
function askText(title, placeholder, cb){
  window._textCb = cb;
  openOverlay('text-overlay', `<h3>${escapeHtml(title)}</h3><textarea class="wide" id="ask-text" rows="3" placeholder="${escapeAttr(placeholder)}"></textarea><button class="action" onclick="const v=document.getElementById('ask-text').value.trim();closeOverlay('text-overlay');window._textCb(v);">OK</button><button class="ghost" style="margin-top:8px;" onclick="closeOverlay('text-overlay');backToTurn();">Cancel</button>`, 118);
}
function leadershipDone(name, text, degree, roll){
  useAction('leadership');
  turnNote(`${name}: ${text.replace(/<[^>]+>/g,'')}`);
  scheduleSave();
  renderTurnGuide();
  showResult(name, degree, roll, text);
}
function reduceFlawText(flaw, degree){
  const amt = FLAW_REDUCE[degree];
  const changed = -changeFlaw(flaw, -amt);
  return `${flaw} reduced by ${changed} (now ${flawValue(flaw)}).`;
}
function startLeadership(name){
  const a = LEADERSHIP_ACTIONS[name];
  const run = (choiceIdx, extra) => {
    if(!a.check) return resolveLeadership(name, choiceIdx, extra, null, null);
    openCheck({title:name, virtue:a.check, altVirtue:a.altCheck, councilor:a.councilor, advantageAction:name,
      note: a.cost ? `Costs ${formatCost(a.cost)} whatever the result.` : '',
      onResolve:(degree, roll)=>resolveLeadership(name, choiceIdx, extra, degree, roll)});
  };
  if(name==='Focused Attention'){
    const seated = COUNCIL_ROLES.filter(r=>state.council[r].holder);
    if(!seated.length){ alert('Seat a councilor first.'); return; }
    return chooseOption('Whose councilor stats improve?', seated.map(r=>`${r} · ${seatHolderName(r)} (${fmt(seatBonus(r))})`), i=>{
      const role = seated[i];
      state.council[role].focus = (state.council[role].focus||0)+1;
      leadershipDone(name, `${seatHolderName(role)}'s ${role} bonus rises to ${fmt(seatBonus(role))}.`, null, null);
    });
  }
  if(name==='Request Foreign Aid'){
    return chooseOption('Aid in which resource? (5d6)', ['Gold'].concat(COMMODITIES), i=>{
      const res = ['Gold'].concat(COMMODITIES)[i];
      pickNation('Who sends the aid?', who=>run(i, {res, who}), false);
    });
  }
  if(name==='Send Diplomatic Envoy') return pickNation('Send the envoy to…', who=>run(null, {who}), false);
  if(name==='Pledge Fealty'){
    return startPick('Pledge Fealty: tap the occupied hex you demand joins your kingdom.', (col,row)=>{ openTurnGuide(); run(null, {col,row}); }, (col,row)=>isClaimed(col,row)?'already part of your kingdom.':null);
  }
  if(name==='Hire Adventurers') return askText('What should the adventurers do?', 'e.g. explore hex F7, clear the bandit camp', t=>run(null, {task:t}));
  if(a.choices) return chooseOption(name, a.choices, i=>run(i, null));
  run(null, null);
}
function resolveLeadership(name, choiceIdx, extra, degree, roll){
  const a = LEADERSHIP_ACTIONS[name];
  if(a.cost) spend(a.cost);
  const ok = degree===null || degree>=2;
  let text = '';
  if(name==='Go Fishing'){ const f = rollDie(4); gain('Food', f); text = `Caught <b>${f} Food</b>.`; }
  else if(name==='Request Foreign Aid'){
    const g = rollDice(5,6); gain(extra.res, g.total);
    state.debts.unshift({text:`${extra.who}: sent ${g.total} ${extra.res} (Request Foreign Aid)`, turn:state.turn});
    text = `${extra.who} sends <b>${g.total} ${extra.res}</b> (${g.rolls.join('+')}). You now owe them a debt.`;
  }
  else if(!ok){ text = `It didn't work out this turn.${a.cost?` ${formatCost(a.cost)} spent.`:''}`; }
  else if(name==='Capital Investment'){
    if(choiceIdx===0){ const g = rollDiceAdv(5,20, degree===3); gain('Gold', g.total); text = `Gained <b>${g.total} Gold</b> (${g.rolls.join('+')})${degree===3?' — critical, best of two rolls':''}.`; }
    else text = reduceFlawText('Mismanagement', degree);
  }
  else if(name==='Celebrate Holiday') text = choiceIdx===0 ? 'The gods are pleased — your GM grants a Boon from a God.' : reduceFlawText('Decay', degree);
  else if(name==='Infiltration') text = choiceIdx===0 ? 'Your spies learn a secret of another kingdom — ask your GM.' : reduceFlawText('Corruption', degree);
  else if(name==='Supernatural Studies') text = choiceIdx===0 ? 'Your spellcasters see a vision — ask your GM.' : reduceFlawText('Superstition', degree);
  else if(name==='Repair Reputation') text = choiceIdx===0 ? 'Your rule becomes more popular.' : reduceFlawText('Strife', degree);
  else if(name==='Hire Adventurers') text = `The adventurers succeed: ${escapeHtml(extra.task||'task complete')}.`;
  else if(name==='Send Diplomatic Envoy'){
    if(!state.relations.find(r=>r.nation===extra.who)) state.relations.push({nation:extra.who, trade:0});
    text = `Contact made with <b>${escapeHtml(extra.who)}</b>. You can now set up Trade Agreements with them. Establishing diplomatic relations earns XP.`;
  }
  else if(name==='Pledge Fealty'){
    const h = ensureHex(extra.col, extra.row);
    h.type = 'Claimed Territory';
    text = `${hexLabel(extra.col,extra.row)} pledges fealty and joins your kingdom (Size ${kingdomSize()}).`;
    updateHexMarkers();
  }
  leadershipDone(name, text, degree, roll);
}

/* ---------- 7. Hex actions ---------- */
function stepHex(){
  const ts = state.turnState;
  const max = hexActionsPerTurn();
  const left = max - ts.used.hex;
  return `${stepTag('check','Stability checks')}
    <div class="hint" style="margin-top:6px;">${max} Hex Action${max>1?'s':''} this turn. Each is a Stability check; costs are paid whatever the result.</div>
    ${counterLine(ts.used.hex, max, 'Hex Action'+(max>1?'s':''))}
    ${Object.entries(HEX_ACTIONS).map(([name,a])=>{
      const missing = name==='Build Roads' && state.roads ? [] : missingFor(a.cost);
      const blocked = left<=0 || missing.length || (name==='Build Roads' && state.roads);
      return `<button class="option-card ${blocked?'locked':''}" style="padding:9px 12px;margin-bottom:6px;" ${blocked?'':`onclick="startHexAction('${jsArg(name)}')"`}>
        <div class="opt-name" style="font-size:13px;">${name}${a.cost?` <span class="pill" style="font-size:10px;">${formatCost(a.cost)}</span>`:''}</div>
        <div class="opt-detail">${a.desc}${name==='Build Roads'&&state.roads?' Already built.':''}${missing.length?`<br><span style="color:var(--rust);">${shortageHelp(missing)}</span>`:''}</div>
      </button>`;
    }).join('')}
    ${ts.notes.filter(x=>x.step===7).map(x=>`<div class="hint">✓ ${escapeHtml(x.text)}</div>`).join('')}`;
}
function hexActionCheck(title, cost, onSuccess){
  openTurnGuide();
  openCheck({title, virtue:'Stability', note: cost ? `Costs ${formatCost(cost)} whatever the result.` : '', onResolve:(degree, roll)=>{
    if(cost) spend(cost);
    useAction('hex');
    let text;
    if(degree>=2) text = onSuccess(degree);
    else text = `Failed.${cost?` ${formatCost(cost)} spent.`:''}`;
    turnNote(`${title}: ${text.replace(/<[^>]+>/g,'')}`);
    scheduleSave(); updateHexMarkers(); renderTurnGuide();
    showResult(title, degree, roll, text);
  }});
}
function startHexAction(name){
  const cost = HEX_ACTIONS[name].cost;
  if(name==='Claim Hex'){
    return startPick('Claim Hex: tap the hex to claim.', (col,row)=>hexActionCheck(`Claim ${hexLabel(col,row)}`, null, ()=>{
      const h = ensureHex(col,row); h.type = 'Claimed Territory';
      return `${hexLabel(col,row)} is now part of your kingdom (Size ${kingdomSize()}).`;
    }), (col,row)=>isClaimed(col,row)?'already claimed.':null);
  }
  if(name==='Abandon Hex'){
    return startPick('Abandon Hex: tap a claimed hex to give up.', (col,row)=>{
      openTurnGuide();
      const h = state.hexes[hexKey(col,row)];
      h.type = '';
      useAction('hex');
      turnNote(`Abandoned ${hexLabel(col,row)}`);
      scheduleSave(); updateHexMarkers(); renderTurnGuide();
      showResult('Abandon Hex', null, null, `${hexLabel(col,row)} is no longer part of your kingdom (Size ${kingdomSize()}).`);
    }, (col,row)=>{
      const h = state.hexes[hexKey(col,row)];
      if(!isClaimed(col,row)) return 'not part of your kingdom.';
      if(h.type==='Capital') return 'that is your capital — relocate it first.';
      if(h.type==='Settlement') return 'a settlement stands here.';
      return null;
    });
  }
  if(name==='Establish Resource Building'){
    return chooseOption('Which resource building?', Object.keys(RESOURCE_BUILDINGS).map(b=>`${b} → ${RESOURCE_BUILDINGS[b].good} (${RESOURCE_BUILDINGS[b].terrains.join('/')})`), i=>{
      const bname = Object.keys(RESOURCE_BUILDINGS)[i];
      startPick(`Tap a ${RESOURCE_BUILDINGS[bname].terrains.join(' or ')} hex for the ${bname}.`, (col,row)=>{
        withTerrain(col,row, RESOURCE_BUILDINGS[bname].terrains, ()=>hexActionCheck(`${bname} at ${hexLabel(col,row)}`, cost, ()=>{
          placeResourceBuilding(col,row,bname);
          return `${bname} built at ${hexLabel(col,row)}.`;
        }));
      }, resourceBuildingValidate(bname));
    });
  }
  if(name==='Establish Settlement'){
    return startPick('Establish Settlement: tap the hex for the new village.', (col,row)=>{
      askText('Name the village', 'Village name', nm=>hexActionCheck(`Village at ${hexLabel(col,row)}`, cost, ()=>{
        const h = ensureHex(col,row);
        const vname = nm || 'New Village';
        h.type = 'Settlement'; h.name = vname; h.resourceBuilding = '';
        state.settlements.push({id:Date.now(), name:vname, type:'Village', col, row, buildings:[], notes:''});
        return `${escapeHtml(vname)} founded at ${hexLabel(col,row)}. Establishing a village earns XP.`;
      }));
    }, (col,row)=>{
      const h = state.hexes[hexKey(col,row)];
      if(h && (h.type==='Settlement'||h.type==='Capital')) return 'a settlement already stands here.';
      return null;
    });
  }
  if(name==='Level Up Settlement'){
    const options = state.settlements.map(s=>{
      const next = SETTLEMENT_SIZES[SETTLEMENT_SIZES.indexOf(s.type)+1];
      return {s, next};
    }).filter(o=>o.next);
    if(!options.length){ alert('Every settlement is already a Metropolis.'); return; }
    return chooseOption('Grow which settlement?', options.map(o=>{
      const lock = SETTLEMENT_UNLOCK_LEVEL[o.next] > lvl() ? ` — needs kingdom level ${SETTLEMENT_UNLOCK_LEVEL[o.next]}` : '';
      return `${o.s.name}: ${o.s.type} → ${o.next} (${SETTLEMENT_UPGRADE_COST[o.next]} G)${lock}`;
    }), i=>{
      const o = options[i];
      if(SETTLEMENT_UNLOCK_LEVEL[o.next] > lvl()){ alert(`${o.next}s unlock at kingdom level ${SETTLEMENT_UNLOCK_LEVEL[o.next]}.`); backToTurn(); return; }
      const c = {Gold:SETTLEMENT_UPGRADE_COST[o.next]};
      if(!canAfford(c)){ showResult('Not enough Gold', null, null, shortageHelp(missingFor(c))); return; }
      hexActionCheck(`${o.s.name} → ${o.next}`, c, ()=>{ o.s.type = o.next; return `${escapeHtml(o.s.name)} is now a ${o.next}. Expanding a settlement earns XP.`; });
    });
  }
  if(name==='Establish Fort'){
    return startPick('Establish Fort: tap the hex for the fort.', (col,row)=>hexActionCheck(`Fort at ${hexLabel(col,row)}`, cost, ()=>{
      const h = ensureHex(col,row); h.type = 'Fort'; if(!h.name) h.name = 'Fort';
      return `Fort raised at ${hexLabel(col,row)}. Establishing a fort earns XP.`;
    }), (col,row)=>{
      const h = state.hexes[hexKey(col,row)];
      if(h && ['Capital','Settlement','Fort'].includes(h.type)) return `already holds a ${h.type.toLowerCase()}.`;
      return null;
    });
  }
  if(name==='Build Roads') return hexActionCheck('Build Roads', cost, ()=>{ state.roads = true; return 'Roads built — travel within your kingdom is twice as fast.'; });
  if(name==='Irrigation'){
    return startPick('Irrigation: tap the hex to turn into lake or river.', (col,row)=>hexActionCheck(`Irrigate ${hexLabel(col,row)}`, cost, ()=>{
      const h = ensureHex(col,row);
      const lost = h.resourceBuilding;
      h.terrain = 'Water'; h.resourceBuilding = '';
      return `${hexLabel(col,row)} is now water.${lost?` Its ${lost} was lost.`:''}`;
    }), (col,row)=>{ const h=state.hexes[hexKey(col,row)]; return h && h.terrain==='Water' ? 'already water.' : null; });
  }
  if(name==='Relocate Capital'){
    const cap = capitalSettlement();
    const others = state.settlements.filter(s=>s.col!==undefined && (!cap || s.id!==cap.id));
    if(!others.length){ alert('You need another settlement on the map to move the capital to.'); return; }
    return chooseOption('Move the capital to…', others.map(s=>`${s.name} (${hexLabel(s.col,s.row)})`), i=>{
      const s = others[i];
      chooseOption('The new Heartland is…', Object.keys(HEARTLANDS).map(h=>`${h} (+2 ${HEARTLANDS[h].virtue})`), j=>{
        const heart = Object.keys(HEARTLANDS)[j];
        hexActionCheck(`Relocate capital to ${s.name}`, cost, ()=>{
          const old = capitalHex();
          if(old) state.hexes[old.key].type = 'Settlement';
          ensureHex(s.col,s.row).type = 'Capital';
          state.creation.heartland = heart;
          return `${escapeHtml(s.name)} is your new capital. Heartland is now ${heart}.`;
        });
      });
    });
  }
}

/* ---------- 8. Building action ---------- */
function stepBuilding(){
  const ts = state.turnState;
  const max = buildingSettlementsPerTurn();
  return `${stepTag('check','Stability check')}
    <div class="hint" style="margin-top:6px;">Choose ${max>1?'up to '+max+' settlements':'a settlement'}. Succeed at a Stability check and you can raise buildings there this turn — as many as you can pay for.</div>
    ${counterLine(ts.used.building, max, 'settlement'+(max>1?'s':''))}
    ${state.settlements.map(s=>{
      const unlocked = ts.buildingUnlocked.includes(s.id);
      const tried = ts.buildingTried.includes(s.id);
      return `<div class="row">
        <div class="label">${escapeHtml(s.name)}<small>${s.type} · ${s.buildings.length} buildings</small></div>
        ${unlocked ? `<button class="small-ghost" onclick="closeOverlay('turn-overlay');switchTab('notes');openBuildPicker(${s.id},false);">Build here →</button>`
          : tried ? `<span class="hint" style="margin:0;">failed</span>`
          : `<button class="small-ghost" ${ts.used.building>=max?'disabled style="opacity:.4;"':''} onclick="startBuildingAction(${s.id})">Roll</button>`}
      </div>`;
    }).join('') || '<div class="hint">No settlements yet.</div>'}
    ${ts.buildingUnlocked.length ? `<div class="hint">Unlocked this turn: ${ts.buildingUnlocked.map(id=>{ const s=state.settlements.find(x=>x.id===id); return s?escapeHtml(s.name):''; }).join(', ')}. Build from the Towns tab, then come back here.</div>` : ''}`;
}
function startBuildingAction(sid){
  const s = state.settlements.find(x=>x.id===sid);
  openCheck({title:`Building Action · ${s.name}`, virtue:'Stability', onResolve:(degree, roll)=>{
    const ts = state.turnState;
    ts.used.building += 1;
    ts.buildingTried.push(sid);
    let text;
    if(degree>=2){ ts.buildingUnlocked.push(sid); text = `Work can begin in ${escapeHtml(s.name)} — build as much as you can afford this turn.`; }
    else text = `The builders of ${escapeHtml(s.name)} can't start this turn.`;
    turnNote(`Building Action ${s.name}: ${degree>=2?'success':'failed'}`);
    scheduleSave(); renderTurnGuide();
    showResult(`Building Action · ${s.name}`, degree, roll, text + (degree>=2 ? `<br><button class="action" style="margin-top:10px;" onclick="closeOverlay('result-overlay');closeOverlay('turn-overlay');switchTab('notes');openBuildPicker(${sid},false);">Choose buildings</button>` : ''));
  }});
}

/* ---------- 9. Army cost ---------- */
function stepArmyCost(){
  const ts = state.turnState;
  const up = armyUpkeep();
  if(ts.armyCost) return `${stepTag('done','Paid')}<div class="hint" style="margin-top:6px;">${ts.armyCost}</div>`;
  if(!state.armies.some(a=>a.units.length)) return `${stepTag('auto','Automatic')}<div class="hint" style="margin-top:6px;">No units recruited — nothing to pay.</div>`;
  return `${stepTag('auto','Automatic')}
    <div class="hint" style="margin-top:6px;">Each unit costs Gold and Food every turn — less while stationed in a settlement or fort.</div>
    ${state.armies.map(a=>`<div class="row"><div class="label">${escapeHtml(a.name)}<small>${armyIsStationed(a)?'stationed':'in the field'} · ${a.units.length} unit${a.units.length===1?'':'s'}</small></div></div>`).join('')}
    <div class="big-roll mono" style="font-size:20px;">${up.Gold} Gold · ${up.Food} Food</div>
    <button class="action" onclick="payArmyCost()">Pay army cost</button>`;
}
function payArmyCost(){
  const up = armyUpkeep();
  const shortG = Math.max(0, up.Gold - state.resources.Gold), shortF = Math.max(0, up.Food - state.resources.Food);
  gain('Gold', -up.Gold); gain('Food', -up.Food);
  let text = `Paid ${up.Gold - shortG} Gold and ${up.Food - shortF} Food.`;
  if(shortG||shortF) text += ` <b style="color:var(--rust);">Short by ${shortG?shortG+' Gold':''}${shortG&&shortF?' and ':''}${shortF?shortF+' Food':''}</b> — tell your GM; unpaid troops may desert or riot.`;
  state.turnState.armyCost = text;
  turnNote(text.replace(/<[^>]+>/g,''));
  markStepDone(9); scheduleSave(); renderTurnGuide();
}

/* ---------- 10. Army actions ---------- */
function stepArmyActions(){
  const ts = state.turnState;
  const max = armyActionsPerTurn();
  const left = max - ts.used.army;
  return `${stepTag('check','Might checks')}
    <div class="hint" style="margin-top:6px;">${max} Army Action${max>1?'s':''} this turn (Might check, General's bonus).</div>
    ${counterLine(ts.used.army, max, 'Army Action'+(max>1?'s':''))}
    ${Object.entries(ARMY_ACTIONS).map(([name,a])=>`<button class="option-card ${left<=0?'locked':''}" style="padding:9px 12px;margin-bottom:6px;" ${left<=0?'':`onclick="startArmyAction('${jsArg(name)}')"`}>
      <div class="opt-name" style="font-size:13px;">${name}</div><div class="opt-detail">${a.desc}${advantageSourceFor(name)?` Advantage from ${escapeHtml(advantageSourceFor(name))}.`:''}</div></button>`).join('')}
    ${ts.notes.filter(x=>x.step===10).map(x=>`<div class="hint">✓ ${escapeHtml(x.text)}</div>`).join('')}`;
}


/* =====================================================================
   WAR — units grouped into armies that sit on map hexes.
   Battles are played at the table: each unit acts like a character,
   attacking with Might (minus Weakness). The app tracks stats and HP.
===================================================================== */
function newUnit(type){
  const t = UNIT_TYPES[type];
  return {id:newId(), type, hp:t.size, maxHp:t.size, dmg:0, ac:0};
}
function unitStatLine(u){
  const t = UNIT_TYPES[u.type];
  return `d${t.die}${u.dmg?'+'+u.dmg:''} · AC ${t.ac+u.ac} · ${t.range} · ${t.move} ft · ${t.actions} actions`;
}
function armyLabel(a){ return `${a.name}${a.col!==undefined?' ('+hexLabel(a.col,a.row)+')':' (at home)'}`; }
let expandedUnitRef = false;
function renderWarfareTab(){
  const el = document.getElementById('tab-warfare');
  if(!el) return;
  const up = armyUpkeep();
  const atk = unitAttackBonus();
  el.innerHTML = `
    <div class="card">
      <h3>War (Beta)</h3>
      <div class="hint" style="margin-top:0;">Recruit units and group them into armies on the map. Army Actions happen in step 10 of the Kingdom Turn. In battle each unit acts like a character: it attacks with <b>d20 ${fmt(atk)}</b> (Might ${virtueValue('Might')} − Weakness ${flawValue('Weakness')}) and moves or attacks with its actions. Every unit triggers reaction attacks unless it says otherwise.</div>
      <div class="row" style="border:none;"><div class="label">Army cost per turn<small>paid in step 9</small></div><div class="mono">${up.Gold} G · ${up.Food} Food</div></div>
    </div>
    ${state.armies.length ? state.armies.map(renderArmyCard).join('') : `<div class="card"><div class="empty-state"><div class="glyph">⚔</div>No armies yet.<div class="sub">Recruit Unit is an Army Action (Kingdom Turn step 10).</div></div></div>`}
    <div class="card">
      <h3>Record existing units</h3>
      <div class="hint" style="margin-top:0;">For units you already have from earlier play. Nothing is spent.</div>
      <button class="small-ghost" onclick="recordExistingUnit()">+ Record a unit</button>
    </div>
    <div class="card">
      <div class="card-head-row"><h3 style="margin-bottom:0;">Unit reference</h3><button class="small-ghost" onclick="expandedUnitRef=!expandedUnitRef;renderWarfareTab();">${expandedUnitRef?'Hide':'Show'}</button></div>
      ${expandedUnitRef ? Object.entries(UNIT_TYPES).map(([k,t])=>`
        <div class="unit-ref">
          <div class="opt-name">${t.label} <span class="pill" style="font-size:10px;">${canRecruitType(k)?'can recruit':'needs '+t.needs}</span></div>
          <div class="hint" style="margin-top:2px;">Recruit ${formatCost(t.recruit)} per ${t.size} soldier${t.size>1?'s':''} · upkeep ${formatCost(t.upkeep)} · stationed ${formatCost(t.stationed)}</div>
          <div class="hint" style="margin-top:2px;">d${t.die} · ${t.range} · ${t.move} ft · AC ${t.ac} · ${t.actions} actions</div>
          ${t.notes.map(n=>`<div class="hint" style="margin-top:2px;">• ${escapeHtml(n)}</div>`).join('')}
        </div>`).join('') : ''}
    </div>`;
}
function renderArmyCard(a){
  return `<div class="card">
    <div class="settlement-head">
      <input type="text" value="${escapeAttr(a.name)}" style="font-family:'Cinzel',serif;font-weight:600;background:none;border:none;font-size:16px;padding:0;flex:1;min-width:0;" onchange="renameArmy('${a.id}', this.value)">
      <span class="pill">${armyIsStationed(a)?'stationed':'in the field'}</span>
    </div>
    <div class="settlement-loc">${a.col!==undefined ? `<span class="loc-pin">⌖ ${hexLabel(a.col,a.row)}</span><button class="loc-link" onclick="jumpToHex(${a.col},${a.row})">view on map</button>` : '<span class="hint" style="margin:0;">At home — not deployed</span>'}</div>
    ${a.units.length ? a.units.map(u=>{
      const t = UNIT_TYPES[u.type];
      return `<div class="unit-row">
        <div class="unit-top"><b>${t.label}</b><span class="mono">${u.hp}/${u.maxHp} HP</span></div>
        <div class="hp-bar"><div style="width:${Math.max(0,Math.min(100,u.hp/u.maxHp*100))}%"></div></div>
        <div class="hint" style="margin-top:2px;">${unitStatLine(u)}${u.dmg?` · trained +${u.dmg}`:''}${u.ac?` · outfitted +${u.ac} AC`:''}</div>
        <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
          <button class="small-ghost" onclick="unitHp('${a.id}','${u.id}',-1)">−1 HP</button>
          <button class="small-ghost" onclick="unitHp('${a.id}','${u.id}',-5)">−5</button>
          <button class="small-ghost" onclick="unitHp('${a.id}','${u.id}',1)">+1</button>
          <button class="small-ghost" onclick="rollUnitAttack('${a.id}','${u.id}')">Attack roll</button>
        </div>
      </div>`;
    }).join('') : '<div class="hint">No units.</div>'}
  </div>`;
}
function findArmy(id){ return state.armies.find(x=>x.id===id); }
function renameArmy(id, name){ const a=findArmy(id); if(a){ a.name=name; scheduleSave(); updateHexMarkers(); } }
function unitHp(aid, uid, d){
  const a = findArmy(aid); if(!a) return;
  const u = a.units.find(x=>x.id===uid); if(!u) return;
  u.hp = Math.max(0, Math.min(u.maxHp, u.hp+d));
  scheduleSave(); renderWarfareTab();
}
function rollUnitAttack(aid, uid){
  const a = findArmy(aid); const u = a && a.units.find(x=>x.id===uid); if(!u) return;
  const t = UNIT_TYPES[u.type];
  const nat = rollDie(20), bonus = unitAttackBonus(), dmg = rollDie(t.die)+u.dmg;
  showResult(`${t.label} attacks`, null, null, `Attack: <b>${nat} ${fmt(bonus)} = ${nat+bonus}</b> vs the target's AC${nat===20?' (natural 20)':nat===1?' (natural 1)':''}.<br>Damage if it hits: <b>${dmg}</b> (d${t.die}${u.dmg?'+'+u.dmg:''}).<br>Apply advantage/disadvantage from the unit's notes at the table.`);
}
function recordExistingUnit(){
  chooseOption('Which unit type?', Object.values(UNIT_TYPES).map(t=>t.label), i=>{
    const type = Object.keys(UNIT_TYPES)[i];
    chooseArmyFor(`Add the ${UNIT_TYPES[type].label} to…`, army=>{
      army.units.push(newUnit(type));
      addLog(`Recorded ${UNIT_TYPES[type].label} in ${army.name}.`);
      scheduleSave(); render();
    });
  });
}
// Pick an existing army or make a new one at the capital.
function chooseArmyFor(title, cb){
  const opts = state.armies.map(a=>armyLabel(a)).concat(['+ New army']);
  chooseOption(title, opts, i=>{
    if(i < state.armies.length) return cb(state.armies[i]);
    const cap = capitalHex();
    const army = {id:newId(), name:`Army ${state.armies.length+1}`, col:cap?cap.col:undefined, row:cap?cap.row:undefined, units:[]};
    state.armies.push(army);
    cb(army);
  });
}
function chooseUnit(title, filter, cb){
  const list = [];
  state.armies.forEach(a=>a.units.forEach(u=>{ if(!filter || filter(u)) list.push({a,u}); }));
  if(!list.length){ alert('No units to choose.'); backToTurn(); return; }
  chooseOption(title, list.map(x=>`${UNIT_TYPES[x.u.type].label} · ${x.a.name} (${x.u.hp}/${x.u.maxHp} HP)`), i=>cb(list[i].a, list[i].u));
}
function armyActionCheck(title, cost, onSuccess){
  openTurnGuide();
  openCheck({title, virtue:'Might', advantageAction:title.split(' · ')[0], note: cost ? `Costs ${formatCost(cost)} whatever the result.` : '', onResolve:(degree, roll)=>{
    if(cost) spend(cost);
    useAction('army');
    const text = degree>=2 ? onSuccess(degree) : `Failed.${cost?` ${formatCost(cost)} spent.`:''}`;
    turnNote(`${title}: ${text.replace(/<[^>]+>/g,'')}`);
    scheduleSave(); updateHexMarkers(); renderTurnGuide();
    showResult(title, degree, roll, text);
  }});
}
function startArmyAction(name){
  if(name==='Recruit Unit'){
    const types = Object.keys(UNIT_TYPES);
    return chooseOption('Recruit which unit?', types.map(k=>{
      const t = UNIT_TYPES[k];
      return `${t.label} — ${formatCost(t.recruit)}${canRecruitType(k)?'':' (needs '+t.needs+')'}`;
    }), i=>{
      const type = types[i], t = UNIT_TYPES[type];
      if(!canRecruitType(type)){ showResult(`Can't recruit ${t.label}`, null, null, `Build a ${t.needs} first.`); return; }
      if(!canAfford(t.recruit)){ showResult('Not enough resources', null, null, shortageHelp(missingFor(t.recruit))); return; }
      chooseArmyFor(`Put the ${t.label} in…`, army=>armyActionCheck(`Recruit Unit · ${t.label}`, t.recruit, ()=>{
        army.units.push(newUnit(type));
        return `${t.label} (${t.size} soldier${t.size>1?'s':''}) join ${escapeHtml(army.name)}.`;
      }));
    });
  }
  if(name==='Deploy Army'){
    if(!state.armies.length){ alert('No armies yet.'); return; }
    const range = kingdomHasFlag('portals') ? 30 : kingdomHasFlag('boats') ? 20 : 10;
    const how = range===30 ? 'magic portals' : range===20 ? 'boat' : 'land';
    return chooseOption('Deploy which army?', state.armies.map(armyLabel), i=>{
      const army = state.armies[i];
      startPick(`Deploy ${army.name}: tap its destination (up to ${range} hexes by ${how}).`, (col,row)=>armyActionCheck(`Deploy Army · ${army.name}`, null, ()=>{
        army.col = col; army.row = row;
        return `${escapeHtml(army.name)} moves to ${hexLabel(col,row)}.`;
      }), (col,row)=>{
        if(army.col===undefined){ const cap = capitalHex(); if(cap && hexDistance(cap.col,cap.row,col,row)>range) return `more than ${range} hexes from your capital.`; return null; }
        return hexDistance(army.col,army.row,col,row)>range ? `more than ${range} hexes away.` : null;
      });
    });
  }
  if(name==='Disband'){
    if(!state.armies.length){ alert('No armies yet.'); return; }
    return chooseOption('Disband what?', ['A single unit','An entire army'], i=>{
      if(i===0) return chooseUnit('Disband which unit?', null, (army,u)=>{
        army.units = army.units.filter(x=>x.id!==u.id);
        useAction('army'); turnNote(`Disbanded ${UNIT_TYPES[u.type].label}`);
        scheduleSave(); updateHexMarkers(); renderTurnGuide();
      });
      chooseOption('Disband which army?', state.armies.map(armyLabel), j=>{
        const army = state.armies[j];
        state.armies = state.armies.filter(x=>x.id!==army.id);
        useAction('army'); turnNote(`Disbanded ${army.name}`);
        scheduleSave(); updateHexMarkers(); renderTurnGuide();
      });
    });
  }
  if(name==='Train Unit'){
    if(!kingdomHasFlag('train')){ showResult('Train Unit', null, null, 'Requires a Garrison in one of your settlements.'); return; }
    return chooseUnit('Train which unit?', null, (army,u)=>armyActionCheck(`Train Unit · ${UNIT_TYPES[u.type].label}`, null, ()=>{ u.dmg += 1; return `${UNIT_TYPES[u.type].label} now deals d${UNIT_TYPES[u.type].die}+${u.dmg}.`; }));
  }
  if(name==='Outfit Unit'){
    if(!kingdomHasFlag('outfit')){ showResult('Outfit Unit', null, null, 'Requires a Blacksmith in one of your settlements.'); return; }
    return chooseUnit('Outfit which unit?', null, (army,u)=>armyActionCheck(`Outfit Unit · ${UNIT_TYPES[u.type].label}`, null, ()=>{ u.ac += 1; return `${UNIT_TYPES[u.type].label} is now AC ${UNIT_TYPES[u.type].ac+u.ac}.`; }));
  }
  if(name==='Recover Unit'){
    return chooseUnit('Heal which unit?', u=>u.hp<u.maxHp, (army,u)=>armyActionCheck(`Recover Unit · ${UNIT_TYPES[u.type].label}`, null, ()=>{ u.hp = u.maxHp; return `${UNIT_TYPES[u.type].label} is back to ${u.hp} HP.`; }));
  }
  if(name==='Recruit'){
    return chooseUnit('Reinforce which unit?', null, (army,u)=>{
      const t = UNIT_TYPES[u.type];
      if(!canAfford(t.recruit)){ showResult('Not enough resources', null, null, shortageHelp(missingFor(t.recruit))); return; }
      armyActionCheck(`Recruit · ${t.label}`, t.recruit, ()=>{ u.maxHp += t.size; u.hp += t.size; return `${t.label} grows to ${u.hp}/${u.maxHp} HP.`; });
    });
  }
  if(name==='Offensive Gambit'){
    if(!state.armies.length){ alert('No armies yet.'); return; }
    return chooseOption('Which army attempts the gambit?', state.armies.map(armyLabel), i=>{
      const army = state.armies[i];
      armyActionCheck(`Offensive Gambit · ${army.name}`, null, ()=>`${escapeHtml(army.name)} engages the enemy with Advantage.`);
    });
  }
}


/* =====================================================================
   MAP — hex grid calibrated to the Stolen Lands art, zoom/pan, markers
===================================================================== */
const VB_W = 2048, VB_H = 768;
const HEX_S = 42.67;
const ORIGIN_X = 53.0, ORIGIN_Y = 49.0;
const HEX_W = Math.sqrt(3)*HEX_S;
const HEX_VSPACE = 1.5*HEX_S;
const HEX_COLS = Math.ceil((VB_W-ORIGIN_X)/HEX_W)+2;
const HEX_ROWS = Math.ceil((VB_H-ORIGIN_Y)/HEX_VSPACE)+2;
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
  // Buttons floating over the map (pick banner, zoom) must keep their own clicks —
  // capturing the pointer here would retarget the click to the map instead.
  if(e.target.closest && e.target.closest('#map-float-pick-banner, #map-zoom-controls, #map-recenter-btn')) return;
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
    if(!h) return;
    const [col,row] = key.split('_').map(Number);
    const [cx,cy] = hexCenter(col,row);
    if(h.resourceBuilding && RESOURCE_BUILDINGS[h.resourceBuilding]){
      const rb = document.createElementNS('http://www.w3.org/2000/svg','text');
      rb.setAttribute('x', (cx-HEX_S*0.5).toFixed(1));
      rb.setAttribute('y', (cy-HEX_S*0.35).toFixed(1));
      rb.setAttribute('class','hex-marker army-marker');
      rb.textContent = RES_ICON[RESOURCE_BUILDINGS[h.resourceBuilding].good];
      frag.appendChild(rb);
    }
    if(!h.type || !HEX_TYPE_SYMBOLS[h.type]) return;
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
  if(pickMode){ onHexTapDuringPick(col,row); return; }
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
    <div class="popup-caption">${hexLabel(col,row)}${h && h.name ? ' · '+escapeHtml(h.name) : ''}${h && h.terrain ? ' · '+h.terrain : ''}${h && h.resourceBuilding ? ' · '+h.resourceBuilding : ''}</div>
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



/* ---------- hex edit panel (built from JS so hot updates don't depend on index.html) ---------- */
const HEX_TYPE_SYMBOLS = {
  'Capital':'♜︎', 'Settlement':'⌂︎', 'Fort':'⛫︎', 'Claimed Territory':'⚑︎',
  'Friendly Camp':'⚐︎', 'Enemy Base':'⚔︎', 'Point of Interest':'★︎', 'Side Quest':'!', 'Hazard':'☠︎'
};
const MANUAL_MARKERS = ['Claimed Territory','Fort','Friendly Camp','Enemy Base','Point of Interest','Side Quest','Hazard'];
const HEX_RESOURCE_PRESETS = ['Furs','Game','Herbs','Gems'];
const HEX_FEATURE_PRESETS = ['Landmark','Ravine','Ruins','Cave','Sacred Site'];
let activeHexKey = null;
function presetSelect(field, presets, value){
  const custom = value && !presets.includes(value);
  return `<select id="hex-${field}-select" onchange="document.getElementById('hex-${field}-custom').style.display=this.value==='__custom__'?'block':'none'">
      <option value="">— none —</option>
      ${presets.map(p=>`<option ${value===p?'selected':''}>${p}</option>`).join('')}
      <option value="__custom__" ${custom?'selected':''}>Custom…</option>
    </select>
    <input type="text" id="hex-${field}-custom" class="wide" style="margin-top:6px;display:${custom?'block':'none'};" value="${custom?escapeAttr(value):''}" placeholder="Describe it">`;
}
function readPreset(field){
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
  const h = state.hexes[activeHexKey] || {};
  const locked = h.type==='Capital' || h.type==='Settlement';
  const settlement = state.settlements.find(s=>s.col===col && s.row===row);
  const armiesHere = state.armies.filter(a=>a.col===col && a.row===row);
  const panel = document.getElementById('hex-panel');
  panel.innerHTML = `<div class="hex-panel-inner card">
    <h3>Hex ${hexLabel(col,row)}${h.type?` <span class="sub">${escapeHtml(h.type)}</span>`:''}</h3>
    ${settlement ? `<div class="hint" style="margin-top:0;">${escapeHtml(settlement.name)} (${settlement.type}) stands here. <span class="loc-link" onclick="closeHexPanel();switchTab('notes');">Open in Towns</span></div>` : ''}
    ${armiesHere.length ? `<div class="hint" style="margin-top:0;">Armies here: ${armiesHere.map(a=>escapeHtml(a.name)).join(', ')}</div>` : ''}
    <div class="row"><div class="label">Name</div><input type="text" id="hex-name" class="wide" style="max-width:190px;" value="${escapeAttr(h.name||'')}" placeholder="e.g. Oleg's Trading Post"></div>
    <div class="row"><div class="label">Marker<small>${locked?'set by your settlement':'claiming normally happens with the Claim Hex action'}</small></div>
      ${locked ? `<span class="pill">${h.type}</span><input type="hidden" id="hex-type" value="${h.type}">` :
      `<select id="hex-type"><option value="">— none —</option>${MANUAL_MARKERS.map(m=>`<option ${h.type===m?'selected':''}>${m}</option>`).join('')}</select>`}
    </div>
    <div class="row"><div class="label">Terrain<small>your GM's call</small></div>
      <select id="hex-terrain" onchange="renderHexBuildingSelect()"><option value="">— not set —</option>${TERRAINS.map(t=>`<option ${h.terrain===t?'selected':''}>${t}</option>`).join('')}</select>
    </div>
    <div class="row"><div class="label">Resource building<small>new ones are built with the Resource or Hex Action</small></div><div id="hex-building-wrap"></div></div>
    <div class="row" style="flex-direction:column;align-items:stretch;"><div class="label">Resources</div>${presetSelect('resources', HEX_RESOURCE_PRESETS, h.resources||'')}</div>
    <div class="row" style="flex-direction:column;align-items:stretch;"><div class="label">Features</div>${presetSelect('features', HEX_FEATURE_PRESETS, h.features||'')}</div>
    <textarea class="wide" id="hex-note" rows="3" placeholder="Notes about this hex..." style="margin-top:8px;">${escapeHtml(h.note||'')}</textarea>
    <button class="action" onclick="saveHex()">Save hex</button>
    <button class="ghost" style="margin-top:8px;" onclick="closeHexPanel()">Close</button>
  </div>`;
  window._hexPanelBuilding = h.resourceBuilding || '';
  renderHexBuildingSelect();
  panel.classList.add('open');
}
function renderHexBuildingSelect(){
  const terrain = document.getElementById('hex-terrain').value;
  const cur = window._hexPanelBuilding;
  const fits = Object.keys(RESOURCE_BUILDINGS).filter(b=>!terrain || RESOURCE_BUILDINGS[b].terrains.includes(terrain));
  document.getElementById('hex-building-wrap').innerHTML = `<select id="hex-building" onchange="window._hexPanelBuilding=this.value">
    <option value="">— none —</option>
    ${fits.map(b=>`<option ${cur===b?'selected':''}>${b}</option>`).join('')}
  </select>${cur && !fits.includes(cur) ? `<div class="hint" style="color:var(--rust);">A ${cur} can't stand on ${terrain}; it will be removed on save.</div>` : ''}`;
}
function closeHexPanel(){
  const svg = document.getElementById('hexoverlay');
  if(svg) svg.querySelectorAll('.hex-cell.selected').forEach(p=>p.classList.remove('selected'));
  activeHexKey = null;
  document.getElementById('hex-panel').classList.remove('open');
}
function saveHex(){
  if(!activeHexKey) return;
  const prev = state.hexes[activeHexKey] || {};
  const terrain = document.getElementById('hex-terrain').value;
  let building = document.getElementById('hex-building').value;
  if(building && terrain && !RESOURCE_BUILDINGS[building].terrains.includes(terrain)) building = '';
  if(building && building!==prev.resourceBuilding && !confirm(`Record a ${building} here without spending anything? New ones are normally built with the Resource Action or a Hex Action in the Kingdom Turn.`)) building = prev.resourceBuilding || '';
  const h = {
    name: document.getElementById('hex-name').value.trim(),
    type: document.getElementById('hex-type').value,
    terrain, resourceBuilding: building,
    resources: readPreset('resources'), features: readPreset('features'),
    note: document.getElementById('hex-note').value.trim()
  };
  if(building && !h.type) h.type = 'Claimed Territory';
  if(!Object.values(h).some(Boolean)) delete state.hexes[activeHexKey];
  else state.hexes[activeHexKey] = h;
  const s = state.settlements.find(x=>hexKey(x.col,x.row)===activeHexKey);
  if(s && h.name && s.name!==h.name) s.name = h.name;
  scheduleSave();
  updateHexMarkers();
  render();
  closeHexPanel();
}
function renderMapExtras(){
  const legend = document.getElementById('map-legend');
  if(legend) legend.innerHTML = Object.keys(HEX_TYPE_SYMBOLS).map(t=>`<span class="legend-item"><span class="legend-swatch">${HEX_TYPE_SYMBOLS[t]}</span>${t}</span>`).join('')
    + Object.keys(RESOURCE_BUILDINGS).map(b=>`<span class="legend-item"><span class="legend-swatch">${RES_ICON[RESOURCE_BUILDINGS[b].good]}</span>${b}</span>`).join('')
    + `<span class="legend-item"><span class="legend-swatch">⚔</span>Army</span>`;
  updateHexMarkers();
}
function jumpToHex(col,row){
  closeOverlay('turn-overlay');
  switchTab('map');
  setTimeout(()=>openHexPanel(col,row), 0);
}

/* =====================================================================
   BINDINGS
===================================================================== */
document.getElementById('kingdomName').addEventListener('input', e=>{ if(state){ state.name=e.target.value; scheduleSave(); } });
document.querySelectorAll('.tab-btn').forEach(btn=>{ btn.addEventListener('click', ()=>switchTab(btn.dataset.tab)); });
(function(){
  const wrap = document.getElementById('map-fullscreen-wrap');
  wrap.addEventListener('pointerdown', mapOnPointerDown);
  wrap.addEventListener('pointermove', mapOnPointerMove);
  wrap.addEventListener('pointerup', mapOnPointerUp);
  wrap.addEventListener('pointercancel', mapOnPointerUp);
  wrap.addEventListener('wheel', mapOnWheel, {passive:false});
})();
window.addEventListener('resize', ()=>{ if(document.getElementById('tab-map').classList.contains('active')) measureMapLayout(); });
// The extra styles the v2 screens need live here too, so a hot update (new app.js,
// possibly an older cached style.css) still looks right.
(function injectV2Styles(){
  if(document.getElementById('kl-v2-styles')) return;
  const st = document.createElement('style');
  st.id = 'kl-v2-styles';
  st.textContent = V2_CSS;
  document.head.appendChild(st);
})();

loadState();
