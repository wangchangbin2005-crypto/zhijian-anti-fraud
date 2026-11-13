const STORAGE_FOLLOWUP = 'antiFraud_followup_threads';

function _root() {
  try {
    const raw = wx.getStorageSync(STORAGE_FOLLOWUP);
    if (raw && raw.byUser && typeof raw.byUser === 'object') return raw;
  } catch (e) {}
  return { byUser: {} };
}

function _save(root) {
  wx.setStorageSync(STORAGE_FOLLOWUP, root);
}

function _userKey(username) {
  return (username && String(username).trim()) || 'guest';
}

function _threadKey(key) {
  return (key && String(key).trim()) || 'default';
}

function _buildThread(messages, ctx) {
  return {
    messages: Array.isArray(messages) ? messages : [],
    ctx: ctx || null,
    updatedAt: new Date().toISOString(),
  };
}

function getFollowupThread(username, key) {
  const root = _root();
  const u = _userKey(username);
  const k = _threadKey(key);
  return root.byUser[u]?.[k] || null;
}

function saveFollowupThread(username, key, messages, ctx) {
  const root = _root();
  const u = _userKey(username);
  const k = _threadKey(key);
  if (!root.byUser[u]) root.byUser[u] = {};
  root.byUser[u][k] = _buildThread(messages, ctx);
  _save(root);
}

module.exports = {
  getFollowupThread,
  saveFollowupThread,
};

