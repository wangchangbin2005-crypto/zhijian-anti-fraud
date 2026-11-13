import { getKbCases, kbSearchMock, addKbCase, FRAUD_TYPES } from '../../utils/kbStore';

const app = getApp();

const TYPE_COLORS = {
  AI合成语音诈骗: '#c084fc',
  投资理财诈骗: '#f472b6',
  兼职刷单诈骗: '#fb923c',
  虚假征信诈骗: '#fb7185',
  冒充公检法诈骗: '#f87171',
  情感诈骗: '#e879f9',
  虚假购物诈骗: '#22d3ee',
  虚假贷款诈骗: '#4ade80',
  虚假中奖诈骗: '#fbbf24',
  网络游戏诈骗: '#818cf8',
  未知类型: '#94a3b8',
};

Page({
  data: {
    cases: [],
    fraudTypes: FRAUD_TYPES,
    filter: '',
    searchQ: '',
    searchResults: [],
    searching: false,
    newTypeIndex: 0,
    newSummary: '',
    newKw: '',
    showTree: false,
    treeGroups: [],
    treeSel: '',
    treeList: [],
    stats: { n: 0, types: 0, manual: 0, auto: 0 },
  },

  onShow() {
    const u = app.globalData.user;
    if (!u || u.role !== 'admin') {
      wx.showToast({ title: '需要管理端账号', icon: 'none' });
      setTimeout(() => wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/home/home' }) }), 400);
      return;
    }
    this.refresh();
  },

  refresh() {
    const cases = getKbCases();
    const types = new Set(cases.map((c) => c.type)).size;
    const manual = cases.filter((c) => c.source === 'manual').length;
    const auto = cases.filter((c) => c.source !== 'manual').length;
    const map = {};
    cases.forEach((c) => {
      if (!map[c.type]) map[c.type] = [];
      map[c.type].push(c);
    });
    const treeGroups = Object.keys(map).map((k) => ({ type: k, count: map[k].length, color: this.typeColor(k) }));
    this.setData({
      cases,
      stats: { n: cases.length, types, manual, auto },
      treeGroups,
      treeList: this.data.treeSel ? map[this.data.treeSel] || [] : [],
    });
  },

  typeColor(t) {
    return TYPE_COLORS[t] || '#475569';
  },

  onFilter(e) {
    this.setData({ filter: e.detail.value });
  },

  pickType(e) {
    this.setData({ newTypeIndex: Number(e.detail.value) });
  },

  doSearch() {
    const q = this.data.searchQ.trim();
    if (!q) return;
    this.setData({ searching: true });
    const results = kbSearchMock(q, getKbCases()).map((r) => ({
      ...r,
      color: TYPE_COLORS[r.type] || '#475569',
    }));
    this.setData({ searchResults: results, searching: false });
  },

  addCase() {
    const summary = this.data.newSummary.trim();
    if (!summary) return;
    addKbCase({
      fraud_type: FRAUD_TYPES[this.data.newTypeIndex] || FRAUD_TYPES[0],
      summary,
      keywords: this.data.newKw,
    });
    this.setData({ newSummary: '', newKw: '' });
    this.refresh();
    wx.showToast({ title: '已添加', icon: 'success' });
  },

  openTree() {
    this.setData({ showTree: true, treeSel: '' });
    this.refresh();
  },

  closeTree() {
    this.setData({ showTree: false });
  },

  pickBranch(e) {
    const type = e.currentTarget.dataset.t;
    const cases = getKbCases().filter((c) => c.type === type);
    this.setData({ treeSel: type, treeList: cases });
  },

  stop() {},
});
