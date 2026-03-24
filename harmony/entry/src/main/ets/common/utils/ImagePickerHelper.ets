import { picker } from '@kit.CoreFileKit'
import { fs } from '@kit.FileKit'
import { Logger } from './Logger'

const TAG = 'ImagePickerHelper'

export class ImagePickerHelper {
  static async pickImages(): Promise<Array<{ name: string; path: string; base64: string }>> {
    const results: Array<{ name: string; path: string; base64: string }> = []
    
    try {
      const pickerResult = await picker.PhotoViewPicker.select({
        MIMEType: ['image/*'],
        maxSelectNumber: 10
      })

      if (pickerResult && Array.isArray(pickerResult)) {
        for (const uri of pickerResult) {
          try {
            const fileName = this.extractFileName(uri)
            const base64 = await this.fileToBase64(uri)
            results.push({
              name: fileName,
              path: uri,
              base64
            })
          } catch (e) {
            Logger.warn(TAG, `Failed to process image ${uri}: ${e}`)
          }
        }
      }
    } catch (e) {
      Logger.error(TAG, `Failed to pick images: ${e}`)
      throw e
    }

    return results
  }

  private static extractFileName(uri: string): string {
    const parts = uri.split('/')
    const lastPart = parts[parts.length - 1]
    
    if (!lastPart) return `image-${Date.now()}`
    
    // Remove query params if present
    const cleanPart = lastPart.split('?')[0]
    
    // If it's a UUID, generate a friendly name
    if (cleanPart.length === 36 && cleanPart.includes('-')) {
      return `image-${Date.now()}`
    }
    
    return cleanPart
  }

  private static async fileToBase64(uri: string): Promise<string> {
    try {
      const file = fs.openSync(uri, fs.OpenMode.READ_ONLY)
      const stat = fs.statSync(uri)
      const arrayBuffer = new ArrayBuffer(stat.size)
      const bytesRead = fs.readSync(file.fd, arrayBuffer)
      fs.closeSync(file.fd)

      // Convert ArrayBuffer to Uint8Array
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Convert to base64
      let binary = ''
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i])
      }
      
      return globalThis.btoa(binary)
    } catch (e) {
      Logger.error(TAG, `Failed to convert file to base64: ${e}`)
      throw e
    }
  }

  static isBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str
    } catch (err) {
      return false
    }
  }

  static getImageMimeType(base64: string): string {
    // Check PNG signature
    if (base64.startsWith('iVBORw0KGgo')) {
      return 'image/png'
    }
    // Check JPEG signature
    if (base64.startsWith('/9j/')) {
      return 'image/jpeg'
    }
    // Check GIF signature
    if (base64.startsWith('R0lGOD')) {
      return 'image/gif'
    }
    // Check WebP signature
    if (base64.startsWith('UklGR')) {
      return 'image/webp'
    }
    return 'image/jpeg' // default
  }
}
