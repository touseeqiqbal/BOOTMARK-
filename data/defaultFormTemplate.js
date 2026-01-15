// Default Form Templates for BOOTMARK
// These are pre-built templates that users can use as starting points

module.exports = [
    {
        id: "contact-form",
        title: "Contact Form",
        description: "Simple contact form with name, email, and message",
        fields: [
            {
                id: "name",
                type: "text",
                label: "Full Name",
                required: true,
                placeholder: "Enter your full name"
            },
            {
                id: "email",
                type: "email",
                label: "Email Address",
                required: true,
                placeholder: "your@email.com"
            },
            {
                id: "phone",
                type: "text",
                label: "Phone Number",
                required: false,
                placeholder: "(555) 123-4567"
            },
            {
                id: "message",
                type: "textarea",
                label: "Message",
                required: true,
                placeholder: "How can we help you?"
            }
        ],
        settings: {
            theme: "default",
            allowMultipleSubmissions: true,
            showProgressBar: false,
            confirmationMessage: "Thank you for contacting us! We'll get back to you soon."
        },
        accent: "#2563eb"
    },
    {
        id: "service-request",
        title: "Service Request Form",
        description: "Request form for field service businesses",
        fields: [
            {
                id: "name",
                type: "text",
                label: "Your Name",
                required: true
            },
            {
                id: "email",
                type: "email",
                label: "Email",
                required: true
            },
            {
                id: "phone",
                type: "text",
                label: "Phone Number",
                required: true
            },
            {
                id: "address",
                type: "textarea",
                label: "Service Address",
                required: true,
                placeholder: "Street address, city, state, zip"
            },
            {
                id: "serviceType",
                type: "dropdown",
                label: "Type of Service",
                required: true,
                options: ["Landscaping", "Plumbing", "Electrical", "HVAC", "General Maintenance", "Other"]
            },
            {
                id: "description",
                type: "textarea",
                label: "Service Description",
                required: true,
                placeholder: "Please describe the work you need done"
            },
            {
                id: "preferredDate",
                type: "date",
                label: "Preferred Service Date",
                required: false
            }
        ],
        settings: {
            theme: "default",
            allowMultipleSubmissions: false,
            showProgressBar: true,
            confirmationMessage: "Your service request has been received! We'll contact you within 24 hours."
        },
        accent: "#0ea5e9"
    },
    {
        id: "customer-feedback",
        title: "Customer Feedback",
        description: "Collect customer satisfaction ratings and feedback",
        fields: [
            {
                id: "name",
                type: "text",
                label: "Your Name",
                required: false
            },
            {
                id: "email",
                type: "email",
                label: "Email (optional)",
                required: false
            },
            {
                id: "overallRating",
                type: "rating",
                label: "Overall Satisfaction",
                required: true,
                max: 5
            },
            {
                id: "serviceQuality",
                type: "rating",
                label: "Quality of Service",
                required: true,
                max: 5
            },
            {
                id: "timeliness",
                type: "rating",
                label: "Timeliness",
                required: true,
                max: 5
            },
            {
                id: "recommend",
                type: "radio",
                label: "Would you recommend us?",
                required: true,
                options: ["Yes", "No", "Maybe"]
            },
            {
                id: "comments",
                type: "textarea",
                label: "Additional Comments",
                required: false,
                placeholder: "Tell us more about your experience..."
            }
        ],
        settings: {
            theme: "default",
            allowMultipleSubmissions: false,
            showProgressBar: true,
            confirmationMessage: "Thank you for your feedback! We appreciate your input."
        },
        accent: "#10b981"
    }
];
