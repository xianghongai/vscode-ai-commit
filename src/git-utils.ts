import simpleGit from 'simple-git';
import * as vscode from 'vscode';
import { I18n } from './i18n';

interface GitDiffRepository {
  rootUri?: {
    fsPath: string;
  };
}

/**
 * Recent commits reflect the repository's current writing language; scanning deep history adds noise.
 *
 * The window can only vote with subjects it manages to classify, and bot authors are filtered out
 * below, so the effective sample is often smaller than this limit. Ten keeps enough margin above
 * the three-vote floor to absorb undetected or misclassified subjects, while a repository that
 * switches language converges within roughly half the window instead of carrying stale commits.
 */
const DEFAULT_COMMIT_SAMPLE_SIZE = 10;
/** Author names used by common dependency-update bots and GitHub Apps. */
const BOT_AUTHOR_PATTERN = /dependabot|renovate|github-actions|\[bot\]/i;

/** Resolve the repository root, falling back to the first workspace folder. */
function resolveRepositoryRoot(repo: GitDiffRepository): string | undefined {
  return repo?.rootUri?.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
}

/**
 * Retrieves the staged changes from the Git repository.
 */
export async function getDiffStaged(repo: GitDiffRepository): Promise<{ diff: string; error?: string }> {
  try {
    const rootPath = resolveRepositoryRoot(repo);

    if (!rootPath) {
      throw new Error(I18n.t('error.noWorkspaceFolder'));
    }

    const git = simpleGit(rootPath);
    const diff = await git.diff(['--staged']);

    return {
      diff,
    };
  } catch (error) {
    console.error(I18n.t('error.gitDiffRead'), error);
    return {
      diff: '',
      error: error instanceof Error ? error.message : I18n.t('error.unexpectedError'),
    };
  }
}

/**
 * Read recent non-merge commit subjects, excluding common dependency bots.
 * History is best-effort; an empty result makes Auto fall back to English.
 */
export async function getRecentCommitSubjects(
  repo: GitDiffRepository,
  limit = DEFAULT_COMMIT_SAMPLE_SIZE
): Promise<string[]> {
  const rootPath = resolveRepositoryRoot(repo);
  if (!rootPath || !Number.isFinite(limit) || limit < 1) {
    return [];
  }

  try {
    const output = await simpleGit(rootPath).raw([
      'log',
      '--no-merges',
      '--encoding=UTF-8',
      '-n',
      String(Math.trunc(limit)),
      '--pretty=format:%an%x09%s',
    ]);

    return output.split('\n').flatMap((line) => {
      const separator = line.indexOf('\t');
      if (separator === -1) {
        return [];
      }

      const author = line.slice(0, separator).trim();
      const subject = line.slice(separator + 1).trim();
      return subject !== '' && !BOT_AUTHOR_PATTERN.test(author) ? [subject] : [];
    });
  } catch {
    return [];
  }
}
