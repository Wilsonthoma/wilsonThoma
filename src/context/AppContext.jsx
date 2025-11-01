import { createContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

// 1️⃣ Create the context
export const AppContext = createContext();

export const AppContextProvider = (props) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

  // Configure Axios globally
  axios.defaults.withCredentials = true;

  // 3️⃣ Global states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [csrfToken, setCsrfToken] = useState(null); // NEW: Track CSRF token

  // NEW: Initialize CSRF token once on app start
  const initializeCsrfToken = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/auth/csrf-token`);
      // Set CSRF token globally for all future requests
      axios.defaults.headers.common["X-CSRF-Token"] = data.csrfToken;
      setCsrfToken(data.csrfToken);
      console.log("CSRF token initialized globally");
      return data.csrfToken;
    } catch (error) {
      console.warn("CSRF token initialization failed:", error);
      return null;
    }
  };

  // 4️⃣ Enhanced Function to FETCH actual user details
  const fetchUserData = async () => {
    try {
      // Use the correct endpoint from your backend
      const { data } = await axios.get(`${backendUrl}/api/auth/is-auth`); 
      
      if (data.success && data.user) {
        setUserData(data.user);
        setIsLoggedIn(true);
        return { success: true, user: data.user };
      } else {
        setUserData(null);
        setIsLoggedIn(false);
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error("Fetch user data failed:", error.response?.data?.message || error.message);
      setUserData(null);
      setIsLoggedIn(false);
      
      // Don't show toast for auth check failures (normal for non-logged in users)
      return { 
        success: false, 
        message: error.response?.data?.message || "Authentication check failed" 
      };
    }
  };

  // 5️⃣ NEW: Handle OAuth callback on mount
  useEffect(() => {
    const handleOAuthCallback = async () => {
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
          'token_expired': 'Authentication session expired. Please try again.'
        };
        
        toast.error(errorMessages[error] || 'Authentication failed');
        
        // Clean URL after showing error
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Handle OAuth success
      if (loginStatus === 'success') {
        // Wait a bit for the cookie to be set, then fetch user data
        setTimeout(async () => {
          const result = await fetchUserData();
          if (result.success) {
            toast.success(`Welcome back, ${result.user.name}!`);
          }
          // Clean URL after successful login
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 500);
      }
    };

    handleOAuthCallback();
  }, []);

  // 6️⃣ Check auth state and fetch data on mount - ENHANCED WITH CSRF
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      // Initialize CSRF token FIRST
      await initializeCsrfToken();
      // Then check authentication
      await fetchUserData();
      setIsLoading(false);
      setAuthChecked(true);
    };
    
    checkAuthAndFetch();
  }, []);

  // 7️⃣ Enhanced Logout function - SIMPLIFIED (uses global CSRF token)
  const logout = async () => {
    try {
      // Use the globally set CSRF token - no need to fetch again!
      const { data } = await axios.post(`${backendUrl}/api/auth/logout`, {});
      
      if (data.success) {
        setUserData(null);
        setIsLoggedIn(false);
        toast.success("Logged out successfully!");
        
        // Redirect to home page after logout
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
    } catch (error) {
      console.error("Logout error:", error);
      
      // If logout fails due to CSRF, try to refresh token and retry once
      if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
        try {
          await initializeCsrfToken(); // Refresh CSRF token
          const retryData = await axios.post(`${backendUrl}/api/auth/logout`, {});
          if (retryData.data.success) {
            setUserData(null);
            setIsLoggedIn(false);
            toast.success("Logged out successfully!");
            if (window.location.pathname !== '/') {
              window.location.href = '/';
            }
            return;
          }
        } catch (retryError) {
          console.error("Logout retry failed:", retryError);
        }
      }
      
      // Even if the request fails, clear local state
      setUserData(null);
      setIsLoggedIn(false);
      toast.info("You have been logged out");
      
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
  };

  // 8️⃣ NEW: Function to refresh CSRF token if needed
  const refreshCsrfToken = async () => {
    return await initializeCsrfToken();
  };

  // 9️⃣ NEW: Function to check if user is authenticated (for route guards)
  const checkAuthentication = async () => {
    const result = await fetchUserData();
    return result.success;
  };

  // 🔟 NEW: Function to handle OAuth account detection
  const handleOAuthAccount = (email) => {
    toast.info(
      <div>
        This account uses Google authentication.{" "}
        <button 
          onClick={() => window.location.href = `${backendUrl}/api/auth/google`}
          className="ml-1 underline hover:text-blue-600"
        >
          Sign in with Google instead
        </button>
      </div>,
      { autoClose: 8000 }
    );
  };

  const value = {
    backendUrl,
    isLoggedIn,
    setIsLoggedIn,
    userData,
    setUserData,
    getUserData: fetchUserData,
    logout,
    isLoading,
    authChecked,
    checkAuthentication,
    handleOAuthAccount,
    csrfToken, // NEW: Export CSRF token
    refreshCsrfToken, // NEW: Export refresh function
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh", 
        fontSize: "24px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white"
      }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-white rounded-full border-t-transparent animate-spin"></div>
          Loading Application...
        </div>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{props.children}</AppContext.Provider>;
};