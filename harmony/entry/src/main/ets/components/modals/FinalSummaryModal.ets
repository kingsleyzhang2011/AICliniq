import { ConsultViewModel, getConsultViewModel } from '../../common/stores/ConsultViewModel'
import { FinalSummary } from '../../common/models/index'
import { MarkdownParser } from '../../common/utils/MarkdownParser'

@Component
export struct FinalSummaryModal {
  @ObservedObject viewModel: ConsultViewModel = getConsultViewModel()
  @State isCopied: boolean = false
  onClose?: () => void

  async exportSummary() {
    // Stub for export functionality
    // In a real implementation, this would generate an image of the summary
    // and save it to the device
    this.isCopied = true
    setTimeout(() => {
      this.isCopied = false
    }, 2000)
  }

  build() {
    Column() {
      // Header
      Row() {
        Text('最终总结')
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .layoutWeight(1)

        Button('关闭', { type: ButtonType.Normal, stateEffect: true })
          .height(32)
          .fontSize(12)
          .onClick(() => {
            this.onClose?.()
          })
      }
      .width('100%')
      .height(44)
      .padding({ left: 16, right: 16 })
      .alignItems(VerticalAlign.Center)
      .borderBottomColor('#f0f0f0')
      .borderBottomWidth(1)

      // Summary content
      Scroll() {
        Column() {
          if (this.viewModel.finalSummary.status === 'pending') {
            Column() {
              Text('正在生成总结...')
                .fontSize(14)
                .fontColor('#8c8c8c')
            }
            .width('100%')
            .height(200)
            .justifyContent(FlexAlign.Center)
            .alignItems(HorizontalAlign.Center)
          } else if (this.viewModel.finalSummary.status === 'error') {
            Column() {
              Text('✗ 生成总结失败')
                .fontSize(14)
                .fontColor('#ff4d4f')
                .margin({ bottom: 8 })

              Text(this.viewModel.finalSummary.content)
                .fontSize(12)
                .fontColor('#ff4d4f')
            }
            .width('100%')
            .padding(16)
            .backgroundColor('#fff1f0')
            .borderRadius(4)
          } else {
            Column() {
              // Doctor info
              if (this.viewModel.finalSummary.doctorName) {
                Row() {
                  Text('总结医生：')
                    .fontSize(12)
                    .fontColor('#8c8c8c')

                  Text(this.viewModel.finalSummary.doctorName)
                    .fontSize(12)
                    .fontColor('#262626')
                    .fontWeight(FontWeight.Bold)
                }
                .width('100%')
                .margin({ bottom: 12 })
              }

              // Summary content
              Text(MarkdownParser.parseToText(this.viewModel.finalSummary.content))
                .fontSize(13)
                .fontColor('#262626')
                .lineHeight(1.6)
                .width('100%')
            }
            .width('100%')
            .padding(16)
            .gap(8)
          }
        }
        .width('100%')
        .padding(16)
      }
      .layoutWeight(1)
      .scrollable(ScrollDirection.Vertical)

      // Footer actions
      if (this.viewModel.finalSummary.status === 'ready') {
        Row() {
          Button(this.isCopied ? '已复制' : '复制内容', { type: ButtonType.Normal, stateEffect: true })
            .layoutWeight(1)
            .backgroundColor(this.isCopied ? '#52c41a' : '#1890ff')
            .onClick(() => {
              // Copy summary to clipboard
              this.isCopied = true
              setTimeout(() => {
                this.isCopied = false
              }, 2000)
            })

          Button('导出为图片', { type: ButtonType.Normal, stateEffect: true })
            .layoutWeight(1)
            .backgroundColor('#1890ff')
            .margin({ left: 8 })
            .onClick(() => {
              this.exportSummary()
            })
        }
        .width('100%')
        .height(44)
        .padding({ left: 16, right: 16, top: 8, bottom: 8 })
        .gap(8)
        .backgroundColor('#fafafa')
        .borderTopColor('#f0f0f0')
        .borderTopWidth(1)
      }
    }
    .width('100%')
    .height('90%')
    .backgroundColor('#ffffff')
    .borderRadius(8)
  }
}
