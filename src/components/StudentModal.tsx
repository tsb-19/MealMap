import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { LocalStudent } from '@/lib/storage'

interface StudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<LocalStudent>) => Promise<void>
  student?: LocalStudent | null
  regionName: string
  regionId: string
  country: 'china' | 'usa'
}

export default function StudentModal({
  isOpen,
  onClose,
  onSave,
  student,
  regionName,
  regionId,
  country,
}: StudentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name,
        city: student.city || '',
      })
    } else {
      setFormData({ name: '', city: '' })
    }
    setErrors({})
  }, [student, isOpen])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = '请输入同学姓名'
    }
    if (!formData.city.trim()) {
      newErrors.city = '请输入具体城市'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }

    setLoading(true)
    try {
      await onSave({
        ...formData,
        region_id: regionId,
        region_name: regionName,
        country,
      })
      onClose()
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
          <div>
            <h2 className="text-h2 font-semibold text-neutral-900">
              {student ? '编辑同学信息' : '添加同学信息'}
            </h2>
            <p className="text-small text-neutral-700 mt-1">{regionName}</p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* 姓名 */}
          <div>
            <label htmlFor="name" className="block text-small font-medium text-neutral-700 mb-2">
              姓名 <span className="text-error">*</span>
            </label>
            <input
              id="name"
              type="text"
              className={`input ${errors.name ? 'border-error' : ''}`}
              placeholder="请输入同学姓名"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {errors.name && (
              <p className="text-caption text-error mt-1">{errors.name}</p>
            )}
          </div>

          {/* 城市 */}
          <div>
            <label htmlFor="city" className="block text-small font-medium text-neutral-700 mb-2">
              具体城市 <span className="text-error">*</span>
            </label>
            <input
              id="city"
              type="text"
              className={`input ${errors.city ? 'border-error' : ''}`}
              placeholder="请输入具体城市名称"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            {errors.city && (
              <p className="text-caption text-error mt-1">{errors.city}</p>
            )}
          </div>

          {/* 提示信息 */}
          <div className="text-caption text-neutral-500 bg-neutral-50 p-3 rounded">
            提示：同一省/州的所有同学将使用相同的卡片颜色
          </div>

          {/* 按钮组 */}
          <div className="flex gap-4 pt-6 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={loading}
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
