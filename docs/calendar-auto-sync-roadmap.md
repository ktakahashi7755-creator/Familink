# 外部カレンダー自動同期 ロードマップ（Wave 65）

Familink を「家族予定の中心」にするための、外部カレンダー連携の段階的設計です。
現 Web 版 → App Store 版 → 完全自動同期 → 家族共有の 4 段階で進めます。

---

## 1. 現状の課題

### 1.1 「.ics 手動取り込み」中心の体験は一般ユーザーに難しい
- `.ics` という拡張子の意味が分からない
- 「カレンダー設定 → エクスポート → 保存 → アップロード」の手順が多い
- iPhone ユーザーには `.ics` ファイル操作自体が馴染みがない
- 投資家・テスターに「面倒そう」という印象を与えるリスク

### 1.2 自動同期の前提となる技術が未整備
- バックエンド未導入（GitHub Pages の静的配信のみ）
- OAuth フローを安全に運用する基盤がない
- App Store 版 / iOS EventKit が未導入
- ユーザー認証 / プロフィール永続化が LocalStorage のみ

---

## 2. 理想のユーザー体験

```
[ Familink カレンダー画面 ]
        │
        ▼
[ 「連携」ボタンをタップ ]
        │
        ▼
[ Google / iPhone / Yahoo を選択 ]
        │
        ▼
[ ログイン or 許可ダイアログ ]
        │
        ▼
[ どのカレンダーを読み込むか選択 ]
        │
        ▼
[ Familink へ自動反映 ]
        │
        ▼
[ 重複予定は自動マージ / 連携解除はいつでも可能 ]
```

ポイント：
- ユーザーは 4 タップ以内で連携完了
- `.ics` の存在をユーザーに見せない
- 取り込み前のプレビューはオプション
- 連携解除はワンタップ

---

## 3. Googleカレンダー自動同期に必要なもの（v1.5）

| 項目 | 内容 |
|---|---|
| API           | Google Calendar API v3（events.list / events.watch） |
| 認証          | OAuth 2.0 + PKCE（モバイル）/ Authorization Code（Web） |
| Client ID/Secret | バックエンド管理（フロントから秘匿） |
| リダイレクト URI | `https://api.familink.app/oauth/google/callback` 等 |
| トークン保存    | サーバ側で暗号化（リフレッシュトークン） |
| 同意画面     | Google OAuth Verification + プライバシーポリシー必須 |
| 同期ログ     | 同期日時 / 件数 / エラーをユーザーに表示 |
| 連携解除     | 一発でトークン無効化 + ローカルデータ削除選択 |
| 差分同期     | `syncToken` を保持 + push 通知（watch API） |
| 重複解決     | externalId 一致 → 上書き / 別 ID → 別予定 |
| バックエンド | Cloudflare Workers / Supabase Edge / 自前 API のいずれか |

**現 Web 版で実装しない理由**：Client Secret を安全に管理できる環境がないため。

---

## 4. iPhoneカレンダー自動連携に必要なもの（v1.0）

| 項目 | 内容 |
|---|---|
| 形態          | App Store 版（Capacitor / WebView ラッパー）|
| API           | iOS EventKit（`EKEventStore`） |
| 許可文言     | `NSCalendarsUsageDescription`「家族予定をまとめるために、カレンダー予定の読み取り・追加に使用します」 |
| 許可フロー    | 初回アクセス時に iOS 標準ダイアログ |
| 読み取り対象 | ユーザーがカレンダー一覧から選択（複数選択可） |
| 書き込み可否  | 設定で ON/OFF 切替 |
| Familink → iPhone | 「Familink」という専用カレンダーを iPhone に作成し、そこに書き込む |
| Background fetch | iOS の Background Tasks で定期同期（プレミアム） |

**現 Web 版で実装できない理由**：Web からは iPhone カレンダーへの API アクセスが不可。

---

## 5. Yahooカレンダー自動同期に必要なもの（v1.5+ 要調査）

| 項目 | 内容 |
|---|---|
| API 仕様      | Yahoo!カレンダー Web API の現状確認（提供停止 / 縮小の可能性） |
| ICS 購読     | Yahoo 側で ICS URL 提供がある場合は購読方式が現実的 |
| 認証          | Yahoo ID 連携 OAuth または ICS 公開 URL |
| 代替案       | Yahoo → Google 連携経由（中継）も検討 |

**現状の判断**：v1.0 段階では Google / Apple を優先し、Yahoo は調査継続。

---

## 6. 段階ロードマップ

### v0.2（現在 / 2026-05-08）
- かんたん連携 UI（モーダル冒頭で 3 プロバイダ + 手動）
- 手動 ICS 取り込み（ファイル / テキスト / プレビュー）
- 重複チェック（externalId / title+date+time）
- Hoku「カレンダー連携したい」→ モーダルへ誘導
- 各プロバイダで「現在 / 今後」の体験提示

### v1.0 — App Store 版（0–3 ヶ月）
- iOS Capacitor / WebView ラッパー
- iPhone カレンダー連携（EventKit）
- TestFlight 配布
- Google OAuth 設計着手（バックエンド検討）

### v1.5 — 自動同期（3–9 ヶ月）
- Google Calendar API 連携
- 自動同期 / 差分同期 / 連携解除
- 同期ログ表示
- Yahoo 仕様確認 → 対応可否決定

### v2.0 — 家族共有（9–24 ヶ月）
- 家族メンバー間カレンダー同期
- 学校 / 園 ICS 配信の購読
- B2B（園・学校・自治体）連携
- AI 予定整理（重複・矛盾検出）

---

## 7. プレミアム化候補

- **外部カレンダー自動同期**（Google / Apple / Yahoo）
- **複数カレンダー連携**（仕事用 + 家族用 + 学校用）
- **家族別カレンダー表示**（メンバーごとに色分け / フィルタ）
- **AI 予定整理**（Hoku が「重複」「移動時間不足」「家族の予定衝突」を検出）
- **週次サマリー**（毎週日曜にHokuが翌週の予定を要約）
- **ICS 購読**（URL を登録して自動更新）
- **書き戻し**（Familink で追加した予定を iPhone / Google カレンダーに反映）

---

## 8. プライバシー / セキュリティ方針

- Web 版：許可なしに外部カレンダーを読み取らない
- App 版：iOS 標準の許可ダイアログを必ず経由
- トークンはサーバ側で暗号化保管、フロントには露出しない
- 連携解除はワンタップ、その時点でローカルデータも削除選択肢を提示
- 同期ログは「いつ・何件・成功/失敗」を可視化
- プライバシーポリシーで「読み取る情報」「保管期間」を明示

---

## 9. 実装ファイル参照

| 項目 | 場所 |
|---|---|
| 取込ボタン（カレンダーヘッダー） | `app-source/familink.html` `s-cal` |
| モーダル `m-ics-import` の 5 ステップ | select / google / apple / yahoo / manual / roadmap / done |
| ステップ切替 | `setIcsImportStep(step)` |
| プロバイダ別ガイド | `_icsProviderGuideHtml(step)` |
| ロードマップ表示 | `_icsRoadmapHtml()` |
| ICS パーサー | `parseIcsText` / `_icsToEvent` |
| 取り込み実行 | `executeIcsImport`（done ステップへ遷移） |
| Hoku intent | `calendar_import_help` |
| Hoku アクション | `cal_import` / `cal_import_google` / `cal_import_apple` / `cal_import_yahoo` |
| 短文応答 | `HOKU_SHORT_REPLY.calendar_import_help` |

---

## 10. 関連ドキュメント

- `docs/calendar-import-sync-roadmap.md` — Wave 64 までの ICS 取込仕様
- `docs/hoku-agent-redesign.md` — Hoku の全体方針
- `docs/worklog.md` — 開発履歴
