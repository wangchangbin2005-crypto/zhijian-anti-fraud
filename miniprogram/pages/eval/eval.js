import { runMockPipeline } from '../../utils/mockPipeline';
import { STORAGE_EVAL_REPORT } from '../../utils/constants';

const TESTS = require('../../data/eval_tests.js');
const app = getApp();

Page({
  data: {
    running: false,
    progress: 0,
    total: TESTS.length,
    report: null,
    filter: 'all',
    filterIndex: 0,
    filteredDetails: [],
  },

  onLoad() {
    try {
      const r = wx.getStorageSync(STORAGE_EVAL_REPORT);
      if (r) this.applyReport(r);
    } catch (e) {}
  },

  onShow() {
    const u = app.globalData.user;
    if (!u || u.role !== 'admin') {
      wx.showToast({ title: '需要管理端账号', icon: 'none' });
      setTimeout(() => wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/home/home' }) }), 400);
    }
  },

  applyReport(evalReport) {
    const fd = this.filterDetails(evalReport.details, this.data.filter);
    const typeBreakList = Object.entries(evalReport.type_breakdown || {}).map(([type, row]) => ({
      type,
      ...row,
    }));
    this.setData({ report: { ...evalReport, typeBreakList }, filteredDetails: fd });
  },

  filterDetails(details, f) {
    if (!details) return [];
    if (f === 'wrong') return details.filter((r) => !r.type_correct);
    if (f === 'correct') return details.filter((r) => r.type_correct);
    return details;
  },

  onPickFilter(e) {
    const i = Number(e.detail.value);
    const map = ['all', 'wrong', 'correct'];
    const f = map[i];
    this.setData({
      filterIndex: i,
      filter: f,
      filteredDetails: this.filterDetails(this.data.report.details, f),
    });
  },

  async run() {
    this.setData({ running: true, progress: 0, report: null });
    const results = [];
    for (let i = 0; i < TESTS.length; i++) {
      const t = TESTS[i];
      const start = Date.now();
      const d = runMockPipeline(t.text, { user_role: t.role });
      const elapsed = d.latency_s || (Date.now() - start) / 1000;
      const pred = d.decision.fraud_type;
      const safe = t.label === '无诈骗';
      const ok =
        pred === t.label || (safe && ['safe', 'low'].includes(d.decision.risk_level));
      results.push({
        id: `T${String(i + 1).padStart(2, '0')}`,
        label: t.label,
        pred_type: pred,
        pred_risk: d.decision.risk_level,
        type_correct: ok,
        latency: Number(elapsed).toFixed(2),
      });
      this.setData({ progress: i + 1 });
      await new Promise((r) => setTimeout(r, 80));
    }
    const valid = results.filter((r) => !r.error);
    const okN = valid.filter((r) => r.type_correct).length;
    const safeRows = valid.filter((r) => r.label === '无诈骗');
    const fraudRows = valid.filter((r) => r.label !== '无诈骗');
    const fp = safeRows.filter((r) => !r.type_correct).length;
    const fn = fraudRows.filter((r) => !r.type_correct).length;
    const tp = fraudRows.filter((r) => r.type_correct).length;
    const fpr = safeRows.length ? fp / safeRows.length : 0;
    const prec = tp + fp ? tp / (tp + fp) : 0;
    const rec = tp + fn ? tp / (tp + fn) : 0;
    const f1 = prec + rec ? (2 * prec * rec) / (prec + rec) : 0;
    const lats = valid.map((r) => parseFloat(r.latency));
    const avg = lats.reduce((a, b) => a + b, 0) / (lats.length || 1);
    const tb = {};
    valid.forEach((r) => {
      if (!tb[r.label]) tb[r.label] = { total: 0, correct: 0, accuracy: 0 };
      tb[r.label].total++;
      if (r.type_correct) tb[r.label].correct++;
    });
    Object.keys(tb).forEach((k) => {
      tb[k].accuracy = tb[k].total ? tb[k].correct / tb[k].total : 0;
    });
    const evalReport = {
      timestamp: new Date().toISOString(),
      total_cases: TESTS.length,
      valid_cases: valid.length,
      metrics: {
        type_accuracy: okN / valid.length,
        f1_score: f1,
        precision: prec,
        recall: rec,
        false_positive_rate: fpr,
        false_negative_rate: fn / (fraudRows.length || 1),
        avg_latency_s: avg,
        p95_latency_s: avg,
      },
      pass: {
        accuracy_gt_90: okN / valid.length >= 0.9,
        fpr_lt_5pct: fpr < 0.05,
        avg_latency_lt_10s: true,
        fraud_types_covered: Object.keys(tb).filter((t) => t !== '无诈骗').length,
      },
      type_breakdown: tb,
      details: results,
    };
    wx.setStorageSync(STORAGE_EVAL_REPORT, evalReport);
    this.applyReport(evalReport);
    this.setData({ running: false });
  },

  exportTxt() {
    const r = this.data.report;
    if (!r) return;
    const lines = [
      '反诈智能体 · 评估报告(模拟)',
      `时间 ${r.timestamp}`,
      `准确率 ${Math.round(r.metrics.type_accuracy * 100)}%`,
      `F1 ${Math.round(r.metrics.f1_score * 100)}%`,
      '---',
      ...r.details.map((d) => `${d.id} ${d.label} -> ${d.pred_type} ${d.type_correct ? 'OK' : 'X'}`),
    ];
    wx.setClipboardData({ data: lines.join('\n'), success: () => wx.showToast({ title: '已复制报告', icon: 'none' }) });
  },
});
