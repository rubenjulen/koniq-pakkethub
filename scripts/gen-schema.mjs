// Genereert src/db/schema-sql.ts uit src/db/schema.sql zodat het schema mee-bundelt
// in productie (standalone/Vercel) i.p.v. van schijf te worden gelezen.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(join(root, "src/db/schema.sql"), "utf8");
const esc = sql.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const out = `// AUTO-GEGENEREERD uit schema.sql — niet handmatig bewerken.
// Regenereren na wijziging van schema.sql:  npm run gen:schema
export const SCHEMA_SQL = \`
${esc}\`;
`;
writeFileSync(join(root, "src/db/schema-sql.ts"), out);
console.log("schema-sql.ts geschreven:", out.length, "chars");
