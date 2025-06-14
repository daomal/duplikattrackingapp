
import React from 'react';
import { Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const AppDownloadInfo = () => {
  return (
    <Alert className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <div className="flex items-start md:items-center flex-col md:flex-row justify-between gap-4">
        <div>
          <AlertTitle className="text-blue-700 dark:text-blue-300">
            Aplikasi Mobile Tersedia!
          </AlertTitle>
          <AlertDescription className="text-blue-600 dark:text-blue-400">
            Unduh aplikasi ini untuk akses lebih mudah di perangkat mobile Anda
          </AlertDescription>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          onClick={() => {
            // Memicu prompt instalasi PWA jika ada
            const promptEvent = window.deferredPrompt;
            if (promptEvent) {
              promptEvent.prompt();
              window.deferredPrompt = null;
            } else {
              // Jika tidak ada prompt instalasi, berikan instruksi manual
              alert('Untuk menginstal aplikasi ini: \n1. Buka menu browser Anda (tiga titik di kanan atas) \n2. Pilih "Tambahkan ke layar utama" atau "Instal aplikasi"');
            }
          }}
        >
          <Download className="h-4 w-4" /> Instal Aplikasi
        </Button>
      </div>
    </Alert>
  );
};

export default AppDownloadInfo;
