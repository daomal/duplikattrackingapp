
import React from "react";
import { Shipment } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface ConstraintAnalysisProps {
  shipments: Shipment[];
}

const ConstraintAnalysis: React.FC<ConstraintAnalysisProps> = ({ shipments }) => {
  const isMobile = useIsMobile();

  // Calculate constraint statistics
  const analyzeConstraints = () => {
    const constraints = new Map<string, number>();
    
    shipments.forEach((shipment) => {
      if (shipment.kendala) {
        constraints.set(
          shipment.kendala,
          (constraints.get(shipment.kendala) || 0) + 1
        );
      }
    });
    
    return Array.from(constraints.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const constraintData = analyzeConstraints();
  
  // Colors for alternating bars
  const barColors = ["#6366f1", "#10b981", "#3b82f6", "#f43f5e"];

  return (
    <Card className="h-full shadow-xl bg-white border-0 rounded-xl overflow-hidden">
      <CardHeader>
        <CardTitle className="text-slate-800">Analisis Kendala</CardTitle>
        <CardDescription className="text-slate-500">
          Kendala yang paling sering terjadi dalam pengiriman
        </CardDescription>
      </CardHeader>
      <CardContent>
        {constraintData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-slate-500">
            Tidak ada data kendala
          </div>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={constraintData}
                className="chart-3d"
                margin={{
                  top: 5,
                  right: 30,
                  left: isMobile ? 60 : 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#475569' }} />
                <YAxis dataKey="name" type="category" width={isMobile ? 100 : 150} tick={{ fill: '#475569' }} />
                <Tooltip
                  formatter={(value: number) => [`${value} kasus`, "Jumlah"]}
                  labelFormatter={(label) => `Kendala: ${label}`}
                  contentStyle={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar
                  dataKey="count"
                  name="Jumlah Kejadian"
                  radius={[0, 4, 4, 0]}
                >
                  {constraintData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConstraintAnalysis;
