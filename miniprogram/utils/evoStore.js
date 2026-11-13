import { STORAGE_EVO_LOGS } from './constants';

const DEFAULT = { total_runs: 0, interval_hours: 6, last_run: '', recent_logs: [] };

export function getEvoStatus() {
  try {
    return { ...DEFAULT, ...(wx.getStorageSync(STORAGE_EVO_LOGS) || {}) };
  } catch (e) {
    return { ...DEFAULT };
  }
}

export function appendEvoRun(log) {
  const s = getEvoStatus();
  s.total_runs = (s.total_runs || 0) + 1;
  s.last_run = log.run_at;
  s.recent_logs = [log, ...(s.recent_logs || [])].slice(0, 20);
  wx.setStorageSync(STORAGE_EVO_LOGS, s);
  return s;
}
