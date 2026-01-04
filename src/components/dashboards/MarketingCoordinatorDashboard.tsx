'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  Calendar,
  MessageSquare,
  PartyPopper,
  Bell,
  Mail,
  CheckCircle,
  XCircle,
  Users,
} from 'lucide-react';
import { fetchInquiries, respondToInquiry, type InquiryRecord } from '@/lib/inquiries';
import { fetchAllAppointments, updateAppointmentStatus, type AppointmentRecord } from '@/lib/appointments';
import { mockInquiries, mockAppointments } from '../data/mockData';

interface MarketingCoordinatorDashboardProps {
  currentPage: string;
}

export function MarketingCoordinatorDashboard({ currentPage }: MarketingCoordinatorDashboardProps) {
  const [inquiries, setInquiries] = useState<InquiryRecord[]>(mockInquiries);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>(mockAppointments as AppointmentRecord[]);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRecord | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const marketingAppointments = appointments.filter((a) => (a.department ?? 'broker') === 'marketing');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [inq, appts] = await Promise.all([fetchInquiries(), fetchAllAppointments()]);
        if (isMounted) {
          setInquiries(inq.length ? inq : mockInquiries);
          setAppointments(appts.length ? appts : (mockAppointments as AppointmentRecord[]));
        }
      } catch (error) {
        console.error('Failed to load marketing data', error);
        if (isMounted) {
          setInquiries(mockInquiries);
          setAppointments(mockAppointments as AppointmentRecord[]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const pendingInquiries = inquiries.filter((i) => i.status === 'New').length;
    const pendingAppointments = marketingAppointments.filter((a) => a.status === 'Pending').length;
    const confirmedAppointments = marketingAppointments.filter((a) => a.status === 'Confirmed').length;
    return { pendingInquiries, pendingAppointments, confirmedAppointments };
  }, [inquiries, marketingAppointments]);

  const confirmAppointment = async (appt: AppointmentRecord) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appt.id ? { ...a, status: 'Confirmed', responseNote: 'Confirmed by marketing' } : a))
    );
    if (appt.persisted !== false) {
      try {
        await updateAppointmentStatus(appt.id, 'Confirmed', 'Confirmed by marketing');
      } catch (error) {
        console.error('Failed to confirm appointment', error);
      }
    }
  };

  if (currentPage === 'inquiries') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Inquiries</h1>

        {selectedInquiry && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Respond to Inquiry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Client Information</h4>
                  <p><strong>Name:</strong> {selectedInquiry.clientName}</p>
                  <p><strong>Email:</strong> {selectedInquiry.clientEmail}</p>
                  <p><strong>Property/Event:</strong> {selectedInquiry.propertyName}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Message</h4>
                  <p className="text-muted-foreground">{selectedInquiry.message}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Your Response</label>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Type your response..."
                  rows={4}
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={async () => {
                    if (!selectedInquiry) return;
                    await respondToInquiry(selectedInquiry.id, responseText || 'Responded by marketing', 'Resolved');
                    setInquiries((prev) =>
                      prev.map((inq) =>
                        inq.id === selectedInquiry.id ? { ...inq, response: responseText, status: 'Resolved' } : inq
                      )
                    );
                    setSelectedInquiry(null);
                    setResponseText('');
                  }}
                >
                  Send Response
                </Button>
                <Button variant="outline" onClick={() => setSelectedInquiry(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <Card key={inquiry.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{inquiry.clientName}</h3>
                      <Badge variant={
                        inquiry.status === 'New' ? 'destructive' :
                        inquiry.status === 'In Progress' ? 'secondary' : 'default'
                      }>
                        {inquiry.status}
                      </Badge>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="h-4 w-4 mr-1" />
                      <span>{inquiry.clientEmail}</span>
                    </div>
                    <p className="text-muted-foreground">{inquiry.propertyName}</p>
                    <p className="text-sm text-muted-foreground">{inquiry.message}</p>
                  </div>
                  <div className="space-y-2">
                    <Button size="sm" onClick={() => setSelectedInquiry(inquiry)}>
                      Respond
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await respondToInquiry(inquiry.id, inquiry.response ?? 'Marked resolved', 'Resolved');
                        setInquiries((prev) =>
                          prev.map((inq) =>
                            inq.id === inquiry.id ? { ...inq, status: 'Resolved', response: inq.response } : inq
                          )
                        );
                      }}
                    >
                      Mark Resolved
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (currentPage === 'appointments') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Appointment Confirmation</h1>
        <div className="space-y-4">
          {marketingAppointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{appointment.clientName}</h3>
                      <Badge variant={
                        appointment.status === 'Pending' ? 'secondary' :
                        appointment.status === 'Confirmed' ? 'default' :
                        appointment.status === 'Completed' ? 'outline' : 'destructive'
                      }>
                        {appointment.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {appointment.date} at {appointment.time} · {appointment.propertyName}
                    </div>
                    {appointment.notes ? <p className="text-sm text-muted-foreground">Notes: {appointment.notes}</p> : null}
                  </div>
                  <div className="space-y-2">
                    {appointment.status === 'Pending' && (
                      <Button size="sm" onClick={() => confirmAppointment(appointment)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Confirm
                      </Button>
                    )}
                    {appointment.status !== 'Pending' && (
                      <Badge variant="outline">No action</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Default dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1B2C48]">Marketing Coordinator Dashboard</h1>
        <p className="text-muted-foreground">Manage venues, events, inquiries, and appointments</p>
        {isLoading ? <p className="text-sm text-muted-foreground mt-2">Loading latest data...</p> : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Inquiries</CardTitle>
            <MessageSquare className="h-4 w-4 text-[#2E5D9F]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2E5D9F]">{metrics.pendingInquiries}</div>
            <p className="text-xs text-muted-foreground">Venue/event inquiries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-[#2E5D9F]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2E5D9F]">{metrics.pendingAppointments}</div>
            <p className="text-xs text-muted-foreground">Need confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Appointments</CardTitle>
            <CheckCircle className="h-4 w-4 text-[#2E5D9F]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2E5D9F]">{metrics.confirmedAppointments}</div>
            <p className="text-xs text-muted-foreground">Ready for follow-up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-[#2E5D9F]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2E5D9F]">Live</div>
            <p className="text-xs text-muted-foreground">Dynamic from inquiries/appointments</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><Bell className="h-4 w-4" /> Inquiries pending: {metrics.pendingInquiries}</div>
          <div className="flex items-center gap-2"><Bell className="h-4 w-4" /> Appointments awaiting confirmation: {metrics.pendingAppointments}</div>
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
            <CardTitle>Appointments Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {marketingAppointments.slice(0, 5).map((appt) => (
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
