var { listGuardians, addGuardian, removeGuardian, migrateLegacyUidToUsername } = require('../../utils/guardianStore');
var { RISK_LABELS } = require('../../utils/constants');

const app = getApp();

Page({
  data: {
    ownerUsername: '',
    relations: ['父母', '子女', '配偶', '兄弟姐妹', '其他'],
    relIndex: 0,
    form: { name: '', phone: '', email: '', notify_levels: ['high', 'critical'] },
    levels: ['medium', 'high', 'critical'],
    labels: RISK_LABELS,
    list: [],
    lvMedium: false,
    lvHigh: true,
    lvCritical: true,
  },

  onLoad() {
    this.setData({ 'form.relation': this.data.relations[0] });
  },

  onShow() {
    const u = app.globalData.user;
    if (!u) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    migrateLegacyUidToUsername(u.username, 'user_001');
    this.setData({ ownerUsername: u.username });
    this.reload();
  },

  ownerKey() {
    return this.data.ownerUsername;
  },

  reload() {
    const k = this.ownerKey();
    this.setData({ list: k ? listGuardians(k) : [] });
  },

  onRel(e) {
    this.setData({ relIndex: Number(e.detail.value), 'form.relation': this.data.relations[e.detail.value] });
  },

  toggleLv(e) {
    const l = e.currentTarget.dataset.l;
    const arr = (this.data.form.notify_levels || []).slice();
    const i = arr.indexOf(l);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(l);
    const update = { form: Object.assign({}, this.data.form, { notify_levels: arr }) };
    update.lvMedium = arr.indexOf('medium') >= 0;
    update.lvHigh = arr.indexOf('high') >= 0;
    update.lvCritical = arr.indexOf('critical') >= 0;
    this.setData(update);
  },

  onName(e) { this.setData({ 'form.name': e.detail.value }); },
  onPhone(e) { this.setData({ 'form.phone': e.detail.value }); },
  onEmail(e) { this.setData({ 'form.email': e.detail.value }); },

  save() {
    const u = app.globalData.user;
    if (!u) return;
    const k = this.ownerKey();
    if (!k) return;
    const f = Object.assign({}, this.data.form, { relation: this.data.relations[this.data.relIndex] });
    if (!f.name || !f.phone) {
      wx.showToast({ title: '请填写姓名和手机', icon: 'none' });
      return;
    }
    addGuardian(k, f);
    this.setData({
      form: { name: '', phone: '', email: '', notify_levels: ['high', 'critical'] },
      lvMedium: false, lvHigh: true, lvCritical: true,
    });
    this.reload();
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  testN() { wx.showToast({ title: '模拟：测试通知已发送', icon: 'none' }); },

  alertN(e) {
    const id = e.currentTarget.dataset.id;
    const g = this.data.list.find(function(x) { return x.id === id; });
    wx.showModal({
      title: '手动预警（模拟）',
      content: g ? ('已向 ' + g.name + ' (' + (g.email || g.phone) + ') 发送预警通知') : '',
      showCancel: false,
    });
  },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    const k = this.ownerKey();
    wx.showModal({
      title: '删除',
      content: '确认删除该监护人？',
      success: (res) => {
        if (res.confirm && k) {
          removeGuardian(k, id);
          this.reload();
        }
      },
    });
  },
});
