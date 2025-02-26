import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { useNavigate } from 'react-router-dom';
import Web3 from 'web3';
const EnergyTradingABI = require('./EnergyTradingABI.json');

const CONTRACT_ADDRESS = '0x0884b03ef2885919327F0F77Eb36044B549501bf';

const Register = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (e) => {
    setRole(e.target.value);
  };

  const registerUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!window.ethereum) {
        alert('MetaMask is required to register.');
        setLoading(false);
        return;
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);

      await contract.methods.registerUser(role).send({ from: accounts[0] });

      alert('Registration successful!');
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div style={{ height: '100%' }} className="flex justify-center items-center bg-gradient-to-br to-green-100 px-4 mt-20">
      <Card className="shadow-2xl border-none w-full max-w-md">
        <CardContent className="p-8 space-y-6">
          <h2 className="text-2xl font-semibold text-center text-green-700">Create Your Account</h2>
          <form onSubmit={registerUser} className="space-y-4">
            <div>
              <Label>Role</Label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  name="role"
                  value={role}
                  onChange={handleRoleChange}
                  className="w-full pl-11 p-2 border rounded-md focus:ring-2 focus:ring-indigo-300 bg-black text-white"
                  required
                >
                  <option value="">Select Your Role</option>
                  <option value="1">Prosumer</option>
                  <option value="2">Consumer</option>
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-900 text-white">
              {loading ? 'Registering...' : 'Register'}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account? <a href="/login" className="text-green-600 hover:underline">Login</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
