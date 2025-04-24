import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import axios from 'axios';
//import RetentionHeatmap from './RetentionHeatmap';

const Dashboard = ({userRole}) => {
  const [currentEnergyStored, setCurrentEnergyStored] = useState(0);

  useEffect(() => {
    const fetchEnergyData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/energy');
        console.log('Energy Data from API:', response.data);

        if (response.data.energy_stored) {
          setCurrentEnergyStored(response.data.energy_stored);
        }
      } catch (error) {
        console.error('Error fetching energy data:', error);
        setCurrentEnergyStored(0); // Fallback value
      }
    };

    fetchEnergyData();  // Fetch once when the component mounts

    // Set up interval to fetch the data every 10 seconds (or as needed)
    const intervalId = setInterval(fetchEnergyData, 10000); // 10 seconds interval

    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-3 gap-4">

        {
          userRole === 'prosumer' && (
            <Card>
              <CardHeader>
                <CardTitle>Current Energy Stored</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{currentEnergyStored} kWh</div>
              </CardContent>
            </Card>
          )
        }
        <Card>
          <CardHeader>
            <CardTitle>Total Energy Traded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">124.567 kWh</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current Market Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">PKR 15.42/Wh</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">0</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;