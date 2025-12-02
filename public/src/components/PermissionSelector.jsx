import { useState, useEffect } from 'react'
import { X, CheckCircle } from 'lucide-react'
import api from '../utils/api'
import '../styles/PermissionSelector.css'

export default function PermissionSelector({ 
  isOpen, 
  onClose, 
  onConfirm, 
  selectedPermissions = [],
  title = "Select Permissions"
}) {
  const [permissionsByCategory, setPermissionsByCategory] = useState({})
  const [availablePermissions, setAvailablePermissions] = useState({})
  const [selected, setSelected] = useState(selectedPermissions)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchPermissions()
      setSelected(selectedPermissions)
    }
  }, [isOpen, selectedPermissions])

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const response = await api.get('/businesses/permissions/available')
      setAvailablePermissions(response.data.permissions || {})
      setPermissionsByCategory(response.data.byCategory || {})
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePermission = (permissionId) => {
    setSelected(prev => 
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    )
  }

  const handleSelectAll = (category) => {
    const categoryPermissions = permissionsByCategory[category] || []
    const categoryIds = categoryPermissions.map(p => p.id)
    const allSelected = categoryIds.every(id => selected.includes(id))
    
    if (allSelected) {
      setSelected(prev => prev.filter(p => !categoryIds.includes(p)))
    } else {
      setSelected(prev => [...new Set([...prev, ...categoryIds])])
    }
  }

  const handleSelectAllPermissions = () => {
    const allIds = Object.keys(availablePermissions)
    const allSelected = allIds.every(id => selected.includes(id))
    
    if (allSelected) {
      setSelected([])
    } else {
      setSelected(allIds)
    }
  }

  const handleConfirm = () => {
    onConfirm(selected)
    onClose()
  }

  if (!isOpen) return null

  const categories = Object.keys(permissionsByCategory)
  const allSelected = Object.keys(availablePermissions).length > 0 && 
    Object.keys(availablePermissions).every(id => selected.includes(id))

  return (
    <div className="permission-selector-overlay" onClick={onClose}>
      <div className="permission-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="permission-selector-header">
          <h2>{title}</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="permission-selector-content">
          {loading ? (
            <div className="loading">Loading permissions...</div>
          ) : (
            <>
              <div className="permission-selector-actions">
                <button 
                  className="btn btn-link btn-sm"
                  onClick={handleSelectAllPermissions}
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
                <span className="selected-count">
                  {selected.length} permission{selected.length !== 1 ? 's' : ''} selected
                </span>
              </div>

              <div className="permissions-grid">
                {categories.map(category => {
                  const categoryPerms = permissionsByCategory[category] || []
                  const selectedInCategory = categoryPerms.filter(p => selected.includes(p.id))
                  const allCategorySelected = categoryPerms.length > 0 && 
                    selectedInCategory.length === categoryPerms.length
                  
                  return (
                    <div key={category} className="permission-category">
                      <div className="category-header">
                        <h4>{category}</h4>
                        <button
                          className="btn btn-link btn-sm"
                          onClick={() => handleSelectAll(category)}
                        >
                          {allCategorySelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="permissions-list">
                        {categoryPerms.map(permission => {
                          const isSelected = selected.includes(permission.id)
                          return (
                            <label
                              key={permission.id}
                              className={`permission-item ${isSelected ? 'selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleTogglePermission(permission.id)}
                              />
                              <div className="permission-content">
                                <strong>{permission.name}</strong>
                                <span>{permission.description}</span>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="permission-selector-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleConfirm}>
            <CheckCircle size={18} />
            Confirm ({selected.length})
          </button>
        </div>
      </div>
    </div>
  )
}

