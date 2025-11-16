import { X, Plus } from 'lucide-react'
import { LocalStudent } from '@/lib/storage'
import { StudentCard } from './StudentCard'

interface StudentListModalProps {
  isOpen: boolean
  onClose: () => void
  students: LocalStudent[]
  regionName: string
  onEdit: (student: LocalStudent) => void
  onDelete: (id: string) => void
  onAddNew: () => void
}

export default function StudentListModal({
  isOpen,
  onClose,
  students,
  regionName,
  onEdit,
  onDelete,
  onAddNew,
}: StudentListModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
          <div>
            <h2 className="text-h2 font-semibold text-neutral-900">{regionName}</h2>
            <p className="text-small text-neutral-700 mt-1">共 {students.length} 位同学</p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 列表内容 */}
        <div className="flex-1 overflow-y-auto mt-6 space-y-3 pr-2">
          {students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>

        {/* 底部操作 */}
        <div className="pt-6 border-t border-neutral-200 mt-6">
          <button onClick={onAddNew} className="w-full btn-primary flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            <span>添加更多同学</span>
          </button>
        </div>
      </div>
    </div>
  )
}
