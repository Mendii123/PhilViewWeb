'use client';
import React from 'react';
import type { User } from '@/types/user';
import { Button } from './ui/button';
import { Home, LogOut } from 'lucide-react';

const philviewLogo = '/philview-logo.png';

interface NavigationProps {
  currentUser: User | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
  onOpenLogin: () => void;
}

export function Navigation({ currentUser, onLogout, onNavigate, currentPage, onOpenLogin }: NavigationProps) {
  if (!currentUser) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <img 
                src={philviewLogo} 
                alt="Philstar Marketing Development Inc." 
                className="h-10"
              />
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant={currentPage === 'home' ? 'default' : 'ghost'}
                onClick={() => onNavigate('home')}
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              <Button
                variant={currentPage === 'properties' ? 'default' : 'ghost'}
                onClick={() => onNavigate('properties')}
              >
                Properties
              </Button>
              <Button
                variant={currentPage === 'about' ? 'default' : 'ghost'}
                onClick={() => onNavigate('about')}
              >
                About
              </Button>
              <Button onClick={onOpenLogin}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  const getNavItems = () => {
    switch (currentUser.role) {
      case 'owner':
        return [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'directors', label: 'Directors' },
          { id: 'create-director', label: 'New Director' },
          { id: 'reports', label: 'Reports' }
        ];
      case 'director':
        return [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'management', label: 'Management' },
          { id: 'appointments', label: 'Appointments' },
          { id: 'properties', label: 'Properties' },
          { id: 'interior-approvals', label: 'Interior Approvals' },
          { id: 'create-staff', label: 'New Staff' }
        ];
      case 'client':
        return [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'properties', label: 'Browse Properties' },
          { id: 'balance', label: 'Balance' },
          { id: 'appointments', label: 'Appointments' },
          { id: 'company', label: 'Company' }
        ];
      case 'broker':
        return [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'appointment-requests', label: 'Appointments' },
          { id: 'inquiries', label: 'Inquiries' }
        ];
      case 'accountant':
        return [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'clients', label: 'Clients' },
          { id: 'properties', label: 'Properties' },
          { id: 'inquiries', label: 'Inquiries' }
        ];
      case 'marketing':
        return [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'inquiries', label: 'Inquiries' },
          { id: 'appointments', label: 'Appointments' },
          { id: 'events', label: 'Events' }
        ];
      default:
        return [];
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <img 
              src={philviewLogo} 
              alt="Philstar Marketing Development Inc." 
              className="h-10"
            />
          </div>
          <div className="flex items-center space-x-4">
            {getNavItems().map((item) => (
              <Button
                key={item.id}
                variant={currentPage === item.id ? 'default' : 'ghost'}
                onClick={() => onNavigate(item.id)}
              >
                {item.label}
              </Button>
            ))}
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l">
              <span className="text-sm text-muted-foreground">
                {currentUser.name} ({currentUser.role})
              </span>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
