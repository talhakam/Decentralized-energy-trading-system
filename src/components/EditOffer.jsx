import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import EnergyTradingABI from './EnergyTradingABI.json';
import { toBlockchainEnergy, fromBlockchainEnergy } from '../utils/energyUtils';

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

const EditOffer = ({ offer, onSave, onCancel }) => {
  // We assume the offer prop already has the display value (converted from blockchain format)
  const [energyAmount, setEnergyAmount] = useState(offer.energyAvailable);
  const [minPrice, setMinPrice] = useState(offer.pricePerMwh);
  const [auctionDuration, setAuctionDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState(null);
  const [accounts, setAccounts] = useState([]);

  console.log("Initial offer data:", offer);

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
    setEnergyAmount(offer.energyAvailable);
    setMinPrice(offer.pricePerMwh);
    setAuctionDuration(''); // Default to empty string
  }, [offer]);

  const handleSave = async () => {
    if (!contract || accounts.length === 0) {
      console.error('Contract or accounts not initialized');
      return;
    }

    try {
      setLoading(true);
      
      // Convert from display float to blockchain integer
      const scaledEnergy = toBlockchainEnergy(energyAmount);
      console.log(`Converting display energy ${energyAmount} kWh to blockchain value: ${scaledEnergy}`);
      
      // Calculate the auction end time based on duration input
      let newAuctionEndTime = offer.auctionEnd; // Default to keeping the current end time
      
      if (auctionDuration.trim() !== '') {
        // If duration is provided, calculate new end time as current time + duration in minutes
        const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
        newAuctionEndTime = currentTime + (parseInt(auctionDuration) * 60); // Add minutes converted to seconds
        console.log(`New auction duration: ${auctionDuration} minutes, new end time: ${newAuctionEndTime}`);
      } else {
        console.log(`Keeping original auction end time: ${newAuctionEndTime}`);
      }
      
      console.log('Calling editEnergyPost with:', {
        listingId: offer.id,
        energyAmount: scaledEnergy, // Use the scaled value for blockchain
        minPrice: Web3.utils.toWei(minPrice.toString(), 'ether'),
        auctionEnd: newAuctionEndTime, // Use the calculated end time
      });

      // Call the smart contract's method to update the offer
      await contract.methods
        .editEnergyPost(
          offer.id, // listing ID for identification
          scaledEnergy, // scaled energy amount for blockchain
          Web3.utils.toWei(minPrice.toString(), 'ether'), // convert ETH to wei
          newAuctionEndTime // calculated auction end time
        )
        .send({ from: accounts[0] });

      console.log('editEnergyPost called successfully');

      // Call the onSave callback to update the local state in MyPosts
      // Use the original display value (not the scaled value) for the UI
      onSave({
        ...offer,
        energyAvailable: parseFloat(energyAmount), // Make sure it's a number
        pricePerMwh: parseFloat(minPrice), // Make sure it's a number
        auctionDuration: auctionDuration ? parseInt(auctionDuration) : offer.auctionDuration,
        auctionEnd: newAuctionEndTime // Pass back the new end time
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

  // Function to calculate time remaining
  const getTimeRemaining = () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const secondsRemaining = offer.auctionEnd - currentTime;
    
    if (secondsRemaining <= 0) return "Expired";
    
    const minutes = Math.floor(secondsRemaining / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} min${minutes % 60 !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="bg-card border p-4 rounded-lg mb-4 shadow-md">
      <h3 className="text-xl font-bold">Edit Offer #{offer.id}</h3>
      {loading && <p>Saving...</p>}
      <div className="space-y-4">
        {/* Energy Amount */}
        <div>
          <label className="block text-sm">Energy Amount (Wh)</label>
          <input
            type="number"
            step="0.001" // Allow decimal values
            className="w-full p-2 border rounded-md"
            value={energyAmount}
            onChange={(e) => setEnergyAmount(e.target.value)}
            disabled={loading} // Disable input while saving
          />
        </div>

        {/* Minimum Price */}
        <div>
          <label className="block text-sm">Minimum Price (ETH/Wh)</label>
          <input
            type="number"
            step="0.000001" // Allow small ETH values
            className="w-full p-2 border rounded-md"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Auction Duration */}
        <div>
          <label className="block text-sm">Auction Duration (minutes)</label>
          <input
            type="number"
            placeholder="Leave empty to keep current end time"
            className="w-full p-2 border rounded-md"
            value={auctionDuration}
            onChange={(e) => setAuctionDuration(e.target.value)}
            disabled={loading}
          />
          <p className="text-sm text-gray-500 mt-1">
            Current end time: {new Date(offer.auctionEnd * 1000).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">
            Time remaining: {getTimeRemaining()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            If you enter a duration, the auction will be extended to that many minutes from now.
            Leave empty to keep the current end time.
          </p>
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