const seed = require('../../data/learn_seed.js');
const hallData = require('../../data/learn_hall.js');
const { extractBvid, navigateToBilibiliVideo, isUserCancel } = require('../../utils/openBilibili.js');

function filterHall(items, cat, keyword) {
  const q = (keyword || '').trim().toLowerCase();
  let list = items || [];
  if (cat && cat !== 'all') list = list.filter((i) => i.cat === cat);
  if (q) {
    list = list.filter((i) => {
      const blob = (i.title + ' ' + (i.subtitle || '') + ' ' + (i.tags || []).join(' ')).toLowerCase();
      return blob.includes(q);
    });
  }
  return list;
}

Page({
  data: {
    tab: 'hall',
    mainTabs: [
      { id: 'hall', name: '精选案例' },
      { id: 'text', name: '文本案例' },
      { id: 'image', name: '图解识骗' },
      { id: 'quiz', name: '防骗测验' },
    ],
    hallCategories: hallData.categories || [],
    hallItems: hallData.items || [],
    hallCat: 'all',
    hallSearch: '',
    hallFiltered: filterHall(hallData.items || [], 'all', ''),
    categories: seed.learnCategories || [],
    activeCat: 'all',
    cases: seed.learnCases || [],
    filtered: seed.learnCases || [],
    openIdx: -1,
    imageCards: seed.learnImageCards || [],
    modal: null,
    quiz: seed.quizQuestions || [],
    currentQuiz: null,
    userPickForCurrent: -1,
    quizStarted: false,
    quizDone: false,
    qIdx: 0,
    qScore: 0,
    qAnswers: [],
    qAnswered: false,
  },

  noop() {},

  onLoad() {
    this.applyHallFilter();
  },

  applyHallFilter() {
    const { hallItems, hallCat, hallSearch } = this.data;
    this.setData({ hallFiltered: filterHall(hallItems, hallCat, hallSearch) });
  },

  onHallSearch(e) {
    this.setData({ hallSearch: e.detail.value }, () => this.applyHallFilter());
  },

  onHallSearchConfirm() {
    this.applyHallFilter();
  },

  pickHallCat(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ hallCat: id }, () => this.applyHallFilter());
  },

  openHallItem(e) {
    const url = e.currentTarget.dataset.url;
    const kind = e.currentTarget.dataset.kind;
    if (!url) return;
    if (kind === 'bilibili') {
      const bvid = extractBvid(url);
      if (bvid) {
        navigateToBilibiliVideo(bvid).catch((err) => {
          if (isUserCancel(err)) return;
          wx.showModal({
            title: '未能打开B站小程序',
            content: '可复制链接到浏览器或B站App。',
            confirmText: '复制',
            success: (r) => {
              if (r.confirm) wx.setClipboardData({ data: url, success: () => wx.showToast({ title: '已复制', icon: 'none' }) });
            },
          });
        });
        return;
      }
    }
    wx.showModal({
      title: '复制链接',
      content: '资讯页需在浏览器打开，是否复制链接？',
      confirmText: '复制',
      success: (r) => {
        if (r.confirm) wx.setClipboardData({ data: url, success: () => wx.showToast({ title: '已复制', icon: 'none' }) });
      },
    });
  },

  onCat(e) {
    const id = e.currentTarget.dataset.id;
    const filtered = id === 'all' ? this.data.cases : this.data.cases.filter((c) => c.cat === id);
    this.setData({ activeCat: id, filtered, openIdx: -1 });
  },

  toggleCase(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ openIdx: this.data.openIdx === i ? -1 : i });
  },

  setTab(e) {
    this.setData({ tab: e.currentTarget.dataset.t });
  },

  openImg(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ modal: this.data.imageCards[i] });
  },

  closeModal() {
    this.setData({ modal: null });
  },

  startQuiz() {
    const quiz = this.data.quiz || [];
    this.setData({
      quizStarted: true,
      quizDone: false,
      qIdx: 0,
      qScore: 0,
      qAnswers: [],
      qAnswered: false,
      currentQuiz: quiz[0] || null,
      userPickForCurrent: -1,
    });
  },

  quitQuiz() {
    wx.showModal({
      title: '退出测试',
      content: '确定退出本次测试？进度不会保存。',
      success: (res) => {
        if (res.confirm) {
          this.setData({ quizStarted: false, quizDone: false, qIdx: 0, qScore: 0 });
        }
      },
    });
  },

  pickAns(e) {
    if (this.data.qAnswered) return;
    const oi = e.currentTarget.dataset.i;
    const q = this.data.quiz[this.data.qIdx];
    if (!q) return;
    const ok = oi === q.answer;
    const ans = this.data.qAnswers.slice();
    ans[this.data.qIdx] = oi;
    this.setData({
      qAnswered: true,
      qAnswers: ans,
      qScore: this.data.qScore + (ok ? 1 : 0),
      userPickForCurrent: oi,
    });
  },

  nextQ() {
    const quiz = this.data.quiz || [];
    if (this.data.qIdx < quiz.length - 1) {
      const nextIdx = this.data.qIdx + 1;
      this.setData({ qIdx: nextIdx, qAnswered: false, currentQuiz: quiz[nextIdx], userPickForCurrent: -1 });
    } else {
      this.setData({ quizDone: true, currentQuiz: null });
    }
  },
});
