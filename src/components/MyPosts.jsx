import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import EditOffer from './EditOffer';
import EnergyTradingABI from './EnergyTradingABI.json'; // Import your ABI file

const CONTRACT_ADDRESS = '0x0884b03ef2885919327F0F77Eb36044B549501bf';

const MyPosts = () => {
  const [myOffers, setMyOffers] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);

  useEffect(() => {
    
    const fetchMyPosts = async () => {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }
    
      const web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const accounts = await web3.eth.getAccounts();
      setCurrentAccount(accounts[0]); // Store the current account
    
      const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
    
      try {
        setLoading(true);
    
        // Call the Solidity function with the current user's address
        const myPosts = await contract.methods.getMyPosts(accounts[0]).call();
    
        console.log("Raw myPosts response:", myPosts); // Debugging log
    
        // Ensure the response is an array before proceeding
        if (!Array.isArray(myPosts)) {
          console.error("Unexpected response from getMyPosts:", myPosts);
          setMyOffers([]);
          return;
        }
    
        // Map each post to a structured object
        const formattedPosts = myPosts.map((post, index) => ({
          id: Number(post[0]), // Convert BigInt to Number
          prosumer: post[1], // Prosumer address
          energyAvailable: Number(post[2]), // Convert BigInt to Number
          pricePerMwh: web3.utils.fromWei(post[3].toString(), "ether"), // Convert from Wei
          status: post[10] ? "Finalized" : "Active", // Boolean -> "Finalized" or "Active"
        }));
    
        setMyOffers(formattedPosts);
      } catch (error) {
        console.error("Error fetching my posts:", error);
        setMyOffers([]); // Reset UI to prevent crashes
      } finally {
        setLoading(false);
      }
    };
    
    
    fetchMyPosts();
  }, []);

  const handleEdit = (offer) => {
    setEditingOffer(offer);
  };

  const handleSave = async (updatedOffer) => {
    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
      setLoading(true);
      await contract.methods
        .editEnergyListing(
          updatedOffer.id,
          updatedOffer.title,
          updatedOffer.description,
          Web3.utils.toWei(updatedOffer.pricePerMwh, 'ether'),
          Web3.utils.toWei(updatedOffer.energyAvailable, 'ether')
        )
        .send({ from: currentAccount });

      // Update UI
      setMyOffers((prevOffers) =>
        prevOffers.map((offer) => (offer.id === updatedOffer.id ? updatedOffer : offer))
      );
      setEditingOffer(null);
    } catch (error) {
      console.error('Error updating offer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
  
    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const accounts = await web3.eth.getAccounts();
    
    if (!accounts.length) {
      alert("No accounts found. Please connect MetaMask.");
      return;
    }
  
    const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
  
    try {
      setLoading(true);
      console.log("Attempting to delete listing with ID:", id);
  
      // Find the listing to check its status
      const listing = myOffers.find((offer) => offer.id === id);
      if (!listing) {
        alert("Listing not found!");
        return;
      }
      console.log("Listing being checked for deletion:", listing);
      console.log("Listing status:", listing.status);

      // Ensure status is "Open" before deleting
      if (listing.status !== "Active") {  // Open = 0 as per Solidity Enum
        alert("Cannot delete a closed, completed, or canceled listing!");
        return;
      }
  
      // Call deleteEnergyListing on the contract
      await contract.methods.deleteEnergyListing(id).send({
        from: accounts[0], 
        gas: 500000,
      });
  
      // Remove the deleted offer from UI
      setMyOffers((prevOffers) => prevOffers.filter((offer) => offer.id !== id));
  
      alert("Offer deleted successfully!");
    } catch (error) {
      console.error("Error deleting offer:", error);
      alert(`Error: ${error.message || "Transaction failed"}`);
    } finally {
      setLoading(false);
    }
  };
  
  

  const handleFinalizeTrade = async (offerId) => {
    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
      setLoading(true);
      await contract.methods.finalizeTrade(offerId).send({ from: currentAccount });

      setMyOffers((prevOffers) =>
        prevOffers.map((offer) =>
          offer.id === offerId ? { ...offer, status: 'Finalized' } : offer
        )
      );
    } catch (error) {
      console.error('Error finalizing trade:', error);
    } finally {
      setLoading(false);
    }
  };

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
          {myOffers.length === 0 ? (
            <p>You have not posted anything yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myOffers.map((offer, index) => (
                <div key={index} className="bg-card border p-4 rounded-lg mb-4 shadow-md">
                  <h3 className="text-xl font-bold">{offer.title}</h3>
                  <p>{offer.description}</p>
                  <p>Price: ${offer.pricePerMwh} / MWh</p>
                  <p>Energy Available: {offer.energyAvailable} kWh</p>
                  <p>Status: {offer.status}</p>
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
                  <button
                    onClick={() => handleFinalizeTrade(offer.id)}
                    className="mt-2 w-full bg-green-500 text-white p-2 rounded-md"
                  >
                    Finalize Trade
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyPosts;
