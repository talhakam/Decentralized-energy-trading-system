import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import Web3 from 'web3';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Login = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!window.ethereum) {
      toast.error('MetaMask is required to login.');
      return;
    }

    setLoading(true);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      
      if (accounts.length === 0) {
        toast.error('No accounts found. Please connect MetaMask.');
        setLoading(false);
        return;
      }

      // Simulating successful login
      localStorage.setItem('token', 'true');
      setIsAuthenticated(true);
      toast.success('Login successful!');
      
      setTimeout(() => navigate('/dashboard'), 1000); // Redirect after 1 seconds

    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{ height: "100%" }} className="flex justify-center items-center bg-black from-blue-50 to-indigo-100 px-4 mt-16">
      <ToastContainer position="top-center" autoClose={2000} />
      <Card className="shadow-2xl border-none w-full max-w-md">
        <CardContent className="p-8 space-y-8">
          <h2 className="text-2xl font-semibold text-center text-green-700">Login with MetaMask</h2>
          <div className="flex justify-center">
            <Button 
              onClick={handleLogin} 
              className="w-3/4 flex items-center justify-center bg-green-600 hover:bg-green-900 text-white py-3"
              disabled={loading}
            >
              <UserCheck className="mr-2" /> 
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          </div>
          <p className="text-center text-sm text-gray-500">
            Don't have an account? <a href="/register" className="text-green-700 hover:underline">Register</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
