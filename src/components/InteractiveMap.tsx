
import { useEffect, useState, useRef, useCallback, useLayoutEffect, useMemo } from 'react'

declare global {
  interface Window {
    __mealMapForceLineRecalc?: () => Promise<void>
    __mealMapPrepareExport?: () => Promise<() => void>
    __mealMapExport?: (options?: { format?: 'png' | 'jpeg' }) => Promise<string>
  }
}
import { LocalStudent, getRegionColor, CARD_COLORS, getStyleSettings } from '@/lib/storage'
import { DraggableStudentCard, AggregatedCard } from './StudentCard'
import { ZoomIn, ZoomOut, Maximize2, Download, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'

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

  // 监听国家变化，重新从localStorage读取卡片位置，并调整初始缩放
  useEffect(() => {
    const storedPositions = getCardPositionsFromStorage(country)
    setCardPositions(storedPositions)
    // 为中国地图设置稍大的初始缩放（1.15），使其显示更大且不会被压扁
    // 美国地图保持默认缩放（1.0）
    setScale(country === 'china' ? 1.15 : 1)
  }, [country])

  useEffect(() => {
    setStyleSettings(getStyleSettings())
  }, [colorChanged])
  
  const [svgContent, setSvgContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  // 为中国地图设置稍大的初始缩放，使其显示更大且不会被压扁
  const [scale, setScale] = useState(country === 'china' ? 1.15 : 1)
  const [regionPositions, setRegionPositions] = useState<Record<string, { x: number; y: number; width?: number; height?: number }>>({})
  const [cardPositions, setCardPositions] = useState<Record<string, CardPosition>>({})
  const [svgViewBox, setSvgViewBox] = useState<{ width: number; height: number }>({ width: 1200, height: 900 })
  const [forceUpdate, setForceUpdate] = useState(0)
  const [styleSettings, setStyleSettings] = useState(getStyleSettings())
  
  // New state to hold all line data (start and end points)
  const [lineData, setLineData] = useState<Record<string, { start: { x: number; y: number }; end: { x: number; y: number } }>>({})

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const lineSvgContainerRef = useRef<HTMLDivElement>(null)
  const lineSvgRef = useRef<SVGSVGElement | null>(null)
  const lineOverlaySvgRef = useRef<SVGSVGElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // 将配置中的region ID转换为SVG中的data-region-id格式
  const regionIdToSvgId = useCallback((regionId: string): string[] => {
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
  }, [country])

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

  const convertRegionCoordsToPercent = useCallback((region: Region): { x: number; y: number } => {
    const { lat, lng } = region.coordinates
    if (country === 'china') {
      const posX = ((lng - 73) / (135 - 73)) * 100
      const posY = ((54 - lat) / (54 - 18)) * 100
      return {
        x: Math.max(0, Math.min(100, posX)),
        y: Math.max(0, Math.min(100, posY))
      }
    } else {
      const posX = ((lng + 125) / (125 - 66)) * 100
      const posY = ((50 - lat) / (50 - 24)) * 100
      return {
        x: Math.max(0, Math.min(100, posX)),
        y: Math.max(0, Math.min(100, posY))
      }
    }
  }, [country])

  // 为有学生的省份添加填充颜色 - 直接修改 SVG DOM，确保所有路径都被覆盖
  const applyRegionFillColors = useCallback((
    svgElement: SVGSVGElement,
    studentsByRegion: Record<string, LocalStudent[]>,
    regions: Region[]
  ) => {
    const defaultFill = styleSettings.emptyRegionColor || '#cccccc'

    const applyFillToPath = (pathElement: SVGPathElement, color: string) => {
      if (!pathElement) return
      pathElement.setAttribute('fill', color)
      pathElement.style.setProperty('fill', color)
      pathElement.style.setProperty('fill-opacity', '1')
      pathElement.removeAttribute('fill-opacity')
      pathElement.removeAttribute('opacity')
      pathElement.style.removeProperty('opacity')
    }

    svgElement.querySelectorAll('path[data-region-id]').forEach(path => {
      applyFillToPath(path as SVGPathElement, defaultFill)
    })

    Object.entries(studentsByRegion).forEach(([regionId]) => {
      const region = regions.find(r => r.id === regionId)
      if (!region) return

      let fillColor = getRegionColor(regionId)
      if (!fillColor.startsWith('#')) {
        const preset = CARD_COLORS.find(c => c.value === fillColor)
        fillColor = preset ? preset.hex : fillColor
      }

      const candidateIds = regionIdToSvgId(regionId)
      let applied = false

      for (const candidate of candidateIds) {
        const dataRegionPath = svgElement.querySelector(`path[data-region-id="${candidate}"]`) as SVGPathElement | null
        if (dataRegionPath) {
          applyFillToPath(dataRegionPath, fillColor)
          applied = true
        }
        const idPath = svgElement.querySelector(`path[id="${candidate}"]`) as SVGPathElement | null
        if (idPath) {
          applyFillToPath(idPath, fillColor)
          applied = true
        }
      }

      if (!applied) {
        const fallbackPaths = Array.from(svgElement.querySelectorAll('path[data-region-name]')) as SVGPathElement[]
        const target = fallbackPaths.find(path => {
          const regionName = path.getAttribute('data-region-name')
          const regionIdAttr = path.getAttribute('data-region-id') || ''
          return (
            regionName === region.name_en ||
            regionIdAttr === region.id ||
            regionIdAttr?.replace('CN-', '') === region.id.replace('CN-', '') ||
            regionIdAttr?.replace('US-', '') === region.id.replace('US-', '')
          )
        })
        if (target) {
          applyFillToPath(target, fillColor)
        }
      }
    })
  }, [styleSettings.emptyRegionColor, regionIdToSvgId])

  const loadCombinedSVG = async () => {
    try {
      const fileName = country === 'china' ? 'china-combined.svg' : 'usa-combined.svg'
      // 使用 import.meta.env.BASE_URL 确保在 GitHub Pages 子路径下也能正确加载
      const baseUrl = import.meta.env.BASE_URL || '/'
      const filePath = `${baseUrl}maps/${fileName}`
      
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
      let originalViewBoxHeight = 900
      
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
      // 使用 meet 保持完整显示，xMidYMid 居中显示
      if (!svgElement.getAttribute('preserveAspectRatio')) {
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      }

      // 用于检测点是否位于路径内部的画布
      const helperCanvas = document.createElement('canvas')
      helperCanvas.width = originalViewBoxWidth
      helperCanvas.height = originalViewBoxHeight
      const helperCtx = helperCanvas.getContext('2d')

      const findPointInsidePath = (
        pathData: string,
        bounds: { minX: number; maxX: number; minY: number; maxY: number }
      ): { x: number; y: number } | null => {
        if (!helperCtx || !pathData) return null
        try {
          const path2d = new Path2D(pathData)
          const { minX, maxX, minY, maxY } = bounds
          const width = maxX - minX
          const height = maxY - minY

          const clampPoint = (x: number, y: number) => ({
            x: Math.max(minX, Math.min(maxX, x)),
            y: Math.max(minY, Math.min(maxY, y))
          })

          const centerX = (minX + maxX) / 2
          const centerY = (minY + maxY) / 2
          const candidates: { x: number; y: number }[] = [
            { x: centerX, y: centerY },
            { x: centerX, y: centerY - height * 0.06 },
            { x: centerX, y: centerY + height * 0.06 },
            { x: centerX - width * 0.06, y: centerY },
            { x: centerX + width * 0.06, y: centerY }
          ]

          const ratios = [0.3, 0.45, 0.6, 0.75]
          ratios.forEach(rx => {
            ratios.forEach(ry => {
              candidates.push({
                x: minX + width * rx,
                y: minY + height * ry
              })
            })
          })

          for (const candidate of candidates) {
            const point = clampPoint(candidate.x, candidate.y)
            if (helperCtx.isPointInPath(path2d, point.x, point.y)) {
              return point
            }
          }
        } catch (error) {
          return null
        }
        return null
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
              const coords: { x: number; y: number }[] = []
              // 匹配所有数字对（包括负数和小数）
              const numberPairs = pathData.match(/(-?\d+\.?\d*)[\s,]+(-?\d+\.?\d*)/g) || []
              
              numberPairs.forEach(pair => {
                const match = pair.match(/(-?\d+\.?\d*)[\s,]+(-?\d+\.?\d*)/)
                if (match) {
                  const x = parseFloat(match[1])
                  const y = parseFloat(match[2])
                  // 只添加有效的坐标（在合理范围内）
                  if (!isNaN(x) && !isNaN(y) && x >= 0 && x <= originalViewBoxWidth && y >= 0 && y <= originalViewBoxHeight) {
                    coords.push({ x, y })
                  }
                }
              })
              
              if (coords.length > 0) {
                // 计算所有坐标的边界框
                let minX = coords[0].x
                let maxX = coords[0].x
                let minY = coords[0].y
                let maxY = coords[0].y
                
                coords.forEach(point => {
                  minX = Math.min(minX, point.x)
                  maxX = Math.max(maxX, point.x)
                  minY = Math.min(minY, point.y)
                  maxY = Math.max(maxY, point.y)
                })
                
                const centerX = (minX + maxX) / 2
                const centerY = (minY + maxY) / 2
                const width = maxX - minX
                const height = maxY - minY

                const offsetY = Math.min(height * 0.12, originalViewBoxHeight * 0.02)
                const bounds = { minX, maxX, minY, maxY }
                const interiorPoint = findPointInsidePath(pathData, bounds)

                let fallbackX = centerX
                let fallbackY = centerY - offsetY
                const centroidX = coords.reduce((sum, p) => sum + p.x, 0) / coords.length
                const centroidY = coords.reduce((sum, p) => sum + p.y, 0) / coords.length
                fallbackX = fallbackX * 0.6 + centroidX * 0.4
                fallbackY = fallbackY * 0.6 + centroidY * 0.4

                let finalX = Math.max(minX + width * 0.12, Math.min(maxX - width * 0.12, fallbackX))
                let finalY = Math.max(minY + height * 0.12, Math.min(maxY - height * 0.12, fallbackY))

                if (interiorPoint) {
                  finalX = interiorPoint.x
                  finalY = interiorPoint.y
                }

                finalX = Math.max(minX, Math.min(maxX, finalX))
                finalY = Math.max(minY, Math.min(maxY, finalY))
                
                // 计算边界框的宽度和高度（百分比）
                const boxWidth = (width / originalViewBoxWidth) * 100
                const boxHeight = (height / originalViewBoxHeight) * 100
                
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
          const geoPercent = convertRegionCoordsToPercent(region)
          centerPoint = {
            x: geoPercent.x,
            y: geoPercent.y,
            width: 4.0,
            height: 4.0
          }
        }
        
        positions[region.id] = centerPoint
      })
      
      setRegionPositions(positions)
      
      // 在序列化之前应用地区填充颜色
      applyRegionFillColors(svgElement, studentsByRegion, regions)

      // 序列化SVG
      const serializer = new XMLSerializer()
      const finalSvgText = serializer.serializeToString(svgElement)
      
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

  const triggerForceUpdate = useCallback(() => {
    setForceUpdate(prev => prev + 1);
  }, []);

  // 处理SVG交互
  useEffect(() => {
    const svgContainer = svgContainerRef.current;
    if (!svgContainer) return;

    const handleClick = (e: Event) => {
        const target = e.currentTarget as SVGPathElement; // currentTarget is the path itself
        const regionId = target.getAttribute('data-region-id');

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
    };

    const handleHover = (e: Event) => {
        const target = e.currentTarget as SVGPathElement;
        setHoveredRegion(target.getAttribute('data-region-id'));
    };

    const handleLeave = () => {
        setHoveredRegion(null);
    };

    const paths = svgContainer.querySelectorAll('path[data-region-id]');
    
    paths.forEach(path => {
        path.addEventListener('click', handleClick);
        path.addEventListener('mouseover', handleHover);
        path.addEventListener('mouseout', handleLeave);
    });

    return () => {
        paths.forEach(path => {
            path.removeEventListener('click', handleClick);
            path.removeEventListener('mouseover', handleHover);
            path.removeEventListener('mouseout', handleLeave);
        });
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
  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const latestCardPositionsRef = useRef<Record<string, CardPosition>>(cardPositions)
  const draggingLoopRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)
  
  // 同步 baseCardPositionsRef 和 cardPositions
  useEffect(() => {
    baseCardPositionsRef.current = { ...cardPositions }
    latestCardPositionsRef.current = cardPositions
  }, [cardPositions])

  const calculateLineData = useCallback((overridePositions?: Record<string, CardPosition>) => {
    if (Object.keys(studentsByRegion).length === 0 || Object.keys(regionPositions).length === 0) {
      setLineData({})
      return
    }
    
    const overlaySvg = lineOverlaySvgRef.current
    if (!overlaySvg) {
      setLineData({})
      return
    }
    
    const viewBoxWidth = svgViewBox.width || 1200
    const viewBoxHeight = svgViewBox.height || 900
    
    const ctm = overlaySvg.getScreenCTM()
    if (!ctm) return
    const ctmInverse = ctm.inverse()
    
    const screenPointToOverlay = (point: { x: number; y: number }) => {
      const svgPoint = overlaySvg.createSVGPoint()
      svgPoint.x = point.x
      svgPoint.y = point.y
      const transformed = svgPoint.matrixTransform(ctmInverse)
      return { x: transformed.x, y: transformed.y }
    }
    
    const overlayPointToScreen = (point: { x: number; y: number }) => {
      const svgPoint = overlaySvg.createSVGPoint()
      svgPoint.x = point.x
      svgPoint.y = point.y
      const transformed = svgPoint.matrixTransform(ctm)
      return { x: transformed.x, y: transformed.y }
    }
    
    const newLineData: Record<string, { start: { x: number; y: number }; end: { x: number; y: number } }> = {}
    const currentCardPositions = overridePositions || latestCardPositionsRef.current

    Object.entries(studentsByRegion).forEach(([regionId, regionStudents]) => {
      if (!regionStudents || regionStudents.length === 0) return
      
      const position = regionPositions[regionId]
      const cardRef = cardRefs.current.get(regionId)
      if (!position || !cardRef) return
      
      const innerCard = cardRef.querySelector('[data-inner-card="true"]') as HTMLElement | null
      const activeCard = innerCard || cardRef
      const cardRect = activeCard.getBoundingClientRect()
      if (cardRect.width === 0 || cardRect.height === 0) return
      
      const regionOverlayPoint = {
        x: (position.x / 100) * viewBoxWidth,
        y: (position.y / 100) * viewBoxHeight
      }
      
      const cardPos = currentCardPositions[regionId] || { x: 0, y: 0 }
      
      const cardCenter = {
        x: cardRect.left + cardRect.width / 2,
        y: cardRect.top + cardRect.height / 2
      }
      
      const regionScreenPoint = overlayPointToScreen(regionOverlayPoint)

      const dx = regionScreenPoint.x - cardCenter.x
      const dy = regionScreenPoint.y - cardCenter.y

      let lineStartX = cardCenter.x
      let lineStartY = cardCenter.y
      
      if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) {
        const intersections: { x: number; y: number }[] = []
        
        if (Math.abs(dy) > 1e-6) {
          let t = (cardRect.top - cardCenter.y) / dy
          if (t >= 0 && t <= 1) {
            const x = cardCenter.x + t * dx
            if (x >= cardRect.left && x <= cardRect.right) intersections.push({ x, y: cardRect.top })
          }
          t = (cardRect.bottom - cardCenter.y) / dy
          if (t >= 0 && t <= 1) {
            const x = cardCenter.x + t * dx
            if (x >= cardRect.left && x <= cardRect.right) intersections.push({ x, y: cardRect.bottom })
          }
        }
        
        if (Math.abs(dx) > 1e-6) {
          let t = (cardRect.left - cardCenter.x) / dx
          if (t >= 0 && t <= 1) {
            const y = cardCenter.y + t * dy
            if (y >= cardRect.top && y <= cardRect.bottom) intersections.push({ x: cardRect.left, y })
          }
          t = (cardRect.right - cardCenter.x) / dx
          if (t >= 0 && t <= 1) {
            const y = cardCenter.y + t * dy
            if (y >= cardRect.top && y <= cardRect.bottom) intersections.push({ x: cardRect.right, y })
          }
        }
        
        if (intersections.length > 0) {
          const closestPoint = intersections.reduce(
            (closest, p) => {
              const dist = Math.pow(p.x - regionScreenPoint.x, 2) + Math.pow(p.y - regionScreenPoint.y, 2)
              return dist < closest.dist ? { dist, point: p } : closest
            },
            { dist: Infinity, point: intersections[0] }
          ).point
          lineStartX = closestPoint.x
          lineStartY = closestPoint.y
        }
      }
      
      const startSvgPoint = screenPointToOverlay({ x: lineStartX, y: lineStartY })
      const endSvgPoint = regionOverlayPoint
      
      newLineData[regionId] = {
        start: startSvgPoint,
        end: endSvgPoint
      }
    })
    
    setLineData(newLineData)
  }, [regionPositions, studentsByRegion, svgViewBox])
 
  const ensureDraggingLoop = useCallback(() => {
    if (draggingLoopRef.current !== null) return
    const loop = () => {
      if (!isDraggingRef.current) {
        draggingLoopRef.current = null
        return
      }
      calculateLineData(latestCardPositionsRef.current)
      draggingLoopRef.current = requestAnimationFrame(loop)
    }
    draggingLoopRef.current = requestAnimationFrame(loop)
  }, [calculateLineData])

  useEffect(() => {
    window.__mealMapForceLineRecalc = () =>
      new Promise<void>((resolve) => {
        calculateLineData(latestCardPositionsRef.current)
        requestAnimationFrame(() => resolve())
      })
    return () => {
      delete window.__mealMapForceLineRecalc
    }
  }, [calculateLineData])

  useEffect(() => {
      window.__mealMapPrepareExport = async () => {
        const container = mapContainerRef.current
        if (!container) {
          return () => {}
        }

        const layers = Array.from(container.querySelectorAll<HTMLElement>('[data-export-scale-layer]'))
        const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-card-id]'))
        const containerRect = container.getBoundingClientRect()

        let minLeft = containerRect.left
        let minTop = containerRect.top
        let maxRight = containerRect.right
        let maxBottom = containerRect.bottom

        layers.forEach(layer => {
          const rect = layer.getBoundingClientRect()
          minLeft = Math.min(minLeft, rect.left)
          minTop = Math.min(minTop, rect.top)
          maxRight = Math.max(maxRight, rect.right)
          maxBottom = Math.max(maxBottom, rect.bottom)
        })

        cards.forEach(card => {
          const rect = card.getBoundingClientRect()
          minLeft = Math.min(minLeft, rect.left)
          minTop = Math.min(minTop, rect.top)
          maxRight = Math.max(maxRight, rect.right)
          maxBottom = Math.max(maxBottom, rect.bottom)
        })

        const paddingLeft = Math.ceil(Math.max(16, containerRect.left - minLeft + 16))
        const paddingTop = Math.ceil(Math.max(16, containerRect.top - minTop + 16))
        const paddingRight = Math.ceil(Math.max(16, maxRight - containerRect.right + 16))
        const paddingBottom = Math.ceil(Math.max(16, maxBottom - containerRect.bottom + 16))

        const exportWidth = containerRect.width + paddingLeft + paddingRight
        const exportHeight = containerRect.height + paddingTop + paddingBottom

        const captureLeft = Math.floor(minLeft) - paddingLeft
        const captureTop = Math.floor(minTop) - paddingTop
        const captureRight = Math.ceil(maxRight) + paddingRight
        const captureBottom = Math.ceil(maxBottom) + paddingBottom
        const captureWidth = captureRight - captureLeft
        const captureHeight = captureBottom - captureTop
        const extraMargin = 48
        const finalCaptureLeft = captureLeft - extraMargin
        const finalCaptureTop = captureTop - extraMargin
        const finalCaptureWidth = captureWidth + extraMargin * 2
        const finalCaptureHeight = captureHeight + extraMargin * 2

        container.dataset.exportWidthPx = `${exportWidth}`
        container.dataset.exportHeightPx = `${exportHeight}`
        container.dataset.exportPaddingLeftPx = `${paddingLeft}`
        container.dataset.exportPaddingRightPx = `${paddingRight}`
        container.dataset.exportPaddingTopPx = `${paddingTop}`
        container.dataset.exportPaddingBottomPx = `${paddingBottom}`
        container.dataset.exportBoundsLeftPx = `${finalCaptureLeft}`
        container.dataset.exportBoundsTopPx = `${finalCaptureTop}`
        container.dataset.exportBoundsWidthPx = `${finalCaptureWidth}`
        container.dataset.exportBoundsHeightPx = `${finalCaptureHeight}`

        layers.forEach(layer => {
          const rect = layer.getBoundingClientRect()
          const offsetParent = layer.offsetParent as HTMLElement | null
          let offsetLeft = 0
          let offsetTop = 0
          if (offsetParent) {
            const parentRect = offsetParent.getBoundingClientRect()
            offsetLeft = parentRect.left
            offsetTop = parentRect.top
          }
          layer.dataset.exportWidthPx = `${rect.width}`
          layer.dataset.exportHeightPx = `${rect.height}`
          layer.dataset.exportLeftPx = `${rect.left - offsetLeft}`
          layer.dataset.exportTopPx = `${rect.top - offsetTop}`
          layer.dataset.exportTransition = layer.style.transition || ''
          layer.style.transition = 'none'
        })

      cards.forEach(card => {
        const cardRect = card.getBoundingClientRect()
        card.dataset.exportLeftPx = `${cardRect.left - containerRect.left}`
        card.dataset.exportTopPx = `${cardRect.top - containerRect.top}`
        card.dataset.exportWidthPx = `${cardRect.width}`
        card.dataset.exportHeightPx = `${cardRect.height}`
        card.dataset.exportTransition = card.style.transition || ''
        card.dataset.exportWillChange = card.style.willChange || ''
        card.style.transition = 'none'
      })

      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      if (window.__mealMapForceLineRecalc) {
        await window.__mealMapForceLineRecalc()
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      }

      return () => {
        cards.forEach(card => {
          delete card.dataset.exportLeftPx
          delete card.dataset.exportTopPx
          delete card.dataset.exportWidthPx
          delete card.dataset.exportHeightPx
          const originalTransition = card.dataset.exportTransition || ''
          card.style.transition = originalTransition
          delete card.dataset.exportTransition
          delete card.dataset.exportWillChange
        })
        layers.forEach(layer => {
          const originalTransition = layer.dataset.exportTransition || ''
          layer.style.transition = originalTransition
          delete layer.dataset.exportTransition
          delete layer.dataset.exportLeftPx
          delete layer.dataset.exportTopPx
        })
        delete container.dataset.exportWidthPx
        delete container.dataset.exportHeightPx
        delete container.dataset.exportPaddingLeftPx
        delete container.dataset.exportPaddingRightPx
        delete container.dataset.exportPaddingTopPx
        delete container.dataset.exportPaddingBottomPx
        delete container.dataset.exportBoundsLeftPx
        delete container.dataset.exportBoundsTopPx
        delete container.dataset.exportBoundsWidthPx
        delete container.dataset.exportBoundsHeightPx
      }
    }
    return () => {
      delete window.__mealMapPrepareExport
    }
  }, [calculateLineData])

  const scheduleImmediateRecalc = useCallback((overridePositions?: Record<string, CardPosition>) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      calculateLineData(overridePositions)
    })
  }, [calculateLineData])


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
      const currentPositions = latestCardPositionsRef.current
      const newPositions = {
        ...currentPositions,
        [regionId]: newPosition
      }
      
      draggingPositionsRef.current[regionId] = newPosition
      baseCardPositionsRef.current[regionId] = newPosition
      latestCardPositionsRef.current = newPositions
      isDraggingRef.current = true
      
      setCardPositions(newPositions)
      
      scheduleImmediateRecalc(newPositions)
      ensureDraggingLoop()
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveCardPositionsToStorage(country, newPositions)
      }, 300)
    }
  }, [country, regionPositions, calculateLineData, scheduleImmediateRecalc, ensureDraggingLoop])

  useEffect(() => {
    if (students.length === 0) {
      setLineData({})
      return
    }
    
    const timeoutId = setTimeout(() => {
      calculateLineData()
    }, 60)
    
    return () => clearTimeout(timeoutId)
  }, [students, calculateLineData])

  useEffect(() => {
    if (students.length === 0) return
    const recalc = () => calculateLineData()
    
    const schedule = () => requestAnimationFrame(recalc)
    
    schedule()
    schedule()
    schedule()
    
    const resizeListener = () => schedule()
    window.addEventListener('resize', resizeListener)
    
    const observer = new ResizeObserver(() => schedule())
    if (lineSvgContainerRef.current) {
      observer.observe(lineSvgContainerRef.current)
    }
    
    return () => {
      window.removeEventListener('resize', resizeListener)
      observer.disconnect()
    }
  }, [cardPositions, regionPositions, scale, svgViewBox, calculateLineData, students.length])

  useEffect(() => {
    const handleMouseUp = () => {
      isDraggingRef.current = false
      calculateLineData(latestCardPositionsRef.current)
    }
    const handleMouseMove = () => scheduleImmediateRecalc()
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [calculateLineData, scheduleImmediateRecalc])

  // 缩放控制
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))
  const handleReset = () => setScale(country === 'china' ? 1.15 : 1)

  const exportMap = useCallback(
    async (options?: { format?: 'png' | 'jpeg' }): Promise<string> => {
      if (!mapContainerRef.current) {
        throw new Error('地图容器未准备好')
      }

      const format = options?.format ?? 'png'
      let cleanup: (() => void) | undefined

      try {
        if (window.__mealMapPrepareExport) {
          cleanup = await window.__mealMapPrepareExport()
        } else if (window.__mealMapForceLineRecalc) {
          await window.__mealMapForceLineRecalc()
          await new Promise(resolve =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
        }

        const originalContainer = mapContainerRef.current
        const exportTarget = originalContainer.cloneNode(true) as HTMLElement
        exportTarget.style.position = 'fixed'
        exportTarget.style.top = '0'
        exportTarget.style.left = '0'
        exportTarget.style.pointerEvents = 'none'
        exportTarget.style.zIndex = '-1'
        exportTarget.style.visibility = 'visible'
        exportTarget.style.opacity = '1'
        exportTarget.style.boxSizing = 'border-box'
        exportTarget.setAttribute('data-export-temp', 'true')

        const applyExportStyles = (root: HTMLElement) => {
          const exportWidth = Number(root.getAttribute('data-export-width-px') || '') || root.getBoundingClientRect().width
          const exportHeight = Number(root.getAttribute('data-export-height-px') || '') || root.getBoundingClientRect().height
          const paddingLeft = Number(root.getAttribute('data-export-padding-left-px') || '') || 0
          const paddingRight = Number(root.getAttribute('data-export-padding-right-px') || '') || 0
          const paddingTop = Number(root.getAttribute('data-export-padding-top-px') || '') || 0
          const paddingBottom = Number(root.getAttribute('data-export-padding-bottom-px') || '') || 0

          root.style.width = `${exportWidth}px`
          root.style.height = `${exportHeight}px`
          root.style.paddingLeft = `${paddingLeft}px`
          root.style.paddingRight = `${paddingRight}px`
          root.style.paddingTop = `${paddingTop}px`
          root.style.paddingBottom = `${paddingBottom}px`
          root.style.overflow = 'visible'
          root.style.maxWidth = 'none'
          root.style.maxHeight = 'none'

          root.querySelectorAll('[data-export-ignore]').forEach(el => el.remove())
        }

        applyExportStyles(exportTarget)
        document.body.appendChild(exportTarget)
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))

        const canvas = await html2canvas(exportTarget, {
          backgroundColor: styleSettings.canvasBackgroundColor || '#f5f5f5',
          scale: window.devicePixelRatio * 2,
          logging: false,
          useCORS: true,
          allowTaint: false,
          foreignObjectRendering: true,
          scrollX: 0,
          scrollY: 0
        })

        const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
        const dataUrl = canvas.toDataURL(mime)
        document.body.removeChild(exportTarget)
        return dataUrl
      } finally {
        cleanup?.()
        scheduleImmediateRecalc()
      }
    },
    [scheduleImmediateRecalc, styleSettings.canvasBackgroundColor]
  )

  // 导出当前视图为图片
  const handleExport = useCallback(async () => {
    if (!mapContainerRef.current) return
    setExporting(true)

    try {
      const dataUrl = await exportMap({ format: 'png' })
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().split('T')[0]
      link.download = `${country === 'china' ? '中国' : '美国'}-蹭饭地图-${timestamp}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error(error)
      alert('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }, [country, exportMap])

  // 把导出函数挂到 window 上，供 ExportModal 调用
  useEffect(() => {
    window.__mealMapExport = exportMap
    return () => {
      delete window.__mealMapExport
    }
  }, [exportMap])

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
    <div
      ref={mapContainerRef}
      data-map-container
      className="relative w-full h-full overflow-hidden bg-neutral-50"
      style={{ backgroundColor: styleSettings.canvasBackgroundColor }}
    >
      {/* 地图和连线统一SVG容器 */}
      <div className="absolute inset-0 flex items-center justify-center p-8" style={{ zIndex: 10 }}>
        <div
          ref={svgContainerRef}
          data-export="true"
          data-export-scale-layer
          className="w-full h-full transition-transform duration-300"
          style={{ transform: `scale(${scale})` }}
        >
          {svgContent && (
            <svg
              ref={lineSvgRef}
              className="w-full h-full"
              viewBox={`0 0 ${svgViewBox.width || 1200} ${svgViewBox.height || 900}`}
              preserveAspectRatio="xMidYMid meet"
              dangerouslySetInnerHTML={{
                __html: `
                  ${svgContent.replace(/<\/?svg[^>]*>/g, "")}
                `
              }}
            />
          )}
        </div>
      </div>

      {/* 连线叠加层 */}
      <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none" style={{ zIndex: 20 }}>
        <div
          ref={lineSvgContainerRef}
          className="w-full h-full transition-transform duration-300"
          data-export-scale-layer
          style={{ transform: `scale(${scale})`, pointerEvents: 'none' }}
        >
          <svg
            ref={lineOverlaySvgRef}
            className="w-full h-full"
            viewBox={`0 0 ${svgViewBox.width || 1200} ${svgViewBox.height || 900}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ pointerEvents: 'none' }}
          >
            {Object.entries(lineData).map(([regionId, line]) => {
              const regionColor = getRegionColor(regionId)
              const lineColor = CARD_COLORS.find(c => c.value === regionColor)?.hex || regionColor
              return (
                <g key={regionId} data-region-line-id={regionId} style={{ pointerEvents: 'none' }}>
                  <line
                    x1={line.start.x}
                    y1={line.start.y}
                    x2={line.end.x}
                    y2={line.end.y}
                    stroke={lineColor}
                    strokeWidth={3}
                    strokeLinecap="butt"
                    pointerEvents="none"
                  />
                  <circle cx={line.start.x} cy={line.start.y} r={3.5} fill={lineColor} pointerEvents="none" />
                  <circle cx={line.end.x} cy={line.end.y} r={4} fill={lineColor} pointerEvents="none" />
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* 学生信息卡片叠加层 */}
      <div className="absolute inset-0 flex items-center justify-center p-8 overflow-visible" style={{ zIndex: 30, pointerEvents: 'none' }}>
        <div
          className="w-full h-full pointer-events-none transition-transform duration-300"
          data-export-scale-layer
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
          
          let cardWidth = DEFAULT_CARD_WIDTH_PERCENT
          let cardHeight = DEFAULT_CARD_HEIGHT_PERCENT
          
          // 卡片渲染
          return (
            <div
              key={regionId}
              ref={el => cardRefs.current.set(regionId, el)}
              data-card-id={regionId}
              className="absolute pointer-events-auto transition-all duration-300"
              style={{
                left: `${finalX}%`,
                top: `${finalY}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 31,
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
      <div
        data-export-ignore
        className="absolute bottom-6 right-6 flex flex-col gap-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 pointer-events-auto z-40"
      >
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
      `}</style>
    </div>
  )
}
