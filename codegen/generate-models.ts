import path from 'path';
import fs from 'fs';
import { duetSqlModelConformance } from './lib/models/sql-conformance';
import { generateModelMocks } from './lib/models/model-mocks';
import { generateModelGraphQLTypes } from './lib/models/graphql';
import { scriptData } from './lib/script-helpers';

const { models, appRoot, types, config } = scriptData();

let duetConformancesCode = /* swift */ `// auto-generated, do not edit
import Duet
import Tagged
`;

let sqlConformancesCode = /* swift */ `// auto-generated, do not edit
import DuetSQL
`;

for (const model of models) {
  duetConformancesCode += `${model.duetIdentifiableConformance}\n${model.codingKeysExtension}\n`;
  sqlConformancesCode += `\n${duetSqlModelConformance(model, types)}\n`;
  //   const [conformancePath, conformanceCode] = generateModelConformances(model, types);
  //   fs.writeFileSync(`${appRoot}/${conformancePath}`, conformanceCode);
  //   const [mocksPath, mocksCode] = generateModelMocks(model, types);
  //   const testDir = path.dirname(`${appRoot}/${mocksPath}`);
  //   if (!fs.existsSync(testDir)) {
  //     fs.mkdirSync(testDir);
  //   }
  //   fs.writeFileSync(`${appRoot}/${mocksPath}`, mocksCode);
  //   const [graphqlPath, graphqlCode] = generateModelGraphQLTypes(model, types);
  //   fs.writeFileSync(`${appRoot}/${graphqlPath}`, graphqlCode);
}

// console.log(sqlConformancesCode);
fs.writeFileSync(config.duetConformancesLocation, duetConformancesCode);

if (config.duetSqlConformancesLocation) {
  fs.writeFileSync(config.duetSqlConformancesLocation, sqlConformancesCode);
}
