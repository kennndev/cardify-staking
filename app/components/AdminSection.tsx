'use client';

import { useState } from 'react';
import { useStaking } from '../contexts/StakingContext';

export default function AdminSection() {
  const { isAdmin, poolData, isLoading, error, initializePool, fetchPoolByMint, setRewardConfig, updateRate, addRewardTokens } = useStaking();
  const [stakingMint, setStakingMint] = useState('');
  const [rewardMint, setRewardMint] = useState('');
  const [ratePerSec, setRatePerSec] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [updateRateValue, setUpdateRateValue] = useState('');

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300">Only admin wallets can access this page.</p>
        </div>
      </div>
    );
  }

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await initializePool(stakingMint);
      alert('Pool initialized successfully!');
      setStakingMint('');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSetRewardConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setRewardConfig(rewardMint, parseFloat(ratePerSec));
      alert('Reward configuration set successfully!');
      setRewardMint('');
      setRatePerSec('');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAddRewardTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addRewardTokens(parseFloat(rewardAmount));
      alert('Reward tokens added successfully!');
      setRewardAmount('');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };


  const handleFetchPool = async () => {
    if (!stakingMint) {
      alert('Please enter a staking mint address first');
      return;
    }
    try {
      await fetchPoolByMint(stakingMint);
      alert('Pool data fetched successfully!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-300">Manage your staking pool</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pool Status */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Pool Status</h2>
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
                  {poolData.rewardMint === '11111111111111111111111111111111' ? 'Not Set' : poolData.rewardMint.slice(0, 8) + '...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Last Update:</span>
                <span className="text-white font-medium">
                  {new Date(poolData.lastUpdateTs * 1000).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Pool not initialized</p>
          )}
        </div>

        {/* Initialize Pool */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Initialize Pool</h2>
          <form onSubmit={handleInitialize} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">Staking Mint Address</label>
              <input
                type="text"
                value={stakingMint}
                onChange={(e) => setStakingMint(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter staking token mint address"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                {isLoading ? 'Initializing...' : 'Initialize Pool'}
              </button>
              <button
                type="button"
                onClick={handleFetchPool}
                disabled={isLoading || !stakingMint}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Fetch Pool'}
              </button>
            </div>
          </form>
        </div>

            {/* Set Reward Configuration */}
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Set Reward Configuration</h2>
              <form onSubmit={handleSetRewardConfig} className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Reward Mint Address</label>
                  <input
                    type="text"
                    value={rewardMint}
                    onChange={(e) => setRewardMint(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter reward token mint address"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Rate Per Second</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={ratePerSec}
                    onChange={(e) => setRatePerSec(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter rate per second (e.g., 0.000001)"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Example: 0.000001 = 1 token per 1,000,000 seconds ≈ 0.0864 tokens/day
                  </p>
                </div>
                <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
                  <div className="text-sm text-blue-300">
                    <strong>APY Calculation:</strong> {ratePerSec ? `${(parseFloat(ratePerSec) * 31536000).toFixed(6)}%` : '0%'} annual rate
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
                >
                  {isLoading ? 'Setting...' : 'Set Reward Config'}
                </button>
              </form>
            </div>

            {/* Update Rate - DISABLED */}
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">⚠️ Update Rate (Not Available)</h2>
              <div className="space-y-4">
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                  <div className="text-sm text-red-300">
                    <strong>Issue:</strong> updateRate instruction not available in current program
                  </div>
                  <div className="text-sm text-red-300 mt-2">
                    <strong>Solution:</strong> Use a different staking mint to create a new pool
                  </div>
                </div>
                <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
                  <div className="text-sm text-blue-300">
                    <strong>Current Rate:</strong> {poolData?.ratePerSec || 0} per second
                  </div>
                  <div className="text-sm text-blue-300">
                    <strong>Current APY:</strong> {poolData?.ratePerSec && poolData.ratePerSec > 0 ? 
                      `${((poolData.ratePerSec * 31536000) / (poolData.totalStaked || 1) * 100).toFixed(6)}%` : 
                      '0% (rate is 0)'
                    }
                  </div>
                </div>
                <button
                  disabled={true}
                  className="w-full bg-gray-500 text-white font-medium py-2 px-4 rounded-lg cursor-not-allowed"
                >
                  Update Rate (Not Available)
                </button>
                <p className="text-red-400 text-sm">
                  To fix this, use a different staking mint in &quot;Initialize Pool&quot; section
                </p>
              </div>
            </div>

            {/* Add Reward Tokens */}
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Add Reward Tokens</h2>
              <form onSubmit={handleAddRewardTokens} className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Amount to Add</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount of reward tokens to add"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    This will transfer tokens from your wallet to the reward vault
                  </p>
                </div>
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                  <div className="text-sm text-green-300">
                    <strong>Current Reward Mint:</strong> {poolData?.rewardMint ?
                      `${poolData.rewardMint.slice(0, 8)}...${poolData.rewardMint.slice(-8)}` :
                      'Not set'
                    }
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !poolData?.rewardMint || poolData.rewardMint === '11111111111111111111111111111111'}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
                >
                  {isLoading ? 'Adding...' : 'Add Reward Tokens'}
                </button>
                {(!poolData?.rewardMint || poolData.rewardMint === '11111111111111111111111111111111') && (
                  <p className="text-red-400 text-sm mt-2">
                    Please set reward configuration first
                  </p>
                )}
              </form>
            </div>
          </div>
      </div>
  );
}
