import { getAllAccounts, saveAllAccounts } from '../../utils/accountStore';

const app = getApp();

function loadAccounts() {
  return getAllAccounts();
}

function saveAccounts(a) {
  saveAllAccounts(a);
}

Page({
  data: {
    authMode: 'login',
    loginSubMode: 'pwd',
    loginForm: { username: '', password: '' },
    smsForm: { email: '', code: '' },
    regForm: { username: '', password: '', confirm: '', role: 'client', age: '', identity: 'adult' },
    regRoleIndex: 0,
    roleLabels: ['客户端', '管理端'],
    idLabels: ['普通成人', '老年人', '学生', '财务/金融', '其他'],
    idIndex: 0,
    loginError: '',
    loginLoading: false,
    smsCooldown: 0,
    devCode: '',
  },

  onLoad() {
    const acc = loadAccounts();
    if (!acc.demo) {
      acc.demo = { password: '123456', role: 'client', age: '30', identity: 'adult' };
      acc.admin_demo = { password: 'admin123', role: 'admin', age: '', identity: 'adult' };
      saveAccounts(acc);
    }
    const u = app.globalData.user;
    if (u && u.username) {
      wx.reLaunch({ url: '/pages/home/home' });
    }
  },

  setMode(e) {
    this.setData({ authMode: e.currentTarget.dataset.mode, loginError: '' });
  },

  setSub(e) {
    this.setData({ loginSubMode: e.currentTarget.dataset.sub, loginError: '' });
  },

  onRegRole(e) {
    const i = Number(e.detail.value);
    const role = i === 1 ? 'admin' : 'client';
    this.setData({ regRoleIndex: i, 'regForm.role': role });
  },

  onIdPick(e) {
    const i = Number(e.detail.value);
    const map = ['adult', 'elder', 'student', 'financial', 'other'];
    this.setData({ idIndex: i, 'regForm.identity': map[i] });
  },

  onRegField(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    this.setData({ [`regForm.${key}`]: e.detail.value });
  },

  onLoginField(e) {
    const form = e.currentTarget.dataset.form;
    const key = e.currentTarget.dataset.key;
    if (!form || !key) return;
    const path = form === 'sms' ? `smsForm.${key}` : `loginForm.${key}`;
    this.setData({ [path]: e.detail.value });
  },

  sendSms() {
    const email = (this.data.smsForm.email || '').trim();
    if (!email || !email.includes('@')) {
      this.setData({ loginError: '请输入正确邮箱' });
      return;
    }
    const code = String(100000 + Math.floor(Math.random() * 900000));
    wx.setStorageSync('antiFraud_last_sms', { email, code, t: Date.now() });
    this.setData({ devCode: code, loginError: '' });
    let cd = 60;
    this.setData({ smsCooldown: cd });
    const t = setInterval(() => {
      cd -= 1;
      this.setData({ smsCooldown: cd });
      if (cd <= 0) clearInterval(t);
    }, 1000);
    wx.showToast({ title: '验证码已生成(模拟)', icon: 'none' });
  },

  doLogin() {
    this.setData({ loginError: '' });
    if (this.data.loginSubMode === 'pwd') {
      const { username, password } = this.data.loginForm;
      if (!username || !password) {
        this.setData({ loginError: '账号和密码不能为空' });
        return;
      }
      this.setData({ loginLoading: true });
      setTimeout(() => {
        const acc = loadAccounts()[username];
        if (acc && acc.password === password) {
          this._success({ username, role: acc.role || 'client', age: acc.age, identity: acc.identity || 'adult' });
        } else if (!acc) {
          this.setData({ loginError: '账号不存在，请先注册' });
        } else {
          this.setData({ loginError: '密码错误' });
        }
        this.setData({ loginLoading: false });
      }, 400);
    } else {
      const { email, code } = this.data.smsForm;
      if (!email || !code) {
        this.setData({ loginError: '请填写邮箱和验证码' });
        return;
      }
      const saved = wx.getStorageSync('antiFraud_last_sms') || {};
      if (saved.email !== email || String(saved.code) !== String(code)) {
        this.setData({ loginError: '验证码错误或已过期' });
        return;
      }
      const key = `email_${email}`;
      const accounts = loadAccounts();
      if (!accounts[key]) {
        accounts[key] = { password: 'x', role: 'client', identity: 'adult' };
        saveAccounts(accounts);
      }
      this._success({
        username: key,
        role: accounts[key].role || 'client',
        identity: accounts[key].identity || 'adult',
      });
    }
  },

  _success(user) {
    app.setUser(user);
    wx.reLaunch({ url: '/pages/home/home' });
  },

  doRegister() {
    const { username, password, confirm, role, age, identity } = this.data.regForm;
    this.setData({ loginError: '' });
    if (!username || !password || !confirm) {
      this.setData({ loginError: '请填写所有字段' });
      return;
    }
    if (!/^[a-zA-Z0-9_]{4,16}$/.test(username)) {
      this.setData({ loginError: '账号须为4-16位字母数字下划线' });
      return;
    }
    if (password.length < 6) {
      this.setData({ loginError: '密码不少于6位' });
      return;
    }
    if (password !== confirm) {
      this.setData({ loginError: '两次密码不一致' });
      return;
    }
    const idMap = ['adult', 'elder', 'student', 'financial', 'other'];
    const identityFinal = role === 'client' ? idMap[this.data.idIndex] : 'adult';
    const accounts = loadAccounts();
    if (accounts[username]) {
      this.setData({ loginError: '该账号已存在' });
      return;
    }
    accounts[username] = { password, role, age, identity: identityFinal };
    saveAccounts(accounts);
    wx.showToast({ title: '注册成功', icon: 'success' });
    this.setData({ authMode: 'login', loginForm: { username, password: '' } });
  },

  goIntro() {
    wx.navigateTo({ url: '/pages/intro/intro' });
  },
});
