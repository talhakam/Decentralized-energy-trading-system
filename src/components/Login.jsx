import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useNavigate } from 'react-router-dom';

const Login = ({setIsAuthenticated}) => {

    const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
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
    console.log('Login submitted:', formData);
    setIsAuthenticated(true);
    localStorage.setItem('token', 'true');
    // navigate to dashboard
    navigate('/dashboard');
  };

  return (
    <div style={{ height: "100%" }} className="flex justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="shadow-2xl border-none w-full max-w-md">
        <CardContent className="p-8 space-y-6">
          <h2 className="text-2xl font-semibold text-center text-indigo-900">Welcome Back</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="Enter your password"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Login
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account? <a href="/register" className="text-indigo-600 hover:underline">Register</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
