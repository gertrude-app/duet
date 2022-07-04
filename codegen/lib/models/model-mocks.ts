import { GlobalTypes } from '../types';
import { isTimestamp } from './graphql';
import Model from './Model';

export function generateModelMocks(
  model: Model,
  globalTypes: GlobalTypes,
): [filepath: string, code: string] {
  const mockParams = params(model, globalTypes, `mock`);
  let code = ``;
  code += `// auto-generated, do not edit\nimport DuetMock\nimport GraphQL\n\n`;
  code += `@testable import App\n\nextension ${model.name} {\n  `;
  code += `static var mock: ${model.name} {\n    ${model.name}(`;
  if (mockParams.join(`, `).length < 80) {
    code += mockParams.join(`, `);
    code += `)\n  }`;
  } else {
    code += `\n      `;
    code += mockParams.join(`,\n      `);
    code += `\n    )\n  }`;
  }

  code += `\n\n  static var empty: ${model.name} {\n    ${model.name}(`;
  const emptyParams = params(model, globalTypes, `empty`);
  if (emptyParams.join(`, `).length < 80) {
    code += emptyParams.join(`, `);
    code += `)\n  }`;
  } else {
    code += `\n      `;
    code += emptyParams.join(`,\n      `);
    code += `\n    )\n  }`;
  }

  code += `\n\n  static var random: ${model.name} {\n    ${model.name}(`;
  const randomParams = params(model, globalTypes, `random`);
  if (randomParams.join(`, `).length < 80) {
    code += randomParams.join(`, `);
    code += `)\n  }\n`;
  } else {
    code += `\n      `;
    code += randomParams.join(`,\n      `);
    code += `\n    )\n  }\n`;
  }

  code += generateMapFn(model, globalTypes);

  code += `\n}\n`;

  if (code.includes(`NonEmpty<`)) {
    code = code.replace(`import GraphQL`, `import GraphQL\nimport NonEmpty`);
  }

  if (code.includes(`Date()`)) {
    code = code.replace(`import GraphQL`, `import Foundation\nimport GraphQL`);
  }

  code = code.replace(/ Document /g, ` App.Document `);
  code = code.replace(/ Token /g, ` App.Token `);

  return [`${model.name}+Mocks.swift`, code];
}

function generateMapFn(model: Model, types: GlobalTypes): string {
  const lines = model.props
    .filter((p) => !isTimestamp(p.name))
    .map((prop) => {
      return `"${prop.name}": ${mapValue(prop.name, prop.type, model, types)}`;
    });
  return `\n  ` + MAP_FN_PATTERN.replace(`/* MAP_ITEMS */`, lines.join(`,\n      `));
}

function mapValue(name: string, type: string, model: Model, types: GlobalTypes): string {
  if (types.sideLoaded[`${model.name}.${name}`] === type) {
    return `.null`;
  }
  if (type.endsWith(`?`)) {
    return `${name} != nil ? ${mapValue(
      name,
      type.replace(/\?$/, ``),
      model,
      types,
    ).replace(name, `${name}!`)} : .null`;
  }

  const isTaggedUUID =
    model.taggedTypes[type] === `UUID` || types.taggedTypes[type] === `UUID`;
  if (type === `Id` || type.endsWith(`.Id`) || isTaggedUUID) {
    return `.string(${name}.lowercased)`;
  }

  if (model.dbEnums[type] || types.dbEnums[type]) {
    return `.string(${name}.rawValue)`;
  }

  const taggedType = model.taggedTypes[type] || types.taggedTypes[type];
  if (taggedType) {
    return mapValue(name, taggedType, model, types).replace(/(\)?\))$/, `.rawValue$1`);
  }

  switch (type) {
    case `Int`:
    case `Double`:
    case `Int64`:
      return `.number(Number(${name}))`;
    case `Bool`:
      return `.bool(${name})`;
    case `Date`:
      return `.string(${name}.isoString)`;
    case `String`:
      return `.string(${name})`;
    case `Cents<Int>`:
    case `Seconds<Int>`:
    case `Seconds<Double>`:
      return `.number(Number(${name}.rawValue))`;
    case `NonEmpty<[Int]>`:
      return `.array(${name}.array.map { .number(Number($0)) })`;
    case `EmailAddress`:
    case `GitCommitSha`:
      return `.string(${name}.rawValue)`;
  }

  if (model.jsonables.includes(type) || types.jsonables.includes(type)) {
    return `.string(${name}.toPostgresJson)`;
  }

  throw new Error(`Unhandled mapValue type: ${type} on ${model.name}.${name}`);
}

function params(
  model: Model,
  globalTypes: GlobalTypes,
  type: 'empty' | 'mock' | 'random',
): string[] {
  return model.init
    .filter((p) => !p.hasDefault)
    .map(({ propName }) => {
      const prop = model.props.find((p) => p.name == propName);
      if (!prop) {
        throw new Error(`Error resolving init param type for ${model.name}.${propName}`);
      }
      const values = mockValue(prop.type, propName, model, globalTypes);
      return `${propName}: ${values[type]}`;
    });
}

function mockValue(
  type: string,
  propName: string,
  model: Model,
  types: GlobalTypes,
): { mock: string; empty: string; random: string } {
  if (type.endsWith(`?`)) {
    return {
      mock: `nil`,
      empty: `nil`,
      random: `Bool.random() ? ${
        mockValue(type.replace(/\?$/, ``), propName, model, types).random
      } : nil`,
    };
  }

  const dbEnum = model.dbEnums[type] || types.dbEnums[type];
  if (dbEnum) {
    return {
      mock: `.${dbEnum[0]}`,
      empty: `.${dbEnum[0]}`,
      random: `${type}.allCases.shuffled().first!`,
    };
  }

  if ([`slug`, `filename`].includes(propName) && type === `String`) {
    return {
      mock: `"mock-${propName.toLowerCase()}"`,
      empty: `""`,
      random: `"random-${propName}-\\(Int.random)"`,
    };
  }

  switch (type) {
    case `String`:
      return { mock: `"@mock ${propName}"`, empty: `""`, random: `"@random".random` };
    case `Int`:
      return { mock: `42`, empty: `0`, random: `Int.random` };
    case `Int64`:
      return { mock: `42`, empty: `0`, random: `Int64.random` };
    case `Seconds<Double>`:
      return {
        mock: `42`,
        empty: `0`,
        random: `.init(rawValue: Double.random(in: 100...999))`,
      };
    case `Cents<Int>`:
      return { mock: `42`, empty: `0`, random: `.init(rawValue: Int.random)` };
    case `NonEmpty<[Int]>`:
      return {
        mock: `NonEmpty<[Int]>(42)`,
        empty: `NonEmpty<[Int]>(0)`,
        random: `NonEmpty<[Int]>(Int.random)`,
      };
    case `Bool`:
      return { mock: `true`, empty: `false`, random: `Bool.random()` };
    case `Date`:
      return { mock: `Date()`, empty: `Date()`, random: `Date()` };
    case `EmailAddress`:
      return {
        mock: `"mock@mock.com"`,
        empty: `"empty@empty.com"`,
        random: `.init(rawValue: "random@random\\(Int.random).com")`,
      };
    case `GitCommitSha`:
      return {
        mock: `"@mock ${propName}"`,
        empty: `""`,
        random: `.init(rawValue: "@random".random)`,
      };
    default: {
      const taggedType = model.taggedTypes[type] || types.taggedTypes[type];
      if (taggedType) {
        const { mock, empty, random } = mockValue(taggedType, propName, model, types);
        return {
          mock: `.init(rawValue: ${mock})`,
          empty: `.init(rawValue: ${empty})`,
          random: `.init(rawValue: ${random})`,
        };
      }

      if (type.endsWith(`.Id`) || type === `UUID`) {
        return { mock: `.init()`, empty: `.init()`, random: `.init()` };
      }

      if (model.jsonables.includes(type) || types.jsonables.includes(type)) {
        return {
          mock: `.mock`,
          empty: `.empty`,
          random: `.random`,
        };
      }

      throw new Error(
        `Unhandled init param mock value type: ${type} at ${model.name}.${propName}`,
      );
    }
  }
}

const MAP_FN_PATTERN = /* swift */ `
  func gqlMap(omitting: Set<String> = []) -> GraphQL.Map {
    var map: GraphQL.Map = .dictionary([
      /* MAP_ITEMS */,
    ])
    omitting.forEach { try? map.remove($0) }
    return map
  }
`.trim();
