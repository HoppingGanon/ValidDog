/**
 * DevToolsスクリプト
 *
 * DevToolsパネルを作成
 */

// DevToolsパネルを作成
chrome.devtools.panels.create('ValidDog', 'icons/icon16.png', 'panel.html', () => {
  console.log('ValidDog panel created');
});
