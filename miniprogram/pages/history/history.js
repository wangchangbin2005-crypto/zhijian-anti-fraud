import { getHistory } from '../../utils/statsHelper';
import { RISK_LABELS } from '../../utils/constants';

const app = getApp();

Page({
  data: {
    list: [],
    labels: RISK_LABELS,
    ownerUsername: '',
  },

  onShow() {
    const u = app.globalData.user;
    if (!u) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const list = getHistory(u.username).slice(-100).reverse();
    this.setData({ list, ownerUsername: u.username });
  },

  open(e) {
    const i = e.currentTarget.dataset.i;
    const item = this.data.list[i];
    if (!item) return;
    if (item.report) {
      wx.setStorageSync('detect_history_report', {
        text: item.text || '',
        report: item.report,
        timestamp: item.timestamp || new Date().toLocaleTimeString(),
        followupKey: item.followup_key || '',
      });
    } else {
      wx.setStorageSync('detect_prefill', item.text);
    }
    wx.navigateTo({ url: '/pages/detect/detect' });
  },
});
