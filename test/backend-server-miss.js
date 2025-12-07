const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3001;

// ミドルウェア設定
app.use(cors());
app.use(express.json());

// 静的ファイル配信（test.htmlなど）
app.use(express.static(path.join(__dirname)));

// distフォルダからも静的ファイルを配信（validator.js, test-validator.html）
app.use(express.static(path.join(__dirname, '..', 'dist')));

// =============================================================================
// 違反ログ出力用ヘルパー
// =============================================================================
const logViolations = (endpoint, violations) => {
  console.log('\n' + '='.repeat(60));
  console.log(`🚨 仕様違反レスポンス: ${endpoint}`);
  console.log('-'.repeat(60));
  violations.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v}`);
  });
  console.log('='.repeat(60) + '\n');
};

// =============================================================================
// モックデータ（違反入り）
// =============================================================================

// ユーザーデータ（仕様違反バージョン）
const createViolatingUser = (base) => ({
  // 違反1: idがUUID形式でない（format: uuid違反）
  id: 'not-a-uuid-' + base.id.substring(0, 8),
  // 違反2: emailがemail形式でない（format: email違反）
  email: 'invalid-email-format',
  // 違反3: nameが配列になっている（type違反: string -> array）
  name: [base.name, '別名'],
  // 違反4: ageが文字列になっている（type違反: integer -> string）
  age: String(base.age) + '歳',
  // 違反5: phoneNumberがオブジェクトになっている（type違反: string -> object）
  phoneNumber: { number: base.phoneNumber, type: 'mobile' },
  // 違反6: addressの階層が違う（フラットになっている）
  postalCode: base.address?.postalCode,
  prefecture: base.address?.prefecture,
  city: base.address?.city,
  street: base.address?.street,
  // address プロパティを省略（階層違反）
  // 違反7: statusがenum外の値（enum違反）
  status: 'deleted',
  // 違反8: createdAtがdate-time形式でない（format違反）
  createdAt: '2024年1月1日',
  // 違反9: updatedAtが数値になっている（type違反: string -> number）
  updatedAt: Date.now(),
  // 違反10: スキーマにないフィールドを追加（これは許容される場合もあるが）
  extraField: 'この項目はスキーマに存在しない',
  // 違反11: タイポフィールド
  emal: base.email,
  nmae: base.name
});

// 投稿データ（仕様違反バージョン）
const createViolatingPost = (base) => ({
  // 違反1: idが文字列になっている（type違反: integer -> string）
  id: 'post-' + base.id,
  // 違反2: titleが配列になっている（type違反: string -> array）
  title: [base.title, 'サブタイトル'],
  // 違反3: contentが空文字（minLength違反）
  content: '',
  // 違反4: authorIdがUUID形式でない（format: uuid違反）
  authorId: 'author-123',
  // 違反5: categoryIdsが文字列配列になっている（type違反: integer[] -> string[]）
  categoryIds: ['cat1', 'cat2', 'cat3'],
  // 違反6: metadataの階層が違う（余分なネストがある）
  metadata: {
    info: {
      readingTime: base.metadata?.readingTime,
      keywords: base.metadata?.keywords,
      featured: base.metadata?.featured
    }
  },
  // 違反7: statusがenum外の値（enum違反）
  status: 'pending',
  // 違反8: createdAtがdate-time形式でない（format違反）
  createdAt: '昨日',
  // 違反9: updatedAtがnull（type違反）
  updatedAt: null,
  // 違反10: タイポフィールド
  titel: base.title,
  contnet: base.content
});

// ページネーション（仕様違反バージョン）
const createViolatingPagination = (page, limit, total) => ({
  // 違反1: pageが文字列になっている（type違反: integer -> string）
  page: String(page) + 'ページ目',
  // 違反2: limitがnull
  limit: null,
  // 違反3: totalがオブジェクトになっている
  total: { count: total, unit: '件' },
  // 違反4: totalPagesが負の数（範囲違反）
  totalPages: -1
});

// エラーレスポンス（仕様違反バージョン）
const createViolatingError = (code, message, details = null) => ({
  // 違反1: codeが数値になっている（type違反: string -> number）
  code: 500,
  // 違反2: messageが配列になっている（type違反: string -> array）
  message: [message, '追加情報'],
  // 違反3: detailsの構造が違う
  details: details ? { error_list: details, timestamp: Date.now() } : null,
  // 違反4: スキーマにないフィールド
  errorId: crypto.randomUUID(),
  stack: 'Error: ...'
});

// 元のデータ
const originalUsers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'tanaka@example.com',
    name: '田中太郎',
    age: 30,
    phoneNumber: '+819012345678',
    address: {
      postalCode: '100-0001',
      prefecture: '東京都',
      city: '千代田区',
      street: '丸の内1-1-1'
    },
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'suzuki@example.com',
    name: '鈴木花子',
    age: 25,
    phoneNumber: '+819087654321',
    address: {
      postalCode: '530-0001',
      prefecture: '大阪府',
      city: '大阪市北区',
      street: '梅田1-1-1'
    },
    status: 'active',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'sato@example.com',
    name: '佐藤一郎',
    age: 35,
    phoneNumber: '+819011112222',
    address: {
      postalCode: '460-0001',
      prefecture: '愛知県',
      city: '名古屋市中区',
      street: '栄1-1-1'
    },
    status: 'inactive',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z'
  }
];

const originalPosts = [
  {
    id: 1,
    title: 'はじめてのブログ投稿',
    content: 'これは最初のブログ投稿です。よろしくお願いします。',
    authorId: '550e8400-e29b-41d4-a716-446655440001',
    categoryIds: [1, 2],
    metadata: {
      readingTime: 5,
      keywords: ['初投稿', 'ブログ'],
      featured: false
    },
    status: 'published',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    title: 'TypeScriptの基本',
    content: 'TypeScriptの基本的な使い方を解説します。',
    authorId: '550e8400-e29b-41d4-a716-446655440001',
    categoryIds: [3],
    metadata: {
      readingTime: 15,
      keywords: ['TypeScript', 'プログラミング'],
      featured: true
    },
    status: 'published',
    createdAt: '2024-02-01T14:30:00Z',
    updatedAt: '2024-02-10T09:00:00Z'
  },
  {
    id: 3,
    title: 'デザインシステムの作り方',
    content: 'デザインシステムを構築する方法について説明します。',
    authorId: '550e8400-e29b-41d4-a716-446655440002',
    categoryIds: [4, 5],
    metadata: {
      readingTime: 20,
      keywords: ['デザイン', 'UI/UX'],
      featured: false
    },
    status: 'draft',
    createdAt: '2024-03-01T08:00:00Z',
    updatedAt: '2024-03-01T08:00:00Z'
  }
];

// =============================================================================
// Users API
// =============================================================================

// GET /users - ユーザー一覧取得（違反レスポンス）
app.get('/users', (req, res) => {
  const violations = [
    'users[].id: UUID形式でない文字列を返却',
    'users[].email: email形式でない文字列を返却',
    'users[].name: string型のところarray型を返却',
    'users[].age: integer型のところstring型を返却',
    'users[].phoneNumber: string型のところobject型を返却',
    'users[].address: オブジェクト階層をフラットに展開',
    'users[].status: enum外の値 "deleted" を返却',
    'users[].createdAt: date-time形式でない文字列を返却',
    'users[].updatedAt: string型のところnumber型を返却',
    'pagination.page: integer型のところstring型を返却',
    'pagination.limit: nullを返却',
    'pagination.total: integer型のところobject型を返却',
    'pagination.totalPages: 負の値を返却'
  ];
  logViolations('GET /users', violations);

  const violatingUsers = originalUsers.map(createViolatingUser);

  res.json({
    users: violatingUsers,
    pagination: createViolatingPagination(1, 20, originalUsers.length)
  });
});

// POST /users - ユーザー作成（違反レスポンス）
app.post('/users', (req, res) => {
  const violations = [
    '201レスポンス: User schemaに違反',
    'id: UUID形式でない',
    'email: email形式でない',
    'name: string型のところarray型',
    'age: integer型のところstring型',
    'phoneNumber: string型のところobject型',
    'address: 階層構造が違う（フラット）',
    'status: enum外の値',
    'createdAt: date-time形式でない',
    'updatedAt: string型のところnumber型'
  ];
  logViolations('POST /users', violations);

  const newUser = {
    id: '550e8400-e29b-41d4-a716-446655440099',
    email: req.body.email || 'new@example.com',
    name: req.body.name || '新規ユーザー',
    age: req.body.age || 20,
    phoneNumber: req.body.phoneNumber || '+819000000000',
    address: req.body.address || { postalCode: '100-0001', prefecture: '東京都', city: '千代田区', street: '1-1-1' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  res.status(201).json(createViolatingUser(newUser));
});

// GET /users/:userId - ユーザー詳細取得（違反レスポンス）
app.get('/users/:userId', (req, res) => {
  const { userId } = req.params;

  const user = originalUsers.find(u => u.id === userId);
  if (!user) {
    const violations = [
      '404エラーレスポンス: Error schemaに違反',
      'code: string型のところnumber型',
      'message: string型のところarray型',
      'details: 構造が違う（余分なネスト）'
    ];
    logViolations('GET /users/:userId (404)', violations);
    return res.status(404).json(createViolatingError('NOT_FOUND', 'ユーザーが見つかりません'));
  }

  const violations = [
    '200レスポンス: User schemaに違反',
    'id: UUID形式でない',
    'email: email形式でない',
    'name: string型のところarray型',
    'age: integer型のところstring型',
    'status: enum外の値 "deleted"',
    'createdAt: date-time形式でない',
    'updatedAt: string型のところnumber型'
  ];
  logViolations('GET /users/:userId', violations);

  res.json(createViolatingUser(user));
});

// PUT /users/:userId - ユーザー情報更新（違反レスポンス）
app.put('/users/:userId', (req, res) => {
  const { userId } = req.params;

  const user = originalUsers.find(u => u.id === userId);
  if (!user) {
    const violations = [
      '404エラーレスポンス: Error schemaに違反',
      'code: string型のところnumber型',
      'message: string型のところarray型'
    ];
    logViolations('PUT /users/:userId (404)', violations);
    return res.status(404).json(createViolatingError('NOT_FOUND', 'ユーザーが見つかりません'));
  }

  const violations = [
    '200レスポンス: User schemaに違反',
    'id: UUID形式でない',
    'email: email形式でない',
    'name: string型のところarray型',
    'age: integer型のところstring型',
    'status: enum外の値',
    'createdAt: date-time形式でない',
    'updatedAt: string型のところnumber型',
    'タイポフィールド追加: emal, nmae'
  ];
  logViolations('PUT /users/:userId', violations);

  res.json(createViolatingUser({ ...user, ...req.body }));
});

// PATCH /users/:userId - ユーザー情報部分更新（違反レスポンス）
app.patch('/users/:userId', (req, res) => {
  const { userId } = req.params;

  const user = originalUsers.find(u => u.id === userId);
  if (!user) {
    const violations = [
      '404エラーレスポンス: Error schemaに違反',
      'code: string型のところnumber型',
      'message: string型のところarray型'
    ];
    logViolations('PATCH /users/:userId (404)', violations);
    return res.status(404).json(createViolatingError('NOT_FOUND', 'ユーザーが見つかりません'));
  }

  const violations = [
    '200レスポンス: User schemaに違反',
    'id: UUID形式でない',
    'email: email形式でない',
    'name: string型のところarray型',
    'age: integer型のところstring型（"30歳"のような形式）',
    'phoneNumber: string型のところobject型',
    'address: フラット化されている（階層違反）',
    'status: enum外の値 "deleted"',
    'createdAt: date-time形式でない（"2024年1月1日"）',
    'updatedAt: string型のところnumber型（タイムスタンプ）'
  ];
  logViolations('PATCH /users/:userId', violations);

  res.json(createViolatingUser({ ...user, ...req.body }));
});

// DELETE /users/:userId - ユーザー削除（204は本体なしなので違反できない、ただしログは出す）
app.delete('/users/:userId', (req, res) => {
  const { userId } = req.params;

  const user = originalUsers.find(u => u.id === userId);
  if (!user) {
    const violations = [
      '404エラーレスポンス: Error schemaに違反',
      'code: string型のところnumber型',
      'message: string型のところarray型'
    ];
    logViolations('DELETE /users/:userId (404)', violations);
    return res.status(404).json(createViolatingError('NOT_FOUND', 'ユーザーが見つかりません'));
  }

  // 204は本体なしだが、わざと本体を返す（違反）
  const violations = [
    '204レスポンスにbodyを返却（No Contentなのにbodyあり）',
    '返却されたデータもschema違反'
  ];
  logViolations('DELETE /users/:userId', violations);

  // 204なのにbodyを返す（一部のクライアントは無視するが仕様違反）
  res.status(204).json({ deleted: true, message: '削除しました', userId });
});

// PATCH /users/:userId/profile - ユーザープロフィール更新（違反レスポンス）
app.patch('/users/:userId/profile', (req, res) => {
  const { userId } = req.params;

  const user = originalUsers.find(u => u.id === userId);
  if (!user) {
    const violations = [
      '404エラーレスポンス: Error schemaに違反',
      'code: string型のところnumber型',
      'message: string型のところarray型'
    ];
    logViolations('PATCH /users/:userId/profile (404)', violations);
    return res.status(404).json(createViolatingError('NOT_FOUND', 'ユーザーが見つかりません'));
  }

  // レスポンススキーマが明示されていないが、プロフィール関連の違反を入れる
  const violations = [
    '200レスポンス: 期待されるスキーマに違反',
    'bio: string型のところnumber型',
    'avatarUrl: URI形式でない',
    'socialLinks: 階層がフラットになっている',
    'skills: string配列のところobject配列'
  ];
  logViolations('PATCH /users/:userId/profile', violations);

  res.json({
    message: ['プロフィールを更新しました', '成功'],  // string -> array違反
    profile: {
      // bio: string -> number違反
      bio: 12345,
      // avatarUrl: uri形式でない
      avatarUrl: 'not-a-valid-url',
      // socialLinks: フラット化（階層違反）
      twitter: '@test',
      github: 'test-user',
      // skills: string[] -> object[]違反
      skills: [
        { name: 'JavaScript', level: 5 },
        { name: 'TypeScript', level: 4 }
      ]
    }
  });
});

// =============================================================================
// Posts API
// =============================================================================

// POST /posts - 投稿作成（違反レスポンス）
app.post('/posts', (req, res) => {
  const violations = [
    '201レスポンス: Post schemaに違反',
    'id: integer型のところstring型',
    'title: string型のところarray型',
    'content: minLength違反（空文字）',
    'authorId: UUID形式でない',
    'categoryIds: integer配列のところstring配列',
    'metadata: 余分なネスト階層（info.readingTimeなど）',
    'status: enum外の値 "pending"',
    'createdAt: date-time形式でない',
    'updatedAt: nullを返却',
    'タイポフィールド追加: titel, contnet'
  ];
  logViolations('POST /posts', violations);

  const newPost = {
    id: (originalPosts.length + 1),
    title: req.body.title || '新規投稿',
    content: req.body.content || 'コンテンツ',
    authorId: req.body.authorId || '550e8400-e29b-41d4-a716-446655440001',
    categoryIds: req.body.categoryIds || [1],
    metadata: req.body.metadata || { readingTime: 5, keywords: [], featured: false },
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  res.status(201).json(createViolatingPost(newPost));
});

// PUT /posts/:postId - 投稿情報更新（違反レスポンス）
app.put('/posts/:postId', (req, res) => {
  const postId = parseInt(req.params.postId);

  const post = originalPosts.find(p => p.id === postId);
  if (!post) {
    const violations = [
      '404エラーレスポンス: Error schemaに違反',
      'code: string型のところnumber型',
      'message: string型のところarray型'
    ];
    logViolations('PUT /posts/:postId (404)', violations);
    return res.status(404).json(createViolatingError('NOT_FOUND', '投稿が見つかりません'));
  }

  const violations = [
    '200レスポンス: Post schemaに違反',
    'id: integer型のところstring型',
    'title: string型のところarray型',
    'content: minLength違反（空文字）',
    'authorId: UUID形式でない',
    'categoryIds: integer配列のところstring配列',
    'metadata: 余分なネスト階層',
    'status: enum外の値 "pending"',
    'createdAt: date-time形式でない',
    'updatedAt: nullを返却'
  ];
  logViolations('PUT /posts/:postId', violations);

  res.json(createViolatingPost({ ...post, ...req.body }));
});

// DELETE /posts/:postId - 投稿削除
app.delete('/posts/:postId', (req, res) => {
  const postId = parseInt(req.params.postId);

  const post = originalPosts.find(p => p.id === postId);
  if (!post) {
    const violations = [
      '404エラーレスポンス: Error schemaに違反',
      'code: string型のところnumber型',
      'message: string型のところarray型'
    ];
    logViolations('DELETE /posts/:postId (404)', violations);
    return res.status(404).json(createViolatingError('NOT_FOUND', '投稿が見つかりません'));
  }

  const violations = [
    '204レスポンスにbodyを返却（No Contentなのにbodyあり）',
    '返却されたデータもschema違反'
  ];
  logViolations('DELETE /posts/:postId', violations);

  // 204なのにbodyを返す
  res.status(204).json({ deleted: true, postId });
});

// PATCH /posts/:postId/status - 投稿ステータス更新（違反レスポンス）
app.patch('/posts/:postId/status', (req, res) => {
  const postId = parseInt(req.params.postId);

  const post = originalPosts.find(p => p.id === postId);
  if (!post) {
    const violations = [
      '404エラーレスポンス: Error schemaに違反',
      'code: string型のところnumber型',
      'message: string型のところarray型'
    ];
    logViolations('PATCH /posts/:postId/status (404)', violations);
    return res.status(404).json(createViolatingError('NOT_FOUND', '投稿が見つかりません'));
  }

  const violations = [
    '200レスポンス: Post schemaに違反',
    'id: integer型のところstring型',
    'title: string型のところarray型',
    'content: minLength違反（空文字）',
    'authorId: UUID形式でない',
    'categoryIds: integer配列のところstring配列',
    'metadata: 余分なネスト階層',
    'status: enum外の値 "pending"（リクエストで指定されても無視）',
    'createdAt: date-time形式でない',
    'updatedAt: nullを返却'
  ];
  logViolations('PATCH /posts/:postId/status', violations);

  res.json(createViolatingPost(post));
});

// DELETE /posts/:postId/comments/:commentId - コメント削除
app.delete('/posts/:postId/comments/:commentId', (req, res) => {
  const postId = parseInt(req.params.postId);
  const { commentId } = req.params;

  const violations = [
    '204レスポンスにbodyを返却（No Contentなのにbodyあり）',
    '返却されたデータのschema違反'
  ];
  logViolations('DELETE /posts/:postId/comments/:commentId', violations);

  // 204なのにbodyを返す
  res.status(204).json({
    deleted: true,
    postId: 'post-' + postId,  // integer -> string違反
    commentId: ['comment', commentId]  // string -> array違反
  });
});

// =============================================================================
// Headers API（ヘッダーバリデーションテスト用 - 違反バージョン）
// =============================================================================

// GET /header/hissu - 必須/任意ヘッダーテスト（違反レスポンス）
app.get('/header/hissu', (req, res) => {
  const violations = [
    'レスポンスヘッダー aaa-res-hitsuyou: 必須なのに設定されていない',
    'レスポンスヘッダー aaa-res-nini: 整数値を設定（string型違反）',
    'message: string型のところarray型',
    'receivedHeaders: スキーマにないフィールド'
  ];
  logViolations('GET /header/hissu', violations);

  // aaa-res-hitsuyou は必須だが設定しない（違反）
  // aaa-res-nini に整数値を設定（型違反）
  res.set('aaa-res-nini', '12345');

  res.json({
    // message: string -> array違反
    message: ['ヘッダーバリデーション', '成功'],
    // 余分なフィールド
    receivedHeaders: {
      all: req.headers
    },
    // タイポ
    mesage: 'typo field'
  });
});

// GET /header/uuid - UUIDフォーマットヘッダーテスト（違反レスポンス）
app.get('/header/uuid', (req, res) => {
  const violations = [
    'レスポンスヘッダー aaa-res-uuid: UUID形式でない値を設定（format: uuid違反）',
    'message: string型のところobject型',
    'receivedUuid: string型のところarray型'
  ];
  logViolations('GET /header/uuid', violations);

  // aaa-res-uuid にUUID形式でない値を設定（違反）
  res.set('aaa-res-uuid', 'not-a-valid-uuid-format');

  res.json({
    // message: string -> object違反
    message: { text: 'UUIDヘッダーバリデーション成功', code: 200 },
    // receivedUuid: string -> array違反
    receivedUuid: [req.headers['aaa-req-uuid'], 'extra-value']
  });
});

// GET /header/regexp - 正規表現フォーマットヘッダーテスト（違反レスポンス）
app.get('/header/regexp', (req, res) => {
  const violations = [
    'レスポンスヘッダー aaa-res-regexp: パターン ^XYZ-[A-Z]{3}$ に一致しない値（pattern違反）',
    'message: string型のところnumber型',
    'receivedRegexp: スキーマにないフィールド'
  ];
  logViolations('GET /header/regexp', violations);

  // aaa-res-regexp にパターンに一致しない値を設定（違反）
  res.set('aaa-res-regexp', 'ABC-123');  // XYZ-でなくABC-

  res.json({
    // message: string -> number違反
    message: 200,
    // 余分なフィールド
    receivedRegexp: req.headers['aaa-req-regexp'],
    // タイポ
    recievedRegexp: 'typo'
  });
});

// GET /header/datetime - date-timeフォーマットヘッダーテスト（違反レスポンス）
app.get('/header/datetime', (req, res) => {
  const violations = [
    'レスポンスヘッダー aaa-res-datetime: date-time形式でない値（format: date-time違反）',
    'message: string型のところboolean型',
    'parsedDate: date-time形式でない（format違反）'
  ];
  logViolations('GET /header/datetime', violations);

  // aaa-res-datetime にdate-time形式でない値を設定（違反）
  res.set('aaa-res-datetime', '2024年12月7日 10:30');

  res.json({
    // message: string -> boolean違反
    message: true,
    receivedDatetime: req.headers['aaa-req-datetime'],
    // parsedDate: date-time形式でない
    parsedDate: '昨日の10時30分'
  });
});

// =============================================================================
// Path Parameters API（パスパラメータバリデーションテスト用 - 違反バージョン）
// =============================================================================

// GET /path/uuid/:uuid - UUIDパスパラメータテスト（違反レスポンス）
app.get('/path/uuid/:uuid', (req, res) => {
  const violations = [
    'uuid: string型のところobject型',
    'message: string型のところarray型'
  ];
  logViolations('GET /path/uuid/:uuid', violations);

  res.json({
    // uuid: string -> object違反
    uuid: { value: req.params.uuid, type: 'uuid' },
    // message: string -> array違反
    message: ['UUID', 'パスパラメータ', 'バリデーション成功']
  });
});

// GET /path/regexp/:code - 正規表現パスパラメータテスト（違反レスポンス）
app.get('/path/regexp/:code', (req, res) => {
  const violations = [
    'code: string型のところinteger型',
    'message: string型のところnull'
  ];
  logViolations('GET /path/regexp/:code', violations);

  res.json({
    // code: string -> integer違反
    code: 1234,
    // message: string -> null違反
    message: null
  });
});

// GET /path/datetime/:datetime - date-timeパスパラメータテスト（違反レスポンス）
app.get('/path/datetime/:datetime', (req, res) => {
  const violations = [
    'datetime: date-time形式でない（format違反）',
    'message: string型のところobject型'
  ];
  logViolations('GET /path/datetime/:datetime', violations);

  res.json({
    // datetime: date-time形式でない
    datetime: '今日の午後3時',
    // message: string -> object違反
    message: { status: 'success', code: 200 }
  });
});

// GET /path/encoded/:text - URIエンコーディングパスパラメータテスト（違反レスポンス）
app.get('/path/encoded/:text', (req, res) => {
  const violations = [
    'text: string型のところarray型',
    'encoded: string型のところnumber型',
    'message: string型のところboolean型'
  ];
  logViolations('GET /path/encoded/:text', violations);

  const decodedText = decodeURIComponent(req.params.text);

  res.json({
    // text: string -> array違反
    text: [decodedText, 'extra'],
    // encoded: string -> number違反
    encoded: 12345,
    // message: string -> boolean違反
    message: false
  });
});

// GET /path/integer/:num - 整数パスパラメータテスト（違反レスポンス）
app.get('/path/integer/:num', (req, res) => {
  const violations = [
    'num: integer型のところstring型',
    'message: string型のところarray型'
  ];
  logViolations('GET /path/integer/:num', violations);

  res.json({
    // num: integer -> string違反
    num: req.params.num + '個',
    // message: string -> array違反
    message: ['整数', 'パスパラメータ', 'バリデーション成功']
  });
});

// =============================================================================
// 400エラー用（バリデーションエラー）
// =============================================================================

// リクエストボディのバリデーションはせず、常に違反レスポンスを返す
// 400エラーが必要な場合用
app.use((req, res, next) => {
  // 未定義のルートは404を返す（違反付き）
  if (!res.headersSent) {
    const violations = [
      '404エラーレスポンス: Error schemaに違反',
      'code: string型のところnumber型',
      'message: string型のところarray型',
      'スキーマにないフィールド追加: errorId, stack'
    ];
    logViolations(`${req.method} ${req.path} (404 Not Found)`, violations);
    res.status(404).json(createViolatingError('NOT_FOUND', 'エンドポイントが見つかりません'));
  }
});

// =============================================================================
// サーバー起動
// =============================================================================

app.listen(PORT, () => {
  console.log('');
  console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
  console.log('     仕様違反テストサーバー（backend-server-miss）');
  console.log('     すべてのレスポンスがOpenAPI仕様に違反しています！');
  console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
  console.log('');
  console.log(`サーバー起動: http://localhost:${PORT}`);
  console.log('');
  console.log('【違反パターン一覧】');
  console.log('  - 型違反: integer→string, string→array, string→object');
  console.log('  - format違反: uuid, email, date-time, uri');
  console.log('  - enum違反: 定義外の値（deleted, pending等）');
  console.log('  - 階層違反: フラット化、余分なネスト');
  console.log('  - 範囲違反: minLength, 負の値');
  console.log('  - タイポ: emal, nmae, titel, contnet');
  console.log('  - 204にbody付与');
  console.log('  - レスポンスヘッダー違反: 必須ヘッダー欠落、フォーマット違反');
  console.log('');
  console.log('利用可能なエンドポイント（すべて違反レスポンス）:');
  console.log('  [Users]');
  console.log('    GET    /users              - ユーザー一覧取得');
  console.log('    POST   /users              - ユーザー作成');
  console.log('    GET    /users/:userId      - ユーザー詳細取得');
  console.log('    PUT    /users/:userId      - ユーザー情報更新（完全置換）');
  console.log('    PATCH  /users/:userId      - ユーザー情報部分更新');
  console.log('    DELETE /users/:userId      - ユーザー削除');
  console.log('    PATCH  /users/:userId/profile - ユーザープロフィール更新');
  console.log('');
  console.log('  [Posts]');
  console.log('    POST   /posts              - 投稿作成');
  console.log('    PUT    /posts/:postId      - 投稿情報更新（完全置換）');
  console.log('    DELETE /posts/:postId      - 投稿削除');
  console.log('    PATCH  /posts/:postId/status - 投稿ステータス更新');
  console.log('    DELETE /posts/:postId/comments/:commentId - コメント削除');
  console.log('');
  console.log('  [Headers]（レスポンスヘッダー違反）');
  console.log('    GET    /header/hissu       - 必須ヘッダー欠落');
  console.log('    GET    /header/uuid        - UUID形式違反');
  console.log('    GET    /header/regexp      - 正規表現パターン違反');
  console.log('    GET    /header/datetime    - date-time形式違反');
  console.log('');
  console.log('  [Path Parameters]（レスポンスボディ違反）');
  console.log('    GET    /path/uuid/:uuid     - 型違反（object）');
  console.log('    GET    /path/regexp/:code   - 型違反（integer）');
  console.log('    GET    /path/datetime/:dt   - format違反');
  console.log('    GET    /path/encoded/:text  - 型違反（array/number）');
  console.log('    GET    /path/integer/:num   - 型違反（string）');
  console.log('');
});
