import fs from 'fs';
import { pluralize } from '../script-helpers';
import Model from './Model';

export function generateResolverScaffold(
  model: Model,
  appRoot: string,
  customSubdirs: Record<string, string>,
): [filepath: string, code: string] {
  const patternPath = `${appRoot}/.duet/scaffold-resolver-pattern.ts`;
  if (!fs.existsSync(patternPath)) {
    throw new Error(`Missing required pattern file at: ${patternPath}`);
  }

  const lines = fs.readFileSync(patternPath, `utf8`).split(`\n`);
  lines.shift();
  lines.pop();
  lines.pop();
  const RESOLVER_PATTERN = lines.join(`\n`);

  const code = RESOLVER_PATTERN.replace(/Things/g, pluralize(model.name))
    .replace(/things/g, pluralize(model.camelCaseName))
    .replace(/Thing/g, model.name)
    .replace(/thing/g, model.camelCaseName);

  return [`${model.dir(customSubdirs)}/${model.name}+Resolver.swift`, code];
}
