import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ArrowUp, ArrowDown, Activity, AlertTriangle, Droplets, Zap, Sun, Wind, Power } from 'lucide-react';
import './Dashboard.css';
import Card from './Card';
import Tabs from './Tabs';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get } from 'firebase/database';
import Web3 from 'web3';
const EnergyTradingABI = require('./EnergyTradingABI.json');

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCwpFP_cnW5yOyyoW7ZZDAcS9VZKlnXdow",
  databaseURL: "https://smeter2-56caa-default-rtdb.firebaseio.com",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const Dashboard = ({ userRole }) => {
  const [currentEnergyStored, setCurrentEnergyStored] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [priceError, setPriceError] = useState(null);
  const [totalEnergyTraded, setTotalEnergyTraded] = useState(0); // Add this line
  
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [activeTab, setActiveTab] = useState('price');
  
  // Firebase state
  const [loadRelayStatus, setLoadRelayStatus] = useState(1); // Default to 1 (OFF)
  const [isLoadRelayLoading, setIsLoadRelayLoading] = useState(true);
  const [hardwareId, setHardwareId] = useState('');
  const [isLoadingEnergyStored, setIsLoadingEnergyStored] = useState(true);
  
  // Format time from API to readable format
  const formatTime = (timeString) => {
    if (!timeString) return '';
    // Extract time portion if it contains a range
    if (timeString.includes('-')) {
      timeString = timeString.split('-')[0].trim();
    }
    
    // Parse date
    const date = new Date(timeString);
    if (isNaN(date)) {
      // If standard parsing fails, try custom parsing
      const parts = timeString.split(' ');
      if (parts.length >= 2) {
        const datePart = parts[0].split('.');
        const timePart = parts[1].split(':');
        if (datePart.length === 3 && timePart.length >= 2) {
          // Format: DD.MM.YYYY HH:MM
          return `${timePart[0]}:${timePart[1]}`;
        }
      }
      return timeString; // Return original if parsing fails
    }
    
    // Return time in HH:MM format
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="custom-tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} className="custom-tooltip-value">
              <span className="custom-tooltip-dot" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {entry.value.toFixed(2)} {entry.unit}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Initialize web3 and get hardware ID from blockchain
  useEffect(() => {
    const fetchHardwareIdFromBlockchain = async () => {
      if (!window.ethereum) {
        console.error('MetaMask is not available');
        return;
      }

      try {
        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3.eth.getAccounts();
        const currentAccount = accounts[0];
        
        // Get the user's hardware ID from the contract
        const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
        const hardwareId = await contract.methods.getUserHardwareId(currentAccount).call();
        
        console.log('Retrieved hardware ID from blockchain:', hardwareId);
        setHardwareId(hardwareId);
        
        // Also fetch stored energy from the contract
        if (userRole === 1) { // Only for Prosumers
          const storedEnergy = await contract.methods.getStoredEnergy(currentAccount).call();
          console.log('Retrieved stored energy from blockchain:', storedEnergy);
          
          // If zero, we'll update from Firebase later
          if (Number(storedEnergy) > 0) {
            setCurrentEnergyStored(Number(storedEnergy));
          }
          setIsLoadingEnergyStored(false);
        }
      } catch (error) {
        console.error('Error fetching hardware ID from blockchain:', error);
        // Fallback to local storage if available
        const storedHardwareId = localStorage.getItem('hardwareId');
        if (storedHardwareId) {
          setHardwareId(storedHardwareId);
        } else {
          setHardwareId('Hardware101'); // Default fallback
        }
        setIsLoadingEnergyStored(false);
      }
    };

    fetchHardwareIdFromBlockchain();
  }, [userRole]);

  // Listen to Firebase for Load Relay status and energy data
  useEffect(() => {
    if (hardwareId) {
      if (userRole === 1) { // For Prosumers
        const energyRef = ref(database, `${hardwareId}/Prosumer`);
        const unsubscribeEnergy = onValue(energyRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setCurrentEnergyStored(data.EnergyAvailable || 0);
            setTotalEnergyTraded(data.TotalEnergySold || 0);
          }
          setIsLoadingEnergyStored(false);
        });

        const loadRelayRef = ref(database, `${hardwareId}/Prosumer/LR`);
        const unsubscribeLoadRelay = onValue(loadRelayRef, (snapshot) => {
          const value = snapshot.val();
          if (value !== null) {
            setLoadRelayStatus(value);
          }
          setIsLoadRelayLoading(false);
        });

        return () => {
          unsubscribeLoadRelay();
          unsubscribeEnergy();
        };
      } else if (userRole === 2) { // For Consumers
        const consumerRef = ref(database, `${hardwareId}/Consumer`);
        const unsubscribeConsumer = onValue(consumerRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setTotalEnergyTraded(data.TotalEnergyBought || 0);
          }
          setIsLoadingEnergyStored(false);
        });

        return () => {
          unsubscribeConsumer();
        };
      }
    } else {
      setIsLoadingEnergyStored(false);
    }
  }, [userRole, hardwareId, database]);

  // Helper function to update blockchain energy
  const updateBlockchainEnergy = async (energyValue) => {
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
      
      const storedEnergy = await contract.methods.getStoredEnergy(accounts[0]).call();
      if (Number(storedEnergy) !== energyValue) {
        await contract.methods.updateStoredEnergy(energyValue).send({
          from: accounts[0]
        });
        console.log('Updated stored energy in blockchain to:', energyValue);
      }
    } catch (error) {
      console.error('Error updating stored energy in blockchain:', error);
    }
  };

  // Toggle Load Relay function
  const toggleLoadRelay = () => {
    if (!hardwareId) {
      console.error('No hardware ID available');
      return;
    }
    
    // Flip the value: 0 -> 1, 1 -> 0
    const newValue = loadRelayStatus === 1 ? 0 : 1;
    setIsLoadRelayLoading(true);
    
    // Update Firebase
    const loadRelayRef = ref(database, `${hardwareId}/Prosumer/LR`);
    set(loadRelayRef, newValue)
      .then(() => {
        console.log(`Load relay set to ${newValue}`);
      })
      .catch((error) => {
        console.error("Error updating load relay:", error);
        // Restore previous state in case of error
        setLoadRelayStatus(loadRelayStatus);
        setIsLoadRelayLoading(false);
      });
  };

  // Fetch data from various APIs
  useEffect(() => {
    const fetchData = async () => {
      // Remove or modify fetchEnergyData since we're getting it from Firebase
      const fetchEnergyData = async () => {
        if (!hardwareId || !isLoadingEnergyStored) {
          return;
        }
        
        try {
          const db = getDatabase();
          const energyRef = ref(db, `${hardwareId}/Prosumer`);
          const snapshot = await get(energyRef);
          
          if (snapshot.exists()) {
            const data = snapshot.val();
            setCurrentEnergyStored(data.EnergyAvailable || 0);
            setTotalEnergyTraded(userRole === 1 ? data.TotalEnergySold : data.TotalEnergyBought || 0);
          }
        } catch (error) {
          console.error('Error fetching energy data:', error);
          setCurrentEnergyStored(0);
        } finally {
          setIsLoadingEnergyStored(false);
        }
      };

      // Function to fetch current price
      const fetchCurrentPrice = async () => {
        setIsLoadingPrice(true);
        setPriceError(null);
        try {
          const response = await axios.get('http://localhost:8000/api/predict');
          if (response.data && response.data.price) {
            setCurrentPrice(response.data.price);
          }
        } catch (error) {
          console.error('Error fetching price data:', error);
          setPriceError('Failed to load current price');
          // Set a fallback price or handle the error as needed
          setCurrentPrice(10); // Example fallback price
        } finally {
          setIsLoadingPrice(false);
        }
      };

      // Function to fetch history data with fallback
      const fetchHistoryData = async () => {
        setIsLoadingHistory(true);
        setHistoryError(null);
        try {
          const response = await axios.get('http://localhost:8000/api/history');
          if (response.data && response.data.records) {
            const processedData = response.data.records.map(record => ({
              time: formatTime(record.time),
              load: record.total_load_actual,
              price: record.predicted_price,
              generation_solar: record.generation_solar,
              generation_wind: record.generation_wind_onshore,
            }));
            setHistoryData(processedData);
          }
        } catch (error) {
          console.error('Error fetching history data:', error);
          setHistoryError('Failed to load history data');
          // Set some fallback/mock data if needed
          setHistoryData([]);
        } finally {
          setIsLoadingHistory(false);
        }
      };

      // Run fetches with error handling
      try {
        await Promise.all([
          fetchEnergyData(),
          fetchCurrentPrice(),
          fetchHistoryData()
        ]);
      } catch (error) {
        console.error('Error in data fetching:', error);
      }
    };

    fetchData();
    const dataIntervalId = setInterval(fetchData, 60000);
    return () => clearInterval(dataIntervalId);
  }, [hardwareId, isLoadingEnergyStored]);

  // Format the current price with proper currency format
  const formattedPrice = currentPrice ? 
    `€${currentPrice.toFixed(2)}/MWh` : 
    isLoadingPrice ? 'Loading...' : priceError || 'N/A';

  // Calculate price trend (if we have enough history)
  const calculatePriceTrend = () => {
    if (historyData.length < 2) return null;
    const lastPrice = historyData[historyData.length - 1].price;
    const previousPrice = historyData[historyData.length - 2].price;
    
    if (lastPrice > previousPrice) {
      return { direction: 'up', percentage: ((lastPrice - previousPrice) / previousPrice * 100).toFixed(1) };
    } else if (lastPrice < previousPrice) {
      return { direction: 'down', percentage: ((previousPrice - lastPrice) / previousPrice * 100).toFixed(1) };
    } else {
      return { direction: 'same', percentage: 0 };
    }
  };

  // Calculate load trend (similar to price trend)
  const calculateLoadTrend = () => {
    if (historyData.length < 2) return null;
    const lastLoad = historyData[historyData.length - 1].load;
    const previousLoad = historyData[historyData.length - 2].load;
    
    if (lastLoad > previousLoad) {
      return { direction: 'up', percentage: ((lastLoad - previousLoad) / previousLoad * 100).toFixed(1) };
    } else if (lastLoad < previousLoad) {
      return { direction: 'down', percentage: ((previousLoad - lastLoad) / previousLoad * 100).toFixed(1) };
    } else {
      return { direction: 'same', percentage: 0 };
    }
  };

  const priceTrend = calculatePriceTrend();
  const loadTrend = calculateLoadTrend();

  // Calculate average load if we have history data
  const averageLoad = historyData.length > 0 
    ? Math.round(historyData.reduce((acc, record) => acc + record.load, 0) / historyData.length) 
    : 'N/A';

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Energy Trading Platform</h1>
        <div className="dashboard-subtitle">Real-time market insights</div>
      </header>
      
      {/* Key Metrics */}
      <div className="dashboard-metrics">
        {userRole === 1 && (
          <Card 
            title="Current Energy Stored"
            value={isLoadingEnergyStored ? "Loading..." : `${currentEnergyStored} Wh`}
            color="blue"
            icon={<Droplets />}
            isLoading={isLoadingEnergyStored}
          />
        )}
        
        <Card 
          title="Total Energy Traded"
          value={`${totalEnergyTraded.toFixed(2)} Wh`}
          color="green"
          icon={<Zap />}
        />
        
        <Card 
          title="Current Market Price"
          value={formattedPrice}
          color="purple"
          isLoading={isLoadingPrice}
          error={priceError}
          trend={priceTrend}
        />
        
        {/* Load Control Button for Prosumers - Now positioned at the end */}
        {userRole === 1 && (
          <div className="load-control-card">
            <div className="load-control-header">
              <h3 className="load-control-title">Load Control</h3>
              <Power className="load-control-icon" />
            </div>
            <div className="load-control-content">
              <div className="load-status">
                <span className={`status-indicator ${loadRelayStatus === 0 ? 'status-on' : 'status-off'}`}></span>
                <span className="status-text">
                  {loadRelayStatus === 0 ? 'Load Connected' : 'Load Disconnected'}
                </span>
              </div>
              <button 
                className={`load-control-button ${loadRelayStatus === 0 ? 'button-on' : 'button-off'}`}
                onClick={toggleLoadRelay}
                disabled={isLoadRelayLoading}
              >
                {isLoadRelayLoading ? 'Updating...' : (loadRelayStatus === 0 ? 'Turn Off Load' : 'Turn On Load')}
              </button>
            </div>
          </div>
        )}
      </div>

      
      {/* Tabs for Different Chart Views */}
      <Tabs 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        tabs={[
          { id: 'price', label: 'Price Trends', icon: <Activity /> },
          { id: 'load', label: 'Load Analysis', icon: <Zap /> },
          { id: 'renewables', label: 'Renewable Generation', icon: <Sun /> }
        ]}
      >
        {activeTab === 'price' && (
          <div className="dashboard-chart-container">
            <h2 className="chart-title">Energy Price Trends</h2>
            
            {isLoadingHistory && historyData.length === 0 ? (
              <div className="chart-loading">Loading chart data...</div>
            ) : historyError ? (
              <div className="chart-error">
                <AlertTriangle className="chart-error-icon" />
                {historyError}
              </div>
            ) : historyData.length === 0 ? (
              <div className="chart-empty">No historical data available</div>
            ) : (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%" >
                  <LineChart
                    data={historyData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15}  />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }} 
                      tickMargin={10}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickMargin={10}
                      domain={['auto', 'auto']}
                      label={{ 
                        value: 'Price (EUR/MWh)', // Updated label
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: '#9333ea', fontSize: 12 }
                      }}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      formatter={(value) => [value.toFixed(2), 'EUR/MWh']}  // Updated tooltip format
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      name="Price"
                      stroke="#9333ea" 
                      strokeWidth={2}
                      unit="EUR/MWh"
                      dot={{ r: 3, strokeWidth: 1, fill: '#9333ea' }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#9333ea' }}
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'load' && (
          <div className="dashboard-chart-container">
            <h2 className="chart-title">Energy Load Analysis</h2>
            
            {isLoadingHistory && historyData.length === 0 ? (
              <div className="chart-loading">Loading chart data...</div>
            ) : historyError ? (
              <div className="chart-error">
                <AlertTriangle className="chart-error-icon" />
                {historyError}
              </div>
            ) : historyData.length === 0 ? (
              <div className="chart-empty">No historical data available</div>
            ) : (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={historyData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }} 
                      tickMargin={10}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickMargin={10}
                      domain={['auto', 'auto']}
                      label={{ 
                        value: 'Load (kWh)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: '#4f46e5', fontSize: 12 }
                      }}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      formatter={(value) => [value.toFixed(2), 'kWh']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="load" 
                      name="Load"
                      stroke="#4f46e5" 
                      strokeWidth={2}
                      unit="kWh"
                      dot={{ r: 3, strokeWidth: 1, fill: '#4f46e5' }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'renewables' && (
          <div className="dashboard-chart-container">
            <h2 className="chart-title">Renewable Energy Generation</h2>
            
            {isLoadingHistory && historyData.length === 0 ? (
              <div className="chart-loading">Loading chart data...</div>
            ) : historyError ? (
              <div className="chart-error">
                <AlertTriangle className="chart-error-icon" />
                {historyError}
              </div>
            ) : historyData.length === 0 ? (
              <div className="chart-empty">No historical data available</div>
            ) : (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={historyData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }} 
                      tickMargin={10}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickMargin={10}
                      domain={[0, 'auto']}
                      label={{ 
                        value: 'Generation (kWh)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: '#555', fontSize: 12 }
                      }}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      formatter={(value) => [value.toFixed(2), 'kWh']}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="generation_solar" 
                      name="Solar"
                      stackId="1"
                      stroke="#f59e0b" 
                      fill="#fcd34d"
                      unit="kWh"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="generation_wind" 
                      name="Wind"
                      stackId="1"
                      stroke="#0ea5e9" 
                      fill="#7dd3fc"
                      unit="kWh"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </Tabs>

      {/* Market overview */}
      <div className="dashboard-overview">
        <h2 className="overview-title">Energy Market Overview</h2>
        <div className="overview-grid">
          <div className="overview-card">
            <div className="overview-card-header">
              <Activity className="overview-card-icon" />
              <h3 className="overview-card-title">Price Trend</h3>
            </div>
            <p className="overview-card-content">
              Market price is {formattedPrice} and is currently 
              {priceTrend?.direction === 'up' 
                ? <span className="trend-up"> rising by {priceTrend.percentage}%</span>
                : priceTrend?.direction === 'down'
                  ? <span className="trend-down"> falling by {priceTrend.percentage}%</span> 
                  : ' stable'
              }
            </p>
          </div>
          
          <div className="overview-card">
            <div className="overview-card-header">
              <Zap className="overview-card-icon" />
              <h3 className="overview-card-title">Load Status</h3>
            </div>
            <p className="overview-card-content">
              Current grid load is averaging {averageLoad} kWh and is
              {loadTrend?.direction === 'up' 
                ? <span className="trend-up"> increasing by {loadTrend.percentage}%</span>
                : loadTrend?.direction === 'down'
                  ? <span className="trend-down"> decreasing by {loadTrend.percentage}%</span> 
                  : ' stable'
              }
            </p>
          </div>
          
          <div className="overview-card">
            <div className="overview-card-header">
              <Sun className="overview-card-icon" />
              <h3 className="overview-card-title">Renewable Status</h3>
            </div>
            <p className="overview-card-content">
              {historyData.length > 0 
                ? `Solar contributing ${Math.round(historyData[historyData.length - 1].generation_solar)} kWh and wind ${Math.round(historyData[historyData.length - 1].generation_wind)} kWh currently`
                : 'Renewable generation data not available'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;