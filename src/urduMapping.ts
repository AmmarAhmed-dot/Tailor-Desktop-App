export const urduPhoneticMap: Record<string, string> = {
  'a': 'ا', 'A': 'آ',
  'b': 'ب', 'B': 'بھ',
  'c': 'چ', 'C': 'ث',
  'd': 'د', 'D': 'ڈ',
  'e': 'ع', 'E': 'ے',
  'f': 'ف', 'F': 'ف', // simplified
  'g': 'گ', 'G': 'غ',
  'h': 'ہ', 'H': 'ح',
  'i': 'ی', 'I': 'ٰ',
  'j': 'ج', 'J': 'ض',
  'k': 'ک', 'K': 'خ',
  'l': 'ل', 'L': 'ل',
  'm': 'م', 'M': 'م',
  'n': 'ن', 'N': 'ں',
  'o': 'و', 'O': 'ۃ',
  'p': 'پ', 'P': 'پھ',
  'q': 'ق', 'Q': 'ق',
  'r': 'ر', 'R': 'ڑ',
  's': 'س', 'S': 'ص',
  't': 'ت', 'T': 'ٹ',
  'u': 'ئ', 'U': 'ء',
  'v': 'ط', 'V': 'ظ',
  'w': 'و', 'W': 'و',
  'x': 'ش', 'X': 'ژ',
  'y': 'ے', 'Y': 'ی',
  'z': 'ز', 'Z': 'ذ',
  ',': '،', '?': '؟',
  // Keep numbers same or convert to Urdu numbers
  // '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴', '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹'
};

export function transliterate(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += urduPhoneticMap[char] !== undefined ? urduPhoneticMap[char] : char;
  }
  return result;
}
