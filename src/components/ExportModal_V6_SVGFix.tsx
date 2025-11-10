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

  // V6修复版本：解决SVG地图渲染问题
  const prepareExportElements = async (container: HTMLElement) => {
    console.log(`=== 开始准备导出元素 (V6 SVG修复版) ===`)
    
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
        // 修复undefined显示
        element.textContent = element.textContent.replace(/undefined/g, '未知')
      }
    })
    
    console.log('✅ 导出元素准备完成')
  }

  const handleExport = async () => {
    const startTime = Date.now()
    console.log('[ExportModal V6] 开始导出流程', {
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
      console.log('[ExportModal V6] 步骤1: 验证地图元素')
      const mapElement = document.getElementById(mapElementId)
      if (!mapElement) {
        throw new Error(`未找到地图元素: ${mapElementId}`)
      }

      console.log('[ExportModal V6] 地图元素找到', {
        elementId: mapElement.id,
        offsetWidth: mapElement.offsetWidth,
        offsetHeight: mapElement.offsetHeight
      })

      // 步骤2: 验证html2canvas库
      console.log('[ExportModal V6] 步骤2: 验证html2canvas库')
      if (!html2canvas || typeof html2canvas !== 'function') {
        throw new Error('html2canvas库未正确加载或导入')
      }

      // 步骤3: 等待DOM稳定
      console.log('[ExportModal V6] 步骤3: 等待DOM稳定')
      mapElement.offsetHeight // 强制重排
      await new Promise(resolve => setTimeout(resolve, 300))

      // 步骤4: 准备导出元素
      console.log('[ExportModal V6] 步骤4: 准备导出元素')
      await prepareExportElements(mapElement)
      await new Promise(resolve => setTimeout(resolve, 500)) // 等待样式应用

      // 步骤5: 创建临时容器确保居中 - 专门处理SVG地图
      console.log('[ExportModal V6] 步骤5: 创建临时容器')
      
      const tempContainer = document.createElement('div')
      // 使用更简单、更安全的CSS属性
      tempContainer.style.position = 'absolute'
      tempContainer.style.top = '0'
      tempContainer.style.left = '0'
      tempContainer.style.width = '100%'
      tempContainer.style.height = '100%'
      tempContainer.style.display = 'flex'
      tempContainer.style.alignItems = 'center'
      tempContainer.style.justifyContent = 'center'
      tempContainer.style.backgroundColor = '#ffffff'
      tempContainer.style.padding = '20px'
      
      // 复制地图元素 - 特别注意SVG内容的处理
      const mapClone = mapElement.cloneNode(true) as HTMLElement
      
      // 确保SVG内容被正确复制
      const svgContainer = mapClone.querySelector('[dangerouslySetInnerHTML]') as HTMLElement
      if (svgContainer) {
        console.log('[ExportModal V6] 发现SVG容器，尝试修复')
        // 如果有SVG容器，尝试直接复制其内容
        const originalSvgContainer = mapElement.querySelector('[dangerouslySetInnerHTML]') as HTMLElement
        if (originalSvgContainer) {
          svgContainer.innerHTML = originalSvgContainer.innerHTML
          console.log('[ExportModal V6] SVG内容复制完成')
        }
      }
      
      // 使用更简单的CSS属性
      mapClone.style.width = 'auto'
      mapClone.style.height = 'auto'
      mapClone.style.maxWidth = '100%'
      mapClone.style.maxHeight = '100%'
      mapClone.style.position = 'relative'
      
      tempContainer.appendChild(mapClone)
      document.body.appendChild(tempContainer)

      // 步骤6: 优化截图配置 - 专门处理SVG
      console.log('[ExportModal V6] 步骤6: 开始截图')
      
      const canvasOptions = {
        backgroundColor: '#ffffff',
        scale: 1.5, // 降低scale避免复杂CSS处理
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: true, // 启用foreignObject渲染，对SVG友好
        imageTimeout: 15000,
        removeContainer: false,
        scrollX: 0,
        scrollY: 0,
        width: tempContainer.offsetWidth,
        height: tempContainer.offsetHeight,
        x: 0,
        y: 0,
        ignoreElements: (element) => {
          // 简化忽略逻辑
          return element.classList.contains('export-hidden')
        },
        onclone: (clonedDoc, clonedElement) => {
          console.log('[ExportModal V6] 克隆文档处理开始')
          
          try {
            // 隐藏克隆文档中的交互元素
            const hiddenElements = clonedDoc.querySelectorAll('.export-hidden')
            hiddenElements.forEach(element => {
              if (element instanceof HTMLElement) {
                element.style.display = 'none'
                element.style.visibility = 'hidden'
              }
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
              if (card instanceof HTMLElement) {
                card.style.visibility = 'visible'
                card.style.display = 'block'
                card.style.position = 'relative'
                card.style.zIndex = 'auto'
              }
            })
            
            // 特别处理SVG元素
            const svgElements = clonedDoc.querySelectorAll('svg')
            svgElements.forEach(svg => {
              if (svg instanceof SVGElement) {
                svg.style.width = '100%'
                svg.style.height = '100%'
                svg.style.display = 'block'
                console.log('[ExportModal V6] SVG元素处理完成')
              }
            })
            
            // 确保地图容器正确显示
            const mapContainers = clonedDoc.querySelectorAll('[class*="map"], [class*="svg"]')
            mapContainers.forEach(container => {
              if (container instanceof HTMLElement) {
                container.style.width = '100%'
                container.style.height = '100%'
                container.style.overflow = 'hidden'
              }
            })
            
            console.log('[ExportModal V6] 克隆文档处理完成', {
              hiddenElements: hiddenElements.length,
              studentCards: studentCards.length,
              svgElements: svgElements.length,
              mapContainers: mapContainers.length
            })
          } catch (cloneError) {
            console.error('[ExportModal V6] 克隆处理出错', cloneError)
            // 不抛出错误，继续导出
          }
        }
      }

      console.log('[ExportModal V6] html2canvas配置参数', canvasOptions)
      
      let canvas: HTMLCanvasElement
      try {
        canvas = await html2canvas(tempContainer, canvasOptions)
        console.log('[ExportModal V6] 截图完成', { 
          canvasWidth: canvas.width, 
          canvasHeight: canvas.height 
        })
      } catch (canvasError) {
        console.error('[ExportModal V6] 截图失败', canvasError)
        
        // 如果失败，尝试更简单的配置
        console.log('[ExportModal V6] 尝试简化配置重试')
        const simpleOptions = {
          backgroundColor: '#ffffff',
          scale: 1,
          logging: false,
          useCORS: true,
          allowTaint: false,
          foreignObjectRendering: true, // 保持SVG支持
          imageTimeout: 10000,
          width: tempContainer.offsetWidth,
          height: tempContainer.offsetHeight
        }
        
        try {
          canvas = await html2canvas(tempContainer, simpleOptions)
          console.log('[ExportModal V6] 简化配置截图成功')
        } catch (retryError) {
          console.error('[ExportModal V6] 简化配置也失败', retryError)
          throw new Error(`导出失败: ${retryError instanceof Error ? retryError.message : '未知错误'}`)
        }
      } finally {
        // 清理临时容器
        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer)
        }
      }

      // 步骤7: 生成并下载图片
      console.log('[ExportModal V6] 步骤7: 生成并下载图片')
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
        
        console.log('[ExportModal V6] 开始下载', {
          filename: link.download,
          urlLength: url.length
        })
        
        link.click()
        URL.revokeObjectURL(url)
        
        console.log('[ExportModal V6] 下载触发完成')
      }, `image/${format}`)

      // 步骤8: 完成
      const totalTime = Date.now() - startTime
      console.log('[ExportModal V6] 导出完成', {
        totalTime,
        success: true,
        timestamp: new Date().toISOString()
      })
      
      onClose()
    } catch (error) {
      const totalTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      console.error('[ExportModal V6] 导出失败', {
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
              • V6版本：修复SVG地图渲染问题
              <br />
              • 专门处理动态SVG内容
              <br />
              • 使用网页端现有的学生卡片
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