import React, { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, MapPin, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ShipmentTable from "@/components/ShipmentTable";
import DataFilters from "@/components/DataFilters";
import FileUploader from "@/components/FileUploader";
import ExportOptions from "@/components/ExportOptions";
import ShipmentForm from "@/components/ShipmentForm";
import { getShipments, subscribeToShipments } from "@/lib/shipmentService";
import { Shipment, FilterOptions, ShipmentStatus } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CompanyAnalytics from "@/components/CompanyAnalytics";
import AppDownloadInfo from "@/components/AppDownloadInfo";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Admin = () => {
  const { isAdmin, user, profile, signOut, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    dateRange: [null, null],
    status: "all",
    driver: "all",
    company: "all",
    searchQuery: ""
  });

  // Debug information
  useEffect(() => {
    console.log('Admin page - Auth state:', {
      user: user?.email,
      profile: profile,
      isAdmin,
      authLoading
    });
  }, [user, profile, isAdmin, authLoading]);

  // Check admin access
  useEffect(() => {
    if (authLoading) {
      console.log('Auth still loading...');
      return;
    }

    if (!user) {
      console.log('No user found, redirecting to auth');
      toast({
        title: "Akses ditolak",
        description: "Silakan login terlebih dahulu",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }
    
    if (!profile) {
      console.log('User found but no profile, waiting...');
      setError('Memuat profil pengguna...');
      return;
    }

    if (!isAdmin) {
      console.log('User is not admin, redirecting to home');
      toast({
        title: "Akses ditolak",
        description: "Anda tidak memiliki akses admin",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    // User is admin, clear any errors and fetch data
    setError(null);
    fetchShipments();
  }, [user, profile, isAdmin, authLoading, navigate, toast]);

  // Subscribe to real-time shipment updates
  useEffect(() => {
    if (!isAdmin || authLoading) return;

    const unsubscribe = subscribeToShipments((updatedShipments) => {
      setShipments(updatedShipments);
      applyFilters(updatedShipments, filterOptions);
    });

    return () => unsubscribe();
  }, [isAdmin, authLoading, filterOptions]);

  const fetchShipments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching shipments...');
      const data = await getShipments();
      console.log('Shipments fetched:', data.length);
      setShipments(data);
      applyFilters(data, filterOptions);
    } catch (error) {
      console.error("Error fetching shipments:", error);
      setError('Gagal memuat data pengiriman');
      toast({
        title: "Error",
        description: "Gagal memuat data pengiriman",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to apply filters
  const applyFilters = (data: Shipment[], filters: FilterOptions) => {
    let filtered = [...data];
    
    // Filter by search query
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const searchTerm = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(shipment => 
        shipment.noSuratJalan.toLowerCase().includes(searchTerm) ||
        shipment.perusahaan.toLowerCase().includes(searchTerm) ||
        shipment.tujuan.toLowerCase().includes(searchTerm) ||
        shipment.supir.toLowerCase().includes(searchTerm) ||
        (shipment.kendala && shipment.kendala.toLowerCase().includes(searchTerm))
      );
    }
    
    // Filter by date range
    if (filters.dateRange[0] && filters.dateRange[1]) {
      const startDate = filters.dateRange[0];
      const endDate = filters.dateRange[1];
      
      filtered = filtered.filter(shipment => {
        const shipmentDate = new Date(shipment.tanggalKirim);
        return shipmentDate >= startDate && shipmentDate <= endDate;
      });
    }
    
    // Filter by status
    if (filters.status !== "all") {
      filtered = filtered.filter(shipment => shipment.status === filters.status);
    }
    
    // Filter by driver
    if (filters.driver !== "all") {
      filtered = filtered.filter(shipment => shipment.supir === filters.driver);
    }
    
    // Filter by company
    if (filters.company && filters.company !== "all") {
      filtered = filtered.filter(shipment => shipment.perusahaan === filters.company);
    }
    
    setFilteredShipments(filtered);
  };

  // Function to handle filtering
  const handleFilter = (filters: FilterOptions) => {
    setFilterOptions(filters);
    applyFilters(shipments, filters);
  };

  // Extract all drivers for filter and form
  const drivers = Array.from(new Set(shipments.map(s => s.supir))).filter(Boolean);
  
  // Extract all companies for filter
  const companies = Array.from(new Set(shipments.map(s => s.perusahaan))).filter(Boolean);

  // Count summary data
  const summary = {
    total: filteredShipments.length,
    delivered: filteredShipments.filter(s => s.status === "terkirim").length,
    pending: filteredShipments.filter(s => s.status === "tertunda").length,
    failed: filteredShipments.filter(s => s.status === "gagal").length
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              {error}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                {!profile ? 'Sedang memuat profil pengguna...' : 'Terjadi kesalahan saat memuat halaman admin.'}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()} className="flex-1">
                  Muat Ulang
                </Button>
                <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
                  Kembali
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main admin interface
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6 px-4 md:px-6">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-row justify-between items-center">
              <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold text-navy-500">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                  Kelola dan pantau data pengiriman
                </p>
                {profile && (
                  <p className="text-sm text-gray-500">
                    Selamat datang, {profile.name} ({profile.role})
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/tracking-map')}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Peta Pelacakan
                </Button>
                <Button variant="outline" onClick={() => signOut()}>Logout</Button>
              </div>
            </div>
            
            {/* App Download Info */}
            <AppDownloadInfo />
            
            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Debug: User ID: {user?.id}, Role: {profile?.role}, Is Admin: {isAdmin ? 'Yes' : 'No'}
                </AlertDescription>
              </Alert>
            )}
            
            <Tabs defaultValue="manage">
              <TabsList className="mb-4">
                <TabsTrigger value="manage">Kelola Data</TabsTrigger>
                <TabsTrigger value="add">Tambah Data</TabsTrigger>
                <TabsTrigger value="analytics">Analisis</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manage">
                <div className="grid gap-6">
                  <Card>
                    <CardHeader>
                      <div className="flex flex-row justify-between items-center">
                        <CardTitle>Filter dan Ekspor Data</CardTitle>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={fetchShipments}
                          disabled={isLoading}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refresh
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                        <DataFilters 
                          onFilter={handleFilter} 
                          drivers={drivers}
                          companies={companies}
                        />
                        <div className="flex gap-4">
                          <FileUploader onUploadSuccess={fetchShipments} />
                          <ExportOptions data={filteredShipments} />
                          <Button 
                            variant="default" 
                            onClick={() => setIsAddDialogOpen(true)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {isLoading ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center">
                          <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
                          <p className="text-gray-600">Memuat data pengiriman...</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <ShipmentTable 
                      shipments={filteredShipments} 
                      onShipmentUpdated={fetchShipments}
                    />
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="add">
                <Card>
                  <CardHeader>
                    <CardTitle>Tambah Data Pengiriman</CardTitle>
                    <CardDescription>
                      Tambahkan data pengiriman baru ke sistem
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ShipmentForm 
                      onShipmentCreated={fetchShipments} 
                      drivers={drivers}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="analytics">
                <CompanyAnalytics shipments={shipments} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* Add Shipment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Data Pengiriman</DialogTitle>
          </DialogHeader>
          <ShipmentForm
            onShipmentCreated={() => {
              fetchShipments();
              setIsAddDialogOpen(false);
            }}
            drivers={drivers}
          />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Admin;