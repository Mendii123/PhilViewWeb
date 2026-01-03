'use client';
import React, { useState, useRef } from 'react';
import { Property } from './data/mockData';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MapPin, Building2, Eye, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface PropertyMapViewProps {
  properties: Property[];
  onPropertySelect?: (property: Property) => void;
  selectedPropertyId?: string;
}

export function PropertyMapView({ properties, onPropertySelect, selectedPropertyId }: PropertyMapViewProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Calculate property position on map (normalized to map dimensions)
  const getPropertyPosition = (property: Property) => {
    // Metro Manila bounds (approximate)
    const bounds = {
      minLat: 14.35,
      maxLat: 14.85,
      minLng: 120.85,
      maxLng: 121.15,
    };

    const lat = property.coordinates.lat;
    const lng = property.coordinates.lng;

    // Normalize to 0-1 range
    const x = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
    const y = 1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat); // Invert Y

    return { x: x * 100, y: y * 100 }; // Convert to percentage
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return '#2E5D9F';
      case 'Reserved':
        return '#F4C542';
      case 'Sold':
        return '#D9D9D9';
      default:
        return '#2E5D9F';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Available':
        return 'default';
      case 'Reserved':
        return 'secondary';
      case 'Sold':
        return 'outline';
      default:
        return 'default';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === mapRef.current || (e.target as HTMLElement).closest('.map-background')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
  };

  const closePopup = () => {
    setSelectedProperty(null);
  };

  const formatPrice = (price: number) => `PHP ${price.toLocaleString('en-PH')}`;

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden border-2 border-[#D9D9D9] shadow-lg bg-[#E8F4F8]">
      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Map Background with Grid */}
        <div
          className="map-background absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.3s ease',
            backgroundImage: `
              linear-gradient(to right, rgba(46, 93, 159, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(46, 93, 159, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        >
          {/* Map Title */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md z-10">
            <h3 className="font-semibold text-[#1B2C48] text-center">Metro Manila Properties</h3>
            <p className="text-xs text-muted-foreground text-center">Drag to pan • Scroll or use buttons to zoom</p>
          </div>

          {/* Property Markers */}
          <div className="relative w-full h-full">
            {properties.map((property) => {
              const position = getPropertyPosition(property);
              const isHovered = hoveredProperty === property.id;
              const isSelected =
                selectedProperty?.id === property.id || selectedPropertyId === property.id;

              return (
                <div
                  key={property.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    zIndex: isHovered || isSelected ? 100 : 10,
                  }}
                  onMouseEnter={() => setHoveredProperty(property.id)}
                  onMouseLeave={() => setHoveredProperty(null)}
                  onClick={() => handlePropertyClick(property)}
                >
                  {/* Marker Pin */}
                  <div
                    className="relative cursor-pointer transition-transform duration-200 hover:scale-110"
                    style={{
                      transform: isHovered || isSelected ? 'scale(1.2)' : 'scale(1)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full border-3 border-white shadow-lg flex items-center justify-center"
                      style={{
                        backgroundColor: getStatusColor(property.status),
                        transform: 'rotate(-45deg)',
                        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                      }}
                    >
                      <MapPin
                        className="w-5 h-5 text-white"
                        style={{ transform: 'rotate(45deg)' }}
                      />
                    </div>
                    
                    {/* Hover Label */}
                    {isHovered && !isSelected && (
                      <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-white px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50">
                        <p className="font-semibold text-sm text-[#1B2C48]">{property.name}</p>
                        <p className="text-xs text-muted-foreground">{property.location}</p>
                        <p className="text-xs font-bold text-[#2E5D9F]">{formatPrice(property.price)}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Area Labels */}
          <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 bg-white/60 backdrop-blur-sm px-3 py-1 rounded text-xs font-semibold text-[#1B2C48]">
            Quezon City
          </div>
          <div className="absolute top-1/3 right-1/3 transform translate-x-1/2 -translate-y-1/2 bg-white/60 backdrop-blur-sm px-3 py-1 rounded text-xs font-semibold text-[#1B2C48]">
            Makati
          </div>
          <div className="absolute bottom-1/3 left-1/3 transform -translate-x-1/2 translate-y-1/2 bg-white/60 backdrop-blur-sm px-3 py-1 rounded text-xs font-semibold text-[#1B2C48]">
            Manila
          </div>
          <div className="absolute top-1/2 right-1/4 transform translate-x-1/2 -translate-y-1/2 bg-white/60 backdrop-blur-sm px-3 py-1 rounded text-xs font-semibold text-[#1B2C48]">
            Pasig
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        <Button
          size="sm"
          variant="secondary"
          className="bg-white hover:bg-gray-100 shadow-lg"
          onClick={handleZoomIn}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-white hover:bg-gray-100 shadow-lg"
          onClick={handleZoomOut}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-white hover:bg-gray-100 shadow-lg"
          onClick={handleReset}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
        <h4 className="font-semibold text-sm mb-2 text-[#1B2C48]">Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#2E5D9F] border-2 border-white"></div>
            <span className="text-xs">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#F4C542] border-2 border-white"></div>
            <span className="text-xs">Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#D9D9D9] border-2 border-white"></div>
            <span className="text-xs">Sold</span>
          </div>
        </div>
      </div>

      {/* Property Details Popup */}
      {selectedProperty && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
          <Card className="max-w-md w-full max-h-[80vh] overflow-y-auto">
            <CardContent className="p-0">
              {/* Close Button */}
              <button
                onClick={closePopup}
                className="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Property Image */}
              <div className="relative h-48">
                <img
                  src={selectedProperty.image}
                  alt={selectedProperty.name}
                  className="w-full h-full object-cover rounded-t-lg"
                />
                <Badge
                  className="absolute top-2 left-2"
                  variant={getStatusBadgeVariant(selectedProperty.status)}
                >
                  {selectedProperty.status}
                </Badge>
              </div>

              {/* Property Details */}
              <div className="p-6 space-y-4">
                <h3 className="font-bold text-2xl text-[#1B2C48]">
                  {selectedProperty.name}
                </h3>

                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  {selectedProperty.location}
                </div>

                <div className="flex items-center text-muted-foreground">
                  <Building2 className="h-4 w-4 mr-2" />
                  {selectedProperty.type}
                </div>

                <p className="text-muted-foreground">
                  {selectedProperty.description}
                </p>

                <div className="flex items-center text-3xl font-bold text-[#2E5D9F] pt-2">
                  {formatPrice(selectedProperty.price)}
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedProperty.features.map((feature, index) => (
                    <Badge key={index} variant="outline">
                      {feature}
                    </Badge>
                  ))}
                </div>

                {onPropertySelect && (
                  <Button
                    className="w-full bg-[#2E5D9F] hover:bg-[#1B2C48]"
                    onClick={() => {
                      onPropertySelect(selectedProperty);
                      closePopup();
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Details
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
