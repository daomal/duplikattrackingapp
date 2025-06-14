
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Clock, AlertCircle, Package } from "lucide-react";

interface SummaryCardsProps {
  summary: {
    total: number;
    delivered: number;
    pending: number;
    failed: number;
  };
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="stagger-item animate-fade-in bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-xl rounded-xl overflow-hidden border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Total Pengiriman</CardTitle>
          <div className="rounded-full bg-white/20 p-2 transition-transform duration-300 hover:scale-110">
            <Package className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{summary.total}</div>
          <p className="text-xs text-white/80">
            Jumlah seluruh pengiriman
          </p>
        </CardContent>
      </Card>
      
      <Card className="stagger-item animate-fade-in bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl rounded-xl overflow-hidden border-0" style={{animationDelay: "0.1s"}}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Terkirim</CardTitle>
          <div className="rounded-full bg-white/20 p-2 transition-transform duration-300 hover:scale-110">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{summary.delivered}</div>
          <p className="text-xs text-white/80">
            {summary.total > 0
              ? `${Math.round((summary.delivered / summary.total) * 100)}% dari total pengiriman`
              : "0% dari total pengiriman"}
          </p>
        </CardContent>
      </Card>
      
      <Card className="stagger-item animate-fade-in bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl rounded-xl overflow-hidden border-0" style={{animationDelay: "0.2s"}}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Tertunda</CardTitle>
          <div className="rounded-full bg-white/20 p-2 transition-transform duration-300 hover:scale-110">
            <Clock className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{summary.pending}</div>
          <p className="text-xs text-white/80">
            {summary.total > 0
              ? `${Math.round((summary.pending / summary.total) * 100)}% dari total pengiriman`
              : "0% dari total pengiriman"}
          </p>
        </CardContent>
      </Card>
      
      <Card className="stagger-item animate-fade-in bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-xl rounded-xl overflow-hidden border-0" style={{animationDelay: "0.3s"}}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Gagal Kirim</CardTitle>
          <div className="rounded-full bg-white/20 p-2 transition-transform duration-300 hover:scale-110">
            <AlertCircle className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{summary.failed}</div>
          <p className="text-xs text-white/80">
            {summary.total > 0
              ? `${Math.round((summary.failed / summary.total) * 100)}% dari total pengiriman`
              : "0% dari total pengiriman"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryCards;
