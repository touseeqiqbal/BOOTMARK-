import { useDrop } from 'react-dnd'
import FormField from './FormField'
import '../styles/FormCanvas.css'

export default function FormCanvas({
  fields,
  selectedField,
  onSelectField,
  onUpdateField,
  onDeleteField,
  onMoveField,
  currentPage = 0,
  pages = []
}) {
  const [{ isOver }, drop] = useDrop({
    accept: 'field',
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  return (
    <div className="form-canvas-container">
      <div className="form-canvas" ref={drop}>
        {fields.length === 0 ? (
          <div className="empty-canvas">
            <p>Drag fields from the left panel or click to add them</p>
            <p className="hint">Start building your form!</p>
          </div>
        ) : (
          <div className={`fields-list ${isOver ? 'drag-over' : ''}`}>
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                field={field}
                index={index}
                isSelected={selectedField?.id === field.id}
                onSelect={() => onSelectField(field)}
                onUpdate={(updates) => onUpdateField(field.id, updates)}
                onDelete={() => onDeleteField(field.id)}
                onMove={onMoveField}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
