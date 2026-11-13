import {
  listSessions,
  getSession,
  deleteSession,
  deleteAllSessions,
  riskHistoryFromSessions,
} from '../../utils/sessionsStore';
import { RISK_LABELS } from '../../utils/constants';

const app = getApp();

Page({
  data: {
    sessions: [],
    selected: '',
    messages: [],
    labels: RISK_LABELS,
    riskLevels: ['critical', 'high', 'medium', 'low', 'safe'],
    riskCounts: { critical: 0, high: 0, medium: 0, low: 0, safe: 0 },
    riskHistory: [],
    ownerUsername: '',
  },

  onShow() {
    const u = app.globalData.user;
    if (!u) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ ownerUsername: u.username, selected: '', messages: [] });
    this.refresh();
  },

  refresh() {
    const u = app.globalData.user;
    if (!u) return;
    const username = u.username;
    const sessions = listSessions(username);
    const riskCounts = { critical: 0, high: 0, medium: 0, low: 0, safe: 0 };
    sessions.forEach((s) => {
      if (riskCounts[s.max_risk] !== undefined) riskCounts[s.max_risk]++;
    });
    this.setData({ sessions, riskCounts, riskHistory: [] });
  },

  select(e) {
    const u = app.globalData.user;
    if (!u) return;
    const id = e.currentTarget.dataset.id;
    const msgs = getSession(u.username, id);
    this.setData({ selected: id, messages: msgs });
  },

  delOne(e) {
    const u = app.globalData.user;
    if (!u) return;
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除会话',
      content: '确认删除？',
      success: (res) => {
        if (res.confirm) {
          deleteSession(u.username, id);
          if (this.data.selected === id) this.setData({ selected: '', messages: [] });
          this.refresh();
        }
      },
    });
  },

  clearAll() {
    const u = app.globalData.user;
    if (!u) return;
    wx.showModal({
      title: '清空',
      content: '确认清空本账号下全部会话？',
      success: (res) => {
        if (res.confirm) {
          deleteAllSessions(u.username);
          this.setData({ selected: '', messages: [] });
          this.refresh();
        }
      },
    });
  },

  loadRisk() {
    const u = app.globalData.user;
    if (!u) return;
    this.setData({ riskHistory: riskHistoryFromSessions(u.username).slice(0, 30) });
  },
});
