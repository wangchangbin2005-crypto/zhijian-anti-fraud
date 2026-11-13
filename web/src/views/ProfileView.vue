<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const auth = useAuthStore()
const ws = useWorkspaceStore()

const identityLabel: Record<string, string> = {
  elder: '老年人', student: '学生', adult: '普通成人', financial: '财务/金融人员', other: '其他',
}
const identityIcon: Record<string, string> = {
  elder: '👴', student: '🎓', adult: '👤', financial: '💼', other: '👤',
}

const securityScore = computed(() => {
  const total = ws.stats.total
  if (total === 0) return 82
  const rate = ws.stats.safe / total
  return Math.min(99, Math.round(70 + rate * 29))
})

const scoreColor = computed(() => {
  const s = securityScore.value
  if (s >= 90) return '#22c55e'
  if (s >= 75) return '#3b82f6'
  return '#f59e0b'
})

const scoreLabel = computed(() => {
  const s = securityScore.value
  if (s >= 90) return '防骗高手'
  if (s >= 75) return '安全意识良好'
  return '需要提升'
})

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
}

</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">个人信息中心</div>
      <div class="page-subtitle">账号信息 · 安全评分 · 使用记录 · 防骗档案</div>
    </div>

    <!-- 顶部：用户卡 + 安全评分 -->
    <div style="display:grid;grid-template-columns:1fr 260px;gap:16px;margin-bottom:16px;min-width:0">

      <!-- 用户卡 -->
      <div class="card" style="position:relative;overflow:hidden;padding:40px 36px;height:100%;box-sizing:border-box">
        <div style="position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,0.1),transparent 70%);pointer-events:none"></div>
        <div style="position:absolute;bottom:-40px;left:40px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(14,165,233,0.07),transparent 70%);pointer-events:none"></div>

        <div style="display:flex;align-items:flex-start;gap:24px;position:relative">
          <!-- ① 头像：在线徽章移到头像正下方，不再 absolute 贴角，改为下方独立行 -->
          <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:8px">
            <div style="width:88px;height:88px;border-radius:24px;background:linear-gradient(135deg,#312e81,#1d4ed8,#0369a1);display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:900;color:#fff;box-shadow:0 8px 32px rgba(99,102,241,0.35),0 0 0 3px rgba(99,102,241,0.2)">
              {{ auth.currentUser?.username?.[0]?.toUpperCase() }}
            </div>
            <div style="display:inline-flex;align-items:center;gap:4px;background:rgba(34,197,94,0.12);border:1.5px solid rgba(34,197,94,0.4);border-radius:20px;padding:3px 10px">
              <span style="width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px #22c55e;display:inline-block;flex-shrink:0" class="pulse-dot"></span>
              <span style="font-size:10px;color:#22c55e;font-weight:700;white-space:nowrap">在线</span>
            </div>
          </div>

          <!-- 信息 -->
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:12px">
            <!-- 用户名 + 角色 -->
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap">
                <div style="font-size:28px;font-weight:900;color:var(--text, #f1f5f9);letter-spacing:-0.5px;text-shadow:0 1px 4px rgba(0,0,0,0.3)">{{ auth.currentUser?.username }}</div>
                <span style="padding:3px 14px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:1px"
                  :style="auth.isAdmin
                    ? 'background:rgba(99,102,241,0.12);color:#6366f1;border:1.5px solid rgba(99,102,241,0.3)'
                    : 'background:rgba(59,130,246,0.1);color:#3b82f6;border:1.5px solid rgba(59,130,246,0.25)'">
                  {{ auth.isAdmin ? '⬡ 管理员' : '◈ 用户' }}
                </span>
              </div>
              <div style="font-size:14px;color:var(--muted);line-height:1.8">
                {{ auth.isAdmin ? '🛡️ 系统管理端' : '🔒 客户端用户' }}
                <span v-if="auth.currentUser?.identity"> · {{ identityIcon[auth.currentUser.identity] }} {{ identityLabel[auth.currentUser.identity] }}</span>
                <span v-if="auth.currentUser?.age"> · {{ auth.currentUser.age }}岁</span>
              </div>
            </div>

            <!-- 状态卡片（铺满空白） -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:8px">
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:14px 12px;border-radius:14px;background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15)">
                <span style="font-size:28px">👤</span>
                <span style="font-size:14px;font-weight:700;color:var(--muted)">{{ auth.isAdmin ? '管理端' : '客户端' }}</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:14px 12px;border-radius:14px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2)">
                <span style="width:12px;height:12px;border-radius:50%;background:#22c55e;box-shadow:0 0 10px #22c55e;display:inline-block" class="pulse-dot"></span>
                <span style="font-size:14px;font-weight:700;color:#22c55e">已登录</span>
              </div>
              <div v-if="auth.currentUser?.username"
                style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:14px 12px;border-radius:14px;background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.15);cursor:pointer"
                @click="copyToClipboard(auth.currentUser!.username)" title="点击复制">
                <span style="font-size:28px">📋</span>
                <span style="font-size:14px;font-weight:700;color:var(--cyan)">{{ auth.currentUser.username }}</span>
              </div>
            </div>


          </div>
        </div>
      </div>

      <!-- 安全评分仪表盘 -->
      <div class="card" style="position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center">
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(99,102,241,0.07),transparent 70%);pointer-events:none"></div>
        <div style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:16px">防骗安全评分</div>

        <div style="position:relative;width:140px;height:140px;margin-bottom:12px">
          <svg viewBox="0 0 140 140" style="width:140px;height:140px;transform:rotate(-90deg)">
            <circle cx="70" cy="70" r="56" fill="none" stroke="rgba(99,102,241,0.1)" stroke-width="10"/>
            <circle cx="70" cy="70" r="56" fill="none" :stroke="scoreColor" stroke-width="10" stroke-linecap="round"
              :stroke-dasharray="`${securityScore / 100 * 352} 352`" style="transition:stroke-dasharray 1s ease"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div style="font-size:36px;font-weight:900;font-family:'JetBrains Mono',monospace;line-height:1" :style="{ color: scoreColor }">{{ securityScore }}</div>
            <div style="font-size:10px;color:var(--dim);margin-top:2px">/ 100</div>
          </div>
        </div>

        <div style="font-size:15px;font-weight:800;margin-bottom:4px" :style="{ color: scoreColor }">{{ scoreLabel }}</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6">基于检测记录综合评估</div>
        <div style="margin-top:14px;padding:6px 20px;border-radius:20px;font-size:12px;font-weight:700"
          :style="`background:${scoreColor}15;color:${scoreColor};border:1.5px solid ${scoreColor}35`">
          {{ securityScore >= 90 ? '🏆 反诈达人' : securityScore >= 75 ? '🛡️ 安全卫士' : '📚 学习进行中' }}
        </div>
      </div>
    </div>

    <!-- 统计数据 -->
    <div v-if="auth.isClient" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px">
      <div v-for="item in [
        { val: ws.stats.total, label: '累计检测次数', icon: '🔍', color: '#3b82f6', bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.15)' },
        { val: ws.stats.flagged, label: '风险内容拦截', icon: '🚨', color: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.15)' },
        { val: ws.stats.safe, label: '安全内容通过', icon: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.07)', border: 'rgba(34,197,94,0.15)' },
        { val: ws.stats.guardian, label: '监护人通知', icon: '🔔', color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.15)' },
      ]" :key="item.label"
        style="padding:20px 16px;border-radius:14px;border:1px solid;position:relative;overflow:hidden;transition:transform .2s,box-shadow .2s;cursor:default"
        :style="{ background: item.bg, borderColor: item.border }"
        @mouseenter="($event.currentTarget as HTMLElement).style.transform='translateY(-3px)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.transform=''">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <span style="font-size:26px">{{ item.icon }}</span>
        </div>
        <div style="font-size:36px;font-weight:900;font-family:'JetBrains Mono',monospace;line-height:1;margin-bottom:6px" :style="{ color: item.color }">{{ item.val }}</div>
        <div style="font-size:12px;color:var(--muted)">{{ item.label }}</div>
      </div>
    </div>

    <div v-if="auth.isAdmin" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px">
      <div v-for="item in [
        { val: '在线', label: '系统状态', icon: '⚡', color: '#22c55e', bg: 'rgba(34,197,94,0.07)', border: 'rgba(34,197,94,0.15)' },
        { val: 'v2.0', label: '系统版本', icon: '🚀', color: '#3b82f6', bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.15)' },
        { val: '96110', label: '反诈热线', icon: '📞', color: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.15)' },
        { val: '10种', label: '覆盖诈骗类型', icon: '🗂️', color: '#8b5cf6', bg: 'rgba(139,92,246,0.07)', border: 'rgba(139,92,246,0.15)' },
      ]" :key="item.label"
        style="padding:20px 16px;border-radius:14px;border:1px solid;transition:transform .2s"
        :style="{ background: item.bg, borderColor: item.border }"
        @mouseenter="($event.currentTarget as HTMLElement).style.transform='translateY(-3px)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.transform=''">
        <div style="font-size:26px;margin-bottom:10px">{{ item.icon }}</div>
        <div style="font-size:28px;font-weight:900;font-family:'JetBrains Mono',monospace;line-height:1;margin-bottom:6px" :style="{ color: item.color }">{{ item.val }}</div>
        <div style="font-size:12px;color:var(--muted)">{{ item.label }}</div>
      </div>
    </div>

    <!-- 客户端：防骗活动记录全宽 2列网格 -->
    <div v-if="auth.isClient">
      <div class="card">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:18px">
          <span style="width:3px;height:16px;background:linear-gradient(180deg,#6366f1,#3b82f6);border-radius:2px;display:inline-block"></span>
          <span style="font-size:13px;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase">防骗活动记录</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
          <div v-for="(item, i) in [
            { icon:'🔍', text:`累计完成 ${ws.stats.total} 次智能检测`, sub:'持续保护中', color:'#3b82f6', bg:'rgba(59,130,246,0.06)', border:'rgba(59,130,246,0.15)' },
            { icon:'🚨', text:`成功拦截 ${ws.stats.flagged} 次风险`, sub:'已保护资产安全', color:'#ef4444', bg:'rgba(239,68,68,0.06)', border:'rgba(239,68,68,0.15)' },
            { icon:'✅', text:`${ws.stats.safe} 次内容安全验证通过`, sub:'清朗网络环境', color:'#22c55e', bg:'rgba(34,197,94,0.06)', border:'rgba(34,197,94,0.15)' },
            { icon:'🔔', text:`触发监护人通知 ${ws.stats.guardian} 次`, sub:'家人守护在线', color:'#f59e0b', bg:'rgba(245,158,11,0.06)', border:'rgba(245,158,11,0.15)' },
          ]" :key="i"
            style="display:flex;align-items:flex-start;gap:14px;padding:14px;border-radius:12px;border:1px solid;transition:transform .2s"
            :style="{ background: item.bg, borderColor: item.border }"
            @mouseenter="($event.currentTarget as HTMLElement).style.transform='translateY(-2px)'"
            @mouseleave="($event.currentTarget as HTMLElement).style.transform=''">
            <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px"
              :style="{ background: item.bg, border: `1.5px solid ${item.border}` }">{{ item.icon }}</div>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:3px">{{ item.text }}</div>
              <div style="font-size:11px;" :style="{ color: item.color }">{{ item.sub }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pulse-dot {
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px #22c55e; }
  50% { opacity: 0.5; box-shadow: 0 0 2px #22c55e; }
}
</style>