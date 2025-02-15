import React, { useState, useEffect } from 'react';
import axios from 'axios';

// EditOffer Component - For editing an existing offer
const EditOffer = ({ offer, onSave, onCancel }) => {
  const [title, setTitle] = useState(offer.title);
  const [description, setDescription] = useState(offer.description);
  const [pricePerMWh, setPricePerMWh] = useState(offer.pricePerMwh);
  const [energyAvailable, setEnergyAvailable] = useState(offer.energyAvailable);

  const handleSave = async (event) => {
    event.preventDefault();
    const updatedOffer = {
      ...offer,
      title,
      description,
      pricePerMwh: parseFloat(pricePerMWh),
      energyAvailable: parseFloat(energyAvailable),
    };

    try {
      await axios.put(`http://localhost:5000/api/marketplace/${offer.id}`, updatedOffer);
      onSave(updatedOffer);
    } catch (error) {
      console.error('Error updating offer:', error);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 p-4 border rounded-lg shadow-md">
      <h3 className="text-xl font-bold">Edit Offer</h3>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 border rounded-md"
        required
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full p-2 border rounded-md"
        required
      />
      <input
        type="number"
        value={pricePerMWh}
        onChange={(e) => setPricePerMWh(e.target.value)}
        className="w-full p-2 border rounded-md"
        required
      />
      <input
        type="number"
        value={energyAvailable}
        onChange={(e) => setEnergyAvailable(e.target.value)}
        className="w-full p-2 border rounded-md"
        required
      />
      <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-md">
        Save Changes
      </button>
      <button type="button" onClick={onCancel} className="w-full bg-gray-400 text-white p-2 rounded-md mt-2">
        Cancel
      </button>
    </form>
  );
};

// MyPosts Component - To display and manage the user's posts
const MyPosts = () => {
  const [myOffers, setMyOffers] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);

  useEffect(() => {
    const fetchMyPosts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/marketplace/myposts');
        setMyOffers(response.data);
      } catch (error) {
        console.error('Error fetching my posts:', error);
      }
    };

    fetchMyPosts();
  }, []);

  const handleEdit = (offer) => {
    setEditingOffer(offer);
  };

  const handleSave = (updatedOffer) => {
    setMyOffers((prevOffers) =>
      prevOffers.map((offer) => (offer.id === updatedOffer.id ? updatedOffer : offer))
    );
    setEditingOffer(null);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/marketplace/${id}`);
      setMyOffers((prevOffers) => prevOffers.filter((offer) => offer.id !== id));
    } catch (error) {
      console.error('Error deleting offer:', error);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-4">My Posts</h1>

      {editingOffer ? (
        <EditOffer offer={editingOffer} onSave={handleSave} onCancel={() => setEditingOffer(null)} />
      ) : (
        <div>
          {myOffers.length === 0 ? (
            <p>You have not posted any offers yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myOffers.map((offer) => (
                <div key={offer.id} className="bg-card border p-4 rounded-lg mb-4 shadow-md">
                  <h3 className="text-xl font-bold">{offer.title}</h3>
                  <p>{offer.description}</p>
                  <p>Price: ${offer.pricePerMwh} / MWh</p>
                  <p>Energy Available: {offer.energyAvailable} kWh</p>
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
        </div>
      )}
    </div>
  );
};

export default MyPosts;
