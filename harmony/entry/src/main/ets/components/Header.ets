import { getThemeTokens, getThemeManager } from '../common/theme/ThemeManager'

@Component
export struct Header {
  @State themeTokens = getThemeTokens()
  @State isDark: boolean = false
  onOpenSessions?: () => void
  onOpenGlobalSettings?: () => void
  onOpenConsultationSettings?: () => void

  build() {
    Row() {
      // Left side: Logo and title
      Row() {
        Image($r('app.media.logo'))
          .width(28)
          .height(28)

        Text('AI 医疗会诊面板')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .margin({ left: 8 })

        Text('【本内容仅供参考，身体不适尽早就医】')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.themeTokens.errorColor)
          .margin({ left: 8 })
      }
      .gap(8)
      .alignItems(VerticalAlign.Center)

      Blank()

      // Right side: Action buttons
      Row() {
        Button('问诊列表', { type: ButtonType.Normal, stateEffect: true })
          .onClick(() => this.onOpenSessions?.())

        Button('全局设置', { type: ButtonType.Normal, stateEffect: true })
          .onClick(() => this.onOpenGlobalSettings?.())

        Button(this.isDark ? '☀️' : '🌙', { type: ButtonType.Circle, stateEffect: true })
          .width(40)
          .height(40)
          .onClick(() => {
            this.isDark = !this.isDark
            getThemeManager().setDarkMode(this.isDark)
            this.themeTokens = getThemeTokens()
          })

        Button('问诊设置', { type: ButtonType.Capsule, stateEffect: true })
          .backgroundColor(this.themeTokens.primaryColor)
          .onClick(() => this.onOpenConsultationSettings?.())
      }
      .gap(8)
      .alignItems(VerticalAlign.Center)
    }
    .width('100%')
    .height(64)
    .padding({ left: 16, right: 16 })
    .alignItems(VerticalAlign.Center)
    .backgroundColor(this.themeTokens.backgroundPrimary)
    .borderBottomColor(this.themeTokens.borderColor)
    .borderBottomWidth(1)
  }
}
