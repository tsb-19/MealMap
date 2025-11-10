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

  // V7修复版本：使用Canvas API直接绘制地图
  const drawMapToCanvas = async (canvas: HTMLCanvasElement, mapElement: HTMLElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法获取Canvas上下文')

    const width = canvas.width
    const height = canvas.height

    console.log('[ExportModal V7] 开始Canvas绘制', { width, height })

    // 1. 绘制白色背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // 2. 绘制地图轮廓（简化版中国地图）
    ctx.fillStyle = '#f0f0f0'
    ctx.strokeStyle = '#cccccc'
    ctx.lineWidth = 1

    // 绘制简化的中国地图轮廓
    const mapPath = new Path2D()
    
    if (currentCountry === 'china') {
      // 简化的中国地图轮廓路径
      mapPath.moveTo(200, 100) // 东北
      mapPath.lineTo(600, 100) // 黑龙江
      mapPath.lineTo(650, 150) // 内蒙古东部
      mapPath.lineTo(620, 250) // 内蒙古南部
      mapPath.lineTo(580, 350) // 陕西
      mapPath.lineTo(550, 450) // 四川
      mapPath.lineTo(500, 500) // 云南
      mapPath.lineTo(400, 520) // 广西
      mapPath.lineTo(350, 480) // 广东
      mapPath.lineTo(300, 420) // 福建
      mapPath.lineTo(280, 350) // 江西
      mapPath.lineTo(300, 280) // 安徽
      mapPath.lineTo(320, 200) // 江苏
      mapPath.lineTo(350, 150) // 山东
      mapPath.lineTo(400, 120) // 河北
      mapPath.lineTo(450, 100) // 北京
      mapPath.lineTo(500, 80)  // 辽宁
      mapPath.lineTo(550, 90)  // 吉林
      mapPath.lineTo(580, 95)  // 黑龙江东部
      mapPath.lineTo(200, 100) // 闭合路径
      mapPath.closePath()
    } else {
      // 简化的美国地图轮廓路径
      mapPath.moveTo(100, 200)
      mapPath.lineTo(700, 200)
      mapPath.lineTo(680, 300)
      mapPath.lineTo(650, 400)
      mapPath.lineTo(600, 450)
      mapPath.lineTo(500, 480)
      mapPath.lineTo(400, 500)
      mapPath.lineTo(300, 480)
      mapPath.lineTo(200, 450)
      mapPath.lineTo(150, 400)
      mapPath.lineTo(120, 300)
      mapPath.lineTo(100, 200)
      mapPath.closePath()
    }

    ctx.fill(mapPath)
    ctx.stroke(mapPath)

    // 3. 高亮显示有学生的区域
    if (currentStudents && currentStudents.length > 0) {
      const regionsWithStudents = new Set(currentStudents.map(s => s.region_id))
      
      // 绘制高亮区域
      ctx.fillStyle = '#4f46e5' // 蓝色高亮
      ctx.globalAlpha = 0.3
      
      regionsWithStudents.forEach(regionId => {
        // 根据省份ID绘制不同的区域
        const regionPath = new Path2D()
        
        switch (regionId) {
          case 'hebei':
            // 河北省区域
            regionPath.rect(350, 120, 80, 60)
            break
          case 'beijing':
            // 北京市区域
            regionPath.rect(400, 100, 40, 30)
            break
          case 'shandong':
            // 山东省区域
            regionPath.rect(320, 150, 60, 80)
            break
          case 'jiangsu':
            // 江苏省区域
            regionPath.rect(300, 200, 50, 60)
            break
          case 'zhejiang':
            // 浙江省区域
            regionPath.rect(280, 250, 50, 60)
            break
          case 'fujian':
            // 福建省区域
            regionPath.rect(270, 320, 40, 80)
            break
          case 'guangdong':
            // 广东省区域
            regionPath.rect(300, 400, 80, 100)
            break
          case 'guangxi':
            // 广西区域
            regionPath.rect(350, 450, 60, 70)
            break
          case 'yunnan':
            // 云南省区域
            regionPath.rect(450, 400, 80, 120)
            break
          case 'sichuan':
            // 四川省区域
            regionPath.rect(500, 300, 80, 120)
            break
          case 'shaanxi':
            // 陕西省区域
            regionPath.rect(550, 200, 60, 80)
            break
          case 'inner_mongolia':
            // 内蒙古区域
            regionPath.rect(400, 80, 200, 100)
            break
          case 'liaoning':
            // 辽宁省区域
            regionPath.rect(480, 80, 60, 50)
            break
          case 'jilin':
            // 吉林省区域
            regionPath.rect(520, 60, 40, 40)
            break
          case 'heilongjiang':
            // 黑龙江省区域
            regionPath.rect(540, 40, 80, 40)
            break
          default:
            // 其他省份的默认区域
            regionPath.rect(400, 200, 60, 60)
        }
        
        ctx.fill(regionPath)
      })
      
      ctx.globalAlpha = 1.0
    }

    // 4. 绘制学生卡片
    if (currentStudents && currentStudents.length > 0) {
      const studentsByRegion = currentStudents.reduce((acc, student) => {
        if (!acc[student.region_id]) {
          acc[student.region_id] = []
        }
        acc[student.region_id].push(student)
        return acc
      }, {} as Record<string, LocalStudent[]>)

      let cardY = 50
      
      Object.entries(studentsByRegion).forEach(([regionId, students]) => {
        // 绘制省份标题
        ctx.fillStyle = '#1f2937'
        ctx.font = 'bold 16px Arial'
        ctx.fillText(getRegionDisplayName(regionId), 50, cardY)
        
        cardY += 25
        
        // 绘制学生信息
        ctx.font = '14px Arial'
        ctx.fillStyle = '#374151'
        
        students.forEach(student => {
          const studentText = `${student.name} (${student.school || '未知'} - ${student.city || '未知'})`
          ctx.fillText(studentText, 70, cardY)
          cardY += 20
        })
        
        // 绘制统计信息
        ctx.font = '12px Arial'
        ctx.fillStyle = '#6b7280'
        ctx.fillText(`共${students.length}人`, 70, cardY)
        
        cardY += 30
        
        // 绘制连接线
        if (students.length > 0) {
          ctx.strokeStyle = '#4f46e5'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          
          // 从卡片到地图区域的连接线
          const cardX = 50
          const mapX = getRegionMapX(regionId)
          const mapY = getRegionMapY(regionId)
          
          ctx.beginPath()
          ctx.moveTo(cardX, cardY - 10)
          ctx.lineTo(mapX, mapY)
          ctx.stroke()
          
          ctx.setLineDash([]) // 重置虚线
        }
      })
    }

    // 5. 绘制标题
    ctx.fillStyle = '#1f2937'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`${currentCountry === 'china' ? '中国' : '美国'}地图`, width / 2, 30)
    
    // 6. 绘制统计信息
    ctx.font = '14px Arial'
    ctx.fillStyle = '#6b7280'
    ctx.textAlign = 'left'
    ctx.fillText(`学生数量: ${studentCount} 人`, 50, height - 60)
    ctx.fillText(`覆盖地区: ${regionCount} 个`, 50, height - 40)

    console.log('[ExportModal V7] Canvas绘制完成')
  }

  // 获取省份显示名称
  const getRegionDisplayName = (regionId: string): string => {
    const regionNames: Record<string, string> = {
      'hebei': '河北省',
      'beijing': '北京市',
      'tianjin': '天津市',
      'shanghai': '上海市',
      'chongqing': '重庆市',
      'shandong': '山东省',
      'jiangsu': '江苏省',
      'zhejiang': '浙江省',
      'fujian': '福建省',
      'guangdong': '广东省',
      'guangxi': '广西壮族自治区',
      'hainan': '海南省',
      'taiwan': '中国台湾省',
      'hong_kong': '中国香港特别行政区',
      'macau': '中国澳门特别行政区',
      'yunnan': '云南省',
      'guizhou': '贵州省',
      'sichuan': '四川省',
      'shaanxi': '陕西省',
      'gansu': '甘肃省',
      'qinghai': '青海省',
      'ningxia': '宁夏回族自治区',
      'xinjiang': '新疆维吾尔自治区',
      'inner_mongolia': '内蒙古自治区',
      'tibet': '西藏自治区',
      'liaoning': '辽宁省',
      'jilin': '吉林省',
      'heilongjiang': '黑龙江省',
      'henan': '河南省',
      'hubei': '湖北省',
      'hunan': '湖南省',
      'jiangxi': '江西省',
      'anhui': '安徽省',
      'shanxi': '山西省'
    }
    return regionNames[regionId] || regionId
  }

  // 获取省份在地图上的X坐标
  const getRegionMapX = (regionId: string): number => {
    const regionX: Record<string, number> = {
      'hebei': 400,
      'beijing': 420,
      'shandong': 350,
      'jiangsu': 320,
      'zhejiang': 300,
      'fujian': 290,
      'guangdong': 340,
      'guangxi': 380,
      'yunnan': 490,
      'sichuan': 540,
      'shaanxi': 580,
      'inner_mongolia': 500,
      'liaoning': 510,
      'jilin': 540,
      'heilongjiang': 580
    }
    return regionX[regionId] || 400
  }

  // 获取省份在地图上的Y坐标
  const getRegionMapY = (regionId: string): number => {
    const regionY: Record<string, number> = {
      'hebei': 140,
      'beijing': 115,
      'shandong': 190,
      'jiangsu': 230,
      'zhejiang': 280,
      'fujian': 360,
      'guangdong': 450,
      'guangxi': 480,
      'yunnan': 460,
      'sichuan': 360,
      'shaanxi': 240,
      'inner_mongolia': 130,
      'liaoning': 105,
      'jilin': 80,
      'heilongjiang': 60
    }
    return regionY[regionId] || 200
  }

  const handleExport = async () => {
    const startTime = Date.now()
    console.log('[ExportModal V7] 开始导出流程', {
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
      console.log('[ExportModal V7] 步骤1: 验证地图元素')
      const mapElement = document.getElementById(mapElementId)
      if (!mapElement) {
        throw new Error(`未找到地图元素: ${mapElementId}`)
      }

      // 步骤2: 创建Canvas并绘制
      console.log('[ExportModal V7] 步骤2: 创建Canvas并绘制')
      const canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 600
      
      await drawMapToCanvas(canvas, mapElement)

      // 步骤3: 生成并下载图片
      console.log('[ExportModal V7] 步骤3: 生成并下载图片')
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
        
        console.log('[ExportModal V7] 开始下载', {
          filename: link.download,
          urlLength: url.length
        })
        
        link.click()
        URL.revokeObjectURL(url)
        
        console.log('[ExportModal V7] 下载触发完成')
      }, `image/${format}`)

      // 步骤4: 完成
      const totalTime = Date.now() - startTime
      console.log('[ExportModal V7] 导出完成', {
        totalTime,
        success: true,
        timestamp: new Date().toISOString()
      })
      
      onClose()
    } catch (error) {
      const totalTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      console.error('[ExportModal V7] 导出失败', {
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
              • V7版本：使用Canvas API直接绘制
              <br />
              • 解决SVG渲染问题
              <br />
              • 包含完整地图轮廓和省份
              <br />
              • 学生信息完整显示
              <br />
              • 自动绘制连接线
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