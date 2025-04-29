// transferQueue.js
import { getDatabase, ref, get, set, update, remove } from 'firebase/database';
import Web3 from 'web3';
import EnergyTradingABI from '../components/EnergyTradingABI.json';

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

class TransferQueue {
  constructor() {
    this.db = getDatabase();
  }

  // Check if a transfer is in progress for a given prosumer
  async isTransferInProgress(prosumerHardwareId) {
    try {
      const pendingRef = ref(this.db, `${prosumerHardwareId}/Prosumer/EnergyPending`);
      const snapshot = await get(pendingRef);
      return snapshot.exists() && snapshot.val() === true;
    } catch (error) {
      console.error('Error checking transfer status:', error);
      return false;
    }
  }

  // Add a new transfer to the prosumer's queue
  async addToQueue(prosumerHardwareId, consumerHardwareId, energyAmount, listingId) {
    try {
      // Create transfer request object
      const transfer = {
        consumerHardwareId,
        energyAmount,
        listingId,
        timestamp: Date.now(),
        status: 'pending'
      };

      // Add to queue in Firebase
      const queueRef = ref(this.db, `${prosumerHardwareId}/Prosumer/TransferQueue`);
      const snapshot = await get(queueRef);

      if (!snapshot.exists()) {
        // First item in queue
        await set(queueRef, { [listingId]: transfer });
      } else {
        // Add to existing queue
        await update(queueRef, { [listingId]: transfer });
      }

      console.log(`Added listing #${listingId} to transfer queue for ${prosumerHardwareId}`);
      return true;
    } catch (error) {
      console.error('Error adding to queue:', error);
      return false;
    }
  }

  // Get the next pending transfer from the queue
  async getNextTransfer(prosumerHardwareId) {
    try {
      const queueRef = ref(this.db, `${prosumerHardwareId}/Prosumer/TransferQueue`);
      const snapshot = await get(queueRef);

      if (!snapshot.exists()) return null;

      // Convert queue to array and find oldest pending transfer
      const queueData = snapshot.val();
      const transfers = Object.entries(queueData)
        .map(([id, data]) => ({ id, ...data }))
        .filter(transfer => transfer.status === 'pending')
        .sort((a, b) => a.timestamp - b.timestamp);

      return transfers.length > 0 ? transfers[0] : null;
    } catch (error) {
      console.error('Error getting next transfer:', error);
      return null;
    }
  }

  // Start the transfer process for the next item in queue
  async processNextTransfer(prosumerHardwareId) {
    try {
      // Check if a transfer is already in progress
      const inProgress = await this.isTransferInProgress(prosumerHardwareId);
      if (inProgress) {
        console.log(`Energy transfer already in progress for ${prosumerHardwareId}`);
        return false;
      }

      // Get next pending transfer
      const nextTransfer = await this.getNextTransfer(prosumerHardwareId);
      if (!nextTransfer) {
        console.log(`No pending transfers in queue for ${prosumerHardwareId}`);
        return false;
      }

      console.log(`Processing transfer for listing #${nextTransfer.listingId}`);

      // Update transfer status
      await this.updateTransferStatus(prosumerHardwareId, nextTransfer.id, 'processing');

      // Determine which consumer is receiving energy
      const isConsumer1 = nextTransfer.consumerHardwareId === "HardwareID_102";

      // Set flags based on consumer
      const transferFlag = isConsumer1 ? 'EnergyTransferC1' : 'EnergyTransferC2';
      
      // Update prosumer state to start transfer
      const prosumerUpdates = {
        'EnergyPending': true,
        [transferFlag]: true,
        'EnergySold': nextTransfer.energyAmount
      };

      // Reset the other transfer flag
      const otherFlag = isConsumer1 ? 'EnergyTransferC2' : 'EnergyTransferC1';
      prosumerUpdates[otherFlag] = false;

      // Apply updates to Firebase
      await update(ref(this.db, `${prosumerHardwareId}/Prosumer`), prosumerUpdates);

      // Update consumer state
      await update(ref(this.db, `${nextTransfer.consumerHardwareId}/Consumer`), {
        'EnergyBought': nextTransfer.energyAmount,
        'LastPurchaseTimestamp': Date.now()
      });

      console.log(`Started energy transfer of ${nextTransfer.energyAmount}Wh to ${nextTransfer.consumerHardwareId}`);
      return true;
    } catch (error) {
      console.error('Error processing transfer:', error);
      return false;
    }
  }

  // Update the status of a transfer in the queue
  async updateTransferStatus(prosumerHardwareId, listingId, status) {
    try {
      const statusRef = ref(this.db, `${prosumerHardwareId}/Prosumer/TransferQueue/${listingId}/status`);
      await set(statusRef, status);
      return true;
    } catch (error) {
      console.error(`Error updating transfer status for listing #${listingId}:`, error);
      return false;
    }
  }

  // Remove a completed transfer from the queue
  async removeFromQueue(prosumerHardwareId, listingId) {
    try {
      const transferRef = ref(this.db, `${prosumerHardwareId}/Prosumer/TransferQueue/${listingId}`);
      await remove(transferRef);
      return true;
    } catch (error) {
      console.error(`Error removing transfer from queue:`, error);
      return false;
    }
  }

  // Handle completion of a transfer
  async completeTransfer(prosumerHardwareId, listingId) {
    try {
      // Get transfer data
      const transferRef = ref(this.db, `${prosumerHardwareId}/Prosumer/TransferQueue/${listingId}`);
      const snapshot = await get(transferRef);
      
      if (!snapshot.exists()) {
        console.error(`Transfer ${listingId} not found in queue`);
        return false;
      }
      
      const transfer = snapshot.val();
      
      // Update transfer status
      await this.updateTransferStatus(prosumerHardwareId, listingId, 'completed');
      
      // Reset transfer flags
      const updates = {
        'EnergyPending': false,
        'EnergyTransferC1': false,
        'EnergyTransferC2': false
      };
      
      await update(ref(this.db, `${prosumerHardwareId}/Prosumer`), updates);
      
      // Update consumer notification
      const notificationRef = ref(this.db, `${transfer.consumerHardwareId}/Consumer/Notifications/${listingId}`);
      const notificationSnapshot = await get(notificationRef);
      
      if (notificationSnapshot.exists()) {
        const notification = notificationSnapshot.val();
        await set(notificationRef, {
          ...notification,
          message: `Energy transfer completed for listing #${listingId}`,
          timestamp: Date.now(),
          TransferComplete: true
        });
      }
      
      // Update totals
      const consumerRef = ref(this.db, `${transfer.consumerHardwareId}/Consumer`);
      const consumerSnapshot = await get(consumerRef);
      
      if (consumerSnapshot.exists()) {
        const consumerData = consumerSnapshot.val();
        await update(consumerRef, {
          'TotalEnergyBought': (consumerData.TotalEnergyBought || 0) + transfer.energyAmount,
          'TransferComplete': true
        });
      }
      
      const prosumerRef = ref(this.db, `${prosumerHardwareId}/Prosumer`);
      const prosumerSnapshot = await get(prosumerRef);
      
      if (prosumerSnapshot.exists()) {
        const prosumerData = prosumerSnapshot.val();
        await update(prosumerRef, {
          'TotalEnergySold': (prosumerData.TotalEnergySold || 0) + transfer.energyAmount
        });
      }
      
      // Process next transfer after small delay
      setTimeout(() => {
        this.processNextTransfer(prosumerHardwareId);
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('Error completing transfer:', error);
      return false;
    }
  }

  // Get hardware ID for a user from blockchain
  async getHardwareIdFromBlockchain(userAddress) {
    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
      
      const hardwareId = await contract.methods.getUserHardwareId(userAddress).call();
      return hardwareId;
    } catch (error) {
      console.error('Error getting hardware ID from blockchain:', error);
      return null;
    }
  }
}

// Create singleton instance
const transferQueueInstance = new TransferQueue();
export default transferQueueInstance;