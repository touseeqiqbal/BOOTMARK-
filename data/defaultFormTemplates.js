function baseField(type, overrides = {}) {
  return {
    type,
    required: false,
    ...overrides,
  }
}

module.exports = [
  {
    id: 'quick-job-diary',
    title: 'Quick Job Diary',
    description: 'Log onsite visits with customer details, services performed, labor time, materials, and payment notes.',
    accent: '#2563eb',
    fields: [
      baseField('heading', { label: 'Job Summary', content: 'Service Visit Log' }),
      baseField('date-picker', { label: 'Service Date', required: true }),
      baseField('full-name', { label: 'Customer Name', required: true }),
      baseField('phone', { label: 'Customer Phone' }),
      baseField('service-category', {
        label: 'Services Performed',
        required: true,
        allowMultipleCategories: true,
        enablePriceInput: true,
      }),
      baseField('number', { label: 'Hours On Site', placeholder: 'e.g. 2.5', step: 0.25 }),
      baseField('multiple-choice', {
        label: 'Payment Method',
        options: ['Cash', 'Card', 'Check', 'Invoice Later'],
        allowOther: true,
      }),
      baseField('long-text', {
        label: 'Notes / Materials Used',
        placeholder: 'Add material usage, status updates, or follow-up reminders',
      }),
      baseField('number', { label: 'Amount Due ($)', placeholder: '0.00', step: 0.01, required: true }),
      baseField('single-choice', {
        label: 'Payment Status',
        options: ['Unpaid', 'Partially Paid', 'Paid in Full'],
        required: true,
      }),
      baseField('signature', { label: 'Customer Signature (optional)' }),
    ],
    settings: {
      confirmationMessage: 'Entry saved successfully.',
      templateVersion: '1.0.0',
    },
  },
  {
    id: 'plumbing-service-ticket',
    title: 'Plumbing Service Ticket',
    description: 'Capture diagnostics, replaced parts, leak checks, and collect a signature for plumbing work.',
    accent: '#0f766e',
    fields: [
      baseField('heading', { label: 'Plumbing Work Order', content: 'Service Summary' }),
      baseField('date-picker', { label: 'Visit Date', required: true }),
      baseField('short-text', { label: 'Work Order #', placeholder: 'AUTO or custom' }),
      baseField('full-name', { label: 'Customer / Site Contact', required: true }),
      baseField('address', { label: 'Service Address', required: true }),
      baseField('service-category', { label: 'Service Category', allowMultipleCategories: false, enablePriceInput: true, required: true }),
      baseField('long-text', { label: 'Issue Description / Diagnostics', required: true }),
      baseField('long-text', { label: 'Repairs Completed', placeholder: 'Detail parts used, tests performed, etc.' }),
      baseField('single-choice', {
        label: 'Leak / Pressure Test Result',
        options: ['Pass', 'Minor seep (monitor)', 'Fail'],
      }),
      baseField('number', { label: 'Labor Hours', step: 0.25, required: true }),
      baseField('number', { label: 'Materials Cost ($)', step: 0.01 }),
      baseField('number', { label: 'Total Due ($)', step: 0.01, required: true }),
      baseField('single-choice', {
        label: 'Payment Status',
        options: ['Collected on Site', 'Pending Approval', 'Invoice Customer'],
      }),
      baseField('signature', { label: 'Customer Acknowledgement' }),
    ],
    settings: {
      templateVersion: '1.0.0',
    },
  },
  {
    id: 'landscape-maintenance',
    title: 'Landscape Maintenance Checklist',
    description: 'Track recurring landscaping visits with checklists, before/after photos, and upsell notes.',
    accent: '#9333ea',
    fields: [
      baseField('heading', { label: 'Weekly Maintenance', content: 'Visit Checklist' }),
      baseField('date-picker', { label: 'Visit Date', required: true }),
      baseField('full-name', { label: 'Property Owner / Manager', required: true }),
      baseField('service-category', { label: 'Primary Service Category', allowMultipleCategories: true }),
      baseField('multiple-choice', {
        label: 'Tasks Completed',
        options: ['Mowing', 'Trimming', 'Edging', 'Cleanup', 'Mulch Touch-Up', 'Irrigation Check'],
        allowOther: true,
        required: true,
      }),
      baseField('multiple-choice', {
        label: 'Areas Needing Attention',
        options: ['Weeds', 'Overgrowth', 'Irrigation leak', 'Pests', 'Brown spots'],
        allowOther: true,
      }),
      baseField('image', { label: 'Before Photo' }),
      baseField('image', { label: 'After Photo' }),
      baseField('long-text', { label: 'Notes & Follow Ups' }),
      baseField('single-choice', {
        label: 'Client Notified',
        options: ['Yes - onsite', 'Yes - phone/text', 'No'],
      }),
    ],
    settings: {
      confirmationMessage: 'Maintenance visit recorded.',
      templateVersion: '1.0.0',
    },
  },
  {
    id: 'irrigation-startup',
    title: 'Irrigation Startup Checklist',
    description: 'Document spring startups with zone checks, leaks, controller programming, and upsell opportunities.',
    accent: '#059669',
    fields: [
      baseField('heading', { label: 'Irrigation Startup', content: 'Season Kickoff' }),
      baseField('date-picker', { label: 'Startup Date', required: true }),
      baseField('full-name', { label: 'Client / Property', required: true }),
      baseField('service-category', { label: 'Irrigation Tasks', allowMultipleCategories: true }),
      baseField('input-table', {
        label: 'Zone Checklist',
        rows: 4,
        columns: 2,
        rowHeaders: ['Front Yard', 'Back Yard', 'Beds', 'Drip Zones'],
        columnHeaders: ['Pass', 'Notes'],
      }),
      baseField('single-choice', {
        label: 'Controller Updated',
        options: ['Yes', 'Needs Replacement', 'Client Declined'],
      }),
      baseField('multiple-choice', {
        label: 'Issues Found',
        options: ['Leaking head', 'Clogged nozzle', 'Broken pipe', 'Valve sticking'],
        allowOther: true,
      }),
      baseField('long-text', { label: 'Recommendations / Quotes' }),
      baseField('number', { label: 'Service Fee ($)', step: 0.01, required: true }),
    ],
    settings: {
      templateVersion: '1.0.0',
    },
  },
  {
    id: 'snow-event-log',
    title: 'Snow Event Log',
    description: 'Record each plow/salt event with trigger times, crew notes, and material usage.',
    accent: '#1d4ed8',
    fields: [
      baseField('heading', { label: 'Snow Event Log', content: 'Storm Service Record' }),
      baseField('date-picker', { label: 'Event Date', required: true }),
      baseField('time', { label: 'Dispatch Time', required: true }),
      baseField('single-choice', {
        label: 'Service Type',
        options: ['Residential Plow', 'Commercial Lot', 'Walkway Shovel', 'Salting Only'],
        required: true,
      }),
      baseField('service-category', { label: 'Service Bundles', allowMultipleCategories: true, enablePriceInput: true }),
      baseField('number', { label: 'Snow Depth (inches)', step: 0.1 }),
      baseField('multiple-choice', {
        label: 'Materials Applied',
        options: ['Salt', 'Sand', 'Calcium', 'No Materials'],
        allowOther: true,
      }),
      baseField('long-text', { label: 'Notes / Return Visits' }),
      baseField('single-choice', {
        label: 'Billing Status',
        options: ['Bill Client', 'Included in Seasonal', 'Warranty'],
      }),
    ],
    settings: {
      templateVersion: '1.0.0',
    },
  },
  {
    id: 'general-invoice-builder',
    title: 'General Invoice Builder',
    description: 'Collect all data needed to automatically draft an invoice after each job.',
    accent: '#b45309',
    fields: [
      baseField('heading', { label: 'Invoice Builder', content: 'Log charges and payment status' }),
      baseField('date-picker', { label: 'Service Date', required: true }),
      baseField('full-name', { label: 'Client Name', required: true }),
      baseField('short-text', { label: 'Project / Job #', placeholder: 'Optional reference' }),
      baseField('service-category', { label: 'Work Categories', allowMultipleCategories: true, enablePriceInput: true }),
      baseField('number', { label: 'Labor Hours', step: 0.25, required: true }),
      baseField('number', { label: 'Materials Cost ($)', step: 0.01 }),
      baseField('number', { label: 'Extras / Fees ($)', step: 0.01 }),
      baseField('number', { label: 'Total Charge ($)', step: 0.01, required: true }),
      baseField('single-choice', {
        label: 'Payment Status',
        options: ['Unsent', 'Sent', 'Paid', 'Disputed'],
        required: true,
      }),
      baseField('long-text', { label: 'Notes for Invoice Footer' }),
    ],
    settings: {
      confirmationMessage: 'Invoice data captured.',
      templateVersion: '1.0.0',
    },
  },
  {
    id: 'landscape-services',
    title: 'Landscape Services',
    description: 'Customizable service form with empty categories - add your own service categories and services.',
    accent: '#10b981',
    fields: [
      baseField('heading', { label: 'Service Log', content: 'Landscape Services' }),
      baseField('date-picker', { label: 'Service Date', required: true }),
      baseField('full-name', { label: 'Customer Name', required: true }),
      baseField('phone', { label: 'Customer Phone' }),
      baseField('address', { label: 'Service Address' }),
      baseField('service-category', {
        label: 'Services Performed',
        required: true,
        allowMultipleCategories: true,
        enablePriceInput: true,
        customCategories: [], // Empty - users will add their own
      }),
      baseField('number', { label: 'Hours On Site', placeholder: 'e.g. 2.5', step: 0.25 }),
      baseField('long-text', {
        label: 'Notes / Materials Used',
        placeholder: 'Add material usage, status updates, or follow-up reminders',
      }),
      baseField('number', { label: 'Amount Due ($)', placeholder: '0.00', step: 0.01 }),
      baseField('single-choice', {
        label: 'Payment Status',
        options: ['Unpaid', 'Partially Paid', 'Paid in Full'],
      }),
      baseField('signature', { label: 'Customer Signature (optional)' }),
    ],
    settings: {
      confirmationMessage: 'Service entry saved successfully.',
      templateVersion: '1.0.0',
    },
  },
]

