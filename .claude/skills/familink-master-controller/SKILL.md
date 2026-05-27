---
name: familink-master-controller
description: 親スレッド / バックアップ番号 / 作業ログ / Git / worklog / 作業開始ルール / 作業終了ルール を管理する Skill。git status / コミット / プッシュ / 作業終了 / コミットして / 閉じて / 一区切り / 作業開始 / 再開 / 続き / iPhone 同期 / セッションまたぎ / worklog 追記 のときに必ず使う。
---

# familink-master-controller

セッション運用と Git / worklog のガードレール。

## 役割
- 作業開始 / 終了プロトコルの実行責任者
- worklog 追記の単一窓口
- コミット可否判定（`.claude/settings.local.json` 除外を含む）

## 参照すべき資料
- `CLAUDE.md` §1, §2, §5
- `docs/worklog.md`
- `docs/development-workflow.md`

## 作業開始時の必須手順
1. `git status`
2. `git log -1 --oneline`
3. `git fetch origin`（オフライン時は worklog にメモ）
4. `git status -sb`
5. `docs/worklog.md` の末尾エントリを確認
6. 【作業開始確認】を出力

## 作業終了時の必須手順
1. `git status`
2. 変更ファイル一覧
3. 変更内容要約
4. テスト結果（未実施なら理由明記）
5. 未確認事項
6. iPhone 確認ポイント
7. 次にやること
8. `docs/worklog.md` 追記
9. `.claude/settings.local.json` を除外したうえでコミット
10. `git rev-parse --short HEAD` でハッシュ取得
11. 【作業終了報告】を出力

## トリガー語
- 開始: 「作業開始」「再開」「続き」
- 終了: 「作業終了」「閉じて」「一区切り」「コミットして」

## やること
- 端末（PC / iPhone）の明示
- 端末またぎ前は必ず push
- worklog に env を記す
- コミット粒度をチェック（大きすぎたら分割提案）

## やらないこと
- `.claude/settings.local.json` のコミット
- 「fix」「update」だけのコミットメッセージ
- 未コミット状態でのセッション終了
- worklog 過去エントリの書き換え

## 作業前チェック
- 未コミット変更が `.claude/settings.local.json` 以外か
- 前回 worklog の「次にやること」を引き継いでいるか

## 作業後チェック
- worklog に新規エントリが追加されたか
- コミットメッセージが意味のある日本語/英語になっているか
- push したか（端末またぎ予定なら必須）

## テスト観点
- `git status` が clean か
- `git log -1` のハッシュが worklog と一致しているか

## バグ対応観点
- worklog で過去の同類バグを検索（`grep` を提案）
- 「いつから入ったか」を `git log` で特定

## iPhone 確認観点
- 端末またぎ後、iPhone 側で `git pull` 相当の同期がされたか
- worklog の最終エントリが iPhone から見えるか

## 出力形式（厳守）

【作業開始確認】
```
・現在のブランチ：
・最新コミット：
・未コミット変更：
・前回 worklog：
・今回の目的：
・変更予定ファイル：
・触らないファイル：
・完了条件：
・作業リスク：
・開始可否：
```

【作業終了報告】
```
・作業名：
・作業環境：PC / iPhone経由 / 不明
・変更ファイル：
・変更内容：
・テスト結果：
・未確認事項：
・iPhone確認ポイント：
・次にやること：
・worklog追記：
・コミット有無：
・コミットハッシュ：
・現在のgit status：
```

## レビューすべきポイント
- worklog に「次にやること」が空欄でないか
- 1 コミット = 1 論理単位 になっているか

## Claude Code への指示形式
- 「作業開始確認して」
- 「作業終了して。worklog 更新してコミットして」
- 「コミットして閉じて」
