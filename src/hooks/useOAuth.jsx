import { useState, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AppContext } from '../context/AppContext';

export const useOAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { backendUrl, getUserData } = useContext(AppContext);
  const navigate = useNavigate();

  // Handle Google OAuth login
  const handleGoogleLogin = useCallback(() => {
    setIsLoading(true);
    
    // Store current path for redirect after login
    const currentPath = window.location.pathname;
    sessionStorage.setItem('preAuthPath', currentPath);
    
    // Redirect to Google OAuth endpoint
    window.location.href = `${backendUrl}/api/auth/google`;
  }, [backendUrl]);

  // Handle OAuth callback (to be called in App.js or Login component)
  const handleOAuthCallback = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const loginStatus = urlParams.get('login');

    // Handle OAuth errors
    if (error) {
      const errorMessages = {
        'oauth_failed': 'Google login failed. Please try again.',
        'no_code': 'Authentication incomplete. Please try again.',
        'user_cancelled': 'Login cancelled.',
        'invalid_state': 'Security validation failed. Please try again.',
        'token_expired': 'Authentication session expired. Please try again.',
        'user_exists': 'Account already exists with different login method.'
      };

      const errorMessage = errorMessages[error] || 'Authentication failed';
      toast.error(errorMessage);

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return { success: false, error: errorMessage };
    }

    // Handle OAuth success
    if (loginStatus === 'success') {
      try {
        // Wait for cookies to be set
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch user data
        const result = await getUserData();
        
        if (result.success) {
          toast.success(`Welcome back, ${result.user.name}!`);
          
          // Redirect to previous path or home
          const preAuthPath = sessionStorage.getItem('preAuthPath');
          sessionStorage.removeItem('preAuthPath');
          
          const redirectPath = preAuthPath && preAuthPath !== '/login' ? preAuthPath : '/';
          navigate(redirectPath, { replace: true });
          
          return { success: true, user: result.user };
        } else {
          throw new Error('Failed to fetch user data after OAuth login');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        toast.error('Failed to complete login. Please try again.');
        return { success: false, error: error.message };
      } finally {
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    return { success: false, error: null };
  }, [getUserData, navigate]);

  // Check if user has OAuth account (for traditional login attempts)
  const checkOAuthAccount = useCallback((errorMessage) => {
    if (errorMessage?.includes('Google authentication') || 
        errorMessage?.includes('uses Google login')) {
      return true;
    }
    return false;
  }, []);

  return {
    isLoading,
    handleGoogleLogin,
    handleOAuthCallback,
    checkOAuthAccount
  };
};

export default useOAuth;