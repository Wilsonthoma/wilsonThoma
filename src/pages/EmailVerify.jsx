import React, { useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";

const EmailVerify = () => {
  const navigate = useNavigate();
  const { backendUrl, getUserData } = useContext(AppContext);
  const inputRefs = useRef([]);

  // ✅ Configure Axios globally
  axios.defaults.withCredentials = true;

  // ✅ Fetch CSRF token on mount
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/csrf-token`, {
          withCredentials: true,
        });
        // ✅ Set correct CSRF header
        axios.defaults.headers.common["X-CSRF-Token"] = data.csrfToken;
        console.log("✅ CSRF token fetched successfully");
      } catch (error) {
        console.error("❌ CSRF token fetch failed:", error);
        // Continue without CSRF token if endpoint doesn't exist
      }
    };
    fetchCsrfToken();
  }, [backendUrl]);

  // Move to next input
  const handleInput = (e, index) => {
    if (e.target.value.length > 0 && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Move back on backspace
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && e.target.value === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  // Handle paste event
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^[0-9]+$/.test(pastedData)) return;

    const digits = pastedData.slice(0, 6).split("");
    digits.forEach((digit, i) => {
      if (inputRefs.current[i]) inputRefs.current[i].value = digit;
    });

    const lastFilled = Math.min(digits.length, 6) - 1;
    if (lastFilled >= 0 && inputRefs.current[lastFilled]) {
      inputRefs.current[lastFilled].focus();
    }
  };

  // ✅ FIXED: Submit handler with correct endpoint
  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      const otp = inputRefs.current.map((el) => el.value).join("");

      if (otp.length !== 6) {
        toast.error("Please enter the full 6-digit code.");
        return;
      }

      console.log("Submitting OTP:", otp);

      const { data } = await axios.post(
        `${backendUrl}/api/auth/verify-email`, // ✅ CORRECTED ENDPOINT
        { otp },
        {
          headers: {
            "X-CSRF-Token": axios.defaults.headers.common["X-CSRF-Token"],
          },
          withCredentials: true,
        }
      );

      if (data.success) {
        toast.success(data.message);
        await getUserData();
        navigate("/");
      } else {
        toast.error(data.message || "Verification failed.");
      }
    } catch (error) {
      console.error("Verification OTP Error:", error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          "Verification failed. Please try again.";
      toast.error(errorMessage);
      
      // Clear inputs on error
      inputRefs.current.forEach(input => {
        if (input) input.value = '';
      });
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    }
  };

  // ✅ Add resend OTP functionality
  const handleResendOtp = async () => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/auth/send-verify-otp`,
        {},
        {
          headers: {
            "X-CSRF-Token": axios.defaults.headers.common["X-CSRF-Token"],
          },
          withCredentials: true,
        }
      );

      if (data.success) {
        toast.success("OTP resent successfully!");
      } else {
        toast.error(data.message || "Failed to resend OTP.");
      }
    } catch (error) {
      console.error("Resend OTP Error:", error);
      toast.error("Failed to resend OTP. Please try again.");
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

      {/* Verification Card */}
      <div className="w-full max-w-md p-8 text-center bg-white shadow-2xl rounded-2xl backdrop-blur-md">
        <h2 className="mb-2 text-2xl font-semibold text-gray-800">
          Verify Your Email
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          Enter the 6-digit code we sent to your email to verify your account.
        </p>

        <form onSubmit={onSubmitHandler}>
          <div
            className="flex justify-center mb-8 space-x-2 sm:space-x-3"
            onPaste={handlePaste}
          >
            {Array(6)
              .fill(0)
              .map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  ref={(el) => (inputRefs.current[index] = el)}
                  onInput={(e) => handleInput(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-10 h-12 text-lg font-semibold text-center text-gray-800 border border-gray-300 rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:w-12 sm:h-14"
                />
              ))}
          </div>

          <button
            type="submit"
            className="w-full py-3 font-medium text-white transition-all duration-300 rounded-lg bg-gradient-to-r from-green-400 to-emerald-600 hover:opacity-90"
          >
            Verify Email
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          Didn't receive the code?{" "}
          <span 
            className="text-green-600 cursor-pointer hover:underline"
            onClick={handleResendOtp}
          >
            Resend OTP
          </span>
        </div>
      </div>
    </div>
  );
};

export default EmailVerify;