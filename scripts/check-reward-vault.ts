// Script to check the reward vault balance
import { Connection, PublicKey } from '@solana/web3.js';
import { CONTRACT_CONFIG } from '../app/config/env';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

// Pool data from the dashboard
const POOL_ADDRESS = 'EQM8GKuntXZapgmXwT9STQeSWhnS2AuDW3dbkS6azdcG';
const REWARD_VAULT = '44wXAK7rnCgdws1Dg8SATnvJ6Y5PEiZ5adTAmwND8K7z'; // From the dashboard logs

async function checkRewardVaultBalance() {
  try {
    console.log('🔍 Checking reward vault balance...');
    console.log(`Reward Vault: ${REWARD_VAULT}`);
    
    const vaultPk = new PublicKey(REWARD_VAULT);
    const vaultBalance = await connection.getTokenAccountBalance(vaultPk);
    
    console.log('💰 Reward Vault Balance:', {
      vaultAddress: REWARD_VAULT,
      balance: vaultBalance.value.uiAmount,
      balanceString: vaultBalance.value.uiAmountString,
      decimals: vaultBalance.value.decimals,
      baseUnits: vaultBalance.value.amount
    });
    
    if (vaultBalance.value.uiAmount === 0) {
      console.log('❌ Reward vault is empty! No tokens to distribute as rewards.');
      console.log('💡 You need to add reward tokens to the pool using the admin panel.');
    } else {
      console.log(`✅ Reward vault has ${vaultBalance.value.uiAmountString} tokens available for distribution.`);
    }
    
  } catch (error) {
    console.error('❌ Failed to check reward vault balance:', error);
  }
}

checkRewardVaultBalance();
