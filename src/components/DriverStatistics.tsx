
import React from "react";
import { Shipment } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DriverStatisticsProps {
  shipments: Shipment[];
}

interface DriverStats {
  name: string;
  total: number;
  delivered: number;
  pending: number;
  failed: number;
  reasons: string[];
}

const DriverStatistics: React.FC<DriverStatisticsProps> = ({ shipments }) => {
  // Process shipment data to get driver statistics
  const getDriverStats = (): DriverStats[] => {
    const driverMap = new Map<string, DriverStats>();
    
    shipments.forEach((shipment) => {
      const driverName = shipment.supir;
      
      // Skip if driver name is empty
      if (!driverName) return;
      
      if (!driverMap.has(driverName)) {
        driverMap.set(driverName, {
          name: driverName,
          total: 0,
          delivered: 0,
          pending: 0,
          failed: 0,
          reasons: []
        });
      }
      
      const driverStats = driverMap.get(driverName)!;
      
      // Increment counters
      driverStats.total++;
      
      if (shipment.status === "terkirim") {
        driverStats.delivered++;
      } else if (shipment.status === "tertunda") {
        driverStats.pending++;
      } else if (shipment.status === "gagal") {
        driverStats.failed++;
        
        // Add reason if available and not already in the list
        if (shipment.kendala && !driverStats.reasons.includes(shipment.kendala)) {
          driverStats.reasons.push(shipment.kendala);
        }
      }
    });
    
    // Convert map to array and sort by total deliveries
    return Array.from(driverMap.values())
      .sort((a, b) => b.total - a.total);
  };

  const driverStats = getDriverStats();

  return (
    <Card className="animate-fade-in shadow-xl bg-white border-0 rounded-xl overflow-hidden">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-slate-800">Statistik Performa Supir</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-slate-700">Nama Supir</TableHead>
                <TableHead className="text-center text-slate-700">Total Pengiriman</TableHead>
                <TableHead className="text-center text-slate-700">Terkirim</TableHead>
                <TableHead className="text-center text-slate-700">Tertunda</TableHead>
                <TableHead className="text-center text-slate-700">Gagal</TableHead>
                <TableHead className="text-slate-700">Alasan Gagal/Tertunda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driverStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-32 text-slate-500">
                    Tidak ada data supir
                  </TableCell>
                </TableRow>
              ) : (
                driverStats.map((driver) => (
                  <TableRow key={driver.name} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-slate-700">{driver.name}</TableCell>
                    <TableCell className="text-center text-slate-700">{driver.total}</TableCell>
                    <TableCell className="text-center">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-medium">
                        {driver.delivered}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {driver.pending}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="bg-rose-100 text-rose-800 px-2 py-1 rounded-full text-xs font-medium">
                        {driver.failed}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {driver.reasons.length > 0 ? (
                        <ul className="list-disc pl-5 text-sm">
                          {driver.reasons.map((reason, index) => (
                            <li key={index}>{reason}</li>
                          ))}
                        </ul>
                      ) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverStatistics;
