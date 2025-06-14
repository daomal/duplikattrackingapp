import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getShipments, updateShipment } from "@/lib/shipmentService";
import { Shipment } from "@/lib/types";
import { toast } from "sonner";
import { Truck, MapPin, Building, FileText, CheckCircle, AlertTriangle, LogOut } from "lucide-react";
import { CONSTRAINT_OPTIONS } from "@/lib/constants";
import { format } from "date-fns";

const DriverDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingShipment, setUpdatingShipment] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      navigate('/auth');
      return;
    }

    // Redirect if user is admin
    if (profile?.role === 'admin') {
      navigate('/admin');
      return;
    }

    fetchDriverShipments();
  }, [user, profile, navigate]);

  const fetchDriverShipments = async () => {
    setIsLoading(true);
    try {
      const allShipments = await getShipments();
      
      // Filter shipments for current driver that are pending
      const driverShipments = allShipments.filter(shipment => 
        shipment.status === 'tertunda' && 
        shipment.supir === profile?.name
      );
      
      setShipments(driverShipments);
    } catch (error) {
      console.error("Error fetching driver shipments:", error);
      toast.error("Gagal memuat data pengiriman");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteDelivery = async (shipment: Shipment) => {
    setUpdatingShipment(shipment.id);
    
    try {
      const now = new Date();
      const currentTime = format(now, "HH:mm");
      const currentDate = format(now, "yyyy-MM-dd");
      
      await updateShipment(shipment.id, {
        status: "terkirim",
        tanggalTiba: currentDate,
        waktuTiba: currentTime,
        kendala: null
      });
      
      toast.success("Pengiriman berhasil diselesaikan!");
      fetchDriverShipments(); // Refresh the list
    } catch (error) {
      console.error("Error completing delivery:", error);
      toast.error("Gagal menyelesaikan pengiriman");
    } finally {
      setUpdatingShipment(null);
    }
  };

  const handleReportIssue = async (shipment: Shipment) => {
    // Create constraint options string for prompt
    const constraintList = CONSTRAINT_OPTIONS.map((option, index) => 
      `${index + 1}. ${option}`
    ).join('\n');
    
    const promptMessage = `Pilih kendala yang terjadi:\n\n${constraintList}\n\nMasukkan nomor pilihan (1-${CONSTRAINT_OPTIONS.length}) atau ketik kendala lainnya:`;
    
    const userInput = window.prompt(promptMessage);
    
    if (userInput === null) {
      return; // User cancelled
    }
    
    let selectedConstraint = "";
    
    // Check if user entered a number
    const choiceNumber = parseInt(userInput.trim());
    if (!isNaN(choiceNumber) && choiceNumber >= 1 && choiceNumber <= CONSTRAINT_OPTIONS.length) {
      selectedConstraint = CONSTRAINT_OPTIONS[choiceNumber - 1];
    } else if (userInput.trim()) {
      selectedConstraint = userInput.trim();
    } else {
      toast.error("Kendala tidak boleh kosong");
      return;
    }
    
    setUpdatingShipment(shipment.id);
    
    try {
      await updateShipment(shipment.id, {
        status: "gagal",
        kendala: selectedConstraint
      });
      
      toast.success("Kendala berhasil dilaporkan");
      fetchDriverShipments(); // Refresh the list
    } catch (error) {
      console.error("Error reporting issue:", error);
      toast.error("Gagal melaporkan kendala");
    } finally {
      setUpdatingShipment(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data pengiriman...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex flex-col space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Truck className="h-8 w-8 text-blue-600" />
                Dashboard Supir
              </h1>
              <p className="text-gray-600">
                Selamat datang, <span className="font-semibold">{profile?.name || user?.email}</span>
              </p>
            </div>
            
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="bg-white/80 hover:bg-white"
              >
                Dashboard Utama
              </Button>
              <Button 
                variant="outline" 
                onClick={() => signOut()}
                className="bg-white/80 hover:bg-white text-red-600 hover:text-red-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>

          {/* Stats Card */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Ringkasan Tugas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{shipments.length}</div>
                  <div className="text-sm text-gray-600">Tugas Tertunda</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-gray-600">Selesai Hari Ini</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {shipments.reduce((total, shipment) => total + shipment.qty, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Qty</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipments List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Daftar Tugas Pengiriman
            </h2>
            
            {shipments.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Truck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      Tidak Ada Tugas Tertunda
                    </h3>
                    <p className="text-gray-500">
                      Saat ini tidak ada pengiriman yang perlu diselesaikan.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shipments.map((shipment) => (
                  <Card 
                    key={shipment.id} 
                    className="bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <Building className="h-5 w-5 text-blue-600" />
                          {shipment.perusahaan}
                        </CardTitle>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Tertunda
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">No. SJ:</span>
                          <span className="text-gray-600">{shipment.noSuratJalan}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Tujuan:</span>
                          <span className="text-gray-600">{shipment.tujuan}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Qty:</span>
                          <span className="text-gray-600">{shipment.qty}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Tanggal Kirim:</span>
                          <span className="text-gray-600">{shipment.tanggalKirim}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 pt-4 border-t">
                        <Button
                          onClick={() => handleCompleteDelivery(shipment)}
                          disabled={updatingShipment === shipment.id}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {updatingShipment === shipment.id ? "Memproses..." : "✅ Sampai Tujuan"}
                        </Button>
                        
                        <Button
                          onClick={() => handleReportIssue(shipment)}
                          disabled={updatingShipment === shipment.id}
                          variant="destructive"
                          className="w-full"
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          {updatingShipment === shipment.id ? "Memproses..." : "⚠️ Ada Kendala"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;