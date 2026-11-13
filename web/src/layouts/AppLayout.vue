<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAdminStore } from '@/stores/admin'

const auth = useAuthStore()
const admin = useAdminStore()
const route = useRoute()
const collapsed = ref(false)

function toggleSidebar() {
  collapsed.value = !collapsed.value
}

onMounted(() => {
  void admin.bootstrapAdminData()
})
</script>

<template>
  <div class="layout" :class="{ 'is-admin': auth.isAdmin, 'sidebar-collapsed': collapsed }">
    <aside class="sidebar">
      <!-- 顶部品牌色光条 -->
      <div class="sidebar-topbar"></div>

      <!-- 收缩按钮 -->
      <button class="collapse-btn" type="button" @click="toggleSidebar" :title="collapsed ? '展开' : '收起'">
        <span style="transition:transform .3s" :style="collapsed ? 'transform:rotate(180deg)' : ''">‹</span>
      </button>

      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon" style="background:none!important;box-shadow:none!important;padding:0!important">
            <img src="@/assets/logo.png" style="width:52px;height:52px;object-fit:contain" alt="智鉴"/>
          </div>
          <div class="logo-text">
            <div class="logo-title">智鉴</div>
          </div>
        </div>
      </div>

      <div class="sidebar-status">
        <div class="status-dot"></div>
        <span class="hide-when-collapsed">SYSTEM ONLINE</span>
      </div>

      <div class="sidebar-nav">
        <div class="role-badge">
          <span>{{ auth.isAdmin ? '🛡️' : '👤' }}</span>
          <span class="hide-when-collapsed">{{ auth.isAdmin ? ' 管理端' : ' 客户端' }}</span>
        </div>

        <!-- 客户端菜单 -->
        <template v-if="auth.isClient">
          <div class="nav-section-label hide-when-collapsed">检测分析</div>
          <RouterLink class="nav-item" active-class="active" to="/app/detect" :title="collapsed ? '实时检测' : ''"><span class="nav-icon">🔍</span><span class="nav-label"> 实时检测</span></RouterLink>
          <RouterLink class="nav-item" active-class="active" to="/app/history" :title="collapsed ? '历史记录' : ''"><span class="nav-icon">📋</span><span class="nav-label"> 历史记录</span></RouterLink>
          <RouterLink class="nav-item" active-class="active" to="/app/sessions" :title="collapsed ? '会话历史' : ''" @click="admin.loadSessions"><span class="nav-icon">🗂️</span><span class="nav-label"> 会话历史</span></RouterLink>
          <RouterLink class="nav-item" active-class="active" to="/app/learn" :title="collapsed ? '学习大厅' : ''"><span class="nav-icon">🎓</span><span class="nav-label"> 学习大厅</span></RouterLink>
          <div class="nav-section-label hide-when-collapsed" style="margin-top:8px">个人</div>
          <RouterLink class="nav-item" active-class="active" to="/app/profile" :title="collapsed ? '个人中心' : ''"><span class="nav-icon">👤</span><span class="nav-label"> 个人中心</span></RouterLink>
          <RouterLink class="nav-item" active-class="active" to="/app/subscribe" :title="collapsed ? '订阅推送' : ''" @click="admin.loadSubscription"><span class="nav-icon">📬</span><span class="nav-label"> 订阅推送</span></RouterLink>
          <RouterLink class="nav-item" active-class="active" to="/app/guardian" :title="collapsed ? '监护人' : ''" @click="admin.loadGuardians"><span class="nav-icon">👨‍👩‍👧</span><span class="nav-label"> 监护人</span></RouterLink>
          <RouterLink class="nav-item" active-class="active" to="/app/guide" :title="collapsed ? '使用指南' : ''"><span class="nav-icon">📖</span><span class="nav-label"> 使用指南</span></RouterLink>
          <RouterLink class="nav-item" active-class="active" to="/app/feedback" :title="collapsed ? '意见反馈' : ''"><span class="nav-icon">💬</span><span class="nav-label"> 意见反馈</span></RouterLink>
        </template>

        <!-- 管理端菜单 -->
        <template v-if="auth.isAdmin">
          <div class="nav-section-label hide-when-collapsed">知识系统</div>
          <RouterLink class="nav-item" active-class="active" to="/app/kb" :title="collapsed ? '知识库' : ''"><span class="nav-icon">🧠</span><span class="nav-label"> 知识库</span></RouterLink>
          <RouterLink class="nav-item" active-class="active" to="/app/evolution" :title="collapsed ? '进化状态' : ''"><span class="nav-icon">🧬</span><span class="nav-label"> 进化状态</span></RouterLink>
          <RouterLink class="nav-item" active-class="active" to="/app/eval" :title="collapsed ? '评估报告' : ''" @click="admin.loadEvalReport"><span class="nav-icon">📊</span><span class="nav-label"> 评估报告</span></RouterLink>
          <div class="nav-section-label hide-when-collapsed" style="margin-top:8px">数据分析</div>
          <RouterLink class="nav-item" active-class="active" to="/app/dashboard" :title="collapsed ? '数据看板' : ''" @click="admin.loadDashboard"><span class="nav-icon">📊</span><span class="nav-label"> 数据看板</span></RouterLink>
          <RouterLink class="nav-item" active-class="active" to="/app/mapscreen" :title="collapsed ? '地图大屏' : ''" @click="admin.loadMapScreen"><span class="nav-icon">🗺️</span><span class="nav-label"> 地图大屏</span></RouterLink>
          <RouterLink class="nav-item" active-class="active" to="/app/province" :title="collapsed ? '省份详情' : ''" @click="admin.loadMapScreen"><span class="nav-icon">📍</span><span class="nav-label"> 省份详情</span></RouterLink>
          <div class="nav-section-label hide-when-collapsed" style="margin-top:8px">用户 & 内容</div>
          <RouterLink class="nav-item" active-class="active" to="/app/users" :title="collapsed ? '用户管理' : ''"><span class="nav-icon">👥</span><span class="nav-label"> 用户管理</span></RouterLink>
          <RouterLink class="nav-item" active-class="active" to="/app/learn-admin" :title="collapsed ? '学习大厅管理' : ''"><span class="nav-icon">🎓</span><span class="nav-label"> 学习大厅管理</span></RouterLink>
          <div class="nav-section-label hide-when-collapsed" style="margin-top:8px">运营</div>
          <RouterLink class="nav-item" active-class="active" to="/app/user-feedbacks" :title="collapsed ? '用户反馈' : ''"><span class="nav-icon">💬</span><span class="nav-label"> 用户反馈</span></RouterLink>
          <div class="nav-section-label hide-when-collapsed" style="margin-top:8px">个人</div>
          <RouterLink class="nav-item" active-class="active" to="/app/profile" :title="collapsed ? '个人中心' : ''"><span class="nav-icon">👤</span><span class="nav-label"> 个人中心</span></RouterLink>
        </template>
      </div>

      <div class="sidebar-footer">
        <div class="user-info-bar">
          <div class="user-avatar">{{ auth.currentUser?.username?.[0]?.toUpperCase() }}</div>
          <div class="hide-when-collapsed">
            <div class="user-name">{{ auth.currentUser?.username }}</div>
            <div class="user-role">{{ auth.currentUser?.role }}</div>
          </div>
        </div>
        <button class="logout-btn" type="button" @click="auth.doLogout" :title="collapsed ? '退出登录' : ''">
          <span>🚪</span><span class="hide-when-collapsed"> 退出登录</span>
        </button>
        <div class="hide-when-collapsed" style="font-size:11px;color:var(--dim);margin-top:10px;font-family:'JetBrains Mono',monospace">
          96110 反诈热线
        </div>
      </div>
    </aside>

    <main class="main">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
/* ── 页面过渡 ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.nav-item { text-decoration: none; color: inherit; display: flex; }

/* ── 收缩按钮 ── */
.collapse-btn {
  position: absolute;
  top: 50%;
  right: -12px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(99,102,241,0.3);
  background: #fff;
  color: #6366f1;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  transition: all 0.2s;
  line-height: 1;
  padding: 0;
}
.collapse-btn:hover { background: #6366f1; color: #fff; }
.is-admin .collapse-btn {
  border-color: rgba(139,92,246,0.4);
  background: #1a1035;
  color: #a78bfa;
}
.is-admin .collapse-btn:hover { background: #7c3aed; color: #fff; }

/* ── 收缩状态 ── */
.sidebar-collapsed .sidebar {
  width: 56px !important;
  min-width: 56px !important;
  overflow: hidden;
}
.sidebar-collapsed .hide-when-collapsed { display: none !important; }
.sidebar-collapsed .nav-label { display: none !important; }
.sidebar-collapsed .logo-text { display: none !important; }
.sidebar-collapsed .sidebar-header { padding: 8px 0 !important; justify-content: center; display: flex; }
.sidebar-collapsed .sidebar-logo { justify-content: center; }
.sidebar-collapsed .sidebar-status { justify-content: center; padding: 2px 0; }
.sidebar-collapsed .sidebar-nav { padding: 4px !important; gap: 2px !important; }
.sidebar-collapsed .nav-section-label { display: none !important; }
.sidebar-collapsed .role-badge { margin: 0 2px 4px; padding: 4px 2px; }
.sidebar-collapsed .sidebar-footer { padding: 4px; align-items: center; }
.sidebar-collapsed .user-info-bar { padding: 4px 0; justify-content: center; }
.sidebar-collapsed .logout-btn { padding: 4px 0; justify-content: center; width: 100%; }
/* 覆盖 antifraud.css 里 padding:12px 14px */
.sidebar-collapsed :deep(.nav-item) {
  padding: 7px 0 !important;
  justify-content: center !important;
  gap: 0 !important;
}
.sidebar-collapsed :deep(.nav-item .nav-icon) {
  width: auto !important;
  font-size: 18px !important;
  margin: 0 !important;
}

/* ══════════════════════════════════════
   客户端：侧边栏保持原有亮白风格
══════════════════════════════════════ */
.sidebar {
  background: linear-gradient(180deg, #ffffff 0%, #f0f2ff 100%);
  transition: background 0.4s ease, width 0.3s ease, min-width 0.3s ease;
  position: relative;
}

/* 顶部光条 - 客户端蓝紫色 */
.sidebar-topbar {
  height: 3px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6, #0ea5e9);
}

/* 角色 badge - 客户端 */
.role-badge {
  margin: 0 4px 12px;
  padding: 8px 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.22);
  color: #6366f1;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ══════════════════════════════════════
   管理端：侧边栏换成深紫暗色
══════════════════════════════════════ */
.is-admin .sidebar {
  background: linear-gradient(180deg, #1a1035 0%, #150d2e 50%, #1c0f3a 100%);
  border-right-color: rgba(139, 92, 246, 0.25);
}

/* 管理端顶部光条 - 深紫渐变 */
.is-admin .sidebar-topbar {
  background: linear-gradient(90deg, #4c1d95, #7c3aed, #a855f7, #c084fc);
}

/* 管理端 logo 文字颜色 */
.is-admin :deep(.logo-title) { color: #ede9fe; }
.is-admin :deep(.logo-sub)   { color: #a78bfa; }

/* 管理端 SYSTEM ONLINE */
.is-admin .sidebar-status { color: #a78bfa; }
.is-admin .status-dot {
  background: #a78bfa !important;
  box-shadow: 0 0 8px rgba(167, 139, 250, 0.5) !important;
}

/* 管理端侧边栏右侧竖线 */
.is-admin .sidebar::after {
  background: linear-gradient(180deg, transparent, #7c3aed 40%, #a855f7 60%, transparent);
}

/* 管理端 section label */
.is-admin .nav-section-label { color: #7c65c0; }

/* 管理端 nav-item 默认态 */
.is-admin .nav-item { color: #b8aee0; }
.is-admin .nav-item:hover {
  background: rgba(139, 92, 246, 0.12);
  color: #ede9fe;
  border-color: rgba(139, 92, 246, 0.25);
}

/* 管理端 nav-item 激活态 */
.is-admin .nav-item.active {
  background: linear-gradient(135deg, rgba(109, 40, 217, 0.35), rgba(139, 92, 246, 0.18)) !important;
  color: #c4b5fd !important;
  border-color: rgba(139, 92, 246, 0.45) !important;
  box-shadow: inset 0 0 20px rgba(139, 92, 246, 0.08) !important;
}
.is-admin .nav-item.active::before {
  background: #8b5cf6 !important;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.5) !important;
}

/* 管理端角色 badge */
.is-admin .role-badge {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.35);
  color: #c4b5fd;
}

/* 管理端 logo icon */
.is-admin .logo-icon {
  background: linear-gradient(135deg, #4c1d95, #7c3aed) !important;
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.4) !important;
}

/* 管理端用户信息栏 */
.is-admin .user-info-bar {
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.18);
}
.is-admin .user-name { color: #ede9fe; }
.is-admin .user-role { color: #a78bfa; }
.is-admin .user-avatar {
  background: linear-gradient(135deg, #4c1d95, #7c3aed) !important;
}

/* 管理端页脚文字 */
.is-admin .sidebar-footer { border-top-color: rgba(139, 92, 246, 0.15); }
.is-admin .sidebar-footer > div:last-child { color: #6d5fa0 !important; }

/* 管理端退出按钮 */
.is-admin .logout-btn {
  border-color: rgba(239, 68, 68, 0.25);
  color: #f87171;
  background: rgba(239, 68, 68, 0.05);
}

/* ══════════════════════════════════════
   客户端：侧边栏保持原有亮白风格
══════════════════════════════════════ */
.sidebar {
  background: linear-gradient(180deg, #ffffff 0%, #f0f2ff 100%);
  transition: background 0.4s ease;
}

/* 顶部光条 - 客户端蓝紫色 */
.sidebar-topbar {
  height: 3px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6, #0ea5e9);
}

/* 角色 badge - 客户端 */
.role-badge {
  margin: 0 4px 12px;
  padding: 8px 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.22);
  color: #6366f1;
  transition: all 0.3s;
}

/* ══════════════════════════════════════
   管理端：侧边栏换成深紫暗色
══════════════════════════════════════ */
.is-admin .sidebar {
  background: linear-gradient(180deg, #1a1035 0%, #150d2e 50%, #1c0f3a 100%);
  border-right-color: rgba(139, 92, 246, 0.25);
}

/* 管理端顶部光条 - 深紫渐变 */
.is-admin .sidebar-topbar {
  background: linear-gradient(90deg, #4c1d95, #7c3aed, #a855f7, #c084fc);
}

/* 管理端 logo 文字颜色 */
.is-admin :deep(.logo-title) { color: #ede9fe; }
.is-admin :deep(.logo-sub)   { color: #a78bfa; }

/* 管理端 SYSTEM ONLINE */
.is-admin .sidebar-status { color: #a78bfa; }
.is-admin .status-dot {
  background: #a78bfa !important;
  box-shadow: 0 0 8px rgba(167, 139, 250, 0.5) !important;
}

/* 管理端侧边栏右侧竖线 */
.is-admin .sidebar::after {
  background: linear-gradient(180deg, transparent, #7c3aed 40%, #a855f7 60%, transparent);
}

/* 管理端 section label */
.is-admin .nav-section-label { color: #7c65c0; }

/* 管理端 nav-item 默认态 */
.is-admin .nav-item { color: #b8aee0; }
.is-admin .nav-item:hover {
  background: rgba(139, 92, 246, 0.12);
  color: #ede9fe;
  border-color: rgba(139, 92, 246, 0.25);
}

/* 管理端 nav-item 激活态 */
.is-admin .nav-item.active {
  background: linear-gradient(135deg, rgba(109, 40, 217, 0.35), rgba(139, 92, 246, 0.18)) !important;
  color: #c4b5fd !important;
  border-color: rgba(139, 92, 246, 0.45) !important;
  box-shadow: inset 0 0 20px rgba(139, 92, 246, 0.08) !important;
}
.is-admin .nav-item.active::before {
  background: #8b5cf6 !important;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.5) !important;
}

/* 管理端角色 badge */
.is-admin .role-badge {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.35);
  color: #c4b5fd;
}

/* 管理端 logo icon */
.is-admin .logo-icon {
  background: linear-gradient(135deg, #4c1d95, #7c3aed) !important;
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.4) !important;
}

/* 管理端用户信息栏 */
.is-admin .user-info-bar {
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.18);
}
.is-admin .user-name { color: #ede9fe; }
.is-admin .user-role { color: #a78bfa; }
.is-admin .user-avatar {
  background: linear-gradient(135deg, #4c1d95, #7c3aed) !important;
}

/* 管理端页脚文字 */
.is-admin .sidebar-footer { border-top-color: rgba(139, 92, 246, 0.15); }
.is-admin .sidebar-footer > div:last-child { color: #6d5fa0 !important; }

/* 管理端退出按钮 */
.is-admin .logout-btn {
  border-color: rgba(239, 68, 68, 0.25);
  color: #f87171;
  background: rgba(239, 68, 68, 0.05);
}
</style>