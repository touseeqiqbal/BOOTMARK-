import { useDrag, useDrop } from 'react-dnd'
import { GripVertical, Trash2, Settings } from 'lucide-react'
import FieldRenderer from './FieldRenderer'
import '../styles/FormField.css'

export default function FormField({
  field,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onMove
}) {
  const [{ isDragging }, drag] = useDrag({
    type: 'form-field',
    item: { id: field.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [{ isOver }, drop] = useDrop({
    accept: 'form-field',
    hover: (draggedItem) => {
      if (draggedItem.id !== field.id) {
        onMove(draggedItem.index, index)
        draggedItem.index = index
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`form-field-wrapper ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''}`}
      onClick={onSelect}
    >
      <div className="field-handle" onClick={(e) => e.stopPropagation()}>
        <GripVertical size={16} />
      </div>
      
      <div className="field-content">
        <FieldRenderer field={field} />
      </div>

      <div className="field-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="icon-btn"
          onClick={onSelect}
          title="Edit field"
        >
          <Settings size={16} />
        </button>
        <button
          className="icon-btn danger"
          onClick={() => onDelete(field.id)}
          title="Delete field"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
