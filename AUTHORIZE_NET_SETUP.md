# Authorize.net Payment Gateway Setup

This guide explains how to configure Authorize.net payment gateway for invoice payments in BOOTMARK.

## Features

- **Payment Links**: Generate secure payment links when sending invoices via email
- **Pay Now Button**: Customers can pay invoices directly from the invoice view
- **Secure Processing**: All payments are processed securely through Authorize.net
- **Automatic Invoice Updates**: Invoice status automatically updates to "paid" after successful payment

## Setup Instructions

### 1. Get Authorize.net Credentials

1. Sign up for an Authorize.net account at https://www.authorize.net/
2. Log in to your Authorize.net Merchant Interface
3. Navigate to **Account** → **Settings** → **Security Settings** → **API Credentials**
4. Create a new API Login ID and Transaction Key
5. Copy both credentials (you'll need them for environment variables)

### 2. Configure Environment Variables

Add the following environment variables to your deployment platform (Render, Vercel, etc.):

```bash
# Authorize.net API Credentials
AUTHORIZE_NET_API_LOGIN_ID=your_api_login_id_here
AUTHORIZE_NET_TRANSACTION_KEY=your_transaction_key_here

# Set to 'false' for production, 'true' or leave unset for sandbox/testing
AUTHORIZE_NET_SANDBOX=true

# Base URL for payment links (required for email links)
BASE_URL=https://yourdomain.com
```

### 3. For Render.com

1. Go to your Render Dashboard
2. Select your service
3. Go to **Environment** tab
4. Add the environment variables listed above
5. Redeploy your service

### 4. For Local Development

Create a `.env` file in your project root:

```env
AUTHORIZE_NET_API_LOGIN_ID=your_api_login_id_here
AUTHORIZE_NET_TRANSACTION_KEY=your_transaction_key_here
AUTHORIZE_NET_SANDBOX=true
BASE_URL=http://localhost:4000
```

## Usage

### Sending Invoices with Payment Links

1. Go to **Invoices** page
2. Click **Send via Email** button on any invoice
3. Enter the customer's email address
4. When prompted, choose **"Include payment link in email"**
5. The customer will receive an email with a "Pay Now" button

### Creating Payment Links Manually

1. Go to **Invoices** page
2. Click **Create Payment Link** button on any invoice
3. The payment link will be copied to your clipboard
4. Share this link with your customer via any method

### Pay Now Button

- The **Pay Now** button appears on all unpaid invoices
- Clicking it creates a payment link and opens it in a new tab
- Customers can pay directly using the secure payment page

## Payment Page Features

- Secure card entry form
- Real-time card number formatting
- Invoice details display
- Email receipt delivery
- Payment confirmation

## Security

- All payment data is processed directly through Authorize.net
- Card information is never stored on BOOTMARK servers
- Payment links expire after 30 days
- Each payment link can only be used once
- SSL/HTTPS required for production

## Testing

1. Use Authorize.net **Sandbox** credentials for testing
2. Set `AUTHORIZE_NET_SANDBOX=true` in environment variables
3. Use test card numbers from Authorize.net documentation:
   - **Visa**: 4111111111111111
   - **Mastercard**: 5424000000000015
   - **Expiration**: Any future date (e.g., 12/25)
   - **CVV**: Any 3-4 digit number

## Troubleshooting

### Payment Link Not Working

- Check that `BASE_URL` environment variable is set correctly
- Verify Authorize.net credentials are correct
- Check server logs for error messages

### Payment Processing Fails

- Verify API Login ID and Transaction Key are correct
- Check that you're using the correct environment (sandbox vs production)
- Ensure your Authorize.net account is active
- Check Authorize.net transaction logs in your merchant interface

### Invoice Status Not Updating

- Check server logs for errors
- Verify database/Firestore connection
- Check that payment link hasn't expired or been used

## Support

For Authorize.net support:
- Visit: https://www.authorize.net/support/
- Call: 1-888-323-4289

For BOOTMARK support:
- Check server logs for detailed error messages
- Verify all environment variables are set correctly
