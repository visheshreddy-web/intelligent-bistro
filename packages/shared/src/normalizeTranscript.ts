export function normalizeOrderTranscript(text: string): string {
  let t = text.trim();
  if (!t) return t;

  const replacements: [RegExp, string][] = [
    [/\bclassical\b/gi, "classic"],
    [/\bbeach\s+bbq\b/gi, "BBQ"],
    [/\bbarbecue\b/gi, "BBQ"],
    [/\bdoctor\s+pepper\b/gi, "Dr Pepper"],
    [/\bdiet\s*coke\b/gi, "Diet Coke"],
    [/\bcoke\s*zero\b/gi, "Coke Zero"],
    [/\broot\s*beer\b/gi, "Root Beer"],
    [/\bfanta\b/gi, "Fanta Orange"],
    [/\bginger\s*ale\b/gi, "Ginger Ale"],
    [/\bextra\s+pickle(s)?\b/gi, "extra pickles"],
    [/\bno\s+lettuces\b/gi, "no lettuce"],
    [/\bno\s+onions\b/gi, "no onion"],
    [/\bno\s+tomatoes\b/gi, "no tomato"],
    [/\bfountain\s+drinks\b/gi, "fountain drinks"],
    [/\bice\s+tea\b/gi, "iced tea"],
    [/\bchicken\s+sandwich\b/gi, "spicy chicken"],
    [/\bgrill\s+cheese\b/gi, "grilled cheese"],
    [/\bBBQ\s+burger\b/gi, "BBQ Bacon Burger"],
    [/\bclassic\s+burger\b/gi, "Classic Bistro Burger"],
  ];

  for (const [pattern, replacement] of replacements) {
    t = t.replace(pattern, replacement);
  }

  return t.replace(/\s+/g, " ").trim();
}
