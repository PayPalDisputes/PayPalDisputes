/**
 * Tiny syntax highlighter for the marketing code samples (TypeScript, Python, Go, shell).
 * Good enough for short, known snippets; avoids shipping Shiki/Prism to the browser.
 */

export type Token = { text: string; kind?: "comment" | "string" | "keyword" | "number" | "fn" | "prop" | "flag" | "var" };

const KEYWORDS = new Set([
  // TS / JS
  "import", "from", "export", "const", "let", "await", "async", "function", "return", "new", "if", "for", "of", "true", "false", "null",
  // Python
  "def", "in", "None", "True", "False", "print",
  // Go
  "func", "err", "nil", "range", "package", "var", "type",
  // shell
  "curl",
]);

const PATTERN = new RegExp(
  [
    String.raw`(?<comment>(?<=^|\s)(?:\/\/|#)[^\n]*)`,
    String.raw`(?<string>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\]|\\.)*'|\x60(?:[^\x60\\]|\\.)*\x60)`,
    String.raw`(?<flag>(?<=\s)-{1,2}[A-Za-z][\w-]*)`,
    String.raw`(?<var>\$[A-Z_][A-Z0-9_]*)`,
    String.raw`(?<number>\b\d+(?:\.\d+)?\b)`,
    String.raw`(?<prop>(?<=\.)[A-Za-z_]\w*)`,
    String.raw`(?<word>[A-Za-z_]\w*)(?<call>\s*\()?`,
  ].join("|"),
  "g",
);

export function highlight(code: string): Token[][] {
  return code.split("\n").map((line) => {
    const tokens: Token[] = [];
    let last = 0;
    for (const m of line.matchAll(PATTERN)) {
      const start = m.index ?? 0;
      if (start > last) tokens.push({ text: line.slice(last, start) });
      const g = m.groups ?? {};
      if (g.comment) tokens.push({ text: g.comment, kind: "comment" });
      else if (g.string) tokens.push({ text: g.string, kind: "string" });
      else if (g.flag) tokens.push({ text: g.flag, kind: "flag" });
      else if (g.var) tokens.push({ text: g.var, kind: "var" });
      else if (g.number) tokens.push({ text: g.number, kind: "number" });
      else if (g.prop) tokens.push({ text: g.prop, kind: line[start + g.prop.length] === "(" ? "fn" : "prop" });
      else if (g.word) {
        tokens.push({ text: g.word, kind: KEYWORDS.has(g.word) ? "keyword" : g.call ? "fn" : undefined });
        if (g.call) tokens.push({ text: g.call });
      }
      last = start + m[0].length;
    }
    if (last < line.length) tokens.push({ text: line.slice(last) });
    return tokens;
  });
}
