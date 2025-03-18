import React from 'react';
import { ShieldCheck, UserCheck, TrendingUp, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const navigate = useNavigate();

  const handleJoinClick = () => {
    navigate('/register');
  };

  return (
    <div style={{ height: "100%", paddingTop: "64px" }} className="bg-gradient-to-br from-black-400 to-black-800 flex items-center justify-center px-4">
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Welcome Section */}
        <div className="flex flex-col justify-center space-y-6 text-white">
          <h1 className="text-4xl font-bold text-white">Welcome to Solaris</h1>
          <p className="text-lg text-gray-200">
            Revolutionizing energy trading through a secure, transparent, and efficient marketplace.
          </p>
          <div className="space-y-4">
            <FeatureItem 
              icon={<ShieldCheck className="text-emerald-300" />} 
              text="Secure and transparent energy trading platform" 
            />
            <FeatureItem 
              icon={<UserCheck className="text-green-300" />} 
              text="Connect with prosumers and consumers nationwide" 
            />
            <FeatureItem 
              icon={<TrendingUp className="text-yellow-300" />} 
              text="Maximize your energy trading profits" 
            />
            <FeatureItem 
              icon={<Globe className="text-green-300" />} 
              text="Join a global network of energy traders" 
            />
          </div>
          <button 
            onClick={handleJoinClick} 
            className="mt-6 px-6 py-3 bg-green-600 text-white text-lg font-semibold rounded-md hover:bg-green-500"
          >
            Join Now
          </button>
        </div>
        {/* Cards Section */}
        <div className="grid gap-4 mt-10">
          <Card 
            title="Why Choose Us?" 
            content="We provide a secure and transparent platform for energy trading, ensuring fair prices and reliable transactions."
          />
          <Card 
            title="Our Mission" 
            content="To revolutionize the energy market by connecting prosumers and consumers through innovative technology."
          />
          <Card 
            title="Get Started" 
            content="Sign up today and start trading energy with ease and confidence."
          />
        </div>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon, text }) => (
  <div className="flex items-center space-x-4">
    {icon}
    <span className="text-gray-200">{text}</span>
  </div>
);

const Card = ({ title, content }) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-md">
    <h2 className="text-2xl font-bold text-green-300 mb-2">{title}</h2>
    <p className="text-gray-300">{content}</p>
  </div>
);

export default Welcome;