# BOOTMARK

**Complete Service Management Platform for Field Service Businesses**

BOOTMARK is a comprehensive business management solution designed for field service companies including landscaping, plumbing, electrical, HVAC, and general contractors. Manage work orders, scheduling, GPS tracking, invoicing, client portal, and more—all in one platform.

![BOOTMARK](./marketing-site/assets/logo.jpg)

---

## 🌟 Core Features

### 📋 Work Order Management
- Create, track, and manage work orders from draft to completion
- Custom fields and templates for common jobs
- Photo attachments and detailed notes
- Status tracking (Draft, Scheduled, In Progress, Completed, Invoiced)
- Work order numbering system with customizable prefixes

### 📅 Smart Scheduling
- Visual calendar with drag-and-drop interface
- Recurring jobs (daily, weekly, monthly, custom patterns)
- Crew assignment and availability tracking
- GPS check-in/check-out for field teams
- Real-time job status updates via Socket.IO

### 📍 GPS Time Tracking
- Location-verified clock-in/clock-out
- Real-time crew location tracking
- Actual vs. estimated time tracking
- Route history and job site verification

### 💰 Invoicing & Payments
- Auto-generate invoices from completed work orders
- Professional PDF invoice generation
- Payment tracking and reminders
- QuickBooks Online integration
- Authorize.Net payment processing
- Multiple payment status tracking

### 📝 Estimates & Contracts
- Create detailed estimates with line items
- Convert estimates to work orders
- Digital contract management
- E-signature support
- Contract templates and customization

### 👥 Client Portal
- Secure client login and dashboard
- View work orders, invoices, and history
- Submit service requests online
- Download receipts and documents
- Real-time notifications
- Contract viewing and signing

### 📦 Materials & Inventory
- Track materials used per job
- Inventory management with categories
- Cost tracking and profitability analysis
- Multi-category support (plumbing, electrical, HVAC, landscaping, etc.)

### 👨‍💼 Employee Management
- Role-based permissions and access control
- Crew member profiles and contact info
- Team assignments and scheduling
- Performance tracking
- Mobile access for field teams

### 🎨 Custom Forms Builder
- Drag-and-drop form builder with 10+ field types
- Create intake forms, safety checklists, inspections
- Share via link or client portal
- Save & continue later functionality
- Form templates and customization

### 📊 Reports & Analytics
- Revenue tracking and profitability reports
- Job completion rates
- Crew performance metrics
- Service type analysis
- Export to CSV
- Custom date ranges

### 🔔 Real-Time Notifications
- Socket.IO powered live updates
- Work order status changes
- New client requests
- Payment notifications
- Contract signature alerts

---

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js 5** - Web framework
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Socket.IO** - Real-time communication
- **Firebase Admin SDK** - Firestore database
- **PDFKit & PDF-Lib** - PDF generation
- **Nodemailer** - Email service
- **node-cron** - Scheduled tasks
- **QuickBooks SDK** - Accounting integration
- **Authorize.Net SDK** - Payment processing

### Frontend
- **React 18** - UI framework
- **React Router DOM** - Navigation
- **React DnD** - Drag and drop
- **Vite** - Build tool
- **Axios** - HTTP client
- **Lucide React** - Icons
- **Socket.IO Client** - Real-time updates

### Database
- **Firestore** (Production) - Cloud NoSQL database
- **JSON Files** (Development) - Local data storage fallback

---

## 📦 Installation

### Prerequisites
- Node.js 16+ and npm
- Firebase project (for production)
- QuickBooks Developer account (optional)
- Authorize.Net account (optional)

### 1. Clone Repository
```bash
git clone https://github.com/touseeqiqbal/phoenixapp.git
cd BOOTMARK--main
```

### 2. Install Backend Dependencies
```bash
npm install
```

### 3. Install Frontend Dependencies
```bash
cd public
npm install
cd ..
```

### 4. Install Marketing Site Dependencies (Optional)
```bash
cd marketing-site
npm install
cd ..
```

### 4. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this

# Firebase Configuration (Production)
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=.firebase-service-account.json

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# QuickBooks OAuth (Optional)
QUICKBOOKS_CLIENT_ID=your-client-id
QUICKBOOKS_CLIENT_SECRET=your-client-secret
QUICKBOOKS_REDIRECT_URI=http://localhost:4000/api/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox

# Authorize.Net (Optional)
AUTHORIZENET_API_LOGIN_ID=your-api-login-id
AUTHORIZENET_TRANSACTION_KEY=your-transaction-key
AUTHORIZENET_ENVIRONMENT=sandbox

# Application URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
```

### 5. Firebase Setup (Production)

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Create a service account and download JSON key
4. Save as `.firebase-service-account.json` in project root
5. Add to `.gitignore`

---

## 🚀 Running the Application

### Development Mode

**Option 1: Separate Terminals**

Terminal 1 - Backend:
```bash
npm run dev
```
Server runs on `http://localhost:4000`

Terminal 2 - Frontend:
```bash
cd public
npm run dev
```
Frontend runs on `http://localhost:3000`

Terminal 3 - Marketing Site (Optional):
```bash
cd marketing-site
npm run dev
```
Marketing site runs on `http://localhost:3001`

**Option 2: Single Command** (if you set up concurrently)
```bash
npm run dev
```

### Marketing Site Only

To run just the marketing website:
```bash
cd marketing-site
npm run dev
```
Access at `http://localhost:3001`

### Production Build

```bash
# Build frontend
npm run build

# Start server
npm start
```

The application serves the built frontend from `public/dist`.

---

## 📁 Project Structure

```
BOOTMARK--main/
├── routes/                    # Express API routes
│   ├── auth.js               # Authentication & user management
│   ├── workOrders.js         # Work order CRUD operations
│   ├── scheduling.js         # Calendar & recurring jobs
│   ├── clients.js            # Client management
│   ├── invoices.js           # Invoice generation & tracking
│   ├── estimates.js          # Estimate management
│   ├── contracts.js          # Contract management
│   ├── materials.js          # Inventory & materials
│   ├── employees.js          # Employee management
│   ├── forms.js              # Custom form builder
│   ├── submissions.js        # Form submissions
│   ├── quickbooks.js         # QuickBooks integration
│   ├── payments.js           # Payment processing
│   ├── serviceRequests.js    # Client service requests
│   └── public.js             # Public form access
├── middleware/
│   └── auth.js               # JWT authentication middleware
├── utils/
│   ├── db.js                 # Database abstraction (Firestore/JSON)
│   ├── dataPath.js           # Data file path utilities
│   ├── emailService.js       # Email sending service
│   ├── numberGenerator.js    # Work order/invoice numbering
│   └── pdfGenerator.js       # PDF generation utilities
├── data/                     # JSON data storage (development)
│   ├── users.json
│   ├── workOrders.json
│   ├── schedule.json
│   ├── clients.json
│   ├── invoices.json
│   ├── estimates.json
│   ├── contracts.json
│   ├── materials.json
│   ├── employees.json
│   ├── forms.json
│   └── submissions.json
├── public/                   # React frontend
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── WorkOrders.jsx
│   │   │   ├── Scheduling.jsx
│   │   │   ├── Clients.jsx
│   │   │   ├── Invoices.jsx
│   │   │   ├── Estimates.jsx
│   │   │   ├── Contracts.jsx
│   │   │   ├── Materials.jsx
│   │   │   ├── Employees.jsx
│   │   │   ├── FormBuilder.jsx
│   │   │   ├── ClientPortal.jsx
│   │   │   └── Reports.jsx
│   │   ├── styles/          # CSS files
│   │   └── utils/           # Utility functions
│   └── package.json
├── marketing-site/          # Marketing website
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── assets/
├── server.js                # Express server entry point
├── package.json
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-profile` - Update user profile

### Work Orders
- `GET /api/work-orders` - Get all work orders
- `GET /api/work-orders/:id` - Get single work order
- `POST /api/work-orders` - Create work order
- `PUT /api/work-orders/:id` - Update work order
- `DELETE /api/work-orders/:id` - Delete work order
- `GET /api/work-orders/:id/pdf` - Generate PDF
- `POST /api/work-orders/:id/email` - Email work order

### Scheduling
- `GET /api/schedule` - Get all scheduled events
- `POST /api/schedule` - Create event
- `PUT /api/schedule/:id` - Update event
- `DELETE /api/schedule/:id` - Delete event
- `PUT /api/schedule/:id/checkin` - GPS check-in
- `PUT /api/schedule/:id/checkout` - GPS check-out

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get single client
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `POST /api/clients/:id/invite` - Send portal invitation

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get single invoice
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/:id/pdf` - Generate PDF
- `POST /api/invoices/:id/email` - Email invoice

### Estimates
- `GET /api/estimates` - Get all estimates
- `POST /api/estimates` - Create estimate
- `PUT /api/estimates/:id` - Update estimate
- `DELETE /api/estimates/:id` - Delete estimate
- `POST /api/estimates/:id/convert` - Convert to work order

### Contracts
- `GET /api/contracts` - Get all contracts
- `POST /api/contracts` - Create contract
- `PUT /api/contracts/:id` - Update contract
- `DELETE /api/contracts/:id` - Delete contract
- `POST /api/contracts/:id/sign` - Sign contract

### Materials
- `GET /api/materials` - Get all materials
- `POST /api/materials` - Create material
- `PUT /api/materials/:id` - Update material
- `DELETE /api/materials/:id` - Delete material

### Employees
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Forms & Submissions
- `GET /api/forms` - Get all forms
- `POST /api/forms` - Create form
- `PUT /api/forms/:id` - Update form
- `DELETE /api/forms/:id` - Delete form
- `GET /api/submissions` - Get all submissions
- `GET /api/submissions/form/:formId` - Get form submissions

### QuickBooks Integration
- `GET /api/quickbooks/auth` - Initiate OAuth
- `GET /api/quickbooks/callback` - OAuth callback
- `POST /api/quickbooks/sync-invoice` - Sync invoice to QuickBooks

### Payments
- `POST /api/payments/charge` - Process payment
- `GET /api/payments/:id` - Get payment details

### Client Portal
- `GET /api/client-portal/dashboard` - Client dashboard data
- `GET /api/client-portal/work-orders` - Client's work orders
- `GET /api/client-portal/invoices` - Client's invoices
- `GET /api/client-portal/contracts` - Client's contracts
- `POST /api/client-portal/service-request` - Submit service request

---

## 👥 User Roles & Permissions

### Business Owner
- Full access to all features
- Manage employees and permissions
- View all reports and analytics
- Configure business settings

### Manager
- Manage work orders and scheduling
- View and create invoices
- Manage clients and employees
- Access reports

### Employee
- View assigned work orders
- Check in/out with GPS
- Update job status
- View schedule

### Client
- Access client portal
- View work orders and invoices
- Submit service requests
- Sign contracts
- Make payments

---

## 🎯 Usage Guide

### For Business Owners

1. **Initial Setup**
   - Register your business account
   - Configure business settings (name, logo, colors)
   - Set up service categories
   - Add employees and assign roles

2. **Client Management**
   - Add clients with contact information
   - Create client properties/locations
   - Send portal invitations

3. **Work Order Workflow**
   - Create work order from dashboard
   - Assign crew and schedule
   - Track progress with GPS
   - Complete and invoice

4. **Invoicing**
   - Auto-generate from completed work orders
   - Send via email or client portal
   - Track payments
   - Sync with QuickBooks

### For Clients

1. **Portal Access**
   - Receive invitation email
   - Create portal account
   - Access dashboard

2. **View Information**
   - See all work orders
   - View invoices and payment history
   - Download receipts

3. **Submit Requests**
   - Fill out service request forms
   - Upload photos
   - Track request status

4. **Sign Contracts**
   - Review contract details
   - E-sign digitally
   - Download signed copy

---

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Role-based access control (RBAC)
- Secure session management
- Rate limiting on API endpoints
- Helmet.js security headers
- CORS configuration
- Input validation and sanitization

---

## 🌐 Deployment

### Recommended Platforms

- **Vercel** (Frontend + API)
- **Render** (Full-stack)
- **Google Cloud Run** (Containerized)
- **Heroku** (Full-stack)

See [Deployment Guide](./docs/deployment.md) for detailed instructions.

---

## 📊 Database Schema

### Firestore Collections

- `users` - User accounts and authentication
- `businesses` - Business profiles and settings
- `clients` - Client information
- `properties` - Client properties/locations
- `workOrders` - Work orders
- `schedule` - Scheduled events
- `invoices` - Invoices
- `estimates` - Estimates
- `contracts` - Contracts
- `materials` - Inventory items
- `employees` - Employee profiles
- `forms` - Custom forms
- `submissions` - Form submissions
- `payments` - Payment records
- `serviceRequests` - Client service requests

---

## 🔄 Integrations

### QuickBooks Online
- OAuth 2.0 authentication
- Sync invoices and payments
- Customer synchronization
- Chart of accounts mapping

### Authorize.Net
- Credit card processing
- ACH payments
- Recurring billing
- Payment profiles

### Email (SMTP)
- Invoice delivery
- Client invitations
- Notifications
- Password resets

---

## 📱 Mobile Support

- Responsive design for all screen sizes
- Mobile-optimized forms
- GPS functionality for field teams
- Touch-friendly interface
- Offline capability (planned)

---

## 🚧 Roadmap

- [ ] Mobile apps (iOS/Android)
- [ ] Advanced reporting dashboard
- [ ] Multi-language support
- [ ] Stripe payment integration
- [ ] SMS notifications
- [ ] Advanced scheduling AI
- [ ] Customer feedback system
- [ ] Inventory auto-reordering
- [ ] Team collaboration tools
- [ ] API webhooks

---

## 📝 License

ISC

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

For support, email support@bootmark.com or open an issue on GitHub.

---

## 🙏 Acknowledgments

Built with modern web technologies and best practices for field service businesses.

---

**BOOTMARK** - *Complete Service Management for Field Service Businesses*
