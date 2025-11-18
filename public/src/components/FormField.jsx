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

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: 'form-field',
    item: () => {
      return { id: field.id, index }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [{ isOver }, drop] = useDrop({
    accept: 'form-field',
    hover: (draggedItem, monitor) => {
      if (!draggedItem || draggedItem.id === field.id) return
      if (!monitor.isOver({ shallow: true })) return
      
      const dragIndex = draggedItem.index
      const hoverIndex = index

      if (dragIndex === hoverIndex) return

      // Perform the move
      onMove(dragIndex, hoverIndex)
      
      // Update the dragged item's index
      draggedItem.index = hoverIndex
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  })

  // Handle click on wrapper - select field if not dragging
  const handleClick = (e) => {
    // Don't select if clicking on handle, actions, or interactive elements
    if (isDragging) return
    
    if (!e.target.closest('.field-handle') && 
        !e.target.closest('.field-actions') &&
        e.target.tagName !== 'BUTTON' &&
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA' &&
        e.target.tagName !== 'SELECT') {
      onSelect()
    }
  }

  // Attach drag to handle only, drop to wrapper
  const handleDragRef = (node) => {
    drag(node)
  }

  const wrapperDropRef = (node) => {
    drop(node)
    // Set wrapper as drag preview when dragging starts
    if (node && !isDragging) {
      dragPreview(node)
    }
  }

  return (
    <div
      ref={wrapperDropRef}
      className={`form-field-wrapper ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''}`}
      onClick={handleClick}
      style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
    >
      <div 
        ref={handleDragRef}
        className="field-handle" 
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          // Don't prevent default - allow drag to start
          e.stopPropagation()
        }}
        style={{ cursor: 'grab' }}
      >
        <GripVertical size={16} />
      </div>
      
      <div className="field-content">
        <FieldRenderer field={field} />
      </div>

      <div className="field-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onSelect()
          }}
          title="Edit field"
        >
          <Settings size={16} />
        </button>
        <button
          className="icon-btn danger"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            if (window.confirm('Are you sure you want to delete this field?')) {
              onDelete(field.id)
            }
          }}
          title="Delete field"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
