import React, { useState } from 'react'
import { Palette, RotateCcw, Paintbrush } from 'lucide-react'
import { CARD_COLORS, getColorConfig } from '@/lib/storage'

interface ColorPickerProps {
  currentColor?: string
  onColorSelect: (colorValue: string) => void
  onReset?: () => void
  regionName?: string
}

export default function ColorPicker({ 
  currentColor, 
  onColorSelect, 
  onReset,
  regionName 
}: ColorPickerProps) {
  const [showCustomColor, setShowCustomColor] = useState(false)
  const [customColor, setCustomColor] = useState(currentColor || '#3b82f6')

  // 检查当前颜色是否为预设颜色
  const isPresetColor = CARD_COLORS.some(color => color.value === currentColor || color.hex === currentColor)

  // 更新自定义颜色
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value)
  }

  // 应用自定义颜色
  const applyCustomColor = () => {
    onColorSelect(customColor)
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-primary-500" />
        <h3 className="text-lg font-semibold text-neutral-900">
          {regionName ? `${regionName} 颜色设置` : '选择卡片颜色'}
        </h3>
      </div>

      {/* 当前颜色显示 */}
      {currentColor && (
        <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
          <div className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded border-2 border-white shadow-sm"
              style={{ backgroundColor: currentColor }}
            />
            <span className="text-sm text-neutral-600">
              当前颜色：{getColorConfig(currentColor)?.name || '自定义颜色'}
            </span>
          </div>
        </div>
      )}

      {/* 自定义颜色选择器 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-center gap-2 mb-3">
          <Paintbrush className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-800">自定义颜色</span>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColor || '#3b82f6'}
              onChange={handleCustomColorChange}
              className="w-12 h-10 rounded border-2 border-white shadow-sm cursor-pointer"
              title="选择自定义颜色"
            />
            <div className="flex-1">
              <p className="text-xs text-purple-700">
                点击颜色选择器选择任意颜色
              </p>
              <p className="text-xs text-purple-600 mt-1">
                当前：{customColor}
              </p>
            </div>
          </div>
          
          {/* 确定按钮 */}
          <button
            onClick={applyCustomColor}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
          >
            确定使用此颜色
          </button>
        </div>
      </div>

      {/* 预设颜色选择 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-primary-500" />
          <span className="text-sm font-medium text-neutral-700">预设颜色</span>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {CARD_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onColorSelect(color.value)}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 hover:shadow-md
                ${currentColor === color.value 
                  ? 'border-primary-500 ring-2 ring-primary-200' 
                  : 'border-neutral-200 hover:border-neutral-300'
                }
              `}
              title={color.name}
            >
              {/* 颜色预览 */}
              <div className="flex flex-col items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-xs font-medium text-neutral-700">{color.name}</span>
              </div>
              
              {/* 选中指示器 */}
              {currentColor === color.value && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 重置按钮 */}
      {onReset && currentColor && (
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          恢复默认颜色
        </button>
      )}

      {/* 颜色说明 */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <p className="text-sm text-blue-800">
          💡 提示：您可以使用上方的颜色选择器选择任意颜色，或者从下方选择预设颜色。选择颜色后，该省份的所有学生卡片都将使用此颜色。
        </p>
      </div>
    </div>
  )
}