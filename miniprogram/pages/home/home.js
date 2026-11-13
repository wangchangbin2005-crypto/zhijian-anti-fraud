const app = getApp();

Page({
  data: {
    isAdmin: false,
  },

  onShow() {
    const u = app.globalData.user;
    if (!u) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const isAdmin = u.role === 'admin';
    this.setData({ isAdmin });
  },

  go(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.navigateTo({
      url,
      fail: (err) => {
        console.error('navigateTo failed', url, err);
        wx.showToast({ title: '页面打开失败，请查看控制台', icon: 'none' });
      },
    });
  },
});
