'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Building2, Users, Target, Award, MapPin, Phone, Mail } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">About Philstar Development</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Building communities and creating lasting value for over two decades
          </p>
        </div>

        {/* Company Overview */}
        <div className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <p className="text-muted-foreground mb-4">
                Founded in 2000, Philstar Marketing and Development Inc. has been at the forefront 
                of Philippine real estate development. We specialize in creating premium residential 
                and commercial properties that combine modern design with sustainable practices.
              </p>
              <p className="text-muted-foreground mb-4">
                Our commitment to excellence has earned us recognition as one of the most trusted 
                developers in Metro Manila, with over 50 successful projects and thousands of 
                satisfied homeowners.
              </p>
              <p className="text-muted-foreground">
                We believe that every home should be a sanctuary, every community should foster 
                connections, and every development should contribute positively to the environment.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <Building2 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">50+</div>
                  <div className="text-sm text-muted-foreground">Projects Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">5,000+</div>
                  <div className="text-sm text-muted-foreground">Happy Families</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Award className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">24</div>
                  <div className="text-sm text-muted-foreground">Years Experience</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">15</div>
                  <div className="text-sm text-muted-foreground">Prime Locations</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Target className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To create exceptional living spaces that enhance the quality of life for our residents 
                while contributing to sustainable urban development and community building.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Building2 className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To be the premier real estate developer in the Philippines, known for innovation, 
                quality, and commitment to creating communities where families can thrive.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Core Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Excellence</h3>
                <p className="text-sm text-muted-foreground">
                  We pursue excellence in every aspect of our work, from design to delivery.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Community</h3>
                <p className="text-sm text-muted-foreground">
                  We build more than homes; we create communities where people connect.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Sustainability</h3>
                <p className="text-sm text-muted-foreground">
                  We are committed to environmentally responsible development practices.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Get in Touch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <MapPin className="h-6 w-6 text-primary mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Head Office</h4>
                <p className="text-sm text-muted-foreground">
                  123 Ayala Avenue<br />
                  Makati City, Metro Manila<br />
                  Philippines 1226
                </p>
              </div>
              <div>
                <Phone className="h-6 w-6 text-primary mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Phone</h4>
                <p className="text-sm text-muted-foreground">
                  +63 2 8123 4567<br />
                  +63 917 123 4567
                </p>
              </div>
              <div>
                <Mail className="h-6 w-6 text-primary mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Email</h4>
                <p className="text-sm text-muted-foreground">
                  info@philstardevelopment.com<br />
                  sales@philstardevelopment.com
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}