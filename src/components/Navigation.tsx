import { useState } from 'react'
import { Download, Menu, X, Palette } from 'lucide-react'

interface NavigationProps {
  selectedCountry: 'china' | 'usa'
  onCountryChange: (country: 'china' | 'usa') => void
  studentCount: number
  onExport: () => void
  onColorManager: () => void
}

export default function Navigation({
  selectedCountry,
  onCountryChange,
  studentCount,
  onExport,
  onColorManager,
}: NavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-sticky bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 md:h-18 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-h3 font-semibold text-neutral-900">蹭饭地图</h1>
        </div>

        {/* 桌面端：国家切换器 */}
        <div className="hidden md:flex items-center gap-1 bg-neutral-100 rounded-md p-1">
          <button
            onClick={() => onCountryChange('china')}
            className={`px-6 py-2 rounded-md text-body font-medium transition-all duration-base ${
              selectedCountry === 'china'
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-neutral-700 hover:text-neutral-900'
            }`}
          >
            中国
          </button>
          <button
            onClick={() => onCountryChange('usa')}
            className={`px-6 py-2 rounded-md text-body font-medium transition-all duration-base ${
              selectedCountry === 'usa'
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-neutral-700 hover:text-neutral-900'
            }`}
          >
            美国
          </button>
        </div>

        {/* 桌面端：操作按钮组 */}
        <div className="hidden md:flex items-center gap-4">
          {/* 统计徽章 */}
          <div className="bg-neutral-100 px-4 py-2 rounded-full">
            <span className="text-small text-neutral-700">
              已添加 <span className="font-semibold text-neutral-900">{studentCount}</span> 位同学
            </span>
          </div>

          {/* 颜色管理按钮 */}
          <button onClick={onColorManager} className="btn-secondary flex items-center gap-2">
            <Palette className="w-5 h-5" />
            <span>颜色管理</span>
          </button>

          {/* 导出按钮 */}
          <button onClick={onExport} className="btn-primary flex items-center gap-2">
            <Download className="w-5 h-5" />
            <span>导出当前</span>
          </button>
        </div>

        {/* 移动端：汉堡菜单 */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden btn-icon"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* 移动端菜单展开 */}
      {menuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white p-4 space-y-4">
          {/* 国家切换 */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                onCountryChange('china')
                setMenuOpen(false)
              }}
              className={`flex-1 py-3 rounded-md font-medium transition-all ${
                selectedCountry === 'china'
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-100 text-neutral-700'
              }`}
            >
              中国
            </button>
            <button
              onClick={() => {
                onCountryChange('usa')
                setMenuOpen(false)
              }}
              className={`flex-1 py-3 rounded-md font-medium transition-all ${
                selectedCountry === 'usa'
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-100 text-neutral-700'
              }`}
            >
              美国
            </button>
          </div>

          {/* 统计信息 */}
          <div className="bg-neutral-100 px-4 py-3 rounded-md text-center">
            <span className="text-small text-neutral-700">
              已添加 <span className="font-semibold text-neutral-900">{studentCount}</span> 位同学
            </span>
          </div>

          {/* 颜色管理按钮 */}
          <button
            onClick={() => {
              onColorManager()
              setMenuOpen(false)
            }}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <Palette className="w-5 h-5" />
            <span>颜色管理</span>
          </button>

          {/* 导出按钮 */}
          <button
            onClick={() => {
              onExport()
              setMenuOpen(false)
            }}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            <span>导出当前地图</span>
          </button>
        </div>
      )}
    </nav>
  )
}
