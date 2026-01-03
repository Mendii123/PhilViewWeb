'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Users,
  Calendar,
  Building2,
  ClipboardCheck,
  Activity,
  Bell,
  Mail,
  CheckCircle,
  XCircle,
  UserPlus,
} from 'lucide-react';
import { fetchInquiries, type InquiryRecord } from '@/lib/inquiries';
import { fetchAllAppointments, type AppointmentRecord } from '@/lib/appointments';
import { fetchProperties, type PropertyRecord } from '@/lib/properties';
import { db } from '@/lib/firebaseClient';
import { addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';

interface DirectorDashboardProps {
  currentPage: string;
}

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: 'broker' | 'accountant' | 'marketing';
  archived?: boolean;
};

type InteriorRequest = {
  id: string;
  clientName: string;
  propertyName: string;
  details: string;
  status: 'Pending' | 'Approved' | 'Rejected';
};

const mockInteriorRequests: InteriorRequest[] = [
  {
    id: 'int-1',
    clientName: 'Maria Santos',
    propertyName: 'Skyline Residences',
    details: 'Custom interior with light oak floors and matte black fixtures.',
    status: 'Pending',
  },
  {
    id: 'int-2',
    clientName: 'Juan Dela Cruz',
    propertyName: 'Garden Villas',
    details: 'Add study room partition and upgrade kitchen countertops.',
    status: 'Pending',
  },
];

export function DirectorDashboard({ currentPage }: DirectorDashboardProps) {
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [interiors, setInteriors] = useState<InteriorRequest[]>(mockInteriorRequests);
  const [selectedInterior, setSelectedInterior] = useState<InteriorRequest | null>(null);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', role: 'broker' as StaffUser['role'] });

  useEffect(() => {
    void fetchInquiries().then(setInquiries).catch(() => setInquiries([]));
    void fetchAllAppointments().then(setAppointments).catch(() => setAppointments([]));
    void fetchProperties().then(setProperties).catch(() => setProperties([]));
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const staffUsers: StaffUser[] = [];
      let clientCounter = 0;
      snap.forEach((d) => {
        const data = d.data() as Partial<StaffUser> & { role?: string; archived?: boolean };
        if (data.role === 'client') {
          clientCounter += 1;
        }
        if (data.role === 'broker' || data.role === 'accountant' || data.role === 'marketing') {
          staffUsers.push({
            id: d.id,
            name: data.name ?? 'Staff',
            email: data.email ?? '',
            role: data.role,
            archived: data.archived ?? false,
          });
        }
      });
      setStaff(staffUsers);
      setClientsCount(clientCounter);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'interiors'), (snap) => {
      if (snap.empty) return;
      const loaded: InteriorRequest[] = snap.docs.map((d) => {
        const data = d.data() as Partial<InteriorRequest>;
        return {
          id: d.id,
          clientName: data.clientName ?? 'Client',
          propertyName: data.propertyName ?? 'Property',
          details: data.details ?? '',
          status: (data.status as InteriorRequest['status']) ?? 'Pending',
        };
      });
      if (loaded.length) setInteriors(loaded);
    });
    return () => unsub();
  }, []);

  const overview = useMemo(() => {
    const newInquiries = inquiries.filter((q) => q.status === 'New').length;
    const pendingAppointments = appointments.filter((a) => a.status === 'Pending').length;
    const confirmedAppointments = appointments.filter((a) => a.status === 'Confirmed').length;
    const availableUnits = properties.filter((p) => p.status === 'Available').length;
    return { newInquiries, pendingAppointments, confirmedAppointments, availableUnits };
  }, [appointments, inquiries, properties]);

  const createStaffAccount = async () => {
    if (!staffForm.name || !staffForm.email) {
      alert('Please enter name and email.');
      return;
    }
    try {
      await addDoc(collection(db, 'users'), {
        name: staffForm.name,
        email: staffForm.email,
        role: staffForm.role,
        archived: false,
        createdAt: new Date().toISOString(),
      });
      setStaffForm({ name: '', email: '', role: 'broker' });
    } catch (error) {
      console.error('Failed to create staff account', error);
      alert('Could not create staff account. See console for details.');
    }
  };

  const toggleArchiveStaff = async (id: string, archived: boolean) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, archived: !archived } : s)));
    try {
      await updateDoc(doc(db, 'users', id), { archived: !archived });
    } catch (error) {
      console.error('Failed to toggle archive', error);
    }
  };

  const updateInteriorStatus = async (req: InteriorRequest, status: InteriorRequest['status']) => {
    setInteriors((prev) => prev.map((r) => (r.id === req.id ? { ...r, status } : r)));
    try {
      await updateDoc(doc(db, 'interiors', req.id), { status });
    } catch {
      // if collection not present, keep local only
    }
  };

  const formatPeso = (value: number) => `PHP ${value.toLocaleString('en-PH')}`;

  if (currentPage === 'management') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Director Management</h1>
        <p className="text-muted-foreground mb-6">Review activities across broker, accountant, marketing, and customers.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{staff.length}</div>
              <p className="text-sm text-muted-foreground">Broker / Accountant / Marketing</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientsCount}</div>
              <p className="text-sm text-muted-foreground">Signed-up customers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Open Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.newInquiries + overview.pendingAppointments}</div>
              <p className="text-sm text-muted-foreground">New inquiries + pending appointments</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {appointments.slice(0, 5).map((appt) => (
                <div key={appt.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{appt.clientName} - {appt.propertyName}</p>
                    <p className="text-sm text-muted-foreground">{appt.date} at {appt.time}</p>
                  </div>
                  <Badge variant={appt.status === 'Confirmed' ? 'default' : appt.status === 'Pending' ? 'secondary' : 'outline'}>
                    {appt.status}
                  </Badge>
                </div>
              ))}
              {inquiries.slice(0, 5).map((inq) => (
                <div key={inq.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{inq.clientName}</p>
                    <p className="text-sm text-muted-foreground">{inq.propertyName}</p>
                  </div>
                  <Badge variant={inq.status === 'New' ? 'destructive' : 'secondary'}>{inq.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bell className="h-4 w-4" /> New inquiries: {overview.newInquiries}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bell className="h-4 w-4" /> Pending appointments: {overview.pendingAppointments}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bell className="h-4 w-4" /> Confirmed appointments: {overview.confirmedAppointments}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentPage === 'appointments') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Appointments Overview</h1>
        <Card>
          <CardHeader>
            <CardTitle>All Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {appointments.map((appt) => (
                <div key={appt.id} className="flex justify-between items-start border-b pb-3">
                  <div>
                    <p className="font-semibold">{appt.clientName} - {appt.propertyName}</p>
                    <p className="text-sm text-muted-foreground">{appt.date} at {appt.time} · {appt.type}</p>
                    {appt.notes ? <p className="text-sm text-muted-foreground">Notes: {appt.notes}</p> : null}
                  </div>
                  <Badge variant={
                    appt.status === 'Confirmed' ? 'default' :
                    appt.status === 'Pending' ? 'secondary' :
                    appt.status === 'Completed' ? 'outline' : 'destructive'
                  }>
                    {appt.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentPage === 'properties') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Property Management</h1>
        <Card>
          <CardHeader>
            <CardTitle>Property Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {properties.map((property) => (
                <div key={property.id} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-semibold">{property.name}</p>
                    <p className="text-sm text-muted-foreground">{property.location} · {property.type}</p>
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
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentPage === 'interior-approvals') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Customized Interior Approvals</h1>

        {selectedInterior && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Review Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p><strong>Client:</strong> {selectedInterior.clientName}</p>
              <p><strong>Property:</strong> {selectedInterior.propertyName}</p>
              <p className="text-muted-foreground">{selectedInterior.details}</p>
              <div className="flex gap-2">
                <Button onClick={() => updateInteriorStatus(selectedInterior, 'Approved')}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Approve
                </Button>
                <Button variant="destructive" onClick={() => updateInteriorStatus(selectedInterior, 'Rejected')}>
                  <XCircle className="h-4 w-4 mr-2" /> Reject
                </Button>
                <Button variant="outline" onClick={() => setSelectedInterior(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {interiors.map((req) => (
                <div key={req.id} className="flex justify-between items-start border-b pb-3">
                  <div>
                    <p className="font-semibold">{req.clientName}</p>
                    <p className="text-sm text-muted-foreground">{req.propertyName}</p>
                    <p className="text-sm text-muted-foreground">{req.details}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={
                      req.status === 'Pending' ? 'secondary' :
                      req.status === 'Approved' ? 'default' : 'destructive'
                    }>
                      {req.status}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => setSelectedInterior(req)}>
                      Review
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

  if (currentPage === 'create-staff') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Staff Accounts</h1>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Staff Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Name</label>
                <Input
                  value={staffForm.name}
                  onChange={(e) => setStaffForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <Input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Role</label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-white"
                  value={staffForm.role}
                  onChange={(e) => setStaffForm((p) => ({ ...p, role: e.target.value as StaffUser['role'] }))}
                >
                  <option value="broker">Broker</option>
                  <option value="accountant">Accountant</option>
                  <option value="marketing">Marketing Coordinator</option>
                </select>
              </div>
            </div>
            <Button onClick={createStaffAccount}>
              <UserPlus className="h-4 w-4 mr-2" /> Create Account
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staff.map((member) => (
                <div key={member.id} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <Badge className="mt-1">{member.role}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.archived ? 'secondary' : 'default'}>
                      {member.archived ? 'Archived' : 'Active'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleArchiveStaff(member.id, member.archived ?? false)}
                    >
                      {member.archived ? 'Restore' : 'Archive'}
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

  // Default dashboard overview
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1B2C48]">Director Dashboard</h1>
        <p className="text-muted-foreground">Operational overview and controls</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Inquiries</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-[#2E5D9F]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2E5D9F]">{overview.newInquiries}</div>
            <p className="text-xs text-muted-foreground">Last sync</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-[#2E5D9F]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2E5D9F]">{overview.pendingAppointments}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-[#2E5D9F]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2E5D9F]">{clientsCount}</div>
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

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" /> Confirmed Appointments: {overview.confirmedAppointments}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" /> Total Properties: {properties.length}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" /> Staff Accounts: {staff.length}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" /> Notifications enabled for inquiries and appointments
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" /> Account profile settings available via staff records
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Inquiries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inquiries.slice(0, 5).map((inq) => (
              <div key={inq.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{inq.clientName}</p>
                  <p className="text-sm text-muted-foreground">{inq.propertyName}</p>
                </div>
                <Badge variant={inq.status === 'New' ? 'destructive' : 'secondary'}>{inq.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
