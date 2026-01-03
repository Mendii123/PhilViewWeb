/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

/**
 * Seeds users, appointments, and inquiries with mock values.
 *
 * Usage:
 *   npm install
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\service-account.json"
 *   npm run seed:data
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

const users = [
  {
    id: "demo-client-1",
    balance: 2_500_000,
    transactions: [
      { label: "Initial Deposit", amount: 1_000_000, date: "2024-08-15", type: "credit" },
      { label: "Payment - Skyline Residences", amount: 1_500_000, date: "2024-09-01", type: "credit" },
      { label: "Reservation Fee", amount: -50_000, date: "2024-09-03", type: "debit" },
    ],
  },
];

const appointments = [
  {
    id: "a1",
    userId: "demo-client-1",
    clientName: "Maria Santos",
    clientEmail: "maria.santos@email.com",
    propertyId: "1",
    propertyName: "Skyline Residences",
    date: "2024-09-10",
    time: "14:00",
    status: "Pending",
    type: "Viewing",
    notes: "Bring sample contract",
  },
  {
    id: "a2",
    userId: "demo-client-1",
    clientName: "Maria Santos",
    clientEmail: "maria.santos@email.com",
    propertyId: "2",
    propertyName: "Garden Villas",
    date: "2024-09-12",
    time: "10:00",
    status: "Confirmed",
    type: "Consultation",
    responseNote: "See you then",
  },
];

const inquiries = [
  {
    id: "i1",
    userId: "demo-client-1",
    clientName: "Maria Santos",
    clientEmail: "maria.santos@email.com",
    propertyId: "1",
    propertyName: "Skyline Residences",
    message: "I would like to know more about the payment terms.",
    date: "2024-09-05",
    status: "New",
  },
  {
    id: "i2",
    userId: "demo-client-1",
    clientName: "Anna Garcia",
    clientEmail: "anna.garcia@email.com",
    propertyId: "3",
    propertyName: "Metro Heights",
    message: "Can I schedule a viewing for this weekend?",
    date: "2024-09-04",
    status: "In Progress",
    response: "We can do Saturday 10 AM.",
  },
];

async function seedUsers() {
  const batch = db.batch();
  users.forEach((u) => {
    const ref = db.collection("users").doc(u.id);
    batch.set(ref, { balance: u.balance, transactions: u.transactions }, { merge: true });
  });
  await batch.commit();
  console.log("Seeded users");
}

async function seedAppointments() {
  const batch = db.batch();
  appointments.forEach((a) => {
    const { id, ...rest } = a;
    const ref = db.collection("appointments").doc(id);
    batch.set(ref, { ...rest, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
  });
  await batch.commit();
  console.log("Seeded appointments");
}

async function seedInquiries() {
  const batch = db.batch();
  inquiries.forEach((inq) => {
    const { id, ...rest } = inq;
    const ref = db.collection("inquiries").doc(id);
    batch.set(ref, { ...rest, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
  });
  await batch.commit();
  console.log("Seeded inquiries");
}

async function main() {
  await seedUsers();
  await seedAppointments();
  await seedInquiries();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
