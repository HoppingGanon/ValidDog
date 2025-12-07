# ValidDog

OpenAPI仕様書に基づいてAPIレスポンスを検証するChrome拡張機能です。  
開いているページのネットワーク通信を監視し、OpenAPI仕様書に沿った動作となっているかを確認します。

## 開発環境

DevContainerを使用しています。

### セットアップ

1. VS Code または Cursor で本リポジトリを開く
2. 「Reopen in Container」を選択して DevContainer を起動

### Git SSH設定

以下のいずれかの方法でGit用のSSH鍵を設定できます：

- `.devcontainer/.ssh/` フォルダに秘密鍵を配置する
- DevContainer内で `ssh-keygen` を実行して鍵を生成する

## ディレクトリ構成

```
.
├── src/           # Chrome拡張機能のソースコード
├── test/          # テスト用ファイル群（詳細は test/README.md を参照）
├── dist/          # ビルド出力（npm run build で生成）
└── .devcontainer/ # 開発環境設定
```

## ビルド

```bash
npm install
npm run build
```

ビルド後、`dist/` フォルダをChromeの拡張機能として読み込んでください。

## テスト

テスト環境の詳細は [test/README.md](./test/README.md) を参照してください。

