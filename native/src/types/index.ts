// ─── Core Types ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email?: string;
  displayName: string;
  name?: string;          // alias for displayName, used in screens
  avatar?: string;
  avatarUrl?: string;     // alias for avatar
  avatarType?: 'preset' | 'custom';
  color?: string;
  role?: 'admin' | 'member' | 'parent';
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  avatarUrl?: string;     // alias for avatar
  avatarType?: string;
  role?: string;
  isUser?: boolean;
  userId?: string;        // linked user id
  createdAt?: string;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;           // YYYY-MM-DD
  startDate?: string;     // alias for date
  endDate?: string;
  time?: string;          // HH:MM
  endTime?: string;
  allDay?: boolean;
  memberId?: string;
  memberIds?: string[];   // multiple members
  color?: string;
  category?: string;
  place?: string;
  note?: string;
  repeat?: RepeatType;
  type?: string;
  workspaceId?: string;
  createdAt: string;
}

export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

// ─── Tasks ────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  done: boolean;
  dueDate?: string;
  memberId?: string;
  assigneeId?: string;    // alias for memberId
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
  photo?: string;
  note?: string;
  columnId?: string;
  workspaceId?: string;
  order?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface KanbanColumn {
  id: string;
  name: string;
  color?: string;
  order: number;
}

// ─── Memos ────────────────────────────────────────────────────────────────────

export interface Memo {
  id: string;
  title?: string;
  body?: string;
  folderId?: string;
  attachments?: MemoAttachment[];
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoAttachment {
  id: string;
  dataUrl: string;
  type?: string;
}

export interface MemoFolder {
  id: string;
  name: string;
  parentId?: string;
  color?: string;
  createdAt: string;
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string;
  date: string;
  memberId?: string;
  workspaceId?: string;
  createdAt: string;
}

export interface RecurringTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string;
  dayOfMonth?: number;
  enabled: boolean;
}

export interface BudgetMonth {
  income: number;
  expense: number;
}

export interface BudgetYear {
  [month: string]: BudgetMonth;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface HealthRecord {
  id: string;
  memberId: string;
  date: string;
  type: string;           // 'temp' | 'symptom' | 'medicine' | 'hospital' | 'growth' | 'memo' | 'fever' | 'vaccine' | 'checkup' | 'note'
  value?: string | number;
  unit?: string;
  note?: string;
  createdAt: string;
}

// ─── Prep (持ち物・準備) ───────────────────────────────────────────────────────

export interface PrepItem {
  id: string;
  text: string;
  done: boolean;
  memberId?: string;
  source?: 'manual' | 'routine';
  order?: number;
  createdAt: string;
}

export interface PrepRoutine {
  id: string;
  name: string;
  items: string[];
  memberId?: string;
  enabled: boolean;
}

// ─── Shopping ─────────────────────────────────────────────────────────────────

export interface ShoppingItem {
  id: string;
  name: string;
  done: boolean;
  quantity?: number;
  unit?: string;
  category?: string;
  note?: string;
  order?: number;
  createdAt: string;
}

// ─── Family Board ─────────────────────────────────────────────────────────────

export interface Post {
  id: string;
  memberId: string;
  text?: string;
  photo?: string;
  reactions?: Record<string, string[]>;
  workspaceId?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  memberId: string;
  title: string;
  body?: string;
  pinned?: boolean;
  createdAt: string;
}

// ─── Album ────────────────────────────────────────────────────────────────────

export interface AlbumPhoto {
  id: string;
  dataUrl: string;
  caption?: string;
  memberId?: string;
  folderId?: string;
  createdAt: string;
}

export interface AlbumFolder {
  id: string;
  name: string;
  coverPhotoId?: string;
  createdAt: string;
}

// ─── Documents ────────────────────────────────────────────────────────────────

export interface Doc {
  id: string;
  title: string;
  category?: string;
  photo?: string;
  note?: string;
  memberId?: string;
  createdAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  body?: string;
  datetime?: string;
  type?: string;
  relatedId?: string;
  read?: boolean;
  createdAt: string;
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order?: number;
  createdAt: string;
}

// ─── Premium ──────────────────────────────────────────────────────────────────

export type PremiumPlan = 'monthly' | 'annual';

// ─── Hoku ─────────────────────────────────────────────────────────────────────

export interface HokuMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: HokuAction[];
}

export interface HokuAction {
  label: string;
  type: string;
  payload?: unknown;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  displayName?: string;
  avatar?: string;
  avatarType?: string;
}
