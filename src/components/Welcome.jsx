import React from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';

const Welcome = () => {
  return (
    <div style={{ height: "100%" }} className="bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Welcome Section */}
        <div className="flex flex-col justify-center space-y-6 text-gray-800">
          <h1 className="text-4xl font-bold text-indigo-900">Welcome to Solaris</h1>
          <p className="text-lg text-gray-600">
            Revolutionizing energy trading through a secure, transparent, and efficient marketplace.
          </p>
          <div className="space-y-4">
            <FeatureItem 
              icon={<ShieldCheck className="text-emerald-500" />} 
              text="Secure and transparent energy trading platform" 
            />
            <FeatureItem 
              icon={<UserCheck className="text-blue-500" />} 
              text="Connect with prosumers and consumers nationwide" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon, text }) => (
  <div className="flex items-center space-x-4">
    {icon}
    <span className="text-gray-700">{text}</span>
  </div>
);

export default Welcome;
