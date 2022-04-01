import { insertData, toPostgresData } from './model-db-data';
import { GlobalTypes } from '../types';
import Model from './Model';
import { pluralize } from '../script-helpers';

export function generateModelConformances(
  model: Model,
  types: GlobalTypes,
): [filepath: string, code: string] {
  const { name, migrationNumber, props } = model;
  let code = `// auto-generated, do not edit\nimport DuetSQL\nimport Tagged\n`;

  code += `\n`;
  code += `extension ${name}: ApiModel {`;
  code += `\n  typealias Id = Tagged<${name}, UUID>\n`;
  code += `}\n\n`;

  const table = migrationNumber
    ? `M${migrationNumber}.tableName`
    : `"${pascalToSnake(name)}s"`;

  code += `extension ${name}: Model {\n  static let tableName = ${table}\n`;
  code += PG_DATA_FUNC;
  code += `}\n`;

  code += `\nextension ${name} {\n  typealias ColumnName = CodingKeys\n\n`;
  code += `  enum CodingKeys: String, CodingKey, CaseIterable {\n    `;
  code += props.map((p) => `case ${p.name}`).join(`\n    `);
  code += `\n  }\n}\n\n`;

  code += insertData(model, types) + `\n`;

  code = code
    .replace(/Things/g, pluralize(model.name))
    .replace(/Thing/g, model.name)
    .replace(
      `// PG_DATA_CASES_HERE`,
      model.props
        .flatMap((prop) => {
          const data = toPostgresData(prop, model, types, `forInspect`);
          return [
            `case .${prop.name}:`,
            !data.includes(`return `) ? `  return ${data}` : `  ${data}`,
          ];
        })
        .join(`\n    `),
    );

  return [`Sources/App/Models/Generated/${model.name}+Conformances.swift`, code];
}

function pascalToSnake(str: string): string {
  return str
    .trim()
    .split(/(?=[A-Z])/)
    .join('_')
    .toLowerCase();
}

const PG_DATA_FUNC = /* swift */ `
  func postgresData(for column: ColumnName) -> Postgres.Data {
    switch column {
    // PG_DATA_CASES_HERE
    }
  }
`;
