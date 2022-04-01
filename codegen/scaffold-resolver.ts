import fs from 'fs';
import Model from './lib/models/Model';
import { generateResolverScaffold } from './lib/models/scaffold-resolvers';
import { requireModel, scriptData, printCode } from './lib/script-helpers';

if (process.argv.includes(`--all`)) {
  const { models, isDryRun, config, appRoot } = scriptData();
  for (const model of models) {
    generate(model, isDryRun, appRoot, config.modelDirs);
  }
} else {
  const { model, isDryRun, config, appRoot } = requireModel(scriptData());
  generate(model, isDryRun, appRoot, config.modelDirs);
}

function generate(
  model: Model,
  isDryRun: boolean,
  appRoot: string,
  modelDirs: Record<string, string>,
) {
  const [path, code] = generateResolverScaffold(model, appRoot, modelDirs);
  if (isDryRun) {
    printCode(`resolver`, path, code);
  } else {
    if (process.argv.includes(`--replace`)) {
      fs.writeFileSync(path, `import Vapor\n\n${code}`);
    } else if (fs.existsSync(path)) {
      const contents = fs.readFileSync(path, `utf-8`);
      if (contents.includes(`// below auto-generated`)) {
        const [before = ``] = contents.split(`// below auto-generated`);
        const replace = `${before}${code}`;
        fs.writeFileSync(path, replace);
      } else {
        fs.writeFileSync(path, `import Vapor\n\n${code}`);
      }
    } else {
      fs.writeFileSync(path, `import Vapor\n\n${code}`);
    }
  }
}
