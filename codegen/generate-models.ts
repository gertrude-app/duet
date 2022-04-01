import path from 'path';
import fs from 'fs';
import { generateModelConformances } from './lib/models/model-conformances';
import { generateModelMocks } from './lib/models/model-mocks';
import { generateModelGraphQLTypes } from './lib/models/graphql';
import { scriptData } from './lib/script-helpers';

const { models, appRoot, types } = scriptData();

for (const model of models) {
  const [conformancePath, conformanceCode] = generateModelConformances(model, types);
  fs.writeFileSync(`${appRoot}/${conformancePath}`, conformanceCode);

  const [mocksPath, mocksCode] = generateModelMocks(model, types);
  const testDir = path.dirname(`${appRoot}/${mocksPath}`);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }
  fs.writeFileSync(`${appRoot}/${mocksPath}`, mocksCode);

  const [graphqlPath, graphqlCode] = generateModelGraphQLTypes(model, types);
  fs.writeFileSync(`${appRoot}/${graphqlPath}`, graphqlCode);
}
