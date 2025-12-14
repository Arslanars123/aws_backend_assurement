const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { extractAndSavePDFData } = require("../utils/pdf-extractor");
const {
  generateRP1PDFBuffer,
  generateRP1PDFFile,
} = require("../services/rp1-pdf-generator");
const {
  generateRP1PDFBufferFromText,
  generateRP1PDFFileFromText,
} = require("../services/rp1-pdf-generator-simple");

/**
 * GET /download-pdf/:filename
 * Download a PDF file from the server
 */
router.get("/download-pdf/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, "../", filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: `PDF file not found: ${filename}`,
      });
    }

    // Check if it's a PDF file
    if (!filename.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({
        success: false,
        message: "File must be a PDF",
      });
    }

    // Set headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("error", (error) => {
      console.error("Error streaming PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Error reading PDF file",
        });
      }
    });
  } catch (error) {
    console.error("Error in download-pdf:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /extract-rp1-pdf
 * Extract text and styling from rp1.pdf and save to JSON
 */
router.post("/extract-rp1-pdf", async (req, res) => {
  try {
    const { force = false } = req.body;
    const pdfPath = path.join(__dirname, "../rp1.pdf");
    const outputPath = path.join(
      __dirname,
      "../pdf-data/rp1-extracted-data.json"
    );

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        success: false,
        message: "rp1.pdf not found in root directory",
      });
    }

    console.log("🔄 Extracting PDF data...");
    const extractedData = await extractAndSavePDFData(
      pdfPath,
      outputPath,
      force
    );

    res.json({
      success: true,
      message: "PDF extracted successfully",
      data: {
        pages: extractedData.metadata.pages,
        staticTextCount: extractedData.staticText.length,
        dynamicTextCount: extractedData.dynamicText.length,
        savedTo: outputPath,
        cached: !force && fs.existsSync(outputPath),
      },
    });
  } catch (error) {
    console.error("Error extracting PDF:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack,
    });
  }
});

/**
 * POST /generate-rp1-pdf
 * Generate PDF using PDFKit based on extracted rp1.pdf data
 */
router.post("/generate-rp1-pdf", async (req, res) => {
  try {
    const { dynamicData = {}, filename = "generated-rp1.pdf" } = req.body;

    console.log("🔄 Generating PDF...");
    const pdfBuffer = await generateRP1PDFBuffer(dynamicData);

    // Set headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack,
    });
  }
});

/**
 * POST /generate-rp1-pdf-save
 * Generate PDF and save to file
 */
router.post("/generate-rp1-pdf-save", async (req, res) => {
  try {
    const {
      dynamicData = {},
      filename = "generated-rp1.pdf",
      savePath = "./uploads",
    } = req.body;

    const fullPath = path.join(__dirname, "../", savePath, filename);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log("🔄 Generating and saving PDF...");
    const savedPath = await generateRP1PDFFile(fullPath, dynamicData);

    res.json({
      success: true,
      message: "PDF generated and saved successfully",
      filePath: savedPath,
      filename: filename,
    });
  } catch (error) {
    console.error("Error generating and saving PDF:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack,
    });
  }
});

/**
 * POST /generate-rp1-pdf-from-text
 * Generate PDF using provided text content (simpler approach)
 */
router.post("/generate-rp1-pdf-from-text", async (req, res) => {
  try {
    const {
      textData,
      dynamicData = {},
      filename = "generated-rp1.pdf",
    } = req.body;

    if (!textData || !textData.pages) {
      return res.status(400).json({
        success: false,
        message: "textData with pages array is required",
      });
    }

    console.log("🔄 Generating PDF from text data...");
    const pdfBuffer = await generateRP1PDFBufferFromText(textData, dynamicData);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF from text:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack,
    });
  }
});

/**
 * POST /generate-rp1-pdf-from-text-save
 * Generate PDF from text and save to file
 */
router.post("/generate-rp1-pdf-from-text-save", async (req, res) => {
  try {
    const {
      textData,
      dynamicData = {},
      filename = "generated-rp1.pdf",
      savePath = "./uploads",
    } = req.body;

    if (!textData || !textData.pages) {
      return res.status(400).json({
        success: false,
        message: "textData with pages array is required",
      });
    }

    const fullPath = path.join(__dirname, "../", savePath, filename);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log("🔄 Generating and saving PDF from text...");
    const savedPath = await generateRP1PDFFileFromText(
      fullPath,
      textData,
      dynamicData
    );

    res.json({
      success: true,
      message: "PDF generated and saved successfully",
      filePath: savedPath,
      filename: filename,
    });
  } catch (error) {
    console.error("Error generating and saving PDF from text:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack,
    });
  }
});

module.exports = (db) => {
  // Routes don't require db, but following the pattern for consistency
  return router;
};
