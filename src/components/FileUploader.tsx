
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Shipment } from "@/lib/types";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AuthContext";
import { batchImportShipments } from "@/lib/shipmentService";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FileUploaderProps {
  onUploadSuccess: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUploadSuccess }) => {
  const { isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<Omit<Shipment, 'id'>[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!isAdmin) {
    return null; // Only show for admins
  }

  const processExcelFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        setIsUploading(true);
        
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        // Assume first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse the worksheet into JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Map Excel data to our Shipment interface
        const shipments: Omit<Shipment, 'id'>[] = jsonData.map((row: any) => {
          // Convert Excel dates to string format if needed
          let tanggalKirim = row["Tanggal Kirim"];
          if (tanggalKirim && typeof tanggalKirim === "number") {
            const date = XLSX.SSF.parse_date_code(tanggalKirim);
            tanggalKirim = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
          }
          
          return {
            noSuratJalan: row["Nomor Surat Jalan"] || `UNKNOWN-${Math.random().toString(36).substring(2, 7)}`,
            perusahaan: row["Nama Perusahaan"] || "Unknown Company",
            tujuan: row["Tujuan"] || "Unknown Destination",
            supir: row["Supir"] || "Unknown Driver",
            tanggalKirim: tanggalKirim || new Date().toISOString().split("T")[0],
            tanggalTiba: null,
            waktuTiba: null,
            status: "tertunda",
            kendala: null,
            qty: row["Jumlah Qty"] || 0
          };
        });
        
        setPreviewData(shipments);
        setIsDialogOpen(true);
        
      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast.error("Format file tidak sesuai. Mohon periksa kembali.");
      } finally {
        setIsUploading(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        processExcelFile(file);
      } else {
        toast.error("Harap upload file Excel (.xlsx atau .xls)");
      }
    }
  };

  const handleConfirmUpload = async () => {
    try {
      setIsUploading(true);
      await batchImportShipments(previewData);
      setIsDialogOpen(false);
      toast.success(`${previewData.length} data berhasil diupload`);
      onUploadSuccess();
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error uploading data:", error);
      toast.error("Gagal mengupload data. Silakan coba lagi.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        <Upload className="mr-2 h-4 w-4" />
        Upload Excel
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
      />
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Konfirmasi Upload Data</DialogTitle>
            <DialogDescription>
              {previewData.length} data siap diupload ke sistem
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-60 overflow-auto border rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Surat Jalan</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perusahaan</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.slice(0, 5).map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">{item.noSuratJalan}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">{item.perusahaan}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">{item.qty}</td>
                  </tr>
                ))}
                {previewData.length > 5 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm text-center text-gray-500">
                      ... dan {previewData.length - 5} data lainnya
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button onClick={handleConfirmUpload} disabled={isUploading}>
              {isUploading ? "Mengupload..." : "Upload Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileUploader;
