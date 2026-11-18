import assert from 'node:assert/strict';
import { test } from 'vitest';
import { parseProviderConfigs, selectActiveProvider } from '@/providers/config';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('parses OpenAI without requiring a custom base URL', () => {
  const providers = parseProviderConfigs([{ id: 'openai', type: 'openai', model: 'model', apiKey: 'key' }]);
  assert.equal(providers[0].type, 'openai');
  assert.equal('baseUrl' in providers[0] ? providers[0].baseUrl : undefined, undefined);
});

test('passes a plaintext API key through unchanged', () => {
  const providers = parseProviderConfigs([{ id: 'openai', type: 'openai', model: 'model', apiKey: 'plaintext-key' }]);

  const activeProvider = selectActiveProvider(providers, 'openai');
  assert.equal('apiKey' in activeProvider ? activeProvider.apiKey : undefined, 'plaintext-key');
});

test('resolves the documented API key environment placeholder for the active provider', () => {
  process.env.AI_COMMIT_TEST_KEY = 'resolved-key';
  try {
    const providers = parseProviderConfigs([
      {
        id: 'openai',
        type: 'openai',
        model: 'model',
        apiKey: '${env:AI_COMMIT_TEST_KEY}',
      },
    ]);
    const activeProvider = selectActiveProvider(providers, 'openai');
    assert.equal('apiKey' in activeProvider ? activeProvider.apiKey : undefined, 'resolved-key');
  } finally {
    delete process.env.AI_COMMIT_TEST_KEY;
  }
});

test('rejects duplicate provider IDs', () => {
  assert.throws(
    () =>
      parseProviderConfigs([
        { id: 'same', type: 'ollama', model: 'first' },
        { id: 'same', type: 'ollama', model: 'second' },
      ]),
    /duplicated/
  );
});

test('rejects a stale active provider instead of falling back', () => {
  const providers = parseProviderConfigs([{ id: 'local', type: 'ollama', model: 'model' }]);
  assert.throws(() => selectActiveProvider(providers, 'removed-provider'), /was not found/);
});

test('allows inactive provider templates without API keys', () => {
  const providers = parseProviderConfigs([
    { id: 'active', type: 'openai', model: 'active-model', apiKey: 'key' },
    {
      id: 'template',
      type: 'openai-compatible',
      model: 'template-model',
      baseUrl: 'https://example.invalid/v1',
    },
  ]);

  assert.equal(selectActiveProvider(providers, 'active').id, 'active');
  assert.throws(
    () => selectActiveProvider(providers, 'template'),
    /provider 'template' \(providers\[1\]\)\.apiKey is required for the active provider/
  );
});

test('requires an API key when the first provider is implicitly active', () => {
  const providers = parseProviderConfigs([{ id: 'template', type: 'openai', model: 'template-model' }]);

  assert.throws(
    () => selectActiveProvider(providers),
    /provider 'template' \(providers\[0\]\)\.apiKey is required for the active provider/
  );
});

test('treats an unresolved API key as an allowed inactive template credential', () => {
  delete process.env.AI_COMMIT_MISSING_TEST_KEY;
  const providers = parseProviderConfigs([
    {
      id: 'template',
      type: 'gemini',
      model: 'template-model',
      apiKey: '${env:AI_COMMIT_MISSING_TEST_KEY}',
    },
    { id: 'local', type: 'ollama', model: 'local-model' },
  ]);

  assert.equal('apiKey' in providers[0] ? providers[0].apiKey : undefined, '${env:AI_COMMIT_MISSING_TEST_KEY}');
  assert.equal(selectActiveProvider(providers, 'local').id, 'local');
  assert.throws(
    () => selectActiveProvider(providers, 'template'),
    /references environment variable 'AI_COMMIT_MISSING_TEST_KEY' for apiKey, but it is not set/
  );
});

test('validates provider-specific required fields', () => {
  assert.throws(
    () => parseProviderConfigs([{ id: 'compatible', type: 'openai-compatible', model: 'model', apiKey: 'key' }]),
    /baseUrl is required/
  );
  assert.throws(
    () => parseProviderConfigs([{ id: 'azure', type: 'azure-openai', model: 'model', apiKey: 'key' }]),
    /endpoint is required/
  );
});

test('replaces the exact SESSION_ID header placeholder with a generated UUID', () => {
  const providers = parseProviderConfigs([
    {
      id: 'compatible',
      type: 'openai-compatible',
      baseUrl: 'https://example.invalid/v1',
      apiKey: 'key',
      model: 'model',
      headers: { 'x-session-id': '{{SESSION_ID}}' },
    },
  ]);

  const sessionId = providers[0].headers?.['x-session-id'];
  assert.ok(sessionId);
  assert.match(sessionId, UUID_V4_PATTERN);
  assert.notEqual(sessionId, '{{SESSION_ID}}');
});

test('keeps the generated SESSION_ID stable across parses and providers', () => {
  const fixture = [
    {
      id: 'compatible',
      type: 'openai-compatible',
      baseUrl: 'https://example.invalid/v1',
      apiKey: 'key',
      model: 'model',
      headers: {
        'x-session-id': '{{SESSION_ID}}',
        'x-request-session': '{{SESSION_ID}}',
      },
    },
    {
      id: 'local',
      type: 'ollama',
      model: 'model',
      headers: { 'x-session-id': '{{SESSION_ID}}' },
    },
  ];

  const firstParse = parseProviderConfigs(fixture);
  const secondParse = parseProviderConfigs(fixture);
  const firstId = firstParse[0].headers?.['x-session-id'];
  assert.ok(firstId);
  assert.equal(firstParse[0].headers?.['x-request-session'], firstId);
  assert.equal(firstParse[1].headers?.['x-session-id'], firstId);
  assert.equal(secondParse[0].headers?.['x-session-id'], firstId);
  assert.equal(secondParse[1].headers?.['x-session-id'], firstId);
});

test('leaves non-placeholder header values untouched', () => {
  const headers = {
    authorization: 'Bearer literal-token',
    'x-lowercase': '{{session_id}}',
    'x-embedded': 'prefix-{{SESSION_ID}}',
    'x-spaced': ' {{SESSION_ID}} ',
    'x-other-template': '{{OTHER_PLACEHOLDER}}',
  };
  const providers = parseProviderConfigs([
    {
      id: 'compatible',
      type: 'openai-compatible',
      baseUrl: 'https://example.invalid/v1',
      apiKey: 'key',
      model: 'model',
      headers,
    },
  ]);

  assert.deepEqual(providers[0].headers, headers);
});

test('rejects non-string header values even when a placeholder is present', () => {
  assert.throws(
    () =>
      parseProviderConfigs([
        {
          id: 'compatible',
          type: 'openai-compatible',
          baseUrl: 'https://example.invalid/v1',
          apiKey: 'key',
          model: 'model',
          headers: { 'x-session-id': 123 },
        },
      ]),
    /providers\[0\]\.headers\.x-session-id must be a string/
  );
});
