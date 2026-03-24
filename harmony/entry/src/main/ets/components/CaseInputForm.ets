import { ConsultViewModel, getConsultViewModel } from '../common/stores/ConsultViewModel'
import { ImageRecognitionService } from '../common/services/ImageRecognitionService'
import { GlobalConfigStore, getGlobalConfigStore } from '../common/stores/GlobalConfigStore'
import { ImagePickerHelper } from '../common/utils/ImagePickerHelper'
import { Logger } from '../common/utils/Logger'
import { PatientCase, ImageRecognition } from '../common/models/index'

const TAG = 'CaseInputForm'

@Component
export struct CaseInputForm {
  @ObservedObject viewModel: ConsultViewModel = getConsultViewModel()
  @ObservedObject configStore: GlobalConfigStore = getGlobalConfigStore()
  @State form: Partial<PatientCase> = {}
  @State uploadedImages: ImageRecognition[] = []
  @State isRecognizing: boolean = false
  @State recognizingCount: number = 0
  @State queuedCount: number = 0

  aboutToAppear() {
    this.form = {
      name: this.viewModel.patientCase.name,
      gender: this.viewModel.patientCase.gender,
      age: this.viewModel.patientCase.age,
      pastHistory: this.viewModel.patientCase.pastHistory,
      currentProblem: this.viewModel.patientCase.currentProblem
    }
    this.uploadedImages = [...this.viewModel.patientCase.imageRecognitions]
    this.updateRecognitionCounts()
  }

  updateRecognitionCounts() {
    this.recognizingCount = this.uploadedImages.filter(img => img.status === 'recognizing').length
    this.queuedCount = this.uploadedImages.filter(img => img.status === 'queued').length
  }

  async handleImageUpload() {
    try {
      const picked = await ImagePickerHelper.pickImages()
      
      for (const image of picked) {
        const newImage = new ImageRecognition({
          id: `img-${Date.now()}-${Math.random()}`,
          name: image.name,
          dataUrl: `data:image/jpeg;base64,${image.base64}`,
          status: 'queued',
          createdAt: Date.now()
        })
        
        this.uploadedImages = [...this.uploadedImages, newImage]
      }
      
      this.viewModel.setPatientCase({
        imageRecognitions: this.uploadedImages
      })
      
      this.updateRecognitionCounts()
      
      // Start recognition for queued images
      this.processImageQueue()
    } catch (e) {
      Logger.error(TAG, `Failed to pick images: ${e}`)
    }
  }

  async processImageQueue() {
    if (this.isRecognizing) return
    
    const config = this.configStore.imageRecognition
    if (!config.enabled || !config.apiKey) {
      Logger.warn(TAG, 'Image recognition not configured')
      return
    }

    this.isRecognizing = true

    for (let i = 0; i < this.uploadedImages.length; i++) {
      const image = this.uploadedImages[i]
      if (image.status !== 'queued') continue

      try {
        // Update status to recognizing
        this.uploadedImages[i] = new ImageRecognition({
          ...image,
          status: 'recognizing'
        })
        this.uploadedImages = [...this.uploadedImages]
        this.updateRecognitionCounts()

        // Extract base64 from data URL
        const base64 = image.dataUrl?.replace(/^data:image\/\w+;base64,/, '') || ''

        // Call recognition service
        const result = await ImageRecognitionService.recognizeImageWithSiliconFlow({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
          prompt: config.prompt,
          imageBase64: base64
        })

        // Update with success
        this.uploadedImages[i] = new ImageRecognition({
          ...image,
          status: 'success',
          result
        })
      } catch (e) {
        Logger.error(TAG, `Recognition failed for image ${i}: ${e}`)
        this.uploadedImages[i] = new ImageRecognition({
          ...image,
          status: 'error',
          error: (e as Error).message || 'Recognition failed'
        })
      }

      this.uploadedImages = [...this.uploadedImages]
      this.updateRecognitionCounts()
    }

    this.isRecognizing = false
    
    // Update the viewModel with new images
    this.viewModel.setPatientCase({
      imageRecognitions: this.uploadedImages
    })
  }

  removeImage(index: number) {
    this.uploadedImages = this.uploadedImages.filter((_, i) => i !== index)
    this.viewModel.setPatientCase({
      imageRecognitions: this.uploadedImages
    })
    this.updateRecognitionCounts()
  }

  build() {
    Column() {
      // Header
      Row() {
        Text('病例输入')
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
      }
      .width('100%')
      .height(40)
      .padding({ left: 12, right: 12 })
      .alignItems(VerticalAlign.Center)
      .borderBottomColor('#f0f0f0')
      .borderBottomWidth(1)

      // Form content
      Scroll() {
        Column() {
          // Patient name
          Column() {
            Text('患者名称')
              .fontSize(12)
              .fontColor('#8c8c8c')
              .margin({ bottom: 4 })

            TextInput({ placeholder: '请输入患者名称' })
              .width('100%')
              .height(36)
              .padding({ left: 8, right: 8 })
              .border({ width: 1, color: '#d9d9d9' })
              .borderRadius(2)
              .onChange((value) => {
                this.form.name = value
                this.viewModel.setPatientCase({ name: value })
              })
          }
          .width('100%')
          .margin({ bottom: 12 })

          // Gender and Age
          Row() {
            Column() {
              Text('性别')
                .fontSize(12)
                .fontColor('#8c8c8c')
                .margin({ bottom: 4 })

              Select([
                { value: '男' },
                { value: '女' },
                { value: '其他' }
              ])
                .value(this.form.gender === 'male' ? '男' : this.form.gender === 'female' ? '女' : '其他')
                .onSelect((index) => {
                  const genderMap = ['male', 'female', 'other']
                  this.form.gender = genderMap[index]
                  this.viewModel.setPatientCase({ gender: genderMap[index] })
                })
                .width('100%')
                .height(36)
            }
            .layoutWeight(1)
            .margin({ right: 8 })

            Column() {
              Text('年龄')
                .fontSize(12)
                .fontColor('#8c8c8c')
                .margin({ bottom: 4 })

              TextInput({ placeholder: '请输入年龄' })
                .width('100%')
                .height(36)
                .padding({ left: 8, right: 8 })
                .border({ width: 1, color: '#d9d9d9' })
                .borderRadius(2)
                .type(InputType.Number)
                .onChange((value) => {
                  const age = value ? parseInt(value) : null
                  this.form.age = age
                  this.viewModel.setPatientCase({ age })
                })
            }
            .layoutWeight(1)
          }
          .width('100%')
          .margin({ bottom: 12 })
          .gap(8)

          // Past history
          Column() {
            Text('既往疾病')
              .fontSize(12)
              .fontColor('#8c8c8c')
              .margin({ bottom: 4 })

            TextInput({ placeholder: '既往疾病、手术史、用药史等' })
              .width('100%')
              .height(80)
              .padding(8)
              .border({ width: 1, color: '#d9d9d9' })
              .borderRadius(2)
              .onChange((value) => {
                this.form.pastHistory = value
                this.viewModel.setPatientCase({ pastHistory: value })
              })
          }
          .width('100%')
          .margin({ bottom: 12 })

          // Current problem
          Column() {
            Text('本次问题 *')
              .fontSize(12)
              .fontColor('#8c8c8c')
              .margin({ bottom: 4 })

            TextInput({ placeholder: '主诉与现病史' })
              .width('100%')
              .height(100)
              .padding(8)
              .border({ width: 1, color: '#d9d9d9' })
              .borderRadius(2)
              .onChange((value) => {
                this.form.currentProblem = value
                this.viewModel.setPatientCase({ currentProblem: value })
              })
          }
          .width('100%')
          .margin({ bottom: 12 })

          // Image upload section
          if (this.configStore.imageRecognition.enabled) {
            Column() {
              Row() {
                Text('病灶图片')
                  .fontSize(12)
                  .fontColor('#8c8c8c')
              }
              .width('100%')
              .margin({ bottom: 8 })

              Button('📷 上传图片')
                .width('100%')
                .height(36)
                .backgroundColor(this.isRecognizing ? '#d9d9d9' : '#1890ff')
                .enabled(!this.isRecognizing)
                .onClick(() => this.handleImageUpload())

              // Status messages
              if (this.recognizingCount > 0) {
                Text(`正在识别 ${this.recognizingCount} 张图片，队列中等待 ${this.queuedCount} 张`)
                  .fontSize(12)
                  .fontColor('#1890ff')
                  .margin({ top: 8 })
              } else if (this.queuedCount > 0) {
                Text(`已加入识别队列，待识别图片 ${this.queuedCount} 张`)
                  .fontSize(12)
                  .fontColor('#faad14')
                  .margin({ top: 8 })
              }

              // Image list
              if (this.uploadedImages.length > 0) {
                Column() {
                  ForEach(this.uploadedImages, (image: ImageRecognition, index: number) => {
                    Row() {
                      Column() {
                        Text(`图片 ${index + 1}`)
                          .fontSize(12)
                          .fontWeight(FontWeight.Bold)
                          .width('100%')
                          .margin({ bottom: 4 })

                        if (image.status === 'recognizing') {
                          Row() {
                            Text('⏳ 识别中...')
                              .fontSize(12)
                              .fontColor('#1890ff')
                          }
                        } else if (image.status === 'queued') {
                          Text('⏳ 排队中，等待识别')
                            .fontSize(12)
                            .fontColor('#faad14')
                        } else if (image.status === 'success' && image.result) {
                          Column() {
                            Text('✓ 识别成功')
                              .fontSize(12)
                              .fontColor('#52c41a')
                              .margin({ bottom: 4 })

                            Text(image.result)
                              .fontSize(12)
                              .fontColor('#262626')
                              .maxLines(3)
                              .textOverflow({ overflow: TextOverflow.Ellipsis })
                          }
                          .width('100%')
                        } else if (image.status === 'error') {
                          Column() {
                            Text('✗ 识别失败')
                              .fontSize(12)
                              .fontColor('#ff4d4f')
                              .margin({ bottom: 4 })

                            Text(image.error || '识别失败')
                              .fontSize(12)
                              .fontColor('#ff4d4f')
                          }
                          .width('100%')
                        }

                        Button('删除', { type: ButtonType.Normal, stateEffect: true })
                          .fontSize(12)
                          .height(28)
                          .margin({ top: 4 })
                          .onClick(() => this.removeImage(index))
                      }
                      .layoutWeight(1)
                    }
                    .width('100%')
                    .padding(8)
                    .border({ width: 1, color: '#d9d9d9' })
                    .borderRadius(4)
                    .margin({ bottom: 8 })
                  })
                }
                .width('100%')
                .margin({ top: 8 })
              }
            }
            .width('100%')
            .padding(12)
            .backgroundColor('#f5f5f5')
            .borderRadius(4)
            .margin({ bottom: 12 })
          }
        }
        .width('100%')
        .padding(12)
        .gap(0)
      }
      .layoutWeight(1)
      .scrollable(ScrollDirection.Vertical)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
  }
}
