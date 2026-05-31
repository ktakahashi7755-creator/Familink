import { create } from 'zustand';
import { persist as mmkvPersist, hydrate, StorageAdapter } from './storage';
import type {
  User, Member, CalendarEvent, Task, KanbanColumn,
  Memo, MemoFolder, Transaction, RecurringTransaction,
  HealthRecord, PrepItem, PrepRoutine, ShoppingItem,
  Post, Announcement, AlbumPhoto, AlbumFolder, Doc,
  Notification, Workspace, UserProfile,
} from '../types';
import { uid, todayStr } from '../utils/date';

// ─── State Shape ──────────────────────────────────────────────────────────────

interface FamilinkState {
  // Auth
  loggedIn: boolean;
  user: User | null;
  members: Member[];
  userProfile: UserProfile;
  familyId: string | null;

  // Calendar
  events: CalendarEvent[];

  // Tasks
  tasks: Task[];
  kanbanCols: KanbanColumn[];

  // Memos
  memos: Memo[];
  memoFolders: MemoFolder[];

  // Budget
  txs: Transaction[];
  recurringTxs: RecurringTransaction[];
  budgetM: Record<string, { income: number; expense: number }>;
  budgetY: Record<string, number>;

  // Health
  health: HealthRecord[];

  // Prep
  prep: PrepItem[];
  prepRoutines: PrepRoutine[];

  // Shopping
  shoppingItems: ShoppingItem[];

  // Board
  posts: Post[];
  announces: Announcement[];

  // Album / Docs
  albumPhotos: AlbumPhoto[];
  albumFolders: AlbumFolder[];
  docs: Doc[];

  // Notifications
  notifs: Notification[];

  // Workspace
  workspaces: Workspace[];
  currentWorkspaceId: string | null;

  // Premium
  isPremiumUser: boolean;
  trialStartedAt: string | null;

  // Settings
  homeOrder: string[];
  activeStreak: number;
  lastActiveDate: string | null;
  onboardCompleted: boolean;

  // ─── Actions ──────────────────────────────────────────────────────────────

  // Auth
  login: (user: User) => void;
  logout: () => void;
  setMembers: (members: Member[]) => void;
  addMember: (member: Member) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;

  // Events
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  // Tasks
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;

  // Memos
  addMemo: (memo: Omit<Memo, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMemo: (id: string, patch: Partial<Memo>) => void;
  deleteMemo: (id: string) => void;
  addMemoFolder: (folder: Omit<MemoFolder, 'id' | 'createdAt'>) => void;
  updateMemoFolder: (id: string, patch: Partial<MemoFolder>) => void;
  deleteMemoFolder: (id: string) => void;

  // Transactions
  addTx: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTx: (id: string, patch: Partial<Transaction>) => void;
  deleteTx: (id: string) => void;

  // Health
  addHealth: (record: Omit<HealthRecord, 'id' | 'createdAt'>) => void;
  deleteHealth: (id: string) => void;

  // Prep
  addPrep: (item: Omit<PrepItem, 'id' | 'createdAt'>) => void;
  togglePrep: (id: string) => void;
  deletePrep: (id: string) => void;
  clearDonePrep: () => void;

  // Shopping
  addShopping: (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => void;
  toggleShopping: (id: string) => void;
  deleteShopping: (id: string) => void;
  clearDoneShopping: () => void;

  // Board
  addPost: (post: Omit<Post, 'id' | 'createdAt'>) => void;
  deletePost: (id: string) => void;
  addAnnounce: (announce: Omit<Announcement, 'id' | 'createdAt'>) => void;
  deleteAnnounce: (id: string) => void;

  // Album
  addPhoto: (photo: Omit<AlbumPhoto, 'id' | 'createdAt'>) => void;
  deletePhoto: (id: string) => void;

  // Premium
  activatePremium: () => void;
  startTrial: () => void;

  // Streak
  checkStreak: () => void;
}

// ─── Default State ────────────────────────────────────────────────────────────

function getDefaultState() {
  return {
    loggedIn: false,
    user: null,
    members: [],
    userProfile: {},
    familyId: null,

    events: [],
    tasks: [],
    kanbanCols: [
      { id: 'todo', name: 'やること', color: '#5B7FFF', order: 0 },
      { id: 'doing', name: '進行中', color: '#FFAB40', order: 1 },
      { id: 'done', name: '完了', color: '#34C759', order: 2 },
    ],

    memos: [],
    memoFolders: [],

    txs: [],
    recurringTxs: [],
    budgetM: {},
    budgetY: {},

    health: [],
    prep: [],
    prepRoutines: [],

    shoppingItems: [],
    posts: [],
    announces: [],
    albumPhotos: [],
    albumFolders: [],
    docs: [],
    notifs: [],

    workspaces: [],
    currentWorkspaceId: null,

    isPremiumUser: false,
    trialStartedAt: null,

    homeOrder: ['calendar', 'tasks', 'memo', 'budget', 'health', 'shopping'],
    activeStreak: 0,
    lastActiveDate: null,
    onboardCompleted: false,
  };
}

// ─── MMKV Persistence Key List ────────────────────────────────────────────────

const PERSIST_KEYS: (keyof FamilinkState)[] = [
  'loggedIn', 'user', 'members', 'userProfile', 'familyId',
  'events', 'tasks', 'kanbanCols',
  'memos', 'memoFolders',
  'txs', 'recurringTxs', 'budgetM', 'budgetY',
  'health', 'prep', 'prepRoutines',
  'shoppingItems', 'posts', 'announces',
  'albumPhotos', 'albumFolders', 'docs', 'notifs',
  'workspaces', 'currentWorkspaceId',
  'isPremiumUser', 'trialStartedAt',
  'homeOrder', 'activeStreak', 'lastActiveDate', 'onboardCompleted',
];

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<FamilinkState>((set, get) => {
  // Hydrate from MMKV
  const saved: Partial<FamilinkState> = {};
  for (const key of PERSIST_KEYS) {
    const val = hydrate(key as string, undefined);
    if (val !== undefined) (saved as Record<string, unknown>)[key] = val;
  }

  function save(patch: Partial<FamilinkState>) {
    set(patch as Partial<FamilinkState>);
    for (const key of Object.keys(patch)) {
      if (PERSIST_KEYS.includes(key as keyof FamilinkState)) {
        mmkvPersist(key, (patch as Record<string, unknown>)[key]);
      }
    }
  }

  const defaultState = getDefaultState();
  const initial = { ...defaultState, ...saved };

  return {
    ...initial,

    // ─── Auth ───────────────────────────────────────────────────────────────

    login: (user) => save({ loggedIn: true, user }),

    logout: () => save({
      loggedIn: false,
      user: null,
      familyId: null,
    }),

    setMembers: (members) => save({ members }),

    addMember: (member) => save({ members: [...get().members, member] }),

    updateMember: (id, patch) => save({
      members: get().members.map(m => m.id === id ? { ...m, ...patch } : m),
    }),

    deleteMember: (id) => save({
      members: get().members.filter(m => m.id !== id),
    }),

    setUserProfile: (profile) => save({
      userProfile: { ...get().userProfile, ...profile },
    }),

    // ─── Events ─────────────────────────────────────────────────────────────

    addEvent: (event) => {
      const newEvent: CalendarEvent = { ...event, id: 'ev_' + uid(), createdAt: new Date().toISOString() };
      save({ events: [newEvent, ...get().events] });
    },

    updateEvent: (id, patch) => save({
      events: get().events.map(e => e.id === id ? { ...e, ...patch } : e),
    }),

    deleteEvent: (id) => save({ events: get().events.filter(e => e.id !== id) }),

    // ─── Tasks ──────────────────────────────────────────────────────────────

    addTask: (task) => {
      const newTask: Task = { ...task, id: 'tk_' + uid(), done: false, createdAt: new Date().toISOString() };
      save({ tasks: [newTask, ...get().tasks] });
    },

    updateTask: (id, patch) => save({
      tasks: get().tasks.map(t => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t),
    }),

    deleteTask: (id) => save({ tasks: get().tasks.filter(t => t.id !== id) }),

    toggleTask: (id) => {
      const task = get().tasks.find(t => t.id === id);
      if (task) {
        save({ tasks: get().tasks.map(t => t.id === id ? { ...t, done: !t.done, updatedAt: new Date().toISOString() } : t) });
      }
    },

    // ─── Memos ──────────────────────────────────────────────────────────────

    addMemo: (memo) => {
      const now = new Date().toISOString();
      const newMemo: Memo = { ...memo, id: 'memo_' + uid(), createdAt: now, updatedAt: now };
      save({ memos: [newMemo, ...get().memos] });
    },

    updateMemo: (id, patch) => save({
      memos: get().memos.map(m => m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m),
    }),

    deleteMemo: (id) => save({ memos: get().memos.filter(m => m.id !== id) }),

    addMemoFolder: (folder) => {
      const newFolder: MemoFolder = { ...folder, id: 'mfld_' + uid(), createdAt: new Date().toISOString() };
      save({ memoFolders: [...get().memoFolders, newFolder] });
    },

    updateMemoFolder: (id, patch) => save({
      memoFolders: get().memoFolders.map(f => f.id === id ? { ...f, ...patch } : f),
    }),

    deleteMemoFolder: (id) => {
      const folder = get().memoFolders.find(f => f.id === id);
      const parentId = folder?.parentId ?? '';
      save({
        memoFolders: get().memoFolders.filter(f => f.id !== id),
        memos: get().memos.map(m => m.folderId === id ? { ...m, folderId: parentId } : m),
      });
    },

    // ─── Transactions ────────────────────────────────────────────────────────

    addTx: (tx) => {
      const newTx: Transaction = { ...tx, id: 'tx_' + uid(), createdAt: new Date().toISOString() };
      save({ txs: [newTx, ...get().txs] });
    },

    updateTx: (id, patch) => save({ txs: get().txs.map(t => t.id === id ? { ...t, ...patch } : t) }),

    deleteTx: (id) => save({ txs: get().txs.filter(t => t.id !== id) }),

    // ─── Health ─────────────────────────────────────────────────────────────

    addHealth: (record) => {
      const newRecord: HealthRecord = { ...record, id: 'h_' + uid(), createdAt: new Date().toISOString() };
      save({ health: [newRecord, ...get().health] });
    },

    deleteHealth: (id) => save({ health: get().health.filter(h => h.id !== id) }),

    // ─── Prep ───────────────────────────────────────────────────────────────

    addPrep: (item) => {
      const newItem: PrepItem = { ...item, id: 'pr_' + uid(), done: false, createdAt: new Date().toISOString() };
      save({ prep: [...get().prep, newItem] });
    },

    togglePrep: (id) => save({
      prep: get().prep.map(p => p.id === id ? { ...p, done: !p.done } : p),
    }),

    deletePrep: (id) => save({ prep: get().prep.filter(p => p.id !== id) }),

    clearDonePrep: () => save({ prep: get().prep.filter(p => !p.done) }),

    // ─── Shopping ───────────────────────────────────────────────────────────

    addShopping: (item) => {
      const newItem: ShoppingItem = { ...item, id: 'sh_' + uid(), done: false, createdAt: new Date().toISOString() };
      save({ shoppingItems: [newItem, ...get().shoppingItems] });
    },

    toggleShopping: (id) => save({
      shoppingItems: get().shoppingItems.map(s => s.id === id ? { ...s, done: !s.done } : s),
    }),

    deleteShopping: (id) => save({ shoppingItems: get().shoppingItems.filter(s => s.id !== id) }),

    clearDoneShopping: () => save({ shoppingItems: get().shoppingItems.filter(s => !s.done) }),

    // ─── Board ──────────────────────────────────────────────────────────────

    addPost: (post) => {
      const newPost: Post = { ...post, id: 'post_' + uid(), createdAt: new Date().toISOString() };
      save({ posts: [newPost, ...get().posts] });
    },

    deletePost: (id) => save({ posts: get().posts.filter(p => p.id !== id) }),

    addAnnounce: (announce) => {
      const newAnnounce: Announcement = { ...announce, id: 'ann_' + uid(), createdAt: new Date().toISOString() };
      save({ announces: [newAnnounce, ...get().announces] });
    },

    deleteAnnounce: (id) => save({ announces: get().announces.filter(a => a.id !== id) }),

    // ─── Album ──────────────────────────────────────────────────────────────

    addPhoto: (photo) => {
      const newPhoto: AlbumPhoto = { ...photo, id: 'ph_' + uid(), createdAt: new Date().toISOString() };
      save({ albumPhotos: [newPhoto, ...get().albumPhotos] });
    },

    deletePhoto: (id) => save({ albumPhotos: get().albumPhotos.filter(p => p.id !== id) }),

    // ─── Premium ────────────────────────────────────────────────────────────

    activatePremium: () => save({ isPremiumUser: true }),

    startTrial: () => save({ trialStartedAt: new Date().toISOString() }),

    // ─── Streak ─────────────────────────────────────────────────────────────

    checkStreak: () => {
      const today = todayStr();
      const last = get().lastActiveDate;
      if (last === today) return;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      const streak = last === yStr ? get().activeStreak + 1 : 1;
      save({ activeStreak: streak, lastActiveDate: today });
    },
  };
});

// Convenience selectors
export const useUser = () => useStore(s => s.user);
export const useMembers = () => useStore(s => s.members);
export const useEvents = () => useStore(s => s.events);
export const useTasks = () => useStore(s => s.tasks);
export const useMemos = () => useStore(s => s.memos);
export const useMemoFolders = () => useStore(s => s.memoFolders);
export const useTxs = () => useStore(s => s.txs);
export const useHealth = () => useStore(s => s.health);
export const usePrep = () => useStore(s => s.prep);
export const useShopping = () => useStore(s => s.shoppingItems);
export const useIsPremium = () => useStore(s => s.isPremiumUser);
