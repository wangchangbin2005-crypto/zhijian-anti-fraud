import { getKbCases } from '../../utils/kbStore';
import { getEvoStatus, appendEvoRun } from '../../utils/evoStore';

const app = getApp();

Page({
  data: {
    status: {},
    cases: [],
    filter: '',
    typeFilter: '',
    typeStats: [],
    loading: false,
  },

  onShow() {
    const u = app.globalData.user;
    if (!u || u.role !== 'admin') {
      wx.showToast({ title: '需要管理端账号', icon: 'none' });
      setTimeout(() => wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/home/home' }) }), 400);
      return;
    }
    this.reload();
  },

  reload() {
    const cases = getKbCases();
    const map = {};
    cases.forEach((c) => {
      map[c.type] = (map[c.type] || 0) + 1;
    });
    const typeStats = Object.keys(map)
      .map((k) => ({ type: k, count: map[k] }))
      .sort((a, b) => b.count - a.count);
    this.setData({
      status: getEvoStatus(),
      cases,
      typeStats,
    });
  },

  run() {
    this.setData({ loading: true });
    setTimeout(() => {
      const log = {
        run_at: new Date().toISOString(),
        raw_fetched: 12 + Math.floor(Math.random() * 8),
        added: 2 + Math.floor(Math.random() * 4),
        skipped: 3,
        duration_seconds: (1 + Math.random() * 2).toFixed(1),
      };
      const s = appendEvoRun(log);
      this.setData({ status: s, loading: false });
      this.reload();
      wx.showToast({ title: '进化完成(模拟)', icon: 'none' });
    }, 800);
  },
});
