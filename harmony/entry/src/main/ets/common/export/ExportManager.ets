import { ConsultationSnapshot } from '../models/index'
import { PersistenceManager } from '../persistence/PersistenceManager'
import { ImageExporter } from './ImageExporter'
import { PdfExporter } from './PdfExporter'
import { Logger } from '../utils/Logger'

const TAG = 'ExportManager'

export class ExportManager {
  private static instance: ExportManager | null = null

  private constructor() {}

  static getInstance(): ExportManager {
    if (!ExportManager.instance) {
      ExportManager.instance = new ExportManager()
    }
    return ExportManager.instance
  }

  async exportSessionAsImage(
    snapshot: ConsultationSnapshot,
    sessionName: string,
    componentId: string
  ): Promise<void> {
    try {
      Logger.info(TAG, `Exporting session ${sessionName} as image`)

      const fileName = `${sessionName}_报告.png`
      await ImageExporter.exportComponentAsImage(componentId, fileName)

      Logger.info(TAG, `Session exported as image: ${fileName}`)
    } catch (e) {
      Logger.error(TAG, `Failed to export session as image: ${e}`)
      throw e
    }
  }

  async exportSessionAsPDF(
    snapshot: ConsultationSnapshot,
    sessionName: string,
    componentId: string
  ): Promise<void> {
    try {
      Logger.info(TAG, `Exporting session ${sessionName} as PDF`)

      const fileName = `${sessionName}_报告.pdf`
      await PdfExporter.exportComponentAsPDF(componentId, fileName)

      Logger.info(TAG, `Session exported as PDF: ${fileName}`)
    } catch (e) {
      Logger.error(TAG, `Failed to export session as PDF: ${e}`)
      throw e
    }
  }
}

export function getExportManager(): ExportManager {
  return ExportManager.getInstance()
}
