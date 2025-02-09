import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Welcome from "./components/Welcome";
import Dashboard from "./components/Dashboard";
import EnergyTradingDapp from "./EnergyTradingDapp";
import Login from "./components/Login";
import Register from "./components/Register";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Marketplace from "./components/Marketplace";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [userRole, setUserRole] = useState('prosumer');
  console.log(userRole);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // useEffect(() => {
  //   if (isAuthenticated) {
  //     localStorage.setItem("token", "true");
  //   } else {
  //     localStorage.removeItem("token");
  //   }
  // }, [isAuthenticated]);

  // const contactServer = () => {
  //   fetch("http://localhost:5000/")
  //     .then((response) => response.json())
  //     .then((data) => console.log(data))
  //     .catch((error) => console.error(error));
  // };

  return (
    <Router>
      <div style={{ paddingTop: "64px", height: "100vh" }}>
        {/* <button onClick={contactServer}>Contact Server</button> */}
        <Navbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}/>
        <Routes>
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Welcome />}
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
