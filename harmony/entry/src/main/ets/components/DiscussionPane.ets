import { ConsultViewModel, getConsultViewModel } from '../common/stores/ConsultViewModel'
import { ChatDisplay } from './ChatDisplay'

@Component
export struct DiscussionPane {
  @State viewModel: ConsultViewModel = getConsultViewModel()
  @State patientInput: string = ''

  build() {
    Column() {
      // Header for discussion pane
      Row() {
        Text('医生讨论')
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
      }
      .width('100%')
      .height(40)
      .padding({ left: 12, right: 12 })
      .alignItems(VerticalAlign.Center)
      .borderBottomColor('#f0f0f0')
      .borderBottomWidth(1)

      // Chat display area
      ChatDisplay({
        history: this.viewModel.discussionHistory
      })
        .layoutWeight(1)

      // Input area
      Row() {
        TextInput({ placeholder: '输入问诊内容...' })
          .width('100%')
          .height(40)
          .padding({ left: 12, right: 12 })
          .layoutWeight(1)
          .onChange((value) => {
            this.patientInput = value
          })

        Button('发送', { type: ButtonType.Normal, stateEffect: true })
          .backgroundColor(this.patientInput.trim() ? '#1890ff' : '#d9d9d9')
          .width(80)
          .height(40)
          .margin({ left: 8 })
          .enabled(this.patientInput.trim() && this.viewModel.workflow.phase === 'discussion')
          .onClick(() => {
            if (this.patientInput.trim()) {
              this.viewModel.addPatientMessage(this.patientInput)
              this.patientInput = ''
            }
          })
      }
      .width('100%')
      .height(60)
      .padding(12)
      .gap(8)
      .alignItems(VerticalAlign.Center)
      .backgroundColor('#fafafa')
      .borderTopColor('#f0f0f0')
      .borderTopWidth(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
    .borderRadius(4)
    .border({
      width: 1,
      color: '#f0f0f0',
      radius: 4
    })
  }
}
