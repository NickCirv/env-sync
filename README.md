# env-sync

Catch environment variable drift before it catches you — missing vars, type errors, and secrets lurking in your code.

<p align="center">
  <img src="https://img.shields.io/npm/v/env-sync.svg" alt="npm version" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="node >= 18" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license" />
</p>

## Why

Someone deploys to production and forgets to set `DATABASE_URL`. The `.env.example` is three months stale. A new dev joins, runs the app, and gets a cryptic crash. `env-sync` fixes all of this: compare your actual `.env` against `.env.example`, validate types, scan source code for undeclared variables, and diff environments side-by-side.

## Quick Start

```bash
npx env-sync check
```

## What It Does

- **`check`** — Compare `.env` against `.env.example`: finds missing vars, extra vars, and required vars that are empty
- **`diff`** — Side-by-side diff of two `.env` files with masked values (safe to paste in terminals and PRs)
- **`template`** — Generate a `.env.example` from your `.env` — strips values, adds type hints
- **`validate`** — Validate values by key name pattern: URLs must be valid URLs, ports must be 1–65535, `DEBUG`/`ENABLE_*` must be boolean, `NODE_ENV` must be a valid environment name, numeric keys must be numbers
- **`missing`** — Scan source code for `process.env.KEY` (JS/TS) and `os.environ`/`os.getenv` (Python) references that are not declared in your `.env`

## Example Output

```
  env-sync check

  .env vs .env.example

  Missing (required but absent)
  ✗ DATABASE_URL
  ✗ REDIS_URL

  Empty (required but blank)
  ✗ STRIPE_SECRET_KEY

  Extra (in .env but not in .env.example)
  ~ DEBUG_VERBOSE
  ~ LOCAL_ONLY_FLAG

  OK
  ✓ PORT
  ✓ NODE_ENV
  ✓ API_BASE_URL
  ✓ JWT_SECRET

  ────────────────────────────────────────
  2 missing  ·  1 empty  ·  2 extra  ·  4 ok
```

## Commands

| Command | Description |
|---------|-------------|
| `env-sync check` | Compare `.env` against `.env.example` |
| `env-sync diff <file-a> <file-b>` | Side-by-side diff of two env files |
| `env-sync template` | Generate `.env.example` from `.env` |
| `env-sync validate` | Validate env values by type inference |
| `env-sync missing` | Scan source code for undeclared env vars |

## Options

### `check`

| Flag | Description | Default |
|------|-------------|---------|
| `-e, --env <file>` | Path to .env file | `.env` |
| `-x, --example <file>` | Path to .env.example | `.env.example` |
| `--no-color` | Disable colors | off |

### `diff`

| Flag | Description | Default |
|------|-------------|---------|
| `--no-color` | Disable colors | off |

### `template`

| Flag | Description | Default |
|------|-------------|---------|
| `-e, --env <file>` | Source .env file | `.env` |
| `-o, --output <file>` | Output file | `.env.example` |
| `--dry-run` | Print to stdout instead of writing | off |

### `validate`

| Flag | Description | Default |
|------|-------------|---------|
| `-e, --env <file>` | Path to .env file | `.env` |
| `-x, --example <file>` | Used to determine required keys | `.env.example` |

### `missing`

| Flag | Description | Default |
|------|-------------|---------|
| `-e, --env <file>` | Path to .env file | `.env` |
| `-s, --src <dir>` | Source directory to scan | `src` |
| `--ext <extensions>` | File extensions to scan | `.js,.ts,.py` |

## Use in CI

```yaml
- name: Validate environment
  run: npx env-sync check
```

Exit code is `1` if missing vars or validation errors are found — safe to use as a pipeline gate.

## Install Globally

```bash
npm i -g env-sync
```

## License

MIT
