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

      return res.status(200).json({
        success: true,
        data: {
          companyDetails,
          projectDetail,
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
