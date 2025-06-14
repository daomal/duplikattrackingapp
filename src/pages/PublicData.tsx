
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Shipment, ShipmentStatus, FilterOptions } from "@/lib/types";
import { getShipments } from "@/lib/shipmentService";
import { Download } from "lucide-react";
import DataFilters from "@/components/DataFilters";
import SummaryCards from "@/components/SummaryCards";
import DataCharts from "@/components/DataCharts";
import DriverStatistics from "@/components/DriverStatistics";
import ExportOptions from "@/components/ExportOptions";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const ITEMS_PER_PAGE = 10;

const PublicData = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const isMobile = useIsMobile();
  
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    dateRange: [null, null],
    status: "all",
    driver: "all",
    company: "all"
  });

  // Calculate total quantity
  const totalQuantity = filteredShipments.reduce((total, shipment) => total + shipment.qty, 0);

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
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle filtering
  const handleFilter = (filters: FilterOptions) => {
    setFilterOptions(filters);
    setCurrentPage(1); // Reset to first page when filtering
    
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

  // Extract all drivers for filter
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

  // Calculate pagination
  const totalPages = Math.ceil(filteredShipments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredShipments.length);
  const paginatedShipments = filteredShipments.slice(startIndex, endIndex);

  // Helper function for status badge
  const renderStatusBadge = (status: ShipmentStatus) => {
    const statusClasses = {
      terkirim: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium",
      tertunda: "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium",
      gagal: "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium",
    };

    const statusText = {
      terkirim: "Terkirim",
      tertunda: "Tertunda",
      gagal: "Gagal",
    };

    return <span className={statusClasses[status]}>{statusText[status]}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-twilight">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col space-y-6">
          <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'flex-row'} justify-between items-center`}>
            <div className="flex flex-col space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-black">Data Pengiriman Publik</h1>
              <p className="text-gray-700">
                Lihat data pengiriman dalam satu tampilan
              </p>
            </div>
            
            <div className={`flex ${isMobile ? 'flex-col w-full' : 'items-center'} gap-4`}>
              <Button 
                variant="outline" 
                asChild 
                className="bg-white/90 text-purple-700 hover:bg-purple-50 hover:shadow-md transition-all duration-300 border-purple-200"
              >
                <Link to="/">
                  Dashboard
                </Link>
              </Button>
              <ExportOptions data={filteredShipments} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
            <div className="lg:col-span-4">
              <SummaryCards summary={summary} />
            </div>
            
            <div className="lg:col-span-4 animate-fade-in">
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                  <DataFilters 
                    onFilter={handleFilter} 
                    drivers={drivers}
                    companies={companies}
                  />
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-4 animate-fade-in">
              <DataCharts shipments={filteredShipments} />
            </div>
            
            <div className="lg:col-span-4 animate-fade-in">
              <DriverStatistics shipments={filteredShipments} />
            </div>
            
            <div className="lg:col-span-4">
              <Card className="bg-gradient-sunset shadow-lg border-none">
                <CardHeader>
                  <CardTitle className="text-black">Daftar Pengiriman</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-purple-200 bg-white/90 overflow-hidden table-container">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-gradient-ocean text-white">
                          <TableRow>
                            <TableHead className="w-[100px] text-white">No. Surat Jalan</TableHead>
                            <TableHead className="text-white">Perusahaan</TableHead>
                            <TableHead className="text-white">Tujuan</TableHead>
                            <TableHead className="text-white">Supir</TableHead>
                            <TableHead className="text-white">Tanggal Kirim</TableHead>
                            <TableHead className="text-white">Tanggal & Waktu Tiba</TableHead>
                            <TableHead className="text-white">Status</TableHead>
                            <TableHead className="text-white">Kendala</TableHead>
                            <TableHead className="text-right text-white">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center h-32">
                                <div className="flex justify-center">
                                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : paginatedShipments.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center h-32 text-black">
                                Tidak ada data pengiriman
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {paginatedShipments.map((shipment) => (
                                <TableRow key={shipment.id} className="hover:bg-blue-50/50 transition-colors">
                                  <TableCell className="font-medium text-black">
                                    {shipment.noSuratJalan}
                                  </TableCell>
                                  <TableCell className="text-black">{shipment.perusahaan}</TableCell>
                                  <TableCell className="text-black">{shipment.tujuan}</TableCell>
                                  <TableCell className="text-black">{shipment.supir}</TableCell>
                                  <TableCell className="text-black">{shipment.tanggalKirim}</TableCell>
                                  <TableCell className="text-black">
                                    {shipment.tanggalTiba 
                                      ? (shipment.waktuTiba 
                                        ? `${shipment.tanggalTiba} ${shipment.waktuTiba}` 
                                        : shipment.tanggalTiba) 
                                      : "-"}
                                  </TableCell>
                                  <TableCell>
                                    {renderStatusBadge(shipment.status)}
                                  </TableCell>
                                  <TableCell className="text-black">
                                    {shipment.kendala || "-"}
                                  </TableCell>
                                  <TableCell className="text-right text-black">
                                    {shipment.qty}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {/* Total row */}
                              <TableRow className="bg-blue-50/70 font-medium">
                                <TableCell colSpan={8} className="text-right text-black">
                                  Total Qty:
                                </TableCell>
                                <TableCell className="text-right text-black">
                                  {totalQuantity}
                                </TableCell>
                              </TableRow>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-4 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              className={`${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} text-black bg-white/90 hover:bg-purple-50`}
                            />
                          </PaginationItem>
                          
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNumber: number;
                            if (totalPages <= 5) {
                              pageNumber = i + 1;
                            } else {
                              // For more pages, show window around current page
                              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                              pageNumber = start + i;
                            }
                            
                            return (
                              <PaginationItem key={pageNumber}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(pageNumber)}
                                  isActive={currentPage === pageNumber}
                                  className="text-black bg-white/90 hover:bg-purple-50"
                                >
                                  {pageNumber}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              className={`${currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} text-black bg-white/90 hover:bg-purple-50`}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-4">
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <Card className="bg-gradient-ocean shadow-lg border-none text-white h-[400px]">
                  <CardHeader>
                    <CardTitle>Distribusi Perusahaan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filteredShipments.length > 0 ? (
                      <div className="space-y-2">
                        {Array.from(
                          filteredShipments.reduce((acc, shipment) => {
                            const company = shipment.perusahaan;
                            acc.set(company, (acc.get(company) || 0) + 1);
                            return acc;
                          }, new Map<string, number>())
                        ).map(([company, count], index) => (
                          <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-white/20 shadow-sm border border-white/30 hover:bg-white/30 transition-all">
                            <span className="text-sm font-medium">{company}</span>
                            <span className="text-sm font-medium bg-white/30 text-white px-2 py-1 rounded-full">{count} pengiriman</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-white/70">Tidak ada data</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicData;
