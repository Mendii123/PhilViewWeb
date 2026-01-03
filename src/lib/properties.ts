import { collection, getDocs, query } from "firebase/firestore";
import type { Property } from "@/components/data/mockData";
import { db } from "./firebaseClient";

export type PropertyRecord = Property;

export async function fetchProperties(): Promise<PropertyRecord[]> {
  const snapshot = await getDocs(query(collection(db, "properties")));
  return snapshot.docs.map((doc) => {
    const data = doc.data() as Partial<PropertyRecord>;
    return {
      id: doc.id,
      name: data.name ?? "Untitled",
      location: data.location ?? "",
      coordinates: data.coordinates ?? { lat: 0, lng: 0 },
      price: Number(data.price ?? 0),
      type: data.type ?? "",
      status: data.status ?? "Available",
      description: data.description ?? "",
      image: data.image ?? "",
      features: Array.isArray(data.features) ? data.features : [],
    };
  });
}
