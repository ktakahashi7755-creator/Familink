# Hoku スキン画像（Hokuショップ用）

Hokuショップ（着せ替え）で使用する画像をここに配置します。
`HOKU_SKINS` の `imageSrc` が参照するファイル名と一致させてください。

| skin id | ファイル名 | 説明 |
|---|---|---|
| normal  | （IMGS.hoku のBase64を使用・配置不要） | 通常Hoku |
| pajama  | pajama-hoku.png  | パジャマHoku |
| teacher | teacher-hoku.png | 先生Hoku |
| chef    | chef-hoku.png    | 料理Hoku |
| hero    | hero-hoku.png    | ヒーローHoku |
| space   | space-hoku.png   | 宇宙Hoku |

## 仕様
- 推奨：正方形・透過PNG・1x/2x相当（例 256〜512px）。Retinaで潰れないよう余裕を持たせる。
- 背景は透過。Hokuの世界観（やさしい黄色＋淡いブルー）に合わせる。
- 画像が無い／読み込めない場合は自動で通常Hoku（IMGS.hoku）にフォールバックするため、表示は崩れません。
- 公開用は `docs/assets/hoku/` に配置（GitHub Pages の `/Familink/assets/hoku/...` で配信）。
