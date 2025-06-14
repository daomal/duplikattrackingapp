
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, User, UserCog, BarChart2, Truck, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import ShipmentTable from "./ShipmentTable";
import DataFilters from "./DataFilters";
import NoteForm from "./NoteForm";
import { Shipment, ShipmentStatus, FilterOptions, DashboardView } from "@/lib/types";
import { getShipments } from "@/lib/shipmentService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardNav from "./DashboardNav";
import DashboardHome from "./DashboardHome";

const DashboardLayout = () => {
  const { toast } = useToast();
  const { user, isAdmin, signOut } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState<DashboardView>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    dateRange: [null, null],
    status: "all",
    driver: "all",
    company: "all",
    searchQuery: ""
  });

  // Fetch shipments on component mount
  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    setIsLoading(true);
    try {
      const data = await getShipments();
      setShipments(data);
      setFilteredShipments(data);
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

  // Function to handle filtering
  const handleFilter = (filters: FilterOptions) => {
    setFilterOptions(filters);
    
    let filtered = [...shipments];
    
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
    
    // Filter by search query
    if (filters.searchQuery && filters.searchQuery.trim() !== "") {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(shipment => 
        shipment.noSuratJalan.toLowerCase().includes(query) ||
        shipment.perusahaan.toLowerCase().includes(query) ||
        shipment.tujuan.toLowerCase().includes(query) ||
        shipment.supir.toLowerCase().includes(query)
      );
    }
    
    setFilteredShipments(filtered);
  };

  // Handle real-time search changes
  useEffect(() => {
    handleFilter({
      ...filterOptions,
      searchQuery: searchQuery
    });
  }, [searchQuery]);

  // Extract all drivers for filter
  const drivers = Array.from(new Set(shipments.map(s => s.supir))).filter(Boolean);
  
  // Extract all companies for filter
  const companies = Array.from(new Set(shipments.map(s => s.perusahaan))).filter(Boolean);

  // Render active view
  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardHome shipments={filteredShipments} />;
      case "shipments":
        return (
          <div className="space-y-4 w-full">
            <DataFilters 
              onFilter={handleFilter} 
              drivers={drivers}
              companies={companies}
            />
            <ShipmentTable 
              shipments={filteredShipments} 
              onShipmentUpdated={fetchShipments} 
            />
          </div>
        );
      case "notes":
        return <NoteForm />;
      default:
        return <DashboardHome shipments={filteredShipments} />;
    }
  };

  const renderTopButtons = () => (
    <div className={`flex ${isMobile ? 'flex-col w-full space-y-3' : 'items-center'} gap-4`}>
      <Button 
        variant="outline" 
        asChild 
        className="mobile-spacing bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-xl border-0 text-sm md:text-base whitespace-nowrap overflow-hidden text-ellipsis"
      >
        <Link to="/public-data" className="flex items-center justify-center">
          <BarChart2 className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">Lihat Data Publik</span>
        </Link>
      </Button>
      
      <Button 
        variant="outline" 
        asChild 
        className="mobile-spacing bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-xl border-0 text-sm md:text-base whitespace-nowrap overflow-hidden text-ellipsis"
      >
        <a 
          href="https://trayekbaru.netlify.app/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center"
        >
          <Truck className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">Trayek Driver</span>
        </a>
      </Button>
      
      {user ? (
        <div className={`flex ${isMobile ? 'flex-col w-full space-y-3' : 'items-center'} gap-4`}>
          {isAdmin && (
            <Button 
              variant="default" 
              className="mobile-spacing bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-xl border-0 text-sm md:text-base whitespace-nowrap overflow-hidden text-ellipsis" 
              asChild
            >
              <Link to="/admin" className="flex items-center justify-center">
                <UserCog className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Panel Admin</span>
              </Link>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => signOut()}
            className="mobile-spacing bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-xl border-0 text-sm md:text-base whitespace-nowrap overflow-hidden text-ellipsis"
          >
            <span className="truncate">Logout</span>
          </Button>
        </div>
      ) : (
        <Button 
          variant="default" 
          className="mobile-spacing bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-xl border-0 text-sm md:text-base whitespace-nowrap overflow-hidden text-ellipsis" 
          asChild
        >
          <Link to="/auth" className="flex items-center justify-center">
            <LogIn className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">Login</span>
          </Link>
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto py-6 px-4 md:px-8 max-w-full 2xl:max-w-[1800px]">
        <div className="flex flex-col space-y-6 animate-fade-in">
          <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'flex-row'} justify-between items-center`}>
            <div className="flex flex-col space-y-2 animate-slide-in">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard Pengiriman</h1>
              <p className="text-slate-500">
                Pantau dan kelola data pengiriman dalam satu tempat
              </p>
            </div>
            
            {isMobile ? (
              <div className="flex justify-end w-full">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="relative z-20 md:hidden"
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>

                {/* Mobile menu overlay */}
                {isMobileMenuOpen && (
                  <div className="fixed inset-0 bg-black/50 z-10" onClick={() => setIsMobileMenuOpen(false)}></div>
                )}

                {/* Mobile menu - improved styling */}
                <div className={`fixed top-0 right-0 h-screen bg-white shadow-2xl w-4/5 max-w-xs transform transition-transform duration-300 ease-in-out z-10 p-6 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                  <div className="flex flex-col space-y-6 pt-12 mobile-menu">
                    <h3 className="text-xl font-bold mb-4">Menu</h3>
                    {renderTopButtons()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 animate-slide-in" style={{animationDelay: "0.2s"}}>
                {renderTopButtons()}
              </div>
            )}
          </div>
          
          {/* Dashboard Navigation */}
          <DashboardNav activeView={activeView} onViewChange={setActiveView} />
          
          {/* Active View Content - Full width */}
          <div className="w-full mobile-container">
            {renderView()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
