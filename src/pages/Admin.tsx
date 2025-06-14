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
import { Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ShipmentTable from "@/components/ShipmentTable";
import DataFilters from "@/components/DataFilters";
import FileUploader from "@/components/FileUploader";
import ExportOptions from "@/components/ExportOptions";
import ShipmentForm from "@/components/ShipmentForm";
import { getShipments, subscribeToShipments } from "@/lib/shipmentService";
import { Shipment, FilterOptions, ShipmentStatus } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import CompanyAnalytics from "@/components/CompanyAnalytics";
import AppDownloadInfo from "@/components/AppDownloadInfo";

const Admin = () => {
  const { isAdmin, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    dateRange: [null, null],
    status: "all",
    driver: "all",
    company: "all",
    searchQuery: ""
  });

  // Improved effect to check admin access
  useEffect(() => {
    if (!user) {
      // If not logged in at all, redirect to auth page
      toast({
        title: "Akses ditolak",
        description: "Silakan login terlebih dahulu",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }
    
    if (!isAdmin) {
      // If logged in but not admin, redirect to home
      toast({
        title: "Akses ditolak",
        description: "Anda tidak memiliki akses admin",
        variant: "destructive",
      });
      navigate('/');
    } else {
      // Admin is logged in, fetch shipments
      fetchShipments();
    }
  }, [isAdmin, user, navigate, toast]);

  // Subscribe to real-time shipment updates
  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = subscribeToShipments((updatedShipments) => {
      setShipments(updatedShipments);
      // Re-apply any active filters
      applyFilters(updatedShipments, filterOptions);
    });

    // Cleanup function
    return () => unsubscribe();
  }, [isAdmin, filterOptions]);

  const fetchShipments = async () => {
    setIsLoading(true);
    try {
      const data = await getShipments();
      setShipments(data);
      
      // Apply any existing filters
      applyFilters(data, filterOptions);
    } catch (error) {
      console.error("Error fetching shipments:", error);
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
  
  // If not admin or not logged in, this will return early due to the useEffect redirect
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
              </div>
              <Button variant="outline" onClick={() => signOut()}>Logout</Button>
            </div>
            
            {/* App Download Info */}
            <AppDownloadInfo />
            
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
                  
                  <ShipmentTable 
                    shipments={filteredShipments} 
                    onShipmentUpdated={fetchShipments}
                  />
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
