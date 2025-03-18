import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import EnergyTradingABI from './EnergyTradingABI.json';

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

      try {
        const web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();
        const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);

        // Get all bids for the current user
        const userBidsIndexes = await contract.methods.userBids(accounts[0], 0).call();
        console.log('User bids indexes:', userBidsIndexes);

        // Get all bid IDs
        let validBidIds = [];
        let index = 0;
        
        while (true) {
          try {
            const bidId = await contract.methods.userBids(accounts[0], index).call();
            if (bidId && Number(bidId) > 0) {
              validBidIds.push(Number(bidId));
            }
            index++;
          } catch (error) {
            // Break the loop when we've reached the end of the array
            break;
          }
        }

        console.log('Valid bid IDs:', validBidIds);

        if (validBidIds.length === 0) {
          setBids([]);
          setLoading(false);
          return;
        }

        // Fetch details for each bid
        const bidDetails = await Promise.all(
          validBidIds.map(async (id) => {
            try {
              const listing = await contract.methods.listings(id).call();
              console.log(`Listing ${id} details:`, listing);

              return {
                id: id,
                prosumer: listing.prosumer,
                energyAmount: web3.utils.fromWei(listing.energyAmount.toString(), 'ether'),
                minPrice: web3.utils.fromWei(listing.minPrice.toString(), 'ether'),
                highestBid: web3.utils.fromWei(listing.highestBid.toString(), 'ether'),
                status: Number(listing.status),
                auctionEnd: listing.auctionEnd,
                isWinning: listing.highestBidder.toLowerCase() === accounts[0].toLowerCase(),
                secondHighestBid: web3.utils.fromWei(listing.secondHighestBid.toString(), 'ether')
              };
            } catch (error) {
              console.error(`Error fetching listing ${id}:`, error);
              return null;
            }
          })
        );

        console.log('Fetched bid details:', bidDetails);
        
        // Filter out null values and sort by ID
        const validBids = bidDetails
          .filter(bid => bid !== null)
          .sort((a, b) => b.id - a.id);

        setBids(validBids);
      } catch (error) {
        console.error('Error fetching bids:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
    
    // Auto-refresh bids every 30 seconds
    const interval = setInterval(fetchBids, 30000);
    return () => clearInterval(interval);
  }, []);

  // Add debug logging for bids state changes
  useEffect(() => {
    console.log('Current bids state:', bids);
  }, [bids]);

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
          {Number(bid.energyAmount).toFixed(2)} kWh
        </p>
        <p className="text-gray-300">
          <span className="font-semibold text-gray-200">Minimum Price:</span>{' '}
          {Number(bid.minPrice).toFixed(4)} ETH
        </p>
        <p className="text-gray-300">
          <span className="font-semibold text-gray-200">Your Bid:</span>{' '}
          {Number(bid.highestBid).toFixed(4)} ETH
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