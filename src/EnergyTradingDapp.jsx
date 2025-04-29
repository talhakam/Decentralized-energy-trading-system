import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { Button } from './components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
// import { Input } from './components/ui/input';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

// Replace with your actual contract ABI and address
const CONTRACT_ADDRESS = '0x..YOUR_DEPLOYED_CONTRACT_ADDRESS...';
const CONTRACT_ABI = ['...YOUR_CONTRACT_ABI_HERE...'];

const EnergyTradingDapp = ({userRole, setUserRole}) => {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [energyBalance, setEnergyBalance] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [energyRequested, setEnergyRequested] = useState('');
  const [bids, setBids] = useState([]);

  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        try {
          // Request account access
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const accounts = await web3Instance.eth.getAccounts();
          const contractInstance = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

          setWeb3(web3Instance);
          setAccount(accounts[0]);
          setContract(contractInstance);

          // Fetch user details
          const userData = await contractInstance.methods.users(accounts[0]).call();
          setUserRole(web3Instance.utils.hexToUtf8(userData.role));
          setEnergyBalance(userData.energyBalance);
        } catch (error) {
          console.error("Could not connect to blockchain", error);
        }
      }
    };

    initWeb3();
  }, []);

  const registerUser = async (role) => {
    try {
      if (role === 'prosumer') {
        await contract.methods.registerProsumer(account, 100).send({ from: account });
      } else {
        await contract.methods.registerConsumer(account).send({ from: account });
      }
      // Refresh user data
      const userData = await contract.methods.users(account).call();
      setUserRole(web3.utils.hexToUtf8(userData.role));
    } catch (error) {
      console.error("Registration error", error);
    }
  };

  const submitEnergyData = async (amount) => {
    try {
      await contract.methods.submitEnergyData(amount).send({ from: account });
      // Refresh energy balance
      const userData = await contract.methods.users(account).call();
      setEnergyBalance(userData.energyBalance);
    } catch (error) {
      console.error("Energy data submission error", error);
    }
  };

  const placeBid = async () => {
    try {
      await contract.methods.placeBid(
        web3.utils.toWei(bidAmount, 'ether'), 
        energyRequested
      ).send({ from: account });
      setBidAmount('');
      setEnergyRequested('');
    } catch (error) {
      console.error("Bid placement error", error);
    }
  };

  const sellEnergy = async () => {
    try {
      await contract.methods.sellEnergy().send({ from: account });
    } catch (error) {
      console.error("Energy selling error", error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* <h1 className="text-2xl font-bold mb-4">Energy Trading Platform</h1> */}
      
      {!userRole && (
        <div className="mb-4">
          <h2>Register as:</h2>
          <Button onClick={() => registerUser('prosumer')}>Prosumer</Button>
          <Button onClick={() => registerUser('consumer')}>Consumer</Button>
        </div>
      )}

      {/* {userRole && (
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="energy">Energy Management</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>User Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Address: {account}</p>
                <p>Role: {userRole}</p>
                <p>Energy Balance: {energyBalance} kWh</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="energy">
            <Card>
              <CardHeader>
                <CardTitle>Submit Energy Data</CardTitle>
              </CardHeader>
              <CardContent>
                <Input 
                  type="number" 
                  placeholder="Energy Amount"
                  value={energyRequested}
                  onChange={(e) => setEnergyRequested(e.target.value)}
                />
                <Button onClick={() => submitEnergyData(energyRequested)}>
                  Submit Energy Data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trading">
            {userRole === 'consumer' && (
              <Card>
                <CardHeader>
                  <CardTitle>Place Bid</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input 
                    type="number" 
                    placeholder="Bid Amount (ETH)"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                  />
                  <Input 
                    type="number" 
                    placeholder="Energy Requested"
                    value={energyRequested}
                    onChange={(e) => setEnergyRequested(e.target.value)}
                  />
                  <Button onClick={placeBid}>Place Bid</Button>
                </CardContent>
              </Card>
            )}

            {userRole === 'prosumer' && (
              <Card>
                <CardHeader>
                  <CardTitle>Sell Energy</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={sellEnergy}>Sell Available Energy</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )} */}
    </div>
  );
};

export default EnergyTradingDapp;