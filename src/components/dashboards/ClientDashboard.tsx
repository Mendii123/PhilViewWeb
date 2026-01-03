'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar, DollarSign, MapPin, Clock, Smartphone, Eye, Grid3x3, Map } from 'lucide-react';
import { mockProperties, type Property } from '../data/mockData';
import type { AppointmentPrefill } from '@/types/actions';
import { PropertyCard } from '../PropertyCard';
import { PropertyMapView } from '../PropertyMapView';
import { fetchProperties, type PropertyRecord } from '@/lib/properties';
import { createAppointmentForUser, fetchAppointmentsForUser, cancelAppointment, updateAppointmentStatus, type AppointmentRecord } from '@/lib/appointments';
import { ensureUserProfile, type UserProfile } from '@/lib/userProfile';
import type { User } from '@/types/user';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

interface ClientDashboardProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  appointmentPrefill?: AppointmentPrefill;
  currentUser: User;
}

export function ClientDashboard({ currentPage, onNavigate, appointmentPrefill, currentUser }: ClientDashboardProps) {
  const [properties, setProperties] = useState<PropertyRecord[]>(mockProperties);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [appointmentType, setAppointmentType] = useState<'Viewing' | 'Consultation'>('Viewing');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [contactPreference, setContactPreference] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | 'none'>('none');
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [respondedAppointments, setRespondedAppointments] = useState<AppointmentRecord[]>([]);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const lastPrefillNonce = React.useRef<string | null>(null);
  const appointmentIdRef = React.useRef(1000);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  const formatPeso = (value: number) => `PHP ${value.toLocaleString('en-PH')}`;
  const totalCredits =
    typeof profile?.credits === 'number'
      ? profile.credits
      : profile?.transactions?.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalDebits =
    typeof profile?.debits === 'number'
      ? profile.debits
      : profile?.transactions?.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0) ?? 0;
  const currentBalance = profile?.balance ?? 0;
  const availableBalance =
    typeof profile?.available === 'number' ? profile.available : currentBalance + totalCredits + totalDebits;

  const nextAppointmentId = () => {
    appointmentIdRef.current += 1;
    return appointmentIdRef.current.toString();
  };

  // Keep responded list in sync
  useEffect(() => {
    setRespondedAppointments(
      appointments.filter((apt) => apt.status !== 'Pending' || Boolean(apt.responseNote))
    );
  }, [appointments]);

  const createAppointment = React.useCallback(
    async (
      property: Property | null,
      dateValue: string,
      timeValue: string,
      silent?: boolean,
      typeValue: 'Viewing' | 'Consultation' = 'Viewing',
      notesValue?: string,
      contactValue?: string
    ) => {
      const newAppointment: AppointmentRecord = {
        id: nextAppointmentId(),
        userId: currentUser.id,
        clientName: currentUser.name,
        clientEmail: currentUser.email,
        propertyId: property?.id ?? 'n/a',
        propertyName: property?.name ?? 'Consultation',
        date: dateValue,
        time: timeValue,
        status: 'Pending',
        type: typeValue,
        notes: notesValue,
        contact: contactValue,
        persisted: false,
      };
      setAppointments((prev) => [...prev, newAppointment]);
      if (!silent) {
        // Silent mode when triggered via chatbot; otherwise proceed without alerts per request.
      }
      try {
        const newId = await createAppointmentForUser(currentUser.id, newAppointment);
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === newAppointment.id ? { ...newAppointment, id: newId, persisted: true } : apt
          )
        );
      } catch (error) {
        console.error('Failed to save appointment', error);
      }
      setSelectedProperty(null);
      setSelectedPropertyId('none');
      setAppointmentNotes('');
      setContactPreference('');
      setAppointmentType('Viewing');

      setRespondedAppointments((prev) => prev);
    },
    [currentUser.email, currentUser.id, currentUser.name]
  );
  const clientBalance = currentBalance;
  const clientAppointments = appointments;

  // Load properties from Firestore; keep mock data as fallback.
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoadingProperties(true);
      try {
        const data = await fetchProperties();
        if (isMounted && data.length) {
          setProperties(data);
        }
      } catch (error) {
        console.error('Failed to load properties from Firestore', error);
      } finally {
        if (isMounted) {
          setIsLoadingProperties(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load user profile & appointments from Firestore (realtime)
  useEffect(() => {
    let isMounted = true;
    setIsLoadingAppointments(true);
    // Ensure profile exists
    void ensureUserProfile(currentUser.id).catch((err) => console.error('Profile ensure failed', err));

    const unsubProfile = onSnapshot(doc(db, 'users', currentUser.id), (snap) => {
      if (!isMounted) return;
      if (snap.exists()) {
        const data = snap.data() as Partial<UserProfile>;
        const transactions = Array.isArray(data.transactions)
          ? (data.transactions as UserProfile['transactions'])
          : [];
        const creditsVal =
          typeof data.credits === 'number'
            ? data.credits
            : transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const debitsVal =
          typeof data.debits === 'number'
            ? data.debits
            : transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
        const balanceVal = typeof data.balance === 'number' ? data.balance : 0;
        setProfile({
          balance: balanceVal,
          transactions,
          credits: creditsVal,
          debits: debitsVal,
          available: typeof data.available === 'number' ? data.available : balanceVal + creditsVal + debitsVal,
        });
      } else {
        setProfile({ balance: 0, transactions: [], credits: 0, debits: 0, available: 0 });
      }
    });

    const q = query(collection(db, 'appointments'), where('userId', '==', currentUser.id));
    const unsubAppts = onSnapshot(q, (snap) => {
      if (!isMounted) return;
      const appts = snap.docs.map((d) => {
        const data = d.data() as Partial<AppointmentRecord>;
        return {
          id: d.id,
          userId: currentUser.id,
          clientName: data.clientName ?? '',
          clientEmail: data.clientEmail ?? '',
          propertyId: data.propertyId ?? '',
          propertyName: data.propertyName ?? '',
          date: data.date ?? '',
          time: data.time ?? '',
          status: (data.status as AppointmentRecord['status']) ?? 'Pending',
          type: (data.type as AppointmentRecord['type']) ?? 'Viewing',
          notes: (data as { notes?: string }).notes,
          contact: (data as { contact?: string }).contact,
          responseNote: data.responseNote,
          persisted: true,
        };
      });
      setAppointments(appts);
      setRespondedAppointments(appts.filter((apt) => apt.status !== 'Pending' || Boolean(apt.responseNote)));
      setIsLoadingAppointments(false);
    }, (error) => {
      console.error('Failed to subscribe appointments', error);
      setIsLoadingAppointments(false);
    });

    return () => {
      isMounted = false;
      unsubProfile();
      unsubAppts();
    };
  }, [currentUser.id]);

  // Prefill appointment when triggered externally (e.g., chatbot)
  React.useEffect(() => {
    if (currentPage !== 'appointments') return;
    if (!appointmentPrefill) return;

    const incomingNonce = appointmentPrefill?.nonce || null;
    if (incomingNonce && incomingNonce === lastPrefillNonce.current) {
      return;
    }

    const property =
      (appointmentPrefill?.propertyId && properties.find((p) => p.id === appointmentPrefill.propertyId)) ||
      properties.find((p) => p.status === 'Available') ||
      properties[0];

    if (appointmentPrefill?.cancel) {
      // Cancel a pending appointment that matches provided hints.
      setAppointments((prev) => {
        const target = prev.find((apt) => {
          if (apt.status !== 'Pending') return false;
          const matchProperty =
            !appointmentPrefill.cancel?.propertyName ||
            apt.propertyName.toLowerCase().includes(appointmentPrefill.cancel.propertyName.toLowerCase());
          const matchDate = !appointmentPrefill.cancel?.date || apt.date === appointmentPrefill.cancel.date;
          const matchTime = !appointmentPrefill.cancel?.time || apt.time === appointmentPrefill.cancel.time;
          return matchProperty && matchDate && matchTime;
        });
        if (!target) return prev;
        return prev.filter((apt) => apt.id !== target.id);
      });
      lastPrefillNonce.current = incomingNonce;
      return;
    }

    if (property) {
      setSelectedProperty(property);
      setSelectedPropertyId(property.id);
    } else {
      setSelectedProperty(null);
      setSelectedPropertyId('none');
    }
    setShowAppointmentForm(true);
    setIsFormCollapsed(false);
    const today = new Date().toISOString().split('T')[0];
    setAppointmentDate(appointmentPrefill?.date || today);
    setAppointmentTime(appointmentPrefill?.time || '10:00');
    setAppointmentType('Viewing');
    setAppointmentNotes('');
    setContactPreference('');

    // Auto-submit if requested and we have a property plus date/time
    if (appointmentPrefill?.autoSubmit && property) {
      const dateValue = appointmentPrefill.date || today;
      const timeValue = appointmentPrefill.time || '10:00';
      createAppointment(property, dateValue, timeValue, true);
      lastPrefillNonce.current = incomingNonce;
    } else {
      lastPrefillNonce.current = incomingNonce;
    }
  }, [appointmentPrefill, createAppointment, currentPage, properties]);

  if (currentPage === 'balance') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Account Balance</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#2E5D9F] mb-4">{formatPeso(clientBalance)}</div>
              <p className="text-muted-foreground mb-4">
                Available for property purchases and reservations
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Credits</span>
                  <span>{formatPeso(totalCredits)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Debits</span>
                  <span>{formatPeso(Math.abs(totalDebits))}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total Available</span>
                  <span className="font-semibold">{formatPeso(availableBalance)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile?.transactions?.map((txn, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{txn.label}</p>
                      <p className="text-sm text-muted-foreground">{txn.date}</p>
                    </div>
                    <span className={txn.amount >= 0 ? "text-green-600" : "text-red-600"}>
                      {txn.amount >= 0 ? "+" : "-"}
                      {formatPeso(Math.abs(txn.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

    if (currentPage === 'appointments') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <Button
            onClick={() => {
              setSelectedProperty(null);
              setSelectedPropertyId('none');
              setShowAppointmentForm(true);
              setIsFormCollapsed(false);
            }}
          >
            Schedule New Appointment
          </Button>
        </div>

        {showAppointmentForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                Schedule Appointment{selectedProperty ? ` - ${selectedProperty.name}` : ''}
              </CardTitle>
            </CardHeader>
            {!isFormCollapsed && (
            <CardContent className="pb-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Property Details</h4>
                  {selectedProperty ? (
                    <>
                      <p className="text-muted-foreground mb-1">{selectedProperty.description}</p>
                      <p className="text-muted-foreground">Location: {selectedProperty.location}</p>
                      <p className="text-2xl font-bold text-primary mt-2">
                        {formatPeso(selectedProperty.price)}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      No specific property selected. This will be scheduled as a {appointmentType.toLowerCase()}.
                    </p>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Preferred Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border rounded-md bg-white"
                        min={new Date().toISOString().split('T')[0]}
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Preferred Time</label>
                      <select
                        className="w-full px-3 py-2 border rounded-md bg-white"
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                      >
                        <option value="09:00">9:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="14:00">2:00 PM</option>
                        <option value="15:00">3:00 PM</option>
                        <option value="16:00">4:00 PM</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Property (optional)</label>
                    <select
                    className="w-full px-3 py-2 border rounded-md bg-white"
                    value={selectedPropertyId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedPropertyId(val);
                      const found = properties.find((p) => p.id === val);
                      setSelectedProperty(found ?? null);
                    }}
                  >
                      <option value="none">No specific property (Consultation)</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name} - {property.location}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Appointment Type</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md bg-white"
                      value={appointmentType}
                      onChange={(e) => setAppointmentType(e.target.value as 'Viewing' | 'Consultation')}
                    >
                      <option value="Viewing">Viewing</option>
                      <option value="Consultation">Consultation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-md"
                      rows={3}
                      placeholder="Add context or questions for the visit"
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Contact Preference (optional)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md bg-white"
                      placeholder="+63 9xx xxx xxxx or email"
                      value={contactPreference}
                      onChange={(e) => setContactPreference(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => {
                        if (!appointmentDate || !appointmentTime) {
                          return;
                        }
                        createAppointment(
                          selectedProperty,
                          appointmentDate,
                          appointmentTime,
                          true,
                          appointmentType,
                          appointmentNotes || undefined,
                          contactPreference || undefined
                        );
                      }}
                    >
                      Request Appointment
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedProperty(null);
                        setSelectedPropertyId('none');
                        setAppointmentNotes('');
                        setContactPreference('');
                        setAppointmentDate('');
                        setAppointmentTime('10:00');
                        setAppointmentType('Viewing');
                        setIsFormCollapsed(true);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            )}
            <div className="pb-4 flex justify-center">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsFormCollapsed((prev) => !prev)}
                className="px-4"
              >
                {isFormCollapsed ? 'Expand Form [v]' : 'Minimize Form [^]'}
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {clientAppointments.filter((apt) => apt.status !== 'Cancelled').map((appointment) => (
            <Card key={appointment.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{appointment.propertyName}</h3>
                      <Badge variant={
                        appointment.status === 'Confirmed' ? 'default' :
                        appointment.status === 'Pending' ? 'secondary' :
                        appointment.status === 'Completed' ? 'outline' : 'destructive'
                      }>{appointment.status}</Badge>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{appointment.date} at {appointment.time}</span>
                      <Clock className="h-4 w-4 ml-4 mr-1" />
                      <span>{appointment.type}</span>
                    </div>
                    {appointment.notes && (
                      <p className="text-sm text-muted-foreground">Notes: {appointment.notes}</p>
                    )}
                    {appointment.contact && (
                      <p className="text-sm text-muted-foreground">Contact: {appointment.contact}</p>
                    )}
                    {appointment.responseNote && (
                      <p className="text-sm text-muted-foreground">Response: {appointment.responseNote}</p>
                    )}
                  </div>
                  <div className="space-y-2 flex flex-col items-end">
                    {appointment.status === 'Pending' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          setAppointments((prev) =>
                            prev.map((a) =>
                              a.id === appointment.id
                                ? { ...a, status: 'Cancelled', responseNote: a.responseNote ?? 'Cancelled by you' }
                                : a
                            )
                          );
                          if (appointment.persisted !== false) {
                            try {
                              await cancelAppointment(appointment.id);
                            } catch (error) {
                              console.error('Failed to cancel appointment', error);
                            }
                          }
                        }}
                      >
                        Cancel Request
                      </Button>
                    ) : (
                      <>
                        {appointment.status === 'Confirmed' && (
                          <div className="flex flex-col gap-2">
                            <Button size="sm" onClick={() => {
                              alert('Property viewing completed! For an enhanced AR experience, download our mobile app.');
                            }}>
                              <Eye className="h-4 w-4 mr-1" />
                              View Property
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              alert('Download our mobile app for augmented reality property viewing!');
                            }}>
                              <Smartphone className="h-4 w-4 mr-1" />
                              AR View (Mobile)
                            </Button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setAppointments((prev) => prev.filter((a) => a.id !== appointment.id));
                            setRespondedAppointments((prev) => prev.filter((a) => a.id !== appointment.id));
                          }}
                        >
                          -
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Responses & Updates */}
        <div className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">Responses & Updates</h2>
          {respondedAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No responses yet.</p>
          ) : (
            respondedAppointments.map((appointment) => (
              <Card key={`resp-${appointment.id}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{appointment.propertyName}</h3>
                        <Badge>{appointment.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {appointment.date} at {appointment.time} — {appointment.type}
                      </p>
                      {appointment.responseNote ? (
                        <p className="text-sm text-muted-foreground">Response: {appointment.responseNote}</p>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setRespondedAppointments((prev) => prev.filter((a) => a.id !== appointment.id));
                        setAppointments((prev) => prev.filter((a) => a.id !== appointment.id));
                      }}
                    >
                      -
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

if (currentPage === 'company') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Company Information</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>About Philstar Development</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Philstar Marketing and Development Inc. has been creating exceptional living spaces 
                for over two decades. We specialize in premium residential developments across 
                Metro Manila.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Established</span>
                  <span>2000</span>
                </div>
                <div className="flex justify-between">
                  <span>Projects Completed</span>
                  <span>50+</span>
                </div>
                <div className="flex justify-between">
                  <span>Happy Families</span>
                  <span>5,000+</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">123 Ayala Avenue, Makati City</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm">Phone: +63 2 8123 4567</p>
                <p className="text-sm">Mobile: +63 917 123 4567</p>
                <p className="text-sm">Email: info@philstardevelopment.com</p>
              </div>
              <div className="pt-2">
                <Button size="sm" onClick={() => onNavigate('about')}>
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentPage === 'properties') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse Properties</h1>
          <p className="text-muted-foreground">
            Explore our premium developments across Metro Manila
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-[#2E5D9F] hover:bg-[#1B2C48]' : ''}
            >
              <Grid3x3 className="h-4 w-4 mr-2" />
              Grid View
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('map')}
              className={viewMode === 'map' ? 'bg-[#2E5D9F] hover:bg-[#1B2C48]' : ''}
            >
              <Map className="h-4 w-4 mr-2" />
              Map View
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {isLoadingProperties ? 'Loading properties...' : `Showing ${properties.length} properties`}
          </p>
        </div>

        {/* Property Content */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onViewDetails={() => setSelectedProperty(property)}
                onScheduleViewing={() => {
                  setSelectedProperty(property);
                  setSelectedPropertyId(property.id);
                  setShowAppointmentForm(true);
                  setIsFormCollapsed(false);
                  onNavigate('appointments');
                }}
              />
            ))}
          </div>
        ) : (
          <PropertyMapView
            properties={properties}
            onPropertySelect={(property) => setSelectedProperty(property)}
            selectedPropertyId={selectedProperty?.id}
          />
        )}

        {/* Property Detail Modal */}
        {selectedProperty && viewMode === 'grid' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {selectedProperty.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProperty(null)}
                  >
                    ✕
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={selectedProperty.image}
                  alt={selectedProperty.name}
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      {selectedProperty.location}
                    </div>
                    <p className="text-2xl font-bold text-[#2E5D9F]">
                      {formatPeso(selectedProperty.price)}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground">{selectedProperty.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.features.map((feature: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button
                      className="flex-1 bg-[#2E5D9F] hover:bg-[#1B2C48]"
                      onClick={() => {
                        setSelectedPropertyId(selectedProperty.id);
                        setShowAppointmentForm(true);
                        setIsFormCollapsed(false);
                        onNavigate('appointments');
                      }}
                    >
                      Schedule Viewing
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedProperty(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Default dashboard view
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Client Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPeso(clientBalance)}</div>
            <p className="text-xs text-muted-foreground">Available for purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientAppointments.length}</div>
            <p className="text-xs text-muted-foreground">Property viewings scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties of Interest</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Properties being considered</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientAppointments.slice(0, 3).map((appointment) => (
                <div key={appointment.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{appointment.propertyName}</p>
                    <p className="text-sm text-muted-foreground">{appointment.date}</p>
                  </div>
                  <Badge 
                    className={appointment.status === 'Confirmed' 
                      ? 'bg-[#3BAE4A]/10 text-[#3BAE4A] border-[#3BAE4A]/20' 
                      : 'bg-[#F4C542]/10 text-[#E67E22] border-[#F4C542]/20'
                    }
                  >
                    {appointment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Featured Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {properties.slice(0, 2).map((property) => (
                <div key={property.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{property.name}</p>
                    <p className="text-sm text-muted-foreground">{property.location}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedProperty(property)}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
