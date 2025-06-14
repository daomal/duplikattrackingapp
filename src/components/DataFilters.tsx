
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterOptions, ShipmentStatus } from "@/lib/types";
import { CalendarIcon, Search } from "lucide-react";

interface DataFiltersProps {
  onFilter: (filters: FilterOptions) => void;
  drivers: string[];
  companies: string[];
}

const DataFilters: React.FC<DataFiltersProps> = ({
  onFilter,
  drivers,
  companies,
}) => {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [status, setStatus] = useState<ShipmentStatus | "all">("all");
  const [driver, setDriver] = useState<string>("all");
  const [company, setCompany] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(undefined);

  // Apply filters whenever any filter changes
  useEffect(() => {
    const filterOptions: FilterOptions = {
      dateRange,
      status,
      driver,
      company,
      searchQuery
    };
    
    onFilter(filterOptions);
  }, [dateRange, status, driver, company, searchQuery, onFilter]);

  // Handle search input with instant filtering
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // No need to manually trigger filter as the useEffect will handle it
  };

  const resetFilters = () => {
    setDateRange([null, null]);
    setStatus("all");
    setDriver("all");
    setCompany("all");
    setSearchQuery("");
    setDate(undefined);
  };
  
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <Label className="mb-1 block">Kata Kunci</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan No. SJ, perusahaan, tujuan..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
        </div>
        
        <div>
          <Label className="mb-1 block">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as ShipmentStatus | "all")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="terkirim">Terkirim</SelectItem>
              <SelectItem value="tertunda">Tertunda</SelectItem>
              <SelectItem value="gagal">Gagal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1 block">Supir</Label>
          <Select 
            value={driver} 
            onValueChange={setDriver}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua Supir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Supir</SelectItem>
              {drivers.length > 0 ? (
                drivers.map((driverName) => (
                  <SelectItem key={driverName} value={driverName}>
                    {driverName}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  Tidak ada supir
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1 block">Perusahaan</Label>
          <Select 
            value={company} 
            onValueChange={setCompany}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua Perusahaan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Perusahaan</SelectItem>
              {companies.length > 0 ? (
                companies.map((companyName) => (
                  <SelectItem key={companyName} value={companyName}>
                    {companyName}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  Tidak ada perusahaan
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1 block">Tanggal Kirim</Label>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange[0] ? format(dateRange[0], "dd/MM/yyyy") : <span>Dari Tanggal</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto">
                <Calendar
                  mode="single"
                  selected={dateRange[0] || undefined}
                  onSelect={(date) => setDateRange([date, dateRange[1]])}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange[1] ? format(dateRange[1], "dd/MM/yyyy") : <span>Sampai Tanggal</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto">
                <Calendar
                  mode="single"
                  selected={dateRange[1] || undefined}
                  onSelect={(date) => setDateRange([dateRange[0], date])}
                  initialFocus
                  disabled={(date) => (dateRange[0] ? date < dateRange[0] : false)}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex items-end">
          <Button variant="outline" onClick={resetFilters} className="w-full">
            Reset Filter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataFilters;
