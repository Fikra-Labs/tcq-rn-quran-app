/**
 * Removes raw footnote markup from translation strings.
 * Examples to remove:
 *  - <footnote id="1155" number="166">
 *  - </footnote>
 *  - <footnote id="1155" number="166" />
 */
export function stripFootnoteTags(text: string): string {
  return (text ?? "")
    .replace(/<footnote\s+[^>]*>/gi, "")
    .replace(/<\/footnote>/gi, "")
    .replace(/<footnote[^>]*\/>/gi, "");
}
