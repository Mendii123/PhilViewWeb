import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebaseClient";

export type UserTransaction = {
  label: string;
  amount: number;
  date: string;
  type: "credit" | "debit";
};

export type UserProfile = {
  balance: number;
  transactions: UserTransaction[];
  credits?: number;
  debits?: number;
  available?: number;
};

const DEFAULT_PROFILE: UserProfile = {
  balance: 0,
  transactions: [],
  credits: 0,
  debits: 0,
  available: 0,
};

export async function ensureUserProfile(userId: string): Promise<UserProfile> {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, DEFAULT_PROFILE);
    return DEFAULT_PROFILE;
  }
  const data = snap.data() as Partial<UserProfile>;
  const transactions = Array.isArray(data.transactions) ? (data.transactions as UserTransaction[]) : [];
  const creditsFromTx = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const debitsFromTx = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const profile: UserProfile = {
    balance: typeof data.balance === "number" ? data.balance : DEFAULT_PROFILE.balance,
    transactions,
    credits: typeof data.credits === "number" ? data.credits : creditsFromTx,
    debits: typeof data.debits === "number" ? data.debits : debitsFromTx,
    available:
      typeof data.available === "number"
        ? data.available
        : (typeof data.balance === "number" ? data.balance : DEFAULT_PROFILE.balance) + creditsFromTx + debitsFromTx,
  };
  await setDoc(ref, profile, { merge: true });
  return profile;
}

export async function updateUserBalance(userId: string, profile: UserProfile): Promise<void> {
  const ref = doc(db, "users", userId);
  await setDoc(ref, profile, { merge: true });
}
