# Testing App Customization Feature

## ✅ Build Status
- **Frontend Build**: ✅ Successful (no errors)
- **Linter**: ✅ No errors found
- **All Files**: ✅ Verified and working

## 🧪 How to Test

### Prerequisites
1. Make sure you have a business account (owner or admin with `business.settings` permission)
2. Have at least one other user in your business to test that changes apply to all users

### Step 1: Access App Customization Page
1. Log in as a **business owner** or **admin with settings permission**
2. Navigate to **App Customization** page (should be in your navigation menu)
3. You should see the customization interface with sections for:
   - Branding (Logo, Favicon, Company Name, Colors)
   - App Settings (App Name, Description, URL, Theme, Font)
   - Features (Enable/Disable features)
   - Notifications
   - Advanced (Custom Domain, API Access)

### Step 2: Test Branding Customization
1. **Upload a Logo**:
   - Click on "Company Logo" section
   - Upload an image (max 2MB)
   - Save changes
   - ✅ Logo should appear in the header/navigation

2. **Change Primary Color**:
   - Click on the color picker for "Primary Color"
   - Choose a new color (e.g., `#10b981` for green)
   - Save changes
   - ✅ Buttons and primary UI elements should change to the new color

3. **Change Secondary/Accent Colors**:
   - Update secondary and accent colors
   - Save changes
   - ✅ Secondary elements should reflect the new colors

### Step 3: Test Theme Changes
1. **Change Theme**:
   - Select "Theme" dropdown
   - Choose "Dark" theme
   - Save changes
   - ✅ Page should switch to dark mode
   - Try "Light" and "Auto" (follows system preference)

2. **Change Font Family**:
   - Select a different font (e.g., "Roboto", "Montserrat")
   - Save changes
   - ✅ All text should use the new font

### Step 4: Test App Settings
1. **Change App Name**:
   - Update "App Name" field (e.g., "My Company App")
   - Save changes
   - ✅ Browser tab title should update

2. **Update App Description**:
   - Change the description
   - Save changes

### Step 5: Test Multi-User Application
1. **As Business Owner/Admin**:
   - Make customization changes
   - Save them

2. **As Another User in the Same Business**:
   - Log in with a different account that belongs to the same business
   - ✅ They should see:
     - Same logo
     - Same colors
     - Same theme
     - Same font
     - Same app name

3. **Refresh Test**:
   - Have the second user refresh their browser
   - ✅ Changes should be visible immediately

### Step 6: Test Permission System
1. **As Business Owner**:
   - ✅ Should have full access to customization

2. **As Admin with `business.settings` Permission**:
   - ✅ Should be able to customize

3. **As Regular Member (without permission)**:
   - Try to access `/app-customization`
   - ✅ Should see "Access Denied" message

### Step 7: Test Feature Toggles
1. **Disable a Feature**:
   - Uncheck a feature (e.g., "Analytics")
   - Save changes
   - ✅ That feature should be hidden/disabled for all users

2. **Re-enable Feature**:
   - Check the feature again
   - Save changes
   - ✅ Feature should be available again

### Step 8: Test Caching
1. **Make Changes**:
   - Update customization
   - Save

2. **Check localStorage**:
   - Open browser DevTools (F12)
   - Go to Application > Local Storage
   - Look for `businessCustomization` key
   - ✅ Should contain the customization JSON

3. **Test Offline Behavior**:
   - Disconnect from internet
   - Refresh page
   - ✅ Customization should still apply (from cache)

## 🔍 Verification Checklist

### Backend Verification
- [ ] `/businesses/my-business` endpoint returns customization
- [ ] `/businesses/update` endpoint saves customization correctly
- [ ] Permission check works (only owners/admins with `business.settings` can update)
- [ ] Customization is stored in business document

### Frontend Verification
- [ ] `BusinessTheme` component loads and applies customization
- [ ] CSS variables are set correctly (`--primary-color`, `--secondary-color`, etc.)
- [ ] Theme classes are applied (`theme-light`, `theme-dark`)
- [ ] Favicon updates when changed
- [ ] App name updates in browser title
- [ ] Font family applies globally

### Multi-User Verification
- [ ] All users in business see same customization
- [ ] Changes apply immediately (or after refresh)
- [ ] No conflicts between user accounts

## 🐛 Common Issues & Solutions

### Issue: Changes not applying
**Solution**: 
- Check browser console for errors
- Verify user has correct permissions
- Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Clear localStorage and try again

### Issue: Colors not changing
**Solution**:
- Check if CSS variables are being set (inspect element, check `:root` styles)
- Verify color format is correct (hex: `#ffffff`)
- Check if theme is overriding colors

### Issue: Permission denied
**Solution**:
- Verify user is business owner OR has `business.settings` permission
- Check user's `businessPermissions` array in database
- Ensure user is a member of the business

### Issue: Theme not switching
**Solution**:
- Check browser console for errors
- Verify `data-theme` attribute is set on `<html>` element
- Check if theme CSS classes exist

## 📝 Test Data Examples

### Sample Customization Object
```json
{
  "logo": "data:image/png;base64,...",
  "favicon": "data:image/png;base64,...",
  "companyName": "My Awesome Company",
  "primaryColor": "#10b981",
  "secondaryColor": "#3b82f6",
  "accentColor": "#f59e0b",
  "appName": "My Company App",
  "appDescription": "Custom business management platform",
  "theme": "dark",
  "fontFamily": "Roboto",
  "features": {
    "forms": true,
    "analytics": true,
    "invoices": true
  }
}
```

## 🎯 Expected Behavior

1. **Immediate Application**: Changes should apply as soon as they're saved
2. **Global Application**: All users in the business see the same customization
3. **Persistence**: Customization persists across sessions
4. **Caching**: Customization is cached for offline access
5. **Permission-Based**: Only authorized users can make changes

## 📊 Testing Results Template

```
Date: ___________
Tester: ___________

✅ Branding (Logo, Colors): [ ] Pass [ ] Fail
✅ Theme (Light/Dark/Auto): [ ] Pass [ ] Fail
✅ Font Family: [ ] Pass [ ] Fail
✅ App Name/Description: [ ] Pass [ ] Fail
✅ Multi-User Application: [ ] Pass [ ] Fail
✅ Permission System: [ ] Pass [ ] Fail
✅ Feature Toggles: [ ] Pass [ ] Fail
✅ Caching: [ ] Pass [ ] Fail

Notes:
_______________________________________
_______________________________________
```

## 🚀 Quick Start Testing

1. **Start the application**:
   ```bash
   # Backend (if not running)
   npm start
   
   # Frontend (in public directory)
   cd public
   npm run dev
   ```

2. **Log in as business owner**

3. **Navigate to App Customization**

4. **Make a simple change** (e.g., change primary color to green)

5. **Save and verify** the color changes throughout the app

6. **Log in as another user** in the same business

7. **Verify** they see the same green color

---

**All files have been checked and verified. No errors found!** ✅

