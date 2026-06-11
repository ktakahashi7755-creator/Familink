/**
 * Familink domain types.
 * ------------------------------------------------------------------
 * Modeled from the web MVP's LocalStorage `familink_v3` shapes
 * (the PERSIST array). Field names are kept compatible so a future
 * import/export bridge from the web app stays simple.
 */

export type ID = string;
export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string; // full ISO timestamp

/** A family member (shown in calendar/budget visibility filters). */
export interface Member {
  id: ID;
  name: string;
  color: string;
  avatar?: string; // emoji, preset key, or base64/uri
  role?: 'parent' | 'child' | 'grandparent' | 'other';
}

/** Calendar event. */
export interface FamilyEvent {
  id: ID;
  title: string;
  date: ISODate;
  endDate?: ISODate;
  start?: string; // 'HH:mm'
  end?: string; // 'HH:mm'
  allDay?: boolean;
  memberId?: ID; // owner / assignee
  category?: string;
  color?: string;
  note?: string;
  location?: string;
  /** Recurrence rule key: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'. */
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  createdAt?: ISODateTime;
}

/** Task / to-do (kanban board uses columns). */
export interface Task {
  id: ID;
  title: string;
  done: boolean;
  column?: string; // kanban column id
  memberId?: ID;
  due?: ISODate;
  note?: string;
  createdAt?: ISODateTime;
}

export interface KanbanColumn {
  id: ID;
  title: string;
}

/** Money transaction (household budget). */
export interface Transaction {
  id: ID;
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  date: ISODate;
  memberId?: ID;
  note?: string;
  createdAt?: ISODateTime;
}

export interface RecurringTransaction extends Omit<Transaction, 'date'> {
  dayOfMonth: number;
  startDate: ISODate;
  endDate?: ISODate;
}

/** Family board post / announcement. */
export interface BoardPost {
  id: ID;
  text: string;
  memberId?: ID;
  pinned?: boolean;
  imageUri?: string;
  createdAt: ISODateTime;
}

/** Health / body-condition record. */
export interface HealthRecord {
  id: ID;
  memberId?: ID;
  date: ISODate;
  temperature?: number;
  symptom?: string;
  medication?: string;
  note?: string;
  createdAt?: ISODateTime;
}

/** Shopping list item. */
export interface ShoppingItem {
  id: ID;
  name: string;
  done: boolean;
  qty?: number;
  category?: string;
  memberId?: ID;
  createdAt?: ISODateTime;
}

/** Album photo (stored as uri/base64 in the web app). */
export interface AlbumPhoto {
  id: ID;
  uri: string; // local uri or remote url
  folderId?: ID;
  caption?: string;
  takenAt?: ISODateTime;
  memberId?: ID;
  faceGroupId?: ID;
  createdAt?: ISODateTime;
}

export interface AlbumFolder {
  id: ID;
  name: string;
  cover?: string;
}

/** Hoku AI chat message. */
export interface HokuMessage {
  id: ID;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: ISODateTime;
  /** Optional structured action Hoku proposes (e.g. add event). */
  action?: HokuAction;
}

export interface HokuAction {
  type: 'add_event' | 'add_task' | 'add_shopping' | 'add_transaction' | 'none';
  payload?: Record<string, unknown>;
  confirmed?: boolean;
}

/** The logged-in user / account profile. */
export interface UserProfile {
  id?: ID;
  name: string;
  email?: string;
  avatar?: string;
  familyName?: string;
}

/** Premium / trial state. */
export interface PremiumState {
  isPremiumUser: boolean;
  premiumPaid: boolean;
  trialStartedAt?: ISODateTime;
}
