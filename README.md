<div align="center">

# env-sync

**Catch environment variable drift before it catches you — missing vars, type mismatches, and undeclared secrets in one command**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?labelColor=0B0A09)](LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg?labelColor=0B0A09)](package.json)

</div>

## Install

```bash
npx github:NickCirv/env-sync <command>
```

## Usage

```bash
# Compare .env against .env.example — find missing, empty, and extra vars
npx github:NickCirv/env-sync check

# Diff two env files side-by-side with masked values
npx github:NickCirv/env-sync diff .env .env.staging

# Generate a .env.example from your .env (strips values, adds type hints)
npx github:NickCirv/env-sync template --dry-run

# Validate values by pattern — URLs, ports, booleans, NODE_ENV
npx github:NickCirv/env-sync validate

# Scan JS/TS/Python source for process.env refs not declared in .env
npx github:NickCirv/env-sync missing --src src
```

| Command | Description |
|---------|-------------|
| `check` | Compare `.env` vs `.env.example`; exits `1` if vars are missing |
| `diff <a> <b>` | Side-by-side masked diff of two env files |
| `template` | Strip values from `.env`, write a typed `.env.example` |
| `validate` | Type-infer and validate env values (URLs, ports, booleans) |
| `missing` | Find `process.env.KEY` / `os.environ` refs absent from `.env` |

## What it does

`env-sync` compares your actual `.env` against `.env.example` and reports every discrepancy — missing required vars, required vars left empty, and extra vars not in the template. The `validate` command infers types from key names (e.g. `PORT` must be 1–65535, `DATABASE_URL` must parse as a URL) without requiring a schema file. Use `missing` in CI to catch `process.env` references added to source code that no one remembered to document.

**CI gate** — all commands exit `1` on errors, making them safe as pipeline steps:

```yaml
- name: Validate environment
  run: npx github:NickCirv/env-sync check
```

---
<sub>Node >=18 · MIT · by <a href="https://github.com/NickCirv">NickCirv</a></sub>
