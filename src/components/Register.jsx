import React, { useState } from 'react';
import { UserCheck, Cpu } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { useNavigate } from 'react-router-dom';
import Web3 from 'web3';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const EnergyTradingABI = require('./EnergyTradingABI.json');

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

const Register = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [hardwareId, setHardwareId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (e) => {
    setRole(e.target.value);
  };

  const handleHardwareIdChange = (e) => {
    setHardwareId(e.target.value);
  };

  const registerUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!window.ethereum) {
        toast.error('MetaMask is required to register.');
        setLoading(false);
        return;
      }

      if (!hardwareId.trim()) {
        toast.error('Hardware ID is required.');
        setLoading(false);
        return;
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);

      // Call the updated registerUser function with hardwareId
      await contract.methods.registerUser(role, hardwareId).send({ from: accounts[0] });

      // Store user address and token in localStorage
      localStorage.setItem('userAddress', accounts[0]);
      localStorage.setItem('token', 'true');
      localStorage.setItem('userRole', role);
      
      toast.success('Registration successful!');
      setIsAuthenticated(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error('Registration failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div style={{ height: '100%' }} className="flex justify-center items-center bg-gradient-to-br from-black-400 to-black-800 px-4 py-20">
      <ToastContainer position="top-center" autoClose={2000} />
      <Card className="shadow-2xl border-none w-full max-w-xl">
        <CardContent className="p-10 space-y-8">
          <h2 className="text-3xl font-semibold text-center text-white">Create Your Account</h2>
          <form onSubmit={registerUser} className="space-y-6">
            <div>
              <Label className="text-white">Role</Label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  name="role"
                  value={role}
                  onChange={handleRoleChange}
                  className="w-full pl-11 p-3 border rounded-md focus:ring-2 focus:ring-indigo-300 bg-black text-white"
                  required
                >
                  <option value="">Select Your Role</option>
                  <option value="1">Prosumer</option>
                  <option value="2">Consumer</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-white">Hardware ID</Label>
              <div className="relative">
                <Cpu className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="hardwareId"
                  value={hardwareId}
                  onChange={handleHardwareIdChange}
                  placeholder="Enter your hardware ID"
                  className="w-full pl-11 p-3 border rounded-md focus:ring-2 focus:ring-indigo-300 bg-black text-white"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {role === '1' 
                  ? "Enter your Prosumer hardware ID (e.g. Hardware101)"
                  : role === '2' 
                  ? "Enter your Consumer hardware ID" 
                  : "Hardware ID is required for account registration"}
              </p>
            </div>

            <div className="flex justify-center">
              <Button type="submit" className="w-2/3 bg-green-600 hover:bg-green-700 text-white py-5">
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </div>
          </form>
          <p className="text-center text-sm text-gray-300 mt-4">
            Already have an account? <a href="/login" className="text-green-300 hover:underline">Login</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;