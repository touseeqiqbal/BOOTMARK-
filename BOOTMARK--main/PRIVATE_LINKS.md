# Private Links Feature Documentation

## Overview

Private Links allow form owners to require authentication for form access. When enabled, clients must sign in to BootMark before they can view and submit the form. This feature ensures that:

- Only authenticated users can access the form
- Clients can only see their own submissions
- Form owners can optionally restrict access to specific email addresses
- Clients can save their progress and continue later

## How It Works

### For Form Owners

1. **Enable Private Link**
   - Open your form in the Form Builder
   - Click the Settings icon
   - Scroll to "Private Link Settings"
   - Check "Require sign-in for this form (Private Link)"

2. **Optional: Restrict by Email**
   - In the same settings section, you can optionally enter allowed client emails
   - Enter one email per line
   - Leave empty to allow any signed-in user
   - Only the specified emails will be able to access the form

3. **Share the Link**
   - Copy the share link as usual
   - Share it with your clients
   - Clients will be prompted to sign in when they access the link

### For Clients

1. **Accessing a Private Link**
   - Click on the private link shared by the form owner
   - If not signed in, you'll see a sign-in screen
   - Sign in with your BootMark account or use Google Sign-In
   - After signing in, you'll be redirected back to the form

2. **Filling Out the Form**
   - Fill out the form fields as usual
   - Use "Save and Continue Later" to save your progress at any time
   - Return to the form later - your saved draft will be automatically loaded
   - Complete and submit when ready

3. **Viewing Your Submissions**
   - Click "My Submissions" button in the form header or after submission
   - View all your submissions for this form
   - See submission dates and details
   - Each client can only see their own submissions

## Technical Details

### Backend Implementation

#### Form Settings
- `isPrivateLink`: Boolean flag indicating if form requires authentication
- `allowedEmails`: Array of email addresses (optional) that are allowed to access the form

#### Submission Data
- `submittedBy`: User ID of the client who submitted the form (stored in submissions)
- `isDraft`: Boolean flag indicating if submission is a draft

#### API Endpoints

**Get Form (with authentication check)**
```
GET /api/public/form/:shareKey
```
- Returns form data if public or if user is authenticated (for private links)
- Returns 401 if private link and user not authenticated
- Returns 403 if email not in allowed list

**Submit Form**
```
POST /api/public/form/:shareKey/submit
Body: { data: {...}, draftId?: string }
```
- Requires authentication for private links
- Stores `submittedBy` field with client's user ID
- Converts draft to submission if `draftId` is provided

**Save Draft**
```
POST /api/public/form/:shareKey/draft
Body: { data: {...} }
```
- Requires authentication
- Saves form data as draft
- Replaces existing draft if one exists

**Get Draft**
```
GET /api/public/form/:shareKey/draft
```
- Requires authentication
- Returns saved draft for the authenticated user
- Returns 404 if no draft exists

**Get Client Submissions**
```
GET /api/public/form/:shareKey/submissions
```
- Requires authentication
- Returns only submissions where `submittedBy` matches the authenticated user's ID
- Excludes drafts from the list

**Delete Draft**
```
DELETE /api/public/form/:shareKey/draft
```
- Requires authentication
- Deletes the saved draft for the authenticated user

### Frontend Implementation

#### PublicForm Component
- Checks if form requires authentication on load
- Shows sign-in screen if authentication required and user not signed in
- Loads saved draft automatically when user returns
- Displays "Save and Continue Later" button for private links
- Shows "My Submissions" link for authenticated users

#### ClientSubmissions Component
- Displays client's own submissions for a specific form
- Shows submission date, number, and all field values
- Provides link back to the form

#### Authentication Flow
- Login page handles redirect query parameters
- After successful login, user is redirected back to the form they were accessing
- Google Sign-In also supports redirects

## Use Cases

### 1. Client-Specific Forms
- Landscaping companies can create forms for specific clients
- Each client can only see and submit their own information
- Form owner can track which client submitted what

### 2. Progress Saving
- Long forms can be saved and completed later
- Clients don't lose their progress if interrupted
- Drafts are automatically loaded when returning to the form

### 3. Email Restrictions
- Restrict form access to specific clients
- Enter client emails in settings
- Only those emails can access the form

### 4. Submission History
- Clients can view their submission history
- See all previous submissions for a form
- Track changes over time

## Security Considerations

1. **Authentication Required**: Private links require valid BootMark authentication
2. **Email Verification**: If email restrictions are set, only those emails can access
3. **User Isolation**: Clients can only see their own submissions
4. **Draft Privacy**: Drafts are user-specific and cannot be accessed by others
5. **Token Validation**: All API requests validate authentication tokens

## Troubleshooting

### Client Can't Access Form
- **Check**: Is the form set to private link?
- **Check**: Is the client signed in?
- **Check**: If email restrictions are set, is the client's email in the allowed list?

### Draft Not Loading
- **Check**: Is the client signed in?
- **Check**: Was the draft saved successfully?
- **Check**: Browser console for errors

### Submissions Not Showing
- **Check**: Is the client viewing their own submissions page?
- **Check**: Were submissions made while signed in?
- **Check**: Form owner can see all submissions, clients only see their own

## Best Practices

1. **Email Restrictions**: Use email restrictions for sensitive forms
2. **Clear Instructions**: Inform clients that they need to sign in
3. **Save Reminders**: Remind clients to save progress on long forms
4. **Testing**: Test private links with different user accounts before sharing
5. **Documentation**: Provide clients with instructions on how to access and use private links

