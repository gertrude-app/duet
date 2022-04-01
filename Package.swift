// swift-tools-version:5.5
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
  name: "Duet",
  platforms: [.macOS(.v12)],
  products: [
    .library(name: "Duet", targets: ["Duet"]),
    .library(name: "DuetSQL", targets: ["DuetSQL"]),
    .library(name: "DuetMock", targets: ["DuetMock"]),
  ],
  dependencies: [
    .package(name: "XKit", path: "../x-kit"),
    .package(url: "https://github.com/vapor/fluent-kit.git", from: "1.16.0"),
    .package(url: "https://github.com/pointfreeco/swift-tagged", from: "0.6.0"),
    .package(url: "https://github.com/wickwirew/Runtime.git", from: "2.2.4"),
  ],
  targets: [
    .target(
      name: "Duet",
      dependencies: [
        .product(name: "XCore", package: "XKit"),
        .product(name: "Tagged", package: "swift-tagged"),
      ]
    ),
    .target(
      name: "DuetSQL",
      dependencies: [
        "Duet",
        "Runtime",
        .product(name: "FluentSQL", package: "fluent-kit"),
        .product(name: "XCore", package: "XKit"),
        .product(name: "Tagged", package: "swift-tagged"),
      ]
    ),
    .target(name: "DuetMock", dependencies: ["Duet"]),
    .testTarget(name: "DuetSQLTests", dependencies: ["DuetSQL"]),
    .testTarget(name: "DuetTests", dependencies: ["Duet"]),
  ]
)
