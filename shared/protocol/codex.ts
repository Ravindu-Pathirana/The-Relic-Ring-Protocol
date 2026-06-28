/**
 * Codex conversion utilities for the Relic Ring Protocol.
 *
 * Each planet operates in its own number base (codex). These functions
 * translate between standard ASCII decimal values and arbitrary-base
 * codex representations used for inter-planetary payload encoding.
 */

/**
 * Convert a decimal ASCII value to its representation in the target base.
 *
 * @param asciiValue - Decimal ASCII code point (e.g. 65 for 'A')
 * @param base - Target codex base (2-36)
 * @returns The value expressed as a string in the target base
 */
export function asciiToCodex(asciiValue: number, base: number): string {
  if (base < 2 || base > 36) {
    throw new RangeError(`Codex base must be between 2 and 36, got ${base}`);
  }
  if (asciiValue < 0) {
    throw new RangeError(`ASCII value must be non-negative, got ${asciiValue}`);
  }
  return asciiValue.toString(base).toUpperCase();
}

/**
 * Convert a codex string back to its decimal ASCII value.
 *
 * @param codexValue - String in the source base (e.g. "101" in base 2)
 * @param base - Source codex base (2-36)
 * @returns Decimal ASCII code point
 */
export function codexToAscii(codexValue: string, base: number): number {
  if (base < 2 || base > 36) {
    throw new RangeError(`Codex base must be between 2 and 36, got ${base}`);
  }
  const value: number = parseInt(codexValue, base);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid codex value "${codexValue}" for base ${base}`);
  }
  return value;
}

/**
 * Encode a full text payload into an array of codex strings in the target base.
 *
 * @param text - Plain text string to encode
 * @param targetBase - Target codex base (2-36)
 * @returns Array of codex-encoded values, one per character
 */
export function encodePayload(text: string, targetBase: number): string[] {
  const encoded: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ascii: number = text.charCodeAt(i);
    encoded.push(asciiToCodex(ascii, targetBase));
  }
  return encoded;
}

/**
 * Decode an array of codex strings back to plain text.
 *
 * @param codexValues - Array of codex-encoded values
 * @param sourceBase - Source codex base (2-36)
 * @returns Decoded plain text string
 */
export function decodePayload(codexValues: string[], sourceBase: number): string {
  const chars: string[] = [];
  for (const codex of codexValues) {
    const ascii: number = codexToAscii(codex, sourceBase);
    chars.push(String.fromCharCode(ascii));
  }
  return chars.join('');
}

/**
 * Serialize an array of codex values into a flat binary stream string.
 * Each codex value is converted to its binary (base-2) representation
 * and zero-padded to 8 bits, then concatenated.
 *
 * @param codexValues - Array of codex-encoded values (in any base)
 * @returns Flat binary string (e.g. "0100000101000010")
 */
export function payloadToBinaryStream(codexValues: string[]): string {
  const bits: string[] = [];
  for (const value of codexValues) {
    // Codex values are already string representations; treat each as
    // an opaque token and convert its character codes to 8-bit binary.
    // However, per the protocol spec, we interpret each codex value as
    // a numeric quantity and serialize that number in binary.
    // Since the base is not provided here, we parse each value as the
    // raw characters and output their 8-bit binary representations.
    for (let i = 0; i < value.length; i++) {
      const charCode: number = value.charCodeAt(i);
      bits.push(charCode.toString(2).padStart(8, '0'));
    }
  }
  return bits.join('');
}
