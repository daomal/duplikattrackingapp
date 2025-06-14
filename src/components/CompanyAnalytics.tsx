import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Shipment, CompanyShipmentSummary, CommonConstraint, DelayAnalytics } from "@/lib/types";
import { differenceInDays, parseISO } from "date-fns";

interface CompanyAnalyticsProps {
  shipments: Shipment[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const CompanyAnalytics: React.FC<CompanyAnalyticsProps> = ({ shipments }) => {
  // Generate company summary data
  const companySummaries = useMemo(() => {
    const companyMap = new Map<string, CompanyShipmentSummary>();
    
    shipments.forEach(shipment => {
      const company = shipment.perusahaan;
      
      if (!companyMap.has(company)) {
        companyMap.set(company, {
          company,
          total: 0,
          delivered: 0,
          pending: 0,
          failed: 0
        });
      }
      
      const summary = companyMap.get(company)!;
      summary.total++;
      
      if (shipment.status === "terkirim") {
        summary.delivered++;
      } else if (shipment.status === "tertunda") {
        summary.pending++;
      } else if (shipment.status === "gagal") {
        summary.failed++;
      }
    });
    
    return Array.from(companyMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 companies
  }, [shipments]);

  // Generate common constraints (issues)
  const commonConstraints = useMemo(() => {
    const issuesMap = new Map<string, number>();
    
    shipments.forEach(shipment => {
      if (shipment.kendala) {
        // Normalize issue text (lowercase, trim)
        const issue = shipment.kendala.trim();
        
        if (issue) {
          issuesMap.set(issue, (issuesMap.get(issue) || 0) + 1);
        }
      }
    });
    
    return Array.from(issuesMap.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 issues
  }, [shipments]);

  // Calculate average delay for each company
  const delayAnalytics = useMemo(() => {
    const companyDelaysMap = new Map<string, { totalDays: number; shipmentCount: number }>();
    
    shipments.forEach(shipment => {
      // Only count delivered shipments with both dates
      if (shipment.status === "terkirim" && shipment.tanggalKirim && shipment.tanggalTiba) {
        const company = shipment.perusahaan;
        const sendDate = new Date(shipment.tanggalKirim);
        const arriveDate = new Date(shipment.tanggalTiba);
        
        // Calculate delay in days
        const delay = differenceInDays(arriveDate, sendDate);
        
        if (!companyDelaysMap.has(company)) {
          companyDelaysMap.set(company, { totalDays: 0, shipmentCount: 0 });
        }
        
        const data = companyDelaysMap.get(company)!;
        data.totalDays += delay;
        data.shipmentCount++;
      }
    });
    
    return Array.from(companyDelaysMap.entries())
      .map(([company, { totalDays, shipmentCount }]) => ({
        company,
        averageDelay: shipmentCount > 0 ? totalDays / shipmentCount : 0,
        totalShipments: shipmentCount
      }))
      .filter(item => item.totalShipments >= 3) // Only show companies with at least 3 shipments
      .sort((a, b) => b.averageDelay - a.averageDelay);
  }, [shipments]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Analisis Data Pengiriman</CardTitle>
          <CardDescription>
            Statistik dan analisis pengiriman berdasarkan perusahaan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="company-summary">
            <TabsList className="mb-4">
              <TabsTrigger value="company-summary">Jumlah Kiriman per Perusahaan</TabsTrigger>
              <TabsTrigger value="issues">Kendala Terbanyak</TabsTrigger>
              <TabsTrigger value="delays">Rata-rata Keterlambatan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="company-summary" className="pt-4">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={companySummaries}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="company" 
                      angle={-45} 
                      textAnchor="end"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="delivered" name="Terkirim" fill="#10b981" />
                    <Bar dataKey="pending" name="Tertunda" fill="#f59e0b" />
                    <Bar dataKey="failed" name="Gagal" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="issues" className="pt-4">
              {commonConstraints.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={commonConstraints}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="issue"
                        >
                          {commonConstraints.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Daftar Kendala Terbanyak</h3>
                    <div className="space-y-2">
                      {commonConstraints.map((item, index) => (
                        <div key={index} className="flex justify-between items-center border-b pb-2">
                          <span className="font-medium">{item.issue}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">{item.count} kali</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada data kendala yang tersedia
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="delays" className="pt-4">
              {delayAnalytics.length > 0 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={delayAnalytics}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="company" 
                        angle={-45} 
                        textAnchor="end" 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        label={{ 
                          value: 'Rata-rata Keterlambatan (hari)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' }
                        }}
                      />
                      {/* FIX: Ensure number formatting is properly handled with a type check */}
                      <Tooltip formatter={(value) => {
                        // Check if value is a number before calling toFixed
                        const numValue = typeof value === 'number' ? value.toFixed(1) : value;
                        return [`${numValue} hari`, 'Rata-rata'];
                      }} />
                      <Bar dataKey="averageDelay" name="Rata-rata Keterlambatan" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada data keterlambatan yang tersedia
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyAnalytics;
