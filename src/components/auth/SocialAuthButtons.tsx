import React, { useState, useCallback } from 'react';
import GoogleButton from 'react-google-button';
import { socialAuthService, SocialProvider, SocialAuthError } from '../../services/socialAuthService';
import { isFirebaseReady } from '../../config/firebase';
import { logger } from '../../utils/logger';

interface SocialAuthButtonsProps {
  onSuccess?: (result: any) => void;
  onError?: (error: SocialAuthError) => void;
  disabled?: boolean;
  size?: 'large' | 'medium' | 'small';
  showText?: boolean;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onSuccess,
  onError,
  disabled = false,
  size = 'medium',
  showText = true
}) => {
  const [loading, setLoading] = useState<{ [key in SocialProvider]?: boolean }>({});
  const firebaseReady = isFirebaseReady();

  const handleSocialAuth = useCallback(async (provider: SocialProvider) => {
    if (disabled || loading[provider] || !firebaseReady) return;

    setLoading(prev => ({ ...prev, [provider]: true }));

    try {
      let result;
      
      // Use popup for desktop, redirect for mobile
      if (socialAuthService.isPopupSupported()) {
        result = await socialAuthService.signInWithPopup(provider);
      } else {
        await socialAuthService.signInWithRedirect(provider);
        return; // Redirect will handle the rest
      }

      const userProfile = socialAuthService.extractUserProfile(result.user);
      
      logger.info(`Social authentication successful`, {
        provider,
        userId: userProfile.id,
        isNewUser: result.isNewUser
      });

      onSuccess?.({ ...result, userProfile });
    } catch (error) {
      const authError = error as SocialAuthError;
      logger.error(`Social authentication failed`, { provider, error: authError });
      
      const friendlyMessage = socialAuthService.getErrorMessage(authError);
      onError?.({ ...authError, message: friendlyMessage });
    } finally {
      setLoading(prev => ({ ...prev, [provider]: false }));
    }
  }, [disabled, loading, onSuccess, onError]);

  const getButtonSize = () => {
    switch (size) {
      case 'large': return { height: 50, fontSize: 16 };
      case 'small': return { height: 36, fontSize: 12 };
      default: return { height: 42, fontSize: 14 };
    }
  };

  const buttonStyle = getButtonSize();

  // If Firebase is not configured, show configuration message
  if (!firebaseReady) {
    return (
      <div className="social-auth-disabled" style={{
        padding: '16px',
        backgroundColor: '#f3f4f6',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        textAlign: 'center' as const
      }}>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
          Social authentication requires Firebase configuration.
          <br />
          Please set up your Firebase credentials to enable social login.
        </p>
      </div>
    );
  }

  return (
    <div className="social-auth-buttons" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '12px', 
      width: '100%' 
    }}>
      {/* Google Sign-In */}
      <GoogleButton
        onClick={() => handleSocialAuth('google')}
        disabled={Boolean(disabled || loading.google || !firebaseReady)}
        style={{
          width: '100%',
          height: buttonStyle.height,
          fontSize: buttonStyle.fontSize,
          opacity: disabled || loading.google || !firebaseReady ? 0.6 : 1,
          cursor: disabled || loading.google || !firebaseReady ? 'not-allowed' : 'pointer'
        }}
        label={loading.google ? 'Signing in...' : (showText ? 'Continue with Google' : '')}
      />

      {/* GitHub Sign-In */}
      <button
        onClick={() => handleSocialAuth('github')}
        disabled={disabled || loading.github || !firebaseReady}
        style={{
          width: '100%',
          height: buttonStyle.height,
          backgroundColor: '#24292e',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: buttonStyle.fontSize,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: disabled || loading.github || !firebaseReady ? 'not-allowed' : 'pointer',
          opacity: disabled || loading.github || !firebaseReady ? 0.6 : 1,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (!disabled && !loading.github && firebaseReady) {
            e.currentTarget.style.backgroundColor = '#1a1e22';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !loading.github && firebaseReady) {
            e.currentTarget.style.backgroundColor = '#24292e';
          }
        }}
      >
        <GitHubIcon size={buttonStyle.fontSize + 4} />
        {showText && (loading.github ? 'Signing in...' : 'Continue with GitHub')}
      </button>

      {/* Microsoft Sign-In */}
      <button
        onClick={() => handleSocialAuth('microsoft')}
        disabled={disabled || loading.microsoft || !firebaseReady}
        style={{
          width: '100%',
          height: buttonStyle.height,
          backgroundColor: '#0078d4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: buttonStyle.fontSize,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: disabled || loading.microsoft || !firebaseReady ? 'not-allowed' : 'pointer',
          opacity: disabled || loading.microsoft || !firebaseReady ? 0.6 : 1,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (!disabled && !loading.microsoft && firebaseReady) {
            e.currentTarget.style.backgroundColor = '#106ebe';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !loading.microsoft && firebaseReady) {
            e.currentTarget.style.backgroundColor = '#0078d4';
          }
        }}
      >
        <MicrosoftIcon size={buttonStyle.fontSize + 4} />
        {showText && (loading.microsoft ? 'Signing in...' : 'Continue with Microsoft')}
      </button>
    </div>
  );
};

// GitHub Icon Component
const GitHubIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

// Microsoft Icon Component
const MicrosoftIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
  </svg>
);