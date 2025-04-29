// utils/energyUtils.js
const ENERGY_SCALING_FACTOR = 1000;

// Convert from UI to blockchain format (float to scaled integer)
export const toBlockchainEnergy = (energyAmount) => {
  return Math.round(parseFloat(energyAmount) * ENERGY_SCALING_FACTOR);
};

// Convert from blockchain to UI format (scaled integer to float)
export const fromBlockchainEnergy = (energyAmount) => {
  return Number(energyAmount) / ENERGY_SCALING_FACTOR;
};