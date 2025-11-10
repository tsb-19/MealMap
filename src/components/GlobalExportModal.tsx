import { useState } from 'react'
import { X, Download, Globe } from 'lucide-react'
import html2canvas from 'html2canvas'
import { LocalStudent, getRegionColor, getColorConfig, CARD_COLORS } from '@/lib/storage'

// 验证html2canvas导入
if (!html2canvas || typeof html2canvas !== 'function') {
  console.error('html2canvas导入失败或不可用')
  console.error('请确保已正确安装html2canvas包')
}

// DOM稳定性检查函数
const waitForDOMStable = async (container: HTMLElement, maxWaitTime = 10000) => {
  console.log('开始DOM稳定性检查')
  const startTime = Date.now()
  let lastHeight = 0
  let stableCount = 0
  
  while (Date.now() - startTime < maxWaitTime) {
    // 强制重排
    container.offsetHeight
    container.scrollHeight
    container.scrollWidth
    
    const currentHeight = container.scrollHeight
    
    if (Math.abs(currentHeight - lastHeight) < 5) {
      stableCount++
      if (stableCount >= 3) {
        console.log('DOM已稳定，耗时:', (Date.now() - startTime) / 1000, '秒')
        break
      }
    } else {
      stableCount = 0
    }
    
    lastHeight = currentHeight
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  if (Date.now() - startTime >= maxWaitTime) {
    console.warn('DOM稳定性检查超时，但继续执行')
  }
}

// 完整的区域填充颜色函数 - V11稳定版
const addRegionFillColors = (svgText: string, studentsByRegion: Record<string, LocalStudent[]>, regions: any[], country: 'china' | 'usa'): string => {
  let modifiedSvg = svgText
  
  console.log(`=== V11: 开始处理 ${country} 地图颜色填充 ===`)
  console.log('学生数据:', studentsByRegion)
  console.log('原始SVG长度:', svgText.length)
  
  // V11: 完整的颜色处理逻辑
  try {
    // 首先为所有path设置默认颜色
    const defaultFill = country === 'china' ? '#fef3e2' : '#e8f4fd'
    modifiedSvg = modifiedSvg.replace(/<path([^>]*)>/gi, (match, attrs) => {
      // 为所有path设置默认填充颜色
      return `<path${attrs} fill="${defaultFill}">`
    })
    
    console.log('V11设置默认颜色完成')
    
    // 然后为有学生的区域设置特殊颜色
    Object.entries(studentsByRegion).forEach(([regionId, regionStudents]) => {
      // V23修复：即使没有regions数据也要处理颜色填充
      const region = regions.find((r: any) => r.id === regionId)
      const color = getRegionColor(regionId)
      
      console.log(`V23处理区域: ${regionId}, 颜色: ${color}, 找到区域: ${!!region}`)
      
      // 即使没有找到region配置，也要设置颜色
      
      // V11: 完整的ID处理逻辑
      let svgId = regionId
      if (country === 'china' && regionId.startsWith('CN-')) {
        svgId = regionId.replace('CN-', '')
      } else if (country === 'usa' && regionId.startsWith('US-')) {
        svgId = regionId
      }
      
      // V11: 完整的匹配逻辑
      const escapedSvgId = svgId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      // 尝试多种匹配方式
      let matched = false
      
      // 1. 匹配data-region-id属性
      const dataRegionRegex = new RegExp(`<path[^>]*data-region-id=["']${escapedSvgId}["'][^>]*>`, 'gi')
      if (dataRegionRegex.test(modifiedSvg)) {
        console.log(`V11找到data-region-id匹配: ${svgId}`)
        modifiedSvg = modifiedSvg.replace(dataRegionRegex, (match) => {
          matched = true
          return match.replace(/fill=["'][^"']*["']/gi, `fill="${color}"`)
        })
      }
      
      // 2. 匹配id属性
      if (!matched) {
        const idRegex = new RegExp(`<path[^>]*id=["']${escapedSvgId}["'][^>]*>`, 'gi')
        if (idRegex.test(modifiedSvg)) {
          console.log(`V11找到id匹配: ${svgId}`)
          modifiedSvg = modifiedSvg.replace(idRegex, (match) => {
            matched = true
            return match.replace(/fill=["'][^"']*["']/gi, `fill="${color}"`)
          })
        }
      }
      
      // 3. 模糊匹配
      if (!matched) {
        console.log(`V11尝试模糊匹配: ${svgId}`)
        const fuzzyRegex = new RegExp(`<path[^>]*>`, 'gi')
        let matchCount = 0
        modifiedSvg = modifiedSvg.replace(fuzzyRegex, (match) => {
          if (match.includes(svgId) && matchCount < 1) {
            console.log(`V11模糊匹配成功: ${svgId}`)
            matchCount++
            matched = true
            return match.replace(/fill=["'][^"']*["']/gi, `fill="${color}"`)
          }
          return match
        })
      }
      
      if (!matched) {
        console.log(`V11警告: 未找到匹配项: ${svgId}`)
      }
    })
    
    console.log(`V11颜色填充处理完成，修改后SVG长度: ${modifiedSvg.length}`)
    return modifiedSvg
  } catch (error) {
    console.error('V11颜色填充处理错误:', error)
    return svgText // 返回原始SVG
  }
}

interface GlobalExportModalProps {
  isOpen: boolean
  onClose: () => void
  allStudents: LocalStudent[]
  mapsConfig?: any // V23: 添加mapsConfig支持
}

export default function GlobalExportModal({ isOpen, onClose, allStudents, mapsConfig }: GlobalExportModalProps) {
  const [loading, setLoading] = useState(false)
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')

  const handleExport = async () => {
    if (loading) {
      console.log('导出已在进行中，跳过重复请求')
      return
    }
    
    console.log('=== 开始全球地图导出流程 ===')
    console.log('导出参数:', {
      totalStudents: allStudents.length,
      chinaStudents: allStudents.filter(s => s.country === 'china').length,
      usaStudents: allStudents.filter(s => s.country === 'usa').length,
      format: format
    })
    
    setLoading(true)
    const startTime = Date.now()
    
    try {
      console.log('步骤1: 初始化DOM环境')
      
      // 强制重排确保DOM稳定
      document.body.offsetHeight
      await new Promise(resolve => setTimeout(resolve, 100))
      console.log('DOM环境初始化完成')
      
      console.log('步骤2: 创建导出容器')
      
      // 创建临时容器 - 大幅增大尺寸
      const container = document.createElement('div')
      container.style.cssText = 'position: fixed; top: -10000px; left: -10000px; width: 2400px; background: white; padding: 120px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; min-height: 2000px;'
      container.id = 'export-container-' + Date.now()
      
      console.log('容器创建完成:', {
        width: container.style.width,
        height: container.style.height,
        id: container.id
      })
      
      // 标题
      console.log('步骤3: 生成标题内容')
      const titleDiv = document.createElement('div')
      titleDiv.style.cssText = 'text-align: center; margin-bottom: 50px;'
      const countryCount = Array.from(new Set(allStudents.map(s => s.country))).length
      titleDiv.innerHTML = `
        <h1 style="font-size: 52px; font-weight: 700; color: #1f2937; margin-bottom: 20px;">全球蹭饭地图</h1>
        <div style="font-size: 28px; color: #6b7280; margin-bottom: 12px;">已标记 ${allStudents.length} 位同学, 覆盖 ${countryCount} 个国家</div>
      `
      container.appendChild(titleDiv)
      console.log('标题内容生成完成')
      
      // 创建地图容器 - 大幅增大间距
      const mapsContainer = document.createElement('div')
      mapsContainer.style.cssText = 'display: flex; gap: 200px; justify-content: center; align-items: flex-start; padding: 60px; min-height: 1000px;'
      container.appendChild(mapsContainer)
      console.log('地图容器创建完成')
      
      // 添加到DOM
      console.log('步骤4: 将容器添加到DOM')
      document.body.appendChild(container)
      console.log('容器已添加到DOM:', container.id)
      
      // 验证html2canvas是否正确导入
      console.log('步骤5: 验证html2canvas依赖')
      if (!html2canvas || typeof html2canvas !== 'function') {
        throw new Error('html2canvas库未正确导入或不可用')
      }
      console.log('html2canvas验证通过')
      
      // 中国地图
      console.log('步骤6: 处理中国地图')
      const chinaStudents = allStudents.filter(s => s.country === 'china')
      console.log('中国学生数据:', chinaStudents.length, '位')
      
      const chinaMap = await createMapDiv('china', chinaStudents, {}, mapsConfig)
      if (chinaMap) {
        mapsContainer.appendChild(chinaMap)
        console.log('中国地图处理完成并添加')
      } else {
        console.warn('中国地图创建失败')
      }
      
      // 美国地图
      console.log('步骤7: 处理美国地图')
      const usaStudents = allStudents.filter(s => s.country === 'usa')
      console.log('美国学生数据:', usaStudents.length, '位')
      
      const usaMap = await createMapDiv('usa', usaStudents, {}, mapsConfig)
      if (usaMap) {
        mapsContainer.appendChild(usaMap)
        console.log('美国地图处理完成并添加')
      } else {
        console.warn('美国地图创建失败')
      }
      
      // 等待所有资源加载完成
      console.log('步骤8: 等待DOM稳定')
      console.log('等待时间: 20秒以确保所有资源加载完成')
      await new Promise(resolve => setTimeout(resolve, 20000))
      console.log('基础等待完成，开始详细稳定性检查')
      
      // 使用DOM稳定性检查函数
      await waitForDOMStable(container, 10000)
      console.log('DOM稳定性检查完成')
      
      // 强制重排确保布局稳定
      console.log('步骤9: 强制布局重排')
      container.offsetHeight
      container.scrollHeight
      container.scrollWidth
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('布局重排完成')
      
      // 验证容器内容
      console.log('步骤10: 验证容器内容')
      const containerElements = container.querySelectorAll('*')
      console.log('容器内元素数量:', containerElements.length)
      
      const svgElements = container.querySelectorAll('svg')
      console.log('SVG元素数量:', svgElements.length)
      
      const studentCards = container.querySelectorAll('.student-card, [class*="student"], [class*="card"]')
      console.log('学生卡片数量:', studentCards.length)
      
      const lines = container.querySelectorAll('line')
      console.log('连线数量:', lines.length)
      
      // 导出图片 - 使用dom-to-image
      console.log('步骤11: 开始截图')
      console.log('容器尺寸:', {
        scrollWidth: container.scrollWidth,
        scrollHeight: container.scrollHeight,
        offsetWidth: container.offsetWidth,
        offsetHeight: container.offsetHeight
      })
      
      // 导出前最终验证
      console.log('导出前最终验证:')
      console.log('- 容器是否在DOM中:', container.parentNode !== null)
      console.log('- 容器是否可见:', container.offsetParent !== null || container.style.position === 'fixed')
      console.log('- 容器内容长度:', container.innerHTML.length)
      console.log('- 容器子元素数量:', container.children.length)
      
      if (container.children.length === 0) {
        throw new Error('容器为空，无法生成图片')
      }
      
      const exportOptions = {
        backgroundColor: '#ffffff', // 修复：使用正确的参数名
        scale: 2, // 修复：提高清晰度
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: true, // 修复：关键配置，启用HTML元素渲染
        imageTimeout: 15000,
        removeContainer: false, // 修复：保持容器结构
        scrollX: 0,
        scrollY: 0,
        windowWidth: container.offsetWidth,
        windowHeight: container.offsetHeight,
        // 修复：添加HTML元素渲染支持
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
      
      console.log('html2canvas配置:', exportOptions)
      
      console.log('开始调用html2canvas...')
      const canvas = await html2canvas(container, exportOptions)
      console.log('html2canvas调用完成')
      console.log('生成的canvas尺寸:', canvas.width, 'x', canvas.height)
      
      // 转换为dataUrl
      const dataUrl = canvas.toDataURL(`image/${format}`, 0.9)
      console.log('生成的dataUrl长度:', dataUrl.length)
      console.log('dataUrl前缀:', dataUrl.substring(0, 50) + '...')
      
      // 验证生成的图片数据
      if (!dataUrl || dataUrl.length === 0) {
        throw new Error('生成的图片数据为空')
      }
      
      console.log('步骤12: 下载图片')
      
      // 下载图片
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().split('T')[0]
      link.download = `全球蹭饭地图-${timestamp}.${format}`
      link.href = dataUrl
      
      console.log('下载链接创建完成:', {
        filename: link.download,
        hrefLength: link.href.length
      })
      
      // 触发下载
      link.click()
      console.log('下载触发完成')
      
      const endTime = Date.now()
      console.log('=== 导出流程完成 ===')
      console.log('总耗时:', (endTime - startTime) / 1000, '秒')
      
      // 清理
      console.log('步骤13: 清理DOM')
      if (container.parentNode) {
        document.body.removeChild(container)
        console.log('容器已从DOM中移除')
      }
      
    } catch (error) {
      const endTime = Date.now()
      console.error('=== 导出流程失败 ===')
      console.error('错误时间:', new Date().toISOString())
      console.error('总耗时:', (endTime - startTime) / 1000, '秒')
      console.error('错误类型:', error.constructor.name)
      console.error('错误消息:', error.message)
      console.error('错误堆栈:', error.stack)
      
      // 详细的错误信息
      let errorMessage = '导出失败'
      if (error.message.includes('dom-to-image')) {
        errorMessage = '图片生成失败，请检查浏览器兼容性'
      } else if (error.message.includes('网络') || error.message.includes('fetch')) {
        errorMessage = '地图数据加载失败，请检查网络连接'
      } else if (error.message.includes('内存') || error.message.includes('内存不足')) {
        errorMessage = '内存不足，请减少数据量后重试'
      } else if (error.message.includes('DOM')) {
        errorMessage = 'DOM操作失败，请刷新页面后重试'
      } else {
        errorMessage = `导出失败: ${error.message}`
      }
      
      console.error('用户友好错误信息:', errorMessage)
      alert(errorMessage)
      
      // 尝试清理可能残留的容器
      const exportContainer = document.querySelector('[id^="export-container-"]')
      if (exportContainer && exportContainer.parentNode) {
        console.log('清理残留的导出容器')
        document.body.removeChild(exportContainer)
      }
      
    } finally {
      setLoading(false)
      console.log('导出状态已重置')
    }
  }

  // 添加学生卡片和连线到SVG容器
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
    
    console.log('按地区分组的學生:', studentsByRegion)

    // 获取SVG元素
    const svgEl = container.querySelector('svg')
    if (!svgEl) {
      console.error('未找到SVG元素')
      return
    }
    
    console.log('找到SVG元素:', svgEl)
    console.log('SVG内容长度:', svgEl.innerHTML.length)
    
    // 首先调用addRegionFillColors来添加省份颜色填充
    const svgText = svgEl.outerHTML
    console.log('原始SVG文本:', svgText.substring(0, 500) + '...')
    
    const modifiedSvgText = addRegionFillColors(svgText, studentsByRegion, regions, country)
    console.log('修改后的SVG文本长度:', modifiedSvgText.length)
    
    // 更新SVG内容
    svgEl.outerHTML = modifiedSvgText
    console.log('SVG内容已更新')

    // 创建连线SVG容器 - 确保在卡片下方
    const linesContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    linesContainer.setAttribute('width', '100%')
    linesContainer.setAttribute('height', '100%')
    linesContainer.style.position = 'absolute'
    linesContainer.style.top = '0'
    linesContainer.style.left = '0'
    linesContainer.style.pointerEvents = 'none'
    linesContainer.style.zIndex = '3'
    linesContainer.style.background = 'transparent'
    
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

      // 生成连线 - 直接添加到连线容器
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', regionPos.x.toString())
      line.setAttribute('y1', regionPos.y.toString())
      line.setAttribute('x2', cardX.toString())
      line.setAttribute('y2', cardY.toString())
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
      endCircle.setAttribute('cx', cardX.toString())
      endCircle.setAttribute('cy', cardY.toString())
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
        left: ${cardX}px;
        top: ${cardY}px;
        transform: translate(-50%, -50%);
        background: ${transparentColor};
        border-radius: 6px;
        padding: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 1px solid ${baseColor};
        min-width: 180px;
        max-width: 260px;
        z-index: 30;
        color: white;
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        line-height: 1.4;
        display: block;
        visibility: visible;
        overflow: visible;
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

  // 创建单个地图的临时div - V23修复版
  const createMapDiv = async (country: 'china' | 'usa', students: LocalStudent[], config: any, mapsConfig?: any) => {
    const mapDiv = document.createElement('div')
    mapDiv.style.cssText = 'width: 100%; max-width: 800px; min-width: 700px; display: flex; flex-direction: column; align-items: center;'

    // 地图标题 - 增强视觉效果
    const titleDiv = document.createElement('div')
    titleDiv.style.cssText = 'text-align: center; margin-bottom: 40px;'
    const flagEmoji = country === 'china' ? '🇨🇳' : '🇺🇸'
    const countryColor = country === 'china' ? '#dc2626' : '#2563eb'
    titleDiv.innerHTML = `
      <h2 style="font-size: 44px; font-weight: 700; color: ${countryColor}; margin-bottom: 16px;">
        ${flagEmoji} ${country === 'china' ? '中国' : '美国'}
      </h2>
      <div style="display: inline-block; background: ${countryColor}; color: white; padding: 12px 24px; border-radius: 28px; font-size: 20px; font-weight: 600;">
        ${students.length} 位同学
      </div>
    `
    mapDiv.appendChild(titleDiv)

    try {
      // V14: 全面优化SVG加载逻辑
      const fileName = country === 'china' ? 'china-combined.svg' : 'usa-combined.svg'
      console.log(`V14加载地图文件: ${fileName}`)
      
      // 尝试多个可能的路径
      const possiblePaths = [
        `/maps/${fileName}`,
        `/public/maps/${fileName}`,
        `${fileName}`,
        // V14新增：尝试其他可能的路径
        `/public/${fileName}`,
        `./public/maps/${fileName}`,
        `./maps/${fileName}`
      ]
      
      let svgText = ''
      let loaded = false
      let lastError = null
      
      for (const path of possiblePaths) {
        try {
          console.log(`V14尝试路径: ${path}`)
          const response = await fetch(path)
          if (response.ok) {
            svgText = await response.text()
            // V14修复：移除XML声明，确保SVG正确解析
            svgText = svgText.replace(/<\?xml[^>]*\?>/g, '').trim()
            console.log(`V14成功从 ${path} 加载SVG文件，长度: ${svgText.length}`)
            console.log(`V14移除XML声明后长度: ${svgText.length}`)
            
            // V14验证SVG内容
            if (svgText.includes('<svg') && svgText.includes('</svg>')) {
              loaded = true
              break
            } else {
              console.warn(`V14 SVG内容验证失败: ${path}`)
            }
          } else {
            console.log(`V14路径 ${path} 响应错误: ${response.status}`)
          }
        } catch (pathError) {
          console.log(`V14路径 ${path} 失败:`, pathError)
          lastError = pathError
        }
      }
      
      if (!loaded) {
        throw new Error(`无法加载地图文件: ${fileName}, 最后错误: ${lastError?.message}`)
      }
      
      // V18: 大幅优化SVG容器创建
      const newSvgContainer = document.createElement('div')
      newSvgContainer.style.cssText = 'position: relative; width: 100%; height: 800px; background: white; border-radius: 16px; padding: 60px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); overflow: visible; min-width: 1000px;'
      
      // V14: 优化SVG内容设置
      newSvgContainer.innerHTML = svgText
      
      // V14: 全面优化SVG处理逻辑
      const svgEl = newSvgContainer.querySelector('svg')
      if (svgEl) {
        // 设置SVG基本样式
        svgEl.style.cssText = 'width: 100%; height: 100%; display: block;'
        
        // V14: 完整路径处理
        const paths = svgEl.querySelectorAll('path')
        console.log(`V14找到 ${paths.length} 个路径`)
        
        // V14: 设置默认样式并验证所有路径
        paths.forEach((path, index) => {
          const pathEl = path as SVGPathElement
          
          // 确保路径可见
          pathEl.style.display = 'block'
          pathEl.style.visibility = 'visible'
          
          // 设置默认样式
          const defaultFill = country === 'china' ? '#fef3e2' : '#e8f4fd'
          if (!pathEl.getAttribute('fill') || pathEl.getAttribute('fill') === 'none' || pathEl.getAttribute('fill') === '') {
            pathEl.setAttribute('fill', defaultFill)
          }
          
          pathEl.setAttribute('stroke', '#333')
          pathEl.setAttribute('stroke-width', '1.5')
          pathEl.setAttribute('stroke-linejoin', 'round')
          pathEl.setAttribute('stroke-linecap', 'round')
          
          // V14: 优化颜色匹配逻辑
          const pathId = pathEl.getAttribute('id') || pathEl.getAttribute('data-region-id') || ''
          if (pathId) {
            // 尝试匹配学生数据
            const matchedStudent = students.find(student => {
              const studentRegionId = student.region_id.replace('CN-', '').replace('US-', '')
              return pathId.includes(studentRegionId) || studentRegionId.includes(pathId) || 
                     pathId.toLowerCase().includes(studentRegionId.toLowerCase()) ||
                     studentRegionId.toLowerCase().includes(pathId.toLowerCase())
            })
            
            if (matchedStudent) {
              const color = getRegionColor(matchedStudent.region_id)
              pathEl.setAttribute('fill', color)
              console.log(`V14为路径 ${pathId} 设置颜色: ${color}`)
            }
          }
        })
        
        // V14: 优化文字标签
        const texts = svgEl.querySelectorAll('text')
        texts.forEach(text => {
          const textEl = text as SVGTextElement
          textEl.setAttribute('fill', '#333')
          textEl.setAttribute('font-size', '14')
          textEl.setAttribute('font-weight', '500')
          textEl.style.display = 'block'
          textEl.style.visibility = 'visible'
        })
        
        // V14: 特别处理美国地图，确保所有州都可见
        if (country === 'usa') {
          console.log('V14特别处理美国地图，确保所有州都可见')
          
          // 验证美国地图的州数量
          const usaPaths = svgEl.querySelectorAll('path')
          console.log(`V14美国地图包含 ${usaPaths.length} 个路径`)
          
          // 如果路径太少，尝试修复
          if (usaPaths.length < 50) {
            console.warn(`V14警告: 美国地图路径数量异常 (${usaPaths.length}), 期望至少50个`)
            
            // 尝试重新设置所有路径的样式
            usaPaths.forEach((path, index) => {
              const pathEl = path as SVGPathElement
              pathEl.style.display = 'block'
              pathEl.style.visibility = 'visible'
              pathEl.style.opacity = '1'
              
              // 确保每个路径都有基本的样式
              if (!pathEl.getAttribute('fill') || pathEl.getAttribute('fill') === 'none') {
                pathEl.setAttribute('fill', '#e8f4fd')
              }
              pathEl.setAttribute('stroke', '#333')
              pathEl.setAttribute('stroke-width', '1.5')
            })
          }
        }
        
        console.log(`V14 SVG处理完成，包含 ${paths.length} 个路径和 ${texts.length} 个文本`)
      } else {
        throw new Error('未找到SVG元素')
      }
      
      // V23: 获取正确的regions数据
      const regions = mapsConfig?.countries?.[country]?.administrative_divisions || []
      console.log(`V23 ${country}地图regions数据:`, regions.length, '个区域')
      
      // V18: 进一步增加学生卡片和连线添加的等待时间
      if (students.length > 0) {
        // V18: 超长等待时间确保SVG完全渲染
        await new Promise(resolve => setTimeout(resolve, 6000))
        await addStudentCardsAndLines(newSvgContainer, students, regions, country)
        // V18: 额外等待确保卡片和连线完全渲染
        await new Promise(resolve => setTimeout(resolve, 4000))
      }
      
      // V16: 最终验证和强制样式应用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // V16: 强制重新应用所有样式
      const allElements = newSvgContainer.querySelectorAll('*')
      allElements.forEach(el => {
        const element = el as HTMLElement
        element.style.flexShrink = '0'
        element.style.maxHeight = 'none'
        element.style.overflow = 'visible'
        element.style.display = element.tagName === 'PATH' || element.tagName === 'LINE' || element.tagName === 'CIRCLE' ? 'block' : element.style.display
        element.style.visibility = 'visible'
        element.style.opacity = '1'
      })
      
      // V16: 特别处理SVG路径，确保填充颜色
      const svgElements = newSvgContainer.querySelectorAll('svg')
      svgElements.forEach(svg => {
        const svgEl = svg as SVGSVGElement
        const paths = svgEl.querySelectorAll('path')
        paths.forEach(path => {
          const pathEl = path as SVGPathElement
          if (!pathEl.getAttribute('fill') || pathEl.getAttribute('fill') === 'none') {
            const defaultFill = country === 'china' ? '#fef3e2' : '#e8f4fd'
            pathEl.setAttribute('fill', defaultFill)
          }
          pathEl.setAttribute('stroke', '#333')
          pathEl.setAttribute('stroke-width', '1.5')
          pathEl.style.display = 'block'
          pathEl.style.visibility = 'visible'
          pathEl.style.opacity = '1'
        })
      })
      
      // V16: 验证学生卡片和连线是否正确生成
      const studentCards = newSvgContainer.querySelectorAll('.student-card, [class*="student"], [class*="card"]')
      const lines = newSvgContainer.querySelectorAll('line')
      const circles = newSvgContainer.querySelectorAll('circle')
      
      console.log(`V16验证 ${country} 地图: 找到 ${studentCards.length} 个学生卡片, ${lines.length} 条连线, ${circles.length} 个圆点`)
      
      // V23: 如果没有找到卡片和连线，尝试手动创建
      if (students.length > 0 && (studentCards.length === 0 || lines.length === 0)) {
        console.log(`V23警告: ${country} 地图缺少卡片或连线，尝试手动生成`)
        const regions = mapsConfig?.countries?.[country]?.administrative_divisions || []
        await addStudentCardsAndLines(newSvgContainer, students, regions, country)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      console.log(`V16完成 ${country} 地图处理`)
      
      mapDiv.appendChild(newSvgContainer)
      return mapDiv
    } catch (error) {
      console.error(`V14 Failed to capture ${country} map:`, error)
      
      // 创建错误提示
      const errorDiv = document.createElement('div')
      errorDiv.style.cssText = 'width: 100%; height: 600px; background: #f5f5f5; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-direction: column;'
      errorDiv.innerHTML = `
        <div style="font-size: 32px; color: #666; margin-bottom: 20px;">⚠️</div>
        <div style="font-size: 20px; color: #666; text-align: center;">
          ${country === 'china' ? '中国' : '美国'}地图加载失败<br/>
          <span style="font-size: 16px; color: #999;">${error.message}</span>
        </div>
      `
      mapDiv.appendChild(errorDiv)
      return mapDiv
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
