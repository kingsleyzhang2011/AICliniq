import fs from '@ohos.file.fs'
import { filePicker } from '@kit.CoreFileKit'
import { Logger } from './Logger'

const TAG = 'FileUtils'

export class FileUtils {
  static formatFileName(name: string, extension: string): string {
    // Remove or replace invalid filename characters
    const sanitized = name.replace(/[<>:"|?*\x00-\x1f]/g, '_')
    return `${sanitized}.${extension}`
  }

  static async exportJSON(fileName: string, content: string): Promise<void> {
    try {
      // Open file picker for save
      const result = await filePicker.save({
        defaultName: fileName,
        filters: {
          suffixes: ['.json']
        }
      })

      if (!result || result.length === 0) {
        Logger.warn(TAG, 'File save cancelled')
        return
      }

      const filePath = result[0]
      const file = fs.openSync(filePath, fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE | fs.OpenMode.TRUNC)
      fs.writeSync(file.fd, content, { encoding: 'utf-8' })
      fs.closeSync(file)
      Logger.info(TAG, `JSON exported to ${filePath}`)
    } catch (e) {
      Logger.error(TAG, `Failed to export JSON: ${e}`)
      throw e
    }
  }

  static async savePNG(fileName: string, pixelMapBuffer: ArrayBuffer): Promise<void> {
    try {
      // Open file picker for save
      const result = await filePicker.save({
        defaultName: fileName,
        filters: {
          suffixes: ['.png']
        }
      })

      if (!result || result.length === 0) {
        Logger.warn(TAG, 'File save cancelled')
        return
      }

      const filePath = result[0]
      const file = fs.openSync(filePath, fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE | fs.OpenMode.TRUNC)
      fs.writeSync(file.fd, pixelMapBuffer)
      fs.closeSync(file)
      Logger.info(TAG, `PNG exported to ${filePath}`)
    } catch (e) {
      Logger.error(TAG, `Failed to save PNG: ${e}`)
      throw e
    }
  }

  static async savePDF(fileName: string, pdfBuffer: ArrayBuffer): Promise<void> {
    try {
      // Open file picker for save
      const result = await filePicker.save({
        defaultName: fileName,
        filters: {
          suffixes: ['.pdf']
        }
      })

      if (!result || result.length === 0) {
        Logger.warn(TAG, 'File save cancelled')
        return
      }

      const filePath = result[0]
      const file = fs.openSync(filePath, fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE | fs.OpenMode.TRUNC)
      fs.writeSync(file.fd, pdfBuffer)
      fs.closeSync(file)
      Logger.info(TAG, `PDF exported to ${filePath}`)
    } catch (e) {
      Logger.error(TAG, `Failed to save PDF: ${e}`)
      throw e
    }
  }
}
