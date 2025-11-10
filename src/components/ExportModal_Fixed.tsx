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

export default function ExportModalFixed({
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

  // 简化的学生卡片和连线添加函数
  const addStudentCardsAndLines = async (container: HTMLElement, students: LocalStudent[], regions: any[], country: 'china' | 'usa') => {
    console.log(`=== 开始处理 ${country} 地图的学生卡片和连线 ===`)
    
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

    // 创建连线SVG容器
    const linesContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    linesContainer.setAttribute('width', '100%')
    linesContainer.setAttribute('height', '100%')
    linesContainer.style.position = 'absolute'
    linesContainer.style.top = '0'
    linesContainer.style.left = '0'
    linesContainer.style.pointerEvents = 'none'
    linesContainer.style.zIndex = '3'
    
    // 创建卡片容器
    const cardsContainer = document.createElement('div')
    cardsContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 25;
    `
    
    container.appendChild(linesContainer)
    container.appendChild(cardsContainer)

    // 中国省份位置映射（简化版）
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
    }

    // 美国州位置映射（简化版）
    const usaRegionPositions: { [key: string]: { x: number, y: number } } = {
      'US-06': { x: 150, y: 300 }, 'US-48': { x: 350, y: 450 }, 'US-12': { x: 650, y: 500 },
      'US-36': { x: 750, y: 280 }, 'US-17': { x: 550, y: 350 }, 'US-42': { x: 700, y: 320 },
      'US-39': { x: 650, y: 350 }, 'US-13': { x: 600, y: 480 }, 'US-37': { x: 650, y: 450 },
      'US-26': { x: 600, y: 300 }, 'US-51': { x: 680, y: 380 }, 'US-53': { x: 150, y: 200 },
    }

    // 为每个有学生的地区生成卡片和连线
    Object.entries(studentsByRegion).forEach(([regionId, regionStudents]) => {
      const region = regions.find((r: any) => r.id === regionId)
      if (!region) return

      // 获取区域位置
      let regionPos
      if (country === 'china') {
        regionPos = chinaRegionPositions[regionId] || chinaRegionPositions[`CN-${regionId}`] || chinaRegionPositions[regionId.replace('CN-', '')]
      } else {
        regionPos = usaRegionPositions[regionId] || usaRegionPositions[`US-${regionId}`] || usaRegionPositions[regionId.replace('US-', '')]
      }
      
      if (!regionPos) {
        console.warn(`未找到区域位置: ${regionId}`)
        return
      }

      // 固定卡片位置（避免重叠）
      const cardX = regionPos.x + 100
      const cardY = regionPos.y

      // 生成连线
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', regionPos.x.toString())
      line.setAttribute('y1', regionPos.y.toString())
      line.setAttribute('x2', cardX.toString())
      line.setAttribute('y2', cardY.toString())
      line.setAttribute('stroke', getRegionColor(regionId))
      line.setAttribute('stroke-width', '2')
      line.setAttribute('stroke-dasharray', '4,3')
      line.setAttribute('opacity', '0.8')

      const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      startCircle.setAttribute('cx', regionPos.x.toString())
      startCircle.setAttribute('cy', regionPos.y.toString())
      startCircle.setAttribute('r', '3')
      startCircle.setAttribute('fill', getRegionColor(regionId))

      const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      endCircle.setAttribute('cx', cardX.toString())
      endCircle.setAttribute('cy', cardY.toString())
      endCircle.setAttribute('r', '2')
      endCircle.setAttribute('fill', getRegionColor(regionId))

      linesContainer.appendChild(line)
      linesContainer.appendChild(startCircle)
      linesContainer.appendChild(endCircle)

      // 生成卡片HTML
      const cardDiv = document.createElement('div')
      cardDiv.className = 'student-card'
      
      const regionColor = getRegionColor(regionId)
      const colorConfig = getColorConfig(regionColor)
      const baseColor = colorConfig.hex || regionColor
      const transparentColor = baseColor + 'E6' // 90%透明度
      
      cardDiv.style.cssText = `
        position: absolute;
        left: ${cardX}px;
        top: ${cardY}px;
        background: ${transparentColor};
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 2px solid ${baseColor};
        min-width: 200px;
        max-width: 280px;
        z-index: 30;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        line-height: 1.4;
      `

      // 生成卡片内容
      if (regionStudents.length >= 4) {
        cardDiv.innerHTML = `
          <div style="text-align: center;">
            <p style="font-size: 14px; font-weight: 600; color: white; margin: 0 0 4px 0;">
              ${region.name}
            </p>
            <p style="font-size: 12px; color: rgba(255,255,255,0.9); margin: 0;">
              ${regionStudents.length} 位同学
            </p>
          </div>
        `
      } else {
        const studentCards = regionStudents.map(student => `
          <div style="padding: 4px 0; text-align: left;">
            <p style="font-size: 12px; font-weight: 600; color: white; margin: 0;">
              ${student.name} | ${student.city}
            </p>
          </div>
        `).join('')
        
        cardDiv.innerHTML = `
          <div>
            <p style="font-size: 12px; font-weight: 600; color: white; margin: 0 0 8px 0;">
              ${region.name}
            </p>
            ${studentCards}
          </div>
        `
      }

      cardsContainer.appendChild(cardDiv)
    })
  }

  const handleExport = async () => {
    console.log('[ExportModal] 开始导出过程')
    
    setLoading(true)
    const startTime = Date.now()
    
    try {
      // 查找地图SVG容器
      const mapElement = document.getElementById(mapElementId)
      if (!mapElement) {
        throw new Error('地图SVG容器未找到，请刷新页面后重试')
      }

      console.log('[ExportModal] 地图元素找到')

      // 等待DOM稳定
      await new Promise(resolve => setTimeout(resolve, 500))

      // 添加学生卡片和连线
      if (studentCount > 0 && mapsConfig && currentStudents.length > 0) {
        console.log('[ExportModal] 开始添加卡片和连线')
        
        const regions = mapsConfig?.countries?.[currentCountry]?.administrative_divisions || []
        await addStudentCardsAndLines(mapElement, currentStudents, regions, currentCountry)
        
        // 等待渲染完成
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('[ExportModal] 学生卡片和连线添加完成')
      }

      // 优化的html2canvas配置
      const canvasOptions = {
        backgroundColor: '#ffffff',
        scale: 1,
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: true,
        imageTimeout: 15000,
        removeContainer: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: mapElement.offsetWidth,
        windowHeight: mapElement.offsetHeight,
        ignoreElements: () => false,
      }
      
      console.log('[ExportModal] 开始截图...')
      const canvas = await html2canvas(mapElement, canvasOptions)
      console.log('[ExportModal] 截图完成')

      // 生成文件名（修复硬编码问题）
      const countryName = currentCountry === 'china' ? '中国' : '美国'
      const date = new Date().toISOString().split('T')[0]
      const filename = `${countryName}地图-${date}.${format}`

      // 导出图片
      await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas导出Blob失败'))
            return
          }
          
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          
          console.log('[ExportModal] 开始下载:', filename)
          link.click()
          URL.revokeObjectURL(url)
          
          resolve(true)
        }, `image/${format}`)
      })

      const totalTime = Date.now() - startTime
      console.log('[ExportModal] 导出完成，耗时:', totalTime / 1000, '秒')
      
      onClose()
    } catch (error) {
      const totalTime = Date.now() - startTime
      console.error('[ExportModal] 导出失败:', error)
      
      let userMessage = '导出失败，请重试'
      if (error instanceof Error) {
        if (error.message.includes('地图元素未找到')) {
          userMessage = '地图元素未找到，请刷新页面后重试'
        } else if (error.message.includes('Canvas')) {
          userMessage = 'Canvas处理失败，请尝试使用其他浏览器'
        }
      }
      
      alert(userMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
          <h2 className="text-h2 font-semibold text-neutral-900">导出地图</h2>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="mt-6 space-y-6">
          {/* 格式选择 */}
          <div>
            <label className="block text-small font-medium text-neutral-700 mb-3">
              图片格式
            </label>
            <div className="flex gap-4">
              <label className="flex-1">
                <input
                  type="radio"
                  name="format"
                  value="png"
                  checked={format === 'png'}
                  onChange={(e) => setFormat(e.target.value as 'png')}
                  className="sr-only peer"
                />
                <div className="peer-checked:bg-primary-500 peer-checked:text-white peer-checked:border-primary-500 bg-neutral-100 text-neutral-700 border-2 border-neutral-200 rounded-lg p-4 text-center cursor-pointer transition-all">
                  <div className="font-semibold">PNG</div>
                  <div className="text-caption mt-1">无损质量</div>
                </div>
              </label>
              <label className="flex-1">
                <input
                  type="radio"
                  name="format"
                  value="jpeg"
                  checked={format === 'jpeg'}
                  onChange={(e) => setFormat(e.target.value as 'jpeg')}
                  className="sr-only peer"
                />
                <div className="peer-checked:bg-primary-500 peer-checked:text-white peer-checked:border-primary-500 bg-neutral-100 text-neutral-700 border-2 border-neutral-200 rounded-lg p-4 text-center cursor-pointer transition-all">
                  <div className="font-semibold">JPEG</div>
                  <div className="text-caption mt-1">文件更小</div>
                </div>
              </label>
            </div>
          </div>

          {/* 导出说明 */}
          <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
            <h4 className="font-medium text-neutral-900 mb-2">导出内容包含：</h4>
            <ul className="text-small text-neutral-700 space-y-1">
              <li>当前地图完整内容</li>
              <li>所有已添加的同学信息</li>
              <li>省份颜色填充和连接线</li>
              <li>适合社交媒体分享</li>
            </ul>
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex gap-4 pt-6 border-t border-neutral-200 mt-6">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
            disabled={loading}
          >
            取消
          </button>
          <button
            onClick={handleExport}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
            disabled={loading}
          >
            <Download className="w-5 h-5" />
            <span>{loading ? '导出中...' : '下载图片'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}