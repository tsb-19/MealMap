
import { useEffect, useState, useRef, useCallback, useLayoutEffect, useMemo } from 'react'
import { LocalStudent, getRegionColor, CARD_COLORS } from '@/lib/storage'
import { DraggableStudentCard, AggregatedCard } from './StudentCard'
import { ZoomIn, ZoomOut, Maximize2, Download, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'

// 临时配置：禁用SVG路径提取，强制使用地理坐标（用于调试SVG坐标问题）
const FORCE_USE_GEOGRAPHIC_COORDINATES = false

// localStorage键前缀
const STORAGE_PREFIX = 'meal-map'

const DEFAULT_CARD_WIDTH_PERCENT = 12
const DEFAULT_CARD_HEIGHT_PERCENT = 8

// localStorage相关函数（移到组件外部）
const getCardPositionsFromStorage = (country: 'china' | 'usa'): Record<string, CardPosition> => {
  try {
    const key = `${STORAGE_PREFIX}-${country}-card-positions`
    const stored = localStorage.getItem(key)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
  }
  return {}
}

const saveCardPositionsToStorage = (country: 'china' | 'usa', positions: Record<string, CardPosition>) => {
  try {
    const key = `${STORAGE_PREFIX}-${country}-card-positions`
    localStorage.setItem(key, JSON.stringify(positions))
  } catch (error) {
  }
}

interface Region {
  id: string
  name: string
  name_en: string
  code: string
  type: string
  administrative_center: string
  coordinates: {
    lat: number
    lng: number
  }
}

interface InteractiveMapProps {
  country: 'china' | 'usa'
  regions: Region[]
  students: LocalStudent[]
  onRegionClick: (region: Region) => void
  onStudentEdit: (student: LocalStudent) => void
  onStudentDelete: (id: string) => void
  onShowList: (region: Region, students: LocalStudent[]) => void
  colorChanged?: number // 添加颜色变化触发器
}

interface CardPosition {
  x: number
  y: number
}

export default function InteractiveMap({
  country,
  regions,
  students,
  onRegionClick,
  onStudentEdit,
  onStudentDelete,
  onShowList,
  colorChanged,
}: InteractiveMapProps) {
  // 加载地图
  useEffect(() => {
    if (!regions || regions.length === 0) {
      setSvgContent(`
        <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
          <text x="400" y="300" text-anchor="middle" font-size="18" fill="#666">
            暂无地区数据
          </text>
        </svg>
      `)
      setLoading(false)
      return
    }

    setRegionPositions({})
    setSvgContent('')
    
    setLoading(true)
    loadCombinedSVG().then(() => {
      setLoading(false)
    })
  }, [country, regions])

  // 监听国家变化，重新从localStorage读取卡片位置
  useEffect(() => {
    const storedPositions = getCardPositionsFromStorage(country)
    setCardPositions(storedPositions)
  }, [country])
  
  const [svgContent, setSvgContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [regionPositions, setRegionPositions] = useState<Record<string, { x: number; y: number; width?: number; height?: number }>>({})
  const [cardPositions, setCardPositions] = useState<Record<string, CardPosition>>({})
  const [cardDimensions, setCardDimensions] = useState<Record<string, { width: number; height: number }>>({})
  const [svgViewBox, setSvgViewBox] = useState<{ width: number; height: number }>({ width: 1200, height: 900 })
  const [forceUpdate, setForceUpdate] = useState(0)
  const [lineEndpoints, setLineEndpoints] = useState<Record<string, { x: number; y: number }>>({})
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const lineSvgContainerRef = useRef<HTMLDivElement>(null)
  const lineSvgRef = useRef<SVGSVGElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // 将配置中的region ID转换为SVG中的data-region-id格式
  const regionIdToSvgId = (regionId: string): string[] => {
    const possibleIds: string[] = [regionId]
    
    if (regionId.startsWith('CN-')) {
      possibleIds.push(regionId.replace('CN-', ''))
    }
    
    if (country === 'usa' && regionId.startsWith('US-')) {
      const stateCode = regionId.replace('US-', '')
      const stateToFipsCode: Record<string, string> = {
        'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
        'CO': '08', 'CT': '09', 'DE': '10', 'DC': '11', 'FL': '12',
        'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
        'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23',
        'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
        'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33',
        'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38',
        'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44',
        'SC': '45', 'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49',
        'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56'
      }
      
      const fipsCode = stateToFipsCode[stateCode]
      if (fipsCode) {
        possibleIds.push(`US-${fipsCode}`)
      }
    }
    
    return possibleIds
  }

  // A more robust ID matching helper function
  const findRegionById = (svgRegionId: string): Region | undefined => {
    if (!svgRegionId) return undefined

    // Attempt direct match first
    let region = regions.find((r) => r.id === svgRegionId)
    if (region) return region

    // Handle country-specific prefixes
    if (country === 'china') {
      // Handles cases where svgRegionId is "130000" and region.id is "CN-130000"
      region = regions.find((r) => r.id === `CN-${svgRegionId}`)
      if (region) return region
      // Handles cases where svgRegionId is "CN-130000" and region.id is "130000"
      region = regions.find((r) => `CN-${r.id}` === svgRegionId)
      if (region) return region
    } else if (country === 'usa') {
      // Handles cases where svgRegionId might be a FIPS code like "US-06"
      // and we need to find the state code "CA"
      const fipsToState: { [key: string]: string } = {
        '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY'
      }
      if (svgRegionId.startsWith('US-')) {
        const code = svgRegionId.split('-')[1]
        const stateAbbr = fipsToState[code]
        if (stateAbbr) {
          region = regions.find((r) => r.id === `US-${stateAbbr}`)
          if (region) return region
        }
      }
    }

    // Fallback for partial matches (e.g., svgRegionId is "130000" and region.id ends with "-130000")
    region = regions.find((r) => r.id.endsWith(`-${svgRegionId}`))
    if (region) return region

    return undefined
  }

  // 按地区分组学生
  const studentsByRegion = useMemo(() => {
    return students.reduce((acc, student) => {
      if (!acc[student.region_id]) {
        acc[student.region_id] = []
      }
      acc[student.region_id].push(student)
      return acc
    }, {} as Record<string, LocalStudent[]>)
  }, [students])

  // 为有学生的省份添加填充颜色 - 支持任意颜色值
  const addRegionFillColors = (svgText: string, studentsByRegion: Record<string, LocalStudent[]>, regions: Region[]): string => {
    let modifiedSvg = svgText
    
    Object.entries(studentsByRegion).forEach(([regionId, regionStudents]) => {
      const region = regions.find(r => r.id === regionId)
      if (!region) return
      
      // 直接使用getRegionColor返回的颜色值，支持任意颜色
      const regionColor = getRegionColor(regionId)
      
      // 确保颜色值是十六进制格式
      let fillColor = regionColor
      if (!fillColor.startsWith('#')) {
        // 如果不是十六进制，尝试转换为十六进制
        const colorConfig = CARD_COLORS.find(c => c.value === fillColor)
        fillColor = colorConfig ? colorConfig.hex : '#0EA5E9'
      }
      
      let svgId = regionId
      
      // 处理中国省份（CN-前缀或直接ID）
      if (country === 'china') {
        if (regionId.startsWith('CN-')) {
          svgId = regionId.replace('CN-', '')
        } else {
          svgId = regionId
        }
      }
      
      // 处理美国州（需要将州名缩写转换为FIPS代码）
      if (country === 'usa') {
        // 美国州名缩写到FIPS代码的映射
        const stateToFips: { [key: string]: string } = {
          'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09', 'DE': '10',
          'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19', 'KS': '20',
          'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
          'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36',
          'NC': '37', 'ND': '38', 'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
          'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54',
          'WI': '55', 'WY': '56', 'DC': '11', 'PR': '72'
        }
        
        // 从 US-NY 格式中提取州名缩写
        const stateCode = regionId.replace('US-', '')
        const fipsCode = stateToFips[stateCode]
        
        if (fipsCode) {
          svgId = `US-${fipsCode}`
        } else {
          svgId = regionId
        }
      }
      
      // 处理data-region-id属性 - 支持多行SVG路径
      const escapedSvgId = svgId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      // 使用更宽松的正则表达式，支持多行和换行
      const dataRegionRegex = new RegExp(`<path[^>]*data-region-id=["']${escapedSvgId}["'][^>]*>`, 'gi')
      
      let dataRegionMatches = 0
      modifiedSvg = modifiedSvg.replace(dataRegionRegex, (match) => {
        dataRegionMatches++
        
        // 检查是否已经有style属性
        if (match.includes('style=')) {
          // 更新现有的style属性，添加或更新fill
          return match.replace(/style=["'][^"']*["']/gi, (styleMatch) => {
            const styleContent = styleMatch.match(/style=["']([^"']*)["']/)[1]
            // 检查是否已经有fill属性
            if (styleContent.includes('fill:')) {
              // 更新现有的fill
              return styleMatch.replace(/fill:[^;]*/gi, `fill:${fillColor}`)
            } else {
              // 添加新的fill
              return styleMatch.replace(/["']$/, `; fill:${fillColor}"`)
            }
          })
        } else {
          // 在路径结束前添加style属性
          if (match.trim().endsWith('/>')) {
            // 自闭合标签：/> -> style="fill:color"/>
            return match.replace('/>', ` style="fill:${fillColor}"/>`)
          } else {
            // 普通标签：> -> style="fill:color">
            return match.replace('>', ` style="fill:${fillColor}">`)
          }
        }
      })
      
      // 如果data-region-id没有匹配到，尝试匹配id属性
      if (dataRegionMatches === 0) {
        const pathIdRegex = new RegExp(`<path[^>]*id=["']${svgId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'gi')
        let idMatches = 0
        modifiedSvg = modifiedSvg.replace(pathIdRegex, (match) => {
          idMatches++
          
          // 检查是否已经有style属性
          if (match.includes('style=')) {
            // 更新现有的style属性，添加或更新fill
            return match.replace(/style=["'][^"']*["']/gi, (styleMatch) => {
              const styleContent = styleMatch.match(/style=["']([^"']*)["']/)[1]
              // 检查是否已经有fill属性
              if (styleContent.includes('fill:')) {
                // 更新现有的fill
                return styleMatch.replace(/fill:[^;]*/gi, `fill:${fillColor}`)
              } else {
                // 添加新的fill
                return styleMatch.replace(/["']$/, `; fill:${fillColor}"`)
              }
            })
          } else {
            // 在路径结束前添加style属性
            if (match.trim().endsWith('/>')) {
              // 自闭合标签：/> -> style="fill:color"/>
              return match.replace('/>', ` style="fill:${fillColor}"/>`)
            } else {
              // 普通标签：> -> style="fill:color">
              return match.replace('>', ` style="fill:${fillColor}">`)
            }
          }
        })
        
        if (idMatches === 0) {
        }
      }
    })
    
    return modifiedSvg
  }

  // 改进的SVG路径点提取 - 使用路径边界框中心点
  const extractPathBoundaryPoint = (pathData: string, originalViewBoxWidth: number, originalViewBoxHeight: number): { x: number; y: number } | null => {
    if (!pathData || !pathData.includes('M')) return null
    
    try {
      // 提取所有坐标点（忽略命令类型）
      const coordinateRegex = /([+-]?\d*\.?\d+)[,\s]+([+-]?\d*\.?\d+)/g
      const coordinates: { x: number; y: number }[] = []
      let match
      
      while ((match = coordinateRegex.exec(pathData)) !== null) {
        const x = parseFloat(match[1])
        const y = parseFloat(match[2])
        // 过滤异常值
        if (!isNaN(x) && !isNaN(y) && x >= 0 && x <= originalViewBoxWidth && y >= 0 && y <= originalViewBoxHeight) {
          coordinates.push({ x, y })
        }
      }
      
      if (coordinates.length === 0) return null
      
      // 计算边界框
      const minX = Math.min(...coordinates.map(p => p.x))
      const maxX = Math.max(...coordinates.map(p => p.x))
      const minY = Math.min(...coordinates.map(p => p.y))
      const maxY = Math.max(...coordinates.map(p => p.y))
      
      // 计算边界框的宽度和高度
      const width = maxX - minX
      const height = maxY - minY
      
      // 使用边界框中心，但稍微向上偏移一点（避免太边缘，看起来更自然）
      // 偏移量约为高度的10-15%，确保在区域内部且不在边缘
      const offsetY = Math.min(height * 0.12, originalViewBoxHeight * 0.02) // 最多偏移2%的viewBox高度
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2 - offsetY // 向上偏移
      
      // 确保坐标在有效范围内
      const finalX = Math.max(minX + width * 0.1, Math.min(maxX - width * 0.1, centerX))
      const finalY = Math.max(minY + height * 0.1, Math.min(maxY - height * 0.1, centerY))
      
      return {
        x: finalX,
        y: finalY
      }
    } catch (error) {
      return null
    }
  }

  const loadCombinedSVG = async () => {
    try {
      const fileName = country === 'china' ? 'china-combined.svg' : 'usa-combined.svg'
      const filePath = `/maps/${fileName}`
      
      const response = await fetch(filePath)
      if (!response.ok) throw new Error(`Failed to load ${filePath}`)
      const svgText = await response.text()
      
      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
      const svgElement = svgDoc.querySelector('svg')
      
      if (!svgElement) throw new Error('Invalid SVG structure')
      
      // 获取原始SVG的viewBox
      const viewBox = svgElement.getAttribute('viewBox')
      let originalViewBoxWidth = 1200
      let originalViewBoxHeight = 900  // 修正：使用正确的默认高度
      
      if (viewBox) {
        const [, , width, height] = viewBox.split(' ').map(Number)
        originalViewBoxWidth = width
        originalViewBoxHeight = height
      }
      
      // 保持原始SVG viewBox，确保坐标系统一致
      svgElement.setAttribute('viewBox', `0 0 ${originalViewBoxWidth} ${originalViewBoxHeight}`)
      svgElement.setAttribute('width', '100%')
      svgElement.setAttribute('height', '100%')
      // 确保 preserveAspectRatio 与连线SVG一致
      if (!svgElement.getAttribute('preserveAspectRatio')) {
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      }
      
      const positions: Record<string, { x: number; y: number }> = {}
      
      regions.forEach(region => {
        // 优先从SVG路径中提取实际中心点，确保连线准确指向区域
        const regionIdVariants = [
          region.id,
          region.id.replace('CN-', ''),
          region.id.replace('US-', ''),
          `CN-${region.id}`,
          `US-${region.id}`
        ]
        
        let centerPoint: { x: number; y: number; width?: number; height?: number } | null = null
        
        // 尝试从SVG路径中提取中心点 - 直接从路径数据提取，更简单可靠
        for (const variantId of regionIdVariants) {
          const pathElement = svgElement.querySelector(`path[data-region-id="${variantId}"], path[id="${variantId}"]`) as SVGPathElement | null
          
          if (pathElement) {
            const pathData = pathElement.getAttribute('d')
            if (pathData) {
              // 直接从路径数据提取所有坐标点（支持 M, L, C, Q, Z 等命令）
              const coords: number[] = []
              // 匹配所有数字对（包括负数和小数）
              const numberPairs = pathData.match(/(-?\d+\.?\d*)[\s,]+(-?\d+\.?\d*)/g) || []
              
              numberPairs.forEach(pair => {
                const match = pair.match(/(-?\d+\.?\d*)[\s,]+(-?\d+\.?\d*)/)
                if (match) {
                  const x = parseFloat(match[1])
                  const y = parseFloat(match[2])
                  // 只添加有效的坐标（在合理范围内）
                  if (!isNaN(x) && !isNaN(y) && x >= 0 && x <= originalViewBoxWidth && y >= 0 && y <= originalViewBoxHeight) {
                    coords.push(x, y)
                  }
                }
              })
              
              if (coords.length >= 4) {
                // 计算所有坐标的边界框
                let minX = coords[0]
                let maxX = coords[0]
                let minY = coords[1]
                let maxY = coords[1]
                
                for (let i = 0; i < coords.length; i += 2) {
                  const x = coords[i]
                  const y = coords[i + 1]
                  minX = Math.min(minX, x)
                  maxX = Math.max(maxX, x)
                  minY = Math.min(minY, y)
                  maxY = Math.max(maxY, y)
                }
                
                // 计算边界框中心，对Y坐标添加向下偏移以补偿系统性向上偏移
                const centerX = (minX + maxX) / 2
                const centerY = (minY + maxY) / 2
                
                // X坐标：使用25%内偏移，确保在区域内部
                const finalX = Math.max(minX + (maxX - minX) * 0.25, Math.min(maxX - (maxX - minX) * 0.25, centerX))
                
                // Y坐标：使用30%的上偏移和20%的下偏移，使中心点稍微向下，补偿系统性向上偏移
                const finalY = Math.max(minY + (maxY - minY) * 0.30, Math.min(maxY - (maxY - minY) * 0.20, centerY))
                
                // 计算边界框的宽度和高度（百分比）
                const boxWidth = ((maxX - minX) / originalViewBoxWidth) * 100
                const boxHeight = ((maxY - minY) / originalViewBoxHeight) * 100
                
                // 转换为百分比坐标，并存储边界框信息
                centerPoint = {
                  x: (finalX / originalViewBoxWidth) * 100,
                  y: (finalY / originalViewBoxHeight) * 100,
                  width: boxWidth,
                  height: boxHeight
                }
                break
              }
            }
          }
        }
        
        // 如果无法从SVG提取，回退到地理坐标计算
        if (!centerPoint) {
        const { lat, lng } = region.coordinates
        if (country === 'china') {
          // 中国地图：经度范围73-135，纬度范围18-54
          const posX = ((lng - 73) / (135 - 73)) * 100
          const posY = ((54 - lat) / (54 - 18)) * 100
            centerPoint = { 
            x: Math.max(0, Math.min(100, posX)), 
              y: Math.max(0, Math.min(100, posY)),
              width: 4.0, // 默认边界框宽度
              height: 4.0 // 默认边界框高度
          }
        } else {
          // 美国地图：经度范围-125到-66，纬度范围24-50
          const posX = ((lng + 125) / (125 - 66)) * 100
          const posY = ((50 - lat) / (50 - 24)) * 100
            centerPoint = { 
            x: Math.max(0, Math.min(100, posX)), 
              y: Math.max(0, Math.min(100, posY)),
              width: 4.0, // 默认边界框宽度
              height: 4.0 // 默认边界框高度
          }
        }
        }
        
        positions[region.id] = centerPoint
      })
      
      setRegionPositions(positions)
      
      // 序列化SVG并应用颜色
      const serializer = new XMLSerializer()
      let finalSvgText = serializer.serializeToString(svgElement)
      
      finalSvgText = addRegionFillColors(finalSvgText, studentsByRegion, regions)
      
      setSvgContent(finalSvgText)
      // 使用原始SVG的viewBox尺寸，确保坐标系统一致
      setSvgViewBox({ width: originalViewBoxWidth, height: originalViewBoxHeight })
      setLoading(false)
      
    } catch (error) {
      setSvgContent(`
        <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
          <text x="400" y="300" text-anchor="middle" font-size="18" fill="#666">
            地图加载失败，请刷新页面重试
          </text>
        </svg>
      `)
    }
  }

  // 强制重新渲染函数 - 移除依赖避免无限循环
  const triggerForceUpdate = useCallback(() => {
    setForceUpdate(prev => prev + 1)
    // 立即重新加载地图以应用新的颜色设置
    setTimeout(() => {
      if (regions.length > 0) {
        loadCombinedSVG()
      }
    }, 50)
  }, []) // 移除regions.length依赖

  // 简化的F12检测机制（不再需要动态调整SVG viewBox）
  useEffect(() => {
    if (!mapContainerRef.current) return

    let devtoolsOpen = false
    let resizeTimeout: NodeJS.Timeout | null = null

    // 检测开发者工具是否打开
    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160
      const heightThreshold = window.outerHeight - window.innerHeight > 160
      
      const isOpen = widthThreshold || heightThreshold
      
      if (isOpen !== devtoolsOpen) {
        devtoolsOpen = isOpen
        
        // 延迟触发重新计算，确保布局稳定
        if (resizeTimeout) clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(() => {
          triggerForceUpdate()
        }, 100)
      }
    }

    // 监听窗口尺寸变化
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        detectDevTools()
      }, 50)
    }

    // 监听键盘事件（F12键）
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        if (resizeTimeout) clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(() => {
          detectDevTools()
          triggerForceUpdate()
        }, 200) // F12按下后等待更长时间
      }
    }

    // 监听窗口焦点变化
    const handleFocus = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        detectDevTools()
      }, 100)
    }

    // 初始检测
    detectDevTools()

    // 添加事件监听器
    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    // ResizeObserver作为主要检测
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        detectDevTools()
      }, 50)
    })

    resizeObserver.observe(mapContainerRef.current)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
      resizeObserver.disconnect()
      if (resizeTimeout) clearTimeout(resizeTimeout)
    }
  }, []) // 移除triggerForceUpdate依赖

  // 监听国家变化和数据变化，触发地图重新加载
  useEffect(() => {
    if (students.length >= 0 && regions.length > 0) {
      setTimeout(() => {
        loadCombinedSVG()
      }, 100)
    }
  }, [students.length, regions.length, country]) // 添加country依赖
  
  // 监听外部颜色变化触发器
  useEffect(() => {
    if (colorChanged !== undefined && colorChanged > 0 && svgContent) {
      setTimeout(() => {
        loadCombinedSVG()
      }, 100)
    }
  }, [colorChanged, svgContent])

  // 简化的forceUpdate监听 - 只在有SVG内容时触发
  useEffect(() => {
    if (forceUpdate > 0 && regions.length > 0 && svgContent) {
      setTimeout(() => {
        loadCombinedSVG()
      }, 50)
    }
  }, [forceUpdate, regions.length, svgContent])

  // 处理SVG交互
  useEffect(() => {
    const svgContainer = svgContainerRef.current;
    if (!svgContainer) return;

    const handleClick = (e: Event) => {
      const target = e.target as SVGElement;
      const path = target.closest('path[data-region-id]');

      if (path) {
        const regionId = path.getAttribute('data-region-id');
        if (regionId) {
          const region = findRegionById(regionId);
          if (region) {
            const regionStudents = studentsByRegion[region.id] || [];
            if (regionStudents.length >= 4) {
              onShowList(region, regionStudents);
            } else {
              onRegionClick(region);
            }
          }
        }
      }
    };

    const handleHover = (e: Event) => {
      const target = e.target as SVGElement;
      const path = target.closest('path[data-region-id]');
      if (path) {
        setHoveredRegion(path.getAttribute('data-region-id'));
      }
    };

    const handleLeave = () => {
      setHoveredRegion(null);
    };

    // 直接在SVG容器上附加事件监听器
    svgContainer.addEventListener('click', handleClick);
    svgContainer.addEventListener('mouseover', handleHover);
    svgContainer.addEventListener('mouseout', handleLeave);

    return () => {
      svgContainer.removeEventListener('click', handleClick);
      svgContainer.removeEventListener('mouseover', handleHover);
      svgContainer.removeEventListener('mouseout', handleLeave);
    };
  }, [svgContent, regions, onRegionClick, studentsByRegion, onShowList]);

  // 防抖保存到localStorage的定时器
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 辅助函数：检查两条线段是否相交
  const segmentsIntersect = useCallback((
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ): boolean => {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if (Math.abs(denom) < 1e-10) return false // 平行线
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom
    
    return t >= 0 && t <= 1 && u >= 0 && u <= 1
  }, [])
  
  // 辅助函数：检查线段是否与矩形相交
  const lineIntersectsRect = useCallback((
    x1: number, y1: number,
    x2: number, y2: number,
    rectLeft: number, rectTop: number,
    rectRight: number, rectBottom: number
  ): boolean => {
    // 检查线段端点是否在矩形内
    if (
      (x1 >= rectLeft && x1 <= rectRight && y1 >= rectTop && y1 <= rectBottom) ||
      (x2 >= rectLeft && x2 <= rectRight && y2 >= rectTop && y2 <= rectBottom)
    ) {
      return true
    }
    
    // 检查线段是否与矩形的四条边相交
    const edges = [
      { x1: rectLeft, y1: rectTop, x2: rectRight, y2: rectTop }, // 上边
      { x1: rectRight, y1: rectTop, x2: rectRight, y2: rectBottom }, // 右边
      { x1: rectRight, y1: rectBottom, x2: rectLeft, y2: rectBottom }, // 下边
      { x1: rectLeft, y1: rectBottom, x2: rectLeft, y2: rectTop } // 左边
    ]
    
    for (const edge of edges) {
      if (segmentsIntersect(x1, y1, x2, y2, edge.x1, edge.y1, edge.x2, edge.y2)) {
        return true
      }
    }
    
    return false
  }, [segmentsIntersect])
  
  // 使用 ref 来存储拖动中的位置和基础位置，避免频繁更新状态
  const draggingPositionsRef = useRef<Record<string, CardPosition>>({})
  const baseCardPositionsRef = useRef<Record<string, CardPosition>>({})
  
  // 同步 baseCardPositionsRef 和 cardPositions
  useEffect(() => {
    baseCardPositionsRef.current = { ...cardPositions }
  }, [cardPositions])
  
  useLayoutEffect(() => {
    if (!mapContainerRef.current) return

    let frameId: number | null = null
    let timeoutId: number | null = null

    const measure = () => {
      if (!mapContainerRef.current) return

      const containerRect = mapContainerRef.current.getBoundingClientRect()
      if (containerRect.width === 0 || containerRect.height === 0) {
        return
      }

      const innerCards = mapContainerRef.current.querySelectorAll('[data-card-id] [data-inner-card="true"]')
      if (!innerCards.length) {
        return
      }

      const updates: Record<string, { width: number; height: number }> = {}

      innerCards.forEach(innerCard => {
        const outerCard = innerCard.closest('[data-card-id]')
        if (!outerCard) return

        const regionId = outerCard.getAttribute('data-card-id')
        if (!regionId || !studentsByRegion[regionId]) {
          return
        }

        const rect = innerCard.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) {
          return
        }

        updates[regionId] = {
          width: (rect.width / containerRect.width) * 100,
          height: (rect.height / containerRect.height) * 100
        }
      })

      if (Object.keys(updates).length === 0) {
        return
      }

      setCardDimensions(prev => {
        let changed = false
        const next = { ...prev }

        // 移除已经不存在的地区
        Object.keys(next).forEach(regionId => {
          if (!studentsByRegion[regionId]) {
            delete next[regionId]
            changed = true
          }
        })

        Object.entries(updates).forEach(([regionId, dims]) => {
          const prevDims = next[regionId]
          if (
            !prevDims ||
            Math.abs(prevDims.width - dims.width) > 0.1 ||
            Math.abs(prevDims.height - dims.height) > 0.1
          ) {
            next[regionId] = dims
            changed = true
          }
        })

        return changed ? next : prev
      })
    }

    const scheduleMeasure = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
      frameId = requestAnimationFrame(measure)
    }

    scheduleMeasure()
    timeoutId = window.setTimeout(scheduleMeasure, 150)
    window.addEventListener('resize', scheduleMeasure)

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
      window.removeEventListener('resize', scheduleMeasure)
    }
  }, [studentsByRegion, scale])
  
  // 处理卡片拖拽 - 接收增量而不是绝对位置
  const handleCardDrag = useCallback((regionId: string, dx: number, dy: number) => {
    // 从 ref 获取基础位置（避免使用可能过时的状态）
    const basePos = baseCardPositionsRef.current[regionId] || { x: 0, y: 0 }
    
    // cardPos 是相对于区域中心的偏移量，可以是负数
    // 计算新位置（不限制 cardPos 的范围，允许负数）
    const newX = basePos.x + dx
    const newY = basePos.y + dy
    
    // 获取区域位置，用于计算最终位置并限制在合理范围内
    const regionPos = regionPositions[regionId]
    if (regionPos) {
      const finalX = regionPos.x + newX
      const finalY = regionPos.y + newY
      
      // 限制最终位置在 0-100% 范围内，但允许 cardPos 为负数
      // 如果最终位置超出范围，调整 cardPos 使其在范围内
      let adjustedX = newX
      let adjustedY = newY
      
      if (finalX < 0) {
        adjustedX = -regionPos.x
      } else if (finalX > 100) {
        adjustedX = 100 - regionPos.x
      }
      
      if (finalY < 0) {
        adjustedY = -regionPos.y
      } else if (finalY > 100) {
        adjustedY = 100 - regionPos.y
      }
      
      const newPosition = { x: adjustedX, y: adjustedY }
      
      // 更新拖动中的位置 ref
      draggingPositionsRef.current[regionId] = newPosition
      // 同时更新基础位置 ref，以便下次增量计算正确
      baseCardPositionsRef.current[regionId] = newPosition
      
      // 立即更新状态，确保视觉反馈及时
    setCardPositions(prev => {
      const newPositions = {
        ...prev,
          [regionId]: newPosition
      }
        
        // 防抖保存到localStorage（减少写入频率）
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
        saveTimeoutRef.current = setTimeout(() => {
      saveCardPositionsToStorage(country, newPositions)
        }, 300) // 300ms 防抖
        
      return newPositions
    })
    }
  }, [country, regionPositions])

  // 计算连线终点的函数
  const calculateLineEndpoints = useCallback(() => {
    if (!svgContainerRef.current || !mapContainerRef.current || !svgContent || Object.keys(regionPositions).length === 0) {
      return
    }

    const newEndpoints: Record<string, { x: number; y: number }> = {}
    
    // 从 DOM 中获取实际的 viewBox 尺寸，确保与渲染时一致
    let actualSvgViewBoxWidth = svgViewBox.width || 1200
    let actualSvgViewBoxHeight = svgViewBox.height || 900
    
    if (svgContainerRef.current) {
      const mapSvg = svgContainerRef.current.querySelector('svg') as SVGSVGElement | null
      if (mapSvg) {
        const viewBox = mapSvg.viewBox.baseVal
        if (viewBox.width > 0 && viewBox.height > 0) {
          actualSvgViewBoxWidth = viewBox.width
          actualSvgViewBoxHeight = viewBox.height
        }
      }
    }
    
    const fixedSvgWidth = actualSvgViewBoxWidth
    const fixedSvgHeight = actualSvgViewBoxHeight

    Object.entries(regionPositions).forEach(([regionId, position]) => {
      // 获取卡片位置（优先使用拖动中的位置）
      const draggingPos = draggingPositionsRef.current[regionId]
      const savedPos = cardPositions[regionId] || { x: 0, y: 0 }
      const cardPos = draggingPos || savedPos
      const finalX = position.x + cardPos.x
      const finalY = position.y + cardPos.y

      // 从DOM中获取区域路径的实际边界框，计算准确的连线终点
      const regionIdVariants = [
        regionId,
        regionId.replace('CN-', ''),
        regionId.replace('US-', ''),
        `CN-${regionId}`,
        `US-${regionId}`
      ]

      let lineEndX = position.x
      let lineEndY = position.y

      for (const variantId of regionIdVariants) {
        const pathElement = svgContainerRef.current!.querySelector(
          `path[data-region-id="${variantId}"], path[id="${variantId}"]`
        ) as SVGPathElement | null

        if (!pathElement) {
          continue
        }

        try {
          const svgElement = pathElement.ownerSVGElement
          if (!svgElement) {
            continue
          }

          const bbox = pathElement.getBBox()
          const viewBox = svgElement.viewBox.baseVal
          const svgViewBoxWidth = viewBox.width || fixedSvgWidth
          const svgViewBoxHeight = viewBox.height || fixedSvgHeight

          if (bbox.width === 0 || bbox.height === 0 || svgViewBoxWidth === 0 || svgViewBoxHeight === 0) {
            continue
          }

          const regionPercentX = position.x
          const regionPercentY = position.y

          const regionCenterX = (regionPercentX / 100) * svgViewBoxWidth
          const regionCenterY = (regionPercentY / 100) * svgViewBoxHeight

          lineEndX = regionPercentX
          lineEndY = regionPercentY

          const cardCenterX = (finalX / 100) * svgViewBoxWidth
          const cardCenterY = (finalY / 100) * svgViewBoxHeight

          const dirX = cardCenterX - regionCenterX
          const dirY = cardCenterY - regionCenterY
          const dirLength = Math.sqrt(dirX * dirX + dirY * dirY)

          let endpointFound = false

          const geometryElement = pathElement as unknown as SVGGeometryElement & {
            isPointInFill?: (point: DOMPoint) => boolean
          }

          const svgPoint = svgElement.createSVGPoint()
          const isInsideFill = (x: number, y: number) => {
            if (!geometryElement.isPointInFill) {
              return false
            }
            // 确保坐标在 SVG viewBox 坐标系统中
            svgPoint.x = x
            svgPoint.y = y
            try {
              const result = geometryElement.isPointInFill(svgPoint)
              // 添加详细日志以便调试
              return result
            } catch (err) {
              return false
            }
          }

          if (geometryElement.isPointInFill && dirLength > 0) {
            // 简化策略：优先使用区域中心，确保端点始终在区域内
            let finalPointX = regionCenterX
            let finalPointY = regionCenterY
            
            // 如果区域中心在填充内，直接使用
            if (isInsideFill(regionCenterX, regionCenterY)) {
              // 区域中心可用，直接使用
              finalPointX = regionCenterX
              finalPointY = regionCenterY
            } else {
              // 区域中心不在填充内，寻找最近的填充内点
              let bestPoint: { x: number; y: number } | null = null
              let bestDistance = Number.POSITIVE_INFINITY

              const maxDimension = Math.max(bbox.width, bbox.height)
              const baseRadius = Math.max(1, maxDimension * 0.01)
              const maxRadius = maxDimension * 0.3

              // 从中心向外搜索
              for (let radius = baseRadius; radius <= maxRadius; radius += baseRadius) {
                const directions = Math.max(16, Math.min(32, Math.floor(radius / 1)))
                for (let i = 0; i < directions; i++) {
                  const angle = (i / directions) * Math.PI * 2
                  const testX = regionCenterX + Math.cos(angle) * radius
                  const testY = regionCenterY + Math.sin(angle) * radius
                  if (
                    testX >= bbox.x &&
                    testX <= bbox.x + bbox.width &&
                    testY >= bbox.y &&
                    testY <= bbox.y + bbox.height &&
                    isInsideFill(testX, testY)
                  ) {
                    const dist = Math.sqrt(
                      (testX - regionCenterX) ** 2 + (testY - regionCenterY) ** 2
                    )
                    if (dist < bestDistance) {
                      bestDistance = dist
                      bestPoint = { x: testX, y: testY }
                    }
                  }
                }
                if (bestPoint) {
                  break
                }
              }

              // 如果还是没找到，使用网格搜索
              if (!bestPoint) {
                const gridSize = 16
                for (let ix = 0; ix < gridSize; ix++) {
                  for (let iy = 0; iy < gridSize; iy++) {
                    const testX = bbox.x + ((ix + 0.5) / gridSize) * bbox.width
                    const testY = bbox.y + ((iy + 0.5) / gridSize) * bbox.height
                    if (isInsideFill(testX, testY)) {
                      const dist = Math.sqrt(
                        (testX - regionCenterX) ** 2 + (testY - regionCenterY) ** 2
                      )
                      if (dist < bestDistance) {
                        bestDistance = dist
                        bestPoint = { x: testX, y: testY }
                      }
                    }
                  }
                }
              }

              if (bestPoint) {
                finalPointX = bestPoint.x
                finalPointY = bestPoint.y
              } else {
                // 最后回退到 bbox 中心
                const bboxCenterX = bbox.x + bbox.width / 2
                const bboxCenterY = bbox.y + bbox.height / 2
                if (isInsideFill(bboxCenterX, bboxCenterY)) {
                  finalPointX = bboxCenterX
                  finalPointY = bboxCenterY
                }
              }
            }
            
            // 最终验证：确保端点在填充内
            if (!isInsideFill(finalPointX, finalPointY)) {
              // 如果仍然不在填充内，尝试 bbox 中心
              const bboxCenterX = bbox.x + bbox.width / 2
              const bboxCenterY = bbox.y + bbox.height / 2
              if (isInsideFill(bboxCenterX, bboxCenterY)) {
                finalPointX = bboxCenterX
                finalPointY = bboxCenterY
              }
            }
            
            const finalCheck = isInsideFill(finalPointX, finalPointY)
            const finalPercentX = (finalPointX / svgViewBoxWidth) * 100
            const finalPercentY = (finalPointY / svgViewBoxHeight) * 100

            // 如果最终检查失败，使用区域中心作为回退
            if (!finalCheck) {
              lineEndX = regionPercentX
              lineEndY = regionPercentY
            } else {
              lineEndX = finalPercentX
              lineEndY = finalPercentY
            }
            endpointFound = true
          }

          if (!endpointFound && dirLength > 0) {
            const left = bbox.x
            const right = bbox.x + bbox.width
            const top = bbox.y
            const bottom = bbox.y + bbox.height

            const candidates: number[] = []

            if (dirX !== 0) {
              const tRight = (right - regionCenterX) / dirX
              const yAtRight = regionCenterY + dirY * tRight
              if (tRight > 0 && yAtRight >= top && yAtRight <= bottom) {
                candidates.push(tRight)
              }

              const tLeft = (left - regionCenterX) / dirX
              const yAtLeft = regionCenterY + dirY * tLeft
              if (tLeft > 0 && yAtLeft >= top && yAtLeft <= bottom) {
                candidates.push(tLeft)
              }
            }

            if (dirY !== 0) {
              const tBottom = (bottom - regionCenterY) / dirY
              const xAtBottom = regionCenterX + dirX * tBottom
              if (tBottom > 0 && xAtBottom >= left && xAtBottom <= right) {
                candidates.push(tBottom)
              }

              const tTop = (top - regionCenterY) / dirY
              const xAtTop = regionCenterX + dirX * tTop
              if (tTop > 0 && xAtTop >= left && xAtTop <= right) {
                candidates.push(tTop)
              }
            }

            if (candidates.length > 0) {
              const tEdge = Math.min(...candidates)
              let backoff = 0.96
              let intersectX = regionCenterX + dirX * tEdge * backoff
              let intersectY = regionCenterY + dirY * tEdge * backoff

              // 如果 isPointInFill 可用，验证并调整
              if (geometryElement.isPointInFill) {
                for (let i = 0; i < 10; i++) {
                  if (isInsideFill(intersectX, intersectY)) {
                    break
                  }
                  backoff *= 0.95
                  intersectX = regionCenterX + dirX * tEdge * backoff
                  intersectY = regionCenterY + dirY * tEdge * backoff
                }
                // 如果仍然不在填充内，使用区域中心（如果可用）
                if (!isInsideFill(intersectX, intersectY)) {
                  if (isInsideFill(regionCenterX, regionCenterY)) {
                    intersectX = regionCenterX
                    intersectY = regionCenterY
                  } else {
                    // 使用 bbox 中心
                    const bboxCenterX = bbox.x + bbox.width / 2
                    const bboxCenterY = bbox.y + bbox.height / 2
                    if (isInsideFill(bboxCenterX, bboxCenterY)) {
                      intersectX = bboxCenterX
                      intersectY = bboxCenterY
                    }
                  }
                }
              }

              lineEndX = (intersectX / svgViewBoxWidth) * 100
              lineEndY = (intersectY / svgViewBoxHeight) * 100
              endpointFound = true
            }
          }

          if (!endpointFound && dirLength > 0 && typeof geometryElement.getTotalLength === 'function' && typeof geometryElement.getPointAtLength === 'function') {
            const totalLength = geometryElement.getTotalLength()
            if (totalLength > 0) {
              const sampleCount = Math.min(Math.max(Math.floor(totalLength / 8), 80), 600)
              const dirNormX = dirX / dirLength
              const dirNormY = dirY / dirLength

              let bestPoint: DOMPoint | null = null
              let bestScore = Number.POSITIVE_INFINITY

              for (let i = 0; i <= sampleCount; i++) {
                const t = i / sampleCount
                const point = geometryElement.getPointAtLength(totalLength * t)
                const dxPoint = point.x - regionCenterX
                const dyPoint = point.y - regionCenterY

                const projection = dxPoint * dirNormX + dyPoint * dirNormY
                if (projection <= 0) {
                  continue
                }

                const perpendicular = Math.abs(dxPoint * dirNormY - dyPoint * dirNormX)

                const score = perpendicular * 1000 + projection
                if (score < bestScore) {
                  bestScore = score
                  bestPoint = point
                }
              }

              if (bestPoint) {
                let backoff = 0.92
                let targetX = regionCenterX + (bestPoint.x - regionCenterX) * backoff
                let targetY = regionCenterY + (bestPoint.y - regionCenterY) * backoff

                if (geometryElement.isPointInFill) {
                  for (let i = 0; i < 10; i++) {
                    if (isInsideFill(targetX, targetY)) {
                      break
                    }
                    backoff *= 0.95
                    targetX = regionCenterX + (bestPoint.x - regionCenterX) * backoff
                    targetY = regionCenterY + (bestPoint.y - regionCenterY) * backoff
                  }
                  // 如果仍然不在填充内，使用区域中心（如果可用）
                  if (!isInsideFill(targetX, targetY)) {
                    if (isInsideFill(regionCenterX, regionCenterY)) {
                      targetX = regionCenterX
                      targetY = regionCenterY
                    } else {
                      // 使用 bbox 中心
                      const bboxCenterX = bbox.x + bbox.width / 2
                      const bboxCenterY = bbox.y + bbox.height / 2
                      if (isInsideFill(bboxCenterX, bboxCenterY)) {
                        targetX = bboxCenterX
                        targetY = bboxCenterY
                      }
                    }
                  }
                }

                lineEndX = (targetX / svgViewBoxWidth) * 100
                lineEndY = (targetY / svgViewBoxHeight) * 100
                endpointFound = true
              }
            }
          }

          if (!endpointFound && dirLength > 0) {
            const left = bbox.x
            const right = bbox.x + bbox.width
            const top = bbox.y
            const bottom = bbox.y + bbox.height

            const candidates: number[] = []

            if (dirX !== 0) {
              const tRight = (right - regionCenterX) / dirX
              const yAtRight = regionCenterY + dirY * tRight
              if (tRight > 0 && yAtRight >= top && yAtRight <= bottom) {
                candidates.push(tRight)
              }

              const tLeft = (left - regionCenterX) / dirX
              const yAtLeft = regionCenterY + dirY * tLeft
              if (tLeft > 0 && yAtLeft >= top && yAtLeft <= bottom) {
                candidates.push(tLeft)
              }
            }

            if (dirY !== 0) {
              const tBottom = (bottom - regionCenterY) / dirY
              const xAtBottom = regionCenterX + dirX * tBottom
              if (tBottom > 0 && xAtBottom >= left && xAtBottom <= right) {
                candidates.push(tBottom)
              }

              const tTop = (top - regionCenterY) / dirY
              const xAtTop = regionCenterX + dirX * tTop
              if (tTop > 0 && xAtTop >= left && xAtTop <= right) {
                candidates.push(tTop)
              }
            }

            if (candidates.length > 0) {
              const tEdge = Math.min(...candidates)
              let backoff = 0.92
              let intersectX = regionCenterX + dirX * tEdge * backoff
              let intersectY = regionCenterY + dirY * tEdge * backoff

              if (geometryElement.isPointInFill) {
                for (let i = 0; i < 8; i++) {
                  if (isInsideFill(intersectX, intersectY)) {
                    break
                  }
                  backoff *= 0.95
                  intersectX = regionCenterX + dirX * tEdge * backoff
                  intersectY = regionCenterY + dirY * tEdge * backoff
                }
                if (!isInsideFill(intersectX, intersectY)) {
                  if (isInsideFill(regionCenterX, regionCenterY)) {
                    intersectX = regionCenterX
                    intersectY = regionCenterY
                  } else {
                    const bboxCenterX = bbox.x + bbox.width / 2
                    const bboxCenterY = bbox.y + bbox.height / 2
                    if (isInsideFill(bboxCenterX, bboxCenterY)) {
                      intersectX = bboxCenterX
                      intersectY = bboxCenterY
                    }
                  }
                }
              }

              lineEndX = (intersectX / svgViewBoxWidth) * 100
              lineEndY = (intersectY / svgViewBoxHeight) * 100
              endpointFound = true
            }
          }

          if (!endpointFound) {
            lineEndX = regionPercentX
            lineEndY = regionPercentY
          }

          lineEndX = Math.max(0, Math.min(100, lineEndX))
          lineEndY = Math.max(0, Math.min(100, lineEndY))

          newEndpoints[regionId] = { x: lineEndX, y: lineEndY }
          break
        } catch (error) {
          newEndpoints[regionId] = { x: position.x, y: position.y }
        }
      }

      if (!newEndpoints[regionId]) {
        newEndpoints[regionId] = { x: lineEndX, y: lineEndY }
      }
    })

    setLineEndpoints(newEndpoints)
  }, [svgContent, regionPositions, cardPositions, svgViewBox, scale, cardDimensions])

  // robustly calculate line endpoints only when all necessary data and DOM elements are ready.
  useEffect(() => {
    const renderedStudentRegions = Object.keys(studentsByRegion);

    if (renderedStudentRegions.length === 0) {
      setLineEndpoints({});
      return;
    }

    const allCardsMeasured = renderedStudentRegions.every(
      (regionId) => cardDimensions[regionId] && cardDimensions[regionId].width > 0
    );

    const mapReady = svgContent && Object.keys(regionPositions).length > 0;

    if (mapReady && allCardsMeasured) {
      const animationFrameId = requestAnimationFrame(() => {
        calculateLineEndpoints();
      });

      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [
    cardDimensions,
    studentsByRegion,
    regionPositions,
    svgContent,
    cardPositions,
    scale,
    calculateLineEndpoints,
  ]);

  // 检查连线 SVG 容器的 DOM 状态
  useEffect(() => {
  }, [studentsByRegion, lineEndpoints, scale, svgViewBox])

  // 缩放控制
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))
  const handleReset = () => setScale(1)

  // 导出当前视图为图片
  const handleExport = useCallback(async () => {
    if (!mapContainerRef.current) return;
    setExporting(true);

    try {
      // 强制重绘以确保所有样式都已应用
      await new Promise(resolve => requestAnimationFrame(resolve));

      const canvas = await html2canvas(mapContainerRef.current, {
        backgroundColor: '#f5f5f5',
        scale: 3,
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          // 移除UI控件
          const controlButtons = clonedDoc.querySelector('.absolute.bottom-6.right-6');
          if (controlButtons) {
            controlButtons.remove();
          }

          // 修正卡片和文本的渲染问题
          const studentCards = clonedDoc.querySelectorAll('[data-card-id]');
          studentCards.forEach((card) => {
            const cardElement = card as HTMLElement;
            // 确保transform和transform-origin在导出时不会导致模糊
            cardElement.style.transform = 'translate(-50%, -50%) scale(1)';
            cardElement.style.transformOrigin = 'center center';

            // 优化所有文本元素的渲染
            const textElements = cardElement.querySelectorAll('p, div, span, h3, h4');
            textElements.forEach((textEl) => {
              const el = textEl as HTMLElement;
              el.style.fontSmoothing = 'antialiased';
              el.style.textRendering = 'optimizeLegibility';
              el.style.lineHeight = '1.5';
              el.style.verticalAlign = 'middle';
              el.style.textShadow = '0 0 1px rgba(0,0,0,0.1)';
            });
          });

          // 确保SVG内的文本也得到优化
          const svgElements = clonedDoc.querySelectorAll('svg');
          svgElements.forEach(svg => {
            const textNodes = svg.querySelectorAll('text');
            textNodes.forEach(text => {
              text.style.fontSmoothing = 'antialiased';
              text.style.textRendering = 'optimizeLegibility';
              text.style.letterSpacing = '0.5px'; // 微调字间距
            });
          });
        },
      });

        // 下载图片
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `${country === 'china' ? '中国' : '美国'}-蹭饭地图-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (error) {
        alert('导出失败，请重试');
    } finally {
        setExporting(false);
    }
  }, [country, studentsByRegion, regions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-body text-neutral-700">加载地图中...</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={mapContainerRef} data-map-container className="relative w-full h-full overflow-hidden bg-neutral-50">
      {/* 地图SVG容器 */}
      <div className="absolute inset-0 flex items-center justify-center p-8" style={{ zIndex: 10 }}>
        <div
          ref={svgContainerRef}
          data-export="true"
          className="w-full h-full transition-transform duration-300"
          style={{ transform: `scale(${scale})` }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>

      {/* 连线SVG容器 - 与地图SVG使用完全相同的容器结构 */}
      <div 
        ref={lineSvgContainerRef}
        className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none" 
        style={{ zIndex: 20 }}
      >
        <div
          className="w-full h-full pointer-events-none transition-transform duration-300"
          style={{ transform: `scale(${scale})` }}
        >
          {(() => {
            try {
              // 从 DOM 获取地图 SVG 的实际 viewBox 和 preserveAspectRatio
              // 优先使用 svgViewBox state，因为它应该已经包含了正确的值
              let actualViewBoxWidth = svgViewBox.width || 1200
              let actualViewBoxHeight = svgViewBox.height || 900
              let actualPreserveAspectRatio = 'xMidYMid meet'
              
              // 尝试从 DOM 获取实际值（如果可用），但不要依赖它
              if (svgContainerRef.current) {
                const mapSvg = svgContainerRef.current.querySelector('svg') as SVGSVGElement | null
                if (mapSvg) {
                  const viewBox = mapSvg.viewBox.baseVal
                  if (viewBox.width > 0 && viewBox.height > 0) {
                    actualViewBoxWidth = viewBox.width
                    actualViewBoxHeight = viewBox.height
                  }
                  const preserveAspectRatioAttr = mapSvg.getAttribute('preserveAspectRatio')
                  if (preserveAspectRatioAttr) {
                    actualPreserveAspectRatio = preserveAspectRatioAttr
                  } else {
                    actualPreserveAspectRatio = 'xMidYMid meet'
                  }
                }
              }
              
              return (
                <svg
                  ref={lineSvgRef}
                  className="pointer-events-none"
                  style={{ width: '100%', height: '100%', display: 'block' }}
                  width="100%"
                  height="100%"
                  data-line-svg="true"
                  viewBox={`0 0 ${actualViewBoxWidth} ${actualViewBoxHeight}`}
                  preserveAspectRatio={actualPreserveAspectRatio}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {(() => {
                    const elements = Object.entries(studentsByRegion).map(([regionId, regionStudents]) => {
                    const region = regions.find(r => r.id === regionId)
                    if (!region) {
                      return null
                    }

                    const position = regionPositions[regionId]
                    if (!position) {
                      return null
                    }

                  const fixedSvgWidth = actualViewBoxWidth
                  const fixedSvgHeight = actualViewBoxHeight
                  
                  // 计算卡片的理论位置（与渲染时使用的值一致）
                  // 优先使用拖动中的位置（如果存在），否则使用保存的位置
                  const draggingPos = draggingPositionsRef.current[regionId]
                  const savedPos = cardPositions[regionId] || { x: 0, y: 0 }
                  const cardPos = draggingPos || savedPos
                  
                  const finalX = position.x + cardPos.x
                  const finalY = position.y + cardPos.y
                  
                  const cardContainer = document.querySelector(`[data-card-id="${regionId}"]`)
                  const storedDimensions = cardDimensions[regionId]
                  let cardWidth = storedDimensions?.width ?? DEFAULT_CARD_WIDTH_PERCENT
                  let cardHeight = storedDimensions?.height ?? DEFAULT_CARD_HEIGHT_PERCENT
                  
                  if (cardContainer && mapContainerRef.current) {
                    const innerCard = cardContainer.querySelector('[data-inner-card="true"]') as HTMLElement | null
                    if (innerCard) {
                      const innerRect = innerCard.getBoundingClientRect()
                      const containerRect = mapContainerRef.current.getBoundingClientRect()
                      if (containerRect.width > 0 && containerRect.height > 0) {
                        const measuredWidth = (innerRect.width / containerRect.width) * 100
                        const measuredHeight = (innerRect.height / containerRect.height) * 100
                        if (measuredWidth > 0 && measuredHeight > 0) {
                          cardWidth = measuredWidth
                          cardHeight = measuredHeight
                        }
                      }
                    }
                  }
                  
                  // 计算卡片边界
                  const cardLeft = finalX - cardWidth / 2
                  const cardRight = finalX + cardWidth / 2
                  const cardTop = finalY - cardHeight / 2
                  const cardBottom = finalY + cardHeight / 2
                  
                  // 获取连线终点
                  const endpoint = lineEndpoints[regionId] || { x: position.x, y: position.y }
                  const lineEndXPercent = endpoint.x
                  const lineEndYPercent = endpoint.y
                  const lineEndX = (lineEndXPercent / 100) * fixedSvgWidth
                  const lineEndY = (lineEndYPercent / 100) * fixedSvgHeight
                  
                  // 计算从卡片中心到连线终点的方向向量（百分比坐标）
                  const dxToEndpoint = lineEndXPercent - finalX
                  const dyToEndpoint = lineEndYPercent - finalY
                  
                  let lineStartPercentX = finalX
                  let lineStartPercentY = finalY

                  if (dxToEndpoint !== 0 || dyToEndpoint !== 0) {
                    const halfWidth = cardWidth / 2
                    const halfHeight = cardHeight / 2
                    
                    // Handle cases where card dimensions are not yet available
                    if (halfWidth > 0 && halfHeight > 0) {
                      if (dxToEndpoint === 0) { // Vertical line
                          lineStartPercentY += (dyToEndpoint > 0 ? 1 : -1) * halfHeight
                      } else if (dyToEndpoint === 0) { // Horizontal line
                          lineStartPercentX += (dxToEndpoint > 0 ? 1 : -1) * halfWidth
                      } else {
                          const slope = dyToEndpoint / dxToEndpoint
                          const cardDiagonalSlope = halfHeight / halfWidth

                          if (Math.abs(slope) < cardDiagonalSlope) {
                              // Intersects with left or right edge
                              const sign = (dxToEndpoint > 0 ? 1 : -1)
                              lineStartPercentX = finalX + sign * halfWidth
                              lineStartPercentY = finalY + sign * halfWidth * slope
                          } else {
                              // Intersects with top or bottom edge
                              const sign = (dyToEndpoint > 0 ? 1 : -1)
                              lineStartPercentY = finalY + sign * halfHeight
                              lineStartPercentX = finalX + sign * halfHeight / slope
                          }
                      }
                    }
                  }
                  
                  const lineStartX = (lineStartPercentX / 100) * fixedSvgWidth
                  const lineStartY = (lineStartPercentY / 100) * fixedSvgHeight
                  
                  // 获取区域颜色
                  const regionColor = getRegionColor(regionId)
                  let lineColor = regionColor
                  if (!lineColor.startsWith('#')) {
                    const colorConfig = CARD_COLORS.find(c => c.value === lineColor)
                    lineColor = colorConfig ? colorConfig.hex : '#0066FF'
                  }

                  // 调试日志：每条连线的坐标
                  const lineLength = Math.sqrt(
                    Math.pow(lineEndX - lineStartX, 2) + Math.pow(lineEndY - lineStartY, 2)
                  )
                  
                  // 检查坐标是否在 viewBox 范围内
                  const startInViewBox = lineStartX >= 0 && lineStartX <= fixedSvgWidth && lineStartY >= 0 && lineStartY <= fixedSvgHeight
                  const endInViewBox = lineEndX >= 0 && lineEndX <= fixedSvgWidth && lineEndY >= 0 && lineEndY <= fixedSvgHeight
                  const hasValidCoords = !isNaN(lineStartX) && !isNaN(lineStartY) && !isNaN(lineEndX) && !isNaN(lineEndY)
                  const willRender = lineLength > 0 && hasValidCoords && startInViewBox && endInViewBox
                  
                  // 如果坐标无效或不在 viewBox 范围内，不渲染连线
                  if (!willRender) {
                    return null
                  }

                  return (
                    <g key={regionId} data-region-line-id={regionId}>
                      <line
                        data-region-line-id={regionId}
                        x1={lineStartX}
                        y1={lineStartY}
                        x2={lineEndX}
                        y2={lineEndY}
                        stroke={lineColor}
                        strokeWidth="3"
                        strokeLinecap="butt"
                        vectorEffect="non-scaling-stroke"
                        shapeRendering="geometricPrecision"
                        strokeDasharray="none"
                        opacity="1"
                        style={{ pointerEvents: 'none' }}
                      />
                      <circle
                        data-region-line-id={regionId}
                        cx={lineStartX}
                        cy={lineStartY}
                        r="3.5"
                        fill={lineColor}
                        opacity="1"
                      />
                      <circle
                        cx={lineEndX}
                        cy={lineEndY}
                        r="4"
                        fill={lineColor}
                        opacity="1"
                      />
                    </g>
                  )
                  })
                  
                  return elements
                })()}
              </svg>
            )
            } catch (error) {
              // 即使出错也返回一个空的 SVG，确保容器存在
              return (
                <svg
                  className="pointer-events-none"
                  style={{ width: '100%', height: '100%', display: 'block' }}
                  viewBox={`0 0 ${svgViewBox.width || 1200} ${svgViewBox.height || 900}`}
                  preserveAspectRatio="xMidYMid meet"
                  xmlns="http://www.w3.org/2000/svg"
                />
              )
            }
          })()}
        </div>
      </div>

      {/* 学生信息卡片叠加层 */}
      <div className="absolute inset-0 flex items-center justify-center p-8 overflow-visible" style={{ zIndex: 30, pointerEvents: 'none' }}>
        <div
          className="w-full h-full pointer-events-none transition-transform duration-300"
          style={{ transform: `scale(${scale})` }}
        >
        {Object.entries(studentsByRegion).map(([regionId, regionStudents]) => {
          const region = regions.find(r => r.id === regionId)
          if (!region) return null

          const position = regionPositions[regionId]
          if (!position) {
            return null
          }
          
          // 优先使用拖动中的位置（如果存在），否则使用保存的位置
          const draggingPos = draggingPositionsRef.current[regionId]
          const savedPos = cardPositions[regionId] || { x: 0, y: 0 }
          const cardPos = draggingPos || savedPos
          
          const finalX = position.x + cardPos.x
          const finalY = position.y + cardPos.y
          
          const cardContainer = document.querySelector(`[data-card-id="${regionId}"]`)
          const storedDimensions = cardDimensions[regionId]
          let cardWidth = storedDimensions?.width ?? DEFAULT_CARD_WIDTH_PERCENT
          let cardHeight = storedDimensions?.height ?? DEFAULT_CARD_HEIGHT_PERCENT
          
          // 卡片渲染
          return (
            <div key={regionId}>
              {/* 卡片 */}
              <div
                data-card-id={regionId}
                className="absolute pointer-events-auto transition-all duration-300"
                style={{
                  left: `${finalX}%`,
                  top: `${finalY}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 31
                }}
              >
                {regionStudents.length >= 4 ? (
                  <div data-inner-card="true">
                    <AggregatedCard
                      count={regionStudents.length}
                      onClick={() => onShowList(region, regionStudents)}
                    />
                  </div>
                ) : (
                  <div data-inner-card="true">
                    <DraggableStudentCard
                      students={regionStudents}
                      regionName={region.name}
                      position={position}
                      onEdit={onStudentEdit}
                      onDelete={onStudentDelete}
                      onDrag={(dx, dy) => handleCardDrag(regionId, dx, dy)}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
        </div>
      </div>

      {/* 统计信息面板 - 调整位置避免遮挡地图 */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 max-w-xs pointer-events-auto z-40" style={{maxWidth: '200px'}}>
        <h3 className="font-semibold text-neutral-900 mb-2">
          {country === 'china' ? '中国' : '美国'}地图
        </h3>
        <div className="space-y-1 text-small text-neutral-700">
          <p>已添加同学: {students.length} 位</p>
          <p>覆盖地区: {Object.keys(studentsByRegion).length} 个</p>
          <p className="text-caption text-neutral-400 mt-2">点击地图区域添加或查看同学信息</p>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 pointer-events-auto z-40">
        <button onClick={handleZoomIn} className="btn-icon" title="放大">
          <ZoomIn className="w-5 h-5" />
        </button>
        <button onClick={handleZoomOut} className="btn-icon" title="缩小">
          <ZoomOut className="w-5 h-5" />
        </button>
        <button onClick={handleReset} className="btn-icon" title="重置">
          <Maximize2 className="w-5 h-5" />
        </button>
        <div className="w-full h-px bg-neutral-200 my-1" />
        <button 
          onClick={handleExport} 
          className="btn-icon" 
          title={exporting ? "正在导出..." : "导出图片"}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
          <Download className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* SVG样式 */}
      <style>{`
        svg {
          pointer-events: auto;
        }
        
        .region-path,
        path[data-region-id] {
          /* 不设置默认fill，让动态填充颜色生效 */
          stroke: #E5E5E5;
          stroke-width: 1;
          cursor: pointer;
          pointer-events: auto;
          transition: all 200ms ease-out;
        }
        
        /* 移除默认fill设置，让动态填充颜色生效 */
        /* .region-path:not([fill]),
        path[data-region-id]:not([fill]) {
          fill: transparent;
        } */
        
        /* 已有填充颜色的区域hover时保持原色，只改变描边 */
        .region-path[fill]:hover,
        path[data-region-id][fill]:hover {
          stroke: #0066FF !important;
          stroke-width: 2.5 !important;
          /* 移除filter，保持原有填充颜色 */
        }
        
        /* 未填充区域hover时显示浅蓝色 */
        .region-path:not([fill]):hover,
        path[data-region-id]:not([fill]):hover {
          fill: #E6F0FF !important;
          stroke: #0066FF !important;
          stroke-width: 2 !important;
        }
        
        ${hoveredRegion ? `
          .region-path[data-region-id="${hoveredRegion}"],
          path[data-region-id="${hoveredRegion}"] {
            fill: #E6F0FF !important;
            stroke: #0066FF !important;
            stroke-width: 2 !important;
          }
        ` : ''}
        
        // 移除CSS样式覆盖，让addRegionFillColors函数直接控制颜色
        // 颜色现在通过addRegionFillColors函数直接设置到SVG路径上
      `}</style>
    </div>
  )
}
