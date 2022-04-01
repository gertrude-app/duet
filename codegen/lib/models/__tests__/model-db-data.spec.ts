import { describe, expect, it } from '@jest/globals';
import stripIndent from 'strip-indent';
import { insertData } from '../model-db-data';
import { GlobalTypes } from '../../types';
import Model from '../Model';

describe(`insertData()`, () => {
  it(`can handle all types of columns`, () => {
    const globalTypes: GlobalTypes = {
      jsonables: [],
      dbEnums: { JimJam: [`jim`, `jam`] },
      taggedTypes: { GitCommitSha: `String` },
      sideLoaded: {},
    };

    const model = Model.mock();
    model.taggedTypes = { FooId: `Int`, PaymentId: `String` };
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
      extension Thing {
        var insertValues: [ColumnName: Postgres.Data] {
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

    expect(insertData(model, globalTypes)).toBe(expected);
  });
});
