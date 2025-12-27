/**
 * バックグラウンドスクリプト
 *
 * トラフィックデータの管理とDevToolsパネルへの配信を行う
 */

import type { TrafficEntry, ExtensionMessage } from './types';

// トラフィックデータをタブごとに保持
const trafficByTab: Map<number, TrafficEntry[]> = new Map();

// 接続されたDevToolsパネル
const connectedPanels: Map<number, chrome.runtime.Port> = new Map();

/**
 * DevToolsパネルからの接続を処理
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name.startsWith('devtools-panel-')) {
    const tabId = parseInt(port.name.replace('devtools-panel-', ''), 10);

    connectedPanels.set(tabId, port);

    // 切断時の処理
    port.onDisconnect.addListener(() => {
      connectedPanels.delete(tabId);
    });

    // メッセージ受信
    port.onMessage.addListener((message: ExtensionMessage) => {
      handlePanelMessage(tabId, message, port);
    });

    // 既存のトラフィックを送信
    const existingTraffic = trafficByTab.get(tabId) || [];
    port.postMessage({
      type: 'TRAFFIC_UPDATE',
      payload: existingTraffic,
    });
  }
});

/**
 * パネルからのメッセージを処理
 */
function handlePanelMessage(
  tabId: number,
  message: ExtensionMessage,
  port: chrome.runtime.Port,
): void {
  switch (message.type) {
    case 'GET_TRAFFIC': {
      const traffic = trafficByTab.get(tabId) || [];
      port.postMessage({
        type: 'TRAFFIC_UPDATE',
        payload: traffic,
      });
      break;
    }

    case 'CLEAR_TRAFFIC': {
      trafficByTab.set(tabId, []);
      port.postMessage({
        type: 'TRAFFIC_UPDATE',
        payload: [],
      });
      break;
    }
  }
}

/**
 * トラフィックエントリを追加（外部から呼び出し用）
 */
export function addTrafficEntry(tabId: number, entry: TrafficEntry): void {
  if (!trafficByTab.has(tabId)) {
    trafficByTab.set(tabId, []);
  }

  const traffic = trafficByTab.get(tabId)!;
  traffic.push(entry);

  // 最大1000件まで保持
  if (traffic.length > 1000) {
    traffic.shift();
  }

  // 接続されたパネルに通知
  const panel = connectedPanels.get(tabId);
  if (panel) {
    panel.postMessage({
      type: 'TRAFFIC_UPDATE',
      payload: traffic,
    });
  }
}

/**
 * タブが閉じられた時のクリーンアップ
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  trafficByTab.delete(tabId);
  connectedPanels.delete(tabId);
});

// Service Worker起動時のログ
console.log('ValidDog background service worker started');
