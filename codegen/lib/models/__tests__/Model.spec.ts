import { describe, it, expect } from '@jest/globals';
import stripIndent from 'strip-indent';
import Model from '../Model';

describe(`Model`, () => {
  it(`generates correct Duet.IdentifiableConformance`, () => {
    const expected = stripIndent(/* swift */ `
      extension Thing: Duet.Identifiable {
        public typealias Id = Tagged<Thing, UUID>
      }
    `);

    expect(Model.mock().duetIdentifiableConformance).toBe(expected);
  });

  it(`generates correct CodingKeys`, () => {
    const expected = stripIndent(/* swift */ `
      public extension Thing {
        enum CodingKeys: String, CodingKey, CaseIterable {
          case id
          case foo
        }
      }
    `);

    const model = Model.mock();
    model.props = [
      { name: `id`, type: `Id` },
      { name: `foo`, type: `String` },
    ];
    expect(model.codingKeysExtension).toBe(expected.trim());
  });

  it(`tableName (w/ migration number)`, () => {
    const model = Model.mock();
    model.migrationNumber = 1;
    expect(model.tableName).toBe(`M1.tableName`);
  });

  it(`tableName (NO migration number)`, () => {
    expect(Model.mock().tableName).toBe(`"things"`);
  });
});
