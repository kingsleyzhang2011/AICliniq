<template>
  <a-modal v-model:open="open" title="全局设置" width="900px" @ok="onSave" ok-text="保存">
    <a-tabs>
      <a-tab-pane key="doctors" tab="医生配置">
        <a-space direction="vertical" style="width: 100%">
          <a-alert type="info" show-icon message="提示" description="可添加多个由不同 LLM 驱动的医生。未填写 API Key 将使用模拟回复。" />
          <draggable v-model="localDoctors" item-key="id" handle=".drag-handle">
            <template #item="{ element, index }">
              <a-card :title="element.name || '未命名医生'" size="small" :extra="extraActions(index)" style="margin-bottom: 8px;">
                <a-row :gutter="8">
                  <a-col :span="6">
                    <a-form-item label="医生名称">
                      <a-input v-model:value="element.name" placeholder="Dr. GPT-4" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="6">
                    <a-form-item label="供应商">
                      <a-select v-model:value="element.provider" style="width: 200px" :options="providerOptions" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="6">
                    <a-form-item label="API Key">
                      <a-input-password v-model:value="element.apiKey" placeholder="sk-..." />
                    </a-form-item>
                  </a-col>
                  <a-col :span="6">
                    <a-form-item label="自定义 Base URL">
                      <a-input v-model:value="element.baseUrl" placeholder="留空使用默认" />
                    </a-form-item>
                  </a-col>
                </a-row>
                <a-row :gutter="8">
                  <a-col :span="12">
                    <a-form-item label="模型名称（可手动输入）">
                      <a-input v-model:value="element.model" placeholder="gpt-4o-mini / claude-3-haiku-20240307 / gemini-1.5-flash" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="选择模型">
                      <div style="display:flex; gap:8px; align-items: flex-start;">
                        <a-select
                          class="model-select"
                          style="flex:1; min-width: 0;"
                          v-model:value="element.model"
                          :options="modelOptions[element.id] || []"
                          show-search
                          :loading="loadingModel[element.id]"
                          placeholder="点击右侧按钮加载模型列表"
                          :dropdown-match-select-width="false"
                        />
                        <a-button :loading="loadingModel[element.id]" style="flex-shrink: 0;" @click="() => loadModels(element)">加载模型</a-button>
                      </div>
                    </a-form-item>
                  </a-col>
                </a-row>
                <a-form-item label="自定义提示词（可选）">
                  <div style="display:flex; gap:8px; margin-bottom: 8px;">
                    <a-select
                      v-model:value="selectedPreset[element.id]"
                      :options="presetPromptOptions"
                      style="flex:1;"
                      placeholder="选择预设提示词"
                      allow-clear
                      @change="(value) => handlePresetSelect(element, value)"
                    />
                  </div>
                  <a-textarea v-model:value="element.customPrompt" rows="2" placeholder="可手动输入或选择上方预设提示词" />
                </a-form-item>
              </a-card>
            </template>
          </draggable>
          <a-button type="dashed" block @click="addDoctor">+ 添加医生</a-button>
        </a-space>
      </a-tab-pane>
      <a-tab-pane key="presets" tab="医生预设提示词">
        <a-space direction="vertical" style="width: 100%">
          <a-alert type="info" show-icon message="医生预设提示词" description="预设各主要科室医生的提示词模板，可在医生配置中快速引用并继续编辑。" />
          <draggable v-model="localPresetPrompts" item-key="id" handle=".drag-handle">
            <template #item="{ element, index }">
              <a-card :title="element.name || '未命名预设'" size="small" :extra="presetExtraActions(index)" style="margin-bottom: 8px;">
                <a-form layout="vertical">
                  <a-form-item label="预设名称">
                    <a-input v-model:value="element.name" placeholder="如：心血管内科医生" />
                  </a-form-item>
                  <a-form-item label="提示词内容">
                    <a-textarea v-model:value="element.prompt" rows="4" placeholder="撰写该科室医生的提示词" />
                  </a-form-item>
                </a-form>
              </a-card>
            </template>
          </draggable>
          <a-button type="dashed" block @click="addPreset">+ 添加预设提示词</a-button>
        </a-space>
      </a-tab-pane>
      <a-tab-pane key="globalSettings" tab="全局参数">
        <a-form layout="vertical">
          <a-form-item label="全局系统提示词">
            <a-textarea v-model:value="localSettings.globalSystemPrompt" rows="6" />
          </a-form-item>
          <a-form-item label="最终总结提示词（默认）">
            <a-textarea v-model:value="localSettings.summaryPrompt" rows="6" />
          </a-form-item>
          <a-form-item label="发言顺序">
            <a-radio-group v-model:value="localSettings.turnOrder">
              <a-radio value="random">随机</a-radio>
              <a-radio value="custom">自定义（按医生列表顺序）</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item label="连续未标注不太准确的最大轮数">
            <a-input-number v-model:value="localSettings.maxRoundsWithoutElimination" :min="1" />
          </a-form-item>
        </a-form>
      </a-tab-pane>
      <a-tab-pane key="imageRecognition" tab="图片识别">
        <a-form layout="vertical">
          <a-form-item>
            <a-switch v-model:checked="localImageRecognition.enabled" />
            <span style="margin-left: 8px;">启用图像识别功能</span>
          </a-form-item>
          <template v-if="localImageRecognition.enabled">
            <a-alert type="info" show-icon message="使用硅基流动的图片识别API" description="请选择支持图片识别的模型，并填写相应的API Key。" style="margin-bottom: 16px;" />
            <a-row :gutter="8">
              <a-col :span="8">
                <a-form-item label="供应商">
                  <a-select v-model:value="localImageRecognition.provider" disabled>
                    <a-select-option value="siliconflow">硅基流动</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="API Key">
                  <a-input-password v-model:value="localImageRecognition.apiKey" placeholder="sk-..." />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="最大并发识别数">
                  <a-input-number v-model:value="localImageRecognition.maxConcurrent" :min="1" :max="10" style="width: 100%" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="8">
              <a-col :span="12">
                <a-form-item label="模型名称（可手动输入）">
                  <a-input v-model:value="localImageRecognition.model" placeholder="Pro/Qwen/Qwen2-VL-72B-Instruct" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="选择模型">
                  <div style="display:flex; gap:8px; align-items: flex-start;">
                    <a-select
                      style="flex:1; min-width: 0;"
                      v-model:value="localImageRecognition.model"
                      :options="imageModelOptions"
                      show-search
                      :loading="loadingImageModel"
                      placeholder="点击右侧按钮加载模型列表"
                      :dropdown-match-select-width="false"
                    />
                    <a-button :loading="loadingImageModel" style="flex-shrink: 0;" @click="loadImageModels">加载模型</a-button>
                  </div>
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="8">
              <a-col :span="12">
                <a-form-item label="自定义 Base URL">
                  <a-input v-model:value="localImageRecognition.baseUrl" placeholder="留空使用默认" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="测试工具">
                  <div class="test-controls">
                    <a-upload
                      :before-upload="handleTestImageUpload"
                      :show-upload-list="false"
                      accept="image/*"
                    >
                      <a-button size="small">
                        <template #icon>📷</template>
                        选择测试图片
                      </a-button>
                    </a-upload>
                    <a-button type="primary" :loading="testingImageAPI" @click="testImageAPI">测试图像识别API</a-button>
                  </div>
                  <div v-if="testImage" class="test-preview">
                    <img :src="testImage.preview" alt="测试图片" />
                    <div class="test-preview-info">
                      <div class="name">{{ testImage.name }}</div>
                      <a-button type="link" size="small" danger @click="removeTestImage">移除</a-button>
                    </div>
                  </div>
                  <div class="test-tip">
                    {{ testImage ? '将使用上传的图片进行测试' : '若未上传测试图片，将使用默认示例图片' }}
                  </div>
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="图像识别提示词">
              <a-textarea v-model:value="localImageRecognition.prompt" rows="4" placeholder="描述图像识别的需求..." />
            </a-form-item>
          </template>
        </a-form>
      </a-tab-pane>
      <a-tab-pane key="importExport" tab="导入导出">
        <a-space direction="vertical" style="width: 100%" :size="24">
          <a-card title="导出设置" size="small">
            <a-space direction="vertical" style="width: 100%">
              <a-alert type="info" show-icon message="导出设置" description="选择要导出的配置项，导出为JSON文件。" />
              <a-checkbox-group v-model:value="exportSelection" style="width: 100%">
                <a-space direction="vertical" style="width: 100%">
                  <a-checkbox value="doctors">医生配置</a-checkbox>
                  <a-checkbox value="presetPrompts">医生预设提示词</a-checkbox>
                  <a-checkbox value="settings">全局设置</a-checkbox>
                  <a-checkbox value="imageRecognition">图片识别</a-checkbox>
                </a-space>
              </a-checkbox-group>
              <a-button type="primary" @click="handleExport" :disabled="exportSelection.length === 0">
                导出选中项
              </a-button>
            </a-space>
          </a-card>
          <a-card title="导入设置" size="small">
            <a-space direction="vertical" style="width: 100%">
              <a-alert type="info" show-icon message="导入设置" description="选择JSON文件导入配置。如果文件中包含某项配置，将自动导入并覆盖现有配置。" />
              <a-upload
                :before-upload="handleImport"
                :show-upload-list="false"
                accept=".json"
              >
                <a-button type="primary">
                  <template #icon>📁</template>
                  选择JSON文件导入
                </a-button>
              </a-upload>
            </a-space>
          </a-card>
        </a-space>
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<script setup>
import { ref, watch, h, resolveComponent, computed } from 'vue'
import draggable from 'vuedraggable'
import { useConsultStore } from '../store'
import { useGlobalStore } from '../store/global'
import { message } from 'ant-design-vue'
import { listModels } from '../api/models'
import { recognizeImageWithSiliconFlow } from '../api/imageRecognition'

const store = useConsultStore()
const global = useGlobalStore()

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['update:open'])

const open = ref(props.open)
watch(
  () => props.open,
  (v) => (open.value = v)
)
watch(open, (v) => emit('update:open', v))

const providerOptions = [
  { label: 'OpenAI规范', value: 'openai' },
  { label: 'Anthropic规范', value: 'anthropic' },
  { label: 'Gemini规范', value: 'gemini' },
  { label: '硅基流动', value: 'siliconflow' },
  { label: '魔搭社区', value: 'modelscope' },
  { label: '多模态智能引擎', value: 'LifeGuard' }
]

const localDoctors = ref(JSON.parse(JSON.stringify(global.doctors)))
const localSettings = ref(JSON.parse(JSON.stringify(store.settings)))
const localImageRecognition = ref(JSON.parse(JSON.stringify(global.imageRecognition || {})))
const localPresetPrompts = ref(JSON.parse(JSON.stringify(global.presetPrompts || [])))
const selectedPreset = ref({})
const modelOptions = ref({})
const loadingModel = ref({})
const imageModelOptions = ref([])
const loadingImageModel = ref(false)
const testingImageAPI = ref(false)
const testImage = ref(null)
const exportSelection = ref([])

watch(
  () => props.open,
  (v) => {
    if (v) {
      localDoctors.value = JSON.parse(JSON.stringify(global.doctors))
      localSettings.value = JSON.parse(JSON.stringify(store.settings))
      localImageRecognition.value = {
        maxConcurrent: 1,
        ...JSON.parse(JSON.stringify(global.imageRecognition || {}))
      }
      localPresetPrompts.value = JSON.parse(JSON.stringify(global.presetPrompts || []))
      selectedPreset.value = {}
      imageModelOptions.value = []
      loadingImageModel.value = false
      testingImageAPI.value = false
      testImage.value = null
      exportSelection.value = []
    }
  }
)

const presetPromptOptions = computed(() => {
  return (localPresetPrompts.value || []).map((p) => ({
    label: p.name || '未命名预设',
    value: p.id
  }))
})

function addDoctor() {
  const id = `doc-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`
  localDoctors.value.push({ id, name: '', provider: 'openai', model: 'gpt-4o-mini', apiKey: '', baseUrl: '', customPrompt: '' })
}

function removeDoctor(idx) {
  const target = localDoctors.value[idx]
  if (target) {
    const copy = { ...selectedPreset.value }
    delete copy[target.id]
    selectedPreset.value = copy
  }
  localDoctors.value.splice(idx, 1)
}

function handlePresetSelect(doctor, presetId) {
  if (!presetId) {
    const copy = { ...selectedPreset.value }
    delete copy[doctor?.id]
    selectedPreset.value = copy
    return
  }
  const preset = (localPresetPrompts.value || []).find((p) => p.id === presetId)
  if (!preset) {
    message.warning('所选预设不存在')
    return
  }
  doctor.customPrompt = preset.prompt || ''
  message.success(`已应用预设提示词：${preset.name || '未命名预设'}`)
  const copy = { ...selectedPreset.value }
  delete copy[doctor.id]
  selectedPreset.value = copy
}

function addPreset() {
  const id = `preset-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`
  localPresetPrompts.value.push({ id, name: '', prompt: '' })
}

function removePreset(idx) {
  const removed = localPresetPrompts.value[idx]
  localPresetPrompts.value.splice(idx, 1)
  if (removed) {
    const copy = { ...selectedPreset.value }
    Object.keys(copy).forEach((doctorId) => {
      if (copy[doctorId] === removed.id) {
        delete copy[doctorId]
      }
    })
    selectedPreset.value = copy
  }
}

async function loadModels(element) {
  const id = element.id
  loadingModel.value = { ...loadingModel.value, [id]: true }
  try {
    const options = await listModels(element.provider, element.apiKey, element.baseUrl)
    modelOptions.value = { ...modelOptions.value, [id]: options }
    if (!options.find((o) => o.value === element.model) && options.length) {
      // keep current value; do not override automatically
    }
    message.success('模型列表已加载')
  } catch (e) {
    message.error(`加载模型失败：${e?.message || e}`)
  } finally {
    loadingModel.value = { ...loadingModel.value, [id]: false }
  }
}

function extraActions(idx) {
  const AButton = resolveComponent('a-button')
  return h(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
    [
      h('span', { class: 'drag-handle', style: { cursor: 'move' }, title: '拖动排序' }, '⋮⋮'),
      h(
        AButton,
        { type: 'link', danger: true, onClick: () => removeDoctor(idx) },
        { default: () => '删除' }
      )
    ]
  )
}

function presetExtraActions(idx) {
  const AButton = resolveComponent('a-button')
  const APopconfirm = resolveComponent('a-popconfirm')
  return h(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
    [
      h('span', { class: 'drag-handle', style: { cursor: 'move' }, title: '拖动排序' }, '⋮⋮'),
      h(
        APopconfirm,
        { title: '确认删除此预设？', onConfirm: () => removePreset(idx) },
        {
          default: () => h(AButton, { type: 'link', danger: true }, { default: () => '删除' })
        }
      )
    ]
  )
}

async function loadImageModels() {
  if (!localImageRecognition.value.apiKey) {
    message.warning('请先填写 API Key')
    return
  }
  loadingImageModel.value = true
  try {
    const options = await listModels(
      localImageRecognition.value.provider,
      localImageRecognition.value.apiKey,
      localImageRecognition.value.baseUrl
    )
    imageModelOptions.value = options
    message.success('图像识别模型列表已加载')
  } catch (e) {
    message.error(`加载图像识别模型失败：${e?.message || e}`)
  } finally {
    loadingImageModel.value = false
  }
}

async function handleTestImageUpload(file) {
  try {
    const reader = new FileReader()
    reader.onload = (e) => {
      const fullData = e.target.result
      let base64Only = ''
      if (typeof fullData === 'string') {
        const parts = fullData.split(',')
        base64Only = parts.length > 1 ? parts[1] : parts[0]
      }
      testImage.value = {
        name: file.name,
        preview: fullData,
        base64: base64Only
      }
      message.success(`已选择测试图片：${file.name}`)
    }
    reader.readAsDataURL(file)
  } catch (err) {
    message.error('读取图片失败')
  }
  return false
}

function removeTestImage() {
  testImage.value = null
}

async function testImageAPI() {
  if (!localImageRecognition.value.apiKey) {
    message.warning('请先填写 API Key')
    return
  }
  if (!localImageRecognition.value.model) {
    message.warning('请先选择模型')
    return
  }
  testingImageAPI.value = true
  try {
    const defaultTestImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const imageBase64 = testImage.value?.base64 || defaultTestImage
    const result = await recognizeImageWithSiliconFlow({
      apiKey: localImageRecognition.value.apiKey,
      baseUrl: localImageRecognition.value.baseUrl,
      model: localImageRecognition.value.model,
      prompt: localImageRecognition.value.prompt || '请描述这张图片',
      imageBase64
    })
    message.success(`API 测试成功，识别结果：${result}`, 5)
  } catch (e) {
    message.error(`API 测试失败：${e?.message || e}`)
  } finally {
    testingImageAPI.value = false
  }
}

function handleExport() {
  if (exportSelection.value.length === 0) {
    message.warning('请至少选择一项要导出的配置')
    return
  }
  
  const exportData = {}
  
  if (exportSelection.value.includes('doctors')) {
    exportData.doctors = localDoctors.value
  }
  
  if (exportSelection.value.includes('presetPrompts')) {
    exportData.presetPrompts = localPresetPrompts.value
  }
  
  if (exportSelection.value.includes('settings')) {
    exportData.settings = localSettings.value
  }
  
  if (exportSelection.value.includes('imageRecognition')) {
    exportData.imageRecognition = localImageRecognition.value
  }
  
  const jsonStr = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  link.download = `settings-export-${timestamp}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  message.success('设置已导出')
}

function handleImport(file) {
  const reader = new FileReader()
  
  reader.onload = (e) => {
    try {
      const content = e.target.result
      const importData = JSON.parse(content)
      
      let importedItems = []
      
      if (importData.doctors) {
        localDoctors.value = JSON.parse(JSON.stringify(importData.doctors))
        importedItems.push('医生配置')
      }
      
      if (importData.presetPrompts) {
        localPresetPrompts.value = JSON.parse(JSON.stringify(importData.presetPrompts))
        importedItems.push('医生预设提示词')
      }
      
      if (importData.settings) {
        localSettings.value = { ...localSettings.value, ...importData.settings }
        importedItems.push('全局设置')
      }
      
      if (importData.imageRecognition) {
        localImageRecognition.value = {
          maxConcurrent: 1,
          ...JSON.parse(JSON.stringify(importData.imageRecognition))
        }
        importedItems.push('图片识别')
      }
      
      if (importedItems.length > 0) {
        message.success(`已导入：${importedItems.join('、')}`)
      } else {
        message.warning('导入文件中没有可识别的配置项')
      }
    } catch (err) {
      message.error('导入失败：文件格式不正确或内容无效')
    }
  }
  
  reader.onerror = () => {
    message.error('读取文件失败')
  }
  
  reader.readAsText(file)
  return false
}

function onSave() {
  global.setDoctors(localDoctors.value)
  global.setPresetPrompts(localPresetPrompts.value)
  global.setImageRecognition(localImageRecognition.value)
  store.setSettings(localSettings.value)
  message.success('已保存全局设置')
  open.value = false
}
</script>

<style scoped>
.model-select {
  max-width: 100%;
}

.model-select :deep(.ant-select-selector) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.test-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.test-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.test-preview img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.test-preview-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.test-tip {
  font-size: 12px;
  color: #8c8c8c;
}
</style>
