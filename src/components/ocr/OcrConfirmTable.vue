<!-- src/components/ocr/OcrConfirmTable.vue -->
<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
      <div>
        <h3 class="text-lg font-semibold text-gray-800">提取结果校验</h3>
        <p class="text-sm text-gray-500">请核对 AI 提取或标记有误的数据。确认无误后即可保存。</p>
      </div>
      <div>
        <!-- Summary tags (optional) -->
        <span class="text-xs font-medium px-2.5 py-1 rounded bg-blue-100 text-blue-800">
          共识别 {{ records.length }} 项
        </span>
      </div>
    </div>

    <!-- Table content -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left text-gray-700">
        <thead class="text-xs text-gray-500 bg-gray-50 uppercase">
          <tr>
            <th scope="col" class="px-6 py-3">指标名称</th>
            <th scope="col" class="px-6 py-3 w-32">结果数值</th>
            <th scope="col" class="px-6 py-3 w-24">单位</th>
            <th scope="col" class="px-6 py-3 w-32">参考区间</th>
            <th scope="col" class="px-6 py-3 w-24">异常标记</th>
            <th scope="col" class="px-6 py-3 w-16">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(row, index) in localRecords" 
            :key="row.__id"
            class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
            :class="{ 'bg-red-50/30': row.is_abnormal }"
          >
            <td class="px-6 py-3 font-medium text-gray-900">
              <input v-if="editingIndex === index" v-model="row.indicator_name" class="border rounded px-2 py-1 w-full" />
              <span v-else>{{ row.indicator_name }}</span>
            </td>
            <td class="px-6 py-3">
              <input v-if="editingIndex === index" v-model="row.value" class="border rounded px-2 py-1 w-full" />
              <span v-else :class="{ 'text-red-600 font-bold': row.is_abnormal }">{{ row.value }}</span>
            </td>
            <td class="px-6 py-3">
              <input v-if="editingIndex === index" v-model="row.unit" class="border rounded px-2 py-1 w-full" />
              <span v-else class="text-gray-500">{{ row.unit || '-' }}</span>
            </td>
            <td class="px-6 py-3">
              <input v-if="editingIndex === index" v-model="row.reference_range" class="border rounded px-2 py-1 w-full" />
              <span v-else class="text-gray-500">{{ row.reference_range || '-' }}</span>
            </td>
            <td class="px-6 py-3">
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" v-model="row.is_abnormal" class="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50" />
                <span class="ml-2 text-xs" :class="row.is_abnormal ? 'text-red-500 font-medium' : 'text-gray-400'">异常</span>
              </label>
            </td>
            <td class="px-6 py-3 text-right">
              <button 
                v-if="editingIndex === index"
                @click="editingIndex = null; emitUpdate()" 
                class="text-blue-600 hover:text-blue-900 font-medium text-xs"
              >完成</button>
              <button 
                v-else
                @click="editingIndex = index"
                class="text-gray-400 hover:text-blue-600 font-medium text-xs"
              >编辑</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-if="localRecords.length === 0" class="p-8 text-center text-gray-500">
      <p>未能提取到有效数据</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  records: {
    type: Array,
    required: true,
    default: () => []
  }
})

const emit = defineEmits(['update:records'])

const localRecords = ref([])
const editingIndex = ref(null)

// 深度克隆以便在内部双向绑定
watch(() => props.records, (newVal) => {
  localRecords.value = JSON.parse(JSON.stringify(newVal))
}, { immediate: true, deep: true })

// 当勾选/结束编辑时向上层同步
function emitUpdate() {
  emit('update:records', localRecords.value)
}

// 监听内部异常状态等不需要显式点击“完成”即可生效的变化
watch(() => localRecords.value, () => {
  if (editingIndex.value === null) {
    emitUpdate()
  }
}, { deep: true })
</script>
