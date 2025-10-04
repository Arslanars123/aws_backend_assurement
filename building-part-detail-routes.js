const express = require("express");
const { upload } = require("./services/upload");

// Function to create routes with database connection
function createBuildingPartDetailRoutes(db) {
  const router = express.Router();

  router.post(
    "/store-building-part-detail",
    upload.single("image"),
    async (req, res) => {
      try {
        const { buildingPartId, name, description } = req.body;
        const imageFile = req.file; // optional

        // Validate required fields
        if (!buildingPartId || !name || !description) {
          return res.status(400).json({
            message: "buildingPartId, name, and description are required",
          });
        }

        // Prepare image data
        let imageData = null;
        if (imageFile) {
          imageData = {
            localPath: imageFile.path,
            filename: imageFile.filename,
            originalName: imageFile.originalname,
            mimetype: imageFile.mimetype,
            size: imageFile.size,
            s3Location: imageFile.s3Location || null,
            s3Key: imageFile.s3Key || null,
            s3Error: imageFile.s3Error || null,
          };
        }

        // Create the building part detail document
        const buildingPartDetail = {
          buildingPartId,
          name,
          description,
          image: imageData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Save to MongoDB
        const result = await db
          .collection("buildingpartsdetail")
          .insertOne(buildingPartDetail);

        return res.status(201).json({
          message: "Building part detail created successfully",
          data: {
            id: result.insertedId,
            buildingPartId,
            name,
            description,
            image: imageData,
          },
        });
      } catch (err) {
        console.error("store-building-part-detail error", err);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  return router;
}

module.exports = createBuildingPartDetailRoutes;
