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
// モックデータ
// =============================================================================

// ユーザーデータ
const users = [
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
      street: '丸の内1-1-1',
    },
    status: 'active',
    preferences: {
      newsletter: true,
      language: 'ja',
      timezone: 'Asia/Tokyo',
    },
    profile: {
      bio: 'ソフトウェアエンジニアです',
      avatarUrl: 'https://example.com/avatars/tanaka.png',
      socialLinks: {
        twitter: '@tanaka',
        github: 'tanaka',
      },
      skills: ['JavaScript', 'TypeScript', 'React'],
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
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
      street: '梅田1-1-1',
    },
    status: 'active',
    preferences: {
      newsletter: false,
      language: 'ja',
      timezone: 'Asia/Tokyo',
    },
    profile: {
      bio: 'デザイナーです',
      avatarUrl: 'https://example.com/avatars/suzuki.png',
      socialLinks: {
        twitter: '@suzuki',
      },
      skills: ['Figma', 'Photoshop', 'Illustrator'],
    },
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
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
      street: '栄1-1-1',
    },
    status: 'inactive',
    preferences: {
      newsletter: true,
      language: 'en',
      timezone: 'Asia/Tokyo',
    },
    profile: {
      bio: 'プロジェクトマネージャーです',
      avatarUrl: null,
      socialLinks: {},
      skills: ['Project Management', 'Agile'],
    },
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
];

// 投稿データ
const posts = [
  {
    id: 1,
    title: 'はじめてのブログ投稿',
    content: 'これは最初のブログ投稿です。よろしくお願いします。',
    authorId: '550e8400-e29b-41d4-a716-446655440001',
    categoryIds: [1, 2],
    metadata: {
      readingTime: 5,
      keywords: ['初投稿', 'ブログ'],
      featured: false,
    },
    status: 'published',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
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
      featured: true,
    },
    status: 'published',
    createdAt: '2024-02-01T14:30:00Z',
    updatedAt: '2024-02-10T09:00:00Z',
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
      featured: false,
    },
    status: 'draft',
    createdAt: '2024-03-01T08:00:00Z',
    updatedAt: '2024-03-01T08:00:00Z',
  },
];

// コメントデータ
const comments = [
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    postId: 1,
    authorId: '550e8400-e29b-41d4-a716-446655440002',
    content: '素晴らしい投稿ですね！',
    createdAt: '2024-01-16T12:00:00Z',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    postId: 2,
    authorId: '550e8400-e29b-41d4-a716-446655440003',
    content: 'とても参考になりました。',
    createdAt: '2024-02-05T15:30:00Z',
  },
];

// =============================================================================
// ヘルパー関数
// =============================================================================

// UUIDを生成
const generateUUID = () => crypto.randomUUID();

// 現在時刻をISO文字列で取得
const now = () => new Date().toISOString();

// エラーレスポンスを生成
const errorResponse = (code, message, details = null) => {
  const error = { code, message };
  if (details) error.details = details;
  return error;
};

// =============================================================================
// Users API
// =============================================================================

// GET /users - ユーザー一覧取得
app.get('/users', (req, res) => {
  const { page = 1, limit = 20, status, sort } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  // バリデーション
  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', 'パラメータが無効です', [
          { field: 'page or limit', message: 'pageは1以上、limitは1〜100の範囲で指定してください' },
        ]),
      );
  }

  // フィルタリング
  let filteredUsers = [...users];
  if (status) {
    filteredUsers = filteredUsers.filter((u) => u.status === status);
  }

  // ソート
  if (sort) {
    filteredUsers.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'createdAt') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === 'updatedAt') return new Date(a.updatedAt) - new Date(b.updatedAt);
      return 0;
    });
  }

  // ページネーション
  const total = filteredUsers.length;
  const totalPages = Math.ceil(total / limitNum);
  const start = (pageNum - 1) * limitNum;
  const paginatedUsers = filteredUsers.slice(start, start + limitNum);

  res.json({
    users: paginatedUsers.map(({ profile, preferences, ...user }) => user),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  });
});

// POST /users - ユーザー作成
app.post('/users', (req, res) => {
  const { email, name, password, age, phoneNumber, address, tags } = req.body;

  // 必須フィールドのバリデーション
  const errors = [];
  if (!email) errors.push({ field: 'email', message: 'メールアドレスは必須です' });
  if (!name) errors.push({ field: 'name', message: 'ユーザー名は必須です' });
  if (!password) errors.push({ field: 'password', message: 'パスワードは必須です' });

  if (errors.length > 0) {
    return res.status(400).json(errorResponse('VALIDATION_ERROR', 'バリデーションエラー', errors));
  }

  // 新規ユーザー作成
  const newUser = {
    id: generateUUID(),
    email,
    name,
    age: age || null,
    phoneNumber: phoneNumber || null,
    address: address || null,
    status: 'active',
    tags: tags || [],
    createdAt: now(),
    updatedAt: now(),
  };

  users.push(newUser);
  res.status(201).json(newUser);
});

// GET /users/:userId - ユーザー詳細取得
app.get('/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { includeDetails } = req.query;

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json(errorResponse('NOT_FOUND', 'ユーザーが見つかりません'));
  }

  if (includeDetails === 'true') {
    res.json(user);
  } else {
    const { profile, preferences, ...basicUser } = user;
    res.json(basicUser);
  }
});

// PUT /users/:userId - ユーザー情報更新（完全置換）
app.put('/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { email, name, age, phoneNumber, address, status, preferences } = req.body;

  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json(errorResponse('NOT_FOUND', 'ユーザーが見つかりません'));
  }

  // 必須フィールドのバリデーション
  const errors = [];
  if (!email) errors.push({ field: 'email', message: 'メールアドレスは必須です' });
  if (!name) errors.push({ field: 'name', message: 'ユーザー名は必須です' });

  if (errors.length > 0) {
    return res.status(400).json(errorResponse('VALIDATION_ERROR', 'バリデーションエラー', errors));
  }

  // 完全置換
  const updatedUser = {
    ...users[userIndex],
    email,
    name,
    age: age || null,
    phoneNumber: phoneNumber || null,
    address: address || null,
    status: status || 'active',
    preferences: preferences || null,
    updatedAt: now(),
  };

  users[userIndex] = updatedUser;
  const { profile, ...responseUser } = updatedUser;
  res.json(responseUser);
});

// PATCH /users/:userId - ユーザー情報部分更新
app.patch('/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { notifyUser } = req.query;
  const updates = req.body;

  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json(errorResponse('NOT_FOUND', 'ユーザーが見つかりません'));
  }

  // 部分更新
  const updatedUser = {
    ...users[userIndex],
    ...updates,
    updatedAt: now(),
  };

  users[userIndex] = updatedUser;

  // 通知フラグがtrueの場合（実際には何もしない）
  if (notifyUser === 'true') {
    console.log(`ユーザー ${userId} に通知を送信しました`);
  }

  const { profile, preferences, ...responseUser } = updatedUser;
  res.json(responseUser);
});

// DELETE /users/:userId - ユーザー削除
app.delete('/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { permanent, reason } = req.query;

  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json(errorResponse('NOT_FOUND', 'ユーザーが見つかりません'));
  }

  if (permanent === 'true') {
    // 完全削除
    users.splice(userIndex, 1);
    console.log(`ユーザー ${userId} を完全削除しました（理由: ${reason || '未指定'}）`);
  } else {
    // 論理削除
    users[userIndex].status = 'suspended';
    users[userIndex].updatedAt = now();
    console.log(`ユーザー ${userId} を論理削除しました（理由: ${reason || '未指定'}）`);
  }

  res.status(204).send();
});

// PATCH /users/:userId/profile - ユーザープロフィール更新
app.patch('/users/:userId/profile', (req, res) => {
  const { userId } = req.params;
  const { bio, avatarUrl, socialLinks, skills } = req.body;

  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json(errorResponse('NOT_FOUND', 'ユーザーが見つかりません'));
  }

  // プロフィールの部分更新
  const currentProfile = users[userIndex].profile || {};
  users[userIndex].profile = {
    ...currentProfile,
    ...(bio !== undefined && { bio }),
    ...(avatarUrl !== undefined && { avatarUrl }),
    ...(socialLinks !== undefined && {
      socialLinks: { ...currentProfile.socialLinks, ...socialLinks },
    }),
    ...(skills !== undefined && { skills }),
  };
  users[userIndex].updatedAt = now();

  res.json({ message: 'プロフィールを更新しました', profile: users[userIndex].profile });
});

// =============================================================================
// Posts API
// =============================================================================

// POST /posts - 投稿作成
app.post('/posts', (req, res) => {
  const { draft } = req.query;
  const { title, content, authorId, categoryIds, metadata, publishedAt } = req.body;

  // 必須フィールドのバリデーション
  const errors = [];
  if (!title) errors.push({ field: 'title', message: 'タイトルは必須です' });
  if (!content) errors.push({ field: 'content', message: '内容は必須です' });
  if (!authorId) errors.push({ field: 'authorId', message: '著者IDは必須です' });

  if (errors.length > 0) {
    return res.status(400).json(errorResponse('VALIDATION_ERROR', 'バリデーションエラー', errors));
  }

  // 新規投稿作成
  const newPost = {
    id: posts.length > 0 ? Math.max(...posts.map((p) => p.id)) + 1 : 1,
    title,
    content,
    authorId,
    categoryIds: categoryIds || [],
    metadata: metadata || null,
    status: draft === 'true' ? 'draft' : 'published',
    publishedAt: draft === 'true' ? null : publishedAt || now(),
    createdAt: now(),
    updatedAt: now(),
  };

  posts.push(newPost);
  res.status(201).json(newPost);
});

// PUT /posts/:postId - 投稿情報更新（完全置換）
app.put('/posts/:postId', (req, res) => {
  const postId = parseInt(req.params.postId);
  const { title, content, categoryIds, metadata, status } = req.body;

  const postIndex = posts.findIndex((p) => p.id === postId);
  if (postIndex === -1) {
    return res.status(404).json(errorResponse('NOT_FOUND', '投稿が見つかりません'));
  }

  // 必須フィールドのバリデーション
  const errors = [];
  if (!title) errors.push({ field: 'title', message: 'タイトルは必須です' });
  if (!content) errors.push({ field: 'content', message: '内容は必須です' });

  if (errors.length > 0) {
    return res.status(400).json(errorResponse('VALIDATION_ERROR', 'バリデーションエラー', errors));
  }

  // 完全置換（authorIdは変更不可）
  const updatedPost = {
    ...posts[postIndex],
    title,
    content,
    categoryIds: categoryIds || [],
    metadata: metadata || null,
    status: status || posts[postIndex].status,
    updatedAt: now(),
  };

  posts[postIndex] = updatedPost;
  res.json(updatedPost);
});

// DELETE /posts/:postId - 投稿削除
app.delete('/posts/:postId', (req, res) => {
  const postId = parseInt(req.params.postId);

  const postIndex = posts.findIndex((p) => p.id === postId);
  if (postIndex === -1) {
    return res.status(404).json(errorResponse('NOT_FOUND', '投稿が見つかりません'));
  }

  posts.splice(postIndex, 1);
  res.status(204).send();
});

// PATCH /posts/:postId/status - 投稿ステータス更新
app.patch('/posts/:postId/status', (req, res) => {
  const postId = parseInt(req.params.postId);
  const { reason } = req.query;
  const { status, comment } = req.body;

  const postIndex = posts.findIndex((p) => p.id === postId);
  if (postIndex === -1) {
    return res.status(404).json(errorResponse('NOT_FOUND', '投稿が見つかりません'));
  }

  // 必須フィールドのバリデーション
  if (!status) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', 'バリデーションエラー', [
          { field: 'status', message: 'ステータスは必須です' },
        ]),
      );
  }

  // ステータス更新
  posts[postIndex].status = status;
  posts[postIndex].updatedAt = now();

  // 公開時にpublishedAtを設定
  if (status === 'published' && !posts[postIndex].publishedAt) {
    posts[postIndex].publishedAt = now();
  }

  console.log(
    `投稿 ${postId} のステータスを ${status} に変更しました（理由: ${reason || '未指定'}, コメント: ${comment || 'なし'}）`,
  );

  res.json(posts[postIndex]);
});

// DELETE /posts/:postId/comments/:commentId - コメント削除
app.delete('/posts/:postId/comments/:commentId', (req, res) => {
  const postId = parseInt(req.params.postId);
  const { commentId } = req.params;
  const { notifyAuthor } = req.query;

  // 投稿の存在確認
  const post = posts.find((p) => p.id === postId);
  if (!post) {
    return res.status(404).json(errorResponse('NOT_FOUND', '投稿が見つかりません'));
  }

  // コメントの存在確認
  const commentIndex = comments.findIndex((c) => c.id === commentId && c.postId === postId);
  if (commentIndex === -1) {
    return res.status(404).json(errorResponse('NOT_FOUND', 'コメントが見つかりません'));
  }

  // 削除前に著者情報を取得
  const comment = comments[commentIndex];

  // コメント削除
  comments.splice(commentIndex, 1);

  // 通知フラグがtrueの場合（実際には何もしない）
  if (notifyAuthor !== 'false') {
    console.log(`コメント著者 ${comment.authorId} に削除通知を送信しました`);
  }

  res.status(204).send();
});

// =============================================================================
// Headers API（ヘッダーバリデーションテスト用）
// =============================================================================

// GET /header/hissu - 必須/任意ヘッダーテスト
app.get('/header/hissu', (req, res) => {
  const reqHitsuyou = req.headers['aaa-req-hitsuyou'];
  const reqNini = req.headers['aaa-req-nini'];

  // 必須ヘッダーのバリデーション
  if (!reqHitsuyou) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', '必須ヘッダー aaa-req-hitsuyou が不足しています', [
          { field: 'aaa-req-hitsuyou', message: '必須ヘッダーが指定されていません' },
        ]),
      );
  }

  // レスポンスヘッダーを設定
  res.set('aaa-res-hitsuyou', 'response-required-value');
  res.set('aaa-res-nini', 'response-optional-value');

  res.json({
    message: 'ヘッダーバリデーション成功',
    receivedHeaders: {
      'aaa-req-hitsuyou': reqHitsuyou,
      'aaa-req-nini': reqNini || null,
    },
  });
});

// GET /header/uuid - UUIDフォーマットヘッダーテスト
app.get('/header/uuid', (req, res) => {
  const reqUuid = req.headers['aaa-req-uuid'];

  // 必須ヘッダーのバリデーション
  if (!reqUuid) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', '必須ヘッダー aaa-req-uuid が不足しています', [
          { field: 'aaa-req-uuid', message: '必須ヘッダーが指定されていません' },
        ]),
      );
  }

  // UUID形式のバリデーション
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(reqUuid)) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', 'aaa-req-uuid がUUID形式ではありません', [
          { field: 'aaa-req-uuid', message: `値 "${reqUuid}" はUUID形式ではありません` },
        ]),
      );
  }

  // レスポンスヘッダーを設定
  res.set('aaa-res-uuid', generateUUID());

  res.json({
    message: 'UUIDヘッダーバリデーション成功',
    receivedUuid: reqUuid,
  });
});

// GET /header/regexp - 正規表現フォーマットヘッダーテスト
app.get('/header/regexp', (req, res) => {
  const reqRegexp = req.headers['aaa-req-regexp'];

  // 必須ヘッダーのバリデーション
  if (!reqRegexp) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', '必須ヘッダー aaa-req-regexp が不足しています', [
          { field: 'aaa-req-regexp', message: '必須ヘッダーが指定されていません' },
        ]),
      );
  }

  // パターンバリデーション（ABC-数字3桁）
  const pattern = /^ABC-[0-9]{3}$/;
  if (!pattern.test(reqRegexp)) {
    return res
      .status(400)
      .json(
        errorResponse(
          'VALIDATION_ERROR',
          'aaa-req-regexp がパターン ^ABC-[0-9]{3}$ に一致しません',
          [{ field: 'aaa-req-regexp', message: `値 "${reqRegexp}" はパターンに一致しません` }],
        ),
      );
  }

  // レスポンスヘッダーを設定（XYZ-英字3文字）
  res.set('aaa-res-regexp', 'XYZ-ABC');

  res.json({
    message: '正規表現ヘッダーバリデーション成功',
    receivedRegexp: reqRegexp,
  });
});

// GET /header/datetime - date-timeフォーマットヘッダーテスト
app.get('/header/datetime', (req, res) => {
  const reqDatetime = req.headers['aaa-req-datetime'];

  // 必須ヘッダーのバリデーション
  if (!reqDatetime) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', '必須ヘッダー aaa-req-datetime が不足しています', [
          { field: 'aaa-req-datetime', message: '必須ヘッダーが指定されていません' },
        ]),
      );
  }

  // date-time形式のバリデーション（ISO 8601）
  const date = new Date(reqDatetime);
  if (isNaN(date.getTime()) || !reqDatetime.includes('T')) {
    return res.status(400).json(
      errorResponse(
        'VALIDATION_ERROR',
        'aaa-req-datetime がdate-time形式（ISO 8601）ではありません',
        [
          {
            field: 'aaa-req-datetime',
            message: `値 "${reqDatetime}" はdate-time形式ではありません`,
          },
        ],
      ),
    );
  }

  // レスポンスヘッダーを設定
  res.set('aaa-res-datetime', now());

  res.json({
    message: 'date-timeヘッダーバリデーション成功',
    receivedDatetime: reqDatetime,
    parsedDate: date.toISOString(),
  });
});

// =============================================================================
// Path Parameters API（パスパラメータバリデーションテスト用）
// =============================================================================

// GET /path/uuid/:uuid - UUIDパスパラメータテスト
app.get('/path/uuid/:uuid', (req, res) => {
  const { uuid } = req.params;

  // UUID形式のバリデーション
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', 'uuid がUUID形式ではありません', [
          { field: 'uuid', message: `値 "${uuid}" はUUID形式ではありません` },
        ]),
      );
  }

  res.json({
    uuid,
    message: 'UUIDパスパラメータバリデーション成功',
  });
});

// GET /path/regexp/:code - 正規表現パスパラメータテスト
app.get('/path/regexp/:code', (req, res) => {
  const { code } = req.params;

  // パターンバリデーション（ITEM-数字4桁）
  const pattern = /^ITEM-[0-9]{4}$/;
  if (!pattern.test(code)) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', 'code がパターン ^ITEM-[0-9]{4}$ に一致しません', [
          { field: 'code', message: `値 "${code}" はパターンに一致しません` },
        ]),
      );
  }

  res.json({
    code,
    message: '正規表現パスパラメータバリデーション成功',
  });
});

// GET /path/datetime/:datetime - date-timeパスパラメータテスト
app.get('/path/datetime/:datetime', (req, res) => {
  const { datetime } = req.params;
  const decodedDatetime = decodeURIComponent(datetime);

  // date-time形式のバリデーション（ISO 8601）
  const date = new Date(decodedDatetime);
  if (isNaN(date.getTime()) || !decodedDatetime.includes('T')) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', 'datetime がdate-time形式（ISO 8601）ではありません', [
          { field: 'datetime', message: `値 "${decodedDatetime}" はdate-time形式ではありません` },
        ]),
      );
  }

  res.json({
    datetime: date.toISOString(),
    message: 'date-timeパスパラメータバリデーション成功',
  });
});

// GET /path/encoded/:text - URIエンコーディングパスパラメータテスト
app.get('/path/encoded/:text', (req, res) => {
  const { text } = req.params;
  const decodedText = decodeURIComponent(text);

  // 長さバリデーション
  if (decodedText.length < 1 || decodedText.length > 100) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', 'text の長さが範囲外です（1〜100文字）', [
          { field: 'text', message: `長さ ${decodedText.length} は範囲外です` },
        ]),
      );
  }

  res.json({
    text: decodedText,
    encoded: text,
    message: 'URIエンコーディングパスパラメータバリデーション成功',
  });
});

// GET /path/integer/:num - 整数パスパラメータテスト
app.get('/path/integer/:num', (req, res) => {
  const { num } = req.params;
  const numInt = parseInt(num, 10);

  // 整数バリデーション
  if (isNaN(numInt) || num !== String(numInt)) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', 'num が整数ではありません', [
          { field: 'num', message: `値 "${num}" は整数ではありません` },
        ]),
      );
  }

  // 範囲バリデーション（1〜9999）
  if (numInt < 1 || numInt > 9999) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', 'num が範囲外です（1〜9999）', [
          { field: 'num', message: `値 ${numInt} は範囲外です` },
        ]),
      );
  }

  res.json({
    num: numInt,
    message: '整数パスパラメータバリデーション成功',
  });
});

// =============================================================================
// Param Types API（数値/ブール型パラメータ変換テスト用）
// =============================================================================

// GET /param-types/query - クエリパラメータの型変換テスト
app.get('/param-types/query', (req, res) => {
  const { intValue, numValue, boolValue, requiredInt } = req.query;

  // requiredIntの必須チェック
  if (requiredInt === undefined || requiredInt === '') {
    return res
      .status(400)
      .json(errorResponse('VALIDATION_ERROR', '必須パラメータ requiredInt がありません'));
  }

  // パースした値を返す（バリデーターで変換されることを確認）
  const parsedIntValue = intValue !== undefined ? parseInt(intValue, 10) : null;
  const parsedNumValue = numValue !== undefined ? parseFloat(numValue) : null;
  const parsedBoolValue =
    boolValue !== undefined ? boolValue === 'true' || boolValue === true : null;
  const parsedRequiredInt = parseInt(requiredInt, 10);

  res.json({
    intValue: parsedIntValue,
    numValue: parsedNumValue,
    boolValue: parsedBoolValue,
    requiredInt: parsedRequiredInt,
    message: 'クエリパラメータの型変換テスト成功',
    // デバッグ用：元の値も返す
    rawValues: {
      intValue,
      numValue,
      boolValue,
      requiredInt,
    },
  });
});

// GET /param-types/header - ヘッダーパラメータの型変換テスト
app.get('/param-types/header', (req, res) => {
  const intValue = req.headers['x-int-value'];
  const numValue = req.headers['x-num-value'];
  const boolValue = req.headers['x-bool-value'];
  const requiredInt = req.headers['x-required-int'];

  // requiredIntの必須チェック
  if (requiredInt === undefined || requiredInt === '') {
    return res
      .status(400)
      .json(errorResponse('VALIDATION_ERROR', '必須ヘッダー X-Required-Int がありません'));
  }

  // レスポンスヘッダーを設定
  res.set('X-Res-Int', '42');
  res.set('X-Res-Bool', 'true');

  res.json({
    message: 'ヘッダーパラメータの型変換テスト成功',
    receivedHeaders: {
      intValue: intValue !== undefined ? parseInt(intValue, 10) : null,
      numValue: numValue !== undefined ? parseFloat(numValue) : null,
      boolValue: boolValue !== undefined ? boolValue === 'true' : null,
      requiredInt: parseInt(requiredInt, 10),
    },
  });
});

// GET /param-types/path/:intId/:boolFlag - パスパラメータの型変換テスト
app.get('/param-types/path/:intId/:boolFlag', (req, res) => {
  const { intId, boolFlag } = req.params;

  // 整数バリデーション
  const parsedIntId = parseInt(intId, 10);
  if (isNaN(parsedIntId)) {
    return res.status(400).json(errorResponse('VALIDATION_ERROR', 'intId が整数ではありません'));
  }

  // ブール値バリデーション
  const validBoolValues = ['true', 'false'];
  if (!validBoolValues.includes(boolFlag.toLowerCase())) {
    return res
      .status(400)
      .json(
        errorResponse('VALIDATION_ERROR', 'boolFlag は true または false である必要があります'),
      );
  }

  const parsedBoolFlag = boolFlag.toLowerCase() === 'true';

  res.json({
    intId: parsedIntId,
    boolFlag: parsedBoolFlag,
    message: 'パスパラメータの型変換テスト成功',
  });
});

// =============================================================================
// サーバー起動
// =============================================================================

app.listen(PORT, () => {
  console.log(`テストサーバーが起動しました: http://localhost:${PORT}`);
  console.log('');
  console.log('利用可能なエンドポイント:');
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
  console.log('  [Headers]');
  console.log('    GET    /header/hissu       - 必須/任意ヘッダーテスト');
  console.log('    GET    /header/uuid        - UUIDフォーマットヘッダーテスト');
  console.log('    GET    /header/regexp      - 正規表現フォーマットヘッダーテスト');
  console.log('    GET    /header/datetime    - date-timeフォーマットヘッダーテスト');
  console.log('');
  console.log('  [Path Parameters]');
  console.log('    GET    /path/uuid/:uuid     - UUIDパスパラメータテスト');
  console.log('    GET    /path/regexp/:code   - 正規表現パスパラメータテスト');
  console.log('    GET    /path/datetime/:dt   - date-timeパスパラメータテスト');
  console.log('    GET    /path/encoded/:text  - URIエンコーディングテスト');
  console.log('    GET    /path/integer/:num   - 整数パスパラメータテスト');
  console.log('');
  console.log('  [Param Types]（数値/ブール型変換テスト）');
  console.log('    GET    /param-types/query   - クエリパラメータの型変換テスト');
  console.log('    GET    /param-types/header  - ヘッダーパラメータの型変換テスト');
  console.log('    GET    /param-types/path/:intId/:boolFlag - パスパラメータの型変換テスト');
});
