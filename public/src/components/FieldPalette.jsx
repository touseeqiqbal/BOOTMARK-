import { useState } from 'react'
import { useDrag } from 'react-dnd'
import { 
  Type, Mail, Hash, FileText, ChevronDown, 
  Radio, CheckSquare, Calendar, Upload, Star,
  Heading, User, MapPin, Phone, Clock, PenTool,
  Image, Shield, Loader, ShoppingCart, Table,
  Gauge, Minus, ChevronDown as Collapse, FileX,
  CreditCard
} from 'lucide-react'
import '../styles/FieldPalette.css'

const FIELD_CATEGORIES = [
  {
    name: 'BASIC',
    fields: [
      { type: 'short-text', label: 'Short Text', icon: Type },
      { type: 'long-text', label: 'Long Text', icon: FileText },
      { type: 'paragraph', label: 'Paragraph', icon: FileText },
      { type: 'dropdown', label: 'Dropdown', icon: ChevronDown },
      { type: 'single-choice', label: 'Single Choice', icon: Radio },
      { type: 'multiple-choice', label: 'Multiple Choice', icon: CheckSquare },
      { type: 'number', label: 'Number', icon: Hash },
      { type: 'image', label: 'Image', icon: Image },
      { type: 'file', label: 'File Upload', icon: Upload },
      { type: 'time', label: 'Time', icon: Clock },
      { type: 'captcha', label: 'Captcha', icon: Shield },
      { type: 'spinner', label: 'Spinner', icon: Loader },
    ]
  },
  {
    name: 'WIDGETS',
    fields: [
      { type: 'heading', label: 'Heading', icon: Heading },
      { type: 'logo', label: 'Logo', icon: Image },
      { type: 'full-name', label: 'Full Name', icon: User },
      { type: 'email', label: 'Email', icon: Mail },
      { type: 'address', label: 'Address', icon: MapPin },
      { type: 'phone', label: 'Phone', icon: Phone },
      { type: 'date-picker', label: 'Date Picker', icon: Calendar },
      { type: 'appointment', label: 'Appointment', icon: Calendar },
      { type: 'signature', label: 'Signature', icon: PenTool },
      { type: 'fill-blank', label: 'Fill in the Blank', icon: FileText },
    ]
  },
  {
    name: 'PAYMENTS',
    fields: [
      { type: 'product-list', label: 'Product List', icon: ShoppingCart },
    ]
  },
  {
    name: 'SURVEY ELEMENTS',
    fields: [
      { type: 'input-table', label: 'Input Table', icon: Table },
      { type: 'star-rating', label: 'Star Rating', icon: Star },
      { type: 'scale-rating', label: 'Scale Rating', icon: Gauge },
    ]
  },
  {
    name: 'PAGE ELEMENTS',
    fields: [
      { type: 'divider', label: 'Divider', icon: Minus },
      { type: 'section-collapse', label: 'Section Collapse', icon: Collapse },
      { type: 'page-break', label: 'Page Break', icon: FileX },
    ]
  }
]

function DraggableField({ fieldType, label, Icon, onAddField }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'field',
    item: { fieldType },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const handleClick = (e) => {
    e.stopPropagation()
    if (onAddField) {
      onAddField(fieldType)
    }
  }

  return (
    <div
      ref={drag}
      className={`field-palette-item ${isDragging ? 'dragging' : ''}`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <Icon size={18} />
      <span>{label}</span>
    </div>
  )
}

export default function FieldPalette({ onAddField }) {
  const [expandedCategories, setExpandedCategories] = useState({
    'BASIC': true,
    'WIDGETS': true,
    'PAYMENTS': true,
    'SURVEY ELEMENTS': false,
    'PAGE ELEMENTS': false
  })

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }))
  }

  return (
    <div className="field-palette">
      <h3>Form Elements</h3>
      <div className="field-palette-categories">
        {FIELD_CATEGORIES.map((category) => (
          <div key={category.name} className="field-category">
            <div 
              className="category-header"
              onClick={() => toggleCategory(category.name)}
            >
              <span className="category-name">{category.name}</span>
              <span className="category-toggle">
                {expandedCategories[category.name] ? '−' : '+'}
              </span>
            </div>
            {expandedCategories[category.name] && (
              <div className="field-palette-list">
                {category.fields.map(({ type, label, icon: Icon }) => (
                  <DraggableField 
                    key={type} 
                    fieldType={type} 
                    label={label} 
                    Icon={Icon}
                    onAddField={onAddField}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
