import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import EnergyTradingABI from './EnergyTradingABI.json'; // Import your ABI file

const CONTRACT_ADDRESS = '0x0884b03ef2885919327F0F77Eb36044B549501bf';

// OfferCard Component - Displays each offer's details and triggers modal on click
const OfferCard = ({ offer, onClick }) => {
  return (
    <div
      className="bg-card border p-4 rounded-lg mb-4 shadow-md transition duration-300 hover:shadow-lg cursor-pointer"
      onClick={() => onClick(offer)}
    >
      <h3 className="text-xl font-bold">Energy: {offer.energyAmount} kWh</h3>
      <p className="font-semibold">Price: {offer.minPrice} ETH</p>
      <p className="font-semibold">Duration Left: {offer.duration} mins</p>
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
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);

  // Initialize Web3 and contract once
  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        await window.ethereum.enable();
        const contractInstance = new web3Instance.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
        setWeb3(web3Instance);
        setContract(contractInstance);
      } else {
        console.error('MetaMask is not installed.');
      }
    };
    initWeb3();
  }, []);

  // Fetch Active Offers from Smart Contract
  useEffect(() => {
    fetchAndUpdateOffers();
}, []);

const fetchAndUpdateOffers = async () => {
  if (!window.ethereum) {
    console.error("MetaMask is not installed.");
    return;
  }

  const web3 = new Web3(window.ethereum);
  const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);

  try {
    const activeOffers = await contract.methods.getAllActiveOffers().call(); // ✅ Correct function

    const formattedOffers = activeOffers.map((offer) => ({
      id: Number(offer.id), // ✅ Convert BigInt to Number
      prosumer: offer.prosumer,
      energyAmount: web3.utils.fromWei(String(offer.energyAmount), "ether"), // ✅ Ensure it's a string before conversion
      minPrice: web3.utils.fromWei(String(offer.minPrice), "ether"), // ✅ Convert BigInt safely
      duration: Math.max(
        0,
        Math.floor(Number(offer.auctionEnd) - Date.now() / 1000) / 60
      ), // ✅ Convert BigInt to Number before subtraction
    }));

    setOffers(formattedOffers);
  } catch (error) {
    console.error("Error fetching offers:", error);
  } finally {
    setLoading(false);
  }
};




return (
  <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-4">Energy Marketplace</h1>
      {userRole === 'prosumer' && <PostOffer onPost={(newOffer) => setOffers(prevOffers => [...prevOffers, newOffer])} />}
      
      <div>
          <h2 className="text-2xl font-bold mb-2">Active Offers:</h2>
          {loading ? (
              <p>Loading offers...</p>
          ) : offers.length === 0 ? (
              <p>No active offers available.</p>
          ) : (
              offers.map((offer, index) => (
                  <OfferCard key={index} offer={offer} onClick={() => setSelectedOffer(offer)} />
              ))
          )}
      </div>
      <OfferModal offer={selectedOffer} onClose={() => setSelectedOffer(null)} />
  </div>
);
};

export default Marketplace;
