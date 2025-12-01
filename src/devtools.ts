/**
 * DevTools起動スクリプト
 * パネルを作成してDevToolsに登録する
 */

chrome.devtools.panels.create(
  'ValidDog',
  '', // アイコンパス（オプション）
  'panel.html',
  (_panel) => {
    console.log('ValidDog panel created');
  }
);
