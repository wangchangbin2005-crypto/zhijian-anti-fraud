<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdminStore } from '@/stores/admin'
import { useWorkspaceStore } from '@/stores/workspace'

const ad = useAdminStore()
const ws = useWorkspaceStore()

onMounted(() => {
  void ad.loadGuardians()
})
</script>

<template>
  <div>
    <div class="page-header" style="padding-right:170px">
      <div class="page-title">监护人设置</div>
      <div class="page-subtitle">配置监护人信息 · 设置通知触发条件 · 数据持久化存储</div>
    </div>

    <!-- 工具栏 -->
    <div class="gd-toolbar">
      <button class="btn btn-outline" type="button" @click="ad.loadGuardians()">🔄 刷新列表</button>
      <span class="gd-count">共 <strong>{{ ad.gd.list.length }}</strong> 位监护人</span>
    </div>

    <!-- 添加表单 -->
    <div class="card gd-form-card">
      <div class="gd-section-title">
        <span class="gd-section-bar"></span>
        添加监护人
      </div>
      <div class="gd-form-grid">
        <div class="gd-field">
          <label class="gd-label">姓名</label>
          <input v-model="ad.gd.form.name" type="text" class="gd-input" placeholder="监护人姓名" />
        </div>
        <div class="gd-field">
          <label class="gd-label">关系</label>
          <select v-model="ad.gd.form.relation" class="gd-input">
            <option>父母</option><option>子女</option><option>配偶</option>
            <option>兄弟姐妹</option><option>其他</option>
          </select>
        </div>
        <div class="gd-field">
          <label class="gd-label">手机号</label>
          <input v-model="ad.gd.form.phone" type="text" class="gd-input" placeholder="13xxxxxxxxx" />
        </div>
        <div class="gd-field">
          <label class="gd-label">邮箱</label>
          <input v-model="ad.gd.form.email" type="text" class="gd-input" placeholder="xxx@qq.com" />
        </div>
      </div>
      <div class="gd-field" style="margin-bottom:20px">
        <label class="gd-label">通知触发级别</label>
        <div class="gd-risk-row">
          <button
            v-for="lvl in ['medium', 'high', 'critical']"
            :key="lvl" type="button"
            class="gd-risk-chip"
            :class="{ active: ad.gd.form.notify_levels.includes(lvl) }"
            @click="ad.toggleFormLevel(lvl)"
          >{{ ws.riskLabel(lvl) }}+</button>
        </div>
      </div>
      <button class="btn btn-primary gd-save-btn" type="button" :disabled="ad.gd.saving" @click="ad.addGuardian">
        <span v-if="ad.gd.saving"><span class="spinner" style="width:14px;height:14px;border-width:2px"></span></span>
        <span v-else>＋ 保存监护人</span>
      </button>
    </div>

    <!-- 列表 -->
    <div v-if="ad.gd.loading" style="text-align:center;padding:32px"><span class="spinner"></span></div>
    <div v-else-if="!ad.gd.list.length" class="gd-empty">暂未设置监护人</div>
    <div v-for="g in ad.gd.list" v-else :key="String(g.id)" class="gd-card">
      <div class="gd-avatar">{{ String(g.name || '?')[0]?.toUpperCase() }}</div>
      <div class="gd-info">
        <div class="gd-name-row">
          <span class="gd-name">{{ g.name }}</span>
          <span class="gd-relation">{{ g.relation }}</span>
        </div>
        <div class="gd-contacts">
          <span v-if="g.phone" class="gd-contact-item">📱 {{ g.phone }}</span>
          <span v-if="g.email" class="gd-contact-item">📧 {{ g.email }}</span>
        </div>
        <div class="gd-badges">
          <span class="gd-badge gd-badge-email">📨 邮件通知</span>
          <span class="gd-badge" :class="(g.notify_levels as string[])?.includes('medium')   ? 'gd-badge-medium'   : 'gd-badge-off'">中风险</span>
          <span class="gd-badge" :class="(g.notify_levels as string[])?.includes('high')     ? 'gd-badge-high'     : 'gd-badge-off'">高风险</span>
          <span class="gd-badge" :class="(g.notify_levels as string[])?.includes('critical') ? 'gd-badge-critical' : 'gd-badge-off'">极高风险</span>
        </div>
        <div v-if="g.created_at" class="gd-time">添加于 {{ g.created_at }}</div>
      </div>
      <div class="gd-actions">
        <button class="btn btn-outline gd-action-btn" type="button" @click="ad.testNotify(String(g.id))">📤 测试通知</button>
        <button class="btn btn-outline gd-action-btn gd-action-warn" type="button"
          @click="ad.manualAlert({ id: String(g.id), name: String(g.name), email: String(g.email) })">🚨 发送预警</button>
        <button class="btn btn-outline gd-action-btn gd-action-del" type="button"
          @click="ad.removeGuardian(String(g.id))">🗑 删除</button>
      </div>
    </div>

    <!-- 预警弹窗 -->
    <div v-if="ws.showManualAlertModal" class="gd-modal-mask" @click.self="ws.showManualAlertModal = false">
      <div class="card gd-modal-box">
        <div class="gd-section-title" style="margin-bottom:12px">
          <span class="gd-section-bar" style="background:linear-gradient(180deg,#ef4444,#f97316)"></span>
          向监护人发送预警
        </div>
        <p class="gd-modal-target">{{ ws.manualAlertTarget?.name }}（{{ ws.manualAlertTarget?.email }}）</p>
        <textarea v-model="ws.manualAlertMsg" class="gd-textarea" placeholder="预警内容（可选，留空使用默认文案）"/>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-outline" type="button" @click="ws.showManualAlertModal = false">取消</button>
          <button class="btn btn-primary" type="button" :disabled="ws.manualAlertSending" @click="ad.sendManualAlert">
            {{ ws.manualAlertSending ? '发送中…' : '发送' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gd-toolbar {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 16px; padding: 12px 16px;
  background: var(--card2); border: 1px solid var(--border); border-radius: var(--r-md);
}
.gd-count { margin-left: auto; font-size: 13px; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
.gd-count strong { color: var(--blue); }

.gd-form-card { margin-bottom: 16px; }
.gd-section-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 18px;
}
.gd-section-bar {
  width: 3px; height: 16px; border-radius: 2px; flex-shrink: 0;
  background: linear-gradient(180deg, #6366f1, #3b82f6); display: inline-block;
}
.gd-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.gd-field { display: flex; flex-direction: column; gap: 6px; }
.gd-label { font-size: 11px; font-weight: 700; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; }
.gd-input {
  padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg2); color: var(--text); font-size: 14px;
  outline: none; transition: border-color .2s, box-shadow .2s; font-family: inherit;
}
.gd-input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }

.gd-risk-row { display: flex; gap: 8px; margin-top: 4px; }
.gd-risk-chip {
  padding: 7px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;
  border: 1.5px solid var(--border); background: transparent;
  color: var(--muted); cursor: pointer; transition: all .2s; font-family: inherit;
}
.gd-risk-chip:hover { border-color: var(--border2); color: var(--text); }
.gd-risk-chip.active { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.4); color: var(--blue); }

.gd-save-btn { width: 100%; justify-content: center; padding: 13px; font-size: 15px; font-weight: 700; border-radius: 10px; }
.gd-empty { text-align: center; color: var(--muted); padding: 40px; font-size: 15px; }

.gd-card {
  display: flex; align-items: flex-start; gap: 16px;
  padding: 20px 24px; margin-bottom: 12px;
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--r-lg); transition: border-color .2s, box-shadow .2s;
}
.gd-card:hover { border-color: var(--border2); box-shadow: 0 2px 16px rgba(99,102,241,0.08); }

.gd-avatar {
  width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700; color: #fff;
  box-shadow: 0 4px 14px rgba(99,102,241,0.3);
}
.gd-info { flex: 1; min-width: 0; }
.gd-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.gd-name { font-size: 17px; font-weight: 700; color: var(--text); }
.gd-relation {
  font-size: 12px; color: var(--muted); padding: 2px 10px;
  background: rgba(99,102,241,0.07); border-radius: 20px; border: 1px solid rgba(99,102,241,0.15);
}
.gd-contacts { display: flex; gap: 16px; margin-bottom: 8px; }
.gd-contact-item { font-size: 13px; color: var(--muted); }
.gd-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.gd-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid; }
.gd-badge-email    { background: rgba(14,165,233,0.08);  border-color: rgba(14,165,233,0.25);  color: #0ea5e9; }
.gd-badge-medium   { background: rgba(245,158,11,0.1);   border-color: rgba(245,158,11,0.3);   color: #d97706; }
.gd-badge-high     { background: rgba(239,68,68,0.08);   border-color: rgba(239,68,68,0.25);   color: #ef4444; }
.gd-badge-critical { background: rgba(127,29,29,0.1);    border-color: rgba(239,68,68,0.4);    color: #dc2626; }
.gd-badge-off      { background: rgba(99,102,241,0.04);  border-color: var(--border);           color: var(--dim); }
.gd-time { font-size: 11px; color: var(--dim); font-family: 'JetBrains Mono', monospace; }

.gd-actions { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
.gd-action-btn { font-size: 13px; padding: 8px 18px; white-space: nowrap; }
.gd-action-warn { background: rgba(239,68,68,0.07) !important; border-color: rgba(239,68,68,0.28) !important; color: var(--red) !important; }
.gd-action-del  { color: var(--red) !important; border-color: rgba(239,68,68,0.25) !important; }

.gd-modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 24px; }
.gd-modal-box { max-width: 420px; width: 100%; }
.gd-modal-target { font-size: 13px; color: var(--muted); margin-bottom: 12px; }
.gd-textarea {
  width: 100%; min-height: 100px; margin-bottom: 12px; padding: 10px 12px;
  border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg2); color: var(--text); font-size: 14px;
  font-family: inherit; outline: none; resize: vertical; transition: border-color .2s; box-sizing: border-box;
}
.gd-textarea:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
</style>