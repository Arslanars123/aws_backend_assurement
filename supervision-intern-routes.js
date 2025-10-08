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
          return res.status(500).json({
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

        // Handle annotated image with S3 metadata
        let annotatedImage = null;
        if (
          req.files["annotatedImage"] &&
          req.files["annotatedImage"].length > 0
        ) {
          const file = req.files["annotatedImage"][0];
          annotatedImage = {
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            s3Location: file.s3Location || null,
            s3Key: file.s3Key || null,
          };
        }

        // Handle original PDF with S3 metadata
        let originalPdf = null;
        if (req.files["originalPdf"] && req.files["originalPdf"].length > 0) {
          const file = req.files["originalPdf"][0];
          originalPdf = {
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            s3Location: file.s3Location || null,
            s3Key: file.s3Key || null,
          };
        }

        // Handle annotated PDF with S3 metadata
        let annotatedPdf = null;
        if (req.files["annotatedPdf"] && req.files["annotatedPdf"].length > 0) {
          const file = req.files["annotatedPdf"][0];
          annotatedPdf = {
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            s3Location: file.s3Location || null,
            s3Key: file.s3Key || null,
          };
        }

        // Handle multiple annotated PDFs with S3 metadata
        let annotatedPdfs = [];
        if (
          req.files["annotatedPdfs"] &&
          req.files["annotatedPdfs"].length > 0
        ) {
          annotatedPdfs = req.files["annotatedPdfs"].map((file) => ({
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            s3Location: file.s3Location || null,
            s3Key: file.s3Key || null,
          }));
        }

        // Handle general pictures with S3 metadata
        let generalPictures = [];
        if (
          req.files["generalPictures"] &&
          req.files["generalPictures"].length > 0
        ) {
          generalPictures = req.files["generalPictures"].map((file) => ({
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            s3Location: file.s3Location || null,
            s3Key: file.s3Key || null,
          }));
        }

        // Handle mark pictures with S3 metadata
        let markPictures = [];
        if (req.files["markPictures"] && req.files["markPictures"].length > 0) {
          markPictures = req.files["markPictures"].map((file) => ({
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            s3Location: file.s3Location || null,
            s3Key: file.s3Key || null,
          }));
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
          originalPdf: originalPdf,
          annotatedPdf: annotatedPdf,
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

  // GET specific supervision intern detail by ID
  router.get("/get-supervision-intern-detail/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!id || id.length !== 24) {
        return res.status(400).json({
          success: false,
          message: "Invalid ID format",
        });
      }

      const supervisionIntern = await db
        .collection("supervision-interns")
        .findOne({ _id: new ObjectId(id) });

      if (!supervisionIntern) {
        return res.status(404).json({
          success: false,
          message: "Supervision intern not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: supervisionIntern,
      });
    } catch (err) {
      console.error("get-supervision-intern-detail error", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // POST update supervision intern by ID
  router.post(
    "/update-supervision-intern/:id",
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
        const { id } = req.params;

        // Validate ID format
        if (!id || id.length !== 24) {
          return res.status(400).json({
            success: false,
            message: "Invalid ID format",
          });
        }

        // Check if supervision intern exists
        const existingIntern = await db
          .collection("supervision-interns")
          .findOne({ _id: new ObjectId(id) });

        if (!existingIntern) {
          return res.status(404).json({
            success: false,
            message: "Supervision intern not found",
          });
        }

        console.log("Updating supervision intern:", {
          body: req.body,
          bodyKeys: Object.keys(req.body),
          files: req.files ? Object.keys(req.files) : "No files",
        });

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

        // Prepare update data
        const updateData = {
          updatedAt: new Date(),
        };

        // Add fields if provided
        if (companyId) updateData.companyId = companyId;
        if (projectId) updateData.projectId = projectId;
        if (type) updateData.type = type;
        if (comment !== undefined) updateData.comment = comment;
        if (submittedDate) updateData.submittedDate = submittedDate;

        // Parse and add JSON fields if provided
        if (profession) {
          try {
            updateData.profession = JSON.parse(profession);
          } catch (e) {
            console.error("Error parsing profession:", e);
          }
        }

        if (buildingParts) {
          try {
            updateData.buildingParts = JSON.parse(buildingParts);
          } catch (e) {
            console.error("Error parsing buildingParts:", e);
          }
        }

        if (drawing) {
          try {
            updateData.drawing = JSON.parse(drawing);
          } catch (e) {
            console.error("Error parsing drawing:", e);
          }
        }

        if (selectedWorker) {
          try {
            updateData.selectedWorker = JSON.parse(selectedWorker);
          } catch (e) {
            console.error("Error parsing selectedWorker:", e);
          }
        }

        if (selectedIndependentController) {
          try {
            updateData.selectedIndependentController = JSON.parse(
              selectedIndependentController
            );
          } catch (e) {
            console.error("Error parsing selectedIndependentController:", e);
          }
        }

        if (selectedProjectManager) {
          try {
            updateData.selectedProjectManager = JSON.parse(
              selectedProjectManager
            );
          } catch (e) {
            console.error("Error parsing selectedProjectManager:", e);
          }
        }

        // Parse descriptions
        if (generalPictureDescriptions) {
          try {
            if (Array.isArray(generalPictureDescriptions)) {
              updateData.generalPictureDescriptions =
                generalPictureDescriptions;
            } else if (typeof generalPictureDescriptions === "string") {
              try {
                updateData.generalPictureDescriptions = JSON.parse(
                  generalPictureDescriptions
                );
              } catch (jsonError) {
                updateData.generalPictureDescriptions = [
                  generalPictureDescriptions,
                ];
              }
            }
          } catch (e) {
            console.error("Error parsing generalPictureDescriptions:", e);
          }
        }

        if (markPictureDescriptions) {
          try {
            if (Array.isArray(markPictureDescriptions)) {
              updateData.markPictureDescriptions = markPictureDescriptions;
            } else if (typeof markPictureDescriptions === "string") {
              try {
                updateData.markPictureDescriptions = JSON.parse(
                  markPictureDescriptions
                );
              } catch (jsonError) {
                updateData.markPictureDescriptions = [markPictureDescriptions];
              }
            }
          } catch (e) {
            console.error("Error parsing markPictureDescriptions:", e);
          }
        }

        if (markPictureIndices) {
          try {
            if (Array.isArray(markPictureIndices)) {
              updateData.markPictureIndices = markPictureIndices
                .map((indexStr) => {
                  try {
                    return JSON.parse(indexStr);
                  } catch (e) {
                    return null;
                  }
                })
                .filter((index) => index !== null);
            } else if (typeof markPictureIndices === "string") {
              const parsedIndex = JSON.parse(markPictureIndices);
              updateData.markPictureIndices = parsedIndex ? [parsedIndex] : [];
            }
          } catch (e) {
            console.error("Error parsing markPictureIndices:", e);
          }
        }

        // Handle file updates with S3 metadata
        if (
          req.files["annotatedImage"] &&
          req.files["annotatedImage"].length > 0
        ) {
          const file = req.files["annotatedImage"][0];
          updateData.annotatedImage = {
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            s3Location: file.s3Location || null,
            s3Key: file.s3Key || null,
          };
        }

        if (req.files["originalPdf"] && req.files["originalPdf"].length > 0) {
          const file = req.files["originalPdf"][0];
          updateData.originalPdf = {
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            s3Location: file.s3Location || null,
            s3Key: file.s3Key || null,
          };
        }

        if (req.files["annotatedPdf"] && req.files["annotatedPdf"].length > 0) {
          const file = req.files["annotatedPdf"][0];
          updateData.annotatedPdf = {
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            s3Location: file.s3Location || null,
            s3Key: file.s3Key || null,
          };
        }

        if (
          req.files["annotatedPdfs"] &&
          req.files["annotatedPdfs"].length > 0
        ) {
          updateData.annotatedPdfs = req.files["annotatedPdfs"].map((file) => ({
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            s3Location: file.s3Location || null,
            s3Key: file.s3Key || null,
          }));
        }

        if (
          req.files["generalPictures"] &&
          req.files["generalPictures"].length > 0
        ) {
          updateData.generalPictures = req.files["generalPictures"].map(
            (file) => ({
              filename: file.filename,
              originalName: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              s3Location: file.s3Location || null,
              s3Key: file.s3Key || null,
            })
          );
        }

        if (req.files["markPictures"] && req.files["markPictures"].length > 0) {
          updateData.markPictures = req.files["markPictures"].map((file) => ({
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            s3Location: file.s3Location || null,
            s3Key: file.s3Key || null,
          }));
        }

        // Update the supervision intern
        const result = await db
          .collection("supervision-interns")
          .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

        if (result.modifiedCount === 0) {
          return res.status(400).json({
            success: false,
            message: "No changes made or supervision intern not found",
          });
        }

        // Get updated document
        const updatedIntern = await db
          .collection("supervision-interns")
          .findOne({ _id: new ObjectId(id) });

        return res.status(200).json({
          success: true,
          message: "Supervision intern updated successfully",
          data: updatedIntern,
        });
      } catch (err) {
        console.error("update-supervision-intern error", err);
        return res.status(500).json({
          success: false,
          message: "Internal server error",
          details: err.message,
        });
      }
    }
  );

  // POST delete supervision intern by ID
  router.post("/delete-supervision-intern/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!id || id.length !== 24) {
        return res.status(400).json({
          success: false,
          message: "Invalid ID format",
        });
      }

      // Check if supervision intern exists
      const existingIntern = await db
        .collection("supervision-interns")
        .findOne({ _id: new ObjectId(id) });

      if (!existingIntern) {
        return res.status(404).json({
          success: false,
          message: "Supervision intern not found",
        });
      }

      // Delete the supervision intern
      const result = await db
        .collection("supervision-interns")
        .deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Failed to delete supervision intern",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Supervision intern deleted successfully",
      });
    } catch (err) {
      console.error("delete-supervision-intern error", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  return router;
}

module.exports = createSupervisionInternRoutes;
