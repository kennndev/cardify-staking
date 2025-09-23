'use client';

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardCards from './components/DashboardCards';
import Navigation from './components/Navigation';
import TokenAnalytics from './components/TokenAnalytics';
import StakingSection from './components/StakingSection';
import AdminSection from './components/AdminSection';
import { useStaking } from './contexts/StakingContext';

export default function Home() {
  const [activeSection, setActiveSection] = useState('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { poolData } = useStaking();

  // Helper function to format token amounts (assuming 9 decimals like SOL)
  const formatTokenAmount = (amount: number, decimals: number = 9) => {
    return (amount / Math.pow(10, decimals)).toFixed(6);
  };

  // Log APY calculation details
  if (poolData) {
    const ratePerSec = poolData.ratePerSec || 0;
    const totalStakedRaw = poolData.totalStaked || 0;
    const totalStakedFormatted = formatTokenAmount(totalStakedRaw);
    const secondsPerYear = 31536000;
    const apy = totalStakedRaw > 0 ? (ratePerSec * secondsPerYear / totalStakedRaw * 100) : 0;
    
    console.log('Dashboard APY Calculation:', {
      ratePerSec,
      totalStaked: totalStakedRaw,
      totalStakedFormatted,
      secondsPerYear,
      apy: apy.toFixed(6) + '%',
      formula: `(${ratePerSec} * ${secondsPerYear} / ${totalStakedRaw}) * 100 = ${apy.toFixed(6)}%`,
      poolData: {
        poolAddress: poolData.poolAddress,
        rewardMint: poolData.rewardMint,
        stakingMint: poolData.stakingMint
      }
    });
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'TOKEN ANALYTICS':
        return <TokenAnalytics />;
      case 'STAKING':
        return <StakingSection />;
      case 'ADMIN':
        return <AdminSection />;
      default:
        return (
          <>
            {/* Navigation */}
            <Navigation />
            
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
              <DashboardCards />
            </div>
            
            {/* APY Rate Display */}
            <div className="mb-6 md:mb-8">
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Current APY Rate</h2>
                    <p className="text-gray-300 text-sm md:text-base">Annual Percentage Yield for staking rewards</p>
                  </div>
                  <div className="text-left md:text-right">
                    <div className="text-3xl md:text-4xl font-bold text-yellow-400">
                      {poolData && poolData.totalStaked > 0 ? 
                        `${((poolData.ratePerSec || 0) * 31536000 / poolData.totalStaked * 100).toFixed(2)}%` : 
                        '0%'}
                    </div>
                    <div className="text-sm text-gray-300">
                      Rate: {poolData ? `${poolData.ratePerSec || 0}/sec` : '0/sec'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Total Staked: {poolData ? poolData.totalStaked.toLocaleString() : '0'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Staking Analytics Charts */}
            <div className="space-y-4 md:space-y-6">
              {/* First Row - Two Large Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Staking Performance Chart */}
                <div className="card-gradient rounded-xl p-4 md:p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-white">STAKING PERFORMANCE</h3>
                    <div className="flex space-x-2">
                      <button className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <span className="text-white text-xs">+</span>
                      </button>
                      <button className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <span className="text-white text-xs">×</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Horizontal Bar Chart */}
                  <div className="space-y-4">
                    {[
                      { label: 'TOTAL STAKED', value: 85, color: 'bg-pink-500' },
                      { label: 'REWARD RATE', value: 72, color: 'bg-purple-500' },
                      { label: 'POOL HEALTH', value: 95, color: 'bg-teal-500' },
                      { label: 'ACTIVE USERS', value: 78, color: 'bg-blue-500' },
                      { label: 'APY ESTIMATE', value: 68, color: 'bg-green-500' }
                    ].map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">{item.label}</span>
                          <span className="text-white font-medium">{item.value}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full ${item.color}`}
                            style={{ width: `${item.value}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Staking Overview Chart */}
                <div className="card-gradient rounded-xl p-4 md:p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-white">STAKING OVERVIEW</h3>
                    <div className="flex space-x-2">
                      <button className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <span className="text-white text-xs">+</span>
                      </button>
                      <button className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <span className="text-white text-xs">×</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-6xl font-bold text-white mb-4">90</div>
                    <div className="text-sm text-gray-300 mb-6">TOKENS STAKED</div>
                    
                    {/* Waveform Chart */}
                    <div className="flex items-end justify-center space-x-1 h-16">
                      {[2, 4, 6, 8, 5, 3, 7, 9, 6, 4, 8, 5, 3, 6, 4, 2, 5, 7, 9, 6].map((height, index) => (
                        <div
                          key={index}
                          className="bg-blue-500 rounded-t"
                          style={{ height: `${height * 4}px`, width: '4px' }}
                        ></div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-400 mt-4">
                      <span>Total Pool</span>
                      <span>Your Stake</span>
                      <span>Rate/sec</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Second Row - Four Medium Charts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Portfolio Distribution */}
                <div className="card-gradient rounded-xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">PORTFOLIO</h3>
                    <div className="flex space-x-2">
                      <button className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <span className="text-white text-xs">+</span>
                      </button>
                      <button className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <span className="text-white text-xs">×</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Donut Chart */}
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-8 border-teal-500"></div>
                    <div className="absolute inset-0 rounded-full border-8 border-pink-500 border-t-0"></div>
                    <div className="absolute inset-0 rounded-full border-8 border-orange-500 border-t-0 border-r-0"></div>
                    <div className="absolute inset-0 rounded-full border-8 border-purple-500 border-t-0 border-r-0 border-b-0"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">+0.1K</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-300">90 total</span>
                      <span className="text-teal-400">●</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">90 your stake</span>
                      <span className="text-pink-400">●</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">0/sec rate</span>
                      <span className="text-orange-400">●</span>
                    </div>
                  </div>
                </div>

                {/* Staking Performance */}
                <div className="card-gradient rounded-xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">STAKING</h3>
                    <div className="flex space-x-2">
                      <button className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <span className="text-white text-xs">+</span>
                      </button>
                      <button className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <span className="text-white text-xs">×</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Vertical Bar Chart */}
                  <div className="flex items-end justify-between h-20 space-x-2">
                    {[
                      { height: 60, color: 'bg-teal-500', label: 'POOL' },
                      { height: 40, color: 'bg-yellow-500', label: 'STAKE' },
                      { height: 80, color: 'bg-pink-500', label: 'RATE' },
                      { height: 30, color: 'bg-purple-500', label: 'HEALTH' }
                    ].map((bar, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div
                          className={`w-6 rounded-t ${bar.color}`}
                          style={{ height: `${bar.height}px` }}
                        ></div>
                        <span className="text-xs text-gray-300 mt-1">{bar.label}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-400 mt-4">
                    <span>POOL</span>
                    <span>STAKE</span>
                    <span>RATE</span>
                  </div>
                </div>

                {/* Pool Health */}
                <div className="card-gradient rounded-xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">POOL HEALTH</h3>
                    <div className="flex space-x-2">
                      <button className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <span className="text-white text-xs">+</span>
                      </button>
                      <button className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <span className="text-white text-xs">×</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Concentric Circles */}
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-pink-500"></div>
                    <div className="absolute inset-2 rounded-full border-4 border-yellow-500"></div>
                    <div className="absolute inset-4 rounded-full border-4 border-teal-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">0.1K</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xs text-gray-300">Pool Health</div>
                    <div className="text-xs text-green-400">0.1%</div>
                  </div>
                </div>

                {/* Token Chart */}
                <div className="card-gradient rounded-xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">TOKEN</h3>
                    <div className="flex space-x-2">
                      <button className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <span className="text-white text-xs">+</span>
                      </button>
                      <button className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <span className="text-white text-xs">×</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Token Info Display */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">8Azx</div>
                    <div className="text-sm text-gray-300 mb-4">8Azx...Ay77</div>
                    
                    {/* Token Stats */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Total Supply:</span>
                        <span className="text-white">90</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Your Stake:</span>
                        <span className="text-white">90</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Rate:</span>
                        <span className="text-white">0/sec</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </>
        );
    }
  };

  return (
    <div className="min-h-screen dashboard-gradient">
      <div className="flex">
        {/* Sidebar - Hidden on mobile, shown on desktop */}
        <Sidebar 
          activeSection={activeSection} 
          setActiveSection={setActiveSection}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:ml-0">
          {/* Header */}
          <Header 
            onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            isMobileMenuOpen={isMobileMenuOpen}
          />
          
          {/* Dashboard Content */}
          <main className="flex-1 p-4 md:p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
