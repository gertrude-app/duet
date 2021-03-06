// swift-tools-version:5.5
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
  name: "Duet",
  platforms: [.macOS(.v11)],
  products: [
    .library(name: "Duet", targets: ["Duet"]),
    .library(name: "DuetSQL", targets: ["DuetSQL"]),
    .library(name: "DuetMock", targets: ["DuetMock"]),
    .library(name: "DuetGraphQL", targets: ["DuetGraphQL"]),
  ],
  dependencies: [
    .package("jaredh159/x-kit@1.1.1"),
    .package("vapor/fluent-kit@1.16.0"),
    .package("pointfreeco/swift-tagged@0.6.0"),
    .package("wickwirew/Runtime@2.2.4"),
    .package("vapor/vapor@4.49.2"),
    .package("alexsteinerde/graphql-kit@2.3.0", "GraphQLKit"),
  ],
  targets: [
    .target(
      name: "Duet",
      dependencies: [
        .product(name: "XCore", package: "x-kit"),
        .product(name: "Tagged", package: "swift-tagged"),
      ]
    ),
    .target(
      name: "DuetSQL",
      dependencies: [
        "Duet",
        "Runtime",
        .product(name: "FluentSQL", package: "fluent-kit"),
        .product(name: "XCore", package: "x-kit"),
        .product(name: "Tagged", package: "swift-tagged"),
      ]
    ),
    .target(
      name: "DuetGraphQL",
      dependencies: [
        .product(name: "Vapor", package: "vapor"),
        "DuetSQL",
        "GraphQLKit",
      ]
    ),
    .target(name: "DuetMock", dependencies: ["Duet"]),
    .testTarget(name: "DuetSQLTests", dependencies: ["DuetSQL"]),
    .testTarget(name: "DuetTests", dependencies: ["Duet"]),
  ]
)

extension PackageDescription.Package.Dependency {
  static func package(_ commitish: String, _ name: String? = nil) -> Package.Dependency {
    let parts = commitish.split(separator: "@")
    return .package(
      name: name,
      url: "https://github.com/\(parts[0]).git",
      from: .init(stringLiteral: "\(parts[1])")
    )
  }
}
