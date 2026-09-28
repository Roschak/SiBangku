import fs from 'fs';

const targetFile = 'D:/mydokumen/myproject/Apk_SiBangku/Apk_SiBangku/src/SiBangku.Web/Services/LanguageService.cs';
const content = fs.readFileSync(targetFile, 'utf8');

// Function to extract dictionary blocks from current file
function extractDict(langKey) {
  const marker = `[${langKey}] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)`;
  const idx = content.indexOf(marker);
  if (idx === -1) return {};
  const start = content.indexOf('{', idx);
  // find matching closing '}' followed by comma or end
  let depth = 1;
  let end = start + 1;
  while (depth > 0 && end < content.length) {
    if (content[end] === '{') depth++;
    else if (content[end] === '}') depth--;
    end++;
  }
  const block = content.substring(start + 1, end - 1);
  const dict = {};
  const re = /\["([^"]+)"\]\s*=\s*"((?:\\"|[^"])*)"/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    dict[m[1]] = m[2];
  }
  return dict;
}

const existingZh = extractDict('Chinese');
const existingRu = extractDict('Russian');
const existingDe = extractDict('German');
const existingJa = extractDict('Japanese');
const existingEs = extractDict('Spanish');
const existingFr = extractDict('French');
const existingAr = extractDict('Arabic');

console.log("Extracted existing keys:", {
  zh: Object.keys(existingZh).length,
  ru: Object.keys(existingRu).length,
  de: Object.keys(existingDe).length,
  ja: Object.keys(existingJa).length,
  es: Object.keys(existingEs).length,
  fr: Object.keys(existingFr).length,
  ar: Object.keys(existingAr).length
});
