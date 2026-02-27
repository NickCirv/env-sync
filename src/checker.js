import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';

/**
 * Compare envMap against exampleMap.
 * Returns missing vars, extra vars, and empty required vars.
 *
 * @param {Map} envMap - Parsed .env
 * @param {Map} exampleMap - Parsed .env.example
 * @returns {{ missing: string[], extra: string[], emptyRequired: string[], ok: string[] }}
 */
export function checkEnv(envMap, exampleMap) {
  const missing = [];
  const emptyRequired = [];
  const ok = [];

  for (const [key] of exampleMap) {
    if (!envMap.has(key)) {
      missing.push(key);
    } else if (envMap.get(key).value === '') {
      emptyRequired.push(key);
    } else {
      ok.push(key);
    }
  }

  const extra = [];
  for (const [key] of envMap) {
    if (!exampleMap.has(key)) {
      extra.push(key);
    }
  }

  return { missing, extra, emptyRequired, ok };
}

/**
 * Scan source code files for process.env.KEY and os.environ references.
 * Returns array of { key, file, line } for each reference found.
 *
 * @param {string} srcDir - Directory to scan
 * @param {string[]} extensions - File extensions to include e.g. ['.js', '.ts', '.py']
 * @returns {Promise<Array<{ key: string, file: string, line: number }>>}
 */
export async function scanCodeForEnvRefs(srcDir, extensions) {
  if (!existsSync(srcDir)) return [];

  const files = collectFiles(srcDir, extensions);
  const refs = [];

  // Patterns to match env var access:
  // JS/TS: process.env.KEY or process.env['KEY'] or process.env["KEY"]
  // Python: os.environ['KEY'] or os.environ["KEY"] or os.environ.get('KEY') or os.getenv('KEY')
  const patterns = [
    /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
    /process\.env\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]]/g,
    /os\.environ\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]]/g,
    /os\.environ\.get\(['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g,
    /os\.getenv\(['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g,
  ];

  for (const filePath of files) {
    let content;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const key = match[1];
          // Deduplicate by key+file+line
          const exists = refs.some(
            (r) => r.key === key && r.file === filePath && r.line === idx + 1
          );
          if (!exists) {
            refs.push({ key, file: filePath, line: idx + 1 });
          }
        }
      }
    });
  }

  return refs;
}

/**
 * Recursively collect files with matching extensions.
 *
 * @param {string} dir
 * @param {string[]} extensions
 * @returns {string[]}
 */
function collectFiles(dir, extensions) {
  const results = [];
  const ignored = new Set([
    'node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__',
  ]);

  function walk(current) {
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (ignored.has(entry)) continue;
      const fullPath = join(current, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (extensions.includes(extname(entry))) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}
