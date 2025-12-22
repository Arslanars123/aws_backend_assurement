// static-control-report.js
// Run with: node static-control-report.js
// Requires: npm install express pdfkit

const express = require("express");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Page + layout constants (A4)
 */
const PAGE = {
  w: 595.28, // A4 width in points (~210mm)
  h: 841.89, // A4 height in points (~297mm)
};

// Margins – we manage layout manually
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

// Total logical pages in template (Side 1 af 24 ... Side 24 af 24)
const TOTAL_PAGES = 24;

/**
 * Draws a full-width dark-blue bar with white text (for section titles)
 */
function drawSectionBar(doc, y, text, rightLabel) {
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

  if (rightLabel) {
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("white")
      .text(rightLabel, M.l + 8, y + 4, {
        width: CONTENT_W - 16,
        align: "right",
      });
  }

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
 * "Part of Kvalitetssikring Danmark ApS" centered
 * "Side X af 24" on the right
 */
function footer(doc, logicalPageNumber) {
  const pageW = doc.page.width;
  const pageH = doc.page.height;

  const contentW = pageW - M.l - M.r;
  const footerY = pageH - M.b + 20; // same spacing, but correct for landscape too

  // Left
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("black")
    .text("Assurement", M.l, footerY, {
      width: contentW / 3,
      align: "left",
    });

  // Center
  doc.text(
    "Part of Kvalitetssikring Danmark ApS",
    M.l + contentW / 3,
    footerY,
    {
      width: contentW / 3,
      align: "center",
    }
  );

  // Right
  doc.text(
    `Side ${logicalPageNumber} af ${TOTAL_PAGES}`,
    M.l + (2 * contentW) / 3,
    footerY,
    {
      width: contentW / 3,
      align: "right",
    }
  );
}

/**
 * Main generator for STATIC CONTROL REPORT
 * @param {object} dynamic - dynamic data (company, project, tables, etc.)
 * @param {Writable} outputStream - Express res or any writable stream
 */
function generateStaticControlReport(dynamic = {}, outputStream) {
  if (!outputStream || typeof outputStream.write !== "function") {
    throw new Error("outputStream (Writable) is required");
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: 0, // we handle margins manually
  });

  // Pipe PDF output to the provided stream (e.g. res)
  doc.pipe(outputStream);

  // IMPORTANT:
  // PDFKit creates the first page automatically.
  // So we draw page1 on the initial page (no addPage() before page1).

  // PAGE 1 – Cover / Executing party, Static Control Report, Eurocodes
  page1(doc, dynamic); // will design this page in next steps

  // PAGE 2 – STATIC INSPECTION REPORT + Construction case + Signing
  doc.addPage({ size: "A4", margin: 0 });
  page2(doc, dynamic);

  // PAGE 3 – Document completion status
  doc.addPage({ size: "A4", margin: 0 });
  page3(doc, dynamic);

  // PAGE 4 – Content table
  doc.addPage({ size: "A4", margin: 0 });
  page4(doc, dynamic);

  // PAGE 5 – 1. GENERALLY
  doc.addPage({ size: "A4", margin: 0 });
  page5(doc, dynamic);

  // PAGE 6 – 2. DOCUMENTATION OF GENERAL CONTROLS
  doc.addPage({ size: "A4", margin: 0 });
  page6(doc, dynamic);

  // PAGE 7 – 3. LIST OF SELECTED CONSTRUCTION AND EXECUTION CLASSES, 4. DOCUMENTATION SPECIAL CONTROLS, 5. FOLLOW-UP
  doc.addPage({ size: "A4", margin: 0 });
  page7(doc, dynamic);

  // PAGE 8 – 6. CONTROL POINTS SELECTED IN THE CONTROL PLAN
  doc.addPage({ size: "A4", margin: 0 });
  page8(doc, dynamic);

  // PAGE 9 – 7. CONTROL CARRIED OUT OF THE ITEMS IN THE CONTROL PLAN/CHE (B1–B3 intro/tables)
  doc.addPage({ size: "A4", margin: 0 });
  page9(doc, dynamic);

  // PAGE 10 – 7.4–7.6 tables (B4–B6)
  doc.addPage({ size: "A4", margin: 0 });
  page10(doc, dynamic);

  // PAGE 11 – 8.A OWN CONTROL B4
  doc.addPage({ size: "A4", margin: 0 });
  page11(doc, dynamic);

  // PAGE 12 – 8.A OWN CONTROL B5
  doc.addPage({ size: "A4", margin: 0 });
  page12(doc, dynamic);

  // PAGE 13 – 8.A OWN CONTROL B6
  doc.addPage({ size: "A4", margin: 0 });
  page13(doc, dynamic);

  // PAGE 14 – 8.B EXTERNAL CONTROL B4
  doc.addPage({ size: "A4", margin: 0 });
  page14(doc, dynamic);

  // PAGE 15 – 8.B EXTERNAL CONTROL B5
  doc.addPage({ size: "A4", margin: 0 });
  page15(doc, dynamic);

  // PAGE 16 – 8.B EXTERNAL CONTROL B6
  doc.addPage({ size: "A4", margin: 0 });
  page16(doc, dynamic);

  // PAGE 17 – 8.4 DEVIATIONS B7
  doc.addPage({ size: "A4", margin: 0 });
  page17(doc, dynamic);

  // PAGE 18 – 8.5 STATEMENT ANNEXES
  doc.addPage({ size: "A4", margin: 0 });
  page18(doc, dynamic);

  // PAGE 19 – 9. KONTROLPUNKT OVERVIEW (drawing + explanation)
  doc.addPage({ size: "A4", layout: "landscape", margin: 0 });
  page19(doc, dynamic);

  // PAGE 20 – 7.1 REVIEW OF THE EXECUTION BASIS FROM THE DESIGN B1
  doc.addPage({ size: "A4", layout: "landscape", margin: 0 });
  page20(doc, dynamic);

  // PAGE 21 – 7.2 VERIFICATION OF THE BASIS FOR EXECUTION OF THE WORK B2
  doc.addPage({ size: "A4", layout: "landscape", margin: 0 });
  page21(doc, dynamic);

  // PAGE 22 – 7.3 VERIFICATION OF DOCUMENTATION OF MATERIALS AND PRODUCTS B3
  doc.addPage({ size: "A4", margin: 0 });
  page22(doc, dynamic);

  // PAGE 23 – 7.4 RECEIPT CONTROL DELIVERIES B4
  doc.addPage({ size: "A4", margin: 0 });
  page23(doc, dynamic);

  // PAGE 24 – 7.5 PERFORMANCE CONTROL; B5
  doc.addPage({ size: "A4", margin: 0 });
  page24(doc, dynamic);

  // PAGE 25 – 7.6 FINAL CHECK B6
  doc.addPage({ size: "A4", margin: 0 });
  page25(doc, dynamic);

  // Finish the PDF
  doc.end();
  return doc;
}

/* ------------------------------------------------------------------
   PAGE STUBS – We will replace each of these pageX functions
   one by one with the exact layout from your PDF.
   For now they just show a placeholder so the file runs.
-------------------------------------------------------------------*/

// PAGE 1 – Executing party, Static Control Report, Eurocodes (COVER)
// PAGE 1 – Cover: Executing party, Static Control Report, EU standards
function page1(doc, dynamic) {
  // Dynamic fields (wire from project setup later)
  const companyName =
    dynamic.companyName ||
    "Own company Adress CVR and contact info. - company setup.";

  const postCity = dynamic.postCity || "";
  const address = dynamic.address || "";
  const cvr = dynamic.cvr || "";
  const telephone = dynamic.telephone || "";
  const mail = dynamic.mail || "";

  const projectName = dynamic.projectName || "Project name project setup.";
  const specialText = dynamic.specialText || "Special text";
  const documentId = dynamic.documentId || "B3.X - number";
  const documentIdExtra = dynamic.documentIdExtra || "Special text";

  let y = M.t;

  // -------------------------------------------------------
  // 1) "Executing party" + plain company detail (NO BOX) + logo box
  // -------------------------------------------------------

  // Label
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text("Executing party:", M.l, y);

  y += 14;

  // Company detail – plain text, no border
  const infoX = M.l;
  const infoW = CONTENT_W * 0.6;

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text(companyName, infoX, y, {
      width: infoW,
      align: "left",
    });

  let lineY = doc.y + 2;

  if (postCity) {
    doc.text(`Post no. / City: ${postCity}`, infoX, lineY, {
      width: infoW,
      align: "left",
    });
    lineY = doc.y + 2;
  }
  if (address) {
    doc.text(`Address: ${address}`, infoX, lineY, {
      width: infoW,
      align: "left",
    });
    lineY = doc.y + 2;
  }
  if (cvr) {
    doc.text(`CVR: ${cvr}`, infoX, lineY, {
      width: infoW,
      align: "left",
    });
    lineY = doc.y + 2;
  }
  if (telephone) {
    doc.text(`Telephone: ${telephone}`, infoX, lineY, {
      width: infoW,
      align: "left",
    });
    lineY = doc.y + 2;
  }
  if (mail) {
    doc.text(`Mail: ${mail}`, infoX, lineY, {
      width: infoW,
      align: "left",
    });
    lineY = doc.y + 2;
  }

  // Logo box on the right
  const logoBoxHeight = 60;
  const logoBoxWidth = CONTENT_W * 0.3;
  const logoBoxX = M.l + infoW + 10;
  const logoBoxY = y;

  doc
    .save()
    .lineWidth(1)
    .strokeColor(BORDER_COLOR)
    .rect(logoBoxX, logoBoxY, logoBoxWidth, logoBoxHeight)
    .stroke()
    .restore();

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text("Company logo", logoBoxX, logoBoxY + logoBoxHeight / 2 - 5, {
      width: logoBoxWidth,
      align: "center",
    });

  const headerBottom = Math.max(lineY, logoBoxY + logoBoxHeight);
  y = headerBottom + 40;

  // -------------------------------------------------------
  // 2) TITLE: "Static Control Report: Project name..." LEFT ALIGNED
  // -------------------------------------------------------

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(BORDER_COLOR)
    .text("Static Control Report:", M.l, y, {
      width: CONTENT_W,
      align: "left",
      continued: true,
    });

  doc
    .font("Helvetica")
    .fontSize(16)
    .fillColor("black")
    .text(" " + projectName, {
      align: "left",
      continued: false,
    });

  y = doc.y + 18;

  // -------------------------------------------------------
  // 3) SPECIAL TEXT + DOCUMENT ID – TEXT LINE + 2 SIDE-BY-SIDE BOXES
  // -------------------------------------------------------

  // Text line
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text(`For those executed within the ${specialText} :`, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 8;

  // Two boxes next to each other:
  // [ Document ID: B3.X - number ]  [ Special text ]
  const boxHeight = 18;
  const boxGap = 10;
  const boxWidth = 150; // each box width
  const firstBoxX = M.l;
  const secondBoxX = firstBoxX + boxWidth + boxGap;

  // Left box: Document ID
  doc
    .save()
    .lineWidth(0.8)
    .strokeColor(BORDER_COLOR)
    .rect(firstBoxX, y, boxWidth, boxHeight)
    .stroke()
    .restore();

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text(`Document ID: ${documentId}`, firstBoxX + 4, y + 4, {
      width: boxWidth - 8,
      align: "left",
    });

  // Right box: Special text
  doc
    .save()
    .lineWidth(0.8)
    .strokeColor(BORDER_COLOR)
    .rect(secondBoxX, y, boxWidth, boxHeight)
    .stroke()
    .restore();

  doc.text(documentIdExtra, secondBoxX + 4, y + 4, {
    width: boxWidth - 8,
    align: "left",
  });

  y = y + boxHeight + 30;

  // -------------------------------------------------------
  // 4) APPLICABLE EU STANDARDS – BULLET BLOCK CENTER OF PAGE
  // -------------------------------------------------------
  // We'll center the WHOLE block vertically/horizontally roughly on the page,
  // but also make sure it doesn't overlap the content above.

  const blockWidth = CONTENT_W * 0.5;
  const blockX = (PAGE.w - blockWidth) / 2; // center on page X-axis

  // Estimate block height: heading + 12 bullets
  const estimatedBlockHeight = 20 + 12 * 12; // ≈ 164

  const desiredTop = PAGE.h / 2 - estimatedBlockHeight / 2;

  // Ensure we don't overlap previous content
  y = Math.max(y, desiredTop);

  // Heading centered inside the block
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("black")
    .text("Applicable EU standards 2024", blockX, y, {
      width: blockWidth,
      align: "center",
    });

  y = doc.y + 8;

  const bulletItems = [
    "Eurocode 0: Design basis for structures",
    "Eurocode 1: Load on load-bearing structures",
    "Eurocode 2: Concrete structures",
    "Eurocode 3: Steel structures",
    "Eurocode 4: Composite Structures",
    "Eurocode 5: Timber structures",
    "Eurocode 6: Masonry structures",
    "Eurocode 7: Geotechnical Engineering",
    "Eurocode 8: Structures in seismic areas",
    "Eurocode 9: Aluminium structures.",
    "EN 1520: Lightweight concrete with porous aggregates",
    "EN 12602: Aerated concrete",
  ];

  doc.font("Helvetica").fontSize(9).fillColor("black");

  bulletItems.forEach((item) => {
    doc.text(`• ${item}`, blockX, y, {
      width: blockWidth,
      align: "left",
    });
    y = doc.y + 2;
  });

  // -------------------------------------------------------
  // 5) BOTTOM CENTER TEXT
  // -------------------------------------------------------

  const bottomY = PAGE.h - 80;

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

  // No footer (page number) on cover
}

// PAGE 2 – STATIC INSPECTION REPORT + construction case, signing
// PAGE 2 – STATIC INSPECTION REPORT + CONSTRUCTION CASE + SIGNING
function page2(doc, dynamic) {
  // --------- dynamic placeholders ----------
  const constructionPart = dynamic.constructionPart || "Special text"; // from project setup

  const eurocodeText =
    dynamic.eurocodeText || "mentioned number and name of the Eurocode."; // dynamic later

  const projectNameId =
    dynamic.projectNameId || "Project name/ID – Project setup.";
  const mainContractorCustomer =
    dynamic.mainContractorCustomer ||
    "Main Contractor/Custumer – Project setup.";
  const idCaseNo = dynamic.idCaseNo || "ID/Case no. – Project setup.";
  const nameLine = dynamic.caseName || "Name – Project setup.";
  const addressLine = dynamic.caseAddress || "Address – Project setup.";
  const postCityLine = dynamic.postCityLine || "Post no./City – Project setup.";
  const cvrNoLine = dynamic.cvrNoLine || "CVR no. – Project setup.";
  const contactPerson =
    dynamic.contactPerson || "Contact person – Project setup.";
  const emailLine = dynamic.emailLine || "e-mail – Project setup.";
  const projectStartup =
    dynamic.projectStartup || "Project Start-up – Project setup.";
  const companyContact =
    dynamic.companyContact || "Company Contact – Project setup.";

  const documentType = dynamic.documentType || "STATIC INSPECTION REPORT";
  const documentVersion = dynamic.documentVersion || "1";
  const constructionClass = dynamic.constructionClass || "KK3";

  // Signing section dynamic text
  const preparedRole = dynamic.preparedRole || "Prepared/approved by:";
  const preparedEnterprise = dynamic.preparedEnterprise || "Enterprise";
  const preparedAdminOrg =
    dynamic.preparedAdminOrg || "Admin – company organization";
  const preparedOwnCompanyOrg =
    dynamic.preparedOwnCompanyOrg || "Own company – company organization";

  const ocEnterprise = dynamic.ocEnterprise || "Enterprise";
  const ocProjectManagerOrg =
    dynamic.ocProjectManagerOrg || "Project manager – company organization";
  const ocOwnCompanyOrg =
    dynamic.ocOwnCompanyOrg || "Own company – company organization";

  const icEnterprise = dynamic.icEnterprise || "Enterprise";
  const icOrg = dynamic.icOrg || "company organization";

  let y = M.t;

  // -------------------------------------------------------
  // 1) TOP HEADING BAR: STATIC INSPECTION REPORT
  // -------------------------------------------------------
  y = drawSectionBar(doc, y, "STATIC INSPECTION REPORT");
  y += 4;

  // -------------------------------------------------------
  // 2) INTRO TEXT (DS1140 + EUROCODE)
  // -------------------------------------------------------
  doc.font("Helvetica").fontSize(9).fillColor("black");

  doc.text("For load-bearing structures, cf. DS1140 applies to:", M.l, y, {
    width: CONTENT_W,
    align: "left",
  });
  y = doc.y + 4;

  doc.text(`Construction part  ${constructionPart}`, M.l, y, {
    width: CONTENT_W,
    align: "left",
  });
  y = doc.y + 8;

  doc.text(
    "The control plan is built according to the current EU standard:",
    M.l,
    y,
    {
      width: CONTENT_W,
      align: "left",
    }
  );
  y = doc.y + 4;

  doc.text(`Eurocode  ${eurocodeText}`, M.l, y, {
    width: CONTENT_W,
    align: "left",
  });

  y = doc.y + 18;

  // -------------------------------------------------------
  // 3) CONSTRUCTION CASE – BLUE BAR HEADING
  // -------------------------------------------------------
  y = drawSectionBar(doc, y, "CONSTRUCTION CASE:");
  y += 6;

  // 2-column “info” table with ONLY bottom lines
  const labelX = M.l;
  const valueX = M.l + CONTENT_W * 0.4;
  const lineWidth = CONTENT_W * 0.85;
  const rowHeight = 16;

  function drawCaseRow(label, value) {
    doc.font("Helvetica").fontSize(9).fillColor("black");

    // Label
    doc.text(label, labelX, y, {
      width: valueX - labelX - 8,
      align: "left",
    });

    // Value
    doc.text(value, valueX, y, {
      width: M.l + lineWidth - valueX,
      align: "left",
    });

    // Bottom border
    const lineY = y + rowHeight - 2;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(M.l, lineY)
      .lineTo(M.l + lineWidth, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  }

  drawCaseRow("Project name/ID", projectNameId);
  drawCaseRow("Main Contractor/Custumer", mainContractorCustomer);
  drawCaseRow("ID/Case no.", idCaseNo);
  drawCaseRow("Name", nameLine);
  drawCaseRow("Address", addressLine);
  drawCaseRow("Post no./City", postCityLine);
  drawCaseRow("CVR no.", cvrNoLine);
  drawCaseRow("Contact person", contactPerson);
  drawCaseRow("e-mail", emailLine);
  drawCaseRow("Project Start-up", projectStartup);
  drawCaseRow("Company Contact", companyContact);

  y += 14;

  // -------------------------------------------------------
  // 4) DOCUMENT TYPE / VERSION / CONSTRUCTION CLASS TABLE
  //    (still part of CONSTRUCTION CASE section)
  // -------------------------------------------------------
  const docTableX = M.l;
  const col1W = CONTENT_W * 0.45;
  const col2W = CONTENT_W * 0.18;
  const col3W = CONTENT_W * 0.25;
  const tableRowH = 16;

  // Header row (no blue bar, just text + bottom line)
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text("DOCUMENT TYPE:", docTableX, y, {
      width: col1W,
      align: "left",
    });

  doc.text("VERSION", docTableX + col1W, y, {
    width: col2W,
    align: "left",
  });

  doc.text("CONSTRUCTION CLASS", docTableX + col1W + col2W, y, {
    width: col3W,
    align: "left",
  });

  // Bottom line header
  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .moveTo(docTableX, y + tableRowH - 2)
    .lineTo(docTableX + col1W + col2W + col3W, y + tableRowH - 2)
    .stroke()
    .restore();

  y += tableRowH;

  // Value row
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text(documentType, docTableX, y, {
      width: col1W,
      align: "left",
    });

  doc.text(documentVersion, docTableX + col1W, y, {
    width: col2W,
    align: "left",
  });

  doc.text(constructionClass, docTableX + col1W + col2W, y, {
    width: col3W,
    align: "left",
  });

  // Bottom line value
  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .moveTo(docTableX, y + tableRowH - 2)
    .lineTo(docTableX + col1W + col2W + col3W, y + tableRowH - 2)
    .stroke()
    .restore();

  y += tableRowH + 18;

  // -------------------------------------------------------
  // 5) SIGNING – BLUE BAR HEADING
  // -------------------------------------------------------
  y = drawSectionBar(doc, y, "SIGNING");
  y += 6;

  // Three simple 3-column tables stacked vertically
  const sigTableX = M.l;
  const sigColW = CONTENT_W / 3;
  const sigRowH = 16;

  function drawSignatureTable(roleText, enterpriseText, orgLeft, orgRight) {
    doc.font("Helvetica").fontSize(9).fillColor("black");

    // Row 1: Signed | Role | Enterprise
    let rowY = y;

    doc.text("Signed", sigTableX, rowY, {
      width: sigColW,
      align: "left",
    });

    doc.text(roleText, sigTableX + sigColW, rowY, {
      width: sigColW,
      align: "left",
    });

    doc.text(enterpriseText, sigTableX + sigColW * 2, rowY, {
      width: sigColW,
      align: "left",
    });

    // Bottom line of row 1
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(sigTableX, rowY + sigRowH - 2)
      .lineTo(sigTableX + sigColW * 3, rowY + sigRowH - 2)
      .stroke()
      .restore();

    // Row 2: [Select Date] | OrgLeft | OrgRight
    rowY += sigRowH;

    doc.text("[Select Date]", sigTableX, rowY, {
      width: sigColW,
      align: "left",
    });

    doc.text(orgLeft, sigTableX + sigColW, rowY, {
      width: sigColW,
      align: "left",
    });

    doc.text(orgRight || "", sigTableX + sigColW * 2, rowY, {
      width: sigColW,
      align: "left",
    });

    // Bottom line of row 2
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(sigTableX, rowY + sigRowH - 2)
      .lineTo(sigTableX + sigColW * 3, rowY + sigRowH - 2)
      .stroke()
      .restore();

    y = rowY + sigRowH + 10;
  }

  // 1) Prepared/approved by
  drawSignatureTable(
    preparedRole,
    preparedEnterprise,
    preparedAdminOrg,
    preparedOwnCompanyOrg
  );

  // 2) Own control (OC)
  drawSignatureTable(
    "Own control (OC)",
    ocEnterprise,
    ocProjectManagerOrg,
    ocOwnCompanyOrg
  );

  // 3) Independent Controller (IC)
  drawSignatureTable("Independent Controller (IC)", icEnterprise, icOrg, "");

  // FOOTER: logical page 1 of 24 (this is Side 1 af 24 in your Danish footer)
  footer(doc, 1);
}

// PAGE 3 – Document completion status
// PAGE 3 – Document completion status (Side 2 af 24)
function page3(doc, dynamic) {
  let y = M.t;

  // -------------------------------------------------------
  // 1) HEADING BAR: Document completion status
  // -------------------------------------------------------
  y = drawSectionBar(doc, y, "Document completion status");
  y += 8;

  // -------------------------------------------------------
  // 2) MAIN TEXT (left side)
  // -------------------------------------------------------
  const leftColX = M.l;
  const leftColW = CONTENT_W * 0.6;

  doc.font("Helvetica").fontSize(9).fillColor("black");

  doc.text(
    "The figure to the right from SBI 271 Item 4.3 indicates which phase you are in in your document submissions, and must also help to ensure that both the contractor and the consultant work proactively to communicate back and forth in connection with any corrections.",
    leftColX,
    y,
    {
      width: leftColW,
      align: "left",
      lineGap: 2,
    }
  );

  y = doc.y + 8;

  doc.text(
    "The document is signed when this has been approved by the structural engineer, until then the document is a dynamic document.",
    leftColX,
    y,
    {
      width: leftColW,
      align: "left",
      lineGap: 2,
    }
  );

  y = doc.y + 14;

  // Expected approval time line
  doc.text(
    "Expected approval time 14 days, after which the content of the document is considered approved.",
    leftColX,
    y,
    {
      width: leftColW,
      align: "left",
      lineGap: 2,
    }
  );

  // -------------------------------------------------------
  // 3) RIGHT-SIDE FIGURE BOX (SBI 271 graphic placeholder)
  // -------------------------------------------------------
  const figX = leftColX + leftColW + 20;
  const figY = M.t + 40;
  const figW = CONTENT_W - (figX - M.l);
  const figH = 120;

  doc
    .save()
    .lineWidth(1)
    .strokeColor(BORDER_COLOR)
    .rect(figX, figY, figW, figH)
    .stroke()
    .restore();

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("black")
    .text(
      "Figure from SBI 271\nItem 4.3\n(Document phase indicator)",
      figX + 6,
      figY + 6,
      {
        width: figW - 12,
        align: "left",
        lineGap: 2,
      }
    );

  // -------------------------------------------------------
  // 4) STATUS BLOCK NEAR BOTTOM RIGHT
  // -------------------------------------------------------
  const statusLabel = dynamic.statusLabel || "Status: Approval PFASE";
  const statusDate = dynamic.statusDate || "18-11-2025";
  const statusText = dynamic.statusText || "APPROVED";

  const statusBlockWidth = CONTENT_W * 0.5;
  const statusX = M.l + CONTENT_W - statusBlockWidth;
  const statusY = PAGE.h - M.b - 80;

  // first line: Status: Approval PFASE
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(statusLabel, statusX, statusY, {
      width: statusBlockWidth,
      align: "left",
    });

  // second line: date + APPROVED
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`${statusDate}   ${statusText}`, statusX, doc.y + 6, {
      width: statusBlockWidth,
      align: "left",
    });

  // -------------------------------------------------------
  // 5) FOOTER – Side 2 af 24
  // -------------------------------------------------------
  footer(doc, 2);
}

// PAGE 4 – Content table
// PAGE 4 – Content (Side 3 af 24)
function page4(doc, dynamic) {
  let y = M.t;

  // ---- Heading: Content ----
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(BORDER_COLOR)
    .text("Content", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 12;

  /**
   * Safe helper: draws ONE TOC line and returns updated y
   * label  = left text
   * pageNo = right page number
   * level  = indent level (0,1,...)
   */
  function drawTocLineSafe(doc, y, label, pageNo, level) {
    const txt = label || "";
    const pageTxt = pageNo != null ? String(pageNo) : "";
    const fontSize = 9;
    const lineGap = 2;

    const indentX = M.l + (level || 0) * 18;
    const pageColX = M.l + CONTENT_W - 20; // where page number sits

    doc.font("Helvetica").fontSize(fontSize).fillColor("black");

    // draw label
    doc.text(txt, indentX, y, {
      width: pageColX - indentX - 24,
      align: "left",
    });

    // draw page number
    doc.text(pageTxt, pageColX, y, {
      width: 20,
      align: "right",
    });

    // dotted leader line between label and page number
    const labelWidth = doc.widthOfString(txt);
    let dotStart = indentX + labelWidth + 4;
    const dotEnd = pageColX - 8;

    if (dotStart < dotEnd) {
      doc
        .save()
        .lineWidth(0.5)
        .dash(1, { space: 2 })
        .moveTo(dotStart, y + fontSize)
        .lineTo(dotEnd, y + fontSize)
        .stroke()
        .undash()
        .restore();
    }

    return y + fontSize + lineGap + 2;
  }

  // ---- TOC items exactly as in your template ----
  const tocItems = [
    { label: "Static inspection report", page: 1, level: 0 },
    { label: "Construction part Special text", page: 1, level: 0 },
    { label: "Eurocode", page: 1, level: 0 },
    { label: "Signing:", page: 1, level: 0 },

    { label: "1. Generally", page: 4, level: 0 },
    { label: "1.1 Structure of the report", page: 4, level: 1 },
    { label: "1.2 Description of the Control Work", page: 4, level: 1 },
    { label: "1.3 Organisation of the control work", page: 4, level: 1 },
    { label: "1.4 Inspectors associated with", page: 4, level: 1 },
    {
      label: "1.5 Explanation of the use of assistant inspectors",
      page: 4,
      level: 1,
    },
    { label: "1.6 Significant deviations", page: 4, level: 1 },

    { label: "2. Documentation of general controls", page: 5, level: 0 },
    { label: "2.1 General", page: 5, level: 1 },
    { label: "2.3 Control Types/Levels", page: 5, level: 1 },

    {
      label: "3. List of selected Construction and execution classes",
      page: 6,
      level: 0,
    },
    {
      label: "3.1 Construction and execution classes selected.",
      page: 6,
      level: 1,
    },

    { label: "4. Documentation Special Controls", page: 6, level: 0 },
    { label: "4.1 General", page: 6, level: 1 },
    { label: "4.2 Special control points", page: 6, level: 1 },

    { label: "5. Follow-up on deviations", page: 6, level: 0 },
    { label: "5.1 Handling of any deviations B7", page: 6, level: 1 },

    {
      label: "6. Control points selected in the Control Plan",
      page: 7,
      level: 0,
    },

    {
      label:
        "7. Control carried out of the items in the Control Plan/checklist",
      page: 8,
      level: 0,
    },
    {
      label: "7.1 Verification of the basis for execution from design B1",
      page: 8,
      level: 1,
    },
    {
      label: "7.2 Verification of the basis for execution of the work B2",
      page: 8,
      level: 1,
    },
    {
      label: "7.3 Checking documentation of materials and products B3",
      page: 8,
      level: 1,
    },
    {
      label: "7.4 Receive control of deliveries B4",
      page: 9,
      level: 1,
    },
    {
      label: "7.5 Execution control B5",
      page: 9,
      level: 1,
    },
    {
      label: "7.6 Final Check B6",
      page: 9,
      level: 1,
    },

    {
      label: "8.A OWN CONTROL REGISTRATIONS/DOCUMENTATION/PHOTOS, CF. SECTION",
      page: 10,
      level: 0,
    },
    {
      label: "8.B EXTERNAL CONTROL REPORT",
      page: 13,
      level: 0,
    },
    {
      label: "8.5 STATEMENT ANNEXES",
      page: 17,
      level: 0,
    },

    {
      label: "9. KONTROLPUNKT OVERVIEW",
      page: 18,
      level: 0,
    },
    {
      label: "7.1 Review of the execution basis from the design B1",
      page: 19,
      level: 0,
    },
    {
      label: "7.2 Verification of the basis for execution of the work",
      page: 20,
      level: 0,
    },
    {
      label: "7.3 Verification of Documentation of Materials and Products",
      page: 21,
      level: 0,
    },
    {
      label: "7.4 RECEIPT CONTROL DELIVERIES B4",
      page: 22,
      level: 0,
    },
    {
      label: "7.5 PERFORMANCE CONTROL; B5",
      page: 23,
      level: 0,
    },
    {
      label: "7.6. FINAL check B6",
      page: 24,
      level: 0,
    },
  ];

  tocItems.forEach((item) => {
    y = drawTocLineSafe(doc, y, item.label, item.page, item.level);
  });

  // Footer – this is Side 3 af 24
  footer(doc, 3);
}

// PAGE 5 – 1. GENERALLY
// PAGE 5 – 1. GENERALLY (Side 4 af 24)
function page5(doc, dynamic) {
  const specialText = dynamic.specialText || "Special text";

  const BLUE = HEADING_COLOR; // #003b71
  const PARA = "#3a3a3a";
  const GRID = "#6f6f6f";
  const RED = "#cc0000";
  const YELLOW = "#fff176";

  let y = M.t;

  // -------------------------------
  // Top blue bar: "1. GENERALLY"
  // -------------------------------
  const barH = 20;
  doc.save().rect(M.l, y, CONTENT_W, barH).fill(BLUE).restore();

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("white")
    .text("1.", M.l + 10, y + 4, { width: 30, align: "left" });

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("white")
    .text("GENERALLY", M.l + 55, y + 4, {
      width: CONTENT_W - 65,
      align: "left",
    });

  y += barH + 14;

  // -------------------------------
  // Helpers
  // -------------------------------
  const h = (title) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(BLUE)
      .text(title, M.l, y, { width: CONTENT_W, align: "left" });
    y = doc.y + 6;
  };

  const p = (text, gap = 10) => {
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(PARA)
      .text(text, M.l, y, { width: CONTENT_W, align: "left", lineGap: 2 });
    y = doc.y + gap;
  };

  const cell = (x, yy, w, hgt, text, opts = {}) => {
    const fill = opts.fill;
    const align = opts.align || "left";
    const bold = !!opts.bold;
    const color = opts.color || "black";
    const fs = opts.fs || 9;
    const pad = opts.pad == null ? 6 : opts.pad;

    if (fill) {
      doc.save().fillColor(fill).rect(x, yy, w, hgt).fill().restore();
    }

    doc
      .save()
      .lineWidth(0.8)
      .strokeColor(GRID)
      .rect(x, yy, w, hgt)
      .stroke()
      .restore();

    if (text != null && String(text).length) {
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(fs)
        .fillColor(color)
        .text(String(text), x + pad, yy + 4, {
          width: w - pad * 2,
          align,
        });
    }
  };

  // -------------------------------
  // 1.1
  // -------------------------------
  h("1.1  Structure of the report");
  p(
    "This inspection report is structured, cf. SBI Guideline 271 (3rd edition 2020), Table 15.",
    16
  );

  // -------------------------------
  // 1.2
  // -------------------------------
  h("1.2  Description of the Control Work");
  p(
    "The general inspection has been carried out in accordance with DS/EN 1990 DK NA, Annex B5, DS 1140 and associated execution standards and is documented in accordance with SBI 271 and forms the basis for this inspection report.",
    18
  );

  // -------------------------------
  // 1.3
  // -------------------------------
  h("1.3  Organisation of the control work");
  p(
    `The executing contractor carries out his contract for a Main or Turnkey Contractor and only submits the report for his ${specialText} on this case.`,
    10
  );
  p(
    "The self-monitoring has been carried out by the individual performer or a designated person from the company on the work in question, name appears on page 2.",
    10
  );
  p(
    "The independent inspection has been carried out in accordance with the requirements specified in DS/EN 1990 DK NA, Annex B5.",
    6
  );
  p("The associated inspectors will be stated below in section 1.4", 8);

  // --- Table under 1.3 (Applier/Name/Education/Experience/Initials) ---
  const tX = M.l;
  const c1 = 110; // Applier
  const c2 = 140; // Name
  const c3 = 130; // Education
  const c4 = 75; // Experience
  const c5 = CONTENT_W - (c1 + c2 + c3 + c4); // Initials (rest)

  const headH = 16;
  const rowH = 18;

  // header row (Education + Experience highlighted yellow)
  cell(tX + 0, y, c1, headH, "Applier", { fill: LIGHT_GREY, fs: 9 });
  cell(tX + c1, y, c2, headH, "Name", { fill: LIGHT_GREY, fs: 9 });
  cell(tX + c1 + c2, y, c3, headH, "Education", { fill: LIGHT_GREY, fs: 9 });
  cell(tX + c1 + c2 + c3, y, c4, headH, "Experience", {
    fill: LIGHT_GREY,
    fs: 9,
  });
  cell(tX + c1 + c2 + c3 + c4, y, c5, headH, "Initials", {
    fill: LIGHT_GREY,
    fs: 9,
  });

  y += headH;

  // row 1
  cell(tX + 0, y, c1, rowH, "Own Controller", { fs: 9.2, color: PARA });
  cell(tX + c1, y, c2, rowH, "From Company organisation", {
    fs: 9.2,
    color: RED,
  });
  cell(tX + c1 + c2, y, c3, rowH, "", {});
  cell(tX + c1 + c2 + c3, y, c4, rowH, "", {});
  cell(tX + c1 + c2 + c3 + c4, y, c5, rowH, "OC", {
    fs: 9.2,
    color: RED,
  });

  y += rowH;

  // row 2
  cell(tX + 0, y, c1, rowH, "Independent controller", { fs: 9.2, color: PARA });
  cell(tX + c1, y, c2, rowH, "From Company organisation", {
    fs: 9.2,
    color: RED,
  });
  cell(tX + c1 + c2, y, c3, rowH, "", {});
  cell(tX + c1 + c2 + c3, y, c4, rowH, "", {});
  cell(tX + c1 + c2 + c3 + c4, y, c5, rowH, "IC Fixed", {
    fs: 9.2,
    color: RED,
  });

  y += rowH + 14;

  // -------------------------------
  // 1.4
  // -------------------------------
  const h14Y = y;
  h("1.4  Inspectors associated with");

  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(PARA)
    .text(
      "There are the following inspectors on the specific project:",
      M.l,
      y,
      {
        width: CONTENT_W,
        align: "left",
      }
    );

  y = doc.y + 8;

  // Red callout box on the right

  // 1.4 table (NAME / COMPANY / INSPECTOR TYPE)
  const t2X = M.l;
  const t2HeadH = 16;
  const t2RowH = 20;

  const tc1 = CONTENT_W * 0.38;
  const tc2 = CONTENT_W * 0.34;
  const tc3 = CONTENT_W - tc1 - tc2;

  cell(t2X + 0, y, tc1, t2HeadH, "NAME", { fill: LIGHT_GREY, fs: 9 });
  cell(t2X + tc1, y, tc2, t2HeadH, "COMPANY", { fill: LIGHT_GREY, fs: 9 });
  cell(t2X + tc1 + tc2, y, tc3, t2HeadH, "INSPECTOR TYPE", {
    fill: LIGHT_GREY,
    fs: 9,
  });

  y += t2HeadH;

  cell(t2X + 0, y, tc1, t2RowH, "Independet controler name IF any", {
    color: RED,
    fs: 10,
  });
  cell(t2X + tc1, y, tc2, t2RowH, "", { fs: 10 });
  cell(t2X + tc1 + tc2, y, tc3, t2RowH, "Independet control.", {
    color: PARA,
    fs: 10,
  });

  y += t2RowH + 14;

  // -------------------------------
  // 1.5
  // -------------------------------
  h("1.5  Explanation of the use of assistant inspectors");
  p(
    "Where co-inspectors have been used, these are listed under section 1.4.",
    10
  );
  p(
    "For practical reasons, an assistant inspector is most often used, as this is the optimal workflow in the executing company's process for independent control.",
    10
  );
  p(
    "If an inspector makes use of co-inspectors, he or she follows up on the inspection carried out by co-inspectors and ensures that the inspection has been carried out sensibly by checking the documentation for the inspection and signs this as the responsible inspector.",
    10
  );
  p(
    "The responsibility for the independent verification lies with the appointed independent auditor, who ensures that the overall documentation is consistent.",
    16
  );

  // -------------------------------
  // 1.6
  // -------------------------------
  h("1.6 Significant deviations");
  p(
    "If there are deviations, these will be registered separately and be included in the contract under clause: B7\nA so-called deviation note will be prepared separately.",
    0
  );

  // Footer – Side 4 af 24
  footer(doc, 4);
}

// PAGE 6 – 2. DOCUMENTATION OF GENERAL CONTROLS
// PAGE 6 – 2. DOCUMENTATION OF GENERAL CONTROLS  (Side 5 af 24)
function page6(doc, dynamic) {
  const specialText = dynamic.specialText || "Special text";

  const BLUE = HEADING_COLOR; // #003b71
  const PARA = "#5a5a5a";
  const GRID = "#2f2f2f";
  const HEAD_BG = "#d9d9d9";
  const NOTE_BG = "#fff176";
  const NOTE_RED = "#cc0000";
  const BEIGE = "#efe9d7";

  let y = M.t;

  // --- Top blue bar title ---
  y = drawSectionBar(doc, y, "2. DOCUMENTATION OF GENERAL CONTROLS");
  y += 4;

  // helpers
  const sectionTitle = (t) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(BLUE)
      .text(t, M.l, y, { width: CONTENT_W, align: "left" });
    y = doc.y + 6;
  };

  const para = (t, gap = 12) => {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(PARA)
      .text(t, M.l, y, { width: CONTENT_W, align: "left", lineGap: 3 });
    y = doc.y + gap;
  };

  const drawCell = (x, yy, w, h, text, opts = {}) => {
    if (opts.fill) {
      doc.save().fillColor(opts.fill).rect(x, yy, w, h).fill().restore();
    }
    doc
      .save()
      .lineWidth(0.8)
      .strokeColor(GRID)
      .rect(x, yy, w, h)
      .stroke()
      .restore();

    if (text != null && String(text).length) {
      doc
        .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(opts.fs || 9.5)
        .fillColor(opts.color || "black")
        .text(String(text), x + (opts.pad ?? 8), yy + 4, {
          width: w - (opts.pad ?? 8) * 2,
          align: opts.align || "left",
        });
    }
  };

  const drawCheck = (x, yy, size = 8) => {
    // simple vector check ✓
    doc
      .save()
      .lineWidth(1.4)
      .strokeColor(PARA)
      .moveTo(x, yy + size * 0.6)
      .lineTo(x + size * 0.35, yy + size)
      .lineTo(x + size, yy)
      .stroke()
      .restore();
  };

  // -------------------------
  // 2.1 General
  // -------------------------
  sectionTitle("2.1 General");
  para(
    "The general inspection is carried out in accordance with DS 1140. In addition, the general control is carried out in accordance with the rules of DS/EN 1992-DS/EN 1999 including the associated national annexes and in accordance with the rules of the related execution standards including the corresponding national application documents.",
    18
  );

  para(
    `The general inspection is carried out in accordance with the submitted inspection plan for the present ${specialText}  and the associated control plan from the contractor's company, which is stated on page 1 of the report.`,
    12
  );

  // -------------------------
  // 2.2 Standards (yellow highlight + red underline note)
  // -------------------------
  sectionTitle("2.2 Standards");

  const note =
    "This section is taken from the Eurocode table here we need an extra field with a static text talking about which standards covering the chosen EUROCODE.";
  doc.font("Helvetica-Bold").fontSize(10.5);

  const noteH = doc.heightOfString(note, { width: CONTENT_W, lineGap: 3 });
  doc
    .save()
    .fillColor(NOTE_BG)
    .rect(M.l, y - 1, CONTENT_W, noteH + 6)
    .fill()
    .restore();

  // red text
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(NOTE_RED)
    .text(note, M.l, y + 2, { width: CONTENT_W, lineGap: 3 });

  // simple underline (approx under whole block)
  const underlineY = y + noteH + 4;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(NOTE_RED)
    .moveTo(M.l, underlineY)
    .lineTo(M.l + CONTENT_W, underlineY)
    .stroke()
    .restore();

  y = doc.y + 16;

  // -------------------------
  // 2.3 Control Types/Levels
  // -------------------------
  sectionTitle("2.3 Control Types/Levels");

  para(
    "The type of control is determined by who performs the execution check. A distinction is made between three types of controls:",
    6
  );

  // bullet list with checks
  const bx = M.l + 10;
  const tx = M.l + 40;

  const item = (t) => {
    drawCheck(bx, y + 4, 9);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("black")
      .text(t, tx, y, {
        width: CONTENT_W - (tx - M.l),
        align: "left",
      });
    y = doc.y + 4;
  };

  item("Self-monitoring");
  item("Independent control");
  item("Third-Party Control.");

  y += 6;

  para(
    "The requirements are defined in DS1140, (Danish standard 2019a) and the Construction Designers have defined which Construction class and execution class must be made documentation according to.",
    12
  );

  // label
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(PARA)
    .text("Construction classes", M.l, y, { continued: true });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(PARA)
    .text(" (early designations CC1-CC2-CC3-CC4)", { continued: false });

  y = doc.y + 8;

  // -------------------------
  // Table 1: Construction classes
  // -------------------------
  const t1x = M.l;
  const t1w1 = CONTENT_W * 0.3;
  const t1w2 = CONTENT_W * 0.32;
  const t1w3 = CONTENT_W - t1w1 - t1w2;

  const hRow = 18;
  const rRow = 18;

  drawCell(t1x, y, t1w1, hRow, "CONSTRUCTION CLASS", {
    fill: HEAD_BG,
    color: BLUE,
    fs: 10,
  });
  drawCell(t1x + t1w1, y, t1w2, hRow, "INDEPENDENT CONTROL", {
    fill: HEAD_BG,
    color: BLUE,
    fs: 10,
    align: "center",
  });
  drawCell(t1x + t1w1 + t1w2, y, t1w3, hRow, "THIRD-PARTY CONTROLS", {
    fill: HEAD_BG,
    color: BLUE,
    fs: 10,
    align: "center",
  });

  y += hRow;

  const row = (kk, indep, third) => {
    drawCell(t1x, y, t1w1, rRow, kk, { fs: 10, color: PARA });
    drawCell(t1x + t1w1, y, t1w2, rRow, indep || "", {
      fs: 10,
      align: "center",
      color: PARA,
    });
    drawCell(t1x + t1w1 + t1w2, y, t1w3, rRow, third || "", {
      fs: 10,
      align: "center",
      color: PARA,
    });
    y += rRow;
  };

  row("KK1", "", "");
  row("KK2", "X", "");
  row("KK3", "X", "");
  row("KK4", "X", "X");

  y += 10;

  para(
    "As a general rule, general control of the execution of the performers is carried out, see SBI 271\nSection 6.6.1, Planning of general controls.",
    10
  );

  // -------------------------
  // Table 2: Performance classes vs Construction classes
  // -------------------------
  const t2x = M.l;
  const t2y = y;
  const t2w = CONTENT_W;

  const topH = 18;
  const head2H = 18;
  const rr = 18;

  const col0 = t2w * 0.22; // execution class
  const col = (t2w - col0) / 4; // KK1..KK4

  // Outer box (for the whole table area)
  const totalH = topH + head2H + rr * 3;
  doc
    .save()
    .lineWidth(0.8)
    .strokeColor(GRID)
    .rect(t2x, t2y, t2w, totalH)
    .stroke()
    .restore();

  // Top row (2 cells)
  drawCell(t2x, t2y, col0, topH, "Performance classes", {
    bold: true,
    fs: 10,
    color: PARA,
    pad: 6,
  });
  drawCell(t2x + col0, t2y, t2w - col0, topH, "Construction classes", {
    bold: true,
    fs: 10,
    color: PARA,
    align: "left",
    pad: 6,
  });

  // Header row (beige)
  const hy = t2y + topH;
  drawCell(t2x, hy, col0, head2H, "EXECUTION CLASS", {
    fill: BEIGE,
    fs: 9.5,
    color: BLUE,
  });
  drawCell(t2x + col0 + col * 0, hy, col, head2H, "KK1", {
    fill: BEIGE,
    fs: 9.5,
    color: BLUE,
    align: "center",
  });
  drawCell(t2x + col0 + col * 1, hy, col, head2H, "KK2", {
    fill: BEIGE,
    fs: 9.5,
    color: BLUE,
    align: "center",
  });
  drawCell(t2x + col0 + col * 2, hy, col, head2H, "KK3", {
    fill: BEIGE,
    fs: 9.5,
    color: BLUE,
    align: "center",
  });
  drawCell(t2x + col0 + col * 3, hy, col, head2H, "KK4", {
    fill: BEIGE,
    fs: 9.5,
    color: BLUE,
    align: "center",
  });

  // Data rows
  const r1y = hy + head2H;
  const drawPerfRow = (label, a, b, c, d, yy) => {
    drawCell(t2x, yy, col0, rr, label, { fs: 10, color: PARA });
    drawCell(t2x + col0 + col * 0, yy, col, rr, a || "", {
      fs: 11,
      color: PARA,
      align: "center",
    });
    drawCell(t2x + col0 + col * 1, yy, col, rr, b || "", {
      fs: 11,
      color: PARA,
      align: "center",
    });
    drawCell(t2x + col0 + col * 2, yy, col, rr, c || "", {
      fs: 11,
      color: PARA,
      align: "center",
    });
    drawCell(t2x + col0 + col * 3, yy, col, rr, d || "", {
      fs: 11,
      color: PARA,
      align: "center",
    });
  };

  drawPerfRow("EXC1", "+", "(+)", "", "", r1y);
  drawPerfRow("EXC2", "(+)", "+", "(+)", "(+)", r1y + rr);
  drawPerfRow("EXC3", "", "(+)", "+", "+", r1y + rr * 2);

  y = t2y + totalH + 14;

  // bottom explanation bullets
  para(
    "Performance classes indicate the importance of the design for the safety of a load-bearing structure:",
    6
  );

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(PARA)
    .text(
      "– EXC1: The design has limited impact on the safety of a load-bearing structure",
      M.l,
      y,
      {
        width: CONTENT_W,
        lineGap: 3,
      }
    );
  y = doc.y + 4;

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(PARA)
    .text(
      "– EXC2: The execution is important for the safety of a load-bearing structure",
      M.l,
      y,
      {
        width: CONTENT_W,
        lineGap: 3,
      }
    );
  y = doc.y + 10;

  // Footer – Side 5 af 24
  footer(doc, 5);
}

// PAGE 7 – 3.1, 4, 5 sections
// PAGE 7 – 3 + 4 + 5 sections  (Side 6 af 24)
function page7(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const GREY_TXT = "#5a5a5a";
  const LIGHT_LINE = "#bfbfbf";
  const TABLE_HEAD_BG = LIGHT_GREY;
  const RED = "#cc0000";

  const constructionPart = dynamic.constructionPart || "Special text";
  const docId = dynamic.documentId || "B3.Xnumber";
  const constructionClass = dynamic.constructionClass || "KK3";
  const executionClass = dynamic.executionClass || "EXC3";

  let y = M.t;

  // --- top note line (carry-over bullet line) ---
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(GREY_TXT)
    .text(
      "− EXC3: The design is of great importance for the safety of a load-bearing structure",
      M.l,
      y,
      { width: CONTENT_W, align: "left" }
    );
  y = doc.y + 10;

  // --- boxed footnote ---
  const boxText =
    "(+): Possible choices. Additional restrictions may be set in the DS/EN 1992-DS/EN 1999 series, including the\n" +
    "associated national annexes or in the associated execution standards, including the corresponding national\n" +
    "application documents.\n" +
    '1) For structures that are not covered by the Building Regulations, "construction classes" are replaced\n' +
    'textually by "consequence classes", where CC1 replaces KK1, CC2 replaces KK2, CC3 replaces KK3 and "CC3\n' +
    'covered by B4 KDK NA (4)" replaces KK4.';

  const boxH =
    doc.heightOfString(boxText, { width: CONTENT_W - 16, lineGap: 2 }) + 12;

  doc
    .save()
    .lineWidth(0.8)
    .strokeColor("#000")
    .rect(M.l, y, CONTENT_W, boxH)
    .stroke()
    .restore();
  doc
    .font("Helvetica")
    .fontSize(8.2)
    .fillColor(GREY_TXT)
    .text(boxText, M.l + 8, y + 6, { width: CONTENT_W - 16, lineGap: 2 });

  y = y + boxH + 12;

  // --- section 3 bar ---
  y = drawSectionBar(
    doc,
    y,
    "3. LIST OF SELECTED CONSTRUCTION AND EXECUTION CLASSES"
  );
  y -= 2;

  // 3.1 heading
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(BLUE)
    .text("3.1 Construction and execution classes selected.", M.l, y, {
      width: CONTENT_W,
      align: "left",
    });
  y = doc.y + 6;

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(GREY_TXT)
    .text(
      "Below, the building designer has indicated which classes have been determined from the project material.",
      M.l,
      y,
      { width: CONTENT_W, lineGap: 2 }
    );
  y = doc.y + 4;

  doc.text("These control sections are covered by the following:", M.l, y, {
    width: CONTENT_W,
    lineGap: 2,
  });
  y = doc.y + 8;

  // --- table helper (simple box table) ---
  const cell = (x, yy, w, h, text, opts = {}) => {
    if (opts.fill)
      doc.save().fillColor(opts.fill).rect(x, yy, w, h).fill().restore();
    doc
      .save()
      .lineWidth(0.6)
      .strokeColor(LIGHT_LINE)
      .rect(x, yy, w, h)
      .stroke()
      .restore();

    if (text != null && String(text).length) {
      doc
        .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(opts.fs || 8.3)
        .fillColor(opts.color || "black")
        .text(String(text), x + 6, yy + 4, {
          width: w - 12,
          align: opts.align || "left",
        });
    }
  };

  // --- 3.1 table (4 cols) ---
  const tX = M.l;
  const c1 = CONTENT_W * 0.22;
  const c2 = CONTENT_W * 0.44;
  const c3 = CONTENT_W * 0.17;
  const c4 = CONTENT_W - (c1 + c2 + c3);

  const headH = 16;
  const rowH = 18;

  cell(tX, y, c1, headH, "CONSTRUCTION PART", {
    fill: TABLE_HEAD_BG,
    bold: true,
  });
  cell(tX + c1, y, c2, headH, "DOCUMENT", { fill: TABLE_HEAD_BG, bold: true });
  cell(tX + c1 + c2, y, c3, headH, "CONSTRUCTION CLASS", {
    fill: TABLE_HEAD_BG,
    bold: true,
    align: "center",
  });
  cell(tX + c1 + c2 + c3, y, c4, headH, "EXECUTION CLASS", {
    fill: TABLE_HEAD_BG,
    bold: true,
    align: "center",
  });

  y += headH;

  cell(tX, y, c1, rowH, docId, { color: RED });
  cell(tX + c1, y, c2, rowH, "Static Control Report:");
  cell(tX + c1 + c2, y, c3, rowH, constructionClass, {
    color: RED,
    align: "center",
  });
  cell(tX + c1 + c2 + c3, y, c4, rowH, executionClass, {
    color: RED,
    align: "center",
  });

  y += rowH + 12;

  // --- section 4 bar ---
  y = drawSectionBar(doc, y, "4. DOCUMENTATION SPECIAL CONTROLS");
  y -= 2;

  // 4.1
  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(BLUE)
    .text("4.1 General", M.l, y, { width: CONTENT_W });
  y = doc.y + 4;

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(GREY_TXT)
    .text(
      "There are no special controls assigned by the building designers, cf.  This Special text .",
      M.l,
      y,
      {
        width: CONTENT_W,
        lineGap: 2,
      }
    );
  y = doc.y + 2;

  doc.text(
    "Should there be special controls, they will be stated in section 3.2",
    M.l,
    y,
    {
      width: CONTENT_W,
      lineGap: 2,
    }
  );
  y = doc.y + 10;

  // 4.2
  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(BLUE)
    .text("4.2 Special control points", M.l, y, { width: CONTENT_W });
  y = doc.y + 4;

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(GREY_TXT)
    .text("Cf. section 3.1, no special controls are required.", M.l, y, {
      width: CONTENT_W,
    });
  y = doc.y + 2;

  doc.text(
    "If there are special checks, it will be stated below in the form, otherwise there will be none.",
    M.l,
    y,
    { width: CONTENT_W }
  );
  y = doc.y + 8;

  // --- special controls small table ---
  const s1 = CONTENT_W * 0.18;
  const s2 = CONTENT_W * 0.18;
  const s3 = CONTENT_W * 0.46;
  const s4 = CONTENT_W - (s1 + s2 + s3);

  cell(tX, y, s1, headH, "CONTROL ID", { fill: TABLE_HEAD_BG, bold: true });
  cell(tX + s1, y, s2, headH, "SPECIAL CONTROL", {
    fill: TABLE_HEAD_BG,
    bold: true,
  });
  cell(tX + s1 + s2, y, s3, headH, "DESCRIPTION", {
    fill: TABLE_HEAD_BG,
    bold: true,
  });
  cell(tX + s1 + s2 + s3, y, s4, headH, "MADE BY:", {
    fill: TABLE_HEAD_BG,
    bold: true,
  });

  y += headH;

  cell(tX, y, s1, rowH, "If any special\ncontrols", { color: RED });
  cell(tX + s1, y, s2, rowH, "Show them here\nin overview", { color: RED });
  cell(
    tX + s1 + s2,
    y,
    s3,
    rowH,
    "AND AS A SUBLEMENTERY IN THE BUTTON OF THE REPORT.",
    { color: RED }
  );
  cell(tX + s1 + s2 + s3, y, s4, rowH, "");

  y += rowH + 14;

  // --- section 5 bar ---
  y = drawSectionBar(doc, y, "5. FOLLOW-UP ON DEVIATIONS");
  y -= 2;

  // 5.1 + B7 label
  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(BLUE)
    .text("5.1 Handling of any deviations", M.l, y, {
      width: CONTENT_W - 40,
      align: "left",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor("black")
    .text("B7", M.l, y, { width: CONTENT_W, align: "right" });

  y = doc.y + 6;

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(GREY_TXT)
    .text(
      "It is the Contractor's responsibility that the corrective action is carried out, and then that the independent\ninspector re-checks the deviations that may have occurred during the process.",
      M.l,
      y,
      { width: CONTENT_W, lineGap: 2 }
    );
  y = doc.y + 6;

  doc.text(
    "The list below shows in writing the registered deviations. If the list is empty, no one is registered.",
    M.l,
    y,
    { width: CONTENT_W }
  );
  y = doc.y + 6;

  // --- deviations table (3 cols, big body area) ---
  const d1 = CONTENT_W * 0.22;
  const d2 = CONTENT_W * 0.46;
  const d3 = CONTENT_W - (d1 + d2);

  const devHeadH = 16;
  const devBodyH = 160;

  cell(tX, y, d1, devHeadH, "DEVIATION ID", {
    fill: TABLE_HEAD_BG,
    bold: true,
  });
  cell(tX + d1, y, d2, devHeadH, "DESCRIPTION", {
    fill: TABLE_HEAD_BG,
    bold: true,
  });
  cell(tX + d1 + d2, y, d3, devHeadH, "LOCALIZATION PHOTO/TEXT", {
    fill: TABLE_HEAD_BG,
    bold: true,
  });

  y += devHeadH;

  // body outline + vertical lines
  doc
    .save()
    .lineWidth(0.6)
    .strokeColor(LIGHT_LINE)
    .rect(tX, y, CONTENT_W, devBodyH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(0.6)
    .strokeColor(LIGHT_LINE)
    .moveTo(tX + d1, y)
    .lineTo(tX + d1, y + devBodyH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(0.6)
    .strokeColor(LIGHT_LINE)
    .moveTo(tX + d1 + d2, y)
    .lineTo(tX + d1 + d2, y + devBodyH)
    .stroke()
    .restore();

  // top texts in body (red)
  doc.font("Helvetica").fontSize(8.5).fillColor(RED);
  doc.text("div_0x     [Select Date]", tX + 6, y + 6, { width: d1 - 12 });
  doc.text("Show an overwiev of the deviations", tX + d1 + 6, y + 6, {
    width: d2 - 12,
  });
  doc.text("Link.", tX + d1 + d2 + 6, y + 6, { width: d3 - 12 });

  y += devBodyH + 10;

  doc
    .font("Helvetica")
    .fontSize(8.2)
    .fillColor(GREY_TXT)
    .text(
      "The above is updated every time a deviation occurs in the execution.",
      M.l,
      y,
      {
        width: CONTENT_W,
      }
    );

  // Footer – Side 6 af 24
  footer(doc, 6);
}

// PAGE 8 – 6. CONTROL POINTS SELECTED IN THE CONTROL PLAN
// PAGE 8 – 6. CONTROL POINTS SELECTED IN THE CONTROL PLAN (Side 7 af 24)
function page8(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const GREY = "#5a5a5a";
  const LINE = "#bfbfbf";
  const RED = "#cc0000";

  const drawingName = dynamic.drawingName || "File name.";
  // optional: dynamic.drawingImagePath (local path) OR dynamic.drawingImageBuffer (Buffer)

  let y = M.t;

  y = drawSectionBar(doc, y, "6. CONTROL POINTS SELECTED IN THE CONTROL PLAN");
  y += 4;

  // OVERVIEW:
  doc
    .font("Helvetica-Bold")
    .fontSize(8.8)
    .fillColor(GREY)
    .text("OVERVIEW:", M.l, y, { width: CONTENT_W });
  y = doc.y + 6;

  // lines
  doc.font("Helvetica").fontSize(7.8).fillColor("black");
  doc.text("DRAWINGS INDICATING SELECTED INSPECTION POINTS:", M.l, y, {
    width: CONTENT_W,
  });
  y = doc.y + 6;

  // thin line
  doc
    .save()
    .lineWidth(0.6)
    .strokeColor(LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 6;

  // DRAWING NAME: File name.
  doc
    .font("Helvetica")
    .fontSize(7.8)
    .fillColor("black")
    .text("DRAWING NAME:", M.l, y, { continued: true });
  doc
    .font("Helvetica")
    .fontSize(7.8)
    .fillColor(RED)
    .text(drawingName, { continued: false });
  y = doc.y + 6;

  // thin line
  doc
    .save()
    .lineWidth(0.6)
    .strokeColor(LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 8;

  // big drawing rectangle
  const boxX = M.l;
  const boxY = y;
  const boxW = CONTENT_W;
  const boxH = 300;

  doc
    .save()
    .lineWidth(0.8)
    .strokeColor("#6f6f6f")
    .rect(boxX, boxY, boxW, boxH)
    .stroke()
    .restore();

  // placeholder red text
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(RED)
    .text("marked main drawing", boxX + 6, boxY + 6);

  // Optional draw image inside the box (if you have it later)
  // if (dynamic.drawingImagePath) {
  //   doc.image(dynamic.drawingImagePath, boxX + 10, boxY + 20, { fit: [boxW - 20, boxH - 30] });
  // } else if (dynamic.drawingImageBuffer) {
  //   doc.image(dynamic.drawingImageBuffer, boxX + 10, boxY + 20, { fit: [boxW - 20, boxH - 30] });
  // }

  y = boxY + boxH + 16;

  // paragraph lines (with ●)
  doc.font("Helvetica").fontSize(8.2).fillColor(GREY);
  doc.text(
    "Above there are points indicated ● where the executor has carried out checks in accordance with the control plan.",
    M.l,
    y,
    { width: CONTENT_W, lineGap: 2 }
  );
  y = doc.y + 18;

  doc.text(
    "The colours indicate the type of inspection that has been carried out and which relate to the points under Item 7",
    M.l,
    y,
    { width: CONTENT_W, lineGap: 2 }
  );
  y = doc.y + 4;

  doc.text("The colors below indicate which category they relate to.", M.l, y, {
    width: CONTENT_W,
  });

  // Footer – Side 7 af 24
  footer(doc, 7);
}

// PAGE 9 – 7. CONTROL CARRIED OUT ... B1–B3 tables
// PAGE 9 – 7. CONTROL CARRIED OUT ... (B1/B2/B3 tables)  (Side 8 af 24)
function page9(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const GREY = "#5a5a5a";
  const LINE = "#d9d9d9";
  const RED = "#cc0000";
  const GREEN = "#00b050";

  let y = M.t;

  y = drawSectionBar(
    doc,
    y,
    "7. CONTROL CARRIED OUT OF THE ITEMS IN THE CONTROL PLAN/CHE"
  );
  y += 6;

  const drawHeading = (left, rightLabel) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(BLUE)
      .text(left, M.l, y, {
        width: CONTENT_W - 40,
        align: "left",
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor("black")
      .text(rightLabel, M.l, y, {
        width: CONTENT_W,
        align: "right",
      });
    y = doc.y + 6;

    // underline
    doc
      .save()
      .lineWidth(0.8)
      .strokeColor("#999")
      .moveTo(M.l, y)
      .lineTo(M.l + CONTENT_W, y)
      .stroke()
      .restore();
    y += 8;
  };

  const drawTable = (rows) => {
    // column positions (no vertical borders; only row separators like PDF)
    const x = M.l;
    const wPOS = 40;
    const wDATE = 80;
    const wDESC = 170;
    const wSTATUS = 70;
    const wNOTE = 95;
    const wCTRL = CONTENT_W - (wPOS + wDATE + wDESC + wSTATUS + wNOTE);

    // header
    const headerY = y;
    doc.font("Helvetica-Bold").fontSize(7.2).fillColor(BLUE);
    doc.text("POS.", x, headerY, { width: wPOS });
    doc.text("DATE", x + wPOS, headerY, { width: wDATE });
    doc.text("DESCRIPTION", x + wPOS + wDATE, headerY, { width: wDESC });
    doc.text("STATUS", x + wPOS + wDATE + wDESC, headerY, { width: wSTATUS });
    doc.text("NOTE", x + wPOS + wDATE + wDESC + wSTATUS, headerY, {
      width: wNOTE,
    });
    doc.text(
      "CONTROL/ID",
      x + wPOS + wDATE + wDESC + wSTATUS + wNOTE,
      headerY,
      { width: wCTRL }
    );

    y = headerY + 14;
    doc
      .save()
      .lineWidth(0.8)
      .strokeColor(LINE)
      .moveTo(M.l, y)
      .lineTo(M.l + CONTENT_W, y)
      .stroke()
      .restore();
    y += 6;

    // rows
    doc.font("Helvetica").fontSize(7.2).fillColor(GREY);

    const rowH = 22;
    rows.forEach((r) => {
      const rowTop = y;

      doc.fillColor(GREY).text(r.pos, x, rowTop, { width: wPOS });
      doc
        .fillColor(GREY)
        .text("[Select Date]", x + wPOS, rowTop, { width: wDATE });

      doc.fillColor(GREY).text(r.desc, x + wPOS + wDATE, rowTop, {
        width: wDESC,
        lineGap: 1,
      });

      doc
        .fillColor(GREY)
        .text("Approved", x + wPOS + wDATE + wDESC, rowTop, { width: wSTATUS });
      doc
        .fillColor(GREY)
        .text("No comments", x + wPOS + wDATE + wDESC + wSTATUS, rowTop, {
          width: wNOTE,
        });

      doc
        .fillColor(GREY)
        .text(
          "Independent control of self-\nmonitoring.",
          x + wPOS + wDATE + wDESC + wSTATUS + wNOTE,
          rowTop,
          {
            width: wCTRL,
            lineGap: 1,
          }
        );

      // row separator
      y = rowTop + rowH;
      doc
        .save()
        .lineWidth(0.8)
        .strokeColor(LINE)
        .moveTo(M.l, y)
        .lineTo(M.l + CONTENT_W, y)
        .stroke()
        .restore();
      y += 4;
    });

    y += 10;
  };

  // --- 7.1 ---
  drawHeading("7.1 Verification of the basis for execution from design", "B1");

  doc
    .font("Helvetica")
    .fontSize(7.2)
    .fillColor(RED)
    .text(
      "B1 – b4 is fixed descriptions. Change date, status, show notes. Show control id.",
      M.l,
      y,
      { width: CONTENT_W }
    );
  y = doc.y + 8;

  drawTable([
    { pos: "7.1.1", desc: "Self-monitoring" },
    { pos: "7.1.2", desc: "Follow-up on project\nmaterial" },
    { pos: "7.1.3", desc: "Information" },
    { pos: "7.1.4", desc: "Buildability" },
    { pos: "7.1.5", desc: "Materials" },
  ]);

  // --- 7.2 ---
  drawHeading("7.2 Verification of the basis for execution of the work", "B2");

  drawTable([
    { pos: "7.2.1", desc: "Working drawings,\ninstructions, self-control" },
    {
      pos: "7.2.2",
      desc: "Working drawings,\ninstructions and assembly\nguides for buildability",
    },
    { pos: "7.2.3", desc: "Health and safety rules" },
    { pos: "7.2.4", desc: "Comprehension" },
    { pos: "7.2.5", desc: "Coordination" },
    { pos: "7.2.6", desc: "Interfaces" },
  ]);

  // --- 7.3 ---
  // heading with green dot
  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(BLUE)
    .text("7.3 Checking documentation of materials and products", M.l, y, {
      width: CONTENT_W - 60,
      align: "left",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor("black")
    .text("B3", M.l, y, {
      width: CONTENT_W - 18,
      align: "right",
    });

  // green dot
  const dotX = M.l + CONTENT_W - 8;
  const dotY = y + 6;
  doc.save().fillColor(GREEN).circle(dotX, dotY, 4).fill().restore();

  y = doc.y + 6;

  doc
    .save()
    .lineWidth(0.8)
    .strokeColor("#999")
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 8;

  drawTable([
    { pos: "7.3.1", desc: "Purchased materials and\nproducts" },
    {
      pos: "7.3.2",
      desc: "Materials and products\nmeet requirements in\nproject material",
    },
    { pos: "7.3.3", desc: "Specific materials." },
    {
      pos: "7.3.4",
      desc: "Additional components\nsuch as. pre-produced\nproducts to be included in\nthe construction",
    },
    {
      pos: "7.3.5",
      desc: "Selected parts covered by\nharmonised standard, etc.",
    },
  ]);

  // Footer – Side 8 af 24
  footer(doc, 8);
}

// PAGE 10 – 7.4–7.6 B4–B6 tables
// PAGE 9 – 7. CONTROL CARRIED OUT ... (B1/B2/B3 tables)  (Side 8 af 24)
function page9(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const GREY = "#5a5a5a";
  const LINE = "#d9d9d9";
  const RED = "#cc0000";
  const GREEN = "#00b050";

  let y = M.t;

  y = drawSectionBar(
    doc,
    y,
    "7. CONTROL CARRIED OUT OF THE ITEMS IN THE CONTROL PLAN/CHE"
  );
  y += 6;

  const drawHeading = (left, rightLabel) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(BLUE)
      .text(left, M.l, y, {
        width: CONTENT_W - 40,
        align: "left",
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor("black")
      .text(rightLabel, M.l, y, {
        width: CONTENT_W,
        align: "right",
      });
    y = doc.y + 6;

    // underline
    doc
      .save()
      .lineWidth(0.8)
      .strokeColor("#999")
      .moveTo(M.l, y)
      .lineTo(M.l + CONTENT_W, y)
      .stroke()
      .restore();
    y += 8;
  };

  const drawTable = (rows) => {
    // column positions (no vertical borders; only row separators like PDF)
    const x = M.l;
    const wPOS = 40;
    const wDATE = 80;
    const wDESC = 170;
    const wSTATUS = 70;
    const wNOTE = 95;
    const wCTRL = CONTENT_W - (wPOS + wDATE + wDESC + wSTATUS + wNOTE);

    // header
    const headerY = y;
    doc.font("Helvetica-Bold").fontSize(7.2).fillColor(BLUE);
    doc.text("POS.", x, headerY, { width: wPOS });
    doc.text("DATE", x + wPOS, headerY, { width: wDATE });
    doc.text("DESCRIPTION", x + wPOS + wDATE, headerY, { width: wDESC });
    doc.text("STATUS", x + wPOS + wDATE + wDESC, headerY, { width: wSTATUS });
    doc.text("NOTE", x + wPOS + wDATE + wDESC + wSTATUS, headerY, {
      width: wNOTE,
    });
    doc.text(
      "CONTROL/ID",
      x + wPOS + wDATE + wDESC + wSTATUS + wNOTE,
      headerY,
      { width: wCTRL }
    );

    y = headerY + 14;
    doc
      .save()
      .lineWidth(0.8)
      .strokeColor(LINE)
      .moveTo(M.l, y)
      .lineTo(M.l + CONTENT_W, y)
      .stroke()
      .restore();
    y += 6;

    // rows
    doc.font("Helvetica").fontSize(7.2).fillColor(GREY);

    const rowH = 22;
    rows.forEach((r) => {
      const rowTop = y;

      doc.fillColor(GREY).text(r.pos, x, rowTop, { width: wPOS });
      doc
        .fillColor(GREY)
        .text("[Select Date]", x + wPOS, rowTop, { width: wDATE });

      doc.fillColor(GREY).text(r.desc, x + wPOS + wDATE, rowTop, {
        width: wDESC,
        lineGap: 1,
      });

      doc
        .fillColor(GREY)
        .text("Approved", x + wPOS + wDATE + wDESC, rowTop, { width: wSTATUS });
      doc
        .fillColor(GREY)
        .text("No comments", x + wPOS + wDATE + wDESC + wSTATUS, rowTop, {
          width: wNOTE,
        });

      doc
        .fillColor(GREY)
        .text(
          "Independent control of self-\nmonitoring.",
          x + wPOS + wDATE + wDESC + wSTATUS + wNOTE,
          rowTop,
          {
            width: wCTRL,
            lineGap: 1,
          }
        );

      // row separator
      y = rowTop + rowH;
      doc
        .save()
        .lineWidth(0.8)
        .strokeColor(LINE)
        .moveTo(M.l, y)
        .lineTo(M.l + CONTENT_W, y)
        .stroke()
        .restore();
      y += 4;
    });

    y += 10;
  };

  // --- 7.1 ---
  drawHeading("7.1 Verification of the basis for execution from design", "B1");

  doc
    .font("Helvetica")
    .fontSize(7.2)
    .fillColor(RED)
    .text(
      "B1 – b4 is fixed descriptions. Change date, status, show notes. Show control id.",
      M.l,
      y,
      { width: CONTENT_W }
    );
  y = doc.y + 8;

  drawTable([
    { pos: "7.1.1", desc: "Self-monitoring" },
    { pos: "7.1.2", desc: "Follow-up on project\nmaterial" },
    { pos: "7.1.3", desc: "Information" },
    { pos: "7.1.4", desc: "Buildability" },
    { pos: "7.1.5", desc: "Materials" },
  ]);

  // --- 7.2 ---
  drawHeading("7.2 Verification of the basis for execution of the work", "B2");

  drawTable([
    { pos: "7.2.1", desc: "Working drawings,\ninstructions, self-control" },
    {
      pos: "7.2.2",
      desc: "Working drawings,\ninstructions and assembly\nguides for buildability",
    },
    { pos: "7.2.3", desc: "Health and safety rules" },
    { pos: "7.2.4", desc: "Comprehension" },
    { pos: "7.2.5", desc: "Coordination" },
    { pos: "7.2.6", desc: "Interfaces" },
  ]);

  // --- 7.3 ---
  // heading with green dot
  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(BLUE)
    .text("7.3 Checking documentation of materials and products", M.l, y, {
      width: CONTENT_W - 60,
      align: "left",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor("black")
    .text("B3", M.l, y, {
      width: CONTENT_W - 18,
      align: "right",
    });

  // green dot
  const dotX = M.l + CONTENT_W - 8;
  const dotY = y + 6;
  doc.save().fillColor(GREEN).circle(dotX, dotY, 4).fill().restore();

  y = doc.y + 6;

  doc
    .save()
    .lineWidth(0.8)
    .strokeColor("#999")
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 8;

  drawTable([
    { pos: "7.3.1", desc: "Purchased materials and\nproducts" },
    {
      pos: "7.3.2",
      desc: "Materials and products\nmeet requirements in\nproject material",
    },
    { pos: "7.3.3", desc: "Specific materials." },
    {
      pos: "7.3.4",
      desc: "Additional components\nsuch as. pre-produced\nproducts to be included in\nthe construction",
    },
    {
      pos: "7.3.5",
      desc: "Selected parts covered by\nharmonised standard, etc.",
    },
  ]);

  // Footer – Side 8 af 24
  footer(doc, 8);
}

// PAGE 10 – 7.4–7.6 B4–B6 tables (Side 9 af 24) - SAFE VERSION
// PAGE 10 – 7.4–7.6 B4–B6 tables (Side 9 af 24) - SAFE + COLORED DOTS
function page10(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const GREY = "#5a5a5a";
  const LINE = "#d9d9d9";
  const RED = "#cc0000";

  const DOT_B4 = "#FFBF00";
  const DOT_B5 = "#00AFEF";
  const DOT_B6 = "#BF0000";

  let y = M.t;

  const underline = () => {
    doc
      .save()
      .lineWidth(0.8)
      .strokeColor("#999")
      .moveTo(M.l, y)
      .lineTo(M.l + CONTENT_W, y)
      .stroke()
      .restore();
    y += 8;
  };

  const sectionHead = (titleLeft, rightLabel, dotColor) => {
    const startY = y;

    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(BLUE)
      .text(titleLeft || "", M.l, startY, {
        width: CONTENT_W - 70,
        align: "left",
      });

    if (rightLabel) {
      // keep a little space for the dot
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor("black")
        .text(String(rightLabel), M.l, startY, {
          width: CONTENT_W - 14,
          align: "right",
        });

      if (dotColor) {
        const dotX = M.l + CONTENT_W - 6; // near right edge
        const dotY = startY + 7; // vertically aligned with label
        doc.save().fillColor(dotColor).circle(dotX, dotY, 4).fill().restore();
      }
    }

    y = doc.y + 4;
    underline();
  };

  const redNote = (text) => {
    doc
      .font("Helvetica")
      .fontSize(7.6)
      .fillColor(RED)
      .text(text || "", M.l, y, { width: CONTENT_W, lineGap: 2 });
    y = doc.y + 10;
  };

  const drawListTable = (rows, opts = {}) => {
    rows = Array.isArray(rows) ? rows : [];
    const x = M.l;

    const wPOS = 45;
    const wDATE = 85;
    const wDESC = 175;
    const wSTATUS = 72;
    const wNOTE = 115;
    const wCTRL = Math.max(
      60,
      CONTENT_W - (wPOS + wDATE + wDESC + wSTATUS + wNOTE)
    );

    const headerY = y;

    doc.font("Helvetica-Bold").fontSize(7.2).fillColor(BLUE);
    doc.text("POS.", x, headerY, { width: wPOS });
    doc.text("DATE", x + wPOS, headerY, { width: wDATE });
    doc.text("DESCRIPTION", x + wPOS + wDATE, headerY, { width: wDESC });
    doc.text("STATUS", x + wPOS + wDATE + wDESC, headerY, { width: wSTATUS });
    doc.text("NOTE", x + wPOS + wDATE + wDESC + wSTATUS, headerY, {
      width: wNOTE,
    });
    doc.text(
      "CONTROL/ID",
      x + wPOS + wDATE + wDESC + wSTATUS + wNOTE,
      headerY,
      { width: wCTRL }
    );

    y = headerY + 14;
    doc
      .save()
      .lineWidth(0.8)
      .strokeColor(LINE)
      .moveTo(M.l, y)
      .lineTo(M.l + CONTENT_W, y)
      .stroke()
      .restore();
    y += 6;

    const rowH = opts.rowH || 22;
    doc.font("Helvetica").fontSize(7.2);

    rows.forEach((r) => {
      const top = y;

      doc.fillColor(GREY).text(String(r?.pos ?? ""), x, top, { width: wPOS });
      doc
        .fillColor(GREY)
        .text(String(r?.date ?? "[Select Date]"), x + wPOS, top, {
          width: wDATE,
        });

      doc.fillColor(GREY).text(String(r?.desc ?? ""), x + wPOS + wDATE, top, {
        width: wDESC,
        lineGap: 1,
      });
      doc
        .fillColor(GREY)
        .text(String(r?.status ?? ""), x + wPOS + wDATE + wDESC, top, {
          width: wSTATUS,
        });
      doc
        .fillColor(GREY)
        .text(String(r?.note ?? ""), x + wPOS + wDATE + wDESC + wSTATUS, top, {
          width: wNOTE,
          lineGap: 1,
        });
      doc
        .fillColor(GREY)
        .text(
          String(r?.ctrl ?? ""),
          x + wPOS + wDATE + wDESC + wSTATUS + wNOTE,
          top,
          { width: wCTRL, lineGap: 1 }
        );

      y = top + rowH;
      doc
        .save()
        .lineWidth(0.8)
        .strokeColor(LINE)
        .moveTo(M.l, y)
        .lineTo(M.l + CONTENT_W, y)
        .stroke()
        .restore();
      y += 4;
    });

    y += 10;
  };

  // ---- 7.4 / B4 (orange dot) ----
  sectionHead("7.4 Receive control of deliveries", "B4", DOT_B4);

  redNote(
    "B4 – B6 comes from the Excel sheets with the profession and Eurocode based controles. " +
      "State date, change description, show status, change note, state control ID."
  );

  drawListTable([
    {
      pos: "7.4.1",
      desc: "Reception control",
      status: "Approved",
      note: "Supplemented by inspection of selected\nparts",
      ctrl: "Independent control of self-\nmonitoring.",
    },
    {
      pos: "7.4.2",
      desc: "Delivery notes",
      status: "Approved",
      note: "Supplemented by inspection of selected\nparts",
      ctrl: "Independent control of self-\nmonitoring.",
    },
    {
      pos: "7.4.3",
      desc: "Supplies strength control",
      status: "Approved",
      note: "Supplemented by inspection of selected\nparts",
      ctrl: "Independent control of self-\nmonitoring.",
    },
  ]);

  // ---- 7.5 / B5 (blue dot) ----
  sectionHead("7.5 Execution control", "B5", DOT_B5);

  drawListTable([
    {
      pos: "7.5.1",
      desc: "",
      status: "Approved",
      note: "Supplemented by inspection of selected\nparts",
      ctrl: "Select an item.",
    },
    {
      pos: "7.5.2",
      desc: "",
      status: "Approved",
      note: "Supplemented by inspection of selected\nparts",
      ctrl: "Select an item.",
    },
    {
      pos: "7.5.3",
      desc: "",
      status: "Approved",
      note: "Supplemented by inspection of selected\nparts",
      ctrl: "Select an item.",
    },
    {
      pos: "7.5.4",
      desc: "",
      status: "Approved",
      note: "Supplemented by inspection of selected\nparts",
      ctrl: "Select an item.",
    },
  ]);

  // ---- 7.6 / B6 (red dot) ----
  sectionHead("7.6 Final Check", "B6", DOT_B6);

  drawListTable([
    {
      pos: "7.6.1",
      desc: "",
      status: "Approved",
      note: "Supplemented by inspection of selected\nparts",
      ctrl: "Select an item.",
    },
    {
      pos: "7.6.2",
      desc: "",
      status: "Approved",
      note: "Supplemented by inspection of selected\nparts",
      ctrl: "Select an item.",
    },
    {
      pos: "7.6.3",
      desc: "",
      status: "Approved",
      note: "Supplemented by inspection of selected\nparts",
      ctrl: "Select an item.",
    },
  ]);

  footer(doc, 9);
}

// PAGE 11 – 8.1 OWN CONTROL B4
// PAGE 11 – 8.A OWN CONTROL B4  (Side 10 af 24)
function page11(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const GREY_LINE = "#cfcfcf";
  const DOT_B4 = "#FFBF00"; // orange/yellow dot
  const RED = "#cc0000";

  const constructionPart = dynamic.constructionPart || "SPECIAL TEXT.";
  const profession = dynamic.profession || "PROJECT SETUP";
  const mainComments = dynamic.mainComments || "MAIN COMMENTS";

  let y = M.t;

  // 1) Top blue bar
  y = drawSectionBar(
    doc,
    y,
    "8.A OWN CONTROL REGISTRATIONS/DOCUMENTATION/PHOTOS, CF. SECTION 7"
  );

  // 2) Row: 8.1 title (left), OWN CONTROL (center red), B4 + dot (right)
  const rowY = y - 2;

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(BLUE)
    .text("8.1 Receive control of deliveries", M.l, rowY, {
      width: CONTENT_W * 0.55,
      align: "left",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(RED)
    .text("OWN CONTROL", M.l, rowY, { width: CONTENT_W, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("black")
    .text("B4", M.l, rowY, { width: CONTENT_W - 18, align: "right" });

  // dot
  doc
    .save()
    .fillColor(DOT_B4)
    .circle(M.l + CONTENT_W - 6, rowY + 8, 6)
    .fill()
    .restore();

  y = rowY + 20;

  // thin line
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 10;

  // 3) Header info block (3 rows, 4 columns, only horizontal lines)
  const c1 = 110;
  const c2 = 150;
  const c3 = 160;
  const c4 = CONTENT_W - (c1 + c2 + c3);

  const x1 = M.l;
  const x2 = x1 + c1;
  const x3 = x2 + c2;
  const x4 = x3 + c3;

  const rH = 18;

  // Row 1 headings
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("DATE/ID", x1, y, { width: c1 });
  doc.text("CONTROL TYPE", x2, y, { width: c2 });
  doc.text("CONSTRUCTION PART:", x3, y, { width: c3, continued: true });
  doc.fillColor(RED).text(` ${constructionPart}`, { continued: false });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("ACCEPTANCE", x4, y, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 6;

  // Row 2 values
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(BLUE)
    .text("[Select Date]", x1, y, { width: c1 });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text("Select an item.", x2, y, { width: c2 });

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(BLUE)
    .text("PROFFESSION:", x3, y, { width: c3, continued: true });
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(RED)
    .text(` ${profession}`, { continued: false });

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(BLUE)
    .text("ENDORSEMENT", x4, y, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 6;

  // Row 3
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(BLUE)
    .text("ID  7.4.", x1, y, { width: c1 });
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(BLUE)
    .text("LOCALIZATION OF CONTROLS", x2, y, { width: c2 + 30 });

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(BLUE)
    .text("COMMENT:", x3, y, { width: c3, continued: true });
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(RED)
    .text(` ${mainComments}`, { continued: false });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 10;

  // Marked drawing (red)
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(RED)
    .text("Marked drawing", M.l, y);
  y = doc.y + 10;

  // 4) Big 2x2 photo grid
  const gridX = M.l;
  const gridY = y + 110; // matches the big blank space in your PDF
  const gridW = CONTENT_W;
  const gridH = 470;

  const midX = gridX + gridW / 2;
  const midY = gridY + gridH / 2;

  const headerH = 60;

  // outer border
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#444")
    .rect(gridX, gridY, gridW, gridH)
    .stroke()
    .restore();

  // main split lines
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#444")
    .moveTo(midX, gridY)
    .lineTo(midX, gridY + gridH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#444")
    .moveTo(gridX, midY)
    .lineTo(gridX + gridW, midY)
    .stroke()
    .restore();

  // header separators inside each quadrant
  // top row
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#444")
    .moveTo(gridX, gridY + headerH)
    .lineTo(midX, gridY + headerH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#444")
    .moveTo(midX, gridY + headerH)
    .lineTo(gridX + gridW, gridY + headerH)
    .stroke()
    .restore();
  // bottom row
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#444")
    .moveTo(gridX, midY + headerH)
    .lineTo(midX, midY + headerH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#444")
    .moveTo(midX, midY + headerH)
    .lineTo(gridX + gridW, midY + headerH)
    .stroke()
    .restore();

  const quadText = (qx, qy, title) => {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(RED)
      .text(title, qx + 10, qy + 10, { width: gridW / 2 - 20 });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(RED)
      .text("Comments on picture", qx + 10, qy + 35);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(RED)
      .text("Photo from registration.", qx + 10, qy + headerH + 40);
  };

  quadText(gridX, gridY, "7.4.3.unique\npicture ID.");
  quadText(midX, gridY, "7.4.3.Eunique\npicture ID.");
  quadText(gridX, midY, "7.4.3.unique\npicture ID.");
  quadText(midX, midY, "7.4.3.unique\npicture ID.");

  // Footer – Side 10 af 24
  footer(doc, 10);
}

// PAGE 12 – 8.2 OWN CONTROL B5
// PAGE 12 – 8.2 OWN CONTROL B5  (Side 11 af 24) - NO OVERFLOW VERSION
function page12(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const GREY_LINE = "#cfcfcf";
  const RED = "#cc0000";
  const DOT_B5 = "#00AFEF"; // blue dot for B5

  const constructionPart = dynamic.constructionPart || "SPECIAL TEXT.";
  const profession = dynamic.profession || "PROJECT SETUP";
  const mainComments = dynamic.mainComments || "MAIN COMMENTS";

  let y = M.t;

  // --- helper: truncate to single line within maxWidth ---
  function fitOneLine(text, maxWidth, font = "Helvetica-Bold", size = 8) {
    const s = String(text ?? "");
    doc.font(font).fontSize(size);

    if (doc.widthOfString(s) <= maxWidth) return s;

    const ell = "...";
    let out = s;
    while (out.length > 0 && doc.widthOfString(out + ell) > maxWidth) {
      out = out.slice(0, -1);
    }
    return out.length ? out + ell : ell;
  }

  // -------------------------------------------------------
  // 1) Title row: 8.2 Execution control | OWN CONTROL | B5 + dot
  // -------------------------------------------------------
  const rowY = y;

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(BLUE)
    .text("8.2 Execution control", M.l, rowY, {
      width: CONTENT_W * 0.55,
      align: "left",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(RED)
    .text("OWN CONTROL", M.l, rowY, { width: CONTENT_W, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(BLUE)
    .text("B5", M.l, rowY, { width: CONTENT_W - 22, align: "right" });

  doc
    .save()
    .fillColor(DOT_B5)
    .circle(M.l + CONTENT_W - 6, rowY + 9, 6)
    .fill()
    .restore();

  y = rowY + 22;

  // top line
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 8;

  // -------------------------------------------------------
  // 2) Info rows (NO WRAP, truncated)
  // -------------------------------------------------------
  // Column widths tuned to avoid collisions
  const c1 = 105; // DATE/ID
  const c2 = 145; // CONTROL TYPE
  const c4 = 105; // ACCEPTANCE/ENDORSEMENT (right)
  const c3 = CONTENT_W - (c1 + c2 + c4); // middle big column

  const x1 = M.l;
  const x2 = x1 + c1;
  const x3 = x2 + c2;
  const x4 = x3 + c3;

  const rH = 16;
  const gapAfterLine = 5;

  // Row 1 headings
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("DATE/ID", x1, y + 1, { width: c1 });
  doc.text("CONTROL TYPE", x2, y + 1, { width: c2 });

  // CONSTRUCTION PART: + value (single line, truncated)
  const label1 = "CONSTRUCTION PART:";
  doc.text(label1, x3, y + 1, { width: c3 });

  const label1W = doc.widthOfString(label1) + 3;
  const val1MaxW = Math.max(10, c3 - label1W);
  const val1 = fitOneLine(constructionPart, val1MaxW, "Helvetica-Bold", 8);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(val1, x3 + label1W, y + 1, { width: val1MaxW });

  // right heading
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("ACCEPTANCE", x4, y + 1, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += gapAfterLine;

  // Row 2 values
  doc.font("Helvetica").fontSize(9).fillColor(BLUE);
  doc.text("[Select Date]", x1, y, { width: c1 });

  doc.font("Helvetica").fontSize(9).fillColor("black");
  doc.text("Select an item.", x2, y, { width: c2 });

  // PROFESSION: + value (single line, truncated)
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  const label2 = "PROFFESSION:";
  doc.text(label2, x3, y + 1, { width: c3 });

  const label2W = doc.widthOfString(label2) + 3;
  const val2MaxW = Math.max(10, c3 - label2W);
  const val2 = fitOneLine(profession, val2MaxW, "Helvetica-Bold", 8);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(val2, x3 + label2W, y + 1, { width: val2MaxW });

  // right heading
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("ENDORSEMENT", x4, y + 1, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += gapAfterLine;

  // Row 3
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE);
  doc.text("ID  7.5.", x1, y, { width: c1 });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("LOCALIZATION OF CONTROLS", x2, y + 1, { width: c2 + 60 });

  // COMMENT: + value (single line, truncated)
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  const label3 = "COMMENT:";
  doc.text(label3, x3, y + 1, { width: c3 });

  const label3W = doc.widthOfString(label3) + 3;
  const val3MaxW = Math.max(10, c3 - label3W);
  const val3 = fitOneLine(mainComments, val3MaxW, "Helvetica-Bold", 8);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(val3, x3 + label3W, y + 1, { width: val3MaxW });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 10;

  // Marked drawing label
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(RED)
    .text("Marked drawing", M.l, y);

  // -------------------------------------------------------
  // 3) 2x2 photo grid (same as before)
  // -------------------------------------------------------
  const gridX = M.l;
  const gridW = CONTENT_W;
  const gridY = 350;
  const gridH = 400;

  const midX = gridX + gridW / 2;
  const midY = gridY + gridH / 2;

  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .rect(gridX, gridY, gridW, gridH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(midX, gridY)
    .lineTo(midX, gridY + gridH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(gridX, midY)
    .lineTo(gridX + gridW, midY)
    .stroke()
    .restore();

  const quadW = gridW / 2;
  const headerH = 32;
  const commentH = 30;
  const idW = 95;

  const drawQuad = (qx, qy, picId) => {
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx, qy + headerH)
      .lineTo(qx + quadW, qy + headerH)
      .stroke()
      .restore();
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx, qy + headerH + commentH)
      .lineTo(qx + quadW, qy + headerH + commentH)
      .stroke()
      .restore();
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx + idW, qy)
      .lineTo(qx + idW, qy + headerH)
      .stroke()
      .restore();

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(RED)
      .text(picId, qx + 8, qy + 8, {
        width: idW - 16,
        align: "left",
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(RED)
      .text("OWN CONTROL", qx + idW + 10, qy + 7, {
        width: quadW - idW - 20,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(RED)
      .text("Comments on picture", qx + 10, qy + headerH + 8);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(RED)
      .text("Photo from registration.", qx + 10, qy + headerH + commentH + 12);
  };

  drawQuad(gridX, gridY, "7.5.1.E1Uniq\nue picture ID");
  drawQuad(midX, gridY, "7.5.1.E2uni\nque picture");
  drawQuad(gridX, midY, "7.5.1.E3uniq\nue picture ID");
  drawQuad(midX, midY, "7.5.1.E4uni\nque picture");

  footer(doc, 11);
}

// PAGE 13 – 8.3 OWN CONTROL B6
// PAGE 13 – 8.3 OWN CONTROL B6  (Side 12 af 24) - NO OVERFLOW VERSION
function page13(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const GREY_LINE = "#cfcfcf";
  const RED = "#cc0000";
  const DOT_B6 = "#BF0000"; // red dot for B6

  const constructionPart = dynamic.constructionPart || "SPECIAL TEXT.";
  const profession = dynamic.profession || "PROJECT SETUP";
  const mainComments = dynamic.mainComments || "MAIN COMMENTS";

  let y = M.t;

  // --- helper: truncate to single line within maxWidth ---
  function fitOneLine(text, maxWidth, font = "Helvetica-Bold", size = 8) {
    const s = String(text ?? "");
    doc.font(font).fontSize(size);

    if (doc.widthOfString(s) <= maxWidth) return s;

    const ell = "...";
    let out = s;
    while (out.length > 0 && doc.widthOfString(out + ell) > maxWidth) {
      out = out.slice(0, -1);
    }
    return out.length ? out + ell : ell;
  }

  // -------------------------------------------------------
  // 1) Title row: 8.3 Final Check | OWN CONTROL | B6 + dot
  // -------------------------------------------------------
  const rowY = y;

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(BLUE)
    .text("8.3 Final Check", M.l, rowY, {
      width: CONTENT_W * 0.55,
      align: "left",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(RED)
    .text("OWN CONTROL", M.l, rowY, { width: CONTENT_W, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(BLUE)
    .text("B6", M.l, rowY, { width: CONTENT_W - 22, align: "right" });

  doc
    .save()
    .fillColor(DOT_B6)
    .circle(M.l + CONTENT_W - 6, rowY + 9, 6)
    .fill()
    .restore();

  y = rowY + 22;

  // top line
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 8;

  // -------------------------------------------------------
  // 2) Info rows (NO WRAP, truncated)
  // -------------------------------------------------------
  const c1 = 105; // DATE/ID
  const c2 = 145; // CONTROL TYPE
  const c4 = 105; // ACCEPTANCE/ENDORSEMENT
  const c3 = CONTENT_W - (c1 + c2 + c4);

  const x1 = M.l;
  const x2 = x1 + c1;
  const x3 = x2 + c2;
  const x4 = x3 + c3;

  const rH = 16;
  const gapAfterLine = 5;

  // Row 1 headings
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("DATE/ID", x1, y + 1, { width: c1 });
  doc.text("CONTROL TYPE", x2, y + 1, { width: c2 });

  const label1 = "CONSTRUCTION PART:";
  doc.text(label1, x3, y + 1, { width: c3 });

  const label1W = doc.widthOfString(label1) + 3;
  const val1MaxW = Math.max(10, c3 - label1W);
  const val1 = fitOneLine(constructionPart, val1MaxW, "Helvetica-Bold", 8);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(val1, x3 + label1W, y + 1, { width: val1MaxW });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("ACCEPTANCE", x4, y + 1, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += gapAfterLine;

  // Row 2 values
  doc.font("Helvetica").fontSize(9).fillColor(BLUE);
  doc.text("[Select Date]", x1, y, { width: c1 });

  doc.font("Helvetica").fontSize(9).fillColor("black");
  doc.text("Select an item.", x2, y, { width: c2 });

  const label2 = "PROFFESSION:";
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text(label2, x3, y + 1, { width: c3 });

  const label2W = doc.widthOfString(label2) + 3;
  const val2MaxW = Math.max(10, c3 - label2W);
  const val2 = fitOneLine(profession, val2MaxW, "Helvetica-Bold", 8);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(val2, x3 + label2W, y + 1, { width: val2MaxW });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("ENDORSEMENT", x4, y + 1, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += gapAfterLine;

  // Row 3
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE);
  doc.text("ID  7.6.", x1, y, { width: c1 });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("LOCALIZATION OF CONTROLS", x2, y + 1, { width: c2 + 60 });

  const label3 = "COMMENT:";
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text(label3, x3, y + 1, { width: c3 });

  const label3W = doc.widthOfString(label3) + 3;
  const val3MaxW = Math.max(10, c3 - label3W);
  const val3 = fitOneLine(mainComments, val3MaxW, "Helvetica-Bold", 8);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(val3, x3 + label3W, y + 1, { width: val3MaxW });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 10;

  // Marked drawing
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(RED)
    .text("Marked drawing", M.l, y);

  // -------------------------------------------------------
  // 3) 2x2 photo grid (7.6.1.*)
  // -------------------------------------------------------
  const gridX = M.l;
  const gridW = CONTENT_W;
  const gridY = 350;
  const gridH = 400;

  const midX = gridX + gridW / 2;
  const midY = gridY + gridH / 2;

  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .rect(gridX, gridY, gridW, gridH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(midX, gridY)
    .lineTo(midX, gridY + gridH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(gridX, midY)
    .lineTo(gridX + gridW, midY)
    .stroke()
    .restore();

  const quadW = gridW / 2;
  const headerH = 32;
  const commentH = 30;
  const idW = 95;

  const drawQuad = (qx, qy, picId) => {
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx, qy + headerH)
      .lineTo(qx + quadW, qy + headerH)
      .stroke()
      .restore();
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx, qy + headerH + commentH)
      .lineTo(qx + quadW, qy + headerH + commentH)
      .stroke()
      .restore();
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx + idW, qy)
      .lineTo(qx + idW, qy + headerH)
      .stroke()
      .restore();

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(RED)
      .text(picId, qx + 8, qy + 8, {
        width: idW - 16,
        align: "left",
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(RED)
      .text("OWN CONTROL", qx + idW + 10, qy + 7, {
        width: quadW - idW - 20,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(RED)
      .text("Comments on picture", qx + 10, qy + headerH + 8);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(RED)
      .text("Photo from registration.", qx + 10, qy + headerH + commentH + 12);
  };

  drawQuad(gridX, gridY, "7.6.1.E1Uniq\nue Picture ID");
  drawQuad(midX, gridY, "7.6.1.E2Uni\nque Picture");
  drawQuad(gridX, midY, "7.6.1.E3Uniq\nue Picture ID");
  drawQuad(midX, midY, "7.6.1.E4Uni\nque Picture");

  footer(doc, 12);
}

// PAGE 14 – 8.1 EXTERNAL CONTROL B4
// PAGE 14 – 8.1 INDEPENDENT CONTROL B4  (Side 13 af 24) - NO OVERFLOW VERSION
function page14(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const GREY_LINE = "#cfcfcf";
  const RED = "#cc0000";
  const GREEN = "#00A651"; // Independent control green (adjust if needed)
  const DOT_B4 = "#FFBF00"; // orange/yellow dot for B4

  const constructionPart = dynamic.constructionPart || "SPECIAL TEXT.";
  const profession = dynamic.profession || "PROJECT SETUP";
  const mainComments = dynamic.mainComments || "MAIN COMMENTS";

  let y = M.t;

  // --- helper: truncate to single line within maxWidth ---
  function fitOneLine(text, maxWidth, font = "Helvetica-Bold", size = 8) {
    const s = String(text ?? "");
    doc.font(font).fontSize(size);

    if (doc.widthOfString(s) <= maxWidth) return s;

    const ell = "...";
    let out = s;
    while (out.length > 0 && doc.widthOfString(out + ell) > maxWidth) {
      out = out.slice(0, -1);
    }
    return out.length ? out + ell : ell;
  }

  // -------------------------------------------------------
  // 1) Top blue bar
  // -------------------------------------------------------
  y = drawSectionBar(doc, y, "8.B EXTERNAL CONTROL REPORT");

  // -------------------------------------------------------
  // 2) Row: 8.1 Receive control of deliveries | INDEPENDENT CONTROL | B4 + dot
  // -------------------------------------------------------
  const rowY = y - 2;

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(BLUE)
    .text("8.1 Receive control of deliveries", M.l, rowY, {
      width: CONTENT_W * 0.55,
      align: "left",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(GREEN)
    .text("INDEPENDENT CONTROL", M.l, rowY, {
      width: CONTENT_W,
      align: "center",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(BLUE)
    .text("B4", M.l, rowY, { width: CONTENT_W - 18, align: "right" });

  // dot
  doc
    .save()
    .fillColor(DOT_B4)
    .circle(M.l + CONTENT_W - 6, rowY + 8, 6)
    .fill()
    .restore();

  y = rowY + 20;

  // top line
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 8;

  // -------------------------------------------------------
  // 3) Info rows (NO WRAP, truncated)
  // -------------------------------------------------------
  const c1 = 105; // DATE/ID
  const c2 = 145; // CONTROL TYPE
  const c4 = 105; // ACCEPTANCE/ENDORSEMENT
  const c3 = CONTENT_W - (c1 + c2 + c4);

  const x1 = M.l;
  const x2 = x1 + c1;
  const x3 = x2 + c2;
  const x4 = x3 + c3;

  const rH = 16;
  const gapAfterLine = 5;

  // Row 1 headings
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("DATE/ID", x1, y + 1, { width: c1 });
  doc.text("CONTROL TYPE", x2, y + 1, { width: c2 });

  const label1 = "CONSTRUCTION PART:";
  doc.text(label1, x3, y + 1, { width: c3 });

  const label1W = doc.widthOfString(label1) + 3;
  const val1MaxW = Math.max(10, c3 - label1W);
  const val1 = fitOneLine(constructionPart, val1MaxW, "Helvetica-Bold", 8);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(val1, x3 + label1W, y + 1, { width: val1MaxW });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("ACCEPTANCE", x4, y + 1, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += gapAfterLine;

  // Row 2 values
  doc.font("Helvetica").fontSize(9).fillColor(BLUE);
  doc.text("[Select Date]", x1, y, { width: c1 });

  doc.font("Helvetica").fontSize(9).fillColor("black");
  doc.text("Select an item.", x2, y, { width: c2 });

  const label2 = "PROFFESSION:";
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text(label2, x3, y + 1, { width: c3 });

  const label2W = doc.widthOfString(label2) + 3;
  const val2MaxW = Math.max(10, c3 - label2W);
  const val2 = fitOneLine(profession, val2MaxW, "Helvetica-Bold", 8);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(val2, x3 + label2W, y + 1, { width: val2MaxW });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("ENDORSEMENT", x4, y + 1, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += gapAfterLine;

  // Row 3
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE);
  doc.text("ID  7.4.", x1, y, { width: c1 });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("LOCALIZATION OF CONTROLS", x2, y + 1, { width: c2 + 60 });

  const label3 = "COMMENT:";
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text(label3, x3, y + 1, { width: c3 });

  const label3W = doc.widthOfString(label3) + 3;
  const val3MaxW = Math.max(10, c3 - label3W);
  const val3 = fitOneLine(mainComments, val3MaxW, "Helvetica-Bold", 8);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(val3, x3 + label3W, y + 1, { width: val3MaxW });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 10;

  // Marked drawing
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(RED)
    .text("Marked drawing", M.l, y);

  // -------------------------------------------------------
  // 4) 2x2 photo grid (Independent control label in GREEN)
  // -------------------------------------------------------
  const gridX = M.l;
  const gridW = CONTENT_W;
  const gridY = 350;
  const gridH = 400;

  const midX = gridX + gridW / 2;
  const midY = gridY + gridH / 2;

  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .rect(gridX, gridY, gridW, gridH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(midX, gridY)
    .lineTo(midX, gridY + gridH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(gridX, midY)
    .lineTo(gridX + gridW, midY)
    .stroke()
    .restore();

  const quadW = gridW / 2;
  const headerH = 32;
  const commentH = 30;
  const idW = 95;

  const drawQuad = (qx, qy, picId) => {
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx, qy + headerH)
      .lineTo(qx + quadW, qy + headerH)
      .stroke()
      .restore();
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx, qy + headerH + commentH)
      .lineTo(qx + quadW, qy + headerH + commentH)
      .stroke()
      .restore();
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx + idW, qy)
      .lineTo(qx + idW, qy + headerH)
      .stroke()
      .restore();

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(RED)
      .text(picId, qx + 8, qy + 8, {
        width: idW - 16,
        align: "left",
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(GREEN)
      .text("INDEPENDENT CONTROL", qx + idW + 10, qy + 7, {
        width: quadW - idW - 20,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(RED)
      .text("Comments on picture", qx + 10, qy + headerH + 8);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(RED)
      .text("Photo from registration.", qx + 10, qy + headerH + commentH + 12);
  };

  // B4 / 7.4.3 ids
  drawQuad(gridX, gridY, "7.4.3.E1Uniq\nue picture ID");
  drawQuad(midX, gridY, "7.4.3.E2Uni\nque picture");
  drawQuad(gridX, midY, "7.4.3.E3Uniq\nue picture ID");
  drawQuad(midX, midY, "7.4.3.E4Uni\nque picture");

  footer(doc, 13);
}

// PAGE 15 – 8.2 EXTERNAL CONTROL B5
// PAGE 15 – 8.2 Execution control (INDEPENDET CONTROL) B5  (Side 14 af 24)
function page15(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const GREY_LINE = "#d0d0d0"; // matches PDF line color
  const RED = "#cc0000";
  const GREEN = "#00AF50"; // picked from your PDF
  const DOT_B5 = "#00AFEF"; // picked from your PDF (blue dot)

  const constructionPart = dynamic.constructionPart || "SPECIAL TEXT.";
  const profession = dynamic.profession || "PROJECT SETUP";
  const mainComments = dynamic.mainComments || "MAIN COMMENTS";

  let y = M.t;

  // --- helper: truncate to single line within maxWidth ---
  function fitOneLine(text, maxWidth, font = "Helvetica-Bold", size = 8) {
    const s = String(text ?? "");
    doc.font(font).fontSize(size);
    if (doc.widthOfString(s) <= maxWidth) return s;

    const ell = "...";
    let out = s;
    while (out.length > 0 && doc.widthOfString(out + ell) > maxWidth)
      out = out.slice(0, -1);
    return out.length ? out + ell : ell;
  }

  // -------------------------------------------------------
  // 1) Top row: left title | center green label | right B5 + blue dot
  // (NOTE: Your PDF spells it "INDEPENDET CONTROL" - we keep the same)
  // -------------------------------------------------------
  const rowY = y;

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(BLUE)
    .text("8.2 Execution control", M.l, rowY, {
      width: CONTENT_W * 0.55,
      align: "left",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(GREEN)
    .text("INDEPENDET CONTROL", M.l, rowY, {
      width: CONTENT_W,
      align: "center",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(BLUE)
    .text("B5", M.l, rowY, { width: CONTENT_W - 32, align: "right" });

  // blue dot
  doc
    .save()
    .fillColor(DOT_B5)
    .circle(M.l + CONTENT_W - 6, rowY + 8, 6)
    .fill()
    .restore();

  y = rowY + 20;

  // top line under header
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 8;

  // -------------------------------------------------------
  // 2) Info rows (NO WRAP, truncated like your safe pages)
  // -------------------------------------------------------
  const c1 = 105; // DATE/ID
  const c2 = 145; // CONTROL TYPE
  const c4 = 105; // ACCEPTANCE/ENDORSEMENT
  const c3 = CONTENT_W - (c1 + c2 + c4);

  const x1 = M.l;
  const x2 = x1 + c1;
  const x3 = x2 + c2;
  const x4 = x3 + c3;

  const rH = 16;
  const gapAfterLine = 5;

  // Row 1 headings
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("DATE/ID", x1, y + 1, { width: c1 });
  doc.text("CONTROL TYPE", x2, y + 1, { width: c2 });

  const label1 = "CONSTRUCTION PART:";
  doc.text(label1, x3, y + 1, { width: c3 });

  const label1W = doc.widthOfString(label1) + 3;
  const val1MaxW = Math.max(10, c3 - label1W);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(
    fitOneLine(constructionPart, val1MaxW, "Helvetica-Bold", 8),
    x3 + label1W,
    y + 1,
    {
      width: val1MaxW,
    }
  );

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("ACCEPTANCE", x4, y + 1, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += gapAfterLine;

  // Row 2 values
  doc.font("Helvetica").fontSize(9).fillColor(BLUE);
  doc.text("[Select Date]", x1, y, { width: c1 });

  doc.font("Helvetica").fontSize(9).fillColor("black");
  doc.text("Select an item.", x2, y, { width: c2 });

  const label2 = "PROFFESSION:";
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text(label2, x3, y + 1, { width: c3 });

  const label2W = doc.widthOfString(label2) + 3;
  const val2MaxW = Math.max(10, c3 - label2W);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(
    fitOneLine(profession, val2MaxW, "Helvetica-Bold", 8),
    x3 + label2W,
    y + 1,
    {
      width: val2MaxW,
    }
  );

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("ENDORSEMENT", x4, y + 1, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += gapAfterLine;

  // Row 3
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE);
  doc.text("ID  7.5.", x1, y, { width: c1 });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("LOCALIZATION OF CONTROLS", x2, y + 1, { width: c2 + 60 });

  const label3 = "COMMENT:";
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text(label3, x3, y + 1, { width: c3 });

  const label3W = doc.widthOfString(label3) + 3;
  const val3MaxW = Math.max(10, c3 - label3W);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(
    fitOneLine(mainComments, val3MaxW, "Helvetica-Bold", 8),
    x3 + label3W,
    y + 1,
    {
      width: val3MaxW,
    }
  );

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 10;

  // Marked drawing
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(RED)
    .text("Marked drawing", M.l, y);

  // -------------------------------------------------------
  // 3) 2x2 photo grid (7.5.1.*) with green "INDEPENDET CONTROL"
  // -------------------------------------------------------
  const gridX = M.l;
  const gridW = CONTENT_W;
  const gridY = 350;
  const gridH = 400;

  const midX = gridX + gridW / 2;
  const midY = gridY + gridH / 2;

  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .rect(gridX, gridY, gridW, gridH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(midX, gridY)
    .lineTo(midX, gridY + gridH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(gridX, midY)
    .lineTo(gridX + gridW, midY)
    .stroke()
    .restore();

  const quadW = gridW / 2;
  const headerH = 32;
  const commentH = 30;
  const idW = 95;

  const drawQuad = (qx, qy, picId) => {
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx, qy + headerH)
      .lineTo(qx + quadW, qy + headerH)
      .stroke()
      .restore();
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx, qy + headerH + commentH)
      .lineTo(qx + quadW, qy + headerH + commentH)
      .stroke()
      .restore();
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx + idW, qy)
      .lineTo(qx + idW, qy + headerH)
      .stroke()
      .restore();

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(RED)
      .text(picId, qx + 8, qy + 6, {
        width: idW - 16,
        align: "left",
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(GREEN)
      .text("INDEPENDET CONTROL", qx + idW + 10, qy + 7, {
        width: quadW - idW - 20,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(RED)
      .text("Comments on picture", qx + 10, qy + headerH + 8);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(RED)
      .text("Photo from registration.", qx + 10, qy + headerH + commentH + 12);
  };

  drawQuad(gridX, gridY, "7.5.1.E1Uniq\nue picture ID");
  drawQuad(midX, gridY, "7.5.1.E2uni\nque picture");
  drawQuad(gridX, midY, "7.5.1.E3uniq\nue picture ID");
  drawQuad(midX, midY, "7.5.1.E4uni\nque picture");

  footer(doc, 14);
}

// PAGE 16 – 8.3 EXTERNAL CONTROL B6
// PAGE 16 – 8.3 Final Check (INDEPENDET CONTROL) B6  (Side 15 af 24)
function page16(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const GREY_LINE = "#d0d0d0";
  const RED = "#cc0000";
  const GREEN = "#00AF50"; // same green as page14/15
  const DOT_B6 = "#BF0000"; // red dot for B6

  const constructionPart = dynamic.constructionPart || "SPECIAL TEXT.";
  const profession = dynamic.profession || "PROJECT SETUP";
  const mainComments = dynamic.mainComments || "MAIN COMMENTS";

  let y = M.t;

  // --- helper: truncate to single line within maxWidth ---
  function fitOneLine(text, maxWidth, font = "Helvetica-Bold", size = 8) {
    const s = String(text ?? "");
    doc.font(font).fontSize(size);
    if (doc.widthOfString(s) <= maxWidth) return s;

    const ell = "...";
    let out = s;
    while (out.length > 0 && doc.widthOfString(out + ell) > maxWidth)
      out = out.slice(0, -1);
    return out.length ? out + ell : ell;
  }

  // -------------------------------------------------------
  // 1) Top row: left title | center green label | right B6 + red dot
  // (PDF has "INDEPENDET CONTROL" spelling - keep same)
  // -------------------------------------------------------
  const rowY = y;

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(BLUE)
    .text("8.3 Final Check", M.l, rowY, {
      width: CONTENT_W * 0.55,
      align: "left",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(GREEN)
    .text("INDEPENDET CONTROL", M.l, rowY, {
      width: CONTENT_W,
      align: "center",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(BLUE)
    .text("B6", M.l, rowY, { width: CONTENT_W - 32, align: "right" });

  // red dot
  doc
    .save()
    .fillColor(DOT_B6)
    .circle(M.l + CONTENT_W - 6, rowY + 8, 6)
    .fill()
    .restore();

  y = rowY + 20;

  // line under header
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 8;

  // -------------------------------------------------------
  // 2) Info rows (NO WRAP, truncated)
  // -------------------------------------------------------
  const c1 = 105; // DATE/ID
  const c2 = 145; // CONTROL TYPE
  const c4 = 105; // ACCEPTANCE/ENDORSEMENT
  const c3 = CONTENT_W - (c1 + c2 + c4);

  const x1 = M.l;
  const x2 = x1 + c1;
  const x3 = x2 + c2;
  const x4 = x3 + c3;

  const rH = 16;
  const gapAfterLine = 5;

  // Row 1 headings
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("DATE/ID", x1, y + 1, { width: c1 });
  doc.text("CONTROL TYPE", x2, y + 1, { width: c2 });

  const label1 = "CONSTRUCTION PART:";
  doc.text(label1, x3, y + 1, { width: c3 });

  const label1W = doc.widthOfString(label1) + 3;
  const val1MaxW = Math.max(10, c3 - label1W);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(
    fitOneLine(constructionPart, val1MaxW, "Helvetica-Bold", 8),
    x3 + label1W,
    y + 1,
    {
      width: val1MaxW,
    }
  );

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("ACCEPTANCE", x4, y + 1, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += gapAfterLine;

  // Row 2 values
  doc.font("Helvetica").fontSize(9).fillColor(BLUE);
  doc.text("[Select Date]", x1, y, { width: c1 });

  doc.font("Helvetica").fontSize(9).fillColor("black");
  doc.text("Select an item.", x2, y, { width: c2 });

  const label2 = "PROFFESSION:";
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text(label2, x3, y + 1, { width: c3 });

  const label2W = doc.widthOfString(label2) + 3;
  const val2MaxW = Math.max(10, c3 - label2W);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(
    fitOneLine(profession, val2MaxW, "Helvetica-Bold", 8),
    x3 + label2W,
    y + 1,
    {
      width: val2MaxW,
    }
  );

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("ENDORSEMENT", x4, y + 1, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += gapAfterLine;

  // Row 3
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE);
  doc.text("ID  7.6.", x1, y, { width: c1 });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("LOCALIZATION OF CONTROLS", x2, y + 1, { width: c2 + 60 });

  const label3 = "COMMENT:";
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text(label3, x3, y + 1, { width: c3 });

  const label3W = doc.widthOfString(label3) + 3;
  const val3MaxW = Math.max(10, c3 - label3W);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(
    fitOneLine(mainComments, val3MaxW, "Helvetica-Bold", 8),
    x3 + label3W,
    y + 1,
    {
      width: val3MaxW,
    }
  );

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 10;

  // Marked drawing
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(RED)
    .text("Marked drawing", M.l, y);

  // -------------------------------------------------------
  // 3) 2x2 photo grid (7.6.3.*) with green "INDEPENDET CONTROL"
  // -------------------------------------------------------
  const gridX = M.l;
  const gridW = CONTENT_W;
  const gridY = 350;
  const gridH = 400;

  const midX = gridX + gridW / 2;
  const midY = gridY + gridH / 2;

  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .rect(gridX, gridY, gridW, gridH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(midX, gridY)
    .lineTo(midX, gridY + gridH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(gridX, midY)
    .lineTo(gridX + gridW, midY)
    .stroke()
    .restore();

  const quadW = gridW / 2;
  const headerH = 32;
  const commentH = 30;
  const idW = 95;

  const drawQuad = (qx, qy, picId) => {
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx, qy + headerH)
      .lineTo(qx + quadW, qy + headerH)
      .stroke()
      .restore();
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx, qy + headerH + commentH)
      .lineTo(qx + quadW, qy + headerH + commentH)
      .stroke()
      .restore();
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx + idW, qy)
      .lineTo(qx + idW, qy + headerH)
      .stroke()
      .restore();

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(RED)
      .text(picId, qx + 8, qy + 6, {
        width: idW - 16,
        align: "left",
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(GREEN)
      .text("INDEPENDET CONTROL", qx + idW + 10, qy + 7, {
        width: quadW - idW - 20,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(RED)
      .text("Comments on picture", qx + 10, qy + headerH + 8);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(RED)
      .text("Photo from registration.", qx + 10, qy + headerH + commentH + 12);
  };

  drawQuad(gridX, gridY, "7.6.3.E1Uniq\nue Picture ID");
  drawQuad(midX, gridY, "7.6.3.E2Uni\nque Picture");
  drawQuad(gridX, midY, "7.6.3.E3Uniq\nue Picture ID");
  drawQuad(midX, midY, "7.6.3.E4Uni\nque Picture");

  footer(doc, 15);
}

// PAGE 17 – 8.4 DEVIATIONS B7
// PAGE 17 – 8.4 DEVIATIONS B7  (Side 16 af 24)
function page17(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const GREY_LINE = "#d0d0d0";
  const RED = "#cc0000";

  const constructionPart = dynamic.constructionPart || "SPECIAL TEXT";
  const profession = dynamic.profession || "PROJECT SETUP";
  const mainComments = dynamic.mainComments || "MAIN COMMENTS";

  let y = M.t;

  // --- helper: truncate to single line within maxWidth ---
  function fitOneLine(text, maxWidth, font = "Helvetica-Bold", size = 8) {
    const s = String(text ?? "");
    doc.font(font).fontSize(size);
    if (doc.widthOfString(s) <= maxWidth) return s;

    const ell = "...";
    let out = s;
    while (out.length > 0 && doc.widthOfString(out + ell) > maxWidth)
      out = out.slice(0, -1);
    return out.length ? out + ell : ell;
  }

  // -------------------------------------------------------
  // 1) Title row: 8.4 DEVIATIONS (left) + B7 (right)
  // -------------------------------------------------------
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(BLUE)
    .text("8.4 DEVIATIONS", M.l, y, {
      width: CONTENT_W * 0.7,
      align: "left",
    });

  doc.font("Helvetica-Bold").fontSize(13).fillColor(BLUE).text("B7", M.l, y, {
    width: CONTENT_W,
    align: "right",
  });

  y += 22;

  // -------------------------------------------------------
  // 2) Info rows (same style as your B4/B5/B6 pages)
  // -------------------------------------------------------
  const c1 = 105; // DATE/ID
  const c2 = 145; // CONTROL TYPE
  const c4 = 105; // ACCEPTANCE/ENDORSEMENT
  const c3 = CONTENT_W - (c1 + c2 + c4);

  const x1 = M.l;
  const x2 = x1 + c1;
  const x3 = x2 + c2;
  const x4 = x3 + c3;

  const rH = 16;
  const gapAfterLine = 5;

  // Top line
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 8;

  // Row 1 headings
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("DATE/ID", x1, y + 1, { width: c1 });
  doc.text("CONTROL TYPE", x2, y + 1, { width: c2 });

  const label1 = "CONSTRUCTION PART:";
  doc.text(label1, x3, y + 1, { width: c3 });

  const label1W = doc.widthOfString(label1) + 3;
  const val1MaxW = Math.max(10, c3 - label1W);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(
    fitOneLine(constructionPart, val1MaxW, "Helvetica-Bold", 8),
    x3 + label1W,
    y + 1,
    {
      width: val1MaxW,
    }
  );

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("ACCEPTANCE", x4, y + 1, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += gapAfterLine;

  // Row 2 values
  doc.font("Helvetica").fontSize(9).fillColor(BLUE);
  doc.text("[Select Date]", x1, y, { width: c1 });

  doc.font("Helvetica").fontSize(9).fillColor(BLUE);
  doc.text("Select an item.", x2, y, { width: c2 });

  const label2 = "PROFFESSION:";
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text(label2, x3, y + 1, { width: c3 });

  const label2W = doc.widthOfString(label2) + 3;
  const val2MaxW = Math.max(10, c3 - label2W);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(
    fitOneLine(profession, val2MaxW, "Helvetica-Bold", 8),
    x3 + label2W,
    y + 1,
    {
      width: val2MaxW,
    }
  );

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("ENDORSEMENT", x4, y + 1, { width: c4, align: "right" });

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += gapAfterLine;

  // Row 3 (note: your PDF shows "ID  7.6." here — keeping same)
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE);
  doc.text("ID  7.6.", x1, y, { width: c1 });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text("LOCALIZATION OF CONTROLS", x2, y + 1, { width: c2 + 60 });

  const label3 = "COMMENT:";
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);
  doc.text(label3, x3, y + 1, { width: c3 });

  const label3W = doc.widthOfString(label3) + 3;
  const val3MaxW = Math.max(10, c3 - label3W);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(RED);
  doc.text(
    fitOneLine(mainComments, val3MaxW, "Helvetica-Bold", 8),
    x3 + label3W,
    y + 1,
    {
      width: val3MaxW,
    }
  );

  y += rH;
  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(M.l, y)
    .lineTo(M.l + CONTENT_W, y)
    .stroke()
    .restore();
  y += 10;

  // Marked drawing
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(RED)
    .text("Marked drawing", M.l, y);

  // -------------------------------------------------------
  // 3) 2x2 photo grid (U1–U4) — no green header inside
  // -------------------------------------------------------
  const gridX = M.l;
  const gridW = CONTENT_W;
  const gridY = 255; // matches your PDF placement
  const gridH = 500; // fills page nicely above footer

  const midX = gridX + gridW / 2;
  const midY = gridY + gridH / 2;

  // outer + middle lines
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .rect(gridX, gridY, gridW, gridH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(midX, gridY)
    .lineTo(midX, gridY + gridH)
    .stroke()
    .restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(gridX, midY)
    .lineTo(gridX + gridW, midY)
    .stroke()
    .restore();

  const quadW = gridW / 2;
  const headerH = 30;
  const commentH = 30;
  const idW = 95;

  const drawQuad = (qx, qy, picId) => {
    // header bottom line
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx, qy + headerH)
      .lineTo(qx + quadW, qy + headerH)
      .stroke()
      .restore();
    // comment bottom line
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx, qy + headerH + commentH)
      .lineTo(qx + quadW, qy + headerH + commentH)
      .stroke()
      .restore();
    // id divider (header only)
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#333")
      .moveTo(qx + idW, qy)
      .lineTo(qx + idW, qy + headerH)
      .stroke()
      .restore();

    // ID (black)
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(picId, qx + 8, qy + 6, {
        width: idW - 16,
        align: "left",
        lineGap: 1,
      });

    // Comments (red)
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(RED)
      .text("Comments on picture", qx + 10, qy + headerH + 8);

    // Photo line (red)
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(RED)
      .text("Photo from registration.", qx + 10, qy + headerH + commentH + 14);
  };

  drawQuad(gridX, gridY, "7.7.1.U1uniq\nue picture ID");
  drawQuad(midX, gridY, "7.7.1.U2uni\nque picture");
  drawQuad(gridX, midY, "7.7.1.U3uniq\nue picture ID");
  drawQuad(midX, midY, "7.7.1.U4uni\nque picture");

  footer(doc, 16);
}

// PAGE 18 – 8.5 STATEMENT ANNEXES
// PAGE 18 – 8.5 STATEMENT ANNEXES  (Side 17 af 24) - COLLISION SAFE
function page18(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const GREY_LINE = "#9a9a9a";
  const LABEL_GREY = "#666666";
  const BOX_GREY = "#d9d9d9";
  const RED = "#cc0000";

  // ---- dynamic placeholders (as in PDF) ----
  const projectIdNameLeft = dynamic.projectIdNameLeft || "Project setup";
  const projectIdNameRight = dynamic.projectIdNameRight || "Project setup";
  const projectAddress = dynamic.projectAddress || "Project setup";
  const projectPostCity = dynamic.projectPostCity || "Project setup";
  const mainContractor = dynamic.mainContractor || "Project setup";
  const constructionSection = dynamic.constructionSection || "Project setup";
  const independentControllerName =
    dynamic.independentControllerName || "Project setup";
  const independentControllerCompany =
    dynamic.independentControllerCompany || "Project setup";

  const contractorName = dynamic.contractorName || "Name of Contractor";
  const planB2 = dynamic.planB2 || "B2.x number + special text";
  const planB3 = dynamic.planB3 || "B3.x number + special text";
  const planA5 = dynamic.planA5 || "A5.x number + special text";

  // bottom box dynamics
  const icNameValue =
    dynamic.icNameValue || "Independent Controller Project setup";
  const icCompanyValue =
    dynamic.icCompanyValue || "Independent Controller Project setup";
  const icLogoNote = dynamic.icLogoNote || "";
  const signedDate = dynamic.icSignedDate || "date.";

  let y = M.t;

  // =======================================================
  // 1) Top blue header bar
  // =======================================================
  const barH = 26;

  doc.save().fillColor(BLUE).rect(M.l, y, CONTENT_W, barH).fill().restore();

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("white")
    .text("8.5 STATEMENT ANNEXES", M.l + 10, y + 6, {
      width: CONTENT_W - 20,
      align: "left",
    });

  y = y + barH + 14;

  // =======================================================
  // 2) Project setup info table (top)
  // =======================================================
  const tX = M.l;
  const tW = CONTENT_W;
  const leftW = 260;
  const midW = 170;
  const rightW = tW - leftW - midW;
  const xL = tX;
  const xM = tX + leftW;
  const xR = xM + midW;
  const rowH = 22;

  const rows = [
    {
      label: "Project ID and Name",
      v1: projectIdNameLeft,
      v2: projectIdNameRight,
      split: true,
    },
    { label: "Project Adress", v1: projectAddress, split: false },
    { label: "Project Post code/City", v1: projectPostCity, split: false },
    {
      label: "Main Contractor/Custumer Name",
      v1: mainContractor,
      split: false,
    },
    { label: "Construction section", v1: constructionSection, split: false },
    {
      label: "Independent Controller Name",
      v1: independentControllerName,
      split: false,
    },
    {
      label: "Independent Controller Company",
      v1: independentControllerCompany,
      split: false,
    },
  ];

  const tableTopY = y;

  doc
    .save()
    .lineWidth(1)
    .strokeColor(GREY_LINE)
    .moveTo(tX, tableTopY)
    .lineTo(tX + tW, tableTopY)
    .stroke()
    .moveTo(xM, tableTopY)
    .lineTo(xM, tableTopY + rows.length * rowH)
    .stroke()
    .restore();

  rows.forEach((r, i) => {
    const ry = tableTopY + i * rowH;

    doc
      .save()
      .lineWidth(1)
      .strokeColor(GREY_LINE)
      .moveTo(tX, ry + rowH)
      .lineTo(tX + tW, ry + rowH)
      .stroke()
      .restore();

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(LABEL_GREY)
      .text(r.label, xL + 6, ry + 5, { width: leftW - 12, align: "left" });

    doc.font("Helvetica").fontSize(10).fillColor(RED);

    if (r.split) {
      doc
        .save()
        .lineWidth(1)
        .strokeColor(GREY_LINE)
        .moveTo(xR, ry)
        .lineTo(xR, ry + rowH)
        .stroke()
        .restore();

      doc.text(r.v1, xM + 8, ry + 6, { width: midW - 16, align: "left" });
      doc.text(r.v2, xR + 8, ry + 6, { width: rightW - 16, align: "left" });
    } else {
      doc.text(r.v1, xM + 8, ry + 6, {
        width: midW + rightW - 16,
        align: "left",
      });
    }
  });

  // After table
  y = tableTopY + rows.length * rowH + 38;

  // =======================================================
  // 3) Collision-safe paragraph layout (pre-measure)
  // =======================================================
  const paraW = CONTENT_W * 0.86;
  const paraX = M.l + (CONTENT_W - paraW) / 2;

  // Fixed box location (like PDF)
  const boxY = 560;
  const boxH = 205;

  // Available space before box
  const maxTextBottom = boxY - 14;

  const titleText = "Declaration from the Independent Controller";

  // Build paragraph text blocks (we will measure heights)
  const p1 = `I, the undersigned, have, as an independent inspector, reviewed and controlled the execution of the work carried out by ${contractorName} in accordance with the approved control plan ${planB2}, as well as the execution and documentation of ${planB3} and ${planA5} (structures, cargo and safety).`;
  const sScope = "Scope of control:";
  const s1 =
    "Review of documentation from the contractor (measurements, photo documentation, self-inspection forms).";
  const s2 = "Random checks of work performed.";
  const s3 = "Ensuring that any deviations are registered and addressed.";
  const sConc = "Conclusion:";
  const p2 = `Based on the inspections and documentation carried out, I declare that the work under ${planB3} and ${planA5} has been carried out in accordance with the design and control plan, and that all identified deviations have been handled satisfactorily.`;
  const p3 =
    "This declaration is documentation that the work has been correctly carried out and forms the basis for the certified statistician's final declaration.";

  function h(font, size, text, lineGap) {
    doc.font(font).fontSize(size);
    return doc.heightOfString(text, { width: paraW, lineGap: lineGap ?? 2 });
  }

  // Try normal sizing first; if too tall, compress.
  let cfg = {
    titleSize: 24,
    titleGap: 18,
    size: 10,
    lineGap: 2,
    sectionSize: 10,
    secGap: 6,
    blockGap: 16,
  };

  function totalHeight(cfg) {
    const titleH = h("Helvetica", cfg.titleSize, titleText, 0);
    const p1H = h("Helvetica-Oblique", cfg.size, p1, cfg.lineGap);
    const scopeH = h("Helvetica-BoldOblique", cfg.sectionSize, sScope, 0);
    const s1H = h("Helvetica-Oblique", cfg.size, s1, cfg.lineGap);
    const s2H = h("Helvetica-Oblique", cfg.size, s2, cfg.lineGap);
    const s3H = h("Helvetica-Oblique", cfg.size, s3, cfg.lineGap);
    const concH = h("Helvetica-BoldOblique", cfg.sectionSize, sConc, 0);
    const p2H = h("Helvetica-Oblique", cfg.size, p2, cfg.lineGap);
    const p3H = h("Helvetica-Oblique", cfg.size, p3, cfg.lineGap);

    return (
      titleH +
      cfg.titleGap +
      p1H +
      cfg.blockGap +
      scopeH +
      cfg.secGap +
      s1H +
      4 +
      s2H +
      4 +
      s3H +
      cfg.blockGap +
      concH +
      cfg.secGap +
      p2H +
      cfg.blockGap / 2 +
      p3H
    );
  }

  const available = maxTextBottom - y;
  if (totalHeight(cfg) > available) {
    // compressed mode
    cfg = {
      titleSize: 20,
      titleGap: 12,
      size: 9,
      lineGap: 1,
      sectionSize: 9,
      secGap: 4,
      blockGap: 10,
    };
  }

  // ---- Draw Title ----
  doc
    .font("Helvetica")
    .fontSize(cfg.titleSize)
    .fillColor("#555555")
    .text(titleText, M.l, y, { width: CONTENT_W, align: "center" });
  y = doc.y + cfg.titleGap;

  // ---- Draw p1 (grey + red inserts using simple segments) ----
  // We keep your red parts by drawing in segments:
  doc.font("Helvetica-Oblique").fontSize(cfg.size).fillColor("#777777");
  doc.text(
    "I, the undersigned, have, as an independent inspector, reviewed and controlled the execution of the work carried out by ",
    paraX,
    y,
    {
      width: paraW,
      align: "left",
      continued: true,
      lineGap: cfg.lineGap,
    }
  );
  doc.fillColor(RED).text(contractorName, { continued: true });
  doc
    .fillColor("#777777")
    .text(" in accordance with the approved control plan ", {
      continued: true,
    });
  doc.fillColor(RED).text(planB2, { continued: true });
  doc
    .fillColor("#777777")
    .text(", as well as the execution and documentation of ", {
      continued: true,
    });
  doc.fillColor(RED).text(planB3, { continued: true });
  doc.fillColor("#777777").text(" and ", { continued: true });
  doc.fillColor(RED).text(planA5, { continued: false });
  doc
    .fillColor("#777777")
    .text(" (structures, cargo and safety).", paraX, doc.y, {
      width: paraW,
      align: "left",
      lineGap: cfg.lineGap,
    });

  y = doc.y + cfg.blockGap;

  // ---- Scope ----
  doc
    .font("Helvetica-BoldOblique")
    .fontSize(cfg.sectionSize)
    .fillColor("#777777")
    .text(sScope, paraX, y, { width: paraW, align: "left" });
  y = doc.y + cfg.secGap;

  doc
    .font("Helvetica-Oblique")
    .fontSize(cfg.size)
    .fillColor("#777777")
    .text(s1, paraX, y, { width: paraW, align: "left", lineGap: cfg.lineGap });
  y = doc.y + 4;

  doc.text(s2, paraX, y, { width: paraW, align: "left", lineGap: cfg.lineGap });
  y = doc.y + 4;

  doc.text(s3, paraX, y, { width: paraW, align: "left", lineGap: cfg.lineGap });
  y = doc.y + cfg.blockGap;

  // ---- Conclusion ----
  doc
    .font("Helvetica-BoldOblique")
    .fontSize(cfg.sectionSize)
    .fillColor("#777777")
    .text(sConc, paraX, y, { width: paraW, align: "left" });
  y = doc.y + cfg.secGap;

  doc.font("Helvetica-Oblique").fontSize(cfg.size).fillColor("#777777");
  doc.text(
    "Based on the inspections and documentation carried out, I declare that the work under ",
    paraX,
    y,
    {
      width: paraW,
      align: "left",
      continued: true,
      lineGap: cfg.lineGap,
    }
  );
  doc.fillColor(RED).text(planB3, { continued: true });
  doc.fillColor("#777777").text(" and ", { continued: true });
  doc.fillColor(RED).text(planA5, { continued: true });
  doc
    .fillColor("#777777")
    .text(
      " has been carried out in accordance with the design and control plan, and that all identified deviations have been handled satisfactorily.",
      {
        continued: false,
      }
    );

  y = doc.y + cfg.blockGap / 2;

  doc
    .font("Helvetica-Oblique")
    .fontSize(cfg.size)
    .fillColor("#777777")
    .text(p3, paraX, y, { width: paraW, align: "left", lineGap: cfg.lineGap });

  // =======================================================
  // 4) Bottom “Independent Controller” box/table (fixed)
  // =======================================================
  const boxX = M.l;
  const boxW = CONTENT_W;

  const bColW = boxW / 3;
  const b1 = boxX;
  const b2 = boxX + bColW;
  const b3 = boxX + bColW * 2;

  const headH = 26;
  const r1 = 24;
  const r2 = 24;
  const r3 = 92;
  const r4 = 22;

  // outer border
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .rect(boxX, boxY, boxW, boxH)
    .stroke()
    .restore();

  // header fill
  doc.save().fillColor(BOX_GREY).rect(boxX, boxY, boxW, headH).fill().restore();
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(boxX, boxY + headH)
    .lineTo(boxX + boxW, boxY + headH)
    .stroke()
    .restore();

  // vertical lines
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(b2, boxY)
    .lineTo(b2, boxY + boxH)
    .stroke()
    .moveTo(b3, boxY)
    .lineTo(b3, boxY + boxH)
    .stroke()
    .restore();

  // horizontal lines for rows
  const y1 = boxY + headH + r1;
  const y2 = y1 + r2;
  const y3 = y2 + r3;
  const y4 = y3 + r4;

  doc
    .save()
    .lineWidth(1)
    .strokeColor("#333")
    .moveTo(boxX, y1)
    .lineTo(boxX + boxW, y1)
    .stroke()
    .moveTo(boxX, y2)
    .lineTo(boxX + boxW, y2)
    .stroke()
    .moveTo(boxX, y3)
    .lineTo(boxX + boxW, y3)
    .stroke()
    .moveTo(boxX, y4)
    .lineTo(boxX + boxW, y4)
    .stroke()
    .restore();

  // header text
  doc
    .font("Helvetica-BoldOblique")
    .fontSize(14)
    .fillColor("#555555")
    .text("Independent Controller", boxX + 10, boxY + 6, {
      width: boxW - 20,
      align: "left",
    });

  // left labels
  doc.font("Helvetica-BoldOblique").fontSize(10).fillColor("#555555");
  doc.text("Independent Controller Name:", b1 + 10, boxY + headH + 5, {
    width: bColW - 20,
  });
  doc.text("Independent Controller Company", b1 + 10, boxY + headH + r1 + 5, {
    width: bColW - 20,
  });
  doc.text(
    "Independent Controller Signature:",
    b1 + 10,
    boxY + headH + r1 + r2 + 5,
    { width: bColW - 20 }
  );
  doc
    .font("Helvetica-Oblique")
    .fontSize(10)
    .fillColor("#555555")
    .text("Signed the:", b1 + 10, y3 + 4, { width: bColW - 20 });

  // middle values
  doc.font("Helvetica-Bold").fontSize(10).fillColor(RED);
  doc.text(icNameValue, b2 + 10, boxY + headH + 5, { width: bColW - 20 });
  doc.text(icCompanyValue, b2 + 10, boxY + headH + r1 + 5, {
    width: bColW - 20,
  });

  // signature instructions
  const sigX = b2 + 10;
  const sigY = boxY + headH + r1 + r2 + 5;

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(RED)
    .text("Independent Controller Signature:", sigX, sigY, {
      width: bColW - 20,
    });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(RED)
    .text("Insert from independent controller", sigX, doc.y + 2, {
      width: bColW - 20,
    });
  doc.text("signature field in static report.", sigX, doc.y + 2, {
    width: bColW - 20,
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(RED)
    .text("NO NEW SIGNATURE.", sigX, doc.y + 4, { width: bColW - 20 });

  // signed date
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(RED)
    .text(signedDate, b2 + 10, y3 + 4, { width: bColW - 20 });

  // right cell: logo note
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(RED)
    .text("Independent Controller Company Logo:", b3 + 10, boxY + headH + 5, {
      width: bColW - 20,
    });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(RED)
    .text(icLogoNote, b3 + 10, boxY + headH + 20, { width: bColW - 20 });

  footer(doc, 17);
}

// PAGE 19 – 9. KONTROLPUNKT OVERVIEW
// PAGE 19 – 9. KONTROLPUNKT OVERVIEW (Side 18 af 24) - LANDSCAPE
function page19(doc, dynamic) {
  const BLUE = HEADING_COLOR;
  const RED = "#cc0000";
  const LIGHT_LINE = "#cfcfcf";
  const DARK_BORDER = "#333333";

  // Use current page size (because this page is landscape)
  const pageW = doc.page.width;
  const pageH = doc.page.height;

  // This page in your PDF is based on a landscape letter layout (792x612).
  // We scale coordinates so it matches even if you generate A4 landscape.
  const baseW = 792;
  const baseH = 612;
  const sx = pageW / baseW;
  const sy = pageH / baseH;

  // ---- coordinates (from your PDF page 19) ----
  const xL = 54 * sx;
  const contentW = (737.4 - 53.8) * sx; // same visual width as PDF
  const barY = 70.6 * sy;
  const barH = (91.9 - 70.6) * sy;

  const paraY = 104.3 * sy;
  const headingY = 135.3 * sy;

  const line1Y = 149.5 * sy;
  const drawNameY = 151.9 * sy;
  const line2Y = 167.4 * sy;

  const boxY = 167.9 * sy;
  const boxH = (416.0 - 167.9) * sy;

  const greyTextY = 433.7 * sy;
  const redTextY = 488.0 * sy;

  const bottomBlueLineY = 557.8 * sy;

  // =========================
  // 1) Top blue bar
  // =========================
  doc.save().rect(xL, barY, contentW, barH).fill(BLUE).restore();

  doc
    .font("Helvetica-Bold")
    .fontSize(12 * sy)
    .fillColor("white")
    .text("9. KONTROLPUNKT OVERVIEW", xL + 10 * sx, barY + 5 * sy, {
      width: contentW - 20 * sx,
      align: "left",
    });

  // =========================
  // 2) Intro paragraph
  // =========================
  const intro =
    "Any additions will be listed below. read control points from the scanned control plan if the one under point 7 is not used, If there are control points in\n" +
    "point 7, this section must be disregarded.    Insert here your own checkpoint overview";

  doc
    .font("Helvetica")
    .fontSize(10 * sy)
    .fillColor("#555555")
    .text(intro, xL, paraY, {
      width: contentW,
      align: "left",
      lineGap: 2 * sy,
    });

  // =========================
  // 3) Section heading + lines
  // =========================
  doc
    .font("Helvetica-Bold")
    .fontSize(10 * sy)
    .fillColor("black")
    .text("DRAWINGS INDICATING SELECTED INSPECTION POINTS:", xL, headingY, {
      width: contentW,
      align: "left",
    });

  // line under heading
  doc
    .save()
    .lineWidth(1)
    .strokeColor(LIGHT_LINE)
    .moveTo(xL, line1Y)
    .lineTo(xL + contentW, line1Y)
    .stroke()
    .restore();

  // DRAWING NAME: (blue) + File name. (red) on same line
  const drawingNameValue = dynamic.drawingName || "File name.";

  doc
    .font("Helvetica-Bold")
    .fontSize(10 * sy)
    .fillColor(BLUE)
    .text("DRAWING NAME:", xL, drawNameY, { continued: true });

  doc
    .font("Helvetica")
    .fontSize(10 * sy)
    .fillColor(RED)
    .text(" " + drawingNameValue, { continued: false });

  // line before big box
  doc
    .save()
    .lineWidth(1)
    .strokeColor(LIGHT_LINE)
    .moveTo(xL, line2Y)
    .lineTo(xL + contentW, line2Y)
    .stroke()
    .restore();

  // =========================
  // 4) Big marked drawing box
  // =========================
  doc
    .save()
    .lineWidth(1)
    .strokeColor(DARK_BORDER)
    .rect(xL, boxY, contentW, boxH)
    .stroke()
    .restore();

  doc
    .font("Helvetica")
    .fontSize(10 * sy)
    .fillColor(RED)
    .text("marked main drawing", xL + 8 * sx, boxY + 8 * sy);

  // =========================
  // 5) Grey sentence under box
  // =========================
  doc
    .font("Helvetica")
    .fontSize(10 * sy)
    .fillColor("#666666")
    .text(
      "Above there are points indicated where the executor has carried out checks in accordance with the control plan.",
      xL,
      greyTextY,
      { width: contentW, align: "left" }
    );

  // =========================
  // 6) Red instructions block + bottom blue line
  // =========================
  const redBlock =
    "Down here You show the profession and Eurocode specific controlplan first checklist b1-b3 then b4 – b6.\n" +
    "Show the Project managers name in the Responsible collom.\n" +
    "Remember to change the scope (circumference )(%) in the b4 to b6 .\n" +
    "If KK1 or kk2 state 10%\n" +
    "If kk3 or kk4  state 20%\n" +
    "Also remember to show the special text in the construction part Cullom.";

  doc
    .font("Helvetica")
    .fontSize(10 * sy)
    .fillColor(RED)
    .text(redBlock, xL, redTextY, {
      width: contentW,
      align: "left",
      lineGap: 3 * sy,
    });

  // bottom blue line
  doc
    .save()
    .lineWidth(1)
    .strokeColor(BLUE)
    .moveTo(xL, bottomBlueLineY)
    .lineTo(xL + contentW, bottomBlueLineY)
    .stroke()
    .restore();

  // Footer = Side 18 af 24
  footer(doc, 18);
}

// PAGE 20 – 7.1 B1 big table
// PAGE 20 – 7.1 REVIEW OF THE EXECUTION BASIS FROM THE DESIGN B1 (Side 19 af 24) – LANDSCAPE
function page20(doc, dynamic) {
  // Reference page is landscape with coordinate system close to 792x612
  const BASE = { w: 792, h: 612 };

  const sX = doc.page.width / BASE.w;
  const sY = doc.page.height / BASE.h;
  const s = Math.min(sX, sY); // uniform scale

  const oX = (doc.page.width - BASE.w * s) / 2;
  const oY = (doc.page.height - BASE.h * s) / 2;

  const X = (v) => oX + v * s;
  const Y = (v) => oY + v * s;
  const W = (v) => v * s;
  const H = (v) => v * s;

  // Colors
  const BLUE = "#244061";
  const GREY = "#d9d9d9";
  const YELLOW = "#ffff00";
  const TXT_GREY = "#666666";
  const RED = "#c00000";
  const HEADER_TXT = "#1f2e46";
  const BORDER = "#000000";

  // ---------------------------------------
  // Helpers
  // ---------------------------------------
  function rectFill(x, y, w, h, color) {
    doc.save().fillColor(color).rect(X(x), Y(y), W(w), H(h)).fill().restore();
  }

  function rectStroke(x, y, w, h, color = BORDER, lw = 1) {
    doc
      .save()
      .lineWidth(lw * s)
      .strokeColor(color)
      .rect(X(x), Y(y), W(w), H(h))
      .stroke()
      .restore();
  }

  // Standard cell text but clipped to its height (prevents overflow)
  function cellText(x0, y0, w, h, text, style = {}) {
    doc
      .font(style.font || (style.bold ? "Helvetica-Bold" : "Helvetica"))
      .fontSize((style.size || 8) * s)
      .fillColor(style.color || "black")
      .text(String(text ?? ""), X(x0), Y(y0), {
        width: W(w),
        height: H(h),
        lineGap: (style.lineGap != null ? style.lineGap : 1) * s,
        align: style.align || "left",
      });
  }

  // Auto-fit text into a fixed cell height (shrinks only if needed)
  function cellTextFit(x0, y0, w, h, text, style = {}) {
    const font = style.font || (style.bold ? "Helvetica-Bold" : "Helvetica");
    const color = style.color || "black";
    const align = style.align || "left";
    const lineGap = style.lineGap != null ? style.lineGap : 1;

    const maxH = H(h);
    const maxW = W(w);

    let size = style.size || 8;

    for (let i = 0; i < 18; i++) {
      doc.font(font).fontSize(size * s);
      const needed = doc.heightOfString(String(text ?? ""), {
        width: maxW,
        lineGap: lineGap * s,
      });
      if (needed <= maxH) break;
      size -= 0.25;
      if (size < 6) break;
    }

    doc
      .font(font)
      .fontSize(size * s)
      .fillColor(color)
      .text(String(text ?? ""), X(x0), Y(y0), {
        width: maxW,
        height: maxH,
        lineGap: lineGap * s,
        align,
      });
  }

  // ---------------------------------------
  // Top blue bar + title + B1
  // ---------------------------------------
  rectFill(46.56, 54.6, 744.84 - 46.56, 75.96 - 54.6, BLUE);

  cellText(
    54.0,
    58.3,
    744.84 - 54.0 - 70,
    18,
    "7.1 REVIEW OF THE EXECUTION BASIS FROM THE DESIGN",
    {
      bold: true,
      size: 11,
      color: "white",
    }
  );

  cellText(46.56, 58.3, 744.84 - 46.56 - 10, 18, "B1", {
    bold: true,
    size: 11,
    color: "white",
    align: "right",
  });

  // ---------------------------------------
  // Column boundaries (from the PDF)
  // ---------------------------------------
  const COLS = [
    { key: "pos", x0: 46.92, x1: 76.2, title: "POS" },
    { key: "check", x0: 76.2, x1: 141.6, title: "CHECKING THE" },
    { key: "subject", x0: 141.6, x1: 267.0, title: "SUBJECT" },
    { key: "part", x0: 267.0, x1: 351.96, title: "CONSTRUCTION PART" },
    { key: "basis", x0: 351.96, x1: 420.6, title: "BASIS" },
    { key: "method", x0: 420.6, x1: 493.08, title: "CONTROL METHOD" },
    { key: "scope", x0: 493.08, x1: 536.52, title: "SCOPE" },
    { key: "acc", x0: 536.52, x1: 656.4, title: "ACCEPTANCE CRITERIA" },
    { key: "time", x0: 656.4, x1: 699.0, title: "TIME" },
    { key: "control", x0: 699.0, x1: 743.76, title: "CONTROL" },
  ];

  // Header top Y positions (5 blocks)
  const headerYs = [88.44, 146.28, 213.84, 261.96, 309.96];
  const headerH = 13.8;

  // Bottom of the last row block before the yellow legends (from PDF)
  const lastBlockBottom = 357.6;

  // Exact row text (no missing)
  const rows = [
    {
      pos: "7.1.1",
      check: "Self-monitoring",
      subject: "Checking project material",
      part: "Special text",
      basis: "Documented self-\nmonitoring, via\nminutes",
      method: "Review of\nfoundations, visual",
      scope: "100 %",
      acc: "The project review meeting has\nbeen completed, has been\ncomprehensive, has covered all\nrelevant parts and is documented",
      time: "Before\nstart-up",
      control: "IC",
    },
    {
      pos: "7.1.2",
      check: "Follow-up on\nproject material",
      subject:
        "Descriptions, models and construction\ndrawings contain the necessary\ninformation and prerequisites for\nproper work after the project review\nmeeting",
      part: "Special text",
      basis: "Completed in the\ninspection report",
      method: "Review of the\nfoundation Visually.",
      scope: "100%",
      acc: "Deviations and deficiencies found\nduring the project review have\nbeen followed up",
      time: "Before\nstart-up",
      control: "IC",
    },
    {
      pos: "7.1.3",
      check: "Information",
      subject: "Upon receipt of project material",
      part: "Special text",
      basis: "Completed in the\ninspection report",
      method: "Visually",
      scope: "100 %",
      acc: "Is the necessary information\navailable for a condition-based\nbuilding?",
      time: "Before\nstart-up",
      control: "IC",
    },
    {
      pos: "7.1.4",
      check: "Buildability",
      subject: "Upon receipt of project material",
      part: "Special text",
      basis: "Completed in the\ninspection report",
      method: "Review of the\nfoundation Visually.",
      scope: "100 %",
      acc: "Deviations and deficiencies found\nduring the project review have\nbeen followed up",
      time: "Before\nstart-up",
      control: "IC",
    },
    {
      pos: "7.1.5",
      check: "Materials",
      subject: "Upon receipt of project material",
      part: "Special text",
      basis: "Completed in the\ninspection report",
      method: "Review of the\nfoundation Visually.",
      scope: "100 %",
      acc: "Are materials and types, colors,\nclassifications, dimensions clearly\ndescribed?",
      time: "Before\nstart-up",
      control: "IC",
    },
  ];

  // ---------------------------------------
  // Draw each block
  // ---------------------------------------
  const pad = 4;

  for (let i = 0; i < headerYs.length; i++) {
    const hy = headerYs[i];
    const row = rows[i];

    // Grey header rectangles per column
    COLS.forEach((c) => rectFill(c.x0, hy, c.x1 - c.x0, headerH, GREY));

    // Yellow highlight behind header word "SCOPE" and "CONTROL"
    const scopeCol = COLS.find((c) => c.key === "scope");
    const controlCol = COLS.find((c) => c.key === "control");
    rectFill(scopeCol.x0 + 3.0, hy + 2.04, 21.8, 9.72, YELLOW);
    rectFill(controlCol.x0 + 0.24, hy + 2.04, 32.2, 9.72, YELLOW);

    // Header labels
    COLS.forEach((c) => {
      cellText(
        c.x0 + pad,
        hy + 2.3,
        c.x1 - c.x0 - pad * 2,
        headerH - 2,
        c.title,
        {
          bold: true,
          size: 8,
          color: HEADER_TXT,
        }
      );
    });

    // Content area for this block
    const contentY = hy + 16.21;
    const nextTop = i < headerYs.length - 1 ? headerYs[i + 1] : lastBlockBottom;
    const contentH = Math.max(20, nextTop - contentY - 2);

    // Yellow highlight behind SCOPE value + CONTROL value (word-only)
    rectFill(scopeCol.x0 + 3.0, contentY + 0.11, 20.0, 9.72, YELLOW);
    rectFill(controlCol.x0 + 0.24, contentY + 0.11, 6.4, 9.72, YELLOW);

    // POS
    cellText(
      COLS[0].x0 + pad,
      contentY,
      COLS[0].x1 - COLS[0].x0 - pad * 2,
      contentH,
      row.pos,
      {
        size: 8,
        color: "#333333",
      }
    );

    // CHECKING THE (fit, because some rows are 2 lines)
    cellTextFit(
      COLS[1].x0 + pad,
      contentY,
      COLS[1].x1 - COLS[1].x0 - pad * 2,
      contentH,
      row.check,
      {
        size: 8,
        bold: true,
        color: "#555555",
        lineGap: 1,
      }
    );

    // SUBJECT (fit, because row 7.1.2 is long)
    cellTextFit(
      COLS[2].x0 + pad,
      contentY,
      COLS[2].x1 - COLS[2].x0 - pad * 2,
      contentH,
      row.subject,
      {
        size: 8,
        color: TXT_GREY,
        lineGap: 1,
      }
    );

    // CONSTRUCTION PART (red)
    cellText(
      COLS[3].x0 + pad,
      contentY,
      COLS[3].x1 - COLS[3].x0 - pad * 2,
      contentH,
      row.part,
      {
        size: 8,
        color: RED,
      }
    );

    // BASIS (fit)
    cellTextFit(
      COLS[4].x0 + pad,
      contentY,
      COLS[4].x1 - COLS[4].x0 - pad * 2,
      contentH,
      row.basis,
      {
        size: 8,
        color: TXT_GREY,
        lineGap: 1,
      }
    );

    // CONTROL METHOD (fit)
    cellTextFit(
      COLS[5].x0 + pad,
      contentY,
      COLS[5].x1 - COLS[5].x0 - pad * 2,
      contentH,
      row.method,
      {
        size: 8,
        color: TXT_GREY,
        lineGap: 1,
      }
    );

    // SCOPE
    cellText(
      COLS[6].x0 + pad,
      contentY,
      COLS[6].x1 - COLS[6].x0 - pad * 2,
      contentH,
      row.scope,
      {
        size: 8,
        color: "#000000",
      }
    );

    // ACCEPTANCE CRITERIA (fit – this is where you were getting cut)
    cellTextFit(
      COLS[7].x0 + pad,
      contentY,
      COLS[7].x1 - COLS[7].x0 - pad * 2,
      contentH,
      row.acc,
      {
        size: 8,
        color: TXT_GREY,
        lineGap: 1,
      }
    );

    // TIME (fit)
    cellTextFit(
      COLS[8].x0 + pad,
      contentY,
      COLS[8].x1 - COLS[8].x0 - pad * 2,
      contentH,
      row.time,
      {
        size: 8,
        color: TXT_GREY,
        lineGap: 1,
      }
    );

    // CONTROL
    cellText(
      COLS[9].x0 + pad,
      contentY,
      COLS[9].x1 - COLS[9].x0 - pad * 2,
      contentH,
      row.control,
      {
        size: 8,
        color: "#000000",
      }
    );
  }

  // ---------------------------------------
  // Yellow legends (bottom right)
  // ---------------------------------------
  function legendBox(x0, y0, x1, y1, line1, line2) {
    doc
      .save()
      .lineWidth(2 * s)
      .strokeColor(BORDER)
      .fillColor(YELLOW)
      .rect(X(x0), Y(y0), W(x1 - x0), H(y1 - y0))
      .fillAndStroke()
      .restore();

    cellText(x0, y0 + 7, x1 - x0, 14, line1, {
      size: 10,
      color: RED,
      align: "center",
    });
    cellText(x0, y0 + 19, x1 - x0, 14, line2, {
      size: 10,
      color: RED,
      align: "center",
    });
  }

  legendBox(439.08, 357.6, 559.08, 391.56, "Fixed text", "100%");
  legendBox(
    651.0,
    360.6,
    771.0,
    391.56,
    "Fixed text",
    "IC = Independet controler"
  );

  // ---------------------------------------
  // Footer bar (blue, like the PDF)
  // ---------------------------------------
  rectFill(53.04, 557.52, 741.6 - 53.04, 585.0 - 557.52, BLUE);

  cellText(80, 563.3, 200, 14, "Assurement", {
    bold: true,
    size: 10,
    color: "white",
  });

  cellText(
    53.04,
    563.3,
    741.6 - 53.04,
    14,
    "Part of Kvalitetssikring Danmark ApS",
    {
      bold: true,
      size: 9,
      color: "white",
      align: "center",
    }
  );

  // keep wording consistent with your report footer
  cellText(53.04, 563.3, 741.6 - 53.04 - 10, 14, `Side 19 af ${TOTAL_PAGES}`, {
    size: 10,
    color: "white",
    align: "right",
  });
}

// PAGE 21 – 7.2 B2 big table
// PAGE 21 – 7.2 VERIFICATION OF THE BASIS FOR EXECUTION OF THE WORK (B2) – LANDSCAPE
function page21(doc, dynamic) {
  // Base coordinates taken from your PDF page (landscape ~ 792x612)
  const BASE = { w: 792, h: 612 };
  const s = Math.min(doc.page.width / BASE.w, doc.page.height / BASE.h);
  const oX = (doc.page.width - BASE.w * s) / 2;
  const oY = (doc.page.height - BASE.h * s) / 2;

  const X = (v) => oX + v * s;
  const Y = (v) => oY + v * s;
  const W = (v) => v * s;
  const H = (v) => v * s;

  // Colors (matched to PDF)
  const BLUE = "#244061";
  const LIGHT_BLUE = "#5989c1";
  const GREY = "#d9d9d9";
  const YELLOW = "#ffff00";
  const TXT_GREY = "#666666";
  const RED = "#c00000";
  const HEADER_TXT = "#1f2e46";

  // ---------- helpers ----------
  function fillRect(x, y, w, h, color) {
    doc.save().fillColor(color).rect(X(x), Y(y), W(w), H(h)).fill().restore();
  }

  function strokeRect(x, y, w, h, color = "#000", lw = 1) {
    doc
      .save()
      .lineWidth(lw * s)
      .strokeColor(color)
      .rect(X(x), Y(y), W(w), H(h))
      .stroke()
      .restore();
  }

  function cellTextFit(x0, y0, w, h, text, style = {}) {
    const font = style.font || (style.bold ? "Helvetica-Bold" : "Helvetica");
    const color = style.color || "black";
    const align = style.align || "left";
    const lineGap = style.lineGap != null ? style.lineGap : 1;

    const maxW = W(w);
    const maxH = H(h);

    let size = style.size || 8;

    // shrink until it fits the cell height (so NO text is cut)
    for (let i = 0; i < 22; i++) {
      doc.font(font).fontSize(size * s);
      const needed = doc.heightOfString(String(text ?? ""), {
        width: maxW,
        lineGap: lineGap * s,
      });
      if (needed <= maxH) break;
      size -= 0.25;
      if (size < 6) break;
    }

    doc
      .font(font)
      .fontSize(size * s)
      .fillColor(color)
      .text(String(text ?? ""), X(x0), Y(y0), {
        width: maxW,
        height: maxH,
        lineGap: lineGap * s,
        align,
      });
  }

  // ---------- TOP BAR ----------
  // From PDF: x 53.76..737.40, y 54.60..75.96
  fillRect(53.76, 54.6, 737.4 - 53.76, 75.96 - 54.6, BLUE);

  cellTextFit(
    60.9,
    58.4,
    737.4 - 60.9 - 70,
    16,
    "7.2 VERIFICATION OF THE BASIS FOR EXECUTION OF THE WORK",
    { bold: true, size: 11, color: "white" }
  );

  cellTextFit(53.76, 58.4, 737.4 - 53.76 - 10, 16, "B2", {
    bold: true,
    size: 11,
    color: "white",
    align: "right",
  });

  // ---------- TABLE COLS (exact from PDF) ----------
  const COLS = [
    { key: "pos", x0: 54.0, x1: 82.32, title: "POS" },
    { key: "check", x0: 82.32, x1: 146.4, title: "CHECKING THE" },
    { key: "subject", x0: 146.4, x1: 265.68, title: "SUBJECT" },
    { key: "part", x0: 265.68, x1: 350.88, title: "CONSTRUCTION PART" },
    { key: "basis", x0: 350.88, x1: 415.92, title: "BASIS" },
    { key: "method", x0: 415.92, x1: 488.16, title: "CONTROL METHOD" },
    { key: "scope", x0: 488.16, x1: 524.52, title: "SCOPE" },
    { key: "acc", x0: 524.52, x1: 646.56, title: "ACCEPTANCE CRITERIA" },
    { key: "time", x0: 646.56, x1: 695.88, title: "TIME" },
    { key: "control", x0: 695.88, x1: 737.16, title: "CONTROL" },
  ];

  // Header Y positions (6 blocks) from PDF
  const headerYs = [88.44, 156.36, 216.6, 294.36, 372.12, 449.88];
  const headerH = 14.16; // matches 88.44..102.60
  const contentStartOffset = 16.56; // header->content (matches PDF text start)
  const lastBlockEndY = 522.0; // stop before legend boxes

  // Dynamic placeholders (keep exactly like PDF for now)
  const specialText = dynamic.specialText || "Special text";
  const scopeVal = dynamic.scopeVal || "XX%";
  const controlVal = dynamic.controlVal || "IC";

  // Rows (exact text from your PDF)
  const rows = [
    {
      pos: "7.2.1",
      check: "Working drawings,\ninstructions, self-\ncontrol",
      subject:
        "Checking working drawings,\ninstructions and assembly\ninstructions",
      part: specialText,
      basis: "Documented self-\nmonitoring",
      method: "Review of the basis\nVisually",
      scope: scopeVal,
      acc:
        "A self-monitoring report is available\n" +
        "to review whether the basis\n" +
        "contains sufficient information for\n" +
        "correct execution, including\n" +
        "locations and tolerances",
      time: "Before\nstarting\nwork",
      control: controlVal,
    },
    {
      pos: "7.2.2",
      check:
        "Working drawings,\ninstructions and\nassembly\n\nBuildability guides",
      subject:
        "Checking information in working\ndrawings, instructions and\nassembly instructions",
      part: specialText,
      basis: "Documented self-\nmonitoring",
      method: "Review of the basis\nVisually",
      scope: scopeVal,
      acc:
        "A self-control report is available for\n" +
        "a review of whether the basis for\n" +
        "the work is in accordance with the\n" +
        "basis from the design",
      time: "Before\nstarting\nwork",
      control: controlVal,
    },
    {
      pos: "7.2.3",
      check: "Working\nenvironment\nrules",
      subject:
        "Check working drawings, assembly\n" +
        "instructions + Instructions contain\n" +
        "the necessary information and\n" +
        "prerequisites for correct work",
      part: specialText,
      basis: "Documented self-\nmonitoring",
      method: "Review of the basis\nVisually",
      scope: scopeVal,
      acc:
        "The basis for execution of the work\n" +
        "contains the necessary information\n" +
        "(execution classes, material\n" +
        "requirements and tolerances) and\n" +
        "the information is clear,\n" +
        "understandable and accessible",
      time: "Before\nstarting\nwork",
      control: controlVal,
    },
    {
      pos: "7.2.4",
      check: "Comprehension",
      subject:
        "Inspection work drawings, assembly\n" +
        "instructions and instructions contain\n" +
        "the necessary information and\n" +
        "prerequisites for correct work",
      part: specialText,
      basis: "Documented self-\nmonitoring",
      method: "Review of the basis\nVisually",
      scope: scopeVal,
      acc:
        "The basis for execution of the work\n" +
        "contains the necessary information\n" +
        "(execution classes, material\n" +
        "requirements and tolerances) and\n" +
        "the information is clear,\n" +
        "understandable and accessible",
      time:
        "Before the\nwork begins,\n" +
        "to\nunderstand\n" +
        "the project's\n" +
        "structure/exec\n" +
        "ution method.",
      control: controlVal,
    },
    {
      pos: "7.2.5",
      check: "Coordination",
      subject:
        "Checking of working drawings,\n" +
        "assembly instructions and\n" +
        "instructions contain the necessary\n" +
        "information and prerequisites for\n" +
        "correct work",
      part: specialText,
      basis: "Documented self-\nmonitoring",
      method: "Review of the basis\nVisually",
      scope: scopeVal,
      acc:
        "The basis for execution of the work\n" +
        "contains the necessary information\n" +
        "(execution classes, material\n" +
        "requirements and tolerances) and\n" +
        "the information is clear,\n" +
        "understandable and accessible",
      time:
        "Before the\nwork begins,\n" +
        "it\ncoordinated\n" +
        "with the\nconstruction\n" +
        "management",
      control: controlVal,
    },
    {
      pos: "7.2.6",
      check: "Interfaces",
      subject:
        "Checking of working drawings,\n" +
        "assembly instructions and\n" +
        "instructions contain the necessary\n" +
        "information and prerequisites for\n" +
        "correct work",
      part: specialText,
      basis: "Documented self-\nmonitoring",
      method: "Review of the basis\nVisually",
      scope: scopeVal,
      acc:
        "The basis for execution of the work\n" +
        "contains the necessary information\n" +
        "(execution classes, material\n" +
        "requirements and tolerances) and\n" +
        "the information is clear,\n" +
        "understandable and accessible",
      time: "Before work\n" + "begins, interfac\n" + "are aligned.",
      control: controlVal,
    },
  ];

  // highlight sizes from PDF
  const scopeHeaderHL = { x: 488.16, w: 21.6, yOff: 2.4, h: 9.72 };
  const controlHeaderHL = { x: 696.0, w: 32.16, yOff: 2.4, h: 9.72 };
  const scopeValueHL = { x: 488.16, w: 14.04, yOff: 16.68, h: 9.72 };
  const controlValueHL = { x: 696.36, w: 6.24, yOff: 16.68, h: 9.72 };

  const pad = 5;

  // draw blocks
  for (let i = 0; i < headerYs.length; i++) {
    const hy = headerYs[i];
    const row = rows[i];

    // grey headers
    for (const c of COLS) {
      fillRect(c.x0, hy, c.x1 - c.x0, headerH, GREY);
    }

    // yellow highlights for header words (scope/control)
    fillRect(
      scopeHeaderHL.x,
      hy + scopeHeaderHL.yOff,
      scopeHeaderHL.w,
      scopeHeaderHL.h,
      YELLOW
    );
    fillRect(
      controlHeaderHL.x,
      hy + controlHeaderHL.yOff,
      controlHeaderHL.w,
      controlHeaderHL.h,
      YELLOW
    );

    // header labels
    for (const c of COLS) {
      cellTextFit(
        c.x0 + pad,
        hy + 2.2,
        c.x1 - c.x0 - pad * 2,
        headerH - 2,
        c.title,
        { bold: true, size: 8, color: HEADER_TXT }
      );
    }

    // content height for this block
    const contentY = hy + contentStartOffset;
    const blockEnd = i < headerYs.length - 1 ? headerYs[i + 1] : lastBlockEndY;
    const contentH = Math.max(22, blockEnd - contentY - 2);

    // yellow highlights for values (XX% / IC)
    fillRect(
      scopeValueHL.x,
      hy + scopeValueHL.yOff,
      scopeValueHL.w,
      scopeValueHL.h,
      YELLOW
    );
    fillRect(
      controlValueHL.x,
      hy + controlValueHL.yOff,
      controlValueHL.w,
      controlValueHL.h,
      YELLOW
    );

    // cells (auto-fit to never cut text)
    cellTextFit(
      COLS[0].x0 + pad,
      contentY,
      COLS[0].x1 - COLS[0].x0 - pad * 2,
      contentH,
      row.pos,
      { size: 8, color: "#333" }
    );

    cellTextFit(
      COLS[1].x0 + pad,
      contentY,
      COLS[1].x1 - COLS[1].x0 - pad * 2,
      contentH,
      row.check,
      { size: 8, bold: true, color: TXT_GREY }
    );

    cellTextFit(
      COLS[2].x0 + pad,
      contentY,
      COLS[2].x1 - COLS[2].x0 - pad * 2,
      contentH,
      row.subject,
      { size: 8, color: TXT_GREY }
    );

    cellTextFit(
      COLS[3].x0 + pad,
      contentY,
      COLS[3].x1 - COLS[3].x0 - pad * 2,
      contentH,
      row.part,
      { size: 8, color: RED }
    );

    cellTextFit(
      COLS[4].x0 + pad,
      contentY,
      COLS[4].x1 - COLS[4].x0 - pad * 2,
      contentH,
      row.basis,
      { size: 8, color: TXT_GREY }
    );

    cellTextFit(
      COLS[5].x0 + pad,
      contentY,
      COLS[5].x1 - COLS[5].x0 - pad * 2,
      contentH,
      row.method,
      { size: 8, color: TXT_GREY }
    );

    cellTextFit(
      COLS[6].x0 + pad,
      contentY,
      COLS[6].x1 - COLS[6].x0 - pad * 2,
      contentH,
      row.scope,
      { size: 8, color: "#000" }
    );

    cellTextFit(
      COLS[7].x0 + pad,
      contentY,
      COLS[7].x1 - COLS[7].x0 - pad * 2,
      contentH,
      row.acc,
      { size: 8, color: TXT_GREY }
    );

    cellTextFit(
      COLS[8].x0 + pad,
      contentY,
      COLS[8].x1 - COLS[8].x0 - pad * 2,
      contentH,
      row.time,
      { size: 8, color: TXT_GREY }
    );

    cellTextFit(
      COLS[9].x0 + pad,
      contentY,
      COLS[9].x1 - COLS[9].x0 - pad * 2,
      contentH,
      row.control,
      { size: 8, color: "#000" }
    );
  }

  // ---------- LEGEND BOXES (exact positions from PDF) ----------
  // left box: Rect(441.6, 526.8) -> (561.6, 568.2)
  fillRect(441.6, 526.8, 561.6 - 441.6, 568.2 - 526.8, YELLOW);
  strokeRect(441.6, 526.8, 561.6 - 441.6, 568.2 - 526.8, "#000", 2);

  cellTextFit(441.6, 540.5, 561.6 - 441.6, 14, "Scope 10% if KK1 or kk2", {
    size: 10,
    color: RED,
    align: "center",
  });
  cellTextFit(441.6, 552.8, 561.6 - 441.6, 14, "scope 20% if KK3 or KK4", {
    size: 10,
    color: RED,
    align: "center",
  });

  // right box: Rect(657.6, 522.6) -> (777.6, 553.56)
  fillRect(657.6, 522.6, 777.6 - 657.6, 553.56 - 522.6, YELLOW);
  strokeRect(657.6, 522.6, 777.6 - 657.6, 553.56 - 522.6, "#000", 2);

  cellTextFit(657.6, 530.7, 777.6 - 657.6, 14, "Fixed text", {
    size: 10,
    color: RED,
    align: "center",
  });
  cellTextFit(657.6, 543.0, 777.6 - 657.6, 14, "IC = Independet controler", {
    size: 10,
    color: RED,
    align: "center",
  });

  // ---------- FOOTER (blue bar + texts) ----------
  // thin light-blue line (from PDF)
  fillRect(48.36, 557.28, 733.44 - 48.36, 557.76 - 557.28, LIGHT_BLUE);

  // footer bar (from PDF)
  fillRect(53.04, 557.52, 741.6 - 53.04, 585.0 - 557.52, BLUE);

  // left brand
  cellTextFit(80, 563.2, 220, 16, "Assurement", {
    bold: true,
    size: 10,
    color: "white",
  });

  // center
  cellTextFit(
    53.04,
    563.2,
    741.6 - 53.04,
    16,
    "Part of Kvalitetssikring Danmark ApS",
    {
      bold: true,
      size: 9,
      color: "white",
      align: "center",
    }
  );

  // right page number (exact wording in your PDF page)
  cellTextFit(
    53.04,
    563.2,
    741.6 - 53.04 - 10,
    16,
    `Page 20 af ${TOTAL_PAGES}`,
    {
      size: 10,
      color: "white",
      align: "right",
    }
  );
}

// PAGE 22 – 7.3 B3 big table
function page22(doc, dynamic) {
  doc.font("Helvetica").fontSize(12).fillColor("black");
  doc.text("PAGE 22 – placeholder (7.3 B3 table)", M.l, M.t);
  footer(doc, 21);
}

// PAGE 23 – 7.4 B4 table
function page23(doc, dynamic) {
  doc.font("Helvetica").fontSize(12).fillColor("black");
  doc.text("PAGE 23 – placeholder (7.4 B4 table)", M.l, M.t);
  footer(doc, 22);
}

// PAGE 24 – 7.5 B5 table
function page24(doc, dynamic) {
  doc.font("Helvetica").fontSize(12).fillColor("black");
  doc.text("PAGE 24 – placeholder (7.5 B5 table)", M.l, M.t);
  footer(doc, 23);
}

// PAGE 25 – 7.6 B6 table
function page25(doc, dynamic) {
  doc.font("Helvetica").fontSize(12).fillColor("black");
  doc.text("PAGE 25 – placeholder (7.6 B6 table)", M.l, M.t);
  footer(doc, 24);
}

/* ------------------------------------------------------------------
   EXPRESS ROUTES
-------------------------------------------------------------------*/

// Download route – generates and streams the Static Control Report
app.get("/download", (req, res) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="static-control-report.pdf"'
  );

  // Later you can build this dynamic object from MongoDB / other APIs
  const dynamic = {};

  generateStaticControlReport(dynamic, res);
});

// Simple home route
app.get("/", (req, res) => {
  res.send(
    '<h2>Static Control Report PDF</h2><p>Download: <a href="/download">/download</a></p>'
  );
});

// Start server
app.listen(PORT, () => {
  console.log(
    `Static Control Report server running at http://localhost:${PORT}`
  );
});
