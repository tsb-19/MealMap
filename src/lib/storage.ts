// 本地存储管理模块

const STORAGE_KEY = 'meal_map_students'
const MIGRATION_VERSION_KEY = 'meal_map_version'
const CURRENT_VERSION = '3.0'
const REGION_COLORS_KEY = 'meal_map_region_colors' // 省份自定义颜色存储键
const STYLE_SETTINGS_KEY = 'meal_map_style_settings'

// 预设颜色方案 - 添加十六进制颜色值
export const CARD_COLORS = [
  { name: '天空蓝', value: 'sky', hex: '#0EA5E9', bg: 'bg-sky-500/75', border: 'border-sky-600', text: 'text-white' },
  { name: '翠绿', value: 'emerald', hex: '#10B981', bg: 'bg-emerald-500/75', border: 'border-emerald-600', text: 'text-white' },
  { name: '紫罗兰', value: 'purple', hex: '#A855F7', bg: 'bg-purple-500/75', border: 'border-purple-600', text: 'text-white' },
  { name: '橙色', value: 'orange', hex: '#F97316', bg: 'bg-orange-500/75', border: 'border-orange-600', text: 'text-white' },
  { name: '玫红', value: 'rose', hex: '#F43F5E', bg: 'bg-rose-500/75', border: 'border-rose-600', text: 'text-white' },
  { name: '青色', value: 'cyan', hex: '#06B6D4', bg: 'bg-cyan-500/75', border: 'border-cyan-600', text: 'text-white' },
]

export interface LocalStudent {
  id: string
  country: string
  region_id: string
  region_name: string
  name: string
  city: string // 必填：具体城市
  color?: string // 已废弃，保持向后兼容，不再使用
  school?: string // 已废弃，保持向后兼容
  created_at: string
  updated_at: string
}

// 生成唯一ID
const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 省份自定义颜色管理
interface RegionColorMap {
  [regionId: string]: string // regionId -> colorValue
}

export interface StyleSettings {
  emptyRegionColor: string
  canvasBackgroundColor: string
}

const DEFAULT_STYLE_SETTINGS: StyleSettings = {
  emptyRegionColor: '#cccccc',
  canvasBackgroundColor: '#f0ebe6'
}

// 加载省份自定义颜色
const loadRegionColors = (): RegionColorMap => {
  try {
    const data = localStorage.getItem(REGION_COLORS_KEY)
    return data ? JSON.parse(data) : {}
  } catch (error) {
    console.error('Failed to load region colors:', error)
    return {}
  }
}

// 保存省份自定义颜色
const saveRegionColors = (colors: RegionColorMap): void => {
  try {
    localStorage.setItem(REGION_COLORS_KEY, JSON.stringify(colors))
  } catch (error) {
    console.error('Failed to save region colors:', error)
  }
}

// 设置省份自定义颜色
export const setRegionColor = (regionId: string, colorValue: string): void => {
  const colors = loadRegionColors()
  colors[regionId] = colorValue
  saveRegionColors(colors)
}

// 获取省份自定义颜色
export const getRegionCustomColor = (regionId: string): string | null => {
  const colors = loadRegionColors()
  return colors[regionId] || null
}

// 重置省份颜色为默认
export const resetRegionColor = (regionId: string): void => {
  const colors = loadRegionColors()
  delete colors[regionId]
  saveRegionColors(colors)
}

// 获取所有省份颜色设置
export const getAllRegionColors = (): RegionColorMap => {
  return loadRegionColors()
}

const PREVIOUS_DEFAULT_EMPTY_COLOR = '#cccccc'

const loadStyleSettings = (): StyleSettings => {
  try {
    const data = localStorage.getItem(STYLE_SETTINGS_KEY)
    if (!data) return DEFAULT_STYLE_SETTINGS
    const stored = JSON.parse(data)
    const merged = { ...DEFAULT_STYLE_SETTINGS, ...stored }
    if (merged.emptyRegionColor === PREVIOUS_DEFAULT_EMPTY_COLOR) {
      merged.emptyRegionColor = DEFAULT_STYLE_SETTINGS.emptyRegionColor
    }
    return merged
  } catch (error) {
    console.error('Failed to load style settings:', error)
    return DEFAULT_STYLE_SETTINGS
  }
}

export const getStyleSettings = (): StyleSettings => {
  return loadStyleSettings()
}

export const updateStyleSettings = (updates: Partial<StyleSettings>): StyleSettings => {
  const current = loadStyleSettings()
  const next = { ...current, ...updates }
  try {
    localStorage.setItem(STYLE_SETTINGS_KEY, JSON.stringify(next))
  } catch (error) {
    console.error('Failed to save style settings:', error)
  }
  return next
}

// 根据regionId获取颜色（优先自定义，否则哈希算法）
export const getRegionColor = (regionId: string): string => {
  // 优先使用自定义颜色
  const customColor = getRegionCustomColor(regionId)
  if (customColor) {
    // 如果是预设颜色名称，转换为十六进制
    const colorConfig = CARD_COLORS.find(c => c.value === customColor)
    return colorConfig ? colorConfig.hex : customColor
  }
  
  // 使用哈希算法分配默认颜色，返回十六进制值
  let hash = 0
  for (let i = 0; i < regionId.length; i++) {
    hash = ((hash << 5) - hash) + regionId.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  const index = Math.abs(hash) % CARD_COLORS.length
  return CARD_COLORS[index].hex
}

// 根据颜色值获取颜色配置
export const getColorConfig = (colorValue?: string) => {
  // 优先通过value查找
  let color = CARD_COLORS.find(c => c.value === colorValue)
  
  // 如果没找到，尝试通过hex查找
  if (!color && colorValue) {
    color = CARD_COLORS.find(c => c.hex.toLowerCase() === colorValue.toLowerCase())
  }
  
  // 如果仍然没找到，说明是自定义颜色
  if (!color && colorValue) {
    return {
      name: '自定义',
      value: colorValue,
      hex: colorValue,
      bg: '',
      border: '',
      text: 'text-white',
      isCustom: true
    }
  }
  
  return {
    ...(color || CARD_COLORS[0]), // 默认天空蓝
    isCustom: false
  }
}

// 根据颜色值获取十六进制颜色
export const getColorHex = (colorValue: string): string => {
  const color = CARD_COLORS.find(c => c.value === colorValue)
  return color ? color.hex : colorValue
}

// 数据迁移：旧格式转新格式
const migrateStudent = (student: any): LocalStudent => {
  // 如果已经有city字段，直接返回（移除color字段）
  if (student.city) {
    return {
      id: student.id,
      country: student.country,
      region_id: student.region_id,
      region_name: student.region_name,
      name: student.name,
      city: student.city,
      school: student.school,
      created_at: student.created_at,
      updated_at: student.updated_at,
    }
  }
  
  // 旧数据迁移：school字段转为city字段
  const migratedStudent: LocalStudent = {
    id: student.id,
    country: student.country,
    region_id: student.region_id,
    region_name: student.region_name,
    name: student.name,
    city: student.region_name, // 使用region_name作为城市（向后兼容）
    school: student.school, // 保留原school字段
    created_at: student.created_at,
    updated_at: student.updated_at,
  }
  
  return migratedStudent
}

// 执行数据迁移
const runMigration = (): void => {
  try {
    const currentVersion = localStorage.getItem(MIGRATION_VERSION_KEY)
    
    // 如果已经是最新版本，跳过迁移
    if (currentVersion === CURRENT_VERSION) {
      return
    }
    
    
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) {
      localStorage.setItem(MIGRATION_VERSION_KEY, CURRENT_VERSION)
      return
    }
    
    const students = JSON.parse(data)
    
    // 迁移每个学生（移除color字段）
    const migratedStudents = students.map(migrateStudent)
    
    // 保存迁移后的数据
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedStudents))
    localStorage.setItem(MIGRATION_VERSION_KEY, CURRENT_VERSION)
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

// 加载所有学生数据（自动执行迁移）
export const loadStudents = (): LocalStudent[] => {
  try {
    // 首次加载时执行迁移
    runMigration()
    
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load students from localStorage:', error)
    return []
  }
}

// 保存所有学生数据
const saveStudents = (students: LocalStudent[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students))
  } catch (error) {
    console.error('Failed to save students to localStorage:', error)
  }
}

// 添加学生（不再保存color字段）
export const addStudent = (data: Omit<LocalStudent, 'id' | 'created_at' | 'updated_at'>): LocalStudent => {
  const students = loadStudents()
  const now = new Date().toISOString()
  const newStudent: LocalStudent = {
    id: generateId(),
    country: data.country,
    region_id: data.region_id,
    region_name: data.region_name,
    name: data.name,
    city: data.city,
    created_at: now,
    updated_at: now,
  }
  students.unshift(newStudent)
  saveStudents(students)
  return newStudent
}

// 更新学生
export const updateStudent = (id: string, data: Partial<LocalStudent>): LocalStudent | null => {
  const students = loadStudents()
  const index = students.findIndex(s => s.id === id)
  if (index === -1) return null

  const updatedStudent = {
    ...students[index],
    ...data,
    color: undefined, // 移除color字段
    updated_at: new Date().toISOString(),
  }
  students[index] = updatedStudent
  saveStudents(students)
  return updatedStudent
}

// 删除学生
export const deleteStudent = (id: string): boolean => {
  const students = loadStudents()
  const filteredStudents = students.filter(s => s.id !== id)
  
  if (filteredStudents.length === students.length) {
    return false
  }
  
  saveStudents(filteredStudents)
  return true
}

// 按国家筛选
export const getStudentsByCountry = (country: string): LocalStudent[] => {
  return loadStudents().filter(s => s.country === country)
}

// 按地区筛选
export const getStudentsByRegion = (country: string, regionId: string): LocalStudent[] => {
  return loadStudents().filter(s => s.country === country && s.region_id === regionId)
}
