
import React, { Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "@/hooks/use-toast";

// Simple error boundary component
class ErrorBoundaryComponent extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    toast({
      title: "Terjadi kesalahan",
      description: "Mohon muat ulang halaman",
      variant: "destructive",
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Oops! Terjadi kesalahan</h2>
            <p className="mb-4 text-slate-600">
              Maaf, terjadi kesalahan saat memuat aplikasi. Silakan coba muat ulang halaman.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Index = () => {
  return (
    <div className="w-full bg-slate-50">
      <ErrorBoundaryComponent>
        <Suspense fallback={<div className="p-8 text-center">Memuat...</div>}>
          <DashboardLayout />
        </Suspense>
      </ErrorBoundaryComponent>
    </div>
  );
};

export default Index;
