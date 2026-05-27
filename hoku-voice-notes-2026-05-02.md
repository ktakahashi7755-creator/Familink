# Hoku 音声機能 — 技術ノート / デバッグ情報（Wave 14）

**最終更新：2026-05-02**
**対象バージョン：app-source/familink.html（Wave 14 以降）**

このドキュメントは、Hoku の音声入力機能の挙動・既知の制約・確認手順をまとめたものです。
家族テスト / TestFlight β / App Store 公開時に「音声が動かない」と報告を受けた際、本ドキュメントで切り分けてください。

---

## 1. 機能概要

- **目的**：マイクボタン（🎙）押下で音声を聞き取り、Hoku の入力欄にテキストを反映
- **API**：Web Speech API（`SpeechRecognition` / `webkitSpeechRecognition`）
- **外部 API 不使用** — Anthropic / OpenAI / Google Cloud Speech 等は呼び出さない
- **取得結果は端末から外部に送信しない**（OS / ブラウザ標準の音声サービスのみ）

---

## 2. サポート判定

```js
function hokuVoiceSupport() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
```

| 環境 | サポート判定 | 実際の動作 | 備考 |
|---|---|---|---|
| Chrome (PC/Android) | true | ◎ 安定動作 | Google サーバー経由 |
| Edge (PC) | true | ◎ 安定動作 | 同上 |
| Safari 16+ (macOS) | true | ◎ 動作 | macOS の音声認識 |
| **Safari (iOS 16+)** | true | △ 不安定 | API は露出するが認識結果が来ないケース多数（Apple のサービス側の制約） |
| Safari (iOS 14-15) | true | ❌ silent fail | onstart は呼ばれるが onresult が来ない |
| Firefox | false | — | API 未対応 |
| iOS Chrome / Edge | false | — | 内部 WebKit のため Safari と同じ動作 |

---

## 3. 状態遷移

```
[idle]
  ↓ マイクボタン押下
  ↓ サポート判定
  ├─ 非対応 → unsupported 状態 + バナー + テキスト入力フォーカス
  └─ 対応 → start() 呼び出し
       ↓
       ├─ 3 秒以内に onstart 呼ばれず → セーフティタイムアウト
       │    → abort() + idle + 案内 + テキスト入力フォーカス
       │
       ├─ onstart → listening 状態 + バナー「🎙 聞き取り中…」
       │    ↓
       │    ├─ onresult → transcript を入力欄にセット + toast
       │    │    → ユーザーが内容確認後に送信ボタンで Hoku 送信
       │    │
       │    ├─ onerror(not-allowed) → 権限拒否 案内
       │    ├─ onerror(no-speech)   → 聞き取れず 案内
       │    ├─ onerror(audio-capture) → マイクなし 案内
       │    ├─ onerror(network) → 通信エラー 案内
       │    ├─ onerror(service-not-allowed) → 認識サービス停止 案内
       │    └─ onerror(aborted) → ユーザー停止 / 通知不要
       │
       └─ onend → idle に戻る + バナー消す
```

---

## 4. 自動送信を行わない理由

- 音声認識の誤認識率は 5-15%（Web Speech API、日本語）
- 誤認識のまま自動送信すると Hoku の応答もずれる → ユーザー混乱
- **設計判断：認識結果は入力欄にセットするが、送信は明示的なタップに委ねる**
- toast で「聞き取りました：「〇〇」内容を確認して送信してください。」と案内

---

## 5. iPhone Safari での既知の制約

### 5.1 silent fail（最頻の症状）
- 症状：マイクボタン押下 → 何も起きない
- 原因候補：
  1. iOS Safari の Web Speech API バックエンドが応答しない（Apple サービス側）
  2. `start()` を呼んでも `onstart` / `onresult` / `onerror` のいずれも呼ばれない
  3. `onerror(network)` で即終了するケースもある
- **Wave 14 の対策**：3 秒セーフティタイムアウトで「開始できませんでした」と案内 + テキスト入力にフォーカス

### 5.2 ユーザージェスチャー要件
- iOS Safari は user gesture（タップ）の context でのみ `start()` を許可
- マイクボタン onclick から直接呼ぶため、現状の実装は満たしている

### 5.3 マイク権限ポップアップ
- 初回押下時に Safari がマイク許可ポップアップを表示
- 拒否されると `onerror('not-allowed')` または `'service-not-allowed'`
- 案内文：「マイクの使用が許可されていません。ブラウザ設定からマイクを許可してください（iPhone Safari の場合：設定 > Safari > マイク）。」

### 5.4 HTTPS 必須
- マイクは secure context のみで動作
- GitHub Pages は HTTPS なので OK
- `file://` で開いた場合は無効
- 実機テストは必ず https://ktakahashi7755-creator.github.io/Familink/ で

---

## 6. デバッグ手順

### 6.1 Safari Web Inspector で確認

1. Mac の Safari で「開発」メニュー > iPhone > Familink タブを選択
2. コンソールで以下を実行：

```js
// サポート判定
console.log('SR:', !!window.SpeechRecognition);
console.log('webkitSR:', !!window.webkitSpeechRecognition);
console.log('hokuVoiceSupport():', hokuVoiceSupport());

// 強制的に各状態を試す
hokuMicSetState('listening');   // バナー：聞き取り中
hokuMicSetState('unsupported'); // バナー：非対応
hokuMicSetState('idle');        // バナー消える

// マイクボタン直接呼び出し
hokuVoiceToggle();
```

### 6.2 期待される出力例

| 環境 | hokuVoiceSupport() | hokuVoiceToggle() の挙動 |
|---|---|---|
| Chrome PC | true | 権限ポップアップ → 聞き取り → 認識結果 |
| iOS Safari | true | 権限ポップアップ → onstart 来ない場合 3秒で案内 |
| Firefox | false | 即「非対応」バナー |

### 6.3 実機チェックリスト

- [ ] HTTPS で開いているか（`https://ktakahashi7755-creator.github.io/Familink/`）
- [ ] マイクボタン押下時に権限ポップアップが出るか
- [ ] 「聞き取り中…」バナーが表示されるか
- [ ] 話しかけた後 5-10 秒以内に文字が入力欄に入るか
- [ ] 何も起きない場合：3 秒後に「開始できませんでした」案内 + テキスト入力欄にフォーカス
- [ ] テキスト相談が引き続き使えるか

---

## 7. トラブルシューティング

| 症状 | 原因候補 | 対処 |
|---|---|---|
| ボタンが灰色 | サポート判定 false | 別ブラウザ or PC で確認 |
| 押しても何も起きない | iOS Safari バックエンド不調 | 3 秒タイムアウトでフォールバック発動するはず。発動しない場合はバグ |
| 「マイクが許可されていません」が出続ける | 権限拒否 | iPhone：設定 > Safari > マイク を確認 |
| 認識結果が短すぎる / 切れる | `interimResults: false` のため確定後のみ反映 | 短く話す / 区切って話す |
| 「聞き取れませんでした」連発 | マイク不調 / 周囲騒音 | 静かな環境でテスト |
| エラーが出ず固まる | Wave 14 の 3 秒タイムアウト未動作 | コード上は実装済 — 再現したら issue 報告 |

---

## 8. 今後の安定化に向けた課題

### 短期（v0.2 候補）
- **iPhone 実機での動作ログ収集**：ベータユーザー数家族で「音声が動いた / 動かなかった」をヒアリング
- **タイムアウト時間の実機調整**：3 秒で短すぎないか / 長すぎないか
- **「もう一度試す」ボタン追加**：失敗バナーの中に再試行ボタン

### 中期（v1.0 候補）
- **WKWebView ラッパー化**：iOS ネイティブの音声認識（`SFSpeechRecognizer`）を JS bridge 経由で呼べるようにする
  - Apple 公式 API のため iOS Safari より安定
  - ただし WKWebView アプリ化が前提
- **連続認識モード**（`continuous: true`）：長文を区切らずに認識
- **認識中のリアルタイム反映**（`interimResults: true`）：話しながら文字が増える UX

### 長期（v2.0+）
- **オフライン音声認識**：端末内 ML（Core ML / TensorFlow Lite）でプライバシー強化
  - 現状は Apple / Google サーバー経由で確実な privacy guarantee がない
- **多言語対応**：英語 / 中国語繁体字（`lang` 切替）

---

## 9. 設計トレードオフ

| 選択 | 採用理由 |
|---|---|
| Web Speech API のみ使用 | 外部 API 依存ゼロ / プライバシー設計と整合 |
| 自動送信しない | 誤認識による混乱回避 |
| 3 秒タイムアウト | iOS silent fail への保険 |
| 失敗時テキストフォーカス | 「押して動かない」体験を絶対回避 |
| 永続バナー | toast だけでは状態が伝わらない |

---

## 10. 関連コード

- `app-source/familink.html`
  - line ~7625-7800：Hoku 音声機能本体
  - line ~2500：マイクボタン HTML
  - line ~2510：音声ステータスバナー HTML
- `priority3-design-2026-05-02.md` §6：通知/リマインド設計
- `release-score-2026-05-02-wave14.md`：Wave 14 評点

---

**結論**：Wave 14 で「押しても何も起きない」は仕組み上ゼロにした。
ただし iPhone Safari での認識率は Apple サービス側の制約により不安定であり、
最終的な安定化には WKWebView 経由のネイティブ API 連携が必要。
