// app.js
// Run with: node app.js
// Requires: npm install express pdfkit

const express = require("express");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Page + layout constants
 */
const PAGE = {
  w: 595.28, // A4 width in points
  h: 841.89, // A4 height in points
};

// Margins
const M = {
  t: 50,
  b: 50,
  l: 50,
  r: 50,
};

const CONTENT_W = PAGE.w - M.l - M.r;
const CONTENT_H = PAGE.h - M.t - M.b;

// Colors
const HEADING_COLOR = "#003b71"; // dark blue
const LIGHT_GREY = "#eeeeee";
const BORDER_COLOR = "#003b71";

// Total pages (for footer)
const TOTAL_PAGES = 24;

/**
 * Draws a full-width dark-blue bar with white text (for section titles)
 */
function drawSectionBar(doc, y, text) {
  const barHeight = 20;

  doc.save().rect(M.l, y, CONTENT_W, barHeight).fill(HEADING_COLOR).restore();

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("white")
    .text(text, M.l + 8, y + 4, {
      width: CONTENT_W - 16,
      align: "left",
    });

  return y + barHeight + 10;
}

/**
 * Generic paragraph helper
 */
function paragraph(doc, y, text, options = {}) {
  doc
    .font(options.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.fontSize || 9)
    .fillColor(options.color || "black")
    .text(text, M.l, y, {
      width: CONTENT_W,
      lineGap: options.lineGap != null ? options.lineGap : 2,
      align: options.align || "left",
    });

  return doc.y + (options.afterGap != null ? options.afterGap : 4);
}

/**
 * Standard footer:
 * "Page X of 24" on left, "Part of Kvalitetssikring Danmark ApS" on right
 */
function footer(doc, logicalPageNumber) {
  const footerY = PAGE.h - M.b + 15;

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("black")
    .text(`Page ${logicalPageNumber} of ${TOTAL_PAGES}`, M.l, footerY, {
      width: CONTENT_W / 2,
      align: "left",
    });

  doc.text(
    "Part of Kvalitetssikring Danmark ApS",
    M.l + CONTENT_W / 2,
    footerY,
    {
      width: CONTENT_W / 2,
      align: "right",
    }
  );
}

/**
 * Main generator for QUALITY ASSURANCE REPORT
 * @param {object} dynamic - all dynamic data (later we’ll define structure)
 * @param {Writable} outputStream - Express res or any writable stream
 */
function generateQualityAssuranceReport(dynamic = {}, outputStream) {
  if (!outputStream || typeof outputStream.write !== "function") {
    throw new Error("outputStream (Writable) is required");
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: 0, // we manage margins ourselves with M
  });

  // Pipe to output (Express res)
  doc.pipe(outputStream);

  // ---------- PAGE 1 – use initial page (NO addPage) ----------
  page1(doc, dynamic);

  // ---------- PAGE 2 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page2(doc, dynamic);

  // ---------- PAGE 3 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page3(doc, dynamic);

  // ---------- PAGE 4 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page4(doc, dynamic);

  // ---------- PAGE 5 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page5(doc, dynamic);

  // ---------- PAGE 6 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page6(doc, dynamic);

  // ---------- PAGE 7 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page7(doc, dynamic);

  // ---------- PAGE 8 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page8(doc, dynamic);

  // ---------- PAGE 9 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page9(doc, dynamic);

  // ---------- PAGE 10 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page10(doc, dynamic);

  // ---------- PAGE 11 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page11(doc, dynamic);

  // ---------- PAGE 12 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page12(doc, dynamic);

  // ---------- PAGE 13 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page13(doc, dynamic);

  // ---------- PAGE 14 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page14(doc, dynamic);

  // ---------- PAGE 15 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page15(doc, dynamic);

  // ---------- PAGE 16 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page16(doc, dynamic);

  // ---------- PAGE 17 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page17(doc, dynamic);

  // ---------- PAGE 18 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page18(doc, dynamic);

  // ---------- PAGE 19 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page19(doc, dynamic);

  // ---------- PAGE 20 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page20(doc, dynamic);

  // ---------- PAGE 21 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page21(doc, dynamic);

  // ---------- PAGE 22 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page22(doc, dynamic);

  // ---------- PAGE 23 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page23(doc, dynamic);

  // ---------- PAGE 24 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page24(doc, dynamic);

  // Finish the PDF
  doc.end();
  return doc;
}

// ---------------------------------------------------------------------
// PAGE IMPLEMENTATIONS
// ---------------------------------------------------------------------

// PAGE 1 – Front cover
function page1(doc, dynamic) {
  const companyName = dynamic.companyName || "From project setup";
  const postCity = dynamic.postCity || "From project setup";
  const address = dynamic.address || "From project setup";
  const cvr = dynamic.cvr || "From project setup";
  const telephone = dynamic.telephone || "From project setup";
  const mail = dynamic.mail || "From project setup";

  const professionGroup = dynamic.professionGroup || "From project setup";
  const preparedDate = dynamic.preparedDate || ""; // often empty initially
  const projectCaseId = dynamic.projectCaseId || "From project setup";

  let y = M.t;

  // ---------- Top: Performing company + logo box ----------

  // Label
  doc.font("Helvetica-Bold").fontSize(10).fillColor("black");
  doc.text("Performing company:", M.l, y);
  y += 14;

  const leftBoxWidth = CONTENT_W * 0.6;
  const rightBoxWidth = CONTENT_W * 0.3;
  const boxHeight = 90;

  // Left info box
  doc
    .strokeColor(BORDER_COLOR)
    .lineWidth(1)
    .rect(M.l, y, leftBoxWidth, boxHeight)
    .stroke();

  let textY = y + 6;
  const innerX = M.l + 6;
  const innerW = leftBoxWidth - 12;

  doc.font("Helvetica-Bold").fontSize(9).fillColor("black");
  doc.text(companyName, innerX, textY, { width: innerW });
  textY = doc.y + 3;

  doc.font("Helvetica").fontSize(9);

  doc.text(`Post no. / City: ${postCity}`, innerX, textY, {
    width: innerW,
  });
  textY = doc.y + 2;

  doc.text(`Address: ${address}`, innerX, textY, {
    width: innerW,
  });
  textY = doc.y + 2;

  doc.text(`CVR: ${cvr}`, innerX, textY, {
    width: innerW,
  });
  textY = doc.y + 2;

  doc.text(`Telephone: ${telephone}`, innerX, textY, {
    width: innerW,
  });
  textY = doc.y + 2;

  doc.text(`Mail: ${mail}`, innerX, textY, {
    width: innerW,
  });

  // Right logo box
  const logoX = M.l + leftBoxWidth + 10;
  doc
    .strokeColor(BORDER_COLOR)
    .lineWidth(1)
    .rect(logoX, y, rightBoxWidth, boxHeight)
    .stroke();

  if (dynamic.logoPath) {
    try {
      doc.image(dynamic.logoPath, logoX + 8, y + 8, {
        fit: [rightBoxWidth - 16, boxHeight - 16],
        align: "center",
        valign: "center",
      });
    } catch (e) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("black")
        .text("Company logo", logoX, y + boxHeight / 2 - 5, {
          width: rightBoxWidth,
          align: "center",
        });
    }
  } else {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text("Company logo", logoX, y + boxHeight / 2 - 5, {
        width: rightBoxWidth,
        align: "center",
      });
  }

  y = y + boxHeight + 50;

  // ---------- Center title: QUALITY ASSURANCE REPORT ----------

  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(BORDER_COLOR)
    .text("QUALITY ASSURANCE REPORT", M.l, y, {
      width: CONTENT_W,
      align: "center",
    });

  y = doc.y + 40;

  // ---------- Middle info block: FOR PROFESSION GROUP / Prepared date / Project ID Case ID ----------

  const infoX = M.l + CONTENT_W * 0.15;
  const infoW = CONTENT_W * 0.7;

  // FOR PROFESSION GROUP
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("black")
    .text("FOR PROFESSION GROUP:", infoX, y, {
      width: infoW,
      continued: true,
    });

  doc.font("Helvetica").fontSize(11).text(`  ${professionGroup}`, {
    continued: false,
  });

  y = doc.y + 12;

  // Prepared date
  doc.font("Helvetica-Bold").fontSize(11).text("Prepared date:", infoX, y, {
    width: infoW,
    continued: true,
  });

  doc.font("Helvetica").fontSize(11).text(`  ${preparedDate}`, {
    continued: false,
  });

  y = doc.y + 12;

  // Project ID Case ID
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Project ID Case ID:", infoX, y, {
      width: infoW,
      continued: true,
    });

  doc.font("Helvetica").fontSize(11).text(`  ${projectCaseId}`, {
    continued: false,
  });

  // ---------- Bottom center: Report - system / Part of Quality Assurance Denmark ----------

  const bottomY = PAGE.h - 90;

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text("Report - system", M.l, bottomY, {
      width: CONTENT_W,
      align: "center",
    });

  doc.text("Part of Quality Assurance Denmark", M.l, doc.y + 4, {
    width: CONTENT_W,
    align: "center",
  });

  // No footer on cover page
}

// PAGE 2 – placeholder
// PAGE 2 – Contents (00. PROJECT DETAILS)
// PAGE 2 – Contents (00. PROJECT DETAILS)
function page2(doc, dynamic) {
  // ----- Blue bar heading -----
  let y = drawSectionBar(doc, M.t, "00. PROJECT DETAILS");

  y += 5;

  // ----- "Content" + "Indhold" -----
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("black")
    .text("Content", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 3;

  doc.font("Helvetica").fontSize(9).text("Indhold", M.l, y, {
    width: CONTENT_W,
    align: "left",
  });

  y = doc.y + 14;

  // ----- Table of contents rows -----

  const tocItems = [
    { num: "00.", title: "Project details", page: 1 },
    { num: "01.", title: "Project details", page: 2 },
    {
      num: "02.",
      title: "Affiliated advisers and inspectors",
      page: 3,
    },
    {
      num: "03.",
      title: "Documents and information received before the start",
      page: 4,
    },
    {
      num: "04.",
      title: "Received case documents before construction commenced",
      page: 5,
    },
    { num: "05.", title: "Checklist", page: 6 },
    { num: "06.", title: "Company Organization", page: 7 },
    {
      num: "07.",
      title: "Employee associated with the project from the organization",
      page: 8,
    },
    { num: "08.", title: "Preparing for production", page: 9 },
    {
      num: "09.",
      title: "Project management supervision plan",
      page: 10,
    },
    {
      num: "10.",
      title: "Description of the control work",
      page: 11,
    },
    {
      num: "11.",
      title: "Standard for control plan",
      page: 12,
    },
    {
      num: "12.",
      title: "Plan for control of tenders",
      page: 13,
    },
    { num: "13.", title: "Schedule", page: 13 },
    { num: "14.", title: "Receive control", page: 14 },
    { num: "15.", title: "Process control", page: 15 },
    {
      num: "16.",
      title: "Final controls carried out",
      page: 16,
    },
    { num: "17.", title: "Deviations", page: 17 },
    { num: "18.", title: "Weather History", page: 18 },
    {
      num: "19.",
      title: "Communication history via SMS or email",
      page: 19,
    },
    { num: "20.", title: "Reported staffing", page: 20 },
    {
      num: "21.",
      title: "Alleged realization during construction",
      page: 21,
    },
    {
      num: "21.",
      title: "Miscellaneous reports overview.",
      page: 22,
    },
    { num: "22.", title: "Signing", page: 23 },
  ];

  const numColWidth = 25;
  const pageColWidth = 30;
  const numX = M.l;
  const titleX = numX + numColWidth + 5;
  const pageX = M.l + CONTENT_W - pageColWidth;
  const titleFontSize = 9;

  tocItems.forEach((item) => {
    const rowY = y;

    // Section number (e.g. "00.")
    doc
      .font("Helvetica-Bold")
      .fontSize(titleFontSize)
      .fillColor("black")
      .text(item.num, numX, rowY, {
        width: numColWidth,
        align: "left",
      });

    // Title
    doc.font("Helvetica").fontSize(titleFontSize);
    const maxTitleWidth = pageX - titleX - 20;
    doc.text(item.title, titleX, rowY, {
      width: maxTitleWidth,
      align: "left",
    });

    // Calculate where to start dotted line
    const titleWidth = doc.widthOfString(item.title);
    const dotsStartX = titleX + Math.min(titleWidth + 4, maxTitleWidth);
    const dotsEndX = pageX - 6;

    // Dotted line between title and page number
    if (dotsEndX > dotsStartX) {
      doc
        .save()
        .lineWidth(0.5)
        .dash(1, { space: 2 })
        .moveTo(dotsStartX, rowY + 8) // +8 ≈ vertically centered with text
        .lineTo(dotsEndX, rowY + 8)
        .stroke()
        .undash()
        .restore();
    }

    // Page number (right aligned)
    doc
      .font("Helvetica")
      .fontSize(titleFontSize)
      .text(String(item.page), pageX, rowY, {
        width: pageColWidth,
        align: "right",
      });

    y += 18; // row spacing
  });

  // In original, this is logically "Page 1 of 24/26"
  footer(doc, 1);
}

// PAGE 3 – placeholder
// PAGE 3 – 01. PROJECT DETAILS
// PAGE 3 – 01. PROJECT DETAILS
function page3(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "01. PROJECT DETAILS");
  y += 10;

  let rowHeight = 16; // slightly taller rows

  // ---------- FULL-WIDTH ROW HELPER ----------
  function fullRow(label, value) {
    const v = value || "From project setup";
    const keyWidth = 130;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(label, M.l, y, {
        width: keyWidth,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(v, M.l + keyWidth + 6, y, {
        width: CONTENT_W - keyWidth - 6,
        align: "left",
      });

    // bottom border full width
    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  }

  // ---------- HALF-WIDTH BLOCK HELPERS ----------

  function blockRow(label, value, x, width, yLocal) {
    const v = value || "From project setup";
    const keyWidth = 90; // wider so "CONTACT PERSON" & "STARTING DATE" stay on one line

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(label, x, yLocal, {
        width: keyWidth,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(v, x + keyWidth + 4, yLocal, {
        width: width - keyWidth - 4,
        align: "left",
      });

    // bottom border just for this block
    const lineY = yLocal + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(x, lineY)
      .lineTo(x + width, lineY)
      .stroke()
      .restore();

    return yLocal + rowHeight;
  }

  function drawBlock(title, fields, x, width, startY) {
    let yLocal = startY;

    // block title
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("black")
      .text(title, x, yLocal, {
        width,
        align: "left",
      });

    yLocal = doc.y + 3;

    // rows
    fields.forEach(([label, val]) => {
      yLocal = blockRow(label, val, x, width, yLocal);
    });

    return yLocal;
  }

  // ---------- DATE (full width) ----------
  fullRow("DATE", dynamic.projectDate);

  y += 10;

  // ---------- TWO-COLUMN BLOCKS: CONSTRUCTION CASE / MAIN CONTRACTOR ----------
  const blockGap = 10;
  const blockWidth = (CONTENT_W - blockGap) / 2;
  const leftX = M.l;
  const rightX = M.l + blockWidth + blockGap;

  const leftFields = [
    ["CASE ID:", dynamic.caseId],
    ["NAME:", dynamic.constructionCaseName1],
    ["NAME:", dynamic.constructionCaseName2],
    ["CVR NO:", dynamic.constructionCaseCvrNo],
    ["ADDRESS:", dynamic.constructionCaseAddress1],
    ["CONTACT PERSON", dynamic.constructionCaseContactPerson],
    ["POSTCODE:", dynamic.constructionCasePostcode1],
    ["ADDRESS:", dynamic.constructionCaseAddress2],
    ["POSTCODE:", dynamic.constructionCasePostcode2],
  ];

  const rightFields = [
    ["STARTING DATE", dynamic.constructionCaseStartingDate],
    ["DEADLINE", dynamic.constructionCaseDeadline],
    ["TELEPHONE:", dynamic.constructionCaseTelephone],
    ["EMAIL:", dynamic.constructionCaseEmail],
    ["NAME:", dynamic.mainContractorName],
    ["CVR NO:", dynamic.mainContractorCvrNo],
    ["ADDRESS:", dynamic.mainContractorAddress],
    ["POSTCODE:", dynamic.mainContractorPostcode],
    ["TELEPHONE:", dynamic.mainContractorTelephone],
    ["EMAIL:", dynamic.mainContractorEmail],
  ];

  const blockStartY = y;

  const leftEndY = drawBlock(
    "CONSTRUCTION CASE",
    leftFields,
    leftX,
    blockWidth,
    blockStartY
  );
  const rightEndY = drawBlock(
    "MAIN CONTRACTOR /CUSTOMER",
    rightFields,
    rightX,
    blockWidth,
    blockStartY
  );

  y = Math.max(leftEndY, rightEndY) + 18;

  // ---------- CONSTRUCTION MANAGER ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("CONSTRUCTION MANAGER", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  fullRow("DATE", dynamic.constructionManagerDate);
  fullRow("NAME", dynamic.constructionManagerName);
  fullRow("TELEPHONE:", dynamic.constructionManagerTelephone);
  fullRow("EMAIL:", dynamic.constructionManagerEmail);

  y += 10;

  // ---------- SAFETY COORDINATOR ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("SAFETY COORDINATOR", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  fullRow("DATE", dynamic.safetyCoordinatorDate);
  fullRow("NAME", dynamic.safetyCoordinatorName);
  fullRow("TELEPHONE:", dynamic.safetyCoordinatorTelephone);
  fullRow("EMAIL:", dynamic.safetyCoordinatorEmail);

  y += 10;

  // ---------- CERTIFICATION SCHEME / LEVEL ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("CERTIFICATION SCHEME / LEVEL", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  fullRow("DATE", dynamic.certificationDate);
  fullRow("CERTIFICATION SCHEME", dynamic.certificationScheme);
  fullRow("LEVEL", dynamic.certificationLevel);

  y += 10;

  // ---------- PROFESSION GROUPE ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("PROFESSION GROUPE", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  fullRow("DATE", dynamic.professionGroupDate);
  fullRow("PROFESSION GROUPE", dynamic.professionGroupName);

  // Footer – logically Page 2
  footer(doc, 2);
}

// PAGE 4 – placeholder
// PAGE 4 – 02. AFFILIATED ADVISERS AND INSPECTORS
function page4(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "02. AFFILIATED ADVISERS AND INSPECTORS");
  y += 10;

  const rowHeight = 16;

  // ---------- FULL-WIDTH ROW HELPER ----------
  function fullRow(label, value) {
    const v = value || "From project setup";
    const keyWidth = 140;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(label, M.l, y, {
        width: keyWidth,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(v, M.l + keyWidth + 6, y, {
        width: CONTENT_W - keyWidth - 6,
        align: "left",
      });

    // bottom border full width
    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  }

  // ---------- BLOCK HELPER (TITLE + rows) ----------
  function advisorBlock(title, fields) {
    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("black")
      .text(title, M.l, y, {
        width: CONTENT_W,
        align: "left",
      });

    y = doc.y + 4;

    fields.forEach(([label, val]) => {
      fullRow(label, val);
    });

    y += 8; // gap after block
  }

  // ---------- 1) ADVISOR/ARCHITECT ----------
  advisorBlock("ADVISOR/ARCHITECT", [
    ["DATE", dynamic.architectDate],
    ["NAME:", dynamic.architectName],
    ["CONTACT PERSON", dynamic.architectContactPerson],
    ["CVR NO.:", dynamic.architectCvrNo],
    ["ADDRESS:", dynamic.architectAddress],
    ["POSTCODE:", dynamic.architectPostcode],
    ["TELEPHONE:", dynamic.architectTelephone],
    ["EMAIL", dynamic.architectEmail],
  ]);

  // ---------- 2) ADVISOR /ENGON  CONSTRUCTION ----------
  advisorBlock("ADVISOR /ENGON  CONSTRUCTION", [
    ["DATE", dynamic.engConDate],
    ["NAME:", dynamic.engConName],
    ["CONTACT PERSON", dynamic.engConContactPerson],
    ["CVR NR", dynamic.engConCvrNr],
    ["ADDRESS:", dynamic.engConAddress],
    ["POSTCODE:", dynamic.engConPostcode],
    ["TELEPHONE:", dynamic.engConTelephone],
    ["EMAIL:", dynamic.engConEmail],
  ]);

  // ---------- 3) ADVISOR/ENGTOR ----------
  advisorBlock("ADVISOR/ENGTOR", [
    ["DATE", dynamic.engTorDate],
    ["NAME:", dynamic.engTorName],
    ["CONTACT PERSON", dynamic.engTorContactPerson],
    ["CVR NUMBER", dynamic.engTorCvrNumber],
    ["ADDRESS:", dynamic.engTorAddress],
    ["POSTCODE:", dynamic.engTorPostcode],
    ["TELEPHONE", dynamic.engTorTelephone],
    ["EMAIL", dynamic.engTorEmail],
  ]);

  // Footer – logically "Page 3 of 26" in original
  footer(doc, 3);
}

// PAGE 5 – placeholder
// PAGE 5 – 03. DOCUMENTS AND INFORMATION RECEIVED BEFORE THE START
// PAGE 5 – 03. DOCUMENTS AND INFORMATION RECEIVED BEFORE THE START
function page5(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(
    doc,
    M.t,
    "03. DOCUMENTS AND INFORMATION RECEIVED BEFORE THE START"
  );
  y += 10;

  // Intro paragraphs
  y = paragraph(
    doc,
    y,
    "The work is based on the information and assumptions available at the time of preparation.",
    { fontSize: 9 }
  );

  y = paragraph(
    doc,
    y,
    "The Contractor reserves the right to adjust the price and/or schedule if, during the execution of the work, unknown conditions or unforeseen events occur that are not included in the existing project materials or specifications.",
    { fontSize: 9 }
  );

  y = paragraph(
    doc,
    y,
    "The prerequisites for the performance of the contract include, but are not limited to:",
    { fontSize: 9, afterGap: 6 }
  );

  // ---------- Bullet list (drawn circles, no weird % symbols) ----------
  const bullets = [
    "Any unforeseen changes along the way are not included.",
    "Hidden structures, wires or installations that are not placed in accordance with the project materials.",
    "Changes to the building regulations or other legal requirements that have been adopted after the start date.",
    "Delays caused by third parties or suppliers beyond the contractor's control.",
  ];

  const bulletX = M.l + 6; // circle position
  const textX = M.l + 16; // text start
  const textWidth = CONTENT_W - (textX - M.l);
  const lineGap = 2;

  doc.font("Helvetica").fontSize(9).fillColor("black");

  bullets.forEach((item) => {
    const centerY = y + 4; // vertical center of bullet

    // Draw small filled circle as bullet
    doc
      .save()
      .circle(bulletX, centerY, 1.5)
      .fillColor("black")
      .fill()
      .restore();

    // Draw bullet text
    doc.text(item, textX, y, {
      width: textWidth,
      align: "left",
      lineGap,
    });

    y = doc.y + 4;
  });

  y += 4;

  // AB18 paragraph
  y = paragraph(
    doc,
    y,
    "It should be noted that AB18 (General Conditions for Work and Supplies in Construction) applies to this contract, which means that all parties are obliged to comply with these conditions. This includes dealing with changes, delays, and other circumstances that may arise during the project.",
    { fontSize: 9 }
  );

  // Final paragraph
  y = paragraph(
    doc,
    y,
    "It is expressly noted that the developer and his consultants have full responsibility for ensuring that the project is clearly and unambiguously prepared, so that there is no doubt as to the nature and scope of the work.",
    { fontSize: 9 }
  );

  // Footer – logically "Page 4"
  footer(doc, 4);
}

// PAGE 6 – placeholder
// PAGE 6 – 04. RECEIVED CASE DOCUMENTS BEFORE CONSTRUCTION COMMENCED
function page6(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(
    doc,
    M.t,
    "04. RECEIVED CASE DOCUMENTS BEFORE CONSTRUCTION COMMENCED"
  );
  y += 20;

  const rowHeight = 18;

  function drawTable(headers, rows) {
    const tableX = M.l;
    const tableW = CONTENT_W;

    // column widths (percentages)
    const colPercents =
      headers.length === 3
        ? [0.18, 0.52, 0.3] // DATE / DOCUMENT / FILENAME
        : [0.25, 0.4, 0.35]; // SUBSCRIPTION / NAME / FILENAME

    const colWidths = colPercents.map((p) => p * tableW);
    const colX = [
      tableX,
      tableX + colWidths[0],
      tableX + colWidths[0] + colWidths[1],
    ];

    // ----- Header row (light grey background, bold) -----
    doc.save().rect(tableX, y, tableW, rowHeight).fill(LIGHT_GREY).restore();

    headers.forEach((h, i) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("black")
        .text(h, colX[i] + 4, y + 4, {
          width: colWidths[i] - 8,
          align: "left",
        });
    });

    // bottom line under header
    let lineY = y + rowHeight;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += rowHeight;

    // ----- Data rows (bottom-only lines, no verticals) -----
    rows.forEach((row) => {
      row.forEach((cell, i) => {
        const value = cell || "From project setup";
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("black")
          .text(value, colX[i] + 4, y + 4, {
            width: colWidths[i] - 8,
            align: "left",
          });
      });

      lineY = y + rowHeight;
      doc
        .save()
        .lineWidth(0.5)
        .strokeColor(BORDER_COLOR)
        .moveTo(tableX, lineY)
        .lineTo(tableX + tableW, lineY)
        .stroke()
        .restore();

      y += rowHeight;
    });

    y += 16; // gap after table
  }

  // --------- 1) DATE / DOCUMENT / FILENAME ----------
  // In original PDF text: "DATE DOCUMENT FILENAME"
  drawTable(
    ["DATE", "DOCUMENT", "FILENAME"],
    [
      // TODO: replace with dynamic.receivedDocuments array
      [
        dynamic.receivedDocDate1 || "From project setup",
        dynamic.receivedDocName1 || "From project setup",
        dynamic.receivedDocFile1 || "From project setup",
      ],
      [
        dynamic.receivedDocDate2 || "From project setup",
        dynamic.receivedDocName2 || "From project setup",
        dynamic.receivedDocFile2 || "From project setup",
      ],
    ]
  );

  // --------- 2) CURRENT DRAWINGS TABLE ----------
  // PDF text: "CURRENT DRAWINGS  SUBSCRIPTION  NAME FILENAME"
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("CURRENT DRAWINGS", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 8;

  drawTable(
    ["SUBSCRIPTION", "NAME", "FILENAME"],
    [
      // TODO: replace with dynamic.currentDrawings array
      [
        dynamic.currentSub1 || "From project setup",
        dynamic.currentName1 || "From project setup",
        dynamic.currentFile1 || "From project setup",
      ],
      [
        dynamic.currentSub2 || "From project setup",
        dynamic.currentName2 || "From project setup",
        dynamic.currentFile2 || "From project setup",
      ],
    ]
  );

  // Footer – logical "Page 5 of 26"
  footer(doc, 5);
}

// PAGE 7 – placeholder
// PAGE 7 – 05. CHECKLIST
function page7(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "05.  CHECKLIST");
  y += 18;

  const rowHeight = 18;

  const tableX = M.l;
  const tableW = CONTENT_W;

  // Column widths: DOCUMENT / RECEIVED / COMMENTS / APPROVED
  const colPercents = [0.27, 0.18, 0.35, 0.2];
  const colWidths = colPercents.map((p) => p * tableW);
  const colX = [
    tableX,
    tableX + colWidths[0],
    tableX + colWidths[0] + colWidths[1],
    tableX + colWidths[0] + colWidths[1] + colWidths[2],
  ];

  // ---------- HEADER ROW ----------
  doc.save().rect(tableX, y, tableW, rowHeight).fill(LIGHT_GREY).restore();

  const headers = ["DOCUMENT:", "RECEIVED:", "COMMENTS:", "APPROVED:"];

  headers.forEach((h, i) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(h, colX[i] + 4, y + 4, {
        width: colWidths[i] - 8,
        align: "left",
      });
  });

  // bottom line under header
  let lineY = y + rowHeight;
  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .moveTo(tableX, lineY)
    .lineTo(tableX + tableW, lineY)
    .stroke()
    .restore();

  y += rowHeight;

  // ---------- DATA ROWS ----------
  // Each row: [DOCUMENT, RECEIVED, COMMENTS, APPROVED]
  const rows = [
    [
      dynamic.checkDoc1 || "Contract.",
      dynamic.checkDoc1Received || "Received date",
      dynamic.checkDoc1Comments || "Comments from approval",
      dynamic.checkDoc1Approved || "Approved date",
    ],
    [
      dynamic.checkDoc2 || "Guarantee.",
      dynamic.checkDoc2Received || "Received date",
      dynamic.checkDoc2Comments || "Comments from approval",
      dynamic.checkDoc2Approved || "Approved date",
    ],
    [
      dynamic.checkDoc3 || "General Conditions.",
      dynamic.checkDoc3Received || "Received date",
      dynamic.checkDoc3Comments || "Comments from approval",
      dynamic.checkDoc3Approved || "Approved date",
    ],
    [
      dynamic.checkDoc4 || "...",
      dynamic.checkDoc4Received || "Received date",
      dynamic.checkDoc4Comments || "Comments from approval",
      dynamic.checkDoc4Approved || "Approved date",
    ],
    [
      dynamic.checkDoc5 || "Plan for tender control.",
      dynamic.checkDoc5Received || "Received date",
      dynamic.checkDoc5Comments || "Comments from approval",
      dynamic.checkDoc5Approved || "Approved date",
    ],
    [
      dynamic.checkDoc6 || "Site plan",
      dynamic.checkDoc6Received || "Received date",
      dynamic.checkDoc6Comments || "Comments from approval",
      dynamic.checkDoc6Approved || "Approved date",
    ],
    [
      dynamic.checkDoc7 || "Quality Assurance Handbook",
      dynamic.checkDoc7Received || "Received date",
      dynamic.checkDoc7Comments || "Comments from approval",
      dynamic.checkDoc7Approved || "Approved date",
    ],
  ];

  rows.forEach((row) => {
    row.forEach((cell, i) => {
      const value = cell || "From project setup";
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("black")
        .text(value, colX[i] + 4, y + 4, {
          width: colWidths[i] - 8,
          align: "left",
        });
    });

    lineY = y + rowHeight;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  });

  // Footer – logically "Page 6"
  footer(doc, 6);
}

// PAGE 8 – placeholder
// PAGE 8 – 06. COMPANY ORGANIZATION
// PAGE 8 – 06. COMPANY ORGANIZATION
function page8(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "06. COMPANY ORGANIZATION");
  y += 12;

  const rowHeight = 16;

  // ---------- GENERIC ROW HELPERS ----------

  // First row of each block: DATE + block title on same line
  function dateTitleRow(title, dateValue) {
    const dateLabelWidth = 40; // "DATE"
    const dateValueWidth = 120;

    const dateText = dateValue || "From project setup";

    // DATE label
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text("DATE", M.l, y, {
        width: dateLabelWidth,
        align: "left",
      });

    // DATE value
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(dateText, M.l + dateLabelWidth + 4, y, {
        width: dateValueWidth,
        align: "left",
      });

    // Block title on the right side of the same row
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("black")
      .text(title, M.l + dateLabelWidth + dateValueWidth + 20, y, {
        width: CONTENT_W - (dateLabelWidth + dateValueWidth + 20),
        align: "right",
      });

    // bottom border full width
    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  }

  // Normal key/value rows
  function fullRow(label, value) {
    const v = value || "From project setup";
    const keyWidth = 140;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(label, M.l, y, {
        width: keyWidth,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(v, M.l + keyWidth + 6, y, {
        width: CONTENT_W - keyWidth - 6,
        align: "left",
      });

    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  }

  // Block helper
  function orgBlock(title, dateValue, fields) {
    dateTitleRow(title, dateValue);
    fields.forEach(([label, val]) => {
      fullRow(label, val);
    });
    y += 10; // gap after block
  }

  // ---------- 1) SUBCONTRACTOR ----------
  // PDF: DATE  SUBCONTRACTOR
  orgBlock("SUBCONTRACTOR", dynamic.subcontractorDate, [
    ["COMPANY NAME:", dynamic.subcontractorCompanyName],
    ["CONTACT PERSON", dynamic.subcontractorContactPerson],
    ["CVR NO.:", dynamic.subcontractorCvrNo],
    ["PROFESSION:", dynamic.subcontractorProfession],
    ["ADDRESS:", dynamic.subcontractorAddress],
    ["POSTCODE:", dynamic.subcontractorPostcode],
    ["TELEPHONE:", dynamic.subcontractorTelephone],
    ["EMAIL", dynamic.subcontractorEmail],
  ]);

  // ---------- 2) PROJECT MANAGER ----------
  // PDF: DATE  PROJECT MANAGER
  orgBlock("PROJECT MANAGER", dynamic.projectManagerDate, [
    ["ROLE", dynamic.projectManagerRole],
    ["TELEPHONE:", dynamic.projectManagerTelephone],
    ["NAME", dynamic.projectManagerName],
    ["EMAIL", dynamic.projectManagerEmail],
  ]);

  // ---------- 3) OWN HEALTH/SAFETY REPRESENTATIVE ----------
  orgBlock("OWN HEALTH/SAFETY REPRESENTATIVE", dynamic.hseRepDate, [
    ["ROLE", dynamic.hseRepRole],
    ["TELEPHONE:", dynamic.hseRepTelephone],
    ["NAME", dynamic.hseRepName],
    ["EMAIL", dynamic.hseRepEmail],
  ]);

  // ---------- 4) INDEPENDENT INSPECTOR OR OTHER CONTROL ----------
  orgBlock("INDEPENDENT INSPECTOR OR OTHER CONTROL", dynamic.indInspectorDate, [
    ["NAME:", dynamic.indInspectorName],
    ["CONTACT PERSON", dynamic.indInspectorContactPerson],
    ["CVR NO.:", dynamic.indInspectorCvrNo],
    ["ADDRESS:", dynamic.indInspectorAddress],
    ["POSTCODE:", dynamic.indInspectorPostcode],
    ["TELEPHONE:", dynamic.indInspectorTelephone],
    ["EMAIL", dynamic.indInspectorEmail],
  ]);

  // Footer – logically "Page 7"
  footer(doc, 7);
}

// PAGE 9 – placeholder
// PAGE 9 – 07. EMPLOYEE ASSOCIATED WITH THE PROJECT FROM THE ORGANIZATION
function page9(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(
    doc,
    M.t,
    "07. EMPLOYEE ASSOCIATED WITH THE PROJECT FROM THE ORGANIZATION"
  );
  y += 18;

  const tableX = M.l;
  const tableW = CONTENT_W;
  const rowHeight = 20;

  // Column layout: ID NO | ROLE | NAME ASSIGNED | EMAIL | MOBILE NO. | PHOTO/ID
  const colPercents = [0.1, 0.18, 0.24, 0.2, 0.15, 0.13];
  const colWidths = colPercents.map((p) => p * tableW);

  const colX = [
    tableX,
    tableX + colWidths[0],
    tableX + colWidths[0] + colWidths[1],
    tableX + colWidths[0] + colWidths[1] + colWidths[2],
    tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
    tableX +
      colWidths[0] +
      colWidths[1] +
      colWidths[2] +
      colWidths[3] +
      colWidths[4],
  ];

  // ---------- HEADER ROW ----------
  const headers = [
    "ID NO",
    "ROLE",
    "NAME ASSIGNED",
    "EMAIL",
    "MOBILE NO.",
    "PHOTO/ID",
  ];

  // Grey background
  doc.save().rect(tableX, y, tableW, rowHeight).fill(LIGHT_GREY).restore();

  headers.forEach((h, i) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(h, colX[i] + 3, y + 4, {
        width: colWidths[i] - 6,
        align: "left",
      });
  });

  // bottom line under header
  let lineY = y + rowHeight;
  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .moveTo(tableX, lineY)
    .lineTo(tableX + tableW, lineY)
    .stroke()
    .restore();

  y += rowHeight;

  // ---------- DATA ROWS ----------
  // Each row = [ID NO, ROLE, NAME ASSIGNED, EMAIL, MOBILE NO., PHOTO/ID]
  const rows = [
    [
      "07.01",
      dynamic.emp01Role || "From project setup",
      dynamic.emp01Name || "From project setup",
      dynamic.emp01Email || "From project setup",
      dynamic.emp01Mobile || "From project setup",
      dynamic.emp01PhotoId || "From project",
    ],
    [
      "07.02",
      dynamic.emp02Role || "From project setup",
      dynamic.emp02Name || "From project setup",
      dynamic.emp02Email || "From project setup",
      dynamic.emp02Mobile || "From project setup",
      dynamic.emp02PhotoId || "From project",
    ],
    [
      "07.03",
      dynamic.emp03Role || "From project setup",
      dynamic.emp03Name || "From project setup",
      dynamic.emp03Email || "From project setup",
      dynamic.emp03Mobile || "From project setup",
      dynamic.emp03PhotoId || "From project",
    ],
    [
      "07.04",
      dynamic.emp04Role || "From project setup",
      dynamic.emp04Name || "From project setup",
      dynamic.emp04Email || "From project setup",
      dynamic.emp04Mobile || "From project setup",
      dynamic.emp04PhotoId || "From project ",
    ],
  ];

  rows.forEach((row) => {
    row.forEach((cell, i) => {
      const value = cell || "From project setup";

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("black")
        .text(value, colX[i] + 3, y + 4, {
          width: colWidths[i] - 6,
          align: "left",
        });
    });

    lineY = y + rowHeight;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  });

  // Footer – original shows "Page 8 of 26"
  footer(doc, 8);
}

// PAGE 10 – placeholder
// PAGE 10 – 08. PREPARING FOR PRODUCTION
function page10(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "08. PREPARING FOR PRODUCTION");
  y += 12;

  // Subheading: Review of the process
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("Review of the process", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 10;

  // Paragraphs
  y = paragraph(
    doc,
    y,
    "Immediately after acceptance, the company conducts a process review of the project. In cases with design responsibility, a project review is also carried out.",
    { fontSize: 9 }
  );

  y = paragraph(
    doc,
    y,
    "The purpose of the review is to identify ambiguities and/or risky work performance, as well as environmental issues.",
    { fontSize: 9 }
  );

  y = paragraph(
    doc,
    y,
    "In cases where the company has agreements with subcontractors, the company ensures that they carry out a corresponding review.",
    { fontSize: 9 }
  );

  // Footer – this page shows "Page 9 of 26"
  footer(doc, 9);
}

// PAGE 11 – 09. PROJECT MANAGEMENT SUPERVISION PLAN
// PAGE 11 – 09. PROJECT MANAGEMENT SUPERVISION PLAN
function page11(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "09. PROJECT MANAGEMENT SUPERVISION PLAN");
  y += 10;

  const tableX = M.l;
  const tableW = CONTENT_W;

  // Column layout: ID. | WHAT | WHERE | WHEN | HOW MUCH | PERFORMED
  const colPercents = [0.08, 0.27, 0.17, 0.27, 0.1, 0.11];
  const colWidths = colPercents.map((p) => p * tableW);

  const colX = [
    tableX,
    tableX + colWidths[0],
    tableX + colWidths[0] + colWidths[1],
    tableX + colWidths[0] + colWidths[1] + colWidths[2],
    tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
    tableX +
      colWidths[0] +
      colWidths[1] +
      colWidths[2] +
      colWidths[3] +
      colWidths[4],
  ];

  doc.font("Helvetica").fontSize(9).fillColor("black");

  // ---- helper: compute dynamic row height based on wrapped text ----
  function measureRowHeight(cells) {
    let maxH = 0;
    cells.forEach((cell, i) => {
      const text = cell || "";
      const h =
        doc.heightOfString(text, {
          width: colWidths[i] - 8,
          align: "left",
        }) + 6; // padding
      if (h > maxH) maxH = h;
    });
    return maxH;
  }

  function drawRow(cells, isHeader = false) {
    const baseH = isHeader ? 18 : 0;
    const rowH = isHeader ? baseH : Math.max(baseH, measureRowHeight(cells));

    if (isHeader) {
      // header grey background
      doc.save().rect(tableX, y, tableW, rowH).fill(LIGHT_GREY).restore();
    }

    cells.forEach((cell, i) => {
      const txt = cell || "";
      doc
        .font(isHeader ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9)
        .fillColor("black")
        .text(txt, colX[i] + 3, y + 3, {
          width: colWidths[i] - 6,
          align: "left",
        });
    });

    // bottom line under row
    const lineY = y + rowH;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += rowH;
  }

  // ---------- HEADER ----------
  drawRow(["ID.", "WHAT", "WHERE", "WHEN", "HOW MUCH", "PERFORMED"], true);

  y += 6;

  // ---------- PROCESS - PROJECT REVIEW ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text("PROCESS - PROJECT REVIEW", tableX, y, {
      width: tableW,
      align: "left",
    });

  y = doc.y + 4;

  // 9.01
  drawRow([
    "9.01",
    "Consistency in project \nmaterials drawings \n/descriptions/contract)",
    "Documented in \nQA.",
    "During the process/ \nReview of the project \nBefore kickoff meeting",
    "100 %",
    "Approved date",
  ]);

  // 9.02
  drawRow([
    "9.02",
    "Planning of execution \nmethods incl. Risk assessment \n(working environment) and \nestablishment of QA and WPA \nfolders.",
    "Documented in \nQA.",
    "During the process/ \nReview of the project \nBefore kickoff meeting",
    "100 %",
    "Approved date",
  ]);

  y += 6;

  // ---------- 9.1 MISCELLANEOUS ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text("9.1 MISCELLANEOUS", tableX, y, {
      width: tableW,
      align: "left",
    });

  y = doc.y + 4;

  // 9.11
  drawRow([
    "9.11",
    "Photo registration of existing \nconditions has been made.",
    "Generally.",
    "Before start-up",
    "100 %",
    "Approved date",
  ]);

  // 9.12
  drawRow([
    "9.12",
    "Submission of QA materials to \nthe Construction \nManagement.",
    "Documented in \nthe QA folder.",
    "Before start-up",
    "100 %",
    "Approved date",
  ]);

  // 9.13
  drawRow([
    "9.13",
    "Submission of the risk \nassessment folder to the \nconstruction management.",
    "Documented in \nthe QA folder.",
    "Before start-up",
    "100 %",
    "Approved date",
  ]);

  // 9.14 (written as 6914 in text, but same row)
  drawRow([
    "9.14",
    "Submitted finished QA on an \nongoing basis to the construction \nmanagement. At construction \nmeetings or in monthly emails.",
    "Documented in \nthe QA folder.",
    "At construction meetings \nor via email.",
    "100 %",
    "Approved date",
  ]);

  y += 6;

  // ---------- 9.2 CONTROL FOR THE CONTRACTOR ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text("9.2 CONTROL FOR THE CONTRACTOR", tableX, y, {
      width: tableW,
      align: "left",
    });

  y = doc.y + 4;

  // 9.21
  drawRow([
    "9.21",
    "Controlled execution of \nreceipt and process control, \nincluding control notes for \ndefects and errors.",
    "Documented in the \ncontrol chart for \nexecuted QA \nmaterials.",
    "Continuously, but at least \nevery 14 days and \npossibly before the \nconstruction meeting.",
    "Sampling. - If self-control is \ninsufficient, it will be \nintensified for weekly self-\ncontrol checks so that it can \nbe submitted satisfactorily.",
    "Approved date",
  ]);

  // 9.22
  drawRow([
    "9.22",
    "Master review/final \ninspection, including \nverification that there is \nquality assurance of the work \nperformed",
    "Documented in the \ncontrol chart for \nexecuted QA \nmaterials.",
    "Before closing hidden \nbuilding parts, before \nhanding over \nsections/surfaces to \nanother contractor. After \nthe completion of their \nwork.",
    "100 %",
    "Approved date",
  ]);

  y += 16;

  // ---------- BOTTOM TEXT ----------
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text("The above is checked by:", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 10;

  // NAME line
  doc.text("NAME", M.l, y, {
    width: 100,
    align: "left",
  });

  let lineY = y + 10;
  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .moveTo(M.l, lineY)
    .lineTo(M.l + 200, lineY)
    .stroke()
    .restore();

  y = lineY + 14;

  // SIGNATURE line
  doc.text("SIGNATURE", M.l, y, {
    width: 100,
    align: "left",
  });

  lineY = y + 10;
  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .moveTo(M.l, lineY)
    .lineTo(M.l + 200, lineY)
    .stroke()
    .restore();

  // Footer – "Page 10 of 26" in original
  footer(doc, 10);
}

// PAGE 12 – placeholder
// PAGE 12 – 10. DESCRIPTION OF THE CONTROL WORK
function page12(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "10. DESCRIPTION OF THE CONTROL WORK");
  y += 10;

  // ---------- 10.1 CONTROL PLAN (TENDER CONTROL PLAN OR THE COMPANY'S OWN) ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(
      "10.1 CONTROL PLAN (TENDER CONTROL PLAN OR THE COMPANY'S OWN)",
      M.l,
      y,
      {
        width: CONTENT_W,
        align: "left",
      }
    );

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "The process review in relation to a possible procurement control plan forms the basis for the preparation of the case's control plan, which provides an overall overview of the controls and documentation that apply to the contract.",
    { fontSize: 9 }
  );

  y = paragraph(
    doc,
    y,
    "If no supply control plan has been submitted before the price has been offered, the company's own control plan will form the basis for the company's control.",
    { fontSize: 9 }
  );

  y = paragraph(
    doc,
    y,
    "The control plan is submitted for the customer's approval at a potential project review meeting. If a project review meeting is not held with the construction management, the control plan will subsequently be sent together with the results of the company's process review for the client's approval.",
    { fontSize: 9 }
  );

  y += 6;

  // ---------- 10.2 QUALITY ASSURANCE OF THE PROJECT ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("10.2 QUALITY ASSURANCE OF THE PROJECT", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "The inspection is carried out by the project manager or another person specifically appointed as the inspector for the work and who is familiar with our quality assurance system.",
    { fontSize: 9 }
  );

  y += 6;

  // ---------- 10.3 CHECKING DOCUMENTS ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("10.3 CHECKING DOCUMENTS", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "Revised drawings, construction meeting minutes, etc. are sent to the company's e-mail. It is assumed that all revised drawings are accompanied by a revised subscription list and that revisions to the drawings are clearly marked.",
    { fontSize: 9 }
  );

  y = paragraph(
    doc,
    y,
    "Quality assurance documents are presented at construction meetings.",
    { fontSize: 9 }
  );

  y += 6;

  // ---------- 10.4 INFORMATION FOR EMPLOYEES ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("10.4 INFORMATION FOR EMPLOYEES", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "Before work begins, craftsmen and any apprentices are generally informed about the work at hand and in particular about difficult work processes. In addition, information is provided about the project's quality and environmental requirements.",
    { fontSize: 9 }
  );

  y += 6;

  // ---------- 10.5 IN-DEPTH CONTROL ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("10.5 IN-DEPTH CONTROL", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "When materials arrive at the construction site, it is checked that the delivered goods are in the correct quantity and quality according to the inspection plan. Factors of importance to the environment are included in the in-depth management, including the layout of the construction site. The incoming control must be documented.",
    { fontSize: 9 }
  );

  y += 6;

  // ---------- 10.6 PROCESS CONTROL ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("10.6 PROCESS CONTROL", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "During the work, the inspections specified in the control plan are carried out. Deviations and their rectification are carried out in accordance with the agreement. Factors of importance to the environment are included in the process control. Process control is documented.",
    { fontSize: 9 }
  );

  y += 6;

  // ---------- 10.7 FINAL INSPECTION ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("10.7 FINAL INSPECTION", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "When the work or certain parts of it are completed, the person responsible carries out a final inspection of the work. This final inspection is an internal activity, but evidence of it may be provided.",
    { fontSize: 9 }
  );

  y += 6;

  // ---------- 10.7 DOCUMENTATION ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("10.7 DOCUMENTATION", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "A copy of the documentation of the quality assurance carried out will be sent to the client or its advisers by agreement. All documents, including documentation of the agreed quality assurance, are stored for the current liability period.",
    { fontSize: 9 }
  );

  // Footer – this page is "Page 11 of 26" in the original
  footer(doc, 11);
}

// PAGE 13 – placeholder
// PAGE 13 – 11. STANDARD FOR CONTROL PLAN
// PAGE 13 – 11. STANDARD FOR CONTROL PLAN
function page13(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "11. STANDARD FOR CONTROL PLAN");
  y += 10;

  const tableX = M.l;
  const tableW = CONTENT_W;

  // 5 columns: ID. | ACTIVITY | ACCEPTANCE CRITERIA / METHOD | TIME / SCOPE | DOCUMENTATION / PERFORMED
  const colPercents = [0.08, 0.32, 0.25, 0.2, 0.15];
  const colWidths = colPercents.map((p) => p * tableW);

  const colX = [
    tableX,
    tableX + colWidths[0],
    tableX + colWidths[0] + colWidths[1],
    tableX + colWidths[0] + colWidths[1] + colWidths[2],
    tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
  ];

  doc.font("Helvetica").fontSize(9).fillColor("black");

  // --------- helpers for auto-height rows ----------
  function measureRowHeight(cells) {
    let maxH = 0;
    cells.forEach((cell, i) => {
      const text = cell || "";
      const h =
        doc.heightOfString(text, {
          width: colWidths[i] - 8,
          align: "left",
        }) + 6; // padding
      if (h > maxH) maxH = h;
    });
    return maxH;
  }

  function drawRow(cells, isHeader = false) {
    // Make sure font used for measuring matches what we will draw with
    doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(9);

    const contentH = measureRowHeight(cells);
    const minH = isHeader ? 22 : 18; // header row taller
    const extra = isHeader ? 4 : 0; // extra padding for header text
    const rowH = Math.max(minH, contentH + extra);

    if (isHeader) {
      // header grey background
      doc.save().rect(tableX, y, tableW, rowH).fill(LIGHT_GREY).restore();
    }

    cells.forEach((cell, i) => {
      const txt = cell || "";
      doc
        .font(isHeader ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9)
        .fillColor("black")
        .text(txt, colX[i] + 3, y + 4, {
          width: colWidths[i] - 6,
          align: "left",
        });
    });

    // bottom line for row
    const lineY = y + rowH;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += rowH;
  }

  // ---------- header row ----------
  drawRow(
    [
      "ID.",
      "ACTIVITY",
      "ACCEPTANCE CRITERIA / METHOD",
      "TIME / SCOPE",
      "DOCUMENTATION PERFORMED",
    ],
    true
  );

  y += 6;

  // ---------- GROUP: KP.?? RECEIVE CONTROL ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text("KP.??  RECEIVE CONTROL", tableX, y, {
      width: tableW,
      align: "left",
    });

  y = doc.y + 4;

  // KP.?? Delivery notes
  drawRow([
    "KP.??",
    "Delivery notes",
    "Documented under point in QA material.",
    "Upon receipt",
    "100 %",
  ]);

  // KP.?? Transfer after second/before registration
  drawRow([
    "KP.??",
    "Transfer after second/before registration",
    "Documented under point in QA material.",
    "When transferring interfaces/spaces or surfaces",
    "100 %",
  ]);

  // KP.?? Damages
  drawRow([
    "KP.??",
    "Damages",
    "Documented under point in QA material.",
    "Upon receipt of materials or areas.",
    "100 %",
  ]);

  y += 6;

  // ---------- GROUP: KP.?? PROCESS CONTROL ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text("KP.??  PROCESS CONTROL", tableX, y, {
      width: tableW,
      align: "left",
    });

  y = doc.y + 4;

  // KP.?? Photo documentation of the existing conditions
  drawRow([
    "KP.??",
    "Photo documentation of the existing conditions",
    "Documented under point in QA material.",
    "In execution",
    "25 %",
  ]);

  // KP.?? Submission of QA materials to the Construction Management.
  drawRow([
    "KP.??",
    "Submission of QA materials to the Construction Management.",
    "Documented under point in QA material.",
    "In execution",
    "25 %",
  ]);

  // KP.?? Submission of the risk assessment folder to the construction management.
  drawRow([
    "KP.??",
    "Submission of the risk assessment folder to the construction management.",
    "Documented under point in QA material.",
    "In execution",
    "25 %",
  ]);

  // KP.?? To be submitted on an ongoing basis ...
  drawRow([
    "KP.??",
    "To be submitted on an ongoing basis in connection with construction meetings or monthly digitally.",
    "Documented under point in QA material.",
    "In execution",
    "25 %",
  ]);

  y += 6;

  // ---------- GROUP: KP.?? FINAL CONTROL ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text("KP.??  FINAL CONTROL", tableX, y, {
      width: tableW,
      align: "left",
    });

  y = doc.y + 4;

  // KP.?? Checking work done
  drawRow([
    "KP.??",
    "Checking work done",
    "Photo/visual",
    "After the work is completed",
    "100 %",
  ]);

  // KP.?? Tolerances, levels, etc.
  drawRow([
    "KP.??",
    "Tolerances, levels, etc.",
    "Measuring equipment/photo",
    "After the work is completed,",
    "100 %",
  ]);

  // Footer – "Page 12 of 26" in the original
  footer(doc, 12);
}

// PAGE 14 – placeholder
// PAGE 14 – 12. PLAN FOR CONTROL OF TENDERS / 13. SCHEDULE
function page14(doc, dynamic) {
  // ----- 12. PLAN FOR CONTROL OF TENDERS -----
  let y = drawSectionBar(doc, M.t, "12. PLAN FOR CONTROL OF TENDERS");
  y += 14;

  // Intro line
  y = paragraph(
    doc,
    y,
    "Here is the tender control plan, if it is found in the project material.",
    { fontSize: 9 }
  );

  y += 12;

  // In the template, these are colored circles with labels:
  // Reception control, Process control, Final control, Deviation
  const items = [
    "Reception control",
    "Process control",
    "Final control",
    "Deviation",
  ];

  const circleRadius = 3; // size of the colored circle
  const circleCenterX = M.l + 6; // x position of circle center
  const textX = M.l + 16; // where text starts
  const textWidth = CONTENT_W - (textX - M.l);

  doc.font("Helvetica").fontSize(9).fillColor("black");

  items.forEach((text) => {
    const centerY = y + 5; // align circle with text line

    // Draw filled colored circle (like the PDF)
    doc
      .save()
      .fillColor(BORDER_COLOR)
      .circle(circleCenterX, centerY, circleRadius)
      .fill()
      .restore();

    // Label text
    doc.text(text, textX, y, {
      width: textWidth,
      align: "left",
    });

    y += 18;
  });

  // ----- 13. SCHEDULE -----
  y += 24;

  y = drawSectionBar(doc, y, "13. SCHEDULE");

  // (No body content under 13. SCHEDULE in the template)

  // Footer – this is "Page 13 of 26" in the original
  footer(doc, 13);
}

// PAGE 15 – placeholder
// PAGE 15 – 14. RECEIVE CONTROL
// PAGE 15 – 14. RECEIVE CONTROL
function page15(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "14. RECEIVE CONTROL");
  y += 10;

  // Subheading: RECEIVE CONTROL (left) + colored circle (right)
  const titleText = "RECEIVE CONTROL";

  // Draw the text first
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(titleText, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  // Draw a slightly bigger colored circle on the right side of this row
  const circleRadius = 5;
  const circleCenterY = y + 7; // vertically aligned with text
  const circleCenterX = M.l + CONTENT_W - 20; // near the right edge

  doc
    .save()
    .fillColor(BORDER_COLOR)
    .circle(circleCenterX, circleCenterY, circleRadius)
    .fill()
    .restore();

  y = doc.y + 10;

  const rowHeight = 16;

  // ---- helper: key/value row with underline across full width ----
  function keyValueRow(label, value) {
    const v = value || "From project setup";
    const keyWidth = 160;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(label, M.l, y, {
        width: keyWidth,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(v, M.l + keyWidth + 6, y, {
        width: CONTENT_W - keyWidth - 6,
        align: "left",
      });

    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  }

  // ---- top meta block (ID, TYPE, ACCEPTANCE DATE, ENDORSEMENT) ----
  keyValueRow("ID", dynamic.receiveId || "KP?. CONTROL");
  keyValueRow(
    "TYPE",
    dynamic.receiveType || "Receive control type – app registration"
  );
  keyValueRow(
    "ACCEPTANCE DATE",
    dynamic.receiveAcceptanceDate || "[Select Date]  registration date"
  );
  keyValueRow("ENDORSEMENT", dynamic.receiveEndorsement || "");

  // ---- DRAWING: label row + proper rectangle for the drawing ----
  (function drawDrawingBlock() {
    const keyWidth = 160;

    // Label row "DRAWING"
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text("DRAWING", M.l, y, {
        width: keyWidth,
        align: "left",
      });

    // underline across full width
    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight + 6;

    // Big rectangle where the marked drawing image will come
    const boxHeight = 110;
    const boxY = y;

    doc
      .save()
      .lineWidth(1)
      .strokeColor(BORDER_COLOR)
      .rect(M.l, boxY, CONTENT_W, boxHeight)
      .stroke()
      .restore();

    // Caption inside the box
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(
        dynamic.receiveDrawingCaption ||
          "Marked main drawing from registration on app",
        M.l + 6,
        boxY + 6,
        {
          width: CONTENT_W - 12,
          align: "left",
        }
      );

    // If later you want to actually place an image:
    // if (dynamic.receiveDrawingImagePath) {
    //   doc.image(dynamic.receiveDrawingImagePath, M.l + 6, boxY + 22, {
    //     fit: [CONTENT_W - 12, boxHeight - 28],
    //     align: "center",
    //     valign: "center",
    //   });
    // }

    y = boxY + boxHeight + 14;
  })();

  // ---- remaining meta rows ----
  keyValueRow("LOCALIZATION OF CONTROLS", dynamic.receiveLocalization || "");
  keyValueRow(
    "BUILDING PART",
    dynamic.receiveBuildingPart || "From project setup"
  );

  y += 10;

  // ---- 4 KP blocks in a 2x2 grid ----
  const gapX = 20;
  const gapY = 24;
  const boxWidth = (CONTENT_W - gapX) / 2;
  const kpBlockHeight = 150; // fixed height per KP block

  const leftX = M.l;
  const rightX = M.l + boxWidth + gapX;

  function drawKPBlock(x, yTop, label) {
    // 1) "KP?.X unique no." + underline
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(label + " unique no.", x, yTop, {
        width: boxWidth,
        align: "left",
      });

    const lineY1 = yTop + 12;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(x, lineY1)
      .lineTo(x + boxWidth, lineY1)
      .stroke()
      .restore();

    // 2) "Comment on Picture from registration" + underline
    const commentY = lineY1 + 6;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text("Comment on Picture from registration", x, commentY, {
        width: boxWidth,
        align: "left",
      });

    const lineY2 = commentY + 12;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(x, lineY2)
      .lineTo(x + boxWidth, lineY2)
      .stroke()
      .restore();

    // 3) Picture rectangle
    const picY = lineY2 + 8;
    const picHeight = kpBlockHeight - (picY - yTop) - 22; // leave room for caption

    doc
      .save()
      .lineWidth(1)
      .strokeColor(BORDER_COLOR)
      .rect(x, picY, boxWidth, picHeight)
      .stroke()
      .restore();

    // 4) Picture caption
    const captionY = picY + picHeight + 4;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text("Picture for registration", x + 5, captionY, {
        width: boxWidth - 10,
        align: "center",
      });
  }

  // First row: KP?.1 (left), KP?.2 (right)
  drawKPBlock(leftX, y, "KP?.1");
  drawKPBlock(rightX, y, "KP?.2");

  // Second row: KP?.3 (left), KP?.4 (right)
  const secondRowY = y + kpBlockHeight + gapY;
  drawKPBlock(leftX, secondRowY, "KP?.3");
  drawKPBlock(rightX, secondRowY, "KP?.4");

  // Footer – "Page 14 of 26"
  footer(doc, 14);
}

// PAGE 16 – placeholder
function page16(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "15. PROCESS CONTROL");
  y += 10;

  // Subheading: RECEIVE CONTROL (left) + colored circle (right)
  const titleText = "PROCESS CONTROL";

  // Draw the text first
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(titleText, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  // Draw a slightly bigger colored circle on the right side of this row
  const circleRadius = 5;
  const circleCenterY = y + 7; // vertically aligned with text
  const circleCenterX = M.l + CONTENT_W - 20; // near the right edge

  doc
    .save()
    .fillColor(BORDER_COLOR)
    .circle(circleCenterX, circleCenterY, circleRadius)
    .fill()
    .restore();

  y = doc.y + 10;

  const rowHeight = 16;

  // ---- helper: key/value row with underline across full width ----
  function keyValueRow(label, value) {
    const v = value || "From project setup";
    const keyWidth = 160;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(label, M.l, y, {
        width: keyWidth,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(v, M.l + keyWidth + 6, y, {
        width: CONTENT_W - keyWidth - 6,
        align: "left",
      });

    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  }

  // ---- top meta block (ID, TYPE, ACCEPTANCE DATE, ENDORSEMENT) ----
  keyValueRow("ID", dynamic.receiveId || "KP?. CONTROL");
  keyValueRow(
    "TYPE",
    dynamic.receiveType || "Receive control type – app registration"
  );
  keyValueRow(
    "ACCEPTANCE DATE",
    dynamic.receiveAcceptanceDate || "[Select Date]  registration date"
  );
  keyValueRow("ENDORSEMENT", dynamic.receiveEndorsement || "");

  // ---- DRAWING: label row + proper rectangle for the drawing ----
  (function drawDrawingBlock() {
    const keyWidth = 160;

    // Label row "DRAWING"
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text("DRAWING", M.l, y, {
        width: keyWidth,
        align: "left",
      });

    // underline across full width
    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight + 6;

    // Big rectangle where the marked drawing image will come
    const boxHeight = 110;
    const boxY = y;

    doc
      .save()
      .lineWidth(1)
      .strokeColor(BORDER_COLOR)
      .rect(M.l, boxY, CONTENT_W, boxHeight)
      .stroke()
      .restore();

    // Caption inside the box
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(
        dynamic.receiveDrawingCaption ||
          "Marked main drawing from registration on app",
        M.l + 6,
        boxY + 6,
        {
          width: CONTENT_W - 12,
          align: "left",
        }
      );

    // If later you want to actually place an image:
    // if (dynamic.receiveDrawingImagePath) {
    //   doc.image(dynamic.receiveDrawingImagePath, M.l + 6, boxY + 22, {
    //     fit: [CONTENT_W - 12, boxHeight - 28],
    //     align: "center",
    //     valign: "center",
    //   });
    // }

    y = boxY + boxHeight + 14;
  })();

  // ---- remaining meta rows ----
  keyValueRow("LOCALIZATION OF CONTROLS", dynamic.receiveLocalization || "");
  keyValueRow(
    "BUILDING PART",
    dynamic.receiveBuildingPart || "From project setup"
  );

  y += 10;

  // ---- 4 KP blocks in a 2x2 grid ----
  const gapX = 20;
  const gapY = 24;
  const boxWidth = (CONTENT_W - gapX) / 2;
  const kpBlockHeight = 150; // fixed height per KP block

  const leftX = M.l;
  const rightX = M.l + boxWidth + gapX;

  function drawKPBlock(x, yTop, label) {
    // 1) "KP?.X unique no." + underline
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(label + " unique no.", x, yTop, {
        width: boxWidth,
        align: "left",
      });

    const lineY1 = yTop + 12;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(x, lineY1)
      .lineTo(x + boxWidth, lineY1)
      .stroke()
      .restore();

    // 2) "Comment on Picture from registration" + underline
    const commentY = lineY1 + 6;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text("Comment on Picture from registration", x, commentY, {
        width: boxWidth,
        align: "left",
      });

    const lineY2 = commentY + 12;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(x, lineY2)
      .lineTo(x + boxWidth, lineY2)
      .stroke()
      .restore();

    // 3) Picture rectangle
    const picY = lineY2 + 8;
    const picHeight = kpBlockHeight - (picY - yTop) - 22; // leave room for caption

    doc
      .save()
      .lineWidth(1)
      .strokeColor(BORDER_COLOR)
      .rect(x, picY, boxWidth, picHeight)
      .stroke()
      .restore();

    // 4) Picture caption
    const captionY = picY + picHeight + 4;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text("Picture for registration", x + 5, captionY, {
        width: boxWidth - 10,
        align: "center",
      });
  }

  // First row: KP?.1 (left), KP?.2 (right)
  drawKPBlock(leftX, y, "KP?.1");
  drawKPBlock(rightX, y, "KP?.2");

  // Second row: KP?.3 (left), KP?.4 (right)
  const secondRowY = y + kpBlockHeight + gapY;
  drawKPBlock(leftX, secondRowY, "KP?.3");
  drawKPBlock(rightX, secondRowY, "KP?.4");

  // Footer – "Page 14 of 26"
  footer(doc, 15);
}

// PAGE 17 – placeholder
function page17(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "16. FINAL CONTROL");
  y += 10;

  // Subheading: RECEIVE CONTROL (left) + colored circle (right)
  const titleText = "FINAL CONTROL";

  // Draw the text first
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(titleText, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  // Draw a slightly bigger colored circle on the right side of this row
  const circleRadius = 5;
  const circleCenterY = y + 7; // vertically aligned with text
  const circleCenterX = M.l + CONTENT_W - 20; // near the right edge

  doc
    .save()
    .fillColor(BORDER_COLOR)
    .circle(circleCenterX, circleCenterY, circleRadius)
    .fill()
    .restore();

  y = doc.y + 10;

  const rowHeight = 16;

  // ---- helper: key/value row with underline across full width ----
  function keyValueRow(label, value) {
    const v = value || "From project setup";
    const keyWidth = 160;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(label, M.l, y, {
        width: keyWidth,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(v, M.l + keyWidth + 6, y, {
        width: CONTENT_W - keyWidth - 6,
        align: "left",
      });

    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  }

  // ---- top meta block (ID, TYPE, ACCEPTANCE DATE, ENDORSEMENT) ----
  keyValueRow("ID", dynamic.receiveId || "KP?. CONTROL");
  keyValueRow(
    "TYPE",
    dynamic.receiveType || "Receive control type – app registration"
  );
  keyValueRow(
    "ACCEPTANCE DATE",
    dynamic.receiveAcceptanceDate || "[Select Date]  registration date"
  );
  keyValueRow("ENDORSEMENT", dynamic.receiveEndorsement || "");

  // ---- DRAWING: label row + proper rectangle for the drawing ----
  (function drawDrawingBlock() {
    const keyWidth = 160;

    // Label row "DRAWING"
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text("DRAWING", M.l, y, {
        width: keyWidth,
        align: "left",
      });

    // underline across full width
    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight + 6;

    // Big rectangle where the marked drawing image will come
    const boxHeight = 110;
    const boxY = y;

    doc
      .save()
      .lineWidth(1)
      .strokeColor(BORDER_COLOR)
      .rect(M.l, boxY, CONTENT_W, boxHeight)
      .stroke()
      .restore();

    // Caption inside the box
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(
        dynamic.receiveDrawingCaption ||
          "Marked main drawing from registration on app",
        M.l + 6,
        boxY + 6,
        {
          width: CONTENT_W - 12,
          align: "left",
        }
      );

    // If later you want to actually place an image:
    // if (dynamic.receiveDrawingImagePath) {
    //   doc.image(dynamic.receiveDrawingImagePath, M.l + 6, boxY + 22, {
    //     fit: [CONTENT_W - 12, boxHeight - 28],
    //     align: "center",
    //     valign: "center",
    //   });
    // }

    y = boxY + boxHeight + 14;
  })();

  // ---- remaining meta rows ----
  keyValueRow("LOCALIZATION OF CONTROLS", dynamic.receiveLocalization || "");
  keyValueRow(
    "BUILDING PART",
    dynamic.receiveBuildingPart || "From project setup"
  );

  y += 10;

  // ---- 4 KP blocks in a 2x2 grid ----
  const gapX = 20;
  const gapY = 24;
  const boxWidth = (CONTENT_W - gapX) / 2;
  const kpBlockHeight = 150; // fixed height per KP block

  const leftX = M.l;
  const rightX = M.l + boxWidth + gapX;

  function drawKPBlock(x, yTop, label) {
    // 1) "KP?.X unique no." + underline
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(label + " unique no.", x, yTop, {
        width: boxWidth,
        align: "left",
      });

    const lineY1 = yTop + 12;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(x, lineY1)
      .lineTo(x + boxWidth, lineY1)
      .stroke()
      .restore();

    // 2) "Comment on Picture from registration" + underline
    const commentY = lineY1 + 6;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text("Comment on Picture from registration", x, commentY, {
        width: boxWidth,
        align: "left",
      });

    const lineY2 = commentY + 12;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(x, lineY2)
      .lineTo(x + boxWidth, lineY2)
      .stroke()
      .restore();

    // 3) Picture rectangle
    const picY = lineY2 + 8;
    const picHeight = kpBlockHeight - (picY - yTop) - 22; // leave room for caption

    doc
      .save()
      .lineWidth(1)
      .strokeColor(BORDER_COLOR)
      .rect(x, picY, boxWidth, picHeight)
      .stroke()
      .restore();

    // 4) Picture caption
    const captionY = picY + picHeight + 4;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text("Picture for registration", x + 5, captionY, {
        width: boxWidth - 10,
        align: "center",
      });
  }

  // First row: KP?.1 (left), KP?.2 (right)
  drawKPBlock(leftX, y, "KP?.1");
  drawKPBlock(rightX, y, "KP?.2");

  // Second row: KP?.3 (left), KP?.4 (right)
  const secondRowY = y + kpBlockHeight + gapY;
  drawKPBlock(leftX, secondRowY, "KP?.3");
  drawKPBlock(rightX, secondRowY, "KP?.4");

  // Footer – "Page 14 of 26"
  footer(doc, 16);
}

// PAGE 18 – placeholder
function page18(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "17. DEVIATIONS");
  y += 10;

  // Subheading: RECEIVE CONTROL (left) + colored circle (right)
  const titleText = "DEVIATIONS";

  // Draw the text first
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(titleText, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  // Draw a slightly bigger colored circle on the right side of this row
  const circleRadius = 5;
  const circleCenterY = y + 7; // vertically aligned with text
  const circleCenterX = M.l + CONTENT_W - 20; // near the right edge

  doc
    .save()
    .fillColor(BORDER_COLOR)
    .circle(circleCenterX, circleCenterY, circleRadius)
    .fill()
    .restore();

  y = doc.y + 10;

  const rowHeight = 16;

  // ---- helper: key/value row with underline across full width ----
  function keyValueRow(label, value) {
    const v = value || "From project setup";
    const keyWidth = 160;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(label, M.l, y, {
        width: keyWidth,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(v, M.l + keyWidth + 6, y, {
        width: CONTENT_W - keyWidth - 6,
        align: "left",
      });

    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  }

  // ---- top meta block (ID, TYPE, ACCEPTANCE DATE, ENDORSEMENT) ----
  keyValueRow("ID", dynamic.receiveId || "KP?. CONTROL");
  keyValueRow(
    "TYPE",
    dynamic.receiveType || "Receive control type – app registration"
  );
  keyValueRow(
    "ACCEPTANCE DATE",
    dynamic.receiveAcceptanceDate || "[Select Date]  registration date"
  );
  keyValueRow("ENDORSEMENT", dynamic.receiveEndorsement || "");

  // ---- DRAWING: label row + proper rectangle for the drawing ----
  (function drawDrawingBlock() {
    const keyWidth = 160;

    // Label row "DRAWING"
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text("DRAWING", M.l, y, {
        width: keyWidth,
        align: "left",
      });

    // underline across full width
    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight + 6;

    // Big rectangle where the marked drawing image will come
    const boxHeight = 110;
    const boxY = y;

    doc
      .save()
      .lineWidth(1)
      .strokeColor(BORDER_COLOR)
      .rect(M.l, boxY, CONTENT_W, boxHeight)
      .stroke()
      .restore();

    // Caption inside the box
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(
        dynamic.receiveDrawingCaption ||
          "Marked main drawing from registration on app",
        M.l + 6,
        boxY + 6,
        {
          width: CONTENT_W - 12,
          align: "left",
        }
      );

    // If later you want to actually place an image:
    // if (dynamic.receiveDrawingImagePath) {
    //   doc.image(dynamic.receiveDrawingImagePath, M.l + 6, boxY + 22, {
    //     fit: [CONTENT_W - 12, boxHeight - 28],
    //     align: "center",
    //     valign: "center",
    //   });
    // }

    y = boxY + boxHeight + 14;
  })();

  // ---- remaining meta rows ----
  keyValueRow("LOCALIZATION OF CONTROLS", dynamic.receiveLocalization || "");
  keyValueRow(
    "BUILDING PART",
    dynamic.receiveBuildingPart || "From project setup"
  );

  y += 10;

  // ---- 4 KP blocks in a 2x2 grid ----
  const gapX = 20;
  const gapY = 24;
  const boxWidth = (CONTENT_W - gapX) / 2;
  const kpBlockHeight = 150; // fixed height per KP block

  const leftX = M.l;
  const rightX = M.l + boxWidth + gapX;

  function drawKPBlock(x, yTop, label) {
    // 1) "KP?.X unique no." + underline
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(label + " unique no.", x, yTop, {
        width: boxWidth,
        align: "left",
      });

    const lineY1 = yTop + 12;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(x, lineY1)
      .lineTo(x + boxWidth, lineY1)
      .stroke()
      .restore();

    // 2) "Comment on Picture from registration" + underline
    const commentY = lineY1 + 6;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text("Comment on Picture from registration", x, commentY, {
        width: boxWidth,
        align: "left",
      });

    const lineY2 = commentY + 12;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(x, lineY2)
      .lineTo(x + boxWidth, lineY2)
      .stroke()
      .restore();

    // 3) Picture rectangle
    const picY = lineY2 + 8;
    const picHeight = kpBlockHeight - (picY - yTop) - 22; // leave room for caption

    doc
      .save()
      .lineWidth(1)
      .strokeColor(BORDER_COLOR)
      .rect(x, picY, boxWidth, picHeight)
      .stroke()
      .restore();

    // 4) Picture caption
    const captionY = picY + picHeight + 4;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text("Picture for registration", x + 5, captionY, {
        width: boxWidth - 10,
        align: "center",
      });
  }

  // First row: KP?.1 (left), KP?.2 (right)
  drawKPBlock(leftX, y, "KP?.1");
  drawKPBlock(rightX, y, "KP?.2");

  // Second row: KP?.3 (left), KP?.4 (right)
  const secondRowY = y + kpBlockHeight + gapY;
  drawKPBlock(leftX, secondRowY, "KP?.3");
  drawKPBlock(rightX, secondRowY, "KP?.4");

  // Footer – "Page 14 of 26"
  footer(doc, 17);
}

// PAGE 19 – placeholder
// PAGE 19 – 18. WEATHER HISTORY
function page19(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "18. WEATHER HISTORY");
  y += 12;

  // Intro text
  y = paragraph(
    doc,
    y,
    "The following are recorded during the execution phase which indicate conditions that hinder our work or are in breach of the safety and health regulations on site,",
    { fontSize: 9 }
  );

  y = paragraph(
    doc,
    y,
    "It could be, for example. be: Severe frost, unusual weather conditions or storm and strong winds, stop in crane work.",
    { fontSize: 9 }
  );

  y += 10;

  // REPORTED TO:
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text("REPORTED TO:", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 10;

  // Source line
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text(
      "Source: https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/2-2623032/Danmark",
      M.l,
      y,
      {
        width: CONTENT_W,
        align: "left",
      }
    );

  y = doc.y + 16;

  // ---------- WEATHER TABLE (3 columns) ----------
  const tableX = M.l;
  const tableW = CONTENT_W;

  // 3 columns:
  // 1) ID
  // 2) SUBJECT: RAIN, FROST OR STRONG WIND (image)
  // 3) CAUSE DELAYS (text)
  const colWidths = [60, 150, tableW - 60 - 150];
  const col1X = tableX;
  const col2X = tableX + colWidths[0];
  const col3X = tableX + colWidths[0] + colWidths[1];

  // For header row heights
  function drawHeaderRow() {
    const rowH = 22;

    // ID
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text("ID", col1X + 3, y + 4, {
        width: colWidths[0] - 6,
        align: "left",
      });

    // SUBJECT...
    doc.text("SUBJECT: RAIN, FROST OR STRONG WIND", col2X + 3, y + 4, {
      width: colWidths[1] - 6,
      align: "left",
    });

    // CAUSE DELAYS
    doc.text("CAUSE DELAYS", col3X + 3, y + 4, {
      width: colWidths[2] - 6,
      align: "left",
    });

    // bottom line
    const lineY = y + rowH;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += rowH;
  }

  function drawDataRow(ev) {
    const idText = ev.id || "";
    const causeText = ev.cause || "From app";
    const imagePath = ev.imagePath || null;

    const rowH = 70; // enough height for image + text

    // ID cell
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(idText, col1X + 3, y + 4, {
        width: colWidths[0] - 6,
        align: "left",
      });

    // SUBJECT column: image placeholder / image
    const imgX = col2X + 4;
    const imgY = y + 4;
    const imgW = colWidths[1] - 8;
    const imgH = rowH - 14; // some padding for top/bottom

    if (imagePath) {
      try {
        doc.image(imagePath, imgX, imgY, {
          fit: [imgW, imgH],
          align: "center",
          valign: "center",
        });
      } catch (e) {
        // fallback: rectangle + text
        doc
          .save()
          .lineWidth(0.5)
          .strokeColor(BORDER_COLOR)
          .rect(imgX, imgY, imgW, imgH)
          .stroke()
          .restore();

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("black")
          .text("Image from app", imgX + 2, imgY + 2, {
            width: imgW - 4,
            align: "left",
          });
      }
    } else {
      // No image yet: draw placeholder box
      doc
        .save()
        .lineWidth(0.5)
        .strokeColor(BORDER_COLOR)
        .rect(imgX, imgY, imgW, imgH)
        .stroke()
        .restore();

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("black")
        .text("Image from app", imgX + 2, imgY + 2, {
          width: imgW - 4,
          align: "left",
        });
    }

    // CAUSE DELAYS (text column)
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(causeText, col3X + 3, y + 4, {
        width: colWidths[2] - 6,
        align: "left",
      });

    // bottom line
    const lineY = y + rowH;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += rowH;
  }

  // Header
  drawHeaderRow();

  y += 4;

  // Data rows (can be dynamic later)
  const events =
    dynamic.weatherEvents && Array.isArray(dynamic.weatherEvents)
      ? dynamic.weatherEvents
      : [
          { id: "19.11", imagePath: null, cause: "From app" },
          { id: "19.12", imagePath: null, cause: "From app" },
          { id: "19.13", imagePath: null, cause: "From app" },
        ];

  events.forEach((ev) => drawDataRow(ev));

  y += 24;

  // ---------- CONTACT / NAME BLOCK ----------
  const rowHeightContact = 16;
  const keyWidthContact = 120;

  function keyValueRowContact(label, value) {
    const v = value || "From project setup";

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(label, M.l, y, {
        width: keyWidthContact,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(v, M.l + keyWidthContact + 6, y, {
        width: CONTENT_W - keyWidthContact - 6,
        align: "left",
      });

    const lineY = y + rowHeightContact - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeightContact;
  }

  // NAME line: role is "CONSTRUCTION MANAGER – From project setup"
  const nameValue =
    dynamic.weatherName || "CONSTRUCTION MANAGER – From project setup";

  keyValueRowContact("NAME", nameValue);
  keyValueRowContact(
    "TELEPHONE:",
    dynamic.weatherTelephone || "From project setup"
  );
  keyValueRowContact("EMAIL:", dynamic.weatherEmail || "From project setup");

  // Footer – this page is "Page 18 of 26"
  footer(doc, 18);
}

// PAGE 20 – placeholder
// PAGE 20 – 19. COMMUNICATION HISTORY VIA SMS OR EMAIL
function page20(doc, dynamic) {
  // Top blue section bar
  let y = drawSectionBar(
    doc,
    M.t,
    "19. COMMUNICATION HISTORY VIA SMS OR EMAIL"
  );
  y += 20;

  // ---------- 20.10 E-MAIL SENT TO INVOLVED PARTIES ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text("20.10 E-MAIL SENT TO INVOLVED PARTIES", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 10;

  const tableX = M.l;
  const tableW = CONTENT_W;

  // Columns: ID | DATE | SUBJECT | SENT | RECIPIENTS
  const colWidthsEmail = [50, 70, 190, 60, tableW - (50 + 70 + 190 + 60)];
  const col1X_e = tableX;
  const col2X_e = tableX + colWidthsEmail[0];
  const col3X_e = col2X_e + colWidthsEmail[1];
  const col4X_e = col3X_e + colWidthsEmail[2];
  const col5X_e = col4X_e + colWidthsEmail[3];

  function measureRowHeightEmail(c1, c2, c3, c4, c5, bold = false) {
    const fontName = bold ? "Helvetica-Bold" : "Helvetica";
    doc.font(fontName).fontSize(9);

    const h1 =
      doc.heightOfString(c1 || "", { width: colWidthsEmail[0] - 6 }) + 6;
    const h2 =
      doc.heightOfString(c2 || "", { width: colWidthsEmail[1] - 6 }) + 6;
    const h3 =
      doc.heightOfString(c3 || "", { width: colWidthsEmail[2] - 6 }) + 6;
    const h4 =
      doc.heightOfString(c4 || "", { width: colWidthsEmail[3] - 6 }) + 6;
    const h5 =
      doc.heightOfString(c5 || "", { width: colWidthsEmail[4] - 6 }) + 6;

    return Math.max(h1, h2, h3, h4, h5, bold ? 16 : 14);
  }

  function drawEmailRow(c1, c2, c3, c4, c5, bold = false) {
    const rowH = measureRowHeightEmail(c1, c2, c3, c4, c5, bold);
    const fontName = bold ? "Helvetica-Bold" : "Helvetica";

    doc.font(fontName).fontSize(9).fillColor("black");

    // ID
    doc.text(c1 || "", col1X_e + 3, y + 3, {
      width: colWidthsEmail[0] - 6,
      align: "left",
    });

    // DATE
    doc.text(c2 || "", col2X_e + 3, y + 3, {
      width: colWidthsEmail[1] - 6,
      align: "left",
    });

    // SUBJECT
    doc.text(c3 || "", col3X_e + 3, y + 3, {
      width: colWidthsEmail[2] - 6,
      align: "left",
    });

    // SENT
    doc.text(c4 || "", col4X_e + 3, y + 3, {
      width: colWidthsEmail[3] - 6,
      align: "left",
    });

    // RECIPIENTS
    doc.text(c5 || "", col5X_e + 3, y + 3, {
      width: colWidthsEmail[4] - 6,
      align: "left",
    });

    // bottom line only
    const lineY = y + rowH;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += rowH;
  }

  // Header row
  drawEmailRow("ID", "DATE", "SUBJECT", "SENT", "RECIPIENTS", true);

  y += 4;

  // Data rows – later you’ll fill from Mongo; for now static placeholders
  const emailRows =
    dynamic.emailCommunications && Array.isArray(dynamic.emailCommunications)
      ? dynamic.emailCommunications
      : [
          // example structure:
          // { id: "20.11", date: "From app", subject: "From app", sent: "From app", recipients: "From app" }
        ];

  if (emailRows.length === 0) {
    // Empty visual row (like the template)
    drawEmailRow("", "", "", "", "", false);
  } else {
    emailRows.forEach((r) => {
      drawEmailRow(
        r.id || "",
        r.date || "",
        r.subject || "",
        r.sent || "",
        r.recipients || ""
      );
    });
  }

  y += 28;

  // ---------- 20.20 SMS SENT TO INVOLVED PARTIES ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text("20.20 SMS SENT TO INVOLVED PARTIES", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 10;

  // Same table layout for SMS
  const colWidthsSms = colWidthsEmail;
  const col1X_s = tableX;
  const col2X_s = tableX + colWidthsSms[0];
  const col3X_s = col2X_s + colWidthsSms[1];
  const col4X_s = col3X_s + colWidthsSms[2];
  const col5X_s = col4X_s + colWidthsSms[3];

  function measureRowHeightSms(c1, c2, c3, c4, c5, bold = false) {
    const fontName = bold ? "Helvetica-Bold" : "Helvetica";
    doc.font(fontName).fontSize(9);

    const h1 = doc.heightOfString(c1 || "", { width: colWidthsSms[0] - 6 }) + 6;
    const h2 = doc.heightOfString(c2 || "", { width: colWidthsSms[1] - 6 }) + 6;
    const h3 = doc.heightOfString(c3 || "", { width: colWidthsSms[2] - 6 }) + 6;
    const h4 = doc.heightOfString(c4 || "", { width: colWidthsSms[3] - 6 }) + 6;
    const h5 = doc.heightOfString(c5 || "", { width: colWidthsSms[4] - 6 }) + 6;

    return Math.max(h1, h2, h3, h4, h5, bold ? 16 : 14);
  }

  function drawSmsRow(c1, c2, c3, c4, c5, bold = false) {
    const rowH = measureRowHeightSms(c1, c2, c3, c4, c5, bold);
    const fontName = bold ? "Helvetica-Bold" : "Helvetica";

    doc.font(fontName).fontSize(9).fillColor("black");

    // ID
    doc.text(c1 || "", col1X_s + 3, y + 3, {
      width: colWidthsSms[0] - 6,
      align: "left",
    });

    // DATE
    doc.text(c2 || "", col2X_s + 3, y + 3, {
      width: colWidthsSms[1] - 6,
      align: "left",
    });

    // SUBJECT
    doc.text(c3 || "", col3X_s + 3, y + 3, {
      width: colWidthsSms[2] - 6,
      align: "left",
    });

    // SENT
    doc.text(c4 || "", col4X_s + 3, y + 3, {
      width: colWidthsSms[3] - 6,
      align: "left",
    });

    // RECIPIENTS
    doc.text(c5 || "", col5X_s + 3, y + 3, {
      width: colWidthsSms[4] - 6,
      align: "left",
    });

    // bottom line only
    const lineY = y + rowH;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += rowH;
  }

  // Header row for SMS
  drawSmsRow("ID", "DATE", "SUBJECT", "SENT", "RECIPIENTS", true);

  y += 4;

  // Data rows for SMS (dynamic later)
  const smsRows =
    dynamic.smsCommunications && Array.isArray(dynamic.smsCommunications)
      ? dynamic.smsCommunications
      : [
          // { id: "20.21", date: "From app", subject: "From app", sent: "From app", recipients: "From app" }
        ];

  if (smsRows.length === 0) {
    drawSmsRow("", "", "", "", "", false);
  } else {
    smsRows.forEach((r) => {
      drawSmsRow(
        r.id || "",
        r.date || "",
        r.subject || "",
        r.sent || "",
        r.recipients || ""
      );
    });
  }

  // Footer – this physical page is "Page 19 of 26"
  footer(doc, 19);
}

// PAGE 21 – placeholder
// PAGE 21 – 20. RE REPORTED STAFFING
function page21(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "20. RE REPORTED STAFFING");
  y += 12;

  // Intro text
  y = paragraph(
    doc,
    y,
    "Below you can see the reported staffing for the project period.",
    { fontSize: 9 }
  );

  y += 10;

  // ---------- STAFFING TABLE ----------
  const tableX = M.l;
  const tableW = CONTENT_W;

  // 10 columns:
  // WEEK | INFORM | MON | TUE | WEN | TOR | Fri | SAT | SUN | AVERAGE PR WEEK
  const colWidths = [
    45, // WEEK
    55, // INFORM
    45, // MON
    45, // TUE
    45, // WEN
    45, // TOR
    45, // Fri
    45, // SAT
    45, // SUN
    tableW - (45 + 55 + 45 * 7), // AVERAGE PR WEEK (rest)
  ];

  // X positions for each column
  const colX = [];
  let accX = tableX;
  for (let i = 0; i < colWidths.length; i++) {
    colX.push(accX);
    accX += colWidths[i];
  }

  function measureRowHeightStaffing(cells, bold = false) {
    const fontName = bold ? "Helvetica-Bold" : "Helvetica";
    doc.font(fontName).fontSize(9);

    let maxH = 0;
    for (let i = 0; i < cells.length; i++) {
      const txt = cells[i] || "";
      const h =
        doc.heightOfString(txt, {
          width: colWidths[i] - 6,
          align: "left",
        }) + 6;
      if (h > maxH) maxH = h;
    }
    return Math.max(maxH, bold ? 16 : 14);
  }

  function drawStaffRow(cells, bold = false) {
    const rowH = measureRowHeightStaffing(cells, bold);
    const fontName = bold ? "Helvetica-Bold" : "Helvetica";

    doc.font(fontName).fontSize(9).fillColor("black");

    for (let i = 0; i < cells.length; i++) {
      const txt = cells[i] || "";
      doc.text(txt, colX[i] + 3, y + 3, {
        width: colWidths[i] - 6,
        align: "left",
      });
    }

    // bottom horizontal line only
    const lineY = y + rowH;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += rowH;
  }

  // Header row (all labels including AVERAGE PR WEEK)
  drawStaffRow(
    [
      "WEEK",
      "INFORM",
      "MON",
      "TUE",
      "WEN",
      "TOR",
      "Fri",
      "SAT",
      "SUN",
      "AVERAGE PR WEEK",
    ],
    true
  );

  y += 4;

  // Data rows – later from Mongo; for now template / dynamic override
  const staffingRows =
    dynamic.reportedStaffing && Array.isArray(dynamic.reportedStaffing)
      ? dynamic.reportedStaffing
      : [
          // Example structure for later:
          // {
          //   week: "1",
          //   inform: "From app",
          //   mon: "3",
          //   tue: "4",
          //   wen: "2",
          //   tor: "3",
          //   fri: "0",
          //   sat: "0",
          //   sun: "0",
          //   averagePerWeek: "2.0",
          // },
          {},
          {},
          {},
          {},
        ];

  staffingRows.forEach((row) => {
    if (!row || Object.keys(row).length === 0) {
      // empty row like blank template
      drawStaffRow(["", "", "", "", "", "", "", "", "", ""], false);
    } else {
      drawStaffRow(
        [
          row.week || "",
          row.inform || "",
          row.mon || "",
          row.tue || "",
          row.wen || "",
          row.tor || "",
          row.fri || "",
          row.sat || "",
          row.sun || "",
          row.averagePerWeek || "",
        ],
        false
      );
    }
  });

  // Footer – this physical page is "Page 20 of 26"
  footer(doc, 20);
}

// PAGE 22 – placeholder
// PAGE 22 – 21. ALLEGED REALIZATION DURING CONSTRUCTION
function page22(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(
    doc,
    M.t,
    "21. ALLEGED REALIZATION DURING CONSTRUCTION"
  );
  y += 12;

  // Intro paragraphs (exact text from the PDF)
  y = paragraph(
    doc,
    y,
    "In connection with the execution of my contract, documentation has been sent to the parties involved, including the",
    { fontSize: 9 }
  );

  y = paragraph(
    doc,
    y,
    "construction management, regarding conditions that either limit my work , cause disturbances  or are in violation of",
    { fontSize: 9 }
  );

  y = paragraph(
    doc,
    y,
    "working environment rules or safety  on the construction site, this unfortunately leads to delays, and possibly",
    { fontSize: 9 }
  );

  y = paragraph(doc, y, "additional costs .", { fontSize: 9 });

  y += 6;

  y = paragraph(
    doc,
    y,
    "This will be stated in the documents sent, which have the following ID.",
    { fontSize: 9 }
  );

  y += 14;

  // Subheading
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text("21.10 EMAIL SENT TO INVOLVED PARTIES", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 10;

  // ---------- TABLE: POS. / DATE / SUBJECT / SENT / RETURNREPLY / RECIPIENT ----------
  const tableX = M.l;
  const tableW = CONTENT_W;

  // 6 columns: POS. | DATE | SUBJECT | SENT | RETURNREPLY | RECIPIENT
  const colWidths = [
    45, // POS.
    65, // DATE
    180, // SUBJECT
    50, // SENT
    90, // RETURNREPLY
    tableW - (45 + 65 + 180 + 50 + 90), // RECIPIENT (rest)
  ];

  const colX = [];
  let accX = tableX;
  for (let i = 0; i < colWidths.length; i++) {
    colX.push(accX);
    accX += colWidths[i];
  }

  function measureRowHeight(cells, bold = false) {
    const fontName = bold ? "Helvetica-Bold" : "Helvetica";
    doc.font(fontName).fontSize(9);

    let maxH = 0;
    for (let i = 0; i < cells.length; i++) {
      const txt = cells[i] || "";
      const h =
        doc.heightOfString(txt, {
          width: colWidths[i] - 6,
          align: "left",
        }) + 6;
      if (h > maxH) maxH = h;
    }
    return Math.max(maxH, bold ? 16 : 14);
  }

  function drawRow(cells, bold = false) {
    const rowH = measureRowHeight(cells, bold);
    const fontName = bold ? "Helvetica-Bold" : "Helvetica";

    doc.font(fontName).fontSize(9).fillColor("black");

    for (let i = 0; i < cells.length; i++) {
      const txt = cells[i] || "";
      doc.text(txt, colX[i] + 3, y + 3, {
        width: colWidths[i] - 6,
        align: "left",
      });
    }

    // bottom horizontal line only (no verticals)
    const lineY = y + rowH;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += rowH;
  }

  // Header row – exactly as in the PDF
  drawRow(
    ["POS.", "DATE", "SUBJECT", "SENT", "RETURNREPLY", "RECIPIENT"],
    true
  );

  y += 4;

  // Data rows – PDF shows 22.11, 22.12, 22.13 with empty cells.
  // We support dynamic override but default to those three IDs.
  const emailRows =
    dynamic.allegedEmails && Array.isArray(dynamic.allegedEmails)
      ? dynamic.allegedEmails
      : [
          {
            pos: "22.11",
            date: "",
            subject: "",
            sent: "",
            returnReply: "",
            recipient: "",
          },
          {
            pos: "22.12",
            date: "",
            subject: "",
            sent: "",
            returnReply: "",
            recipient: "",
          },
          {
            pos: "22.13",
            date: "",
            subject: "",
            sent: "",
            returnReply: "",
            recipient: "",
          },
        ];

  emailRows.forEach((r) => {
    drawRow(
      [
        r.pos || "",
        r.date || "",
        r.subject || "",
        r.sent || "",
        r.returnReply || "",
        r.recipient || "",
      ],
      false
    );
  });

  // Footer – this physical page is "Page 21 of 26"
  footer(doc, 21);
}

// PAGE 23 – placeholder
// PAGE 23 – 21. MISCELLANEOUS REPORTS OVERVIEW.
function page23(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "21. MISCELLANEOUS REPORTS OVERVIEW.");
  y += 12;

  // Intro line
  y = paragraph(doc, y, "Below are the forwarded requests:", { fontSize: 9 });
  y += 12;

  // Common table column layout: ID: | DATE | TITLE | SENT | RECIPIENT
  const tableX = M.l;
  const tableW = CONTENT_W;

  const colWidths = [
    60, // ID:
    70, // DATE
    200, // TITLE
    90, // SENT
    tableW - (60 + 70 + 200 + 90), // RECIPIENT
  ];

  const colX = [];
  let accX = tableX;
  for (let i = 0; i < colWidths.length; i++) {
    colX.push(accX);
    accX += colWidths[i];
  }

  function measureRowHeightMisc(cells, bold = false) {
    const fontName = bold ? "Helvetica-Bold" : "Helvetica";
    doc.font(fontName).fontSize(9);

    let maxH = 0;
    for (let i = 0; i < cells.length; i++) {
      const txt = cells[i] || "";
      const h =
        doc.heightOfString(txt, {
          width: colWidths[i] - 6,
          align: "left",
        }) + 6;
      if (h > maxH) maxH = h;
    }
    return Math.max(maxH, bold ? 16 : 14);
  }

  function drawMiscRow(cells, bold = false, color = "black") {
    const rowH = measureRowHeightMisc(cells, bold);
    const fontName = bold ? "Helvetica-Bold" : "Helvetica";

    doc.font(fontName).fontSize(9).fillColor(color);

    for (let i = 0; i < cells.length; i++) {
      const txt = cells[i] || "";
      doc.text(txt, colX[i] + 3, y + 3, {
        width: colWidths[i] - 6,
        align: "left",
      });
    }

    // bottom horizontal line
    const lineY = y + rowH;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += rowH;
  }

  function drawMiscSection(sectionNo, title, rows) {
    const headerH = 18;

    // Grey header bar across full width
    doc
      .save()
      .lineWidth(0.8)
      .strokeColor(BORDER_COLOR)
      .rect(M.l, y, CONTENT_W, headerH)
      .fillAndStroke(LIGHT_GREY, BORDER_COLOR)
      .restore();

    // Section number (e.g. 22.)
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(sectionNo + ".", M.l + 4, y + 4, {
        width: 40,
        align: "left",
      });

    // Section title (e.g. ADRESSED NOTE)
    doc.text(title, M.l + 44, y + 4, {
      width: CONTENT_W - 48,
      align: "left",
    });

    y += headerH + 4;

    // Table header row: ID: DATE TITLE SENT RECIPIENT
    drawMiscRow(["ID:", "DATE", "TITLE", "SENT", "RECIPIENT"], true, "black");
    y += 2;

    // Data rows (From note placeholders in red by default)
    const rowsToUse =
      rows && rows.length
        ? rows
        : [
            {
              id: "From note",
              date: "From note",
              title: "From note",
              sent: "From note",
              recipient: "From note",
            },
          ];

    rowsToUse.forEach((r) => {
      drawMiscRow(
        [
          r.id || "",
          r.date || "",
          r.title || "",
          r.sent || "",
          r.recipient || "",
        ],
        false,
        "#c00000" // red like template for dynamic "From note"
      );
    });

    y += 14; // space before next section
  }

  // --- 22. ADDRESSED NOTE ---
  drawMiscSection("22", "ADRESSED NOTE", dynamic.addressedNotesOverview);

  // --- 23. TECHNICAL REQUEST ---
  drawMiscSection("23", "TECHNICAL REQUEST", dynamic.technicalRequestsOverview);

  // --- 24. WORKING ENVIRONMENT NOTES ---
  drawMiscSection(
    "24",
    "WORKING ENVIRONMENT NOTES",
    dynamic.workingEnvNotesOverview
  );

  // --- 25. AGREEMENT CHANGE NOTES. ---
  drawMiscSection(
    "25",
    "AGREEMENT CHANGE NOTES.",
    dynamic.agreementChangeNotesOverview
  );

  // --- 26. INSPECTION NOTES ---
  drawMiscSection("26", "INSPECTION NOTES", dynamic.inspectionNotesOverview);

  // Footer – this physical page is "Page 22 of 26"
  footer(doc, 22);
}

// PAGE 24 – placeholder
// PAGE 23 – 22. SIGNING
function page24(doc, dynamic) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "22. SIGNING");
  y += 14;

  // Paragraph 1
  y = paragraph(
    doc,
    y,
    "The subcontractor hereby declares that the quality assurance performed has been carried out in accordance with the Quality Assurance Handbook for the company and partners as stated above.",
    { fontSize: 9 }
  );

  // Paragraph 2
  y = paragraph(
    doc,
    y,
    "This quality assurance fulfils the requirements set out in the tender control plan, in any case of a quality that makes the execution of the work and process visible, and the work performed meets the usual good quality.",
    { fontSize: 9 }
  );

  y += 24;

  // ---------- DATE / SIGNATURE BLOCK ----------
  const colWidth = CONTENT_W / 2;
  const leftX = M.l;
  const rightX = M.l + colWidth;

  const rowHeight = 18;

  // Header row: DATE | SIGNATURE
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text("DATE", leftX, y, {
      width: colWidth,
      align: "left",
    });

  doc.text("SIGNATURE", rightX, y, {
    width: colWidth,
    align: "left",
  });

  // Underlines under DATE and SIGNATURE
  const lineY = y + rowHeight - 4;
  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .moveTo(leftX, lineY)
    .lineTo(leftX + colWidth - 10, lineY)
    .stroke()
    .restore();

  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .moveTo(rightX, lineY)
    .lineTo(rightX + colWidth - 10, lineY)
    .stroke()
    .restore();

  y = lineY + 8;

  // Second row: Signing date | App signing part
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text("Signing date", leftX, y, {
      width: colWidth,
      align: "left",
    });

  doc.text("App signing part", rightX, y, {
    width: colWidth,
    align: "left",
  });

  y = doc.y + 40;

  // Final paragraph at bottom
  y = paragraph(
    doc,
    y,
    "This front page, together with all quality assurance forms (cf. the Quality Handbook for the Company and Partners), constitutes the complete quality assurance of the entire project.",
    { fontSize: 9 }
  );

  // Footer – this physical page is "Page 22 of 26"
  footer(doc, 23);
}

// ---------------------------------------------------------------------
// EXPRESS ROUTES
// ---------------------------------------------------------------------

// Download route
app.get("/download", (req, res) => {
  // Set headers for PDF download
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="quality-assurance-report.pdf"'
  );

  // Later you can build dynamic object from DB / query params
  const dynamic = {}; // for now, empty – will show "From project setup"

  generateQualityAssuranceReport(dynamic, res);
});

// Simple home route
app.get("/", (req, res) => {
  res.send(
    '<h2>Quality Assurance Report PDF</h2><p>Download: <a href="/download">/download</a></p>'
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
