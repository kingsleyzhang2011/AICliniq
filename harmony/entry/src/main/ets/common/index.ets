// Models
export * from './models/index'

// Persistence
export { PersistenceManager } from './persistence/PersistenceManager'

// Stores
export { GlobalConfigStore, getGlobalConfigStore } from './stores/GlobalConfigStore'
export { SessionsRepository, getSessionsRepository } from './stores/SessionsRepository'
export { ConsultViewModel, getConsultViewModel } from './stores/ConsultViewModel'

// Services
export { AIService } from './services/AIService'
export { ImageRecognitionService } from './services/ImageRecognitionService'

// Utils
export { Logger } from './utils/Logger'
export { PromptBuilder } from './utils/PromptBuilder'
export { MarkdownParser } from './utils/MarkdownParser'
export { ColorPalette, type DoctorTheme } from './utils/ColorPalette'
export { ImagePickerHelper } from './utils/ImagePickerHelper'

// App Context
export { AppContext, getAppContext } from './AppContext'
