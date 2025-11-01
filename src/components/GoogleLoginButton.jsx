import React from 'react';
import { FcGoogle } from 'react-icons/fc';

const GoogleLoginButton = ({ 
  isLoading = false, 
  onClick, 
  size = "default",
  variant = "default",
  className = "" 
}) => {
  const baseStyles = "flex items-center justify-center gap-3 font-medium transition-all duration-300 rounded-full disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizeStyles = {
    small: "px-4 py-2 text-sm",
    default: "px-4 py-3 text-base",
    large: "px-6 py-4 text-lg"
  };

  const variantStyles = {
    default: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:shadow-md",
    outline: "bg-transparent border-2 border-blue-500 text-blue-600 hover:bg-blue-50",
    solid: "bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 hover:shadow-lg"
  };

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-gray-300 rounded-full border-t-blue-500 animate-spin"></div>
      ) : (
        <FcGoogle className="w-5 h-5" />
      )}
      <span>
        {isLoading ? "Connecting..." : "Continue with Google"}
      </span>
    </button>
  );
};

export default GoogleLoginButton;