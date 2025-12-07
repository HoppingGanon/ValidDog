/**
 * 共通テストケース定義
 * 
 * このファイルはブラウザ（test.html）とNode.js（api-test.js）の両方で使用されます。
 * テストケースを一元管理することで、両プラットフォームで同一のテストを実行できます。
 */

// =============================================================================
// 定数
// =============================================================================
export const SAMPLE_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
export const SAMPLE_POST_ID = 1;
export const SAMPLE_COMMENT_ID = '660e8400-e29b-41d4-a716-446655440001';
export const SAMPLE_UUID = '770e8400-e29b-41d4-a716-446655440002';

// デフォルトのベースURL（各プラットフォームで上書き可能）
export const DEFAULT_BASE_URL = 'http://localhost:3001';

// =============================================================================
// テストケース定義
// =============================================================================

/**
 * Users API テストケース
 */
export const usersTests = [
  {
    title: 'GET /users',
    method: 'GET',
    path: '/users',
    body: null,
    desc: 'ユーザー一覧取得',
  },
  {
    title: 'GET /users (query)',
    method: 'GET',
    path: '/users?page=1&limit=10&status=active&sort=name',
    body: null,
    desc: 'ユーザー一覧（フィルタ付き）',
  },
  {
    title: 'GET /users/:id',
    method: 'GET',
    path: `/users/${SAMPLE_USER_ID}`,
    body: null,
    desc: 'ユーザー詳細取得',
  },
  {
    title: 'GET /users/:id (details)',
    method: 'GET',
    path: `/users/${SAMPLE_USER_ID}?includeDetails=true`,
    body: null,
    desc: 'ユーザー詳細（詳細情報込み）',
  },
  {
    title: 'POST /users',
    method: 'POST',
    path: '/users',
    body: {
      email: 'newuser@example.com',
      name: '新規ユーザー',
      password: 'password123',
      age: 28,
      phoneNumber: '+819099998888',
      address: { postalCode: '150-0001', prefecture: '東京都', city: '渋谷区', street: '渋谷1-1-1' },
      tags: ['新規', 'テスト'],
    },
    desc: 'ユーザー作成',
  },
  {
    title: 'PUT /users/:id',
    method: 'PUT',
    path: `/users/${SAMPLE_USER_ID}`,
    body: {
      email: 'updated@example.com',
      name: '更新された名前',
      age: 31,
      phoneNumber: '+819012345678',
      address: { postalCode: '100-0001', prefecture: '東京都', city: '千代田区', street: '丸の内2-2-2' },
      status: 'active',
      preferences: { newsletter: false, language: 'en', timezone: 'UTC' },
    },
    desc: 'ユーザー更新（完全置換）',
  },
  {
    title: 'PATCH /users/:id',
    method: 'PATCH',
    path: `/users/${SAMPLE_USER_ID}?notifyUser=true`,
    body: {
      name: '部分更新された名前',
      status: 'inactive',
    },
    desc: 'ユーザー部分更新',
  },
  {
    title: 'PATCH /users/:id/profile',
    method: 'PATCH',
    path: `/users/${SAMPLE_USER_ID}/profile`,
    body: {
      bio: '更新されたプロフィール',
      avatarUrl: 'https://example.com/new-avatar.png',
      socialLinks: { twitter: '@updated_user', github: 'updated-github' },
      skills: ['JavaScript', 'TypeScript', 'Node.js', 'React'],
    },
    desc: 'プロフィール更新',
  },
  {
    title: 'DELETE /users/:id',
    method: 'DELETE',
    path: `/users/${SAMPLE_USER_ID}?permanent=false&reason=テスト削除`,
    body: null,
    desc: 'ユーザー削除（論理削除）',
  },
];

/**
 * Posts API テストケース
 */
export const postsTests = [
  {
    title: 'POST /posts',
    method: 'POST',
    path: '/posts',
    // bodyにdate-timeが含まれる場合は関数として定義
    getBody: () => ({
      title: '新しい投稿タイトル',
      content: 'これは新しい投稿の内容です。',
      authorId: SAMPLE_USER_ID,
      categoryIds: [1, 2, 3],
      metadata: { readingTime: 10, keywords: ['テスト', '新規'], featured: true },
      publishedAt: new Date().toISOString(),
    }),
    desc: '投稿作成',
  },
  {
    title: 'POST /posts (draft)',
    method: 'POST',
    path: '/posts?draft=true',
    body: {
      title: '下書きタイトル',
      content: '下書きの内容です',
      authorId: SAMPLE_USER_ID,
    },
    desc: '投稿作成（下書き）',
  },
  {
    title: 'PUT /posts/:id',
    method: 'PUT',
    path: `/posts/${SAMPLE_POST_ID}`,
    body: {
      title: '更新されたタイトル',
      content: '更新された内容です',
      categoryIds: [4, 5],
      metadata: { readingTime: 15, keywords: ['更新済み'], featured: false },
      status: 'published',
    },
    desc: '投稿更新（完全置換）',
  },
  {
    title: 'PATCH /posts/:id/status',
    method: 'PATCH',
    path: `/posts/${SAMPLE_POST_ID}/status?reason=テスト変更`,
    body: {
      status: 'archived',
      comment: 'アーカイブに変更',
    },
    desc: '投稿ステータス更新',
  },
  {
    title: 'DELETE /posts/:postId/comments/:commentId',
    method: 'DELETE',
    path: `/posts/${SAMPLE_POST_ID}/comments/${SAMPLE_COMMENT_ID}?notifyAuthor=true`,
    body: null,
    desc: 'コメント削除',
  },
  {
    title: 'DELETE /posts/:id',
    method: 'DELETE',
    path: `/posts/${SAMPLE_POST_ID}`,
    body: null,
    desc: '投稿削除',
  },
];

/**
 * ヘッダーバリデーション テストケース
 */
export const headerTests = [
  // === 必須/任意ヘッダーテスト ===
  {
    title: 'GET /header/hissu (valid)',
    method: 'GET',
    path: '/header/hissu',
    headers: {
      'aaa-req-hitsuyou': 'required-value',
      'aaa-req-nini': 'optional-value',
    },
    body: null,
    desc: 'ヘッダー必須/任意テスト（正常系）',
  },
  {
    title: 'GET /header/hissu (required only)',
    method: 'GET',
    path: '/header/hissu',
    headers: {
      'aaa-req-hitsuyou': 'required-value',
    },
    body: null,
    desc: 'ヘッダー必須のみ（任意ヘッダー省略）',
  },
  {
    title: 'GET /header/hissu (missing required)',
    method: 'GET',
    path: '/header/hissu',
    headers: {
      'aaa-req-nini': 'optional-only',
    },
    body: null,
    desc: 'ヘッダー必須欠落（エラー想定）',
  },
  {
    title: 'GET /header/hissu (no headers)',
    method: 'GET',
    path: '/header/hissu',
    headers: {},
    body: null,
    desc: 'ヘッダーなし（エラー想定）',
  },

  // === UUIDフォーマットヘッダーテスト ===
  {
    title: 'GET /header/uuid (valid)',
    method: 'GET',
    path: '/header/uuid',
    headers: {
      'aaa-req-uuid': SAMPLE_UUID,
    },
    body: null,
    desc: 'UUIDヘッダーテスト（正常系）',
  },
  {
    title: 'GET /header/uuid (invalid format)',
    method: 'GET',
    path: '/header/uuid',
    headers: {
      'aaa-req-uuid': 'not-a-uuid',
    },
    body: null,
    desc: 'UUIDヘッダーテスト（不正フォーマット）',
  },
  {
    title: 'GET /header/uuid (empty)',
    method: 'GET',
    path: '/header/uuid',
    headers: {
      'aaa-req-uuid': '',
    },
    body: null,
    desc: 'UUIDヘッダーテスト（空文字）',
  },

  // === 正規表現ヘッダーテスト ===
  {
    title: 'GET /header/regexp (valid)',
    method: 'GET',
    path: '/header/regexp',
    headers: {
      'aaa-req-regexp': 'ABC-123',
    },
    body: null,
    desc: '正規表現ヘッダーテスト（正常系: ABC-数字3桁）',
  },
  {
    title: 'GET /header/regexp (invalid pattern)',
    method: 'GET',
    path: '/header/regexp',
    headers: {
      'aaa-req-regexp': 'XYZ-456',
    },
    body: null,
    desc: '正規表現ヘッダーテスト（パターン不一致）',
  },
  {
    title: 'GET /header/regexp (wrong length)',
    method: 'GET',
    path: '/header/regexp',
    headers: {
      'aaa-req-regexp': 'ABC-12',
    },
    body: null,
    desc: '正規表現ヘッダーテスト（桁数不足）',
  },

  // === date-timeヘッダーテスト ===
  {
    title: 'GET /header/datetime (valid)',
    method: 'GET',
    path: '/header/datetime',
    getHeaders: () => ({
      'aaa-req-datetime': new Date().toISOString(),
    }),
    body: null,
    desc: 'date-timeヘッダーテスト（正常系）',
  },
  {
    title: 'GET /header/datetime (valid fixed)',
    method: 'GET',
    path: '/header/datetime',
    headers: {
      'aaa-req-datetime': '2024-12-07T10:30:00Z',
    },
    body: null,
    desc: 'date-timeヘッダーテスト（固定日時）',
  },
  {
    title: 'GET /header/datetime (invalid format)',
    method: 'GET',
    path: '/header/datetime',
    headers: {
      'aaa-req-datetime': '2024-12-07',
    },
    body: null,
    desc: 'date-timeヘッダーテスト（日付のみ）',
  },
  {
    title: 'GET /header/datetime (invalid string)',
    method: 'GET',
    path: '/header/datetime',
    headers: {
      'aaa-req-datetime': 'not-a-datetime',
    },
    body: null,
    desc: 'date-timeヘッダーテスト（不正文字列）',
  },
];

/**
 * パスパラメータバリデーション テストケース
 */
export const pathParamTests = [
  // === UUIDパスパラメータテスト ===
  {
    title: 'GET /path/uuid/:uuid (valid)',
    method: 'GET',
    path: `/path/uuid/${SAMPLE_UUID}`,
    body: null,
    desc: 'UUIDパスパラメータテスト（正常系）',
  },
  {
    title: 'GET /path/uuid/:uuid (invalid)',
    method: 'GET',
    path: '/path/uuid/not-a-valid-uuid',
    body: null,
    desc: 'UUIDパスパラメータテスト（不正フォーマット）',
  },
  {
    title: 'GET /path/uuid/:uuid (short)',
    method: 'GET',
    path: '/path/uuid/12345',
    body: null,
    desc: 'UUIDパスパラメータテスト（短すぎる値）',
  },

  // === 正規表現パスパラメータテスト ===
  {
    title: 'GET /path/regexp/:code (valid)',
    method: 'GET',
    path: '/path/regexp/ITEM-1234',
    body: null,
    desc: '正規表現パスパラメータテスト（正常系: ITEM-数字4桁）',
  },
  {
    title: 'GET /path/regexp/:code (invalid prefix)',
    method: 'GET',
    path: '/path/regexp/PROD-1234',
    body: null,
    desc: '正規表現パスパラメータテスト（プレフィックス不一致）',
  },
  {
    title: 'GET /path/regexp/:code (wrong length)',
    method: 'GET',
    path: '/path/regexp/ITEM-12',
    body: null,
    desc: '正規表現パスパラメータテスト（桁数不足）',
  },
  {
    title: 'GET /path/regexp/:code (letters)',
    method: 'GET',
    path: '/path/regexp/ITEM-ABCD',
    body: null,
    desc: '正規表現パスパラメータテスト（数字ではなく英字）',
  },

  // === date-timeパスパラメータテスト ===
  {
    title: 'GET /path/datetime/:datetime (valid)',
    method: 'GET',
    path: `/path/datetime/${encodeURIComponent('2024-12-07T10:30:00Z')}`,
    body: null,
    desc: 'date-timeパスパラメータテスト（正常系）',
  },
  {
    title: 'GET /path/datetime/:datetime (invalid)',
    method: 'GET',
    path: '/path/datetime/not-a-datetime',
    body: null,
    desc: 'date-timeパスパラメータテスト（不正形式）',
  },
  {
    title: 'GET /path/datetime/:datetime (date only)',
    method: 'GET',
    path: '/path/datetime/2024-12-07',
    body: null,
    desc: 'date-timeパスパラメータテスト（日付のみ）',
  },

  // === URIエンコーディングパスパラメータテスト ===
  {
    title: 'GET /path/encoded/:text (japanese)',
    method: 'GET',
    path: `/path/encoded/${encodeURIComponent('日本語テスト')}`,
    body: null,
    desc: 'URIエンコーディングテスト（日本語）',
  },
  {
    title: 'GET /path/encoded/:text (emoji)',
    method: 'GET',
    path: `/path/encoded/${encodeURIComponent('絵文字🎉テスト')}`,
    body: null,
    desc: 'URIエンコーディングテスト（絵文字含む）',
  },
  {
    title: 'GET /path/encoded/:text (special chars)',
    method: 'GET',
    path: `/path/encoded/${encodeURIComponent('特殊文字!@#$%^&*()')}`,
    body: null,
    desc: 'URIエンコーディングテスト（特殊文字）',
  },
  {
    title: 'GET /path/encoded/:text (mixed)',
    method: 'GET',
    path: `/path/encoded/${encodeURIComponent('日本語 & English 混在テスト')}`,
    body: null,
    desc: 'URIエンコーディングテスト（日本語と英語混在）',
  },
  {
    title: 'GET /path/encoded/:text (spaces)',
    method: 'GET',
    path: `/path/encoded/${encodeURIComponent('スペース 区切り テスト')}`,
    body: null,
    desc: 'URIエンコーディングテスト（スペース含む）',
  },
  {
    title: 'GET /path/encoded/:text (ascii)',
    method: 'GET',
    path: '/path/encoded/simple-ascii-text',
    body: null,
    desc: 'URIエンコーディングテスト（ASCIIのみ）',
  },

  // === 整数パスパラメータテスト ===
  {
    title: 'GET /path/integer/:num (valid)',
    method: 'GET',
    path: '/path/integer/42',
    body: null,
    desc: '整数パスパラメータテスト（正常系）',
  },
  {
    title: 'GET /path/integer/:num (max)',
    method: 'GET',
    path: '/path/integer/9999',
    body: null,
    desc: '整数パスパラメータテスト（最大値）',
  },
  {
    title: 'GET /path/integer/:num (min)',
    method: 'GET',
    path: '/path/integer/1',
    body: null,
    desc: '整数パスパラメータテスト（最小値）',
  },
  {
    title: 'GET /path/integer/:num (zero)',
    method: 'GET',
    path: '/path/integer/0',
    body: null,
    desc: '整数パスパラメータテスト（範囲外: 0）',
  },
  {
    title: 'GET /path/integer/:num (over max)',
    method: 'GET',
    path: '/path/integer/10000',
    body: null,
    desc: '整数パスパラメータテスト（範囲外: 10000）',
  },
  {
    title: 'GET /path/integer/:num (negative)',
    method: 'GET',
    path: '/path/integer/-1',
    body: null,
    desc: '整数パスパラメータテスト（負の値）',
  },
  {
    title: 'GET /path/integer/:num (string)',
    method: 'GET',
    path: '/path/integer/abc',
    body: null,
    desc: '整数パスパラメータテスト（文字列）',
  },
];

/**
 * エラーケース テストケース
 */
export const errorTests = [
  // 存在しないリソース
  {
    title: 'GET /helloworld (404)',
    method: 'GET',
    path: '/helloworld',
    body: null,
    desc: '存在しないパス',
  },
  {
    title: 'GET /users/:id (not found)',
    method: 'GET',
    path: '/users/00000000-0000-0000-0000-000000000000',
    body: null,
    desc: '存在しないユーザー',
  },
  {
    title: 'PUT /posts/:id (not found)',
    method: 'PUT',
    path: '/posts/99999',
    body: { title: 'タイトル', content: '内容' },
    desc: '存在しない投稿の更新',
  },

  // 必須項目不足
  {
    title: 'POST /users (required missing)',
    method: 'POST',
    path: '/users',
    body: { name: 'テスト' },
    desc: '必須項目不足: email, password',
  },
  {
    title: 'POST /posts (required missing)',
    method: 'POST',
    path: '/posts',
    body: { title: 'タイトルのみ' },
    desc: '必須項目不足: content, authorId',
  },

  // 型が違う (integer -> string)
  {
    title: 'POST /users (age: string)',
    method: 'POST',
    path: '/users',
    body: {
      email: 'test@example.com',
      name: 'テスト',
      password: 'password123',
      age: '二十八',
    },
    desc: '型エラー: age に文字列',
  },
  {
    title: 'POST /posts (categoryIds: strings)',
    method: 'POST',
    path: '/posts',
    body: {
      title: 'タイトル',
      content: '内容',
      authorId: SAMPLE_USER_ID,
      categoryIds: ['one', 'two', 'three'],
    },
    desc: '型エラー: categoryIds に文字列配列',
  },

  // 数値型を文字列で送信
  {
    title: 'POST /users (age: "28")',
    method: 'POST',
    path: '/users',
    body: {
      email: 'test@example.com',
      name: 'テスト',
      password: 'password123',
      age: '28',
    },
    desc: '数値を文字列で送信: age="28"',
  },
  {
    title: 'PUT /posts/:id (postId: string)',
    method: 'PUT',
    path: '/posts/abc',
    body: { title: 'タイトル', content: '内容' },
    desc: 'パスパラメータに文字列: postId="abc"',
  },

  // 長さが違う (minLength/maxLength)
  {
    title: 'POST /users (name too long)',
    method: 'POST',
    path: '/users',
    body: {
      email: 'test@example.com',
      name: 'あ'.repeat(150),
      password: 'password123',
    },
    desc: '長さエラー: name が101文字以上',
  },
  {
    title: 'POST /users (password too short)',
    method: 'POST',
    path: '/users',
    body: {
      email: 'test@example.com',
      name: 'テスト',
      password: 'short',
    },
    desc: '長さエラー: password が8文字未満',
  },
  {
    title: 'POST /users (name empty)',
    method: 'POST',
    path: '/users',
    body: {
      email: 'test@example.com',
      name: '',
      password: 'password123',
    },
    desc: '長さエラー: name が空文字',
  },

  // タイポ (フィールド名の間違い)
  {
    title: 'POST /users (typo: emal)',
    method: 'POST',
    path: '/users',
    body: {
      emal: 'test@example.com',
      name: 'テスト',
      password: 'password123',
    },
    desc: 'タイポ: emal (email)',
  },
  {
    title: 'POST /users (typo: nmae)',
    method: 'POST',
    path: '/users',
    body: {
      email: 'test@example.com',
      nmae: 'テスト',
      password: 'password123',
    },
    desc: 'タイポ: nmae (name)',
  },
  {
    title: 'POST /posts (typo: titel)',
    method: 'POST',
    path: '/posts',
    body: {
      titel: 'タイトル',
      content: '内容',
      authorId: SAMPLE_USER_ID,
    },
    desc: 'タイポ: titel (title)',
  },

  // オブジェクトの階層が違う
  {
    title: 'POST /users (flat address)',
    method: 'POST',
    path: '/users',
    body: {
      email: 'test@example.com',
      name: 'テスト',
      password: 'password123',
      postalCode: '100-0001',
      prefecture: '東京都',
      city: '千代田区',
      street: '丸の内1-1-1',
    },
    desc: '階層エラー: address内のフィールドをフラットに',
  },
  {
    title: 'POST /posts (nested metadata)',
    method: 'POST',
    path: '/posts',
    body: {
      title: 'タイトル',
      content: '内容',
      authorId: SAMPLE_USER_ID,
      metadata: { info: { readingTime: 10, keywords: ['test'] } },
    },
    desc: '階層エラー: metadata に余分なネスト',
  },
  {
    title: 'PATCH /users/:id/profile (flat socialLinks)',
    method: 'PATCH',
    path: `/users/${SAMPLE_USER_ID}/profile`,
    body: {
      twitter: '@test',
      github: 'test-user',
    },
    desc: '階層エラー: socialLinks内のフィールドをフラットに',
  },

  // 文字列型が配列になっている
  {
    title: 'POST /users (email: array)',
    method: 'POST',
    path: '/users',
    body: {
      email: ['test@example.com', 'test2@example.com'],
      name: 'テスト',
      password: 'password123',
    },
    desc: '型エラー: email が配列',
  },
  {
    title: 'POST /users (name: array)',
    method: 'POST',
    path: '/users',
    body: {
      email: 'test@example.com',
      name: ['田中', '太郎'],
      password: 'password123',
    },
    desc: '型エラー: name が配列',
  },
  {
    title: 'POST /posts (title: array)',
    method: 'POST',
    path: '/posts',
    body: {
      title: ['タイトル1', 'タイトル2'],
      content: '内容',
      authorId: SAMPLE_USER_ID,
    },
    desc: '型エラー: title が配列',
  },

  // enum違反
  {
    title: 'PATCH /users/:id (invalid status)',
    method: 'PATCH',
    path: `/users/${SAMPLE_USER_ID}`,
    body: {
      status: 'deleted',
    },
    desc: 'enum違反: status="deleted"',
  },
  {
    title: 'PATCH /posts/:id/status (invalid status)',
    method: 'PATCH',
    path: `/posts/${SAMPLE_POST_ID}/status`,
    body: {
      status: 'pending',
    },
    desc: 'enum違反: status="pending"',
  },

  // format違反
  {
    title: 'POST /users (invalid email)',
    method: 'POST',
    path: '/users',
    body: {
      email: 'not-an-email',
      name: 'テスト',
      password: 'password123',
    },
    desc: 'format違反: email形式でない',
  },
  {
    title: 'POST /users (invalid uuid)',
    method: 'POST',
    path: '/posts',
    body: {
      title: 'タイトル',
      content: '内容',
      authorId: 'not-a-uuid',
    },
    desc: 'format違反: authorId がUUID形式でない',
  },

  // pattern違反
  {
    title: 'POST /users (invalid phone)',
    method: 'POST',
    path: '/users',
    body: {
      email: 'test@example.com',
      name: 'テスト',
      password: 'password123',
      phoneNumber: '090-1234-5678',
    },
    desc: 'pattern違反: phoneNumber形式が不正',
  },
  {
    title: 'POST /users (invalid postalCode)',
    method: 'POST',
    path: '/users',
    body: {
      email: 'test@example.com',
      name: 'テスト',
      password: 'password123',
      address: { postalCode: '1000001' },
    },
    desc: 'pattern違反: postalCode形式が不正',
  },

  // 範囲違反 (minimum/maximum)
  {
    title: 'POST /users (age negative)',
    method: 'POST',
    path: '/users',
    body: {
      email: 'test@example.com',
      name: 'テスト',
      password: 'password123',
      age: -5,
    },
    desc: '範囲違反: age が負の値',
  },
  {
    title: 'POST /users (age too large)',
    method: 'POST',
    path: '/users',
    body: {
      email: 'test@example.com',
      name: 'テスト',
      password: 'password123',
      age: 200,
    },
    desc: '範囲違反: age が151以上',
  },
  {
    title: 'GET /users (limit too large)',
    method: 'GET',
    path: '/users?page=1&limit=500',
    body: null,
    desc: '範囲違反: limit が101以上',
  },
  {
    title: 'GET /users (page zero)',
    method: 'GET',
    path: '/users?page=0',
    body: null,
    desc: '範囲違反: page が0',
  },
];

/**
 * すべてのテストケースをまとめたオブジェクト
 */
export const allTestCases = {
  users: usersTests,
  posts: postsTests,
  headers: headerTests,
  pathParams: pathParamTests,
  errors: errorTests,
};

/**
 * テストケースからリクエストボディを取得するヘルパー関数
 * @param {object} testCase - テストケース
 * @returns {object|null} - リクエストボディ
 */
export function getTestBody(testCase) {
  if (testCase.getBody) {
    return testCase.getBody();
  }
  return testCase.body;
}

/**
 * テストケースからリクエストヘッダーを取得するヘルパー関数
 * @param {object} testCase - テストケース
 * @returns {object} - リクエストヘッダー
 */
export function getTestHeaders(testCase) {
  if (testCase.getHeaders) {
    return testCase.getHeaders();
  }
  return testCase.headers || {};
}

/**
 * テストケースの総数を取得
 * @returns {number} - テストケースの総数
 */
export function getTotalTestCount() {
  return usersTests.length + postsTests.length + headerTests.length + pathParamTests.length + errorTests.length;
}

