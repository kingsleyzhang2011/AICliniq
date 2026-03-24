import { DiscussionMessage } from '../common/models/index'
import { MarkdownParser } from '../common/utils/MarkdownParser'
import { ColorPalette } from '../common/utils/ColorPalette'
import { getThemeTokens } from '../common/theme/ThemeManager'

@Component
export struct ChatDisplay {
  @Prop history: DiscussionMessage[] = []
  @State scrollController: Scroller = new Scroller()
  @State shouldAutoScroll: boolean = true
  @State themeTokens = getThemeTokens()

  onAppear() {
    this.autoScrollToBottom()
  }

  private autoScrollToBottom() {
    this.scrollController.scrollToIndex(this.history.length - 1)
  }

  build() {
    Column() {
      List({ scroller: this.scrollController }) {
        ForEach(this.history, (item: DiscussionMessage, idx: number) => {
          ListItem() {
            if (item.type === 'system') {
              this.SystemMessageView(item)
            } else if (item.type === 'doctor') {
              this.DoctorMessageView(item)
            } else if (item.type === 'patient') {
              this.PatientMessageView(item)
            } else if (item.type === 'vote_detail') {
              this.VoteDetailView(item)
            } else if (item.type === 'vote_result') {
              this.VoteResultView(item)
            }
          }
          .width('100%')
        }, (item: DiscussionMessage, idx: number) => idx.toString())
      }
      .width('100%')
      .layoutWeight(1)
      .divider({ strokeWidth: 0 })
      .edgeEffect(EdgeEffect.Spring)
    }
    .width('100%')
    .height('100%')
    .onVisibleAreaChange([0.0, 1.0], () => {
      // Auto scroll to bottom when new messages arrive
      this.autoScrollToBottom()
    })
  }

  @Builder
  SystemMessageView(item: DiscussionMessage) {
    Row() {
      Text(item.content)
        .fontSize(13)
        .fontColor(this.themeTokens.textSecondary)
        .textAlign(TextAlign.Center)
    }
    .width('100%')
    .height(40)
    .justifyContent(FlexAlign.Center)
    .backgroundColor(this.themeTokens.systemMessageBg)
    .margin({ top: 8, bottom: 8, left: 12, right: 12 })
    .borderRadius(4)
  }

  @Builder
  DoctorMessageView(item: DiscussionMessage) {
    Row() {
      Column() {
        Text(ColorPalette.getInitials(item.doctorName || ''))
          .fontSize(14)
          .fontColor('#ffffff')
          .textAlign(TextAlign.Center)
          .fontWeight(FontWeight.Bold)
      }
      .width(36)
      .height(36)
      .backgroundColor(ColorPalette.getAvatarColor(item.doctorId || ''))
      .borderRadius(18)
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .margin({ right: 12 })
      .flexShrink(0)

      Column() {
        Text(item.doctorName || '')
          .fontSize(13)
          .fontColor(ColorPalette.getNameColor(item.doctorId || ''))
          .fontWeight(FontWeight.Bold)
          .margin({ bottom: 4 })

        Text(MarkdownParser.parseToText(item.content || ''))
          .fontSize(13)
          .fontColor(this.themeTokens.textPrimary)
          .lineHeight(1.5)
      }
      .layoutWeight(1)
      .padding(12)
      .backgroundColor(this.themeTokens.doctorMessageBg)
      .border({
        width: 1,
        color: this.themeTokens.primaryColorLight
      })
      .borderRadius(8)
    }
    .width('100%')
    .alignItems(VerticalAlign.Top)
    .padding({ top: 8, bottom: 8, left: 12, right: 12 })
  }

  @Builder
  PatientMessageView(item: DiscussionMessage) {
    Row() {
      Blank()
        .layoutWeight(1)

      Column() {
        Text(item.author || '患者')
          .fontSize(13)
          .fontColor(this.themeTokens.secondaryColor)
          .fontWeight(FontWeight.Bold)
          .margin({ bottom: 4 })

        Text(MarkdownParser.parseToText(item.content || ''))
          .fontSize(13)
          .fontColor(this.themeTokens.textPrimary)
          .lineHeight(1.5)
      }
      .layoutWeight(1)
      .maxWidth('80%')
      .padding(12)
      .backgroundColor(this.themeTokens.patientMessageBg)
      .border({
        width: 1,
        color: this.themeTokens.secondaryColorLight
      })
      .borderRadius(8)
      .margin({ left: 24 })

      Column() {
        Text('患')
          .fontSize(14)
          .fontColor('#ffffff')
          .textAlign(TextAlign.Center)
          .fontWeight(FontWeight.Bold)
      }
      .width(36)
      .height(36)
      .backgroundColor(this.themeTokens.primaryColor)
      .borderRadius(18)
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .margin({ left: 12 })
      .flexShrink(0)
    }
    .width('100%')
    .alignItems(VerticalAlign.Top)
    .padding({ top: 8, bottom: 8, left: 12, right: 12 })
  }

  @Builder
  VoteDetailView(item: DiscussionMessage) {
    Row() {
      Text('评估')
        .fontSize(12)
        .fontColor('#ffffff')
        .fontWeight(FontWeight.Bold)
        .padding({ left: 6, right: 6, top: 2, bottom: 2 })
        .backgroundColor(this.themeTokens.warningColor)
        .borderRadius(3)
        .margin({ right: 8 })

      Text(`${item.voterName || ''} 标注 ${item.targetName || ''} 为不太准确: ${item.reason || ''}`)
        .fontSize(12)
        .fontColor(this.themeTokens.textSecondary)
        .lineHeight(1.5)
    }
    .width('100%')
    .padding({ top: 8, bottom: 8, left: 12, right: 12 })
  }

  @Builder
  VoteResultView(item: DiscussionMessage) {
    Row() {
      Text(item.content || '')
        .fontSize(13)
        .fontColor(this.themeTokens.textSecondary)
        .textAlign(TextAlign.Center)
    }
    .width('100%')
    .height(40)
    .justifyContent(FlexAlign.Center)
    .backgroundColor(this.themeTokens.systemMessageBg)
    .margin({ top: 8, bottom: 8, left: 12, right: 12 })
    .borderRadius(4)
  }
}
