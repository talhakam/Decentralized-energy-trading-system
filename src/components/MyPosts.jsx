import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import EditOffer from './EditOffer';
import EnergyTradingABI from './EnergyTradingABI.json'; // Import your ABI file

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

const MyPosts = () => {
  const [myOffers, setMyOffers] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewingOffer, setViewingOffer] = useState(null); // State for viewing completed offer details

  useEffect(() => {
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

        const formattedPosts = myPosts.map((post) => ({
          id: Number(post.id),
          prosumer: post.prosumer,
          energyAvailable: Number(post.energyAmount), // Use energyAmount directly as it is already in kWh
          pricePerMwh: Number(web3.utils.fromWei(post.minPrice.toString(), "ether")), // Price in ETH
          auctionEnd: Number(post.auctionEnd),
          highestBid: post.highestBid > 0 
            ? Number(web3.utils.fromWei(post.highestBid.toString(), "ether")).toFixed(4) 
            : "None", // Include highest bid or "None" if no bids
          status: mapTradeStatus(post.status, Number(post.auctionEnd)), // Pass auctionEnd to mapTradeStatus
        }));

        setMyOffers(formattedPosts);
      } catch (error) {
        console.error("Error fetching my posts:", error);
        setMyOffers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyPosts();
  }, []);

  // Helper function to map TradeStatus enum to human-readable status
  const mapTradeStatus = (status, auctionEnd) => {
    const currentTime = Date.now() / 1000; // Current time in seconds
  if (Number(status) === 0 && auctionEnd <= currentTime) {
    return "Expired"; // Override "Active" status if auction has ended
  }

    switch (Number(status)) {
      case 0:
        return "Active";
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
  };

  // Function to handle editing an offer
  const handleEdit = (offer) => {
    setEditingOffer(offer);
  };

  // Function to handle saving an edited offer
  const handleSave = async (updatedOffer) => {
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

      await contract.methods
        .editEnergyPost(
          updatedOffer.id,
          updatedOffer.energyAvailable,
          web3.utils.toWei(updatedOffer.pricePerMwh, "ether"),
          updatedOffer.auctionEnd
        )
        .send({
          from: accounts[0],
          gas: 500000,
        });

      setMyOffers((prevOffers) =>
        prevOffers.map((offer) =>
          offer.id === updatedOffer.id ? { ...offer, ...updatedOffer } : offer
        )
      );

      alert("Offer updated successfully!");
      setEditingOffer(null);
    } catch (error) {
      console.error("Error saving updated offer:", error);
      alert(`Error: ${error.message || "Transaction failed"}`);
    } finally {
      setLoading(false);
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

      setMyOffers((prevOffers) => prevOffers.filter((offer) => offer.id !== id));

      alert("Offer deleted successfully!");
    } catch (error) {
      console.error("Error deleting offer:", error);
      alert(`Error: ${error.message || "Transaction failed"}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle finalizing a trade
  const handleFinalizeTrade = async (offerId) => {
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

      await contract.methods.finalizeTrade(offerId).send({
        from: accounts[0],
        gas: 500000,
      });

      setMyOffers((prevOffers) =>
        prevOffers.map((offer) =>
          offer.id === offerId ? { ...offer, status: "Completed" } : offer
        )
      );

      alert("Trade finalized successfully!");
    } catch (error) {
      console.error("Error finalizing trade:", error);
      alert(`Error: ${error.message || "Transaction failed"}`);
    } finally {
      setLoading(false);
    }
  };

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
      setViewingOffer({
        id: Number(listing.id),
        prosumer: listing.prosumer,
        buyer: listing.highestBidder,
        energyAmount: Number(listing.energyAmount), // Use energyAmount directly as it is already in kWh
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
  // Update the CompletedPostModal component
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
              <p className="text-white font-semibold">{Number(offer.energyAmount).toFixed(2)} kWh</p>
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

  // Separate active and expired posts
  const activePosts = myOffers.filter(
    (offer) => offer.status === "Active" && offer.auctionEnd > Date.now() / 1000
  );

  const expiredPosts = myOffers.filter(
    (offer) => offer.status !== "Active" || offer.auctionEnd <= Date.now() / 1000
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
                  <p>Price: {Number(offer.pricePerMwh).toFixed(4)} ETH</p> {/* Ensure pricePerMwh is a number */}
                  <p>Energy Available: {Number(offer.energyAvailable).toFixed(2)} kWh</p> {/* Ensure energyAvailable is a number */}
                  <p>Auction Ends: {new Date(offer.auctionEnd * 1000).toLocaleString()}</p>
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
                </div>
              ))}
            </div>
          )}

          <h2 className="text-2xl font-bold mt-8 mb-4">Expired Posts</h2>
          {expiredPosts.length === 0 ? (
            <p>No expired posts available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {expiredPosts.map((offer, index) => (
                <div key={index} className="bg-card border p-4 rounded-lg mb-4 shadow-md">
                  <h3 className="text-xl font-bold">Listing #{offer.id}</h3>
                  <p>Price: {offer.pricePerMwh} ETH / MWh</p>
                  <p>Energy Available: {offer.energyAvailable} kWh</p>
                  <p>Highest Bid: {offer.highestBid} ETH</p> {/* Display highest bid */}
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