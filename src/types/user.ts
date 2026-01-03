export type UserRole =
  | "owner"
  | "director"
  | "broker"
  | "accountant"
  | "marketing"
  | "client";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};
