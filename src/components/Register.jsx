import React, { useState } from 'react';
import { UserCheck, Mail, Lock } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useNavigate } from 'react-router-dom';

const Register = ({setIsAuthenticated}) => {
    const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Registration submitted:', formData);

    setIsAuthenticated(true);

    // navigate to dashboard
    navigate('/dashboard');
  };

  return (
    <div style={{ height: "100%" }} className="flex justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="shadow-2xl border-none w-full max-w-md">
        <CardContent className="p-8 space-y-6">
          <h2 className="text-2xl font-semibold text-center text-indigo-900">Create Your Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <Label>Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input 
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input 
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <Label>Role</Label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-300"
                required
              >
                <option value="">Select Your Role</option>
                <option value="prosumer">Prosumer</option>
                <option value="consumer">Consumer</option>
              </select>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Register
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account? <a href="/login" className="text-indigo-600 hover:underline">Login</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
