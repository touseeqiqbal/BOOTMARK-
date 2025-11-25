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
      if (service.rate !== undefined) {
        sanitized.rate = service.rate
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
        services: sanitizeServices(category.services)
      }))
  }

  if (value?.categoryId) {
    return [{
      categoryId: value.categoryId,
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

  const categorySelections = useMemo(() => normalizeCategoriesValue(value), [value])
  const universalTierValue = value?.universalTier || ''

  const commitValue = useCallback((updatedCategories, updatedUniversalTier = universalTierValue) => {
    if (!onChange) return
    const sanitizedCategories = updatedCategories.map(category => ({
      categoryId: category.categoryId,
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

  const availableCategories = useMemo(() => {
    return SERVICE_CATEGORIES.filter(
      category => !categorySelections.some(selected => selected.categoryId === category.id)
    )
  }, [categorySelections])

  const handleSingleCategoryChange = (categoryId) => {
    if (disabled) return
    if (!categoryId) {
      commitValue([])
      return
    }

    const existing = categorySelections.find(category => category.categoryId === categoryId)
    if (existing) {
      commitValue([existing])
    } else {
      commitValue([{ categoryId, services: [] }])
    }
  }

  const handleAddCategory = () => {
    if (disabled || !pendingCategory) return
    commitValue([
      ...categorySelections,
      { categoryId: pendingCategory, services: [] }
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
    const categoryDefinition = SERVICE_CATEGORIES.find(cat => cat.id === categoryId)
    if (!categoryDefinition) return
    const defaultTier = categoryDefinition.complexityTiers?.[0]?.id || 'basic'

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
          complexityTier: defaultTier
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

  const renderServiceList = (categorySelection, categoryDefinition) => {
    if (!categoryDefinition) {
      return (
        <p className="service-field-help">
          This category is no longer available.
        </p>
      )
    }

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
                  <span className="service-checkbox-text">{service.name}</span>
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
                  </div>
                )}
              </div>
            )
          })}
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
            {categorySelections.length === 0 && (
              <p className="service-field-help">
                Add one or more categories to start selecting services.
              </p>
            )}
          </>
        ) : (
          <select
            value={singleCategoryId}
            onChange={(e) => handleSingleCategoryChange(e.target.value)}
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
        )}
      </div>

      {categorySelections.length > 0 ? (
        <div className="service-category-cards">
          {categorySelections.map(category => {
            const categoryDefinition = SERVICE_CATEGORIES.find(cat => cat.id === category.categoryId)
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

