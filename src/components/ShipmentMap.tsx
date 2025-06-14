import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { supabase } from '@/integrations/supabase/client';
import { Shipment } from '@/lib/types';
import { mapSupabaseShipment } from '@/lib/shipmentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Building, Clock, Navigation } from 'lucide-react';
import { toast } from 'sonner';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Configure default marker icons
const DefaultIcon = new Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom truck icon for shipments
const TruckIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
      <path d="M15 18H9"/>
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
      <circle cx="17" cy="18" r="2"/>
      <circle cx="7" cy="18" r="2"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

interface ShipmentMapProps {
  className?: string;
}

interface ShipmentWithLocation extends Shipment {
  current_lat: number;
  current_lng: number;
  lastUpdated?: string;
}

const ShipmentMap: React.FC<ShipmentMapProps> = ({ className }) => {
  const [shipments, setShipments] = useState<ShipmentWithLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([-6.2088, 106.8456]); // Jakarta default
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Fetch initial shipments with location data
  const fetchShipmentsWithLocation = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('status', 'tertunda')
        .not('current_lat', 'is', null)
        .not('current_lng', 'is', null);

      if (error) {
        console.error('Error fetching shipments:', error);
        toast.error('Gagal memuat data pengiriman');
        return;
      }

      const shipmentsWithLocation = data
        .filter(shipment => shipment.current_lat && shipment.current_lng)
        .map(shipment => ({
          ...mapSupabaseShipment(shipment),
          current_lat: shipment.current_lat,
          current_lng: shipment.current_lng,
          lastUpdated: shipment.updated_at
        }));

      setShipments(shipmentsWithLocation);

      // Set map center to first shipment location if available
      if (shipmentsWithLocation.length > 0) {
        const firstShipment = shipmentsWithLocation[0];
        setMapCenter([firstShipment.current_lat, firstShipment.current_lng]);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchShipmentsWithLocation:', error);
      toast.error('Terjadi kesalahan saat memuat data');
      setIsLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    // Initial fetch
    fetchShipmentsWithLocation();

    // Set up real-time subscription
    const channel = supabase
      .channel('shipments-location-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments',
          filter: 'status=eq.tertunda'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const updatedShipment = payload.new;
            
            // Only process if location data exists
            if (updatedShipment.current_lat && updatedShipment.current_lng) {
              const shipmentWithLocation = {
                ...mapSupabaseShipment(updatedShipment),
                current_lat: updatedShipment.current_lat,
                current_lng: updatedShipment.current_lng,
                lastUpdated: updatedShipment.updated_at
              };

              setShipments(prev => {
                const existingIndex = prev.findIndex(s => s.id === shipmentWithLocation.id);
                
                if (existingIndex >= 0) {
                  // Update existing shipment
                  const newShipments = [...prev];
                  newShipments[existingIndex] = shipmentWithLocation;
                  
                  // Animate marker to new position
                  const marker = markersRef.current.get(shipmentWithLocation.id);
                  if (marker) {
                    const newLatLng = [shipmentWithLocation.current_lat, shipmentWithLocation.current_lng] as LatLngExpression;
                    marker.setLatLng(newLatLng);
                    
                    // Show toast notification for location update
                    toast.info(`Lokasi ${shipmentWithLocation.supir} diperbarui`, {
                      description: `Menuju ${shipmentWithLocation.tujuan}`,
                      duration: 3000
                    });
                  }
                  
                  return newShipments;
                } else {
                  // Add new shipment
                  return [...prev, shipmentWithLocation];
                }
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setShipments(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Format last updated time
  const formatLastUpdated = (timestamp?: string) => {
    if (!timestamp) return 'Tidak diketahui';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    
    return date.toLocaleDateString('id-ID');
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 animate-spin" />
            Memuat Peta Pelacakan...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Mengambil data lokasi pengiriman...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600" />
            Peta Pelacakan Real-time
          </CardTitle>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {shipments.length} Pengiriman Aktif
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {shipments.length === 0 ? (
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
            <div className="text-center">
              <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Tidak Ada Pengiriman Aktif
              </h3>
              <p className="text-gray-500">
                Saat ini tidak ada pengiriman dengan data lokasi yang tersedia.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-96 w-full rounded-lg overflow-hidden border">
            <MapContainer
              center={mapCenter}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {shipments.map((shipment) => (
                <Marker
                  key={shipment.id}
                  position={[shipment.current_lat, shipment.current_lng]}
                  icon={TruckIcon}
                  ref={(ref) => {
                    if (ref) {
                      markersRef.current.set(shipment.id, ref);
                    }
                  }}
                >
                  <Popup className="custom-popup">
                    <div className="p-2 min-w-[250px]">
                      <div className="flex items-center gap-2 mb-3">
                        <Truck className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-lg">{shipment.supir}</h3>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Perusahaan:</span>
                          <span>{shipment.perusahaan}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Tujuan:</span>
                          <span>{shipment.tujuan}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">No. SJ:</span>
                          <span>{shipment.noSuratJalan}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Qty:</span>
                          <span>{shipment.qty}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Update terakhir:</span>
                          <span className="text-green-600">
                            {formatLastUpdated(shipment.lastUpdated)}
                          </span>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <Badge 
                            variant="secondary" 
                            className="bg-yellow-100 text-yellow-800"
                          >
                            Dalam Perjalanan
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
        
        {/* Legend */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Keterangan:</h4>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              <span>Pengiriman Aktif</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Update Real-time</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShipmentMap;