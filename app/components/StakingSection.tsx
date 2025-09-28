'use client';

import { useState, useEffect } from 'react';
import { useStaking } from '../contexts/StakingContext';
import PoolSelector from './PoolSelector';
import { formatToken } from '../utils/format';

export default function StakingSection() {
  const { walletAddress, poolData, userData, isLoading, error, stake, unstake, claim, refreshData, stakingDecimals, rewardDecimals, connection } = useStaking();
  
  // Helper function to format token amounts using dynamic decimals
  const formatTokenAmount = (amount: number, decimals: number = stakingDecimals) => {
    return formatToken(amount, decimals, 0, 0); // No decimals for staked amounts
  };
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  // Update time every second for real-time pending rewards
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);


  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (isLoading) {
      console.log('⚠️ Transaction already in progress, ignoring click');
      return;
    }
    
    try {
      await stake(parseFloat(stakeAmount));
      alert('Staked successfully!');
      setStakeAmount('');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleUnstake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (isLoading) {
      console.log('⚠️ Transaction already in progress, ignoring click');
      return;
    }
    
    try {
      await unstake(parseFloat(unstakeAmount));
      alert('Unstaked successfully!');
      setUnstakeAmount('');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleClaim = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (isLoading) {
      console.log('⚠️ Transaction already in progress, ignoring click');
      return;
    }
    
    try {
      await claim();
      alert('Rewards claimed successfully!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRefreshData = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      console.log('🔄 Manually refreshing data...');
      await refreshData();
      console.log('✅ Data refreshed');
    } catch (err) {
      console.error('❌ Failed to refresh data:', err);
      alert(`Error refreshing data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCheckRewardBalance = async () => {
    if (!walletAddress || !poolData) {
      alert('Please connect your wallet and ensure pool is loaded');
      return;
    }
    
    try {
      const { getAssociatedTokenAddress } = await import('@solana/spl-token');
      const { PublicKey } = await import('@solana/web3.js');
      
      const userRewardAta = await getAssociatedTokenAddress(
        new PublicKey(poolData.rewardMint),
        new PublicKey(walletAddress)
      );
      
      const balance = await connection.getTokenAccountBalance(userRewardAta);
      const uiAmount = Number(balance.value.amount) / Math.pow(10, rewardDecimals);
      
      console.log('💰 Current reward balance:', {
        baseUnits: balance.value.amount,
        uiAmount: uiAmount,
        decimals: rewardDecimals
      });
      
      alert(`Current reward balance: ${uiAmount.toFixed(8)} tokens`);
    } catch (err) {
      console.error('❌ Failed to check reward balance:', err);
      alert(`Error checking balance: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };



  // Constants for reward calculation
  // !!! matches the existing on-chain state (1e12 precision) !!!
  const SCALAR_BI = BigInt(1_000_000_000_000);  // 1e12 - matches deployed contract
  
  // TODO: Future improvement - derive from IDL to prevent drift:
  // const accPrecisionFromIdl = BigInt(
  //   program.idl.constants?.find(c => c.name === 'ACC_PRECISION')?.value ?? '1000000000000'
  // );
  // const SCALAR_BI = accPrecisionFromIdl;

  const computePending = ({
    pool,
    user,
    nowSecs
  }: {
    pool: { accScaled: string; lastUpdateTs: number; ratePerSec: number; totalStaked: number };
    user: { staked: number; debt: string; unpaidRewards: string };
    nowSecs: number;
  }) => {
    if (!pool || !user || pool.totalStaked === 0) return BigInt(0);

    const accScaled = BigInt(pool.accScaled ?? "0");
    const debt = BigInt(user.debt ?? "0");
    const unpaid = BigInt(user.unpaidRewards ?? "0");
    const staked = BigInt(user.staked ?? 0);

    const dt = BigInt(Math.max(0, nowSecs - (pool.lastUpdateTs ?? nowSecs)));
    const rate = BigInt(pool.ratePerSec ?? 0);
    const totalStaked = BigInt(pool.totalStaked ?? 0);


    // head-of-line accumulator: accScaled + (rate * dt / totalStaked) * SCALAR
    const accHead = accScaled + (rate * dt * SCALAR_BI) / (totalStaked === BigInt(0) ? BigInt(1) : totalStaked);

    // CORRECTED: reward part that belongs to the user, already in base units
    // Multiply first, then divide by SCALAR_BI
    const earned = (staked * accHead) / SCALAR_BI;

    // pending = unpaid + earned - debt (all in base units)
    // Safety guard: prevent underflow
    const pending = earned > debt ? unpaid + earned - debt : unpaid;


    return pending > BigInt(0) ? pending : BigInt(0); // base units of reward mint
  };

  const calculatePendingRewards = (): number => {
    if (!userData || !poolData) return 0;
    
    const now = currentTime;
    
    // Use the corrected BigInt calculation with proper SCALAR_BI
    const rawPending = computePending({
      pool: {
        accScaled: poolData.accScaled,
        lastUpdateTs: poolData.lastUpdateTs,
        ratePerSec: poolData.ratePerSec,
        totalStaked: poolData.totalStaked,
      },
      user: {
        staked: userData.staked,
        debt: userData.debt,
        unpaidRewards: userData.unpaidRewards,
      },
      nowSecs: now,
    });

    // Convert to UI using the reward mint decimals
    const pendingUi = rewardDecimals > 0 
      ? Number(rawPending) / Math.pow(10, rewardDecimals)
      : Number(rawPending);
    
    
    return pendingUi;
  };

  if (!walletAddress) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-300">Please connect your wallet to access the staking dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Staking Dashboard</h1>
        <p className="text-gray-300 text-sm md:text-base">Stake your tokens and earn rewards</p>
      </div>

      <PoolSelector />

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Pool Stats */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 md:p-6 mobile-card">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Pool Statistics</h3>
          {poolData ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Staked:</span>
                <span className="text-white font-medium">{formatTokenAmount(poolData.totalStaked)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Reward Rate:</span>
                <span className="text-white font-medium">{poolData.ratePerSec}/sec</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Reward Mint:</span>
                <span className="text-white font-medium">
                  {poolData.rewardMint === '11111111111111111111111111111111' ? 'Not Set' : 'Configured'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Pool data not available</p>
          )}
        </div>

        {/* User Stats */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 md:p-6 mobile-card">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Your Staking</h3>
          {userData ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Staked Amount:</span>
                <span className="text-white font-medium">{formatTokenAmount(userData.staked)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Pending Rewards:</span>
                <span className="text-green-400 font-medium">{formatToken(calculatePendingRewards() * Math.pow(10, rewardDecimals), rewardDecimals, 0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300 flex items-center">
                  Rewards Already&nbsp;Counted
                  <span className="ml-1 cursor-help" title={
                    "Internal amount already credited to you. " +
                    "Used to calculate new rewards accurately."
                  }>ⓘ</span>
                </span>
                <span className="text-white font-medium">{formatTokenAmount(Number(userData.debt))}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">No staking data available</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 md:p-6 mobile-card">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={handleClaim}
              disabled={isLoading || !userData || calculatePendingRewards() === 0}
              className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 touch-target"
            >
              {isLoading ? 'Processing...' : 'Claim Rewards'}
            </button>
            <button
              onClick={handleRefreshData}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 touch-target"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              onClick={handleCheckRewardBalance}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 touch-target mt-2"
            >
              Check Reward Balance
            </button>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Stake Tokens */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 md:p-6 mobile-card">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">Stake Tokens</h2>
          <form onSubmit={handleStake} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">Amount to Stake</label>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-target"
                placeholder="Enter amount to stake"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !poolData}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 touch-target"
            >
              {isLoading ? 'Staking...' : !poolData ? 'Pool not initialized' : 'Stake Tokens'}
            </button>
            {!poolData && (
              <p className="text-red-400 text-sm mt-2">
                Pool not initialized. Please initialize the pool first in the Admin section.
              </p>
            )}
          </form>
        </div>

        {/* Unstake Tokens */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 md:p-6 mobile-card">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">Unstake Tokens</h2>
          <form onSubmit={handleUnstake} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">Amount to Unstake</label>
              <input
                type="number"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-target"
                placeholder="Enter amount to unstake"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !poolData || !userData || userData.staked === 0}
              className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 touch-target"
            >
              {isLoading ? 'Unstaking...' : 'Unstake Tokens'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
