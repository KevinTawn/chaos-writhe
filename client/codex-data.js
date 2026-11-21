/* 混乱与蠕动 · 战地图鉴数据
 * 兵种档案（含小故事）、配乐曲目说明与分类。
 * 联机版 /codex 页面与单机热座图鉴浮层共用；技能卡数据从 constants / app.js 读取。
 */
(function (root) {
  'use strict';

  const UNIT_CATEGORIES = [
    { id: 'base', label: '基础兵种', note: '每一局都能部署的骨干力量。' },
    { id: 'armory', label: '军火库', note: '开局三选一，每方限带 1 个上场。' },
    { id: 'wild', label: '幽乡与矿井', note: '只在中立阵营或特殊模式出现的单位。' },
    { id: 'elite', label: '精锐与战损', note: '技能与事件赋予的强化或残损形态。' }
  ];

  const UNITS = [
    {
      id: 'inf', name: '步兵', cat: 'base', fig: 'fig-inf', glyph: '⚔️',
      cost: 2, costNote: '资源', move: '上下左右 1 格', attack: '相邻 1 格', hp: '1',
      tags: ['近战', '基础'], desc: '最基础的作战单位。可移动一格并攻击相邻敌人；卡牌中的“步兵”也包括后勤兵、二阶步兵、工兵、排雷兵与掷弹兵。',
      story: '每个老兵都记得自己第一次冲锋时靴子掉了。步兵不会把这件事告诉别人，但他会在每次行军前把鞋带系三遍。据说全军的鞋带总长度可以绕长城一圈半——这个数字没人核实过，因为没人愿意去量。'
    },
    {
      id: 'inf2', name: '二阶步兵', cat: 'base', fig: 'fig-inf', glyph: '⚔️', badge: '2/2',
      cost: 4, costNote: '军火库 / 合成', move: '同步兵', attack: '同步兵', hp: '2',
      tags: ['近战', '精锐', '2 HP'], desc: '2 HP 的步兵。HP≥2 时攻击 +1、受击时攻击方点数 -1；第一次受伤后降为普通步兵。可由「忠贞为贰」合并两个步兵得到，也可在军火库购买。',
      story: '两个步兵合并成一个二阶步兵，这在账面上叫“整编”。他们共用一副铠甲、两份口粮和一份战功。被问及合并后谁说了算时，二阶步兵沉默了很久，回答说：“我们还在商量。”'
    },
    {
      id: 'chariot', name: '车', cat: 'base', fig: 'fig-chariot', glyph: '🐎',
      cost: 6, costNote: '资源', move: '直线任意格', attack: '直线冲撞', hp: '1',
      tags: ['冲撞', '占位'], desc: '沿直线移动任意格，遇单位停止；路径上有敌人时停在敌人前一格并攻击。消灭敌人后占据其位置。',
      story: '战车兵最讨厌两件事：转弯，和前面有友军。车夫们在入伍第一天就要背诵《直行守则》第一条：“若前方有山，请换一条路，而不是撞上去。”遗憾的是，战场上往往没有第二条路。'
    },
    {
      id: 'cannon', name: '炮兵', cat: 'base', fig: 'fig-cannon', glyph: '💣',
      cost: 4, costNote: '资源', move: '不可移动', attack: '全图远程', hp: '1',
      tags: ['远程', '一次性位移'], desc: '不能移动；可攻击全图本局已经行动过的敌方单位，不能打地雷。开火后变成步兵，向前移动 2 格（被阻挡则停止）。',
      story: '炮兵是全军唯一需要“先挨打才能还手”的兵种——他们管这叫“等敌人先动”，别人管这叫“等敌人先打你”。开完炮后炮兵会变成步兵并向前冲两格，据说是为了亲自确认炮弹去了哪里。'
    },
    {
      id: 'navy', name: '海炮', cat: 'base', fig: 'fig-sea-cannon', glyph: '💣',
      cost: 4, costNote: '资源', move: '不可移动', attack: '同行直射', hp: '1',
      tags: ['远程', '海盗港湾'], desc: '仅海盗港湾可用。不能移动；只能攻击同一行、路径无阻挡且距离最近的敌人，不受“已行动”限制。开火后同样变为步兵并前移 2 格。',
      story: '海炮只在海盗港湾服役。它的瞄准镜是一块从沉船里捞出来的舷窗玻璃，炮手坚称这样能看到“海的另一边”。每次开炮后，它都会按照陆军炮兵的传统变成步兵——然后发现自己站在齐腰深的海水里。'
    },
    {
      id: 'logi', name: '后勤兵', cat: 'base', fig: 'fig-supply', glyph: '🛠️',
      cost: 3, costNote: '资源（每方限 1）', move: '上下左右 1 格', attack: '相邻 1 格', hp: '1',
      tags: ['支援', '治疗'], desc: '按步兵方式移动与攻击，并可为上下左右相邻的友军解除 1 层混乱。每方最多部署 1 个后勤兵。',
      story: '后勤兵的背包里永远有绷带、干粮、一封没写完的家书，以及一把用来给友军“理清思路”的小木槌。他最大的愿望是有一天不用在炮火里跑来跑去，但这个愿望每年都被写在同一本后勤日志的第 1 页。'
    },
    {
      id: 'mine', name: '地雷', cat: 'base', fig: 'fig-mine', glyph: '💥',
      cost: 3, costNote: '资源', move: '不可移动', attack: '被动触发', hp: '1',
      tags: ['隐藏', '陷阱'], desc: '部署后对方不可见。敌方单位进入或经过时触发踩雷判定：通常 1 被消灭、2 混乱、3~6 无事。己方单位不能停留。',
      story: '每颗地雷都有一句刻在铁壳内侧的座右铭——大部分是“别踩我”。工兵在埋雷时会小声对它说：“如果有一天你响了，记得那是你唯一一次被需要。”地雷没有回答，但它一直很尽责。'
    },
    {
      id: 'fort', name: '防御工事', cat: 'base', fig: 'fig-fort', glyph: '🏗️',
      cost: 1, costNote: '资源', move: '不可移动', attack: '无', hp: '1',
      tags: ['掩体', '借力'], desc: '不能移动或攻击。步兵可绕过相邻己方工事转弯移动，或跨过工事攻击另一侧敌人（攻击点数 +1）。部分技能可为工事附加炮台、陷阱等属性。',
      story: '一袋沙、两根木桩和一点倔强，就是一座防御工事。它不移动、不攻击，只在步兵需要转弯或翻越时默默撑住。有老兵说，战争结束后这些工事会长出草来，像一排排不肯解散的士兵。'
    },
    {
      id: 'sapper', name: '排雷兵', cat: 'armory', fig: 'fig-inf', glyph: '🛡️', badge: '低档',
      cost: 4, costNote: '军火库购买', move: '同步兵', attack: '相邻 1 格', hp: '1',
      tags: ['侦察', '排雷'], desc: '显示周围 3×3 格内敌方地雷（包括伪装地雷）；踩雷时投 d6：1 自己混乱，2~6 无事。按步兵行动。',
      story: '排雷兵随身带着一根探雷针和一副磨旧的护目镜。他相信每颗地雷在爆炸前都会“轻轻叹气”，所以走路时总是低着头、竖着耳朵。队伍里没人敢走在他前面，也很少有人敢走在他后面。'
    },
    {
      id: 'grenadier', name: '掷弹兵', cat: 'armory', fig: 'fig-inf', glyph: '⚔️', badge: '低档',
      cost: 4, costNote: '军火库购买', move: '同步兵', attack: '相邻 / 榴弹直击', hp: '1',
      tags: ['爆发', '每局一次'], desc: '每局一次：与己方单位相邻时，可轰击该友军正后方直线上最近的一个敌军，不限距离；地形或友军会阻挡这条线。按步兵行动。',
      story: '掷弹兵的军功章上刻着一枚手榴弹和一行小字：“一次就好。”他一生只被允许投出一颗榴弹，因此每次瞄准都要花上半炷香。友军催他快些，他就回头说：“你确定要我把这一颗用在那个位置吗？”'
    },
    {
      id: 'engineer', name: '工兵', cat: 'armory', fig: 'fig-supply', glyph: '🛠️', badge: '低档',
      cost: 4, costNote: '军火库购买', move: '同步兵', attack: '相邻 1 格', hp: '1',
      tags: ['建造', '拆除'], desc: '点击自身格进入建造模式：消耗 1 行动在相邻空格建造防御工事；也可移动到相邻敌方工事/地雷格并拆除。工兵还能察觉紧贴自己的地雷。',
      story: '工兵的腰带上挂着锤子、扳手、一卷麻绳和三把钥匙，没有人知道钥匙开什么锁。他能在敌人眼皮底下把一间工事搭起来，也能在敌人转身的瞬间把它拆掉。军需官说，工兵报销的木料总比实际用掉的多一倍——另一半去了哪里，只有工兵自己知道。'
    },
    {
      id: 'cannon2', name: '双发炮兵', cat: 'armory', fig: 'fig-cannon', glyph: '💣', badge: '低档',
      cost: 5, costNote: '军火库购买', move: '不可移动', attack: '全图远程 ×2', hp: '1',
      tags: ['远程', '两发'], desc: '作为炮兵拥有 2 次炮击次数；用尽后按炮兵规则变为步兵并前移 2 格。',
      story: '双发炮兵有两发炮弹，因此他比普通炮兵多了一份犹豫：第一发打哪里，第二发要不要留给更重要的人。同袍们说，听他开炮就像听一个人说“我再说最后一句”——通常还有下一句。'
    },
    {
      id: 'armored', name: '装甲车', cat: 'armory', fig: 'fig-chariot', glyph: '🐎', badge: '高档',
      cost: 7, costNote: '军火库购买', move: '同车', attack: '直线冲撞', hp: '1',
      tags: ['装甲', '减伤'], desc: '拥有装甲属性：可抵消一次战斗判定，之后失去装甲；受击时攻击方点数 -1。按车行动。',
      story: '装甲车的外壳是用三十七块不同战役里捡回来的铁板拼成的，每一块都挡过一刀。车长把这件事讲给新兵听时，总会敲敲车壁说：“看，这都是故事。”新兵问：“那我们的故事呢？”车长说：“等它再掉一块的时候。”'
    },
    {
      id: 'supplycar', name: '补给车', cat: 'armory', fig: 'fig-supply', glyph: '🚚', badge: '高档',
      cost: 8, costNote: '军火库购买', move: '同车', attack: '直线冲撞', hp: '1',
      tags: ['支援', '解混乱'], desc: '可花费 1 行动消除上下左右相邻己方单位的 1 层混乱。按车行动。',
      story: '补给车上装着热汤、干净绷带和一瓶据说能治百病的药酒。每次它驶过阵线，混乱中的士兵都会突然清醒一点——军医说这是药酒的作用，士兵们说这是汤的味道。补给车自己最清楚：真正起作用的，是有人还记得他们。'
    },
    {
      id: 'chariot2', name: '二阶战车', cat: 'armory', fig: 'fig-chariot', glyph: '🐎', badge: '2/2',
      cost: 8, costNote: '军火库购买', move: '同车', attack: '直线冲撞', hp: '2',
      tags: ['2 HP', '降级'], desc: '2 HP 的战车；第一次非直接受伤后降为普通车并清除混乱。按车行动。',
      story: '二阶战车是一辆车，也是一段值得讲述的历史。它挨过第一次重击后会卸下装甲、变回普通战车，但车夫坚持说那不是退步，是“轻装”。停车场上，它总停在最外侧，方便随时再冲一次。'
    },
    {
      id: 'commandcar', name: '指挥车', cat: 'armory', fig: 'fig-chariot', glyph: '🎖️', badge: '高档',
      cost: 8, costNote: '军火库购买', move: '同车', attack: '直线冲撞', hp: '1',
      tags: ['光环', '风险'], desc: '在场时己方所有单位的最终攻击点数 +1；被消灭时己方所有单位 +1 混乱，3 回合后消去。',
      story: '指挥车从不冲锋，它只是停在那里，让所有人相信有人在看着。车顶的旗帜一倒，全军的士气就跟着倒一半。所以车夫们有个不成文的规矩：哪怕只剩一根旗杆，也要把它插直。'
    },
    {
      id: 'ghost', name: '鬼魂', cat: 'wild', fig: 'fig-ghost', glyph: '👻', badge: '雾夜',
      cost: '—', costNote: '中立', move: '1 格', attack: '撞鬼判定', hp: '1',
      tags: ['雾夜幽乡', '无碰撞'], desc: '仅雾夜幽乡出现的中立单位。没有碰撞体积，可与单位同格；撞上士兵时触发撞鬼判定。执灯士撞鬼可直接消灭鬼魂并获得 2 凝魂。',
      story: '雾夜的鬼魂没有影子，也不占用道路——它们从墓碑里飘出来，贴着士兵的耳朵数数。数到三的时候，多数人已经分不清自己是活人还是鬼了。执灯士说，鬼其实怕光，更怕被人认真看见。'
    },
    {
      id: 'grave', name: '墓碑', cat: 'wild', fig: 'fig-grave', glyph: '🪦', badge: '雾夜',
      cost: '—', costNote: '中立', move: '不可移动', attack: '无', hp: '1',
      tags: ['雾夜幽乡', '召唤'], desc: '仅雾夜幽乡出现。可被攻击；被摧毁或在特定时机裂开时，会从碑下放出鬼魂。',
      story: '墓碑是雾夜幽乡里最守规矩的单位：不移动、不攻击、不抱怨。它唯一的工作是在合适的时候裂开，把里面的东西放出来。路过的士兵会向它脱帽，尽管他们并不知道碑下埋的是谁——有时候，连墓碑自己也不知道。'
    },
    {
      id: 'beast', name: '矿兽', cat: 'wild', fig: 'fig-wolf', glyph: '🐺', badge: '矿井',
      cost: '—', costNote: '中立', move: '1 格', attack: '相邻 1 格', hp: '1',
      tags: ['蛇骨矿洞', '主动'], desc: '只出现在蛇骨矿洞地下层的中立野兽。每轮会主动靠近并攻击视野内的矿工；被击败后不会掉落资源。',
      story: '矿兽在黑暗里生活得太久，眼睛已经退化成两粒微光。它靠闻脚步声辨认方向，尤其喜欢靴底沾了晶簇粉末的探险者。矿工们说，听见黑暗里有低低的哼声时不要回头——那是矿兽在练习怎么和你打招呼。'
    },
    {
      id: 'guard', name: '骨蛇守卫', cat: 'wild', fig: 'fig-grave', glyph: '🦴', badge: '2 HP',
      cost: '—', costNote: '中立', move: '不可移动', attack: '不主动', hp: '2',
      tags: ['蛇骨矿洞', '镇守'], desc: '盘踞在矿洞岔路口的静止守卫，2 HP。不会主动移动，但会阻挡通道并反击靠近的矿工。',
      story: '骨蛇守卫盘在矿洞的岔路口，已经盘了不知多少年。它不主动攻击，只是盯着每一个经过的人，直到对方先移开视线。矿工们相信，被它盯过的人会在梦里听见骨头摩擦的声音——那是它在数你带走了多少晶簇。'
    },
    {
      id: 'boss', name: '蛇骨矿主', cat: 'wild', fig: 'fig-volcano-head', glyph: '🐍', badge: '4 HP',
      cost: '—', costNote: '首领', move: '不可移动', attack: '不主动', hp: '4',
      tags: ['蛇骨矿洞', '首领'], desc: '矿洞最深处的中立首领，4 HP，封锁中央竖井。击败后开启中央竖井，击败者获得 3 技能点与一张技能卡。',
      story: '蛇骨矿主沉睡在矿洞最深处，四根肋骨撑起一座小小的王座。它收集所有掉进矿洞的东西：矿灯、靴子、誓言和名字。打败它的人会得到中央竖井的钥匙，但很少有人提起——矿主倒下时，会轻轻说一句“谢谢你来”。'
    },
    {
      id: 'eliteinf', name: '精锐步兵', cat: 'elite', fig: 'fig-inf', glyph: '⭐',
      cost: '—', costNote: '属性', move: '同步兵', attack: '同步兵', hp: '1',
      tags: ['强化形态', '取高'], desc: '步兵的强化属性：攻击与被攻击时各取两次进攻点数，攻击取高、受击取低。可由「精锐步兵」技能或雪原事件赋予。',
      story: '精锐步兵的徽章是一枚缝歪了的星。他说那是第一次授勋时自己缝的，针脚不好看，但没人敢笑。每次拔剑前，他都会把两次投点在心里过一遍：高的献给胜利，低的留给对手。'
    },
    {
      id: 'elitechariot', name: '精锐战车', cat: 'elite', fig: 'fig-chariot', glyph: '⭐',
      cost: '—', costNote: '属性', move: '同车', attack: '直线冲撞', hp: '1',
      tags: ['强化形态', '攻守修正'], desc: '战车的强化属性：进攻时最终点数 +1，受击时 -1。可由「精锐战车」技能或城邦裂变/雪原事件赋予。',
      story: '精锐战车的车辕上系着一条褪色的红布，据说是某场战役里唯一没有烧掉的东西。车夫说，红布能带来好运；车却说，真正让敌人犹豫的是它冲过来时那股“我懒得躲”的气势。'
    },
    {
      id: 'elitecannon', name: '精锐炮兵', cat: 'elite', fig: 'fig-cannon', glyph: '⭐',
      cost: '—', costNote: '属性', move: '不可移动', attack: '全图远程', hp: '1',
      tags: ['强化形态', '补充弹药'], desc: '炮兵的强化属性：增加一次使用次数；攻击并消灭敌人时立即补充一次使用次数。',
      story: '精锐炮兵会把每一发打空的炮弹壳捡回来，摆在炮位边上。他说那不是纪念品，是账本——每多一个空壳，就多一次证明自己还活着的证据。补给官对此很头疼，因为账本越长，下一批弹药就申请得越多。'
    },
    {
      id: 'battledamaged', name: '战损车', cat: 'elite', fig: 'fig-chariot', glyph: '🛠️',
      cost: '—', costNote: '残损形态', move: '同车', attack: '直线冲撞', hp: '1',
      tags: ['残损形态', '失去属性'], desc: '被「反装甲弹」命中后失去一切原有属性（不包括混乱），按战损车规则行动：进攻点数 -1。',
      story: '战损车是被“反装甲弹”拆掉了骄傲的车。它只剩下一副还能滚动的骨架，速度不快，脾气不小。车夫拍了拍它说：“别难过，至少你现在很轻。”战损车没有回答，但那天它多跑了三格。'
    }
  ];

  const MUSIC = [
    {
      id: 'lobby', group: 'loop', title: '出师', en: 'MARCH OUT', icon: 'u-crest',
      meta: '62 BPM · D 小调 · 32 小节', desc: '低音持续音、古琴式拨弦与远处铜钟。A/B 两段轮转，留白很多，适合大厅等待入席。'
    },
    {
      id: 'battle', group: 'loop', title: '经典 · 行动', en: 'ACTION PHASE', icon: 'm-classic',
      meta: '112 BPM · 4/4 · 48 小节 · 进行曲版', desc: '太鼓与八分音符低音推进，A–B–A′–C–D–coda 六段体。经典模式的主战场循环。'
    },
    {
      id: 'wannan', group: 'loop', title: '城邦裂变 · 行军', en: 'CITY-STATES · MARCH', icon: 'm-wannan',
      meta: '84 BPM · D 多利亚 · 32 小节', desc: '里拉琴四音列分解铺底，奥洛斯管演奏主题，框鼓与定音鼓标记行进。'
    },
    {
      id: 'wannan2', group: 'loop', title: '城邦裂变 · 事变后', en: 'CITY-STATES · INCIDENT', icon: 'm-wannan',
      meta: '126 BPM · 6/8 · 48 小节 · 抒情版', desc: '事变后的弗里吉亚色彩，里拉琴战舞音型、奥洛斯管、铜管与合唱逐层加厚。'
    },
    {
      id: 'snow', group: 'loop', title: '雪原', en: 'SNOWFIELD', icon: 'm-snow',
      meta: '72 BPM · E 小调 · 32 小节', desc: '钢片琴式琶音、风声与高音钟。小雪与大雪会改变风声与滤波。'
    },
    {
      id: 'pirate', group: 'loop', title: '海盗港湾', en: 'CORSAIR', icon: 'm-pirate',
      meta: '160 BPM · 6/8 · 16 小节', desc: '6/8 吉格节奏，手风琴式和弦与提琴旋律；东风与西风会移动声场。'
    },
    {
      id: 'fog', group: 'loop', title: '雾夜幽乡', en: 'FOG NIGHT', icon: 'm-fog',
      meta: '54 BPM · D 小调 · 16 小节', desc: '极低频持续音、呼吸般的噪声与不协和钟声，没有打击乐。'
    },
    {
      id: 'holy', group: 'loop', title: '圣辉之战', en: 'HOLY RADIANCE', icon: 'm-holy',
      meta: '66 BPM · D 小调 · 32 小节', desc: '管风琴式持续和弦、钟声与高音合唱，对应天空与地面的双层战场。'
    },
    {
      id: 'mine', group: 'loop', title: '蛇骨矿洞', en: 'BONE MINE', icon: 'm-mine',
      meta: '108 BPM · 6/8 · 32 小节 · 音乐盒版', desc: '低频地下回响、太鼓与铃音；音乐盒音色在黑暗里显得格外清楚。'
    },
    {
      id: 'tide', group: 'loop', title: '蠕潮蚀野', en: 'CREEPING TIDE', icon: 'm-tide',
      meta: '56 BPM · 深水 · 32 小节', desc: '缓慢的潮涌低音、水滴与远处的鲸鸣，潮汐推进时层层加厚。'
    },
    {
      id: 'beacon', group: 'loop', title: '烽燧阵线', en: 'BEACON LINE', icon: 'm-beacon',
      meta: '96 BPM · 五声音阶 · 32 小节', desc: '边塞大鼓、笙与古筝拨弦，号角在长城两侧呼应。对应烽燧阵线模式。'
    },
    {
      id: 'neon', group: 'loop', title: '霓虹纪元', en: 'NEON ERA', icon: 'm-neon',
      meta: '118 BPM · A 小调 · 32 小节 · 四段体', desc: '8 小节和声上轮换 A/B/C/D 四段旋律，C 段转入拨弦与铃音的冷静桥段，D 段铜管与低音笙加厚，32 小节内不重复同一乐句。'
    },
    {
      id: 'end_battle', group: 'end', title: '经典 · 终局', en: 'ENDING · CLASSIC', icon: 'u-crest',
      meta: '138 BPM · 2 小节', desc: '上行旋律与主和弦收尾的短促欢呼。游戏中一局结束时只播一次。'
    },
    {
      id: 'end_snow', group: 'end', title: '雪原 · 终局', en: 'ENDING · SNOW', icon: 'u-crest',
      meta: '126 BPM · 2 小节', desc: '明亮的钟声收束，像风雪停下后第一缕阳光。'
    },
    {
      id: 'end_city', group: 'end', title: '城邦 · 终局', en: 'ENDING · CITY-STATES', icon: 'u-crest',
      meta: '132 BPM · 2 小节', desc: '里拉琴与铜管的短促胜利句，献给一座终于安静下来的城邦。'
    },
    {
      id: 'end_pirate', group: 'end', title: '海盗 · 终局', en: 'ENDING · CORSAIR', icon: 'u-crest',
      meta: '150 BPM · 6/8 · 2 小节', desc: '手风琴与提琴的甲板欢呼，两小节 6/8。'
    },
    {
      id: 'end_fog', group: 'end', title: '雾夜 · 终局', en: 'ENDING · FOG', icon: 'u-crest',
      meta: '120 BPM · 2 小节', desc: '雾散之后的钟声，短而轻，像是有人替你关上了门。'
    },
    {
      id: 'end_holy', group: 'end', title: '圣辉 · 终局', en: 'ENDING · HOLY', icon: 'u-crest',
      meta: '128 BPM · 2 小节', desc: '高音合唱与钟声上行，收在明亮的主和弦上。'
    },
    {
      id: 'end_mine', group: 'end', title: '矿洞 · 终局', en: 'ENDING · MINE', icon: 'u-crest',
      meta: '126 BPM · 2 小节', desc: '音乐盒式的两小节收束，矿灯终于熄灭了。'
    },
    {
      id: 'end_tide', group: 'end', title: '蠕潮 · 终局', en: 'ENDING · TIDE', icon: 'u-crest',
      meta: '120 BPM · 2 小节', desc: '潮水退去后的短句，低音落回平静。'
    },
    {
      id: 'end_beacon', group: 'end', title: '烽燧 · 终局', en: 'ENDING · BEACON', icon: 'u-crest',
      meta: '104 BPM · 2 小节', desc: '笙与号角的两小节收束，最后一簇烽火熄灭。'
    },
    {
      id: 'end_neon', group: 'end', title: '霓虹 · 终局', en: 'ENDING · NEON', icon: 'u-crest',
      meta: '122 BPM · 2 小节', desc: '铜管主奏的明亮上行句叠高音铃与定音鼓，最后落在主和弦，系统接管完成。'
    }
  ];

  root.ChaosCodexData = Object.freeze({
    UNIT_CATEGORIES: Object.freeze(UNIT_CATEGORIES),
    UNITS: Object.freeze(UNITS),
    MUSIC: Object.freeze(MUSIC)
  });
})(typeof window !== 'undefined' ? window : this);
