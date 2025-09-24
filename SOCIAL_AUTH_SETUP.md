# Social Authentication Setup Guide

This guide will help you set up Google OAuth, GitHub OAuth, and Microsoft OAuth for the LISA AI Assistant.

## 🚀 Quick Start

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Install dependencies** (already done):
   ```bash
   yarn add firebase react-google-button
   ```

3. **Set up Firebase project** (see detailed steps below)

4. **Configure OAuth providers** (see provider-specific steps below)

## 🔥 Firebase Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select existing project
3. Follow the setup wizard
4. Enable Google Analytics (optional)

### Step 2: Add Web App
1. In your Firebase project, click "Add app" > "Web"
2. Register your app with nickname "LISA AI Assistant"
3. Copy the Firebase configuration object
4. Paste values into your `.env` file

### Step 3: Enable Authentication
1. Go to "Authentication" > "Get started"
2. Go to "Sign-in method" tab
3. Enable the providers you want to use

## 📱 Provider Setup

### Google OAuth (Built-in with Firebase)
Google OAuth is automatically available when you enable it in Firebase.

1. In Firebase Console > Authentication > Sign-in method
2. Click "Google" > Enable
3. Set support email (your email)
4. Save

**That's it!** Google OAuth is ready to use.

### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in details:
   - **Application name**: LISA AI Assistant
   - **Homepage URL**: `http://localhost:5173` (for development)
   - **Authorization callback URL**: `https://your-project.firebaseapp.com/__/auth/handler`
4. Copy Client ID and Client Secret

5. In Firebase Console > Authentication > Sign-in method
6. Click "GitHub" > Enable
7. Paste Client ID and Client Secret
8. Copy the redirect URL and add it to your GitHub OAuth app
9. Save

### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Fill in details:
   - **Name**: LISA AI Assistant
   - **Account types**: Personal Microsoft accounts only
   - **Redirect URI**: `https://your-project.firebaseapp.com/__/auth/handler`
5. Copy Application (client) ID

6. Go to "Certificates & secrets" > "New client secret"
7. Copy the secret value

8. In Firebase Console > Authentication > Sign-in method
9. Click "Microsoft" > Enable
10. Paste Client ID and Client Secret
11. Save

## 🔧 Configuration Files

The following files have been created/updated for social auth:

### Core Configuration
- `/src/config/firebase.ts` - Firebase initialization and providers
- `/src/services/socialAuthService.ts` - Social auth service layer
- `/src/hooks/useSocialAuth.ts` - React hook for social auth

### UI Components
- `/src/components/auth/SocialAuthButtons.tsx` - Social login buttons
- `/src/components/auth/LoginForm.tsx` - Updated with social options
- `/src/components/auth/RegisterForm.tsx` - Updated with social options

### Database Schema
- `prisma/schema.prisma` - Updated User model with social auth fields
- Added `SocialAccount` model for multiple social providers per user

## 🔐 Security Considerations

1. **Environment Variables**: Never commit real Firebase config to git
2. **HTTPS Required**: OAuth providers require HTTPS in production
3. **Domain Verification**: Add your production domain to Firebase authorized domains
4. **Scope Permissions**: Only request necessary permissions from OAuth providers

## 🏃‍♂️ Testing

1. **Start the development server**:
   ```bash
   yarn dev
   ```

2. **Test each provider**:
   - Click on Google/GitHub/Microsoft buttons
   - Complete OAuth flow
   - Verify user is created in database
   - Check Firebase Authentication console

## 🚨 Troubleshooting

### Common Issues

**1. "Auth domain not authorized"**
- Add your domain to Firebase > Authentication > Settings > Authorized domains

**2. "Popup blocked"**
- The system automatically falls back to redirect flow on mobile
- Ensure popup blockers are disabled for testing

**3. "OAuth provider not configured"**
- Check that the provider is enabled in Firebase Console
- Verify client ID/secret are correctly set

**4. "Invalid redirect URI"**
- Ensure redirect URI in OAuth provider matches Firebase redirect URL
- Format: `https://your-project.firebaseapp.com/__/auth/handler`

### Debug Tips

1. Check browser console for detailed error messages
2. Look at Firebase Authentication logs
3. Verify environment variables are loaded correctly
4. Test with different browsers/incognito mode

## 📝 Environment Variables Reference

```env
# Required Firebase Config
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
REACT_APP_FIREBASE_MEASUREMENT_ID=G-ABCDEF1234  # Optional for Analytics
```

## 🎉 You're Ready!

Once configured, users can now:
- Sign up/Sign in with Google (one-click)
- Sign up/Sign in with GitHub (developer-friendly)
- Sign up/Sign in with Microsoft (enterprise-friendly)
- Automatically sync with your LISA backend
- Maintain secure authentication sessions

The social authentication integrates seamlessly with your existing email/password authentication system!