import { useState, useEffect } from 'react'
import { MapsConfig } from './lib/supabase'
import { LocalStudent, loadStudents, addStudent, updateStudent, deleteStudent } from './lib/storage'
import Navigation from './components/Navigation'
import InteractiveMap from './components/InteractiveMap'
import StudentModal from './components/StudentModal'
import StudentListModal from './components/StudentListModal'
import ExportModal from './components/ExportModal'
import GlobalExportModal from './components/GlobalExportModal'
import RegionColorManager from './components/RegionColorManager'

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

function App() {
  const [selectedCountry, setSelectedCountry] = useState<'china' | 'usa'>('china')
  const [students, setStudents] = useState<LocalStudent[]>([])
  const [mapsConfig, setMapsConfig] = useState<MapsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  
  // 模态框状态
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [listModalOpen, setListModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [globalExportModalOpen, setGlobalExportModalOpen] = useState(false)
  const [colorManagerOpen, setColorManagerOpen] = useState(false)
  
  // 当前操作的区域和学生
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null)
  const [currentStudent, setCurrentStudent] = useState<LocalStudent | null>(null)
  const [listStudents, setListStudents] = useState<LocalStudent[]>([])
  const [colorChanged, setColorChanged] = useState(0) // 颜色变化触发器

  // 加载地图配置
  useEffect(() => {
    fetch('/data/maps-config.json')
      .then(res => res.json())
      .then(data => {
        setMapsConfig(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load map configuration:', err)
        setLoading(false)
      })
  }, [])

  // 加载学生数据
  useEffect(() => {
    refreshStudents()
  }, [])

  const refreshStudents = () => {
    const allStudents = loadStudents()
    setStudents(allStudents)
  }

  const handleRegionClick = (region: Region) => {
    setCurrentRegion(region)
    setCurrentStudent(null)
    setStudentModalOpen(true)
  }

  const handleStudentEdit = (student: LocalStudent) => {
    const region = getCurrentRegions().find(r => r.id === student.region_id)
    if (region) {
      setCurrentRegion(region)
      setCurrentStudent(student)
      setStudentModalOpen(true)
    }
  }

  const handleStudentSave = async (data: Partial<LocalStudent>) => {
    try {
      if (currentStudent) {
        // 更新
        updateStudent(currentStudent.id, data)
      } else {
        // 新增
        addStudent({
          country: data.country!,
          region_id: data.region_id!,
          region_name: data.region_name!,
          name: data.name!,
          city: data.city!,
          color: data.color,
        })
      }

      refreshStudents()
      setStudentModalOpen(false)
    } catch (error) {
      console.error('Failed to save student:', error)
      throw error
    }
  }

  const handleStudentDelete = async (id: string) => {
    try {
      const success = deleteStudent(id)
      if (!success) {
        console.error('Delete failed: student not found')
        alert('删除失败，请重试')
        return
      }
      refreshStudents()
    } catch (error) {
      console.error('Failed to delete student:', error)
      alert('删除失败，请重试')
    }
  }

  const handleShowList = (region: Region, students: LocalStudent[]) => {
    setCurrentRegion(region)
    setListStudents(students)
    setListModalOpen(true)
  }

  const handleColorChanged = () => {
    // 触发颜色变化，重新加载学生数据以应用新颜色
    setColorChanged(prev => prev + 1)
    refreshStudents()
  }

  const getCurrentRegions = (): Region[] => {
    if (!mapsConfig) {
      return []
    }
    return mapsConfig.countries[selectedCountry].administrative_divisions
  }

  const getCurrentCountryStudents = (): LocalStudent[] => {
    return students.filter(s => s.country === selectedCountry)
  }

  const getRegionCount = (): number => {
    const regions = new Set(getCurrentCountryStudents().map(s => s.region_id))
    return regions.size
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-base">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-body text-neutral-700">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-base">
      {/* 导航栏 */}
      <Navigation
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        studentCount={getCurrentCountryStudents().length}
        onExport={() => setExportModalOpen(true)}
        onGlobalExport={() => setGlobalExportModalOpen(true)}
        onColorManager={() => setColorManagerOpen(true)}
      />

      {/* 地图容器 */}
      <main className="pt-16 md:pt-18">
        <div
          id="map-container"
          data-country={selectedCountry}
          className="w-full"
          style={{ height: 'calc(100vh - 4rem)' }}
        >
          <InteractiveMap
            country={selectedCountry}
            regions={getCurrentRegions()}
            students={getCurrentCountryStudents()}
            onRegionClick={handleRegionClick}
            onStudentEdit={handleStudentEdit}
            onStudentDelete={handleStudentDelete}
            onShowList={handleShowList}
            colorChanged={colorChanged}
          />
        </div>
      </main>

      {/* 模态框 */}
      {currentRegion && (
        <>
          <StudentModal
            isOpen={studentModalOpen}
            onClose={() => {
              setStudentModalOpen(false)
              setCurrentStudent(null)
            }}
            onSave={handleStudentSave}
            student={currentStudent}
            regionName={currentRegion.name}
            regionId={currentRegion.id}
            country={selectedCountry}
          />

          <StudentListModal
            isOpen={listModalOpen}
            onClose={() => setListModalOpen(false)}
            students={listStudents}
            regionName={currentRegion.name}
            onEdit={handleStudentEdit}
            onDelete={handleStudentDelete}
            onAddNew={() => {
              setListModalOpen(false)
              setCurrentStudent(null)
              setStudentModalOpen(true)
            }}
          />
        </>
      )}

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        mapElementId="map-container"
        studentCount={getCurrentCountryStudents().length}
        regionCount={getRegionCount()}
        mapsConfig={mapsConfig}
        currentStudents={getCurrentCountryStudents()}
        currentCountry={selectedCountry}
      />

      <GlobalExportModal
        isOpen={globalExportModalOpen}
        onClose={() => setGlobalExportModalOpen(false)}
        allStudents={students}
        mapsConfig={mapsConfig}
      />

      {/* 省份颜色管理 */}
      {mapsConfig && (
        <RegionColorManager
          isOpen={colorManagerOpen}
          onClose={() => setColorManagerOpen(false)}
          onColorChanged={handleColorChanged}
          regions={[
            // 中国省份
            ...mapsConfig.countries.china.administrative_divisions.map(region => ({
              ...region,
              country: 'china'
            })),
            // 美国州
            ...mapsConfig.countries.usa.administrative_divisions.map(region => ({
              ...region,
              country: 'usa'
            }))
          ]}
        />
      )}
    </div>
  )
}

export default App
