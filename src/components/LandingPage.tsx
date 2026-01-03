'use client';
import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Building2, Users, Award } from 'lucide-react';
import { PropertyCard } from './PropertyCard';
import { mockProperties } from './data/mockData';
import { fetchProperties, type PropertyRecord } from '@/lib/properties';

const philviewLogo = '/philview-logo.png';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const [properties, setProperties] = useState<PropertyRecord[]>(mockProperties);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchProperties();
        if (isMounted && data.length) {
          setProperties(data);
        }
      } catch (error) {
        console.error('Failed to load properties from Firestore', error);
        // fall back to mockProperties already in state
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const featuredProperties = properties.slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#2E5D9F] to-[#1B2C48] text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="mb-8">
              <img 
                src={philviewLogo} 
                alt="Philstar Marketing Development Inc." 
                className="h-20 mx-auto mb-4"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Your Dream Home Awaits
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              Building communities, creating futures for over two decades
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-[#F4C542] text-[#1B2C48] hover:bg-[#E67E22] hover:text-white"
                onClick={() => onNavigate('properties')}
              >
                Explore Properties
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white hover:text-[#2E5D9F]"
                onClick={() => onNavigate('login')}
              >
                Client Portal
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Philstar?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              With over two decades of experience, we&apos;ve been helping families find their perfect homes
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-[#D9D9D9] shadow-lg">
              <CardHeader>
                <Building2 className="h-12 w-12 text-[#2E5D9F] mb-4" />
                <CardTitle className="text-[#1B2C48]">Premium Developments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#1B2C48]">
                  Thoughtfully designed properties in prime locations with modern amenities and sustainable features.
                </p>
              </CardContent>
            </Card>
            <Card className="border-[#D9D9D9] shadow-lg">
              <CardHeader>
                <Users className="h-12 w-12 text-[#2E5D9F] mb-4" />
                <CardTitle className="text-[#1B2C48]">Expert Guidance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#1B2C48]">
                  Our experienced team provides personalized support throughout your property journey.
                </p>
              </CardContent>
            </Card>
            <Card className="border-[#D9D9D9] shadow-lg">
              <CardHeader>
                <Award className="h-12 w-12 text-[#2E5D9F] mb-4" />
                <CardTitle className="text-[#1B2C48]">Trusted Excellence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#1B2C48]">
                  Award-winning developer with a proven track record of delivering quality projects on time.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Featured Properties</h2>
            <p className="text-lg text-muted-foreground">
              Discover our latest developments and find your perfect home
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                showActions={false}
                showPrice={false}
              />
            ))}
          </div>
          <div className="text-center mt-8">
            <Button 
              size="lg"
              className="bg-[#2E5D9F] hover:bg-[#1B2C48]"
              onClick={() => onNavigate('properties')}
            >
              View All Properties
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#2E5D9F] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Dream Home?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Connect with our experts and explore financing options tailored to your needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-[#F4C542] text-[#1B2C48] hover:bg-[#E67E22] hover:text-white"
              onClick={() => onNavigate('login')}
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white hover:text-[#2E5D9F]"
              onClick={() => onNavigate('about')}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
