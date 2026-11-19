# AI Commit

<p align="center">
  <a href="https://github.com/xianghongai/vscode-ai-commit">
    <img src="https://img.shields.io/github/repo-size/xianghongai/vscode-ai-commit?color=4ac51c&style=plastic&?cacheSeconds=3600">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=nicholashsiang.vscode-ai-commit">
    <img src="https://img.shields.io/visual-studio-marketplace/v/nicholashsiang.vscode-ai-commit?color=%234ac51c&style=plastic&?cacheSeconds=3600">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=nicholashsiang.vscode-ai-commit">
    <img src="https://img.shields.io/visual-studio-marketplace/d/nicholashsiang.vscode-ai-commit?color=4ac51c&style=plastic&?cacheSeconds=3600">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=nicholashsiang.vscode-ai-commit">
    <img src="https://img.shields.io/visual-studio-marketplace/r/nicholashsiang.vscode-ai-commit?color=4ac51c&style=plastic&?cacheSeconds=3600">
  </a>
  <a href="https://github.com/xianghongai/vscode-ai-commit">
    <img src="https://img.shields.io/github/license/xianghongai/vscode-ai-commit?color=4ac51c&style=plastic&?cacheSeconds=3600">
  </a>
</p>

![Screenshot](https://raw.githubusercontent.com/xianghongai/vscode-ai-commit/main/images/screenshots.gif)

Adhere to the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/)."

## Supported Providers

- [x] `openai-compatible`
- [x] `openai`
- [x] `openrouter`
- [x] `gemini`
- [x] `azure-openai`
- [x] `ollama`

## Configuration example

```json
{
  "ai-commit.providers": [
    {
      "id": "deepseek-v4-flash",
      "type": "openai-compatible",
      "baseUrl": "https://api.deepseek.com",
      "apiKey": "${env:DEEPSEEK_API_KEY}",
      "model": "deepseek-v4-flash",
      "params": {
        "temperature": 0.4
      }
    },
    {
      "id": "deepseek-ai/DeepSeek-V4-Flash",
      "type": "openai-compatible",
      "baseUrl": "https://api.siliconflow.cn/v1",
      "apiKey": "${env:SILICONFLOW_DEEPSEEK_API_KEY}",
      "model": "deepseek-ai/DeepSeek-V4-Flash",
      "params": {
        "temperature": 0.4
      }
    },
    {
      "id": "compatible-default",
      "type": "openai-compatible",
      "baseUrl": "<OPENAI_COMPATIBLE_BASE_URL>",
      "apiKey": "${env:OPENAI_COMPATIBLE_API_KEY}",
      "model": "<MODEL_NAME>",
      "params": { "temperature": 0.4 }
    },
    {
      "id": "openai-default",
      "type": "openai",
      "apiKey": "${env:OPENAI_API_KEY}",
      "model": "<OPENAI_MODEL>",
      "params": { "temperature": 0.3 }
    },
    {
      "id": "gemini-default",
      "type": "gemini",
      "apiKey": "${env:GEMINI_API_KEY}",
      "model": "<GEMINI_MODEL>",
      "params": { "temperature": 0.4 }
    },
    {
      "id": "azure-openai-default",
      "type": "azure-openai",
      "endpoint": "<AZURE_OPENAI_ENDPOINT>",
      "apiKey": "${env:AZURE_OPENAI_API_KEY}",
      "apiVersion": "<AZURE_OPENAI_API_VERSION>",
      "deployment": "<DEPLOYMENT_NAME>",
      "model": "<MODEL_NAME>",
      "params": { "temperature": 0.3 }
    },
    {
      "id": "ollama-local",
      "type": "ollama",
      "model": "<OLLAMA_MODEL>",
      "timeoutMs": 120000,
      "params": { "temperature": 0.3 }
    }
  ],
  "ai-commit.activeProviderId": "compatible-default",
  "ai-commit.commitLanguage": "English"
}
```

When `ai-commit.commitLanguage` is set to `"Auto"`, the extension samples up to 5 recent non-merge commits from the target repository, ignores dependency-bot commits, and uses the dominant language. Conclusive results are cached per repository, so later generations do not repeat the detection. In multi-root workspaces, detection runs per target repository. If the history is empty, undetectable, or inconclusive, it falls back to English. Explicit language values behave as before.

Set temperature to a relatively low value (0.2 to 0.5) for more stable and concise commit messages.

`apiKey` accepts a plaintext key/token or an environment-variable reference using `${env:VARIABLE_NAME}` [^1]. The environment variable must be available to the VS Code Extension Host. Completely quit and restart VS Code after changing it.

### Custom request headers

`headers` adds custom HTTP headers to provider requests. Values are literal strings and do not support `${env:...}` interpolation. If a header value needs a stable session ID, set the value to exactly `{{SESSION_ID}}`:

```json
"headers": {
  "<HEADER_NAME>": "{{SESSION_ID}}"
}
```

The extension generates the UUID once per VS Code window (extension host) and reuses it for that window. Reloading the window or restarting VS Code generates a new value. The placeholder must be the entire header value; values such as `{{session_id}}`, `prefix-{{SESSION_ID}}`, or values with surrounding whitespace are sent literally.

## Credits

- <https://github.com/sitoi/ai-commit>

## License

MIT。

---

[^1]: VS Code does not automatically interpolate `${env:VARIABLE_NAME}` in arbitrary settings. Debug and task configurations such as `launch.json` and `tasks.json` support the syntax; this extension resolves it internally.
