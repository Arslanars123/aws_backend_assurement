const express = require("express");
const { ObjectId } = require("mongodb");
const { upload } = require("./services/upload");

// Helper function to check if object is not empty
const isObjectNotEmpty = (obj) =>
  obj &&
  Object.keys(obj).length > 0 &&
  Object.values(obj).some(
    (v) => v !== "" && v !== null && !(Array.isArray(v) && v.length === 0)
  );

// Function to create routes with database connection
function createProjectManagementRoutes(db) {
  const router = express.Router();

  // Helper function to add or update professions
  async function addOrUpdateProfessions({ professions, projectsId }) {
    if (!professions || professions.length === 0) {
      throw new Error("No professions provided in the request!");
    }

    let SubjectMatterIdArray = [];

    const staticDocumentCheckList = await db
      .collection("standards")
      .find({ DS_GroupId: { $in: ["B1", "B2", "B3"] } })
      .toArray();

    const staticReportRegistration = await db
      .collection("standards")
      .find({ DS_GroupId: { $nin: ["B1", "B2", "B3"] } })
      .toArray();

    const professionAssociatedData = {};

    for (const profession of professions) {
      delete profession?._id;
      const { professionID, companyId, ...professionDetails } = profession;
      SubjectMatterIdArray.push(profession.SubjectMatterId);

      if (projectsId) {
        for (const euroCode of profession.projectEuroCodes) {
          const docs = await db
            .collection("controls of static report")
            .find({ euroCode: { $in: [Number(euroCode), String(euroCode)] } })
            .toArray();

          for (const doc of docs) {
            await db.collection("projectcontrolsofstaticreport").insertOne({
              projectId: projectsId,
              professionId: professionID,
              companyId: companyId,
              detail: doc,
            });
          }
        }
      }

      const filter = {
        professionID,
        companyId,
      };

      if (projectsId) filter.projectId = projectsId;
      const existingProfession = await db
        .collection("professions")
        .findOne(filter);

      const subjectMatterIdKey = `${profession.SubjectMatterId}`;

      professionAssociatedData[subjectMatterIdKey] = {
        staticDocumentCheckList,
        staticReportRegistration,
      };

      if (existingProfession) {
        await db
          .collection("professions")
          .updateOne({ professionID, companyId }, { $set: professionDetails });
      } else {
        const professionToInsert = {
          ...profession,
          ...(projectsId && { projectId: projectsId }),
        };
        await db.collection("professions").insertOne(professionToInsert);
      }
    }

    if (projectsId) {
      const allTasks = await db
        .collection("tasks")
        .aggregate([
          {
            $match: {
              SubjectMatterId: { $in: SubjectMatterIdArray },
            },
          },
          {
            $lookup: {
              from: "inputs",
              localField: "SubjectMatterId",
              foreignField: "SubjectMatterId",
              as: "inputs",
            },
          },
          {
            $unwind: {
              path: "$inputs",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $sort: {
              Index: 1,
            },
          },
        ])
        .toArray();

      const project = await db
        .collection("projects")
        .findOne({ _id: new ObjectId(projectsId) });

      const existingProfessionData = project?.professionAssociatedData || {};

      const mergedProfessionData = {
        ...professionAssociatedData,
        ...existingProfessionData,
      };

      await db.collection("projects").updateOne(
        { _id: new ObjectId(projectsId) },
        {
          $push: { tasks: { $each: allTasks } },
          $set: { professionAssociatedData: mergedProfessionData },
        }
      );
    }
  }

  // Simple test endpoint
  router.post("/test-add-project", async (req, res) => {
    try {
      console.log("=== TEST ENDPOINT REACHED ===");
      console.log("Request body:", req.body);
      
      const { basicDetails, companyId } = req.body;
      
      if (!basicDetails?.name) {
        return res.status(400).json({ error: "Name is required" });
      }
      
      if (!companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }
      
      // Test ObjectId conversion
      try {
        const testObjectId = new ObjectId(companyId);
        console.log("ObjectId conversion successful:", testObjectId);
      } catch (objectIdError) {
        console.log("ObjectId conversion failed:", objectIdError);
        return res.status(400).json({ error: "Invalid company ID format" });
      }
      
      // Test database insertion
      const testResult = await db.collection("projects").insertOne({
        name: basicDetails.name,
        companyId: new ObjectId(companyId),
        createdAt: new Date(),
        test: true
      });
      
      console.log("Test insert result:", testResult);
      
      res.status(201).json({ 
        success: true, 
        message: "Test project created successfully",
        projectId: testResult.insertedId
      });
      
    } catch (error) {
      console.log("=== TEST ENDPOINT ERROR ===");
      console.log("Error details:", error);
      res.status(500).json({ error: "Test failed", details: error.message });
    }
  });

  router.post(
    "/add-project",
    upload.fields([
      { name: "mainDrawings", maxCount: 50 },
      { name: "childDrawings", maxCount: 200 },
      { name: "documents", maxCount: 50 },
      { name: "planPictures", maxCount: 10 },
    ]),
    async (req, res) => {
      try {
        console.log("=== ADD PROJECT ENDPOINT REACHED ===");
        console.log("Request body:", JSON.stringify(req.body, null, 2));
        
        const {
          basicDetails,
          professions,
          addUsers,
          addDrawing,
          plan,
          certificateSchema,
          companyId,
          mainDrawingGroups,
        } = req.body;

        const parsedBasicDetails =
          typeof basicDetails === "string"
            ? JSON.parse(basicDetails)
            : basicDetails;

        const isBasicDetailsValid = parsedBasicDetails?.name?.trim();

        if (!isBasicDetailsValid) {
          return res
            .status(400)
            .json({ error: "All basic details must be filled." });
        }

        const parsedProfessions =
          typeof professions === "string"
            ? JSON.parse(professions)
            : professions;

        const parsedAddUsers =
          typeof addUsers === "string" ? JSON.parse(addUsers) : addUsers;

        const parsedAddDrawing =
          typeof addDrawing === "string" ? JSON.parse(addDrawing) : addDrawing;

        const parsedPlan = typeof plan === "string" ? JSON.parse(plan) : plan;

        const parsedCertificateSchema =
          typeof certificateSchema === "string"
            ? JSON.parse(certificateSchema)
            : certificateSchema;

        const checks = await db.collection("checks").find({}).toArray();
        const checksWithCreatedAt = checks.map((check) => ({
          ...check,
          createdAt: new Date(),
        }));

        console.log("=== PROJECT CREATION DEBUG ===");
        console.log("Company ID:", companyId);
        console.log("Company ID type:", typeof companyId);
        console.log("Parsed Basic Details:", parsedBasicDetails);
        console.log("Checks with Created At:", checksWithCreatedAt.length);
        
        const projectData = {
          ...parsedBasicDetails,
          companyId: companyId, // Store as string, not ObjectId
          checks: checksWithCreatedAt,
          createdAt: new Date(),
        };
        
        console.log("Project data to insert:", JSON.stringify(projectData, null, 2));

        const result = await db.collection("projects").insertOne(projectData);

        console.log("Insert result:", result);
        console.log("Inserted ID:", result.insertedId);

        const newProjectId = result.insertedId?.toString();

        if (!newProjectId) {
          console.log("ERROR: No project ID returned from insert");
          return res.status(500).json({ error: "Failed to create project - no ID returned" });
        }
        
        console.log("Project created successfully with ID:", newProjectId);

        const supervisionchecklist = await db
          .collection("supervision-check-list")
          .find({})
          .toArray();

        if (supervisionchecklist.length > 0) {
          const supervisionInsertPromises = supervisionchecklist.map(
            (check) => {
              return db.collection("project-supervision-check-list").insertOne({
                projectId: new ObjectId(newProjectId),
                checkId: check._id,
                checkDetails: check,
                createdAt: new Date(),
              });
            }
          );

          await Promise.all(supervisionInsertPromises);
        }

        if (parsedProfessions?.length > 0) {
          const updatedProfessions = parsedProfessions.map((profession) => {
            const filteredProjectsId =
              profession?.projectsId?.filter((id) => id !== null) || [];

            return {
              ...profession,
              projectsId: [...filteredProjectsId, newProjectId],
            };
          });

          await addOrUpdateProfessions({
            professions: updatedProfessions,
            projectsId: newProjectId,
          });
        }

        if (parsedAddUsers) {
          const allUserIds = Object.values(parsedAddUsers)
            .flat()
            .map((user) => user._id);

          if (allUserIds?.length) {
            const objectIds = allUserIds.map((id) => new ObjectId(id));

            const bulkOps = objectIds.map((userId) => ({
              updateOne: {
                filter: { _id: userId },
                update: {
                  $addToSet: {
                    projectsId: newProjectId,
                  },
                },
              },
            }));

            await db.collection("users").bulkWrite(bulkOps);
          }
        }

        if (isObjectNotEmpty(parsedCertificateSchema)) {
          await db.collection("schemes").insertOne({
            ...parsedCertificateSchema,
            projectsId: [newProjectId],
            companyId,
          });
        }

        // Handle plan pictures with spread operator to capture ALL file information including S3 details
        const planPictures =
          req.files && req.files["planPictures"]
            ? req.files["planPictures"].map((file) => ({
                ...file, // Captures ALL file information including S3 details
                uploadedAt: new Date(),
                fileType: "plan-picture",
              }))
            : [];

        let planId = "";
        if (isObjectNotEmpty(parsedPlan)) {
          const plan = await db.collection("plans").insertOne({
            ...parsedPlan,
            pictures: planPictures,
            projectsId: [newProjectId],
            companyId,
          });

          planId = plan.insertedId?.toString();
        }

        // Handle drawings (similar to store-draw API)
        if (parsedAddDrawing && mainDrawingGroups) {
          const mainFiles = req.files["mainDrawings"] || [];
          const childFiles = req.files["childDrawings"] || [];

          // Parse the mainDrawingGroups to understand the structure
          const groups = JSON.parse(mainDrawingGroups || "[]");

          // Create the drawings array to store all drawing groups
          const drawings = [];

          // Process each main drawing group
          for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const mainDrawingIndex = group.mainIndex;
            const childIndices = group.childIndices || [];

            // Get the main drawing file
            const mainFile = mainFiles[mainDrawingIndex];
            if (!mainFile) continue;

            // Create main drawing object with spread operator to capture ALL file information including S3 details
            const mainDrawing = {
              ...mainFile, // Captures ALL file information including S3 details
              uploadedAt: new Date(),
              fileType: "main-drawing",
            };

            // Get associated child drawings
            const childDrawings = childIndices
              .map((childIndex) => {
                const childFile = childFiles[childIndex];
                if (!childFile) return null;

                return {
                  ...childFile, // Captures ALL file information including S3 details
                  parentMainIndex: mainDrawingIndex,
                  uploadedAt: new Date(),
                  fileType: "child-drawing",
                };
              })
              .filter((child) => child !== null);

            // Create drawing group
            const drawingGroup = {
              mainDrawing,
              childDrawings,
              createdAt: new Date(),
            };

            drawings.push(drawingGroup);
          }

          // Insert all drawing groups into the database
          for (const drawingGroup of drawings) {
            await db.collection("draws").insertOne({
              companyId,
              projectsId: [newProjectId],
              planId,
              mainDrawings: [drawingGroup.mainDrawing],
              childDrawings: drawingGroup.childDrawings,
              createdAt: drawingGroup.createdAt,
              ...parsedAddDrawing,
            });
          }
        }

        // Handle documents (similar to store-documents API)
        const documentFiles = req.files["documents"] || [];
        if (documentFiles.length > 0) {
          // Create document entries for each uploaded file with spread operator to capture ALL file information including S3 details
          const documentEntries = documentFiles.map((file) => ({
            ...file, // Captures ALL file information including S3 details
            category: parsedAddDrawing?.category || "general",
            description: parsedAddDrawing?.description || "",
            uploadedAt: new Date(),
            companyId: companyId,
            projectId: newProjectId,
          }));

          // Insert documents into database
          await db.collection("documents").insertMany(documentEntries);
        }

        res.status(201).json(result);
      } catch (error) {
        console.log("=== PROJECT CREATION ERROR ===");
        console.log("Error details:", error);
        console.log("Request body:", req.body);
        console.log("Request files:", req.files);
        console.log("===============================");
        res.status(500).json({ error: "Failed to create project" });
      }
    }
  );

  // POST /store-project - Simple project creation
  router.post(
    "/store-project",
    upload.fields([
      { name: "picture", maxCount: 1 },
      { name: "pictures", maxCount: 10 },
    ]),
    async (req, res) => {
      try {
        const { name, address, postCode, city, startDate, companyId } =
          req.body;
        console.log(req.files);

        let picture = null;
        let pictures = [];

        // Handle single picture upload
        if (req.files["picture"] && req.files["picture"].length > 0) {
          picture = req.files["picture"][0].filename;
        }

        // Handle multiple pictures upload
        if (req.files["pictures"] && req.files["pictures"].length > 0) {
          pictures = req.files["pictures"].map((file) => file.filename);
        }

        // Insert the data into the database
        const result = await db.collection("projects").insertOne({
          name,
          address,
          postCode,
          city,
          startDate,
          picture,
          pictures,
          companyId,
        });

        res.status(201).json(result);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Failed to create project" });
      }
    }
  );

  // POST /update-project/:id - Update existing project
  router.post(
    "/update-project/:id",
    upload.fields([
      { name: "picture", maxCount: 1 },
      { name: "pictures", maxCount: 10 },
    ]),
    async (req, res) => {
      try {
        const {
          name,
          address,
          postalCode,
          city,
          startDate,
          picture2,
          pictures2,
        } = req.body;
        console.log(pictures2);

        const updateData = {};

        // Dynamically add provided fields to updateData
        if (name) updateData.name = name;
        if (address) updateData.address = address;
        if (postalCode) updateData.postalCode = postalCode;
        if (city) updateData.city = city;
        if (startDate) updateData.startDate = startDate;
        if (picture2) {
          updateData.picture = picture2;
        }

        // Handle single file upload (picture)
        if (req.files["picture"] && req.files["picture"].length > 0) {
          updateData.picture = req.files["picture"][0].filename;
        }

        let picturesArray = [];
        if (!pictures2) {
          updateData.pictures = [];
        }
        if (pictures2) {
          picturesArray = pictures2.split(",");
          updateData.pictures = picturesArray;
        }

        // Handle multiple file uploads (pictures)
        if (req.files["pictures"] && req.files["pictures"].length > 0) {
          const newFiles = req.files["pictures"].map((file) => file.filename);

          const existingFiles = picturesArray;
          updateData.pictures = [...existingFiles, ...newFiles];
        }

        // Update the project document in the database
        const result = await db
          .collection("projects")
          .updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
          );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Project not found" });
        }

        res
          .status(200)
          .json({ message: "Project updated successfully", result });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update project" });
      }
    }
  );

  return router;
}

module.exports = createProjectManagementRoutes;
