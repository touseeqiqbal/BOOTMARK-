# Phoenix Form Builder

A comprehensive form builder application with drag-and-drop functionality. Built with React, Express, and multiple framework support.

## Features

- 🎨 **Drag-and-Drop Form Builder** - Intuitive interface for creating forms
- 📝 **Multiple Field Types** - Text, Email, Number, Textarea, Dropdown, Radio, Checkbox, Date, File Upload, Rating
- 👁️ **Live Preview** - Preview your form before publishing
- 🔗 **Form Sharing** - Share forms via unique links
- 📊 **Submissions Management** - View and manage form submissions
- 💾 **Export to CSV** - Download submissions as CSV files
- 🎨 **Customizable Settings** - Theme options and form settings
- 🔐 **User Authentication** - Secure login and registration
- 📱 **Responsive Design** - Works on all devices

## Tech Stack

### Backend
- Node.js
- Express.js
- JWT Authentication
- bcryptjs for password hashing

### Frontend
- React 18
- React Router DOM
- React DnD (Drag and Drop)
- Vite (Build tool)
- Axios (HTTP client)
- Lucide React (Icons)

## Installation

1. Install backend dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd public
npm install
```

## Running the Application

### Development Mode

1. Start the backend server:
```bash
npm run dev
```
The server will run on `http://localhost:4000`

2. In a new terminal, start the frontend development server:
```bash
cd public
npm run dev
```
The frontend will run on `http://localhost:3000`

### Production Build

1. Build the frontend:
```bash
cd public
npm run build
```

2. Start the server:
```bash
npm start
```

The application will serve the built frontend from the `public/dist` directory.

## Project Structure

```
/
├── routes/           # Express API routes
│   ├── auth.js      # Authentication routes
│   ├── forms.js     # Form CRUD operations
│   ├── submissions.js # Submission management
│   └── public.js    # Public form access
├── middleware/       # Express middleware
│   └── auth.js      # JWT authentication
├── data/            # JSON data storage
│   ├── users.json   # User data
│   ├── forms.json   # Form data
│   └── submissions.json # Submission data
├── public/          # React frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/     # Page components
│   │   ├── styles/    # CSS files
│   │   └── utils/     # Utility functions
│   └── package.json
└── server.js        # Express server
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Forms (Protected)
- `GET /api/forms` - Get all user's forms
- `GET /api/forms/:id` - Get single form
- `POST /api/forms` - Create new form
- `PUT /api/forms/:id` - Update form
- `DELETE /api/forms/:id` - Delete form

### Submissions (Protected)
- `GET /api/submissions` - Get all submissions
- `GET /api/submissions/form/:formId` - Get form submissions
- `DELETE /api/submissions/:id` - Delete submission

### Public
- `GET /api/public/form/:shareKey` - Get public form
- `POST /api/public/form/:shareKey/submit` - Submit form

## Usage

1. **Register/Login**: Create an account or login to access the dashboard
2. **Create Form**: Click "Create New Form" to start building
3. **Add Fields**: Drag fields from the palette or click to add them
4. **Configure Fields**: Click on a field to edit its properties
5. **Preview**: Use the preview button to see how your form looks
6. **Save**: Save your form when done
7. **Share**: Copy the share link to distribute your form
8. **View Submissions**: Check submissions from the dashboard or form page

## Field Types

- **Text Input** - Single line text input
- **Email** - Email validation
- **Number** - Numeric input with min/max
- **Text Area** - Multi-line text input
- **Dropdown** - Select from options
- **Radio Buttons** - Single choice from options
- **Checkboxes** - Multiple choice from options
- **Date** - Date picker
- **File Upload** - File upload with type restrictions
- **Rating** - Star rating system

## Future Enhancements

- Conditional logic (show/hide fields based on answers)
- Multi-page forms
- Payment integration
- Email notifications
- Advanced styling options
- Form templates
- Analytics dashboard
- Team collaboration

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
