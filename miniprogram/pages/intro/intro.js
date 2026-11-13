const CARDS = [
  { label: 'AI合成语音诈骗', emoji: '🎭', tag: 'CASE 01 / DEEPFAKE', desc: '克隆亲人声音\n伪造紧急求助要你打钱', warn: '收到家人紧急求助，先挂断回拨！' },
  { label: '投资理财诈骗', emoji: '📈', tag: 'CASE 02 / INVESTMENT', desc: '承诺稳赚不赔\n内部消息是精心下的套', warn: '任何保本超高收益投资均为诈骗！' },
  { label: '兼职刷单诈骗', emoji: '📦', tag: 'CASE 03 / PART-TIME', desc: '先垫付拿高佣金\n任务永远做不完', warn: '正规兼职绝不需要垫付！' },
  { label: '冒充公检法', emoji: '👮', tag: 'CASE 04 / IMPERSONATION', desc: '自称警察说你涉案\n让你把钱转入安全账户', warn: '公检法不会电话让你转账！' },
  { label: '情感诈骗', emoji: '💔', tag: 'CASE 05 / ROMANCE', desc: '网恋数月后\n引导虚假平台投入积蓄', warn: '网恋对象要你投资，百分百骗局！' },
  { label: '虚假购物诈骗', emoji: '🛒', tag: 'CASE 06 / SHOPPING', desc: '假冒客服三倍赔偿\n骗走银行卡验证码', warn: '退款不要验证码和银行卡密码！' },
  { label: '虚假贷款诈骗', emoji: '💸', tag: 'CASE 07 / LOAN', desc: '免征信秒批高额\n先交各种费用', warn: '正规贷款不会先收费！' },
  { label: '虚假中奖诈骗', emoji: '🎰', tag: 'CASE 08 / PRIZE', desc: '巨额大奖先缴税\n天上不会掉馅饼', warn: '中奖要先转账=骗局！' },
];

Page({
  data: {
    cards: CARDS,
    idx: 0,
    total: CARDS.length,
    revealed: false,
    phase: 'intro',
  },

  onCardTap() {
    if (!this.data.revealed) {
      this.setData({ revealed: true });
      return;
    }
    if (this.data.idx < this.data.total - 1) {
      this.setData({ idx: this.data.idx + 1, revealed: false });
    } else {
      this.setData({ phase: 'done' });
    }
  },

  skip() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/login/login' }) });
  },
});
