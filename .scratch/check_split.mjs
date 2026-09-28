import fs from 'fs';
import path from 'path';

const targetFile = 'D:/mydokumen/myproject/Apk_SiBangku/Apk_SiBangku/src/SiBangku.Web/Services/LanguageService.cs';

// We'll read the current file up to line 195 (where Translations dictionary starts)
const content = fs.readFileSync(targetFile, 'utf8');

// Let's verify we can find the start of Translations
const splitIdx = content.indexOf('    private static readonly Dictionary<string, Dictionary<string, string>> Translations = new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase)');
if (splitIdx === -1) {
  console.error("Could not find Translations start!");
  process.exit(1);
}

console.log("Found Translations at index", splitIdx);
