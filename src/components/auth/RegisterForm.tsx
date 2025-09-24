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

interface RegisterFormProps {
  onToggleMode: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleMode }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [socialError, setSocialError] = useState<string | null>(null);
  
  const { register, isLoading, error, clearError } = useAuthStore();
  const { signInWithProvider } = useSocialAuth();

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSocialError(null);
    
    if (formData.password !== formData.confirmPassword) {
      return; // Error will be shown in validation
    }
    
    try {
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.name
      });
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

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    return 'Strong';
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
            Create your account
          </h2>
          <p className="text-text-secondary dark:text-dark-text-secondary mt-2">
            Join Lisa and boost your productivity
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-2">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your full name"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
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
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full p-3 bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                placeholder="Create a password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary dark:text-dark-secondary hover:text-text-primary dark:hover:text-dark-text-primary"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            
            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getPasswordStrengthColor()}`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
                    {getPasswordStrengthText()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              className={`w-full p-3 bg-background dark:bg-dark-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                formData.confirmPassword && formData.password !== formData.confirmPassword
                  ? 'border-red-500'
                  : 'border-border-color dark:border-dark-border-color'
              }`}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
            )}
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
            disabled={
              isLoading || 
              !formData.name || 
              !formData.email || 
              !formData.password || 
              formData.password !== formData.confirmPassword ||
              passwordStrength < 3
            }
            className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {isLoading ? (
              <>
                <Spinner className="h-5 w-5 border-white mr-2" />
                Creating account...
              </>
            ) : (
              'Create Account'
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
            Already have an account?{' '}
            <button
              onClick={onToggleMode}
              className="text-primary hover:text-primary-hover font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default RegisterForm;