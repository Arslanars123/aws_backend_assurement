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

      // Read the HTML template
      const htmlPath = path.join(
        __dirname,
        "abdullahksreport",
        "report-page1.html"
      );
      let html = fs.readFileSync(htmlPath, "utf8");

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

      // Replace placeholders in HTML
      html = html.replace(
        /id="companyLogo"/g,
        `id="companyLogo" src="${companyLogo}" ${
          companyLogo ? 'style="display: block;"' : 'style="display: none;"'
        }`
      );
      html = html.replace(
        /id="companyLogoFallback">A/g,
        `id="companyLogoFallback">${firstLetter}`
      );
      html = html.replace(
        /id="postNoCity"><\/div>/g,
        `id="postNoCity">${postNoCity}</div>`
      );
      html = html.replace(
        /id="address"><\/div>/g,
        `id="address">${companyDetails.address || ""}</div>`
      );
      html = html.replace(
        /id="cvr"><\/div>/g,
        `id="cvr">${companyDetails.cvr || ""}</div>`
      );
      html = html.replace(
        /id="telephone"><\/div>/g,
        `id="telephone">${companyDetails.companyPhone || ""}</div>`
      );
      html = html.replace(
        /id="mail"><\/div>/g,
        `id="mail">${companyDetails.email || ""}</div>`
      );
      html = html.replace(
        /id="projectId"><\/div>/g,
        `id="projectId">${projectIdValue}</div>`
      );
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
      html = html.replace(
        /id="footerTocLogo">A/g,
        `id="footerTocLogo">${firstLetter}`
      );

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
    ${html}
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
