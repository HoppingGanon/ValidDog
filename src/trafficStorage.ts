/**
 * トラフィック履歴の管理
 */

export interface TrafficEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody?: string;
  matchedPath?: string;
  validationResult?: {
    requestValid: boolean;
    responseValid: boolean;
    requestErrors: Array<{ path: string; message: string }>;
    responseErrors: Array<{ path: string; message: string }>;
  };
}

const TRAFFIC_KEY = 'traffic_history';
const MAX_TRAFFIC_ENTRIES = 1000;

/**
 * トラフィック履歴を保存
 */
export async function saveTraffic(entry: TrafficEntry): Promise<void> {
  try {
    const history = await getTrafficHistory();
    history.unshift(entry);
    
    // 最大件数を超えたら古いものを削除
    if (history.length > MAX_TRAFFIC_ENTRIES) {
      history.splice(MAX_TRAFFIC_ENTRIES);
    }
    
    await chrome.storage.local.set({ [TRAFFIC_KEY]: history });
  } catch (error) {
    console.error('Failed to save traffic:', error);
  }
}

/**
 * トラフィック履歴を取得
 */
export async function getTrafficHistory(): Promise<TrafficEntry[]> {
  try {
    const result = await chrome.storage.local.get(TRAFFIC_KEY);
    return result[TRAFFIC_KEY] || [];
  } catch (error) {
    console.error('Failed to get traffic history:', error);
    return [];
  }
}

/**
 * トラフィック履歴をクリア
 */
export async function clearTrafficHistory(): Promise<void> {
  await chrome.storage.local.remove(TRAFFIC_KEY);
}

/**
 * トラフィック履歴の変更を監視
 */
export function onTrafficChange(callback: (history: TrafficEntry[]) => void): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[TRAFFIC_KEY]) {
      const newValue = changes[TRAFFIC_KEY].newValue || [];
      callback(newValue);
    }
  });
}

