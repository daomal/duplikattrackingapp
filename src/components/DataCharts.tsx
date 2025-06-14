
import React from "react";
import { Shipment } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  PieChart,
  LineChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Pie,
  Cell,
  Line,
} from "recharts";

interface DataChartsProps {
  shipments: Shipment[];
}

const DataCharts: React.FC<DataChartsProps> = ({ shipments }) => {
  // Prepare data for bar chart (shipments per day)
  const prepareBarChartData = () => {
    const dateMap = new Map<string, number>();
    
    shipments.forEach((shipment) => {
      const date = shipment.tanggalKirim;
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });
    
    return Array.from(dateMap).map(([date, count]) => ({
      date,
      count,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };
  
  // Prepare data for pie chart (shipment status distribution)
  const preparePieChartData = () => {
    const statusCount = {
      terkirim: 0,
      tertunda: 0,
      gagal: 0,
    };
    
    shipments.forEach((shipment) => {
      statusCount[shipment.status]++;
    });
    
    return [
      { name: "Terkirim", value: statusCount.terkirim, color: "#10b981" },
      { name: "Tertunda", value: statusCount.tertunda, color: "#3b82f6" },
      { name: "Gagal", value: statusCount.gagal, color: "#f43f5e" },
    ];
  };
  
  // Prepare data for line chart (shipments trend)
  const prepareLineChartData = () => {
    const dateMap = new Map<string, number>();
    
    shipments.forEach((shipment) => {
      const date = shipment.tanggalKirim;
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });
    
    return Array.from(dateMap).map(([date, count]) => ({
      date,
      count,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const barChartData = prepareBarChartData();
  const pieChartData = preparePieChartData();
  const lineChartData = prepareLineChartData();

  // Colors for alternating bars
  const barColors = ["#6366f1", "#10b981", "#3b82f6", "#f43f5e"];

  return (
    <Card className="animate-fade-in shadow-xl bg-white border-0 rounded-xl overflow-hidden">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-slate-800">Visualisasi Data</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-8">
        {/* Bar Chart */}
        <div className="bg-white rounded-lg shadow-lg p-4 border border-slate-100">
          <h3 className="text-lg font-medium text-slate-800 mb-2">Pengiriman per Tanggal</h3>
          <div className="w-full h-[300px] bg-white rounded-md">
            <ResponsiveContainer width="100%" height="100%" className="recharts-wrapper">
              <BarChart data={barChartData} className="chart-3d">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fill: '#475569' }} />
                <YAxis tick={{ fill: '#475569' }} />
                <Tooltip
                  formatter={(value: number) => [`${value} pengiriman`, "Jumlah"]}
                  labelFormatter={(label) => `Tanggal: ${label}`}
                  contentStyle={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar
                  dataKey="count"
                  name="Jumlah Pengiriman"
                  radius={[4, 4, 0, 0]}
                >
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow-lg p-4 border border-slate-100">
          <h3 className="text-lg font-medium text-slate-800 mb-2">Status Pengiriman</h3>
          <div className="w-full h-[300px] bg-white rounded-md">
            <ResponsiveContainer width="100%" height="100%" className="recharts-wrapper">
              <PieChart className="chart-3d">
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={90}
                  innerRadius={30}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value} pengiriman`, "Jumlah"]}
                  contentStyle={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Line Chart */}
        <div className="bg-white rounded-lg shadow-lg p-4 border border-slate-100">
          <h3 className="text-lg font-medium text-slate-800 mb-2">Trend Pengiriman</h3>
          <div className="w-full h-[300px] bg-white rounded-md">
            <ResponsiveContainer width="100%" height="100%" className="recharts-wrapper">
              <LineChart data={lineChartData} className="chart-3d">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fill: '#475569' }} />
                <YAxis tick={{ fill: '#475569' }} />
                <Tooltip
                  formatter={(value: number) => [`${value} pengiriman`, "Jumlah"]}
                  labelFormatter={(label) => `Tanggal: ${label}`}
                  contentStyle={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Jumlah Pengiriman"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataCharts;
