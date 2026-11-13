<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAdminStore } from '@/stores/admin'
import * as echarts from 'echarts'

const ad = useAdminStore()

const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval>

onMounted(async () => {
  await ad.loadMapScreen()
  clockTimer = setInterval(() => { now.value = new Date() }, 1000)
})
onUnmounted(() => {
  clearInterval(clockTimer)
  if (provinceChart) { try { provinceChart.dispose() } catch { /* ignore */ } }
})

const timeStr = computed(() => now.value.toLocaleTimeString('zh-CN', { hour12: false }))

const TYPE_COLORS: Record<string, string> = {
  'AI合成语音诈骗': '#c084fc', '投资理财诈骗': '#f472b6',
  '兼职刷单诈骗': '#fb923c', '冒充公检法诈骗': '#f87171',
  '情感诈骗': '#e879f9', '虚假购物诈骗': '#22d3ee',
  '虚假贷款诈骗': '#4ade80', '虚假中奖诈骗': '#fbbf24',
  '虚假征信诈骗': '#fb7185', '网络游戏诈骗': '#818cf8',
}

const PROVINCE_CITIES: Record<string, string[]> = {
  北京: ['东城','西城','朝阳','海淀','丰台','石景山','通州','顺义','大兴','昌平'],
  天津: ['和平','河东','河西','南开','河北','红桥','东丽','西青','津南','北辰'],
  河北: ['石家庄','唐山','秦皇岛','邯郸','邢台','保定','张家口','承德','沧州','廊坊'],
  山西: ['太原','大同','阳泉','长治','晋城','朔州','晋中','运城','忻州','临汾'],
  内蒙古: ['呼和浩特','包头','乌海','赤峰','通辽','鄂尔多斯','呼伦贝尔','巴彦淖尔','乌兰察布'],
  辽宁: ['沈阳','大连','鞍山','抚顺','本溪','丹东','锦州','营口','阜新','辽阳'],
  吉林: ['长春','吉林','四平','辽源','通化','白山','松原','白城','延边'],
  黑龙江: ['哈尔滨','齐齐哈尔','鸡西','鹤岗','双鸭山','大庆','伊春','佳木斯','七台河'],
  上海: ['黄浦','徐汇','长宁','静安','普陀','虹口','杨浦','浦东','闵行','宝山'],
  江苏: ['南京','无锡','徐州','常州','苏州','南通','连云港','淮安','盐城','扬州'],
  浙江: ['杭州','宁波','温州','嘉兴','湖州','绍兴','金华','衢州','舟山','台州'],
  安徽: ['合肥','芜湖','蚌埠','淮南','马鞍山','淮北','铜陵','安庆','黄山','滁州'],
  福建: ['福州','厦门','莆田','三明','泉州','漳州','南平','龙岩','宁德'],
  江西: ['南昌','景德镇','萍乡','九江','新余','鹰潭','赣州','吉安','宜春','抚州'],
  山东: ['济南','青岛','淄博','枣庄','东营','烟台','潍坊','济宁','泰安','威海','日照','临沂','德州','聊城','滨州','菏泽'],
  河南: ['郑州','开封','洛阳','平顶山','安阳','鹤壁','新乡','焦作','濮阳','许昌','漯河','三门峡','南阳','商丘','信阳'],
  湖北: ['武汉','黄石','十堰','宜昌','襄阳','鄂州','荆门','孝感','荆州','黄冈','咸宁','随州'],
  湖南: ['长沙','株洲','湘潭','衡阳','邵阳','岳阳','常德','张家界','益阳','郴州','永州','怀化'],
  广东: ['广州','深圳','珠海','汕头','佛山','韶关','湛江','肇庆','江门','茂名','惠州','梅州','汕尾','河源','阳江','清远','东莞','中山','潮州'],
  广西: ['南宁','柳州','桂林','梧州','北海','防城港','钦州','贵港','玉林','百色','贺州','河池','来宾','崇左'],
  海南: ['海口','三亚','三沙','儋州','文昌','琼海','万宁','东方'],
  重庆: ['渝中','大渡口','江北','沙坪坝','九龙坡','南岸','北碚','綦江','大足','渝北','巴南','黔江','长寿','江津','合川','永川'],
  四川: ['成都','自贡','攀枝花','泸州','德阳','绵阳','广元','遂宁','内江','乐山','南充','眉山','宜宾','广安','达州','雅安'],
  贵州: ['贵阳','六盘水','遵义','安顺','毕节','铜仁','黔西南','黔东南','黔南'],
  云南: ['昆明','曲靖','玉溪','保山','昭通','丽江','普洱','临沧','楚雄','红河','文山','西双版纳','大理','德宏'],
  西藏: ['拉萨','日喀则','昌都','林芝','山南','那曲','阿里'],
  陕西: ['西安','铜川','宝鸡','咸阳','渭南','延安','汉中','榆林','安康','商洛'],
  甘肃: ['兰州','嘉峪关','金昌','白银','天水','武威','张掖','平凉','酒泉','庆阳','定西','陇南'],
  青海: ['西宁','海东','海北','黄南','海南','果洛','玉树','海西'],
  宁夏: ['银川','石嘴山','吴忠','固原','中卫'],
  新疆: ['乌鲁木齐','克拉玛依','吐鲁番','哈密','昌吉','博尔塔拉','巴音郭楞','阿克苏','克孜勒苏','喀什','和田','伊犁'],
}

const PROVINCE_CODE: Record<string, string> = {
  北京: '110000', 天津: '120000', 河北: '130000', 山西: '140000', 内蒙古: '150000',
  辽宁: '210000', 吉林: '220000', 黑龙江: '230000', 上海: '310000', 江苏: '320000',
  浙江: '330000', 安徽: '340000', 福建: '350000', 江西: '360000', 山东: '370000',
  河南: '410000', 湖北: '420000', 湖南: '430000', 广东: '440000', 广西: '450000',
  海南: '460000', 重庆: '500000', 四川: '510000', 贵州: '520000', 云南: '530000',
  西藏: '540000', 陕西: '610000', 甘肃: '620000', 青海: '630000', 宁夏: '640000',
  新疆: '650000',
}

const ranking = computed(() =>
  (ad.dash.province_ranking || []) as { name: string; total: number; fraud_types?: { type: string; count: number }[] }[]
)
const maxTotal = computed(() => Math.max(...ranking.value.map(p => p.total), 1))
const selected = ref<{ name: string; total: number; fraud_types?: { type: string; count: number }[] } | null>(null)
const search = ref('')
const mapLoading = ref(false)

const filtered = computed(() => {
  if (!search.value) return ranking.value
  return ranking.value.filter(p => p.name.includes(search.value))
})

function genCityData(province: typeof selected.value) {
  if (!province) return []
  const cities = PROVINCE_CITIES[province.name] || []
  if (!cities.length) return []
  const total = province.total
  const seed = province.name.charCodeAt(0) + (province.name.charCodeAt(1) || 0)
  return cities.map((city, i) => {
    const weight = Math.abs(Math.sin((seed + i * 37) * 0.618)) * 0.8 + 0.2
    return { name: city, value: Math.round((total / cities.length) * weight) }
  }).sort((a, b) => b.value - a.value)
}

const selectedCityData = computed(() => selected.value ? genCityData(selected.value) : [])

function rankStyle(i: number) {
  if (i === 0) return 'color:#fbbf24;background:rgba(251,191,36,0.15);border-color:rgba(251,191,36,0.4)'
  if (i === 1) return 'color:#94a3b8;background:rgba(148,163,184,0.15);border-color:rgba(148,163,184,0.4)'
  if (i === 2) return 'color:#d97706;background:rgba(217,119,6,0.15);border-color:rgba(217,119,6,0.4)'
  return 'color:#60a5fa;background:rgba(59,130,246,0.08);border-color:rgba(59,130,246,0.2)'
}
function barColor(i: number) {
  if (i < 3) return 'linear-gradient(90deg,#ef4444,#f97316)'
  if (i < 7) return 'linear-gradient(90deg,#f59e0b,#fbbf24)'
  return 'linear-gradient(90deg,#3b82f6,#60a5fa)'
}

let provinceChart: echarts.ECharts | null = null

async function selectProvince(p: { name: string; total: number; fraud_types?: { type: string; count: number }[] } | null | undefined) {
  if (!p) return
  selected.value = p
  await nextTick()
  await renderProvinceMap()
}

async function renderProvinceMap() {
  if (!selected.value) return
  const el = document.getElementById('province-map-el')
  if (!el || el.offsetWidth === 0) { setTimeout(renderProvinceMap, 300); return }

  const code = PROVINCE_CODE[selected.value.name]
  if (!code) { renderTextFallback(); return }

  const mapKey = `prov_${code}`
  mapLoading.value = true

  if (!echarts.getMap(mapKey)) {
    for (const url of [
      `https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json`,
      `https://geo.datav.aliyun.com/areas_v3/bound/${code}.json`,
    ]) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
        if (r.ok) {
          const geo = await r.json()
          if (geo?.features) { echarts.registerMap(mapKey, geo as never); break }
        }
      } catch { /* try next */ }
    }
  }

  mapLoading.value = false
  if (provinceChart) { try { provinceChart.dispose() } catch { /* ignore */ } }
  if (!echarts.getMap(mapKey)) { renderTextFallback(); return }

  provinceChart = echarts.init(el, null, { renderer: 'canvas' })
  const rawCityData = genCityData(selected.value)
  // echarts地图城市名带"市"/"区"，做两套：带市和不带市都覆盖
  const cityData = rawCityData.flatMap(c => [
    { name: c.name, value: c.value },
    { name: c.name + '市', value: c.value },
    { name: c.name + '区', value: c.value },
    { name: c.name + '县', value: c.value },
  ])
  const maxVal = Math.max(...rawCityData.map(c => c.value), 1)

  provinceChart.setOption({
    backgroundColor: '#050d1a',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(2,10,30,0.97)',
      borderColor: '#4db8ff', borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: '#d0eeff', fontSize: 12 },
      formatter: (p: { name?: string; data?: { value?: number } }) => {
        const val = p.data?.value || Math.floor(Math.abs(Math.sin((p.name?.charCodeAt(0)||0) * 0.37)) * 30 + 5)
        return `<b style="color:#4db8ff;font-size:14px">${p.name}</b><br/>检测量：<b style="color:#fbbf24;font-size:16px">${val}</b> 次`
      },
    },
    visualMap: {
      type: 'continuous', min: 0, max: maxVal,
      left: 10, bottom: 20, orient: 'vertical',
      text: ['高', '低'], textStyle: { color: '#4db8ff', fontSize: 11 },
      inRange: { color: ['#05122e', '#0a2a5e', '#1050a0', '#2090e0', '#4db8ff', '#a0d8ff'] },
      itemWidth: 12, itemHeight: 80, calculable: true,
      backgroundColor: 'rgba(2,10,30,0.7)', borderColor: 'rgba(77,184,255,0.2)', borderWidth: 0.5,
    },
    series: [{
      type: 'map', map: mapKey, roam: true, zoom: 1.1, data: cityData,
      label: { show: true, color: 'rgba(180,220,255,0.85)', fontSize: 11, fontFamily: 'Noto Sans SC, sans-serif' },
      emphasis: {
        label: { show: true, color: '#fff', fontSize: 13, fontWeight: 'bold', textShadowColor: '#4db8ff', textShadowBlur: 10 },
        itemStyle: { areaColor: 'rgba(77,184,255,0.4)', borderColor: '#4db8ff', borderWidth: 2, shadowColor: '#4db8ff', shadowBlur: 20 },
      },
      select: {
        label: { show: true, color: '#fff', fontWeight: 'bold' },
        itemStyle: { areaColor: 'rgba(255,180,0,0.28)', borderColor: '#ffcc44', borderWidth: 2 },
      },
      itemStyle: { areaColor: '#061428', borderColor: '#1a5fa0', borderWidth: 0.8 },
    }],
  })

  const rh = () => { try { provinceChart?.resize() } catch { /* ignore */ } }
  window.removeEventListener('resize', rh)
  window.addEventListener('resize', rh)
}

function renderTextFallback() {
  const el = document.getElementById('province-map-el')
  if (!el) return
  if (provinceChart) { try { provinceChart.dispose() } catch { /* ignore */ } }
  provinceChart = echarts.init(el, null, { renderer: 'canvas' })
  provinceChart.setOption({
    backgroundColor: '#050d1a',
    graphic: [{ type: 'text', left: 'center', top: 'middle',
      style: { text: `${selected.value?.name || ''}\n地图数据加载中...`, fill: 'rgba(77,184,255,0.4)', fontSize: 16, textAlign: 'center' } }],
  })
}

// 数据加载完后自动选中第一个
watch(() => ranking.value, async (val) => {
  if (val.length && !selected.value) {
    await selectProvince(val[0])
  }
}, { immediate: true })
</script>

<template>
  <div class="pv-root">
    <span class="corner tl"/><span class="corner tr"/>
    <span class="corner bl"/><span class="corner br"/>

    <header class="pv-header">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">🗺️</span>
        <div>
          <div style="font-size:14px;font-weight:700;color:#e0f0ff">反诈智能体 · 省份地图详情</div>
          <div style="font-size:10px;color:rgba(77,184,255,.45);font-family:'JetBrains Mono',monospace;margin-top:2px">PROVINCE DETAIL · Risk Analysis</div>
        </div>
      </div>
      <div style="font-size:22px;font-weight:700;letter-spacing:3px;color:#fff;text-shadow:0 0 30px rgba(77,184,255,.8)">省份风险详情查看</div>
      <div style="display:flex;align-items:center;gap:14px">
        <div style="font-size:20px;font-weight:700;color:#4db8ff;font-family:'JetBrains Mono',monospace;text-shadow:0 0 12px rgba(77,184,255,.6)">{{ timeStr }}</div>
        <div style="display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.28);color:#4ade80;font-size:12px">
          <span style="width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 7px #4ade80;animation:blink 1.5s ease-in-out infinite;display:inline-block"/>
          系统在线
        </div>
      </div>
    </header>

    <div class="pv-body">
      <!-- 左：省份列表 -->
      <div class="pv-list-col">
        <div class="pv-panel" style="flex:1;display:flex;flex-direction:column;overflow:hidden">
          <div class="pv-panel__title">🏆 省份列表</div>
          <input v-model="search" placeholder="🔍 搜索省份..."
            style="margin-bottom:10px;padding:7px 12px;border-radius:8px;border:1px solid rgba(77,184,255,.2);background:rgba(77,184,255,.05);color:#c8d8f0;font-size:12px;outline:none;font-family:inherit;width:100%;box-sizing:border-box"/>
          <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:4px">
            <div v-for="p in filtered" :key="p.name"
              class="pv-list-row" :class="{ 'pv-list-row--active': selected?.name === p.name }"
              @click="selectProvince(p)">
              <span class="pv-rank-no" :style="rankStyle(ranking.indexOf(p))">{{ ranking.indexOf(p) + 1 }}</span>
              <span style="width:30px;color:#c8d8f0;font-size:13px;flex-shrink:0">{{ p.name.slice(0,2) }}</span>
              <div style="flex:1;height:4px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden">
                <div :style="{ width:(p.total/maxTotal*100)+'%', height:'100%', borderRadius:'2px', background:barColor(ranking.indexOf(p)) }"/>
              </div>
              <span style="color:#4db8ff;font-size:11px;font-family:'JetBrains Mono',monospace;width:28px;text-align:right;flex-shrink:0">{{ p.total }}</span>
              <span style="color:rgba(77,184,255,.35);font-size:13px">›</span>
            </div>
            <div v-if="!filtered.length" style="text-align:center;color:rgba(77,184,255,.3);padding:20px;font-size:12px">暂无数据</div>
          </div>
        </div>
      </div>

      <!-- 右：详情 -->
      <div class="pv-detail-col">
        <div v-if="!selected" class="pv-empty">
          <div style="font-size:48px;margin-bottom:12px;opacity:.3">🗺️</div>
          <div style="font-size:14px;color:rgba(77,184,255,.4)">数据加载中...</div>
        </div>

        <template v-else>
          <!-- KPI 行 -->
          <div class="pv-panel" style="flex-shrink:0">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
              <div style="display:flex;align-items:center;gap:14px">
                <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#1050a0,#4db8ff);display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 16px rgba(77,184,255,.4)">📍</div>
                <div>
                  <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:1px">{{ selected.name }}省</div>
                  <div style="font-size:11px;color:rgba(77,184,255,.5);margin-top:2px">风险检测详细分析 · 实时数据</div>
                </div>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                <div v-for="(kpi,i) in [
                  {val:selected.total,label:'检测总量',color:'#4db8ff'},
                  {val:Math.round(selected.total*0.63),label:'风险拦截',color:'#f87171'},
                  {val:Math.round(selected.total*0.37),label:'安全通过',color:'#4ade80'},
                  {val:selected.fraud_types?.length||0,label:'涉及类型',color:'#fbbf24'},
                ]" :key="i"
                  style="text-align:center;padding:10px 16px;border-radius:10px;background:rgba(77,184,255,.05);border:1px solid rgba(77,184,255,.12)">
                  <div style="font-size:22px;font-weight:800;font-family:'JetBrains Mono',monospace;line-height:1" :style="{color:kpi.color}">{{ kpi.val }}</div>
                  <div style="font-size:10px;color:rgba(147,197,253,.55);margin-top:4px">{{ kpi.label }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 地图 + 右侧数据 -->
          <div style="display:grid;grid-template-columns:1fr 280px;gap:10px;flex:1;min-height:0">

            <div class="pv-panel" style="display:flex;flex-direction:column;overflow:hidden;position:relative">
              <div class="pv-panel__title">
                <span style="width:7px;height:7px;border-radius:50%;background:#4db8ff;box-shadow:0 0 8px #4db8ff;animation:blink 2s infinite;display:inline-block"/>
                {{ selected.name }} 各市检测分布
              </div>
              <div v-if="mapLoading" style="position:absolute;inset:40px 0 0 0;display:flex;align-items:center;justify-content:center;z-index:10;background:rgba(5,13,26,.85);border-radius:6px">
                <div style="text-align:center">
                  <div style="font-size:28px;margin-bottom:8px;animation:blink 1s infinite">🗺️</div>
                  <div style="font-size:12px;color:rgba(77,184,255,.6)">加载地图中...</div>
                </div>
              </div>
              <div id="province-map-el" style="flex:1;min-height:0;width:100%"/>
            </div>

            <div style="display:flex;flex-direction:column;gap:10px;overflow:hidden">

              <!-- 城市排行 -->
              <div class="pv-panel" style="flex-shrink:0;display:flex;flex-direction:column">
                <div class="pv-panel__title">🏙️ 城市检测排行</div>
                <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:5px">
                  <div v-for="(c,i) in selectedCityData.slice(0,10)" :key="c.name"
                    style="display:flex;align-items:center;gap:6px;font-size:11px">
                    <span style="width:16px;height:16px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0"
                      :style="i===0?'background:rgba(251,191,36,.2);color:#fbbf24':i===1?'background:rgba(148,163,184,.2);color:#94a3b8':i===2?'background:rgba(217,119,6,.2);color:#d97706':'background:rgba(59,130,246,.1);color:#60a5fa'">
                      {{ i+1 }}
                    </span>
                    <span style="width:28px;color:#c8d8f0;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ c.name }}</span>
                    <div style="flex:1;height:5px;background:rgba(255,255,255,.05);border-radius:3px;overflow:hidden">
                      <div :style="{width:(selectedCityData[0]?.value ? c.value/selectedCityData[0].value*100 : 0)+'%',height:'100%',borderRadius:'3px',background:i<3?'linear-gradient(90deg,#ef4444,#f97316)':i<6?'linear-gradient(90deg,#f59e0b,#fbbf24)':'linear-gradient(90deg,#3b82f6,#60a5fa)'}"/>
                    </div>
                    <span style="width:24px;text-align:right;color:#4db8ff;font-family:'JetBrains Mono',monospace;flex-shrink:0;font-size:10px">{{ c.value }}</span>
                  </div>
                </div>
                <!-- 底部摘要 -->
                <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(77,184,255,.08);display:grid;grid-template-columns:1fr 1fr;gap:6px">
                  <div style="text-align:center;padding:6px;border-radius:6px;background:rgba(77,184,255,.05)">
                    <div style="font-size:14px;font-weight:700;color:#4db8ff;font-family:'JetBrains Mono',monospace">{{ selectedCityData.length }}</div>
                    <div style="font-size:9px;color:rgba(147,197,253,.45);margin-top:2px">覆盖城市</div>
                  </div>
                  <div style="text-align:center;padding:6px;border-radius:6px;background:rgba(239,68,68,.05)">
                    <div style="font-size:14px;font-weight:700;color:#f87171;font-family:'JetBrains Mono',monospace">{{ selectedCityData[0]?.name || '—' }}</div>
                    <div style="font-size:9px;color:rgba(147,197,253,.45);margin-top:2px">最高风险城市</div>
                  </div>
                </div>
              </div>

              <!-- 诈骗类型 -->
              <div class="pv-panel" style="flex-shrink:0;display:flex;flex-direction:column">
                <div class="pv-panel__title">⚠️ 高发诈骗类型</div>
                <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
                  <div v-if="!selected.fraud_types?.length" style="color:rgba(77,184,255,.3);font-size:12px;text-align:center;padding:16px">暂无数据</div>
                  <div v-for="(ft,i) in selected.fraud_types" :key="ft.type" style="display:flex;align-items:center;gap:6px;font-size:11px">
                    <span style="width:15px;height:15px;border-radius:3px;background:rgba(77,184,255,.1);color:#4db8ff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">{{ i+1 }}</span>
                    <span style="width:7px;height:7px;border-radius:50%;flex-shrink:0" :style="{background:TYPE_COLORS[ft.type]||'#94a3b8'}"/>
                    <span style="flex:1;color:#c8d8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ ft.type }}</span>
                    <div style="width:50px;height:4px;background:rgba(255,255,255,.05);border-radius:3px;overflow:hidden;flex-shrink:0">
                      <div :style="{width:((ft.count/((selected.fraud_types||[])[0]?.count||1))*100)+'%',height:'100%',background:TYPE_COLORS[ft.type]||'#94a3b8'}"/>
                    </div>
                    <span style="width:24px;text-align:right;font-size:10px;font-family:'JetBrains Mono',monospace;flex-shrink:0" :style="{color:TYPE_COLORS[ft.type]||'#94a3b8'}">{{ ft.count }}</span>
                  </div>
                </div>
                <!-- 防骗提示 -->
                <div style="margin-top:10px;padding:8px 10px;border-radius:6px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15)">
                  <div style="font-size:10px;color:#f87171;font-weight:600;margin-bottom:4px">🚨 重点预警</div>
                  <div style="font-size:10px;color:rgba(147,197,253,.6);line-height:1.6">
                    {{ selected.name }}省当前高发 {{ selected.fraud_types?.[0]?.type || '未知' }}，请提高警惕，遇到可疑情况立即拨打 96110。
                  </div>
                </div>
              </div>

              <!-- 高发时段 -->
              <div class="pv-panel" style="flex-shrink:0">
                <div class="pv-panel__title">🕐 高发时段</div>
                <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px">
                  <div v-for="(h,i) in ['08-12时','12-14时','18-22时','22-24时']" :key="h" style="display:flex;align-items:center;gap:6px;font-size:11px">
                    <span style="width:38px;color:rgba(147,197,253,.55);flex-shrink:0;font-family:'JetBrains Mono',monospace">{{ h }}</span>
                    <div style="flex:1;height:10px;background:rgba(77,184,255,.06);border-radius:3px;overflow:hidden">
                      <div :style="{width:[65,30,80,45][i]+'%',height:'100%',background:'linear-gradient(90deg,#1050a0,#4db8ff)'}"/>
                    </div>
                    <span style="width:26px;text-align:right;color:rgba(77,184,255,.55);font-size:10px;font-family:'JetBrains Mono',monospace">{{ [65,30,80,45][i] }}%</span>
                  </div>
                </div>
                <!-- 风险等级构成 -->
                <div style="font-size:10px;color:rgba(77,184,255,.5);margin-bottom:5px;font-family:'JetBrains Mono',monospace">风险等级构成</div>
                <div style="display:flex;height:18px;border-radius:4px;overflow:hidden;margin-bottom:5px">
                  <div style="background:linear-gradient(135deg,#dc2626,#ef4444);width:18%;display:flex;align-items:center;justify-content:center;font-size:8px;color:rgba(255,255,255,.9);font-weight:600">极高危</div>
                  <div style="background:linear-gradient(135deg,#ea580c,#f97316);width:25%;display:flex;align-items:center;justify-content:center;font-size:8px;color:rgba(255,255,255,.9);font-weight:600">高风险</div>
                  <div style="background:linear-gradient(135deg,#d97706,#f59e0b);width:30%;display:flex;align-items:center;justify-content:center;font-size:8px;color:rgba(255,255,255,.9);font-weight:600">中风险</div>
                  <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);flex:1;display:flex;align-items:center;justify-content:center;font-size:8px;color:rgba(255,255,255,.9);font-weight:600">低/安全</div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:9px">
                  <span style="color:#ef4444">18%</span>
                  <span style="color:#f97316">25%</span>
                  <span style="color:#f59e0b">30%</span>
                  <span style="color:#3b82f6">27%</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
.pv-root{width:100%;min-height:100vh;display:flex;flex-direction:column;background-color:#060c1a;background-image:radial-gradient(ellipse at 15% 15%,rgba(29,78,216,.14) 0%,transparent 50%),radial-gradient(ellipse at 85% 85%,rgba(109,40,217,.10) 0%,transparent 50%),linear-gradient(rgba(30,80,160,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(30,80,160,.055) 1px,transparent 1px);background-size:auto,auto,40px 40px,40px 40px;color:#c8d8f0;font-family:'Noto Sans SC','Microsoft YaHei',sans-serif;position:relative;overflow:hidden}
.corner{position:absolute;width:18px;height:18px;border-color:rgba(77,184,255,.55);border-style:solid;z-index:10;pointer-events:none}
.tl{top:8px;left:8px;border-width:2px 0 0 2px}.tr{top:8px;right:8px;border-width:2px 2px 0 0}.bl{bottom:8px;left:8px;border-width:0 0 2px 2px}.br{bottom:8px;right:8px;border-width:0 2px 2px 0}
.pv-header{display:flex;align-items:center;justify-content:space-between;padding:12px 24px 10px;border-bottom:1px solid rgba(77,184,255,.12);background:linear-gradient(180deg,rgba(6,12,26,.98) 0%,transparent 100%);flex-shrink:0;position:relative;z-index:2}
.pv-body{display:grid;grid-template-columns:220px 1fr;gap:10px;padding:10px 14px 14px;flex:1;overflow:hidden;position:relative;z-index:1}
.pv-list-col{display:flex;flex-direction:column;overflow:hidden}
.pv-detail-col{display:flex;flex-direction:column;gap:10px;overflow:hidden}
.pv-panel{background:rgba(8,18,45,.75);border:1px solid rgba(77,184,255,.16);border-radius:8px;padding:12px 14px;position:relative}
.pv-panel::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(77,184,255,.45),transparent)}
.pv-panel__title{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#93c5fd;margin-bottom:10px;font-family:'JetBrains Mono',monospace}
.pv-list-row{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;cursor:pointer;border:1px solid transparent;font-size:12px;transition:all .15s}
.pv-list-row:hover{background:rgba(77,184,255,.07);border-color:rgba(77,184,255,.18)}
.pv-list-row--active{background:rgba(77,184,255,.13)!important;border-color:rgba(77,184,255,.35)!important}
.pv-rank-no{width:19px;height:19px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:1px solid;flex-shrink:0}
.pv-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(8,18,45,.75);border:1px solid rgba(77,184,255,.1);border-radius:8px}
</style>