# Familink データモデル設計 v2（Wave 24 / 2026-05-03）

**保存先：** `localStorage["familink_v3"]`（JSON 文字列）
**互換性：** 全 23 Wave で後方互換維持 / 既存ユーザーデータ破壊なし

---

## 1. 全体構造（S オブジェクト）

```ts
// すべての state は単一 S オブジェクトに集約
const S = {
  // ===== 認証 / セッション =====
  loggedIn: boolean,
  user: Member,                    // 現在ログインしているメンバー
  userProfile: UserProfile,        // 表示名 / 役割 / 家族名

  // ===== オンボーディング =====
  onboardCompleted: boolean,

  // ===== コアデータ =====
  events: Event[],                 // カレンダー予定
  tasks: Task[],                   // タスク
  txs: Tx[],                       // 家計取引
  posts: any[],                    // 旧投稿（未使用 / 後方互換）
  announces: Announce[],           // 家族ボード投稿（実体）
  health: HealthRecord[],          // 体調記録
  prep: PrepItem[],                // 準備リスト
  notifs: Notif[],                 // 通知

  // ===== カスタムボード =====
  customBoards: CustomBoard[],
  boardItems: BoardItem[],
  boardSections: BoardSection[],
  boardCustomTabs: string[],       // 家族ボードのカスタムタブ名

  // ===== 設定 =====
  budgetY: number | null,
  budgetM: number | null,
  budgetType: 'expense' | 'income',
  homeOrder: string[],             // ['b_board','b_task','b_cal','cb_xxx',...]
  tkVisibleMembers: string[],      // タスクのメンバーフィルター
  userPhotos: { [memberId]: dataUrl },     // 後方互換のみ
  userAvatars: { [memberId]: avatarId },
  userAvatarType: { [memberId]: 'official' | 'customPhoto' },
  isPremiumUser: boolean,

  // ===== 後方互換（撤廃済機能の残置）=====
  kanbanCols: string[],            // Wave 15 撤廃 / 互換のため残置
  folders: any[],                  // Wave 15 撤廃 / 互換のため残置
  docs: any[],                     // Wave 15 撤廃 / 互換のため残置

  // ===== 一時 view state（PERSIST 対象外）=====
  screen: string,
  prev: string,
  calY: number, calM: number, calSel: string,
  calView: 'month' | 'week' | 'list',
  healthChild: number,
  boardTab: string,
  // ...etc
};
```

---

## 2. PERSIST 対象（LocalStorage に保存される 26 フィールド）

```ts
const PERSIST = [
  'loggedIn', 'user',
  'events', 'tasks', 'txs', 'posts', 'announces', 'health', 'prep', 'notifs',
  'budgetY', 'budgetM',
  'folders', 'docs',                      // 後方互換
  'kanbanCols',                           // 後方互換
  'tkVisibleMembers',
  'userPhotos', 'userAvatars', 'userAvatarType',
  'isPremiumUser',
  'homeOrder',
  'customBoards', 'boardItems', 'boardSections',
  'userProfile', 'onboardCompleted', 'boardCustomTabs'
];
```

非 PERSIST：`screen`, `prev`, `calY`, `calM`, `calSel`, `calView`, `healthChild`, `boardTab`, `_hokuMsgs`, `_budgetMember`, `_prepTab`, `_boardCat`, `_bcType`, `_bcIntent`, `_activeBoardId`, `_peRoleId`, `_evColor`, `_avatarTargetId`(削除済) 等

---

## 3. データモデル定義

### 3.1 Member（家族メンバー / 静的）

```ts
type Member = {
  id: string;          // 'kenya' | 'seiai' | 'seito' | 'seio' | 'seitaro'
  name: string;        // 'パパ' | 'ママ' | '太郎' | '花子' | '健太'
  role: 'parent' | 'child';
  av: string;          // アバター文字（1 文字）
  grad: string;        // CSS gradient
};

// MEMBERS は静的配列（5 名固定）
const MEMBERS: Member[] = [
  { id:'kenya',   name:'パパ', role:'parent', av:'パ', grad:'linear-gradient(135deg,#4A90E2,#7BB3F5)' },
  { id:'seiai',   name:'ママ', role:'parent', av:'マ', grad:'linear-gradient(135deg,#F07CB3,#FDA4AF)' },
  { id:'seito',   name:'太郎', role:'child',  av:'太', grad:'linear-gradient(135deg,#FF9B4E,#FFB800)' },
  { id:'seio',    name:'花子', role:'child',  av:'花', grad:'linear-gradient(135deg,#52C47A,#86EFAC)' },
  { id:'seitaro', name:'健太', role:'child',  av:'健', grad:'linear-gradient(135deg,#9B7EDE,#C4B5FD)' }
];
```

### 3.2 UserProfile（プロフィール）

```ts
type UserProfile = {
  displayName: string;        // 1〜12 文字
  roleId: string;             // 'parent_pa' | 'parent_ma' | 'child_son' | 'child_dau' | 'grand_pa' | 'grand_ma' | 'partner' | 'sibling' | 'other'
  familyName: string;         // 任意 / 最大 20 文字
  createdAt: string;          // YYYY-MM-DD
};
```

### 3.3 Event（予定）

```ts
type Event = {
  id: string;
  title: string;
  date: string;               // YYYY-MM-DD
  time: string;               // HH:MM
  color: string;              // hex
  member: string;             // Member.id
  note: string;
  repeat?: '' | 'daily' | 'weekdays' | 'weekly' | 'monthly';   // Wave 21 追加
};
```

### 3.4 Task（タスク）

```ts
type Task = {
  id: string;
  title: string;
  memo: string;
  assignedTo: string;         // Member.id
  dueDate: string;            // YYYY-MM-DD
  status: 'todo' | 'done';    // (kanban の doing/hold は撤廃済)
  priority: 'none' | 'low' | 'med' | 'high';
  category: string;           // 'school' | 'chore' | 'shopping' | 'health' | 'event' | 'other' | ''
  order: number;              // 並び順
  completedAt: string;
  createdAt: string;
  updatedAt: string;
};
```

### 3.5 Tx（取引）

```ts
type Tx = {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  cat: string;                // CATS_EX / CATS_IN のいずれか
  desc: string;
  date: string;               // YYYY-MM-DD
  member: string;             // Member.id | 'common'（家族共通）
};

// カテゴリ
const CATS_EX = ['食費','光熱費','日用品','医療費','教育費','交通費','通信費','娯楽費','被服費','住居費','保険','その他支出'];
const CATS_IN = ['給与','賞与','副業','こづかい','その他収入'];
```

### 3.6 Announce（家族ボード投稿）

```ts
type Announce = {
  id: string;
  title: string;
  body: string;
  author: string;             // Member.id
  cat: '' | '家事' | '買い物' | '習い事' | '学校' | '重要' | 'その他' | string;  // カスタムタブも文字列
  isPinned: boolean;
  targets: 'all' | string;    // 'all' or Member.id
  expiresAt: string;          // YYYY-MM-DD
  reads: string[];            // [Member.id]
  reactions: { [key: string]: number };
  reactMap: { [memberId: string]: string };
  comments: { id, body, author, createdAt }[];
  createdAt: string;
  updatedAt: string;
};
```

### 3.7 PrepItem（準備リスト項目）

```ts
type PrepItem = {
  id: string;
  text: string;
  cat: string;                // '学校' | '習い事' | '病院' | '旅行' | 'その他'
  done: boolean;
  date: string;               // YYYY-MM-DD（空なら「今日」扱い）
};
```

### 3.8 HealthRecord（体調記録）

```ts
type HealthRecord = {
  id: string;
  child: string;              // Child Member.id
  date: string;
  temp: number;               // 体温 ℃
  cond: string;               // 症状
  note: string;
  meds: string;               // 服薬
};
```

### 3.9 CustomBoard（カスタムボード）

```ts
type CustomBoard = {
  id: string;
  name: string;
  type: 'prep' | 'share' | 'memo';     // baseType
  intent?: 'family-share' | 'lessons' | 'health' | 'prep' | 'shopping' | 'submissions' | 'memo';   // Wave 17 追加 / 旧データは未定義
  order: number;
  visible: boolean;
  createdAt: string;
};

type BoardItem = {
  id: string;
  boardId: string;
  sectionId: string | '';     // prep/shopping/submissions のセクション参照
  title: string;
  body: string;
  status?: 'todo' | 'done';   // prep type のみ
  category?: string;          // share type のみ
  childId?: string;           // share type のみ
  createdBy: string;
  createdAt: string;
};

type BoardSection = {
  id: string;
  boardId: string;
  title: string;              // 「今日の準備」「明日の準備」等
  order: number;
  createdAt: string;
};
```

### 3.10 Notif（通知）

```ts
type Notif = {
  id: string;
  title: string;
  desc: string;
  time: string;               // ISO date
  read: boolean;
  icon: string;               // emoji
};
```

---

## 4. INTENT_META（用途別ボードメタ / Wave 17）

```ts
const INTENT_META = {
  'family-share': {
    label: '家族共有', baseType: 'share', icon: '💬',
    addBtn: '共有を追加', desc: '家族に共有したい出来事や連絡を残せます。',
    titlePh: '例：今日の連絡メモ',
    examples: ['園/学校での出来事', '家族に伝えたいこと', '今日の連絡メモ'],
    defaultCategory: '連絡'
  },
  'lessons':     { /* 習い事 */ },
  'health':      { /* 体調管理 + 医療注記 */ },
  'prep':        { /* 準備リスト + 自動セクション */ },
  'shopping':    { /* 買い物メモ + 自動セクション */ },
  'submissions': { /* 提出物チェック + 自動セクション */ },
  'memo':        { /* 汎用メモ */ }
};

function getIntentMeta(b: CustomBoard) {
  if(b.intent && INTENT_META[b.intent]) return INTENT_META[b.intent];
  // 旧データ：type → intent 推定
  if(b.type === 'prep')  return INTENT_META.prep;
  if(b.type === 'share') return INTENT_META['family-share'];
  return INTENT_META.memo;
}
```

---

## 5. データフロー（典型例：取引追加）

```
[ユーザー操作]
  家計画面 FAB ＋ タップ
  → openTxModal()
    → S.budgetType を読み取り
    → CATS_EX / CATS_IN から選択肢を構築
    → 担当者ボタン構築（MEMBERS + 家族共通）
    → 現在のメンバータブから初期担当者を決定
    → openModal('m-budget')

  [ユーザー入力]
  金額 / カテゴリ / 内容 / 日付 / 担当者
  「保存する」タップ
  → saveTx()
    → バリデーション（金額 > 0 / 日付あり）
    → S.txs.push({...})
    → saveS()           // LocalStorage 永続化
    → closeModal('m-budget')
    → renderBudget()    // 画面再描画

  [画面更新]
  → renderBudget()
    → S.txs を月で絞り込み
    → メンバー別集計 → メンバータブ各バッジ
    → 現在の _budgetMember でフィルター
    → ヒーローカード（収入 / 支出 / 収支）
    → カテゴリ別バーチャート（上位 6）
    → 取引一覧
    → renderHome() で home カードも更新
```

---

## 6. マイグレーション戦略

### 6.1 後方互換の原則
**Wave 1〜23 すべて：既存フィールドを削除しない / 追加のみ**

### 6.2 旧データから新データへの推定
- `customBoard.intent` 未定義 → `getIntentMeta()` で `type` から推定
- `event.repeat` 未定義 → '' 扱い
- `userProfile` 未定義 → MEMBERS[0].name を表示名として使用
- `homeOrder` に旧 `b_docs` 含む → `hoInitOrder()` でフィルター除外

### 6.3 新規ユーザーの初期化
```ts
function init() {
  loadS();
  migrateTaskData();   // task.text → task.title 等
  if(S.loggedIn && S.user) {
    seedDemo();        // 既存データなければデモ投入
    switchTab('s-home');
  } else {
    showScreen('s-ob');
  }
}
```

### 6.4 破損 LocalStorage 耐性
```ts
function loadS() {
  try {
    const d = JSON.parse(localStorage.getItem(SK) || '{}');
    Object.assign(S, d);
  } catch(e) {}    // パース失敗時は S が初期値のまま → s-ob 表示
}
```

---

## 7. 将来の拡張（v0.2 で追加予定）

```ts
// 家族 2 端末同期用
type FamilyShareCode = {
  familyId: string;     // UUID
  inviteCode: string;   // 8 桁
  expiresAt: string;
};

// 通知 / 週次サマリー
type DailyReminder = {
  type: 'morning' | 'evening' | 'weekly';
  hour: number;
  enabled: boolean;
};

// Hoku 文脈応答
type HokuConversation = {
  id: string;
  history: { role: 'user' | 'hoku', content: string, time: string }[];
};
```

これらは PERSIST に追加するだけで実装可能（既存破壊なし）。
