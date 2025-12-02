const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// ミドルウェア設定
app.use(cors());
app.use(express.json());

// リクエストログ
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  next();
});

// バリデーションヘルパー
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validateUUID = (uuid) => {
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return re.test(uuid);
};

const validatePostalCode = (code) => {
  const re = /^\d{3}-\d{4}$/;
  return re.test(code);
};

const validatePhoneNumber = (phone) => {
  const re = /^\+?[1-9]\d{1,14}$/;
  return re.test(phone);
};

// ダミーデータ
let users = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user1@example.com',
    name: '山田太郎',
    age: 30,
    phoneNumber: '+819012345678',
    address: {
      postalCode: '100-0001',
      prefecture: '東京都',
      city: '千代田区',
      street: '千代田1-1'
    },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    email: 'user2@example.com',
    name: '佐藤花子',
    age: 25,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let posts = [
  {
    id: 1,
    title: '初めての投稿',
    content: 'これはテスト投稿です。',
    authorId: '123e4567-e89b-12d3-a456-426614174000',
    categoryIds: [1, 2],
    metadata: {
      readingTime: 5,
      keywords: ['test', 'first'],
      featured: true
    },
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// ==========================================
// GET /users - ユーザー一覧取得
// OpenAPI: getUsers
// ==========================================
app.get('/v1/users', (req, res) => {
  const { page = 1, limit = 20, status, sort } = req.query;
  
  let filteredUsers = [...users];
  
  // ステータスでフィルタ
  if (status) {
    filteredUsers = filteredUsers.filter(u => u.status === status);
  }
  
  // ソート
  if (sort === 'name') {
    filteredUsers.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'createdAt') {
    filteredUsers.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }
  
  // ページネーション
  const start = (parseInt(page) - 1) * parseInt(limit);
  const end = start + parseInt(limit);
  const paginatedUsers = filteredUsers.slice(start, end);
  
  res.json({
    users: paginatedUsers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredUsers.length,
      totalPages: Math.ceil(filteredUsers.length / parseInt(limit))
    }
  });
});

// ==========================================
// POST /users - ユーザー作成
// OpenAPI: createUser
// ==========================================
app.post('/v1/users', (req, res) => {
  const { userId } = req.params;
  
  // UUIDバリデーション
  if (!validateUUID(userId)) {
    return res.status(400).json({
      code: 'INVALID_UUID',
      message: 'Invalid user ID format',
      details: [{ field: 'userId', message: 'Must be a valid UUID' }]
    });
  }
  
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'User not found',
      details: []
    });
  }
  
  res.json(user);
});

// ==========================================
// GET /users/{userId} - ユーザー詳細取得
// OpenAPI: getUserById
// ==========================================
app.get('/v1/users/:userId', (req, res) => {
  const { email, name, password, age, phoneNumber, address, tags } = req.body;
  
  // バリデーション
  const errors = [];
  
  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  if (!name) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (name.length < 1 || name.length > 100) {
    errors.push({ field: 'name', message: 'Name must be between 1 and 100 characters' });
  }
  
  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < 8 || password.length > 128) {
    errors.push({ field: 'password', message: 'Password must be between 8 and 128 characters' });
  }
  
  if (age !== undefined && (age < 0 || age > 150)) {
    errors.push({ field: 'age', message: 'Age must be between 0 and 150' });
  }
  
  if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
    errors.push({ field: 'phoneNumber', message: 'Invalid phone number format' });
  }
  
  if (address && address.postalCode && !validatePostalCode(address.postalCode)) {
    errors.push({ field: 'address.postalCode', message: 'Invalid postal code format (expected: 123-4567)' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors
    });
  }
  
  // 新しいユーザーを作成
  const newUser = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    email,
    name,
    age,
    phoneNumber,
    address,
    tags,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  users.push(newUser);
  
  res.status(201).json(newUser);
});

// ==========================================
// PUT /users/{userId} - ユーザー情報更新（完全置換）
// OpenAPI: updateUser
// ==========================================
app.put('/v1/users/:userId', (req, res) => {
  const { title, content, authorId, categoryIds, metadata, publishedAt } = req.body;
  const { draft } = req.query;
  
  // バリデーション
  const errors = [];
  
  if (!title) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (title.length < 1 || title.length > 200) {
    errors.push({ field: 'title', message: 'Title must be between 1 and 200 characters' });
  }
  
  if (!content) {
    errors.push({ field: 'content', message: 'Content is required' });
  } else if (content.length < 1) {
    errors.push({ field: 'content', message: 'Content must not be empty' });
  }
  
  if (!authorId) {
    errors.push({ field: 'authorId', message: 'Author ID is required' });
  } else if (!validateUUID(authorId)) {
    errors.push({ field: 'authorId', message: 'Invalid author ID format' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors
    });
  }
  
  // 新しい投稿を作成
  const newPost = {
    id: posts.length + 1,
    title,
    content,
    authorId,
    categoryIds,
    metadata,
    publishedAt,
    status: draft === 'true' ? 'draft' : 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  posts.push(newPost);
  
  res.status(201).json(newPost);
});

// ==========================================
// PATCH /users/{userId} - ユーザー情報部分更新
// OpenAPI: patchUser
// ==========================================
app.patch('/v1/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { email, name, age, phoneNumber, address, status, preferences } = req.body;
  
  // UUIDバリデーション
  if (!validateUUID(userId)) {
    return res.status(400).json({
      code: 'INVALID_UUID',
      message: 'Invalid user ID format',
      details: [{ field: 'userId', message: 'Must be a valid UUID' }]
    });
  }
  
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'User not found',
      details: []
    });
  }
  
  // バリデーション
  const errors = [];
  
  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  if (!name) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (name.length < 1 || name.length > 100) {
    errors.push({ field: 'name', message: 'Name must be between 1 and 100 characters' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors
    });
  }
  
  // ユーザーを更新
  users[userIndex] = {
    ...users[userIndex],
    email,
    name,
    age,
    phoneNumber,
    address,
    status,
    preferences,
    updatedAt: new Date().toISOString()
  };
  
  res.json(users[userIndex]);
});

// ==========================================
// DELETE /users/{userId} - ユーザー削除
// OpenAPI: deleteUser
// ==========================================
app.delete('/v1/users/:userId', (req, res) => {
  const { postId } = req.params;
  const { title, content, categoryIds, metadata, status } = req.body;
  
  const postIndex = posts.findIndex(p => p.id === parseInt(postId));
  
  if (postIndex === -1) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'Post not found',
      details: []
    });
  }
  
  // バリデーション
  const errors = [];
  
  if (!title) {
    errors.push({ field: 'title', message: 'Title is required' });
  }
  if (!content) {
    errors.push({ field: 'content', message: 'Content is required' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors
    });
  }
  
  // 投稿を更新
  posts[postIndex] = {
    ...posts[postIndex],
    title,
    content,
    categoryIds,
    metadata,
    status,
    updatedAt: new Date().toISOString()
  };
  
  res.json(posts[postIndex]);
});

// ==========================================
// PATCH /users/{userId}/profile - ユーザープロフィール更新
// OpenAPI: patchUserProfile
// ==========================================
app.patch('/v1/users/:userId/profile', (req, res) => {
  const { userId } = req.params;
  const updates = req.body;
  
  // UUIDバリデーション
  if (!validateUUID(userId)) {
    return res.status(400).json({
      code: 'INVALID_UUID',
      message: 'Invalid user ID format',
      details: [{ field: 'userId', message: 'Must be a valid UUID' }]
    });
  }
  
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'User not found',
      details: []
    });
  }
  
  // バリデーション
  const errors = [];
  
  if (updates.email && !validateEmail(updates.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  if (updates.name && (updates.name.length < 1 || updates.name.length > 100)) {
    errors.push({ field: 'name', message: 'Name must be between 1 and 100 characters' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors
    });
  }
  
  // ユーザーを部分更新
  users[userIndex] = {
    ...users[userIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  res.json(users[userIndex]);
});

// ==========================================
// POST /posts - 投稿作成
// OpenAPI: createPost
// ==========================================
app.post('/v1/posts', (req, res) => {
  const { postId } = req.params;
  const { status, comment } = req.body;
  
  const postIndex = posts.findIndex(p => p.id === parseInt(postId));
  
  if (postIndex === -1) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'Post not found',
      details: []
    });
  }
  
  // バリデーション
  if (!status) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Status is required',
      details: [{ field: 'status', message: 'Status is required' }]
    });
  }
  
  if (!['draft', 'published', 'archived'].includes(status)) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid status value',
      details: [{ field: 'status', message: 'Must be one of: draft, published, archived' }]
    });
  }
  
  // ステータスを更新
  posts[postIndex].status = status;
  posts[postIndex].updatedAt = new Date().toISOString();
  
  res.json(posts[postIndex]);
});

// ==========================================
// PUT /posts/{postId} - 投稿情報更新（完全置換）
// OpenAPI: updatePost
// ==========================================
app.put('/v1/posts/:postId', (req, res) => {
  const { userId } = req.params;
  const { bio, avatarUrl, socialLinks, skills } = req.body;
  
  // UUIDバリデーション
  if (!validateUUID(userId)) {
    return res.status(400).json({
      code: 'INVALID_UUID',
      message: 'Invalid user ID format',
      details: [{ field: 'userId', message: 'Must be a valid UUID' }]
    });
  }
  
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'User not found',
      details: []
    });
  }
  
  // プロフィールを更新
  if (!users[userIndex].profile) {
    users[userIndex].profile = {};
  }
  
  if (bio !== undefined) users[userIndex].profile.bio = bio;
  if (avatarUrl !== undefined) users[userIndex].profile.avatarUrl = avatarUrl;
  if (socialLinks !== undefined) users[userIndex].profile.socialLinks = socialLinks;
  if (skills !== undefined) users[userIndex].profile.skills = skills;
  
  users[userIndex].updatedAt = new Date().toISOString();
  
  res.json({ message: 'Profile updated successfully' });
});

// ==========================================
// DELETE /posts/{postId} - 投稿削除
// OpenAPI: deletePost
// ==========================================
app.delete('/v1/posts/:postId', (req, res) => {
  const { userId } = req.params;
  const { permanent, reason } = req.query;
  
  // UUIDバリデーション
  if (!validateUUID(userId)) {
    return res.status(400).json({
      code: 'INVALID_UUID',
      message: 'Invalid user ID format',
      details: [{ field: 'userId', message: 'Must be a valid UUID' }]
    });
  }
  
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'User not found',
      details: []
    });
  }
  
  if (permanent === 'true') {
    // 完全削除
    users.splice(userIndex, 1);
  } else {
    // 論理削除
    users[userIndex].status = 'deleted';
    users[userIndex].deletedAt = new Date().toISOString();
  }
  
  res.status(204).send();
});

// ==========================================
// PATCH /posts/{postId}/status - 投稿ステータス更新
// OpenAPI: patchPostStatus
// ==========================================
app.patch('/v1/posts/:postId/status', (req, res) => {
  const { postId } = req.params;
  
  const postIndex = posts.findIndex(p => p.id === parseInt(postId));
  
  if (postIndex === -1) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'Post not found',
      details: []
    });
  }
  
  posts.splice(postIndex, 1);
  
  res.status(204).send();
});

// ==========================================
// DELETE /posts/{postId}/comments/{commentId} - コメント削除
// OpenAPI: deleteComment
// ==========================================
app.delete('/v1/posts/:postId/comments/:commentId', (req, res) => {
  const { postId, commentId } = req.params;
  const { notifyAuthor } = req.query;
  
  const post = posts.find(p => p.id === parseInt(postId));
  
  if (!post) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'Post not found',
      details: []
    });
  }
  
  // UUIDバリデーション
  if (!validateUUID(commentId)) {
    return res.status(400).json({
      code: 'INVALID_UUID',
      message: 'Invalid comment ID format',
      details: [{ field: 'commentId', message: 'Must be a valid UUID' }]
    });
  }
  
  // コメント削除の処理（ダミー）
  console.log(`Deleting comment ${commentId} from post ${postId}, notifyAuthor: ${notifyAuthor}`);
  
  res.status(204).send();
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`テストサーバーが起動しました`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`========================================\n`);
  console.log(`利用可能なエンドポイント:`);
  console.log(`  GET    /v1/users`);
  console.log(`  GET    /v1/users/:userId`);
  console.log(`  POST   /v1/users`);
  console.log(`  PUT    /v1/users/:userId`);
  console.log(`  PATCH  /v1/users/:userId`);
  console.log(`  PATCH  /v1/users/:userId/profile`);
  console.log(`  DELETE /v1/users/:userId`);
  console.log(`  POST   /v1/posts`);
  console.log(`  PUT    /v1/posts/:postId`);
  console.log(`  PATCH  /v1/posts/:postId/status`);
  console.log(`  DELETE /v1/posts/:postId`);
  console.log(`  DELETE /v1/posts/:postId/comments/:commentId`);
  console.log(`\n========================================\n`);
});

