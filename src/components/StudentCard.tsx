import { LocalStudent, getColorConfig, getRegionColor } from '@/lib/storage'
import { Edit2, Trash2, GripVertical } from 'lucide-react'
import { useState, useRef, memo } from 'react'

interface StudentCardProps {
  student: LocalStudent
  onEdit: (student: LocalStudent) => void
  onDelete: (id: string) => void
  compact?: boolean
}

export function StudentCard({ student, onEdit, onDelete, compact = false }: StudentCardProps) {
  const colorConfig = getColorConfig(getRegionColor(student.region_id))
  
  if (compact) {
    return (
      <div
        className={`${colorConfig.bg} backdrop-blur-sm rounded-md shadow-md border ${colorConfig.border} p-1 
        hover:shadow-lg transition-all duration-base cursor-pointer group`}
        onClick={() => onEdit(student)}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex-1 min-w-0">
            <p className={`text-[11px] font-semibold ${colorConfig.text} truncate leading-tight`}>
              {student.name} <span className="font-normal opacity-80">| {student.city}</span>
            </p>
          </div>
          <div className="flex gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(student)
              }}
              className="p-0.5 hover:bg-white/30 rounded transition-colors"
              title="编辑"
            >
              <Edit2 className="w-3 h-3 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm('确定要删除这位同学吗？')) {
                  onDelete(student.id)
                }
              }}
              className="p-0.5 hover:bg-red-100/30 rounded transition-colors"
              title="删除"
            >
              <Trash2 className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${colorConfig.bg} backdrop-blur-sm rounded-md shadow-md border ${colorConfig.border} p-2 
      hover:shadow-lg hover:-translate-y-0.5 transition-all duration-base cursor-pointer group`}
      onClick={() => onEdit(student)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${colorConfig.text} mb-0.5`}>{student.name}</h3>
          <p className={`text-xs ${colorConfig.text} opacity-80`}>{student.city} · {student.region_name}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(student)
            }}
            className="p-1 hover:bg-white/30 rounded transition-colors"
            title="编辑"
          >
            <Edit2 className="w-3 h-3 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm('确定要删除这位同学吗？')) {
                onDelete(student.id)
              }
            }}
            className="p-1 hover:bg-red-100/30 rounded transition-colors"
            title="删除"
          >
            <Trash2 className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface DraggableStudentCardProps {
  students: LocalStudent[]
  regionName: string
  position: { x: number; y: number }
  onEdit: (student: LocalStudent) => void
  onDelete: (id: string) => void
  onDrag: (dx: number, dy: number) => void
  cardRef?: React.RefObject<HTMLDivElement>
}

export const DraggableStudentCard = memo(function DraggableStudentCard({ 
  students, 
  regionName, 
  position,
  onEdit, 
  onDelete, 
  onDrag,
  cardRef: externalRef 
}: DraggableStudentCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const lastMousePos = useRef({ x: 0, y: 0 })
  const internalRef = useRef<HTMLDivElement>(null)
  const cardRef = externalRef || internalRef
  const animationFrameRef = useRef<number | null>(null)
  const hasMoved = useRef(false)
  const DRAG_THRESHOLD = 1 // 降低拖动阈值，更容易触发拖动

  const handleMouseDown = (e: React.MouseEvent) => {
    // 检查是否点击在按钮上
    const target = e.target as HTMLElement
    const button = target.closest('button')
    if (button || target.tagName === 'BUTTON') {
      console.log('🖱️ MouseDown on button, ignoring drag')
      return
    }
    
    // 检查是否点击在可交互元素上（如链接、输入框等）
    if (target.closest('a, input, textarea, select')) {
      console.log('🖱️ MouseDown on interactive element, ignoring drag')
      return
    }
    
    console.log('🖱️ MouseDown on card, starting drag detection')
    
    // 防止文本选择和默认行为
    e.preventDefault()
    e.stopPropagation()
    
    // 确保事件能够被处理
    e.nativeEvent.stopImmediatePropagation()
    
    const startX = e.clientX
    const startY = e.clientY
    dragStartPos.current = { x: startX, y: startY }
    lastMousePos.current = { x: startX, y: startY }
    hasMoved.current = false
    
    // 添加全局样式防止拖动时选中文本
    document.body.style.userSelect = 'none'
    // 先不设置cursor，等真正开始拖动时再设置

    const handleMouseMove = (e: MouseEvent) => {
      // 不需要 preventDefault，让事件正常传播
      const currentX = e.clientX
      const currentY = e.clientY
      
      // 计算从起始位置的移动距离
      const totalDx = currentX - dragStartPos.current.x
      const totalDy = currentY - dragStartPos.current.y
      const distance = Math.sqrt(totalDx * totalDx + totalDy * totalDy)
      
      // 如果还没有开始拖动，检查是否超过阈值
      if (!hasMoved.current) {
        if (distance < DRAG_THRESHOLD) {
          return // 还没超过阈值，不处理
        }
        // 超过阈值，开始拖动
        console.log('🎯 Drag started! Distance:', distance.toFixed(2), 'px')
        hasMoved.current = true
        setIsDragging(true)
        document.body.style.cursor = 'grabbing'
        // 更新最后位置为起始位置，避免突然跳跃
        lastMousePos.current = { x: dragStartPos.current.x, y: dragStartPos.current.y }
        return
      }
      
      // 已经开始拖动，计算增量（相对于上一次鼠标位置）
      const dx = currentX - lastMousePos.current.x
      const dy = currentY - lastMousePos.current.y
      
      // 如果移动很小，跳过更新
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        return
      }
      
      // 使用 requestAnimationFrame 优化性能
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      animationFrameRef.current = requestAnimationFrame(() => {
      // 查找地图容器来获取正确的尺寸
      const cardElement = cardRef.current
      const mapContainer = cardElement?.closest('[data-map-container]') || 
                          cardElement?.closest('.relative') ||
                          document.querySelector('[data-map-container]') ||
                          document.querySelector('.relative')
      
      if (mapContainer) {
        const rect = mapContainer.getBoundingClientRect()
          // 将像素增量转换为百分比增量
        const dxPercent = (dx / rect.width) * 100
        const dyPercent = (dy / rect.height) * 100
          console.log('📦 Dragging:', { dx: dx.toFixed(2), dy: dy.toFixed(2), dxPercent: dxPercent.toFixed(2), dyPercent: dyPercent.toFixed(2) })
        onDrag(dxPercent, dyPercent)
      } else {
        // fallback：使用视窗尺寸进行转换
        const windowWidth = window.innerWidth
        const windowHeight = window.innerHeight
        const dxPercent = (dx / windowWidth) * 100
        const dyPercent = (dy / windowHeight) * 100
          console.log('📦 Dragging (fallback):', { dx: dx.toFixed(2), dy: dy.toFixed(2), dxPercent: dxPercent.toFixed(2), dyPercent: dyPercent.toFixed(2) })
        onDrag(dxPercent, dyPercent)
      }
      
        // 更新最后鼠标位置
        lastMousePos.current = { x: currentX, y: currentY }
      })
    }

    const handleMouseUp = (e?: MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
    }

      // 取消待处理的动画帧
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      // 移除事件监听器
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      
      // 如果还没有开始拖动，可能是点击事件
      if (!hasMoved.current) {
        // 恢复样式
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        return
      }
      
      setIsDragging(false)
      hasMoved.current = false
      // 恢复样式
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    // 添加事件监听器
    // 注意：mousemove 不使用 passive，因为我们需要 preventDefault
    document.addEventListener('mousemove', handleMouseMove, { passive: false })
    document.addEventListener('mouseup', handleMouseUp, { once: true })
    // 也监听 mouseleave，防止鼠标移出窗口时卡住
    const handleMouseLeave = () => {
      handleMouseUp()
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
    document.addEventListener('mouseleave', handleMouseLeave, { once: true })
  }

  if (students.length === 0) return null

  // 获取区域统一颜色配置
  const colorConfig = getColorConfig(getRegionColor(students[0].region_id))

  if (students.length === 1) {
    return (
      <div
        ref={cardRef}
        onMouseDown={handleMouseDown}
        className={`${colorConfig.bg} backdrop-blur-sm rounded-md shadow-md border ${colorConfig.border} p-2 
        hover:shadow-lg group min-w-[180px] max-w-[240px] select-none ${
          isDragging 
            ? 'cursor-grabbing shadow-2xl scale-105 opacity-90 z-50 transition-none' 
            : 'cursor-grab transition-all duration-200'
        }`}
        style={{
          ...(isDragging ? { 
            pointerEvents: 'auto',
            willChange: 'transform',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          } : {
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }),
          touchAction: 'none' // 防止移动端的默认触摸行为
        }}
      >
        <div className="flex items-center gap-1">
          <GripVertical className="w-3 h-3 text-white/60 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className={`text-[11px] font-semibold ${colorConfig.text} leading-tight whitespace-nowrap`}>{regionName}</p>
            <p className={`text-[10px] ${colorConfig.text} opacity-90 leading-tight`}>
              {students[0].name} | {students[0].city}
            </p>
          </div>
          <div className="flex gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(students[0])
              }}
              className="p-0.5 hover:bg-white/30 rounded transition-colors"
              title="编辑"
            >
              <Edit2 className="w-3 h-3 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm('确定要删除这位同学吗？')) {
                  onDelete(students[0].id)
                }
              }}
              className="p-0.5 hover:bg-red-100/30 rounded transition-colors"
              title="删除"
            >
              <Trash2 className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 多个学生聚合显示
  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      className={`${colorConfig.bg} backdrop-blur-sm rounded-md shadow-md border ${colorConfig.border} p-2 
      hover:shadow-lg group min-w-[180px] max-w-[260px] select-none ${
        isDragging 
          ? 'cursor-grabbing shadow-2xl scale-105 opacity-90 z-50 transition-none' 
          : 'cursor-grab transition-all duration-200'
      }`}
      style={{
        ...(isDragging ? { 
          pointerEvents: 'auto',
          willChange: 'transform',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        } : {
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }),
        touchAction: 'none' // 防止移动端的默认触摸行为
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <GripVertical className="w-3 h-3 text-white/60 flex-shrink-0" />
        <div className="flex-1">
          <p className={`text-xs font-semibold ${colorConfig.text} whitespace-nowrap`}>{regionName}</p>
          <p className={`text-xs ${colorConfig.text} opacity-80`}>{students.length} 位同学</p>
        </div>
      </div>
      
      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
        {students.map((student, index) => {
          const studentColor = getColorConfig(getRegionColor(student.region_id))
          return (
            <div
              key={student.id}
              className={`flex items-center justify-between gap-2 p-2 ${studentColor.bg} rounded border ${studentColor.border}`}
              style={{
                marginBottom: index < students.length - 1 ? '12px' : '0',
                minHeight: '36px',
                lineHeight: '1.5',
                paddingTop: '8px',
                paddingBottom: '8px'
              }}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-[12px] font-medium ${studentColor.text} leading-tight`} style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '160px',
                  margin: 0,
                  padding: 0
                }}>
                  {student.name} | {student.city}
                </p>
              </div>
              <div className="flex gap-0.5 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(student)
                  }}
                  className="p-0.5 hover:bg-white/30 rounded transition-colors"
                  title="编辑"
                >
                  <Edit2 className="w-2.5 h-2.5 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm('确定要删除这位同学吗？')) {
                      onDelete(student.id)
                    }
                  }}
                  className="p-0.5 hover:bg-red-100/30 rounded transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时重新渲染
  // 比较 students 数组（通过 ID 和长度）
  const studentsEqual = 
    prevProps.students.length === nextProps.students.length &&
    prevProps.students.every((s, i) => s.id === nextProps.students[i]?.id)
  
  return (
    studentsEqual &&
    prevProps.regionName === nextProps.regionName &&
    Math.abs(prevProps.position.x - nextProps.position.x) < 0.01 &&
    Math.abs(prevProps.position.y - nextProps.position.y) < 0.01 &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onDrag === nextProps.onDrag
  )
})

interface AggregatedCardProps {
  count: number
  onClick: () => void
}

export function AggregatedCard({ count, onClick }: AggregatedCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-primary-500/75 backdrop-blur-sm rounded-md shadow-lg border border-primary-600 p-3 
      hover:bg-primary-500/85 hover:-translate-y-1 hover:shadow-xl transition-all duration-base cursor-pointer
      flex flex-col items-center justify-center text-white min-w-[80px]"
    >
      <div className="text-2xl font-bold leading-tight">{count}</div>
      <div className="text-xs mt-0.5">位同学</div>
    </div>
  )
}
