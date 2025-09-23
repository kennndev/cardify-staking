/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';

import { CONTRACT_CONFIG } from '../config/env';


// loadProgram gives us a Program built from on-chain IDL or local fallback;
// PROGRAM_ID is built once (env → PublicKey) so all callers agree
import { loadProgram, PROGRAM_ID } from '../lib/idl-loader';

// PDA helpers + pk() coercion
import { pk, poolPda, signerPda, userPda } from '../lib/pda';

// one-task init flow (derives PDAs, creates Pool+stakingVault, returns basics)
import { initializeOnly } from '../lib/init-only';

// RPC (same as your original)
export const RPC_URL = CONTRACT_CONFIG.RPC_URL;
export const SCALAR = CONTRACT_CONFIG.SCALAR;

// Admin wallet address (string in env → PublicKey at runtime)
export const ADMIN_WALLET = new PublicKey(CONTRACT_CONFIG.ADMIN_WALLET);


interface PoolData {
  poolAddress: string;     // Pool PDA (base58)
  admin: string;
  stakingMint: string;
  rewardMint: string;
  stakingVault: string;
  rewardVault: string;
  totalStaked: number;
  accScaled: string;       // big number-safe
  lastUpdateTs: number;
  ratePerSec: number;
  bump: number;
  signerBump: number;
}

interface UserData {
  owner: string;
  staked: number;
  debt: string;            // big number-safe
}

interface StakingContextType {
  connection: Connection;
  walletAddress: string | null;
  isAdmin: boolean;
  poolData: PoolData | null;
  userData: UserData | null;
  isLoading: boolean;
  error: string | null;
  stakingMint: string | null;
  
  // Actions
  initializePool: (stakingMint: string) => Promise<void>;
  fetchPoolByMint: (stakingMint: string) => Promise<void>;
  setRewardConfig: (rewardMint: string, ratePerSec: number) => Promise<void>;
  updateRate: (ratePerSec: string | number) => Promise<void>;
  addRewardTokens: (amount: number) => Promise<void>;
  checkRewardVaultBalance: () => Promise<number>;
  checkCurrentPoolState: () => Promise<void>;
  computeApy: () => Promise<{
    ratePerSecUI: number;
    totalStakedUI: number;
    yearlyRewards: number;
    secondsPerYear: number;
    apyPercent: number;
    decimals: { staking: number; reward: number };
    baseUnits: { ratePerSec: number; totalStaked: number };
  } | null>;
  stake: (amount: number) => Promise<void>;
  unstake: (amount: number) => Promise<void>;
  claim: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const StakingContext = createContext<StakingContextType | undefined>(undefined);

export function StakingProvider({ children }: { children: ReactNode }) {
  const [connection] = useState(new Connection(RPC_URL, 'confirmed'));
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stakingMint, setStakingMint] = useState<string | null>(null);

  // --- Wallet wiring ---------------------------------------------------------

  useEffect(() => {
    const syncWallet = async () => {
      if (typeof window === 'undefined' || !window.solana?.isPhantom) {
            setWalletAddress(null);
        return;
      }
      try {
        const res = await window.solana.connect();
        setWalletAddress(res?.publicKey?.toString() ?? null);
      } catch {
        setWalletAddress(null);
      }
    };

    syncWallet();

    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      const onConnect = (pubkey: PublicKey) => setWalletAddress(pubkey.toString());
      const onDisconnect = () => setWalletAddress(null);
      
      // Add event listeners
      if ('on' in window.solana) {
        (window.solana as any).on('connect', onConnect);
        (window.solana as any).on('disconnect', onDisconnect);
      }
      
      return () => {
        try {
          if (window.solana && 'off' in window.solana) {
            (window.solana as any).off('connect', onConnect);
            (window.solana as any).off('disconnect', onDisconnect);
          }
        } catch {}
      };
    }
  }, []);

  // Check if connected wallet is admin
  useEffect(() => {
    const admin = ADMIN_WALLET.toBase58();
    const isAdminWallet = walletAddress === admin;
    setIsAdmin(!!walletAddress && isAdminWallet);
  }, [walletAddress]);

  // Auto-detect pool when wallet connects
  useEffect(() => {
    if (walletAddress && !poolData) {
      autoDetectPool();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, poolData]);

  // --- Data refresh ----------------------------------------------------------

  const refreshData = async () => {
    if (!walletAddress) return;

    setIsLoading(true); 
    setError(null);

    try {
      // Provider with coerced wallet
      const wallet = {
        publicKey: pk(walletAddress),
        signTransaction: async (tx: any) => {
          if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
            return await (window as any).solana.signTransaction(tx);
          }
          throw new Error('Wallet not connected');
        },
        signAllTransactions: async (txs: any[]) => {
          if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
            return await (window as any).solana.signAllTransactions(txs);
          }
          throw new Error('Wallet not connected');
        }
      };

      const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
      const program = await loadProgram(provider);

      // Ensure IDL has Pool layout
      if (!program.idl.accounts?.some(a => a.name === 'Pool')) {
        throw new Error("Loaded IDL has no 'Pool' account. Use compiled IDL or on-chain IDL.");
      }

      // If we already know the pool PDA, fetch it; otherwise noop
      if (poolData?.poolAddress) {
        const poolPDA = pk(poolData.poolAddress);

        // Paranoia: do not allow mint used as pool
        if (poolPDA.equals(pk(poolData.stakingMint))) {
          throw new Error('Detected stakingMint used as pool. Pool must be the Pool PDA.');
        }

        // Fetch Pool
        const pool = await (program.account as any).pool.fetch(poolPDA);
        
        console.log('Raw pool data from blockchain:', {
          ratePerSec: pool.ratePerSec.toString(),
          ratePerSecNumber: pool.ratePerSec.toNumber(),
          rewardMint: pool.rewardMint.toBase58(),
          totalStaked: pool.totalStaked.toNumber(),
          admin: pool.admin.toBase58()
        });
        
        setPoolData({
          poolAddress: poolPDA.toBase58(),
          admin: pool.admin.toBase58(),
          stakingMint: pool.stakingMint.toBase58(),
          rewardMint: pool.rewardMint.toBase58(),
          stakingVault: pool.stakingVault.toBase58(),
          rewardVault: pool.rewardVault.toBase58(),
          totalStaked: pool.totalStaked.toNumber(),
          accScaled: pool.accScaled.toString(),
          lastUpdateTs: pool.lastUpdateTs.toNumber(),
          ratePerSec: pool.ratePerSec.toNumber(),
          bump: pool.bump,
          signerBump: pool.signerBump,
        });

        // Fetch User only if the PDA exists
        const userPDA = userPda(program.programId, poolPDA, pk(walletAddress));
        const userInfo = await connection.getAccountInfo(userPDA);
        if (userInfo) {
          const user = await (program.account as any).user.fetch(userPDA);
          setUserData({
            owner: user.owner.toBase58(),
            staked: user.staked.toNumber(),
            debt: user.debt.toString(),
          });
        } else {
          setUserData(null);
        }
      } else {
        // no pool created yet
        setPoolData(null);
        setUserData(null);
      }
    } catch (e: any) {
      console.error('refreshData error:', e);
      setError(e?.message ?? 'Failed to refresh');
      // leave existing state as-is or null it safely:
      if (!poolData) {
      setPoolData(null);
      setUserData(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const autoDetectPool = async () => {
    if (!walletAddress) return;
    
    try {
      console.log('🔍 Auto-detecting pool...');
      
      // Try to find the pool by checking common staking mints
      // For now, we'll use a hardcoded mint, but this could be made configurable
      const commonStakingMints = [
        '8AzxGFi1MbAxv2t7KHUWPUgYKvR641UTD6hMDFXfAy77', // Your current mint
        // Add more common mints here if needed
      ];
      
      for (const mint of commonStakingMints) {
        try {
          console.log(`Checking mint: ${mint}`);
          await fetchPoolByMint(mint);
          setStakingMint(mint);
          console.log(`✅ Pool found for mint: ${mint}`);
          return; // Exit early if pool found
        } catch (error) {
          console.log(`❌ No pool found for mint: ${mint}`);
          continue;
        }
      }
      
      console.log('❌ No pool found for any common mints');
    } catch (error) {
      console.log('❌ Auto-detection failed:', error);
    }
  };

  const fetchPoolByMint = async (stakingMintStr: string) => {
    if (!walletAddress) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching pool for staking mint:', stakingMintStr);
      
      // Create wallet adapter
      const wallet = {
        publicKey: pk(walletAddress),
        signTransaction: async (tx: any) => {
          if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
            return await (window as any).solana.signTransaction(tx);
          }
          throw new Error('Wallet not connected');
        },
        signAllTransactions: async (txs: any[]) => {
          if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
            return await (window as any).solana.signAllTransactions(txs);
          }
          throw new Error('Wallet not connected');
        }
      };

      const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
      const program = await loadProgram(provider);

      // Derive the pool PDA for the given staking mint
      const stakingMint = new PublicKey(stakingMintStr);
      const poolPDA = poolPda(program.programId, stakingMint);
      
      console.log('Pool PDA:', poolPDA.toBase58());
      
      // Fetch the pool data
      const pool = await (program.account as any).pool.fetch(poolPDA);
      console.log('Pool data fetched:', pool);
      
      setPoolData({
        poolAddress: poolPDA.toString(),
        admin: pool.admin.toString(),
        stakingMint: pool.stakingMint.toString(),
        rewardMint: pool.rewardMint.toString(),
        stakingVault: pool.stakingVault.toString(),
        rewardVault: pool.rewardVault.toString(),
        totalStaked: pool.totalStaked.toNumber(),
        accScaled: pool.accScaled.toString(),
        lastUpdateTs: pool.lastUpdateTs.toNumber(),
        ratePerSec: pool.ratePerSec.toNumber(),
        bump: pool.bump,
        signerBump: pool.signerBump,
      });

      // Try to fetch user data if available
      try {
        const userPDA = userPda(program.programId, poolPDA, new PublicKey(walletAddress));
        const user = await (program.account as any).user.fetch(userPDA);
        setUserData({
          owner: user.owner.toString(),
          staked: user.staked.toNumber(),
          debt: user.debt.toString(),
        });
        console.log('User data fetched:', user);
      } catch (userError) {
        console.log('User account not found yet (normal for new users):', userError);
        setUserData(null);
      }
      
      console.log('✅ Pool data loaded successfully');
      
    } catch (e: any) {
      console.error('❌ Failed to fetch pool:', e);
      setError(e?.message ?? 'Failed to fetch pool data');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  // --- Actions ---------------------------------------------------------------

  const initializePool = async (stakingMint: string) => {
    if (!isAdmin || !walletAddress) throw new Error('Only admin can initialize pool');

    setIsLoading(true); 
    setError(null);

    try {
      if (typeof window === 'undefined' || !window.solana?.isPhantom) {
        throw new Error('Phantom wallet not detected');
      }
      if (!(window.solana as any).isConnected) {
        await window.solana.connect();
      }

      // Wallet adapter for init
      const wallet = {
        publicKey: pk(walletAddress),
        signTransaction: async (tx: any) => (window as any).solana.signTransaction(tx),
        signAllTransactions: async (txs: any[]) => (window as any).solana.signAllTransactions(txs),
      };

      // Initialize on-chain (creates Pool PDA + stakingVault ATA)
      const initRes = await initializeOnly(stakingMint, wallet);

      // Save pool basics in state; reward fields default until setRewardConfig
      setPoolData({
        poolAddress: initRes.pool,
        admin: initRes.admin,
        stakingMint: initRes.stakingMint,
        rewardMint: '11111111111111111111111111111111',
        stakingVault: initRes.stakingVault,
        rewardVault: '11111111111111111111111111111111',
        totalStaked: Number(initRes.totalStaked),
        accScaled: '0',
        lastUpdateTs: Math.floor(Date.now() / 1000),
        ratePerSec: Number(initRes.ratePerSec),
        bump: 0,
        signerBump: 0,
      });

      // Pull fresh Pool/User from chain
      await refreshData();
    } catch (e: any) {
      console.error('initializePool error:', e);
      
      // Check if pool already exists
      if (e?.message?.includes('already in use') || e?.logs?.some((log: string) => log.includes('already in use'))) {
        console.log('Pool already exists, fetching existing pool data...');
        
        try {
          // Derive the pool PDA for the given staking mint
          const stakingMintPk = new PublicKey(stakingMint);
          const poolPDA = poolPda(PROGRAM_ID, stakingMintPk);
          
          console.log('Fetching existing pool at:', poolPDA.toBase58());
          
          // Load the existing pool data
          await refreshData();
          console.log('✅ Existing pool data loaded successfully');
          return; // Success - pool data is now loaded
        } catch (loadError) {
          console.error('Failed to load existing pool data:', loadError);
          setError('Pool exists but could not load data. Please refresh the page.');
          throw loadError;
        }
      }
      
      const msg = e?.message ?? 'Failed to initialize pool';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRate = async (humanRatePerSec: string | number) => {
    if (!isAdmin || !walletAddress || !poolData) throw new Error('Only admin can update rate');
    setIsLoading(true);
    setError(null);

    try {
      console.log('⚠️ updateRate instruction not available in current program');
      console.log('The program needs to be redeployed with updateRate instruction');
      console.log('Current workaround: You can manually update the rate by calling setRewardConfig again');
      console.log('But first, you need to reset the pool or use a different approach');
      
      setError('updateRate instruction not available. Program needs to be redeployed with this instruction.');
      throw new Error('updateRate instruction not available in current program'); 
    } catch (e: any) {
      console.error('❌ updateRate failed', e);
      setError(e?.message ?? 'Failed to update rate');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const setRewardConfig = async (rewardMint: string, ratePerSecHuman: number | string) => {
    if (!isAdmin || !walletAddress || !poolData) throw new Error('Only admin can set reward config');
    setIsLoading(true);
    setError(null);

    try {
      const wallet = {
        publicKey: pk(walletAddress),
        signTransaction: async (tx: any) => {
          if ((window as any).solana?.isPhantom) return await (window as any).solana.signTransaction(tx);
          throw new Error('Wallet not connected');
        },
        signAllTransactions: async (txs: any[]) => {
          if ((window as any).solana?.isPhantom) return await (window as any).solana.signAllTransactions(txs);
          throw new Error('Wallet not connected');
        },
      };

      const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
      const program = await loadProgram(provider);

      const poolPDA = pk(poolData.poolAddress);
      const signerPDA = signerPda(program.programId, poolPDA);
      const rewardMintPk = pk(rewardMint);

      // ---- SCALE ratePerSec (UI → base units) precisely (no truncation to 0) ----
      const { getMint } = await import('@solana/spl-token');
      const mintInfo = await getMint(connection, rewardMintPk);
      const decimals = mintInfo.decimals ?? 0;

      // Convert a decimal string/number to BN in base units
      const toBaseUnits = (x: string | number, dec: number) => {
        const s = String(x);
        if (!s.includes('.')) return new BN(s).mul(new BN(10).pow(new BN(dec)));
        const [intPart, fracPartRaw] = s.split('.');
        const fracPart = (fracPartRaw + '0'.repeat(dec)).slice(0, dec); // right-pad
        const whole = intPart ? new BN(intPart) : new BN(0);
        const frac = fracPart ? new BN(fracPart) : new BN(0);
        return whole.mul(new BN(10).pow(new BN(dec))).add(frac);
      };

      const ratePerSecBase = toBaseUnits(ratePerSecHuman, decimals);
      if (ratePerSecBase.isZero()) {
        console.warn('ratePerSec scaled to 0; APY will remain 0. Use a larger rate or fewer decimals.');
      }

      // ---- IMPORTANT: reward_vault must be a NEW keypair signer (not an ATA) ----
      const { Keypair } = await import('@solana/web3.js');
      const rewardVaultKeypair = Keypair.generate();
      const rewardVault = rewardVaultKeypair.publicKey;

      console.log('SetRewardConfig accounts', {
        pool: poolPDA.toBase58(),
        admin: walletAddress,
        signer: signerPDA.toBase58(),
        rewardMint: rewardMintPk.toBase58(),
        rewardVault: rewardVault.toBase58(), // new random address, program will init it
      });

      console.log('Rate scaling:', {
        humanRate: ratePerSecHuman,
        decimals,
        baseRate: ratePerSecBase.toString(),
        baseRateNumber: ratePerSecBase.toNumber()
      });

      const sig = await program.methods
        .setRewardConfig(ratePerSecBase)
        .accounts({
          pool: poolPDA,
          admin: pk(walletAddress),
          rewardMint: rewardMintPk,
          signer: signerPDA,
          rewardVault,                        // new account to be created by the program
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, // not strictly needed, fine to include
        })
        .signers([rewardVaultKeypair])        // <- THIS IS THE CRITICAL PART
        .rpc();

      console.log('✅ setRewardConfig tx:', sig);
      await new Promise(r => setTimeout(r, 1200));
      await refreshData();
    } catch (e: any) {
      console.error('❌ setRewardConfig failed', e);
      setError(e?.message ?? 'Failed to set reward config');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const stake = async (amount: number) => {
    if (!walletAddress || !poolData) throw new Error('Wallet not connected or pool not initialized');
    setIsLoading(true); 
    setError(null);
    try {
      console.log('Staking tokens:', { amount, walletAddress, poolAddress: poolData.poolAddress });
      
      // Create wallet adapter
      const wallet = (window as any).solana;
      if (!wallet?.publicKey) throw new Error('Wallet not connected');
      
      const anchorWallet = {
        publicKey: pk(wallet.publicKey),
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      } as any;
      
      // Create provider and program
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
      const program = await loadProgram(provider);
      
      // Derive accounts
      const poolPDA = pk(poolData.poolAddress);
      const signerPDA = signerPda(program.programId, poolPDA);
      const userPDA = userPda(program.programId, poolPDA, pk(walletAddress));
      
      // Get user's staking ATA
      const userStakingAta = await getAssociatedTokenAddress(
        pk(poolData.stakingMint),
        pk(walletAddress)
      );
      
      // Get staking vault (from pool data)
      const stakingVault = pk(poolData.stakingVault);
      
      // Scale amount to base units using staking mint decimals
      const { getMint } = await import('@solana/spl-token');
      const stakeMintInfo = await getMint(connection, pk(poolData.stakingMint));
      const d = stakeMintInfo.decimals ?? 0;

      const toBaseUnits = (x: string | number, dec: number) => {
        const s = String(x);
        if (!s.includes('.')) return new BN(s).mul(new BN(10).pow(new BN(dec)));
        const [i, fRaw] = s.split('.');
        const f = (fRaw + '0'.repeat(dec)).slice(0, dec);
        const whole = i ? new BN(i) : new BN(0);
        return whole.mul(new BN(10).pow(new BN(dec))).add(new BN(f || '0'));
      };

      const amountBase = toBaseUnits(amount, d);

      console.log('Stake scaling:', {
        humanAmount: amount,
        decimals: d,
        baseAmount: amountBase.toString()
      });
      
      console.log('Stake accounts:', {
        owner: walletAddress,
        pool: poolPDA.toBase58(),
        signer: signerPDA.toBase58(),
        userStakingAta: userStakingAta.toBase58(),
        stakingVault: stakingVault.toBase58(),
        user: userPDA.toBase58(),
      });
      
      // Call stake instruction
      await program.methods
        .stake(amountBase)
        .accounts({
          owner: pk(walletAddress),
          pool: poolPDA,
          signer: signerPDA,
          userStakingAta,
          stakingVault,
          user: userPDA,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      console.log('✅ Stake successful');
      
      // Refresh data to show updated balances
      await refreshData();
      
    } catch (e: any) {
      console.error('❌ Stake failed:', e);
      setError(e?.message ?? 'Failed to stake');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const unstake = async (amount: number) => {
    if (!walletAddress || !poolData) throw new Error('Wallet not connected or pool not initialized');
    setIsLoading(true); 
    setError(null);
    try {
      console.log('Unstaking tokens:', { amount, walletAddress, poolAddress: poolData.poolAddress });
      
      // Create wallet adapter
      const wallet = {
        publicKey: pk(walletAddress),
        signTransaction: async (tx: any) => {
          if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
            return await (window as any).solana.signTransaction(tx);
          }
          throw new Error('Wallet not connected');
        },
        signAllTransactions: async (txs: any[]) => {
          if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
            return await (window as any).solana.signAllTransactions(txs);
          }
          throw new Error('Wallet not connected');
        }
      };

      // Create provider and program
      const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
      const program = await loadProgram(provider);
      
      // Derive accounts
      const poolPDA = pk(poolData.poolAddress);
      const signerPDA = signerPda(program.programId, poolPDA);
      const userPDA = userPda(program.programId, poolPDA, pk(walletAddress));
      
      // Get user's staking ATA
      const userStakingAta = await getAssociatedTokenAddress(
        pk(poolData.stakingMint),
        pk(walletAddress)
      );
      
      // Get staking vault (from pool data)
      const stakingVault = pk(poolData.stakingVault);
      
      // Scale amount to base units using staking mint decimals
      const { getMint } = await import('@solana/spl-token');
      const stakeMintInfo = await getMint(connection, pk(poolData.stakingMint));
      const d = stakeMintInfo.decimals ?? 0;

      const toBaseUnits = (x: string | number, dec: number) => {
        const s = String(x);
        if (!s.includes('.')) return new BN(s).mul(new BN(10).pow(new BN(dec)));
        const [i, fRaw] = s.split('.');
        const f = (fRaw + '0'.repeat(dec)).slice(0, dec);
        const whole = i ? new BN(i) : new BN(0);
        return whole.mul(new BN(10).pow(new BN(dec))).add(new BN(f || '0'));
      };

      const amountBase = toBaseUnits(amount, d);

      console.log('Unstake scaling:', {
        humanAmount: amount,
        decimals: d,
        baseAmount: amountBase.toString()
      });
      
      console.log('Unstake accounts:', {
        owner: walletAddress,
        pool: poolPDA.toBase58(),
        signer: signerPDA.toBase58(),
        stakingVault: stakingVault.toBase58(),
        userStakingAta: userStakingAta.toBase58(),
        user: userPDA.toBase58(),
      });
      
      // Call unstake instruction
      await program.methods
        .unstake(amountBase)
        .accounts({
          owner: pk(walletAddress),
          pool: poolPDA,
          signer: signerPDA,
          stakingVault,
          userStakingAta,
          user: userPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      
      console.log('✅ Unstake successful');
      await refreshData();
    } catch (e: any) {
      console.error('❌ Unstake failed:', e);
      setError(e?.message ?? 'Failed to unstake');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const claim = async () => {
    if (!walletAddress || !poolData) throw new Error('Wallet not connected or pool not initialized');
    setIsLoading(true); 
    setError(null);
    try {
      // TODO: implement claim with pool = pk(poolData.poolAddress)
      throw new Error('claim not yet implemented with clean approach');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to claim rewards');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const checkRewardVaultBalance = async (): Promise<number> => {
    if (!poolData) {
      console.log('No pool data available');
      return 0;
    }
    
    try {
      // Use the actual rewardVault address from poolData (not derived ATA)
      const rewardVaultPk = pk(poolData.rewardVault);
      
      const vaultBalance = await connection.getTokenAccountBalance(rewardVaultPk);
      console.log('Reward Vault Balance:', {
        vaultAddress: rewardVaultPk.toBase58(),
        balance: vaultBalance.value.uiAmount,
        balanceString: vaultBalance.value.uiAmountString,
        decimals: vaultBalance.value.decimals
      });
      
      return vaultBalance.value.uiAmount || 0;
    } catch (e) {
      console.error('Failed to check reward vault balance:', e);
      return 0;
    }
  };

  const computeApy = async () => {
    if (!poolData) return null;
    
    try {
      // Check if reward config is set
      if (!poolData.rewardMint || poolData.rewardMint === '11111111111111111111111111111111') {
        console.log('❌ Reward configuration not set');
        return null;
      }
      
      if (poolData.ratePerSec <= 0 || poolData.totalStaked <= 0) {
        console.log('❌ Invalid rate or staked amount');
        return null;
      }

      const stakingMintPk = new PublicKey(poolData.stakingMint);
      const rewardMintPk = new PublicKey(poolData.rewardMint);

      const { getMint } = await import('@solana/spl-token');
      const stakingInfo = await getMint(connection, stakingMintPk);
      const rewardInfo = await getMint(connection, rewardMintPk);

      const stakeDec = stakingInfo.decimals ?? 0;
      const rewDec = rewardInfo.decimals ?? 0;

      // Convert base units → UI units
      const ratePerSecUI = poolData.ratePerSec / (10 ** rewDec);
      const totalStakedUI = poolData.totalStaked / (10 ** stakeDec);

      if (totalStakedUI <= 0) return null;

      const secondsPerYear = 31_536_000;
      const yearlyRewards = ratePerSecUI * secondsPerYear;
      const apyDecimal = yearlyRewards / totalStakedUI;
      const apyPercent = apyDecimal * 100;

      const breakdown = {
        ratePerSecUI,
        totalStakedUI,
        yearlyRewards,
        secondsPerYear,
        apyPercent,
        decimals: { staking: stakeDec, reward: rewDec },
        baseUnits: { ratePerSec: poolData.ratePerSec, totalStaked: poolData.totalStaked }
      };

      console.log('🔍 APY Debugger:', breakdown);
      return breakdown;
    } catch (e) {
      console.error('Failed to compute APY:', e);
      return null;
    }
  };

  const checkCurrentPoolState = async () => {
    if (!poolData) {
      console.log('No pool data available');
      return;
    }
    
    try {
      console.log('🔍 Checking current pool state...');
      console.log('Current pool data:', {
        poolAddress: poolData.poolAddress,
        rewardMint: poolData.rewardMint,
        ratePerSec: poolData.ratePerSec,
        totalStaked: poolData.totalStaked,
        admin: poolData.admin
      });

      // Check if reward config is already set
      if (poolData.rewardMint && poolData.rewardMint !== '11111111111111111111111111111111') {
        console.log('✅ Reward configuration is already set!');
        console.log('Reward Mint:', poolData.rewardMint);
        console.log('Rate Per Second:', poolData.ratePerSec);
        
        // Compute APY with detailed breakdown
        const apyBreakdown = await computeApy();
        if (apyBreakdown) {
          console.log('Current APY:', `${apyBreakdown.apyPercent.toFixed(6)}%`);
        }
        
        // Check reward vault balance
        await checkRewardVaultBalance();
      } else {
        console.log('❌ Reward configuration not set yet');
        console.log('Reward Mint:', poolData.rewardMint);
        console.log('Rate Per Second:', poolData.ratePerSec);
      }
    } catch (e) {
      console.error('Failed to check pool state:', e);
    }
  };

  const addRewardTokens = async (amountHuman: number) => {
    if (!isAdmin || !walletAddress || !poolData) throw new Error('Only admin can add reward tokens');
    setIsLoading(true);
    setError(null);
    try {
      const wallet = {
        publicKey: pk(walletAddress),
        signTransaction: async (tx: any) => {
          if ((window as any).solana?.isPhantom) return await (window as any).solana.signTransaction(tx);
          throw new Error('Wallet not connected');
        },
        signAllTransactions: async (txs: any[]) => {
          if ((window as any).solana?.isPhantom) return await (window as any).solana.signAllTransactions(txs);
          throw new Error('Wallet not connected');
        },
      };
      const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
      const program  = await loadProgram(provider);

      const poolPDA    = pk(poolData.poolAddress);
      const signerPDA  = signerPda(program.programId, poolPDA);
      const rewardMint = pk(poolData.rewardMint);
      if (!rewardMint) throw new Error('Reward mint not configured yet');

      // Derive vault ATA (owner = signerPDA)
      const rewardVault = await getAssociatedTokenAddress(rewardMint, signerPDA, true);

      // Admin's ATA (source)
      const adminRewardAta = await getAssociatedTokenAddress(rewardMint, pk(walletAddress));

      // Check balances before transfer
      try {
        const adminBalance = await connection.getTokenAccountBalance(adminRewardAta);
        console.log('Admin balance before transfer:', adminBalance.value.uiAmount);
      } catch (e) {
        console.log('Could not check admin balance:', e);
      }

      // Ensure the vault exists (idempotent create)
      const vaultInfo = await connection.getAccountInfo(rewardVault);
      const { createAssociatedTokenAccountInstruction, getMint, createTransferCheckedInstruction } =
        await import('@solana/spl-token');
      const { Transaction } = await import('@solana/web3.js');

      const tx = new Transaction();

      if (!vaultInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            pk(walletAddress),   // payer
            rewardVault,         // ata to create
            signerPDA,           // owner (off-curve PDA)
            rewardMint           // mint
          )
        );
      }

      // Fetch decimals and convert human → base units
      const mintInfo = await getMint(connection, rewardMint);
      const decimals = mintInfo.decimals ?? 0;

      // Use BigInt for safe scaling
      const scale = BigInt(10) ** BigInt(decimals);
      const amountBaseUnits = BigInt(Math.trunc(amountHuman)) * scale;  // if you allow fractional human input, parse as string and scale precisely

      // createTransferCheckedInstruction(amount: number | bigint)
      tx.add(
        createTransferCheckedInstruction(
          adminRewardAta,        // source (admin)
          rewardMint,            // mint
          rewardVault,           // destination (signerPDA's ATA)
          pk(walletAddress),     // owner (admin)
          amountBaseUnits,       // base units
          decimals               // decimals
        )
      );

      console.log('Sending addRewardTokens tx…', {
        pool: poolPDA.toBase58(),
        signer: signerPDA.toBase58(),
        rewardMint: rewardMint.toBase58(),
        rewardVault: rewardVault.toBase58(),
        adminRewardAta: adminRewardAta.toBase58(),
        decimals,
        amountBaseUnits: amountBaseUnits.toString(),
      });

      const txSignature = await provider.sendAndConfirm(tx);
      console.log('Transfer transaction signature:', txSignature);

      // Check balances after transfer
      try {
        const adminBalanceAfter = await connection.getTokenAccountBalance(adminRewardAta);
        const vaultBalance = await connection.getTokenAccountBalance(rewardVault);
        console.log('Balances after transfer:', {
          adminBalance: adminBalanceAfter.value.uiAmount,
          vaultBalance: vaultBalance.value.uiAmount,
          vaultAddress: rewardVault.toBase58()
        });
      } catch (e) {
        console.log('Could not check balances after transfer:', e);
      }

      console.log('✅ Reward tokens transferred into vault');
      await refreshData();
    } catch (e: any) {
      console.error('❌ addRewardTokens failed', e);
      setError(e?.message ?? 'Failed to add reward tokens');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  // --- Context value ---------------------------------------------------------

  const value: StakingContextType = {
    connection,
    walletAddress,
    isAdmin,
    poolData,
    userData,
    isLoading,
    error,
    stakingMint,
    initializePool,
    fetchPoolByMint,
    setRewardConfig,
    updateRate,
    addRewardTokens,
    checkRewardVaultBalance,
    checkCurrentPoolState,
    computeApy,
    stake,
    unstake,
    claim,
    refreshData,
  };

  return <StakingContext.Provider value={value}>{children}</StakingContext.Provider>;
}

export function useStaking() {
  const ctx = useContext(StakingContext);
  if (!ctx) throw new Error('useStaking must be used within a StakingProvider');
  return ctx;
}
