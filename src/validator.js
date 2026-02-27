/**
 * Validate env values against type expectations inferred from key names.
 * Also enforces that required vars (present in .env.example) are non-empty.
 */

/**
 * @param {Map} envMap - Parsed .env
 * @param {Map} exampleMap - Parsed .env.example (used to determine required keys)
 * @returns {{ errors: Array, warnings: Array, ok: string[] }}
 */
export function validateEnv(envMap, exampleMap) {
  const errors = [];
  const warnings = [];
  const ok = [];

  for (const [key, entry] of envMap) {
    const { value } = entry;
    const isRequired = exampleMap.has(key);
    const issues = [];

    // Required non-empty check
    if (isRequired && value === '') {
      issues.push('required but empty');
    }

    // Type-based validation
    const typeIssue = validateByKeyPattern(key, value);
    if (typeIssue) issues.push(typeIssue);

    if (issues.length > 0) {
      (issues.some((i) => i.includes('required')) ? errors : warnings).push({
        key,
        value,
        issues,
        line: entry.line,
      });
      // Also push to errors if type check is critical
      if (issues.includes(typeIssue) && typeIssue && !issues.includes('required but empty')) {
        warnings.push({ key, value, issues, line: entry.line });
        // avoid double push — we'll handle below
      }
    } else {
      ok.push(key);
    }
  }

  // Rebuild cleanly: errors = required+empty or invalid type on required; warnings = invalid type on optional
  const cleanErrors = [];
  const cleanWarnings = [];

  for (const [key, entry] of envMap) {
    const { value } = entry;
    const isRequired = exampleMap.has(key);
    const typeIssue = validateByKeyPattern(key, value);
    const emptyRequired = isRequired && value === '';

    if (emptyRequired && typeIssue) {
      cleanErrors.push({ key, value, issues: ['required but empty', typeIssue], line: entry.line });
    } else if (emptyRequired) {
      cleanErrors.push({ key, value, issues: ['required but empty'], line: entry.line });
    } else if (typeIssue && value !== '') {
      const bucket = isRequired ? cleanErrors : cleanWarnings;
      bucket.push({ key, value, issues: [typeIssue], line: entry.line });
    }
  }

  const okKeys = [...envMap.keys()].filter(
    (k) => !cleanErrors.some((e) => e.key === k) && !cleanWarnings.some((w) => w.key === k)
  );

  return { errors: cleanErrors, warnings: cleanWarnings, ok: okKeys };
}

/**
 * Infer expected type from key name and validate the value.
 * Returns a string describing the issue, or null if valid.
 *
 * @param {string} key
 * @param {string} value
 * @returns {string|null}
 */
function validateByKeyPattern(key, value) {
  if (value === '') return null; // Empty handled separately

  const lower = key.toLowerCase();

  // URL validation
  if (/url|endpoint|uri|webhook|callback/i.test(lower)) {
    if (!isValidUrl(value)) {
      return `expected valid URL, got: ${truncate(value, 40)}`;
    }
    return null;
  }

  // Port validation
  if (/^port$|_port$/i.test(lower)) {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1 || num > 65535) {
      return `expected port (1-65535), got: ${truncate(value, 20)}`;
    }
    return null;
  }

  // Number validation (generic)
  if (/^(timeout|delay|ttl|max_|min_|limit|size|count|retry|interval|duration)/i.test(lower)) {
    if (isNaN(Number(value))) {
      return `expected number, got: ${truncate(value, 20)}`;
    }
    return null;
  }

  // Boolean validation
  if (/^(debug|verbose|enable_|disable_|flag_|feature_)/i.test(lower)) {
    const valid = ['true', 'false', '1', '0', 'yes', 'no'];
    if (!valid.includes(value.toLowerCase())) {
      return `expected boolean (true|false), got: ${truncate(value, 20)}`;
    }
    return null;
  }

  // NODE_ENV / APP_ENV
  if (/^(node_env|app_env|environment|stage)$/i.test(lower)) {
    const valid = ['development', 'staging', 'production', 'test', 'local'];
    if (!valid.includes(value.toLowerCase())) {
      return `expected environment name, got: ${truncate(value, 20)}`;
    }
    return null;
  }

  return null;
}

/**
 * Validate a URL string.
 *
 * @param {string} value
 * @returns {boolean}
 */
function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'ws:' || url.protocol === 'wss:';
  } catch {
    return false;
  }
}

/**
 * Truncate a string for display.
 *
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '...' : str;
}
