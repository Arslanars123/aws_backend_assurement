const fs = require("fs");
const path = require("path");
const pdfParseLib = require("pdf-parse");
const { PDFDocument } = require("pdf-lib");

// pdf-parse v2+ uses PDFParse class
const { PDFParse } = pdfParseLib;

/**
 * Extract text and styling information from PDF
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<Object>} Extracted data with text, positions, and styling
 */
async function extractPDFData(pdfPath) {
  try {
    console.log("📄 Starting PDF extraction...");

    // Read PDF file
    const dataBuffer = fs.readFileSync(pdfPath);

    // Convert Buffer to Uint8Array (required by pdf-parse v2+)
    const uint8Array = new Uint8Array(dataBuffer);

    // Extract text with pdf-parse (v2+ uses PDFParse class)
    const parser = new PDFParse(uint8Array);
    await parser.load();
    const textResult = await parser.getText();

    // getText() returns an object with 'text' (string) and 'pages' (array) properties
    const text =
      typeof textResult === "string" ? textResult : textResult.text || "";
    const textPages = textResult.pages || [];
    const pageCount =
      textPages.length || (parser.getPageCount ? parser.getPageCount() : 1);
    const info = parser.getInfo ? await parser.getInfo() : {};

    const pdfData = {
      text: text,
      numpages: pageCount,
      pages: textPages,
      info: info,
      version: "1.0",
    };

    // Load PDF with pdf-lib for detailed information
    const pdfDoc = await PDFDocument.load(dataBuffer);
    const pdfLibPages = pdfDoc.getPages();

    const extractedData = {
      metadata: {
        pages: pdfData.numpages,
        info: pdfData.info,
        version: pdfData.version,
        pageWidth: pdfLibPages[0]?.getWidth() || 595.28, // A4 width in points
        pageHeight: pdfLibPages[0]?.getHeight() || 841.89, // A4 height in points
      },
      staticText: [],
      dynamicText: [],
      layout: {
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
        fonts: [],
      },
    };

    // SIMPLE APPROACH: Extract ALL text directly from PDF
    // Use page-specific text if available, otherwise use full text
    let allTextLines = [];

    if (pdfData.pages && pdfData.pages.length > 0) {
      // Use page-specific extraction (more accurate)
      console.log(`📄 Extracting from ${pdfData.pages.length} pages...`);
      pdfData.pages.forEach((pageData, pageIndex) => {
        const pageText = pageData.text || "";
        const lines = pageText.split("\n");
        allTextLines.push({ page: pageIndex + 1, lines: lines });
      });
    } else {
      // Fallback: use full text and split by pages
      const fullText = pdfData.text;
      const allLines = fullText.split("\n");
      const linesPerPage = Math.ceil(allLines.length / pdfData.numpages);

      for (let pageNum = 1; pageNum <= pdfData.numpages; pageNum++) {
        const startIdx = (pageNum - 1) * linesPerPage;
        const endIdx = Math.min(startIdx + linesPerPage, allLines.length);
        allTextLines.push({
          page: pageNum,
          lines: allLines.slice(startIdx, endIdx),
        });
      }
    }

    // Process each page's lines
    allTextLines.forEach((pageData) => {
      const pageNum = pageData.page;
      const lines = pageData.lines;
      const lineHeight = 15;

      lines.forEach((line, lineIndex) => {
        const yPosition =
          extractedData.layout.margins.top + lineIndex * lineHeight;

        // Skip if beyond page
        if (
          yPosition >
          extractedData.metadata.pageHeight -
            extractedData.layout.margins.bottom
        ) {
          return;
        }

        const textEntry = {
          text: line, // Keep original text
          page: pageNum,
          y: yPosition,
          x: extractedData.layout.margins.left,
          fontSize: 12,
          fontFamily: "Helvetica",
          color: "black",
          lineIndex: lineIndex,
        };

        // Simple check: if line contains brackets or common placeholders, mark as dynamic
        const trimmed = line.trim();
        if (
          trimmed.length > 0 &&
          ((line.includes("[") && line.includes("]")) ||
            line.includes("Special text") ||
            line.includes("Project setup") ||
            line.includes("Select Date"))
        ) {
          textEntry.color = "red";
          textEntry.isDynamic = true;
          textEntry.placeholder = `FIELD_${
            extractedData.dynamicText.length + 1
          }`;
          extractedData.dynamicText.push(textEntry);
        } else {
          // ALL other text (including empty lines) goes to static
          extractedData.staticText.push(textEntry);
        }
      });
    });

    console.log(
      `✅ Extracted ${extractedData.staticText.length} static text entries`
    );
    console.log(
      `✅ Extracted ${extractedData.dynamicText.length} dynamic text entries`
    );

    return extractedData;
  } catch (error) {
    console.error("❌ Error extracting PDF:", error);
    throw error;
  }
}

/**
 * Save extracted PDF data to JSON file
 * @param {Object} extractedData - The extracted data object
 * @param {string} outputPath - Path to save the JSON file
 */
function saveExtractedData(extractedData, outputPath) {
  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      outputPath,
      JSON.stringify(extractedData, null, 2),
      "utf8"
    );
    console.log(`💾 Saved extracted data to: ${outputPath}`);
  } catch (error) {
    console.error("❌ Error saving extracted data:", error);
    throw error;
  }
}

/**
 * Load extracted PDF data from JSON file
 * @param {string} jsonPath - Path to the JSON file
 * @returns {Object} The extracted data object
 */
function loadExtractedData(jsonPath) {
  try {
    if (!fs.existsSync(jsonPath)) {
      console.warn(`⚠️  Extracted data file not found: ${jsonPath}`);
      return null;
    }

    const data = fs.readFileSync(jsonPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ Error loading extracted data:", error);
    return null;
  }
}

/**
 * Main extraction function - extracts PDF and saves to JSON
 * @param {string} pdfPath - Path to the PDF file
 * @param {string} outputPath - Path to save the JSON file (optional)
 * @param {boolean} force - Force re-extraction even if cached data exists
 */
async function extractAndSavePDFData(
  pdfPath,
  outputPath = null,
  force = false
) {
  const defaultOutputPath = path.join(
    __dirname,
    "../pdf-data/rp1-extracted-data.json"
  );
  const savePath = outputPath || defaultOutputPath;

  // Check if already extracted (unless force is true)
  if (!force) {
    const existingData = loadExtractedData(savePath);
    if (existingData) {
      console.log("📋 Using cached extracted data");
      return existingData;
    }
  } else {
    console.log("🔄 Force re-extraction requested");
  }

  // Extract PDF
  const extractedData = await extractPDFData(pdfPath);

  // Save to JSON
  saveExtractedData(extractedData, savePath);

  return extractedData;
}

module.exports = {
  extractPDFData,
  saveExtractedData,
  loadExtractedData,
  extractAndSavePDFData,
};
