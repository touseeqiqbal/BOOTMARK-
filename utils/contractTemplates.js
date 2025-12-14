// Contract Template Definitions
// Professional contract templates for various business scenarios

const CONTRACT_TEMPLATES = {
    serviceAgreement: {
        id: 'service-agreement',
        name: 'Service Agreement',
        description: 'Ongoing service contracts with recurring deliverables',
        icon: '🔧',
        color: '#3b82f6',
        defaultDuration: 12, // months
        billingFrequency: 'monthly',
        autoRenewal: true,
        fields: {
            serviceScope: true,
            deliverables: true,
            performanceMetrics: true,
            paymentSchedule: true,
            cancellationTerms: true
        },
        terms: `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of [START_DATE] between [BUSINESS_NAME] ("Service Provider") and [CLIENT_NAME] ("Client").

1. SERVICES
The Service Provider agrees to provide the following services:
[SERVICE_SCOPE]

2. DELIVERABLES
[DELIVERABLES]

3. TERM
This Agreement shall commence on [START_DATE] and continue for [DURATION] months, ending on [END_DATE].

4. PAYMENT
Total Contract Value: $[AMOUNT]
Payment Schedule: [BILLING_FREQUENCY]
[PAYMENT_SCHEDULE]

5. PERFORMANCE METRICS
[PERFORMANCE_METRICS]

6. TERMINATION
Either party may terminate this Agreement with [CANCELLATION_NOTICE] days written notice.
[CANCELLATION_TERMS]

7. AUTO-RENEWAL
[AUTO_RENEWAL_CLAUSE]

8. CONFIDENTIALITY
Both parties agree to maintain confidentiality of proprietary information.

9. LIMITATION OF LIABILITY
Service Provider's liability shall not exceed the total contract value.

10. GOVERNING LAW
This Agreement shall be governed by the laws of [STATE/COUNTRY].

SIGNATURES:
Service Provider: _____________________ Date: _______
Client: _____________________ Date: _______`
    },

    maintenanceContract: {
        id: 'maintenance-contract',
        name: 'Maintenance Contract',
        description: 'Regular maintenance and support agreements',
        icon: '🛠️',
        color: '#10b981',
        defaultDuration: 12,
        billingFrequency: 'monthly',
        autoRenewal: true,
        fields: {
            serviceScope: true,
            responseTime: true,
            coverageHours: true,
            paymentSchedule: true
        },
        terms: `MAINTENANCE CONTRACT

This Maintenance Contract ("Contract") is entered into as of [START_DATE] between [BUSINESS_NAME] ("Provider") and [CLIENT_NAME] ("Client").

1. MAINTENANCE SERVICES
Provider agrees to provide the following maintenance services:
[SERVICE_SCOPE]

2. RESPONSE TIME
- Emergency Issues: [EMERGENCY_RESPONSE] hours
- Standard Issues: [STANDARD_RESPONSE] hours
- Routine Maintenance: [ROUTINE_SCHEDULE]

3. COVERAGE
Service Hours: [COVERAGE_HOURS]
Coverage Days: [COVERAGE_DAYS]

4. TERM AND RENEWAL
Contract Period: [START_DATE] to [END_DATE]
Auto-Renewal: [AUTO_RENEWAL_CLAUSE]

5. FEES
Annual Fee: $[AMOUNT]
Payment Terms: [BILLING_FREQUENCY]
[PAYMENT_SCHEDULE]

6. EXCLUSIONS
The following are not covered under this contract:
- Damage caused by misuse or negligence
- Third-party equipment or software
- Services outside normal business hours (unless emergency)

7. TERMINATION
[CANCELLATION_TERMS]

SIGNATURES:
Provider: _____________________ Date: _______
Client: _____________________ Date: _______`
    },

    projectContract: {
        id: 'project-contract',
        name: 'Project Contract',
        description: 'One-time project-based contracts with milestones',
        icon: '📋',
        color: '#8b5cf6',
        defaultDuration: 6,
        billingFrequency: 'milestone',
        autoRenewal: false,
        fields: {
            projectScope: true,
            deliverables: true,
            milestones: true,
            paymentSchedule: true,
            changeOrders: true
        },
        terms: `PROJECT CONTRACT

This Project Contract ("Contract") is entered into as of [START_DATE] between [BUSINESS_NAME] ("Contractor") and [CLIENT_NAME] ("Client").

1. PROJECT SCOPE
[PROJECT_SCOPE]

2. DELIVERABLES
[DELIVERABLES]

3. PROJECT TIMELINE
Start Date: [START_DATE]
Completion Date: [END_DATE]

MILESTONES:
[MILESTONES]

4. PAYMENT
Total Project Cost: $[AMOUNT]
Payment Schedule:
[PAYMENT_SCHEDULE]

5. CHANGE ORDERS
Any changes to the project scope must be documented in writing and may result in adjusted timeline and costs.

6. ACCEPTANCE CRITERIA
[ACCEPTANCE_CRITERIA]

7. WARRANTIES
Contractor warrants that all work will be performed in a professional manner and will be free from defects for [WARRANTY_PERIOD] days.

8. INTELLECTUAL PROPERTY
[IP_TERMS]

SIGNATURES:
Contractor: _____________________ Date: _______
Client: _____________________ Date: _______`
    },

    retainerAgreement: {
        id: 'retainer-agreement',
        name: 'Retainer Agreement',
        description: 'Monthly retainer contracts with allocated hours',
        icon: '⏰',
        color: '#f59e0b',
        defaultDuration: 12,
        billingFrequency: 'monthly',
        autoRenewal: true,
        fields: {
            monthlyHours: true,
            hourlyRate: true,
            rolloverPolicy: true,
            serviceScope: true
        },
        terms: `RETAINER AGREEMENT

This Retainer Agreement ("Agreement") is entered into as of [START_DATE] between [BUSINESS_NAME] ("Service Provider") and [CLIENT_NAME] ("Client").

1. RETAINER SERVICES
Service Provider agrees to provide [MONTHLY_HOURS] hours of service per month for the following:
[SERVICE_SCOPE]

2. FEES
Monthly Retainer: $[MONTHLY_AMOUNT]
Hourly Rate: $[HOURLY_RATE]
Total Annual Value: $[AMOUNT]

3. HOURS ALLOCATION
- Monthly Allocation: [MONTHLY_HOURS] hours
- Rollover Policy: [ROLLOVER_POLICY]
- Additional Hours: Billed at $[HOURLY_RATE]/hour

4. TERM
This Agreement is effective from [START_DATE] to [END_DATE] and will automatically renew for successive [RENEWAL_PERIOD] periods unless terminated.

5. PAYMENT
Payment is due on the [PAYMENT_DAY] of each month, regardless of hours used.

6. TERMINATION
Either party may terminate with [CANCELLATION_NOTICE] days written notice.

7. UNUSED HOURS
[UNUSED_HOURS_POLICY]

SIGNATURES:
Service Provider: _____________________ Date: _______
Client: _____________________ Date: _______`
    },

    subscriptionContract: {
        id: 'subscription-contract',
        name: 'Subscription Contract',
        description: 'Recurring subscription service agreements',
        icon: '🔄',
        color: '#ef4444',
        defaultDuration: 12,
        billingFrequency: 'monthly',
        autoRenewal: true,
        fields: {
            subscriptionTier: true,
            features: true,
            userLimits: true,
            supportLevel: true
        },
        terms: `SUBSCRIPTION SERVICE AGREEMENT

This Subscription Agreement ("Agreement") is entered into as of [START_DATE] between [BUSINESS_NAME] ("Provider") and [CLIENT_NAME] ("Subscriber").

1. SUBSCRIPTION SERVICES
Subscription Tier: [SUBSCRIPTION_TIER]
Features Included:
[FEATURES]

2. SUBSCRIPTION TERM
Start Date: [START_DATE]
Billing Cycle: [BILLING_FREQUENCY]
Auto-Renewal: Yes

3. FEES
Subscription Fee: $[MONTHLY_AMOUNT]/[BILLING_FREQUENCY]
Annual Total: $[AMOUNT]

4. USER LIMITS
[USER_LIMITS]

5. SUPPORT
Support Level: [SUPPORT_LEVEL]
Response Time: [RESPONSE_TIME]

6. SERVICE LEVEL AGREEMENT
Uptime Guarantee: [UPTIME_PERCENTAGE]%
Credits for Downtime: [SLA_CREDITS]

7. DATA AND PRIVACY
[DATA_PRIVACY_TERMS]

8. CANCELLATION
Subscriber may cancel at any time with [CANCELLATION_NOTICE] days notice. No refunds for partial periods.

9. MODIFICATIONS
Provider reserves the right to modify features and pricing with [NOTICE_PERIOD] days notice.

SIGNATURES:
Provider: _____________________ Date: _______
Subscriber: _____________________ Date: _______`
    },

    customTemplate: {
        id: 'custom-template',
        name: 'Custom Template',
        description: 'Create your own custom contract template',
        icon: '✏️',
        color: '#6b7280',
        defaultDuration: 12,
        billingFrequency: 'monthly',
        autoRenewal: false,
        fields: {
            customFields: true
        },
        terms: `CUSTOM CONTRACT

This Contract is entered into as of [START_DATE] between [BUSINESS_NAME] and [CLIENT_NAME].

[CUSTOM_TERMS]

SIGNATURES:
Party 1: _____________________ Date: _______
Party 2: _____________________ Date: _______`
    }
};

// Helper function to populate template with contract data
function populateTemplate(template, contractData, businessData) {
    let terms = template.terms;

    // Replace placeholders
    terms = terms.replace(/\[START_DATE\]/g, contractData.startDate || '[START_DATE]');
    terms = terms.replace(/\[END_DATE\]/g, contractData.endDate || '[END_DATE]');
    terms = terms.replace(/\[BUSINESS_NAME\]/g, businessData.name || '[BUSINESS_NAME]');
    terms = terms.replace(/\[CLIENT_NAME\]/g, contractData.clientName || '[CLIENT_NAME]');
    terms = terms.replace(/\[AMOUNT\]/g, contractData.amount || '[AMOUNT]');
    terms = terms.replace(/\[BILLING_FREQUENCY\]/g, contractData.billingFrequency || template.billingFrequency);
    terms = terms.replace(/\[SERVICE_SCOPE\]/g, contractData.serviceScope || '[SERVICE_SCOPE]');
    terms = terms.replace(/\[DELIVERABLES\]/g, contractData.deliverables || '[DELIVERABLES]');
    terms = terms.replace(/\[PAYMENT_SCHEDULE\]/g, contractData.paymentSchedule || '[PAYMENT_SCHEDULE]');
    terms = terms.replace(/\[CANCELLATION_TERMS\]/g, contractData.cancellationTerms || '[CANCELLATION_TERMS]');
    terms = terms.replace(/\[AUTO_RENEWAL_CLAUSE\]/g,
        contractData.autoRenewal
            ? `This Agreement will automatically renew for successive ${template.defaultDuration}-month periods unless either party provides written notice of non-renewal at least ${contractData.renewalNoticePeriod || 30} days before the end of the current term.`
            : 'This Agreement will not automatically renew.');

    // Calculate duration
    if (contractData.startDate && contractData.endDate) {
        const start = new Date(contractData.startDate);
        const end = new Date(contractData.endDate);
        const months = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30));
        terms = terms.replace(/\[DURATION\]/g, months.toString());
    }

    return terms;
}

// Export templates and helper
module.exports = {
    CONTRACT_TEMPLATES,
    populateTemplate,
    getTemplateById: (id) => Object.values(CONTRACT_TEMPLATES).find(t => t.id === id),
    getAllTemplates: () => Object.values(CONTRACT_TEMPLATES)
};
