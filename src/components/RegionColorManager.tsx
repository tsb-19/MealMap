import React, { useState, useEffect } from 'react'
import { X, Palette, MapPin } from 'lucide-react'
import ColorPicker from './ColorPicker'
import { 
  getAllRegionColors, 
  setRegionColor, 
  resetRegionColor, 
  getRegionCustomColor,
  getRegionColor,
  CARD_COLORS 
} from '@/lib/storage'

interface RegionColorManagerProps {
  isOpen: boolean
  onClose: () => void
  onColorChanged?: () => void // 添加颜色变化回调
  regions: Array<{
    id: string
    name: string
    country: string
  }>
}

export default function RegionColorManager({ isOpen, onClose, onColorChanged, regions }: RegionColorManagerProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [regionColors, setRegionColors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      // 加载所有省份颜色设置
      const colors = getAllRegionColors()
      setRegionColors(colors)
    }
  }, [isOpen])

  const handleColorSelect = (colorValue: string) => {
    if (!selectedRegion) return
    
    setRegionColor(selectedRegion, colorValue)
    setRegionColors(prev => ({
      ...prev,
      [selectedRegion]: colorValue
    }))
    
    // 通知父组件颜色已改变，触发地图重新渲染
    if (onColorChanged) {
      onColorChanged()
    }
  }

  const handleResetColor = () => {
    if (!selectedRegion) return
    
    resetRegionColor(selectedRegion)
    setRegionColors(prev => {
      const newColors = { ...prev }
      delete newColors[selectedRegion]
      return newColors
    })
    
    // 通知父组件颜色已改变，触发地图重新渲染
    if (onColorChanged) {
      onColorChanged()
    }
  }

  const getCurrentColor = (regionId: string) => {
    return regionColors[regionId] || getRegionColor(regionId)
  }

  const getColorName = (colorValue: string) => {
    return CARD_COLORS.find(c => c.value === colorValue)?.name || '未知'
  }

  const getColorStyle = (colorValue: string) => {
    // 如果是十六进制颜色，直接返回
    if (colorValue.startsWith('#')) {
      return colorValue
    }
    
    // 如果是预设颜色名称，转换为十六进制
    const color = CARD_COLORS.find(c => c.value === colorValue)
    return color ? color.hex : '#3b82f6'
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <Palette className="w-6 h-6 text-primary-500" />
            <h2 className="text-h2 font-semibold text-neutral-900">省份颜色管理</h2>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 flex gap-6 h-[calc(90vh-200px)]">
          {/* 左侧：省份列表 */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              选择省份
            </h3>
            
            <div className="space-y-2">
              {regions.map((region) => {
                const currentColor = getCurrentColor(region.id)
                const hasCustomColor = regionColors[region.id] !== undefined
                
                return (
                  <button
                    key={region.id}
                    onClick={() => setSelectedRegion(region.id)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all
                      ${selectedRegion === region.id 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                      }
                    `}
                  >
                    {/* 颜色指示器 */}
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: getColorStyle(currentColor) }}
                    />
                    
                    {/* 省份信息 */}
                    <div className="flex-1 text-left">
                      <div className="font-medium text-neutral-900">{region.name}</div>
                      <div className="text-sm text-neutral-500">
                        {region.country === 'china' ? '🇨🇳 中国' : '🇺🇸 美国'}
                      </div>
                    </div>
                    
                    {/* 颜色信息 */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-neutral-700">
                        {getColorName(currentColor)}
                      </div>
                      {hasCustomColor && (
                        <div className="text-xs text-primary-600">自定义</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 右侧：颜色选择器 */}
          <div className="w-80 border-l border-neutral-200 pl-6">
            {selectedRegion ? (
              <div>
                {(() => {
                  const region = regions.find(r => r.id === selectedRegion)
                  const currentColor = getCurrentColor(selectedRegion)
                  
                  return (
                    <ColorPicker
                      currentColor={currentColor}
                      onColorSelect={handleColorSelect}
                      onReset={regionColors[selectedRegion] ? handleResetColor : undefined}
                      regionName={region?.name}
                    />
                  )
                })()}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-500">
                <div className="text-center">
                  <Palette className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                  <p>请选择左侧省份</p>
                  <p className="text-sm">来设置自定义颜色</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部说明 */}
        <div className="mt-6 pt-4 border-t border-neutral-200">
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <h4 className="font-medium text-amber-900 mb-2">💡 使用说明</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• 选择左侧省份，右侧为其设置自定义颜色</li>
              <li>• 设置后该省份所有学生卡片都将使用新颜色</li>
              <li>• 点击"恢复默认颜色"可清除自定义设置</li>
              <li>• 颜色设置会保存在本地，刷新页面后依然有效</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}