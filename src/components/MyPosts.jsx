import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import EditOffer from './EditOffer';
import EnergyTradingABI from './EnergyTradingABI.json'; // Import your ABI file

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

const MyPosts = () => {
  const [myOffers, setMyOffers] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);
  const [loading, setLoading] = useState(false);

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
          energyAvailable: Number(post.energyAmount),
          pricePerMwh: web3.utils.fromWei(post.minPrice.toString(), "ether"),
          auctionEnd: Number(post.auctionEnd),
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
                  <p>Price: ${offer.pricePerMwh} / MWh</p>
                  <p>Energy Available: {offer.energyAvailable} kWh</p>
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
                  <p>Price: ${offer.pricePerMwh} / MWh</p>
                  <p>Energy Available: {offer.energyAvailable} kWh</p>
                  <p>Status: {offer.status}</p>
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