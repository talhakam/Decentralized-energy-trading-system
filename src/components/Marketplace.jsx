import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import EnergyTradingABI from './EnergyTradingABI.json';
import { getDatabase, ref, onValue } from 'firebase/database';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { toBlockchainEnergy, fromBlockchainEnergy } from '../utils/energyUtils';

const getFirebaseDatabase = () => {
  try {
    return getDatabase();
  } catch (error) {
    console.error('Error getting Firebase database:', error);
    return null;
  }
};

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

// Define Role enum to match smart contract
const Role = {
  None: 0,
  Prosumer: 1,
  Consumer: 2
};

// Offer Card Component - Display energy offer details
const OfferCard = ({ offer, onClick, onBid, userRole }) => {
  return (
    <div className="bg-card border p-4 rounded-lg mb-4 shadow-md transition duration-300">
      <div className="flex justify-between items-center">
        <div className="cursor-pointer" onClick={() => onClick(offer)}>
          <h3 className="text-xl font-bold">Energy: {Number(offer.energyAmount).toFixed(2)} Wh</h3>
          <p className="font-semibold">Min Price: {Number(offer.minPrice).toFixed(6)} ETH</p>
          <p className="font-semibold">Duration Left: {Math.floor(offer.duration)} mins</p>
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

// Offer Detail Modal Component
const OfferModal = ({ offer, onClose }) => {
  if (!offer) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-card p-6 rounded-lg shadow-lg w-11/12 md:w-1/2 border">
        <h2 className="text-2xl font-bold mb-4">Offer Details</h2>
        <p><strong>Seller Address:</strong> {offer.prosumer}</p>
        <p><strong>Energy:</strong> {offer.energyAmount} Wh</p>
        <p><strong>Price:</strong> {offer.minPrice} ETH</p>
        <p><strong>Auction Duration Left:</strong> {Math.floor(offer.duration)} mins</p>
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

// Bid Modal Component - For placing bids on energy offers
const BidModal = ({ offer, onClose, onSubmit }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [validationError, setValidationError] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!bidAmount || isNaN(bidAmount) || parseFloat(bidAmount) <= 0) {
      setValidationError('Please enter a valid bid amount');
      return;
    }

    if (parseFloat(bidAmount) < parseFloat(offer.minPrice)) {
      setValidationError(`Bid must be at least ${offer.minPrice} ETH`);
      return;
    }

    onSubmit(offer.id, bidAmount);
    onClose();
  };

  if (!offer) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <div className="bg-card p-8 rounded-lg shadow-xl w-11/12 md:w-1/2 border">
        <h2 className="text-2xl font-bold mb-6">Place Bid</h2>
        
        {/* Offer Details Section */}
        <div className="mb-6 space-y-2 border-b pb-6">
          <p><span className="font-bold">Listing ID:</span> {offer.id}</p>
          <p><span className="font-bold">Seller:</span> {offer.prosumer}</p>
          <p><span className="font-bold">Energy Amount:</span> {offer.energyAmount} Wh</p>
          <p><span className="font-bold">Minimum Price:</span> {offer.minPrice} ETH</p>
          <p><span className="font-bold">Time Remaining:</span> {Math.floor(offer.duration)} mins</p>
        </div>
        
        {/* Bid Form Section */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="bidAmount" className="block text-sm font-medium mb-2">
              Your Bid Amount (ETH)
            </label>
            <input
              id="bidAmount"
              type="number"
              step="0.000001"
              min={offer.minPrice}
              placeholder={`Minimum ${offer.minPrice} ETH`}
              value={bidAmount}
              onChange={(e) => {
                setBidAmount(e.target.value);
                setValidationError('');
              }}
              className="w-full p-3 bg-background border rounded-md placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />
            {validationError && (
              <p className="text-red-500 text-sm mt-1">{validationError}</p>
            )}
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

// Custom Toast notification component for better UI
const NotificationToast = {
  success: (message) => toast.success(message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    className: "bg-green-600",
  }),
  error: (message) => toast.error(message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    className: "bg-red-600",
  }),
  info: (message) => toast.info(message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    className: "bg-blue-600",
  })
};

// PostOffer Component - For posting new energy offers using postEnergy()
const PostOffer = ({ onPost, triggerRefresh }) => {
  const [pricePerKWh, setPricePerKWh] = useState('');
  const [energyAvailable, setEnergyAvailable] = useState('');
  const [auctionDuration, setAuctionDuration] = useState('');
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableEnergy, setAvailableEnergy] = useState(0);

  // Initialize Web3, Contract and check available energy in Firebase
useEffect(() => {
  const initWeb3 = async () => {
    if (window.ethereum) {
      try {
        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3.eth.getAccounts();
        setAccount(accounts[0]);
        const energyTradingContract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
        setContract(energyTradingContract);
        
        // Get prosumer hardware ID from blockchain
        const hardwareId = await energyTradingContract.methods.getUserHardwareId(accounts[0]).call();
        console.log(`Retrieved hardware ID from blockchain: ${hardwareId}`);
        
        // If the hardware ID is empty or not found, try using from localStorage
        const hardwareIdToUse = hardwareId || localStorage.getItem('hardwareId') || "HardwareID_101";
        
        // Listen for changes to the prosumer's available energy
        const database = getFirebaseDatabase();
        if (database) {
          const energyRef = ref(database, `${hardwareId}/Prosumer/EnergyAvailable`);
          onValue(energyRef, (snapshot) => {
            const energy = snapshot.val() || 0;
            setAvailableEnergy(parseFloat(energy));
            console.log(`Available energy for prosumer: ${energy} Wh`);
          });
        } else {
          NotificationToast.error('Failed to connect to Firebase database.');
        }
        
      } catch (error) {
        console.error('Error initializing Web3:', error);
        NotificationToast.error('Failed to connect to MetaMask. Please make sure it is installed and unlocked.');
      }
    } else {
      NotificationToast.error('MetaMask is not installed. Please install it to use this feature.');
    }
  };
  initWeb3();
}, []);

  // Handle Post Offer Submission
  const handlePost = async (event) => {
    event.preventDefault();
    setLoading(true);

    if (!contract || !account) {
      NotificationToast.error('Contract or account not initialized. Please connect to MetaMask.');
      setLoading(false);
      return;
    }

    // Check if the prosumer has enough energy to sell
    if (parseFloat(energyAvailable) > availableEnergy) {
      NotificationToast.error(`Not enough energy available. You have ${availableEnergy.toFixed(2)} Wh available.`);
      setLoading(false);
      return;
    }

    try {
      // Use toBlockchainEnergy to convert float to scaled integer
      const scaledEnergy = toBlockchainEnergy(energyAvailable);
      console.log(`Converting ${energyAvailable} Wh to ${scaledEnergy} (scaled) for blockchain`);
      
      await contract.methods.postEnergy(
        scaledEnergy,
        Web3.utils.toWei(pricePerKWh, 'ether'),
        auctionDuration * 60  // Convert minutes to seconds
      ).send({ from: account });

      NotificationToast.success('Energy offer posted successfully!');
      
      // Immediately add the new offer to the list - use original float value for display
      onPost({
        energyAmount: parseFloat(energyAvailable),
        minPrice: pricePerKWh,
        duration: auctionDuration,
        prosumer: account
      });
      
      // Trigger a refresh of offers to ensure all clients see the latest data
      if (triggerRefresh) {
        triggerRefresh();
      }

      // Clear form fields
      setPricePerKWh('');
      setEnergyAvailable('');
      setAuctionDuration('');
    } catch (error) {
      console.error('Error posting offer:', error);
      NotificationToast.error('Failed to post offer: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePost} className="form space-y-4 p-6 border rounded-lg shadow-md bg-card mb-8">
      <h2 className="text-xl font-bold">Post a New Energy Offer</h2>
      
      <div>
        <label className="block text-sm font-medium mb-1">
          Minimum Price (ETH)
        </label>
        <input
          type="number"
          step="0.000001"
          placeholder="Min price in ETH"
          value={pricePerKWh}
          onChange={(e) => setPricePerKWh(e.target.value)}
          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-green-600 bg-background"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">
          Energy Available (Wh)
        </label>
        <input
          type="number"
          step="0.001"
          placeholder="Amount of energy to sell"
          value={energyAvailable}
          onChange={(e) => setEnergyAvailable(e.target.value)}
          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-green-600 bg-background"
          required
        />
        <p className="text-sm text-gray-400 mt-1">Available to sell: {availableEnergy.toFixed(2)} Wh</p>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">
          Auction Duration (minutes)
        </label>
        <input
          type="number"
          placeholder="Duration of the auction"
          value={auctionDuration}
          onChange={(e) => setAuctionDuration(e.target.value)}
          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-green-600 bg-background"
          required
        />
      </div>
      
      <button 
        type="submit"
        className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition duration-300"
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Post Offer'}
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
  const [refreshTrigger, setRefreshTrigger] = useState(0); // New state to trigger refreshes

  // Debug logging
  useEffect(() => {
    console.log('Current user role in Marketplace:', userRole);
    console.log('Can post offers?', userRole === Role.Prosumer);
    console.log('Can place bids?', userRole === Role.Consumer);
  }, [userRole]);

  // Function to trigger a refresh of offers
  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Fetch Active Offers from Smart Contract when refreshTrigger changes
  useEffect(() => {
    fetchAndUpdateOffers();
    const intervalId = setInterval(fetchAndUpdateOffers, 60000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [refreshTrigger]);

  const placeBid = async (listingId, bidAmount) => {
    if (!window.ethereum) {
      NotificationToast.error("Please install MetaMask!");
      return;
    }

    try {
      setLoading(true);
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);

      // Convert bid amount to wei
      const bidInWei = web3.utils.toWei(bidAmount.toString(), 'ether');

      // Get listing details to check minimum price
      const listing = await contract.methods.listings(listingId).call();
      const minPrice = listing.minPrice;

      if (web3.utils.toBN(bidInWei).lt(web3.utils.toBN(minPrice))) {
        NotificationToast.error('Bid amount must be greater than or equal to the minimum price');
        return;
      }

      // Estimate gas before sending transaction
      const gas = await contract.methods.placeBid(listingId).estimateGas({
        from: accounts[0],
        value: bidInWei
      });

      // Send transaction with estimated gas
      await contract.methods.placeBid(listingId).send({
        from: accounts[0],
        value: bidInWei,
        gas: Math.round(gas * 1.2) // Add 20% buffer to gas estimate
      });

      NotificationToast.success('Bid placed successfully!');
      triggerRefresh();
    } catch (error) {
      console.error('Error placing bid:', error);
      const errorMessage = error.message.includes('revert') 
        ? 'Transaction reverted: Bid might be too low or auction ended'
        : 'Failed to place bid. Please check your wallet and try again.';
      NotificationToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchAndUpdateOffers = async () => {
    if (!window.ethereum) {
      console.error("MetaMask is not installed.");
      NotificationToast.error("MetaMask is not installed. Please install it to use this feature.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
  
      // Call the getAllActiveOffers function from the smart contract
      const activeOffers = await contract.methods.getAllActiveOffers().call();
      console.log("Active Offers from Contract:", activeOffers);
  
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  
      // Format and filter the active offers for the frontend
      const formattedOffers = activeOffers
        .map((offer) => {
          // Use fromBlockchainEnergy to convert from scaled integer to float
          const rawEnergyAmount = Number(offer.energyAmount);
          const energyAmount = fromBlockchainEnergy(rawEnergyAmount);
          console.log(`Converting blockchain energy ${rawEnergyAmount} to display value: ${energyAmount} kWh`);
          
          return {
            id: Number(offer.id),
            prosumer: offer.prosumer,
            energyAmount: energyAmount,
            minPrice: Number(web3.utils.fromWei(String(offer.minPrice), "ether")),
            duration: Math.max(0, (Number(offer.auctionEnd) - currentTime) / 60),
            status: Number(offer.status),
            auctionEnd: Number(offer.auctionEnd)
          };
        })
        .filter(offer => 
          offer.status === 0 && // Status is "Open"
          offer.auctionEnd > currentTime // Auction hasn't ended
        );
  
      console.log("Formatted Offers:", formattedOffers);
      setOffers(formattedOffers);
    } catch (error) {
      console.error("Error fetching active offers:", error);
      NotificationToast.error("Error fetching active offers. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Listen for blockchain events to update offers
  useEffect(() => {
    const setupContractEvents = async () => {
      if (!window.ethereum) return;

      try {
        const web3 = new Web3(window.ethereum);
        const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);

        // Listen for energy listing edited events
        contract.events.EnergyListingEdited({})
          .on('data', (event) => {
            console.log('Energy listing edited event:', event);
            triggerRefresh(); // Refresh offers when a listing is edited
          })
          .on('error', (error) => {
            console.error('Error in EnergyListingEdited event:', error);
          });

        // Listen for new energy posted events
        contract.events.EnergyPosted({})
          .on('data', (event) => {
            console.log('Energy posted event:', event);
            triggerRefresh(); // Refresh offers when new listing is posted
          })
          .on('error', (error) => {
            console.error('Error in EnergyPosted event:', error);
          });
          
        // Listen for deleted energy listing events
        contract.events.EnergyListingDeleted({})
          .on('data', (event) => {
            console.log('Energy listing deleted event:', event);
            triggerRefresh(); // Refresh offers when a listing is deleted
          })
          .on('error', (error) => {
            console.error('Error in EnergyListingDeleted event:', error);
          });
      } catch (error) {
        console.error('Error setting up contract events:', error);
      }
    };
    setupContractEvents();
  }, []);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-4">Energy Marketplace</h1>
      
      {userRole === Role.Prosumer && (
        <PostOffer 
          onPost={(newOffer) => setOffers(prevOffers => [...prevOffers, newOffer])} 
          triggerRefresh={triggerRefresh}
        />
      )}
      
      <div>
        <h2 className="text-2xl font-bold mb-2">Active Offers:</h2>
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : offers.length === 0 ? (
          <div className="bg-card border p-4 rounded-lg mb-4 shadow-md text-center">
            <p>No active offers available.</p>
            {userRole === Role.Prosumer && (
              <p className="mt-2">Create an offer to start selling your energy!</p>
            )}
            {userRole === Role.Consumer && (
              <p className="mt-2">Check back later for new energy offers from prosumers.</p>
            )}
          </div>
        ) : (
          <div>
            {offers.map((offer, index) => (
              <OfferCard 
                key={index} 
                offer={offer} 
                onClick={() => setSelectedOffer(offer)} 
                onBid={() => setBidOffer(offer)}
                userRole={userRole}
              />
            ))}
          </div>
        )}
      </div>
      
      {selectedOffer && (
        <OfferModal offer={selectedOffer} onClose={() => setSelectedOffer(null)} />
      )}
      
      {bidOffer && (
        <BidModal 
          offer={bidOffer} 
          onClose={() => setBidOffer(null)}
          onSubmit={placeBid}
        />
      )}
      
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
};

export default Marketplace;