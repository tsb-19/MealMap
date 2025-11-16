import React, { useEffect, useState } from 'react'
import { Palette, RotateCcw, Paintbrush } from 'lucide-react'
import { CARD_COLORS, getColorConfig } from '@/lib/storage'

interface ColorPickerProps {
  currentColor?: string
  onColorSelect: (colorValue: string) => void
  onReset?: () => void
  regionName?: string
}

const FALLBACK_COLOR = '#3b82f6'

export default function ColorPicker({
  currentColor,
  onColorSelect,
  onReset,
  regionName
}: ColorPickerProps) {
  const normalizeCustomHex = (value?: string) => {
    if (!value) return FALLBACK_COLOR
    if (value.startsWith('#')) return value
    return getColorConfig(value).hex
  }

  const [customColor, setCustomColor] = useState<string>(normalizeCustomHex(currentColor))

  useEffect(() => {
    setCustomColor(normalizeCustomHex(currentColor))
  }, [currentColor])

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomColor(value)
    onColorSelect(value)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-primary-500" />
        <h3 className="text-lg font-semibold text-neutral-900">
          {regionName ? `${regionName} 颜色设置` : '选择卡片颜色'}
        </h3>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
        <button
          onClick={() => document.getElementById('region-custom-color-input')?.click()}
          className="flex items-center gap-3 text-left w-full mb-3"
        >
          <div
            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: getColorConfig(currentColor || customColor).hex }}
          />
          <div>
            <p className="text-sm font-medium text-purple-800">当前颜色</p>
            <p className="text-xs text-purple-600">{getColorConfig(currentColor || customColor).name || '自定义颜色'} · 点击修改</p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <input
            id="region-custom-color-input"
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="w-12 h-10 rounded border-2 border-white shadow-sm cursor-pointer"
            title="选择自定义颜色"
          />
          <div className="flex-1">
            <p className="text-xs text-purple-700">
              通过颜色选择器选择任意颜色，自动应用
            </p>
            <p className="text-xs text-purple-600 mt-1">当前：{customColor}</p>
          </div>
        </div>
      </div>

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
                  : 'border-neutral-200 hover:border-neutral-300'}
              `}
              title={color.name}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-xs font-medium text-neutral-700">{color.name}</span>
              </div>
              {currentColor === color.value && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {onReset && currentColor && (
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          恢复默认颜色
        </button>
      )}

      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <p className="text-sm text-blue-800">
          💡 提示：选择预设或自定义颜色后立即生效。地图填充和卡片会一起更新。
        </p>
      </div>
    </div>
  )
}
