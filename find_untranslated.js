const fs = require('fs');
const content = fs.readFileSync('extl3.js', 'utf8');
const lines = content.split('\n');

const untranslated = [];
let inFunction = false;
let currentFunction = '';

lines.forEach((line, idx) => {
  // Track which function we're in
  const funcMatch = line.match(/^(async )?function (page\d+|drawSectionBar|footer|cell|drawTocLine)/);
  if (funcMatch) {
    currentFunction = funcMatch[2] || funcMatch[3];
    inFunction = true;
  }
  if (line.trim() === '}' && inFunction) {
    inFunction = false;
  }
  
  // Skip comments and requires
  if (line.trim().startsWith('//') || line.includes('require(')) return;
  
  // Find .text() calls with hardcoded strings that aren't using t()
  if (line.includes('.text(') && !line.includes('t(') && !line.includes('translations[') && !line.includes('translated')) {
    const match = line.match(/\.text\(['"]([^'"]{5,})['"]/);
    if (match) {
      const text = match[1];
      // Filter meaningful strings
      if (text.length > 4 && 
          !text.match(/^(http|https|Helvetica|A4|A3|center|left|right|black|white|#[0-9a-fA-F]{3,6})$/i) &&
          !text.match(/^[0-9\s\-\.\/]+$/) &&
          (text.includes(' ') || text.includes('\\n'))) {
        untranslated.push({
          line: idx + 1,
          function: currentFunction,
          text: text.replace(/\\n/g, ' ')
        });
      }
    }
  }
});

console.log('=== UNTRANSLATED HARDCODED STRINGS IN .text() CALLS ===\n');
console.log(`Total found: ${untranslated.length}\n`);
untranslated.forEach((item, i) => {
  console.log(`${i+1}. Line ${item.line} (${item.function}): "${item.text}"`);
});
