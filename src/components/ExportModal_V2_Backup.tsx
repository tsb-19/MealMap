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

  // V2修复版本：改进的学生卡片和连线函数
  const addStudentCardsAndLines = async (container: HTMLElement, students: LocalStudent[], regions: any[], country: 'china' | 'usa') => {
    console.log(`=== 开始处理 ${country} 地图的学生卡片和连线 (V2修复版) ===`)
    
    // 按地区分组学生
    const studentsByRegion: Record<string, LocalStudent[]> = {}
    students.forEach(student => {
      if (!studentsByRegion[student.region_id]) {
        studentsByRegion[student.region_id] = []
      }
      studentsByRegion[student.region_id].push(student)
    })

    // 获取SVG元素
    const svgEl = container.querySelector('svg')
    if (!svgEl) {
      console.error('未找到SVG元素')
      return
    }
    
    // 获取SVG的实际尺寸
    const svgRect = svgEl.getBoundingClientRect()
    console.log('SVG尺寸:', svgRect)

    // 创建连线SVG容器 - 修复定位问题
    const linesContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    linesContainer.setAttribute('width', svgRect.width.toString())
    linesContainer.setAttribute('height', svgRect.height.toString())
    linesContainer.style.position = 'absolute'
    linesContainer.style.top = '0'
    linesContainer.style.left = '0'
    linesContainer.style.pointerEvents = 'none'
    linesContainer.style.zIndex = '10'
    
    // 创建卡片容器 - 修复定位问题
    const cardsContainer = document.createElement('div')
    cardsContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${svgRect.width}px;
      height: ${svgRect.height}px;
      pointer-events: none;
      z-index: 20;
    `
    
    // 添加到容器中
    container.appendChild(linesContainer)
    container.appendChild(cardsContainer)
    
    // 中国省份位置映射（基于实际SVG尺寸）
    const chinaRegionPositions: { [key: string]: { x: number, y: number } } = {
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

    // 美国州位置映射
    const usaRegionPositions: { [key: string]: { x: number, y: number } } = {
      'US-AL': { x: 650, y: 480 }, 'US-AK': { x: 150, y: 500 }, 'US-AZ': { x: 300, y: 450 },
      'US-AR': { x: 550, y: 450 }, 'US-CA': { x: 200, y: 400 }, 'US-CO': { x: 400, y: 350 },
      'US-CT': { x: 850, y: 300 }, 'US-DE': { x: 850, y: 350 }, 'US-FL': { x: 750, y: 550 },
      'US-GA': { x: 750, y: 500 }, 'US-HI': { x: 300, y: 550 }, 'US-ID': { x: 250, y: 250 },
      'US-IL': { x: 600, y: 300 }, 'US-IN': { x: 650, y: 300 }, 'US-IA': { x: 550, y: 250 },
      'US-KS': { x: 450, y: 400 }, 'US-KY': { x: 650, y: 400 }, 'US-LA': { x: 550, y: 500 },
      'US-ME': { x: 900, y: 200 }, 'US-MD': { x: 800, y: 350 }, 'US-MA': { x: 850, y: 250 },
      'US-MI': { x: 650, y: 250 }, 'US-MN': { x: 500, y: 200 }, 'US-MS': { x: 600, y: 500 },
      'US-MO': { x: 500, y: 350 }, 'US-MT': { x: 350, y: 200 }, 'US-NE': { x: 450, y: 300 },
      'US-NV': { x: 250, y: 350 }, 'US-NH': { x: 850, y: 200 }, 'US-NJ': { x: 800, y: 300 },
      'US-NM': { x: 350, y: 450 }, 'US-NY': { x: 800, y: 250 }, 'US-NC': { x: 750, y: 400 },
      'US-ND': { x: 400, y: 150 }, 'US-OH': { x: 650, y: 350 }, 'US-OK': { x: 450, y: 450 },
      'US-OR': { x: 200, y: 200 }, 'US-PA': { x: 750, y: 300 }, 'US-RI': { x: 850, y: 270 },
      'US-SC': { x: 750, y: 450 }, 'US-SD': { x: 400, y: 250 }, 'US-TN': { x: 600, y: 400 },
      'US-TX': { x: 450, y: 500 }, 'US-UT': { x: 300, y: 350 }, 'US-VT': { x: 850, y: 220 },
      'US-VA': { x: 750, y: 350 }, 'US-WA': { x: 200, y: 150 }, 'US-WV': { x: 700, y: 350 },
      'US-WI': { x: 550, y: 200 }, 'US-WY': { x: 350, y: 250 }
    }

    const regionPositions = country === 'china' ? chinaRegionPositions : usaRegionPositions

    // 为每个地区生成卡片和连线
    for (const [regionId, regionStudents] of Object.entries(studentsByRegion)) {
      const position = regionPositions[regionId]
      if (!position) {
        console.warn(`未找到地区 ${regionId} 的位置信息`)
        continue
      }

      // 创建连线
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', position.x.toString())
      line.setAttribute('y1', position.y.toString())
      line.setAttribute('x2', (position.x + 50).toString())
      line.setAttribute('y2', (position.y + 20).toString())
      line.setAttribute('stroke', '#3b82f6')
      line.setAttribute('stroke-width', '2')
      line.setAttribute('stroke-dasharray', '5,5')
      linesContainer.appendChild(line)

      // 创建学生卡片
      const card = document.createElement('div')
      card.className = 'student-card'
      card.style.cssText = `
        position: absolute;
        left: ${position.x + 50}px;
        top: ${position.y + 20}px;
        background: white;
        border: 2px solid #3b82f6;
        border-radius: 8px;
        padding: 8px 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        font-size: 12px;
        min-width: 120px;
        z-index: 30;
      `

      // 添加学生信息
      const regionName = regions.find(r => r.id === regionId)?.name || regionId
      card.innerHTML = `
        <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">${regionName}</div>
        <div style="color: #6b7280; font-size: 11px;">
          ${regionStudents.map(s => `
            <div style="margin: 2px 0;">
              <div style="font-weight: 500;">${s.name}</div>
              <div style="font-size: 10px;">${s.school} - ${s.city}</div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top: 4px; font-size: 10px; color: #9ca3af;">
          共 ${regionStudents.length} 人
        </div>
      `

      cardsContainer.appendChild(card)
    }

    console.log(`成功创建了 ${Object.keys(studentsByRegion).length} 个地区的卡片和连线`)
  }

  const handleExport = async () => {
    const startTime = Date.now()
    console.log('[ExportModal V2] 开始导出流程', {
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
      console.log('[ExportModal V2] 步骤1: 验证地图元素')
      const mapElement = document.getElementById(mapElementId)
      if (!mapElement) {
        throw new Error(`未找到地图元素: ${mapElementId}`)
      }

      console.log('[ExportModal V2] 地图元素找到', {
        elementId: mapElement.id,
        offsetWidth: mapElement.offsetWidth,
        offsetHeight: mapElement.offsetHeight
      })

      // 步骤2: 验证html2canvas库
      console.log('[ExportModal V2] 步骤2: 验证html2canvas库')
      if (!html2canvas || typeof html2canvas !== 'function') {
        throw new Error('html2canvas库未正确加载或导入')
      }

      // 步骤3: 等待DOM稳定
      console.log('[ExportModal V2] 步骤3: 等待DOM稳定')
      mapElement.offsetHeight // 强制重排
      await new Promise(resolve => setTimeout(resolve, 500))

      // 步骤4: 添加学生卡片和连线
      console.log('[ExportModal V2] 步骤4: 添加学生卡片和连线')
      if (studentCount > 0 && mapsConfig && currentStudents.length > 0) {
        const regions = mapsConfig?.countries?.[currentCountry]?.administrative_divisions || []
        await addStudentCardsAndLines(mapElement, currentStudents, regions, currentCountry)
        await new Promise(resolve => setTimeout(resolve, 1000)) // 等待渲染完成
        console.log('[ExportModal V2] ✅ 学生卡片和连线添加完成')
      }

      // 步骤5: 优化截图配置 - V2修复版本
      console.log('[ExportModal V2] 步骤5: 开始截图')
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
        // 关键修复：不限制窗口大小，让html2canvas自动计算
        width: undefined,
        height: undefined,
        x: 0,
        y: 0,
        // 确保HTML元素正确渲染
        ignoreElements: () => false,
        onclone: (clonedDoc) => {
          // 确保克隆的文档中卡片样式正确
          const clonedCards = clonedDoc.querySelectorAll('.student-card')
          clonedCards.forEach(card => {
            card.style.visibility = 'visible'
            card.style.display = 'block'
            card.style.position = 'absolute'
          })
        }
      }

      console.log('[ExportModal V2] html2canvas配置参数', canvasOptions)
      
      let canvas: HTMLCanvasElement
      try {
        canvas = await html2canvas(mapElement, canvasOptions)
        console.log('[ExportModal V2] 截图完成', { 
          canvasWidth: canvas.width, 
          canvasHeight: canvas.height 
        })
      } catch (canvasError) {
        console.error('[ExportModal V2] 截图失败', canvasError)
        throw canvasError
      }

      // 步骤6: 生成并下载图片
      console.log('[ExportModal V2] 步骤6: 生成并下载图片')
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
        
        console.log('[ExportModal V2] 开始下载', {
          filename: link.download,
          urlLength: url.length
        })
        
        link.click()
        URL.revokeObjectURL(url)
        
        console.log('[ExportModal V2] 下载触发完成')
      }, `image/${format}`)

      // 步骤7: 完成
      const totalTime = Date.now() - startTime
      console.log('[ExportModal V2] 导出完成', {
        totalTime,
        success: true,
        timestamp: new Date().toISOString()
      })
      
      onClose()
    } catch (error) {
      const totalTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      console.error('[ExportModal V2] 导出失败', {
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