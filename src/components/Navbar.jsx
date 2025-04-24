import React, { useState, useEffect } from "react";
import { Home, User, LogIn, Building, FileText, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { useNavigate } from 'react-router-dom';


const Navbar = ({ userRole, isAuthenticated, setIsAuthenticated }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Clear all authentication and role data
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      
      // Reset authentication state
      setIsAuthenticated(false);
      
      // Navigate to welcome page
      navigate('/');
      
      // Disconnect from MetaMask (optional but recommended)
      if (window.ethereum && window.ethereum.disconnect) {
        await window.ethereum.disconnect();
      }
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('Current user role in Navbar:', userRole);
    console.log('Is role Prosumer?', userRole === 1);
    console.log('Is role Consumer?', userRole === 2);
  }, [userRole]);

  // Add role indicator
  const getRoleName = (role) => {
    switch (Number(role)) {
      case 1:
        return 'Prosumer';
      case 2:
        return 'Consumer';
      default:
        return 'Unknown';
    }
  };

  return (
    <nav className="navbar fixed top-0 left-0 w-full bg-gradient-to-r from-green-800 bg-black text-white shadow-lg z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link to="/">
            <div className="text-2xl font-bold tracking-wider">Solaris</div>
          </Link>
          {/* Desktop Navigation */}
          {isAuthenticated && (
            <>
              <div className="hidden md:flex space-x-6">
                <Link to="/dashboard"> {/* Fix the link to point to /dashboard */}
                  <NavLink icon={<Home size={18} />} text="Dashboard" />
                </Link>
                <Link to="/marketplace">
                  <NavLink icon={<Building size={18} />} text="Marketplace" />
                </Link>
                {userRole === 1 && (
                  <Link to="/my-posts">
                    <NavLink icon={<FileText size={18} />} text="My Posts" />
                  </Link>
                )}
                {userRole === 2 && (
                  <Link to="/my-bids">
                    <NavLink icon={<FileText size={18} />} text="My Bids" />
                  </Link>
                )}
              </div>
              {/* Add role indicator */}
              <div className="hidden md:block px-4 py-1 bg-gray-700 rounded-full">
                <span className="text-sm text-gray-300">Role: </span>
                <span className="font-semibold text-emerald-400">{getRoleName(userRole)}</span>
              </div>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu />
          </Button>
        </div>

        <div className="hidden md:flex items-center space-x-4">
        {!isAuthenticated ? (
          <>
            <Link to="/login">
              <Button
                variant="outline"
                className="text-white border-white/30 hover:bg-white/10"
              >
                <LogIn size={16} className="mr-2" />
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <User size={16} className="mr-2" />
                Register
              </Button>
            </Link>
          </>
        ) : (
          <Button
            variant="outline"
            className="text-white border-white/30 hover:bg-white/10"
            onClick={handleLogout}
          >
            Logout
          </Button>
        )}
      </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-gradient-to-r from-blue-800 to-indigo-900">
          <div className="flex flex-col space-y-2 p-4">
            <Link to="/dashboard"> {/* Fix the link to point to /dashboard */}
              <MobileNavLink icon={<Home size={18} />} text="Dashboard" />
            </Link>
            <Link to="/marketplace">
              <MobileNavLink icon={<Building size={18} />} text="Marketplace" />
            </Link>
            {userRole === 1 && (
              <Link to="/my-posts">
                <MobileNavLink icon={<FileText size={18} />} text="My Posts" />
              </Link>
            )}
            {userRole === 2 && (
              <Link to="/my-bids">
                <MobileNavLink icon={<FileText size={18} />} text="My Bids" />
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

const NavLink = ({ icon, text }) => (
  <span
    href="#"
    className="flex items-center space-x-2 hover:text-emerald-300 transition-colors"
  >
    {icon}
    <span>{text}</span>
  </span>
);

const MobileNavLink = ({ icon, text }) => (
  <span
    href="#"
    className="flex items-center space-x-4 p-3 hover:bg-white/10 rounded-md transition-colors"
  >
    {icon}
    <span>{text}</span>
  </span>
);

export default Navbar;