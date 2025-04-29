import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import EnergyTradingABI from './EnergyTradingABI.json';
import { fromBlockchainEnergy } from '../utils/energyUtils';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const getStatusText = (status) => {
  const statusMap = {
    0: 'Open',
    1: 'In Progress',
    2: 'Completed',
    3: 'Disputed',
    4: 'Canceled'
  };
  return statusMap[status] || 'Unknown';
};

const MyBids = () => {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBids = async () => {
      if (!window.ethereum) {
        console.error("MetaMask is not installed.");
        return;
      }

      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);

      try {
        console.log("Fetching user bids for account:", accounts[0]); // Debug log

        // Call the getMyBids function from the smart contract
        const userBids = await contract.methods.getMyBids(accounts[0]).call();
        console.log("User bids from contract:", userBids); // Debug log

        if (!userBids || userBids.length === 0) {
          console.log("No bids found for the user.");
          setBids([]);
          return;
        }

        // Format the bids for the frontend
        const formattedBids = userBids.map((bid) => {
          // Convert the energy amount from blockchain format to display format
          const rawEnergy = Number(bid.energyAmount);
          const displayEnergy = fromBlockchainEnergy(rawEnergy);
          
          console.log(`Converting blockchain energy ${rawEnergy} to display value: ${displayEnergy} Wh`);
          
          return {
            id: Number(bid.id),
            prosumer: bid.prosumer,
            energyAmount: displayEnergy, // Converted from blockchain format
            minPrice: parseFloat(web3.utils.fromWei(bid.minPrice.toString(), "ether")).toFixed(4), // Price in ETH
            highestBid: parseFloat(web3.utils.fromWei(bid.highestBid.toString(), "ether")).toFixed(4), // Highest bid in ETH
            userBid:
              bid.highestBidder.toLowerCase() === accounts[0].toLowerCase()
                ? parseFloat(web3.utils.fromWei(bid.highestBid.toString(), "ether")).toFixed(4)
                : bid.secondHighestBidder.toLowerCase() === accounts[0].toLowerCase()
                ? parseFloat(web3.utils.fromWei(bid.secondHighestBid.toString(), "ether")).toFixed(4)
                : "0.0000", // User's actual bid
            status: Number(bid.status),
            auctionEnd: Number(bid.auctionEnd),
            isWinning: bid.highestBidder.toLowerCase() === accounts[0].toLowerCase(),
          };
        });

        console.log("Formatted bids:", formattedBids); // Debug log
        setBids(formattedBids);
      } catch (error) {
        console.error("Error fetching bids:", error);
        alert("Failed to fetch bids. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
    
    // Auto-refresh bids every 30 seconds
    const interval = setInterval(fetchBids, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Listen for won auctions
    const listenForWonAuctions = async () => {
      if (!window.ethereum) return;

      try {
        const web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();
        const currentAccount = accounts[0];
        
        // Get user's hardware ID
        const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
        const hardwareId = await contract.methods.getUserHardwareId(currentAccount).call();
        
        // Listen for energy purchases in Firebase
        const db = getDatabase();
        const energyBoughtRef = ref(db, `Consumer/${hardwareId}/EnergyBought`);
        
        onValue(energyBoughtRef, (snapshot) => {
          const newEnergyAmount = snapshot.val();
          if (newEnergyAmount) {
            toast.success(
              `🎉 Congratulations! You've won an energy auction! Check your dashboard for details.`,
              {
                position: "top-right",
                autoClose: 10000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              }
            );
          }
        });
      } catch (error) {
        console.error('Error setting up auction notifications:', error);
      }
    };

    listenForWonAuctions();
  }, []);

  useEffect(() => {
    const listenForNotifications = async () => {
      if (!window.ethereum) return;

      try {
        const web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();
        const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
        const hardwareId = await contract.methods.getUserHardwareId(accounts[0]).call();
        
        const db = getDatabase();
        const notificationsRef = ref(db, `${hardwareId}/Consumer/Notifications`);
        
        onValue(notificationsRef, (snapshot) => {
          const notifications = snapshot.val();
          if (notifications) {
            Object.entries(notifications).forEach(([id, notification]) => {
              if (!notification.read) {
                toast.success(
                  `🎉 ${notification.message} - ${notification.energyAmount} Wh`,
                  {
                    position: "top-right",
                    autoClose: 10000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                  }
                );
                // Mark notification as read
                set(ref(db, `${hardwareId}/Consumer/Notifications/${id}/read`), true);
              }
            });
          }
        });
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };

    listenForNotifications();
  }, []);

  const BidCard = ({ bid }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Listing #{bid.id}</h3>
      <div className="space-y-2">
        <p className="text-gray-300">
          <span className="font-semibold text-gray-200">Seller:</span>{' '}
          <span 
            className="cursor-pointer hover:text-blue-400 transition-colors"
            title={bid.prosumer} // Shows full address on hover
          >
            {truncateAddress(bid.prosumer)}
          </span>
        </p>
        <p className="text-gray-300">
          <span className="font-semibold text-gray-200">Energy Amount:</span>{' '}
          {Number(bid.energyAmount).toFixed(2)} Wh {/* Display with 2 decimal places */}
        </p>
        <p className="text-gray-300">
          <span className="font-semibold text-gray-200">Minimum Price:</span>{' '}
          {bid.minPrice} ETH {/* Already formatted in the mapping */}
        </p>
        <p className="text-gray-300">
          <span className="font-semibold text-gray-200">Highest Bid:</span>{' '}
          {bid.highestBid} ETH {/* Already formatted in the mapping */}
        </p>
        <p className="text-gray-300">
          <span className="font-semibold text-gray-200">Your Bid:</span>{' '}
          {bid.userBid > 0 ? `${bid.userBid} ETH` : "No bid placed"} {/* Display user's actual bid */}
        </p>
        <p className="text-gray-300">
          <span className="font-semibold text-gray-200">Status:</span> 
          <span className={`ml-2 px-2 py-1 rounded ${
            bid.status === 2 ? 'bg-green-600' : 
            bid.status === 0 ? 'bg-blue-600' : 
            'bg-gray-600'
          }`}>
            {getStatusText(bid.status)}
          </span>
        </p>
        {bid.isWinning && (
          <p className="text-emerald-400 font-semibold">
            You are currently the highest bidder!
          </p>
        )}
        {bid.status === 0 && (
          <p className="text-gray-300">
            <span className="font-semibold text-gray-200">Ends in:</span>{' '}
            {Math.max(0, Math.floor((Number(bid.auctionEnd) - Date.now() / 1000) / 60))} mins
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-4 text-white">My Bids</h1>

      {loading ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading your bids...</p>
        </div>
      ) : bids.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-300 text-lg">You haven't placed any bids yet.</p>
          <a 
            href="/marketplace" 
            className="inline-block mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Browse Marketplace
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bids.map((bid) => (
            <BidCard key={bid.id} bid={bid} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBids;