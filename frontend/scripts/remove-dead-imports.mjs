/**
 * Dead-import codemod.
 *
 * Removes import bindings that the TypeScript compiler proves are never read.
 *
 * Safety model:
 *  - Only ImportDeclaration specifiers are touched. Local variables, parameters
 *    and other unused symbols are left alone, because deleting those can drop a
 *    side-effecting initializer.
 *  - By default only *partial* removals are applied: at least one binding must
 *    survive in each declaration, so the module is still imported and any
 *    import side effects are preserved byte-for-byte.
 *  - `--allow-empty` additionally deletes declarations whose bindings are all
 *    unused. That changes the module graph, so it is opt-in and must be
 *    reviewed against the product build.
 *
 * Usage:
 *   node scripts/remove-dead-imports.mjs            # report only
 *   node scripts/remove-dead-imports.mjs --write    # apply safe partial removals
 */

import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const write = process.argv.includes("--write");
const allowEmpty = process.argv.includes("--allow-empty");

const configPath = resolve(root, "tsconfig.app.json");
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);

const program = ts.createProgram(parsed.fileNames, {
  ...parsed.options,
  noUnusedLocals: true,
  noEmit: true,
});

const unusedByFile = new Map();
for (const diagnostic of program.getSemanticDiagnostics()) {
  // 6133: declared but never read. 6196/6192 handled via the same node walk.
  if (diagnostic.code !== 6133 && diagnostic.code !== 6196 && diagnostic.code !== 6192) continue;
  if (!diagnostic.file || diagnostic.start === undefined) continue;
  const file = diagnostic.file.fileName;
  if (!unusedByFile.has(file)) unusedByFile.set(file, []);
  unusedByFile.get(file).push(diagnostic.start);
}

let filesChanged = 0;
let bindingsRemoved = 0;
let declarationsSkipped = 0;

for (const [fileName, positions] of unusedByFile) {
  const source = program.getSourceFile(fileName);
  if (!source || source.isDeclarationFile) continue;

  const positionSet = new Set(positions);
  /** @type {{start:number,end:number}[]} */
  const edits = [];

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    const clause = statement.importClause;
    const named = clause.namedBindings;

    const defaultUnused = clause.name ? positionSet.has(clause.name.getStart(source)) : false;

    if (named && ts.isNamespaceImport(named)) continue; // namespace imports: leave alone

    const elements = named && ts.isNamedImports(named) ? named.elements : [];
    const unusedElements = elements.filter((element) => positionSet.has(element.name.getStart(source)));
    if (unusedElements.length === 0 && !defaultUnused) continue;

    const totalBindings = (clause.name ? 1 : 0) + elements.length;
    const totalUnused = (defaultUnused ? 1 : 0) + unusedElements.length;

    if (totalUnused === totalBindings) {
      // Whole declaration is dead: deleting it would stop loading the module.
      if (!allowEmpty) {
        declarationsSkipped += 1;
        continue;
      }
      edits.push({ start: statement.getFullStart(), end: statement.getEnd() });
      bindingsRemoved += totalUnused;
      continue;
    }

    for (const element of unusedElements) {
      // Extend through the following comma so the list stays well-formed.
      let end = element.getEnd();
      const text = source.text;
      let cursor = end;
      while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
      if (text[cursor] === ",") {
        end = cursor + 1;
      } else {
        // Trailing element: absorb the preceding comma instead.
        let back = element.getStart(source) - 1;
        while (back >= 0 && /\s/.test(text[back])) back -= 1;
        if (text[back] === ",") {
          edits.push({ start: back, end: element.getEnd() });
          bindingsRemoved += 1;
          continue;
        }
      }
      edits.push({ start: element.getStart(source), end });
      bindingsRemoved += 1;
    }

    if (defaultUnused && clause.name) {
      let end = clause.name.getEnd();
      const text = source.text;
      let cursor = end;
      while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
      if (text[cursor] === ",") end = cursor + 1;
      edits.push({ start: clause.name.getStart(source), end });
      bindingsRemoved += 1;
    }
  }

  if (edits.length === 0) continue;
  filesChanged += 1;

  if (!write) continue;

  edits.sort((a, b) => b.start - a.start);
  let text = source.text;
  for (const edit of edits) {
    text = text.slice(0, edit.start) + text.slice(edit.end);
  }
  // Tidy up any now-empty specifier lists and stray whitespace in braces.
  text = text.replace(/\{\s*,/g, "{").replace(/,\s*\}/g, " }").replace(/\{\s+\}/g, "{}");
  writeFileSync(fileName, text);
}

console.log(
  JSON.stringify(
    {
      mode: write ? "write" : "report",
      allowEmpty,
      filesChanged,
      bindingsRemoved,
      wholeDeclarationsSkipped: declarationsSkipped,
    },
    null,
    2,
  ),
);
