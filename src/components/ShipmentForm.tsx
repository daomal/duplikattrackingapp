
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createShipment } from "@/lib/shipmentService";
import { Shipment } from "@/lib/types";

interface ShipmentFormProps {
  onShipmentCreated: () => void;
  drivers: string[];
}

const ShipmentForm: React.FC<ShipmentFormProps> = ({ onShipmentCreated, drivers }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    noSuratJalan: "",
    perusahaan: "",
    tujuan: "",
    supir: "",
    tanggalKirim: new Date(),
    qty: 0
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "qty" ? parseInt(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        tanggalKirim: date
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.noSuratJalan || !formData.perusahaan || !formData.tujuan || !formData.supir) {
      toast.error("Mohon lengkapi semua field wajib");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const newShipment: Omit<Shipment, "id"> = {
        noSuratJalan: formData.noSuratJalan,
        perusahaan: formData.perusahaan,
        tujuan: formData.tujuan,
        supir: formData.supir,
        tanggalKirim: format(formData.tanggalKirim, "yyyy-MM-dd"),
        tanggalTiba: null,
        waktuTiba: null,
        status: "tertunda",
        kendala: null,
        qty: formData.qty
      };
      
      await createShipment(newShipment);
      
      toast.success("Pengiriman berhasil dibuat");
      
      // Reset form
      setFormData({
        noSuratJalan: "",
        perusahaan: "",
        tujuan: "",
        supir: "",
        tanggalKirim: new Date(),
        qty: 0
      });
      
      // Notify parent component
      onShipmentCreated();
    } catch (error: any) {
      console.error("Error creating shipment:", error);
      toast.error(error.message || "Gagal membuat pengiriman baru");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="noSuratJalan">No. Surat Jalan*</Label>
          <Input
            id="noSuratJalan"
            name="noSuratJalan"
            value={formData.noSuratJalan}
            onChange={handleChange}
            placeholder="Nomor Surat Jalan"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="perusahaan">Perusahaan*</Label>
          <Input
            id="perusahaan"
            name="perusahaan"
            value={formData.perusahaan}
            onChange={handleChange}
            placeholder="Nama Perusahaan"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tujuan">Tujuan*</Label>
          <Input
            id="tujuan"
            name="tujuan"
            value={formData.tujuan}
            onChange={handleChange}
            placeholder="Tujuan Pengiriman"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="supir">Supir*</Label>
          <Select
            value={formData.supir}
            onValueChange={(value) => handleSelectChange("supir", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih Supir" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((driver) => (
                <SelectItem key={driver} value={driver}>
                  {driver}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Tanggal Kirim*</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.tanggalKirim && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.tanggalKirim ? format(formData.tanggalKirim, "dd/MM/yyyy") : <span>Pilih Tanggal</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.tanggalKirim}
                onSelect={handleDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="qty">Jumlah Qty</Label>
          <Input
            id="qty"
            name="qty"
            type="number"
            value={formData.qty}
            onChange={handleChange}
            placeholder="Jumlah"
          />
        </div>
      </div>
      
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : "Tambah Pengiriman"}
      </Button>
    </form>
  );
};

export default ShipmentForm;
