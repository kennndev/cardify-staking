'use client';

import { useStaking } from '../contexts/StakingContext';

export default function TokenAnalytics() {
  const { stakingMint } = useStaking();



  if (!stakingMint) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Token Analytics</h1>
          <p className="text-gray-300">Connect to a staking pool to view token analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Full Screen DEX Screener Embed */}
      <div className="flex-1 relative">
        <iframe 
          src="https://dexscreener.com/solana/6mpafrxmywfyojaunxdqgw9sq2mhpuh3d6daw3xipump?embed=1&loadChartSettings=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=0&chartType=usd&interval=15"
          style={{
            width: '100%',
            height: '100%',
            border: 0
          }}
          title="DEX Screener Chart"
        />
      </div>
    </div>
  );
}
