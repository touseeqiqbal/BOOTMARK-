import { useMemo, useState, useEffect, useCallback } from 'react'
import { useAuth } from '../utils/AuthContext'
import { SERVICE_CATEGORIES, UNIVERSAL_COMPLEXITY_TIERS } from '../data/serviceCategories'
import '../styles/ServiceCategorySelector.css'

const sanitizeServices = (services = []) => {
  if (!Array.isArray(services)) {
    return []
  }
  return services
    .filter(service => service && service.serviceId)
    .map(service => {
      const sanitized = {
        serviceId: service.serviceId,
        complexityTier: service.complexityTier || 'basic'
      }
      // Always include rate, even if 0 or empty, so invoice generator can use it
      if (service.rate !== undefined && service.rate !== null) {
        sanitized.rate = service.rate === '' ? 0 : (Number(service.rate) || 0)
      } else {
        sanitized.rate = 0 // Default to 0 if not set
      }
      if (service.customLabel) {
        sanitized.customLabel = service.customLabel
      }
      if (service.isCustom) {
        sanitized.isCustom = true
      }
      if (service.serviceLabel) {
        sanitized.serviceLabel = service.serviceLabel
      }
      if (service.quantity !== undefined && service.quantity !== null) {
        sanitized.quantity = service.quantity === '' ? 1 : (Number(service.quantity) || 1)
      } else {
        sanitized.quantity = 1 // Default to 1 if not set
      }
      return sanitized
    })
}

const normalizeCategoriesValue = (value) => {
  if (value?.categories && Array.isArray(value.categories) && value.categories.length > 0) {
    return value.categories
      .filter(category => category && category.categoryId)
      .map(category => ({
        categoryId: category.categoryId,
        categoryName: category.categoryName || category.name || '',
        services: sanitizeServices(category.services)
      }))
  }

  if (value?.categoryId) {
    return [{
      categoryId: value.categoryId,
      categoryName: value.categoryName || '',
      services: sanitizeServices(value.services)
    }]
  }

  return []
}

export default function ServiceCategorySelector({ field = {}, value, onChange, disabled }) {
  // Extended value structure:
  // {
  //   categories: [{ categoryId: string, services: [{ serviceId, complexityTier, rate? }] }],
  //   categoryId: string (legacy),
  //   services: array (legacy),
  //   universalTier: string
  // }
  const { user } = useAuth()
  const isAdmin = user?.isAdmin === true || user?.role === 'admin' || field.isAdmin === true
  const allowMultipleCategories = field?.allowMultipleCategories !== false
  const canEditRates = isAdmin || field?.enablePriceInput

  const [pendingCategory, setPendingCategory] = useState('')
  const [customServiceInputs, setCustomServiceInputs] = useState({})

  const categorySelections = useMemo(() => normalizeCategoriesValue(value), [value])
  const universalTierValue = value?.universalTier || ''

  const commitValue = useCallback((updatedCategories, updatedUniversalTier = universalTierValue) => {
    if (!onChange) return
    const sanitizedCategories = updatedCategories.map(category => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName || '',
      services: sanitizeServices(category.services)
    }))
    const primaryCategory = sanitizedCategories[0] || {}
    onChange({
      ...(value || {}),
      categories: sanitizedCategories,
      categoryId: primaryCategory.categoryId || '',
      services: primaryCategory.services || [],
      universalTier: updatedUniversalTier
    })
  }, [onChange, universalTierValue, value])

  useEffect(() => {
    if (!allowMultipleCategories && categorySelections.length > 1) {
      commitValue([categorySelections[0]])
    }
  }, [allowMultipleCategories, categorySelections, commitValue])

  const categorySource = useMemo(() => {
    // If customCategories is explicitly defined (even if empty array), use it
    if (field?.hasOwnProperty('customCategories')) {
      if (Array.isArray(field.customCategories) && field.customCategories.length > 0) {
        return field.customCategories.map(category => ({
          ...category,
          services: Array.isArray(category.services)
            ? category.services.map(service => ({
                id: service.id || service.serviceId || `service-${Math.random().toString(36).slice(2, 8)}`,
                serviceId: service.serviceId || service.id || `service-${Math.random().toString(36).slice(2, 8)}`,
                name: service.name || service.customLabel || 'Custom Service',
              }))
            : [],
          complexityTiers: category.complexityTiers && category.complexityTiers.length > 0
            ? category.complexityTiers
            : UNIVERSAL_COMPLEXITY_TIERS,
        }))
      }
      // If customCategories is explicitly set to empty array, return empty (user wants to add manually)
      return []
    }
    // If customCategories is not defined (e.g., from templates), use default categories
    return SERVICE_CATEGORIES
  }, [field?.customCategories])

  const availableCategories = useMemo(() => {
    return categorySource.filter(
      category => !categorySelections.some(selected => selected.categoryId === category.id)
    )
  }, [categorySelections, categorySource])

  const handleSingleCategoryChange = (categoryId) => {
    if (disabled) return
    if (!categoryId) {
      commitValue([])
      return
    }

    const existing = categorySelections.find(category => category.categoryId === categoryId)
    const categoryDefinition = categorySource.find(cat => cat.id === categoryId)
    if (existing) {
      commitValue([existing])
    } else {
      commitValue([{
        categoryId,
        categoryName: categoryDefinition?.name || '',
        services: []
      }])
    }
  }

  const handleAddCategory = () => {
    if (disabled || !pendingCategory) return
    const categoryDefinition = categorySource.find(cat => cat.id === pendingCategory)
    commitValue([
      ...categorySelections,
      { categoryId: pendingCategory, categoryName: categoryDefinition?.name || '', services: [] }
    ])
    setPendingCategory('')
  }

  const handleRemoveCategory = (categoryId) => {
    if (disabled) return
    const filtered = categorySelections.filter(category => category.categoryId !== categoryId)
    commitValue(filtered)
  }

  const handleServiceToggle = (categoryId, serviceId) => {
    if (disabled) return
    const categoryDefinition = categorySource.find(cat => cat.id === categoryId)
    if (!categoryDefinition) return
    const defaultTier = categoryDefinition.complexityTiers?.[0]?.id || 'basic'
    const serviceDefinition = categoryDefinition.services.find(service => service.id === serviceId)

    commitValue(
      categorySelections.map(category => {
        if (category.categoryId !== categoryId) return category
        const existingServices = category.services || []
        const existing = existingServices.find(service => service.serviceId === serviceId)

        if (existing) {
          return {
            ...category,
            services: existingServices.filter(service => service.serviceId !== serviceId)
          }
        }

        const newService = {
          serviceId,
          complexityTier: defaultTier,
          serviceLabel: serviceDefinition?.name || serviceId
        }

        if (canEditRates) {
          newService.rate = 0
        }

        return {
          ...category,
          services: [...existingServices, newService]
        }
      })
    )
  }

  const handleServiceComplexityChange = (categoryId, serviceId, complexityTier) => {
    if (disabled) return
    commitValue(
      categorySelections.map(category => {
        if (category.categoryId !== categoryId) return category
        return {
          ...category,
          services: (category.services || []).map(service =>
            service.serviceId === serviceId
              ? { ...service, complexityTier }
              : service
          )
        }
      })
    )
  }

  const handleServiceRateChange = (categoryId, serviceId, rate) => {
    if (disabled || !canEditRates) return
    const rateValue = rate === '' ? '' : parseFloat(rate) || 0
    commitValue(
      categorySelections.map(category => {
        if (category.categoryId !== categoryId) return category
        return {
          ...category,
          services: (category.services || []).map(service =>
            service.serviceId === serviceId
              ? { ...service, rate: rateValue === '' ? '' : rateValue }
              : service
          )
        }
      })
    )
  }

  const handleUniversalTierChange = (tierId) => {
    if (disabled) return
    commitValue(categorySelections, tierId)
  }

  const handleServiceLabelChange = (categoryId, serviceId, label) => {
    commitValue(
      categorySelections.map(category => {
        if (category.categoryId !== categoryId) return category
        return {
          ...category,
          services: (category.services || []).map(service =>
            service.serviceId === serviceId
              ? { ...service, customLabel: label, serviceLabel: label || service.serviceLabel }
              : service
          )
        }
      })
    )
  }

  const handleAddCustomService = (categoryId) => {
    if (disabled) return
    const label = (customServiceInputs[categoryId] || '').trim()
    if (!label) return

    const categoryDefinition = categorySource.find(cat => cat.id === categoryId)
    const defaultTier = categoryDefinition?.complexityTiers?.[0]?.id || 'basic'

    commitValue(
      categorySelections.map(category => {
        if (category.categoryId !== categoryId) return category
        return {
          ...category,
          services: [
            ...(category.services || []),
            {
              serviceId: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              customLabel: label,
              serviceLabel: label,
              isCustom: true,
              complexityTier: defaultTier,
              rate: canEditRates ? 0 : undefined,
            }
          ]
        }
      })
    )

    setCustomServiceInputs(prev => ({ ...prev, [categoryId]: '' }))
  }

  const handleRemoveCustomService = (categoryId, serviceId) => {
    commitValue(
      categorySelections.map(category => {
        if (category.categoryId !== categoryId) return category
        return {
          ...category,
          services: (category.services || []).filter(service => service.serviceId !== serviceId)
        }
      })
    )
  }

  const getServiceDisplayName = (categoryDefinition, service) => {
    if (service.customLabel) return service.customLabel
    if (service.isCustom) return 'Custom Service'
    const builtIn = categoryDefinition?.services?.find(s => s.id === service.serviceId)
    return builtIn?.name || service.serviceId
  }

  const renderServiceList = (categorySelection, categoryDefinition) => {
    if (!categoryDefinition) {
      return (
        <p className="service-field-help">
          This category is no longer available.
        </p>
      )
    }

    const selectedServices = categorySelection.services || []
    const customServices = selectedServices.filter(service => service.isCustom)

    return (
      <div className="service-services-field">
        <label className="service-field-label">
          Services in {categoryDefinition.name}
        </label>
        <div className="service-checkboxes">
          {categoryDefinition.services.map(service => {
            const serviceData = (categorySelection.services || []).find(
              selected => selected.serviceId === service.id
            )
            const isSelected = Boolean(serviceData)
            const shouldShowRateField = canEditRates || (
              serviceData?.rate !== undefined &&
              serviceData?.rate !== null &&
              serviceData?.rate !== 0 &&
              serviceData?.rate !== ''
            )

            return (
              <div key={service.id} className="service-checkbox-item">
                <label className="service-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleServiceToggle(categoryDefinition.id, service.id)}
                    disabled={disabled}
                    className="service-checkbox"
                  />
                  <span className="service-checkbox-text">
                    {serviceData?.customLabel || service.name}
                  </span>
                </label>

                {isSelected && (
                  <div className="service-options-row">
                    {categoryDefinition.complexityTiers && categoryDefinition.complexityTiers.length > 0 && (
                      <select
                        value={serviceData?.complexityTier || categoryDefinition.complexityTiers[0].id}
                        onChange={(e) => handleServiceComplexityChange(categoryDefinition.id, service.id, e.target.value)}
                        disabled={disabled}
                        className="service-complexity-dropdown"
                      >
                        {categoryDefinition.complexityTiers.map(tier => (
                          <option key={tier.id} value={tier.id}>
                            {tier.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {shouldShowRateField && (
                      <div className="service-rate-field">
                        <label className="service-rate-label">Rate ($)</label>
                        <input
                          type="number"
                          value={serviceData?.rate ?? ''}
                          onChange={(e) => handleServiceRateChange(categoryDefinition.id, service.id, e.target.value)}
                          disabled={disabled || !canEditRates}
                          className="service-rate-input"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          readOnly={!canEditRates}
                          style={!canEditRates ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                        />
                      </div>
                    )}
                    <div className="service-label-field">
                      <label className="service-rate-label">Display Label</label>
                      <input
                        type="text"
                        value={serviceData?.customLabel || service.name}
                        onChange={(e) => handleServiceLabelChange(categoryDefinition.id, service.id, e.target.value)}
                        disabled={disabled}
                        className="service-rate-input"
                        placeholder="Enter custom label"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {customServices.length > 0 && (
            <div className="service-custom-group">
              <p className="service-field-label">Custom Services</p>
              {customServices.map(service => (
                <div key={service.serviceId} className="custom-service-row">
                  <input
                    type="text"
                    className="service-rate-input"
                    value={service.customLabel || ''}
                    onChange={(e) => handleServiceLabelChange(categoryDefinition.id, service.serviceId, e.target.value)}
                    placeholder="Custom service name"
                    disabled={disabled}
                  />
                  <select
                    value={service.complexityTier || categoryDefinition.complexityTiers?.[0]?.id}
                    onChange={(e) => handleServiceComplexityChange(categoryDefinition.id, service.serviceId, e.target.value)}
                    disabled={disabled}
                    className="service-complexity-dropdown"
                  >
                    {categoryDefinition.complexityTiers?.map(tier => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name}
                      </option>
                    ))}
                  </select>
                  {canEditRates && (
                    <input
                      type="number"
                      value={service.rate ?? ''}
                      onChange={(e) => handleServiceRateChange(categoryDefinition.id, service.serviceId, e.target.value)}
                      className="service-rate-input"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      disabled={disabled}
                    />
                  )}
                  <button
                    type="button"
                    className="service-category-remove-btn"
                    onClick={() => handleRemoveCustomService(categoryDefinition.id, service.serviceId)}
                    disabled={disabled}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="service-custom-add">
            <input
              type="text"
              className="service-rate-input"
              placeholder="Add custom service"
              value={customServiceInputs[categoryDefinition.id] || ''}
              onChange={(e) => setCustomServiceInputs(prev => ({ ...prev, [categoryDefinition.id]: e.target.value }))}
              disabled={disabled}
            />
            <button
              type="button"
              className="service-category-add-btn"
              onClick={() => handleAddCustomService(categoryDefinition.id)}
              disabled={disabled || !(customServiceInputs[categoryDefinition.id] || '').trim()}
            >
              + Add custom service
            </button>
          </div>
        </div>
      </div>
    )
  }

  const singleCategoryId = categorySelections[0]?.categoryId || ''

  return (
    <div className="service-category-selector">
      <div className="service-category-field">
        <label className="service-field-label">
          Service Category{allowMultipleCategories ? ' (add as many as needed)' : ''}{' '}
          {field.required && <span className="required">*</span>}
        </label>

        {allowMultipleCategories ? (
          <>
            <div className="service-category-add-row">
              <select
                value={pendingCategory}
                onChange={(e) => setPendingCategory(e.target.value)}
                disabled={disabled || availableCategories.length === 0}
                className="service-category-dropdown"
              >
                <option value="">Select a category</option>
                {availableCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="service-category-add-btn"
                onClick={handleAddCategory}
                disabled={disabled || !pendingCategory}
              >
                + Add Category
              </button>
            </div>
            {categorySelections.length === 0 && availableCategories.length === 0 && (
              <p className="service-field-help" style={{ color: '#6b7280' }}>
                No categories available. Please add categories in the form field settings first.
              </p>
            )}
            {categorySelections.length === 0 && availableCategories.length > 0 && (
              <p className="service-field-help">
                Add one or more categories to start selecting services.
              </p>
            )}
          </>
        ) : (
          <>
            <select
              value={singleCategoryId}
              onChange={(e) => handleSingleCategoryChange(e.target.value)}
              disabled={disabled || categorySource.length === 0}
              required={field.required}
              className="service-category-dropdown"
            >
              <option value="">{categorySource.length === 0 ? 'No categories available' : 'Select a category'}</option>
              {categorySource.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categorySource.length === 0 && (
              <p className="service-field-help" style={{ marginTop: '8px', color: '#6b7280' }}>
                No categories available. Please add categories in the form field settings first.
              </p>
            )}
          </>
        )}
      </div>

      {categorySelections.length > 0 ? (
        <div className="service-category-cards">
          {categorySelections.map(category => {
            const categoryDefinition = categorySource.find(cat => cat.id === category.categoryId)
            if (!categoryDefinition) return null
            return (
              <div key={category.categoryId} className="service-category-card">
                <div className="service-category-card-header">
                  <div>
                    <p className="service-category-card-title">{categoryDefinition.name}</p>
                    <p className="service-category-card-subtitle">
                      {categoryDefinition.services.length} available services
                    </p>
                  </div>
                  {allowMultipleCategories && (
                    <button
                      type="button"
                      className="service-category-remove-btn"
                      onClick={() => handleRemoveCategory(category.categoryId)}
                      disabled={disabled}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {renderServiceList(category, categoryDefinition)}
              </div>
            )
          })}
        </div>
      ) : (
        !allowMultipleCategories && (
          <div className="service-category-empty-state">
            <p>Select a category above to start choosing services.</p>
          </div>
        )
      )}

      <div className="service-universal-tier-field">
        <label className="service-field-label">
          Overall Job Complexity / Size Tier
        </label>
        <select
          value={universalTierValue}
          onChange={(e) => handleUniversalTierChange(e.target.value)}
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
          Use this to quickly log the overall job size/complexity for billing purposes.
        </p>
      </div>
    </div>
  )
}

