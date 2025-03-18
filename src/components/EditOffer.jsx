import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import EnergyTradingABI from './EnergyTradingABI.json';

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

const EditOffer = ({ offer, onSave, onCancel }) => {
  const [energyAmount, setEnergyAmount] = useState(offer.energyAmount);
  const [minPrice, setMinPrice] = useState(offer.minPrice);
  const [auctionDuration, setAuctionDuration] = useState(offer.auctionDuration);
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState(null);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    // Initialize Web3 and Contract
    const initWeb3 = async () => {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3.eth.getAccounts();
        const contractInstance = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
        setContract(contractInstance);
        setAccounts(accounts);
      } else {
        console.error('MetaMask is required to use this application.');
      }
    };

    initWeb3();
  }, []);

  useEffect(() => {
    // Initialize states with offer data
    setEnergyAmount(offer.energyAmount);
    setMinPrice(offer.minPrice);
    setAuctionDuration(offer.auctionDuration);
  }, [offer]);

  const handleSave = async () => {
    if (!contract || accounts.length === 0) {
      console.error('Contract or accounts not initialized');
      return;
    }

    try {
      setLoading(true);
      console.log('Calling editEnergyPost with:', {
        listingId: offer.id,
        energyAmount,
        minPrice,
        auctionEnd: auctionDuration,
      });

      // Call the smart contract's method to update the offer
      await contract.methods
        .editEnergyPost(
          offer.id, // listing ID for identification
          energyAmount, // updated energy amount
          minPrice, // updated minimum price
          auctionDuration // updated auction duration
        )
        .send({ from: accounts[0] });

      console.log('editEnergyPost called successfully');

      // Call the onSave callback to update the local state in MyPosts
      onSave({
        ...offer,
        energyAmount,
        minPrice,
        auctionDuration,
      });

      // Optionally reset the form after saving
      onCancel(); // Close the form after saving
    } catch (error) {
      console.error('Error updating offer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!contract || accounts.length === 0) {
      console.error('Contract or accounts not initialized');
      return;
    }

    try {
      setLoading(true);
      console.log('Calling deleteEnergyPost with listingId:', offer.id);

      // Call the smart contract's method to delete the offer
      await contract.methods
        .deleteEnergyPost(offer.id)
        .send({ from: accounts[0] });

      console.log('deleteEnergyPost called successfully');

      // Call the onSave callback to remove the offer from the local state in MyPosts
      onSave(null, offer.id);

      // Optionally reset the form after deleting
      onCancel(); // Close the form after deleting
    } catch (error) {
      console.error('Error deleting offer:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border p-4 rounded-lg mb-4 shadow-md">
      <h3 className="text-xl font-bold">Edit Offer</h3>
      {loading && <p>Saving...</p>}
      <div className="space-y-4">
        {/* Energy Amount */}
        <div>
          <label className="block text-sm">Energy Amount (kWh)</label>
          <input
            type="number"
            className="w-full p-2 border rounded-md"
            value={energyAmount}
            onChange={(e) => setEnergyAmount(e.target.value)}
            disabled={loading} // Disable input while saving
          />
        </div>

        {/* Minimum Price */}
        <div>
          <label className="block text-sm">Minimum Price (per MWh)</label>
          <input
            type="number"
            className="w-full p-2 border rounded-md"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Auction Duration */}
        <div>
          <label className="block text-sm">Auction Duration (hours)</label>
          <input
            type="number"
            className="w-full p-2 border rounded-md"
            value={auctionDuration}
            onChange={(e) => setAuctionDuration(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mt-4">
          <button
            onClick={handleSave}
            className="w-1/2 bg-green-500 text-white p-2 rounded-md"
            disabled={loading}
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="w-1/2 bg-gray-400 text-white p-2 rounded-md"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="w-1/2 bg-red-500 text-white p-2 rounded-md"
            disabled={loading}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOffer;