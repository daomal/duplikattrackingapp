import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    try {
      // Check if app is already installed
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Store the event so it can be triggered later
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setIsInstallable(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      
      window.addEventListener('appinstalled', () => {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        toast.success('Aplikasi berhasil diinstall!');
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    } catch (error) {
      console.error("Error in InstallApp component:", error);
      // Fail safely without breaking the app
      return null;
    }
  }, []);

  const handleInstallClick = async () => {
    try {
      if (!deferredPrompt) {
        toast.info('Untuk menginstal aplikasi ini: \n1. Buka menu browser Anda (tiga titik di kanan atas) \n2. Pilih "Tambahkan ke layar utama" atau "Instal aplikasi"');
        return;
      }

      // Show the prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        toast.success('Aplikasi sedang diinstall');
      } else {
        toast.info('Instalasi dibatalkan');
      }
      
      // Clear the saved prompt since it can't be used again
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Error during installation:", error);
      toast.error('Terjadi kesalahan saat instalasi');
    }
  };

  // Register service worker with error handling and environment detection
  useEffect(() => {
    // Check if we're in a supported environment (not StackBlitz or other limited environments)
    const isStackBlitz = window.location.hostname.includes('stackblitz') || 
                        window.location.hostname.includes('webcontainer') ||
                        window.location.port === '8080';
    
    if ('serviceWorker' in navigator && !isStackBlitz) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          },
          err => {
            console.error('ServiceWorker registration failed: ', err);
          }
        );
      });
    } else if (isStackBlitz) {
      console.log('Service Worker registration skipped: Running in StackBlitz environment');
    }
  }, []);

  if (isInstalled) {
    return null; // Don't show if app is already installed
  }

  return isInstallable ? (
    <div className="fixed bottom-4 right-4 z-50">
      <Button 
        onClick={handleInstallClick} 
        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg border-0"
      >
        <DownloadIcon size={18} />
        Instal Aplikasi
      </Button>
    </div>
  ) : null;
};

export default InstallApp;