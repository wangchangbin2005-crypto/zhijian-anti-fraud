const { STORAGE_USER } = require('./utils/constants');

App({
  globalData: {
    user: null,
    followupContext: null,
    followupThreadKey: null,
  },
  onLaunch() {
    try {
      const u = wx.getStorageSync(STORAGE_USER);
      if (u && u.username) this.globalData.user = u;
    } catch (e) {}
  },
  setUser(u) {
    this.globalData.user = u;
    if (u) wx.setStorageSync(STORAGE_USER, u);
    else wx.removeStorageSync(STORAGE_USER);
  },
});