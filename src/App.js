import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Welcome from "./components/Welcome";
import Dashboard from "./components/Dashboard";
import EnergyTradingDapp from "./EnergyTradingDapp";
import Login from "./components/Login";
import Register from "./components/Register";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Marketplace from "./components/Marketplace";
import MyPosts from "./components/MyPosts";
import MyBids from "./components/MyBids";
import Web3 from 'web3';
import queueMonitor from './utils/queueMonitor'; // Import the queue monitor
const EnergyTradingABI = require('./components/EnergyTradingABI.json');

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;


// Define Role enum to match smart contract
const Role = {
  None: 0,
  Prosumer: 1,
  Consumer: 2
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('token') === 'true';
  });
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Remove unused currentAccount state
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!window.ethereum || !isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();
        const currentAccount = accounts[0];

        // If account changed, clear previous role
        if (currentAccount !== localStorage.getItem('userAddress')) {
          console.log('Account changed, clearing previous role');
          localStorage.removeItem('userRole');
          setUserRole(null);
        }

        const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
        const userInfo = await contract.methods.users(currentAccount).call();
        const roleNumber = Number(userInfo.role);
        
        console.log('Account:', currentAccount);
        console.log('Role from contract:', roleNumber);
        
        setUserRole(roleNumber);
        localStorage.setItem('userRole', roleNumber.toString());
        localStorage.setItem('userAddress', currentAccount);

        // Initialize queue monitor if user is a prosumer
        if (roleNumber === Role.Prosumer) {
          await queueMonitor.initialize();
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [isAuthenticated]);

  // Add MetaMask account change listener
  useEffect(() => {
    const handleAccountsChanged = () => {
      console.log('MetaMask account changed');
      
      // Reset queue monitor when account changes
      queueMonitor.reset();
      
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userAddress');
      setIsAuthenticated(false);
      setUserRole(null);
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  // Initialize queue monitor when app loads if user is already authenticated as prosumer
  useEffect(() => {
    const initQueueMonitor = async () => {
      if (isAuthenticated && userRole === Role.Prosumer) {
        console.log('Initializing queue monitor for prosumer');
        await queueMonitor.initialize();
      }
    };
    
    if (!loading) {
      initQueueMonitor();
    }
    
    // Cleanup on component unmount
    return () => {
      queueMonitor.reset();
    };
  }, [isAuthenticated, userRole, loading]);

  if (loading) {
    return <div>Loading...</div>; // Add proper loading component
  }

  return (
    <Router>
      <div style={{ paddingTop: "64px", height: "100vh" }}>
        <Navbar userRole={userRole} isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}/>
        <div style={{ maxWidth: 1200 }} className="container mx-auto px-4">
          <Routes>
            <Route
              path="/"
              element={<Welcome />}
            />
            <Route
              path="/login"
              element={<Login setIsAuthenticated={setIsAuthenticated} />}
            />
            <Route path="/register" element={<Register setIsAuthenticated={setIsAuthenticated}/>} />
            <Route
              path="/dashboard"
              element={
                isAuthenticated ? (
                  <>
                    <Dashboard userRole={userRole} />
                    <EnergyTradingDapp setUserRole={setUserRole} userRole={userRole}/>
                  </>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route path="/marketplace" element={
              isAuthenticated ?
              <Marketplace userRole={userRole} /> : 
              <Navigate to="/login" />
            } />

            {
              userRole === Role.Prosumer && (
                <Route path="/my-posts" element={
                  <MyPosts />
                }/>
              )
            }

            {
              userRole === Role.Consumer && (
                <Route path="/my-bids" element={
                  <MyBids />
                }/>
              )
            }
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;