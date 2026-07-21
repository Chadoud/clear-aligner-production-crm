import { randomInt } from "node:crypto";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O (ambiguous visually)
const LOWER = "abcdefghjkmnpqrstuvwxyz"; // no i, l, o (ambiguous visually)
const DIGITS = "23456789"; // no 0 or 1 (ambiguous visually)
const ALL = UPPER + LOWER + DIGITS;

const PASSWORD_LENGTH = 12;

/**
 * Generate N cryptographically random characters from the unambiguous
 * alphanum alphabet (no 0, 1, I, O, i, l, o).
 * Used as the random suffix for both usernames (4 chars) and passwords (2 chars).
 */
export function generateSuffix(length: number): string {
  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    chars.push(ALL[randomInt(ALL.length)]);
  }
  return chars.join("");
}

/**
 * Generate a cryptographically random 12-character password.
 *
 * Guarantees at least one uppercase letter, one lowercase letter, and one
 * digit. Remaining 9 characters are drawn uniformly from the full alphabet.
 * The final string is Fisher-Yates shuffled so mandatory chars are not
 * always at predictable positions.
 *
 * Character set excludes visually ambiguous glyphs (0, O, 1, l, I).
 */
export function generateAppPassword(): string {
  const chars: string[] = [
    UPPER[randomInt(UPPER.length)],
    LOWER[randomInt(LOWER.length)],
    DIGITS[randomInt(DIGITS.length)],
  ];

  for (let i = chars.length; i < PASSWORD_LENGTH; i++) {
    chars.push(ALL[randomInt(ALL.length)]);
  }

  // Fisher-Yates shuffle (crypto-quality)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
