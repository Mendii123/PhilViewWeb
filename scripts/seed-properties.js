/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

/**
 * One-time Firestore seeder for property documents.
 * Requirements:
 * - Install deps: npm install firebase-admin
 * - Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account JSON.
 *   e.g. $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\service-account.json"
 * Run:
 *   npm run seed:properties
 */

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path.");
  process.exit(1);
}

const resolvedPath = path.resolve(serviceAccountPath);
const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

// Seed data based on existing mockProperties.
const properties = [
  {
    id: "1",
    name: "Skyline Residences",
    location: "Makati City",
    coordinates: { lat: 14.5551, lng: 121.0169 },
    price: 8500000,
    type: "Condominium",
    status: "Available",
    description: "Luxury high-rise living with stunning city views",
    image:
      "https://images.unsplash.com/photo-1748440290941-84b6600b2373?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjByZWFsJTIwZXN0YXRlJTIwYnVpbGRpbmd8ZW58MXx8fHwxNzU2OTgwNTM4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    features: ["2 Bedrooms", "2 Bathrooms", "Parking", "Gym", "Swimming Pool"],
  },
  {
    id: "2",
    name: "Garden Villas",
    location: "Quezon City",
    coordinates: { lat: 14.6599, lng: 121.0245 },
    price: 12000000,
    type: "Townhouse",
    status: "Available",
    description: "Spacious family homes with private gardens",
    image:
      "https://images.unsplash.com/photo-1647025980693-04e6b24a6d78?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBwcm9wZXJ0eSUyMGRldmVsb3BtZW50fGVufDF8fHx8MTc1NzA1MTg0Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    features: ["3 Bedrooms", "3 Bathrooms", "Garden", "Garage", "Security"],
  },
  {
    id: "3",
    name: "Metro Heights",
    location: "Pasig City",
    coordinates: { lat: 14.5643, lng: 121.0151 },
    price: 6800000,
    type: "Condominium",
    status: "Reserved",
    description: "Modern urban living near business districts",
    image:
      "https://images.unsplash.com/photo-1728496120856-b2e920dc6f05?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxyZXNpZGVudGlhbCUyMGNvbmRvbWluaXVtfGVufDF8fHx8MTc1NzA1MTg0OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    features: ["1 Bedroom", "1 Bathroom", "Balcony", "Amenities", "Transport Hub"],
  },
];

async function main() {
  console.log(`Seeding ${properties.length} properties into Firestore...`);
  const batch = db.batch();
  for (const property of properties) {
    const ref = db.collection("properties").doc(property.id);
    const { id, ...rest } = property;
    batch.set(ref, rest, { merge: true });
  }
  await batch.commit();
  console.log("Seeded properties.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
