import React, { useState, useEffect, useMemo } from 'react'
import { X, Palette, MapPin, SlidersHorizontal } from 'lucide-react'
import ColorPicker from './ColorPicker'
import {
  getAllRegionColors,
  setRegionColor,
  resetRegionColor,
  getRegionColor,
  getStyleSettings,
  updateStyleSettings,
  StyleSettings,
  getColorConfig
} from '@/lib/storage'

interface RegionColorManagerProps {
  isOpen: boolean
  onClose: () => void
  onColorChanged?: () => void
  regions: Array<{
    id: string
    name: string
    country: string
  }>
}

export default function RegionColorManager({
  isOpen,
  onClose,
  onColorChanged,
  regions
}: RegionColorManagerProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [regionColors, setRegionColors] = useState<Record<string, string>>({})
  const [styleSettings, setStyleSettings] = useState<StyleSettings>(getStyleSettings())

  useEffect(() => {
    if (isOpen) {
      setRegionColors(getAllRegionColors())
      const styles = getStyleSettings()
      setStyleSettings(styles)
    }
  }, [isOpen])

  const handleColorConfirm = (colorValue: string) => {
    if (!selectedRegion) return
    setRegionColor(selectedRegion, colorValue)
    setRegionColors(prev => ({ ...prev, [selectedRegion]: colorValue }))
    onColorChanged?.()
  }

  const handleResetColor = () => {
    if (!selectedRegion) return
    resetRegionColor(selectedRegion)
    setRegionColors(prev => {
      const next = { ...prev }
      delete next[selectedRegion]
      return next
    })
    onColorChanged?.()
  }

  const getCurrentColor = (regionId: string) => regionColors[regionId] || getRegionColor(regionId)

  const getColorStyle = (value: string) => getColorConfig(value).hex

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <Palette className="w-6 h-6 text-primary-500" />
            <h2 className="text-h2 font-semibold text-neutral-900">颜色管理</h2>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pr-2">
          <div className="flex gap-6 min-h-[360px]">
            <div className="flex-1 overflow-y-auto">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                选择省份
              </h3>

            <div className="space-y-2">
              {regions.map(region => {
                const currentColor = getCurrentColor(region.id)
                const hasCustom = regionColors[region.id] !== undefined
                return (
                  <button
                    key={region.id}
                    onClick={() => setSelectedRegion(region.id)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all
                      ${selectedRegion === region.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'}
                    `}
                  >
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: getColorStyle(currentColor) }}
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-neutral-900">{region.name}</div>
                      <div className="text-sm text-neutral-500">
                        {region.country === 'china' ? '🇨🇳 中国' : '🇺🇸 美国'}
                      </div>
                    </div>
                    <div className="text-right text-xs text-neutral-500">
                      {hasCustom ? '已自定义' : '默认'}
                    </div>
                  </button>
                )
              })}
            </div>
            </div>

            <div className="w-80 border-l border-neutral-200 pl-6 h-full overflow-y-auto">
              {selectedRegion ? (
                <ColorPicker
                  currentColor={getCurrentColor(selectedRegion)}
                  onColorSelect={handleColorConfirm}
                  onReset={regionColors[selectedRegion] ? handleResetColor : undefined}
                  regionName={regions.find(r => r.id === selectedRegion)?.name}
                />
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

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal className="w-4 h-4 text-primary-500" />
                <h4 className="font-medium text-neutral-900">基础地图颜色</h4>
              </div>
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-neutral-600">无同学地区填充色</span>
                  <input
                    type="color"
                    value={styleSettings.emptyRegionColor}
                    onChange={(e) => {
                      const next = updateStyleSettings({ emptyRegionColor: e.target.value })
                      setStyleSettings(next)
                      onColorChanged?.()
                    }}
                    className="w-12 h-8 rounded border border-neutral-200 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-neutral-600">画布背景色</span>
                  <input
                    type="color"
                    value={styleSettings.canvasBackgroundColor}
                    onChange={(e) => {
                      const next = updateStyleSettings({ canvasBackgroundColor: e.target.value })
                      setStyleSettings(next)
                      onColorChanged?.()
                    }}
                    className="w-12 h-8 rounded border border-neutral-200 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h4 className="font-medium text-amber-900 mb-2">💡 使用说明</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• 仅显示当前地图中有同学的省份/州</li>
                <li>• 点击“当前颜色”或预设色块即可实时应用</li>
                <li>• 下方输入框可直接调整基础地图填充与背景色</li>
                <li>• 所有设置都会保存在本地，刷新后依然生效</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
