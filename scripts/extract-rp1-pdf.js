const path = require('path');
const { extractAndSavePDFData } = require('../utils/pdf-extractor');

async function main() {
  const pdfPath = path.join(__dirname, '../rp1.pdf');
  const outputPath = path.join(__dirname, '../pdf-data/rp1-extracted-data.json');
  
  console.log('🚀 Starting PDF extraction process...');
  console.log(`📄 PDF Path: ${pdfPath}`);
  console.log(`💾 Output Path: ${outputPath}`);
  
  try {
    const extractedData = await extractAndSavePDFData(pdfPath, outputPath);
    console.log('\n✅ Extraction completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Pages: ${extractedData.metadata.pages}`);
    console.log(`   - Static text entries: ${extractedData.staticText.length}`);
    console.log(`   - Dynamic text entries: ${extractedData.dynamicText.length}`);
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

