const nodemailer = require('nodemailer');

// Create transporter - configure with your email service
// For Gmail, you'll need an App Password
// For other services, update the configuration accordingly
let transporter = null;

function initializeEmailService() {
  // Use environment variables for email configuration
  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || ''
    }
  };

  // Only initialize if credentials are provided
  if (emailConfig.auth.user && emailConfig.auth.pass) {
    try {
      transporter = nodemailer.createTransport(emailConfig);
      console.log('Email service initialized');
    } catch (error) {
      console.warn('Email service initialization failed:', error.message);
    }
  } else {
    console.warn('Email service not configured - SMTP credentials missing');
  }
}

// Initialize on module load
initializeEmailService();

async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.warn('Email service not configured. Email not sent.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@phoenixformbuilder.com',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

async function sendSubmissionNotification({ form, submission, ownerEmail, submitterEmail }) {
  const results = [];

  // Send notification to form owner
  if (ownerEmail) {
    const ownerSubject = `New Submission: ${form.title}`;
    const ownerHtml = generateOwnerEmailHTML(form, submission);
    
    const ownerResult = await sendEmail({
      to: ownerEmail,
      subject: ownerSubject,
      html: ownerHtml
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
      html: submitterHtml
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
  initializeEmailService
};
