import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, isFirebaseReady } from '../config/firebase';
import { socialAuthService, SocialAuthResult, SocialAuthError } from '../services/socialAuthService';
import { useAuthStore } from '../store/authStore';
import { logger } from '../utils/logger';

interface UseSocialAuthReturn {
  user: FirebaseUser | null;
  loading: boolean;
  error: SocialAuthError | null;
  signInWithProvider: (provider: 'google' | 'github' | 'microsoft') => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useSocialAuth = (): UseSocialAuthReturn => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<SocialAuthError | null>(null);
  
  const { login, logout } = useAuthStore();

  // Listen for auth state changes
  useEffect(() => {
    if (!isFirebaseReady() || !auth) {
      logger.warn('Firebase not configured, skipping auth state listener');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          
          // Extract user profile and update our auth store
          const userProfile = socialAuthService.extractUserProfile(firebaseUser);
          
          // Sync with our backend and update auth store
          await login({
            email: userProfile.email,
            password: '' // Not used for social auth
          });

          logger.info('User authenticated via Firebase', {
            userId: userProfile.id,
            email: userProfile.email,
            provider: userProfile.provider
          });
        } else {
          setUser(null);
          logout();
        }
      } catch (err) {
        logger.error('Error handling auth state change', { error: err });
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [login, logout]);

  // Handle redirect result on component mount
  useEffect(() => {
    if (!isFirebaseReady()) {
      return;
    }

    const handleRedirectResult = async () => {
      try {
        const result = await socialAuthService.getRedirectResult();
        if (result) {
          logger.info('Redirect authentication successful', {
            provider: result.providerId,
            isNewUser: result.isNewUser
          });
        }
      } catch (err) {
        const authError = err as SocialAuthError;
        setError(authError);
        logger.error('Redirect authentication failed', { error: authError });
      }
    };

    handleRedirectResult();
  }, []);

  const signInWithProvider = useCallback(async (provider: 'google' | 'github' | 'microsoft') => {
    if (!isFirebaseReady()) {
      const error: SocialAuthError = {
        code: 'auth/configuration-not-found',
        message: 'Firebase authentication is not configured. Please set up your Firebase credentials.',
        providerId: provider
      };
      setError(error);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result: SocialAuthResult;
      
      if (socialAuthService.isPopupSupported()) {
        result = await socialAuthService.signInWithPopup(provider);
      } else {
        await socialAuthService.signInWithRedirect(provider);
        return; // Redirect will handle the rest
      }

      logger.info(`Social sign-in successful with ${provider}`, {
        userId: result.user.uid,
        isNewUser: result.isNewUser
      });

    } catch (err) {
      const authError = err as SocialAuthError;
      setError(authError);
      logger.error(`Social sign-in failed with ${provider}`, { error: authError });
    } finally {
      setLoading(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await socialAuthService.signOut();
      logger.info('User signed out successfully');
    } catch (err) {
      const authError = err as SocialAuthError;
      setError(authError);
      logger.error('Sign out failed', { error: authError });
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    loading,
    error,
    signInWithProvider,
    signOut: signOutUser,
    clearError
  };
};