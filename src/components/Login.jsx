import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import Web3 from 'web3';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const EnergyTradingABI = require('./EnergyTradingABI.json');

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

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
      // Clear any existing session data
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userAddress');
      localStorage.removeItem('hardwareId');
  
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      
      if (accounts.length === 0) {
        toast.error('No accounts found. Please connect MetaMask.');
        setLoading(false);
        return;
      }
  
      // Store the connected account
      const currentAccount = accounts[0];
      localStorage.setItem('userAddress', currentAccount);
      localStorage.setItem('token', 'true');
      setIsAuthenticated(true);
  
      // Verify user is registered by checking role
      const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
      const userInfo = await contract.methods.users(currentAccount).call();
      
      if (Number(userInfo.role) === 0) {
        toast.error('Account not registered. Please register first.');
        localStorage.clear();
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Get hardware ID from blockchain
      const hardwareId = await contract.methods.getUserHardwareId(currentAccount).call();
      
      // Store user role and hardware ID in localStorage
      localStorage.setItem('userRole', userInfo.role);
      localStorage.setItem('hardwareId', hardwareId);
      
      console.log('User logged in with hardware ID:', hardwareId);
  
      toast.success('Login successful!');
      setTimeout(() => navigate('/dashboard'), 1000);
  
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed. Please try again.');
      // Clear all data on error
      localStorage.clear();
      setIsAuthenticated(false);
    }
    setLoading(false);
  };

  return (
    <div style={{ height: "100%" }} className="flex justify-center items-center bg-gradient-to-br from-black-400 to-black-800 px-4 py-20">
      <ToastContainer position="top-center" autoClose={2000} />
      <Card className="shadow-2xl border-none w-full max-w-xl">
        <CardContent className="p-10 space-y-8">
          <h2 className="text-3xl font-semibold text-center text-white">Login with MetaMask</h2>
          <div className="flex justify-center">
            <Button 
              onClick={handleLogin} 
              className="w-2/3 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white py-4"
              disabled={loading}
            >
              <UserCheck className="mr-2" /> 
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          </div>
          <p className="text-center text-sm text-gray-300">
            Don't have an account? <a href="/register" className="text-green-300 hover:underline">Register</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;