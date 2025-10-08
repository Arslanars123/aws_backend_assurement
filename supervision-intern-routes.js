const express = require("express");
const { ObjectId } = require("mongodb");
const { upload } = require("./services/upload");

// Function to create routes with database connection
function createSupervisionInternRoutes(db) {
  const router = express.Router();

  // GET supervision interns by companyId, projectId, and type
  router.get("/get-supervision-interns", async (req, res) => {
    try {
      const { companyId, projectId, type } = req.query;

      // Build query
      const query = {};
      if (companyId) query.companyId = companyId;
      if (projectId) query.projectId = projectId;
      if (type) query.type = type;

      const supervisionInterns = await db
        .collection("supervision-interns")
        .find(query)
        .toArray();

      res.status(200).json({
        success: true,
        data: supervisionInterns,
        count: supervisionInterns.length,
      });
    } catch (error) {
      console.error("Error fetching supervision interns:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch supervision interns",
      });
    }
  });

  // POST store supervision intern
  router.post(
    "/store-supervision-intern",
    upload.fields([
      { name: "generalPictures", maxCount: 10 },
      { name: "markPictures", maxCount: 10 },
      { name: "annotatedImage", maxCount: 10 },
      { name: "originalPdf", maxCount: 1 },
      { name: "annotatedPdf", maxCount: 1 },
      { name: "annotatedPdfs", maxCount: 10 },
    ]),
    async (req, res) => {
      try {
        console.log("Received supervision intern submission:", {
          body: req.body,
          bodyKeys: Object.keys(req.body),
          files: req.files ? Object.keys(req.files) : "No files",
          fileDetails: req.files
            ? Object.keys(req.files).map((key) => ({
                field: key,
                count: req.files[key].length,
                filenames: req.files[key].map((f) => f.filename),
              }))
            : "No files",
        });

        // Validate required fields
        if (!req.body.companyId || !req.body.projectId || !req.body.type) {
          return res.status(400).json({
            success: false,
            error: "Missing required fields",
            required: ["companyId", "projectId", "type"],
            received: Object.keys(req.body),
          });
        }

        // Check database connection
        if (!db) {
          return res
            .status(500)
            .json({
              success: false,
              error: "Database connection not available",
            });
        }

        const {
          companyId,
          projectId,
          comment,
          profession,
          buildingParts,
          drawing,
          type,
          submittedDate,
          generalPictureDescriptions,
          markPictureDescriptions,
          markPictureIndices,
          selectedWorker,
          selectedIndependentController,
          selectedProjectManager,
        } = req.body;

        console.log("Parsing JSON fields...");

        // Parse profession
        let parsedProfession = null;
        try {
          parsedProfession = profession ? JSON.parse(profession) : null;
          console.log("Profession parsed successfully");
        } catch (e) {
          console.error("Error parsing profession:", e);
          return res
            .status(400)
            .json({ success: false, error: "Invalid profession JSON" });
        }

        // Parse building parts
        let parsedBuildingParts = null;
        try {
          parsedBuildingParts = buildingParts
            ? JSON.parse(buildingParts)
            : null;
          console.log("Building parts parsed successfully");
        } catch (e) {
          console.error("Error parsing buildingParts:", e);
          return res
            .status(400)
            .json({ success: false, error: "Invalid buildingParts JSON" });
        }

        // Parse drawing
        let parsedDrawing = null;
        try {
          parsedDrawing = drawing ? JSON.parse(drawing) : null;
          console.log("Drawing parsed successfully");
        } catch (e) {
          console.error("Error parsing drawing:", e);
          return res
            .status(400)
            .json({ success: false, error: "Invalid drawing JSON" });
        }

        // Parse worker
        let parsedSelectedWorker = null;
        try {
          parsedSelectedWorker = selectedWorker
            ? JSON.parse(selectedWorker)
            : null;
          console.log("Selected worker parsed successfully");
        } catch (e) {
          console.error("Error parsing selectedWorker:", e);
          parsedSelectedWorker = null;
        }

        // Parse independent controller
        let parsedSelectedIndependentController = null;
        try {
          parsedSelectedIndependentController = selectedIndependentController
            ? JSON.parse(selectedIndependentController)
            : null;
          console.log("Selected independent controller parsed successfully");
        } catch (e) {
          console.error("Error parsing selectedIndependentController:", e);
          parsedSelectedIndependentController = null;
        }

        // Parse project manager
        let parsedSelectedProjectManager = null;
        try {
          parsedSelectedProjectManager = selectedProjectManager
            ? JSON.parse(selectedProjectManager)
            : null;
          console.log("Selected project manager parsed successfully");
        } catch (e) {
          console.error("Error parsing selectedProjectManager:", e);
          parsedSelectedProjectManager = null;
        }

        // Parse general picture descriptions
        let parsedGeneralPictureDescriptions = [];
        try {
          if (Array.isArray(generalPictureDescriptions)) {
            parsedGeneralPictureDescriptions = generalPictureDescriptions;
          } else if (typeof generalPictureDescriptions === "string") {
            try {
              parsedGeneralPictureDescriptions = JSON.parse(
                generalPictureDescriptions
              );
            } catch (jsonError) {
              parsedGeneralPictureDescriptions = generalPictureDescriptions
                ? [generalPictureDescriptions]
                : [];
            }
          } else {
            parsedGeneralPictureDescriptions = [];
          }
          console.log(
            "General picture descriptions parsed successfully:",
            parsedGeneralPictureDescriptions
          );
        } catch (e) {
          console.error("Error parsing generalPictureDescriptions:", e);
          parsedGeneralPictureDescriptions = [];
        }

        // Parse mark picture descriptions
        let parsedMarkPictureDescriptions = [];
        try {
          if (Array.isArray(markPictureDescriptions)) {
            parsedMarkPictureDescriptions = markPictureDescriptions;
          } else if (typeof markPictureDescriptions === "string") {
            try {
              parsedMarkPictureDescriptions = JSON.parse(
                markPictureDescriptions
              );
            } catch (jsonError) {
              parsedMarkPictureDescriptions = markPictureDescriptions
                ? [markPictureDescriptions]
                : [];
            }
          } else {
            parsedMarkPictureDescriptions = [];
          }
          console.log(
            "Mark picture descriptions parsed successfully:",
            parsedMarkPictureDescriptions
          );
        } catch (e) {
          console.error("Error parsing markPictureDescriptions:", e);
          parsedMarkPictureDescriptions = [];
        }

        // Parse mark picture indices
        let parsedMarkPictureIndices = [];
        try {
          if (Array.isArray(markPictureIndices)) {
            parsedMarkPictureIndices = markPictureIndices
              .map((indexStr) => {
                try {
                  return JSON.parse(indexStr);
                } catch (e) {
                  console.error(
                    "Error parsing individual markPictureIndex:",
                    e
                  );
                  return null;
                }
              })
              .filter((index) => index !== null);
          } else if (typeof markPictureIndices === "string") {
            const parsedIndex = markPictureIndices
              ? JSON.parse(markPictureIndices)
              : null;
            parsedMarkPictureIndices = parsedIndex ? [parsedIndex] : [];
          } else {
            parsedMarkPictureIndices = [];
          }
          console.log(
            "Mark picture indices parsed successfully:",
            parsedMarkPictureIndices
          );
        } catch (e) {
          console.error("Error parsing markPictureIndices:", e);
          parsedMarkPictureIndices = [];
        }

        // Handle annotated image
        let annotatedImage = null;
        if (
          req.files["annotatedImage"] &&
          req.files["annotatedImage"].length > 0
        ) {
          annotatedImage = req.files["annotatedImage"][0].filename;
        }

        // Handle original PDF
        let originalPdfFilename = null;
        if (req.files["originalPdf"] && req.files["originalPdf"].length > 0) {
          originalPdfFilename = req.files["originalPdf"][0].filename;
        }

        // Handle annotated PDF
        let annotatedPdfFilename = null;
        if (req.files["annotatedPdf"] && req.files["annotatedPdf"].length > 0) {
          annotatedPdfFilename = req.files["annotatedPdf"][0].filename;
        }

        // Handle multiple annotated PDFs
        let annotatedPdfs = [];
        if (
          req.files["annotatedPdfs"] &&
          req.files["annotatedPdfs"].length > 0
        ) {
          annotatedPdfs = req.files["annotatedPdfs"].map(
            (file) => file.filename
          );
        }

        // Handle general pictures
        let generalPictures = [];
        if (
          req.files["generalPictures"] &&
          req.files["generalPictures"].length > 0
        ) {
          generalPictures = req.files["generalPictures"].map(
            (file) => file.filename
          );
        }

        // Handle mark pictures
        let markPictures = [];
        if (req.files["markPictures"] && req.files["markPictures"].length > 0) {
          markPictures = req.files["markPictures"].map((file) => file.filename);
        }

        // Prepare data for insertion
        const supervisionInternData = {
          companyId,
          projectId,
          type,
          comment,
          submittedDate: submittedDate || new Date().toISOString(),
          profession: parsedProfession,
          buildingParts: parsedBuildingParts,
          drawing: parsedDrawing,
          selectedWorker: parsedSelectedWorker,
          selectedIndependentController: parsedSelectedIndependentController,
          selectedProjectManager: parsedSelectedProjectManager,
          generalPictures: generalPictures,
          generalPictureDescriptions: parsedGeneralPictureDescriptions,
          markPictures: markPictures,
          markPictureDescriptions: parsedMarkPictureDescriptions,
          markPictureIndices: parsedMarkPictureIndices,
          annotatedImage: annotatedImage,
          originalPdf: originalPdfFilename,
          annotatedPdf: annotatedPdfFilename,
          annotatedPdfs,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        console.log("Attempting to insert supervision intern data:", {
          ...supervisionInternData,
        });

        // Insert the data into the database
        const result = await db
          .collection("supervision-interns")
          .insertOne(supervisionInternData);

        res.status(201).json({
          success: true,
          message: "Supervision intern created successfully",
          data: {
            id: result.insertedId,
            ...supervisionInternData,
          },
        });
      } catch (error) {
        console.error("Error creating supervision intern:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({
          success: false,
          error: "Failed to create supervision intern",
          details: error.message,
          stack: error.stack,
        });
      }
    }
  );

  return router;
}

module.exports = createSupervisionInternRoutes;
