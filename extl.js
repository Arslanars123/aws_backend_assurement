const express = require("express");
const PDFDocument = require("pdfkit");
const { MongoClient, ObjectId } = require("mongodb");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

// -------------------- DATABASE CONNECTION --------------------
const localUri = "mongodb://localhost:27017/mughees";
let uri = localUri;
let client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 60000,
  connectTimeoutMS: 60000,
  socketTimeoutMS: 60000,
  maxPoolSize: 10,
  retryWrites: true,
  retryReads: true,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  heartbeatFrequencyMS: 10000,
});
const dbName = "mughees";
let db;

// Connect to MongoDB - Local only
async function connectToMongoDB() {
  const maxRetries = 3;
  let retryCount = 0;

  // Connect to local MongoDB only
  while (retryCount < maxRetries) {
    try {
      console.log(
        `Attempting to connect to local MongoDB (attempt ${
          retryCount + 1
        }/${maxRetries})...`
      );
      uri = localUri;
      const localClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 10,
        retryWrites: true,
        retryReads: true,
      });

      await localClient.connect();
      console.log("Connected to local MongoDB successfully!");
      client = localClient;
      db = client.db(dbName);
      return; // Success, exit the function
    } catch (error) {
      retryCount++;
      console.error(
        `Error connecting to local MongoDB (attempt ${retryCount}/${maxRetries}):`,
        error.message
      );

      if (retryCount >= maxRetries) {
        console.error(
          "Failed to connect to local MongoDB after all retry attempts"
        );
        console.log("Starting server without database connection...");
        return; // Don't exit, let the server start without DB
      }

      // Wait before retrying
      const waitTime = 2000;
      console.log(`Retrying in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

// -------------------- PAGE CONFIG --------------------
const PAGE = { w: 612, h: 792 }; // A4 points
const M = { l: 50, r: 50, t: 50, b: 50 };
const CONTENT_W = PAGE.w - M.l - M.r;

// -------------------- DYNAMIC PLACEHOLDERS --------------------
// NOTE: Dynamic data is now fetched from database in the /download route
// The old static constant below is kept for reference but not used
// const dynamic = {
//   companyInfo: "Own company Adress CVR and contact info.- company setup.",
//   projectName: "Project name – project setup.",
//   constructionPart: "Special text",
//   eurocode: "Eurocode",
//   xNumber: "X number",
//   specialText: "Special text",
//   kkx: "KKX",
//   selectDate: "[Select Date]",
// };

// -------------------- TRANSLATION HELPERS --------------------
// Helper function to call translation API
async function translateTexts(texts, targetLang, sourceLang = "EN") {
  try {
    if (!targetLang) {
      // No translation needed, return original texts as map
      const translationMap = {};
      texts.forEach((text) => {
        translationMap[text] = text;
      });
      return translationMap;
    }

    console.log(`Translating ${texts.length} texts to ${targetLang}...`);
    const response = await axios.post("http://localhost:3000/translate", {
      texts: texts,
      target_lang: targetLang,
      source_lang: sourceLang,
    });

    // Create a map of original -> translated
    const translationMap = {};
    response.data.forEach((item) => {
      translationMap[item.original] = item.translated;
    });

    console.log(
      `Translation completed. ${response.data.length} texts translated.`
    );
    return translationMap;
  } catch (error) {
    console.error("Translation error:", error.message);
    // On error, return original texts
    const translationMap = {};
    texts.forEach((text) => {
      translationMap[text] = text;
    });
    return translationMap;
  }
}

// Helper function to check if a string is a number or date
function isNumberOrDate(str) {
  if (!str || typeof str !== "string") return false;
  const trimmed = str.trim();

  // Check if it's a number (including decimals, negative, with spaces/commas)
  if (/^-?\d+([.,]\d+)?$/.test(trimmed.replace(/[\s,]/g, ""))) {
    return true;
  }

  // Check if it's a date (ISO format, common date formats)
  if (
    /^\d{4}-\d{2}-\d{2}/.test(trimmed) ||
    /^\d{2}\/\d{2}\/\d{4}/.test(trimmed) ||
    /^\d{2}\.\d{2}\.\d{4}/.test(trimmed)
  ) {
    return true;
  }

  // Check if it contains only digits and common separators
  if (
    /^[\d\s\-+().,]+$/.test(trimmed) &&
    trimmed.replace(/[\s\-+().,]/g, "").length > 3
  ) {
    return true;
  }

  return false;
}

// Collect all translatable texts from page 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, and 17 (static + dynamic)
function collectPage1And2And3And4And5And6And7And8And9And10And11And12And13And14And15And16And17Texts(
  dynamicData
) {
  const texts = {
    // Page 1 - Static texts
    "Executing part": "Executing part",
    "Static control plan: ": "Static control plan: ",
    "For those executed within the construction part:":
      "For those executed within the construction part:",
    "Document ID": "Document ID",
    "Applicable EU standards 2024": "Applicable EU standards 2024",
    "Eurocode 0: Design basis for structures":
      "Eurocode 0: Design basis for structures",
    "Eurocode 1: Load on load-bearing structures":
      "Eurocode 1: Load on load-bearing structures",
    "Eurocode 2: Concrete structures": "Eurocode 2: Concrete structures",
    "Eurocode 3: Steel structures": "Eurocode 3: Steel structures",
    "Eurocode 4: Composite Structures": "Eurocode 4: Composite Structures",
    "Eurocode 5: Timber structures": "Eurocode 5: Timber structures",
    "Eurocode 6: Masonry structures": "Eurocode 6: Masonry structures",
    "Eurocode 7: Geotechnical Engineering":
      "Eurocode 7: Geotechnical Engineering",
    "Eurocode 8: Structures in seismic areas":
      "Eurocode 8: Structures in seismic areas",
    "Eurocode 9: Aluminium structures.": "Eurocode 9: Aluminium structures.",
    "EN 1520: Lightweight concrete with porous aggregates":
      "EN 1520: Lightweight concrete with porous aggregates",
    "EN 12602: Aerated concrete": "EN 12602: Aerated concrete",
    "Part of Kvalitetssikring Danmark ApS":
      "Part of Kvalitetssikring Danmark ApS",
    Page: "Page",
    "af 17": "af 17",
    // Labels for company info
    "Name:": "Name:",
    "Address:": "Address:",
    "CVR:": "CVR:",
    "Tel:": "Tel:",

    // Page 2 - Static texts
    "STATIC CONTROL PLAN": "STATIC CONTROL PLAN",
    "For load-bearing structures, cf. DS1140 applies to:":
      "For load-bearing structures, cf. DS1140 applies to:",
    "Construction Part:": "Construction Part:",
    "The control plan is built according to the current EU standard:":
      "The control plan is built according to the current EU standard:",
    "Eurocode:": "Eurocode:",
    "CONSTRUCTION CASE:": "CONSTRUCTION CASE:",
    "Project INFO": "Project INFO",
    "Main Contractor/Custumer": "Main Contractor/Custumer",
    "ID/Case no.": "ID/Case no.",
    Name: "Name",
    Address: "Address",
    "Post no./City.": "Post no./City.",
    "CVR no.": "CVR no.",
    "Contact person": "Contact person",
    "Email.": "Email.",
    Startup: "Startup",
    "Document type": "Document type",
    Version: "Version",
    "Construction class": "Construction class",
    "Static control plan": "Static control plan",
    "Signing:": "Signing:",
    "Same data as static report.": "Same data as static report.",
    Signed: "Signed",
    "Prepared/approved by:": "Prepared/approved by:",
    Company: "Company",
    "Own Control (OC)": "Own Control (OC)",
    "Independent controller (IC)": "Independent controller (IC)",
    "Project setup": "Project setup",
    "Admin – company organization": "Admin – company organization",
    "Project manager– company organization":
      "Project manager– company organization",
    "company organization": "company organization",

    // Page 3 - Static texts
    "Document completion status": "Document completion status",
    "The figure to the right from SBI 271 Item 4.3 indicates which phase you are in in your document submissions, and must also help to ensure that both the contractor and the consultant work proactively to communicate back and forth in connection with any corrections.":
      "The figure to the right from SBI 271 Item 4.3 indicates which phase you are in in your document submissions, and must also help to ensure that both the contractor and the consultant work proactively to communicate back and forth in connection with any corrections.",
    "The document is signed when this has been approved by the structural engineer, until then the document is a dynamic document.":
      "The document is signed when this has been approved by the structural engineer, until then the document is a dynamic document.",
    "Expected approval time 14 days, after which the content of the document is considered approved.":
      "Expected approval time 14 days, after which the content of the document is considered approved.",
    "Status:": "Status:",
    Approval: "Approval",
    "Under Approval": "Under Approval",

    // Page 4 - Static texts
    Content: "Content",
    "Static control plan": "Static control plan",
    "Construction Part:": "Construction Part:",
    "Eurocode:": "Eurocode:",
    "Signing:": "Signing:",
    "1. General": "1. General",
    "1.1 Description of the control work":
      "1.1 Description of the control work",
    "1.2 Control types": "1.2 Control types",
    "1.3 Level of control": "1.3 Level of control",
    "1.4 Organisation of the control work":
      "1.4 Organisation of the control work",
    "1.5 Controllers": "1.5 Controllers",
    "1.6 Use of assistance": "1.6 Use of assistance",
    "1.7 Follow-up on deviations": "1.7 Follow-up on deviations",
    "2. General controls": "2. General controls",
    "2.1 General": "2.1 General",
    "2.2 Control section": "2.2 Control section",
    "2.3 Explanation of the selection of controls":
      "2.3 Explanation of the selection of controls",
    "2.4 Checkpoints": "2.4 Checkpoints",
    "3. Special controls": "3. Special controls",
    "3.1 General": "3.1 General",
    "3.2 Special checkpoints": "3.2 Special checkpoints",
    "4. Documentation": "4. Documentation",
    "4.1 General description of documentation":
      "4.1 General description of documentation",
    "4.2 Documentation of general controls":
      "4.2 Documentation of general controls",
    "4.3 Documentation of special controls":
      "4.3 Documentation of special controls",
    "4.4 Documentation of deviations and follow-up":
      "4.4 Documentation of deviations and follow-up",
    "4.5 Checking Control Documentation": "4.5 Checking Control Documentation",
    "5. Listings": "5. Listings",
    "5.1 Scope of control": "5.1 Scope of control",
    "6. Control points selected": "6. Control points selected",
    "7. Static controls (schematic)": "7. Static controls (schematic)",
    "7.1 Review of the execution basis from the design B1":
      "7.1 Review of the execution basis from the design B1",
    "7.2 Verification of the basis for execution of the work B2":
      "7.2 Verification of the basis for execution of the work B2",
    "7.3 Verification of Documentation of Materials and Products B3":
      "7.3 Verification of Documentation of Materials and Products B3",
    "7.4 RECEIPT CONTROL DELIVERIES B4": "7.4 RECEIPT CONTROL DELIVERIES B4",
    "7.5 PERFORMANCE CONTROL; B5": "7.5 PERFORMANCE CONTROL; B5",
    "7.6 FINAL INSPECTION B6": "7.6 FINAL INSPECTION B6",

    // Page 5 - Static texts
    "1. GENERAL": "1. GENERAL",
    "1.1 Description of the control work":
      "1.1 Description of the control work",
    "This static control plan covers the control for the execution of the construction section mentioned on the front page and associated works. The inspection is carried out in accordance with the building designer's:":
      "This static control plan covers the control for the execution of the construction section mentioned on the front page and associated works. The inspection is carried out in accordance with the building designer's:",
    LISTING: "LISTING",
    DOCUMENT: "DOCUMENT",
    "CONSTRUCTION PART:": "CONSTRUCTION PART:",
    ACCOMPLISHMENT: "ACCOMPLISHMENT",
    "STATIC CONTROL PLAN": "STATIC CONTROL PLAN",
    "Construction part text": "Construction part text",
    "The focus is on seeing between the construction designer's material and the execution of the construction section on the site.":
      "The focus is on seeing between the construction designer's material and the execution of the construction section on the site.",
    "Particular consideration is given to the materials used and their dimensions in reception control, placement on level versus location on site and compliance with tolerances.":
      "Particular consideration is given to the materials used and their dimensions in reception control, placement on level versus location on site and compliance with tolerances.",
    "The following forms the basis for the checks carried out:":
      "The following forms the basis for the checks carried out:",
    "Building Regulations 2018 - BR18": "Building Regulations 2018 - BR18",
    'SBI 271 "Documentation and Control of Load-Bearing Structures"':
      'SBI 271 "Documentation and Control of Load-Bearing Structures"',
    "DS/EN 1990 DK NA:2021 , Annex B5": "DS/EN 1990 DK NA:2021 , Annex B5",
    'DS 1140:2019 "Execution of load-bearing structures – General control"':
      'DS 1140:2019 "Execution of load-bearing structures – General control"',
    'DS/INF 1140:2022 "Guide to DS 1140"':
      'DS/INF 1140:2022 "Guide to DS 1140"',
    "The review is carried out on the basis of the above-mentioned material and the contractor's documented quality assurance system.":
      "The review is carried out on the basis of the above-mentioned material and the contractor's documented quality assurance system.",
    "Procedures are complied with as described in the quality assurance system":
      "Procedures are complied with as described in the quality assurance system",
    "A review of the execution basis from the design phase has been carried out":
      "A review of the execution basis from the design phase has been carried out",
    "The materials used are in accordance with the design basis":
      "The materials used are in accordance with the design basis",
    "The basis for the execution of the work has been controlled/approved and reflects the requirements of the basis for execution from the design":
      "The basis for the execution of the work has been controlled/approved and reflects the requirements of the basis for execution from the design",
    "Employees have the necessary qualifications and competencies":
      "Employees have the necessary qualifications and competencies",
    "Self-monitoring and independent control are described in control plans and carried out as prescribed":
      "Self-monitoring and independent control are described in control plans and carried out as prescribed",
    "Controls are documented in control reports as described":
      "Controls are documented in control reports as described",
    "Deviations are processed according to the procedure for deviations":
      "Deviations are processed according to the procedure for deviations",
    "Documentation of construction as executed is available":
      "Documentation of construction as executed is available",
    "The independent control is carried out by the executor, with the exception of a few of the special control points where the independent control is carried out by the designing organisation. This is because the control requires a certain insight into the static conditions that form the basis for the construction.":
      "The independent control is carried out by the executor, with the exception of a few of the special control points where the independent control is carried out by the designing organisation. This is because the control requires a certain insight into the static conditions that form the basis for the construction.",

    // Page 6 - Static texts
    "1.2 Control types": "1.2 Control types",
    "The structure is classified as ": "The structure is classified as ",
    "construction class ": "construction class ",
    "Self-monitoring and independent control of the work carried out are carried out.":
      "Self-monitoring and independent control of the work carried out are carried out.",
    "There is no requirement for third-party control.":
      "There is no requirement for third-party control.",
    "Self-monitoring": "Self-monitoring",
    "The self-inspection of the execution is carried out by the person who carried out the construction when the construction or parts thereof are completed. Where structural parts are subsequently hidden, the self-inspection is carried out during the execution of the relevant structural part.":
      "The self-inspection of the execution is carried out by the person who carried out the construction when the construction or parts thereof are completed. Where structural parts are subsequently hidden, the self-inspection is carried out during the execution of the relevant structural part.",
    "The own-check includes at least an assessment of whether:":
      "The own-check includes at least an assessment of whether:",
    "The entire construction and all of its parts are actually done.":
      "The entire construction and all of its parts are actually done.",
    "The construction based on a craftsmanship assessment is carried out correctly and is in accordance with good building practice.":
      "The construction based on a craftsmanship assessment is carried out correctly and is in accordance with good building practice.",
    "The construction has been carried out in accordance with the execution basis and agreements with the design and/or construction management on details or other matters that are not stated in the execution basis.":
      "The construction has been carried out in accordance with the execution basis and agreements with the design and/or construction management on details or other matters that are not stated in the execution basis.",
    "Tolerances in the execution are complied with in relation to relevant standards, good practice within the type of work in question (see e.g. tolerancer.dk) and any project-specific tolerances that may appear in the execution basis.":
      "Tolerances in the execution are complied with in relation to relevant standards, good practice within the type of work in question (see e.g. tolerancer.dk) and any project-specific tolerances that may appear in the execution basis.",
    "Documentation of the execution of the construction has been carried out, collected and systematised in accordance with SBi 271 section 2.6, Construction as executed.":
      "Documentation of the execution of the construction has been carried out, collected and systematised in accordance with SBi 271 section 2.6, Construction as executed.",
    "After completion of the self-inspection, the person carrying out the inspection documents this in the current inspection report. Self-monitoring is always carried out.":
      "After completion of the self-inspection, the person carrying out the inspection documents this in the current inspection report. Self-monitoring is always carried out.",
    "Standards:": "Standards:",
    "This section is taken from the Eurocode table here we need an extra field with a static text talking about which standards covering the chosen EUROCODE.":
      "This section is taken from the Eurocode table here we need an extra field with a static text talking about which standards covering the chosen EUROCODE.",
    "Independent controls": "Independent controls",
    "The independent inspection shall be carried out by persons who have not directly participated in the actual performance of the inspection section in question. All independent checks within a control section are carried out by the same person. The independent inspector is not carried out by the head of the work team, The independent inspector must have the necessary competencies that allow him to have knowledge within the chosen construction section that is stated on the front page.":
      "The independent inspection shall be carried out by persons who have not directly participated in the actual performance of the inspection section in question. All independent checks within a control section are carried out by the same person. The independent inspector is not carried out by the head of the work team, The independent inspector must have the necessary competencies that allow him to have knowledge within the chosen construction section that is stated on the front page.",
    "When the performance of an inspection section or parts thereof has been carried out and the performer has been ready for independent control (i.e. after self-monitoring has been carried out), the independent inspection is carried out.":
      "When the performance of an inspection section or parts thereof has been carried out and the performer has been ready for independent control (i.e. after self-monitoring has been carried out), the independent inspection is carried out.",
    "The independent control is carried out according to the project-specific static control plan for execution.":
      "The independent control is carried out according to the project-specific static control plan for execution.",
    "1.3 Level of control": "1.3 Level of control",
    "The level of control for the general control is governed by the selected execution classes, cf. DS/EN 1990 DK NA, Annex B5.":
      "The level of control for the general control is governed by the selected execution classes, cf. DS/EN 1990 DK NA, Annex B5.",
    "The execution class is ": "The execution class is ",
    " and Self-control is performed as a maximum control. The independent control is carried out as a random and maximum control.":
      " and Self-control is performed as a maximum control. The independent control is carried out as a random and maximum control.",
    "Performance classes indicate the importance of the design for the safety of a load-bearing structure:":
      "Performance classes indicate the importance of the design for the safety of a load-bearing structure:",
    "EXC1: The design has limited impact on the safety of a load-bearing structure":
      "EXC1: The design has limited impact on the safety of a load-bearing structure",
    "EXC2: The execution is important for the safety of a load-bearing structure":
      "EXC2: The execution is important for the safety of a load-bearing structure",
    "EXC3: The execution is of great importance for the safety of a load-bearing structure.":
      "EXC3: The execution is of great importance for the safety of a load-bearing structure.",

    // Page 7 - Static texts
    "1.4 Organisation of the control work":
      "1.4 Organisation of the control work",
    "Each inspection section must be assigned one, and only one inspector who is ensured that he has not contributed to the execution of the construction section in question. The executing party or its representative has drawn up the control plan and will act as the lead inspector in connection with the selection of inspectors for the individual control sections, as well as compiling and checking the inspection report. As far as possible... the aim is that the lead inspector also carries out the actual inspection on site in order to simplify the inspection work.":
      "Each inspection section must be assigned one, and only one inspector who is ensured that he has not contributed to the execution of the construction section in question. The executing party or its representative has drawn up the control plan and will act as the lead inspector in connection with the selection of inspectors for the individual control sections, as well as compiling and checking the inspection report. As far as possible... the aim is that the lead inspector also carries out the actual inspection on site in order to simplify the inspection work.",
    "1.5 Controllers": "1.5 Controllers",
    "The independent inspection is carried out by an operator who has not acted as the executor on the site.":
      "The independent inspection is carried out by an operator who has not acted as the executor on the site.",
    "Controls are carried out by the same organisation as the executing organisation.":
      "Controls are carried out by the same organisation as the executing organisation.",
    "It is ensured that the inspector has the right and necessary skills to carry out the inspection.":
      "It is ensured that the inspector has the right and necessary skills to carry out the inspection.",
    "Inspectors must always have the necessary qualifications acquired through training and the necessary competences acquired through experience both in relation to the subject of the inspection and in planning, carrying out and documenting the inspection.":
      "Inspectors must always have the necessary qualifications acquired through training and the necessary competences acquired through experience both in relation to the subject of the inspection and in planning, carrying out and documenting the inspection.",
    "Therefore, the inspector must at least":
      "Therefore, the inspector must at least",
    "be familiar with best practices for the execution of the relevant structural parts and construction sections.":
      "be familiar with best practices for the execution of the relevant structural parts and construction sections.",
    "Have the ability to create an overview and wonder":
      "Have the ability to create an overview and wonder",
    "Have knowledge of your own limitations and make use of professional experts for parts of the control task":
      "Have knowledge of your own limitations and make use of professional experts for parts of the control task",
    "Have competencies at least equivalent to those of the person who has performed the work":
      "Have competencies at least equivalent to those of the person who has performed the work",
    "Have professional qualifications and competencies for carrying out the construction work":
      "Have professional qualifications and competencies for carrying out the construction work",
    "Be able to understand standards, control plans and good craftsmanship":
      "Be able to understand standards, control plans and good craftsmanship",
    "Be able to familiarize themselves with the documents that form the basis for the execution":
      "Be able to familiarize themselves with the documents that form the basis for the execution",
    "In order to document the examiner's qualifications and competences, his/her competences are described in detail in the inspection report, e.g. in the examiner's CV.":
      "In order to document the examiner's qualifications and competences, his/her competences are described in detail in the inspection report, e.g. in the examiner's CV.",
    Applier: "Applier",
    Name: "Name",
    Initials: "Initials",
    "Own Controller": "Own Controller",
    "OC Fixed": "OC Fixed",
    "Independent controller": "Independent controller",
    "IC Fixed": "IC Fixed",
    "From Company organisation": "From Company organisation",
    "1.6 Use of assistance": "1.6 Use of assistance",
    "If the inspector chooses to use assistance in carrying out the inspection, the assistant inspector must have at least the competencies described in section 1.2 above. In addition, it is important to be aware that the final responsibility for the inspection at all times rests with the inspector and is therefore not transferred to the assistant inspector. The inspector must therefore follow up on inspections carried out by assistant inspectors and ensure that the inspection has been carried out sensibly by checking the documentation for the inspection and sign this as the inspector.":
      "If the inspector chooses to use assistance in carrying out the inspection, the assistant inspector must have at least the competencies described in section 1.2 above. In addition, it is important to be aware that the final responsibility for the inspection at all times rests with the inspector and is therefore not transferred to the assistant inspector. The inspector must therefore follow up on inspections carried out by assistant inspectors and ensure that the inspection has been carried out sensibly by checking the documentation for the inspection and sign this as the inspector.",
    "1.7 Follow-up on deviations": "1.7 Follow-up on deviations",
    "If deviations are found in the controls, the following procedure shall be followed:":
      "If deviations are found in the controls, the following procedure shall be followed:",
    "The work on the structural part is stopped and may not be continued until the deviation has been corrected.":
      "The work on the structural part is stopped and may not be continued until the deviation has been corrected.",
    "The inspector prepares a non-conformance report, which may include illustrations of the non-conformity and proposed solutions.":
      "The inspector prepares a non-conformance report, which may include illustrations of the non-conformity and proposed solutions.",
    "The inspector assesses, together with the executors, whether the defect is of a nature that makes it necessary to reassess the working basis for the execution and the associated controls.":
      "The inspector assesses, together with the executors, whether the defect is of a nature that makes it necessary to reassess the working basis for the execution and the associated controls.",
    "The inspector assesses, together with the executors, the implications of the deviation for the further execution and suitability in relation to the intended purpose of the design.":
      "The inspector assesses, together with the executors, the implications of the deviation for the further execution and suitability in relation to the intended purpose of the design.",
    "The verifier assesses, together with the performing measures, the necessary measures to make the component acceptable.":
      "The verifier assesses, together with the performing measures, the necessary measures to make the component acceptable.",
    "The inspector assesses, together with the contractors, the necessity of rejecting and replacing the non-repairable building part.":
      "The inspector assesses, together with the contractors, the necessity of rejecting and replacing the non-repairable building part.",
    "After rectifying the deviation, this is checked again and the result is documented.":
      "After rectifying the deviation, this is checked again and the result is documented.",
    "If it is not possible to correct the deviation, the building designer must approve the deviation.":
      "If it is not possible to correct the deviation, the building designer must approve the deviation.",
    "If there are serious or more repeated errors in a control point, the control can be extended to a maximum control of the current control point and/or the building designer can be involved.":
      "If there are serious or more repeated errors in a control point, the control can be extended to a maximum control of the current control point and/or the building designer can be involved.",

    // Page 8 - Static texts
    "2. GENERAL CONTROLS": "2. GENERAL CONTROLS",
    "2.1 General": "2.1 General",
    "The general control is carried out in accordance with the Construction standard DS 1140. In addition, the general control is carried out in accordance with the rules of DS/EN 1992-DS/EN 1999 including the associated national annexes and in accordance with the rules of the related execution standards including the corresponding national application documents.":
      "The general control is carried out in accordance with the Construction standard DS 1140. In addition, the general control is carried out in accordance with the rules of DS/EN 1992-DS/EN 1999 including the associated national annexes and in accordance with the rules of the related execution standards including the corresponding national application documents.",
    "The general control is carried out on the basis of the division in DS 1140, Annex B.":
      "The general control is carried out on the basis of the division in DS 1140, Annex B.",
    "Control subject": "Control subject",
    "B.1 Execution basis from design": "B.1 Execution basis from design",
    "B.2 Basis for execution of the work":
      "B.2 Basis for execution of the work",
    "B.3 The material and products": "B.3 The material and products",
    "B.4 Reception control": "B.4 Reception control",
    "B.5 Execution": "B.5 Execution",
    "   B.5.1 Transport and storage on site":
      "   B.5.1 Transport and storage on site",
    "   B.5.2 Previously completed construction":
      "   B.5.2 Previously completed construction",
    "   B.5.3 Assembly of prefabricated structural parts":
      "   B.5.3 Assembly of prefabricated structural parts",
    "   B.5.4 Execution of non-certified structural parts":
      "   B.5.4 Execution of non-certified structural parts",
    "B.6 Final inspection": "B.6 Final inspection",
    "The independent verification that the own-check has been carried out is always carried out as a maximum control.":
      "The independent verification that the own-check has been carried out is always carried out as a maximum control.",
    "Explanation of B.5.2 to B.5.4:": "Explanation of B.5.2 to B.5.4:",
    "When constructing structures that are of critical importance to the functioning and integrity of the structure,":
      "When constructing structures that are of critical importance to the functioning and integrity of the structure,",
    "Control points are fully checked (maximum) for:":
      "Control points are fully checked (maximum) for:",
    "Presence of structural parts": "Presence of structural parts",
    "Presence of joint parts": "Presence of joint parts",
    "Remuneration depths for assembly of prefabricated structural parts":
      "Remuneration depths for assembly of prefabricated structural parts",
    "The subsoil for geotechnical constructions with regard to whether the soil is as assumed in the execution basis from the design stage.":
      "The subsoil for geotechnical constructions with regard to whether the soil is as assumed in the execution basis from the design stage.",
    "2.2 Control section": "2.2 Control section",
    "The delimited design section is subdivided into control sections according to e.g. construction types, scope or time of execution, however, common to the fact that control sections must always be well defined, delimited in relation to other control sections and delimited by a continuous production period of a maximum of 4 weeks.":
      "The delimited design section is subdivided into control sections according to e.g. construction types, scope or time of execution, however, common to the fact that control sections must always be well defined, delimited in relation to other control sections and delimited by a continuous production period of a maximum of 4 weeks.",
    "The execution of the construction section is divided according to the tender control plan for the following control sections:":
      "The execution of the construction section is divided according to the tender control plan for the following control sections:",
    "2.3 Explanation of the selection of controls":
      "2.3 Explanation of the selection of controls",
    "As this construction section is placed in construction class ":
      "As this construction section is placed in construction class ",
    ", the selected control points must be explained. This is done in connection with the inspection report.":
      ", the selected control points must be explained. This is done in connection with the inspection report.",
    "2.4 Checkpoints": "2.4 Checkpoints",
    "Control points are stated in the control plan prepared by the executing contractor.":
      "Control points are stated in the control plan prepared by the executing contractor.",

    // Page 9 - Static texts
    "3. SPECIAL CONTROLS": "3. SPECIAL CONTROLS",
    "3.1 General": "3.1 General",
    "There are no special controls assigned by the building designers, cf.  This construction section.":
      "There are no special controls assigned by the building designers, cf.  This construction section.",
    "Should there be special controls, they will be stated in section 3.2":
      "Should there be special controls, they will be stated in section 3.2",
    "3.2 Special checkpoints": "3.2 Special checkpoints",
    "Cf. section 3.1, no special controls are required.":
      "Cf. section 3.1, no special controls are required.",
    "If there are special checks, it will be stated below in the form, otherwise there will be none.":
      "If there are special checks, it will be stated below in the form, otherwise there will be none.",
    "Data from Special Control points - IF Any":
      "Data from Special Control points - IF Any",
    ID: "ID",
    "SPECIAL CONTROL": "SPECIAL CONTROL",
    DESCRIPTION: "DESCRIPTION",
    "4. DOCUMENTATION": "4. DOCUMENTATION",
    "4.1 General description of documentation":
      "4.1 General description of documentation",
    "The documentation of the control consists of this control plan and associated appendices for the present construction section. In addition, this also consists of an inspection report and associated appendices.":
      "The documentation of the control consists of this control plan and associated appendices for the present construction section. In addition, this also consists of an inspection report and associated appendices.",
    "Document:": "Document:",
    "The above is updated every time a change occurs in the execution.":
      "The above is updated every time a change occurs in the execution.",
    "Documentation contains the actual control result, but also contains a follow-up on the control, including an account of the points where there have been comments from the control in relation to how the comment has been followed up.":
      "Documentation contains the actual control result, but also contains a follow-up on the control, including an account of the points where there have been comments from the control in relation to how the comment has been followed up.",
    "4.2 Documentation of general controls":
      "4.2 Documentation of general controls",
    "The general control is documented in accordance with the requirements specified in the control plans.":
      "The general control is documented in accordance with the requirements specified in the control plans.",
    "Documentation of general controls consists of a completed control report, with all points clarified, approved and signed by the examiner. Deviations must be documented to be remedied by a deviation report, and the item in the control report cannot be approved until the deviation report has been completed.":
      "Documentation of general controls consists of a completed control report, with all points clarified, approved and signed by the examiner. Deviations must be documented to be remedied by a deviation report, and the item in the control report cannot be approved until the deviation report has been completed.",
    "The documentation for the general control is kept with the contractor. Documentation is stored for at least 5 years after the occupancy permit.":
      "The documentation for the general control is kept with the contractor. Documentation is stored for at least 5 years after the occupancy permit.",
    "4.3 Documentation of special controls":
      "4.3 Documentation of special controls",
    "In its documentation, the building designer has not required any special controls.":
      "In its documentation, the building designer has not required any special controls.",
    "4.4 Documentation of deviations and follow-up":
      "4.4 Documentation of deviations and follow-up",
    "If, in the course of the general or special control, deviations are detected, this shall be noted in the control scheme for that control point in the static report.":
      "If, in the course of the general or special control, deviations are detected, this shall be noted in the control scheme for that control point in the static report.",
    "4.5 Checking Control Documentation": "4.5 Checking Control Documentation",
    "The control documentation is collected and reviewed by the inspector and it is ensured that all documents are present, as well as all controls are completed, dated and signed.":
      "The control documentation is collected and reviewed by the inspector and it is ensured that all documents are present, as well as all controls are completed, dated and signed.",

    // Page 10 - Static texts
    "5. LISTINGS": "5. LISTINGS",
    "The naming of the documents above is determined by the building designer.":
      "The naming of the documents above is determined by the building designer.",
    "The above documents will be part of the overall static documentation for the section of this construction when the work is completed.":
      "The above documents will be part of the overall static documentation for the section of this construction when the work is completed.",
    "See also the table further down in the control plan under section 7.1.":
      "See also the table further down in the control plan under section 7.1.",
    "5.1 Scope of control": "5.1 Scope of control",
    "The scope of controls is stated in the tables under section 7.1 and is determined on the basis of which (classes) the Structural Engineer has stated in the project material.":
      "The scope of controls is stated in the tables under section 7.1 and is determined on the basis of which (classes) the Structural Engineer has stated in the project material.",

    // Page 11 - Static texts
    "6. CONTROL POINTS SELECTED": "6. CONTROL POINTS SELECTED",
    "OVERVIEW:": "OVERVIEW:",
    "DRAWINGS INDICATING SELECTED INSPECTION POINTS :":
      "DRAWINGS INDICATING SELECTED INSPECTION POINTS :",
    "DRAWING NAME : ": "DRAWING NAME : ",
    "Marked main drawing .": "Marked main drawing .",
    "(Image could not be loaded)": "(Image could not be loaded)",
    "Above are points indicated where the executor intends to carry out inspections.":
      "Above are points indicated where the executor intends to carry out inspections.",
    "(If no comment is received on this within 8 days, this is considered approved)":
      "(If no comment is received on this within 8 days, this is considered approved)",

    // Page 12 - Static texts
    "7. STATIC CONTROLS (SCHEMATIC)": "7. STATIC CONTROLS (SCHEMATIC)",
    "In the form below, control has been carried out of the project material that has been handed out when awarding awards, and forms the basis for the intended and executed work, which is a dynamic process until delivery.":
      "In the form below, control has been carried out of the project material that has been handed out when awarding awards, and forms the basis for the intended and executed work, which is a dynamic process until delivery.",
    "Standards and norms:": "Standards and norms:",
    "DS/EN 13670: Execution of concrete structures DI Denmark":
      "DS/EN 13670: Execution of concrete structures DI Denmark",
    "DS/EN 206: Concrete – Specification, Properties, Manufacture and Conformity DS1140 Load-Bearing Structures":
      "DS/EN 206: Concrete – Specification, Properties, Manufacture and Conformity DS1140 Load-Bearing Structures",

    // Page 13 - Static texts
    "7.1 REVIEW OF THE EXECUTION BASIS FROM THE DESIGN B1":
      "7.1 REVIEW OF THE EXECUTION BASIS FROM THE DESIGN B1",
    POS: "POS",
    "CHECKING THE": "CHECKING THE",
    SUBJECT: "SUBJECT",
    "CONSTRUCTION PART": "CONSTRUCTION PART",
    BASIS: "BASIS",
    "CONTROL METHOD": "CONTROL METHOD",
    SCOPE: "SCOPE",
    "ACCEPTANCE CRITERIA": "ACCEPTANCE CRITERIA",
    "TIME CONTROL": "TIME CONTROL",

    // Page 14 - Static texts
    "7.2 VERIFICATION OF THE BASIS FOR EXECUTION OF THE WORK B2":
      "7.2 VERIFICATION OF THE BASIS FOR EXECUTION OF THE WORK B2",

    // Page 15 - Static texts
    "7.3 VERIFICATION OF DOCUMENTATION OF MATERIALS AND PRODUCTS B3":
      "7.3 VERIFICATION OF DOCUMENTATION OF MATERIALS AND PRODUCTS B3",

    // Page 16 - Static texts
    "7.4 RECEIPT CONTROL DELIVERIES B4": "7.4 RECEIPT CONTROL DELIVERIES B4",
    "Planned Sample Checks": "Planned Sample Checks",

    // Page 17 - Static texts
    "7.5 PERFORMANCE CONTROL; B5": "7.5 PERFORMANCE CONTROL; B5",

    // Page 18 - Static texts
    "7.6 FINAL INSPECTION B6": "7.6 FINAL INSPECTION B6",
  };

  // Add dynamic texts (excluding numbers and dates)
  if (dynamicData) {
    // Page 1 dynamic texts
    // Company name
    if (
      dynamicData.company?.name &&
      !isNumberOrDate(dynamicData.company.name)
    ) {
      texts[dynamicData.company.name] = dynamicData.company.name;
    }

    // Company address
    if (
      dynamicData.company?.address &&
      !isNumberOrDate(dynamicData.company.address)
    ) {
      texts[dynamicData.company.address] = dynamicData.company.address;
    }

    // Project name
    if (dynamicData.projectName && !isNumberOrDate(dynamicData.projectName)) {
      texts[dynamicData.projectName] = dynamicData.projectName;
    }

    // Special text / Construction Part
    if (dynamicData.specialText && !isNumberOrDate(dynamicData.specialText)) {
      texts[dynamicData.specialText] = dynamicData.specialText;
    }
    if (
      dynamicData.constructionPart &&
      !isNumberOrDate(dynamicData.constructionPart)
    ) {
      texts[dynamicData.constructionPart] = dynamicData.constructionPart;
    }

    // Eurocode (if it's text, not just a number)
    if (dynamicData.eurocode && !isNumberOrDate(dynamicData.eurocode)) {
      texts[dynamicData.eurocode] = dynamicData.eurocode;
    }

    // Page 2 dynamic texts
    const project = dynamicData.project || {};
    const mainUser = dynamicData.mainUser || {};

    // Project case number (if text)
    const caseNumber =
      project.caseNumber || project.case_number || project.projectNumber;
    if (caseNumber && !isNumberOrDate(caseNumber)) {
      texts[caseNumber] = caseNumber;
    }

    // Project address
    if (project.address && !isNumberOrDate(project.address)) {
      texts[project.address] = project.address;
    }

    // Project postal code + city (combined)
    if (project.postalCode && project.city) {
      const postCity = `${project.postalCode} ${project.city}`;
      if (!isNumberOrDate(postCity)) {
        texts[postCity] = postCity;
      }
    } else if (project.postalCode && !isNumberOrDate(project.postalCode)) {
      texts[project.postalCode] = project.postalCode;
    } else if (project.city && !isNumberOrDate(project.city)) {
      texts[project.city] = project.city;
    }

    // Project contact person
    if (project.contactPerson && !isNumberOrDate(project.contactPerson)) {
      texts[project.contactPerson] = project.contactPerson;
    }

    // Main user name
    if (mainUser.name && !isNumberOrDate(mainUser.name)) {
      texts[mainUser.name] = mainUser.name;
    }

    // Main user address
    if (mainUser.address && !isNumberOrDate(mainUser.address)) {
      texts[mainUser.address] = mainUser.address;
    }

    // Main user postal code + city
    if (mainUser.postalCode && mainUser.city) {
      const mainUserPostCity = `${mainUser.postalCode} ${mainUser.city}`;
      if (!isNumberOrDate(mainUserPostCity)) {
        texts[mainUserPostCity] = mainUserPostCity;
      }
    } else if (mainUser.postalCode && !isNumberOrDate(mainUser.postalCode)) {
      texts[mainUser.postalCode] = mainUser.postalCode;
    } else if (mainUser.city && !isNumberOrDate(mainUser.city)) {
      texts[mainUser.city] = mainUser.city;
    }

    // Main user email
    if (mainUser.email && !isNumberOrDate(mainUser.email)) {
      texts[mainUser.email] = mainUser.email;
    }

    // Main user contact person
    if (mainUser.contactPerson && !isNumberOrDate(mainUser.contactPerson)) {
      texts[mainUser.contactPerson] = mainUser.contactPerson;
    }

    // Signature names
    const signatures = dynamicData.signatures || {};
    [1, 2, 3].forEach((sigType) => {
      const sig = signatures[sigType] || signatures[String(sigType)];
      if (sig?.name && !isNumberOrDate(sig.name)) {
        texts[sig.name] = sig.name;
      }
    });

    // Company name (for signing section)
    const company = dynamicData.company || {};
    if (company.name && !isNumberOrDate(company.name)) {
      texts[company.name] = company.name;
    }

    // Page 5 dynamic texts
    // Listing value (e.g., "B2. X number")
    if (dynamicData.listingValue && !isNumberOrDate(dynamicData.listingValue)) {
      texts[dynamicData.listingValue] = dynamicData.listingValue;
    } else {
      // Handle "B2. X number" format
      const xNumber = dynamicData.xNumber || "X number";
      if (xNumber && !isNumberOrDate(xNumber)) {
        const listingValue = `B2. ${xNumber}`;
        texts[listingValue] = listingValue;
      }
    }

    // Document value
    if (
      dynamicData.documentValue &&
      !isNumberOrDate(dynamicData.documentValue)
    ) {
      texts[dynamicData.documentValue] = dynamicData.documentValue;
    }

    // Construction value (already collected above)

    // Accomplishment value
    if (
      dynamicData.accomplishmentValue &&
      !isNumberOrDate(dynamicData.accomplishmentValue)
    ) {
      texts[dynamicData.accomplishmentValue] = dynamicData.accomplishmentValue;
    }

    // Page 3 dynamic texts
    // Status label
    if (
      dynamicData.page3StatusLabel &&
      !isNumberOrDate(dynamicData.page3StatusLabel)
    ) {
      texts[dynamicData.page3StatusLabel] = dynamicData.page3StatusLabel;
    }

    // Status line 1 (extract text part, not date)
    if (dynamicData.page3StatusLine1) {
      // Try to extract text part (after date)
      const statusLine1 = dynamicData.page3StatusLine1;
      // Check if it contains a date pattern and text
      const dateMatch = statusLine1.match(/^\d{2}-\d{2}-\d{4}\s+(.+)$/);
      if (dateMatch && dateMatch[1]) {
        const textPart = dateMatch[1].trim();
        if (textPart && !isNumberOrDate(textPart)) {
          texts[textPart] = textPart;
        }
      } else if (!isNumberOrDate(statusLine1)) {
        // If no date pattern, treat whole string as text
        texts[statusLine1] = statusLine1;
      }
    }

    // Page 13 dynamic texts - B1 rows data
    if (dynamicData.b1Rows && Array.isArray(dynamicData.b1Rows)) {
      dynamicData.b1Rows.forEach((row) => {
        // Collect translatable text fields (excluding numbers and dates)
        if (row.checkingThe && !isNumberOrDate(row.checkingThe)) {
          texts[row.checkingThe] = row.checkingThe;
        }
        if (row.subject && !isNumberOrDate(row.subject)) {
          texts[row.subject] = row.subject;
        }
        if (row.constructionPart && !isNumberOrDate(row.constructionPart)) {
          texts[row.constructionPart] = row.constructionPart;
        }
        if (row.basis && !isNumberOrDate(row.basis)) {
          texts[row.basis] = row.basis;
        }
        if (row.method && !isNumberOrDate(row.method)) {
          texts[row.method] = row.method;
        }
        if (row.acceptance && !isNumberOrDate(row.acceptance)) {
          texts[row.acceptance] = row.acceptance;
        }
        if (row.timeControl && !isNumberOrDate(row.timeControl)) {
          texts[row.timeControl] = row.timeControl;
        }
      });
    }

    // Page 14 dynamic texts - B2 rows data
    if (dynamicData.b2Rows && Array.isArray(dynamicData.b2Rows)) {
      dynamicData.b2Rows.forEach((row) => {
        // Collect translatable text fields (excluding numbers and dates)
        if (row.checkingThe && !isNumberOrDate(row.checkingThe)) {
          texts[row.checkingThe] = row.checkingThe;
        }
        if (row.subject && !isNumberOrDate(row.subject)) {
          texts[row.subject] = row.subject;
        }
        if (row.constructionPart && !isNumberOrDate(row.constructionPart)) {
          texts[row.constructionPart] = row.constructionPart;
        }
        if (row.basis && !isNumberOrDate(row.basis)) {
          texts[row.basis] = row.basis;
        }
        if (row.method && !isNumberOrDate(row.method)) {
          texts[row.method] = row.method;
        }
        if (row.acceptance && !isNumberOrDate(row.acceptance)) {
          texts[row.acceptance] = row.acceptance;
        }
        if (row.timeControl && !isNumberOrDate(row.timeControl)) {
          texts[row.timeControl] = row.timeControl;
        }
      });
    }

    // Page 15 dynamic texts - B3 rows data
    if (dynamicData.b3Rows && Array.isArray(dynamicData.b3Rows)) {
      dynamicData.b3Rows.forEach((row) => {
        // Collect translatable text fields (excluding numbers and dates)
        if (row.checkingThe && !isNumberOrDate(row.checkingThe)) {
          texts[row.checkingThe] = row.checkingThe;
        }
        if (row.subject && !isNumberOrDate(row.subject)) {
          texts[row.subject] = row.subject;
        }
        if (row.constructionPart && !isNumberOrDate(row.constructionPart)) {
          texts[row.constructionPart] = row.constructionPart;
        }
        if (row.basis && !isNumberOrDate(row.basis)) {
          texts[row.basis] = row.basis;
        }
        if (row.method && !isNumberOrDate(row.method)) {
          texts[row.method] = row.method;
        }
        if (row.acceptance && !isNumberOrDate(row.acceptance)) {
          texts[row.acceptance] = row.acceptance;
        }
        if (row.timeControl && !isNumberOrDate(row.timeControl)) {
          texts[row.timeControl] = row.timeControl;
        }
      });
    }

    // Page 16 dynamic texts - B5 rows data
    if (dynamicData.b5Rows && Array.isArray(dynamicData.b5Rows)) {
      dynamicData.b5Rows.forEach((row) => {
        // Collect translatable text fields (excluding numbers and dates)
        if (row.checkingThe && !isNumberOrDate(row.checkingThe)) {
          texts[row.checkingThe] = row.checkingThe;
        }
        if (row.subject && !isNumberOrDate(row.subject)) {
          texts[row.subject] = row.subject;
        }
        if (row.constructionPart && !isNumberOrDate(row.constructionPart)) {
          texts[row.constructionPart] = row.constructionPart;
        }
        if (row.basis && !isNumberOrDate(row.basis)) {
          texts[row.basis] = row.basis;
        }
        if (row.method && !isNumberOrDate(row.method)) {
          texts[row.method] = row.method;
        }
        if (row.acceptance && !isNumberOrDate(row.acceptance)) {
          texts[row.acceptance] = row.acceptance;
        }
        if (row.timeControl && !isNumberOrDate(row.timeControl)) {
          texts[row.timeControl] = row.timeControl;
        }
      });
    }

    // Page 17 dynamic texts - B6 rows data
    if (dynamicData.b6Rows && Array.isArray(dynamicData.b6Rows)) {
      dynamicData.b6Rows.forEach((row) => {
        // Collect translatable text fields (excluding numbers and dates)
        if (row.checkingThe && !isNumberOrDate(row.checkingThe)) {
          texts[row.checkingThe] = row.checkingThe;
        }
        if (row.subject && !isNumberOrDate(row.subject)) {
          texts[row.subject] = row.subject;
        }
        if (row.constructionPart && !isNumberOrDate(row.constructionPart)) {
          texts[row.constructionPart] = row.constructionPart;
        }
        if (row.basis && !isNumberOrDate(row.basis)) {
          texts[row.basis] = row.basis;
        }
        if (row.method && !isNumberOrDate(row.method)) {
          texts[row.method] = row.method;
        }
        if (row.acceptance && !isNumberOrDate(row.acceptance)) {
          texts[row.acceptance] = row.acceptance;
        }
        if (row.timeControl && !isNumberOrDate(row.timeControl)) {
          texts[row.timeControl] = row.timeControl;
        }
      });
    }

    // Page 18 dynamic texts - B7 rows data
    if (dynamicData.b7Rows && Array.isArray(dynamicData.b7Rows)) {
      dynamicData.b7Rows.forEach((row) => {
        // Collect translatable text fields (excluding numbers and dates)
        if (row.checkingThe && !isNumberOrDate(row.checkingThe)) {
          texts[row.checkingThe] = row.checkingThe;
        }
        if (row.subject && !isNumberOrDate(row.subject)) {
          texts[row.subject] = row.subject;
        }
        if (row.constructionPart && !isNumberOrDate(row.constructionPart)) {
          texts[row.constructionPart] = row.constructionPart;
        }
        if (row.basis && !isNumberOrDate(row.basis)) {
          texts[row.basis] = row.basis;
        }
        if (row.method && !isNumberOrDate(row.method)) {
          texts[row.method] = row.method;
        }
        if (row.acceptance && !isNumberOrDate(row.acceptance)) {
          texts[row.acceptance] = row.acceptance;
        }
        if (row.timeControl && !isNumberOrDate(row.timeControl)) {
          texts[row.timeControl] = row.timeControl;
        }
      });
    }
  }

  return texts;
}

// -------------------- HELPERS --------------------
function footer(doc, pageNo, suffix = "", translations = {}) {
  const footerHeight = 25; // Height of footer
  const footerY = PAGE.h - footerHeight;

  // Draw blue background rectangle
  doc
    .rect(M.l, footerY, CONTENT_W, footerHeight)
    .fillColor(HEADING_COLOR)
    .fill()
    .fillColor("white"); // Reset to white for text

  // Three columns layout
  const col1Width = 80; // Left column for image
  const col2Width = CONTENT_W - col1Width - 120; // Center column for text
  const col3Width = 120; // Right column for page number

  const x1 = M.l + 5; // Left margin + padding
  const x2 = M.l + col1Width + 10; // Center column start
  const x3 = PAGE.w - M.r - col3Width; // Right column start

  const textY = footerY + footerHeight / 2 - 4; // Vertically center text

  // Column 1: jpo.jpg image (left)
  try {
    const jpoPath = path.join(__dirname, "jpo.jpg");
    if (fs.existsSync(jpoPath)) {
      const imageHeight = footerHeight - 8; // Slightly smaller than footer
      const imageWidth = col1Width - 10;
      doc.image(jpoPath, x1, footerY + 4, {
        fit: [imageWidth, imageHeight],
        align: "left",
      });
    }
  } catch (error) {
    console.error("Error loading jpo.jpg:", error.message);
  }

  // Column 2: "Part of..." text (center)
  doc.font("Helvetica").fontSize(8).fillColor("white");
  const partOfText =
    translations["Part of Kvalitetssikring Danmark ApS"] ||
    "Part of Kvalitetssikring Danmark ApS";
  doc.text(partOfText, x2, textY, {
    width: col2Width,
    align: "center",
  });

  // Column 3: Page number (right)
  const pageLabel = translations["Page"] || "Page";
  const af17Text = translations["af 17"] || "af 17";
  const pageText = suffix
    ? `${pageLabel} ${pageNo}.${suffix} ${af17Text}`
    : `${pageLabel} ${pageNo} ${af17Text}`;
  doc.text(pageText, x3, textY, {
    width: col3Width,
    align: "right",
  });

  // Reset fill color
  doc.fillColor("black");
}

function headingMain(doc, text, y) {
  // main heading with underline
  doc.font("Helvetica-Bold").fontSize(12).fillColor("black");
  doc.text(text, M.l, y, { width: CONTENT_W });

  const underlineY = doc.y + 2;
  doc
    .moveTo(M.l, underlineY)
    .lineTo(PAGE.w - M.r, underlineY)
    .stroke();

  return underlineY + 8;
}

function headingSub(doc, text, y) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor("black");
  doc.text(text, M.l, y, { width: CONTENT_W });
  return doc.y + 4;
}

function para(doc, text, y, indent = 0) {
  doc.font("Helvetica").fontSize(10).fillColor("black");
  doc.text(text, M.l + indent, y, {
    width: CONTENT_W - indent,
    lineGap: 2,
  });
  return doc.y + 4;
}

function bullets(doc, items, y, indent = 10) {
  doc.font("Helvetica").fontSize(10).fillColor("black");
  let yy = y;

  for (const it of items) {
    doc.text("• " + it, M.l + indent, yy, {
      width: CONTENT_W - indent,
      lineGap: 2,
    });
    yy = doc.y + 2;
  }
  return yy;
}

// -------------------- TABLE CONFIG (B1–B6) --------------------
// ✅ Adjusted widths so nothing cuts.
// Total ≈ 512 fits inside margins.
const TABLE_COLUMNS = [
  { key: "pos", label: "POS", w: 28 },
  { key: "subject", label: "CHECKING THE SUBJECT", w: 96 },
  { key: "part", label: "CONSTRUCTION PART", w: 86 },
  { key: "basis", label: "BASIS", w: 50 },
  { key: "method", label: "CONTROL METHOD", w: 78 },
  { key: "scope", label: "SCOPE", w: 48 },
  { key: "accept", label: "ACCEPTANCE CRITERIA", w: 60 },
  { key: "time", label: "TIME", w: 33 },
  { key: "control", label: "CONTROL", w: 33 },
];

function drawControlTable(doc, yStart, rows) {
  const xStart = M.l;
  const headerH = 22;
  const rowH = 18;

  // Header
  doc.font("Helvetica-Bold").fontSize(8).fillColor("black");
  let x = xStart;

  for (const c of TABLE_COLUMNS) {
    doc.rect(x, yStart, c.w, headerH).stroke();
    doc.text(c.label, x + 2, yStart + 6, {
      width: c.w - 4,
      align: "center",
    });
    x += c.w;
  }

  // Rows
  doc.font("Helvetica").fontSize(8);
  let y = yStart + headerH;

  (rows || []).forEach((r) => {
    let xx = xStart;
    for (const c of TABLE_COLUMNS) {
      doc.rect(xx, y, c.w, rowH).stroke();
      const val = r[c.key] ?? "";
      doc.text(String(val), xx + 2, y + 4, { width: c.w - 4 });
      xx += c.w;
    }
    y += rowH;
  });

  return y + 10;
}

// -------------------- PAGE 1 (FULL) --------------------

// Dark blue for headings and cell borders
const HEADING_COLOR = "#003366";

// Centered block, but left-aligned text inside
function bulletsCentered(doc, items, y) {
  const blockWidth = 250; // width of the bullet block
  const x = M.l + (CONTENT_W - blockWidth) / 2; // center the block on the page

  doc.font("Helvetica").fontSize(10).fillColor("black");
  let yy = y;

  items.forEach((txt) => {
    doc.text("• " + txt, x, yy, {
      width: blockWidth,
      align: "left", // left-align inside centered block
      lineGap: 2,
    });
    yy = doc.y + 2;
  });

  return yy;
}

// Document ID row = 3 cells: Document ID | B2.X number | Special text
function drawDocumentIdRow(doc, y, dynamic, translations = {}) {
  const xStart = M.l;
  const h = 22;

  const w1 = 100; // "Document ID"
  const w2 = 170; // "B2.X number"
  const w3 = CONTENT_W - (w1 + w2); // "Special text"

  // Dark blue borders
  doc.strokeColor(HEADING_COLOR);

  // Cell 1: label
  doc.rect(xStart, y, w1, h).stroke();
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const documentIdText = translations["Document ID"] || "Document ID";
  doc.text(documentIdText, xStart + 6, y + 6, {
    width: w1 - 12,
    align: "left",
  });

  // Cell 2: B2.X number (red)
  const x2 = xStart + w1;
  doc.rect(x2, y, w2, h).stroke();
  doc.font("Helvetica").fontSize(10).fillColor("black");
  doc.text(`B2.${dynamic.xNumber}`, x2 + 6, y + 6, {
    width: w2 - 12,
    align: "left",
  });

  // Cell 3: Special text (red)
  const x3 = x2 + w2;
  doc.rect(x3, y, w3, h).stroke();
  doc.font("Helvetica").fontSize(10).fillColor("black");
  const translatedSpecialText =
    translations[dynamic.specialText] || dynamic.specialText;
  doc.text(translatedSpecialText, x3 + 6, y + 6, {
    width: w3 - 12,
    align: "left",
  });

  // Reset colors
  doc.fillColor("black").strokeColor("black");

  return y + h + 10;
}

async function page1(doc, dynamic, translations = {}) {
  let y = M.t + 10;

  // Add mainlg.jpg image at the top left
  try {
    const mainlgPath = path.join(__dirname, "mainlg.jpg");
    if (fs.existsSync(mainlgPath)) {
      // Image dimensions
      const imageWidth = 150; // Fixed width for the logo
      const imageHeight = 60; // Fixed height for the logo

      // Position at top left
      doc.image(mainlgPath, M.l, y, {
        fit: [imageWidth, imageHeight],
        align: "left",
      });
    } else {
      console.log("mainlg.jpg not found at:", mainlgPath);
    }
  } catch (error) {
    console.error("Error loading mainlg.jpg:", error.message);
  }

  y = y + 70; // Add spacing after main logo

  // Heading: Executing part (dark blue, no cell)
  doc.font("Helvetica-Bold").fontSize(11).fillColor(HEADING_COLOR);
  const executingPartText = translations["Executing part"] || "Executing part";
  doc.text(executingPartText, M.l, y);
  y = doc.y + 6;

  // Company image and details side by side on the right
  const companyImageWidth = 150; // Fixed width for the logo
  const companyImageHeight = 60; // Fixed height for the logo
  const companyDetailsWidth = CONTENT_W - companyImageWidth - 20; // Leave space between image and text
  const companyDetailsX = M.l;
  const companyImageX = M.l + companyDetailsWidth + 20;

  // Company data on the left (with translations)
  doc.font("Helvetica").fontSize(10).fillColor("black");
  // Rebuild companyInfo with translated labels and values
  let translatedCompanyInfo = "";
  if (dynamic.company) {
    const parts = [];
    if (dynamic.company.name) {
      const nameLabel = translations["Name:"] || "Name:";
      const companyName =
        translations[dynamic.company.name] || dynamic.company.name;
      parts.push(`${nameLabel} ${companyName}`);
    }
    if (dynamic.company.address) {
      const addressLabel = translations["Address:"] || "Address:";
      const companyAddress =
        translations[dynamic.company.address] || dynamic.company.address;
      parts.push(`${addressLabel} ${companyAddress}`);
    }
    if (dynamic.company.cvr) {
      const cvrLabel = translations["CVR:"] || "CVR:";
      parts.push(`${cvrLabel} ${dynamic.company.cvr}`); // CVR is a number, don't translate
    }
    if (dynamic.company.contactPhone) {
      const telLabel = translations["Tel:"] || "Tel:";
      parts.push(`${telLabel} ${dynamic.company.contactPhone}`); // Phone is a number, don't translate
    }
    translatedCompanyInfo = parts.join("\n");
  } else {
    translatedCompanyInfo = dynamic.companyInfo || "";
  }
  doc.text(translatedCompanyInfo, companyDetailsX, y, {
    width: companyDetailsWidth,
  });
  doc.fillColor("black");

  // Add company image next to company details on the right (from company.picture.s3Location)
  try {
    const company = dynamic.company || {};
    console.log("Page 1 - Company object:", company ? "Found" : "Not found");
    console.log(
      "Page 1 - Company picture object:",
      company.picture
        ? JSON.stringify(company.picture, null, 2)
        : "No picture object"
    );

    const companyImageUrl =
      company.picture?.s3Location ||
      company.picture?.s3location ||
      company.picture?.location ||
      company.picture?.url ||
      "";

    console.log("Page 1 - Company image URL:", companyImageUrl || "NOT FOUND");

    if (companyImageUrl) {
      console.log(
        "Page 1 - Attempting to fetch company image from:",
        companyImageUrl
      );
      const imgBuffer = await fetchImageBuffer(companyImageUrl);
      console.log(
        "Page 1 - Company image buffer fetched, size:",
        imgBuffer.length
      );

      // Position next to company details on the right side
      doc.image(imgBuffer, companyImageX, y, {
        fit: [companyImageWidth, companyImageHeight],
        align: "left",
      });
      console.log("Page 1 - Company image displayed successfully");
    } else {
      console.log(
        "Page 1 - No company image URL found. Available fields:",
        Object.keys(company.picture || {})
      );
    }
  } catch (error) {
    console.error("Page 1 - Error loading company image:", error.message);
    console.error("Page 1 - Error stack:", error.stack);
  }

  y = doc.y + 16;

  // Static control plan heading (bigger) first, then project name on same baseline
  doc.font("Helvetica-Bold").fontSize(22).fillColor(HEADING_COLOR);
  const headingText =
    translations["Static control plan: "] || "Static control plan: ";
  doc.text(headingText, M.l, y);

  // Calculate x position after heading and adjust y for baseline alignment
  const headingWidth = doc.widthOfString(headingText);
  const baselineOffset = 3; // Adjust to match baseline (fontSize 22 vs 16)
  doc.font("Helvetica-Bold").fontSize(16).fillColor("black");
  const translatedProjectName =
    translations[dynamic.projectName] || dynamic.projectName;
  doc.text(translatedProjectName, M.l + headingWidth, y + baselineOffset);

  doc.fillColor("black");
  y = doc.y + 18;

  // Line: For those executed...
  doc.font("Helvetica").fontSize(11).fillColor("black");
  const forThoseExecutedText =
    translations["For those executed within the construction part:"] ||
    "For those executed within the construction part:";
  doc.text(forThoseExecutedText, M.l, y);
  y = doc.y + 16;

  // Document ID row (in dark blue bordered cells)
  y = drawDocumentIdRow(doc, y, dynamic, translations);

  // Centered heading: Applicable EU standards 2024 (dark blue)
  doc.font("Helvetica-Bold").fontSize(11).fillColor(HEADING_COLOR);
  const euStandardsText =
    translations["Applicable EU standards 2024"] ||
    "Applicable EU standards 2024";
  doc.text(euStandardsText, M.l, y, {
    width: CONTENT_W,
    align: "center",
  });
  y = doc.y + 10;

  // Centered Eurocode bullets (block centered, text left)
  const eurocodes = [
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

  // Translate eurocodes
  const translatedEurocodes = eurocodes.map(
    (code) => translations[code] || code
  );

  y = bulletsCentered(doc, translatedEurocodes, y);

  // Footer for page 1
  footer(doc, 1, "", translations);
}

// -------------------- PAGE 2 (FULL) --------------------
// ===== Page 2 – STATIC CONTROL PLAN / CONSTRUCTION CASE / Signing =====

// If already defined for Page 1, REMOVE this line:

// Blue section bar with white text: STATIC CONTROL PLAN / CONSTRUCTION CASE / Signing:
function drawSectionBar(doc, y, label, translations = {}) {
  const barHeight = 20;

  // Blue background
  doc.save();
  doc.fillColor(HEADING_COLOR);
  doc.rect(M.l, y, CONTENT_W, barHeight).fill();
  doc.restore();

  // White text on top (with translation)
  doc.font("Helvetica-Bold").fontSize(11).fillColor("white");
  const translatedLabel = translations[label] || label;
  doc.text(translatedLabel, M.l + 8, y + 5, {
    width: CONTENT_W - 16,
    align: "left",
  });

  // Reset for body
  doc.fillColor("black");
  return y + barHeight + 10;
}

// Single-column underlined row (full width)
function underlineRow(doc, y, text, options = {}, translations = {}) {
  const color = options.color || "black";
  const bold = options.bold || false;
  const size = options.size || 10;

  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor(color);
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
  });
  const afterY = doc.y;

  // Bottom underline
  const bottom = afterY + 2;
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();

  doc.strokeColor("black").fillColor("black");
  return bottom + 6;
}

// 2-column underlined row: label | value
function underlineRowTwoCols(
  doc,
  y,
  label,
  value,
  options = {},
  translations = {}
) {
  const split = options.split || 170; // X position where value column starts
  const labelColor = options.labelColor || "black";
  const valueColor = options.valueColor || "black";
  const labelBold = options.labelBold || false;
  const labelSize = options.labelSize || 10;
  const valueSize = options.valueSize || 10;

  const labelX = M.l;
  const valueX = M.l + split;
  const labelWidth = split - 10;
  const valueWidth = CONTENT_W - split + 10;

  // Label (with translation)
  doc
    .font(labelBold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(labelSize)
    .fillColor(labelColor);
  const translatedLabel = translations[label] || label;
  doc.text(translatedLabel, labelX, y, {
    width: labelWidth,
  });
  const afterLabelY = doc.y;

  // Value (with translation, but check if it's a number/date first)
  doc.font("Helvetica").fontSize(valueSize).fillColor(valueColor);
  let translatedValue = value;
  if (value && typeof value === "string" && !isNumberOrDate(value)) {
    translatedValue = translations[value] || value;
  }
  doc.text(translatedValue, valueX, y, {
    width: valueWidth,
  });
  const afterValueY = doc.y;

  // Bottom underline (dark blue)
  const bottom = Math.max(afterLabelY, afterValueY) + 2;
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();

  // Reset
  doc.strokeColor("black").fillColor("black");

  return bottom + 6; // next y
}

// 4-column underlined row: LKey LVal | RKey RVal
function underlineRowFourCols(
  doc,
  y,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  translations = {}
) {
  const x1 = M.l;
  const col1W = 90; // left label
  const col2W = 150; // left value
  const col3W = 120; // right label
  const col4W = CONTENT_W - (col1W + col2W + col3W); // right value

  const x2 = x1 + col1W;
  const x3 = x2 + col2W;
  const x4 = x3 + col3W;

  // Left label (bold, with translation)
  doc.font("Helvetica-Bold").fontSize(10).fillColor("black");
  const translatedLeftLabel = translations[leftLabel] || leftLabel;
  doc.text(translatedLeftLabel, x1, y, { width: col1W - 4 });
  const y1 = doc.y;

  // Left value (with translation, but check if it's a number/date first)
  doc.font("Helvetica").fontSize(10).fillColor("black");
  let translatedLeftValue = leftValue;
  if (
    leftValue &&
    typeof leftValue === "string" &&
    !isNumberOrDate(leftValue)
  ) {
    translatedLeftValue = translations[leftValue] || leftValue;
  }
  doc.text(translatedLeftValue, x2, y, { width: col2W - 4 });
  const y2 = doc.y;

  // Right label (bold, with translation)
  doc.font("Helvetica-Bold").fontSize(10).fillColor("black");
  const translatedRightLabel = translations[rightLabel] || rightLabel;
  doc.text(translatedRightLabel, x3, y, { width: col3W - 4 });
  const y3 = doc.y;

  // Right value (with translation, but check if it's a number/date first)
  doc.font("Helvetica").fontSize(10).fillColor("black");
  let translatedRightValue = rightValue;
  if (
    rightValue &&
    typeof rightValue === "string" &&
    !isNumberOrDate(rightValue)
  ) {
    translatedRightValue = translations[rightValue] || rightValue;
  }
  doc.text(translatedRightValue, x4, y, { width: col4W - 4 });
  const y4 = doc.y;

  const bottom = Math.max(y1, y2, y3, y4) + 2;

  // Bottom underline (dark blue)
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();

  // Reset
  doc.strokeColor("black").fillColor("black");
  return bottom + 6;
}

// 3-column underlined row: Col1 | Col2 | Col3
function underlineRowThreeColsSigning(
  doc,
  y,
  col1,
  col2,
  col3,
  options = {},
  translations = {}
) {
  const col1W = 90; // date (increased to accommodate dates like "18/11/2025")
  const col2W = 200; // name
  const col3W = CONTENT_W - (col1W + col2W); // company

  const x1 = M.l;
  const x2 = x1 + col1W;
  const x3 = x2 + col2W;

  const size = options.size || 10;
  const col1Color = options.col1Color || "black";
  const col2Color = options.col2Color || "black";
  const col3Color = options.col3Color || "black";
  const bold = options.bold || false;

  // Column 1 (date - usually not translated as it's a date)
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor(col1Color);
  doc.text(String(col1), x1, y, { width: col1W - 4 });
  const y1 = doc.y;

  // Column 2 (name - with translation, but check if it's a number/date first)
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor(col2Color);
  let translatedCol2 = col2;
  if (col2 && typeof col2 === "string" && !isNumberOrDate(col2)) {
    translatedCol2 = translations[col2] || col2;
  }
  doc.text(String(translatedCol2), x2, y, { width: col2W - 4 });
  const y2 = doc.y;

  // Column 3 (company - with translation, but check if it's a number/date first)
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor(col3Color);
  let translatedCol3 = col3;
  if (col3 && typeof col3 === "string" && !isNumberOrDate(col3)) {
    translatedCol3 = translations[col3] || col3;
  }
  doc.text(String(translatedCol3), x3, y, { width: col3W - 4 });
  const y3 = doc.y;

  const bottom = Math.max(y1, y2, y3) + 2;

  // Bottom underline (dark blue)
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();

  // Reset
  doc.strokeColor("black").fillColor("black");
  return bottom + 6;
}

// ===== PAGE 2 =====

function page2(doc, dynamic, translations = {}) {
  let y = M.t + 30;

  // ---------- STATIC CONTROL PLAN (blue bar) ----------
  y = drawSectionBar(doc, y, "STATIC CONTROL PLAN", translations);

  // For load-bearing structures...
  y = underlineRow(
    doc,
    y,
    "For load-bearing structures, cf. DS1140 applies to:",
    { size: 10 },
    translations
  );

  // Construction Part: Special text (from gamma.special) - label bigger, bold, blue
  const constructionPartValue =
    dynamic.constructionPart || dynamic.specialText || "Special text";
  y = underlineRowTwoCols(
    doc,
    y,
    "Construction Part:",
    constructionPartValue,
    {
      valueColor: "black",
      labelColor: HEADING_COLOR,
      labelBold: true,
      labelSize: 14,
    },
    translations
  );

  // The control plan is built according to the current EU standard:
  y = underlineRow(
    doc,
    y,
    "The control plan is built according to the current EU standard:",
    { size: 10 },
    translations
  );

  // Eurocode: from projectprofessioneurocodes - label bigger, bold, blue
  y = underlineRowTwoCols(
    doc,
    y,
    "Eurocode:",
    dynamic.eurocode || "Eurocode",
    {
      valueColor: "black",
      labelColor: HEADING_COLOR,
      labelBold: true,
      labelSize: 14,
    },
    translations
  );

  y += 8;

  // ---------- CONSTRUCTION CASE (blue bar) ----------
  y = drawSectionBar(doc, y, "CONSTRUCTION CASE:", translations);

  // Get project and user data
  const project = dynamic.project || {};
  const mainUser = dynamic.mainUser || {};

  // Format project date
  const projectDate = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString("en-GB")
    : project.startup || "Project setup";

  // Helper to get translated value
  const getTranslatedValue = (value, fallback = "Project setup") => {
    if (!value || value === fallback) return translations[fallback] || fallback;
    if (isNumberOrDate(value)) return value;
    return translations[value] || value;
  };

  // Two side-by-side sections (left & right), keys bold
  // Row 1
  const projectName = project.name || "Project setup";
  const mainUserName = mainUser.name || "Project setup";
  y = underlineRowFourCols(
    doc,
    y,
    "Project INFO",
    projectName,
    "Main Contractor/Custumer",
    mainUserName,
    translations
  );

  // Row 2
  const caseNumber =
    project.caseNumber ||
    project.case_number ||
    project.projectNumber ||
    "Project setup.";
  y = underlineRowFourCols(
    doc,
    y,
    "ID/Case no.",
    caseNumber,
    "Name",
    mainUserName,
    translations
  );

  // Row 3
  const projectAddress = project.address || "Project setup";
  const mainUserAddress = mainUser.address || "Project setup";
  y = underlineRowFourCols(
    doc,
    y,
    "Name",
    projectName,
    "Address",
    mainUserAddress,
    translations
  );

  // Row 4
  const projectPostCity =
    project.postalCode && project.city
      ? `${project.postalCode} ${project.city}`
      : project.postalCode || project.city || "Project setup";
  const mainUserPostCity =
    mainUser.postalCode && mainUser.city
      ? `${mainUser.postalCode} ${mainUser.city}`
      : mainUser.postalCode || mainUser.city || "Project setup";
  y = underlineRowFourCols(
    doc,
    y,
    "Address",
    projectAddress,
    "Post no./City.",
    mainUserPostCity,
    translations
  );

  // Row 5
  y = underlineRowFourCols(
    doc,
    y,
    "Post no./City.",
    projectPostCity,
    "CVR no.",
    mainUser.cvr || "Project setup",
    translations
  );

  // Row 6
  const projectContactPerson = project.contactPerson || "Project setup";
  const mainUserEmail = mainUser.email || "Project setup";
  y = underlineRowFourCols(
    doc,
    y,
    "Contact person",
    projectContactPerson,
    "Email.",
    mainUserEmail,
    translations
  );

  // Row 7
  const mainUserContactPerson = mainUser.contactPerson || "Project setup";
  y = underlineRowFourCols(
    doc,
    y,
    "Startup",
    projectDate, // Date, not translated
    "Contact person",
    mainUserContactPerson,
    translations
  );

  y += 8;

  // DOCUMENT TYPE row - three columns: Document type | Version | Construction class
  const docType = "Static control plan";
  const version = dynamic.gamma?.currentVersion || "1";
  const constructionClass = dynamic.kkx || "KKX";

  // Custom three-column table with appropriate widths
  const col1W = 180; // Document type
  const col2W = 100; // Version
  const col3W = CONTENT_W - (col1W + col2W); // Construction class

  const x1 = M.l;
  const x2 = x1 + col1W;
  const x3 = x2 + col2W;

  // Header row with gray background
  const headerYStart = y - 2; // Start slightly above text
  const estimatedHeaderHeight = 18; // Estimated height for header row

  // Draw gray background rectangle for header first
  doc
    .rect(M.l, headerYStart, CONTENT_W, estimatedHeaderHeight)
    .fillColor("#E0E0E0")
    .fill()
    .fillColor("black"); // Reset fill color

  // Draw text on top of gray background (with translations)
  doc.font("Helvetica-Bold").fontSize(10).fillColor("black");
  const docTypeLabel = translations["Document type"] || "Document type";
  doc.text(docTypeLabel, x1, y, { width: col1W - 4 });
  const y1 = doc.y;
  const versionLabel = translations["Version"] || "Version";
  doc.text(versionLabel, x2, y, { width: col2W - 4 });
  const y2 = doc.y;
  const constructionClassLabel =
    translations["Construction class"] || "Construction class";
  doc.text(constructionClassLabel, x3, y, { width: col3W - 4 });
  const y3 = doc.y;

  const bottomHeader = Math.max(y1, y2, y3) + 2;

  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottomHeader)
    .lineTo(PAGE.w - M.r, bottomHeader)
    .stroke();
  y = bottomHeader + 6;

  // Data row - all values in bold (with translations)
  doc.font("Helvetica-Bold").fontSize(10).fillColor("black");
  const translatedDocType = translations[docType] || docType;
  doc.text(translatedDocType, x1, y, { width: col1W - 4 });
  const y1Data = doc.y;
  doc.text(version, x2, y, { width: col2W - 4 }); // Version is a number
  const y2Data = doc.y;
  doc.text(constructionClass, x3, y, { width: col3W - 4 }); // Construction class is usually a code
  const y3Data = doc.y;

  const bottomData = Math.max(y1Data, y2Data, y3Data) + 2;
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottomData)
    .lineTo(PAGE.w - M.r, bottomData)
    .stroke();
  doc.strokeColor("black").fillColor("black");
  y = bottomData + 6;

  y += 10;

  // ---------- Signing (blue bar) ----------
  y = drawSectionBar(doc, y, "Signing:", translations);

  // Same data as static report.
  y = underlineRow(
    doc,
    y,
    "Same data as static report.",
    { size: 10 },
    translations
  );

  // Get signatures and company
  const signatures = dynamic.signatures || {};
  const company = dynamic.company || {};
  const companyName = company.name || "company organization";

  console.log("Signing section - signatures object:", signatures);
  console.log("Signing section - signature keys:", Object.keys(signatures));

  // Helper function to format date
  const formatDate = (date) => {
    if (!date) return "[Select Date]";
    try {
      return new Date(date).toLocaleDateString("en-GB");
    } catch {
      return "[Select Date]";
    }
  };

  // Row 1: signatureType 1 - Prepared/approved by
  // Header row
  y = underlineRowThreeColsSigning(
    doc,
    y,
    "Signed",
    "Prepared/approved by:",
    "Company",
    {
      col1Color: "black",
      col2Color: "black",
      col3Color: "black",
      size: 10,
      bold: true,
    },
    translations
  );
  // Data row
  const sig1 = signatures[1] || signatures["1"];
  const sig1Name = sig1?.name || "Admin – company organization";
  const sig1Date = formatDate(sig1?.createdAt || sig1?.signatureDate);
  console.log("Row 1 - signatureType 1, name:", sig1Name, "date:", sig1Date);
  y = underlineRowThreeColsSigning(
    doc,
    y,
    sig1Date,
    sig1Name,
    companyName,
    {
      col1Color: "black",
      col2Color: "black",
      col3Color: "black",
      size: 10,
      bold: false,
    },
    translations
  );

  // Row 2: signatureType 2 - Own Control (OC)
  // Header row
  y = underlineRowThreeColsSigning(
    doc,
    y,
    "Signed",
    "Own Control (OC)",
    "Company",
    {
      col1Color: "black",
      col2Color: "black",
      col3Color: "black",
      size: 10,
      bold: true,
    },
    translations
  );
  // Data row
  const sig2 = signatures[2] || signatures["2"];
  const sig2Name = sig2?.name || "Project manager– company organization";
  const sig2Date = formatDate(sig2?.createdAt || sig2?.signatureDate);
  console.log("Row 2 - signatureType 2, name:", sig2Name, "date:", sig2Date);
  y = underlineRowThreeColsSigning(
    doc,
    y,
    sig2Date,
    sig2Name,
    companyName,
    {
      col1Color: "black",
      col2Color: "black",
      col3Color: "black",
      size: 10,
      bold: false,
    },
    translations
  );

  // Row 3: signatureType 3 - Independent controller
  // Header row
  y = underlineRowThreeColsSigning(
    doc,
    y,
    "Signed",
    "Independent controller (IC)",
    "Company",
    {
      col1Color: "black",
      col2Color: "black",
      col3Color: "black",
      size: 10,
      bold: true,
    },
    translations
  );
  // Data row
  const sig3 = signatures[3] || signatures["3"];
  const sig3Name = sig3?.name || "company organization";
  const sig3Date = formatDate(sig3?.createdAt || sig3?.signatureDate);
  console.log("Row 3 - signatureType 3, name:", sig3Name, "date:", sig3Date);
  y = underlineRowThreeColsSigning(
    doc,
    y,
    sig3Date,
    sig3Name,
    companyName,
    {
      col1Color: "black",
      col2Color: "black",
      col3Color: "black",
      size: 10,
      bold: false,
    },
    translations
  );

  // Footer
  footer(doc, 2, "", translations);
}

// -------------------- PAGE 3 (STUB) --------------------
// ===== Page 3 helpers =====

// Main heading in dark blue with underline
function drawMainHeadingBlue(doc, y, text, translations = {}) {
  doc.font("Helvetica-Bold").fontSize(12).fillColor(HEADING_COLOR);
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
  });

  const underlineY = doc.y + 2;
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, underlineY)
    .lineTo(PAGE.w - M.r, underlineY)
    .stroke();

  // reset
  doc.fillColor("black").strokeColor("black");
  return underlineY + 10;
}

// Simple paragraph helper for this page
function paraPage3(doc, y, text, translations = {}) {
  doc.font("Helvetica").fontSize(10).fillColor("black");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
    lineGap: 2,
  });
  return doc.y + 8;
}

// ===== PAGE 3 =====

function page3(doc, dynamic, translations = {}) {
  let y = M.t + 30;

  // Heading: Document completion status
  y = drawMainHeadingBlue(doc, y, "Document completion status", translations);

  // Paragraph 1
  const para1Text =
    "The figure to the right from SBI 271 Item 4.3 indicates which phase you are in in your document " +
    "submissions, and must also help to ensure that both the contractor and the consultant work " +
    "proactively to communicate back and forth in connection with any corrections.";
  y = paraPage3(doc, y, para1Text, translations);

  // Paragraph 2
  const para2Text =
    "The document is signed when this has been approved by the structural engineer, until then the " +
    "document is a dynamic document.";
  y = paraPage3(doc, y, para2Text, translations);

  // Paragraph 3 (Expected approval time)
  const para3Text =
    "Expected approval time 14 days, after which the content of the document is considered approved.";
  y = paraPage3(doc, y, para3Text, translations);

  y += 12;

  // Status line: "Status:    Approval"
  doc.font("Helvetica-Bold").fontSize(10).fillColor("black");
  const statusLabelText = translations["Status:"] || "Status:";
  doc.text(statusLabelText, M.l, y, { continued: true });

  const statusLabel = dynamic.page3StatusLabel || "Approval";
  const translatedStatusLabel = translations[statusLabel] || statusLabel;
  doc.font("Helvetica").fontSize(10).fillColor("black");
  doc.text("    " + translatedStatusLabel, { continued: false });

  y = doc.y + 8;

  // Status line 1: date + text, in red (dynamic-friendly)
  const statusLine1 =
    dynamic.page3StatusLine1 || "18-11-2025    Under Approval";

  // Parse statusLine1 to separate date and text
  let translatedStatusLine1 = statusLine1;
  const dateMatch = statusLine1.match(/^(\d{2}-\d{2}-\d{4})\s+(.+)$/);
  if (dateMatch) {
    const datePart = dateMatch[1]; // Date, don't translate
    const textPart = dateMatch[2].trim();
    const translatedTextPart = translations[textPart] || textPart;
    translatedStatusLine1 = `${datePart}    ${translatedTextPart}`;
  } else if (!isNumberOrDate(statusLine1)) {
    // If no date pattern, try to translate whole string
    translatedStatusLine1 = translations[statusLine1] || statusLine1;
  }

  doc.font("Helvetica").fontSize(10).fillColor("black");
  doc.text(translatedStatusLine1, M.l, y, {
    width: CONTENT_W,
  });
  y = doc.y + 4;

  // Status line 2: second date, in red (date, not translated)
  const statusLine2 = dynamic.page3StatusLine2 || "18-11-2025";
  doc.text(statusLine2, M.l, y, {
    width: CONTENT_W,
  });

  // Reset color
  doc.fillColor("black");

  // Footer (this is logical page 3)
  footer(doc, 3, "", translations);
}

// -------------------- PAGE 4 (STUB) --------------------
// ===== Page 4 helpers =====

// One TOC row: label ......... pageNo
function drawTocItemWithDots(doc, y, label, pageNo, translations = {}) {
  doc.font("Helvetica").fontSize(10).fillColor("black");

  const leftX = M.l;
  const rightX = M.l + CONTENT_W;
  const pageStr = String(pageNo);

  // Translate label (handle dynamic parts)
  let translatedLabel = label;

  // Check if label contains dynamic parts like "Construction Part: ${value}" or "Eurocode: ${value}"
  const constructionPartMatch = label.match(/^Construction Part:\s*(.+)$/);
  const eurocodeMatch = label.match(/^Eurocode:\s*(.+)$/);

  if (constructionPartMatch) {
    const labelPart = "Construction Part:";
    const valuePart = constructionPartMatch[1];
    const translatedLabelPart = translations[labelPart] || labelPart;
    const translatedValuePart =
      valuePart && !isNumberOrDate(valuePart)
        ? translations[valuePart] || valuePart
        : valuePart;
    translatedLabel = `${translatedLabelPart} ${translatedValuePart}`;
  } else if (eurocodeMatch) {
    const labelPart = "Eurocode:";
    const valuePart = eurocodeMatch[1];
    const translatedLabelPart = translations[labelPart] || labelPart;
    const translatedValuePart =
      valuePart && !isNumberOrDate(valuePart)
        ? translations[valuePart] || valuePart
        : valuePart;
    translatedLabel = `${translatedLabelPart} ${translatedValuePart}`;
  } else {
    // Regular label translation
    translatedLabel = translations[label] || label;
  }

  // Measure text widths (use translated label)
  const labelWidth = doc.widthOfString(translatedLabel);
  const pageWidth = doc.widthOfString(pageStr);
  const dotWidth = doc.widthOfString(".");

  const labelX = leftX;
  const pageX = rightX - pageWidth;

  // Draw label (slightly limited width so it doesn't run into dots)
  doc.text(translatedLabel, labelX, y, {
    width: CONTENT_W - pageWidth - 30,
    ellipsis: true,
  });

  // Compute dot area between label end and page number
  const dotsStartX = labelX + labelWidth + 4;
  const dotsEndX = pageX - 4;

  if (dotsEndX > dotsStartX + dotWidth) {
    const dotsCount = Math.floor((dotsEndX - dotsStartX) / dotWidth);
    const dots = ".".repeat(dotsCount);
    doc.text(dots, dotsStartX, y, {
      lineBreak: false,
    });
  }

  // Draw page number at the right
  doc.text(pageStr, pageX, y, {
    lineBreak: false,
  });

  // Move down for next item
  return y + 12;
}

// ===== PAGE 4 =====

function page4(doc, dynamic, translations = {}) {
  let y = M.t + 30;

  // Heading: Content (blue with underline, same style as Page 3)
  y = drawMainHeadingBlue(doc, y, "Content", translations);

  // Table of contents items (labels + page numbers)
  const constructionPartValue =
    dynamic.constructionPart || dynamic.specialText || "";
  const eurocodeValue = dynamic.eurocode || "";

  const tocItems = [
    { label: "Static control plan", page: 1 },
    { label: `Construction Part: ${constructionPartValue}`, page: 1 },
    { label: `Eurocode: ${eurocodeValue}`, page: 1 },
    { label: "Signing:", page: 1 },

    { label: "1. General", page: 4 },
    { label: "1.1 Description of the control work", page: 4 },
    { label: "1.2 Control types", page: 5 },
    { label: "1.3 Level of control", page: 5 },
    { label: "1.4 Organisation of the control work", page: 6 },
    { label: "1.5 Controllers", page: 6 },
    { label: "1.6 Use of assistance", page: 6 },
    { label: "1.7 Follow-up on deviations", page: 6 },

    { label: "2. General controls", page: 7 },
    { label: "2.1 General", page: 7 },
    { label: "2.2 Control section", page: 7 },
    { label: "2.3 Explanation of the selection of controls", page: 7 },
    { label: "2.4 Checkpoints", page: 7 },

    { label: "3. Special controls", page: 8 },
    { label: "3.1 General", page: 8 },
    { label: "3.2 Special checkpoints", page: 8 },

    { label: "4. Documentation", page: 8 },
    { label: "4.1 General description of documentation", page: 8 },
    { label: "4.2 Documentation of general controls", page: 8 },
    { label: "4.3 Documentation of special controls", page: 8 },
    { label: "4.4 Documentation of deviations and follow-up", page: 8 },
    { label: "4.5 Checking Control Documentation", page: 9 },

    { label: "5. Listings", page: 9 },
    { label: "5.1 Scope of control", page: 9 },

    { label: "6. Control points selected", page: 10 },

    { label: "7. Static controls (schematic)", page: 11 },
    { label: "7.1 Review of the execution basis from the design B1", page: 12 },
    {
      label: "7.2 Verification of the basis for execution of the work B2",
      page: 13,
    },
    {
      label: "7.3 Verification of Documentation of Materials and Products B3",
      page: 14,
    },
    { label: "7.4 RECEIPT CONTROL DELIVERIES B4", page: 15 },
    { label: "7.5 PERFORMANCE CONTROL; B5", page: 16 },
    { label: "7.6 FINAL INSPECTION B6", page: 17 },
  ];

  tocItems.forEach((item) => {
    y = drawTocItemWithDots(doc, y, item.label, item.page, translations);
  });
}

// -------------------- PAGE 5–12 (STUBS) --------------------
// ===== Page 5 helpers =====

function paraPage5(doc, y, text) {
  doc.font("Helvetica").fontSize(10).fillColor("black");
  doc.text(text, M.l, y, {
    width: CONTENT_W,
    lineGap: 2,
  });
  return doc.y + 8;
}

function bulletsLeft(doc, y, items) {
  doc.font("Helvetica").fontSize(10).fillColor("black");
  let yy = y;
  items.forEach((txt) => {
    doc.text("• " + txt, M.l + 10, yy, {
      width: CONTENT_W - 20,
      lineGap: 2,
    });
    yy = doc.y + 2;
  });
  return yy + 6;
}

// 3-block underlined row (no vertical lines)
function underlineRowThreeBlocks(
  doc,
  y,
  leftText,
  middleText,
  rightText,
  options = {}
) {
  const col1W = 180;
  const col2W = 170;
  const col3W = CONTENT_W - (col1W + col2W);

  const x1 = M.l;
  const x2 = x1 + col1W;
  const x3 = x2 + col2W;

  const size = options.size || 10;
  const bold = options.bold || false;

  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor("black");
  doc.text(leftText, x1, y, { width: col1W - 4 });
  const y1 = doc.y;

  doc.font("Helvetica").fontSize(size).fillColor("black");
  doc.text(middleText, x2, y, { width: col2W - 4 });
  const y2 = doc.y;

  doc.text(rightText, x3, y, { width: col3W - 4 });
  const y3 = doc.y;

  const bottom = Math.max(y1, y2, y3) + 2;

  // underline only
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();
  doc.strokeColor("black");

  return bottom + 6;
}

// ===== PAGE 5 =====

// ===== Page 5 helpers =====

function paraPage5(doc, y, text) {
  doc.font("Helvetica").fontSize(10).fillColor("black");
  doc.text(text, M.l, y, {
    width: CONTENT_W,
    lineGap: 2,
  });
  return doc.y + 8;
}

function bulletsLeft(doc, y, items) {
  doc.font("Helvetica").fontSize(10).fillColor("black");
  let yy = y;
  items.forEach((txt) => {
    doc.text("• " + txt, M.l + 10, yy, {
      width: CONTENT_W - 20,
      lineGap: 2,
    });
    yy = doc.y + 2;
  });
  return yy + 6;
}

// 3-block underlined row (no vertical lines)
function underlineRowThreeBlocks(
  doc,
  y,
  leftText,
  middleText,
  rightText,
  options = {}
) {
  const col1W = 180;
  const col2W = 170;
  const col3W = CONTENT_W - (col1W + col2W);

  const x1 = M.l;
  const x2 = x1 + col1W;
  const x3 = x2 + col2W;

  const size = options.size || 10;
  const bold = options.bold || false;

  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor("black");
  doc.text(leftText, x1, y, { width: col1W - 4 });
  const y1 = doc.y;

  doc.font("Helvetica").fontSize(size).fillColor("black");
  doc.text(middleText, x2, y, { width: col2W - 4 });
  const y2 = doc.y;

  doc.text(rightText, x3, y, { width: col3W - 4 });
  const y3 = doc.y;

  const bottom = Math.max(y1, y2, y3) + 2;

  // underline only
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();
  doc.strokeColor("black");

  return bottom + 6;
}

// Full-width underlined row (for the two sentences you mentioned)
function underlineRowFullWidth(doc, y, text, options = {}, translations = {}) {
  const size = options.size || 10;
  const bold = options.bold || false;

  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor("black");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
  });
  const afterY = doc.y;

  const bottom = afterY + 2;
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();
  doc.strokeColor("black").fillColor("black");

  return bottom + 6;
}

// ===== PAGE 5 =====
// ===== Page 5 helpers =====

// Simple paragraph
function paraPage5(doc, y, text, translations = {}) {
  doc.font("Helvetica").fontSize(10).fillColor("black");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
    lineGap: 2,
  });
  return doc.y + 8;
}

// Bullets, left aligned
function bulletsLeft(doc, y, items, translations = {}) {
  doc.font("Helvetica").fontSize(10).fillColor("black");
  let yy = y;
  items.forEach((txt) => {
    const translatedTxt = translations[txt] || txt;
    doc.text("• " + translatedTxt, M.l + 10, yy, {
      width: CONTENT_W - 20,
      lineGap: 2,
    });
    yy = doc.y + 2;
  });
  return yy + 6;
}

// Full-width underlined row (for sentences like "The following forms..." etc.)
function underlineRowFullWidth(doc, y, text, options = {}, translations = {}) {
  const size = options.size || 10;
  const bold = options.bold || false;

  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor("black");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
  });
  const afterY = doc.y;

  const bottom = afterY + 2;
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();
  doc.strokeColor("black").fillColor("black");

  return bottom + 6;
}

// 4-column underlined table row: C1 | C2 | C3 | C4 (no vertical bars)
function underlineRowFourColsTable(
  doc,
  y,
  col1,
  col2,
  col3,
  col4,
  options = {},
  translations = {}
) {
  const col1W = 90; // LISTING
  const col2W = 120; // DOCUMENT
  const col3W = 150; // CONSTRUCTION PART
  const col4W = CONTENT_W - (col1W + col2W + col3W); // ACCOMPLISHMENT

  const x1 = M.l;
  const x2 = x1 + col1W;
  const x3 = x2 + col2W;
  const x4 = x3 + col3W;

  const size = options.size || 10;
  const bold = options.bold || false;
  const valueColor = options.valueColor || "black";

  // Header row?
  if (options.header) {
    doc.font("Helvetica-Bold").fontSize(size).fillColor("black");
  } else {
    doc.font("Helvetica").fontSize(size).fillColor(valueColor);
  }

  // Translate columns (check if they're numbers/dates first)
  let translatedCol1 = col1;
  let translatedCol2 = col2;
  let translatedCol3 = col3;
  let translatedCol4 = col4;

  if (!options.header) {
    // For data rows, translate values if they're not numbers/dates
    if (col1 && typeof col1 === "string" && !isNumberOrDate(col1)) {
      translatedCol1 = translations[col1] || col1;
    }
    if (col2 && typeof col2 === "string" && !isNumberOrDate(col2)) {
      translatedCol2 = translations[col2] || col2;
    }
    if (col3 && typeof col3 === "string" && !isNumberOrDate(col3)) {
      translatedCol3 = translations[col3] || col3;
    }
    if (col4 && typeof col4 === "string" && !isNumberOrDate(col4)) {
      translatedCol4 = translations[col4] || col4;
    }
  } else {
    // For header rows, translate labels
    translatedCol1 = translations[col1] || col1;
    translatedCol2 = translations[col2] || col2;
    translatedCol3 = translations[col3] || col3;
    translatedCol4 = translations[col4] || col4;
  }

  // Column 1
  doc.text(translatedCol1, x1, y, { width: col1W - 4 });
  const y1 = doc.y;

  // Column 2
  doc.text(translatedCol2, x2, y, { width: col2W - 4 });
  const y2 = doc.y;

  // Column 3
  doc.text(translatedCol3, x3, y, { width: col3W - 4 });
  const y3 = doc.y;

  // Column 4
  doc.text(translatedCol4, x4, y, { width: col4W - 4 });
  const y4 = doc.y;

  const bottom = Math.max(y1, y2, y3, y4) + 2;

  // underline only
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();
  doc.strokeColor("black").fillColor("black");

  return bottom + 6;
}

// ===== PAGE 5 =====

function page5(doc, dynamic, translations = {}) {
  let y = M.t + 30;

  // 1.GENERAL heading with blue background + white text
  y = drawSectionBar(doc, y, "1. GENERAL", translations);

  // 1.1 Description of the control work (sub-heading)
  doc.font("Helvetica-Bold").fontSize(11).fillColor(HEADING_COLOR);
  const subHeadingText =
    translations["1.1 Description of the control work"] ||
    "1.1 Description of the control work";
  doc.text(subHeadingText, M.l, y);
  y = doc.y + 8;

  // Intro paragraph
  const introParaText =
    "This static control plan covers the control for the execution of the construction section mentioned on the front page and associated works. " +
    "The inspection is carried out in accordance with the building designer's:";
  y = paraPage5(doc, y, introParaText, translations);

  y += 4;

  // 4-column header row: LISTING | DOCUMENT | CONSTRUCTION PART | ACCOMPLISHMENT
  y = underlineRowFourColsTable(
    doc,
    y,
    "LISTING",
    "DOCUMENT",
    "CONSTRUCTION PART:",
    "ACCOMPLISHMENT",
    { header: true, size: 10 },
    translations
  );

  // 4-column value row – all dynamic
  // You can override these later from Mongo
  const listingVal =
    dynamic.listingValue || "B2. " + (dynamic.xNumber || "X number");
  const documentVal = dynamic.documentValue || "STATIC CONTROL PLAN";
  const constructionVal = dynamic.constructionPart || "Construction part text";
  const accomplishmentVal =
    dynamic.accomplishmentValue || dynamic.specialText || "Special text";

  y = underlineRowFourColsTable(
    doc,
    y,
    listingVal,
    documentVal,
    constructionVal,
    accomplishmentVal,
    {
      header: false,
      size: 10,
      valueColor: "black", // all dynamic: red
    },
    translations
  );

  y += 8;

  // Focus paragraph
  const focusParaText =
    "The focus is on seeing between the construction designer's material and the execution of the construction section on the site.";
  y = paraPage5(doc, y, focusParaText, translations);

  // Particular consideration paragraph
  const considerationParaText =
    "Particular consideration is given to the materials used and their dimensions in reception control, placement on level versus location on site and compliance with tolerances.";
  y = paraPage5(doc, y, considerationParaText, translations);

  y += 4;

  // Underlined sentence: "The following forms the basis for the checks carried out:"
  y = underlineRowFullWidth(
    doc,
    y,
    "The following forms the basis for the checks carried out:",
    { size: 10 },
    translations
  );

  // Bullet list of basis documents
  const basisItems = [
    "Building Regulations 2018 - BR18",
    'SBI 271 "Documentation and Control of Load-Bearing Structures"',
    "DS/EN 1990 DK NA:2021 , Annex B5",
    'DS 1140:2019 "Execution of load-bearing structures – General control"',
    'DS/INF 1140:2022 "Guide to DS 1140"',
  ];
  y = bulletsLeft(doc, y, basisItems, translations);

  // Underlined line: "The review is carried out..."
  y = underlineRowFullWidth(
    doc,
    y,
    "The review is carried out on the basis of the above-mentioned material and the contractor's documented quality assurance system.",
    { size: 10 },
    translations
  );

  // Bullet block about contractor QA system etc.
  const generalConditions = [
    "Procedures are complied with as described in the quality assurance system",
    "A review of the execution basis from the design phase has been carried out",
    "The materials used are in accordance with the design basis",
    "The basis for the execution of the work has been controlled/approved and reflects the requirements of the basis for execution from the design",
    "Employees have the necessary qualifications and competencies",
    "Self-monitoring and independent control are described in control plans and carried out as prescribed",
    "Controls are documented in control reports as described",
    "Deviations are processed according to the procedure for deviations",
    "Documentation of construction as executed is available",
  ];
  y = bulletsLeft(doc, y, generalConditions, translations);

  // Final paragraph about independent control
  const finalParaText =
    "The independent control is carried out by the executor, with the exception of a few of the special control points where the independent control is carried out by the designing organisation. " +
    "This is because the control requires a certain insight into the static conditions that form the basis for the construction.";
  y = paraPage5(doc, y, finalParaText, translations);

  // Footer: logical page 5
  footer(doc, 4, "", translations);
}

// ===== Page 6 helpers =====
// ===== Page 6 helpers =====
// ===== Page 6 helpers (compact version) =====

function paraPage6(doc, y, text, translations = {}) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
    lineGap: 1,
  });
  return doc.y + 4; // tighter spacing
}

// Bullets that mimic "o  ..." style for self-monitoring list
function bulletsCirclePage6(doc, y, items, translations = {}) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  let yy = y;
  items.forEach((txt) => {
    const translatedTxt = translations[txt] || txt;
    doc.text("o  " + translatedTxt, M.l, yy, {
      width: CONTENT_W,
      lineGap: 1,
    });
    yy = doc.y + 1;
  });
  return yy + 4; // tighter bottom gap
}

// Bullets that mimic "− ..." style for EXC1/2/3
function bulletsDashPage6(doc, y, items, translations = {}) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  let yy = y;
  items.forEach((txt) => {
    const translatedTxt = translations[txt] || txt;
    doc.text("− " + translatedTxt, M.l, yy, {
      width: CONTENT_W,
      lineGap: 1,
    });
    yy = doc.y + 1;
  });
  return yy + 4;
}

// Full-width underlined row
function underlineRowFullWidth(doc, y, text, options = {}, translations = {}) {
  const size = options.size || 9;
  const bold = options.bold || false;

  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor("black");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
  });
  const afterY = doc.y;

  const bottom = afterY + 2;
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();
  doc.strokeColor("black").fillColor("black");

  return bottom + 4; // smaller gap
}

// ===== PAGE 6 (compact layout) =====

function page6(doc, dynamic, translations = {}) {
  let y = M.t + 25; // slightly higher start

  // ---------- 1.2 Control types ----------
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const controlTypesHeading =
    translations["1.2 Control types"] || "1.2 Control types";
  doc.text(controlTypesHeading, M.l, y);
  y = doc.y + 6;

  // "The structure is classified as construction class KKX"
  doc.font("Helvetica").fontSize(9).fillColor("black");
  const prefixText1 =
    translations["The structure is classified as "] ||
    "The structure is classified as ";
  const prefixText2 =
    translations["construction class "] || "construction class ";
  doc.text(prefixText1, M.l, y, {
    continued: true,
  });
  doc.text(prefixText2, { continued: true });

  const kkx = dynamic.kkx || "KKX";
  doc.fillColor("black").text(kkx, { continued: false });

  // Draw underline from "construction class" to end of kkx value
  const prefix1Width = doc.widthOfString(prefixText1);
  const prefix2Width = doc.widthOfString(prefixText2);
  const kkxWidth = doc.widthOfString(kkx);
  const underlineStartX = M.l + prefix1Width;
  const underlineEndX = underlineStartX + prefix2Width + kkxWidth;
  const underlineY = y + 11; // Position underline below text
  doc.strokeColor("black");
  doc
    .moveTo(underlineStartX, underlineY)
    .lineTo(underlineEndX, underlineY)
    .stroke();
  doc.strokeColor("black"); // Reset stroke color
  doc.fillColor("black");
  y = doc.y + 4;

  // Self + independent control intro
  y = paraPage6(
    doc,
    y,
    "Self-monitoring and independent control of the work carried out are carried out.",
    translations
  );

  y = paraPage6(
    doc,
    y,
    "There is no requirement for third-party control.",
    translations
  );

  // ---------- Self-monitoring ----------
  y = underlineRowFullWidth(
    doc,
    y,
    "Self-monitoring",
    {
      bold: true,
      size: 9,
    },
    translations
  );

  // Self-monitoring paragraph
  const selfInspectionPara =
    "The self-inspection of the execution is carried out by the person who carried out the construction when the construction or " +
    "parts thereof are completed. Where structural parts are subsequently hidden, the self-inspection is carried out during the " +
    "execution of the relevant structural part.";
  y = paraPage6(doc, y, selfInspectionPara, translations);

  // "The own-check includes at least an assessment of whether:"
  y = paraPage6(
    doc,
    y,
    "The own-check includes at least an assessment of whether:",
    translations
  );

  // FULL self-monitoring bullet list (5 bullets)
  const selfMonitorItems = [
    "The entire construction and all of its parts are actually done.",
    "The construction based on a craftsmanship assessment is carried out correctly and is in accordance with good building practice.",
    "The construction has been carried out in accordance with the execution basis and agreements with the design and/or construction management on details or other matters that are not stated in the execution basis.",
    "Tolerances in the execution are complied with in relation to relevant standards, good practice within the type of work in question (see e.g. tolerancer.dk) and any project-specific tolerances that may appear in the execution basis.",
    "Documentation of the execution of the construction has been carried out, collected and systematised in accordance with SBi 271 section 2.6, Construction as executed.",
  ];
  y = bulletsCirclePage6(doc, y, selfMonitorItems, translations);

  // After completion of the self-inspection...
  const afterSelfInspectionPara =
    "After completion of the self-inspection, the person carrying out the inspection documents this in the current inspection " +
    "report. Self-monitoring is always carried out.";
  y = paraPage6(doc, y, afterSelfInspectionPara, translations);

  // ---------- Standards ----------
  y = underlineRowFullWidth(
    doc,
    y,
    "Standards:",
    {
      bold: true,
      size: 9,
    },
    translations
  );

  const standardsPara =
    "This section is taken from the Eurocode table here we need an extra field with a static text talking about which " +
    "standards covering the chosen EUROCODE.";
  y = paraPage6(doc, y, standardsPara, translations);

  // ---------- Independent controls ----------
  y = underlineRowFullWidth(
    doc,
    y,
    "Independent controls",
    {
      bold: true,
      size: 9,
    },
    translations
  );

  const independentInspectionPara1 =
    "The independent inspection shall be carried out by persons who have not directly participated in the actual performance of " +
    "the inspection section in question. All independent checks within a control section are carried out by the same person. The " +
    "independent inspector is not carried out by the head of the work team, The independent inspector must have the necessary " +
    "competencies that allow him to have knowledge within the chosen construction section that is stated on the front page.";
  y = paraPage6(doc, y, independentInspectionPara1, translations);

  const independentInspectionPara2 =
    "When the performance of an inspection section or parts thereof has been carried out and the performer has been ready for " +
    "independent control (i.e. after self-monitoring has been carried out), the independent inspection is carried out.";
  y = paraPage6(doc, y, independentInspectionPara2, translations);

  y = paraPage6(
    doc,
    y,
    "The independent control is carried out according to the project-specific static control plan for execution.",
    translations
  );

  // ---------- 1.3 Level of control ----------
  y = y + 4;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const levelOfControlHeading =
    translations["1.3 Level of control"] || "1.3 Level of control";
  doc.text(levelOfControlHeading, M.l, y);
  y = doc.y + 6;

  y = paraPage6(
    doc,
    y,
    "The level of control for the general control is governed by the selected execution classes, cf. DS/EN 1990 DK NA, Annex B5.",
    translations
  );

  const excClass = dynamic.executionClass || "EXCX";

  doc.font("Helvetica").fontSize(9).fillColor("black");
  const excPrefixText =
    translations["The execution class is "] || "The execution class is ";
  doc.text(excPrefixText, M.l, y, { continued: true });
  doc.fillColor("black").text(excClass, { continued: true });

  // Draw underline from "The execution class is" to end of excClass value
  const excPrefixWidth = doc.widthOfString(excPrefixText);
  const excClassWidth = doc.widthOfString(excClass);
  const excUnderlineStartX = M.l;
  const excUnderlineEndX = M.l + excPrefixWidth + excClassWidth;
  const excUnderlineY = y + 11; // Position underline below text
  doc.strokeColor("black");
  doc
    .moveTo(excUnderlineStartX, excUnderlineY)
    .lineTo(excUnderlineEndX, excUnderlineY)
    .stroke();
  doc.strokeColor("black"); // Reset stroke color

  const excSuffixText =
    translations[
      " and Self-control is performed as a maximum control. The independent control is carried out as a random and maximum control."
    ] ||
    " and Self-control is performed as a maximum control. The independent control is carried out as a random and maximum control.";
  doc.fillColor("black").text(excSuffixText, { continued: false });
  y = doc.y + 4;

  // Performance classes intro
  y = paraPage6(
    doc,
    y,
    "Performance classes indicate the importance of the design for the safety of a load-bearing structure:",
    translations
  );

  // Performance classes as dashed list
  const performanceItems = [
    "EXC1: The design has limited impact on the safety of a load-bearing structure",
    "EXC2: The execution is important for the safety of a load-bearing structure",
    "EXC3: The execution is of great importance for the safety of a load-bearing structure.",
  ];
  y = bulletsDashPage6(doc, y, performanceItems, translations);

  // Footer: logical page 6
  footer(doc, 5, "", translations);
}

// ===== Page 7 helpers =====

function paraPage7(doc, y, text, translations = {}) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
    lineGap: 1,
  });
  return doc.y + 4;
}

// Bullets with "•" – used under 1.5 Controllers
function bulletsDotPage7(doc, y, items, translations = {}) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  let yy = y;
  items.forEach((txt) => {
    const translatedTxt = translations[txt] || txt;
    doc.text("• " + translatedTxt, M.l, yy, {
      width: CONTENT_W,
      lineGap: 1,
    });
    yy = doc.y + 1;
  });
  return yy + 4;
}

// Bullets with "o  " – used for inspector competencies and deviations
function bulletsCirclePage7(doc, y, items, translations = {}) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  let yy = y;
  items.forEach((txt) => {
    const translatedTxt = translations[txt] || txt;
    doc.text("o  " + translatedTxt, M.l, yy, {
      width: CONTENT_W,
      lineGap: 1,
    });
    yy = doc.y + 1;
  });
  return yy + 4;
}

// 4-column underlined row specifically for the "Applier" table
function underlineRowFourColsApplier(
  doc,
  y,
  col1,
  col2,
  col3,
  col4,
  options = {},
  translations = {}
) {
  const col1W = 120; // Applier
  const col2W = 220; // Name / value (increased since we removed Education/Experience)
  const col4W = CONTENT_W - (col1W + col2W); // Initials

  const x1 = M.l;
  const x2 = x1 + col1W;
  const x4 = x2 + col2W;

  const size = options.size || 9;
  const bold = options.bold || false;

  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor("black");

  const translatedCol1 = translations[col1] || col1;
  doc.text(translatedCol1, x1, y, { width: col1W - 4 });
  const y1 = doc.y;

  // col2 might be dynamic (person name) or static label - translate if it's in translations (static labels)
  // Person names won't be in translations, so they'll use the original value
  const translatedCol2 = translations[col2] || col2;
  doc.text(translatedCol2, x2, y, { width: col2W - 4 });
  const y2 = doc.y;

  // Skip col3 (Education / Experience) - removed

  const translatedCol4 = translations[col4] || col4;
  doc.text(translatedCol4, x4, y, { width: col4W - 4 });
  const y4 = doc.y;

  const bottom = Math.max(y1, y2, y4) + 2;

  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();
  doc.strokeColor("black").fillColor("black");

  return bottom + 4;
}

// ===== PAGE 7 =====

function page7(doc, dynamic, translations = {}) {
  let y = M.t + 25;

  // ---------- 1.4 Organisation of the control work ----------
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const orgHeading =
    translations["1.4 Organisation of the control work"] ||
    "1.4 Organisation of the control work";
  doc.text(orgHeading, M.l, y);
  y = doc.y + 6;

  const orgParaText =
    "Each inspection section must be assigned one, and only one inspector who is ensured that he has not contributed to the " +
    "execution of the construction section in question. The executing party or its representative has drawn up the control plan and " +
    "will act as the lead inspector in connection with the selection of inspectors for the individual control sections, as well as " +
    "compiling and checking the inspection report. As far as possible... the aim is that the lead inspector also carries out the actual " +
    "inspection on site in order to simplify the inspection work.";
  y = paraPage7(doc, y, orgParaText, translations);

  y += 4;

  // ---------- 1.5 Controllers ----------
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const controllersHeading =
    translations["1.5 Controllers"] || "1.5 Controllers";
  doc.text(controllersHeading, M.l, y);
  y = doc.y + 4;

  // Bullet list under 1.5
  const controllersItems = [
    "The independent inspection is carried out by an operator who has not acted as the executor on the site.",
    "Controls are carried out by the same organisation as the executing organisation.",
    "It is ensured that the inspector has the right and necessary skills to carry out the inspection.",
    "Inspectors must always have the necessary qualifications acquired through training and the necessary competences acquired through experience both in relation to the subject of the inspection and in planning, carrying out and documenting the inspection.",
  ];
  y = bulletsDotPage7(doc, y, controllersItems, translations);

  // "Therefore, the inspector must at least" - bold with underline
  const inspectorText =
    translations["Therefore, the inspector must at least"] ||
    "Therefore, the inspector must at least";
  doc.font("Helvetica-Bold").fontSize(9).fillColor("black");
  doc.text(inspectorText, M.l, y, {
    width: CONTENT_W,
    lineGap: 1,
  });

  // Draw underline
  const textWidth = doc.widthOfString(inspectorText);
  const underlineY = y + 11; // Position underline below text
  doc.strokeColor("black");
  doc
    .moveTo(M.l, underlineY)
    .lineTo(M.l + textWidth, underlineY)
    .stroke();
  doc.strokeColor("black"); // Reset stroke color

  y = doc.y + 4;

  // Inspector competency bullets (o ...)
  const inspectorMustItems = [
    "be familiar with best practices for the execution of the relevant structural parts and construction sections.",
    "Have the ability to create an overview and wonder",
    "Have knowledge of your own limitations and make use of professional experts for parts of the control task",
    "Have competencies at least equivalent to those of the person who has performed the work",
    "Have professional qualifications and competencies for carrying out the construction work",
    "Be able to understand standards, control plans and good craftsmanship",
    "Be able to familiarize themselves with the documents that form the basis for the execution",
  ];
  y = bulletsCirclePage7(doc, y, inspectorMustItems, translations);

  // Paragraph about documenting examiner's qualifications
  const examinerQualText =
    "In order to document the examiner's qualifications and competences, his/her competences are described in detail in the " +
    "inspection report, e.g. in the examiner's CV.";
  y = paraPage7(doc, y, examinerQualText, translations);

  // Small Applier table
  y = underlineRowFourColsApplier(
    doc,
    y,
    "Applier",
    "Name",
    "", // Education / Experience - removed
    "Initials",
    { bold: true },
    translations
  );

  // Get onController name from gamma
  const onControllerName =
    dynamic.gamma?.onController?.name ||
    translations["From Company organisation"] ||
    "From Company organisation";

  y = underlineRowFourColsApplier(
    doc,
    y,
    translations["Own Controller"] || "Own Controller",
    onControllerName,
    "", // Education / Experience - removed
    translations["OC Fixed"] || "OC Fixed",
    {},
    translations
  );

  // Show Independent Controller users - one row per user
  const independentControllers = dynamic.independentControllers || [];

  if (independentControllers.length > 0) {
    // Show each Independent Controller user on a separate row
    for (const controller of independentControllers) {
      const controllerName =
        controller.name ||
        controller.username ||
        translations["From Company organisation"] ||
        "From Company organisation";
      y = underlineRowFourColsApplier(
        doc,
        y,
        translations["Independent controller"] || "Independent controller",
        controllerName,
        "", // Education / Experience - removed
        translations["IC Fixed"] || "IC Fixed",
        {},
        translations
      );
    }
  } else {
    // Fallback if no users found
    y = underlineRowFourColsApplier(
      doc,
      y,
      translations["Independent controller"] || "Independent controller",
      translations["From Company organisation"] || "From Company organisation",
      "", // Education / Experience - removed
      translations["IC Fixed"] || "IC Fixed",
      {},
      translations
    );
  }

  y += 6;

  // ---------- 1.6 Use of assistance ----------
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const assistanceHeading =
    translations["1.6 Use of assistance"] || "1.6 Use of assistance";
  doc.text(assistanceHeading, M.l, y);
  y = doc.y + 4;

  const assistanceParaText =
    "If the inspector chooses to use assistance in carrying out the inspection, the assistant inspector must have at least the " +
    "competencies described in section 1.2 above. In addition, it is important to be aware that the final responsibility for the " +
    "inspection at all times rests with the inspector and is therefore not transferred to the assistant inspector. The inspector must " +
    "therefore follow up on inspections carried out by assistant inspectors and ensure that the inspection has been carried out " +
    "sensibly by checking the documentation for the inspection and sign this as the inspector.";
  y = paraPage7(doc, y, assistanceParaText, translations);

  y += 4;

  // ---------- 1.7 Follow-up on deviations ----------
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const deviationsHeading =
    translations["1.7 Follow-up on deviations"] ||
    "1.7 Follow-up on deviations";
  doc.text(deviationsHeading, M.l, y);
  y = doc.y + 4;

  const deviationsIntroText =
    "If deviations are found in the controls, the following procedure shall be followed:";
  y = paraPage7(doc, y, deviationsIntroText, translations);

  const deviationsItems = [
    "The work on the structural part is stopped and may not be continued until the deviation has been corrected.",
    "The inspector prepares a non-conformance report, which may include illustrations of the non-conformity and proposed solutions.",
    "The inspector assesses, together with the executors, whether the defect is of a nature that makes it necessary to reassess the working basis for the execution and the associated controls.",
    "The inspector assesses, together with the executors, the implications of the deviation for the further execution and suitability in relation to the intended purpose of the design.",
    "The verifier assesses, together with the performing measures, the necessary measures to make the component acceptable.",
    "The inspector assesses, together with the contractors, the necessity of rejecting and replacing the non-repairable building part.",
    "After rectifying the deviation, this is checked again and the result is documented.",
    "If it is not possible to correct the deviation, the building designer must approve the deviation.",
  ];
  y = bulletsCirclePage7(doc, y, deviationsItems, translations);

  // Final sentence about serious errors / maximum control
  const finalParaText =
    "If there are serious or more repeated errors in a control point, the control can be extended to a maximum control of the current control point and/or the building designer can be involved.";
  y = paraPage7(doc, y, finalParaText, translations);

  // Footer – logical page 7
  footer(doc, 6);
}

// ===== Page 8 helpers =====

function paraPage8(doc, y, text, translations = {}) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
    lineGap: 1,
  });
  return doc.y + 4;
}

// Bullets with "o  ..." for Explanation of B.5.2–B.5.4
function bulletsCirclePage8(doc, y, items, translations = {}) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  let yy = y;
  items.forEach((txt) => {
    const translatedTxt = translations[txt] || txt;
    doc.text("o  " + translatedTxt, M.l, yy, {
      width: CONTENT_W,
      lineGap: 1,
    });
    yy = doc.y + 1;
  });
  return yy + 4;
}

// ===== PAGE 8 – 2. GENERAL CONTROLS =====

function page8(doc, dynamic, translations = {}) {
  let y = M.t + 25;

  // ---------- 2. GENERAL CONTROLS (blue bar) ----------
  y = drawSectionBar(doc, y, "2. GENERAL CONTROLS", translations);

  // ---------- 2.1 General ----------
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const generalHeading = translations["2.1 General"] || "2.1 General";
  doc.text(generalHeading, M.l, y);
  y = doc.y + 6;

  // First paragraph (general control according to DS 1140 / Eurocodes)
  const generalControlPara =
    "The general control is carried out in accordance with the Construction standard DS 1140. In addition, the general control is carried out " +
    "in accordance with the rules of DS/EN 1992-DS/EN 1999 including the associated national annexes and in accordance with the rules of the " +
    "related execution standards including the corresponding national application documents.";
  y = paraPage8(doc, y, generalControlPara, translations);

  // Division in DS 1140, Annex B – B.1–B.6 list
  const divisionPara =
    "The general control is carried out on the basis of the division in DS 1140, Annex B.";
  y = paraPage8(doc, y, divisionPara, translations);

  doc.font("Helvetica-Bold").fontSize(9).fillColor("black");
  const controlSubjectLabel =
    translations["Control subject"] || "Control subject";
  doc.text(controlSubjectLabel, M.l, y);
  y = doc.y + 4;

  doc.font("Helvetica").fontSize(9);
  const controlSubjects = [
    "B.1 Execution basis from design",
    "B.2 Basis for execution of the work",
    "B.3 The material and products",
    "B.4 Reception control",
    "B.5 Execution",
    "   B.5.1 Transport and storage on site",
    "   B.5.2 Previously completed construction",
    "   B.5.3 Assembly of prefabricated structural parts",
    "   B.5.4 Execution of non-certified structural parts",
    "B.6 Final inspection",
  ];
  controlSubjects.forEach((line) => {
    const translatedLine = translations[line] || line;
    doc.text(translatedLine, M.l, y, { width: CONTENT_W, lineGap: 1 });
    y = doc.y + 1;
  });
  y += 4;

  // Independent verification line
  const independentVerificationPara =
    "The independent verification that the own-check has been carried out is always carried out as a maximum control.";
  y = paraPage8(doc, y, independentVerificationPara, translations);

  // ---------- Explanation of B.5.2 to B.5.4 ----------
  doc.font("Helvetica-Bold").fontSize(9).fillColor("black");
  const explanationLabel =
    translations["Explanation of B.5.2 to B.5.4:"] ||
    "Explanation of B.5.2 to B.5.4:";
  doc.text(explanationLabel, M.l, y);
  y = doc.y + 4;

  const criticalStructuresPara =
    "When constructing structures that are of critical importance to the functioning and integrity of the structure,";
  y = paraPage8(doc, y, criticalStructuresPara, translations);

  const b5Bullets = [
    "Control points are fully checked (maximum) for:",
    "Presence of structural parts",
    "Presence of joint parts",
    "Remuneration depths for assembly of prefabricated structural parts",
    "The subsoil for geotechnical constructions with regard to whether the soil is as assumed in the execution basis from the design stage.",
  ];

  // First bullet line is a sentence, then 4 bullets:
  // We render first line as a normal paragraph, then the rest as o-bullets.
  const firstLine = b5Bullets[0];
  const restLines = b5Bullets.slice(1);

  y = paraPage8(doc, y, firstLine, translations);
  y = bulletsCirclePage8(doc, y, restLines, translations);

  // ---------- 2.2 Control section ----------
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const controlSectionHeading =
    translations["2.2 Control section"] || "2.2 Control section";
  doc.text(controlSectionHeading, M.l, y);
  y = doc.y + 6;

  const delimitedSectionPara =
    "The delimited design section is subdivided into control sections according to e.g. construction types, scope or time of " +
    "execution, however, common to the fact that control sections must always be well defined, delimited in relation to other " +
    "control sections and delimited by a continuous production period of a maximum of 4 weeks.";
  y = paraPage8(doc, y, delimitedSectionPara, translations);

  const executionDividedPara =
    "The execution of the construction section is divided according to the tender control plan for the following control sections:";
  y = paraPage8(doc, y, executionDividedPara, translations);

  // Table: LISTING | DOCUMENT | CONSTRUCTION PART: | ACCOMPLISHMENT
  // Reuses underlineRowFourColsTable from Page 5
  y = underlineRowFourColsTable(
    doc,
    y,
    "LISTING",
    "DOCUMENT",
    "CONSTRUCTION PART:",
    "ACCOMPLISHMENT",
    { header: true, size: 9 },
    translations
  );

  const listingVal =
    dynamic.listingValue || "B2. " + (dynamic.xNumber || "X number");
  const documentVal = dynamic.documentValue || "STATIC CONTROL PLAN";
  const constructionVal = dynamic.constructionPart || "Construction part text";
  const accomplishmentVal =
    dynamic.accomplishmentValue || dynamic.specialText || "Special text";

  y = underlineRowFourColsTable(
    doc,
    y,
    listingVal,
    documentVal,
    constructionVal,
    accomplishmentVal,
    { header: false, size: 9, valueColor: "black" },
    translations
  );

  // ---------- 2.3 Explanation of the selection of controls ----------
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const explanationSelectionHeading =
    translations["2.3 Explanation of the selection of controls"] ||
    "2.3 Explanation of the selection of controls";
  doc.text(explanationSelectionHeading, M.l, y);
  y = doc.y + 6;

  // Handle dynamic kkx value in the paragraph
  const kkx = dynamic.kkx || "KKX";
  const constructionClassPrefix =
    translations[
      "As this construction section is placed in construction class "
    ] || "As this construction section is placed in construction class ";
  const constructionClassSuffix =
    translations[
      ", the selected control points must be explained. This is done in connection with the inspection report."
    ] ||
    ", the selected control points must be explained. This is done in connection with the inspection report.";
  const constructionClassPara =
    constructionClassPrefix + kkx + constructionClassSuffix;
  y = paraPage8(doc, y, constructionClassPara, translations);

  // ---------- 2.4 Checkpoints ----------
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const checkpointsHeading =
    translations["2.4 Checkpoints"] || "2.4 Checkpoints";
  doc.text(checkpointsHeading, M.l, y);
  y = doc.y + 6;

  y = paraPage8(doc, y, "", translations);

  // Same 4-column table again under 2.4
  y = underlineRowFourColsTable(
    doc,
    y,
    "LISTING",
    "DOCUMENT",
    "CONSTRUCTION PART:",
    "ACCOMPLISHMENT",
    { header: true, size: 9 },
    translations
  );

  y = underlineRowFourColsTable(
    doc,
    y,
    listingVal,
    documentVal,
    constructionVal,
    accomplishmentVal,
    { header: false, size: 9, valueColor: "black" },
    translations
  );

  const controlPointsStatedPara =
    "Control points are stated in the control plan prepared by the executing contractor.";
  y = paraPage8(doc, y, controlPointsStatedPara, translations);

  // Footer – logical page 8
  footer(doc, 7);
}

// ===== Page 9 helpers =====

function paraPage9(doc, y, text, translations = {}) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
    lineGap: 1,
  });
  return doc.y + 4;
}

// 3-column underlined row: ID | SPECIAL CONTROL | DESCRIPTION
function underlineRowThreeColsSpecial(
  doc,
  y,
  col1,
  col2,
  col3,
  options = {},
  translations = {}
) {
  const col1W = 60; // ID
  const col2W = 180; // SPECIAL CONTROL
  const col3W = CONTENT_W - (col1W + col2W); // DESCRIPTION

  const x1 = M.l;
  const x2 = x1 + col1W;
  const x3 = x2 + col2W;

  const size = options.size || 9;
  const bold = options.bold || false;

  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor("black");

  const translatedCol1 = translations[col1] || col1;
  doc.text(translatedCol1, x1, y, { width: col1W - 4 });
  const y1 = doc.y;

  const translatedCol2 = translations[col2] || col2;
  doc.text(translatedCol2, x2, y, { width: col2W - 4 });
  const y2 = doc.y;

  const translatedCol3 = translations[col3] || col3;
  doc.text(translatedCol3, x3, y, { width: col3W - 4 });
  const y3 = doc.y;

  const bottom = Math.max(y1, y2, y3) + 2;

  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();
  doc.strokeColor("black").fillColor("black");

  return bottom + 4;
}

// ===== PAGE 9 – 3. SPECIAL CONTROLS + 4. DOCUMENTATION =====

function page9(doc, dynamic, translations = {}) {
  let y = M.t + 25;

  // ---------- 3. SPECIAL CONTROLS (top-level section) ----------
  y = drawSectionBar(doc, y, "3. SPECIAL CONTROLS", translations);

  // 3.1 General
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const general31Heading = translations["3.1 General"] || "3.1 General";
  doc.text(general31Heading, M.l, y);
  y = doc.y + 6;

  const noSpecialControlsPara =
    "There are no special controls assigned by the building designers, cf.  This construction section.";
  y = paraPage9(doc, y, noSpecialControlsPara, translations);

  const specialControlsStatedPara =
    "Should there be special controls, they will be stated in section 3.2";
  y = paraPage9(doc, y, specialControlsStatedPara, translations);

  // 3.2 Special checkpoints
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const specialCheckpointsHeading =
    translations["3.2 Special checkpoints"] || "3.2 Special checkpoints";
  doc.text(specialCheckpointsHeading, M.l, y);
  y = doc.y + 6;

  const noSpecialControlsRequiredPara =
    "Cf. section 3.1, no special controls are required.";
  y = paraPage9(doc, y, noSpecialControlsRequiredPara, translations);

  const specialChecksStatedPara =
    "If there are special checks, it will be stated below in the form, otherwise there will be none.";
  y = paraPage9(doc, y, specialChecksStatedPara, translations);

  // Data from Special Control points - IF Any
  const dataFromSpecialControlPara =
    "Data from Special Control points - IF Any";
  y = paraPage9(doc, y, dataFromSpecialControlPara, translations);

  // ID / SPECIAL CONTROL / DESCRIPTION header row (no data rows)
  y = underlineRowThreeColsSpecial(
    doc,
    y,
    "ID",
    "SPECIAL CONTROL",
    "DESCRIPTION",
    { bold: true, size: 9 },
    translations
  );

  y += 6;

  // ---------- 4. DOCUMENTATION (top-level section) ----------
  y = drawSectionBar(doc, y, "4. DOCUMENTATION", translations);

  // 4.1 General description of documentation
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const generalDescriptionHeading =
    translations["4.1 General description of documentation"] ||
    "4.1 General description of documentation";
  doc.text(generalDescriptionHeading, M.l, y);
  y = doc.y + 6;

  const documentationControlPara =
    "The documentation of the control consists of this control plan and associated appendices for the present construction section. " +
    "In addition, this also consists of an inspection report and associated appendices.";
  y = paraPage9(doc, y, documentationControlPara, translations);

  // "Document:" line
  const documentLabel = translations["Document:"] || "Document:";
  y = paraPage9(doc, y, documentLabel, translations);

  // Table: LISTING | DOCUMENT | CONSTRUCTION PART: | ACCOMPLISHMENT
  // Reuse underlineRowFourColsTable from Page 5 (do not redefine it)
  y = underlineRowFourColsTable(
    doc,
    y,
    "LISTING",
    "DOCUMENT",
    "CONSTRUCTION PART:",
    "ACCOMPLISHMENT",
    { header: true, size: 9 },
    translations
  );

  // Dynamic values for B3 and A5 (make them red so you know they are dynamic later)
  const b3Listing = dynamic.b3Listing || `B3. ${dynamic.xNumber || "X number"}`;
  const b3Document = dynamic.b3Document || "STATIC INSPECTION REPORT";
  const a5Listing = dynamic.a5Listing || `A5. ${dynamic.xNumber || "X number"}`;
  const a5Document = dynamic.a5Document || "A5 AS DONE";
  const constructionVal = dynamic.constructionPart || "Construction part text";
  const specialVal = dynamic.specialText || "Special text";

  // B3 row
  y = underlineRowFourColsTable(
    doc,
    y,
    b3Listing,
    b3Document,
    constructionVal,
    specialVal,
    { header: false, size: 9, valueColor: "black" },
    translations
  );

  // A5 row
  y = underlineRowFourColsTable(
    doc,
    y,
    a5Listing,
    a5Document,
    constructionVal,
    specialVal,
    { header: false, size: 9, valueColor: "black" },
    translations
  );

  const updatedEveryTimePara =
    "The above is updated every time a change occurs in the execution.";
  y = paraPage9(doc, y, updatedEveryTimePara, translations);

  const documentationContainsPara =
    "Documentation contains the actual control result, but also contains a follow-up on the control, including an account of the " +
    "points where there have been comments from the control in relation to how the comment has been followed up.";
  y = paraPage9(doc, y, documentationContainsPara, translations);

  // 4.2 Documentation of general controls
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const documentationGeneralHeading =
    translations["4.2 Documentation of general controls"] ||
    "4.2 Documentation of general controls";
  doc.text(documentationGeneralHeading, M.l, y);
  y = doc.y + 6;

  const generalControlDocumentedPara =
    "The general control is documented in accordance with the requirements specified in the control plans.";
  y = paraPage9(doc, y, generalControlDocumentedPara, translations);

  const documentationGeneralControlsPara =
    "Documentation of general controls consists of a completed control report, with all points clarified, " +
    "approved and signed by the examiner. Deviations must be documented to be remedied by a " +
    "deviation report, and the item in the control report cannot be approved until the deviation report has been completed.";
  y = paraPage9(doc, y, documentationGeneralControlsPara, translations);

  const documentationKeptPara =
    "The documentation for the general control is kept with the contractor. Documentation is stored for at least 5 years after the " +
    "occupancy permit.";
  y = paraPage9(doc, y, documentationKeptPara, translations);

  // 4.3 Documentation of special controls
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const documentationSpecialHeading =
    translations["4.3 Documentation of special controls"] ||
    "4.3 Documentation of special controls";
  doc.text(documentationSpecialHeading, M.l, y);
  y = doc.y + 6;

  const noSpecialControlsRequiredDocPara =
    "In its documentation, the building designer has not required any special controls.";
  y = paraPage9(doc, y, noSpecialControlsRequiredDocPara, translations);

  // 4.4 Documentation of deviations and follow-up
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const documentationDeviationsHeading =
    translations["4.4 Documentation of deviations and follow-up"] ||
    "4.4 Documentation of deviations and follow-up";
  doc.text(documentationDeviationsHeading, M.l, y);
  y = doc.y + 6;

  const deviationsDetectedPara =
    "If, in the course of the general or special control, deviations are detected, this shall be noted in the " +
    "control scheme for that control point in the static report.";
  y = paraPage9(doc, y, deviationsDetectedPara, translations);

  // 4.5 Checking Control Documentation
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const checkingControlDocHeading =
    translations["4.5 Checking Control Documentation"] ||
    "4.5 Checking Control Documentation";
  doc.text(checkingControlDocHeading, M.l, y);
  y = doc.y + 6;

  const controlDocumentationCollectedPara =
    "The control documentation is collected and reviewed by the inspector and it is ensured that all documents are present, as well " +
    "as all controls are completed, dated and signed.";
  y = paraPage9(doc, y, controlDocumentationCollectedPara, translations);

  // Footer – logical page 9
  footer(doc, 8);
}

// ===== Page 10 helpers =====

function paraPage10(doc, y, text, translations = {}) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
    lineGap: 1,
  });
  return doc.y + 4;
}

// ===== PAGE 10 – 5. LISTINGS + 5.1 Scope of control =====

function page10(doc, dynamic, translations = {}) {
  let y = M.t + 25;

  // ---------- 5. LISTINGS (top-level section, blue bar) ----------
  y = drawSectionBar(doc, y, "5. LISTINGS", translations);

  // 4-column table header
  y = underlineRowFourColsTable(
    doc,
    y,
    "LISTING",
    "DOCUMENT",
    "CONSTRUCTION PART:",
    "ACCOMPLISHMENT",
    { header: true, size: 9 },
    translations
  );

  // Dynamic values for B2 / B3 / A5 (all in red for now)
  const b2Listing = dynamic.b2Listing || `B2. ${dynamic.xNumber || "X number"}`;
  const b2Document = dynamic.b2Document || "STATIC CONTROL PLAN";

  const b3Listing = dynamic.b3Listing || `B3. ${dynamic.xNumber || "X number"}`;
  const b3Document = dynamic.b3Document || "STATIC INSPECTION REPORT";

  const a5Listing = dynamic.a5Listing || `A5. ${dynamic.xNumber || "X number"}`;
  const a5Document = dynamic.a5Document || "A5 AS DONE";

  const constructionVal = dynamic.constructionPart || "Construction part text";
  const specialVal = dynamic.specialText || "Special text";

  // B2 row
  y = underlineRowFourColsTable(
    doc,
    y,
    b2Listing,
    b2Document,
    constructionVal,
    specialVal,
    { header: false, size: 9, valueColor: "black" },
    translations
  );

  // B3 row
  y = underlineRowFourColsTable(
    doc,
    y,
    b3Listing,
    b3Document,
    constructionVal,
    specialVal,
    { header: false, size: 9, valueColor: "black" },
    translations
  );

  // A5 row
  y = underlineRowFourColsTable(
    doc,
    y,
    a5Listing,
    a5Document,
    constructionVal,
    specialVal,
    { header: false, size: 9, valueColor: "black" },
    translations
  );

  // Text below table
  const namingDeterminedPara =
    "The naming of the documents above is determined by the building designer.";
  y = paraPage10(doc, y, namingDeterminedPara, translations);

  const aboveDocumentsPara =
    "The above documents will be part of the overall static documentation for the section of this construction when the work is completed.";
  y = paraPage10(doc, y, aboveDocumentsPara, translations);

  const seeAlsoTablePara =
    "See also the table further down in the control plan under section 7.1.";
  y = paraPage10(doc, y, seeAlsoTablePara, translations);

  y += 4;

  // ---------- 5.1 Scope of control ----------
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const scopeOfControlHeading =
    translations["5.1 Scope of control"] || "5.1 Scope of control";
  doc.text(scopeOfControlHeading, M.l, y);
  y = doc.y + 6;

  const scopeOfControlsPara =
    "The scope of controls is stated in the tables under section 7.1 and is determined on the basis of which (classes) the Structural Engineer has stated in the project material.";
  y = paraPage10(doc, y, scopeOfControlsPara, translations);

  // Footer – logical page 10
  footer(doc, 9);
}

// ===== Page 11 helpers =====

function paraPage11(doc, y, text, translations = {}) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
    lineGap: 1,
  });
  return doc.y + 4;
}

// Helper function to fetch image from URL
async function fetchImageBuffer(url) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(response.data, "binary");
  } catch (error) {
    console.error("Error fetching image:", url, error.message);
    throw error;
  }
}

// Helper function to get filename without extension
function getFilenameWithoutExtension(filename) {
  if (!filename) return "";
  const lastDot = filename.lastIndexOf(".");
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
}

// ===== PAGE 11 – 6. CONTROL POINTS SELECTED =====

async function page11(doc, dynamic, translations = {}) {
  let y = M.t + 25;

  // Top-level section bar
  y = drawSectionBar(doc, y, "6. CONTROL POINTS SELECTED", translations);

  // "OVERVIEW:"
  doc.font("Helvetica-Bold").fontSize(9).fillColor("black");
  const overviewLabel = translations["OVERVIEW:"] || "OVERVIEW:";
  doc.text(overviewLabel, M.l, y);
  y = doc.y + 6;

  // "DRAWINGS INDICATING SELECTED INSPECTION POINTS :"
  doc.font("Helvetica").fontSize(9).fillColor("black");
  const drawingsIndicatingLabel =
    translations["DRAWINGS INDICATING SELECTED INSPECTION POINTS :"] ||
    "DRAWINGS INDICATING SELECTED INSPECTION POINTS :";
  doc.text(drawingsIndicatingLabel, M.l, y, {
    width: CONTENT_W,
  });
  y = doc.y + 6;

  // Get filename from gamma.drawing.mainDrawings[0]
  // NOTE: drawingFileName should NOT be translated - it's a file name
  let drawingFileName = "File name";
  const gamma = dynamic.gamma || {};
  if (
    gamma.drawing &&
    gamma.drawing.mainDrawings &&
    gamma.drawing.mainDrawings.length > 0
  ) {
    const mainDrawing = gamma.drawing.mainDrawings[0];
    const filename =
      mainDrawing.original ||
      mainDrawing.originalname ||
      mainDrawing.filename ||
      mainDrawing.stored ||
      "";
    drawingFileName = getFilenameWithoutExtension(filename) || "File name";
  }

  // DRAWING NAME : File name
  // Label is translated, but drawingFileName itself is NOT translated
  doc.font("Helvetica").fontSize(9).fillColor("black");
  const drawingNameLabel = translations["DRAWING NAME : "] || "DRAWING NAME : ";
  doc.text(drawingNameLabel, M.l, y, { continued: true });
  // drawingFileName is NOT translated - it's a file name
  doc.fillColor("black").text(drawingFileName, { continued: false });
  doc.fillColor("black");
  y = doc.y + 6;

  // Get image from gamma.annotatedPdfs[0].s3Location
  const imageUrl =
    gamma.annotatedPdfs && gamma.annotatedPdfs.length > 0
      ? gamma.annotatedPdfs[0].s3Location ||
        gamma.annotatedPdfs[0].s3location ||
        gamma.annotatedPdfs[0].location ||
        ""
      : "";

  // Calculate available space for image (footer starts at PAGE.h - 35)
  // Reserve space for last two lines (paragraph + final line + spacing = ~50px)
  const footerY = PAGE.h - 35;
  const spaceForText = 50; // Space needed for the two lines below image
  const availableHeight = footerY - y - spaceForText;

  // Display image if available
  if (imageUrl) {
    try {
      const imgBuffer = await fetchImageBuffer(imageUrl);
      // Calculate image dimensions to fit remaining page space
      const maxWidth = CONTENT_W;
      const maxHeight = Math.max(availableHeight, 100); // At least 100px, but use available space

      doc.image(imgBuffer, M.l, y, {
        fit: [maxWidth, maxHeight],
        align: "left",
      });
      y = doc.y + 10;
    } catch (error) {
      console.error("Error displaying image in page 11:", error.message);
      // Fallback text if image fails to load
      doc.font("Helvetica").fontSize(9).fillColor("black");
      const imageErrorText =
        translations["(Image could not be loaded)"] ||
        "(Image could not be loaded)";
      doc.text(imageErrorText, M.l, y, {
        width: CONTENT_W,
      });
      doc.fillColor("black");
      y = doc.y + 10;
    }
  } else {
    // No image available
    const markedMainDrawing =
      translations["Marked main drawing ."] || "Marked main drawing .";
    doc.font("Helvetica").fontSize(9).fillColor("black");
    doc.text(markedMainDrawing, M.l, y, {
      width: CONTENT_W,
    });
    doc.fillColor("black");
    y = doc.y + 10;
  }

  // Paragraph: Above are points indicated... (below image)
  const abovePointsPara =
    "Above are points indicated where the executor intends to carry out inspections.";
  y = paraPage11(doc, y, abovePointsPara, translations);

  y += 4;

  // Final line in parentheses: (below image)
  doc.font("Helvetica").fontSize(9).fillColor("black");
  const noCommentPara =
    translations[
      "(If no comment is received on this within 8 days, this is considered approved)"
    ] ||
    "(If no comment is received on this within 8 days, this is considered approved)";
  doc.text(noCommentPara, M.l, y, { width: CONTENT_W });

  // Footer – logical page 11
  footer(doc, 10);
}

// ===== Page 12 helpers =====

function paraPage12(doc, y, text, translations = {}) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
    width: CONTENT_W,
    lineGap: 1,
  });
  return doc.y + 4;
}

function bulletsPage12(doc, y, items, translations = {}) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  let yy = y;
  items.forEach((txt) => {
    const translatedTxt = translations[txt] || txt;
    doc.text("• " + translatedTxt, M.l, yy, {
      width: CONTENT_W,
      lineGap: 1,
    });
    yy = doc.y + 1;
  });
  return yy + 4;
}

// ===== PAGE 12 – 7. STATIC CONTROLS (SCHEMATIC) =====

function page12(doc, dynamic, translations = {}) {
  let y = M.t + 25;

  // Top-level blue section bar
  y = drawSectionBar(doc, y, "7. STATIC CONTROLS (SCHEMATIC)", translations);

  // 4-column table header: LISTING | DOCUMENT | CONSTRUCTION PART: | ACCOMPLISHMENT
  y = underlineRowFourColsTable(
    doc,
    y,
    "LISTING",
    "DOCUMENT",
    "CONSTRUCTION PART:",
    "ACCOMPLISHMENT",
    { header: true, size: 9 },
    translations
  );

  // B2 row – dynamic (red)
  const b2Listing = dynamic.b2Listing || `B2. ${dynamic.xNumber || "X number"}`;
  const b2Document = dynamic.b2Document || "STATIC CONTROL PLAN";
  const constructionVal = dynamic.constructionPart || ""; // in your PDF this column is visually empty
  const specialVal = dynamic.specialText || "Special text";

  y = underlineRowFourColsTable(
    doc,
    y,
    b2Listing,
    b2Document,
    constructionVal,
    specialVal,
    { header: false, size: 9, valueColor: "black" },
    translations
  );

  // Paragraph below the table
  const controlCarriedOutPara =
    "In the form below, control has been carried out of the project material that has been handed out when awarding awards, and " +
    "forms the basis for the intended and executed work, which is a dynamic process until delivery.";
  y = paraPage12(doc, y, controlCarriedOutPara, translations);

  y += 4;

  // "Standards and norms:"
  doc.font("Helvetica-Bold").fontSize(9).fillColor("black");
  const standardsNormsLabel =
    translations["Standards and norms:"] || "Standards and norms:";
  doc.text(standardsNormsLabel, M.l, y);
  y = doc.y + 4;

  // Bullet list of standards
  const standards = [
    "DS/EN 13670: Execution of concrete structures DI Denmark",
    "DS/EN 206: Concrete – Specification, Properties, Manufacture and Conformity DS1140 Load-Bearing Structures",
  ];
  y = bulletsPage12(doc, y, standards, translations);

  // Footer – logical page 12
  footer(doc, 11);
}

// ========= B-SECTION TABLE HELPERS (POS / CHECKING / SCOPE / ETC) =========

// Column layout for B-tables (9 columns - CHECKING THE and SUBJECT are separate)
const B_COL_WIDTHS = [
  36, // POS
  46, // CHECKING THE
  46, // SUBJECT
  61, // CONSTRUCTION PART
  61, // BASIS
  72, // CONTROL METHOD
  41, // SCOPE
  82, // ACCEPTANCE CRITERIA
  67, // TIME CONTROL
];

function getBColXs() {
  const xs = [M.l];
  for (let i = 0; i < B_COL_WIDTHS.length - 1; i++) {
    xs.push(xs[i] + B_COL_WIDTHS[i]);
  }
  return xs;
}

const B_COL_XS = getBColXs();

function bHeaderRow(doc, y, translations = {}) {
  const headers = [
    "POS",
    "CHECKING THE",
    "SUBJECT",
    "CONSTRUCTION PART",
    "BASIS",
    "CONTROL METHOD",
    "SCOPE",
    "ACCEPTANCE CRITERIA",
    "TIME CONTROL",
  ];

  doc.font("Helvetica-Bold").fontSize(8).fillColor("black");

  let maxY = y;
  headers.forEach((text, idx) => {
    const translatedText = translations[text] || text;
    doc.text(translatedText, B_COL_XS[idx] + 2, y, {
      width: B_COL_WIDTHS[idx] - 4,
    });
    if (doc.y > maxY) maxY = doc.y;
  });

  const bottom = maxY + 2;
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();
  doc.strokeColor("black").fillColor("black");

  return bottom + 2;
}

/**
 * Draw one B-table row.
 * row = {
 *   pos, subject, constructionPart,
 *   basis, method, scope, acceptance, timeControl
 * }
 */
function bDataRow(doc, y, row, translations = {}) {
  doc.font("Helvetica").fontSize(8).fillColor("black");

  // Translate values if they're not numbers/dates
  const translateValue = (value) => {
    if (!value || typeof value !== "string") return value;
    if (isNumberOrDate(value)) return value;
    return translations[value] || value;
  };

  const values = [
    row.pos || "", // pos is usually a number/ID, don't translate
    translateValue(row.checkingThe || ""),
    translateValue(row.subject || ""),
    translateValue(row.constructionPart || ""),
    translateValue(row.basis || ""),
    translateValue(row.method || ""),
    row.scope || "", // scope is usually a percentage, don't translate
    translateValue(row.acceptance || ""),
    translateValue(row.timeControl || ""),
  ];

  let maxY = y;
  values.forEach((text, idx) => {
    doc.text(String(text), B_COL_XS[idx] + 2, y, {
      width: B_COL_WIDTHS[idx] - 4,
    });
    if (doc.y > maxY) maxY = doc.y;
  });

  const bottom = maxY + 2;
  doc.strokeColor(HEADING_COLOR);
  doc
    .moveTo(M.l, bottom)
    .lineTo(PAGE.w - M.r, bottom)
    .stroke();
  doc.strokeColor("black").fillColor("black");

  return bottom + 2;
}

// Small paragraph helper for these pages
function paraBx(doc, y, text) {
  doc.font("Helvetica").fontSize(9).fillColor("black");
  doc.text(text, M.l, y, {
    width: CONTENT_W,
    lineGap: 1,
  });
  return doc.y + 4;
}

function page13(doc, dynamic, translations = {}) {
  let y = M.t + 25;
  let pageSuffix = "a"; // Start with 'a' for first page
  const footerHeight = 35;
  const bottomTextHeight = 50; // Space needed for bottom text
  const minSpaceForRow = 25; // Minimum space needed for a row

  // Use only database records - no default rows
  const b1Rows = dynamic && Array.isArray(dynamic.b1Rows) ? dynamic.b1Rows : [];

  // Normalize rows to always have all fields, and filter out completely empty rows
  // Page 13 always shows 100% in scope column
  const normalizedRows = b1Rows
    .map((r) => ({
      pos: r.pos || "",
      checkingThe: r.checkingThe || "",
      subject: r.subject || "",
      constructionPart: r.constructionPart || "",
      basis: r.basis || "",
      method: r.method || "",
      scope: "100%", // Always 100% for page 13
      acceptance: r.acceptance || "",
      timeControl: r.timeControl || "",
    }))
    .filter((r) => r.pos || r.subject || r.checkingThe); // Only include rows with at least some data

  console.log("Page 13 - B1 rows count:", b1Rows.length);
  console.log("Page 13 - Normalized rows count:", normalizedRows.length);

  // Title with blue background + white text (only on first page)
  const headingText =
    translations["7.1 REVIEW OF THE EXECUTION BASIS FROM THE DESIGN B1"] ||
    "7.1 REVIEW OF THE EXECUTION BASIS FROM THE DESIGN B1";
  y = drawSectionBar(doc, y, headingText, translations);

  // Header row (POS / CHECKING THE / SUBJECT / ...)
  y = bHeaderRow(doc, y, translations);

  // Data rows - only render if there are rows, with page break handling
  if (normalizedRows.length > 0) {
    normalizedRows.forEach((row, index) => {
      // Estimate row height (text can wrap, so we estimate ~25-30px per row)
      const estimatedRowHeight = 30;
      const maxYForContent = PAGE.h - footerHeight - bottomTextHeight;

      // Check if we need a new page before drawing this row
      if (y + estimatedRowHeight > maxYForContent && index > 0) {
        // Add footer to current page
        footer(doc, 12, pageSuffix, translations);

        // Add new page
        doc.addPage();
        pageSuffix = String.fromCharCode(pageSuffix.charCodeAt(0) + 1); // Increment suffix: a -> b -> c, etc.
        y = M.t + 25;

        // Re-add header on new page
        y = bHeaderRow(doc, y, translations);
      }

      // Draw the row
      y = bDataRow(doc, y, row, translations);

      // Safety check: if y exceeded page, PDFKit might have auto-paged
      if (y > PAGE.h - footerHeight) {
        // This shouldn't happen if our check above works, but just in case
        console.warn("Row exceeded page height, y:", y);
      }
    });
  }

  y += 6;

  // Bottom text (exact as in your PDF)
  /*doc.font("Helvetica").fontSize(9).fillColor("black");
  doc.text("Fixed text Fixed text", M.l, y);
  y = doc.y + 4;

  doc.text("100% IC = Independet controler", M.l, y);
  y = doc.y + 4;*/

  // Footer – logical page 12 with suffix
  footer(doc, 12, pageSuffix, translations);
}

function page14(doc, dynamic, translations = {}) {
  let y = M.t + 25;
  let pageSuffix = "a"; // Start with 'a' for first page
  const footerHeight = 35;
  const bottomTextHeight = 60; // Space needed for bottom text
  const minSpaceForRow = 25; // Minimum space needed for a row

  // Use only database records - no default rows
  const b2Rows = dynamic && Array.isArray(dynamic.b2Rows) ? dynamic.b2Rows : [];

  // Determine scope based on gamma.cc value
  const ccValue = dynamic.gamma?.cc
    ? String(dynamic.gamma.cc).toLowerCase()
    : "";
  let dynamicScope = "";
  if (ccValue === "kk1" || ccValue === "kk2") {
    dynamicScope = "10%";
  } else if (ccValue === "kk3" || ccValue === "kk4") {
    dynamicScope = "20%";
  }

  // Normalize each row to fill all columns, and filter out completely empty rows
  const normalizedRows = b2Rows
    .map((r) => ({
      pos: r.pos || "",
      checkingThe: r.checkingThe || "",
      subject: r.subject || "",
      constructionPart: r.constructionPart || "",
      basis: r.basis || "",
      method: r.method || "",
      scope: dynamicScope || r.scope || "",
      acceptance: r.acceptance || "",
      timeControl: r.timeControl || "",
    }))
    .filter((r) => r.pos || r.subject || r.checkingThe); // Only include rows with at least some data

  console.log("Page 14 - B2 rows count:", b2Rows.length);
  console.log("Page 14 - Normalized rows count:", normalizedRows.length);

  // TITLE with blue background + white text (only on first page)
  const headingText =
    translations[
      "7.2 VERIFICATION OF THE BASIS FOR EXECUTION OF THE WORK B2"
    ] || "7.2 VERIFICATION OF THE BASIS FOR EXECUTION OF THE WORK B2";
  y = drawSectionBar(doc, y, headingText, translations);

  // TABLE HEADER: POS / CHECKING THE / SUBJECT / ...
  y = bHeaderRow(doc, y, translations);

  // DATA ROWS - only render if there are rows, with page break handling
  if (normalizedRows.length > 0) {
    normalizedRows.forEach((row, index) => {
      // Estimate row height (text can wrap, so we estimate ~25-30px per row)
      const estimatedRowHeight = 30;
      const maxYForContent = PAGE.h - footerHeight - bottomTextHeight;

      // Check if we need a new page before drawing this row
      if (y + estimatedRowHeight > maxYForContent && index > 0) {
        // Add footer to current page
        footer(doc, 13, pageSuffix, translations);

        // Add new page
        doc.addPage();
        pageSuffix = String.fromCharCode(pageSuffix.charCodeAt(0) + 1); // Increment suffix: a -> b -> c, etc.
        y = M.t + 25;

        // Re-add header on new page
        y = bHeaderRow(doc, y, translations);
      }

      // Draw the row
      y = bDataRow(doc, y, row, translations);

      // Safety check: if y exceeded page, PDFKit might have auto-paged
      // In that case, we need to handle it on the next iteration
      if (y > PAGE.h - footerHeight) {
        // This shouldn't happen if our check above works, but just in case
        console.warn("Row exceeded page height, y:", y);
      }
    });
  }

  y += 6;

  // BOTTOM TEXT (exactly like PDF)
  /*doc.font("Helvetica").fontSize(9).fillColor("black");
  doc.text("Fixed text", M.l, y);
  y = doc.y + 4;

  doc.text("IC  = Independet controler", M.l, y);
  y = doc.y + 4;

  doc.text("Scope 10% if KK1 or kk2", M.l, y);
  y = doc.y + 4;

  doc.text("scope 20% if KK3 or KK4", M.l, y);
  y = doc.y + 4;*/

  // FOOTER – logical page 13 with suffix
  footer(doc, 13, pageSuffix, translations);
}

function page15(doc, dynamic, translations = {}) {
  let y = M.t + 25;
  let pageSuffix = "a"; // Start with 'a' for first page
  const footerHeight = 35;
  const bottomTextHeight = 60; // Space needed for bottom text
  const minSpaceForRow = 25; // Minimum space needed for a row

  // Use only database records - no default rows
  const b3Rows = dynamic && Array.isArray(dynamic.b3Rows) ? dynamic.b3Rows : [];

  // Determine scope based on gamma.cc value
  const ccValue = dynamic.gamma?.cc
    ? String(dynamic.gamma.cc).toLowerCase()
    : "";
  let dynamicScope = "";
  if (ccValue === "kk1" || ccValue === "kk2") {
    dynamicScope = "10%";
  } else if (ccValue === "kk3" || ccValue === "kk4") {
    dynamicScope = "20%";
  }

  // Normalize rows so all columns exist, and filter out completely empty rows
  const normalizedRows = b3Rows
    .map((r) => ({
      pos: r.pos || "",
      checkingThe: r.checkingThe || "",
      subject: r.subject || "",
      constructionPart: r.constructionPart || "",
      basis: r.basis || "",
      method: r.method || "",
      scope: dynamicScope || r.scope || "",
      acceptance: r.acceptance || "",
      timeControl: r.timeControl || "",
    }))
    .filter((r) => r.pos || r.subject || r.checkingThe); // Only include rows with at least some data

  console.log("Page 15 - B3 rows count:", b3Rows.length);
  console.log("Page 15 - Normalized rows count:", normalizedRows.length);

  // TITLE with blue background + white text (only on first page)
  const headingText =
    translations[
      "7.3 VERIFICATION OF DOCUMENTATION OF MATERIALS AND PRODUCTS B3"
    ] || "7.3 VERIFICATION OF DOCUMENTATION OF MATERIALS AND PRODUCTS B3";
  y = drawSectionBar(doc, y, headingText, translations);

  // TABLE HEADER (POS / CHECKING THE / SUBJECT / ...)
  y = bHeaderRow(doc, y, translations);

  // DATA ROWS - only render if there are rows, with page break handling
  if (normalizedRows.length > 0) {
    normalizedRows.forEach((row, index) => {
      // Estimate row height (text can wrap, so we estimate ~25-30px per row)
      const estimatedRowHeight = 30;
      const maxYForContent = PAGE.h - footerHeight - bottomTextHeight;

      // Check if we need a new page before drawing this row
      if (y + estimatedRowHeight > maxYForContent && index > 0) {
        // Add footer to current page
        footer(doc, 14, pageSuffix, translations);

        // Add new page
        doc.addPage();
        pageSuffix = String.fromCharCode(pageSuffix.charCodeAt(0) + 1); // Increment suffix: a -> b -> c, etc.
        y = M.t + 25;

        // Re-add header on new page
        y = bHeaderRow(doc, y, translations);
      }

      // Draw the row
      y = bDataRow(doc, y, row, translations);

      // Safety check: if y exceeded page, PDFKit might have auto-paged
      if (y > PAGE.h - footerHeight) {
        // This shouldn't happen if our check above works, but just in case
        console.warn("Row exceeded page height, y:", y);
      }
    });
  }

  y += 6;

  // BOTTOM TEXT (as in PDF)
  /*doc.font("Helvetica").fontSize(9).fillColor("black");
  doc.text("Fixed text", M.l, y);
  y = doc.y + 4;

  doc.text("Scope 10% if KK1 or kk2", M.l, y);
  y = doc.y + 4;

  doc.text("IC = Independet controler", M.l, y);
  y = doc.y + 4;

  doc.text("scope 20% if KK3 or KK4", M.l, y);
  y = doc.y + 4;*/

  // FOOTER – logical page 14 with suffix
  footer(doc, 14, pageSuffix, translations);
}
function page16(doc, dynamic, translations = {}) {
  let y = M.t + 25;

  // TITLE with blue background + white text
  const headingText =
    translations["7.4 RECEIPT CONTROL DELIVERIES B4"] ||
    "7.4 RECEIPT CONTROL DELIVERIES B4";
  y = drawSectionBar(doc, y, headingText, translations);

  // Use only database records - no default rows
  const b5Rows = dynamic && Array.isArray(dynamic.b5Rows) ? dynamic.b5Rows : [];

  // Determine scope based on gamma.cc value and append "Planned Sample Checks"
  const ccValue = dynamic.gamma?.cc
    ? String(dynamic.gamma.cc).toLowerCase()
    : "";
  const plannedSampleChecksText =
    translations["Planned Sample Checks"] || "Planned Sample Checks";
  let dynamicScope = "";
  if (ccValue === "kk1" || ccValue === "kk2") {
    dynamicScope = `10% ${plannedSampleChecksText}`;
  } else if (ccValue === "kk3" || ccValue === "kk4") {
    dynamicScope = `20% ${plannedSampleChecksText}`;
  }

  // Normalize rows so all columns exist, and filter out completely empty rows
  const normalizedRows = b5Rows
    .map((r) => ({
      pos: r.pos || "",
      checkingThe: r.checkingThe || "",
      subject: r.subject || "",
      constructionPart: r.constructionPart || "",
      basis: r.basis || "",
      method: r.method || "",
      scope: dynamicScope || r.scope || "",
      acceptance: r.acceptance || "",
      timeControl: r.timeControl || "",
    }))
    .filter((r) => r.pos || r.subject || r.checkingThe); // Only include rows with at least some data

  console.log("Page 16 - B5 rows count:", b5Rows.length);
  console.log("Page 16 - Normalized rows count:", normalizedRows.length);

  // TABLE HEADER (POS / CHECKING THE / SUBJECT / ...)
  y = bHeaderRow(doc, y, translations);

  // DATA ROWS - only render if there are rows
  if (normalizedRows.length > 0) {
    normalizedRows.forEach((row) => {
      y = bDataRow(doc, y, row, translations);
    });
  }

  y += 6;

  // BOTTOM TEXT – exactly as in the PDF
  /*doc.font("Helvetica").fontSize(9).fillColor("black");
  doc.text("Fixed text", M.l, y);
  y = doc.y + 4;

  doc.text("IC = Independet controler", M.l, y);
  y = doc.y + 4;

  doc.text("Scope 10% if KK1 or kk2", M.l, y);
  y = doc.y + 4;

  doc.text("scope 20% if KK3 or KK4", M.l, y);
  y = doc.y + 4;

  doc.text("+ Fixed text", M.l, y);
  y = doc.y + 4;

  doc.text("Planned Sample Checks", M.l, y);
  y = doc.y + 4;*/

  // FOOTER – logical page 16 (or whatever page number you want to show)
  footer(doc, 15, "", translations);
}

function page17(doc, dynamic, translations = {}) {
  let y = M.t + 25;

  // TITLE with blue background + white text
  const headingText =
    translations["7.5 PERFORMANCE CONTROL; B5"] ||
    "7.5 PERFORMANCE CONTROL; B5";
  y = drawSectionBar(doc, y, headingText, translations);

  // Use only database records - no default rows
  const b6Rows = dynamic && Array.isArray(dynamic.b6Rows) ? dynamic.b6Rows : [];

  // Determine scope based on gamma.cc value and append "Planned Sample Checks"
  const ccValue = dynamic.gamma?.cc
    ? String(dynamic.gamma.cc).toLowerCase()
    : "";
  const plannedSampleChecksText =
    translations["Planned Sample Checks"] || "Planned Sample Checks";
  let dynamicScope = "";
  if (ccValue === "kk1" || ccValue === "kk2") {
    dynamicScope = `10% ${plannedSampleChecksText}`;
  } else if (ccValue === "kk3" || ccValue === "kk4") {
    dynamicScope = `20% ${plannedSampleChecksText}`;
  }

  // Normalize rows so all columns exist, and filter out completely empty rows
  const normalizedRows = b6Rows
    .map((r) => ({
      pos: r.pos || "",
      checkingThe: r.checkingThe || "",
      subject: r.subject || "",
      constructionPart: r.constructionPart || "",
      basis: r.basis || "",
      method: r.method || "",
      scope: dynamicScope || r.scope || "",
      acceptance: r.acceptance || "",
      timeControl: r.timeControl || "",
    }))
    .filter((r) => r.pos || r.subject || r.checkingThe); // Only include rows with at least some data

  console.log("Page 17 - B6 rows count:", b6Rows.length);
  console.log("Page 17 - Normalized rows count:", normalizedRows.length);
  if (b6Rows.length > 0) {
    console.log(
      "Page 17 - First B6 row sample:",
      JSON.stringify(b6Rows[0], null, 2)
    );
  }

  // TABLE HEADER (POS / CHECKING THE / SUBJECT / ...)
  y = bHeaderRow(doc, y, translations);

  // DATA ROWS - only render if there are rows
  if (normalizedRows.length > 0) {
    normalizedRows.forEach((row) => {
      y = bDataRow(doc, y, row, translations);
    });
  } else {
    console.log("Page 17 - No rows to display, table will be empty");
  }

  y += 6;

  // BOTTOM TEXT (as in PDF-style B5 page)
  /*doc.font("Helvetica").fontSize(9).fillColor("black");
  doc.text("Scope 10% if KK1 or kk2 IC = Independet controler", M.l, y);
  y = doc.y + 4;

  doc.text("scope 20% if KK3 or KK4", M.l, y);
  y = doc.y + 4;

  doc.text("Planned Sample Checks", M.l, y);
  y = doc.y + 4;*/

  // FOOTER – logical page 17
  footer(doc, 16, "", translations);
}

function page18(doc, dynamic, translations = {}) {
  let y = M.t + 25;

  // TITLE with blue background + white text
  const headingText =
    translations["7.6 FINAL INSPECTION B6"] || "7.6 FINAL INSPECTION B6";
  y = drawSectionBar(doc, y, headingText, translations);

  // Use only database records - no default rows
  const b7Rows = dynamic && Array.isArray(dynamic.b7Rows) ? dynamic.b7Rows : [];

  // Normalize rows so all columns exist, and filter out completely empty rows
  // Page 18 always shows "100% Max" in scope column
  const normalizedRows = b7Rows
    .map((r) => ({
      pos: r.pos || "",
      checkingThe: r.checkingThe || "",
      subject: r.subject || "",
      constructionPart: r.constructionPart || "",
      basis: r.basis || "",
      method: r.method || "",
      scope: "100% Max", // Always "100% Max" for page 18
      acceptance: r.acceptance || "",
      timeControl: r.timeControl || "",
    }))
    .filter((r) => r.pos || r.subject || r.checkingThe); // Only include rows with at least some data

  console.log("Page 18 - B7 rows count:", b7Rows.length);
  console.log("Page 18 - Normalized rows count:", normalizedRows.length);

  // TABLE HEADER (POS / CHECKING THE / SUBJECT / ...)
  y = bHeaderRow(doc, y, translations);

  // DATA ROWS - only render if there are rows
  if (normalizedRows.length > 0) {
    normalizedRows.forEach((row) => {
      y = bDataRow(doc, y, row, translations);
    });
  }

  y += 6;

  // BOTTOM TEXT (as in your PDF)
  /*doc.font("Helvetica").fontSize(9).fillColor("black");
  doc.text("Fixed text Fixed text", M.l, y);
  y = doc.y + 4;

  doc.text("100% IC = Independet controler", M.l, y);
  y = doc.y + 4;

  doc.text("MAX OC = Own Controller", M.l, y);
  y = doc.y + 4;*/

  // FOOTER – logical page 17 (last page)
  footer(doc, 17, "", translations);
}

function page19(doc, dynamic) {
  let y = M.t + 25;

  // TITLE with blue background + white text
  y = drawSectionBar(doc, y, "7.7 ADDITIONAL CONTROLS B7");

  // Use only database records - no default rows
  const b7Rows = dynamic && Array.isArray(dynamic.b7Rows) ? dynamic.b7Rows : [];

  // Normalize rows so all columns exist, and filter out completely empty rows
  const normalizedRows = b7Rows
    .map((r) => ({
      pos: r.pos || "",
      checkingThe: r.checkingThe || "",
      subject: r.subject || "",
      constructionPart: r.constructionPart || "",
      basis: r.basis || "",
      method: r.method || "",
      scope: r.scope || "",
      acceptance: r.acceptance || "",
      timeControl: r.timeControl || "",
    }))
    .filter((r) => r.pos || r.subject || r.checkingThe); // Only include rows with at least some data

  console.log("Page 19 - B7 rows count:", b7Rows.length);
  console.log("Page 19 - Normalized rows count:", normalizedRows.length);

  // TABLE HEADER (POS / CHECKING THE / SUBJECT / ...)
  y = bHeaderRow(doc, y);

  // DATA ROWS - only render if there are rows
  if (normalizedRows.length > 0) {
    normalizedRows.forEach((row) => {
      y = bDataRow(doc, y, row);
    });
  }

  y += 6;

  // BOTTOM TEXT
  /*doc.font("Helvetica").fontSize(9).fillColor("black");
  doc.text("Fixed text", M.l, y);
  y = doc.y + 4;*/

  // FOOTER – logical page 19
  footer(doc, 17);
}

// -------------------- MAIN BUILDER --------------------
async function buildStaticControlPlan(
  doc,
  dynamic,
  tableData = {},
  translations = {}
) {
  // Page 1
  await page1(doc, dynamic, translations);

  // Page 2
  doc.addPage();
  page2(doc, dynamic, translations);

  // Page 3
  doc.addPage();
  page3(doc, dynamic, translations);

  // Page 4
  doc.addPage();
  page4(doc, dynamic, translations);

  // Page 5–12
  doc.addPage();
  page5(doc, dynamic, translations);
  doc.addPage();
  page6(doc, dynamic, translations);
  doc.addPage();
  page7(doc, dynamic, translations);
  doc.addPage();
  page8(doc, dynamic, translations);
  doc.addPage();
  page9(doc, dynamic, translations);
  doc.addPage();
  page10(doc, dynamic, translations);
  doc.addPage();
  await page11(doc, dynamic, translations);
  doc.addPage();
  page12(doc, dynamic, translations);
  doc.addPage();
  page13(doc, dynamic, translations);
  doc.addPage();
  page14(doc, dynamic, translations);
  doc.addPage();
  page15(doc, dynamic, translations);
  doc.addPage();
  page16(doc, dynamic, translations);
  doc.addPage();
  page17(doc, dynamic, translations);
  doc.addPage();
  page18(doc, dynamic, translations);
}

// -------------------- ROUTE --------------------
app.get("/download", async (req, res) => {
  try {
    var subjectMatterId = "KP06";
    var projectId = "693d2acb1291ff43b9ea32a3";
    var companyId = "693d25ef252d1b388fff0648";

    // Get target language from query parameter (optional)
    const targetLang = req.query.target_lang || req.query.lang || "DA";

    // Check if database is connected
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    // Fetch company data
    console.log("Fetching company with ID:", companyId);
    const company = await db.collection("companies").findOne({
      _id: new ObjectId(companyId),
    });
    console.log("Company found:", company ? "Yes" : "No");
    if (company) {
      console.log("Company data:", {
        name: company.name,
        address: company.address,
        cvr: company.cvr,
        contactPhone: company.contactPhone,
      });
      console.log(
        "Company picture object:",
        company.picture
          ? JSON.stringify(company.picture, null, 2)
          : "No picture object"
      );
      if (company.picture) {
        console.log(
          "Company picture s3Location:",
          company.picture.s3Location ||
            company.picture.s3location ||
            company.picture.location ||
            "NOT FOUND"
        );
      }
    }

    // Fetch project data (with companyId filter)
    console.log(
      "Fetching project with ID:",
      projectId,
      "and companyId:",
      companyId
    );
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
      companyId: companyId,
    });
    console.log("Project found:", project ? "Yes" : "No");
    if (project) {
      console.log("Project name:", project.name);
    }

    // Extract staticDocumentCheckList from professionAssociatedData
    let b1Rows = [];
    let b2Rows = [];
    let b3Rows = [];

    if (project && project.professionAssociatedData) {
      const professionData = project.professionAssociatedData[subjectMatterId];
      if (professionData && professionData.staticDocumentCheckList) {
        const checklist = professionData.staticDocumentCheckList;

        // Helper function to map checklist item to table row
        const mapChecklistItemToRow = (item) => {
          return {
            pos: item.ItemId || item.pos || "",
            checkingThe:
              item.checkingThe ||
              item["Control of"] ||
              item["Contol of"] ||
              item["CHECKING THE"] ||
              "",
            subject: item.Subject || item.subject || item["SUBJECT"] || "",
            constructionPart:
              item["Construction part"] ||
              item.constructionPart ||
              item["CONSTRUCTION PART"] ||
              "",
            basis: item.Basis || item.basis || "",
            method:
              item["Control method"] ||
              item["Control methode"] ||
              item["CONTROL METHOD"] ||
              item.controlMethod ||
              item.method ||
              "",
            scope:
              item.Scope ||
              item.scope ||
              item.circumference ||
              (item.extent ? `${item.extent * 100}%` : "") ||
              "",
            acceptance:
              item["Acceptance criteria"] ||
              item["Acceptance Criteria"] ||
              item.acceptanceCriteria ||
              item.acceptance ||
              "",
            timeControl:
              item.Time ||
              item.time ||
              item["TIME CONTROL"] ||
              item.timeControl ||
              "",
          };
        };

        // Helper function to deduplicate by ItemId (keep first occurrence)
        const deduplicateByItemId = (items) => {
          const seen = new Set();
          return items.filter((item) => {
            const itemId = item.ItemId || item.pos || "";
            if (itemId && !seen.has(itemId)) {
              seen.add(itemId);
              return true;
            }
            return false;
          });
        };

        // Filter, deduplicate, and sort B1 items (exclude records where ItemId is null or empty)
        b1Rows = checklist
          .filter(
            (item) =>
              item.DS_GroupId === "B1" &&
              item.ItemId != null &&
              item.ItemId !== ""
          )
          .reduce((acc, item) => {
            // Deduplicate: only add if ItemId hasn't been seen
            const itemId = item.ItemId || "";
            if (!acc.find((existing) => (existing.ItemId || "") === itemId)) {
              acc.push(item);
            }
            return acc;
          }, [])
          .sort((a, b) => {
            const aId = a.ItemId || "";
            const bId = b.ItemId || "";
            return aId.localeCompare(bId);
          })
          .map(mapChecklistItemToRow);

        // Filter, deduplicate, and sort B2 items (exclude records where ItemId is null or empty)
        const b2Filtered = checklist.filter(
          (item) =>
            item.DS_GroupId === "B2" &&
            item.ItemId != null &&
            item.ItemId !== ""
        );
        console.log("B2 records before deduplication:", b2Filtered.length);
        b2Rows = b2Filtered
          .reduce((acc, item) => {
            // Deduplicate: only add if ItemId hasn't been seen
            const itemId = item.ItemId || "";
            if (!acc.find((existing) => (existing.ItemId || "") === itemId)) {
              acc.push(item);
            }
            return acc;
          }, [])
          .sort((a, b) => {
            const aId = a.ItemId || "";
            const bId = b.ItemId || "";
            return aId.localeCompare(bId);
          })
          .map(mapChecklistItemToRow);
        console.log("B2 rows after mapping:", b2Rows.length);
        if (b2Rows.length > 0) {
          console.log(
            "First B2 row sample:",
            JSON.stringify(b2Rows[0], null, 2)
          );
        }

        // Filter, deduplicate, and sort B3 items (exclude records where ItemId is null or empty)
        const b3Filtered = checklist.filter(
          (item) =>
            item.DS_GroupId === "B3" &&
            item.ItemId != null &&
            item.ItemId !== ""
        );
        console.log("B3 records before deduplication:", b3Filtered.length);
        b3Rows = b3Filtered
          .reduce((acc, item) => {
            // Deduplicate: only add if ItemId hasn't been seen
            const itemId = item.ItemId || "";
            if (!acc.find((existing) => (existing.ItemId || "") === itemId)) {
              acc.push(item);
            }
            return acc;
          }, [])
          .sort((a, b) => {
            const aId = a.ItemId || "";
            const bId = b.ItemId || "";
            return aId.localeCompare(bId);
          })
          .map(mapChecklistItemToRow);

        console.log("B1 rows found (after deduplication):", b1Rows.length);
        console.log("B2 rows found (after deduplication):", b2Rows.length);
        console.log("B3 rows found (after deduplication):", b3Rows.length);

        // Log B3 ItemIds for debugging
        if (b3Rows.length > 0) {
          console.log("B3 ItemIds:", b3Rows.map((r) => r.pos).join(", "));
        }
      } else {
        console.log(
          "No staticDocumentCheckList found for subjectMatterId:",
          subjectMatterId
        );
      }
    } else {
      console.log("No professionAssociatedData found in project");
    }

    // Fetch gamma data - get the most recent one
    // Try with both string and ObjectId for projectsId
    console.log("Fetching gamma with:", {
      companyId,
      projectId,
      subjectMatterId,
    });
    let gammaResults = await db
      .collection("gammas")
      .find({
        companyId: companyId,
        $or: [
          { projectsId: { $in: [projectId] } },
          { projectsId: { $in: [new ObjectId(projectId)] } },
        ],
        "profession.SubjectMatterId": subjectMatterId,
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    let gamma = gammaResults.length > 0 ? gammaResults[0] : null;

    // If no gamma found with subjectMatterId, try without it
    if (!gamma) {
      console.log("Gamma not found with subjectMatterId, trying without it...");
      gammaResults = await db
        .collection("gammas")
        .find({
          companyId: companyId,
          $or: [
            { projectsId: { $in: [projectId] } },
            { projectsId: { $in: [new ObjectId(projectId)] } },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();
      gamma = gammaResults.length > 0 ? gammaResults[0] : null;
    }
    console.log("Gamma found:", gamma ? "Yes" : "No");
    if (gamma) {
      console.log("Gamma x value:", gamma.x);
      console.log("Gamma full object keys:", Object.keys(gamma));
    } else {
      console.log(
        "No gamma found. Checking if any gammas exist for this company/project..."
      );
      const anyGamma = await db
        .collection("gammas")
        .findOne({ companyId: companyId });
      console.log("Any gamma for company:", anyGamma ? "Yes" : "No");
    }

    // Fetch eurocode from projectprofessioneurocodes
    console.log("Fetching eurocode...");
    const eurocodeRecord = await db
      .collection("projectprofessioneurocodes")
      .findOne({
        projectId: projectId,
        companyId: companyId,
        subjectMatterId: subjectMatterId,
      });
    const eurocode =
      eurocodeRecord?.euroCodes && eurocodeRecord.euroCodes.length > 0
        ? String(eurocodeRecord.euroCodes[0])
        : "Eurocode";
    console.log("Eurocode found:", eurocode);
    console.log("EurocodeRecord found:", eurocodeRecord ? "Yes" : "No");
    if (eurocodeRecord && eurocodeRecord.euroCodes) {
      console.log("All euroCodes in record:", eurocodeRecord.euroCodes);
      console.log("Number of euroCodes:", eurocodeRecord.euroCodes.length);
    } else {
      console.log("No euroCodes found in eurocodeRecord");
    }

    // Fetch user with role Main Contractor or Main Constructor
    console.log("Fetching Main Contractor/Constructor...");
    const mainUser = await db.collection("users").findOne({
      projectsId: { $in: [projectId] },
      role: { $in: ["Main Contractor", "Main Constructor"] },
    });
    console.log("Main user found:", mainUser ? "Yes" : "No");

    // Fetch signatures from static report signatures
    console.log("Fetching signatures...");
    const signatures = await db
      .collection("static report signatures")
      .find({
        projectId: projectId,
        companyId: companyId,
        subjectMatterId: subjectMatterId,
      })
      .sort({ signatureType: 1, createdAt: -1 })
      .toArray();
    console.log("Signatures found:", signatures.length);

    // Organize signatures by signatureType
    const signatureByType = {};
    signatures.forEach((sig) => {
      if (sig.signatureType !== undefined && sig.signatureType !== null) {
        // Use signatureType as key (works for both number and string)
        signatureByType[sig.signatureType] = sig;
        console.log(
          `Signature found - Type: ${sig.signatureType}, Name: ${sig.name}`
        );
      }
    });
    console.log("Signature by type object:", signatureByType);
    console.log("Signature keys:", Object.keys(signatureByType));

    // Fetch controls data for pages 16, 17, 18
    let b5Rows = []; // Page 16 - entries with pos starting with "7.4"
    let b6Rows = []; // Page 17 - entries with pos starting with "7.5"
    let b7Rows = []; // Page 18 - entries with pos starting with "7.6"

    if (
      eurocodeRecord &&
      eurocodeRecord.euroCodes &&
      eurocodeRecord.euroCodes.length > 0
    ) {
      try {
        const projectEuroCodes = eurocodeRecord.euroCodes
          .map((v) => String(v).trim())
          .filter(Boolean);
        console.log("Fetching controls with euroCodes:", projectEuroCodes);

        // Replicate the logic from get-controls-of-static-report
        const matchConditions = {
          euroCodeStr: { $in: projectEuroCodes },
          subjectMatterId: subjectMatterId,
        };

        const pipeline = [
          { $addFields: { euroCodeStr: { $toString: "$euroCode" } } },
          { $match: matchConditions },
          { $unwind: { path: "$entries", includeArrayIndex: "entryIndex" } },
          {
            $project: {
              _id: 0,
              entry: "$entries",
              documentId: "$_id",
              subjectMatterId: 1,
              euroCode: 1,
              language: 1,
              entryIndex: 1,
            },
          },
        ];

        const rows = await db
          .collection("controls of static report")
          .aggregate(pipeline)
          .toArray();

        console.log("Controls query returned rows:", rows.length);

        let entries = rows.map((r) => ({
          ...r.entry,
          _id: `${r.documentId}_${r.entryIndex}`,
          documentId: r.documentId,
          subjectMatterId: r.subjectMatterId,
          euroCode: r.euroCode,
          language: r.language,
          entryIndex: r.entryIndex,
        }));

        // Check for edited data and replace entries
        if (projectId) {
          const editedControls = await db
            .collection("editcontrols")
            .find({
              projectId: projectId,
              subjectMatterId: subjectMatterId,
            })
            .toArray();

          const editedDataMap = new Map();
          editedControls.forEach((editedControl) => {
            if (editedControl.editedFields && editedControl.editedFields.pos) {
              const key = `${editedControl.projectId}_${editedControl.subjectMatterId}_${editedControl.editedFields.pos}`;
              editedDataMap.set(key, editedControl.editedFields);
            }
          });

          entries = entries.map((entry) => {
            const key = `${projectId}_${subjectMatterId}_${entry.pos}`;
            const editedData = editedDataMap.get(key);
            if (editedData) {
              return {
                ...entry,
                ...editedData,
                _isEdited: true,
              };
            }
            return entry;
          });
        }

        console.log(
          "Total entries after merge with edited data:",
          entries.length
        );
        if (entries.length > 0) {
          console.log(
            "Sample entry pos values:",
            entries
              .slice(0, 5)
              .map((e) => e.pos)
              .join(", ")
          );
        }

        // Helper function to map entry to table row
        const mapEntryToRow = (entry) => {
          // Convert circumference (0.2) to percentage string ("20%")
          let scopeValue = "";
          if (
            entry.circumference !== undefined &&
            entry.circumference !== null
          ) {
            scopeValue = `${entry.circumference * 100}%`;
          } else if (entry.omfang !== undefined && entry.omfang !== null) {
            // Danish field name
            scopeValue = `${entry.omfang * 100}%`;
          } else if (entry.scope) {
            scopeValue = entry.scope;
          } else if (entry.Scope) {
            scopeValue = entry.Scope;
          } else if (entry.extent) {
            scopeValue = `${entry.extent * 100}%`;
          }

          return {
            pos: entry.pos || "",
            checkingThe:
              entry.checkingThe ||
              entry.kontrolAf || // Danish field name
              entry["Control of"] ||
              entry["Contol of"] ||
              "",
            subject:
              entry.subject ||
              entry.emne || // Danish field name
              entry.Subject ||
              "",
            constructionPart:
              entry.constructionPart ||
              entry.konstruktionsdel || // Danish field name
              entry["Construction part"] ||
              "",
            basis:
              entry.basis ||
              entry.grundlag || // Danish field name
              entry.Basis ||
              "",
            method:
              entry.controlMethod ||
              entry.kontrolMetode || // Danish field name
              entry["Control method"] ||
              entry["Control methode"] ||
              entry.method ||
              "",
            scope: scopeValue,
            acceptance:
              entry.acceptanceCriteria ||
              entry.acceptkriterie || // Danish field name
              entry["Acceptance criteria"] ||
              entry.acceptance ||
              "",
            timeControl:
              entry.time ||
              entry.tid || // Danish field name
              entry.Time ||
              entry.timeControl ||
              "",
          };
        };

        // Filter and sort by pos prefix (7.4, 7.5, 7.6)
        b5Rows = entries
          .filter(
            (entry) =>
              entry.pos &&
              (entry.pos.startsWith("7.4") || entry.pos.startsWith("17.4"))
          )
          .sort((a, b) => (a.pos || "").localeCompare(b.pos || ""))
          .map(mapEntryToRow);

        b6Rows = entries
          .filter(
            (entry) =>
              entry.pos &&
              (entry.pos.startsWith("7.5") || entry.pos.startsWith("17.5"))
          )
          .sort((a, b) => (a.pos || "").localeCompare(b.pos || ""))
          .map(mapEntryToRow);

        b7Rows = entries
          .filter(
            (entry) =>
              entry.pos &&
              (entry.pos.startsWith("7.6") || entry.pos.startsWith("17.6"))
          )
          .sort((a, b) => (a.pos || "").localeCompare(b.pos || ""))
          .map(mapEntryToRow);

        console.log("B5 rows (7.4) for page 16 found:", b5Rows.length);
        console.log("B6 rows (7.5) for page 17 found:", b6Rows.length);
        console.log("B7 rows (7.6) for page 18 found:", b7Rows.length);
        if (b5Rows.length > 0) {
          console.log("Sample B5 row:", JSON.stringify(b5Rows[0], null, 2));
        }
        if (b6Rows.length > 0) {
          console.log("Sample B6 row:", JSON.stringify(b6Rows[0], null, 2));
        }
        if (b7Rows.length > 0) {
          console.log("Sample B7 row:", JSON.stringify(b7Rows[0], null, 2));
        }
      } catch (error) {
        console.error("Error fetching controls data:", error);
      }
    } else {
      console.log("No euroCodes found, skipping controls data fetch");
    }

    // Build company info string with labels
    let companyInfo = "";
    if (company) {
      const parts = [];
      if (company.name) parts.push(`Name: ${company.name}`);
      if (company.address) parts.push(`Address: ${company.address}`);
      if (company.cvr) parts.push(`CVR: ${company.cvr}`);
      if (company.contactPhone) parts.push(`Tel: ${company.contactPhone}`);
      companyInfo = parts.join("\n");
    } else {
      companyInfo = "Own company Adress CVR and contact info.- company setup.";
    }

    // Fetch Independent Controller users for the project
    // Handle both ObjectId and string formats in projectsId array
    const projectObjectId = new ObjectId(projectId);
    const independentControllers = await db
      .collection("users")
      .find({
        role: "Independent Controller",
        $or: [
          { projectsId: { $in: [projectObjectId] } },
          { projectsId: { $in: [projectId] } },
        ],
      })
      .toArray();

    console.log(
      `Found ${independentControllers.length} Independent Controller users for project ${projectId}`
    );

    // Update dynamic object with fetched data
    const dynamicData = {
      companyInfo: companyInfo,
      projectName: project?.name || "Project name – project setup.",
      constructionPart: gamma?.special ? String(gamma.special) : "Special text",
      eurocode: eurocode,
      xNumber: gamma?.x ? String(gamma.x) : "X number",
      specialText: gamma?.special ? String(gamma.special) : "Special text",
      kkx: gamma?.cc ? String(gamma.cc) : "KKX",
      executionClass: gamma?.exc ? String(gamma.exc) : "EXCX",
      selectDate: "[Select Date]", // Keep as is for now
      // Additional data for page 2
      project: project,
      mainUser: mainUser,
      signatures: signatureByType,
      company: company,
      // Gamma data for page 11
      gamma: gamma,
      // Independent Controller users for page 7
      independentControllers: independentControllers,
      // Static document checklist data for pages 13, 14, 15
      b1Rows: b1Rows,
      b2Rows: b2Rows,
      b3Rows: b3Rows,
      // Controls data for pages 16, 17, 18
      b5Rows: b5Rows,
      b6Rows: b6Rows,
      b7Rows: b7Rows,
    };

    console.log(
      "Dynamic data being used - b5Rows count:",
      dynamicData.b5Rows?.length || 0
    );
    console.log(
      "Dynamic data being used - b6Rows count:",
      dynamicData.b6Rows?.length || 0
    );
    console.log(
      "Dynamic data being used - b7Rows count:",
      dynamicData.b7Rows?.length || 0
    );

    // Collect and translate texts for page 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, and 17 if target language is specified
    let translations = {};
    if (targetLang) {
      console.log(`Translation requested for language: ${targetLang}`);
      const page1And2And3And4And5And6And7And8And9And10And11And12And13And14And15And16And17Texts =
        collectPage1And2And3And4And5And6And7And8And9And10And11And12And13And14And15And16And17Texts(
          dynamicData
        );
      const textsArray = Object.keys(
        page1And2And3And4And5And6And7And8And9And10And11And12And13And14And15And16And17Texts
      );
      translations = await translateTexts(textsArray, targetLang);
      console.log(
        `Translation map created with ${
          Object.keys(translations).length
        } entries`
      );
    } else {
      console.log("No target language specified, using original texts");
    }

    const doc = new PDFDocument({
      size: [PAGE.w, PAGE.h],
      margins: M,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=static-control-plan.pdf"
    );

    doc.pipe(res);

    // Empty data for now (later来自 Mongo native driver)
    const tableData = {
      B1: [],
      B2: [],
      B3: [],
      B4: [],
      B5: [],
      B6: [],
    };

    await buildStaticControlPlan(doc, dynamicData, tableData, translations);

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res
      .status(500)
      .json({ error: "Failed to generate PDF", details: error.message });
  }
});

// Start the server after database connection
async function startServer() {
  try {
    await connectToMongoDB();
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`✅ PDF download: http://localhost:${PORT}/download`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    // Start server anyway if DB connection fails
    app.listen(PORT, () => {
      console.log(
        `⚠️  Server running without database on http://localhost:${PORT}`
      );
      console.log(
        `⚠️  PDF download may fail: http://localhost:${PORT}/download`
      );
    });
  }
}

// startServer(); // Commented out - server is started in index.js

// Export functions and constants for use in other files
module.exports = {
  buildStaticControlPlan,
  translateTexts,
  collectPage1And2And3And4And5And6And7And8And9And10And11And12And13And14And15And16And17Texts,
  PAGE,
  M,
};
