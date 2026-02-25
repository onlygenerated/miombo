/**
 * Singleton string table loader.
 * I18n.t(key, ...args) with {0}, {1} parameter substitution.
 */
export class I18n {
  private static strings: Record<string, string> = {};

  /** Load a flat JSON object of key→string mappings. */
  static load(data: Record<string, string>): void {
    I18n.strings = data;
  }

  /** Look up a key, substituting {0}, {1}, etc. Returns the key itself if not found. */
  static t(key: string, ...args: (string | number)[]): string {
    let str = I18n.strings[key];
    if (str === undefined) return key;
    for (let i = 0; i < args.length; i++) {
      str = str.replace(`{${i}}`, String(args[i]));
    }
    return str;
  }

  /** Check if a key exists in the current string table. */
  static has(key: string): boolean {
    return key in I18n.strings;
  }
}
