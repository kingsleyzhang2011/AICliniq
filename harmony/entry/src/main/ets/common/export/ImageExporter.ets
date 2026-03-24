import { image } from '@kit.ImageKit'
import { ComponentSnapshot } from '@kit.ArkUI'
import { Logger } from '../utils/Logger'
import { FileUtils } from '../utils/FileUtils'

const TAG = 'ImageExporter'

export class ImageExporter {
  static async exportComponentAsImage(componentId: string, fileName: string): Promise<void> {
    try {
      Logger.info(TAG, `Starting image export for component: ${componentId}`)

      // Get component snapshot
      const snapshot = await ComponentSnapshot.get(componentId)
      if (!snapshot) {
        throw new Error('Failed to get component snapshot')
      }

      const pixelMap = await snapshot.toPixelMap()
      if (!pixelMap) {
        throw new Error('Failed to create PixelMap from snapshot')
      }

      // Get image data
      const imageData = await pixelMap.getImageData()
      if (!imageData) {
        throw new Error('Failed to get image data from PixelMap')
      }

      // Save to file
      const sanitizedFileName = FileUtils.formatFileName(fileName, 'png')
      await FileUtils.savePNG(sanitizedFileName, imageData.data)

      Logger.info(TAG, `Image exported successfully: ${sanitizedFileName}`)
    } catch (e) {
      Logger.error(TAG, `Failed to export image: ${e}`)
      throw e
    }
  }

  static async pixelMapToPNG(pixelMap: image.PixelMap, fileName: string): Promise<void> {
    try {
      Logger.info(TAG, 'Converting PixelMap to PNG')

      const imageData = await pixelMap.getImageData()
      if (!imageData) {
        throw new Error('Failed to get image data from PixelMap')
      }

      const sanitizedFileName = FileUtils.formatFileName(fileName, 'png')
      await FileUtils.savePNG(sanitizedFileName, imageData.data)

      Logger.info(TAG, `PNG saved successfully: ${sanitizedFileName}`)
    } catch (e) {
      Logger.error(TAG, `Failed to convert PixelMap to PNG: ${e}`)
      throw e
    }
  }
}
