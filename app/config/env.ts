// Environment Configuration
export const ENV = {
  // Solana Configuration
  SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  PROGRAM_ID: process.env.NEXT_PUBLIC_PROGRAM_ID || '8eY8x8TAAHkFsN9w42Z85PqBr5kkJRGTyQKQA1qP2WvJ',
  ADMIN_WALLET: process.env.NEXT_PUBLIC_ADMIN_WALLET || 'E7nsPwmdXmEfPnsVEkjMbGFGfYqUo7kGVu5X2k2AuXSY',
  
  // Network Configuration
  NETWORK: process.env.NEXT_PUBLIC_NETWORK || 'devnet',
  
  // Token Configuration
  STAKING_MINT: process.env.NEXT_PUBLIC_STAKING_MINT || 'So11111111111111111111111111111111111111112', // SOL
  REWARD_MINT: process.env.NEXT_PUBLIC_REWARD_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  
  // App Configuration
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Solana Staking Dashboard',
  APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Professional Solana staking dashboard for monitoring and managing your staked tokens',
} as const;

// Contract constants
export const CONTRACT_CONFIG = {
  PROGRAM_ID: ENV.PROGRAM_ID,
  ADMIN_WALLET: ENV.ADMIN_WALLET,
  RPC_URL: ENV.SOLANA_RPC_URL,
  SCALAR: 1_000_000_000_000,
} as const;

// Token configurations
export const TOKEN_CONFIG = {
  STAKING_MINT: ENV.STAKING_MINT,
  REWARD_MINT: ENV.REWARD_MINT,
} as const;
