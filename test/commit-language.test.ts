import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  AUTO_COMMIT_LANGUAGE,
  DEFAULT_COMMIT_LANGUAGE,
  detectCommitLanguage,
  resolveCommitLanguage,
  resolveCommitLanguageForRepository,
} from '@/commit-language';

const ENGLISH = [
  'remove unused imports and simplify the error handling path',
  'document the new retry behavior and update the changelog',
  'ensure the staged diff is read from the selected repository',
];

const SIMPLIFIED_CHINESE = [
  '修复重新连接服务器时重复通知的问题',
  '优化配置文件的读取逻辑并补充单元测试',
  '更新文档并修复若干拼写错误',
  '新增对多根工作区仓库语言检测的支持',
];

const TRADITIONAL_CHINESE = [
  '修復重新連線伺服器時重複通知的問題',
  '最佳化設定檔的讀取邏輯並補上單元測試',
  '更新文件並修復若干拼寫錯誤',
  '新增對多根工作區倉庫語言偵測的支援',
];

const JAPANESE = [
  '再接続時の重複通知を修正',
  '設定ファイルの読み込みロジックを最適化',
  '多言語対応のドキュメントを更新',
];

const KOREAN = [
  '서버 재연결 시 중복 알림 문제 수정',
  '설정 파일 읽기 로직을 최적화하고 단위 테스트 추가',
  '다중 루트 워크스페이스 지원 추가',
];

const RUSSIAN = [
  'исправить повторные уведомления при переподключении к серверу',
  'обновить документацию и исправить опечатки',
  'добавить поддержку нескольких корневых папок',
];

const GERMAN = [
  'füge eine Wiederholungslogik für WebSocket-Verbindungen hinzu',
  'überarbeite die Konfigurationsdatei und ergänze die Dokumentation',
  'verbessere die Fehlerbehandlung beim erneuten Herstellen der Verbindung',
  'entferne die veraltete Option aus dem Ladevorgang und korrigiere die Fehler',
];

const FRENCH = [
  'corrige les notifications en double lors de la reconnexion au serveur',
  'mets à jour la documentation et corrige les fautes de frappe',
  'ajoute la prise en charge des espaces de travail multi-racines',
];

const SPANISH = [
  'corrige las notificaciones duplicadas al reconectar con el servidor',
  'actualiza la documentación y corrige los errores tipográficos',
  'añade compatibilidad con espacios de trabajo de varias raíces',
];

const BAHASA = [
  'perbarui dokumentasi dan perbaiki kesalahan ketik',
  'membetulkan pemberitahuan pendua apabila sambungan pelayan terputus',
  'tambahkan dukungan untuk ruang kerja dengan banyak akar',
];

test('exposes the Auto mode and English fallback contract', () => {
  assert.equal(AUTO_COMMIT_LANGUAGE, 'Auto');
  assert.equal(DEFAULT_COMMIT_LANGUAGE, 'English');
});

test('detects English', () => assert.equal(detectCommitLanguage(ENGLISH), 'English'));
test('detects Simplified Chinese', () => assert.equal(detectCommitLanguage(SIMPLIFIED_CHINESE), 'Simplified Chinese'));
test('detects Traditional Chinese', () =>
  assert.equal(detectCommitLanguage(TRADITIONAL_CHINESE), 'Traditional Chinese'));
test('detects Japanese', () => assert.equal(detectCommitLanguage(JAPANESE), 'Japanese'));
test('detects Korean', () => assert.equal(detectCommitLanguage(KOREAN), 'Korean'));
test('detects Russian', () => assert.equal(detectCommitLanguage(RUSSIAN), 'Russian'));
test('detects German', () => assert.equal(detectCommitLanguage(GERMAN), 'German'));
test('detects French', () => assert.equal(detectCommitLanguage(FRENCH), 'French'));
test('detects Spanish', () => assert.equal(detectCommitLanguage(SPANISH), 'Spanish'));
test('aggregates Indonesian and Malay into Bahasa', () => assert.equal(detectCommitLanguage(BAHASA), 'Bahasa'));

test('uses the majority when subjects are mixed', () => {
  assert.equal(detectCommitLanguage([...SIMPLIFIED_CHINESE.slice(0, 3), ENGLISH[0]]), 'Simplified Chinese');
});

test('strips conventional and gitmoji prefixes before detection', () => {
  assert.equal(
    detectCommitLanguage(['chore(dependencies): 更新文档', '✨ feat(ui): 优化配置', 'refactor(database): 补充测试']),
    'Simplified Chinese'
  );
});

test('returns undefined for empty or prefix-only input', () => {
  assert.equal(detectCommitLanguage([]), undefined);
  assert.equal(detectCommitLanguage(['feat(api):', 'chore(deps)!:', '✨', ':sparkles:']), undefined);
});

test('requires at least three agreeing detections', () => {
  assert.equal(detectCommitLanguage(ENGLISH.slice(0, 2)), undefined);
  assert.equal(detectCommitLanguage([SIMPLIFIED_CHINESE[0], SIMPLIFIED_CHINESE[1], ENGLISH[0], ENGLISH[1]]), undefined);
});

test('defaults to Simplified Chinese when there are no script markers', () => {
  assert.equal(detectCommitLanguage(['更新提交信息', '更新提交信息', '更新提交信息']), 'Simplified Chinese');
});

test('defaults to Simplified Chinese when marker counts tie', () => {
  assert.equal(detectCommitLanguage(['修复问题', '修復問題', '更新提交信息']), 'Simplified Chinese');
});

test('keeps explicit language values unchanged', () => {
  assert.equal(resolveCommitLanguage('German', SIMPLIFIED_CHINESE), 'German');
  assert.equal(resolveCommitLanguage('Traditional Chinese', SIMPLIFIED_CHINESE), 'Traditional Chinese');
  assert.equal(resolveCommitLanguage('English', JAPANESE), 'English');
});

test('resolves Auto and falls back to English', () => {
  assert.equal(resolveCommitLanguage(AUTO_COMMIT_LANGUAGE, SIMPLIFIED_CHINESE), 'Simplified Chinese');
  assert.equal(resolveCommitLanguage(AUTO_COMMIT_LANGUAGE, TRADITIONAL_CHINESE), 'Traditional Chinese');
  assert.equal(resolveCommitLanguage(AUTO_COMMIT_LANGUAGE, JAPANESE), 'Japanese');
  assert.equal(resolveCommitLanguage(AUTO_COMMIT_LANGUAGE, []), DEFAULT_COMMIT_LANGUAGE);
  assert.equal(resolveCommitLanguage(AUTO_COMMIT_LANGUAGE, ['feat(api):']), DEFAULT_COMMIT_LANGUAGE);
  assert.equal(resolveCommitLanguage(AUTO_COMMIT_LANGUAGE, [JAPANESE[0]]), DEFAULT_COMMIT_LANGUAGE);
});

test('samples repository history only once per detection result', async () => {
  let samples = 0;
  const loadSubjects = async () => {
    samples += 1;
    return SIMPLIFIED_CHINESE;
  };

  const first = await resolveCommitLanguageForRepository('/repo/cached', AUTO_COMMIT_LANGUAGE, loadSubjects);
  const second = await resolveCommitLanguageForRepository('/repo/cached', AUTO_COMMIT_LANGUAGE, loadSubjects);

  assert.equal(first, 'Simplified Chinese');
  assert.equal(second, 'Simplified Chinese');
  assert.equal(samples, 1);
});

test('retries inconclusive samples instead of caching the fallback', async () => {
  let samples = 0;
  const loadSubjects = async () => {
    samples += 1;
    return ['feat(api):'];
  };

  const first = await resolveCommitLanguageForRepository('/repo/inconclusive', AUTO_COMMIT_LANGUAGE, loadSubjects);
  const second = await resolveCommitLanguageForRepository('/repo/inconclusive', AUTO_COMMIT_LANGUAGE, loadSubjects);

  assert.equal(first, DEFAULT_COMMIT_LANGUAGE);
  assert.equal(second, DEFAULT_COMMIT_LANGUAGE);
  assert.equal(samples, 2);
});

test('skips history sampling for explicit language values', async () => {
  let samples = 0;
  const language = await resolveCommitLanguageForRepository('/repo/explicit', 'German', async () => {
    samples += 1;
    return SIMPLIFIED_CHINESE;
  });

  assert.equal(language, 'German');
  assert.equal(samples, 0);
});
