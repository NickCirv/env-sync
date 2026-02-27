import { writeFileSync } from 'fs';

/**
 * Type hint patterns — matched against key names (case-insensitive).
 * Order matters: first match wins.
 */
const TYPE_HINTS = [
  { pattern: /url|endpoint|uri|host|origin|webhook|callback/i, hint: 'URL' },
  { pattern: /port/i, hint: 'number (1-65535)' },
  { pattern: /debug|verbose|enable|disable|flag|feature/i, hint: 'boolean (true|false)' },
  { pattern: /secret|token|key|api_key|password|pass|pwd|credential|auth|jwt|hmac|private/i, hint: 'secret' },
  { pattern: /timeout|delay|ttl|max|min|limit|size|count|retry|interval|duration/i, hint: 'number' },
  { pattern: /env|environment|stage|node_env/i, hint: 'string (development|staging|production)' },
  { pattern: /email|mail/i, hint: 'email' },
  { pattern: /path|dir|folder|file/i, hint: 'path' },
  { pattern: /id|uid|uuid/i, hint: 'string' },
];

/**
 * Generate .env.example content from a parsed env Map.
 * Strips values, preserves keys and inline comments, adds type hints.
 *
 * @param {Map<string, { value: string, line: number, comment: string|null }>} envMap
 * @returns {{ content: string, stats: { total: number, withComments: number, withHints: number } }}
 */
export function generateTemplate(envMap) {
  const lines = [];
  let withComments = 0;
  let withHints = 0;

  for (const [key, entry] of envMap) {
    const hint = detectTypeHint(key);

    // Preserve original comment if present
    if (entry.comment) {
      lines.push(`# ${entry.comment}`);
      withComments++;
    }

    if (hint) {
      if (!entry.comment) {
        lines.push(`# ${hint}`);
      }
      lines.push(`${key}=`);
      withHints++;
    } else {
      lines.push(`${key}=`);
    }
  }

  const content = lines.join('\n') + '\n';
  return {
    content,
    stats: {
      total: envMap.size,
      withComments,
      withHints,
    },
  };
}

/**
 * Write the generated template to a file.
 *
 * @param {string} content
 * @param {string} outputPath
 */
export function writeTemplate(content, outputPath) {
  writeFileSync(outputPath, content, 'utf8');
}

/**
 * Detect a type hint for a given key name.
 *
 * @param {string} key
 * @returns {string|null}
 */
function detectTypeHint(key) {
  for (const { pattern, hint } of TYPE_HINTS) {
    if (pattern.test(key)) return hint;
  }
  return null;
}
