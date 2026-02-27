/**
 * Parse .env files with full spec compliance.
 * Handles: comments, multiline values, single/double quotes, export prefix, empty lines.
 * Returns Map<key, { value, line, comment, raw }>
 */

/**
 * @param {string} content - Raw .env file content
 * @returns {Map<string, { value: string, line: number, comment: string|null, raw: string }>}
 */
export function parseEnvFile(content) {
  const result = new Map();
  const lines = content.split('\n');
  let lineIndex = 0;
  let pendingComment = null;

  while (lineIndex < lines.length) {
    const raw = lines[lineIndex];
    const trimmed = raw.trim();
    lineIndex++;

    // Empty line — reset pending comment
    if (trimmed === '') {
      pendingComment = null;
      continue;
    }

    // Comment line — capture for next key
    if (trimmed.startsWith('#')) {
      pendingComment = trimmed.slice(1).trim();
      continue;
    }

    // Strip optional `export ` prefix
    const stripped = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;

    // Must contain `=`
    const eqIndex = stripped.indexOf('=');
    if (eqIndex === -1) {
      pendingComment = null;
      continue;
    }

    const key = stripped.slice(0, eqIndex).trim();
    if (!key || !isValidKey(key)) {
      pendingComment = null;
      continue;
    }

    let rawValue = stripped.slice(eqIndex + 1);

    // Detect quoted values (including multiline)
    let value;
    if (rawValue.startsWith('"')) {
      const { resolved, linesConsumed } = readQuotedValue(rawValue, '"', lines, lineIndex);
      value = resolved;
      lineIndex += linesConsumed;
    } else if (rawValue.startsWith("'")) {
      const { resolved, linesConsumed } = readQuotedValue(rawValue, "'", lines, lineIndex);
      value = resolved;
      lineIndex += linesConsumed;
    } else if (rawValue.startsWith('`')) {
      const { resolved, linesConsumed } = readQuotedValue(rawValue, '`', lines, lineIndex);
      value = resolved;
      lineIndex += linesConsumed;
    } else {
      // Unquoted: trim and strip inline comment
      value = stripInlineComment(rawValue).trim();
    }

    result.set(key, {
      value,
      line: lineIndex - 1,
      comment: pendingComment,
      raw,
    });

    pendingComment = null;
  }

  return result;
}

/**
 * Read a quoted value, potentially spanning multiple lines.
 * @param {string} start - The raw value portion starting with the opening quote
 * @param {string} quote - The quote character: " | ' | `
 * @param {string[]} lines - All lines for multiline lookahead
 * @param {number} nextLine - The line index after the current one
 * @returns {{ resolved: string, linesConsumed: number }}
 */
function readQuotedValue(start, quote, lines, nextLine) {
  let buffer = start.slice(1); // remove opening quote
  let linesConsumed = 0;

  // Try to find closing quote on the same value string first
  const closeIndex = findUnescapedQuote(buffer, quote);
  if (closeIndex !== -1) {
    const raw = buffer.slice(0, closeIndex);
    return { resolved: unescapeValue(raw, quote), linesConsumed: 0 };
  }

  // Multiline — accumulate until closing quote
  const parts = [buffer];
  while (nextLine + linesConsumed < lines.length) {
    const nextRaw = lines[nextLine + linesConsumed];
    linesConsumed++;
    const close = findUnescapedQuote(nextRaw, quote);
    if (close !== -1) {
      parts.push(nextRaw.slice(0, close));
      break;
    }
    parts.push(nextRaw);
  }

  const joined = parts.join('\n');
  return { resolved: unescapeValue(joined, quote), linesConsumed };
}

/**
 * Find the index of a closing quote that isn't preceded by a backslash.
 */
function findUnescapedQuote(str, quote) {
  for (let i = 0; i < str.length; i++) {
    if (str[i] === quote && (i === 0 || str[i - 1] !== '\\')) {
      return i;
    }
  }
  return -1;
}

/**
 * Unescape common escape sequences inside double-quoted values.
 * Single-quoted values are treated literally (no escaping).
 */
function unescapeValue(str, quote) {
  if (quote === "'") return str;
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"')
    .replace(/\\`/g, '`');
}

/**
 * Strip inline comment (# ...) from an unquoted value.
 * Stops at first unquoted # that's preceded by whitespace.
 */
function stripInlineComment(value) {
  const match = value.match(/^(.*?)\s+#.*$/);
  return match ? match[1] : value;
}

/**
 * Validate env key: must start with letter or underscore, then alphanumeric or underscore.
 */
function isValidKey(key) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
}
