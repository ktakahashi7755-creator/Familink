# ストレージ拡張ロードマップ — LocalStorage → IndexedDB → クラウド

Familink は現在すべてのデータを LocalStorage（key: `familink_v3`）に保存している。
写真・書類が増えると容量限界に達するため、段階的な拡張方針を定める。

---

## 1. 現状の保存方式と限界

- 保存先：LocalStorage 単一キー `familink_v3` に S オブジェクト全体を JSON 化
- 写真（アルバム）・書類（書類保管庫）は **base64 文字列** として S に格納
- LocalStorage の実効上限：ブラウザ依存でおよそ 5MB（iOS Safari は特に厳しい）

### base64 保存のリスク
- 画像 1 枚 = 数百 KB〜数 MB。base64 化で約 1.33 倍に膨張
- 写真を数十枚保存すると上限超過 → `QuotaExceededError` で **保存全体が失敗**
- S 全体を 1 キーに入れているため、写真肥大が予定・家計など全データの保存を巻き込む

---

## 2. 短期対策（v0.2 — 現構成のまま）

- **画像圧縮**：アップロード時に Canvas で長辺を縮小（例：長辺 1280px）+ JPEG 品質 0.7
- **容量警告**：保存前に概算サイズを計算し、上限接近時に警告表示
- **保存失敗 UX**：`QuotaExceededError` を捕捉し、「写真が多すぎます。整理してください」と案内
- 既存のストレージ管理画面（容量整理 UI）を活かす

## 3. 中期対策（v0.5 — IndexedDB 分離）

- 写真・書類の **本体（base64 / Blob）を IndexedDB に移動**
- LocalStorage（S）には **メタデータのみ**残す（id / タイトル / 撮影日 / IndexedDB キー）
- IndexedDB は数百 MB〜GB 級まで保存可能、容量問題を実質解消
- 依存ライブラリなしで `indexedDB` API を直接利用（単一 HTML 構成を維持）
- マイグレーション：起動時に S 内の base64 写真を検出 → IndexedDB へ移送 → S はメタのみに

データ構造案：
```
LocalStorage familink_v3 → S.albumPhotos[i] = { id, caption, takenAt, memberId, idbKey }
IndexedDB    familink_media → { idbKey → Blob }
```

## 4. 長期対策（v1.0+ — クラウド Storage）

- App Store 版 + Supabase Storage（または同等）へ写真・書類をアップロード
- バケット：`album` / `documents`、パスは `{family_id}/{record_id}/{filename}`
- 家族単位の Storage ポリシーでアクセス制御
- 端末はサムネイルのみキャッシュ、本体はクラウド
- オフライン時は IndexedDB をローカルキャッシュとして併用

---

## 5. 移行設計の原則

- 移行は**非破壊**：失敗時に元データを消さない
- 段階移行：LocalStorage → IndexedDB → クラウド の順、各段で後方互換読取
- メタデータの id は一貫保持（移行先で idbKey / storagePath を追加するだけ）
- 移行進捗を S に記録（`S.mediaMigration` 等、追加時は PERSIST 登録）

## 6. 容量警告 / 保存失敗 UX 指針

| 状況 | 挙動 |
|---|---|
| 残容量 80% 接近 | 黄色バナー「容量が少なくなっています」 |
| 残容量 95% 接近 | 赤バナー + 整理導線 |
| 保存失敗（Quota超過） | モーダル「保存できませんでした。写真を整理してください」+ ストレージ管理へ誘導 |

## 7. App Store 版での方針

- IndexedDB はそのまま利用可（WKWebView 対応）
- クラウド Storage 連携はプレミアム機能候補
- 写真の端末ローカルバックアップ（書き出し）も提供

---

## 8. 実装優先度

| 対策 | バージョン | 優先度 | リスク |
|---|---|---|---|
| 画像圧縮 | v0.2 | A | 低（既存フローに圧縮を挿入するだけ） |
| 容量警告 / 失敗 UX | v0.2 | A | 低 |
| IndexedDB 分離 | v0.5 | B | 中（マイグレーション要） |
| クラウド Storage | v1.0+ | C | 高（バックエンド要・要オーナー確認） |

※ IndexedDB 分離・クラウド Storage は LocalStorage 構造に関わるため、
着手前にオーナー確認を必須とする（CLAUDE.md §7 準拠）。
