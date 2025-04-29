// energyTransfer.js
import { getDatabase, ref, set, get, onValue, update } from 'firebase/database';
import { toast } from 'react-toastify';
import Web3 from 'web3';    
import EnergyTradingABI from '../components/EnergyTradingABI.json';

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

// Main function to handle energy transfer
export const handleEnergyTransfer = async (listingId, consumerAddress, energyAmount, prosumerHardwareId) => {
  const db = getDatabase();
  try {
    // First get the highest bidder's address from the smart contract
    const web3 = new Web3(window.ethereum);
    const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
    
    // Get the listing details to find the highest bidder
    const listing = await contract.methods.listings(listingId).call();
    const highestBidder = listing.highestBidder;
    
    // Get consumer's hardware ID using the highest bidder's address
    const consumerHardwareId = await contract.methods.getUserHardwareId(highestBidder).call();
    
    if (!consumerHardwareId) {
      throw new Error('Consumer hardware ID not found');
    }

    // Define consumer hardware IDs
    const CONSUMER1_ID = "HardwareID_102";
    const CONSUMER2_ID = "HardwareID_103";

    // Determine which consumer is buying and set appropriate flags
    const isConsumer1 = consumerHardwareId === CONSUMER1_ID;
    const isConsumer2 = consumerHardwareId === CONSUMER2_ID;

    if (!isConsumer1 && !isConsumer2) {
      throw new Error(`Invalid consumer hardware ID: ${consumerHardwareId}`);
    }
    
    console.log(`Energy transfer request: Listing #${listingId}, Consumer: ${consumerHardwareId}, Amount: ${energyAmount}Wh`);

    // Check if a transfer is already in progress
    const pendingRef = ref(db, `${prosumerHardwareId}/Prosumer/EnergyPending`);
    const pendingSnapshot = await get(pendingRef);
    const isTransferInProgress = pendingSnapshot.exists() && pendingSnapshot.val() === true;

    if (isTransferInProgress) {
      console.log("A transfer is already in progress. Adding to queue instead of starting transfer.");
      // Add to queue if a transfer is in progress
      await addToQueue(db, prosumerHardwareId, consumerHardwareId, listingId, energyAmount);
      toast.success('Energy transfer added to queue!');
      return true;
    }

    // If no transfer is in progress, start this transfer immediately
    const transferFlag = isConsumer1 ? 'EnergyTransferC1' : 'EnergyTransferC2';
    const completeFlag = isConsumer1 ? 'EnergyCompleteC1' : 'EnergyCompleteC2';

    // Update prosumer's data in Firebase - critical to do this atomically
    const prosumerRef = ref(db, `${prosumerHardwareId}/Prosumer`);
    const prosumerSnapshot = await get(prosumerRef);
    const prosumerCurrentData = prosumerSnapshot.val() || {};
    
    const prosumerUpdates = {
      EnergyPending: true,
      EnergySold: energyAmount,
      [transferFlag]: true,
      [completeFlag]: false
    };
    
    // Make sure the other transfer flag is false
    const otherTransferFlag = isConsumer1 ? 'EnergyTransferC2' : 'EnergyTransferC1';
    prosumerUpdates[otherTransferFlag] = false;
    
    // Update prosumer data
    await update(ref(db, `${prosumerHardwareId}/Prosumer`), prosumerUpdates);

    // Update consumer's data
    const consumerRef = ref(db, `${consumerHardwareId}/Consumer`);
    const consumerSnapshot = await get(consumerRef);
    const consumerCurrentData = consumerSnapshot.val() || {};

    await update(ref(db, `${consumerHardwareId}/Consumer`), {
      EnergyBought: energyAmount,
      LastPurchaseTimestamp: Date.now()
    });

    // Add notification for the consumer
    await set(ref(db, `${consumerHardwareId}/Consumer/Notifications/${listingId}`), {
      message: `Energy transfer started for listing #${listingId}`,
      energyAmount,
      timestamp: Date.now(),
      read: false,
      TransferComplete: false
    });

    console.log(`Started energy transfer: ${energyAmount}Wh to ${consumerHardwareId}`);
    toast.success('Energy transfer started!');

    // Monitor for transfer completion
    monitorTransferCompletion(db, prosumerHardwareId, consumerHardwareId, completeFlag, transferFlag, listingId, energyAmount);
    
    return true;
  } catch (error) {
    console.error('Energy transfer error:', error);
    toast.error('Energy transfer failed: ' + error.message);
    throw error;
  }
};

// Add transfer to queue
async function addToQueue(db, prosumerHardwareId, consumerHardwareId, listingId, energyAmount) {
  try {
    const queueRef = ref(db, `${prosumerHardwareId}/Prosumer/TransferQueue`);
    const queueSnapshot = await get(queueRef);
    
    // Create new transfer item
    const transferItem = {
      consumerHardwareId,
      energyAmount,
      listingId,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    // Add to queue
    if (!queueSnapshot.exists()) {
      // Initialize queue with first item
      await set(queueRef, { [listingId]: transferItem });
    } else {
      // Add to existing queue
      await update(queueRef, { [listingId]: transferItem });
    }
    
    console.log(`Added to queue: Listing #${listingId}, Consumer: ${consumerHardwareId}, Amount: ${energyAmount}Wh`);
    return true;
  } catch (error) {
    console.error('Error adding transfer to queue:', error);
    return false;
  }
}

// Process next transfer in queue
async function processNextInQueue(db, prosumerHardwareId) {
  try {
    console.log('Checking for next transfer in queue...');
    
    // First verify no transfer is in progress
    const pendingRef = ref(db, `${prosumerHardwareId}/Prosumer/EnergyPending`);
    const pendingSnapshot = await get(pendingRef);
    const isTransferInProgress = pendingSnapshot.exists() && pendingSnapshot.val() === true;
    
    if (isTransferInProgress) {
      console.log('A transfer is still in progress. Cannot process next item yet.');
      return;
    }
    
    // Get transfer queue
    const queueRef = ref(db, `${prosumerHardwareId}/Prosumer/TransferQueue`);
    const queueSnapshot = await get(queueRef);
    
    if (!queueSnapshot.exists()) {
      console.log('No transfers in queue.');
      return;
    }
    
    // Find oldest pending transfer
    const queue = queueSnapshot.val();
    let nextTransfer = null;
    let nextTransferId = null;
    
    Object.entries(queue).forEach(([id, transfer]) => {
      if (transfer.status === 'pending' && (!nextTransfer || transfer.timestamp < nextTransfer.timestamp)) {
        nextTransfer = transfer;
        nextTransferId = id;
      }
    });
    
    if (!nextTransfer) {
      console.log('No pending transfers in queue.');
      return;
    }
    
    console.log(`Processing next transfer: Listing #${nextTransfer.listingId}, Consumer: ${nextTransfer.consumerHardwareId}`);
    
    // Update transfer status
    await update(ref(db, `${prosumerHardwareId}/Prosumer/TransferQueue/${nextTransferId}`), {
      status: 'processing'
    });
    
    // Determine which consumer is receiving energy
    const isConsumer1 = nextTransfer.consumerHardwareId === "HardwareID_102";
    const transferFlag = isConsumer1 ? 'EnergyTransferC1' : 'EnergyTransferC2';
    const completeFlag = isConsumer1 ? 'EnergyCompleteC1' : 'EnergyCompleteC2';
    
    // Update prosumer status
    const prosumerUpdates = {
      EnergyPending: true,
      EnergySold: nextTransfer.energyAmount,
      [transferFlag]: true,
      [completeFlag]: false
    };
    
    // Make sure the other transfer flag is false
    const otherTransferFlag = isConsumer1 ? 'EnergyTransferC2' : 'EnergyTransferC1';
    prosumerUpdates[otherTransferFlag] = false;
    
    await update(ref(db, `${prosumerHardwareId}/Prosumer`), prosumerUpdates);
    
    // Update consumer
    await update(ref(db, `${nextTransfer.consumerHardwareId}/Consumer`), {
      EnergyBought: nextTransfer.energyAmount,
      LastPurchaseTimestamp: Date.now()
    });
    
    // Add notification
    await set(ref(db, `${nextTransfer.consumerHardwareId}/Consumer/Notifications/${nextTransfer.listingId}`), {
      message: `Energy transfer started for listing #${nextTransfer.listingId}`,
      energyAmount: nextTransfer.energyAmount,
      timestamp: Date.now(),
      read: false,
      TransferComplete: false
    });
    
    // Monitor for completion
    monitorTransferCompletion(
      db, 
      prosumerHardwareId, 
      nextTransfer.consumerHardwareId, 
      completeFlag, 
      transferFlag,
      nextTransfer.listingId, 
      nextTransfer.energyAmount
    );
    
    console.log(`Started queued transfer: ${nextTransfer.energyAmount}Wh to ${nextTransfer.consumerHardwareId}`);
    toast.success('Started next transfer in queue!');
  } catch (error) {
    console.error('Error processing queue:', error);
  }
}

// Monitor for transfer completion
function monitorTransferCompletion(db, prosumerHardwareId, consumerHardwareId, completeFlag, transferFlag, listingId, energyAmount) {
  const completeFlagRef = ref(db, `${prosumerHardwareId}/Prosumer/${completeFlag}`);
  
  console.log(`Monitoring transfer completion flag: ${completeFlag}`);
  
  const unsubscribe = onValue(completeFlagRef, async (snapshot) => {
    if (snapshot.val() === true) {
      console.log(`Transfer complete for listing #${listingId}!`);
      
      // Update TotalEnergySold (accumulate)
      const prosumerRef = ref(db, `${prosumerHardwareId}/Prosumer`);
      const prosumerSnapshot = await get(prosumerRef);
      if (prosumerSnapshot.exists()) {
        const prosumerData = prosumerSnapshot.val();
        const currentTotal = prosumerData.TotalEnergySold || 0;
        
        // Reset state for completed transfer
        await update(prosumerRef, {
          [transferFlag]: false,
          EnergyPending: false,
          TotalEnergySold: currentTotal + energyAmount
        });
      }
      
      // Update consumer with completion notification and total
      await set(ref(db, `${consumerHardwareId}/Consumer/Notifications/${listingId}`), {
        message: `Energy transfer completed for listing #${listingId}`,
        energyAmount,
        timestamp: Date.now(),
        read: false,
        TransferComplete: true
      });
      
      // Update TotalEnergyBought (accumulate)
      const consumerRef = ref(db, `${consumerHardwareId}/Consumer`);
      const consumerSnapshot = await get(consumerRef);
      if (consumerSnapshot.exists()) {
        const consumerData = consumerSnapshot.val();
        const currentTotal = consumerData.TotalEnergyBought || 0;
        
        await update(consumerRef, {
          TotalEnergyBought: currentTotal + energyAmount,
          TransferComplete: true
        });
      }
      
      // Show success notification
      toast.success('Energy transfer completed!');
      
      // Remove this listener
      unsubscribe();
      
      // Process next transfer after a brief delay
      setTimeout(() => {
        processNextInQueue(db, prosumerHardwareId);
      }, 2000);
    }
  });
}