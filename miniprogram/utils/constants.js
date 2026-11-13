/**
 * 本地持久化键（均存于 wx.storage，卸载小程序或清缓存会丢失）
 * - antiFraud_user：当前登录会话 { username, role, age?, identity? }（无密码）
 * - antiFraud_accounts：全部注册账号 { 用户名: { password, role, age?, identity? } }
 * - antiFraud_guardians：监护人 { 用户名: [ { id, name, relation, phone, email, notify_levels, created_at } ] }
 * - antiFraud_stats：{ byUser: { 用户名: { total, flagged, safe, guardian } } }（按账号分账；旧版扁平结构会自动迁入当前用户）
 * - antiFraud_history：{ byUser: { 用户名: [检测摘要…] } }
 * - antiFraud_sessions：{ byUser: { 用户名: { 会话id: … } } }（会话主键与登录用户名一致）
 */
export const STORAGE_USER = 'antiFraud_user';
export const STORAGE_ACCOUNTS = 'antiFraud_accounts';
export const STORAGE_STATS = 'antiFraud_stats';
export const STORAGE_HISTORY = 'antiFraud_history';
export const STORAGE_SESSIONS = 'antiFraud_sessions';
export const STORAGE_KB_EXTRA = 'antiFraud_kb_extra';
export const STORAGE_GUARDIANS = 'antiFraud_guardians';
export const STORAGE_EVO_LOGS = 'antiFraud_evo_logs';
export const STORAGE_EVAL_REPORT = 'antiFraud_eval_report';
export const STORAGE_INTRO_DONE = 'antiFraud_intro_done';

export const RISK_LABELS = {
  safe: '安全',
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '极高风险',
};

export const RISK_COLORS = {
  safe: '#22c55e',
  low: '#f59e0b',
  medium: '#f97316',
  high: '#ef4444',
  critical: '#7f1d1d',
};
