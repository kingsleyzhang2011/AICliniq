// Theme tokens and colors for the application
// Supports light and dark modes

@Observed
export class ThemeTokens {
  // Mode
  isDark: boolean = false

  // Primary colors (medical blues)
  primaryColor: string = '#1677ff'
  primaryColorLight: string = '#e6f4ff'
  primaryColorDark: string = '#0958d9'

  // Secondary colors (cyan - patient)
  secondaryColor: string = '#13c2c2'
  secondaryColorLight: string = '#e6f7ff'

  // Warning colors (orange)
  warningColor: string = '#fa8c16'
  warningColorLight: string = '#fff7e6'

  // Success colors (green)
  successColor: string = '#52c41a'
  successColorLight: string = '#f6ffed'

  // Error colors (red)
  errorColor: string = '#ff4d4f'
  errorColorLight: string = '#fff1f0'

  // Text colors
  textPrimary: string = '#262626'
  textSecondary: string = '#8c8c8c'
  textDisabled: string = '#bfbfbf'

  // Background colors
  backgroundPrimary: string = '#ffffff'
  backgroundSecondary: string = '#f5f5f5'
  backgroundTertiary: string = '#fafafa'

  // Border colors
  borderColor: string = '#f0f0f0'
  borderColorSecondary: string = '#d9d9d9'

  // Component backgrounds
  doctorMessageBg: string = '#f0f5ff'
  patientMessageBg: string = '#e6f7ff'
  systemMessageBg: string = '#f5f5f5'
  disclaimerBg: string = '#fff1f0'
  disclaimerBorder: string = '#ffccc7'
  disclaimerText: string = '#aa0605'

  // Status colors
  activeColor: string = '#1890ff'
  pausedColor: string = '#faad14'
  eliminatedColor: string = '#d9d9d9'
  completedColor: string = '#52c41a'

  // Layout
  borderRadius: number = 4
  borderRadiusLarge: number = 8

  // Typography
  fontFamilyPrimary: string = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif'
  fontSizeXLarge: number = 28
  fontSizeLarge: number = 18
  fontSizeMedium: number = 16
  fontSizeNormal: number = 14
  fontSizeSmall: number = 13
  fontSizeXSmall: number = 12

  // Line heights
  lineHeightRelaxed: number = 2

  constructor(isDark: boolean = false) {
    this.isDark = isDark
    if (isDark) {
      this.applyDarkMode()
    }
  }

  private applyDarkMode() {
    this.primaryColor = '#177ddc'
    this.primaryColorLight = '#111b26'
    this.primaryColorDark = '#1765ad'

    this.textPrimary = '#e6e6e6'
    this.textSecondary = '#a6a6a6'

    this.backgroundPrimary = '#141414'
    this.backgroundSecondary = '#262626'
    this.backgroundTertiary = '#1f1f1f'

    this.borderColor = '#434343'
    this.borderColorSecondary = '#595959'

    this.doctorMessageBg = '#111b26'
    this.patientMessageBg = '#0f1419'
    this.systemMessageBg = '#1f1f1f'
    this.disclaimerBg = '#2f1515'
    this.disclaimerBorder = '#58181c'
  }

  setDarkMode(isDark: boolean) {
    this.isDark = isDark
    if (isDark) {
      this.applyDarkMode()
    } else {
      // Reset to light mode
      this.primaryColor = '#1677ff'
      this.primaryColorLight = '#e6f4ff'
      this.primaryColorDark = '#0958d9'

      this.textPrimary = '#262626'
      this.textSecondary = '#8c8c8c'

      this.backgroundPrimary = '#ffffff'
      this.backgroundSecondary = '#f5f5f5'
      this.backgroundTertiary = '#fafafa'

      this.borderColor = '#f0f0f0'
      this.borderColorSecondary = '#d9d9d9'

      this.doctorMessageBg = '#f0f5ff'
      this.patientMessageBg = '#e6f7ff'
      this.systemMessageBg = '#f5f5f5'
      this.disclaimerBg = '#fff1f0'
      this.disclaimerBorder = '#ffccc7'
    }
  }
}

export class ThemeManager {
  private static instance: ThemeManager | null = null
  private tokens: ThemeTokens = new ThemeTokens()

  private constructor() {}

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager()
    }
    return ThemeManager.instance
  }

  getTokens(): ThemeTokens {
    return this.tokens
  }

  setDarkMode(isDark: boolean) {
    this.tokens.setDarkMode(isDark)
  }

  isDarkMode(): boolean {
    return this.tokens.isDark
  }

  toggleDarkMode() {
    this.setDarkMode(!this.tokens.isDark)
  }
}

export function getThemeManager(): ThemeManager {
  return ThemeManager.getInstance()
}

export function getThemeTokens(): ThemeTokens {
  return getThemeManager().getTokens()
}
