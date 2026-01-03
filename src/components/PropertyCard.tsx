'use client';
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MapPin } from 'lucide-react';
import { Property } from './data/mockData';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface PropertyCardProps {
  property: Property;
  onViewDetails?: (property: Property) => void;
  onScheduleViewing?: (property: Property) => void;
  showActions?: boolean;
  showPrice?: boolean;
}

export function PropertyCard({ 
  property, 
  onViewDetails, 
  onScheduleViewing, 
  showActions = true,
  showPrice = true,
}: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return `PHP ${price.toLocaleString('en-PH')}`;
  };

  const getStatusColor = (status: Property['status']) => {
    switch (status) {
      case 'Available':
        return 'bg-[#3BAE4A]/10 text-[#3BAE4A] border-[#3BAE4A]/20';
      case 'Reserved':
        return 'bg-[#F4C542]/10 text-[#E67E22] border-[#F4C542]/20';
      case 'Sold':
        return 'bg-red-100 text-red-600 border-red-200';
      default:
        return 'bg-[#D9D9D9]/10 text-[#1B2C48] border-[#D9D9D9]/20';
    }
  };

  const imageSrc = property.image && property.image.trim().length > 0
    ? property.image
    : 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-0">
        <div className="relative">
          <ImageWithFallback
            src={imageSrc}
            alt={property.name}
            className="w-full h-48 object-cover"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="mb-2 flex items-center gap-2">
          {property.name}
          <Badge className={`text-xs px-2 py-1 ${getStatusColor(property.status)}`}>
            {property.status}
          </Badge>
        </CardTitle>
        <div className="flex items-center text-muted-foreground mb-2">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="text-sm">{property.location}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{property.description}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {property.features.slice(0, 3).map((feature, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {feature}
            </Badge>
          ))}
        </div>
        {showPrice && (
          <div className="text-2xl font-bold text-[#2E5D9F]">
            {formatPrice(property.price)}
          </div>
        )}
      </CardContent>
      {showActions && (
        <CardFooter className="p-4 pt-0 flex gap-2">
          {onViewDetails && (
            <Button 
              variant="outline" 
              onClick={() => onViewDetails(property)}
              className="flex-1"
            >
              View Details
            </Button>
          )}
          {onScheduleViewing && property.status === 'Available' && (
            <Button 
              onClick={() => onScheduleViewing(property)}
              className="flex-1"
            >
              Schedule Viewing
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
