const nodemailer = require('nodemailer');

// Create transporter - configure with your email service
// For Gmail, you'll need an App Password
// For other services, update the configuration accordingly
let transporter = null;

function initializeEmailService(userSmtpConfig = null) {
  // Use user-specific SMTP config if provided, otherwise use environment variables
  const emailConfig = userSmtpConfig ? {
    host: userSmtpConfig.host || 'smtp.gmail.com',
    port: parseInt(userSmtpConfig.port || '587'),
    secure: userSmtpConfig.secure === true || userSmtpConfig.secure === 'true',
    auth: {
      user: userSmtpConfig.user || '',
      pass: userSmtpConfig.password || ''
    }
  } : {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  };

  // Only initialize if credentials are provided
  if (emailConfig.auth.user && emailConfig.auth.pass) {
    try {
      transporter = nodemailer.createTransport(emailConfig);
      console.log('Email service initialized', userSmtpConfig ? '(user-specific config)' : '(environment config)');
    } catch (error) {
      console.warn('Email service initialization failed:', error.message);
    }
  } else {
    console.warn('Email service not configured - SMTP credentials missing');
  }
}

// Initialize on module load
initializeEmailService();

/**
 * Create a transporter from SMTP config
 * @param {Object} userSmtpConfig - User's SMTP configuration
 * @returns {Object|null} Nodemailer transporter or null if config invalid
 */
function createTransporterFromConfig(userSmtpConfig = null) {
  const emailConfig = userSmtpConfig ? {
    host: userSmtpConfig.host || 'smtp.gmail.com',
    port: parseInt(userSmtpConfig.port || '587'),
    secure: userSmtpConfig.secure === true || userSmtpConfig.secure === 'true',
    auth: {
      user: userSmtpConfig.user || '',
      pass: userSmtpConfig.password || ''
    }
  } : {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  };

  // Only create transporter if credentials are provided
  if (emailConfig.auth.user && emailConfig.auth.pass) {
    try {
      return nodemailer.createTransport(emailConfig);
    } catch (error) {
      console.warn('Failed to create transporter:', error.message);
      return null;
    }
  }

  return null;
}

/**
 * Get default/company SMTP configuration from environment variables
 * @returns {Object|null} Default SMTP config or null if not configured
 */
function getDefaultSmtpConfig() {
  const defaultConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER
  };

  // Return config only if it has required fields
  if (defaultConfig.host && defaultConfig.user && defaultConfig.password) {
    return defaultConfig;
  }
  return null;
}

/**
 * Send email with fallback to default SMTP if user SMTP is not configured
 * @param {Object} options - Email options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @param {string} options.text - Plain text email body (optional)
 * @param {Object} options.userSmtpConfig - User's SMTP configuration (optional)
 * @returns {Promise<Object>} Result object with success status
 */
async function sendEmail({ to, subject, html, text, userSmtpConfig = null }) {
  // Determine which SMTP config to use: user config first, then default/company config
  let smtpConfigToUse = null;
  let configSource = 'none';

  // Check if user has valid SMTP config
  if (userSmtpConfig && userSmtpConfig.host && userSmtpConfig.user && userSmtpConfig.password) {
    smtpConfigToUse = userSmtpConfig;
    configSource = 'user';
  } else {
    // Fall back to default/company SMTP config
    const defaultConfig = getDefaultSmtpConfig();
    if (defaultConfig) {
      smtpConfigToUse = defaultConfig;
      configSource = 'default';
    }
  }

  // Create transporter from the selected config
  const emailTransporter = smtpConfigToUse
    ? createTransporterFromConfig(smtpConfigToUse)
    : transporter; // Fallback to global transporter if it exists

  if (!emailTransporter) {
    console.warn('Email service not configured. Email not sent.');
    return { success: false, error: 'Email service not configured. Please configure SMTP settings in Account Settings or set up default SMTP in environment variables.' };
  }

  // Determine "from" address
  let fromAddress = 'noreply@bootmark.com';
  if (smtpConfigToUse) {
    fromAddress = smtpConfigToUse.from || smtpConfigToUse.user || fromAddress;
  } else {
    fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || fromAddress;
  }

  try {
    const info = await emailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    });

    console.log('Email sent:', info.messageId, `(${configSource} SMTP)`);
    return { success: true, messageId: info.messageId, configSource };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send submission notification emails
 * @param {Object} options - Notification options
 * @param {Object} options.form - Form object
 * @param {Object} options.submission - Submission object
 * @param {string} options.ownerEmail - Form owner email
 * @param {string} options.submitterEmail - Submitter email
 * @param {Object} options.userSmtpConfig - Form owner's SMTP configuration (optional)
 * @returns {Promise<Array>} Array of email send results
 */
async function sendSubmissionNotification({ form, submission, ownerEmail, submitterEmail, userSmtpConfig = null }) {
  const results = [];

  // Send notification to form owner
  if (ownerEmail) {
    const ownerSubject = `New Submission: ${form.title}`;
    const ownerHtml = generateOwnerEmailHTML(form, submission);

    const ownerResult = await sendEmail({
      to: ownerEmail,
      subject: ownerSubject,
      html: ownerHtml,
      userSmtpConfig // Use form owner's SMTP config if available, otherwise falls back to default SMTP
    });
    results.push({ type: 'owner', ...ownerResult });
  }

  // Send confirmation to submitter
  if (submitterEmail) {
    const submitterSubject = `Thank you for your submission: ${form.title}`;
    const submitterHtml = generateSubmitterEmailHTML(form, submission);

    const submitterResult = await sendEmail({
      to: submitterEmail,
      subject: submitterSubject,
      html: submitterHtml,
      userSmtpConfig // Use form owner's SMTP config if available, otherwise falls back to default SMTP
    });
    results.push({ type: 'submitter', ...submitterResult });
  }

  return results;
}

function generateOwnerEmailHTML(form, submission) {
  const fieldsHtml = form.fields.map(field => {
    const value = submission.data[field.id];
    let displayValue = '—';

    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        displayValue = value.join(', ');
      } else if (typeof value === 'object') {
        displayValue = JSON.stringify(value);
      } else {
        displayValue = String(value);
      }
    }

    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">${field.label}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${displayValue}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>New Form Submission</h2>
          <p>Form: ${form.title}</p>
        </div>
        <div class="content">
          <p>You have received a new submission for your form <strong>${form.title}</strong>.</p>
          <table>
            ${fieldsHtml}
          </table>
          <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
            Submitted at: ${new Date(submission.submittedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateSubmitterEmailHTML(form, submission) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>✓ Submission Received</h2>
        </div>
        <div class="content">
          <p>Thank you for submitting <strong>${form.title}</strong>!</p>
          <p>${form.settings?.confirmationMessage || 'Your submission has been received and we will review it shortly.'}</p>
          <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
            Submitted at: ${new Date(submission.submittedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  sendEmail,
  sendSubmissionNotification,
  initializeEmailService,
  createTransporterFromConfig
};
