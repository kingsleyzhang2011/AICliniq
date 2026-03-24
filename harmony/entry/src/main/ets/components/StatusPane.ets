import { ConsultViewModel, getConsultViewModel } from '../common/stores/ConsultViewModel'
import { Doctor } from '../common/models/index'
import { ColorPalette } from '../common/utils/ColorPalette'
import { getThemeTokens } from '../common/theme/ThemeManager'

@Component
export struct StatusPane {
  @State viewModel: ConsultViewModel = getConsultViewModel()
  @State themeTokens = getThemeTokens()
  onOpenSettings?: () => void

  getDoctorStatusText(doctor: Doctor): string {
    if (doctor.status === 'eliminated') {
      return '已淘汰'
    }
    if (this.viewModel.workflow.phase === 'setup') {
      return '准备中'
    }
    if (this.viewModel.workflow.activeTurn === doctor.id) {
      return '正在思考...'
    }
    if (this.viewModel.workflow.phase === 'voting') {
      return `已投票: ${doctor.votes}`
    }
    return '已完成'
  }

  getDoctorStatusColor(doctor: Doctor): string {
    if (doctor.status === 'eliminated') {
      return this.themeTokens.eliminatedColor
    }
    if (this.viewModel.workflow.activeTurn === doctor.id) {
      return this.themeTokens.activeColor
    }
    if (doctor.votes > 0 && this.viewModel.workflow.phase === 'voting') {
      return this.themeTokens.completedColor
    }
    return this.themeTokens.pausedColor
  }

  build() {
    Column() {
      // Header for status pane
      Row() {
        Text('会诊状态')
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
      }
      .width('100%')
      .height(40)
      .padding({ left: 12, right: 12 })
      .alignItems(VerticalAlign.Center)
      .borderBottomColor(this.themeTokens.borderColor)
      .borderBottomWidth(1)

      // Status content area
      Scroll() {
        Column() {
          // Patient info section
          Column() {
            Text('患者信息')
              .fontSize(14)
              .fontWeight(FontWeight.Bold)
              .width('100%')

            Row() {
              Text('姓名：')
                .width('40%')
              Text(this.viewModel.patientCase.name || '未设置')
                .layoutWeight(1)
                .fontColor(this.viewModel.patientCase.name ? this.themeTokens.textPrimary : this.themeTokens.textSecondary)
            }
            .width('100%')
            .margin({ top: 8 })

            Row() {
              Text('年龄：')
                .width('40%')
              Text(this.viewModel.patientCase.age ? String(this.viewModel.patientCase.age) : '未设置')
                .layoutWeight(1)
                .fontColor(this.viewModel.patientCase.age ? this.themeTokens.textPrimary : this.themeTokens.textSecondary)
            }
            .width('100%')
            .margin({ top: 4 })

            Row() {
              Text('性别：')
                .width('40%')
              Text(this.viewModel.patientCase.gender || '未设置')
                .layoutWeight(1)
                .fontColor(this.viewModel.patientCase.gender ? this.themeTokens.textPrimary : this.themeTokens.textSecondary)
            }
            .width('100%')
            .margin({ top: 4 })
          }
          .width('100%')
          .padding(12)
          .backgroundColor(this.themeTokens.backgroundSecondary)
          .borderRadius(4)
          .margin({ bottom: 12 })

          // Doctors status
          Column() {
            Text('参与医生')
              .fontSize(14)
              .fontWeight(FontWeight.Bold)
              .width('100%')
              .margin({ bottom: 8 })

            Column() {
              ForEach(this.viewModel.doctors, (doctor: Doctor, _: number) => {
                Row() {
                  Circle()
                    .width(8)
                    .height(8)
                    .fill(this.getDoctorStatusColor(doctor))

                  Text(doctor.name)
                    .margin({ left: 8 })
                    .layoutWeight(1)
                    .fontColor(this.themeTokens.textPrimary)

                  Text(this.getDoctorStatusText(doctor))
                    .fontSize(12)
                    .fontColor(this.themeTokens.textSecondary)
                }
                .width('100%')
                .height(32)
                .alignItems(VerticalAlign.Center)
              })
            }
            .width('100%')
            .gap(8)
          }
          .width('100%')
          .padding(12)
          .backgroundColor(this.themeTokens.backgroundSecondary)
          .borderRadius(4)

          // Display final summary if available
          if (this.viewModel.finalSummary.status === 'ready' && this.viewModel.finalSummary.content) {
            Column() {
              Text('最终总结')
                .fontSize(14)
                .fontWeight(FontWeight.Bold)
                .width('100%')
                .margin({ bottom: 8 })

              Text(this.viewModel.finalSummary.content)
                .fontSize(12)
                .fontColor(this.themeTokens.textPrimary)
                .lineHeight(1.5)
                .maxLines(5)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
            }
            .width('100%')
            .padding(12)
            .backgroundColor(this.themeTokens.primaryColorLight)
            .borderRadius(4)
            .margin({ top: 12 })
          }
        }
        .width('100%')
        .padding(12)
        .gap(0)
      }
      .layoutWeight(1)
      .scrollable(ScrollDirection.Vertical)

      // Action buttons
      Column() {
        if (this.viewModel.workflow.phase === 'setup') {
          Button('开始会诊', { type: ButtonType.Normal, stateEffect: true })
            .width('100%')
            .backgroundColor(this.themeTokens.primaryColor)
            .onClick(async () => {
              try {
                await this.viewModel.startConsultation()
                await this.viewModel.runDiscussionRound()
              } catch (e) {
                // Error handling
              }
            })
        } else if (this.viewModel.workflow.phase === 'discussion') {
          Row() {
            Button(this.viewModel.workflow.paused ? '继续' : '暂停', { type: ButtonType.Normal, stateEffect: true })
              .layoutWeight(1)
              .backgroundColor(this.viewModel.workflow.paused ? this.themeTokens.completedColor : this.themeTokens.pausedColor)
              .onClick(() => {
                this.viewModel.togglePause()
              })

            Button('完成轮次', { type: ButtonType.Normal, stateEffect: true })
              .layoutWeight(1)
              .backgroundColor(this.themeTokens.primaryColor)
              .margin({ left: 8 })
              .onClick(async () => {
                try {
                  await this.viewModel.autoVoteAndProceed()
                } catch (e) {
                  // Error handling
                }
              })
          }
          .width('100%')
          .gap(8)
        } else if (this.viewModel.workflow.phase === 'voting') {
          Button('继续下一轮', { type: ButtonType.Normal, stateEffect: true })
            .width('100%')
            .backgroundColor(this.themeTokens.primaryColor)
            .onClick(async () => {
              try {
                await this.viewModel.continueToNextRound()
              } catch (e) {
                // Error handling
              }
            })

          Button('生成总结', { type: ButtonType.Normal, stateEffect: true })
            .width('100%')
            .backgroundColor(this.themeTokens.completedColor)
            .margin({ top: 8 })
            .onClick(async () => {
              try {
                await this.viewModel.generateFinalSummary()
              } catch (e) {
                // Error handling
              }
            })
        } else if (this.viewModel.workflow.phase === 'finished') {
          Button('查看总结', { type: ButtonType.Normal, stateEffect: true })
            .width('100%')
            .backgroundColor(this.themeTokens.primaryColor)
            .onClick(() => {
              // Final summary is shown in the status content area
            })

          Button('导出 PDF', { type: ButtonType.Normal, stateEffect: true })
            .width('100%')
            .backgroundColor(this.themeTokens.completedColor)
            .margin({ top: 8 })
            .onClick(() => {
              // Export PDF - will be connected to export functionality
            })

          Button('导出图片', { type: ButtonType.Normal, stateEffect: true })
            .width('100%')
            .backgroundColor(this.themeTokens.warningColor)
            .margin({ top: 8 })
            .onClick(() => {
              // Export image - will be connected to export functionality
            })

          Button('问诊设置', { type: ButtonType.Normal, stateEffect: true })
            .width('100%')
            .backgroundColor(this.themeTokens.primaryColor)
            .margin({ top: 8 })
            .onClick(() => this.onOpenSettings?.())
        }

        if (this.viewModel.workflow.phase === 'setup') {
          Button('问诊设置', { type: ButtonType.Normal, stateEffect: true })
            .width('100%')
            .backgroundColor(this.themeTokens.primaryColor)
            .margin({ top: 8 })
            .onClick(() => this.onOpenSettings?.())
        }
      }
      .width('100%')
      .padding(12)
      .gap(0)
      .backgroundColor(this.themeTokens.backgroundTertiary)
      .borderTopColor(this.themeTokens.borderColor)
      .borderTopWidth(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.themeTokens.backgroundPrimary)
    .borderRadius(4)
    .border({
      width: 1,
      color: this.themeTokens.borderColor,
      radius: 4
    })
  }
}
