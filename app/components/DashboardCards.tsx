'use client';

import { useStaking } from '../contexts/StakingContext';
import { usePendingRewards } from '../hooks/usePendingRewards';

export default function DashboardCards() {
  const { poolData, userData, stakingMint, stakingDecimals, rewardDecimals } = useStaking();
  
  // Calculate live pending rewards and APY
  const liveRewards = usePendingRewards(poolData, userData);

  // Helper function to format token amounts using dynamic decimals
  const formatTokenAmount = (amount: number, decimals: number = stakingDecimals) => {
    return (amount / Math.pow(10, decimals)).toFixed(0);
  };

  // Log APY calculation details
  if (poolData) {
    const ratePerSec = poolData.ratePerSec || 0;
    const totalStakedRaw = poolData.totalStaked || 0;
    const totalStakedFormatted = formatTokenAmount(totalStakedRaw);
    const secondsPerYear = 31536000;
    const apy = totalStakedRaw > 0 ? (ratePerSec * secondsPerYear / totalStakedRaw * 100) : 0;
    
    console.log('APY Calculation:', {
      ratePerSec,
      totalStaked: totalStakedRaw,
      totalStakedFormatted,
      secondsPerYear,
      apy: apy.toFixed(6) + '%',
      formula: `(${ratePerSec} * ${secondsPerYear} / ${totalStakedRaw}) * 100 = ${apy.toFixed(6)}%`
    });
  }

  const cards = [
    {
      title: 'APY RATE',
      value: liveRewards ? `${liveRewards.apy.toFixed(2)}%` : '0%',
      subtitle: poolData ? `Rate: ${poolData.ratePerSec || 0}/sec` : 'ANNUAL PERCENTAGE YIELD',
      icon: '📈',
      color: 'from-yellow-400 to-orange-500',
      bgColor: 'bg-gradient-to-r from-yellow-400/20 to-orange-500/20'
    },
    {
      title: 'STAKED AMOUNT',
      value: userData ? formatTokenAmount(userData.staked || 0) : '0',
      subtitle: `${stakingMint ? stakingMint.slice(0, 4) : 'TOKEN'} TOKENS STAKED`,
      icon: '💰',
      color: 'from-blue-400 to-purple-500',
      bgColor: 'bg-gradient-to-r from-blue-400/20 to-purple-500/20'
    },
    {
      title: 'TOTAL POOL',
      value: poolData ? formatTokenAmount(poolData.totalStaked || 0) : '0',
      subtitle: 'TOTAL STAKED IN POOL',
      icon: '🎯',
      color: 'from-teal-400 to-green-500',
      bgColor: 'bg-gradient-to-r from-teal-400/20 to-green-500/20'
    },
    {
      title: 'REWARD RATE',
      value: poolData ? `${poolData.ratePerSec || 0}/sec` : '0/sec',
      subtitle: 'REWARDS PER SECOND',
      icon: '💎',
      color: 'from-pink-400 to-red-500',
      bgColor: 'bg-gradient-to-r from-pink-400/20 to-red-500/20'
    }
  ];

  return (
    <>
      {cards.map((card, index) => (
        <div key={index} className={`card-gradient rounded-xl p-4 md:p-6 border border-white/10 hover:border-white/20 transition-all duration-300 ${card.bgColor} mobile-card`}>
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-r ${card.color} flex items-center justify-center`}>
              <span className="text-xl md:text-2xl">{card.icon}</span>
            </div>
            <div className="flex space-x-1 md:space-x-2">
              <button className="w-6 h-6 md:w-6 md:h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center touch-target">
                <span className="text-white text-xs">+</span>
              </button>
              <button className="w-6 h-6 md:w-6 md:h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center touch-target">
                <span className="text-white text-xs">×</span>
              </button>
            </div>
          </div>
          
          <div className="space-y-1 md:space-y-2">
            <h3 className="text-2xl md:text-3xl font-bold text-white">{card.value}</h3>
            <p className="text-xs md:text-sm text-gray-300 font-medium">{card.title}</p>
            <p className="text-xs text-gray-400 leading-tight">{card.subtitle}</p>
          </div>
        </div>
      ))}
    </>
  );
}
