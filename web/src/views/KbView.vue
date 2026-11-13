<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAdminStore } from '@/stores/admin'

const ad = useAdminStore()
const { kb } = storeToRefs(ad)
const topMindmapTypes = computed(() => {
  const map = new Map<string, number>()
  for (const c of kb.value.cases as any[]) {
    const t = String(c.type || '未知类型')
    map.set(t, (map.get(t) || 0) + 1)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
})

onMounted(() => {
  void ad.loadKbCases()
})

function onMindmapBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) kb.value.showTree = false
}

// 多模态上传
type MediaTab = 'image' | 'audio' | 'video' | 'screen'
const activeMediaTab = ref<MediaTab>('image')
const uploadedFiles = ref<File[]>([])
const isDragging = ref(false)

const tabConfig: Record<MediaTab, { label: string; hint: string; types: string; accept: string }> = {
  image:  { label: '图片', hint: '图片',  types: '支持 JPG、PNG、WEBP，单文件不超过 20MB', accept: 'image/*' },
  audio:  { label: '音频', hint: '音频',  types: '支持 MP3、WAV、M4A，单文件不超过 50MB', accept: 'audio/*' },
  video:  { label: '视频', hint: '视频',  types: '支持 MP4、MOV、AVI，单文件不超过 200MB', accept: 'video/*' },
  screen: { label: '截图', hint: '截图',  types: '支持 JPG、PNG，可上传多张对话截图', accept: 'image/*' },
}

function triggerFileInput() {
  const inp = document.createElement('input')
  inp.type = 'file'
  inp.accept = tabConfig[activeMediaTab.value].accept
  inp.multiple = true
  inp.onchange = (e) => {
    const files = (e.target as HTMLInputElement).files
    if (files) uploadedFiles.value.push(...Array.from(files))
  }
  inp.click()
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files) uploadedFiles.value.push(...Array.from(files))
}

function removeFile(i: number) {
  uploadedFiles.value.splice(i, 1)
}

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return Math.round(bytes / 1024) + ' KB'
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">反诈知识库</div>
      <div class="page-subtitle">基于官方数据构建的向量知识库</div>
    </div>

    <!-- 统计卡片 -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      <div v-for="item in [
        { val: kb.cases.length, label: '案例总数', color: '#93c5fd', bg: 'rgba(59,130,246,0.08)', icon: '📚', border: 'rgba(59,130,246,0.2)' },
        { val: ad.kbTypeCount, label: '覆盖类型', color: '#a78bfa', bg: 'rgba(139,92,246,0.08)', icon: '🏷️', border: 'rgba(139,92,246,0.2)' },
        { val: ad.kbManualCount, label: '手动添加', color: '#34d399', bg: 'rgba(16,185,129,0.08)', icon: '✍️', border: 'rgba(16,185,129,0.2)' },
        { val: ad.kbAutoCount, label: '自动采集', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', icon: '🤖', border: 'rgba(245,158,11,0.2)' },
      ]" :key="item.label"
        style="padding:20px;border-radius:14px;border:1px solid;text-align:center;position:relative;overflow:hidden;transition:transform .2s"
        :style="{ background: item.bg, borderColor: item.border }"
        @mouseenter="($event.currentTarget as HTMLElement).style.transform='translateY(-2px)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.transform=''">
        <div style="font-size:24px;margin-bottom:8px">{{ item.icon }}</div>
        <div style="font-size:40px;font-weight:800;font-family:'JetBrains Mono',monospace;line-height:1;margin-bottom:6px"
          :style="{ color: item.color }">{{ item.val }}</div>
        <div style="font-size:12px;color:var(--muted);font-weight:500">{{ item.label }}</div>
      </div>
    </div>

    <!-- 分支图按钮 -->
    <div style="margin-bottom:16px">
      <button class="btn btn-primary" type="button" @click="kb.showTree = true"
        style="padding:10px 24px;font-weight:700;letter-spacing:0.5px;background:linear-gradient(135deg,#1d4ed8,#7c3aed);border:none;box-shadow:0 4px 16px rgba(99,102,241,0.3)">
        🌿 查看知识分支图
      </button>
      <span style="font-size:13px;color:var(--muted);margin-left:12px">按诈骗类型分类展示所有案例</span>
    </div>

    <!-- 搜索卡片 -->
    <div class="card" style="margin-bottom:16px;position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#6366f1,#3b82f6,#06b6d4)"></div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px">
        <span style="width:3px;height:16px;background:linear-gradient(180deg,#3b82f6,#06b6d4);border-radius:2px;display:inline-block"></span>
        <span style="font-size:13px;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase">相似案例搜索</span>
      </div>
      <textarea v-model="kb.searchQuery"
        placeholder="输入可疑文本，搜索最相似案例..."
        style="min-height:70px;margin-bottom:10px;font-size:14px;resize:vertical" />
      <button class="btn btn-primary" type="button"
        :disabled="kb.searchLoading || !kb.searchQuery.trim()"
        style="width:100%;justify-content:center;margin-bottom:12px;padding:10px;font-weight:700"
        @click="ad.kbSearch">
        <span v-if="kb.searchLoading" style="display:flex;align-items:center;gap:8px"><span class="spinner"></span> 搜索中...</span>
        <span v-else>🔍 搜索相似案例</span>
      </button>
      <div v-for="r in (kb.searchResults as any[])" :key="String(r.id)"
        style="border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:8px;transition:all .15s"
        @mouseenter="($event.currentTarget as HTMLElement).style.borderColor='rgba(99,102,241,0.4)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.borderColor='var(--border)'">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700"
            :style="{ background: ad.kbTypeColor(String(r.type))+'22', color: ad.kbTypeColor(String(r.type)) }">
            {{ r.type }}
          </span>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:60px;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden">
              <div style="height:100%;border-radius:2px;transition:width .4s"
                :style="{
                  width: (r.similarity||0)*100+'%',
                  background: (r.similarity||0)>0.7 ? '#ef4444' : (r.similarity||0)>0.4 ? '#f59e0b' : '#22c55e'
                }"></div>
            </div>
            <span style="font-size:18px;font-weight:800;font-family:'JetBrains Mono',monospace;color:#93c5fd">
              {{ Math.round((r.similarity||0)*100) }}%
            </span>
          </div>
        </div>
        <div style="font-size:13px;color:var(--muted);line-height:1.6">{{ r.summary }}</div>
      </div>
    </div>

    <!-- 案例列表 + 添加 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <!-- 案例列表 -->
      <div class="card">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px">
          <span style="width:3px;height:16px;background:linear-gradient(180deg,#f59e0b,#ef4444);border-radius:2px;display:inline-block"></span>
          <span style="font-size:13px;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase">案例列表</span>
          <input v-model="kb.filterType" type="text" placeholder="筛选类型..."
            style="margin-left:auto;width:110px;padding:4px 10px;font-size:12px;border-radius:6px" />
        </div>
        <div class="scroll-list" style="max-height:460px;overflow-y:auto">
          <div v-if="!ad.kbFilteredCases.length" style="text-align:center;color:var(--muted);padding:32px;font-size:14px">
            <div style="font-size:36px;margin-bottom:8px;opacity:0.3">📭</div>
            暂无案例
          </div>
          <div v-for="c in ad.kbFilteredCases" :key="String((c as any).id)"
            class="kb-case"
            :class="{ active: kb.selectedCase && (kb.selectedCase as any).id === (c as any).id }"
            style="padding:12px;border-radius:10px;cursor:pointer;margin-bottom:6px;border:1px solid rgba(255,255,255,0.04);transition:all .15s"
            @click="kb.selectedCase = c"
            @mouseenter="($event.currentTarget as HTMLElement).style.background='rgba(99,102,241,0.08)'"
            @mouseleave="($event.currentTarget as HTMLElement).style.background=''">
            <span style="padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:6px"
              :style="{ background: ad.kbTypeColor(String((c as any).type))+'22', color: ad.kbTypeColor(String((c as any).type)) }">
              {{ (c as any).type }}
            </span>
            <div style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:6px">{{ (c as any).summary }}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              <span v-for="kw in String((c as any).keywords||'').split(' ').slice(0,4).filter(Boolean)" :key="kw"
                class="kw-tag" style="font-size:10px;padding:2px 7px;border-radius:8px;background:rgba(99,102,241,0.1);color:#93c5fd;border:1px solid rgba(99,102,241,0.2)">
                {{ kw }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 添加新案例 -->
      <div class="card" style="position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#22c55e,#06b6d4)"></div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:16px">
          <span style="width:3px;height:16px;background:linear-gradient(180deg,#22c55e,#06b6d4);border-radius:2px;display:inline-block"></span>
          <span style="font-size:13px;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase">添加新案例</span>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px;font-weight:600">诈骗类型</div>
        <select v-model="kb.newCase.fraud_type" style="width:100%;margin-bottom:14px;padding:8px 12px;border-radius:8px">
          <option v-for="t in kb.fraudTypes" :key="t">{{ t }}</option>
        </select>
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px;font-weight:600">案例摘要</div>
        <textarea v-model="kb.newCase.summary" placeholder="简要描述诈骗经过..."
          style="min-height:80px;margin-bottom:14px;font-size:13px;resize:vertical" />
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px;font-weight:600">关键词（空格分隔）</div>
        <input v-model="kb.newCase.keywords" type="text" placeholder="例：转账 安全账户 警察"
          style="width:100%;margin-bottom:16px;padding:8px 12px;border-radius:8px" />

        <!-- 多模态上传 -->
        <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:14px"></div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:600">
          多模态素材上传 <span style="font-weight:400;opacity:0.6">（可选）</span>
        </div>

        <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
          <button
            v-for="(cfg, key) in tabConfig" :key="key"
            type="button"
            style="padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;transition:all .15s;border:1px solid"
            :style="activeMediaTab === key
              ? 'background:rgba(99,102,241,0.18);color:#93c5fd;border-color:rgba(99,102,241,0.5)'
              : 'background:transparent;color:var(--muted);border-color:var(--border)'"
            @click="activeMediaTab = key as MediaTab">
            {{ cfg.label }}
          </button>
        </div>

        <div
          style="border:1.5px dashed;border-radius:10px;padding:18px;text-align:center;cursor:pointer;transition:all .15s;margin-bottom:8px"
          :style="isDragging
            ? 'border-color:#93c5fd;background:rgba(99,102,241,0.1)'
            : 'border-color:var(--border);background:rgba(255,255,255,0.02)'"
          @click="triggerFileInput"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="onDrop">
          <div style="font-size:22px;margin-bottom:6px">⬆️</div>
          <div style="font-size:13px;color:var(--muted)">
            点击或拖拽上传
            <span style="color:#93c5fd">{{ tabConfig[activeMediaTab].hint }}</span>
            文件
          </div>
          <div style="font-size:11px;color:var(--muted);opacity:0.5;margin-top:4px">
            {{ tabConfig[activeMediaTab].types }}
          </div>
        </div>

        <div v-for="(f, i) in uploadedFiles" :key="i"
          style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;border:1px solid var(--border);margin-bottom:6px;font-size:12px">
          <span style="font-size:14px">{{ f.type.startsWith('audio') ? '🎵' : f.type.startsWith('video') ? '🎬' : '🖼️' }}</span>
          <span style="flex:1;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ f.name }}</span>
          <span style="color:var(--muted);opacity:0.5;flex-shrink:0">{{ formatSize(f.size) }}</span>
          <button type="button"
            style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:15px;padding:0 2px;line-height:1;opacity:0.6"
            @click="removeFile(i)">×</button>
        </div>

        <div style="margin-bottom:14px"></div>
        <button class="btn btn-primary" type="button" :disabled="kb.addLoading"
          style="width:100%;justify-content:center;padding:11px;font-weight:700;background:linear-gradient(135deg,#065f46,#047857);border:1px solid rgba(16,185,129,0.3);box-shadow:0 4px 14px rgba(16,185,129,0.2)"
          @click="ad.kbAddCase">
          <span v-if="kb.addLoading" style="display:flex;align-items:center;gap:8px"><span class="spinner"></span> 添加中...</span>
          <span v-else>➕ 添加到知识库</span>
        </button>
      </div>
    </div>

    <!-- 知识分支图弹窗 -->
    <Teleport to="body">
      <div v-if="kb.showTree"
        style="position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1001;display:flex;flex-direction:column;backdrop-filter:blur(6px)"
        @click="onMindmapBackdropClick">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 28px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;background:rgba(6,9,20,0.6)">
          <div style="display:flex;align-items:center;gap:14px">
            <span style="font-size:20px;font-weight:700;color:#fff">🌿 反诈知识分支图</span>
            <span style="font-size:12px;color:#cbd5e1;font-family:'JetBrains Mono',monospace;padding:3px 10px;background:rgba(148,163,184,0.14);border-radius:20px;border:1px solid rgba(148,163,184,0.26)">
              {{ kb.cases.length }} 案例 · {{ ad.kbTypeCount }} 类型
            </span>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <span style="font-size:12px;color:#cbd5e1">点击节点查看案例</span>
            <button class="btn btn-outline" type="button" @click="kb.showTree = false" style="padding:6px 16px">✕ 关闭</button>
          </div>
        </div>
        <div style="flex:1;position:relative;min-height:0">
          <canvas id="mindmap-canvas" style="width:100%;height:100%;cursor:pointer" />
          <div
            style="position:absolute;left:20px;top:20px;width:260px;background:linear-gradient(180deg,rgba(15,23,42,0.9),rgba(30,41,59,0.88));border:1px solid rgba(148,163,184,0.28);border-radius:16px;padding:14px;box-shadow:0 10px 34px rgba(2,6,23,0.45);backdrop-filter:blur(6px)"
          >
            <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:10px">🧭 分支导航</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
              <span style="font-size:11px;color:#cbd5e1;padding:3px 8px;border-radius:999px;border:1px solid rgba(148,163,184,0.28);background:rgba(148,163,184,0.12)">
                点击节点查看详情
              </span>
              <span style="font-size:11px;color:#cbd5e1;padding:3px 8px;border-radius:999px;border:1px solid rgba(148,163,184,0.28);background:rgba(148,163,184,0.12)">
                颜色代表诈骗类型
              </span>
            </div>
            <div style="height:1px;background:rgba(148,163,184,0.22);margin:10px 0 12px"></div>
            <div style="font-size:12px;font-weight:700;color:#dbeafe;margin-bottom:8px">TOP 类型</div>
            <div v-for="([type, count], i) in topMindmapTypes" :key="type"
              style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;margin-bottom:5px;background:rgba(51,65,85,0.55);border:1px solid rgba(148,163,184,0.14)">
              <span style="width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0"
                :style="{ background: ad.kbTypeColor(type), boxShadow: `0 0 8px ${ad.kbTypeColor(type)}` }"></span>
              <span style="font-size:12px;color:#e2e8f0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ type }}</span>
              <span style="font-size:11px;color:#93c5fd;font-family:'JetBrains Mono',monospace">#{{ i + 1 }} · {{ count }}</span>
            </div>
          </div>
          <div v-if="kb.mindmapSelected"
            style="position:absolute;right:20px;top:20px;width:340px;background:linear-gradient(180deg,rgba(15,23,42,0.95),rgba(30,41,59,0.93));border:1px solid rgba(148,163,184,0.32);border-radius:16px;padding:20px;box-shadow:0 14px 44px rgba(2,6,23,0.6);max-height:calc(100% - 40px);overflow-y:auto">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
              <span style="width:12px;height:12px;border-radius:50%;flex-shrink:0;display:inline-block"
                :style="{ background: ad.kbTypeColor(kb.mindmapSelected), boxShadow: '0 0 8px '+ad.kbTypeColor(kb.mindmapSelected) }"></span>
              <span style="font-size:15px;font-weight:700;color:#f8fafc">{{ kb.mindmapSelected }}</span>
              <button type="button" style="margin-left:auto;background:transparent;border:none;color:#cbd5e1;cursor:pointer;font-size:16px;padding:2px 6px"
                @click="kb.mindmapSelected = null">✕</button>
            </div>
            <div style="font-size:12px;color:#cbd5e1;margin-bottom:12px;padding:6px 12px;background:rgba(148,163,184,0.16);border:1px solid rgba(148,163,184,0.28);border-radius:8px">
              共 {{ kb.cases.filter((c: any) => c.type === kb.mindmapSelected).length }} 条案例
            </div>
            <div v-for="(cas, i) in kb.cases.filter((c: any) => c.type === kb.mindmapSelected)" :key="i"
              style="padding:12px;border-radius:10px;background:rgba(30,41,59,0.8);border:1px solid rgba(148,163,184,0.18);margin-bottom:8px;transition:all .15s"
              :style="{ borderLeft: '3px solid '+ad.kbTypeColor(kb.mindmapSelected) }"
              @mouseenter="($event.currentTarget as HTMLElement).style.background='rgba(51,65,85,0.92)'"
              @mouseleave="($event.currentTarget as HTMLElement).style.background='rgba(30,41,59,0.8)'">
              <div style="font-size:12px;color:#e2e8f0;line-height:1.7">{{ (cas as any).summary }}</div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>