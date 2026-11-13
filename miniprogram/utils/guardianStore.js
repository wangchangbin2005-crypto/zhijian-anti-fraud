import { STORAGE_GUARDIANS } from './constants';

function all() {
  try {
    return wx.getStorageSync(STORAGE_GUARDIANS) || {};
  } catch (e) {
    return {};
  }
}

function save(a) {
  wx.setStorageSync(STORAGE_GUARDIANS, a);
}

/** 主键为「登录用户名」，与 antiFraud_accounts 一致 */
export function listGuardians(username) {
  return all()[username] || [];
}

export function addGuardian(username, form) {
  const a = all();
  if (!a[username]) a[username] = [];
  a[username].push({
    id: `g_${Date.now()}`,
    name: form.name,
    relation: form.relation,
    phone: form.phone,
    email: form.email,
    notify_levels: form.notify_levels || ['high', 'critical'],
    created_at: new Date().toLocaleString(),
  });
  save(a);
}

export function removeGuardian(username, id) {
  const a = all();
  if (!a[username]) return;
  a[username] = a[username].filter((g) => g.id !== id);
  save(a);
}

export function clearGuardiansForUser(username) {
  const a = all();
  delete a[username];
  save(a);
}

/** 管理端：所有已存有监护人的用户名及数量 */
export function listGuardianBuckets() {
  const g = all();
  return Object.keys(g)
    .map((username) => ({ username, count: (g[username] || []).length }))
    .sort((x, y) => x.username.localeCompare(y.username));
}

/**
 * 旧版按模拟 UID（user_001 等）存的数据，迁移到当前登录用户名（仅当目标为空时执行一次）
 */
export function migrateLegacyUidToUsername(username, legacyUid) {
  if (!username || !legacyUid) return false;
  const a = all();
  if ((a[username] || []).length) return false;
  const legacy = a[legacyUid];
  if (!legacy || !legacy.length) return false;
  a[username] = JSON.parse(JSON.stringify(legacy));
  save(a);
  return true;
}
