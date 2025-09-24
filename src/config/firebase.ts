import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider } from 'firebase/auth';
import { logger } from '../utils/logger';

// Check if Firebase configuration is available
const isFirebaseConfigured = () => {
  const requiredVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN', 
    'REACT_APP_FIREBASE_PROJECT_ID'
  ];
  
  return requiredVars.every(varName => {
    const value = process.env[varName];
    return value && value !== 'your_firebase_api_key' && value !== 'your_project.firebaseapp.com' && value !== 'your_project_id';
  });
};

// Firebase configuration with fallback values
const firebaseConfig = {
  apiKey: process.env['REACT_APP_FIREBASE_API_KEY'] || '',
  authDomain: process.env['REACT_APP_FIREBASE_AUTH_DOMAIN'] || '',
  projectId: process.env['REACT_APP_FIREBASE_PROJECT_ID'] || '',
  storageBucket: process.env['REACT_APP_FIREBASE_STORAGE_BUCKET'] || '',
  messagingSenderId: process.env['REACT_APP_FIREBASE_MESSAGING_SENDER_ID'] || '',
  appId: process.env['REACT_APP_FIREBASE_APP_ID'] || '',
  measurementId: process.env['REACT_APP_FIREBASE_MEASUREMENT_ID'] || ''
};

// Initialize Firebase only if properly configured
let app: any = null;
let auth: any = null;
let googleProvider: GoogleAuthProvider | null = null;
let githubProvider: GithubAuthProvider | null = null;
let microsoftProvider: OAuthProvider | null = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Initialize Auth Providers
    googleProvider = new GoogleAuthProvider();
    githubProvider = new GithubAuthProvider();
    microsoftProvider = new OAuthProvider('microsoft.com');
    
    // Configure providers
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    
    githubProvider.addScope('user:email');
    
    microsoftProvider.addScope('mail.read');
    microsoftProvider.addScope('user.read');
    
    logger.info('Firebase initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase', { error });
  }
} else {
  logger.warn('Firebase not configured - social authentication will be disabled', {
    configStatus: {
      apiKey: !!process.env['REACT_APP_FIREBASE_API_KEY'],
      authDomain: !!process.env['REACT_APP_FIREBASE_AUTH_DOMAIN'],
      projectId: !!process.env['REACT_APP_FIREBASE_PROJECT_ID']
    }
  });
}

// Export with null checks
export { auth, googleProvider, githubProvider, microsoftProvider };
export const isFirebaseReady = () => auth !== null;
export default app;