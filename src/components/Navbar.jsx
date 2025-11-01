import React, { useContext, useState, useRef, useEffect } from "react";
import { assets } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

const Navbar = () => {
  const navigate = useNavigate();
  const { userData, backendUrl, setUserData, setIsLoggedIn } = useContext(AppContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Toggle dropdown with delay for smooth effect
  const toggleDropdown = () => {
    setDropdownOpen(prev => !prev);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper: get CSRF token before any POST
  const getCsrfToken = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/csrf-token`, {
        withCredentials: true,
      });
      return data.csrfToken;
    } catch (err) {
      console.error("Failed to get CSRF token:", err);
      toast.error("CSRF token request failed. Check server logs.");
      throw err;
    }
  };

  // FIX: Added CSRF token fetching and configuration to avoid 403 Forbidden
  const sendVerificationOtp = async () => {
    try {
      axios.defaults.withCredentials = true;

      const csrfToken = await getCsrfToken();

      const config = {
        headers: { "X-XSRF-TOKEN": csrfToken },
        withCredentials: true,
      };

      const { data } = await axios.post(`${backendUrl}/api/auth/send-verify-otp`, {}, config);
      
      if (data.success) {
        navigate("/email-verify");
        toast.success(data.message);
      } else {
        // If server returns success: false, show server message
        toast.error(data.message);
      }
    } catch (error) {
      // Show the specific error message from the server response if available
      console.error("Verification OTP Error:", error);
      toast.error(error.response?.data?.message || "Failed to send OTP. Access denied (403).");
    }
  };

  const handleLogout = async () => {
    try {
      axios.defaults.withCredentials = true;

      const csrfToken = await getCsrfToken();

      const config = {
        headers: { "X-XSRF-TOKEN": csrfToken },
        withCredentials: true,
      };

      const { data } = await axios.post(`${backendUrl}/api/auth/logout`, {}, config);

      if (data.success) {
        setIsLoggedIn(false);
        setUserData(null);
        toast.success("Logged out successfully!");
        navigate("/");
      } else {
        toast.error(data.message || "Logout failed");
      }
    } catch (error) {
      console.error("Logout Error:", error);
      toast.error(error.response?.data?.message || "Logout failed. Please try again.");
    }
  };

  return (
    <nav className="fixed top-0 left-0 z-50 w-full shadow-sm bg-white/80 backdrop-blur-md">
      <div className="flex items-center justify-between p-4 mx-auto max-w-7xl sm:px-10 md:px-20">

        {/* Logo */}
        <img
          src={assets.logo}
          alt="Logo"
          onClick={() => navigate("/")}
          className="transition-all cursor-pointer w-28 sm:w-32 hover:opacity-90"
        />

        {userData ? (
          <div className="relative flex items-center gap-4" ref={dropdownRef}>
            {/* Profile initials */}
            <div
              className="flex items-center justify-center w-10 h-10 font-bold text-white bg-green-500 rounded-full shadow-md cursor-pointer"
              onClick={toggleDropdown}
            >
              {userData.name ? userData.name[0].toUpperCase() : "U"}
            </div>

            {/* Dropdown */}
            <div
              className={`absolute right-0 w-40 text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg top-12 transition-all duration-200 ${
                dropdownOpen ? "opacity-100 visible" : "opacity-0 invisible"
              }`}
            >
              <ul className="text-sm">
                {!userData?.isAccountVerified && (
                  <li
                    // FIX: Close dropdown immediately on click
                    onClick={() => { sendVerificationOtp(); setDropdownOpen(false); }}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  >
                    Verify Email
                  </li>
                )}
                <li
                  onClick={() => { handleLogout(); setDropdownOpen(false); }}
                  className="px-4 py-2 text-red-500 cursor-pointer hover:bg-gray-100"
                >
                  Logout
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 px-6 py-2 font-medium text-gray-800 transition-all duration-300 border border-gray-400 rounded-full shadow-md hover:bg-gradient-to-r hover:from-green-400 hover:to-emerald-500 hover:text-white"
          >
            Login
            <img
              src={assets.arrow_icon}
              alt="Arrow Icon"
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
            />
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
