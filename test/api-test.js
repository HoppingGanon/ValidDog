/**
 * OpenAPI テストスクリプト（Node.js版）
 *
 * 共通テストケース（test-cases.js）を使用してAPIテストを実行します。
 * ブラウザ版（test.html）と同じテストケースを使用しています。
 *
 * 使用方法:
 *   node api-test.js [オプション]
 *
 * オプション:
 *   --all       すべてのテストを実行（デフォルト）
 *   --users     Users APIのテストのみ実行
 *   --posts     Posts APIのテストのみ実行
 *   --errors    エラーケースのテストのみ実行
 *   --help      ヘルプを表示
 */

import {
  DEFAULT_BASE_URL,
  usersTests,
  postsTests,
  headerTests,
  pathParamTests,
  errorTests,
  getTestBody,
  getTestHeaders,
  getTotalTestCount,
} from './test-cases.js';

const BASEURL = process.env.API_URL || DEFAULT_BASE_URL;

// =============================================================================
// カラー出力用ヘルパー
// =============================================================================
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

const log = {
  info: (text) => console.log(`${colors.cyan}${text}${colors.reset}`),
  success: (text) => console.log(`${colors.green}${text}${colors.reset}`),
  error: (text) => console.log(`${colors.red}${text}${colors.reset}`),
  url: (text) => console.log(`${colors.yellow}${text}${colors.reset}`),
  dim: (text) => console.log(`${colors.dim}${text}${colors.reset}`),
  method: (method) => {
    const methodColors = {
      GET: colors.blue,
      POST: colors.green,
      PUT: colors.yellow,
      PATCH: colors.cyan,
      DELETE: colors.red,
    };
    return `${methodColors[method] || colors.white}${method}${colors.reset}`;
  },
};

// =============================================================================
// テスト実行関数（Node.js版）
// =============================================================================
async function runTest(testCase) {
  const { method, path, desc } = testCase;
  const body = getTestBody(testCase);
  const customHeaders = getTestHeaders(testCase);
  const url = BASEURL + path;

  console.log('\n' + '─'.repeat(60));
  log.info(desc);
  console.log(`${log.method(method)} ${colors.yellow}${url}${colors.reset}`);

  // カスタムヘッダーの表示
  if (Object.keys(customHeaders).length > 0) {
    log.dim('Request Headers:');
    for (const [key, value] of Object.entries(customHeaders)) {
      console.log(`  ${key}: ${value}`);
    }
  }

  if (body) {
    log.dim('Request Body:');
    console.log(JSON.stringify(body, null, 2));
  }

  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...customHeaders },
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(url, options);
    const status = res.status;

    const statusColor = status >= 400 ? colors.red : colors.green;
    console.log(`\n${statusColor}Response: ${status} ${res.statusText}${colors.reset}`);

    // レスポンスヘッダーの表示（カスタムヘッダーがあった場合のみ）
    if (Object.keys(customHeaders).length > 0) {
      log.dim('Response Headers:');
      for (const [key, value] of res.headers.entries()) {
        if (key.startsWith('aaa-res-')) {
          console.log(`  ${key}: ${value}`);
        }
      }
    }

    if (status !== 204) {
      try {
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
      } catch {
        const text = await res.text();
        if (text) {
          console.log(text);
        } else {
          log.dim('(Empty body)');
        }
      }
    } else {
      log.dim('(No Content)');
    }

    return { success: true, status };
  } catch (err) {
    log.error(`Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// =============================================================================
// テスト実行
// =============================================================================
async function runTestGroup(tests, groupName) {
  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bright}${colors.magenta} ${groupName} ${colors.reset}`);
  console.log('═'.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const testCase of tests) {
    const result = await runTest(testCase);
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
  }

  return { passed, failed, total: tests.length };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
OpenAPI テストスクリプト（Node.js版）

共通テストケース（test-cases.js）を使用しています。
ブラウザ版（test.html）と同じテストケースが実行されます。

使用方法:
  node api-test.js [オプション]

オプション:
  --all       すべてのテストを実行（デフォルト）
  --users     Users APIのテストのみ実行
  --posts     Posts APIのテストのみ実行
  --headers   ヘッダーバリデーションテストのみ実行
  --pathparams パスパラメータテストのみ実行
  --errors    エラーケースのテストのみ実行
  --help      ヘルプを表示

環境変数:
  API_URL     APIのベースURL（デフォルト: ${DEFAULT_BASE_URL}）

例:
  node api-test.js --all
  node api-test.js --users --posts
  node api-test.js --headers --pathparams
  API_URL=http://localhost:3002 node api-test.js --all

テストケース数:
  Users API:     ${usersTests.length}件
  Posts API:     ${postsTests.length}件
  Headers:       ${headerTests.length}件
  Path Params:   ${pathParamTests.length}件
  Errors:        ${errorTests.length}件
  合計:          ${getTotalTestCount()}件
`);
    process.exit(0);
  }

  console.log('\n' + '▓'.repeat(60));
  console.log(
    `${colors.bright}${colors.cyan}        OpenAPI テストスクリプト（Node.js版）${colors.reset}`,
  );
  console.log('▓'.repeat(60));
  console.log(`\nServer: ${colors.yellow}${BASEURL}${colors.reset}`);
  console.log(`テストケースファイル: ${colors.dim}test-cases.js${colors.reset}\n`);

  const runAll = args.length === 0 || args.includes('--all');
  const runUsers = runAll || args.includes('--users');
  const runPosts = runAll || args.includes('--posts');
  const runHeaders = runAll || args.includes('--headers');
  const runPathParams = runAll || args.includes('--pathparams');
  const runErrors = runAll || args.includes('--errors');

  const results = [];

  if (runUsers) {
    results.push(await runTestGroup(usersTests, 'Users API テスト'));
  }

  if (runPosts) {
    results.push(await runTestGroup(postsTests, 'Posts API テスト'));
  }

  if (runHeaders) {
    results.push(await runTestGroup(headerTests, 'Headers バリデーションテスト'));
  }

  if (runPathParams) {
    results.push(await runTestGroup(pathParamTests, 'Path Parameters テスト'));
  }

  if (runErrors) {
    results.push(await runTestGroup(errorTests, 'Error Cases テスト'));
  }

  // サマリー
  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bright}${colors.white} テスト結果サマリー ${colors.reset}`);
  console.log('═'.repeat(60));

  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;

  for (const result of results) {
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalTests += result.total;
  }

  console.log(`\n  実行: ${totalTests} テスト`);
  console.log(`  ${colors.green}成功: ${totalPassed}${colors.reset}`);
  console.log(`  ${colors.red}失敗: ${totalFailed}${colors.reset}`);
  console.log('\n' + '═'.repeat(60) + '\n');
}

// 実行
main().catch((err) => {
  console.error('エラーが発生しました:', err);
  process.exit(1);
});
