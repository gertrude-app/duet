import path from 'path';
import fs from 'fs';
import { scriptData, printCode, requireModel } from './lib/script-helpers';

function main() {
  const { appRoot, isDryRun, model, config } = requireModel(scriptData());

  let code = TEST_PATTERN.replace(/Thing/g, model.name)
    .replace(/thing/g, model.camelCaseName)
    .replace(/someProp/g, model.props[1]!.name);

  const generatedPath = `${appRoot}/${model.dir(config.modelDirs)}/${
    model.name
  }+ResolverTests.swift`.replace(`Sources/App/Models`, `Tests/AppTests`);

  if (fs.existsSync(generatedPath)) {
    console.log(`Not scaffolding repo, file ${generatedPath} already exists!`);
    process.exit(1);
  }

  if (isDryRun) {
    printCode(`repository`, generatedPath, code);
    process.exit(0);
  }

  const dirname = path.dirname(generatedPath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname);
  }
  fs.writeFileSync(generatedPath, code);
}

const TEST_PATTERN = /* swift */ `
import XCTVapor
import XCTVaporUtils

@testable import App

final class ThingResolverTests: AppTestCase {

  func testCreateThing() async throws {
    let thing = Thing.valid
    let map = thing.gqlMap()

    GraphQLTest(
      """
      mutation CreateThing($input: CreateThingInput!) {
        thing: createThing(input: $input) {
          id
        }
      }
      """,
      expectedData: .containsKVPs(["id": map["id"]]),
      headers: [.authorization: "Bearer \\(Seeded.tokens.allScopes)"]
    ).run(Self.app, variables: ["input": map])
  }

  func testGetThing() async throws {
    let thing = try await Current.db.create(Thing.valid)

    GraphQLTest(
      """
      query GetThing {
        thing: getThing(id: "\\(thing.id.uuidString)") {
          id
        }
      }
      """,
      expectedData: .containsKVPs(["id": thing.id.uuidString]),
      headers: [.authorization: "Bearer \\(Seeded.tokens.allScopes)"]
    ).run(Self.app)
  }

  func testUpdateThing() async throws {
    let thing = try await Current.db.create(Thing.valid)

    // do some updates here ---vvv
    thing.someProp = "new value"

    GraphQLTest(
      """
      mutation UpdateThing($input: UpdateThingInput!) {
        thing: updateThing(input: $input) {
          someProp
        }
      }
      """,
      expectedData: .containsKVPs(["someProp": "new value"]),
      headers: [.authorization: "Bearer \\(Seeded.tokens.allScopes)"]
    ).run(Self.app, variables: ["input": thing.gqlMap()])
  }

  func testDeleteThing() async throws {
    let thing = try await Current.db.create(Thing.valid)

    GraphQLTest(
      """
      mutation DeleteThing {
        thing: deleteThing(id: "\\(thing.id.uuidString)") {
          id
        }
      }
      """,
      expectedData: .containsKVPs(["id": thing.id.uuidString]),
      headers: [.authorization: "Bearer \\(Seeded.tokens.allScopes)"]
    ).run(Self.app, variables: ["input": thing.gqlMap()])

    let retrieved = try? await Current.db.find(thing.id)
    XCTAssertNil(retrieved)
  }
}

`;

main();
