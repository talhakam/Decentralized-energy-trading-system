import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import EditOffer from './EditOffer';
import EnergyTradingABI from './EnergyTradingABI.json'; // Import your ABI file
import { fromBlockchainEnergy, toBlockchainEnergy } from '../utils/energyUtils';
import { handleEnergyTransfer } from '../utils/energyTransfer';
import { toast } from 'react-toastify';

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

const MyPosts = () => {
  const [myOffers, setMyOffers] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewingOffer, setViewingOffer] = useState(null); // State for viewing completed offer details
  const [refreshTrigger, setRefreshTrigger] = useState(0); // New state to trigger refreshes

  // Fetch posts whenever refreshTrigger changes
  useEffect(() => {
    fetchMyPosts();
  }, [refreshTrigger]);

  const fetchMyPosts = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const accounts = await web3.eth.getAccounts();

    const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);

    try {
      setLoading(true);

      const myPosts = await contract.methods.getMyPosts(accounts[0]).call();
      console.log("Raw posts from blockchain:", myPosts);

      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      console.log("Current time:", currentTime);

      const formattedPosts = myPosts.map((post) => {
        // Apply the scaling factor to convert from blockchain integer to display float
        const rawEnergy = Number(post.energyAmount);
        const displayEnergy = fromBlockchainEnergy(rawEnergy);
        
        // Calculate auction end time and log it for debugging
        const auctionEnd = Number(post.auctionEnd);
        console.log(`Post ID ${post.id}: Auction End Time: ${auctionEnd}, Current Time: ${currentTime}`);
        console.log(`Time remaining: ${(auctionEnd - currentTime) / 60} minutes`);
        
        // Compute status with detailed logging
        const status = mapTradeStatus(Number(post.status), auctionEnd, currentTime);
        console.log(`Post ID ${post.id}: Computed Status: ${status}`);
        
        return {
          id: Number(post.id),
          prosumer: post.prosumer,
          energyAvailable: displayEnergy, // Converted from blockchain format
          pricePerMwh: Number(web3.utils.fromWei(post.minPrice.toString(), "ether")), // Price in ETH
          auctionEnd: auctionEnd,
          auctionDuration: Math.max(0, Math.round((auctionEnd - currentTime) / 60)), // Calculate duration in minutes
          highestBid: post.highestBid > 0 
            ? Number(web3.utils.fromWei(post.highestBid.toString(), "ether")).toFixed(4) 
            : "None", // Include highest bid or "None" if no bids
          status: status,
          rawStatus: Number(post.status) // Store the raw status for debugging
        };
      });

      console.log("Formatted posts:", formattedPosts);
      setMyOffers(formattedPosts);
    } catch (error) {
      console.error("Error fetching my posts:", error);
      setMyOffers([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to map TradeStatus enum to human-readable status
  const mapTradeStatus = (status, auctionEnd, currentTime) => {
    console.log(`Mapping status: ${status}, auctionEnd: ${auctionEnd}, currentTime: ${currentTime}`);
    
    // If the status is not "Open" (0), return the appropriate status
    if (status !== 0) {
      switch (status) {
        case 1:
          return "In Progress";
        case 2:
          return "Completed";
        case 3:
          return "Disputed";
        case 4:
          return "Canceled";
        default:
          return "Unknown";
      }
    }
    
    // If status is "Open" (0), check if it's expired
    if (auctionEnd <= currentTime) {
      console.log(`Auction has ended (${auctionEnd} <= ${currentTime})`);
      return "Expired";
    } else {
      console.log(`Auction is active (${auctionEnd} > ${currentTime})`);
      return "Active";
    }
  };

  // Function to handle editing an offer
  const handleEdit = (offer) => {
    // Make a copy to avoid reference issues
    const offerToEdit = { ...offer };
    console.log("Editing offer:", offerToEdit);
    setEditingOffer(offerToEdit);
  };

  // Function to handle saving an edited offer
  const handleSave = async (updatedOffer, offerId) => {
    if (offerId === null) {
      // This is a delete operation, trigger a refresh
      setRefreshTrigger(prev => prev + 1);
      return;
    }

    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      // We don't need to do the contract call here since it's already done in EditOffer
      // Just update the UI by triggering a refresh after a short delay
      // This gives the blockchain time to process the transaction
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
        console.log("Refreshing after edit");
      }, 2000); // 2 second delay before refresh
      
      // Reset editing state
      setEditingOffer(null);
      
      alert("Offer updated successfully!");
    } catch (error) {
      console.error("Error updating offer display:", error);
      alert(`Error updating display: ${error.message || "Unknown error"}`);
    }
  };

  // Function to handle deleting an offer
  const handleDelete = async (id) => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const accounts = await web3.eth.getAccounts();

    const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);

    try {
      setLoading(true);

      await contract.methods.deleteEnergyPost(id).send({
        from: accounts[0],
        gas: 500000,
      });

      // Trigger a refresh to update the UI
      setRefreshTrigger(prev => prev + 1);
      
      alert("Offer deleted successfully!");
    } catch (error) {
      console.error("Error deleting offer:", error);
      alert(`Error: ${error.message || "Transaction failed"}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle finalizing a trade
  // Updated handleFinalizeTrade function for MyPosts.jsx

const handleFinalizeTrade = async (offerId) => {
  if (!window.ethereum) {
    toast.error("Please install MetaMask!");
    return;
  }

  const web3 = new Web3(window.ethereum);
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const accounts = await web3.eth.getAccounts();
  const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);

  try {
    setLoading(true);
    
    // Get the prosumer's hardware ID from the blockchain
    const prosumerHardwareId = await contract.methods.getUserHardwareId(accounts[0]).call();
    
    if (!prosumerHardwareId) {
      toast.error("Hardware ID not found for your account");
      setLoading(false);
      return;
    }
    
    // Get listing details from the contract
    const listing = await contract.methods.listings(offerId).call();
    
    // Ensure the listing has bids
    if (listing.highestBidder === '0x0000000000000000000000000000000000000000') {
      toast.error("No bids placed on this listing");
      setLoading(false);
      return;
    }
    
    // Convert energy amount from blockchain format to display format
    const energyAmount = fromBlockchainEnergy(Number(listing.energyAmount));
    
    // Finalize the trade on the blockchain
    await contract.methods.finalizeTrade(offerId).send({
      from: accounts[0],
      gas: 500000,
    });
    
    console.log("Trade finalized on blockchain successfully");
    
    // Handle the energy transfer through Firebase
    const transferResult = await handleEnergyTransfer(
      offerId,
      listing.highestBidder,
      energyAmount,
      prosumerHardwareId
    );

    if (transferResult) {
      // Transfer was successfully queued
      toast.success('Trade finalized and energy transfer queued!');
      
      // Wait a moment for the blockchain to update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update local state
      setMyOffers(prevOffers => {
        return prevOffers.map(offer => {
          if (offer.id === offerId) {
            return {
              ...offer,
              status: 2, // Completed status
              highestBid: web3.utils.fromWei(listing.highestBid, 'ether')
            };
          }
          return offer;
        });
      });
      
      // Force a refresh of all posts
      setRefreshTrigger(prev => prev + 1);
    }
  } catch (error) {
    console.error('Error finalizing trade:', error);
    toast.error(`Error: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  // Add this effect to automatically refresh the view when posts update
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchMyPosts();
      }
    }, 10000); // Refresh every 10 seconds
  
    return () => clearInterval(interval);
  }, [loading]);
  

  // Function to fetch details of a completed post
  const handleViewDetails = async (offerId) => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
  
    const web3 = new Web3(window.ethereum);
    const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
  
    try {
      const listing = await contract.methods.listings(offerId).call();
      
      // Convert the energy amount from blockchain format to display format
      const rawEnergy = Number(listing.energyAmount);
      const displayEnergy = fromBlockchainEnergy(rawEnergy);
      
      console.log(`Viewing offer: converting blockchain energy ${rawEnergy} to display value: ${displayEnergy} kWh`);
      
      setViewingOffer({
        id: Number(listing.id),
        prosumer: listing.prosumer,
        buyer: listing.highestBidder,
        energyAmount: displayEnergy, // Converted from blockchain format
        minPrice: Number(web3.utils.fromWei(listing.minPrice.toString(), "ether")), // Price in ETH
        status: Number(listing.status),
        bidAmount: Number(web3.utils.fromWei(listing.highestBid.toString(), "ether")), // Price in ETH
        secondHighestBidder: listing.secondHighestBidder,
        secondHighestBid: Number(web3.utils.fromWei(listing.secondHighestBid.toString(), "ether")), // Price in ETH
        auctionEnd: Number(listing.auctionEnd),
        isScheduled: listing.isScheduled
      });
    } catch (error) {
      console.error("Error fetching completed post details:", error);
      alert("Failed to fetch post details.");
    }
  };

  // Modal component to display completed post details
  const CompletedPostModal = ({ offer, onClose }) => {
    if (!offer) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-md max-h-[80vh] flex flex-col">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">Completed Trade Details</h2>
          </div>

          <div className="overflow-y-auto flex-1 px-6">
            <div className="space-y-4 pb-6">
              <div className="border-b border-gray-700 pb-4">
                <p className="text-gray-400 text-sm">Listing ID</p>
                <p className="text-white font-semibold">#{offer.id}</p>
              </div>

              <div className="border-b border-gray-700 pb-4">
                <p className="text-gray-400 text-sm">Seller Address</p>
                <p className="text-white font-mono text-sm break-all">{offer.prosumer}</p>
              </div>

              <div className="border-b border-gray-700 pb-4">
                <p className="text-gray-400 text-sm">Buyer Address</p>
                <p className="text-white font-mono text-sm break-all">{offer.buyer}</p>
              </div>

              <div className="border-b border-gray-700 pb-4">
                <p className="text-gray-400 text-sm">Energy Amount</p>
                <p className="text-white font-semibold">{Number(offer.energyAmount).toFixed(2)} Wh</p>
              </div>

              <div className="border-b border-gray-700 pb-4">
                <p className="text-gray-400 text-sm">Minimum Price</p>
                <p className="text-white font-semibold">{Number(offer.minPrice).toFixed(4)} ETH</p>
              </div>

              <div className="border-b border-gray-700 pb-4">
                <p className="text-gray-400 text-sm">Winning Bid</p>
                <p className="text-white font-semibold">{Number(offer.bidAmount).toFixed(4)} ETH</p>
              </div>

              <div className="border-b border-gray-700 pb-4">
                <p className="text-gray-400 text-sm">Second Highest Bidder</p>
                <p className="text-white font-mono text-sm break-all">{offer.secondHighestBidder}</p>
              </div>

              <div className="border-b border-gray-700 pb-4">
                <p className="text-gray-400 text-sm">Second Highest Bid</p>
                <p className="text-white font-semibold">{Number(offer.secondHighestBid).toFixed(4)} ETH</p>
              </div>

              <div className="pb-4">
                <p className="text-gray-400 text-sm">Completion Date</p>
                <p className="text-white font-semibold">
                  {new Date(offer.auctionEnd * 1000).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-700">
            <button
              onClick={onClose}
              className="w-full bg-red-600 text-white p-3 rounded-md hover:bg-red-700 transition duration-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Debug component to show raw values for an offer
  const DebugInfo = ({ offer }) => {
    const currentTime = Math.floor(Date.now() / 1000);
    return (
      <div className="mt-2 text-xs text-gray-500">
        <details>
          <summary>Debug Info</summary>
          <p>Raw Status: {offer.rawStatus}</p>
          <p>Auction End: {offer.auctionEnd} ({new Date(offer.auctionEnd * 1000).toLocaleString()})</p>
          <p>Current Time: {currentTime} ({new Date(currentTime * 1000).toLocaleString()})</p>
          <p>Time Left: {offer.auctionEnd - currentTime}s ({(offer.auctionEnd - currentTime) / 60} mins)</p>
        </details>
      </div>
    );
  };

  // Separate active and expired posts
  const activePosts = myOffers.filter(
    (offer) => offer.status === "Active"
  );

  const expiredPosts = myOffers.filter(
    (offer) => offer.status !== "Active"
  );

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-4">My Posts</h1>
      {loading ? (
        <div className="text-center">
          <p>Loading...</p>
        </div>
      ) : editingOffer ? (
        <EditOffer offer={editingOffer} onSave={handleSave} onCancel={() => setEditingOffer(null)} />
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-4">Active Posts</h2>
          {activePosts.length === 0 ? (
            <p>No active posts available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePosts.map((offer, index) => (
                <div key={index} className="bg-card border p-4 rounded-lg mb-4 shadow-md">
                  <h3 className="text-xl font-bold">Listing #{offer.id}</h3>
                  <p>Price: {Number(offer.pricePerMwh).toFixed(4)} ETH</p>
                  <p>Energy Available: {Number(offer.energyAvailable).toFixed(2)} Wh</p>
                  <p>Auction Ends: {new Date(offer.auctionEnd * 1000).toLocaleString()}</p>
                  <p>Time Remaining: {offer.auctionDuration} minutes</p>
                  <button
                    onClick={() => handleEdit(offer)}
                    className="mt-2 w-full bg-yellow-500 text-white p-2 rounded-md"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(offer.id)}
                    className="mt-2 w-full bg-red-600 text-white p-2 rounded-md"
                  >
                    Delete
                  </button>
                  <DebugInfo offer={offer} />
                </div>
              ))}
            </div>
          )}

          <h2 className="text-2xl font-bold mt-8 mb-4">Expired/Completed Posts</h2>
          {expiredPosts.length === 0 ? (
            <p>No expired posts available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {expiredPosts.map((offer, index) => (
                <div key={index} className="bg-card border p-4 rounded-lg mb-4 shadow-md">
                  <h3 className="text-xl font-bold">Listing #{offer.id}</h3>
                  <p>Price: {Number(offer.pricePerMwh).toFixed(4)} ETH</p>
                  <p>Energy Available: {Number(offer.energyAvailable).toFixed(2)} Wh</p>
                  <p>Highest Bid: {offer.highestBid} ETH</p>
                  <p>Status: {offer.status}</p>
                  {offer.status === "Completed" ? (
                    <div className ="flex justify-center">
                    <button
                      onClick={() => handleViewDetails(offer.id)}
                      className="mt-6 w-2/3 bg-green-600 text-white p-3 rounded-md hover:bg-green-700 transition-colors"
                    >
                      View
                    </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleDelete(offer.id)}
                        className="mt-2 w-full bg-red-600 text-white p-2 rounded-md hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleFinalizeTrade(offer.id)}
                        className="mt-2 w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition-colors"
                      >
                        Finalize Trade
                      </button>
                    </>
                  )}
                  <DebugInfo offer={offer} />
                </div>
              ))}
            </div>
          )}
          <CompletedPostModal offer={viewingOffer} onClose={() => setViewingOffer(null)} />
        </div>
      )}
    </div>
  );
};

export default MyPosts;