// app.js
// Run with: node app.js
// Requires: npm install express pdfkit

const express = require("express");
const PDFDocument = require("pdfkit");
const { MongoClient, ObjectId } = require("mongodb");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5001;

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
      return;
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
        return;
      }

      const waitTime = 2000;
      console.log(`Retrying in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

// Initialize database connection - Commented out - database connection is handled in index.js
// connectToMongoDB();

// Helper function to fetch image buffer from URL
async function fetchImageBuffer(url) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(response.data, "binary");
  } catch (error) {
    console.error("Error fetching image:", url, error.message);
    throw error;
  }
}

// -------------------- TRANSLATION HELPERS --------------------
// Helper function to call translation API
async function translateTexts(texts, targetLang, sourceLang = "EN") {
  try {
    if (!targetLang) {
      // No target language specified, return original texts as map
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

// Collect all translatable texts from page 1, 2, 3, 4, 5, and 6 (static + dynamic)
function collectPage1And2And3And4And5And6Texts(dynamicData) {
  const texts = {
    // Page 1 - Static texts
    "Performing company:": "Performing company:",
    "Post no. / City:": "Post no. / City:",
    "Address:": "Address:",
    "CVR:": "CVR:",
    "Telephone:": "Telephone:",
    "Mail:": "Mail:",
    "Company logo": "Company logo",
    "QUALITY ASSURANCE REPORT": "QUALITY ASSURANCE REPORT",
    "FOR PROFESSION GROUP:": "FOR PROFESSION GROUP:",
    "Prepared date:": "Prepared date:",
    "Project ID Case ID:": "Project ID Case ID:",
    "From project setup": "From project setup",

    // Page 2 - Static texts
    "00. PROJECT DETAILS": "00. PROJECT DETAILS",
    Content: "Content",
    Indhold: "Indhold",
    "Project details": "Project details",
    "Affiliated advisers and inspectors": "Affiliated advisers and inspectors",
    "Documents and information received before the start":
      "Documents and information received before the start",
    "Received case documents before construction commenced":
      "Received case documents before construction commenced",
    Checklist: "Checklist",
    "Company Organization": "Company Organization",
    "Employee associated with the project from the organization":
      "Employee associated with the project from the organization",
    "Preparing for production": "Preparing for production",
    "Project management supervision plan":
      "Project management supervision plan",
    "Description of the control work": "Description of the control work",
    "Standard for control plan": "Standard for control plan",
    "Plan for control of tenders": "Plan for control of tenders",
    Schedule: "Schedule",
    "Receive control": "Receive control",
    "Process control": "Process control",
    "Final controls carried out": "Final controls carried out",
    Deviations: "Deviations",
    "Weather History": "Weather History",
    "Communication history via SMS or email":
      "Communication history via SMS or email",
    "Reported staffing": "Reported staffing",
    "Alleged realization during construction":
      "Alleged realization during construction",
    "Miscellaneous reports overview.": "Miscellaneous reports overview.",
    Signing: "Signing",
    Page: "Page",
    "Part of Kvalitetssikring Danmark ApS":
      "Part of Kvalitetssikring Danmark ApS",

    // Page 3 - Static texts
    "01. PROJECT DETAILS": "01. PROJECT DETAILS",
    DATE: "DATE",
    "CONSTRUCTION CASE": "CONSTRUCTION CASE",
    "MAIN CONTRACTOR /CUSTOMER": "MAIN CONTRACTOR /CUSTOMER",
    "CASE ID:": "CASE ID:",
    "NAME:": "NAME:",
    "CVR NO:": "CVR NO:",
    "ADDRESS:": "ADDRESS:",
    "POSTCODE:": "POSTCODE:",
    "CONTACT PERSON": "CONTACT PERSON",
    "TELEPHONE:": "TELEPHONE:",
    "EMAIL:": "EMAIL:",
    "STARTING DATE": "STARTING DATE",
    DEADLINE: "DEADLINE",
    "CONSTRUCTION MANAGER": "CONSTRUCTION MANAGER",
    NAME: "NAME",
    "SAFETY COORDINATOR": "SAFETY COORDINATOR",
    "CERTIFICATION SCHEME / LEVEL": "CERTIFICATION SCHEME / LEVEL",
    "CERTIFICATION SCHEME": "CERTIFICATION SCHEME",
    LEVEL: "LEVEL",
    "PROFESSION GROUPE": "PROFESSION GROUPE",

    // Page 4 - Static texts
    "02. AFFILIATED ADVISERS AND INSPECTORS":
      "02. AFFILIATED ADVISERS AND INSPECTORS",
    Architecture: "Architecture",
    Engineer: "Engineer",
    Fire: "Fire",
    Acoustics: "Acoustics",
    "Technical Subject": "Technical Subject",
    "ADVISOR/ARCHITECTURE": "ADVISOR/ARCHITECTURE",
    "ADVISOR/ENGINEER": "ADVISOR/ENGINEER",
    "ADVISOR/FIRE": "ADVISOR/FIRE",
    "ADVISOR/ACOUSTICS": "ADVISOR/ACOUSTICS",
    "ADVISOR/TECHNICAL SUBJECT": "ADVISOR/TECHNICAL SUBJECT",
    // Numbered advisor titles (for multiple advisors of same type)
    "ADVISOR/ARCHITECTURE (2)": "ADVISOR/ARCHITECTURE (2)",
    "ADVISOR/ARCHITECTURE (3)": "ADVISOR/ARCHITECTURE (3)",
    "ADVISOR/ENGINEER (2)": "ADVISOR/ENGINEER (2)",
    "ADVISOR/ENGINEER (3)": "ADVISOR/ENGINEER (3)",
    "ADVISOR/FIRE (2)": "ADVISOR/FIRE (2)",
    "ADVISOR/FIRE (3)": "ADVISOR/FIRE (3)",
    "ADVISOR/ACOUSTICS (2)": "ADVISOR/ACOUSTICS (2)",
    "ADVISOR/ACOUSTICS (3)": "ADVISOR/ACOUSTICS (3)",
    "ADVISOR/TECHNICAL SUBJECT (2)": "ADVISOR/TECHNICAL SUBJECT (2)",
    "ADVISOR/TECHNICAL SUBJECT (3)": "ADVISOR/TECHNICAL SUBJECT (3)",
    "CVR NO.:": "CVR NO.:",

    // Page 5 - Static texts
    "03. DOCUMENTS AND INFORMATION RECEIVED BEFORE THE START":
      "03. DOCUMENTS AND INFORMATION RECEIVED BEFORE THE START",
    "The work is based on the information and assumptions available at the time of preparation.":
      "The work is based on the information and assumptions available at the time of preparation.",
    "The Contractor reserves the right to adjust the price and/or schedule if, during the execution of the work, unknown conditions or unforeseen events occur that are not included in the existing project materials or specifications.":
      "The Contractor reserves the right to adjust the price and/or schedule if, during the execution of the work, unknown conditions or unforeseen events occur that are not included in the existing project materials or specifications.",
    "The prerequisites for the performance of the contract include, but are not limited to:":
      "The prerequisites for the performance of the contract include, but are not limited to:",
    "Any unforeseen changes along the way are not included.":
      "Any unforeseen changes along the way are not included.",
    "Hidden structures, wires or installations that are not placed in accordance with the project materials.":
      "Hidden structures, wires or installations that are not placed in accordance with the project materials.",
    "Changes to the building regulations or other legal requirements that have been adopted after the start date.":
      "Changes to the building regulations or other legal requirements that have been adopted after the start date.",
    "Delays caused by third parties or suppliers beyond the contractor's control.":
      "Delays caused by third parties or suppliers beyond the contractor's control.",
    "It should be noted that AB18 (General Conditions for Work and Supplies in Construction) applies to this contract, which means that all parties are obliged to comply with these conditions. This includes dealing with changes, delays, and other circumstances that may arise during the project.":
      "It should be noted that AB18 (General Conditions for Work and Supplies in Construction) applies to this contract, which means that all parties are obliged to comply with these conditions. This includes dealing with changes, delays, and other circumstances that may arise during the project.",
    "It is expressly noted that the developer and his consultants have full responsibility for ensuring that the project is clearly and unambiguously prepared, so that there is no doubt as to the nature and scope of the work.":
      "It is expressly noted that the developer and his consultants have full responsibility for ensuring that the project is clearly and unambiguously prepared, so that there is no doubt as to the nature and scope of the work.",

    // Page 6 - Static texts
    "04. RECEIVED CASE DOCUMENTS BEFORE CONSTRUCTION COMMENCED":
      "04. RECEIVED CASE DOCUMENTS BEFORE CONSTRUCTION COMMENCED",
    "04. RECEIVED CASE DOCUMENTS BEFORE CONSTRUCTION COMMENCED (continued)":
      "04. RECEIVED CASE DOCUMENTS BEFORE CONSTRUCTION COMMENCED (continued)",
    DOCUMENT: "DOCUMENT",
    FILENAME: "FILENAME",
    "CURRENT DRAWINGS": "CURRENT DRAWINGS",
    SUBSCRIPTION: "SUBSCRIPTION",

    // Page 7 - Static texts
    "05.  CHECKLIST": "05.  CHECKLIST",
    "05.  CHECKLIST (continued)": "05.  CHECKLIST (continued)",
    "NAME:": "NAME:",
    NAME: "NAME",
    "CREATED AT:": "CREATED AT:",
    "CREATED AT": "CREATED AT",
    "APPROVAL NOTE:": "APPROVAL NOTE:",
    "APPROVAL NOTE": "APPROVAL NOTE",
    "APPROVED DATE:": "APPROVED DATE:",
    "APPROVED DATE": "APPROVED DATE",

    // Page 8 - Static texts
    "06. COMPANY ORGANIZATION": "06. COMPANY ORGANIZATION",
    SUBCONTRACTOR: "SUBCONTRACTOR",
    "SUBCONTRACTOR (continued)": "SUBCONTRACTOR (continued)",
    "PROJECT MANAGER": "PROJECT MANAGER",
    "PROJECT MANAGER (continued)": "PROJECT MANAGER (continued)",
    "INDEPENDENT INSPECTOR OR OTHER CONTROL":
      "INDEPENDENT INSPECTOR OR OTHER CONTROL",
    "INDEPENDENT INSPECTOR OR OTHER CONTROL (continued)":
      "INDEPENDENT INSPECTOR OR OTHER CONTROL (continued)",
    "COMPANY NAME:": "COMPANY NAME:",
    "COMPANY NAME": "COMPANY NAME",
    "CONTACT PERSON": "CONTACT PERSON",
    "CVR NO.:": "CVR NO.:",
    "CVR NO.": "CVR NO.",
    "PROFESSION:": "PROFESSION:",
    PROFESSION: "PROFESSION",
    "ADDRESS:": "ADDRESS:",
    ADDRESS: "ADDRESS",
    "POSTCODE:": "POSTCODE:",
    POSTCODE: "POSTCODE",
    "TELEPHONE:": "TELEPHONE:",
    TELEPHONE: "TELEPHONE",
    EMAIL: "EMAIL",
    ROLE: "ROLE",
    "NAME:": "NAME:",

    // Page 9 - Static texts
    "07. EMPLOYEE ASSOCIATED WITH THE PROJECT FROM THE ORGANIZATION":
      "07. EMPLOYEE ASSOCIATED WITH THE PROJECT FROM THE ORGANIZATION",
    "07. EMPLOYEE ASSOCIATED WITH THE PROJECT FROM THE ORGANIZATION (continued)":
      "07. EMPLOYEE ASSOCIATED WITH THE PROJECT FROM THE ORGANIZATION (continued)",
    "ID NO": "ID NO",
    "NAME ASSIGNED": "NAME ASSIGNED",
    "MOBILE NO.": "MOBILE NO.",
    "MOBILE NO": "MOBILE NO",
    "PHOTO/ID": "PHOTO/ID",
    "PHOTO/ID:": "PHOTO/ID:",
    "No photo": "No photo",

    // Page 10 - Static texts
    "08. PREPARING FOR PRODUCTION": "08. PREPARING FOR PRODUCTION",
    "Review of the process": "Review of the process",
    "Immediately after acceptance, the company conducts a process review of the project. In cases with design responsibility, a project review is also carried out.":
      "Immediately after acceptance, the company conducts a process review of the project. In cases with design responsibility, a project review is also carried out.",
    "The purpose of the review is to identify ambiguities and/or risky work performance, as well as environmental issues.":
      "The purpose of the review is to identify ambiguities and/or risky work performance, as well as environmental issues.",
    "In cases where the company has agreements with subcontractors, the company ensures that they carry out a corresponding review.":
      "In cases where the company has agreements with subcontractors, the company ensures that they carry out a corresponding review.",

    // Page 11 - Static texts
    "09. PROJECT MANAGEMENT SUPERVISION PLAN":
      "09. PROJECT MANAGEMENT SUPERVISION PLAN",
    "09. PROJECT MANAGEMENT SUPERVISION PLAN (continued)":
      "09. PROJECT MANAGEMENT SUPERVISION PLAN (continued)",
    "ID.": "ID.",
    ID: "ID",
    WHAT: "WHAT",
    WHERE: "WHERE",
    WHEN: "WHEN",
    "HOW MUCH": "HOW MUCH",
    "HOW MUCH:": "HOW MUCH:",
    PERFORMED: "PERFORMED",
    "Unknown Section": "Unknown Section",
    "The above is checked by:": "The above is checked by:",
    SIGNATURE: "SIGNATURE",

    // Page 12 - Static texts
    "10. DESCRIPTION OF THE CONTROL WORK":
      "10. DESCRIPTION OF THE CONTROL WORK",
    "10.1 CONTROL PLAN (TENDER CONTROL PLAN OR THE COMPANY'S OWN)":
      "10.1 CONTROL PLAN (TENDER CONTROL PLAN OR THE COMPANY'S OWN)",
    "The process review in relation to a possible procurement control plan forms the basis for the preparation of the case's control plan, which provides an overall overview of the controls and documentation that apply to the contract.":
      "The process review in relation to a possible procurement control plan forms the basis for the preparation of the case's control plan, which provides an overall overview of the controls and documentation that apply to the contract.",
    "If no supply control plan has been submitted before the price has been offered, the company's own control plan will form the basis for the company's control.":
      "If no supply control plan has been submitted before the price has been offered, the company's own control plan will form the basis for the company's control.",
    "The control plan is submitted for the customer's approval at a potential project review meeting. If a project review meeting is not held with the construction management, the control plan will subsequently be sent together with the results of the company's process review for the client's approval.":
      "The control plan is submitted for the customer's approval at a potential project review meeting. If a project review meeting is not held with the construction management, the control plan will subsequently be sent together with the results of the company's process review for the client's approval.",
    "10.2 QUALITY ASSURANCE OF THE PROJECT":
      "10.2 QUALITY ASSURANCE OF THE PROJECT",
    "The inspection is carried out by the project manager or another person specifically appointed as the inspector for the work and who is familiar with our quality assurance system.":
      "The inspection is carried out by the project manager or another person specifically appointed as the inspector for the work and who is familiar with our quality assurance system.",
    "10.3 CHECKING DOCUMENTS": "10.3 CHECKING DOCUMENTS",
    "Revised drawings, construction meeting minutes, etc. are sent to the company's e-mail. It is assumed that all revised drawings are accompanied by a revised subscription list and that revisions to the drawings are clearly marked.":
      "Revised drawings, construction meeting minutes, etc. are sent to the company's e-mail. It is assumed that all revised drawings are accompanied by a revised subscription list and that revisions to the drawings are clearly marked.",
    "Quality assurance documents are presented at construction meetings.":
      "Quality assurance documents are presented at construction meetings.",
    "10.4 INFORMATION FOR EMPLOYEES": "10.4 INFORMATION FOR EMPLOYEES",
    "Before work begins, craftsmen and any apprentices are generally informed about the work at hand and in particular about difficult work processes. In addition, information is provided about the project's quality and environmental requirements.":
      "Before work begins, craftsmen and any apprentices are generally informed about the work at hand and in particular about difficult work processes. In addition, information is provided about the project's quality and environmental requirements.",
    "10.5 IN-DEPTH CONTROL": "10.5 IN-DEPTH CONTROL",
    "When materials arrive at the construction site, it is checked that the delivered goods are in the correct quantity and quality according to the inspection plan. Factors of importance to the environment are included in the in-depth management, including the layout of the construction site. The incoming control must be documented.":
      "When materials arrive at the construction site, it is checked that the delivered goods are in the correct quantity and quality according to the inspection plan. Factors of importance to the environment are included in the in-depth management, including the layout of the construction site. The incoming control must be documented.",
    "10.6 PROCESS CONTROL": "10.6 PROCESS CONTROL",
    "During the work, the inspections specified in the control plan are carried out. Deviations and their rectification are carried out in accordance with the agreement. Factors of importance to the environment are included in the process control. Process control is documented.":
      "During the work, the inspections specified in the control plan are carried out. Deviations and their rectification are carried out in accordance with the agreement. Factors of importance to the environment are included in the process control. Process control is documented.",
    "10.7 FINAL INSPECTION": "10.7 FINAL INSPECTION",
    "When the work or certain parts of it are completed, the person responsible carries out a final inspection of the work. This final inspection is an internal activity, but evidence of it may be provided.":
      "When the work or certain parts of it are completed, the person responsible carries out a final inspection of the work. This final inspection is an internal activity, but evidence of it may be provided.",
    "10.7 DOCUMENTATION": "10.7 DOCUMENTATION",
    "A copy of the documentation of the quality assurance carried out will be sent to the client or its advisers by agreement. All documents, including documentation of the agreed quality assurance, are stored for the current liability period.":
      "A copy of the documentation of the quality assurance carried out will be sent to the client or its advisers by agreement. All documents, including documentation of the agreed quality assurance, are stored for the current liability period.",

    // Page 13 - Static texts
    "11. STANDARD FOR CONTROL PLAN": "11. STANDARD FOR CONTROL PLAN",
    "11. STANDARD FOR CONTROL PLAN (continued)":
      "11. STANDARD FOR CONTROL PLAN (continued)",
    "ID.": "ID.",
    ACTIVITY: "ACTIVITY",
    "ACCEPTANCE CRITERIA": "ACCEPTANCE CRITERIA",
    METHOD: "METHOD",
    TIME: "TIME",
    SCOPE: "SCOPE",
    "RECEIVE CONTROL": "RECEIVE CONTROL",
    "PROCESS CONTROL": "PROCESS CONTROL",
    "FINAL CONTROL": "FINAL CONTROL",

    // Page 14 - Static texts
    "12. PLAN FOR CONTROL OF TENDERS": "12. PLAN FOR CONTROL OF TENDERS",
    "Here is the tender control plan, if it is found in the project material.":
      "Here is the tender control plan, if it is found in the project material.",
    "Reception control": "Reception control",
    "Process control": "Process control",
    "Final control": "Final control",
    Deviation: "Deviation",
    "13. SCHEDULE": "13. SCHEDULE",

    // Page 15 - Static texts
    "14. RECEIVE CONTROL": "14. RECEIVE CONTROL",
    "14. RECEIVE CONTROL (continued)": "14. RECEIVE CONTROL (continued)",
    // Page 16 - Static texts
    "15. PROCESS CONTROL": "15. PROCESS CONTROL",
    "15. PROCESS CONTROL (continued)": "15. PROCESS CONTROL (continued)",
    // Page 17 - Static texts
    "16. FINAL CONTROL": "16. FINAL CONTROL",
    "16. FINAL CONTROL (continued)": "16. FINAL CONTROL (continued)",
    // Page 18 - Static texts
    "17. DEVIATIONS": "17. DEVIATIONS",
    "17. DEVIATIONS (continued)": "17. DEVIATIONS (continued)",
    DEVIATIONS: "DEVIATIONS",
    ID: "ID",
    TYPE: "TYPE",
    ACCEPTANCE: "ACCEPTANCE",
    DATE: "DATE",
    ENDORSEMENT: "ENDORSEMENT",
    DRAWING: "DRAWING",
    "LOCALIZATION OF CONTROL": "LOCALIZATION OF CONTROL",
    "BUILDING PART": "BUILDING PART",
    CONTROL: "CONTROL",
    "unique no.": "unique no.",
    "Comment on Picture from registration":
      "Comment on Picture from registration",
    "Picture for registration": "Picture for registration",
    Receive: "Receive",
    Process: "Process",
    Final: "Final",

    // Page 19 - Static texts
    "18. WEATHER HISTORY": "18. WEATHER HISTORY",
    "The following are recorded during the execution phase which indicate conditions that hinder our work or are in breach of the safety and health regulations on site,":
      "The following are recorded during the execution phase which indicate conditions that hinder our work or are in breach of the safety and health regulations on site,",
    "It could be, for example. be: Severe frost, unusual weather conditions or storm and strong winds, stop in crane work.":
      "It could be, for example. be: Severe frost, unusual weather conditions or storm and strong winds, stop in crane work.",
    "REPORTED TO:": "REPORTED TO:",
    "SUBJECT: RAIN, FROST OR STRONG WIND":
      "SUBJECT: RAIN, FROST OR STRONG WIND",
    "CAUSE DELAYS": "CAUSE DELAYS",
    "Image from app": "Image from app",
    "From app": "From app",
    NAME: "NAME",
    "TELEPHONE:": "TELEPHONE:",
    "EMAIL:": "EMAIL:",
    "CONSTRUCTION MANAGER": "CONSTRUCTION MANAGER",
    "Source:": "Source:",

    // Page 20 - Static texts
    "19. COMMUNICATION HISTORY VIA SMS OR EMAIL":
      "19. COMMUNICATION HISTORY VIA SMS OR EMAIL",
    "20.10 E-MAIL SENT TO INVOLVED PARTIES":
      "20.10 E-MAIL SENT TO INVOLVED PARTIES",
    "20.20 SMS SENT TO INVOLVED PARTIES": "20.20 SMS SENT TO INVOLVED PARTIES",
    SUBJECT: "SUBJECT",
    SENT: "SENT",
    RECIPIENTS: "RECIPIENTS",

    // Page 21 - Static texts
    "20. RE REPORTED STAFFING": "20. RE REPORTED STAFFING",
    "Below you can see the reported staffing for the project period.":
      "Below you can see the reported staffing for the project period.",
    WEEK: "WEEK",
    INFORM: "INFORM",
    MON: "MON",
    TUE: "TUE",
    WEN: "WEN",
    TOR: "TOR",
    Fri: "Fri",
    SAT: "SAT",
    SUN: "SUN",
    "AVERAGE PR WEEK": "AVERAGE PR WEEK",

    // Page 22 - Static texts
    "21. ALLEGED REALIZATION DURING CONSTRUCTION":
      "21. ALLEGED REALIZATION DURING CONSTRUCTION",
    "In connection with the execution of my contract, documentation has been sent to the parties involved, including the":
      "In connection with the execution of my contract, documentation has been sent to the parties involved, including the",
    "construction management, regarding conditions that either limit my work , cause disturbances  or are in violation of":
      "construction management, regarding conditions that either limit my work , cause disturbances  or are in violation of",
    "working environment rules or safety  on the construction site, this unfortunately leads to delays, and possibly":
      "working environment rules or safety  on the construction site, this unfortunately leads to delays, and possibly",
    "additional costs .": "additional costs .",
    "This will be stated in the documents sent, which have the following ID.":
      "This will be stated in the documents sent, which have the following ID.",
    "21.10 EMAIL SENT TO INVOLVED PARTIES":
      "21.10 EMAIL SENT TO INVOLVED PARTIES",
    "POS.": "POS.",
    RETURNREPLY: "RETURNREPLY",
    RECIPIENT: "RECIPIENT",

    // Page 23 - Static texts
    "21. MISCELLANEOUS REPORTS OVERVIEW.":
      "21. MISCELLANEOUS REPORTS OVERVIEW.",
    "Below are the forwarded requests:": "Below are the forwarded requests:",
    "ID:": "ID:",
    TITLE: "TITLE",
    "From note": "From note",
    "ADRESSED NOTE": "ADRESSED NOTE",
    "TECHNICAL REQUEST": "TECHNICAL REQUEST",
    "WORKING ENVIRONMENT NOTES": "WORKING ENVIRONMENT NOTES",
    "AGREEMENT CHANGE NOTES.": "AGREEMENT CHANGE NOTES.",
    "INSPECTION NOTES": "INSPECTION NOTES",

    // Page 24 - Static texts
    "22. SIGNING": "22. SIGNING",
    "The subcontractor hereby declares that the quality assurance performed has been carried out in accordance with the Quality Assurance Handbook for the company and partners as stated above.":
      "The subcontractor hereby declares that the quality assurance performed has been carried out in accordance with the Quality Assurance Handbook for the company and partners as stated above.",
    "This quality assurance fulfils the requirements set out in the tender control plan, in any case of a quality that makes the execution of the work and process visible, and the work performed meets the usual good quality.":
      "This quality assurance fulfils the requirements set out in the tender control plan, in any case of a quality that makes the execution of the work and process visible, and the work performed meets the usual good quality.",
    "This front page, together with all quality assurance forms (cf. the Quality Handbook for the Company and Partners), constitutes the complete quality assurance of the entire project.":
      "This front page, together with all quality assurance forms (cf. the Quality Handbook for the Company and Partners), constitutes the complete quality assurance of the entire project.",
    "Signing date": "Signing date",
    "App signing part": "App signing part",
  };

  // Page 1 - Dynamic texts
  const company = dynamicData.company || {};

  // Company name
  if (company.name && !isNumberOrDate(company.name)) {
    texts[company.name] = company.name;
  }

  // Post city (combine postalCode and city)
  const postCity =
    company.postalCode && company.city
      ? `${company.postalCode} ${company.city}`
      : company.postalCode || company.city || "";
  if (postCity && !isNumberOrDate(postCity)) {
    texts[postCity] = postCity;
  } else {
    // Also collect separately if they exist
    if (company.postalCode && !isNumberOrDate(company.postalCode)) {
      texts[company.postalCode] = company.postalCode;
    }
    if (company.city && !isNumberOrDate(company.city)) {
      texts[company.city] = company.city;
    }
  }

  // Address
  if (company.address && !isNumberOrDate(company.address)) {
    texts[company.address] = company.address;
  }

  // Email/Mail
  if (company.email && !isNumberOrDate(company.email)) {
    texts[company.email] = company.email;
  }

  // Profession group
  if (
    dynamicData.professionGroup &&
    !isNumberOrDate(dynamicData.professionGroup)
  ) {
    texts[dynamicData.professionGroup] = dynamicData.professionGroup;
  }

  // Page 3 - Dynamic texts
  // Construction case fields
  if (
    dynamicData.constructionCaseName1 &&
    !isNumberOrDate(dynamicData.constructionCaseName1)
  ) {
    texts[dynamicData.constructionCaseName1] =
      dynamicData.constructionCaseName1;
  }
  if (
    dynamicData.constructionCaseAddress1 &&
    !isNumberOrDate(dynamicData.constructionCaseAddress1)
  ) {
    texts[dynamicData.constructionCaseAddress1] =
      dynamicData.constructionCaseAddress1;
  }
  if (
    dynamicData.constructionCaseContactPerson &&
    !isNumberOrDate(dynamicData.constructionCaseContactPerson)
  ) {
    texts[dynamicData.constructionCaseContactPerson] =
      dynamicData.constructionCaseContactPerson;
  }
  if (
    dynamicData.constructionCaseEmail &&
    !isNumberOrDate(dynamicData.constructionCaseEmail)
  ) {
    texts[dynamicData.constructionCaseEmail] =
      dynamicData.constructionCaseEmail;
  }

  // Main contractor fields
  if (
    dynamicData.mainContractorName &&
    !isNumberOrDate(dynamicData.mainContractorName)
  ) {
    texts[dynamicData.mainContractorName] = dynamicData.mainContractorName;
  }
  if (
    dynamicData.mainContractorAddress &&
    !isNumberOrDate(dynamicData.mainContractorAddress)
  ) {
    texts[dynamicData.mainContractorAddress] =
      dynamicData.mainContractorAddress;
  }
  if (
    dynamicData.mainContractorEmail &&
    !isNumberOrDate(dynamicData.mainContractorEmail)
  ) {
    texts[dynamicData.mainContractorEmail] = dynamicData.mainContractorEmail;
  }

  // Construction manager fields
  if (
    dynamicData.constructionManagerName &&
    !isNumberOrDate(dynamicData.constructionManagerName)
  ) {
    texts[dynamicData.constructionManagerName] =
      dynamicData.constructionManagerName;
  }
  if (
    dynamicData.constructionManagerEmail &&
    !isNumberOrDate(dynamicData.constructionManagerEmail)
  ) {
    texts[dynamicData.constructionManagerEmail] =
      dynamicData.constructionManagerEmail;
  }

  // Safety coordinator fields
  if (
    dynamicData.safetyCoordinatorName &&
    !isNumberOrDate(dynamicData.safetyCoordinatorName)
  ) {
    texts[dynamicData.safetyCoordinatorName] =
      dynamicData.safetyCoordinatorName;
  }
  if (
    dynamicData.safetyCoordinatorEmail &&
    !isNumberOrDate(dynamicData.safetyCoordinatorEmail)
  ) {
    texts[dynamicData.safetyCoordinatorEmail] =
      dynamicData.safetyCoordinatorEmail;
  }

  // Certification scheme and level
  if (
    dynamicData.certificationScheme &&
    !isNumberOrDate(dynamicData.certificationScheme)
  ) {
    texts[dynamicData.certificationScheme] = dynamicData.certificationScheme;
  }
  if (
    dynamicData.certificationLevel &&
    !isNumberOrDate(dynamicData.certificationLevel)
  ) {
    texts[dynamicData.certificationLevel] = dynamicData.certificationLevel;
  }

  // Profession group name (already collected above, but ensure it's there)
  if (
    dynamicData.professionGroupName &&
    !isNumberOrDate(dynamicData.professionGroupName)
  ) {
    texts[dynamicData.professionGroupName] = dynamicData.professionGroupName;
  }

  // Page 4 - Dynamic texts (advisors)
  const advisorsByType = dynamicData.advisorsByType || {};
  const advisorTypes = [
    "Architecture",
    "Engineer",
    "Fire",
    "Acoustics",
    "Technical Subject",
  ];

  advisorTypes.forEach((type) => {
    const advisors = advisorsByType[type] || [];
    advisors.forEach((advisor) => {
      // Collect advisor names
      if (advisor.name && !isNumberOrDate(advisor.name)) {
        texts[advisor.name] = advisor.name;
      }
      if (advisor.username && !isNumberOrDate(advisor.username)) {
        texts[advisor.username] = advisor.username;
      }
      // Collect contact person
      if (advisor.contactPerson && !isNumberOrDate(advisor.contactPerson)) {
        texts[advisor.contactPerson] = advisor.contactPerson;
      }
      // Collect address
      if (advisor.address && !isNumberOrDate(advisor.address)) {
        texts[advisor.address] = advisor.address;
      }
      // Collect postcode/city
      if (advisor.postalCode && advisor.city) {
        const postCity = `${advisor.postalCode} ${advisor.city}`;
        if (!isNumberOrDate(postCity)) {
          texts[postCity] = postCity;
        }
      } else {
        if (advisor.postalCode && !isNumberOrDate(advisor.postalCode)) {
          texts[advisor.postalCode] = advisor.postalCode;
        }
        if (advisor.city && !isNumberOrDate(advisor.city)) {
          texts[advisor.city] = advisor.city;
        }
      }
      // Collect email
      if (advisor.email && !isNumberOrDate(advisor.email)) {
        texts[advisor.email] = advisor.email;
      }
    });
  });

  // Page 6 - Dynamic texts (documents and draws)
  const documents = dynamicData.documents || [];
  documents.forEach((doc) => {
    // Collect document categories
    if (doc.category && !isNumberOrDate(doc.category)) {
      texts[doc.category] = doc.category;
    }
    // Collect document filenames
    if (doc.originalName && !isNumberOrDate(doc.originalName)) {
      texts[doc.originalName] = doc.originalName;
    }
    if (doc.filename && !isNumberOrDate(doc.filename)) {
      texts[doc.filename] = doc.filename;
    }
  });

  const draws = dynamicData.draws || [];
  draws.forEach((draw) => {
    if (draw.mainDrawings && draw.mainDrawings.length > 0) {
      const mainDrawing = draw.mainDrawings[0];
      // Collect draw filenames
      if (mainDrawing.filename && !isNumberOrDate(mainDrawing.filename)) {
        texts[mainDrawing.filename] = mainDrawing.filename;
      }
      if (
        mainDrawing.originalname &&
        !isNumberOrDate(mainDrawing.originalname)
      ) {
        texts[mainDrawing.originalname] = mainDrawing.originalname;
      }
    }
  });

  // Page 7 - Dynamic texts (checks)
  const project = dynamicData.project || {};
  const checks = project.checks || [];
  checks.forEach((check) => {
    // Collect check names
    if (check.name && !isNumberOrDate(check.name)) {
      texts[check.name] = check.name;
    }
    // Collect approval notes
    if (check.approvalNote && !isNumberOrDate(check.approvalNote)) {
      texts[check.approvalNote] = check.approvalNote;
    }
  });

  // Page 8 - Dynamic texts (subcontractors, project managers, independent controllers)
  const subContractors = dynamicData.subContractors || [];
  subContractors.forEach((user) => {
    // Collect company/name
    if (user.name && !isNumberOrDate(user.name)) {
      texts[user.name] = user.name;
    }
    if (user.username && !isNumberOrDate(user.username)) {
      texts[user.username] = user.username;
    }
    // Collect contact person
    if (user.contactPerson && !isNumberOrDate(user.contactPerson)) {
      texts[user.contactPerson] = user.contactPerson;
    }
    // Collect profession
    if (user.profession && !isNumberOrDate(user.profession)) {
      texts[user.profession] = user.profession;
    }
    // Collect address
    if (user.address && !isNumberOrDate(user.address)) {
      texts[user.address] = user.address;
    }
    // Collect postcode/city
    if (user.postalCode && user.city) {
      const postCity = `${user.postalCode} ${user.city}`;
      if (!isNumberOrDate(postCity)) {
        texts[postCity] = postCity;
      }
    } else {
      if (user.postalCode && !isNumberOrDate(user.postalCode)) {
        texts[user.postalCode] = user.postalCode;
      }
      if (user.city && !isNumberOrDate(user.city)) {
        texts[user.city] = user.city;
      }
    }
    // Collect email
    if (user.email && !isNumberOrDate(user.email)) {
      texts[user.email] = user.email;
    }
  });

  const projectManagers = dynamicData.projectManagers || [];
  projectManagers.forEach((user) => {
    // Collect role
    if (user.role && !isNumberOrDate(user.role)) {
      texts[user.role] = user.role;
    }
    if (user.userRole && !isNumberOrDate(user.userRole)) {
      texts[user.userRole] = user.userRole;
    }
    // Collect name
    if (user.name && !isNumberOrDate(user.name)) {
      texts[user.name] = user.name;
    }
    if (user.username && !isNumberOrDate(user.username)) {
      texts[user.username] = user.username;
    }
    // Collect email
    if (user.email && !isNumberOrDate(user.email)) {
      texts[user.email] = user.email;
    }
  });

  const independentControllers = dynamicData.independentControllers || [];
  independentControllers.forEach((user) => {
    // Collect name
    if (user.name && !isNumberOrDate(user.name)) {
      texts[user.name] = user.name;
    }
    if (user.username && !isNumberOrDate(user.username)) {
      texts[user.username] = user.username;
    }
    // Collect contact person
    if (user.contactPerson && !isNumberOrDate(user.contactPerson)) {
      texts[user.contactPerson] = user.contactPerson;
    }
    // Collect address
    if (user.address && !isNumberOrDate(user.address)) {
      texts[user.address] = user.address;
    }
    // Collect postcode/city
    if (user.postalCode && user.city) {
      const postCity = `${user.postalCode} ${user.city}`;
      if (!isNumberOrDate(postCity)) {
        texts[postCity] = postCity;
      }
    } else {
      if (user.postalCode && !isNumberOrDate(user.postalCode)) {
        texts[user.postalCode] = user.postalCode;
      }
      if (user.city && !isNumberOrDate(user.city)) {
        texts[user.city] = user.city;
      }
    }
    // Collect email
    if (user.email && !isNumberOrDate(user.email)) {
      texts[user.email] = user.email;
    }
  });

  // Page 9 - Dynamic texts (workers)
  const workers = dynamicData.workers || [];
  workers.forEach((worker) => {
    // Collect role
    if (worker.role && !isNumberOrDate(worker.role)) {
      texts[worker.role] = worker.role;
    }
    if (worker.userRole && !isNumberOrDate(worker.userRole)) {
      texts[worker.userRole] = worker.userRole;
    }
    // Collect name
    if (worker.name && !isNumberOrDate(worker.name)) {
      texts[worker.name] = worker.name;
    }
    if (worker.username && !isNumberOrDate(worker.username)) {
      texts[worker.username] = worker.username;
    }
    // Collect email
    if (worker.email && !isNumberOrDate(worker.email)) {
      texts[worker.email] = worker.email;
    }
    // Collect phone/mobile (typically not translated, but collect for consistency)
    if (worker.phone && !isNumberOrDate(worker.phone)) {
      texts[worker.phone] = worker.phone;
    }
  });

  // Page 11 - Dynamic texts (supervision checklist)
  const supervisionChecklist = dynamicData.supervisionChecklist || [];
  supervisionChecklist.forEach((record) => {
    const checkDetails = record.checkDetails || {};
    // Collect section names
    if (checkDetails.section && !isNumberOrDate(checkDetails.section)) {
      texts[checkDetails.section] = checkDetails.section;
    }
    // Collect what
    if (checkDetails.what && !isNumberOrDate(checkDetails.what)) {
      texts[checkDetails.what] = checkDetails.what;
    }
    // Collect where
    if (checkDetails.where && !isNumberOrDate(checkDetails.where)) {
      texts[checkDetails.where] = checkDetails.where;
    }
    // Collect when
    if (checkDetails.when && !isNumberOrDate(checkDetails.when)) {
      texts[checkDetails.when] = checkDetails.when;
    }
  });

  // Collect quality assurance signature name if available
  if (dynamicData.qualityAssuranceSignature?.name) {
    const signatureName = dynamicData.qualityAssuranceSignature.name;
    if (!isNumberOrDate(signatureName)) {
      texts[signatureName] = signatureName;
    }
  }

  // Page 13 - Dynamic texts (tasks data)
  const projectData = dynamicData.project || {};
  const tasks = projectData.tasks || [];
  const subjectMatterId = dynamicData.subjectMatterId;

  // Filter tasks by SubjectMatterId (same as page13 does)
  if (subjectMatterId) {
    const filteredTasks = tasks.filter(
      (task) => task.SubjectMatterId === subjectMatterId
    );

    // Collect all task-related texts for translation
    filteredTasks.forEach((task) => {
      // Collect Activity
      const activity = task.Activity || task.activity || "";
      if (activity && !isNumberOrDate(activity)) {
        texts[activity] = activity;
      }

      // Collect Acceptance Criteria
      const acceptanceCriteria =
        task["Acceptance Criteria"] ||
        task.AcceptanceCriteria ||
        task.acceptanceCriteria ||
        "";
      if (acceptanceCriteria && !isNumberOrDate(acceptanceCriteria)) {
        texts[acceptanceCriteria] = acceptanceCriteria;
      }

      // Collect Method
      const method = task.Method || task.method || "";
      if (method && !isNumberOrDate(method)) {
        texts[method] = method;
      }

      // Collect Time
      const time = task.Time || task.time || "";
      if (time && !isNumberOrDate(time)) {
        texts[time] = time;
      }

      // Collect Scope
      const scope = task.Scope || task.scope || "";
      if (scope && !isNumberOrDate(scope)) {
        texts[scope] = scope;
      }
    });

    // Page 15 - Collect taskEntry data for translation
    // Filter tasks by Type "Receive" (same as page15 does)
    const receiveTasks = filteredTasks.filter(
      (task) => task.Type === "Receive" || task.Type === "receive"
    );

    // Collect taskEntry data
    receiveTasks.forEach((task) => {
      if (task.taskEntries && Array.isArray(task.taskEntries)) {
        task.taskEntries.forEach((entry) => {
          // Collect description from markPictureObjects
          if (
            entry.markPictureObjects &&
            Array.isArray(entry.markPictureObjects)
          ) {
            entry.markPictureObjects.forEach((markPic) => {
              if (markPic.description && !isNumberOrDate(markPic.description)) {
                texts[markPic.description] = markPic.description;
              }
            });
          }
        });
      }
    });

    // Collect receiveBuildingPart if it exists
    if (
      dynamicData.receiveBuildingPart &&
      !isNumberOrDate(dynamicData.receiveBuildingPart)
    ) {
      texts[dynamicData.receiveBuildingPart] = dynamicData.receiveBuildingPart;
    }
  }

  return texts;
}

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
function drawSectionBar(doc, y, text, translations = {}) {
  const barHeight = 20;

  doc.save().rect(M.l, y, CONTENT_W, barHeight).fill(HEADING_COLOR).restore();

  doc.font("Helvetica-Bold").fontSize(11).fillColor("white");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l + 8, y + 4, {
    width: CONTENT_W - 16,
    align: "left",
  });

  return y + barHeight + 10;
}

/**
 * Generic paragraph helper (with translation support)
 */
function paragraph(doc, y, text, options = {}, translations = {}) {
  doc
    .font(options.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.fontSize || 9)
    .fillColor(options.color || "black");
  const translatedText = translations[text] || text;
  doc.text(translatedText, M.l, y, {
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
function footer(doc, logicalPageNumber, translations = {}) {
  const footerY = PAGE.h - M.b + 15;

  // Handle decimal page numbers (e.g., 6.1, 6.2)
  const pageNumberStr =
    typeof logicalPageNumber === "number" && logicalPageNumber % 1 !== 0
      ? logicalPageNumber.toFixed(1)
      : String(logicalPageNumber);

  doc.font("Helvetica").fontSize(8).fillColor("black");
  const pageLabel = translations["Page"] || "Page";
  doc.text(`${pageLabel} ${pageNumberStr} of ${TOTAL_PAGES}`, M.l, footerY, {
    width: CONTENT_W / 2,
    align: "left",
  });

  const partOfText =
    translations["Part of Kvalitetssikring Danmark ApS"] ||
    "Part of Kvalitetssikring Danmark ApS";
  doc.text(partOfText, M.l + CONTENT_W / 2, footerY, {
    width: CONTENT_W / 2,
    align: "right",
  });
}

/**
 * Main generator for QUALITY ASSURANCE REPORT
 * @param {object} dynamic - all dynamic data (later we'll define structure)
 * @param {Writable} outputStream - Express res or any writable stream
 * @param {object} translations - translation map for texts
 */
async function generateQualityAssuranceReport(
  dynamic = {},
  outputStream,
  translations = {}
) {
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
  await page1(doc, dynamic, translations);

  // ---------- PAGE 2 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page2(doc, dynamic, translations);

  // ---------- PAGE 3 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page3(doc, dynamic, translations);

  // ---------- PAGE 4 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page4(doc, dynamic, translations);

  // ---------- PAGE 5 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page5(doc, dynamic, translations);

  // ---------- PAGE 6 (with pagination support) ----------
  doc.addPage({ size: "A4", margin: 0 });
  const page6Count = page6(doc, dynamic, 5, translations);

  // ---------- PAGE 7 (with pagination support) ----------
  doc.addPage({ size: "A4", margin: 0 });
  const page7Count = page7(doc, dynamic, 6, translations);

  // ---------- PAGE 8 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page8(doc, dynamic, translations);

  // ---------- PAGE 9 (with pagination support) ----------
  doc.addPage({ size: "A4", margin: 0 });
  const page9Count = page9(doc, dynamic, 8, translations);

  // ---------- PAGE 10 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page10(doc, dynamic, translations);

  // ---------- PAGE 11 ----------
  doc.addPage({ size: "A4", margin: 0 });
  const page11Pages = await page11(doc, dynamic, 10, translations);

  // ---------- PAGE 12 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page12(doc, dynamic, translations);

  // ---------- PAGE 13 ----------
  doc.addPage({ size: "A4", margin: 0 });
  const page13Pages = await page13(doc, dynamic, 12, translations);

  // ---------- PAGE 14 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page14(doc, dynamic, translations);

  // ---------- PAGE 15, 16, 17 ----------
  // These pages are now dynamic and handle pagination
  // Note: page15/page16/page17 will create their own pages, so we don't add pages here
  const page15Pages = await page15(doc, dynamic, 14, translations);
  const page16Pages = await page16(doc, dynamic, 15, translations);
  const page17Pages = await page17(doc, dynamic, 16, translations);

  // ---------- PAGE 18 ----------
  // Page 18 is now dynamic and handles pagination
  // Note: page18 will create its own pages, so we don't add pages here
  const page18Pages = await page18(doc, dynamic, 17, translations);

  // ---------- PAGE 19 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page19(doc, dynamic, translations);

  // ---------- PAGE 20 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page20(doc, dynamic, translations);

  // ---------- PAGE 21 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page21(doc, dynamic, translations);

  // ---------- PAGE 22 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page22(doc, dynamic, translations);

  // ---------- PAGE 23 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page23(doc, dynamic, translations);

  // ---------- PAGE 24 ----------
  doc.addPage({ size: "A4", margin: 0 });
  page24(doc, dynamic, translations);

  // Finish the PDF
  doc.end();
  return doc;
}

// ---------------------------------------------------------------------
// PAGE IMPLEMENTATIONS
// ---------------------------------------------------------------------

// PAGE 1 – Front cover
async function page1(doc, dynamic, translations = {}) {
  console.log("Page1 - Dynamic object received:", {
    hasCompany: !!dynamic.company,
    companyName: dynamic.company?.name,
    professionGroup: dynamic.professionGroup,
    preparedDate: dynamic.preparedDate,
    projectId: dynamic.projectId,
  });

  // Get company data from dynamic object
  const company = dynamic.company || {};
  const fromProjectSetupText =
    translations["From project setup"] || "From project setup";
  const companyName = company.name || fromProjectSetupText;
  const postCity =
    company.postalCode && company.city
      ? `${company.postalCode} ${company.city}`
      : company.postalCode || company.city || fromProjectSetupText;
  const address = company.address || fromProjectSetupText;
  const cvr = company.cvr || fromProjectSetupText;
  const telephone = company.contactPhone || fromProjectSetupText;
  const mail = company.email || fromProjectSetupText;

  const professionGroup = dynamic.professionGroup || fromProjectSetupText;
  const preparedDate = dynamic.preparedDate || ""; // often empty initially
  const projectCaseId = dynamic.projectId || fromProjectSetupText;

  let y = M.t;

  // ---------- Top left: mainlg.jpg image ----------
  try {
    const mainlgPath = path.join(__dirname, "mainlg.jpg");
    if (fs.existsSync(mainlgPath)) {
      const imageHeight = 80; // Set desired height for the image
      doc.image(mainlgPath, M.l, y, {
        fit: [200, imageHeight], // width: 200, height: imageHeight
        align: "left",
        valign: "top",
      });
      y += imageHeight + 10; // Add spacing after image
    }
  } catch (error) {
    console.error("Error loading mainlg.jpg:", error.message);
  }

  // ---------- Top: Performing company + logo box ----------

  // Label (with translation)
  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const performingCompanyLabel =
    translations["Performing company:"] || "Performing company:";
  doc.text(performingCompanyLabel, M.l, y);
  y += 14;

  const leftBoxWidth = CONTENT_W * 0.6;
  const rightBoxWidth = CONTENT_W * 0.3;
  const boxHeight = 90;

  // Left info box (no border) - indented as subsection
  let textY = y;
  const innerX = M.l + 20; // Tab space indentation
  const innerW = leftBoxWidth - 20; // Adjust width to account for indentation

  doc.font("Helvetica-Bold").fontSize(9).fillColor("black");
  // Translate company name if it's not a number/date
  const translatedCompanyName =
    companyName && !isNumberOrDate(companyName)
      ? translations[companyName] || companyName
      : companyName;
  doc.text(translatedCompanyName, innerX, textY, { width: innerW });
  textY = doc.y + 3;

  // Helper function to draw label-value pairs with blue labels (with translations)
  function drawLabelValue(label, value, yPos) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(HEADING_COLOR);
    const translatedLabel = translations[label] || label;
    doc.text(translatedLabel, innerX, yPos, { width: innerW, continued: true });
    doc.font("Helvetica").fontSize(9).fillColor("black");
    // Translate value if it's not a number/date
    let translatedValue = value;
    if (value && typeof value === "string" && !isNumberOrDate(value)) {
      translatedValue = translations[value] || value;
    }
    doc.text(` ${translatedValue}`, { continued: false });
    return doc.y + 2;
  }

  textY = drawLabelValue("Post no. / City:", postCity, textY);
  textY = drawLabelValue("Address:", address, textY);
  textY = drawLabelValue("CVR:", cvr, textY);
  textY = drawLabelValue("Telephone:", telephone, textY);
  textY = drawLabelValue("Mail:", mail, textY);

  // Right logo box (no border)
  const logoX = M.l + leftBoxWidth + 10;

  // Try to load company logo from company.picture
  try {
    const companyImageUrl =
      company.picture?.s3Location ||
      company.picture?.s3location ||
      company.picture?.location ||
      company.picture?.url ||
      "";

    if (companyImageUrl) {
      const imgBuffer = await fetchImageBuffer(companyImageUrl);
      doc.image(imgBuffer, logoX, y, {
        fit: [rightBoxWidth, boxHeight],
        align: "center",
        valign: "center",
      });
    } else if (dynamic.logoPath) {
      try {
        doc.image(dynamic.logoPath, logoX, y, {
          fit: [rightBoxWidth, boxHeight],
          align: "center",
          valign: "center",
        });
      } catch (e) {
        const companyLogoText = translations["Company logo"] || "Company logo";
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("black")
          .text(companyLogoText, logoX, y + boxHeight / 2 - 5, {
            width: rightBoxWidth,
            align: "center",
          });
      }
    } else {
      const companyLogoText = translations["Company logo"] || "Company logo";
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("black")
        .text(companyLogoText, logoX, y + boxHeight / 2 - 5, {
          width: rightBoxWidth,
          align: "center",
        });
    }
  } catch (error) {
    console.error("Error loading company logo:", error.message);
    const companyLogoText = translations["Company logo"] || "Company logo";
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(companyLogoText, logoX, y + boxHeight / 2 - 5, {
        width: rightBoxWidth,
        align: "center",
      });
  }

  y = y + boxHeight + 50;

  // ---------- Left title: QUALITY ASSURANCE REPORT (with translation) ----------

  doc.font("Helvetica-Bold").fontSize(20).fillColor(BORDER_COLOR);
  const qualityAssuranceReportText =
    translations["QUALITY ASSURANCE REPORT"] || "QUALITY ASSURANCE REPORT";
  doc.text(qualityAssuranceReportText, M.l, y, {
    width: CONTENT_W,
    align: "left",
  });

  y = doc.y + 40;

  // ---------- Left info block: FOR PROFESSION GROUP / Prepared date / Project ID Case ID (with translations) ----------

  const infoX = M.l;
  const infoW = CONTENT_W;

  // FOR PROFESSION GROUP (with translation)
  doc.font("Helvetica-Bold").fontSize(11).fillColor(HEADING_COLOR);
  const forProfessionGroupLabel =
    translations["FOR PROFESSION GROUP:"] || "FOR PROFESSION GROUP:";
  doc.text(forProfessionGroupLabel, infoX, y, {
    width: infoW,
    continued: true,
  });

  doc.font("Helvetica").fontSize(11).fillColor("black");
  // Translate profession group if it's not a number/date
  const translatedProfessionGroup =
    professionGroup && !isNumberOrDate(professionGroup)
      ? translations[professionGroup] || professionGroup
      : professionGroup;
  doc.text(`  ${translatedProfessionGroup}`, {
    continued: false,
  });

  y = doc.y + 12;

  // Prepared date (with translation)
  doc.font("Helvetica-Bold").fontSize(11).fillColor(HEADING_COLOR);
  const preparedDateLabel = translations["Prepared date:"] || "Prepared date:";
  doc.text(preparedDateLabel, infoX, y, {
    width: infoW,
    continued: true,
  });

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("black")
    .text(`  ${preparedDate}`, {
      continued: false,
    });

  y = doc.y + 12;

  // Project ID Case ID (with translation)
  doc.font("Helvetica-Bold").fontSize(11).fillColor(HEADING_COLOR);
  const projectIdCaseIdLabel =
    translations["Project ID Case ID:"] || "Project ID Case ID:";
  doc.text(projectIdCaseIdLabel, infoX, y, {
    width: infoW,
    continued: true,
  });

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("black")
    .text(`  ${projectCaseId}`, {
      continued: false,
    });

  // ---------- Bottom center: Report - system / Part of Quality Assurance Denmark ----------

  // No footer on cover page
}

// PAGE 2 – placeholder
// PAGE 2 – Contents (00. PROJECT DETAILS)
// PAGE 2 – Contents (00. PROJECT DETAILS)
function page2(doc, dynamic, translations = {}) {
  // ----- Blue bar heading (with translation) -----
  let y = drawSectionBar(doc, M.t, "00. PROJECT DETAILS", translations);

  y += 5;

  // ----- "Content" + "Indhold" (with translations) -----
  doc.font("Helvetica-Bold").fontSize(11).fillColor("black");
  const contentText = translations["Content"] || "Content";
  doc.text(contentText, M.l, y, {
    width: CONTENT_W,
    align: "left",
  });

  y = doc.y + 3;

  const indholdText = translations["Indhold"] || "Indhold";
  doc.font("Helvetica").fontSize(9).text(indholdText, M.l, y, {
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

    // Title (with translation)
    doc.font("Helvetica").fontSize(titleFontSize);
    const maxTitleWidth = pageX - titleX - 20;
    const translatedTitle = translations[item.title] || item.title;
    doc.text(translatedTitle, titleX, rowY, {
      width: maxTitleWidth,
      align: "left",
    });

    // Calculate where to start dotted line (use translated title width)
    const titleWidth = doc.widthOfString(translatedTitle);
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

  // In original, this is logically "Page 1 of 24/26" (with translation)
  footer(doc, 1, translations);
}

// PAGE 3 – placeholder
// PAGE 3 – 01. PROJECT DETAILS
// PAGE 3 – 01. PROJECT DETAILS
function page3(doc, dynamic, translations = {}) {
  // Blue bar heading (with translation)
  let y = drawSectionBar(doc, M.t, "01. PROJECT DETAILS", translations);
  y += 10;

  let rowHeight = 16; // slightly taller rows
  const dateColumnWidth = 80; // Separate DATE column width (for full-width sections)
  const constructionCaseDateWidth = 50; // Smaller date column width for construction case block

  // Helper to draw DATE column header (with translation)
  function drawDateHeader(startY) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666");
    const dateLabel = translations["DATE"] || "DATE";
    doc.text(dateLabel, M.l, startY, {
      width: dateColumnWidth,
      align: "left",
    });
    return startY + rowHeight;
  }

  // ---------- FULL-WIDTH ROW HELPER (with translations) ----------
  function fullRow(label, value, dateValue = null) {
    const fromProjectSetupText =
      translations["From project setup"] || "From project setup";
    const v = value || fromProjectSetupText;
    const keyWidth = 130;
    const contentStartX = M.l + dateColumnWidth + 6; // Start after DATE column

    // DATE column (only show date value if provided, otherwise empty)
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(dateValue || "", M.l, y, {
        width: dateColumnWidth,
        align: "left",
      });

    // Label and value in the content area (with translations)
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666");
    const translatedLabel = translations[label] || label;
    doc.text(translatedLabel, contentStartX, y, {
      width: keyWidth,
      align: "left",
    });

    doc.font("Helvetica").fontSize(9).fillColor("black");
    // Translate value if it's not a number/date
    let translatedValue = v;
    if (v && typeof v === "string" && !isNumberOrDate(v)) {
      translatedValue = translations[v] || v;
    }
    doc.text(translatedValue, contentStartX + keyWidth + 6, y, {
      width: CONTENT_W - dateColumnWidth - keyWidth - 12,
      align: "left",
    });

    // bottom border full width
    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor("#dddddd")
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  }

  // ---------- HALF-WIDTH BLOCK HELPERS (with translations) ----------

  function blockRow(
    label,
    value,
    x,
    width,
    yLocal,
    dateValue = null,
    dateColWidth = 0
  ) {
    const fromProjectSetupText =
      translations["From project setup"] || "From project setup";
    const v = value || fromProjectSetupText;
    const keyWidth = 90; // wider so "CONTACT PERSON" & "STARTING DATE" stay on one line
    const contentStartX = dateColWidth > 0 ? x + dateColWidth + 6 : x; // Start after DATE column if it exists

    // DATE column (show date value if provided and dateColWidth > 0, otherwise skip)
    if (dateColWidth > 0) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("black")
        .text(dateValue || "", x, yLocal, {
          width: dateColWidth,
          align: "left",
        });
    }

    // Label and value in the content area (with translations)
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666");
    const translatedLabel = translations[label] || label;
    doc.text(translatedLabel, contentStartX, yLocal, {
      width: keyWidth,
      align: "left",
    });

    const valueWidth =
      dateColWidth > 0
        ? width - dateColWidth - keyWidth - 10
        : width - keyWidth - 6;

    // Translate value if it's not a number/date
    let translatedValue = v;
    if (v && typeof v === "string" && !isNumberOrDate(v)) {
      translatedValue = translations[v] || v;
    }

    // Calculate actual height needed for the value text (allows wrapping)
    doc.font("Helvetica").fontSize(9);
    const valueHeight = doc.heightOfString(translatedValue, {
      width: valueWidth,
    });

    // Use dynamic row height - at least rowHeight, but more if value wraps
    const actualRowHeight = Math.max(rowHeight, valueHeight + 4);

    // Draw the value text
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(translatedValue, contentStartX + keyWidth + 4, yLocal, {
        width: valueWidth,
        align: "left",
      });

    // bottom border just for this block
    const lineY = yLocal + actualRowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor("#dddddd")
      .moveTo(x, lineY)
      .lineTo(x + width, lineY)
      .stroke()
      .restore();

    return yLocal + actualRowHeight;
  }

  function drawBlock(
    title,
    fields,
    x,
    width,
    startY,
    dateValue = null,
    showDateColumn = true,
    dateColWidth = dateColumnWidth
  ) {
    let yLocal = startY;

    // block title with light grey background
    const titleHeight = 18;
    doc.save().rect(x, yLocal, width, titleHeight).fill(LIGHT_GREY).restore();

    // Title and DATE in the same header row (with translations)
    if (showDateColumn) {
      // Draw DATE label in header (right-aligned in date column)
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666");
      const dateLabel = translations["DATE"] || "DATE";
      doc.text(dateLabel, x, yLocal + 4, {
        width: dateColWidth,
        align: "left",
      });

      // Draw title next to DATE (with translation)
      doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
      const translatedTitle = translations[title] || title;
      doc.text(translatedTitle, x + dateColWidth + 6, yLocal + 4, {
        width: width - dateColWidth - 10,
        align: "left",
      });
    } else {
      // No date column, just title (with translation)
      doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
      const translatedTitle = translations[title] || title;
      doc.text(translatedTitle, x + 4, yLocal + 4, {
        width: width - 8,
        align: "left",
      });
    }

    yLocal = yLocal + titleHeight + 3;

    // rows - first row gets date, others don't
    fields.forEach(([label, val], index) => {
      const rowDate = index === 0 ? dateValue : null;
      const actualDateWidth = showDateColumn ? dateColWidth : 0;
      yLocal = blockRow(label, val, x, width, yLocal, rowDate, actualDateWidth);
    });

    return yLocal;
  }

  // ---------- TWO-COLUMN BLOCKS: CONSTRUCTION CASE / MAIN CONTRACTOR ----------
  const blockGap = 10;
  const blockWidth = (CONTENT_W - blockGap) / 2;
  const leftX = M.l;
  const rightX = M.l + blockWidth + blockGap;

  const leftFields = [
    ["CASE ID:", dynamic.caseId],
    ["NAME:", dynamic.constructionCaseName1],
    ["CVR NO:", dynamic.constructionCaseCvrNo],
    ["ADDRESS:", dynamic.constructionCaseAddress1],
    ["POSTCODE:", dynamic.constructionCasePostcode1],
    ["CONTACT PERSON", dynamic.constructionCaseContactPerson],
    ["TELEPHONE:", dynamic.constructionCaseTelephone],
    ["EMAIL:", dynamic.constructionCaseEmail],
  ];

  const rightFields = [
    [
      "STARTING DATE",
      dynamic.mainContractorStartingDate ||
        dynamic.constructionCaseStartingDate,
    ],
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
    blockStartY,
    dynamic.projectDate,
    true, // show date column
    constructionCaseDateWidth // use smaller date column width
  );
  const rightEndY = drawBlock(
    "MAIN CONTRACTOR /CUSTOMER",
    rightFields,
    rightX,
    blockWidth,
    blockStartY,
    null, // no date value
    false // don't show date column
  );

  y = Math.max(leftEndY, rightEndY) + 18;

  // ---------- CONSTRUCTION MANAGER (with translation) ----------
  const sectionTitleHeight = 18;
  doc
    .save()
    .rect(M.l, y, CONTENT_W, sectionTitleHeight)
    .fill(LIGHT_GREY)
    .restore();

  // DATE label in header next to title (with translation)
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666");
  const dateLabel1 = translations["DATE"] || "DATE";
  doc.text(dateLabel1, M.l, y + 4, {
    width: dateColumnWidth,
    align: "left",
  });

  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const constructionManagerTitle =
    translations["CONSTRUCTION MANAGER"] || "CONSTRUCTION MANAGER";
  doc.text(constructionManagerTitle, M.l + dateColumnWidth + 6, y + 4, {
    width: CONTENT_W - dateColumnWidth - 10,
    align: "left",
  });

  y = y + sectionTitleHeight + 4;

  fullRow(
    "NAME",
    dynamic.constructionManagerName,
    dynamic.constructionManagerDate
  );
  fullRow("TELEPHONE:", dynamic.constructionManagerTelephone);
  fullRow("EMAIL:", dynamic.constructionManagerEmail);

  y += 10;

  // ---------- SAFETY COORDINATOR (with translation) ----------
  doc
    .save()
    .rect(M.l, y, CONTENT_W, sectionTitleHeight)
    .fill(LIGHT_GREY)
    .restore();

  // DATE label in header next to title (with translation)
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666");
  const dateLabel2 = translations["DATE"] || "DATE";
  doc.text(dateLabel2, M.l, y + 4, {
    width: dateColumnWidth,
    align: "left",
  });

  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const safetyCoordinatorTitle =
    translations["SAFETY COORDINATOR"] || "SAFETY COORDINATOR";
  doc.text(safetyCoordinatorTitle, M.l + dateColumnWidth + 6, y + 4, {
    width: CONTENT_W - dateColumnWidth - 10,
    align: "left",
  });

  y = y + sectionTitleHeight + 4;

  fullRow("NAME", dynamic.safetyCoordinatorName, dynamic.safetyCoordinatorDate);
  fullRow("TELEPHONE:", dynamic.safetyCoordinatorTelephone);
  fullRow("EMAIL:", dynamic.safetyCoordinatorEmail);

  y += 10;

  // ---------- CERTIFICATION SCHEME / LEVEL (with translation) ----------
  doc
    .save()
    .rect(M.l, y, CONTENT_W, sectionTitleHeight)
    .fill(LIGHT_GREY)
    .restore();

  // DATE label in header next to title (with translation)
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666");
  const dateLabel3 = translations["DATE"] || "DATE";
  doc.text(dateLabel3, M.l, y + 4, {
    width: dateColumnWidth,
    align: "left",
  });

  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const certificationSchemeTitle =
    translations["CERTIFICATION SCHEME / LEVEL"] ||
    "CERTIFICATION SCHEME / LEVEL";
  doc.text(certificationSchemeTitle, M.l + dateColumnWidth + 6, y + 4, {
    width: CONTENT_W - dateColumnWidth - 10,
    align: "left",
  });

  y = y + sectionTitleHeight + 4;

  fullRow(
    "CERTIFICATION SCHEME",
    dynamic.certificationScheme,
    dynamic.certificationDate
  );
  fullRow("LEVEL", dynamic.certificationLevel);

  y += 10;

  // ---------- PROFESSION GROUPE (with translation) ----------
  doc
    .save()
    .rect(M.l, y, CONTENT_W, sectionTitleHeight)
    .fill(LIGHT_GREY)
    .restore();

  // DATE label in header next to title (with translation)
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666");
  const dateLabel4 = translations["DATE"] || "DATE";
  doc.text(dateLabel4, M.l, y + 4, {
    width: dateColumnWidth,
    align: "left",
  });

  doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
  const professionGroupeTitle =
    translations["PROFESSION GROUPE"] || "PROFESSION GROUPE";
  doc.text(professionGroupeTitle, M.l + dateColumnWidth + 6, y + 4, {
    width: CONTENT_W - dateColumnWidth - 10,
    align: "left",
  });

  y = y + sectionTitleHeight + 4;

  fullRow(
    "PROFESSION GROUPE",
    dynamic.professionGroupName,
    dynamic.professionGroupDate
  );

  // Footer – logically Page 2 (with translation)
  footer(doc, 2, translations);
}

// PAGE 4 – placeholder
// PAGE 4 – 02. AFFILIATED ADVISERS AND INSPECTORS
function page4(doc, dynamic, translations = {}) {
  // Blue bar heading (with translation)
  let y = drawSectionBar(
    doc,
    M.t,
    "02. AFFILIATED ADVISERS AND INSPECTORS",
    translations
  );
  y += 10;

  const rowHeight = 16;
  const dateColumnWidth = 80; // DATE column width

  // ---------- FULL-WIDTH ROW HELPER (with translations) ----------
  function fullRow(label, value, dateValue = null) {
    const fromProjectSetupText =
      translations["From project setup"] || "From project setup";
    const v = value || fromProjectSetupText;
    const keyWidth = 130;
    const contentStartX = M.l + dateColumnWidth + 6; // Start after DATE column

    // DATE column (only show date value if provided, otherwise empty)
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(dateValue || "", M.l, y, {
        width: dateColumnWidth,
        align: "left",
      });

    // Label and value in the content area (with translations)
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666");
    const translatedLabel = translations[label] || label;
    doc.text(translatedLabel, contentStartX, y, {
      width: keyWidth,
      align: "left",
    });

    doc.font("Helvetica").fontSize(9).fillColor("black");
    // Translate value if it's not a number/date
    let translatedValue = v;
    if (v && typeof v === "string" && !isNumberOrDate(v)) {
      translatedValue = translations[v] || v;
    }
    doc.text(translatedValue, contentStartX + keyWidth + 6, y, {
      width: CONTENT_W - dateColumnWidth - keyWidth - 12,
      align: "left",
    });

    // bottom border full width
    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor("#dddddd")
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  }

  // ---------- BLOCK HELPER (TITLE + rows) (with translations) ----------
  function advisorBlock(title, fields, dateValue = null) {
    // Title with light grey background
    const titleHeight = 18;
    doc.save().rect(M.l, y, CONTENT_W, titleHeight).fill(LIGHT_GREY).restore();

    // DATE label in header next to title (with translation)
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666");
    const dateLabel = translations["DATE"] || "DATE";
    doc.text(dateLabel, M.l, y + 4, {
      width: dateColumnWidth,
      align: "left",
    });

    doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
    // Translate title - first check if exact match exists
    let translatedTitle = translations[title] || title;
    // If not found, try to translate parts (for dynamically constructed titles)
    if (!translations[title] && title.includes("ADVISOR/")) {
      const parts = title.split("/");
      if (parts.length === 2) {
        const typePart = parts[1].replace(/ \(\d+\)$/, ""); // Remove numbering like " (2)"
        const translatedType = translations[typePart] || typePart;
        const numberPart = parts[1].match(/ \(\d+\)$/);
        const constructedTitle = `ADVISOR/${translatedType.toUpperCase()}${
          numberPart ? numberPart[0] : ""
        }`;
        // Check if the constructed title exists in translations
        translatedTitle = translations[constructedTitle] || constructedTitle;
      }
    }
    doc.text(translatedTitle, M.l + dateColumnWidth + 6, y + 4, {
      width: CONTENT_W - dateColumnWidth - 10,
      align: "left",
    });

    y = y + titleHeight + 4;

    // rows - first row gets date, others don't
    fields.forEach(([label, val], index) => {
      const rowDate = index === 0 ? dateValue : null;
      fullRow(label, val, rowDate);
    });

    y += 8; // gap after block
  }

  // ---------- DYNAMIC ADVISOR BLOCKS BY TYPE ----------
  const advisorsByType = dynamic.advisorsByType || {};
  const advisorTypes = [
    "Architecture",
    "Engineer",
    "Fire",
    "Acoustics",
    "Technical Subject",
  ];

  // Helper function to format date
  const formatDate = (date) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleDateString("en-GB");
    } catch {
      return "";
    }
  };

  advisorTypes.forEach((type) => {
    const advisors = advisorsByType[type] || [];

    if (advisors.length > 0) {
      // Show all advisors of this type
      advisors.forEach((advisor, index) => {
        // Translate advisor type
        const translatedType = translations[type] || type;
        const title =
          index === 0
            ? `ADVISOR/${translatedType.toUpperCase()}`
            : `ADVISOR/${translatedType.toUpperCase()} (${index + 1})`;

        // Get date value for the header
        const advisorDate = advisor.createdAt
          ? formatDate(advisor.createdAt)
          : null;

        // Build postcode/city value
        let postcodeCity = "";
        if (advisor.postalCode && advisor.city) {
          const combined = `${advisor.postalCode} ${advisor.city}`;
          postcodeCity = combined;
        } else {
          postcodeCity = advisor.postalCode || advisor.city || "";
        }

        advisorBlock(
          title,
          [
            ["NAME:", advisor.name || advisor.username || ""],
            ["CONTACT PERSON", advisor.contactPerson || ""],
            ["CVR NO.:", advisor.cvr || ""],
            ["ADDRESS:", advisor.address || ""],
            ["POSTCODE:", postcodeCity],
            ["TELEPHONE:", advisor.phone || ""],
            ["EMAIL", advisor.email || advisor.username || ""],
          ],
          advisorDate
        );
      });
    }
  });

  // Footer – logically "Page 3 of 26" in original (with translation)
  footer(doc, 3, translations);
}

// PAGE 5 – placeholder
// PAGE 5 – 03. DOCUMENTS AND INFORMATION RECEIVED BEFORE THE START
// PAGE 5 – 03. DOCUMENTS AND INFORMATION RECEIVED BEFORE THE START
function page5(doc, dynamic, translations = {}) {
  // Blue bar heading (with translation)
  let y = drawSectionBar(
    doc,
    M.t,
    "03. DOCUMENTS AND INFORMATION RECEIVED BEFORE THE START",
    translations
  );
  y += 10;

  // Intro paragraphs (with translations)
  y = paragraph(
    doc,
    y,
    "The work is based on the information and assumptions available at the time of preparation.",
    { fontSize: 9 },
    translations
  );

  y = paragraph(
    doc,
    y,
    "The Contractor reserves the right to adjust the price and/or schedule if, during the execution of the work, unknown conditions or unforeseen events occur that are not included in the existing project materials or specifications.",
    { fontSize: 9 },
    translations
  );

  y = paragraph(
    doc,
    y,
    "The prerequisites for the performance of the contract include, but are not limited to:",
    { fontSize: 9, afterGap: 6 },
    translations
  );

  // ---------- Bullet list (drawn circles, no weird % symbols) (with translations) ----------
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

    // Draw bullet text (with translation)
    const translatedBullet = translations[item] || item;
    doc.text(translatedBullet, textX, y, {
      width: textWidth,
      align: "left",
      lineGap,
    });

    y = doc.y + 4;
  });

  y += 4;

  // AB18 paragraph (with translation)
  y = paragraph(
    doc,
    y,
    "It should be noted that AB18 (General Conditions for Work and Supplies in Construction) applies to this contract, which means that all parties are obliged to comply with these conditions. This includes dealing with changes, delays, and other circumstances that may arise during the project.",
    { fontSize: 9 },
    translations
  );

  // Final paragraph (with translation)
  y = paragraph(
    doc,
    y,
    "It is expressly noted that the developer and his consultants have full responsibility for ensuring that the project is clearly and unambiguously prepared, so that there is no doubt as to the nature and scope of the work.",
    { fontSize: 9 },
    translations
  );

  // Footer – logically "Page 4" (with translation)
  footer(doc, 4, translations);
}

// PAGE 6 – placeholder
// PAGE 6 – 04. RECEIVED CASE DOCUMENTS BEFORE CONSTRUCTION COMMENCED
// This function now handles pagination and returns the number of pages created
function page6(doc, dynamic, startPageNumber = 6, translations = {}) {
  const documents = dynamic.documents || [];
  const draws = dynamic.draws || [];

  // Helper function to format date
  const formatDate = (date) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleDateString("en-GB");
    } catch {
      return "";
    }
  };

  // Prepare documents data
  const documentRows = documents.map((doc) => [
    formatDate(doc.uploadedAt),
    doc.category || "",
    doc.originalName || doc.filename || "",
  ]);

  // Prepare draws data
  const drawRows = draws.map((draw) => {
    const mainDrawing =
      draw.mainDrawings && draw.mainDrawings.length > 0
        ? draw.mainDrawings[0]
        : null;
    const filename = mainDrawing?.filename || mainDrawing?.originalname || "";
    return [
      formatDate(draw.createdAt),
      filename, // Name column - mainDrawings first element filename
    ];
  });

  const rowHeight = 18;
  const headerHeight = rowHeight;
  const gapAfterTable = 16;
  const sectionGap = 20;
  const headingHeight = 30; // Blue bar + spacing

  // Calculate available space per page (from top margin to bottom margin)
  const availableHeight = PAGE.h - M.t - M.b - 50; // Leave some space for footer

  // Calculate how many rows fit per page
  // We need space for: heading + first table header + first table rows + gap + second heading + second table header + second table rows
  const rowsPerPage = Math.floor(
    (availableHeight -
      headingHeight -
      headerHeight * 2 -
      gapAfterTable * 2 -
      sectionGap -
      20) /
      rowHeight
  );

  let currentPage = 0;
  let docIndex = 0;
  let drawIndex = 0;
  let pagesCreated = 0;

  // Process documents and draws across multiple pages
  while (
    docIndex < documentRows.length ||
    drawIndex < drawRows.length ||
    pagesCreated === 0
  ) {
    if (pagesCreated > 0) {
      doc.addPage({ size: "A4", margin: 0 });
    }

    let y = M.t;

    // Blue bar heading (only on first page of section) (with translation)
    if (pagesCreated === 0) {
      y = drawSectionBar(
        doc,
        M.t,
        "04. RECEIVED CASE DOCUMENTS BEFORE CONSTRUCTION COMMENCED",
        translations
      );
      y += 20;
    } else {
      // On continuation pages, just add a small heading (with translation)
      doc.font("Helvetica-Bold").fontSize(10).fillColor("black");
      const continuedHeading =
        translations[
          "04. RECEIVED CASE DOCUMENTS BEFORE CONSTRUCTION COMMENCED (continued)"
        ] ||
        "04. RECEIVED CASE DOCUMENTS BEFORE CONSTRUCTION COMMENCED (continued)";
      doc.text(continuedHeading, M.l, y, {
        width: CONTENT_W,
        align: "left",
      });
      y += 20;
    }

    const tableX = M.l;
    const tableW = CONTENT_W;

    // Function to draw table with pagination support (with translations)
    const drawTableWithPagination = (headers, rows, startIndex, maxRows) => {
      const colPercents =
        headers.length === 3
          ? [0.18, 0.52, 0.3] // DATE / DOCUMENT / FILENAME
          : headers.length === 2
          ? [0.3, 0.7] // SUBSCRIPTION / NAME (2 columns)
          : [0.25, 0.4, 0.35]; // Default fallback

      const colWidths = colPercents.map((p) => p * tableW);
      const colX = [];
      let currentX = tableX;
      colWidths.forEach((width) => {
        colX.push(currentX);
        currentX += width;
      });

      // Header row
      doc
        .save()
        .rect(tableX, y, tableW, headerHeight)
        .fill(LIGHT_GREY)
        .restore();

      headers.forEach((h, i) => {
        doc.font("Helvetica-Bold").fontSize(9).fillColor("black");
        const translatedHeader = translations[h] || h;
        doc.text(translatedHeader, colX[i] + 4, y + 4, {
          width: colWidths[i] - 8,
          align: "left",
        });
      });

      let lineY = y + headerHeight;
      doc
        .save()
        .lineWidth(0.5)
        .strokeColor(BORDER_COLOR)
        .moveTo(tableX, lineY)
        .lineTo(tableX + tableW, lineY)
        .stroke()
        .restore();

      y += headerHeight;

      // Data rows with dynamic height based on content
      const endIndex = Math.min(startIndex + maxRows, rows.length);
      for (let i = startIndex; i < endIndex; i++) {
        const row = rows[i];

        // Calculate dynamic row height based on content
        let maxCellHeight = rowHeight;
        doc.font("Helvetica").fontSize(9);

        // Measure each cell's height
        row.forEach((cell, j) => {
          const value = cell || "";
          const cellHeight = doc.heightOfString(value, {
            width: colWidths[j] - 8,
            align: "left",
          });
          maxCellHeight = Math.max(maxCellHeight, cellHeight + 8); // Add padding
        });

        // Draw cells with calculated height (with translations)
        row.forEach((cell, j) => {
          let value = cell || "";
          // Translate value if it's not a number/date
          if (value && typeof value === "string" && !isNumberOrDate(value)) {
            value = translations[value] || value;
          }
          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor("black")
            .text(value, colX[j] + 4, y + 4, {
              width: colWidths[j] - 8,
              align: "left",
            });
        });

        lineY = y + maxCellHeight;
        doc
          .save()
          .lineWidth(0.5)
          .strokeColor(BORDER_COLOR)
          .moveTo(tableX, lineY)
          .lineTo(tableX + tableW, lineY)
          .stroke()
          .restore();

        y += maxCellHeight;
      }

      y += gapAfterTable;
      return { y, endIndex };
    };

    // Calculate how many rows we can fit on this page
    const remainingHeight = availableHeight - (y - M.t);
    const availableRows = Math.floor(
      (remainingHeight - sectionGap - headerHeight * 2 - gapAfterTable * 2) /
        rowHeight
    );

    // Draw documents table
    if (docIndex < documentRows.length) {
      const docRowsToShow = Math.min(
        availableRows / 2,
        documentRows.length - docIndex
      );
      const result = drawTableWithPagination(
        ["DATE", "DOCUMENT", "FILENAME"],
        documentRows,
        docIndex,
        docRowsToShow
      );
      y = result.y;
      docIndex = result.endIndex;
    }

    // Draw draws table (with translation)
    if (drawIndex < drawRows.length && y < PAGE.h - M.b - 100) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("black");
      const currentDrawingsText =
        translations["CURRENT DRAWINGS"] || "CURRENT DRAWINGS";
      doc.text(currentDrawingsText, M.l, y, {
        width: CONTENT_W,
        align: "left",
      });
      y = doc.y + 8;

      const remainingHeightForDraws = PAGE.h - M.b - y - 50;
      const availableDrawRows = Math.floor(
        (remainingHeightForDraws - headerHeight - gapAfterTable) / rowHeight
      );
      const drawRowsToShow = Math.min(
        availableDrawRows,
        drawRows.length - drawIndex
      );

      const result = drawTableWithPagination(
        ["SUBSCRIPTION", "NAME"],
        drawRows,
        drawIndex,
        drawRowsToShow
      );
      y = result.y;
      drawIndex = result.endIndex;
    }

    // Footer - use decimal notation for continuation pages (6.1, 6.2, etc.) (with translation)
    const pageNumber =
      pagesCreated === 0
        ? startPageNumber
        : parseFloat((startPageNumber + pagesCreated * 0.1).toFixed(1));
    footer(doc, pageNumber, translations);
    pagesCreated++;

    // If we've displayed all data, break
    if (docIndex >= documentRows.length && drawIndex >= drawRows.length) {
      break;
    }
  }

  return pagesCreated;
}

// PAGE 7 – placeholder
// PAGE 7 – 05. CHECKLIST
// This function now handles pagination and returns the number of pages created
function page7(doc, dynamic, startPageNumber = 6, translations = {}) {
  const project = dynamic.project || {};
  const checks = project.checks || [];

  // Helper function to format date
  const formatDate = (date) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleDateString("en-GB");
    } catch {
      return "";
    }
  };

  // Prepare checks data
  const projectCreatedAt = formatDate(project.createdAt);
  const checkRows = checks.map((check) => [
    check.name || "",
    projectCreatedAt, // project createdAt
    check.approvalNote || "",
    formatDate(check.approvedDate),
  ]);

  const rowHeight = 18;
  const headerHeight = rowHeight;
  const gapAfterTable = 16;
  const headingHeight = 30; // Blue bar + spacing

  // Calculate available space per page
  const availableHeight = PAGE.h - M.t - M.b - 50;

  let checkIndex = 0;
  let pagesCreated = 0;

  // Process checks across multiple pages
  while (checkIndex < checkRows.length || pagesCreated === 0) {
    if (pagesCreated > 0) {
      doc.addPage({ size: "A4", margin: 0 });
    }

    let y = M.t;

    // Blue bar heading (only on first page of section)
    if (pagesCreated === 0) {
      y = drawSectionBar(doc, M.t, "05.  CHECKLIST", translations);
      y += 18;
    } else {
      // On continuation pages, just add a small heading
      const continuedText =
        translations["05.  CHECKLIST (continued)"] ||
        "05.  CHECKLIST (continued)";
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("black")
        .text(continuedText, M.l, y, {
          width: CONTENT_W,
          align: "left",
        });
      y += 18;
    }

    const tableX = M.l;
    const tableW = CONTENT_W;

    // Column widths: NAME / CREATED AT / APPROVAL NOTE / APPROVED DATE
    const colPercents = [0.25, 0.18, 0.32, 0.25];
    const colWidths = colPercents.map((p) => p * tableW);
    const colX = [
      tableX,
      tableX + colWidths[0],
      tableX + colWidths[0] + colWidths[1],
      tableX + colWidths[0] + colWidths[1] + colWidths[2],
    ];

    // ---------- HEADER ROW ----------
    doc.save().rect(tableX, y, tableW, headerHeight).fill(LIGHT_GREY).restore();

    const headers = [
      "NAME:",
      "CREATED AT:",
      "APPROVAL NOTE:",
      "APPROVED DATE:",
    ];

    headers.forEach((h, i) => {
      // Try translation with colon first, then without colon
      const headerWithoutColon = h.replace(":", "");
      const translatedHeader =
        translations[h] || translations[headerWithoutColon] || h;
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("black")
        .text(translatedHeader, colX[i] + 4, y + 4, {
          width: colWidths[i] - 8,
          align: "left",
        });
    });

    // bottom line under header
    let lineY = y + headerHeight;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += headerHeight;

    // Calculate how many rows we can fit on this page
    const remainingHeight = PAGE.h - M.b - y - 50;
    const estimatedRows = Math.floor(remainingHeight / (rowHeight * 1.5));
    const rowsToShow = Math.min(estimatedRows, checkRows.length - checkIndex);

    // ---------- DATA ROWS with dynamic height ----------
    for (
      let i = checkIndex;
      i < checkIndex + rowsToShow && i < checkRows.length;
      i++
    ) {
      const row = checkRows[i];

      // Calculate dynamic row height based on content
      let maxCellHeight = rowHeight;
      doc.font("Helvetica").fontSize(9);

      // Measure each cell's height (using translated values for accuracy)
      row.forEach((cell, j) => {
        let value = cell || "";
        // Translate value if it's not a number/date and not empty
        if (
          value &&
          typeof value === "string" &&
          value.trim() !== "" &&
          !isNumberOrDate(value)
        ) {
          // Try exact match first, then trimmed version
          const trimmedValue = value.trim();
          value = translations[value] || translations[trimmedValue] || value;
        }
        const cellHeight = doc.heightOfString(value, {
          width: colWidths[j] - 8,
          align: "left",
        });
        maxCellHeight = Math.max(maxCellHeight, cellHeight + 8); // Add padding
      });

      // Draw cells
      row.forEach((cell, j) => {
        let value = cell || "";
        // Translate value if it's not a number/date and not empty
        if (
          value &&
          typeof value === "string" &&
          value.trim() !== "" &&
          !isNumberOrDate(value)
        ) {
          // Try exact match first, then trimmed version
          const trimmedValue = value.trim();
          value = translations[value] || translations[trimmedValue] || value;
        }
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("black")
          .text(value, colX[j] + 4, y + 4, {
            width: colWidths[j] - 8,
            align: "left",
          });
      });

      lineY = y + maxCellHeight;
      doc
        .save()
        .lineWidth(0.5)
        .strokeColor(BORDER_COLOR)
        .moveTo(tableX, lineY)
        .lineTo(tableX + tableW, lineY)
        .stroke()
        .restore();

      y += maxCellHeight;

      // If we're too close to bottom, break and create new page
      if (y > PAGE.h - M.b - 100) {
        break;
      }
    }

    checkIndex += rowsToShow;

    // Footer - use decimal notation for continuation pages (6.1, 6.2, etc.)
    const pageNumber =
      pagesCreated === 0
        ? startPageNumber
        : parseFloat((startPageNumber + pagesCreated * 0.1).toFixed(1));
    footer(doc, pageNumber, translations);
    pagesCreated++;

    // If we've displayed all data, break
    if (checkIndex >= checkRows.length) {
      break;
    }
  }

  return pagesCreated;
}

// PAGE 8 – placeholder
// PAGE 8 – 06. COMPANY ORGANIZATION
// PAGE 8 – 06. COMPANY ORGANIZATION
function page8(doc, dynamic, translations = {}) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "06. COMPANY ORGANIZATION", translations);
  y += 12;

  const rowHeight = 16;
  const dateColumnWidth = 80; // DATE column width (same as pages 3 and 4)
  const sectionTitleHeight = 18;

  // ---------- GENERIC ROW HELPERS ----------

  // Normal key/value rows with date column
  function fullRow(label, value, dateValue = null) {
    const fromProjectSetupText =
      translations["From project setup"] || "From project setup";
    const v = value || fromProjectSetupText;
    const keyWidth = 130;
    const contentStartX = M.l + dateColumnWidth + 6; // Start after DATE column

    // DATE column (only show date value if provided, otherwise empty)
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(dateValue || "", M.l, y, {
        width: dateColumnWidth,
        align: "left",
      });

    // Label and value in the content area (with translations)
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666");
    const translatedLabel = translations[label] || label;
    doc.text(translatedLabel, contentStartX, y, {
      width: keyWidth,
      align: "left",
    });

    doc.font("Helvetica").fontSize(9).fillColor("black");
    // Translate value if it's not a number/date
    let translatedValue = v;
    if (v && typeof v === "string" && !isNumberOrDate(v)) {
      const trimmedValue = v.trim();
      translatedValue = translations[v] || translations[trimmedValue] || v;
    }
    doc.text(translatedValue, contentStartX + keyWidth + 6, y, {
      width: CONTENT_W - dateColumnWidth - keyWidth - 12,
      align: "left",
    });

    // bottom border full width
    const lineY = y + rowHeight - 3;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor("#dddddd")
      .moveTo(M.l, lineY)
      .lineTo(M.l + CONTENT_W, lineY)
      .stroke()
      .restore();

    y += rowHeight;
  }

  // Block helper with header row containing DATE label and title
  function orgBlock(title, dateValue, fields) {
    // Title with light grey background
    doc
      .save()
      .rect(M.l, y, CONTENT_W, sectionTitleHeight)
      .fill(LIGHT_GREY)
      .restore();

    // DATE label in header next to title (with translation)
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666");
    const dateLabel = translations["DATE"] || "DATE";
    doc.text(dateLabel, M.l, y + 4, {
      width: dateColumnWidth,
      align: "left",
    });

    doc.font("Helvetica-Bold").fontSize(10).fillColor(HEADING_COLOR);
    // Translate title
    const translatedTitle = translations[title] || title;
    doc.text(translatedTitle, M.l + dateColumnWidth + 6, y + 4, {
      width: CONTENT_W - dateColumnWidth - 10,
      align: "left",
    });

    y = y + sectionTitleHeight + 4;

    // rows - first row gets date, others don't
    fields.forEach(([label, val], index) => {
      const rowDate = index === 0 ? dateValue : null;
      fullRow(label, val, rowDate);
    });

    y += 10; // gap after block
  }

  // Helper function to format date
  const formatDate = (date) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleDateString("en-GB");
    } catch {
      return "";
    }
  };

  // ---------- 1) SUBCONTRACTOR ----------
  const subContractors = dynamic.subContractors || [];
  subContractors.forEach((user, index) => {
    const dateValue = user.createdAt ? formatDate(user.createdAt) : "";
    orgBlock(
      index === 0 ? "SUBCONTRACTOR" : "SUBCONTRACTOR (continued)",
      dateValue,
      [
        ["COMPANY NAME:", user.name || user.username || ""],
        ["CONTACT PERSON", user.contactPerson || ""],
        ["CVR NO.:", user.cvr || ""],
        ["PROFESSION:", user.profession || ""],
        ["ADDRESS:", user.address || ""],
        [
          "POSTCODE:",
          user.postalCode && user.city
            ? `${user.postalCode} ${user.city}`
            : user.postalCode || user.city || "",
        ],
        ["TELEPHONE:", user.phone || ""],
        ["EMAIL", user.email || user.username || ""],
      ]
    );
  });

  // ---------- 2) PROJECT MANAGER ----------
  const projectManagers = dynamic.projectManagers || [];
  projectManagers.forEach((user, index) => {
    const dateValue = user.createdAt ? formatDate(user.createdAt) : "";
    orgBlock(
      index === 0 ? "PROJECT MANAGER" : "PROJECT MANAGER (continued)",
      dateValue,
      [
        ["ROLE", user.role || user.userRole || ""],
        ["TELEPHONE:", user.phone || ""],
        ["NAME", user.name || user.username || ""],
        ["EMAIL", user.email || user.username || ""],
      ]
    );
  });

  // ---------- 4) INDEPENDENT INSPECTOR OR OTHER CONTROL ----------
  const independentControllers = dynamic.independentControllers || [];
  independentControllers.forEach((user, index) => {
    const dateValue = user.createdAt ? formatDate(user.createdAt) : "";
    orgBlock(
      index === 0
        ? "INDEPENDENT INSPECTOR OR OTHER CONTROL"
        : "INDEPENDENT INSPECTOR OR OTHER CONTROL (continued)",
      dateValue,
      [
        ["NAME:", user.name || user.username || ""],
        ["CONTACT PERSON", user.contactPerson || ""],
        ["CVR NO.:", user.cvr || ""],
        ["ADDRESS:", user.address || ""],
        [
          "POSTCODE:",
          user.postalCode && user.city
            ? `${user.postalCode} ${user.city}`
            : user.postalCode || user.city || "",
        ],
        ["TELEPHONE:", user.phone || ""],
        ["EMAIL", user.email || user.username || ""],
      ]
    );
  });

  // Footer – logically "Page 7"
  footer(doc, 7, translations);
}

// PAGE 9 – placeholder
// PAGE 9 – 07. EMPLOYEE ASSOCIATED WITH THE PROJECT FROM THE ORGANIZATION
// This function now handles pagination and returns the number of pages created
function page9(doc, dynamic, startPageNumber = 8, translations = {}) {
  // Get workers from dynamic data
  const workers = dynamic.workers || [];

  const tableX = M.l;
  const tableW = CONTENT_W;
  const rowHeight = 20;
  const headerHeight = rowHeight;
  const headingHeight = 30; // Blue bar + spacing
  const availableHeight = PAGE.h - M.t - M.b - 50; // Leave space for footer

  let workerIndex = 0;
  let pagesCreated = 0;

  // Process workers across multiple pages
  while (workerIndex < workers.length || pagesCreated === 0) {
    if (pagesCreated > 0) {
      doc.addPage({ size: "A4", margin: 0 });
    }

    let y = M.t;

    // Blue bar heading (only on first page of section)
    if (pagesCreated === 0) {
      y = drawSectionBar(
        doc,
        M.t,
        "07. EMPLOYEE ASSOCIATED WITH THE PROJECT FROM THE ORGANIZATION",
        translations
      );
      y += 18;
    } else {
      // On continuation pages, just add a small heading
      const continuedText =
        translations[
          "07. EMPLOYEE ASSOCIATED WITH THE PROJECT FROM THE ORGANIZATION (continued)"
        ] ||
        "07. EMPLOYEE ASSOCIATED WITH THE PROJECT FROM THE ORGANIZATION (continued)";
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("black")
        .text(continuedText, M.l, y, {
          width: CONTENT_W,
          align: "left",
        });
      y += 18;
    }

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
    doc.save().rect(tableX, y, tableW, headerHeight).fill(LIGHT_GREY).restore();

    headers.forEach((h, i) => {
      const translatedHeader = translations[h] || h;
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("black")
        .text(translatedHeader, colX[i] + 3, y + 4, {
          width: colWidths[i] - 6,
          align: "left",
        });
    });

    // bottom line under header
    let lineY = y + headerHeight;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(tableX, lineY)
      .lineTo(tableX + tableW, lineY)
      .stroke()
      .restore();

    y += headerHeight;

    // Calculate how many rows we can fit on this page
    const remainingHeight = PAGE.h - M.b - y - 50;
    const estimatedRows = Math.floor(remainingHeight / (rowHeight * 1.5));
    const rowsToShow = Math.min(estimatedRows, workers.length - workerIndex);

    // ---------- DATA ROWS ----------
    for (
      let i = workerIndex;
      i < workerIndex + rowsToShow && i < workers.length;
      i++
    ) {
      const worker = workers[i];
      const globalIndex = i; // Global index for ID numbering
      const idNo = `07.${String(globalIndex + 1).padStart(2, "0")}`;
      let role = worker.role || worker.userRole || "";
      let name = worker.name || worker.username || "";
      let email = worker.email || worker.username || "";
      let mobile = worker.phone || "";

      // Translate dynamic data values if they're not numbers/dates
      if (role && typeof role === "string" && !isNumberOrDate(role)) {
        const trimmedRole = role.trim();
        role = translations[role] || translations[trimmedRole] || role;
      }
      if (name && typeof name === "string" && !isNumberOrDate(name)) {
        const trimmedName = name.trim();
        name = translations[name] || translations[trimmedName] || name;
      }
      if (email && typeof email === "string" && !isNumberOrDate(email)) {
        const trimmedEmail = email.trim();
        email = translations[email] || translations[trimmedEmail] || email;
      }
      // Mobile numbers are typically not translated, but handle if needed
      if (mobile && typeof mobile === "string" && !isNumberOrDate(mobile)) {
        const trimmedMobile = mobile.trim();
        mobile = translations[mobile] || translations[trimmedMobile] || mobile;
      }

      // Get photo path from picture field
      let photoPath = null;
      if (worker.picture) {
        // Picture can be a string (filename) or an object with filename
        const filename =
          typeof worker.picture === "string"
            ? worker.picture
            : worker.picture.filename || worker.picture.name || "";

        if (filename) {
          // Construct path to uploads directory
          photoPath = path.join(__dirname, "uploads", filename);
        }
      }

      // Calculate dynamic row height (for photo)
      let cellHeights = [];
      doc.font("Helvetica").fontSize(9);

      // Measure text cells (using translated values for accuracy)
      cellHeights.push(doc.heightOfString(idNo, { width: colWidths[0] - 6 }));
      cellHeights.push(doc.heightOfString(role, { width: colWidths[1] - 6 }));
      cellHeights.push(doc.heightOfString(name, { width: colWidths[2] - 6 }));
      cellHeights.push(doc.heightOfString(email, { width: colWidths[3] - 6 }));
      cellHeights.push(doc.heightOfString(mobile, { width: colWidths[4] - 6 }));

      // Photo cell height (minimum 30px for photo)
      const photoHeight = 30;
      cellHeights.push(photoHeight);

      const maxCellHeight = Math.max(...cellHeights) + 8; // Add padding

      // Draw cells
      // ID NO
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("black")
        .text(idNo, colX[0] + 3, y + 4, {
          width: colWidths[0] - 6,
          align: "left",
        });

      // ROLE
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("black")
        .text(role, colX[1] + 3, y + 4, {
          width: colWidths[1] - 6,
          align: "left",
        });

      // NAME ASSIGNED
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("black")
        .text(name, colX[2] + 3, y + 4, {
          width: colWidths[2] - 6,
          align: "left",
        });

      // EMAIL
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("black")
        .text(email, colX[3] + 3, y + 4, {
          width: colWidths[3] - 6,
          align: "left",
        });

      // MOBILE NO.
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("black")
        .text(mobile, colX[4] + 3, y + 4, {
          width: colWidths[4] - 6,
          align: "left",
        });

      // PHOTO/ID
      const noPhotoText = translations["No photo"] || "No photo";
      if (photoPath && fs.existsSync(photoPath)) {
        try {
          doc.image(photoPath, colX[5] + 3, y + 2, {
            fit: [colWidths[5] - 6, photoHeight - 4],
            align: "center",
          });
        } catch (error) {
          console.error("Error loading photo:", photoPath, error.message);
          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor("gray")
            .text(noPhotoText, colX[5] + 3, y + 4, {
              width: colWidths[5] - 6,
              align: "center",
            });
        }
      } else {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("gray")
          .text(noPhotoText, colX[5] + 3, y + 4, {
            width: colWidths[5] - 6,
            align: "center",
          });
      }

      lineY = y + maxCellHeight;
      doc
        .save()
        .lineWidth(0.5)
        .strokeColor(BORDER_COLOR)
        .moveTo(tableX, lineY)
        .lineTo(tableX + tableW, lineY)
        .stroke()
        .restore();

      y += maxCellHeight;

      // If we're too close to bottom, break and create new page
      if (y > PAGE.h - M.b - 100) {
        break;
      }
    }

    workerIndex += rowsToShow;

    // Footer - use decimal notation for continuation pages (8.1, 8.2, etc.)
    const pageNumber =
      pagesCreated === 0
        ? startPageNumber
        : parseFloat((startPageNumber + pagesCreated * 0.1).toFixed(1));
    footer(doc, pageNumber, translations);
    pagesCreated++;

    // If we've displayed all data, break
    if (workerIndex >= workers.length) {
      break;
    }
  }

  return pagesCreated;
}

// PAGE 10 – placeholder
// PAGE 10 – 08. PREPARING FOR PRODUCTION
function page10(doc, dynamic, translations = {}) {
  // Blue bar heading
  let y = drawSectionBar(
    doc,
    M.t,
    "08. PREPARING FOR PRODUCTION",
    translations
  );
  y += 12;

  // Subheading: Review of the process (with translation)
  const reviewSubheading =
    translations["Review of the process"] || "Review of the process";
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(reviewSubheading, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 10;

  // Paragraphs (with translations - paragraph function handles translation internally)
  y = paragraph(
    doc,
    y,
    "Immediately after acceptance, the company conducts a process review of the project. In cases with design responsibility, a project review is also carried out.",
    { fontSize: 9 },
    translations
  );

  y = paragraph(
    doc,
    y,
    "The purpose of the review is to identify ambiguities and/or risky work performance, as well as environmental issues.",
    { fontSize: 9 },
    translations
  );

  y = paragraph(
    doc,
    y,
    "In cases where the company has agreements with subcontractors, the company ensures that they carry out a corresponding review.",
    { fontSize: 9 },
    translations
  );

  // Footer – this page shows "Page 9 of 26"
  footer(doc, 9, translations);
}

// PAGE 11 – 09. PROJECT MANAGEMENT SUPERVISION PLAN
// PAGE 11 – 09. PROJECT MANAGEMENT SUPERVISION PLAN
// This function now handles pagination and returns the number of pages created
async function page11(doc, dynamic, startPageNumber = 10, translations = {}) {
  // Get supervision checklist records
  const supervisionChecklist = dynamic.supervisionChecklist || [];

  // Helper function to format date
  const formatDate = (date) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleDateString("en-GB");
    } catch {
      return "";
    }
  };

  // Group records by checkDetails.section
  const unknownSectionText =
    translations["Unknown Section"] || "Unknown Section";
  const groupedBySection = {};
  supervisionChecklist.forEach((record) => {
    const section = record.checkDetails?.section || unknownSectionText;
    if (!groupedBySection[section]) {
      groupedBySection[section] = [];
    }
    groupedBySection[section].push(record);
  });

  // Flatten sections and records into rows for pagination
  const allRows = [];
  Object.keys(groupedBySection).forEach((sectionName) => {
    // Translate section name
    const translatedSectionName = translations[sectionName] || sectionName;
    allRows.push({ type: "section", name: translatedSectionName });
    groupedBySection[sectionName].forEach((record) => {
      const checkDetails = record.checkDetails || {};
      // Translate dynamic data values
      let what = checkDetails.what || "";
      let where = checkDetails.where || "";
      let when = checkDetails.when || "";
      if (what && typeof what === "string" && !isNumberOrDate(what)) {
        const trimmedWhat = what.trim();
        what = translations[what] || translations[trimmedWhat] || what;
      }
      if (where && typeof where === "string" && !isNumberOrDate(where)) {
        const trimmedWhere = where.trim();
        where = translations[where] || translations[trimmedWhere] || where;
      }
      if (when && typeof when === "string" && !isNumberOrDate(when)) {
        const trimmedWhen = when.trim();
        when = translations[when] || translations[trimmedWhen] || when;
      }
      allRows.push({
        type: "row",
        pos: checkDetails.pos || "",
        what: what,
        where: where,
        when: when,
        howMuch: checkDetails.howMuch || "100%",
        approvedDate: formatDate(record.approvedDate),
      });
    });
  });

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

  const rowHeight = 18;
  const headerHeight = rowHeight;
  const gapAfterSection = 6;
  const signatureSectionHeight = 80; // Space needed for signature section

  let rowIndex = 0;
  let pagesCreated = 0;

  // Process rows across multiple pages
  while (rowIndex < allRows.length || pagesCreated === 0) {
    if (pagesCreated > 0) {
      doc.addPage({ size: "A4", margin: 0 });
    }

    let y = M.t;

    // Blue bar heading (only on first page of section)
    if (pagesCreated === 0) {
      y = drawSectionBar(
        doc,
        M.t,
        "09. PROJECT MANAGEMENT SUPERVISION PLAN",
        translations
      );
      y += 10;
    } else {
      // On continuation pages, just add a small heading
      const continuedText =
        translations["09. PROJECT MANAGEMENT SUPERVISION PLAN (continued)"] ||
        "09. PROJECT MANAGEMENT SUPERVISION PLAN (continued)";
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("black")
        .text(continuedText, M.l, y, {
          width: CONTENT_W,
          align: "left",
        });
      y += 18;
    }

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

    // Draw header on first page or continuation pages (with translations)
    if (pagesCreated === 0 || rowIndex > 0) {
      const headers = ["ID.", "WHAT", "WHERE", "WHEN", "HOW MUCH", "PERFORMED"];
      const translatedHeaders = headers.map((h) => translations[h] || h);
      drawRow(translatedHeaders, true);
      y += 6;
    }

    // Calculate available space (reserve space for signature section on last page)
    // We'll determine if this is the last page after processing rows
    const availableHeight = PAGE.h - M.b - y - 50;

    // Draw rows until we run out of space or data
    while (rowIndex < allRows.length) {
      const item = allRows[rowIndex];

      if (item.type === "section") {
        // Check if we have space for section header
        const isLastRow = rowIndex === allRows.length - 1;
        const reservedForSignature = isLastRow ? signatureSectionHeight : 0;
        if (y + 20 > PAGE.h - M.b - reservedForSignature - 50) {
          break; // Need new page
        }

        // Section heading (already translated when building allRows)
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor("black")
          .text(item.name.toUpperCase(), tableX, y, {
            width: tableW,
            align: "left",
          });

        y = doc.y + 4;
        rowIndex++;
      } else if (item.type === "row") {
        // Check if we have space for this row (reserve space for signature if this is the last row)
        const isLastRow = rowIndex === allRows.length - 1;
        const reservedForSignature = isLastRow ? signatureSectionHeight : 0;
        const estimatedRowHeight = Math.max(
          rowHeight,
          measureRowHeight([
            item.pos,
            item.what,
            item.where,
            item.when,
            item.howMuch,
            item.approvedDate,
          ])
        );

        if (y + estimatedRowHeight > PAGE.h - M.b - reservedForSignature - 50) {
          break; // Need new page
        }

        drawRow([
          item.pos,
          item.what,
          item.where,
          item.when,
          item.howMuch,
          item.approvedDate,
        ]);

        rowIndex++;
      }
    }

    // Add signature section on the last page
    if (rowIndex >= allRows.length) {
      y += 16;

      // ---------- BOTTOM TEXT ----------
      const checkedByText =
        translations["The above is checked by:"] || "The above is checked by:";
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("black")
        .text(checkedByText, M.l, y, {
          width: CONTENT_W,
          align: "left",
        });

      y = doc.y + 10;

      // Get quality assurance signature
      const signature = dynamic.qualityAssuranceSignature;

      // NAME line (with translation)
      const nameLabel = translations["NAME"] || "NAME";
      doc.text(nameLabel, M.l, y, {
        width: 100,
        align: "left",
      });

      // Display name if available (translate if needed)
      if (signature && signature.name) {
        let name = signature.name;
        if (name && typeof name === "string" && !isNumberOrDate(name)) {
          const trimmedName = name.trim();
          name = translations[name] || translations[trimmedName] || name;
        }
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("black")
          .text(name, M.l + 50, y, {
            width: 150,
            align: "left",
          });
      }

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

      // SIGNATURE line (with translation)
      const signatureLabel = translations["SIGNATURE"] || "SIGNATURE";
      doc.text(signatureLabel, M.l, y, {
        width: 100,
        align: "left",
      });

      // Display signature image if available
      if (signature && signature.signature) {
        try {
          let signatureBuffer;
          if (typeof signature.signature === "string") {
            // Check if it's a data URI
            if (signature.signature.startsWith("data:image")) {
              const base64Match = signature.signature.match(
                /^data:image\/(\w+);base64,(.+)$/
              );
              if (base64Match) {
                signatureBuffer = Buffer.from(base64Match[2], "base64");
              }
            } else {
              // Assume it's raw base64
              signatureBuffer = Buffer.from(signature.signature, "base64");
            }
          }

          if (signatureBuffer) {
            doc.image(signatureBuffer, M.l + 50, y - 5, {
              fit: [150, 30],
              align: "left",
            });
          }
        } catch (error) {
          console.error("Error loading signature image:", error.message);
        }
      }

      lineY = y + 10;
      doc
        .save()
        .lineWidth(0.5)
        .strokeColor(BORDER_COLOR)
        .moveTo(M.l, lineY)
        .lineTo(M.l + 200, lineY)
        .stroke()
        .restore();
    }

    // Footer - use decimal notation for continuation pages (10.1, 10.2, etc.)
    const pageNumber =
      pagesCreated === 0
        ? startPageNumber
        : parseFloat((startPageNumber + pagesCreated * 0.1).toFixed(1));
    footer(doc, pageNumber, translations);
    pagesCreated++;

    // If we've displayed all data, break
    if (rowIndex >= allRows.length) {
      break;
    }
  }

  return pagesCreated;
}

// PAGE 12 – placeholder
// PAGE 12 – 10. DESCRIPTION OF THE CONTROL WORK
function page12(doc, dynamic, translations = {}) {
  // Blue bar heading
  let y = drawSectionBar(
    doc,
    M.t,
    "10. DESCRIPTION OF THE CONTROL WORK",
    translations
  );
  y += 10;

  // ---------- 10.1 CONTROL PLAN (TENDER CONTROL PLAN OR THE COMPANY'S OWN) ----------
  const section10_1Title =
    translations[
      "10.1 CONTROL PLAN (TENDER CONTROL PLAN OR THE COMPANY'S OWN)"
    ] || "10.1 CONTROL PLAN (TENDER CONTROL PLAN OR THE COMPANY'S OWN)";
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(section10_1Title, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "The process review in relation to a possible procurement control plan forms the basis for the preparation of the case's control plan, which provides an overall overview of the controls and documentation that apply to the contract.",
    { fontSize: 9 },
    translations
  );

  y = paragraph(
    doc,
    y,
    "If no supply control plan has been submitted before the price has been offered, the company's own control plan will form the basis for the company's control.",
    { fontSize: 9 },
    translations
  );

  y = paragraph(
    doc,
    y,
    "The control plan is submitted for the customer's approval at a potential project review meeting. If a project review meeting is not held with the construction management, the control plan will subsequently be sent together with the results of the company's process review for the client's approval.",
    { fontSize: 9 },
    translations
  );

  y += 6;

  // ---------- 10.2 QUALITY ASSURANCE OF THE PROJECT ----------
  const section10_2Title =
    translations["10.2 QUALITY ASSURANCE OF THE PROJECT"] ||
    "10.2 QUALITY ASSURANCE OF THE PROJECT";
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(section10_2Title, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "The inspection is carried out by the project manager or another person specifically appointed as the inspector for the work and who is familiar with our quality assurance system.",
    { fontSize: 9 },
    translations
  );

  y += 6;

  // ---------- 10.3 CHECKING DOCUMENTS ----------
  const section10_3Title =
    translations["10.3 CHECKING DOCUMENTS"] || "10.3 CHECKING DOCUMENTS";
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(section10_3Title, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "Revised drawings, construction meeting minutes, etc. are sent to the company's e-mail. It is assumed that all revised drawings are accompanied by a revised subscription list and that revisions to the drawings are clearly marked.",
    { fontSize: 9 },
    translations
  );

  y = paragraph(
    doc,
    y,
    "Quality assurance documents are presented at construction meetings.",
    { fontSize: 9 },
    translations
  );

  y += 6;

  // ---------- 10.4 INFORMATION FOR EMPLOYEES ----------
  const section10_4Title =
    translations["10.4 INFORMATION FOR EMPLOYEES"] ||
    "10.4 INFORMATION FOR EMPLOYEES";
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(section10_4Title, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "Before work begins, craftsmen and any apprentices are generally informed about the work at hand and in particular about difficult work processes. In addition, information is provided about the project's quality and environmental requirements.",
    { fontSize: 9 },
    translations
  );

  y += 6;

  // ---------- 10.5 IN-DEPTH CONTROL ----------
  const section10_5Title =
    translations["10.5 IN-DEPTH CONTROL"] || "10.5 IN-DEPTH CONTROL";
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(section10_5Title, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "When materials arrive at the construction site, it is checked that the delivered goods are in the correct quantity and quality according to the inspection plan. Factors of importance to the environment are included in the in-depth management, including the layout of the construction site. The incoming control must be documented.",
    { fontSize: 9 },
    translations
  );

  y += 6;

  // ---------- 10.6 PROCESS CONTROL ----------
  const section10_6Title =
    translations["10.6 PROCESS CONTROL"] || "10.6 PROCESS CONTROL";
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(section10_6Title, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "During the work, the inspections specified in the control plan are carried out. Deviations and their rectification are carried out in accordance with the agreement. Factors of importance to the environment are included in the process control. Process control is documented.",
    { fontSize: 9 },
    translations
  );

  y += 6;

  // ---------- 10.7 FINAL INSPECTION ----------
  const section10_7Title =
    translations["10.7 FINAL INSPECTION"] || "10.7 FINAL INSPECTION";
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(section10_7Title, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "When the work or certain parts of it are completed, the person responsible carries out a final inspection of the work. This final inspection is an internal activity, but evidence of it may be provided.",
    { fontSize: 9 },
    translations
  );

  y += 6;

  // ---------- 10.7 DOCUMENTATION ----------
  const section10_7DocTitle =
    translations["10.7 DOCUMENTATION"] || "10.7 DOCUMENTATION";
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("black")
    .text(section10_7DocTitle, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 4;

  y = paragraph(
    doc,
    y,
    "A copy of the documentation of the quality assurance carried out will be sent to the client or its advisers by agreement. All documents, including documentation of the agreed quality assurance, are stored for the current liability period.",
    { fontSize: 9 },
    translations
  );

  // Footer – this page is "Page 11 of 26" in the original
  footer(doc, 11, translations);
}

// PAGE 13 – placeholder
// PAGE 13 – 11. STANDARD FOR CONTROL PLAN
// PAGE 13 – 11. STANDARD FOR CONTROL PLAN
// This function now handles pagination and returns the number of pages created
async function page13(doc, dynamic, startPageNumber = 12, translations = {}) {
  // Get project and subjectMatterId
  const project = dynamic.project || {};
  const tasks = project.tasks || [];
  const subjectMatterId = dynamic.subjectMatterId;

  // Filter tasks by SubjectMatterId
  const filteredTasks = tasks.filter(
    (task) => task.SubjectMatterId === subjectMatterId
  );

  // Group tasks by Type
  const groupedByType = {};
  filteredTasks.forEach((task) => {
    const type = task.Type || "Unknown";
    if (!groupedByType[type]) {
      groupedByType[type] = [];
    }
    groupedByType[type].push(task);
  });

  // Sort each group by ControlId and assign sequential IDs
  const allRows = [];

  // Sort types: Receive -> Process -> Final
  const typeOrder = { receive: 1, process: 2, final: 3 };
  const sortedTypes = Object.keys(groupedByType).sort((a, b) => {
    const aOrder = typeOrder[a.toLowerCase()] || 999;
    const bOrder = typeOrder[b.toLowerCase()] || 999;
    return aOrder - bOrder;
  });

  sortedTypes.forEach((type) => {
    // Sort tasks within this type by ControlId
    const typeTasks = groupedByType[type].sort((a, b) => {
      const aControlId = a.ControlId || 0;
      const bControlId = b.ControlId || 0;
      return aControlId - bControlId;
    });

    // Add section header
    allRows.push({ type: "section", name: type });

    // Reset ID to 1 for each group
    let groupId = 1;

    // Add rows with sequential IDs starting from 1 for each group
    typeTasks.forEach((task) => {
      allRows.push({
        type: "row",
        id: groupId++,
        activity: task.Activity || task.activity || "",
        acceptanceCriteria:
          task["Acceptance Criteria"] ||
          task.AcceptanceCriteria ||
          task.acceptanceCriteria ||
          "",
        method: task.Method || task.method || "",
        time: task.Time || task.time || "",
        scope: task.Scope || task.scope || "",
      });
    });
  });

  const tableX = M.l;
  const tableW = CONTENT_W;

  // 6 columns: ID | ACTIVITY | ACCEPTANCE CRITERIA | METHOD | TIME | SCOPE
  const colPercents = [0.06, 0.25, 0.22, 0.18, 0.14, 0.15];
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

  const rowHeight = 18;
  const headerHeight = rowHeight;
  const gapAfterSection = 6;
  const headingHeight = 30; // Blue bar + spacing

  let rowIndex = 0;
  let pagesCreated = 0;

  // Process rows across multiple pages
  while (rowIndex < allRows.length || pagesCreated === 0) {
    if (pagesCreated > 0) {
      doc.addPage({ size: "A4", margin: 0 });
    }

    let y = M.t;

    // Blue bar heading (only on first page of section)
    if (pagesCreated === 0) {
      y = drawSectionBar(
        doc,
        M.t,
        "11. STANDARD FOR CONTROL PLAN",
        translations
      );
      y += 10;
    } else {
      // On continuation pages, just add a small heading
      const continuedTitle =
        translations["11. STANDARD FOR CONTROL PLAN (continued)"] ||
        "11. STANDARD FOR CONTROL PLAN (continued)";
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("black")
        .text(continuedTitle, M.l, y, {
          width: CONTENT_W,
          align: "left",
        });
      y += 18;
    }

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

    // Draw header on first page or continuation pages
    if (pagesCreated === 0 || rowIndex > 0) {
      const headerId = translations["ID."] || "ID.";
      const headerActivity = translations["ACTIVITY"] || "ACTIVITY";
      const headerAcceptanceCriteria =
        translations["ACCEPTANCE CRITERIA"] || "ACCEPTANCE CRITERIA";
      const headerMethod = translations["METHOD"] || "METHOD";
      const headerTime = translations["TIME"] || "TIME";
      const headerScope = translations["SCOPE"] || "SCOPE";
      drawRow(
        [
          headerId,
          headerActivity,
          headerAcceptanceCriteria,
          headerMethod,
          headerTime,
          headerScope,
        ],
        true
      );
      y += 6;
    }

    // Draw rows until we run out of space or data
    while (rowIndex < allRows.length) {
      const item = allRows[rowIndex];

      if (item.type === "section") {
        // Check if we have space for section header
        if (y + 20 > PAGE.h - M.b - 50) {
          break; // Need new page
        }

        // Section heading - format as "TYPE CONTROL" (e.g., "RECEIVE CONTROL")
        const typeName = item.name.toUpperCase();
        const controlKey = `${typeName} CONTROL`;
        const sectionTitle = translations[controlKey] || controlKey;
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor("black")
          .text(sectionTitle, tableX, y, {
            width: tableW,
            align: "left",
          });

        y = doc.y + 4;
        rowIndex++;
      } else if (item.type === "row") {
        // Check if we have space for this row
        const estimatedRowHeight = Math.max(
          rowHeight,
          measureRowHeight([
            item.id.toString(),
            item.activity,
            item.acceptanceCriteria,
            item.method,
            item.time,
            item.scope,
          ])
        );

        if (y + estimatedRowHeight > PAGE.h - M.b - 50) {
          break; // Need new page
        }

        // Translate dynamic data
        const translatedActivity = translations[item.activity] || item.activity;
        const translatedAcceptanceCriteria =
          translations[item.acceptanceCriteria] || item.acceptanceCriteria;
        const translatedMethod = translations[item.method] || item.method;
        const translatedTime = translations[item.time] || item.time;
        const translatedScope = translations[item.scope] || item.scope;

        drawRow([
          item.id.toString(),
          translatedActivity,
          translatedAcceptanceCriteria,
          translatedMethod,
          translatedTime,
          translatedScope,
        ]);

        rowIndex++;
      }
    }

    // Footer - use decimal notation for continuation pages (12.1, 12.2, etc.)
    const pageNumber =
      pagesCreated === 0
        ? startPageNumber
        : parseFloat((startPageNumber + pagesCreated * 0.1).toFixed(1));
    footer(doc, pageNumber, translations);
    pagesCreated++;

    // If we've displayed all data, break
    if (rowIndex >= allRows.length) {
      break;
    }
  }

  return pagesCreated;
}

// PAGE 14 – placeholder
// PAGE 14 – 12. PLAN FOR CONTROL OF TENDERS / 13. SCHEDULE
function page14(doc, dynamic, translations = {}) {
  // ----- 12. PLAN FOR CONTROL OF TENDERS -----
  let y = drawSectionBar(
    doc,
    M.t,
    "12. PLAN FOR CONTROL OF TENDERS",
    translations
  );
  y += 14;

  // Intro line
  y = paragraph(
    doc,
    y,
    "Here is the tender control plan, if it is found in the project material.",
    { fontSize: 9 },
    translations
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

  items.forEach((item) => {
    const centerY = y + 5; // align circle with text line
    const translatedText = translations[item] || item;

    // Draw filled colored circle (like the PDF)
    doc
      .save()
      .fillColor(BORDER_COLOR)
      .circle(circleCenterX, centerY, circleRadius)
      .fill()
      .restore();

    // Label text
    doc.text(translatedText, textX, y, {
      width: textWidth,
      align: "left",
    });

    y += 18;
  });

  // ----- 13. SCHEDULE -----
  y += 24;

  y = drawSectionBar(doc, y, "13. SCHEDULE", translations);

  // (No body content under 13. SCHEDULE in the template)

  // Footer – this is "Page 13 of 26" in the original
  footer(doc, 13, translations);
}

// Helper function to fetch image from URL
async function fetchImageBuffer(url) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(response.data, "binary");
  } catch (error) {
    console.error("Error fetching image:", url, error.message);
    return null;
  }
}

// PAGE 15 – 14. RECEIVE CONTROL
// This function now handles pagination and returns the number of pages created
async function page15(doc, dynamic, startPageNumber = 14, translations = {}) {
  // Get project and subjectMatterId
  const project = dynamic.project || {};
  const tasks = project.tasks || [];
  const subjectMatterId = dynamic.subjectMatterId;

  // Filter tasks by SubjectMatterId and Type "Receive"
  let receiveTasks = tasks.filter(
    (task) =>
      task.SubjectMatterId === subjectMatterId &&
      (task.Type === "Receive" || task.Type === "receive")
  );

  // Sort tasks by ControlId in ascending order
  receiveTasks.sort((a, b) => {
    const controlIdA = a.ControlId || 0;
    const controlIdB = b.ControlId || 0;
    return controlIdA - controlIdB;
  });

  console.log("Page15 - Receive tasks found:", receiveTasks.length);
  console.log("Page15 - SubjectMatterId:", subjectMatterId);

  // Assign KP.X IDs to each task based on sorted order
  const taskIdMap = new Map(); // Map to store task -> KP.X ID
  receiveTasks.forEach((task, index) => {
    const kpId = `KP.${index + 1}`;
    taskIdMap.set(task, kpId);
  });

  // Flatten all taskEntries from all Receive tasks, keeping track of parent task
  const allTaskEntries = [];
  receiveTasks.forEach((task) => {
    if (task.taskEntries && Array.isArray(task.taskEntries)) {
      const taskKpId = taskIdMap.get(task);
      task.taskEntries.forEach((entry) => {
        allTaskEntries.push({
          taskEntry: entry,
          kpId: taskKpId,
          parentTask: task,
        });
      });
    }
  });

  console.log("Page15 - Total taskEntries:", allTaskEntries.length);

  // If no task entries, create one empty page
  if (allTaskEntries.length === 0) {
    doc.addPage({ size: "A4", margin: 0 });
    let y = drawSectionBar(doc, M.t, "14. RECEIVE CONTROL", translations);
    y += 10;
    footer(doc, startPageNumber, translations);
    return 1;
  }

  // Create pages for each taskEntry with nested pagination for markPictureObjects
  let pagesCreated = 0;
  for (let i = 0; i < allTaskEntries.length; i++) {
    const { taskEntry, kpId } = allTaskEntries[i];

    // Calculate base page number for this taskEntry
    const basePageNumber =
      pagesCreated === 0
        ? startPageNumber
        : parseFloat((startPageNumber + pagesCreated * 0.1).toFixed(1));

    // Render the taskEntry with nested pagination for markPictureObjects
    const taskEntryPages = await renderTaskEntryPageWithPagination(
      doc,
      dynamic,
      taskEntry,
      "Receive",
      "14. RECEIVE CONTROL",
      basePageNumber,
      kpId,
      translations
    );

    pagesCreated += taskEntryPages;
  }

  return pagesCreated;
}

// Helper function to render a task entry with pagination for markPictureObjects
// Returns the number of pages created
async function renderTaskEntryPageWithPagination(
  doc,
  dynamic,
  taskEntry,
  pageType,
  pageTitle,
  basePageNumber,
  kpId,
  translations = {}
) {
  // Get markPictureObjects array
  const markPictureObjects =
    taskEntry.markPictureObjects && Array.isArray(taskEntry.markPictureObjects)
      ? taskEntry.markPictureObjects
      : [];

  // Render the main page (with drawing and first set of KP blocks)
  let continuationPageIndex = 0;
  let markPictureIndex = 0;
  let totalPagesCreated = 0;

  // Main page (always created)
  doc.addPage({ size: "A4", margin: 0 });
  const mainPageNumber = basePageNumber;

  // Calculate how many KP blocks can fit on the main page after the drawing
  const kpBlocksPerPage = 4; // 2x2 grid = 4 per page
  const blocksToShowOnMainPage = Math.min(
    markPictureObjects.length,
    kpBlocksPerPage
  );

  await renderTaskEntryMainPage(
    doc,
    dynamic,
    taskEntry,
    pageType,
    pageTitle,
    mainPageNumber,
    markPictureObjects,
    markPictureIndex,
    blocksToShowOnMainPage,
    kpId,
    translations
  );
  totalPagesCreated++;
  markPictureIndex += blocksToShowOnMainPage;

  // If there are more markPictureObjects, create continuation pages
  while (markPictureIndex < markPictureObjects.length) {
    continuationPageIndex++;
    doc.addPage({ size: "A4", margin: 0 });

    // Calculate nested page number: basePageNumber.1, basePageNumber.1.1, basePageNumber.1.2, etc.
    let continuationPageNumber;
    if (continuationPageIndex === 1) {
      continuationPageNumber = parseFloat((basePageNumber + 0.1).toFixed(1));
    } else {
      // For nested continuation: 15.1.1, 15.1.2, etc.
      const firstContinuation = parseFloat((basePageNumber + 0.1).toFixed(1));
      continuationPageNumber = parseFloat(
        (firstContinuation + (continuationPageIndex - 1) * 0.01).toFixed(2)
      );
    }

    const blocksToShow = Math.min(
      markPictureObjects.length - markPictureIndex,
      kpBlocksPerPage
    );
    await renderTaskEntryContinuationPage(
      doc,
      dynamic,
      taskEntry,
      pageType,
      pageTitle,
      continuationPageNumber,
      markPictureObjects,
      markPictureIndex,
      blocksToShow,
      kpId,
      translations
    );
    totalPagesCreated++;
    markPictureIndex += blocksToShow;
  }

  return totalPagesCreated;
}

// Helper function to render the main task entry page (with drawing)
async function renderTaskEntryMainPage(
  doc,
  dynamic,
  taskEntry,
  pageType,
  pageTitle,
  pageNumber,
  markPictureObjects,
  startMarkPictureIndex,
  blocksToShow,
  kpId,
  translations = {}
) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, pageTitle, translations);
  y += 10;

  // Subheading based on pageType
  const controlKey = pageType.toUpperCase() + " CONTROL";
  const titleText = translations[controlKey] || controlKey;

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
      .fillColor(HEADING_COLOR)
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

  // ---- top meta block (ID, TYPE, ACCEPTANCE, DATE) ----
  const controlText = translations["CONTROL"] || "CONTROL";
  const idValue = kpId
    ? `${kpId} ${controlText}`
    : dynamic.receiveId || `KP?. ${controlText}`;
  const idLabel = translations["ID"] || "ID";
  keyValueRow(idLabel, idValue);
  // TYPE is dynamic based on pageType (Receive, Process, or Final)
  const translatedPageType = translations[pageType] || pageType;
  const typeLabel = translations["TYPE"] || "TYPE";
  keyValueRow(typeLabel, translatedPageType);

  // Format date from taskEntry.submittedAt
  const formatDate = (date) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleDateString("en-GB");
    } catch (error) {
      return "";
    }
  };

  // ACCEPTANCE field - value is static "ENDORSEMENT"
  const endorsementText = translations["ENDORSEMENT"] || "ENDORSEMENT";
  const acceptanceLabel = translations["ACCEPTANCE"] || "ACCEPTANCE";
  keyValueRow(acceptanceLabel, endorsementText);

  // DATE uses taskEntry.submittedAt
  const dateLabel = translations["DATE"] || "DATE";
  keyValueRow(
    dateLabel,
    taskEntry?.submittedAt ? formatDate(taskEntry.submittedAt) : ""
  );

  // ---- DRAWING: label row + proper rectangle for the drawing ----
  const keyWidth = 160;

  // Label row "DRAWING" with value "LOCALIZATION OF CONTROL"
  const drawingLabel = translations["DRAWING"] || "DRAWING";
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(HEADING_COLOR)
    .text(drawingLabel, M.l, y, {
      width: keyWidth,
      align: "left",
    });

  // Value "LOCALIZATION OF CONTROL"
  const localizationText =
    translations["LOCALIZATION OF CONTROL"] || "LOCALIZATION OF CONTROL";
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text(localizationText, M.l + keyWidth + 6, y, {
      width: CONTENT_W - keyWidth - 6,
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

  // Image starts immediately after underline - minimal spacing
  y = lineY + 0.5;

  // Load and display image from annotatedPdfs[0].s3Location
  // Make the image larger - scale it up
  const scaleFactor = 2.0;
  const baseHeight = 220;
  const scaledImageHeight = baseHeight * scaleFactor; // 440px
  const scaledImageWidth = CONTENT_W; // Use full content width, not scaled

  let actualImageHeight = 0;

  if (
    taskEntry.annotatedPdfs &&
    Array.isArray(taskEntry.annotatedPdfs) &&
    taskEntry.annotatedPdfs.length > 0 &&
    taskEntry.annotatedPdfs[0].s3Location
  ) {
    try {
      const imageBuffer = await fetchImageBuffer(
        taskEntry.annotatedPdfs[0].s3Location
      );
      if (imageBuffer) {
        // Position image at left margin, starting at current y
        const imageX = M.l;
        const imageY = y;

        // Render image using fit - this will maintain aspect ratio
        const imageInfo = doc.image(imageBuffer, imageX, imageY, {
          fit: [scaledImageWidth, scaledImageHeight],
          align: "left",
          valign: "top",
        });

        // Update y position - use a more conservative height calculation
        // PDFKit's imageInfo.height might not be accurate, so we'll use a smaller value
        // Use the baseHeight (220) instead of scaled height to avoid extra space
        // This ensures we don't leave too much space below the image
        const actualHeight = baseHeight; // Use base height, not scaled

        // Position y immediately after image - use conservative height
        y = imageY + actualHeight;
      }
    } catch (error) {
      console.error("Error loading drawing image:", error.message);
    }
  }

  // No spacing after the main drawing

  // ---- remaining meta rows ----
  const buildingPartValue =
    dynamic.receiveBuildingPart ||
    translations["From project setup"] ||
    "From project setup";
  const buildingPartLabel = translations["BUILDING PART"] || "BUILDING PART";
  keyValueRow(buildingPartLabel, buildingPartValue);

  y += 10;

  // Render KP blocks dynamically based on markPictureObjects
  await renderKPBlocks(
    doc,
    markPictureObjects,
    startMarkPictureIndex,
    y,
    pageNumber,
    blocksToShow,
    translations
  );
}

// Helper function to render continuation page (only KP blocks, no drawing)
async function renderTaskEntryContinuationPage(
  doc,
  dynamic,
  taskEntry,
  pageType,
  pageTitle,
  pageNumber,
  markPictureObjects,
  startMarkPictureIndex,
  blocksToShow,
  kpId,
  translations = {}
) {
  // Blue bar heading
  const continuedTitle =
    translations[pageTitle + " (continued)"] || pageTitle + " (continued)";
  let y = drawSectionBar(doc, M.t, continuedTitle, translations);
  y += 10;

  // Subheading based on pageType
  const controlKey = pageType.toUpperCase() + " CONTROL";
  const titleText = translations[controlKey] || controlKey;

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
  y += 10;

  // Render KP blocks dynamically based on markPictureObjects
  await renderKPBlocks(
    doc,
    markPictureObjects,
    startMarkPictureIndex,
    y,
    pageNumber,
    blocksToShow
  );
}

// Helper function to render KP blocks in 2x2 grid with pagination
async function renderKPBlocks(
  doc,
  markPictureObjects,
  startIndex,
  startY,
  pageNumber,
  blocksToShow,
  translations = {}
) {
  const gapX = 20;
  const gapY = 24;
  const boxWidth = (CONTENT_W - gapX) / 2;
  const kpBlockHeight = 150; // fixed height per KP block

  const leftX = M.l;
  const rightX = M.l + boxWidth + gapX;

  let y = startY;

  async function drawKPBlock(x, yTop, label, markPictureIndex) {
    // 1) "KP.X unique no." + underline
    const uniqueNoText = translations["unique no."] || "unique no.";
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(HEADING_COLOR)
      .text(label + " " + uniqueNoText, x, yTop, {
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
    const defaultComment =
      translations["Comment on Picture from registration"] ||
      "Comment on Picture from registration";
    const rawCommentText =
      markPictureObjects[markPictureIndex]?.description || defaultComment;
    const commentText = translations[rawCommentText] || rawCommentText;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(commentText, x, commentY, {
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

    // Load and display image from markPictureObjects if available
    if (
      markPictureObjects[markPictureIndex] &&
      markPictureObjects[markPictureIndex].s3Location
    ) {
      try {
        const imageBuffer = await fetchImageBuffer(
          markPictureObjects[markPictureIndex].s3Location
        );
        if (imageBuffer) {
          doc.image(imageBuffer, x + 3, picY + 3, {
            fit: [boxWidth - 6, picHeight - 6],
            align: "center",
            valign: "center",
          });
        }
      } catch (error) {
        console.error("Error loading mark picture:", error.message);
      }
    }

    // 4) Picture caption
    const captionY = picY + picHeight + 4;
    const pictureCaption =
      translations["Picture for registration"] || "Picture for registration";
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(pictureCaption, x + 5, captionY, {
        width: boxWidth - 10,
        align: "center",
      });
  }

  // Render blocks in 2x2 grid
  for (let i = 0; i < blocksToShow; i++) {
    const markPictureIndex = startIndex + i;
    const row = Math.floor(i / 2); // 0 for first row, 1 for second row
    const col = i % 2; // 0 for left, 1 for right

    const x = col === 0 ? leftX : rightX;
    const yTop = row === 0 ? y : y + kpBlockHeight + gapY;
    const label = `KP.${markPictureIndex + 1}`; // Simple increment: KP.1, KP.2, KP.3, etc.

    await drawKPBlock(x, yTop, label, markPictureIndex);
  }

  // Footer
  footer(doc, pageNumber, translations);
}

// PAGE 16 – 15. PROCESS CONTROL
// This function now handles pagination and returns the number of pages created
async function page16(doc, dynamic, startPageNumber = 15, translations = {}) {
  // Get project and subjectMatterId
  const project = dynamic.project || {};
  const tasks = project.tasks || [];
  const subjectMatterId = dynamic.subjectMatterId;

  // Filter tasks by SubjectMatterId and Type "Process"
  let processTasks = tasks.filter(
    (task) =>
      task.SubjectMatterId === subjectMatterId &&
      (task.Type === "Process" || task.Type === "process")
  );

  // Sort tasks by ControlId in ascending order
  processTasks.sort((a, b) => {
    const controlIdA = a.ControlId || 0;
    const controlIdB = b.ControlId || 0;
    return controlIdA - controlIdB;
  });

  console.log("Page16 - Process tasks found:", processTasks.length);
  console.log("Page16 - SubjectMatterId:", subjectMatterId);

  // Assign KP.X IDs to each task based on sorted order
  const taskIdMap = new Map(); // Map to store task -> KP.X ID
  processTasks.forEach((task, index) => {
    const kpId = `KP.${index + 1}`;
    taskIdMap.set(task, kpId);
  });

  // Flatten all taskEntries from all Process tasks, keeping track of parent task
  const allTaskEntries = [];
  processTasks.forEach((task) => {
    if (task.taskEntries && Array.isArray(task.taskEntries)) {
      const taskKpId = taskIdMap.get(task);
      task.taskEntries.forEach((entry) => {
        allTaskEntries.push({
          taskEntry: entry,
          kpId: taskKpId,
          parentTask: task,
        });
      });
    }
  });

  console.log("Page16 - Total taskEntries:", allTaskEntries.length);

  // If no task entries, create one empty page
  if (allTaskEntries.length === 0) {
    doc.addPage({ size: "A4", margin: 0 });
    const pageTitle =
      translations["15. PROCESS CONTROL"] || "15. PROCESS CONTROL";
    let y = drawSectionBar(doc, M.t, pageTitle, translations);
    y += 10;
    footer(doc, startPageNumber, translations);
    return 1;
  }

  // Create pages for each taskEntry with nested pagination for markPictureObjects
  let pagesCreated = 0;
  for (let i = 0; i < allTaskEntries.length; i++) {
    const { taskEntry, kpId } = allTaskEntries[i];

    // Calculate base page number for this taskEntry
    const basePageNumber =
      pagesCreated === 0
        ? startPageNumber
        : parseFloat((startPageNumber + pagesCreated * 0.1).toFixed(1));

    // Render the taskEntry with nested pagination for markPictureObjects
    const pageTitle =
      translations["15. PROCESS CONTROL"] || "15. PROCESS CONTROL";
    const taskEntryPages = await renderTaskEntryPageWithPagination(
      doc,
      dynamic,
      taskEntry,
      "Process",
      pageTitle,
      basePageNumber,
      kpId,
      translations
    );

    pagesCreated += taskEntryPages;
  }

  return pagesCreated;
}

// OLD PAGE 16 – placeholder (keeping for reference, will be removed)
function page16_old(doc, dynamic) {
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
      .fillColor(HEADING_COLOR)
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

    // Label row "DRAWING" with value "LOCALIZATION OF CONTROL"
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(HEADING_COLOR)
      .text("DRAWING", M.l, y, {
        width: keyWidth,
        align: "left",
      });

    // Value "LOCALIZATION OF CONTROL"
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text("LOCALIZATION OF CONTROL", M.l + keyWidth + 6, y, {
        width: CONTENT_W - keyWidth - 6,
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

// PAGE 17 – 16. FINAL CONTROL
// This function now handles pagination and returns the number of pages created
async function page17(doc, dynamic, startPageNumber = 16, translations = {}) {
  // Get project and subjectMatterId
  const project = dynamic.project || {};
  const tasks = project.tasks || [];
  const subjectMatterId = dynamic.subjectMatterId;

  // Filter tasks by SubjectMatterId and Type "Final"
  let finalTasks = tasks.filter(
    (task) =>
      task.SubjectMatterId === subjectMatterId &&
      (task.Type === "Final" || task.Type === "final")
  );

  // Sort tasks by ControlId in ascending order
  finalTasks.sort((a, b) => {
    const controlIdA = a.ControlId || 0;
    const controlIdB = b.ControlId || 0;
    return controlIdA - controlIdB;
  });

  console.log("Page17 - Final tasks found:", finalTasks.length);
  console.log("Page17 - SubjectMatterId:", subjectMatterId);

  // Assign KP.X IDs to each task based on sorted order
  const taskIdMap = new Map(); // Map to store task -> KP.X ID
  finalTasks.forEach((task, index) => {
    const kpId = `KP.${index + 1}`;
    taskIdMap.set(task, kpId);
  });

  // Flatten all taskEntries from all Final tasks, keeping track of parent task
  const allTaskEntries = [];
  finalTasks.forEach((task) => {
    if (task.taskEntries && Array.isArray(task.taskEntries)) {
      const taskKpId = taskIdMap.get(task);
      task.taskEntries.forEach((entry) => {
        allTaskEntries.push({
          taskEntry: entry,
          kpId: taskKpId,
          parentTask: task,
        });
      });
    }
  });

  console.log("Page17 - Total taskEntries:", allTaskEntries.length);

  // If no task entries, create one empty page
  if (allTaskEntries.length === 0) {
    doc.addPage({ size: "A4", margin: 0 });
    const pageTitle = translations["16. FINAL CONTROL"] || "16. FINAL CONTROL";
    let y = drawSectionBar(doc, M.t, pageTitle, translations);
    y += 10;
    footer(doc, startPageNumber, translations);
    return 1;
  }

  // Create pages for each taskEntry with nested pagination for markPictureObjects
  let pagesCreated = 0;
  for (let i = 0; i < allTaskEntries.length; i++) {
    const { taskEntry, kpId } = allTaskEntries[i];

    // Calculate base page number for this taskEntry
    const basePageNumber =
      pagesCreated === 0
        ? startPageNumber
        : parseFloat((startPageNumber + pagesCreated * 0.1).toFixed(1));

    // Render the taskEntry with nested pagination for markPictureObjects
    const pageTitle = translations["16. FINAL CONTROL"] || "16. FINAL CONTROL";
    const taskEntryPages = await renderTaskEntryPageWithPagination(
      doc,
      dynamic,
      taskEntry,
      "Final",
      pageTitle,
      basePageNumber,
      kpId,
      translations
    );

    pagesCreated += taskEntryPages;
  }

  return pagesCreated;
}

// OLD PAGE 17 – placeholder (keeping for reference, will be removed)
function page17_old(doc, dynamic) {
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
      .fillColor(HEADING_COLOR)
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

    // Label row "DRAWING" with value "LOCALIZATION OF CONTROL"
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(HEADING_COLOR)
      .text("DRAWING", M.l, y, {
        width: keyWidth,
        align: "left",
      });

    // Value "LOCALIZATION OF CONTROL"
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text("LOCALIZATION OF CONTROL", M.l + keyWidth + 6, y, {
        width: CONTENT_W - keyWidth - 6,
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

// PAGE 18 – 17. DEVIATIONS
// This function now handles pagination and returns the number of pages created
async function page18(doc, dynamic, startPageNumber = 17, translations = {}) {
  // Check if database is connected
  if (!db) {
    console.error("Database not connected for page18");
    doc.addPage({ size: "A4", margin: 0 });
    const pageTitle = translations["17. DEVIATIONS"] || "17. DEVIATIONS";
    let y = drawSectionBar(doc, M.t, pageTitle, translations);
    y += 10;
    footer(doc, startPageNumber, translations);
    return 1;
  }

  // Get projectId and subjectMatterId from dynamic
  const projectId = dynamic.projectId;
  const subjectMatterId = dynamic.subjectMatterId;

  if (!projectId || !subjectMatterId) {
    console.error("Missing projectId or subjectMatterId for page18");
    doc.addPage({ size: "A4", margin: 0 });
    const pageTitle = translations["17. DEVIATIONS"] || "17. DEVIATIONS";
    let y = drawSectionBar(doc, M.t, pageTitle, translations);
    y += 10;
    footer(doc, startPageNumber, translations);
    return 1;
  }

  // Query deviations collection
  // Match projectId in projectsId array, subjectMatterId in profession.SubjectMatterId, and type = "Quality Assurance"
  // Handle both ObjectId and string formats
  let projectObjectId;
  try {
    projectObjectId = new ObjectId(projectId);
  } catch (error) {
    projectObjectId = projectId;
  }

  const query = {
    projectsId: { $in: [projectObjectId, projectId] },
    "profession.SubjectMatterId": subjectMatterId,
    type: "Quality Assurance",
  };

  console.log("Page18 - Querying deviations with:", JSON.stringify(query));
  const deviations = await db.collection("deviations").find(query).toArray();
  console.log("Page18 - Found deviations:", deviations.length);

  // If no deviations, create one empty page
  if (deviations.length === 0) {
    doc.addPage({ size: "A4", margin: 0 });
    const pageTitle = translations["17. DEVIATIONS"] || "17. DEVIATIONS";
    let y = drawSectionBar(doc, M.t, pageTitle, translations);
    y += 10;
    footer(doc, startPageNumber, translations);
    return 1;
  }

  // Create pages for each deviation record with pagination for markPictures
  let pagesCreated = 0;
  for (let i = 0; i < deviations.length; i++) {
    const deviation = deviations[i];

    // Calculate base page number for this deviation: 17.1, 17.2, 17.3, etc.
    const basePageNumber =
      pagesCreated === 0
        ? startPageNumber
        : parseFloat((startPageNumber + pagesCreated * 0.1).toFixed(1));

    // Render the deviation with nested pagination for markPictures
    const deviationPages = await renderDeviationPageWithPagination(
      doc,
      dynamic,
      deviation,
      basePageNumber,
      subjectMatterId,
      i + 1,
      translations
    );

    pagesCreated += deviationPages;
  }

  return pagesCreated;
}

// Helper function to render deviation with pagination for markPictures
// Returns the number of pages created
async function renderDeviationPageWithPagination(
  doc,
  dynamic,
  deviation,
  basePageNumber,
  subjectMatterId,
  recordIndex,
  translations = {}
) {
  const markPictures = deviation.markPictures || [];
  const markPictureDescriptions = deviation.markPictureDescriptions || [];

  // Main page (always created) - shows header, meta info, drawing, and first set of markPictures
  doc.addPage({ size: "A4", margin: 0 });
  // Main page number: 17.1, 17.2, 17.3, etc.
  const mainPageNumber = parseFloat((basePageNumber + 0.1).toFixed(1));

  // Calculate how many KP blocks can fit on the main page after the drawing
  const kpBlocksPerPage = 4; // 2x2 grid = 4 per page
  const blocksToShowOnMainPage = Math.min(markPictures.length, kpBlocksPerPage);

  await renderDeviationMainPage(
    doc,
    dynamic,
    deviation,
    mainPageNumber,
    subjectMatterId,
    recordIndex,
    markPictures,
    markPictureDescriptions,
    0,
    blocksToShowOnMainPage,
    translations
  );

  let totalPagesCreated = 1;
  let markPictureIndex = blocksToShowOnMainPage;

  // If there are more markPictures, create continuation pages
  let continuationPageIndex = 0;
  while (markPictureIndex < markPictures.length) {
    continuationPageIndex++;
    doc.addPage({ size: "A4", margin: 0 });

    // Calculate nested page number: 17.1.1, 17.1.2, 17.2.1, 17.2.2, etc.
    // Format: basePageNumber.recordIndex.continuationIndex
    // Example: 17.1.1, 17.1.2, 17.2.1, 17.2.2
    let continuationPageNumber;
    if (continuationPageIndex === 1) {
      // First continuation: 17.1.1, 17.2.1, etc.
      continuationPageNumber = parseFloat((mainPageNumber + 0.01).toFixed(2));
    } else {
      // Subsequent continuations: 17.1.2, 17.1.3, etc.
      const firstContinuation = parseFloat((mainPageNumber + 0.01).toFixed(2));
      continuationPageNumber = parseFloat(
        (firstContinuation + (continuationPageIndex - 1) * 0.01).toFixed(2)
      );
    }

    const blocksToShow = Math.min(
      markPictures.length - markPictureIndex,
      kpBlocksPerPage
    );

    await renderDeviationContinuationPage(
      doc,
      continuationPageNumber,
      markPictures,
      markPictureDescriptions,
      markPictureIndex,
      blocksToShow,
      translations
    );

    totalPagesCreated++;
    markPictureIndex += blocksToShow;
  }

  return totalPagesCreated;
}

// Helper function to render the main deviation page (with drawing and first set of markPictures)
async function renderDeviationMainPage(
  doc,
  dynamic,
  deviation,
  pageNumber,
  subjectMatterId,
  recordIndex,
  markPictures,
  markPictureDescriptions,
  startMarkPictureIndex,
  blocksToShow,
  translations = {}
) {
  // Blue bar heading
  const pageTitle = translations["17. DEVIATIONS"] || "17. DEVIATIONS";
  let y = drawSectionBar(doc, M.t, pageTitle, translations);
  y += 10;

  // Subheading: DEVIATIONS (left) + colored circle (right)
  const titleText = translations["DEVIATIONS"] || "DEVIATIONS";

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
    const v = value || "";
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

  // Format date from deviation.submittedDate
  const formatDate = (date) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleDateString("en-GB");
    } catch (error) {
      return "";
    }
  };

  // ---- top meta block (ID, TYPE, ACCEPTANCE, DATE) ----
  // ID: KP.{subjectMatterId}.{recordIndex}
  const deviationId = `KP.${subjectMatterId}.${recordIndex}`;
  const idLabel = translations["ID"] || "ID";
  keyValueRow(idLabel, deviationId);

  // TYPE: "Deviations"
  const typeLabel = translations["TYPE"] || "TYPE";
  const deviationsText = translations["Deviations"] || "Deviations";
  keyValueRow(typeLabel, deviationsText);

  // ACCEPTANCE: static "ENDORSEMENT"
  const acceptanceLabel = translations["ACCEPTANCE"] || "ACCEPTANCE";
  const endorsementText = translations["ENDORSEMENT"] || "ENDORSEMENT";
  keyValueRow(acceptanceLabel, endorsementText);

  // DATE: from deviation.submittedDate
  const dateLabel = translations["DATE"] || "DATE";
  keyValueRow(
    dateLabel,
    deviation.submittedDate ? formatDate(deviation.submittedDate) : ""
  );

  // ---- DRAWING: label row + image (no border box) ----
  const keyWidth = 160;

  // Label row "DRAWING" with value "LOCALIZATION OF CONTROL"
  const drawingLabel = translations["DRAWING"] || "DRAWING";
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(HEADING_COLOR)
    .text(drawingLabel, M.l, y, {
      width: keyWidth,
      align: "left",
    });

  // Value "LOCALIZATION OF CONTROL"
  const localizationText =
    translations["LOCALIZATION OF CONTROL"] || "LOCALIZATION OF CONTROL";
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text(localizationText, M.l + keyWidth + 6, y, {
      width: CONTENT_W - keyWidth - 6,
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

  // Image starts immediately after underline - no border box
  y = lineY + 0.5;

  // Load and display image from annotatedPdfs[0].s3Location (network image)
  const scaleFactor = 2.0;
  const baseHeight = 220;
  const scaledImageHeight = baseHeight * scaleFactor; // 440px
  const scaledImageWidth = CONTENT_W;

  if (
    deviation.annotatedPdfs &&
    Array.isArray(deviation.annotatedPdfs) &&
    deviation.annotatedPdfs.length > 0 &&
    deviation.annotatedPdfs[0].s3Location
  ) {
    try {
      const imageBuffer = await fetchImageBuffer(
        deviation.annotatedPdfs[0].s3Location
      );
      if (imageBuffer) {
        const imageX = M.l;
        const imageY = y;

        const imageInfo = doc.image(imageBuffer, imageX, imageY, {
          fit: [scaledImageWidth, scaledImageHeight],
          align: "left",
          valign: "top",
        });

        const actualHeight = baseHeight;
        y = imageY + actualHeight;
      }
    } catch (error) {
      console.error("Error loading drawing image:", error.message);
    }
  }

  y += 10;

  // Render markPictures dynamically based on blocksToShow
  if (blocksToShow > 0) {
    await renderDeviationKPBlocks(
      doc,
      markPictures,
      markPictureDescriptions,
      startMarkPictureIndex,
      y,
      blocksToShow,
      translations
    );
  }

  // Footer
  footer(doc, pageNumber, translations);
}

// Helper function to render continuation page (only markPictures, no drawing)
async function renderDeviationContinuationPage(
  doc,
  pageNumber,
  markPictures,
  markPictureDescriptions,
  startMarkPictureIndex,
  blocksToShow,
  translations = {}
) {
  // Blue bar heading
  const continuedTitle =
    translations["17. DEVIATIONS (continued)"] || "17. DEVIATIONS (continued)";
  let y = drawSectionBar(doc, M.t, continuedTitle, translations);
  y += 10;

  // Subheading: DEVIATIONS (left) + colored circle (right)
  const titleText = translations["DEVIATIONS"] || "DEVIATIONS";

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
  const circleCenterY = y + 7;
  const circleCenterX = M.l + CONTENT_W - 20;

  doc
    .save()
    .fillColor(BORDER_COLOR)
    .circle(circleCenterX, circleCenterY, circleRadius)
    .fill()
    .restore();

  y = doc.y + 10;
  y += 10;

  // Render markPictures dynamically
  await renderDeviationKPBlocks(
    doc,
    markPictures,
    markPictureDescriptions,
    startMarkPictureIndex,
    y,
    blocksToShow,
    translations
  );

  // Footer
  footer(doc, pageNumber, translations);
}

// Helper function to render KP blocks for markPictures in 2x2 grid
async function renderDeviationKPBlocks(
  doc,
  markPictures,
  markPictureDescriptions,
  startIndex,
  startY,
  blocksToShow,
  translations = {}
) {
  const gapX = 20;
  const gapY = 24;
  const boxWidth = (CONTENT_W - gapX) / 2;
  const kpBlockHeight = 150;

  const leftX = M.l;
  const rightX = M.l + boxWidth + gapX;

  let y = startY;

  // Render blocks in 2x2 grid
  for (let i = 0; i < blocksToShow; i++) {
    const markPictureIndex = startIndex + i;
    const filename = markPictures[markPictureIndex];
    const description = markPictureDescriptions[markPictureIndex] || "";
    const kpLabel = `KP.${markPictureIndex + 1}`; // Use actual index in markPictures array

    const row = Math.floor(i / 2);
    const col = i % 2;

    const x = col === 0 ? leftX : rightX;
    const yTop = row === 0 ? y : y + kpBlockHeight + gapY;

    await drawDeviationKPBlock(
      doc,
      x,
      yTop,
      kpLabel,
      description,
      filename,
      boxWidth,
      kpBlockHeight,
      translations
    );
  }
}

// Helper function to draw a KP block for deviation markPictures
async function drawDeviationKPBlock(
  doc,
  x,
  yTop,
  label,
  comment,
  filename,
  boxWidth,
  kpBlockHeight,
  translations = {}
) {
  // 1) "KP.X unique no." + underline
  const uniqueNoText = translations["unique no."] || "unique no.";
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text(label + " " + uniqueNoText, x, yTop, {
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

  // 2) Comment from markPictureDescriptions + underline
  const commentY = lineY1 + 6;
  const defaultComment =
    translations["Comment on Picture from registration"] ||
    "Comment on Picture from registration";
  const rawCommentText = comment || defaultComment;
  const commentText = translations[rawCommentText] || rawCommentText;
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text(commentText, x, commentY, {
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
  const picHeight = kpBlockHeight - (picY - yTop) - 22;

  doc
    .save()
    .lineWidth(1)
    .strokeColor(BORDER_COLOR)
    .rect(x, picY, boxWidth, picHeight)
    .stroke()
    .restore();

  // Load and display image from uploads directory
  if (filename) {
    try {
      const imagePath = path.join(__dirname, "uploads", filename);
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        doc.image(imageBuffer, x + 3, picY + 3, {
          fit: [boxWidth - 6, picHeight - 6],
          align: "center",
          valign: "center",
        });
      }
    } catch (error) {
      console.error("Error loading mark picture:", error.message);
    }
  }

  // 4) Picture caption
  const captionY = picY + picHeight + 4;
  const pictureCaption =
    translations["Picture for registration"] || "Picture for registration";
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text(pictureCaption, x + 5, captionY, {
      width: boxWidth - 10,
      align: "center",
    });
}

// PAGE 19 – placeholder
// PAGE 19 – 18. WEATHER HISTORY
function page19(doc, dynamic, translations = {}) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "18. WEATHER HISTORY", translations);
  y += 12;

  // Intro text
  y = paragraph(
    doc,
    y,
    "The following are recorded during the execution phase which indicate conditions that hinder our work or are in breach of the safety and health regulations on site,",
    { fontSize: 9 },
    translations
  );

  y = paragraph(
    doc,
    y,
    "It could be, for example. be: Severe frost, unusual weather conditions or storm and strong winds, stop in crane work.",
    { fontSize: 9 },
    translations
  );

  y += 10;

  // REPORTED TO:
  const reportedToText = translations["REPORTED TO:"] || "REPORTED TO:";
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text(reportedToText, M.l, y, {
      width: CONTENT_W,
      align: "left",
    });

  y = doc.y + 10;

  // Source line
  const sourceText = translations["Source:"] || "Source:";
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text(
      `${sourceText} https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/2-2623032/Danmark`,
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
    const idText = translations["ID"] || "ID";
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(idText, col1X + 3, y + 4, {
        width: colWidths[0] - 6,
        align: "left",
      });

    // SUBJECT...
    const subjectText =
      translations["SUBJECT: RAIN, FROST OR STRONG WIND"] ||
      "SUBJECT: RAIN, FROST OR STRONG WIND";
    doc.text(subjectText, col2X + 3, y + 4, {
      width: colWidths[1] - 6,
      align: "left",
    });

    // CAUSE DELAYS
    const causeDelaysText = translations["CAUSE DELAYS"] || "CAUSE DELAYS";
    doc.text(causeDelaysText, col3X + 3, y + 4, {
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
    const fromAppText = translations["From app"] || "From app";
    const causeText = ev.cause || fromAppText;
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

    const imageFromAppText = translations["Image from app"] || "Image from app";

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
          .text(imageFromAppText, imgX + 2, imgY + 2, {
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
        .text(imageFromAppText, imgX + 2, imgY + 2, {
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
  const fromAppText = translations["From app"] || "From app";
  const events =
    dynamic.weatherEvents && Array.isArray(dynamic.weatherEvents)
      ? dynamic.weatherEvents
      : [
          { id: "19.11", imagePath: null, cause: fromAppText },
          { id: "19.12", imagePath: null, cause: fromAppText },
          { id: "19.13", imagePath: null, cause: fromAppText },
        ];

  events.forEach((ev) => drawDataRow(ev));

  y += 24;

  // ---------- CONTACT / NAME BLOCK ----------
  const rowHeightContact = 16;
  const keyWidthContact = 120;

  function keyValueRowContact(label, value) {
    const fromProjectSetupText =
      translations["From project setup"] || "From project setup";
    const v = value || fromProjectSetupText;

    const translatedLabel = translations[label] || label;
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(translatedLabel, M.l, y, {
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
  const fromProjectSetupText =
    translations["From project setup"] || "From project setup";
  const constructionManagerText =
    translations["CONSTRUCTION MANAGER"] || "CONSTRUCTION MANAGER";
  const nameValue =
    dynamic.weatherName ||
    `${constructionManagerText} – ${fromProjectSetupText}`;

  const nameText = translations["NAME"] || "NAME";
  keyValueRowContact(nameText, nameValue);

  const telephoneText = translations["TELEPHONE:"] || "TELEPHONE:";
  keyValueRowContact(
    telephoneText,
    dynamic.weatherTelephone || fromProjectSetupText
  );

  const emailText = translations["EMAIL:"] || "EMAIL:";
  keyValueRowContact(emailText, dynamic.weatherEmail || fromProjectSetupText);

  // Footer – this page is "Page 18 of 26"
  footer(doc, 18, translations);
}

// PAGE 20 – placeholder
// PAGE 20 – 19. COMMUNICATION HISTORY VIA SMS OR EMAIL
function page20(doc, dynamic, translations = {}) {
  // Top blue section bar
  let y = drawSectionBar(
    doc,
    M.t,
    "19. COMMUNICATION HISTORY VIA SMS OR EMAIL",
    translations
  );
  y += 20;

  // ---------- 20.10 E-MAIL SENT TO INVOLVED PARTIES ----------
  const emailSentText =
    translations["20.10 E-MAIL SENT TO INVOLVED PARTIES"] ||
    "20.10 E-MAIL SENT TO INVOLVED PARTIES";
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text(emailSentText, M.l, y, {
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
  const idText = translations["ID"] || "ID";
  const dateText = translations["DATE"] || "DATE";
  const subjectText = translations["SUBJECT"] || "SUBJECT";
  const sentText = translations["SENT"] || "SENT";
  const recipientsText = translations["RECIPIENTS"] || "RECIPIENTS";
  drawEmailRow(idText, dateText, subjectText, sentText, recipientsText, true);

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
  const smsSentText =
    translations["20.20 SMS SENT TO INVOLVED PARTIES"] ||
    "20.20 SMS SENT TO INVOLVED PARTIES";
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text(smsSentText, M.l, y, {
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
  drawSmsRow(idText, dateText, subjectText, sentText, recipientsText, true);

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
  footer(doc, 19, translations);
}

// PAGE 21 – placeholder
// PAGE 21 – 20. RE REPORTED STAFFING
function page21(doc, dynamic, translations = {}) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "20. RE REPORTED STAFFING", translations);
  y += 12;

  // Intro text
  y = paragraph(
    doc,
    y,
    "Below you can see the reported staffing for the project period.",
    { fontSize: 9 },
    translations
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
  const weekText = translations["WEEK"] || "WEEK";
  const informText = translations["INFORM"] || "INFORM";
  const monText = translations["MON"] || "MON";
  const tueText = translations["TUE"] || "TUE";
  const wenText = translations["WEN"] || "WEN";
  const torText = translations["TOR"] || "TOR";
  const friText = translations["Fri"] || "Fri";
  const satText = translations["SAT"] || "SAT";
  const sunText = translations["SUN"] || "SUN";
  const averagePrWeekText =
    translations["AVERAGE PR WEEK"] || "AVERAGE PR WEEK";
  drawStaffRow(
    [
      weekText,
      informText,
      monText,
      tueText,
      wenText,
      torText,
      friText,
      satText,
      sunText,
      averagePrWeekText,
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
  footer(doc, 20, translations);
}

// PAGE 22 – placeholder
// PAGE 22 – 21. ALLEGED REALIZATION DURING CONSTRUCTION
function page22(doc, dynamic, translations = {}) {
  // Blue bar heading
  let y = drawSectionBar(
    doc,
    M.t,
    "21. ALLEGED REALIZATION DURING CONSTRUCTION",
    translations
  );
  y += 12;

  // Intro paragraphs (exact text from the PDF)
  y = paragraph(
    doc,
    y,
    "In connection with the execution of my contract, documentation has been sent to the parties involved, including the",
    { fontSize: 9 },
    translations
  );

  y = paragraph(
    doc,
    y,
    "construction management, regarding conditions that either limit my work , cause disturbances  or are in violation of",
    { fontSize: 9 },
    translations
  );

  y = paragraph(
    doc,
    y,
    "working environment rules or safety  on the construction site, this unfortunately leads to delays, and possibly",
    { fontSize: 9 },
    translations
  );

  y = paragraph(doc, y, "additional costs .", { fontSize: 9 }, translations);

  y += 6;

  y = paragraph(
    doc,
    y,
    "This will be stated in the documents sent, which have the following ID.",
    { fontSize: 9 },
    translations
  );

  y += 14;

  // Subheading
  const emailSentToPartiesText =
    translations["21.10 EMAIL SENT TO INVOLVED PARTIES"] ||
    "21.10 EMAIL SENT TO INVOLVED PARTIES";
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("black")
    .text(emailSentToPartiesText, M.l, y, {
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
  const posText = translations["POS."] || "POS.";
  const dateText = translations["DATE"] || "DATE";
  const subjectText = translations["SUBJECT"] || "SUBJECT";
  const sentText = translations["SENT"] || "SENT";
  const returnReplyText = translations["RETURNREPLY"] || "RETURNREPLY";
  const recipientText = translations["RECIPIENT"] || "RECIPIENT";
  drawRow(
    [posText, dateText, subjectText, sentText, returnReplyText, recipientText],
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
  footer(doc, 21, translations);
}

// PAGE 23 – placeholder
// PAGE 23 – 21. MISCELLANEOUS REPORTS OVERVIEW.
function page23(doc, dynamic, translations = {}) {
  // Blue bar heading
  let y = drawSectionBar(
    doc,
    M.t,
    "21. MISCELLANEOUS REPORTS OVERVIEW.",
    translations
  );
  y += 12;

  // Intro line
  y = paragraph(
    doc,
    y,
    "Below are the forwarded requests:",
    { fontSize: 9 },
    translations
  );
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

    // Section title (e.g. ADRESSED NOTE) - translate if available
    const translatedTitle = translations[title] || title;
    doc.text(translatedTitle, M.l + 44, y + 4, {
      width: CONTENT_W - 48,
      align: "left",
    });

    y += headerH + 4;

    // Table header row: ID: DATE TITLE SENT RECIPIENT
    const idColonText = translations["ID:"] || "ID:";
    const dateText = translations["DATE"] || "DATE";
    const titleText = translations["TITLE"] || "TITLE";
    const sentText = translations["SENT"] || "SENT";
    const recipientText = translations["RECIPIENT"] || "RECIPIENT";
    drawMiscRow(
      [idColonText, dateText, titleText, sentText, recipientText],
      true,
      "black"
    );
    y += 2;

    // Data rows (From note placeholders in red by default)
    const fromNoteText = translations["From note"] || "From note";
    const rowsToUse =
      rows && rows.length
        ? rows
        : [
            {
              id: fromNoteText,
              date: fromNoteText,
              title: fromNoteText,
              sent: fromNoteText,
              recipient: fromNoteText,
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
  footer(doc, 22, translations);
}

// PAGE 24 – placeholder
// PAGE 23 – 22. SIGNING
function page24(doc, dynamic, translations = {}) {
  // Blue bar heading
  let y = drawSectionBar(doc, M.t, "22. SIGNING", translations);
  y += 14;

  // Paragraph 1
  y = paragraph(
    doc,
    y,
    "The subcontractor hereby declares that the quality assurance performed has been carried out in accordance with the Quality Assurance Handbook for the company and partners as stated above.",
    { fontSize: 9 },
    translations
  );

  // Paragraph 2
  y = paragraph(
    doc,
    y,
    "This quality assurance fulfils the requirements set out in the tender control plan, in any case of a quality that makes the execution of the work and process visible, and the work performed meets the usual good quality.",
    { fontSize: 9 },
    translations
  );

  y += 24;

  // ---------- DATE / SIGNATURE BLOCK ----------
  const colWidth = CONTENT_W / 2;
  const leftX = M.l;
  const rightX = M.l + colWidth;

  const rowHeight = 18;

  // Header row: DATE | SIGNATURE
  doc.font("Helvetica-Bold").fontSize(9).fillColor("black");
  const dateText = translations["DATE"] || "DATE";
  doc.text(dateText, leftX, y, {
    width: colWidth,
    align: "left",
  });

  const signatureText = translations["SIGNATURE"] || "SIGNATURE";
  doc.text(signatureText, rightX, y, {
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
  doc.font("Helvetica").fontSize(9).fillColor("black");
  const signingDateText = translations["Signing date"] || "Signing date";
  doc.text(signingDateText, leftX, y, {
    width: colWidth,
    align: "left",
  });

  const appSigningPartText =
    translations["App signing part"] || "App signing part";
  doc.text(appSigningPartText, rightX, y, {
    width: colWidth,
    align: "left",
  });

  y = doc.y + 40;

  // Final paragraph at bottom
  y = paragraph(
    doc,
    y,
    "This front page, together with all quality assurance forms (cf. the Quality Handbook for the Company and Partners), constitutes the complete quality assurance of the entire project.",
    { fontSize: 9 },
    translations
  );

  // Footer – this physical page is "Page 23 of 26"
  footer(doc, 23, translations);
}

// ---------------------------------------------------------------------
// EXPRESS ROUTES
// ---------------------------------------------------------------------

// Simple home route
app.get("/", (req, res) => {
  res.send(
    '<h2>Quality Assurance Report PDF</h2><p>Download: <a href="/download">/download</a></p>'
  );
});

// -------------------- ROUTE --------------------
app.get("/download", async (req, res) => {
  try {
    var subjectMatterId = req.query.subjectMatterId || "KP06";
    var projectId = req.query.projectId || "693d2acb1291ff43b9ea32a3";
    var companyId = req.query.companyId || "693d25ef252d1b388fff0648";

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

    // Fetch project data
    console.log("Fetching project with ID:", projectId);
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });
    console.log("Project found:", project ? "Yes" : "No");

    // Fetch profession group from inputs collection
    console.log(
      "Fetching profession group for SubjectMatterId:",
      subjectMatterId
    );
    const inputDoc = await db.collection("inputs").findOne({
      SubjectMatterId: subjectMatterId,
    });
    const professionGroup = inputDoc?.GroupName || "From project setup";
    console.log("Profession Group:", professionGroup);

    // Format prepared date from project createdAt
    const preparedDate = project?.createdAt
      ? new Date(project.createdAt).toLocaleDateString("en-GB")
      : "";

    // Project ID is the _id of the project record
    const projectIdValue = project?._id ? project._id.toString() : projectId;
    const projectObjectId = new ObjectId(projectId);

    // Fetch Main Contractor/Customer user
    const mainContractor = await db.collection("users").findOne({
      role: { $in: ["Main Contractor", "Main Constructor"] },
      $or: [
        { projectsId: projectObjectId },
        { projectsId: projectId },
        { projectsId: { $in: [projectObjectId, projectId] } },
      ],
    });
    console.log("Main Contractor found:", mainContractor ? "Yes" : "No");

    // Fetch Construction Manager user (with subjectMatterId check)
    // First get all Construction Managers with matching projectId, then filter by subjectMatterId
    const constructionManagers = await db
      .collection("users")
      .find({
        role: "Construction Manager",
        $or: [
          { projectsId: projectObjectId },
          { projectsId: projectId },
          { projectsId: { $in: [projectObjectId, projectId] } },
        ],
      })
      .toArray();

    // Filter by subjectMatterId if it exists in userProfession or profession
    let constructionManager = null;
    if (constructionManagers.length > 0) {
      constructionManager =
        constructionManagers.find((user) => {
          // Check userProfession array
          if (user.userProfession && Array.isArray(user.userProfession)) {
            return user.userProfession.some(
              (prof) => prof.SubjectMatterId === subjectMatterId
            );
          }
          // Check profession object
          if (user.profession && user.profession.SubjectMatterId) {
            return user.profession.SubjectMatterId === subjectMatterId;
          }
          // If no subjectMatterId filter, return first one
          return true;
        }) || constructionManagers[0];
    }
    console.log(
      "Construction Manager found:",
      constructionManager ? "Yes" : "No"
    );

    // Fetch Safety Coordinator user (with subjectMatterId check)
    const safetyCoordinators = await db
      .collection("users")
      .find({
        role: "Safety Coordinator",
        $or: [
          { projectsId: projectObjectId },
          { projectsId: projectId },
          { projectsId: { $in: [projectObjectId, projectId] } },
        ],
      })
      .toArray();

    // Filter by subjectMatterId if it exists
    let safetyCoordinator = null;
    if (safetyCoordinators.length > 0) {
      safetyCoordinator =
        safetyCoordinators.find((user) => {
          // Check userProfession array
          if (user.userProfession && Array.isArray(user.userProfession)) {
            return user.userProfession.some(
              (prof) => prof.SubjectMatterId === subjectMatterId
            );
          }
          // Check profession object
          if (user.profession && user.profession.SubjectMatterId) {
            return user.profession.SubjectMatterId === subjectMatterId;
          }
          // If no subjectMatterId filter, return first one
          return true;
        }) || safetyCoordinators[0];
    }
    console.log("Safety Coordinator found:", safetyCoordinator ? "Yes" : "No");

    // Fetch certificate schemes
    // projectsId can be array of ObjectIds or strings
    const schemes = await db
      .collection("schemes")
      .find({
        companyId: companyId,
        $or: [
          { projectsId: projectObjectId },
          { projectsId: projectId },
          { projectsId: { $in: [projectObjectId, projectId] } },
        ],
      })
      .toArray();
    console.log("Schemes found:", schemes.length);

    // Fetch Advisor users by type
    const advisorUsers = await db
      .collection("users")
      .find({
        role: "Advisor",
        $or: [
          { projectsId: projectObjectId },
          { projectsId: projectId },
          { projectsId: { $in: [projectObjectId, projectId] } },
        ],
        type: {
          $in: [
            "Architecture",
            "Engineer",
            "Fire",
            "Acoustics",
            "Technical Subject",
          ],
        },
      })
      .toArray();
    console.log("Advisor users found:", advisorUsers.length);

    // Group advisors by type
    const advisorsByType = {
      Architecture: [],
      Engineer: [],
      Fire: [],
      Acoustics: [],
      "Technical Subject": [],
    };

    advisorUsers.forEach((advisor) => {
      const advisorType = advisor.type;
      if (advisorsByType[advisorType]) {
        advisorsByType[advisorType].push(advisor);
      }
    });

    // Get the first scheme or use empty values
    const scheme = schemes.length > 0 ? schemes[0] : null;

    // Fetch documents for page 6
    const documents = await db
      .collection("documents")
      .find({
        projectId: projectId,
      })
      .sort({ uploadedAt: -1 })
      .toArray();
    console.log("Documents found:", documents.length);

    // Fetch draws for page 6
    const draws = await db
      .collection("draws")
      .find({
        $or: [
          { projectsId: projectObjectId },
          { projectsId: projectId },
          { projectsId: { $in: [projectObjectId, projectId] } },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();
    console.log("Draws found:", draws.length);

    // Fetch users for page 8
    // 1. Sub Contractor users
    const subContractors = await db
      .collection("users")
      .find({
        role: "Sub Contractor",
        companyId: companyId,
        $or: [
          { projectsId: projectObjectId },
          { projectsId: projectId },
          { projectsId: { $in: [projectObjectId, projectId] } },
        ],
      })
      .toArray();
    console.log("Sub Contractors found:", subContractors.length);

    // 2. Project Manager users
    const projectManagers = await db
      .collection("users")
      .find({
        $or: [
          { isProjectManager: "yes" },
          { isProjectManager: "Yes" },
          { isProjectManager: true },
          { "isProjectManager._id": "yes" },
          { "isProjectManager.name": "Yes" },
        ],
        companyId: companyId,
        projectsId: { $in: [projectObjectId, projectId] },
        userRole: "Project Manager",
      })
      .toArray();
    console.log("Project Managers found:", projectManagers.length);

    // 4. Independent Controller users
    const independentControllers = await db
      .collection("users")
      .find({
        role: "Independent Controller",
        companyId: companyId,
        $or: [
          { projectsId: projectObjectId },
          { projectsId: projectId },
          { projectsId: { $in: [projectObjectId, projectId] } },
        ],
      })
      .toArray();
    console.log(
      "Independent Controllers found:",
      independentControllers.length
    );

    // Fetch Worker users for page 9
    const workers = await db
      .collection("users")
      .find({
        role: "Worker",
        companyId: companyId,
        projectsId: { $in: [projectObjectId, projectId] },
      })
      .toArray();
    console.log("Workers found:", workers.length);

    // Fetch supervision checklist records for page 11
    const supervisionChecklist = await db
      .collection("project-supervision-check-list")
      .find({
        projectId: projectObjectId,
      })
      .toArray();
    console.log(
      "Supervision checklist records found:",
      supervisionChecklist.length
    );

    // Fetch quality assurance signature for page 11
    const qualityAssuranceSignature = await db
      .collection("quality assurance signature")
      .findOne({
        projectId: projectId,
        subjectMatterId: subjectMatterId,
      });
    console.log(
      "Quality assurance signature found:",
      qualityAssuranceSignature ? "Yes" : "No"
    );

    // Helper function to format date
    const formatDate = (date) => {
      if (!date) return "";
      try {
        return new Date(date).toLocaleDateString("en-GB");
      } catch {
        return "";
      }
    };

    // Build dynamic data object
    const dynamicData = {
      company: company,
      professionGroup: professionGroup,
      preparedDate: preparedDate,
      projectId: projectIdValue,
      project: project,
      subjectMatterId: subjectMatterId,
      // Page 3 data
      projectDate: preparedDate, // Project createdAt
      // Construction case - use project details
      caseId: projectIdValue, // Project _id
      constructionCaseName1: project?.name || "",
      constructionCaseCvrNo: project?.cvr || "",
      constructionCaseAddress1: project?.address || "",
      constructionCasePostcode1:
        project?.postalCode && project?.city
          ? `${project.postalCode} ${project.city}`
          : project?.postalCode || project?.city || "",
      constructionCaseContactPerson: project?.contactPerson || "",
      constructionCaseStartingDate: project?.startDate
        ? formatDate(project.startDate)
        : "",
      constructionCaseDeadline: project?.endDate
        ? formatDate(project.endDate)
        : "",
      constructionCaseTelephone: project?.contactPhone || "",
      constructionCaseEmail: project?.email || "",
      // Main Contractor/Customer
      mainContractorStartingDate: project?.startDate
        ? formatDate(project.startDate)
        : "",
      mainContractorName:
        mainContractor?.name || mainContractor?.username || "",
      mainContractorCvrNo: mainContractor?.cvr || "",
      mainContractorAddress: mainContractor?.address || "",
      mainContractorPostcode:
        mainContractor?.postalCode && mainContractor?.city
          ? `${mainContractor.postalCode} ${mainContractor.city}`
          : mainContractor?.postalCode || mainContractor?.city || "",
      mainContractorTelephone: mainContractor?.phone || "",
      mainContractorEmail:
        mainContractor?.email || mainContractor?.username || "",
      // Construction Manager
      constructionManagerDate: constructionManager?.createdAt
        ? formatDate(constructionManager.createdAt)
        : "",
      constructionManagerName:
        constructionManager?.name || constructionManager?.username || "",
      constructionManagerTelephone: constructionManager?.phone || "",
      constructionManagerEmail:
        constructionManager?.email || constructionManager?.username || "",
      // Safety Coordinator
      safetyCoordinatorDate: safetyCoordinator?.createdAt
        ? formatDate(safetyCoordinator.createdAt)
        : "",
      safetyCoordinatorName:
        safetyCoordinator?.name || safetyCoordinator?.username || "",
      safetyCoordinatorTelephone: safetyCoordinator?.phone || "",
      safetyCoordinatorEmail:
        safetyCoordinator?.email || safetyCoordinator?.username || "",
      // Certificate Schemes
      certificationDate: scheme?.startDate ? formatDate(scheme.startDate) : "",
      certificationScheme: scheme?.item || "",
      certificationLevel: scheme?.level || "",
      // Profession Group
      professionGroupDate: preparedDate, // Use project createdAt
      professionGroupName: professionGroup,
      // Page 4 - Advisors by type
      advisorsByType: advisorsByType,
      // Page 6 - Documents and Draws
      documents: documents,
      draws: draws,
      // Page 8 - Users
      subContractors: subContractors,
      projectManagers: projectManagers,
      independentControllers: independentControllers,
      // Page 9 - Workers
      workers: workers,
      // Page 11 - Supervision Checklist
      supervisionChecklist: supervisionChecklist,
      qualityAssuranceSignature: qualityAssuranceSignature,
    };

    console.log("Dynamic data being passed to PDF generator:", {
      companyName: company?.name || "Not found",
      professionGroup: professionGroup,
      preparedDate: preparedDate,
      projectId: projectIdValue,
      hasCompanyLogo: !!(
        company?.picture?.s3Location ||
        company?.picture?.s3location ||
        company?.picture?.location ||
        company?.picture?.url
      ),
    });

    // Get target language from query parameter (optional)
    const targetLang = req.query.target_lang || req.query.lang || "DA";

    // Collect and translate texts for page 1, 2, 3, 4, 5, and 6 if target language is specified
    let translations = {};
    if (targetLang) {
      console.log(`Translation requested for language: ${targetLang}`);
      const page1And2And3And4And5And6Texts =
        collectPage1And2And3And4And5And6Texts(dynamicData);
      const textsArray = Object.keys(page1And2And3And4And5And6Texts);
      translations = await translateTexts(textsArray, targetLang);
      console.log(
        `Translation map created with ${
          Object.keys(translations).length
        } entries`
      );
    } else {
      console.log("No target language specified, using original texts");
    }

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=quality-assurance-report.pdf"
    );

    // Generate PDF
    await generateQualityAssuranceReport(dynamicData, res, translations);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res
      .status(500)
      .json({ error: "Failed to generate PDF", details: error.message });
  }
});

// Start server - Only start if running directly (not when required as a module)
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// Export functions and constants for use in other files
module.exports = {
  generateQualityAssuranceReport,
  translateTexts,
  collectPage1And2And3And4And5And6Texts,
  PAGE,
  M,
};
