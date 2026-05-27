# Familink 音声認識ロードマップ（Wave 26 / 2026-05-03）

**目的：** Familink の音声入力体験を、ChatGPT アプリ / Apple Watch Siri 級の「家族文脈理解」へ段階的に育てる戦略文書。
**対象 Wave：** v0.2（現在）→ v1.0 → v1.5

---

## 1. 現状（v0.2 / Wave 26 完了）

### 採用方式
- **Web Speech API**（`SpeechRecognition` / `webkitSpeechRecognition`）
- 言語：`ja-JP`
- 連続認識：オフ（`continuous=false`、`interimResults=false`）
- 端末内処理 / 外部送信なし
- 依存ライブラリゼロ

### Wave 26 で追加した家族文脈レイヤー
- **音声補正辞書**（`VOICE_MEMBER_ALIASES`、`VOICE_TERM_NORMALIZE`）
  - 家族メンバーの表記ゆれ吸収（パパ / お父さん / 太郎 / せいと / 星斗 等 → メンバー id 解決）
  - 子育て用語の正規化（たいそうふく → 体操服、しょうにか → 小児科 等）
- **音声意図抽出器**（`parseVoiceIntent`）
  - カテゴリ分類（カレンダー / タスク / 準備 / 家計 / 体調 / 家族ボード）
  - 日付（今日 / 明日 / 月曜 / 5月3日）
  - 時刻（18時 / 18:30 / 朝 / 夕方）
  - 金額（3200円 / 1万円）
  - 体温（37.8度 / 37度8分）
  - メンバー解決
- **保存前確認モーダル**（`m-voice-confirm`）
  - 認識テキスト + 補正後テキスト表示
  - 登録先 / メンバー / タイトル / 日付 / 時刻 / 金額 / 体温 / メモ を編集可
  - 「追加する / 手入力に切り替える / キャンセル」
  - 即保存しない（誤認識による不正登録を防ぐ）
- **状態マシン**（idle → listening → thinking → confirming → saved / error）
- **失敗 UX**（マイク許可案内、再試行、手入力フォールバック）
- **サンプルコマンド表示**（短文話法ガイド）

### 制約
- Web Speech API は iPhone Safari で部分的にサポート（OS バージョン依存）
- 連続認識・話者分離・ノイズ耐性は限定的
- 音声データはブラウザ実装に依存（一部実装は Google サーバー経由）

---

## 2. v0.2（現在）の音声 UX 改善方針

| 観点 | 内容 |
|---|---|
| プライバシー | 端末内処理を明記（モーダル下部に「外部送信なし」と表示）|
| 状態可視化 | idle / listening / thinking / confirming / saved / error の 6 状態 |
| 補正 | Familink 専用辞書（家族名 + 子育て用語）|
| 確認 | 必ず保存前確認モーダルを挟む |
| 修正 | 全フィールド編集可 / カテゴリ変更可 / メンバー変更可 |
| 失敗時 | 原因表示 + 再試行 + 手入力切替 |
| ガイド | 「短く話すと正確です」+ 4 例の常時表示 |

### 残課題（v0.2 内で対応可能）
- 体調メモの「咳」「鼻水」など症状語からの自動 cond 入力
- 家計カテゴリ（食費 / 交通費 / 日用品）の自動推定強化
- 「明日のスイミング」のような 2 トークン文の精度向上
- iPhone 実機での 5 ペルソナ別動作検証

---

## 3. v1.0（公開後 90 日）— Apple Speech Framework 連携

### 構成
```
WKWebView ラッパー（Swift）
  ├─ ボタン押下 → JS bridge: nativeStartVoiceRecording()
  ├─ Swift 側で AVAudioSession + SFSpeechRecognizer
  ├─ オンデバイス認識（requiresOnDeviceRecognition = true / 端末対応時）
  ├─ 結果を JS へ返す: webView.evaluateJavaScript('hokuHandleVoiceText("...")')
  └─ Familink 既存 parseVoiceIntent → 確認モーダルへ
```

### 利点
- ja-JP 認識精度の向上（Apple のオンデバイス Whisper 系モデル）
- オフライン動作対応（端末ニューラルエンジン使用時）
- バックグラウンドノイズ耐性
- ユーザー音声データは端末から外に出ない（オンデバイス時）

### 必要な作業
- WKWebView ラッパーアプリ作成（既に Roadmap で計画済）
- `Info.plist` に `NSSpeechRecognitionUsageDescription` / `NSMicrophoneUsageDescription` を追加
- JS 側に `nativeVoiceAvailable()` / `nativeStartVoiceRecording()` の bridge 受信窓口
- `hokuVoiceToggle` を nativeVoice 優先 → Web Speech API フォールバックに変更

### プライバシー文言（追加予定）
- 「音声は端末内で処理されます。一部の認識はオンデバイス AI を使用します」
- App Store プライバシー表示：「音声データを収集しない」

---

## 4. v1.5（公開後 6〜9 ヶ月）— OpenAI gpt-4o-transcribe 連携（プレミアム機能）

### 採用条件
- ユーザーがプレミアム会員（月額 480 円以上）
- ユーザーが「Hoku 高精度音声入力」をオンに設定
- プライバシー同意（同意 UI で説明）

### 構成
```
端末で録音（最大 30 秒 / 単発）
  ↓
プレミアム会員かつ高精度モードがオン
  ↓
Familink バックエンド（Cloudflare Worker 等）
  ↓
OpenAI Audio API（gpt-4o-transcribe / gpt-4o-mini-transcribe）
  ↓
高精度テキスト
  ↓
Hoku が家族文脈で補正（既存 voiceCorrectText + parseVoiceIntent）
  ↓
保存前確認モーダル
```

### 採用基準（gpt-4o-mini-transcribe vs gpt-4o-transcribe）
- 通常：mini（コスト効率）
- 騒音環境 / 複雑な発話 / 家族複数同時：full

### 必要な作業
- Familink バックエンド（音声中継のみ。永続保存しない）
- OpenAI API キー管理（サーバー側）
- ユーザーごとの利用量制限（月 N 回 / プレミアムのみ）
- プライバシーポリシー更新（外部送信先・保管期間）
- 法務確認（個人情報保護法 / 音声データの取扱）

### 法務確認事項（v1.5 着手前にチェック）
- 音声データの送信先（OpenAI / 米国）
- 子どもの音声を含む可能性 → 保護者同意プロセス
- 一時送信 vs 永続保存の明文化（永続保存しない方針）
- App Store / Google Play のプライバシー宣言更新
- GDPR / 個人情報保護法準拠（特にメディア記録の処理）

---

## 5. ハイブリッド戦略（v1.5 以降の理想形）

```
ユーザーが音声ボタンを押す
  ↓
端末判定
  ├─ iPhone (WKWebView 版) → Apple Speech Framework
  └─ Web ブラウザ → Web Speech API
  ↓
認識結果が低信頼 or ユーザーが「もっと正確に」を選ぶ
  ↓
プレミアム会員 + 高精度モード ON?
  ├─ Yes → OpenAI gpt-4o-transcribe で再認識
  └─ No  → そのまま Hoku 補正
  ↓
parseVoiceIntent で家族文脈解析
  ↓
保存前確認モーダル
  ↓
LocalStorage / クラウド同期へ保存
```

### 切替判定指標
- Web Speech API：信頼度 ≥ 0.7 で確定
- 信頼度 < 0.7 かつプレミアム → クラウド再認識
- 信頼度 < 0.7 かつ無料 → 「再録音」プロンプト

---

## 6. プレミアム機能としての位置付け

### 無料プラン
- Web Speech API（端末内 / Apple Speech Framework）
- 短文家族文脈解析
- 保存前確認

### プレミアム（月額 480 円）
- 高精度音声入力（OpenAI gpt-4o-transcribe）
- 連続発話 → 自動分割
- ノイズキャンセル
- 騒音環境対応

### 上位プラン候補（680 / 980 円）
- リアルタイム家族会議メモ（複数話者識別）
- 朝の段取り音声サマリー（Hoku が読み上げ）
- 音声 → 家計レシート自動振り分け

---

## 7. プライバシー・セキュリティ設計

### 大原則
- **家族の声は商品ではない**
- ユーザーが明示同意した場合以外、音声は端末から出さない
- クラウド送信時も「一時通過」のみ。永続保存しない
- 子どもの音声は保護者管理下でのみ利用

### 実装上のガード
- 音声データを LocalStorage に保存しない
- 音声 Blob を URL.createObjectURL で生成した場合は即 revoke
- マイク使用後は track.stop() で確実に解放
- プレミアム高精度モードの On/Off 状態をユーザーが自分で確認できる UI

### App Store プライバシー表示（予定）
- 音声録音：使用するが、送信しない
- プレミアム時のみ：一時的にサーバー経由（永続保存なし）
- 第三者共有：なし

---

## 8. 検証指標

| 観点 | 指標 | 目標値 |
|---|---|---|
| 精度 | 短文（5 トークン以内）の正解率 | v0.2: 70% / v1.0: 85% / v1.5: 95% |
| 速度 | 録音終了→確認モーダル表示まで | < 2 秒 |
| 失敗時 | リカバリ率（再試行 or 手入力で完了） | 95% |
| 確認 UX | 確認モーダルでの編集後保存率 | > 90% |
| プライバシー | 音声データ外部送信件数（プレミアム以外）| 0 |

---

## 9. v0.2 実装の自己評価

### 達成
- ✅ 端末依存ゼロで家族文脈解析を実現
- ✅ 即保存しない安全設計
- ✅ 全フィールド編集可
- ✅ 6 状態のフィードバック
- ✅ 4 例の短文ガイド常時表示
- ✅ 失敗時の手入力フォールバック
- ✅ 既存 LocalStorage 構造を変更せず

### 限界（既知）
- 連続発話の自動分割は未対応
- 信頼度スコアの閾値判定は未対応（Web Speech API が confidence を提供しない実装が多い）
- 騒音環境での精度は端末ブラウザ次第

### 次の Wave 候補
- Wave 27 : iPhone 実機での音声 UX 検証 + 体調メモの症状語自動入力
- Wave 28 : 連続発話 → 複数項目自動分割
- WKWebView 化フェーズ（v1.0）：Apple Speech Framework 連携

---

## 10. まとめ

**Familink の音声入力は「単なる文字起こし」ではなく「家族運営をラクにするコマンド」を目指す。**

v0.2 では依存ゼロで Familink 専用文脈解析を実現し、v1.0 で Apple Speech Framework に乗り換え、v1.5 でプレミアム会員向けに OpenAI gpt-4o-transcribe を選択導入する。

最終目標：
> 「親が片手で 3 秒話すだけで、家族の予定・準備・お金・体調が整う」

ユニコーン化に向け、家族向け音声 AI として競合不在のポジションを確立する。
