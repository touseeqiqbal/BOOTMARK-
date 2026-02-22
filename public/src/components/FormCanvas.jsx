import { useDrop } from 'react-dnd'
import { Layout } from 'lucide-react'
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
            <div className="empty-icon-container" style={{
              width: '80px',
              height: '80px',
              background: 'var(--bg-secondary)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '10px',
              color: 'var(--primary-400)'
            }}>
              <Layout size={40} />
            </div>
            <p>Your canvas is empty</p>
            <p className="hint">Drag elements from the left panel or click them to start building your professional form.</p>
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
