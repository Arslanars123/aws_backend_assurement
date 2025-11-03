const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

module.exports = (db) => {
  // Generate Static Control Plan PDF
  router.post("/generate-static-control-plan-pdf", async (req, res) => {
    try {
      const { companyId, projectId, subjectMatterId } = req.body;

      if (!companyId || !projectId || !subjectMatterId) {
        return res.status(400).json({
          error: "Missing required fields: companyId, projectId, and subjectMatterId are required",
        });
      }

      console.log("📄 Generating Static Control Plan PDF...");
      console.log(`   CompanyId: ${companyId}`);
      console.log(`   ProjectId: ${projectId}`);
      console.log(`   SubjectMatterId: ${subjectMatterId}`);

      // 1. Get gamma document for this profession
      const gamma = await db.collection("gammas").findOne({
        $or: [
          { projectsId: projectId },
          { projectsId: { $in: [projectId] } }
        ],
        "profession.SubjectMatterId": subjectMatterId,
      });

      if (!gamma) {
        return res.status(404).json({
          error: `No static control plan found for subjectMatterId: ${subjectMatterId} in project: ${projectId}`,
        });
      }

      console.log(`✅ Found gamma: ${gamma._id}`);

      // 2. Get project details
      const project = await db.collection("projects").findOne({
        _id: new ObjectId(projectId),
      });

      if (!project) {
        return res.status(404).json({
          error: `Project not found: ${projectId}`,
        });
      }

      console.log(`✅ Found project: ${project.name}`);

      // 3. Get company details
      const company = await db.collection("companies").findOne({
        _id: new ObjectId(companyId),
      });

      if (!company) {
        return res.status(404).json({
          error: `Company not found: ${companyId}`,
        });
      }

      console.log(`✅ Found company: ${company.name}`);

      // 4. Get EuroCodes from projectprofessioneurocodes collection
      let euroCodes = [];
      
      console.log("📋 Fetching EuroCodes from projectprofessioneurocodes...");
      console.log("   projectId:", projectId);
      console.log("   subjectMatterId:", subjectMatterId);
      
      try {
        const euroCodeDoc = await db.collection("projectprofessioneurocodes").findOne({
          projectId: projectId,
          subjectMatterId: subjectMatterId,
        });
        
        if (euroCodeDoc) {
          console.log("✅ Found euroCode document:", euroCodeDoc._id);
          if (euroCodeDoc.euroCodes && Array.isArray(euroCodeDoc.euroCodes)) {
            euroCodes = euroCodeDoc.euroCodes;
            console.log(`✅ Found ${euroCodes.length} EuroCodes:`, euroCodes);
          } else {
            console.log("⚠️ euroCodes field is missing or not an array");
          }
        } else {
          console.log("⚠️ No euroCode document found for:", { projectId, subjectMatterId });
        }
      } catch (error) {
        console.error("❌ Error fetching EuroCodes:", error);
      }

      console.log(`✅ Final euroCodes array:`, euroCodes);

      // 5. Get special text from projectspecialtext collection
      let projectSpecialText = "";
      try {
        const specialTextDoc = await db.collection("projectspecialtext").findOne({
          projectId: projectId,
        });
        
        if (specialTextDoc && specialTextDoc.specialText) {
          projectSpecialText = specialTextDoc.specialText;
          console.log(`✅ Found special text: "${projectSpecialText}"`);
        } else {
          console.log("⚠️ No special text found for this project");
        }
      } catch (error) {
        console.error("Error fetching special text:", error);
      }

      // 6. Get project main drawings from "draws" collection
      let projectDrawings = [];
      try {
        const drawDocs = await db.collection("draws").find({
          companyId: companyId,
          projectsId: projectId,
        }).toArray();
        
        console.log(`✅ Found ${drawDocs.length} draw documents`);
        
        // Extract mainDrawings from all draw documents
        drawDocs.forEach(drawDoc => {
          if (drawDoc.mainDrawings && Array.isArray(drawDoc.mainDrawings)) {
            projectDrawings.push(...drawDoc.mainDrawings);
          }
        });
        
        console.log(`✅ Total main drawings: ${projectDrawings.length}`);
      } catch (error) {
        console.error("Error fetching drawings:", error);
      }

      // 7. Get checklist entries from "standards" collection (for 7.1, 7.2, 7.3)
      let checklistEntries = [];
      try {
        // Fetch from standards collection with B1, B2, B3 groups
        const allEntries = await db.collection("standards").find({
          DS_GroupId: { $in: ["B1", "B2", "B3"] }
        }).toArray();
        
        if (allEntries && Array.isArray(allEntries)) {
          checklistEntries = allEntries;
          console.log(`✅ Found ${checklistEntries.length} standards/checklist entries (7.1, 7.2, 7.3)`);
          
          // Group by ItemId prefix (7.1, 7.2, 7.3)
          const entries71 = checklistEntries.filter(e => e.ItemId && e.ItemId.startsWith('7.1'));
          const entries72 = checklistEntries.filter(e => e.ItemId && e.ItemId.startsWith('7.2'));
          const entries73 = checklistEntries.filter(e => e.ItemId && e.ItemId.startsWith('7.3'));
          
          console.log(`   7.1 entries: ${entries71.length}`);
          console.log(`   7.2 entries: ${entries72.length}`);
          console.log(`   7.3 entries: ${entries73.length}`);
        }
      } catch (error) {
        console.error("Error fetching standards:", error);
      }

      // 8. Get additional entries (7.4, 7.5, 7.6) from "controls of static report" collection
      try {
        console.log("📋 Fetching 7.4, 7.5, 7.6 entries from 'controls of static report'...");
        
        // Normalize euroCodes to strings
        const euroCodesStr = euroCodes.map((v) => String(v).trim()).filter(Boolean);
        console.log("   EuroCodes to match:", euroCodesStr);
        
        const pipeline = [
          // Convert euroCode to string for comparison
          { $addFields: { euroCodeStr: { $toString: "$euroCode" } } },
          
          // Match any requested euro code
          { $match: { euroCodeStr: { $in: euroCodesStr } } },
          
          // Unwind entries array
          { $unwind: { path: "$entries", includeArrayIndex: "entryIndex" } },
          
          // Project the fields we need
          {
            $project: {
              _id: 0,
              pos: "$entries.pos",
              checkingThe: "$entries.checkingThe",
              subject: "$entries.subject",
              constructionPart: "$entries.constructionPart",
              basis: "$entries.basis",
              controlMethod: "$entries.controlMethod",
              circumference: "$entries.circumference",
              acceptanceCriteria: "$entries.acceptanceCriteria",
              time: "$entries.time",
              documentId: { $toString: "$_id" },
              subjectMatterId: "$subjectMatterId",
              euroCode: "$euroCode",
              language: "$language",
              entryIndex: "$entryIndex",
            },
          },
        ];
        
        const controlsEntries = await db.collection("controls of static report").aggregate(pipeline).toArray();
        
        console.log(`✅ Found ${controlsEntries.length} total controls entries`);
        
        // Log first entry to see raw data structure
        if (controlsEntries.length > 0) {
          console.log("   First raw entry from controls collection:");
          console.log("      pos:", controlsEntries[0].pos);
          console.log("      checkingThe:", controlsEntries[0].checkingThe);
          console.log("      subject:", controlsEntries[0].subject);
        }
        
        // Filter for 7.4, 7.5, 7.6 only
        const entries74 = controlsEntries.filter(e => e.pos && e.pos.startsWith('7.4'));
        const entries75 = controlsEntries.filter(e => e.pos && e.pos.startsWith('7.5'));
        const entries76 = controlsEntries.filter(e => e.pos && e.pos.startsWith('7.6'));
        
        console.log(`   7.4 entries: ${entries74.length}`);
        console.log(`   7.5 entries: ${entries75.length}`);
        console.log(`   7.6 entries: ${entries76.length}`);
        
        // Log first 7.4 entry if exists
        if (entries74.length > 0) {
          console.log("   First 7.4 entry BEFORE edit replacement:");
          console.log("      pos:", entries74[0].pos);
          console.log("      checkingThe:", entries74[0].checkingThe);
        }
        
        // Combine all controls entries (7.4, 7.5, 7.6)
        let allControlsEntries = [...entries74, ...entries75, ...entries76];
        
        // Check for edited data and replace entries
        if (allControlsEntries.length > 0 && projectId && subjectMatterId) {
          console.log("🔄 Checking for edited data in editcontrols collection...");
          console.log(`   ProjectId: ${projectId}`);
          console.log(`   SubjectMatterId: ${subjectMatterId}`);
          
          try {
            // Get all edited controls for this project + subjectMatterId
            const editedControls = await db.collection("editcontrols").find({
              projectId: projectId,
              subjectMatterId: subjectMatterId,
            }).toArray();
            
            console.log(`📝 Found ${editedControls.length} edited controls`);
            
            if (editedControls.length > 0) {
              // Create a map of edited data by projectId + subjectMatterId + pos
              const editedDataMap = new Map();
              editedControls.forEach((editedControl) => {
                if (editedControl.editedFields && editedControl.editedFields.pos) {
                  const key = `${editedControl.projectId}_${editedControl.subjectMatterId}_${editedControl.editedFields.pos}`;
                  editedDataMap.set(key, editedControl.editedFields);
                  console.log(`🔑 Added to map - key: ${key}, pos: ${editedControl.editedFields.pos}`);
                }
              });
              
              console.log(`🗺️ Total keys in editedDataMap: ${editedDataMap.size}`);
              
              // Replace entries with edited data if exists
              let replacedCount = 0;
              allControlsEntries = allControlsEntries.map((entry) => {
                const key = `${projectId}_${subjectMatterId}_${entry.pos}`;
                const editedData = editedDataMap.get(key);
                
                if (editedData) {
                  replacedCount++;
                  console.log(`✅ Replacing entry pos="${entry.pos}" with edited data`);
                  console.log(`   Original checkingThe: "${entry.checkingThe}"`);
                  console.log(`   Edited checkingThe: "${editedData.checkingThe}"`);
                  return {
                    ...entry,
                    ...editedData, // Replace with edited fields
                    _isEdited: true,
                  };
                }
                return entry;
              });
              
              console.log(`📊 Total entries replaced: ${replacedCount} out of ${allControlsEntries.length}`);
              
              // Log first 7.4 entry AFTER replacement
              const first74AfterEdit = allControlsEntries.find(e => e.pos && e.pos.startsWith('7.4'));
              if (first74AfterEdit) {
                console.log("   First 7.4 entry AFTER edit replacement:");
                console.log("      pos:", first74AfterEdit.pos);
                console.log("      checkingThe:", first74AfterEdit.checkingThe);
                console.log("      _isEdited:", first74AfterEdit._isEdited);
              }
            }
          } catch (editError) {
            console.error("Error fetching edited controls:", editError);
          }
        }
        
        // Log before adding to checklistEntries
        if (allControlsEntries.length > 0) {
          const first74 = allControlsEntries.find(e => e.pos && e.pos.startsWith('7.4'));
          if (first74) {
            console.log("   7.4 entry BEFORE adding to checklistEntries:");
            console.log("      pos:", first74.pos);
            console.log("      checkingThe:", first74.checkingThe);
          }
        }
        
        // Add these entries to checklistEntries array
        if (allControlsEntries.length > 0) {
          checklistEntries.push(...allControlsEntries);
        }
        
        // Log after adding to checklistEntries
        const first74InList = checklistEntries.find(e => e.pos && e.pos.startsWith('7.4'));
        if (first74InList) {
          console.log("   7.4 entry AFTER adding to checklistEntries:");
          console.log("      pos:", first74InList.pos);
          console.log("      checkingThe:", first74InList.checkingThe);
        }
        
        console.log(`✅ Total checklist entries after adding 7.4, 7.5, 7.6: ${checklistEntries.length}`);
      } catch (error) {
        console.error("Error fetching controls of static report:", error);
      }

      // 9. Prepare PDF data
      const pdfData = {
        company: {
          name: company.name || "Company Name",
          address: company.address || "",
          postalCode: company.postalCode || company.postal_code || company.zipCode || "",
          cvr: company.cvr || company.cvrNumber || company.CVR || "",
          email: company.email || "",
          contactPerson: company.contactPerson || company.contact_person || "",
        },
        project: {
          name: project.name || "Project Name",
          address: project.address || "",
          createdAt: project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-GB') : "",
          caseNumber: project.caseNumber || project.case_number || project.projectNumber || "",
          specialText: projectSpecialText, // Special text from project
        },
        gamma: {
          _id: gamma._id ? String(gamma._id) : "", // Gamma document ID
          profession: gamma.profession?.GroupName || gamma.profession?.name || "N/A",
          subjectMatterId: gamma.profession?.SubjectMatterId || subjectMatterId,
          x: gamma.x || "",
          text: gamma.text || "", // Keep gamma text as well
          item: gamma.item || "",
          exc: gamma.exc || "",
          cc: gamma.cc || "",
          currentVersion: gamma.currentVersion || 1,
          description: gamma.description || gamma.note || "",
          specialControlId: gamma.specialControlId || "",
        },
        euroCodes: euroCodes,
        drawings: projectDrawings.map(drawing => ({
          name: drawing.originalname || drawing.filename || drawing.name || 'Drawing',
          path: drawing.s3Location || drawing.path || '',
          s3Key: drawing.s3Key || '',
          uploadedAt: drawing.uploadedAt || drawing.createdAt || ''
        })),
        checklistEntries: (() => {
          let logged74 = false;
          return checklistEntries.map((entry, index) => {
            const mappedEntry = {
              // Support both data sources (standards and controls of static report)
              pos: entry.pos || entry.ItemId || '',
              controlOf: entry.checkingThe || entry['Contol of'] || entry['Control of'] || '',
              checkingThe: entry.checkingThe || entry['Contol of'] || entry['Control of'] || '',
              subject: entry.subject || entry.Subject || '',
              constructionPart: entry.constructionPart || entry['Construction part'] || '',
              basis: entry.basis || entry.Basis || '',
              controlMethod: entry.controlMethod || entry['Control methode'] || entry['Control method'] || '',
              scope: entry.circumference || (entry.extent ? `${entry.extent * 100}%` : ''),
              circumference: entry.circumference || (entry.extent ? entry.extent : ''),
              acceptanceCriteria: entry.acceptanceCriteria || entry['Acceptance criteria'] || '',
              time: entry.time || entry.Time || ''
            };
            
            // Log first 7.4 entry during mapping
            if (mappedEntry.pos && mappedEntry.pos.startsWith('7.4') && !logged74) {
              logged74 = true;
              console.log("   7.4 entry DURING MAPPING:");
              console.log("      Original entry.checkingThe:", entry.checkingThe);
              console.log("      Mapped entry.checkingThe:", mappedEntry.checkingThe);
              console.log("      Mapped entry.controlOf:", mappedEntry.controlOf);
            }
            
            return mappedEntry;
          });
        })(),
      };

      console.log("📋 PDF Data prepared:");
      console.log("   Company:", {
        name: pdfData.company.name,
        address: pdfData.company.address,
        postalCode: pdfData.company.postalCode,
        cvr: pdfData.company.cvr,
        email: pdfData.company.email,
        contactPerson: pdfData.company.contactPerson
      });
      console.log("   Project:", {
        name: pdfData.project.name,
        address: pdfData.project.address,
        createdAt: pdfData.project.createdAt,
        caseNumber: pdfData.project.caseNumber,
        specialText: pdfData.project.specialText
      });
      console.log("   Gamma:", {
        profession: pdfData.gamma.profession,
        x: pdfData.gamma.x,
        cc: pdfData.gamma.cc,
        currentVersion: pdfData.gamma.currentVersion
      });
      console.log("   EuroCodes:", pdfData.euroCodes);
      console.log("   Drawings:", pdfData.drawings.length);
      if (pdfData.drawings.length > 0) {
        console.log("   Drawing names:", pdfData.drawings.map(d => d.name));
      }
      console.log("   Checklist entries:", pdfData.checklistEntries.length);
      
      // Log sample entries to verify checkingThe field
      const sampleEntries = pdfData.checklistEntries.slice(0, 3);
      console.log("   Sample entries with checkingThe:");
      sampleEntries.forEach((entry, index) => {
        console.log(`      Entry ${index + 1}:`);
        console.log(`         pos: "${entry.pos}"`);
        console.log(`         checkingThe: "${entry.checkingThe}"`);
        console.log(`         controlOf: "${entry.controlOf}"`);
      });

      // Return data for frontend to generate PDF
      res.status(200).json({
        success: true,
        data: pdfData,
      });
    } catch (error) {
      console.error("❌ Error generating static control plan PDF:", error);
      res.status(500).json({
        error: "Failed to generate static control plan PDF",
        details: error.message,
      });
    }
  });

  return router;
};

