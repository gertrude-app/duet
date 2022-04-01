export type Prop = {
  name: string;
  type: string;
};

export default class Model {
  public name: string;
  public filepath: string;
  public migrationNumber?: number;
  public taggedTypes: Record<string, string> = {};
  public dbEnums: Record<string, string[]> = {};
  public jsonables: string[] = [];
  public relations: Record<string, { type: string; relationType: string }> = {};
  public props: Prop[] = [];
  public computedProps: Prop[] = [];
  public init: Array<{ propName: string; hasDefault: boolean }> = [];

  public constructor(name: string = ``, filepath: string = ``) {
    this.name = name;
    this.filepath = filepath;
  }

  public dir(customSubdirs: Record<string, string>): string {
    const subdir = customSubdirs[this.name] ?? `/${this.name}s`;
    return `Sources/App/Models${subdir}`;
  }

  public get camelCaseName(): string {
    return this.name.charAt(0).toLowerCase() + this.name.slice(1);
  }

  public static mock(): Model {
    return new Model(`Thing`, `Sources/App/Models/Things/Thing.swift`);
  }
}
