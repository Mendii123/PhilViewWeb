// Mock data for the application

export interface Property {
  id: string;
  name: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  price: number;
  type: string;
  status: 'Available' | 'Reserved' | 'Sold';
  description: string;
  image: string;
  features: string[];
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
  status: 'Active' | 'Inactive';
  joinDate: string;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientEmail: string;
  propertyId: string;
  propertyName: string;
  date: string;
  time: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  type:
    | 'Payment/Balance Consultation'
    | 'Residential Consultation'
    | 'Industrial Consultation'
    | 'Commercial Consultation'
    | 'Venues & Events Consultation'
    | 'Viewing'
    | 'Consultation'
    | 'Documentation';
}

export interface Inquiry {
  id: string;
  clientName: string;
  clientEmail: string;
  propertyId: string;
  propertyName: string;
  message: string;
  date: string;
  status: 'New' | 'In Progress' | 'Resolved';
}

export const mockProperties: Property[] = [
  {
    id: '1',
    name: 'Skyline Residences',
    location: 'Makati City',
    coordinates: {
      lat: 14.5551,
      lng: 121.0169
    },
    price: 8500000,
    type: 'Condominium',
    status: 'Available',
    description: 'Luxury high-rise living with stunning city views',
    image: 'https://images.unsplash.com/photo-1748440290941-84b6600b2373?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjByZWFsJTIwZXN0YXRlJTIwYnVpbGRpbmd8ZW58MXx8fHwxNzU2OTgwNTM4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    features: ['2 Bedrooms', '2 Bathrooms', 'Parking', 'Gym', 'Swimming Pool']
  },
  {
    id: '2',
    name: 'Garden Villas',
    location: 'Quezon City',
    coordinates: {
      lat: 14.6599,
      lng: 121.0245
    },
    price: 12000000,
    type: 'Townhouse',
    status: 'Available',
    description: 'Spacious family homes with private gardens',
    image: 'https://images.unsplash.com/photo-1647025980693-04e6b24a6d78?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBwcm9wZXJ0eSUyMGRldmVsb3BtZW50fGVufDF8fHx8MTc1NzA1MTg0Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    features: ['3 Bedrooms', '3 Bathrooms', 'Garden', 'Garage', 'Security']
  },
  {
    id: '3',
    name: 'Metro Heights',
    location: 'Pasig City',
    coordinates: {
      lat: 14.5643,
      lng: 121.0151
    },
    price: 6800000,
    type: 'Condominium',
    status: 'Reserved',
    description: 'Modern urban living near business districts',
    image: 'https://images.unsplash.com/photo-1728496120856-b2e920dc6f05?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxyZXNpZGVudGlhbCUyMGNvbmRvbWluaXVtfGVufDF8fHx8MTc1NzA1MTg0OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    features: ['1 Bedroom', '1 Bathroom', 'Balcony', 'Amenities', 'Transport Hub']
  }
];

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Maria Santos',
    email: 'maria.santos@email.com',
    phone: '+63 917 123 4567',
    balance: 2500000,
    status: 'Active',
    joinDate: '2024-01-15'
  },
  {
    id: '2',
    name: 'Juan Dela Cruz',
    email: 'juan.delacruz@email.com',
    phone: '+63 918 234 5678',
    balance: 1800000,
    status: 'Active',
    joinDate: '2024-02-20'
  },
  {
    id: '3',
    name: 'Anna Garcia',
    email: 'anna.garcia@email.com',
    phone: '+63 919 345 6789',
    balance: 3200000,
    status: 'Inactive',
    joinDate: '2023-12-10'
  }
];

export const mockAppointments: Appointment[] = [
  {
    id: '1',
    clientName: 'Maria Santos',
    clientEmail: 'maria.santos@email.com',
    propertyId: '1',
    propertyName: 'Skyline Residences',
    date: '2024-09-10',
    time: '14:00',
    status: 'Pending',
    type: 'Viewing'
  },
  {
    id: '2',
    clientName: 'Juan Dela Cruz',
    clientEmail: 'juan.delacruz@email.com',
    propertyId: '2',
    propertyName: 'Garden Villas',
    date: '2024-09-12',
    time: '10:00',
    status: 'Confirmed',
    type: 'Consultation'
  }
];

export const mockInquiries: Inquiry[] = [
  {
    id: '1',
    clientName: 'Maria Santos',
    clientEmail: 'maria.santos@email.com',
    propertyId: '1',
    propertyName: 'Skyline Residences',
    message: 'I would like to know more about the payment terms and financing options available.',
    date: '2024-09-05',
    status: 'New'
  },
  {
    id: '2',
    clientName: 'Anna Garcia',
    clientEmail: 'anna.garcia@email.com',
    propertyId: '3',
    propertyName: 'Metro Heights',
    message: 'Can I schedule a viewing for this weekend? I am available on Saturday morning.',
    date: '2024-09-04',
    status: 'In Progress'
  }
];
