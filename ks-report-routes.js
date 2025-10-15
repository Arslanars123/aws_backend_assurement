const express = require("express");
const { ObjectId } = require("mongodb");

// Function to create routes with database connection
function createKsReportRoutes(db) {
  const router = express.Router();

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

      // Find company by ID
      const companyDetails = await db
        .collection("companies")
        .findOne({ _id: new ObjectId(companyId) });

      if (!companyDetails) {
        return res.status(404).json({
          success: false,
          message: "Company not found",
        });
      }

      // Find project by ID
      const projectDetail = await db
        .collection("projects")
        .findOne({ _id: new ObjectId(projectId) });

      if (!projectDetail) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      const baseMatch = {
        companyId: companyId,
        projectsId: { $in: [projectId] },
      };

      const [
        workers,
        projectManagers,
        subcontractors,
        independentControllers,
        mainContractorsCustomers,
        constructionManagers,
        safetyManagers,
        advisors,
        inspectors,
      ] = await Promise.all([
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
      ]);

      return res.status(200).json({
        success: true,
        data: {
          companyDetails,
          projectDetail,
          users: {
            workers,
            projectManagers,
            subcontractors,
            independentControllers,
            mainContractorsCustomers,
            constructionManagers,
            safetyManagers,
            advisors,
            inspectors,
          },
        },
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
