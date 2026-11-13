/**
 * 静态规则模拟 full-pipeline 返回结构（与 front.html 后端字段对齐）
 */
function hashScore(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return (h % 37) / 100;
}

function matchAny(text, words) {
  return words.some((w) => text.includes(w));
}

export function runMockPipeline(text, opts = {}) {
  const t = (text || '').trim();
  const userRole = opts.user_role || 'adult';
  const latency = 0.35 + Math.random() * 0.9 + hashScore(t) * 0.4;

  let fraud_type = '未知类型';
  let risk_level = 'safe';
  let raw_score = 5 + hashScore(t) * 8;
  let confidence = 0.55 + hashScore(t.slice(0, 20)) * 0.25;
  let explanation = '未检测到典型诈骗话术，内容相对正常。如有疑虑可继续追问分析。';
  const evidence = [];

  const normalHints = ['12306', '国债逆回购', '社保断缴', '买火车票', '银行理财产品', '官方平台'];
  const isNormal = matchAny(t, normalHints) && !matchAny(t, ['转账', '安全账户', '垫付', '充值', '验证码给']);

  if (isNormal) {
    fraud_type = '无诈骗';
    risk_level = 'safe';
    raw_score = 8 + hashScore(t) * 5;
    confidence = 0.72 + hashScore(t) * 0.2;
    explanation = '内容为日常咨询类表述，未发现紧急转账、索要验证码等高危特征。';
  } else if (matchAny(t, ['公安局', '检察院', '警察', '公检法', '洗钱', '安全账户', '涉案', '保密', '配合调查'])) {
    fraud_type = '冒充公检法诈骗';
    risk_level = matchAny(t, ['全部', '立即', '冻结', '逮捕']) ? 'critical' : 'high';
    raw_score = 82 + hashScore(t) * 15;
    confidence = 0.88 + hashScore(t) * 0.1;
    explanation = '检测到冒充执法机关、要求转账至“安全账户”等典型冒充公检法话术。公检法不会电话要求转账。';
    evidence.push('安全账户', '涉案话术', '保密施压');
  } else if (matchAny(t, ['刷单', '垫付', '返佣', '日赚', '任务未完成'])) {
    fraud_type = '兼职刷单诈骗';
    risk_level = matchAny(t, ['日赚500', '先垫付']) ? 'high' : 'medium';
    raw_score = 68 + hashScore(t) * 20;
    confidence = 0.82;
    explanation = '兼职刷单需垫付本金属于典型诈骗套路，正规兼职无需垫付。';
    evidence.push('垫付', '高佣诱导');
  } else if (matchAny(t, ['投资', '稳赚', '内部消息', '量化', '虚拟货币', '月收益', '入金'])) {
    fraud_type = '投资理财诈骗';
    risk_level = 'high';
    raw_score = 75 + hashScore(t) * 18;
    confidence = 0.85;
    explanation = '存在“稳赚不赔”“内部渠道”等高风险诱导投资话术，极可能是虚假投资平台。';
    evidence.push('高收益承诺', '引流至非正规渠道');
  } else if (matchAny(t, ['贷款', '免抵押', '保证金', '解冻费', '手续费', '秒批', '不查征信'])) {
    fraud_type = '虚假贷款诈骗';
    risk_level = 'high';
    raw_score = 70 + hashScore(t) * 15;
    confidence = 0.8;
    explanation = '正规贷款不会在放款前收取保证金、解冻费等费用。';
    evidence.push('贷前收费');
  } else if (matchAny(t, ['中奖', '公证费', '个人所得税', '领奖', '税费先缴'])) {
    fraud_type = '虚假中奖诈骗';
    risk_level = 'medium';
    raw_score = 58 + hashScore(t) * 15;
    confidence = 0.78;
    explanation = '真中奖税费由主办方依法代扣，不会要求获奖者先转账缴税。';
    evidence.push('先缴费后领奖');
  } else if (matchAny(t, ['注销校园贷', '征信', '清零', '配合银行工作人员转账'])) {
    fraud_type = '虚假征信诈骗';
    risk_level = 'high';
    raw_score = 72;
    confidence = 0.81;
    explanation = '个人征信由人民银行征信中心管理，不存在“转账注销不良记录”的官方流程。';
    evidence.push('征信恐吓');
  } else if (matchAny(t, ['游戏', '账号出售', '王者', '充值返利', '私聊发链接'])) {
    fraud_type = '网络游戏诈骗';
    risk_level = 'medium';
    raw_score = 52 + hashScore(t) * 12;
    confidence = 0.74;
    explanation = '非官方渠道买卖游戏账号、超高充值返利多为诈骗。';
    evidence.push('私下交易');
  } else if (matchAny(t, ['宝贝', '亲爱的', '周转', '投资项目', '东南亚'])) {
    fraud_type = '情感诈骗';
    risk_level = 'high';
    raw_score = 68;
    confidence = 0.77;
    explanation = '网恋对象引导投资或紧急借钱，高度疑似“杀猪盘”套路。';
    evidence.push('情感+资金');
  } else if (matchAny(t, ['客服', '三倍赔偿', '退款', '验证码', '扫码'])) {
    fraud_type = '虚假购物诈骗';
    risk_level = 'high';
    raw_score = 65;
    confidence = 0.79;
    explanation = '假冒客服以赔偿为由索要银行卡、验证码的，均为诈骗。';
    evidence.push('索要验证码');
  } else if (matchAny(t, ['儿子', '孙子', '住院', '手术', '别打电话', '新号码', '保释金']) || matchAny(t, ['妈妈我是', '爸这是我'])) {
    fraud_type = 'AI合成语音诈骗';
    risk_level = 'critical';
    raw_score = 88;
    confidence = 0.86;
    explanation = '冒充亲属紧急要钱的语音/消息需高度警惕，可能为 AI 克隆语音。请先挂断并回拨本人电话核实。';
    evidence.push('紧急借钱', '阻断回拨');
  } else if (t.length > 8) {
    fraud_type = '未知类型';
    risk_level = 'low';
    raw_score = 22 + hashScore(t) * 15;
    confidence = 0.5 + hashScore(t) * 0.15;
    explanation = '文本包含一定营销或诱导语气，暂未归入具体类型，建议不要转账或透露验证码。';
  }

  if (userRole === 'elder' && risk_level !== 'safe') raw_score = Math.min(99, raw_score + 8);
  if (userRole === 'student' && matchAny(t, ['兼职', '刷单', '贷款'])) raw_score = Math.min(99, raw_score + 5);

  const shouldBlock = risk_level === 'critical';
  const recordId = `R${Date.now().toString(36).toUpperCase()}`;
  const needNotify = risk_level === 'high' || risk_level === 'critical';

  return {
    latency_s: Number(latency.toFixed(2)),
    decision: {
      fraud_type,
      risk_level,
      raw_score: Math.round(raw_score * 10) / 10,
      confidence: Math.min(0.97, confidence),
      explanation,
      evidence,
    },
    algorithms: {
      tfidf: {
        fraud_type: fraud_type.slice(0, 6),
        score: Math.round(raw_score * 0.85),
        matched: evidence.slice(0, 3),
      },
      ner: {
        has_money: matchAny(t, ['元', '万', '转账', '充值', '垫付']),
        urgency: matchAny(t, ['立即', '马上', '紧急', '限时', '今天']),
        risk_count: evidence.length + (risk_level === 'safe' ? 0 : 2),
      },
      sentiment: {
        manipulation_score: risk_level === 'critical' ? 78 : risk_level === 'high' ? 62 : risk_level === 'medium' ? 48 : 22,
        emotion_types: risk_level === 'safe' ? ['中性'] : ['紧迫', '施压'],
      },
      iforest: {
        is_anomaly: risk_level !== 'safe' && risk_level !== 'low',
        anomaly_score: Math.min(0.98, raw_score / 100),
      },
    },
    intervention: {
      should_block_ui: shouldBlock,
      record_id: recordId,
      popup: shouldBlock
        ? { title: '极高风险', body: '检测到极高风险诈骗特征，请立即停止任何转账操作。' }
        : null,
      voice_script:
        risk_level === 'critical' || risk_level === 'high'
          ? '警告：该内容疑似诈骗，请勿转账，请拨打九六幺幺零。'
          : '',
      recommendations: needNotify ? ['联系家人核实', '拨打 96110', '保存聊天证据'] : ['保持警惕'],
    },
  };
}
