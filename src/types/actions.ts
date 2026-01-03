export type ChatAction =
  | {
      type: "navigate";
      target: string;
      payload?: Record<string, unknown>;
    }
  | { type: "logout" };

export type AppointmentPrefill = {
  propertyId?: string;
  date?: string;
  time?: string;
  autoSubmit?: boolean;
  nonce?: string;
  cancel?: {
    propertyName?: string;
    date?: string;
    time?: string;
  };
} | null;
