export interface TranslationStep {
  character: string;
  ascii_value: number;
  target_base: number;
  division_steps: { dividend: number; divisor: number; quotient: number; remainder: number }[];
  result: string;
}

export interface TranslationResult {
  original_text: string;
  target_base: number;
  steps: TranslationStep[];
  encoded_payload: string[];
  binary_stream: string;
}

function asciiToCodex(asciiValue: number, base: number): string {
  if (base < 2 || base > 36) throw new Error(`Invalid base: ${base}`);
  if (asciiValue === 0) return '0';

  const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  let value = asciiValue;

  while (value > 0) {
    result = digits[value % base] + result;
    value = Math.floor(value / base);
  }

  return result;
}

function codexToAscii(codexValue: string, base: number): number {
  const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = 0;

  for (const char of codexValue.toUpperCase()) {
    const digitValue = digits.indexOf(char);
    if (digitValue === -1 || digitValue >= base) {
      throw new Error(`Invalid digit '${char}' for base ${base}`);
    }
    result = result * base + digitValue;
  }

  return result;
}

function getTranslationSteps(asciiValue: number, targetBase: number): TranslationStep['division_steps'] {
  const steps: TranslationStep['division_steps'] = [];
  let value = asciiValue;

  while (value > 0) {
    steps.push({
      dividend: value,
      divisor: targetBase,
      quotient: Math.floor(value / targetBase),
      remainder: value % targetBase,
    });
    value = Math.floor(value / targetBase);
  }

  return steps;
}

export function translateMessage(text: string, targetBase: number): TranslationResult {
  const steps: TranslationStep[] = [];
  const encodedPayload: string[] = [];

  for (const char of text) {
    const ascii = char.charCodeAt(0);
    const codexResult = asciiToCodex(ascii, targetBase);
    const divisionSteps = getTranslationSteps(ascii, targetBase);

    steps.push({
      character: char,
      ascii_value: ascii,
      target_base: targetBase,
      division_steps: divisionSteps,
      result: codexResult,
    });

    encodedPayload.push(codexResult);
  }

  const binaryStream = text
    .split('')
    .map(c => c.charCodeAt(0).toString(2).padStart(8, '0'))
    .join(' ');

  return {
    original_text: text,
    target_base: targetBase,
    steps,
    encoded_payload: encodedPayload,
    binary_stream: binaryStream,
  };
}

export function encodePayload(text: string, targetBase: number): string[] {
  return text.split('').map(c => asciiToCodex(c.charCodeAt(0), targetBase));
}

export function decodePayload(codexValues: string[], sourceBase: number): string {
  return codexValues.map(v => String.fromCharCode(codexToAscii(v, sourceBase))).join('');
}

export function getAllBases(planets: { id: string; codex: number }[]): { id: string; codex: number }[] {
  return planets.map(p => ({ id: p.id, codex: p.codex }));
}
