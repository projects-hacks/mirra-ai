/**
 * Material Symbols Outlined uses ligatures: the text node must match the icon name
 * exactly (lowercase + underscores). Parent `text-transform: uppercase` (e.g. label-caps)
 * breaks glyphs; normalize any dynamic icon string from APIs or CMS.
 */
export function materialSymbolLigature(icon: string): string {
  return icon.trim().toLowerCase();
}
