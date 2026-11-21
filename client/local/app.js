(function(){
"use strict";
/* 离线单机包没有服务器，隐藏「联机大厅」入口；从 http(s) 打开时保留。 */
if(!/^https?:$/.test(location.protocol)){
    ['to-lobby-btn','to-lobby-btn-mode'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});
}
let lastSnowWeatherKey='';
let snowEffectToken=0;
// core.js
    const COLS=11,ROWS=5;
    // 2.5D 战场：逐行近大远小
    const D_ROW_SCALE=[0.86,0.91,0.96,1.01,1.05];
    const MODE_NAMES={classic:'⚔️ 经典模式',snow:'🐺 雪原群狼之舞',wannan:'🏛️ 城邦裂变',pirate:'🏴‍☠️ 海盗港湾',fog:'🌫️ 雾夜幽乡',holy:'✝️ 圣辉之战',mine:'⛏️ 蛇骨矿洞',tide:'🌊 蠕潮蚀野',beacon:'🔥 烽燧阵线',neon:'🛰️ 霓虹纪元'};
    const UNIT_COST={'步兵':2,'车':6,'炮兵':4,'海炮':4,'地雷':3,'后勤兵':3,'防御工事':1,'二阶步兵':0};
    const SKILL_LIBRARY = [
        {id:1,name:'精锐炮兵',cost:3,desc:'立即选择一个炮，使其增加一次使用次数并获得「攻击时若使敌方被消灭时，立即补充一次使用次数」（本局一直生效）'},{id:2,name:'精锐步兵',cost:2,desc:'立即选择一个步兵（包括已混乱的），解除其混乱，并使其获得「每当攻击与被攻击时取两次进攻点数，攻击时点数取高的，受击时点数取低的」（本局一直生效）'},{id:3,name:'精锐战车',cost:3,desc:'立即选择一个车（包括已混乱的），解除其混乱，并使其获得「进攻时进攻点数+1，受击时进攻点数-1」（本局一直生效）'},{id:4,name:'加固防御',cost:3,desc:'立即选择场上任意的空闲格子布置一个防御工事，并立即解除与该防御工事相邻的己方单位的混乱'},{id:5,name:'火力支援',cost:4,desc:'立即选择任意地块，触发一次额外的炮兵攻击'},{id:6,name:'缴获',cost:3,desc:'本回合消灭的敌方单位将成为你的单位；若本回合至少转化1个，指挥点+1'},{id:7,name:'反转',cost:2,desc:'本回合每使一个敌方单位混乱或被消灭，可以选择消除场上任意一层混乱（同一敌方单位不触发多次）'},{id:8,name:'渗透',cost:3,desc:'立即在敌方地块的任意两个空闲格子分别布置一个步兵和一个地雷'},{id:9,name:'升变',cost:4,desc:'立即选择至多三个兵，选中的每个兵有50%的概率不变，分别有16.7%概率变为「精锐步兵」、车、炮'},{id:10,name:'自爆',cost:4,desc:'立即选择任意一个己方单位和与其相邻的所有敌方单位，均触发一次踩雷判定'},{id:11,name:'无懈可击',cost:3,desc:'静默使用。使敌方下一次使用技能卡后，该技能不生效'},{id:12,name:'加急生产',cost:3,desc:'立即选择任意空闲地块布置一个己方车，本回合内可以选择它行动，但回合结束时它会消失'},{id:13,name:'压制',cost:3,desc:'立即选择三个敌方单位使其下回合对方行动时，无法选择由「压制」技能选中的单位行动'},{id:14,name:'PTSD',cost:1,desc:'本回合被攻击的步兵在回合结束时被混乱'},{id:15,name:'间谍机构',cost:3,desc:'立即选择任意一个敌方单位，在你接下来「开始行动」后可以选择它行动（选中的敌方单位无法攻击其他敌方单位）'},{id:16,name:'惊喜',cost:2,desc:'立即选择敌方的任意空闲地块，布置一个地雷'},{id:17,name:'大惊喜',cost:4,desc:'立即选择场上任意3个空闲地块，分别都布置一个地雷'},{id:18,name:'让子弹飞',cost:1,desc:'本回合炮兵攻击首次无事发生时，可再取一次攻击点数'},{id:19,name:'排雷兵',cost:2,desc:'选择一个步兵，使其获得「显示周围3×3格内敌方地雷（包括伪装地雷）；踩雷时1自己混乱，2~6无事发生」'},{id:20,name:'换位思考',cost:2,desc:'双方立即查看对方地雷，并各自帮对方重新布雷（只能布在对方阵地空闲处，布完后「查看地雷」被禁用）'},{id:21,name:'城市化',cost:2,desc:'在己方阵地立即布置三个防御工事；你布完后，对方立即也在对方阵地布置一个防御工事'},{id:22,name:'后勤运作',cost:2,desc:'立即选择一个己方空闲地块，布置一个己方后勤兵（每方最多1个后勤兵）'},{id:23,name:'运权帷幄',cost:3,desc:'本回合己方阵营指挥点加2'},{id:24,name:'士气倍增',cost:2,desc:'本回合己方进攻行为进攻点数加1'},{id:25,name:'藐视群雄',cost:2,desc:'下一回合对方进攻行为进攻点数减1'},{id:26,name:'卷土重来',cost:3,desc:'立即消除己方所有混乱，若此时消除的总层数≤2则指挥点+1，若≥4则指挥点-1'},{id:27,name:'狼奔豕突',cost:4,desc:'本回合及下一回合己方所有步兵进行攻击和防守时视为车（但不能以车的方式行动）'},{id:28,name:'严格检定',cost:3,desc:'本回合己方所有进攻投点小于等于4时，视为4'},{id:29,name:'强取神攻',cost:4,desc:'本回合己方阵营在取进攻点数时，每当进攻时多取一次，取较高的'},{id:30,name:'强势席卷',cost:2,desc:'本回合及下一回合，对方车以步兵的方式进行进攻和防守'},{id:31,name:'精修良工',cost:4,desc:'立即选择消除己方1至2个单位上一层混乱，并使已解除混乱的其中一个单位本轮行动无需指挥点'},{id:32,name:'气凌惑蛊',cost:3,desc:'立即操纵对方任意一个单位攻击己方任意一个单位，且该次攻击点数减一；若该次攻击使目标混乱或被消灭，下回合对方指挥点减一'},{id:33,name:'忠贞为贰',cost:2,desc:'选择己方任意两个步兵，使其合并为一个二阶步兵'},{id:34,name:'解构专家',cost:3,desc:'选择对方一个车变为「精锐步兵」'},{id:35,name:'富给锐甲',cost:2,desc:'选择一个己方车，使其获得地雷抗性（踩雷时1被消灭，2混乱，3~6无事发生）'},{id:36,name:'知己知彼',cost:3,desc:'随机弃置对方一张牌库中的技能卡；若成功弃置，下回合对方指挥点数减1'},{id:37,name:'头晕目眩',cost:3,desc:'交换场上任意两个单位位置，并使其中对方阵营单位获得一层混乱'},{id:38,name:'恐吓信',cost:1,desc:'恐吓对方一次。（该技能无实际效果）'},{id:39,name:'精神胜利',cost:1,desc:'设想你现在已经战胜。（该技能无实际效果）'},{id:40,name:'友好交流',cost:1,desc:'侮辱敌方一次。（该技能无实际效果）'},{id:41,name:'你被骗了',cost:1,desc:'Never gonna give you up!（该技能无实际效果）'},
        {id:42,name:'闪电战',cost:3,desc:'选择一个己方车，本回合可以行动两次（第二次不消耗指挥点），且本回合攻击点数+1'},{id:43,name:'跃迁',cost:3,desc:'选择场上1个单位，移动到任意空闲格子'},{id:44,name:'围点打援',cost:3,desc:'选择一个敌方单位，其周围每有一个己方单位则对其造成一层混乱'},{id:46,name:'游击战术',cost:2,desc:'选择一个己方步兵，本回合移动两格但不能攻击'},{id:48,name:'背水一战',cost:2,desc:'消除己方所有混乱，弃掉己方牌库所有技能卡'},{id:49,name:'撤退',cost:2,desc:'选择2个己方单位，依次移动到己方空地'},{id:50,name:'墓志铭',cost:3,desc:'本局内己方步兵被消灭时，原地生成防御工事'},{id:51,name:'弹射装置',cost:3,desc:'本局内己方车被消灭时，原地生成步兵'},{id:52,name:'工程陷阱',cost:2,desc:'使至多2个己方防御工事获得陷阱属性'},{id:53,name:'铁壁防线',cost:2,desc:'选择一个己方防御工事，使其免疫被消灭一次'},{id:55,name:'间谍渗透',cost:3,desc:'选择一个敌方单位，复制其牌库中一张技能卡'},{id:57,name:'后勤补给',cost:3,desc:'己方指挥点加一，技能点加二'},{id:58,name:'步坦协同',cost:3,desc:'步兵与己方车相邻时可转弯移动/跨车攻击'},{id:59,name:'混乱与蠕动',cost:1,desc:'重复投1d6直到投到1'},{id:60,name:'胜利',cost:999,desc:'打出后己方立即获得胜利，本局游戏结束'},{id:61,name:'陷阱大师',cost:2,desc:'选择一个己方地雷，其触发范围扩大为3x3'},{id:62,name:'突围',cost:2,desc:'选择一个混乱中的己方单位，解除混乱并向前两格'},{id:63,name:'诱敌深入',cost:3,desc:'选择一个敌方单位，强制向己方阵地移动三格'},{id:64,name:'重炮轰击',cost:5,desc:'选择一个地块，3x3范围所有单位加一层混乱'},{id:66,name:'战术撤退',cost:2,desc:'选择一个己方单位，向后两格不触发地雷'},{id:67,name:'说服',cost:4,desc:'立即选择场上任意一个敌方混乱中的单位，使其变成己方相应兵种的一层混乱单位'},{id:68,name:'丝滑连招',cost:4,desc:'接下来的两个己方回合内，每回合可选择同时使用两张技能卡；下次「抽卡」时需要的点数-1'},{id:69,name:'士气崩溃',cost:4,desc:'选择一个敌方单位，其及相邻敌方各加一层混乱'},{id:70,name:'钢铁洪流',cost:4,desc:'己方场上所有车获得装甲车属性'},{id:71,name:'精准打击',cost:2,desc:'选择一个敌方单位，本回合对其攻击点数加二'},{id:72,name:'伪装地雷',cost:3,desc:'在己方阵地布置一个显示为防御工事的地雷'},{id:74,name:'围城',cost:3,desc:'选择一个敌方单位，其周围四格被封锁一回合'},{id:75,name:'急救中心',cost:3,desc:'立即选择场上任意一个后勤兵，使其获得「医疗范围变为以自己为中心的3x3所有格子，但每次医疗时投d6，点数为1和2时失败」的急救中心属性'},{id:77,name:'敢死队',cost:3,desc:'选择一个己方步兵，攻击力加三但攻击后消灭'},{id:78,name:'战壕',cost:2,desc:'在己方阵地布置一个为相邻单位提供+1防御（受攻击时点数-1）的防御工事'},{id:79,name:'侦察兵',cost:2,desc:'查看所有敌方隐藏地雷三秒'},{id:80,name:'焦土反击',cost:2,desc:'选择一个己方被消灭单位位置，布置一个地雷'},{id:81,name:'连击',cost:3,desc:'选择一个己方单位，其本回合可连续行动两次，且第二次行动不消耗指挥点'},{id:82,name:'烟雾弹',cost:3,desc:'选择一个己方单位，本回合不受敌方攻击'},{id:84,name:'陷阱连锁',cost:4,desc:'选择一个己方地雷并触发，效果3x3范围'},{id:85,name:'掷弹兵',cost:4,desc:'选择至少3个己方步兵，使其获得「每局一次：与己方单位相邻时，可轰击该友军正后方直线上最近的一个敌军（不限距离；地形或友军会阻挡）」'},{id:86,name:'反装甲弹',cost:3,desc:'选择一个敌方车，使其失去一切属性（不包括混乱），然后获得战损车属性'},{id:87,name:'夜袭',cost:3,desc:'从本回合开始的两回合内，敌方所有车只能移动三格'},{id:88,name:'炮台',cost:3,desc:'选择一个己方防御工事，使其每回合可进行一次远程攻击（攻击判定按照步兵）'},{id:92,name:'间谍网',cost:3,desc:'下回合敌方所有技能卡费用加一'},{id:94,name:'闪电反击',cost:4,desc:'本回合己方单位受击后自动反击一次'},{id:95,name:'速射',cost:2,desc:'选择一个己方炮，使其多一次进攻机会'},{id:96,name:'整肃',cost:2,desc:'选择一个己方单位，移除其全部混乱'},{id:97,name:'壮士断腕',cost:2,desc:'依次选择任意数量的己方单位，将其直接移除，可随时完成选择；若移除至少2个，指挥点+1'},{id:98,name:'临机应变',cost:3,desc:'接下来三个己方回合内，每次抽卡时可以换一批候选卡（重新随机三张，每批限换一次）'},{id:510,name:'执灯',cost:0,desc:'选择一个己方单位，使其获得执灯士属性，撞鬼时直接消灭鬼魂并获得2凝魂'}];
    window.SKILL_CARD_MAP=Object.fromEntries(SKILL_LIBRARY.map(c=>[c.id,c]));
    /* 卡牌详情：关键词解释与易混卡牌的补充说明（联机版共享，单机版内嵌） */
    const CARD_KEYWORD_HELP={
        '步兵':'包括步兵、后勤兵、二阶步兵，以及军火库的工兵、排雷兵、掷弹兵。',
        '车':'车类单位，沿直线移动和攻击，可冲撞路径上的敌军。',
        '炮兵':'远程单位，攻击路径上最近的敌军；开火后变为步兵并前移 2 格。',
        '海炮':'海盗模式专属炮兵，只能同行直射。',
        '混乱':'混乱中的单位不能行动；受击或技能会叠加层数。',
        '指挥点':'每个己方回合重置，用于让单位行动。',
        '技能点':'用于抽卡和打出技能卡，不会每回合重置。',
        '进攻点数':'攻击时投 d6 并加上单位属性/技能修正后的点数。',
        '取进攻点数':'按规则投一次或多次，再按“取高/取低”等规则结算。',
        '地雷判定':'踩雷时投 d6：通常 1 被消灭、2 混乱、3~6 无事。',
        '本回合':'只在当前行动方的这个回合内有效。',
        '下一回合':'在对方的下一个回合内有效。',
        '本局':'持续到本局结束，不随回合清除。',
        '消灭':'单位被移除；被消灭会触发击杀相关效果。',
        '牌库':'已经获得、尚未打出的技能卡。',
        '空闲地块':'没有单位占据，且不是障碍/水域等不可进入的地块。',
        '军火库':'开局从三个补给单位中选择一个带入本局。',
        '二阶步兵':'2 HP 步兵；HP≥2 时攻击 +1，受击时攻击方点数 -1。',
        '精锐步兵':'步兵的强化属性，攻击/受击时取两次点数。',
        '装甲车':'车的地雷抗性与减伤属性；受击时攻击方点数 -1。',
        '战损车':'因外部效果（如反装甲弹）失去原有属性、按战损规则行动的车；攻击 -1，受击时攻击方点数 +1。',
        '机械磨损':'车累计受击 2 次或主动攻击 6 次后产生的永久磨损；攻击 -1，但不会额外增加敌方攻击点数。'
    };
    const CARD_NOTES={
        6:'每个被消灭的敌方单位立即转化为己方单位；每回合最多获得一次指挥点奖励。',
        11:'静默使用：对手看不到这张卡被打出。',
        25:'只影响对方的下一个回合。',
        29:'每次进攻投两次 d6 取较高；受击时不生效。',
        30:'对方车在进攻和防守时按步兵点数结算，但仍以车的方式移动。',
        32:'强制攻击固定 -1；只有造成混乱或消灭才触发下回合指挥点 -1。',
        33:'两个目标都必须是己方存活步兵；合并后原单位移除，新单位占第二个目标格。',
        34:'目标车变为带精锐步兵属性的步兵，并清除原车属性。',
        35:'地雷抗性：踩雷 1 被消灭、2 混乱、3~6 无事。',
        36:'只有成功弃置对方牌库中的卡，才会让对方下回合指挥点 -1。',
        60:'仅用于特殊/调试场合，正常抽卡不会出现。',
        95:'炮兵的剩余攻击次数是持续资源，因此可能一回合攻击多次；用尽后按炮兵规则变步兵。',
        96:'清除目标单位全部混乱层数，不改变其他属性。',
        97:'每次选择一个己方单位直接移除，可随时点「完成选择」；移除至少 2 个时返还 1 指挥点。',
        98:'从使用后的下一个己方回合起计算三个回合；每批候选卡限换一次。',
        510:'雾夜幽乡专属：凝魂满 3 点自动获得，不进入普通抽卡池。'
    };
    // [constants-end]
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
    function addLog(msg){ logMessages.push(msg); if(logMessages.length>200) logMessages.shift(); const el=document.getElementById('log-panel'); if(el){el.innerHTML=logMessages.map(m=>`<div class="log-entry ${logClass(m)}">${escapeHTML(m)}</div>`).join('');el.scrollTop=el.scrollHeight;} if(/点数|消灭|混乱|反击|崩溃/.test(msg))pulseCombatLocal(msg); }
    function showToast(msg){ if(window.ChaosUI&&window.ChaosUI.toast) window.ChaosUI.toast(msg); }

    /* 雪原4：飘雪动画函数 */
    function initSnowEffect() {
        const token = ++snowEffectToken;
        const canvas = document.getElementById('snow-canvas');
        if (!canvas) return;
        canvas.style.display = gameState.gameMode === 'snow' ? 'block' : 'none';
        if (gameState.gameMode !== 'snow') return;

        const ctx = canvas.getContext('2d');
        if(!ctx) return;
        const snowGeneration=gameGeneration;
        const weather=weatherView();
        const heavy=!!(weather && weather.mode==='snow' && weather.level===2);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.opacity = heavy ? '1' : '.72';

        const snowflakes = [];
        const count=heavy?160:60;
        for (let i = 0; i < count; i++) {
            snowflakes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: heavy ? Math.random() * 3.2 + 1.2 : Math.random() * 3 + 1,
                speed: heavy ? Math.random() * 1.8 + 1 : Math.random() * 1 + 0.5,
                wind: heavy ? Math.random() * 1.1 - .55 : Math.random() * 0.5 - 0.25
            });
        }

        function drawSnow() {
            if(token!==snowEffectToken) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = heavy ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.8)';
            ctx.beginPath();
            for (const f of snowflakes) {
                ctx.moveTo(f.x, f.y);
                ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                f.y += f.speed;
                f.x += f.wind;
                if (f.y > canvas.height) { f.y = -5; f.x = Math.random() * canvas.width; }
                if (f.x > canvas.width) f.x = 0;
                if (f.x < 0) f.x = canvas.width;
            }
            ctx.fill();
            if (gameState.gameMode === 'snow' && snowGeneration===gameGeneration && token===snowEffectToken) requestAnimationFrame(drawSnow);
        }
        drawSnow();
    }

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
/* [engine-skip-start] */
const HOLY_GROUPS=[
    {key:'c1a',cls:1,cells:[[3,0],[3,1],[3,2]]},
    {key:'c1b',cls:1,cells:[[7,2],[7,3],[7,4]]},
    {key:'c2a',cls:2,cells:[[4,0],[4,1],[5,0],[5,1]]},
    {key:'c2b',cls:2,cells:[[5,3],[5,4],[6,3],[6,4]]},
    {key:'c3a',cls:3,cells:[[3,3],[3,4],[4,3],[4,4]]},
    {key:'c3b',cls:3,cells:[[6,0],[6,1],[7,0],[7,1]]}
];
const HOLY_SCORE_TARGET=8;
const HOLY_SCORE_DEADLINE=18;
const HOLY_UNIT_SOFT_CAP=8;
const HOLY_REINFORCE_TURNS=[4,7,10,13];

function ensureHolyState(){
    if(!gameState.dragonMarks)gameState.dragonMarks=[];
    if(!Array.isArray(gameState.holyRewardedGroups))gameState.holyRewardedGroups=[];
    if(!gameState.holyScore)gameState.holyScore={red:0,blue:0};
}
function holyTerritoryTiles(side){
    const range=getTerritoryRange('holy',side);
    if(!range)return [];
    const tiles=[];
    for(let x=range[0];x<=range[1];x++)for(let y=0;y<ROWS;y++)if(!isBlockedTile(x,y,'holy'))tiles.push({x,y});
    return tiles;
}
function holyGroupCount(side,group){
    return group.cells.filter(([x,y])=>{const occ=unitAt(x,y);return !!occ&&occ.side===side&&occ.unit.side===side;}).length;
}
function holyGroupMajority(side,group){ return holyGroupCount(side,group)>=Math.floor(group.cells.length/2)+1; }
function holyControlledGroups(side){ return HOLY_GROUPS.filter(group=>holyGroupMajority(side,group)); }
function holyControlledCells(side){ return HOLY_GROUPS.reduce((sum,group)=>sum+holyGroupCount(side,group),0); }
function holyCombatUnits(side){
    return getPlayer(side).units.filter(u=>!u.destroyed&&!['地雷','防御工事','墓碑','鬼魂'].includes(u.type));
}
function holyAddControlScore(side){
    if(!['red','blue'].includes(side))return;
    ensureHolyState();
    const groups=holyControlledGroups(side);
    if(!groups.length)return;
    gameState.holyScore[side]=(gameState.holyScore[side]||0)+groups.length;
    addLog(`🏅 圣辉计分：控制 ${groups.length} 个区域，${getFactionName(side)} +${groups.length} 分（${gameState.holyScore[side]}/${HOLY_SCORE_TARGET}）`);
}
function holyCheckScoreVictory(){
    if(gameState.gameMode!=='holy'||gameState.gameOver)return false;
    ensureHolyState();
    const red=gameState.holyScore.red||0,blue=gameState.holyScore.blue||0;
    const reached=Math.max(red,blue)>=HOLY_SCORE_TARGET;
    const deadline=gameState.turn>=HOLY_SCORE_DEADLINE;
    if(!reached&&!deadline)return false;
    let winner=null;
    if(red!==blue)winner=red>blue?'red':'blue';
    else{
        const redGroups=holyControlledGroups('red').length,blueGroups=holyControlledGroups('blue').length;
        if(redGroups!==blueGroups)winner=redGroups>blueGroups?'red':'blue';
        else{
            const redCells=holyControlledCells('red'),blueCells=holyControlledCells('blue');
            if(redCells!==blueCells)winner=redCells>blueCells?'red':'blue';
            else{
                const redUnits=holyCombatUnits('red').length,blueUnits=holyCombatUnits('blue').length;
                if(redUnits!==blueUnits)winner=redUnits>blueUnits?'red':'blue';
            }
        }
    }
    if(!winner){showVictory('圣辉之战 · 平局');return true;}
    showVictory(getFactionName(winner)+'胜利 · 圣辉计分');
    return true;
}
function holyGroundVolcano(x,y){ return x>=4&&x<=6&&y===2; }
function holySkyVolcano(x,y){ return x===5&&y===2; }
function skyUnitAt(x,y){ return getAllUnits().find(u=>!u.destroyed&&u.layer==='sky'&&u.x===x&&u.y===y)||null; }
function holySkyUnitsOf(side){ return getPlayer(side).units.filter(u=>!u.destroyed&&u.layer==='sky'); }

function holyPickupDragonMarks(){
    if(gameState.gameMode!=='holy')return;
    ensureHolyState();
    if(!gameState.dragonMarks.length)return;
    for(const unit of getAllUnits()){
        if(unit.destroyed||unit.layer==='sky')continue;
        const index=gameState.dragonMarks.findIndex(m=>m.x===unit.x&&m.y===unit.y);
        if(index<0)continue;
        gameState.dragonMarks.splice(index,1);
        unit.dragon=true;
        addLog(`🐉 ${getFactionName(unit.side)}${unit.type}被龙气缠身——它已经可以升空了！`);
        if(unit.side==='red'||unit.side==='blue')pushFx({type:'dragon-pickup',x:unit.x,y:unit.y,side:unit.side});
    }
}
function spawnHolyDragonMarks(){
    ensureHolyState();
    for(const side of ['red','blue']){
        const tiles=holyTerritoryTiles(side);
        if(!tiles.length)continue;
        const empty=tiles.filter(t=>!unitAt(t.x,t.y)&&!gameState.dragonMarks.some(m=>m.x===t.x&&m.y===t.y));
        if(empty.length){
            const pos=empty[Math.floor(Math.random()*empty.length)];
            gameState.dragonMarks.push(pos);pushSound('dragon_mark');
            addLog(`🐉 ${getFactionName(side)}阵地(${pos.x},${pos.y})浮现一道龙影，静候有缘人`);
            continue;
        }
        const ownGround=getPlayer(side).units.filter(u=>!u.destroyed&&u.layer!=='sky'&&isInTerritory(u.x,u.y,side,'holy'));
        if(!ownGround.length){addLog(`🐉 ${getFactionName(side)}阵地已被龙影与守军占满，龙气无处落脚`);continue;}
        const unit=ownGround[Math.floor(Math.random()*ownGround.length)];
        unit.dragon=true;pushSound('dragon_mark');
        addLog(`🐉 ${getFactionName(side)}阵地的${unit.type}被龙气缠身——它已经可以升空了！`);
    }
}
function scheduleHolyEruptionWarning(){
    ensureHolyState();
    if(gameState.holyEruptionWarning)return;
    const group=HOLY_GROUPS[Math.floor(Math.random()*HOLY_GROUPS.length)];
    gameState.holyEruptionWarning={key:group.key,cls:group.cls,cells:group.cells.map(([x,y])=>({x,y}))};
    pushFx({type:'eruption-warn',cells:gameState.holyEruptionWarning.cells});
    addLog(`🌋 地表深处传来沉闷的轰鸣——第${group.cls}类区域 ${group.cells.map(([x,y])=>`(${x},${y})`).join('、')} 正在聚集岩浆，下一回合喷发！`);
}
function triggerHolyEruption(){
    const warning=gameState.holyEruptionWarning;
    const group=warning?(HOLY_GROUPS.find(g=>g.key===warning.key)||HOLY_GROUPS[Math.floor(Math.random()*HOLY_GROUPS.length)]):HOLY_GROUPS[Math.floor(Math.random()*HOLY_GROUPS.length)];
    gameState.holyEruptionWarning=null;
    for(const [x,y] of group.cells){const occ=unitAt(x,y);if(occ)damageUnit(occ.unit,null,{direct:true});}
    pushFx({type:'eruption',cells:group.cells.map(([x,y])=>({x,y}))});
    addLog(`🌋 火山喷发：第${group.cls}类区域 ${group.cells.map(([x,y])=>`(${x},${y})`).join('、')} 的守军被熔岩吞没！`);
}
function holyGroupOccupied(side,group){
    return group.cells.every(([x,y])=>{const occ=unitAt(x,y);return !!occ&&occ.side===side&&occ.unit.side===side;});
}
function holyGrantRegionRewards(side){
    if(!['red','blue'].includes(side))return;
    ensureHolyState();
    const groups=HOLY_GROUPS.filter(g=>holyGroupOccupied(side,g)&&!gameState.holyRewardedGroups.includes(side+':'+g.key));
    if(!groups.length)return;
    for(const g of groups)gameState.holyRewardedGroups.push(side+':'+g.key);
    pushSound('zone');
    const rewards=groups.map(g=>({cls:g.cls,group:g}));
    const process=i=>{
        if(i>=rewards.length)return;
        const reward=rewards[i];
        if(reward.cls===1){
            getPlayer(side).sp+=2;
            addLog(`🏅 占满第1类区域：${getFactionName(side)}旗帜插满阵地，技能点 +2！`);
            process(i+1);return;
        }
        const isChaos=reward.cls===2;
        const started=startSkillTarget(
            isChaos?990:991,
            isChaos?'占满区域·混乱':'占满区域·炮兵',
            isChaos?'占满第2类区域：选择一名敌方单位，陷入 2 层混乱！':'🏅 第3类区域已占满！在己方阵地选一格，架起一门炮兵。',
            1,
            isChaos?'unit':'tile',
            isChaos
                ?(occ)=>!!occ&&occ.unit&&occ.unit.layer!=='sky'&&occ.side!==side&&occ.unit.type!=='地雷'
                :(occ,pos)=>!occ&&isInTerritory(pos.x,pos.y,side,'holy')&&!isBlockedTile(pos.x,pos.y,'holy'),
            targets=>{
                if(isChaos){
                    addUnitChaos(targets[0],2,side);
                    addLog(`🏅 占满第2类区域：${getFactionName(side)}使${targets[0].type}陷入 2 层混乱！`);
                }else{
                    getPlayer(side).units.push(createUnit('炮兵',targets[0].x,targets[0].y,side));
                    addLog(`🏅 占满第3类区域：${getFactionName(side)}在(${targets[0].x},${targets[0].y})架起一门炮兵！`);
                }
                process(i+1);
            },
            {publicEvent:false,chooserSide:side,onCancel:()=>process(i+1)}
        );
        if(!started){addLog(`🏅 占满第${reward.cls}类区域，却找不到合适的目标——奖励只好作罢。`);process(i+1);}
    };
    process(0);
}
function scheduleHolyReinforcement(){
    const sides=['red','blue'];
    const hasSpace=side=>holyTerritoryTiles(side).some(t=>!unitAt(t.x,t.y));
    const eligible=sides.filter(side=>{
        const own=holyCombatUnits(side).length;
        const enemy=holyCombatUnits(side==='red'?'blue':'red').length;
        if(own>=HOLY_UNIT_SOFT_CAP)return false;
        if(!(own<4||own<=enemy-2))return false;
        return hasSpace(side);
    });
    if(!eligible.length){addLog('🛡️ 双方兵力接近上限或无需救援，本轮没有增援。');return;}
    for(const side of eligible){
        const own=holyCombatUnits(side).length,enemy=holyCombatUnits(side==='red'?'blue':'red').length;
        addLog(`🛡️ ${getFactionName(side)}兵力吃紧（${own} vs ${enemy}），获得一次增援机会。`);
    }
    gameState.pendingModeEvent='holy_reinforce';
    gameState.turnPhase='REINFORCE';
    const choose=index=>{
        if(index>=eligible.length){
            gameState.pendingModeEvent=null;
            addLog('🛡️ 增援部署完毕，战鼓再起！');
            resumeRoundStart();return;
        }
        const side=eligible[index];
        if(!hasSpace(side)){choose(index+1);return;}
        const started=startSkillTarget(992,'追赶增援',`${getFactionName(side)}：在己方阵地空格免费部署一个步兵`,1,'tile',
            (occ,pos)=>!occ&&isInTerritory(pos.x,pos.y,side,'holy')&&!isBlockedTile(pos.x,pos.y,'holy'),
            tiles=>{
                getPlayer(side).units.push(createUnit('步兵',tiles[0].x,tiles[0].y,side));pushSound('reinforce');
                addLog(`🛡️ ${getFactionName(side)}的增援步兵赶到阵地，立刻投入战场！`);
                choose(index+1);
            },{chooserSide:side,publicEvent:true});
        if(!started){choose(index+1);return;}
        renderAll();
    };
    choose(0);
}
function holyOnRoundStart(){
    if(gameState.gameMode!=='holy')return;
    ensureHolyState();
    if(gameState.turn===8){gameState.red.baseCmd=4;gameState.blue.baseCmd=4;addLog('🎯 圣辉涌动：双方指挥点提升至 4。');}
    if((gameState.turn-1)%3===0)spawnHolyDragonMarks();
    if(gameState.turn>=5&&(gameState.turn-5)%6===0)scheduleHolyEruptionWarning();
    if(gameState.turn>=6&&gameState.turn%6===0)triggerHolyEruption();
    if(HOLY_REINFORCE_TURNS.includes(gameState.turn))scheduleHolyReinforcement();
}
function holySkyActionTiles(unit){
    const tiles=[];
    if(!unit||unit.layer!=='sky'||!canUnitAct(unit,unit.side))return tiles;
    const addIfFree=(x,y)=>{
        if(x<0||x>=COLS||y<0||y>=ROWS||holySkyVolcano(x,y))return false;
        const occ=skyUnitAt(x,y);
        if(occ){
            if(occ.side!==unit.side&&!unitHasTempBuff(unit,'no_attack')&&!unitHasTempBuff(occ,'smoke_screen'))tiles.push({x,y,type:'attack',target:occ});
            return false;
        }
        tiles.push({x,y,type:'move'});return true;
    };
    for(const [dx,dy] of [[-1,-1],[-1,1],[1,-1],[1,1]])addIfFree(unit.x+dx,unit.y+dy);
    const orthMax=unit.huntScout?3:2;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        for(let step=1;step<=orthMax;step++)if(!addIfFree(unit.x+dx*step,unit.y+dy*step))break;
    }
    if(canHolyDive(unit)){
        const ground=unitAt(unit.x,unit.y);
        const attack=!!ground&&ground.side!==unit.side;
        tiles.push({x:unit.x,y:unit.y,type:'dive',attack,targetId:attack?ground.unit.id:null});
    }
    return tiles;
}
function canHolyDive(unit){
    if(!unit||unit.destroyed||unit.layer!=='sky')return false;
    if(unit.huntScout)return false;
    if(holyGroundVolcano(unit.x,unit.y))return false;
    const ground=unitAt(unit.x,unit.y);
    if(ground&&ground.side===unit.side)return false;
    if(ground&&(unitHasTempBuff(unit,'no_attack')||unitHasTempBuff(ground.unit,'smoke_screen')))return false;
    return true;
}
function onHolySkyClick(side,x,y){
    if(gameState.phase!=='ACTION'||gameState.activeSide!==side||gameState.turnPhase!=='ACTION'||gameState.gameOver)return;
    const sel=gameState.selectedUnitId?getAllUnits().find(u=>u.id===gameState.selectedUnitId&&!u.destroyed):null;
    const clicked=skyUnitAt(x,y);
    if(!sel||sel.layer!=='sky'){
        if(clicked&&clicked.side===side&&canUnitAct(clicked,side))gameState.selectedUnitId=clicked.id;
        return;
    }
    if(sel.x===x&&sel.y===y){
        const dive=holySkyActionTiles(sel).find(t=>t.x===x&&t.y===y&&t.type==='dive');
        if(dive){holyDive(side);return;}
        gameState.selectedUnitId=null;return;
    }
    if(clicked&&clicked.side===side&&canUnitAct(clicked,side)){gameState.selectedUnitId=clicked.id;return;}
    const tile=holySkyActionTiles(sel).find(t=>t.x===x&&t.y===y);
    if(!tile)return;
    if(tile.type==='move'){
        sel.x=x;sel.y=y;
        addLog(`${getFactionName(side)}${sel.type}借云势掠过，落在 (${x},${y})`);
        completeUnitAction(sel,side);return;
    }
    if(tile.type==='attack'&&tile.target)resolveHolySkyAttack(sel,tile.target);
    else if(tile.type==='dive')holyDive(side);
}
function resolveHolySkyAttack(att,def){
    if(!att||!def||att.destroyed||def.destroyed||att.layer!=='sky'||def.layer!=='sky')return false;
    if(!canUnitAct(att,att.side))return false;
    if(unitHasTempBuff(att,'no_attack')){addLog('游击战术：天空单位本回合无法攻击');return false;}
    if(unitHasTempBuff(def,'smoke_screen')){addLog('烟雾弹：天空目标被烟幕遮蔽，无法攻击');return false;}
    const power=att.dragonPower||3,enemyPower=def.dragonPower||3;
    let n=finalAttackRoll(att,def)+power-enemyPower;
    let result=isRangedUnit(att)?resolveArtilleryTable(att,def,n):resolveAttack(att,def,n);
    const e=playerEffects(att.side);
    if(isRangedUnit(att)&&e.artilleryReroll&&!result.destroyed&&!result.chaos&&!result.selfChaos&&!result.attackerDestroyed){
        e.artilleryReroll=false;
        n=finalAttackRoll(att,def)+power-enemyPower;
        result=resolveArtilleryTable(att,def,n);
        addLog('让子弹飞：凌空轰击无事发生，重新投点');
    }
    recordPTSD(att,def);
    addLog(`🐉 ${att.type}凌空扑向${def.type}，龙力${power} vs ${enemyPower}，点数:${n} → ${result.msg}`);
    applyCombatOutcome(att,def,result,{occupy:false});
    if(!att.destroyed)att.dragonPower=Math.max(1,power-1);
    completeUnitAction(att,att.side);
    return true;
}
function holySelectedUnit(side){
    return gameState.selectedUnitId?getAllUnits().find(u=>u.id===gameState.selectedUnitId&&!u.destroyed&&u.side===side):null;
}
function holyAscend(side){
    if(gameState.gameMode!=='holy'||!['red','blue'].includes(side)||gameState.gameOver)return {ok:false,error:'当前不能升空'};
    if(gameState.phase!=='ACTION'||gameState.activeSide!==side)return {ok:false,error:'当前不能升空'};
    if(gameState.turnPhase!=='ACTION')return {ok:false,error:'请先开始行动'};
    const sel=holySelectedUnit(side);
    if(!sel)return {ok:false,error:'请先选择一个己方单位'};
    if(sel.layer==='sky')return {ok:false,error:'该单位已在天空'};
    if(!sel.dragon)return {ok:false,error:'没有龙气附体，它还飞不起来。'};
    if((sel.chaos||0)>0)return {ok:false,error:'🌀 混乱中的单位抓不住龙气。'};
    if(!canUnitAct(sel,side)||!canAffordAction(sel,side))return {ok:false,error:'该单位目前无法行动'};
    if(skyUnitAt(sel.x,sel.y))return {ok:false,error:'☁️ 天空对应格已被占据，无处落脚。'};
    sel.layer='sky';sel.dragonPower=3;
    addLog(`🐉 ${getFactionName(side)}${sel.type}从(${sel.x},${sel.y})腾空而起！龙力 3，直入云天。`);
    pushFx({type:'layer-move',direction:'up',unitType:sel.type,from:{layer:'ground',x:sel.x,y:sel.y},to:{layer:'sky',x:sel.x,y:sel.y}});
    completeUnitAction(sel,side);
    renderAll();
    return {ok:true};
}
function holyDive(side){
    if(gameState.gameMode!=='holy'||!['red','blue'].includes(side)||gameState.gameOver)return {ok:false,error:'当前不能俯冲'};
    if(gameState.phase!=='ACTION'||gameState.activeSide!==side)return {ok:false,error:'当前不能俯冲'};
    if(gameState.turnPhase!=='ACTION')return {ok:false,error:'请先开始行动'};
    const sel=holySelectedUnit(side);
    if(!sel||sel.layer!=='sky')return {ok:false,error:'请选择一个己方天空单位'};
    if(!canUnitAct(sel,side)||!canAffordAction(sel,side))return {ok:false,error:'该单位目前无法行动'};
    if(holyGroundVolcano(sel.x,sel.y))return {ok:false,error:'🌋 火山底座热浪逼人，无法俯冲。'};
    const ground=unitAt(sel.x,sel.y);
    if(ground&&ground.side===side)return {ok:false,error:'🛡️ 正下方有自己的战友，不能俯冲。'};
    pushFx({type:'layer-move',direction:'down',unitType:sel.type,from:{layer:'sky',x:sel.x,y:sel.y},to:{layer:'ground',x:sel.x,y:sel.y},attack:!!ground});
    if(!ground){
        sel.layer='ground';delete sel.dragon;delete sel.dragonPower;
        addLog(`🐉 ${getFactionName(side)}${sel.type}俯冲至地面(${sel.x},${sel.y})，落地时龙气散尽。`);
        holyPickupDragonMarks();
        completeUnitAction(sel,side);
        renderAll();
        return {ok:true};
    }
    const def=ground.unit;
    recordPTSD(sel,def);
    const n=finalAttackRoll(sel,def)+3;
    const result=isRangedUnit(sel)?resolveArtilleryTable(sel,def,n):resolveAttack(sel,def,n);
    addLog(`🐉 从云端砸向${sel.type}→${def.type} 点数:${n} → ${result.msg}`);
    applyCombatOutcome(sel,def,result,{occupy:false,counter:true});
    sel.layer='ground';
    damageUnit(sel,null,{direct:true});
    addLog(`🐉 俯冲的${sel.type}也在烟尘中消失了`);
    completeUnitAction(sel,side);
    renderAll();
    return {ok:true};
}
/* [engine-skip-end] */

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
        const from=document.querySelector(`.cell[data-x="${fx}"][data-y="${fy}"]`),to=document.querySelector(`.cell[data-x="${tx}"][data-y="${ty}"]`);if(!from||!to){if(callback)callback();return;}pushSound('cannon');
        gameState.actionInProgress=true;const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),ball=document.createElement('div');ball.className='cannonball';ball.innerText='💣';ball.style.left=`${a.left+a.width/2-12}px`;ball.style.top=`${a.top+a.height/2-12}px`;document.body.appendChild(ball);
        scheduleGame(()=>{ball.style.left=`${b.left+b.width/2-12}px`;ball.style.top=`${b.top+b.height/2-32}px`;},16);
        scheduleGame(()=>{ball.innerText='💥';ball.className='cannonball splash';},400);
        scheduleGame(()=>{ball.remove();gameState.actionInProgress=false;if(callback)callback();},700);
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

// render.js
    const UNIT_EMOJI={'步兵':'⚔️','车':'🐎','炮兵':'💣','海炮':'💣','地雷':'💥','后勤兵':'🛠️','防御工事':'🏗️','鬼魂':'👻','墓碑':'🪦','二阶步兵':'⚔️'};
    function unitEmoji(type){return UNIT_EMOJI[type]||'?';}
    function decorateCellLocal(cell,x,y){
        const grain=document.createElement('span');grain.className='cell-grain';grain.setAttribute('aria-hidden','true');cell.appendChild(grain);
        const coord=document.createElement('span');coord.className='cell-coord';coord.textContent=x+','+y;coord.setAttribute('aria-hidden','true');cell.appendChild(coord);
    }
    function tideCellExtras(cell,x,y){
        const t=tideState();
        if(x===t.eye.x&&y===t.eye.y){cell.classList.add('tide-eye');return;}
        if(tideAt(x,y)) cell.classList.add('tide-cell');
        const sealSide=tideSealSide(x,y);
        if(sealSide){
            cell.classList.add('tide-seal','tide-seal-'+sealSide);
            const token=document.createElement('span');
            token.className='tide-seal-token';
            token.innerHTML='<b>🪨</b><i>'+t.seals[sealSide].hp+'/3</i>';
            token.title=`${getFactionName(sealSide)}镇石：${t.seals[sealSide].hp}/3`;
            cell.appendChild(token);
        }
        if(t.marks.some(m=>m.x===x&&m.y===y)){
            const mark=document.createElement('span');
            mark.className='tide-mark-token';mark.textContent='🌀';mark.title='潮印：下次潮涌优先吞并';
            cell.appendChild(mark);
        }
        if(t.preview.some(p=>p.x===x&&p.y===y)&&!tideAt(x,y)&&!sealSide){
            cell.classList.add('tide-preview');
            const pv=document.createElement('span');
            pv.className='tide-preview-mark';pv.innerHTML='<span class="tp-ripple"></span><span class="tp-wave">≈</span><span class="tp-label">潮汛</span>';pv.title='下次潮涌预报：此格将被潮水吞没';
            cell.appendChild(pv);
        }
    }
    function beaconCellExtras(cell,x,y){
        const tower=beaconTowerAt(x,y);
        if(tower){
            const lit=tower.lit||(tower.lit={red:false,blue:false});
            cell.classList.add('beacon-tower','beacon-tower-'+(tower.owner||'neutral'));
            if(lit.red)cell.classList.add('beacon-tower-lit-red');
            if(lit.blue)cell.classList.add('beacon-tower-lit-blue');
            const sel=gameState.selectedUnitId?getAllUnits().find(u=>u.id===gameState.selectedUnitId&&!u.destroyed):null;
            const canIgnite=!!sel&&beaconCanIgnite(sel,tower);
            if(canIgnite)cell.classList.add('beacon-ignite-tile');
            const token=document.createElement('span');
            token.className='beacon-tower-token';
            token.innerHTML='<span class="bt-body"></span><span class="bt-flag"></span><span class="bt-fire"></span>';
            const litText=['red','blue'].filter(s=>lit[s]).map(s=>getFactionName(s)+'已点燃').join('、');
            const state=tower.owner?getFactionName(tower.owner)+'控制':(litText?litText+'，未控制':'未点燃');
            token.title=`烽燧：${state}${canIgnite?'（点击点燃，消耗 1 指挥点）':''}`;
            cell.appendChild(token);
            return;
        }
        if(beaconGateAt(x,y)){
            cell.classList.add('beacon-gate');
            const gate=document.createElement('span');
            gate.className='beacon-gate-token';
            gate.innerHTML='<span class="bg-pillar bg-left"></span><span class="bg-pillar bg-right"></span><span class="bg-lintel"></span>';
            const occ=unitAt(x,y);
            gate.title=occ?`关门：${getFactionName(occ.side)}${unitDisplayName(occ.unit)}正驻守此处`:'关门：长城唯一的地面通道';
            cell.appendChild(gate);
        }
    }
    function neonCellExtras(cell,x,y){
        const n=neonState();
        if(neonCoreAt(x,y)){
            cell.classList.add('neon-core');
            const token=document.createElement('span');
            token.className='neon-core-token';
            token.innerHTML='<span class="neon-core-cube"><i></i><i></i><i></i><i></i></span><span class="neon-core-ring"></span>';
            token.title=`数据核心：红方协议 ${n.protocols.red}/${NEON_PROTOCOL_TARGET} · 蓝方协议 ${n.protocols.blue}/${NEON_PROTOCOL_TARGET}`;
            cell.appendChild(token);
            return;
        }
        if(neonInRing(x,y))cell.classList.add('neon-upload');
        if(x<=4)cell.classList.add('neon-territory-red');
        else if(x>=6)cell.classList.add('neon-territory-blue');
        if(gameState.phase==='DEPLOY'&&neonDeployLocked(x,y)){
            cell.classList.add('neon-deploy-lock');
            const lock=document.createElement('span');
            lock.className='neon-deploy-lock-mark';
            lock.textContent='⛔';
            lock.title='喷包区：开局不可部署，单位可正常通行';
            cell.appendChild(lock);
        }
        for(const side of ['red','blue']){
            const t=neonTerminal(side);
            if(t&&t.x===x&&t.y===y){
                cell.classList.add('neon-terminal',`neon-terminal-${side}`);
                const tok=document.createElement('span');
                tok.className='neon-terminal-token';
                tok.innerHTML=`<span class="neon-terminal-pad"></span><span class="neon-terminal-label">${side==='red'?'红方':'蓝方'}终端</span>`;
                tok.title=`${side==='red'?'红方':'蓝方'}上传终端：己方回合开始时，站在此格的非混乱单位自动上传全部数据包`;
                cell.appendChild(tok);
                const carrier=getAllUnits().find(u=>!u.destroyed&&u.side===side&&(u.layer||'ground')==='ground'&&u.x===x&&u.y===y&&neonCarryCount(u)>0);
                if(carrier)cell.classList.add('neon-upload-ready');
            }
        }
        const packets=neonPacketsOnGroundAt(x,y);
        if(packets.length){
            const tok=document.createElement('span');
            tok.className='neon-packet-token';
            tok.innerHTML=`<span class="neon-packet-diamond">${packets.length>1?'📦×'+packets.length:'◆'}</span>`;
            tok.title=`数据包 ×${packets.length}：地面单位可拾取，带回己方终端上传`;
            cell.appendChild(tok);
        }
        if(n.event&&n.event.key==='debris'&&(n.event.tiles||[]).some(t=>t.x===x&&t.y===y)){
            cell.classList.add('neon-event-warn');
            const mark=document.createElement('span');
            mark.className='neon-event-mark';mark.textContent='☄️';
            mark.title='轨道碎片预警：下回合开始时此格单位混乱 +1，工事/地雷被摧毁';
            cell.appendChild(mark);
        }
        if(neonEventActive('nanofog')&&x>=4&&x<=6)cell.classList.add('neon-nanofog');
    }
    function renderBattlefield(){
        queueUnitAnimationSnapshot();
        const grid=document.getElementById('battle-grid'); grid.innerHTML='';
        const sel=gameState.selectedUnitId?getAllUnits().find(u=>u.id===gameState.selectedUnitId):null;
        const showMines=Date.now()<gameState.revealMinesUntil, showEnemy=Date.now()<gameState.revealEnemyUntil;
        const currentSide=gameState.skillTargetRequest?.chooserSide||gameState.activeSide, isBlueDeploy=gameState.phase==='DEPLOY'&&gameState.deploySide==='blue', req=gameState.skillTargetRequest;
        const objectiveTiles=levelState.active&&levelState.level?(gameState.levelId==='pirate-11'?[]:levelObjectiveTiles()):[];
        const cannonSel=sel&&(sel.permaBuffs||[]).includes('coconut')&&gameState.phase==='ACTION'&&gameState.turnPhase==='ACTION'?sel:null;
        const cannonTargets=cannonSel?getUnitActionTiles(cannonSel).filter(t=>t.type==='attack'):[];
        for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
            const cell=document.createElement('div'); cell.className='cell'; cell.setAttribute('role','button'); cell.setAttribute('tabindex','0'); cell.setAttribute('aria-label',`格子 ${x},${y}`); cell.dataset.x=x; cell.dataset.y=y; cell.dataset.col=x; decorateCellLocal(cell,x,y);
            if(gameState.levelId==='pirate-11'){
                if(x>=4&&x<=6)cell.classList.add('naval-water');
                else cell.classList.add('naval-deck');
                if(x===0)cell.classList.add('naval-rail');
            }
            const objTile=objectiveTiles.find(t=>t.x===x&&t.y===y);
            if(objTile){cell.classList.add('level-objective-tile');const tag=document.createElement('span');tag.className='level-objective-tag';tag.textContent=objTile.label;cell.appendChild(tag);}
            if(gameState.levelId==='fog-11'&&gameState.minigameState&&gameState.minigameState.revealedPath[x+','+y])cell.classList.add('fog-route');
            if(cannonTargets.length){
                if(cannonTargets.some(t=>t.x===x&&t.y===y))cell.classList.add('cannon-target-center');
                else if(cannonTargets.some(t=>Math.abs(t.x-x)+Math.abs(t.y-y)===1))cell.classList.add('cannon-target-splash');
            }
            const occ=unitAt(x,y);
            if(occ && !(isBlueDeploy&&occ.side==='red'&&!showEnemy) && !isAiHiddenMine(occ.unit,occ.side)){
                const u=occ.unit;
                const displayName=unitDisplayName(u);
                const targetInfo=levelUnitTargetInfo(u,occ.side);
                const badgeWrap=document.createElement('div');
                badgeWrap.innerHTML=window.ChaosUI.unitBadgeHTML({
                    unit:u,
                    className:(occ.side==='ghost'?'unit-ghost':(occ.side==='imperial'?'unit-imperial':(occ.side==='red'?'unit-red':'unit-blue')))+(u.marked?' unit-marked':''),
                    name:displayName,
                    unitType:displayName,
                    unitId:u.type!=='鬼魂'?u.id:null,
                    iconHTML:unitIconFor(u),
                    glyph:window.ChaosUI.unitGlyph(u),
                    options:{marked:!!u.marked,coconutLoaded:(u.permaBuffs||[]).includes('coconut')?((gameState.minigameState&&gameState.minigameState.cannonLoaded)||0):undefined,neonCarry:gameState.gameMode==='neon'?neonCarryCount(u):0,target:!!targetInfo}
                });
                const badge=badgeWrap.firstElementChild;
                if(gameState.gameMode==='fog' && u.type==='鬼魂' && occ.side==='ghost'){ badge.style.display='none'; }
                if(targetInfo){badge.classList.add('level-target-unit');badge.title=targetInfo;}
                cell.appendChild(badge);
                if(u.type==='地雷' && occ.side!==currentSide && !showMines && !sideMineDetectorNear(currentSide,u)) {if(u.disguisedAs==='防御工事'){badge.innerHTML=`<span class="unit-token" aria-hidden="true"><span class="unit-icon">${unitFigureHTMLLocal({type:'防御工事'})}</span></span><span class="unit-name">防御工事</span>`;}else badge.style.display='none';}
                /* 雾夜：墓碑/鬼魂不显示行动勾 */
                if(showActedThisTurn(u,occ.side) && occ.side!=='ghost') cell.classList.add('acted');
                if(gameState.phase==='DEPLOY'&&gameState.removeMode&&occ.side===gameState.deploySide) cell.classList.add('removable');
            }
            const previousMine=gameState.mineRelocationPreview?.find(m=>m.x===x&&m.y===y);
            if(previousMine&&!occ){const preview=document.createElement('span');preview.style.cssText='font-size:17px;opacity:.65;color:'+ (previousMine.side==='red'?'#ffd4d4':previousMine.side==='blue'?'#cde0ff':'#ffe49a');preview.innerText='💥';preview.title='原地雷位置';cell.appendChild(preview);}
            if(req){
                const pos={x,y};
                const isValid=req.validType==='unit'?!!occ&&req.filter(occ,pos):(!occ||req.allowOccupied)&&req.filter(occ,pos);
                if(isValid)cell.classList.add(window.ChaosUI.cellHighlightClass({attack:req.skillId===5,highlight:req.skillId!==5}));
                if(req.selected.some(t=>(t.layer||'ground')==='ground'&&t.x===x&&t.y===y))cell.classList.add('selected');
            }
            if(sel&&gameState.phase==='ACTION'&&gameState.turnPhase==='ACTION'&&!gameState.cardUseMode&&!req&&!gameState.gameOver){
                if(sel.x===x&&sel.y===y&&sel.layer!=='sky'&&sel.layer!=='mine')cell.classList.add('selected');
                if(sel.layer==='sky'&&sel.x===x&&sel.y===y)cell.classList.add('sky-projection');
                if(sel.layer!=='sky'&&sel.layer!=='mine'&&canUnitAct(sel,gameState.activeSide)&&canAffordAction(sel,gameState.activeSide)){
                    const tile=getUnitActionTiles(sel).find(t=>t.x===x&&t.y===y);
                    if(tile)cell.classList.add(tile.type==='attack'?'attackable':tile.type==='heal'?'healable':tile.type==='purge'?'tide-purge-tile':tile.type==='mark'?'tide-mark-tile':tile.type==='beacon_ignite'?'beacon-ignite-tile':(tile.type==='engineer_build_mode'||tile.type==='engineer_build'||tile.type==='engineer_remove')?'engineer-action':'reachable');
                }
                if(gameState.gameMode==='mine'&&sel.layer!=='sky'&&sel.layer!=='mine'&&sel.x===x&&sel.y===y&&mineCanDescend(sel))cell.classList.add('mine-descend-ready');
                if(gameState.gameMode==='holy'&&sel.layer!=='sky'&&sel.x===x&&sel.y===y&&sel.dragon)cell.classList.add('holy-ascend-ready');
            }
            /* 模式3+4-7：各模式棋盘样式 */
            if(gameState.gameMode==='wannan'){
                cell.classList.add(x<=3?'city-territory-red':x<=6?'city-territory-mid':'city-territory-blue');
                cell.dataset.terrain=x<=3?'city-red':x<=6?'city-mid':'city-blue';
            }
            if(gameState.gameMode==='tide'){
                if(x<=4)cell.classList.add('tide-territory-red');
                else if(x>=6)cell.classList.add('tide-territory-blue');
            }
            if(gameState.gameMode==='pirate'){
                var inConn=x>=4&&x<=6;
                var isTerritory=!inConn;
                var isDeck=(y===1||y===3)&&gameState.levelId!=='pirate-11';
                var isBoatPoint=isPirateBoatPoint(x,y);
                var isFlagPoint=gameState.levelId==='pirate-11'?false:isPirateCapturable(x,y);
                /* 船舵装饰 (1,5)(3,5) 注意列5行1/行3 */
                if(x===5&&(y===1||y===3)&&gameState.levelId!=='pirate-11'){
                    cell.style.cssText='background:radial-gradient(circle,#8a6a3a,#5a3a1a);border:3px solid #eeca5c;border-radius:50%;box-shadow:0 0 15px #eeca5c,inset 0 0 10px #3a2a1a';
                    if(!occ) { var deco=document.createElement('div'); deco.innerText='☸'; deco.style.cssText='position:absolute;font-size:22px;opacity:0.7;pointer-events:none;'; cell.appendChild(deco); }
                } else if(isFlagPoint){
                    cell.style.background='#8a7a3a'; cell.style.boxShadow='inset 0 -4px 0 #5a4a1a, inset 0 0 0 2px #ccaa50, 0 3px 5px black, 0 0 10px rgba(255,200,50,0.3)';
                    if(!occ) { var flag=document.createElement('div'); flag.innerText='🚩'; flag.style.cssText='position:absolute;font-size:18px;top:0;right:2px;opacity:0.8;pointer-events:none;'; cell.appendChild(flag); }
                    else { var flag2=document.createElement('div'); flag2.innerText='🏴'; flag2.style.cssText='position:absolute;font-size:16px;top:-2px;right:0;pointer-events:none;'; cell.appendChild(flag2); }
                } else if(isBoatPoint){
                    cell.style.background='#7a5a2a'; cell.style.boxShadow='inset 0 -4px 0 #5a3a0a, inset 0 0 0 2px #aa8050, 0 3px 5px black, 0 0 8px rgba(200,150,50,0.2)';
                    if(hasBoatAt(x,y) && !occ) { var boat=document.createElement('div'); boat.innerText='⛵'; boat.style.cssText='position:absolute;font-size:16px;bottom:0;right:2px;opacity:0.8;pointer-events:none;'; cell.appendChild(boat); }
                } else if(inConn&&isDeck){
                    cell.style.background='#8a6a2a'; cell.style.boxShadow='inset 0 -4px 0 #5a4a0a, inset 0 0 0 2px #b09050, 0 3px 5px black, inset 0 0 10px #9a8a5a';
                } else if(isTerritory){
                    cell.style.background='#6a4a1a'; cell.style.boxShadow='inset 0 -4px 0 #4a2a00, inset 0 0 0 2px #9a7050, 0 3px 5px black';
                } else if(inConn&&!isDeck){
                    cell.style.background='#1a4a7a'; cell.style.boxShadow='inset 0 -2px 8px #3a8aba, inset 0 2px 8px #0a2a4a, 0 3px 5px black';
                    cell.classList.add('pirate-water-wave');
                    if(gameState.levelId==='pirate-11')cell.classList.remove('pirate-water-wave');
                }
                /* 漩涡视觉 */
                if(gameState.pirateVortexTiles && gameState.pirateVortexTiles.some(t=>t.x===x&&t.y===y)){
                    cell.style.background='#0a0a2a'; cell.classList.add('pirate-vortex'); cell.innerText='🌀';
                }
            }
            if(gameState.gameMode==='fog'){
                if(x>=4&&x<=6){
                    cell.style.background='#1a2a2a'; cell.style.boxShadow='inset 0 -4px 0 #0a1a1a, inset 0 0 0 2px #3a4a4a, 0 3px 5px black';
                } else {
                    cell.style.background='#2a3a2a'; cell.style.boxShadow='inset 0 -4px 0 #1a2a1a, inset 0 0 0 2px #4a5a4a, 0 3px 5px black';
                }
                cell.style.opacity='0.8';
                cell.style.transition='opacity 0.3s';
            }
            if(gameState.gameMode==='holy'){
                if(x<=2||x>=8)cell.classList.add('holy-territory');
                var holyVolcano=holyGroundVolcano(x,y);
                var holyOrange=[0,1,2].some(i=>x===3&&y===i)||[2,3,4].some(i=>x===7&&y===i);
                var holyPurple=[0,1].some(i=>x===4&&y===i)||[0,1].some(i=>x===5&&y===i)||[3,4].some(i=>x===5&&y===i)||[3,4].some(i=>x===6&&y===i);
                var holyGreen=[3,4].some(i=>x===3&&y===i)||[3,4].some(i=>x===4&&y===i)||[0,1].some(i=>x===6&&y===i)||[0,1].some(i=>x===7&&y===i);
                cell.dataset.terrain=holyVolcano?'volcano':holyOrange?'region-1':holyPurple?'region-2':holyGreen?'region-3':(x<=2||x>=8)?'territory':'field';
                if(holyVolcano){cell.classList.add('volcano-base');cell.style.cursor='not-allowed';}
            }
            if(gameState.gameMode==='mine'){
                var isPit=x===0&&y===2||x===2&&y===2||x===5&&y===2||x===8&&y===2||x===10&&y===2;
                var isDrill=x===5&&(y===1||y===3);
                var isRedTerritory=(x>=0&&x<=3&&y>=0&&y<=1)||(x>=0&&x<=3&&y>=3&&y<=4)||(x===4&&(y===0||y===4));
                var isBlueTerritory=(x>=7&&x<=10&&y>=0&&y<=1)||(x>=7&&x<=10&&y>=3&&y<=4)||(x===6&&(y===0||y===4));
                if(isDrill)cell.classList.add('mine-drill');
                if(isPit)cell.classList.add('mine-pit');
                if(isRedTerritory)cell.classList.add('mine-territory-red');
                if(isBlueTerritory)cell.classList.add('mine-territory-blue');
                if(x===5&&y===2&&!mineState().centralOpen)cell.classList.add('mine-central-locked');
                if(isDrill){
                    cell.style.background='linear-gradient(180deg,#5a5a5a 0%,#3a3a3a 20%,#1a1a1a 50%,#3a3a3a 80%,#5a5a5a 100%)';
                    cell.style.boxShadow='inset 0 0 10px #888, 0 3px 5px black, 0 0 6px #666';
                    cell.style.cursor='not-allowed';
                } else if(isPit){
                    cell.style.background='radial-gradient(circle at 50% 60%, #1a1a00 0%, #0a0a00 40%, #000 70%)';
                    cell.style.boxShadow='inset 0 0 15px #000, 0 3px 5px black';
                } else if(isRedTerritory||isBlueTerritory){
                    cell.style.background='#6a6a3a'; cell.style.boxShadow='inset 0 -4px 0 #4a4a1a, inset 0 0 0 2px #8a8a5a, 0 3px 5px black';
                } else {
                    cell.style.background='#4a4a2a'; cell.style.boxShadow='inset 0 -4px 0 #2a2a0a, inset 0 0 0 2px #6a6a4a, 0 3px 5px black';
                }
            }
            if(gameState.gameMode==='holy'){
                const mark=(gameState.dragonMarks||[]).find(m=>m.x===x&&m.y===y);
                if(mark){const span=document.createElement('span');span.className='dragon-mark';span.textContent='🐉';span.title='龙属性标';cell.appendChild(span);}
                const warn=gameState.holyEruptionWarning&&gameState.holyEruptionWarning.cells.some(c=>c.x===x&&c.y===y);
                if(warn){cell.classList.add('eruption-warning');const span=document.createElement('span');span.className='eruption-mark';span.textContent='🌋';span.title='下一回合火山喷发';cell.appendChild(span);}
            }
            if(gameState.gameMode==='mine'&&isPit&&!occ){
                const span=document.createElement('span');span.className='mine-pit-mark';span.textContent=(x===5&&!mineState().centralOpen)?'⛓️':'🕳️';span.title=(x===5&&!mineState().centralOpen)?'中央竖井被矿主封锁':'坑洞竖井：步兵可下井';cell.appendChild(span);
            }
            if(gameState.gameMode==='tide') tideCellExtras(cell,x,y);
            if(gameState.gameMode==='beacon') beaconCellExtras(cell,x,y);
            if(gameState.gameMode==='neon') neonCellExtras(cell,x,y);
            /* 雪原6：雪原封路格子特殊效果 */
            if (gameState.snowBlockedTiles && gameState.snowBlockedTiles.some(t => t.x === x && t.y === y)) {
                cell.classList.add('snow-blocked');
                cell.style.background = '#8899aa';
            }
            
            if(isBlockedTile(x,y,gameState.gameMode)&&!(gameState.gameMode==='pirate'&&sel?.boarded&&isPirateWaterTile(x,y)))cell.classList.add('blocked-tile');
            cell.style.background='';cell.style.boxShadow='';cell.style.setProperty('--s',String(D_ROW_SCALE[y]||1));
            cell.addEventListener('click',()=>onCellClick(x,y));cell.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onCellClick(x,y);}});grid.appendChild(cell);
        }
        /* 雾夜：鬼魂可见时的第二层渲染（z-index高，可叠加在墓碑等之上） */
        if(gameState.gameMode==='fog'){
            var ghost2=getGhost();
            for(var gx2=0;gx2<COLS;gx2++) for(var gy2=0;gy2<ROWS;gy2++){
                var gOcc=ghost2.units.find(function(gu){return gu.x===gx2&&gu.y===gy2&&gu.type==='鬼魂'&&!gu.destroyed;});
                if(gOcc && isGhostUnitVisible(gOcc)){
                    var gCell=document.querySelector('.cell[data-x="'+gx2+'"][data-y="'+gy2+'"]');
                    if(gCell){
                        var gBadge=document.createElement('div');
                        gBadge.className='unit-badge unit-ghost';
                        gBadge.dataset.unitId=String(gOcc.id);
                        gBadge.style.cssText='position:absolute;top:-8px;left:-8px;z-index:100;background:rgba(30,10,40,0.7);border-radius:8px;padding:1px 3px;';
                        gBadge.innerHTML='<span class="unit-token" aria-hidden="true"><span class="unit-icon">'+unitFigureHTMLLocal({type:'鬼魂'})+'</span></span><span class="unit-name">鬼魂</span>';
                        gCell.appendChild(gBadge);
                    }
                }
            }
        }
    }

    /* ── 分层地图：天空（圣辉）与矿洞（蛇骨矿洞） ───────────────── */
    function syncLayeredMaps(){
        const sky=document.getElementById('sky-map'), mineMap=document.getElementById('mine-map');
        if(sky)sky.hidden=gameState.gameMode!=='holy'||!!(levelState.level&&levelState.level.minigame&&levelState.level.minigame.noSky);
        if(mineMap)mineMap.hidden=gameState.gameMode!=='mine';
        const mineLabel=document.getElementById('mine-vision-label');
        if(mineLabel&&gameState.gameMode==='mine'){
            const side=gameState.activeSide==='blue'?'blue':'red';
            mineLabel.textContent=`${getFactionName(side)}视野 · 红方井下 ${mineUndergroundCount('red')} · 蓝方井下 ${mineUndergroundCount('blue')}`;
        }
    }
    function makeLayerUnitBadge(u,side){
        const badge=document.createElement('div');
        badge.className='unit-badge '+(side==='monster'?'unit-monster':(side==='red'?'unit-red':'unit-blue'));
        badge.dataset.unitId=String(u.id);
        badge.dataset.unitType=unitDisplayName(u);
        const icon=side==='monster'?`<span class="mine-monster-icon">${u.barrel?'💣':u.boss?'🐍':u.beast?'🐺':'🦴'}</span>`:unitIconFor(u);
        badge.innerHTML=`<span class="unit-token" aria-hidden="true"><span class="unit-icon">${icon}</span></span><span class="unit-name">${escapeHTML(unitDisplayName(u))}</span>`;
        if((u.chaos||0)>0){const c=document.createElement('div');c.className='chaos-mark';c.textContent=u.chaos>3?'🌀×'+u.chaos:'🌀'.repeat(u.chaos);badge.appendChild(c);}
        if(u.hp>1)badge.innerHTML+=`<span class="badge-hp">❤️${u.hp}</span>`;
        if(u.dragon)badge.classList.add('has-dragon');
        if(u.marked){badge.classList.add('unit-marked');badge.innerHTML+=`<span class="badge-marked" title="已被侦察兵标记">🎯</span>`;}
        if(u.dragonPower)badge.innerHTML+=`<span class="badge-dragon">🐉${u.dragonPower}</span>`;
        const targetInfo=levelUnitTargetInfo(u,side);
        if(targetInfo){badge.classList.add('level-target-unit');badge.title=targetInfo;badge.innerHTML+=`<span class="level-target-mark">🎯</span>`;}
        return badge;
    }
    function renderSkyGrid(){
        syncLayeredMaps();
        const grid=document.getElementById('sky-grid');
        if(!grid)return;
        if(gameState.gameMode!=='holy'){grid.innerHTML='';return;}
        grid.innerHTML='';
        const sel=gameState.selectedUnitId?getAllUnits().find(u=>u.id===gameState.selectedUnitId&&!u.destroyed):null;
        const selSky=sel&&sel.layer==='sky'?sel:null;
        const actions=selSky?holySkyActionTiles(selSky):[];
        for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
            const cell=document.createElement('div');cell.className='cell sky-cell';cell.dataset.x=x;cell.dataset.y=y;cell.dataset.col=x;cell.dataset.layer='sky';
            cell.setAttribute('role','button');cell.setAttribute('tabindex','0');cell.setAttribute('aria-label',`天空格 ${x},${y}`);
            decorateCellLocal(cell,x,y);
            if(gameState.levelId==='holy-12'&&gameState.minigameState&&gameState.minigameState.aaZone&&Math.abs(x-gameState.minigameState.aaZone.x)<=1&&Math.abs(y-gameState.minigameState.aaZone.y)<=1)cell.classList.add('aa-lock');
            if(x===5&&y===2){cell.classList.add('sky-volcano','blocked-tile');cell.setAttribute('aria-label','天空火山峰（不可通过）');const head=document.createElement('span');head.className='sky-volcano-head';head.setAttribute('aria-hidden','true');head.innerHTML='<svg class="unit-fig" viewBox="0 0 40 40"><use href="#fig-volcano-head"/></svg>';cell.appendChild(head);}
            const unit=getAllUnits().find(u=>!u.destroyed&&u.layer==='sky'&&u.x===x&&u.y===y);
            if(unit){cell.appendChild(makeLayerUnitBadge(unit,unit.side));if(selSky===unit)cell.classList.add('selected');if(showActedThisTurn(unit,unit.side))cell.classList.add('acted');}
            const tile=actions.find(t=>t.x===x&&t.y===y);
            if(tile)cell.classList.add(tile.type==='attack'?'attackable':tile.type==='dive'?(tile.attack?'dive-attack':'special-action'):'reachable');
            const ground=unitAt(x,y);
            cell.title=`正下方：${ground?getFactionName(ground.side)+unitDisplayName(ground.unit):(holyGroundVolcano(x,y)?'火山底座':'空')}`;
            cell.addEventListener('click',()=>onLocalSkyClick(x,y));
            cell.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onLocalSkyClick(x,y);}});
            grid.appendChild(cell);
        }
    }
    function onLocalSkyClick(x,y){
        const side=gameState.skillTargetRequest?.chooserSide||gameState.activeSide;
        if(!['red','blue'].includes(side))return;
        onHolySkyClick(side,x,y);
        renderAll();
    }
    function renderMineGrid(){
        syncLayeredMaps();
        const grid=document.getElementById('mine-grid');
        if(!grid)return;
        if(gameState.gameMode!=='mine'){grid.innerHTML='';return;}
        grid.innerHTML='';
        const req=gameState.skillTargetRequest;
        const side=req?.chooserSide||gameState.activeSide;
        const viewer=humanViewSide()||(['red','blue'].includes(side)?side:(gameState.activeSide==='blue'?'blue':'red'));
        const vision=mineVisionTiles(viewer);
        const sel=gameState.selectedUnitId?mineAllUnits().find(u=>u.id===gameState.selectedUnitId&&!u.destroyed):null;
        const actions=sel&&sel.layer==='mine'?getMineActionTiles(sel):[];
        const m=mineState();
        const objTiles=levelState.active&&levelState.level?levelObjectiveTiles():[];
        for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
            const key=x+','+y;
            const cell=document.createElement('div');cell.className='cell mine-cell';cell.dataset.x=x;cell.dataset.y=y;cell.dataset.col=x;cell.dataset.layer='mine';
            cell.setAttribute('role','button');cell.setAttribute('tabindex','0');cell.setAttribute('aria-label',`矿洞格 ${x},${y}`);
            cell.style.setProperty('--s',String(D_ROW_SCALE[y]||1));
            decorateCellLocal(cell,x,y);
            const objTile=objTiles.find(t=>t.x===x&&t.y===y);
            if(objTile){cell.classList.add('level-objective-tile');const tag=document.createElement('span');tag.className='level-objective-tag';tag.textContent=objTile.label;cell.appendChild(tag);}
            if(isMineWall(x,y))cell.classList.add('mine-wall');
            if(m.blocked.some(b=>b.x===x&&b.y===y&&b.until>=gameState.turn))cell.classList.add('mine-collapsed');
            const shaft=mineShaftAt(x,y);
            if(shaft){cell.classList.add('mine-shaft');if(shaft.central&&!m.centralOpen)cell.classList.add('mine-shaft-locked');}
            if(!vision.has(key))cell.classList.add('mine-fog');
            if(m.monsters.some(v=>!v.destroyed&&v.beast&&Math.abs(v.x-x)+Math.abs(v.y-y)<=1))cell.classList.add('mine-crack');
            if(!mineUnitAt(x,y)&&!isMineWall(x,y)){
                if(x===5&&y===2&&!m.centralOpen&&!m.bossDefeated){const mark=document.createElement('span');mark.className='mine-tile-mark';mark.textContent='⛓️';mark.title='中央竖井被矿主封锁';cell.appendChild(mark);}
                else if(shaft){const mark=document.createElement('span');mark.className='mine-tile-mark';mark.textContent='🪜';mark.title='竖井：可回到地面';cell.appendChild(mark);}
            }
            if(m.crystals.some(p=>p.x===x&&p.y===y)){const mark=document.createElement('span');mark.className='mine-tile-mark mine-crystal';mark.textContent='💎';mark.title='晶簇：拾取获得技能点+2';cell.appendChild(mark);}
            if(m.relics.some(p=>p.x===x&&p.y===y)){const mark=document.createElement('span');mark.className='mine-tile-mark mine-relic';mark.textContent='🏺';mark.title='遗物：拾取获得一张技能卡';cell.appendChild(mark);}
            if(m.caveInWarning&&m.caveInWarning.cells.some(c=>c.x===x&&c.y===y)){cell.classList.add('mine-cavein-warning');const mark=document.createElement('span');mark.className='mine-tile-mark mine-warning';mark.textContent='⚠️';mark.title='下回合塌方';cell.appendChild(mark);}
            const unit=mineUnitAt(x,y);
            if(unit&&!isAiHiddenMine(unit,unit.side)&&mineUnitVisibleTo(viewer,unit)){
                cell.appendChild(makeLayerUnitBadge(unit,unit.side));
                if(sel===unit)cell.classList.add('selected');
                if(showActedThisTurn(unit,unit.side))cell.classList.add('acted');
            }
            const tile=actions.find(t=>t.x===x&&t.y===y);
            if(tile)cell.classList.add(tile.type==='attack'?'attackable':tile.type==='ascend'?'special-action':tile.type==='heal'?'healable':'reachable');
            if(req&&req.validType==='unit'&&unit&&mineUnitVisibleTo(viewer,unit)){
                if(req.filter({unit,side:unit.side,layer:'mine'},{x,y,layer:'mine'}))cell.classList.add(window.ChaosUI.cellHighlightClass({attack:req.skillId===5,highlight:req.skillId!==5}));
                if(req.selected.some(t=>skillTargetLayer(t)==='mine'&&t.x===x&&t.y===y))cell.classList.add('selected');
            }
            cell.addEventListener('click',()=>onLocalMineClick(x,y));
            cell.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onLocalMineClick(x,y);}});
            grid.appendChild(cell);
        }
    }
    function onLocalMineClick(x,y){
        if(gameState.skillTargetRequest){
            handleSkillTargetClick(x,y,'mine');
            renderAll();
            return;
        }
        if(typeof debugState!=='undefined'&&debugState.active&&debugState.deployMode){
            if(isMineWall(x,y)||mineUnitAt(x,y)){addLog('调试部署失败：该格不可部署');return;}
            const side=debugState.pendingSide,type=debugState.pendingType;
            const u=ARMORY_UNITS[type]?createArmoryUnit(type,x,y,side):createUnit(type,x,y,side);
            u.layer='mine';
            mineState()[side].push(u);
            addLog(`🔧 调试：在矿洞(${x},${y})部署${side==='red'?'红':'蓝'}方${type}`);
            renderAll();return;
        }
        const side=gameState.activeSide;
        if(!['red','blue'].includes(side))return;
        onMineCellClick(side,x,y);
        renderAll();
    }

    /* 移动动画：对比前后两帧的可见单位位置，沿格子补间并留下残影（纯表现）。 */
    const UNIT_ANIM_REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const UNIT_ANIM_ICONS = {'步兵':'⚔️','车':'🐎','炮兵':'💣','海炮':'💣','地雷':'💥','后勤兵':'🛠️','防御工事':'🏗️','鬼魂':'👻','墓碑':'🪦','二阶步兵':'⚔️'};
    let lastAnimatedUnits = new Map();
    let animationBoardKey = null;
    let pendingAnimationBase = null;
    let pendingAnimationCurrent = null;
    let pendingAnimationTimer = null;

    function collectVisibleUnitsForAnimation(){
        const currentSide=gameState.skillTargetRequest?.chooserSide||gameState.activeSide;
        const showMines=Date.now()<gameState.revealMinesUntil;
        const showEnemy=Date.now()<gameState.revealEnemyUntil;
        const isBlueDeploy=gameState.phase==='DEPLOY'&&gameState.deploySide==='blue';
        const units=new Map();
        const allUnits=[...getAllUnits()];
        if(gameState.gameMode==='mine'){
            const m=mineState();
            allUnits.push(...m.red,...m.blue,...m.monsters);
        }
        for(const u of allUnits){
            if(u.destroyed) continue;
            if(isAiHiddenMine(u,u.side)) continue;
            if(u.layer==='mine' && !mineUnitVisibleTo(humanViewSide()||currentSide,u)) continue;
            if(gameState.gameMode==='fog' && u.type==='鬼魂' && u.side==='ghost' && !isGhostUnitVisible(u)) continue;
            if(isBlueDeploy && u.side==='red' && !showEnemy) continue;
            if(u.type==='地雷' && u.side!==currentSide && !showMines && !sideMineDetectorNear(currentSide,u)) continue;
            units.set(String(u.id), {id:u.id,x:u.x,y:u.y,type:u.type,side:u.side,layer:u.layer||'ground'});
        }
        return units;
    }

    function queueUnitAnimationSnapshot(){
        const current=collectVisibleUnitsForAnimation();
        const boardKey=gameState.gameMode+'|'+gameGeneration;
        if(animationBoardKey!==boardKey){
            // 新局/换模式：直接建立基线，不做追赶动画
            animationBoardKey=boardKey;
            lastAnimatedUnits=current;
            pendingAnimationBase=null;
            pendingAnimationCurrent=null;
            if(pendingAnimationTimer){ clearTimeout(pendingAnimationTimer); pendingAnimationTimer=null; }
            return;
        }
        if(!pendingAnimationBase) pendingAnimationBase=lastAnimatedUnits;
        pendingAnimationCurrent=current;
        if(!pendingAnimationTimer){
            pendingAnimationTimer=setTimeout(flushUnitAnimationsLocal,0);
        }
    }

    function flushUnitAnimationsLocal(){
        pendingAnimationTimer=null;
        const base=pendingAnimationBase||new Map();
        const current=pendingAnimationCurrent||collectVisibleUnitsForAnimation();
        pendingAnimationBase=null;
        pendingAnimationCurrent=null;
        const plan=buildUnitAnimationPlanLocal(base,current);
        lastAnimatedUnits=current;
        applyUnitAnimationsLocal(plan);
    }

    function buildUnitAnimationPlanLocal(base,current){
        const plan={moves:[],spawned:[],removed:[]};
        for(const [id,now] of current){
            const before=base.get(id);
            if(!before){ plan.spawned.push(now); continue; }
            if(before.x!==now.x||before.y!==now.y){
                plan.moves.push({id:now.id,type:now.type,side:now.side,layer:now.layer,fromX:before.x,fromY:before.y,x:now.x,y:now.y,ghost:now.type==='鬼魂'});
            }
        }
        const showEnemy=Date.now()<gameState.revealEnemyUntil;
        const isBlueDeploy=gameState.phase==='DEPLOY'&&gameState.deploySide==='blue';
        for(const [id,before] of base){
            if(current.has(id)) continue;
            if(before.type==='地雷') continue;
            if(before.type==='鬼魂' && !isGhostUnitVisible(before)) continue;
            if(isBlueDeploy && before.side==='red' && !showEnemy) continue;
            plan.removed.push(before);
        }
        return plan;
    }

    function unitAnimationIconLocal(unit){
        return (gameState.gameMode==='snow'&&unit.type==='车')?'🐺':(UNIT_ANIM_ICONS[unit.type]||'?');
    }

    function applyUnitAnimationsLocal(plan){
        if(!plan||UNIT_ANIM_REDUCED) return;
        const gridFor=layer=>document.getElementById(layer==='sky'?'sky-grid':layer==='mine'?'mine-grid':'battle-grid');
        const grids=['battle-grid','sky-grid','mine-grid'].map(id=>document.getElementById(id)).filter(Boolean);
        if(!grids.length) return;
        const badgeMap=new Map();
        grids.forEach(grid=>grid.querySelectorAll('[data-unit-id]').forEach(el=>{
            const key=String(el.dataset.unitId);
            if(!badgeMap.has(key)) badgeMap.set(key,el);
        }));
        const cellOf=(grid,x,y)=>grid&&grid.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        for(const unit of plan.moves){
            const grid=gridFor(unit.layer);
            const badge=badgeMap.get(String(unit.id));
            const fromCell=cellOf(grid,unit.fromX,unit.fromY), toCell=cellOf(grid,unit.x,unit.y);
            if(!badge||!fromCell||!toCell) continue;
            const manhattan=Math.abs(unit.x-unit.fromX)+Math.abs(unit.y-unit.fromY);
            const slide=unit.fromX===unit.x||unit.fromY===unit.y||manhattan<=2;
            if(slide) animateUnitSlideLocal(badge,fromCell,toCell,unit,grid);
            else animateUnitWarpLocal(badge,fromCell,toCell,unit,grid);
        }
        for(const unit of plan.spawned){
            const badge=badgeMap.get(String(unit.id));
            if(badge) badge.classList.add('unit-appear');
        }
        for(const unit of plan.removed){
            const grid=gridFor(unit.layer);
            const cell=cellOf(grid,unit.x,unit.y); if(!cell) continue;
            const vanish=document.createElement('div');
            vanish.className='unit-vanish';
            vanish.innerHTML=`<span class="unit-icon">${unitFigureHTMLLocal(unit)}</span><span class="unit-name">${unit.type}</span>`;
            cell.appendChild(vanish);
            setTimeout(()=>vanish.remove(),420);
        }
    }

    function animateUnitSlideLocal(badge,fromCell,toCell,unit,grid){
        const from=fromCell.getBoundingClientRect(), to=toCell.getBoundingClientRect();
        const dx=from.left-to.left, dy=from.top-to.top;
        const steps=Math.max(Math.abs(unit.x-unit.fromX),Math.abs(unit.y-unit.fromY));
        const duration=Math.min(520,190+steps*55);
        toCell.style.zIndex='8';
        badge.classList.add('unit-moving');
        badge.style.transition='none';
        badge.style.transform=`translate(${dx}px, ${dy}px)`;
        void badge.offsetWidth;
        requestAnimationFrame(()=>{
            badge.style.transition=`transform ${duration}ms cubic-bezier(.22,.68,.32,1)`;
            badge.style.transform='translate(0, 0)';
        });
        spawnMovementTrailLocal(unit,duration,grid);
        setTimeout(()=>{
            badge.classList.remove('unit-moving');
            badge.style.transition='';
            badge.style.transform='';
            toCell.style.zIndex='';
        },duration+60);
    }

    function animateUnitWarpLocal(badge,fromCell,toCell,unit,grid){
        const vanish=document.createElement('div');
        vanish.className='unit-vanish';
        vanish.innerHTML=`<span class="unit-icon">${unitFigureHTMLLocal(unit)}</span><span class="unit-name">${unit.type}</span>`;
        fromCell.appendChild(vanish);
        badge.classList.add('unit-appear');
        setTimeout(()=>vanish.remove(),420);
    }

    function spawnMovementTrailLocal(unit,duration,grid){
        if(!grid) return;
        const path=[{x:unit.fromX,y:unit.fromY}];
        const manhattan=Math.abs(unit.x-unit.fromX)+Math.abs(unit.y-unit.fromY);
        if(unit.fromX===unit.x||unit.fromY===unit.y||manhattan<=2){
            let x=unit.fromX,y=unit.fromY;
            const dx=Math.sign(unit.x-unit.fromX), dy=Math.sign(unit.y-unit.fromY);
            while(x!==unit.x||y!==unit.y){
                x+=dx; y+=dy;
                if(x===unit.x&&y===unit.y) break;
                path.push({x,y});
            }
        }
        const icon=unitAnimationIconLocal(unit);
        path.forEach((pos,index)=>{
            const cell=grid.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
            if(!cell) return;
            const trail=document.createElement('span');
            trail.className='unit-trail';
            trail.textContent=icon;
            trail.style.animationDelay=`${Math.min(160,index*35)}ms`;
            trail.style.animationDuration=`${Math.max(280,duration)}ms`;
            cell.appendChild(trail);
            setTimeout(()=>trail.remove(),Math.max(300,duration)+320+index*35);
        });
    }


    function cardTypeLocal(card){
        if(window.ChaosUI&&window.ChaosUI.cardType)return window.ChaosUI.cardType(card);
        if(!card)return 'tactic'; const d=card.desc||'';
        if(d.includes('混乱'))return 'chaos';
        if(/攻击|火力|轰炸|消灭|反击/.test(d))return 'attack';
        if(/恢复|治疗|医疗|后勤|部署|增援/.test(d))return 'support';
        return 'tactic';
    }
    function renderLibrary(){
        [['red',gameState.red],['blue',gameState.blue]].forEach(([side,p])=>{
            const el=document.getElementById(side+'-library');el.innerHTML='';
            const countEl=document.getElementById(side+'-library-count');if(countEl)countEl.textContent=p.library.length+' 张';
            if(!p.library.length){
                const empty=document.createElement('span');empty.className='library-empty';empty.textContent='牌库为空';
                el.appendChild(empty);return;
            }
            const revealed=side===gameState.activeSide&&(Date.now()<gameState.revealCardsUntil||gameState.cardUseMode);
            p.library.forEach(cid=>{
                const card=SKILL_LIBRARY.find(c=>c.id===cid);if(!card)return;
                const div=document.createElement('div');div.className='library-card';div.dataset.cardType=cardTypeLocal(card);
                if(revealed){div.classList.add('revealed');div.innerHTML='<strong>'+card.name+'</strong><span>⚡'+card.cost+'</span><span>'+card.desc+'</span>';}
                else div.innerHTML='<span>⚡</span><span>'+card.cost+'</span>';
                if(gameState.cardUseMode&&side===gameState.activeSide&&gameState.selectedCardId===cid)div.classList.add('selected-card');
                div.addEventListener('click',()=>{
                    if(gameState.cardUseMode&&side===gameState.activeSide&&!gameState.skillTargetRequest){gameState.selectedCardId=cid;renderAll();}
                    else openCardHelp(cid);
                });el.appendChild(div);
            });
        });
    }
    function renderUI(){
        const mode=gameState.gameMode;
        ['red','blue'].forEach(side=>{
            const p=getPlayer(side),el=document.querySelector('.'+side+'-info');
            el.dataset.faction=side;
            el.dataset.mode=mode;
            const chip=(icon,value,cls)=>'<span class="stat-chip '+cls+'">'+icon+'<b>'+value+'</b></span>';
            el.innerHTML='<span class="faction-crest" aria-hidden="true"></span>'
                +'<span class="f-name"><strong class="faction-name">'+getFactionName(side)+'</strong><span>'+(side==='red'?'红方席位':'蓝方席位')+'</span></span>'
                +'<span class="f-stats">'+chip('💰',p.resources,'res')+chip('🎯',p.cmd,'cmd')+chip('⚡',p.sp,'sp')
                +(mode==='fog'?chip('💀',gameState.soulCount[side],'soul'):'')+'</span>';
        });
        const roundNo=document.getElementById('round-no');
        if(roundNo)roundNo.textContent=gameState.gameOver?'终 局':(gameState.phase==='DEPLOY'?'布 阵':'第 '+gameState.turn+' 回合');
        const hudActive=gameState.phase==='ACTION'&&!gameState.gameOver?gameState.activeSide:null;
        ['red','blue'].forEach(side=>{const hud=document.getElementById('hud-'+side);if(hud)hud.classList.toggle('active',hudActive===side);});
        const hintEl=document.getElementById('action-hint');
        if(hintEl){const hp=['red','blue'].includes(gameState.activeSide)?getPlayer(gameState.activeSide):null;hintEl.textContent=hp?'资源 '+hp.resources+' · 指挥 '+hp.cmd+' · 技能 '+hp.sp:'';}
        const p=getPlayer(gameState.activeSide),dep=gameState.phase==='DEPLOY',action=gameState.phase==='ACTION'&&!gameState.gameOver;
        const human=['red','blue'].includes(gameState.activeSide),req=gameState.skillTargetRequest;
        const locked=!!(req||gameState.skillResolving||gameState.skillTransaction||gameState.actionInProgress||gameState.pendingModeEvent||gameState.wannanIncidentPrompt||gameState.imperialActing||gameState.ghostActing||gameState.gameOver);
        const show=(id,visible)=>{document.getElementById(id).style.display=visible?'inline-block':'none';};
        document.getElementById('deploy-panel').classList.toggle('hidden',!dep);
        show('deploy-done-btn',dep);document.getElementById('deploy-done-btn').disabled=gameState.gameOver;
        show('draw-btn',action&&human&&gameState.turnPhase==='DRAW');
        const noDraw=!!(levelState.active&&levelState.level&&levelState.level.minigame);
        if(noDraw){const db=document.getElementById('draw-btn');if(db){db.disabled=true;db.title=(levelState.level.minigame.conveyor?'空投关卡':'小游戏关卡')+'不能抽卡';}}
        show('use-card-btn',action&&human&&gameState.turnPhase==='DRAW'&&p.skillsUsedThisTurn<(gameState.doubleCardMode?2:1)&&p.library.length>0);
        show('start-action-btn',action&&human&&(gameState.turnPhase==='DRAW'||gameState.turnPhase==='USE_CARD'));
        show('play-card-btn',action&&human&&gameState.turnPhase==='USE_CARD'&&gameState.selectedCardId!==null);
        ['draw-btn','use-card-btn','start-action-btn','play-card-btn'].forEach(id=>document.getElementById(id).disabled=locked||(id==='draw-btn'&&noDraw));
        const tideOn=mode==='tide'&&action&&human&&gameState.turnPhase==='ACTION';
        show('tide-purge-btn',tideOn);show('tide-mark-btn',tideOn);
        if(tideOn){
            const tu=tideSelectedUnit();
            const canPurge=!!tu&&canUnitAct(tu,tu.side)&&tidePurgeTiles(tu).length>0;
            const canMark=!!tu&&canUnitAct(tu,tu.side)&&tideMarkTiles(tu).length>0;
            const pb=document.getElementById('tide-purge-btn'),mb=document.getElementById('tide-mark-btn');
            pb.disabled=!canPurge||!!locked;mb.disabled=!canMark||!!locked;
            pb.classList.toggle('active',gameState.tideMode==='purge');
            mb.classList.toggle('active',gameState.tideMode==='mark');
            pb.title=tu?'斩潮：选择相邻潮格（工兵2格），消耗1指挥点':'请先选择一个可行动的己方单位';
            mb.title=tu?'引潮：在相邻空格放潮印，每方每回合1枚，消耗1指挥点':'请先选择一个可行动的己方单位';
        }
        document.getElementById('end-turn-btn').disabled=!action||!human||gameState.turnPhase!=='ACTION'||locked;
        show('wannan-next-btn',false);show('fog-next-btn',false);
        /* 雾夜幽乡：查看鬼魂按钮随状态切换（初晖=🌅禁用 / 雾夜=👻可用） */
        const fogBtnOn=mode==='fog'&&action&&human;
        show('ghost-view-btn',fogBtnOn);
        if(fogBtnOn){
            const gb=document.getElementById('ghost-view-btn');
            if(gameState.fogNight){gb.textContent='👻';gb.disabled=false;gb.style.background='#4a2a5a';gb.style.borderBottomColor='#2a1a3a';gb.title='查看鬼魂（8秒）';}
            else{gb.textContent='🌅';gb.disabled=true;gb.style.background='#8a7a3a';gb.style.borderBottomColor='#5a4a1a';gb.title='初晖：鬼魂自动可见';}
        }
        /* 初晖: 棋盘调亮 */
        if(document.body.classList.contains('fog-mode')) document.body.classList.toggle('fog-dawn',!gameState.fogNight);
        show('view-cards-btn',action&&human);show('view-mines-btn',action&&human);show('view-enemy-btn',dep&&gameState.deploySide==='blue');
        document.getElementById('view-mines-btn').disabled=!!gameState.minesViewDisabled;
        document.getElementById('cancel-btn').disabled=!!gameState.pendingModeEvent;
        const name=getFactionName(dep?gameState.deploySide:gameState.activeSide);
        let phaseExtra='';
        if(mode==='wannan'&&gameState.antiJapanesePeriod&&gameState.wannanFriction)phaseExtra+=` · ⚡摩擦${gameState.wannanFriction}/3`;
        if(mode==='tide'){const ts=tideState();phaseExtra+=` · 🪨${ts.seals.red.hp}:${ts.seals.blue.hp} · 🌊${ts.cells.length}`;}
        if(mode==='beacon'){const bs=beaconState();phaseExtra+=` · 🏯红${bs.counts.red}/3 蓝${bs.counts.blue}/3`;}
        if(mode==='neon'){
            const ns=neonState();
            phaseExtra+=` · 🛰️红${ns.protocols.red}/${NEON_PROTOCOL_TARGET} 蓝${ns.protocols.blue}/${NEON_PROTOCOL_TARGET}`;
            phaseExtra+=` · 📦地${ns.packets.filter(p=>p.carrierId==null).length} 红携${neonCarriedCount('red')} 蓝携${neonCarriedCount('blue')}`;
            const ev=ns.event;
            if(ev)phaseExtra+=` · 📡下回${ev.icon}${ev.name}`;
            else if(ns.activeEvent){const meta=neonEventMeta(ns.activeEvent);if(meta)phaseExtra+=` · 📡${meta.icon}${meta.name}`;}
        }
        renderWeatherChip();
        document.getElementById('phase-text').innerText=dep?'🛒 '+name+'部署':gameState.gameOver?'对局结束':'⚡ '+name+' · '+(gameState.turnPhase==='DRAW'?'抽卡':gameState.turnPhase==='USE_CARD'?'用卡':human?'行动':'自动行动')+' · 回'+gameState.turn+phaseExtra;
        if(req){
            document.getElementById('targetHintText').innerText=(req.chooserSide?getFactionName(req.chooserSide)+'：':'')+req.prompt+' ('+req.selected.length+'/'+req.count+')';
            document.getElementById('targetHint').style.display='block';
            document.getElementById('finishTargetBtn').style.display=req.minCount!==undefined&&req.minCount<req.count?'inline-block':'none';
            document.getElementById('finishTargetBtn').disabled=req.selected.length<(req.minCount||0);
            document.getElementById('cancelTargetBtn').style.display=req.publicEvent?'none':'inline-block';
        }else document.getElementById('targetHint').style.display='none';
        updateDeployButtons();renderLibrary();
        updateUndoButton();
        renderWannanIncidentPrompt();
        updateLevelHud();
    }
    function renderWannanIncidentPrompt(){
        const el=document.getElementById('wannanIncidentOverlay');
        if(!el)return;
        const prompt=gameState.wannanIncidentPrompt;
        const human=prompt&&['red','blue'].includes(prompt.side)&&prompt.side!==gameState.aiSide;
        if(!prompt||gameState.gameOver||!human){el.style.display='none';return;}
        el.style.display='flex';
        document.getElementById('wannanIncidentTitle').textContent=`${getFactionName(prompt.side)}：是否点燃城邦裂变？`;
        document.getElementById('wannanIncidentText').textContent=`你方与对方已交火。斯巴达发动时获得1辆精锐装甲车、雅典获得2个二阶步兵；雅典发动时获得2门海炮、斯巴达获得2个二阶步兵。阵营名称与颜色不会改变。暂不发动则摩擦+1（当前${gameState.wannanFriction||0}/3），摩擦达到3时自动发动。`;
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
            const chooser=req.chooserSide||gameState.activeSide;
            for(const {occ,layer} of skillUnitOccurrences(chooser)) {
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
        const p=getPlayer(gameState.activeSide); gameState.drawChoices=[];
        stopDrawPeek(); document.getElementById('drawOverlay').style.display='none'; renderAll(); return true;
    }
    function drawCards() {
        if(levelState.active&&levelState.level&&levelState.level.minigame){addLog((levelState.level.minigame.conveyor?'空投关卡':'小游戏关卡')+'不能抽卡');return;}
        const p=getPlayer(gameState.activeSide);
        if(gameState.gameOver || gameState.phase!=='ACTION' || gameState.turnPhase!=='DRAW' || gameState.skillTargetRequest || gameState.skillTransaction || gameState.pendingModeEvent || !['red','blue'].includes(gameState.activeSide)) return;
        if(!gameState.drawChoices.length) {
            const used=new Set(skillPlayers().flatMap(({player})=>[...(player.usedSkills || []),...(player.library || [])]));
            const avail=SKILL_LIBRARY.filter(c=>c.id!==510 && !used.has(c.id));
            for(let i=avail.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [avail[i],avail[j]]=[avail[j],avail[i]]; }
            gameState.drawChoices=avail.slice(0,3).map(c=>c.id);
            gameState.drawRerollUsed=false;
        }
        if(!gameState.drawChoices.length) { addLog('无卡可抽'); renderAll(); return; }
        const panel=document.getElementById('drawCardPanel'); panel.innerHTML='';
        gameState.drawChoices.forEach(id=>{
            const c=SKILL_LIBRARY.find(card=>card.id===id),cost=skillDrawCost(c,p),item=document.createElement('div'); item.className='draw-card'; item.dataset.cardType=cardTypeLocal(c);
            item.innerHTML=window.ChaosUI&&window.ChaosUI.skillCardHTML?window.ChaosUI.skillCardHTML(c,{cost}):`<button class="card-info-btn" type="button" title="查看卡牌详情">ℹ</button><h3>${c.name}</h3><div class="cost">⚡${cost}${cost!==c.cost?`（原${c.cost}）`:''}</div><div class="desc">${c.desc}</div>`;
            item.querySelector('.card-info-btn').addEventListener('click',ev=>{ev.stopPropagation();openCardHelp(id);});
            item.addEventListener('click',()=>selectDrawCard(id)); panel.appendChild(item);
        });
        const cancel=document.getElementById('cancelDrawBtn'); cancel.style.display=canCancelDraw()?'block':'none'; cancel.textContent='技能点不足，取消';
        const reroll=document.getElementById('rerollDrawBtn'); if(reroll) reroll.style.display=drawRerollAvailable()?'block':'none';
        stopDrawPeek();
        document.getElementById('drawSpText').textContent='⚡'+p.sp;
        document.getElementById('drawOverlay').style.display='flex';
    }
    function selectDrawCard(id) {
        const p=getPlayer(gameState.activeSide),card=SKILL_LIBRARY.find(c=>c.id===id);
        if(!card || gameState.gameOver || gameState.phase!=='ACTION' || !['red','blue'].includes(gameState.activeSide) || !gameState.drawChoices.includes(id) || gameState.turnPhase!=='DRAW') return false;
        const cost=skillDrawCost(card,p); if(p.sp<cost) { addLog('技能点不足'); showToast('技能点不足'); return false; }
        if(typeof pushUndo==='function')pushUndo('抽卡');
        p.sp-=cost; p.library.push(id); p.usedSkills.add(id); p.nextDrawDiscount=0;pushSound('card');
        gameState.drawCostModifier=0; gameState.drawChoices=[]; addLog(`${getFactionName(gameState.activeSide)}获得【${card.name}】，消耗${cost}技能点`);
        stopDrawPeek(); document.getElementById('drawOverlay').style.display='none'; renderAll(); return true;
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
                const enemy=getPlayer(t[0].side),id=enemy.library[Math.floor(Math.random()*enemy.library.length)];p.library.push(id);p.usedSkills.add(id);addLog(`间谍渗透：复制【${SKILL_LIBRARY.find(c=>c.id===id)?.name || id}】`);finish();
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
            case 79: if(!gameState.minesViewDisabled) {gameState.revealMinesUntil=Date.now()+3000;scheduleGame(renderAll,3000);}else addLog('查看地雷已被换位思考禁用');finish();break;
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
        if(typeof debugState!=='undefined'&&debugState.active&&debugState.deployMode){
            if(unitAt(x,y)||isBlockedTile(x,y,gameState.gameMode)){addLog('调试部署失败：该格不可部署');return;}
            const type=debugState.pendingType;
            const u=ARMORY_UNITS[type]?createArmoryUnit(type,x,y,debugState.pendingSide):createUnit(type,x,y,debugState.pendingSide);
            getPlayer(debugState.pendingSide).units.push(u);renderAll();return;
        }
        if(typeof debugState!=='undefined'&&debugState.active){
            const dbg=unitAt(x,y);
            if(dbg){gameState.selectedUnitId=dbg.unit.id;renderAll();return;}
        }
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

// turns.js
    function updateDeployButtons() {
        const deployPanel = document.getElementById('deploy-panel');
        const allButtons = deployPanel.querySelectorAll('.deploy-btn');
        const player = getPlayer(gameState.deploySide);
        allButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.id === 'remove-mode-btn') { if (gameState.removeMode) btn.classList.add('active'); return; }
            if (btn.id === 'armory-deploy-btn' || btn.id === 'deploy-done-btn') return;
            const unitType = btn.dataset.type; const cost = unitDeployCost(unitType);
            if (btn.lastChild && btn.lastChild.nodeType === 3) btn.lastChild.textContent = ` ${unitType} ${cost}费`;
            if (player.resources < cost) { btn.disabled = true; } else { btn.disabled = false; }
            if (unitType === '后勤兵') { const logisticsCount = player.units.filter(u => u.type === '后勤兵' && !u.destroyed).length; if (logisticsCount >= 1) btn.disabled = true; }
            if (gameState.pendingDeployType === unitType) btn.classList.add('active');
        });
        const armoryBtn = document.getElementById('armory-deploy-btn');
        const arm = gameState.armory && gameState.armory[gameState.deploySide];
        if (armoryBtn) {
            if (arm && arm.choice && !arm.deployed) {
                const def = ARMORY_UNITS[arm.choice];
                const cost = arm.free ? 0 : (def ? def.cost : 0);
                armoryBtn.style.display = 'inline-block';
                armoryBtn.dataset.type = arm.choice;
                armoryBtn.innerHTML = `<span class="btn-icon">🏪</span> ${arm.choice} ${cost}费`;
                armoryBtn.disabled = player.resources < cost;
                armoryBtn.classList.toggle('active', gameState.pendingDeployType === arm.choice);
            } else {
                armoryBtn.style.display = 'none';
                armoryBtn.dataset.type = '';
            }
        }
    }

    function handleDeployButtonClick(button, unitType) {
        const deployPanel = document.getElementById('deploy-panel'); const allButtons = deployPanel.querySelectorAll('.deploy-btn'); const player = getPlayer(gameState.deploySide);
        if (button.id === 'remove-mode-btn') {
            allButtons.forEach(btn => { if (btn.id !== 'remove-mode-btn') btn.classList.remove('active'); });
            gameState.removeMode = !gameState.removeMode; gameState.pendingDeployType = null;
            if (gameState.removeMode) { button.classList.add('active'); addLog('🗑️ 拆除模式：点击己方单位拆除'); }
            else { button.classList.remove('active'); addLog('📌 已退出拆除模式'); }
            return;
        }
        const armoryDef = ARMORY_UNITS[unitType];
        const cost = armoryDef ? armoryDef.cost : unitDeployCost(unitType);
        if (player.resources < cost) { addLog(`资源不足，无法部署${unitType}`); return; }
        if (armoryDef && gameState.armory[gameState.deploySide].deployed) { addLog('军火库单位每方只能部署一个'); return; }
        if (unitType === '后勤兵' && player.units.filter(u => u.type === '后勤兵' && !u.destroyed).length >= 1) { addLog('后勤兵每方每局只能布置一个'); return; }
        document.getElementById('remove-mode-btn').classList.remove('active');
        allButtons.forEach(btn => { if (btn.id !== 'remove-mode-btn') btn.classList.remove('active'); });
        button.classList.add('active'); gameState.removeMode = false; gameState.pendingDeployType = unitType;
        addLog(`📌 已选择：${unitType} (费用: ${cost})`);
    }

    function clearDeploySelection() {
        const deployPanel = document.getElementById('deploy-panel');
        deployPanel.querySelectorAll('.deploy-btn').forEach(btn => btn.classList.remove('active'));
        gameState.pendingDeployType = null; gameState.removeMode = false;
    }

    /* ===== 修复问题7：部署炮兵初始化remainingActions和hasAttacked ===== */
    function deployUnit(x,y){
    if(gameState.deploySide!==gameState.activeSide) return;
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
        document.getElementById('drawOverlay').style.display='none';
        document.getElementById('targetHint').style.display='none';
        /* 关卡模式的表现由 boot 段注入；联机/普通热座走默认分支。 */
        const levelInfo=(typeof levelVictoryPayload==='function')?levelVictoryPayload(w):null;
        if(levelInfo){
            document.getElementById('victoryText').innerHTML=levelInfo.html;
            if(levelInfo.won&&typeof markLevelCleared==='function')markLevelCleared(levelInfo.level);
            if(typeof renderLevelResult==='function')renderLevelResult(levelInfo.won);
            addLog(levelInfo.log);
        }else{
            document.getElementById('victoryText').innerText='🎉 '+w;
            if(typeof hideLevelResult==='function')hideLevelResult();
            addLog(w);
        }
        document.getElementById('victoryOverlay').style.display='flex';
        renderAll();
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
    function renderAll(){
        if(gameState.gameMode==='holy')holyPickupDragonMarks();
        renderBattlefield();renderUI();renderMineGrid();renderSkyGrid();if(debugState.active)refreshDebugTargetUnits();
        if(typeof syncTutorial==='function')syncTutorial();
    }
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

// boot.js
    // 音乐：不修改规则区，只在渲染后同步场景（boot 段不参与引擎抽取）
    /* 剧情对话期间强制使用当前战场的作战曲，避免终章/幕间沿用关卡结束曲。 */
    function isPlayerDefeat(){
        if(!gameState.gameOver) return false;
        if(levelState.active&&levelState.level){
            return levelState.result==='lose';
        }
        if(!gameState.aiSide) return false;
        const winner=String(gameState.winner||'');
        const winSide=/红/.test(winner)?'red':(/蓝/.test(winner)?'blue':null);
        const humanSide=gameState.aiSide==='red'?'blue':'red';
        return !!winSide&&winSide!==humanSide;
    }
    function applyMusicScene(){
        if(!window.ChaosMusic) return;
        const storyEl=document.getElementById('levelStoryOverlay');
        const armoryEl=document.getElementById('levelArmoryOverlay');
        const storyOn=!!(storyEl&&!storyEl.hidden);
        const armoryOn=!!(armoryEl&&armoryEl.classList.contains('show'));
        const forceBattle=storyOn||armoryOn;
        const forceMode=storyOn?((storyLevel&&storyLevel.mode)||(levelState.level&&levelState.level.mode)||gameState.gameMode)
            :(levelState.level&&levelState.level.mode);
        if(forceBattle&&forceMode){
            window.ChaosMusic.setScene({
                area:'game',mode:forceMode,weather:gameState.weather,
                phase:1,gameOver:false
            });
            return;
        }
        window.ChaosMusic.setScene(gameState.gameMode?{
            area:'game',mode:gameState.gameMode,
            weather:gameState.weather,
            phase:gameState.gameMode==='wannan'&&gameState.incidentTriggered?2:1,
            gameOver:!!gameState.gameOver,
            defeat:isPlayerDefeat()
        }:{area:'lobby'});
    }
    (function(){
        if(!window.ChaosMusic) return;
        const baseRenderAll=renderAll;
        renderAll=function(){
            baseRenderAll();
            try{ applyMusicScene(); }catch(e){}
        };
        window.ChaosMusic.setScene({area:'lobby'});
    })();
    // 音效：消费规则区推入的特效队列（boot 段不参与引擎抽取）
    (function(){
        if(!window.ChaosSfx) return;
        const baseRenderAll=renderAll;
        renderAll=function(){
            baseRenderAll();
            try{ if(fxQueue.length) window.ChaosSfx.playFx(fxQueue.splice(0)); }catch(e){}
        };
    })();
    function refreshDebugCardSelect(){ const sel=document.getElementById('debug-card-select'); if(!sel) return; sel.innerHTML=SKILL_LIBRARY.map(c=>`<option value="${c.id}">${c.id} - ${c.name}</option>`).join(''); }
    function debugModeOk(mode,label){ if(gameState.gameMode===mode)return true; addLog(`仅在${label}模式下可用`); return false; }
    function syncDebugModeSections(){
        const mode=gameState.gameMode||'';
        document.querySelectorAll('#debug-panel .debug-section[data-debug-mode]').forEach(section=>{
            section.style.display=section.dataset.debugMode===mode?'':'none';
        });
    }
    function debugSetClassicWeather(kind){
        if(!debugModeOk('classic','经典'))return;
        const meta=WEATHER_CLASSIC_POOL.find(item=>item.kind===kind);
        if(!meta){addLog('调试：未知天候');return;}
        gameState.weather={mode:'classic',kind,level:0,windDir:0,sinceTurn:gameState.turn,nextChangeTurn:gameState.turn+3,same:1,source:'debug',appliedRound:0};
        gameState.weatherNext=rollWeather('classic',gameState.turn+3,gameState.weather);
        addLog(`🔧 调试：经典天候设为${meta.label}`);renderAll();
    }
    function debugSetSnowWeather(level){
        if(!debugModeOk('snow','雪原'))return;
        gameState.weather={mode:'snow',kind:'snow',level,windDir:0,sinceTurn:gameState.turn,nextChangeTurn:gameState.turn+3,same:1,source:'debug',appliedRound:0};
        gameState.weatherNext=rollWeather('snow',gameState.turn+3,gameState.weather);
        addLog(`🔧 调试：雪原天候设为${level===2?'大雪':'小雪'}`);renderAll();
    }
    function debugSetPirateWind(dir){
        if(!debugModeOk('pirate','海盗'))return;
        gameState.pirateWind=dir;gameState.pirateWindChangedTurn=gameState.turn;
        gameState.weather={mode:'pirate',kind:'wind',level:0,windDir:dir,sinceTurn:gameState.turn,nextChangeTurn:gameState.turn+2,same:1,source:'debug',appliedRound:0};
        gameState.weatherNext=rollWeather('pirate',gameState.turn+2,gameState.weather);
        addLog(`🔧 调试：海盗风向设为${dir>0?'东风':'西风'}`);renderAll();
    }
    function debugFogGrave(delta){
        if(!debugModeOk('fog','雾夜幽乡'))return;
        const ghost=getGhost();
        if(delta>0){
            const spots=[];
            for(let x=4;x<=6;x++)for(let y=0;y<ROWS;y++)if(!unitAt(x,y))spots.push({x,y});
            if(!spots.length){addLog('调试：中立区没有空位放置墓碑');return;}
            const spot=spots[0];
            ghost.units.push(createUnit('墓碑',spot.x,spot.y,'ghost',{hp:1}));
            addLog(`🔧 调试：在(${spot.x},${spot.y})放置一个墓碑`);
        }else{
            const graves=ghost.units.filter(u=>u.type==='墓碑'&&!u.destroyed);
            if(!graves.length){addLog('调试：场上没有墓碑');return;}
            graves[graves.length-1].destroyed=true;
            addLog('🔧 调试：移除一个墓碑');
        }
        renderAll();
    }
    function debugFogSpawnGhost(){
        if(!debugModeOk('fog','雾夜幽乡'))return;
        const ghost=getGhost();
        const graves=ghost.units.filter(u=>u.type==='墓碑'&&!u.destroyed);
        if(!graves.length){addLog('调试：没有墓碑，无法召唤鬼魂');return;}
        const grave=graves.find(g=>!ghost.units.some(u=>u.type==='鬼魂'&&!u.destroyed&&u.x===g.x&&u.y===g.y));
        if(!grave){addLog('调试：每个墓碑上都已经有鬼魂');return;}
        ghost.units.push(createUnit('鬼魂',grave.x,grave.y,'ghost'));
        addLog(`🔧 调试：在(${grave.x},${grave.y})召唤一个鬼魂`);renderAll();
    }
    function debugWannanIncident(side){
        if(!debugModeOk('wannan','城邦裂变'))return;
        if(gameState.incidentTriggered){addLog('调试：城邦裂变已经发动');return;}
        triggerWannanIncident(side);renderAll();
    }
    function debugWannanFriction(){
        if(!debugModeOk('wannan','城邦裂变'))return;
        if(gameState.incidentTriggered){addLog('调试：城邦裂变已经发动');return;}
        gameState.wannanFriction=(gameState.wannanFriction||0)+1;
        addLog(`⚡ 调试：城邦裂变摩擦+1（${gameState.wannanFriction}/3）`);
        if(gameState.wannanFriction>=3){
            const side=['red','blue'].includes(gameState.activeSide)?gameState.activeSide:'red';
            triggerWannanIncident(side);
        }
        renderAll();
    }
    function debugWannanImperialReinforce(){
        if(!debugModeOk('wannan','城邦裂变'))return;
        if(!factionAlive('imperial')){addLog('调试：波斯远征军已经不存在');return;}
        const empty=[];
        for(let x=4;x<=6;x++)for(let y=0;y<ROWS;y++)if(!unitAt(x,y))empty.push({x,y});
        if(!empty.length){addLog('调试：中立区没有空位');return;}
        getImperial().units.push(createUnit('步兵',empty[0].x,empty[0].y,'imperial',{permaBuffs:['elite_infantry']}));
        addLog(`🔧 调试：波斯远征军增援1个精锐步兵于(${empty[0].x},${empty[0].y})`);renderAll();
    }
    function debugHolyScore(side){
        if(!debugModeOk('holy','圣辉'))return;
        ensureHolyState();
        gameState.holyScore[side]=(gameState.holyScore[side]||0)+1;
        addLog(`🏅 调试：${getFactionName(side)}圣辉积分+1（${gameState.holyScore[side]}/${HOLY_SCORE_TARGET}）`);renderAll();
    }
    function debugHolyCheck(){
        if(!debugModeOk('holy','圣辉'))return;
        if(!holyCheckScoreVictory())addLog('调试：当前未达到圣辉终局条件（8分或第18回合）');
        renderAll();
    }
    function debugHolyDragonMark(){
        if(!debugModeOk('holy','圣辉'))return;
        spawnHolyDragonMarks();renderAll();
    }
    function debugHolyGrantDragon(){
        if(!debugModeOk('holy','圣辉'))return;
        const sel=gameState.selectedUnitId?getAllUnits().find(u=>u.id===gameState.selectedUnitId&&!u.destroyed):null;
        if(!sel||!['red','blue'].includes(sel.side)||sel.layer==='sky'){addLog('调试：请先选择一个地面单位');return;}
        sel.dragon=true;addLog(`🔧 调试：${getFactionName(sel.side)}${sel.type}获得龙气`);renderAll();
    }
    function debugHolyWarning(){
        if(!debugModeOk('holy','圣辉'))return;
        if(gameState.holyEruptionWarning){addLog('调试：已有火山喷发预告');return;}
        scheduleHolyEruptionWarning();renderAll();
    }
    function debugHolyErupt(){
        if(!debugModeOk('holy','圣辉'))return;
        triggerHolyEruption();renderAll();
    }
    function debugHolyReinforce(){
        if(!debugModeOk('holy','圣辉'))return;
        if(gameState.phase!=='ACTION'){addLog('调试：请在行动阶段触发追赶增援');return;}
        if(gameState.pendingModeEvent||gameState.skillTargetRequest){addLog('调试：请先完成当前待处理事件');return;}
        scheduleHolyReinforcement();renderAll();
    }
    function debugMineScheduleCaveIn(){
        if(!debugModeOk('mine','蛇骨矿洞'))return;
        if(mineState().caveInWarning){addLog('调试：已有塌方预告');return;}
        mineScheduleCaveIn();renderAll();
    }
    function debugMineCaveInNow(){
        if(!debugModeOk('mine','蛇骨矿洞'))return;
        const m=mineState();
        if(!m.caveInWarning)mineScheduleCaveIn();
        if(!m.caveInWarning){addLog('调试：没有可塌方的区域');return;}
        m.caveInWarning.dueTurn=gameState.turn;
        mineTriggerCaveIn();renderAll();
    }
    function debugMineOpenShaft(){
        if(!debugModeOk('mine','蛇骨矿洞'))return;
        const m=mineState();m.centralOpen=true;m.bossDefeated=true;
        addLog('🔧 调试：中央竖井已开启');renderAll();
    }
    function debugMineDefeatBoss(){
        if(!debugModeOk('mine','蛇骨矿洞'))return;
        const m=mineState();
        const boss=m.monsters.find(u=>u.boss&&!u.destroyed);
        if(!boss){m.centralOpen=true;m.bossDefeated=true;addLog('调试：矿主已经被击败');renderAll();return;}
        boss.hp=0;boss.destroyed=true;
        m.monsters=m.monsters.filter(u=>u!==boss);gameState.monsters.units=m.monsters;
        m.bossDefeated=true;m.centralOpen=true;
        addLog('🔧 调试：蛇骨矿主被移除，中央竖井开启');renderAll();
    }
    function debugMineResetPickups(){
        if(!debugModeOk('mine','蛇骨矿洞'))return;
        const m=mineState();
        m.crystals=MINE_CRYSTAL_TILES.map(p=>({x:p.x,y:p.y}));
        m.relics=MINE_RELIC_TILES.map(p=>({x:p.x,y:p.y}));
        addLog('🔧 调试：晶簇与遗物已恢复');renderAll();
    }
    function debugMineReveal(){
        if(!debugModeOk('mine','蛇骨矿洞'))return;
        mineAllUnits().forEach(u=>u.revealedRound=gameState.turn);
        addLog('🔧 调试：矿洞内所有单位本回合可见');renderAll();
    }
    function debugMineBeasts(){
        if(!debugModeOk('mine','蛇骨矿洞'))return;
        mineBeastTurn();addLog('🔧 调试：矿兽已立即行动');renderAll();
    }
    function debugMineSpawn(kind){
        if(!debugModeOk('mine','蛇骨矿洞'))return;
        const m=mineState(),spots=[];
        for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
            if(isMineWall(x,y)||mineUnitAt(x,y))continue;
            if(MINE_SHAFTS.some(s=>s.x===x&&s.y===y))continue;
            if(MINE_CRYSTAL_TILES.some(p=>p.x===x&&p.y===y)||MINE_RELIC_TILES.some(p=>p.x===x&&p.y===y))continue;
            spots.push({x,y});
        }
        if(!spots.length){addLog('调试：矿洞没有空位');return;}
        const spot=spots[Math.floor(Math.random()*spots.length)];
        const def=kind==='guard'?{mineType:'骨蛇守卫',hp:2,static:true}:{mineType:'矿兽',hp:1,beast:true};
        m.monsters.push(createUnit('步兵',spot.x,spot.y,'monster',Object.assign({layer:'mine'},def)));
        gameState.monsters.units=m.monsters;
        addLog(`🔧 调试：在矿洞(${spot.x},${spot.y})生成${def.mineType}`);renderAll();
    }
    function debugAllUnits(){ return [...getAllUnits(),...mineAllUnits()].filter(u=>u&&!u.destroyed); }
    function debugSelectedUnit(){ return gameState.selectedUnitId?debugAllUnits().find(u=>u.id===gameState.selectedUnitId)||null:null; }
    function refreshDebugTargetUnits(){
        const sel=document.getElementById('debug-target-unit'); if(!sel)return;
        const units=debugAllUnits(); const cur=gameState.selectedUnitId;
        sel.innerHTML='<option value="">选择任意战场单位</option>'+units.map(u=>{
            const layer=u.layer==='sky'?'天空':u.layer==='mine'?'地下':'地面';
            const side=u.side==='red'?'红':u.side==='blue'?'蓝':u.side==='imperial'?'波斯':u.side==='monster'?'矿兽':'鬼';
            return '<option value="'+u.id+'">['+side+'/'+layer+'] '+unitDisplayName(u)+' ('+u.x+','+u.y+')</option>';
        }).join('');
        sel.value=units.some(u=>u.id===cur)?cur:'';
    }
    function toggleDebugMode(){ debugState.active=!debugState.active; if(!debugState.active) debugState.deployMode=false; document.getElementById('debug-panel').style.display=debugState.active?'block':'none'; if(typeof debugState!=='undefined'&&debugState.active){syncDebugModeSections();refreshDebugTargetUnits();} renderAll(); }
    function handleDebugAddCard(side){ const cardId=parseInt(document.getElementById('debug-card-select').value,10); const player=getPlayer(side); player.library.push(cardId); player.usedSkills.add(cardId); addLog(`调试：${side==='red'?'红':'蓝'}方获得${window.SKILL_CARD_MAP[cardId].name}`); renderAll(); }
    function handleDebugAddBuff(buff){ const sel=debugSelectedUnit(); if(!sel){ addLog('调试：请先选中一个单位'); return; } sel.permaBuffs=sel.permaBuffs||[]; if(!sel.permaBuffs.includes(buff)) sel.permaBuffs.push(buff); addLog(`调试：为${sel.type}添加${buff}`); renderAll(); }
    /* 修复10：调试模式扩展 - 加一层混乱 */
    function handleDebugAddChaos(){ const sel=debugSelectedUnit(); if(!sel){ addLog('调试：请先选中一个单位'); return; } sel.chaos=(sel.chaos||0)+1; addLog(`调试：为${sel.type}添加一层混乱(当前${sel.chaos}层)`); renderAll(); }
    /* 修复11：调试模式扩展 - 解除一层混乱 */
    function handleDebugRemoveChaos(){ const sel=debugSelectedUnit(); if(!sel){ addLog('调试：请先选中一个单位'); return; } sel.chaos=Math.max(0,(sel.chaos||1)-1); addLog(`调试：解除一层混乱(当前${sel.chaos}层)`); renderAll(); }
    /* 修复12：调试模式扩展 - 移除单位与清除属性 */
    function handleDebugRemoveUnit(){ const sel=debugSelectedUnit(); if(!sel){ addLog('调试：请先选中一个单位'); return; } sel.destroyed=true; gameState.selectedUnitId=null; addLog(`调试：已移除${sel.type}`); renderAll(); }
    function handleDebugRemoveAllBuffs(){ const sel=debugSelectedUnit(); if(!sel){ addLog('调试：请先选中一个单位'); return; } sel.permaBuffs=[]; sel.tempBuffs=[]; sel.suppressed=false; sel.chaos=0; addLog(`调试：已清除${sel.type}的所有属性和混乱`); renderAll(); }
    document.getElementById('debug-mode-btn').addEventListener('click', toggleDebugMode);
    document.getElementById('debug-target-unit')?.addEventListener('change',e=>{ const id=e.currentTarget.value; gameState.selectedUnitId=id?Number(id):null; renderAll(); });
    document.getElementById('debug-add-red').addEventListener('click', ()=>handleDebugAddCard('red'));
    document.getElementById('debug-add-blue').addEventListener('click', ()=>handleDebugAddCard('blue'));
    document.getElementById('debug-deploy-mode').addEventListener('click', ()=>{ debugState.deployMode=!debugState.deployMode; debugState.pendingSide=document.getElementById('debug-unit-side').value; debugState.pendingType=document.getElementById('debug-unit-type').value; addLog(`调试：部署模式${debugState.deployMode?'开启':'关闭'} (${debugState.pendingSide==='red'?'红':'蓝'}方${debugState.pendingType})`); });
    document.querySelectorAll('[data-debug-buff]').forEach(btn=>btn.addEventListener('click',()=>handleDebugAddBuff(btn.dataset.debugBuff)));
    document.getElementById('debug-add-chaos').addEventListener('click', handleDebugAddChaos);
    document.getElementById('debug-remove-chaos').addEventListener('click', handleDebugRemoveChaos);
    document.getElementById('debug-remove-unit').addEventListener('click', handleDebugRemoveUnit);
    document.getElementById('debug-remove-all-buffs').addEventListener('click', handleDebugRemoveAllBuffs);

    /* 模式专属调试：只显示当前模式的选项 */
    document.querySelectorAll('[data-debug-weather]').forEach(btn=>btn.addEventListener('click',()=>{
        const kind=btn.dataset.debugWeather;
        if(kind==='snow1')debugSetSnowWeather(1);
        else if(kind==='snow2')debugSetSnowWeather(2);
        else debugSetClassicWeather(kind);
    }));
    document.querySelectorAll('[data-debug-wind]').forEach(btn=>btn.addEventListener('click',()=>debugSetPirateWind(Number(btn.dataset.debugWind))));
    document.getElementById('debug-pirate-drift')?.addEventListener('click',()=>{
        if(!debugModeOk('pirate','海盗'))return;
        applyPirateDrift();addLog('🔧 调试：已触发顺风漂移');renderAll();
    });
    document.getElementById('debug-fog-grave-add')?.addEventListener('click',()=>debugFogGrave(1));
    document.getElementById('debug-fog-grave-remove')?.addEventListener('click',()=>debugFogGrave(-1));
    document.getElementById('debug-fog-spawn')?.addEventListener('click',debugFogSpawnGhost);
    document.querySelectorAll('[data-debug-wannan-incident]').forEach(btn=>btn.addEventListener('click',()=>debugWannanIncident(btn.dataset.debugWannanIncident)));
    document.getElementById('debug-wannan-friction')?.addEventListener('click',debugWannanFriction);
    document.getElementById('debug-wannan-imperial')?.addEventListener('click',debugWannanImperialReinforce);
    document.querySelectorAll('[data-debug-holy-score]').forEach(btn=>btn.addEventListener('click',()=>debugHolyScore(btn.dataset.debugHolyScore)));
    document.getElementById('debug-holy-check')?.addEventListener('click',debugHolyCheck);
    document.getElementById('debug-holy-dragon-mark')?.addEventListener('click',debugHolyDragonMark);
    document.getElementById('debug-holy-grant-dragon')?.addEventListener('click',debugHolyGrantDragon);
    document.getElementById('debug-holy-warning')?.addEventListener('click',debugHolyWarning);
    document.getElementById('debug-holy-erupt')?.addEventListener('click',debugHolyErupt);
    document.getElementById('debug-holy-reinforce')?.addEventListener('click',debugHolyReinforce);
    document.getElementById('debug-mine-cavein-schedule')?.addEventListener('click',debugMineScheduleCaveIn);
    document.getElementById('debug-mine-cavein')?.addEventListener('click',debugMineCaveInNow);
    document.getElementById('debug-mine-shaft')?.addEventListener('click',debugMineOpenShaft);
    document.getElementById('debug-mine-boss')?.addEventListener('click',debugMineDefeatBoss);
    document.getElementById('debug-mine-pickups')?.addEventListener('click',debugMineResetPickups);
    document.getElementById('debug-mine-reveal')?.addEventListener('click',debugMineReveal);
    document.getElementById('debug-mine-beasts')?.addEventListener('click',debugMineBeasts);
    document.querySelectorAll('[data-debug-mine-spawn]').forEach(btn=>btn.addEventListener('click',()=>debugMineSpawn(btn.dataset.debugMineSpawn)));

    /* 雪原13：雪原公共事件调试按钮事件绑定 */
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`debug-snow-event-${i}`)?.addEventListener('click', () => {
            if (gameState.gameMode !== 'snow') {
                addLog('仅在雪原模式下可用');
                return;
            }
            switch(i) {
                case 1: eventSnowBlock(); break;
                case 2: eventFortificationWalls(); break;
                case 3: eventColdWave(); break;
                case 4: eventSunshine(); break;
                case 5: eventNewStart(); break;
                case 6: eventWolfHowl(); break;
            }
        });
    }
    /* 海盗：海盗公共事件调试按钮 */
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`debug-pirate-event-${i}`)?.addEventListener('click', () => {
            if (gameState.gameMode !== 'pirate') {
                addLog('仅在海盗模式下可用');
                return;
            }
            switch(i) {
                case 1: eventRagingWave(); break;
                case 2: eventCannonBarrage(); break;
                case 3: eventBoatResupply(); break;
                case 4: eventSeaMonster(); break;
            }
        });
    }
    
    /* 雾夜幽乡：强制切换状态（无视回合与墓碑数量限制） */
    document.getElementById('debug-fog-night')?.addEventListener('click',()=>{
        if(gameState.gameMode!=='fog'){addLog('仅在雾夜幽乡模式下可用');return;}
        gameState.fogStateOverride=true;gameState.fogNight=true;gameState.revealGhostsUntil=0;syncFogWeather();
        addLog('🌫️ 调试：强制进入雾夜（鬼魂隐没）');renderAll();
    });
    document.getElementById('debug-fog-dawn')?.addEventListener('click',()=>{
        if(gameState.gameMode!=='fog'){addLog('仅在雾夜幽乡模式下可用');return;}
        gameState.fogStateOverride=false;gameState.fogNight=false;syncFogWeather();
        addLog('🌅 调试：强制进入初晖（鬼魂显形）');renderAll();
    });
    document.getElementById('debug-fog-auto')?.addEventListener('click',()=>{
        if(gameState.gameMode!=='fog'){addLog('仅在雾夜幽乡模式下可用');return;}
        gameState.fogStateOverride=null;
        const graves=getGhost().units.filter(u=>u.type==='墓碑'&&!u.destroyed).length;
        gameState.fogNight=graves>=4;syncFogWeather();
        addLog('🔄 调试：恢复自动判定（当前墓碑'+graves+'个 → '+(gameState.fogNight?'雾夜':'初晖')+'）');renderAll();
    });
    document.getElementById('debug-exit').addEventListener('click', ()=>{ debugState.active=false; debugState.deployMode=false; document.getElementById('debug-panel').style.display='none'; renderAll(); });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){const cp=document.getElementById('copyrightPopup');if(cp&&cp.classList.contains('show')) cp.classList.remove('show');else if(document.getElementById('rulesPopup').style.display==='flex') document.getElementById('rulesPopup').style.display='none';else if(document.getElementById('weatherOverlay').classList.contains('show')) closeWeather();else if(document.getElementById('cardHelpOverlay').classList.contains('show')) closeCardHelp();else if(gameState.skillTargetRequest||gameState.skillTransaction)cancelSkillTarget();}});

    // ── 悔棋 / 卡牌详情 / 记录导出 / 电脑对手（仅单机版） ─────────────
    const undoStack=[];
    function updateUndoButton(){
        const btn=document.getElementById('undo-btn'); if(!btn)return;
        const aiTurn=!!(gameState.aiSide && gameState.activeSide===gameState.aiSide);
        btn.disabled=!undoStack.length||aiTurn||gameState.gameOver;
    }
    function pushUndo(label){
        if(gameState.gameOver) return;
        if(gameState.aiSide && gameState.activeSide===gameState.aiSide) return;
        try{
            undoStack.push({state:skillClone(gameState),logs:logMessages.slice(),label:label||'行动'});
            if(undoStack.length>40) undoStack.shift();
        }catch(error){ return; }
        updateUndoButton();
    }
    function undoLastAction(){
        if(!undoStack.length) return;
        const last=undoStack.pop();
        clearGameTimers();
        gameState=last.state; logMessages=last.logs;
        gameState.actionInProgress=false; gameState.skillResolving=false;
        gameState.skillTransaction=null; gameState.skillTargetRequest=null;
        document.getElementById('drawOverlay').style.display='none';
        document.getElementById('victoryOverlay').style.display='none';
        document.getElementById('targetHint').style.display='none';
        clearDeploySelection();
        addLog(`↩️ 已悔棋（撤销：${last.label}）`);
        renderAll(); updateUndoButton();
    }

    function cardKeywordEntries(card){
        if(typeof window!=='undefined'&&window.ChaosUI) return window.ChaosUI.cardKeywordEntries(card, CARD_KEYWORD_HELP);
        const desc=(card&&card.desc)||'';
        return Object.keys(CARD_KEYWORD_HELP||{})
            .sort((a,b)=>b.length-a.length)
            .filter(key=>desc.includes(key))
            .map(key=>({key,text:CARD_KEYWORD_HELP[key]}));
    }
    function openCardHelp(cardId){
        const card=window.SKILL_CARD_MAP[cardId]||SKILL_LIBRARY.find(c=>c.id===Number(cardId));
        if(!card) return;
        const model=window.ChaosUI.cardHelpModel(card,{entries:cardKeywordEntries(card),note:(CARD_NOTES&&CARD_NOTES[card.id])||''});
        document.getElementById('cardHelpTitle').textContent=model.title;
        document.getElementById('cardHelpMeta').textContent=model.meta;
        document.getElementById('cardHelpDesc').textContent=model.desc;
        const note=document.getElementById('cardHelpNote');
        note.textContent=model.note||''; note.classList.toggle('show',!!model.note);
        document.getElementById('cardHelpKeywords').innerHTML=model.keywordsHTML;
        document.getElementById('cardHelpOverlay').classList.add('show');
    }
    function closeCardHelp(){ document.getElementById('cardHelpOverlay').classList.remove('show'); }
    document.getElementById('cardHelpClose').onclick=closeCardHelp;
    document.getElementById('cardHelpOverlay').addEventListener('click',e=>{ if(e.target===e.currentTarget)closeCardHelp(); });

    /* 天候栏：当前天候 + 下期预报，点击查看完整公开信息。 */
    function renderWeatherChip(){
        const chip=document.getElementById('weather-chip');
        if(!chip) return;
        if(gameState.gameMode==='neon'){
            const ns=neonState(),meta=ns.activeEvent?neonEventMeta(ns.activeEvent):null,next=ns.event;
            if(meta||next){
                chip.innerHTML='<span class="wx-icon">📡</span><span class="wx-label">'+(meta?'公共事件':'事件预报')+'</span>'
                    +'<span class="wx-effect">'+(meta?meta.icon+' '+meta.name:next.icon+' '+next.name+' · 回'+next.dueTurn)+'</span>'
                    +(next&&meta?'<span class="wx-sep">/</span><span class="wx-next">下回 '+next.icon+' '+next.name+'</span>':'');
                chip.title=meta?`公共事件：${meta.name} · ${meta.desc}`:'事件预报';
                chip.style.display='inline-flex';
                document.body.dataset.weather='';
                if(window.ChaosWeatherFX) window.ChaosWeatherFX.clear();
                return;
            }
        }
        const w=weatherView();
        if(!w){
            chip.style.display='none';
            document.body.dataset.weather='';
            if(window.ChaosWeatherFX) window.ChaosWeatherFX.clear();
            return;
        }
        chip.innerHTML=window.ChaosUI.weatherChipHTML(w);
        chip.title='天候：'+w.label+' · '+w.shortEffect+'（点击查看详情）';
        chip.style.display='inline-flex';
        document.body.dataset.weather=w.mode==='snow'
            ?(w.level===2?'snow-heavy':'snow-light')
            :(w.mode==='fog'?w.kind:(w.mode==='classic'?'classic-'+w.kind:w.mode));
        if(window.ChaosWeatherFX) window.ChaosWeatherFX.set(w);
        const key=w.mode+':'+w.kind+':'+w.level;
        if(key!==lastSnowWeatherKey){
            lastSnowWeatherKey=key;
            if(w.mode==='snow') initSnowEffect();
        }
    }
    function weatherDetailRow(label,value){
        return '<div class="weather-row"><span class="weather-k">'+label+'</span><span class="weather-v">'+value+'</span></div>';
    }
    function openWeather(){
        const w=weatherView();
        if(!w) return;
        const title=document.getElementById('weatherTitle');
        const body=document.getElementById('weatherDetail');
        if(!title||!body) return;
        title.textContent='【'+w.label+'】';
        let rows=window.ChaosUI.weatherDetailRows(w);
        body.innerHTML='<div class="weather-hero"><span class="wx-big">'+w.icon+'</span><div><strong>'+w.label+'</strong><small>'
            +(w.decorative?'仅表现 · 不影响规则':'公开信息 · 双方均可见')+'</small></div></div>'
            +rows+'<div class="weather-note">天候与预报在双方界面同时公开；预报只在本回合内有效。规则以规则页「六、天候系统」为准。</div>';
        document.getElementById('weatherOverlay').classList.add('show');
    }
    function closeWeather(){ document.getElementById('weatherOverlay').classList.remove('show'); }
    document.getElementById('weather-chip').onclick=openWeather;
    document.getElementById('weatherClose').onclick=closeWeather;
    document.getElementById('weatherOverlay').addEventListener('click',e=>{ if(e.target===e.currentTarget)closeWeather(); });
    document.getElementById('undo-btn').onclick=undoLastAction;

    function exportReplayLocal(){
        if(!gameState.gameMode) return;
        const stamp=new Date();
        const pad=n=>String(n).padStart(2,'0');
        const date=`${stamp.getFullYear()}-${pad(stamp.getMonth()+1)}-${pad(stamp.getDate())} ${pad(stamp.getHours())}:${pad(stamp.getMinutes())}:${pad(stamp.getSeconds())}`;
        const units=getAllUnits().filter(u=>!u.destroyed).map(u=>`${getFactionName(u.side)} ${unitDisplayName(u)} (${u.x},${u.y})${u.chaos?' 混乱'+u.chaos:''}`);
        const lines=[
            '混乱与蠕动 · 单机对局记录',
            '时间：'+date,
            '模式：'+(MODE_NAMES[gameState.gameMode]||gameState.gameMode),
            '先手：'+getFactionName(gameState.startingSide||'red'),
            '结果：'+(gameState.winner||'未结束'),
            '回合：'+gameState.turn,
            '电脑对手：'+(gameState.aiSide?getFactionName(gameState.aiSide):'无'),
            '',
            '—— 现存单位 ——',
            ...(units.length?units:['（无）']),
            '',
            '—— 对局日志 ——',
            ...logMessages
        ];
        const blob=new Blob([lines.join('\r\n')],{type:'text/plain;charset=utf-8'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url; a.download=`混乱与蠕动-单机-${stamp.getTime()}.txt`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),2000);
        addLog('📄 已导出本局记录');
    }
    document.getElementById('exportReplayBtn').onclick=exportReplayLocal;

    // ── 电脑对手：蓝方由启发式 AI 操作 ─────────────────────────────
    const AI_DEPLOY_PLAN=[['车',1],['炮兵',1],['步兵',3],['地雷',1],['防御工事',1],['后勤兵',1]];
    let aiDeploySide=null;
    function aiCountUnits(side,type){
        return getPlayer(side).units.filter(u=>!u.destroyed && (u.type===type || u.armoryType===type || (type==='炮兵'&&u.type==='海炮'))).length;
    }
    function aiFreeTile(side){
        for(let x=COLS-1;x>=0;x--) for(let y=0;y<ROWS;y++){
            if(!isInTerritory(x,y,side,gameState.gameMode)) continue;
            if(isBlockedTile(x,y,gameState.gameMode) || neonDeployLocked(x,y) || unitAt(x,y)) continue;
            if(gameState.gameMode==='pirate' && isPirateBoatPoint(x,y)) continue;
            return {x,y};
        }
        return null;
    }
    function aiDeployOnce(){
        const side=gameState.aiSide; if(!side) return false;
        const player=getPlayer(side);
        for(const [type,limit] of AI_DEPLOY_PLAN){
            if(aiCountUnits(side,type)>=limit) continue;
            const cost=unitDeployCost(type);
            if(player.resources<cost) continue;
            const pos=aiFreeTile(side); if(!pos) continue;
            gameState.pendingDeployType=type;
            const before=player.units.length;
            deployUnit(pos.x,pos.y);
            if(player.units.length>before) return true;
        }
        return false;
    }
    function aiNearestEnemy(unit){
        const focus=gameState.levelAI&&gameState.levelAI.focusRole;
        if(focus){
            const roleTarget=getPlayer('red').units.find(u=>!u.destroyed&&u.levelRole===focus);
            if(roleTarget)return roleTarget;
        }
        const enemies=getEnemyFactions(gameState.aiSide,'combat').flatMap(side=>getPlayer(side).units.filter(u=>!u.destroyed&&!['地雷','墓碑'].includes(u.type)));
        let best=null,dist=Infinity;
        for(const e of enemies){
            const d=Math.abs(e.x-unit.x)+Math.abs(e.y-unit.y);
            if(d<dist){dist=d;best=e;}
        }
        return best;
    }
    function aiSkyAction(u){
        const tiles=holySkyActionTiles(u);
        if(!tiles.length)return false;
        const attack=tiles.find(t=>t.type==='attack');
        if(attack&&attack.target)return resolveHolySkyAttack(u,attack.target);
        const moves=tiles.filter(t=>t.type==='move');
        if(!moves.length)return false;
        const enemy=aiNearestEnemy(u);
        if(!enemy)return false;
        moves.sort((a,b)=>(Math.abs(a.x-enemy.x)+Math.abs(a.y-enemy.y))-(Math.abs(b.x-enemy.x)+Math.abs(b.y-enemy.y)));
        const tile=moves[0];
        u.x=tile.x;u.y=tile.y;
        addLog(`☁️ ${getFactionName(u.side)}${u.type}在天空移动`);
        completeUnitAction(u,u.side);
        return true;
    }
    function aiMineTakeAction(){
        if(gameState.gameMode!=='mine'||gameState.aiSide!=='blue')return false;
        const units=mineUnitsOf('blue').filter(u=>!u.destroyed&&canUnitAct(u,'blue')&&canAffordAction(u,'blue')&&u._aiSkipKey!==gameState.turnSerial);
        const saboteur=units.find(u=>u.armoryType==='工兵'||u.levelRole==='saboteur');
        const cart=mineUnitsOf('red').find(u=>u.levelRole==='runner');
        if(saboteur&&cart){
            const tx=Math.min(COLS-1,cart.x+1),ty=cart.y;
            if(!isMineWall(tx,ty)&&!mineUnitAt(tx,ty)){
                mineState().blocked.push({x:tx,y:ty,until:gameState.turn+2});
                completeUnitAction(saboteur,'blue');
                addLog('💣 蓝方工兵炸毁轨道：('+tx+','+ty+') 被封堵');
                return true;
            }
        }
        for(const u of units){
            const tiles=getMineActionTiles(u);
            const attack=tiles.find(t=>t.type==='attack');
            if(attack&&attack.target){mineTryAttack(u,attack.target);return true;}
        }
        const enemies=mineUnitsOf('red').filter(u=>!u.destroyed);
        if(!enemies.length)return false;
        for(const u of units){
            const moves=getMineActionTiles(u).filter(t=>t.type==='move');
            if(!moves.length){u._aiSkipKey=gameState.turnSerial;continue;}
            const enemy=enemies.slice().sort((a,b)=>(Math.abs(a.x-u.x)+Math.abs(a.y-u.y))-(Math.abs(b.x-u.x)+Math.abs(b.y-u.y)))[0];
            moves.sort((a,b)=>(Math.abs(a.x-enemy.x)+Math.abs(a.y-enemy.y))-(Math.abs(b.x-enemy.x)+Math.abs(b.y-enemy.y)));
            if(mineTryMove(u,moves[0].x,moves[0].y))return true;
            u._aiSkipKey=gameState.turnSerial;
        }
        return false;
    }
    function fanaticDetonate(u){
        const targets=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>unitAt(u.x+dx,u.y+dy)).filter(o=>o&&o.side==='red'&&!o.unit.destroyed);
        for(const o of targets){damageUnit(o.unit,u,{sourceSide:'blue'});addUnitChaos(o.unit,1,'blue');}
        addLog(`💥 狂热二阶步兵自爆：波及 ${targets.length} 个红方单位`);
        damageUnit(u,null,{direct:true,sourceSide:'blue'});
        return true;
    }
    function bomberDetonate(u){
        const cannon=getPlayer('red').units.find(v=>!v.destroyed&&v.levelRole==='cannon');
        if(!cannon||Math.abs(cannon.x-u.x)+Math.abs(cannon.y-u.y)!==1)return false;
        damageUnit(cannon,u,{direct:true,sourceSide:'blue'});
        damageUnit(u,null,{direct:true,sourceSide:'blue'});
        addLog('💣 蓝方工兵引爆炸药，重炮被炸毁');
        return true;
    }
    function aiTakeAction(){
        const side=gameState.aiSide;
        const units=getPlayer(side).units.filter(u=>!u.destroyed && canUnitAct(u,side) && canAffordAction(u,side) && u._aiSkipKey!==gameState.turnSerial);
        const focus=gameState.levelAI&&gameState.levelAI.focusRole;
        if(gameState.levelId==='classic-11'){
            const cannon=getPlayer('red').units.find(u=>!u.destroyed&&u.levelRole==='cannon');
            if(cannon)units.sort((a,b)=>(Math.abs(a.x-cannon.x)+Math.abs(a.y-cannon.y))-(Math.abs(b.x-cannon.x)+Math.abs(b.y-cannon.y)));
        }
        let acted=false;
        for(const u of units){
            if(u.layer==='sky'){
                if(aiSkyAction(u)){acted=true;break;}
                u._aiSkipKey=gameState.turnSerial;continue;
            }
            if(u.fanatic){
                const adj=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const o=unitAt(u.x+dx,u.y+dy);return o&&o.side==='red'&&!o.unit.destroyed;});
                if(adj){fanaticDetonate(u);acted=true;break;}
            }
            if(u.levelRole==='bomber'&&bomberDetonate(u)){acted=true;break;}
            const tiles=getUnitActionTiles(u);
            const heal=tiles.find(t=>t.type==='heal');
            if(heal){
                const target=unitAt(heal.x,heal.y);
                acted=!!(target&&tryRemoveChaos(u,target.unit));
                if(acted) break;
            }
            const attacks=tiles.filter(t=>t.type==='attack');
            if(attacks.length){
                attacks.sort((a,b)=>{
                    const ta=a.target||(unitAt(a.x,a.y)||{}).unit, tb=b.target||(unitAt(b.x,b.y)||{}).unit;
                    const ra=focus&&ta&&ta.levelRole===focus?0:1, rb=focus&&tb&&tb.levelRole===focus?0:1;
                    return ra-rb||((ta&&ta.hp)||1)-((tb&&tb.hp)||1);
                });
                const tile=attacks[0];
                const target=tile.target||(unitAt(tile.x,tile.y)||{}).unit;
                if(!target) continue;
                if(u.type==='车') acted=chariotAttack(u,target);
                else if(isRangedUnit(u)||tile.grenadier) acted=resolveArtilleryAttack(u,tile.x,tile.y,{grenadier:!!tile.grenadier});
                else acted=tryAttack(u,target,tile.x,tile.y);
                if(!acted){u._aiSkipKey=gameState.turnSerial;continue;}
                break;
            }
        }
        if(!acted){
            for(const u of units){
                const tiles=getUnitActionTiles(u).filter(t=>t.type==='move');
                if(!tiles.length){u._aiSkipKey=gameState.turnSerial;continue;}
                const enemy=aiNearestEnemy(u);
                if(!enemy){u._aiSkipKey=gameState.turnSerial;continue;}
                tiles.sort((a,b)=>(Math.abs(a.x-enemy.x)+Math.abs(a.y-enemy.y))-(Math.abs(b.x-enemy.x)+Math.abs(b.y-enemy.y)));
                const tile=tiles[0];
                acted=u.type==='车'?chariotMove(u,tile.x,tile.y):tryMove(u,tile.x,tile.y);
                if(!acted){u._aiSkipKey=gameState.turnSerial;continue;}
                break;
            }
        }
        if(!acted){ endTurn(); return; }
        updateUndoButton();
    }
    function aiResolveTarget(){
        const side=gameState.aiSide;
        let guard=0;
        while(gameState.skillTargetRequest && gameState.skillTargetRequest.chooserSide===side && guard++<12){
            const req=gameState.skillTargetRequest;
            const candidates=skillCandidates(req);
            if(!candidates.length){
                if(req.minCount!==undefined) finishSkillTarget(); else cancelSkillTarget();
                break;
            }
            handleSkillTargetClick(candidates[0].x,candidates[0].y,skillTargetLayer(candidates[0]));
        }
        if(gameState.skillTargetRequest && gameState.skillTargetRequest.chooserSide===side){
            const req=gameState.skillTargetRequest;
            if(req.selected.length>=(req.minCount!==undefined?req.minCount:req.count)) finishSkillTarget();
        }
    }
    function aiTick(){
        const side=gameState.aiSide;
        if(!side || gameState.gameOver) return;
        try{
            // 防御性看门狗：炮弹动画节点已被清理但状态未复位时，避免 AI 永久卡住。
            if(gameState.actionInProgress && !document.querySelector('.cannonball')) gameState.actionInProgress=false;
            if(gameState.phase==='ARMORY'){
                const current=armoryCurrentSide();
                if(current===side && gameState.armory && !gameState.armory[side].ready){
                    armorySkip(side);
                    renderArmoryOverlay();
                }
                return;
            }
            if(gameState.skillTargetRequest){
                if(gameState.skillTargetRequest.chooserSide===side) aiResolveTarget();
                return;
            }
            if(gameState.pendingModeEvent) return;
            if(gameState.wannanIncidentPrompt){
                if(gameState.wannanIncidentPrompt.side===side){
                    const other=side==='red'?'blue':'red';
                    const mine=getPlayer(side).units.filter(u=>!u.destroyed&&!['地雷','防御工事'].includes(u.type)).length;
                    const theirs=getPlayer(other).units.filter(u=>!u.destroyed&&!['地雷','防御工事'].includes(u.type)).length;
                    resolveWannanIncidentChoice(side,mine>=5&&theirs<=3);
                }
                return;
            }
            if(gameState.phase==='DEPLOY'){
                if(gameState.deploySide!==side || gameState.activeSide!==side) return;
                if(!aiDeployOnce()) finishDeployPhase();
                return;
            }
            if(gameState.phase!=='ACTION' || gameState.activeSide!==side) return;
            if(gameState.imperialActing || gameState.ghostActing || gameState.actionInProgress || gameState.skillResolving || gameState.skillTransaction) return;
            if(gameState.turnPhase==='DRAW' || gameState.turnPhase==='USE_CARD'){
                gameState.turnPhase='ACTION'; gameState.cardUseMode=false; gameState.selectedCardId=null;
                renderAll(); return;
            }
            if(gameState.turnPhase!=='ACTION') return;
            if(gameState.gameMode==='mine'&&aiMineTakeAction())return;
            aiTakeAction();
        }catch(error){
            console.error('[AI]',error);
            if(gameState.phase==='ACTION' && gameState.activeSide===side) endTurn();
        }
    }
    setInterval(aiTick,420);


    function controlsLocked(){return gameState.gameOver||gameState.skillResolving||gameState.skillTransaction||gameState.actionInProgress||gameState.pendingModeEvent||gameState.wannanIncidentPrompt||gameState.skillTargetRequest||gameState.imperialActing||gameState.ghostActing||document.getElementById('drawOverlay').style.display==='flex';}
    document.querySelectorAll('.deploy-btn').forEach(btn=>btn.addEventListener('click',e=>{if(e.currentTarget.id==='deploy-done-btn')return;if(gameState.phase!=='DEPLOY'||gameState.gameOver)return;handleDeployButtonClick(e.currentTarget,e.currentTarget.dataset.type);renderAll();}));
    function finishDeployPhase(){
        const p=getPlayer(gameState.deploySide);
        const combatUnits=[...p.units,...(gameState.mineOnly?mineUnitsOf('red'):[])];
        if(!combatUnits.some(u=>!u.destroyed&&!['地雷','防御工事'].includes(u.type))){addLog('请至少部署一个可以战斗的单位');return false;}
        if(gameState.levelMode && gameState.deploySide===gameState.startingSide){
            gameState.phase='ACTION';gameState.activeSide=gameState.startingSide;gameState.turn=1;gameState.turnPhase='DRAW';
            if(gameState.gameMode==='wannan')deployImperialForces();
            addLog('📖 蓝方已按关卡配置布防，战斗开始');
            clearDeploySelection();gameState.pendingDeployType=null;
            startRound();renderAll();return true;
        }
        const first=gameState.startingSide||'red',second=first==='red'?'blue':'red';
        if(gameState.deploySide===first){gameState.deploySide=second;gameState.activeSide=second;addLog(getFactionName(second)+'开始部署');}
        else{if(gameState.gameMode==='wannan')deployImperialForces();gameState.phase='ACTION';gameState.activeSide=first;gameState.turn=1;startRound();}
        clearDeploySelection();renderAll();return true;
    }
    document.getElementById('deploy-done-btn').onclick=finishDeployPhase;
    document.getElementById('draw-btn').onclick=()=>{if(!controlsLocked())drawCards();};
    document.getElementById('armorySkipBtn').onclick=()=>{const side=armoryCurrentSide();if(side&&armorySkip(side))renderArmoryOverlay();};
    document.getElementById('drawPeekBtn').onclick=startDrawPeek;
    document.getElementById('drawPeekBack').onclick=stopDrawPeek;
    document.getElementById('use-card-btn').onclick=()=>{
        if(controlsLocked()||gameState.phase!=='ACTION')return;
        const p=getPlayer(gameState.activeSide);
        if(!gameState.doubleCardMode&&p.smoothComboRemainingRounds>0&&p.skillsUsedThisTurn===0){
            if(confirm('本回合是否使用两张技能卡？')){gameState.doubleCardMode=true;}
        }
        const limit=gameState.doubleCardMode?2:1;
        if(p.skillsUsedThisTurn>=limit){addLog('本回合用卡次数已用完');return;}
        gameState.turnPhase='USE_CARD';gameState.cardUseMode=true;renderAll();
    };
    document.getElementById('play-card-btn').onclick=()=>{if(!controlsLocked())playSelectedCard();};
    document.getElementById('start-action-btn').onclick=()=>{
        if(controlsLocked())return;
        gameState.turnPhase='ACTION';gameState.cardUseMode=false;gameState.selectedCardId=null;renderAll();
    };
    document.getElementById('end-turn-btn').onclick=()=>{if(!controlsLocked()&&gameState.turnPhase==='ACTION')endTurn();};
    document.getElementById('wannan-next-btn').onclick=()=>{if(gameState.gameMode==='wannan'&&!controlsLocked())endTurn();};
    document.getElementById('tide-purge-btn')?.addEventListener('click',()=>tideToggleMode('purge'));
    document.getElementById('tide-mark-btn')?.addEventListener('click',()=>tideToggleMode('mark'));
    document.getElementById('fog-next-btn').onclick=()=>{if(gameState.gameMode==='fog'&&!controlsLocked())endTurn();};
    const chooseWannanIncident=accept=>{const prompt=gameState.wannanIncidentPrompt;if(prompt)resolveWannanIncidentChoice(prompt.side,accept);};
    document.getElementById('wannanIncidentAccept').onclick=()=>chooseWannanIncident(true);
    document.getElementById('wannanIncidentDecline').onclick=()=>chooseWannanIncident(false);
    document.getElementById('cancel-btn').onclick=()=>{if(gameState.pendingModeEvent)return;gameState.selectedUnitId=null;gameState.tideMode=null;if(gameState.skillTargetRequest||gameState.skillTransaction)cancelSkillTarget();else{gameState.cardUseMode=false;gameState.selectedCardId=null;if(gameState.turnPhase==='USE_CARD')gameState.turnPhase='DRAW';}gameState.engineerBuildId=null;clearDeploySelection();renderAll();};
    document.getElementById('cancelTargetBtn').onclick=()=>cancelSkillTarget();
    document.getElementById('finishTargetBtn').onclick=()=>finishSkillTarget();
    document.getElementById('reset-btn').onclick=resetGame;document.getElementById('victoryResetBtn').onclick=resetGame;
    document.getElementById('victoryRematchBtn').onclick=()=>{
        if(!gameState.gameMode)return;
        const next=gameState.startingSide==='blue'?'red':'blue';
        selectMode(gameState.gameMode,next);
    };
    document.getElementById('surrender-btn').onclick=()=>{
        if(gameState.gameOver) return;
        const side=gameState.activeSide;
        if(!['red','blue'].includes(side)) { addLog('当前是电脑阵营行动，无法投降'); return; }
        if(!confirm(`确定${getFactionName(side)}投降？本局将立即结束。`)) return;
        surrenderGame(side);
    };
    document.getElementById('cancelDrawBtn').onclick=()=>{if(typeof cancelDrawCards==='function')cancelDrawCards();};
    document.getElementById('rerollDrawBtn').onclick=()=>{if(typeof rerollDrawCards==='function'){rerollDrawCards();drawCards();}};
    function reveal(kind,duration){if(gameState.gameOver)return;gameState[kind]=Date.now()+duration;renderAll();scheduleGame(renderAll,duration+10);}
    document.getElementById('view-cards-btn').onclick=()=>reveal('revealCardsUntil',5000);
    document.getElementById('view-mines-btn').onclick=()=>{if(!gameState.minesViewDisabled)reveal('revealMinesUntil',5000);};
    document.getElementById('view-enemy-btn').onclick=()=>reveal('revealEnemyUntil',3000);
    document.getElementById('ghost-view-btn').onclick=()=>{if(gameState.gameMode==='fog'&&gameState.fogNight)reveal('revealGhostsUntil',8000);};
    /* ══════════════════════════════════════════════════════════
       关卡战役：选择 → 剧情 → 固定蓝方 → 任务判定 → 结算/进度
       数据源：client/local/levels.js（window.ChaosLevels）
       ══════════════════════════════════════════════════════════ */
    const LEVEL_PROGRESS_KEY='chaos-writhe-level-progress-v2';
    let levelState={active:false,level:null,result:null};
    let tutorialState={active:false,id:null,step:0,refs:{},done:[]};
    let levelTabMode='classic';
    let storyQueue=[],storyIndex=0,storyOnDone=null,storyLevel=null,storyFinalLabel='开始战斗 ▸';
    function levelData(){ return window.ChaosLevels || null; }

    function loadLevelProgress(){
        try{ const raw=localStorage.getItem(LEVEL_PROGRESS_KEY); const obj=raw?JSON.parse(raw):{}; return obj&&typeof obj==='object'?obj:{}; }
        catch(error){ return {}; }
    }
    function saveLevelProgress(progress){
        try{ localStorage.setItem(LEVEL_PROGRESS_KEY,JSON.stringify(progress)); }catch(error){}
    }
    function isLevelCleared(id){ const p=loadLevelProgress(); return !!(p[id]&&p[id].cleared); }
    function markLevelCleared(level){
        if(!level) return;
        const p=loadLevelProgress();
        p[level.id]={cleared:true,turn:gameState.turn||0,at:Date.now()};
        saveLevelProgress(p);
        const total=levelData()?levelData().LEVELS.length:0;
        const done=Object.keys(p).filter(k=>p[k]&&p[k].cleared).length;
        const el=document.getElementById('levelProgressText');
        if(el)el.textContent='已通关 '+done+' / '+total;
    }
    function isLevelUnlocked(level){
        const L=levelData(); if(!L||!level) return false;
        const arr=L.levelsForMode(level.mode);
        const mainline=arr.filter(l=>!l.minigame);
        if(!level.minigame){
            const idx=mainline.findIndex(l=>l.id===level.id);
            if(idx<=0) return true;
            return isLevelCleared(mainline[idx-1].id);
        }
        const idx=arr.findIndex(l=>l.id===level.id);
        let anchor=null;
        for(let i=idx-1;i>=0;i--){if(!arr[i].minigame){anchor=arr[i];break;}}
        if(!anchor)anchor=mainline[0]||null;
        return !anchor||isLevelCleared(anchor.id);
    }
    function mainlineNext(level){
        const L=levelData(); if(!L||!level)return null;
        const mainline=L.levelsForMode(level.mode).filter(l=>!l.minigame);
        const idx=mainline.findIndex(l=>l.id===level.id);
        if(idx>=0&&idx+1<mainline.length)return mainline[idx+1];
        return null;
    }
    function progressNext(level){
        const L=levelData(); if(!L||!level)return null;
        if(!level.minigame)return mainlineNext(level);
        const arr=L.levelsForMode(level.mode);
        const idx=arr.findIndex(l=>l.id===level.id);
        for(let i=idx+1;i<arr.length;i++)if(!arr[i].minigame)return arr[i];
        return null;
    }
    /* 战役长剧情（序章 / 幕间 / 终章）只自动播放一次；可手动重看由“再打一次”不触发。 */
    const LEVEL_STORY_KEY='chaos-writhe-story-seen-v1';
    function loadStorySeen(){
        try{ const raw=localStorage.getItem(LEVEL_STORY_KEY); const obj=raw?JSON.parse(raw):{}; return obj&&typeof obj==='object'?obj:{}; }
        catch(error){ return {}; }
    }
    function isStorySeen(key){ return !!loadStorySeen()[key]; }
    function markStorySeen(key){
        try{ const seen=loadStorySeen(); seen[key]=Date.now(); localStorage.setItem(LEVEL_STORY_KEY,JSON.stringify(seen)); }catch(error){}
    }

    function levelStats(){
        if(!gameState.levelStats)gameState.levelStats={ghostBait:0,enemyLanded:false,seen:{},effectTurn:0,firstKill:false,redLost:0,soulEarned:{red:0,blue:0},collectedTiles:{},killedByType:{}};
        if(!gameState.levelStats.collectedTiles)gameState.levelStats.collectedTiles={};
        if(!gameState.levelStats.soulEarned)gameState.levelStats.soulEarned={red:0,blue:0};
        return gameState.levelStats;
    }
    function levelObjectiveTiles(){
        const lv=levelState.level; if(!lv)return [];
        const out=[];
        for(const c of lv.objective.conditions||[]){
            if(c.type==='hold'&&Number.isFinite(c.x))out.push({x:c.x,y:c.y,label:'据点'});
            else if(c.type==='escort'&&Number.isFinite(c.x))out.push({x:c.x,y:c.y,label:'护送终点'});
            else if(c.type==='capture'&&Array.isArray(c.tiles))c.tiles.forEach(([x,y])=>out.push({x,y,label:'占领点'}));
        }
        (lv.minigame&&lv.minigame.collectTiles||[]).forEach(([x,y])=>out.push({x,y,label:'收集物'}));
        return out;
    }
    function levelObjectiveTargetLabels(lv){
        if(!lv)return [];
        const labels=[];
        for(const c of lv.objective.conditions||[]){
            if(c.type==='killType')labels.push(c.unitType);
            else if(c.type==='killCount')labels.push(c.unitType);
            else if(c.type==='killBuff')labels.push('带'+c.buff+'的精锐');
            else if(c.type==='killMonster')labels.push('矿兽');
            else if(c.type==='killImperial')labels.push('波斯军');
            else if(c.type==='boss')labels.push('首领');
            else if(c.type==='protect')labels.push('保护目标');
            else if(c.type==='escort')labels.push('护送目标');
            else if(c.type==='collect')labels.push('收集物');
        }
        return [...new Set(labels)];
    }
    function levelUnitTargetInfo(u,side){
        const lv=levelState.level; if(!lv||!u)return '';
        for(const c of lv.objective.conditions||[]){
            if(c.type==='killType'&&side==='blue'&&(u.type===c.unitType||u.armoryType===c.unitType))return '任务目标：'+c.unitType;
            if(c.type==='killCount'&&side==='blue'&&(u.type===c.unitType||u.armoryType===c.unitType))return '任务目标：'+c.unitType;
            if(c.type==='killBuff'&&side==='blue'&&(u.permaBuffs||[]).includes(c.buff))return '任务目标：带'+c.buff+'的精锐';
            if(c.type==='killMonster'&&side==='monster')return '任务目标：矿兽';
            if(c.type==='killImperial'&&side==='imperial')return '任务目标：波斯军';
            if(c.type==='boss'&&u.levelBoss)return '任务目标：'+(u.bossName||'首领');
            if((c.type==='protect'||c.type==='escort')&&u.levelRole===c.role)return (c.type==='protect'?'保护目标：':'护送目标：')+unitDisplayName(u);
        }
        return '';
    }
    function updateLevelHoldStreak(){
        const lv=levelState.level; if(!lv)return;
        const hold=(lv.objective.conditions||[]).find(c=>c.type==='hold'&&c.turns);
        if(!hold)return;
        const key=hold.x+','+hold.y;
        const held=getPlayer('red').units.some(u=>!u.destroyed&&(u.layer||'ground')==='ground'&&u.x===hold.x&&u.y===hold.y);
        const st=levelStats();
        if(held){
            if(st.holdKey===key)st.holdStreak=(st.holdStreak||0)+1;
            else {st.holdKey=key;st.holdStreak=1;}
        }else{st.holdKey='';st.holdStreak=0;}
    }
    function mgState(){return gameState.minigameState||{};}
    const CONVEYOR_COSTS={'步兵':2,'车':6,'炮兵':4,'后勤兵':3,'地雷':3,'二阶步兵':3,'海炮':4};
    function conveyorSpawnWave(isFirst){
        const lv=levelState.level, mini=lv&&lv.minigame, c=mini&&mini.conveyor;
        if(!c)return false;
        const mg=mgState();
        let budget=0;
        if(isFirst){budget=c.first||10;mg.conveyorRemaining=(c.total||30)-budget;mg.conveyorNext=1+(c.interval||3);}
        else{
            if((mg.conveyorRemaining||0)<=0)return false;
            budget=Math.min(mg.conveyorRemaining,c.amount||5);
            if(c.stormBonus&&gameState.weather&&gameState.weather.mode==='snow'&&gameState.weather.kind==='snow'&&gameState.weather.level===2)budget=Math.min(mg.conveyorRemaining,c.stormBonus);
            mg.conveyorRemaining-=budget;mg.conveyorNext=gameState.turn+(c.interval||1);
        }
        let spent=0;const got=[];let lanternSpawned=false;
        const pool=((!isFirst&&c.afterFirstPool)?c.afterFirstPool:(c.pool||['步兵','车','炮兵','后勤兵'])).slice();
        for(let guard=0;guard<12&&budget>=2;guard++){
            const affordable=pool.filter(t=>(CONVEYOR_COSTS[t]||2)<=budget);
            if(!affordable.length)break;
            const type=affordable[Math.floor(Math.random()*affordable.length)];
            const cost=CONVEYOR_COSTS[type]||2;
            const u=spawnLevelRedUnit({type});
            if(!u)break;
            got.push(type);spent+=cost;budget-=cost;
        }
        if(spent<5){
            mg.lowWaveStreak=(mg.lowWaveStreak||0)+1;
            if(mg.lowWaveStreak>=2){
                const type=mini.mineOnly?'二阶步兵':'车';
                if(spawnLevelRedUnit({type})){got.push(type);spent+=CONVEYOR_COSTS[type]||3;mg.lowWaveStreak=0;}
            }
        }else mg.lowWaveStreak=0;
        if(c.lanternEveryWave&&!lanternSpawned){
            const l=spawnPlayerRole({type:'二阶步兵',role:'lantern',buffs:['lantern_bearer'],displayName:'执灯士'});
            if(l){got.push('执灯士');lanternSpawned=true;}
        }
        mg.conveyorWave=(mg.conveyorWave||0)+1;
        addLog('📦 第 '+mg.conveyorWave+' 波补给抵达，剩余总空投费用：'+(mg.conveyorRemaining||0));
        if(got.length)addLog('📦 本波空投：'+got.join('、'));
        return true;
    }
    function levelNoLabel(no){return typeof no==='number'?String(no).padStart(2,'0'):String(no);}
    function levelMiniLabel(lv,withIcon=true){
        if(!lv||!lv.minigame)return '';
        if(lv.minigame.conveyor)return withIcon?'📦 空投':'空投';
        return withIcon?'🧩 小游戏':'小游戏';
    }
    function levelCtx(){
        const alive=u=>!u.destroyed&&!['地雷','防御工事','墓碑'].includes(u.type);
        const mineBlue=gameState.gameMode==='mine'?mineUnitsOf('blue').filter(u=>!u.destroyed):[];
        const blueUnits=[...getPlayer('blue').units,...mineBlue];
        const mineRed=gameState.mineOnly?mineUnitsOf('red'):[];
        const redUnits=[...getPlayer('red').units,...mineRed];
        const imperialUnits=gameState.gameMode==='wannan'?getImperial().units:[];
        const monsterUnits=gameState.gameMode==='mine'?mineState().monsters:[];
        const blueByType={},blueByBuff={},imperialByType={},monsterByType={};
        blueUnits.forEach(u=>{
            if(u.destroyed)return;
            blueByType[u.type]=(blueByType[u.type]||0)+1;
            if(u.armoryType)blueByType[u.armoryType]=(blueByType[u.armoryType]||0)+1;
            (u.permaBuffs||[]).forEach(b=>{blueByBuff[b]=(blueByBuff[b]||0)+1;});
        });
        imperialUnits.forEach(u=>{if(!u.destroyed)imperialByType[u.type]=(imperialByType[u.type]||0)+1;});
        monsterUnits.forEach(u=>{if(!u.destroyed)monsterByType[u.type]=(monsterByType[u.type]||0)+1;});
        const roles={};
        ['sapper','logi','lantern','runner','scout'].forEach(role=>{
            const u=redUnits.find(v=>v.levelRole===role&&!v.destroyed);
            roles[role]=u?{alive:true,x:u.x,y:u.y,id:u.id,type:u.type}:{alive:false};
        });
        const redTiles={};
        redUnits.forEach(u=>{if(!u.destroyed&&!['地雷','防御工事'].includes(u.type))redTiles[u.x+','+u.y]=true;});
        const boss=[...blueUnits,...imperialUnits,...monsterUnits].find(u=>u.levelBoss&&!u.destroyed);
        const gravesAlive=getGhost().units.filter(u=>u.type==='墓碑'&&!u.destroyed).length;
        const st=levelStats();
        return {
            turn:gameState.turn||0,
            blueAlive:blueUnits.filter(alive).length,
            blueCombat:blueUnits.filter(alive).length,
            redAlive:redUnits.filter(alive).length,
            redCombat:redUnits.filter(alive).length,
            blueKills:blueUnits.filter(u=>u.destroyed).length,
            blueKilledByType:st.killedByType||{},
            imperialAlive:imperialUnits.filter(alive).length,
            imperialKills:imperialUnits.filter(u=>u.destroyed).length,
            monsterAlive:monsterUnits.filter(alive).length,
            monsterKills:monsterUnits.filter(u=>u.destroyed).length,
            redLost:redUnits.filter(u=>u.destroyed).length,
            blueByType,blueByBuff,imperialByType,monsterByType,
            bossAlive:!!boss,
            roles,redTiles,
            holdStreak:st.holdStreak||0,holdKey:st.holdKey||'',
            incidentTriggered:!!gameState.incidentTriggered,
            fortsAlive:blueUnits.filter(u=>!u.destroyed&&u.type==='防御工事').length,
            gravesDestroyed:Math.max(0,(gameState.levelInitGraves||0)-gravesAlive),
            souls:(levelStats().soulEarned&&levelStats().soulEarned.red)||0,
            ghostBait:st.ghostBait||0,
            enemyLanded:!!st.enemyLanded,
            scoreRed:(gameState.holyScore&&gameState.holyScore.red)||0,
            collected:Object.keys(st.collectedTiles||{}).length,
            minigame:gameState.minigameState||null,
            captureHold:(gameState.minigameState&&gameState.minigameState.captureHold)||0,
            hunt:(()=>{const bs=getPlayer('blue').units.filter(u=>!u.destroyed);const tower=bs.find(u=>(u.permaBuffs||[]).includes('aa_tower'));const scout=getPlayer('red').units.find(u=>!u.destroyed&&u.layer==='sky'&&u.huntScout);const ground=getPlayer('red').units.filter(u=>!u.destroyed&&u.layer!=='sky');const markable=bs.filter(u=>u!==tower);return{allMarked:markable.length>0&&markable.every(u=>u.marked),bombed:!!(gameState.minigameState&&gameState.minigameState.bombed),towerDead:!tower,scoutAlive:!!scout,groundAlive:ground.length>0};})(),
            protocolsRed:gameState.gameMode==='neon'?neonState().protocols.red:0,
            towersRed:gameState.gameMode==='beacon'?beaconTowerCount('red'):0
        };
    }
    function levelObjectiveMet(){
        if(levelState.tutorial) return false;
        const L=levelData();
        if(!L||!levelState.active||!levelState.level) return false;
        return L.objectiveMet(levelState.level.objective,levelCtx());
    }
    function levelObjectiveFailed(){
        if(levelState.tutorial) return false;
        const L=levelData();
        if(!L||!levelState.active||!levelState.level) return false;
        return !!L.objectiveFailed(levelState.level.objective,levelCtx());
    }
    function levelObjectiveConditionTypes(){
        const lv=levelState.level;
        return (lv&&lv.objective&&lv.objective.conditions||[]).map(c=>c.type);
    }
    /* 清空敌方战斗单位后，哪些目标仍可继续靠站位/护送/拆碑/圣辉推进。 */
    function levelCanContinueWithoutEnemies(){
        if(!levelState.active||!levelState.level||levelObjectiveFailed()) return false;
        return levelObjectiveConditionTypes().some(t=>['hold','captureHold','escort','graves','score'].includes(t));
    }
    /* 最后一个战斗单位在“提前全歼会让任务永远无法完成”时获得剧情保护。 */
    function levelShouldProtectLastUnit(u){
        if(!levelState.active||!levelState.level||!u||u.destroyed) return false;
        if(!['blue','imperial','ghost'].includes(u.side)) return false;
        if(['地雷','防御工事','墓碑'].includes(u.type)) return false;
        if(levelObjectiveMet()||levelObjectiveFailed()) return false;
        const conds=levelState.level.objective.conditions||[];
        const types=conds.map(c=>c.type);
        if(types.some(t=>['eliminate','killType','killBuff','boss'].includes(t))) return false;
        // 站位/护送/拆碑仍可继续，不需要把最后一个敌人钉死。
        if(types.some(t=>['hold','captureHold','escort','graves'].includes(t))) return false;
        const last=!getAllUnits().some(v=>v!==u&&!v.destroyed&&v.side===u.side&&!['地雷','防御工事','墓碑'].includes(v.type));
        if(!last) return false;
        const ctx=levelCtx();
        const killCount=conds.find(c=>c.type==='killCount');
        if(killCount) return !(u.type===killCount.unitType&&((ctx.blueKilledByType[u.type]||0)+1)>=killCount.count);
        const imperial=conds.find(c=>c.type==='killImperial');
        if(imperial) return !((ctx.imperialKills||0)+1>=imperial.count);
        const monster=conds.find(c=>c.type==='killMonster');
        if(monster) return !((ctx.monsterKills||0)+1>=monster.count);
        const souls=conds.find(c=>c.type==='souls');
        if(souls) return !((ctx.souls||0)+1>=souls.count);
        // 圣辉计分关的最后一个敌人不是计分来源，提前击杀会让任务锁死。
        return types.includes('score');
    }
    /* 战场通讯：不暂停操作的短对白 */
    let levelRadioQueue=[],levelRadioTimer=0;
    function showLevelRadio(whoKey,text){
        const L=levelData();
        const chars=(L&&L.CHARACTERS)||{};
        const who=chars[whoKey]||chars.narrator||{name:'旁白',avatar:'📜'};
        levelRadioQueue.push({who,text});
        if(!levelRadioTimer)flushLevelRadio();
    }
    function flushLevelRadio(){
        const box=document.getElementById('levelRadio');
        if(!box||!levelRadioQueue.length){levelRadioTimer=0;return;}
        const item=levelRadioQueue.shift();
        document.getElementById('levelRadioWho').textContent=item.who.avatar+' '+item.who.name;
        document.getElementById('levelRadioText').textContent=item.text;
        box.hidden=false;
        levelRadioTimer=setTimeout(()=>{
            levelRadioTimer=0;
            if(levelRadioQueue.length){flushLevelRadio();return;}
            if(box)box.hidden=true;
        },4800);
    }
    function showLevelLine(when,extra={}){
        const lv=levelState.active&&levelState.level;
        if(!lv||!lv.lines) return;
        const st=levelStats();
        lv.lines.forEach((line,index)=>{
            if(line.when!==when)return;
            if(line.role&&line.role!==extra.role)return;
            if(line.unitType&&line.unitType!==extra.unitType)return;
            if(line.turn!==undefined&&line.turn!==extra.turn)return;
            if(line.count!==undefined&&extra.count!==undefined&&line.count>extra.count)return;
            const key=when+':'+index;
            if(st.seen[key])return;
            st.seen[key]=true;
            showLevelRadio(line.who,line.text);
        });
    }
    /* 引擎钩子（typeof 守卫调用）：击杀、受击、鬼魂诱饵 */
    function levelOnUnitKilled(killer,killed){
        if(!levelState.active||!killed)return;
        const st=levelStats();
        if(killed.levelBoss){st.bossKilled=true;showLevelLine('bossKill');}
        if(killed.side==='red'){
            st.redLost=(st.redLost||0)+1;
            showLevelLine('casualty');
        }
        if(killed.side==='blue'){
            st.killedByType=st.killedByType||{};
            const killedType=killed.armoryType||killed.type;
            st.killedByType[killedType]=(st.killedByType[killedType]||0)+1;
            if(!st.firstKill){st.firstKill=true;showLevelLine('firstKill');}
            const type=killed.armoryType||killed.type;
            if(type==='炮兵')showLevelLine('firstKillType',{unitType:'炮兵'});
            if(type==='车')showLevelLine('firstKillType',{unitType:'车'});
            if(type==='海炮')showLevelLine('firstKillType',{unitType:'海炮'});
            const remain=[...getPlayer('blue').units,...(gameState.gameMode==='mine'?mineUnitsOf('blue'):[])].filter(u=>!u.destroyed&&!['地雷','防御工事','墓碑'].includes(u.type)).length;
            if(remain===0)showLevelLine('lastKill');
        }
    }
    function levelOnUnitDamaged(unit,killer){
        if(!levelState.active||!unit)return;
        if(unit.levelRole==='runner'&&gameState.levelId==='snow-11'&&gameState.minigameState)gameState.minigameState.sledDamage=true;
        if(unit.side==='red'&&unit.levelRole)showLevelLine('roleHit',{role:unit.levelRole});
        if(unit.levelBoss)showLevelLine('bossHit');
    }
    function levelOnGhostBait(unit){
        if(!levelState.active)return;
        const st=levelStats();
        st.ghostBait=(st.ghostBait||0)+1;
        showLevelLine('bait',{count:st.ghostBait});
    }
    /* 凝魂会被「执灯」自动兑换消耗；关卡任务按“累计获得”而不是当前余额判定。 */
    function levelOnSoulGained(side,n){
        if(!levelState.active)return;
        const st=levelStats();
        st.soulEarned=st.soulEarned||{red:0,blue:0};
        st.soulEarned[side]=(st.soulEarned[side]||0)+n;
    }

    /* showVictory 在引擎抽取段内，只能通过 typeof 守卫调用这些 boot 段函数。 */
    function levelVictoryPayload(w){
        if(!levelState.active||!levelState.level) return null;
        const met=levelObjectiveMet();
        const L=levelData();
        const failed=L?L.objectiveFailed(levelState.level.objective,levelCtx()):false;
        const won=!failed&&met;
        levelState.result=won?'win':'lose';
        const lv=levelState.level;
        const chars=(L&&L.CHARACTERS)||{};
        const epilogue=(won?lv.win:lv.lose)||[];
        const story=epilogue.map(line=>{
            const who=chars[line.who]||chars.narrator||{name:'旁白'};
            return '<span class="vt-line"><b>'+who.name+'</b>'+line.text+'</span>';
        }).join('');
        let perfect=false;
        if(won&&lv.minigame){
            const mg=gameState.minigameState||{};
            if(lv.id==='classic-11'&&(mg.cannonHits||0)>=3)perfect=true;
            if(lv.id==='snow-11'&&!mg.sledDamage)perfect=true;
            if(lv.id==='mine-11'&&gameState.turn<=8)perfect=true;
            if(perfect){getPlayer('red').sp+=2;addLog('✨ 完美通关：技能点 +2');}
        }
        return {
            won,level:lv,
            log:(won?'🏆 关卡完成：':'💀 任务失败：')+lv.name+'（'+w+'）',
            html:'<span class="vt-kicker">'+(won?'关卡完成':'任务失败')+'</span>'
                +'<strong class="vt-title">第'+lv.no+'关 · '+lv.name+'</strong>'
                +'<span class="vt-sub">'+w+'</span>'
                +(perfect?'<span class="vt-perfect">✨ 完美通关：技能点 +2</span>':'')
                +(story?'<span class="vt-story">'+story+'</span>':'')
        };
    }
    let pendingLevelResetMode=null;
    function levelResetBegin(){
        pendingLevelResetMode=levelState.active&&levelState.level?levelState.level.mode:null;
        levelState={active:false,level:null,result:null};
        hideLevelResult();
        hideLevelArmory();
        const ls=document.getElementById('levelSelectOverlay');if(ls){ls.hidden=true;ls.style.display='none';}
        const st=document.getElementById('levelStoryOverlay');if(st){st.hidden=true;st.style.display='none';}
    }
    function levelResetEnd(){
        if(pendingLevelResetMode){
            const modeSel=document.getElementById('modeSelectOverlay');if(modeSel)modeSel.style.display='none';
            openLevelSelect(pendingLevelResetMode);
        }
        pendingLevelResetMode=null;
    }
    function updateLevelHud(){
        const hud=document.getElementById('levelHud');
        if(!hud) return;
        if(!levelState.active||!levelState.level){hud.hidden=true;return;}
        if(levelState.tutorial){hud.hidden=true;return;}
        const L=levelData(); if(!L){hud.hidden=true;return;}
        const lv=levelState.level, ctx=levelCtx();
        hud.hidden=false;
        const nameEl=document.getElementById('levelHudName');
        const taskEl=document.getElementById('levelHudTask');
        const progEl=document.getElementById('levelHudProgress');
        if(nameEl)nameEl.textContent='第'+lv.no+'关 · '+lv.name+(lv.minigame?' · '+levelMiniLabel(lv):'');
        if(taskEl){
            const targets=levelObjectiveTargetLabels(lv);
            taskEl.innerHTML=(lv.minigame?levelMiniLabel(lv)+' · ':'')+'任务：'+L.objectiveText(lv.objective)+(targets.length?' <span class="lh-target">🎯 '+targets.join(' / ')+'</span>':'')+(lv.minigame&&lv.minigame.rule?'<span class="lh-rule">'+lv.minigame.rule+'</span>':'');
        }
        if(progEl)progEl.textContent=(lv.minigame&&lv.minigame.conveyor)?('📦 剩余空投费用 '+(mgState().conveyorRemaining||0)):L.objectiveProgress(lv.objective,ctx).text;
        refreshLevelActionButton();
    }
    function refreshLevelActionButton(){
        const btn=document.getElementById('levelActionBtn'); if(!btn)return;
        const lv=levelState.level,mg=mgState();
        if(!lv||!lv.minigame){btn.hidden=true;return;}
        btn.classList.add('mg-action');btn.dataset.mg=lv.id;
        if(lv.id==='classic-11'){
            btn.hidden=false;
            const eligible=getPlayer('red').units.some(u=>!u.destroyed&&u.type==='二阶步兵'&&canUnitAct(u,'red'));
            btn.textContent='装填重炮 ('+(mg.cannonReloads||0)+'/3)';
            btn.disabled=!eligible||(mg.cannonReloads||0)>=3||(mg.cannonLoaded||0)>=3||(mg.cannonShots||0)>=3||mg.overheated;
        }else if(lv.id==='holy-12'){
            btn.hidden=false;
            const h=levelCtx().hunt||{};
            btn.textContent=h.allMarked?'呼叫投弹兵':'标记下方单位';
            btn.disabled=!h.scoutAlive||(h.allMarked&&!h.towerDead);
        }else if(lv.id==='mine-11'){
            btn.hidden=false;
            btn.textContent=mg.cartBrake?'解除急刹车':'急刹车 (1 指挥)';
            btn.disabled=mg.cartWrecked||getPlayer('red').cmd<1;
        }else btn.hidden=true;
    }
    function handleLevelAction(){
        const lv=levelState.level,mg=mgState(); if(!lv||!mg)return;
        if(lv.id==='classic-11'){
            if((mg.cannonShots||0)>=3||mg.overheated||(mg.cannonReloads||0)>=3||(mg.cannonLoaded||0)>=3){addLog('重炮已经无法再装填');return;}
            const inf=getPlayer('red').units.find(u=>!u.destroyed&&u.type==='二阶步兵'&&canUnitAct(u,'red'));
            if(!inf){addLog('没有未行动的二阶步兵可以装填');return;}
            completeUnitAction(inf,'red');
            mg.cannonLoaded=Math.min(3,(mg.cannonLoaded||0)+1);mg.cannonReloads=Math.min(3,(mg.cannonReloads||0)+1);
            addLog(`🥥 ${unitDisplayName(inf)}完成装填（累计 ${mg.cannonReloads}/3，待发 ${mg.cannonLoaded}）`);
            renderAll();return;
        }
        if(lv.id==='holy-12'){
            const scout=getPlayer('red').units.find(u=>!u.destroyed&&u.layer==='sky'&&u.huntScout);
            if(!scout){addLog('侦察兵已经不在场');return;}
            const h=levelCtx().hunt||{};
            if(h.allMarked){
                let killed=0;
                getPlayer('blue').units.filter(u=>!u.destroyed&&u.marked).forEach(u=>{if(damageUnit(u,null,{direct:true,sourceSide:'red'}))killed++;});
                mg.bombed=true;addLog('✈️ 投弹兵俯冲：全标记目标被清除（'+killed+'）');renderAll();return;
            }
            const target=getPlayer('blue').units.find(u=>!u.destroyed&&u.x===scout.x&&u.y===scout.y&&!(u.permaBuffs||[]).includes('aa_tower'));
            if(!target){addLog('侦察兵必须停在敌方地面单位正上方才能标记');return;}
            target.marked=true;addLog('🎯 侦察兵标记：'+unitDisplayName(target));renderAll();return;
        }
        if(lv.id==='mine-11'){
            if(mg.cartBrake){mg.cartBrake=false;addLog('矿车解除刹车');renderAll();return;}
            if(getPlayer('red').cmd<1){addLog('指挥点不足，无法急刹车');return;}
            getPlayer('red').cmd--;mg.cartBrake=true;addLog('🛒 矿车急刹车：本回合暂停滑行');renderAll();return;
        }
    }

    const LEVEL_UNIT_DEFS={
        '精锐战车':{base:'车',buffs:['elite_chariot']},
        '战损车':{base:'车',buffs:['battle_damaged']},
        '精锐炮兵':{base:'炮兵',buffs:['elite_artillery']},
        '精锐步兵':{base:'步兵',buffs:['elite_infantry']},
        '装甲车':{armory:'装甲车'},
        '双发炮兵':{armory:'双发炮兵'},
        '排雷兵':{armory:'排雷兵'},
        '陷阱工事':{base:'防御工事',buffs:['trap']},
        '精锐海炮':{base:'海炮',buffs:['elite_artillery']},
        '工兵':{armory:'工兵'},
        '防空塔':{base:'防御工事',buffs:['aa_tower']}
    };
    function createLevelUnit(spec,x,y,side){
        const def=LEVEL_UNIT_DEFS[spec.type]||{base:spec.type};
        let u;
        if(def.armory)u=createArmoryUnit(def.armory,x,y,side);
        else u=createUnit(def.base||spec.type,x,y,side,{permaBuffs:[...(def.buffs||[])]});
        if(spec.buffs)spec.buffs.forEach(b=>{if(!u.permaBuffs.includes(b))u.permaBuffs.push(b);});
        if(spec.hp!==undefined)u.hp=spec.hp;
        if(spec.boarded)u.boarded=true;
        if(spec.displayName)u.displayName=spec.displayName;
        if(spec.displayIcon)u.displayIcon=spec.displayIcon;
        if(spec.role)u.levelRole=spec.role;
        if(spec.huntScout)u.huntScout=true;
        if(spec.static)u.static=true;
        if((u.permaBuffs||[]).includes('coconut')){u.remainingActions=3;u.hasAttacked=false;u.cannonAmmo=undefined;}
        if(spec.layer)u.layer=spec.layer;
        return u;
    }
    function levelBlueTiles(allowBoat){
        const mode=gameState.gameMode,out=[];
        for(let x=0;x<COLS;x++)for(let y=0;y<ROWS;y++){
            if(!isInTerritory(x,y,'blue',mode))continue;
            if(isBlockedTile(x,y,mode)||unitAt(x,y))continue;
            if(!allowBoat&&mode==='pirate'&&isPirateBoatPoint(x,y))continue;
            out.push({x,y});
        }
        return out;
    }
    function levelTakeBlueTile(kind,allowBoat){
        let tiles=levelBlueTiles(allowBoat);
        if(!tiles.length)return null;
        if(kind==='back')tiles.sort((a,b)=>(b.x-a.x)||(a.y-b.y));
        else if(kind==='front')tiles.sort((a,b)=>(a.x-b.x)||(a.y-b.y));
        else tiles.sort((a,b)=>(Math.abs(a.x-8)+Math.abs(a.y-2))-(Math.abs(b.x-8)+Math.abs(b.y-2)));
        return tiles[0];
    }
    function levelTakeSkyTile(){
        const tiles=levelBlueTiles(false).filter(p=>!skyUnitAt(p.x,p.y)&&!holySkyVolcano(p.x,p.y));
        if(!tiles.length)return null;
        tiles.sort((a,b)=>(b.x-a.x)||(a.y-b.y));
        return tiles[0];
    }
    function levelTakeMineTile(){
        const m=mineState(),blocked=m.blocked||[];
        for(let x=COLS-1;x>=0;x--)for(let y=ROWS-1;y>=0;y--){
            if(isMineWall(x,y)||mineUnitAt(x,y))continue;
            if(blocked.some(b=>b.x===x&&b.y===y))continue;
            if(MINE_SHAFTS.some(s=>s.x===x&&s.y===y))continue;
            return {x,y};
        }
        return null;
    }
    function levelTakeMineTileLeft(){
        for(let x=0;x<COLS;x++)for(let y=0;y<ROWS;y++){
            if(isMineWall(x,y)||mineUnitAt(x,y))continue;
            if(mineShaftAt(x,y))continue;
            return {x,y};
        }
        return levelTakeMineTile();
    }
    function levelTakeEdgeTile(){
        const cells=[];
        const cannon=gameState.levelId==='classic-11'?getPlayer('red').units.find(u=>!u.destroyed&&u.levelRole==='cannon'):null;
        for(let x=0;x<COLS;x++)for(let y=0;y<ROWS;y++){
            if(x!==0&&x!==COLS-1&&y!==0&&y!==ROWS-1)continue;
            if(cannon&&Math.abs(x-cannon.x)+Math.abs(y-cannon.y)===1)continue;
            if(!unitAt(x,y)&&!isBlockedTile(x,y,gameState.gameMode))cells.push({x,y});
        }
        return cells.length?cells[Math.floor(Math.random()*cells.length)]:null;
    }
    function levelTakeImperialTile(){
        for(let x=4;x<=6;x++)for(let y=0;y<ROWS;y++){
            if(isBlockedTile(x,y,gameState.gameMode)||unitAt(x,y))continue;
            return {x,y};
        }
        return null;
    }
    function levelKindOf(type){
        if(type==='地雷'||type==='防御工事'||type==='陷阱工事')return 'front';
        if(type==='炮兵'||type==='精锐炮兵'||type==='双发炮兵'||type==='海炮'||type==='精锐海炮'||type==='后勤兵')return 'back';
        return 'mid';
    }
    function levelPlaceBoss(level){
        const boss=(level.enemy&&level.enemy.boss)||(level.imperial&&level.imperial.boss)||(level.monsters&&level.monsters.boss);
        if(!boss)return null;
        if(boss.side==='monster'){
            const pos=levelTakeMineTile();
            if(!pos)return null;
            const u=createUnit(boss.type||'矿兽',pos.x,pos.y,'monster',{layer:'mine',mineType:boss.name||'矿兽',beast:true,hp:boss.hp||5});
            u.levelBoss=true;u.bossName=boss.name||'矿兽';u.boss=true;
            mineState().monsters.push(u);
            return u;
        }
        if(boss.side==='imperial'){
            const pos=levelTakeImperialTile();
            if(!pos)return null;
            const u=createArmoryUnit('装甲车',pos.x,pos.y,'imperial');
            u.levelBoss=true;u.bossName=boss.name||'首领';
            ['armored','iron_wall','elite_chariot'].forEach(b=>{if(!u.permaBuffs.includes(b))u.permaBuffs.push(b);});
            getImperial().units.push(u);
            return u;
        }
        if(boss.layer==='mine'){
            const pos=levelTakeMineTile();
            if(!pos)return null;
            const u=createArmoryUnit('装甲车',pos.x,pos.y,'blue');
            u.levelBoss=true;u.bossName=boss.name||'首领';u.layer='mine';
            ['armored','iron_wall','elite_chariot'].forEach(b=>{if(!u.permaBuffs.includes(b))u.permaBuffs.push(b);});
            mineState().blue.push(u);
            return u;
        }
        let pos={x:9,y:2};
        if(unitAt(pos.x,pos.y)||isBlockedTile(pos.x,pos.y,gameState.gameMode)||!isInTerritory(pos.x,pos.y,'blue',gameState.gameMode))pos=levelTakeBlueTile('back')||pos;
        let u;
        if(boss.hp||boss.type==='二阶步兵'){
            u=createLevelUnit({type:boss.type||'二阶步兵',hp:boss.hp||3,buffs:['elite_infantry']},pos.x,pos.y,'blue');
        }else{
            u=createArmoryUnit('装甲车',pos.x,pos.y,'blue');
            ['armored','iron_wall','elite_chariot'].forEach(b=>{if(!u.permaBuffs.includes(b))u.permaBuffs.push(b);});
        }
        u.levelBoss=true;u.bossName=boss.name||'首领';
        if(boss.hp)u.bossMove2=true;
        getPlayer('blue').units.push(u);
        return u;
    }
    function spawnPlayerRole(spec){
        if(gameState.mineOnly){
            let pos={x:spec.x,y:spec.y};
            if(pos.x===undefined||isMineWall(pos.x,pos.y)||mineUnitAt(pos.x,pos.y))pos=levelTakeMineTileLeft();
            if(!pos)return null;
            const u=createLevelUnit(spec,pos.x,pos.y,'red');
            u.layer='mine';u.levelRole=spec.role;
            mineState().red.push(u);
            return u;
        }
        let pos={x:spec.x,y:spec.y};
        if(unitAt(pos.x,pos.y)||isBlockedTile(pos.x,pos.y,gameState.gameMode)||!isInTerritory(pos.x,pos.y,'red',gameState.gameMode)){
            pos=null;
            for(let x=0;x<COLS&&!pos;x++)for(let y=0;y<ROWS;y++){
                if(isInTerritory(x,y,'red',gameState.gameMode)&&!isBlockedTile(x,y,gameState.gameMode)&&!unitAt(x,y)){pos={x,y};break;}
            }
        }
        if(!pos)return null;
        const u=createLevelUnit(spec,pos.x,pos.y,'red');
        u.levelRole=spec.role;
        getPlayer('red').units.push(u);
        return u;
    }
    function spawnLevelRedUnit(spec){
        if(Number.isFinite(spec.x)&&Number.isFinite(spec.y)&&!unitAt(spec.x,spec.y)&&!isBlockedTile(spec.x,spec.y,gameState.gameMode)){
            const u=createLevelUnit(spec,spec.x,spec.y,'red');
            if(spec.layer)u.layer=spec.layer;
            getPlayer('red').units.push(u);
            return u;
        }
        if(gameState.mineOnly){
            const pos=levelTakeMineTileLeft();
            if(!pos)return null;
            const u=createLevelUnit(spec,pos.x,pos.y,'red');
            u.layer='mine';
            mineState().red.push(u);
            return u;
        }
        let pos=null;
        if(spec.layer==='sky'){
            for(let x=0;x<4&&!pos;x++)for(let y=0;y<ROWS;y++){
                if(isInTerritory(x,y,'red',gameState.gameMode)&&!isBlockedTile(x,y,gameState.gameMode)&&!skyUnitAt(x,y)){pos={x,y};break;}
            }
        }else{
            for(let x=0;x<4&&!pos;x++)for(let y=0;y<ROWS;y++){
                if(isInTerritory(x,y,'red',gameState.gameMode)&&!isBlockedTile(x,y,gameState.gameMode)&&!unitAt(x,y)){pos={x,y};break;}
            }
        }
        if(!pos)return null;
        const u=createLevelUnit(spec,pos.x,pos.y,'red');
        if(spec.layer)u.layer=spec.layer;
        getPlayer('red').units.push(u);
        return u;
    }
    function applyLevelToGame(level){
        if(!level) return;
        gameState.levelMode=true;gameState.levelId=level.id;
        gameState.mineOnly=!!(level.minigame&&level.minigame.mineOnly);
        document.body.classList.toggle('mine-solo',gameState.mineOnly);
        document.body.classList.toggle('holy-solo',!!(level.minigame&&level.minigame.noSky));
        gameState.phase='DEPLOY';gameState.armory=null;
        gameState.deploySide='red';gameState.activeSide='red';gameState.turnPhase='DRAW';gameState.turn=1;
        gameState.startingSide='red';
        gameState.levelStats={ghostBait:0,enemyLanded:false,seen:{},effectTurn:0,firstKill:false,redLost:0,soulEarned:{red:0,blue:0},killedByType:{}};
        gameState.levelAI=level.ai||{};
        gameState.minigameState=level.minigame?{
            cannonLoaded:0,cannonReloads:0,cannonShots:0,cannonHits:0,shotTurns:[],overheated:false,stunTurn:0,engineerSpawned:false,
            sledFast:false,sledUnblocked:0,sledPush:0,sledDamage:false,fastAbsorb:false,
            cartBrake:false,cartWrecked:false,revealedPath:{},bombed:false,aaZone:null,aaFailed:false,
            fakeAlliance:!!(level.minigame&&level.minigame.fakeAlliance)
        }:null;
        if(gameState.gameMode==='mine')gameState.mineOpenWalls=(level.openWalls||[]).slice();
        const pl=level.player||{};
        if(pl.resources!==undefined)gameState.red.resources=pl.resources;
        if(pl.sp!==undefined)gameState.red.sp=pl.sp;
        if(pl.cmd!==undefined){gameState.red.cmd=pl.cmd;gameState.red.baseCmd=pl.cmd;}
        if(level.minigame){gameState.red.cmd=3;gameState.red.baseCmd=3;}
        const blue=getPlayer('blue');
        blue.resources=0;blue.sp=0;
        const cmd=(level.enemy&&level.enemy.boss)?3:2;
        blue.cmd=cmd;blue.baseCmd=cmd;
        if(level.minigame&&level.minigame.blueCmd){blue.cmd=level.minigame.blueCmd;blue.baseCmd=level.minigame.blueCmd;}
        blue.units.forEach(u=>{u.destroyed=true;});
        blue.units=[];
        gameState.levelInitGraves=gameState.gameMode==='fog'?getGhost().units.filter(u=>u.type==='墓碑'&&!u.destroyed).length:0;
        (pl.roles||[]).forEach(spawnPlayerRole);
        (pl.units||[]).forEach(spec=>{for(let i=0;i<(spec.count||1);i++)spawnLevelRedUnit(spec);});
        if(level.minigame&&level.minigame.hiddenPath&&Array.isArray(level.minigame.route)){
            const lantern=getPlayer('red').units.find(u=>u.levelRole==='lantern');
            if(lantern)for(const [x,y] of level.minigame.route){if(Math.abs(x-lantern.x)+Math.abs(y-lantern.y)<=1)gameState.minigameState.revealedPath[x+','+y]=true;}
        }
        levelPlaceBoss(level);
        const groups=[];
        (level.enemy&&level.enemy.units||[]).forEach(group=>{
            for(let i=0;i<(group.count||1);i++)groups.push(Object.assign({},group,{count:1}));
        });
        groups.sort((a,b)=>{
            const rank=t=>t==='front'?0:t==='mid'?1:2;
            return rank(levelKindOf(a.type))-rank(levelKindOf(b.type));
        });
        groups.forEach(spec=>{
            if(gameState.mineOnly){
                const pos=levelTakeMineTile();
                if(!pos)return;
                const u=createLevelUnit(spec,pos.x,pos.y,'blue');
                u.layer='mine';
                mineState().blue.push(u);
                return;
            }
            if(spec.layer==='mine'){
                const pos=levelTakeMineTile();
                if(!pos)return;
                const u=createLevelUnit(spec,pos.x,pos.y,'blue');
                u.layer='mine';
                mineState().blue.push(u);
                return;
            }
            if(spec.layer==='sky'){
                const pos=levelTakeSkyTile();
                if(!pos)return;
                const u=createLevelUnit(spec,pos.x,pos.y,'blue');
                u.layer='sky';
                getPlayer('blue').units.push(u);
                return;
            }
            const allowBoat=!!spec.boarded;
            let pos=null;
            if(Number.isFinite(spec.x)&&Number.isFinite(spec.y)&&!unitAt(spec.x,spec.y)&&!isBlockedTile(spec.x,spec.y,gameState.gameMode))pos={x:spec.x,y:spec.y};
            if(!pos&&allowBoat&&gameState.gameMode==='pirate'){
                const points=[[7,0],[7,2],[7,4]].filter(([x,y])=>!unitAt(x,y));
                if(points.length)pos={x:points[0][0],y:points[0][1]};
            }
            if(!pos)pos=levelTakeBlueTile(levelKindOf(spec.type),allowBoat);
            if(!pos)return;
            const u=createLevelUnit(spec,pos.x,pos.y,'blue');
            getPlayer('blue').units.push(u);
        });
        (level.imperial&&level.imperial.units||[]).forEach(group=>{
            for(let i=0;i<(group.count||1);i++){
                const pos=levelTakeImperialTile();
                if(!pos)return;
                const u=createLevelUnit(group,pos.x,pos.y,'imperial');
                getImperial().units.push(u);
            }
        });
        (level.monsters&&level.monsters.units||[]).forEach(group=>{
            for(let i=0;i<(group.count||1);i++){
                const pos=levelTakeMineTile();
                if(!pos)return;
                const u=createUnit(group.type,pos.x,pos.y,'monster',{layer:'mine',mineType:group.name||group.type,beast:true,hp:group.hp||3});
                mineState().monsters.push(u);
            }
        });
        (level.minigame&&level.minigame.barrels||[]).forEach(([x,y])=>{
            if(isMineWall(x,y)||mineUnitAt(x,y))return;
            const u=createUnit('炸药桶',x,y,'monster',{layer:'mine',hp:1,barrel:true,mineType:'炸药桶'});
            mineState().monsters.push(u);
        });
        if(level.minigame&&level.minigame.conveyor)conveyorSpawnWave(true);
        if(levelState.freeArmory&&ARMORY_UNITS[levelState.freeArmory]){
            gameState.armory={
                red:{choice:levelState.freeArmory,ready:true,deployed:false,options:[levelState.freeArmory],free:true},
                blue:{choice:null,ready:true,deployed:true,options:[],free:false}
            };
        }
        if(level.minigame)setTimeout(()=>{if(levelState.active&&levelState.level===level&&gameState.phase==='DEPLOY')finishDeployPhase();},60);
        const modeLabel=document.getElementById('local-mode-label');
        if(modeLabel)modeLabel.textContent='第'+level.no+'关 · '+level.name;
        addLog('📖 '+level.campaignTitle+' · 第'+level.no+'关「'+level.name+'」 · 任务：'+levelData().objectiveText(level.objective));
        if(level.tip)addLog('💡 '+level.tip);
    }

    function renderLevelTabs(){
        const L=levelData(); if(!L) return;
        const tabs=document.getElementById('levelModeTabs'); if(!tabs) return;
        const progress=loadLevelProgress();
        tabs.innerHTML=L.MODE_ORDER.map(mode=>{
            const arr=L.levelsForMode(mode);
            const done=arr.filter(l=>progress[l.id]&&progress[l.id].cleared).length;
            return '<button type="button" class="level-tab'+(mode===levelTabMode?' active':'')+'" data-level-tab="'+mode+'" role="tab" aria-selected="'+(mode===levelTabMode)+'">'
                +'<span>'+L.MODE_NAMES[mode]+'</span><small>'+done+' / '+arr.length+'</small></button>';
        }).join('');
    }
    const LEVEL_GRID_PATTERNS={
        classic:[[8,55],[18,35],[28,60],[38,33],[48,57],[58,34],[68,62],[78,37],[88,59],[94,34]],
        snow:[[7,32],[16,54],[26,30],[36,56],[46,33],[56,58],[66,31],[76,55],[86,32],[94,53]],
        pirate:[[8,50],[17,63],[27,41],[37,64],[47,39],[57,61],[67,37],[77,59],[87,39],[94,55]],
        fog:[[8,58],[17,36],[27,54],[37,72],[47,47],[57,27],[67,46],[77,67],[87,44],[94,64]],
        wannan:[[9,55],[18,34],[28,34],[38,55],[48,75],[58,56],[68,34],[78,53],[88,72],[94,51]],
        holy:[[8,70],[17,53],[27,68],[37,46],[47,63],[57,38],[67,55],[77,29],[87,47],[94,27]],
        mine:[[8,25],[18,46],[28,66],[38,43],[48,61],[58,37],[68,58],[78,35],[88,55],[94,72]],
        tide:[[8,53],[18,70],[28,45],[38,65],[48,38],[58,59],[68,34],[78,57],[88,40],[94,63]],
        beacon:[[9,36],[18,55],[28,34],[38,56],[48,35],[58,57],[68,36],[78,58],[88,38],[94,55]],
        neon:[[8,50],[18,30],[28,50],[38,70],[48,50],[58,30],[68,50],[78,70],[88,50],[94,30]]
    };
    function showLevelNodeTip(node){
        const grid=document.getElementById('levelGrid');
        const tip=document.getElementById('levelNodeTip');
        if(!grid||!tip||!node)return;
        const L=levelData(); if(!L)return;
        const level=L.getLevel(node.dataset.levelId); if(!level)return;
        const mini=levelMiniLabel(level,true);
        tip.innerHTML='<span class="lnt-kicker">第'+levelNoLabel(level.no)+'关'+(mini?' · '+mini:'')+'</span>'
            +'<strong>'+level.name+'</strong>'
            +'<p>'+level.brief+'</p>'
            +'<em>任务：'+L.objectiveText(level.objective)+'</em>'
            +'<small>难度 '+('★'.repeat(L.levelDifficulty?L.levelDifficulty(level):3))+'　'+(level.minigame?'支线，可不经过':'主线')+'</small>';
        tip.hidden=false;
        const gr=grid.getBoundingClientRect(),nr=node.getBoundingClientRect();
        let left=nr.left-gr.left+nr.width/2;
        let top=nr.top-gr.top+nr.height+14;
        tip.style.left='0px';tip.style.top='0px';
        const tw=tip.offsetWidth,th=tip.offsetHeight;
        left=Math.max(tw/2+8,Math.min(grid.clientWidth-tw/2-8,left));
        if(top+th>grid.clientHeight-8)top=nr.top-gr.top-th-12;
        tip.style.left=left+'px';tip.style.top=Math.max(8,top)+'px';
    }
    function hideLevelNodeTip(){
        const tip=document.getElementById('levelNodeTip');if(tip)tip.hidden=true;
    }
    function renderLevelGrid(){
        const L=levelData(); if(!L) return;
        const grid=document.getElementById('levelGrid'); if(!grid) return;
        const arr=L.levelsForMode(levelTabMode);
        const progress=loadLevelProgress();
        const mainline=arr.filter(l=>!l.minigame);
        const mainCoords=LEVEL_GRID_PATTERNS[levelTabMode]||LEVEL_GRID_PATTERNS.classic;
        grid.dataset.mode=levelTabMode;
        const pos=new Map();
        mainline.forEach((l,i)=>pos.set(l.id,{x:mainCoords[i]?mainCoords[i][0]:8+i*8,y:mainCoords[i]?mainCoords[i][1]:50,side:false}));
        const sideCount={};
        arr.filter(l=>l.minigame).forEach(l=>{
            const idx=arr.findIndex(x=>x.id===l.id);
            let anchor=null;
            for(let i=idx-1;i>=0;i--){if(!arr[i].minigame){anchor=arr[i];break;}}
            if(!anchor)anchor=mainline[0];
            const a=pos.get(anchor.id)||{x:50,y:50};
            const candidates=[[-13,-19],[13,-19],[-13,19],[13,19],[-19,-9],[19,-9],[-19,9],[19,9]];
            let best=null,bestScore=-1;
            for(const [dx,dy] of candidates){
                const cx=Math.max(7,Math.min(93,a.x+dx)),cy=Math.max(12,Math.min(86,a.y+dy));
                let score=99;
                for(const p of pos.values())score=Math.min(score,Math.abs(cx-p.x)+Math.abs(cy-p.y));
                score+=Math.min(cx-7,93-cx,cy-12,86-cy)*0.15;
                if(score>bestScore){bestScore=score;best={x:cx,y:cy,side:true};}
            }
            pos.set(l.id,best);
        });
        const mainPoints=mainline.map(l=>{const p=pos.get(l.id);return p.x+','+p.y;}).join(' ');
        const branches=arr.filter(l=>l.minigame).map(l=>{
            const p=pos.get(l.id);const idx=arr.findIndex(x=>x.id===l.id);let anchor=null;
            for(let i=idx-1;i>=0;i--){if(!arr[i].minigame){anchor=arr[i];break;}}
            const a=pos.get(anchor&&anchor.id)||{x:50,y:50};
            return `<line class="lc-branch" x1="${a.x}" y1="${a.y}" x2="${p.x}" y2="${p.y}"></line>`;
        }).join('');
        const nodes=arr.map(level=>{
            const cleared=!!(progress[level.id]&&progress[level.id].cleared);
            const unlocked=isLevelUnlocked(level);
            const state=cleared?'cleared':unlocked?'open':'locked';
            const diff=L.levelDifficulty?L.levelDifficulty(level):3;
            const stars='★'.repeat(diff)+'☆'.repeat(5-diff);
            const p=pos.get(level.id)||{x:50,y:50,side:!!level.minigame};
            const kind=level.minigame?'<span class="ln-kind">支线</span>':'';
            return '<button type="button" class="level-card level-node '+state+(p.side?' optional':' mainline')+'" style="left:'+p.x+'%;top:'+p.y+'%" data-level-id="'+level.id+'" aria-label="第'+level.no+'关 '+level.name+'"'+(unlocked?'':' disabled')+'>'
                +'<span class="ln-star" aria-hidden="true">✦</span>'
                +'<span class="ln-no">'+levelNoLabel(level.no)+'</span>'
                +'<span class="ln-name">'+level.name+'</span>'
                +'<span class="lc-diff" title="难度（1–5 星）">'+stars+'</span>'
                +kind
                +'<span class="ln-state">'+(cleared?'✓':unlocked?'':'🔒')+'</span>'
                +'</button>';
        }).join('');
        grid.innerHTML='<svg class="lc-constellation" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'
            +'<polyline class="lc-mainline" points="'+mainPoints+'"></polyline>'+branches+'</svg>'
            +'<div class="lc-mode-veil" aria-hidden="true"></div>'
            +'<div class="lc-sky-dust" aria-hidden="true"></div>'
            +'<div class="level-node-tip" id="levelNodeTip" hidden></div>'+nodes;
        const total=L.LEVELS.length;
        const done=Object.keys(progress).filter(k=>progress[k]&&progress[k].cleared).length;
        const pt=document.getElementById('levelProgressText');
        if(pt)pt.textContent='已通关 '+done+' / '+total;
        const resetBtn=document.getElementById('levelResetProgressBtn');
        if(resetBtn)resetBtn.style.display=done?'inline-block':'none';
    }
    function openLevelSelect(mode){
        const L=levelData();
        if(!L){addLog('关卡数据未加载');return;}
        if(mode&&L.MODE_NAMES[mode])levelTabMode=mode;
        const overlay=document.getElementById('levelSelectOverlay');
        if(!overlay) return;
        const modeSel=document.getElementById('modeSelectOverlay');
        if(modeSel)modeSel.style.display='none';
        overlay.hidden=false;overlay.style.display='flex';
        renderLevelTabs();renderLevelGrid();
    }
    function closeLevelSelect(fromStart=false){
        const overlay=document.getElementById('levelSelectOverlay');
        if(overlay){overlay.hidden=true;overlay.style.display='none';}
        if(!gameState.gameMode){
            if(!fromStart&&(location.protocol==='http:'||location.protocol==='https:')){location.href='/';return;}
            const modeSel=document.getElementById('modeSelectOverlay');
            if(modeSel)modeSel.style.display='flex';
        }
    }

    function renderStoryLine(){
        const line=storyQueue[storyIndex];
        if(!line) return;
        const L=levelData();
        const chars=L?L.CHARACTERS:{};
        const who=chars[line.who]||chars.narrator||{name:'旁白',avatar:'📜',color:'#b9ae98'};
        const avatar=document.getElementById('levelStoryAvatar');
        const portrait=document.getElementById('levelStoryPortrait');
        const name=document.getElementById('levelStoryName');
        const title=document.getElementById('levelStoryTitle');
        const text=document.getElementById('levelStoryText');
        const prog=document.getElementById('levelStoryProgress');
        const next=document.getElementById('levelStoryNext');
        const panel=document.querySelector('.level-story-panel');
        if(panel)panel.style.setProperty('--who-color',who.color||'#c8a766');
        if(panel)panel.classList.toggle('story-narrator',line.who==='narrator');
        if(avatar){avatar.textContent=who.avatar||'📜';avatar.style.borderColor=who.color||'#b9ae98';}
        if(portrait){portrait.className='level-story-portrait portrait-'+line.who;portrait.classList.remove('portrait-in');void portrait.offsetWidth;portrait.classList.add('portrait-in');}
        if(name){name.textContent=who.name;name.style.color=who.color||'#b9ae98';}
        if(title)title.textContent=who.title||'';
        if(text){text.textContent=line.text;text.classList.remove('story-text-in');void text.offsetWidth;text.classList.add('story-text-in');}
        if(prog)prog.textContent=(storyIndex+1)+' / '+storyQueue.length;
        if(next)next.textContent=storyIndex+1>=storyQueue.length?storyFinalLabel:'继续 ▸';
    }
    function showLevelStory(level,lines,onDone){
        const overlay=document.getElementById('levelStoryOverlay');
        if(!overlay||!lines||!lines.length){ if(onDone)onDone(); return; }
        storyLevel=level;storyQueue=lines.slice();storyIndex=0;storyOnDone=onDone||null;storyFinalLabel='开始战斗 ▸';
        const kicker=document.getElementById('levelStoryKicker');
        if(kicker)kicker.textContent='第'+level.no+'关 · '+level.name;
        overlay.dataset.mode=level.mode||gameState.gameMode||'classic';
        overlay.hidden=false;overlay.style.display='flex';
        renderStoryLine();
        try{applyMusicScene();}catch(error){}
    }
    function showCampaignDialogue(title,lines,onDone,finalLabel){
        const overlay=document.getElementById('levelStoryOverlay');
        if(!overlay||!lines||!lines.length){ if(onDone)onDone(); return; }
        storyLevel=null;storyQueue=lines.slice();storyIndex=0;storyOnDone=onDone||null;storyFinalLabel=finalLabel||'继续 ▸';
        const kicker=document.getElementById('levelStoryKicker');
        if(kicker)kicker.textContent=title;
        overlay.dataset.mode=(levelState.level&&levelState.level.mode)||gameState.gameMode||'classic';
        overlay.hidden=false;overlay.style.display='flex';
        renderStoryLine();
        try{applyMusicScene();}catch(error){}
    }
    function advanceStory(){
        if(storyIndex+1>=storyQueue.length){ finishStory(); return; }
        storyIndex++;renderStoryLine();
    }
    function finishStory(){
        const overlay=document.getElementById('levelStoryOverlay');
        if(overlay){overlay.hidden=true;overlay.style.display='none';}
        const done=storyOnDone;storyOnDone=null;storyQueue=[];storyIndex=0;
        if(done)done();
        try{applyMusicScene();}catch(error){}
    }

    function tutorialCell(x,y){return document.querySelector('#battle-grid .cell[data-x="'+x+'"][data-y="'+y+'"]');}
    function tutorialStepDefs(){
        const refs=tutorialState.refs||{};
        if(tutorialState.id==='tutorial-basic'){
            return [
                {label:'选中训练战车',text:'点击左侧高亮的训练战车，选中它。',focus:()=>[tutorialCell(1,2)],check:()=>refs.a&&gameState.selectedUnitId===refs.a.id},
                {label:'发动一次攻击',text:'点击右侧的红色攻击格，攻击训练假人。',focus:()=>[tutorialCell(2,2)],check:()=>!!(refs.a&&(refs.a.attacksMade>0||(refs.dummy&&(refs.dummy.destroyed||(refs.dummy.chaos||0)>0))))},
                {label:'选中第二辆车',text:'点击下方高亮的训练战车，准备演示移动。',focus:()=>[tutorialCell(1,4)],check:()=>refs.b&&gameState.selectedUnitId===refs.b.id},
                {label:'移动到标记格',text:'点击右侧黄色移动格，把第二辆车移过去。',focus:()=>[tutorialCell(2,4)],check:()=>refs.b&&(refs.b.x>1||refs.b.hasActedEver)},
                {label:'结束回合',text:'单位行动完成后，点击「结束回合」。',focus:()=>[document.getElementById('end-turn-btn')],check:()=>gameState.activeSide==='blue'||gameState.turn>1}
            ];
        }
        return [
            {label:'打开技能卡',text:'本教程已为你准备了一张【闪电战】。点击「使用技能卡」。',focus:()=>[document.getElementById('use-card-btn')],check:()=>!!gameState.cardUseMode||gameState.turnPhase==='USE_CARD'},
            {label:'选择技能卡',text:'点击右侧牌库里的【闪电战】。',focus:()=>[document.querySelector('#red-library .library-card')],check:()=>gameState.selectedCardId===42||!getPlayer('red').library.includes(42)},
            {label:'打出技能卡',text:'点击「打出技能卡」，进入目标选择。',focus:()=>[document.getElementById('play-card-btn')],check:()=>!!gameState.skillTargetRequest},
            {label:'选择目标',text:'点击高亮的训练战车，把技能卡用在它身上。',focus:()=>[tutorialCell(1,2)],check:()=>!gameState.skillTargetRequest||gameState.turnPhase==='DRAW'}
        ];
    }
    function clearTutorialFocus(){
        document.querySelectorAll('.tutorial-focus').forEach(el=>el.classList.remove('tutorial-focus'));
    }
    function renderTutorialGuide(){
        const guide=document.getElementById('tutorialGuide');
        const list=document.getElementById('tutorialStepList');
        const text=document.getElementById('tutorialGuideText');
        if(!guide||!list||!text)return;
        const steps=tutorialStepDefs();
        if(!steps.length){finishTutorial();return;}
        const step=steps[tutorialState.step];
        if(!step){finishTutorial();return;}
        guide.hidden=false;
        document.getElementById('tutorialGuideTitle').textContent=tutorialState.id==='tutorial-basic'?'行军与交战':'技能卡入门';
        list.innerHTML=steps.map((s,i)=>'<li class="'+(i<tutorialState.step?'done':i===tutorialState.step?'current':'')+'">'+escapeHTML(s.label)+'</li>').join('');
        text.textContent=step.text;
        clearTutorialFocus();
        (step.focus?step.focus():[]).filter(Boolean).forEach(el=>el.classList.add('tutorial-focus'));
    }
    function syncTutorial(){
        if(!tutorialState.active||gameState.gameOver)return;
        const steps=tutorialStepDefs();
        let guard=0;
        while(tutorialState.step<steps.length&&guard++<8){
            const step=steps[tutorialState.step];
            let done=false;
            try{done=!!step.check();}catch(e){done=false;}
            if(!done)break;
            tutorialState.done[tutorialState.step]=true;
            tutorialState.step++;
        }
        if(tutorialState.step>=steps.length){finishTutorial();return;}
        renderTutorialGuide();
    }
    function finishTutorial(){
        if(!tutorialState.active)return;
        tutorialState.active=false;
        gameState.gameOver=true;
        levelState.result='tutorial';
        document.getElementById('tutorialGuide')?.setAttribute('hidden','');
        clearTutorialFocus();
        const overlay=document.getElementById('tutorialCompleteOverlay');
        const title=document.getElementById('tutorialCompleteTitle');
        const text=document.getElementById('tutorialCompleteText');
        if(title)title.textContent=tutorialState.id==='tutorial-basic'?'行军与交战 · 完成':'技能卡入门 · 完成';
        if(text)text.textContent=tutorialState.id==='tutorial-basic'?'你已经学会了选中、攻击、移动和结束回合。':'你已经学会了使用技能卡。';
        if(overlay)overlay.hidden=false;
        addLog('🎓 训练完成：'+(tutorialState.id==='tutorial-basic'?'行军与交战':'技能卡入门'));
    }
    function exitTutorial(){
        tutorialState={active:false,id:null,step:0,refs:{},done:[]};
        const guide=document.getElementById('tutorialGuide');if(guide)guide.hidden=true;
        const complete=document.getElementById('tutorialCompleteOverlay');if(complete)complete.hidden=true;
        clearTutorialFocus();
        resetGame();
    }
    function startTutorial(id){
        const L=levelData();const t=L&&L.TUTORIALS&&L.TUTORIALS[id];
        if(!t)return;
        document.getElementById('tutorialSelectOverlay').hidden=true;
        document.getElementById('tutorialCompleteOverlay').hidden=true;
        closeLevelSelect(true);
        levelState={active:true,level:t,result:null,tutorial:true};
        selectMode('classic','red',{level:t});
        gameState.tutorial=true;
        gameState.aiSide=null;
        if(t.tutorialLibrary){const red=getPlayer('red');red.library=t.tutorialLibrary.slice();red.usedSkills=new Set();red.sp=t.player&&t.player.sp!==undefined?t.player.sp:10;}
        finishDeployPhase();
        if(id==='tutorial-basic'){gameState.turnPhase='ACTION';gameState.cardUseMode=false;gameState.selectedCardId=null;}
        const red=getPlayer('red');
        tutorialState={active:true,id,step:0,done:[],refs:{
            a:red.units.find(u=>u.x===1&&u.y===2)||null,
            b:red.units.find(u=>u.x===1&&u.y===4)||null,
            dummy:getPlayer('blue').units.find(u=>u.x===2&&u.y===2)||null,
            car:red.units.find(u=>u.x===1&&u.y===2)||null
        }};
        renderAll();
        syncTutorial();
    }
    function renderTutorialOptions(){
        const box=document.getElementById('tutorialOptions');const L=levelData();if(!box||!L)return;
        box.innerHTML=(L.TUTORIAL_ORDER||[]).map(id=>{
            const t=L.TUTORIALS[id];if(!t)return '';
            const tags=id==='tutorial-basic'?['单位行动','移动','攻击','结束回合']:['技能卡','选择目标','实战演示'];
            return '<button type="button" class="tutorial-option" data-tutorial-id="'+id+'"><span class="to-no">'+escapeHTML(t.no)+' · 新兵训练</span><h3>'+escapeHTML(t.name)+'</h3><p>'+escapeHTML(t.tip||'')+'</p><span class="to-tags">'+tags.map(x=>'<span>'+escapeHTML(x)+'</span>').join('')+'</span></button>';
        }).join('');
    }
    function openTutorialSelect(){
        renderTutorialOptions();
        const overlay=document.getElementById('tutorialSelectOverlay');if(overlay)overlay.hidden=false;
    }
    function closeTutorialSelect(){const overlay=document.getElementById('tutorialSelectOverlay');if(overlay)overlay.hidden=true;}

    function startLevel(level,freeArmory){
        if(!level) return;
        const L=levelData(); if(!L) return;
        const keep=freeArmory===undefined?(levelState.freeArmory||null):freeArmory;
        levelState={active:true,level,result:null,freeArmory:keep};
        closeLevelSelect(true);
        const modeSel=document.getElementById('modeSelectOverlay');
        if(modeSel)modeSel.style.display='none';
        selectMode(level.mode,'red',{level});
    }
    let levelDraftOptions=[];
    function hideLevelArmory(){
        const overlay=document.getElementById('levelArmoryOverlay');
        if(overlay)overlay.classList.remove('show');
    }
    function showLevelArmory(level){
        if(!level){startLevel(level);return;}
        if(level.minigame&&level.minigame.noArmory){startLevel(level,null);return;}
        const overlay=document.getElementById('levelArmoryOverlay');
        const box=document.getElementById('levelArmoryOptions');
        if(!overlay||!box){startLevel(level,null);return;}
        const state=createArmoryState();
        levelDraftOptions=state.red.options.slice();
        levelState.draftOptions=levelDraftOptions;
        const hint=document.getElementById('levelArmoryHint');
        if(hint)hint.textContent='第'+level.no+'关「'+level.name+'」：红方可免费带入 1 个军火库单位，部署时不消耗资源；也可以跳过。';
        box.innerHTML='';
        levelDraftOptions.forEach(key=>{
            const def=ARMORY_UNITS[key]||{};
            const card=document.createElement('button');
            card.type='button';
            card.className='armory-card '+(def.tier==='high'?'high':'low');
            card.dataset.armoryKey=key;
            card.innerHTML='<h3>'+key+'</h3><div class="ac-cost">免费</div><div class="ac-desc">'+(def.desc||'')+'</div>';
            box.appendChild(card);
        });
        overlay.classList.add('show');
        try{applyMusicScene();}catch(e){}
    }
    function chooseLevelArmory(key){
        const level=levelState.level;
        hideLevelArmory();
        startLevel(level,key||null);
    }
    function beginLevel(level){
        if(!level||!isLevelUnlocked(level)) return;
        const L=levelData(); if(!L) return;
        levelState={active:true,level,result:null,freeArmory:undefined};
        closeLevelSelect(true);
        const campaign=L.CAMPAIGNS[level.mode];
        if(level.no===1&&campaign&&campaign.prologue&&!isStorySeen(level.mode+':prologue')){
            showCampaignDialogue(campaign.title+' · 序章',campaign.prologue,()=>{
                markStorySeen(level.mode+':prologue');
                showLevelStory(level,level.intro,()=>showLevelArmory(level));
            },'开始战斗 ▸');
            return;
        }
        showLevelStory(level,level.intro,()=>showLevelArmory(level));
    }

    function hideLevelResult(){
        const box=document.getElementById('levelResultActions');
        if(box){box.hidden=true;box.innerHTML='';}
        const generic=document.querySelector('#victoryOverlay .victory-actions');
        if(generic)generic.style.display='';
    }
    function renderLevelResult(won){
        const box=document.getElementById('levelResultActions');
        const generic=document.querySelector('#victoryOverlay .victory-actions');
        if(generic)generic.style.display='none';
        if(!box) return;
        box.hidden=false;box.innerHTML='';
        const lv=levelState.level;
        const add=(label,cls,fn)=>{
            const btn=document.createElement('button');
            btn.type='button';btn.className='btn '+(cls||'');btn.textContent=label;
            btn.onclick=fn;box.appendChild(btn);
        };
        const L=levelData();
        if(won&&L){
            const campaign=L.CAMPAIGNS[lv.mode];
            const next=progressNext(lv);
            if(next)add('➡️ 下一关：'+next.name,'',()=>{
                const interludeAfter={classic:5,snow:5,pirate:5,fog:5,wannan:5,holy:5,mine:5}[lv.mode]||5;
            if(lv.no===interludeAfter&&next.no===lv.no+1&&campaign&&campaign.interlude&&!isStorySeen(lv.mode+':interlude')){
                    showCampaignDialogue(campaign.title+' · 幕间',campaign.interlude,()=>{
                        markStorySeen(lv.mode+':interlude');
                        beginLevel(next);
                    },'进入下一关 ▸');
                }else beginLevel(next);
            });
            if(lv.no===10&&campaign&&campaign.epilogue&&!isStorySeen(lv.mode+':epilogue')){
                setTimeout(()=>{
                    showCampaignDialogue(campaign.title+' · 终章',campaign.epilogue,()=>markStorySeen(lv.mode+':epilogue'),'结束 ▸');
                },450);
            }
        }
        add(won?'🔁 再打一次':'🔁 重试本关','secondary',()=>startLevel(lv,levelState.freeArmory));
        add('📖 返回关卡选择','secondary',()=>resetGame());
    }

    function levelSpawnEnemy(type){
        const pos=levelTakeBlueTile(levelKindOf(type),false);
        if(!pos)return null;
        const u=createLevelUnit({type},pos.x,pos.y,'blue');
        getPlayer('blue').units.push(u);
        addLog('🚨 蓝方增援：'+type);
        return u;
    }
    function levelSpawnGhost(count){
        const graves=getGhost().units.filter(u=>u.type==='墓碑'&&!u.destroyed);
        const free=graves.filter(g=>!getGhost().units.some(u=>u.type==='鬼魂'&&!u.destroyed&&u.x===g.x&&u.y===g.y));
        for(let i=0;i<count&&free.length;i++){
            const g=free.splice(Math.floor(Math.random()*free.length),1)[0];
            getGhost().units.push(createUnit('鬼魂',g.x,g.y,'ghost'));
        }
        if(count)addLog('👻 墓碑滋生鬼魂 +'+count);
    }
    function levelBombard(){
        const targets=getPlayer('red').units.filter(u=>!u.destroyed&&!['地雷','防御工事'].includes(u.type));
        if(!targets.length)return;
        const n=Math.min(2,targets.length);
        for(let i=0;i<n;i++){
            const u=targets[Math.floor(Math.random()*targets.length)];
            addUnitChaos(u,1,'blue');
        }
        addLog('💥 全图轰炸：随机单位混乱 +1');
    }
    function levelSelfDestruct(){
        const suicide=getPlayer('blue').units.filter(u=>!u.destroyed&&(u.type==='战损车'||(u.permaBuffs||[]).includes('battle_damaged')));
        suicide.forEach(u=>{
            getPlayer('red').units.filter(r=>!r.destroyed&&Math.abs(r.x-u.x)+Math.abs(r.y-u.y)===1)
                .forEach(r=>addUnitChaos(r,1,'blue'));
            damageUnit(u,null,{direct:true});
        });
        if(suicide.length)addLog('💥 蓝方战损车自爆');
    }
    function runMinigameTurn(turn){
        const mini=levelState.level&&levelState.level.minigame;
        if(!mini)return;
        const mg=mgState();
        if(mini.hunt){
            const scout=getPlayer('red').units.find(u=>!u.destroyed&&u.layer==='sky'&&u.huntScout);
            if(mg.aaZone&&scout&&Math.abs(scout.x-mg.aaZone.x)<=1&&Math.abs(scout.y-mg.aaZone.y)<=1){
                mg.aaFailed=true;addLog('🚨 防空塔锁定：侦察兵被击落！');
            }
            if(scout){
                if(!mg.aaZone)mg.aaZone={x:scout.x,y:scout.y};
                else{
                    const dx=scout.x-mg.aaZone.x,dy=scout.y-mg.aaZone.y;
                    let sx=0,sy=0;
                    if(dx&&dy){sx=Math.sign(dx);sy=Math.sign(dy);}
                    else if(dx)sx=Math.sign(dx)*Math.min(2,Math.abs(dx));
                    else if(dy)sy=Math.sign(dy)*Math.min(2,Math.abs(dy));
                    mg.aaZone={x:Math.max(0,Math.min(COLS-1,mg.aaZone.x+sx)),y:Math.max(0,Math.min(ROWS-1,mg.aaZone.y+sy))};
                    addLog('🎯 防空塔锁定区移动到 ('+mg.aaZone.x+','+mg.aaZone.y+')');
                }
            }
        }
        if(mini.volcano){
            for(const u of [...getPlayer('blue').units,...getImperial().units].filter(v=>!v.destroyed)){
                const near=[[4,2],[5,2],[6,2]].some(([x,y])=>Math.abs(u.x-x)+Math.abs(u.y-y)===1);
                if(near){damageUnit(u,null,{sourceSide:'red'});addLog('🌋 火山灼烧：'+unitDisplayName(u)+' 受到 1 点伤害');}
            }
        }
        if(mini.hiddenPath&&Array.isArray(mini.route)){
            const lantern=getPlayer('red').units.find(u=>!u.destroyed&&u.levelRole==='lantern');
            if(lantern){
                for(const [x,y] of mini.route){
                    if(Math.abs(x-lantern.x)+Math.abs(y-lantern.y)<=1)mg.revealedPath[x+','+y]=true;
                }
                if(!mini.route.some(([x,y])=>x===lantern.x&&y===lantern.y)&&mg.pathWrongTurn!==turn){
                    mg.pathWrongTurn=turn;lantern.chaos=(lantern.chaos||0)+2;
                    addLog('👻 执灯士踩入错误路线，雾中传来脚步声：混乱 +2');
                }
            }
        }
        if(mini.fakeAlliance&&turn===3&&!gameState.incidentTriggered){
            gameState.incidentTriggered=true;
            getPlayer('blue').units.forEach(u=>{if(!u.destroyed&&!(u.permaBuffs||[]).includes('rage'))u.permaBuffs.push('rage');});
            getPlayer('red').sp+=1;
            const red=getPlayer('red');red.library=red.library||[];red.usedSkills=red.usedSkills||new Set();
            if(!red.library.includes(66)){red.library.push(66);red.usedSkills.delete(66);}
            addLog('🎭 事变：雅典撕毁协议，全员狂暴！红方获得技能卡【战术撤退】');
        }
        if(mini.governors){
            for(const g of getImperial().units.filter(u=>!u.destroyed&&u.static)){
                const target=[...getPlayer('red').units,...getPlayer('blue').units].find(u=>!u.destroyed&&Math.abs(u.x-g.x)+Math.abs(u.y-g.y)===1);
                if(target)performUnitAttack(g,target,{finish:false});
            }
        }
        if(mini.conveyor&&turn===mg.conveyorNext)conveyorSpawnWave(false);
        if(gameState.levelId==='pirate-12'){
            const tiles=(mini.conveyor&&mini.conveyor.holdTiles)||[[5,1],[5,3]];
            const ctx=levelCtx();
            const both=tiles.every(([x,y])=>!!(ctx.redTiles&&ctx.redTiles[x+','+y]));
            mg.captureHold=(mg.captureHold||0)+(both?1:0);
            if(both)addLog('🏴 两个据点累计守住 '+mg.captureHold+' / 3 阵');
        }
        if(mini.cannon){
            const cannon=getPlayer('red').units.find(u=>!u.destroyed&&u.levelRole==='cannon');
            if(mg.overheated&&turn>mg.stunTurn&&cannon)cannon.suppressed=false;
            const shots=mg.shotTurns||[];
            if(cannon&&!mg.overheated&&shots.length>=3&&shots.slice(-3).every((t,i)=>t===shots[shots.length-3]+i)&&turn===shots[shots.length-1]+1){
                cannon.type='步兵';delete cannon.armoryType;cannon.remainingActions=1;cannon.suppressed=true;
                mg.overheated=true;mg.stunTurn=turn;addLog('🔥 重炮连续三回合开火，过热瘫痪！本回合无法移动');
            }
        }
        if(mini.airdropEngineerTurn===turn&&!mg.engineerSpawned){
            const pos=levelTakeEdgeTile(); const u=pos?createArmoryUnit('工兵',pos.x,pos.y,'blue'):null;
            if(u){u.levelRole='bomber';mg.engineerSpawned=true;getPlayer('blue').units.push(u);addLog('💣 蓝方工兵出现，直奔重炮！');}
        }
        if(mini.autoEscort){
            const units=gameState.mineOnly?mineUnitsOf('red'):getPlayer('red').units;
            const u=units.find(v=>!v.destroyed&&v.levelRole===mini.autoEscort.role);
            if(u&&u.x<mini.autoEscort.toX){
                const nx=u.x+1,ny=u.y;
                if(gameState.mineOnly){
                    if(mg.cartBrake){mg.cartBrake=false;addLog('🛒 矿车急刹车，本回合暂停');}
                    else if(isMineWall(nx,ny)){addLog('🛒 轨道被岩壁挡住，矿车停下');}
                    else{
                        const hit=mineUnitAt(nx,ny);
                        if(hit&&hit.side==='monster'){mg.cartWrecked=true;addLog('💥 矿车撞上矿兽，被掀翻了！');}
                        else if(hit&&hit.side==='blue'){
                            damageUnit(hit,u,{direct:true,sourceSide:'red'});
                            if(hit.destroyed){u.x=nx;addLog('🛒 矿车碾过敌方步兵');}
                            else addLog('🛒 矿车被挡住');
                        }else{u.x=nx;addLog('🛒 矿车向前滑到 ('+nx+','+ny+')');}
                    }
                }else{
                    const heavy=gameState.weather&&gameState.weather.kind==='snow'&&gameState.weather.level===2;
                    if(heavy&&turn%2===1){addLog('❄️ 大雪拖慢了雪橇，本回合暂停');}
                    else{
                        const hit=unitAt(nx,ny);
                        if(hit&&hit.side!=='red'){
                            if(hit.unit.type==='车'){
                                mg.sledPush=(mg.sledPush||0)+1;u.x=Math.max(0,u.x-1);
                                addLog('🛷 敌方战车撞退雪橇一格（'+mg.sledPush+'/2）');
                            }else{
                                const n=finalAttackRoll(u,hit.unit);
                                const result=resolveAttack({type:'车',side:u.side,permaBuffs:[],tempBuffs:[]},hit.unit,n);
                                applyCombatOutcome(u,hit.unit,result,{occupy:false});
                                if(hit.unit.destroyed){u.x=nx;mg.sledUnblocked=(mg.sledUnblocked||0)+1;addLog('🛷 雪橇撞开敌军，继续滑行');}
                                else{mg.sledDamage=true;addLog('🛷 雪橇撞上敌军，被迫停下并受损');}
                            }
                        }else if(!hit&&!isBlockedTile(nx,ny,gameState.gameMode)){
                            u.x=nx;mg.sledUnblocked=(mg.sledUnblocked||0)+1;
                            if((mg.sledUnblocked||0)>=2&&!mg.sledFast){mg.sledFast=true;addLog('💨 雪橇进入极速状态');}
                            addLog('🛷 雪橇滑到 ('+nx+','+ny+')');
                        }else{mg.sledUnblocked=0;addLog('🛷 前路被挡住，雪橇停下');}
                    }
                }
            }
        }
        if(mini.waves&&mini.waves.every&&turn%mini.waves.every===0){
            for(let i=0;i<(mini.waves.count||1);i++){
                let pos=null;
                if(mini.waves.randomEdge){pos=levelTakeEdgeTile();}
                else if(Number.isFinite(mini.waves.spawnX)){
                    const yOrder=[2,1,3,0,4];
                    for(const y of yOrder){
                        const x=mini.waves.spawnX;
                        if(x>=0&&x<COLS&&y>=0&&y<ROWS&&!unitAt(x,y)&&!isBlockedTile(x,y,gameState.gameMode)){pos={x,y};break;}
                    }
                }
                if(!pos)pos=levelTakeBlueTile('front');
                if(!pos)break;
                const spec={type:mini.waves.type||'步兵'};
                if(mini.waves.boarded)spec.boarded=true;
                const u=createLevelUnit(spec,pos.x,pos.y,'blue');
                if(mini.waves.boarded)u.boarded=true;
                if(mini.waves.fanatic)u.fanatic=true;
                getPlayer('blue').units.push(u);
            }
            addLog('🌊 新的敌军从侧翼涌了上来');
        }
    }
    function runLevelTurnEffects(turn){
        const ai=gameState.levelAI||{};
        showLevelLine('turn',{turn});
        runMinigameTurn(turn);
        if(ai.spawnGhost&&ai.spawnGhost.every&&turn%ai.spawnGhost.every===0)levelSpawnGhost(ai.spawnGhost.count||1);
        if(ai.spawn&&ai.spawn.every&&turn%ai.spawn.every===0)levelSpawnEnemy(ai.spawn.type||'步兵');
        if(ai.bombard&&turn>=(ai.bombard.fromTurn||1))levelBombard();
        if(ai.selfDestruct&&turn>=(ai.selfDestruct.fromTurn||999))levelSelfDestruct();
        renderAll();
    }
    function levelTick(){
        if(!levelState.active||gameState.gameOver) return;
        if(gameState.phase!=='ACTION') return;
        const st=levelStats();
        if(!st.enemyLanded){
            const limit=gameState.gameMode==='pirate'?3:4;
            const landed=getPlayer('blue').units.some(u=>!u.destroyed&&(u.layer||'ground')==='ground'&&u.x<=limit&&!u.boarded);
            if(landed){st.enemyLanded=true;showLevelLine('landed');}
        }
        if(st.effectTurn!==gameState.turn){st.effectTurn=gameState.turn;updateLevelHoldStreak();runLevelTurnEffects(gameState.turn);}
        const collectTiles=levelState.level.minigame&&levelState.level.minigame.collectTiles||[];
        if(collectTiles.length){
            st.collectedTiles=st.collectedTiles||{};
            for(const [x,y] of collectTiles){
                if(getPlayer('red').units.some(u=>!u.destroyed&&(u.layer||'ground')==='ground'&&u.x===x&&u.y===y))st.collectedTiles[x+','+y]=true;
            }
        }
        const L=levelData();
        if(!L) return;
        if(L.objectiveFailed(levelState.level.objective,levelCtx())){showVictory('蓝方胜利 · 任务失败');return;}
        if(levelObjectiveMet()){showVictory('红方胜利 · 任务完成');return;}
        const ctx=levelCtx();
        if(ctx.redTiles['5,1']||ctx.redTiles['5,3'])showLevelLine('captureOne');
        if(ctx.redTiles['5,2'])showLevelLine('hold');
        if(ctx.souls>=3)showLevelLine('souls',{count:ctx.souls});
    }

    /* 关卡界面绑定 */
    document.getElementById('level-mode-btn')?.addEventListener('click',()=>openLevelSelect(levelTabMode));
    document.getElementById('to-campaign-btn')?.addEventListener('click',()=>openLevelSelect(levelTabMode));
    (function unifiedLobbyEntry(){
        let q; try{q=new URLSearchParams(location.search);}catch(e){return;}
        if(q.get('campaign')==='1'){setTimeout(()=>openLevelSelect('classic'),0);return;}
        if(q.get('autostart')==='1'){
            const mode=q.get('mode');
            const valid=['classic','snow','wannan','pirate','fog','holy','mine','tide','beacon','neon'];
            if(!mode||!valid.includes(mode))return;
            if(q.get('ai')==='1'){const ai=document.getElementById('aiOpponentToggle');if(ai)ai.checked=true;}
            setTimeout(()=>selectMode(mode,'red'),0);
        }
    })();
    document.getElementById('levelCloseBtn')?.addEventListener('click',()=>closeLevelSelect());
    document.getElementById('levelSelectOverlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeLevelSelect();});
    document.getElementById('levelModeTabs')?.addEventListener('click',e=>{
        const btn=e.target.closest('[data-level-tab]');if(!btn)return;
        levelTabMode=btn.dataset.levelTab;renderLevelTabs();renderLevelGrid();
    });
    document.getElementById('levelGrid')?.addEventListener('click',e=>{
        const card=e.target.closest('[data-level-id]');if(!card||card.disabled)return;
        const L=levelData();if(!L)return;
        const level=L.getLevel(card.dataset.levelId);if(level)beginLevel(level);
    });
    const levelGridNode=document.getElementById('levelGrid');
    levelGridNode?.addEventListener('mouseover',e=>{
        const node=e.target.closest('.level-card[data-level-id]');
        if(node&&!node.contains(e.relatedTarget))showLevelNodeTip(node);
    });
    levelGridNode?.addEventListener('mouseout',e=>{
        const node=e.target.closest('.level-card[data-level-id]');
        if(node&&!node.contains(e.relatedTarget))hideLevelNodeTip();
    });
    levelGridNode?.addEventListener('focusin',e=>{
        const node=e.target.closest('.level-card[data-level-id]');if(node)showLevelNodeTip(node);
    });
    levelGridNode?.addEventListener('focusout',e=>{
        const node=e.target.closest('.level-card[data-level-id]');if(node)hideLevelNodeTip();
    });
    levelGridNode?.addEventListener('mouseleave',hideLevelNodeTip);
    document.getElementById('levelUnlockAllBtn')?.addEventListener('click',()=>{
        const L=levelData(); if(!L)return;
        const progress={}; L.LEVELS.forEach(l=>{progress[l.id]={cleared:true};});
        try{localStorage.setItem(LEVEL_PROGRESS_KEY,JSON.stringify(progress));}catch(error){}
        renderLevelTabs();renderLevelGrid();
    });
    document.getElementById('levelResetProgressBtn')?.addEventListener('click',()=>{
        if(!confirm('确定重置全部关卡进度？已通关的关卡会重新锁定。'))return;
        try{localStorage.removeItem(LEVEL_PROGRESS_KEY);}catch(error){}
        renderLevelTabs();renderLevelGrid();
    });
    document.getElementById('levelStoryNext')?.addEventListener('click',advanceStory);
    document.getElementById('levelStorySkip')?.addEventListener('click',finishStory);
    document.getElementById('levelStoryOverlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)advanceStory();});
    document.getElementById('levelActionBtn')?.addEventListener('click',handleLevelAction);
    document.getElementById('levelArmorySkip')?.addEventListener('click',()=>chooseLevelArmory(null));    document.getElementById('levelArmoryOptions')?.addEventListener('click',e=>{
        const card=e.target.closest('[data-armory-key]');
        if(card)chooseLevelArmory(card.dataset.armoryKey);
    });
    document.getElementById('levelTutorialBtn')?.addEventListener('click',openTutorialSelect);
    document.getElementById('levelTutorialFooterBtn')?.addEventListener('click',openTutorialSelect);
    document.getElementById('tutorialSelectClose')?.addEventListener('click',closeTutorialSelect);
    document.getElementById('tutorialSelectOverlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeTutorialSelect();});
    document.getElementById('tutorialOptions')?.addEventListener('click',e=>{const card=e.target.closest('[data-tutorial-id]');if(card)startTutorial(card.dataset.tutorialId);});
    document.getElementById('tutorialSkipBtn')?.addEventListener('click',exitTutorial);
    document.getElementById('tutorialSkipLink')?.addEventListener('click',exitTutorial);
    document.getElementById('tutorialBackBtn')?.addEventListener('click',exitTutorial);
    document.getElementById('tutorialRetryBtn')?.addEventListener('click',()=>{const id=tutorialState.id;if(id)startTutorial(id);});
    setInterval(levelTick,800);

    function selectMode(mode,startingSide,options={}){
        if(!['classic','snow','wannan','pirate','fog','holy','mine','tide','beacon','neon'].includes(mode))return;
        const level=options.level||null;
        clearGameTimers();gameState=createInitialGameState();gameState.gameMode=mode;logMessages=[];
        fxQueue.length=0;
        gameState.startingSide=startingSide==='blue'?'blue':'red';
        gameState.aiSide=level?'blue':(document.getElementById('aiOpponentToggle')&&document.getElementById('aiOpponentToggle').checked?'blue':null);
        undoStack.length=0;closeCardHelp();updateUndoButton();
        debugState.active=false;debugState.deployMode=false;
        ['victoryOverlay','drawOverlay','targetHint','debug-panel'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
        document.body.className=mode+'-mode';
        document.body.dataset.mode=mode;
        const modeLabel=document.getElementById('local-mode-label');if(modeLabel)modeLabel.textContent=MODE_NAMES[mode]||mode;
        document.getElementById('modeSelectOverlay').style.display='none';document.querySelector('.game-container').style.display='block';
        document.getElementById('snow-canvas').style.display='none';
        snowEffectToken++;
        lastSnowWeatherKey='';
        document.body.dataset.weather='';
        if(window.ChaosWeatherFX) window.ChaosWeatherFX.clear();
        if(mode==='snow')initSnowEffect();
        if(mode==='pirate')gameState.pirateBoatPoints=[{x:3,y:0},{x:3,y:2},{x:3,y:4},{x:7,y:0},{x:7,y:2},{x:7,y:4}];
        if(mode==='fog')initFogGraves();
        if(mode==='holy'){
            gameState.red.resources=30;gameState.blue.resources=30;
            gameState.red.baseCmd=3;gameState.blue.baseCmd=3;
            gameState.red.cmd=3;gameState.blue.cmd=3;
            ensureHolyState();
        }
        if(mode==='mine')initMineMode();
        if(mode==='beacon'){
            gameState.red.baseCmd=3;gameState.blue.baseCmd=3;
            gameState.red.cmd=3;gameState.blue.cmd=3;
        }
        if(mode==='neon')neonState();
        if(level)applyLevelToGame(level);
        syncDebugModeSections();
        addLog(MODE_NAMES[mode]+(level?' · 关卡「'+level.name+'」':' · 军火库'));
        refreshDebugCardSelect();renderAll();
        if(!level)renderArmoryOverlay();
        updateLevelHud();
    }
    document.querySelectorAll('.mode-option').forEach(el=>el.addEventListener('click',()=>selectMode(el.id.replace('mode-',''))));
    /* 深绿星阵大厅：悬停 / 聚焦时预览模式详情，点选仍立即开始对局。 */
    function updateModePreview(el){
        if(!el)return;
        const d=el.dataset;
        const setText=(id,text)=>{const node=document.getElementById(id);if(node)node.textContent=text;};
        setText('local-mode-eyebrow','阵式 '+(d.no||'')+' · '+(d.en||''));
        setText('local-mode-title',d.name||'');
        setText('local-mode-en',d.en||'');
        setText('local-mode-brief',d.brief||'');
        setText('local-mode-quote',d.quote||'');
        setText('local-orb-no',(d.no||'')+' / '+(d.index||''));
        const points=document.getElementById('local-mode-points');
        if(points)points.innerHTML=(d.points||'').split('|').filter(Boolean).map(p=>'<li>'+p+'</li>').join('');
        const tagEl=el.querySelector('.mode-tag');
        const tag=tagEl?tagEl.textContent:'';
        const sel=document.getElementById('local-preview-sel');
        if(sel)sel.innerHTML='<b>'+(d.name||'')+'</b><span>'+tag+' · '+(d.en||'')+'</span>';
        const overlay=document.getElementById('modeSelectOverlay');
        if(overlay)overlay.style.setProperty('--st-accent',d.accent||'#8ad9b4');
        document.body.style.setProperty('--st-accent',d.accent||'#8ad9b4');
        const icon=document.getElementById('local-orb-icon');
        const use=el.querySelector('.mode-icon use');
        if(icon&&use)icon.innerHTML='<svg viewBox="0 0 24 24"><use href="'+use.getAttribute('href')+'"></use></svg>';
        const options=Array.from(document.querySelectorAll('.mode-option'));
        const needle=document.getElementById('local-needle');
        if(needle)needle.style.transform='translateX(-50%) rotate('+(Math.max(0,options.indexOf(el))*36)+'deg)';
    }
    document.querySelectorAll('.mode-option').forEach(el=>{
        el.addEventListener('mouseenter',()=>updateModePreview(el));
        el.addEventListener('focus',()=>updateModePreview(el));
    });
    updateModePreview(document.querySelector('.mode-option'));
    document.addEventListener('keydown',e=>{
        if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
        const overlay=document.getElementById('modeSelectOverlay');
        if(!overlay||overlay.style.display==='none')return;
        if(e.target&&/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))return;
        const options=Array.from(document.querySelectorAll('.mode-option'));
        if(!options.length)return;
        e.preventDefault();
        const active=document.activeElement&&options.indexOf(document.activeElement)>=0?options.indexOf(document.activeElement):0;
        const next=options[(active+(e.key==='ArrowRight'?1:options.length-1))%options.length];
        next.focus();
        updateModePreview(next);
    });
    const rulesPopup=document.getElementById('rulesPopup');
    document.getElementById('rules-btn')?.addEventListener('click',()=>{rulesPopup.style.display='flex';});
    document.getElementById('mode-rules-btn')?.addEventListener('click',()=>{rulesPopup.style.display='flex';});
    document.getElementById('rulesCloseBtn')?.addEventListener('click',()=>{rulesPopup.style.display='none';});
    rulesPopup?.addEventListener('click',e=>{if(e.target===e.currentTarget)rulesPopup.style.display='none';});
    const copyrightPopup=document.getElementById('copyrightPopup');
    const openCopyright=()=>copyrightPopup?.classList.add('show');
    const closeCopyright=()=>copyrightPopup?.classList.remove('show');
    document.getElementById('mode-copyright-btn')?.addEventListener('click',openCopyright);
    document.getElementById('mode-copyright-btn-2')?.addEventListener('click',openCopyright);
    document.getElementById('copyrightCloseBtn')?.addEventListener('click',closeCopyright);
    document.getElementById('copyrightBackBtn')?.addEventListener('click',closeCopyright);
    copyrightPopup?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeCopyright();});
    const codexPopup=document.getElementById('codexPopup');
    const openCodex=()=>{ if(window.ChaosCodex) window.ChaosCodex.open(); else codexPopup?.classList.add('show'); };
    const closeCodex=()=>{ if(window.ChaosCodex) window.ChaosCodex.close(); else codexPopup?.classList.remove('show'); };
    document.getElementById('mode-codex-btn')?.addEventListener('click',openCodex);
    document.getElementById('codex-btn')?.addEventListener('click',openCodex);
    document.getElementById('codexCloseBtn')?.addEventListener('click',closeCodex);
    codexPopup?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeCodex();});
    document.getElementById('exit-local-btn')?.addEventListener('click',()=>{
        if(!gameState.gameMode||gameState.gameOver){resetGame();return;}
        if(window.confirm('确定退出当前对局并返回模式选择？')) resetGame();
    });
    window.ChaosBeta=Object.freeze({version:'2.1.0',getState:()=>gameState,selectMode,resetGame});
    resetGame();

})();
