/**
 * Contract Email Templates
 * Pre-defined email templates for contract communications
 */

const getEmailTemplates = () => {
    return {
        'contract-invitation': {
            id: 'contract-invitation',
            name: 'Contract Invitation',
            subject: 'New Contract: {{contractTitle}}',
            body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; }
        .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .details { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: 600; color: #6b7280; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">📄 New Contract</h1>
        </div>
        <div class="content">
            <p>Hello {{clientName}},</p>
            
            <p>We're pleased to share a new contract with you for review and signature.</p>
            
            <div class="details">
                <div class="detail-row">
                    <span class="detail-label">Contract Title:</span>
                    <span>{{contractTitle}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Start Date:</span>
                    <span>{{startDate}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">End Date:</span>
                    <span>{{endDate}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Contract Value:</span>
                    <span style="font-weight: 700; color: #10b981;">\${{amount}}</span>
                </div>
            </div>
            
            <p>Please review the contract details and let us know if you have any questions.</p>
            
            <div style="text-align: center;">
                <a href="{{contractLink}}" class="button">View Contract</a>
            </div>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                If you have any questions, please don't hesitate to contact us.
            </p>
        </div>
        <div class="footer">
            <p>{{businessName}}<br>
            This is an automated message. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>
            `,
            variables: ['clientName', 'contractTitle', 'startDate', 'endDate', 'amount', 'contractLink', 'businessName']
        },

        'signature-request': {
            id: 'signature-request',
            name: 'Signature Request',
            subject: 'Action Required: Sign Contract - {{contractTitle}}',
            body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #8b5cf6; color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; }
        .button { display: inline-block; background: #8b5cf6; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; font-size: 16px; }
        .urgent { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">✍️ Signature Required</h1>
        </div>
        <div class="content">
            <p>Hello {{clientName}},</p>
            
            <div class="urgent">
                <strong>⚠️ Action Required:</strong> Your signature is needed to finalize the contract.
            </div>
            
            <p>The following contract is ready for your signature:</p>
            
            <h3 style="color: #8b5cf6; margin: 20px 0 10px 0;">{{contractTitle}}</h3>
            <p style="color: #6b7280;">Contract Value: <strong style="color: #10b981;">\${{amount}}</strong></p>
            
            <p>Please review and sign the contract at your earliest convenience. The signing process is quick and secure.</p>
            
            <div style="text-align: center;">
                <a href="{{signatureLink}}" class="button">Sign Contract Now</a>
            </div>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                <strong>Need help?</strong> Contact us if you have any questions about the contract.
            </p>
        </div>
        <div class="footer">
            <p>{{businessName}}<br>
            This is an automated message. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>
            `,
            variables: ['clientName', 'contractTitle', 'amount', 'signatureLink', 'businessName']
        },

        'expiration-warning': {
            id: 'expiration-warning',
            name: 'Expiration Warning',
            subject: 'Contract Expiring Soon: {{contractTitle}}',
            body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .countdown { text-align: center; font-size: 48px; font-weight: bold; color: #f59e0b; margin: 20px 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">⏰ Contract Expiring Soon</h1>
        </div>
        <div class="content">
            <p>Hello {{clientName}},</p>
            
            <div class="warning">
                <strong>⚠️ Important Notice:</strong> Your contract is expiring soon.
            </div>
            
            <div class="countdown">{{daysRemaining}} Days</div>
            <p style="text-align: center; color: #6b7280; margin-top: -10px;">until contract expiration</p>
            
            <h3 style="margin: 20px 0 10px 0;">{{contractTitle}}</h3>
            <p style="color: #6b7280;">
                <strong>Expiration Date:</strong> {{endDate}}<br>
                <strong>Contract Value:</strong> \${{amount}}
            </p>
            
            <p>To ensure uninterrupted service, please contact us to discuss renewal options.</p>
            
            <div style="text-align: center;">
                <a href="{{renewalLink}}" class="button">Discuss Renewal</a>
            </div>
        </div>
        <div class="footer">
            <p>{{businessName}}<br>
            This is an automated reminder. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>
            `,
            variables: ['clientName', 'contractTitle', 'endDate', 'amount', 'daysRemaining', 'renewalLink', 'businessName']
        },

        'renewal-reminder': {
            id: 'renewal-reminder',
            name: 'Renewal Reminder',
            subject: 'Time to Renew: {{contractTitle}}',
            body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .benefits { background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .benefit-item { padding: 8px 0; display: flex; align-items: start; }
        .checkmark { color: #10b981; margin-right: 10px; font-size: 20px; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🔄 Contract Renewal</h1>
        </div>
        <div class="content">
            <p>Hello {{clientName}},</p>
            
            <p>We hope you've been satisfied with our services! Your contract is up for renewal.</p>
            
            <h3 style="margin: 20px 0 10px 0;">{{contractTitle}}</h3>
            
            <div class="benefits">
                <h4 style="margin: 0 0 15px 0; color: #10b981;">Continue enjoying:</h4>
                <div class="benefit-item">
                    <span class="checkmark">✓</span>
                    <span>Uninterrupted service</span>
                </div>
                <div class="benefit-item">
                    <span class="checkmark">✓</span>
                    <span>Priority support</span>
                </div>
                <div class="benefit-item">
                    <span class="checkmark">✓</span>
                    <span>Preferred pricing</span>
                </div>
            </div>
            
            <p><strong>Renewal Details:</strong></p>
            <p style="color: #6b7280;">
                Previous Contract Value: \${{amount}}<br>
                Renewal Period: {{renewalPeriod}}
            </p>
            
            <div style="text-align: center;">
                <a href="{{renewalLink}}" class="button">Renew Contract</a>
            </div>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Questions about renewal? We're here to help!
            </p>
        </div>
        <div class="footer">
            <p>{{businessName}}<br>
            This is an automated message. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>
            `,
            variables: ['clientName', 'contractTitle', 'amount', 'renewalPeriod', 'renewalLink', 'businessName']
        },

        'payment-reminder': {
            id: 'payment-reminder',
            name: 'Payment Reminder',
            subject: 'Payment Due: {{contractTitle}}',
            body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .payment-box { background: #eff6ff; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .amount { font-size: 36px; font-weight: bold; color: #3b82f6; margin: 10px 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">💳 Payment Reminder</h1>
        </div>
        <div class="content">
            <p>Hello {{clientName}},</p>
            
            <p>This is a friendly reminder that a payment is due for your contract.</p>
            
            <h3 style="margin: 20px 0 10px 0;">{{contractTitle}}</h3>
            
            <div class="payment-box">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Amount Due</p>
                <div class="amount">\${{paymentAmount}}</div>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Due Date: {{dueDate}}</p>
            </div>
            
            <p>Please make your payment by the due date to avoid any service interruptions.</p>
            
            <div style="text-align: center;">
                <a href="{{paymentLink}}" class="button">Make Payment</a>
            </div>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                <strong>Payment Methods:</strong> We accept all major credit cards and bank transfers.<br>
                <strong>Questions?</strong> Contact our billing department for assistance.
            </p>
        </div>
        <div class="footer">
            <p>{{businessName}}<br>
            This is an automated reminder. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>
            `,
            variables: ['clientName', 'contractTitle', 'paymentAmount', 'dueDate', 'paymentLink', 'businessName']
        }
    };
};

/**
 * Replace template variables with actual values
 */
function replaceTemplateVariables(template, data) {
    let subject = template.subject;
    let body = template.body;

    // Replace all variables in subject and body
    Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, data[key] || '');
        body = body.replace(regex, data[key] || '');
    });

    return { subject, body };
}

/**
 * Get template by ID
 */
function getTemplateById(templateId) {
    const templates = getEmailTemplates();
    return templates[templateId] || null;
}

/**
 * Get all template names and IDs
 */
function getTemplateList() {
    const templates = getEmailTemplates();
    return Object.values(templates).map(t => ({
        id: t.id,
        name: t.name,
        subject: t.subject
    }));
}

module.exports = {
    getEmailTemplates,
    getTemplateById,
    getTemplateList,
    replaceTemplateVariables
};
