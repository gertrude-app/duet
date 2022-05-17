import { describe, it, expect } from '@jest/globals';
import stripIndent from 'strip-indent';
import { extractModelAttrs, extractModels } from '../model-attrs';
import { extractGlobalTypes } from '../global-types';

describe(`extractModelAttrs()`, () => {
  it(`handles optional deletedAt correctly`, () => {
    const source = stripIndent(/* swift */ `
    final class Thing: Codable {
      var deletedAt: Date?

      init(deletedAt: Date? = nil) {
        self.deletedAt = deletedAt
      }
    } 
  `);

    const attrs = extractModelAttrs({ source, path: `/Models/Thing.swift` });
    expect(attrs?.props[0]).toEqual({ name: `deletedAt`, type: `Date?` });
    expect(attrs?.init[0]).toEqual({ propName: `deletedAt`, hasDefault: true });
  });

  it(`handles non-optional deletedAt with init default correctly`, () => {
    const source = stripIndent(/* swift */ `
    final class Thing: Codable {
      var deletedAt: Date

      public init(deletedAt: Date? = nil) {
        self.deletedAt = deletedAt ?? Date()
      }
    } 
  `);

    const attrs = extractModelAttrs({ source, path: `/Models/Thing.swift` });
    expect(attrs?.props[0]).toEqual({ name: `deletedAt`, type: `Date` });
    expect(attrs?.init[0]).toEqual({ propName: `deletedAt`, hasDefault: true });
  });

  it(`extracts basic props`, () => {
    const source = stripIndent(/* swift */ `
    final class Thing: Codable {
      var id: Id
      public var name: String
      var foo: String // @TODO comment shouldn't interfere with extraction
      var parentId: Parent.Id
      var lols: NonEmpty<[Int]>
      public var hasBeard: Bool { true }
      var kids = Children<Person>.notLoaded
      var createdAt = Date()
      var updatedAt: Date
      var deletedAt = Date()

      var computed1: Int { 42 }
      var computed2: NonEmpty<[Int]> {
        .init(42)
      }
      var computed3: Cents<Int> { someFunction() }

      public init(
        id: Id = .init(),
        name: String,
        foo: String,
        parentId: Parent.Id,
        lols: NonEmpty<[Int]>
      ) {
        self.id = id
        self.name = name
        self.foo = foo
        self.parentId = parentId
        self.lols = lols
      }
    } 
  `);

    const attrs = extractModelAttrs({ source, path: `/Models/Thing.swift` });
    expect(attrs).toEqual({
      name: `Thing`,
      filepath: `/Models/Thing.swift`,
      taggedTypes: {},
      dbEnums: {},
      jsonables: [],
      relations: {
        kids: { type: `Person`, relationType: `Children` },
      },
      computedProps: [
        { name: `hasBeard`, type: `Bool` },
        { name: `computed1`, type: `Int` },
        { name: `computed2`, type: `NonEmpty<[Int]>` },
        { name: `computed3`, type: `Cents<Int>` },
      ],
      props: [
        { name: `id`, type: `Id` },
        { name: `name`, type: `String` },
        { name: `foo`, type: `String` },
        { name: `parentId`, type: `Parent.Id` },
        { name: `lols`, type: `NonEmpty<[Int]>` },
        { name: `createdAt`, type: `Date` },
        { name: `updatedAt`, type: `Date` },
        { name: `deletedAt`, type: `Date` },
      ],
      init: [
        { propName: `id`, hasDefault: true },
        { propName: `name`, hasDefault: false },
        { propName: `foo`, hasDefault: false },
        { propName: `parentId`, hasDefault: false },
        { propName: `lols`, hasDefault: false },
      ],
    });
  });

  it(`can extract underlying types from tagged typealiases`, () => {
    const source = stripIndent(/* swift */ `
      final class Thing: Codable {
        var t1: Alias1
        var t2: Alias2?
        var t3: Alias3
      } 

      extension Thing {
        typealias Alias1 = Tagged<Thing, UUID>
        typealias Alias2 = Tagged<(thing: Thing, t2: ()), Int>
        typealias Alias3 = Tagged<Thing, String>
      }
  `);

    const models = extractModels([{ source, path: `/Models/Thing.swift` }]);
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe(`Thing`);
    expect(models[0]?.taggedTypes).toEqual({
      Alias1: `UUID`,
      Alias2: `Int`,
      Alias3: `String`,
    });
  });

  it(`can extract nested db enums`, () => {
    const source = stripIndent(/* swift */ `
      final class Thing: Codable {
        var foo: FooBar
        var bar: JimJam
      } 

      extension Thing {
        enum Foobar: String, Codable, CaseIterable {
          case foo
          case bar
        }
        
        enum JimJam: String, Codable, CaseIterable {
          case jim
          case jam
        }
      }
  `);

    const models = extractModels([{ source, path: `/Models/Thing.swift` }]);
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe(`Thing`);
    expect(models[0]?.dbEnums).toEqual({
      Foobar: [`foo`, `bar`],
      JimJam: [`jim`, `jam`],
    });
  });

  it(`can extract nested jsonables`, () => {
    const source = stripIndent(/* swift */ `
      final class Thing: Codable {
        var foo: FooBar
        var bar: JimJam
      } 

      extension Thing {
        enum Foobar: PostgresJsonable {
          case foo
        }
        
        struct JimJam: PostgresJsonable {
        }
      }
  `);

    const models = extractModels([{ source, path: `/Models/Thing.swift` }]);
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe(`Thing`);
    expect(models[0]?.jsonables).toEqual([`Foobar`, `JimJam`]);
  });
});

describe(`extractModels()`, () => {
  it(`extracts migration number (single migration)`, () => {
    const source1 = stripIndent(/* swift */ `
      final class Foobar: Codable {
        var id: UUID
        var age: Int

        init(id: Id = UUID(), age: Int) {
          self.id = id
          self.age = age
        }
      } 
    `);

    const source2 = stripIndent(/* swift */ `
      extension Foobar {
        enum M13 {
          static let tableName = "foobar"
        }
      } 
    `);

    const models = extractModels([
      { source: source1, path: `/Models/Foobar.swift` },
      { source: source2, path: `/Models/Foobar+Migration.swift` },
    ]);

    expect(models).toEqual([
      {
        name: `Foobar`,
        filepath: `/Models/Foobar.swift`,
        migrationNumber: 13,
        taggedTypes: {},
        dbEnums: {},
        jsonables: [],
        relations: {},
        init: [
          { propName: `id`, hasDefault: true },
          { propName: `age`, hasDefault: false },
        ],
        computedProps: [],
        props: [
          { name: `id`, type: `UUID` },
          { name: `age`, type: `Int` },
        ],
      },
    ]);
  });

  it(`extracts migration number (double migration)`, () => {
    const source1 = stripIndent(/* swift */ `
    final class Foobar: Codable {
      var id: UUID
    } 
  `);
    const source2 = stripIndent(/* swift */ `
    extension Foobar {
      enum M12 {
        static let tableName = "foobar"
      }

      enum M15 {
        static let lol = "lol"
      }
    } 
  `);

    const models = extractModels([
      { source: source1, path: `/Models/Foobar.swift` },
      { source: source2, path: `/Models/Foobar+Migration.swift` },
    ]);

    expect(models).toEqual([
      {
        name: `Foobar`,
        filepath: `/Models/Foobar.swift`,
        migrationNumber: 12,
        taggedTypes: {},
        dbEnums: {},
        jsonables: [],
        computedProps: [],
        relations: {},
        init: [],
        props: [{ name: `id`, type: `UUID` }],
      },
    ]);
  });
});

describe(`extractGlobalTypes()`, () => {
  it(`can extract dbEnums, taggedTypes, and jsonables`, () => {
    const source = stripIndent(/* swift */ `
      struct Beefcake: PostgresJsonable {}

      struct Donut: PostgresJsonable {
        // innerts here
      }

      enum Football: PostgresJsonable {}

      enum Soccer: PostgresJsonable {
        case rofl
      }

      extension RoflCopter: PostgresJsonable {}

      extension Bulldozer: PostgresJsonable {
        // innerds here
      }

      extension DogMeat.CatMeat: PostgresJsonable {}

      final class Hotdog: Codable {
        struct Mustard: PostgresJsonable {
          let amount: Int
        }

        struct Ketchup: PostgresJsonable {}

        enum Relish: PostgresJsonable {}

        enum Sauerkraut: PostgresJsonable {
          case lol
        }
      }

      enum FooEnum: String, Codable, CaseIterable {
        case foo
        case bar
      }

      enum SkipMe {
        case lol
      }

      typealias Foo = Tagged<(tagged: (), foo: ()), String>
      typealias Bar = Tagged<(tagged: (), bar: ()), Int>

      public struct NetworkDecision: JsonCodable, Equatable {
        public enum Verdict: String, Codable, Equatable, CaseIterable {
          case block
          case allow
        }

        public enum Reason: String, Codable, Equatable, CaseIterable, CustomStringConvertible {
          case systemUser
          case userIsExempt
        }
      }
    `);

    const types = extractGlobalTypes([source], {
      'CoreNetworkDecision.Verdict': `NetworkDecision.Verdict`,
    });

    expect(types).toEqual({
      jsonables: [
        `Beefcake`,
        `Donut`,
        `Football`,
        `Soccer`,
        `RoflCopter`,
        `Bulldozer`,
        `DogMeat.CatMeat`,
      ],
      dbEnums: {
        FooEnum: [`foo`, `bar`],
        'NetworkDecision.Verdict': [`block`, `allow`],
        'CoreNetworkDecision.Verdict': [`block`, `allow`],
        'NetworkDecision.Reason': [`systemUser`, `userIsExempt`],
      },
      taggedTypes: { Foo: `String`, Bar: `Int` },
      sideLoaded: {},
    });
  });
});
