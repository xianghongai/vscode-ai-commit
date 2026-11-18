const WRAPPING_CODE_FENCE_PATTERN = /^```[^\n]*\r?\n([\s\S]*?)\r?\n?```$/;

/** 模型整体回复被 Markdown 代码块包裹时只保留块内内容，并去除首尾空白。 */
export function sanitizeCommitMessage(message: string): string {
  const trimmed = message.trim();
  const wrapped = WRAPPING_CODE_FENCE_PATTERN.exec(trimmed);
  return (wrapped ? wrapped[1] : trimmed).trim();
}
