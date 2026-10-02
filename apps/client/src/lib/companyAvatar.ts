// The company badge on a card: initials and a color worked out from the name alone (spec 011, AC-4, AC-5).

const MINOR_WORDS = new Set(["of", "and", "the", "for", "at", "&"]);

/** "Bank of America" → "BA", "Microsoft" → "M", "The Home Depot" → "HD". "?" when there is nothing to use. */
export function companyInitials(name: string): string {
  const words = name.split(/[\s\-_/.,]+/).filter((word) => word !== "");
  // Small words are skipped, unless the name has nothing else.
  const significant = words.filter((word) => !MINOR_WORDS.has(word.toLowerCase()));
  const used = significant.length > 0 ? significant : words.slice(0, 1);
  const initials = used
    .slice(0, 2)
    .map((word) => {
      // The first character, which may be more than one UTF-16 unit (an emoji, for example).
      const code = word.codePointAt(0);
      return code === undefined ? "" : String.fromCodePoint(code);
    })
    .join("")
    .toUpperCase();
  return initials || "?";
}

/** One of twelve hues, 0 to 330 in steps of 30, the same for a name whatever its capitals. */
export function companyHue(name: string): number {
  let hash = 0;
  for (const char of name.toLowerCase()) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return (hash % 12) * 30;
}
