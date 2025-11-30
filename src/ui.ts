import { ValidationResult } from './types';

/**
 * 成功メッセージを表示
 */
export function showSuccess(elementId: string, message: string): void {
  const element = document.getElementById(elementId);
  if (element) {
    element.className = 'status-message success';
    element.textContent = message;
  }
}

/**
 * エラーメッセージを表示
 */
export function showError(elementId: string, message: string): void {
  const element = document.getElementById(elementId);
  if (element) {
    element.className = 'status-message error';
    element.textContent = message;
  }
}

/**
 * メッセージをクリア
 */
export function clearMessage(elementId: string): void {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = '';
    element.className = 'status-message';
  }
}

/**
 * バリデーション結果を表示
 */
export function displayValidationResults(
  requestResult: ValidationResult | null,
  responseResult: ValidationResult | null,
  matchedPath: string,
  matchedMethod: string
): void {
  const resultsSection = document.getElementById('results-section');
  const resultsContent = document.getElementById('validation-results');
  
  if (!resultsSection || !resultsContent) {
    return;
  }

  resultsSection.style.display = 'block';
  
  let html = `<div class="result-item">
    <h3>マッチしたパス</h3>
    <p><code>${matchedMethod.toUpperCase()} ${matchedPath}</code></p>
  </div>`;

  // リクエストボディの結果
  if (requestResult) {
    const statusClass = requestResult.valid ? 'success' : 'error';
    const statusText = requestResult.valid ? '✓ 有効' : '✗ 無効';
    
    html += `<div class="result-item ${statusClass}">
      <h3>リクエストボディ: ${statusText}</h3>`;
    
    if (requestResult.errors.length > 0) {
      html += '<ul class="error-list">';
      requestResult.errors.forEach(error => {
        html += `<li><strong>${error.path}</strong>: ${error.message}</li>`;
      });
      html += '</ul>';
    }
    
    html += '</div>';
  }

  // レスポンスボディの結果
  if (responseResult) {
    const statusClass = responseResult.valid ? 'success' : 'error';
    const statusText = responseResult.valid ? '✓ 有効' : '✗ 無効';
    
    html += `<div class="result-item ${statusClass}">
      <h3>レスポンスボディ: ${statusText}</h3>`;
    
    if (responseResult.errors.length > 0) {
      html += '<ul class="error-list">';
      responseResult.errors.forEach(error => {
        html += `<li><strong>${error.path}</strong>: ${error.message}</li>`;
      });
      html += '</ul>';
    }
    
    html += '</div>';
  }

  resultsContent.innerHTML = html;
  
  // 結果セクションまでスクロール
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * ボタンの有効/無効を切り替え
 */
export function setButtonEnabled(buttonId: string, enabled: boolean): void {
  const button = document.getElementById(buttonId) as HTMLButtonElement;
  if (button) {
    button.disabled = !enabled;
  }
}

/**
 * 入力フィールドの値を取得
 */
export function getInputValue(elementId: string): string {
  const element = document.getElementById(elementId) as HTMLInputElement | HTMLTextAreaElement;
  return element ? element.value : '';
}

/**
 * セレクトフィールドの値を取得
 */
export function getSelectValue(elementId: string): string {
  const element = document.getElementById(elementId) as HTMLSelectElement;
  return element ? element.value : '';
}

/**
 * ファイル名を表示
 */
export function displayFileName(fileName: string): void {
  const fileNameElement = document.getElementById('file-name');
  if (fileNameElement) {
    fileNameElement.textContent = fileName;
  }
}

