
import React from "react";
import { Shipment } from "@/lib/types";
import SummaryCards from "./SummaryCards";
import DataCharts from "./DataCharts";
import DriverStatistics from "./DriverStatistics";
import ConstraintAnalysis from "./ConstraintAnalysis";
import CompanyAnalytics from "./CompanyAnalytics";
import AppDownloadInfo from "./AppDownloadInfo";

interface DashboardHomeProps {
  shipments: Shipment[];
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ shipments }) => {
  // Count summary data
  const summary = {
    total: shipments.length,
    delivered: shipments.filter(s => s.status === "terkirim").length,
    pending: shipments.filter(s => s.status === "tertunda").length,
    failed: shipments.filter(s => s.status === "gagal").length
  };

  return (
    <div className="space-y-8 w-full animate-fade-in max-w-full">
      {/* App Download Info */}
      <AppDownloadInfo />
      
      {/* Summary Cards */}
      <div className="w-full">
        <SummaryCards summary={summary} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
        <div className="h-full shadow-xl hover:shadow-2xl transition-all duration-500 rounded-xl overflow-hidden">
          <DataCharts shipments={shipments} />
        </div>
        <div className="h-full shadow-xl hover:shadow-2xl transition-all duration-500 rounded-xl overflow-hidden">
          <ConstraintAnalysis shipments={shipments} />
        </div>
      </div>

      {/* Driver Statistics */}
      <div className="w-full shadow-xl hover:shadow-2xl transition-all duration-500 rounded-xl overflow-hidden animate-slide-in">
        <DriverStatistics shipments={shipments} />
      </div>

      {/* Company Analytics */}
      <div className="w-full shadow-xl hover:shadow-2xl transition-all duration-500 rounded-xl overflow-hidden animate-scale-in">
        <CompanyAnalytics shipments={shipments} />
      </div>
    </div>
  );
};

export default DashboardHome;
