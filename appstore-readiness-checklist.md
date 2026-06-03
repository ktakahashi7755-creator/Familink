# App Store 公開前 チェックリスト

> 最終更新: 2026-06-03 / v1.x — Wave 251 でファミコイン経済（ログインボーナス／ショップ）を追加。
> Wave 219+ で家族データ同期（Supabase Realtime）実装済み。視認性（WCAG コントラスト）・iOS 入力ズーム抑止・新規UIの aria/キーボード操作も整備。
> 自動QA 84/84 PASS、全16画面エラー0/横スクロール0、全59モーダルエラー0。
> 旧版（Wave 213, 2026-05-26）から現状に更新済。


Familink を App Store / Google Play に公開するために確認すべき残課題の一覧。
状態：☐ 未着手 / ◐ 進行中 / ☑ 完了

---

## 1. プロダクト品質

| 項目 | 状態 | 備考 |
|---|---|---|
| 主要画面の表示確認 | ◐ | auto レンダリングは全16画面で horizOverflow=false（320/375px）、全59モーダルもエラー0、実機目視が残 |
| 自動テスト全 PASS | ☑ | qa_full_test 84/84 PASS / 全画面エラー0 / 全59モーダルエラー0 / 277クリックファズ エラー0 / コア保存フロー（予定/タスク/メモ/家計）永続化確認 |
| 構文エラーゼロ | ☑ | scripts 1/1 OK、syntax-check pageerror=0 console.error=0 |
| HTML 構造の整合性 | ☑ | div バランス完全 |
| 押せないボタン / 行き先なし導線ゼロ | ☑ | modal-esc 61 モーダル / 0 失敗、auth-e2e 全 PASS |
| 横スクロール無し | ☑ | SE(375)/390/430 で docW===winW、22 画面で horizOverflow=false |

## 2. 実機検証

| 項目 | 状態 | 備考 |
|---|---|---|
| iPhone SE 幅で崩れない | ☐ | 要実機 |
| iPhone 13 幅で崩れない | ☐ | 要実機 |
| iPhone 15 Plus 幅で崩れない | ☐ | 要実機 |
| iPhone Pro Max 幅で崩れない | ☐ | 要実機 |
| セーフエリア / ノッチ対応 | ☑ | safe-area-inset 設定済 |
| Hoku 音声入力（Web Speech API）| ☐ | 端末依存、実機検証必須 |
| 入力欄の iOS ズーム抑止（font-size 16px+）| ☑ | 全入力 16px。SE幅で 15px だった .ob2-input を 16px に修正済（算出値 16px 確認） |
| 視認性（WCAG コントラスト）| ☑ | --text-muted を AA 水準（約3.5:1）へ。本文17:1 / 補助テキスト約10:1。プレースホルダはヒント重みに分離 |

## 3. データ / 保存

| 項目 | 状態 | 備考 |
|---|---|---|
| ログアウトでデータが消えない | ☑ | doLogout は loggedIn のみ変更 |
| リロード後のデータ復元 | ☑ | LocalStorage 永続化 |
| LocalStorage 容量対策 | ◐ | 圧縮・警告は storage-indexeddb-roadmap.md 参照 |
| データ書き出し / 読み込み | ☑ | 実装済み（手動バックアップ） |

## 4. 法務 / ストア要件

| 項目 | 状態 | 備考 |
|---|---|---|
| プライバシーポリシー | ◐ | docs/privacy-policy.md + .html 公開済み（v0.2）、専門家レビュー要 |
| 利用規約 | ◐ | docs/terms-of-use.md + .html 公開済み（v0.2）、専門家レビュー要 |
| 年齢区分 | ◐ | **4+** で確定推奨（暴力/性的/ギャンブル要素なし、サーバ介在の通信なし）。App Store Connect 入力時に確定 |
| カテゴリ | ◐ | プライマリ **仕事効率化** / セカンダリ **ライフスタイル** で確定推奨 |
| アプリ説明文 | ◐ | docs/app-store-metadata.md あり |
| スクリーンショット | ◐ | Playwright で各幅の取得が可能（デモデータ投入で実画面を撮影済み）。App Store 提出用の最終素材（1290×2796 等・キャプション付き）は実機/シミュレータ相当で要仕上げ |
| アプリアイコン | ◐ | docs/assets/app-icon/ に SVG 原本 + 全サイズ PNG（草案 v1）。最終はオーナー確認 |
| サポート URL / 連絡先 | ◐ | docs/support.html 作成済み（FAQ + 問い合わせ）。本番 URL は Pages 反映後 |

## 5. 技術 / 配信

| 項目 | 状態 | 備考 |
|---|---|---|
| iOS ラッパー（Capacitor / WKWebView）| ☐ | **Capacitor 推奨**（docs/ios-wrapper-decision.md）。本実装は要オーナー確認。PWA manifest.json 追加済み |
| TestFlight 配布 | ☐ | ラッパー後 |
| GitHub Pages 配信 | ☑ | Deploy from a branch で公開中（site live 確認済み）|
| オフライン動作 | ☑ | 単一 HTML / LocalStorage で完結 |

## 6. 課金 / 同期（v1.0 以降・要オーナー確認）

| 項目 | 状態 | 備考 |
|---|---|---|
| 課金（IAP）導線 | ◐ | s-premium 画面・Hoku制限・広告バナー・ストレージ誘導を実装済み。本決済は App Store IAP 連携が必要 |
| 本物のログイン | ☑ | **Wave 213 で完成**。Supabase Auth（メール+パス / OTP / Magic Link / Magic Link URL 貼付 / SIGNED_IN auto-enter / persistSession+autoRefreshToken / pkce flow / detectSessionInUrl / 日本語エラーハンドリング 9 種 / CDN 失敗時の即時ローカル fallback）。auth-e2e 10/10 PASS。**β 表記の見直しを審査前に検討** |
| 家族同期（Supabase 等）| ☑ | **実装済み**（Wave 219+）。fl_family_data テーブル + family_id で家族分マージ、Realtime（postgres_changes）で多端末リアルタイム反映、自己回復再接続・復帰時フェッチ。詳細 family-sync-fix.md。※運用前に Supabase 側 RLS（family_read）と Realtime パブリケーション追加の SQL 実行が必要（同 doc 記載） |
| ファミコイン経済（ログインボーナス/ショップ）| ☑ | Wave 250/251 実装。コイン残高・連続日数・ショップ購入はすべて端末内（LocalStorage）。外部送信なし。プレミアム導線として機能 |
| プッシュ通知 | ☐ | App Store 版で対応予定 |

## 7. 審査リスク

| リスク | 対策 |
|---|---|
| 機能が薄いと判断される | 8 機能 + Hoku AI で十分な価値density を確保済み |
| プライバシー説明不足 | プライバシーポリシー最終化 + データ取扱いの明示 |
| 外部カレンダー連携の誤認 | 「自動同期は今後対応」と正直に表記済み |
| WebView ラッパーのみで価値が薄いと判断 | ネイティブ機能（通知 / EventKit）を段階追加で補強 |

## 8. MVP 公開可否判断

現時点の結論：**iOS ラッパー実装 + IAP 本実装 + 実機検証 + 法務専門家レビュー**
が公開の必須残作業。プロダクト品質（コード・テスト 84/84）・メタデータ・アイコン・
法務文書草案・サポートページ・**Supabase Auth ログイン**・**家族データ同期（Realtime）**・
**視認性/iOS入力/aria** は整備済み。
次の優先：
1. iOS ラッパー実装（Capacitor 推奨・要オーナー確認）— App Store 配信の前提
2. IAP 本実装（月額480円/30日無料を StoreKit に接続。現状は β 表記で課金処理なし）— 要オーナー確認
3. 実機検証（4 デバイス幅 + 音声 + Magic Link / OTP + 2端末の家族同期）— 要実機
4. スクリーンショット最終素材の仕上げ（Playwright 撮影 → 提出サイズ/キャプション）
5. 法務専門家レビュー（docs/legal-review-notes.md に論点整理済み）
6. Supabase ダッシュボード側：RLS（family_read）+ Realtime パブリケーション SQL 実行、Site URL / Redirect URLs 設定（family-sync-fix.md / emailRedirectTo と一致）

関連決定ドキュメント：
- iOS ラッパー：`ios-wrapper-decision.md`
- Hoku API デプロイ：`hoku-api-deployment-decision.md`
- 法務レビュー論点：`legal-review-notes.md`
- 残タスク全体：`remaining-tasks.md`

---

*本チェックリストは MVP 公開準備の進捗管理用。オーナー確認が必要な項目（課金・*
*同期・ラッパー方式）は CLAUDE.md §7 に従い、本実装前に必ず確認を挟む。*
