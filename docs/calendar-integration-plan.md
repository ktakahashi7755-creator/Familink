# Familink カレンダー外部連携 設計書（Wave 25 / 2026-05-03）

**目的：** Familink の予定を将来的に Google / Yahoo / LINE / iPhone カレンダー等へ連携する設計を整理。
**前提：** OAuth / 外部 API 本格連携は禁止 → URL パラメータ方式 + ICS 出力（共に依存ゼロ）に限定。

---

## 1. 現状カレンダー機能の整理

### 1.1 データ構造（`S.events[]`）

```ts
type Event = {
  id: string;         // uid
  title: string;
  date: string;       // YYYY-MM-DD（開始日 = 終了日）
  time: string;       // HH:MM（開始時刻）
  color: string;      // hex
  member: string;     // Member.id
  note: string;
  repeat?: '' | 'daily' | 'weekdays' | 'weekly' | 'monthly';   // Wave 21 追加
};
```

### 1.2 外部カレンダー連携に**ある**項目
- ✅ タイトル
- ✅ 開始日
- ✅ 開始時刻
- ✅ メモ（DESCRIPTION）
- ✅ 担当者（メモに含めて伝達可能）
- ✅ 繰り返し（RRULE 変換可能）

### 1.3 外部カレンダー連携に**不足**項目（v0.2 で拡張候補）
- ❌ 終了日 / 終了時刻 → 現状は開始時刻 + 1 時間 をデフォルトとする
- ❌ 終日予定フラグ → time 空欄を allDay とみなす
- ❌ 場所（LOCATION）→ 任意。note から抽出 or 新規フィールド
- ❌ 通知 / リマインダ（VALARM）→ v0.2 で追加検討

### 1.4 拡張不要項目
- 担当者 → DESCRIPTION に「担当：パパ」と含める
- 色 → 外部カレンダーは独自カラー体系（無視 OK）

---

## 2. 連携方式の比較

### A. Google Calendar API 本格連携
| 観点 | 評価 |
|---|---|
| 認証 | OAuth 2.0 必須 |
| 設定コスト | Google Cloud + Calendar API 有効化 + 審査 |
| 機能 | 双方向同期 / 作成 / 更新 / 削除 |
| MVP 適合 | ❌ **MVP v0.1 では実装しない**（OAuth 禁止ルール）|
| 推奨タイミング | v1.0 以降（WKWebView ラッパー化後）|

### B. Google カレンダー追加 URL（推奨）
| 観点 | 評価 |
|---|---|
| 認証 | 不要（ユーザーの Google ログイン状態を利用）|
| 設定コスト | ゼロ |
| 機能 | 1 件の予定を追加（一方向）|
| MVP 適合 | ✅ **MVP v0.1 で安全に実装可能** |
| 形式 | `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...` |
| 制約 | iPhone Safari で新規タブ開く必要、ユーザーが「保存」を押す必要 |

**URL 仕様：**
```
https://calendar.google.com/calendar/render?
  action=TEMPLATE
  &text={タイトル URL エンコード}
  &dates={YYYYMMDDTHHMMSS}/{YYYYMMDDTHHMMSS}    // 開始/終了
  &details={メモ URL エンコード}
  &location={場所 URL エンコード}
```

### C. .ics ファイル生成・ダウンロード（推奨）
| 観点 | 評価 |
|---|---|
| 認証 | 不要 |
| 設定コスト | ゼロ |
| 機能 | 1 件 or 複数件の予定をエクスポート |
| MVP 適合 | ✅ **MVP v0.1 で安全に実装可能** |
| 対応カレンダー | iPhone 標準 / Google / Outlook / Yahoo / LINE 等 RFC5545 準拠の全て |
| iPhone 動作 | Safari でダウンロード → タップで「カレンダーに追加」プロンプト |

**ICS 仕様（最小）：**
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Familink//Event Export//JP
BEGIN:VEVENT
UID:{event.id}@familink
DTSTAMP:{now UTC}
DTSTART:{YYYYMMDDTHHMMSS}
DTEND:{YYYYMMDDTHHMMSS}
SUMMARY:{title}
DESCRIPTION:{note + 担当者}
RRULE:FREQ=WEEKLY  // repeat='weekly' の場合
END:VEVENT
END:VCALENDAR
```

### D. Yahoo カレンダー直接連携
| 観点 | 評価 |
|---|---|
| 公開 API | なし（2024 年現在）|
| 安定性 | LINE への移行予告あり / 仕様変化リスク高 |
| MVP 適合 | ❌ **直接連携は実装しない** |
| 代替 | ICS 出力で間接対応可能（Yahoo カレンダーは ICS インポート対応）|

### E. LINE カレンダー連携
| 観点 | 評価 |
|---|---|
| 公開 API | 限定的（LINE Developers の検討中）|
| 安定性 | 仕様確定前 |
| MVP 適合 | ❌ **直接連携は実装しない** |
| 代替 | ICS 出力で間接対応可能 |

### F. iPhone 標準カレンダー（Apple Calendar）
| 観点 | 評価 |
|---|---|
| 認証 | 不要 |
| 連携方式 | ICS ファイル経由（webcal:// or .ics ダウンロード）|
| MVP 適合 | ✅ ICS 出力で対応可能 |

---

## 3. MVP 段階方針

### MVP v0.1（現在 / Wave 25）
**実装：**
- ✅ 予定詳細・編集モーダルに「外部カレンダーに追加」ボタン
- ✅ 選択モーダル（3 択）：
  1. **📅 Google カレンダーに追加** → URL 起動
  2. **📥 .ics として書き出し** → Blob ダウンロード（iPhone カレンダー / Outlook 等）
  3. **キャンセル**
- ✅ Yahoo / LINE は当面非対応の旨を docs に記載
- ✅ Hoku が「外部カレンダー連携」要望に整合的に応答

**禁止事項：**
- ❌ OAuth 実装
- ❌ Google Cloud 設定要求
- ❌ クラウド側保存

### MVP v0.2（公開後 30〜60 日）
- 終了時刻 / 場所 / 終日 フィールドの追加（LS 構造に追加のみ）
- 複数予定の一括 ICS 出力（カレンダー → 月単位エクスポート）
- ICS インポート（外部 → Familink）の最小設計

### MVP v1.0（公開後 90 日 / WKWebView ラッパー化後）
- Google Calendar API（OAuth）双方向同期
- LINE カレンダー（仕様確定後）
- リマインダ / 通知連動

---

## 4. 最小実装の詳細設計

### 4.1 UI フロー
```
[予定モーダル m-event]
  ├ タイトル / 日付 / 時刻 / 繰り返し / メモ / カラー / 担当者
  └ 「外部カレンダーに追加」ボタン（編集モード時に表示）
    └ クリック → m-export-cal モーダル open
       ├ 📅 Google カレンダーに追加 → window.open(url, '_blank')
       ├ 📥 .ics として書き出し → blob ダウンロード
       └ キャンセル
```

### 4.2 Google Calendar URL ビルダー（疑似コード）
```js
function buildGoogleCalUrl(ev) {
  const ds = ev.date.replace(/-/g, '');
  const ts = (ev.time || '09:00').replace(':', '') + '00';
  const start = `${ds}T${ts}`;
  // 終了は開始 +1 時間
  const endHour = (parseInt((ev.time||'09:00').split(':')[0]) + 1).toString().padStart(2,'0');
  const endMin = (ev.time||'09:00').split(':')[1] || '00';
  const end = `${ds}T${endHour}${endMin}00`;
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${start}/${end}`,
    details: (ev.note||'') + (ev.member ? `\n担当：${getMem(ev.member).name}` : '')
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
```

### 4.3 ICS ファイル生成（疑似コード）
```js
function buildIcsContent(ev) {
  const ds = ev.date.replace(/-/g, '');
  const ts = (ev.time || '09:00').replace(':', '') + '00';
  const dtstart = `${ds}T${ts}`;
  const endHour = String(parseInt((ev.time||'09:00').split(':')[0]) + 1).padStart(2,'0');
  const endMin = (ev.time||'09:00').split(':')[1] || '00';
  const dtend = `${ds}T${endHour}${endMin}00`;
  const now = new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
  
  const rrule = ({
    daily: 'RRULE:FREQ=DAILY',
    weekdays: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    weekly: 'RRULE:FREQ=WEEKLY',
    monthly: 'RRULE:FREQ=MONTHLY'
  })[ev.repeat] || '';
  
  const memName = ev.member ? getMem(ev.member).name : '';
  const desc = (ev.note||'') + (memName?`\\n担当：${memName}`:'');
  
  return [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Familink//Event Export//JP',
    'BEGIN:VEVENT',
    `UID:${ev.id}@familink`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${ev.title.replace(/[\n\r]/g,' ')}`,
    `DESCRIPTION:${desc.replace(/\n/g,'\\n').replace(/[\r]/g,'')}`,
    rrule,
    'END:VEVENT','END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
}

function downloadIcs(ev) {
  const content = buildIcsContent(ev);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `familink-${ev.title}-${ev.date}.ics`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### 4.4 LocalStorage 影響
- **変更なし**（既存 `S.events[i]` をそのまま読み出して URL/ICS に変換するだけ）
- 既存ユーザーデータ完全互換

---

## 5. Hoku 応答方針

| ユーザー入力 | Hoku 応答 |
|---|---|
| 「Google カレンダーにも入れたい」 | 「予定詳細から『外部カレンダーに追加』を選ぶと、Google カレンダーへ転送できます。」 |
| 「iPhone カレンダーに追加したい」 | 「予定詳細から『.ics として書き出し』を選ぶと、iPhone 標準カレンダーに取り込めます。」 |
| 「Yahoo カレンダーと連携したい」 | 「Yahoo カレンダーへの直接連携は今後対応予定です。現時点では `.ics` 書き出しを利用すると Yahoo カレンダーにも取り込めます。」 |
| 「LINE カレンダーと連携したい」 | 「LINE カレンダーは仕様確認中のため、現時点では Familink 内保存 +`.ics` 書き出しでの間接対応となります。」 |
| 「外部カレンダーに同期したい」 | 「現在は単方向の書き出しのみ対応しています。双方向同期は v1.0 で対応予定です。」 |

---

## 6. iPhone 動作確認ポイント

| 機能 | 期待動作 |
|---|---|
| Google Calendar URL | Safari が calendar.google.com を新規タブで開く / ログイン済なら追加画面が即表示 |
| .ics ダウンロード | Safari ダウンロードバナー → 「カレンダーで開く」プロンプト → 標準カレンダーに追加 |
| Outlook / Yahoo 等 | .ics ファイルを各アプリで開く → 取り込みプロンプト |

---

## 7. 実装リスク

### Low（許容可能）
- iPhone Safari で Blob ダウンロードがブロックされる稀なケース → ICS 内容を画面表示するフォールバック
- Google Calendar URL の dates パラメータ形式変更リスク → 公式ドキュメント外

### Medium（管理可能）
- 終日予定 / 場所 などの未対応項目 → v0.2 で追加
- 繰り返し予定の RRULE 表現精度 → 単純な FREQ のみ対応 / 例外日は未対応

### 不在
- OAuth リフレッシュトークン管理 → 該当なし（OAuth 実装しないため）
- Cross-Origin / CSP 問題 → URL は別タブ / ICS は Blob → 該当なし

---

## 8. 推奨方針サマリー

| Wave | 実装 |
|---|---|
| **MVP v0.1（Wave 25）** | Google Calendar URL + ICS 出力 の 2 択モーダル |
| MVP v0.2 | 終了時刻 / 場所 / 終日フィールド + 月単位 ICS 一括出力 |
| MVP v1.0 | Google Calendar API（OAuth）双方向同期 + LINE カレンダー検討 |

---

## 9. 次にやるべきこと

### このフェーズ（Wave 25）
1. ✅ 設計書作成（本書）
2. ✅ 最小実装：Google URL + ICS 出力 モーダル
3. ✅ Hoku 応答に外部カレンダー言及を追加
4. ✅ 既存テスト 301 PASS 維持確認

### 次フェーズ（v0.2）
- イベントモーダルに `endDate` / `endTime` / `location` / `allDay` フィールド追加
- カレンダー画面右上に「月をエクスポート」ボタン追加
- ICS インポート機能（外部 → Familink）の最小設計

### v1.0
- WKWebView ラッパー + Google OAuth
- 双方向同期（差分検出 + 競合解決）
- LINE カレンダー API 公開待ち

---

## 10. 結論

**MVP v0.1 では「OAuth ゼロ / 依存ゼロ」の最小実装で外部連携の入り口を確保**：
- Google カレンダー追加 URL（即時利用可）
- .ics 書き出し（iPhone / Outlook / Yahoo / LINE 等の汎用カレンダー対応）

Yahoo / LINE の直接連携は仕様変動リスクのため意図的に見送り、ICS 経由で間接対応することを明文化。

実装は単一 HTML 内で完結し、LocalStorage 構造変更ゼロ。既存 301 自動テスト PASS を維持。
