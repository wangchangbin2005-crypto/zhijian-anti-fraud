var { apiDetect } = require('../../utils/api');
var { bumpStats, pushHistory, getStats } = require('../../utils/statsHelper');
var { appendSessionMessage } = require('../../utils/sessionsStore');
var { RISK_LABELS, RISK_COLORS } = require('../../utils/constants');

const app = getApp();

const IDENTITY_HINT = {
  elder: '老年人',
  student: '学生',
  financial: '财会相关',
  adult: '普通成人',
  other: '其他',
};

function nextMid() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function buildFollowupKey(payload) {
  const rid = payload?.intervention?.record_id;
  if (rid) return `fu_${rid}`;
  return `fu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

Page({
  data: {
    chatMessages: [],
    loading: false,
    inputMode: 'text',
    chatInput: '',
    textReady: false,
    imageDesc: '',
    imagePath: '',
    imageIsVideo: false,
    stats: { total: 0, flagged: 0, safe: 0, guardian: 0 },
    analyzingHint: '正在分析内容…',
    sessionId: '',
    scrollInto: '',
    ariaMood: 'idle',
    showBlock: false,
    blockMsg: '',
    blockTitle: '极高风险警告',
    showNotify: false,
    notifyRecord: {},
    identityLabel: '给你',
    profileIdentityText: '',
    ownerUsername: '',
    lastRiskLevel: '',
    lastFraudType: '',
    currentFollowupKey: '',
  },

  onShow() {
    const u = app.globalData.user;
    if (!u) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const historyReport = wx.getStorageSync('detect_history_report');
    if (historyReport && historyReport.report) {
      wx.removeStorageSync('detect_history_report');
      const rep = historyReport.report;
      const rl = rep?.decision?.risk_level || 'safe';
      const userMsg = {
        mid: nextMid(),
        role: 'user',
        text: historyReport.text || '（历史检测内容）',
        time: historyReport.timestamp || new Date().toLocaleTimeString(),
      };
      const sysMsg = {
        mid: nextMid(),
        role: 'system',
        result: rep,
        riskColor: RISK_COLORS[rl] || '#6b7280',
        riskLabel: (RISK_LABELS[rl] || rl) + '（历史）',
        time: historyReport.timestamp || new Date().toLocaleTimeString(),
        followupKey: historyReport.followupKey || '',
      };
      this.setData({
        chatMessages: [userMsg, sysMsg],
        lastRiskLevel: rl,
        lastFraudType: rep?.decision?.fraud_type || '',
        currentFollowupKey: historyReport.followupKey || '',
      });
      wx.nextTick(() => this._scrollBottom());
    }

    const pre = wx.getStorageSync('detect_prefill');
    if (pre) {
      wx.removeStorageSync('detect_prefill');
      const t = String(pre);
      this.setData({ chatInput: t, inputMode: 'text', textReady: !!t.trim() });
    }
    const map = { elder: '老年人', student: '学生', financial: '财务人员', adult: '你', other: '你' };
    this.setData({
      ownerUsername: u.username,
      profileIdentityText: IDENTITY_HINT[u.identity] || '普通成人',
      stats: getStats(u.username),
      identityLabel: map[u.identity] || '你',
    });
    if (!this.data.sessionId) {
      this.setData({ sessionId: `chat_${Date.now().toString(36)}` });
    }
  },

  onMode(e) {
    this.setData({ inputMode: e.currentTarget.dataset.m });
  },

  onChatInput(e) {
    const v = e.detail.value;
    this.setData({ chatInput: v, textReady: !!v.trim() });
  },

  onImageDesc(e) {
    this.setData({ imageDesc: e.detail.value });
  },

  quick(e) {
    const t = e.currentTarget.dataset.t || '';
    this.setData({ chatInput: t, textReady: !!String(t).trim() });
  },

  pickImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image', 'video'],
      maxDuration: 60,
      sourceType: ['album', 'camera'],
      success: (res) => {
        const f = res.tempFiles && res.tempFiles[0];
        const p = f && f.tempFilePath;
        if (!p) return;
        const isVideo = f.fileType ? f.fileType === 'video' : Number(f.duration) > 0;
        this.setData({ imagePath: p, imageIsVideo: !!isVideo });
      },
    });
  },

  mockAudio() {
    wx.showToast({ title: '已模拟转写为文本', icon: 'none' });
    const t = '我是公安局，你的账号涉及洗钱案，把钱转到安全账户配合调查';
    this.setData({ chatInput: t, inputMode: 'text', textReady: true });
  },

  clearChat() {
    this.setData({
      chatMessages: [],
      sessionId: `chat_${Date.now().toString(36)}`,
      chatInput: '',
      textReady: false,
      imagePath: '',
      imageDesc: '',
      imageIsVideo: false,
      ariaMood: 'idle',
    });
  },

  async chatSend() {
    if (this.data.loading) return;
    const user = app.globalData.user;
    if (!user?.username) return;

    const mode = this.data.inputMode;
    let text = (this.data.chatInput || '').trim();
    if (mode === 'image') {
      if (!this.data.imagePath) {
        wx.showToast({ title: '请先选择图片', icon: 'none' });
        return;
      }
      text = (this.data.imageDesc || '').trim()
        || (this.data.imageIsVideo ? '（视频内容）' : '（图片内容）');
    }
    if (!text) return;

    const username = user.username;
    const pipelineRole = user.identity || 'adult';
    const time = new Date().toLocaleTimeString();

    const userMsg = {
      mid: nextMid(),
      role: 'user',
      text,
      imageUrl: mode === 'image' ? this.data.imagePath : '',
      mediaIsVideo: mode === 'image' && this.data.imageIsVideo,
      time,
    };
    const list = this.data.chatMessages.concat(userMsg);
    this.setData({
      chatMessages: list,
      loading: true,
      chatInput: '',
      textReady: false,
      imagePath: '',
      imageDesc: '',
      imageIsVideo: false,
      analyzingHint: '正在连接AI分析…',
    });
    wx.nextTick(() => this._scrollBottom());

    // 最低加载时间 2.2秒
    const minDelay = new Promise(r => setTimeout(r, 2200));

    try {
      const [data] = await Promise.all([
        apiDetect(text, pipelineRole),
        minDelay,
      ]);

      const rl = data.decision?.risk_level || 'safe';
      const followupKey = buildFollowupKey(data);
      bumpStats(username, rl);
      pushHistory(username, {
        text: text.slice(0, 80),
        risk_level: rl,
        fraud_type: data.decision?.fraud_type,
        confidence: data.decision?.confidence,
        timestamp: time,
        report: data,
        followup_key: followupKey,
      });

      const sysMsg = {
        mid: nextMid(),
        role: 'system',
        result: data,
        riskColor: RISK_COLORS[rl] || '#6b7280',
        riskLabel: RISK_LABELS[rl] || rl,
        time: new Date().toLocaleTimeString(),
        followupKey: followupKey,
      };
      this.setData({
        chatMessages: list.concat(sysMsg),
        loading: false,
        stats: getStats(username),
        lastRiskLevel: rl,
        lastFraudType: data.decision?.fraud_type || '',
        ariaMood: rl === 'critical' || rl === 'high' ? 'alert' : rl === 'safe' || rl === 'low' ? 'happy' : 'idle',
      });

      appendSessionMessage(username, this.data.sessionId, {
        role: 'user',
        content: text,
        risk_level: 'safe',
        timestamp: new Date().toISOString(),
      });
      appendSessionMessage(username, this.data.sessionId, {
        role: 'system',
        content: data.decision?.explanation,
        risk_level: rl,
        fraud_type: data.decision?.fraud_type,
        timestamp: new Date().toISOString(),
      });

      // 弹窗逻辑
      if (rl === 'critical') {
        this.setData({
          showBlock: true,
          blockTitle: '🚨 极高风险警告',
          blockMsg: data.intervention?.popup?.body || '检测到极高风险，请立即停止操作！',
        });
      } else if (rl === 'high') {
        this.setData({
          showBlock: true,
          blockTitle: '🚨 高风险警告',
          blockMsg: '检测到高风险内容！疑似诈骗行为，请勿轻信对方，及时核实身份。',
        });
      } else if (rl === 'medium') {
        this.setData({
          showBlock: true,
          blockTitle: '⚠️ 中风险提示',
          blockMsg: '检测到中等风险，请提高警惕，核实对方身份后再操作。',
        });
      }

      if ((rl === 'high' || rl === 'critical') && data.intervention?.record_id) {
        this.setData({
          showNotify: true,
          notifyRecord: {
            risk_level: rl,
            fraud_type: data.decision?.fraud_type,
            time: new Date().toLocaleString(),
          },
        });
      }

    } catch (err) {
      console.error('[detect] API失败:', err);
      // 降级到本地mock
      const { runMockPipeline } = require('../../utils/mockPipeline');
      const data = runMockPipeline(text, { user_role: pipelineRole });
      const rl = data.decision.risk_level;
      const followupKey = buildFollowupKey(data);
      bumpStats(username, rl);
      pushHistory(username, {
        text: text.slice(0, 80),
        risk_level: rl,
        fraud_type: data.decision.fraud_type,
        confidence: data.decision.confidence,
        timestamp: time,
        report: data,
        followup_key: followupKey,
      });
      const sysMsg = {
        mid: nextMid(),
        role: 'system',
        result: data,
        riskColor: RISK_COLORS[rl] || '#6b7280',
        riskLabel: `${RISK_LABELS[rl] || rl}（离线）`,
        time: new Date().toLocaleTimeString(),
        followupKey: followupKey,
      };
      this.setData({
        chatMessages: list.concat(sysMsg),
        loading: false,
        stats: getStats(username),
        lastRiskLevel: rl,
        lastFraudType: data.decision.fraud_type || '',
        ariaMood: 'idle',
      });
      wx.showToast({ title: '后端连接失败，已使用离线模式', icon: 'none', duration: 2500 });
    }

    wx.nextTick(() => this._scrollBottom());
    if (this.data.ariaMood === 'happy') {
      setTimeout(() => this.setData({ ariaMood: 'idle' }), 4000);
    }
  },

  _scrollBottom() {
    const n = this.data.chatMessages.length;
    this.setData({ scrollInto: n ? `m${n - 1}` : '' });
  },

  closeBlock() { this.setData({ showBlock: false }); },
  closeNotify() { this.setData({ showNotify: false }); },

  goFollowup(e) {
    const idx = e.currentTarget.dataset.idx;
    const msg = this.data.chatMessages[idx];
    if (!msg || msg.role !== 'system') return;
    const d = msg.result?.decision;
    app.globalData.followupContext = {
      riskLabel: msg.riskLabel,
      fraudType: d?.fraud_type || '',
      explanation: d?.explanation || '',
      evidence: d?.evidence || [],
    };
    app.globalData.followupThreadKey = msg.followupKey || this.data.currentFollowupKey || buildFollowupKey(msg.result);
    wx.navigateTo({ url: '/pages/followup/followup' });
  },

  noop() {},

  viewReport(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({ title: '模拟报告', content: `记录编号 ${id}\n（演示数据，非真实警情文书）`, showCancel: false });
  },
});