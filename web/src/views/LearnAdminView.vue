<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// ── 类型定义 ─────────────────────────────────
interface Quiz {
  id: string; question: string; options: string[]
  answer: number; explanation: string
  difficulty: 'easy' | 'medium' | 'hard'; category: string
}
interface LearningCase {
  id: string; title: string; level: string; levelColor: string
  date: string; summary: string; detail: string
  tips: string[]; actions: string[]; category: string
}
interface VideoItem {
  id: string; title: string; desc: string; duration: string
  source: string; platform: string; url: string; emoji: string
  bg1: string; bg2: string; targetIdentity: string
}

import { getApiBase } from '@/config/api'
const BASE = getApiBase()
const activeTab = ref<'cases' | 'quiz' | 'video'>('cases')

// ══════════════════════════════════════════════
// 文本案例管理
// ══════════════════════════════════════════════
const MOCK_CASES: LearningCase[] = [
  { id: 'c1', title: 'AI换脸骗局全解析', level: '极危', levelColor: '#ef4444', date: '2024-03', summary: '骗子利用AI实时换脸技术冒充亲属视频通话，诱骗转账。', detail: '受害人接到"儿子"视频电话，说在国外遇到紧急情况急需转账，受害人因视频中对方面孔和声音都一致而信以为真。', tips: ['AI换脸可实时伪造，不可仅凭视频判断', '先挂断回拨本人真实号码核实', '涉及转账必须当面确认'], actions: ['接到此类电话先挂断', '拨打对方本人号码核实', '通过银行官方渠道确认'], category: 'AI合成语音诈骗' },
  { id: 'c2', title: '刷单兼职诈骗套路', level: '高危', levelColor: '#f97316', date: '2024-02', summary: '以高佣金为诱饵，诱导先行垫付再卷款跑路。', detail: '受害人在社交平台看到"在家动动手指日赚300"的广告，联系对方后被引导到一个刷单平台，完成小额任务拿到返佣后放松警惕，在大额任务垫付后对方失联。', tips: ['正规兼职不需要垫付资金', '刷单本身是违法行为', '先小额返佣是固定套路'], actions: ['遇到需要垫资的兼职直接拒绝', '向相关部门举报', '提醒周围人警惕'], category: '兼职刷单诈骗' },
  { id: 'c3', title: '冒充公检法诈骗', level: '极危', levelColor: '#ef4444', date: '2024-01', summary: '骗子冒充警察称你涉案，要求转到安全账户配合调查。', detail: '接到"公安局"电话，说你的银行卡涉嫌洗钱，需要配合调查，要求把存款转到所谓"安全账户"，全程要求保密。', tips: ['公检法不会电话要求转账', '安全账户根本不存在', '要求保密是骗局特征'], actions: ['立即挂断拨打110核实', '不要安装任何软件', '不要透露任何个人信息'], category: '冒充公检法诈骗' },
  { id: 'c4', title: '投资理财诈骗', level: '高危', levelColor: '#f97316', date: '2024-01', summary: '虚假投资平台以高收益为诱饵，先小赚后血本无归。', detail: '陌生人在社交平台加好友，声称有内部消息或专业团队，引导下载虚假理财APP，前期小额盈利后诱导大额投入，再以各种借口无法提现。', tips: ['任何保本高收益均为诈骗', '向证监会官网核查平台资质', '警惕陌生人推荐的投资项目'], actions: ['向证监会12386举报', '不要继续转账', '保存证据报警'], category: '投资理财诈骗' },
  { id: 'c5', title: '婚恋交友情感诈骗', level: '高危', levelColor: '#f97316', date: '2024-02', summary: '在婚恋平台物色目标，建立感情后以各种理由借钱，钱到手后消失。', detail: '骗子在婚恋/交友平台注册，使用帅气/漂亮照片，主动热情交流，迅速建立亲密关系。以"生意周转""家人生病""遭遇意外"等理由借钱，金额从小到大，最终借款后消失或注销账号。', tips: ['网恋对象从未见面却要借钱必是骗局', '视频通话可能是录屏，不能作为身份证明', '要求保密不让告诉家人是控制手段'], actions: ['要求视频通话并出示身份证', '拒绝任何形式借钱或转账', '向平台举报该账号'], category: '情感诈骗' },
  { id: 'c6', title: '虚假贷款诈骗', level: '中危', levelColor: '#f59e0b', date: '2024-03', summary: '以"免抵押""低利息""秒放款"为噱头，要求先缴纳保证金，实则骗钱。', detail: '骗子在网上发布"无需征信、秒批高额贷款"广告，受害者联系后被要求下载指定APP，填写信息后"审批通过"，但需先交"保证金"或"解冻费"才能放款，缴费后各种理由要求继续缴费。', tips: ['正规贷款不会要求先缴费', '"解冻费""保证金"是诈骗惯用话术', 'APP只能通过链接下载说明不正规'], actions: ['通过银行或持牌金融机构申请贷款', '不向任何人先支付费用', '遭骗立即报警并保存转账记录'], category: '虚假贷款诈骗' },
  { id: 'c7', title: '虚假中奖诈骗', level: '中危', levelColor: '#f59e0b', date: '2024-02', summary: '"恭喜您中了100万"——缴税费才能领奖，实则骗局。', detail: '受害人收到弹窗或短信称中了大奖，联系客服后被告知需缴纳个人所得税、手续费、公证费等，每缴一笔又提出新要求，奖金永远无法到账。', tips: ['真实中奖税费由主办方代扣，不会让你先缴', '从未参与过的活动不可能中奖', '时间紧迫感是骗局制造的假象'], actions: ['直接忽略中奖通知', '不要点击任何链接', '向消费者协会或警方举报'], category: '虚假中奖诈骗' },
  { id: 'c8', title: '网络游戏账号诈骗', level: '低危', levelColor: '#3b82f6', date: '2024-01', summary: '低价出售游戏账号或装备，收款后拉黑或账号被追回。', detail: '骗子在游戏论坛或交易平台发布低价账号/装备广告，要求先付定金，给出虚假账号后各种理由追加费用，或给出真实账号收款后通过申诉把账号追回。', tips: ['正规游戏交易应通过官方渠道', '付定金后继续要钱是骗局', '远低于市场价的账号必有猫腻'], actions: ['通过游戏官方平台交易', '使用支持担保的第三方平台', '遇到骗局向游戏公司举报'], category: '网络游戏诈骗' },
  { id: 'c9', title: '虚假购物退款诈骗', level: '高危', levelColor: '#f97316', date: '2024-03', summary: '冒充电商客服称商品有问题需退款，诱导输入银行卡信息盗刷。', detail: '骗子冒充淘宝、京东等平台客服，称受害者购买的商品存在质量问题需赔偿退款，引导受害者到钓鱼网站填写银行卡号、密码和验证码，随即盗刷银行卡。', tips: ['正规退款走平台流程，不会要求填写银行卡密码', '平台客服不会在站外联系你', '验证码是保护你的，绝不能告诉任何人'], actions: ['通过平台官方客服核实', '不要在陌生链接填写任何银行信息', '收到验证码立即警惕'], category: '虚假购物诈骗' },
  { id: 'c10', title: '校园贷诈骗', level: '高危', levelColor: '#f97316', date: '2024-02', summary: '以低门槛大额度为诱惑，收取高额手续费后失联或持续勒索。', detail: '骗子在校园附近或社交媒体面向学生宣传"无需家长担保、秒批万元"贷款，收取手续费后失联，或诱导学生裸贷后持续勒索，危害极大。', tips: ['正规贷款机构不会要求裸照等隐私', '高额手续费是骗局前兆', '向家长或学校老师求助不可耻'], actions: ['遭受裸贷勒索立即向警方报案', '不要继续支付任何费用', '保存所有聊天记录和转账记录'], category: '虚假贷款诈骗' },
  { id: 'c11', title: '冒充领导紧急转账', level: '极危', levelColor: '#ef4444', date: '2024-03', summary: '骗子入侵或冒充领导微信，以紧急业务为由要求财务人员转账。', detail: '骗子盗取或伪造公司领导的微信账号，向财务人员发送紧急转账指令，要求保密且限时完成，利用员工对领导的信任和紧迫感，骗取公司资金。', tips: ['任何转账指令必须电话二次确认', '涉及大额转账必须当面核实', '紧急+保密+转账=诈骗三要素'], actions: ['立即拨打领导本人电话核实', '暂停转账操作', '向公司财务合规部门报告'], category: '冒充公检法诈骗' },
  { id: 'c12', title: '征信修复诈骗', level: '中危', levelColor: '#f59e0b', date: '2024-01', summary: '以帮你消除不良征信记录为由收费，不存在所谓"征信修复"。', detail: '骗子声称可以帮助消除银行贷款逾期、网贷记录等不良征信，收取高额服务费。实际上征信记录无法人工删除，只能等待自然消除或向人民银行申请异议处理。', tips: ['征信记录无法被人工删除', '只有人民银行才能处理征信异议', '任何声称修复征信的都是诈骗'], actions: ['向中国人民银行征信中心查询', '拨打12363征信服务热线', '向公安机关举报诈骗行为'], category: '虚假征信诈骗' },
]

const cases = ref<LearningCase[]>([...MOCK_CASES])
const showCaseForm = ref(false)
const editCase = ref<LearningCase | null>(null)
const caseForm = ref({ title: '', level: '高危', levelColor: '#f97316', date: '', summary: '', detail: '', tips: ['', '', ''], actions: ['', '', ''], category: 'AI合成语音诈骗' })
const fraudCategories = ['AI合成语音诈骗','投资理财诈骗','兼职刷单诈骗','冒充公检法诈骗','情感诈骗','虚假购物诈骗','虚假贷款诈骗','虚假中奖诈骗','虚假征信诈骗','网络游戏诈骗']
const levelOptions = [
  { label: '极危', color: '#ef4444' }, { label: '高危', color: '#f97316' },
  { label: '中危', color: '#f59e0b' }, { label: '低危', color: '#3b82f6' },
]

function openAddCase() {
  editCase.value = null
  caseForm.value = { title: '', level: '高危', levelColor: '#f97316', date: new Date().toISOString().slice(0,7), summary: '', detail: '', tips: ['','',''], actions: ['','',''], category: '兼职刷单诈骗' }
  showCaseForm.value = true
}
function openEditCase(c: LearningCase) {
  editCase.value = c
  caseForm.value = { ...c, tips: [...c.tips, '', ''].slice(0,3), actions: [...c.actions, '', ''].slice(0,3) }
  showCaseForm.value = true
}
function saveCase() {
  const item: LearningCase = {
    id: editCase.value?.id || `c_${Date.now()}`,
    ...caseForm.value,
    tips: caseForm.value.tips.filter(t => t.trim()),
    actions: caseForm.value.actions.filter(a => a.trim()),
  }
  if (editCase.value) {
    const idx = cases.value.findIndex(c => c.id === editCase.value!.id)
    if (idx !== -1) cases.value[idx] = item
  } else {
    cases.value.unshift(item)
  }
  showCaseForm.value = false
}
function deleteCase(id: string) {
  if (!confirm('确定删除这个案例？')) return
  cases.value = cases.value.filter(c => c.id !== id)
}

// ══════════════════════════════════════════════
// 防骗测试题库管理
// ══════════════════════════════════════════════
const MOCK_QUIZZES: Quiz[] = [
  { id: 'q1', question: '收到陌生人发来的红包链接，应该怎么做？', options: ['直接点击领取','询问对方后再点','忽略不理','举报该链接'], answer: 3, explanation: '陌生人发来的红包链接极有可能是钓鱼网站，应举报并忽略。', difficulty: 'easy', category: '网络诈骗' },
  { id: 'q2', question: '接到自称公安局的电话说你涉案，要求转账配合调查，你应该？', options: ['立即转账','先转账后报案','挂断电话拨打110核实','要求对方提供工号后转账'], answer: 2, explanation: '公安机关不会通过电话要求转账，应立即挂断并拨打110。', difficulty: 'medium', category: '冒充公检法' },
  { id: 'q3', question: '以下哪种行为属于杀猪盘诈骗的特征？', options: ['陌生人主动搭讪并发展感情随后引导投资','朋友介绍的理财产品','银行工作人员推荐的理财','正规平台的股票交易'], answer: 0, explanation: '杀猪盘通常以网恋为幌子，建立感情后引导受害者投资虚假平台。', difficulty: 'hard', category: '情感诈骗' },
  { id: 'q4', question: '下列哪种说法是正确的？', options: ['网络兼职刷单是合法赚钱方式','刷单本身属于违法行为且容易被骗','刷单平台都经过官方认证','完成任务后一定会返还本金'], answer: 1, explanation: '刷单属于违法行为，正规兼职不需要垫付任何资金。', difficulty: 'easy', category: '兼职刷单' },
  { id: 'q5', question: '收到声称可以帮你清除征信记录的电话，你应该？', options: ['支付服务费请对方处理','先了解方案再决定','直接挂断，征信只能向人民银行申请','请对方提供资质证明后再谈'], answer: 2, explanation: '任何清除征信的说法均为谎言，只能向人民银行申请处理。', difficulty: 'medium', category: '虚假征信' },
  { id: 'q6', question: '网上认识的人说有内部股票消息，推荐你下载一个APP投资，你应该？', options: ['下载试试，先投小额','要求对方先投资证明真实性','拒绝，正规投资不通过陌生人推荐','让朋友帮你核实后再投'], answer: 2, explanation: '通过陌生人推荐的投资APP极大概率是诈骗，正规投资平台不需要通过私人渠道推广。', difficulty: 'medium', category: '金融诈骗' },
  { id: 'q7', question: '接到一个电话，对方声音和你妈妈一模一样，说在外地急需转账，你应该？', options: ['立即转账，妈妈需要帮助','要求视频通话确认身份后转账','挂断后拨打妈妈本人手机号核实','要求对方说出家庭暗号再转账'], answer: 2, explanation: 'AI可以克隆声音，视频也可能是合成的。最安全的做法是挂断后拨打对方本人号码核实，或设置家庭暗号。', difficulty: 'hard', category: '电信诈骗' },
  { id: 'q8', question: '以下哪种情况最可能是诈骗？', options: ['银行发短信提示账单，附官方网址','朋友介绍的理财产品月收益3%','陌生人推荐的虚拟货币平台保证每天盈利5%','银行工作人员上门推销理财'], answer: 2, explanation: '每天5%的收益率意味着年化超1800%，任何保证超高收益的投资都是诈骗。正规投资有风险，没有"保证盈利"。', difficulty: 'easy', category: '金融诈骗' },
  { id: 'q9', question: '在游戏里有人说可以帮你刷装备，要求先付500元，你应该？', options: ['先付100元测试','付500元，游戏代练是正常服务','拒绝，游戏代练违反用户协议且容易被骗','要求对方先刷一件装备再付钱'], answer: 2, explanation: '游戏代练违反用户协议，且绝大多数是诈骗。收钱后失联或用你的账号刷装备后跑路是常见套路。', difficulty: 'easy', category: '网络游戏' },
  { id: 'q10', question: '收到快递短信"您的包裹因地址有误被退回，点击链接修改"，你应该？', options: ['点击链接修改地址','回复短信询问快递员','登录官方快递APP或官网查询包裹状态','拨打短信中的客服电话核实'], answer: 2, explanation: '诈骗短信中的链接会盗取信息，电话也可能是假的。应通过官方APP或网站查询，或拨打快递公司官方客服。', difficulty: 'easy', category: '网络诈骗' },
  { id: 'q11', question: '对方在视频通话中展示了证件，证明自己是警察，这是否可信？', options: ['可信，视频中的证件是真实的','不可信，证件可能是PS的，视频也可能是预录的','需要再核实工号才可信','只要证件上的信息与网上一致就可信'], answer: 1, explanation: '证件可以PS，视频可以是预录的或AI合成的。真正的公安机关会当面出示证件，不会通过视频电话执法。', difficulty: 'hard', category: '冒充公检法' },
  { id: 'q12', question: '以下哪个行为可以有效防范AI换脸诈骗？', options: ['接到家人视频就放心转账','只接受文字聊天不视频','与家人约定专属暗号验证身份','收到视频后要求对方当场做特定动作'], answer: 2, explanation: '设定家庭暗号是最有效的方法——暗号只有真正的家人知道，AI无法猜测。要求做特定动作也有一定效果，但AI实时换脸技术也在进步。', difficulty: 'hard', category: '电信诈骗' },
  { id: 'q13', question: '朋友圈有人卖特价iPhone，价格只有正品的一半，你应该？', options: ['直接购买，省钱就行','通过微信转账购买，有记录更安全','要求走正规电商平台交易或当面交易','先付定金，收到货确认没问题再付尾款'], answer: 2, explanation: '远低于市场价的商品极可能是假货或诈骗。正规交易应通过有买家保护的电商平台，私下微信转账没有任何保障。', difficulty: 'medium', category: '虚假购物' },
  { id: 'q14', question: '某人声称是你老同学，联系你后开口借钱，你应该？', options: ['老同学信得过，直接借','视频通话看到脸就可以借','打电话到对方以前的手机号码核实身份','要求对方提供借条后再借'], answer: 2, explanation: '账号可能被盗，视频可能是AI合成。最可靠的方式是拨打你记忆中的对方手机号码（不是消息里发来的号码）进行核实。', difficulty: 'medium', category: '网络诈骗' },
  { id: 'q15', question: '被骗后，以下哪个做法最重要？', options: ['立即继续缴费"赎回"已损失的钱','删除与骗子的聊天记录避免尴尬','立即保存所有证据并拨打110报案','先向朋友借钱弥补损失再报案'], answer: 2, explanation: '被骗后最重要的是保存证据（截图、转账记录、聊天记录）并立即报警。继续缴费只会损失更多，删除记录会影响破案。', difficulty: 'easy', category: '其他' },
]

const quizzes = ref<Quiz[]>([...MOCK_QUIZZES])
const quizLoading = ref(false)
const showQuizForm = ref(false)
const editQuiz = ref<Quiz | null>(null)
const quizForm = ref({ question: '', options: ['','','',''], answer: 0, explanation: '', difficulty: 'easy' as 'easy'|'medium'|'hard', category: '电信诈骗' })
const quizCategories = ['电信诈骗','网络诈骗','金融诈骗','情感诈骗','兼职刷单','冒充公检法','虚假征信','虚假购物','网络游戏','其他']
const diffLabel: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' }
const diffColor: Record<string, string> = { easy: 'rgba(34,197,94,0.12);color:#4ade80;border:1px solid rgba(34,197,94,0.3)', medium: 'rgba(245,158,11,0.12);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)', hard: 'rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.3)' }

async function loadQuizzes() {
  quizLoading.value = true
  try {
    const token = localStorage.getItem('token') || ''
    const res = await fetch(`${BASE}/api/admin/learn/quizzes`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const d = await res.json()
      if (Array.isArray(d) && d.length > quizzes.value.length) quizzes.value = d
    }
  } catch { /* 保留mock数据 */ } finally { quizLoading.value = false }
}

function openAddQuiz() {
  editQuiz.value = null
  quizForm.value = { question: '', options: ['','','',''], answer: 0, explanation: '', difficulty: 'easy', category: '电信诈骗' }
  showQuizForm.value = true
}
function openEditQuiz(q: Quiz) {
  editQuiz.value = q
  quizForm.value = { ...q, options: [...q.options] }
  showQuizForm.value = true
}
async function saveQuiz() {
  const token = localStorage.getItem('token') || ''
  const body = JSON.stringify(quizForm.value)
  try {
    if (editQuiz.value) {
      await fetch(`${BASE}/api/admin/learn/quizzes/${editQuiz.value.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body })
      const idx = quizzes.value.findIndex(q => q.id === editQuiz.value!.id)
      if (idx !== -1) quizzes.value[idx] = { ...editQuiz.value, ...quizForm.value }
    } else {
      const res = await fetch(`${BASE}/api/admin/learn/quizzes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body }).catch(() => null)
      const newId = res ? ((await res.json().catch(() => ({}))).id ?? `q_${Date.now()}`) : `q_${Date.now()}`
      quizzes.value.push({ id: newId, ...quizForm.value })
    }
  } catch { if (!editQuiz.value) quizzes.value.push({ id: `q_${Date.now()}`, ...quizForm.value }) }
  showQuizForm.value = false
}
async function deleteQuiz(id: string) {
  if (!confirm('确定删除这道题？')) return
  const token = localStorage.getItem('token') || ''
  try { await fetch(`${BASE}/api/admin/learn/quizzes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }) } catch { /* ignore */ }
  quizzes.value = quizzes.value.filter(q => q.id !== id)
}

// ══════════════════════════════════════════════
// 视频教程管理
// ══════════════════════════════════════════════
const MOCK_VIDEOS: VideoItem[] = [
  { id: 'v1', title: '老年人防诈骗指南：认识AI换脸骗局', desc: '专为老年人设计，用简单易懂的方式讲解AI换脸诈骗', duration: '8:24', source: '国家反诈中心', platform: '腾讯', url: 'https://v.qq.com/x/search/?q=反诈警示片', emoji: '👴', bg1: '#1e3a5f', bg2: '#2d6a4f', targetIdentity: 'elder' },
  { id: 'v2', title: '大学生防刷单诈骗——识别高薪兼职陷阱', desc: '针对学生群体的刷单诈骗案例分析与防范指南', duration: '6:15', source: '公安部', platform: 'B站', url: 'https://www.bilibili.com/search?keyword=防诈骗', emoji: '🎓', bg1: '#1e1b4b', bg2: '#312e81', targetIdentity: 'student' },
  { id: 'v3', title: '投资理财诈骗全解析：如何识别虚假平台', desc: '深度解析投资诈骗套路，教你识别虚假理财平台', duration: '12:30', source: '证监会', platform: '优酷', url: 'https://www.youku.com/search_video/q_反诈警示.html', emoji: '💹', bg1: '#1a1035', bg2: '#2d1b69', targetIdentity: 'financial' },
  { id: 'v4', title: '冒充公检法诈骗——最新套路揭秘', desc: '最新冒充公检法诈骗手法分析，附真实案例还原', duration: '9:47', source: '央视新闻', platform: '腾讯', url: 'https://v.qq.com/x/search/?q=反诈', emoji: '🚔', bg1: '#1c1917', bg2: '#292524', targetIdentity: 'adult' },
]

const videos = ref<VideoItem[]>([...MOCK_VIDEOS])
const showVideoForm = ref(false)
const editVideo = ref<VideoItem | null>(null)
const videoForm = ref({ title: '', desc: '', duration: '', source: '', platform: '腾讯', url: '', emoji: '🎬', bg1: '#1e3a5f', bg2: '#2d6a4f', targetIdentity: 'adult' })
const platformOptions = ['腾讯', 'B站', '优酷', '爱奇艺', '其他']
const identityOptions = [{ value: 'elder', label: '老年人' }, { value: 'student', label: '学生' }, { value: 'financial', label: '财务人员' }, { value: 'adult', label: '普通成人' }]

function openAddVideo() {
  editVideo.value = null
  videoForm.value = { title: '', desc: '', duration: '', source: '国家反诈中心', platform: '腾讯', url: '', emoji: '🎬', bg1: '#1e3a5f', bg2: '#2d6a4f', targetIdentity: 'adult' }
  showVideoForm.value = true
}
function openEditVideo(v: VideoItem) {
  editVideo.value = v
  videoForm.value = { ...v }
  showVideoForm.value = true
}
function saveVideo() {
  const item: VideoItem = { id: editVideo.value?.id || `v_${Date.now()}`, ...videoForm.value }
  if (editVideo.value) {
    const idx = videos.value.findIndex(v => v.id === editVideo.value!.id)
    if (idx !== -1) videos.value[idx] = item
  } else { videos.value.unshift(item) }
  showVideoForm.value = false
}
function deleteVideo(id: string) {
  if (!confirm('确定删除这个视频？')) return
  videos.value = videos.value.filter(v => v.id !== id)
}

// 统计
const stats = computed(() => ({
  cases: cases.value.length,
  quizzes: quizzes.value.length,
  videos: videos.value.length,
  easyQ: quizzes.value.filter(q => q.difficulty === 'easy').length,
}))

onMounted(() => { void loadQuizzes() })
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">🎓 学习大厅管理</div>
      <div class="page-subtitle">文本案例 · 防骗题库 · 视频教程 管理</div>
    </div>

    <!-- 统计 -->
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat"><div class="stat-icon" style="color:var(--blue)">📖</div><div class="stat-value" style="color:var(--blue)">{{ stats.cases }}</div><div class="stat-label">案例数</div></div>
      <div class="stat"><div class="stat-icon" style="color:#a78bfa">🧩</div><div class="stat-value" style="color:#a78bfa">{{ stats.quizzes }}</div><div class="stat-label">题目数</div></div>
      <div class="stat"><div class="stat-icon" style="color:var(--cyan)">🎬</div><div class="stat-value" style="color:var(--cyan)">{{ stats.videos }}</div><div class="stat-label">视频数</div></div>
      <div class="stat"><div class="stat-icon" style="color:var(--green)">🟢</div><div class="stat-value" style="color:var(--green)">{{ stats.easyQ }}</div><div class="stat-label">简单题</div></div>
    </div>

    <!-- Tab -->
    <div class="tab-row" style="margin-bottom:20px;width:fit-content">
      <button class="tab-btn" :class="{active:activeTab==='cases'}" @click="activeTab='cases'">📖 文本案例</button>
      <button class="tab-btn" :class="{active:activeTab==='quiz'}" @click="activeTab='quiz'">🧩 防骗题库</button>
      <button class="tab-btn" :class="{active:activeTab==='video'}" @click="activeTab='video'">🎬 视频教程</button>
    </div>

    <!-- ══ 文本案例 ══ -->
    <template v-if="activeTab==='cases'">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div class="card-title" style="margin:0">📖 案例列表</div>
          <button class="btn btn-primary" type="button" style="font-size:12px;padding:7px 16px" @click="openAddCase">＋ 新增案例</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div v-for="c in cases" :key="c.id"
            style="padding:16px;border-radius:12px;border:1px solid var(--border);background:rgba(99,102,241,0.03)">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
                  <span style="padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid"
                    :style="`background:${c.levelColor}22;color:${c.levelColor};border-color:${c.levelColor}44`">{{ c.level }}</span>
                  <span style="padding:2px 8px;border-radius:20px;font-size:11px;background:rgba(99,102,241,0.1);color:#a78bfa;border:1px solid rgba(99,102,241,0.2)">{{ c.category }}</span>
                  <span style="font-size:11px;color:var(--dim)">{{ c.date }}</span>
                </div>
                <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px">{{ c.title }}</div>
                <div style="font-size:12px;color:var(--muted);line-height:1.6">{{ c.summary }}</div>
                <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                  <span v-for="tip in c.tips.slice(0,2)" :key="tip"
                    style="font-size:11px;padding:2px 8px;border-radius:6px;background:rgba(239,68,68,0.08);color:#f87171;border:1px solid rgba(239,68,68,0.15)">
                    🚩 {{ tip.slice(0,20) }}{{ tip.length>20?'…':'' }}
                  </span>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
                <button type="button" style="padding:5px 12px;border-radius:8px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.08);color:#a78bfa;font-size:12px;cursor:pointer" @click="openEditCase(c)">✏️ 编辑</button>
                <button type="button" style="padding:5px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.06);color:#f87171;font-size:12px;cursor:pointer" @click="deleteCase(c.id)">🗑️ 删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ 防骗题库 ══ -->
    <template v-if="activeTab==='quiz'">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div class="card-title" style="margin:0">🧩 题目列表</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline" type="button" style="font-size:12px;padding:7px 14px" @click="loadQuizzes">🔄 刷新</button>
            <button class="btn btn-primary" type="button" style="font-size:12px;padding:7px 16px" @click="openAddQuiz">＋ 新增题目</button>
          </div>
        </div>
        <div v-if="quizLoading" style="text-align:center;padding:32px;color:var(--muted)">⏳ 加载中...</div>
        <div v-else style="display:flex;flex-direction:column;gap:12px">
          <div v-for="(q,i) in quizzes" :key="q.id"
            style="padding:16px;border-radius:12px;border:1px solid var(--border);background:rgba(99,102,241,0.03)">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
                  <span style="font-size:12px;color:var(--dim);font-family:'JetBrains Mono',monospace">Q{{ i+1 }}</span>
                  <span style="padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700" :style="diffColor[q.difficulty]">{{ diffLabel[q.difficulty] }}</span>
                  <span style="padding:2px 8px;border-radius:20px;font-size:11px;background:rgba(99,102,241,0.1);color:#a78bfa;border:1px solid rgba(99,102,241,0.2)">{{ q.category }}</span>
                </div>
                <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:10px;line-height:1.5">{{ q.question }}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                  <div v-for="(opt,oi) in q.options" :key="oi"
                    style="padding:5px 10px;border-radius:8px;font-size:12px;display:flex;align-items:center;gap:6px"
                    :style="oi===q.answer?'background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);color:#4ade80':'background:rgba(255,255,255,0.03);border:1px solid var(--border);color:var(--muted)'">
                    <span style="font-weight:700;font-family:'JetBrains Mono',monospace">{{ ['A','B','C','D'][oi] }}</span>
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ opt }}</span>
                    <span v-if="oi===q.answer" style="margin-left:auto;flex-shrink:0">✓</span>
                  </div>
                </div>
                <div v-if="q.explanation" style="margin-top:8px;padding:8px 12px;border-radius:8px;background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.15);font-size:12px;color:var(--cyan)">
                  💡 {{ q.explanation }}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
                <button type="button" style="padding:5px 12px;border-radius:8px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.08);color:#a78bfa;font-size:12px;cursor:pointer;white-space:nowrap" @click="openEditQuiz(q)">✏️ 编辑</button>
                <button type="button" style="padding:5px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.06);color:#f87171;font-size:12px;cursor:pointer;white-space:nowrap" @click="deleteQuiz(q.id)">🗑️ 删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ 视频教程 ══ -->
    <template v-if="activeTab==='video'">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div class="card-title" style="margin:0">🎬 视频列表</div>
          <button class="btn btn-primary" type="button" style="font-size:12px;padding:7px 16px" @click="openAddVideo">＋ 新增视频</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
          <div v-for="v in videos" :key="v.id"
            style="border-radius:12px;border:1px solid var(--border);overflow:hidden;background:rgba(99,102,241,0.03)">
            <div style="height:100px;display:flex;align-items:center;justify-content:center;position:relative" :style="`background:linear-gradient(135deg,${v.bg1},${v.bg2})`">
              <div style="font-size:40px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5))">{{ v.emoji }}</div>
              <div style="position:absolute;bottom:6px;right:8px;background:rgba(0,0,0,0.75);color:#fff;font-size:11px;padding:2px 8px;border-radius:4px;font-family:monospace">{{ v.duration }}</div>
              <div style="position:absolute;top:6px;left:8px;background:rgba(0,0,0,0.6);color:#fff;font-size:10px;padding:2px 8px;border-radius:10px">{{ v.source }}</div>
              <div style="position:absolute;top:6px;right:8px;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700"
                :style="v.platform==='腾讯'?'background:#1f64a8;color:#fff':v.platform==='优酷'?'background:#0f52ba;color:#fff':v.platform==='爱奇艺'?'background:#00be06;color:#fff':'background:#fb7299;color:#fff'">
                {{ v.platform }}
              </div>
            </div>
            <div style="padding:12px">
              <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px;line-height:1.4">{{ v.title }}</div>
              <div style="font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5">{{ v.desc }}</div>
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:rgba(99,102,241,0.1);color:#a78bfa;border:1px solid rgba(99,102,241,0.2)">
                  {{ identityOptions.find(i=>i.value===v.targetIdentity)?.label || '通用' }}
                </span>
                <div style="display:flex;gap:6px">
                  <button type="button" style="padding:4px 10px;border-radius:8px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.08);color:#a78bfa;font-size:11px;cursor:pointer" @click="openEditVideo(v)">✏️</button>
                  <button type="button" style="padding:4px 10px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.06);color:#f87171;font-size:11px;cursor:pointer" @click="deleteVideo(v.id)">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ 案例弹窗 ══ -->
    <div v-if="showCaseForm" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px" @click.self="showCaseForm=false">
      <div style="background:var(--card,#1e1b2e);border:1px solid var(--border);border-radius:16px;padding:28px;width:100%;max-width:640px;max-height:90vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:20px">{{ editCase ? '✏️ 编辑案例' : '➕ 新增案例' }}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div>
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">标题</label>
            <input v-model="caseForm.title" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;box-sizing:border-box" placeholder="案例标题"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">诈骗类型</label>
            <select v-model="caseForm.category" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;cursor:pointer;box-sizing:border-box">
              <option v-for="c in fraudCategories" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">危险等级</label>
            <select v-model="caseForm.level" @change="caseForm.levelColor=levelOptions.find(l=>l.label===caseForm.level)?.color||'#f97316'" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;cursor:pointer;box-sizing:border-box">
              <option v-for="l in levelOptions" :key="l.label" :value="l.label">{{ l.label }}</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">日期（如 2024-03）</label>
            <input v-model="caseForm.date" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;box-sizing:border-box" placeholder="2024-03"/>
          </div>
        </div>
        <div style="margin-bottom:14px">
          <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">简介</label>
          <textarea v-model="caseForm.summary" rows="2" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;resize:vertical;box-sizing:border-box" placeholder="一句话简介"/>
        </div>
        <div style="margin-bottom:14px">
          <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">详细描述</label>
          <textarea v-model="caseForm.detail" rows="3" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;resize:vertical;box-sizing:border-box" placeholder="详细案例过程"/>
        </div>
        <div style="margin-bottom:14px">
          <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">🚩 骗局识别要点（最多3条）</label>
          <div style="display:flex;flex-direction:column;gap:6px">
            <input v-for="(_,i) in caseForm.tips" :key="i" v-model="caseForm.tips[i]" style="width:100%;padding:7px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;box-sizing:border-box" :placeholder="`识别要点 ${i+1}`"/>
          </div>
        </div>
        <div style="margin-bottom:20px">
          <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">✅ 正确应对方法（最多3条）</label>
          <div style="display:flex;flex-direction:column;gap:6px">
            <input v-for="(_,i) in caseForm.actions" :key="i" v-model="caseForm.actions[i]" style="width:100%;padding:7px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;box-sizing:border-box" :placeholder="`应对方法 ${i+1}`"/>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-outline" type="button" @click="showCaseForm=false">取消</button>
          <button class="btn btn-primary" type="button" @click="saveCase">{{ editCase ? '保存修改' : '新增案例' }}</button>
        </div>
      </div>
    </div>

    <!-- ══ 题目弹窗 ══ -->
    <div v-if="showQuizForm" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px" @click.self="showQuizForm=false">
      <div style="background:var(--card,#1e1b2e);border:1px solid var(--border);border-radius:16px;padding:28px;width:100%;max-width:600px;max-height:90vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:20px">{{ editQuiz ? '✏️ 编辑题目' : '➕ 新增题目' }}</div>
        <div style="margin-bottom:14px">
          <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">题目内容</label>
          <textarea v-model="quizForm.question" rows="2" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;resize:vertical;box-sizing:border-box" placeholder="请输入题目..."/>
        </div>
        <div style="margin-bottom:14px">
          <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">选项（点选正确答案）</label>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div v-for="(_,i) in quizForm.options" :key="i" style="display:flex;align-items:center;gap:8px">
              <input type="radio" :value="i" v-model="quizForm.answer" style="cursor:pointer"/>
              <span style="font-size:12px;color:var(--muted);font-family:'JetBrains Mono',monospace;width:16px">{{ ['A','B','C','D'][i] }}</span>
              <input v-model="quizForm.options[i]" style="flex:1;padding:7px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none" :placeholder="`选项 ${['A','B','C','D'][i]}`"/>
            </div>
          </div>
        </div>
        <div style="margin-bottom:14px">
          <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">解析说明</label>
          <textarea v-model="quizForm.explanation" rows="2" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;resize:vertical;box-sizing:border-box" placeholder="答案解析..."/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
          <div>
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">难度</label>
            <select v-model="quizForm.difficulty" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;cursor:pointer;box-sizing:border-box">
              <option value="easy">简单</option><option value="medium">中等</option><option value="hard">困难</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">分类</label>
            <select v-model="quizForm.category" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;cursor:pointer;box-sizing:border-box">
              <option v-for="c in quizCategories" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-outline" type="button" @click="showQuizForm=false">取消</button>
          <button class="btn btn-primary" type="button" @click="saveQuiz">{{ editQuiz ? '保存修改' : '新增题目' }}</button>
        </div>
      </div>
    </div>

    <!-- ══ 视频弹窗 ══ -->
    <div v-if="showVideoForm" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px" @click.self="showVideoForm=false">
      <div style="background:var(--card,#1e1b2e);border:1px solid var(--border);border-radius:16px;padding:28px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:20px">{{ editVideo ? '✏️ 编辑视频' : '➕ 新增视频' }}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div style="grid-column:1/-1">
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">视频标题</label>
            <input v-model="videoForm.title" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;box-sizing:border-box" placeholder="视频标题"/>
          </div>
          <div style="grid-column:1/-1">
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">简介</label>
            <input v-model="videoForm.desc" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;box-sizing:border-box" placeholder="一句话简介"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">时长</label>
            <input v-model="videoForm.duration" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;box-sizing:border-box" placeholder="8:24"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">来源机构</label>
            <input v-model="videoForm.source" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;box-sizing:border-box" placeholder="国家反诈中心"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">平台</label>
            <select v-model="videoForm.platform" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;cursor:pointer;box-sizing:border-box">
              <option v-for="p in platformOptions" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">目标群体</label>
            <select v-model="videoForm.targetIdentity" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;cursor:pointer;box-sizing:border-box">
              <option v-for="id in identityOptions" :key="id.value" :value="id.value">{{ id.label }}</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">封面emoji</label>
            <input v-model="videoForm.emoji" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;box-sizing:border-box" placeholder="🎬"/>
          </div>
          <div style="grid-column:1/-1">
            <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">视频链接</label>
            <input v-model="videoForm.url" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;box-sizing:border-box" placeholder="https://..."/>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-outline" type="button" @click="showVideoForm=false">取消</button>
          <button class="btn btn-primary" type="button" @click="saveVideo">{{ editVideo ? '保存修改' : '新增视频' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>