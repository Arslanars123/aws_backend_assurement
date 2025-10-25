const express = require("express");
const { ObjectId } = require("mongodb");
const path = require("path");
const fs = require("fs");

// Helper function to fetch KS report data
async function fetchKsReportData(db, companyId, projectId) {
  const baseMatch = {
    companyId: companyId,
    projectsId: { $in: [projectId] },
  };

  // Fetch all data in parallel
  const [
    companyDetails,
    projectDetail,
    workers,
    projectManagers,
    subcontractors,
    independentControllers,
    mainContractorsCustomers,
    constructionManagers,
    safetyManagers,
    advisors,
    inspectors,
    documents,
    draws,
    schemes,
    supervisionDetails,
  ] = await Promise.all([
    // Company details
    db.collection("companies").findOne({ _id: new ObjectId(companyId) }),

    // Project details
    db.collection("projects").findOne({ _id: new ObjectId(projectId) }),

    // Worker
    db
      .collection("users")
      .find({ ...baseMatch, role: "Worker" })
      .toArray(),

    // Project Managers (role or isProjectManager flag)
    db
      .collection("users")
      .find({
        ...baseMatch,
        $or: [
          { role: "Project Manager" },
          { isProjectManager: { $in: ["yes", true] } },
        ],
      })
      .toArray(),

    // Subcontractor (handle variants)
    db
      .collection("users")
      .find({
        ...baseMatch,
        role: { $in: ["Sub Contractor", "Subcontractor"] },
      })
      .toArray(),

    // Independent Controller
    db
      .collection("users")
      .find({ ...baseMatch, role: "Independent Controller" })
      .toArray(),

    // Main contractor / customer (handle variants)
    db
      .collection("users")
      .find({
        ...baseMatch,
        role: {
          $in: ["Main Contractor", "Customer", "Main contractor/customer"],
        },
      })
      .toArray(),

    // Construction Manager
    db
      .collection("users")
      .find({ ...baseMatch, role: "Construction Manager" })
      .toArray(),

    // Safety Manager (handle Safety Coordinator variant)
    db
      .collection("users")
      .find({
        ...baseMatch,
        role: { $in: ["Safety Manager", "Safety Coordinator"] },
      })
      .toArray(),

    // Advisor
    db
      .collection("users")
      .find({ ...baseMatch, role: "Advisor" })
      .toArray(),

    // Inspectors
    db
      .collection("users")
      .find({ ...baseMatch, role: "Inspector" })
      .toArray(),

    // Documents
    db
      .collection("documents")
      .find({ companyId: companyId, projectId: projectId })
      .sort({ uploadedAt: -1 })
      .toArray(),

    // Draws
    db
      .collection("draws")
      .find({ companyId: companyId, projectsId: { $in: [projectId] } })
      .sort({ createdAt: -1 })
      .toArray(),

    // Schemes
    db
      .collection("schemes")
      .find({ companyId: companyId, projectsId: { $in: [projectId] } })
      .sort({ startDate: -1 })
      .toArray(),

    // Supervision Details
    db
      .collection("project-supervision-check-list")
      .find({ projectId: new ObjectId(projectId) })
      .toArray(),
  ]);

  return {
    companyDetails: companyDetails || {},
    projectDetail: projectDetail || {},
    users: {
      workers: workers || [],
      projectManagers: projectManagers || [],
      subcontractors: subcontractors || [],
      independentControllers: independentControllers || [],
      mainContractorsCustomers: mainContractorsCustomers || [],
      constructionManagers: constructionManagers || [],
      safetyManagers: safetyManagers || [],
      advisors: advisors || [],
      inspectors: inspectors || [],
    },
    documents: documents || [],
    draws: draws || [],
    schemes: schemes || [],
    supervisionDetails: supervisionDetails || [],
  };
}

// Function to create routes with database connection
function createKsReportRoutes(db) {
  const router = express.Router();

  // GET route to render KS report HTML with data
  router.get("/abdullahksreport.html", async (req, res) => {
    try {
      const { companyId, projectId, profession } = req.query;

      // Validate required fields
      if (!companyId || !projectId) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial; padding: 40px; text-align: center;">
              <h2>Error: Missing Parameters</h2>
              <p>Please provide companyId and projectId in the URL.</p>
              <p>Example: /abdullahksreport.html?companyId=xxx&projectId=yyy&profession=KP06</p>
            </body>
          </html>
        `);
      }

      // Validate ObjectId format
      if (!ObjectId.isValid(companyId) || !ObjectId.isValid(projectId)) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial; padding: 40px; text-align: center;">
              <h2>Error: Invalid ID Format</h2>
              <p>Please provide valid companyId and projectId.</p>
            </body>
          </html>
        `);
      }

      // Fetch data
      const data = await fetchKsReportData(db, companyId, projectId);

      // Read the HTML templates
      const reportPage1Path = path.join(
        __dirname,
        "abdullahksreport",
        "report-page1.html"
      );
      const tocPath = path.join(
        __dirname,
        "abdullahksreport",
        "table-of-contents.html"
      );
      const projectDetailsPath = path.join(
        __dirname,
        "abdullahksreport",
        "project-details.html"
      );
      const affiliatedAdvisersPath = path.join(
        __dirname,
        "abdullahksreport",
        "affiliated-advisers.html"
      );
      const documentsInfoPath = path.join(
        __dirname,
        "abdullahksreport",
        "documents-and-information.html"
      );
      const receivedCaseDocumentsPath = path.join(
        __dirname,
        "abdullahksreport",
        "received-case-documents.html"
      );
      const checklistPath = path.join(
        __dirname,
        "abdullahksreport",
        "checklist.html"
      );
      const companyOrgPath = path.join(
        __dirname,
        "abdullahksreport",
        "company-organization.html"
      );
      const employeeProductionPath = path.join(
        __dirname,
        "abdullahksreport",
        "employee-and-production.html"
      );
      const projectManagementPath = path.join(
        __dirname,
        "abdullahksreport",
        "project-management-supervision.html"
      );
      const descriptionControlPath = path.join(
        __dirname,
        "abdullahksreport",
        "description-control-work.html"
      );
      const standardControlPath = path.join(
        __dirname,
        "abdullahksreport",
        "standard-for-control-plan.html"
      );
      const planTendersPath = path.join(
        __dirname,
        "abdullahksreport",
        "plan-for-control-tenders.html"
      );
      const receptionControlPath = path.join(
        __dirname,
        "abdullahksreport",
        "reception-control.html"
      );

      let reportPage1Html = fs.readFileSync(reportPage1Path, "utf8");
      let tocHtml = fs.readFileSync(tocPath, "utf8");
      let projectDetailsHtml = fs.readFileSync(projectDetailsPath, "utf8");
      let affiliatedAdvisersHtml = fs.readFileSync(
        affiliatedAdvisersPath,
        "utf8"
      );
      let documentsInfoHtml = fs.readFileSync(documentsInfoPath, "utf8");
      let receivedCaseDocumentsHtml = fs.readFileSync(
        receivedCaseDocumentsPath,
        "utf8"
      );
      let checklistHtml = fs.readFileSync(checklistPath, "utf8");
      let companyOrgHtml = fs.readFileSync(companyOrgPath, "utf8");
      let employeeProductionHtml = fs.readFileSync(
        employeeProductionPath,
        "utf8"
      );
      let projectManagementHtml = fs.readFileSync(
        projectManagementPath,
        "utf8"
      );
      let descriptionControlHtml = fs.readFileSync(
        descriptionControlPath,
        "utf8"
      );
      let standardControlHtml = fs.readFileSync(standardControlPath, "utf8");
      let planTendersHtml = fs.readFileSync(planTendersPath, "utf8");
      let receptionControlHtml = fs.readFileSync(receptionControlPath, "utf8");

      // Populate data into HTML
      const companyDetails = data.companyDetails || {};
      const projectDetail = data.projectDetail || {};
      const companyLogo = companyDetails.picture?.s3Location || "";
      const companyName = companyDetails.name || "";
      const firstLetter = companyName.charAt(0).toUpperCase();
      const postNoCity = `${companyDetails.postalCode || ""} ${
        companyDetails.city || ""
      }`.trim();
      const projectIdValue = projectDetail.case_no || projectDetail._id || "";

      // Replace placeholders in ReportPage1
      reportPage1Html = reportPage1Html.replace(
        /id="companyLogo"/g,
        `id="companyLogo" src="${companyLogo}" ${
          companyLogo ? 'style="display: block;"' : 'style="display: none;"'
        }`
      );
      reportPage1Html = reportPage1Html.replace(
        /id="companyLogoFallback">A/g,
        `id="companyLogoFallback">${firstLetter}`
      );
      reportPage1Html = reportPage1Html.replace(
        /id="postNoCity"><\/div>/g,
        `id="postNoCity">${postNoCity}</div>`
      );
      reportPage1Html = reportPage1Html.replace(
        /id="address"><\/div>/g,
        `id="address">${companyDetails.address || ""}</div>`
      );
      reportPage1Html = reportPage1Html.replace(
        /id="cvr"><\/div>/g,
        `id="cvr">${companyDetails.cvr || ""}</div>`
      );
      reportPage1Html = reportPage1Html.replace(
        /id="telephone"><\/div>/g,
        `id="telephone">${companyDetails.companyPhone || ""}</div>`
      );
      reportPage1Html = reportPage1Html.replace(
        /id="mail"><\/div>/g,
        `id="mail">${companyDetails.email || ""}</div>`
      );
      reportPage1Html = reportPage1Html.replace(
        /id="projectId"><\/div>/g,
        `id="projectId">${projectIdValue}</div>`
      );
      reportPage1Html = reportPage1Html.replace(
        /id="footerCompanyLogo"/g,
        `id="footerCompanyLogo" src="${companyLogo}" ${
          companyLogo ? 'style="display: block;"' : 'style="display: none;"'
        }`
      );
      reportPage1Html = reportPage1Html.replace(
        /id="footerCompanyLogoFallback">A/g,
        `id="footerCompanyLogoFallback">${firstLetter}`
      );
      reportPage1Html = reportPage1Html.replace(
        /id="footerTocLogo">A/g,
        `id="footerTocLogo">${firstLetter}`
      );

      // Replace placeholders in TableOfContents
      tocHtml = tocHtml.replace(
        /id="footerCompanyLogo"/g,
        `id="footerCompanyLogo" src="${companyLogo}" ${
          companyLogo ? 'style="display: block;"' : 'style="display: none;"'
        }`
      );
      tocHtml = tocHtml.replace(
        /id="footerCompanyLogoFallback">A/g,
        `id="footerCompanyLogoFallback">${firstLetter}`
      );

      // Populate ProjectDetails
      const currentDate = new Date().toISOString().split("T")[0];
      const mainContractors = data.users?.mainContractorsCustomers || [];
      const constructionManagers = data.users?.constructionManagers || [];
      const safetyManagers = data.users?.safetyManagers || [];
      const schemes = data.schemes || [];

      // Construction Case fields
      projectDetailsHtml = projectDetailsHtml.replace(
        /id="constructionCaseDate"><\/div>/g,
        `id="constructionCaseDate">${currentDate}</div>`
      );
      projectDetailsHtml = projectDetailsHtml.replace(
        /id="constructionCaseId"><\/div>/g,
        `id="constructionCaseId">${projectIdValue}</div>`
      );
      projectDetailsHtml = projectDetailsHtml.replace(
        /id="constructionCaseName"><\/div>/g,
        `id="constructionCaseName">${projectDetail.name || ""}</div>`
      );
      projectDetailsHtml = projectDetailsHtml.replace(
        /id="constructionCaseAddress"><\/div>/g,
        `id="constructionCaseAddress">${projectDetail.address || ""}</div>`
      );
      projectDetailsHtml = projectDetailsHtml.replace(
        /id="constructionCasePostcode"><\/div>/g,
        `id="constructionCasePostcode">${projectDetail.postCode || ""}</div>`
      );
      projectDetailsHtml = projectDetailsHtml.replace(
        /id="constructionCaseStartingDate"><\/div>/g,
        `id="constructionCaseStartingDate">${
          projectDetail.startDate || ""
        }</div>`
      );
      projectDetailsHtml = projectDetailsHtml.replace(
        /id="constructionCaseDeadline"><\/div>/g,
        `id="constructionCaseDeadline">${
          projectDetail.projectDeadLine || ""
        }</div>`
      );

      // Main Contractors
      let mainContractorsHtml = "";
      mainContractors.forEach((contractor, index) => {
        mainContractorsHtml += `
          <div class="project-details-fields">
            <div class="project-details-field">
              <label>NAME:</label>
              <div class="project-details-value">${contractor.name || ""}</div>
            </div>
            <div class="project-details-field">
              <label>CVR NO:</label>
              <div class="project-details-value">${contractor.cvr || ""}</div>
            </div>
            <div class="project-details-field">
              <label>CONTACT PERSON</label>
              <div class="project-details-value">${
                contractor.contactPerson || ""
              }</div>
            </div>
            <div class="project-details-field">
              <label>ADDRESS:</label>
              <div class="project-details-value">${
                contractor.address || ""
              }</div>
            </div>
            <div class="project-details-field">
              <label>POSTCODE:</label>
              <div class="project-details-value">${
                contractor.postalCode || ""
              }</div>
            </div>
            <div class="project-details-field">
              <label>TELEPHONE:</label>
              <div class="project-details-value">${contractor.phone || ""}</div>
            </div>
            <div class="project-details-field">
              <label>EMAIL:</label>
              <div class="project-details-value">${
                contractor.username || ""
              }</div>
            </div>
            ${
              index < mainContractors.length - 1
                ? '<hr style="margin: 10px 0; border: 1px solid #ccc;" />'
                : ""
            }
          </div>
        `;
      });
      projectDetailsHtml = projectDetailsHtml.replace(
        /<div id="mainContractorsContainer">.*?<\/div>/s,
        `<div id="mainContractorsContainer">${mainContractorsHtml}</div>`
      );

      // Construction Managers
      let constructionManagersHtml = "";
      constructionManagers.forEach((manager, index) => {
        constructionManagersHtml += `
          <div class="project-details-fields">
            <div class="project-details-field">
              <label>Date</label>
              <div class="project-details-value">${
                manager.startDate || currentDate
              }</div>
            </div>
            <div class="project-details-field">
              <label>NAME</label>
              <div class="project-details-value">${
                manager.name || "Construction Manager"
              }</div>
            </div>
            <div class="project-details-field">
              <label>TELEPHONE:</label>
              <div class="project-details-value">${manager.phone || ""}</div>
            </div>
            <div class="project-details-field">
              <label>EMAIL:</label>
              <div class="project-details-value">${manager.username || ""}</div>
            </div>
            ${
              index < constructionManagers.length - 1
                ? '<hr style="margin: 10px 0; border: 1px solid #ccc;" />'
                : ""
            }
          </div>
        `;
      });
      projectDetailsHtml = projectDetailsHtml.replace(
        /<div id="constructionManagersContainer">.*?<\/div>/s,
        `<div id="constructionManagersContainer">${constructionManagersHtml}</div>`
      );

      // Safety Managers
      let safetyManagersHtml = "";
      safetyManagers.forEach((manager, index) => {
        safetyManagersHtml += `
          <div class="project-details-fields">
            <div class="project-details-field">
              <label>Date</label>
              <div class="project-details-value">${
                manager.startDate || currentDate
              }</div>
            </div>
            <div class="project-details-field">
              <label>NAME</label>
              <div class="project-details-value">${
                manager.name || "Safety Coordinator"
              }</div>
            </div>
            <div class="project-details-field">
              <label>TELEPHONE:</label>
              <div class="project-details-value">${manager.phone || ""}</div>
            </div>
            <div class="project-details-field">
              <label>EMAIL:</label>
              <div class="project-details-value">${manager.username || ""}</div>
            </div>
            ${
              index < safetyManagers.length - 1
                ? '<hr style="margin: 10px 0; border: 1px solid #ccc;" />'
                : ""
            }
          </div>
        `;
      });
      projectDetailsHtml = projectDetailsHtml.replace(
        /<div id="safetyManagersContainer">.*?<\/div>/s,
        `<div id="safetyManagersContainer">${safetyManagersHtml}</div>`
      );

      // Schemes
      let schemesHtml = "";
      schemes.forEach((scheme, index) => {
        schemesHtml += `
          <div class="project-details-fields-split">
            <div class="project-details-field">
              <label>Date</label>
              <div class="project-details-value">${scheme.startDate || ""}</div>
            </div>
            <div class="project-details-field">
              <label></label>
              <div class="project-details-value">${scheme.item || ""}</div>
            </div>
            <div class="project-details-field">
              <label></label>
              <div class="project-details-value">${scheme.level || ""}</div>
            </div>
            ${
              index < schemes.length - 1
                ? '<hr style="margin: 10px 0; border: 1px solid #ccc;" />'
                : ""
            }
          </div>
        `;
      });
      projectDetailsHtml = projectDetailsHtml.replace(
        /<div id="schemesContainer">.*?<\/div>/s,
        `<div id="schemesContainer">${schemesHtml}</div>`
      );

      // Footer for ProjectDetails
      projectDetailsHtml = projectDetailsHtml.replace(
        /id="footerCompanyLogo"/g,
        `id="footerCompanyLogo" src="${companyLogo}" ${
          companyLogo ? 'style="display: block;"' : 'style="display: none;"'
        }`
      );
      projectDetailsHtml = projectDetailsHtml.replace(
        /id="footerCompanyLogoFallback">A/g,
        `id="footerCompanyLogoFallback">${firstLetter}`
      );

      // Populate AffiliatedAdvisers
      const advisors = data.users?.advisors || [];
      const independentControllers = data.users?.independentControllers || [];
      const inspectors = data.users?.inspectors || [];

      // Advisors
      let advisorsHtml = "";
      advisors.forEach((advisor, index) => {
        advisorsHtml += `
          <div class="affiliated-advisers-section-header">
            <div class="affiliated-advisers-date-column">
              <span>DATE</span>
            </div>
            <div class="affiliated-advisers-section-title">
              <span>ADVISORS / ${advisor?.type || ""}</span>
            </div>
          </div>
          <div class="affiliated-advisers-fields">
            <div class="affiliated-advisers-field">
              <label>NAME:</label>
              <div class="affiliated-advisers-value">${advisor.name || ""}</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>CONTACT PERSON</label>
              <div class="affiliated-advisers-value">${
                advisor.contactPerson || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>CVR NO.:</label>
              <div class="affiliated-advisers-value">${advisor.cvr || ""}</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>ADDRESS:</label>
              <div class="affiliated-advisers-value">${
                advisor.address || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>POSTCODE:</label>
              <div class="affiliated-advisers-value">${
                advisor.postalCode || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>TELEPHONE:</label>
              <div class="affiliated-advisers-value">${
                advisor.phone || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>EMAIL</label>
              <div class="affiliated-advisers-value">${
                advisor.username || ""
              }</div>
            </div>
            ${
              index < advisors.length - 1
                ? '<hr style="margin: 10px 0; border: 1px solid #ccc;" />'
                : ""
            }
          </div>
        `;
      });
      affiliatedAdvisersHtml = affiliatedAdvisersHtml.replace(
        /<div class="affiliated-advisers-section" id="advisorsSection">.*?<\/div>/s,
        `<div class="affiliated-advisers-section" id="advisorsSection">${advisorsHtml}</div>`
      );

      // Independent Controllers
      let independentControllersHtml = "";
      independentControllers.forEach((controller, index) => {
        independentControllersHtml += `
          <div class="affiliated-advisers-fields">
            <div class="affiliated-advisers-field">
              <label>NAME:</label>
              <div class="affiliated-advisers-value">${
                controller.name || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>CONTACT PERSON</label>
              <div class="affiliated-advisers-value">${
                controller.contactPerson || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>CVR NO.:</label>
              <div class="affiliated-advisers-value">${
                controller.cvr || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>ADDRESS:</label>
              <div class="affiliated-advisers-value">${
                controller.address || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>POSTCODE:</label>
              <div class="affiliated-advisers-value">${
                controller.postalCode || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>TELEPHONE:</label>
              <div class="affiliated-advisers-value">${
                controller.contactPhone || controller.phone || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>EMAIL:</label>
              <div class="affiliated-advisers-value">${
                controller.username || ""
              }</div>
            </div>
            ${
              index < independentControllers.length - 1
                ? '<hr style="margin: 10px 0; border: 1px solid #ccc;" />'
                : ""
            }
          </div>
        `;
      });
      affiliatedAdvisersHtml = affiliatedAdvisersHtml.replace(
        /<div id="independentControllersContainer">.*?<\/div>/s,
        `<div id="independentControllersContainer">${independentControllersHtml}</div>`
      );

      // Inspectors
      let inspectorsHtml = "";
      inspectors.forEach((inspector, index) => {
        inspectorsHtml += `
          <div class="affiliated-advisers-fields">
            <div class="affiliated-advisers-field">
              <label>NAME:</label>
              <div class="affiliated-advisers-value">${
                inspector.name || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>CONTACT PERSON</label>
              <div class="affiliated-advisers-value">${
                inspector.contactPerson || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>CVR NO.:</label>
              <div class="affiliated-advisers-value">${
                inspector.cvr || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>ADDRESS:</label>
              <div class="affiliated-advisers-value">${
                inspector.address || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>POSTCODE:</label>
              <div class="affiliated-advisers-value">${
                inspector.postalCode || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>TELEPHONE</label>
              <div class="affiliated-advisers-value">${
                inspector.phone || ""
              }</div>
            </div>
            <div class="affiliated-advisers-field">
              <label>EMAIL</label>
              <div class="affiliated-advisers-value">${
                inspector.username || ""
              }</div>
            </div>
            ${
              index < inspectors.length - 1
                ? '<hr style="margin: 10px 0; border: 1px solid #ccc;" />'
                : ""
            }
          </div>
        `;
      });
      affiliatedAdvisersHtml = affiliatedAdvisersHtml.replace(
        /<div id="inspectorsContainer">.*?<\/div>/s,
        `<div id="inspectorsContainer">${inspectorsHtml}</div>`
      );

      // Footer for AffiliatedAdvisers
      affiliatedAdvisersHtml = affiliatedAdvisersHtml.replace(
        /id="footerCompanyLogo"/g,
        `id="footerCompanyLogo" src="${companyLogo}" ${
          companyLogo ? 'style="display: block;"' : 'style="display: none;"'
        }`
      );
      affiliatedAdvisersHtml = affiliatedAdvisersHtml.replace(
        /id="footerCompanyLogoFallback">A/g,
        `id="footerCompanyLogoFallback">${firstLetter}`
      );

      // Footer for DocumentsAndInformation
      documentsInfoHtml = documentsInfoHtml.replace(
        /id="footerCompanyLogo"/g,
        `id="footerCompanyLogo" src="${companyLogo}" ${
          companyLogo ? 'style="display: block;"' : 'style="display: none;"'
        }`
      );
      documentsInfoHtml = documentsInfoHtml.replace(
        /id="footerCompanyLogoFallback">A/g,
        `id="footerCompanyLogoFallback">${firstLetter}`
      );

      // Populate ReceivedCaseDocuments
      const documents = data.documents || [];
      const draws = data.draws || [];

      // Helper function to format date
      const formatDate = (dateString) => {
        if (!dateString) return "";
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        } catch (e) {
          return "";
        }
      };

      // Documents table
      let documentsTableRows = "";
      documents.forEach((doc) => {
        documentsTableRows += `
          <tr class="received-case-documents-data-row">
            <td>${formatDate(doc.uploadedAt)}</td>
            <td>${doc.description || doc.category || ""}</td>
            <td>${doc.originalName || doc.filename || ""}</td>
          </tr>
        `;
      });
      receivedCaseDocumentsHtml = receivedCaseDocumentsHtml.replace(
        /<tbody id="documentsTableBody">.*?<\/tbody>/s,
        `<tbody id="documentsTableBody">${documentsTableRows}</tbody>`
      );

      // Flatten all drawings (main + child)
      const allDrawings = [];
      draws.forEach((draw) => {
        if (Array.isArray(draw.mainDrawings)) {
          draw.mainDrawings.forEach((mainDraw) => {
            allDrawings.push({
              ...mainDraw,
              type: "Main Drawing",
              subscriptionName: "Main Drawing",
            });
          });
        }
        if (Array.isArray(draw.childDrawings)) {
          draw.childDrawings.forEach((childDraw) => {
            allDrawings.push({
              ...childDraw,
              type: "Child Drawing",
              subscriptionName: "Child Drawing",
            });
          });
        }
      });

      // Drawings table
      let drawingsTableRows = "";
      allDrawings.forEach((drawing) => {
        drawingsTableRows += `
          <tr class="received-case-documents-data-row">
            <td>${drawing.type || ""}</td>
            <td>${drawing.subscriptionName || ""}</td>
            <td>${
              drawing.originalname || drawing.original || drawing.filename || ""
            }</td>
          </tr>
        `;
      });
      if (allDrawings.length === 0) {
        drawingsTableRows = `
          <tr class="received-case-documents-data-row">
            <td></td>
            <td></td>
            <td></td>
          </tr>
        `;
      }
      receivedCaseDocumentsHtml = receivedCaseDocumentsHtml.replace(
        /<tbody id="drawingsTableBody">.*?<\/tbody>/s,
        `<tbody id="drawingsTableBody">${drawingsTableRows}</tbody>`
      );

      // Footer for ReceivedCaseDocuments
      receivedCaseDocumentsHtml = receivedCaseDocumentsHtml.replace(
        /id="footerCompanyLogo"/g,
        `id="footerCompanyLogo" src="${companyLogo}" ${
          companyLogo ? 'style="display: block;"' : 'style="display: none;"'
        }`
      );
      receivedCaseDocumentsHtml = receivedCaseDocumentsHtml.replace(
        /id="footerCompanyLogoFallback">A/g,
        `id="footerCompanyLogoFallback">${firstLetter}`
      );

      // Populate Checklist
      const checks = projectDetail.checks || [];
      let checklistTableRows = "";
      checks.forEach((check) => {
        checklistTableRows += `
          <tr class="checklist-data-row">
            <td class="checklist-document-cell">${check.name || ""}</td>
            <td class="checklist-approved-date-cell">${formatDate(
              check.approvedDate
            )}</td>
            <td class="checklist-note-cell">${check.approvalNote || ""}</td>
            <td class="checklist-approved-cell">${
              check.isAproved ? "Yes" : "No"
            }</td>
          </tr>
        `;
      });
      if (checks.length === 0) {
        checklistTableRows = `
          <tr class="checklist-data-row">
            <td class="checklist-document-cell"></td>
            <td class="checklist-approved-date-cell"></td>
            <td class="checklist-note-cell"></td>
            <td class="checklist-approved-cell"></td>
          </tr>
          <tr class="checklist-data-row">
            <td class="checklist-document-cell"></td>
            <td class="checklist-approved-date-cell"></td>
            <td class="checklist-note-cell"></td>
            <td class="checklist-approved-cell"></td>
          </tr>
          <tr class="checklist-data-row">
            <td class="checklist-document-cell"></td>
            <td class="checklist-approved-date-cell"></td>
            <td class="checklist-note-cell"></td>
            <td class="checklist-approved-cell"></td>
          </tr>
        `;
      }
      checklistHtml = checklistHtml.replace(
        /<tbody id="checklistTableBody">.*?<\/tbody>/s,
        `<tbody id="checklistTableBody">${checklistTableRows}</tbody>`
      );

      // Footer for Checklist
      checklistHtml = checklistHtml.replace(
        /id="footerCompanyLogo"/g,
        `id="footerCompanyLogo" src="${companyLogo}" ${
          companyLogo ? 'style="display: block;"' : 'style="display: none;"'
        }`
      );
      checklistHtml = checklistHtml.replace(
        /id="footerCompanyLogoFallback">A/g,
        `id="footerCompanyLogoFallback">${firstLetter}`
      );

      // Populate CompanyOrganization data
      const subcontractors = data.users?.subcontractors || [];
      const projectManagers = data.users?.projectManagers || [];
      // Note: safetyManagers, constructionManagers already declared above for ProjectDetails (line 382, 381)
      // Note: independentControllers already declared above for AffiliatedAdvisers (line 593)

      // Subcontractors
      let subcontractorsHtml = "";
      subcontractors.forEach((sub, index) => {
        subcontractorsHtml += `
          <div class="company-organization-fields">
            <div class="company-organization-field">
              <label>COMPANY NAME:</label>
              <div class="company-organization-value">${sub.name || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>CONTACT PERSON</label>
              <div class="company-organization-value">${
                sub.contactPerson || ""
              }</div>
            </div>
            <div class="company-organization-field">
              <label>CVR NO.:</label>
              <div class="company-organization-value">${sub.cvr || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>ADDRESS:</label>
              <div class="company-organization-value">${sub.address || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>POSTCODE:</label>
              <div class="company-organization-value">${
                sub.postalCode || ""
              }</div>
            </div>
            <div class="company-organization-field">
              <label>TELEPHONE:</label>
              <div class="company-organization-value">${sub.phone || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>EMAIL</label>
              <div class="company-organization-value">${
                sub.username || ""
              }</div>
            </div>
            ${
              index < subcontractors.length - 1
                ? '<hr style="margin: 10px 0; border: 1px solid #ccc;" />'
                : ""
            }
          </div>
        `;
      });
      companyOrgHtml = companyOrgHtml.replace(
        /<div id="subcontractorsContainer">.*?<\/div>/s,
        `<div id="subcontractorsContainer">${subcontractorsHtml}</div>`
      );

      // Project Managers
      let projectManagersHtml = "";
      projectManagers.forEach((pm, index) => {
        projectManagersHtml += `
          <div class="company-organization-fields-grid">
            <div class="company-organization-field">
              <label>NAME</label>
              <div class="company-organization-value">${pm.name || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>ROLE</label>
              <div class="company-organization-value">${
                pm.userRole || pm.role || ""
              }</div>
            </div>
            <div class="company-organization-field">
              <label>TELEPHONE:</label>
              <div class="company-organization-value">${pm.phone || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>EMAIL</label>
              <div class="company-organization-value">${pm.username || ""}</div>
            </div>
            ${
              index < projectManagers.length - 1
                ? '<hr style="gridColumn: 1 / -1; margin: 10px 0; border: 1px solid #ccc;" />'
                : ""
            }
          </div>
        `;
      });
      companyOrgHtml = companyOrgHtml.replace(
        /<div id="projectManagersContainer">.*?<\/div>/s,
        `<div id="projectManagersContainer">${projectManagersHtml}</div>`
      );

      // Safety Managers for Company Organization (different format than ProjectDetails)
      let safetyManagersHtml2 = "";
      safetyManagers.forEach((sm, index) => {
        safetyManagersHtml2 += `
          <div class="company-organization-fields-grid">
            <div class="company-organization-field">
              <label>NAME</label>
              <div class="company-organization-value">${sm.name || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>ROLE</label>
              <div class="company-organization-value">${
                sm.role || "Safety Coordinator"
              }</div>
            </div>
            <div class="company-organization-field">
              <label>TELEPHONE:</label>
              <div class="company-organization-value">${sm.phone || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>EMAIL</label>
              <div class="company-organization-value">${sm.username || ""}</div>
            </div>
            ${
              index < safetyManagers.length - 1
                ? '<hr style="gridColumn: 1 / -1; margin: 10px 0; border: 1px solid #ccc;" />'
                : ""
            }
          </div>
        `;
      });
      companyOrgHtml = companyOrgHtml.replace(
        /<div id="safetyManagersContainer">.*?<\/div>/s,
        `<div id="safetyManagersContainer">${safetyManagersHtml2}</div>`
      );

      // Subcontractor to Subcontractor (same data as subcontractors but with profession)
      let subcontractorToSubcontractorHtml = "";
      subcontractors.forEach((sub, index) => {
        const professionText = Array.isArray(sub.userProfession)
          ? sub.userProfession.map((p) => p.GroupName).join(", ")
          : "";
        subcontractorToSubcontractorHtml += `
          <div class="company-organization-fields">
            <div class="company-organization-field">
              <label>NAME:</label>
              <div class="company-organization-value">${sub.name || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>CONTACT PERSON</label>
              <div class="company-organization-value">${
                sub.contactPerson || ""
              }</div>
            </div>
            <div class="company-organization-field">
              <label>CVR NO.:</label>
              <div class="company-organization-value">${sub.cvr || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>ADDRESS:</label>
              <div class="company-organization-value">${sub.address || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>POSTCODE:</label>
              <div class="company-organization-value">${
                sub.postalCode || ""
              }</div>
            </div>
            <div class="company-organization-field">
              <label>TELEPHONE:</label>
              <div class="company-organization-value">${sub.phone || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>EMAIL</label>
              <div class="company-organization-value">${
                sub.username || ""
              }</div>
            </div>
            <div class="company-organization-field">
              <label>PROFESSION</label>
              <div class="company-organization-value">${professionText}</div>
            </div>
            ${
              index < subcontractors.length - 1
                ? '<hr style="margin: 10px 0; border: 1px solid #ccc;" />'
                : ""
            }
          </div>
        `;
      });
      companyOrgHtml = companyOrgHtml.replace(
        /<div id="subcontractorToSubcontractorContainer">.*?<\/div>/s,
        `<div id="subcontractorToSubcontractorContainer">${subcontractorToSubcontractorHtml}</div>`
      );

      // Independent Controllers for Company Organization (different format than AffiliatedAdvisers)
      let independentControllersHtml2 = "";
      independentControllers.forEach((ic, index) => {
        independentControllersHtml2 += `
          <div class="company-organization-fields">
            <div class="company-organization-field">
              <label>NAME:</label>
              <div class="company-organization-value">${ic.name || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>CONTACT PERSON</label>
              <div class="company-organization-value">${
                ic.contactPerson || ""
              }</div>
            </div>
            <div class="company-organization-field">
              <label>CVR NO.:</label>
              <div class="company-organization-value">${ic.cvr || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>ADDRESS:</label>
              <div class="company-organization-value">${ic.address || ""}</div>
            </div>
            <div class="company-organization-field">
              <label>POSTCODE:</label>
              <div class="company-organization-value">${
                ic.postalCode || ""
              }</div>
            </div>
            ${
              index < independentControllers.length - 1
                ? '<hr style="margin: 10px 0; border: 1px solid #ccc;" />'
                : ""
            }
          </div>
        `;
      });
      companyOrgHtml = companyOrgHtml.replace(
        /<div id="independentControllersContainer">.*?<\/div>/s,
        `<div id="independentControllersContainer">${independentControllersHtml2}</div>`
      );

      // Populate EmployeeAndProduction workers table
      const workers = data.users?.workers || [];
      let workersTableRows = "";
      workers.forEach((worker, index) => {
        const photoSrc =
          worker.picture?.s3Location ||
          (worker.picture ? `/uploads/${worker.picture}` : "");
        const photoDisplay = photoSrc
          ? 'style="display: block;"'
          : 'style="display: none;"';

        workersTableRows += `
          <tr class="employee-data-row">
            <td class="employee-id-cell">07.${String(index + 1).padStart(
              2,
              "0"
            )}</td>
            <td class="employee-role-cell">${
              worker.role || worker.userRole || ""
            }</td>
            <td class="employee-name-cell">${worker.name || ""}</td>
            <td class="employee-email-cell">${worker.username || ""}</td>
            <td class="employee-mobile-cell">${worker.phone || ""}</td>
            <td class="employee-photo-cell">
              ${
                photoSrc
                  ? `
                <div class="employee-photo-container">
                  <img src="${photoSrc}" alt="${
                      worker.name || "Worker"
                    } Photo" class="employee-photo" ${photoDisplay} onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                  <div class="employee-photo-placeholder" style="display: none;">Photo/ID</div>
                </div>
              `
                  : `
                <span class="employee-no-photo">No Photo</span>
              `
              }
            </td>
          </tr>
        `;
      });

      // If no workers, add empty row
      if (workers.length === 0) {
        workersTableRows = `
          <tr class="employee-data-row">
            <td class="employee-id-cell"></td>
            <td class="employee-role-cell"></td>
            <td class="employee-name-cell"></td>
            <td class="employee-email-cell"></td>
            <td class="employee-mobile-cell"></td>
            <td class="employee-photo-cell"></td>
          </tr>
        `;
      }

      employeeProductionHtml = employeeProductionHtml.replace(
        /<tbody id="workersTableBody">.*?<\/tbody>/s,
        `<tbody id="workersTableBody">${workersTableRows}</tbody>`
      );

      // Populate ProjectManagementSupervision
      const supervisionDetails = data.supervisionDetails || [];

      // Note: formatDate already declared above (line 809) for ReceivedCaseDocuments

      // Group supervision details by section
      const groupedSections = {};
      supervisionDetails.forEach((detail) => {
        const section = detail.checkDetails?.section || "Unknown Section";
        if (!groupedSections[section]) {
          groupedSections[section] = [];
        }
        groupedSections[section].push(detail);
      });

      // Convert to array format for rendering
      const supervisionSections = Object.entries(groupedSections).map(
        ([title, items]) => ({
          title: title.toUpperCase(),
          items: items.map((item) => ({
            pos: item.checkDetails?.pos || "",
            what: item.checkDetails?.what || "",
            where: item.checkDetails?.where || "",
            when: item.checkDetails?.when || "",
            howMuch: item.note || "100%",
            performed: formatDate(item.approvedDate),
          })),
        })
      );

      // Generate table rows
      let supervisionTableRows = "";
      supervisionSections.forEach((section, sectionIndex) => {
        // Section Header Row
        supervisionTableRows += `
          <tr class="project-management-supervision-section-header-row">
            <td colspan="6" class="project-management-supervision-section-title">
              ${section.title}
            </td>
          </tr>
        `;
        // Section Items
        section.items.forEach((item, itemIndex) => {
          supervisionTableRows += `
            <tr class="project-management-supervision-data-row">
              <td class="project-management-supervision-pos-cell">${item.pos}</td>
              <td class="project-management-supervision-what-cell">${item.what}</td>
              <td class="project-management-supervision-where-cell">${item.where}</td>
              <td class="project-management-supervision-when-cell">${item.when}</td>
              <td class="project-management-supervision-how-much-cell">${item.howMuch}</td>
              <td class="project-management-supervision-performed-cell">${item.performed}</td>
            </tr>
          `;
        });
      });

      // If no supervision details, add empty row
      if (supervisionSections.length === 0) {
        supervisionTableRows = `
          <tr class="project-management-supervision-data-row">
            <td class="project-management-supervision-pos-cell"></td>
            <td class="project-management-supervision-what-cell"></td>
            <td class="project-management-supervision-where-cell"></td>
            <td class="project-management-supervision-when-cell"></td>
            <td class="project-management-supervision-how-much-cell"></td>
            <td class="project-management-supervision-performed-cell"></td>
          </tr>
        `;
      }

      projectManagementHtml = projectManagementHtml.replace(
        /<tbody id="supervisionTableBody">.*?<\/tbody>/s,
        `<tbody id="supervisionTableBody">${supervisionTableRows}</tbody>`
      );

      // Populate StandardForControlPlan
      const tasks = projectDetail.tasks || [];
      const selectedProfession = req.query.profession;

      // Filter tasks by profession and type
      const tasksForProfession = tasks.filter(
        (task) => task.SubjectMatterId === selectedProfession
      );
      const receivingTasks = tasksForProfession.filter(
        (task) => task.Type === "Receive"
      );
      const processTasks = tasksForProfession.filter(
        (task) => task.Type === "Process"
      );
      const finalTasks = tasksForProfession.filter(
        (task) => task.Type === "Final"
      );

      // Helper function to get circle color
      const getCircleColor = (color) => {
        switch (color) {
          case "purple":
            return "#8b5cf6";
          case "yellow":
            return "#f59e0b";
          case "green":
            return "#10b981";
          default:
            return "#6b7280";
        }
      };

      // Generate control plan sections
      const controlPlanSections = [
        {
          title: "14.?? RECEIVING CONTROL",
          color: "purple",
          items: receivingTasks.map((task, index) => ({
            pos: `14.${index + 1}?`,
            activity: task.Activity || "",
            acceptanceCriteria: task["Acceptance Criteria"] || "",
            time: task.Time || "",
            circumference: task.Scope || "",
            method: task.Method || "",
            documentation: task["Documentation Requirements"] || "",
            performed: task.isSubmitted ? "✓" : "",
          })),
        },
        {
          title: "15.1.?? PROCESS CONTROL",
          color: "yellow",
          items: processTasks.map((task, index) => ({
            pos: `15.1.${index + 1}?`,
            activity: task.Activity || "",
            acceptanceCriteria: task["Acceptance Criteria"] || "",
            time: task.Time || "",
            circumference: task.Scope || "",
            method: task.Method || "",
            documentation: task["Documentation Requirements"] || "",
            performed: task.isSubmitted ? "✓" : "",
          })),
        },
        {
          title: "16.2.?? END CHECK",
          color: "green",
          items: finalTasks.map((task, index) => ({
            pos: `16.2.${index + 1}?`,
            activity: task.Activity || "",
            acceptanceCriteria: task["Acceptance Criteria"] || "",
            time: task.Time || "",
            circumference: task.Scope || "",
            method: task.Method || "",
            documentation: task["Documentation Requirements"] || "",
            performed: task.isSubmitted ? "✓" : "",
          })),
        },
      ];

      // Generate table rows
      let standardControlPlanTableRows = "";
      controlPlanSections.forEach((section, sectionIndex) => {
        // Section Header Row
        standardControlPlanTableRows += `
          <tr class="standard-control-plan-section-header-row">
            <td colspan="7" class="standard-control-plan-section-title">
              ${section.title}
            </td>
            <td class="standard-control-plan-section-circle">
              <div class="standard-control-plan-circle" style="background-color: ${getCircleColor(
                section.color
              )};"></div>
            </td>
          </tr>
        `;
        // Section Items
        section.items.forEach((item, itemIndex) => {
          standardControlPlanTableRows += `
            <tr class="standard-control-plan-data-row">
              <td class="standard-control-plan-pos-cell">${item.pos}</td>
              <td class="standard-control-plan-activity-cell">${item.activity}</td>
              <td class="standard-control-plan-criteria-cell">${item.acceptanceCriteria}</td>
              <td class="standard-control-plan-time-cell">${item.time}</td>
              <td class="standard-control-plan-circumference-cell">${item.circumference}</td>
              <td class="standard-control-plan-method-cell">${item.method}</td>
              <td class="standard-control-plan-documentation-cell">${item.documentation}</td>
              <td class="standard-control-plan-performed-cell">${item.performed}</td>
            </tr>
          `;
        });
      });

      // If no tasks, add empty row
      if (controlPlanSections.every((section) => section.items.length === 0)) {
        standardControlPlanTableRows = `
          <tr class="standard-control-plan-data-row">
            <td class="standard-control-plan-pos-cell"></td>
            <td class="standard-control-plan-activity-cell"></td>
            <td class="standard-control-plan-criteria-cell"></td>
            <td class="standard-control-plan-time-cell"></td>
            <td class="standard-control-plan-circumference-cell"></td>
            <td class="standard-control-plan-method-cell"></td>
            <td class="standard-control-plan-documentation-cell"></td>
            <td class="standard-control-plan-performed-cell"></td>
          </tr>
        `;
      }

      standardControlHtml = standardControlHtml.replace(
        /<tbody id="standardControlPlanTableBody">.*?<\/tbody>/s,
        `<tbody id="standardControlPlanTableBody">${standardControlPlanTableRows}</tbody>`
      );

      // Populate ReceptionControl
      // Filter only submitted tasks
      const submittedTasks = tasksForProfession.filter(
        (task) => task.isSubmitted === true
      );

      // Helper function to get control type number
      const getControlTypeNumber = (type) => {
        switch (type) {
          case "Receive":
            return "7.4";
          case "Process":
            return "7.5";
          case "Final":
            return "7.6";
          default:
            return "";
        }
      };

      // Group tasks by submitter
      const workerTasks = [];
      const independentControllerTasks = [];

      submittedTasks.forEach((task) => {
        if (task.taskEntries && task.taskEntries.length > 0) {
          const workerEntries = task.taskEntries.filter(
            (entry) => entry.user && entry.user.role === "Worker"
          );
          const independentEntries = task.taskEntries.filter(
            (entry) =>
              entry.independentController &&
              entry.independentController.role === "Independent Controller"
          );

          if (workerEntries.length > 0) {
            workerTasks.push({
              ...task,
              taskEntries: workerEntries,
            });
          }

          if (independentEntries.length > 0) {
            independentControllerTasks.push({
              ...task,
              taskEntries: independentEntries,
            });
          }
        }
      });

      const receptionControlSections = [];

      // Worker section
      if (workerTasks.length > 0) {
        const workerReceivingTasks = workerTasks.filter(
          (task) => task.Type === "Receive"
        );
        const workerProcessTasks = workerTasks.filter(
          (task) => task.Type === "Process"
        );
        const workerFinalTasks = workerTasks.filter(
          (task) => task.Type === "Final"
        );
        const allWorkerTasks = [
          ...workerReceivingTasks,
          ...workerProcessTasks,
          ...workerFinalTasks,
        ];

        receptionControlSections.push({
          title: "WORKER",
          color: "blue",
          items: allWorkerTasks.map((task) => ({
            ...task,
            pos: `${getControlTypeNumber(task.Type)}.${
              task?.Index?.split("_")?.[1]
            } `,
            activity: task.Activity || "",
            acceptanceCriteria: task["Acceptance Criteria"] || "",
            time: task.Time || "",
            circumference: task.Scope || "",
            method: task.Method || "",
            documentation: task["Documentation Requirements"] || "",
            performed: "✓",
            controlType: task.Type || "",
          })),
        });
      }

      // Independent Controller section
      if (independentControllerTasks.length > 0) {
        const icReceivingTasks = independentControllerTasks.filter(
          (task) => task.Type === "Receive"
        );
        const icProcessTasks = independentControllerTasks.filter(
          (task) => task.Type === "Process"
        );
        const icFinalTasks = independentControllerTasks.filter(
          (task) => task.Type === "Final"
        );
        const allIcTasks = [
          ...icReceivingTasks,
          ...icProcessTasks,
          ...icFinalTasks,
        ];

        receptionControlSections.push({
          title: "INDEPENDENT CONTROLLER",
          color: "red",
          items: allIcTasks.map((task) => ({
            ...task,
            pos: `${getControlTypeNumber(task.Type)}.${
              task?.Index?.split("_")?.[1]
            } `,
            activity: task.Activity || "",
            acceptanceCriteria: task["Acceptance Criteria"] || "",
            time: task.Time || "",
            circumference: task.Scope || "",
            method: task.Method || "",
            documentation: task["Documentation Requirements"] || "",
            performed: "✓",
            controlType: task.Type || "",
          })),
        });
      }

      // Helper function to get circle color for reception control
      const getReceptionControlCircleColor = (color) => {
        switch (color) {
          case "blue":
            return "#3b82f6";
          case "red":
            return "#ef4444";
          case "purple":
            return "#8b5cf6";
          case "yellow":
            return "#f59e0b";
          case "green":
            return "#10b981";
          default:
            return "#6b7280";
        }
      };

      // Generate table rows
      let receptionControlTableRows = "";
      receptionControlSections.forEach((section, sectionIndex) => {
        // Section Header Row
        receptionControlTableRows += `
          <tr class="standard-control-plan-section-header-row">
            <td colspan="8" class="standard-control-plan-section-title">
              ${section.title}
            </td>
            <td class="standard-control-plan-section-circle">
              <div class="standard-control-plan-circle" style="background-color: ${getReceptionControlCircleColor(
                section.color
              )};"></div>
            </td>
          </tr>
        `;
        // Section Items
        section.items.forEach((item, itemIndex) => {
          receptionControlTableRows += `
            <tr class="standard-control-plan-data-row">
              <td class="standard-control-plan-pos-cell">${item.pos}</td>
              <td class="standard-control-plan-control-type-cell">${item.controlType}</td>
              <td class="standard-control-plan-activity-cell">${item.activity}</td>
              <td class="standard-control-plan-criteria-cell">${item.acceptanceCriteria}</td>
              <td class="standard-control-plan-time-cell">${item.time}</td>
              <td class="standard-control-plan-circumference-cell">${item.circumference}</td>
              <td class="standard-control-plan-method-cell">${item.method}</td>
              <td class="standard-control-plan-documentation-cell">${item.documentation}</td>
              <td class="standard-control-plan-performed-cell">${item.performed}</td>
            </tr>
          `;

          // Documentation rows for task entries (simplified without iframes/images)
          if (item.taskEntries && item.taskEntries.length > 0) {
            item.taskEntries.forEach((taskEntry, taskEntryIndex) => {
              const drawing = taskEntry?.drawing;
              const buildingParts = taskEntry?.buildingParts;
              const annotatedPdfs = taskEntry?.annotatedPdfs;
              const markPictureObjects = taskEntry?.markPictureObjects;

              const hasMainDrawings = drawing?.mainDrawings?.length > 0;
              const hasChildDrawings = drawing?.childDrawings?.length > 0;
              const hasBuildingPartImage =
                buildingParts?.buildingPartDetail?.image?.s3Location;
              const hasAnnotatedPdfs = annotatedPdfs?.length > 0;
              const hasMarkPictures = markPictureObjects?.length > 0;

              if (
                hasMainDrawings ||
                hasChildDrawings ||
                hasBuildingPartImage ||
                hasAnnotatedPdfs ||
                hasMarkPictures
              ) {
                receptionControlTableRows += `
                  <tr class="standard-control-plan-drawing-row">
                    <td colspan="9" class="standard-control-plan-drawing-cell">
                      <div class="drawing-container">
                        ${
                          hasMainDrawings
                            ? drawing.mainDrawings
                                .map(
                                  (mainDrawing, mainIndex) => `
                              <div class="drawing-item">
                                <h4>Main Drawing ${mainIndex + 1}: ${
                                    mainDrawing.originalname ||
                                    mainDrawing.original ||
                                    mainDrawing.filename ||
                                    "Unknown"
                                  }</h4>
                                <iframe
                                  src="${
                                    mainDrawing.s3Location
                                  }#toolbar=0&navpanes=0&scrollbar=0&view=FitH"
                                  width="100%"
                                  height="400"
                                  style="border: 1px solid #ccc; margin-bottom: 10px;"
                                  title="Main Drawing ${mainIndex + 1}"
                                  scrolling="no"
                                ></iframe>
                              </div>
                            `
                                )
                                .join("")
                            : ""
                        }
                        ${
                          hasChildDrawings
                            ? drawing.childDrawings
                                .map(
                                  (childDrawing, childIndex) => `
                              <div class="drawing-item">
                                <h4>Child Drawing ${childIndex + 1}: ${
                                    childDrawing.originalname ||
                                    childDrawing.original ||
                                    childDrawing.filename ||
                                    "Unknown"
                                  }</h4>
                                <iframe
                                  src="${
                                    childDrawing.s3Location
                                  }#toolbar=0&navpanes=0&scrollbar=0&view=FitH"
                                  width="100%"
                                  height="400"
                                  style="border: 1px solid #ccc; margin-bottom: 10px;"
                                  title="Child Drawing ${childIndex + 1}"
                                  scrolling="no"
                                ></iframe>
                              </div>
                            `
                                )
                                .join("")
                            : ""
                        }
                        ${
                          hasBuildingPartImage
                            ? `
                              <div class="drawing-item">
                                <h4>Building Part: ${buildingParts.buildingPartDetail.name}</h4>
                                <img
                                  src="${buildingParts.buildingPartDetail.image.s3Location}"
                                  alt="Building Part"
                                  style="width: 100%; height: auto; object-fit: contain; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 10px;"
                                />
                              </div>
                            `
                            : ""
                        }
                        ${
                          hasAnnotatedPdfs
                            ? `
                              <div class="drawing-item">
                                <h4>Annotated Drawings</h4>
                                ${annotatedPdfs
                                  .map(
                                    (pdf, index) => `
                                  <div style="margin-bottom: 15px;">
                                    <img
                                      src="${pdf.s3Location}"
                                      alt="Annotated ${index + 1}"
                                      style="width: 100%; height: auto; object-fit: contain; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 5px;"
                                    />
                                    <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">${
                                      pdf.originalname
                                    }</p>
                                  </div>
                                `
                                  )
                                  .join("")}
                              </div>
                            `
                            : ""
                        }
                        ${
                          hasMarkPictures
                            ? `
                              <div class="drawing-item">
                                <h4>Mark Pictures</h4>
                                ${markPictureObjects
                                  .map(
                                    (pic, index) => `
                                  <div style="margin-bottom: 15px;">
                                    <img
                                      src="${pic.s3Location}"
                                      alt="Mark ${index + 1}"
                                      style="width: 100%; height: auto; object-fit: contain; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 5px;"
                                    />
                                    ${
                                      pic.description
                                        ? `<p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">${pic.description}</p>`
                                        : ""
                                    }
                                  </div>
                                `
                                  )
                                  .join("")}
                              </div>
                            `
                            : ""
                        }
                      </div>
                    </td>
                  </tr>
                `;
              }
            });
          }
        });
      });

      // If no submitted tasks, add empty row
      if (receptionControlSections.length === 0) {
        receptionControlTableRows = `
          <tr class="standard-control-plan-data-row">
            <td class="standard-control-plan-pos-cell"></td>
            <td class="standard-control-plan-control-type-cell"></td>
            <td class="standard-control-plan-activity-cell"></td>
            <td class="standard-control-plan-criteria-cell"></td>
            <td class="standard-control-plan-time-cell"></td>
            <td class="standard-control-plan-circumference-cell"></td>
            <td class="standard-control-plan-method-cell"></td>
            <td class="standard-control-plan-documentation-cell"></td>
            <td class="standard-control-plan-performed-cell"></td>
          </tr>
        `;
      }

      receptionControlHtml = receptionControlHtml.replace(
        /<tbody id="receptionControlTableBody">.*?<\/tbody>/s,
        `<tbody id="receptionControlTableBody">${receptionControlTableRows}</tbody>`
      );

      // Populate AddressNotesTable
      // Helper function to fetch notes from database
      const addFilters = (query, companyId, projectId) => {
        if (companyId) query.companyId = companyId;
        if (projectId) query.projectId = projectId;
        return query;
      };

      const notesQuery = {
        companyId,
        projectsId: projectId,
      };
      const notes = await db.collection("notes").find(notesQuery).toArray();

      // Generate table rows for notes
      let addressNotesTableRows = "";
      notes.forEach((note, index) => {
        const noteDate = note.createdAt ? formatDate(note.createdAt) : "";
        addressNotesTableRows += `
          <tr>
            <td>${note.item || "-"}</td>
            <td>${note.users?.name || "-"}</td>
            <td>${noteDate}</td>
            <td>${note.address || "-"}</td>
            <td>
              <button 
                onclick="window.open('http://localhost:3000/supervision-note/${
                  note._id
                }?companyId=${companyId}&projectId=${projectId}', '_blank')"
                style="
                  background-color: #1e3a8a; 
                  color: white; 
                  border: none; 
                  padding: 8px 16px; 
                  border-radius: 4px; 
                  cursor: pointer;
                  font-size: 14px;
                "
                onmouseover="this.style.backgroundColor='#1e40af'"
                onmouseout="this.style.backgroundColor='#1e3a8a'"
              >
                Show Note
              </button>
            </td>
          </tr>
        `;
      });

      // If no notes, add empty row
      if (notes.length === 0) {
        addressNotesTableRows = `
          <tr>
            <td colspan="5" style="text-align: center;">No address notes found for this project.</td>
          </tr>
        `;
      }

      // Read address notes HTML
      const addressNotesPath = path.join(
        __dirname,
        "abdullahksreport",
        "address-notes.html"
      );
      let addressNotesHtml = fs.readFileSync(addressNotesPath, "utf8");

      addressNotesHtml = addressNotesHtml.replace(
        /<tbody id="addressNotesTableBody">.*?<\/tbody>/s,
        `<tbody id="addressNotesTableBody">${addressNotesTableRows}</tbody>`
      );

      // Fetch New Agreement data from "news" collection
      const newsQuery = {};
      if (companyId) newsQuery.companyId = companyId;
      if (projectId) newsQuery.projectsId = projectId;

      const newsArray = await db.collection("news").find(newsQuery).toArray();

      // Enrich news items with project names
      for (const item of newsArray) {
        if (item.projectsId && item.projectsId.length > 0) {
          const validProjectIds = item.projectsId.filter(ObjectId.isValid);
          const objectIds = validProjectIds.map((id) => new ObjectId(id));

          const projectsArray = await db
            .collection("projects")
            .find({ _id: { $in: objectIds } })
            .toArray();

          const projectNames = projectsArray
            .map((proj) => proj.name)
            .join(", ");
          item.projectNames = projectNames;
        }
      }

      // Generate New Agreement table rows
      let newAgreementTableRows = "";
      if (newsArray.length > 0) {
        newsArray.forEach((agreement, index) => {
          newAgreementTableRows += `
          <tr>
            <td>${agreement.item || "-"}</td>
            <td>${agreement.supplementory || "-"}</td>
            <td>${agreement.projectNames || "-"}</td>
            <td>${
              agreement.createdAt
                ? new Date(agreement.createdAt).toLocaleDateString("en-GB")
                : "-"
            }</td>
            <td>
              <button class="show-note-btn" onclick="window.open('/supervision-note/${
                agreement._id
              }?companyId=${companyId}&projectId=${projectId}&source=NewAgreementTable', '_blank')" style="background-color: #1e3a8a; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
                Show Agreement
              </button>
            </td>
          </tr>
        `;
        });
      } else {
        newAgreementTableRows = `
          <tr>
            <td colspan="5" style="text-align: center;">No new agreements found for this project.</td>
          </tr>
        `;
      }

      // Read new agreement HTML
      const newAgreementPath = path.join(
        __dirname,
        "abdullahksreport",
        "new-agreement.html"
      );
      let newAgreementHtml = fs.readFileSync(newAgreementPath, "utf8");

      newAgreementHtml = newAgreementHtml.replace(
        /<tbody id="newAgreementTableBody">.*?<\/tbody>/s,
        `<tbody id="newAgreementTableBody">${newAgreementTableRows}</tbody>`
      );

      // Populate footers for remaining static pages
      const updatePageFooter = (html) => {
        html = html.replace(
          /id="footerCompanyLogo"/g,
          `id="footerCompanyLogo" src="${companyLogo}" ${
            companyLogo ? 'style="display: block;"' : 'style="display: none;"'
          }`
        );
        html = html.replace(
          /id="footerCompanyLogoFallback">A/g,
          `id="footerCompanyLogoFallback">${firstLetter}`
        );
        return html;
      };

      companyOrgHtml = updatePageFooter(companyOrgHtml);
      employeeProductionHtml = updatePageFooter(employeeProductionHtml);
      projectManagementHtml = updatePageFooter(projectManagementHtml);
      descriptionControlHtml = updatePageFooter(descriptionControlHtml);
      standardControlHtml = updatePageFooter(standardControlHtml);
      planTendersHtml = updatePageFooter(planTendersHtml);
      receptionControlHtml = updatePageFooter(receptionControlHtml);
      addressNotesHtml = updatePageFooter(addressNotesHtml);
      newAgreementHtml = updatePageFooter(newAgreementHtml);

      // Combine all pages
      const combinedHtml =
        reportPage1Html +
        tocHtml +
        projectDetailsHtml +
        affiliatedAdvisersHtml +
        documentsInfoHtml +
        receivedCaseDocumentsHtml +
        checklistHtml +
        companyOrgHtml +
        employeeProductionHtml +
        projectManagementHtml +
        descriptionControlHtml +
        standardControlHtml +
        planTendersHtml +
        receptionControlHtml +
        addressNotesHtml +
        newAgreementHtml;

      // Wrap in full HTML document
      const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KS Report - Abdullah</title>
    <link rel="stylesheet" href="abdullahksreport/style.css">
</head>
<body>
    ${combinedHtml}
</body>
</html>
      `;

      res.send(fullHtml);
    } catch (err) {
      console.error("abdullahksreport.html error:", err);
      return res.status(500).send(`
        <html>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h2>Error Loading Report</h2>
            <p>${err.message}</p>
          </body>
        </html>
      `);
    }
  });

  // GET route to render supervision note HTML
  router.get("/supervision-note/:noteId", async (req, res) => {
    try {
      const { noteId } = req.params;
      const { companyId, projectId, source } = req.query;

      // Determine which collection to query based on the source
      const isAgreement =
        source === "NewAgreementTable" || source === "agreement";

      const collectionName = isAgreement ? "news" : "notes";
      let note = await db
        .collection(collectionName)
        .findOne({ _id: new ObjectId(noteId) });

      if (!note) {
        return res.status(404).send(`
          <html>
            <body style="font-family: Arial; padding: 40px; text-align: center;">
              <h2>${isAgreement ? "Agreement" : "Note"} Not Found</h2>
              <p>No ${
                isAgreement ? "agreement" : "supervision note"
              } found with the given ID: ${noteId}</p>
              <p>Source parameter: ${source || "not provided"}</p>
              <p>Collection checked: ${collectionName}</p>
              <p>Is Agreement: ${isAgreement}</p>
            </body>
          </html>
        `);
      }

      // Fetch project and company details
      const data = await fetchKsReportData(db, companyId, projectId);

      // Read supervision note HTML template
      const supervisionNotePath = path.join(
        __dirname,
        "abdullahksreport",
        "supervision-note.html"
      );
      let supervisionNoteHtml = fs.readFileSync(supervisionNotePath, "utf8");

      // Helper function to format date
      const formatDate = (dateString) => {
        if (!dateString) return "";
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        } catch (e) {
          return "";
        }
      };

      // Populate fields - handle both notes and agreements
      // isAgreement is already set based on source parameter above

      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="subjectField"></div>',
        `id="subjectField">${note.item || ""}</div>`
      );
      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="mailSentDateField"></div>',
        `id="mailSentDateField">${formatDate(note.createdAt)}</div>`
      );
      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="projectNameField"></div>',
        `id="projectNameField">${data.projectDetail?.name || ""}</div>`
      );
      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="customerField"></div>',
        `id="customerField">${data.companyDetails?.name || ""}</div>`
      );
      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="addressField"></div>',
        `id="addressField">${data.companyDetails?.address || ""}</div>`
      );

      // Handle user info - for agreements, there might not be users field
      if (isAgreement) {
        // For agreements, try to get user info from the note if available
        supervisionNoteHtml = supervisionNoteHtml.replace(
          'id="recipientNameField"></div>',
          `id="recipientNameField">${
            note.users?.name || note.projectManager?.name || ""
          }</div>`
        );
        supervisionNoteHtml = supervisionNoteHtml.replace(
          'id="recipientEmailField"></div>',
          `id="recipientEmailField">${
            note.users?.username || note.projectManager?.username || ""
          }</div>`
        );
        supervisionNoteHtml = supervisionNoteHtml.replace(
          'id="userRoleField"></div>',
          `id="userRoleField">${note.users?.userRole || ""}</div>`
        );
      } else {
        supervisionNoteHtml = supervisionNoteHtml.replace(
          'id="recipientNameField"></div>',
          `id="recipientNameField">${note.users?.name || ""}</div>`
        );
        supervisionNoteHtml = supervisionNoteHtml.replace(
          'id="recipientEmailField"></div>',
          `id="recipientEmailField">${note.users?.username || ""}</div>`
        );
        supervisionNoteHtml = supervisionNoteHtml.replace(
          'id="userRoleField"></div>',
          `id="userRoleField">${note.users?.userRole || ""}</div>`
        );
      }

      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="handicraftField"></div>',
        `id="handicraftField">${
          note.profession?.GroupName || note.supplementory || ""
        }</div>`
      );
      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="inspectedDateField"></div>',
        `id="inspectedDateField">${formatDate(note.createdAt)}</div>`
      );
      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="followUpField"></div>',
        `id="followUpField">${
          note.comment && note.comment !== "null" ? note.comment : ""
        }</div>`
      );
      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="createdDateField"></div>',
        `id="createdDateField">${formatDate(
          note.createdAt || note.createdAt
        )}</div>`
      );
      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="preparedByField"></div>',
        `id="preparedByField">${data.companyDetails?.name || ""}</div>`
      );
      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="projectIdField"></div>',
        `id="projectIdField">${data.projectDetail?._id || ""}</div>`
      );
      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="buildingPartField"></div>',
        `id="buildingPartField">${
          note.buildingPart?.buildingPartDetail?.name || ""
        }</div>`
      );
      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="professionField"></div>',
        `id="professionField">${note.profession?.SubjectMatterId || ""}</div>`
      );
      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="projectManagerField"></div>',
        `id="projectManagerField">${note.projectManager?.name || ""}</div>`
      );
      supervisionNoteHtml = supervisionNoteHtml.replace(
        'id="noteIdField"></div>',
        `id="noteIdField">${note._id || ""}</div>`
      );

      // Populate documentation section
      let documentationHtml = "";

      // Main Drawings
      if (note.drawing?.mainDrawings && note.drawing.mainDrawings.length > 0) {
        note.drawing.mainDrawings.forEach((mainDrawing, index) => {
          documentationHtml += `
            <div class="supervision-note-content-box">
              <div style="padding: 15px;">
                <h4 style="margin-bottom: 10px; font-size: 14px; font-weight: 600; color: #374151;">
                  Main Drawing: ${
                    mainDrawing.originalname ||
                    mainDrawing.original ||
                    mainDrawing.filename ||
                    "Unknown"
                  }
                </h4>
                <iframe
                  src="${
                    mainDrawing.s3Location
                  }#toolbar=0&navpanes=0&scrollbar=0"
                  style="width: 100%; height: 1000px; border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden;"
                  scrolling="no"
                  title="Main Drawing ${index + 1}"
                ></iframe>
              </div>
            </div>
          `;
        });
      }

      // Building Part Image
      if (note.buildingPart?.buildingPartDetail?.image?.s3Location) {
        documentationHtml += `
          <div class="supervision-note-content-box">
            <div style="padding: 15px;">
              <h4 style="margin-bottom: 10px; font-size: 14px; font-weight: 600; color: #374151;">
                Building Part: ${note.buildingPart.buildingPartDetail.name}
              </h4>
              <img
                src="${note.buildingPart.buildingPartDetail.image.s3Location}"
                alt="Building Part"
                style="width: 100%; height: auto; object-fit: contain; border: 1px solid #d1d5db; border-radius: 4px;"
              />
            </div>
          </div>
        `;
      }

      // Annotated PDFs
      if (note.annotatedPdfs && note.annotatedPdfs.length > 0) {
        documentationHtml += `
          <div class="supervision-note-content-box">
            <div style="padding: 15px;">
              <h4 style="margin-bottom: 10px; font-size: 14px; font-weight: 600; color: #374151;">Annotated Drawings</h4>
              ${note.annotatedPdfs
                .map(
                  (pdf) => `
                <div style="margin-bottom: 15px;">
                  <img
                    src="${pdf.s3Location}"
                    alt="Annotated"
                    style="width: 100%; height: auto; object-fit: contain; border: 1px solid #d1d5db; border-radius: 4px;"
                  />
                  <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">${pdf.originalname}</p>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `;
      }

      // Mark Pictures
      if (note.markPictureObjects && note.markPictureObjects.length > 0) {
        documentationHtml += `
          <div class="supervision-note-content-box">
            <div style="padding: 15px;">
              <h4 style="margin-bottom: 10px; font-size: 14px; font-weight: 600; color: #374151;">Mark Pictures</h4>
              ${note.markPictureObjects
                .map(
                  (pic) => `
                <div style="margin-bottom: 15px;">
                  <img
                    src="${pic.s3Location}"
                    alt="Mark"
                    style="width: 100%; height: auto; object-fit: contain; border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 5px;"
                  />
                  ${
                    pic.description
                      ? `<p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">${pic.description}</p>`
                      : ""
                  }
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `;
      }

      supervisionNoteHtml = supervisionNoteHtml.replace(
        '<div class="supervision-note-content-boxes" id="documentationBoxes">',
        `<div class="supervision-note-content-boxes" id="documentationBoxes">${documentationHtml}`
      );

      // Read and inline the CSS for better compatibility
      const cssPath = path.join(__dirname, "abdullahksreport", "style.css");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      // Wrap in full HTML document
      const fullSupervisionNoteHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Supervision Note</title>
    <style>
      ${cssContent}
    </style>
</head>
<body>
    ${supervisionNoteHtml}
</body>
</html>
      `;

      res.send(fullSupervisionNoteHtml);
    } catch (err) {
      console.error("supervision-note error:", err);
      return res.status(500).send(`
        <html>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h2>Error Loading Supervision Note</h2>
            <p>${err.message}</p>
          </body>
        </html>
      `);
    }
  });

  // POST API to get company details by company ID and project ID
  router.post("/ks-report-company-details", async (req, res) => {
    try {
      const { companyId, projectId } = req.body;

      // Validate required fields
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "companyId is required",
        });
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "projectId is required",
        });
      }

      // Validate ObjectId format
      if (!ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid companyId format",
        });
      }

      if (!ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid projectId format",
        });
      }

      // Use the helper function to fetch data
      const data = await fetchKsReportData(db, companyId, projectId);

      return res.status(200).json({
        success: true,
        data: data,
        message: "Company and project details retrieved successfully",
      });
    } catch (err) {
      console.error("ks-report-company-details error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
    }
  });

  return router;
}

module.exports = createKsReportRoutes;
