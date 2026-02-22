import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import '../styles/PageManager.css'

export default function PageManager({ pages, onUpdatePages, onAddPage, onDeletePage, fields }) {
  const [editingPage, setEditingPage] = useState(null)
  const [editingName, setEditingName] = useState('')

  const addPage = () => {
    if (onAddPage) {
      onAddPage()
    } else {
      // Fallback if onAddPage is not provided
      const newPage = {
        id: Date.now().toString(),
        name: `Page ${pages.length + 1}`,
        order: pages.length
      }
      onUpdatePages([...pages, newPage])
    }
  }

  const deletePage = (pageId) => {
    if (onDeletePage) {
      onDeletePage(pageId)
    } else {
      // Fallback if onDeletePage is not provided
      if (pages.length <= 1) {
        alert('Cannot delete the last page')
        return
      }
      if (confirm('Are you sure you want to delete this page? All fields on this page will be moved to the previous page.')) {
        const newPages = pages.filter(p => p.id !== pageId)
        // Reorder remaining pages
        const reorderedPages = newPages.map((p, idx) => ({ ...p, order: idx }))
        onUpdatePages(reorderedPages)
      }
    }
  }

  const startEdit = (page) => {
    setEditingPage(page.id)
    setEditingName(page.name)
  }

  const saveEdit = () => {
    const updatedPages = pages.map(p => 
      p.id === editingPage ? { ...p, name: editingName } : p
    )
    onUpdatePages(updatedPages)
    setEditingPage(null)
    setEditingName('')
  }

  const cancelEdit = () => {
    setEditingPage(null)
    setEditingName('')
  }

  const getFieldsOnPage = (pageId) => {
    // Count fields on a specific page
    const pageIndex = pages.findIndex(p => p.id === pageId)
    if (pageIndex === -1) return 0
    
    if (pages.length === 1) return fields.filter(f => f.type !== 'page-break').length
    
    let pageBreakCount = 0
    let count = 0
    
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].type === 'page-break') {
        pageBreakCount++
        if (pageBreakCount > pageIndex) break
        continue
      }
      if (pageBreakCount === pageIndex) {
        count++
      } else if (pageIndex === 0 && pageBreakCount === 0) {
        count++
      }
    }
    
    return count
  }

  return (
    <div className="page-manager">
      <div className="page-manager-header">
        <h3>Form Pages</h3>
        <button className="btn btn-secondary btn-sm" onClick={addPage}>
          <Plus size={16} />
          Add Page
        </button>
      </div>
      <div className="pages-list">
        {pages.map((page, idx) => (
          <div key={page.id} className="page-item">
            <div className="page-info">
              {editingPage === page.id ? (
                <div className="page-edit">
                  <input
                    type="text"
                    className="input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                    autoFocus
                  />
                  <button className="icon-btn" onClick={saveEdit}>
                    <Check size={14} />
                  </button>
                  <button className="icon-btn" onClick={cancelEdit}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="page-number">{idx + 1}</span>
                  <span className="page-name">{page.name}</span>
                  <span className="page-fields-count">
                    ({getFieldsOnPage(page.id)} fields)
                  </span>
                </>
              )}
            </div>
            {editingPage !== page.id && (
              <div className="page-actions">
                <button
                  className="icon-btn"
                  onClick={() => startEdit(page)}
                  title="Rename page"
                >
                  <Edit2 size={14} />
                </button>
                {pages.length > 1 && (
                  <button
                    className="icon-btn danger"
                    onClick={() => deletePage(page.id)}
                    title="Delete page"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
