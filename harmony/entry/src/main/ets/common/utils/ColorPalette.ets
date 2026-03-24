export interface DoctorTheme {
  avatar: string
  bubble: string
  border: string
  name: string
}

export class ColorPalette {
  private static readonly DOCTOR_PALETTE: DoctorTheme[] = [
    { avatar: '#2f54eb', bubble: '#f0f5ff', border: '#adc6ff', name: '#1d39c4' },
    { avatar: '#08979c', bubble: '#e6fffb', border: '#87e8de', name: '#006d75' },
    { avatar: '#d46b08', bubble: '#fff7e6', border: '#ffd591', name: '#ad4e00' },
    { avatar: '#531dab', bubble: '#f9f0ff', border: '#d3adf7', name: '#391085' },
    { avatar: '#237804', bubble: '#f6ffed', border: '#b7eb8f', name: '#1a4f08' },
    { avatar: '#a8071a', bubble: '#fff1f0', border: '#ffccc7', name: '#820014' }
  ]

  static getPaletteIndex(id: string): number {
    const str = id || ''
    if (!str) return 0
    let hash = 0
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff
    }
    return Math.abs(hash) % this.DOCTOR_PALETTE.length
  }

  static getTheme(id: string): DoctorTheme {
    return this.DOCTOR_PALETTE[this.getPaletteIndex(id)]
  }

  static getAvatarColor(id: string): string {
    return this.getTheme(id).avatar
  }

  static getBubbleColor(id: string): string {
    return this.getTheme(id).bubble
  }

  static getBorderColor(id: string): string {
    return this.getTheme(id).border
  }

  static getNameColor(id: string): string {
    return this.getTheme(id).name
  }

  static getInitials(name: string): string {
    if (!name) return ''
    const parts = String(name).trim().split(/\s+/)
    if (parts.length === 0) return ''
    if (parts[0].length <= 2) return parts[0].toUpperCase()
    return parts[0].substring(0, 2).toUpperCase()
  }

  static SYSTEM_COLOR = '#8c8c8c'
  static SYSTEM_BG = '#fafafa'
  static PATIENT_BUBBLE_COLOR = '#ffffff'
  static PATIENT_BORDER_COLOR = '#d9d9d9'
  static PATIENT_TEXT_COLOR = '#262626'
  static VOTE_BADGE_COLOR = '#faad14'
}
