// Contract Notification System
// Handles notifications for contract events

const nodemailer = require('nodemailer');

/**
 * Send contract notification email
 * @param {Object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {Object} options.smtpConfig - SMTP configuration
 */
async function sendContractNotification({ to, subject, html, smtpConfig }) {
    if (!smtpConfig || !smtpConfig.host) {
        console.log('SMTP not configured, skipping email notification');
        return { success: false, message: 'SMTP not configured' };
    }

    try {
        const transporter = nodemailer.createTransporter({
            host: smtpConfig.host,
            port: smtpConfig.port || 587,
            secure: smtpConfig.secure || false,
            auth: {
                user: smtpConfig.user,
                pass: smtpConfig.password
            }
        });

        const info = await transporter.sendMail({
            from: smtpConfig.from || smtpConfig.user,
            to,
            subject,
            html
        });

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Failed to send contract notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Notify client about new contract
 */
async function notifyContractCreated(contract, client, business, smtpConfig) {
    const subject = `New Contract: ${contract.title}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">${business.name || 'Contract'}</h1>
            </div>
            
            <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #111827; margin-top: 0;">New Contract Created</h2>
                <p style="color: #374151; font-size: 16px;">
                    A new contract has been created for you:
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1e3a8a; margin-top: 0;">${contract.title}</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Start Date:</td>
                            <td style="padding: 8px 0; color: #111827; font-weight: 600;">${new Date(contract.startDate).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">End Date:</td>
                            <td style="padding: 8px 0; color: #111827; font-weight: 600;">${new Date(contract.endDate).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Total Value:</td>
                            <td style="padding: 8px 0; color: #10b981; font-weight: 700; font-size: 18px;">$${parseFloat(contract.amount || 0).toLocaleString()}</td>
                        </tr>
                    </table>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                    Please review the contract details and contact us if you have any questions.
                </p>
            </div>
            
            <div style="padding: 20px; background: #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">${business.name || 'Business'}</p>
                ${business.email ? `<p style="margin: 5px 0;">${business.email}</p>` : ''}
                ${business.phone ? `<p style="margin: 5px 0;">${business.phone}</p>` : ''}
            </div>
        </div>
    `;

    return sendContractNotification({
        to: client.email,
        subject,
        html,
        smtpConfig
    });
}

/**
 * Notify about contract expiring soon
 */
async function notifyContractExpiring(contract, client, business, daysUntilExpiry, smtpConfig) {
    const subject = `Contract Expiring Soon: ${contract.title}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">⚠️ Contract Expiring</h1>
            </div>
            
            <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #111827; margin-top: 0;">Your contract is expiring in ${daysUntilExpiry} days</h2>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <h3 style="color: #1e3a8a; margin-top: 0;">${contract.title}</h3>
                    <p style="color: #6b7280; margin: 10px 0;">
                        <strong>Expiration Date:</strong> ${new Date(contract.endDate).toLocaleDateString()}
                    </p>
                    ${contract.autoRenewal ? `
                        <p style="color: #10b981; margin: 10px 0;">
                            ✓ This contract is set to auto-renew
                        </p>
                    ` : `
                        <p style="color: #ef4444; margin: 10px 0;">
                            ⚠️ This contract will not auto-renew
                        </p>
                    `}
                </div>
                
                <p style="color: #374151; font-size: 16px;">
                    Please contact us if you'd like to renew or modify this contract.
                </p>
            </div>
            
            <div style="padding: 20px; background: #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">${business.name || 'Business'}</p>
                ${business.email ? `<p style="margin: 5px 0;">${business.email}</p>` : ''}
            </div>
        </div>
    `;

    return sendContractNotification({
        to: client.email,
        subject,
        html,
        smtpConfig
    });
}

/**
 * Notify about payment due
 */
async function notifyPaymentDue(contract, client, business, milestone, smtpConfig) {
    const subject = `Payment Due: ${contract.title}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">💰 Payment Due</h1>
            </div>
            
            <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #111827; margin-top: 0;">Payment Reminder</h2>
                <p style="color: #374151; font-size: 16px;">
                    A payment is due for your contract:
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1e3a8a; margin-top: 0;">${contract.title}</h3>
                    <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
                        <p style="margin: 5px 0; color: #1e40af;"><strong>Payment Description:</strong> ${milestone.description}</p>
                        <p style="margin: 5px 0; color: #1e40af;"><strong>Amount Due:</strong> <span style="font-size: 24px; font-weight: 700;">$${parseFloat(milestone.amount || 0).toLocaleString()}</span></p>
                        <p style="margin: 5px 0; color: #1e40af;"><strong>Due Date:</strong> ${new Date(milestone.dueDate).toLocaleDateString()}</p>
                    </div>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                    Please ensure payment is made by the due date. Contact us if you have any questions.
                </p>
            </div>
            
            <div style="padding: 20px; background: #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">${business.name || 'Business'}</p>
                ${business.email ? `<p style="margin: 5px 0;">${business.email}</p>` : ''}
            </div>
        </div>
    `;

    return sendContractNotification({
        to: client.email,
        subject,
        html,
        smtpConfig
    });
}

module.exports = {
    sendContractNotification,
    notifyContractCreated,
    notifyContractExpiring,
    notifyPaymentDue
};
