import { STORAGE_KB_EXTRA } from './constants';

const seed = require('../data/kb_seed.js');

export function getKbCases() {
  let extra = [];
  try {
    extra = wx.getStorageSync(STORAGE_KB_EXTRA) || [];
  } catch (e) {}
  const base = (seed.cases || []).map((c, i) => ({ ...c, id: c.id || `seed_${i}` }));
  return base.concat(extra);
}

export function addKbCase(entry) {
  const extra = wx.getStorageSync(STORAGE_KB_EXTRA) || [];
  extra.push({
    id: `m_${Date.now()}`,
    type: entry.fraud_type,
    summary: entry.summary,
    keywords: entry.keywords || '',
    source: 'manual',
  });
  wx.setStorageSync(STORAGE_KB_EXTRA, extra);
}

export function kbSearchMock(query, cases) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/).filter(Boolean);
  return cases
    .map((c) => {
      const blob = `${c.type} ${c.summary} ${c.keywords || ''}`.toLowerCase();
      let hit = 0;
      words.forEach((w) => {
        if (blob.includes(w)) hit += 1;
      });
      const similarity = Math.min(0.95, 0.35 + hit * 0.22 + (blob.includes(q) ? 0.25 : 0));
      return { ...c, similarity };
    })
    .filter((c) => c.similarity > 0.4)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 12);
}

export const FRAUD_TYPES = seed.fraudTypes || [];
