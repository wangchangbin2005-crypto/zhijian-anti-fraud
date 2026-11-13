import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

// ── 图解识骗卡片数据 ──────────────────────────────────────────
const learnImageCards = [
  {
    id: 1, emoji: '🎭', bg1: '#1a0030', bg2: '#3d0060', tag: 'AI诈骗',
    title: 'AI换脸诈骗识别指南',
    desc: '教你识别AI合成视频和克隆语音的7个特征',
    mockup: {
      type: 'chat', name: '妈妈', avatar: '👩',
      msgs: [
        { side: 'left',  text: '妈妈我是小明，在外地出车祸了住院，手术要先交5万押金，你快打给我' },
        { side: 'right', text: '小明？你现在哪里？' },
        { side: 'left',  text: '妈我快手术了，不能打电话，你快转钱来！账号：6217 xxxx xxxx 1234' },
      ],
      warning: '⚠️ AI克隆了儿子声音，要求不打电话直接转账',
    },
    fullDesc: '随着AI技术普及，骗子已能实时合成视频和声音。此类诈骗发展迅速，老年人尤其要警惕。',
    steps: [
      '骗子收集目标亲友的社交媒体视频/音频',
      '利用AI工具克隆声音和面部特征',
      '发起视频通话或发送语音消息',
      '以紧急情况为由要求快速转账，不能打电话核实',
    ],
    signals: [
      '要求不打电话，只发消息/语音',
      '以"急救""手术""押金"制造紧迫感',
      '转账账号是陌生个人账户',
      '要求保密，不让告诉其他家人',
    ],
  },
  {
    id: 2, emoji: '📱', bg1: '#001a30', bg2: '#003060', tag: '短信诈骗',
    title: '诈骗短信真实样本',
    desc: '最新流行的6种诈骗短信模板，学会识别立刻拉黑',
    mockup: {
      type: 'sms',
      msgs: [
        { sender: '95588', text: '【建设银行】您的账户于今日在异地登录，如非本人操作请点击：http://ccb-safe.xyz/verify 验证' },
        { sender: '12306', text: '您订购的车票因系统升级退款失败，请登录补填信息：http://12306-refund.com' },
        { sender: '顺丰快递', text: '您的快递因地址不详无法派送，请点击修改：http://sf-express.top/update' },
      ],
      warning: '⚠️ 域名不是官方域名！真实银行域名为 ccb.com，12306为12306.cn',
    },
    fullDesc: '诈骗短信通过伪装成银行、快递、政府机构发送，核心是让你点击钓鱼链接或拨打虚假电话。',
    steps: [
      '冒充官方机构发送短信',
      '包含制造紧迫感的内容',
      '附带钓鱼链接（域名与官方不符）',
      '点击后要求输入银行卡号、密码、验证码',
    ],
    signals: [
      '链接域名与官方网址不同',
      '短信中有紧迫性语言（"立即""马上""今日"）',
      '要求提供验证码或密码',
      '发件人号码不是官方客服号',
    ],
  },
  {
    id: 3, emoji: '💰', bg1: '#0a2000', bg2: '#1a4000', tag: '投资诈骗',
    title: '虚假投资APP界面识别',
    desc: '从注册到跑路，识别虚假投资平台的5个阶段',
    mockup: {
      type: 'app', name: 'XX财富APP',
      items: [
        { label: '我的账户',  value: '¥ 128,450.00', color: '#22c55e' },
        { label: '今日收益',  value: '+¥ 2,840.00 (+2.26%)', color: '#22c55e' },
        { label: '累计收益',  value: '¥ 28,450.00', color: '#22c55e' },
        { label: '提现申请',  value: '审核中...（需缴纳20%个人所得税）', color: '#ef4444' },
      ],
      warning: '⚠️ 显示高额盈利但无法提现，要求缴税才能出金',
    },
    fullDesc: '虚假投资平台前期让你赚钱，大额入金后拒绝提现，要求缴纳各种税费，最终关闭跑路。',
    steps: [
      '在社群推广"高收益理财"',
      '引导下载非正规APP（只能链接下载）',
      '初期入金显示大幅盈利',
      '鼓励加大投入并引荐他人',
      '以"税费""手续费"为由阻止提现，随后消失',
    ],
    signals: [
      'APP只能通过链接下载，应用商店搜不到',
      '收益率异常（日收益1%以上）',
      '提现需要先缴税或手续费',
      '客服只在微信，没有官方客服电话',
    ],
  },
  {
    id: 4, emoji: '👮', bg1: '#300000', bg2: '#600000', tag: '冒充公检法',
    title: '冒充公检法诈骗话术还原',
    desc: '从第一通电话到转账，骗子完整的心理控制流程',
    mockup: {
      type: 'chat', name: '北京市公安局', avatar: '🚔',
      msgs: [
        { side: 'left',  text: '您好，我是北京市公安局刑侦大队李警官，您的银行账户涉嫌一起跨境洗钱案，案件编号：2024-JC-008812' },
        { side: 'left',  text: '现在需要您配合调查，将名下资产转移到"安全账户"进行资产冻结保护，此事严格保密' },
        { side: 'right', text: '我需要转多少？' },
        { side: 'left',  text: '全部资产，这是保护您的资产安全，不配合将面临司法追诉' },
      ],
      warning: '⚠️ 公检法绝不会电话要求转账！"安全账户"不存在',
    },
    fullDesc: '冒充公检法是危害最重的诈骗类型，通过心理施压让受害者主动转账，损失往往数十万元。',
    steps: [
      '电话声称你的账户涉案',
      '发送伪造通缉令/逮捕令取得信任',
      '要求转账到"安全账户"保全资产',
      '严格要求保密不告诉家人',
      '多人轮流施压，不给思考时间',
    ],
    signals: [
      '公检法不会电话通知涉案',
      '没有"安全账户"这个概念',
      '要求保密是切断外界帮助的手段',
      '伪造的"案件编号"可在网上查到真实案件',
    ],
  },
  {
    id: 5, emoji: '💔', bg1: '#300020', bg2: '#600040', tag: '情感诈骗',
    title: '"杀猪盘"聊天记录还原',
    desc: '从搭讪到投资，恋爱诈骗3个月的聊天轨迹',
    mockup: {
      type: 'chat', name: 'Kevin（成功投资人）', avatar: '🤵',
      msgs: [
        { side: 'left',  text: '你好，好像我们有共同好友？我是做跨境贸易的，偶尔帮朋友打理些投资' },
        { side: 'left',  text: '我这边有个内部投资渠道，上个月帮朋友做了28%，你有兴趣了解吗？' },
        { side: 'right', text: '真的假的，这么高收益？' },
        { side: 'left',  text: '先试试，我帮你操作，亏了算我的，你就把钱转到这个账户' },
      ],
      warning: '⚠️ 陌生人主动搭讪后推荐投资，100%是诈骗',
    },
    fullDesc: '"杀猪盘"指骗子长期培养感情后实施诈骗，受害者因情感投入而难以察觉，损失惨重。',
    steps: [
      '在社交平台主动搭讪，形象光鲜',
      '日常嘘寒问暖，快速建立情感联系',
      '分享"成功经历"和"投资收益截图"',
      '以带你赚钱为由让你入金投资',
      '金额积累到一定程度后平台关闭',
    ],
    signals: [
      '网络认识的人从不见面却异常亲近',
      '主动提起投资理财话题',
      '推荐你从未听说过的投资平台',
      '要求快速入金，收益截图完美',
    ],
  },
  {
    id: 6, emoji: '🎁', bg1: '#1a1a00', bg2: '#404000', tag: '虚假中奖',
    title: '虚假中奖套路全图解',
    desc: '从中奖通知到骗走钱财，完整套路拆解',
    mockup: {
      type: 'notification',
      items: [
        { icon: '🎊', text: '恭喜您！您的手机号码被抽选为本月幸运用户，获得现金大奖¥88,888元' },
        { icon: '📋', text: '领取方式：需缴纳个人所得税¥888元至指定账户后，24小时内到账' },
        { icon: '⏰', text: '本次中奖机会仅保留24小时，过期作废，请尽快联系客服' },
      ],
      warning: '⚠️ 真实中奖税费由主办方代扣，不会要求你先转账',
    },
    fullDesc: '虚假中奖利用人的贪念，以小额税费骗取信任，后续层层要求缴费，最终骗取大额钱财。',
    steps: [
      '发送中奖通知（弹窗/短信/快递）',
      '要求缴纳个人所得税或公证费',
      '受害者缴费后被告知还需其他费用',
      '层层追加，直到受害者察觉',
    ],
    signals: [
      '从未参与过该活动',
      '领奖需要先缴税费',
      '时间紧迫感：限时24小时',
      '联系方式是私人号码而非官方客服',
    ],
  },
  {
    id: 7, emoji: '💳', bg1: '#001830', bg2: '#003050', tag: '虚假贷款',
    title: '无抵押贷款陷阱识别',
    desc: '从下载APP到"解冻费"，虚假贷款全流程图解',
    mockup: {
      type: 'app', name: '极速借钱APP',
      items: [
        { label: '最高额度', value: '¥ 200,000', color: '#22c55e' },
        { label: '审核结果', value: '✅ 恭喜通过！', color: '#22c55e' },
        { label: '放款状态', value: '❌ 需缴纳解冻费¥3,000', color: '#ef4444' },
        { label: '客服提示', value: '缴费后2小时到账，不缴将影响征信', color: '#ef4444' },
      ],
      warning: '⚠️ 正规贷款绝不会要求先缴费！',
    },
    fullDesc: '虚假贷款以"免征信""秒批""高额度"为噱头，审批通过后要求缴纳各种费用，款项永远不会到账。',
    steps: [
      '发布"无抵押秒批"广告',
      '引导下载私人APP填写个人信息',
      '提示审批通过，要求缴纳解冻费/保证金',
      '缴费后以各种理由继续要求缴费，最终跑路',
    ],
    signals: [
      'APP无法在应用市场找到',
      '任何理由要求贷款前先缴费',
      '征信威胁语言（不缴影响征信）',
      '客服只在微信，无官方热线',
    ],
  },
  {
    id: 8, emoji: '🎮', bg1: '#000a20', bg2: '#001040', tag: '游戏诈骗',
    title: '低价游戏账号购买陷阱',
    desc: '游戏账号交易和装备购买中的常见骗局',
    mockup: {
      type: 'chat', name: '游戏卖家', avatar: '🎮',
      msgs: [
        { side: 'left',  text: '王者皮肤齐全账号低价出，原价2万，现在急用钱800出，先付定金500' },
        { side: 'right', text: '可以看一下账号吗？' },
        { side: 'left',  text: '可以，但要先交定金，付完给你账号密码，中介担保' },
        { side: 'left',  text: '定金付了？我这边账号在交易平台锁定中，还需交200解锁费' },
      ],
      warning: '⚠️ 付完定金就开始各种理由要更多钱，是标准套路',
    },
    fullDesc: '游戏账号诈骗利用玩家贪图便宜心理，付了定金后层层追加费用，或给虚假账号，是学生群体高发诈骗。',
    steps: [
      '低价发布游戏账号/装备广告',
      '要求先交定金或担保费',
      '给出虚假账号或各种理由追加费用',
      '收到钱后拉黑或账号被追回',
    ],
    signals: [
      '价格远低于市场价（原价2万卖800）',
      '要求先付款再看账号',
      '所谓"担保"是骗子同伙',
      '付款后无法联系或继续索要费用',
    ],
  },
  {
    id: 9, emoji: '🏥', bg1: '#002010', bg2: '#003020', tag: '老年保健品',
    title: '老年保健品诈骗图解',
    desc: '专门针对老年人的保健品和医疗诈骗套路',
    mockup: {
      type: 'notification',
      items: [
        { icon: '👨‍⚕️', text: '免费健康讲座：权威专家揭秘长寿秘诀，到场即送鸡蛋' },
        { icon: '💊', text: '专家建议：您患有多种慢性病，需服用我们的"纳米细胞修复液"¥3800/瓶' },
        { icon: '📞', text: '"子女"打来电话：妈妈这个药真的很好，我帮你付了，你把钱打给我' },
      ],
      warning: '⚠️ 免费讲座+权威专家+子女推荐=老年人诈骗三件套',
    },
    fullDesc: '老年保健品诈骗通过免费礼品引导参加讲座，制造恐慌后推销高价产品，或冒充子女要求汇款购买。',
    steps: [
      '发传单邀请参加免费健康讲座',
      '现场安排"专家"进行健康检测，结论都是有病',
      '高压推销天价保健品，声称能根治各种病',
      '安排"托儿"现场购买制造氛围',
    ],
    signals: [
      '免费礼品引诱参加讲座',
      '专家证书无从核实',
      '保健品声称能治疗疾病（违法）',
      '限时优惠制造紧迫感',
    ],
  },
]

// ── 视频教程数据 ──────────────────────────────────────────────
const learnVideos = [
  {
    id: 1, emoji: '🚔', bg1: '#0d1a2e', bg2: '#1a2d4a', forRole: ['adult', 'elder', 'financial'],
    title: '冒充公检法诈骗全流程还原', source: '@中国警察网', duration: '12:34',
    desc: '从接到"公安局"电话到转账，完整还原每个骗局环节',
    url: 'https://v.qq.com/x/search/?q=%E5%86%92%E5%85%85%E5%85%AC%E6%A3%80%E6%B3%95%E8%AF%88%E9%AA%97',
  },
  {
    id: 2, emoji: '📲', bg1: '#1a2e0d', bg2: '#2d4a1a', forRole: ['adult', 'elder', 'student', 'financial'],
    title: '国家反诈中心APP安装使用教程', source: '@国家反诈中心', duration: '官方',
    desc: '开启来电预警、短信拦截、身份核验，手机必装APP',
    url: 'https://www.12339.gov.cn/',
  },
  {
    id: 3, emoji: '🤖', bg1: '#2e0020', bg2: '#500040', forRole: ['elder', 'adult'],
    title: 'AI换脸诈骗：如何识别克隆声音', source: '@网络安全科普', duration: '15:20',
    desc: '实测AI换脸声音克隆，教你设置家庭暗号防被骗',
    url: 'https://v.qq.com/x/search/?q=AI%E6%8D%A2%E8%84%B8%E8%AF%88%E9%AA%97%E9%98%B2%E8%8C%83',
  },
  {
    id: 4, emoji: '👴', bg1: '#2e0d00', bg2: '#4a1a00', forRole: ['elder'],
    title: '老年人高发诈骗Top5防范指南', source: '@平安中国', duration: '18:45',
    desc: '大字幕慢语速，专为60岁以上老人制作，子女可转发',
    url: 'https://v.qq.com/x/search/?q=%E8%80%81%E5%B9%B4%E4%BA%BA%E9%98%B2%E8%AF%88%E9%AA%97',
  },
  {
    id: 5, emoji: '🎓', bg1: '#002e2e', bg2: '#004a3a', forRole: ['student'],
    title: '大学生防骗：刷单兼职陷阱全揭秘', source: '@青年防骗联盟', duration: '11:08',
    desc: '真实案例：200元小额刷单最终被骗数万元的全过程',
    url: 'https://v.qq.com/x/search/?q=%E5%A4%A7%E5%AD%A6%E7%94%9F%E5%88%B7%E5%8D%95%E8%AF%88%E9%AA%97',
  },
  {
    id: 6, emoji: '💼', bg1: '#1a0d2e', bg2: '#2d1a4a', forRole: ['financial', 'adult'],
    title: '财务人员防诈：假冒领导转账指令', source: '@银保监会', duration: '9:15',
    desc: '财务人员是诈骗重点目标，讲解假冒领导紧急转账套路',
    url: 'https://v.qq.com/x/search/?q=%E8%B4%A2%E5%8A%A1%E4%BA%BA%E5%91%98%E9%98%B2%E8%AF%88%E9%AA%97',
  },
]

// ── 文本案例数据 ──────────────────────────────────────────────
const learnCategories = [
  { id: 'all',      icon: '📋', name: '全部案例',   count: 8 },
  { id: 'police',   icon: '👮', name: '冒充公检法', count: 2 },
  { id: 'invest',   icon: '📈', name: '投资理财',   count: 2 },
  { id: 'parttime', icon: '📦', name: '兼职刷单',   count: 1 },
  { id: 'romance',  icon: '💔', name: '情感诈骗',   count: 1 },
  { id: 'loan',     icon: '💸', name: '虚假贷款',   count: 1 },
  { id: 'ai',       icon: '🤖', name: 'AI合成诈骗', count: 1 },
]

const learnCases = [
  {
    cat: 'police', level: '极高风险', levelColor: '#ef4444', title: '冒充公安局洗钱案', date: '2024-03',
    summary: '诈骗分子冒充"市公安局刑警大队"，声称受害者银行账户涉嫌洗钱，要求将资产转入"安全账户"配合调查。',
    detail: '骗子通过网络电话拨打受害者手机，自称公安局警员，提供假冒的"通缉令"和"案件编号"。以"资产涉案需要配合保全"为由，要求受害者将存款转入指定账户，并严格要求不得告知家人。某市65岁老人被骗130万元。',
    tips: ['公检法绝不会电话通知涉案', '要求转账到"安全账户"是诈骗标志', '要求保密不让告诉家人是控制手段'],
    actions: ['立即挂断电话', '拨打110或96110核实', '告知家人或朋友', '不要操作任何转账'],
  },
  {
    cat: 'police', level: '极高风险', levelColor: '#ef4444', title: '冒充法院送达传票', date: '2024-01',
    summary: '假冒法院工作人员电话告知受害者卷入诉讼，要求配合"资产核查"，实为骗取转账。',
    detail: '骗子声称"您在某地有一起民事纠纷案件，法院已立案，需配合资产核查"，发送伪造法院文书，要求提供银行卡号和密码用于"冻结核查"，随即盗取资金。',
    tips: ['法院传票通过邮政EMS送达，不会电话通知', '任何要求提供银行密码的都是诈骗'],
    actions: ['登录中国裁判文书网核实案件', '拨打法院官方电话确认', '不提供任何银行账户信息'],
  },
  {
    cat: 'invest', level: '高风险', levelColor: '#f97316', title: '虚假股票内部消息群', date: '2024-02',
    summary: '骗子建立股票交流群，先推荐几支"赚钱"股票建立信任，再引导入金到虚假平台，最终无法提现。',
    detail: '受害者被陌生人拉入"股票交流群"，群内"老师"每日分享行情，前几次推荐股票确实小涨，信任建立后被引导到某不知名APP入金操作，初期显示盈利，提现时被要求缴纳"手续费"或"税费"，缴费后平台消失。',
    tips: ['正规股票平台不会在微信群操盘', '"稳赚"的内部消息不存在', '要求缴费才能提现是诈骗标志'],
    actions: ['在证监会官网查询平台资质', '不向非正规平台转入资金', '发现异常立即停止并报警'],
  },
  {
    cat: 'invest', level: '高风险', levelColor: '#f97316', title: '"杀猪盘"虚假投资', date: '2023-12',
    summary: '骗子伪装成成功人士，与受害者建立感情后推荐投资平台，最终卷款跑路。',
    detail: '骗子在交友APP或社交媒体物色目标，长期经营感情，分享"成功人生"，数月后以"带你赚钱"为由推荐投资平台。受害者入金后平台显示盈利，骗子鼓励加大投入，待金额足够大后平台关闭，骗子失联。',
    tips: ['网络认识的"成功人士"主动推荐投资100%是骗局', '恋爱对象要你投资必有问题'],
    actions: ['断绝联系', '向公安机关报案', '保留聊天记录作为证据'],
  },
  {
    cat: 'parttime', level: '中风险', levelColor: '#f59e0b', title: '刷单返佣诈骗', date: '2024-01',
    summary: '以兼职刷单为名，要求先垫付购买商品，承诺返还本金+佣金，实则层层加码最终卷款跑路。',
    detail: '受害者在招聘网站或社群看到"足不出户日赚300-500"广告，联系后被要求先垫付小额购物（如200元），成功返款后加大金额，逐步到数千上万元，最终以"任务未完成"为由拒绝返款并失联。',
    tips: ['正规兼职绝不需要垫付资金', '"先小后大"是诈骗惯用伎俩', '刷单本身就是违法行为'],
    actions: ['立即停止操作', '不再追加资金', '向平台举报并报警'],
  },
  {
    cat: 'romance', level: '高风险', levelColor: '#f97316', title: '婚恋交友情感诈骗', date: '2024-02',
    summary: '在婚恋平台物色目标，建立感情后以各种理由借钱，钱到手后消失。',
    detail: '骗子在婚恋/交友平台注册，使用帅气/漂亮的照片，主动热情交流，迅速建立亲密关系。以"生意周转""家人生病""遭遇意外"等理由借钱，金额从小到大，最终借款后消失或注销账号。',
    tips: ['网恋对象从未见面却要借钱必是骗局', '视频通话可能是录屏，不能作为身份证明'],
    actions: ['要求视频通话并出示身份证', '拒绝借钱或转账', '向平台举报该账号'],
  },
  {
    cat: 'loan', level: '中风险', levelColor: '#f59e0b', title: '虚假贷款诈骗', date: '2024-03',
    summary: '以"免抵押""低利息""秒放款"为噱头，要求先缴纳保证金、手续费等费用，实则骗钱。',
    detail: '骗子在网上发布"无需征信、秒批高额贷款"广告，受害者联系后被要求下载指定APP，填写信息后"审批通过"，但需先交"保证金"或"解冻费"才能放款，缴费后各种理由要求继续缴费，最终联系不上。',
    tips: ['正规贷款不会要求先缴费', '"解冻费""保证金"是诈骗惯用话术'],
    actions: ['通过银行或持牌金融机构申请贷款', '不向任何人先支付费用'],
  },
  {
    cat: 'ai', level: '极高风险', levelColor: '#ef4444', title: 'AI换脸冒充家人', date: '2024-03',
    summary: '利用AI技术克隆亲友声音或视频，冒充家人紧急求助借钱，防不胜防。',
    detail: '骗子获取受害者亲友的语音/视频素材（社交媒体公开内容），利用AI技术合成声音或视频，致电受害者称"遭遇意外急需用钱"，受害者因声音极像而轻信。',
    tips: ['AI可以完美复制声音和面孔', '视频通话也可能是AI合成的', '任何紧急转账都要多方核实'],
    actions: ['挂断后拨打家人本人手机核实', '设置家庭暗号验证身份'],
  },
]

// ── 防骗测试题库 ──────────────────────────────────────────────
const quizQuestions = [
  {
    q: '接到自称"公安局"的电话，说你银行账户涉嫌洗钱，要你转账到"安全账户"，你应该？',
    options: ['立即配合转账，配合调查', '挂断电话，拨打110核实', '先转一部分，边核实边配合', '要求对方发送证件照片后配合'],
    answer: 1,
    explain: '公检法机关绝对不会通过电话要求转账，遇到此类情况立即挂断并拨打110。',
  },
  {
    q: '微信上一个认识半年的"网友"说他在国外急需5万元周转，承诺一周内还，你会？',
    options: ['立即转账，好朋友应该帮助', '视频通话核实身份后再考虑', '婉拒，网络认识的人不借钱', '让他提供身份证照片后转账'],
    answer: 1,
    explain: 'AI可以伪造视频，但要求视频通话并让对方做特定动作可以一定程度识别。最安全的是直接拨打对方本人电话核实。',
  },
  {
    q: '以下哪种投资平台是安全的？',
    options: ['微信群里朋友推荐的高收益APP', '只能通过链接下载的投资软件', '在应用商店可以下载，有监管机构备案的平台', '承诺月收益15%的理财产品'],
    answer: 2,
    explain: '正规投资平台必须在监管机构备案，可在应用商店下载，且不会承诺保本保收益。',
  },
  {
    q: '"恭喜您中了100万大奖，只需缴纳5000元个人所得税即可领取"，这是？',
    options: ['真实中奖，应该缴税领奖', '诈骗，正规中奖不会要求先缴税', '可能是真的，先少缴一点试试', '要求提供银行卡号后再缴税'],
    answer: 1,
    explain: '真正的中奖奖税由主办方代扣代缴，不会要求获奖者自己转账缴税。此类情况100%是诈骗。',
  },
  {
    q: '收到快递短信"您的包裹因信息有误被退回，点击链接修改"，你应该？',
    options: ['立即点击链接修改信息', '拨打短信中的客服电话确认', '登录官方网站或APP查询快递状态', '回复短信询问包裹信息'],
    answer: 2,
    explain: '诈骗短信中的链接会窃取信息，电话也可能是假的。应通过快递公司官方APP或官网查询，或拨打快递公司官方客服电话。',
  },
  {
    q: '网上兼职招募"在家刷单，先垫付200元，完成后返还300元"，这是？',
    options: ['可能是真的，先试一单', '100%是诈骗，正规兼职不需要垫付', '可以做，但只垫付小额', '联系对方核实后再决定'],
    answer: 1,
    explain: '刷单本身是违法行为，且任何需要垫付资金的兼职都是诈骗。不要被"小金额试试"的策略迷惑。',
  },
  {
    q: '以下哪个行为可以有效防范AI换脸诈骗？',
    options: ['只接受文字聊天，不视频通话', '与家人设定专属暗号验证身份', '不在社交媒体发布自己的视频', '以上都是有效方法'],
    answer: 3,
    explain: '设定家庭暗号是最有效的方法，但减少公开发布个人视频和要求视频核实也都是有效防范措施。',
  },
  {
    q: '贷款APP声称"免抵押、无需征信、秒批10万"，需要先缴纳1000元"解冻费"才能放款，这是？',
    options: ['正规贷款，缴费就能拿到钱', '诈骗，正规贷款不会要求先缴费', '可能是真的，先缴费试试', '要求降低手续费后再缴费'],
    answer: 1,
    explain: '正规金融机构不会以任何名义要求贷款前先缴费，"解冻费""保证金""手续费"都是诈骗套路。',
  },
  {
    q: '朋友发来消息说他现在在外地，手机欠费停机，用朋友手机借你微信转1000元，你会？',
    options: ['立即转账，朋友有难应该帮', '拨打朋友本人手机号码核实', '要求发语音消息确认', '让对方视频通话确认身份'],
    answer: 1,
    explain: '最直接的核实方式是拨打朋友本人手机。骗子可能盗取了朋友账号，语音和视频都可能是AI合成。',
  },
  {
    q: '以下哪种情况最可能是诈骗？',
    options: ['银行短信提示账户有可疑登录，官方号码发来的', '邻居说有个投资项目，承诺年收益50%', '快递员电话说包裹签收需要本人到场', '医院短信提醒体检结果可查询'],
    answer: 1,
    explain: '"年收益50%"远超正常投资回报（正规理财年收益一般在3-8%），任何承诺超高回报的投资100%有诈骗风险。',
  },
]

// ══════════════════════════════════════════════════════════════
// composable 主体
// ══════════════════════════════════════════════════════════════
export function useLearnHall() {
  const auth = useAuthStore()

  // 学习大厅响应式状态（所有用 lh.xxx 访问的状态放这里）
  const lh = ref({
    learnTab: 'text' as 'text' | 'image' | 'video' | 'quiz',
    learnActiveCat: 'all',
    learnSelectedCase: null as number | null,
    learnImageModal: null as Record<string, unknown> | null,
    // quiz 状态
    quizStarted: false,
    quizFinished: false,
    quizCurrent: 0,
    quizScore: 0,
    quizAnswered: false,
    quizAnswerLog: {} as Record<number, number>,
  })

  // ── 计算属性 ──────────────────────────────────────────────
  const learnCasesFiltered = computed(() => {
    const identity = auth.currentUser?.identity || 'adult'
    const all =
      lh.value.learnActiveCat === 'all'
        ? learnCases
        : learnCases.filter((c) => c.cat === lh.value.learnActiveCat)

    // 按身份优先排序
    const priorityMap: Record<string, string[]> = {
      elder:    ['police', 'ai', 'romance'],
      student:  ['parttime', 'loan', 'invest'],
      financial:['invest', 'police', 'romance'],
      adult:    ['police', 'invest', 'ai'],
    }
    const priority = priorityMap[identity] ?? priorityMap['adult'] ?? []
    return [...all].sort((a, b) => {
      const pa = priority.indexOf(a.cat)
      const pb = priority.indexOf(b.cat)
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb)
    })
  })

  const sortedLearnVideos = computed(() => {
    const identity = auth.currentUser?.identity || 'adult'
    return [...learnVideos].sort((a, b) => {
      const ra = (a.forRole || []).includes(identity) ? 0 : 1
      const rb = (b.forRole || []).includes(identity) ? 0 : 1
      return ra - rb
    })
  })

  // ── quiz 方法 ──────────────────────────────────────────────
  function quizStart() {
    lh.value.quizStarted = true
    lh.value.quizFinished = false
    lh.value.quizCurrent = 0
    lh.value.quizScore = 0
    lh.value.quizAnswered = false
    lh.value.quizAnswerLog = {}
  }

  function quizAnswer(optIdx: number) {
    if (lh.value.quizAnswered) return
    lh.value.quizAnswered = true
    lh.value.quizAnswerLog = { ...lh.value.quizAnswerLog, [lh.value.quizCurrent]: optIdx }
    const currentQ = quizQuestions[lh.value.quizCurrent]
    if (currentQ && optIdx === currentQ.answer) lh.value.quizScore++
  }

  function quizGetStyle(oi: number) {
    const q = quizQuestions[lh.value.quizCurrent]
    if (!lh.value.quizAnswered || !q)
      return 'border-color:var(--border);background:rgba(6,11,22,0.6);color:var(--text)'
    if (oi === q.answer)
      return 'border-color:var(--green);background:rgba(16,185,129,0.1);color:#34d399'
    const myAnswer = lh.value.quizAnswerLog[lh.value.quizCurrent]
    if (myAnswer !== undefined && oi === myAnswer)
      return 'border-color:var(--red);background:rgba(239,68,68,0.1);color:#f87171'
    return 'border-color:var(--border);background:transparent;color:var(--muted);opacity:0.5'
  }

  function quizNext() {
    if (lh.value.quizCurrent < quizQuestions.length - 1) {
      lh.value.quizCurrent++
      lh.value.quizAnswered = false
    } else {
      lh.value.quizStarted = false
      lh.value.quizFinished = true
    }
  }

  return {
    lh,
    auth,
    learnCategories,
    learnCasesFiltered,
    learnImageCards,
    sortedLearnVideos,
    quizQuestions,
    quizStart,
    quizAnswer,
    quizGetStyle,
    quizNext,
  }
}