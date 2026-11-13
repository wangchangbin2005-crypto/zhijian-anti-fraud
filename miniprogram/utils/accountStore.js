import { STORAGE_ACCOUNTS } from './constants';

/**
 * 本地账号库：wx.setStorageSync(STORAGE_ACCOUNTS)
 * 结构：{ [username]: { password, role: 'admin'|'client', age?, identity? } }
 */
export function getAllAccounts() {
  try {
    return wx.getStorageSync(STORAGE_ACCOUNTS) || {};
  } catch (e) {
    return {};
  }
}

export function saveAllAccounts(accounts) {
  wx.setStorageSync(STORAGE_ACCOUNTS, accounts);
}

export function getAccount(username) {
  return getAllAccounts()[username];
}

export function upsertAccount(username, record) {
  const a = getAllAccounts();
  a[username] = { ...(a[username] || {}), ...record };
  saveAllAccounts(a);
}

export function deleteAccount(username) {
  const a = getAllAccounts();
  delete a[username];
  saveAllAccounts(a);
}

export function listAccountUsernames() {
  return Object.keys(getAllAccounts()).sort();
}

export function setAccountPassword(username, password) {
  const a = getAllAccounts();
  if (!a[username]) return false;
  a[username].password = password;
  saveAllAccounts(a);
  return true;
}

export function setAccountRole(username, role) {
  const a = getAllAccounts();
  if (!a[username]) return false;
  a[username].role = role;
  saveAllAccounts(a);
  return true;
}

/** 管理端列表用：不含密码 */
export function listAccountsSafe() {
  const a = getAllAccounts();
  return Object.keys(a)
    .sort()
    .map((username) => {
      const r = a[username];
      return {
        username,
        role: r.role || 'client',
        age: r.age || '',
        identity: r.identity || 'adult',
      };
    });
}
