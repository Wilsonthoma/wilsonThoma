// Authentication utility functions

// CSRF Token management
export const getCsrfToken = async (backendUrl) => {
  try {
    const response = await fetch(`${backendUrl}/api/auth/csrf-token`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    throw new Error('Security token request failed');
  }
};

// Request configuration with CSRF protection
export const getSecureConfig = async (backendUrl) => {
  try {
    const csrfToken = await getCsrfToken(backendUrl);
    return {
      headers: { 
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    };
  } catch (error) {
    console.warn('Proceeding without CSRF token:', error.message);
    return {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    };
  }
};

// Password validation
export const validatePassword = (password) => {
  const requirements = {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password)
  };

  const isValid = Object.values(requirements).every(Boolean);
  
  return {
    isValid,
    requirements,
    message: isValid ? null : 'Password does not meet requirements'
  };
};

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  
  return {
    isValid,
    message: isValid ? null : 'Please enter a valid email address'
  };
};

// OTP validation
export const validateOTP = (otp) => {
  const otpRegex = /^\d{6}$/;
  const isValid = otpRegex.test(otp);
  
  return {
    isValid,
    message: isValid ? null : 'OTP must be exactly 6 digits'
  };
};

// User data sanitization
export const sanitizeUserInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 255); // Limit length
};

// Auth error handler
export const handleAuthError = (error) => {
  const response = error.response;
  
  if (!response) {
    return {
      message: 'Network error. Please check your connection.',
      type: 'network'
    };
  }

  const status = response.status;
  const data = response.data;
  
  const errorMap = {
    400: data?.message || 'Invalid request',
    401: data?.message || 'Authentication failed',
    403: data?.message || 'Access denied',
    429: data?.message || 'Too many attempts. Please try again later.',
    500: data?.message || 'Server error. Please try again later.'
  };

  return {
    message: errorMap[status] || 'An unexpected error occurred',
    type: status === 401 ? 'auth' : 'server',
    status,
    data
  };
};

// Session storage helpers
export const authStorage = {
  setPreAuthPath: (path) => {
    sessionStorage.setItem('preAuthPath', path);
  },
  
  getPreAuthPath: () => {
    return sessionStorage.getItem('preAuthPath');
  },
  
  clearPreAuthPath: () => {
    sessionStorage.removeItem('preAuthPath');
  },
  
  setAuthMethod: (method) => {
    sessionStorage.setItem('authMethod', method);
  },
  
  getAuthMethod: () => {
    return sessionStorage.getItem('authMethod');
  },
  
  clearAuthData: () => {
    sessionStorage.removeItem('preAuthPath');
    sessionStorage.removeItem('authMethod');
  }
};

// User role/permission helpers
export const userHelpers = {
  isVerified: (user) => user?.isAccountVerified || false,
  
  getAuthMethod: (user) => user?.authMethod || 'traditional',
  
  isOAuthUser: (user) => user?.authMethod === 'google' || user?.oauth?.google,
  
  getUserInitials: (user) => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  },
  
  getDisplayName: (user) => {
    return user?.name || user?.email?.split('@')[0] || 'User';
  }
};

export default {
  getCsrfToken,
  getSecureConfig,
  validatePassword,
  validateEmail,
  validateOTP,
  sanitizeUserInput,
  handleAuthError,
  authStorage,
  userHelpers
};