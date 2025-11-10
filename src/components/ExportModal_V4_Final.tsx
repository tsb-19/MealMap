import { useState } from 'react'
import { X, Download } from 'lucide-react'
import html2canvas from 'html2canvas'
import { LocalStudent, getRegionColor, getColorConfig } from '@/lib/storage'

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
  currentCountry = 'china',
}: ExportModalProps) {
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [loading, setLoading] = useState(false)

  // V4修复版本：使用网页端现有卡片，隐藏交互元素
  const prepareExportElements = async (container: HTMLElement) => {
    console.log(`=== 开始准备导出元素 (V4修复版) ===`)
    
    // 清理之前的导出元素
    const existingExportElements = container.querySelectorAll('.export-only-element')
    existingExportElements.forEach(element => element.remove())
    
    // 隐藏所有交互元素（按钮等）
    const interactiveElements = container.querySelectorAll('button, .cursor-pointer, [data-interactive]')
    interactiveElements.forEach(element => {
      // 为按钮添加特殊样式类
      element.classList.add('export-hidden')
    })
    
    // 修复数据问题 - 查找并修复undefined值
    const textNodes = container.querySelectorAll('*')
    textNodes.forEach(element => {
      if (element.textContent && element.textContent.includes('undefined')) {
        console.log('发现undefined文本:', element.textContent)
        // 这里可以添加具体的修复逻辑
      }
    })
    
    console.log('✅ 导出元素准备完成')
  }

  const handleExport = async () => {
    const startTime = Date.now()
    console.log('[ExportModal V4] 开始导出流程', {
      timestamp: new Date().toISOString(),
      mapElementId,
      studentCount,
      regionCount,
      format,
      currentCountry
    })

    try {
      setLoading(true)

      // 步骤1: 验证地图元素
      console.log('[ExportModal V4] 步骤1: 验证地图元素')
      const mapElement = document.getElementById(mapElementId)
      if (!mapElement) {
        throw new Error(`未找到地图元素: ${mapElementId}`)
      }

      console.log('[ExportModal V4] 地图元素找到', {
        elementId: mapElement.id,
        offsetWidth: mapElement.offsetWidth,
        offsetHeight: mapElement.offsetHeight
      })

      // 步骤2: 验证html2canvas库
      console.log('[ExportModal V4] 步骤2: 验证html2canvas库')
      if (!html2canvas || typeof html2canvas !== 'function') {
        throw new Error('html2canvas库未正确加载或导入')
      }

      // 步骤3: 等待DOM稳定
      console.log('[ExportModal V4] 步骤3: 等待DOM稳定')
      mapElement.offsetHeight // 强制重排
      await new Promise(resolve => setTimeout(resolve, 300))

      // 步骤4: 准备导出元素
      console.log('[ExportModal V4] 步骤4: 准备导出元素')
      await prepareExportElements(mapElement)
      await new Promise(resolve => setTimeout(resolve, 500)) // 等待样式应用

      // 步骤5: 创建临时容器确保居中
      console.log('[ExportModal V4] 步骤5: 创建临时容器')
      
      const tempContainer = document.createElement('div')
      tempContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        padding: 20px;
        box-sizing: border-box;
      `
      
      // 复制地图元素
      const mapClone = mapElement.cloneNode(true) as HTMLElement
      mapClone.style.cssText = `
        width: auto;
        height: auto;
        max-width: 100%;
        max-height: 100%;
        position: relative;
      `
      
      tempContainer.appendChild(mapClone)
      document.body.appendChild(tempContainer)

      // 步骤6: 优化截图配置
      console.log('[ExportModal V4] 步骤6: 开始截图')
      
      const canvasOptions = {
        backgroundColor: '#ffffff',
        scale: 2, // 提高清晰度
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        imageTimeout: 15000,
        removeContainer: false,
        scrollX: 0,
        scrollY: 0,
        width: tempContainer.offsetWidth,
        height: tempContainer.offsetHeight,
        x: 0,
        y: 0,
        ignoreElements: (element) => {
          // 忽略交互元素
          return element.classList.contains('export-hidden') || 
                 element.getAttribute('data-interactive') === 'true'
        },
        onclone: (clonedDoc, clonedElement) => {
          console.log('[ExportModal V4] 克隆文档处理开始')
          
          // 隐藏克隆文档中的交互元素
          const hiddenElements = clonedDoc.querySelectorAll('.export-hidden')
          hiddenElements.forEach(element => {
            element.style.display = 'none'
            element.style.visibility = 'hidden'
          })
          
          // 修复undefined文本
          const textElements = clonedDoc.querySelectorAll('*')
          textElements.forEach(element => {
            if (element.textContent) {
              element.textContent = element.textContent.replace(/undefined/g, '未知')
            }
          })
          
          // 确保卡片样式正确
          const studentCards = clonedDoc.querySelectorAll('[class*="student"], [class*="card"]')
          studentCards.forEach(card => {
            card.style.visibility = 'visible'
            card.style.display = 'block'
            if (card instanceof HTMLElement) {
              card.style.position = 'relative'
              card.style.zIndex = 'auto'
            }
          })
          
          console.log('[ExportModal V4] 克隆文档处理完成', {
            hiddenElements: hiddenElements.length,
            studentCards: studentCards.length
          })
        }
      }

      console.log('[ExportModal V4] html2canvas配置参数', canvasOptions)
      
      let canvas: HTMLCanvasElement
      try {
        canvas = await html2canvas(tempContainer, canvasOptions)
        console.log('[ExportModal V4] 截图完成', { 
          canvasWidth: canvas.width, 
          canvasHeight: canvas.height 
        })
      } catch (canvasError) {
        console.error('[ExportModal V4] 截图失败', canvasError)
        throw canvasError
      } finally {
        // 清理临时容器
        document.body.removeChild(tempContainer)
      }

      // 步骤7: 生成并下载图片
      console.log('[ExportModal V4] 步骤7: 生成并下载图片')
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('无法生成图片Blob')
        }

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        const timestamp = new Date().toISOString().split('T')[0]
        const countryName = currentCountry === 'china' ? '中国' : '美国'
        link.download = `${countryName}地图-${timestamp}.${format}`
        
        console.log('[ExportModal V4] 开始下载', {
          filename: link.download,
          urlLength: url.length
        })
        
        link.click()
        URL.revokeObjectURL(url)
        
        console.log('[ExportModal V4] 下载触发完成')
      }, `image/${format}`)

      // 步骤8: 完成
      const totalTime = Date.now() - startTime
      console.log('[ExportModal V4] 导出完成', {
        totalTime,
        success: true,
        timestamp: new Date().toISOString()
      })
      
      onClose()
    } catch (error) {
      const totalTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      console.error('[ExportModal V4] 导出失败', {
        error: errorMessage,
        mapElementId,
        studentCount,
        regionCount,
        format,
        totalTime,
        timestamp: new Date().toISOString()
      })
      
      alert(`导出失败: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">导出地图</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            当前地图: {currentCountry === 'china' ? '中国地图' : '美国地图'}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            学生数量: {studentCount} 人
          </p>
          <p className="text-sm text-gray-600 mb-4">
            覆盖地区: {regionCount} 个
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              导出格式
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="png"
                  checked={format === 'png'}
                  onChange={(e) => setFormat(e.target.value as 'png')}
                  className="mr-2"
                />
                PNG (推荐)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="jpeg"
                  checked={format === 'jpeg'}
                  onChange={(e) => setFormat(e.target.value as 'jpeg')}
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
              • 将使用网页端现有的学生卡片
              <br />
              • 自动隐藏编辑/删除按钮
              <br />
              • 修复数据显示问题
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
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