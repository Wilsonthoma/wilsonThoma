import React, { useContext, useState } from "react";
import { assets } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";

const Login = () => {
  const [state, setState] = useState("Sign Up");
  const navigate = useNavigate();
  const { backendUrl, getUserData, refreshCsrfToken } = useContext(AppContext); // ✅ Added refreshCsrfToken

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // ✅ REMOVED: getCsrfToken helper function - no longer needed!

  // ✅ FIXED: Google OAuth handler using axios
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      // ✅ Direct request - uses global CSRF token
      const response = await axios.get(`${backendUrl}/api/auth/google`);
      
      if (response.data.success && response.data.authUrl) {
        // Redirect to the Google OAuth URL
        window.location.href = response.data.authUrl;
      } else {
        throw new Error('Failed to get Google auth URL');
      }
    } catch (error) {
      console.error('Google OAuth failed:', error);
      
      // Handle CSRF token expiration
      if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
        try {
          await refreshCsrfToken(); // Refresh the CSRF token
          const retryResponse = await axios.get(`${backendUrl}/api/auth/google`);
          if (retryResponse.data.success && retryResponse.data.authUrl) {
            window.location.href = retryResponse.data.authUrl;
            return;
          }
        } catch (retryError) {
          console.error('Google OAuth retry failed:', retryError);
        }
      }
      
      toast.error('Failed to connect to Google. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  // Handle OAuth callback on page load
  React.useEffect(() => {
    const checkOAuthStatus = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const loginStatus = urlParams.get('login');
      const source = urlParams.get('source');

      if (error) {
        const errorMessages = {
          'oauth_failed': 'Google login failed. Please try again.',
          'no_code': 'Authentication incomplete. Please try again.',
          'user_cancelled': 'Login cancelled.',
          'invalid_state': 'Security validation failed. Please try again.',
          'token_expired': 'Authentication session expired. Please try again.'
        };
        toast.error(errorMessages[error] || 'Authentication failed');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (loginStatus === 'success') {
        // User authenticated via OAuth
        if (source === 'google') {
          toast.success('Logged in successfully with Google!');
        } else {
          toast.success('Logged in successfully!');
        }
        await getUserData();
        navigate("/");
      }
    };

    checkOAuthStatus();
  }, [getUserData, navigate]);

  // ✅ FIXED: Submit handler using axios - NO CSRF FETCHING!
  const onSubmitHandler = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (state === "Sign Up" && !name) {
      toast.error("Please enter your name");
      return;
    }

    setIsLoading(true);
    
    try {
      // ✅ REMOVED: CSRF token fetching - using global token instead!

      const url =
        state === "Sign Up"
          ? `${backendUrl}/api/auth/register`
          : `${backendUrl}/api/auth/login`;

      const payload =
        state === "Sign Up" ? { 
          name: name.trim(), 
          email: email.toLowerCase().trim(), 
          password 
        } : { 
          email: email.toLowerCase().trim(), 
          password 
        };

      // ✅ Direct request - uses globally set CSRF token
      const response = await axios.post(url, payload);

      if (response.data.success) {
        toast.success(
          state === "Sign Up"
            ? "Account created successfully! Please Log In."
            : "Logged in successfully!"
        );

        if (state === "Login") {
          await getUserData();
          navigate("/");
        } else {
          // Switch to login after successful registration
          setState("Login");
          setName("");
          setEmail("");
          setPassword("");
        }
      } else {
        throw new Error(response.data.message || "Request failed");
      }
    } catch (error) {
      console.error("Login/Register Error:", error);
      
      // Handle CSRF token expiration with automatic retry
      if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
        try {
          await refreshCsrfToken(); // Refresh CSRF token
          // Retry the original request
          const url = state === "Sign Up" ? `${backendUrl}/api/auth/register` : `${backendUrl}/api/auth/login`;
          const payload = state === "Sign Up" ? { name: name.trim(), email: email.toLowerCase().trim(), password } : { email: email.toLowerCase().trim(), password };
          
          const retryResponse = await axios.post(url, payload);
          
          if (retryResponse.data.success) {
            toast.success(
              state === "Sign Up"
                ? "Account created successfully! Please Log In."
                : "Logged in successfully!"
            );

            if (state === "Login") {
              await getUserData();
              navigate("/");
            } else {
              setState("Login");
              setName("");
              setEmail("");
              setPassword("");
            }
            return; // Success, exit error handling
          }
        } catch (retryError) {
          console.error("Retry failed:", retryError);
          // Continue to normal error handling below
        }
      }
      
      // Handle OAuth account error
      if (error.response?.data?.message?.includes("Google authentication")) {
        toast.error(
          <div>
            This account uses Google login.{" "}
            <button 
              onClick={handleGoogleLogin}
              className="font-medium underline hover:text-blue-600"
            >
              Sign in with Google instead
            </button>
          </div>,
          { autoClose: 8000 }
        );
      } else {
        // Show user-friendly error messages
        const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
        
        // Common error mappings
        const errorMap = {
          "Invalid email or password": "The email or password you entered is incorrect.",
          "User not found": "No account found with this email address.",
          "Account already exists": "An account with this email already exists.",
          "Password is too weak": "Please choose a stronger password.",
          "Invalid email format": "Please enter a valid email address."
        };
        
        toast.error(errorMap[errorMessage] || errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 bg-gradient-to-br from-blue-200 to-purple-400">
      {/* Logo */}
      <img
        onClick={() => navigate("/")}
        src={assets.logo}
        alt="Logo"
        className="absolute cursor-pointer left-5 sm:left-20 top-5 w-28 sm:w-32"
      />

      {/* Auth Container */}
      <div className="w-full max-w-md p-8 text-center bg-white shadow-2xl rounded-2xl">
        <h2 className="mb-2 text-2xl font-semibold text-gray-800">
          {state === "Sign Up" ? "Create Account" : "Welcome Back"}
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          {state === "Sign Up"
            ? "Create your account to get started"
            : "Login to your account to continue"}
        </p>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isLoading}
          className="flex items-center justify-center w-full gap-3 px-4 py-3 mb-4 font-medium text-gray-700 transition-all duration-300 bg-white border border-gray-300 rounded-full hover:bg-gray-50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGoogleLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 rounded-full border-t-blue-500 animate-spin"></div>
          ) : (
            <FcGoogle className="w-5 h-5" />
          )}
          <span>{isGoogleLoading ? "Connecting..." : "Continue with Google"}</span>
        </button>

        {/* Divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-gray-500 bg-white">or continue with email</span>
          </div>
        </div>

        <form className="flex flex-col gap-4" onSubmit={onSubmitHandler}>
          {state === "Sign Up" && (
            <div className="flex items-center w-full px-5 py-3 bg-gray-100 rounded-full">
              <img
                src={assets.person_icon}
                alt="User"
                className="w-5 h-5 opacity-70"
              />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 text-gray-800 placeholder-gray-400 bg-transparent outline-none"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Email */}
          <div className="flex items-center w-full px-5 py-3 bg-gray-100 rounded-full">
            <img
              src={assets.mail_icon}
              alt="Email"
              className="w-5 h-5 opacity-70"
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 text-gray-800 placeholder-gray-400 bg-transparent outline-none"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div className="relative flex items-center w-full px-5 py-3 bg-gray-100 rounded-full">
            <img
              src={assets.lock_icon}
              alt="Password"
              className="w-5 h-5 opacity-70"
            />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 text-gray-800 placeholder-gray-400 bg-transparent outline-none"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute text-gray-400 transition cursor-pointer right-3 top-3 hover:text-gray-600"
            >
              {showPassword ? (
                <AiOutlineEyeInvisible size={20} />
              ) : (
                <AiOutlineEye size={20} />
              )}
            </button>
          </div>

          {state === "Login" && (
            <div className="-mt-2 text-right">
              <button
                type="button"
                onClick={() => navigate("/reset-password")}
                className="text-sm text-green-600 hover:text-green-700 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full py-3 font-medium text-white transition-all duration-300 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Please Wait..." : (state === "Sign Up" ? "Sign Up" : "Login")}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600">
          {state === "Sign Up" ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setState("Login")}
                className="text-green-600 hover:underline"
              >
                Login
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => setState("Sign Up")}
                className="text-green-600 hover:underline"
              >
                Sign Up
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Login;