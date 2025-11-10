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

  // V3彻底修复版本：简化且稳定的导出方案
  const addStudentCardsAndLines = async (container: HTMLElement, students: LocalStudent[], regions: any[], country: 'china' | 'usa') => {
    console.log(`=== 开始处理 ${country} 地图的学生卡片和连线 (V3彻底修复版) ===`)
    console.log('输入参数:', { students: students.length, regions: regions.length, country })
    
    // 按地区分组学生
    const studentsByRegion: Record<string, LocalStudent[]> = {}
    students.forEach(student => {
      if (!studentsByRegion[student.region_id]) {
        studentsByRegion[student.region_id] = []
      }
      studentsByRegion[student.region_id].push(student)
    })

    console.log('按地区分组的学生:', Object.keys(studentsByRegion).length, '个地区')

    // 获取SVG元素
    const svgEl = container.querySelector('svg')
    if (!svgEl) {
      console.error('未找到SVG元素')
      return
    }
    
    // 获取SVG的实际尺寸和位置
    const svgRect = svgEl.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    console.log('SVG和容器尺寸信息:', {
      svgRect: { width: svgRect.width, height: svgRect.height },
      containerRect: { width: containerRect.width, height: containerRect.height }
    })

    // 清理之前的卡片和连线
    const existingCards = container.querySelectorAll('.export-student-card')
    const existingLines = container.querySelectorAll('.export-connection-line')
    existingCards.forEach(card => card.remove())
    existingLines.forEach(line => line.remove())

    // 中国省份位置映射（基于SVG viewBox 1200x900）
    const chinaRegionPositions: { [key: string]: { x: number, y: number } } = {
      // 标准区域代码
      'CN-110000': { x: 810, y: 352 }, 'CN-120000': { x: 829, y: 366 }, 'CN-130000': { x: 774, y: 399 },
      'CN-140000': { x: 735, y: 403 }, 'CN-150000': { x: 720, y: 329 }, 'CN-210000': { x: 946, y: 305 },
      'CN-220000': { x: 983, y: 255 }, 'CN-230000': { x: 983, y: 155 }, 'CN-310000': { x: 851, y: 419 },
      'CN-320000': { x: 809, y: 439 }, 'CN-330000': { x: 809, y: 479 }, 'CN-340000': { x: 774, y: 439 },
      'CN-350000': { x: 809, y: 519 }, 'CN-360000': { x: 774, y: 519 }, 'CN-370000': { x: 809, y: 379 },
      'CN-410000': { x: 739, y: 419 }, 'CN-420000': { x: 739, y: 459 }, 'CN-430000': { x: 739, y: 519 },
      'CN-440000': { x: 739, y: 579 }, 'CN-450000': { x: 669, y: 579 }, 'CN-460000': { x: 669, y: 659 },
      'CN-500000': { x: 629, y: 479 }, 'CN-510000': { x: 589, y: 479 }, 'CN-520000': { x: 629, y: 539 },
      'CN-530000': { x: 589, y: 539 }, 'CN-540000': { x: 349, y: 479 }, 'CN-610000': { x: 629, y: 419 },
      'CN-620000': { x: 589, y: 379 }, 'CN-630000': { x: 529, y: 379 }, 'CN-640000': { x: 589, y: 339 },
      'CN-650000': { x: 349, y: 279 },
      // 省份简称
      'CN-BJ': { x: 810, y: 352 }, 'CN-TJ': { x: 829, y: 366 }, 'CN-HE': { x: 774, y: 399 },
      'CN-SX': { x: 735, y: 403 }, 'CN-NM': { x: 720, y: 329 }, 'CN-LN': { x: 946, y: 305 },
      'CN-JL': { x: 983, y: 255 }, 'CN-HL': { x: 983, y: 155 }, 'CN-SH': { x: 851, y: 419 },
      'CN-JS': { x: 809, y: 439 }, 'CN-ZJ': { x: 809, y: 479 }, 'CN-AH': { x: 774, y: 439 },
      'CN-FJ': { x: 809, y: 519 }, 'CN-JX': { x: 774, y: 519 }, 'CN-SD': { x: 809, y: 379 },
      'CN-HA': { x: 739, y: 419 }, 'CN-HB': { x: 739, y: 459 }, 'CN-HN': { x: 739, y: 519 },
      'CN-GD': { x: 739, y: 579 }, 'CN-GX': { x: 669, y: 579 }, 'CN-HI': { x: 669, y: 659 },
      'CN-CQ': { x: 629, y: 479 }, 'CN-SC': { x: 589, y: 479 }, 'CN-GZ': { x: 629, y: 539 },
      'CN-YN': { x: 589, y: 539 }, 'CN-XZ': { x: 349, y: 479 }, 'CN-SN': { x: 629, y: 419 },
      'CN-GS': { x: 589, y: 379 }, 'CN-QH': { x: 529, y: 379 }, 'CN-NX': { x: 589, y: 339 },
      'CN-XJ': { x: 349, y: 279 }
    }

    const regionPositions = chinaRegionPositions

    // 为每个地区生成卡片和连线
    for (const [regionId, regionStudents] of Object.entries(studentsByRegion)) {
      const position = regionPositions[regionId]
      if (!position) {
        console.warn(`未找到地区 ${regionId} 的位置信息`)
        continue
      }

      console.log(`处理地区 ${regionId}:`, regionStudents.length, '个学生')

      // 创建连线 - 使用SVG元素
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('class', 'export-connection-line')
      line.setAttribute('x1', position.x.toString())
      line.setAttribute('y1', position.y.toString())
      line.setAttribute('x2', (position.x + 80).toString())
      line.setAttribute('y2', (position.y + 30).toString())
      line.setAttribute('stroke', '#3b82f6')
      line.setAttribute('stroke-width', '2')
      line.setAttribute('stroke-dasharray', '5,5')
      line.setAttribute('opacity', '0.8')
      
      // 确保连线在SVG内部
      svgEl.appendChild(line)

      // 创建学生卡片 - 使用绝对定位
      const card = document.createElement('div')
      card.className = 'export-student-card'
      card.style.cssText = `
        position: absolute;
        left: ${position.x + 80}px;
        top: ${position.y + 30}px;
        background: white;
        border: 2px solid #3b82f6;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 14px;
        min-width: 140px;
        max-width: 200px;
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.4;
        color: #1f2937;
      `

      // 获取地区名称
      const regionName = regions.find(r => r.id === regionId)?.name || regionId.replace('CN-', '').replace('CN-', '')

      // 生成卡片内容
      const studentsHtml = regionStudents.map(student => `
        <div style="margin: 4px 0; padding: 2px 0; border-bottom: 1px solid #f3f4f6;">
          <div style="font-weight: 600; color: #111827; margin-bottom: 2px;">${student.name}</div>
          <div style="font-size: 12px; color: #6b7280;">
            ${student.school} - ${student.city}
          </div>
        </div>
      `).join('')

      card.innerHTML = `
        <div style="font-weight: bold; color: #1f2937; margin-bottom: 8px; font-size: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px;">
          ${regionName}
        </div>
        <div style="margin-bottom: 6px;">
          ${studentsHtml}
        </div>
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
          共 ${regionStudents.length} 人
        </div>
      `

      // 确保卡片在容器内
      container.appendChild(card)
      
      console.log(`成功创建地区 ${regionId} 的卡片和连线`)
    }

    console.log(`成功处理了 ${Object.keys(studentsByRegion).length} 个地区的卡片和连线`)
  }

  const handleExport = async () => {
    const startTime = Date.now()
    console.log('[ExportModal V3] 开始导出流程', {
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
      console.log('[ExportModal V3] 步骤1: 验证地图元素')
      const mapElement = document.getElementById(mapElementId)
      if (!mapElement) {
        throw new Error(`未找到地图元素: ${mapElementId}`)
      }

      console.log('[ExportModal V3] 地图元素找到', {
        elementId: mapElement.id,
        offsetWidth: mapElement.offsetWidth,
        offsetHeight: mapElement.offsetHeight
      })

      // 步骤2: 验证html2canvas库
      console.log('[ExportModal V3] 步骤2: 验证html2canvas库')
      if (!html2canvas || typeof html2canvas !== 'function') {
        throw new Error('html2canvas库未正确加载或导入')
      }

      // 步骤3: 等待DOM稳定
      console.log('[ExportModal V3] 步骤3: 等待DOM稳定')
      mapElement.offsetHeight // 强制重排
      await new Promise(resolve => setTimeout(resolve, 300))

      // 步骤4: 添加学生卡片和连线
      console.log('[ExportModal V3] 步骤4: 添加学生卡片和连线')
      if (studentCount > 0 && mapsConfig && currentStudents.length > 0) {
        const regions = mapsConfig?.countries?.[currentCountry]?.administrative_divisions || []
        console.log('[ExportModal V3] 开始添加卡片和连线...')
        await addStudentCardsAndLines(mapElement, currentStudents, regions, currentCountry)
        await new Promise(resolve => setTimeout(resolve, 800)) // 等待渲染完成
        console.log('[ExportModal V3] ✅ 学生卡片和连线添加完成')
      } else {
        console.log('[ExportModal V3] ❌ 条件不满足，跳过卡片和连线添加')
      }

      // 步骤5: 优化截图配置 - V3修复版本
      console.log('[ExportModal V3] 步骤5: 开始截图')
      
      // 创建一个临时容器来确保内容居中
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
      `
      
      // 将地图元素复制到临时容器中
      const mapClone = mapElement.cloneNode(true) as HTMLElement
      mapClone.style.cssText = `
        width: auto;
        height: auto;
        max-width: 90%;
        max-height: 90%;
      `
      
      tempContainer.appendChild(mapClone)
      document.body.appendChild(tempContainer)

      const canvasOptions = {
        backgroundColor: '#ffffff',
        scale: 2, // 提高清晰度
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false, // 禁用可能有问题的渲染方式
        imageTimeout: 15000,
        removeContainer: false,
        scrollX: 0,
        scrollY: 0,
        width: tempContainer.offsetWidth,
        height: tempContainer.offsetHeight,
        x: 0,
        y: 0,
        ignoreElements: () => false,
        onclone: (clonedDoc) => {
          // 确保克隆的文档中卡片样式正确
          const clonedCards = clonedDoc.querySelectorAll('.export-student-card')
          const clonedLines = clonedDoc.querySelectorAll('.export-connection-line')
          
          clonedCards.forEach(card => {
            card.style.visibility = 'visible'
            card.style.display = 'block'
            card.style.position = 'absolute'
            card.style.zIndex = '1000'
          })
          
          clonedLines.forEach(line => {
            line.style.visibility = 'visible'
            line.style.display = 'block'
          })
          
          console.log('[ExportModal V3] 克隆文档处理完成', {
            cardsFound: clonedCards.length,
            linesFound: clonedLines.length
          })
        }
      }

      console.log('[ExportModal V3] html2canvas配置参数', canvasOptions)
      
      let canvas: HTMLCanvasElement
      try {
        canvas = await html2canvas(tempContainer, canvasOptions)
        console.log('[ExportModal V3] 截图完成', { 
          canvasWidth: canvas.width, 
          canvasHeight: canvas.height 
        })
      } catch (canvasError) {
        console.error('[ExportModal V3] 截图失败', canvasError)
        throw canvasError
      } finally {
        // 清理临时容器
        document.body.removeChild(tempContainer)
      }

      // 步骤6: 生成并下载图片
      console.log('[ExportModal V3] 步骤6: 生成并下载图片')
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
        
        console.log('[ExportModal V3] 开始下载', {
          filename: link.download,
          urlLength: url.length
        })
        
        link.click()
        URL.revokeObjectURL(url)
        
        console.log('[ExportModal V3] 下载触发完成')
      }, `image/${format}`)

      // 步骤7: 完成
      const totalTime = Date.now() - startTime
      console.log('[ExportModal V3] 导出完成', {
        totalTime,
        success: true,
        timestamp: new Date().toISOString()
      })
      
      onClose()
    } catch (error) {
      const totalTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      console.error('[ExportModal V3] 导出失败', {
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