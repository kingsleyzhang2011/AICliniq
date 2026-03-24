import {
  Doctor,
  PatientCase,
  DiscussionMessage,
  FinalSummary
} from '../models/index'
import { getThemeTokens } from '../theme/ThemeManager'
import { MarkdownParser } from '../utils/MarkdownParser'
import { ColorPalette } from '../utils/ColorPalette'

@Component
export struct ReportView {
  @Prop doctors: Doctor[] = []
  @Prop patientCase: PatientCase = new PatientCase()
  @Prop discussionHistory: DiscussionMessage[] = []
  @Prop finalSummary: FinalSummary = new FinalSummary()
  @Prop sessionName: string = '会诊报告'

  build() {
    Column() {
      Scroll() {
        Column() {
          // Title section
          Column() {
            Text('🎯 AI 医疗会诊报告')
              .fontSize(28)
              .fontWeight(FontWeight.Bold)
              .fontColor('#0958d9')
              .width('100%')
              .textAlign(TextAlign.Center)
              .margin({ bottom: 10 })

            Text(new Date().toLocaleString('zh-CN'))
              .fontSize(12)
              .fontColor('#8c8c8c')
              .width('100%')
              .textAlign(TextAlign.Center)
          }
          .width('100%')
          .padding(20)
          .borderBottomWidth(2)
          .borderBottomColor('#1677ff')
          .marginBottom(30)

          // Patient info section
          Column() {
            Text('👤 患者基本信息')
              .fontSize(16)
              .fontWeight(FontWeight.Bold)
              .fontColor('#1677ff')
              .width('100%')
              .margin({ bottom: 12 })
              .padding({ bottom: 8 })
              .borderBottomWidth(1)
              .borderBottomColor('#e6f4ff')

            Column() {
              // Patient name
              Row() {
                Text('患者姓名：')
                  .fontSize(13)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#595959')
                  .width('100px')
                  .flexShrink(0)

                Text(this.patientCase.name || '—')
                  .fontSize(13)
                  .fontColor('#262626')
                  .layoutWeight(1)
              }
              .width('100%')
              .margin({ bottom: 8 })

              // Gender
              Row() {
                Text('性别：')
                  .fontSize(13)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#595959')
                  .width('100px')
                  .flexShrink(0)

                Text(this.patientCase.gender || '—')
                  .fontSize(13)
                  .fontColor('#262626')
                  .layoutWeight(1)
              }
              .width('100%')
              .margin({ bottom: 8 })

              // Age
              Row() {
                Text('年龄：')
                  .fontSize(13)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#595959')
                  .width('100px')
                  .flexShrink(0)

                Text(this.patientCase.age ? String(this.patientCase.age) : '—')
                  .fontSize(13)
                  .fontColor('#262626')
                  .layoutWeight(1)
              }
              .width('100%')
              .margin({ bottom: 8 })

              // Past history
              if (this.patientCase.pastHistory) {
                Row() {
                  Text('既往疾病：')
                    .fontSize(13)
                    .fontWeight(FontWeight.Bold)
                    .fontColor('#595959')
                    .width('100px')
                    .flexShrink(0)

                  Text(this.patientCase.pastHistory)
                    .fontSize(13)
                    .fontColor('#262626')
                    .layoutWeight(1)
                }
                .width('100%')
                .margin({ bottom: 8 })
                .alignItems(VerticalAlign.Top)
              }

              // Current problem
              if (this.patientCase.currentProblem) {
                Row() {
                  Text('本次问题：')
                    .fontSize(13)
                    .fontWeight(FontWeight.Bold)
                    .fontColor('#595959')
                    .width('100px')
                    .flexShrink(0)

                  Text(this.patientCase.currentProblem)
                    .fontSize(13)
                    .fontColor('#262626')
                    .layoutWeight(1)
                }
                .width('100%')
                .margin({ bottom: 8 })
                .alignItems(VerticalAlign.Top)
              }

              // Image recognition result
              if (this.patientCase.imageRecognitionResult) {
                Row() {
                  Text('图片识别：')
                    .fontSize(13)
                    .fontWeight(FontWeight.Bold)
                    .fontColor('#595959')
                    .width('100px')
                    .flexShrink(0)

                  Text(this.patientCase.imageRecognitionResult)
                    .fontSize(13)
                    .fontColor('#262626')
                    .layoutWeight(1)
                }
                .width('100%')
                .alignItems(VerticalAlign.Top)
              }
            }
            .width('100%')
            .padding(12)
            .backgroundColor('#f5f5f5')
            .borderRadius(4)
            .margin({ bottom: 12 })

            // Disclaimer
            Column() {
              Text('⚠️ 免责声明：本内容仅供参考，不能替代专业医疗意见。身体不适，请尽早就医。')
                .fontSize(12)
                .fontColor('#aa0605')
                .width('100%')
            }
            .width('100%')
            .padding(12)
            .backgroundColor('#fff1f0')
            .borderRadius(4)
            .borderWidth(1)
            .borderColor('#ffccc7')
          }
          .width('100%')
          .marginBottom(30)

          // Discussion history section
          Column() {
            Text('💬 AI 讨论过程')
              .fontSize(16)
              .fontWeight(FontWeight.Bold)
              .fontColor('#1677ff')
              .width('100%')
              .margin({ bottom: 12 })
              .padding({ bottom: 8 })
              .borderBottomWidth(1)
              .borderBottomColor('#e6f4ff')

            if (this.discussionHistory.length === 0) {
              Text('暂无讨论内容')
                .fontSize(13)
                .fontColor('#8c8c8c')
                .width('100%')
            } else {
              ForEach(this.discussionHistory, (msg: DiscussionMessage) => {
                if (msg.type === 'system') {
                  Text(msg.content)
                    .fontSize(12)
                    .fontColor('#8c8c8c')
                    .textAlign(TextAlign.Center)
                    .width('100%')
                    .margin({ top: 12, bottom: 12 })
                } else if (msg.type === 'doctor') {
                  Column() {
                    Text(`医生: ${msg.doctorName || 'Unknown'}`)
                      .fontSize(14)
                      .fontWeight(FontWeight.Bold)
                      .fontColor('#1677ff')
                      .margin({ bottom: 4 })

                    Text(msg.content || '')
                      .fontSize(13)
                      .fontColor('#262626')
                      .width('100%')
                      .lineHeight(1.5)
                  }
                  .width('100%')
                  .padding(10)
                  .backgroundColor('#f0f5ff')
                  .borderRadius(4)
                  .borderLeftWidth(3)
                  .borderLeftColor('#1677ff')
                  .margin({ top: 12, bottom: 12 })
                } else if (msg.type === 'patient') {
                  Column() {
                    Text(`患者: ${msg.author || 'Patient'}`)
                      .fontSize(14)
                      .fontWeight(FontWeight.Bold)
                      .fontColor('#13c2c2')
                      .margin({ bottom: 4 })

                    Text(msg.content || '')
                      .fontSize(13)
                      .fontColor('#262626')
                      .width('100%')
                      .lineHeight(1.5)
                  }
                  .width('100%')
                  .padding(10)
                  .backgroundColor('#e6f7ff')
                  .borderRadius(4)
                  .borderLeftWidth(3)
                  .borderLeftColor('#13c2c2')
                  .margin({ top: 12, bottom: 12 })
                } else if (msg.type === 'vote_detail') {
                  Row() {
                    Text(`${msg.voterName} 标注 ${msg.targetName} 为不太准确：${msg.reason || ''}`)
                      .fontSize(12)
                      .fontColor('#262626')
                      .width('100%')
                  }
                  .width('100%')
                  .padding({ left: 10, right: 10, top: 6, bottom: 6 })
                  .backgroundColor('#fff7e6')
                  .borderRadius(4)
                  .borderLeftWidth(3)
                  .borderLeftColor('#fa8c16')
                  .margin({ top: 8, bottom: 8 })
                } else if (msg.type === 'vote_result') {
                  Text(msg.content)
                    .fontSize(12)
                    .fontColor('#fa8c16')
                    .fontWeight(FontWeight.Bold)
                    .textAlign(TextAlign.Center)
                    .width('100%')
                    .margin({ top: 12, bottom: 12 })
                }
              }, (msg: DiscussionMessage) => msg.id)
            }
          }
          .width('100%')
          .marginBottom(30)

          // Final summary section
          if (this.finalSummary.content) {
            Column() {
              Text('🎁 最终结果')
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor('#1677ff')
                .width('100%')
                .margin({ bottom: 12 })
                .padding({ bottom: 8 })
                .borderBottomWidth(1)
                .borderBottomColor('#e6f4ff')

              Text(this.finalSummary.content)
                .fontSize(13)
                .fontColor('#262626')
                .width('100%')
                .lineHeight(1.5)
                .padding(16)
                .backgroundColor('#f0f5ff')
                .borderRadius(4)
                .borderWidth(1)
                .borderColor('#adc6ff')
                .margin({ top: 12 })
            }
            .width('100%')
            .marginBottom(30)
          }

          // Footer
          Column() {
            Text('© AI 医疗会诊面板 | 本内容仅供参考，身体不适尽早就医')
              .fontSize(11)
              .fontColor('#8c8c8c')
              .textAlign(TextAlign.Center)
              .width('100%')
          }
          .width('100%')
          .padding({ top: 20, bottom: 20 })
          .borderTopWidth(1)
          .borderTopColor('#f0f0f0')
          .marginTop(40)
        }
        .width('100%')
        .padding(40)
        .backgroundColor('#ffffff')
      }
      .scrollable(ScrollDirection.Vertical)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
  }
}
