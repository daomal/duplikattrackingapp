
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void;
  onImageRemoved: () => void;
  currentImageUrl?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  onImageRemoved,
  currentImageUrl
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file tidak boleh lebih dari 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id || 'anonymous'}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('note-images')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('note-images')
        .getPublicUrl(data.path);

      onImageUploaded(publicUrl);
      toast.success('Gambar berhasil diupload');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Gagal upload gambar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onImageRemoved();
  };

  return (
    <div className="space-y-2">
      {currentImageUrl ? (
        <div className="relative">
          <img
            src={currentImageUrl}
            alt="Preview"
            className="max-w-full h-32 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-1 right-1"
            onClick={handleRemoveImage}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              asChild
            >
              <span className="cursor-pointer">
                {isUploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Image className="mr-2 h-4 w-4" />
                    Tambah Gambar
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
