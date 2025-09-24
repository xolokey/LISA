import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User as FirebaseUser,
  AuthError
} from 'firebase/auth';
import { auth, googleProvider, githubProvider, microsoftProvider, isFirebaseReady } from '../config/firebase';
import { logger } from '../utils/logger';
import { handleSocialAuthError, SocialAuthError as EnhancedSocialAuthError } from '../utils/errorHandler';

export type SocialProvider = 'google' | 'github' | 'microsoft';

export interface SocialAuthResult {
  user: FirebaseUser;
  providerId: string;
  isNewUser: boolean;
}

// Keep interface for backward compatibility, but extend from enhanced error
export interface SocialAuthError {
  code: string;
  message: string;
  providerId: string;
}

class SocialAuthService {
  private getProvider(providerId: SocialProvider) {
    // Check if Firebase is properly configured
    if (!isFirebaseReady()) {
      throw new Error('Firebase authentication is not configured. Please set up your Firebase credentials.');
    }
    
    switch (providerId) {
      case 'google':
        if (!googleProvider) throw new Error('Google provider not initialized');
        return googleProvider;
      case 'github':
        if (!githubProvider) throw new Error('GitHub provider not initialized');
        return githubProvider;
      case 'microsoft':
        if (!microsoftProvider) throw new Error('Microsoft provider not initialized');
        return microsoftProvider;
      default:
        throw new Error(`Unsupported provider: ${providerId}`);
    }
  }

  /**
   * Sign in with social provider using popup
   */
  async signInWithPopup(providerId: SocialProvider): Promise<SocialAuthResult> {
    try {
      // Check if Firebase is configured
      if (!isFirebaseReady() || !auth) {
        throw new Error('Firebase authentication is not configured. Please set up your Firebase credentials in your .env file.');
      }
      
      logger.info(`Attempting social sign-in with ${providerId} (popup)`);
      
      const provider = this.getProvider(providerId);
      const result = await signInWithPopup(auth, provider);
      
      const authResult: SocialAuthResult = {
        user: result.user,
        providerId,
        isNewUser: result.user.metadata.creationTime === result.user.metadata.lastSignInTime
      };

      logger.info(`Social sign-in successful with ${providerId}`, {
        userId: result.user.uid,
        email: result.user.email,
        isNewUser: authResult.isNewUser
      });

      return authResult;
    } catch (error) {
      const enhancedError = handleSocialAuthError(error, providerId);
      logger.error(`Social sign-in failed with ${providerId} (popup)`, {
        error: enhancedError.code,
        message: enhancedError.message
      });
      
      // Return backward compatible error format
      throw {
        code: enhancedError.code,
        message: enhancedError.message,
        providerId
      } as SocialAuthError;
    }
  }

  /**
   * Sign in with social provider using redirect (for mobile or popup-blocked environments)
   */
  async signInWithRedirect(providerId: SocialProvider): Promise<void> {
    try {
      if (!isFirebaseReady() || !auth) {
        throw new Error('Firebase authentication is not configured. Please set up your Firebase credentials in your .env file.');
      }
      
      logger.info(`Attempting social sign-in with ${providerId} (redirect)`);
      
      const provider = this.getProvider(providerId);
      await signInWithRedirect(auth, provider);
    } catch (error) {
      const enhancedError = handleSocialAuthError(error, providerId);
      logger.error(`Social sign-in redirect failed with ${providerId}`, {
        error: enhancedError.code,
        message: enhancedError.message
      });
      
      throw {
        code: enhancedError.code,
        message: enhancedError.message,
        providerId
      } as SocialAuthError;
    }
  }

  /**
   * Get redirect result after redirect-based sign-in
   */
  async getRedirectResult(): Promise<SocialAuthResult | null> {
    try {
      if (!isFirebaseReady() || !auth) {
        logger.warn('Firebase not configured, cannot get redirect result');
        return null;
      }
      
      const result = await getRedirectResult(auth);
      
      if (!result) {
        return null;
      }

      const providerId = this.getProviderIdFromUser(result.user);
      const authResult: SocialAuthResult = {
        user: result.user,
        providerId,
        isNewUser: result.user.metadata.creationTime === result.user.metadata.lastSignInTime
      };

      logger.info(`Social sign-in redirect result processed`, {
        userId: result.user.uid,
        providerId,
        isNewUser: authResult.isNewUser
      });

      return authResult;
    } catch (error) {
      const enhancedError = handleSocialAuthError(error, 'unknown');
      logger.error(`Failed to get redirect result`, {
        error: enhancedError.code,
        message: enhancedError.message
      });
      
      throw {
        code: enhancedError.code,
        message: enhancedError.message,
        providerId: 'unknown'
      } as SocialAuthError;
    }
  }

  /**
   * Sign out from Firebase Auth
   */
  async signOut(): Promise<void> {
    try {
      if (!isFirebaseReady() || !auth) {
        logger.warn('Firebase not configured, skipping sign out');
        return;
      }
      
      await signOut(auth);
      logger.info('User signed out successfully');
    } catch (error) {
      const authError = error as AuthError;
      logger.error('Sign out failed', {
        error: authError.code,
        message: authError.message
      });
      throw authError;
    }
  }

  /**
   * Check if popup is supported (for mobile detection)
   */
  isPopupSupported(): boolean {
    return typeof window !== 'undefined' && 
           !window.navigator.userAgent.match(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile/i);
  }

  /**
   * Get provider ID from Firebase user
   */
  private getProviderIdFromUser(user: FirebaseUser): string {
    const providerData = user.providerData[0];
    if (!providerData) return 'unknown';

    if (providerData.providerId.includes('google')) return 'google';
    if (providerData.providerId.includes('github')) return 'github';
    if (providerData.providerId.includes('microsoft')) return 'microsoft';
    
    return providerData.providerId;
  }

  /**
   * Extract user profile data for our application
   */
  extractUserProfile(user: FirebaseUser) {
    return {
      id: user.uid,
      email: user.email || '',
      name: user.displayName || '',
      avatar: user.photoURL || '',
      emailVerified: user.emailVerified,
      provider: this.getProviderIdFromUser(user),
      createdAt: user.metadata.creationTime,
      lastSignInAt: user.metadata.lastSignInTime
    };
  }

  /**
   * Get user-friendly error messages
   */
  getErrorMessage(error: SocialAuthError): string {
    switch (error.code) {
      case 'auth/popup-blocked':
        return 'Pop-up was blocked. Please allow pop-ups for this site or try again.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled. Please try again.';
      case 'auth/cancelled-popup-request':
        return 'Another sign-in is already in progress.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email but different sign-in credentials.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/operation-not-allowed':
        return `Social sign-in is not enabled. Please contact support.`;
      case 'auth/configuration-not-found':
        return 'Social authentication is not configured. Please set up Firebase credentials.';
      default:
        return `Sign-in failed: ${error.message}`;
    }
  }
}

export const socialAuthService = new SocialAuthService();