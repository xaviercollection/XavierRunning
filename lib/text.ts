/** Splits "Doce. Intenso. Marcante." into ["Doce.", "Intenso.", "Marcante."] for stacked reveals. */
export function splitSentences(text: string): string[] {
  return (text.match(/[^.]+\./g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}
