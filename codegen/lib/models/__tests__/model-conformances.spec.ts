import { describe, it, expect } from '@jest/globals';
import stripIndent from 'strip-indent';
import { generateModelConformances } from '../model-conformances';
import Model from '../Model';
import { GlobalTypes } from '../../types';

describe(`generateModelConformances()`, () => {
  const types: GlobalTypes = {
    jsonables: [`Mustard`],
    dbEnums: { FooEnum: [`foo`] },
    taggedTypes: { GitCommitSha: `String`, Foo: `Int` },
    sideLoaded: {},
  };

  it(`generates correct conformances for models`, () => {
    const model = Model.mock();
    model.migrationNumber = 8;
    model.props = [
      { name: `id`, type: `Id` },
      { name: `name`, type: `String` },
      { name: `version`, type: `GitCommitSha` },
      { name: `mustard`, type: `Mustard` },
    ];

    const expectedCode = stripIndent(/* swift */ `
      // auto-generated, do not edit
      import DuetSQL
      import Tagged

      extension Thing: ApiModel {
        typealias Id = Tagged<Thing, UUID>
      }

      extension Thing: Model {
        static let tableName = M8.tableName

        func postgresData(for column: ColumnName) -> Postgres.Data {
          switch column {
          case .id:
            return .id(self)
          case .name:
            return .string(name)
          case .version:
            return .string(version.rawValue)
          case .mustard:
            return .json(mustard.toPostgresJson)
          }
        }
      }

      extension Thing {
        typealias ColumnName = CodingKeys

        enum CodingKeys: String, CodingKey, CaseIterable {
          case id
          case name
          case version
          case mustard
        }
      }

      extension Thing {
        var insertValues: [ColumnName: Postgres.Data] {
          [
            .id: .id(self),
            .name: .string(name),
            .version: .string(version.rawValue),
            .mustard: .json(mustard.toPostgresJson),
          ]
        }
      }
    `).trim();

    const [path, code] = generateModelConformances(model, types);
    expect(code).toBe(expectedCode + `\n`);
    expect(path).toBe(`Sources/App/Models/Generated/Thing+Conformances.swift`);
  });

  it(`generates correct timestamp conformances`, () => {
    const model = Model.mock();
    model.props = [
      { name: `id`, type: `Id` },
      { name: `createdAt`, type: `Date` },
      { name: `updatedAt`, type: `Date` },
      { name: `deletedAt`, type: `Date?` },
    ];

    const expectedCode = stripIndent(/* swift */ `
      // auto-generated, do not edit
      import DuetSQL
      import Tagged

      extension Thing: ApiModel {
        typealias Id = Tagged<Thing, UUID>
      }

      extension Thing: Model {
        static let tableName = "things"

        func postgresData(for column: ColumnName) -> Postgres.Data {
          switch column {
          case .id:
            return .id(self)
          case .createdAt:
            return .date(createdAt)
          case .updatedAt:
            return .date(updatedAt)
          case .deletedAt:
            return .date(deletedAt)
          }
        }
      }

      extension Thing {
        typealias ColumnName = CodingKeys

        enum CodingKeys: String, CodingKey, CaseIterable {
          case id
          case createdAt
          case updatedAt
          case deletedAt
        }
      }

      extension Thing {
        var insertValues: [ColumnName: Postgres.Data] {
          [
            .id: .id(self),
            .createdAt: .currentTimestamp,
            .updatedAt: .currentTimestamp,
          ]
        }
      }
    `).trim();

    const [path, code] = generateModelConformances(model, types);
    expect(code).toBe(expectedCode + `\n`);
    expect(path).toBe(`Sources/App/Models/Generated/Thing+Conformances.swift`);
  });

  it(`generates correct timestamp conformances for non-auto createdAt`, () => {
    const model = Model.mock();
    model.props = [
      { name: `id`, type: `Id` },
      { name: `createdAt`, type: `Date` },
    ];
    model.init = [
      { propName: `id`, hasDefault: true },
      { propName: `createdAt`, hasDefault: false },
    ];

    const expectedCode = stripIndent(/* swift */ `
      extension Thing {
        var insertValues: [ColumnName: Postgres.Data] {
          [
            .id: .id(self),
            .createdAt: .date(createdAt),
          ]
        }
      }
    `).trim();

    const [path, code] = generateModelConformances(model, types);
    expect(code).toContain(expectedCode);
  });
});
