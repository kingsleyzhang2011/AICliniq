import { Logger } from './Logger'

const TAG = 'MarkdownParser'

export class MarkdownParser {
  static parseToText(markdown: string): string {
    if (!markdown) return ''
    
    let text = String(markdown)
    
    // Remove markdown syntax but preserve content
    text = text.replace(/\*\*(.*?)\*\*/g, '$1')  // bold
    text = text.replace(/\*(.*?)\*/g, '$1')      // italic
    text = text.replace(/`(.*?)`/g, '$1')        // code
    text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    text = text.replace(/^#+\s+/gm, '')          // headers
    text = text.replace(/^[\s\-\*]+/gm, '')      // lists
    text = text.replace(/\n+/g, '\n')            // normalize newlines
    
    return text.trim()
  }

  static hasMarkdown(text: string): boolean {
    if (!text) return false
    return /(\*\*|`|\[.*?\]\(.*?\)|^#+\s+|^[\s\-\*]+)/m.test(text)
  }

  static splitByParagraphs(markdown: string): string[] {
    if (!markdown) return []
    return String(markdown)
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0)
  }

  static extractBoldText(text: string): string[] {
    const matches = text.match(/\*\*(.*?)\*\*/g) || []
    return matches.map(m => m.replace(/\*\*/g, ''))
  }

  static extractLinks(text: string): Array<{ text: string; url: string }> {
    const matches = text.match(/\[(.*?)\]\((.*?)\)/g) || []
    return matches.map(m => {
      const match = m.match(/\[(.*?)\]\((.*?)\)/)
      if (match) {
        return { text: match[1], url: match[2] }
      }
      return { text: '', url: '' }
    }).filter(link => link.text.length > 0)
  }

  static formatAsMarkdown(text: string, format: 'bold' | 'italic' | 'code' | 'h1' | 'h2' | 'h3'): string {
    if (!text) return ''
    switch (format) {
      case 'bold':
        return `**${text}**`
      case 'italic':
        return `*${text}*`
      case 'code':
        return `\`${text}\``
      case 'h1':
        return `# ${text}`
      case 'h2':
        return `## ${text}`
      case 'h3':
        return `### ${text}`
      default:
        return text
    }
  }

  static stripMarkdown(markdown: string): string {
    let text = String(markdown || '')
    text = text.replace(/\*\*(.*?)\*\*/g, '$1')
    text = text.replace(/\*(.*?)\*/g, '$1')
    text = text.replace(/__(.*?)__/g, '$1')
    text = text.replace(/_(.+?)_/g, '$1')
    text = text.replace(/`(.*?)`/g, '$1')
    text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1')
    text = text.replace(/\n/g, ' ')
    return text.trim()
  }
}
