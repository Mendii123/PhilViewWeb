'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { MessageSquare, Calendar, CheckCircle, Clock, User, Mail } from 'lucide-react';
import { mockInquiries, mockAppointments, type Inquiry } from '../data/mockData';
import { fetchAllAppointments, updateAppointmentStatus, deleteAppointment, type AppointmentRecord } from '@/lib/appointments';
import { fetchInquiries, respondToInquiry, type InquiryRecord } from '@/lib/inquiries';

interface BrokerDashboardProps {
  currentPage: string;
}

export function BrokerDashboard({ currentPage }: BrokerDashboardProps) {
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRecord | null>(null);
  const [responseText, setResponseText] = useState('');
  const [inquiries, setInquiries] = useState<InquiryRecord[]>(mockInquiries);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>(mockAppointments as AppointmentRecord[]);
  const [isLoading, setIsLoading] = useState(false);
  const brokerAppointments = appointments.filter((a) => (a.department ?? 'broker') === 'broker');

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
        console.error('Failed to load broker data', error);
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
                  <p><strong>Property:</strong> {selectedInquiry.propertyName}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Original Message</h4>
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
                <Button onClick={async () => {
                  if (!selectedInquiry) return;
                  await respondToInquiry(selectedInquiry.id, responseText || 'Responded by broker', 'Resolved');
                  setInquiries((prev) =>
                    prev.map((inq) =>
                      inq.id === selectedInquiry.id
                        ? { ...inq, response: responseText, status: 'Resolved' }
                        : inq
                    )
                  );
                  setSelectedInquiry(null);
                  setResponseText('');
                }}>
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
                    <p className="text-muted-foreground">Property: {inquiry.propertyName}</p>
                    <p className="text-muted-foreground text-sm">{inquiry.message}</p>
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

  if (currentPage === 'appointment-requests') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Appointment Requests</h1>

        <div className="space-y-4">
          {brokerAppointments.map((appointment) => (
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
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="h-4 w-4 mr-1" />
                      <span>{appointment.clientEmail}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{appointment.date} at {appointment.time}</span>
                      <Clock className="h-4 w-4 ml-4 mr-1" />
                      <span>{appointment.type}</span>
                    </div>
                    <p className="text-muted-foreground">Property: {appointment.propertyName}</p>
                  </div>
                  <div className="space-y-2">
                    {appointment.status === 'Pending' && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={async () => {
                            setAppointments((prev) =>
                              prev.map((a) => (a.id === appointment.id ? { ...a, status: 'Confirmed', responseNote: 'Confirmed by broker' } : a))
                            );
                            if (appointment.persisted !== false) {
                              try {
                                await updateAppointmentStatus(appointment.id, 'Confirmed', 'Confirmed by broker');
                              } catch (error) {
                                console.error('Failed to confirm appointment', error);
                              }
                            }
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirm
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={async () => {
                            setAppointments((prev) =>
                              prev.map((a) => (a.id === appointment.id ? { ...a, status: 'Cancelled', responseNote: 'Declined by broker' } : a))
                            );
                            if (appointment.persisted !== false) {
                              try {
                                await updateAppointmentStatus(appointment.id, 'Cancelled', 'Declined by broker');
                              } catch (error) {
                                console.error('Failed to decline appointment', error);
                              }
                            }
                          }}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                    {appointment.status === 'Confirmed' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={async () => {
                          setAppointments((prev) =>
                            prev.map((a) => (a.id === appointment.id ? { ...a, status: 'Completed', responseNote: 'Completed' } : a))
                          );
                          if (appointment.persisted !== false) {
                            try {
                              await updateAppointmentStatus(appointment.id, 'Completed', 'Completed');
                            } catch (error) {
                              console.error('Failed to update appointment', error);
                            }
                          }
                        }}
                      >
                        Mark Complete
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        setAppointments((prev) => prev.filter((a) => a.id !== appointment.id));
                        if (appointment.persisted !== false) {
                          try {
                            await deleteAppointment(appointment.id);
                          } catch (error) {
                            console.error('Failed to delete appointment', error);
                          }
                        }
                      }}
                    >
                      -
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

  // Default dashboard view
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Broker Dashboard</h1>
      {isLoading ? <p className="text-sm text-muted-foreground mb-4">Loading latest data...</p> : null}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Inquiries</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inquiries.filter(i => i.status === 'New').length}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brokerAppointments.filter(a => a.status === 'Pending').length}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">Currently engaged prospects</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Inquiries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inquiries.slice(0, 3).map((inquiry) => (
                <div key={inquiry.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{inquiry.clientName}</p>
                    <p className="text-sm text-muted-foreground">{inquiry.propertyName}</p>
                  </div>
                  <Badge variant={inquiry.status === 'New' ? 'destructive' : 'secondary'}>
                    {inquiry.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {brokerAppointments.slice(0, 2).map((appointment) => (
                <div key={appointment.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{appointment.clientName}</p>
                    <p className="text-sm text-muted-foreground">{appointment.time} - {appointment.propertyName}</p>
                  </div>
                  <Badge variant={appointment.status === 'Confirmed' ? 'default' : 'secondary'}>
                    {appointment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
