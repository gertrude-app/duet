import { GlobalTypes } from './types';
import path from 'path';
import fs from 'fs';
import { sync as glob } from 'glob';
import { extractModels } from './models/model-attrs';
import Model from './models/Model';
import { extractGlobalTypes } from './models/global-types';

type ScriptData = {
  isDryRun: boolean;
  appRoot: string;
  appDir: string;
  files: Array<{ path: string; source: string }>;
  types: GlobalTypes;
  models: Model[];
  config: {
    additionalGlobalTypeSearchPaths: string[];
    typealiases: Record<string, string>;
    modelDirs: Record<string, string>;
    sideLoaded: Record<string, string>;
  };
};

export function requireModel(
  data: ReturnType<typeof scriptData>,
): ScriptData & { model: Model } {
  const { model, ...rest } = data;
  if (!model) {
    console.log(`No model selected. --model Thing`);
    process.exit(1);
  }
  return {
    ...rest,
    model,
  };
}

export function scriptData(): ScriptData & { model?: Model } {
  const isDryRun = !process.argv.includes(`--perform`) && !process.argv.includes(`-p`);
  const appRoot = process.cwd();
  const appDir = path.resolve(appRoot, `Sources`, `App`);
  const config = parseConfig(appRoot);

  const files = glob(`${appDir}/**/*.swift`).map((abspath) => ({
    path: abspath.replace(`${appRoot}/`, ``),
    source: fs.readFileSync(abspath, `utf-8`),
  }));

  let globalTypeSearchPaths = [
    ...files.map((f) => f.source),
    ...config.additionalGlobalTypeSearchPaths.map((path) =>
      fs.readFileSync(path, `utf8`),
    ),
  ];

  const types = extractGlobalTypes(globalTypeSearchPaths, config.typealiases);
  types.sideLoaded = config.sideLoaded;

  const models = extractModels(files);

  let modelArgIndex = process.argv.indexOf(`--model`);
  if (modelArgIndex === -1) {
    modelArgIndex = process.argv.indexOf(`-m`);
  }
  let modelName = process.argv[modelArgIndex + 1] ?? ``;
  const model = models.find((m) => m.name === modelName);

  return {
    isDryRun,
    appRoot,
    appDir,
    files,
    types,
    models,
    model,
    config,
  };
}

export function printCode(identifier: string, path: string, code: string): void {
  console.log(`Write generated ${identifier} to filepath: "${path}":\n`);
  console.log(code + `\n\n`);
}

function parseConfig(appRoot: string): ScriptData['config'] {
  const config: ScriptData['config'] = {
    additionalGlobalTypeSearchPaths: [],
    typealiases: {},
    modelDirs: {},
    sideLoaded: {},
  };

  const pkgJsonPath = path.resolve(appRoot, `package.json`);
  if (!fs.existsSync(pkgJsonPath)) {
    return config;
  }

  const duetConfig: Record<string, unknown> | undefined = JSON.parse(
    fs.readFileSync(pkgJsonPath, `utf8`),
  ).duet;

  const searchPaths = duetConfig?.additionalGlobalTypeSearchPaths;
  if (Array.isArray(searchPaths)) {
    for (const searchPath of searchPaths) {
      if (typeof searchPath === `string`) {
        config.additionalGlobalTypeSearchPaths.push(searchPath);
      }
    }
  }

  const typealiases = duetConfig?.typealiases;
  const typealiasesObj =
    typeof typealiases === `object` && typealiases !== null ? typealiases : {};

  for (const [key, value] of Object.entries(typealiasesObj)) {
    if (typeof value === `string`) {
      config.typealiases[key] = value;
    }
  }

  const modelDirs = duetConfig?.modelDirs;
  const modelDirsObj =
    typeof modelDirs === `object` && modelDirs !== null ? modelDirs : {};

  for (const [key, value] of Object.entries(modelDirsObj)) {
    if (typeof value === `string`) {
      config.modelDirs[key] = value;
    }
  }

  const sideLoaded = duetConfig?.sideLoaded;
  const sideLoadedObj =
    typeof sideLoaded === `object` && sideLoaded !== null ? sideLoaded : {};

  for (const [key, value] of Object.entries(sideLoadedObj)) {
    if (typeof value === `string`) {
      config.sideLoaded[key] = value;
    }
  }

  return config;
}

export function pluralize(str: string): string {
  if (str.match(/[^aeiou]y$/)) {
    return str.replace(/y$/, `ies`);
  } else {
    return `${str}s`;
  }
}
