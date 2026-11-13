import { STORAGE_SESSIONS } from './constants';

function loadAll() {
  try {
    return wx.getStorageSync(STORAGE_SESSIONS) || { byUser: {} };
  } catch (e) {
    return { byUser: {} };
  }
}

function saveAll(data) {
  wx.setStorageSync(STORAGE_SESSIONS, data);
}

export function appendSessionMessage(userId, sessionId, msg) {
  const data = loadAll();
  if (!data.byUser[userId]) data.byUser[userId] = {};
  if (!data.byUser[userId][sessionId]) {
    data.byUser[userId][sessionId] = {
      session_id: sessionId,
      messages: [],
      max_risk: 'safe',
      last_time: new Date().toISOString(),
    };
  }
  const sess = data.byUser[userId][sessionId];
  sess.messages.push(msg);
  sess.last_time = new Date().toISOString();
  const order = ['safe', 'low', 'medium', 'high', 'critical'];
  const ri = order.indexOf(msg.risk_level);
  const ci = order.indexOf(sess.max_risk);
  if (ri > ci) sess.max_risk = msg.risk_level;
  saveAll(data);
}

export function listSessions(userId) {
  const data = loadAll();
  const map = data.byUser[userId] || {};
  return Object.values(map)
    .map((s) => ({
      session_id: s.session_id,
      max_risk: s.max_risk,
      msg_count: s.messages.length,
      last_time: s.last_time,
    }))
    .sort((a, b) => (b.last_time > a.last_time ? 1 : -1));
}

export function getSession(userId, sessionId) {
  const data = loadAll();
  return data.byUser[userId]?.[sessionId]?.messages || [];
}

export function deleteSession(userId, sessionId) {
  const data = loadAll();
  if (data.byUser[userId]?.[sessionId]) {
    delete data.byUser[userId][sessionId];
    saveAll(data);
  }
}

export function deleteAllSessions(userId) {
  const data = loadAll();
  data.byUser[userId] = {};
  saveAll(data);
}

export function riskHistoryFromSessions(userId) {
  const data = loadAll();
  const sess = data.byUser[userId] || {};
  const out = [];
  Object.values(sess).forEach((s) => {
    (s.messages || []).forEach((m) => {
      if (m.risk_level && m.risk_level !== 'safe' && m.risk_level !== 'low') {
        out.push({
          risk_level: m.risk_level,
          fraud_type: m.fraud_type || '',
          timestamp: m.timestamp,
        });
      }
    });
  });
  return out.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
}
