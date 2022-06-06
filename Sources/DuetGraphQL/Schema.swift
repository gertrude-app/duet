import DuetSQL
import Graphiti
import Vapor

public enum Schema<Resolver> {
  public typealias ModelType<Model: DuetSQL.Model> = Type<Resolver, Request, Model>
  public typealias AppField<FieldType, Args: Decodable> = Field<Resolver, Request, FieldType, Args>
  public typealias AppType<Value: Encodable> = Type<Resolver, Request, Value>
  public typealias AppInput<InputObjectType: Decodable> = Input<Resolver, Request, InputObjectType>

  public static var IdentifiedEntityType: AppType<IdentifiedEntity> {
    Type(IdentifiedEntity.self) {
      Field("id", at: \.id.lowercased)
    }
  }

  public static var GenericResponseType: AppType<GenericResponse> {
    Type(GenericResponse.self) {
      Field("success", at: \.success)
    }
  }
}

public struct InputArgs<Input: Codable>: Codable {
  public let input: Input

  public init(input: Input) {
    self.input = input
  }
}

public struct IdentifyEntityArgs: Codable {
  public let id: UUID

  public init(id: UUID) {
    self.id = id
  }
}

public struct GenericResponse: Codable {
  public let success: Bool

  public init(success: Bool) {
    self.success = success
  }
}

public struct DeletedEntityResult: Codable {
  public let deletedId: UUID

  public init(deletedId: UUID) {
    self.deletedId = deletedId
  }
}

public struct IdentifiedEntity: Codable {
  public let id: UUID

  public init(id: UUID) {
    self.id = id
  }
}
