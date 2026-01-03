import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseClient";
import type { Inquiry } from "@/components/data/mockData";

export type InquiryRecord = Inquiry & {
  userId?: string;
  response?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export async function fetchInquiries(): Promise<InquiryRecord[]> {
  const snap = await getDocs(collection(db, "inquiries"));
  return snap.docs.map((d) => {
    const data = d.data() as Partial<InquiryRecord>;
    return {
      id: d.id,
      userId: (data as { userId?: string }).userId,
      clientName: data.clientName ?? "",
      clientEmail: data.clientEmail ?? "",
      propertyId: data.propertyId ?? "",
      propertyName: data.propertyName ?? "",
      message: data.message ?? "",
      date: data.date ?? "",
      status: (data.status as InquiryRecord["status"]) ?? "New",
      response: data.response,
    };
  });
}

export async function respondToInquiry(id: string, response: string, status: InquiryRecord["status"] = "Resolved") {
  const ref = doc(db, "inquiries", id);
  await updateDoc(ref, { response, status, updatedAt: serverTimestamp() });
}

export async function createInquiry(payload: Omit<InquiryRecord, "id" | "createdAt" | "updatedAt">) {
  await addDoc(collection(db, "inquiries"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
