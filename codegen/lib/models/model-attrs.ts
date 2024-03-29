import { File, GlobalTypes } from '../types';
import { extractDbEnum } from './enums';
import { extractJsonable } from './global-types';
import Model from './Model';

export function extractModels(files: File[]): Model[] {
  const models: Record<string, Model> = {};
  for (const file of files) {
    const model = extractModelAttrs(file);
    if (model) {
      models[model.name] = model;
    }
  }

  for (const file of files) {
    setMigrationNumbers(file, models);
    extractFromExtensions(file, models);
  }

  return Object.values(models);
}

export function extractModelAttrs({ source, path }: File): Model | undefined {
  if (isFileWithoutModelInfo(path)) {
    return undefined;
  }

  const lines = source.split(`\n`);
  while (lines.length) {
    const line = lines.shift()!;
    const classMatch = line.match(/^(?:public )?final class ([A-Z][^\s]+): Codable {$/);
    if (classMatch !== null) {
      return parseClassInterior(classMatch[1], path, lines);
    }
  }
}

function isFileWithoutModelInfo(path: string): boolean {
  return (
    (!path.includes(`/Models/`) &&
      !path.includes(`/Migrations/`) &&
      !path.includes(`/Entities/`)) ||
    path.includes(`Generated`) ||
    path.includes(`Repository`) ||
    path.includes(`Resolver`)
  );
}

function parseClassInterior(name: string, path: string, lines: string[]): Model {
  const model = new Model(name, path);

  while (lines.length) {
    const line = lines.shift()!;

    if (line.startsWith(`}`)) {
      return model;
    }

    if (line.match(/^  (public )?init/)) {
      parseInit(model, line, lines);
      continue;
    }

    if (!line.match(/^  (public )?var /)) {
      continue;
    }

    // relations
    const relationMatch = line.match(
      /\s+(?:public )?var ([^ ]+) = ([^ <]+)<([^>]+)>.notLoaded/,
    );
    if (relationMatch) {
      const [, name = ``, relationType = ``, type = ``] = relationMatch;
      model.relations[name] = { relationType: relationType, type };
      continue;
    }

    // computed property
    if (extractComputedProp(line, model)) {
      continue;
    }

    const tzMatch = line.match(/var ((?:crea|upda|dele)tedAt)/);
    if (tzMatch !== null) {
      model.props.push({
        name: tzMatch[1],
        type: line.includes(`Date?`) ? `Date?` : `Date`,
      });
      continue;
    }

    const [name, type] = line
      .replace(/\s+\/\/.*/, ``)
      .trim()
      .replace(/^(public )?var /, ``)
      .split(`: `, 2);
    model.props.push({ name, type });
  }

  return model;
}

function extractComputedProp(line: string, model: Model): boolean {
  const computedPropMatch = line.match(/^  (?:public )?var ([^ ]+):\s+([^ ]+)\s+{/);
  if (computedPropMatch) {
    const computedProp = { name: computedPropMatch[1], type: computedPropMatch[2] };
    model.computedProps.push(computedProp);
    return true;
  }
  return false;
}

function parseInit(model: Model, line: string, lines: string[]): void {
  const parts = line.split(/^  (?:public )?init\(/);
  // init is multi-line
  if (parts[1] == ``) {
    while (lines.length) {
      const line = lines.shift()!;
      if (line.trim().startsWith(`)`)) {
        return;
      }
      const match = line.match(/\s*([a-z0-9]+): (.*)/i);
      if (!match) {
        throw new Error(`Unable to parse init() for model: ${model.name}, ${line}`);
      }
      const [, propName = ``, rest = ``] = match;
      model.init.push({ propName, hasDefault: rest.includes(`=`) });
    }
  } else {
    let innerds = parts[1].replace(/\)\s+{$/, ``);
    return parseInit(model, `  init(`, [...innerds.split(/,\s+/g), `  ) {`]);
  }
}

export function setMigrationNumbers(
  { source }: File,
  models: Record<string, Model>,
): void {
  const lines = source.split(`\n`);
  while (lines.length) {
    const line = lines.shift()!;
    const extensionMatch = line.match(/^extension ([A-Z][A-Za-z0-9]+) {$/);
    if (extensionMatch && models[extensionMatch[1]]) {
      setMigrationNumber(models[extensionMatch[1]], lines);
    }
  }
}

function setMigrationNumber(model: Model, lines: string[]): void {
  let inMigration: number | null = null;
  while (lines.length) {
    const line = lines.shift()!;
    if (line.startsWith(`}`)) {
      return;
    }
    const migrationMatch = line.match(/^  enum M(\d+)(: TableNamingMigration)? {$/);
    if (migrationMatch && !Number.isNaN(Number(migrationMatch[1]))) {
      inMigration = Number(migrationMatch[1]);
    }
    if (inMigration && line.startsWith(`    static let tableName =`)) {
      model.migrationNumber = inMigration;
    }
  }
}

function extractFromExtensions({ source, path }: File, models: Record<string, Model>) {
  if (isFileWithoutModelInfo(path)) {
    return;
  }

  const lines = source.split(`\n`);
  while (lines.length) {
    const line = lines.shift()!;
    const extMatch = line.match(/^(?:public )?extension ([A-Z][^\s]+) {$/);
    if (!extMatch) {
      continue;
    }
    const model = models[extMatch[1]];
    if (!model) {
      continue;
    }
    extractFromModelExtension(model, lines);
  }
}

function extractFromModelExtension(model: Model, lines: string[]): void {
  while (lines.length) {
    const line = lines.shift()!;
    if (line === `}`) {
      return;
    }

    if (extractComputedProp(line, model)) {
      continue;
    }

    if (line.startsWith(`  typealias `)) {
      extractTaggedType(model, line);
      continue;
    }

    extractDbEnum(line, lines, model.dbEnums, { kind: `extension` });
    extractJsonable(model.jsonables, line, { kind: `extension` });
  }
}

export function extractTaggedType(
  obj: { taggedTypes: Record<string, string> },
  line: string,
): void {
  const match = line.match(/^\s*(?:public )?typealias ([^ ]+) = Tagged<(.+)>$/);
  if (!match) {
    return;
  }

  const alias = match[1];
  const innerParts = match[2].split(`, `);
  const taggedType = innerParts.pop() ?? ``;
  obj.taggedTypes[alias] = taggedType;
}
