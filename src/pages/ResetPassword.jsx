// client/src/pages/ResetPassword.jsx
import React, { useState, useRef, useContext, useEffect } from "react";
import { assets } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { backendUrl, refreshCsrfToken } = useContext(AppContext);

  // State
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpAutoSubmit, setOtpAutoSubmit] = useState(false);
  const inputRefs = useRef([]);
  const autoSubmitTimeoutRef = useRef(null);
  const isAutoSubmittingRef = useRef(false); // NEW: Track auto-submit state with ref

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }
    };
  }, []);

  // Resend OTP timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Move focus to next input + Auto-submit when last digit entered
  const handleInput = (e, index) => {
    const value = e.target.value;
    
    // Only allow numbers
    if (!/^\d*$/.test(value)) {
      e.target.value = '';
      return;
    }

    // If user entered a digit and there are more inputs, move focus
    if (value.length > 0 && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus();
    }

    // Check if all OTP digits are filled for auto-submit
    if (value.length > 0 && index === inputRefs.current.length - 1) {
      const allFilled = inputRefs.current.every(input => input.value.length > 0);
      if (allFilled && !isAutoSubmittingRef.current) { // NEW: Check if not already auto-submitting
        setOtpAutoSubmit(true);
        isAutoSubmittingRef.current = true; // NEW: Set ref to prevent multiple triggers
        console.log("🔄 Auto-submit triggered - All OTP digits filled");
        // ✅ ULTRA-FAST DELAY: 50ms for instant feel
        if (autoSubmitTimeoutRef.current) {
          clearTimeout(autoSubmitTimeoutRef.current);
        }
        autoSubmitTimeoutRef.current = setTimeout(() => {
          handleAutoSubmitOtp();
        }, 50);
      }
    }
  };

  // Move focus back on backspace
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && e.target.value === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  // Handle paste event for OTP + Auto-submit
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^[0-9]+$/.test(pastedData)) {
      toast.error("Only numbers are allowed in OTP");
      return;
    }
    
    const digits = pastedData.slice(0, 6).split("");
    digits.forEach((digit, i) => {
      if (inputRefs.current[i]) inputRefs.current[i].value = digit;
    });

    // Focus the last filled input
    const lastFilledIndex = Math.min(digits.length, 5);
    if (inputRefs.current[lastFilledIndex]) {
      inputRefs.current[lastFilledIndex].focus();
    }

    // Auto-submit if all 6 digits are pasted
    if (digits.length === 6 && !isAutoSubmittingRef.current) { // NEW: Check if not already auto-submitting
      setOtpAutoSubmit(true);
      isAutoSubmittingRef.current = true; // NEW: Set ref to prevent multiple triggers
      console.log("🔄 Auto-submit triggered - OTP pasted");
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }
      autoSubmitTimeoutRef.current = setTimeout(() => {
        handleAutoSubmitOtp();
      }, 50);
    }
  };

  // Auto-submit OTP when all digits are entered
  const handleAutoSubmitOtp = async () => {
    console.log("🔄 handleAutoSubmitOtp called");
    console.log("📊 Current state - otpAutoSubmit:", otpAutoSubmit, "isAutoSubmittingRef:", isAutoSubmittingRef.current);
    
    // Use ref instead of state for immediate check
    if (!isAutoSubmittingRef.current) {
      console.log("❌ Auto-submit cancelled - already completed or cancelled");
      return;
    }
    
    const otp = inputRefs.current.map((el) => el?.value).join("");
    console.log("📱 Auto-submit OTP:", otp);
    
    if (otp.length !== 6) {
      console.log("❌ Auto-submit cancelled - OTP length not 6");
      setOtpAutoSubmit(false);
      isAutoSubmittingRef.current = false;
      return;
    }

    if (!/^\d+$/.test(otp)) {
      toast.error("OTP should contain only numbers");
      setOtpAutoSubmit(false);
      isAutoSubmittingRef.current = false;
      return;
    }

    console.log("✅ Calling handleVerifyOtp from auto-submit");
    await handleVerifyOtp(); // Reuse the main verify function
  };

  // Step 1: Send reset OTP
  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      console.log("📧 Sending reset OTP to:", email);
      const { data } = await axios.post(
        `${backendUrl}/api/auth/send-reset-otp`, 
        { email }
      );

      console.log("📧 Send OTP response:", data);

      if (data.success) {
        toast.success(data.message || "Verification code sent to your email!");
        setStep(2);
        setResendTimer(60);
      } else {
        toast.error(data.message || "Failed to send verification code");
      }
    } catch (error) {
      console.error("❌ Send OTP Error:", error);
      console.error("❌ Error details:", error.response?.data);
      
      // Handle CSRF token expiration
      if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
        try {
          console.log("🔄 CSRF token expired, refreshing...");
          await refreshCsrfToken();
          const retryData = await axios.post(
            `${backendUrl}/api/auth/send-reset-otp`, 
            { email }
          );
          if (retryData.data.success) {
            toast.success("Verification code sent!");
            setStep(2);
            setResendTimer(60);
            return;
          }
        } catch (retryError) {
          console.error("❌ Retry failed:", retryError);
        }
      }
      
      const errorMessage = error.response?.data?.message || 
                          "Failed to send verification code. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) {
      toast.error(`Please wait ${resendTimer} seconds before resending`);
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔄 Resending OTP to:", email);
      const { data } = await axios.post(
        `${backendUrl}/api/auth/send-reset-otp`, 
        { email }
      );

      console.log("📧 Resend OTP response:", data);

      if (data.success) {
        toast.success(data.message || "Verification code resent!");
        setResendTimer(60);
      } else {
        toast.error(data.message || "Failed to resend verification code");
      }
    } catch (error) {
      console.error("❌ Resend OTP Error:", error);
      console.error("❌ Error details:", error.response?.data);
      
      if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
        try {
          await refreshCsrfToken();
          const retryData = await axios.post(
            `${backendUrl}/api/auth/send-reset-otp`, 
            { email }
          );
          if (retryData.data.success) {
            toast.success("Verification code resent!");
            setResendTimer(60);
            return;
          }
        } catch (retryError) {
          console.error("❌ Retry failed:", retryError);
        }
      }
      
      toast.error(error.response?.data?.message || "Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    
    const otp = inputRefs.current.map((el) => el?.value).join("");
    console.log("🔐 Verifying OTP:", otp, "for email:", email);
    
    if (otp.length !== 6) {
      toast.error("Please enter all 6 digits");
      setOtpAutoSubmit(false);
      isAutoSubmittingRef.current = false;
      return;
    }

    if (!/^\d+$/.test(otp)) {
      toast.error("OTP should contain only numbers");
      setOtpAutoSubmit(false);
      isAutoSubmittingRef.current = false;
      return;
    }

    setIsLoading(true);
    try {
      console.log("🚀 Making OTP verification request...");
      const { data } = await axios.post(
        `${backendUrl}/api/auth/verify-reset-otp`, 
        { email, otp }
      );

      console.log("✅ OTP verification response:", data);

      if (data.success) {
        toast.success(data.message || "OTP verified successfully");
        setVerifiedOtp(otp);
        setStep(3);
        console.log("🎉 OTP verified successfully, moving to step 3");
      } else {
        console.log("❌ OTP verification failed:", data.message);
        toast.error(data.message || "Invalid OTP");
        inputRefs.current.forEach(input => {
          if (input) input.value = '';
        });
        if (inputRefs.current[0]) inputRefs.current[0].focus();
      }
    } catch (error) {
      console.error("❌ OTP Verification Error:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
      
      if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
        try {
          console.log("🔄 CSRF token expired, refreshing and retrying...");
          await refreshCsrfToken();
          const retryData = await axios.post(
            `${backendUrl}/api/auth/verify-reset-otp`, 
            { email, otp }
          );
          console.log("🔄 Retry response:", retryData.data);
          if (retryData.data.success) {
            toast.success("OTP verified successfully");
            setVerifiedOtp(otp);
            setStep(3);
            return;
          }
        } catch (retryError) {
          console.error("❌ Retry failed:", retryError);
        }
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          "Invalid OTP. Please try again.";
      toast.error(errorMessage);
      
      inputRefs.current.forEach(input => {
        if (input) input.value = '';
      });
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } finally {
      setIsLoading(false);
      setOtpAutoSubmit(false);
      isAutoSubmittingRef.current = false; // NEW: Reset the ref
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔑 Resetting password for:", email);
      const { data } = await axios.post(
        `${backendUrl}/api/auth/reset-password`, 
        {
          email,
          otp: verifiedOtp,
          newPassword: password
        }
      );

      console.log("✅ Password reset response:", data);

      if (data.success) {
        toast.success(data.message || "Password reset successful!");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        toast.error(data.message || "Failed to reset password");
      }
    } catch (error) {
      console.error("❌ Password Reset Error:", error);
      console.error("❌ Error response:", error.response?.data);
      
      if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
        try {
          await refreshCsrfToken();
          const retryData = await axios.post(
            `${backendUrl}/api/auth/reset-password`, 
            {
              email,
              otp: verifiedOtp,
              newPassword: password
            }
          );
          if (retryData.data.success) {
            toast.success("Password reset successful!");
            setTimeout(() => {
              navigate("/login");
            }, 2000);
            return;
          }
        } catch (retryError) {
          console.error("❌ Retry failed:", retryError);
        }
      }
      
      if (error.response) {
        const { status, data: errorData } = error.response;
        
        if (status === 400) {
          const errorMessage = errorData?.message || errorData?.error || "";
          
          if (errorMessage.includes("cannot be the same") || errorMessage.includes("same as your current")) {
            toast.error("New password cannot be the same as your old password. Please choose a different password.");
            setPassword("");
            setConfirmPassword("");
          } 
          else if (errorMessage.includes("OTP") || errorMessage.includes("otp") || errorMessage.includes("expired")) {
            toast.error("OTP session has expired. Please request a new code.");
            setStep(2);
            setVerifiedOtp("");
          } else {
            toast.error(errorMessage || "Invalid request. Please check your input.");
          }
        } else if (status === 429) {
          toast.error(errorData?.message || "Too many attempts. Please try again later.");
        } else if (status === 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error(errorData?.message || "Password reset failed");
        }
      } else if (error.request) {
        toast.error("No response from server. Please check your connection.");
      } else {
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to previous step
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      if (step === 2) {
        inputRefs.current.forEach(input => {
          if (input) input.value = '';
        });
        setVerifiedOtp("");
        setOtpAutoSubmit(false);
        isAutoSubmittingRef.current = false; // NEW: Reset the ref
      }
      if (step === 3) {
        setPassword("");
        setConfirmPassword("");
      }
    } else {
      navigate("/login");
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

      {/* Back Button */}
      <button
        onClick={handleBack}
        className="absolute flex items-center text-gray-600 transition-colors left-5 sm:left-20 top-32 hover:text-gray-800"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Card */}
      <div className="w-full max-w-md p-8 text-center bg-white shadow-2xl rounded-2xl">
        {/* Step 1: Email input */}
        {step === 1 && (
          <>
            <h2 className="mb-2 text-2xl font-semibold text-gray-800">Reset Password</h2>
            <p className="mb-6 text-sm text-gray-600">
              Enter your registered email address to receive a verification code.
            </p>

            <form onSubmit={handleSendResetOtp}>
              <div className="flex items-center w-full px-5 py-3 mb-6 bg-gray-100 rounded-full">
                <img
                  src={assets.mail_icon}
                  alt="Mail"
                  className="w-5 h-5 opacity-70"
                />
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="w-full px-3 text-gray-800 placeholder-gray-400 bg-transparent outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 font-medium text-white transition-all duration-300 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending Code..." : "Send Verification Code"}
              </button>
            </form>

            <div className="mt-4 text-sm text-gray-600">
              Remember your password?{" "}
              <span 
                className="text-green-600 cursor-pointer hover:underline"
                onClick={() => navigate("/login")}
              >
                Sign In
              </span>
            </div>
          </>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <>
            <h2 className="mb-2 text-2xl font-semibold text-gray-800">Verify Your Email</h2>
            <p className="mb-2 text-sm text-gray-600">
              Enter the 6-digit code sent to
            </p>
            <p className="mb-6 text-sm font-medium text-gray-800">{email}</p>

            <form onSubmit={handleVerifyOtp}>
              <div
                className="flex justify-center mb-6 space-x-2 sm:space-x-3"
                onPaste={handlePaste}
              >
                {Array(6)
                  .fill(0)
                  .map((_, index) => (
                    <input
                      key={index}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength="1"
                      ref={(el) => (inputRefs.current[index] = el)}
                      onInput={(e) => handleInput(e, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className="w-12 text-xl font-semibold text-center text-gray-800 transition-colors border border-gray-300 rounded-lg shadow-sm outline-none h-14 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                      disabled={isLoading || otpAutoSubmit}
                    />
                  ))}
              </div>

              <button
                type="submit"
                disabled={isLoading || otpAutoSubmit}
                className="w-full py-3 mb-4 font-medium text-white transition-all duration-300 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading || otpAutoSubmit ? "Verifying..." : "Verify Code"}
              </button>
            </form>

            <div className="text-sm text-gray-600">
              {otpAutoSubmit ? (
                <span className="text-green-600">Verifying OTP...</span>
              ) : (
                <>
                  Didn't receive the code?{" "}
                  {resendTimer > 0 ? (
                    <span className="text-gray-400">
                      Resend in {resendTimer}s
                    </span>
                  ) : (
                    <span 
                      className="text-green-600 cursor-pointer hover:underline"
                      onClick={handleResendOtp}
                    >
                      Resend Code
                    </span>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Step 3: Reset Password */}
        {step === 3 && (
          <>
            <h2 className="mb-2 text-2xl font-semibold text-gray-800">Create New Password</h2>
            <p className="mb-6 text-sm text-gray-600">
              Enter your new password below.
            </p>

            <form onSubmit={handleResetPassword}>
              {/* New Password Input with Eye Toggle */}
              <div className="relative flex items-center w-full px-5 py-3 mb-4 bg-gray-100 rounded-full">
                <img
                  src={assets.lock_icon}
                  alt="Password"
                  className="w-5 h-5 opacity-70"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password (min. 6 characters)"
                  className="w-full px-3 text-gray-800 placeholder-gray-400 bg-transparent outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="6"
                  disabled={isLoading}
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute text-gray-400 transition cursor-pointer right-3 top-3 hover:text-gray-600"
                >
                  {showPassword ? (
                    <AiOutlineEyeInvisible size={20} />
                  ) : (
                    <AiOutlineEye size={20} />
                  )}
                </span>
              </div>

              {/* Confirm Password Input with Eye Toggle */}
              <div className="relative flex items-center w-full px-5 py-3 mb-6 bg-gray-100 rounded-full">
                <img
                  src={assets.lock_icon}
                  alt="Confirm Password"
                  className="w-5 h-5 opacity-70"
                />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  className="w-full px-3 text-gray-800 placeholder-gray-400 bg-transparent outline-none"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <span
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute text-gray-400 transition cursor-pointer right-3 top-3 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <AiOutlineEyeInvisible size={20} />
                  ) : (
                    <AiOutlineEye size={20} />
                  )}
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 font-medium text-white transition-all duration-300 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Resetting Password..." : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;