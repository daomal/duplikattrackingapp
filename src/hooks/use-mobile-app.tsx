
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

// Hook for checking if the app is running on a mobile device through Capacitor
export function useCapacitorApp() {
  const [isNative, setIsNative] = useState(false);
  
  useEffect(() => {
    // Check if the app is running on a native platform
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  return {
    isNative,
    platform: Capacitor.getPlatform(),
    isAndroid: Capacitor.getPlatform() === 'android',
    isIOS: Capacitor.getPlatform() === 'ios',
  };
}

// Hook for handling app status (foreground/background)
export function useAppState() {
  const [isActive, setIsActive] = useState(true);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsActive(document.visibilityState === 'visible');
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  return { isActive };
}
