const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

// Pulls plain text out of an uploaded resume. Supports PDF and DOCX.
// Legacy .doc files can't be parsed reliably, so we ask the user to re-save as PDF/DOCX.
async function extractResumeText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await fs.promises.readFile(filePath);

  let text = "";

  if (ext === ".pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy();
    }
  } else if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else {
    const err = new Error("Only PDF and DOCX resumes can be read by AI. Re-save your .doc as PDF or DOCX.");
    err.status = 400;
    throw err;
  }

  text = text.replace(/\s+\n/g, "\n").trim();

  // Scanned (image-only) PDFs have no text layer
  if (text.length < 50) {
    const err = new Error("Could not read text from this file. It may be a scanned image — upload a text-based PDF or DOCX.");
    err.status = 422;
    throw err;
  }

  return text;
}

module.exports = { extractResumeText };
