import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseClient";
import type { Appointment } from "@/components/data/mockData";

export type AppointmentRecord = Appointment & {
  userId: string;
  responseNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
  persisted?: boolean;
};

const mapDoc = (d: { id: string; data: () => Record<string, unknown> }): AppointmentRecord => {
  const data = d.data() as Partial<AppointmentRecord>;
  return {
    id: d.id,
    userId: (data as { userId?: string }).userId ?? "",
    clientName: data.clientName ?? "",
    clientEmail: data.clientEmail ?? "",
    propertyId: data.propertyId ?? "",
    propertyName: data.propertyName ?? "",
    date: data.date ?? "",
    time: data.time ?? "",
    status: (data.status as AppointmentRecord["status"]) ?? "Pending",
    type: (data.type as AppointmentRecord["type"]) ?? "Viewing",
    notes: (data as { notes?: string }).notes,
    contact: (data as { contact?: string }).contact,
    responseNote: data.responseNote,
    persisted: true,
  };
};

export async function fetchAppointmentsForUser(userId: string): Promise<AppointmentRecord[]> {
  const q = query(collection(db, "appointments"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map(mapDoc);
}

export async function fetchAllAppointments(): Promise<AppointmentRecord[]> {
  const snap = await getDocs(collection(db, "appointments"));
  return snap.docs.map(mapDoc);
}

export async function createAppointmentForUser(
  userId: string,
  data: Omit<AppointmentRecord, "id" | "createdAt" | "updatedAt" | "userId">
): Promise<string> {
  const payload: Record<string, unknown> = {
    ...data,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  // Strip undefined fields to satisfy Firestore validation.
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });
  const ref = await addDoc(collection(db, "appointments"), payload);
  return ref.id;
}

export async function cancelAppointment(appointmentId: string): Promise<void> {
  const ref = doc(db, "appointments", appointmentId);
  await updateDoc(ref, { status: "Cancelled", updatedAt: serverTimestamp() });
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentRecord["status"],
  responseNote?: string
): Promise<void> {
  const ref = doc(db, "appointments", appointmentId);
  await updateDoc(ref, {
    status,
    ...(responseNote ? { responseNote } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
  const ref = doc(db, "appointments", appointmentId);
  await deleteDoc(ref);
}
