const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * Generate PDF using PDFKit with provided text content
 * @param {Object} textData - Text content with structure:
 *   {
 *     pages: [
 *       {
 *         pageNumber: 1,
 *         content: [
 *           { text: "Static text", x: 50, y: 100, fontSize: 12, color: "black" },
 *           { text: "Dynamic text", x: 50, y: 120, fontSize: 12, color: "red", isDynamic: true, fieldName: "field1" }
 *         ]
 *       }
 *     ],
 *     pageWidth: 612,
 *     pageHeight: 792,
 *     margins: { top: 50, bottom: 50, left: 50, right: 50 }
 *   }
 * @param {Object} dynamicData - Dynamic data to fill in (e.g., { field1: "Value 1" })
 * @returns {PDFDocument} PDFKit document instance
 */
function generateRP1PDFFromText(textData, dynamicData = {}) {
  const pageWidth = textData.pageWidth || 612;
  const pageHeight = textData.pageHeight || 792;
  const margins = textData.margins || { top: 50, bottom: 50, left: 50, right: 50 };

  // Create PDF document
  const doc = new PDFDocument({
    size: [pageWidth, pageHeight],
    margins: margins,
  });

  // Process each page
  textData.pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage();
    }

    // Render each content item on this page
    page.content.forEach((item) => {
      // Set font and styling
      doc.font(item.fontFamily || "Helvetica");
      doc.fontSize(item.fontSize || 12);
      doc.fillColor(item.color || "black");

      // Get text value (use dynamic data if it's a dynamic field)
      let textValue = item.text;
      if (item.isDynamic && item.fieldName && dynamicData[item.fieldName]) {
        textValue = dynamicData[item.fieldName];
      }

      // Position and write text
      doc.text(textValue, item.x || margins.left, item.y || margins.top, {
        width: pageWidth - (item.x || margins.left) - margins.right,
        align: item.align || "left",
      });
    });
  });

  return doc;
}

/**
 * Generate PDF buffer from text data
 */
function generateRP1PDFBufferFromText(textData, dynamicData = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = generateRP1PDFFromText(textData, dynamicData);
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      doc.on("error", (error) => {
        reject(error);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate PDF file from text data
 */
async function generateRP1PDFFileFromText(
  outputPath,
  textData,
  dynamicData = {}
) {
  return new Promise((resolve, reject) => {
    try {
      const doc = generateRP1PDFFromText(textData, dynamicData);
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      stream.on("finish", () => {
        resolve(outputPath);
      });

      stream.on("error", (error) => {
        reject(error);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateRP1PDFFromText,
  generateRP1PDFBufferFromText,
  generateRP1PDFFileFromText,
};

