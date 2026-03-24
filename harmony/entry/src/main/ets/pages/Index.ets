import { router } from '@kit.ArkUI'
import { Header } from '../components/Header'
import { DiscussionPane } from '../components/DiscussionPane'
import { StatusPane } from '../components/StatusPane'
import { CaseInputForm } from '../components/CaseInputForm'
import { GlobalSettingsModal } from '../components/modals/GlobalSettingsModal'
import { ConsultationSettingsModal } from '../components/modals/ConsultationSettingsModal'
import { SessionListDrawer } from '../components/drawers/SessionListDrawer'
import { ConsultViewModel, getConsultViewModel } from '../common/stores/ConsultViewModel'
import { getThemeTokens } from '../common/theme/ThemeManager'

@Entry
@Component
struct Index {
  @State globalSettingsOpen: boolean = false
  @State consultationSettingsOpen: boolean = false
  @State sessionsOpen: boolean = false
  @State viewModel: ConsultViewModel = getConsultViewModel()
  @State themeTokens = getThemeTokens()

  build() {
    Column() {
      // Header with logo, title, warning, and action buttons
      Header({
        onOpenSessions: () => {
          this.sessionsOpen = true
        },
        onOpenGlobalSettings: () => {
          this.globalSettingsOpen = true
        },
        onOpenConsultationSettings: () => {
          this.consultationSettingsOpen = true
        }
      })

      // Two-column body layout
      if (this.viewModel.workflow.phase === 'setup') {
        Row() {
          // Left column: Case input form (2/3 width)
          CaseInputForm()
            .layoutWeight(2)

          // Right column: Status pane (1/3 width)
          StatusPane({
            onOpenSettings: () => {
              this.consultationSettingsOpen = true
            }
          })
            .layoutWeight(1)
        }
        .height('100%')
        .padding({ left: 16, right: 16, bottom: 16 })
        .gap(16)
      } else {
        Row() {
          // Left column: Discussion pane (2/3 width)
          DiscussionPane()
            .layoutWeight(2)

          // Right column: Status pane (1/3 width)
          StatusPane({
            onOpenSettings: () => {
              this.consultationSettingsOpen = true
            }
          })
            .layoutWeight(1)
        }
        .height('100%')
        .padding({ left: 16, right: 16, bottom: 16 })
        .gap(16)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.themeTokens.backgroundPrimary)

    // Modals and drawers
    if (this.globalSettingsOpen) {
      GlobalSettingsModal({
        onClose: () => {
          this.globalSettingsOpen = false
        }
      })
    }

    if (this.consultationSettingsOpen) {
      ConsultationSettingsModal({
        onClose: () => {
          this.consultationSettingsOpen = false
        }
      })
    }

    if (this.sessionsOpen) {
      SessionListDrawer({
        onClose: () => {
          this.sessionsOpen = false
        }
      })
    }

  }
}
