import { useState } from 'react'
import { X, Download, Globe } from 'lucide-react'
import html2canvas from 'html2canvas'
import { LocalStudent, getRegionColor, getColorConfig } from '@/lib/storage'

interface GlobalExportModalProps {
  isOpen: boolean
  onClose: () => void
  allStudents: LocalStudent[]
  mapsConfig?: any
}

export default function GlobalExportModalFixed({ isOpen, onClose, allStudents, mapsConfig }: GlobalExportModalProps) {
  const [loading, setLoading] = useState(false)
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')

  // 等待DOM稳定的简化函数
  const waitForDOMStable = async (container: HTMLElement, maxWaitTime = 5000) => {
    console.log('开始DOM稳定性检查')
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitTime) {
      container.offsetHeight
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    console.log('DOM稳定性检查完成')
  }

  // 简化的区域颜色填充函数
  const addRegionFillColors = (svgText: string, studentsByRegion: Record<string, LocalStudent[]>, country: 'china' | 'usa'): string => {
    let modifiedSvg = svgText
    
    console.log(`=== 开始处理 ${country} 地图颜色填充 ===`)
    
    try {
      // 设置默认颜色
      const defaultFill = country === 'china' ? '#fef3e2' : '#e8f4fd'
      modifiedSvg = modifiedSvg.replace(/<path([^>]*)>/gi, (match, attrs) => {
        return `<path${attrs} fill="${defaultFill}" stroke="#333" stroke-width="1">`
      })
      
      // 为有学生的区域设置特殊颜色
      Object.entries(studentsByRegion).forEach(([regionId, regionStudents]) => {
        const color = getRegionColor(regionId)
        
        // 简化ID处理
        let svgId = regionId
        if (country === 'china' && regionId.startsWith('CN-')) {
          svgId = regionId.replace('CN-', '')
        } else if (country === 'usa' && regionId.startsWith('US-')) {
          svgId = regionId
        }
        
        const escapedSvgId = svgId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        
        // 尝试匹配
        const dataRegionRegex = new RegExp(`<path[^>]*data-region-id=["']${escapedSvgId}["'][^>]*>`, 'gi')
        if (dataRegionRegex.test(modifiedSvg)) {
          modifiedSvg = modifiedSvg.replace(dataRegionRegex, (match) => {
            return match.replace(/fill=["'][^"']*["']/gi, `fill="${color}"`)
          })
        } else {
          // 模糊匹配
          const fuzzyRegex = new RegExp(`<path[^>]*>`, 'gi')
          modifiedSvg = modifiedSvg.replace(fuzzyRegex, (match) => {
            if (match.includes(svgId)) {
              return match.replace(/fill=["'][^"']*["']/gi, `fill="${color}"`)
            }
            return match
          })
        }
      })
      
      return modifiedSvg
    } catch (error) {
      console.error('颜色填充处理错误:', error)
      return svgText
    }
  }

  // 计算地区中心位置的函数（与InteractiveMap.tsx保持一致）
  const calculateRegionPosition = (lat: number, lng: number, country: 'china' | 'usa') => {
    if (country === 'china') {
      // 中国地图：经度范围73-135，纬度范围18-54
      const posX = ((lng - 73) / (135 - 73)) * 100
      const posY = ((54 - lat) / (54 - 18)) * 100
      return {
        x: Math.max(0, Math.min(100, posX)),
        y: Math.max(0, Math.min(100, posY))
      }
    } else {
      // 美国地图：经度范围-125到-66，纬度范围24-50
      const posX = ((lng + 125) / (125 - 66)) * 100
      const posY = ((50 - lat) / (50 - 24)) * 100
      return {
        x: Math.max(0, Math.min(100, posX)),
        y: Math.max(0, Math.min(100, posY))
      }
    }
  }

  // 简化的学生卡片和连线添加函数
  const addStudentCardsAndLines = async (container: HTMLElement, students: LocalStudent[], country: 'china' | 'usa') => {
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

    // 获取SVG的viewBox信息
    const viewBox = svgEl.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 100, 100]
    const svgViewBox = { width: viewBox[2], height: viewBox[3] }

    // 首先添加省份颜色填充
    const svgText = svgEl.outerHTML
    const modifiedSvgText = addRegionFillColors(svgText, studentsByRegion, country)
    svgEl.outerHTML = modifiedSvgText

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

    // 地区坐标数据（与网页端相同的结构）
    const regionCoordinates: { [key: string]: { lat: number, lng: number } } = {
      // 中国省份坐标
      'CN-110000': { lat: 39.9042, lng: 116.4074 }, // 北京
      'CN-120000': { lat: 39.0851, lng: 117.1992 }, // 天津
      'CN-130000': { lat: 38.0428, lng: 114.5149 }, // 河北
      'CN-140000': { lat: 37.5777, lng: 112.2922 }, // 山西
      'CN-150000': { lat: 40.8414, lng: 111.7519 }, // 内蒙古
      'CN-210000': { lat: 41.2956, lng: 122.6085 }, // 辽宁
      'CN-220000': { lat: 43.8160, lng: 125.3245 }, // 吉林
      'CN-230000': { lat: 45.7732, lng: 126.6573 }, // 黑龙江
      'CN-310000': { lat: 31.2304, lng: 121.4737 }, // 上海
      'CN-320000': { lat: 32.0603, lng: 118.7969 }, // 江苏
      'CN-330000': { lat: 30.2741, lng: 120.1551 }, // 浙江
      'CN-340000': { lat: 31.8612, lng: 117.2272 }, // 安徽
      'CN-350000': { lat: 26.0745, lng: 119.2965 }, // 福建
      'CN-360000': { lat: 28.6765, lng: 115.9092 }, // 江西
      'CN-370000': { lat: 36.6512, lng: 117.1201 }, // 山东
      'CN-410000': { lat: 34.7579, lng: 113.6654 }, // 河南
      'CN-420000': { lat: 30.5844, lng: 114.3000 }, // 湖北
      'CN-430000': { lat: 28.2282, lng: 112.9388 }, // 湖南
      'CN-440000': { lat: 23.3417, lng: 113.4244 }, // 广东
      'CN-450000': { lat: 22.8151, lng: 108.3669 }, // 广西
      'CN-460000': { lat: 20.0174, lng: 110.3492 }, // 海南
      'CN-500000': { lat: 29.5647, lng: 106.5507 }, // 重庆
      'CN-510000': { lat: 30.5728, lng: 104.0668 }, // 四川
      'CN-520000': { lat: 26.6470, lng: 106.6302 }, // 贵州
      'CN-530000': { lat: 25.0389, lng: 102.7183 }, // 云南
      'CN-540000': { lat: 29.6520, lng: 91.1721 }, // 西藏
      'CN-610000': { lat: 34.3416, lng: 108.9398 }, // 陕西
      'CN-620000': { lat: 36.0611, lng: 103.8343 }, // 甘肃
      'CN-630000': { lat: 36.6171, lng: 101.7782 }, // 青海
      'CN-640000': { lat: 38.4681, lng: 106.2586 }, // 宁夏
      'CN-650000': { lat: 43.8256, lng: 87.6168 }, // 新疆
    }

    // 为每个有学生的地区生成卡片和连线
    Object.entries(studentsByRegion).forEach(([regionId, regionStudents]) => {
      // 获取地区坐标并计算位置
      const regionCoord = regionCoordinates[regionId]
      if (!regionCoord) {
        console.warn(`未找到地区坐标: ${regionId}`)
        return
      }

      // 使用与网页端相同的坐标计算
      const position = calculateRegionPosition(regionCoord.lat, regionCoord.lng, country)
      
      // 计算最终位置（与网页端相同的逻辑）
      const finalX = position.x + Math.min(5, 0) // 默认偏移为0
      const finalY = position.y + Math.min(5, 0) // 默认偏移为0

      // 转换为SVG坐标
      const regionX = (position.x / 100) * svgViewBox.width
      const regionY = (position.y / 100) * svgViewBox.height
      const finalXpx = (finalX / 100) * svgViewBox.width
      const finalYpx = (finalY / 100) * svgViewBox.height

      const regionColor = getRegionColor(regionId)

      // 生成连线
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', regionX.toFixed(2))
      line.setAttribute('y1', regionY.toFixed(2))
      line.setAttribute('x2', finalXpx.toFixed(2))
      line.setAttribute('y2', finalYpx.toFixed(2))
      line.setAttribute('stroke', regionColor)
      line.setAttribute('stroke-width', '2')
      line.setAttribute('stroke-dasharray', '4,4')
      line.setAttribute('opacity', '0.8')

      const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      startCircle.setAttribute('cx', regionX.toFixed(2))
      startCircle.setAttribute('cy', regionY.toFixed(2))
      startCircle.setAttribute('r', '3')
      startCircle.setAttribute('fill', regionColor)
      startCircle.setAttribute('opacity', '1')

      const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      endCircle.setAttribute('cx', finalXpx.toFixed(2))
      endCircle.setAttribute('cy', finalYpx.toFixed(2))
      endCircle.setAttribute('r', '2')
      endCircle.setAttribute('fill', regionColor)
      endCircle.setAttribute('opacity', '0.9')

      linesContainer.appendChild(line)
      linesContainer.appendChild(startCircle)
      linesContainer.appendChild(endCircle)

      // 生成卡片HTML（使用与网页端相同的样式）
      const cardDiv = document.createElement('div')
      cardDiv.className = 'student-card'
      
      const colorConfig = getColorConfig(regionColor)
      const baseColor = colorConfig.hex || regionColor
      const transparentColor = baseColor + 'E6'
      
      cardDiv.style.cssText = `
        position: absolute;
        left: ${finalX}%;
        top: ${finalY}%;
        transform: translate(-50%, -50%);
        background: ${transparentColor};
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 2px solid ${baseColor};
        min-width: 180px;
        max-width: 250px;
        z-index: 30;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        line-height: 1.4;
      `

      // 生成卡片内容
      const regionName = regionId.includes('CN-') ? regionId.replace('CN-', '') + '省' : regionId.replace('US-', '') + '州'
      
      if (regionStudents.length >= 4) {
        cardDiv.innerHTML = `
          <div style="text-align: center;">
            <p style="font-size: 13px; font-weight: 600; color: white; margin: 0 0 4px 0;">
              ${regionName}
            </p>
            <p style="font-size: 11px; color: rgba(255,255,255,0.9); margin: 0;">
              ${regionStudents.length} 位同学
            </p>
          </div>
        `
      } else {
        const studentCards = regionStudents.map(student => `
          <div style="padding: 3px 0; text-align: left;">
            <p style="font-size: 11px; font-weight: 600; color: white; margin: 0;">
              ${student.name} | ${student.city}
            </p>
          </div>
        `).join('')
        
        cardDiv.innerHTML = `
          <div>
            <p style="font-size: 11px; font-weight: 600; color: white; margin: 0 0 6px 0;">
              ${regionName}
            </p>
            ${studentCards}
          </div>
        `
      }

      cardsContainer.appendChild(cardDiv)
    })
  }

  // 创建单个地图的简化版
  const createMapDiv = async (country: 'china' | 'usa', students: LocalStudent[]) => {
    const mapDiv = document.createElement('div')
    mapDiv.style.cssText = 'width: 100%; max-width: 700px; display: flex; flex-direction: column; align-items: center;'

    // 地图标题
    const titleDiv = document.createElement('div')
    titleDiv.style.cssText = 'text-align: center; margin-bottom: 30px;'
    const flagEmoji = country === 'china' ? '🇨🇳' : '🇺🇸'
    const countryColor = country === 'china' ? '#dc2626' : '#2563eb'
    titleDiv.innerHTML = `
      <h2 style="font-size: 36px; font-weight: 700; color: ${countryColor}; margin-bottom: 12px;">
        ${flagEmoji} ${country === 'china' ? '中国' : '美国'}
      </h2>
      <div style="display: inline-block; background: ${countryColor}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 16px; font-weight: 600;">
        ${students.length} 位同学
      </div>
    `
    mapDiv.appendChild(titleDiv)

    try {
      // 加载SVG文件
      const fileName = country === 'china' ? 'china-combined.svg' : 'usa-combined.svg'
      const response = await fetch(`/maps/${fileName}`)
      
      if (!response.ok) {
        throw new Error(`无法加载地图文件: ${fileName}`)
      }
      
      const svgText = await response.text()
      
      // 创建SVG容器
      const newSvgContainer = document.createElement('div')
      newSvgContainer.style.cssText = 'position: relative; width: 100%; height: 600px; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);'
      
      newSvgContainer.innerHTML = svgText
      
      // 设置SVG样式
      const svgEl = newSvgContainer.querySelector('svg')
      if (svgEl) {
        svgEl.style.cssText = 'width: 100%; height: 100%; display: block;'
        
        // 设置所有路径的默认样式
        const paths = svgEl.querySelectorAll('path')
        paths.forEach(path => {
          const pathEl = path as SVGPathElement
          const defaultFill = country === 'china' ? '#fef3e2' : '#e8f4fd'
          pathEl.setAttribute('fill', defaultFill)
          pathEl.setAttribute('stroke', '#333')
          pathEl.setAttribute('stroke-width', '1')
          pathEl.style.display = 'block'
          pathEl.style.visibility = 'visible'
        })
      }
      
      // 添加学生卡片和连线
      if (students.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await addStudentCardsAndLines(newSvgContainer, students, country)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      mapDiv.appendChild(newSvgContainer)
      return mapDiv
    } catch (error) {
      console.error(`Failed to create ${country} map:`, error)
      
      // 创建错误提示
      const errorDiv = document.createElement('div')
      errorDiv.style.cssText = 'width: 100%; height: 400px; background: #f5f5f5; border-radius: 12px; display: flex; align-items: center; justify-content: center;'
      errorDiv.innerHTML = `
        <div style="text-align: center; color: #666;">
          <div style="font-size: 24px; margin-bottom: 12px;">⚠️</div>
          <div>${country === 'china' ? '中国' : '美国'}地图加载失败</div>
        </div>
      `
      mapDiv.appendChild(errorDiv)
      return mapDiv
    }
  }

  const handleExport = async () => {
    if (loading) return
    
    console.log('=== 开始全球地图导出流程 ===')
    setLoading(true)
    const startTime = Date.now()
    
    try {
      // 创建导出容器
      const container = document.createElement('div')
      container.style.cssText = 'position: fixed; top: -5000px; left: -5000px; width: 2000px; background: white; padding: 80px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;'
      container.id = 'export-container-' + Date.now()
      
      // 标题
      const titleDiv = document.createElement('div')
      titleDiv.style.cssText = 'text-align: center; margin-bottom: 60px;'
      const countryCount = Array.from(new Set(allStudents.map(s => s.country))).length
      titleDiv.innerHTML = `
        <h1 style="font-size: 48px; font-weight: 700; color: #1f2937; margin-bottom: 16px;">全球蹭饭地图</h1>
        <div style="font-size: 24px; color: #6b7280;">已标记 ${allStudents.length} 位同学, 覆盖 ${countryCount} 个国家</div>
      `
      container.appendChild(titleDiv)
      
      // 创建地图容器
      const mapsContainer = document.createElement('div')
      mapsContainer.style.cssText = 'display: flex; gap: 100px; justify-content: center; align-items: flex-start;'
      container.appendChild(mapsContainer)
      
      // 添加到DOM
      document.body.appendChild(container)
      
      // 处理中国地图
      const chinaStudents = allStudents.filter(s => s.country === 'china')
      if (chinaStudents.length > 0) {
        const chinaMap = await createMapDiv('china', chinaStudents)
        mapsContainer.appendChild(chinaMap)
      }
      
      // 处理美国地图
      const usaStudents = allStudents.filter(s => s.country === 'usa')
      if (usaStudents.length > 0) {
        const usaMap = await createMapDiv('usa', usaStudents)
        mapsContainer.appendChild(usaMap)
      }
      
      // 等待DOM稳定
      await waitForDOMStable(container)
      
      // 导出图片
      const exportOptions = {
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
      }
      
      console.log('开始截图...')
      const canvas = await html2canvas(container, exportOptions)
      console.log('截图完成')
      
      // 下载图片
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `全球蹭饭地图-${timestamp}.${format}`
      
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
          
          console.log('开始下载:', filename)
          link.click()
          URL.revokeObjectURL(url)
          
          resolve(true)
        }, `image/${format}`)
      })
      
      const endTime = Date.now()
      console.log('=== 导出流程完成 ===')
      console.log('总耗时:', (endTime - startTime) / 1000, '秒')
      
      // 清理
      if (container.parentNode) {
        document.body.removeChild(container)
      }
      
    } catch (error) {
      console.error('=== 导出流程失败 ===', error)
      
      let errorMessage = '导出失败'
      if (error instanceof Error) {
        if (error.message.includes('地图文件')) {
          errorMessage = '地图数据加载失败，请检查网络连接'
        } else if (error.message.includes('Canvas')) {
          errorMessage = 'Canvas处理失败，请尝试使用其他浏览器'
        } else {
          errorMessage = `导出失败: ${error.message}`
        }
      }
      
      alert(errorMessage)
      
      // 清理残留容器
      const exportContainer = document.querySelector('[id^="export-container-"]')
      if (exportContainer && exportContainer.parentNode) {
        document.body.removeChild(exportContainer)
      }
      
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const chinaCount = allStudents.filter(s => s.country === 'china').length
  const usaCount = allStudents.filter(s => s.country === 'usa').length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-primary-500" />
            <h2 className="text-h2 font-semibold text-neutral-900">全球导出</h2>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="mt-6 space-y-6">
          {/* 统计信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="text-caption text-blue-700 mb-1">中国</div>
              <div className="text-h2 font-bold text-blue-900">{chinaCount}</div>
              <div className="text-caption text-blue-600">位同学</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <div className="text-caption text-red-700 mb-1">美国</div>
              <div className="text-h2 font-bold text-red-900">{usaCount}</div>
              <div className="text-caption text-red-600">位同学</div>
            </div>
          </div>

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

          {/* 导出按钮 */}
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full btn-primary"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                导出中...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                导出全球地图
              </div>
            )}
          </button>

          {/* 说明 */}
          <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
            <div className="text-caption text-neutral-600">
              <div className="font-medium mb-1">导出说明：</div>
              <ul className="space-y-1 text-neutral-500">
                <li>• 将生成包含中国和美国地图的完整图片</li>
                <li>• 显示所有已标记的同学位置和信息</li>
                <li>• 包含省份/州的颜色填充和连接线</li>
                <li>• PNG格式保持最佳质量，JPEG文件更小</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}