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

      let reportPage1Html = fs.readFileSync(reportPage1Path, "utf8");
      let tocHtml = fs.readFileSync(tocPath, "utf8");
      let projectDetailsHtml = fs.readFileSync(projectDetailsPath, "utf8");

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

      // Combine all pages
      const combinedHtml = reportPage1Html + tocHtml + projectDetailsHtml;

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
