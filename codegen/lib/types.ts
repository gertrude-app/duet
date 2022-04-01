export type File = {
  path: string;
  source: string;
};

export type GlobalTypes = {
  dbEnums: Record<string, string[]>;
  jsonables: string[];
  taggedTypes: Record<string, string>;
  sideLoaded: Record<string, string>;
};

export type ExtractContext =
  | { kind: `extension` }
  | { kind: `global`; typeStack: string[] };
