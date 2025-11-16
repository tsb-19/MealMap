import { useState } from 'react'
import { X, Download } from 'lucide-react'
import { LocalStudent, getRegionColor, getColorConfig, getStyleSettings } from '@/lib/storage'
import html2canvas from 'html2canvas'

declare global {
  interface Window {
    __mealMapForceLineRecalc?: () => Promise<void>
    __mealMapPrepareExport?: () => Promise<() => void>
    __mealMapExport?: (options?: { format?: 'png' | 'jpeg' }) => Promise<string>
  }
}

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  mapElementId: string
  studentCount: number
  regionCount: number
  mapsConfig?: any
  currentStudents?: LocalStudent[]
  currentCountry?: 'china' | 'usa'
}

export default function ExportModal({
  isOpen,
  onClose,
  mapElementId,
  studentCount,
  regionCount,
  mapsConfig,
  currentStudents = [],
  currentCountry = 'china'
}: ExportModalProps) {
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [loading, setLoading] = useState(false)
  const styleSettings = getStyleSettings()

  const handleExport = async () => {
    try {
      setLoading(true)

      const timestamp = new Date().toISOString().split('T')[0]
      const countryName = currentCountry === 'china' ? '中国' : '美国'
      const ext = format === 'png' ? 'png' : 'jpeg'

      let dataUrl: string | null = null

      // ✅ 优先使用 InteractiveMap 暴露出来的统一导出函数
      if (window.__mealMapExport) {
        dataUrl = await window.__mealMapExport({ format })
      } else {
        // ⬇️ 兜底方案：使用传入的 mapElementId 自己截一张
        const mapElement = document.getElementById(mapElementId)
        if (!mapElement) {
          throw new Error(`Map element not found: ${mapElementId}`)
        }

        let cleanup: (() => void) | undefined

        if (window.__mealMapPrepareExport) {
          cleanup = await window.__mealMapPrepareExport()
        } else if (window.__mealMapForceLineRecalc) {
          await window.__mealMapForceLineRecalc()
          await new Promise(resolve =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
        }

        const canvas = await html2canvas(mapElement, {
          backgroundColor: styleSettings.canvasBackgroundColor || '#f5f5f5',
          scale: window.devicePixelRatio * 2,
          logging: false,
          useCORS: true,
          onclone: (clonedDoc) => {
            // 不动卡片的 transform，避免线条错位和文字竖直偏移
            clonedDoc.querySelectorAll('[data-export-ignore]').forEach(el => el.remove())
          }
        })

        const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
        dataUrl = canvas.toDataURL(mime)

        cleanup?.()
      }

      if (!dataUrl) {
        throw new Error('生成导出图片失败')
      }

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${countryName}地图-${timestamp}.${ext}`
      link.click()
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      alert(
        `导出失败: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-90vw">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">导出地图</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-gray-50 rounded-md p-3">
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">当前地图：</span>
                {currentCountry === 'china' ? '中国地图' : '美国地图'}
              </p>
              <p>
                <span className="font-medium">已添加同学：</span>
                {studentCount} 位
              </p>
              <p>
                <span className="font-medium">覆盖地区：</span>
                {regionCount} 个
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择导出格式
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="png"
                  checked={format === 'png'}
                  onChange={e => setFormat(e.target.value as 'png')}
                  className="mr-2"
                />
                PNG (推荐)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="jpeg"
                  checked={format === 'jpeg'}
                  onChange={e => setFormat(e.target.value as 'jpeg')}
                  className="mr-2"
                />
                JPEG
              </label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>导出说明：</strong>
              <br />
              • 导出将截取当前地图视图。
              <br />
              • 学生信息将按所见显示。
              <br />
              • 确保在导出前所有卡片都可见。
            </p>
          </div>
        </div>

        <div className="flex space-x-3 p-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Download size={16} className="mr-2" />
                导出地图
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
