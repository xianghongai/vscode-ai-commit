import assert from 'node:assert/strict';
import { test } from 'vitest';
import { sanitizeCommitMessage } from '@/commit-message';

test('strips a wrapping Markdown code fence', () => {
  assert.equal(sanitizeCommitMessage('```\nfeat: add x\n\n- body\n```'), 'feat: add x\n\n- body');
});

test('strips a wrapping fence with a language tag and surrounding whitespace', () => {
  assert.equal(sanitizeCommitMessage('\n```text\r\nfeat: add x\r\n\r\n- body\r\n```\n'), 'feat: add x\r\n\r\n- body');
});

test('trims a plain response without altering internal content', () => {
  assert.equal(sanitizeCommitMessage('  feat: add x\n\n- body  '), 'feat: add x\n\n- body');
});

test('keeps a commit message that contains an internal code block', () => {
  const message = 'docs: explain config\n\n```json\n{"headers": {}}\n```';
  assert.equal(sanitizeCommitMessage(message), message);
});

test('keeps an unmatched leading fence', () => {
  assert.equal(sanitizeCommitMessage('```\nfeat: add x'), '```\nfeat: add x');
});
