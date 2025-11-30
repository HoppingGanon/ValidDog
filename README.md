# ValidKun - OpenAPI Validator

OpenAPI仕様書に基づいてリクエスト/レスポンスをバリデーションするWebアプリケーションです。

## 機能

- OpenAPI仕様書（YAML/JSON）の読み込みとLocalStorageへの保存
- リクエストURLの自動パスマッチング
  - フルURL（`https://example.com/users/123?key=value`）とパスのみ（`/users/123`）の両方に対応
  - クエリパラメータは自動的に除去され、パス部分のみでマッチング
- リクエストボディのバリデーション
- レスポンスボディのバリデーション
- TypeScriptによる型安全な実装
- モダンでレスポンシブなUI

## セットアップ

### 依存関係のインストール

```bash
npm install
```

### ビルド

```bash
npm run build
```

### クリーンビルド

```bash
npm run rebuild
```

### プレビュー（簡易サーバー起動）

```bash
npm run preview
```

ビルド後、http://localhost:8080 でアプリケーションにアクセスできます。

### 開発モード（ウォッチモード）

```bash
npm run dev
```

### 型チェック

```bash
npm run type-check
```

### リント

```bash
npm run lint
```

## 使い方

### 1. アプリケーションを起動

ビルド後、簡易HTTPサーバーを起動：

```bash
npm run preview
```

ブラウザで http://localhost:8080 にアクセスします。

### 2. OpenAPI仕様書を読み込む

- 「ファイルを選択」ボタンをクリック
- OpenAPI仕様書（YAML/JSON）を選択
- 仕様書は自動的にLocalStorageに保存されます
- サンプル仕様書: `sample-api.yaml` が用意されています

### 3. リクエスト/レスポンスを検証

以下の情報を入力：
- **リクエストURL**: パスのみ、またはフルURLで入力可能
  - パスのみ: `/users/123`
  - フルURL: `https://example.com/users/123?key=value`
  - クエリパラメータは自動的に除去され、パス部分だけがマッチングに使用されます
- **HTTPメソッド**: GET, POST, PUT, PATCH, DELETE
- **リクエストボディ**: JSON形式（POSTやPUTの場合）
- **レスポンスボディ**: JSON形式
- **ステータスコード**: 例 200, 201, 404

### 4. 検証実行

「検証」ボタンをクリックすると、以下を自動的に実行：
- URLパターンのマッチング
- リクエストボディのスキーマ検証
- レスポンスボディのスキーマ検証

### サンプルテストケース

`sample-api.yaml` を使用したテスト例：

**例1: GET /users/123**
- リクエストURL: `/users/123` または `https://api.example.com/users/123`
- HTTPメソッド: `GET`
- レスポンスボディ:
```json
{
  "id": 123,
  "name": "山田太郎",
  "email": "yamada@example.com"
}
```
- ステータスコード: `200`

**例2: POST /users**
- リクエストURL: `/users`
- HTTPメソッド: `POST`
- リクエストボディ:
```json
{
  "name": "佐藤花子",
  "email": "sato@example.com",
  "age": 25
}
```
- レスポンスボディ:
```json
{
  "id": 456,
  "name": "佐藤花子",
  "email": "sato@example.com",
  "age": 25
}
```
- ステータスコード: `201`

## 技術スタック

- **TypeScript**: 型安全なコード
- **Rollup**: モジュールバンドラー
- **ESLint**: コード品質チェック
- **js-yaml**: YAML/JSONパーサー
- **LocalStorage**: 仕様書の永続化

## プロジェクト構造

```
validkun/
├── src/
│   ├── main.ts           # エントリーポイント
│   ├── types.ts          # 型定義
│   ├── storage.ts        # LocalStorage操作
│   ├── fileLoader.ts     # ファイル読み込み
│   ├── pathMatcher.ts    # パスマッチング
│   ├── validator.ts      # バリデーションロジック
│   └── ui.ts             # UI操作
├── dist/                 # ビルド出力
├── index.html            # メインHTML
├── styles.css            # スタイルシート
├── package.json
├── tsconfig.json
├── rollup.config.js
└── .eslintrc.json
```

## 注意事項

- `$ref` による参照解決には対応していません
- OpenAPI 2.0 (Swagger) および OpenAPI 3.x に対応しています
- バリデーションは基本的なスキーマチェックのみを行います

## ライセンス

MIT

