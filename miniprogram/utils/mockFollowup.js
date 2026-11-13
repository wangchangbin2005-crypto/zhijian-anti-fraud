const IDENTITY = {
  elder: '老年人',
  student: '学生',
  adult: '普通成人',
  financial: '财务/金融人员',
  other: '普通用户',
};

const TEMPLATES = [
  { k: ['举报', '报警'], r: '请保留聊天记录、转账凭证，拨打 110 或 96110，也可通过国家反诈中心 APP 举报。' },
  { k: ['下一步', '还会'], r: '骗子常见下一步：要求加大转账、制造新借口收费、或威胁“案件升级”。任何新理由都不要轻信。' },
  { k: ['为什么', '怎么是'], r: '结合你提供的内容，其中含有“紧急转账/索要验证码/安全账户”等典型特征，与官方流程不符，因此判定为高风险话术。' },
  { k: ['家人', '告诉'], r: '建议立即告知家人或监护人，不要独自处理大额资金操作。' },
  { k: ['避免', '防止'], r: '不点击陌生链接、不向陌生账户转账、验证码绝不外泄；涉及资金先线下或官方电话二次确认。' },
];

export function mockFollowupReply(question, ctx, user) {
  const q = (question || '').trim();
  const idLabel = IDENTITY[user?.identity] || '普通用户';
  let base = `（${idLabel}专属提示）`;
  if (ctx && ctx.fraudType) {
    base += ` 结合你之前的检测结果【${ctx.riskLabel || ''} · ${ctx.fraudType}】：`;
  }
  for (const t of TEMPLATES) {
    if (t.k.some((x) => q.includes(x))) return base + t.r;
  }
  if (q.includes('96110')) return base + '96110 是全国反诈专线，遇可疑情况可随时咨询。';
  return (
    base +
    '建议在「实时检测」中发送完整聊天截图或话术原文，我可以结合上下文逐项拆解风险点；涉及资金务必先挂断、回拨官方号码核实。'
  );
}
