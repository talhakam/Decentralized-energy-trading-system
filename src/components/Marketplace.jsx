import React, { useState, useEffect } from 'react';
import axios from 'axios';

// OfferCard Component to display individual offer details
const OfferCard = ({ offer }) => {
  return (
    <div className="bg-card border p-4 rounded-lg mb-4 shadow-md">
      <h3 className="text-xl font-bold">{offer.title}</h3>
      <p className="">{offer.description}</p>
      <p className="">Price: ${offer.pricePerMwh} / MWh</p>
      <p className="">Energy Available: {offer.energyAvailable} kWh</p>
    </div>
  );
};

// PostOffer Component to allow prosumers to post offers to the marketplace
const PostOffer = ({ onPost }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerMWh, setPricePerMWh] = useState('');
  const [energyAvailable, setEnergyAvailable] = useState('');

  const handlePost = async (event) => {
    event.preventDefault();

    const newOffer = {
      title,
      description,
      pricePerMWh: parseFloat(pricePerMWh),
      energyAvailable: parseFloat(energyAvailable),
    };

    try {
      const response = await axios.post('http://localhost:5000/api/marketplace', newOffer);
      onPost(newOffer); // Add the newly posted offer to the list
      // Clear the form
      setTitle('');
      setDescription('');
      setPricePerMWh('');
      setEnergyAvailable('');
    } catch (error) {
      console.error('Error posting offer:', error);
    }
  };

  return (
    <form onSubmit={handlePost} style={{maxWidth: 500}} className="form space-y-4 p-6 border rounded-lg shadow-md">
      <h2 className="text-xl font-bold">Post a New Energy Offer</h2>
      <input
        type="text"
        placeholder="Offer Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 border rounded-md"
        required
      />
      <textarea
        placeholder="Offer Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full p-2 border rounded-md"
        required
      />
      <input
        type="number"
        placeholder="Price per MWh"
        value={pricePerMWh}
        onChange={(e) => setPricePerMWh(e.target.value)}
        className="w-full p-2 border rounded-md"
        required
      />
      <input
        type="number"
        placeholder="Energy Available (in kWh)"
        value={energyAvailable}
        onChange={(e) => setEnergyAvailable(e.target.value)}
        className="w-full p-2 border rounded-md"
        required
      />
      <button type="submit" style={{fontWeight: 500}} className="w-full bg-green-600 text-white p-2 rounded-md">
        Post Offer
      </button>
    </form>
  );
};

// Marketplace Component - where users can browse and post energy offers
const Marketplace = ({userRole}) => {
  const [offers, setOffers] = useState([]);
//   const [userType, setUserType] = useState('prosumer'); // Assume we can determine user type (consumer or prosumer)

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/marketplace');
        setOffers(response.data); // Set the offers fetched from the API
      } catch (error) {
        console.error('Error fetching marketplace offers:', error);
      }
    };

    fetchOffers();
  }, []);

  const handlePostOffer = (newOffer) => {
    console.log(newOffer);
    setOffers((prevOffers) => [...prevOffers, newOffer]);
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-4">Marketplace</h1>

      {userRole === 'prosumer' && (
        <PostOffer onPost={handlePostOffer} />
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4">Browse Available Energy Offers</h2>
        {offers.length === 0 ? (
          <p>No offers available at the moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
