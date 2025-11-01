import React, { useContext } from 'react'
// Adjusted path assumption: Header is in src/components, assets is in src/assets
import { assets } from '../assets/assets' 
import { AppContext } from '../context/AppContext'

const Header = () => {

   // FIX: Destructure 'userData' instead of 'useData'
   const { userData } = useContext(AppContext)


  return (
    <div className="flex flex-col items-center justify-center px-6 mt-24 text-center text-gray-800">
      
      {/* Profile image */}
      <img 
        src={assets.header_img} 
        alt="Profile" 
        className="object-cover w-40 h-40 mb-6 border-4 border-white rounded-full shadow-lg"
      />

      {/* Greeting */}
      <h1 className="flex items-center gap-2 mb-2 text-3xl font-semibold sm:text-4xl">
        {/* The variable name now correctly matches the destructured property */}
        Hey  {userData ? userData.name : "there"}! 
        <img 
          src={assets.hand_wave}   
          alt="wave"
          className="w-8 h-8 animate-bounce"
        />
      </h1>

      {/* Subtitle */}
      <h2 className="gap-2 mb-2 text-xl font-medium text-gray-600 sm:text-3xl">
        Welcome to our App 
      </h2>

      {/* Description */}
      <p className="max-w-md mb-6 text-base leading-relaxed text-gray-500 sm:text-lg">
        Let’s start with a quick product tour — we’ll have you up and running in no time!
      </p>

      {/* Call to action */}
      <button className="px-8 py-3 text-white transition-all duration-300 rounded-full shadow-md bg-gradient-to-r from-green-400 to-emerald-500 hover:shadow-lg hover:scale-105">
        Get Started
      </button>
    </div>
  )
}

export default Header
