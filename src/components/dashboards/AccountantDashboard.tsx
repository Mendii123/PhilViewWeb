'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Users, DollarSign, Building, Plus, Edit, Save, Trash2, MessageSquare, User as UserIcon } from 'lucide-react';
import { mockClients, mockProperties, Client, Property } from '../data/mockData';
import { fetchProperties, type PropertyRecord } from '@/lib/properties';
import { addDoc, collection, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { fetchInquiries, respondToInquiry, type InquiryRecord } from '@/lib/inquiries';

interface AccountantDashboardProps {
  currentPage: string;
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80';
const FIELD_CLASS =
  'bg-white border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
type LocalClient = Client & {
  contact?: string;
  transactions?: Array<{ label: string; amount: number; date: string; type: 'credit' | 'debit' }>;
  credits?: number;
  debits?: number;
  available?: number;
};
type EditableClient = LocalClient & {
  balance: string | number;
  credits?: string | number;
  debits?: string | number;
  available?: string | number;
};

export function AccountantDashboard({ currentPage }: AccountantDashboardProps) {
  const [clients, setClients] = useState<LocalClient[]>(mockClients);
  const [properties, setProperties] = useState<PropertyRecord[]>(mockProperties);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);
  const [editingPropertyData, setEditingPropertyData] = useState<(PropertyRecord & { priceInput?: string }) | null>(null);
  const [editingClientData, setEditingClientData] = useState<EditableClient | null>(null);
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    balance: '',
    credits: '',
    debits: '',
    available: '',
    contact: '',
  });
  const [transactionForm, setTransactionForm] = useState({
    clientId: '',
    label: '',
    amount: '',
    date: '',
    type: 'credit' as 'credit' | 'debit',
  });
  const [newPropertyData, setNewPropertyData] = useState({
    name: '',
    location: '',
    type: 'Condominium',
    status: 'Available',
    price: '',
    description: '',
    image: '',
    featuresCsv: '',
    lat: '',
    lng: '',
  });
  const [showClientForm] = useState(true);
  const [isClientFormCollapsed, setIsClientFormCollapsed] = useState(false);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRecord | null>(null);
  const [responseText, setResponseText] = useState('');

  const loadProperties = React.useCallback(async () => {
    setIsLoadingProperties(true);
    try {
      const data = await fetchProperties();
      if (data.length) {
        setProperties(data);
      } else {
        setProperties(mockProperties);
      }
    } catch (error) {
      console.error('Failed to load properties from Firestore', error);
      setProperties(mockProperties);
    } finally {
      setIsLoadingProperties(false);
    }
  }, []);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  // Load clients from Firestore (realtime)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const loaded: LocalClient[] = snap.docs.map((d) => {
        const data = d.data() as Partial<LocalClient & { archived?: boolean }>;
        const transactions = Array.isArray(data.transactions) ? (data.transactions as LocalClient['transactions']) : [];
        const creditsCalc = typeof (data as { credits?: number }).credits === 'number'
          ? (data as { credits?: number }).credits
          : transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const debitsCalc = typeof (data as { debits?: number }).debits === 'number'
          ? (data as { debits?: number }).debits
          : transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
        const balanceVal = typeof data.balance === 'number' ? data.balance : 0;
        return {
          id: d.id,
          name: data.name ?? 'Unnamed',
          email: data.email ?? '',
          phone: data.phone ?? '',
          balance: balanceVal,
          credits: creditsCalc,
          debits: debitsCalc,
          available:
            typeof (data as { available?: number }).available === 'number'
              ? (data as { available?: number }).available
              : balanceVal + creditsCalc + debitsCalc,
          status: data.archived ? 'Inactive' : 'Active',
          joinDate: data.joinDate ?? new Date().toISOString().split('T')[0],
          contact: data.contact,
          transactions,
        };
      });
      setClients(loaded);
    }, (err) => {
      console.error('Failed to load clients', err);
      setClients(mockClients);
    });
    return () => unsub();
  }, []);

  // Load inquiries (realtime)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'inquiries'), (snap) => {
      const loaded = snap.docs.map((d) => {
        const data = d.data() as Partial<InquiryRecord>;
        return {
          id: d.id,
          clientName: data.clientName ?? '',
          clientEmail: data.clientEmail ?? '',
          propertyId: data.propertyId ?? '',
          propertyName: data.propertyName ?? '',
          message: data.message ?? '',
          date: data.date ?? '',
          status: (data.status as InquiryRecord['status']) ?? 'New',
          response: data.response,
          userId: data.userId,
        };
      });
      setInquiries(loaded);
    }, (err) => {
      console.error('Failed to load inquiries', err);
      void fetchInquiries().then(setInquiries).catch(() => setInquiries([]));
    });
    return () => unsub();
  }, []);

  const updateClientBalance = (clientId: string, newBalance: number) => {
    setClients(prev => prev.map(client => 
      client.id === clientId ? { ...client, balance: newBalance } : client
    ));
    setEditingClient(null);
  };

  const savePropertyEdits = async () => {
    if (!editingProperty || !editingPropertyData) return;
    const priceVal =
      typeof editingPropertyData.priceInput === 'string'
        ? Number(editingPropertyData.priceInput || 0)
        : editingPropertyData.price;
    const payload = {
      name: editingPropertyData.name,
      location: editingPropertyData.location,
      type: editingPropertyData.type,
      status: editingPropertyData.status,
      price: Number.isFinite(priceVal) ? priceVal : 0,
    };
    setProperties((prev) =>
      prev.map((p) => (p.id === editingProperty ? { ...p, ...payload } : p))
    );
    setEditingProperty(null);
    setEditingPropertyData(null);
    try {
      await updateDoc(doc(db, 'properties', editingProperty), payload);
    } catch (error) {
      console.error('Failed to update property details', error);
    }
  };

  const formatPeso = (value: number) => `PHP ${value.toLocaleString('en-PH')}`;

  const createNewProperty = async () => {
    const priceRaw = typeof newPropertyData.price === 'string' ? newPropertyData.price.trim() : String(newPropertyData.price ?? '');
    const latRaw = newPropertyData.lat.trim();
    const lngRaw = newPropertyData.lng.trim();
    const price = priceRaw ? Number(priceRaw) : 0;
    const lat = latRaw ? Number(latRaw) : 0;
    const lng = lngRaw ? Number(lngRaw) : 0;

    if (!newPropertyData.name || !newPropertyData.location || !newPropertyData.type || !newPropertyData.status) {
      alert('Please fill in the required fields.');
      return;
    }

    const payload = {
      name: newPropertyData.name,
      location: newPropertyData.location,
      type: newPropertyData.type,
      status: newPropertyData.status,
      price: Number.isFinite(price) ? price : 0,
      description: newPropertyData.description || '',
      image: newPropertyData.image || DEFAULT_IMAGE,
      features: newPropertyData.featuresCsv
        ? newPropertyData.featuresCsv.split(',').map((f) => f.trim()).filter(Boolean)
        : [],
      coordinates: {
        lat: Number.isFinite(lat) ? lat : 0,
        lng: Number.isFinite(lng) ? lng : 0,
      },
    };

    try {
      await addDoc(collection(db, 'properties'), payload);
      await loadProperties();
      setNewPropertyData({
        name: '',
        location: '',
        type: 'Condominium',
        status: 'Available',
        price: '',
        description: '',
        image: '',
        featuresCsv: '',
        lat: '',
        lng: '',
      });
    } catch (error) {
      console.error('Failed to create property', error);
      alert('Could not save property. Check console for details.');
    }
  };

  const deleteProperty = async (propertyId: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== propertyId));
    try {
      await deleteDoc(doc(db, 'properties', propertyId));
    } catch (error) {
      console.error('Failed to delete property', error);
    }
  };

  const recordTransaction = async () => {
    if (!transactionForm.clientId || !transactionForm.label || !transactionForm.amount) {
      alert('Select a client and enter transaction label and amount.');
      return;
    }
    const amountNum = Number(transactionForm.amount);
    if (!Number.isFinite(amountNum)) {
      alert('Amount must be a number.');
      return;
    }
    const signedAmount = transactionForm.type === 'debit' ? -Math.abs(amountNum) : Math.abs(amountNum);
    const tx = {
      label: transactionForm.label,
      amount: signedAmount,
      date: transactionForm.date || new Date().toISOString().split('T')[0],
      type: transactionForm.type,
    };
    const target = clients.find((c) => c.id === transactionForm.clientId);
    if (!target) {
      alert('Client not found.');
      return;
    }
    const updatedTx = [...(target.transactions ?? []), tx];
    const creditsTotal = updatedTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const debitsTotal = updatedTx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
    const availableVal = (target.balance ?? 0) + creditsTotal + debitsTotal;
    const updatedClient: LocalClient = {
      ...target,
      transactions: updatedTx,
      credits: creditsTotal,
      debits: debitsTotal,
      available: availableVal,
    };
    setClients((prev) => prev.map((c) => (c.id === target.id ? updatedClient : c)));
    try {
      await updateDoc(doc(db, 'users', target.id), {
        transactions: updatedTx,
        credits: creditsTotal,
        debits: debitsTotal,
        available: availableVal,
      });
    } catch (error) {
      console.error('Failed to record transaction', error);
    }
    setTransactionForm({
      clientId: target.id,
      label: '',
      amount: '',
      date: '',
      type: transactionForm.type,
    });
  };

  const createNewClient = async () => {
    if (!newClientData.name || !newClientData.email) {
      alert('Please fill in required fields');
      return;
    }

    const creditsCalc =
      newClientData.credits !== ''
        ? Number(newClientData.credits)
        : 0;
    const debitsCalc =
      newClientData.debits !== ''
        ? Number(newClientData.debits)
        : 0;
    const balanceVal = newClientData.balance !== '' ? Number(newClientData.balance) : 0;

    const newClient: LocalClient = {
      id: (clients.length + 1).toString(),
      name: newClientData.name,
      email: newClientData.email,
      phone: newClientData.phone,
      balance: balanceVal,
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0],
      contact: newClientData.contact,
      transactions: [],
      credits: creditsCalc,
      debits: debitsCalc,
    };
    const availableCalc =
      newClientData.available !== ''
        ? Number(newClientData.available)
        : balanceVal + creditsCalc + debitsCalc;
    newClient.available = availableCalc;

    try {
      const docRef = await addDoc(collection(db, 'users'), {
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone,
        contact: newClient.contact ?? '',
        balance: newClient.balance,
        credits: creditsCalc,
        debits: debitsCalc,
        available: availableCalc,
        joinDate: newClient.joinDate,
        transactions: [],
        archived: false,
        status: 'Active',
      });
      setClients(prev => [...prev, { ...newClient, id: docRef.id }]);
      setNewClientData({
        name: '',
        email: '',
        phone: '',
        balance: '',
        credits: '',
        debits: '',
        available: '',
        contact: '',
      });
      alert('Client created successfully!');
    } catch (error) {
      console.error('Failed to create client', error);
      alert('Could not create client. Check console for details.');
    }
  };

  if (currentPage === 'clients') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Client Management</h1>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Manage customer records and balances</p>
        </div>

        {showClientForm ? (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create New Client</CardTitle>
        </CardHeader>
        {!isClientFormCollapsed && (
          <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={newClientData.name}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter client's full name"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="client@example.com"
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={newClientData.phone}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+63 917 123 4567"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <Label htmlFor="balance">Initial Balance</Label>
                    <Input
                      id="balance"
                      type="number"
                      value={newClientData.balance}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, balance: e.target.value }))}
                      placeholder="0"
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact">Contact (optional)</Label>
                    <Input
                      id="contact"
                      value={newClientData.contact}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, contact: e.target.value }))}
                      placeholder="+63 9xx xxx xxxx"
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={createNewClient}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Client
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setNewClientData({
                      name: '',
                      email: '',
                      phone: '',
                      balance: 0,
                      credits: 0,
                      debits: 0,
                      available: 0,
                      contact: '',
                    })}
                  >
                    Clear Form
                  </Button>
                </div>
              </CardContent>
            )}
            <div className="pb-4 flex justify-center">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsClientFormCollapsed((prev) => !prev)}
              >
                {isClientFormCollapsed ? 'Expand Form [v]' : 'Minimize Form [^]'}
              </Button>
            </div>
          </Card>
        ) : null}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Record Client Transaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="tx-client">Select Client</Label>
                <select
                  id="tx-client"
                  className="w-full px-3 py-2 border rounded-md bg-white"
                  value={transactionForm.clientId}
                  onChange={(e) => setTransactionForm((prev) => ({ ...prev, clientId: e.target.value }))}
                >
                  <option value="">Choose client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="tx-label">Transaction Label</Label>
                <Input
                  id="tx-label"
                  value={transactionForm.label}
                  onChange={(e) => setTransactionForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="Payment, Adjustment, etc."
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <Label htmlFor="tx-amount">Amount</Label>
                <Input
                  id="tx-amount"
                  type="number"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="100000"
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="tx-date">Date</Label>
                <Input
                  id="tx-date"
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm((prev) => ({ ...prev, date: e.target.value }))}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <Label htmlFor="tx-type">Type</Label>
                <select
                  id="tx-type"
                  className="w-full px-3 py-2 border rounded-md bg-white"
                  value={transactionForm.type}
                  onChange={(e) => setTransactionForm((prev) => ({ ...prev, type: e.target.value as 'credit' | 'debit' }))}
                >
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={recordTransaction}>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Transaction
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Debits</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {editingClient === client.id ? (
                        <Input
                          value={editingClientData?.name ?? client.name}
                          onChange={(e) =>
                            setEditingClientData((prev) =>
                              prev ? { ...prev, name: e.target.value } : { ...client, name: e.target.value }
                            )
                          }
                        />
                      ) : (
                        client.name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingClient === client.id ? (
                        <Input
                          value={editingClientData?.email ?? client.email}
                          onChange={(e) =>
                            setEditingClientData((prev) =>
                              prev ? { ...prev, email: e.target.value } : { ...client, email: e.target.value }
                            )
                          }
                        />
                      ) : (
                        client.email
                      )}
                    </TableCell>
                    <TableCell>
                      {editingClient === client.id ? (
                        <Input
                          value={editingClientData?.phone ?? client.phone}
                          onChange={(e) =>
                            setEditingClientData((prev) =>
                              prev ? { ...prev, phone: e.target.value } : { ...client, phone: e.target.value }
                            )
                          }
                        />
                      ) : (
                        client.phone
                      )}
                    </TableCell>
                    <TableCell>
                      {editingClient === client.id ? (
                        <Input
                          value={editingClientData?.contact ?? client.contact ?? ''}
                          onChange={(e) =>
                            setEditingClientData((prev) =>
                              prev ? { ...prev, contact: e.target.value } : { ...client, contact: e.target.value }
                            )
                          }
                        />
                      ) : (
                        client.contact ?? ''
                      )}
                    </TableCell>
                    <TableCell>
                      {editingClient === client.id ? (
                        <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={
                          editingClientData?.balance !== undefined
                            ? String(editingClientData.balance)
                            : String(client.balance)
                        }
                        onChange={(e) =>
                          setEditingClientData((prev) =>
                            prev
                              ? { ...prev, balance: e.target.value }
                              : { ...client, balance: e.target.value }
                          )
                        }
                        className="w-32"
                        inputMode="decimal"
                      />
                        </div>
                      ) : (
                        <span>{formatPeso(client.balance)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingClient === client.id ? (
                        <Input
                          type="number"
                          value={
                            editingClientData?.credits !== undefined
                              ? String(editingClientData.credits)
                              : String(client.credits ?? 0)
                          }
                          onChange={(e) =>
                            setEditingClientData((prev) =>
                              prev ? { ...prev, credits: e.target.value } : { ...client, credits: e.target.value }
                            )
                          }
                        />
                      ) : (
                        formatPeso(client.credits ?? 0)
                      )}
                    </TableCell>
                    <TableCell>
                      {editingClient === client.id ? (
                        <Input
                          type="number"
                          value={
                            editingClientData?.debits !== undefined
                              ? String(editingClientData.debits)
                              : String(client.debits ?? 0)
                          }
                          onChange={(e) =>
                            setEditingClientData((prev) =>
                              prev ? { ...prev, debits: e.target.value } : { ...client, debits: e.target.value }
                            )
                          }
                        />
                      ) : (
                        formatPeso(client.debits ?? 0)
                      )}
                    </TableCell>
                    <TableCell>
                      {editingClient === client.id ? (
                        <Input
                          type="number"
                          value={
                            editingClientData?.available !== undefined
                              ? String(editingClientData.available)
                              : String(client.available ?? client.balance)
                          }
                          onChange={(e) =>
                            setEditingClientData((prev) =>
                              prev
                                ? { ...prev, available: e.target.value }
                                : { ...client, available: e.target.value }
                            )
                          }
                        />
                      ) : (
                        formatPeso(client.available ?? client.balance)
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.status === 'Active' ? 'default' : 'secondary'}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{client.joinDate}</TableCell>
                    <TableCell className="space-x-2">
                      {editingClient === client.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!editingClientData) return;
                              const balanceVal =
                                editingClientData.balance === '' || editingClientData.balance === undefined
                                  ? 0
                                  : Number(editingClientData.balance);
                              const creditsVal =
                                editingClientData.credits === '' || editingClientData.credits === undefined
                                  ? 0
                                  : Number(editingClientData.credits);
                              const debitsVal =
                                editingClientData.debits === '' || editingClientData.debits === undefined
                                  ? 0
                                  : Number(editingClientData.debits);
                              const availableVal =
                                editingClientData.available === '' || editingClientData.available === undefined
                                  ? balanceVal + creditsVal + debitsVal
                                  : Number(editingClientData.available);
                              const updatedClient: LocalClient = {
                                ...client,
                                ...editingClientData,
                                balance: balanceVal,
                                credits: creditsVal,
                                debits: debitsVal,
                                available: availableVal,
                                transactions: editingClientData.transactions ?? client.transactions ?? [],
                              };
                              setClients((prev) =>
                                prev.map((c) => (c.id === client.id ? updatedClient : c))
                              );
                              setEditingClient(null);
                              setEditingClientData(null);
                              try {
                                await updateDoc(doc(db, 'users', client.id), {
                                  name: updatedClient.name,
                                  email: updatedClient.email,
                                  phone: updatedClient.phone,
                                  contact: updatedClient.contact ?? '',
                                  balance: updatedClient.balance,
                                  credits: updatedClient.credits ?? 0,
                                  debits: updatedClient.debits ?? 0,
                                  available: updatedClient.available ?? updatedClient.balance,
                                  transactions: updatedClient.transactions ?? client.transactions ?? [],
                                });
                              } catch (error) {
                                console.error('Failed to update client', error);
                              }
                            }}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingClient(null);
                              setEditingClientData(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingClient(client.id);
                            setEditingClientData({
                              ...client,
                              balance: String(client.balance ?? ''),
                              credits: String(client.credits ?? ''),
                              debits: String(client.debits ?? ''),
                              available: String(client.available ?? ''),
                            });
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'users', client.id), { archived: client.status === 'Active' ? true : false });
                          } catch (error) {
                            console.error('Failed to toggle archive', error);
                          }
                        }}
                      >
                        {client.status === 'Active' ? 'Archive' : 'Unarchive'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentPage === 'inquiries') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Financial Inquiries</h1>

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
                  placeholder="Type your financial response..."
                  rows={4}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={async () => {
                  if (!selectedInquiry) return;
                  await respondToInquiry(selectedInquiry.id, responseText || 'Responded by accountant', 'Resolved');
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
                      <UserIcon className="h-4 w-4 mr-1" />
                      <span>{inquiry.clientEmail}</span>
                      <MessageSquare className="h-4 w-4 ml-4 mr-1" />
                      <span>{inquiry.propertyName}</span>
                    </div>
                    <p className="text-muted-foreground">{inquiry.message}</p>
                    <p className="text-xs text-muted-foreground">Received: {inquiry.date}</p>
                    {inquiry.response ? (
                      <p className="text-xs text-muted-foreground">Response: {inquiry.response}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Button 
                      size="sm" 
                      onClick={() => setSelectedInquiry(inquiry)}
                    >
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

  if (currentPage === 'properties') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Property Management</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prop-name">Name *</Label>
                <Input
                  id="prop-name"
                  value={newPropertyData.name}
                  onChange={(e) => setNewPropertyData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Skyline Residences"
                  className={FIELD_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-location">Location *</Label>
                <Input
                  id="prop-location"
                  value={newPropertyData.location}
                  onChange={(e) => setNewPropertyData((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Makati City"
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prop-type">Type *</Label>
                <Input
                  id="prop-type"
                  value={newPropertyData.type}
                  onChange={(e) => setNewPropertyData((prev) => ({ ...prev, type: e.target.value }))}
                  placeholder="Condominium"
                  className={FIELD_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-status">Status *</Label>
                <Input
                  id="prop-status"
                  value={newPropertyData.status}
                  onChange={(e) => setNewPropertyData((prev) => ({ ...prev, status: e.target.value }))}
                  placeholder="Available | Reserved | Sold"
                  className={FIELD_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-price">Price *</Label>
                <Input
                  id="prop-price"
                  type="number"
                  value={newPropertyData.price}
                  onChange={(e) => setNewPropertyData((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="8500000"
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prop-lat">Latitude</Label>
                <Input
                  id="prop-lat"
                  value={newPropertyData.lat}
                  onChange={(e) => setNewPropertyData((prev) => ({ ...prev, lat: e.target.value }))}
                  placeholder="14.55"
                  className={FIELD_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-lng">Longitude</Label>
                <Input
                  id="prop-lng"
                  value={newPropertyData.lng}
                  onChange={(e) => setNewPropertyData((prev) => ({ ...prev, lng: e.target.value }))}
                  placeholder="121.01"
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prop-image">Image URL</Label>
                <Input
                  id="prop-image"
                  value={newPropertyData.image}
                  onChange={(e) => setNewPropertyData((prev) => ({ ...prev, image: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className={FIELD_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-features">Features (comma-separated)</Label>
                <Input
                  id="prop-features"
                  value={newPropertyData.featuresCsv}
                  onChange={(e) => setNewPropertyData((prev) => ({ ...prev, featuresCsv: e.target.value }))}
                  placeholder="2 Bedrooms, Parking, Gym"
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prop-description">Description</Label>
              <textarea
                id="prop-description"
                className="w-full rounded-md px-3 py-2 bg-white border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                rows={2}
                value={newPropertyData.description}
                onChange={(e) => setNewPropertyData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
              />
            </div>

            <div className="pt-1">
              <Button onClick={createNewProperty}>
                <Plus className="h-4 w-4 mr-2" />
                Save Property
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Property Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingProperties ? (
              <p className="text-sm text-muted-foreground">Loading properties...</p>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell className="font-medium">
                      {editingProperty === property.id ? (
                        <Input
                          value={editingPropertyData?.name ?? property.name}
                          onChange={(e) =>
                            setEditingPropertyData((prev) =>
                              prev ? { ...prev, name: e.target.value } : { ...property, name: e.target.value }
                            )
                          }
                          className="w-full"
                        />
                      ) : (
                        property.name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingProperty === property.id ? (
                        <Input
                          value={editingPropertyData?.location ?? property.location}
                          onChange={(e) =>
                            setEditingPropertyData((prev) =>
                              prev ? { ...prev, location: e.target.value } : { ...property, location: e.target.value }
                            )
                          }
                          className="w-full"
                        />
                      ) : (
                        property.location
                      )}
                    </TableCell>
                    <TableCell>
                      {editingProperty === property.id ? (
                        <Input
                          value={editingPropertyData?.type ?? property.type}
                          onChange={(e) =>
                            setEditingPropertyData((prev) =>
                              prev ? { ...prev, type: e.target.value } : { ...property, type: e.target.value }
                            )
                          }
                          className="w-full"
                        />
                      ) : (
                        property.type
                      )}
                    </TableCell>
                    <TableCell>
                      {editingProperty === property.id ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={
                              editingPropertyData?.priceInput ??
                              (editingPropertyData?.price ? String(editingPropertyData.price) : String(property.price))
                            }
                            onChange={(e) =>
                              setEditingPropertyData((prev) =>
                                prev
                                  ? { ...prev, priceInput: e.target.value }
                                  : { ...property, priceInput: e.target.value }
                              )
                            }
                            className="w-32"
                          />
                        </div>
                      ) : (
                        <span>{formatPeso(property.price)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingProperty === property.id ? (
                        <select
                          className="w-full px-3 py-2 border rounded-md bg-white"
                          value={editingPropertyData?.status ?? property.status}
                          onChange={(e) =>
                            setEditingPropertyData((prev) =>
                              prev ? { ...prev, status: e.target.value } : { ...property, status: e.target.value }
                            )
                          }
                        >
                          <option value="Available">Available</option>
                          <option value="Reserved">Reserved</option>
                          <option value="Sold">Sold</option>
                        </select>
                      ) : (
                        <Badge variant={
                          property.status === 'Available' ? 'default' :
                          property.status === 'Reserved' ? 'secondary' : 'outline'
                        }>
                          {property.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2">
                      {editingProperty === property.id ? (
                        <>
                          <Button size="sm" onClick={savePropertyEdits}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingProperty(null);
                              setEditingPropertyData(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingProperty(property.id);
                            setEditingPropertyData({ ...property, priceInput: String(property.price) });
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteProperty(property.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default dashboard view
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Accountant Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">Active client accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balances</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPeso(clients.reduce((sum, client) => sum + (client.available ?? client.balance), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Combined client balances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
            <p className="text-xs text-muted-foreground">Total property listings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Units</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {properties.filter(p => p.status === 'Available').length}
            </div>
            <p className="text-xs text-muted-foreground">Ready for sale</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clients.slice(0, 5).map((client) => (
                <div key={client.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">{formatPeso(client.available ?? client.balance)}</p>
                  </div>
                  <Badge variant={client.status === 'Active' ? 'default' : 'secondary'}>
                    {client.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Property Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {properties.map((property) => (
                <div key={property.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{property.name}</p>
                    <p className="text-sm text-muted-foreground">{formatPeso(property.price)}</p>
                  </div>
                  <Badge variant={
                    property.status === 'Available' ? 'default' :
                    property.status === 'Reserved' ? 'secondary' : 'outline'
                  }>
                    {property.status}
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
