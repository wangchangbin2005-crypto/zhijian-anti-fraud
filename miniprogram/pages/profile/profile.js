var { getStats } = require('../../utils/statsHelper');

const app = getApp();

const IDMAP = {
  elder: '老年人',
  student: '学生',
  adult: '普通成人',
  financial: '财务/金融人员',
  other: '其他',
};

Page({
  data: {
    user: {},
    idLabel: '',
    stats: {},
    safeRate: '—',
    joinDays: 1,
  },

  onShow() {
    const u = app.globalData.user;
    if (!u) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const stats = getStats(u.username);

    // 安全率
    const safeRate = stats.total > 0
      ? Math.round((stats.safe / stats.total) * 100) + '%'
      : '—';

    // 加入天数（从本地存储读首次登录时间）
    let joinDays = 1;
    try {
      const key = 'antiFraud_join_' + u.username;
      let joinTime = wx.getStorageSync(key);
      if (!joinTime) {
        joinTime = Date.now();
        wx.setStorageSync(key, joinTime);
      }
      joinDays = Math.max(1, Math.ceil((Date.now() - joinTime) / (1000 * 60 * 60 * 24)));
    } catch (e) {}

    this.setData({
      user: { ...u, unameChar: u.username ? u.username[0].toUpperCase() : '?' },
      idLabel: IDMAP[u.identity] || u.identity || '—',
      stats,
      safeRate,
      joinDays,
    });
  },

  logout() {
    wx.showModal({
      title: '退出',
      content: '确认退出登录？',
      success: (res) => {
        if (res.confirm) {
          app.setUser(null);
          wx.reLaunch({ url: '/pages/login/login' });
        }
      },
    });
  },
});
