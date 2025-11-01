import React from "react";
import Navbar from "../components/Navbar";
import Header from "../components/Header";

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-green-50 to-white text-gray-800 relative bg-cover bg-centre" >
      {/* Navbar */}
      <Navbar />

      {/* Main Section */}
      <main className="flex flex-col items-center justify-center w-full mt-32 px-6 sm:px-10 text-center">
        <Header />
      </main>
    </div>
  );
};

export default Home;
