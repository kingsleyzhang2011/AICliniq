<template>
  <div class="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
    <!-- Header -->
    <header class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          智能健康档案 (Dashboard)
        </h1>
        <p class="text-gray-500 text-sm mt-1">自动跟踪化验单指标与健康状况趋势预测</p>
      </div>
      <button @click="router.push('/ocr')" class="px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition">
        + 录入新化验单
      </button>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="records.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
      <div class="mx-auto w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-700">暂无健康数据追踪</h3>
      <p class="text-gray-500 mt-2">请使用【智能扫单】功能上传您的化验单，系统将自动开始为您汇编体征大屏。</p>
      <button @click="router.push('/ocr')" class="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
        立即扫单
      </button>
    </div>

    <template v-else>
      <!-- Controls -->
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
        <label class="font-medium text-gray-700 flex-shrink-0">请选择追踪的体征指标:</label>
        <select v-model="selectedIndicator" class="border border-gray-200 rounded-lg p-2 flex-1 max-w-sm focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 bg-gray-50">
          <option v-for="indicator in uniqueIndicators" :key="indicator" :value="indicator">
            {{ indicator }}
          </option>
        </select>
        <span class="text-sm text-gray-400">目前共收录 {{ uniqueIndicators.length }} 种生命体征指标</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Chart Section -->
        <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-800 text-lg">{{ selectedIndicator }} - 历史波动曲线</h3>
            <span class="text-xs bg-gray-100 text-gray-500 py-1 px-3 rounded-full">数值型指标可视化</span>
          </div>
          
          <div v-if="hasValidChartData" class="flex-1 w-full min-h-[300px] relative">
            <Line :data="chartData" :options="chartOptions" />
          </div>
          <div v-else class="flex-1 min-h-[300px] flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <p>该指标为非数值数据（如阴阳性属性），无法生成折线图，详情请看下方流水账。</p>
          </div>
        </div>

        <!-- AI Analyst Section -->
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col rounded-xl shadow-sm border border-blue-100 p-6">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-2xl">🤖</span>
            <h3 class="font-semibold text-indigo-900 text-lg">AI 自动趋势评估</h3>
          </div>
          
          <div v-if="analyzing" class="flex-1 flex flex-col justify-center items-center text-indigo-400 py-10">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3"></div>
            <span class="text-sm font-medium">全科 AI 正在统合分析该项数据流...</span>
          </div>

          <div v-else class="flex-1 text-sm text-gray-800 leading-relaxed overflow-y-auto max-h-64 whitespace-pre-wrap bg-white/60 p-4 rounded-lg border border-white backdrop-blur-sm">
            {{ aiSummary || '数据点不足以形成多轮评估结论。' }}
          </div>

          <button 
             v-if="!analyzing" 
             @click="router.push('/chat')" 
             class="mt-4 w-full px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition">
             携此病历发起多科室会诊
          </button>
        </div>
      </div>

      <!-- Data Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 class="font-semibold text-gray-800">全部原始解析流水账</h3>
          <span class="text-xs text-gray-400">按照录入时间倒序排列</span>
        </div>
        <div class="overflow-x-auto max-h-96 overflow-y-auto">
          <table class="w-full text-sm text-left text-gray-500">
            <thead class="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 shadow-sm z-10">
              <tr>
                <th scope="col" class="px-6 py-3">录单时间</th>
                <th scope="col" class="px-6 py-3">指标名称</th>
                <th scope="col" class="px-6 py-3">结果值</th>
                <th scope="col" class="px-6 py-3">单位</th>
                <th scope="col" class="px-6 py-3">参考范围</th>
                <th scope="col" class="px-6 py-3 text-center">状态稽核</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in sortedRecords" :key="row.id" class="bg-white border-b hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4">{{ formatDate(row.created_at) }}</td>
                <td class="px-6 py-4 font-medium" :class="row.is_abnormal ? 'text-red-600' : 'text-gray-900'">
                  {{ row.indicator_name }}
                </td>
                <td class="px-6 py-4 font-semibold text-gray-800">{{ row.raw_content?.value || row.value }}</td>
                <td class="px-6 py-4">{{ row.unit || '-' }}</td>
                <td class="px-6 py-4 text-gray-400">{{ row.reference_range || '-' }}</td>
                <td class="px-6 py-4 text-center">
                  <span v-if="row.is_abnormal" class="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                    偏离正常
                  </span>
                  <span v-else class="px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold border border-green-200">
                    正常指标
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { useUserStore } from '../stores/useUserStore'
import { callWithFallback } from '../services/ai'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const records = ref([])
const selectedIndicator = ref('')

const analyzing = ref(false)
const aiSummary = ref('')

onMounted(async () => {
  if (!userStore.user) return router.push('/login')
  
  await fetchRecords()
})

async function fetchRecords() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('health_records')
      .select('*')
      .eq('user_id', userStore.user.id)
      .order('created_at', { ascending: false })
      
    if (error) throw error
    
    records.value = data || []
    
    if (records.value.length > 0 && uniqueIndicators.value.length > 0) {
      // 默认选择第一个异常值最多的指标，如果没有则选第一个
      const absCount = {}
      records.value.forEach(r => {
        if (r.is_abnormal) absCount[r.indicator_name] = (absCount[r.indicator_name] || 0) + 1
      })
      const sortedAbs = Object.keys(absCount).sort((a,b) => absCount[b] - absCount[a])
      
      selectedIndicator.value = sortedAbs.length > 0 ? sortedAbs[0] : uniqueIndicators.value[0]
    }
  } catch (err) {
    console.error('Failed to load health records:', err)
  } finally {
    loading.value = false
  }
}

const sortedRecords = computed(() => {
  return [...records.value]
})

const uniqueIndicators = computed(() => {
  const set = new Set(records.value.map(r => r.indicator_name))
  return Array.from(set).sort()
})

// 时间正序（从旧到新），画图需要
const currentIndicatorDataAsc = computed(() => {
  const filtered = records.value.filter(r => r.indicator_name === selectedIndicator.value)
  return filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
})

const hasValidChartData = computed(() => {
  const dataPoints = currentIndicatorDataAsc.value.map(r => r.value)
  return dataPoints.some(v => v !== 0) || dataPoints.length === 0
})

const chartData = computed(() => {
  if (!currentIndicatorDataAsc.value.length) return { labels: [], datasets: [] }
  
  const labels = currentIndicatorDataAsc.value.map(r => formatDateShort(r.created_at))
  const dataPoints = currentIndicatorDataAsc.value.map(r => r.value)
  const colors = currentIndicatorDataAsc.value.map(r => r.is_abnormal ? '#ef4444' : '#3b82f6')
  
  return {
    labels,
    datasets: [
      {
        label: selectedIndicator.value,
        backgroundColor: '#3b82f6', // blue-500
        borderColor: '#93c5fd', // lighter blue line
        pointBackgroundColor: colors,
        pointBorderColor: '#fff',
        pointRadius: 6,
        borderWidth: 3,
        fill: false,
        tension: 0.4, // 平滑曲线
        data: dataPoints
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { 
      mode: 'index', 
      intersect: false,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#1f2937',
      bodyColor: '#4b5563',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      padding: 10,
      boxPadding: 4,
      callbacks: {
        label: function(context) {
          const item = currentIndicatorDataAsc.value[context.dataIndex];
          const unit = item.unit || '';
          const status = item.is_abnormal ? '(偏离正常)' : '';
          return `${context.dataset.label}: ${context.parsed.y} ${unit} ${status}`;
        }
      }
    }
  },
  scales: {
    y: { 
      beginAtZero: false,
      grace: '15%',
      grid: {
        color: '#f3f4f6'
      }
    },
    x: {
      grid: {
        display: false
      }
    }
  }
}

// AI 趋势分析预审
watch(selectedIndicator, async (newVal) => {
  if (!newVal) return
  const dataList = currentIndicatorDataAsc.value
  
  if (dataList.length < 2) {
    aiSummary.value = '🔬 本项体征目前只有【单次检测记录】，AI 无法形成历史对比结论。\n建议：后续可以定期复查并扫描化验单，获取连续的趋势预测。'
    return
  }
  
  analyzing.value = true
  aiSummary.value = ''
  
  const recentValuesStr = dataList.slice(-6).map(r => `${formatDateShort(r.created_at)} = ${r.raw_content?.value || r.value}`).join(' -> ')
  
  const sysPrompt = `你是一名资深的临床数据分析专家。
目标：帮助非专业的患者理解单项化验指标波动的临床意义。

当前用户查询指标：【${newVal}】
对应单位：${dataList[dataList.length-1].unit || '无'}
参考范围：${dataList[dataList.length-1].reference_range || '未提供'}
近期历史数据走向：${recentValuesStr}

请以专业、极其简练、通俗的口语（总计不超过150字）回答：
1. 你的初步判断：趋势是在向好，还是提示潜在风险？
2. 近期最新数据的状态是否正常？
3. (如果存在风险) 给出一条非常具体的复诊或生活常识提醒。不要使用套话。`

  try {
    const res = await callWithFallback(sysPrompt, `请进行极简的专项趋势预审分析。`, [], [], { role: 'SUMMARY' })
    aiSummary.value = res.trim()
  } catch (err) {
    console.error('[Dashboard] AI summary failed:', err)
    aiSummary.value = '当前网络模型繁忙，暂无法生成体检解读报告。您可以点击下方按钮进入多名医生的主讨论室。'
  } finally {
    analyzing.value = false
  }
}, { immediate: true })

// 工具函数
function formatDate(isoStr) {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function formatDateShort(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}
</style>
