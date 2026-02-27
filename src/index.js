import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseEnvFile } from './parser.js';
import { checkEnv, scanCodeForEnvRefs } from './checker.js';
import { diffEnvFiles } from './differ.js';
import { generateTemplate } from './template.js';
import { validateEnv } from './validator.js';
import {
  printCheckResults,
  printDiffResults,
  printTemplateResult,
  printValidationResults,
  printMissingResults,
} from './formatter.js';

const program = new Command();

program
  .name('env-sync')
  .description('Smart environment variable management — catch drift before it catches you')
  .version('1.0.0');

program
  .command('check')
  .description('Compare .env against .env.example and report missing, extra, or empty vars')
  .option('-e, --env <file>', 'Path to .env file', '.env')
  .option('-x, --example <file>', 'Path to .env.example file', '.env.example')
  .option('--no-color', 'Disable color output')
  .action((opts) => {
    const envPath = resolve(process.cwd(), opts.env);
    const examplePath = resolve(process.cwd(), opts.example);

    if (!existsSync(envPath)) {
      console.error(`Error: ${opts.env} not found at ${envPath}`);
      process.exit(1);
    }
    if (!existsSync(examplePath)) {
      console.error(`Error: ${opts.example} not found at ${examplePath}`);
      process.exit(1);
    }

    const envMap = parseEnvFile(readFileSync(envPath, 'utf8'));
    const exampleMap = parseEnvFile(readFileSync(examplePath, 'utf8'));
    const results = checkEnv(envMap, exampleMap);

    printCheckResults(results, opts.env, opts.example);

    if (results.missing.length > 0) process.exit(1);
  });

program
  .command('diff')
  .description('Side-by-side diff of two .env files with masked values')
  .argument('<file-a>', 'First .env file')
  .argument('<file-b>', 'Second .env file')
  .option('--no-color', 'Disable color output')
  .action((fileA, fileB) => {
    const pathA = resolve(process.cwd(), fileA);
    const pathB = resolve(process.cwd(), fileB);

    if (!existsSync(pathA)) {
      console.error(`Error: ${fileA} not found`);
      process.exit(1);
    }
    if (!existsSync(pathB)) {
      console.error(`Error: ${fileB} not found`);
      process.exit(1);
    }

    const mapA = parseEnvFile(readFileSync(pathA, 'utf8'));
    const mapB = parseEnvFile(readFileSync(pathB, 'utf8'));
    const diff = diffEnvFiles(mapA, mapB, fileA, fileB);

    printDiffResults(diff, fileA, fileB);
  });

program
  .command('template')
  .description('Generate .env.example from .env — strips values, adds type hints')
  .option('-e, --env <file>', 'Source .env file', '.env')
  .option('-o, --output <file>', 'Output file', '.env.example')
  .option('--dry-run', 'Print to stdout instead of writing file')
  .action((opts) => {
    const envPath = resolve(process.cwd(), opts.env);

    if (!existsSync(envPath)) {
      console.error(`Error: ${opts.env} not found`);
      process.exit(1);
    }

    const envMap = parseEnvFile(readFileSync(envPath, 'utf8'));
    const { content, stats } = generateTemplate(envMap);

    printTemplateResult(content, stats, opts.output, opts.dryRun);
  });

program
  .command('validate')
  .description('Validate env values — URLs, ports, booleans, required fields')
  .option('-e, --env <file>', 'Path to .env file', '.env')
  .option('-x, --example <file>', 'Path to .env.example to determine required vars', '.env.example')
  .action((opts) => {
    const envPath = resolve(process.cwd(), opts.env);

    if (!existsSync(envPath)) {
      console.error(`Error: ${opts.env} not found`);
      process.exit(1);
    }

    const envMap = parseEnvFile(readFileSync(envPath, 'utf8'));
    let exampleMap = new Map();
    if (existsSync(resolve(process.cwd(), opts.example))) {
      exampleMap = parseEnvFile(readFileSync(resolve(process.cwd(), opts.example), 'utf8'));
    }

    const results = validateEnv(envMap, exampleMap);
    printValidationResults(results);

    if (results.errors.length > 0) process.exit(1);
  });

program
  .command('missing')
  .description('Scan source code for process.env references not declared in .env')
  .option('-e, --env <file>', 'Path to .env file', '.env')
  .option('-s, --src <glob>', 'Source directory to scan', 'src')
  .option('--ext <extensions>', 'File extensions to scan', '.js,.ts,.py')
  .action(async (opts) => {
    const envPath = resolve(process.cwd(), opts.env);

    if (!existsSync(envPath)) {
      console.error(`Error: ${opts.env} not found`);
      process.exit(1);
    }

    const envMap = parseEnvFile(readFileSync(envPath, 'utf8'));
    const extensions = opts.ext.split(',').map((e) => e.trim());
    const srcDir = resolve(process.cwd(), opts.src);

    const refs = await scanCodeForEnvRefs(srcDir, extensions);
    const results = {
      codeRefs: refs,
      declaredKeys: new Set(envMap.keys()),
      undeclared: refs.filter((r) => !envMap.has(r.key)),
    };

    printMissingResults(results);

    if (results.undeclared.length > 0) process.exit(1);
  });

program.parse(process.argv);
