/*!
 * 混乱与蠕动 · 2.0 战役数据（单机模式专用）
 * ------------------------------------------------------------------
 * 四部战役 × 10 关：经典《权力的泥沼》、雪原《凛冬碎骨》、
 * 海盗《咸水与金币》、雾夜《安息与提灯》。
 *
 * 关卡 = 剧情（intro / win / lose / lines）+ 固定蓝方配置 + 任务条件。
 * 目标判定是纯函数，tools/level-tests.cjs 可在 Node 中直接验证。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChaosLevels = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CHARACTERS = {
    narrator:  { name: '旁白', title: '战场记录', avatar: '📜', color: '#b9ae98' },
    erin:      { name: '艾琳', title: '新兵参谋', avatar: '🎧', color: '#e8b86a' },
    hoke:      { name: '霍克少校', title: '苍蓝联邦', avatar: '🎖️', color: '#6fa8dc' },
    leo:       { name: '老雷', title: '极地老兵', avatar: '🧊', color: '#9fc3d4' },
    dongniya:  { name: '冬妮娅', title: '白狼卫队', avatar: '🐺', color: '#cfe3f2' },
    kidd:      { name: '基德', title: '大副', avatar: '⚓', color: '#d6b06a' },
    babosa:    { name: '巴博萨', title: '独眼船长', avatar: '🏴‍☠️', color: '#7fb2c9' },
    sesis:     { name: '塞西斯', title: '神棍调查员', avatar: '🕯️', color: '#bfa8d8' },
    general:   { name: '旧日将军', title: '亡灵统帅', avatar: '💀', color: '#a9c0b0' },
    enemy:     { name: '敌兵', title: '苍蓝联邦', avatar: '🪖', color: '#8fa8bf' },
    commander: { name: '指挥官', title: '赤炎前线', avatar: '🔥', color: '#e07a5f' },
    lykos:     { name: '吕科斯', title: '斯巴达副官', avatar: '🛡️', color: '#c47f5a' },
    helen:     { name: '海伦', title: '雅典特使', avatar: '🕊️', color: '#7fa7c9' },
    arta:      { name: '阿尔塔', title: '波斯统帅', avatar: '🏺', color: '#d8b45a' },
    sera:      { name: '赛拉', title: '圣辉祭司', avatar: '✨', color: '#e8d6a8' },
    orion:     { name: '奥里昂', title: '堕落圣骑', avatar: '⚔️', color: '#b9a7d8' },
    shi:       { name: '石叔', title: '老矿工', avatar: '⛏️', color: '#b8a68a' },
    warden:    { name: '蛇骨矿主', title: '矿洞主宰', avatar: '🐍', color: '#8fbf9f' }
  };

  const CAMPAIGNS = {
    classic: {
      mode: 'classic', title: '权力的泥沼', tag: 'CLASSIC', adjutant: 'erin', boss: 'hoke', icon: '🗺️',
      prologue: [
        { who: 'narrator', text: '泥沼带，雨季第七周。赤炎与苍蓝联邦的战线已经三天没有移动过一寸。' },
        { who: 'erin', text: '长官，总部来电。他们说这一带是“不设防地带”，让我们自行判断。' },
        { who: 'commander', text: '总部坐在两百公里外的干办公室里，当然觉得这里不设防。' },
        { who: 'erin', text: '可侦察说，联邦的先遣队已经进来了。五辆战车，还有工兵。' },
        { who: 'hoke', text: '赤炎的红虫子们，这里是苍蓝联邦的演习场。你们踩进泥里之前，最好先想清楚。' },
        { who: 'commander', text: '让他说。说得越多，位置暴露得越清楚。' },
        { who: 'erin', text: '长官，电报最后还有一句——“不必留活口”。' },
        { who: 'commander', text: '那就别让他们把这句话带回去。' },
        { who: 'erin', text: '第一道命令是什么？' },
        { who: 'commander', text: '把靴子系紧。泥沼会吃掉站着不动的人。' },
        { who: 'narrator', text: '泥水漫过靴面。远处传来履带碾过枯枝的声音。' },
        { who: 'erin', text: '全军——开拔！' }
      ],
      interlude: [
        { who: 'narrator', text: '雷区之后，泥沼安静得不像战场。只有担架经过时，泥水才会响。' },
        { who: 'erin', text: '长官，总部要我们继续推进，拿下前面那座高地。' },
        { who: 'commander', text: '高地没有路，没有水，也没有战术价值。' },
        { who: 'erin', text: '他们说，谈判桌上需要一块高地。' },
        { who: 'commander', text: '谈判桌需要的是死人名单，不是高地。' },
        { who: 'hoke', text: '红虫子，你们以为赢了几场小仗，就能改变什么吗？' },
        { who: 'erin', text: '他在广播里笑。可侦察说，他后面还有两个装甲连。' },
        { who: 'commander', text: '他在拖时间。把伤员和排雷兵先送回去。' },
        { who: 'erin', text: '长官，士兵们在问——我们到底在为什么打？' },
        { who: 'commander', text: '告诉他们：为了活着回去。别的话，等打完再说。' },
        { who: 'narrator', text: '夜里，泥沼上升起薄雾。远处有引擎在低鸣。' },
        { who: 'erin', text: '明天还要继续。长官，你睡一会儿吧。' }
      ],
      epilogue: [
        { who: 'narrator', text: '霍克的装甲车陷在泥里，炮塔歪向一边。电台还在响，没有人接。' },
        { who: 'erin', text: '长官，他死了。最后一句话是“联邦万岁”。' },
        { who: 'commander', text: '把电台关掉。' },
        { who: 'erin', text: '总部发来贺电。要念吗？' },
        { who: 'commander', text: '念。' },
        { who: 'erin', text: '“泥沼带已收复，敌主力被歼。兹嘉奖前线全体……”' },
        { who: 'commander', text: '还有吗？' },
        { who: 'erin', text: '还有阵亡名单。很长。' },
        { who: 'narrator', text: '风穿过空掉的阵地，卷起一张被泥水泡软的作战地图。' },
        { who: 'commander', text: '把名单收好。一个名字都别漏。' },
        { who: 'erin', text: '长官……我们赢了吗？' },
        { who: 'commander', text: '赢的是活着的人。死去的人，只是不用再打了。' },
        { who: 'erin', text: '那我们回家吧。' },
        { who: 'narrator', text: '泥沼之上，第一缕阳光照在歪倒的炮管上。战争暂时走远了。' }
      ]
    },
    snow: {
      mode: 'snow', title: '凛冬碎骨', tag: 'SNOWFIELD', adjutant: 'leo', boss: 'dongniya', icon: '❄️',
      prologue: [
        { who: 'narrator', text: '极北，零下三十七度。呼出的白气会在睫毛上结冰。' },
        { who: 'leo', text: '冻死老子了。连口热酒都没有，这仗打得真他娘的体面。' },
        { who: 'commander', text: '白狼卫队就在前面。她们比你更习惯这种天气。' },
        { who: 'leo', text: '习惯？长官，她们连脚印都不留。我手下的兵说，那是雪里的鬼。' },
        { who: 'dongniya', text: '赤炎的杂碎。你们踩进这片雪原，就别想完整地走出去。' },
        { who: 'commander', text: '别回话。她在测我们的电台位置。' },
        { who: 'leo', text: '弹药冻住了，枪栓也冻住了。真打起来，只能拼刺刀。' },
        { who: 'commander', text: '那就把刺刀揣怀里，用体温焐着。' },
        { who: 'leo', text: '长官，你这话说得像个老兵。' },
        { who: 'narrator', text: '雪落下来，把昨天的脚印一层层盖住。' },
        { who: 'commander', text: '活下来。活下来的人才有资格谈回家。' },
        { who: 'leo', text: '行，听你的。反正这鬼地方，跑也跑不远。' }
      ],
      interlude: [
        { who: 'narrator', text: '雪崩之后，半个山谷被填平。工事、尸体和炮管都埋在下面。' },
        { who: 'leo', text: '山口通了。可我们的人也少了七个。' },
        { who: 'commander', text: '补给还剩多少？' },
        { who: 'leo', text: '烧了一半。剩下的口粮，省着吃能撑五天。' },
        { who: 'dongniya', text: '你们还在走？前面没有路，只有白狼的猎场。' },
        { who: 'commander', text: '她在试探。别让她听出我们还有多少人。' },
        { who: 'leo', text: '那女人……我在雪地里见过她一次。她站在死人堆里，连眉头都没皱。' },
        { who: 'commander', text: '继续走。停在这里，才会冻死。' },
        { who: 'leo', text: '前面是白狼的补给站。打下来，我们还能多活几天。' },
        { who: 'narrator', text: '雪更深了。每一步都像踩进一张没有底的纸。' },
        { who: 'commander', text: '把伤员留下，给足弹药。' },
        { who: 'leo', text: '长官，你这是让他们等死。' },
        { who: 'commander', text: '是让他们有机会活。带上他们，谁都活不了。' },
        { who: 'leo', text: '……行。我去说。' }
      ],
      epilogue: [
        { who: 'narrator', text: '冬妮娅倒在雪里，血很快被新雪盖住。她的嘴角是弯的。' },
        { who: 'leo', text: '长官，她笑了。' },
        { who: 'commander', text: '把雪盖回去。' },
        { who: 'leo', text: '她是敌人。' },
        { who: 'commander', text: '冻死在雪原里的人，都是这片雪的孩子。' },
        { who: 'leo', text: '……行。' },
        { who: 'narrator', text: '初阳升起来，雪面亮得刺眼。幸存的人开始清点名字。' },
        { who: 'leo', text: '我们的人，还剩二十三个。' },
        { who: 'commander', text: '名单。' },
        { who: 'leo', text: '十二个。都记下了。' },
        { who: 'commander', text: '收好。回去以后，一个一个念给他们的家人听。' },
        { who: 'leo', text: '这雪……明年还会下。' },
        { who: 'commander', text: '那就明年再来。现在，回家。' },
        { who: 'narrator', text: '雪原尽头，有一线很淡的炊烟。那是活人的方向。' }
      ]
    },
    pirate: {
      mode: 'pirate', title: '咸水与金币', tag: 'CORSAIR', adjutant: 'kidd', boss: 'babosa', icon: '🏴‍☠️',
      prologue: [
        { who: 'narrator', text: '海湾的潮水是黑的。风里有盐、火药和旧木头的味道。' },
        { who: 'kidd', text: '头儿，巴博萨把湾口封了。海炮全架着，冲过去连骨头都得给你扬了。' },
        { who: 'commander', text: '他有多少船？' },
        { who: 'kidd', text: '看得见的有六艘。看不见的，得问海。' },
        { who: 'babosa', text: '哈哈哈！在海上，我就是规则。红皮肤的杂碎，沉下去喂鱼吧！' },
        { who: 'commander', text: '听见了吗？他把自己的位置喊出来了。' },
        { who: 'kidd', text: '头儿，快艇还能动。从小路摸过去，端掉他们的据点。' },
        { who: 'commander', text: '金币呢？' },
        { who: 'kidd', text: '头儿，你终于问了一句像海盗的话。' },
        { who: 'narrator', text: '潮水拍着船舷，像有人在下面敲。' },
        { who: 'commander', text: '上船。先拿据点，再谈金币。' },
        { who: 'kidd', text: '好嘞！兄弟们，扬帆——别扬错方向！' }
      ],
      interlude: [
        { who: 'narrator', text: '火药味散了，甲板上还留着烧焦的木头。' },
        { who: 'kidd', text: '头儿，甲板清完了。可我们的人少了三个。' },
        { who: 'commander', text: '名字记下来。' },
        { who: 'kidd', text: '记了。就是……回去以后，不知道把金币寄给谁。' },
        { who: 'babosa', text: '你们以为赢了几条破船，就能拿走我的宝藏？' },
        { who: 'commander', text: '他在引我们往深处走。' },
        { who: 'kidd', text: '水底下有东西。刚才有东西撞了船底，不是礁石。' },
        { who: 'commander', text: '别管它。先把巴博萨找出来。' },
        { who: 'kidd', text: '头儿，金币和命，你选哪个？' },
        { who: 'commander', text: '先活。死了，金币就是别人的。' },
        { who: 'narrator', text: '海面静得反常。连风都停了。' },
        { who: 'kidd', text: '前面就是他的旗舰。头儿……我有点想念陆地了。' }
      ],
      epilogue: [
        { who: 'narrator', text: '巴博萨被拖进水里的时候，还在笑。海面冒了几个泡，然后什么都没有了。' },
        { who: 'kidd', text: '他沉了。头儿，真沉了。' },
        { who: 'commander', text: '据点呢？' },
        { who: 'kidd', text: '拿下了。旗也换了。' },
        { who: 'commander', text: '金币在哪？' },
        { who: 'kidd', text: '箱子在船舱里。可……是空的。' },
        { who: 'commander', text: '打开。' },
        { who: 'kidd', text: '真是空的。只有一张旧海图，画着一个没有名字的岛。' },
        { who: 'narrator', text: '海怪没有再出现。海面平得像一面镜子。' },
        { who: 'kidd', text: '头儿，我想上岸了。这海，太腥了。' },
        { who: 'commander', text: '把旗降了。把死人名字带上。' },
        { who: 'kidd', text: '那金币呢？' },
        { who: 'commander', text: '不要了。' },
        { who: 'narrator', text: '咸水与金币，最后只剩咸水。船朝着有灯的方向开去。' }
      ]
    },
    fog: {
      mode: 'fog', title: '安息与提灯', tag: 'FOG NIGHT', adjutant: 'sesis', boss: 'general', icon: '👻',
      prologue: [
        { who: 'narrator', text: '村子没有名字。地图上只画了一个圈，旁边写着“勿入”。' },
        { who: 'sesis', text: '长官，我的罗盘在疯狂旋转。这地方……不在任何一条路上。' },
        { who: 'commander', text: '蓝方的人呢？' },
        { who: 'sesis', text: '他们站在那里。可我听不到呼吸声。' },
        { who: 'general', text: '欢迎。很久没有活人来了。' },
        { who: 'commander', text: '谁？' },
        { who: 'sesis', text: '别回头！长官，千万别回头！' },
        { who: 'commander', text: '灯呢？' },
        { who: 'sesis', text: '没有灯。这里的人，早就把灯熄了。' },
        { who: 'narrator', text: '雾从地面升起来，像一层没有边的白布。' },
        { who: 'commander', text: '进村。' },
        { who: 'sesis', text: '……好。但请把枪口朝前，别朝后。' }
      ],
      interlude: [
        { who: 'narrator', text: '越往里走，雾越浓。脚下的路开始重复。' },
        { who: 'sesis', text: '长官，我们已经过了五次同一个门。' },
        { who: 'commander', text: '你看到了什么？' },
        { who: 'sesis', text: '我母亲。她站在门口，叫我吃饭。' },
        { who: 'general', text: '他们都在这儿。每一个死去的人，都在这儿。' },
        { who: 'commander', text: '别听。' },
        { who: 'sesis', text: '长官，你呢？你看到了谁？' },
        { who: 'commander', text: '……我没有看到任何人。' },
        { who: 'sesis', text: '那盏灯还在吗？' },
        { who: 'commander', text: '在。继续走。' },
        { who: 'narrator', text: '路边的木桩上，挂着一盏没有火的灯。' },
        { who: 'sesis', text: '等等……那盏灯，刚才是不是眨了一下？' }
      ],
      epilogue: [
        { who: 'narrator', text: '天亮了。雾退得很干净，像从来没有来过。' },
        { who: 'sesis', text: '这些……都是木桩。' },
        { who: 'commander', text: '都是木桩。' },
        { who: 'sesis', text: '那昨晚我们打的那些东西，是什么？' },
        { who: 'general', text: '我的……阵地……' },
        { who: 'commander', text: '结束了。' },
        { who: 'sesis', text: '灯还在。要带走吗？' },
        { who: 'commander', text: '留下。' },
        { who: 'sesis', text: '给谁？' },
        { who: 'commander', text: '给下一个走进来的人。' },
        { who: 'narrator', text: '雾散了。村子还是那个空村子，地上只有普通木桩。' },
        { who: 'sesis', text: '长官，你看，那边有个人影。' },
        { who: 'commander', text: '……走吧。' },
        { who: 'narrator', text: '那盏灯留在村口，照着一片没有名字的空地。' }
      ]
    },
    wannan: {
      mode: 'wannan', title: '三城之盟', tag: 'CITY-STATES', adjutant: 'lykos', boss: 'arta', icon: '🏛️',
      prologue: [
        { who: 'narrator', text: '爱琴海北岸，三座城邦的旗帜插在同一片焦土上：斯巴达的赭红、雅典的蓝、波斯的金。' },
        { who: 'lykos', text: '长官，斯巴达的长矛已经列好。雅典人说要谈，波斯人说要看。谈什么？看什么？' },
        { who: 'helen', text: '雅典只想保住商路。只要斯巴达不越界，我们可以把这场战争变成一场演习。' },
        { who: 'arta', text: '演习？波斯远征军走了三个月，不是为了看你们演习。' },
        { who: 'commander', text: '三方同桌，先别急着选边。谁的底线先露出来，谁就先输。' },
        { who: 'lykos', text: '摩擦值已经在涨了。再有一次擦枪走火，同盟就会变成笑话。' },
        { who: 'helen', text: '同盟本来就是一张写好了日期的纸。日期到了，自然要撕。' },
        { who: 'commander', text: '那就把日期往后拖。拖到我们准备好为止。' },
        { who: 'arta', text: '你们拖，我的骑兵可不会等。' },
        { who: 'narrator', text: '三城的号角同时响起，谁也没有先动手。' },
        { who: 'commander', text: '吕科斯，把阵线压前半格。只半格。' },
        { who: 'lykos', text: '半格？长官，这可不像是谈判。' }
      ],
      interlude: [
        { who: 'narrator', text: '第五道防线之后，焦土上只剩下断矛和没有主人的盾。' },
        { who: 'lykos', text: '雅典人撤了，波斯人还在侧翼。长官，我们夹在中间。' },
        { who: 'commander', text: '摩擦值满了没有？' },
        { who: 'lykos', text: '快了。再有一次冲突，事变就会自己找上门。' },
        { who: 'helen', text: '斯巴达的指挥官，你我都知道，同盟撑不过这个月。' },
        { who: 'arta', text: '那就别撑了。波斯的马蹄会替你们做决定。' },
        { who: 'commander', text: '事变之后，谁先动手，谁就背锅。' },
        { who: 'lykos', text: '那我们要不要先动手？' },
        { who: 'commander', text: '不。让雅典先选。' },
        { who: 'helen', text: '你在等我犯错。' },
        { who: 'commander', text: '我在等你做选择。' },
        { who: 'narrator', text: '夜里，三城的篝火彼此照见，却没有一堆火是为盟友点的。' }
      ],
      epilogue: [
        { who: 'narrator', text: '波斯的金色旗帜倒下时，雅典的蓝旗也只剩半面。' },
        { who: 'lykos', text: '长官，三座城邦，现在只剩两座还在喘气。' },
        { who: 'commander', text: '阿尔塔呢？' },
        { who: 'lykos', text: '往东撤了。他把能带走的都带走了，包括伤员。' },
        { who: 'helen', text: '雅典愿意停战。商路归你们，城邦归我们。' },
        { who: 'commander', text: '同盟呢？' },
        { who: 'helen', text: '同盟已经烧了。你我都点过火。' },
        { who: 'narrator', text: '焦土上，三面旗的碎片被风吹到一起。' },
        { who: 'lykos', text: '长官，士兵们在问，这算赢吗？' },
        { who: 'commander', text: '算。我们活下来了，城邦也还在。' },
        { who: 'lykos', text: '可同盟没了。' },
        { who: 'commander', text: '同盟是纸。城邦是人。纸烧了，人还在。' },
        { who: 'helen', text: '下一次，我们还会坐在一起。' },
        { who: 'commander', text: '下一次，希望桌上没有刀。' }
      ]
    },
    holy: {
      mode: 'holy', title: '圣辉之下', tag: 'HOLY LIGHT', adjutant: 'sera', boss: 'orion', icon: '✝️',
      prologue: [
        { who: 'narrator', text: '圣辉战场分两层：脚下是焦土，头顶是云海。天上的光偶尔从云缝里落下来。' },
        { who: 'sera', text: '长官，天空层已经打开。走进那道光里可以升空，但升空之后，地面就少一个人。' },
        { who: 'commander', text: '奥里昂在哪？' },
        { who: 'sera', text: '他在圣殿的阴影里。曾经是圣骑士，现在替堕落者举旗。' },
        { who: 'orion', text: '圣辉不照背叛者。你们脚下这片光，本来就是借来的。' },
        { who: 'sera', text: '别听他的。谁控制住更多的圣辉之地，谁就能写下结局。' },
        { who: 'commander', text: '先拿区域，再谈升空。' },
        { who: 'sera', text: '火山在中央。喷发之前，谁挤在同一片地方，谁就会被一起吞掉。' },
        { who: 'orion', text: '光会灼伤靠近它的人。你们确定要往前走？' },
        { who: 'commander', text: '我们本来就是从火里走出来的。' },
        { who: 'narrator', text: '云海翻涌，天上的光在场地上投下细长的影子。' },
        { who: 'sera', text: '愿圣辉照见我们的名字。也照见他们的。' }
      ],
      interlude: [
        { who: 'narrator', text: '第五道圣辉之后，火山口开始发红。云层低得几乎能摸到。' },
        { who: 'sera', text: '长官，奥里昂把圣殿的门打开了。他在等我们进去。' },
        { who: 'commander', text: '门后是什么？' },
        { who: 'sera', text: '是另一层战场。天空和地面会同时开火。' },
        { who: 'orion', text: '你们以为升空就是优势？天空没有掩体。' },
        { who: 'commander', text: '天空也没有退路。' },
        { who: 'sera', text: '火山快要喷发了。我们要么抢下那片区域，要么离开这里。' },
        { who: 'commander', text: '把伤员移到边缘。能升空的单位先上。' },
        { who: 'sera', text: '长官，你自己呢？' },
        { who: 'commander', text: '我留在地面。总得有人看着退路。' },
        { who: 'narrator', text: '火山低鸣，像一头被锁在地底的兽。' },
        { who: 'sera', text: '愿这一夜之后，圣辉还记得我们。' }
      ],
      epilogue: [
        { who: 'narrator', text: '奥里昂跪在圣殿中央，剑插在地上，光从他背后熄灭。' },
        { who: 'sera', text: '长官，他走了。圣辉没有烧他，是他自己把光还回去了。' },
        { who: 'orion', text: '圣辉……不欠我什么。是我欠它。' },
        { who: 'commander', text: '把剑留下。人带走。' },
        { who: 'sera', text: '天空层的光全部熄灭了。地面还在。' },
        { who: 'commander', text: '光呢？' },
        { who: 'sera', text: '够了。区域归我们，圣殿也归我们。' },
        { who: 'narrator', text: '火山口慢慢暗下去，云海裂开一道很细的光。' },
        { who: 'commander', text: '把死者名字刻在圣殿门口。' },
        { who: 'sera', text: '那胜利呢？' },
        { who: 'commander', text: '胜利写在后面。先写名字。' },
        { who: 'sera', text: '圣辉之下，名字比胜利长。' },
        { who: 'commander', text: '走吧。天快亮了。' }
      ]
    },
    mine: {
      mode: 'mine', title: '蛇骨深处', tag: 'SERPENT MINE', adjutant: 'shi', boss: 'warden', icon: '⛏️',
      prologue: [
        { who: 'narrator', text: '蛇骨矿洞的地面只有一层薄薄的沙。沙下面，是十层被挖空的岩壁。' },
        { who: 'shi', text: '长官，这矿不干净。晶簇会发光，也会吃人。老矿工下去十个，上来三个。' },
        { who: 'commander', text: '矿主在哪一层？' },
        { who: 'shi', text: '最下面。中央竖井打开之前，谁也不知道它在哪。' },
        { who: 'warden', text: '上面的人，别再往下挖了。你们挖到的不是矿，是我的骨头。' },
        { who: 'commander', text: '那就把你的骨头还给你。' },
        { who: 'shi', text: '井口只能下步兵。车和炮留在上面，别把整层压塌。' },
        { who: 'commander', text: '先清地面，再下井。' },
        { who: 'shi', text: '晶簇能换钱，遗物能换一张底牌。但别贪，塌方会先埋掉贪心的人。' },
        { who: 'warden', text: '你们听见井底的声音了吗？那是矿兽在数你们的脚步。' },
        { who: 'narrator', text: '井口吹出冷风，带着铁锈和骨头的气味。' },
        { who: 'commander', text: '石叔，带路。' }
      ],
      interlude: [
        { who: 'narrator', text: '第五层以下，岩壁开始渗水。灯光只能照见两格。' },
        { who: 'shi', text: '长官，前面的路被塌方堵了。绕过去，会经过矿兽的窝。' },
        { who: 'commander', text: '矿主呢？' },
        { who: 'shi', text: '还在下面。它在等我们挖到它的骨头。' },
        { who: 'warden', text: '你们已经拿走太多晶簇了。每一块，都是我身上掉下来的肉。' },
        { who: 'commander', text: '我们只要路。' },
        { who: 'warden', text: '路也是我的。' },
        { who: 'shi', text: '长官，竖井的绳子只剩最后一截。再往下，就回不来了。' },
        { who: 'commander', text: '那就别回头。' },
        { who: 'shi', text: '我老了，长官。可我这把镐子，还能再挖一层。' },
        { who: 'narrator', text: '水声从深处传来，像有什么东西在呼吸。' },
        { who: 'commander', text: '把灯举高。' }
      ],
      epilogue: [
        { who: 'narrator', text: '蛇骨矿主倒在中央竖井旁，骨头一节一节地散开，像一座塌掉的山。' },
        { who: 'shi', text: '长官，它死了。矿洞……安静了。' },
        { who: 'commander', text: '晶簇呢？' },
        { who: 'shi', text: '还在长。矿死了，晶簇还活着。' },
        { who: 'warden', text: '你们拿不走全部。总有一块，会留在下面。' },
        { who: 'commander', text: '那就留一块。' },
        { who: 'shi', text: '长官，遗物怎么办？' },
        { who: 'commander', text: '带上去。给活着的人。' },
        { who: 'narrator', text: '井口的风重新吹进来，带着一点外面的味道。' },
        { who: 'shi', text: '我下去过十次，这是第一次看见太阳。' },
        { who: 'commander', text: '把绳子收好。以后还会有人下来。' },
        { who: 'shi', text: '希望他们记得带灯。' },
        { who: 'commander', text: '走吧，石叔。回家。' }
      ]
    }
  };
  const MODE_ORDER = ['classic', 'snow', 'pirate', 'fog', 'wannan', 'holy', 'mine'];
  const MODE_NAMES = {
    classic: '权力的泥沼', snow: '凛冬碎骨', pirate: '咸水与金币',
    fog: '安息与提灯', wannan: '三城之盟', holy: '圣辉之下', mine: '蛇骨深处'
  };

  const C = (type, extra) => Object.assign({ type }, extra || {});

  /* ── 经典：权力的泥沼 ───────────────────────────────────── */
  const CLASSIC = [
    {
      id: 'classic-1', no: 1, name: '钢铁的墙', en: 'WALL OF STEEL',
      brief: '三辆战车横成一排，地雷藏在车缝里。八回合内拆掉这堵墙。',
      objective: { label: '8 回合内击毁所有战车', within: 8, conditions: [C('killType', { unitType: '车' })] },
      enemy: { name: '霍克 · 先遣队', units: [
        { type: '车', count: 3 }, { type: '地雷', count: 3 }, { type: '防御工事', count: 2 }
      ]},
      ai: { style: 'rush' },
      intro: [
        { who: 'erin', text: '长官，敌军先遣队已进入射程。可是他们的队形……三辆战车横成一排，连工事都摆在最前面。这是新战术吗？' },
        { who: 'erin', text: '收到！全军准备迎击——希望他们下辈子记得带地图。' }
      ],
      win: [{ who: 'erin', text: '赢了！首战告捷。但长官，为什么他们的电报里，把这里叫作“不设防地带”？' }],
      lose: [{ who: 'hoke', text: '赤炎的红虫子，连一排战车都啃不动。' }],
      lines: [{ when: 'lastKill', who: 'enemy', text: '少校明明说……这里是演习场啊……' }],
      tip: '战车怕地雷，也怕被集火；先把车引离雷区再打。'
    },
    {
      id: 'classic-2', no: 2, name: '炮火矩阵', en: 'ARTILLERY MATRIX',
      brief: '工事围成铁桶，精锐炮兵躲在后面。拔掉所有炮。',
      objective: { label: '击杀所有炮兵', conditions: [C('killType', { unitType: '炮兵' })] },
      enemy: { name: '霍克 · 炮阵', units: [
        { type: '精锐炮兵', count: 3 }, { type: '精锐步兵', count: 3 },
        { type: '防御工事', count: 3 }, { type: '地雷', count: 2 }
      ]},
      ai: { style: 'artillery' },
      intro: [
        { who: 'hoke', text: '红虫子们，见识一下联邦的炮火矩阵！我的炮兵连一秒钟都不会停！' },
        { who: 'erin', text: '他好吵……长官，炮兵缩在工事后面，步兵护着阵。得先把炮拔掉。' }
      ],
      win: [{ who: 'erin', text: '炮全哑了。那个少校好像哭着坐直升机跑了……不过我们缴获了半箱罐头！' }],
      lose: [{ who: 'hoke', text: '在我的炮火里站了这么久，你们也算有点骨气。' }],
      lines: [{ when: 'firstKillType', unitType: '炮兵', who: 'hoke', text: '我的炮！你们这些不讲武德的野蛮人！' }],
      tip: '炮兵只能打已行动过的目标；用工事挡住炮线，再贴身。'
    },
    {
      id: 'classic-3', no: 3, name: '绝望泥沼', en: 'DESPERATE MIRE',
      brief: '装甲车死战不退，后勤兵每回合修整。活过十个回合。',
      objective: { label: '存活 10 回合', conditions: [C('survive', { turn: 10 })] },
      enemy: { name: '霍克 · 铁砧', units: [
        { type: '装甲车', count: 2 }, { type: '精锐战车', count: 2 }, { type: '后勤兵', count: 1 }
      ]},
      ai: { style: 'hold' },
      intro: [
        { who: 'erin', text: '联邦倾巢出动了。长官，这一战，我们可能都会死在这里。' },
        { who: 'erin', text: '为了赤炎！长官，下辈子我还要做你的副官！' }
      ],
      win: [{ who: 'erin', text: '我们活下来了？我们真的活下来了！' }],
      lose: [{ who: 'erin', text: '长官……泥沼太深了，我们没走出去。' }],
      lines: [{ when: 'turn', turn: 5, who: 'erin', text: '弹药不多了！用工事卡位，别让他们合围！' }],
      tip: '装甲车能抵消一次判定；先打后勤，断掉修整。'
    },
    {
      id: 'classic-4', no: 4, name: '绞肉机的高潮', en: 'MEAT GRINDER',
      brief: '战损车自杀冲锋，战车与炮兵随后收割。全歼他们。',
      objective: { label: '全歼敌人', conditions: [C('eliminate')] },
      enemy: { name: '霍克 · 绞肉机', units: [
        { type: '战损车', count: 4 }, { type: '车', count: 2 }, { type: '精锐炮兵', count: 3 }
      ]},
      ai: { style: 'rush' },
      intro: [
        { who: 'erin', text: '他们把战损车推到最前面，摆明了要拿废铁换我们的卡。' },
        { who: 'hoke', text: '联邦的钢铁，从来不怕消耗。' }
      ],
      win: [{ who: 'erin', text: '绞肉机停了。长官，我以后再也不想吃肉了。' }],
      lose: [{ who: 'hoke', text: '你们被废铁拖住了。战争就是这么简单。' }],
      lines: [{ when: 'firstKillType', unitType: '车', who: 'hoke', text: '那辆战车可是联邦的宝贝！' }],
      tip: '战损车攻低防低；别把技能卡浪费在它们身上。'
    },
    {
      id: 'classic-5', no: 5, name: '地雷与高墙', en: 'MINES & WALLS',
      brief: '雷区铺满必经之路。护送排雷兵抵达最右侧 (10,2)。',
      objective: { label: '护送排雷兵抵达 (10,2)', conditions: [C('escort', { role: 'sapper', x: 10, y: 2 })], failIf: [C('roleDead', { role: 'sapper' })] },
      player: { roles: [{ type: '排雷兵', role: 'sapper', x: 0, y: 2 }] },
      enemy: { name: '霍克 · 雷场', units: [
        { type: '地雷', count: 6 }, { type: '装甲车', count: 1 },
        { type: '精锐炮兵', count: 2 }, { type: '防御工事', count: 3 }
      ]},
      ai: { style: 'artillery' },
      intro: [
        { who: 'erin', text: '长官，联邦的工兵在前面布了雷区。他们没有道德！连空地都埋了雷！' },
        { who: 'erin', text: '排雷兵已经就位。只要他能走到最右侧，我们就能撕开缺口。' }
      ],
      win: [{ who: 'erin', text: '吓死我了。对了，那些雷的引信，好像是我们赤炎造的啊……' }],
      lose: [{ who: 'erin', text: '排雷兵倒下了……长官，我们过不去了。' }],
      lines: [{ when: 'mine', who: 'erin', text: '轰！长官你没事吧？医疗兵！医疗兵死哪去了？！' }],
      tip: '排雷兵踩雷 1 点混乱、2–6 无事；沿最右侧推进，别让他落单。'
    },
    {
      id: 'classic-6', no: 6, name: '高地绞杀', en: 'HIGHLAND KILL',
      brief: '回合结束时占据中心 (5,2)，并全歼敌军。',
      objective: { label: '占据 (5,2) 并全歼敌军', conditions: [C('hold', { x: 5, y: 2 }), C('eliminate')] },
      enemy: { name: '霍克 · 高地', units: [
        { type: '精锐战车', count: 3 }, { type: '精锐步兵', count: 2 }, { type: '后勤兵', count: 2 }
      ]},
      ai: { style: 'hold' },
      intro: [
        { who: 'erin', text: '长官，高地其实没有任何战略价值。但上面说，我们必须占领它，用来在谈判桌上增加筹码。' },
        { who: 'erin', text: '联邦已经把中心堵死了。' }
      ],
      win: [{ who: 'erin', text: '高地拿下来了。上面发了贺电。但我一点也高兴不起来。' }],
      lose: [{ who: 'erin', text: '高地没拿下来。长官，那些倒在泥里的年轻人，知道自己在为谁而死吗？' }],
      lines: [{ when: 'hold', who: 'erin', text: '旗帜插上了。可是长官，下面那些倒在泥里的年轻人，他们知道自己在为谁而死吗？' }],
      tip: '先清掉中心周围的单位，再让步兵站上 (5,2)。'
    },
    {
      id: 'classic-7', no: 7, name: '死亡之触', en: 'TOUCH OF DEATH',
      brief: '步兵假装败退，把你引进雷区与装甲车的包围圈。全歼，且伤亡不超过 2。',
      objective: { label: '全歼且伤亡不超过 4', conditions: [C('eliminate'), C('casualties', { max: 4 })], failIf: [C('casualties', { max: 4 })] },
      enemy: { name: '霍克 · 诱饵', units: [
        { type: '装甲车', count: 2 }, { type: '地雷', count: 5 }, { type: '精锐步兵', count: 3 }
      ]},
      ai: { style: 'rush' },
      intro: [
        { who: 'erin', text: '敌军出现战损车……不，是步兵在假装败退。车里的人在发求救信号。' },
        { who: 'erin', text: '长官，这绝对是诱饵。可我们还得咬钩。' }
      ],
      win: [{ who: 'erin', text: '这根本不是打仗，这是在处决。联邦的高层都是疯狗。' }],
      lose: [{ who: 'erin', text: '伤亡太多了……长官，我们被诱饵拖垮了。' }],
      lines: [{ when: 'casualty', who: 'erin', text: '又倒下一个……长官，别追了！' }],
      tip: '别追残血步兵；先排雷，再动装甲车。'
    },
    {
      id: 'classic-8', no: 8, name: '炮火的洗礼', en: 'BAPTISM OF FIRE',
      brief: '精锐炮兵与双发炮兵藏在陷阱工事后面。斩首所有炮兵。',
      objective: { label: '击杀所有炮兵', conditions: [C('killType', { unitType: '炮兵' })] },
      enemy: { name: '霍克 · 炮群', units: [
        { type: '精锐炮兵', count: 3 }, { type: '双发炮兵', count: 2 },
        { type: '陷阱工事', count: 3 }, { type: '地雷', count: 3 }
      ]},
      ai: { style: 'artillery' },
      intro: [
        { who: 'erin', text: '敌方的精锐炮兵在后方疯狂轰炸。长官，我们需要用步兵吸引火力，侧面穿插去斩首！' },
        { who: 'hoke', text: '炸平他们。连泥巴一起翻过来。' }
      ],
      win: [{ who: 'erin', text: '长官，你刚才冲得太靠前了！我差点以为我要写阵亡报告了！' }],
      lose: [{ who: 'hoke', text: '在炮火里冲锋，勇气可嘉，结局可悲。' }],
      lines: [{ when: 'firstKillType', unitType: '炮兵', who: 'hoke', text: '我的炮！你们这些不讲武德的野蛮人！' }],
      tip: '陷阱工事被摧毁时会触发一次踩雷；先清雷，再靠近炮阵。'
    },
    {
      id: 'classic-9', no: 9, name: '绝望的增援', en: 'DESPERATE REINFORCEMENTS',
      brief: '联邦全军压上，每两回合补一辆装甲车。存活 10 回合。',
      objective: { label: '存活 10 回合', conditions: [C('survive', { turn: 10 })] },
      enemy: { name: '霍克 · 全军', units: [
        { type: '车', count: 3 }, { type: '精锐战车', count: 2 },
        { type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 3 }
      ]},
      ai: { style: 'rush', spawn: { every: 3, type: '装甲车', count: 1 } },
      intro: [
        { who: 'erin', text: '联邦倾巢出动了。长官，这一战，我们可能都会死在这里。' },
        { who: 'erin', text: '为了赤炎！长官，下辈子我还要做你的副官！' }
      ],
      win: [{ who: 'erin', text: '我们活下来了？我们真的活下来了！' }],
      lose: [{ who: 'erin', text: '增援……没有尽头。长官，我们先撤吧。' }],
      lines: [{ when: 'turn', turn: 5, who: 'erin', text: '又一辆装甲车！他们到底还有多少人！' }],
      tip: '不要和增援硬换；守住路口，拖到第 10 回合。'
    },
    {
      id: 'classic-10', no: 10, name: '泥沼之上', en: 'ABOVE THE MIRE',
      brief: '霍克上校启动自爆协议。击杀他，结束这场战役。',
      objective: { label: '击杀霍克上校', conditions: [C('boss')] },
      enemy: { name: '霍克 · 最终防线', boss: { type: '装甲车', name: '霍克上校' }, units: [
        { type: '装甲车', count: 3 }, { type: '精锐炮兵', count: 2 },
        { type: '精锐步兵', count: 3 }, { type: '防御工事', count: 3 }, { type: '地雷', count: 3 }
      ]},
      ai: { style: 'hold', bombard: { fromTurn: 1 } },
      intro: [
        { who: 'hoke', text: '我不服！赤炎的红虫子！我启动了自爆协议，这片泥沼就是你们的坟墓！' },
        { who: 'erin', text: '全图无差别轰炸！长官，必须在轰炸把我们埋掉前干掉他！' }
      ],
      win: [{ who: 'erin', text: '长官，我们赢了，这场战役结束了。可为什么这泥沼里，还是这么安静？' }],
      lose: [{ who: 'hoke', text: '联邦……万岁……' }],
      lines: [{ when: 'bossKill', who: 'hoke', text: '联邦……万岁……' }],
      tip: '霍克有两层护甲；每回合会有一轮随机轰炸，别让单位扎堆。'
    },
    {
      id: 'classic-11', no: 11, name: '重炮阵地', en: 'HEAVY BATTERY',
      brief: '一门重炮，三次十字轰击。二阶步兵会不断向炮位涌来。',
      minigame: { title: '重炮阵地', noArmory: true, blueCmd: 3, cannon: true, airdropEngineerTurn: 4, rule: '重炮需步兵装填；三次十字轰击；连续三回合开火会过热。', waves: { type: '二阶步兵', every: 1, count: 2, randomEdge: true, fanatic: true } },
      objective: { label: '击杀 5 个二阶步兵并存活 8 阵', conditions: [C('killCount', { unitType: '二阶步兵', count: 5 }), C('survive', { turn: 8 })] },
      player: { roles: [{ type: '精锐炮兵', role: 'cannon', x: 0, y: 2, buffs: ['coconut'] }], units: [{ type: '二阶步兵', count: 2, buffs: ['elite_infantry'], displayName: '二阶精锐步兵' }] },
      enemy: { name: '角斗场 · 兽群', units: [{ type: '二阶步兵', count: 1 }] },
      ai: { style: 'rush', focusRole: 'cannon' },
      intro: [
        { who: 'erin', text: '长官，重炮只有三次机会。炮弹打完，它就只是一门铁。' },
        { who: 'hoke', text: '二阶步兵会一直往上填。看看你们的炮能撑多久。' },
        { who: 'erin', text: '两个二阶精锐步兵护住炮位，十字炮火留给最密的一波。' },
        { who: 'erin', text: '只有没移动过的二阶步兵能装填；三发连续开火会让重炮过热。' }
      ],
      win: [{ who: 'erin', text: '炮还在，阵地也还在。' }],
      lose: [{ who: 'hoke', text: '炮哑了，阵地就归我了。' }],
      lines: [{ when: 'turn', turn: 4, who: 'erin', text: '又一批二阶步兵上来了！重炮准备！' }],
      tip: '重炮仅 3 发，十字五格；敌军每回合刷新并优先扑向重炮。'
    },
    {
      id: 'classic-12', no: 12, name: '添油战术', en: 'TRICKLE SUPPLY',
      brief: '没有部署，只有空投。30 费分三批落地，吃掉蓝方 15 费阵地。',
      minigame: { title: '添油战术', noArmory: true, conveyor: { total: 30, first: 10, interval: 3, amount: 10, pool: ['步兵', '车', '炮兵', '后勤兵', '地雷'] }, rule: '开局空投 10 费，第 4、7 阵再各空投 10 费。' },
      objective: { label: '全歼敌军', conditions: [C('eliminate')] },
      player: {},
      enemy: { name: '蓝方 · 前哨', units: [{ type: '步兵', count: 2 }, { type: '车', count: 1 }, { type: '炮兵', count: 1 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'erin', text: '长官，后方运输线被切断了。我们没法进行战前部署，军火库也打不开。' },
        { who: 'erin', text: '现在只能靠总部零星空投的物资来打这场仗了。' },
        { who: 'erin', text: '第一批物资马上落地！接下来的援军要过三阵才能到！' }
      ],
      win: [{ who: 'erin', text: '赢了……用这些东拼西凑的兵力居然打赢了。' }],
      lose: [{ who: 'hoke', text: '空投断了，阵地也没了。' }],
      lines: [{ when: 'turn', turn: 4, who: 'erin', text: '物资到了！希望里面有重火力……' }],
      tip: '没有部署；每波空投随机单位，省着用。'
    }
  ];

  const SNOW = [
    {
      id: 'snow-1', no: 1, name: '幽灵的獠牙', en: 'GHOST FANGS',
      brief: '白斗篷的精锐步兵藏在雪里。活过五个回合。',
      objective: { label: '存活 5 回合', conditions: [C('survive', { turn: 5 })] },
      enemy: { name: '冬妮娅 · 幽灵', units: [{ type: '精锐步兵', count: 4 }, { type: '车', count: 3 }] },
      ai: { style: 'rush' },
      intro: [{ who: 'leo', text: '冻死老子了，连口热酒都没有。长官，白斗篷的狙击手在前面。他们连个脚印都不留。' }],
      win: [{ who: 'leo', text: '全发霉的口粮……长官，他们是被流放来送死的。这雪，吃人啊。' }],
      lose: [{ who: 'dongniya', text: '雪会记住你们的脚印，也会埋掉它们。' }],
      lines: [{ when: 'firstKill', who: 'enemy', text: '你们……根本不懂。拿不到这片冻土，我们的家人就会被联邦处决……' }],
      tip: '雪原事件会改变地形；别把部队排成一条线。'
    },
    {
      id: 'snow-2', no: 2, name: '风雪连营', en: 'SNOW CAMPS',
      brief: '战车推线，炮兵覆盖。全歼他们。',
      objective: { label: '全歼敌人', conditions: [C('eliminate')] },
      enemy: { name: '冬妮娅 · 连营', units: [{ type: '精锐炮兵', count: 4 }, { type: '车', count: 4 }] },
      ai: { style: 'rush' },
      intro: [{ who: 'leo', text: '敌方战车过来了！我们跑不过履带。只能靠大暴雪卡住他们的视线！' }],
      win: [{ who: 'leo', text: '活下来了……暴风雪停了。那女人撤退了，她说“血已经冻得比冰还硬了”。' }],
      lose: [{ who: 'dongniya', text: '风雪会替我们收尸。' }],
      lines: [{ when: 'turn', turn: 3, who: 'leo', text: '暴风雪来了！长官，原地找个坑趴下，敢动一下你就变冰雕！' }],
      tip: '大雪会限制车辆；利用天气事件反打。'
    },
    {
      id: 'snow-3', no: 3, name: '极限救援', en: 'LAST RESCUE',
      brief: '报务员不能死。保护后勤兵，直到全歼敌人。',
      objective: { label: '保护后勤兵并全歼', conditions: [C('protect', { role: 'logi' }), C('eliminate')], failIf: [C('roleDead', { role: 'logi' })] },
      player: { roles: [{ type: '后勤兵', role: 'logi', x: 0, y: 2 }] },
      enemy: { name: '冬妮娅 · 猎杀', units: [
        { type: '精锐步兵', count: 5 }, { type: '精锐炮兵', count: 2 }, { type: '车', count: 2 }
      ]},
      ai: { style: 'rush', focusRole: 'logi' },
      intro: [{ who: 'leo', text: '长官，报务员快冻僵了。他不能死，不然我们连撤退的命令都收不到。' }],
      win: [{ who: 'leo', text: '他活下来了，还解开了敌方的一份密电。上面写着：“期待死亡，期待解脱”。' }],
      lose: [{ who: 'leo', text: '报务员没了……我们连回家的路都找不到了。' }],
      lines: [{ when: 'roleHit', role: 'logi', who: 'leo', text: '保护那个戴眼镜的！他死了我们全得迷路！' }],
      tip: '敌人会优先扑向后勤兵；用步兵和工事把他围住。'
    },
    {
      id: 'snow-4', no: 4, name: '雪原陷阱', en: 'SNOW TRAP',
      brief: '战车极速冲锋，地雷藏在凹陷处。全歼他们。',
      objective: { label: '全歼敌人', conditions: [C('eliminate')] },
      enemy: { name: '冬妮娅 · 陷阱', units: [{ type: '车', count: 6 }, { type: '地雷', count: 2 }] },
      ai: { style: 'rush' },
      intro: [{ who: 'leo', text: '前面有敌人的小股部队。不对劲，太安静了，这绝对是诱饵。' }],
      win: [{ who: 'leo', text: '踩碎了他们的包围圈。长官，在这里打仗，心比冰还冷。' }],
      lose: [{ who: 'leo', text: '诱饵咬钩了。长官，别管我，撤。' }],
      lines: [{ when: 'turn', turn: 2, who: 'leo', text: '果然是埋伏！别慌，车头调转，给我碾回去！' }],
      tip: '先让步兵探雷，再用车反冲。'
    },
    {
      id: 'snow-5', no: 5, name: '封路的代价', en: 'PRICE OF THE PASS',
      brief: '工事封死山口，炮兵洗地。拆除所有工事并全歼。',
      objective: { label: '拆除所有工事并全歼', conditions: [C('forts'), C('eliminate')] },
      enemy: { name: '冬妮娅 · 封路', units: [
        { type: '防御工事', count: 4 }, { type: '精锐炮兵', count: 2 },
        { type: '双发炮兵', count: 2 }, { type: '精锐步兵', count: 2 }
      ]},
      ai: { style: 'artillery' },
      intro: [{ who: 'leo', text: '长官，大雪把路封了，敌我双方各占一半。谁先动，谁就暴露在雪地视野里。' }],
      win: [{ who: 'leo', text: '积雪把半个山谷填平了。长官，敌人全被埋了，我们也差点。' }],
      lose: [{ who: 'dongniya', text: '山口是我们的。你们连工事都拆不完。' }],
      lines: [{ when: 'turn', turn: 4, who: 'leo', text: '雪崩！快跑！什么防守阵型，活着才是硬道理！' }],
      tip: '工事不参与胜负，但必须先拆掉，否则炮线永远打不开。'
    },
    {
      id: 'snow-6', no: 6, name: '雪地死地', en: 'DEAD GROUND',
      brief: '装甲车抗线，精锐战车包抄。全歼他们。',
      objective: { label: '全歼敌人', conditions: [C('eliminate')] },
      enemy: { name: '冬妮娅 · 死地', units: [
        { type: '装甲车', count: 3 }, { type: '精锐战车', count: 2 },
        { type: '精锐炮兵', count: 2 }, { type: '后勤兵', count: 2 }
      ]},
      ai: { style: 'rush' },
      intro: [{ who: 'leo', text: '装甲车顶在前面，精锐战车想从侧翼绕。长官，别让他们展开。' }],
      win: [{ who: 'leo', text: '我把他们的炮管拆了。回去能卖个好价钱。' }],
      lose: [{ who: 'dongniya', text: '雪地是我们的主场。' }],
      lines: [{ when: 'firstKillType', unitType: '车', who: 'leo', text: '干得漂亮！没了车，他们就像没牙的老虎！' }],
      tip: '先打后勤，再集火装甲车；别被侧翼车偷后排。'
    },
    {
      id: 'snow-7', no: 7, name: '燃烧的补给站', en: 'BURNING DEPOT',
      brief: '敌人舍弃防御，第 5 回合起自爆。10 回合内全歼。',
      objective: { label: '10 回合内全歼敌人', within: 10, conditions: [C('eliminate')] },
      enemy: { name: '冬妮娅 · 自爆队', units: [
        { type: '战损车', count: 4 }, { type: '装甲车', count: 2 }, { type: '精锐战车', count: 2 }
      ]},
      ai: { style: 'rush', selfDestruct: { fromTurn: 5 } },
      intro: [{ who: 'leo', text: '我们的补给点被他们盯上了。长官，退无可退，抢回控制权！' }],
      win: [{ who: 'leo', text: '撑住了。但如果再来一次，我不知道还能不能扛住。' }],
      lose: [{ who: 'leo', text: '补给站烧没了。长官，我们得撤了。' }],
      lines: [{ when: 'turn', turn: 5, who: 'leo', text: '他们要自爆！散开！别聚在一起！' }],
      tip: '第 5 回合起敌人会自爆；提前分散，优先点掉战损车。'
    },
    {
      id: 'snow-8', no: 8, name: '白狼的咆哮', en: 'WHITE WOLF',
      brief: '冬妮娅坐镇后方，装甲车阵线强推。击杀她。',
      objective: { label: '击杀冬妮娅', conditions: [C('boss')] },
      enemy: { name: '冬妮娅 · 白狼卫队', boss: { type: '装甲车', name: '冬妮娅' }, units: [
        { type: '装甲车', count: 3 }, { type: '精锐步兵', count: 2 }, { type: '精锐炮兵', count: 2 }
      ]},
      ai: { style: 'hold' },
      intro: [{ who: 'dongniya', text: '赤炎的杂碎。我是白狼卫队的冬妮娅。我的剑，不斩无名之辈。' }],
      win: [{ who: 'leo', text: '她撤退了。长官，她的手被冻伤了，但这女人连眉头都没皱一下。' }],
      lose: [{ who: 'dongniya', text: '你们连我的卫队都穿不过去。' }],
      lines: [{ when: 'bossHit', who: 'dongniya', text: '不错……疼痛，证明我还活着。' }],
      tip: '冬妮娅有两层护甲；先清炮兵，再围杀。'
    },
    {
      id: 'snow-9', no: 9, name: '绝境长城', en: 'LAST WALL',
      brief: '每回合都有增援。守住 8 回合。',
      objective: { label: '守住 8 回合', conditions: [C('survive', { turn: 8 })] },
      enemy: { name: '冬妮娅 · 尸潮', units: [
        { type: '精锐战车', count: 4 }, { type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 2 }
      ]},
      ai: { style: 'rush', spawn: { every: 2, type: '精锐步兵', count: 1 } },
      intro: [{ who: 'leo', text: '长官，我们没有援军。但我们必须守住。' }],
      win: [{ who: 'leo', text: '阵地还在我们手里。长官，我敬你是条汉子。' }],
      lose: [{ who: 'leo', text: '守不住了……长官，下辈子还做你的兵。' }],
      lines: [{ when: 'turn', turn: 5, who: 'leo', text: '弹药打光了！用工事卡位！哪怕用牙咬，也要把他们留下来！' }],
      tip: '不要追击；把工事和步兵放在路口，耗到第 8 回合。'
    },
    {
      id: 'snow-10', no: 10, name: '初阳下的血', en: 'BLOOD UNDER DAWN',
      brief: '初阳触发，全军冲锋。击杀冬妮娅。',
      objective: { label: '击杀冬妮娅', conditions: [C('boss')] },
      enemy: { name: '冬妮娅 · 终局', boss: { type: '装甲车', name: '冬妮娅' }, units: [
        { type: '装甲车', count: 2 }, { type: '精锐战车', count: 2 }, { type: '精锐炮兵', count: 2 }
      ]},
      ai: { style: 'rush' },
      intro: [{ who: 'dongniya', text: '最后的一战。赤炎的红，白雪的白，谁会留下痕迹？' }],
      win: [{ who: 'leo', text: '长官，她倒下的时候，嘴角居然是笑着的。把雪盖回去。不管立场，冻死在雪原里的人，都是英雄。' }],
      lose: [{ who: 'dongniya', text: '雪原留下了我的颜色。' }],
      lines: [{ when: 'bossKill', who: 'dongniya', text: '终于……解脱了……好暖和……' }],
      tip: '冬妮娅身边有两层护卫；用炮兵破甲，再让车收尾。'
    },
    {
      id: 'snow-11', no: 11, name: '雪橇飞跃', en: 'SLED RUN',
      brief: '雪橇会自己向前滑。清掉挡路的人，让它冲到尽头。',
      minigame: { title: '雪橇飞跃', noArmory: true, noSnowEvents: true, rule: '雪橇每个回合自动前进一格；清掉挡路的敌人。', autoEscort: { role: 'runner', toX: 10 } },
      objective: { label: '护送雪橇抵达冰路尽头', conditions: [C('escort', { role: 'runner', x: 10, y: 2 })], failIf: [C('roleDead', { role: 'runner' }), C('sledDamaged'), C('sledPushed')] },
      player: { resources: 8, roles: [{ type: '精锐战车', role: 'runner', x: 0, y: 2, displayName: '雪橇', displayIcon: '🛷' }], units: [{ type: '二阶步兵', count: 2 }] },
      enemy: { name: '冰路 · 拦截', units: [{ type: '精锐战车', count: 2 }, { type: '精锐步兵', count: 2 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'leo', text: '长官，雪橇停不下来。它每一阵都会往前滑。' },
        { who: 'dongniya', text: '前面全是白狼的人。滑过去，就是送死。' },
        { who: 'leo', text: '那就把挡路的先清掉。' },
        { who: 'leo', text: '雪橇撞到步兵不会停，试试直接撞过去；相邻二阶步兵会替它挡伤害。' }
      ],
      win: [{ who: 'leo', text: '雪橇到尽头了！冰还没裂。' }],
      lose: [{ who: 'dongniya', text: '雪橇翻了。雪原会把它埋掉。' }],
      lines: [{ when: 'turn', turn: 4, who: 'leo', text: '雪橇又往前滑了！前面有人！' }],
      tip: '雪橇会自动前进；挡路时停下，清掉前方敌人它才会继续滑。'
    },
    {
      id: 'snow-12', no: 12, name: '极地补给线', en: 'POLAR SUPPLY',
      brief: '35 费空投，暴风雪会让运输机多扔一批。撑过 8 阵。',
      minigame: { title: '极地补给线', noArmory: true, conveyor: { total: 35, first: 10, interval: 2, amount: 5, stormBonus: 10, pool: ['步兵', '车', '炮兵', '后勤兵'] }, rule: '每 2 阵空投 5 费；暴风雪时本波 10 费。' },
      objective: { label: '存活 8 阵', conditions: [C('survive', { turn: 8 })] },
      player: {},
      enemy: { name: '白狼 · 补给线', units: [{ type: '精锐战车', count: 2 }], spawn: { every: 3, type: '精锐步兵', count: 1 } },
      ai: { style: 'rush' },
      intro: [
        { who: 'leo', text: '长官，这鬼天气把运输机全拦在外面了！我们只能靠几架不要命的运输机往下扔东西。' },
        { who: 'leo', text: '第一批物资来了。暴风雪要是刮起来，他们扔得更准。' },
        { who: 'leo', text: '要是没风，咱就只能干瞪眼！' }
      ],
      win: [{ who: 'leo', text: '雪停了。长官，如果不是那几波暴风雪里的空投，咱们全得冻死在这儿。' }],
      lose: [{ who: 'dongniya', text: '补给线断了。雪原收下你们。' }],
      lines: [{ when: 'turn', turn: 4, who: 'leo', text: '大暴雪来了！运输机趁机扔下了一批好货！' }],
      tip: '暴风雪时下一波空投额度翻倍；蓝方每 3 阵刷步兵。'
    }
  ];

  const PIRATE = [
    {
      id: 'pirate-1', no: 1, name: '水鬼的围剿', en: 'WATER GHOSTS',
      brief: '海炮封住湾口。登上快艇，占领 (5,1) 与 (5,3)。',
      objective: { label: '占领两个据点 (5,1)/(5,3)', conditions: [C('capture', { tiles: [[5, 1], [5, 3]] })] },
      enemy: { name: '巴博萨 · 湾口', units: [
        { type: '精锐海炮', count: 3 }, { type: '精锐步兵', count: 3, boarded: true }, { type: '防御工事', count: 2 }
      ]},
      ai: { style: 'rush' },
      intro: [
        { who: 'kidd', text: '头儿，巴博萨把湾口封了！海炮全架着！冲过去骨头都给你扬了！' },
        { who: 'kidd', text: '不过……快艇还能动。从小路摸过去，端掉他们的据点！' }
      ],
      win: [{ who: 'kidd', text: '抢到了！里面有一箱朗姆酒！……呃，头儿，水底下是不是有东西游过去了？' }],
      lose: [{ who: 'kidd', text: '据点没拿下来，船先沉了。头儿，游吧。' }],
      lines: [{ when: 'captureOne', who: 'kidd', text: '一个据点到手！还差一个！' }],
      tip: '两个据点同时站人；海炮只打同行最近目标，别把船排成一条线。'
    },
    {
      id: 'pirate-2', no: 2, name: '死亡旋涡', en: 'DEATH VORTEX',
      brief: '海炮覆盖所有通路，战车快艇巡逻。全歼他们。',
      objective: { label: '全歼敌人', conditions: [C('eliminate')] },
      enemy: { name: '巴博萨 · 旋涡', units: [
        { type: '精锐海炮', count: 4 }, { type: '车', count: 2, boarded: true }, { type: '步兵', count: 3 }
      ]},
      ai: { style: 'artillery' },
      intro: [
        { who: 'babosa', text: '哈哈哈！在海上，我就是规则。沉下去喂鱼吧！' },
        { who: 'kidd', text: '海里有漩涡！别撞进去，撞进去连渣都不剩！' }
      ],
      win: [{ who: 'kidd', text: '船全碎了。头儿，我们现在只能在海面上飘着了。但我有个坏消息——' }],
      lose: [{ who: 'babosa', text: '漩涡会替我把你们洗干净。' }],
      lines: [{ when: 'turn', turn: 3, who: 'kidd', text: '趴下！那是海炮齐射！千万别掉水里！' }],
      tip: '漩涡格不可进入；先抢上风位，再登船。'
    },
    {
      id: 'pirate-3', no: 3, name: '走私者的末路', en: 'SMUGGLER’S END',
      brief: '陆地与海面组成交叉火力。全歼他们。',
      objective: { label: '全歼敌人', conditions: [C('eliminate')] },
      enemy: { name: '巴博萨 · 火网', units: [{ type: '精锐海炮', count: 4 }, { type: '精锐炮兵', count: 4 }] },
      ai: { style: 'artillery' },
      intro: [{ who: 'kidd', text: '这批货值十条船！头儿，带好金币，我们从快艇上顺过去。' }],
      win: [{ who: 'kidd', text: '箱子保住了！少了一枚金币，我是不是掉海里了……' }],
      lose: [{ who: 'kidd', text: '货沉了，钱也没了。头儿，这趟亏大了。' }],
      lines: [{ when: 'turn', turn: 2, who: 'kidd', text: '他们撞过来了！准备跳帮！' }],
      tip: '海炮与炮兵交叉覆盖；先用快艇贴脸，再让步兵上岸。'
    },
    {
      id: 'pirate-4', no: 4, name: '搁浅的巨兽', en: 'BEACHED BEAST',
      brief: '快艇全被打搁浅。击杀所有海炮。',
      objective: { label: '击杀所有海炮', conditions: [C('killType', { unitType: '海炮' })] },
      enemy: { name: '巴博萨 · 滩头', units: [
        { type: '地雷', count: 6 }, { type: '精锐步兵', count: 4 }, { type: '精锐海炮', count: 3 }
      ]},
      ai: { style: 'hold' },
      intro: [{ who: 'kidd', text: '完了，快艇全被他们打搁浅了。我们只能从浅滩走过去，用海炮还击！' }],
      win: [{ who: 'kidd', text: '打沉了三艘。长官，我越来越像个正规军了，这可真恶心。' }],
      lose: [{ who: 'babosa', text: '滩头是我的地盘。' }],
      lines: [{ when: 'firstKillType', unitType: '海炮', who: 'kidd', text: '开炮！让这群旱鸭子尝尝水柱的威力！' }],
      tip: '海炮只打同行；从上下两行绕开炮线，再拆炮。'
    },
    {
      id: 'pirate-5', no: 5, name: '火药味', en: 'GUNPOWDER',
      brief: '甲板全是雷，排雷兵在对面。全歼他们。',
      objective: { label: '全歼敌人', conditions: [C('eliminate')] },
      enemy: { name: '巴博萨 · 雷甲板', units: [
        { type: '排雷兵', count: 4 }, { type: '防御工事', count: 4 },
        { type: '地雷', count: 6 }, { type: '精锐海炮', count: 3 }
      ]},
      ai: { style: 'hold' },
      intro: [{ who: 'kidd', text: '头儿，甲板上全是雷！这帮海盗真黑，连自己人都不放过。' }],
      win: [{ who: 'kidd', text: '排完了。前面就是巴博萨的旗舰，我们得小心。' }],
      lose: [{ who: 'kidd', text: '雷没排完，船先炸了。头儿，跳海吧。' }],
      lines: [{ when: 'mine', who: 'kidd', text: '轰！我的腿！……哦，是假腿，吓死我了。' }],
      tip: '敌方排雷兵会拆你的雷；先杀排雷兵，再推进。'
    },
    {
      id: 'pirate-6', no: 6, name: '背叛者的酒馆', en: 'TRAITORS’ TAVERN',
      brief: '战车步兵正面强攻，后勤兵无限回复。击杀所有精锐步兵。',
      objective: { label: '击杀所有精锐步兵', conditions: [C('killBuff', { buff: 'elite_infantry' })] },
      enemy: { name: '巴博萨 · 叛徒', units: [
        { type: '精锐战车', count: 3 }, { type: '精锐步兵', count: 4 },
        { type: '后勤兵', count: 4 }, { type: '精锐海炮', count: 2 }
      ]},
      ai: { style: 'rush' },
      intro: [{ who: 'kidd', text: '酒馆里全是叛徒。长官，杀掉他们的头目，剩下的人就会鸟兽散。' }],
      win: [{ who: 'kidd', text: '酒馆归我们了。这酒……有点血腥味。' }],
      lose: [{ who: 'kidd', text: '叛徒比我们想象的多。头儿，撤吧。' }],
      lines: [{ when: 'firstKill', who: 'enemy', text: '你……不得好死……' }],
      tip: '后勤兵会不停解混乱；先杀后勤，再点精锐步兵。'
    },
    {
      id: 'pirate-7', no: 7, name: '夺船之战', en: 'TAKE THE SHIP',
      brief: '敌人全体抢滩。阻止任何敌人登岸，并全歼。',
      objective: { label: '阻止敌人登岸并全歼', conditions: [C('noLanding'), C('eliminate')], failIf: [C('landed')] },
      enemy: { name: '巴博萨 · 跳帮', units: [{ type: '步兵', count: 6, boarded: true }, { type: '精锐海炮', count: 2 }] },
      ai: { style: 'rush' },
      intro: [{ who: 'kidd', text: '巴博萨把他的手下派出来了。今天我们就在水上决一死战，撞沉他们！' }],
      win: [{ who: 'kidd', text: '沉了。全沉了。长官，水里全是木屑和……别看了。' }],
      lose: [{ who: 'kidd', text: '他们上岸了。头儿，甲板守不住了。' }],
      lines: [{ when: 'landed', who: 'kidd', text: '他们上岸了！拦住他们！' }],
      tip: '在海水里撞沉他们；一旦有敌人踩上红方甲板就判失败。'
    },
    {
      id: 'pirate-8', no: 8, name: '无风带', en: 'DOLDRUMS',
      brief: '纯远程火力，无风减速。10 回合内全歼。',
      objective: { label: '10 回合内全歼', within: 10, conditions: [C('eliminate')] },
      enemy: { name: '巴博萨 · 火线', units: [
        { type: '精锐海炮', count: 4 }, { type: '精锐炮兵', count: 4 }, { type: '双发炮兵', count: 2 }
      ]},
      ai: { style: 'artillery' },
      intro: [{ who: 'kidd', text: '头儿，没风了。我们的快艇动不了，只能靠海炮平射掩护步兵强行登船。' }],
      win: [{ who: 'kidd', text: '打赢了。这海面静得像镜子，但我总觉得下面有东西在看着我们。' }],
      lose: [{ who: 'kidd', text: '没风，没退路，没活路。' }],
      lines: [{ when: 'turn', turn: 5, who: 'kidd', text: '瞄准！三、二、一！开火！' }],
      tip: '无风让快艇几乎动不了；用海炮对射，步兵走甲板。'
    },
    {
      id: 'pirate-9', no: 9, name: '海怪之胃', en: 'SEA MONSTER’S STOMACH',
      brief: '第 9 回合海怪将至。9 回合内击杀巴博萨。',
      objective: { label: '9 回合内击杀巴博萨', within: 9, conditions: [C('boss')] },
      enemy: { name: '巴博萨 · 海怪', boss: { type: '装甲车', name: '巴博萨' }, units: [
        { type: '海炮', count: 4 }, { type: '精锐步兵', count: 3 }, { type: '战损车', count: 2 }
      ]},
      ai: { style: 'rush' },
      intro: [{ who: 'kidd', text: '头儿，海面越来越黑了。水手们说看到海怪了。我们得赶在海怪吃掉我们之前干掉巴博萨！' }],
      win: [{ who: 'kidd', text: '活下来了……海面平静了。那头怪物……吃了一嘴就沉下去了。' }],
      lose: [{ who: 'babosa', text: '海怪会替我收尾。' }],
      lines: [{ when: 'turn', turn: 8, who: 'kidd', text: '快点！它在撞我们的船底了！' }],
      tip: '战损车在水面疯狂撞击；用海炮清路，直取巴博萨。'
    },
    {
      id: 'pirate-10', no: 10, name: '最后的宝藏', en: 'FINAL TREASURE',
      brief: '巴博萨把海怪引来了。击杀他，夺取据点。',
      objective: { label: '击杀巴博萨并夺取据点', conditions: [C('boss'), C('capture', { tiles: [[5, 1], [5, 3]] })] },
      enemy: { name: '巴博萨 · 宝藏', boss: { type: '装甲车', name: '巴博萨' }, units: [
        { type: '精锐海炮', count: 4 }, { type: '精锐步兵', count: 3 }, { type: '地雷', count: 4 }
      ]},
      ai: { style: 'hold' },
      intro: [
        { who: 'babosa', text: '你们以为赢了？海怪已经醒了！这就是我的复仇！' },
        { who: 'kidd', text: '头儿，巴博萨疯了！他在把海怪引过来！必须赶在海怪靠岸前干掉他！' }
      ],
      win: [{ who: 'kidd', text: '巴博萨被拖下去了。头儿，金币……金币在哪里？……不，头儿，我想上岸了。这海，太腥了。' }],
      lose: [{ who: 'kidd', text: '完了，海怪来了，据点被掀翻了！快跑！' }],
      lines: [{ when: 'turn', turn: 10, who: 'kidd', text: '完了，海怪来了，据点被掀翻了！快跑！' }],
      tip: '第 10 回合海怪会清空据点；先杀巴博萨，再站上两个据点。'
    },
    {
      id: 'pirate-11', no: 11, name: '怒海狂飙', en: 'RAGING SEA',
      brief: '中间三列全是海水。海炮只能沿左侧轨道上下，别让快艇靠岸。',
      minigame: { title: '怒海狂飙', noArmory: true, naval: true, waves: { type: '步兵', boarded: true, every: 1, count: 1, spawnX: 6 }, rule: '中间三列全是海水；海炮只能纵向移动；8 阵内阻止登陆。' },
      objective: { label: '8 阵内阻止任何蓝方单位登陆', within: 8, conditions: [C('noLanding'), C('survive', { turn: 8 })] },
      player: { units: [{ type: '海炮', count: 1, x: 0, y: 2 }, { type: '精锐步兵', count: 1, x: 3, y: 1 }, { type: '精锐步兵', count: 1, x: 3, y: 3 }] },
      enemy: { name: '蓝方 · 快艇', units: [] },
      ai: { style: 'rush' },
      intro: [
        { who: 'kidd', text: '没时间了！敌方的快艇全下水了。' },
        { who: 'kidd', text: '我们只能搬出老祖宗的大炮，看准他们从哪冲过来。' },
        { who: 'kidd', text: '守住甲板，千万别让他们上岸！' }
      ],
      win: [{ who: 'kidd', text: '海面清了！头儿，他们一艘都没靠岸。' }],
      lose: [{ who: 'barbosa', text: '甲板丢了。你们的炮，太慢了。' }],
      lines: [{ when: 'turn', turn: 3, who: 'kidd', text: '左侧，快艇！调转海炮！别让他们靠岸！' }],
      tip: '海炮只能在列 0 上下移动；蓝方快艇从列 6 冲出。'
    },
    {
      id: 'pirate-12', no: 12, name: '风暴中的走私船', en: 'SMUGGLER STORM',
      brief: '第一批有船有炮，后面只有步兵和海炮。抢下两个据点并守住。',
      minigame: { title: '风暴中的走私船', noArmory: true, conveyor: { total: 32, first: 12, interval: 1, amount: 5, pool: ['步兵'], afterFirstPool: ['海炮', '海炮', '步兵'], holdTiles: [[5, 1], [5, 3]] }, rule: '首波 12 费；之后每阵 5 费，只空投步兵/海炮。' },
      objective: { label: '占领两个据点并累计守住 3 阵', within: 20, conditions: [C('captureHold', { tiles: [[5, 1], [5, 3]], turns: 3 })] },
      player: {},
      enemy: { name: '蓝方 · 舰队', units: [{ type: '精锐步兵', count: 2, boarded: true }, { type: '精锐海炮', count: 2 }], spawn: { every: 1, type: '步兵', boarded: true } },
      ai: { style: 'rush' },
      intro: [
        { who: 'kidd', text: '头儿，这片海域全是敌方的舰队。我们的大船进不来，只能用走私船偷偷空投。' },
        { who: 'kidd', text: '第一批有船有炮。不过后面补给的尽是些旱鸭子和海炮！' },
        { who: 'kidd', text: '先抢据点，再想办法守住。' }
      ],
      win: [{ who: 'kidd', text: '抢下据点了！用纯步兵和海炮打退他们，我可真是个人才！' }],
      lose: [{ who: 'barbosa', text: '据点丢了。走私船也沉了。' }],
      lines: [{ when: 'turn', turn: 3, who: 'kidd', text: '右边！快艇！只有两门海炮在，别让他们靠岸！' }],
      tip: '首波全兵种，之后只给步兵和海炮；抢两个据点。'
    }
  ];

  const FOG = [
    {
      id: 'fog-1', no: 1, name: '迷雾初现', en: 'FIRST MIST',
      brief: '九座墓碑，鬼魂在雾里。存活 5 回合。',
      objective: { label: '存活 5 回合', conditions: [C('survive', { turn: 5 })] },
      enemy: { name: '亡灵 · 雾线', units: [{ type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 1 }] },
      ai: { style: 'rush', spawnGhost: { every: 1, count: 2 } },
      intro: [{ who: 'sesis', text: '长官，我的罗盘在疯狂旋转……这根本不是什么打仗的地方！那些蓝方士兵，他们连呼吸声都没有！' }],
      win: [{ who: 'sesis', text: '雾变浓了。我感觉有什么东西在脊背上爬。不要回头，长官，千万不要回头。' }],
      lose: [{ who: 'sesis', text: '雾把我们都吞了……长官，你还在吗？' }],
      lines: [{ when: 'firstKill', who: 'sesis', text: '等一下！他倒下的时候没有流血……长官，他变成雾了！这里根本没有活人！' }],
      tip: '鬼魂没有碰撞体积；被撞时按撞鬼表判定。'
    },
    {
      id: 'fog-2', no: 2, name: '墓地里的狂潮', en: 'GRAVE TIDE',
      brief: '墓碑在数数。累积 3 点凝魂。',
      objective: { label: '累积 3 点凝魂', conditions: [C('souls', { count: 3 })] },
      enemy: { name: '亡灵 · 墓群', units: [{ type: '精锐步兵', count: 4 }, { type: '精锐炮兵', count: 4 }] },
      ai: { style: 'artillery' },
      intro: [{ who: 'sesis', text: '墓碑……九座墓碑！这里的怨气已经凝结。长官，去触碰那些“鬼魂”，那是灵魂的碎片。' }],
      win: [{ who: 'sesis', text: '灯亮了。雾散了一点。可是长官，你看，墓碑后面站着一个穿着和我们一样军装的人。' }],
      lose: [{ who: 'sesis', text: '魂火不够，灯点不亮。我们出不去了。' }],
      lines: [{ when: 'souls', count: 3, who: 'sesis', text: '收集到了！长官，点燃这盏灯！光会救赎它们！' }],
      tip: '消灭鬼魂获得凝魂；3 点自动兑换「执灯」卡。'
    },
    {
      id: 'fog-3', no: 3, name: '第一盏灯的绝境', en: 'FIRST LANTERN',
      brief: '所有火力扑向执灯士。保护他，并全歼。',
      objective: { label: '保护执灯士并全歼', conditions: [C('protect', { role: 'lantern' }), C('eliminate')], failIf: [C('roleDead', { role: 'lantern' })] },
      player: { roles: [{ type: '步兵', role: 'lantern', buffs: ['lantern_bearer'], x: 0, y: 2 }] },
      enemy: { name: '亡灵 · 猎灯', units: [
        { type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 2 },
        { type: '双发炮兵', count: 2 }, { type: '地雷', count: 3 }
      ]},
      ai: { style: 'rush', focusRole: 'lantern' },
      intro: [{ who: 'sesis', text: '长官，执灯士在雾里会遭到鬼魂的疯狂攻击。我们必须用人墙保护他。' }],
      win: [{ who: 'sesis', text: '撑过了这一夜。长官，那个提灯的人，他刚才对我笑了一下，然后变成了灰。' }],
      lose: [{ who: 'sesis', text: '不！灯要灭了！如果我们失去了光，就永远出不去了！' }],
      lines: [{ when: 'roleHit', role: 'lantern', who: 'sesis', text: '不！灯要灭了！如果我们失去了光，就永远出不去了！' }],
      tip: '执灯士撞鬼不判定、鬼魂直接消灭；把他围在中间。'
    },
    {
      id: 'fog-4', no: 4, name: '涨潮的墓地', en: 'GRAVE TIDE RISING',
      brief: '第 5 回合转初晖前，摧毁至少 5 座墓碑。',
      objective: { label: '第 5 回合前摧毁 5 座墓碑', within: 5, conditions: [C('graves', { count: 5 })] },
      enemy: { name: '亡灵 · 墓守', units: [
        { type: '精锐步兵', count: 5 }, { type: '精锐炮兵', count: 3 }, { type: '防御工事', count: 3 }
      ]},
      ai: { style: 'artillery' },
      intro: [{ who: 'sesis', text: '雾夜即将转为初晖。在这之前，必须摧毁所有的墓碑，否则它们会无限滋生！' }],
      win: [{ who: 'sesis', text: '阳光真刺眼。可是长官，为什么阳光没有温度？' }],
      lose: [{ who: 'sesis', text: '墓碑太多了……天亮了，可我们还在雾里。' }],
      lines: [{ when: 'turn', turn: 2, who: 'sesis', text: '天亮了！初晖！长官，鬼魂显形了，趁现在干掉它们！' }],
      tip: '墓碑可以被步兵/车/炮兵攻击；优先拆墓，别追鬼魂。'
    },
    {
      id: 'fog-5', no: 5, name: '无声的围剿', en: 'SILENT SIEGE',
      brief: '让 5 个敌人踩中鬼魂。',
      objective: { label: '让 5 个敌人踩中鬼魂', conditions: [C('bait', { count: 5 })] },
      enemy: { name: '亡灵 · 诱饵', units: [
        { type: '精锐步兵', count: 3 }, { type: '地雷', count: 6 }, { type: '精锐炮兵', count: 3 }
      ]},
      ai: { style: 'rush' },
      intro: [{ who: 'sesis', text: '别踩那些发亮的地方！有些地方看似是空地，其实藏着鬼魂！' }],
      win: [{ who: 'sesis', text: '太险了。长官，我的心脏快跳出来了。' }],
      lose: [{ who: 'sesis', text: '它们不上钩……长官，我们被反包围了。' }],
      lines: [{ when: 'bait', count: 1, who: 'sesis', text: '长官！小心，你的脚下！' }],
      tip: '把敌人引到鬼魂格；鬼魂格在移动高亮里显示为空地。'
    },
    {
      id: 'fog-6', no: 6, name: '执灯者的死局', en: 'LANTERN DEADLOCK',
      brief: '全部火力锁定执灯士。保护他，并全歼。',
      objective: { label: '保护执灯士并全歼', conditions: [C('protect', { role: 'lantern' }), C('eliminate')], failIf: [C('roleDead', { role: 'lantern' })] },
      player: { roles: [{ type: '步兵', role: 'lantern', buffs: ['lantern_bearer'], x: 0, y: 2 }] },
      enemy: { name: '亡灵 · 死局', units: [
        { type: '精锐炮兵', count: 3 }, { type: '双发炮兵', count: 3 }, { type: '精锐步兵', count: 3 }
      ]},
      ai: { style: 'rush', focusRole: 'lantern' },
      intro: [{ who: 'sesis', text: '执灯士能秒杀鬼魂，但他自己也会成为活靶子。护住他，长官。' }],
      win: [{ who: 'sesis', text: '我们越来越深入了。长官，你觉得……我们还活着吗？' }],
      lose: [{ who: 'sesis', text: '灯灭了。我们再也找不到回去的路了。' }],
      lines: [{ when: 'roleHit', role: 'lantern', who: 'sesis', text: '灯要灭了！保护他！' }],
      tip: '敌方炮兵会优先锁执灯士；用烟雾弹/工事挡炮线。'
    },
    {
      id: 'fog-7', no: 7, name: '现实扭曲的深渊', en: 'DISTORTED REALITY',
      brief: '战车抗线，炮兵在雾中输出。全歼他们。',
      objective: { label: '全歼敌人', conditions: [C('eliminate')] },
      enemy: { name: '亡灵 · 扭曲', units: [
        { type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 3 }, { type: '精锐战车', count: 3 }
      ]},
      ai: { style: 'rush' },
      intro: [{ who: 'sesis', text: '雾夜固化在了中央区。进去的单位会产生幻觉。长官，进去就是送死！' }],
      win: [{ who: 'sesis', text: '我们出来了。长官，我刚才看到了我死去的母亲……' }],
      lose: [{ who: 'sesis', text: '我们没走出来。长官，你看到那盏灯了吗？' }],
      lines: [{ when: 'turn', turn: 3, who: 'sesis', text: '看不到了！长官，我只能看到红方和蓝方的文字在闪烁！敌人在哪里？！' }],
      tip: '混乱会叠加；带后勤兵或净化卡，别让单位在雾里停留。'
    },
    {
      id: 'fog-8', no: 8, name: '第12声钟响', en: 'THE TWELFTH BELL',
      brief: '第 12 回合墓碑补满。在那之前全歼人类敌军。',
      objective: { label: '12 回合前全歼敌人', within: 11, conditions: [C('eliminate')] },
      enemy: { name: '亡灵 · 钟声', units: [{ type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 5 }] },
      ai: { style: 'artillery' },
      intro: [{ who: 'sesis', text: '长官，钟声快敲到第十二下了！雾会封锁这里，墓碑会补满全场！' }],
      win: [{ who: 'sesis', text: '活下来了。长官，这地上的墓碑……我怎么感觉它们长了脚？' }],
      lose: [{ who: 'sesis', text: '来不及了！鬼魂太多了！杀出一条血路！' }],
      lines: [{ when: 'turn', turn: 10, who: 'sesis', text: '钟声响了！只剩最后两下！' }],
      tip: '在第 12 回合前解决战斗；拖延只会让墓碑越来越多。'
    },
    {
      id: 'fog-9', no: 9, name: '旧日的残影', en: 'OLD SHADOW',
      brief: '旧日将军还在指挥死去的士兵。杀了他，送他安息。',
      objective: { label: '击杀旧日将军', conditions: [C('boss')] },
      enemy: { name: '旧日将军 · 残影', boss: { type: '装甲车', name: '旧日将军' }, units: [
        { type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 3 },
        { type: '双发炮兵', count: 3 }, { type: '后勤兵', count: 2 }
      ]},
      ai: { style: 'hold' },
      intro: [{ who: 'sesis', text: '那是旧时代的将军。他还在指挥着死去的士兵。杀了他，送他安息。' }],
      win: [{ who: 'sesis', text: '他倒下了。长官，整个墓地的墓碑都在颤抖。' }],
      lose: [{ who: 'general', text: '我的……阵地……' }],
      lines: [{ when: 'bossKill', who: 'general', text: '我的……阵地……' }],
      tip: '将军有两层护甲；先清后勤，再围杀。'
    },
    {
      id: 'fog-10', no: 10, name: '初晖渐明', en: 'DAWN BREAKS',
      brief: '击杀旧日将军，并活到第 10 回合。',
      objective: { label: '击杀旧日将军并存活 10 回合', conditions: [C('boss'), C('survive', { turn: 10 })] },
      enemy: { name: '旧日将军 · 终局', boss: { type: '装甲车', name: '旧日将军' }, units: [
        { type: '精锐炮兵', count: 3 }, { type: '精锐步兵', count: 3 },
        { type: '双发炮兵', count: 3 }, { type: '后勤兵', count: 3 }
      ]},
      ai: { style: 'rush' },
      intro: [{ who: 'sesis', text: '天要亮了。这是最后一次雾夜，长官。用所有的执灯卡，冲出去！' }],
      win: [{ who: 'sesis', text: '天亮了。雾散了。长官，你看，地上全是普通的木桩。这村子早就空了，只有我们在陪鬼魂玩。' }],
      lose: [{ who: 'general', text: '天亮之前，你们都是我的客人。' }],
      lines: [{ when: 'turn', turn: 8, who: 'sesis', text: '光！是真正的光！长官，我看到出口了！' }],
      tip: '初晖后鬼魂显形；先杀将军，再撑到第 10 回合。'
    },
    {
      id: 'fog-11', no: 11, name: '迷雾灯塔', en: 'MIST LIGHTHOUSE',
      brief: '只有执灯士能照亮隐藏的路。跟着灯走，别踩错。',
      minigame: { title: '迷雾灯塔', noArmory: true, hiddenPath: true, route: [[3,2],[4,2],[4,1],[5,1],[6,1],[6,2],[7,2],[8,2],[9,2]], rule: '执灯士照亮十字范围的隐藏路线；走错会撞鬼。' },
      objective: { label: '护送执灯士抵达雾中终点', conditions: [C('escort', { role: 'lantern', x: 9, y: 2 })], failIf: [C('roleDead', { role: 'lantern' })] },
      player: { roles: [{ type: '二阶步兵', role: 'lantern', x: 3, y: 2, buffs: ['lantern_bearer'] }], units: [{ type: '后勤兵', count: 2 }, { type: '精锐步兵', count: 1 }] },
      enemy: { name: '雾中 · 来客', units: [{ type: '精锐步兵', count: 2 }] },
      ghosts: { count: 9 },
      ai: { style: 'rush', focusRole: 'lantern' },
      intro: [
        { who: 'sesis', text: '长官，这里的雾太重了，普通的火光根本照不亮路。' },
        { who: 'sesis', text: '只有执灯士手里的灯，能驱散幻象。让执灯士走在前面。' },
        { who: 'sesis', text: '千万别踩错，不然大家都会死在雾里。' }
      ],
      win: [{ who: 'sesis', text: '看到终点了！长官，跟着灯走出来了。' }],
      lose: [{ who: 'general', text: '灯灭了。雾把你们留下了。' }],
      lines: [{ when: 'turn', turn: 4, who: 'sesis', text: '看到路了！长官，跟着灯走！' }],
      tip: '执灯士走到哪里，十字范围的正确路线才会显现。'
    },
    {
      id: 'fog-12', no: 12, name: '无人村的来客', en: 'VISITORS OF THE EMPTY VILLAGE',
      brief: '25 费空投，每一波至少一个执灯士。凝魂 5 点，别死绝。',
      minigame: { title: '无人村的来客', noArmory: true, conveyor: { total: 25, first: 10, interval: 3, amount: 5, lanternEveryWave: true, pool: ['步兵', '后勤兵', '二阶步兵'] }, rule: '每波空投至少一名执灯士；总费用只有 25。' },
      objective: { label: '凝魂达到 5 点并保持存活', conditions: [C('souls', { count: 5 }), C('survive', { turn: 1 })] },
      player: {},
      enemy: { name: '无人村 · 鬼影', units: [{ type: '精锐步兵', count: 2 }] },
      ghosts: { count: 9 },
      ai: { style: 'rush' },
      intro: [
        { who: 'sesis', text: '长官，这雾太重了，空投员看不清航线，只能盲投。' },
        { who: 'sesis', text: '总物资很少，每一波都有可能是最后一批。' },
        { who: 'sesis', text: '但好消息是，他们扔下来的人里，至少有一个带着灯。' }
      ],
      win: [{ who: 'sesis', text: '活下来了。长官，如果把执灯士弄丢了，这村子就会把我们永远留下来。' }],
      lose: [{ who: 'general', text: '灯灭了。村子又多了一批客人。' }],
      lines: [{ when: 'turn', turn: 5, who: 'sesis', text: '灯要灭了！保护执灯士，让他去踩鬼魂！' }],
      tip: '每波必出执灯士；用步兵踩鬼魂积累凝魂。'
    }
  ];

  const WANNAN = [
    {
      id: 'wannan-1', no: 1, name: '边境的摩擦', en: 'BORDER FRICTION',
      brief: '三座城邦在边境试探。先撑过这一阵。',
      objective: { label: '不发动事变，撑过 6 阵', conditions: [C('survive', { turn: 6 })], failIf: [C('incident')] },
      enemy: { name: '雅典 · 前哨', units: [{ type: '精锐步兵', count: 4 }, { type: '精锐炮兵', count: 2 }] },
      imperial: { units: [{ type: '精锐步兵', count: 3 }, { type: '精锐战车', count: 1 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'lykos', text: '长官，雅典的前哨在边界上晃，波斯的骑兵在更后面。' },
        { who: 'helen', text: '雅典只是来看看斯巴达的盾还立不立得住。' },
        { who: 'lykos', text: '那就让他们看。看久了，总会有人先眨眼。' }
      ],
      win: [{ who: 'lykos', text: '摩擦还没烧起来。长官，你忍得不错。' }],
      lose: [{ who: 'helen', text: '斯巴达先动了手。那就别怪雅典记性好。' }],
      lines: [{ when: 'turn', turn: 3, who: 'arta', text: '波斯的马，已经闻到血了。' }],
      tip: '三方都在观望；先别把后背留给任何一方。'
    },
    {
      id: 'wannan-2', no: 2, name: '波斯的炮阵', en: 'PERSIAN BATTERY',
      brief: '波斯把炮架在三城之间。拔掉这门炮。',
      objective: { label: '击溃波斯的炮阵（2 门）', conditions: [C('killImperial', { count: 2 })] },
      enemy: { name: '雅典 · 旁观者', units: [{ type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 2 }] },
      imperial: { units: [{ type: '精锐炮兵', count: 4 }, { type: '精锐步兵', count: 2 }] },
      ai: { style: 'artillery' },
      intro: [
        { who: 'arta', text: '波斯的炮不认城邦。谁站在中间，谁就先碎。' },
        { who: 'helen', text: '雅典不介意看波斯和斯巴达互相消耗。' },
        { who: 'lykos', text: '那就先让波斯的炮闭嘴。' }
      ],
      win: [{ who: 'lykos', text: '炮哑了。波斯人开始谈“误会”。' }],
      lose: [{ who: 'arta', text: '中间那块地，归波斯了。' }],
      lines: [{ when: 'firstKillType', unitType: '炮兵', who: 'arta', text: '那门炮是波斯从东边运来的。' }],
      tip: '波斯的炮是第三方；雅典会看着你们互相消耗。'
    },
    {
      id: 'wannan-3', no: 3, name: '三城的市集', en: 'THREE MARKETS',
      brief: '三城的旗都插在集市中央。把斯巴达的旗立到中心。',
      objective: { label: '守住集市中央 2 阵', conditions: [C('hold', { x: 5, y: 2, turns: 2 })] },
      enemy: { name: '雅典 · 集市', units: [{ type: '精锐步兵', count: 4 }, { type: '精锐战车', count: 1 }, { type: '精锐炮兵', count: 2 }] },
      imperial: { units: [{ type: '精锐步兵', count: 3 }, { type: '精锐战车', count: 2 }, { type: '精锐炮兵', count: 1 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'helen', text: '集市是雅典的。你们把旗插在那里，商路就断了。' },
        { who: 'lykos', text: '商路断了还能再开。旗倒了，人心就散了。' },
        { who: 'arta', text: '波斯只关心谁收税。' }
      ],
      win: [{ who: 'lykos', text: '旗立住了。集市还在，只是换了收税的人。' }],
      lose: [{ who: 'helen', text: '中心的旗不是斯巴达的。' }],
      lines: [{ when: 'hold', who: 'lykos', text: '斯巴达的旗，立起来了。' }],
      tip: '中心会被三方争夺；站上去只是开始，守住才算数。'
    },
    {
      id: 'wannan-4', no: 4, name: '斯巴达的盾', en: 'SPARTAN SHIELD',
      brief: '雅典的战车压上来了。拆掉它们的车轴。',
      objective: { label: '击毁雅典的战车', conditions: [C('killType', { unitType: '车' })] },
      enemy: { name: '雅典 · 战车', units: [{ type: '精锐战车', count: 4 }, { type: '精锐步兵', count: 3 }] },
      imperial: { units: [{ type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 1 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'lykos', text: '雅典人把车推上来了。盾墙列好。' },
        { who: 'helen', text: '这不是冲锋，是测量。测量斯巴达还能站多久。' },
        { who: 'lykos', text: '那就让他们量到车轴断掉。' }
      ],
      win: [{ who: 'lykos', text: '盾还在，人也在。斯巴达的规矩。' }],
      lose: [{ who: 'helen', text: '盾墙破了。雅典会记住这一天。' }],
      lines: [{ when: 'firstKillType', unitType: '车', who: 'lykos', text: '撞碎了一辆。再来。' }],
      tip: '雅典的车是目标；波斯的步兵会在旁边等便宜。'
    },
    {
      id: 'wannan-5', no: 5, name: '事变前夜', en: 'EVE OF INCIDENT',
      brief: '三城的火把都亮着，谁先动谁先燃。撑过这一夜。',
      objective: { label: '撑过事变前夜（8 阵）', conditions: [C('survive', { turn: 8 })] },
      enemy: { name: '雅典 · 铁甲', units: [{ type: '精锐战车', count: 4 }, { type: '精锐步兵', count: 4 }] },
      imperial: { units: [{ type: '精锐战车', count: 4 }, { type: '精锐步兵', count: 3 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'helen', text: '今晚之后，雅典和斯巴达就不再是盟友了。' },
        { who: 'arta', text: '波斯从来没说过自己是盟友。' },
        { who: 'lykos', text: '那就都别睡。' }
      ],
      win: [{ who: 'lykos', text: '天亮了。事变还是来了，但至少是我们占先。' }],
      lose: [{ who: 'helen', text: '雅典的铁甲碾过了你们的边界。' }],
      lines: [{ when: 'turn', turn: 4, who: 'lykos', text: '火把全灭了。有人先动了。' }],
      tip: '三方混战会持续消耗；别把所有人都派到同一条线上。'
    },
    {
      id: 'wannan-6', no: 6, name: '城门之后', en: 'BEHIND THE GATE',
      brief: '雅典的炮藏在门后。先让它们安静。',
      objective: { label: '击溃雅典的炮队', conditions: [C('killType', { unitType: '炮兵' })] },
      enemy: { name: '雅典 · 城门', units: [{ type: '精锐炮兵', count: 4 }, { type: '精锐步兵', count: 3 }] },
      imperial: { units: [{ type: '精锐炮兵', count: 3 }, { type: '精锐步兵', count: 2 }] },
      ai: { style: 'artillery' },
      intro: [
        { who: 'helen', text: '城门后面是雅典的粮仓。你们要的从来不是城，是粮。' },
        { who: 'lykos', text: '粮仓前面是炮。先拔炮，再谈粮。' },
        { who: 'arta', text: '波斯可以等。等你们把粮仓打空。' }
      ],
      win: [{ who: 'lykos', text: '炮停了。城门开了。粮仓还在。' }],
      lose: [{ who: 'helen', text: '城门没破。谈判桌上你们还是空手。' }],
      lines: [{ when: 'firstKillType', unitType: '炮兵', who: 'helen', text: '那门炮是雅典的嫁妆！' }],
      tip: '雅典的炮队是目标；波斯的炮会趁乱打冷枪。'
    },
    {
      id: 'wannan-7', no: 7, name: '三方混战', en: 'THREE-WAY MELEE',
      brief: '斯巴达、雅典、波斯同时拔刀。活到最后一刻。',
      objective: { label: '在三方混战中撑过 10 阵', conditions: [C('survive', { turn: 10 })] },
      enemy: { name: '雅典 · 混战', units: [{ type: '装甲车', count: 3 }, { type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 2 }] },
      imperial: { units: [{ type: '精锐战车', count: 3 }, { type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 1 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'arta', text: '三城的旗都倒了才好。这样波斯就不用选了。' },
        { who: 'helen', text: '雅典不想赢，只想比你们晚一点倒。' },
        { who: 'lykos', text: '那就都别倒。站到最后的人说话。' }
      ],
      win: [{ who: 'lykos', text: '三方都还在，但至少我们没先倒。' }],
      lose: [{ who: 'helen', text: '混战里没有赢家，只有先死和后死。' }],
      lines: [{ when: 'turn', turn: 6, who: 'lykos', text: '波斯的骑兵绕到后面了！' }],
      tip: '三方都会攻击最近的目标；让雅典和波斯先互相消耗。'
    },
    {
      id: 'wannan-8', no: 8, name: '雅典卫城', en: 'THE ACROPOLIS',
      brief: '雅典将军守在卫城。击倒他，雅典才会退。',
      objective: { label: '击倒雅典将军', conditions: [C('boss')] },
      enemy: { name: '雅典 · 卫城', boss: { type: '装甲车', name: '雅典将军' }, units: [{ type: '精锐步兵', count: 4 }, { type: '精锐炮兵', count: 3 }] },
      imperial: { units: [{ type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 2 }] },
      ai: { style: 'hold' },
      intro: [
        { who: 'helen', text: '卫城不是战场。你们非要把它变成战场。' },
        { who: 'lykos', text: '将军站在最高的地方，看得见所有人的死。' },
        { who: 'helen', text: '也看得见你们怎么上来。' }
      ],
      win: [{ who: 'lykos', text: '将军倒了。卫城的钟还在响。' }],
      lose: [{ who: 'helen', text: '卫城还在雅典手里。' }],
      lines: [{ when: 'bossKill', who: 'helen', text: '雅典……不会忘记。' }],
      tip: '将军有两层护甲；波斯人会看着你们仰攻。'
    },
    {
      id: 'wannan-9', no: 9, name: '波斯的撤退', en: 'PERSIAN WITHDRAWAL',
      brief: '波斯想带走战利品。把他们的车队留下。',
      objective: { label: '截住波斯的车队（3 辆）', conditions: [C('killImperial', { count: 3 })] },
      enemy: { name: '雅典 · 残部', units: [{ type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 2 }] },
      imperial: { units: [{ type: '精锐战车', count: 5 }, { type: '精锐炮兵', count: 3 }, { type: '精锐步兵', count: 2 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'arta', text: '波斯不带走战利品，只带走下一次战争的本钱。' },
        { who: 'lykos', text: '那就把本钱留下。' },
        { who: 'helen', text: '雅典可以帮你们——如果分我们一半。' }
      ],
      win: [{ who: 'lykos', text: '车队留下了。波斯人跑得比马还快。' }],
      lose: [{ who: 'arta', text: '你们的战利品，归波斯了。' }],
      lines: [{ when: 'firstKillType', unitType: '车', who: 'arta', text: '那辆车里装的是金币！' }],
      tip: '波斯的车队会试图脱离；先断护卫，再追车。'
    },
    {
      id: 'wannan-10', no: 10, name: '三城之盟', en: 'LEAGUE OF THREE',
      brief: '阿尔塔亲自压阵。击倒他，并撑到最后一刻。',
      objective: { label: '击倒阿尔塔并撑过 10 阵', conditions: [C('boss'), C('survive', { turn: 10 })] },
      enemy: { name: '雅典 · 旁观', units: [{ type: '精锐步兵', count: 4 }, { type: '精锐炮兵', count: 2 }] },
      imperial: { name: '波斯 · 终局', boss: { type: '装甲车', name: '阿尔塔', side: 'imperial' }, units: [{ type: '精锐炮兵', count: 4 }, { type: '精锐步兵', count: 4 }] },
      ai: { style: 'hold' },
      intro: [
        { who: 'arta', text: '三城之盟？盟约只在波斯需要的时候存在。' },
        { who: 'helen', text: '雅典只想知道，盟约烧完之后还剩什么。' },
        { who: 'lykos', text: '剩斯巴达的盾，和波斯人的尸体。' }
      ],
      win: [{ who: 'helen', text: '阿尔塔走了。盟约……也许还能再写一页。' }],
      lose: [{ who: 'arta', text: '盟约是波斯写的。日期也是。' }],
      lines: [{ when: 'bossKill', who: 'arta', text: '波斯……还会回来。' }],
      tip: '首领是波斯人，不是雅典；雅典只会旁观。'
    },
    {
      id: 'wannan-11', no: 11, name: '假面舞会', en: 'MASQUERADE',
      brief: '前两阵不能互相开火。撕下面具之前，先杀中间的督军。',
      minigame: { title: '假面舞会', noArmory: true, fakeAlliance: true, incidentTurn: 3, governors: true, rule: '前两阵红蓝互为友军；第三阵雅典撕毁协议。' },
      objective: { label: '击杀 2 名帝国督军，并在事变后存活 3 阵', conditions: [C('killImperial', { count: 2 }), C('survive', { turn: 6 })] },
      player: { units: [{ type: '步兵', count: 2 }, { type: '后勤兵', count: 1 }, { type: '二阶步兵', count: 1 }] },
      enemy: { name: '雅典 · 假面', units: [{ type: '精锐步兵', count: 2, x: 2, y: 1 }, { type: '海炮', count: 1, x: 2, y: 3 }, { type: '后勤兵', count: 1, x: 3, y: 2 }] },
      imperial: { units: [{ type: '二阶步兵', count: 2, hp: 2, static: true, buffs: ['elite_infantry'], role: 'governor' }] },
      ai: { style: 'hold', focusRole: 'logi' },
      intro: [
        { who: 'lykos', text: '长官，中间那两个督军在看戏。我们和雅典签了协议，期限内不能动手。' },
        { who: 'helen', text: '可你看雅典的部队，都快贴到我们脸上了。' },
        { who: 'lykos', text: '一旦督军倒下，他们立刻就会把枪口对准我们。' },
        { who: 'lykos', text: '前两阵只能打督军；第三阵开始，雅典会撕毁协议。' }
      ],
      win: [{ who: 'lykos', text: '面具撕了，督军也倒了。斯巴达还站着。' }],
      lose: [{ who: 'helen', text: '假面舞会结束，斯巴达出局。' }],
      lines: [{ when: 'turn', turn: 3, who: 'lykos', text: '他们撕毁协议了！雅典全员开火！' }],
      tip: '前两阵不能攻击雅典；第三阵事变，蓝方狂暴。'
    },
    {
      id: 'wannan-12', no: 12, name: '背刺之夜', en: 'NIGHT OF THE KNIFE',
      brief: '空投兵力先打波斯。第三阵雅典会从右侧背刺。',
      minigame: { title: '背刺之夜', noArmory: true, conveyor: { total: 35, first: 15, interval: 1, amount: 5, pool: ['步兵', '车', '炮兵', '后勤兵'] }, rule: '每阵空投 5 费；第三阵雅典事变。' },
      objective: { label: '全歼波斯督军', conditions: [C('eliminateImperial')] },
      player: {},
      enemy: { name: '雅典 · 右侧', units: [{ type: '精锐步兵', count: 2 }, { type: '精锐战车', count: 1 }] },
      imperial: { units: [{ type: '精锐步兵', count: 3 }, { type: '精锐战车', count: 1 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'lykos', text: '长官，斯巴达的部队就在这里。左边是波斯督军，右边是雅典的盟友。' },
        { who: 'lykos', text: '我们的补给线被切断，只能靠零星空投。' },
        { who: 'lykos', text: '先利用空投兵力，与雅典人合围把中间的波斯人干掉！' }
      ],
      win: [{ who: 'lykos', text: '我们活下来了。雅典的背刺比波斯的刀还疼。' }],
      lose: [{ who: 'helen', text: '背刺之夜，斯巴达先倒。' }],
      lines: [{ when: 'turn', turn: 3, who: 'lykos', text: '雅典反水了！他们跨过波斯阵地冲过来了！' }],
      tip: '第三阵雅典事变；空投兵力必须立刻投入绞肉机。'
    }
  ];

  const HOLY = [
    {
      id: 'holy-1', no: 1, name: '初升', en: 'FIRST LIGHT',
      brief: '天空层刚刚打开。先让 3 处圣辉之光归位。',
      objective: { label: '圣辉之光达到 3 处', conditions: [C('score', { count: 3 })] },
      enemy: { name: '堕落者 · 前哨', units: [{ type: '精锐步兵', count: 2 }, { type: '精锐炮兵', count: 2 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'sera', text: '长官，天边裂开了一道光。光里有东西在动。' },
        { who: 'commander', text: '先站稳。别急着追光。' },
        { who: 'sera', text: '可光正在往我们这边落。' }
      ],
      win: [{ who: 'sera', text: '三处光。圣辉承认了我们。' }],
      lose: [{ who: 'orion', text: '借来的光，撐不了多久。' }],
      lines: [{ when: 'score', count: 3, who: 'sera', text: '圣辉的光，够了！' }],
      tip: '每个己方回合开始结算区域控制；占多数格才得分。'
    },
    {
      id: 'holy-2', no: 2, name: '天空的裂缝', en: 'SKY RIFT',
      brief: '两层战场同时开火。活过六个回合。',
      objective: { label: '存活 6 回合', conditions: [C('survive', { turn: 6 })] },
      enemy: { name: '堕落者 · 裂缝', units: [{ type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 2 }, { type: '精锐炮兵', count: 1, layer: 'sky' }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'orion', text: '天空裂开的时候，地面上的人只能抬头等死。' },
        { who: 'sera', text: '上面和下面会同时开火。别看漏了头顶。' },
        { who: 'commander', text: '也别抬头太久。脚下才是退路。' }
      ],
      win: [{ who: 'sera', text: '裂缝合上了。我们还在地上。' }],
      lose: [{ who: 'orion', text: '你们抬头太久了。' }],
      lines: [{ when: 'turn', turn: 3, who: 'sera', text: '天空层有单位下来了！' }],
      tip: '升空会少一个地面单位；别把所有人送上去。'
    },
    {
      id: 'holy-3', no: 3, name: '龙影', en: 'DRAGON SHADOW',
      brief: '龙影在阵地上游走。让圣辉的光聚到 4 处。',
      objective: { label: '圣辉之光达到 4 处', conditions: [C('score', { count: 4 })] },
      enemy: { name: '堕落者 · 龙标', units: [
        { type: '精锐战车', count: 2 }, { type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 2 }, { type: '精锐炮兵', count: 1, layer: 'sky' }
      ]},
      ai: { style: 'rush' },
      intro: [
        { who: 'sera', text: '那道龙影在移动。站到光里，就能看见另一层战场。' },
        { who: 'commander', text: '升空不是目的。把光留在我们这边。' },
        { who: 'orion', text: '你们追光，光也在追你们。' }
      ],
      win: [{ who: 'sera', text: '四分。圣殿的门开了一条缝。' }],
      lose: [{ who: 'orion', text: '你们追着龙影跑，忘了脚下。' }],
      lines: [{ when: 'turn', turn: 4, who: 'sera', text: '龙影落到中央了。' }],
      tip: '区域比龙标重要；先控区，再考虑升空。'
    },
    {
      id: 'holy-4', no: 4, name: '火山口', en: 'CRATER',
      brief: '火山挡住中央。全歼堕落者。',
      objective: { label: '全歼敌人', conditions: [C('eliminate')] },
      enemy: { name: '堕落者 · 火山', units: [
        { type: '精锐战车', count: 3 }, { type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 2 }
      ]},
      ai: { style: 'rush' },
      intro: [
        { who: 'sera', text: '火山在中间。绕过去，或者从上面飞过去。' },
        { who: 'commander', text: '绕。能走的路，就别飞。' },
        { who: 'sera', text: '火山在响，别挤在同一片地方。' }
      ],
      win: [{ who: 'sera', text: '火山没醒。我们赢了。' }],
      lose: [{ who: 'orion', text: '火山的灰，正好埋你们。' }],
      lines: [{ when: 'turn', turn: 4, who: 'sera', text: '火山在响。别挤在同一片地方！' }],
      tip: '火山 3×1 阻挡；第 5 回合预警，喷发会吞掉整组。'
    },
    {
      id: 'holy-5', no: 5, name: '圣辉的代价', en: 'PRICE OF LIGHT',
      brief: '积分到 5，或者被圣辉烧干。',
      objective: { label: '圣辉之光达到 5 处', conditions: [C('score', { count: 5 })] },
      enemy: { name: '堕落者 · 圣殿', units: [
        { type: '精锐炮兵', count: 3 }, { type: '精锐步兵', count: 3 }, { type: '防御工事', count: 2 }, { type: '精锐炮兵', count: 1, layer: 'sky' }
      ]},
      ai: { style: 'artillery' },
      intro: [
        { who: 'sera', text: '圣辉不是白给的。站得越久，烧得越疼。' },
        { who: 'commander', text: '那就快一点。' },
        { who: 'sera', text: '光会挑人。别让它挑到我们。' }
      ],
      win: [{ who: 'sera', text: '五分。圣殿认了我们。' }],
      lose: [{ who: 'orion', text: '光会挑人。你们不在名单上。' }],
      lines: [{ when: 'score', count: 5, who: 'sera', text: '圣辉满了。' }],
      tip: '积分靠区域控制；不要为了一个人头丢掉整片区域。'
    },
    {
      id: 'holy-6', no: 6, name: '堕落圣骑', en: 'FALLEN PALADIN',
      brief: '奥里昂亲自守门。击杀他。',
      objective: { label: '击杀奥里昂', conditions: [C('boss')] },
      enemy: { name: '奥里昂 · 守门', boss: { type: '装甲车', name: '奥里昂' }, units: [
        { type: '装甲车', count: 2 }, { type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 2 }
      ]},
      ai: { style: 'hold' },
      intro: [
        { who: 'orion', text: '圣殿的门，只对死人开。' },
        { who: 'sera', text: '他在门后等我们。等了很多年。' },
        { who: 'commander', text: '那就进去。别让他再等。' }
      ],
      win: [{ who: 'sera', text: '他退了。门还开着。' }],
      lose: [{ who: 'orion', text: '你们连门都没摸到。' }],
      lines: [{ when: 'bossHit', who: 'orion', text: '这点光，也想烧我？' }],
      tip: '奥里昂有两层护甲；先清炮兵，再围杀。'
    },
    {
      id: 'holy-7', no: 7, name: '天空之战', en: 'WAR IN HEAVEN',
      brief: '双发炮兵在云层后面。击杀所有炮兵。',
      objective: { label: '击杀所有炮兵', conditions: [C('killType', { unitType: '炮兵' })] },
      enemy: { name: '堕落者 · 云阵', units: [
        { type: '精锐炮兵', count: 3 }, { type: '双发炮兵', count: 3 }, { type: '精锐步兵', count: 2 }, { type: '精锐炮兵', count: 2, layer: 'sky' }
      ]},
      ai: { style: 'artillery' },
      intro: [
        { who: 'sera', text: '云层后面全是炮。升空之前，先想好怎么下来。' },
        { who: 'commander', text: '不下来也行。把炮打掉。' },
        { who: 'orion', text: '天空是我们的。' }
      ],
      win: [{ who: 'sera', text: '炮停了。天空安静了。' }],
      lose: [{ who: 'orion', text: '天空是我们的。' }],
      lines: [{ when: 'firstKillType', unitType: '炮兵', who: 'orion', text: '一门炮而已。' }],
      tip: '双发炮兵有两次炮击；优先点掉。'
    },
    {
      id: 'holy-8', no: 8, name: '圣殿之门', en: 'GATES OF LIGHT',
      brief: '装甲车堵住圣殿。活过八个回合。',
      objective: { label: '存活 8 回合', conditions: [C('survive', { turn: 8 })] },
      enemy: { name: '堕落者 · 铁门', units: [
        { type: '装甲车', count: 3 }, { type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 2 }
      ]},
      ai: { style: 'hold' },
      intro: [
        { who: 'sera', text: '门后有光，也有铁。先活下来，再谈进去。' },
        { who: 'commander', text: '铁挡不住人。' },
        { who: 'sera', text: '门不会等我们。' }
      ],
      win: [{ who: 'sera', text: '门开了。光比我们想的冷。' }],
      lose: [{ who: 'orion', text: '门后是圣辉，门前是你们。' }],
      lines: [{ when: 'turn', turn: 5, who: 'sera', text: '装甲车在门口列阵了。' }],
      tip: '装甲车能抵消一次判定；用炮兵破甲。'
    },
    {
      id: 'holy-9', no: 9, name: '天火', en: 'SKYFIRE',
      brief: '天火落下。拿到 6 点积分。',
      objective: { label: '圣辉之光达到 6 处', conditions: [C('score', { count: 6 })] },
      enemy: { name: '堕落者 · 天火', units: [
        { type: '精锐战车', count: 3 }, { type: '精锐炮兵', count: 3 }, { type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 2, layer: 'sky' }
      ]},
      ai: { style: 'rush' },
      intro: [
        { who: 'orion', text: '天火会烧掉所有站着不动的人。' },
        { who: 'sera', text: '那就别停。散开，别让火找到一堆人。' },
        { who: 'commander', text: '光要落下来，就让它落在空处。' }
      ],
      win: [{ who: 'sera', text: '六分。天火停了。' }],
      lose: [{ who: 'orion', text: '你们被自己的光烧死了。' }],
      lines: [{ when: 'turn', turn: 6, who: 'sera', text: '火山又要喷了！' }],
      tip: '积分到 6 即可，不必全歼；分散占区。'
    },
    {
      id: 'holy-10', no: 10, name: '圣辉之下', en: 'UNDER THE LIGHT',
      brief: '击杀奥里昂，并把积分推到 6。',
      objective: { label: '击杀奥里昂并达到 6 分', conditions: [C('boss'), C('score', { count: 6 })] },
      enemy: { name: '奥里昂 · 终局', boss: { type: '装甲车', name: '奥里昂' }, units: [
        { type: '装甲车', count: 2 }, { type: '精锐炮兵', count: 3 }, { type: '精锐步兵', count: 3 }, { type: '精锐炮兵', count: 2, layer: 'sky' }
      ]},
      ai: { style: 'rush' },
      intro: [
        { who: 'orion', text: '最后一战。光归谁，谁就写历史。' },
        { who: 'sera', text: '圣辉会记住每一个名字，不管站在哪一边。' },
        { who: 'commander', text: '那就开始。' }
      ],
      win: [{ who: 'sera', text: '圣辉之下，名字比胜利长。' }],
      lose: [{ who: 'orion', text: '历史由站着的人写。你们躺下了。' }],
      lines: [{ when: 'bossKill', who: 'orion', text: '圣辉……不欠我什么。' }],
      tip: '先控区到 6 分，再斩首；只杀首领不够。'
    },
    {
      id: 'holy-11', no: 11, name: '绝命火山口', en: 'CRATER LAST STAND',
      brief: '纯地面战场，中央火山不可通行。守住 6 阵，击杀 3 HP 的异端审判官。',
      minigame: { title: '绝命火山口', noArmory: true, noSky: true, volcano: true, rule: '中央火山不可通行；靠近火山的非红方单位会被烧灼。' },
      objective: { label: '坚守 6 阵并击杀异端审判官', conditions: [C('survive', { turn: 6 }), C('boss')] },
      player: { units: [{ type: '精锐炮兵', count: 1 }, { type: '精锐步兵', count: 2 }, { type: '后勤兵', count: 1 }] },
      enemy: { name: '异端 · 火山', boss: { type: '二阶步兵', name: '异端审判官', hp: 3 }, units: [{ type: '精锐步兵', count: 4, buffs: ['rage'] }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'sera', text: '长官，这片焦土会吞噬一切。敌人的狂热让他们不怕死。' },
        { who: 'sera', text: '那个审判官不仅有最好的战甲，跑得还比普通步兵快。' },
        { who: 'sera', text: '利用火山口，把他们逼进火里。' }
      ],
      win: [{ who: 'sera', text: '结束了……他化为灰烬了。' }],
      lose: [{ who: 'orion', text: '焦土收下了你们。' }],
      lines: [{ when: 'bossKill', who: 'sera', text: '审判官倒了。这片土地，再也长不出麦子了。' }],
      tip: '火山三格不可通行；审判官 3 HP，优先用炮兵和工事卡位。'
    },
    {
      id: 'holy-12', no: 12, name: '猎杀指令', en: 'KILL ORDER',
      brief: '侦察兵在天空标记，地面二阶步兵拆防空塔，投弹兵完成全歼。',
      minigame: { title: '猎杀指令', noArmory: true, hunt: true, rule: '侦察兵标记所有敌人；防空塔必须由地面二阶步兵摧毁。' },
      objective: { label: '8 阵内标记并轰炸所有敌人，保住侦察兵与至少 1 名地面步兵', within: 8, conditions: [C('huntDone')], failIf: [C('aaFailed'), C('roleDead', { role: 'scout' })] },
      player: { units: [{ type: '精锐战车', count: 1, layer: 'sky', displayName: '侦察兵', displayIcon: '🛩️', huntScout: true, role: 'scout' }, { type: '二阶步兵', count: 2 }] },
      enemy: { name: '焦土 · 隐蔽阵地', units: [{ type: '精锐步兵', count: 5 }, { type: '精锐战车', count: 3 }, { type: '精锐步兵', count: 1, layer: 'sky' }, { type: '防空塔', count: 1, x: 8, y: 2, static: true, hp: 3, displayName: '防空塔', buffs: ['aa_tower'] }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'sera', text: '长官，我们的火炮打不穿他们的龟壳，防空炮又锁死了低空。' },
        { who: 'sera', text: '让侦察兵骑龙上去！只要飞到他们头顶，锁定坐标，投弹兵就能把他们送上天！' },
        { who: 'sera', text: '记住，别让他们跑了！' }
      ],
      win: [{ who: 'sera', text: '全灭了……长官，连灰都没剩下。天空重新属于我们了。' }],
      lose: [{ who: 'orion', text: '侦察兵落了。天空还是我们的。' }],
      lines: [{ when: 'turn', turn: 3, who: 'sera', text: '小心！那台防空塔盯上你了！别停在一个地方！' }],
      tip: '侦察兵标记地面敌人；防空塔由二阶步兵拆除；全标记后呼叫投弹。'
    }
  ];

  const MINE = [
    {
      id: 'mine-1', no: 1, name: '下井', en: 'DESCENT',
      brief: '井口的风是冷的。先在地面站稳。',
      objective: { label: '在地面撑过 5 阵', conditions: [C('survive', { turn: 5 })] },
      enemy: { name: '另一支矿队', units: [{ type: '精锐步兵', count: 2 }, { type: '精锐炮兵', count: 1 }] },
      monsters: { units: [{ type: '矿兽', count: 1, hp: 2 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'shi', text: '长官，井口的风是冷的。下面的东西不喜欢活人。' },
        { who: 'warden', text: '上面的人，别再往下挖了。' },
        { who: 'shi', text: '另一支矿队也来了。他们不是来帮我们的。' }
      ],
      win: [{ who: 'shi', text: '井口还在我们手里。可以往下走了。' }],
      lose: [{ who: 'warden', text: '上面的人，连井口都守不住。' }],
      lines: [{ when: 'turn', turn: 3, who: 'shi', text: '听，井底有声音。' }],
      tip: '蓝方是另一支矿队，矿兽是第三方的；先看它们互相咬。'
    },
    {
      id: 'mine-2', no: 2, name: '矿脉', en: 'THE VEIN',
      brief: '矿脉里全是影子。把矿兽赶出去。',
      objective: { label: '清掉矿脉里的矿兽（3 只）', conditions: [C('killMonster', { count: 3 })] },
      openWalls: [[1,2],[3,3],[7,3]],
      enemy: { name: '另一支矿队', units: [{ type: '精锐步兵', count: 2 }, { type: '精锐炮兵', count: 1 }] },
      monsters: { units: [{ type: '矿兽', count: 3, hp: 2 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'shi', text: '矿脉在发光。光下面有东西在动。' },
        { who: 'warden', text: '那是我的矿兽。你们挖到了它们的窝。' },
        { who: 'shi', text: '另一支矿队也在往里钻。让他们先钻。' }
      ],
      win: [{ who: 'shi', text: '矿兽退了。矿脉还在。' }],
      lose: [{ who: 'warden', text: '矿脉不是你们的。' }],
      lines: [{ when: 'firstKill', who: 'shi', text: '一只矿兽倒了。剩下的会记住我们。' }],
      tip: '目标矿兽在地下；蓝方矿队会和你抢。'
    },
    {
      id: 'mine-3', no: 3, name: '塌方', en: 'CAVE-IN',
      brief: '石头在响。别站在会塌的地方。',
      objective: { label: '在塌方中撑过 7 阵', conditions: [C('survive', { turn: 7 })] },
      enemy: { name: '另一支矿队', units: [{ type: '精锐战车', count: 2 }, { type: '精锐步兵', count: 2 }] },
      monsters: { units: [{ type: '矿兽', count: 2, hp: 2 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'shi', text: '上面要塌了。石头不认识人，也不认识矿兽。' },
        { who: 'warden', text: '塌下来，谁都得埋。' },
        { who: 'shi', text: '那就让另一支矿队先站在下面。' }
      ],
      win: [{ who: 'shi', text: '石头停了。我们还站着。' }],
      lose: [{ who: 'warden', text: '矿洞会自己收尸。' }],
      lines: [{ when: 'turn', turn: 4, who: 'shi', text: '上面要塌了！快挪！' }],
      tip: '塌方会同时埋葬人和矿兽；利用它，别被它利用。'
    },
    {
      id: 'mine-4', no: 4, name: '晶簇', en: 'CRYSTAL CLUSTER',
      brief: '晶簇会发光，也会把矿兽引来。把兽群清掉。',
      objective: { label: '清掉晶簇旁的兽群（4 只）', conditions: [C('killMonster', { count: 4 })] },
      openWalls: [[1,0],[5,0],[9,0],[1,2],[9,2],[3,3],[7,3]],
      enemy: { name: '另一支矿队', units: [{ type: '精锐步兵', count: 2 }, { type: '精锐炮兵', count: 1 }] },
      monsters: { units: [{ type: '矿兽', count: 4, hp: 2 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'shi', text: '晶簇能换钱，也能把矿兽引来。' },
        { who: 'warden', text: '它们不是被光引来的。是被你们的声音引来的。' },
        { who: 'shi', text: '另一支矿队也在抢。让他们抢，兽群会先找他们。' }
      ],
      win: [{ who: 'shi', text: '晶簇归我们。矿兽也躺下了。' }],
      lose: [{ who: 'warden', text: '贪心的人，最后都留在矿里。' }],
      lines: [{ when: 'firstKill', who: 'shi', text: '矿兽出来了！' }],
      tip: '晶簇和遗物是诱饵；目标是兽群，不是抢光。'
    },
    {
      id: 'mine-5', no: 5, name: '矿兽', en: 'MINE BEAST',
      brief: '矿兽堵在竖井口。把它放倒。',
      objective: { label: '放倒矿兽', conditions: [C('boss')] },
      openWalls: [[5,0],[5,4],[1,2],[9,2]],
      enemy: { name: '另一支矿队', units: [{ type: '工兵', count: 2, role: 'saboteur' }] },
      monsters: { name: '矿兽', boss: { type: '矿兽', name: '硕大矿兽', side: 'monster', hp: 4 }, units: [{ type: '矿兽', count: 2, hp: 2 }] },
      ai: { style: 'hold' },
      intro: [
        { who: 'warden', text: '矿兽不认路。它只认活人的味道。' },
        { who: 'shi', text: '它堵在井口。另一支矿队不敢动。' },
        { who: 'warden', text: '你们谁先动，它就先吃谁。' }
      ],
      win: [{ who: 'shi', text: '它倒了。竖井口开了。' }],
      lose: [{ who: 'warden', text: '矿兽吃饱了。' }],
      lines: [{ when: 'bossHit', who: 'warden', text: '它的皮比岩壁还厚。' }],
      tip: '矿兽是地下首领；蓝方矿队会等你先动手。'
    },
    {
      id: 'mine-6', no: 6, name: '地下河', en: 'UNDERGROUND RIVER',
      brief: '水漫上来了。活到水位退下去。',
      objective: { label: '在地下河撑过 9 阵', conditions: [C('survive', { turn: 9 })] },
      enemy: { name: '另一支矿队', units: [{ type: '装甲车', count: 2 }, { type: '精锐步兵', count: 2 }] },
      monsters: { units: [{ type: '矿兽', count: 2, hp: 2 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'shi', text: '水漫上来的时候，别往下走。矿洞会把人拖进暗河。' },
        { who: 'warden', text: '暗河下面，还有我的东西在等。' },
        { who: 'shi', text: '另一支矿队已经往高处爬了。我们也走。' }
      ],
      win: [{ who: 'shi', text: '水退了。我们还在这层。' }],
      lose: [{ who: 'warden', text: '暗河收下了你们。' }],
      lines: [{ when: 'turn', turn: 5, who: 'shi', text: '水到脚踝了！往上走！' }],
      tip: '水位会逼所有人移动；别在低处和矿兽纠缠。'
    },
    {
      id: 'mine-7', no: 7, name: '蛇骨守卫', en: 'SERPENT GUARD',
      brief: '蛇骨在矿道里站了起来。把兽群清干净。',
      objective: { label: '清掉蛇骨旁的兽群（5 只）', conditions: [C('killMonster', { count: 5 })] },
      openWalls: [[3,3],[7,3],[1,2],[9,2]],
      enemy: { name: '另一支矿队', units: [{ type: '精锐战车', count: 2 }, { type: '精锐步兵', count: 2 }] },
      monsters: { units: [{ type: '矿兽', count: 5, hp: 2 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'shi', text: '蛇骨守卫不会退。它们的骨头是车轴做的。' },
        { who: 'warden', text: '你们听到的每一声，都是它们在数人。' },
        { who: 'shi', text: '另一支矿队也在里面。让他们先数。' }
      ],
      win: [{ who: 'shi', text: '兽群散了。矿道安静了。' }],
      lose: [{ who: 'warden', text: '蛇骨不会断。' }],
      lines: [{ when: 'firstKill', who: 'shi', text: '一只倒了。剩下的围上来了。' }],
      tip: '目标是兽群；蓝方矿队会趁乱抢遗物。'
    },
    {
      id: 'mine-8', no: 8, name: '矿主的低语', en: 'THE WARDEN’S WHISPER',
      brief: '矿主在深处低语。让它闭嘴。',
      objective: { label: '击倒蛇骨矿主', conditions: [C('boss')] },
      openWalls: [[5,0],[5,4],[1,2],[9,2]],
      enemy: { name: '另一支矿队', units: [{ type: '精锐步兵', count: 2 }, { type: '精锐炮兵', count: 1 }] },
      monsters: { name: '蛇骨矿主', boss: { type: '矿兽', name: '蛇骨矿主', side: 'monster', hp: 4 }, units: [{ type: '矿兽', count: 3, hp: 2 }] },
      ai: { style: 'hold' },
      intro: [
        { who: 'warden', text: '别再往下挖了。再挖，你们就会看见我的脸。' },
        { who: 'shi', text: '另一支矿队已经疯了。他们开始朝声音走。' },
        { who: 'warden', text: '声音不是给活人听的。' }
      ],
      win: [{ who: 'shi', text: '它闭嘴了。矿洞第一次这么安静。' }],
      lose: [{ who: 'warden', text: '你们看见了我的脸。' }],
      lines: [{ when: 'bossKill', who: 'warden', text: '我的……矿……' }],
      tip: '矿主在地下；蓝方矿队会替你吸引一部分兽群。'
    },
    {
      id: 'mine-9', no: 9, name: '最后一层', en: 'THE LAST LAYER',
      brief: '最后一层没有退路。活到灯灭之前。',
      objective: { label: '在最后一层撑过 10 阵', conditions: [C('survive', { turn: 10 })] },
      enemy: { name: '另一支矿队', units: [{ type: '装甲车', count: 2 }, { type: '精锐战车', count: 2 }] },
      monsters: { units: [{ type: '矿兽', count: 3, hp: 2 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'shi', text: '这是最后一层。绳子到头了。' },
        { who: 'warden', text: '再往下，就是我的骨头。' },
        { who: 'shi', text: '另一支矿队也到了。他们比我们少两个人。' }
      ],
      win: [{ who: 'shi', text: '天亮了？不，是矿灯。可也够了。' }],
      lose: [{ who: 'warden', text: '最后一层，留给你们。' }],
      lines: [{ when: 'turn', turn: 7, who: 'shi', text: '岩壁在动。它们要一起上。' }],
      tip: '空间窄，三方挤在一起；让矿兽先咬蓝方。'
    },
    {
      id: 'mine-10', no: 10, name: '蛇骨深处', en: 'DEEP SERPENT BONE',
      brief: '矿主在深处等你。击倒它，并活到灯灭。',
      objective: { label: '击倒矿主并撑过 10 阵', conditions: [C('boss'), C('survive', { turn: 10 })] },
      openWalls: [[5,0],[5,4],[1,2],[9,2],[3,3],[7,3]],
      enemy: { name: '另一支矿队', units: [{ type: '精锐步兵', count: 2 }] },
      monsters: { name: '蛇骨矿主', boss: { type: '矿兽', name: '蛇骨矿主', side: 'monster', hp: 4 }, units: [{ type: '矿兽', count: 4, hp: 2 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'warden', text: '你们挖到了我的骨头。现在，把命留下。' },
        { who: 'shi', text: '另一支矿队已经退到井口。他们不想再往下。' },
        { who: 'warden', text: '他们比你聪明。' }
      ],
      win: [{ who: 'shi', text: '矿主倒了。矿洞还在长。' }],
      lose: [{ who: 'warden', text: '蛇骨深处，从不缺矿工。' }],
      lines: [{ when: 'bossKill', who: 'warden', text: '矿……还在……' }],
      tip: '矿主在地下；蓝方矿队只是第三方，不必全灭。'
    },
    {
      id: 'mine-11', no: 11, name: '矿车冲刺', en: 'CART RUSH',
      brief: '矿车会自己沿轨道冲。清掉挡路的矿兽，让它冲到井口。',
      openWalls: [[1,0],[5,0],[9,0],[1,2],[9,2],[3,3],[7,3]],
      minigame: { title: '矿车冲刺', noArmory: true, mineOnly: true, barrels: [[3,0],[7,0]], rule: '矿车每个回合自动前进一格；清掉挡路的矿兽。', autoEscort: { role: 'runner', toX: 10 } },
      objective: { label: '10 阵内护送矿车抵达井口', within: 10, conditions: [C('escort', { role: 'runner', x: 10, y: 0 })], failIf: [C('roleDead', { role: 'runner' }), C('cartWrecked')] },
      player: { resources: 8, roles: [{ type: '精锐战车', role: 'runner', x: 0, y: 0, displayName: '矿车', displayIcon: '🛒' }], units: [{ type: '步兵', count: 3 }] },
      enemy: { name: '另一支矿队', units: [{ type: '工兵', count: 2, role: 'saboteur' }] },
      monsters: { units: [{ type: '矿兽', count: 2, hp: 2 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'shi', text: '长官，矿车停不下来。它每一阵都会往井口冲。' },
        { who: 'warden', text: '轨道下面全是矿兽。冲过去，就是给它们送饭。' },
        { who: 'shi', text: '那就先把轨道清出来。' },
        { who: 'shi', text: '工兵会炸轨道；打炸药桶会十字爆炸；急刹车能停一阵。' }
      ],
      win: [{ who: 'shi', text: '矿车到井口了！晶簇也一起上来了。' }],
      lose: [{ who: 'warden', text: '矿车翻了。矿洞收下了它。' }],
      lines: [{ when: 'turn', turn: 4, who: 'shi', text: '矿车又往前冲了！前面有东西！' }],
      tip: '矿车会自动前进；挡路时停下，清掉轨道上的矿兽它才会继续冲。'
    },
    {
      id: 'mine-12', no: 12, name: '塌方的矿井', en: 'COLLAPSED SHAFT',
      brief: '只空投到矿洞单层。矿兽和岩壁把路分成单行道，凿开它。',
      minigame: { title: '塌方的矿井', noArmory: true, mineOnly: true, conveyor: { total: 30, first: 10, interval: 1, amount: 5, pool: ['步兵', '车', '炮兵', '地雷', '二阶步兵'] }, rule: '空投只落在矿洞单层；岩壁和矿兽挡住去路。' },
      objective: { label: '全歼蓝方', conditions: [C('eliminate')] },
      player: {},
      enemy: { name: '矿洞 · 守卫', units: [{ type: '精锐步兵', count: 2 }] },
      monsters: { units: [{ type: '矿兽', count: 4, hp: 2 }] },
      ai: { style: 'rush' },
      intro: [
        { who: 'shi', text: '长官！矿井坍塌了，运输机只能把补给扔在矿道里。' },
        { who: 'shi', text: '可前面的路被矿兽和岩壁堵死了！' },
        { who: 'shi', text: '不管扔下来什么，用它去杀穿矿兽，推平守卫，把路凿开！' }
      ],
      win: [{ who: 'shi', text: '凿穿了。这些物资就像是上帝给的锤子，我们硬是把这矿洞砸开了。' }],
      lose: [{ who: 'warden', text: '矿洞把你们留下了。' }],
      lines: [{ when: 'firstKill', who: 'shi', text: '好！干掉那只大虫子了！路通了！' }],
      tip: '空投只落矿洞；矿兽和岩壁会挡住单行道。'
    },
  ];

  const STORY_INTROS = {
    "classic-1": [
      {who:"narrator",text:"泥沼带第七周，雨把战壕泡成烂泥，联邦先遣队的履带声从雾里压过来。"},
      {who:"erin",text:"长官，三辆战车横成一排，工事顶在最前面，他们是在拿铁墙堵我们的路。"},
      {who:"commander",text:"铁墙也会生锈。步兵贴沟走，炮兵等他们停。"},
      {who:"hoke",text:"红虫子，欢迎来到不设防地带。你们的墓碑我提前挖好了。"},
      {who:"erin",text:"全单位就位，第一轮火力准备。"},
    ],
    "classic-2": [
      {who:"hoke",text:"我的炮兵连不会停，红虫子只配在炮火里爬。"},
      {who:"erin",text:"长官，炮兵缩在工事后面，步兵护着炮位，正面冲会被撕碎。"},
      {who:"commander",text:"别和对面的炮比嗓门。步兵分两路，摸到侧面再拔牙。"},
      {who:"enemy",text:"坐标修正，第二轮覆盖马上到。"},
      {who:"erin",text:"炮声一停就动，别给他们装填的时间。"},
    ],
    "classic-3": [
      {who:"narrator",text:"联邦倾巢出动，泥水被履带翻起，像整片沼泽都在移动。"},
      {who:"erin",text:"长官，我们的左翼只剩一个班，弹药也只够两轮。"},
      {who:"commander",text:"把伤员拖到后面，能站的都上前。今天守的不是阵地，是彼此的命。"},
      {who:"enemy",text:"他们撑不住了，压上去。"},
      {who:"erin",text:"无线电里全是杂音，但我听见他们还在报数。"},
    ],
    "classic-4": [
      {who:"hoke",text:"战损车先上。用废铁换你们的子弹，很划算。"},
      {who:"erin",text:"他们把坏车推到最前面，后面才是真正的战车和炮兵。"},
      {who:"commander",text:"别打铁壳，打履带和后面的眼睛。绞肉机也会卡刀。"},
      {who:"enemy",text:"第二排跟上，别让缺口合上。"},
      {who:"erin",text:"长官，前面全是火，我们真的要往里走吗？"},
    ],
    "classic-12": [
      {who:"narrator",text:"后方运输线被切断，天空只剩零星的降落伞。"},
      {who:"erin",text:"长官，总部只能按波次空投物资，第一批十费马上落地。"},
      {who:"commander",text:"没有部署，没有军火库。落地什么就用什么，省着打。"},
      {who:"hoke",text:"补给线断了的滋味如何？我等着看你们饿着肚子冲锋。"},
      {who:"erin",text:"第一批到了……怎么还有两个后勤兵？先收拢，别让他们白死。"},
    ],
    "classic-5": [
      {who:"erin",text:"长官，前方雷区连空地都埋了雷，排雷兵正在等信号。"},
      {who:"commander",text:"步兵贴着他走，火力压制右侧高墙，别让敌人抬头。"},
      {who:"enemy",text:"他们进雷区了，等中间那排响。"},
      {who:"erin",text:"排雷兵说引信是我们赤炎造的……这仗真够讽刺。"},
      {who:"commander",text:"讽刺留着战后写报告。现在把他的路清出来。"},
    ],
    "classic-6": [
      {who:"narrator",text:"高地没有水，没有路，地图上却被画成必须拿下的红圈。"},
      {who:"erin",text:"总部要我们占领高地，说谈判桌上需要一块高地。"},
      {who:"commander",text:"谈判桌需要的是死人名单。可命令就是命令，上去。"},
      {who:"hoke",text:"红虫子，你们又来送死了。高地下面是你们的坟。"},
      {who:"erin",text:"敌人把中心堵死了，我们从两侧摸。"},
    ],
    "classic-11": [
      {who:"erin",text:"长官，我们缴获了一门重炮，炮弹只有三发。"},
      {who:"commander",text:"让二阶步兵装填，十字火力留给最密的一波。别让炮成为靶子。"},
      {who:"hoke",text:"二阶步兵会一直往上填。看看你们的炮能撑多久。"},
      {who:"erin",text:"敌军从边缘压上来了，炮口先别急，等他们进十字。"},
      {who:"commander",text:"炮还在，阵地就还在。装填手就位。"},
    ],
    "classic-7": [
      {who:"enemy",text:"救命……车里还有人……救救我们……"},
      {who:"erin",text:"长官，是战损车在发求救信号，可后面有步兵在假装败退。"},
      {who:"commander",text:"这是诱饵。可我们不能不咬。步兵散开，先打后面的引线。"},
      {who:"hoke",text:"咬钩吧，红虫子。每一条命都是你们自己的选择。"},
      {who:"erin",text:"我听见包围圈合拢的声音了。"},
    ],
    "classic-8": [
      {who:"hoke",text:"精锐炮兵就位。把整片泥巴翻过来，看他们还怎么躲。"},
      {who:"erin",text:"长官，敌炮在后方疯狂轰炸，正面步兵只是诱饵。"},
      {who:"commander",text:"步兵吸引火力，侧面穿插。炮兵阵地不是铁桶，是人守的。"},
      {who:"enemy",text:"他们在往侧面动，拦不住。"},
      {who:"erin",text:"冲过去，别让炮口再抬起来。"},
    ],
    "classic-9": [
      {who:"narrator",text:"联邦全军压上，每隔两阵就有新的装甲车从雨幕里出现。"},
      {who:"erin",text:"长官，我们没有援军了，弹药只够撑到天亮。"},
      {who:"commander",text:"天亮之前，每一寸泥地都要用命换。把工事修在履带必经处。"},
      {who:"hoke",text:"你们已经赢了太多次。这次，我要看你们全部埋在这里。"},
      {who:"erin",text:"又一辆装甲车。它碾过我们最后一个雷区。"},
    ],
    "classic-10": [
      {who:"hoke",text:"我启动了自爆协议。这片泥沼就是你们的坟墓！"},
      {who:"erin",text:"全图无差别轰炸，长官，我们必须在他把我们埋掉前干掉他。"},
      {who:"commander",text:"所有人散开，炮兵找掩体，步兵跟我直插指挥车。"},
      {who:"hoke",text:"来不及了。你们的每一步，都在我的倒计时里。"},
      {who:"erin",text:"长官，他在笑……可他的车已经动不了了。"},
    ],
    "snow-1": [
      {who:"narrator",text:"雪原第一夜，白斗篷的狙击手连脚印都不留。"},
      {who:"leo",text:"冻死老子了，连口热酒都没有。长官，前面雪堆会动。"},
      {who:"dongniya",text:"白狼卫队从不留活口。你们踩进雪里的每一步，我都看得见。"},
      {who:"commander",text:"别追影子。把车横过来挡风，步兵贴车走。"},
      {who:"leo",text:"看见枪口焰了，在左前方雪坑。"},
    ],
    "snow-2": [
      {who:"leo",text:"敌方战车过来了，我们跑不过履带，只能借暴风雪遮眼。"},
      {who:"dongniya",text:"风雪会替我们收尸。你们连方向都找不到。"},
      {who:"commander",text:"炮兵先打头车，步兵从侧翼切他们的队形。"},
      {who:"enemy",text:"他们想借雪雾靠近。"},
      {who:"leo",text:"风小了，趁现在动，快。"},
    ],
    "snow-3": [
      {who:"leo",text:"长官，报务员快冻僵了。他不能死，不然撤退命令都收不到。"},
      {who:"commander",text:"用步兵围住他，别让白狼的狙击手找到角度。"},
      {who:"dongniya",text:"一个报务员，值得你们死这么多人吗？"},
      {who:"leo",text:"值得。他活着，我们才能回家。"},
      {who:"commander",text:"所有人，护住那盏电台。"},
    ],
    "snow-4": [
      {who:"leo",text:"前面有敌人的小股部队。太安静了，这绝对是诱饵。"},
      {who:"commander",text:"雷埋在雪下面，车别走直线。步兵先探两侧。"},
      {who:"dongniya",text:"你们踩碎的第一个雪壳，就是你们的墓。"},
      {who:"leo",text:"我看见凹陷里的引线了，绕过去。"},
      {who:"commander",text:"绕过去，然后从他们背后把陷阱拆了。"},
    ],
    "snow-5": [
      {who:"narrator",text:"大雪把山口填平，敌我各占半边，谁先动谁先暴露。"},
      {who:"leo",text:"长官，路封了。炮兵看不见目标，车也上不去。"},
      {who:"commander",text:"那就用步兵爬。雪是掩体，也是坟。"},
      {who:"dongniya",text:"你们在雪里喘气的声音，我隔着山口都听得见。"},
      {who:"leo",text:"左边雪坡松了，要塌。"},
    ],
    "snow-11": [
      {who:"leo",text:"长官，雪橇停不下来，它每一阵都会往前滑。"},
      {who:"commander",text:"前面全是白狼的人，清掉挡路的，别让雪橇撞上二阶步兵。"},
      {who:"dongniya",text:"那东西滑得再快，也快不过我的剑。"},
      {who:"leo",text:"雪橇撞到步兵不会停，可二阶步兵会替它挡伤害。"},
      {who:"commander",text:"上雪橇，我们走。"},
    ],
    "snow-6": [
      {who:"leo",text:"装甲车顶在前面，精锐战车想从侧翼绕，别让他们展开。"},
      {who:"commander",text:"把车放在雪脊后面，放他们进来再打。"},
      {who:"dongniya",text:"你们以为雪地会替你们挡炮吗？"},
      {who:"leo",text:"他们的侧翼动了，比雪崩还快。"},
      {who:"commander",text:"稳住，等履带进射程。"},
    ],
    "snow-7": [
      {who:"leo",text:"我们的补给点被盯上了。长官，退无可退，抢回控制权！"},
      {who:"commander",text:"先夺仓库，再清周围的炮。别让他们把雪烧成泥。"},
      {who:"dongniya",text:"补给站的火，正好照见你们的死。"},
      {who:"leo",text:"我闻到燃油了，他们准备烧仓。"},
      {who:"commander",text:"那就让他们烧自己的退路。"},
    ],
    "snow-12": [
      {who:"leo",text:"这鬼天气把运输机全拦在外面，只能靠不要命的飞行员往下扔。"},
      {who:"commander",text:"按波次收拢空投，暴风雪会让这一批多出五费。"},
      {who:"dongniya",text:"雪会埋掉你们的补给，也会埋掉你们的尸体。"},
      {who:"leo",text:"第一批到了！风太大，箱子全散在冰面上。"},
      {who:"commander",text:"散开就散开。捡起来，继续打。"},
    ],
    "snow-8": [
      {who:"dongniya",text:"赤炎的杂碎。我是白狼卫队的冬妮娅，我的剑不斩无名之辈。"},
      {who:"commander",text:"她坐镇后方，装甲车阵线强推，先破阵再斩首。"},
      {who:"leo",text:"她的手冻伤了，可她的剑比冰还稳。"},
      {who:"dongniya",text:"你们连我的名字都不配记住。"},
      {who:"commander",text:"记住她的位置。炮兵准备。"},
    ],
    "snow-9": [
      {who:"leo",text:"长官，我们没有援军了。但我们必须守住。"},
      {who:"commander",text:"把每一辆车都当成最后一道墙，把每一个伤员都带下去。"},
      {who:"dongniya",text:"长城不是墙，是你们用尸体堆出来的线。"},
      {who:"leo",text:"他们又上来了，比雪崩还密。"},
      {who:"commander",text:"那就让他们埋在我们前面。"},
    ],
    "snow-10": [
      {who:"narrator",text:"初阳升起，雪原被照成血色。这是最后一阵。"},
      {who:"dongniya",text:"最后的一战。赤炎的红，白雪的白，谁会留下痕迹？"},
      {who:"leo",text:"长官，她身后还有两个装甲连。我们没退路了。"},
      {who:"commander",text:"把炮兵推到左翼，车跟我冲。今天结束这场战争。"},
      {who:"dongniya",text:"来吧。让我看看你们的血有多热。"},
    ],
    "pirate-1": [
      {who:"kidd",text:"头儿，巴博萨把湾口封了，海炮全架着，冲过去骨头都给你扬了。"},
      {who:"babosa",text:"在海上，我就是规则。你们连第一波浪都过不去。"},
      {who:"commander",text:"快艇从小路摸过去，端掉他们的据点，海炮我来压。"},
      {who:"kidd",text:"抢到了！里面有一箱朗姆酒……等等，水底下有东西。"},
      {who:"babosa",text:"喝吧，喝完就该沉了。"},
    ],
    "pirate-2": [
      {who:"babosa",text:"哈哈哈！漩涡会替我收拾你们，连渣都不剩。"},
      {who:"kidd",text:"海里有漩涡！别撞进去，撞进去连船带人一起没。"},
      {who:"commander",text:"船队散开，海炮平射，逼他们自己进漩涡。"},
      {who:"kidd",text:"他们的船被吸住了！头儿，现在打！"},
      {who:"babosa",text:"你们的运气，到此为止。"},
    ],
    "pirate-3": [
      {who:"kidd",text:"这批货值十条船，头儿，我们从快艇上顺过去。"},
      {who:"commander",text:"货要拿，人也要活着回来。别让岸上的炮封住退路。"},
      {who:"babosa",text:"走私者的末路，就是替我的货陪葬。"},
      {who:"kidd",text:"箱子里全是金币，可岸上的炮口全转过来了。"},
      {who:"commander",text:"放弃金币，先夺炮位。"},
    ],
    "pirate-12": [
      {who:"kidd",text:"头儿，这片海域全是敌舰队，大船进不来，只能靠走私船偷偷空投。"},
      {who:"commander",text:"第一批有船有炮，后面只有步兵和海炮，省着用。"},
      {who:"babosa",text:"用空投打我？你们连我的甲板都摸不到。"},
      {who:"kidd",text:"第一批到了！有炮！后面的补给……怎么全是旱鸭子？"},
      {who:"commander",text:"抢两个据点，守住，再谈撤退。"},
    ],
    "pirate-4": [
      {who:"kidd",text:"完了，快艇全被打搁浅了，我们只能从浅滩走过去。"},
      {who:"commander",text:"用海炮还击，步兵贴着残骸推进，别停在开阔地。"},
      {who:"babosa",text:"搁浅的船，就是你们的棺材。"},
      {who:"kidd",text:"炮口转过来了，趴下！"},
      {who:"commander",text:"趁他们装填，冲上去。"},
    ],
    "pirate-5": [
      {who:"kidd",text:"头儿，甲板上全是雷，这帮海盗连自己人都不放过。"},
      {who:"commander",text:"排雷兵先上，步兵踩他的脚印走。别跑。"},
      {who:"babosa",text:"每一步都算好了。你们能走到我面前吗？"},
      {who:"kidd",text:"排完了，前面就是巴博萨的旗舰。"},
      {who:"commander",text:"那就上船，结束这场游戏。"},
    ],
    "pirate-6": [
      {who:"kidd",text:"酒馆里全是叛徒，杀掉头目，剩下的人就会鸟兽散。"},
      {who:"babosa",text:"叛徒比敌人更懂怎么捅刀子。"},
      {who:"commander",text:"堵住后门，别让头目跑了。"},
      {who:"kidd",text:"酒馆归我们了。这酒……有点血腥味。"},
      {who:"commander",text:"喝完这杯，下一站是旗舰。"},
    ],
    "pirate-11": [
      {who:"kidd",text:"敌方的快艇全下水了，我们的海炮只能在列0轨道上上下移动。"},
      {who:"commander",text:"守住甲板，别让任何一艘靠岸。海炮打同行，步兵补漏。"},
      {who:"babosa",text:"你们的老炮，能打几艘？"},
      {who:"kidd",text:"左侧！快艇！调转海炮！"},
      {who:"commander",text:"别让他们上岸，一艘都不行。"},
    ],
    "pirate-7": [
      {who:"kidd",text:"巴博萨把手下全派出来了，今天在水上决一死战，撞沉他们。"},
      {who:"babosa",text:"沉吧，全沉吧！海里不缺你们的木头。"},
      {who:"commander",text:"船头对准敌船，海炮先打帆，再撞。"},
      {who:"kidd",text:"他们的队形乱了！头儿，冲！"},
      {who:"babosa",text:"你们以为赢了？海水会记住每一块木板。"},
    ],
    "pirate-8": [
      {who:"kidd",text:"头儿，没风了，快艇动不了，只能靠海炮平射掩护步兵登船。"},
      {who:"babosa",text:"无风带里，连你们的呼吸都传不出去。"},
      {who:"commander",text:"步兵分批登船，海炮压住甲板。"},
      {who:"kidd",text:"他们从船底摸上来了！"},
      {who:"commander",text:"转身，近战。"},
    ],
    "pirate-9": [
      {who:"kidd",text:"海面越来越黑，水手说看见海怪了。我们得赶在被吃掉前干掉巴博萨。"},
      {who:"babosa",text:"海怪已经醒了，它先吃你们，再吃我。"},
      {who:"commander",text:"集中火力打旗舰，别管海里的影子。"},
      {who:"kidd",text:"触手！右舷！它把船拖住了！"},
      {who:"commander",text:"砍断缆绳，继续打。"},
    ],
    "pirate-10": [
      {who:"babosa",text:"你们以为赢了？海怪已经醒了，这就是我的复仇！"},
      {who:"kidd",text:"巴博萨疯了，他在把海怪引过来，必须赶在海怪靠岸前干掉他。"},
      {who:"commander",text:"所有炮口对准旗舰，步兵准备接舷。"},
      {who:"babosa",text:"金币就在海底，你们下去拿吧。"},
      {who:"kidd",text:"他倒了……头儿，我想上岸。这海太腥了。"},
    ],
    "fog-1": [
      {who:"narrator",text:"雾夜，九座墓碑立在村口，罗盘在雾里疯狂旋转。"},
      {who:"sesis",text:"长官，那些蓝方士兵连呼吸声都没有。这不是战场。"},
      {who:"commander",text:"先站稳，别追声音，别回头。"},
      {who:"general",text:"活人……多久没见过活人了。"},
      {who:"sesis",text:"别回答他，回答就会被记住。"},
    ],
    "fog-2": [
      {who:"sesis",text:"墓碑在数数，每一声都多一座。得去触碰那些鬼魂，收集灵魂的碎片。"},
      {who:"commander",text:"步兵散开，别让鬼魂围住。"},
      {who:"general",text:"你们碰的不是鬼魂，是别人的命。"},
      {who:"sesis",text:"那些碎片亮了一点，可雾更浓了。"},
      {who:"commander",text:"继续走，别停。"},
    ],
    "fog-3": [
      {who:"sesis",text:"执灯士在雾里会遭到鬼魂疯狂攻击，我们必须用人墙护住他。"},
      {who:"commander",text:"前排举盾，后排跟上，灯不能灭。"},
      {who:"general",text:"灯灭了，你们就都留下。"},
      {who:"sesis",text:"鬼魂扑上来了，护住灯！"},
      {who:"commander",text:"别退，退一步灯就暗一分。"},
    ],
    "fog-11": [
      {who:"sesis",text:"这里的雾太重，普通火光照不亮路，只有执灯士的灯能驱散幻象。"},
      {who:"commander",text:"让执灯士走前面，他照到哪，我们走到哪。"},
      {who:"general",text:"路是假的，灯也是假的。"},
      {who:"sesis",text:"执灯士踩错了一步……雾里有脚步声！"},
      {who:"commander",text:"回到灯下，别散开。"},
    ],
    "fog-4": [
      {who:"sesis",text:"雾夜快转初晖了，必须在这之前摧毁至少五座墓碑。"},
      {who:"commander",text:"分组拆碑，别让鬼魂合围。"},
      {who:"general",text:"墓碑是我的兵，你们拆一座，我就多一座。"},
      {who:"sesis",text:"阳光快出来了，可它没有温度。"},
      {who:"commander",text:"最后一座，动手。"},
    ],
    "fog-5": [
      {who:"sesis",text:"别踩那些发亮的地方，看似空地，其实藏着鬼魂。"},
      {who:"commander",text:"用诱饵引它们显形，步兵再动手。"},
      {who:"general",text:"你们踩的每一步，我都看着。"},
      {who:"sesis",text:"五个敌人踩中了鬼魂，雾里全是尖叫。"},
      {who:"commander",text:"趁现在，推进。"},
    ],
    "fog-6": [
      {who:"sesis",text:"执灯士能秒杀鬼魂，但他自己也会成为活靶子。"},
      {who:"commander",text:"把他围在中间，用命换他多走一步。"},
      {who:"general",text:"灯照得越远，你们死得越快。"},
      {who:"sesis",text:"他笑了……那个提灯的人对我笑了。"},
      {who:"commander",text:"别看他的脸，看路。"},
    ],
    "fog-7": [
      {who:"sesis",text:"雾夜固化在中央区，进去的单位会产生幻觉。"},
      {who:"commander",text:"用绳子连住每个人，看到什么都不许追。"},
      {who:"general",text:"你们看到的母亲、战友、家乡，都是我的。"},
      {who:"sesis",text:"我看见了死去的母亲……她让我跟她走。"},
      {who:"commander",text:"拉紧绳子，把他拖回来！"},
    ],
    "fog-12": [
      {who:"sesis",text:"这雾太重，空投员看不清航线，只能盲投。总物资很少。"},
      {who:"commander",text:"每一波至少会有一个执灯士，护住他，用步兵踩鬼魂。"},
      {who:"general",text:"空投下来的，是活人还是祭品？"},
      {who:"sesis",text:"物资到了！有灯！可鬼魂也跟着落下来了。"},
      {who:"commander",text:"收拢灯，清出落脚点。"},
    ],
    "fog-8": [
      {who:"sesis",text:"钟声快敲到第十二下，雾会封锁这里，墓碑会补满全场。"},
      {who:"commander",text:"在钟声结束前全歼人类敌军，别和鬼魂纠缠。"},
      {who:"general",text:"钟声一响，你们就是新的墓碑。"},
      {who:"sesis",text:"第十一下……长官，雾在收拢。"},
      {who:"commander",text:"最后一下之前，结束战斗。"},
    ],
    "fog-9": [
      {who:"sesis",text:"那是旧时代的将军，他还在指挥死去的士兵。"},
      {who:"general",text:"我的兵没有死，他们只是换了一种站法。"},
      {who:"commander",text:"杀了他，送他安息。"},
      {who:"sesis",text:"他倒下了，所有墓碑都在颤抖。"},
      {who:"commander",text:"天快亮了，继续走。"},
    ],
    "fog-10": [
      {who:"sesis",text:"天要亮了，这是最后一次雾夜。用所有执灯卡冲出去。"},
      {who:"general",text:"天亮之后，你们会忘记我们。"},
      {who:"commander",text:"不会忘。走。"},
      {who:"sesis",text:"阳光出来了……地上全是普通木桩。"},
      {who:"commander",text:"这村子早就空了，只有我们陪鬼魂玩了一夜。"},
    ],
    "wannan-1": [
      {who:"lykos",text:"雅典的前哨在边界上晃，波斯的骑兵在更后面。"},
      {who:"helen",text:"雅典只是来看看斯巴达的盾还立不立得住。"},
      {who:"arta",text:"波斯只关心谁先流血。"},
      {who:"commander",text:"都别动。谁先眨眼，谁就输一半。"},
      {who:"lykos",text:"那就让他们看。"},
    ],
    "wannan-2": [
      {who:"arta",text:"波斯的炮不认城邦，谁站中间谁先碎。"},
      {who:"lykos",text:"雅典不介意看我们互相消耗。"},
      {who:"helen",text:"那就先让波斯的炮闭嘴。"},
      {who:"commander",text:"步兵分两路，别让炮口转过来。"},
      {who:"lykos",text:"炮哑了，波斯人开始谈误会。"},
    ],
    "wannan-3": [
      {who:"helen",text:"集市是雅典的，你们把旗插在那里，商路就断了。"},
      {who:"lykos",text:"商路断了还能再开，旗倒了人心就散。"},
      {who:"arta",text:"波斯只关心谁收税。"},
      {who:"commander",text:"把斯巴达的旗立到中心，别伤商贩。"},
      {who:"lykos",text:"旗立住了，集市换了收税的人。"},
    ],
    "wannan-4": [
      {who:"lykos",text:"雅典人把车推上来了，盾墙列好。"},
      {who:"helen",text:"这不是冲锋，是测量斯巴达还能站多久。"},
      {who:"arta",text:"量吧，量到车轴断掉。"},
      {who:"commander",text:"别追车，砍车轴，放他们回去报信。"},
      {who:"lykos",text:"盾还在，人也在。斯巴达的规矩。"},
    ],
    "wannan-5": [
      {who:"lykos",text:"今晚之后，雅典和斯巴达就不再是盟友了。"},
      {who:"helen",text:"波斯从来没说过自己是盟友。"},
      {who:"arta",text:"那就都别睡。"},
      {who:"commander",text:"火把亮着，谁先动谁先燃。守住这一夜。"},
      {who:"lykos",text:"天亮了，事变还是来了。"},
    ],
    "wannan-11": [
      {who:"lykos",text:"中间两个督军在看戏。我们和雅典签了协议，期限内不能动手。"},
      {who:"helen",text:"可你看雅典的部队，都快贴到我们脸上了。"},
      {who:"arta",text:"督军在看，我在等。等你们先撕破脸。"},
      {who:"commander",text:"前两阵只打督军，第三阵雅典会撕毁协议。"},
      {who:"lykos",text:"面具撕了，督军也倒了。斯巴达还站着。"},
    ],
    "wannan-6": [
      {who:"helen",text:"城门后面是雅典的粮仓。你们要的从来不是城，是粮。"},
      {who:"lykos",text:"粮仓前面是炮。先拔炮，再谈粮。"},
      {who:"arta",text:"波斯可以等，等你们把粮仓打空。"},
      {who:"commander",text:"步兵贴墙，炮兵压制，别碰粮仓。"},
      {who:"lykos",text:"炮停了，城门开了。"},
    ],
    "wannan-7": [
      {who:"arta",text:"三城的旗都倒了才好，这样波斯就不用选了。"},
      {who:"helen",text:"雅典不想赢，只想比你们晚一点倒。"},
      {who:"lykos",text:"那就都别倒，站到最后的人说话。"},
      {who:"commander",text:"别追一路，保持阵型，谁露头打谁。"},
      {who:"lykos",text:"三方都还在，但至少我们没先倒。"},
    ],
    "wannan-12": [
      {who:"lykos",text:"斯巴达的部队在这里，左边波斯督军，右边雅典盟友。"},
      {who:"helen",text:"我们的补给线被切断，只能靠零星空投。"},
      {who:"arta",text:"空投？你们连自己人都喂不饱。"},
      {who:"commander",text:"先利用空投打波斯，第三阵雅典会从右侧背刺。"},
      {who:"lykos",text:"我们活下来了。雅典的背刺比波斯的刀还疼。"},
    ],
    "wannan-8": [
      {who:"helen",text:"卫城不是战场，你们非要把它变成战场。"},
      {who:"lykos",text:"将军站在最高处，看得见所有人的死。"},
      {who:"arta",text:"也看得见你们怎么上来。"},
      {who:"commander",text:"分三路爬，别让他们把台阶封死。"},
      {who:"lykos",text:"将军倒了，卫城的钟还在响。"},
    ],
    "wannan-9": [
      {who:"arta",text:"波斯不带走战利品，只带走下一次战争的本钱。"},
      {who:"lykos",text:"那就把本钱留下。"},
      {who:"helen",text:"雅典可以帮你们，如果分我们一半。"},
      {who:"commander",text:"先截车队，再谈分账。"},
      {who:"lykos",text:"车队留下了，波斯人跑得比马还快。"},
    ],
    "wannan-10": [
      {who:"arta",text:"三城之盟？盟约只在波斯需要的时候存在。"},
      {who:"helen",text:"雅典只想知道，盟约烧完之后还剩什么。"},
      {who:"lykos",text:"剩斯巴达的盾，和波斯人的尸体。"},
      {who:"commander",text:"阿尔塔亲自压阵，击倒他，撑到最后。"},
      {who:"lykos",text:"阿尔塔走了。盟约也许还能再写一页。"},
    ],
    "holy-1": [
      {who:"sera",text:"长官，天边裂开一道光，光里有东西在动。"},
      {who:"commander",text:"先站稳，别急着追光。"},
      {who:"orion",text:"你们追的不是光，是圣殿的诱饵。"},
      {who:"sera",text:"三处圣辉之光正在落下，先让它们归位。"},
      {who:"commander",text:"分三队，别让堕落者先碰到光。"},
    ],
    "holy-2": [
      {who:"sera",text:"天空裂开时，地面上的人只能抬头等死。"},
      {who:"commander",text:"上面和下面会同时开火，别看漏头顶。"},
      {who:"orion",text:"你们抬头的时候，脚下已经空了。"},
      {who:"sera",text:"两层战场同时压下来，先稳住地面。"},
      {who:"commander",text:"天空交给龙骑，地面跟我走。"},
    ],
    "holy-3": [
      {who:"sera",text:"那道龙影在移动，站到光里才能看见另一层战场。"},
      {who:"commander",text:"升空不是目的，把光留在我们这边。"},
      {who:"orion",text:"龙影会替圣殿清理不听话的人。"},
      {who:"sera",text:"龙影聚成了光，天空单位准备升空。"},
      {who:"commander",text:"别追龙，守住光柱。"},
    ],
    "holy-4": [
      {who:"sera",text:"火山在中间，绕过去或者从上面飞过去。"},
      {who:"commander",text:"绕。能走的路就别飞，火山在响。"},
      {who:"orion",text:"火山不会挑人，圣殿也不会。"},
      {who:"sera",text:"中央三格完全封死，别挤在同一片地方。"},
      {who:"commander",text:"左右分开，逼他们进火山口。"},
    ],
    "holy-11": [
      {who:"sera",text:"这片焦土会吞噬一切，敌人的狂热让他们不怕死。"},
      {who:"commander",text:"纯地面，没有天空。中央火山不可通行，利用它卡位。"},
      {who:"orion",text:"那个审判官有最好的战甲，跑得比普通步兵快。"},
      {who:"sera",text:"把他逼进火里，让圣光净化异端。"},
      {who:"commander",text:"守住六阵，击杀审判官。"},
    ],
    "holy-5": [
      {who:"sera",text:"圣辉不是白给的，站得越久烧得越疼。"},
      {who:"commander",text:"那就快一点，别在同一片光里停太久。"},
      {who:"orion",text:"光会挑人，也会烧掉不配的人。"},
      {who:"sera",text:"五点圣辉，圣殿已经认了我们。"},
      {who:"commander",text:"继续压，别让圣辉断掉。"},
    ],
    "holy-6": [
      {who:"orion",text:"圣殿的门只对死人开。我在门后等了很多年。"},
      {who:"sera",text:"他退了，门还开着。"},
      {who:"commander",text:"别追进光里，先把门外的铁清掉。"},
      {who:"sera",text:"奥里昂的甲上有圣辉，也有血。"},
      {who:"commander",text:"那就送他最后一次安息。"},
    ],
    "holy-7": [
      {who:"sera",text:"云层后面全是炮，升空之前先想好怎么下来。"},
      {who:"commander",text:"不下来也行，把炮打掉。"},
      {who:"orion",text:"天空是我们的，你们只是借云逃命。"},
      {who:"sera",text:"龙骑升空，地面炮兵压制。"},
      {who:"commander",text:"天空安静之前，谁都不许退。"},
    ],
    "holy-12": [
      {who:"sera",text:"我们的火炮打不穿龟壳，防空炮又锁死低空。"},
      {who:"commander",text:"让侦察兵上去标记，地面二阶拆防空塔，投弹兵收尾。"},
      {who:"orion",text:"你们抬头看天的时候，地面已经在流血。"},
      {who:"sera",text:"侦察兵被盯上了！别停在一个地方。"},
      {who:"commander",text:"标记所有目标，呼叫投弹。"},
    ],
    "holy-8": [
      {who:"sera",text:"门后有光也有铁，先活下来再谈进去。"},
      {who:"commander",text:"铁挡不住人。步兵分两列，炮兵压门。"},
      {who:"orion",text:"门不会等你们，光也不会。"},
      {who:"sera",text:"门开了，光比我们想的冷。"},
      {who:"commander",text:"进去，别回头看。"},
    ],
    "holy-9": [
      {who:"sera",text:"天火会烧掉所有站着不动的人。"},
      {who:"commander",text:"那就别停，散开，别让火找到一堆人。"},
      {who:"orion",text:"光落下来，你们连灰都不会剩。"},
      {who:"sera",text:"六点圣辉！天火停了！"},
      {who:"commander",text:"趁现在，把圣殿围住。"},
    ],
    "holy-10": [
      {who:"sera",text:"最后一战，光归谁，谁就写历史。"},
      {who:"orion",text:"圣辉会记住每一个名字，不管站在哪一边。"},
      {who:"commander",text:"那就开始，别让名字白写。"},
      {who:"sera",text:"奥里昂在光里，他的剑比太阳还亮。"},
      {who:"commander",text:"全军压上，结束这场圣战。"},
    ],
    "mine-1": [
      {who:"shi",text:"井口的风是冷的，下面的东西不喜欢活人。"},
      {who:"commander",text:"先在地面站稳，别急着下井。"},
      {who:"warden",text:"上面的人，别再往下挖了。"},
      {who:"shi",text:"另一支矿队也来了，他们不是来帮我们的。"},
      {who:"commander",text:"守住井口，然后往下走。"},
    ],
    "mine-2": [
      {who:"shi",text:"矿脉在发光，光下面有东西在动。"},
      {who:"warden",text:"那是我的矿兽，你们挖到了它们的窝。"},
      {who:"commander",text:"另一支矿队也在往里钻，让他们先钻。"},
      {who:"shi",text:"矿兽退了，矿脉还在。"},
      {who:"commander",text:"继续下，别贪晶簇。"},
    ],
    "mine-3": [
      {who:"shi",text:"上面要塌了，石头不认识人，也不认识矿兽。"},
      {who:"commander",text:"塌下来谁都得埋，让另一支矿队先站在下面。"},
      {who:"warden",text:"石头停了，你们还站着。"},
      {who:"shi",text:"又一阵碎石声，快走。"},
      {who:"commander",text:"别停，往竖井口撤。"},
    ],
    "mine-12": [
      {who:"shi",text:"矿井坍塌了，运输机只能把补给扔在矿道里。"},
      {who:"commander",text:"前面被矿兽和岩壁堵死，不管扔下什么，都用它凿路。"},
      {who:"warden",text:"我的矿兽会替我把你们埋回去。"},
      {who:"shi",text:"补给到了，有步兵，也有地雷。"},
      {who:"commander",text:"杀穿矿兽，推平守卫，把路凿开。"},
    ],
    "mine-4": [
      {who:"shi",text:"晶簇能换钱，也能把矿兽引来。"},
      {who:"commander",text:"它们不是被光引来的，是被声音引来的。别乱开枪。"},
      {who:"warden",text:"另一支矿队也在抢，让他们抢，兽群会先找他们。"},
      {who:"shi",text:"晶簇归我们，矿兽也躺下了。"},
      {who:"commander",text:"收拾战利品，继续往下。"},
    ],
    "mine-5": [
      {who:"shi",text:"矿兽不认路，只认活人的味道，它堵在井口。"},
      {who:"commander",text:"另一支矿队不敢动，你们谁先动它先吃谁。"},
      {who:"warden",text:"我的看门兽，够你们拆一阵。"},
      {who:"shi",text:"它倒了，竖井口开了。"},
      {who:"commander",text:"下井，快。"},
    ],
    "mine-11": [
      {who:"shi",text:"矿车停不下来，每一阵都往井口冲，轨道下面全是矿兽。"},
      {who:"commander",text:"工兵会炸轨道，打炸药桶会十字爆炸，急刹车能停一阵。"},
      {who:"warden",text:"矿车会替我把你们一起送进井口。"},
      {who:"shi",text:"前面轨道塌了！矿车要撞上了。"},
      {who:"commander",text:"清轨道，别让矿车停在不该停的地方。"},
    ],
    "mine-6": [
      {who:"shi",text:"水漫上来时别往下走，矿洞会把活人拖进暗河。"},
      {who:"commander",text:"另一支矿队已经往高处爬了，我们也走。"},
      {who:"warden",text:"暗河下面还有我的东西在等。"},
      {who:"shi",text:"水退了，我们还在这层。"},
      {who:"commander",text:"继续下，别回头。"},
    ],
    "mine-7": [
      {who:"shi",text:"蛇骨守卫不会退，它们的骨头是车轴做的。"},
      {who:"commander",text:"你们听到的每一声，都是它们在数人。"},
      {who:"warden",text:"另一支矿队也在里面，让他们先数。"},
      {who:"shi",text:"兽群散了，矿道安静了。"},
      {who:"commander",text:"走，别踩骨头。"},
    ],
    "mine-8": [
      {who:"warden",text:"别再往下挖了，再挖你们就会看见我的脸。"},
      {who:"shi",text:"另一支矿队已经疯了，他们开始朝声音走。"},
      {who:"commander",text:"声音不是给活人听的，堵住耳朵。"},
      {who:"warden",text:"它闭嘴了，矿洞第一次这么安静。"},
      {who:"shi",text:"可我还是听见有人在数数。"},
    ],
    "mine-9": [
      {who:"shi",text:"这是最后一层，绳子到头了。"},
      {who:"commander",text:"再往下就是矿主的骨头，另一支矿队也到了。"},
      {who:"warden",text:"你们挖到了我的门口。"},
      {who:"shi",text:"灯还亮着，可也快灭了。"},
      {who:"commander",text:"那就用最后一段路，结束它。"},
    ],
    "mine-10": [
      {who:"warden",text:"你们挖到了我的骨头，现在把命留下。"},
      {who:"shi",text:"另一支矿队已经退到井口，他们不想再往下。"},
      {who:"commander",text:"他们比你聪明，可我们没有退路。"},
      {who:"warden",text:"矿主倒了，矿洞还在长。"},
      {who:"shi",text:"天亮了？不，是矿灯。可也够了。"},
    ],
  };

  const LEVEL_ORDER = {
    classic: ['classic-1','classic-2','classic-3','classic-4','classic-12','classic-5','classic-6','classic-11','classic-7','classic-8','classic-9','classic-10'],
    snow: ['snow-1','snow-2','snow-3','snow-4','snow-5','snow-11','snow-6','snow-7','snow-12','snow-8','snow-9','snow-10'],
    pirate: ['pirate-1','pirate-2','pirate-3','pirate-12','pirate-4','pirate-5','pirate-6','pirate-11','pirate-7','pirate-8','pirate-9','pirate-10'],
    fog: ['fog-1','fog-2','fog-3','fog-11','fog-4','fog-5','fog-6','fog-7','fog-12','fog-8','fog-9','fog-10'],
    wannan: ['wannan-1','wannan-2','wannan-3','wannan-4','wannan-5','wannan-11','wannan-6','wannan-7','wannan-12','wannan-8','wannan-9','wannan-10'],
    holy: ['holy-1','holy-2','holy-3','holy-4','holy-11','holy-5','holy-6','holy-7','holy-12','holy-8','holy-9','holy-10'],
    mine: ['mine-1','mine-2','mine-3','mine-12','mine-4','mine-5','mine-11','mine-6','mine-7','mine-8','mine-9','mine-10']
  };
  const LEVELS = [].concat(CLASSIC, SNOW, PIRATE, FOG, WANNAN, HOLY, MINE).map(level => {
    const mode = level.id.split('-')[0];
    const campaign = CAMPAIGNS[mode];
    const orderIndex=(LEVEL_ORDER[mode]||[]).indexOf(level.id);
    return Object.assign({}, level, {
      order: orderIndex>=0?orderIndex:level.no-1,
      mode,
      campaign: campaign.mode,
      campaignTitle: campaign.title,
      enemy: Object.assign({ name: '敌军' }, level.enemy),
      player: level.player || {},
      ai: level.ai || {},
      lines: level.lines || [],
      intro: STORY_INTROS[level.id] || level.intro || [],
      win: level.win || [],
      lose: level.lose || []
    });
  }).sort((a,b)=>MODE_ORDER.indexOf(a.mode)-MODE_ORDER.indexOf(b.mode)||a.order-b.order);
  const levelNoCounters={};
  for(const l of LEVELS){
    const c=levelNoCounters[l.mode]||(levelNoCounters[l.mode]={main:0,side:0});
    if(l.minigame)l.no=['α','β'][c.side++]||('γ'+c.side);
    else l.no=++c.main;
  }

  const LEVEL_MAP = Object.fromEntries(LEVELS.map(l => [l.id, l]));

  function getLevel(id) { return LEVEL_MAP[id] || null; }
  function levelsForMode(mode) { return LEVELS.filter(l => l.mode === mode); }
  function nextLevel(level) {
    if (!level) return null;
    const same = levelsForMode(level.mode);
    const idx = same.findIndex(l => l.id === level.id);
    if (idx >= 0 && idx + 1 < same.length) return same[idx + 1];
    const modeIdx = MODE_ORDER.indexOf(level.mode);
    for (let i = modeIdx + 1; i < MODE_ORDER.length; i++) {
      const first = levelsForMode(MODE_ORDER[i])[0];
      if (first) return first;
    }
    return null;
  }

  function objectiveText(obj) { return (obj && obj.label) || '完成任务'; }

  const DIFF_WEIGHTS = {
    '步兵': 1, '精锐步兵': 2, '二阶步兵': 2, '后勤兵': 1.5, '排雷兵': 1.5,
    '车': 4, '精锐战车': 5, '装甲车': 6, '战损车': 2.5,
    '炮兵': 3, '精锐炮兵': 4, '双发炮兵': 5, '海炮': 3, '精锐海炮': 4,
    '地雷': 1, '防御工事': 1, '陷阱工事': 2
  };
  function levelThreat(level) {
    let score = 0;
    (level.enemy && level.enemy.units || []).forEach(g => { score += (DIFF_WEIGHTS[g.type] || 1) * (g.count || 1); });
    if (level.enemy && level.enemy.boss) score += 6;
    return score;
  }
  /** 1–5 星：按蓝方威胁、时限、保护/护送/据点等压力粗算。 */
  function levelDifficulty(level) {
    if (!level) return 3;
    const threat = levelThreat(level);
    let d = threat >= 48 ? 5 : threat >= 38 ? 4 : threat >= 28 ? 3 : threat >= 18 ? 2 : 1;
    const conds = (level.objective && level.objective.conditions) || [];
    if (level.objective && level.objective.within) {
      if (level.objective.within <= 5) d += 1;
      else if (level.objective.within <= 8) d += 0.5;
    }
    if (level.objective && level.objective.failIf) d += 0.4;
    if (conds.some(c => ['protect', 'escort', 'capture', 'noLanding'].includes(c.type))) d += 0.3;
    if (conds.some(c => c.type === 'survive') && !conds.some(c => c.type === 'boss')) d -= 0.3;
    return Math.max(1, Math.min(5, Math.round(d)));
  }

  function condMet(c, ctx) {
    if (!c || !ctx) return false;
    switch (c.type) {
      case 'eliminate': return (ctx.blueAlive || 0) === 0;
      case 'survive':   return ((ctx.turn || 0) >= (c.turn || 1) && (ctx.redAlive || 0) > 0) || (ctx.blueAlive || 0) === 0;
      case 'killType':  return (ctx.blueByType[c.unitType] || 0) === 0;
      case 'killCount': return ((ctx.blueKilledByType && ctx.blueKilledByType[c.unitType]) || 0) >= (c.count || 0);
      case 'killBuff':  return (ctx.blueByBuff[c.buff] || 0) === 0;
      case 'killImperial': return (ctx.imperialKills || 0) >= (c.count || 0);
      case 'eliminateImperial': return (ctx.imperialAlive || 0) === 0;
      case 'killMonster':  return (ctx.monsterKills || 0) >= (c.count || 0);
      case 'collect':      return (ctx.collected || 0) >= (c.count || 0);
      case 'huntDone':     { const h = ctx.hunt || {}; return !!(h.allMarked && h.bombed && h.towerDead && h.scoutAlive && h.groundAlive); }
      case 'boss':      return !ctx.bossAlive;
      case 'protect':   return !!(ctx.roles[c.role] && ctx.roles[c.role].alive);
      case 'escort': {
        const u = ctx.roles[c.role];
        return !!(u && u.alive && u.x === c.x && u.y === c.y);
      }
      case 'hold':
        if(c.turns) return ctx.holdKey === (c.x + ',' + c.y) && (ctx.holdStreak || 0) >= c.turns;
        return !!(ctx.redTiles && ctx.redTiles[c.x + ',' + c.y]);
      case 'incident':  return !!ctx.incidentTriggered;
      case 'capture':   return (c.tiles || []).every(([x, y]) => !!(ctx.redTiles && ctx.redTiles[x + ',' + y]));
      case 'captureHold': return (ctx.captureHold || 0) >= (c.turns || 3);
      case 'casualties': return (ctx.redLost || 0) <= (c.max || 0);
      case 'graves':    return (ctx.gravesDestroyed || 0) >= (c.count || 0);
      case 'souls':     return (ctx.souls || 0) >= (c.count || 0);
      case 'score':     return (ctx.scoreRed || 0) >= (c.count || 0);
      case 'bait':      return (ctx.ghostBait || 0) >= (c.count || 0);
      case 'forts':     return (ctx.fortsAlive || 0) === 0;
      case 'noLanding': return !ctx.enemyLanded;
      default: return false;
    }
  }

  function condFail(c, ctx) {
    if (!c || !ctx) return false;
    if (c.type === 'roleDead') return !(ctx.roles[c.role] && ctx.roles[c.role].alive);
    if (c.type === 'casualties') return (ctx.redLost || 0) > (c.max || 0);
    if (c.type === 'landed') return !!ctx.enemyLanded;
    if (c.type === 'incident') return !!ctx.incidentTriggered;
    if (c.type === 'sledDamaged') return !!(ctx.minigame && ctx.minigame.sledDamage);
    if (c.type === 'sledPushed') return !!(ctx.minigame && (ctx.minigame.sledPush || 0) >= 2);
    if (c.type === 'cartWrecked') return !!(ctx.minigame && ctx.minigame.cartWrecked);
    if (c.type === 'aaFailed') return !!(ctx.minigame && ctx.minigame.aaFailed);
    return false;
  }

  function objectiveMet(obj, ctx) {
    if (!obj || !ctx) return false;
    const conditions = obj.conditions || (obj.type ? [obj] : []);
    if (!conditions.length) return true;
    if (obj.within && (ctx.turn || 0) > obj.within) return false;
    return conditions.every(c => condMet(c, ctx));
  }

  function objectiveFailed(obj, ctx) {
    if (!obj || !ctx) return false;
    if (obj.within && (ctx.turn || 0) > obj.within && !objectiveMet(obj, ctx)) return true;
    return (obj.failIf || []).some(c => condFail(c, ctx));
  }

  function objectiveProgress(obj, ctx) {
    const conditions = obj && (obj.conditions || (obj.type ? [obj] : []));
    if (!conditions || !conditions.length) return { current: 0, target: 0, text: '完成任务' };
    const c = conditions[0], turn = ctx.turn || 0;
    switch (c.type) {
      case 'eliminate': return { current: 0, target: 0, text: '剩余敌人 ' + (ctx.blueAlive || 0) };
      case 'survive': return { current: Math.min(turn, c.turn), target: c.turn, text: '第 ' + turn + ' / ' + c.turn + ' 回合' };
      case 'killType': return { current: 0, target: 0, text: '剩余' + c.unitType + ' ' + (ctx.blueByType[c.unitType] || 0) };
      case 'killCount': return { current: Math.min(((ctx.blueKilledByType && ctx.blueKilledByType[c.unitType]) || 0), c.count), target: c.count, text: '已击杀' + c.unitType + ' ' + (((ctx.blueKilledByType && ctx.blueKilledByType[c.unitType]) || 0)) + ' / ' + c.count };
      case 'killBuff': return { current: 0, target: 0, text: '剩余目标 ' + (ctx.blueByBuff[c.buff] || 0) };
      case 'killImperial': return { current: Math.min(ctx.imperialKills || 0, c.count), target: c.count, text: '波斯 ' + (ctx.imperialKills || 0) + ' / ' + c.count };
      case 'eliminateImperial': return { current: (ctx.imperialAlive || 0) === 0 ? 1 : 0, target: 1, text: '剩余波斯单位 ' + (ctx.imperialAlive || 0) };
      case 'killMonster': return { current: Math.min(ctx.monsterKills || 0, c.count), target: c.count, text: '矿兽 ' + (ctx.monsterKills || 0) + ' / ' + c.count };
      case 'collect': return { current: Math.min(ctx.collected || 0, c.count), target: c.count, text: '收集物 ' + (ctx.collected || 0) + ' / ' + c.count };
      case 'huntDone': return { current: 0, target: 1, text: (ctx.hunt && ctx.hunt.allMarked ? '已全部标记' : '仍有未标记敌人') };
      case 'boss': return { current: 0, target: 1, text: ctx.bossAlive ? '首领仍在场' : '首领已击杀' };
      case 'protect': { const u = ctx.roles[c.role]; return { current: u && u.alive ? 1 : 0, target: 1, text: u && u.alive ? '受保护单位存活' : '受保护单位阵亡' }; }
      case 'escort': { const u = ctx.roles[c.role]; return { current: 0, target: 0, text: u && u.alive ? '排雷兵 (' + u.x + ',' + u.y + ')' : '排雷兵阵亡' }; }
      case 'hold':
        if(c.turns) return { current: Math.min(ctx.holdStreak || 0, c.turns), target: c.turns, text: '守住 (' + c.x + ',' + c.y + ') ' + (ctx.holdStreak || 0) + ' / ' + c.turns };
        return { current: 0, target: 0, text: ctx.redTiles && ctx.redTiles[c.x + ',' + c.y] ? '已占据 (' + c.x + ',' + c.y + ')' : '未占据 (' + c.x + ',' + c.y + ')' };
      case 'capture': { const n = (c.tiles || []).filter(([x, y]) => ctx.redTiles && ctx.redTiles[x + ',' + y]).length; return { current: n, target: c.tiles.length, text: '据点 ' + n + ' / ' + c.tiles.length }; }
      case 'captureHold': return { current: Math.min(ctx.captureHold || 0, c.turns), target: c.turns, text: '累计守住 ' + (ctx.captureHold || 0) + ' / ' + c.turns + ' 阵' };
      case 'casualties': return { current: ctx.redLost || 0, target: c.max, text: '伤亡 ' + (ctx.redLost || 0) + ' / ' + c.max };
      case 'graves': return { current: Math.min(ctx.gravesDestroyed || 0, c.count), target: c.count, text: '墓碑 ' + (ctx.gravesDestroyed || 0) + ' / ' + c.count };
      case 'souls': return { current: Math.min(ctx.souls || 0, c.count), target: c.count, text: '凝魂 ' + (ctx.souls || 0) + ' / ' + c.count };
      case 'score': return { current: Math.min(ctx.scoreRed || 0, c.count), target: c.count, text: '圣辉之光 ' + (ctx.scoreRed || 0) + ' / ' + c.count };
      case 'bait': return { current: Math.min(ctx.ghostBait || 0, c.count), target: c.count, text: '诱敌 ' + (ctx.ghostBait || 0) + ' / ' + c.count };
      case 'forts': return { current: 0, target: 0, text: '剩余工事 ' + (ctx.fortsAlive || 0) };
      case 'noLanding': return { current: 0, target: 0, text: ctx.enemyLanded ? '敌人已登岸' : '敌人尚未登岸' };
      default: return { current: 0, target: 0, text: obj.label || '完成任务' };
    }
  }

  const TUTORIALS = {
    'tutorial-basic': {
      id: 'tutorial-basic', no: 'T1', name: '行军与交战', mode: 'classic',
      campaignTitle: '新兵训练', tutorial: true,
      tip: '点击单位选中，再点击高亮格移动或攻击。',
      player: {
        resources: 20, cmd: 3, sp: 10,
        units: [
          { type: '车', x: 1, y: 2, displayName: '训练战车' },
          { type: '车', x: 1, y: 4, displayName: '训练战车' }
        ]
      },
      enemy: {
        units: [{ type: '步兵', x: 2, y: 2, displayName: '训练假人' }]
      },
      ai: { style: 'hold' },
      objective: { label: '完成新兵训练', conditions: [{ type: 'survive', turn: 99 }] }
    },
    'tutorial-card': {
      id: 'tutorial-card', no: 'T2', name: '技能卡入门', mode: 'classic',
      campaignTitle: '新兵训练', tutorial: true,
      tip: '技能卡在抽卡阶段获得；本教程已为你准备一张【闪电战】。',
      tutorialLibrary: [42],
      player: {
        resources: 20, cmd: 3, sp: 10,
        units: [{ type: '车', x: 1, y: 2, displayName: '训练战车' }]
      },
      enemy: {
        units: [{ type: '步兵', x: 8, y: 2, displayName: '训练假人' }]
      },
      ai: { style: 'hold' },
      objective: { label: '完成技能卡训练', conditions: [{ type: 'survive', turn: 99 }] }
    }
  };
  const TUTORIAL_ORDER = ['tutorial-basic', 'tutorial-card'];

  return {
    CHARACTERS, CAMPAIGNS, LEVELS, LEVEL_MAP, MODE_NAMES, MODE_ORDER,
    TUTORIALS, TUTORIAL_ORDER,
    getLevel, levelsForMode, nextLevel, objectiveText, objectiveMet, objectiveFailed, objectiveProgress,
    levelThreat, levelDifficulty
  };
});
