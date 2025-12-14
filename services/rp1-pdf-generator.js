const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { loadExtractedData } = require('../utils/pdf-extractor');

/**
 * Generate PDF using PDFKit based on extracted rp1.pdf data
 * @param {Object} dynamicData - Dynamic data to fill in red text fields
 * @param {Object} options - Options for PDF generation
 * @returns {PDFDocument} PDFKit document instance
 */
function generateRP1PDF(dynamicData = {}, options = {}) {
  // Load extracted data
  const extractedDataPath = path.join(__dirname, '../pdf-data/rp1-extracted-data.json');
  const extractedData = loadExtractedData(extractedDataPath);
  
  if (!extractedData) {
    throw new Error('Extracted PDF data not found. Please run extraction first.');
  }

  // Create PDF document
  const doc = new PDFDocument({
    size: [extractedData.metadata.pageWidth, extractedData.metadata.pageHeight],
    margins: extractedData.layout.margins,
  });

  // Set up fonts and default styling
  doc.font('Helvetica');
  doc.fontSize(12);
  doc.fillColor('black');

  // Group text entries by page
  const textByPage = {};
  extractedData.staticText.forEach((textEntry) => {
    if (!textByPage[textEntry.page]) {
      textByPage[textEntry.page] = { static: [], dynamic: [] };
    }
    textByPage[textEntry.page].static.push(textEntry);
  });

  extractedData.dynamicText.forEach((textEntry, index) => {
    if (!textByPage[textEntry.page]) {
      textByPage[textEntry.page] = { static: [], dynamic: [] };
    }
    textByPage[textEntry.page].dynamic.push({ ...textEntry, index });
  });

  // Render each page
  const totalPages = extractedData.metadata.pages;
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (pageNum > 1) {
      doc.addPage();
    }

    const pageTexts = textByPage[pageNum] || { static: [], dynamic: [] };

    // Render static text for this page
    pageTexts.static.forEach((textEntry) => {
      doc.font(textEntry.fontFamily || 'Helvetica');
      doc.fontSize(textEntry.fontSize || 12);
      doc.fillColor(textEntry.color || 'black');
      
      doc.text(textEntry.text, textEntry.x || 50, textEntry.y || 50, {
        width: extractedData.metadata.pageWidth - (textEntry.x || 50) - 50,
        align: 'left',
      });
    });

    // Render dynamic text (red text) for this page
    pageTexts.dynamic.forEach((textEntry) => {
      const dynamicValue = dynamicData[`field_${textEntry.index}`] || dynamicData[textEntry.placeholder] || textEntry.text;
      
      doc.font(textEntry.fontFamily || 'Helvetica');
      doc.fontSize(textEntry.fontSize || 12);
      doc.fillColor('red'); // Dynamic text is red
      
      doc.text(dynamicValue, textEntry.x || 50, textEntry.y || 50, {
        width: extractedData.metadata.pageWidth - (textEntry.x || 50) - 50,
        align: 'left',
      });
    });
  }

  return doc;
}

/**
 * Generate PDF buffer
 * @param {Object} dynamicData - Dynamic data to fill in red text fields
 * @param {Object} options - Options for PDF generation
 * @returns {Promise<Buffer>} PDF buffer
 */
function generateRP1PDFBuffer(dynamicData = {}, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = generateRP1PDF(dynamicData, options);
      const chunks = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      doc.on('error', (error) => {
        reject(error);
      });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate PDF and save to file
 * @param {string} outputPath - Path to save the PDF
 * @param {Object} dynamicData - Dynamic data to fill in red text fields
 * @param {Object} options - Options for PDF generation
 * @returns {Promise<string>} Path to saved PDF
 */
async function generateRP1PDFFile(outputPath, dynamicData = {}, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = generateRP1PDF(dynamicData, options);
      const stream = fs.createWriteStream(outputPath);
      
      doc.pipe(stream);
      
      stream.on('finish', () => {
        resolve(outputPath);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateRP1PDF,
  generateRP1PDFBuffer,
  generateRP1PDFFile,
};

