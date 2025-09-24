import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useSocialAuth } from '../../hooks/useSocialAuth';
import { SocialAuthButtons } from './SocialAuthButtons';
import { SocialAuthError } from '../../services/socialAuthService';

// Simple Card component
const Card: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-6 ${className}`}>
    {children}
  </div>
);

// Simple Spinner component
const Spinner: React.FC<{className?: string}> = ({ className = '' }) => (
  <div className={`h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin ${className}`} />
);

interface LoginFormProps {
  onToggleMode: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  
  const { login, isLoading, error, clearError } = useAuthStore();
  const { signInWithProvider } = useSocialAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSocialError(null);
    
    try {
      await login({ email, password });
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleSocialAuthSuccess = (result: any) => {
    // Social auth success is handled by the useSocialAuth hook
    console.log('Social auth success:', result);
  };

  const handleSocialAuthError = (error: SocialAuthError) => {
    setSocialError(error.message);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="max-w-md w-full mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">L</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">
            Welcome back
          </h2>
          <p className="text-text-secondary dark:text-dark-text-secondary mt-2">
            Sign in to your Lisa account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary dark:text-dark-secondary hover:text-text-primary dark:hover:text-dark-text-primary"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {isLoading ? (
              <>
                <Spinner className="h-5 w-5 border-white mr-2" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Social Authentication */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6">
            <SocialAuthButtons
              onSuccess={handleSocialAuthSuccess}
              onError={handleSocialAuthError}
              disabled={isLoading}
              size="medium"
              showText={true}
            />
          </div>

          {socialError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <p className="text-red-600 dark:text-red-400 text-sm">{socialError}</p>
            </motion.div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-text-secondary dark:text-dark-text-secondary">
            Don't have an account?{' '}
            <button
              onClick={onToggleMode}
              className="text-primary hover:text-primary-hover font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default LoginForm;