import { useState, useEffect } from 'react'
import { useAuth } from '../utils/AuthContext'
import { SERVICE_CATEGORIES, UNIVERSAL_COMPLEXITY_TIERS } from '../data/serviceCategories'
import '../styles/ServiceCategorySelector.css'

export default function ServiceCategorySelector({ field, value, onChange, disabled }) {
  // Value structure: { categoryId: string, services: [{ serviceId: string, complexityTier: string, rate?: number }], universalTier: string }
  const { user } = useAuth()
  const isAdmin = user?.isAdmin === true || user?.role === 'admin' || field.isAdmin === true
  
  const [selectedCategory, setSelectedCategory] = useState(value?.categoryId || '')
  const [selectedServices, setSelectedServices] = useState(value?.services || [])
  const [universalTier, setUniversalTier] = useState(value?.universalTier || '')

  const currentCategory = SERVICE_CATEGORIES.find(cat => cat.id === selectedCategory)

  // Update parent when values change
  useEffect(() => {
    if (onChange) {
      onChange({
        categoryId: selectedCategory,
        services: selectedServices,
        universalTier: universalTier
      })
    }
  }, [selectedCategory, selectedServices, universalTier, onChange])

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId)
    // Clear services when category changes
    setSelectedServices([])
  }

  const handleServiceToggle = (serviceId) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.serviceId === serviceId)
      if (exists) {
        // Remove service
        return prev.filter(s => s.serviceId !== serviceId)
      } else {
        // Add service with default complexity tier and rate (if admin)
        const service = currentCategory?.services.find(s => s.id === serviceId)
        const defaultTier = currentCategory?.complexityTiers?.[0]?.id || 'basic'
        const newService = { serviceId, complexityTier: defaultTier }
        // Only add rate field if admin (rate will be editable)
        if (isAdmin) {
          newService.rate = 0
        }
        return [...prev, newService]
      }
    })
  }

  const handleServiceComplexityChange = (serviceId, complexityTier) => {
    setSelectedServices(prev => 
      prev.map(s => 
        s.serviceId === serviceId 
          ? { ...s, complexityTier }
          : s
      )
    )
  }

  const handleServiceRateChange = (serviceId, rate) => {
    // Parse rate as number, allow empty string for clearing
    const rateValue = rate === '' ? 0 : parseFloat(rate) || 0
    setSelectedServices(prev => 
      prev.map(s => 
        s.serviceId === serviceId 
          ? { ...s, rate: rateValue }
          : s
      )
    )
  }

  const getServiceName = (serviceId) => {
    return currentCategory?.services.find(s => s.id === serviceId)?.name || serviceId
  }

  return (
    <div className="service-category-selector">
      {/* Category Selection */}
      <div className="service-category-field">
        <label className="service-field-label">
          Service Category {field.required && <span className="required">*</span>}
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          disabled={disabled}
          required={field.required}
          className="service-category-dropdown"
        >
          <option value="">Select a category</option>
          {SERVICE_CATEGORIES.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Services Selection (only show if category is selected) */}
      {currentCategory && (
        <div className="service-services-field">
          <label className="service-field-label">
            Services (select all that apply)
          </label>
          <div className="service-checkboxes">
            {currentCategory.services.map(service => {
              const isSelected = selectedServices.some(s => s.serviceId === service.id)
              const serviceData = selectedServices.find(s => s.serviceId === service.id)
              
              return (
                <div key={service.id} className="service-checkbox-item">
                  <label className="service-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleServiceToggle(service.id)}
                      disabled={disabled}
                      className="service-checkbox"
                    />
                    <span className="service-checkbox-text">{service.name}</span>
                  </label>
                  
                  {/* Complexity Tier and Rate for this service */}
                  {isSelected && (
                    <div className="service-options-row">
                      {currentCategory.complexityTiers && currentCategory.complexityTiers.length > 0 && (
                        <select
                          value={serviceData?.complexityTier || currentCategory.complexityTiers[0].id}
                          onChange={(e) => handleServiceComplexityChange(service.id, e.target.value)}
                          disabled={disabled}
                          className="service-complexity-dropdown"
                        >
                          {currentCategory.complexityTiers.map(tier => (
                            <option key={tier.id} value={tier.id}>
                              {tier.name}
                            </option>
                          ))}
                        </select>
                      )}
                      
                      {/* Rate field - editable for admin, read-only display for others */}
                      {(isAdmin || (serviceData?.rate !== undefined && serviceData?.rate !== null && serviceData?.rate !== 0)) && (
                        <div className="service-rate-field">
                          <label className="service-rate-label">Rate ($)</label>
                          <input
                            type="number"
                            value={serviceData?.rate ?? ''}
                            onChange={(e) => handleServiceRateChange(service.id, e.target.value)}
                            disabled={disabled || !isAdmin}
                            className="service-rate-input"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            readOnly={!isAdmin}
                            style={!isAdmin ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Universal Complexity Tier */}
      <div className="service-universal-tier-field">
        <label className="service-field-label">
          Overall Job Complexity / Size Tier
        </label>
        <select
          value={universalTier}
          onChange={(e) => setUniversalTier(e.target.value)}
          disabled={disabled}
          className="service-universal-tier-dropdown"
        >
          <option value="">Select complexity tier</option>
          {UNIVERSAL_COMPLEXITY_TIERS.map(tier => (
            <option key={tier.id} value={tier.id}>
              {tier.name}
            </option>
          ))}
        </select>
        <p className="service-field-help">
          Use this to quickly log the overall job size/complexity for billing purposes
        </p>
      </div>
    </div>
  )
}

