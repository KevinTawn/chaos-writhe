'use strict';
/**
 * 混乱与蠕动 · 权威规则引擎（服务器端）
 * 规则函数取自单机版 同步更新单机版.html 的 <script>，仅移除 DOM 渲染。
 * 每个 createGameEngine() 实例持有独立的 gameState、计时器与日志。
 */
const { COLS, ROWS, MODE_NAMES, UNIT_COST, SKILL_LIBRARY, SKILL_CARD_MAP } = require('./constants.js');

const MODES = ['classic', 'snow', 'wannan', 'pirate', 'fog', 'holy', 'mine', 'tide', 'beacon', 'neon'];

function createGameEngine(options = {}) {
    const onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : () => {};
    // 仅供平衡性实验使用；服务器不会传入，正式玩法保持 null。
    const experimentalHolyChaos = options.holyChaos || null;

    function notify() {
        try { onUpdate(); } catch (error) { console.error('[engine] onUpdate 失败：', error); }
    }
    function getRevealBucket(side) {
        gameState.revealBySide = gameState.revealBySide || {
            red: { mines: 0, enemy: 0, cards: 0, ghosts: 0 },
            blue: { mines: 0, enemy: 0, cards: 0, ghosts: 0 }
        };
        if (!gameState.revealBySide[side]) gameState.revealBySide[side] = { mines: 0, enemy: 0, cards: 0, ghosts: 0 };
        return gameState.revealBySide[side];
    }
    function revealFor(side, kind, duration) {
        if (!['red', 'blue'].includes(side)) return false;
        const bucket = getRevealBucket(side);
        bucket[kind] = Math.max(bucket[kind] || 0, Date.now() + duration);
        renderAll();
        scheduleGame(() => { renderAll(); }, duration + 50);
        return true;
    }


    /* 图鉴浮层复用同一份关键词与卡牌注释，避免文案分叉（联机引擎无 window，自动跳过）。 */
    if(typeof window!=='undefined'){
        window.CARD_KEYWORD_HELP=CARD_KEYWORD_HELP;
        window.CARD_NOTES=CARD_NOTES;
    }
    const ARMORY_LOW_KEYS=['二阶步兵','排雷兵','掷弹兵','工兵','双发炮兵'];
    const ARMORY_HIGH_KEYS=['装甲车','补给车','二阶战车','指挥车'];
    const ARMORY_UNITS={
      '二阶步兵':{tier:'low',cost:4,base:'二阶步兵',desc:'2 HP 的步兵；HP≥2 时攻击 +1、受击时攻击方点数 -1；第一次受伤后降为普通步兵。'},
      '排雷兵':{tier:'low',cost:4,base:'步兵',buffs:['mine_detector','minesweeper'],desc:'显示周围 3×3 格内敌方地雷（包括伪装地雷）；踩雷时 1 点自己混乱，2–6 无事。'},
      '掷弹兵':{tier:'low',cost:4,base:'步兵',buffs:['grenadier'],desc:'每局一次：与己方单位相邻时，可轰击该友军正后方直线上最近的一个敌军（不限距离；地形或友军会阻挡）。'},
      '工兵':{tier:'low',cost:4,base:'步兵',buffs:['engineer'],desc:'花费 1 行动建造相邻防御工事；或移动到相邻敌方工事/地雷格并拆除。'},
      '双发炮兵':{tier:'low',cost:5,base:'炮兵',remainingActions:2,desc:'拥有两次炮击次数；用尽后按炮兵规则变为步兵。'},
      '装甲车':{tier:'high',cost:7,base:'车',buffs:['armored'],desc:'装甲车：可抵消一次战斗判定；受击时攻击方点数 -1。'},
      '补给车':{tier:'high',cost:8,base:'车',buffs:['supply_car'],desc:'可花费 1 行动消除上下左右相邻己方单位的一层混乱。'},
      '二阶战车':{tier:'high',cost:8,base:'车',hp:2,desc:'2 HP 的战车；第一次非直接受伤后降为普通车并清除混乱。'},
      '指挥车':{tier:'high',cost:8,base:'车',buffs:['command_car'],desc:'在场时己方所有攻击点数 +1；被消灭时己方所有单位 +1 混乱，三回合后消去。'}
    };
    const ARMORY_ICONS=(typeof window!=='undefined'&&window.ChaosUI)?window.ChaosUI.ARMORY_ICONS:{'排雷兵':'🛡️','掷弹兵':'⚔️','工兵':'🛠️','双发炮兵':'💣','装甲车':'🐎','补给车':'🚚','二阶战车':'🐎','指挥车':'🎖️'};
    function armoryShuffle(arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
    function createArmoryState(){
      const lows=armoryShuffle(ARMORY_LOW_KEYS), highs=armoryShuffle(ARMORY_HIGH_KEYS);
      const redLow=lows.slice(0,2), blueLow=lows.slice(2,4);
      return {
        red:{low:redLow,high:highs[0],options:[...redLow,highs[0]],choice:null,ready:false,deployed:false},
        blue:{low:blueLow,high:highs[1],options:[...blueLow,highs[1]],choice:null,ready:false,deployed:false}
      };
    }
    function unitDisplayName(u){return u&&u.displayName?u.displayName:(u&&u.bossName?u.bossName:(u&&u.mineType?u.mineType:(u&&u.armoryType?u.armoryType:(u?u.type:''))));}
    function createArmoryUnit(key,x,y,side){
      const def=ARMORY_UNITS[key]; if(!def) return createUnit(key,x,y,side);
      const extra={armoryType:key};
      if(def.hp) extra.hp=def.hp;
      if(def.remainingActions) extra.remainingActions=def.remainingActions;
      if(def.buffs) extra.permaBuffs=[...def.buffs];
      return createUnit(def.base,x,y,side,extra);
    }


    function createInitialGameState(){
        return {
        phase:'ARMORY', startingSide:'red', deploySide:'red', activeSide:'red', turn:1, turnPhase:'DRAW',
        armory:createArmoryState(), engineerBuildId:null, noActionNotice:null,
        red:{ resources:40, cmd:2, baseCmd:2, sp:10, units:[], library:[], usedSkills:new Set(), tempEffects:{},nextTurnEffects:{},lastingEffects:{}, hasUsedCard:false, skillsUsedThisTurn:0, maxSkillsPerTurn:1, smoothComboRemainingRounds:0 },
        blue:{ resources:40, cmd:2, baseCmd:2, sp:10, units:[], library:[], usedSkills:new Set(), tempEffects:{},nextTurnEffects:{},lastingEffects:{}, hasUsedCard:false, skillsUsedThisTurn:0, maxSkillsPerTurn:1, smoothComboRemainingRounds:0 },
        selectedUnitId:null, pendingDeployType:null, removeMode:false,
        revealMinesUntil:0, revealEnemyUntil:0, revealCardsUntil:0,
        drawChoices:[], drawRerollUsed:false, selectedCardId:null, cardUseMode:false, skillTargetRequest:null,
        smoothCombo:{active:false, turn1:null, turn2:null}, drawCostModifier:0,
        captureOnKill:false, impeccable:false, doubleCardMode:false,
        tempAttackBonus:0, strictCheckActive:false, divineAttackActive:false,
        ptsdUnits:new Set(), artilleryReroll:false, enemyAttackPenalty:0,
        tombstoneActiveRed:false, tombstoneActiveBlue:false, catapultActive:false, infantryChariotSynergy:false,
        /* 任务2：反转相关变量 */
        reversalActive:false, reversalTriggers:0,
        /* 任务2：强势席卷相关变量 */
        overwhelmingActive:false, // 强势席卷激活
        overwhelmingRounds:0, // 剩余回合数
        noArtilleryNextTurn:false, // 下回合禁用炮
        /* 新技能卡状态变量 */
        infantryMoveBonus:0,moveAndAttack:false,enemyMoveRangePenalty:0,enemyCardCostIncrease:0,permanentAttackBonus:0,autoCounterActive:false,blockedTiles:[],chariotMoveLimit:0,chariotMoveLimitRounds:0,
        /* 雪原1：新增模式相关变量 */
        gameMode:null,
        snowBlockedTiles:[],
        snowBlockedUntil:0,
        snowNextEvent:null, snowEventDueTurn:0,
        /* 天候系统：经典/雪原/海盗为调度型，雾夜为状态型 */
        weather:null, weatherNext:null, weatherAppliedRound:0,
        /* 模式3：皖南事变相关变量 */
        incidentTriggered:false,
        incidentInitiator:null,
        incidentTurn:0,
        antiJapanesePeriod:true,
        wannanFriction:0, wannanIncidentPrompt:null, wannanPromptSuppressedRound:0,
        imperialRewardCount:{red:0,blue:0},
        imperialUnitsActedThisTurn:0,
        imperialMaxActionsThisTurn:3,
        imperialActing:false,
        imperial:{units:[],cmd:3,baseCmd:3,tempEffects:{},nextTurnEffects:{},lastingEffects:{},hasUsedCard:false,skillsUsedThisTurn:0,smoothComboRemainingRounds:0},
        /* 模式8：蠕潮蚀野 —— 潮眼、潮格与双方镇石 */
        tide:{
            eye:{x:5,y:2},
            cells:['5,2'], marks:[], marksUsed:{red:false,blue:false},
            seals:{red:{x:1,y:2,hp:3},blue:{x:9,y:2,hp:3}},
            preview:[]
        },
        tideMode:null,
        /* 模式9：烽燧阵线 —— 中央长城、三座烽燧与两座关门 */
        beacon:{
            towers:[
                {x:5,y:0,owner:null,lit:{red:false,blue:false}},
                {x:5,y:2,owner:null,lit:{red:false,blue:false}},
                {x:5,y:4,owner:null,lit:{red:false,blue:false}}
            ],
            gates:[{x:5,y:1},{x:5,y:3}],
            counts:{red:0,blue:0},
            lastSettledTurn:0
        },
        /* 海盗模式 */
        pirateBoatPoints:[], pirateVortexTiles:[], pirateVortexTurns:0, seaMonsterTriggered:false,
        pirateNextEvent:null, pirateEventDueTurn:0, pirateStrongpointClaimed:{red:[],blue:[]},
        pirateWind:1, pirateWindChangedTurn:0,
        /* 雾夜幽乡模式 */
        ghost:{units:[],cmd:3,baseCmd:3,tempEffects:{},nextTurnEffects:{},lastingEffects:{}},
        ghostActing:false, ghostUnitsActedThisTurn:0, ghostMaxActions:3,
        fogNight:true, fogStateOverride:null, tombstones:[], soulCount:{red:0,blue:0},
        revealGhostsUntil:0, ghostSpawnCounter:0, lanternCardReady:{red:false,blue:false},
        fogDawnUntil:0, fogNightForcedUntil:0, fogRound12Forecast:false,
        ghostEncounteredThisRound:[], lanternCardsEarned:{red:false,blue:false},
        /* 圣辉之战：天空层与龙属性 */
        dragonMarks:[], holyScore:{red:0,blue:0}, holyRewardedGroups:[], holyEruptionWarning:null,
        /* 蛇骨矿洞：分层地图、矿区单位与中立怪物 */
        mine:{red:[],blue:[],monsters:[],crystals:[],relics:[],blocked:[],caveInWarning:null,bossDefeated:false,centralOpen:false,lastCaveInTurn:0},
        monsters:{units:[],cmd:1,baseCmd:1,sp:0,library:[],usedSkills:new Set(),tempEffects:{},nextTurnEffects:{},lastingEffects:{},hasUsedCard:false,skillsUsedThisTurn:0,maxSkillsPerTurn:1,smoothComboRemainingRounds:0},
        /* 模式10：霓虹纪元 —— 数据核心、终端上传与未来公共事件 */
        neon:{
            core:{x:5,y:2},
            protocols:{red:0,blue:0},
            event:null, eventDueTurn:0,
            activeEvent:null, activeTurn:0,
            packets:[],nextPacketId:1,terminals:{red:{x:0,y:2},blue:{x:10,y:2}},surgeTurn:0
        },
        /* 通用终局加速：第 15 回合起攻击点数提升，第 20 回合强制判定 */
        endgameBonusTier:0,
        };
    }

    /* ── 天候系统 ──────────────────────────────────────────────
       经典/雪原/海盗为调度型天气；雾夜/初晖为状态型天气，由墓地与窗口决定。
       天气只由服务器/本页引擎结算，客户端只渲染 getView/weatherView。 */
    const WEATHER_CLASSIC_POOL=[
        {kind:'clear',label:'晴朗',icon:'☀️',weight:30},
        {kind:'overcast',label:'阴天',icon:'☁️',weight:25},
        {kind:'breeze',label:'微风',icon:'🍃',weight:20},
        {kind:'drizzle',label:'细雨',icon:'🌦️',weight:15},
        {kind:'mist',label:'薄雾',icon:'🌫️',weight:10}
    ];

    function weatherIcon(kind,level=0){
        if(kind==='snow') return level===2?'❄️':'🌨️';
        return {clear:'☀️',overcast:'☁️',breeze:'🍃',drizzle:'🌦️',mist:'🌫️',wind:'🌬️','fog-night':'🌫️','fog-dawn':'🌅'}[kind]||'🌤️';
    }
    function weatherLabel(kind,level=0,windDir=0){
        if(kind==='snow') return level===2?'大雪':'小雪';
        if(kind==='wind') return windDir>0?'东风':'西风';
        return {clear:'晴朗',overcast:'阴天',breeze:'微风',drizzle:'细雨',mist:'薄雾','fog-night':'雾夜','fog-dawn':'初晖'}[kind]||'晴';
    }
    function weatherStrongReasonLabel(reason){
        if(reason==='weather') return '大雪强化';
        if(reason==='late') return '后期强化';
        if(reason==='both') return '大雪+后期强化';
        return reason?'强化':'';
    }
    function weatherShortEffect(w){
        if(!w) return '';
        if(w.mode==='classic') return '仅氛围';
        if(w.mode==='snow') return w.level===2?'车行≤4':'无额外规则';
        if(w.mode==='pirate') return '顺风+1/逆风−1';
        if(w.mode==='fog') return w.kind==='fog-night'?'鬼魂隐匿':'鬼魂显形';
        return '';
    }
    function weatherEffectText(w){
        if(!w) return '';
        if(w.mode==='classic') return '仅表现，不影响移动、攻击、地雷、技能与胜负。';
        if(w.mode==='snow'){
            return w.level===2
                ? '大雪：车常规移动/冲锋上限 4 格；本天候周期的公共事件强化（第9回合起默认强化，不叠加）。'
                : '小雪：仅表现，无额外规则。';
        }
        if(w.mode==='pirate') return '顺风海面移动 +1，逆风 −1；每回合开始时，海面上的登船单位顺风漂移 1 格。';
        if(w.mode==='fog'){
            return w.kind==='fog-night'
                ? '鬼魂隐匿；无混乱的人类单位撞鬼时只被推退并混乱 +1，已混乱单位仍按原判定表。'
                : '鬼魂显形；撞鬼按原判定表结算。';
        }
        return '';
    }

    function rollWeather(mode,dueTurn,prev=null){
        if(mode==='classic'){
            const total=WEATHER_CLASSIC_POOL.reduce((sum,item)=>sum+item.weight,0);
            let roll=Math.random()*total;
            let picked=WEATHER_CLASSIC_POOL[0];
            for(const item of WEATHER_CLASSIC_POOL){
                roll-=item.weight;
                if(roll<=0){picked=item;break;}
            }
            return {kind:picked.kind,level:0,windDir:0,dueTurn,same:1};
        }
        if(mode==='snow'){
            let level=Math.random()<0.6?1:2;
            let same=1;
            if(prev && prev.kind==='snow'){
                if(prev.level===level){
                    if((prev.same||1)>=2){ level=level===2?1:2; same=1; }
                    else same=(prev.same||1)+1;
                }
            }
            return {kind:'snow',level,windDir:0,dueTurn,same};
        }
        if(mode==='pirate'){
            return {kind:'wind',level:0,windDir:Math.random()<0.5?1:-1,dueTurn,same:1};
        }
        return null;
    }

    function advanceWeather(){
        const mode=gameState.gameMode;
        if(!['classic','snow','pirate'].includes(mode)) return;
        const turn=gameState.turn;
        const shouldChange=mode==='pirate'?(turn===1||turn%2===1):(turn===1||(turn-1)%3===0);
        if(!shouldChange) return;
        if(gameState.weather && gameState.weather.mode===mode && gameState.weather.sinceTurn===turn) return;
        const step=mode==='pirate'?2:3;
        let next=null;
        if(gameState.weatherNext && gameState.weatherNext.dueTurn===turn) next=gameState.weatherNext;
        if(!next) next=rollWeather(mode,turn,gameState.weather);
        if(!next) return;
        gameState.weather={
            mode,kind:next.kind,level:next.level||0,windDir:next.windDir||0,
            sinceTurn:turn,nextChangeTurn:turn+step,same:next.same||1,
            source:'schedule',appliedRound:0
        };
        gameState.weatherNext=rollWeather(mode,turn+step,gameState.weather);
        if(mode==='pirate'){ gameState.pirateWind=gameState.weather.windDir; gameState.pirateWindChangedTurn=turn; }
        addLog(weatherChangeLog(gameState.weather));
    }

    function weatherAtTurn(forTurn){
        const w=gameState.weather;
        if(!w || w.mode!==gameState.gameMode) return null;
        if(gameState.weatherNext && gameState.weatherNext.dueTurn===forTurn){
            return Object.assign({},gameState.weatherNext,{mode:w.mode,sinceTurn:forTurn});
        }
        if(forTurn>=w.sinceTurn && (!w.nextChangeTurn || forTurn<w.nextChangeTurn)) return w;
        return w;
    }

    function snowEventStrong(forTurn){
        const late=forTurn>=9;
        const w=weatherAtTurn(forTurn);
        const byWeather=!!(w && w.kind==='snow' && w.level===2);
        return {
            strong:late||byWeather,
            reason:late&&byWeather?'both':late?'late':byWeather?'weather':'none'
        };
    }

    function snowChariotLimit(){
        if(gameState.gameMode!=='snow') return Infinity;
        const w=gameState.weather;
        return w && w.kind==='snow' && w.level===2 ? 4 : Infinity;
    }

    /* 海盗：每回合开始时，海面上的登船单位顺风漂移 1 格。 */
    function applyPirateDrift(){
        if(gameState.gameMode!=='pirate') return;
        const wind=gameState.pirateWind||0;
        if(!wind) return;
        const intents=[];
        for(const side of ['red','blue']){
            for(const u of getPlayer(side).units){
                if(u.destroyed || !u.boarded) continue;
                if(!isPirateWaterTile(u.x,u.y)) continue;
                const nx=u.x+wind;
                if(!isPirateWaterTile(nx,u.y)) continue;
                if(unitAt(nx,u.y) || isPirateBlockedTile(nx,u.y)) continue;
                intents.push({u,nx,side});
            }
        }
        for(const it of intents){
            it.u.x=it.nx;
            addLog(`🌬️ ${getFactionName(it.side)}快艇顺${wind>0?'东':'西'}风漂至(${it.u.x},${it.u.y})`);
        }
    }

    function syncFogWeather(){
        if(gameState.gameMode!=='fog') return;
        const night=!!gameState.fogNight;
        const kind=night?'fog-night':'fog-dawn';
        const forcedUntil=gameState.fogNightForcedUntil||0;
        const dawnUntil=gameState.fogDawnUntil||0;
        const source=gameState.fogStateOverride!==null?'override'
            :(forcedUntil>gameState.turn?'forced'
            :(dawnUntil>gameState.turn?'dawn':'graves'));
        if(!gameState.weather || gameState.weather.mode!=='fog'){
            gameState.weather={mode:'fog',kind,level:0,windDir:0,sinceTurn:gameState.turn,nextChangeTurn:null,source,same:1,appliedRound:0};
            gameState.weatherNext=null;
            return;
        }
        if(gameState.weather.kind!==kind){
            gameState.weather.kind=kind;
            gameState.weather.sinceTurn=gameState.turn;
        }
        gameState.weather.source=source;
        gameState.weather.nextChangeTurn=null;
        gameState.weatherNext=null;
    }

    function weatherView(){
        const mode=gameState.gameMode;
        if(mode==='fog'){
            if(!gameState.weather || gameState.weather.mode!=='fog') return null;
            const night=!!gameState.fogNight;
            const kind=night?'fog-night':'fog-dawn';
            const graves=getGhost().units.filter(u=>u.type==='墓碑'&&!u.destroyed).length;
            const forcedUntil=gameState.fogNightForcedUntil||0;
            const dawnUntil=gameState.fogDawnUntil||0;
            const forcedRemaining=forcedUntil>gameState.turn?forcedUntil-gameState.turn:0;
            const dawnRemaining=dawnUntil>gameState.turn?dawnUntil-gameState.turn:0;
            const source=gameState.fogStateOverride!==null?'override'
                :(forcedRemaining>0?'forced':(dawnRemaining>0?'dawn':'graves'));
            return {
                mode:'fog',kind,label:night?'雾夜':'初晖',icon:night?'🌫️':'🌅',
                level:0,windDir:0,
                shortEffect:night?'鬼魂隐匿':'鬼魂显形',
                effectText:night
                    ?'鬼魂隐匿；无混乱的人类单位撞鬼时只被推退并混乱 +1，已混乱单位仍按原判定表。'
                    :'鬼魂显形；撞鬼按原判定表结算。',
                sinceTurn:gameState.weather&&gameState.weather.mode==='fog'?gameState.weather.sinceTurn:gameState.turn,
                nextChangeTurn:null,decorative:false,forecast:null,eventForecast:null,
                fog:{night,graves,forcedUntil,dawnUntil,forcedRemaining,dawnRemaining,source,
                    round12Warning:!!gameState.fogRound12Forecast}
            };
        }
        if(!['classic','snow','pirate'].includes(mode)) return null;
        const w=gameState.weather;
        if(!w || w.mode!==mode) return null;
        const forecast=gameState.weatherNext?{
            kind:gameState.weatherNext.kind,
            label:weatherLabel(gameState.weatherNext.kind,gameState.weatherNext.level||0,gameState.weatherNext.windDir||0),
            icon:weatherIcon(gameState.weatherNext.kind,gameState.weatherNext.level||0),
            level:gameState.weatherNext.level||0,
            windDir:gameState.weatherNext.windDir||0,
            dueTurn:gameState.weatherNext.dueTurn
        }:null;
        let eventForecast=null;
        if(mode==='snow' && gameState.snowNextEvent){
            const e=gameState.snowNextEvent;
            eventForecast={
                name:e.name,dueTurn:gameState.snowEventDueTurn,target:snowEventTargetText(e),
                strong:!!e.strong,strongReason:e.strongReason||'none',
                strongLabel:weatherStrongReasonLabel(e.strongReason)
            };
        } else if(mode==='pirate' && gameState.pirateNextEvent){
            const e=gameState.pirateNextEvent;
            eventForecast={name:e.name,dueTurn:gameState.pirateEventDueTurn,target:pirateEventTargetText(e),strong:false,strongReason:'none',strongLabel:''};
        }
        return {
            mode,kind:w.kind,label:weatherLabel(w.kind,w.level,w.windDir),
            icon:weatherIcon(w.kind,w.level),level:w.level||0,windDir:w.windDir||0,
            shortEffect:weatherShortEffect(w),
            effectText:weatherEffectText(w),
            sinceTurn:w.sinceTurn,nextChangeTurn:w.nextChangeTurn,decorative:mode==='classic',
            forecast,eventForecast
        };
    }

    function weatherChangeLog(w){
        const label=weatherLabel(w.kind,w.level,w.windDir);
        if(w.mode==='classic') return `🌤️ 天候转为【${label}】（仅表现）`;
        if(w.mode==='snow'){
            return w.level===2
                ?'❄️ 天候转为【大雪】：车常规移动上限4格，本周期公共事件强化'
                :'❄️ 天候转为【小雪】：无额外规则';
        }
        if(w.mode==='pirate'){
            return `🌬️ 风向转为${label}（${w.windDir>0?'向右':'向左'}）：顺风+1，逆风−1`;
        }
        return '';
    }

    function armoryCurrentSide(){ if(!gameState.armory) return null; if(!gameState.armory.red.ready) return 'red'; if(!gameState.armory.blue.ready) return 'blue'; return null; }
    function armoryChoose(side,key){
        if(gameState.gameOver || gameState.phase!=='ARMORY') return false;
        if(!['red','blue'].includes(side)) return false;
        const arm=gameState.armory && gameState.armory[side]; if(!arm || arm.ready) return false;
        if(key!==null && key!==undefined && !arm.options.includes(key)) return false;
        arm.choice=key || null; arm.ready=true;
        addLog(key ? `🏪 ${getFactionName(side)}从军火库选择了【${key}】` : `🏪 ${getFactionName(side)}放弃军火库单位`);
        if(gameState.armory.red.ready && gameState.armory.blue.ready){
            gameState.phase='DEPLOY'; gameState.deploySide=gameState.startingSide; gameState.activeSide=gameState.startingSide; gameState.turnPhase='DRAW';
            addLog('🏪 双方军火库选择完成，进入排兵布阵');
        }
        renderAll(); return true;
    }
    function armorySkip(side){ return armoryChoose(side,null); }
    /* 霓虹纪元用独立的部署费用：步兵更贵、车更便宜；其余模式沿用基础表。 */
    function unitDeployCost(type,mode){
        const m=mode||gameState.gameMode;
        if(m==='neon'){
            if(type==='步兵')return 3;
            if(type==='车')return 5;
        }
        return UNIT_COST[type] || 0;
    }
    function armoryUnitCost(u){
        if(u && u.armoryType && ARMORY_UNITS[u.armoryType]) return ARMORY_UNITS[u.armoryType].cost;
        return unitDeployCost(u && u.type);
    }
    const UNIT_FIGS_LOCAL={'步兵':'fig-inf','车':'fig-chariot','炮兵':'fig-cannon','海炮':'fig-sea-cannon','地雷':'fig-mine','后勤兵':'fig-supply','防御工事':'fig-fort','鬼魂':'fig-ghost','墓碑':'fig-grave','二阶步兵':'fig-inf'};
    const ARMORY_FIGS_LOCAL={'排雷兵':'fig-inf','掷弹兵':'fig-inf','工兵':'fig-supply','双发炮兵':'fig-cannon','装甲车':'fig-chariot','补给车':'fig-supply','二阶战车':'fig-chariot','指挥车':'fig-chariot'};
    /* 霓虹纪元专属科技棋子映射：仅该模式生效，按军火库型号优先。 */
    const NEON_FIGS_LOCAL={'步兵':'fig-neon-inf','车':'fig-neon-chariot','炮兵':'fig-neon-cannon','海炮':'fig-neon-sea-cannon','地雷':'fig-neon-mine','后勤兵':'fig-neon-supply','防御工事':'fig-neon-fort','鬼魂':'fig-neon-ghost','墓碑':'fig-neon-grave','二阶步兵':'fig-neon-inf','排雷兵':'fig-neon-inf','掷弹兵':'fig-neon-inf','工兵':'fig-neon-supply','双发炮兵':'fig-neon-cannon','装甲车':'fig-neon-chariot','补给车':'fig-neon-supply','二阶战车':'fig-neon-chariot','指挥车':'fig-neon-chariot'};
    function unitFigureHTMLLocal(u){
        if(u&&u.displayIcon)return '<span class="unit-emoji" aria-hidden="true">'+u.displayIcon+'</span>';
        let id='fig-inf';
        if(u&&u.type==='鬼魂') id='fig-ghost';
        else if(u&&(u.permaBuffs||[]).includes('battle_damaged')) id='fig-chariot-damaged';
        else if(u&&(u.permaBuffs||[]).includes('mechanical_wear')) id='fig-chariot-worn';
        else if(gameState.gameMode==='neon'&&u&&NEON_FIGS_LOCAL[u.armoryType||u.type]) id=NEON_FIGS_LOCAL[u.armoryType||u.type];
        else if(gameState.gameMode==='snow'&&u&&u.type==='车') id='fig-wolf';
        else if(u&&u.armoryType&&ARMORY_FIGS_LOCAL[u.armoryType]) id=ARMORY_FIGS_LOCAL[u.armoryType];
        else if(u&&UNIT_FIGS_LOCAL[u.type]) id=UNIT_FIGS_LOCAL[u.type];
        if(typeof window!=='undefined'&&window.ChaosUI) return window.ChaosUI.unitFigureHTML(id);
        return '<svg class="unit-fig" viewBox="0 0 40 40" aria-hidden="true"><use href="#'+id+'"/></svg>';
    }
    function unitIconFor(u){ return unitFigureHTMLLocal(u); }
    function isEngineer(u){ return !!u && (u.permaBuffs||[]).includes('engineer'); }
    function sideMineDetectorNear(side,mine){
        if(!mine) return false;
        return getAllUnits().some(u=>{
            if(u.destroyed||u.side!==side||u.layer==='sky') return false;
            if((u.permaBuffs||[]).includes('mine_detector')){
                const range=(gameState.gameMode==='neon'&&neonTraitKey(u)==='scan')?2:1;
                return Math.max(Math.abs(u.x-mine.x),Math.abs(u.y-mine.y))<=range;
            }
            // 工兵能察觉并拆除紧贴自己的敌方地雷。
            if((u.permaBuffs||[]).includes('engineer')) return Math.abs(u.x-mine.x)+Math.abs(u.y-mine.y)===1;
            return false;
        });
    }
    function mineVisibleToSide(side,mine){ return Date.now()<gameState.revealMinesUntil || sideMineDetectorNear(side,mine); }
    function grenadierTargetTiles(u){
        if(!u || !unitHasBuff(u,'grenadier') || u.grenadierUsed || unitHasTempBuff(u,'no_attack')) return [];
        const out=[],seen=new Set();
        const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
        for(const [dx,dy] of dirs){
            const fx=u.x+dx,fy=u.y+dy; if(!inBounds(fx,fy)) continue;
            const friendly=unitAt(fx,fy); if(!friendly||friendly.side!==u.side) continue;
            // 沿该友军的正后方直线寻找最近的可轰击敌军；地形或友军会挡住这条线。
            let tx=fx+dx,ty=fy+dy,target=null;
            while(inBounds(tx,ty)){
                if(isBlockedTile(tx,ty,gameState.gameMode)) break;
                const occ=unitAt(tx,ty);
                if(occ){
                    if(occ.side===u.side) break;
                    if(!['地雷','鬼魂'].includes(occ.unit.type)&&!unitHasTempBuff(occ.unit,'smoke_screen')){target=occ.unit;break;}
                }
                tx+=dx;ty+=dy;
            }
            if(!target) continue;
            const key=target.x+','+target.y; if(seen.has(key)) continue; seen.add(key);
            out.push({x:target.x,y:target.y,type:'attack',target,grenadier:true});
        }
        return out;
    }
    function canGrenadierTarget(u,target){ return !!target && grenadierTargetTiles(u).some(t=>t.target===target); }
    function reduceTier2Chariot(u){ u.type='车'; delete u.armoryType; delete u.hp; u.chaos=0; addLog('❤️ 二阶战车受损，变回普通车并清除混乱'); }
    function renderArmoryOverlay(){
        const overlay=document.getElementById('armoryOverlay'); if(!overlay)return;
        const side=armoryCurrentSide();
        if(gameState.phase!=='ARMORY' || !side){ overlay.classList.remove('show'); return; }
        const arm=gameState.armory[side];
        document.getElementById('armoryTitle').textContent=getFactionName(side)+'军火库';
        document.getElementById('armoryHint').textContent='从三个单位中选择一个带入本局，或跳过。选择会记录在日志中。';
        const box=document.getElementById('armoryOptions'); box.innerHTML='';
        arm.options.forEach(key=>{
            const def=ARMORY_UNITS[key]||{}; const base=def.base||key;
            const card=document.createElement('button'); card.type='button';
            card.className='armory-card '+(def.tier==='high'?'high':'low');
            card.innerHTML='<h3>'+key+'</h3><div class="ac-cost">💰'+def.cost+'费</div><div class="ac-desc">'+(def.desc||'')+'</div>';
            card.onclick=()=>{ if(armoryChoose(side,key)) renderArmoryOverlay(); };
            box.appendChild(card);
        });
        overlay.classList.add('show');
    }
    let gameState = createInitialGameState();
    const gameTimers = new Set();
    let gameGeneration = 0;
    function scheduleGame(fn, delay=0){
        const generation=gameGeneration;
        const id=setTimeout(()=>{ gameTimers.delete(id); if(generation===gameGeneration && !gameState.gameOver) fn(); },delay);
        gameTimers.add(id); return id;
    }
    /* 特效事件队列：单机版由渲染层消费，联机版由服务器转发给客户端。 */
    const fxQueue=[];
    function pushFx(event){ fxQueue.push(event); if(fxQueue.length>40) fxQueue.shift(); }
    function pushSound(sound){ pushFx({type:'sfx',sound}); }
    function clearGameTimers(){ gameGeneration++; gameTimers.forEach(id=>clearTimeout(id)); gameTimers.clear(); }
    let nextId=2000;
    function genId(){return nextId++;}
    const debugState = { active:false, deployMode:false, pendingSide:'red', pendingType:'步兵' };

    function getPlayer(s){
        let p;
        if(s==='imperial') p=getImperial();
        else if(s==='ghost') p=getGhost();
        else if(s==='monster'){
            if(!gameState.monsters) gameState.monsters={units:[],cmd:1,baseCmd:1,sp:0,library:[],usedSkills:new Set(),tempEffects:{},nextTurnEffects:{},lastingEffects:{}};
            p=gameState.monsters;
        }
        else p=s==='red'?gameState.red:gameState.blue;
        p.side=s;return p;
    }
    function getGhost(){ return gameState.ghost || {units:[],cmd:3,baseCmd:3}; }
    function getEnemy(s){
    const sides=getEnemyFactions(s,'skill');
    return getPlayer(sides[0]);
}
function getImperial(){ return gameState.imperial || {units:[],cmd:3,baseCmd:3}; }
function getEnemyFactions(side, context){
    if(side==='imperial'||side==='ghost') return ['red','blue'];
    if(gameState.gameMode==='wannan'){
        if(gameState.minigameState&&gameState.minigameState.fakeAlliance&&!gameState.incidentTriggered&&gameState.turn<=2&&['red','blue'].includes(side))return ['imperial'];
        if(gameState.antiJapanesePeriod && context==='skill') return ['imperial'];
        return [side==='red'?'blue':'red','imperial'];
    }
    return [side==='red'?'blue':'red'];
}
function getTerritoryRange(mode, side){
    if(mode==='wannan'&&side==='imperial')return [4,6];
    if(mode==='fog'&&side==='ghost')return [4,6];
    if(mode==='classic'||mode==='snow') return side==='red'?[0,4]:[6,10];
    if(mode==='wannan'||mode==='pirate'||mode==='fog') return side==='red'?[0,3]:[7,10];
    if(mode==='holy') return side==='red'?[0,2]:[8,10];
    if(mode==='mine') return null;
    if(mode==='tide') return side==='red'?[0,4]:[6,10];
    return side==='red'?[0,4]:[6,10];
}
function isInTerritory(x, y, side, mode){
    if(x<0||x>=COLS||y<0||y>=ROWS) return false;
    const range=getTerritoryRange(mode, side);
    if(range===null) return isMineTerritory(x,y,side);
    return x>=range[0] && x<=range[1];
}
function isMineTerritory(x,y,side){
    if(side==='red'){
        if((x>=0&&x<=3&&y>=0&&y<=1)||(x>=0&&x<=3&&y>=3&&y<=4)||(x===4&&(y===0||y===4))) return true;
    } else {
        if((x>=7&&x<=10&&y>=0&&y<=1)||(x>=7&&x<=10&&y>=3&&y<=4)||(x===6&&(y===0||y===4))) return true;
    }
    return false;
}
function isBlockedTile(x,y,mode){
    if(x<0||x>=COLS||y<0||y>=ROWS) return true;
    if(mode==='tide'){
        const ts=tideState();
        if(x===ts.eye.x&&y===ts.eye.y) return true;
        if(tideSealSide(x,y)) return true;
        if(tideAt(x,y)) return true;
    }
    if(gameState.blockedTiles?.some(t=>t.x===x&&t.y===y)) return true;
    if(mode==='holy' && y===2 && x>=4 && x<=6) return true;
    if(mode==='mine' && x===5 && (y===1||y===3)) return true;
    if(mode==='beacon' && x===5 && (y===0||y===2||y===4)) return true;
    if(mode==='neon' && x===5 && y===2) return true;
    if(mode==='snow' && gameState.snowBlockedTiles && gameState.snowBlockedTiles.some(t=>t.x===x&&t.y===y)) return true;
    if(mode==='pirate' && x>=4 && x<=6 && (y===0||y===2||y===4)) return true;
    /* 海盗：漩涡阻塞 */
    if(mode==='pirate' && gameState.pirateVortexTiles && gameState.pirateVortexTiles.some(t=>t.x===x&&t.y===y)) return true;
    return false;
}
    function isPirateWaterTile(x,y){ if(gameState.gameMode!=='pirate')return false; if(gameState.levelId==='pirate-11'&&x>=4&&x<=6)return true; return x>=4 && x<=6 && (y===0||y===2||y===4); }
    function isPirateBoatPoint(x,y){
        if(gameState.gameMode!=='pirate') return false;
        /* 海盗船点始终在固定坐标，即使数组未初始化也硬编码检查 */
        if((x===3||x===7) && (y===0||y===2||y===4)) return true;
        return false;
    }
    function isPirateCapturable(x,y){ return gameState.gameMode==='pirate' && ((x===5&&y===1)||(x===5&&y===3)); }
    function hasBoatAt(x,y){ if(!gameState.pirateBoatPoints) return false; return gameState.pirateBoatPoints.some(p=>p.x===x&&p.y===y&&!p.used); }
    /* 海盗：登船专用阻挡（仅漩涡，不阻海水） */
    function isPirateBlockedTile(x,y){
        if(gameState.pirateVortexTiles && gameState.pirateVortexTiles.some(function(t){return t.x===x&&t.y===y;})) return true;
        return false;
    }
    /* 海盗：计算登船单位的可移动/攻击格子 */
    function getPirateBoardedTiles(unit){
        const tiles=[];
        if(gameState.gameMode!=='pirate'||!unit.boarded)return tiles;
        const water=isPirateWaterTile(unit.x,unit.y),boat=isPirateBoatPoint(unit.x,unit.y);
        if(!water&&!boat)return tiles;
        const directions=water?[-1,1]:[unit.x===3?1:-1];
        const wind=gameState.pirateWind||0;
        const limitFor=dx=>Math.max(1,2+(dx===wind?1:0)-(dx===-wind?1:0));
        for(const dx of directions){
            for(let distance=1;distance<=limitFor(dx);distance++){
                const x=unit.x+dx*distance,y=unit.y;
                if(x<0||x>=COLS||isPirateBlockedTile(x,y))break;
                const occ=unitAt(x,y);
                if(occ){if(occ.side!==unit.side&&occ.unit.boarded&&isPirateWaterTile(x,y))tiles.push({x,y,type:'attack',target:occ.unit});break;}
                tiles.push({x,y,type:'move'});
            }
        }
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
            const x=unit.x+dx,y=unit.y+dy;
            if(x<0||x>=COLS||y<0||y>=ROWS||isPirateBlockedTile(x,y))continue;
            const occ=unitAt(x,y);
            if(occ&&occ.side!==unit.side&&occ.unit.boarded&&isPirateWaterTile(x,y)&&!tiles.some(t=>t.x===x&&t.y===y))tiles.push({x,y,type:'attack',target:occ.unit});
        }
        return tiles;
    }
    function unitAt(x,y){ const g=u=>!u.destroyed&&u.layer!=='sky'; let u=gameState.red.units.find(u=>g(u)&&u.x===x&&u.y===y); if(u) return {unit:u,side:'red'}; u=gameState.blue.units.find(u=>g(u)&&u.x===x&&u.y===y); if(u) return {unit:u,side:'blue'}; const imp=getImperial(); u=imp.units.find(u=>g(u)&&u.x===x&&u.y===y); if(u) return {unit:u,side:'imperial'}; const gh=getGhost(); u=gh.units.find(u=>g(u)&&u.x===x&&u.y===y); return u?{unit:u,side:'ghost'}:null; }
    function getAllUnits(){ const imp=getImperial(); const gh=getGhost(); return [...gameState.red.units,...gameState.blue.units,...imp.units,...gh.units]; }
    function createUnit(type, x, y, side, extra = {}){
        const base = { id:genId(), type, x, y, side, chaos:0, destroyed:false, hasActedEver:false, lastActedTurn:-1, lastActedSide:'', freeAction:false, suppressed:false, grenadierUsed:false, hasAttacked:false, remainingActions:1, spied:false, temporary:false, permaBuffs:[], tempBuffs:[], boarded:false };
        if(type !== '炮兵' && type !== '海炮'){ delete base.hasAttacked; delete base.remainingActions; }
        if(type === '二阶步兵'){ base.hp = 2; }
        const unit=Object.assign(base, extra);
        unit.permaBuffs=[...(unit.permaBuffs||[])]; unit.tempBuffs=[...(unit.tempBuffs||[])];
        return unit;
    }

    function escapeHTML(text){
        if(typeof window!=='undefined'&&window.ChaosUI) return window.ChaosUI.escapeHTML(text);
        return String(text).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    }
    let logMessages=[];
    function logClass(m){
        if(window.ChaosUI&&window.ChaosUI.logClass)return window.ChaosUI.logClass(m);
        if(m.startsWith('🐉'))return 'log-dragon'; if(m.startsWith('☁️'))return 'log-sky';
        if(m.startsWith('🌋'))return 'log-volcano'; if(m.startsWith('🏅'))return 'log-score';
        if(m.startsWith('🛡️'))return 'log-reinforce'; if(m.startsWith('=== '))return 'log-turn';
        if(/^[💥💣🎯🎲❤️]/.test(m)||m.includes('攻击')||m.includes('点数'))return 'log-damage';
        if(/^[🎴✨📋▶️]/.test(m)||m.includes('使用【')||m.includes('技能'))return 'log-card';
        if(/^[🛒✅]/.test(m)||m.includes('部署'))return 'log-deploy'; return '';
    }
    function pulseCombatLocal(msg){
        if(window.ChaosUI&&ChaosUI.combatFeedback){ChaosUI.combatFeedback(msg,{boards:document.querySelectorAll('.battlefield'),host:document.querySelector('.map-stack')});return;}
        if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
        document.querySelectorAll('.battlefield').forEach(board=>{board.classList.remove('combat-pulse');void board.offsetWidth;board.classList.add('combat-pulse');setTimeout(()=>board.classList.remove('combat-pulse'),320);});
        const host=document.querySelector('.map-stack')||document.querySelector('.battlefield'); if(!host)return;
        const number=String(msg).match(/点数:(\d+)/);
        const text=number?'⚔ '+number[1]:/消灭/.test(msg)?'💀 消灭':/混乱/.test(msg)?'🌀 混乱':/反击/.test(msg)?'⚡ 反击':'⚔';
        const float=document.createElement('div');float.className='combat-float';float.textContent=text;host.appendChild(float);setTimeout(()=>float.remove(),900);
    }
    function addLog(msg){ logMessages.push(msg); if(logMessages.length>240) logMessages.shift(); }
    function showToast(msg){ if(window.ChaosUI&&window.ChaosUI.toast) window.ChaosUI.toast(msg); }

    /* 模式3：波斯远征军初始部署（城邦裂变） */

// modes.js
// 模式机制以 v4.4 规范为准；海盗及鬼魂扩展规则保留原稿实现。
function modeEffectFinished(){
    renderAll();
    if(gameState.phase==='ACTION') checkVictory();
}

function deployImperialForces(){
    if(gameState.gameMode!=='wannan' || getImperial().units.some(u=>!u.destroyed)) return;
    const placements=[
        {type:'防御工事',col:4,count:2},
        {type:'车',col:4,count:1},
        {type:'防御工事',col:6,count:2},
        {type:'车',col:6,count:1},
        {type:'后勤兵',col:5,count:2,buffs:['elite_infantry']},
        {type:'车',col:5,count:2,buffs:['elite_chariot','armored']},
        {type:'炮兵',col:5,count:1,buffs:['elite_artillery']}
    ];
    for(const placement of placements){
        for(let i=0;i<placement.count;i++){
            const available=Array.from({length:ROWS},(_,y)=>y).filter(y=>!unitAt(placement.col,y));
            if(!available.length) break;
            const y=available[Math.floor(Math.random()*available.length)];
            getImperial().units.push(createUnit(placement.type,placement.col,y,'imperial',{permaBuffs:[...(placement.buffs||[])]}));
        }
    }
    const forts=getImperial().units.filter(u=>u.type==='防御工事'&&!u.destroyed);
    forts.slice(0,2).forEach(f=>{if(!(f.permaBuffs||[]).includes('turret'))f.permaBuffs.push('turret');});
    addLog('波斯远征军部署完成：两侧各2个工事（其中2个带炮塔）、1辆普通车，中央5个单位（含2辆精锐装甲车）');
    renderAll();
}

function deployModeReinforcement(side,type,count=1,buffs=[]){
    let deployed=0;
    for(let x=0;x<COLS && deployed<count;x++){
        for(let y=0;y<ROWS && deployed<count;y++){
            if(isInTerritory(x,y,side,gameState.gameMode) && !unitAt(x,y) && !isBlockedTile(x,y,gameState.gameMode)){
                getPlayer(side).units.push(createUnit(type,x,y,side,{permaBuffs:[...buffs]}));
                deployed++;
                addLog(`${getFactionName(side)}增援${type}于(${x},${y})`);
            }
        }
    }
    if(deployed<count) addLog(`${getFactionName(side)}阵地无空格，${count-deployed}个${type}无法部署`);
    return deployed;
}

function triggerWannanIncident(initiatorSide){
    if(gameState.gameMode!=='wannan' || gameState.incidentTriggered || !['red','blue'].includes(initiatorSide)) return;
    gameState.incidentTriggered=true;
    gameState.incidentInitiator=initiatorSide;
    gameState.incidentTurn=gameState.turn;
    gameState.antiJapanesePeriod=false;
    gameState.wannanIncidentPrompt=null;
    gameState.wannanPromptSuppressedRound=0;
    const initiatorName=getFactionName(initiatorSide);
    addLog(`⚡ ${initiatorName}点燃城邦裂变，${getFactionName('imperial')}全面压境`);pushSound('incident');
    if(initiatorSide==='red'){
        deployModeReinforcement('red','车',1,['elite_chariot','armored']);
        deployModeReinforcement('blue','二阶步兵',2);
        addLog('🏛️ 斯巴达获得1辆精锐装甲车；雅典获得2个二阶步兵');
    }else{
        deployModeReinforcement('blue','海炮',2);
        deployModeReinforcement('red','二阶步兵',2);
        addLog('🏛️ 雅典获得2门海炮；斯巴达获得2个二阶步兵');
    }
    pushSound('city_reward');
    renderAll();
}

/* ── 模式8：蠕潮蚀野 ───────────────────────────────────────
   潮眼固定在 (5,2)。每轮蓝方行动结束后潮涌，潮格不可通行；
   新潮格上的作战单位被涌蚀（混乱+1并退离），镇石被潮水推到时 -1 耐久。 */
function tideState(){
    if(!gameState.tide){
        gameState.tide={eye:{x:5,y:2},cells:['5,2'],marks:[],marksUsed:{red:false,blue:false},
            seals:{red:{x:1,y:2,hp:3},blue:{x:9,y:2,hp:3}},preview:[]};
    }
    const t=gameState.tide;
    if(!Array.isArray(t.cells)) t.cells=['5,2'];
    if(!t.cells.includes('5,2')) t.cells.push('5,2');
    if(!Array.isArray(t.marks)) t.marks=[];
    if(!t.marksUsed) t.marksUsed={red:false,blue:false};
    if(!t.seals) t.seals={red:{x:1,y:2,hp:3},blue:{x:9,y:2,hp:3}};
    if(!Array.isArray(t.preview)) t.preview=[];
    if(!t.eye) t.eye={x:5,y:2};
    return t;
}
function tideKey(x,y){return x+','+y;}
function tideAt(x,y){return gameState.gameMode==='tide'&&tideState().cells.includes(tideKey(x,y));}
function tideSealSide(x,y){
    const s=tideState().seals;
    if(x===s.red.x&&y===s.red.y) return 'red';
    if(x===s.blue.x&&y===s.blue.y) return 'blue';
    return null;
}
function tideDist(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
function tideGrowthQuota(){return Math.min(6,2+Math.floor((gameState.turn-1)/3));}
function tideHasAdjacentTide(x,y){
    return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>tideAt(x+dx,y+dy));
}
function tideTargetKind(x,y){
    if(tideSealSide(x,y)) return 'seal';
    const occ=unitAt(x,y);
    if(occ&&occ.unit.type==='防御工事') return 'fort';
    return 'tide';
}
function tideGrowthCandidates(used){
    const out=[],t=tideState();
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        if(tideAt(x,y)||used.has(tideKey(x,y))) continue;
        if(x===t.eye.x&&y===t.eye.y) continue;
        if(!tideHasAdjacentTide(x,y)) continue;
        out.push({x,y});
    }
    return out;
}
function tidePlanGrowth(){
    const quota=tideGrowthQuota(),t=tideState(),plan=[],used=new Set();
    for(const m of t.marks){
        if(plan.length>=quota) break;
        const k=tideKey(m.x,m.y);
        if(used.has(k)||!inBounds(m.x,m.y)||tideAt(m.x,m.y)||tideSealSide(m.x,m.y)) continue;
        if(!tideHasAdjacentTide(m.x,m.y)) continue;
        plan.push({x:m.x,y:m.y,kind:tideTargetKind(m.x,m.y),mark:true});
        used.add(k);
    }
    if(plan.length<quota){
        const all=tideGrowthCandidates(used);
        const near=side=>all.slice().sort((a,b)=>
            (tideDist(a,t.seals[side])-tideDist(b,t.seals[side]))||(a.x-b.x)||(a.y-b.y))[0];
        for(const c of [near('red'),near('blue')]){
            if(!c||plan.length>=quota) continue;
            const k=tideKey(c.x,c.y);
            if(used.has(k)) continue;
            plan.push({x:c.x,y:c.y,kind:tideTargetKind(c.x,c.y),forced:true});
            used.add(k);
        }
    }
    while(plan.length<quota){
        const cands=tideGrowthCandidates(used);
        if(!cands.length) break;
        cands.sort((a,b)=>{
            const da=Math.min(tideDist(a,t.seals.red),tideDist(a,t.seals.blue));
            const db=Math.min(tideDist(b,t.seals.red),tideDist(b,t.seals.blue));
            return (da-db)||(a.x-b.x)||(a.y-b.y);
        });
        const c=cands[0];
        plan.push({x:c.x,y:c.y,kind:tideTargetKind(c.x,c.y)});
        used.add(tideKey(c.x,c.y));
    }
    return plan;
}
function tideCleanupConnectivity(){
    const t=tideState(),seen=new Set([tideKey(t.eye.x,t.eye.y)]),queue=[{x:t.eye.x,y:t.eye.y}];
    while(queue.length){
        const c=queue.pop();
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
            const nx=c.x+dx,ny=c.y+dy,k=tideKey(nx,ny);
            if(t.cells.includes(k)&&!seen.has(k)){seen.add(k);queue.push({x:nx,y:ny});}
        }
    }
    const before=t.cells.length;
    t.cells=t.cells.filter(k=>seen.has(k));
    const removed=before-t.cells.length;
    if(removed) addLog(`✂️ 断潮：${removed} 格潮水退去`);
    return removed;
}
function tidePushDestination(u){
    const start={x:u.x,y:u.y};
    const seen=new Set([tideKey(start.x,start.y)]);
    let frontier=[start];
    for(let step=0;step<20&&frontier.length;step++){
        const next=[];
        for(const c of frontier)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
            const nx=c.x+dx,ny=c.y+dy,k=tideKey(nx,ny);
            if(!inBounds(nx,ny)||seen.has(k)) continue;
            seen.add(k);
            if(tideAt(nx,ny)||tideSealSide(nx,ny)||unitAt(nx,ny)) continue;
            next.push({x:nx,y:ny});
        }
        if(next.length){
            next.sort((a,b)=>(tideDist(b,tideState().eye)-tideDist(a,tideState().eye))||(a.y-b.y)||(a.x-b.x));
            return next[0];
        }
        frontier=next;
    }
    return null;
}
function tideSurgeUnit(u){
    addUnitChaos(u,1,null);
    const dest=tidePushDestination(u);
    if(dest){
        u.x=dest.x;u.y=dest.y;
        addLog(`🌊 ${getFactionName(u.side)}${u.type}被涌蚀：混乱+1，退至 (${dest.x},${dest.y})`);
    }else{
        damageUnit(u,null,{direct:true});
        addLog(`🌊 ${getFactionName(u.side)}${u.type}被潮水吞没`);
    }
}
function tideResolveGrowth(){
    if(gameState.gameMode!=='tide'||gameState.phase!=='ACTION'||gameState.gameOver) return;
    const t=tideState(),plan=tidePlanGrowth();
    if(!plan.length){
        addLog('🌊 潮水暂时停滞');
        t.preview=[];
        renderAll();return;
    }
    const markCount=plan.filter(p=>p.mark).length;
    addLog(`🌊 潮涌：${plan.length} 格${markCount?`（引潮 ${markCount}）`:''}`);pushSound('tide_rise');
    const newly=[];
    for(const p of plan){
        if(p.kind==='seal'){
            const side=tideSealSide(p.x,p.y);
            if(side&&t.seals[side].hp>0){
                t.seals[side].hp--;pushSound('tide_stone');
                addLog(`🪨 ${getFactionName(side)}镇石受蚀 ${Math.max(0,t.seals[side].hp)}/3`);
            }
            continue;
        }
        if(p.kind==='fort'){
            const fort=unitAt(p.x,p.y);
            if(fort&&fort.unit.type==='防御工事'){
                fort.unit.destroyed=true;
                addLog('🧱 工事挡潮一次，被潮水吞没');
            }
            continue;
        }
        if(!tideAt(p.x,p.y)){
            t.cells.push(tideKey(p.x,p.y));
            newly.push({x:p.x,y:p.y});
        }
    }
    for(const c of newly){
        const occ=unitAt(c.x,c.y);
        if(!occ) continue;
        if(['地雷','防御工事'].includes(occ.unit.type)){
            occ.unit.destroyed=true;
            addLog(occ.unit.type==='地雷'?'💥 地雷被潮水吞没':'🧱 工事被潮水吞没');
        }else if(!['鬼魂','墓碑'].includes(occ.unit.type)){
            tideSurgeUnit(occ.unit);
        }
    }
    tideCleanupConnectivity();
    t.marks=[];
    t.preview=tidePlanGrowth();
    checkVictory();
    renderAll();
}
function tideRepairSeals(){
    if(gameState.gameMode!=='tide') return;
    const t=tideState();
    for(const side of ['red','blue']){
        const seal=t.seals[side];
        if(seal.hp<=0||seal.hp>=3) continue;
        const adj=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>tideAt(seal.x+dx,seal.y+dy));
        if(!adj){
            seal.hp++;pushSound('tide_repair');
            addLog(`🪨 ${getFactionName(side)}镇石修复至 ${seal.hp}/3`);
        }
    }
}
function tideSelectedUnit(side=gameState.activeSide){
    return gameState.selectedUnitId?getAllUnits().find(u=>u.id===gameState.selectedUnitId&&!u.destroyed&&u.side===side):null;
}
function tideActionRange(u){return isEngineer(u)?2:1;}
function tidePurgeTiles(u){
    const t=tideState(),out=[],range=tideActionRange(u);
    for(const k of t.cells){
        const [x,y]=k.split(',').map(Number);
        if(x===t.eye.x&&y===t.eye.y) continue;
        if(tideDist(u,{x,y})<=range) out.push({x,y});
    }
    return out.sort((a,b)=>(a.y-b.y)||(a.x-b.x));
}
function tideMarkTiles(u){
    if(tideState().marksUsed[u.side]) return [];
    const out=[],range=tideActionRange(u);
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        if(!inBounds(x,y)||tideAt(x,y)||tideSealSide(x,y)) continue;
        if(unitAt(x,y)) continue;
        if(tideDist(u,{x,y})>range) continue;
        if(!tideHasAdjacentTide(x,y)) continue;
        out.push({x,y});
    }
    return out;
}
function tideToggleMode(mode){
    if(gameState.gameMode!=='tide'||gameState.phase!=='ACTION'||gameState.turnPhase!=='ACTION'||gameState.gameOver) return false;
    if(!['purge','mark'].includes(mode)){gameState.tideMode=null;renderAll();return true;}
    const u=tideSelectedUnit();
    if(!u||!canUnitAct(u,u.side)){addLog('请先选择一个可行动的己方单位');showToast('请先选择一个可行动的己方单位');return false;}
    const tiles=mode==='purge'?tidePurgeTiles(u):tideMarkTiles(u);
    if(!tiles.length){addLog(mode==='purge'?'附近没有可斩的潮格':'附近没有可引潮的空格');return false;}
    gameState.tideMode=gameState.tideMode===mode?null:mode;
    renderAll();return true;
}
function tideDoPurge(u,x,y){
    if(!u||!canUnitAct(u,u.side)||!tidePurgeTiles(u).some(t=>t.x===x&&t.y===y)) return false;
    if(typeof pushUndo==='function')pushUndo('斩潮');
    const t=tideState();
    t.cells=t.cells.filter(k=>k!==tideKey(x,y));
    addLog(`🌊 ${getFactionName(u.side)}${u.type}斩潮 (${x},${y})`);pushSound('tide_cut');
    tideCleanupConnectivity();
    tideState().preview=tidePlanGrowth();
    gameState.tideMode=null;
    completeUnitAction(u,u.side);
    return true;
}
function tideDoMark(u,x,y){
    if(!u||!canUnitAct(u,u.side)||!tideMarkTiles(u).some(t=>t.x===x&&t.y===y)) return false;
    if(typeof pushUndo==='function')pushUndo('引潮');
    const t=tideState();
    t.marks.push({x,y,side:u.side});
    t.marksUsed[u.side]=true;
    addLog(`🌀 ${getFactionName(u.side)}${u.type}引潮 (${x},${y})`);pushSound('tide_lure');
    gameState.tideMode=null;
    completeUnitAction(u,u.side);
    return true;
}
function tideCombatCount(side){
    return getAllUnits().filter(u=>!u.destroyed&&u.side===side&&!['地雷','防御工事','墓碑','鬼魂'].includes(u.type)&&u.layer!=='sky').length;
}
function tideTimeoutCheck(){
    if(gameState.gameMode!=='tide'||gameState.gameOver) return false;
    const t=tideState(),r=t.seals.red.hp,b=t.seals.blue.hp;
    if(r!==b){showVictory(`${r>b?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（镇石 ${r}:${b}）`);return true;}
    let redTide=0,blueTide=0;
    for(const k of t.cells){
        const [x]=k.split(',').map(Number);
        if(x<=4)redTide++;else if(x>=6)blueTide++;
    }
    if(redTide!==blueTide){showVictory(`${redTide<blueTide?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（己方半场潮格 ${redTide}:${blueTide}）`);return true;}
    const ru=tideCombatCount('red'),bu=tideCombatCount('blue');
    if(ru!==bu){showVictory(`${ru>bu?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（存活单位 ${ru}:${bu}）`);return true;}
    showVictory('蠕潮蚀野 · 第20回合平局');
    return true;
}

/* 烽燧阵线：长城、关门与三座烽燧。 */
function beaconState(){
    if(!gameState.beacon){
        gameState.beacon={towers:[
            {x:5,y:0,owner:null,lit:{red:false,blue:false}},
            {x:5,y:2,owner:null,lit:{red:false,blue:false}},
            {x:5,y:4,owner:null,lit:{red:false,blue:false}}
        ],gates:[{x:5,y:1},{x:5,y:3}],counts:{red:0,blue:0},lastSettledTurn:0};
    }
    const b=gameState.beacon;
    b.towers.forEach(t=>{if(!t.lit||typeof t.lit!=='object')t.lit={red:false,blue:false};});
    return b;
}
function beaconTowerAt(x,y){return gameState.gameMode==='beacon'?beaconState().towers.find(t=>t.x===x&&t.y===y)||null:null;}
function beaconGateAt(x,y){return gameState.gameMode==='beacon'?beaconState().gates.some(g=>g.x===x&&g.y===y):false;}
function beaconTowerCount(side){return gameState.gameMode==='beacon'?beaconState().towers.filter(t=>t.owner===side).length:0;}
function beaconOnEnemySide(side,x){return side==='red'?x>=6:side==='blue'?x<=4:false;}
function beaconAdjacentUnits(x,y,side,enemySideOnly=false){
    return getAllUnits().filter(u=>!u.destroyed&&u.side===side&&(u.layer||'ground')==='ground'&&Math.abs(u.x-x)+Math.abs(u.y-y)===1&&(!enemySideOnly||beaconOnEnemySide(side,u.x))).length;
}
function beaconCanIgnite(unit,tower){
    if(gameState.gameMode!=='beacon'||!unit||!tower||unit.destroyed) return false;
    if(!canUnitAct(unit,unit.side)||!canAffordAction(unit,unit.side)) return false;
    if(!beaconOnEnemySide(unit.side,unit.x)) return false;
    if(Math.abs(unit.x-tower.x)+Math.abs(unit.y-tower.y)!==1) return false;
    const lit=tower.lit||(tower.lit={red:false,blue:false});
    return !lit[unit.side];
}
function beaconIgnitableTowers(unit){
    if(gameState.gameMode!=='beacon'||!unit) return [];
    return beaconState().towers.filter(t=>beaconCanIgnite(unit,t));
}
function beaconIgnite(unit,tower){
    if(!beaconCanIgnite(unit,tower)) return false;
    tower.lit[unit.side]=true;
    addLog(`🔥 ${getFactionName(unit.side)}${unit.type}在(${unit.x},${unit.y})点燃烽燧(${tower.x},${tower.y})`);pushSound('beacon_ignite');
    completeUnitAction(unit,unit.side);
    return true;
}
function beaconResolve(){
    if(gameState.gameMode!=='beacon'||gameState.phase!=='ACTION'||gameState.gameOver) return false;
    const b=beaconState();
    let changed=false;
    for(const t of b.towers){
        const lit=t.lit||(t.lit={red:false,blue:false});
        const redClaim=lit.red&&beaconAdjacentUnits(t.x,t.y,'red',true)>0;
        const blueClaim=lit.blue&&beaconAdjacentUnits(t.x,t.y,'blue',true)>0;
        const redPresence=beaconAdjacentUnits(t.x,t.y,'red')>0;
        const bluePresence=beaconAdjacentUnits(t.x,t.y,'blue')>0;
        const owner=redClaim&&!bluePresence?'red':blueClaim&&!redPresence?'blue':null;
        if(owner!==t.owner){t.owner=owner;changed=true;pushSound('beacon_capture');}
    }
    b.counts={red:beaconTowerCount('red'),blue:beaconTowerCount('blue')};
    b.lastSettledTurn=gameState.turn;
    if(changed||b.counts.red||b.counts.blue){
        addLog(`🏯 烽燧结算：红方 ${b.counts.red}/3 · 蓝方 ${b.counts.blue}/3`);
    }
    for(const side of ['red','blue']){
        if(b.counts[side]>=3){
            pushSound('beacon_signal');
            showVictory(`${side==='red'?'红方':'蓝方'}胜利 · 三燧连城`);
            return true;
        }
    }
    return false;
}
function beaconTimeoutCheck(){
    if(gameState.gameMode!=='beacon'||gameState.gameOver) return false;
    const b=beaconState();
    if(b.counts.red!==b.counts.blue){
        showVictory(`${b.counts.red>b.counts.blue?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（烽燧 ${b.counts.red}:${b.counts.blue}）`);
        return true;
    }
    const ru=tideCombatCount('red'),bu=tideCombatCount('blue');
    if(ru!==bu){showVictory(`${ru>bu?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（存活单位 ${ru}:${bu}）`);return true;}
    const rs=getPlayer('red').sp||0,bs=getPlayer('blue').sp||0;
    if(rs!==bs){showVictory(`${rs>bs?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（技能点 ${rs}:${bs}）`);return true;}
    showVictory('烽燧阵线 · 第20回合平局');
    return true;
}

/* ── 模式10：霓虹纪元 ──────────────────────────────────────────
   中央数据核心 (5,2) 阻挡；周围 8 格为喷包区，开局不可部署、行动阶段可通行。
   核心只向空格喷出数据包，地面单位经过/停留时立即拾取，带回己方终端上传；
   先上传 5 个数据包者「系统接管」。每 3 回合一次公共事件，提前 1 回合公开预报。
   霓虹专属费用与机动、全兵种科技改装只在 neon 模式生效。 */
function neonState(){
    if(!gameState.neon){
        gameState.neon={core:{x:5,y:2},protocols:{red:0,blue:0},event:null,eventDueTurn:0,activeEvent:null,activeTurn:0,
            packets:[],nextPacketId:1,terminals:{red:{x:0,y:2},blue:{x:10,y:2}},surgeTurn:0};
    }
    const n=gameState.neon;
    if(!n.core)n.core={x:5,y:2};
    if(!n.protocols)n.protocols={red:0,blue:0};
    if(!Array.isArray(n.packets))n.packets=[];
    if(!n.nextPacketId)n.nextPacketId=1;
    if(!n.terminals)n.terminals={red:{x:0,y:2},blue:{x:10,y:2}};
    return n;
}
function neonCoreAt(x,y){const n=neonState();return x===n.core.x&&y===n.core.y;}
function neonInRing(x,y){const n=neonState();return Math.abs(x-n.core.x)<=1&&Math.abs(y-n.core.y)<=1&&!neonCoreAt(x,y);}
/* 喷包区只禁止开局部署，单位仍可正常通行、被技能位移进入。 */
function neonDeployLocked(x,y){return gameState.gameMode==='neon'&&neonInRing(x,y);}
function neonDashUnit(u){
    if(!u||gameState.gameMode!=='neon'||u.type!=='步兵'||u.armoryType)return false;
    const buffs=u.permaBuffs||[];
    return !buffs.includes('engineer')&&!buffs.includes('mine_detector')&&!buffs.includes('grenadier')&&!buffs.includes('lantern_bearer');
}
function neonRingCount(side){
    const n=neonState();
    return getAllUnits().filter(u=>!u.destroyed&&u.side===side&&(u.layer||'ground')==='ground'&&
        !['地雷','防御工事','墓碑','鬼魂'].includes(u.type)&&neonInRing(u.x,u.y)).length;
}
function neonUnitState(u){
    if(!u.neon)u.neon={once:{},turn:{},turnNo:0};
    if(!u.neon.once)u.neon.once={};
    if(!u.neon.turn)u.neon.turn={};
    return u.neon;
}
function neonTraitKey(u){
    if(!u||gameState.gameMode!=='neon')return '';
    const t=u.armoryType||u.type;
    if(t==='步兵')return 'dash';
    if(t==='二阶步兵')return 'exo';
    if(t==='车'||t==='装甲车')return 'reactive';
    if(t==='二阶战车')return 'phase';
    if(t==='炮兵'||t==='双发炮兵')return 'railgun';
    if(t==='后勤兵')return 'nano';
    if(t==='工兵')return 'rapid';
    if(t==='排雷兵')return 'scan';
    if(t==='掷弹兵')return 'micro';
    if(t==='补给车')return 'shield';
    if(t==='指挥车')return 'link';
    return '';
}
function neonFlag(u,key){return !!neonUnitState(u).once[key];}
function neonMark(u,key){neonUnitState(u).once[key]=true;}
function neonTurnFlag(u,key){return neonUnitState(u).turn[key]===gameState.turn;}
function neonMarkTurn(u,key){neonUnitState(u).turn[key]=gameState.turn;}
function neonEventActive(key){
    if(gameState.gameMode!=='neon')return false;
    const n=neonState();
    return n.activeEvent===key&&n.activeTurn===gameState.turn;
}
function neonShieldNear(def){
    if(gameState.gameMode!=='neon'||!def)return false;
    return getAllUnits().some(u=>!u.destroyed&&u.side===def.side&&u!==def&&(u.layer||'ground')==='ground'&&
        neonTraitKey(u)==='shield'&&Math.abs(u.x-def.x)+Math.abs(u.y-def.y)===1);
}
/* 数据包：核心每轮喷出，地面单位拾取后带回己方终端；终端在己方回合开始时自动上传。 */
function neonTerminal(side){return neonState().terminals[side]||null;}
function neonAtOwnTerminal(u){
    const t=neonTerminal(u&&u.side);return !!t&&u.x===t.x&&u.y===t.y;
}
function neonCapacity(u){return neonTraitKey(u)==='reactive'?2:1;}
function neonPacketsOnGroundAt(x,y){return neonState().packets.filter(p=>p.carrierId==null&&p.x===x&&p.y===y);}
function neonCarriedPackets(u){
    if(!u)return [];
    return neonState().packets.filter(p=>p.carrierId===u.id);
}
function neonCarryCount(u){return neonCarriedPackets(u).length;}
function neonCarriedCount(side){
    return getAllUnits().filter(u=>!u.destroyed&&u.side===side&&(u.layer||'ground')==='ground').reduce((sum,u)=>sum+neonCarryCount(u),0);
}
function neonSyncPackets(){
    const n=neonState();
    for(const p of n.packets){
        if(p.carrierId==null)continue;
        const u=getAllUnits().find(v=>v.id===p.carrierId&&!v.destroyed);
        if(!u){p.carrierId=null;continue;}
        p.x=u.x;p.y=u.y;
    }
}
function neonPickup(u){
    if(!u||u.destroyed||(u.layer||'ground')!=='ground')return 0;
    const n=neonState();
    let cap=neonCapacity(u)-neonCarryCount(u),got=0;
    if(cap<=0)return 0;
    for(const p of n.packets){
        if(cap<=0)break;
        if(p.carrierId==null&&p.x===u.x&&p.y===u.y){p.carrierId=u.id;cap--;got++;}
    }
    if(got){
        addLog(`📦 ${getFactionName(u.side)}${unitDisplayName(u)}拾取 ${got} 个数据包（${neonCarryCount(u)}/${neonCapacity(u)}）`);
        pushSound('crystal');
    }
    return got;
}
function neonDropCarried(u){
    if(!u)return 0;
    const n=neonState();let dropped=0;
    for(const p of n.packets){
        if(p.carrierId===u.id){p.carrierId=null;p.x=u.x;p.y=u.y;dropped++;}
    }
    if(dropped)addLog(`📦 ${getFactionName(u.side)}${unitDisplayName(u)}掉落 ${dropped} 个数据包`);
    return dropped;
}
function neonSpawnPacket(x,y){
    const n=neonState();
    if(n.packets.length>=6)return null;
    if(unitAt(x,y))return null;
    const p={id:n.nextPacketId++,x,y,carrierId:null};
    n.packets.push(p);
    return p;
}
function neonSpawnOnEmpty(count){
    const n=neonState();
    let spawned=0;
    for(let i=0;i<count;i++){
        if(n.packets.length>=6)break;
        const tiles=[];
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
            if(!dx&&!dy)continue;
            const x=n.core.x+dx,y=n.core.y+dy;
            if(inBounds(x,y)&&!isBlockedTile(x,y,gameState.gameMode)&&!unitAt(x,y))tiles.push({x,y});
        }
        if(!tiles.length)break;
        const t=tiles[Math.floor(Math.random()*tiles.length)];
        if(neonSpawnPacket(t.x,t.y))spawned++;
    }
    return spawned;
}
function neonSpawnTick(){
    if(gameState.gameMode!=='neon'||gameState.gameOver)return;
    const n=neonState();
    if(n.surgeTurn===gameState.turn)return;
    if(n.packets.length>=6){addLog('📦 数据核心缓冲区已满，本轮不再喷出数据包');return;}
    const spawned=neonSpawnOnEmpty(2);
    if(spawned)addLog(`📦 数据核心本轮喷出 ${spawned} 个数据包`);
    else if(n.packets.length<6)addLog('📦 喷包区被单位占满，本轮没有喷出数据包');
}
const NEON_PROTOCOL_TARGET=5;
function neonResolveUpload(side){
    if(gameState.gameMode!=='neon'||gameState.gameOver)return false;
    const n=neonState();
    const units=getPlayer(side).units.filter(u=>!u.destroyed&&(u.layer||'ground')==='ground'&&neonAtOwnTerminal(u)&&neonCarryCount(u)>0);
    if(!units.length)return false;
    if(neonEventActive('blackout')){
        addLog(`🔌 停电：${getFactionName(side)}上传终端离线，${units.reduce((s,u)=>s+neonCarryCount(u),0)} 个数据包滞留`);
        return false;
    }
    let total=0;const used=new Set();
    for(const u of units){
        if((u.chaos||0)>0){addLog(`🌀 ${unitDisplayName(u)}处于混乱，无法上传`);continue;}
        for(const p of neonCarriedPackets(u)){used.add(p.id);total++;}
    }
    if(!total)return false;
    n.packets=n.packets.filter(p=>!used.has(p.id));
    n.protocols[side]+=total;
    addLog(`📤 ${getFactionName(side)}上传 ${total} 个数据包，协议 +${total}（${n.protocols[side]}/${NEON_PROTOCOL_TARGET}）`);
    pushSound('city_reward');
    if(n.protocols[side]>=NEON_PROTOCOL_TARGET){
        showVictory(`${side==='red'?'红方':'蓝方'}胜利 · 系统接管`);
        return true;
    }
    return false;
}
const NEON_EVENTS=[
    {key:'emp',name:'电磁风暴',icon:'⚡',round:true,desc:'所有携带者掉落数据包，本回合远程攻击点数 -1'},
    {key:'debris',name:'轨道碎片',icon:'☄️',round:false,desc:'预告区域混乱 +1，摧毁工事/地雷与地上的数据包'},
    {key:'surge',name:'数据洪流',icon:'💾',round:false,desc:'核心额外喷出 2 个数据包'},
    {key:'gravity',name:'重力异常',icon:'🌀',round:true,desc:'本回合攻击点数 +1，车最多移动 2 格'},
    {key:'nanofog',name:'纳米雾',icon:'🌫️',round:true,desc:'中央 3 列单位受击点数 -1'},
    {key:'blackout',name:'停电',icon:'🔌',round:true,desc:'本回合上传终端离线、地雷不触发，双方指挥点 -1'}
];
function neonEventMeta(key){return NEON_EVENTS.find(e=>e.key===key)||null;}
function neonPrepareEvent(dueTurn){
    const meta=NEON_EVENTS[Math.floor(Math.random()*NEON_EVENTS.length)];
    const ev={key:meta.key,name:meta.name,icon:meta.icon,desc:meta.desc,dueTurn};
    if(meta.key==='debris'){
        const vertical=Math.random()<0.5;
        if(vertical){
            const x=4+Math.floor(Math.random()*3),y=Math.floor(Math.random()*3);
            ev.tiles=[{x,y},{x,y:y+1},{x,y:y+2}];
        }else{
            const y=Math.floor(Math.random()*5);
            ev.tiles=[{x:4,y},{x:5,y},{x:6,y}];
        }
        ev.desc+=`（${ev.tiles.map(t=>`(${t.x},${t.y})`).join('、')}）`;
    }
    return ev;
}
function neonTriggerEvent(ev){
    const n=neonState();
    pushSound('beacon_signal');
    if(ev.key==='surge'){
        n.surgeTurn=gameState.turn;
        const spawned=neonSpawnOnEmpty(2);
        addLog(`💾 公共事件【数据洪流】：核心额外喷出 ${spawned} 个数据包`);
        return;
    }
    if(ev.key==='emp'){
        let dropped=0;
        for(const u of getAllUnits()){
            if(!u.destroyed&&neonCarryCount(u)>0)dropped+=neonDropCarried(u);
        }
        n.activeEvent=ev.key;n.activeTurn=gameState.turn;
        addLog(`📡 公共事件【${ev.name}】生效：${dropped?`所有携带者掉落 ${dropped} 个数据包`:'场上没有数据包被携带'}，本回合远程攻击点数 -1`);
        return;
    }
    if(ev.key==='debris'){
        const tiles=ev.tiles||[];
        let hit=0,destroyed=0,packetsLost=0;
        for(const t of tiles){
            const occ=unitAt(t.x,t.y);
            if(occ){
                if(occ.unit.type==='地雷'||occ.unit.type==='防御工事'){damageUnit(occ.unit,null,{direct:true,ignoreNeon:true});destroyed++;}
                else if((occ.unit.layer||'ground')==='ground'){addUnitChaos(occ.unit,1,null);hit++;}
            }
        }
        const before=n.packets.length;
        n.packets=n.packets.filter(p=>p.carrierId!=null||!tiles.some(t=>t.x===p.x&&t.y===p.y));
        packetsLost=before-n.packets.length;
        pushSound('eruption');
        addLog(`☄️ 公共事件【轨道碎片】：${tiles.map(t=>`(${t.x},${t.y})`).join('、')} ${hit?hit+'个单位混乱+1':'无单位受击'}${destroyed?`，摧毁${destroyed}个工事/地雷`:''}${packetsLost?`，蒸发了 ${packetsLost} 个地上的数据包`:''}`);
        return;
    }
    n.activeEvent=ev.key;n.activeTurn=gameState.turn;
    addLog(`📡 公共事件【${ev.name}】生效：${ev.desc}`);
}
function neonEventTick(){
    if(gameState.gameMode!=='neon'||gameState.gameOver)return;
    const n=neonState();
    if(n.activeEvent&&n.activeTurn<gameState.turn)n.activeEvent=null;
    if(n.event&&n.eventDueTurn===gameState.turn){
        const ev=n.event;n.event=null;n.eventDueTurn=0;
        neonTriggerEvent(ev);
    }
    if(!n.event&&gameState.turn+1<=18&&(gameState.turn+1)%3===0){
        const ev=neonPrepareEvent(gameState.turn+1);
        n.event=ev;n.eventDueTurn=ev.dueTurn;
        addLog(`📡 公共事件预警：下回合【${ev.name}】${ev.desc}`);
    }
}
function neonTimeoutCheck(){
    if(gameState.gameMode!=='neon'||gameState.gameOver)return false;
    const n=neonState();
    if(n.protocols.red!==n.protocols.blue){
        showVictory(`${n.protocols.red>n.protocols.blue?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（协议 ${n.protocols.red}:${n.protocols.blue}）`);
        return true;
    }
    const rc=neonCarriedCount('red'),bc=neonCarriedCount('blue');
    if(rc!==bc){showVictory(`${rc>bc?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（携带数据包 ${rc}:${bc}）`);return true;}
    const rr=neonRingCount('red'),br=neonRingCount('blue');
    if(rr!==br){showVictory(`${rr>br?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（核心区单位 ${rr}:${br}）`);return true;}
    const ru=tideCombatCount('red'),bu=tideCombatCount('blue');
    if(ru!==bu){showVictory(`${ru>bu?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（存活单位 ${ru}:${bu}）`);return true;}
    const rs=getPlayer('red').sp||0,bs=getPlayer('blue').sp||0;
    if(rs!==bs){showVictory(`${rs>bs?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（技能点 ${rs}:${bs}）`);return true;}
    showVictory('霓虹纪元 · 第20回合平局');
    return true;
}

function onImperialUnitKilled(killer,killed){
    if(gameState.gameMode!=='wannan' || !killer || killer.destroyed || !['red','blue'].includes(killer.side) || killed.side!=='imperial' || killed.rewardGranted) return null;
    let type=null,buffs=[];
    if(killed.type==='步兵' && killed.permaBuffs?.includes('elite_infantry')) type='步兵';
    else if(killed.type==='车'){
        type='车';
        if(!killed.permaBuffs?.includes('elite_chariot')) buffs=['battle_damaged'];
    } else if(['炮兵','防御工事','后勤兵'].includes(killed.type)) type=killed.type;
    if(!type) return null;
    // 后勤兵即使带精锐步兵属性，奖励兵种仍为后勤兵。
    killed.rewardGranted=true;
    const counts=gameState.imperialRewardCount||(gameState.imperialRewardCount={red:0,blue:0});
    if((counts[killer.side]||0)>=3){
        getPlayer(killer.side).sp+=1;
        addLog(`消灭波斯远征军${killed.type}：奖励单位已达上限（3个），改为技能点+1`);
        return null;
    }
    const deployed=deployModeReinforcement(killer.side,type,1,buffs);
    if(deployed>0){
        counts[killer.side]=(counts[killer.side]||0)+1;
        addLog(`消灭波斯远征军${killed.type}：己方阵地生成${buffs.length?'战损车':type}（奖励${counts[killer.side]}/3）`);
        return true;
    }
    getPlayer(killer.side).sp+=1;
    addLog(`消灭波斯远征军${killed.type}：己方阵地无空位，改为技能点+1`);
    return null;
}

function calculateImperialMaxActions(){
    // 回合开始前也用此函数检查增援条件，此时上回合指挥点尚未恢复。
    // 因而只检查单位自身能否行动，不检查旧指挥点余额。
    // 前 5 回合压制皇军行动节奏，第 6 回合起恢复 4 动。
    const cap=gameState.turn<=5?3:4;
    return Math.min(cap,getImperial().units.filter(u=>!u.destroyed && (u.chaos||0)===0 && !u.suppressed && u.type!=='地雷' &&
        (u.type!=='防御工事' || unitHasBuff(u,'turret')) && !['鬼魂','墓碑'].includes(u.type) &&
        (!isRangedUnit(u) || (u.remainingActions||0)>0)).length);
}

function finishImperialTurn(){
    gameState.imperialActing=false;
    delete gameState.aiActionUnitId;
    if(!gameState.gameOver && gameState.activeSide==='imperial') endTurn();
}

function actImperialUnit(){
    if(gameState.gameOver || gameState.phase!=='ACTION' || gameState.gameMode!=='wannan' || gameState.activeSide!=='imperial') return;
    gameState.imperialActing=true;
    const imp=getImperial();
    if(gameState.imperialUnitsActedThisTurn>=gameState.imperialMaxActionsThisTurn){ finishImperialTurn(); return; }
    const actionable=imp.units.filter(u=>canUnitAct(u,'imperial') && !(u.lastActedTurn===gameState.turn && u.lastActedSide==='imperial'));
    if(!actionable.length){ finishImperialTurn(); return; }
    const enemies=['red','blue'].flatMap(side=>getPlayer(side).units.filter(u=>!u.destroyed).map(u=>({unit:u,side})));
    const distanceFrom=u=>other=>Math.abs(other.x-u.x)+Math.abs(other.y-u.y);
    const artilleryTargetsFor=u=>enemies.filter(e=>e.unit.type!=='地雷' && hasActedThisGame(e.unit)).sort((a,b)=>{
        const actedDiff=(hasActedThisTurn(b.unit,b.side)?1:0)-(hasActedThisTurn(a.unit,a.side)?1:0);
        if(actedDiff)return actedDiff;
        const hpDiff=(a.unit.hp||99)-(b.unit.hp||99);
        if(hpDiff)return hpDiff;
        return distanceFrom(u)(a.unit)-distanceFrom(u)(b.unit);
    });
    const artilleryReady=actionable.find(u=>u.type==='炮兵' && artilleryTargetsFor(u).length);
    const logisticsReady=actionable.find(u=>u.type==='后勤兵' && imp.units.some(a=>a!==u && !a.destroyed && (a.chaos||0)>0 && Math.abs(a.x-u.x)+Math.abs(a.y-u.y)===1));
    let unit=null;
    if(gameState.imperialUnitsActedThisTurn===0) unit=artilleryReady||logisticsReady;
    if(!unit){
        const priority={'车':0,'炮兵':1,'步兵':2,'二阶步兵':2,'后勤兵':2};
        actionable.sort((a,b)=>(priority[a.type]??9)-(priority[b.type]??9));
        unit=actionable[0];
    }
    const distance=other=>Math.abs(other.x-unit.x)+Math.abs(other.y-unit.y);
    enemies.sort((a,b)=>distance(a.unit)-distance(b.unit));
    const nearest=enemies[0]?.unit;
    const next=()=>{
        delete gameState.aiActionUnitId;
        gameState.imperialUnitsActedThisTurn++;
        renderAll();
        if(!checkVictory() && !gameState.gameOver) scheduleGame(actImperialUnit,350);
    };
    // 先记录行动，以免攻击后触发回合切换时把行动写入下一回合。
    markActed(unit,'imperial');
    gameState.aiActionUnitId=unit.id;
    if(!nearest){ next(); return; }
    const adjacent=enemies.find(e=>distance(e.unit)===1);
    if(unit.type==='后勤兵'){
        const target=imp.units.find(u=>u!==unit && !u.destroyed && u.chaos>0 && Math.abs(u.x-unit.x)+Math.abs(u.y-unit.y)===1);
        if(target){ target.chaos=Math.max(0,target.chaos-1); imp.cmd=Math.max(0,imp.cmd-1); addLog(`波斯远征军后勤兵解除相邻${target.type}的一层混乱`); next(); return; }
    }
    if(unit.type==='炮兵'){
        const targets=artilleryTargetsFor(unit);
        if(targets.length) resolveArtilleryAttack(unit,targets[0].unit.x,targets[0].unit.y);
        else addLog('波斯远征军炮兵没有已行动的合法目标');
        next(); return;
    }
    if(adjacent){
        // 地雷只能通过踩雷判定处理，步兵的普通攻击不能以地雷为目标。
        if(adjacent.unit.type==='地雷'){
            if(unit.type==='车') chariotMove(unit,adjacent.unit.x,adjacent.unit.y);
            else tryMove(unit,adjacent.unit.x,adjacent.unit.y);
        }
        else if(unit.type==='车') chariotAttack(unit,adjacent.unit);
        else tryAttack(unit,adjacent.unit,adjacent.unit.x,adjacent.unit.y);
        next(); return;
    }
    if(unit.static){addLog(`波斯远征军${unit.type}按兵不动`);next();return;}
    const axes=Math.abs(nearest.x-unit.x)>=Math.abs(nearest.y-unit.y)?['x','y']:['y','x'];
    for(const axis of axes){
        const step=Math.sign(nearest[axis]-unit[axis]);
        if(!step) continue;
        const x=unit.x+(axis==='x'?step:0),y=unit.y+(axis==='y'?step:0);
        if(x>=0 && x<COLS && y>=0 && y<ROWS && !unitAt(x,y) && !isBlockedTile(x,y,gameState.gameMode)){
            unit.x=x; unit.y=y; imp.cmd=Math.max(0,imp.cmd-1); addLog(`波斯远征军${unit.type}移动至(${x},${y})`); break;
        }
    }
    next();
}

const SNOW_EVENTS=[
    {id:1,name:'大雪封路',desc:'封锁中间格并挤开单位'},
    {id:2,name:'腹背受敌',desc:'列3布蓝方工事，列7布红方工事'},
    {id:3,name:'寒意腾涌',desc:'双方交战线加一层混乱'},
    {id:4,name:'初阳普照',desc:'双方交战线解除全部混乱'},
    {id:5,name:'另起炉灶',desc:'双方各部署一个后勤兵'},
    {id:6,name:'群狼长啸',desc:'双方交战线获得精锐属性'}
];

function snowEventUnits(){
    return getAllUnits().filter(u=>!u.destroyed && !['地雷','防御工事','墓碑','鬼魂'].includes(u.type));
}
function snowRowsWithUnits(){
    return Array.from({length:ROWS},(_,y)=>y);
}
function snowFairRow(){
    let best=0,bestMin=-1,bestTotal=-1;
    for(const y of snowRowsWithUnits()){
        const inRow=snowEventUnits().filter(u=>u.y===y);
        const red=inRow.filter(u=>u.side==='red').length,blue=inRow.filter(u=>u.side==='blue').length;
        const min=Math.min(red,blue),total=red+blue;
        if(min>bestMin||(min===bestMin&&total>bestTotal)){best=y;bestMin=min;bestTotal=total;}
    }
    return best;
}
function snowRandomRows(count){
    const rows=snowRowsWithUnits();
    for(let i=rows.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rows[i],rows[j]]=[rows[j],rows[i]];}
    return rows.slice(0,count).sort((a,b)=>a-b);
}
function snowNearestEmpty(x,y,side,avoid=null){
    const tiles=[];
    for(let yy=0;yy<ROWS;yy++)for(let xx=0;xx<COLS;xx++){
        if(avoid&&avoid(xx,yy))continue;
        if(!unitAt(xx,yy)&&!isBlockedTile(xx,yy,gameState.gameMode))tiles.push({x:xx,y:yy});
    }
    tiles.sort((a,b)=>{
        const sameRowA=a.y===y?0:1,sameRowB=b.y===y?0:1;
        if(sameRowA!==sameRowB)return sameRowA-sameRowB;
        if(side){
            const ownA=isInTerritory(a.x,a.y,side,'snow')?0:1,ownB=isInTerritory(b.x,b.y,side,'snow')?0:1;
            if(ownA!==ownB)return ownA-ownB;
        }
        return Math.abs(a.x-x)+Math.abs(a.y-y)-Math.abs(b.x-x)-Math.abs(b.y-y);
    });
    return tiles[0]||null;
}
function snowNearestOwnEmpty(x,y,side){
    const tiles=[];
    for(let yy=0;yy<ROWS;yy++)for(let xx=0;xx<COLS;xx++){
        if(!isInTerritory(xx,yy,side,'snow')||unitAt(xx,yy)||isBlockedTile(xx,yy,'snow'))continue;
        tiles.push({x:xx,y:yy});
    }
    tiles.sort((a,b)=>Math.abs(a.x-x)+Math.abs(a.y-y)-Math.abs(b.x-x)-Math.abs(b.y-y));
    return tiles[0]||null;
}

function eventSnowBlock(prep){
    if(gameState.gameMode!=='snow') return;
    const strong=prep?!!prep.strong:!!snowEventStrong(gameState.turn).strong;
    const chosen=(prep&&prep.rows?prep.rows.slice():snowRandomRows(strong?3:2)).sort((a,b)=>a-b);
    gameState.snowBlockedTiles=chosen.map(y=>({x:5,y}));
    for(const y of chosen){
        const occ=unitAt(5,y);
        if(!occ)continue;
        const free=snowNearestEmpty(5,y,occ.unit.side);
        if(free){
            occ.unit.x=free.x;occ.unit.y=free.y;
            addUnitChaos(occ.unit,1);
            addLog(`大雪封路：(${5},${y})的${occ.unit.type}被挤到(${free.x},${free.y})并混乱+1`);
        }else{
            damageUnit(occ.unit,null,{direct:true});
            addLog(`大雪封路：(${5},${y})的${occ.unit.type}无处可退，被消灭`);
        }
    }
    gameState.snowBlockedUntil=gameState.turn+3;
    addLog(`大雪封路：第${chosen.join('、')}行中间格封闭3回合`);
    modeEffectFinished();
}

function eventFortificationWalls(prep){
    if(gameState.gameMode!=='snow') return;
    const strong=prep?!!prep.strong:!!snowEventStrong(gameState.turn).strong;
    const extraRows=strong?(prep&&prep.extraRows?prep.extraRows.slice():snowRandomRows(3)):[];
    const walls=[];
    for(let y=0;y<ROWS;y++){walls.push({x:3,y,side:'blue'},{x:7,y,side:'red'});}
    for(const y of extraRows){walls.push({x:4,y,side:'blue'},{x:6,y,side:'red'});}
    const wallKeys=new Set(walls.map(w=>w.x+','+w.y));
    const avoidWall=(x,y)=>wallKeys.has(x+','+y);
    for(const wall of walls){
        const occ=unitAt(wall.x,wall.y);
        if(occ?.side===wall.side && occ.unit.type==='防御工事') continue;
        if(occ){
            const free=snowNearestEmpty(wall.x,wall.y,occ.unit.side,avoidWall);
            if(!free){ addLog(`腹背受敌：(${wall.x},${wall.y})无法腾空，跳过该工事`); continue; }
            occ.unit.x=free.x; occ.unit.y=free.y;
            addLog(`腹背受敌：(${wall.x},${wall.y})的${occ.unit.type}被挤回己方阵地(${free.x},${free.y})`);
        }
        getPlayer(wall.side).units.push(createUnit('防御工事',wall.x,wall.y,wall.side));
    }
    addLog(`腹背受敌：列3布蓝方工事，列7布红方工事${extraRows.length?`；另在${extraRows.map(y=>'第'+y+'行').join('、')}的列4/6布第二道工事`:''}`);
    modeEffectFinished();
}

function eventColdWave(prep){
    if(gameState.gameMode!=='snow') return;
    const strong=prep?!!prep.strong:!!snowEventStrong(gameState.turn).strong;
    const rows=prep&&prep.rows?prep.rows.slice():[snowFairRow()];
    const amount=strong?2:1;
    for(const row of rows){
        for(const unit of snowEventUnits()) if(unit.y===row) unit.chaos=(unit.chaos||0)+amount;
        addLog(`寒意腾涌：第${row}行单位混乱+${amount}`);
    }
    modeEffectFinished();
}

function eventSunshine(prep){
    if(gameState.gameMode!=='snow') return;
    const fallbackRow=snowFairRow();
    const rows=prep&&prep.rows?prep.rows.slice():(snowEventStrong(gameState.turn).strong?[fallbackRow,(fallbackRow+2)%ROWS]:[fallbackRow]);
    for(const row of rows){
        for(const unit of snowEventUnits()) if(unit.y===row) unit.chaos=0;
        addLog(`初阳普照：第${row}行所有混乱解除`);
    }
    modeEffectFinished();
}

function eventNewStart(prep){
    if(gameState.gameMode!=='snow' || gameState.pendingModeEvent) return;
    if(gameState.skillTargetRequest || gameState.skillTransaction || gameState.skillResolving){
        addLog('请先完成当前技能，再触发另起炉灶');
        return;
    }
    gameState.pendingModeEvent='new_start';
    gameState.pendingModeEventResumeRound=!!gameState.awaitingRoundTurn;
    const bonus=prep?!!(prep.bonusInfantry||prep.strong):!!snowEventStrong(gameState.turn).strong;
    const sides=['red','blue'];
    const chooseSide=index=>{
        if(index>=sides.length){ finishSnowEvent(); return; }
        const side=sides[index];
        let hasSpace=false;
        for(let x=0;x<COLS;x++) for(let y=0;y<ROWS;y++) if(isInTerritory(x,y,side,'snow') && !unitAt(x,y) && !isBlockedTile(x,y,'snow')) hasSpace=true;
        if(!hasSpace){ addLog(`另起炉灶：${getFactionName(side)}阵地已满，无法部署后勤兵`); chooseSide(index+1); return; }
        startSkillTarget(999,'另起炉灶',`${getFactionName(side)}选择己方阵地空格部署后勤兵`,1,'tile',
            (occ,pos)=>!occ && isInTerritory(pos.x,pos.y,side,'snow') && !isBlockedTile(pos.x,pos.y,'snow'),
            tiles=>{
                getPlayer(side).units.push(createUnit('后勤兵',tiles[0].x,tiles[0].y,side));
                addLog(`另起炉灶：${getFactionName(side)}部署后勤兵`);
                if(bonus){
                    const spot=snowNearestOwnEmpty(tiles[0].x,tiles[0].y,side);
                    if(spot){
                        getPlayer(side).units.push(createUnit('步兵',spot.x,spot.y,side));
                        addLog(`另起炉灶：大雪中${getFactionName(side)}追加1个步兵至(${spot.x},${spot.y})`);
                    }else addLog(`另起炉灶：${getFactionName(side)}阵地已满，无法追加步兵`);
                }
                chooseSide(index+1);
            });
        gameState.skillTargetRequest.publicEvent=true;
        gameState.skillTargetRequest.chooserSide=side;
        renderAll();
    };
    chooseSide(0);
}

function eventWolfHowl(prep){
    if(gameState.gameMode!=='snow') return;
    const fallbackRow=snowFairRow();
    const rows=prep&&prep.rows?prep.rows.slice():(snowEventStrong(gameState.turn).strong?[fallbackRow,(fallbackRow+2)%ROWS]:[fallbackRow]);
    const buffs={'步兵':'elite_infantry','车':'elite_chariot','炮兵':'elite_artillery'};
    for(const row of rows){
        for(const unit of snowEventUnits()) if(unit.y===row && buffs[unit.type] && !unit.permaBuffs.includes(buffs[unit.type])) unit.permaBuffs.push(buffs[unit.type]);
        addLog(`群狼长啸：第${row}行的步兵、车、炮兵获得精锐`);
    }
    modeEffectFinished();
}

function prepareSnowEvent(forTurn=gameState.turn){
    const strength=snowEventStrong(forTurn);
    const strong=strength.strong;
    const eventId=Math.floor(Math.random()*SNOW_EVENTS.length)+1;
    const event={id:eventId,strong,strongReason:strength.reason,name:SNOW_EVENTS[eventId-1].name};
    if(eventId===1) event.rows=snowRandomRows(strong?3:2);
    else if([3,4,6].includes(eventId)){
        const row=snowFairRow();
        event.rows=strong?[row,(row+2)%ROWS]:[row];
    }
    else if(eventId===2 && strong){
        event.extraRows=snowRandomRows(3);
    }
    else if(eventId===5 && strong){
        event.bonusInfantry=true;
    }
    return event;
}

function snowEventTargetText(event){
    const rows=(event.rows||[]).map(y=>'第'+y+'行').join('、');
    const extraRows=(event.extraRows||[]).map(y=>'第'+y+'行').join('、');
    switch(event.id){
        case 1:return `${rows}中间格`;
        case 2:return event.extraRows&&event.extraRows.length
            ?`列3、列7；另在${extraRows}的列4/6布第二道工事`
            :'列3、列7';
        case 3:case 4:case 6:return rows;
        case 5:return event.bonusInfantry?'双方各部署1个后勤兵和1个步兵':'双方各部署1个后勤兵';
    }
    return '';
}

function triggerSnowEvent(prepared){
    if(gameState.gameMode!=='snow' || gameState.pendingModeEvent || gameState.gameOver) return;
    const event=prepared||prepareSnowEvent();
    const reason=weatherStrongReasonLabel(event.strongReason);
    addLog(`❄️ 公共事件：${event.name}${event.strong?`（强化${reason?'·'+reason:''}）`:''}`);
    pushSound(['snow_road','snow_fort','snow_chill','snow_sun','snow_camp','snow_wolves'][event.id-1]);
    [eventSnowBlock,eventFortificationWalls,eventColdWave,eventSunshine,eventNewStart,eventWolfHowl][event.id-1](event);
}

function finishSnowEvent(){
    const resumeRound=gameState.pendingModeEventResumeRound;
    gameState.pendingModeEvent=null;
    gameState.pendingModeEventResumeRound=false;
    modeEffectFinished();
    if(resumeRound && !gameState.gameOver) resumeRoundStart();
}

function pirateRefreshBoats(count=1){
    if(gameState.gameMode!=='pirate')return 0;
    let refreshed=0;
    for(const side of ['red','blue']){
        const x=side==='red'?3:7;
        const points=(gameState.pirateBoatPoints||[]).filter(p=>p.x===x&&p.used&&!unitAt(p.x,p.y));
        points.sort((a,b)=>a.y-b.y);
        for(let i=0;i<Math.min(count,points.length);i++){points[i].used=false;refreshed++;}
    }
    return refreshed;
}

function preparePirateEvent(forTurn=gameState.turn){
    const roll=Math.floor(Math.random()*7),eventId=roll<2?1:roll<5?2:3;
    const event={id:eventId,name:['怒涛霜雪','巨炮铿轰','淬钢成艇'][eventId-1]};
    if(eventId===1){
        const water=[];
        for(let x=4;x<=6;x++)for(let y=0;y<ROWS;y+=2)water.push({x,y});
        event.tile=water[Math.floor(Math.random()*water.length)];
    }else if(eventId===2) event.row=Math.floor(Math.random()*ROWS);
    return event;
}
function pirateEventTargetText(event){
    if(event.id===1)return event.tile?`海域(${event.tile.x},${event.tile.y})`:'随机海域';
    if(event.id===2)return `第${event.row}行中立区（列4-6）`;
    return '所有空置快艇点';
}
function triggerPirateEvent(prepared){
    if(gameState.gameMode!=='pirate' || gameState.gameOver) return;
    const event=prepared||preparePirateEvent();
    addLog(`🏴‍☠️ 海盗公共事件：${event.name}`);
    pushSound(['pirate_wave','pirate_cannon','pirate_resupply'][event.id-1]);
    [eventRagingWave,eventCannonBarrage,eventBoatResupply][event.id-1](event);
}

function eventRagingWave(prep){
    if(gameState.gameMode!=='pirate') return;
    const water=[];
    for(let x=4;x<=6;x++) for(let y=0;y<ROWS;y+=2) water.push({x,y});
    const tile=(prep&&prep.tile)||water[Math.floor(Math.random()*water.length)];
    gameState.pirateVortexTiles=[tile]; gameState.pirateVortexTurns=3; gameState.pirateVortexUntil=gameState.turn+3;
    const occ=unitAt(tile.x,tile.y);
    if(occ?.unit.boarded){ damageUnit(occ.unit,null,{direct:true}); occ.unit.boarded=false; addLog(`🌊 漩涡吞噬了(${tile.x},${tile.y})的登船单位`); }
    addLog(`🌊 怒涛霜雪：(${tile.x},${tile.y})生成漩涡，持续3回合`);
    modeEffectFinished();
}

function eventCannonBarrage(prep){
    if(gameState.gameMode!=='pirate') return;
    const row=(prep&&prep.row!==undefined)?prep.row:Math.floor(Math.random()*ROWS);
    addLog(`💥 巨炮铿轰：轰击第${row}行中立区（列4-6）`);
    for(let x=4;x<=6;x++){
        const occ=unitAt(x,row);
        if(!occ || occ.unit.destroyed) continue;
        const unit=occ.unit,roll=Math.floor(Math.random()*6)+1;
        const result=resolveArtilleryTable({permaBuffs:[]},unit,roll);
        let message=`巨炮→${unit.type} 点数:${roll}`;
        if(result.destroyed){
            const beforeType=unit.type,beforeArmory=unit.armoryType;
            const applied=damageUnit(unit,null,{combat:true});
            if(applied) message+=' → 消灭';
            else if(beforeType==='二阶步兵'&&unit.type==='步兵') message+=' → HP减一，变回步兵';
            else if(beforeArmory==='二阶战车'&&!unit.armoryType) message+=' → HP减一，变回普通车';
            else message+=' → 防御属性抵消';
        }
        else if(result.chaos){ addUnitChaos(unit,1,null,{combat:true}); message+=' → 混乱判定'; }
        else message+=' → 无事';
        addLog(message);
    }
    modeEffectFinished();
}

function eventBoatResupply(){
    if(gameState.gameMode!=='pirate') return;
    const refreshed=pirateRefreshBoats(99);
    addLog(`⛵ 淬钢成艇：补充${refreshed}艘空置快艇`);
    modeEffectFinished();
}

function eventSeaMonster(){
    if(gameState.gameMode!=='pirate') return;
    for(const [x,y] of [[5,1],[5,3]]){
        const occ=unitAt(x,y);
        if(occ){ damageUnit(occ.unit,null,{direct:true}); occ.unit.boarded=false; addLog(`🐙 海怪吞噬据点(${x},${y})上的${occ.unit.type}`); }
    }
    pushSound('pirate_wave');
    addLog('🐙 海怪来袭！');
    modeEffectFinished();
}

function initFogGraves(){
    if(gameState.gameMode!=='fog' || getGhost().units.some(u=>!u.destroyed)) return;
    const positions=[];
    for(let x=4;x<=6;x++) for(let y=0;y<ROWS;y++) if(!unitAt(x,y)) positions.push({x,y});
    for(let i=positions.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [positions[i],positions[j]]=[positions[j],positions[i]]; }
    for(const position of positions.slice(0,9)) getGhost().units.push(createUnit('墓碑',position.x,position.y,'ghost',{hp:1}));
    const graves=getGhost().units.filter(u=>u.type==='墓碑' && !u.destroyed);
    for(const grave of graves.slice(0,2)) getGhost().units.push(createUnit('鬼魂',grave.x,grave.y,'ghost'));
    addLog(`🪦 墓地部署${graves.length}个墓碑，并产生${Math.min(2,graves.length)}个鬼魂`);pushSound('fog_graveyard');
}

function isFogGhostVisible(){ return !gameState.fogNight || Date.now()<(gameState.revealGhostsUntil||0); }
function isGhostUnitVisible(unit){
    if(!unit||unit.type!=='鬼魂')return true;
    if(!gameState.fogNight)return true;
    if(unit.revealedRound===gameState.turn)return true;
    return Date.now()<(gameState.revealGhostsUntil||0);
}
function gainSoul(side,n=1){
    if(!['red','blue'].includes(side)||n<=0)return;
    gameState.soulCount[side]=(gameState.soulCount[side]||0)+n;
    addLog(`💀 ${getFactionName(side)}凝魂+${n}（当前${gameState.soulCount[side]}）`);pushSound('fog_soul');
    if(typeof levelOnSoulGained==='function')levelOnSoulGained(side,n);
    checkLanternCard(side);
}
function fogPushBack(unit,ghost){
    const tiles=[];
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        if((x===unit.x&&y===unit.y)||(x===ghost.x&&y===ghost.y))continue;
        if(!unitAt(x,y)&&!isBlockedTile(x,y,gameState.gameMode))tiles.push({x,y});
    }
    const ghostDist=t=>Math.abs(t.x-ghost.x)+Math.abs(t.y-ghost.y);
    tiles.sort((a,b)=>{
        const awayA=ghostDist(a)>=ghostDist({x:unit.x,y:unit.y})?0:1;
        const awayB=ghostDist(b)>=ghostDist({x:unit.x,y:unit.y})?0:1;
        if(awayA!==awayB)return awayA-awayB;
        const ownA=isInTerritory(a.x,a.y,unit.side,'fog')?0:1;
        const ownB=isInTerritory(b.x,b.y,unit.side,'fog')?0:1;
        if(ownA!==ownB)return ownA-ownB;
        return Math.abs(a.x-unit.x)+Math.abs(a.y-unit.y)-Math.abs(b.x-unit.x)-Math.abs(b.y-unit.y);
    });
    if(tiles.length){unit.x=tiles[0].x;unit.y=tiles[0].y;}
    addUnitChaos(unit,1);
    gainSoul(unit.side,1);
    ghost.revealedRound=gameState.turn;
    addLog(`👻 雾夜撞鬼：${unit.type}被推回(${unit.x},${unit.y})，混乱+1；鬼魂显形至回合结束`);
}

function triggerGhostEncounter(unit,x,y,encounteredGhost=null){
    if(gameState.gameMode!=='fog' || !unit || unit.destroyed || !['red','blue'].includes(unit.side)) return;
    const encountered=gameState.ghostEncounteredThisRound||(gameState.ghostEncounteredThisRound=[]);
    if(encountered.includes(unit.id))return;
    const ghost=encounteredGhost || getGhost().units.find(u=>u.type==='鬼魂' && u.x===x && u.y===y && !u.destroyed);
    if(!ghost || ghost.destroyed || ghost.type!=='鬼魂') return;
    if(unit.side==='blue'&&typeof levelOnGhostBait==='function')levelOnGhostBait(unit,ghost);
    encountered.push(unit.id);
    pushSound('ghost');
    const killGhost=souls=>{ ghost.destroyed=true; gainSoul(unit.side,souls); };
    if((unit.permaBuffs||[]).includes('lantern_bearer')){ killGhost(2); addLog('🔆 执灯士消灭鬼魂，凝魂+2'); modeEffectFinished(); return; }
    /* 雾夜：无混乱的人类单位不会被鬼魂直接消灭，只会被推回并陷入混乱；已混乱或初晖仍用原判定表。 */
    if(gameState.fogNight&&(unit.chaos||0)===0){ fogPushBack(unit,ghost); modeEffectFinished(); return; }
    const roll=Math.floor(Math.random()*6)+1;
    let message=`👻 撞鬼！${unit.type} 点数:${roll}`;
    const chaos=()=>{ addUnitChaos(unit); gainSoul(unit.side,1); message+=' → 混乱，凝魂+1'; };
    if(['步兵','后勤兵'].includes(unit.type)){
        if(roll<=3){ damageUnit(unit); message+=' → 单位被消灭'; }
        else if(roll===4){ chaos(); }
        else{ killGhost(1); message+=' → 鬼魂被消灭，凝魂+1'; }
    } else if(unit.type==='车'){
        if(roll<=3){ damageUnit(unit); message+=' → 车被消灭'; }
        else if(roll===4){ unit.type='步兵'; delete unit.hp; unit.permaBuffs=[]; unit.tempBuffs=[]; unit.boarded=false; message+=' → 车变为步兵'; }
        else{ killGhost(1); message+=' → 鬼魂被消灭，凝魂+1'; }
    } else if(['炮兵','海炮'].includes(unit.type)){
        if(roll<=3){ damageUnit(unit); message+=' → 炮兵被消灭'; }
        else{ killGhost(1); message+=' → 鬼魂被消灭，凝魂+1'; }
    } else if(unit.type==='二阶步兵'){
        if(roll<=2){ damageUnit(unit); message+=' → HP减一'; }
        else if(roll===3){ chaos(); }
        else{ killGhost(1); message+=' → 鬼魂被消灭，凝魂+1'; }
    }
    addLog(message);
    modeEffectFinished();
}

function checkLanternCard(side){
    if(!['red','blue'].includes(side)) return;
    const earned=gameState.lanternCardsEarned||(gameState.lanternCardsEarned={red:false,blue:false});
    const threshold=earned[side]?3:2;
    if((gameState.soulCount[side]||0)>=threshold){
        gameState.soulCount[side]-=threshold;
        earned[side]=true;
        getPlayer(side).library.unshift(510);
        addLog(`🔆 ${getFactionName(side)}以${threshold}凝魂兑换执灯技能卡`);
    }
}

function finishGhostTurn(){
    gameState.ghostActing=false;
    if(!gameState.gameOver && gameState.activeSide==='ghost') endTurn();
}

function actGhostUnit(){
    if(gameState.gameOver || gameState.phase!=='ACTION' || gameState.gameMode!=='fog' || gameState.activeSide!=='ghost') return;
    gameState.ghostActing=true;
    const ghost=getGhost();
    const candidates=ghost.units.filter(u=>u.type==='鬼魂' && !u.destroyed && (u.chaos||0)===0 && !u.suppressed && !(u.lastActedTurn===gameState.turn && u.lastActedSide==='ghost'));
    if(!candidates.length || gameState.ghostUnitsActedThisTurn>=gameState.ghostMaxActions){ finishGhostTurn(); return; }
    const unit=candidates[0];
    const humans=['red','blue'].flatMap(side=>getPlayer(side).units.filter(u=>!u.destroyed && !['地雷','防御工事'].includes(u.type)));
    const encountered=gameState.ghostEncounteredThisRound||[];
    const avoided=u=>['炮兵','海炮','二阶步兵'].includes(u.type)||(u.permaBuffs||[]).includes('lantern_bearer');
    const onTile=humans.find(u=>u.x===unit.x && u.y===unit.y);
    markActed(unit,'ghost'); gameState.ghostUnitsActedThisTurn++;
    if(onTile) triggerGhostEncounter(onTile,unit.x,unit.y,unit);
    else{
        const preferred=humans.filter(u=>!avoided(u)&&!encountered.includes(u.id));
        const fallback=humans.filter(u=>!encountered.includes(u.id));
        const pool=preferred.length?preferred:fallback;
        const score=u=>{
            let s=0;
            if(['步兵','后勤兵'].includes(u.type))s-=5;
            if((u.chaos||0)>0)s-=3;
            return s;
        };
        const targets=pool.sort((a,b)=>score(a)-score(b)||Math.abs(a.x-unit.x)+Math.abs(a.y-unit.y)-Math.abs(b.x-unit.x)-Math.abs(b.y-unit.y));
        let x=unit.x,y=unit.y;
        if(targets.length){ x+=Math.sign(targets[0].x-unit.x); y+=Math.sign(targets[0].y-unit.y); }
        else{ const directions=[[1,0],[-1,0],[0,1],[0,-1]],direction=directions[Math.floor(Math.random()*directions.length)]; x+=direction[0]; y+=direction[1]; }
        const restricted=gameState.turn<12 && (x<4 || x>6);
        const collision=ghost.units.some(u=>u!==unit && u.type==='鬼魂' && !u.destroyed && u.x===x && u.y===y);
        if(!restricted && !collision && x>=0 && x<COLS && y>=0 && y<ROWS){
            unit.x=x; unit.y=y;
            const human=humans.find(u=>u.x===x && u.y===y);
            if(human) triggerGhostEncounter(human,x,y,unit);
        }
    }
    renderAll();
    if(!checkVictory() && !gameState.gameOver) scheduleGame(actGhostUnit,300);
}

function spawnGhosts(){
    if(gameState.gameMode!=='fog' || gameState.ghostSpawnedRound===gameState.turn) return;
    gameState.ghostSpawnedRound=gameState.turn;
    const graves=getGhost().units.filter(u=>u.type==='墓碑' && !u.destroyed);
    const count=graves.length>=4 && gameState.turn%2===0?2:graves.length>0 && graves.length<=3 && gameState.turn%3===0?1:0;
    const available=graves.filter(g=>!getGhost().units.some(u=>u.type==='鬼魂' && !u.destroyed && u.x===g.x && u.y===g.y));
    let spawned=0;
    for(let i=0;i<count && available.length;i++){
        const grave=available.splice(Math.floor(Math.random()*available.length),1)[0]; getGhost().units.push(createUnit('鬼魂',grave.x,grave.y,'ghost')); spawned++;
    }
    if(spawned) addLog(`👻 ${gameState.fogNight?'雾夜':'初晖'}产生${spawned}个鬼魂`);
}

/* ══════════════════════════════════════════════════════════════════
   圣辉之战：单机版移植（天空层 / 龙属性 / 区域奖励 / 火山 / 追赶增援）
   规则与联机版一致；本段不参与引擎抽取，联机引擎使用自身同源实现。
   ══════════════════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════════════════════════════
   蛇骨矿洞：地面 / 矿洞双层地图（1.7.0 一期 + 二期）
   地面沿用旧矿洞地图；坑洞是双向竖井，只有步兵类单位能下井。
   ══════════════════════════════════════════════════════════════════ */
const MINE_WALLS=[[1,0],[5,0],[9,0],[1,2],[9,2],[3,3],[7,3],[1,4],[5,4],[9,4]];
const MINE_SHAFTS=[{x:0,y:2},{x:2,y:2},{x:5,y:2,central:true},{x:8,y:2},{x:10,y:2}];
const MINE_CRYSTAL_TILES=[{x:2,y:0},{x:8,y:0}];
const MINE_RELIC_TILES=[{x:2,y:4},{x:8,y:4}];
const MINE_BOSS_TILE={x:5,y:2};

function mineState(){
    if(!gameState.mine||typeof gameState.mine!=='object')gameState.mine={};
    const m=gameState.mine;
    ['red','blue','monsters','crystals','relics','blocked'].forEach(k=>{if(!Array.isArray(m[k]))m[k]=[];});
    if(m.caveInWarning===undefined)m.caveInWarning=null;
    if(typeof m.bossDefeated!=='boolean')m.bossDefeated=false;
    if(typeof m.centralOpen!=='boolean')m.centralOpen=false;
    if(typeof m.lastCaveInTurn!=='number')m.lastCaveInTurn=0;
    return m;
}
function initMineMode(){
    const m=mineState();
    m.red=[];m.blue=[];m.monsters=[];m.blocked=[];
    m.caveInWarning=null;m.bossDefeated=false;m.centralOpen=false;m.lastCaveInTurn=0;
    m.crystals=MINE_CRYSTAL_TILES.map(p=>({x:p.x,y:p.y}));
    m.relics=MINE_RELIC_TILES.map(p=>({x:p.x,y:p.y}));
    m.monsters=(typeof levelState!=='undefined'&&levelState.active&&levelState.level)?[]:[
        createUnit('步兵',MINE_BOSS_TILE.x,MINE_BOSS_TILE.y,'monster',{layer:'mine',mineType:'蛇骨矿主',hp:4,boss:true,static:true}),
        createUnit('步兵',4,1,'monster',{layer:'mine',mineType:'骨蛇守卫',hp:2,static:true}),
        createUnit('步兵',6,3,'monster',{layer:'mine',mineType:'骨蛇守卫',hp:2,static:true}),
        createUnit('步兵',4,2,'monster',{layer:'mine',mineType:'矿兽',hp:1,beast:true}),
        createUnit('步兵',6,2,'monster',{layer:'mine',mineType:'矿兽',hp:1,beast:true})
    ];
    gameState.monsters.units=m.monsters;
    gameState.monsters.cmd=1;gameState.monsters.baseCmd=1;
}
function mineUnitsOf(side){
    if(!['red','blue'].includes(side))return [];
    return mineState()[side].filter(u=>!u.destroyed);
}
function mineAllUnits(){
    const m=mineState();
    return [...m.red,...m.blue,...m.monsters].filter(u=>!u.destroyed);
}
function mineUnitAt(x,y){return mineAllUnits().find(u=>u.x===x&&u.y===y)||null;}
function isMinePit(x,y){return y===2&&[0,2,5,8,10].includes(x);}
function mineShaftAt(x,y){return MINE_SHAFTS.find(s=>s.x===x&&s.y===y)||null;}
function isMineWall(x,y){
    if(x<0||x>=COLS||y<0||y>=ROWS)return true;
    if(gameState.mineOpenWalls&&gameState.mineOpenWalls.some(p=>p[0]===x&&p[1]===y))return false;
    if(MINE_WALLS.some(p=>p[0]===x&&p[1]===y))return true;
    return mineState().blocked.some(b=>b.x===x&&b.y===y&&b.until>=gameState.turn);
}
function mineLineClear(x0,y0,x1,y1){
    let x=x0,y=y0;
    const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;
    let err=dx+dy;
    for(let guard=0;guard<64;guard++){
        if(x===x1&&y===y1)return true;
        const e2=2*err;
        if(e2>=dy){err+=dy;x+=sx;}
        if(e2<=dx){err+=dx;y+=sy;}
        if(x===x1&&y===y1)return true;
        if(isMineWall(x,y))return false;
    }
    return true;
}
function mineVisionTiles(side){
    const set=new Set();
    for(const u of mineUnitsOf(side)){
        for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
            if(Math.max(Math.abs(dx),Math.abs(dy))>2)continue;
            const x=u.x+dx,y=u.y+dy;
            if(x<0||x>=COLS||y<0||y>=ROWS)continue;
            if(mineLineClear(u.x,u.y,x,y))set.add(x+','+y);
        }
    }
    const m=mineState();
    for(const s of MINE_SHAFTS)if(!s.central||m.centralOpen)set.add(s.x+','+s.y);
    m.crystals.forEach(p=>set.add(p.x+','+p.y));
    m.relics.forEach(p=>set.add(p.x+','+p.y));
    return set;
}
function mineUnitVisibleTo(side,u){
    if(!u||u.destroyed)return false;
    if(u.side===side)return true;
    if((u.revealedRound||0)>=gameState.turn)return true;
    return mineVisionTiles(side).has(u.x+','+u.y);
}
function humanViewSide(){
    if(!gameState.aiSide)return null;
    return gameState.aiSide==='blue'?'red':gameState.aiSide==='red'?'blue':null;
}
function isAiHiddenMine(u,side){
    return !!(gameState.aiSide && side===gameState.aiSide && u && u.type==='地雷');
}
function mineUndergroundCount(side){return mineUnitsOf(side).length;}
function mineCanDescend(u){
    if(gameState.gameMode!=='mine'||!u||u.destroyed||u.layer==='mine')return false;
    if(!['red','blue'].includes(u.side)||!isInfantryUnit(u))return false;
    if((u.chaos||0)>0||u.suppressed)return false;
    const shaft=mineShaftAt(u.x,u.y);
    if(!shaft)return false;
    if(shaft.central&&!mineState().centralOpen)return false;
    if(u.mineLayerMovedTurn===gameState.turn)return false;
    if(getPlayer(u.side).cmd<=0)return false;
    if(mineUnitAt(u.x,u.y))return false;
    return true;
}
function mineCanAscend(u){
    if(gameState.gameMode!=='mine'||!u||u.destroyed||u.layer!=='mine')return false;
    if(!['red','blue'].includes(u.side)||!isInfantryUnit(u))return false;
    if((u.chaos||0)>0||u.suppressed)return false;
    const shaft=mineShaftAt(u.x,u.y);
    if(!shaft)return false;
    if(shaft.central&&!mineState().centralOpen)return false;
    if(u.mineLayerMovedTurn===gameState.turn)return false;
    if(getPlayer(u.side).cmd<=0)return false;
    if(isBlockedTile(u.x,u.y,gameState.gameMode))return false;
    if(unitAt(u.x,u.y))return false;
    return true;
}
function mineDescend(u){
    if(!mineCanDescend(u))return false;
    const side=u.side;
    getPlayer(side).units=getPlayer(side).units.filter(x=>x!==u);
    u.layer='mine';u.mineLayerMovedTurn=gameState.turn;
    mineState()[side].push(u);
    getPlayer(side).cmd=Math.max(0,getPlayer(side).cmd-1);
    gameState.selectedUnitId=null;
    addLog(`⛏️ ${getFactionName(side)}${unitDisplayName(u)}从竖井进入矿洞`);pushSound('mine_descend');
    checkVictory();checkTurnEnd();renderAll();
    return true;
}
function mineAscend(u){
    if(!mineCanAscend(u))return false;
    const side=u.side;
    mineState()[side]=mineState()[side].filter(x=>x!==u);
    u.layer='ground';u.mineLayerMovedTurn=gameState.turn;
    getPlayer(side).units.push(u);
    getPlayer(side).cmd=Math.max(0,getPlayer(side).cmd-1);
    gameState.selectedUnitId=null;
    addLog(`⛏️ ${getFactionName(side)}${unitDisplayName(u)}从矿洞回到地面`);pushSound('mine_ascend');
    checkVictory();checkTurnEnd();renderAll();
    return true;
}
function mineMovePath(u,tx,ty){
    if(tx===u.x&&ty===u.y)return null;
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    const queue=[{x:u.x,y:u.y,path:[]}],seen=new Set([u.x+','+u.y]);
    while(queue.length){
        const cur=queue.shift();
        if(cur.path.length>=2)continue;
        for(const [dx,dy] of dirs){
            const nx=cur.x+dx,ny=cur.y+dy;
            if(nx<0||nx>=COLS||ny<0||ny>=ROWS||isMineWall(nx,ny))continue;
            const key=nx+','+ny;if(seen.has(key))continue;
            if(mineUnitAt(nx,ny))continue;
            seen.add(key);
            const path=cur.path.concat([{x:nx,y:ny}]);
            if(nx===tx&&ny===ty)return path;
            queue.push({x:nx,y:ny,path});
        }
    }
    return null;
}
function getMineActionTiles(u){
    if(!u||u.layer!=='mine')return [];
    if(!canUnitAct(u,u.side))return mineCanAscend(u)?[{x:u.x,y:u.y,type:'ascend'}]:[];
    const tiles=[],seen=new Set();
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        for(let step=1;step<=2;step++){
            const x=u.x+dx*step,y=u.y+dy*step;
            if(x<0||x>=COLS||y<0||y>=ROWS||isMineWall(x,y))break;
            const occ=mineUnitAt(x,y);
            if(occ){
                if(step===1&&occ.side!==u.side)tiles.push({x,y,type:'attack',target:occ});
                else if(step===1&&occ.side===u.side&&canHealTarget(u,occ))tiles.push({x,y,type:'heal',target:occ});
                break;
            }
            const key=x+','+y;
            if(!seen.has(key)){seen.add(key);tiles.push({x,y,type:'move'});}
        }
    }
    if(mineCanAscend(u))tiles.push({x:u.x,y:u.y,type:'ascend'});
    return tiles;
}
function mineGrantCard(side){
    const p=getPlayer(side);
    const used=new Set([...(p.library||[]),...(p.usedSkills||[])]);
    const avail=SKILL_LIBRARY.filter(c=>c.id!==510&&!used.has(c.id));
    if(!avail.length){p.sp+=1;addLog(`⛏️ ${getFactionName(side)}的遗物化作技能点 +1`);return null;}
    const card=avail[Math.floor(Math.random()*avail.length)];
    p.library.push(card.id);p.usedSkills.add(card.id);
    addLog(`⛏️ ${getFactionName(side)}获得一张技能卡`);
    return card;
}
function minePickups(u){
    if(!u||!['red','blue'].includes(u.side))return;
    const m=mineState();
    const ci=m.crystals.findIndex(p=>p.x===u.x&&p.y===u.y);
    if(ci>=0){m.crystals.splice(ci,1);getPlayer(u.side).sp+=2;pushSound('crystal');addLog(`💎 ${getFactionName(u.side)}拾取晶簇：技能点 +2`);}
    const ri=m.relics.findIndex(p=>p.x===u.x&&p.y===u.y);
    if(ri>=0){m.relics.splice(ri,1);mineGrantCard(u.side);pushSound('relic');addLog(`🏺 ${getFactionName(u.side)}在矿洞深处发现古代遗物`);}
}
function mineRemoveFromLayer(u){
    const m=mineState();
    ['red','blue','monsters'].forEach(k=>{m[k]=m[k].filter(x=>x!==u);});
    gameState.monsters.units=m.monsters;
}
function mineKill(victim,killer,options={}){
    if(!victim||victim.destroyed)return false;
    if(victim.side==='monster'){
        if(!options.direct&&(victim.hp||1)>1){
            victim.hp=(victim.hp||1)-1;victim.chaos=0;
            addLog(`⛏️ ${victim.mineType}受到重创（剩余 ${victim.hp} 点）`);
            return false;
        }
        victim.hp=0;victim.destroyed=true;
        mineRemoveFromLayer(victim);
        addLog(`⛏️ ${victim.mineType}被消灭`);pushSound(victim.boss?'mine_boss':'death');
        if(victim.barrel){
            const cells=[[victim.x+1,victim.y],[victim.x-1,victim.y],[victim.x,victim.y+1],[victim.x,victim.y-1]];
            for(const [bx,by] of cells){
                const v=mineUnitAt(bx,by);
                if(v){
                    damageUnit(v,killer,{combat:false,sourceSide:killer?killer.side:null});
                    addUnitChaos(v,1,killer?killer.side:null);
                    if(v.levelRole==='runner'&&gameState.minigameState)gameState.minigameState.cartWrecked=true;
                }
            }
            addLog('💣 炸药桶殉爆：十字范围内的单位被波及');
        }
        if(typeof levelOnUnitKilled==='function')levelOnUnitKilled(killer,victim);
        if(victim.boss&&killer&&['red','blue'].includes(killer.side)){
            mineState().bossDefeated=true;mineState().centralOpen=true;
            getPlayer(killer.side).sp+=3;
            mineGrantCard(killer.side);
            addLog(`👑 蛇骨矿主倒下！${getFactionName(killer.side)}技能点 +3，中央竖井开启`);
        }
        return true;
    }
    const side=victim.side;
    damageUnit(victim,killer,{combat:!options.direct,direct:!!options.direct,sourceSide:killer?killer.side:null});
    if(victim.destroyed){
        mineRemoveFromLayer(victim);
        addLog(`⛏️ ${getFactionName(side)}${unitDisplayName(victim)}在矿洞中倒下`);
    }
    return victim.destroyed;
}
function mineResolveCombat(att,def,options={}){
    if(!att||!def||att.destroyed||def.destroyed||att.side===def.side)return false;
    const n=finalAttackRoll(att,def);
    const result=resolveAttack(att,def,n);
    addLog(`⛏️ ${unitDisplayName(att)}与${unitDisplayName(def)}交战 点数:${n} → ${result.msg}`);
    if(result.selfChaos)addUnitChaos(att,1,def.side);
    if(result.chaos)addUnitChaos(def,1,att.side);
    if(result.attackerDestroyed)mineKill(att,def);
    if(result.destroyed||def.side==='monster')mineKill(def,att);
    att.revealedRound=gameState.turn+1;def.revealedRound=gameState.turn+1;
    if(options.monster){checkVictory();renderAll();}
    else completeUnitAction(att,att.side);
    return true;
}
function mineTryAttack(att,def){
    if(!canUnitAct(att,att.side)||!def||def.destroyed||def.side===att.side)return false;
    if(Math.abs(att.x-def.x)+Math.abs(att.y-def.y)!==1)return false;
    return mineResolveCombat(att,def);
}
function mineTryMove(u,tx,ty){
    if(!canUnitAct(u,u.side))return false;
    const path=mineMovePath(u,tx,ty);
    if(!path){addLog('矿洞中无法抵达该处');return false;}
    for(const p of path){u.x=p.x;u.y=p.y;}
    minePickups(u);
    addLog(`⛏️ ${getFactionName(u.side)}${unitDisplayName(u)}在矿洞中移动`);
    completeUnitAction(u,u.side);
    return true;
}
function onMineCellClick(side,x,y){
    if(gameState.gameMode!=='mine'||gameState.phase!=='ACTION'||gameState.activeSide!==side||gameState.turnPhase!=='ACTION'||gameState.gameOver)return;
    const sel=gameState.selectedUnitId?mineAllUnits().find(u=>u.id===gameState.selectedUnitId&&!u.destroyed):null;
    const clicked=mineUnitAt(x,y);
    if(sel&&sel.side===side&&sel.x===x&&sel.y===y){
        const ascend=getMineActionTiles(sel).find(t=>t.x===x&&t.y===y&&t.type==='ascend');
        if(ascend||mineCanAscend(sel)){mineAscend(sel);return;}
    }
    if(!sel){
        if(clicked&&clicked.side===side&&(canUnitAct(clicked,side,true)||mineCanAscend(clicked)))gameState.selectedUnitId=clicked.id;
        renderAll();return;
    }
    if(clicked&&clicked.side===side&&!(sel.x===x&&sel.y===y)&&!canHealTarget(sel,clicked)&&(canUnitAct(clicked,side,true)||mineCanAscend(clicked))){gameState.selectedUnitId=clicked.id;renderAll();return;}
    if(sel.x===x&&sel.y===y){gameState.selectedUnitId=null;renderAll();return;}
    const tile=getMineActionTiles(sel).find(t=>t.x===x&&t.y===y);
    if(!tile){addLog('目标不在矿洞行动范围内');return;}
    if(tile.type==='ascend'){mineAscend(sel);return;}
    if(tile.type==='heal'){tryRemoveChaos(sel,tile.target);return;}
    if(tile.type==='attack'){mineTryAttack(sel,tile.target);return;}
    if(tile.type==='move'){mineTryMove(sel,x,y);return;}
}
function mineBeastTurn(){
    const m=mineState();
    for(const beast of m.monsters.filter(u=>u.beast&&!u.destroyed&&(u.chaos||0)===0)){
        const enemies=[...m.red,...m.blue].filter(u=>!u.destroyed);
        if(!enemies.length)continue;
        enemies.sort((a,b)=>(Math.abs(a.x-beast.x)+Math.abs(a.y-beast.y))-(Math.abs(b.x-beast.x)+Math.abs(b.y-beast.y)));
        const target=enemies[0];
        if(!target)continue;
        if(Math.abs(target.x-beast.x)+Math.abs(target.y-beast.y)===1){mineResolveCombat(beast,target,{monster:true});continue;}
        const dirs=[[Math.sign(target.x-beast.x),0],[0,Math.sign(target.y-beast.y)]].filter(([dx,dy])=>dx||dy);
        for(const [dx,dy] of dirs){
            const nx=beast.x+dx,ny=beast.y+dy;
            if(nx<0||nx>=COLS||ny<0||ny>=ROWS||isMineWall(nx,ny)||mineUnitAt(nx,ny))continue;
            beast.x=nx;beast.y=ny;addLog('⛏️ 矿兽在黑暗中移动');break;
        }
    }
}
function mineTriggerCaveIn(){
    const m=mineState(),w=m.caveInWarning;
    if(!w)return;
    m.caveInWarning=null;pushSound('cave_in');
    for(const cell of w.cells){
        m.blocked.push({x:cell.x,y:cell.y,until:gameState.turn+3});
        const victim=mineUnitAt(cell.x,cell.y);
        if(victim){
            addLog(`⛏️ 塌方吞没了${victim.side==='monster'?victim.mineType:getFactionName(victim.side)+unitDisplayName(victim)}`);
            mineKill(victim,null,{direct:true});
        }
    }
    addLog(`⛏️ 矿洞塌方：${w.cells.map(c=>`(${c.x},${c.y})`).join('、')} 被封堵 3 回合`);
}
function mineScheduleCaveIn(){
    const m=mineState();
    if(m.caveInWarning)return;
    if(gameState.mineOpenWalls&&gameState.mineOpenWalls.length)return;
    const occupied=new Set(mineAllUnits().map(u=>u.x+','+u.y));
    const cart=m.red.find(u=>!u.destroyed&&u.levelRole==='runner');
    const candidates=[];
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        if(cart&&y===cart.y)continue;
        if(isMineWall(x,y))continue;
        if(MINE_SHAFTS.some(s=>s.x===x&&s.y===y))continue;
        if(MINE_CRYSTAL_TILES.some(p=>p.x===x&&p.y===y)||MINE_RELIC_TILES.some(p=>p.x===x&&p.y===y))continue;
        if(m.monsters.some(u=>!u.destroyed&&u.boss&&u.x===x&&u.y===y))continue;
        if(occupied.has(x+','+y))continue;
        candidates.push({x,y});
    }
    if(!candidates.length)return;
    for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
    const count=Math.min(candidates.length,1+Math.floor(Math.random()*2));
    const cells=candidates.slice(0,count);
    m.caveInWarning={cells,dueTurn:gameState.turn+1};
    m.lastCaveInTurn=gameState.turn;pushSound('collapse_warn');
    addLog(`⛏️ 矿洞深处传来碎石声：${cells.map(c=>`(${c.x},${c.y})`).join('、')} 将在下回合塌方`);
}
function mineCheckDeadline(){
    if(gameState.gameMode!=='mine'||gameState.gameOver||gameState.turn<ENDGAME_HARD_TURN)return false;
    const combat=u=>!u.destroyed&&!['地雷','防御工事','墓碑','鬼魂'].includes(u.type);
    const total=side=>getPlayer(side).units.filter(combat).length+mineUnitsOf(side).filter(combat).length;
    const ground=side=>getPlayer(side).units.filter(combat).length;
    let winner=null,reason='';
    if(total('red')!==total('blue')){winner=total('red')>total('blue')?'red':'blue';reason='存活单位数';}
    else if(ground('red')!==ground('blue')){winner=ground('red')>ground('blue')?'red':'blue';reason='地面单位数';}
    else if(getPlayer('red').sp!==getPlayer('blue').sp){winner=getPlayer('red').sp>getPlayer('blue').sp?'red':'blue';reason='技能点';}
    if(!winner){showVictory('蛇骨矿洞 · 第20回合平局');return true;}
    showVictory(`${getFactionName(winner)}胜利 · 第${gameState.turn}回合判定（${reason}）`);
    return true;
}
function mineOnRoundStart(){
    if(gameState.gameMode!=='mine')return;
    const m=mineState();
    m.blocked=m.blocked.filter(b=>b.until>=gameState.turn);
    if(m.caveInWarning&&m.caveInWarning.dueTurn<=gameState.turn)mineTriggerCaveIn();
    mineBeastTurn();
    if(gameState.gameOver)return;
    checkVictory();
    if(gameState.gameOver)return;
    if(gameState.turn>=ENDGAME_HARD_TURN && mineCheckDeadline())return;
    if(!m.caveInWarning&&gameState.turn>=3&&(gameState.turn-3)%4===0)mineScheduleCaveIn();
    m.blocked=m.blocked.filter(b=>b.until>=gameState.turn);
}

function getFactionName(side){
    if(side==='ghost') return '鬼魂';
    if(side==='imperial') return gameState.gameMode==='wannan'?'波斯远征军':'皇军';
    if(gameState.gameMode==='wannan') return side==='red'?'斯巴达':'雅典';
    return side==='red'?'红方':'蓝方';
}

/* 城邦裂变：三方名称与红/蓝颜色固定，不随事变改变。 */
function getFactionColor(side){
    return side==='red'?'red':'blue';
}

function hasActedThisTurn(unit,side){
    const acted=unit.lastActedTurn===gameState.turn && unit.lastActedSide===side;
    if(!acted) return false;
    if(unit.generatedBySkill) return true;
    if((unit.multiActionRemaining||0)>0) return false;
    if((unit.type==='炮兵' || unit.type==='海炮' || unit.permaBuffs?.includes('turret')) && (unit.remainingActions||0)>0) return false;
    return true;
}
/* 行动过的灰显只在轮到该方时显示；对方回合恢复原色，便于分辨红蓝。 */
function showActedThisTurn(unit,side){
    if((side==='red'||side==='blue') && side!==gameState.activeSide) return false;
    return hasActedThisTurn(unit,side);
}

function hasActedThisGame(unit){ return !!unit.hasActedEver; }
function markActed(unit,side){ unit.lastActedTurn=gameState.turn; unit.lastActedSide=side; unit.hasActedEver=true; }
function hasActionableUnits(side){
    if(getPlayer(side).units.some(unit=>canUnitAct(unit,side)&&canAffordAction(unit,side)))return true;
    if(gameState.gameMode==='mine'&&mineUnitsOf(side).some(unit=>canUnitAct(unit,side)&&canAffordAction(unit,side)))return true;
    return false;
}

// combat.js
    // v4.4 combat tables return flags. Shared mutation helpers apply each result once.
    function unitHasBuff(u,b){return !!u && (u.permaBuffs||[]).includes(b);}
    function unitHasTempBuff(u,b){return !!u && (u.tempBuffs||[]).includes(b);}
    function playerEffects(s){return getPlayer(s).tempEffects||{};}
    function lastingEffects(s){return getPlayer(s).lastingEffects||{};}
    function inBounds(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<COLS&&y>=0&&y<ROWS;}
    function isInfantryUnit(u){return ['步兵','后勤兵','二阶步兵'].includes(u.type);}
    function isRangedUnit(u){return u.type==='炮兵'||u.type==='海炮'||unitHasBuff(u,'turret');}
    function canAffordAction(u,s=u.side){
        if(u.generatedBySkill||u.createdBySkill) return getPlayer(s).cmd>0;
        return getPlayer(s).cmd>0||u.freeAction||(u.freeSecondAction&&u.multiActionRemaining===1);
    }
    function canUnitAct(u,s=u.side,allowChaos=false){
        if(!u||gameState.gameOver||u.side!==s||u.destroyed||u.suppressed||(!allowChaos&&(u.chaos||0)>0)) return false;
        if(u.type==='地雷'||u.type==='防御工事'&&!unitHasBuff(u,'turret')||['鬼魂','墓碑'].includes(u.type)) return false;
        if(isRangedUnit(u)&&(playerEffects(s).noArtillery||(u.remainingActions||0)<=0)) return false;
        const ai=gameState.aiActionUnitId===u.id&&(gameState.imperialActing||gameState.ghostActing);
        return (ai||!hasActedThisTurn(u,s))&&canAffordAction(u,s);
    }
    function completeUnitAction(u,s=u.side){
        const free=!(u.generatedBySkill||u.createdBySkill)&&(u.freeAction||u.freeSecondAction&&u.multiActionRemaining===1);
        if(!free)getPlayer(s).cmd=Math.max(0,getPlayer(s).cmd-1);
        u.freeAction=false;
        if((u.multiActionRemaining||0)>0)u.multiActionRemaining--;
        if(gameState.aiActionUnitId!==u.id)markActed(u,s);
        gameState.selectedUnitId=null;gameState.tideMode=null;gameState.actionInProgress=false;
        if(gameState.gameMode==='neon')neonPickup(u);
        checkVictory();
        if(!['GAME_OVER','VICTORY'].includes(gameState.phase))checkTurnEnd();
        renderAll();
    }
    function combatType(u){
        const e=lastingEffects(u.side);
        if(isInfantryUnit(u)&&e.infantryAsChariot)return '车';
        if(u.type==='车'&&e.chariotAsInfantry)return '步兵';
        if(u.type==='海炮')return '炮兵';
        if(u.type==='二阶步兵'&&(u.hp||0)<2)return '步兵';
        return u.type;
    }
    function rollDie(){return Math.floor(Math.random()*6)+1;}
    /* ── 通用终局加速 ──────────────────────────────────────────────
       第 15 回合起，攻击方点数 +1；第 17 回合起 +2；第 19 回合起 +3（封顶）。
       只加攻击、不加防御；双方与皇军/鬼魂对称；烽燧阵线保持不启用。
       第 20 回合仍未分出胜负时强制判定，仍持平判平局。 */
    const ENDGAME_BONUS_START=15;
    const ENDGAME_HARD_TURN=20;
    function endgameAttackBonus(){
        if(gameState.gameMode==='beacon') return 0;
        if(gameState.turn<ENDGAME_BONUS_START) return 0;
        return Math.min(3,1+Math.floor((gameState.turn-ENDGAME_BONUS_START)/2));
    }
    function endgameCenterUnits(side){
        const [zoneMin,zoneMax]=gameState.gameMode==='snow'?[5,5]:[4,6];
        return getAllUnits().filter(u=>!u.destroyed && u.side===side &&
            !['地雷','防御工事','墓碑','鬼魂'].includes(u.type) &&
            (u.layer||'ground')==='ground' && u.x>=zoneMin && u.x<=zoneMax).length;
    }
    function endgameCombatCount(side){
        return getAllUnits().filter(u=>!u.destroyed && u.side===side &&
            !['地雷','防御工事','墓碑','鬼魂'].includes(u.type) &&
            (u.layer||'ground')==='ground').length;
    }
    function genericTimeoutCheck(){
        // 城邦裂变是三方战局：波斯远征军仍在时暂不按红蓝计分收尾。
        if(gameState.gameMode==='wannan' && factionAlive('imperial')) return false;
        const rc=endgameCenterUnits('red'),bc=endgameCenterUnits('blue');
        if(rc!==bc){
            showVictory(`${rc>bc?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（中立区单位 ${rc}:${bc}）`);
            return true;
        }
        const ru=endgameCombatCount('red'),bu=endgameCombatCount('blue');
        if(ru!==bu){
            showVictory(`${ru>bu?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（存活单位 ${ru}:${bu}）`);
            return true;
        }
        const rs=getPlayer('red').sp||0,bs=getPlayer('blue').sp||0;
        if(rs!==bs){
            showVictory(`${rs>bs?'红方':'蓝方'}胜利 · 第${gameState.turn}回合判定（技能点 ${rs}:${bs}）`);
            return true;
        }
        showVictory('战局 · 第20回合平局');
        return true;
    }
    function calculateAttackRoll(att,def,modifier=0){
        const e=playerEffects(att.side),high=Number(unitHasBuff(att,'elite_infantry'))+Number(!!e.divineAttack),rolls=[];
        const attackRoll=()=>{let n=rollDie();rolls.push(n);for(let i=0;i<high;i++){const next=rollDie();rolls.push(next);n=Math.max(n,next);}return n;};
        let n=attackRoll();if(unitHasBuff(def,'elite_infantry'))n=Math.min(n,attackRoll());
        if(e.strictCheck&&n<=4)n=4;
        const endgameBonus=endgameAttackBonus();
        n+=Number(unitHasBuff(att,'elite_chariot'))+(e.attackBonus||0)+(att.tempAttackBonus||0)+(unitHasTempBuff(att,'kamikaze')?3:0)+(unitHasTempBuff(att,'blitzkrieg')?1:0)+(att.type==='二阶步兵'&&(att.hp||0)>=2?1:0)+(gameState.gameMode==='beacon'&&beaconTowerCount(att.side)>=2?1:0)+endgameBonus;
        if(gameState.gameMode==='neon'){
            if(neonEventActive('gravity'))n+=1;
            if(neonEventActive('emp')&&isRangedUnit(att))n-=1;
            if(neonTraitKey(att)==='railgun'&&def&&att.x===def.x)n+=1;
        }
        n-=((unitHasBuff(att,'battle_damaged')||unitHasBuff(att,'mechanical_wear'))?1:0)+(e.attackPenalty||0);n+=modifier;
        addLog(`🎲 投点:${rolls.join(',')} → 攻击点数:${n}${endgameBonus?`（终局+${endgameBonus}）`:''}`);return n;
    }
    function finalAttackRoll(att,def,cross=0,modifier=0){
        let n=calculateAttackRoll(att,def,modifier)+(def.chaos||0)+cross;
        n-=Number(unitHasBuff(def,'elite_chariot'))+Number(unitHasBuff(def,'armored'))+Number(def.type==='二阶步兵'&&(def.hp||0)>=2);
        n+=Number(unitHasBuff(def,'battle_damaged'));
        if(unitHasBuff(att,'rage'))n+=1;
        if(unitHasTempBuff(def,'precision_target'))n+=2;
        if(getPlayer(def.side).units.some(u=>!u.destroyed&&unitHasBuff(u,'trench')&&Math.abs(u.x-def.x)+Math.abs(u.y-def.y)===1))n-=1;
        if(getPlayer(att.side).units.some(u=>!u.destroyed&&(u.permaBuffs||[]).includes('command_car')))n+=1;
        if(gameState.gameMode==='neon'){
            if(neonEventActive('nanofog')&&def.x>=4&&def.x<=6)n-=1;
            if(neonShieldNear(def))n-=1;
            if(neonTraitKey(def)==='exo'&&!neonFlag(def,'exo')){
                neonMark(def,'exo');n-=1;
                addLog('🦾 外骨骼：首次受击，攻击点数 -1');
            }
        }
        return Math.max(1,n);
    }
    function registerReversal(u,sourceSide){
        if(!sourceSide||sourceSide===u.side)return;
        const e=playerEffects(sourceSide);if(!e.reversal)return;
        if(!(e.reversalTriggered instanceof Set))e.reversalTriggered=new Set();
        if(e.reversalTriggered.has(u.id))return;
        e.reversalTriggered.add(u.id);e.reversalCount=(e.reversalCount||0)+1;
        addLog(`反转：回合结束可解除一层混乱（${e.reversalCount}次）`);
    }
    function absorbArmor(u){
        if(!unitHasBuff(u,'armored'))return false;
        u.permaBuffs=u.permaBuffs.filter(b=>b!=='armored');addLog('🛡️ 装甲抵消本次判定，失去装甲属性');return true;
    }
    function addUnitChaos(u,n=1,sourceSide=null,options={}){
        if(!u||u.destroyed||n<=0)return false;
        if(gameState.gameMode==='neon'&&!options.ignoreNeon&&neonTraitKey(u)==='phase'&&!neonFlag(u,'phase')){
            neonMark(u,'phase');addLog('🛡️ 相位装甲：抵消本局首次混乱');return false;
        }
        if(options.combat&&absorbArmor(u))return false;
        u.chaos=(u.chaos||0)+n;pushSound('chaos');registerReversal(u,sourceSide);return true;
    }
    function reduceTier2HP(u){u.hp=(u.hp||2)-1;if(u.hp<=1){u.type='步兵';delete u.hp;u.chaos=0;}addLog('❤️ 二阶步兵受伤，变回普通步兵并清除混乱');}
    function damageUnit(u,killer=null,options={}){
        if(!u||u.destroyed)return false;
        if(u.levelRole==='runner'&&gameState.levelId==='snow-11'&&gameState.minigameState&&!options.ignoreGuard){
            const guard=getPlayer('red').units.find(v=>!v.destroyed&&v!==u&&v.type==='二阶步兵'&&Math.abs(v.x-u.x)+Math.abs(v.y-u.y)===1);
            if(guard){addLog('🛡️ 二阶步兵替雪橇挡下伤害');return damageUnit(guard,killer,Object.assign({},options,{ignoreGuard:true}));}
            if(gameState.minigameState.sledFast&&!gameState.minigameState.fastAbsorb){
                gameState.minigameState.fastAbsorb=true;addLog('💨 雪橇极速闪避，伤害 -1');return false;
            }
        }
        if(typeof levelOnUnitDamaged==='function')levelOnUnitDamaged(u,killer,options);
        if(options.combat&&absorbArmor(u))return false;
        if(unitHasBuff(u,'iron_wall')){u.permaBuffs=u.permaBuffs.filter(b=>b!=='iron_wall');addLog('铁壁防线：抵消一次消灭');return false;}
        if(!options.direct&&u.type==='二阶步兵'&&(u.hp||0)>=2){reduceTier2HP(u);return false;}
        if(!options.direct&&u.armoryType==='二阶战车'&&(u.hp||0)>=2){reduceTier2Chariot(u);return false;}
        if(gameState.gameMode==='neon'&&!options.ignoreNeon&&neonTraitKey(u)==='reactive'&&!neonFlag(u,'reactive')){
            neonMark(u,'reactive');u.chaos=(u.chaos||0)+2;
            addLog('🛡️ 反应装甲：抵消首次消灭，改为混乱 +2');pushSound('chaos');return false;
        }
        if(typeof levelShouldProtectLastUnit==='function'&&levelShouldProtectLastUnit(u)){
            addUnitChaos(u,1,options.sourceSide||(killer&&killer.side));
            addLog(`🛡️ 剧情保护：${unitDisplayName(u)}是最后的目标，任务未完成前无法被消灭`);
            return false;
        }
        registerReversal(u,options.sourceSide||(killer&&killer.side));
        if(gameState.gameMode==='neon')neonDropCarried(u);
        u.destroyed=true;pushSound('death');onEnemyKilled(killer,u,options.sourceSide);
        if(u.destroyed&&typeof levelOnUnitKilled==='function')levelOnUnitKilled(killer,u,options);
        return u.destroyed;
    }
    function moveAsideForReplacement(other,killed){
        if(!other||other.destroyed||other===killed)return;
        const tiles=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:killed.x+dx,y:killed.y+dy})).filter(p=>inBounds(p.x,p.y)&&!isBlockedTile(p.x,p.y,gameState.gameMode)&&!unitAt(p.x,p.y));
        tiles.sort((a,b)=>(Math.abs(a.x-other.x)+Math.abs(a.y-other.y))-(Math.abs(b.x-other.x)+Math.abs(b.y-other.y)));
        if(tiles.length){other.x=tiles[0].x;other.y=tiles[0].y;}
    }
    function onEnemyKilled(killer,killed,sourceSide=null){
        if(!killed||!killed.destroyed||killed.deathResolved)return;
        killed.deathResolved=true;const oldSide=killed.side,owner=sourceSide||(killer&&killer.side);
        if(killed.type==='地雷'&&killed.disguisedAs) addLog('🪤 伪装地雷被摧毁：这是一枚【伪装地雷】');
        if(killed.armoryType==='指挥车' && ['red','blue'].includes(oldSide)){
            if(gameState.gameMode==='neon'){
                const cp=getPlayer(oldSide);
                cp.nextTurnEffects=cp.nextTurnEffects||{};
                cp.nextTurnEffects.cmdBonus=(cp.nextTurnEffects.cmdBonus||0)+1;
                addLog('🎖️ 战术链路：指挥车阵亡，己方下回合指挥点 +1');
            }else{
                const cp=getPlayer(oldSide),ids=[];
                const affected=[...cp.units,...(gameState.gameMode==='mine'?mineUnitsOf(oldSide):[])];
                affected.forEach(u=>{if(!u.destroyed){addUnitChaos(u,1,oldSide);ids.push(u.id);}});
                cp.lastingEffects.commanderDeathChaos={turns:3,unitIds:ids};
                addLog('🎖️ 指挥车阵亡：己方所有单位 +1 混乱，三回合后消去');
            }
        }
        const capture=owner&&owner!==oldSide&&playerEffects(owner).captureOnKill&&!['鬼魂','墓碑','地雷'].includes(killed.type);
        if(killer&&!killer.destroyed&&killer!==killed&&unitHasBuff(killer,'elite_artillery')&&isRangedUnit(killer)){
            killer.remainingActions=(killer.remainingActions||0)+1;killer.hasAttacked=false;addLog('✨ 精锐炮兵消灭敌方，补充一次攻击');
        }
        if(capture){
            if(killed.layer==='mine'&&gameState.gameMode==='mine'&&['red','blue'].includes(oldSide)&&['red','blue'].includes(owner)){
                const m=mineState(); m[oldSide]=(m[oldSide]||[]).filter(u=>u!==killed); m[owner]=m[owner]||[];
                killed.side=owner;killed.destroyed=false;killed.deathResolved=false;killed.chaos=0;killed.spied=false;delete killed.originalSide;delete killed.originalOwner;
                killed.hasActedEver=true;killed.lastActedTurn=gameState.turn;killed.lastActedSide=owner;
                if(!m[owner].includes(killed))m[owner].push(killed);
            } else {
                getPlayer(oldSide).units=getPlayer(oldSide).units.filter(u=>u!==killed);
                killed.side=owner;killed.destroyed=false;killed.deathResolved=false;killed.chaos=0;killed.spied=false;delete killed.originalSide;delete killed.originalOwner;
                killed.hasActedEver=true;killed.lastActedTurn=gameState.turn;killed.lastActedSide=owner;
                if(!getPlayer(owner).units.includes(killed))getPlayer(owner).units.push(killed);
            }
            const ce=playerEffects(owner);
            if(ce.captureOnKill&&!ce.captureBonusGranted){
                ce.captureBonusGranted=true;getPlayer(owner).cmd++;
                ce.temporaryCmdBonus=(ce.temporaryCmdBonus||0)+1;
                addLog('缴获：首次转化成功，本回合指挥点+1');
            }
            addLog(`缴获：${killed.type}加入${getFactionName(owner)}`);return;
        }
        if(killed.type==='防御工事'&&unitHasBuff(killed,'trap')&&killer&&!killer.destroyed){
            triggerMine({x:killed.x,y:killed.y,type:'地雷',side:oldSide,destroyed:false},killer,killer.side,killer.x,killer.y);addLog('工程陷阱：攻击者触发一次踩雷判定');
        }
        const e=lastingEffects(oldSide),replacement=(killed.layer==='sky'||killed.layer==='mine')?null:e.tombstone&&isInfantryUnit(killed)?'防御工事':e.catapult&&killed.type==='车'?'步兵':null;
        if(replacement&&!isBlockedTile(killed.x,killed.y,gameState.gameMode)){
            const occ=unitAt(killed.x,killed.y);if(occ&&occ.unit===killer)moveAsideForReplacement(killer,killed);
            if(!unitAt(killed.x,killed.y)){
                const u=createUnit(replacement,killed.x,killed.y,oldSide,{generatedBySkill:true});getPlayer(oldSide).units.push(u);killed.replacementUnitId=u.id;
                if(!occ)moveAsideForReplacement(killer,killed);addLog(`${replacement==='防御工事'?'墓志铭':'弹射装置'}：原地生成${replacement}`);
            }
        }
        if(gameState.gameMode==='wannan'&&oldSide==='imperial'&&['red','blue'].includes(owner))onImperialUnitKilled(killer&&!killer.destroyed?killer:{side:owner,destroyed:false},killed);
    }
    function combatResult(kind){
        return {msg:({nothing:'💨无事发生',attacker_destroyed:'💀攻击方被消灭',attacker_chaos:'🌀攻击方混乱',defender_chaos:'🌀防御方混乱',defender_destroyed:'💀消灭防御方'})[kind],destroyed:kind==='defender_destroyed',chaos:kind==='defender_chaos',selfChaos:kind==='attacker_chaos',attackerDestroyed:kind==='attacker_destroyed'};
    }
    function getChariotCombatResult(type,n){
        if(n>6)return 'defender_destroyed';n=Math.max(1,n);
        if(type==='二阶步兵')return n<=2?'attacker_destroyed':n<=5?'defender_chaos':'defender_destroyed';
        if(type==='步兵'||type==='后勤兵')return n===1?'attacker_destroyed':n<=4?'defender_chaos':'defender_destroyed';
        if(type==='车')return n===1?'attacker_destroyed':n<=3?'attacker_chaos':n<=5?'defender_chaos':'defender_destroyed';
        if(type==='炮兵'||type==='海炮')return n===1?'attacker_destroyed':'defender_destroyed';
        if(type==='防御工事')return n===1?'attacker_chaos':'defender_destroyed';return 'nothing';
    }
    function resolveAttack(att,def,n){
        if(n>6)return Object.assign(combatResult('defender_destroyed'),{direct:true});n=Math.max(1,n);const a=combatType(att),d=combatType(def);
        if(a==='车')return combatResult(getChariotCombatResult(d,n));
        if(a==='二阶步兵'){
            if(d==='车')return combatResult(n===1?'attacker_destroyed':n<=4?'attacker_chaos':n===5?'defender_chaos':'defender_destroyed');
            if(d==='步兵'||d==='后勤兵')return combatResult(n<=2?'attacker_chaos':n<=4?'defender_chaos':'defender_destroyed');
            if(d==='炮兵')return combatResult(n<=2?'defender_chaos':'defender_destroyed');
            if(d==='防御工事')return combatResult('defender_destroyed');
            if(d==='二阶步兵')return combatResult(n===1?'attacker_destroyed':n<=3?'attacker_chaos':n<=5?'defender_chaos':'defender_destroyed');
        }
        if(a==='步兵'||a==='后勤兵'){
            if(d==='二阶步兵')return combatResult(n<=2?'attacker_destroyed':n<=4?'attacker_chaos':'defender_chaos');
            if(d==='步兵'||d==='后勤兵')return combatResult(n===1?'attacker_destroyed':n<=3?'attacker_chaos':n<=5?'defender_chaos':'defender_destroyed');
            if(d==='车')return combatResult(n<=2?'attacker_destroyed':n<=5?'attacker_chaos':'defender_chaos');
            if(d==='炮兵')return combatResult(n===1?'attacker_destroyed':n<=3?'defender_chaos':'defender_destroyed');
            if(d==='防御工事')return combatResult(n===1?'attacker_chaos':'defender_destroyed');
        }
        return combatResult('nothing');
    }
    function resolveArtilleryTable(att,def,n){
        if(n>6)return Object.assign(combatResult('defender_destroyed'),{direct:true});n=Math.max(1,n);const d=combatType(def),elite=unitHasBuff(att,'elite_artillery');
        if(d==='二阶步兵')return combatResult(n<=2?'nothing':n<=5?'defender_chaos':'defender_destroyed');
        if(d==='步兵'||d==='后勤兵')return combatResult(n===1&&!elite?'nothing':n<=4?'defender_chaos':'defender_destroyed');
        if(d==='车')return combatResult(n===1&&(!elite||unitHasBuff(def,'armored'))?'nothing':n<=5?'defender_chaos':'defender_destroyed');
        if(d==='炮兵')return combatResult(n<=2&&!elite?'nothing':'defender_destroyed');
        if(d==='防御工事')return combatResult(n===1&&!elite?'nothing':'defender_destroyed');return combatResult('nothing');
    }
    function recordPTSD(att,def){const e=playerEffects(att.side);if(e.ptsd&&isInfantryUnit(def)){if(!(e.ptsdUnits instanceof Set))e.ptsdUnits=new Set();e.ptsdUnits.add(def.id);}}
    function wannanCrossAttackEligible(att,def){
        if(gameState.gameMode!=='wannan'||gameState.incidentTriggered||!gameState.antiJapanesePeriod)return false;
        if(!att||!def||!['red','blue'].includes(att.side)||!['red','blue'].includes(def.side)||att.side===def.side)return false;
        if(['地雷','鬼魂','墓碑'].includes(att.type)||['地雷','鬼魂','墓碑'].includes(def.type))return false;
        return true;
    }
    function maybeWannanIncident(att,def){
        if(!wannanCrossAttackEligible(att,def))return;
        // 只有当前行动方的攻击才计摩擦；反击、自动反击不计。
        if(att.side!==gameState.activeSide)return;
        if(gameState.wannanIncidentPrompt)return;
        if(gameState.wannanPromptSuppressedRound===gameState.turn){
            gameState.wannanFriction=(gameState.wannanFriction||0)+1;
            addLog(`⚡ 红蓝交火：摩擦+1（${gameState.wannanFriction}/3）`);
            if(gameState.wannanFriction>=3){addLog('⚡ 摩擦达到3，城邦裂变自动发动');triggerWannanIncident(att.side);}
            return;
        }
        gameState.wannanIncidentPrompt={side:att.side,turn:gameState.turn};
        addLog(`⚡ ${getFactionName(att.side)}与对方交火：可点燃城邦裂变（等待选择）`);
    }
    function resolveWannanIncidentChoice(side,accept){
        const prompt=gameState.wannanIncidentPrompt;
        if(!prompt||prompt.side!==side||gameState.gameOver)return false;
        const previousName=getFactionName(side);
        gameState.wannanIncidentPrompt=null;
        if(accept){
            triggerWannanIncident(side);
            addLog(`⚡ ${previousName}选择点燃城邦裂变`);
        }else{
            gameState.wannanFriction=(gameState.wannanFriction||0)+1;
            gameState.wannanPromptSuppressedRound=gameState.turn;
            addLog(`⚡ ${previousName}暂不点燃城邦裂变：摩擦+1（${gameState.wannanFriction}/3）`);
            if(gameState.wannanFriction>=3){addLog('⚡ 摩擦达到3，城邦裂变自动发动');triggerWannanIncident(side);}
        }
        renderAll();
        return true;
    }
    function markBattleDamaged(u){
        if(!u||u.destroyed||combatType(u)!=='车'||unitHasBuff(u,'battle_damaged')||unitHasBuff(u,'mechanical_wear'))return false;
        if((u.hitsTaken||0)>=2||(u.attacksMade||0)>=6){
            u.permaBuffs=u.permaBuffs||[];u.permaBuffs.push('mechanical_wear');
            addLog(`⚙️ ${getFactionName(u.side)}${unitDisplayName(u)}累计${(u.hitsTaken||0)>=2?'受击两轮':'发动六次攻击'}，获得【机械磨损】`);
            return true;
        }
        return false;
    }
    function applyCombatOutcome(att,def,result,options={}){
        if(att&&!att.destroyed&&combatType(att)==='车'&&!options.counter){att.attacksMade=(att.attacksMade||0)+1;markBattleDamaged(att);}
        const source=options.sourceSide||att.side,x=def.x,y=def.y;
        const before={destroyed:!!def.destroyed,chaos:def.chaos||0,hp:def.hp};
        if(result.selfChaos)addUnitChaos(att,1,def.side,{combat:true});
        if(result.attackerDestroyed)damageUnit(att,def,{combat:true,sourceSide:def.side});
        if(result.chaos)addUnitChaos(def,1,source,{combat:true});
        if(result.destroyed)damageUnit(def,att,{combat:true,direct:!!result.direct,sourceSide:source});
        const tookHit=!!def&&(def.destroyed!==before.destroyed||(def.chaos||0)!==before.chaos||def.hp!==before.hp);
        if(tookHit&&combatType(def)==='车'){def.hitsTaken=(def.hitsTaken||0)+1;markBattleDamaged(def);}
        if(options.occupy&&def.destroyed&&!att.destroyed&&!unitAt(x,y)&&!isBlockedTile(x,y,gameState.gameMode)){att.x=x;att.y=y;}
        if(unitHasTempBuff(att,'kamikaze')&&!att.destroyed)damageUnit(att,null,{direct:true});
        if(!options.counter&&!att.destroyed&&!def.destroyed&&att.side!==def.side&&playerEffects(def.side).autoCounter&&!unitHasTempBuff(att,'smoke_screen')){
            const n=finalAttackRoll(def,att),counter=isRangedUnit(def)?resolveArtilleryTable(def,att,n):resolveAttack(def,att,n);
            addLog(`闪电反击 点数:${n} → ${counter.msg}`);applyCombatOutcome(def,att,counter,{counter:true});
        }
    }
    function triggerMine(mine,u,side,mx,my){
        if(!mine||mine.destroyed||!u||u.destroyed)return 'nothing';const n=rollDie();mine.destroyed=true;pushSound('mineboom');
        if(mine.disguisedAs) addLog('🪤 伪装地雷暴露：这是一枚【伪装地雷】');
        let result='nothing';
        if(unitHasBuff(u,'minesweeper'))result=n===1?'chaos':'nothing';
        else if(unitHasBuff(u,'mine_resist'))result=n===1?'destroyed':n===2?'chaos':'nothing';
        else if(u.type==='二阶步兵'&&(u.hp||0)>=2){if(n<=2){reduceTier2HP(u);result='hp';}else if(n===3)result='chaos';}
        else if(u.type==='步兵'||u.type==='后勤兵')result=n<=3?'destroyed':n===4?'chaos':'nothing';
        else if(u.type==='车')result=n<=4?'destroyed':'nothing';
        if(result==='destroyed')damageUnit(u,null,{direct:true,sourceSide:mine.side});
        if(result==='chaos')addUnitChaos(u,1,mine.side);
        addLog(`💥 ${u.type}踩雷(${mx},${my}) 点数:${n} → ${{destroyed:'消灭',chaos:'混乱',hp:'HP减一',nothing:'无事发生'}[result]}`);
        return u.destroyed?'destroyed':result==='chaos'?'chaos':'nothing';
    }
    function getMineAffectingTile(u,x,y){
        if(neonEventActive('blackout'))return null;
        return getAllUnits().find(m=>!m.destroyed&&m.side!==u.side&&m.type==='地雷'&&(m.x===x&&m.y===y||(unitHasBuff(m,'sensor_mine')||unitHasBuff(m,'large_trigger'))&&Math.abs(m.x-x)<=(m.sensorRange||1)&&Math.abs(m.y-y)<=(m.sensorRange||1)))||null;
    }
    function canEnterTile(u,x,y){if(!inBounds(x,y))return false;if(gameState.gameMode==='pirate'&&u.boarded&&isPirateWaterTile(x,y))return !isPirateBlockedTile(x,y);return !isBlockedTile(x,y,gameState.gameMode);}
    function pathTo(u,tx,ty){
        if(!inBounds(tx,ty)||u.x!==tx&&u.y!==ty||u.x===tx&&u.y===ty)return [];
        const dx=Math.sign(tx-u.x),dy=Math.sign(ty-u.y),path=[];
        for(let x=u.x+dx,y=u.y+dy;x!==tx+dx||y!==ty+dy;x+=dx,y+=dy)path.push({x,y});return path;
    }
    function getChariotMoveableTiles(u){
        const tiles=[],water=gameState.gameMode==='pirate'&&u.boarded&&isPirateWaterTile(u.x,u.y),boat=gameState.gameMode==='pirate'&&u.boarded&&isPirateBoatPoint(u.x,u.y),
            skillLimit=lastingEffects(u.side).chariotMoveLimit||Infinity,
            weatherLimit=snowChariotLimit();
        let limit=Math.min(skillLimit,weatherLimit);
        if(gameState.gameMode==='neon')limit=Math.min(limit,neonEventActive('gravity')?2:3);
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
            if(water&&dy!==0)continue;let mine=null;
            for(let step=1;step<=limit;step++){
                const x=u.x+dx*step,y=u.y+dy*step;if(!canEnterTile(u,x,y))break;
                const inSea=water||(boat&&dx===(u.x===3?1:-1));
                const wind=gameState.pirateWind||0;
                const seaLimit=Math.max(1,2+(dx===wind?1:0)-(dx===-wind?1:0));
                if(inSea&&step>Math.min(seaLimit,limit))break;
                const occ=unitAt(x,y);
                if(occ&&occ.unit.type==='地雷'){if(occ.side!==u.side&&!mine)mine=occ.unit;tiles.push({x,y,type:'move',hasMineOnPath:!!mine,mine});continue;}
                if(occ&&!(gameState.gameMode==='fog'&&occ.unit.type==='鬼魂')){
                    if(occ.side!==u.side&&(!water||occ.unit.boarded&&isPirateWaterTile(x,y)))tiles.push({x,y,type:mine?'attack_blocked_by_mine':'attack',target:occ.unit,hasMineOnPath:!!mine,mine});break;
                }
                tiles.push({x,y,type:'move',hasMineOnPath:!!mine,mine});
            }
        }
        return tiles;
    }
    function isValidChariotMove(u,x,y){return getChariotMoveableTiles(u).some(t=>t.x===x&&t.y===y);}
    function getFirstEnemyMineOnPath(u,x,y){for(const p of pathTo(u,x,y)){const m=getMineAffectingTile(u,p.x,p.y);if(m)return m;}return null;}
    function getFirstEnemyOnPath(u,x,y){for(const p of pathTo(u,x,y)){const occ=unitAt(p.x,p.y);if(occ&&occ.side!==u.side&&occ.unit.type!=='地雷')return occ.unit;}return null;}
    function getStopPosition(u,e){return {x:e.x-Math.sign(e.x-u.x),y:e.y-Math.sign(e.y-u.y)};}
    function updateBoarding(u){
        if(gameState.gameMode!=='pirate')return;
        if(!u.boarded&&hasBoatAt(u.x,u.y)){u.boarded=true;const boat=gameState.pirateBoatPoints.find(p=>p.x===u.x&&p.y===u.y&&!p.used);if(boat)boat.used=true;pushSound('board');addLog('⛵ 登船');}
        else if(u.boarded&&!isPirateWaterTile(u.x,u.y)&&!isPirateBoatPoint(u.x,u.y)){u.boarded=false;addLog('⛵ 上岸');}
    }
    function chariotMove(u,tx,ty){
        if(!canUnitAct(u,u.side)||!isValidChariotMove(u,tx,ty))return false;
        const destination=unitAt(tx,ty);if(destination&&destination.side===u.side&&destination.unit.type==='地雷'){addLog('不能停在己方地雷上');return false;}
        if(destination&&destination.side!==u.side&&destination.unit.type!=='地雷'&&(unitHasTempBuff(destination.unit,'smoke_screen')||u.spied&&destination.side===u.originalSide))return false;
        for(const p of pathTo(u,tx,ty)){
            const occ=unitAt(p.x,p.y);if(occ&&occ.unit.type!=='地雷'&&occ.unit.type!=='鬼魂'){if(occ.side!==u.side)return chariotAttack(u,occ.unit);return false;}
            u.x=p.x;u.y=p.y;holyPickupDragonMarks();if(gameState.gameMode==='neon')neonPickup(u);const mine=getMineAffectingTile(u,p.x,p.y);
            if(mine){triggerMine(mine,u,u.side,p.x,p.y);updateBoarding(u);completeUnitAction(u,u.side);return true;}
            if(gameState.gameMode==='fog'&&getGhost().units.some(g=>g.type==='鬼魂'&&!g.destroyed&&g.x===p.x&&g.y===p.y)){triggerGhostEncounter(u,p.x,p.y);if(u.destroyed||u.chaos>0)break;}
        }
        addLog(`${getFactionName(u.side)}${u.type}移动至(${u.x},${u.y})`);pushSound('move');updateBoarding(u);completeUnitAction(u,u.side);return true;
    }
    function chariotAttack(u,def){
        if(!canUnitAct(u,u.side)||def.destroyed||def.side===u.side)return false;
        if(def.type==='地雷')return chariotMove(u,def.x,def.y);
        if(def.type==='鬼魂')return chariotMove(u,def.x,def.y);
        if(unitHasTempBuff(def,'smoke_screen')||u.spied&&def.side===u.originalSide){addLog('该目标本回合不可攻击');return false;}
        if(!isValidChariotMove(u,def.x,def.y))return false;
        // 若路径上还有更近的敌军，先处理它；否则“先避雷再前进”会在 障碍+远处地雷 时互相递归。
        const firstEnemy=getFirstEnemyOnPath(u,def.x,def.y);
        if(firstEnemy&&firstEnemy!==def)return chariotAttack(u,firstEnemy);
        const mine=getFirstEnemyMineOnPath(u,def.x,def.y);
        if(mine&&!u._mineReroute){
            // 感应雷可能不在直线上：绕行时若又撞到同一目标，第二次直接结算，避免无限递归。
            u._mineReroute=true;
            try{return chariotMove(u,def.x,def.y);}finally{delete u._mineReroute;}
        }
        const stop=getStopPosition(u,def);u.x=stop.x;u.y=stop.y;if(gameState.gameMode==='neon')neonPickup(u);return performUnitAttack(u,def,{occupy:true,finish:true});
    }
    function isFortificationLike(occ,s){return occ&&occ.side===s&&(occ.unit.type==='防御工事'||lastingEffects(s).infantryChariotSynergy&&occ.unit.type==='车');}
    function canTurnMoveViaFortification(u,x,y,s){
        if(!isInfantryUnit(u)||!canEnterTile(u,x,y))return false;
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
            const fx=u.x+dx,fy=u.y+dy;if(!isFortificationLike(unitAt(fx,fy),s)||Math.abs(x-fx)+Math.abs(y-fy)!==1||x===u.x&&y===u.y)continue;
            const occ=unitAt(x,y);if(!occ||occ.side!==s&&occ.unit.type==='地雷'||gameState.gameMode==='fog'&&occ.unit.type==='鬼魂')return true;
        }return false;
    }
    function canCrossFortificationAttack(u,x,y,s){
        if(!isInfantryUnit(u))return false;
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
            if(x!==u.x+dx*2||y!==u.y+dy*2)continue;const target=unitAt(x,y);
            if(isFortificationLike(unitAt(u.x+dx,u.y+dy),s)&&target&&target.side!==s&&target.unit.type!=='地雷')return true;
        }return false;
    }
    function sendPirateUnitToDeck(unit){
        if(!unit||unit.destroyed)return false;
        const tiles=[];
        for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
            if(isPirateWaterTile(x,y)||isPirateBoatPoint(x,y))continue;
            if(canEnterTile(unit,x,y)&&!unitAt(x,y))tiles.push({x,y});
        }
        tiles.sort((a,b)=>(Math.abs(a.x-unit.x)+Math.abs(a.y-unit.y))-(Math.abs(b.x-unit.x)+Math.abs(b.y-unit.y)));
        if(tiles.length){unit.x=tiles[0].x;unit.y=tiles[0].y;unit.boarded=false;return true;}
        damageUnit(unit,null,{direct:true});unit.boarded=false;return false;
    }
    function resolveShipCollision(att,def){
        const n=rollDie();
        let message=`⛵ 船只相撞 点数:${n}`;
        if(n===1){damageUnit(att,def,{direct:true});message+=' → 攻击方落水消灭';}
        else if(n===6){damageUnit(def,att,{direct:true});message+=' → 防守方落水消灭';}
        else if(n<=3){
            sendPirateUnitToDeck(att);sendPirateUnitToDeck(def);
            if(!att.destroyed)addUnitChaos(att,1,def.side);
            if(!def.destroyed)addUnitChaos(def,1,att.side);
            message+=' → 双方混乱并返回甲板';
        }else{
            sendPirateUnitToDeck(def);
            if(!def.destroyed)addUnitChaos(def,1,att.side);
            message+=' → 防守方混乱并返回甲板';
        }
        addLog(message);
    }
    function resolveGraveAttack(att,def,ranged=false){
        pushSound('grave');
        const n=rollDie();let kind;
        if(ranged)kind=n===1?'nothing':n<=5?'grave_chaos':'defender_destroyed';
        else if(combatType(att)==='车')kind=n===1?'attacker_destroyed':n<=5?'grave_chaos':'defender_destroyed';
        else if(combatType(att)==='二阶步兵')kind=n<=3?'attacker_chaos':n<=5?'grave_chaos':'defender_destroyed';
        else kind=n===1?'attacker_destroyed':n<=3?'attacker_chaos':n<=5?'grave_chaos':'defender_destroyed';
        if(kind==='grave_chaos'){
            def.destroyed=true;gainSoul(att.side,1);
        }else{
            applyCombatOutcome(att,def,combatResult(kind),{occupy:!ranged,counter:true});
            if(def.destroyed)gainSoul(att.side,1);
        }
        addLog(`🪦 攻击墓碑 点数:${n} → ${kind==='grave_chaos'?'墓碑消失':combatResult(kind).msg}${def.destroyed?'，凝魂+1':''}`);
    }
    function performUnitAttack(att,def,options={}){
        if(gameState.gameMode==='wannan'&&gameState.minigameState&&gameState.minigameState.fakeAlliance&&!gameState.incidentTriggered&&gameState.turn<=2&&['red','blue'].includes(att.side)&&['red','blue'].includes(def.side)&&att.side!==def.side){addLog('假面同盟：前两阵不能互相攻击');return false;}
        if(gameState.levelId==='holy-12'){
            if((att.layer==='sky')!==(def.layer==='sky')){addLog('空陆隔离：地面与天空不能互相攻击');return false;}
            if((def.permaBuffs||[]).includes('aa_tower')&&att.type!=='二阶步兵'){addLog('防空塔只能由地面二阶步兵拆除');return false;}
        }
        if(unitHasTempBuff(def,'smoke_screen')){addLog('烟雾弹：本回合不能攻击该单位');return false;}
        if(att.spied&&def.side===att.originalSide){addLog('间谍单位不能攻击其原阵营');return false;}
        const ship=gameState.gameMode==='pirate'&&att.boarded&&def.boarded&&isPirateWaterTile(def.x,def.y);
        if(ship)resolveShipCollision(att,def);
        else if(gameState.gameMode==='pirate'&&att.boarded&&isPirateWaterTile(att.x,att.y)){addLog('船上只能攻击海水中的敌方船只');return false;}
        else if(gameState.gameMode==='fog'&&def.type==='墓碑')resolveGraveAttack(att,def,false);
        else{
            maybeWannanIncident(att,def);recordPTSD(att,def);
            const n=combatType(att)==='二阶步兵'&&combatType(def)==='防御工事'?6:finalAttackRoll(att,def,options.crossBonus||0,options.modifier||0);
            const result=isRangedUnit(att)&&options.forced?resolveArtilleryTable(att,def,n):resolveAttack(att,def,n);
            addLog(`${att.type}攻击${def.type} 点数:${n} → ${result.msg}`);applyCombatOutcome(att,def,result,{occupy:!!options.occupy,counter:!!options.counter});
        }
        if(options.finish)completeUnitAction(att,att.side);return true;
    }
    function forcedSkillAttack(att,def,modifier=-1){
        if(!att||!def||att.destroyed||def.destroyed||att===def||def.type==='地雷')return false;
        const result=performUnitAttack(att,def,{modifier,forced:true});checkVictory();renderAll();return result;
    }
    function resolveArtilleryAttack(att,x,y,options={}){
        if(!canUnitAct(att,att.side)){gameState.actionInProgress=false;return false;}
        const target=unitAt(x,y);
        const validGrenadier=options.grenadier ? (target&&canGrenadierTarget(att,target.unit)) : (target&&canArtilleryTarget(att,target.unit));
        if(!validGrenadier){gameState.actionInProgress=false;addLog(options.grenadier?'掷弹兵目标无效：需要相邻友军正后方直线上无阻挡的敌军':'炮兵目标无效：目标须为可攻击的已行动敌方单位');return false;}
        recordPTSD(att,target.unit);
        maybeWannanIncident(att,target.unit);
        if(gameState.gameMode==='fog'&&target.unit.type==='墓碑')resolveGraveAttack(att,target.unit,true);
        else{
            const mg=gameState.minigameState||{};
            if(unitHasBuff(att,'coconut')){
                if((mg.cannonLoaded||0)<=0){addLog('🥥 重炮尚未装填，无法开火');gameState.actionInProgress=false;return false;}
                mg.cannonLoaded--;mg.cannonShots=(mg.cannonShots||0)+1;mg.shotTurns=mg.shotTurns||[];mg.shotTurns.push(gameState.turn);
                att.remainingActions=Math.max(0,3-mg.cannonShots);
            }
            let n=unitHasBuff(att,'coconut')?rollDie()+4:finalAttackRoll(att,target.unit);
            if(unitHasBuff(att,'coconut'))addLog('🥥 重炮开火：1d6+4');
            let result=unitHasBuff(att,'turret')?resolveAttack({type:'步兵',side:att.side,permaBuffs:[]},target.unit,n):resolveArtilleryTable(att,target.unit,n);
            const e=playerEffects(att.side);
            if(e.artilleryReroll&&!result.destroyed&&!result.chaos&&!result.selfChaos&&!result.attackerDestroyed){e.artilleryReroll=false;n=finalAttackRoll(att,target.unit);result=resolveArtilleryTable(att,target.unit,n);addLog('让子弹飞：无事发生，重新投点');}
            addLog(`💣 轰击(${x},${y}) 点数:${n} → ${result.msg}`);applyCombatOutcome(att,target.unit,result,{occupy:false});
            if(unitHasBuff(att,'coconut')){
                if(target.unit.destroyed)mg.cannonHits=(mg.cannonHits||0)+1;
                const cross=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
                let hit=0;
                for(const [cx,cy] of cross){
                    const v=unitAt(cx,cy);
                    if(v&&!v.unit.destroyed&&!['地雷','鬼魂'].includes(v.unit.type)){
                        damageUnit(v.unit,att,{combat:false,sourceSide:att.side});
                        addUnitChaos(v.unit,1,att.side);hit++;
                    }
                }
                addLog(`🥥 重炮十字轰击：中心 + 四向，共影响 ${hit+1} 格（含己方）`);
            }
            if(gameState.gameMode==='neon'&&options.grenadier){
                const splash=getAllUnits().filter(v=>!v.destroyed&&v!==target.unit&&v.side!==att.side&&(v.layer||'ground')==='ground'&&
                    !['地雷','鬼魂'].includes(v.type)&&Math.abs(v.x-x)<=1&&Math.abs(v.y-y)<=1);
                splash.forEach(v=>addUnitChaos(v,1,att.side));
                if(splash.length)addLog(`💥 微型导弹：3×3 波及 ${splash.length} 个敌方单位，混乱 +1`);
            }
        }
        if(unitHasBuff(att,'coconut')){completeUnitAction(att,att.side);return true;}
        if(options.grenadier)att.grenadierUsed=true;
        else{
            att.remainingActions=Math.max(0,(att.remainingActions||1)-1);att.hasAttacked=att.remainingActions===0;
            if(att.remainingActions===0&&!att.destroyed&&!unitHasBuff(att,'turret')){
                const oldX=att.x,oldY=att.y;att.type='步兵';delete att.armoryType;delete att.hp;delete att.remainingActions;delete att.hasAttacked;att.permaBuffs=att.permaBuffs.filter(b=>b!=='elite_artillery');
                const dir=att.side==='red'?1:att.side==='blue'?-1:0;
                if(dir)for(let i=1;i<=2;i++){
                    const nx=oldX+dir*i;if(!canEnterTile(att,nx,oldY))break;const occ=unitAt(nx,oldY);if(occ&&(occ.unit.type!=='地雷'||occ.side===att.side))break;
                    att.x=nx;holyPickupDragonMarks();const mine=getMineAffectingTile(att,nx,oldY);if(mine){triggerMine(mine,att,att.side,nx,oldY);break;}
                }
                addLog(`炮兵变为步兵，向前移动${Math.abs(att.x-oldX)}格`);
            }
        }
        completeUnitAction(att,att.side);return true;
    }
    function showCannonball(fx,fy,tx,ty,callback){
        pushFx({type:'cannon',from:{x:fx,y:fy},to:{x:tx,y:ty}});
        if(callback)callback();
    }
    function simulateArtilleryAttack(x,y){
        const side=gameState.activeSide,target=unitAt(x,y),att={type:'炮兵',side,permaBuffs:[],tempBuffs:[]};
        if(!target||!getEnemyFactions(side,'skill').includes(target.side)||target.unit.type==='地雷'){addLog(`🎯 火力支援(${x},${y}) → 无有效敌方单位`);renderAll();return;}
        if(unitHasTempBuff(target.unit,'smoke_screen')){addLog('烟雾弹抵消火力支援');return;}
        let n=finalAttackRoll(att,target.unit),result=resolveArtilleryTable(att,target.unit,n);
        const eff=playerEffects(side);
        if(eff.artilleryReroll&&!result.destroyed&&!result.chaos&&!result.selfChaos&&!result.attackerDestroyed){eff.artilleryReroll=false;n=finalAttackRoll(att,target.unit);result=resolveArtilleryTable(att,target.unit,n);addLog('让子弹飞：火力支援无事发生，重新投点');}
        pushSound('cannon');
        addLog(`🎯 火力支援 点数:${n} → ${result.msg}`);recordPTSD(att,target.unit);applyCombatOutcome(att,target.unit,result,{occupy:false});checkVictory();renderAll();
    }

// skills.js
    // A skill remains a transaction until its last target is selected.
    const skillAlive = occ => !!occ && !occ.unit.destroyed;
    const skillAlly = occ => skillAlive(occ) && occ.side === gameState.activeSide;
    const skillEnemy = occ => skillAlive(occ) && getEnemyFactions(gameState.activeSide,'skill').includes(occ.side);
    const skillAny = occ => skillAlly(occ) || skillEnemy(occ);
    const chaosFilter = occ => skillAny(occ) && (occ.unit.chaos || 0) > 0;
    const allyChaosFilter = occ => skillAlly(occ) && (occ.unit.chaos || 0) > 0;
    const skillInfantry = occ => skillAlly(occ) && isInfantryUnit(occ.unit);
    const skillEmpty = (occ,pos) => !occ && skillTileAvailable(pos.x,pos.y);
    const skillOwnTile = (occ,pos) => skillEmpty(occ,pos) && isInTerritory(pos.x,pos.y,gameState.activeSide,gameState.gameMode);
    const skillEnemyTile = (occ,pos) => skillEmpty(occ,pos) && getEnemyFactions(gameState.activeSide,'skill').some(side => isInTerritory(pos.x,pos.y,side,gameState.gameMode));
    const SKILL_FILTERS = {
        1:occ => skillAlly(occ) && ['炮兵','海炮'].includes(occ.unit.type),
        2:skillInfantry, 3:occ => skillAlly(occ) && occ.unit.type==='车',
        4:skillEmpty,5:()=>true,8:skillEnemyTile,9:occ => skillAlly(occ) && isInfantryUnit(occ.unit),
        10:skillAlly,13:skillEnemy,15:skillEnemy,16:skillEnemyTile,17:skillEmpty,
        19:occ => skillAlly(occ) && isInfantryUnit(occ.unit),22:skillOwnTile,
        34:occ => skillEnemy(occ) && occ.unit.type==='车',37:skillAny,
        42:occ => skillAlly(occ) && occ.unit.type==='车' && (occ.unit.chaos||0)===0 && !occ.unit.suppressed,44:skillEnemy,
        46:occ => skillAlly(occ) && isInfantryUnit(occ.unit),
        52:occ => skillAlly(occ) && occ.unit.type==='防御工事',
        53:occ => skillAlly(occ) && occ.unit.type==='防御工事',55:skillEnemy,
        61:occ => skillAlly(occ) && occ.unit.type==='地雷',62:allyChaosFilter,63:skillEnemy,64:()=>true,
        66:skillAlly,67:occ => skillEnemy(occ) && (occ.unit.chaos || 0)>0,69:skillEnemy,71:skillEnemy,
        72:skillOwnTile,74:skillEnemy,75:occ => skillAny(occ) && occ.unit.type==='后勤兵',
        77:occ => skillAlly(occ) && isInfantryUnit(occ.unit),78:skillOwnTile,
        80:(occ,pos) => !occ && skillTileAvailable(pos.x,pos.y) && getPlayer(gameState.activeSide).units.some(u => u.destroyed && u.x===pos.x && u.y===pos.y),
        81:occ => skillAlly(occ) && !['地雷','防御工事','鬼魂','墓碑'].includes(occ.unit.type) && (occ.unit.chaos||0)===0 && !occ.unit.suppressed,82:skillAlly,
        84:occ => skillAlly(occ) && occ.unit.type==='地雷',
        85:occ => skillAlly(occ) && isInfantryUnit(occ.unit),
        86:occ => skillEnemy(occ) && occ.unit.type==='车',88:occ => skillAlly(occ) && occ.unit.type==='防御工事',
        95:occ => skillAlly(occ) && ['炮兵','海炮'].includes(occ.unit.type),96:allyChaosFilter,97:skillAlly
    };
    function skillTileAvailable(x,y) {
        return x>=0 && x<COLS && y>=0 && y<ROWS && !isBlockedTile(x,y,gameState.gameMode) && !(gameState.gameMode==='pirate' && isPirateBoatPoint(x,y));
    }
    function skillClone(value) {
        if(value instanceof Set) return new Set([...value].map(skillClone));
        if(Array.isArray(value)) return value.map(skillClone);
        if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,skillClone(v)]));
        return value;
    }
    function skillPlayers() { return ['red','blue','imperial','ghost'].map(side=>({side,player:getPlayer(side)})).filter(({player})=>player && Array.isArray(player.units)); }
    function skillEnemies(side=gameState.activeSide) { return getEnemyFactions(side,'skill').map(enemySide=>({side:enemySide,player:getPlayer(enemySide)})); }
    function skillOwner(unit) {
        if(!unit) return undefined;
        const owner=skillPlayers().find(({player})=>player.units.includes(unit));
        if(owner) return owner;
        if(gameState.gameMode==='mine'&&unit.layer==='mine'&&['red','blue'].includes(unit.side)){
            const bucket=mineState()[unit.side]||[];
            if(bucket.includes(unit)) return {side:unit.side,player:getPlayer(unit.side)};
        }
        return undefined;
    }
    function skillUnitLayer(u){ return u&&u.layer==='mine'?'mine':'ground'; }
    function removeSkillUnit(u) {
        if(!u) return;
        if(gameState.gameMode==='neon')neonDropCarried(u);
        u.destroyed=true;
        if(skillUnitLayer(u)==='mine') mineRemoveFromLayer(u);
    }
    function addSkillBuff(unit,buff,temporary=false) {
        const key=temporary?'tempBuffs':'permaBuffs'; unit[key]=unit[key] || []; if(!unit[key].includes(buff)) unit[key].push(buff);
    }
    function spawnSkillUnit(type,pos,side,extra={}) {
        if(gameState.gameMode==='pirate' && type==='炮兵') type='海炮';
        const layer=(pos&&pos.layer==='mine'&&gameState.gameMode==='mine'&&['red','blue'].includes(side))?'mine':'ground';
        const unit=createUnit(type,pos.x,pos.y,side,{generatedBySkill:true,...(layer==='mine'?{layer:'mine'}:{}),...extra});
        if(layer==='mine') mineState()[side].push(unit); else getPlayer(side).units.push(unit);
        return unit;
    }
    function replaceSkillUnit(unit,type,extra={}) {
        const owner=skillOwner(unit); if(!owner) return null;
        const layer=skillUnitLayer(unit),x=unit.x,y=unit.y;
        removeSkillUnit(unit); // Replacements and mergers are not combat deaths.
        return spawnSkillUnit(type,{x,y,layer},owner.side,extra);
    }
    function transferSkillUnit(unit,newSide) {
        const owner=skillOwner(unit); if(!owner) return null;
        if(skillUnitLayer(unit)==='mine') {
            const m=mineState(); m[owner.side]=(m[owner.side]||[]).filter(u=>u!==unit);
            m[newSide]=m[newSide]||[]; unit.side=newSide; m[newSide].push(unit);
            return owner.side;
        }
        owner.player.units=owner.player.units.filter(u=>u!==unit);
        unit.side=newSide; getPlayer(newSide).units.push(unit); return owner.side;
    }
    function setSkillDuration(side,key,value,ends=2,endSide=null) {
        const p=getPlayer(side); p.lastingEffects=p.lastingEffects || {}; p.lastingEffects[key]=value;
        gameState.skillDurations=(gameState.skillDurations || []).filter(d=>!(d.side===side && d.key===key));
        gameState.skillDurations.push({side,key,remaining:ends,endSide});
    }
    function tickSkillDurations(endedSide) {
        gameState.skillDurations=(gameState.skillDurations || []).filter(d=>{
            if(!d.endSide || d.endSide===endedSide) d.remaining--;
            if(d.remaining>0) return true; delete getPlayer(d.side).lastingEffects[d.key]; return false;
        });
    }
    function skillTargetLayer(target) {
        if(!target) return 'ground';
        return target.layer==='mine'?'mine':'ground';
    }
    /* 技能单位目标：地面 + 矿洞中对该玩家可见的单位（视野外敌方单位不可选）。 */
    function skillUnitOccurrences(side) {
        const list=[];
        for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) {
            const occ=unitAt(x,y);
            if(occ) list.push({occ,layer:'ground'});
        }
        if(gameState.gameMode==='mine') {
            for(const u of mineAllUnits()) {
                if(mineUnitVisibleTo(side,u)) list.push({occ:{unit:u,side:u.side,layer:'mine'},layer:'mine'});
            }
        }
        return list;
    }
    function skillCandidates(req) {
        const candidates=[];
        if(req.validType==='unit') {
            const chooser=req.chooserSide || gameState.activeSide;
            const now=Date.now();
            const hiddenFromChooser=u=>{
                if(!u||u.destroyed) return false;
                const bucket=getRevealBucket(chooser);
                if(u.type==='鬼魂' && u.side==='ghost' && gameState.fogNight && u.revealedRound!==gameState.turn && now >= (bucket.ghosts||0)) return true;
                if(u.type==='地雷' && u.side!==chooser && now >= (gameState.revealMinesUntil||0) && now >= (bucket.mines||0)) return true;
                return false;
            };
            for(const {occ,layer} of skillUnitOccurrences(chooser)) {
                if(hiddenFromChooser(occ.unit)) continue;
                if(req.filter(occ,{x:occ.unit.x,y:occ.unit.y,layer})) candidates.push(occ.unit);
            }
            return candidates;
        }
        for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) {
            const occ=unitAt(x,y);
            if((!occ || req.allowOccupied) && req.filter(occ,{x,y})) candidates.push({x,y,layer:'ground'});
        }
        return candidates;
    }
    function startSkillTarget(skillId,skillName,prompt,count,validType,filter,callback,options={}) {
        const req={skillId,skillName,prompt,count,selected:[],validType,filter,callback,
            minCount:options.minCount===undefined?count:options.minCount,allowOccupied:!!options.allowOccupied,
            chooserSide:options.chooserSide || gameState.activeSide,publicEvent:!!options.publicEvent,...options};
        const candidates=skillCandidates(req);
        if(candidates.length<req.minCount && skillId!==999) {
            addLog(`【${skillName}】没有足够的合法目标，取消使用`);
            if(gameState.skillTransaction) cancelSkillTarget(true); return false;
        }
        if(req.minCount<req.count) req.count=Math.min(req.count,candidates.length);
        gameState.skillTargetRequest=req; renderAll(); return true;
    }
    function finishSkillTarget() {
        const req=gameState.skillTargetRequest; if(!req || req.selected.length<req.minCount) return false;
        const selected=[...req.selected]; gameState.skillTargetRequest=null;
        try { req.callback(selected); }
        catch(error) {
            if(gameState.skillTransaction) cancelSkillTarget(true);
            else gameState.skillTargetRequest=req;
            addLog(`目标结算失败，已安全恢复：${error.message}`); renderAll(); return false;
        }
        renderAll(); return true;
    }
    function cancelSkillTarget(force=false) {
        const req=gameState.skillTargetRequest;
        if(req && req.publicEvent && !force) { addLog('公共事件须完成目标选择'); return false; }
        const transaction=gameState.skillTransaction; if(!req && !transaction) return false;
        const onCancel=req&&typeof req.onCancel==='function'?req.onCancel:null;
        if(transaction) {
            gameState=transaction.snapshot; gameState.selectedCardId=null; gameState.cardUseMode=false;
            gameState.turnPhase='DRAW'; gameState.skillTransaction=null; gameState.skillTargetRequest=null;
            addLog('取消使用，已撤销全部技能效果，技能卡回到牌库');
        } else gameState.skillTargetRequest=null;
        if(onCancel){try{onCancel();}catch(error){addLog('取消结算失败：'+error.message);}}
        renderAll(); return true;
    }
    function handleSkillTargetClick(x,y,layer='ground') {
        const req=gameState.skillTargetRequest; if(!req || x<0 || x>=COLS || y<0 || y>=ROWS) return false;
        if(req.validType==='tile'&&layer!=='ground') { addLog('该技能只能选择地面格子'); return false; }
        const chooser=req.chooserSide||gameState.activeSide;
        let occ=null;
        if(layer==='mine') {
            if(gameState.gameMode!=='mine') return false;
            const unit=mineUnitAt(x,y);
            if(unit&&mineUnitVisibleTo(chooser,unit)) occ={unit,side:unit.side,layer:'mine'};
        } else {
            occ=unitAt(x,y);
        }
        if(req.validType==='unit' && !occ) return false;
        if(req.validType==='tile' && occ && !req.allowOccupied) return false;
        if(!req.filter(occ,{x,y,layer})) { addLog('无效的目标'); return false; }
        const target=req.validType==='unit'?occ.unit:{x,y,layer:'ground'};
        const targetLayer=req.validType==='unit'?skillTargetLayer(target):'ground';
        const dup=req.validType==='unit'
            ? req.selected.some(s=>s.id===target.id&&skillTargetLayer(s)===targetLayer)
            : req.selected.some(s=>s.x===x&&s.y===y&&(s.layer||'ground')===layer);
        if(dup) { addLog('已选择该目标'); return false; }
        req.selected.push(target); if(req.selected.length>=req.count) finishSkillTarget(); else renderAll(); return true;
    }
    function skillDrawCost(card,player=getPlayer(gameState.activeSide)) {
        return Math.max(0,card.cost-Math.max(0,player.nextDrawDiscount || 0)+(player.tempEffects?.cardCostIncrease || 0));
    }
    function canCancelDraw() {
        const p=getPlayer(gameState.activeSide); return !(gameState.drawChoices || []).some(id=>{
            const card=SKILL_LIBRARY.find(c=>c.id===id); return card && p.sp>=skillDrawCost(card,p);
        });
    }
    function drawRerollAvailable() {
        const p=getPlayer(gameState.activeSide);
        return !!(p.lastingEffects && p.lastingEffects.drawReroll) && (gameState.drawChoices||[]).length>0 && !gameState.drawRerollUsed;
    }
    function rerollDrawCards() {
        const p=getPlayer(gameState.activeSide);
        if(gameState.gameOver || gameState.phase!=='ACTION' || gameState.turnPhase!=='DRAW' || !['red','blue'].includes(gameState.activeSide)) return false;
        if(!(gameState.drawChoices||[]).length || !p.lastingEffects?.drawReroll || gameState.drawRerollUsed) return false;
        const used=new Set(skillPlayers().flatMap(({player})=>[...(player.usedSkills||[]),...(player.library||[])]));
        const current=new Set(gameState.drawChoices);
        const avail=SKILL_LIBRARY.filter(c=>c.id!==510 && !used.has(c.id) && !current.has(c.id));
        if(!avail.length) return false;
        for(let i=avail.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[avail[i],avail[j]]=[avail[j],avail[i]];}
        gameState.drawChoices=avail.slice(0,3).map(c=>c.id);
        gameState.drawRerollUsed=true;
        addLog('临机应变：换了一批抽卡候选');
        renderAll(); return true;
    }
    let drawPeekTimer=null;
    function startDrawPeek(){
        const overlay=document.getElementById('drawOverlay');
        if(!overlay || overlay.style.display==='none' || !gameState.drawChoices.length) return;
        stopDrawPeek();
        overlay.classList.add('peeking');
        let left=5;
        document.getElementById('drawPeekCount').textContent=String(left);
        drawPeekTimer=setInterval(()=>{
            left-=1;
            if(left<=0){ stopDrawPeek(); return; }
            document.getElementById('drawPeekCount').textContent=String(left);
        },1000);
    }
    function stopDrawPeek(){
        if(drawPeekTimer){ clearInterval(drawPeekTimer); drawPeekTimer=null; }
        const overlay=document.getElementById('drawOverlay');
        if(overlay) overlay.classList.remove('peeking');
        const count=document.getElementById('drawPeekCount');
        if(count) count.textContent='5';
    }
    function cancelDrawCards() {
        if(!canCancelDraw()) { addLog('技能点足够购买至少一张，须选择技能卡'); return false; }
        gameState.drawChoices=[]; renderAll(); return true;
    }
    function drawCards() {
        const p=getPlayer(gameState.activeSide);
        if(gameState.gameOver || gameState.phase!=='ACTION' || gameState.turnPhase!=='DRAW' || gameState.skillTargetRequest || gameState.skillTransaction || gameState.pendingModeEvent || !['red','blue'].includes(gameState.activeSide)) return;
        if(!gameState.drawChoices.length) {
            const used=new Set(skillPlayers().flatMap(({player})=>[...(player.usedSkills || []),...(player.library || [])]));
            const avail=SKILL_LIBRARY.filter(c=>c.id!==510 && !used.has(c.id));
            for(let i=avail.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [avail[i],avail[j]]=[avail[j],avail[i]]; }
            gameState.drawChoices=avail.slice(0,3).map(c=>c.id);
            gameState.drawRerollUsed=false;
        }
        if(!gameState.drawChoices.length) addLog('无卡可抽');
        renderAll();
    }
    function selectDrawCard(id) {
        const p=getPlayer(gameState.activeSide),card=SKILL_LIBRARY.find(c=>c.id===id);
        if(!card || gameState.gameOver || gameState.phase!=='ACTION' || !['red','blue'].includes(gameState.activeSide) || !gameState.drawChoices.includes(id) || gameState.turnPhase!=='DRAW') return false;
        const cost=skillDrawCost(card,p); if(p.sp<cost) { addLog('技能点不足'); showToast('技能点不足'); return false; }
        if(typeof pushUndo==='function')pushUndo('抽卡');
        p.sp-=cost; p.library.push(id); p.usedSkills.add(id); p.nextDrawDiscount=0;pushSound('card');
        gameState.drawCostModifier=0; gameState.drawChoices=[]; addLog(`${getFactionName(gameState.activeSide)}获得一张技能卡，消耗${cost}技能点`);
        renderAll(); return true;
    }
    function skillClearChaos(skillId,callback,allyOnly=false) {
        const filter=allyOnly?allyChaosFilter:chaosFilter;
        const chooser=gameState.skillTargetRequest?.chooserSide||gameState.activeSide;
        if(!skillUnitOccurrences(chooser).some(({occ})=>filter(occ))) { callback([]); return; }
        startSkillTarget(skillId,'消除混乱','选择消除一层混乱',1,'unit',filter,t=>{t[0].chaos=Math.max(0,t[0].chaos-1);callback(t);});
    }
    function skillNextEnemyEffect(key,value) {
        skillEnemies().forEach(({player})=>{ player.nextTurnEffects=player.nextTurnEffects || {};
            player.nextTurnEffects[key]=typeof value==='number'?(player.nextTurnEffects[key] || 0)+value:value;
        });
    }
    function skillStepMove(unit,direction,steps,ignoreMines=false) {
        let moved=0;
        if(ignoreMines) {
            const origin=unit.x;
            for(let step=1;step<=steps;step++) {
                const nx=origin+direction*step;
                if(!skillTileAvailable(nx,unit.y)) break;
                const occ=unitAt(nx,unit.y);
                if(occ && occ.unit.type!=='地雷') break;
                // Retreat can pass a mine without consuming it, but must finish on empty ground.
                if(!occ) { unit.x=nx; moved=step; holyPickupDragonMarks(); }
            }
            return moved;
        }
        for(let i=0;i<steps;i++) {
            const nx=unit.x+direction,ny=unit.y; if(!skillTileAvailable(nx,ny)) break;
            const occ=unitAt(nx,ny); if(occ && occ.unit.type!=='地雷') break;
            if(occ && occ.side===unit.side) break;
            unit.x=nx; moved++; holyPickupDragonMarks();
            if(occ) { triggerMine(occ.unit,unit,unit.side,nx,ny); if(unit.destroyed || unit.chaos>0) break; }
        }
        return moved;
    }
    function executeSkillEffect(cid,callback=()=>{}) {
        const p=getPlayer(gameState.activeSide),card=SKILL_LIBRARY.find(c=>c.id===cid); if(!card) return false;
        p.tempEffects=p.tempEffects || {}; p.lastingEffects=p.lastingEffects || {};
        p.skillsUsedThisTurn=(p.skillsUsedThisTurn || 0)+1; p.hasUsedCard=true;
        const finish=()=>{
            gameState.skillTargetRequest=null; gameState.skillTransaction=null; gameState.selectedCardId=null;
            if(gameState.doubleCardMode && p.skillsUsedThisTurn<2) { gameState.turnPhase='USE_CARD';gameState.cardUseMode=true; }
            else { gameState.doubleCardMode=false;gameState.cardUseMode=false;gameState.turnPhase='DRAW'; }
            if(gameState.gameMode==='neon')getAllUnits().forEach(u=>{if(!u.destroyed&&(u.layer||'ground')==='ground')neonPickup(u);});
            callback(); checkVictory(); renderAll();
        };
        const counter=skillEnemies().find(({player})=>player.tempEffects?.impeccable);
        if(counter) { delete counter.player.tempEffects.impeccable;addLog('技能被无懈可击抵消');finish();return true; }
        if(cid!==11) addLog(`${getFactionName(gameState.activeSide)}使用【${card.name}】`);
        const target=(prompt,count,type,filter,action,options={})=>startSkillTarget(cid,card.name,prompt,count,type,filter,action,options);
        const buff=(name,filter,temporary=false)=>target('选择目标单位',1,'unit',filter,t=>{addSkillBuff(t[0],name,temporary);finish();});
        const next=(key,value)=>skillNextEnemyEffect(key,value);
        switch(cid) {
            case 1: target('选择一门己方炮',1,'unit',SKILL_FILTERS[1],t=>{t[0].remainingActions=(t[0].remainingActions ?? 1)+1;t[0].hasAttacked=false;addSkillBuff(t[0],'elite_artillery');finish();});break;
            case 2:case 3: target('选择解除混乱并获得精锐属性的单位',1,'unit',SKILL_FILTERS[cid],t=>{t[0].chaos=0;addSkillBuff(t[0],cid===2?'elite_infantry':'elite_chariot');finish();});break;
            case 4: target('选择任意空闲格子布置防御工事',1,'tile',skillEmpty,t=>{
                spawnSkillUnit('防御工事',t[0],gameState.activeSide);p.units.forEach(u=>{if(!u.destroyed && Math.abs(u.x-t[0].x)+Math.abs(u.y-t[0].y)===1) u.chaos=0;});finish();
            });break;
            case 5: target('选择任意地块进行火力支援',1,'tile',()=>true,t=>{simulateArtilleryAttack(t[0].x,t[0].y);finish();},{allowOccupied:true});break;
            case 6: p.tempEffects.captureOnKill=true;finish();break;
            case 7: p.tempEffects.reversal=true;p.tempEffects.reversalTriggered=new Set();p.tempEffects.reversalCount=0;finish();break;
            case 8: target('选择敌方空地放置步兵',1,'tile',skillEnemyTile,t1=>target('选择另一敌方空地放置地雷',1,'tile',(occ,pos)=>skillEnemyTile(occ,pos) && (pos.x!==t1[0].x || pos.y!==t1[0].y),t2=>{
                spawnSkillUnit('步兵',t1[0],gameState.activeSide);spawnSkillUnit('地雷',t2[0],gameState.activeSide,{hidden:true});finish();
            }));break;
            case 9: target('选择1至3个步兵，可提前完成选择',3,'unit',SKILL_FILTERS[9],targets=>{
                targets.forEach(u=>{const roll=Math.random();
                    if(roll<0.5) addLog('升变：步兵保持不变');
                    else if(roll<2/3) {replaceSkillUnit(u,'步兵',{permaBuffs:['elite_infantry']});addLog('升变：精锐步兵');}
                    else if(roll<5/6) {replaceSkillUnit(u,'车');addLog('升变：车');}
                    else {replaceSkillUnit(u,'炮兵');addLog('升变：炮');}
                });finish();
            },{minCount:1});break;
            case 10: target('选择自爆的己方单位',1,'unit',skillAlly,t=>{
                const chosen=t[0],layer=skillTargetLayer(chosen);
                const pool=layer==='mine'?mineAllUnits():getAllUnits().filter(u=>u.layer!=='sky');
                const neighbors=pool.filter(u=>u!==chosen && skillEnemy({unit:u,side:skillOwner(u)?.side}) && Math.abs(u.x-chosen.x)+Math.abs(u.y-chosen.y)===1);
                [chosen,...neighbors].forEach(u=>triggerMine({x:chosen.x,y:chosen.y,side:gameState.activeSide,destroyed:false},u,u.side,chosen.x,chosen.y));finish();
            });break;
            case 11: p.tempEffects.impeccable=true;finish();break;
            case 12: target('选择任意空地布置临时车',1,'tile',skillEmpty,t=>{spawnSkillUnit('车',t[0],gameState.activeSide,{temporary:true,expiresAt:'end_of_turn'});finish();});break;
            case 13: target('选择3个敌方单位',3,'unit',skillEnemy,t=>{t.forEach(u=>{u.suppressed=true;u.suppressedUntil='enemy_turn_end';});finish();});break;
            case 14: p.tempEffects.ptsd=true;p.tempEffects.ptsdUnits=new Set();finish();break;
            case 15: target('选择本回合可操纵的敌方单位',1,'unit',skillEnemy,t=>{const u=t[0];u.originalSide=transferSkillUnit(u,gameState.activeSide);u.spied=true;u.spyController=gameState.activeSide;finish();});break;
            case 16: target('选择敌方空地布雷',1,'tile',skillEnemyTile,t=>{spawnSkillUnit('地雷',t[0],gameState.activeSide,{hidden:true});finish();});break;
            case 17: target('选择3个空闲格子布雷',3,'tile',skillEmpty,t=>{t.forEach(pos=>spawnSkillUnit('地雷',pos,gameState.activeSide,{hidden:true}));finish();});break;
            case 18: p.tempEffects.artilleryReroll=true;finish();break;
            case 19: target('选择获得排雷属性的己方步兵',1,'unit',SKILL_FILTERS[19],t=>{addSkillBuff(t[0],'minesweeper');addSkillBuff(t[0],'mine_detector');finish();});break;
            case 20: {
                const groups=[gameState.activeSide,...getEnemyFactions(gameState.activeSide,'skill')].map(side=>({side,mines:getPlayer(side).units.filter(u=>!u.destroyed && u.type==='地雷')}));
                gameState.revealMinesUntil=Number.MAX_SAFE_INTEGER;
                gameState.mineRelocationPreview=groups.flatMap(g=>g.mines.map(u=>({x:u.x,y:u.y,side:g.side})));
                groups.forEach(g=>{addLog(`换位思考：${getFactionName(g.side)}地雷位置 ${g.mines.map(u=>`(${u.x},${u.y})`).join('、') || '无'}`);g.mines.forEach(u=>u.destroyed=true);});
                const place=i=>{
                    if(i>=groups.length) {gameState.revealMinesUntil=0;gameState.mineRelocationPreview=[];gameState.minesViewDisabled=true;addLog('换位思考：重新布雷完成，查看地雷已禁用');finish();return;}
                    const group=groups[i];if(!group.mines.length) {place(i+1);return;}
                    const chooser=group.side===gameState.activeSide?(gameState.activeSide==='red'?'blue':'red'):gameState.activeSide;
                    target(`由${getFactionName(chooser)}为${getFactionName(group.side)}重新布置${group.mines.length}颗地雷`,group.mines.length,'tile',(occ,pos)=>skillEmpty(occ,pos) && isInTerritory(pos.x,pos.y,group.side,gameState.gameMode),tiles=>{
                        tiles.forEach((pos,j)=>{const mine=group.mines[j];mine.x=pos.x;mine.y=pos.y;mine.destroyed=false;mine.hidden=true;});place(i+1);
                    },{chooserSide:chooser});
                };place(0);break;
            }
            case 21: target('选择己方3个空地布置防御工事',3,'tile',skillOwnTile,t=>{
                t.forEach(pos=>spawnSkillUnit('防御工事',pos,gameState.activeSide));
                const side=gameState.activeSide==='red'?'blue':'red';
                target(`由${getFactionName(side)}选择其阵地空地布置防御工事`,1,'tile',(occ,pos)=>skillEmpty(occ,pos) && isInTerritory(pos.x,pos.y,side,gameState.gameMode),tiles=>{spawnSkillUnit('防御工事',tiles[0],side);finish();},{chooserSide:side});
            });break;
            case 22: target('选择己方空地布置后勤兵',1,'tile',(occ,pos)=>skillOwnTile(occ,pos) && p.units.filter(u=>!u.destroyed&&u.type==='后勤兵').length<1,t=>{spawnSkillUnit('后勤兵',t[0],gameState.activeSide);finish();});break;
            case 23: p.cmd+=2;p.tempEffects.commandMastery=2;finish();break;
            case 24: p.tempEffects.attackBonus=(p.tempEffects.attackBonus || 0)+1;finish();break;
            case 25: next('attackPenalty',1);finish();break;
            case 26: {
                const total=p.units.filter(u=>!u.destroyed).reduce((sum,u)=>sum+(u.chaos || 0),0);p.units.filter(u=>!u.destroyed).forEach(u=>u.chaos=0);
                const bonus=total<=2?1:total>=4?-1:0;p.cmd=Math.max(0,p.cmd+bonus);p.tempEffects.meticulousWork=bonus;
                addLog(`卷土重来：解除${total}层混乱，本回合指挥点${bonus>=0?'+':''}${bonus}`);finish();break;
            }
            case 27: setSkillDuration(gameState.activeSide,'infantryAsChariot',true);finish();break;
            case 28: p.tempEffects.strictCheck=true;finish();break;
            case 29: p.tempEffects.divineAttack=true;finish();break;
            case 30: skillEnemies().forEach(({side})=>setSkillDuration(side,'chariotAsInfantry',true,1,side));finish();break;
            case 31: target('选择1至2个己方混乱单位，可提前完成选择',2,'unit',allyChaosFilter,t=>{
                t.forEach(u=>u.chaos=Math.max(0,u.chaos-1));const cleared=t.filter(u=>!u.chaos);if(!cleared.length) {finish();return;}
                target('选择已解除混乱的单位，本轮行动免指挥点',1,'unit',occ=>skillAlly(occ) && cleared.includes(occ.unit),t2=>{t2[0].freeAction=true;finish();});
            },{minCount:1});break;
            case 32: target('选择被操纵的敌方攻击者',1,'unit',skillEnemy,t1=>target('选择受到攻击的己方单位',1,'unit',occ=>skillAlly(occ)&&skillTargetLayer(occ.unit)===skillTargetLayer(t1[0]),t2=>{
                const victim=t2[0],beforeChaos=victim.chaos||0;
                forcedSkillAttack(t1[0],victim,-1);
                if(victim.destroyed || (victim.chaos||0)>beforeChaos){next('cmdPenalty',1);addLog('气凌惑蛊：目标混乱或被消灭，下回合对方指挥点减1');}
                finish();
            }));break;
            case 33: target('选择合并的两个己方步兵',2,'unit',occ=>{
                const picked=gameState.skillTargetRequest?.selected?.[0];
                return skillInfantry(occ)&&(!picked||skillTargetLayer(occ.unit)===skillTargetLayer(picked));
            },t=>{
                removeSkillUnit(t[0]);replaceSkillUnit(t[1],'二阶步兵',{hp:2});finish();
            });break;
            case 34: target('选择敌方车，将其变为精锐步兵',1,'unit',SKILL_FILTERS[34],t=>{replaceSkillUnit(t[0],'步兵',{permaBuffs:['elite_infantry']});finish();});break;
            case 35: target('选择获得地雷抗性的己方车',1,'unit',SKILL_FILTERS[3],t=>{addSkillBuff(t[0],'mine_resist');finish();});break;
            case 36: {
                let discarded=false;
                skillEnemies().forEach(({player})=>{
                    if(player.library?.length) {const idx=Math.floor(Math.random()*player.library.length);const [card]=player.library.splice(idx,1);player.usedSkills=player.usedSkills||new Set();player.usedSkills.add(card);discarded=true;addLog('知己知彼：敌方随机弃置一张技能卡');}
                });
                if(discarded) next('cmdPenalty',1);
                finish();break;
            }
            case 37: target('选择交换位置的第一个单位',1,'unit',skillAny,t1=>target('选择交换位置的第二个单位',1,'unit',occ=>{
                if(!skillAny(occ)||occ.unit===t1[0])return false;
                const layer=skillTargetLayer(occ.unit);
                if(layer!==skillTargetLayer(t1[0]))return false;
                if(layer==='mine')return !isMineWall(occ.unit.x,occ.unit.y)&&!isMineWall(t1[0].x,t1[0].y);
                return canEnterTile(t1[0],occ.unit.x,occ.unit.y) && canEnterTile(occ.unit,t1[0].x,t1[0].y);
            },t2=>{
                const a=t1[0],b=t2[0];[a.x,a.y,b.x,b.y]=[b.x,b.y,a.x,a.y];updateBoarding(a);updateBoarding(b);holyPickupDragonMarks();const enemy=[a,b].find(u=>getEnemyFactions(gameState.activeSide,'skill').includes(u.side));if(enemy) addUnitChaos(enemy,1,gameState.activeSide);finish();
            }));break;
            case 38: addLog('🩸');finish();break;
            case 39: addLog('我总算让儿子赢了，现在的世界真不像话......');finish();break;
            case 40: addLog('我*，你***是**吧，***！');finish();break;
            case 41: addLog('Never gonna give you up！');finish();break;
            case 42:case 81: target('选择本回合可行动两次的己方单位',1,'unit',SKILL_FILTERS[cid],t=>{
                t[0].multiActionRemaining=2;t[0].freeSecondAction=true;addSkillBuff(t[0],cid===42?'blitzkrieg':'double_action',true);finish();
            });break;
            case 43: target('选择跃迁单位',1,'unit',occ=>skillAny(occ)&&skillTargetLayer(occ.unit)==='ground',t1=>target('选择任意空闲格子',1,'tile',skillEmpty,t2=>{t1[0].x=t2[0].x;t1[0].y=t2[0].y;updateBoarding(t1[0]);holyPickupDragonMarks();finish();}));break;
            case 44: target('选择围点打援的敌方单位',1,'unit',skillEnemy,t=>{
                const u=t[0],pool=skillTargetLayer(u)==='mine'?mineUnitsOf(p.side):p.units.filter(a=>!a.destroyed&&a.layer!=='sky');
                const n=pool.filter(a=>!a.destroyed && Math.abs(a.x-u.x)+Math.abs(a.y-u.y)===1).length;if(n) addUnitChaos(u,n,gameState.activeSide);finish();
            });break;
            case 46: target('选择使用游击战术的己方步兵',1,'unit',SKILL_FILTERS[46],t=>{addSkillBuff(t[0],'guerrilla',true);addSkillBuff(t[0],'no_attack',true);finish();});break;
            case 48: p.units.filter(u=>!u.destroyed).forEach(u=>u.chaos=0);p.usedSkills=p.usedSkills||new Set();p.library.forEach(id=>p.usedSkills.add(id));p.library=[];finish();break;
            case 49: {
                let first=null;const move=i=>target(`选择撤退的第${i+1}个己方单位`,1,'unit',occ=>skillAlly(occ) && skillTargetLayer(occ.unit)==='ground' && occ.unit!==first,t1=>target('选择己方阵地空地',1,'tile',skillOwnTile,t2=>{
                    const u=t1[0];u.x=t2[0].x;u.y=t2[0].y;if(i===0) {first=u;move(1);}else finish();
                }));move(0);break;
            }
            case 50: p.lastingEffects.tombstone=true;finish();break;
            case 51: p.lastingEffects.catapult=true;finish();break;
            case 52: target('选择1至2个己方防御工事，可提前完成选择',2,'unit',SKILL_FILTERS[52],t=>{t.forEach(u=>addSkillBuff(u,'trap'));finish();},{minCount:1});break;
            case 53: buff('iron_wall',SKILL_FILTERS[53]);break;
            case 55: target('选择复制技能卡的敌方阵营单位',1,'unit',occ=>skillEnemy(occ) && !!getPlayer(occ.side).library?.length,t=>{
                const enemy=getPlayer(t[0].side),id=enemy.library[Math.floor(Math.random()*enemy.library.length)];p.library.push(id);p.usedSkills.add(id);addLog('间谍渗透：复制了对方一张技能卡');finish();
            });break;
            case 57: p.cmd++;p.sp+=2;p.tempEffects.temporaryCmdBonus=(p.tempEffects.temporaryCmdBonus || 0)+1;finish();break;
            case 58: p.lastingEffects.infantryChariotSynergy=true;finish();break;
            case 59: {
                const ownerState=gameState,rolls=[];gameState.skillResolving=true;
                const roll=()=>{if(gameState!==ownerState) return;const dice=Math.floor(Math.random()*6)+1;rolls.push(dice);addLog(`混乱与蠕动 投点：${dice}`);
                    if(dice===1) {gameState.skillResolving=false;addLog(`完整投点：${rolls.join('、')}；敌方玩家混乱，己方玩家蠕动！`);finish();}else scheduleGame(roll,250);
                };roll();break;
            }
            case 60: showVictory(gameState.activeSide==='red'?'红方胜利':'蓝方胜利');finish();break;
            case 61: target('选择扩展触发范围的己方地雷',1,'unit',SKILL_FILTERS[61],t=>{addSkillBuff(t[0],'sensor_mine');t[0].sensorRange=1;finish();});break;
            case 62: target('选择突围的己方混乱单位',1,'unit',occ=>allyChaosFilter(occ)&&skillTargetLayer(occ.unit)==='ground',t=>{t[0].chaos=0;skillStepMove(t[0],gameState.activeSide==='red'?1:-1,2);finish();});break;
            case 63: target('选择被引诱的敌方单位',1,'unit',occ=>skillEnemy(occ)&&skillTargetLayer(occ.unit)==='ground',t=>{skillStepMove(t[0],gameState.activeSide==='red'?-1:1,3);finish();});break;
            case 64: target('选择3×3轰击范围中心地块',1,'tile',()=>true,t=>{
                getAllUnits().filter(u=>u.layer!=='sky' && skillAny({unit:u,side:skillOwner(u)?.side}) && Math.abs(u.x-t[0].x)<=1 && Math.abs(u.y-t[0].y)<=1).forEach(u=>addUnitChaos(u,1,gameState.activeSide));finish();
            },{allowOccupied:true});break;
            case 66: target('选择向后两格的己方单位',1,'unit',occ=>skillAlly(occ)&&skillTargetLayer(occ.unit)==='ground',t=>{skillStepMove(t[0],gameState.activeSide==='red'?-1:1,2,true);finish();});break;
            case 67: target('选择被说服的敌方混乱单位',1,'unit',SKILL_FILTERS[67],t=>{const u=t[0],type=u.type==='二阶步兵'?'步兵':u.type,pos={x:u.x,y:u.y,layer:skillTargetLayer(u)};removeSkillUnit(u);spawnSkillUnit(type,pos,gameState.activeSide,{chaos:1});finish();});break;
            case 68: p.smoothComboRemainingRounds=(p.smoothComboRemainingRounds || 0)+3;p.nextDrawDiscount=(p.nextDrawDiscount || 0)+1;finish();break;
            case 69: target('选择士气崩溃的敌方单位',1,'unit',skillEnemy,t=>{const u=t[0],pool=skillTargetLayer(u)==='mine'?mineAllUnits():getAllUnits().filter(a=>a.layer!=='sky');pool.filter(a=>skillEnemy({unit:a,side:skillOwner(a)?.side}) && Math.abs(a.x-u.x)+Math.abs(a.y-u.y)<=1).forEach(a=>addUnitChaos(a,1,gameState.activeSide));finish();});break;
            case 70: p.units.filter(u=>!u.destroyed && u.type==='车' && u.layer!=='sky').forEach(u=>addSkillBuff(u,'armored'));finish();break;
            case 71: buff('precision_target',skillEnemy,true);break;
            case 72: target('选择己方空地布置伪装地雷',1,'tile',skillOwnTile,t=>{spawnSkillUnit('地雷',t[0],gameState.activeSide,{hidden:true,disguisedAs:'防御工事'});finish();});break;
            case 74: target('选择封锁的敌方单位',1,'unit',occ=>skillEnemy(occ)&&skillTargetLayer(occ.unit)==='ground',t=>{
                gameState.blockedTiles=gameState.blockedTiles || [];[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const x=t[0].x+dx,y=t[0].y+dy;if(skillTileAvailable(x,y) && !unitAt(x,y)) gameState.blockedTiles.push({x,y,ownerSide:gameState.activeSide,expiresSide:t[0].side});});finish();
            });break;
            case 75: buff('medical_center',SKILL_FILTERS[75]);break;
            case 77: buff('kamikaze',SKILL_FILTERS[77],true);break;
            case 78: target('选择己方空地布置战壕',1,'tile',skillOwnTile,t=>{spawnSkillUnit('防御工事',t[0],gameState.activeSide,{permaBuffs:['trench']});finish();});break;
            case 79: if(!gameState.minesViewDisabled) {revealFor(gameState.activeSide,'mines',3000);}else addLog('查看地雷已被换位思考禁用');finish();break;
            case 80: target('选择己方被消灭单位的空闲位置',1,'tile',SKILL_FILTERS[80],t=>{spawnSkillUnit('地雷',t[0],gameState.activeSide,{hidden:true});finish();});break;
            case 82: buff('smoke_screen',skillAlly,true);break;
            case 84: target('选择触发陷阱连锁的己方地雷',1,'unit',SKILL_FILTERS[84],t=>{
                const mine=t[0],targets=getAllUnits().filter(u=>u.layer!=='sky' && skillEnemy({unit:u,side:skillOwner(u)?.side}) && Math.abs(u.x-mine.x)<=1 && Math.abs(u.y-mine.y)<=1);
                mine.destroyed=true;targets.forEach(u=>triggerMine({x:mine.x,y:mine.y,side:gameState.activeSide,destroyed:false},u,u.side,u.x,u.y));finish();
            });break;
            case 85: target('选择至少3个己方步兵，可继续选择或完成',skillUnitOccurrences(gameState.activeSide).filter(({occ})=>SKILL_FILTERS[85](occ)).length,'unit',SKILL_FILTERS[85],t=>{t.forEach(u=>{addSkillBuff(u,'grenadier');u.grenadierUsed=false;});finish();},{minCount:3});break;
            case 86: target('选择失去属性的敌方车',1,'unit',SKILL_FILTERS[86],t=>{
                const u=t[0],chaos=u.chaos;u.permaBuffs=['battle_damaged'];u.tempBuffs=[];u.chaos=chaos;
                delete u.armoryType;delete u.hp;delete u.remainingActions;delete u.hasAttacked;delete u.dragon;delete u.dragonPower;
                delete u.multiActionRemaining;delete u.freeSecondAction;u.freeAction=false;u.boarded=false;u.suppressed=false;finish();
            });break;
            case 87: skillEnemies().forEach(({side})=>setSkillDuration(side,'chariotMoveLimit',3,1,side));finish();break;
            case 88: target('选择获得炮台属性的己方防御工事',1,'unit',SKILL_FILTERS[88],t=>{addSkillBuff(t[0],'turret');t[0].hasAttacked=false;t[0].remainingActions=1;finish();});break;
            case 92: next('cardCostIncrease',1);finish();break;
            case 94: p.tempEffects.autoCounter=true;finish();break;
            case 95: target('选择获得额外进攻机会的己方炮',1,'unit',SKILL_FILTERS[95],t=>{t[0].remainingActions=(t[0].remainingActions ?? 1)+1;t[0].hasAttacked=false;finish();});break;
            case 96: target('选择移除全部混乱的己方单位',1,'unit',allyChaosFilter,t=>{t[0].chaos=0;finish();});break;
            case 97: target('选择要直接移除的己方单位，可随时完成',p.units.filter(u=>!u.destroyed).length+mineUnitsOf(gameState.activeSide).length,'unit',skillAlly,t=>{
                t.forEach(u=>removeSkillUnit(u));
                const bonus=t.length>=2;
                if(bonus)p.cmd++;
                addLog(`壮士断腕：移除${t.length}个己方单位${bonus?'，指挥点+1':''}`);
                finish();checkVictory();
            },{minCount:1});break;
            case 98: setSkillDuration(gameState.activeSide,'drawReroll',true,4,gameState.activeSide);finish();break;
            case 510: target('选择获得执灯士属性的己方单位',1,'unit',skillAlly,t=>{addSkillBuff(t[0],'lantern_bearer');gameState.lanternCardReady[gameState.activeSide]=false;finish();checkLanternCard(gameState.activeSide);});break;
            default: throw new Error(`未定义的技能卡：${cid}`);
        }
        return true;
    }
    function playSelectedCard() {
        const p=getPlayer(gameState.activeSide),cid=gameState.selectedCardId;
        if(cid===null || cid===undefined || gameState.gameOver || gameState.phase!=='ACTION' || gameState.turnPhase!=='USE_CARD' || !gameState.cardUseMode || gameState.skillTargetRequest || gameState.skillTransaction || gameState.skillResolving || gameState.pendingModeEvent || !p.library.includes(cid)) return false;
        const limit=gameState.doubleCardMode?2:(p.maxSkillsPerTurn || 1);
        if((p.skillsUsedThisTurn || 0)>=limit) {addLog('本回合技能卡使用次数已用完');return false;}
        if(typeof pushUndo==='function')pushUndo('使用技能卡');
        const snapshot=skillClone(gameState);snapshot.skillTransaction=null;
        gameState.skillTransaction={snapshot,side:gameState.activeSide,cid};p.library.splice(p.library.indexOf(cid),1);
        try {return executeSkillEffect(cid);}catch(error) {cancelSkillTarget(true);addLog(`技能结算失败，已安全撤销：${error.message}`);return false;}
    }

// actions.js
    function canHealTarget(logi,target){
        if(!logi||(logi.type!=='后勤兵'&&logi.armoryType!=='补给车')||!target||target.destroyed||target.side!==logi.side||(target.chaos||0)<=0)return false;
        const dx=Math.abs(logi.x-target.x),dy=Math.abs(logi.y-target.y);
        return logi.armoryType==='补给车' ? dx+dy===1 : (unitHasBuff(logi,'medical_center') ? dx<=1&&dy<=1&&dx+dy>0 : dx+dy===1);
    }
    function canArtilleryTarget(unit,target,grenadier=false){
        if(gameState.gameMode==='wannan'&&gameState.minigameState&&gameState.minigameState.fakeAlliance&&!gameState.incidentTriggered&&gameState.turn<=2&&['red','blue'].includes(unit.side)&&['red','blue'].includes(target&&target.side)&&unit.side!==target.side)return false;
        if(!target||target.destroyed||target.side===unit.side||['地雷','鬼魂'].includes(target.type)||unitHasTempBuff(target,'smoke_screen')||unitHasTempBuff(unit,'no_attack'))return false;
        if(unit.spied&&target.side===unit.originalSide)return false;
        if(playerEffects(unit.side).noArtillery)return false;
        if(grenadier&&(!unitHasBuff(unit,'grenadier')||unit.grenadierUsed))return false;
        if(gameState.gameMode==='pirate'||unit.type==='海炮'){
            if(unit.y!==target.y)return false;
            const candidates=[];
            for(const dx of [-1,1])for(let x=unit.x+dx;inBounds(x,unit.y);x+=dx){
                if(isPirateBlockedTile(x,unit.y))break;
                const occ=unitAt(x,unit.y);
                if(occ){if(occ.side!==unit.side&&occ.unit.type!=='地雷')candidates.push(occ.unit);break;}
            }
            candidates.sort((a,b)=>Math.abs(a.x-unit.x)-Math.abs(b.x-unit.x));return candidates[0]===target;
        }
        if(unitHasBuff(unit,'turret'))return true;
        if(gameState.gameMode==='fog'&&target.type==='墓碑')return true;
        return hasActedThisGame(target);
    }
    function infantryMovePath(u,tx,ty){
        const boatEntry=gameState.gameMode==='pirate'&&!u.boarded&&hasBoatAt(u.x,u.y)&&isPirateWaterTile(tx,ty)&&!isPirateBlockedTile(tx,ty);
        if(!isInfantryUnit(u)||(!canEnterTile(u,tx,ty)&&!boatEntry)||u.x===tx&&u.y===ty)return null;
        const occ=unitAt(tx,ty);
        if(occ&&!(occ.side!==u.side&&occ.unit.type==='地雷')&&!(gameState.gameMode==='fog'&&occ.unit.type==='鬼魂'))return null;
        if(gameState.gameMode==='pirate'){
            const canBoard=u.boarded||hasBoatAt(u.x,u.y);
            if(canBoard&&(isPirateWaterTile(u.x,u.y)||isPirateBoatPoint(u.x,u.y))){
                const boatUnit=u.boarded?u:Object.assign({},u,{boarded:true});
                const tile=getPirateBoardedTiles(boatUnit).find(t=>t.x===tx&&t.y===ty&&t.type==='move');
                if(tile)return pathTo(u,tx,ty);
            }
            if(isPirateWaterTile(u.x,u.y)||isPirateWaterTile(tx,ty))return null;
        }
        const distance=Math.abs(u.x-tx)+Math.abs(u.y-ty);
        if(distance===1)return [{x:tx,y:ty}];
        if(distance===2&&u.bossMove2&&(u.x===tx||u.y===ty)){
            const mx=(u.x+tx)/2,my=(u.y+ty)/2;
            if(canEnterTile(u,mx,my)&&!unitAt(mx,my)&&canEnterTile(u,tx,ty)&&!unitAt(tx,ty))return [{x:mx,y:my},{x:tx,y:ty}];
        }
        /* 霓虹纪元：基础步兵可沿一个方向直行 2 格，中格必须可通行且无单位。 */
        if(distance===2&&neonDashUnit(u)&&(u.x===tx||u.y===ty)){
            const mx=(u.x+tx)/2,my=(u.y+ty)/2;
            if(canEnterTile(u,mx,my)&&!unitAt(mx,my))return [{x:mx,y:my},{x:tx,y:ty}];
        }
        if(canTurnMoveViaFortification(u,tx,ty,u.side))return [{x:tx,y:ty}];
        if(unitHasTempBuff(u,'guerrilla')&&distance===2){
            const steps=[[1,0],[-1,0],[0,1],[0,-1]];
            for(const [dx,dy]of steps){
                const x=u.x+dx,y=u.y+dy;
                if(Math.abs(x-tx)+Math.abs(y-ty)!==1||!canEnterTile(u,x,y))continue;
                const mid=unitAt(x,y);
                if(mid&&!(mid.side!==u.side&&mid.unit.type==='地雷'))continue;
                return [{x,y},{x:tx,y:ty}];
            }
        }
        return null;
    }
    function isValidInfantryAttack(u,target){
        if(!target||target.destroyed||target.side===u.side||['地雷','鬼魂'].includes(target.type)||unitHasTempBuff(u,'no_attack')||unitHasTempBuff(target,'smoke_screen'))return false;
        if(u.spied&&target.side===u.originalSide)return false;
        if(gameState.gameMode==='pirate'&&u.boarded&&target.boarded&&isPirateWaterTile(target.x,target.y)){
            return getPirateBoardedTiles(u).some(t=>t.x===target.x&&t.y===target.y&&t.type==='attack');
        }
        if(gameState.gameMode==='pirate'&&u.boarded&&isPirateWaterTile(u.x,u.y))return false;
        return isInfantryUnit(u)&&(Math.abs(u.x-target.x)+Math.abs(u.y-target.y)===1||canCrossFortificationAttack(u,target.x,target.y,u.side));
    }
    function getUnitActionTiles(u){
        if(!canUnitAct(u,u.side)||gameState.actionInProgress)return [];
        if(u.static)return [];
        if((u.permaBuffs||[]).includes('coconut')&&((gameState.minigameState&&gameState.minigameState.cannonLoaded)||0)<=0)return [];
        if(gameState.levelId==='pirate-11'&&u.type==='海炮'&&u.x===0){
            const out=[];
            for(const dy of [-1,1]){const y=u.y+dy;if(y>=0&&y<ROWS&&!unitAt(0,y)&&!isBlockedTile(0,y,gameState.gameMode))out.push({x:0,y,type:'move'});}
            for(let x=1;x<COLS;x++){const o=unitAt(x,u.y);if(o&&canArtilleryTarget(u,o.unit))out.push({x,y:u.y,type:'attack',target:o.unit});}
            return out;
        }
        if(u.levelRole==='runner'&&levelState.level&&levelState.level.minigame&&levelState.level.minigame.autoEscort){
            const out=[];
            for(const dy of [-1,1]){
                const x=u.x,y=u.y+dy;
                if(x<0||x>=COLS||y<0||y>=ROWS)continue;
                if(unitAt(x,y)||isBlockedTile(x,y,gameState.gameMode))continue;
                out.push({x,y,type:'move'});
            }
            return out;
        }
        if(gameState.gameMode==='tide'&&gameState.tideMode){
            const list=gameState.tideMode==='purge'?tidePurgeTiles(u):tideMarkTiles(u);
            return list.map(t=>({x:t.x,y:t.y,type:gameState.tideMode==='purge'?'purge':'mark'}));
        }
        const beaconTiles=gameState.gameMode==='beacon'?beaconIgnitableTowers(u).map(t=>({x:t.x,y:t.y,type:'beacon_ignite'})):[];
        if(u.type==='车'){
            const carTiles=getChariotMoveableTiles(u).filter(t=>!t.target||!unitHasTempBuff(t.target,'smoke_screen')).map(t=>Object.assign({},t,{type:t.type==='attack_blocked_by_mine'?'attack':t.type}));
            if(u.armoryType==='补给车'){
                for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
                    const v=unitAt(u.x+dx,u.y+dy);
                    if(v && canHealTarget(u,v.unit)) carTiles.push({x:v.unit.x,y:v.unit.y,type:'heal'});
                }
            }
            carTiles.push(...beaconTiles);
            return carTiles;
        }
        const tiles=[];
        const grenadierTiles=grenadierTargetTiles(u);
        if(isEngineer(u)){
            if(gameState.engineerBuildId===u.id){
                for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
                    const x=u.x+dx,y=u.y+dy;
                    if(inBounds(x,y) && !unitAt(x,y) && skillTileAvailable(x,y)) tiles.push({x,y,type:'engineer_build'});
                }
                tiles.push(...beaconTiles);
                return tiles;
            }
            tiles.push({x:u.x,y:u.y,type:'engineer_build_mode'});
            for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
                const x=u.x+dx,y=u.y+dy,occ=unitAt(x,y);
                if(occ && occ.side!==u.side && ['防御工事','地雷'].includes(occ.unit.type) && (occ.unit.type!=='地雷'||mineVisibleToSide(u.side,occ.unit))){
                    tiles.push({x,y,type:'engineer_remove',target:occ.unit});
                }
            }
        }
        for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
            const occ=unitAt(x,y),target=occ&&occ.unit;
            if(canHealTarget(u,target)){tiles.push({x,y,type:'heal'});continue;}
            if(isRangedUnit(u)){
                if(canArtilleryTarget(u,target))tiles.push({x,y,type:'attack',target});
                continue;
            }
            if(isValidInfantryAttack(u,target)){tiles.push({x,y,type:'attack',target});continue;}
            const gren=grenadierTiles.find(t=>t.x===x&&t.y===y);
            if(gren){tiles.push(gren);continue;}
            if(infantryMovePath(u,x,y))tiles.push({x,y,type:'move'});
            // Friendly mines have the same yellow display but cannot be occupied.
            else if(target&&target.type==='地雷'&&target.side===u.side&&isInfantryUnit(u)&&Math.abs(u.x-x)+Math.abs(u.y-y)===1)tiles.push({x,y,type:'move',blockedFriendlyMine:true});
        }
        tiles.push(...beaconTiles);
        return tiles;
    }
    function onCellClick(x,y){
        if(!inBounds(x,y)||gameState.gameOver||gameState.actionInProgress||gameState.skillResolving||['GAME_OVER','VICTORY'].includes(gameState.phase))return;
        if(gameState.skillTargetRequest){handleSkillTargetClick(x,y);return;}
        if(gameState.pendingModeEvent||gameState.wannanIncidentPrompt)return;
        // 联机模式下不开放调试部署。
        // 联机模式下不开放调试选单位。
        if(gameState.phase==='DEPLOY'){if(gameState.removeMode)removeUnit(x,y);else deployUnit(x,y);return;}
        if(gameState.turnPhase!=='ACTION'||!['red','blue'].includes(gameState.activeSide)){addLog('请先开始行动');return;}
        const occ=unitAt(x,y),sel=gameState.selectedUnitId?getAllUnits().find(u=>u.id===gameState.selectedUnitId):null;
        if(!sel){
            if(occ&&(canUnitAct(occ.unit,gameState.activeSide,true)||mineCanDescend(occ.unit)))gameState.selectedUnitId=occ.unit.id;
            gameState.tideMode=null;
            renderAll();return;
        }
        if(gameState.gameMode==='beacon'){
            const tower=beaconTowerAt(x,y);
            if(tower){
                if(beaconCanIgnite(sel,tower)){
                    if(typeof pushUndo==='function')pushUndo('点燃烽燧');
                    beaconIgnite(sel,tower);return;
                }
                addLog('需要跨过长城、位于烽燧正交相邻格，并消耗 1 指挥点才能点燃');
                return;
            }
        }
        if(gameState.gameMode==='tide'&&gameState.tideMode){
            if(gameState.tideMode==='purge'&&tideDoPurge(sel,x,y)) return;
            if(gameState.tideMode==='mark'&&tideDoMark(sel,x,y)) return;
            addLog('目标不在斩潮/引潮范围内');
            gameState.tideMode=null;renderAll();return;
        }
        if(isEngineer(sel) && gameState.engineerBuildId===sel.id){
            const buildTile=getUnitActionTiles(sel).find(t=>t.x===x&&t.y===y&&t.type==='engineer_build');
            if(buildTile){
                if(typeof pushUndo==='function')pushUndo('工兵建造');
                getPlayer(sel.side).units.push(createUnit('防御工事',x,y,sel.side));
                gameState.engineerBuildId=null;
                if(gameState.gameMode==='neon'&&neonTraitKey(sel)==='rapid'&&!neonTurnFlag(sel,'rapid')){
                    neonMarkTurn(sel,'rapid');sel.freeAction=true;
                    addLog('🏗️ 快速部署：本次建造不消耗指挥点');
                }
                addLog(`🛠️ 工兵在(${x},${y})建造防御工事`);
                completeUnitAction(sel,sel.side);return;
            }
            gameState.engineerBuildId=null;renderAll();return;
        }
        if(isEngineer(sel) && sel.x===x && sel.y===y){gameState.engineerBuildId=sel.id;renderAll();return;}
        if(sel.x===x&&sel.y===y){
            if(gameState.gameMode==='mine'&&mineCanDescend(sel)){mineDescend(sel);return;}
            if(gameState.gameMode==='holy'&&sel.layer!=='sky'&&sel.dragon&&(sel.chaos||0)===0){
                const result=holyAscend(sel.side);
                if(!result.ok)addLog('🐉 '+result.error);
                renderAll();return;
            }
            gameState.selectedUnitId=null;gameState.tideMode=null;renderAll();return;
        }
        if(occ&&occ.side===gameState.activeSide&&!canHealTarget(sel,occ.unit)&&(canUnitAct(occ.unit,occ.side,true)||mineCanDescend(occ.unit))){
            gameState.selectedUnitId=occ.unit.id;gameState.tideMode=null;renderAll();return;
        }
        if(!canUnitAct(sel,gameState.activeSide)){addLog(sel.chaos>0?'混乱单位无法行动':'该单位目前无法行动');return;}
        if(canHealTarget(sel,occ&&occ.unit)){tryRemoveChaos(sel,occ.unit);return;}
        if(sel.levelRole==='runner'&&levelState.level&&levelState.level.minigame&&levelState.level.minigame.autoEscort){
            const tile=getUnitActionTiles(sel).find(t=>t.x===x&&t.y===y);
            if(tile&&tile.type==='move'){
                if(typeof pushUndo==='function')pushUndo('雪橇纵向移动');
                sel.y=y;addLog('🛷 雪橇纵向移动一格');completeUnitAction(sel,sel.side);renderAll();
            } else addLog('雪橇只能纵向移动一格');
            return;
        }
        if(sel.type==='车'){
            if(typeof pushUndo==='function')pushUndo('车行动');
            if(occ&&occ.side!==sel.side&&occ.unit.type!=='地雷'&&occ.unit.type!=='鬼魂')chariotAttack(sel,occ.unit);
            else chariotMove(sel,x,y);return;
        }
        const tile=getUnitActionTiles(sel).find(t=>t.x===x&&t.y===y);
        if(!tile){addLog('目标不在行动范围内');return;}
        if(tile.blockedFriendlyMine){addLog('不能移动到己方地雷');return;}
        if(tile.type==='engineer_remove'){
            if(typeof pushUndo==='function')pushUndo('工兵拆除');
            const victim=tile.target;
            victim.destroyed=true;
            sel.x=x;sel.y=y;gameState.engineerBuildId=null;
            addLog(`🛠️ 工兵拆除了${victim.type==='地雷'?'敌方地雷':'敌方防御工事'}`);
            completeUnitAction(sel,sel.side);return;
        }
        if(tile.type==='attack'&&(isRangedUnit(sel)||tile.grenadier)){
            if(typeof pushUndo==='function')pushUndo('炮击');
            showCannonball(sel.x,sel.y,x,y,()=>resolveArtilleryAttack(sel,x,y,{grenadier:!!tile.grenadier}));return;
        }
        if(tile.type==='attack')tryAttack(sel,tile.target,x,y);else tryMove(sel,x,y);
    }
    function tryMove(u,x,y){
        if(!canUnitAct(u,u.side))return false;
        if(gameState.levelId==='pirate-11'&&u.type==='海炮'&&u.x===0&&x===0&&Math.abs(y-u.y)===1&&!unitAt(x,y)&&!isBlockedTile(x,y,gameState.gameMode)){
            if(typeof pushUndo==='function')pushUndo('移动');
            u.y=y;addLog(`海炮沿轨道移动至(0,${y})`);pushSound('move');completeUnitAction(u,u.side);return true;
        }
        const path=infantryMovePath(u,x,y);if(!path){addLog('无法移动到目标');return false;}
        if(typeof pushUndo==='function')pushUndo('移动');
        if(gameState.gameMode==='pirate'&&!u.boarded&&path.some(p=>isPirateWaterTile(p.x,p.y))&&hasBoatAt(u.x,u.y)){
            const boat=gameState.pirateBoatPoints.find(p=>p.x===u.x&&p.y===u.y&&!p.used);if(boat)boat.used=true;u.boarded=true;pushSound('board');
        }
        for(const p of path){
            u.x=p.x;u.y=p.y;
            holyPickupDragonMarks();
            const mine=getMineAffectingTile(u,p.x,p.y);if(mine){triggerMine(mine,u,u.side,p.x,p.y);break;}
            if(gameState.gameMode==='fog'&&getGhost().units.some(g=>g.type==='鬼魂'&&!g.destroyed&&g.x===p.x&&g.y===p.y)){
                triggerGhostEncounter(u,p.x,p.y);if(u.destroyed||u.chaos>0)break;
            }
            if(gameState.gameMode==='neon')neonPickup(u);
        }
        addLog(`${getFactionName(u.side)}${u.type}移动至(${u.x},${u.y})`);pushSound('move');updateBoarding(u);completeUnitAction(u,u.side);return true;
    }
    function tryAttack(att,def,x=def.x,y=def.y){
        if(!canUnitAct(att,att.side)||!isValidInfantryAttack(att,def)||x!==def.x||y!==def.y){addLog('不在攻击范围或单位不能行动');return false;}
        if(typeof pushUndo==='function')pushUndo('攻击');
        return performUnitAttack(att,def,{occupy:true,finish:true,crossBonus:canCrossFortificationAttack(att,x,y,att.side)?1:0});
    }
    function tryRemoveChaos(logi,target){
        if(!canUnitAct(logi,logi.side)||!canHealTarget(logi,target))return false;
        if(typeof pushUndo==='function')pushUndo('医疗');
        let success=true;
        if(unitHasBuff(logi,'medical_center')){const n=rollDie();success=n>2;addLog(`🏥 急救中心投点:${n} → ${success?'成功':'医疗失败'}`);}
        if(success){
            target.chaos=Math.max(0,(target.chaos||0)-1);
            if(gameState.gameMode==='neon'&&logi.type==='后勤兵'&&neonTraitKey(logi)==='nano'&&!neonTurnFlag(logi,'nano')&&target.chaos>0){
                neonMarkTurn(logi,'nano');target.chaos-=1;
                addLog('🧬 纳米云：额外解除 1 层混乱');
            }
            addLog(`🛠️ 解除混乱，剩余${target.chaos}层`);
        }
        completeUnitAction(logi,logi.side);return success;
    }

    function deployUnit(x,y){
    // 联机模式：双方可同时部署，具体阵营由 deployFor 校验。
    var t=gameState.pendingDeployType; if(!t) return;
    const armoryDef=ARMORY_UNITS[t];
    /* 海盗：普通炮兵→海炮；军火库的兵种保持原样 */
    if(!armoryDef){
        if(gameState.gameMode==='pirate'){ if(t==='炮兵') t='海炮'; }
        else if(t==='海炮'){ addLog('海炮仅限海盗模式'); return; }
    }
    const p=getPlayer(gameState.deploySide);
    const arm=gameState.armory && gameState.armory[gameState.deploySide];
    const free=!!(arm&&arm.free);
    const cost=armoryDef?(free?0:armoryDef.cost):unitDeployCost(t); if(p.resources<cost) return;
    /* 模式2：根据模式使用行列范围 */
    if(!isInTerritory(x,y,gameState.deploySide,gameState.gameMode)) return;
    if(isBlockedTile(x,y,gameState.gameMode)) return;
    if(neonDeployLocked(x,y)){addLog('📦 喷包区开局不可部署；这里会在每轮喷出数据包，单位可正常通行');return;}
    if(unitAt(x,y)) return;
    /* 海盗: 快艇生成点不可部署 */
    if(gameState.gameMode==='pirate' && isPirateBoatPoint(x,y)) return;
    if(t==='后勤兵' && p.units.filter(u=>u.type==='后勤兵'&&!u.destroyed).length>=1) return;
    if(armoryDef){
        if(!arm || arm.choice!==t || arm.deployed) return;
        if(typeof pushUndo==='function')pushUndo('部署');
        const u=createArmoryUnit(t,x,y,gameState.deploySide);
        if(free)u.freeArmory=true;
        p.units.push(u);
        p.resources-=cost; arm.deployed=true; renderAll(); return;
    }
    if(typeof pushUndo==='function')pushUndo('部署');
    p.units.push(createUnit(t, x, y, gameState.deploySide)); p.resources-=cost; renderAll();
}
    function removeUnit(x,y){ const occ=unitAt(x,y); if(!occ||occ.side!==gameState.deploySide) return; if(typeof pushUndo==='function')pushUndo('拆除'); const arm=gameState.armory&&gameState.armory[occ.side]; const cost=(occ.unit.freeArmory||(occ.unit.armoryType&&arm&&arm.free))?0:armoryUnitCost(occ.unit); occ.unit.destroyed=true; getPlayer(gameState.deploySide).resources+=cost; if(occ.unit.armoryType && arm) arm.deployed=false; renderAll(); }

    function factionAlive(side){
        const alive=u=>!u.destroyed&&(u.spied?u.originalSide:u.side)===side&&!['地雷','防御工事','墓碑'].includes(u.type);
        if(gameState.gameMode==='mine'){
            return getAllUnits().some(alive)||mineUnitsOf(side).some(alive);
        }
        const combat=getAllUnits().filter(alive);
        if(!combat.length)return false;
        if(gameState.gameMode==='holy'&&!combat.some(u=>u.layer!=='sky'))return false;
        return true;
    }
    function checkTurnEnd(){
        if(gameState.gameOver || gameState.phase!=='ACTION' || gameState.turnPhase!=='ACTION' || gameState.imperialActing || gameState.ghostActing || gameState.skillTargetRequest || gameState.pendingModeEvent || gameState.wannanIncidentPrompt) return;
        checkVictory();
        if(gameState.gameOver) return;
        const side=gameState.activeSide;
        if(hasActionableUnits(side)) return;
        const p=getPlayer(side);
        if((p.cmd||0)<=0){ endTurn(); return; }
        // 还有指挥点但已无单位可动：保留回合，明确提示玩家手动结束，避免“剩2点却突然换手”。
        const noticeKey=gameState.turn+':'+side;
        if(gameState.noActionNotice!==noticeKey){
            gameState.noActionNotice=noticeKey;
            addLog(`⚡ ${getFactionName(side)}已无单位可行动，仍有 ${p.cmd} 指挥点——点击「结束回合」交给对方`);
            renderAll();
        }
    }
    function checkVictory(){
        if(gameState.phase!=='ACTION' || gameState.gameOver || gameState.tutorial) return;
        if(gameState.gameMode==='tide'){
            const t=tideState();
            if(t.seals.red.hp<=0||t.seals.blue.hp<=0){
                if(t.seals.red.hp<=0&&t.seals.blue.hp<=0) showVictory('潮胜 · 双方镇石俱毁');
                else showVictory(t.seals.red.hp>0?'红方胜利 · 蓝方镇石崩毁':'蓝方胜利 · 红方镇石崩毁');
                return;
            }
            if(gameState.turn>=ENDGAME_HARD_TURN && tideTimeoutCheck()) return;
        }
        if(gameState.gameMode==='mine' && gameState.turn>=ENDGAME_HARD_TURN && mineCheckDeadline()) return;
        if(gameState.gameMode==='beacon' && gameState.turn>=ENDGAME_HARD_TURN && beaconTimeoutCheck()) return;
        if(gameState.gameMode==='neon'){
            if(gameState.turn>=ENDGAME_HARD_TURN && neonTimeoutCheck()) return;
            const np=neonState().protocols;
            if(np.red>=NEON_PROTOCOL_TARGET){ showVictory('红方胜利 · 系统接管'); return; }
            if(np.blue>=NEON_PROTOCOL_TARGET){ showVictory('蓝方胜利 · 系统接管'); return; }
        }
        /* 其余模式（经典/雪原/海盗/雾夜/城邦）第20回合仍未分胜负时使用通用终局判定。 */
        if(gameState.turn>=ENDGAME_HARD_TURN && !['tide','mine','beacon','neon','holy'].includes(gameState.gameMode)){
            if(genericTimeoutCheck()) return;
        }
        if(gameState.gameMode==='fog'){
            const redAlive=factionAlive('red'),blueAlive=factionAlive('blue');
            if(!redAlive&&!blueAlive){ showVictory('鬼魂阵营胜利 · 红蓝双方全灭'); return; }
            if(!redAlive){ showVictory('蓝方胜利'); return; }
            if(!blueAlive){ showVictory('红方胜利'); return; }
            return;
        }
        const factions=gameState.gameMode==='wannan'?['red','blue','imperial']:['red','blue'];
        const alive=factions.filter(factionAlive);
        if(alive.length<=1){
            if(typeof levelState!=='undefined' && levelState.active && levelState.level && alive.length===1 && alive[0]==='red'){
                if(typeof levelObjectiveFailed==='function' && levelObjectiveFailed()){showVictory('蓝方胜利 · 任务失败');return;}
                if(typeof levelObjectiveMet==='function' && levelObjectiveMet()){showVictory('红方胜利 · 任务完成');return;}
                if(typeof levelCanContinueWithoutEnemies==='function' && levelCanContinueWithoutEnemies()){
                    const key=(gameState.levelId||'level')+':'+gameState.turn;
                    if(gameState.levelStallNotice!==key){
                        gameState.levelStallNotice=key;
                        const L=levelData();
                        addLog('⏳ 敌军已无战斗单位，但任务尚未完成：'+(L?L.objectiveText(levelState.level.objective):'请继续完成目标'));
                    }
                    return;
                }
            }
            showVictory(alive.length ? getFactionName(alive[0])+'胜利' : '双方同归于尽 · 平局');
        }
    }
    function showVictory(w){
        if(gameState.gameOver) return;
        gameState.gameOver=true; gameState.winner=w;
        gameState.skillTargetRequest=null; gameState.pendingModeEvent=null;
        gameState.imperialActing=false; gameState.ghostActing=false;
        clearGameTimers();
        addLog(w); renderAll();
    }
    function surrenderGame(side){
        if(!['red','blue'].includes(side) || gameState.gameOver) return false;
        showVictory(`${getFactionName(side==='red'?'blue':'red')}胜利 · 对方投降`);
        return true;
    }
    function endTurn(force=false){
        if(gameState.phase!=='ACTION' || gameState.gameOver || gameState.pendingModeEvent || gameState.skillTargetRequest || gameState.wannanIncidentPrompt) return;
        if((gameState.imperialActing||gameState.ghostActing)&&!force) return;
        const prev=gameState.activeSide, p=getPlayer(prev);
        // Reversal choices are resolved before handing the board to the next faction.
        if(p.tempEffects.reversalCount>0 && !p.tempEffects.reversalSettled){
            const count=p.tempEffects.reversalCount;
            p.tempEffects.reversalSettled=true;
            function chooseRemaining(n){
                if(n<=0 || !skillCandidates({validType:'unit',filter:chaosFilter}).length){ endTurn(force); return; }
                const started=startSkillTarget(7,'反转','回合结束：选择消除一层混乱',1,'unit',chaosFilter,targets=>{
                    targets[0].chaos=Math.max(0,targets[0].chaos-1);
                    chooseRemaining(n-1);
                },{publicEvent:true});
                if(!started)endTurn(force);
            }
            chooseRemaining(count); return;
        }
        if(p.tempEffects.ptsdUnits) p.tempEffects.ptsdUnits.forEach(id=>{
            const u=getAllUnits().find(v=>v.id===id&&!v.destroyed);
            if(u) addUnitChaos(u,1,null);
        });
        p.units.forEach(u=>{
            if(!u.destroyed && u.temporary && u.expiresAt==='end_of_turn') {u.destroyed=true;addLog('加急生产的临时车已消失');}
            if(u.suppressed && u.suppressedUntil==='enemy_turn_end') u.suppressed=false;
            u.freeAction=false; u.freeSecondAction=false; u.multiActionRemaining=undefined;
        });
        const cleanupUnits=getAllUnits();
        if(gameState.gameMode==='mine')cleanupUnits.push(...mineAllUnits());
        cleanupUnits.forEach(u=>{
            const smoke=(u.tempBuffs||[]).includes('smoke_screen');
            u.tempBuffs=smoke?['smoke_screen']:[]; u.tempAttackBonus=0;
            if(u.spied && u.spyController===prev){const original=u.originalSide;transferSkillUnit(u,original);u.spied=false;delete u.spyController;delete u.originalSide;}
        });
        const impeccable=p.tempEffects.impeccable,autoCounter=p.tempEffects.autoCounter;
        p.tempEffects={...(impeccable?{impeccable:true}:{}),...(autoCounter?{autoCounter:true}:{})};
        p.hasUsedCard=false; p.skillsUsedThisTurn=0;
        tickSkillDurations(prev);
        gameState.blockedTiles=(gameState.blockedTiles||[]).filter(t=>t.expiresSide && t.expiresSide!==prev);
        gameState.selectedUnitId=null; gameState.selectedCardId=null; gameState.cardUseMode=false; gameState.doubleCardMode=false; gameState.engineerBuildId=null;
        gameState.imperialActing=false; gameState.ghostActing=false;
        if(prev==='red'||prev==='blue') p.sp+=1;
        if(typeof experimentalHolyChaos!=='undefined' && experimentalHolyChaos==='collapse' && gameState.gameMode==='holy' && ['red','blue'].includes(prev)){
            p.units.filter(u=>!u.destroyed&&(u.chaos||0)>=3).forEach(u=>{
                u.chaos=0;damageUnit(u,null,{direct:true});
                addLog(`💥 混乱崩溃：${getFactionName(prev)}${u.type}在混沌中解体`);
            });
        }
        if((prev==='red'||prev==='blue') && p.lastingEffects && p.lastingEffects.commanderDeathChaos){
            const cdc=p.lastingEffects.commanderDeathChaos;
            cdc.turns-=1;
            if(cdc.turns<=0){
                cdc.unitIds.forEach(id=>{const u=p.units.find(v=>v.id===id&&!v.destroyed);if(u)u.chaos=Math.max(0,(u.chaos||0)-1);});
                delete p.lastingEffects.commanderDeathChaos;
                addLog('🎖️ 指挥车遗留混乱已消去');
            }
        }
        if((prev==='red'||prev==='blue') && (p.smoothComboRemainingRounds||0)>0) p.smoothComboRemainingRounds--;
        checkVictory(); if(gameState.gameOver) return;
        const order=gameState.gameMode==='wannan'?['red','blue','imperial']:gameState.gameMode==='fog'?['red','blue','ghost']:['red','blue'];
        let index=order.indexOf(prev), next;
        for(let i=0;i<order.length;i++){
            index=(index+1)%order.length;
            if(index===0){gameState.turn++;gameState.roundStartPending=true;}
            next=order[index];
            if(next==='ghost' || factionAlive(next)) break;
        }
        gameState.activeSide=next;
        gameState.turnSerial=(gameState.turnSerial||0)+1;
        if(gameState.roundStartPending){gameState.roundStartPending=false;startRound();}
        else beginTurn();
    }
    function beginTurn(){
        if(gameState.gameOver || gameState.pendingModeEvent || gameState.wannanIncidentPrompt) return;
        const side=gameState.activeSide,p=getPlayer(side),next=p.nextTurnEffects||{};
        p.cmd=Math.max(0,p.baseCmd-(next.cmdPenalty||0)+(next.cmdBonus||0));
        if(gameState.gameMode==='neon'){
            neonSyncPackets();
            p.units.forEach(u=>{if(!u.destroyed&&(u.layer||'ground')==='ground')neonPickup(u);});
            if(neonEventActive('blackout'))p.cmd=Math.max(0,p.cmd-1);
            if(neonResolveUpload(side))return;
        }
        if(gameState.gameMode==='beacon'&&beaconTowerCount(side)>=1) p.sp+=1;
        p.tempEffects={...(p.tempEffects.impeccable?{impeccable:true}:{}),...next};
        delete p.tempEffects.cmdPenalty;delete p.tempEffects.cmdBonus; p.nextTurnEffects={};
        p.hasDrawnThisTurn=false; p.drawResolved=false; p.hasUsedCard=false; p.skillsUsedThisTurn=0;
        p.units.forEach(u=>{
            u.actionsThisTurn=0;
            if((u.tempBuffs||[]).includes('smoke_screen')) u.tempBuffs=u.tempBuffs.filter(b=>b!=='smoke_screen');
            // Turrets fire once per own turn; artillery ammo is persistent.
            if(u.permaBuffs.includes('turret')) {u.hasAttacked=false;u.remainingActions=1;}
        });
        if(gameState.gameMode==='mine')mineUnitsOf(side).forEach(u=>{u.actionsThisTurn=0;});
        if(gameState.gameMode==='tide'){tideState().marksUsed[side]=false;gameState.tideMode=null;}
        if(gameState.gameMode==='holy'&&(side==='red'||side==='blue')){holyAddControlScore(side);holyGrantRegionRewards(side);}
        gameState.turnPhase=(side==='imperial'||side==='ghost')?'ACTION':'DRAW';
        if(side==='imperial'){
            gameState.imperialActing=true;
            gameState.imperialUnitsActedThisTurn=0;
            gameState.imperialMaxActionsThisTurn=calculateImperialMaxActions();
            scheduleGame(actImperialUnit,400);
        } else if(side==='ghost'){
            gameState.ghostActing=true;gameState.ghostUnitsActedThisTurn=0;
            gameState.ghostMaxActions=Math.min(3,getGhost().units.filter(u=>u.type==='鬼魂'&&!u.destroyed&&u.chaos===0).length);
            scheduleGame(actGhostUnit,400);
        }
        addLog(`=== ${getFactionName(side)} · 第${gameState.turn}回合 ===`);
        renderAll();
    }
    function startRound(){
        if(gameState.gameOver) return;
        if(gameState.gameMode==='holy'&&holyCheckScoreVictory())return;
        gameState.awaitingRoundTurn=true;
        gameState.ghostEncounteredThisRound=[];
        if(gameState.gameMode==='tide'){
            if(gameState.turn>1){
                tideResolveGrowth();
                if(gameState.gameOver) return;
                tideRepairSeals();
            }
            tideState().preview=tidePlanGrowth();
        }
        if(gameState.gameMode==='beacon'&&gameState.turn>1){
            if(beaconResolve()) return;
        }
        if(gameState.gameMode==='neon'){
            neonEventTick();
            neonSpawnTick();
        }
        if(gameState.snowBlockedUntil && gameState.turn>=gameState.snowBlockedUntil){
            gameState.snowBlockedTiles=[];gameState.snowBlockedUntil=0;addLog('大雪封路解除');
        }
        /* 天候先结算，公共事件/据点/鬼魂随后读取本回合天气。 */
        advanceWeather();
        applyPirateDrift();
        if(gameState.gameMode==='wannan'){
            if(factionAlive('imperial')){
                const plan={4:'步兵',8:'车',12:'炮兵'};
                const reinforcementType=plan[gameState.turn];
                if(reinforcementType){
                    const empty=[];
                    for(let x=4;x<=6;x++)for(let y=0;y<ROWS;y++)if(!unitAt(x,y))empty.push({x,y});
                    if(empty.length){
                        const buffs=reinforcementType==='车'?['elite_chariot','armored']:reinforcementType==='炮兵'?['elite_artillery']:['elite_infantry'];
                        getImperial().units.push(createUnit(reinforcementType,empty[0].x,empty[0].y,'imperial',{permaBuffs:buffs}));
                        addLog(`🏛️ 波斯远征军第${gameState.turn}回合增援1个${reinforcementType}`);
                    }
                }
                if([6,9].includes(gameState.turn)){
                    const combat=getImperial().units.filter(u=>!u.destroyed&&!['防御工事','地雷'].includes(u.type)).length;
                    if(combat<=6){
                        const empty=[];
                        for(let x=4;x<=6;x++)for(let y=0;y<ROWS;y++)if(!unitAt(x,y))empty.push({x,y});
                        if(empty.length){
                            getImperial().units.push(createUnit('步兵',empty[0].x,empty[0].y,'imperial',{permaBuffs:['elite_infantry']}));
                            addLog('🏛️ 波斯远征军兵力告急，获得1个精锐步兵增援');
                        }
                    }
                }
            }
            if(gameState.turn===12 && gameState.incidentTriggered){
                const side=gameState.incidentInitiator==='red'?'blue':'red',types=['步兵','后勤兵'];
                for(let x=0;x<COLS && types.length;x++)for(let y=0;y<ROWS && types.length;y++)if(isInTerritory(x,y,side,gameState.gameMode)&&!unitAt(x,y))getPlayer(side).units.push(createUnit(types.shift(),x,y,side));
                addLog(`${getFactionName(gameState.incidentInitiator==='red'?'blue':'red')}获得步兵和后勤兵增援`);
            }
        }
        if(gameState.gameMode==='pirate'){
            const claimed=gameState.pirateStrongpointClaimed||(gameState.pirateStrongpointClaimed={red:[],blue:[]});
            const held={red:0,blue:0};
            [[5,1],[5,3]].forEach(([x,y])=>{
                const occ=unitAt(x,y);
                if(!occ||!['red','blue'].includes(occ.side))return;
                held[occ.side]++;
                const key=x+','+y;
                if(!claimed[occ.side].includes(key)){
                    claimed[occ.side].push(key);
                    getPlayer(occ.side).sp++;pushSound('pirate_point');
                    addLog(`⚓ ${getFactionName(occ.side)}首次占领据点(${x},${y})，技能点+1`);
                }
            });
            for(const side of ['red','blue']) if(held[side]>0){
                getPlayer(side).sp++;
                addLog(`${getFactionName(side)}占据据点，本回合技能点+1`);
            }
            if(gameState.turn%3===0){
                const refreshed=pirateRefreshBoats(1);
                if(refreshed)addLog(`⛵ 快艇补给：补充${refreshed}艘快艇`);
            }
            if(gameState.pirateVortexTiles.length && gameState.turn>=gameState.pirateVortexUntil){gameState.pirateVortexTiles=[];gameState.pirateVortexTurns=0;addLog('漩涡消散');}
            if(gameState.turn===9&&!gameState.seaMonsterTriggered)addLog('🐙 海怪预警：下回合海怪将袭击据点(5,1)、(5,3)');
            if(gameState.turn===10&&!gameState.seaMonsterTriggered){gameState.seaMonsterTriggered=true;eventSeaMonster();}
            if(gameState.pirateNextEvent && gameState.pirateEventDueTurn===gameState.turn){
                const event=gameState.pirateNextEvent;
                gameState.pirateNextEvent=null;gameState.pirateEventDueTurn=0;
                triggerPirateEvent(event);
            }
            if(!gameState.pirateNextEvent && [3,6,9,12].includes(gameState.turn+1)){
                const event=preparePirateEvent(gameState.turn+1);
                gameState.pirateNextEvent=event;gameState.pirateEventDueTurn=gameState.turn+1;
                addLog(`🏴‍☠️ 海盗预警：下回合【${event.name}】${pirateEventTargetText(event)}`);
            }
        }
        if(gameState.gameMode==='fog'){
            if(gameState.turn===10&&!gameState.fogRound12Forecast){
                gameState.fogRound12Forecast=true;
                addLog('🌫️ 预兆：第12回合墓地将补充至6个，并强制雾夜3回合');
            }
            const graveCount=()=>getGhost().units.filter(u=>u.type==='墓碑'&&!u.destroyed).length;
            if(gameState.turn===12){
                const before=graveCount();
                if(before<6){
                    const positions=[];
                    for(let x=4;x<=6;x++)for(let y=0;y<ROWS;y++)if(!unitAt(x,y))positions.push({x,y});
                    for(let i=positions.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]];}
                    for(const position of positions){
                        if(graveCount()>=6)break;
                        getGhost().units.push(createUnit('墓碑',position.x,position.y,'ghost',{hp:1}));
                    }
                    pushSound('fog_graveyard');
                    addLog(`🌫️ 第12回合：墓地补充至${graveCount()}个`);
                }else addLog('🌫️ 第12回合：墓地数量已足够，不再补充');
                gameState.fogNightForcedUntil=Math.max(gameState.fogNightForcedUntil||0,15);
                gameState.fogDawnUntil=0;
                gameState.fogRound12Forecast=false;
            }
            const graves=graveCount();
            if(graves<=3)gameState.fogDawnUntil=Math.max(gameState.fogDawnUntil||0,gameState.turn+3);
            let night=graves>=4;
            if(gameState.fogDawnUntil && gameState.turn<gameState.fogDawnUntil)night=false;
            if(gameState.fogNightForcedUntil && gameState.turn<gameState.fogNightForcedUntil)night=true;
            if(gameState.fogStateOverride!==null)night=!!gameState.fogStateOverride;
            const wasNight=gameState.fogNight;
            gameState.fogNight=night;
            syncFogWeather();
            if(wasNight!==night){
                if(night)addLog(`🌫️ 雾夜降临${gameState.turn===12?'（第12回合强制3回合）':''}`);
                else { pushSound('fog_dawn'); addLog('🌅 初晖渐明：鬼魂显形'); }
            }else if(gameState.turn===12){addLog('🌫️ 第12回合：强制雾夜3回合');}
            spawnGhosts();
        }
        if(gameState.gameMode==='snow' && !(typeof levelState!=='undefined'&&levelState.level&&levelState.level.minigame&&levelState.level.minigame.noSnowEvents)){
            if(gameState.snowNextEvent && gameState.snowEventDueTurn===gameState.turn){
                const event=gameState.snowNextEvent;
                gameState.snowNextEvent=null;gameState.snowEventDueTurn=0;
                triggerSnowEvent(event);
            }
            if(!gameState.snowNextEvent && [3,6,9,12].includes(gameState.turn+1)){
                const event=prepareSnowEvent(gameState.turn+1);
                gameState.snowNextEvent=event;gameState.snowEventDueTurn=gameState.turn+1;
                addLog(`❄️ 雪原预警：下回合【${event.name}】${event.strong?`（${weatherStrongReasonLabel(event.strongReason)||'强化'}）`:''}${snowEventTargetText(event)}`);
            }
        }
        /* 通用终局加速：第15回合起攻击方点数 +1，每2回合提升一级，封顶 +3；烽燧阵线不启用。
           第20回合仍未分出胜负时强制判定。 */
        if(gameState.gameMode!=='beacon'){
            const bonus=endgameAttackBonus();
            if(gameState.turn===ENDGAME_BONUS_START-1)addLog('⚔️ 预告：下回合起进入终局加速，攻击方点数每2回合 +1（最高 +3）');
            if(bonus && gameState.endgameBonusTier!==bonus){
                gameState.endgameBonusTier=bonus;
                addLog(`⚔️ 终局加速：第${gameState.turn}回合起，攻击方点数 +${bonus}（最高 +3）`);
            }
            if(gameState.turn===ENDGAME_HARD_TURN-1)addLog('⏳ 预告：下回合仍未分胜负将强制进行终局判定');
        }
        if(gameState.gameMode==='holy')holyOnRoundStart();
        if(gameState.gameMode==='mine'){mineOnRoundStart();if(gameState.gameOver)return;}
        if(!gameState.pendingModeEvent) resumeRoundStart();
        else renderAll();
    }
    function resumeRoundStart(){
        if(!gameState.awaitingRoundTurn || gameState.gameOver) return;
        gameState.awaitingRoundTurn=false;
        beginTurn();
    }
    function renderAll(){ if(gameState.gameMode==='holy') holyPickupDragonMarks(); notify(); }
    function resetGame(){
        if(typeof levelResetBegin==='function')levelResetBegin();
        tutorialState={active:false,id:null,step:0,refs:{},done:[]};
        document.getElementById('tutorialGuide')?.setAttribute('hidden','');
        document.getElementById('tutorialCompleteOverlay')?.setAttribute('hidden','');
        document.getElementById('tutorialSelectOverlay')?.setAttribute('hidden','');
        const ao=document.getElementById('armoryOverlay');if(ao)ao.classList.remove('show');
        clearGameTimers();gameState=createInitialGameState();logMessages=[];fxQueue.length=0;
        undoStack.length=0;closeCardHelp();updateUndoButton();
        debugState.active=false;debugState.deployMode=false;
        ['victoryOverlay','drawOverlay','targetHint','rulesPopup','debug-panel'].forEach(id=>document.getElementById(id).style.display='none');
        document.getElementById('copyrightPopup')?.classList.remove('show');
        document.getElementById('weatherOverlay')?.classList.remove('show');
        document.getElementById('weather-chip')?.style.setProperty('display','none');
        lastSnowWeatherKey='';
        snowEffectToken++;
        document.body.dataset.weather='';
        if(window.ChaosWeatherFX) window.ChaosWeatherFX.clear();
        document.querySelector('.game-container').style.display='none';
        document.getElementById('modeSelectOverlay').style.display='flex';
        document.body.className='';document.getElementById('snow-canvas').style.display='none';
        document.querySelectorAll('.cannonball').forEach(el=>el.remove());
        clearDeploySelection();renderAll();
        if(typeof levelResetEnd==='function')levelResetEnd();
    }

    // ────────────────────────────────────────────────────────────────
    // 服务器 API：所有入口都带 side，内部复用原版规则函数。
    // ────────────────────────────────────────────────────────────────
    function ok(extra) { return Object.assign({ ok: true }, extra || {}); }
    function fail(error) { return { ok: false, error: error || '操作不合法' }; }
    function isHuman(side) { return side === 'red' || side === 'blue'; }
    function myTurn(side) {
        return isHuman(side) && gameState.phase === 'ACTION' && !gameState.gameOver && gameState.activeSide === side && !gameState.wannanIncidentPrompt;
    }

    // 联机版：双方独立提交部署，两边都完成才开局。
    function deployReadyState() {
        if (!gameState.deployReady || typeof gameState.deployReady.red !== 'boolean') {
            gameState.deployReady = { red: false, blue: false };
        }
        return gameState.deployReady;
    }

    function startGame(mode) {
        if (!MODES.includes(mode)) return fail('未知模式');
        clearGameTimers();
        gameState = createInitialGameState();
        gameState.gameMode = mode;
        gameState.deployReady = { red: false, blue: false };
        if (mode === 'holy') {
            gameState.red.resources = 30; gameState.blue.resources = 30;
            gameState.red.baseCmd = 3; gameState.blue.baseCmd = 3;
            gameState.red.cmd = 3; gameState.blue.cmd = 3;
        }
        if (mode === 'beacon') {
            gameState.red.baseCmd = 3; gameState.blue.baseCmd = 3;
            gameState.red.cmd = 3; gameState.blue.cmd = 3;
        }
        if (mode === 'neon') neonState();
        logMessages = [];
        fxQueue.length = 0;
        if (mode === 'pirate') gameState.pirateBoatPoints = [{x:3,y:0},{x:3,y:2},{x:3,y:4},{x:7,y:0},{x:7,y:2},{x:7,y:4}];
        if (mode === 'fog') initFogGraves();
        if (mode === 'mine') initMineMode();
        addLog(MODE_NAMES[mode] + ' · 双方进入军火库');
        renderAll();
        return ok();
    }

    const DEPLOYABLE_TYPES = new Set(['步兵', '车', '炮兵', '地雷', '后勤兵', '防御工事', ...ARMORY_LOW_KEYS, ...ARMORY_HIGH_KEYS]);
    function armoryChoiceValid(side, unitType) {
        const arm = gameState.armory && gameState.armory[side];
        return !!(ARMORY_UNITS[unitType] && arm && arm.choice === unitType && !arm.deployed);
    }
    function deployFor(side, unitType, x, y) {
        if (gameState.gameOver) return fail('对局已结束');
        if (gameState.phase !== 'DEPLOY') return fail('不在部署阶段');
        if (!isHuman(side)) return fail('无效阵营');
        if (deployReadyState()[side]) return fail('你已完成部署，等待对方');
        if (!DEPLOYABLE_TYPES.has(unitType)) return fail('该兵种不能通过部署放置');
        if (ARMORY_UNITS[unitType] && !armoryChoiceValid(side, unitType)) return fail('未选择该军火库单位，或已经部署过');
        if (!Number.isInteger(x) || !Number.isInteger(y)) return fail('坐标无效');
        const player = getPlayer(side);
        const before = player.units.length;
        const resourcesBefore = player.resources;
        gameState.deploySide = side;
        gameState.pendingDeployType = unitType;
        gameState.removeMode = false;
        try { deployUnit(x, y); } catch (error) { return fail('部署失败：' + error.message); }
        const deployed = player.units.length > before;
        renderAll();
        if (!deployed) {
            if (player.resources === resourcesBefore) return fail('无法部署：位置或资源不满足');
            return fail('无法在该位置部署');
        }
        return ok({ unitId: player.units[player.units.length - 1].id });
    }

    function removeFor(side, x, y) {
        if (gameState.gameOver) return fail('对局已结束');
        if (gameState.phase !== 'DEPLOY' || !isHuman(side)) return fail('不在部署阶段');
        if (deployReadyState()[side]) return fail('你已完成部署，等待对方');
        const occ = unitAt(x, y);
        if (!occ || occ.side !== side) return fail('该格没有你的单位');
        gameState.deploySide = side;
        removeUnit(x, y);
        renderAll();
        return ok();
    }

    function finishDeployFor(side) {
        if (gameState.gameOver) return fail('对局已结束');
        if (gameState.phase !== 'DEPLOY' || !isHuman(side)) return fail('不在部署阶段');
        const ready = deployReadyState();
        if (ready[side]) return fail('你已完成部署，等待对方');
        const p = getPlayer(side);
        if (!p.units.some(u => !u.destroyed && !['地雷','防御工事'].includes(u.type))) {
            return fail('请至少部署一个可以战斗的单位');
        }
        ready[side] = true;
        addLog(getFactionName(side) + '完成部署');
        if (ready.red && ready.blue) {
            if (gameState.gameMode === 'wannan') deployImperialForces();
            gameState.phase = 'ACTION'; gameState.activeSide = 'red'; gameState.turn = 1;
            gameState.deploySide = 'red';
            addLog('双方部署完成，开始对局');
            startRound();
        } else {
            addLog('等待' + getFactionName(side === 'red' ? 'blue' : 'red') + '完成部署');
        }
        renderAll();
        return ok();
    }

    function clickFor(side, x, y, layer) {
        if (gameState.gameOver) return fail('对局已结束');
        if (!Number.isInteger(x) || !Number.isInteger(y)) return fail('坐标无效');
        const targetLayer = layer === 'sky' ? 'sky' : layer === 'mine' ? 'mine' : 'ground';
        const req = gameState.skillTargetRequest;
        if (req) {
            if (req.chooserSide !== side) return fail('当前由对方选择目标');
            if (targetLayer === 'sky') return fail('技能目标不能选择天空');
            if (targetLayer === 'mine' && gameState.gameMode !== 'mine') return fail('该层在当前模式中不可用');
            if (!handleSkillTargetClick(x, y, targetLayer)) return fail('无效的技能目标');
            renderAll();
            return ok();
        }
        if (gameState.phase === 'DEPLOY') return fail('部署阶段请使用部署操作');
        if (gameState.phase !== 'ACTION') return fail('当前不能行动');
        if (gameState.activeSide !== side) return fail('不是你的回合');
        if (gameState.wannanIncidentPrompt) return fail('请先处理城邦裂变选择');
        if (gameState.gameMode === 'holy' && targetLayer === 'sky') {
            onHolySkyClick(side, x, y);
            renderAll();
            return ok();
        }
        if (gameState.gameMode === 'mine' && targetLayer === 'mine') {
            onMineCellClick(side, x, y);
            renderAll();
            return ok();
        }
        if (targetLayer !== 'ground') return fail('该层在当前模式中不可用');
        const selected = gameState.selectedUnitId ? getAllUnits().find(u => u.id === gameState.selectedUnitId && !u.destroyed) : null;
        if (selected && selected.layer === 'sky') gameState.selectedUnitId = null;
        onCellClick(x, y);
        renderAll();
        return ok();
    }

    function endTurnFor(side) {
        if (!myTurn(side)) return fail('不是你的回合');
        endTurn();
        renderAll();
        return ok();
    }

    function wannanIncidentChoiceFor(side, accept) {
        if (!isHuman(side)) return fail('无效阵营');
        const prompt = gameState.wannanIncidentPrompt;
        if (!prompt || prompt.side !== side) return fail('当前没有待处理的城邦裂变选择');
        const success = resolveWannanIncidentChoice(side, !!accept);
        renderAll();
        return success ? ok() : fail('选择失败');
    }

    function tideModeFor(side, mode) {
        if (!isHuman(side)) return fail('无效阵营');
        if (gameState.gameMode !== 'tide') return fail('当前模式没有潮汐');
        if (gameState.gameOver) return fail('对局已结束');
        if (gameState.activeSide !== side) return fail('不是你的回合');
        if (gameState.phase !== 'ACTION' || gameState.turnPhase !== 'ACTION') return fail('请先开始行动');
        if (mode !== 'purge' && mode !== 'mark') { gameState.tideMode = null; renderAll(); return ok(); }
        const success = tideToggleMode(mode);
        renderAll();
        return success ? ok() : fail(mode === 'purge' ? '附近没有可斩的潮格' : '附近没有可引潮的空格');
    }

    function surrenderFor(side) {
        if (!isHuman(side)) return fail('无效阵营');
        if (gameState.gameOver) return fail('对局已结束');
        const success = surrenderGame(side);
        renderAll();
        return success ? ok() : fail('当前不能投降');
    }

    function drawOpenFor(side) {
        if (!myTurn(side) || gameState.turnPhase !== 'DRAW') return fail('当前不能抽卡');
        if (gameState.skillTargetRequest || gameState.skillTransaction || gameState.pendingModeEvent || gameState.skillResolving || gameState.actionInProgress) return fail('请先完成当前操作');
        drawCards();
        renderAll();
        return ok();
    }
    function drawPickFor(side, cardId) {
        if (!myTurn(side)) return fail('不是你的回合');
        const success = selectDrawCard(Number(cardId));
        renderAll();
        return success ? ok() : fail('无法购买这张卡');
    }
    function drawCancelFor(side) {
        if (!myTurn(side)) return fail('不是你的回合');
        const success = cancelDrawCards();
        renderAll();
        return success ? ok() : fail('技能点足够购买至少一张，须选择技能卡');
    }
    function drawRerollFor(side) {
        if (!myTurn(side) || gameState.turnPhase !== 'DRAW') return fail('当前不能换牌');
        if (gameState.skillTargetRequest || gameState.skillTransaction || gameState.pendingModeEvent || gameState.skillResolving || gameState.actionInProgress) return fail('请先完成当前操作');
        const success = rerollDrawCards();
        renderAll();
        return success ? ok() : fail('当前不能换一批');
    }

    function armoryChooseFor(side, unitKey) {
        if (!isHuman(side)) return fail('无效阵营');
        if (!armoryChoose(side, unitKey === null || unitKey === undefined ? null : String(unitKey))) return fail('无法选择军火库单位');
        renderAll();
        return ok();
    }

    function useCardFor(side, useDouble) {
        if (!myTurn(side)) return fail('不是你的回合');
        if (gameState.turnPhase !== 'DRAW') return fail('当前不能使用技能卡');
        if (gameState.skillTargetRequest || gameState.skillTransaction || gameState.pendingModeEvent || gameState.skillResolving || gameState.actionInProgress) return fail('请先完成当前操作');
        const p = getPlayer(side);
        if (!gameState.doubleCardMode && p.smoothComboRemainingRounds > 0 && p.skillsUsedThisTurn === 0 && useDouble) {
            // 丝滑连招按己方回合数消耗，由 endTurn 统一递减；这里只开启本回合的双卡权限。
            gameState.doubleCardMode = true;
        }
        const limit = gameState.doubleCardMode ? 2 : 1;
        if (p.skillsUsedThisTurn >= limit) return fail('本回合用卡次数已用完');
        gameState.turnPhase = 'USE_CARD'; gameState.cardUseMode = true;
        renderAll();
        return ok();
    }

    function selectCardFor(side, cardId) {
        if (!myTurn(side) || gameState.turnPhase !== 'USE_CARD' || !gameState.cardUseMode) return fail('当前不能选卡');
        if (gameState.skillTargetRequest) return fail('请先完成当前目标选择');
        const p = getPlayer(side);
        if (!p.library.includes(Number(cardId))) return fail('牌库中没有这张卡');
        gameState.selectedCardId = Number(cardId);
        renderAll();
        return ok();
    }

    function playCardFor(side) {
        if (!myTurn(side)) return fail('不是你的回合');
        const success = playSelectedCard();
        renderAll();
        return success ? ok() : fail('无法打出技能卡');
    }

    function startActionFor(side) {
        if (!myTurn(side)) return fail('不是你的回合');
        if (gameState.skillTargetRequest || gameState.skillTransaction || gameState.pendingModeEvent || gameState.skillResolving || gameState.actionInProgress) return fail('请先完成当前操作');
        gameState.turnPhase = 'ACTION'; gameState.cardUseMode = false; gameState.selectedCardId = null;
        renderAll();
        return ok();
    }

    function cancelFor(side) {
        if (gameState.gameOver) return fail('对局已结束');
        if (gameState.pendingModeEvent) return fail('公共事件须先完成目标选择');
        if (gameState.wannanIncidentPrompt) return fail('请先处理城邦裂变选择');
        if (gameState.skillTargetRequest || gameState.skillTransaction) {
            const req = gameState.skillTargetRequest;
            if (req && req.chooserSide !== side) return fail('当前由对方选择目标');
            if (cancelSkillTarget() === false) return fail('当前不能取消');
        } else {
            if (gameState.activeSide !== side) return fail('不是你的回合');
            gameState.selectedUnitId = null; gameState.tideMode = null;
            gameState.cardUseMode = false; gameState.selectedCardId = null;
            gameState.engineerBuildId = null;
            if (gameState.turnPhase === 'USE_CARD') gameState.turnPhase = 'DRAW';
        }
        renderAll();
        return ok();
    }

    function finishTargetFor(side) {
        const req = gameState.skillTargetRequest;
        if (!req) return fail('当前没有目标选择');
        if (req.chooserSide !== side) return fail('当前由对方选择目标');
        const success = finishSkillTarget();
        renderAll();
        return success ? ok() : fail('请先满足目标数量');
    }
    function cancelTargetFor(side) {
        const req = gameState.skillTargetRequest;
        if (!req) return fail('当前没有目标选择');
        if (req.chooserSide !== side) return fail('当前由对方选择目标');
        const onCancel = typeof req.onCancel === 'function' ? req.onCancel : null;
        cancelSkillTarget();
        if (onCancel) onCancel();
        renderAll();
        return ok();
    }

    function revealForPlayer(side, kind) {
        if (!isHuman(side)) return fail('无效阵营');
        if (gameState.gameOver) return fail('对局已结束');
        if (kind === 'mines') {
            // 联机版不提供主动查看地雷：避免玩家用按钮直接获得隐藏信息。
            return fail('联机版不提供查看地雷');
        } else if (kind === 'cards') {
            if (gameState.activeSide !== side || gameState.phase !== 'ACTION') return fail('只能查看当前回合的手牌');
            revealFor(side, 'cards', 5000);
        } else if (kind === 'enemy') {
            return fail('联机部署阶段无法查看对方单位');
        } else if (kind === 'ghosts') {
            // 联机版不提供主动查看鬼魂：单机版的查看按钮只是测试辅助。
            return fail('联机版不提供查看鬼魂');
        } else return fail('未知查看类型');
        return ok();
    }

    // ────────────────────────────────────────────────────────────────
    // 圣辉之战：分层地图、龙属性、天空行动、区域奖励、火山与追赶增援
    // ────────────────────────────────────────────────────────────────
    const HOLY_GROUPS = [
        { key: 'c1a', cls: 1, cells: [[3,0],[3,1],[3,2]] },
        { key: 'c1b', cls: 1, cells: [[7,2],[7,3],[7,4]] },
        { key: 'c2a', cls: 2, cells: [[4,0],[4,1],[5,0],[5,1]] },
        { key: 'c2b', cls: 2, cells: [[5,3],[5,4],[6,3],[6,4]] },
        { key: 'c3a', cls: 3, cells: [[3,3],[3,4],[4,3],[4,4]] },
        { key: 'c3b', cls: 3, cells: [[6,0],[6,1],[7,0],[7,1]] }
    ];
    const HOLY_SCORE_TARGET = 8;
    const HOLY_SCORE_DEADLINE = 18;
    const HOLY_UNIT_SOFT_CAP = 8;
    const HOLY_REINFORCE_TURNS = [4, 7, 10, 13];

    function ensureHolyState() {
        if (!gameState.dragonMarks) gameState.dragonMarks = [];
        if (!Array.isArray(gameState.holyRewardedGroups)) gameState.holyRewardedGroups = [];
        if (!gameState.holyScore) gameState.holyScore = { red: 0, blue: 0 };
    }
    function holyTerritoryTiles(side) {
        const range = getTerritoryRange('holy', side);
        if (!range) return [];
        const tiles = [];
        for (let x = range[0]; x <= range[1]; x++) {
            for (let y = 0; y < ROWS; y++) {
                if (!isBlockedTile(x, y, 'holy')) tiles.push({ x, y });
            }
        }
        return tiles;
    }
    function holyGroupCount(side, group) {
        return group.cells.filter(([x, y]) => {
            const occ = unitAt(x, y);
            return !!occ && occ.side === side && occ.unit.side === side;
        }).length;
    }
    function holyGroupMajority(side, group) {
        return holyGroupCount(side, group) >= Math.floor(group.cells.length / 2) + 1;
    }
    function holyControlledGroups(side) {
        return HOLY_GROUPS.filter(group => holyGroupMajority(side, group));
    }
    function holyControlledCells(side) {
        return HOLY_GROUPS.reduce((sum, group) => sum + holyGroupCount(side, group), 0);
    }
    function holyAddControlScore(side) {
        if (!['red', 'blue'].includes(side)) return;
        ensureHolyState();
        const groups = holyControlledGroups(side);
        if (!groups.length) return;
        gameState.holyScore[side] = (gameState.holyScore[side] || 0) + groups.length;
        addLog(`🏅 圣辉计分：控制 ${groups.length} 个区域，${getFactionName(side)} +${groups.length} 分（${gameState.holyScore[side]}/${HOLY_SCORE_TARGET}）`);
    }
    function holyCheckScoreVictory() {
        if (gameState.gameMode !== 'holy') return false;
        ensureHolyState();
        const red = gameState.holyScore.red || 0, blue = gameState.holyScore.blue || 0;
        const reached = Math.max(red, blue) >= HOLY_SCORE_TARGET;
        const deadline = gameState.turn >= HOLY_SCORE_DEADLINE;
        if (!reached && !deadline) return false;
        let winner = null;
        if (red !== blue) winner = red > blue ? 'red' : 'blue';
        else {
            const redGroups = holyControlledGroups('red').length;
            const blueGroups = holyControlledGroups('blue').length;
            if (redGroups !== blueGroups) winner = redGroups > blueGroups ? 'red' : 'blue';
            else {
                const redCells = holyControlledCells('red');
                const blueCells = holyControlledCells('blue');
                if (redCells !== blueCells) winner = redCells > blueCells ? 'red' : 'blue';
                else {
                    const redUnits = holyCombatUnits('red').length;
                    const blueUnits = holyCombatUnits('blue').length;
                    if (redUnits !== blueUnits) winner = redUnits > blueUnits ? 'red' : 'blue';
                }
            }
        }
        if (!winner) {
            showVictory('圣辉之战 · 平局');
            return true;
        }
        showVictory(getFactionName(winner) + '胜利 · 圣辉计分');
        return true;
    }
    function holyCombatUnits(side) {
        return getPlayer(side).units.filter(u => !u.destroyed && !['地雷','防御工事','墓碑','鬼魂'].includes(u.type));
    }
    function holyGroundVolcano(x, y) { return x >= 4 && x <= 6 && y === 2; }
    function holySkyVolcano(x, y) { return x === 5 && y === 2; }
    function skyUnitAt(x, y) {
        return getAllUnits().find(u => !u.destroyed && u.layer === 'sky' && u.x === x && u.y === y) || null;
    }
    function holySkyUnitsOf(side) {
        return getPlayer(side).units.filter(u => !u.destroyed && u.layer === 'sky');
    }

    function holyPickupDragonMarks() {
        if (gameState.gameMode !== 'holy') return;
        ensureHolyState();
        if (!gameState.dragonMarks.length) return;
        for (const unit of getAllUnits()) {
            if (unit.destroyed || unit.layer === 'sky') continue;
            const index = gameState.dragonMarks.findIndex(m => m.x === unit.x && m.y === unit.y);
            if (index < 0) continue;
            gameState.dragonMarks.splice(index, 1);
            unit.dragon = true;
            addLog(`🐉 ${getFactionName(unit.side)}${unit.type}被龙气缠身——它已经可以升空了！`);
            if (unit.side === 'red' || unit.side === 'blue') pushFx({ type:'dragon-pickup', x:unit.x, y:unit.y, side:unit.side });
        }
    }

    function spawnHolyDragonMarks() {
        ensureHolyState();
        for (const side of ['red', 'blue']) {
            const tiles = holyTerritoryTiles(side);
            if (!tiles.length) continue;
            const empty = tiles.filter(t => !unitAt(t.x, t.y) && !gameState.dragonMarks.some(m => m.x === t.x && m.y === t.y));
            if (empty.length) {
                const pos = empty[Math.floor(Math.random() * empty.length)];
                gameState.dragonMarks.push(pos);
                pushSound('dragon_mark');
                addLog(`🐉 ${getFactionName(side)}阵地(${pos.x},${pos.y})浮现一道龙影，静候有缘人`);
                continue;
            }
            // 没有空格：随机选择阵地上的己方地面单位，让龙气直接附体。
            const ownGround = getPlayer(side).units.filter(u => !u.destroyed && u.layer !== 'sky' && isInTerritory(u.x, u.y, side, 'holy'));
            if (!ownGround.length) {
                addLog(`🐉 ${getFactionName(side)}阵地已被龙影与守军占满，龙气无处落脚`);
                continue;
            }
            const unit = ownGround[Math.floor(Math.random() * ownGround.length)];
            unit.dragon = true;
            pushSound('dragon_mark');
            addLog(`🐉 ${getFactionName(side)}阵地的${unit.type}被龙气缠身——它已经可以升空了！`);
        }
    }

    function scheduleHolyEruptionWarning() {
        ensureHolyState();
        if (gameState.holyEruptionWarning) return;
        const group = HOLY_GROUPS[Math.floor(Math.random() * HOLY_GROUPS.length)];
        gameState.holyEruptionWarning = { key: group.key, cls: group.cls, cells: group.cells.map(([x, y]) => ({ x, y })) };
        pushFx({ type: 'eruption-warn', cells: gameState.holyEruptionWarning.cells });
        addLog(`🌋 地表深处传来沉闷的轰鸣——第${group.cls}类区域 ${group.cells.map(([x, y]) => `(${x},${y})`).join('、')} 正在聚集岩浆，下一回合喷发！`);
    }

    function triggerHolyEruption() {
        const warning = gameState.holyEruptionWarning;
        const group = warning
            ? (HOLY_GROUPS.find(g => g.key === warning.key) || HOLY_GROUPS[Math.floor(Math.random() * HOLY_GROUPS.length)])
            : HOLY_GROUPS[Math.floor(Math.random() * HOLY_GROUPS.length)];
        gameState.holyEruptionWarning = null;
        for (const [x, y] of group.cells) {
            const occ = unitAt(x, y);
            if (occ) damageUnit(occ.unit, null, { direct: true });
        }
        pushFx({ type:'eruption', cells: group.cells.map(([x, y]) => ({ x, y })) });
        addLog(`🌋 火山喷发：第${group.cls}类区域 ${group.cells.map(([x, y]) => `(${x},${y})`).join('、')} 的守军被熔岩吞没！`);
    }

    function holyGroupOccupied(side, group) {
        return group.cells.every(([x, y]) => {
            const occ = unitAt(x, y);
            return !!occ && occ.side === side && occ.unit.side === side;
        });
    }

    function holyGrantRegionRewards(side) {
        if (!['red','blue'].includes(side)) return;
        ensureHolyState();
        const groups = HOLY_GROUPS.filter(g => holyGroupOccupied(side, g) && !gameState.holyRewardedGroups.includes(side + ':' + g.key));
        if (!groups.length) return;
        for (const g of groups) gameState.holyRewardedGroups.push(side + ':' + g.key);
        pushSound('zone');
        const rewards = groups.map(g => ({ cls: g.cls, group: g }));
        const process = (i) => {
            if (i >= rewards.length) return;
            const reward = rewards[i];
            if (reward.cls === 1) {
                getPlayer(side).sp += 2;
                addLog(`🏅 占满第1类区域：${getFactionName(side)}旗帜插满阵地，技能点 +2！`);
                process(i + 1); return;
            }
            const isChaos = reward.cls === 2;
            const started = startSkillTarget(
                isChaos ? 990 : 991,
                isChaos ? '占满区域·混乱' : '占满区域·炮兵',
                isChaos ? '占满第2类区域：选择一名敌方单位，陷入 2 层混乱！' : '🏅 第3类区域已占满！在己方阵地选一格，架起一门炮兵。',
                1,
                isChaos ? 'unit' : 'tile',
                isChaos
                    ? (occ) => !!occ && occ.unit && occ.unit.layer !== 'sky' && occ.side !== side && occ.unit.type !== '地雷'
                    : (occ, pos) => !occ && isInTerritory(pos.x, pos.y, side, 'holy') && !isBlockedTile(pos.x, pos.y, 'holy'),
                (targets) => {
                    if (isChaos) {
                        addUnitChaos(targets[0], 2, side);
                        addLog(`🏅 占满第2类区域：${getFactionName(side)}使${targets[0].type}陷入 2 层混乱！`);
                    } else {
                        getPlayer(side).units.push(createUnit('炮兵', targets[0].x, targets[0].y, side));
                        addLog(`🏅 占满第3类区域：${getFactionName(side)}在(${targets[0].x},${targets[0].y})架起一门炮兵！`);
                    }
                    process(i + 1);
                },
                { publicEvent: false, onCancel: () => process(i + 1) }
            );
            if (!started) {
                addLog(`🏅 占满第${reward.cls}类区域，却找不到合适的目标——奖励只好作罢。`);
                process(i + 1);
            }
        };
        process(0);
    }

    function scheduleHolyReinforcement() {
        const sides = ['red', 'blue'];
        const hasSpace = (side) => holyTerritoryTiles(side).some(t => !unitAt(t.x, t.y));
        const eligible = sides.filter(side => {
            const own = holyCombatUnits(side).length;
            const enemy = holyCombatUnits(side === 'red' ? 'blue' : 'red').length;
            if (own >= HOLY_UNIT_SOFT_CAP) return false;
            if (!(own < 4 || own <= enemy - 2)) return false;
            return hasSpace(side);
        });
        if (!eligible.length) {
            addLog('🛡️ 双方兵力接近上限或无需救援，本轮没有增援。');
            return;
        }
        for (const side of eligible) {
            const own = holyCombatUnits(side).length;
            const enemy = holyCombatUnits(side === 'red' ? 'blue' : 'red').length;
            addLog(`🛡️ ${getFactionName(side)}兵力吃紧（${own} vs ${enemy}），获得一次增援机会。`);
        }
        gameState.pendingModeEvent = 'holy_reinforce';
        gameState.turnPhase = 'REINFORCE';
        const choose = (index) => {
            if (index >= eligible.length) {
                gameState.pendingModeEvent = null;
                addLog('🛡️ 增援部署完毕，战鼓再起！');
                resumeRoundStart();
                return;
            }
            const side = eligible[index];
            if (!hasSpace(side)) { choose(index + 1); return; }
            const started = startSkillTarget(992, '追赶增援', `${getFactionName(side)}：在己方阵地空格免费部署一个步兵`, 1, 'tile',
                (occ, pos) => !occ && isInTerritory(pos.x, pos.y, side, 'holy') && !isBlockedTile(pos.x, pos.y, 'holy'),
                (tiles) => {
                    getPlayer(side).units.push(createUnit('步兵', tiles[0].x, tiles[0].y, side));
                    pushSound('reinforce');
                    addLog(`🛡️ ${getFactionName(side)}的增援步兵赶到阵地，立刻投入战场！`);
                    choose(index + 1);
                }, { chooserSide: side, publicEvent: true });
            if (!started) { choose(index + 1); return; }
            renderAll();
        };
        choose(0);
    }

    function holyOnRoundStart() {
        if (gameState.gameMode !== 'holy') return;
        ensureHolyState();
        if (gameState.turn === 8) {
            gameState.red.baseCmd = 4;
            gameState.blue.baseCmd = 4;
            addLog('🎯 圣辉涌动：双方指挥点提升至 4。');
        }
        if ((gameState.turn - 1) % 3 === 0) spawnHolyDragonMarks();
        if (gameState.turn >= 5 && (gameState.turn - 5) % 6 === 0) scheduleHolyEruptionWarning();
        if (gameState.turn >= 6 && gameState.turn % 6 === 0) triggerHolyEruption();
        if (HOLY_REINFORCE_TURNS.includes(gameState.turn)) scheduleHolyReinforcement();
    }

    function holySkyActionTiles(unit) {
        const tiles = [];
        if (!unit || unit.layer !== 'sky' || !canUnitAct(unit, unit.side)) return tiles;
        const addIfFree = (x, y) => {
            if (x < 0 || x >= COLS || y < 0 || y >= ROWS || holySkyVolcano(x, y)) return false;
            const occ = skyUnitAt(x, y);
            if (occ) {
                if (occ.side !== unit.side && !unitHasTempBuff(unit, 'no_attack') && !unitHasTempBuff(occ, 'smoke_screen')) {
                    tiles.push({ x, y, type:'attack', target:occ });
                }
                return false;
            }
            tiles.push({ x, y, type:'move' });
            return true;
        };
        for (const [dx, dy] of [[-1,-1],[-1,1],[1,-1],[1,1]]) addIfFree(unit.x + dx, unit.y + dy);
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            for (let step = 1; step <= 2; step++) {
                if (!addIfFree(unit.x + dx * step, unit.y + dy * step)) break;
            }
        }
        if (canHolyDive(unit)) {
            const ground = unitAt(unit.x, unit.y);
            const attack = !!ground && ground.side !== unit.side;
            tiles.push({ x:unit.x, y:unit.y, type:'dive', attack, targetId: attack ? ground.unit.id : null });
        }
        return tiles;
    }

    function canHolyDive(unit) {
        if (!unit || unit.destroyed || unit.layer !== 'sky') return false;
        if (holyGroundVolcano(unit.x, unit.y)) return false;
        const ground = unitAt(unit.x, unit.y);
        if (ground && ground.side === unit.side) return false;
        // 游击战术 / 烟雾弹：下方目标不可攻击时，不允许以俯冲方式强攻。
        if (ground && (unitHasTempBuff(unit, 'no_attack') || unitHasTempBuff(ground.unit, 'smoke_screen'))) return false;
        return true;
    }

    function onHolySkyClick(side, x, y) {
        if (gameState.phase !== 'ACTION' || gameState.activeSide !== side) return;
        const sel = gameState.selectedUnitId ? getAllUnits().find(u => u.id === gameState.selectedUnitId && !u.destroyed) : null;
        const clicked = skyUnitAt(x, y);
        if (!sel || sel.layer !== 'sky') {
            if (clicked && clicked.side === side && canUnitAct(clicked, side)) gameState.selectedUnitId = clicked.id;
            return;
        }
        if (sel.x === x && sel.y === y) { gameState.selectedUnitId = null; return; }
        if (clicked && clicked.side === side && canUnitAct(clicked, side)) { gameState.selectedUnitId = clicked.id; return; }
        const tile = holySkyActionTiles(sel).find(t => t.x === x && t.y === y);
        if (!tile) return;
        if (tile.type === 'move') {
            sel.x = x; sel.y = y;
            addLog(`${getFactionName(side)}${sel.type}借云势掠过，落在 (${x},${y})`);
            completeUnitAction(sel, side);
            return;
        }
        if (tile.type === 'attack' && tile.target) resolveHolySkyAttack(sel, tile.target);
    }

    function resolveHolySkyAttack(att, def) {
        if (!att || !def || att.destroyed || def.destroyed || att.layer !== 'sky' || def.layer !== 'sky') return false;
        if (!canUnitAct(att, att.side)) return false;
        if (unitHasTempBuff(att, 'no_attack')) { addLog('游击战术：天空单位本回合无法攻击'); return false; }
        if (unitHasTempBuff(def, 'smoke_screen')) { addLog('烟雾弹：天空目标被烟幕遮蔽，无法攻击'); return false; }
        const power = att.dragonPower || 3;
        const enemyPower = def.dragonPower || 3;
        let n = finalAttackRoll(att, def) + power - enemyPower;
        let result = isRangedUnit(att) ? resolveArtilleryTable(att, def, n) : resolveAttack(att, def, n);
        const e = playerEffects(att.side);
        if (isRangedUnit(att) && e.artilleryReroll && !result.destroyed && !result.chaos && !result.selfChaos && !result.attackerDestroyed) {
            e.artilleryReroll = false;
            n = finalAttackRoll(att, def) + power - enemyPower;
            result = resolveArtilleryTable(att, def, n);
            addLog('让子弹飞：凌空轰击无事发生，重新投点');
        }
        recordPTSD(att, def);
        addLog(`🐉 ${att.type}凌空扑向${def.type}，龙力${power} vs ${enemyPower}，点数:${n} → ${result.msg}`);
        applyCombatOutcome(att, def, result, { occupy:false });
        if (!att.destroyed) att.dragonPower = Math.max(1, power - 1);
        completeUnitAction(att, att.side);
        return true;
    }

    function ascendFor(side) {
        if (gameState.gameMode !== 'holy' || !myTurn(side)) return fail('当前不能升空');
        if (gameState.turnPhase !== 'ACTION') return fail('请先开始行动');
        const sel = gameState.selectedUnitId ? getAllUnits().find(u => u.id === gameState.selectedUnitId && !u.destroyed) : null;
        if (!sel || sel.side !== side) return fail('请先选择一个己方单位');
        if (sel.layer === 'sky') return fail('该单位已在天空');
        if (!sel.dragon) return fail('没有龙气附体，它还飞不起来。');
        if ((sel.chaos || 0) > 0) return fail('🌀 混乱中的单位抓不住龙气。');
        if (!canUnitAct(sel, side) || !canAffordAction(sel, side)) return fail('该单位目前无法行动');
        if (skyUnitAt(sel.x, sel.y)) return fail('☁️ 天空对应格已被占据，无处落脚。');
        sel.layer = 'sky';
        sel.dragonPower = 3;
        addLog(`🐉 ${getFactionName(side)}${sel.type}从(${sel.x},${sel.y})腾空而起！龙力 3，直入云天。`);
        pushFx({ type:'layer-move', direction:'up', unitType:sel.type, from:{ layer:'ground', x:sel.x, y:sel.y }, to:{ layer:'sky', x:sel.x, y:sel.y } });
        completeUnitAction(sel, side);
        renderAll();
        return ok();
    }

    function diveFor(side) {
        if (gameState.gameMode !== 'holy' || !myTurn(side)) return fail('当前不能俯冲');
        if (gameState.turnPhase !== 'ACTION') return fail('请先开始行动');
        const sel = gameState.selectedUnitId ? getAllUnits().find(u => u.id === gameState.selectedUnitId && !u.destroyed) : null;
        if (!sel || sel.side !== side || sel.layer !== 'sky') return fail('请选择一个己方天空单位');
        if (!canUnitAct(sel, side) || !canAffordAction(sel, side)) return fail('该单位目前无法行动');
        if (holyGroundVolcano(sel.x, sel.y)) return fail('🌋 火山底座热浪逼人，无法俯冲。');
        const ground = unitAt(sel.x, sel.y);
        if (ground && ground.side === side) return fail('🛡️ 正下方有自己的战友，不能俯冲。');
        pushFx({ type:'layer-move', direction:'down', unitType:sel.type, from:{ layer:'sky', x:sel.x, y:sel.y }, to:{ layer:'ground', x:sel.x, y:sel.y }, attack:!!ground });
        if (!ground) {
            sel.layer = 'ground';
            delete sel.dragon;
            delete sel.dragonPower;
            addLog(`🐉 ${getFactionName(side)}${sel.type}俯冲至地面(${sel.x},${sel.y})，落地时龙气散尽。`);
            holyPickupDragonMarks();
            completeUnitAction(sel, side);
            renderAll();
            return ok();
        }
        const def = ground.unit;
        recordPTSD(sel, def);
        const n = finalAttackRoll(sel, def) + 3;
        const result = isRangedUnit(sel) ? resolveArtilleryTable(sel, def, n) : resolveAttack(sel, def, n);
        addLog(`🐉 从云端砸向${sel.type}→${def.type} 点数:${n} → ${result.msg}`);
        applyCombatOutcome(sel, def, result, { occupy:false, counter:true });
        sel.layer = 'ground';
        damageUnit(sel, null, { direct:true });
        addLog(`🐉 俯冲的${sel.type}也在烟尘中消失了`);
        completeUnitAction(sel, side);
        renderAll();
        return ok();
    }

    function sanitizeUnit(unit, actedMap) {
        const out = {
            id: unit.id, type: unit.type, x: unit.x, y: unit.y, side: unit.side,
            chaos: unit.chaos || 0,
            permaBuffs: [...(unit.permaBuffs || [])],
            suppressed: !!unit.suppressed,
            boarded: !!unit.boarded,
            grenadierUsed: !!unit.grenadierUsed,
            acted: ((unit.side === 'red' || unit.side === 'blue') && unit.side !== gameState.activeSide)
                ? false
                : (actedMap[unit.id] !== undefined ? !!actedMap[unit.id] : hasActedThisTurn(unit, unit.side)),
            armoryType: unit.armoryType || null,
            layer: unit.layer === 'sky' ? 'sky' : unit.layer === 'mine' ? 'mine' : 'ground',
            mineType: unit.mineType || null,
            boss: !!unit.boss,
            beast: !!unit.beast,
            dragon: !!unit.dragon
        };
        if (typeof unit.hp === 'number') out.hp = unit.hp;
        if (typeof unit.remainingActions === 'number') out.remainingActions = unit.remainingActions;
        if (typeof unit.dragonPower === 'number') out.dragonPower = unit.dragonPower;
        if (gameState.gameMode === 'neon') out.neonCarry = neonCarryCount(unit);
        if (unit.disguisedAs) out.disguisedAs = unit.disguisedAs;
        return out;
    }

    function actionTilesFor(viewer) {
        if (!isHuman(viewer) || gameState.gameOver) return [];
        if (gameState.activeSide !== viewer) return [];
        if (gameState.wannanIncidentPrompt) return [];
        if (gameState.phase !== 'ACTION' || gameState.turnPhase !== 'ACTION') return [];
        if (gameState.cardUseMode || gameState.skillTargetRequest) return [];
        const sel = gameState.selectedUnitId ? getAllUnits().find(u => u.id === gameState.selectedUnitId && !u.destroyed) : null;
        const selMine = gameState.gameMode === 'mine' && gameState.selectedUnitId
            ? mineAllUnits().find(u => u.id === gameState.selectedUnitId && !u.destroyed) : null;
        if (selMine && selMine.side === viewer) {
            return getMineActionTiles(selMine).map(t => ({
                x: t.x, y: t.y, type: t.type, layer: 'mine',
                blockedFriendlyMine: false,
                targetId: t.target ? t.target.id : null
            }));
        }
        if (!sel || sel.side !== viewer) return [];
        if (!canUnitAct(sel, gameState.activeSide) || !canAffordAction(sel, gameState.activeSide)) {
            return gameState.gameMode === 'mine' && mineCanDescend(sel)
                ? [{ x: sel.x, y: sel.y, type: 'descend', layer: 'ground', blockedFriendlyMine: false, targetId: null }]
                : [];
        }
        if (gameState.gameMode === 'holy' && sel.layer === 'sky') {
            return holySkyActionTiles(sel).map(t => ({
                x: t.x, y: t.y, type: t.type, layer: 'sky',
                blockedFriendlyMine: false,
                attack: !!t.attack,
                targetId: t.target ? t.target.id : (t.targetId || null)
            }));
        }
        const tiles = getUnitActionTiles(sel).map(t => ({
            x: t.x, y: t.y, type: t.type, layer: 'ground',
            blockedFriendlyMine: !!t.blockedFriendlyMine,
            grenadier: !!t.grenadier,
            targetId: t.target ? t.target.id : null
        }));
        if (gameState.gameMode === 'holy' && sel.dragon && (sel.chaos || 0) === 0) {
            tiles.push({ x: sel.x, y: sel.y, type: 'ascend', layer: 'ground', blockedFriendlyMine: false, targetId: null });
        }
        if (gameState.gameMode === 'mine' && mineCanDescend(sel)) {
            tiles.push({ x: sel.x, y: sel.y, type: 'descend', layer: 'ground', blockedFriendlyMine: false, targetId: null });
        }
        return tiles;
    }

    function getView(viewerSide) {
        if (!isHuman(viewerSide)) throw new Error('viewerSide 必须是 red/blue');
        const now = Date.now();
        const viewer = getPlayer(viewerSide);
        const deployReady = deployReadyState();
        const bucket = getRevealBucket(viewerSide);
        const showMines = now < (gameState.revealMinesUntil || 0) || now < (bucket.mines || 0);
        const showEnemy = now < (bucket.enemy || 0);
        const showCards = now < (bucket.cards || 0);
        const showGhosts = !gameState.fogNight || now < (bucket.ghosts || 0);
        const ghostVisibleFor = unit => showGhosts || unit.revealedRound === gameState.turn;

        const actedMap = {};
        for (const unit of getAllUnits()) {
            if (!unit.destroyed) actedMap[unit.id] = hasActedThisTurn(unit, unit.side);
        }

        const units = [];
        for (const unit of getAllUnits()) {
            if (unit.destroyed) continue;
            if (unit.type === '鬼魂' && unit.side === 'ghost' && !ghostVisibleFor(unit)) continue;
            // 联机同时部署：部署阶段完全不发送对方的红/蓝单位，双方完成后统一揭示。
            if (gameState.phase === 'DEPLOY' && ['red','blue'].includes(unit.side) && unit.side !== viewerSide) continue;
            if (unit.type === '地雷' && unit.side !== viewerSide && !showMines && !sideMineDetectorNear(viewerSide, unit)) {
                if (unit.disguisedAs === '防御工事') {
                    units.push({ id: 'camouflage-' + unit.id, type: '防御工事', x: unit.x, y: unit.y, side: unit.side, chaos: 0, permaBuffs: [], concealed: true, acted: false });
                }
                continue;
            }
            units.push(sanitizeUnit(unit, actedMap));
        }
        // 矿洞层：只下发己方或在视野内的单位，隐藏单位完全不出现在视图里。
        if (gameState.gameMode === 'mine') {
            for (const unit of mineAllUnits()) {
                if (unit.destroyed) continue;
                if (!mineUnitVisibleTo(viewerSide, unit)) continue;
                units.push(sanitizeUnit(unit, actedMap));
            }
        }

        const req = gameState.skillTargetRequest;
        let skillTarget = null;
        if (req && req.chooserSide === viewerSide) {
            const candidates = skillCandidates(req);
            skillTarget = {
                skillId: req.skillId, skillName: req.skillName, prompt: req.prompt,
                count: req.count, minCount: req.minCount, chooserSide: req.chooserSide,
                selected: req.selected.map(s => ({ x: s.x, y: s.y, id: s.id, layer: skillTargetLayer(s) })),
                validTiles: candidates.map(c => ({ x: c.x, y: c.y, layer: skillTargetLayer(c) })),
                publicEvent: !!req.publicEvent,
                validType: req.validType
            };
        }

        const isMyTurn = myTurn(viewerSide);
        const action = gameState.phase === 'ACTION' && !gameState.gameOver;
        const locked = !!(req || gameState.skillResolving || gameState.skillTransaction || gameState.actionInProgress ||
            gameState.pendingModeEvent || gameState.wannanIncidentPrompt || gameState.imperialActing || gameState.ghostActing || gameState.gameOver);
        const drawLimit = gameState.doubleCardMode ? 2 : (viewer.maxSkillsPerTurn || 1);

        const can = {
            deploy: gameState.phase === 'DEPLOY' && !gameState.gameOver && !deployReady[viewerSide],
            finishDeploy: gameState.phase === 'DEPLOY' && !gameState.gameOver && !deployReady[viewerSide],
            armoryChoose: gameState.phase === 'ARMORY' && !locked && !!(gameState.armory && gameState.armory[viewerSide] && !gameState.armory[viewerSide].ready),
            draw: action && isMyTurn && gameState.turnPhase === 'DRAW' && !locked,
            useCard: action && isMyTurn && gameState.turnPhase === 'DRAW' && (viewer.skillsUsedThisTurn || 0) < drawLimit && viewer.library.length > 0 && !locked,
            startAction: action && isMyTurn && (gameState.turnPhase === 'DRAW' || gameState.turnPhase === 'USE_CARD') && !locked,
            playCard: action && isMyTurn && gameState.turnPhase === 'USE_CARD' && gameState.selectedCardId !== null && !locked,
            endTurn: action && isMyTurn && gameState.turnPhase === 'ACTION' && !locked,
            viewCards: action,
            viewMines: false,
            viewEnemy: false,
            ghostView: false,
            wannanIncident: !!(gameState.wannanIncidentPrompt && gameState.wannanIncidentPrompt.side === viewerSide),
            cancel: !gameState.pendingModeEvent && !gameState.wannanIncidentPrompt && !gameState.gameOver &&
                (req ? !req.publicEvent : (isMyTurn && !gameState.imperialActing && !gameState.ghostActing && !gameState.skillResolving && !gameState.actionInProgress)),
            finishTarget: !!(skillTarget && skillTarget.selected.length >= (skillTarget.minCount || 0) && skillTarget.minCount < skillTarget.count),
            cancelTarget: !!skillTarget && !skillTarget.publicEvent,
            tidePurge: (() => {
                if (gameState.gameMode !== 'tide' || !action || !isMyTurn || gameState.turnPhase !== 'ACTION' || locked) return false;
                const u = gameState.selectedUnitId ? getAllUnits().find(v => v.id === gameState.selectedUnitId && !v.destroyed && v.side === viewerSide) : null;
                return !!u && canUnitAct(u, viewerSide) && tidePurgeTiles(u).length > 0;
            })(),
            tideMark: (() => {
                if (gameState.gameMode !== 'tide' || !action || !isMyTurn || gameState.turnPhase !== 'ACTION' || locked) return false;
                const u = gameState.selectedUnitId ? getAllUnits().find(v => v.id === gameState.selectedUnitId && !v.destroyed && v.side === viewerSide) : null;
                return !!u && canUnitAct(u, viewerSide) && tideMarkTiles(u).length > 0;
            })()
        };

        const drawVisible = action && isMyTurn && gameState.turnPhase === 'DRAW' && gameState.drawChoices.length > 0 && !locked;
        const draw = drawVisible ? {
            choices: gameState.drawChoices.map(id => {
                const card = SKILL_CARD_MAP[id];
                return { id, name: card.name, desc: card.desc, cost: skillDrawCost(card, viewer), baseCost: card.cost };
            }),
            canCancel: canCancelDraw(),
            canReroll: drawRerollAvailable()
        } : null;

        const selected = gameState.selectedUnitId
            ? [...getAllUnits(), ...(gameState.gameMode === 'mine' ? mineAllUnits() : [])].find(u => u.id === gameState.selectedUnitId && !u.destroyed)
            : null;

        let mineView = null;
        if (gameState.gameMode === 'mine') {
            const m = mineState();
            const visibleMine = mineAllUnits().filter(u => mineUnitVisibleTo(viewerSide, u));
            const undergroundCount = (side) => visibleMine.filter(u => u.side === side).length;
            mineView = {
                underground: { red: undergroundCount('red'), blue: undergroundCount('blue') },
                crystals: m.crystals.map(p => ({ x: p.x, y: p.y })),
                relics: m.relics.map(p => ({ x: p.x, y: p.y })),
                blocked: m.blocked.filter(b => b.until >= gameState.turn).map(b => ({ x: b.x, y: b.y, until: b.until })),
                caveInWarning: m.caveInWarning ? { dueTurn: m.caveInWarning.dueTurn, cells: m.caveInWarning.cells.map(c => ({ x: c.x, y: c.y })) } : null,
                bossDefeated: !!m.bossDefeated,
                centralOpen: !!m.centralOpen,
                walls: MINE_WALLS.map(([x, y]) => ({ x, y })),
                shafts: MINE_SHAFTS.map(s => ({ x: s.x, y: s.y, central: !!s.central })),
                vision: [...mineVisionTiles(viewerSide)]
            };
        }

        return {
            mode: gameState.gameMode,
            modeName: MODE_NAMES[gameState.gameMode] || '',
            unitCosts: {
                '步兵': unitDeployCost('步兵'),
                '车': unitDeployCost('车'),
                '炮兵': unitDeployCost('炮兵'),
                '地雷': unitDeployCost('地雷'),
                '后勤兵': unitDeployCost('后勤兵'),
                '防御工事': unitDeployCost('防御工事')
            },
            phase: gameState.phase,
            deploySide: gameState.deploySide,
            deployReady: { red: deployReady.red, blue: deployReady.blue },
            dragonMarks: (gameState.dragonMarks || []).map(m => ({ x: m.x, y: m.y })),
            armory: gameState.armory ? {
                phase: gameState.phase,
                choice: gameState.armory[viewerSide] ? gameState.armory[viewerSide].choice : null,
                choiceCost: gameState.armory[viewerSide] && gameState.armory[viewerSide].choice && ARMORY_UNITS[gameState.armory[viewerSide].choice] ? ARMORY_UNITS[gameState.armory[viewerSide].choice].cost : null,
                deployed: !!(gameState.armory[viewerSide] && gameState.armory[viewerSide].deployed),
                ready: !!(gameState.armory[viewerSide] && gameState.armory[viewerSide].ready),
                opponentReady: !!(gameState.armory[viewerSide === 'red' ? 'blue' : 'red'] && gameState.armory[viewerSide === 'red' ? 'blue' : 'red'].ready),
                options: gameState.phase === 'ARMORY' && gameState.armory[viewerSide]
                    ? gameState.armory[viewerSide].options.map(key => {
                        const def = ARMORY_UNITS[key];
                        return { key, tier: def.tier, cost: def.cost, desc: def.desc, base: def.base };
                    })
                    : []
            } : null,
            holyScore: gameState.gameMode === 'holy' ? { red: (gameState.holyScore && gameState.holyScore.red) || 0, blue: (gameState.holyScore && gameState.holyScore.blue) || 0, target: HOLY_SCORE_TARGET } : null,
            eruptionWarning: gameState.holyEruptionWarning ? { cls: gameState.holyEruptionWarning.cls, cells: gameState.holyEruptionWarning.cells.map(c => ({ x: c.x, y: c.y })) } : null,
            mine: mineView,
            tide: gameState.gameMode === 'tide' ? (() => {
                const t = tideState();
                return {
                    eye: { x: t.eye.x, y: t.eye.y },
                    cells: t.cells.slice(),
                    marks: t.marks.map(m => ({ x: m.x, y: m.y, side: m.side })),
                    preview: t.preview.map(p => ({ x: p.x, y: p.y, kind: p.kind })),
                    seals: { red: { ...t.seals.red }, blue: { ...t.seals.blue } },
                    marksUsed: { red: !!t.marksUsed.red, blue: !!t.marksUsed.blue },
                    mode: gameState.tideMode || null
                };
            })() : null,
            beacon: gameState.gameMode === 'beacon' ? (() => {
                const b = beaconState();
                return {
                    towers: b.towers.map(t => ({
                        x: t.x, y: t.y, owner: t.owner,
                        lit: { red: !!(t.lit && t.lit.red), blue: !!(t.lit && t.lit.blue) }
                    })),
                    gates: b.gates.map(g => ({ x: g.x, y: g.y })),
                    counts: { red: b.counts.red, blue: b.counts.blue },
                    lastSettledTurn: b.lastSettledTurn
                };
            })() : null,
            neon: gameState.gameMode === 'neon' ? (() => {
                const n = neonState();
                return {
                    core: { x: n.core.x, y: n.core.y },
                    protocols: { red: n.protocols.red, blue: n.protocols.blue },
                    protocolTarget: NEON_PROTOCOL_TARGET,
                    event: n.event ? {
                        key: n.event.key, name: n.event.name, icon: n.event.icon,
                        desc: n.event.desc, dueTurn: n.event.dueTurn,
                        tiles: (n.event.tiles || []).map(t => ({ x: t.x, y: t.y }))
                    } : null,
                    activeEvent: n.activeEvent, activeTurn: n.activeTurn,
                    activeEventName: n.activeEvent && neonEventMeta(n.activeEvent) ? neonEventMeta(n.activeEvent).name : null,
                    activeEventIcon: n.activeEvent && neonEventMeta(n.activeEvent) ? neonEventMeta(n.activeEvent).icon : null,
                    ring: { red: neonRingCount('red'), blue: neonRingCount('blue') },
                    packets: n.packets.filter(p => p.carrierId == null).map(p => ({ id: p.id, x: p.x, y: p.y })),
                    terminals: { red: { x: n.terminals.red.x, y: n.terminals.red.y }, blue: { x: n.terminals.blue.x, y: n.terminals.blue.y } },
                    carried: { red: neonCarriedCount('red'), blue: neonCarriedCount('blue') }
                };
            })() : null,
            activeSide: gameState.activeSide,
            turn: gameState.turn,
            turnPhase: gameState.turnPhase,
            gameOver: !!gameState.gameOver,
            winner: gameState.winner || null,
            viewerSide,
            players: {
                red: {
                    resources: gameState.red.resources, cmd: gameState.red.cmd, sp: gameState.red.sp,
                    library: viewerSide === 'red' ? [...gameState.red.library] : [],
                    libraryCount: gameState.red.library.length,
                    skillsUsedThisTurn: viewerSide === 'red' ? gameState.red.skillsUsedThisTurn : 0,
                    smoothComboRemainingRounds: viewerSide === 'red' ? (gameState.red.smoothComboRemainingRounds || 0) : 0
                },
                blue: {
                    resources: gameState.blue.resources, cmd: gameState.blue.cmd, sp: gameState.blue.sp,
                    library: viewerSide === 'blue' ? [...gameState.blue.library] : [],
                    libraryCount: gameState.blue.library.length,
                    skillsUsedThisTurn: viewerSide === 'blue' ? gameState.blue.skillsUsedThisTurn : 0,
                    smoothComboRemainingRounds: viewerSide === 'blue' ? (gameState.blue.smoothComboRemainingRounds || 0) : 0
                }
            },
            my: {
                resources: viewer.resources, cmd: viewer.cmd, sp: viewer.sp,
                library: [...viewer.library], libraryCount: viewer.library.length,
                skillsUsedThisTurn: viewer.skillsUsedThisTurn || 0,
                smoothComboRemainingRounds: viewer.smoothComboRemainingRounds || 0
            },
            soulCount: { red: gameState.soulCount.red || 0, blue: gameState.soulCount.blue || 0 },
            fogNight: !!gameState.fogNight,
            fogStateOverride: gameState.fogStateOverride,
            incident: { triggered: !!gameState.incidentTriggered, initiator: gameState.incidentInitiator, antiJapanesePeriod: !!gameState.antiJapanesePeriod },
            factionNames: { red: getFactionName('red'), blue: getFactionName('blue'), imperial: getFactionName('imperial'), ghost: '鬼魂' },
            factionColors: { red: getFactionColor('red'), blue: getFactionColor('blue') },
            units,
            selectedUnitId: isMyTurn && selected && selected.side === viewerSide ? selected.id : null,
            actionTiles: actionTilesFor(viewerSide),
            skillTarget,
            draw,
            can,
            cardUseMode: !!gameState.cardUseMode,
            cardUseLimit: drawLimit,
            selectedCardId: isMyTurn ? gameState.selectedCardId : null,
            doubleCardMode: !!gameState.doubleCardMode,
            pirateBoatPoints: (gameState.pirateBoatPoints || []).map(p => ({ x: p.x, y: p.y, used: !!p.used })),
            pirateVortexTiles: (gameState.pirateVortexTiles || []).map(t => ({ x: t.x, y: t.y })),
            pirateWind: gameState.pirateWind || 0,
            weather: weatherView(),
            pirateForecast: gameState.pirateNextEvent ? { name: gameState.pirateNextEvent.name, dueTurn: gameState.pirateEventDueTurn, target: pirateEventTargetText(gameState.pirateNextEvent) } : null,
            snowForecast: gameState.snowNextEvent ? { name: gameState.snowNextEvent.name, dueTurn: gameState.snowEventDueTurn, target: snowEventTargetText(gameState.snowNextEvent), strong: !!gameState.snowNextEvent.strong } : null,
            snowBlockedTiles: (gameState.snowBlockedTiles || []).map(t => ({ x: t.x, y: t.y })),
            wannanPending: !!gameState.wannanIncidentPrompt,
            wannanPrompt: gameState.wannanIncidentPrompt && gameState.wannanIncidentPrompt.side === viewerSide ? { side: gameState.wannanIncidentPrompt.side, turn: gameState.wannanIncidentPrompt.turn } : null,
            wannanFriction: gameState.wannanFriction || 0,
            fogNightForcedUntil: gameState.fogNightForcedUntil || 0,
            fogDawnUntil: gameState.fogDawnUntil || 0,
            endgameAttackBonus: endgameAttackBonus(),
            endgameJudgmentTurn: ENDGAME_HARD_TURN,
            blockedTiles: (gameState.blockedTiles || []).map(t => ({ x: t.x, y: t.y })),
            minesViewDisabled: !!gameState.minesViewDisabled,
            reveal: {
                mines: showMines, enemy: showEnemy, cards: showCards, ghosts: showGhosts
            },
            logs: logMessages.slice(-120),
            fx: fxQueue.slice(),
            seq: gameState.turnSerial || 0
        };
    }

    function getState() { return gameState; }
    function getLogs() { return logMessages.slice(); }
    function takeFx() { const out = fxQueue.slice(); fxQueue.length = 0; return out; }
    function dispose() { clearGameTimers(); }
    function setRandom(fn) { if (typeof fn === 'function') Math.random = fn; }

    // 仅供本地测试/调试使用，不通过 WebSocket 暴露。
    const debug = {
        addCard(side, cardId) {
            const p = getPlayer(side);
            p.library.push(Number(cardId)); p.usedSkills.add(Number(cardId));
            renderAll();
        },
        spawnUnit(side, type, x, y, extra) {
            const unit = createUnit(type, x, y, side, extra || {});
            getPlayer(side).units.push(unit);
            renderAll(); return unit;
        },
        spawnSkyUnit(side, type, x, y, power) {
            const unit = createUnit(type, x, y, side, { layer: 'sky', dragon: true, dragonPower: Number(power) || 3 });
            getPlayer(side).units.push(unit);
            renderAll(); return unit;
        },
        spawnArmoryUnit(side, armoryType, x, y) {
            const unit = createArmoryUnit(String(armoryType), Number(x), Number(y), side);
            getPlayer(side).units.push(unit);
            renderAll(); return unit;
        },
        damageUnit(unit, options) {
            const u = typeof unit === 'object' ? unit : getAllUnits().find(v => v.id === unit);
            if (!u) return false;
            const result = damageUnit(u, null, options || {});
            renderAll(); return result;
        },
        triggerSnowEvent(index) {
            const events = [eventSnowBlock, eventFortificationWalls, eventColdWave, eventSunshine, eventNewStart, eventWolfHowl];
            events[index - 1]();
        },
        triggerPirateEvent(index) {
            const events = [eventRagingWave, eventCannonBarrage, eventBoatResupply, eventSeaMonster];
            events[index - 1]();
        },
        setFogNight(value) {
            gameState.fogStateOverride = value; gameState.fogNight = value; syncFogWeather(); renderAll();
        },
        setTurn(value) {
            const turn = Number(value);
            if (Number.isFinite(turn) && turn > 0) gameState.turn = Math.floor(turn);
            renderAll();
        },
        startRound() {
            startRound();
            renderAll();
        },
        holyEruption() { triggerHolyEruption(); renderAll(); },
        holyWarning() { scheduleHolyEruptionWarning(); renderAll(); },
        holyMarks() { spawnHolyDragonMarks(); renderAll(); },
        spawnMineUnit(side, type, x, y, extra) {
            const unit = createUnit(type, x, y, side, Object.assign({ layer: 'mine' }, extra || {}));
            if (side === 'monster') {
                gameState.mine.monsters.push(unit);
                gameState.monsters.units = gameState.mine.monsters;
            } else if (side === 'red' || side === 'blue') {
                gameState.mine[side].push(unit);
            }
            renderAll(); return unit;
        },
        clearMineUnits() {
            const m = mineState();
            m.red = []; m.blue = []; m.monsters = []; m.blocked = [];
            m.caveInWarning = null;
            gameState.monsters.units = m.monsters;
            renderAll(); return true;
        },
        damageMineUnit(unit, direct) {
            const u = typeof unit === 'object' ? unit : mineAllUnits().find(v => v.id === unit);
            if (!u) return false;
            const result = mineKill(u, null, { direct: direct !== false });
            renderAll(); return result;
        },
        mineRound() { mineOnRoundStart(); renderAll(); },
        mineDeadline() { mineCheckDeadline(); renderAll(); },
        mineCanDescend(unit) {
            const u = typeof unit === 'object' ? unit : mineAllUnits().find(v => v.id === unit) || getAllUnits().find(v => v.id === unit);
            return mineCanDescend(u);
        },
        mineUnitAt(x, y) { const u = mineUnitAt(x, y); return u ? u.id : null; }
    };

    return {
        startGame, getView, getState, getLogs, takeFx, dispose, setRandom, debug,
        armoryChooseFor,
        deployFor, removeFor, finishDeployFor, clickFor, endTurnFor, surrenderFor, wannanIncidentChoiceFor, tideModeFor,
        drawOpenFor, drawPickFor, drawCancelFor, drawRerollFor, useCardFor, selectCardFor, playCardFor, startActionFor,
        cancelFor, finishTargetFor, cancelTargetFor, revealForPlayer,
        ascendFor, diveFor,
        get activeSide() { return gameState.activeSide; },
        get phase() { return gameState.phase; },
        get gameOver() { return !!gameState.gameOver; }
    };
}

module.exports = { createGameEngine, MODES };
