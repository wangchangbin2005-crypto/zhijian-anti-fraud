<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'

const ws = useWorkspaceStore()

const selectedAlgo = ref('auto')
const algoOptions = [
  { value: 'auto',    label: '🤖 自动选择',   desc: 'TF-IDF预筛 + LLM深度分析' },
  { value: 'tfidf',   label: '⚡ TF-IDF',     desc: '关键词权重快速检测，毫秒响应' },
  { value: 'llm',     label: '🧠 LLM语义',    desc: '大模型深度语义理解，精度最高' },
  { value: 'iforest', label: '🌲 孤立森林',   desc: '异常检测算法，识别新型诈骗变种' },
  { value: 'hybrid',  label: '🔬 混合增强',   desc: 'TF-IDF + NER + 孤立森林三层联合' },
]
const showAlgoPanel = ref(false)
const selectedAlgoObj = computed(() => algoOptions.find(a => a.value === selectedAlgo.value) ?? algoOptions[0]!)

async function quickSend(text: string) {
  ws.chatInput = text
  await nextTick()
  ws.chatSend()
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">实时诈骗检测</div>
      <div class="page-subtitle">多模态智能分析 · 实时风险评估 · 自动监护人联动</div>
    </div>

    <div class="stats-grid" style="margin-bottom: 16px">
      <div class="stat">
        <div class="stat-icon" style="color: var(--blue)">📡</div>
        <div class="stat-value" style="color: var(--blue)">{{ ws.stats.total }}</div>
        <div class="stat-label">累计检测</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="color: var(--red)">🚨</div>
        <div class="stat-value" style="color: var(--red)">{{ ws.stats.flagged }}</div>
        <div class="stat-label">风险拦截</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="color: var(--green)">✅</div>
        <div class="stat-value" style="color: var(--green)">{{ ws.stats.safe }}</div>
        <div class="stat-label">安全通过</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="color: var(--amber)">🔔</div>
        <div class="stat-value" style="color: var(--amber)">{{ ws.stats.guardian }}</div>
        <div class="stat-label">监护人通知</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 260px; gap: 16px; align-items: start">
      <div class="card" style="display: flex; flex-direction: column; height: calc(100vh - 200px); position: relative">
        <div v-if="ws.loading" class="analyzing-overlay">
          <div class="radar-ring"><div class="radar-dot"></div></div>
          <div class="analyzing-text">{{ ws.analyzingHint }}</div>
        </div>

        <div
          id="chat-box"
          style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 8px 4px; margin-bottom: 8px"
        >
          <div
            v-if="!ws.chatMessages.length"
            style="
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: var(--muted);
              gap: 16px;
              padding: 40px;
            "
          >
            <div style="font-size: 48px; opacity: 0.3">💬</div>
            <div style="font-size: 15px; text-align: center; line-height: 1.8">
              把可疑内容发给我，<br />AI 实时分析风险等级
            </div>
          </div>

          <template v-for="(msg, idx) in ws.chatMessages" :key="idx">
            <div v-if="msg.role === 'user'" style="display: flex; justify-content: flex-end">
              <div
                style="
                  max-width: 75%;
                  background: var(--blue);
                  color: #fff;
                  border-radius: 16px 16px 4px 16px;
                  padding: 12px 16px;
                  font-size: 14px;
                  line-height: 1.6;
                "
              >
                <img
                  v-if="msg.imageUrl"
                  :src="msg.imageUrl"
                  style="max-width: 200px; border-radius: 8px; display: block; margin-bottom: 8px"
                />
                <div>{{ msg.text }}</div>
                <div style="font-size: 11px; opacity: 0.7; margin-top: 4px; text-align: right">{{ msg.time }}</div>
              </div>
            </div>
            <div v-if="msg.role === 'system'" style="display:flex;justify-content:flex-start;width:100%">
              <div style="width:92%;border-radius:16px 16px 16px 4px;padding:16px 18px;font-size:13px;line-height:1.6;border:1px solid var(--border);background:var(--card2)">

                <!-- 顶部：风险等级 + 诈骗类型 + 时间 -->
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
                  <span style="font-size:13px;font-weight:700;padding:4px 14px;border-radius:20px;color:#fff;letter-spacing:.5px"
                    :style="{background:msg.riskColor}">
                    {{ msg.riskLabel }}
                  </span>
                  <span v-if="(msg.result as any)?.decision?.fraud_type"
                    style="font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;background:rgba(99,102,241,0.1);color:#6366f1;border:1px solid rgba(99,102,241,0.2)">
                    {{ (msg.result as any)?.decision?.fraud_type }}
                  </span>
                  <!-- 原始分进度条 -->
                  <div style="flex:1;min-width:120px;display:flex;align-items:center;gap:6px">
                    <span style="font-size:10px;color:var(--dim);white-space:nowrap">风险分</span>
                    <div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden">
                      <div :style="{
                        width: ((msg.result as any)?.decision?.raw_score || 0) + '%',
                        height: '100%', borderRadius: '3px', transition: 'width .8s ease',
                        background: ((msg.result as any)?.decision?.raw_score || 0) >= 65
                          ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                          : ((msg.result as any)?.decision?.raw_score || 0) >= 42
                          ? 'linear-gradient(90deg,#f97316,#f59e0b)'
                          : 'linear-gradient(90deg,#22c55e,#16a34a)'
                      }"/>
                    </div>
                    <span style="font-size:11px;color:var(--dim);font-family:'JetBrains Mono',monospace;white-space:nowrap">
                      {{ (msg.result as any)?.decision?.raw_score }}分
                    </span>
                  </div>
                  <span style="font-size:11px;color:var(--dim);margin-left:auto;white-space:nowrap">
                    {{ msg.time }} · {{ (msg.result as any)?.latency_s }}s
                  </span>
                </div>

                <!-- 解析说明 -->
                <div v-if="(msg.result as any)?.decision?.explanation"
                  style="font-size:14px;color:var(--text);margin-bottom:12px;line-height:1.8;padding:10px 14px;background:rgba(99,102,241,0.04);border-radius:10px;border-left:3px solid rgba(99,102,241,0.3)">
                  {{ (msg.result as any)?.decision?.explanation }}
                </div>

                <!-- 关键证据词 -->
                <div v-if="(msg.result as any)?.decision?.evidence?.length" style="margin-bottom:12px">
                  <div style="font-size:11px;color:var(--muted);margin-bottom:5px;font-weight:600">🔍 关键证据</div>
                  <div style="display:flex;flex-wrap:wrap;gap:5px">
                    <span v-for="e in (msg.result as any)?.decision?.evidence" :key="e"
                      style="font-size:11px;padding:3px 10px;border-radius:12px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2)">
                      {{ e }}
                    </span>
                  </div>
                </div>

                <!-- 算法分析四格 -->
                <div v-if="(msg.result as any)?.algorithms && (msg.result as any)?.decision?.risk_level !== 'safe'"
                  style="margin-bottom:12px">
                  <div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-weight:600">🔬 多算法联合分析</div>
                  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;font-size:12px">
                    <div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:10px;text-align:center">
                      <div style="font-size:18px;margin-bottom:3px">⚡</div>
                      <div style="font-weight:600;color:#93c5fd;margin-bottom:3px;font-size:11px">TF-IDF</div>
                      <div style="color:var(--muted);font-size:11px">{{ (msg.result as any)?.algorithms?.tfidf?.fraud_type || '—' }}</div>
                    </div>
                    <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:10px;text-align:center">
                      <div style="font-size:18px;margin-bottom:3px">🏷</div>
                      <div style="font-weight:600;color:#6ee7b7;margin-bottom:3px;font-size:11px">NER实体</div>
                      <div style="color:var(--muted);font-size:11px">金额：{{ (msg.result as any)?.algorithms?.ner?.has_money ? '✓检测到' : '未发现' }}</div>
                    </div>
                    <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:10px;text-align:center">
                      <div style="font-size:18px;margin-bottom:3px">💭</div>
                      <div style="font-weight:600;color:#fbbf24;margin-bottom:3px;font-size:11px">情感分析</div>
                      <div style="color:var(--muted);font-size:11px">操控分 {{ (msg.result as any)?.algorithms?.sentiment?.manipulation_score || 0 }}</div>
                    </div>
                    <div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.2);border-radius:8px;padding:10px;text-align:center">
                      <div style="font-size:18px;margin-bottom:3px">🌲</div>
                      <div style="font-weight:600;color:#a78bfa;margin-bottom:3px;font-size:11px">孤立森林</div>
                      <div style="color:var(--muted);font-size:11px">异常度 {{ Math.round(((msg.result as any)?.algorithms?.iforest?.anomaly_score || 0)*100) }}%</div>
                    </div>
                  </div>
                </div>

                <!-- 置信度 + 相似案例 -->
                <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid var(--border)">
                  <div style="display:flex;align-items:center;gap:6px">
                    <span style="font-size:11px;color:var(--dim)">置信度</span>
                    <span style="font-size:13px;font-weight:700;font-family:'JetBrains Mono',monospace"
                      :style="{color: msg.riskColor}">
                      {{ Math.round(((msg.result as any)?.decision?.confidence || 0)*100) }}%
                    </span>
                  </div>
                  <div style="width:1px;height:16px;background:var(--border)"/>
                  <div style="display:flex;align-items:center;gap:6px">
                    <span style="font-size:11px;color:var(--dim)">相似案例</span>
                    <span style="font-size:13px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--blue)">
                      {{ (msg.result as any)?.decision?.similar_cases?.length || 0 }} 条
                    </span>
                  </div>
                  <div v-if="(msg.result as any)?.algorithms?.skipped_llm" style="display:flex;align-items:center;gap:4px;margin-left:auto">
                    <span style="font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.2)">
                      ⚡ 算法快速响应
                    </span>
                  </div>
                  <div v-else style="margin-left:auto">
                    <span style="font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(99,102,241,0.1);color:#6366f1;border:1px solid rgba(99,102,241,0.2)">
                      🧠 LLM深度分析
                    </span>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;align-items:center;padding-top:8px;border-top:1px solid var(--border)">
                  <button v-if="(msg.result as any)?.intervention?.record_id"
                    style="font-size:11px;padding:4px 12px;border-radius:8px;background:rgba(59,130,246,0.15);color:#93c5fd;border:1px solid rgba(59,130,246,0.3);cursor:pointer"
                    @click="ws.viewReportById(String((msg.result as any).intervention.record_id))">
                    📄 查看报告
                  </button>
                  <button style="font-size:11px;padding:4px 12px;border-radius:8px;background:rgba(16,185,129,0.12);color:#6ee7b7;border:1px solid rgba(16,185,129,0.25);cursor:pointer"
                    @click="ws.startFollowup(msg as never)">
                    💬 追问分析
                  </button>
                  <div style="display:flex;gap:2px;margin-left:auto;align-items:center">
                    <button class="detect-action-btn" :style="msg._like===1?'color:#6ee7b7;background:rgba(16,185,129,0.15)':''" @click="ws.msgAction(msg,'like',idx)">👍 <span class="detect-action-label">有用</span></button>
                    <button class="detect-action-btn" :style="msg._like===-1?'color:#f87171;background:rgba(239,68,68,0.12)':''" @click="ws.msgAction(msg,'dislike',idx)">👎 <span class="detect-action-label">没用</span></button>
                    <button class="detect-action-btn" @click="ws.msgAction(msg,'copy',idx)">{{ msg._copied?'✅':'📋' }} <span class="detect-action-label">{{ msg._copied?'已复制':'复制' }}</span></button>
                    <button class="detect-action-btn" @click="ws.msgAction(msg,'share',idx)">🔗 <span class="detect-action-label">分享</span></button>
                    <button class="detect-action-btn" @click="ws.msgAction(msg,'forward',idx)">↩️ <span class="detect-action-label">转发</span></button>
                  </div>
                </div>

              </div>
            </div>
          </template>

          <div v-if="ws.loading" style="display: flex; justify-content: flex-start">
            <div
              style="
                background: var(--card2);
                border: 1px solid var(--border);
                border-radius: 16px 16px 16px 4px;
                padding: 12px 16px;
                font-size: 13px;
                color: var(--dim);
              "
            >
              <span class="spinner" style="width: 12px; height: 12px; border-width: 2px; margin-right: 8px"></span
              >{{ ws.analyzingHint }}
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--border); padding-top: 12px">
          <div class="tab-row" style="margin-bottom: 10px">
            <button class="tab-btn" :class="{ active: ws.inputMode === 'text' }" @click="ws.inputMode = 'text'">
              📝 文本
            </button>
            <button class="tab-btn" :class="{ active: ws.inputMode === 'audio' }" @click="ws.inputMode = 'audio'">
              🎵 音频
            </button>
            <button class="tab-btn" :class="{ active: ws.inputMode === 'image' }" @click="ws.inputMode = 'image'">
              🖼️ 图片
            </button>
            <button
              class="tab-btn"
              :class="{ active: ws.inputMode === 'video' }"
              @click="ws.inputMode = 'video'; ws.stopScreenRecord()"
            >
              🎬 视频
            </button>
            <button class="tab-btn" :class="{ active: ws.inputMode === 'screen' }" @click="ws.inputMode = 'screen'">
              🖥️ 录屏
            </button>
          </div>

          <div v-if="ws.inputMode === 'audio'" style="margin-bottom: 10px">
            <label class="upload-zone" style="padding: 16px; display: block; cursor: pointer">
              <input type="file" accept=".mp3,.wav,.ogg,.m4a,.flac" style="display: none" @change="ws.onAudioChange" />
              <div class="icon" style="font-size: 24px; margin-bottom: 4px">🎵</div>
              <div class="tip">点击上传音频</div>
            </label>
            <div v-if="ws.audioTranscript" class="preview-box">{{ ws.audioTranscript }}</div>
          </div>

          <div v-if="ws.inputMode === 'image'" style="margin-bottom: 10px">
            <label class="upload-zone" style="padding: 16px; display: block; cursor: pointer">
              <input type="file" accept=".jpg,.jpeg,.png,.bmp,.webp" style="display: none" @change="ws.onImageChange" />
              <div class="icon" style="font-size: 24px">🖼️</div>
              <div class="tip">上传截图</div>
            </label>
            <img
              v-if="ws.imagePreviewUrl"
              :src="ws.imagePreviewUrl"
              style="max-width: 100%; max-height: 100px; border-radius: 6px; margin-top: 6px"
            />
            <input
              v-model="ws.imageDesc"
              type="text"
              placeholder="（可选）补充描述…"
              style="width: 100%; margin-top: 6px"
            />
          </div>

          <div v-if="ws.inputMode === 'video'" style="margin-bottom: 10px">
            <label class="upload-zone" style="padding: 16px; display: block; cursor: pointer">
              <input type="file" accept=".mp4,.mov,.avi,.webm,.mkv" style="display: none" @change="ws.onVideoChange" />
              <div class="icon" style="font-size: 24px">🎬</div>
              <div class="tip">上传视频提取音频</div>
            </label>
            <video
              v-if="ws.videoPreviewUrl"
              :src="ws.videoPreviewUrl"
              controls
              style="max-width: 100%; max-height: 120px; border-radius: 6px; margin-top: 6px; display: block"
            />
            <div v-if="ws.videoTranscript" class="preview-box">{{ ws.videoTranscript }}</div>
          </div>

          <div v-show="ws.inputMode === 'screen'" style="margin-bottom: 10px">
            <div style="border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: rgba(99,102,241,0.05)">
              <div id="screen-preview-wrap" style="display: none; background: #1a1040; position: relative">
                <video
                  id="screen-preview-video"
                  autoplay
                  muted
                  playsinline
                  style="width: 100%; height: 220px; display: block; object-fit: contain"
                />
                <div
                  v-if="ws.screenRecording"
                  style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    background: linear-gradient(180deg, rgba(0, 0, 0, 0.7), transparent);
                  "
                >
                  <span style="width: 10px; height: 10px; background: #ef4444; border-radius: 50%"></span>
                  <span style="font-size: 13px; font-weight: 600; color: #fff">● 录制中 {{ ws.screenRecordTime }}s</span>
                </div>
              </div>
              <div style="padding: 14px">
                <div v-if="ws.screenRecording" style="margin-bottom: 10px">
                  <button type="button" class="btn btn-outline" style="width: 100%; justify-content: center; color: var(--red)" @click="ws.stopScreenRecord">
                    ⏹ 停止录制并分析
                  </button>
                </div>
                <div v-if="!ws.screenRecording && !ws.screenTranscript && !ws.screenProcessing" style="text-align: center; padding: 10px 0">
                  <button type="button" class="btn btn-primary" style="justify-content: center" @click="ws.startScreenRecord">开始录屏检测</button>
                </div>
                <div v-if="ws.screenProcessing" style="text-align: center; padding: 16px 0">
                  <span class="spinner" style="width: 18px; height: 18px; display: inline-block"></span>
                  <div style="font-size: 13px; color: var(--muted)">正在提取音频转写...</div>
                </div>
                <div v-if="!ws.screenRecording && !ws.screenProcessing && ws.screenShowInput">
                  <textarea
                    v-model="ws.screenTranscript"
                    style="width: 100%; min-height: 80px; font-size: 13px; margin-bottom: 8px"
                    placeholder="转写文本，可编辑后检测"
                  />
                  <div style="display: flex; gap: 8px">
                    <button type="button" class="btn btn-primary" style="flex: 1; justify-content: center" :disabled="!ws.screenTranscript.trim()" @click="ws.screenSend">
                      🔍 立即检测
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline"
                      @click="ws.screenTranscript = ''; ws.screenAsrOk = false; ws.screenShowInput = false; ws.screenRecordTime = 0"
                    >
                      🔄 重录
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 算法选择器 -->
          <div style="margin-bottom:10px;position:relative">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:12px;color:var(--muted);font-weight:500">检测算法：</span>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button v-for="algo in algoOptions" :key="algo.value" type="button"
                  @click="selectedAlgo = algo.value"
                  style="padding:4px 12px;border-radius:20px;font-size:12px;cursor:pointer;transition:all .2s;border:1.5px solid;font-family:inherit"
                  :style="selectedAlgo === algo.value
                    ? 'background:rgba(99,102,241,0.15);color:#6366f1;border-color:rgba(99,102,241,0.5);font-weight:600'
                    : 'background:transparent;color:var(--muted);border-color:var(--border)'">
                  {{ algo.label }}
                </button>
              </div>
            </div>
            <!-- 当前算法说明 -->
            <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;background:rgba(99,102,241,0.05);border:1px solid rgba(99,102,241,0.12)">
              <span style="font-size:11px;color:rgba(99,102,241,0.7);font-family:'JetBrains Mono',monospace">ALGO</span>
              <span style="font-size:12px;color:var(--muted)">{{ selectedAlgoObj.desc }}</span>
              <span v-if="selectedAlgo==='auto'" style="margin-left:auto;font-size:10px;padding:1px 6px;border-radius:10px;background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.2)">推荐</span>
              <span v-if="selectedAlgo==='hybrid'" style="margin-left:auto;font-size:10px;padding:1px 6px;border-radius:10px;background:rgba(245,158,11,0.1);color:#f59e0b;border:1px solid rgba(245,158,11,0.2)">最强</span>
              <span v-if="selectedAlgo==='tfidf'" style="margin-left:auto;font-size:10px;padding:1px 6px;border-radius:10px;background:rgba(59,130,246,0.1);color:#3b82f6;border:1px solid rgba(59,130,246,0.2)">最快</span>
            </div>
          </div>

          <div class="quick-examples" style="margin-bottom:10px;flex-wrap:wrap;justify-content:flex-start">
            <span class="quick-label">快速测试：</span>
            <button class="quick-btn" @click="ws.chatInput = '我是公安局，你账号涉案，立刻把钱转到指定安全账户配合调查，否则逮捕'">极高风险</button>
            <button class="quick-btn" @click="ws.chatInput = '我是你朋友小李，最近做生意资金周转不开，能先借我五千吗，月底一定还'">高风险</button>
            <button class="quick-btn" @click="ws.chatInput = '您好，您的银行卡存在异常消费，请回复1确认是否本人操作'">中风险</button>
            <button class="quick-btn" @click="ws.chatInput = '你好，我是隔壁王阿姨，明天社区有免费体检活动，记得带身份证来'">安全</button>
          </div>

          <div style="display: flex; gap: 8px; align-items: flex-end">
            <div style="display: flex; gap: 6px; flex-shrink: 0">
              <select v-model="ws.userRole" style="font-size: 13px; padding: 6px 8px">
                <option value="adult">👤 成人</option>
                <option value="elder">👴 老人</option>
                <option value="student">🎓 学生</option>
                <option value="financial">💼 财会</option>
              </select>
            </div>
            <textarea
              v-if="ws.inputMode === 'text'"
              v-model="ws.chatInput"
              :disabled="ws.loading"
              style="flex: 1; min-height: 44px; max-height: 100px; resize: none; font-size: 14px; padding: 10px 12px"
              placeholder="输入可疑内容… Enter发送"
              @keydown="ws.chatKeydown"
            />
            <button
              type="button"
              class="btn btn-primary"
              style="height: 44px; padding: 0 20px; flex-shrink: 0"
              :disabled="
                ws.loading ||
                (ws.inputMode === 'text' && !ws.chatInput.trim()) ||
                (ws.inputMode === 'image' && !ws.imageBase64) ||
                (ws.inputMode === 'video' && !ws.videoTranscript) ||
                (ws.inputMode === 'screen' && !ws.screenTranscript)
              "
              @click="ws.chatSend"
            >
              <span v-if="ws.loading" class="spinner" style="width: 14px; height: 14px; border-width: 2px"></span>
              <span v-else>发送</span>
            </button>
            <button type="button" class="btn btn-outline" style="height: 44px" title="清空" @click="ws.clearChat">🗑</button>
          </div>
        </div>
      </div>

      <div>
        <div class="detect-tips-panel" style="position: sticky; top: 20px">
          <div class="tips-header">🔰 检测说明</div>
          <div class="tips-list">
            <div class="tip-item tip-critical" :class="{ 'tip-active': (ws.result as any)?.decision?.risk_level === 'critical' }">
              <span class="tip-dot"></span>
              <div>
                <div class="tip-title">极高风险</div>
                <div class="tip-desc">{{ (ws.result as any)?.decision?.risk_level === 'critical' ? `已识别：${(ws.result as any)?.decision?.fraud_type || '诈骗行为'}，已通知监护人` : '自动通知监护人 + 生成报告' }}</div>
              </div>
            </div>
            <div class="tip-item tip-high" :class="{ 'tip-active': (ws.result as any)?.decision?.risk_level === 'high' }">
              <span class="tip-dot"></span>
              <div>
                <div class="tip-title">高风险</div>
                <div class="tip-desc">{{ (ws.result as any)?.decision?.risk_level === 'high' ? `已识别：${(ws.result as any)?.decision?.fraud_type || '疑似诈骗'}，请提高警惕` : '弹出警告 + 通知监护人' }}</div>
              </div>
            </div>
            <div class="tip-item tip-medium" :class="{ 'tip-active': (ws.result as any)?.decision?.risk_level === 'medium' }">
              <span class="tip-dot"></span>
              <div>
                <div class="tip-title">中风险</div>
                <div class="tip-desc">{{ (ws.result as any)?.decision?.risk_level === 'medium' ? `已识别：${(ws.result as any)?.decision?.fraud_type || '可疑内容'}，建议核实` : '弹出警告提示' }}</div>
              </div>
            </div>
            <div class="tip-item tip-safe" :class="{ 'tip-active': ['safe','low'].includes((ws.result as any)?.decision?.risk_level) }">
              <span class="tip-dot"></span>
              <div>
                <div class="tip-title">安全</div>
                <div class="tip-desc">{{ ['safe','low'].includes((ws.result as any)?.decision?.risk_level) ? '未发现诈骗特征，内容正常' : '内容正常' }}</div>
              </div>
            </div>
          </div>
          <div class="hotline-box" style="margin-top: 16px">
            <div style="font-size: 11px; color: var(--muted); margin-bottom: 4px; font-family: JetBrains Mono, monospace">反诈热线</div>
            <div style="font-size: 28px; font-weight: 700; color: var(--red); font-family: JetBrains Mono, monospace">96110</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="ws.showBlockOverlay" class="block-overlay"
      :class="(ws.result as any)?.decision?.risk_level === 'medium' ? 'overlay-medium' : (ws.result as any)?.decision?.risk_level === 'high' ? 'overlay-high' : ''">
      <div class="voice-wave"><span></span><span></span><span></span><span></span><span></span></div>
      <h2>{{
        (ws.result as any)?.decision?.risk_level === 'medium' ? '⚠️ 中风险提示' :
        (ws.result as any)?.decision?.risk_level === 'high' ? '🚨 高风险警告' :
        '⚠️ 极高风险警告'
      }}</h2>
      <p>{{ ws.blockMessage }}</p>
      <button type="button" class="btn btn-primary" @click="ws.showBlockOverlay = false; ws.blockTransaction()">我知道了</button>
    </div>


  </div>
</template>
<style scoped>
.detect-action-btn {
  border: none; cursor: pointer;
  padding: 5px 8px; border-radius: 6px;
  font-size: 12px; color: var(--muted);
  background: transparent; transition: all .15s;
  display: inline-flex; align-items: center; gap: 3px;
  font-family: inherit;
}
.detect-action-btn:hover {
  background: rgba(99,102,241,0.08);
  color: var(--text);
}
.detect-action-label {
  font-size: 11px; font-weight: 500;
}
</style>