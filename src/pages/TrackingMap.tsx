import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ShipmentMap from '@/components/ShipmentMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TrackingMap = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();

  // Redirect if not admin
  React.useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!isAdmin) {
      navigate('/');
      return;
    }
  }, [user, isAdmin, navigate]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Akses Ditolak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Halaman ini hanya dapat diakses oleh administrator.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate('/admin')}
                  className="shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <MapPin className="h-8 w-8 text-blue-600" />
                    Peta Pelacakan Real-time
                  </h1>
                  <p className="text-gray-600">
                    Pantau lokasi pengiriman secara real-time
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin')}
                className="bg-white/80 hover:bg-white"
              >
                Dashboard Admin
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="bg-white/80 hover:bg-white"
              >
                Dashboard Utama
              </Button>
            </div>
          </div>

          {/* Instructions Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800 text-lg">
                Cara Menggunakan Peta Pelacakan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <h4 className="font-semibold mb-2">📍 Marker Pengiriman:</h4>
                  <ul className="space-y-1">
                    <li>• Ikon truk biru menunjukkan lokasi supir</li>
                    <li>• Klik marker untuk melihat detail pengiriman</li>
                    <li>• Lokasi diperbarui secara otomatis setiap menit</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🔄 Update Real-time:</h4>
                  <ul className="space-y-1">
                    <li>• Peta akan menampilkan notifikasi saat lokasi berubah</li>
                    <li>• Hanya pengiriman berstatus "Tertunda" yang ditampilkan</li>
                    <li>• Data lokasi diambil dari GPS supir</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Map Component */}
          <ShipmentMap className="w-full" />

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informasi Teknis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">🛰️ Sumber Data GPS</h4>
                  <p className="text-gray-600">
                    Lokasi diambil dari aplikasi mobile supir menggunakan GPS device.
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">⏱️ Frekuensi Update</h4>
                  <p className="text-gray-600">
                    Lokasi diperbarui setiap 1 menit saat supir sedang dalam perjalanan.
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">🔒 Privasi & Keamanan</h4>
                  <p className="text-gray-600">
                    Data lokasi hanya dapat diakses oleh administrator yang berwenang.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrackingMap;