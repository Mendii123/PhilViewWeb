'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Users,
  Calendar,
  Building2,
  Bell,
  Mail,
  UserPlus,
  Archive,
} from 'lucide-react';
import { fetchAllAppointments, type AppointmentRecord } from '@/lib/appointments';
import { fetchProperties, type PropertyRecord } from '@/lib/properties';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, secondaryAuth } from '@/lib/firebaseClient';

interface CompanyOwnerDashboardProps {
  currentPage: string;
}

type RoleCounts = {
  owners: number;
  directors: number;
  brokers: number;
  accountants: number;
  marketing: number;
  clients: number;
};

type DirectorUser = {
  id: string;
  name: string;
  email: string;
  archived?: boolean;
};

export function CompanyOwnerDashboard({ currentPage }: CompanyOwnerDashboardProps) {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [roleCounts, setRoleCounts] = useState<RoleCounts>({
    owners: 0,
    directors: 0,
    brokers: 0,
    accountants: 0,
    marketing: 0,
    clients: 0,
  });
  const [directors, setDirectors] = useState<DirectorUser[]>([]);
  const [directorForm, setDirectorForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });

  useEffect(() => {
    void fetchAllAppointments().then(setAppointments).catch(() => setAppointments([]));
    void fetchProperties().then(setProperties).catch(() => setProperties([]));
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      let owners = 0;
      let directorsCount = 0;
      let brokers = 0;
      let accountants = 0;
      let marketing = 0;
      let clients = 0;
      const directorList: DirectorUser[] = [];
      snap.forEach((d) => {
        const data = d.data() as { role?: string; name?: string; email?: string; archived?: boolean };
        switch (data.role) {
          case 'owner':
            owners += 1;
            break;
          case 'director':
            directorsCount += 1;
            directorList.push({
              id: d.id,
              name: data.name ?? 'Director',
              email: data.email ?? '',
              archived: data.archived ?? false,
            });
            break;
          case 'broker':
            brokers += 1;
            break;
          case 'accountant':
            accountants += 1;
            break;
          case 'marketing':
            marketing += 1;
            break;
          case 'client':
            clients += 1;
            break;
          default:
            break;
        }
      });
      setRoleCounts({ owners, directors: directorsCount, brokers, accountants, marketing, clients });
      setDirectors(directorList);
    });
    return () => unsub();
  }, []);

  const overview = useMemo(() => {
    const pending = appointments.filter((a) => a.status === 'Pending').length;
    const confirmed = appointments.filter((a) => a.status === 'Confirmed').length;
    const availableUnits = properties.filter((p) => p.status === 'Available').length;
    return { pending, confirmed, availableUnits };
  }, [appointments, properties]);

  const createDirector = async () => {
    if (!directorForm.name || !directorForm.email || !directorForm.password || !directorForm.confirmPassword) {
      alert('Enter name, email, and password');
      return;
    }
    if (directorForm.password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    if (directorForm.password !== directorForm.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    try {
      const email = directorForm.email.trim();
      const creds = await createUserWithEmailAndPassword(secondaryAuth, email, directorForm.password);
      await setDoc(doc(db, 'users', creds.user.uid), {
        name: directorForm.name.trim(),
        email,
        role: 'director',
        archived: false,
        createdAt: new Date().toISOString(),
      });
      await signOut(secondaryAuth);
      setDirectorForm({ name: '', email: '', password: '', confirmPassword: '' });
    } catch (error) {
      console.error('Failed to create director', error);
      alert('Could not create director. Check console for details.');
    }
  };

  const toggleArchiveDirector = async (id: string, archived: boolean) => {
    setDirectors((prev) => prev.map((d) => (d.id === id ? { ...d, archived: !archived } : d)));
    try {
      await updateDoc(doc(db, 'users', id), { archived: !archived });
    } catch (error) {
      console.error('Failed to toggle archive', error);
    }
  };

  const formatPeso = (value: number) => `PHP ${value.toLocaleString('en-PH')}`;

  if (currentPage === 'create-director') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Create Director Account</h1>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Director</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Full Name</label>
                <Input
                  value={directorForm.name}
                  onChange={(e) => setDirectorForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Director name"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <Input
                  type="email"
                  value={directorForm.email}
                  onChange={(e) => setDirectorForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="director@email.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Password</label>
                <Input
                  type="password"
                  value={directorForm.password}
                  onChange={(e) => setDirectorForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Confirm Password</label>
                <Input
                  type="password"
                  value={directorForm.confirmPassword}
                  onChange={(e) => setDirectorForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Re-enter password"
                />
              </div>
            </div>
            <Button onClick={createDirector}>
              <UserPlus className="h-4 w-4 mr-2" /> Create Director
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Directors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {directors.map((director) => (
                <div key={director.id} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-semibold">{director.name}</p>
                    <p className="text-sm text-muted-foreground">{director.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={director.archived ? 'secondary' : 'default'}>
                      {director.archived ? 'Archived' : 'Active'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleArchiveDirector(director.id, director.archived ?? false)}
                    >
                      {director.archived ? 'Restore' : 'Archive'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentPage === 'directors') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Director Accounts</h1>
        <Card>
          <CardHeader>
            <CardTitle>All Directors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {directors.map((director) => (
                <div key={director.id} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-semibold">{director.name}</p>
                    <p className="text-sm text-muted-foreground">{director.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={director.archived ? 'secondary' : 'default'}>
                      {director.archived ? 'Archived' : 'Active'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleArchiveDirector(director.id, director.archived ?? false)}
                    >
                      {director.archived ? 'Restore' : 'Archive'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentPage === 'reports') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">System Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Directors: {roleCounts.directors}</div>
                <div>Brokers: {roleCounts.brokers}</div>
                <div>Accountants: {roleCounts.accountants}</div>
                <div>Marketing: {roleCounts.marketing}</div>
                <div>Customers: {roleCounts.clients}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Pending: {overview.pending}</div>
                <div>Confirmed: {overview.confirmed}</div>
                <div>Total: {appointments.length}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Total: {properties.length}</div>
                <div>Available: {overview.availableUnits}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Default dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1B2C48]">Company Owner Dashboard</h1>
        <p className="text-muted-foreground">Monitor all roles, properties, and appointments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Directors</CardTitle>
            <Users className="h-4 w-4 text-[#2E5D9F]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2E5D9F]">{roleCounts.directors}</div>
            <p className="text-xs text-muted-foreground">Active directors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Accounts</CardTitle>
            <Users className="h-4 w-4 text-[#2E5D9F]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2E5D9F]">
              {roleCounts.brokers + roleCounts.accountants + roleCounts.marketing}
            </div>
            <p className="text-xs text-muted-foreground">Broker / Accountant / Marketing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-[#2E5D9F]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2E5D9F]">{roleCounts.clients}</div>
            <p className="text-xs text-muted-foreground">Registered customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Units</CardTitle>
            <Building2 className="h-4 w-4 text-[#2E5D9F]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2E5D9F]">{overview.availableUnits}</div>
            <p className="text-xs text-muted-foreground">Ready for sale</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointments.slice(0, 5).map((appt) => (
              <div key={appt.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{appt.clientName}</p>
                  <p className="text-sm text-muted-foreground">{appt.date} at {appt.time}</p>
                </div>
                <Badge variant={appt.status === 'Confirmed' ? 'default' : appt.status === 'Pending' ? 'secondary' : 'outline'}>
                  {appt.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Property Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {properties.slice(0, 5).map((property) => (
              <div key={property.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{property.name}</p>
                  <p className="text-sm text-muted-foreground">{property.location}</p>
                </div>
                <div className="text-right">
                  <Badge variant={
                    property.status === 'Available' ? 'default' :
                    property.status === 'Reserved' ? 'secondary' : 'outline'
                  }>
                    {property.status}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">{formatPeso(property.price)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><Bell className="h-4 w-4" /> Account activities monitored</div>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> Property updates and system alerts</div>
        </CardContent>
      </Card>
    </div>
  );
}
