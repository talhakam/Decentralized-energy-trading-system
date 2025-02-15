import React, { useState, useEffect } from 'react';
import axios from 'axios';

// BidCard Component to display individual bid details
const BidCard = ({ bid }) => {
  return (
    <div className="bg-card border p-4 rounded-lg mb-4 shadow-md">
      <h3 className="text-xl font-bold">{bid.offerTitle}</h3>
      <p>Bid Amount: ${bid.bidAmount}</p>
      <p>Status: {bid.status}</p>
    </div>
  );
};

// MyBids Component to display the list of bids placed by the user
const MyBids = () => {
  const [bids, setBids] = useState([]);

  useEffect(() => {
    const fetchBids = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/bids');
        setBids(response.data); // Set the bids fetched from the API
      } catch (error) {
        console.error('Error fetching bids:', error);
      }
    };

    fetchBids();
  }, []);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-4">My Bids</h1>

      {bids.length === 0 ? (
        <p>You have not placed any bids yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bids.map((bid) => (
            <BidCard key={bid.id} bid={bid} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBids;
