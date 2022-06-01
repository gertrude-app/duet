import { describe, expect, it } from '@jest/globals';
import stripIndent from 'strip-indent';
import { duetSqlModelConformance } from '../sql-conformance';
import { GlobalTypes } from '../../types';
import Model from '../Model';

describe(`duetSqlModelConformance()`, () => {
  const types: GlobalTypes = {
    jsonables: [`Mustard`],
    dbEnums: { FooEnum: [`foo`] },
    taggedTypes: { GitCommitSha: `String`, Foo: `Int` },
    sideLoaded: {},
  };

  it(`can handle all types of columns`, () => {
    const globalTypes: GlobalTypes = {
      jsonables: [],
      dbEnums: { JimJam: [`jim`, `jam`] },
      taggedTypes: { GitCommitSha: `String` },
      sideLoaded: {},
    };

    const model = Model.mock();
    model.taggedTypes = { FooId: `Int`, PaymentId: `String` };
    model.migrationNumber = 1;
    model.props = [
      { name: `id`, type: `Id` },
      { name: `parentId`, type: `OtherModel.Id` },
      { name: `optionalParentId`, type: `RandoModel.Id?` },
      { name: `published`, type: `Date?` },
      { name: `lols`, type: `NonEmpty<[Int]>` },
      { name: `optionalLols`, type: `NonEmpty<[Int]>?` },
      { name: `honestInt`, type: `Int` },
      { name: `optionalInt`, type: `Int?` },
      { name: `honestString`, type: `String` },
      { name: `optionalString`, type: `String?` },
      { name: `fooId`, type: `FooId` },
      { name: `optionalFooId`, type: `FooId?` },
      { name: `paymentId`, type: `PaymentId` },
      { name: `myBool`, type: `Bool` },
      { name: `jimJam`, type: `JimJam` },
      { name: `someRandoEnum`, type: `Suit` },
      { name: `sha`, type: `GitCommitSha` },
      { name: `createdAt`, type: `Date` },
      { name: `updatedAt`, type: `Date` },
      { name: `deletedAt`, type: `Date?` },
    ];

    const expected = stripIndent(/* swift */ `
      extension Thing: Model, ApiModel {
        public static let tableName = M1.tableName
        public typealias ColumnName = CodingKeys

        public func postgresData(for column: ColumnName) -> Postgres.Data {
          switch column {
          case .id:
            return .id(self)
          case .parentId:
            return .uuid(parentId)
          case .optionalParentId:
            return .uuid(optionalParentId)
          case .published:
            return .date(published)
          case .lols:
            return .intArray(lols.array)
          case .optionalLols:
            return .intArray(optionalLols?.array)
          case .honestInt:
            return .int(honestInt)
          case .optionalInt:
            return .int(optionalInt)
          case .honestString:
            return .string(honestString)
          case .optionalString:
            return .string(optionalString)
          case .fooId:
            return .int(fooId.rawValue)
          case .optionalFooId:
            return .int(optionalFooId?.rawValue)
          case .paymentId:
            return .string(paymentId.rawValue)
          case .myBool:
            return .bool(myBool)
          case .jimJam:
            return .enum(jimJam)
          case .someRandoEnum:
            return .enum(someRandoEnum)
          case .sha:
            return .string(sha.rawValue)
          case .createdAt:
            return .date(createdAt)
          case .updatedAt:
            return .date(updatedAt)
          case .deletedAt:
            return .date(deletedAt)
          }
        }

        public var insertValues: [ColumnName: Postgres.Data] {
          [
            .id: .id(self),
            .parentId: .uuid(parentId),
            .optionalParentId: .uuid(optionalParentId),
            .published: .date(published),
            .lols: .intArray(lols.array),
            .optionalLols: .intArray(optionalLols?.array),
            .honestInt: .int(honestInt),
            .optionalInt: .int(optionalInt),
            .honestString: .string(honestString),
            .optionalString: .string(optionalString),
            .fooId: .int(fooId.rawValue),
            .optionalFooId: .int(optionalFooId?.rawValue),
            .paymentId: .string(paymentId.rawValue),
            .myBool: .bool(myBool),
            .jimJam: .enum(jimJam),
            .someRandoEnum: .enum(someRandoEnum),
            .sha: .string(sha.rawValue),
            .createdAt: .currentTimestamp,
            .updatedAt: .currentTimestamp,
          ]
        }
      }
    `).trim();

    const actual = duetSqlModelConformance(model, globalTypes);
    expect(actual).toBe(expected);
  });

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
      extension Thing: Model, ApiModel {
        public static let tableName = M8.tableName
        public typealias ColumnName = CodingKeys

        public func postgresData(for column: ColumnName) -> Postgres.Data {
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

        public var insertValues: [ColumnName: Postgres.Data] {
          [
            .id: .id(self),
            .name: .string(name),
            .version: .string(version.rawValue),
            .mustard: .json(mustard.toPostgresJson),
          ]
        }
      }
    `).trim();

    const code = duetSqlModelConformance(model, types);
    expect(code).toBe(expectedCode);
  });

  it(`generates correct timestamp details`, () => {
    const model = Model.mock();
    model.props = [
      { name: `id`, type: `Id` },
      { name: `createdAt`, type: `Date` },
      { name: `updatedAt`, type: `Date` },
      { name: `deletedAt`, type: `Date?` },
    ];

    const expected = stripIndent(/* swift */ `
      extension Thing: Model, ApiModel {
        public static let tableName = "things"
        public typealias ColumnName = CodingKeys

        public func postgresData(for column: ColumnName) -> Postgres.Data {
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

        public var insertValues: [ColumnName: Postgres.Data] {
          [
            .id: .id(self),
            .createdAt: .currentTimestamp,
            .updatedAt: .currentTimestamp,
          ]
        }
      }
    `).trim();

    const actual = duetSqlModelConformance(model, types);
    expect(actual).toBe(expected);
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

    const expected = stripIndent(/* swift */ `
      public var insertValues: [ColumnName: Postgres.Data] {
        [
          .id: .id(self),
          .createdAt: .date(createdAt),
        ]
      }
    `)
      .trim()
      .replace(/\n/g, `\n  `);

    const actual = duetSqlModelConformance(model, types);
    expect(actual).toContain(expected);
  });
});
