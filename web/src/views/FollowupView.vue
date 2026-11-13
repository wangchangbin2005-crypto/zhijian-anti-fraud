<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
const ws = useWorkspaceStore()
</script>

<template>
  <div>
    <div class="page-header" style="padding-right:170px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
        <RouterLink
          to="/app/detect"
          style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.18);font-size:12px;color:var(--blue);text-decoration:none;transition:all .2s"
        >← 返回检测</RouterLink>
        <div class="page-title" style="margin:0">💬 追问分析</div>
      </div>
      <div class="page-subtitle">基于检测结果深度追问 · 自由对话 · AI 实时解答</div>
    </div>
    <div class="card" style="display: flex; flex-direction: column; min-height: calc(100vh - 200px)">
      <div
        v-if="ws.followupContext"
        style="
          padding: 10px 14px;
          background: rgba(16, 185, 129, 0.06);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 13px;
          display:flex;align-items:center;gap:8px;
          padding-right: 180px;
        "
      >
        <span style="color: #6ee7b7; font-weight: 600">📌 基于检测结果追问：</span>
        <span style="color: var(--muted)">{{ ws.followupContext.riskLabel }} · {{ ws.followupContext.fraudType }}</span>
        <button
          type="button"
          style="margin-left:auto;background:none;border:none;color:var(--muted);cursor:pointer;font-size:12px;padding:2px 8px;border-radius:6px;transition:all .15s"
          @click="ws.followupContext = null; ws.followupMessages = []"
        >
          清除上下文
        </button>
      </div>
      <div
        id="followup-box"
        style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px"
      >
        <div
          v-if="!ws.followupMessages.length"
          style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--muted); padding: 40px; gap: 12px"
        >
          <div style="font-size: 40px">🤖</div>
          <div style="text-align: center; line-height: 1.8">有什么想追问的？</div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center">
            <button v-for="q in ws.followupQuickQ" :key="q" type="button" class="quick-btn" @click="ws.followupInput = q; ws.followupSend()">
              {{ q }}
            </button>
          </div>
        </div>
        <template v-for="(msg, i) in ws.followupMessages" :key="i">
          <div v-if="msg.role === 'user'" style="display: flex; justify-content: flex-end">
            <div
              style="
                max-width: 75%;
                background: var(--blue);
                color: #fff;
                border-radius: 16px 16px 4px 16px;
                padding: 12px 16px;
                font-size: 14px;
              "
            >
              {{ msg.content }}
              <div style="font-size: 11px; opacity: 0.6; margin-top: 4px; text-align: right">{{ msg.time }}</div>
            </div>
          </div>
          <div v-if="msg.role === 'assistant'" style="display: flex; justify-content: flex-start; gap: 10px">
            <div
              style="
                max-width: 80%;
                background: var(--card2);
                border: 1px solid var(--border);
                border-radius: 16px 16px 16px 4px;
                padding: 12px 16px;
                font-size: 14px;
                white-space: pre-wrap;
              "
            >
              {{ msg.content }}
              <div style="display: flex; gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border)">
                <button type="button" style="border: none; background: transparent; cursor: pointer" @click="ws.followupAction(msg, i, 'like')">👍</button>
                <button type="button" style="border: none; background: transparent; cursor: pointer" @click="ws.followupAction(msg, i, 'dislike')">👎</button>
                <button type="button" style="border: none; background: transparent; cursor: pointer" @click="ws.followupAction(msg, i, 'copy')">📋</button>
                <button type="button" style="border: none; background: transparent; cursor: pointer" @click="ws.followupAction(msg, i, 'retry')">🔄</button>
              </div>
            </div>
          </div>
        </template>
        <div v-if="ws.followupLoading" class="spinner" style="width: 14px; height: 14px"></div>
      </div>
      <div style="border-top: 1px solid var(--border); padding-top: 12px; display: flex; gap: 8px">
        <textarea
          v-model="ws.followupInput"
          :disabled="ws.followupLoading"
          style="flex: 1; min-height: 44px; resize: none; font-size: 14px; padding: 10px 12px"
          placeholder="输入问题…"
          @keydown="ws.followupKeydown"
        />
        <button type="button" class="btn btn-primary" style="height: 44px" :disabled="ws.followupLoading || !ws.followupInput.trim()" @click="ws.followupSend">
          发送
        </button>
        <button type="button" class="btn btn-outline" style="height: 44px" @click="ws.followupMessages = []; ws.followupContext = null">🗑</button>
      </div>
    </div>
  </div>
</template>