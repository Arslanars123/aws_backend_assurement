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
      const tablesPlaceholderPath = path.join(
        __dirname,
        "abdullahksreport",
        "tables-placeholder.html"
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
      let tablesPlaceholderHtml = fs.readFileSync(
        tablesPlaceholderPath,
        "utf8"
      );

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
      tablesPlaceholderHtml = updatePageFooter(tablesPlaceholderHtml);

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
        tablesPlaceholderHtml;

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
