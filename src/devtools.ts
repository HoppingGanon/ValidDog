/**
 * DevTools起動スクリプト
 * パネルを作成してDevToolsに登録する
 */

chrome.devtools.panels.create(
  'ValidKun',
  '', // アイコンパス（オプション）
  'panel.html',
  (_panel) => {
    console.log('ValidKun panel created');
  }
);
