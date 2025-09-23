'use client';

import { useState } from 'react';
import { useStaking } from '../contexts/StakingContext';
import PoolSelector from './PoolSelector';

export default function StakingSection() {
  const { walletAddress, poolData, userData, isLoading, error, stake, unstake, claim, refreshData } = useStaking();
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');

  // Debug logging
  console.log('StakingSection state:', {
    walletAddress,
    poolData: poolData ? 'Available' : 'Not available',
    userData: userData ? 'Available' : 'Not available',
    isLoading,
    error
  });

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      alert('Please connect your wallet first');
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
    
    try {
      await claim();
      alert('Rewards claimed successfully!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const calculatePendingRewards = () => {
    if (!userData || !poolData) return 0;
    // Simplified calculation - in reality you'd use the contract's pending_rewards function
    return Math.floor(userData.staked * 0.1); // Placeholder calculation
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
                <span className="text-white font-medium">{poolData.totalStaked.toLocaleString()}</span>
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
                <span className="text-white font-medium">{userData.staked.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Pending Rewards:</span>
                <span className="text-green-400 font-medium">{calculatePendingRewards().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Reward Debt:</span>
                <span className="text-white font-medium">{userData.debt.toLocaleString()}</span>
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
              onClick={refreshData}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 touch-target"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
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
