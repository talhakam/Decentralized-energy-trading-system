// utils/queueMonitor.js
import { getDatabase, ref, onValue, get } from 'firebase/database';
import { handleEnergyTransfer } from './energyTransfer';
import Web3 from 'web3';
import EnergyTradingABI from '../components/EnergyTradingABI.json';

const CONTRACT_ADDRESS = process.env.REACT_APP_SMART_CONTRACT_ADDRESS;

class QueueMonitor {
  constructor() {
    this.db = getDatabase();
    this.isInitialized = false;
    this.prosumerHardwareId = null;
    this.monitoringActive = false;
    this.pendingListener = null;
    this.queueListener = null;
  }

  // Initialize the monitor with the current user's data
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Get hardware ID from blockchain
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3.eth.getAccounts();
        
        if (accounts && accounts.length > 0) {
          const contract = new web3.eth.Contract(EnergyTradingABI.abi, CONTRACT_ADDRESS);
          this.prosumerHardwareId = await contract.methods.getUserHardwareId(accounts[0]).call();
          
          if (this.prosumerHardwareId) {
            console.log(`Queue monitor initialized for prosumer: ${this.prosumerHardwareId}`);
            this.isInitialized = true;
            this.startMonitoring();
          } else {
            console.log('No hardware ID found for current user');
          }
        }
      }
    } catch (error) {
      console.error('Error initializing queue monitor:', error);
    }
  }

  // Start listening for changes that might require queue processing
  startMonitoring() {
    if (!this.prosumerHardwareId || this.monitoringActive) return;
    
    try {
      this.monitoringActive = true;
      
      // Listen for changes to EnergyPending flag
      const pendingRef = ref(this.db, `${this.prosumerHardwareId}/Prosumer/EnergyPending`);
      this.pendingListener = onValue(pendingRef, async (snapshot) => {
        const isPending = snapshot.exists() && snapshot.val() === true;
        
        if (!isPending) {
          // If a transfer just completed, check for next item in queue
          console.log('Energy transfer completed or not in progress, checking queue...');
          await this.processNextInQueue();
        }
      });
      
      // Listen for changes to the transfer queue
      const queueRef = ref(this.db, `${this.prosumerHardwareId}/Prosumer/TransferQueue`);
      this.queueListener = onValue(queueRef, async (snapshot) => {
        if (snapshot.exists()) {
          // Check the queue when it changes
          const isPending = await this.isTransferInProgress();
          
          if (!isPending) {
            console.log('Queue updated and no transfer in progress, processing next item...');
            await this.processNextInQueue();
          }
        }
      });
      
      // Initial check of queue state
      this.processNextInQueue();
      
      console.log('Queue monitoring started successfully');
    } catch (error) {
      console.error('Error starting queue monitoring:', error);
      this.monitoringActive = false;
    }
  }

  // Check if a transfer is currently in progress
  async isTransferInProgress() {
    if (!this.prosumerHardwareId) return false;
    
    try {
      const pendingRef = ref(this.db, `${this.prosumerHardwareId}/Prosumer/EnergyPending`);
      const snapshot = await get(pendingRef);
      return snapshot.exists() && snapshot.val() === true;
    } catch (error) {
      console.error('Error checking if transfer is in progress:', error);
      return false;
    }
  }

  // Get the next pending transfer from the queue
  async getNextTransfer() {
    if (!this.prosumerHardwareId) return null;
    
    try {
      const queueRef = ref(this.db, `${this.prosumerHardwareId}/Prosumer/TransferQueue`);
      const snapshot = await get(queueRef);
      
      if (!snapshot.exists()) return null;
      
      // Find oldest pending transfer
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

  // Process the next item in the queue if needed
  async processNextInQueue() {
    if (!this.prosumerHardwareId) return false;
    
    try {
      // Check if a transfer is already in progress
      const isInProgress = await this.isTransferInProgress();
      
      if (isInProgress) {
        console.log('Transfer already in progress, skipping queue processing');
        return false;
      }
      
      // Get next transfer
      const nextTransfer = await this.getNextTransfer();
      
      if (nextTransfer) {
        console.log(`Processing transfer for listing #${nextTransfer.listingId}`);
        
        // Use the handleEnergyTransfer function to start the transfer
        await handleEnergyTransfer(
          nextTransfer.listingId,
          nextTransfer.consumerAddress || nextTransfer.consumerHardwareId,
          nextTransfer.energyAmount,
          this.prosumerHardwareId
        );
        
        return true;
      } else {
        console.log('No pending transfers in queue');
        return false;
      }
    } catch (error) {
      console.error('Error processing queue:', error);
      return false;
    }
  }

  // Stop all monitoring
  reset() {
    // Remove Firebase listeners
    if (this.pendingListener) {
      this.pendingListener();
      this.pendingListener = null;
    }
    
    if (this.queueListener) {
      this.queueListener();
      this.queueListener = null;
    }
    
    // Reset state
    this.monitoringActive = false;
    this.isInitialized = false;
    this.prosumerHardwareId = null;
    
    console.log('Queue monitor reset');
  }
}

// Create singleton instance
const queueMonitorInstance = new QueueMonitor();
export default queueMonitorInstance;