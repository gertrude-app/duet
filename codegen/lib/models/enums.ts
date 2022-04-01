import { ExtractContext } from '../types';

export function extractDbEnum(
  line: string,
  lines: string[],
  dbEnums: Record<string, string[]>,
  context: ExtractContext,
): void {
  const enumMatch = line.match(/^\s*(?:public )?enum ([^: ]+): (.+) {/);
  if (!enumMatch) {
    return;
  }
  let [_, enumName, conformances] = enumMatch;
  if (!isDbEnum(conformances)) {
    return;
  }

  if (context.kind === `global`) {
    const typeParts = [...context.typeStack, enumName];
    enumName = typeParts.join(`.`);
  }

  // when looking for enums in Model extensions, they should always
  // be indented, so discard global enums
  if (context.kind === `extension` && line.startsWith(`enum`)) {
    return;
  }

  dbEnums[enumName] = extractDbEnumCases(lines);
}

function extractDbEnumCases(lines: string[]): string[] {
  const cases: string[] = [];
  while (lines.length) {
    const line = lines.shift()!;
    if (line.match(/^\s*}/)) {
      return cases;
    }
    const caseMatch = line.match(/  case ([a-z0-9]+)$/i);
    if (caseMatch) {
      cases.push(caseMatch[1]);
    }
  }
  return cases;
}

export function isDbEnum(conformanceStr: string): boolean {
  const conformances = conformanceStr.split(/,\s*/g).map((s) => s.trim());
  return (
    conformances.includes(`String`) &&
    conformances.includes('Codable') &&
    conformances.includes(`CaseIterable`)
  );
}
