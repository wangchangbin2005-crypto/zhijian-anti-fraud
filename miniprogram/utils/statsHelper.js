import { STORAGE_STATS, STORAGE_HISTORY } from './constants';

const DEFAULT_STATS = { total: 0, flagged: 0, safe: 0, guardian: 0 };

function loadStatsRoot() {
  const raw = wx.getStorageSync(STORAGE_STATS);
  if (raw && raw.byUser && typeof raw.byUser === 'object') return raw;
  const root = { byUser: {} };
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && !raw.byUser) {
    const hasNum = typeof raw.total === 'number' || typeof raw.flagged === 'number';
    if (hasNum) root.byUser.__legacy__ = { ...DEFAULT_STATS, ...raw };
  }
  wx.setStorageSync(STORAGE_STATS, root);
  return root;
}

function loadHistoryRoot() {
  const raw = wx.getStorageSync(STORAGE_HISTORY);
  if (raw && raw.byUser && typeof raw.byUser === 'object') return raw;
  const root = { byUser: {} };
  if (Array.isArray(raw) && raw.length) root.byUser.__legacy__ = raw.slice();
  wx.setStorageSync(STORAGE_HISTORY, root);
  return root;
}

function bucketKey(username) {
  return (username && String(username).trim()) || 'guest';
}

/** 当前登录用户维度的检测统计（与账号绑定） */
export function getStats(username) {
  const root = loadStatsRoot();
  const key = bucketKey(username);
  if (root.byUser[key]) return { ...DEFAULT_STATS, ...root.byUser[key] };
  if (root.byUser.__legacy__) {
    root.byUser[key] = { ...DEFAULT_STATS, ...root.byUser.__legacy__ };
    delete root.byUser.__legacy__;
    wx.setStorageSync(STORAGE_STATS, root);
    return { ...DEFAULT_STATS, ...root.byUser[key] };
  }
  root.byUser[key] = { ...DEFAULT_STATS };
  wx.setStorageSync(STORAGE_STATS, root);
  return { ...DEFAULT_STATS };
}

export function bumpStats(username, riskLevel) {
  const root = loadStatsRoot();
  const key = bucketKey(username);
  if (!root.byUser[key]) root.byUser[key] = { ...DEFAULT_STATS };
  const s = root.byUser[key];
  s.total += 1;
  if (riskLevel === 'safe' || riskLevel === 'low') s.safe += 1;
  else {
    s.flagged += 1;
    if (riskLevel === 'high' || riskLevel === 'critical') s.guardian += 1;
  }
  wx.setStorageSync(STORAGE_STATS, root);
  return getStats(username);
}

/** 当前用户的检测简史（用于历史记录页） */
export function getHistory(username) {
  const root = loadHistoryRoot();
  const key = bucketKey(username);
  if (root.byUser[key]?.length) return root.byUser[key];
  if (root.byUser.__legacy__) {
    root.byUser[key] = root.byUser.__legacy__.slice();
    delete root.byUser.__legacy__;
    wx.setStorageSync(STORAGE_HISTORY, root);
    return root.byUser[key];
  }
  if (!root.byUser[key]) root.byUser[key] = [];
  return root.byUser[key];
}

export function pushHistory(username, item) {
  const root = loadHistoryRoot();
  const key = bucketKey(username);
  if (!root.byUser[key]) root.byUser[key] = [];
  root.byUser[key].push(item);
  if (root.byUser[key].length > 200) root.byUser[key] = root.byUser[key].slice(-200);
  wx.setStorageSync(STORAGE_HISTORY, root);
}
