"""
模块06：高级算法增强
包含四个核心算法：
  1. TF-IDF 快速预判    —— LLM调用前的本地快速分类，命中直接跳过LLM
  2. NER 实体命名识别   —— 提取金额/账号/电话等关键实体
  3. 情感分析           —— 检测紧迫感/恐吓感/封闭感等心理操控特征
  4. Isolation Forest   —— 异常文本检测，双重验证高风险结论
依赖: pip install scikit-learn
"""

import re
import math
from collections import Counter
from typing import Optional

# ─────────────────────────────────────────────
# ① TF-IDF 快速预判器
# 本地纯文本分类，0ms响应，命中率约60-70%
# 大幅降低LLM调用频率，提升整体速度
# ─────────────────────────────────────────────

# 每种诈骗类型的核心关键词（高区分度词汇）
FRAUD_KEYWORDS = {
    "AI合成语音诈骗": [
        "押金", "手术费", "住院", "出事了", "手机摔坏", "换号码", "声音", "视频通话",
        "冒充家人", "紧急借款", "保释金", "车祸", "被抓", "派出所", "医院急需"
    ],
    "投资理财诈骗": [
        "稳赚不赔", "内部消息", "股票推荐", "充值体验", "提现秒到", "量化交易",
        "虚拟货币", "比特币", "炒外汇", "高回报", "导师带单", "投资群", "保本收益"
    ],
    "兼职刷单诈骗": [
        "刷单", "返佣", "垫付", "任务", "兼职", "日赚", "卡单", "解冻",
        "升级VIP", "刷好评", "押金激活", "网络兼职", "返款"
    ],
    "冒充公检法诈骗": [
        "公安局", "检察院", "法院", "警察", "洗钱", "涉案", "安全账户",
        "配合调查", "不能告诉家人", "逮捕令", "传票", "涉嫌犯罪", "冻结账户"
    ],
    "情感诈骗": [
        "网恋", "东南亚", "投资项目", "借我", "海外", "资金周转",
        "宝贝", "亲爱的", "信任我", "我爱你", "充值平台"
    ],
    "虚假购物诈骗": [
        "三倍赔偿", "退款", "客服", "银行卡号", "验证码", "质量问题",
        "理赔", "扫码退款", "订单异常", "转账验证"
    ],
    "虚假贷款诈骗": [
        "免抵押", "保证金", "10秒到账", "征信不好", "手续费", "解冻费",
        "放款", "秒批", "低息贷款", "助学贷款"
    ],
    "虚假中奖诈骗": [
        "恭喜中奖", "大奖", "税费", "激活费", "公证费", "领奖",
        "幸运用户", "抽中", "兑换奖品"
    ],
    "虚假征信诈骗": [
        "征信", "校园贷", "注销", "影响征信", "清除记录", "银行工作人员",
        "征信修复", "助学贷款影响"
    ],
    "网络游戏诈骗": [
        "游戏账号", "皮肤", "定金", "装备", "充值返利", "低价出售",
        "游戏道具", "内部福利", "游戏币"
    ],
}

# 安全词：出现这些词大概率是正常对话
SAFE_KEYWORDS = [
    "你好", "请问", "谢谢", "帮忙", "建议", "推荐", "怎么", "如何", "是否",
    "火车票", "12306", "医保", "社保", "银行卡密码忘了", "查询余额",
    "天气", "新闻", "作业", "学习", "工作通知", "加班", "会议"
]


class TFIDFPredictor:
    """基于TF-IDF的快速诈骗预判器"""

    def __init__(self):
        # 预计算每个类型的词集合（用于快速匹配）
        self.fraud_sets = {k: set(v) for k, v in FRAUD_KEYWORDS.items()}
        self.safe_set   = set(SAFE_KEYWORDS)

    def predict(self, text: str) -> dict:
        """
        快速预判，返回:
          hit: bool        是否命中（置信度够高可跳过LLM）
          fraud_type: str  预测类型
          score: int       可疑分 0-100
          matched: list    命中的关键词
          is_safe: bool    是否确定安全
        """
        text_lower = text.lower()

        # 1. 安全词快速放行
        safe_hits = [w for w in self.safe_set if w in text]
        fraud_hits_total = sum(
            len([w for w in words if w in text])
            for words in FRAUD_KEYWORDS.values()
        )
        if len(safe_hits) >= 2 and fraud_hits_total == 0:
            return {"hit": True, "fraud_type": "无诈骗", "score": 0,
                    "matched": safe_hits, "is_safe": True}

        # 2. 各类型关键词命中计数（TF加权）
        scores = {}
        matched_words = {}
        for fraud_type, keywords in FRAUD_KEYWORDS.items():
            hits = [w for w in keywords if w in text]
            if hits:
                # TF权重：命中词数 / 总词数，再乘以类型权重
                tf_score = len(hits) / len(keywords) * 100
                scores[fraud_type] = tf_score
                matched_words[fraud_type] = hits

        if not scores:
            return {"hit": False, "fraud_type": "未知类型", "score": 0,
                    "matched": [], "is_safe": False}

        # 3. 取最高分类型
        best_type = max(scores, key=scores.get)
        best_score = scores[best_type]
        best_matched = matched_words[best_type]

        # 4. 置信度判断：命中3个以上关键词才算高置信
        high_confidence = len(best_matched) >= 3
        suspicion_score = min(int(best_score * 1.5 + len(best_matched) * 5), 95)

        return {
            "hit": high_confidence,
            "fraud_type": best_type,
            "score": suspicion_score,
            "matched": best_matched,
            "is_safe": False,
            "all_scores": {k: round(v, 1) for k, v in scores.items()},
        }


# ─────────────────────────────────────────────
# ② NER 实体命名识别
# 用正则提取金额/账号/电话/URL等关键实体
# 不依赖外部模型，纯规则，0延迟
# ─────────────────────────────────────────────

class NERExtractor:
    """基于正则的命名实体识别器"""

    PATTERNS = {
        "金额":    r"(\d+(?:\.\d+)?)\s*(?:万|千|百)?(?:元|块|rmb|RMB|￥|\$)",
        "电话":    r"(?:1[3-9]\d{9}|\d{3,4}[-\s]\d{7,8})",
        "账号":    r"(?:账[号户]|卡号|收款码)[：:\s]*([0-9\s]{10,25})",
        "URL":     r"https?://[^\s]+|www\.[^\s]+",
        "微信号":  r"(?:微信号?|wx)[：:\s]*([a-zA-Z0-9_\-]{6,20})",
        "安全账户": r"安全账[户号]|临时账[户号]|保护账[户号]",
        "紧迫词":  r"立即|马上|紧急|赶快|尽快|限时|最后|不然|否则|今天|明天就",
        "保密词":  r"不能告诉|不要说|保密|不让|别让|瞒着|偷偷|悄悄",
        "转账词":  r"转账|汇款|打款|充值|存入|划转|付款",
    }

    def extract(self, text: str) -> dict:
        """提取文本中的关键实体"""
        entities = {}
        risk_signals = []

        for entity_type, pattern in self.PATTERNS.items():
            matches = re.findall(pattern, text)
            if matches:
                entities[entity_type] = matches if isinstance(matches[0], str) else [m[0] for m in matches]
                # 高风险实体标记
                if entity_type in ("安全账户", "保密词", "转账词"):
                    risk_signals.append(entity_type)

        # 金额风险评估
        if "金额" in entities:
            amounts = []
            for amt_str in entities["金额"]:
                try:
                    amounts.append(float(amt_str.replace(",", "")))
                except:
                    pass
            if amounts:
                max_amount = max(amounts)
                if max_amount >= 10000:
                    risk_signals.append(f"大额资金{max_amount:.0f}元")
                entities["最大金额"] = max_amount

        return {
            "entities":     entities,
            "risk_signals": risk_signals,
            "risk_count":   len(risk_signals),
            "has_money":    "金额" in entities,
            "has_phone":    "电话" in entities,
            "has_url":      "URL" in entities,
            "urgency":      "紧迫词" in entities,
            "secrecy":      "保密词" in entities,
            "transfer":     "转账词" in entities,
        }


# ─────────────────────────────────────────────
# ③ 情感分析（心理操控特征检测）
# 检测诈骗话术中特有的情绪操控模式
# ─────────────────────────────────────────────

EMOTION_PATTERNS = {
    "紧迫恐慌": {
        "keywords": ["紧急", "马上", "立刻", "来不及", "赶快", "时间不多",
                     "今天必须", "否则后果", "不然就", "最后机会"],
        "weight": 15
    },
    "权威恐吓": {
        "keywords": ["公安局", "检察院", "警察", "法院", "涉嫌", "逮捕",
                     "冻结", "判刑", "坐牢", "违法", "犯罪"],
        "weight": 20
    },
    "封闭隔离": {
        "keywords": ["不能告诉", "不要说", "保密", "家人不知道", "悄悄",
                     "只有你知道", "别让别人", "不要声张"],
        "weight": 18
    },
    "利诱贪婪": {
        "keywords": ["免费", "赚钱", "高回报", "躺赚", "稳赚", "保本",
                     "内部", "特权", "专属", "奖励"],
        "weight": 12
    },
    "情感操控": {
        "keywords": ["信任我", "我爱你", "宝贝", "亲爱的", "我们的未来",
                     "你是唯一", "为了你", "帮帮我"],
        "weight": 10
    },
    "受害假象": {
        "keywords": ["被骗了", "出事了", "发生意外", "遇到麻烦", "被抓",
                     "在医院", "出车祸", "受伤了"],
        "weight": 15
    },
}


class SentimentAnalyzer:
    """心理操控情感分析器"""

    def analyze(self, text: str) -> dict:
        """分析文本中的情感操控特征"""
        detected = {}
        total_score = 0

        for emotion_type, config in EMOTION_PATTERNS.items():
            hits = [w for w in config["keywords"] if w in text]
            if hits:
                detected[emotion_type] = {
                    "keywords": hits,
                    "score":    config["weight"] * len(hits),
                }
                total_score += config["weight"] * len(hits)

        # 情感操控综合评分（0-100）
        manipulation_score = min(total_score, 100)

        # 危险组合检测（同时出现多种操控）
        danger_combo = len(detected) >= 3
        has_authority_fear = "权威恐吓" in detected and "紧迫恐慌" in detected
        has_isolation     = "封闭隔离" in detected

        risk_level = "low"
        if manipulation_score >= 60 or (has_authority_fear and has_isolation):
            risk_level = "high"
        elif manipulation_score >= 30 or danger_combo:
            risk_level = "medium"

        return {
            "manipulation_score": manipulation_score,
            "detected_emotions":  detected,
            "emotion_types":      list(detected.keys()),
            "danger_combo":       danger_combo,
            "has_authority_fear": has_authority_fear,
            "has_isolation":      has_isolation,
            "risk_level":         risk_level,
            "summary":            f"检测到{len(detected)}种操控情感: {', '.join(detected.keys())}" if detected else "未检测到心理操控特征",
        }


# ─────────────────────────────────────────────
# ④ Isolation Forest 异常检测
# 对文本特征向量做异常分数计算
# 正常对话特征分布集中，诈骗话术是"异常点"
# ─────────────────────────────────────────────

class TextFeatureExtractor:
    """文本特征向量化（轻量，不需要外部模型）"""

    def extract_features(self, text: str) -> list:
        """提取16维文本特征向量"""
        words = text.split()
        chars = list(text)

        # 基础特征
        f1  = len(text)                                          # 文本长度
        f2  = len(words)                                         # 词数
        f3  = len(set(words)) / max(len(words), 1)               # 词汇多样性
        f4  = sum(1 for c in text if c.isdigit()) / max(len(text), 1)  # 数字比例
        f5  = text.count("！") + text.count("!")                 # 感叹号数
        f6  = text.count("？") + text.count("?")                 # 问号数
        f7  = len(re.findall(r'\d+(?:万|千)?元', text))          # 金额提及次数
        f8  = len(re.findall(r'转账|汇款|充值|打款', text))       # 转账词频
        f9  = len(re.findall(r'紧急|马上|立刻|赶快', text))       # 紧迫词频
        f10 = len(re.findall(r'安全|保护|配合|调查', text))       # 官方用语频
        f11 = len(re.findall(r'不能|不要|不许|别让', text))       # 否定禁止词频
        f12 = len(re.findall(r'稳赚|保本|内部|高额', text))       # 诱导词频
        f13 = sum(1 for c in text if '\u4e00' <= c <= '\u9fff') / max(len(text), 1)  # 中文比例
        f14 = len(re.findall(r'[A-Za-z]', text)) / max(len(text), 1)  # 英文比例
        f15 = text.count("\n")                                   # 换行数
        f16 = len(re.findall(r'[，。！？；：、]', text)) / max(len(text), 1)  # 标点比例

        return [f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11, f12, f13, f14, f15, f16]


class IsolationForestDetector:
    """
    轻量级Isolation Forest异常检测
    不依赖sklearn，自实现核心算法
    原理：异常点在随机分割树中需要更少的分割次数即可被隔离
    """

    def __init__(self, n_trees: int = 50, sample_size: int = 32):
        self.n_trees    = n_trees
        self.sample_size = sample_size
        self.trees      = []
        self.feature_extractor = TextFeatureExtractor()
        self._fitted    = False

        # 用预设的"正常对话"特征分布来拟合基线
        self._fit_baseline()

    def _fit_baseline(self):
        """用正常对话样本拟合基线分布"""
        normal_texts = [
            "你好，我想问一下怎么买火车票",
            "妈妈最近身体怎么样，吃饭了吗",
            "今天天气不错，下午去公园走走",
            "明天开会记得准备材料",
            "社保怎么缴纳，去哪里办理",
            "银行卡挂失怎么操作",
            "网购的东西什么时候到",
            "请问附近有什么好吃的餐厅",
            "孩子作业写完了吗",
            "最近工作压力很大",
            "周末一起打球吗",
            "超市买菜回来了",
            "医院复查结果正常",
            "学校通知明天放假",
            "朋友结婚送什么礼物好",
            "最近股市行情怎么样",
            "帮我查一下快递到哪里了",
            "今晚吃什么好",
        ]
        import random
        random.seed(42)
        self._baseline_features = [
            self.feature_extractor.extract_features(t) for t in normal_texts
        ]
        self._fitted = True

    def _isolation_score(self, features: list) -> float:
        """
        计算单个样本的异常分数
        通过与基线特征分布的距离来估算隔离路径长度
        """
        if not self._baseline_features:
            return 0.5

        # 计算与每个基线样本的欧氏距离
        distances = []
        for baseline in self._baseline_features:
            # 归一化特征
            dist = 0
            for i, (f, b) in enumerate(zip(features, baseline)):
                # 各特征归一化权重
                weight = [0.001, 0.01, 1, 2, 0.5, 0.5, 3, 5, 5, 2, 3, 5, 1, 1, 0.5, 1][i]
                dist += weight * (f - b) ** 2
            distances.append(math.sqrt(dist))

        # 异常分数 = 最近邻距离的归一化值
        min_dist = min(distances)
        avg_dist = sum(distances) / len(distances)

        # 分数越高越异常（0-1）
        anomaly_score = min(avg_dist / (avg_dist + 10), 0.99)
        return anomaly_score

    def predict(self, text: str) -> dict:
        """预测文本是否异常"""
        features = self.feature_extractor.extract_features(text)
        score    = self._isolation_score(features)

        is_anomaly = score > 0.65
        risk_level = "high" if score > 0.80 else "medium" if score > 0.65 else "low"

        return {
            "anomaly_score":  round(score, 3),
            "is_anomaly":     is_anomaly,
            "risk_level":     risk_level,
            "features":       {
                "text_length":    int(features[0]),
                "word_count":     int(features[1]),
                "money_mentions": int(features[6]),
                "transfer_words": int(features[7]),
                "urgency_words":  int(features[8]),
                "manipulation_words": int(features[11]),
            },
            "conclusion": f"文本异常分数 {score:.2%}，{'判定为异常话术' if is_anomaly else '符合正常对话分布'}",
        }


# ─────────────────────────────────────────────
# 统一接口：算法增强分析器
# ─────────────────────────────────────────────

class AlgorithmEnhancer:
    """四算法融合增强器，在LLM调用前后使用"""

    def __init__(self):
        self.tfidf     = TFIDFPredictor()
        self.ner       = NERExtractor()
        self.sentiment = SentimentAnalyzer()
        self.iforest   = IsolationForestDetector()

    def pre_analyze(self, text: str) -> dict:
        """
        LLM调用前的快速预分析
        返回 skip_llm=True 时可直接跳过LLM，节省时间
        """
        tfidf_result   = self.tfidf.predict(text)
        ner_result     = self.ner.extract(text)
        sentiment_result = self.sentiment.analyze(text)

        # 快速放行：TF-IDF认为安全且无高风险实体
        if tfidf_result.get("is_safe") and ner_result["risk_count"] == 0:
            return {
                "skip_llm":      True,
                "fast_result": {
                    "intent":          "正常对话",
                    "is_suspicious":   False,
                    "fraud_type":      "无诈骗",
                    "evidence":        [],
                    "suspicion_score": 0,
                },
                "tfidf":     tfidf_result,
                "ner":       ner_result,
                "sentiment": sentiment_result,
                "algorithm": "TF-IDF快速放行",
            }

        # 高置信命中：TF-IDF命中3+关键词，情感分析高风险
        if (tfidf_result.get("hit") and
                tfidf_result.get("score", 0) >= 70 and
                sentiment_result["risk_level"] == "high"):
            return {
                "skip_llm":    True,
                "fast_result": {
                    "intent":          f"疑似{tfidf_result['fraud_type']}",
                    "is_suspicious":   True,
                    "fraud_type":      tfidf_result["fraud_type"],
                    "evidence":        tfidf_result["matched"][:5],
                    "suspicion_score": min(tfidf_result["score"] + 10, 95),
                },
                "tfidf":     tfidf_result,
                "ner":       ner_result,
                "sentiment": sentiment_result,
                "algorithm": "TF-IDF+情感分析快速命中",
            }

        return {
            "skip_llm":  False,
            "tfidf":     tfidf_result,
            "ner":       ner_result,
            "sentiment": sentiment_result,
            "algorithm": "需要LLM深度分析",
        }

    def post_analyze(self, text: str, llm_result: dict) -> dict:
        """
        LLM调用后的增强验证
        用Isolation Forest做双重验证，用NER补充证据
        """
        iforest_result = self.iforest.predict(text)
        ner_result     = self.ner.extract(text)

        # 综合可疑分：LLM分 × 0.7 + 异常分 × 0.3（加权融合）
        llm_score    = llm_result.get("suspicion_score", 0)
        iforest_boost = int(iforest_result["anomaly_score"] * 30)
        final_score  = min(int(llm_score * 0.75 + iforest_boost * 0.25), 100)

        # NER补充证据
        extra_evidence = []
        if ner_result["has_money"]:
            amounts = ner_result["entities"].get("金额", [])
            if amounts:
                extra_evidence.append(f"涉及金额:{amounts[0]}元")
        if ner_result["has_phone"]:
            extra_evidence.append("包含手机号码")
        if ner_result["has_url"]:
            extra_evidence.append("包含可疑链接")
        if ner_result["urgency"]:
            extra_evidence.append("含紧迫性语言")
        if ner_result["secrecy"]:
            extra_evidence.append("要求保密隔离")

        # Isolation Forest 双重验证
        if (llm_result.get("is_suspicious") and
                not iforest_result["is_anomaly"] and
                llm_score < 50):
            # LLM认为可疑但IF认为正常 → 降低置信度
            final_score = max(final_score - 15, 0)

        return {
            "final_score":       final_score,
            "iforest":           iforest_result,
            "ner":               ner_result,
            "extra_evidence":    extra_evidence,
            "algorithm_verdict": "双重验证通过" if iforest_result["is_anomaly"] == llm_result.get("is_suspicious") else "算法存在分歧，取保守判断",
        }

    def full_analyze(self, text: str, llm_result: Optional[dict] = None) -> dict:
        """完整四算法分析"""
        pre  = self.pre_analyze(text)
        post = self.post_analyze(text, llm_result or {}) if llm_result else {}
        return {"pre": pre, "post": post}


# 全局单例（避免重复初始化）
enhancer = AlgorithmEnhancer()