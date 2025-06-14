
import React, { useState, useEffect } from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { cn } from '@/lib/utils';

interface SplashScreenProps {
  onFinish: () => void;
  minDisplayTime?: number;
}

const SplashScreen = ({ onFinish, minDisplayTime = 2000 }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const startTime = Date.now();
    
    // This ensures the splash screen shows for at least minDisplayTime
    const timer = setTimeout(() => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      
      setTimeout(() => {
        setIsVisible(false);
        onFinish();
      }, remainingTime);
    }, 500); // Initial small delay to ensure assets are loaded
    
    return () => clearTimeout(timer);
  }, [minDisplayTime, onFinish]);

  if (!isVisible) return null;

  return (
    <div className={cn(
      "splash-screen",
      "fixed inset-0 z-50 flex flex-col items-center justify-center",
      "bg-gradient-to-br from-purple-600 to-indigo-800"
    )}>
      <div className="w-32 h-32 mb-8 relative">
        <AspectRatio ratio={1/1} className="bg-white/10 rounded-full p-2">
          <div className="splash-logo flex items-center justify-center h-full w-full">
            <img 
              src="/logo512.png" 
              alt="Cargo Compass Logo" 
              className="w-full h-full object-contain animate-pulse"
            />
          </div>
        </AspectRatio>
      </div>
      
      <h1 className="splash-title text-white text-2xl font-bold mb-2">
        TrackShip Cargo Compass
      </h1>
      
      <p className="splash-subtitle text-white/80 text-sm mb-8">
        Solusi Pengiriman Terpadu
      </p>
      
      <div className="splash-loader w-48 h-1 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white animate-[loading_1.5s_ease-in-out_infinite]"></div>
      </div>
    </div>
  );
};

export default SplashScreen;
