import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import EnergyTradingABI from './EnergyTradingABI.json'; // Import your ABI file

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

// Define Role enum to match smart contract
const Role = {
  None: 0,
  Prosumer: 1,
  Consumer: 2
};


// Modify the OfferCard component
const OfferCard = ({ offer, onClick, onBid, userRole }) => {
  // Remove string conversion since userRole is now a number
  console.log('OfferCard userRole:', userRole); // Debug log
  
  return (
    <div className="bg-card border p-4 rounded-lg mb-4 shadow-md transition duration-300">
      <div className="flex justify-between items-center">
        <div className="cursor-pointer" onClick={() => onClick(offer)}>
          <h3 className="text-xl font-bold">Energy: {offer.energyAmount} kWh</h3>
          <p className="font-semibold">Price: {offer.minPrice} ETH</p>
          <p className="font-semibold">Duration Left: {offer.duration} mins</p>
        </div>
        {userRole === Role.Consumer && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBid(offer);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition duration-300"
          >
            Place Bid
          </button>
        )}
      </div>
    </div>
  );
};


// Modal Component - Shows detailed info of the selected offer
const OfferModal = ({ offer, onClose }) => {
  if (!offer) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 md:w-1/2">
        <h2 className="text-2xl font-bold mb-4">Offer Details</h2>
        <p><strong>Seller Address:</strong> {offer.prosumer}</p>
        <p><strong>Energy:</strong> {offer.energyAmount} kWh</p>
        <p><strong>Price:</strong> {offer.minPrice} ETH</p>
        <p><strong>Auction Duration Left:</strong> {offer.duration} mins</p>
        <p><strong>Listing ID:</strong> {offer.id}</p>
        <button
          onClick={onClose}
          className="mt-4 bg-red-600 text-white p-2 rounded-md hover:bg-red-700 transition duration-300"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const BidModal = ({ offer, onClose, onSubmit }) => {
  const [bidAmount, setBidAmount] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(offer.id, bidAmount);
    onClose();
  };

  if (!offer) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-gray-900 p-8 rounded-lg shadow-xl w-11/12 md:w-1/2 border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-white">Place Bid</h2>
        
        {/* Offer Details Section */}
        <div className="mb-6 space-y-2 border-b border-gray-700 pb-6">
          <p className="text-gray-300"><span className="font-bold text-white">Listing ID:</span> {offer.id}</p>
          <p className="text-gray-300"><span className="font-bold text-white">Seller:</span> {offer.prosumer}</p>
          <p className="text-gray-300"><span className="font-bold text-white">Energy Amount:</span> {offer.energyAmount} kWh</p>
          <p className="text-gray-300"><span className="font-bold text-white">Minimum Price:</span> {offer.minPrice} ETH</p>
          <p className="text-gray-300"><span className="font-bold text-white">Time Remaining:</span> {offer.duration} mins</p>
        </div>
        
        {/* Bid Form Section */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-300 mb-2">
              Your Bid Amount (ETH)
            </label>
            <input
              id="bidAmount"
              type="number"
              step="0.000001"
              placeholder="Enter bid amount"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition duration-300"
            >
              Submit Bid
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 text-white py-3 px-4 rounded-md hover:bg-gray-600 transition duration-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// PostOffer Component - For posting new energy offers using postEnergy()
const PostOffer = ({ onPost }) => {
  const [pricePerMWh, setPricePerMWh] = useState('');
  const [energyAvailable, setEnergyAvailable] = useState('');
  const [auctionDuration, setAuctionDuration] = useState('');
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);

  // Initialize Web3 and Contract
  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        await window.ethereum.enable();
        const accounts = await web3.eth.getAccounts();
        setAccount(accounts[0]);
        const energyTradingContract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
        setContract(energyTradingContract);
      } else {
        console.error('MetaMask is not installed.');
      }
    };
    initWeb3();
  }, []);

  // Handle Post Offer Submission
  const handlePost = async (event) => {
    event.preventDefault();

    if (!contract || !account) {
      alert('Contract or account not initialized');
      return;
    }

    try {
      await contract.methods.postEnergy(
        energyAvailable,
        Web3.utils.toWei(pricePerMWh, 'ether'),
        auctionDuration * 60  // Convert minutes to seconds
      ).send({ from: account });

      alert('Energy offer posted successfully!');
      
      
      // Immediately add the new offer to the list
      onPost({
        energyAmount: energyAvailable,
        minPrice: pricePerMWh,
        duration: auctionDuration,
        prosumer: account
      });

      // Clear form fields
      setPricePerMWh('');
      setEnergyAvailable('');
      setAuctionDuration('');
    } catch (error) {
      console.error('Error posting offer:', error);
      alert('Failed to post offer.');
    }
  };

  return (
    <form onSubmit={handlePost} className="form space-y-4 p-6 border rounded-lg shadow-md">
      <h2 className="text-xl font-bold">Post a New Energy Offer</h2>
      <input
        type="number"
        placeholder="Price per MWh (ETH)"
        value={pricePerMWh}
        onChange={(e) => setPricePerMWh(e.target.value)}
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-green-600"
        required
      />
      <input
        type="number"
        placeholder="Energy Available (in kWh)"
        value={energyAvailable}
        onChange={(e) => setEnergyAvailable(e.target.value)}
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-green-600"
        required
      />
      <input
        type="number"
        placeholder="Auction Duration (in minutes)"
        value={auctionDuration}
        onChange={(e) => setAuctionDuration(e.target.value)}
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-green-600"
        required
      />
      <button type="submit" className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition duration-300">
        Post Offer
      </button>
    </form>
  );
};

// Main Marketplace Component
const Marketplace = ({ userRole }) => {
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bidOffer, setBidOffer] = useState(null);

  
 // Debug logging
 useEffect(() => {
  console.log('Current user role in Marketplace:', userRole);
  console.log('Can post offers?', userRole === Role.Prosumer);
  console.log('Can place bids?', userRole === Role.Consumer);
}, [userRole]);

  // Fetch Active Offers from Smart Contract
  useEffect(() => {
    fetchAndUpdateOffers();
  }, []);

  const placeBid = async (listingId, bidAmount) => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);

      await contract.methods.placeBid(listingId).send({
        from: accounts[0],
        value: web3.utils.toWei(bidAmount, 'ether')
      });

      alert('Bid placed successfully!');
      fetchAndUpdateOffers(); // Refresh the offers list
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('Failed to place bid: ' + error.message);
    }
  };

  const fetchAndUpdateOffers = async () => {
    if (!window.ethereum) {
      console.error("MetaMask is not installed.");
      return;
    }
  
    const web3 = new Web3(window.ethereum);
    const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
  
    try {
      // Call the getAllActiveOffers function from the smart contract
      const activeOffers = await contract.methods.getAllActiveOffers().call();
      console.log("Active Offers from Contract:", activeOffers); // Debugging log
  
      // Format the active offers for the frontend
      const formattedOffers = activeOffers.map((offer) => ({
        id: Number(offer.id),
        prosumer: offer.prosumer,
        energyAmount: web3.utils.fromWei(String(offer.energyAmount), "ether"),
        minPrice: web3.utils.fromWei(String(offer.minPrice), "ether"),
        duration: Math.max(0, Math.floor(Number(offer.auctionEnd) - Date.now() / 1000) / 60), // Convert seconds to minutes
      }));
      console.log("Formatted Offers:", formattedOffers); // Debugging log
  
      setOffers(formattedOffers);
    } catch (error) {
      console.error("Error fetching active offers:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-4">Energy Marketplace</h1>
      {userRole === Role.Prosumer && (
        <PostOffer 
          onPost={(newOffer) => setOffers(prevOffers => [...prevOffers, newOffer])} 
        />
      )}
      
      <div>
        <h2 className="text-2xl font-bold mb-2">Active Offers:</h2>
        {loading ? (
          <p>Loading offers...</p>
        ) : offers.length === 0 ? (
          <p>No active offers available.</p>
        ) : (
          offers.map((offer, index) => (
            <OfferCard 
              key={index} 
              offer={offer} 
              onClick={() => setSelectedOffer(offer)}
              onBid={() => setBidOffer(offer)}
              userRole={userRole} // Pass userRole directly instead of userRoleFromContract
            />
          ))
        )}
      </div>
      <OfferModal offer={selectedOffer} onClose={() => setSelectedOffer(null)} />
      <BidModal 
        offer={bidOffer} 
        onClose={() => setBidOffer(null)}
        onSubmit={placeBid}
      />
    </div>
  );
};

export default Marketplace;