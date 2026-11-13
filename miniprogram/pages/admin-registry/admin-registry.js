import { listAccountsSafe, getAllAccounts, saveAllAccounts, deleteAccount, setAccountPassword } from '../../utils/accountStore';
import { listGuardians, addGuardian, removeGuardian, clearGuardiansForUser } from '../../utils/guardianStore';
import { RISK_LABELS } from '../../utils/constants';

const app = getApp();

Page({
  data: {
    users: [],
    selected: '',
    selectedMeta: null,
    guardians: [],
    newPwd: '',
    relations: ['父母', '子女', '配偶', '兄弟姐妹', '其他'],
    relIndex: 0,
    form: { name: '', phone: '', email: '', notify_levels: ['high', 'critical'] },
    levels: ['medium', 'high', 'critical'],
    labels: RISK_LABELS,
  },

  onShow() {
    const u = app.globalData.user;
    if (!u || u.role !== 'admin') {
      wx.showToast({ title: '需要管理端登录', icon: 'none' });
      setTimeout(() => wx.reLaunch({ url: '/pages/home/home' }), 500);
      return;
    }
    this.refreshUsers();
    const sel = this.data.selected;
    if (sel) {
      const names = listAccountsSafe().map((x) => x.username);
      if (names.includes(sel)) this.selectByUsername(sel);
      else this.setData({ selected: '', selectedMeta: null, guardians: [], newPwd: '' });
    }
  },

  refreshUsers() {
    const users = listAccountsSafe().map((row) => ({
      ...row,
      guardianCount: listGuardians(row.username).length,
    }));
    this.setData({ users });
  },

  pickUser(e) {
    const username = e.currentTarget.dataset.u;
    this.selectByUsername(username);
  },

  selectByUsername(username) {
    const acc = getAllAccounts()[username];
    this.setData({
      selected: username,
      selectedMeta: acc
        ? { username, role: acc.role || 'client', age: acc.age || '', identity: acc.identity || 'adult' }
        : null,
      guardians: listGuardians(username),
      newPwd: '',
      form: { name: '', phone: '', email: '', notify_levels: ['high', 'critical'] },
      relIndex: 0,
    });
  },

  onNewPwd(e) {
    this.setData({ newPwd: e.detail.value });
  },

  applyPwd() {
    const pwd = (this.data.newPwd || '').trim();
    const username = this.data.selected;
    if (!username) {
      wx.showToast({ title: '请先选择用户', icon: 'none' });
      return;
    }
    if (pwd.length < 6) {
      wx.showToast({ title: '新密码至少6位', icon: 'none' });
      return;
    }
    if (!setAccountPassword(username, pwd)) {
      wx.showToast({ title: '用户不存在', icon: 'none' });
      return;
    }
    this.setData({ newPwd: '' });
    wx.showToast({ title: '密码已更新', icon: 'success' });
  },

  removeUser() {
    const username = this.data.selected;
    const cur = app.globalData.user;
    if (!username) return;
    if (cur && cur.username === username) {
      wx.showToast({ title: '不能删除当前登录账号', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '删除账号',
      content: `将删除「${username}」及其监护人数据，不可恢复。`,
      success: (res) => {
        if (!res.confirm) return;
        clearGuardiansForUser(username);
        deleteAccount(username);
        this.setData({ selected: '', selectedMeta: null, guardians: [], newPwd: '' });
        this.refreshUsers();
        wx.showToast({ title: '已删除', icon: 'none' });
      },
    });
  },

  onRel(e) {
    const i = Number(e.detail.value);
    this.setData({ relIndex: i });
  },

  onForm(e) {
    const k = e.currentTarget.dataset.k;
    if (!k) return;
    this.setData({ [`form.${k}`]: e.detail.value });
  },

  toggleLv(e) {
    const l = e.currentTarget.dataset.l;
    const arr = (this.data.form.notify_levels || []).slice();
    const i = arr.indexOf(l);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(l);
    this.setData({ 'form.notify_levels': arr });
  },

  addGuardian() {
    const username = this.data.selected;
    if (!username) {
      wx.showToast({ title: '请先选择用户', icon: 'none' });
      return;
    }
    const relation = this.data.relations[this.data.relIndex];
    const f = { ...this.data.form, relation };
    if (!f.name || !f.phone) {
      wx.showToast({ title: '填写姓名与手机', icon: 'none' });
      return;
    }
    addGuardian(username, f);
    this.setData({
      form: { name: '', phone: '', email: '', notify_levels: ['high', 'critical'] },
      guardians: listGuardians(username),
    });
    this.refreshUsers();
    wx.showToast({ title: '已保存到本地', icon: 'success' });
  },

  removeG(e) {
    const id = e.currentTarget.dataset.id;
    const username = this.data.selected;
    wx.showModal({
      title: '删除监护人',
      content: '确认删除？',
      success: (res) => {
        if (!res.confirm || !username) return;
        removeGuardian(username, id);
        this.setData({ guardians: listGuardians(username) });
        this.refreshUsers();
      },
    });
  },
});
