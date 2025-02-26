import React, { useState } from "react";
import { Home, User, LogIn, Building, FileText, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

const Navbar = ({ userRole, isAuthenticated, setIsAuthenticated }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="navbar fixed top-0 left-0 w-full bg-gradient-to-r from-green-800 bg-black text-white shadow-lg z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link to="/">
            <div className="text-2xl font-bold tracking-wider">Solaris</div>
          </Link>
          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex space-x-6">
              <Link to={"/"}>
              <NavLink icon={<Home size={18} />} text="Dashboard" />
              </Link>
              <Link to={"/marketplace"}>
              <NavLink icon={<Building size={18} />} text="Marketplace" />
              </Link>
              <Link to={"/reports"}>
              <NavLink icon={<FileText size={18} />} text="Reports" />
              </Link>
              {
                userRole === "prosumer" && (
                  <Link to={"/my-posts"}>
                  <NavLink icon={<FileText size={18} />} text="My Posts" />
                  </Link>
                )
              }
              {
                userRole === "consumer" && (
                  <Link to={"/my-bids"}>
                  <NavLink icon={<FileText size={18} />} text="My Bids" />
                  </Link>
                )
              }
            </div>
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

        {/* Authentication Buttons */}
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
              onClick={() => {
                
      localStorage.removeItem("token");
                setIsAuthenticated(false)}}
            >
              Logout
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-gradient-to-r from-blue-8002 to-indigo-900">
          <div className="flex flex-col space-y-2 p-4">
            <MobileNavLink icon={<Home size={18} />} text="Dashboard" />
            <MobileNavLink icon={<Building size={18} />} text="Marketplace" />
            <MobileNavLink icon={<FileText size={18} />} text="Reports" />
            <div className="flex space-x-4 pt-4">
              <Button
                variant="outline"
                className="w-full text-white border-white/30 hover:bg-white/10"
              >
                Login
              </Button>
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
                Register
              </Button>
            </div>
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
