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
  mapsConfig?: any // V24: 添加mapsConfig支持
  currentStudents?: LocalStudent[] // V24: 添加当前国家学生数据
  currentCountry?: 'china' | 'usa' // V24: 添加当前国家
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

  // V24: 添加学生卡片和连线函数
  const addStudentCardsAndLines = async (container: HTMLElement, students: LocalStudent[], regions: any[], country: 'china' | 'usa') => {
    console.log(`=== 开始处理 ${country} 地图的学生卡片和连线 ===`)
    console.log('输入参数:', { students: students.length, regions: regions.length, country })
    
    // 记录已放置的卡片位置，避免重叠
    const existingCards: Array<{ x: number; y: number; regionId: string }> = []
    
    // 按地区分组学生
    const studentsByRegion: Record<string, LocalStudent[]> = {}
    students.forEach(student => {
      if (!studentsByRegion[student.region_id]) {
        studentsByRegion[student.region_id] = []
      }
      studentsByRegion[student.region_id].push(student)
    })
    
    console.log('按地区分组的学生:', studentsByRegion)

    // 获取SVG元素
    const svgEl = container.querySelector('svg')
    if (!svgEl) {
      console.error('未找到SVG元素')
      return
    }
    
    console.log('找到SVG元素:', svgEl)
    console.log('SVG内容长度:', svgEl.innerHTML.length)

    // 获取SVG的实际显示尺寸和位置
    const svgRect = svgEl.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    console.log('SVG实际显示信息:', {
      svgRect: { width: svgRect.width, height: svgRect.height, x: svgRect.x, y: svgRect.y },
      containerRect: { width: containerRect.width, height: containerRect.height, x: containerRect.x, y: containerRect.y },
      svgViewBox: svgEl.viewBox.baseVal
    })

    // 创建连线SVG容器 - 确保在卡片下方
    const linesContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    linesContainer.setAttribute('width', '100%')
    linesContainer.setAttribute('height', '100%')
    linesContainer.style.position = 'relative'
    linesContainer.style.top = '0'
    linesContainer.style.left = '0'
    linesContainer.style.pointerEvents = 'none'
    linesContainer.style.zIndex = '3'
    linesContainer.style.background = 'transparent'
    
    // 创建卡片容器 - 修复定位问题
    const cardsContainer = document.createElement('div')
    cardsContainer.style.cssText = `
      position: relative;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 25;
      transform-origin: 0 0; /* 确保变换原点正确 */
    `
    
    // 先添加连线容器，再添加卡片容器
    container.appendChild(linesContainer)
    container.appendChild(cardsContainer)
    
    console.log(`创建了容器，连线容器: ${linesContainer}, 卡片容器: ${cardsContainer}`)
    
    // 如果没有学生数据，显示空地图但仍然有容器结构
    if (students.length === 0) {
      console.log('没有学生数据，但仍然创建了基础容器结构')
      return
    }

    console.log(`开始为 ${Object.keys(studentsByRegion).length} 个地区生成卡片和连线`)

    // 中国省份位置映射（基于SVG viewBox 1200x900）- 支持标准区域代码和简称
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
      // 省份简称（向后兼容）
      'CN-BJ': { x: 810, y: 352 }, 'CN-TJ': { x: 829, y: 366 }, 'CN-HE': { x: 774, y: 399 },
      'CN-SX': { x: 735, y: 403 }, 'CN-NM': { x: 720, y: 329 }, 'CN-LN': { x: 946, y: 305 },
      'CN-JL': { x: 983, y: 255 }, 'CN-HL': { x: 983, y: 155 }, 'CN-SH': { x: 851, y: 419 },
      'CN-JS': { x: 809, y: 439 }, 'CN-ZJ': { x: 809, y: 479 }, 'CN-AH': { x: 774, y: 439 },
      'CN-FJ': { x: 809, y: 519 }, 'CN-JX': { x: 774, y: 519 }, 'CN-SD': { x: 809, y: 379 },
      'CN-HA': { x: 739, y: 419 }, 'CN-HB': { x: 739, y: 459 }, 'CN-HN': { x: 739, y: 519 },
      'CN-GD': { x: 739, y: 579 }, 'CN-GX': { x: 669, y: 579 }, 'CN-HI': { x: 669, y: 659 },
      'CN-CQ': { x: 629, y: 479 }, 'CN-SC': { x: 589, y: 479 }, 'CN-GZ': { x: 629, y: 539 },
      'CN-YN': { x: 589, y: 539 }, 'CN-XZ': { x: 349, y: 479 }, 'CN-SHX': { x: 629, y: 419 },
      'CN-GS': { x: 589, y: 379 }, 'CN-QH': { x: 529, y: 379 }, 'CN-NX': { x: 589, y: 339 },
      'CN-XJ': { x: 349, y: 279 }
    }

    // 美国州位置映射（基于SVG viewBox 1200x800）- 支持标准州代码和简称
    const usaRegionPositions: { [key: string]: { x: number, y: number } } = {
      // 标准州代码（FIPS代码）
      'US-06': { x: 150, y: 300 }, 'US-48': { x: 350, y: 450 }, 'US-12': { x: 650, y: 500 },
      'US-36': { x: 750, y: 280 }, 'US-17': { x: 550, y: 350 }, 'US-42': { x: 700, y: 320 },
      'US-39': { x: 650, y: 350 }, 'US-13': { x: 600, y: 480 }, 'US-37': { x: 650, y: 450 },
      'US-26': { x: 600, y: 300 }, 'US-51': { x: 680, y: 380 }, 'US-53': { x: 150, y: 200 },
      'US-04': { x: 250, y: 400 }, 'US-25': { x: 750, y: 250 }, 'US-47': { x: 550, y: 450 },
      'US-18': { x: 600, y: 380 }, 'US-29': { x: 500, y: 400 }, 'US-24': { x: 700, y: 350 },
      'US-55': { x: 550, y: 300 }, 'US-08': { x: 350, y: 350 }, 'US-27': { x: 500, y: 280 },
      'US-01': { x: 550, y: 500 }, 'US-22': { x: 450, y: 500 }, 'US-21': { x: 600, y: 420 },
      'US-45': { x: 650, y: 480 }, 'US-41': { x: 150, y: 250 }, 'US-40': { x: 400, y: 450 },
      // 州简称（向后兼容）
      'US-CA': { x: 150, y: 300 }, 'US-TX': { x: 350, y: 450 }, 'US-FL': { x: 650, y: 500 },
      'US-NY': { x: 750, y: 280 }, 'US-IL': { x: 550, y: 350 }, 'US-PA': { x: 700, y: 320 },
      'US-OH': { x: 650, y: 350 }, 'US-GA': { x: 600, y: 480 }, 'US-NC': { x: 650, y: 450 },
      'US-MI': { x: 600, y: 300 }, 'US-VA': { x: 680, y: 380 }, 'US-WA': { x: 150, y: 200 },
      'US-AZ': { x: 250, y: 400 }, 'US-MA': { x: 750, y: 250 }, 'US-TN': { x: 550, y: 450 },
      'US-IN': { x: 600, y: 380 }, 'US-MO': { x: 500, y: 400 }, 'US-MD': { x: 700, y: 350 },
      'US-WI': { x: 550, y: 300 }, 'US-CO': { x: 350, y: 350 }, 'US-MN': { x: 500, y: 280 },
      'US-AL': { x: 550, y: 500 }, 'US-LA': { x: 450, y: 500 }, 'US-KY': { x: 600, y: 420 },
      'US-SC': { x: 650, y: 480 }, 'US-OR': { x: 150, y: 250 }, 'US-OK': { x: 400, y: 450 }
    }

    // 为每个有学生的地区生成卡片和连线
    Object.entries(studentsByRegion).forEach(([regionId, regionStudents]) => {
      const region = regions.find((r: any) => r.id === regionId)
      if (!region) return

      // 获取区域位置
      let regionPos
      if (country === 'china') {
        // 尝试多种ID格式
        regionPos = chinaRegionPositions[regionId] || 
                   chinaRegionPositions[`CN-${regionId}`] || 
                   chinaRegionPositions[regionId.replace('CN-', '')]
      } else {
        regionPos = usaRegionPositions[regionId] || 
                   usaRegionPositions[`US-${regionId}`] || 
                   usaRegionPositions[regionId.replace('US-', '')]
      }
      
      if (!regionPos) {
        console.warn(`未找到区域位置: ${regionId}`)
        return
      }

      // 智能计算卡片位置，避免重叠遮挡
      const cardWidth = 220 // 卡片平均宽度
      const cardHeight = 60 // 卡片平均高度
      const minDistance = 30 // 最小间距避免重叠
      
      // 尝试多个位置方向，选择最佳位置
      const positionOptions = [
        { x: regionPos.x + 80, y: regionPos.y },     // 右侧
        { x: regionPos.x - 80, y: regionPos.y },     // 左侧
        { x: regionPos.x, y: regionPos.y - 60 },     // 上方
        { x: regionPos.x, y: regionPos.y + 60 },     // 下方
        { x: regionPos.x + 60, y: regionPos.y - 30 }, // 右上
        { x: regionPos.x - 60, y: regionPos.y - 30 }, // 左上
        { x: regionPos.x + 60, y: regionPos.y + 30 }, // 右下
        { x: regionPos.x - 60, y: regionPos.y + 30 }, // 左下
      ]
      
      // 检查位置是否与已有卡片重叠
      let bestPosition = positionOptions[0]
      let minOverlap = Infinity
      
      for (const pos of positionOptions) {
        let overlap = false
        for (const existingCard of existingCards) {
          const distance = Math.sqrt(
            Math.pow(pos.x - existingCard.x, 2) + 
            Math.pow(pos.y - existingCard.y, 2)
          )
          if (distance < minDistance) {
            overlap = true
            break
          }
        }
        
        if (!overlap) {
          bestPosition = pos
          break
        }
        
        // 如果有重叠，选择重叠程度最小的位置
        let totalOverlap = 0
        for (const existingCard of existingCards) {
          const distance = Math.sqrt(
            Math.pow(pos.x - existingCard.x, 2) + 
            Math.pow(pos.y - existingCard.y, 2)
          )
          totalOverlap += Math.max(0, minDistance - distance)
        }
        
        if (totalOverlap < minOverlap) {
          minOverlap = totalOverlap
          bestPosition = pos
        }
      }
      
      const cardX = bestPosition.x
      const cardY = bestPosition.y
      
      // 记录此卡片位置供后续检查
      existingCards.push({ x: cardX, y: cardY, regionId })

      // 生成连线 - 指向卡片左上角
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', regionPos.x.toString())
      line.setAttribute('y1', regionPos.y.toString())
      line.setAttribute('x2', cardX.toString())  // 卡片左上角X坐标
      line.setAttribute('y2', cardY.toString())  // 卡片左上角Y坐标
      line.setAttribute('stroke', getRegionColor(regionId))
      line.setAttribute('stroke-width', '3')
      line.setAttribute('stroke-dasharray', '6,4')
      line.setAttribute('opacity', '0.9')
      line.setAttribute('stroke-linecap', 'round')

      const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      startCircle.setAttribute('cx', regionPos.x.toString())
      startCircle.setAttribute('cy', regionPos.y.toString())
      startCircle.setAttribute('r', '4')
      startCircle.setAttribute('fill', getRegionColor(regionId))
      startCircle.setAttribute('stroke', 'white')
      startCircle.setAttribute('stroke-width', '2')

      const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      endCircle.setAttribute('cx', cardX.toString())  // 卡片左上角X坐标
      endCircle.setAttribute('cy', cardY.toString())  // 卡片左上角Y坐标
      endCircle.setAttribute('r', '3')
      endCircle.setAttribute('fill', getRegionColor(regionId))
      endCircle.setAttribute('stroke', 'white')
      endCircle.setAttribute('stroke-width', '1.5')

      // 确保连线元素有正确的样式
      line.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
      startCircle.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
      endCircle.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'

      linesContainer.appendChild(line)
      linesContainer.appendChild(startCircle)
      linesContainer.appendChild(endCircle)

      // 生成卡片HTML - 与网页端样式保持一致
      const cardDiv = document.createElement('div')
      cardDiv.className = 'student-card' // V15: 添加样式类名
      
      // 获取区域颜色配置，模拟网页端的样式
      const regionColor = getRegionColor(regionId)
      const colorConfig = getColorConfig(regionColor)
      
      // 确保颜色是十六进制格式并添加透明度
      const baseColor = colorConfig.hex || regionColor
      const transparentColor = baseColor + 'CC' // 80%透明度
      
      cardDiv.style.cssText = `
        position: absolute;
        left: ${cardX}px;       /* 卡片左上角X坐标 */
        top: ${cardY}px;        /* 卡片左上角Y坐标 */
        background: ${transparentColor};
        border-radius: 6px;
        padding: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 1px solid ${baseColor};
        min-width: 180px;
        max-width: 260px;
        z-index: 30;
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        line-height: 1.4;
        display: block;
        visibility: visible;
        overflow: visible;
        color: white;
      `

      // 生成卡片内容 - 与网页端样式保持一致
      if (regionStudents.length >= 4) {
        // 聚合卡片 - 模拟网页端的多学生卡片样式
        cardDiv.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <div style="flex: 1; min-width: 0;">
              <p style="font-size: 12px; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; line-height: 1.3;">
                ${region.name}
              </p>
              <p style="font-size: 11px; color: rgba(255,255,255,0.9); margin: 0; line-height: 1.3;">
                ${regionStudents.length} 位同学
              </p>
            </div>
          </div>
        `
      } else {
        // 单个学生卡片 - 模拟网页端的单学生卡片样式
        const studentCards = regionStudents.map(student => `
          <div style="padding: 6px 0; text-align: left;">
            <p style="font-size: 11px; font-weight: 600; color: white; margin: 0 0 2px 0; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${student.name} | ${student.city}
            </p>
          </div>
        `).join('')
        
        cardDiv.innerHTML = `
          <div style="display: flex; align-items: center; gap: 4px;">
            <div style="flex: 1; min-width: 0;">
              <p style="font-size: 11px; font-weight: 600; color: white; margin: 0 0 4px 0; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${region.name}
              </p>
              ${studentCards}
            </div>
          </div>
        `
      }

      // 添加到容器
      cardsContainer.appendChild(cardDiv)
    })
  }

  const handleExport = async () => {
    console.log('[ExportModal] 开始导出过程', {
      mapElementId,
      studentCount,
      regionCount,
      format,
      timestamp: new Date().toISOString()
    })
    
    setLoading(true)
    const startTime = Date.now()
    
    try {
      // 步骤1: 查找纯净的地图SVG容器
      console.log('[ExportModal] 步骤1: 查找地图SVG容器')
      
      // 优先查找InteractiveMap中的SVG容器
      const interactiveMap = document.querySelector('[data-map-container]') as HTMLElement
      let mapElement: HTMLElement | null = null
      
      if (interactiveMap) {
        const svgContainer = interactiveMap.querySelector('[data-export="true"]') as HTMLElement
        if (svgContainer) {
          mapElement = svgContainer
          console.log('[ExportModal] 找到InteractiveMap中的SVG容器')
        } else {
          // 如果没找到带data-export的元素，使用InteractiveMap的根容器
          mapElement = interactiveMap
          console.log('[ExportModal] 使用InteractiveMap根容器')
        }
      }
      
      // 如果没找到InteractiveMap，尝试查找原有的map-container
      if (!mapElement) {
        console.log('[ExportModal] 尝试使用原有的map-container')
        mapElement = document.getElementById(mapElementId)
      }
      
      if (!mapElement) {
        const error = new Error(`地图SVG容器未找到，请刷新页面后重试`)
        console.error('[ExportModal] 地图SVG容器查找失败', error)
        alert(`地图SVG容器未找到，请刷新页面后重试`)
        return
      }
      
      console.log('[ExportModal] 地图元素找到', {
        elementId: mapElement.id,
        offsetWidth: mapElement.offsetWidth,
        offsetHeight: mapElement.offsetHeight,
        clientWidth: mapElement.clientWidth,
        clientHeight: mapElement.clientHeight
      })

      // 步骤2: 验证html2canvas库
      console.log('[ExportModal] 步骤2: 验证html2canvas库')
      if (!html2canvas || typeof html2canvas !== 'function') {
        throw new Error('html2canvas库未正确加载或导入')
      }
      console.log('[ExportModal] html2canvas库验证通过')

      // 步骤3: 等待DOM稳定
      console.log('[ExportModal] 步骤3: 等待DOM稳定')
      mapElement.offsetHeight // 强制重排
      await new Promise(resolve => setTimeout(resolve, 200))
      console.log('[ExportModal] DOM稳定等待完成')

      // V25: 调试版本 - 添加详细日志
      console.log('[ExportModal] 步骤3.5: 添加学生卡片和连线')
      console.log('[ExportModal] 调试信息:', {
        studentCount,
        mapsConfigExists: !!mapsConfig,
        currentStudentsLength: currentStudents.length,
        currentCountry,
        mapsConfigKeys: mapsConfig ? Object.keys(mapsConfig) : 'null',
        currentStudentsSample: currentStudents.slice(0, 2) // 显示前2个学生
      })
      
      if (studentCount > 0 && mapsConfig && currentStudents.length > 0) {
        console.log('[ExportModal] ✅ 条件满足，开始添加卡片和连线')
        
        const regions = mapsConfig?.countries?.[currentCountry]?.administrative_divisions || []
        
        console.log(`[ExportModal] ${currentCountry}地图regions数据:`, regions.length, '个区域')
        console.log('[ExportModal] 学生数据:', currentStudents.length, '位')
        console.log('[ExportModal] 学生详情:', currentStudents.map(s => ({ name: s.name, country: s.country, region_id: s.region_id })))
        
        // 添加卡片和连线
        await addStudentCardsAndLines(mapElement, currentStudents, regions, currentCountry)
        await new Promise(resolve => setTimeout(resolve, 1000)) // 等待渲染完成
        console.log('[ExportModal] ✅ 学生卡片和连线添加完成')
      } else {
        console.log('[ExportModal] ❌ 条件不满足，跳过卡片和连线添加')
        console.log('[ExportModal] 详细条件检查:', {
          'studentCount > 0': studentCount > 0,
          'mapsConfig存在': !!mapsConfig,
          'currentStudents.length > 0': currentStudents.length > 0
        })
      }
      
      // 步骤4: 优化截图配置，确保HTML元素正确渲染
      console.log('[ExportModal] 步骤4: 开始截图')
      const canvasOptions = {
        backgroundColor: '#ffffff',
        scale: 1, // 保持1:1比例
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: true, // 关键修复：启用foreignObject渲染以正确显示HTML卡片
        imageTimeout: 15000,
        removeContainer: false, // 保持容器结构
        scrollX: 0,
        scrollY: 0,
        windowWidth: mapElement.offsetWidth,
        windowHeight: mapElement.offsetHeight,
        // 添加更多配置确保HTML元素正确渲染
        ignoreElements: () => false, // 不忽略任何元素
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
      
      console.log('[ExportModal] html2canvas配置参数', canvasOptions)
      console.log('[ExportModal] 开始调用html2canvas...')
      
      let canvas: HTMLCanvasElement
      try {
        canvas = await html2canvas(mapElement, canvasOptions)
        console.log('[ExportModal] 截图完成', { 
          canvasWidth: canvas.width, 
          canvasHeight: canvas.height,
          dataUrlLength: canvas.toDataURL().length 
        })
      } catch (canvasError) {
        console.error('[ExportModal] 截图失败 - 详细错误信息', {
          error: canvasError instanceof Error ? canvasError.message : canvasError,
          stack: canvasError instanceof Error ? canvasError.stack : undefined,
          errorType: typeof canvasError,
          errorConstructor: canvasError?.constructor?.name,
          canvasOptions,
          mapElement: {
            id: mapElement.id,
            offsetWidth: mapElement.offsetWidth,
            offsetHeight: mapElement.offsetHeight,
            clientWidth: mapElement.clientWidth,
            clientHeight: mapElement.clientHeight,
            scrollWidth: mapElement.scrollWidth,
            scrollHeight: mapElement.scrollHeight,
            getBoundingClientRect: mapElement.getBoundingClientRect()
          },
          timestamp: new Date().toISOString()
        })
        throw canvasError
      }

      // 步骤7: 直接使用原始Canvas，避免尺寸变化
      console.log('[ExportModal] 步骤7: 直接使用原始Canvas')
      const finalCanvas = canvas // 直接使用原始canvas，不做额外处理
      
      console.log('[ExportModal] Canvas尺寸信息', {
        canvasWidth: finalCanvas.width,
        canvasHeight: finalCanvas.height
      })

      // 步骤8: 导出图片
      console.log('[ExportModal] 步骤8: 导出图片', { format })
      const exportStartTime = Date.now()
      
      await new Promise((resolve, reject) => {
        finalCanvas.toBlob((blob) => {
          if (!blob) {
            const error = new Error('Canvas导出Blob失败')
            console.error('[ExportModal] Canvas导出失败', error)
            reject(error)
            return
          }
          
          console.log('[ExportModal] Blob创建成功', {
            blobSize: blob.size,
            blobType: blob.type,
            exportTime: Date.now() - exportStartTime
          })
          
          try {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            const timestamp = new Date().toISOString().split('T')[0]
            const countryName = currentCountry === 'china' ? '中国' : '美国'
            link.download = `${countryName}地图-${timestamp}.${format}`
            
            console.log('[ExportModal] 开始下载', {
              filename: link.download,
              urlLength: url.length
            })
            
            link.click()
            URL.revokeObjectURL(url)
            
            console.log('[ExportModal] 下载触发完成')
            resolve(true)
          } catch (downloadError) {
            console.error('[ExportModal] 下载过程失败', downloadError)
            reject(downloadError)
          }
        }, `image/${format}`)
      })

      // 步骤9: 完成
      const totalTime = Date.now() - startTime
      console.log('[ExportModal] 导出完成', {
        totalTime,
        success: true,
        timestamp: new Date().toISOString()
      })
      
      onClose()
    } catch (error) {
      const totalTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      const errorStack = error instanceof Error ? error.stack : undefined
      
      console.error('[ExportModal] 导出失败 - 详细错误信息', {
        error: errorMessage,
        stack: errorStack,
        mapElementId,
        studentCount,
        regionCount,
        format,
        totalTime,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenSize: `${screen.width}x${screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`
      })
      
      // 提供更详细的错误提示
      let userMessage = '导出失败，请重试'
      
      if (errorMessage.includes('地图元素未找到')) {
        userMessage = '地图元素未找到，请刷新页面后重试'
      } else if (errorMessage.includes('dom-to-image')) {
        userMessage = '图像处理库加载失败，请检查网络连接后重试'
      } else if (errorMessage.includes('Canvas')) {
        userMessage = 'Canvas处理失败，请尝试使用其他浏览器'
      } else if (errorMessage.includes('内存') || errorMessage.includes('memory')) {
        userMessage = '内存不足，请关闭其他标签页后重试'
      }
      
      alert(userMessage)
    } finally {
      setLoading(false)
      console.log('[ExportModal] 导出状态重置完成')
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
              <li>统计数据和品牌元素</li>
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
