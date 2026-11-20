import { franc } from 'franc-min';

export const AUTO_COMMIT_LANGUAGE = 'Auto';
export const DEFAULT_COMMIT_LANGUAGE = 'English';

/**
 * franc ISO 639-3 codes restricted to the languages exposed by ai-commit.commitLanguage.
 * `only` filters candidates instead of rejecting other languages: text in an unsupported language
 * is mapped to the closest supported one (Ukrainian is reported as rus), so such repositories can
 * accumulate systematic wrong votes rather than abstaining.
 */
const FRANC_LANGUAGE_CODES: string[] = [
  'cmn',
  'jpn',
  'kor',
  'ces',
  'deu',
  'fra',
  'ita',
  'nld',
  'por',
  'vie',
  'eng',
  'spa',
  'swe',
  'rus',
  'ind',
  'zlm',
  'pol',
  'tur',
  'tha',
];

/** Sentinel used while tallying; cmn is resolved to a script variant afterwards. */
const CHINESE_VOTE = '__chinese__';

/** franc code -> enum display value. cmn is handled separately. */
const FRANC_TO_LANGUAGE: Record<string, string> = {
  ces: 'Czech',
  deu: 'German',
  eng: 'English',
  fra: 'French',
  ind: 'Bahasa',
  ita: 'Italian',
  jpn: 'Japanese',
  kor: 'Korean',
  nld: 'Dutch',
  pol: 'Polish',
  por: 'Portuguese',
  rus: 'Russian',
  spa: 'Spanish',
  swe: 'Swedish',
  tha: 'Thai',
  tur: 'Turkish',
  vie: 'Vietnamese',
  zlm: 'Bahasa',
};

/**
 * At least three detected subjects must agree on the winner. Per-subject detection is noisy:
 * short Latin subjects are easily misclassified and unsupported languages never abstain, so one
 * or two agreeing votes would make the result a coin flip. Combined with the default ten-subject
 * sample, this tolerates several undetected or misclassified subjects.
 */
const MIN_VOTES = 3;
/** The winner must also hold at least half of all detected votes, so split votes stay undecided. */
const MIN_WINNER_SHARE = 0.5;

const KANA_PATTERN = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;
const HANGUL_PATTERN = /\p{Script=Hangul}/u;
const DENSE_SCRIPT_PATTERN = /[\p{Script=Han}\p{Script=Thai}\p{Script=Cyrillic}]/u;

const FIXUP_PREFIX_PATTERN = /^(?:fixup|squash|amend)!\s+/i;
const GITMOJI_PREFIX_PATTERN = /^(?:(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\uFE0F|\u200D|\u20E3)+\s*)+/u;
const EMOJI_SHORTCODE_PATTERN = /^(?::[a-z0-9_+-]+:\s*)+/i;
const CONVENTIONAL_PREFIX_PATTERN = /^[a-z][a-z0-9-]*(?:\([^)\r\n]*\))?!?:\s*/i;

type VariantPair = readonly [simplified: string, traditional: readonly string[]];

/**
 * Curated, unambiguous divergent characters. The simplified codepoint must not
 * occur in normal Traditional prose, and every traditional form must not occur
 * in normal Simplified prose. Shared and overlapping characters are excluded.
 */
const VARIANT_PAIRS: readonly VariantPair[] = [
  ['这', ['這']],
  ['个', ['個']],
  ['们', ['們']],
  ['为', ['為']],
  ['说', ['說']],
  ['时', ['時']],
  ['会', ['會']],
  ['来', ['來']],
  ['发', ['發', '髮']],
  ['现', ['現']],
  ['开', ['開']],
  ['关', ['關']],
  ['从', ['從']],
  ['还', ['還']],
  ['进', ['進']],
  ['过', ['過']],
  ['对', ['對']],
  ['当', ['當']],
  ['应', ['應']],
  ['数', ['數']],
  ['据', ['據']],
  ['库', ['庫']],
  ['区', ['區']],
  ['仓', ['倉']],
  ['网', ['網']],
  ['页', ['頁']],
  ['体', ['體']],
  ['变', ['變']],
  ['删', ['刪']],
  ['减', ['減']],
  ['优', ['優']],
  ['测', ['測']],
  ['试', ['試']],
  ['档', ['檔']],
  ['读', ['讀']],
  ['写', ['寫']],
  ['补', ['補']],
  ['请', ['請']],
  ['错', ['錯']],
  ['误', ['誤']],
  ['处', ['處']],
  ['设', ['設']],
  ['项', ['項']],
  ['资', ['資']],
  ['调', ['調']],
  ['话', ['話']],
  ['语', ['語']],
  ['译', ['譯']],
  ['简', ['簡']],
  ['华', ['華']],
  ['国', ['國']],
  ['际', ['際']],
  ['线', ['線']],
  ['连', ['連']],
  ['权', ['權']],
  ['验', ['驗']],
  ['证', ['證']],
  ['录', ['錄']],
  ['图', ['圖']],
  ['标', ['標']],
  ['链', ['鏈']],
  ['转', ['轉']],
  ['换', ['換']],
  ['缓', ['緩']],
  ['储', ['儲']],
  ['单', ['單']],
  ['问', ['問']],
  ['题', ['題']],
  ['实', ['實']],
  ['认', ['認']],
  ['响', ['響']],
  ['务', ['務']],
  ['组', ['組']],
  ['样', ['樣']],
  ['构', ['構']],
  ['码', ['碼']],
  ['释', ['釋']],
  ['参', ['參']],
  ['类', ['類']],
  ['给', ['給']],
  ['让', ['讓']],
  ['将', ['將']],
  ['无', ['無']],
  ['电', ['電']],
  ['环', ['環']],
  ['点', ['點']],
  ['动', ['動']],
  ['态', ['態']],
  ['逻', ['邏']],
  ['辑', ['輯']],
  ['号', ['號']],
  ['复', ['復', '複']],
  ['检', ['檢']],
  ['旧', ['舊']],
  ['异', ['異']],
  ['间', ['間']],
  ['离', ['離']],
  ['扩', ['擴']],
  ['压', ['壓']],
  ['编', ['編']],
  ['运', ['運']],
  ['级', ['級']],
  ['键', ['鍵']],
  ['盘', ['盤']],
  ['滤', ['濾']],
  ['获', ['獲', '穫']],
  ['启', ['啟', '啓']],
  ['签', ['簽', '籤']],
  ['钟', ['鐘', '鍾']],
  ['众', ['眾']],
  ['么', ['麼']],
  ['种', ['種']],
  ['迁', ['遷']],
  ['围', ['圍']],
  ['盖', ['蓋']],
  ['缩', ['縮']],
  ['传', ['傳']],
  ['输', ['輸']],
  ['归', ['歸']],
  ['别', ['別']],
  ['闭', ['閉']],
  ['长', ['長']],
  ['坏', ['壞']],
  ['静', ['靜']],
  ['满', ['滿']],
  ['败', ['敗']],
  ['滚', ['滾']],
  ['销', ['銷']],
  ['导', ['導']],
  ['举', ['舉']],
  ['联', ['聯']],
  ['绑', ['綁']],
  ['边', ['邊']],
  ['没', ['沒']],
  ['谁', ['誰']],
  ['吗', ['嗎']],
  ['东', ['東']],
  ['门', ['門']],
  ['侦', ['偵']],
  ['尽', ['盡', '儘']],
  ['历', ['歷', '曆']],
  ['炼', ['煉']],
  ['骤', ['驟']],
  ['车', ['車']],
  ['员', ['員']],
  ['达', ['達']],
  ['远', ['遠']],
  ['择', ['擇']],
  ['选', ['選']],
  ['称', ['稱']],
  ['览', ['覽']],
  ['显', ['顯']],
  ['续', ['續']],
  ['继', ['繼']],
  ['断', ['斷']],
  ['记', ['記']],
  ['识', ['識']],
  ['忆', ['憶']],
  ['仅', ['僅']],
  ['丢', ['丟']],
  ['弃', ['棄']],
  ['隐', ['隱']],
  ['钥', ['鑰']],
  ['凭', ['憑']],
  ['册', ['冊']],
  ['抛', ['拋']],
  ['寻', ['尋']],
  ['协', ['協']],
  ['议', ['議']],
  ['讨', ['討']],
  ['论', ['論']],
  ['详', ['詳']],
  ['细', ['細']],
  ['节', ['節']],
  ['结', ['結']],
  ['总', ['總']],
  ['计', ['計']],
  ['载', ['載']],
  ['负', ['負']],
  ['责', ['責']],
  ['备', ['備']],
  ['队', ['隊']],
  ['团', ['團']],
  ['织', ['織']],
  ['鉴', ['鑑', '鑒']],
  ['轮', ['輪']],
  ['询', ['詢']],
  ['栈', ['棧']],
  ['层', ['層']],
  ['义', ['義']],
  ['场', ['場']],
  ['夹', ['夾']],
  ['径', ['徑']],
  ['赖', ['賴']],
  ['头', ['頭']],
];

const SIMPLIFIED_MARKERS = new Set(VARIANT_PAIRS.map(([simplified]) => simplified));
const TRADITIONAL_MARKERS = new Set(VARIANT_PAIRS.flatMap(([, traditional]) => traditional));

/**
 * Detect the dominant language from commit subjects; undefined means low confidence.
 * Repositories with genuinely mixed writing styles are expected to stay undecided instead of
 * guessing from a bare plurality.
 */
export function detectCommitLanguage(subjects: readonly string[]): string | undefined {
  const votes = new Map<string, number>();
  const chineseTexts: string[] = [];

  for (const subject of subjects) {
    const text = stripCommitPrefix(subject);
    if (!text) {
      continue;
    }

    const code = detectCode(text);
    if (!code) {
      continue;
    }

    if (code === 'cmn') {
      chineseTexts.push(text);
    }
    const language = code === 'cmn' ? CHINESE_VOTE : FRANC_TO_LANGUAGE[code];
    if (!language) {
      continue;
    }
    votes.set(language, (votes.get(language) ?? 0) + 1);
  }

  const ranked = [...votes.entries()].sort((left, right) => right[1] - left[1]);
  const top = ranked[0];
  if (!top) {
    return undefined;
  }

  const [winner, winnerVotes] = top;
  const validVotes = ranked.reduce((total, [, count]) => total + count, 0);
  const runnerUpVotes = ranked[1]?.[1] ?? 0;

  if (
    validVotes < MIN_VOTES ||
    winnerVotes < MIN_VOTES ||
    winnerVotes / validVotes < MIN_WINNER_SHARE ||
    winnerVotes === runnerUpVotes
  ) {
    return undefined;
  }

  return winner === CHINESE_VOTE ? detectChineseVariant(chineseTexts) : winner;
}

/** Auto -> detected language or English; explicit values are returned unchanged. */
export function resolveCommitLanguage(configured: string, subjects: readonly string[]): string {
  if (configured !== AUTO_COMMIT_LANGUAGE) {
    return configured;
  }
  return detectCommitLanguage(subjects) ?? DEFAULT_COMMIT_LANGUAGE;
}

/** Auto-mode detections keyed by repository root; one repo only needs to be sampled once. */
const autoLanguageCache = new Map<string, string>();

/**
 * Resolve the configured language for a repository. Auto detection is cached per
 * repository; inconclusive samples are not cached so young repositories are
 * re-checked on the next invocation.
 */
export async function resolveCommitLanguageForRepository(
  repositoryPath: string,
  configured: string,
  loadSubjects: () => Promise<readonly string[]>
): Promise<string> {
  if (configured !== AUTO_COMMIT_LANGUAGE) {
    return configured;
  }

  const cached = autoLanguageCache.get(repositoryPath);
  if (cached) {
    return cached;
  }

  const detected = detectCommitLanguage(await loadSubjects());
  if (!detected) {
    return DEFAULT_COMMIT_LANGUAGE;
  }

  autoLanguageCache.set(repositoryPath, detected);
  return detected;
}

function detectCode(text: string): string | undefined {
  // Kana/Hangul are deterministic; this also prevents Latin-heavy prefixes from
  // winning franc's script race.
  if (KANA_PATTERN.test(text)) {
    return 'jpn';
  }
  if (HANGUL_PATTERN.test(text)) {
    return 'kor';
  }

  // Texts below franc's minLength produce 'und' and cast no vote; stripping the conventional
  // prefix often pushes short subjects (e.g. "bump deps") below the threshold. Dense scripts
  // stay detectable at two characters, so CJK/Thai/Cyrillic subjects vote even when terse.
  const code = franc(text, {
    only: FRANC_LANGUAGE_CODES,
    minLength: DENSE_SCRIPT_PATTERN.test(text) ? 2 : 10,
  });
  return code === 'und' ? undefined : code;
}

/** Remove prefixes that would otherwise contribute ASCII trigrams. */
function stripCommitPrefix(subject: string): string {
  let text = subject.trim();

  // Two passes handle combined forms such as "✨ fixup! feat: ...".
  for (let pass = 0; pass < 2; pass += 1) {
    text = text
      .replace(FIXUP_PREFIX_PATTERN, '')
      .replace(GITMOJI_PREFIX_PATTERN, '')
      .replace(EMOJI_SHORTCODE_PATTERN, '')
      .replace(CONVENTIONAL_PREFIX_PATTERN, '')
      .trim();
  }

  return text;
}

/** Count divergent characters; ties and no markers default to Simplified. */
function detectChineseVariant(texts: readonly string[]): string {
  let simplified = 0;
  let traditional = 0;

  for (const text of texts) {
    for (const character of text) {
      if (SIMPLIFIED_MARKERS.has(character)) {
        simplified += 1;
      } else if (TRADITIONAL_MARKERS.has(character)) {
        traditional += 1;
      }
    }
  }

  return traditional > simplified ? 'Traditional Chinese' : 'Simplified Chinese';
}
