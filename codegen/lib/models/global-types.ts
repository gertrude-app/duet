import { ExtractContext, GlobalTypes } from '../types';
import { extractDbEnum, isDbEnum } from './enums';
import { extractTaggedType } from './model-attrs';

export function extractGlobalTypes(
  sources: string[],
  typealiases: Record<string, string>,
): GlobalTypes {
  const types: GlobalTypes = {
    jsonables: [],
    dbEnums: {},
    taggedTypes: {},
    sideLoaded: {},
  };

  const typeStack: string[] = [];

  for (const source of sources) {
    const lines = source.split(`\n`);
    while (lines.length) {
      const line = lines.shift()!;
      updateStack(typeStack, line);
      extractJsonable(types.jsonables, line, { kind: `global`, typeStack });
      extractDbEnum(line, lines, types.dbEnums, { kind: `global`, typeStack });
      extractTaggedType(types, line);
    }
  }

  for (const [alias, type] of Object.entries(typealiases)) {
    const aliased: string[] | undefined = types.dbEnums[type];
    if (aliased) {
      types.dbEnums[alias] = aliased;
    }
  }

  return types;
}

export function extractJsonable(
  jsonables: string[],
  line: string,
  context: ExtractContext,
): void {
  const match = line.match(
    /^\s*(?:public )?(?:enum|struct|class|actor|extension) ([\w.]+)(?:: ([A-Za-z\., ]+)) {}?$/,
  );
  if (!match) {
    return;
  }
  const [_, typename, conformances] = match;
  if (!isJsonable(conformances)) {
    return;
  }

  if (context.kind === `global` && !line.startsWith(` `)) {
    const typeParts = [...context.typeStack, typename];
    jsonables.push(typeParts.join(`.`));
    return;
  }

  if (context.kind === `global` || !line.startsWith(` `)) {
    return;
  }

  jsonables.push(typename);
}

function isJsonable(conformances: string): boolean {
  return conformances.includes(`PostgresJsonable`);
}

function updateStack(types: string[], line: string) {
  const typeStartMatch = line.match(
    /^\s*(?:public )?(?:enum|struct|class|actor|extension) (\w+)(?:: ([A-Za-z\., ]+))? {$/,
  );

  if (typeStartMatch) {
    const [_, typename, conformances = ``] = typeStartMatch;
    if (!isDbEnum(conformances) && !isJsonable(conformances)) {
      types.push(typename);
    }
    return;
  }

  if (types.length === 0) {
    return;
  }

  const endMatch = line.match(/^( *)}$/);
  if (!endMatch) {
    return;
  }

  const expectedIndentationForTypeClosingBrace = (types.length - 1) * 2;
  if (endMatch[1].length === expectedIndentationForTypeClosingBrace) {
    types.pop();
  }
}
