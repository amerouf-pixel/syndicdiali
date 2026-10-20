export type Language = 'fr' | 'ar' | 'en';
export type UserRole = 'syndic' | 'resident';
export type ActiveTab = 'dashboard' | 'apartments' | 'incidents' | 'announcements';
export type PaymentMethod = 'methodCash' | 'methodTransfer' | 'methodCheck';
export type ExpenseCategory =
  | 'catElevator'
  | 'catCleaning'
  | 'catSecurity'
  | 'catUtilities'
  | 'catPlumbing';
export type IncidentStatus = 'reported' | 'in_progress' | 'fixed';
export type ApartmentFilter = 'all' | 'paid' | 'unpaid';

export interface LocalizedText {
  fr: string;
  ar: string;
  en: string;
}

export interface Apartment {
  id: number;
  number: string;
  floor: number;
  owner: LocalizedText;
  phone: string;
  paid: boolean;
  amount: number;
  method: PaymentMethod | null;
  paidDate: string | null;
  receiptNo: string | null;
}

export interface Expense {
  id: number;
  category: ExpenseCategory;
  date: string;
  amount: number;
  vendor: string;
  title: LocalizedText;
}

export interface Incident {
  id: number;
  status: IncidentStatus;
  date: string;
  reporter: string;
  location: LocalizedText;
  description: LocalizedText;
}

export interface Announcement {
  id: number;
  urgent: boolean;
  date: string;
  title: LocalizedText;
  body: LocalizedText;
}

export interface Poll {
  id: number;
  yesVotes: number;
  noVotes: number;
  userVote: 'yes' | 'no' | null;
  cost: string;
  title: LocalizedText;
}

export interface TreasuryStats {
  currentBalance: number;
  collectedThisMonth: number;
  spentThisMonth: number;
  paidCount: number;
  unpaidCount: number;
}
