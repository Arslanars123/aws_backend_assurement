const { ObjectId } = require('mongodb');

// API endpoint to get static report cover data
const getStaticReportCoverData = async (req, res) => {
  try {
    const { companyId, projectId } = req.query;
    
    if (!companyId || !projectId) {
      return res.status(400).json({ 
        error: "Missing required parameters: companyId and projectId" 
      });
    }

    console.log('=== GETTING STATIC REPORT COVER DATA ===');
    console.log('Company ID:', companyId);
    console.log('Project ID:', projectId);

    // Get database connection from the request
    const db = req.db;
    
    if (!db) {
      return res.status(500).json({ 
        error: "Database connection not available" 
      });
    }

    // Fetch company details
    const company = await db.collection("companies").findOne({
      _id: new ObjectId(companyId)
    });

    if (!company) {
      return res.status(404).json({ 
        error: "Company not found" 
      });
    }

    // Fetch the most recent static control plan from gammas collection
    const mostRecentControlPlan = await db.collection("gammas")
      .find({
        companyId: companyId,
        projectsId: { $in: [projectId] }
      })
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(1)
      .toArray();

    // Get the document number (count of static control plans for this project)
    const totalControlPlans = await db.collection("gammas").countDocuments({
      companyId: companyId,
      projectsId: { $in: [projectId] }
    });

    // Prepare response data
    const responseData = {
      company: {
        name: company.name || 'Company Name Not Found',
        logo: company.logo || company.picture || null,
        id: company._id
      },
      project: {
        id: projectId
      },
      staticControlPlan: {
        mostRecent: mostRecentControlPlan.length > 0 ? mostRecentControlPlan[0] : null,
        documentNumber: totalControlPlans + 1, // Next document number
        totalDocuments: totalControlPlans
      }
    };

    console.log('Response data:', {
      companyName: responseData.company.name,
      hasLogo: !!responseData.company.logo,
      documentNumber: responseData.staticControlPlan.documentNumber,
      totalDocuments: responseData.staticControlPlan.totalDocuments
    });

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error("Error fetching static report cover data:", error);
    res.status(500).json({ 
      error: "Failed to fetch static report cover data",
      details: error.message 
    });
  }
};

// API endpoint to get static report template with dynamic data
const getStaticReportTemplate = async (req, res) => {
  try {
    console.log('=== TEMPLATE API CALLED ===');
    const { companyId, projectId } = req.query;
    
    if (!companyId || !projectId) {
      return res.status(400).json({ 
        error: "Missing required parameters: companyId and projectId" 
      });
    }

    // Get database connection from the request
    const db = req.db;
    
    if (!db) {
      return res.status(500).json({ 
        error: "Database connection not available" 
      });
    }

    // Fetch company details
    const company = await db.collection("companies").findOne({
      _id: new ObjectId(companyId)
    });

    if (!company) {
      return res.status(404).json({ 
        error: "Company not found" 
      });
    }

    // Fetch the most recent static control plan from gammas collection
    const mostRecentControlPlan = await db.collection("gammas")
      .find({
        companyId: companyId,
        projectsId: { $in: [projectId] }
      })
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(1)
      .toArray();

    // Get the document number (count of static control plans for this project)
    const totalControlPlans = await db.collection("gammas").countDocuments({
      companyId: companyId,
      projectsId: { $in: [projectId] }
    });

    // Read the HTML template
    const fs = require('fs');
    const path = require('path');
    const templatePath = path.join(__dirname, 'static-report-templates', 'static-control-report-cover.html');
    console.log('Current directory:', __dirname);
    console.log('Template path:', templatePath);
    
    console.log('Template path:', templatePath);
    console.log('Template file exists:', fs.existsSync(templatePath));
    
    let htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    console.log('Template loaded, length:', htmlTemplate.length);
    
    // Replace placeholders with dynamic data
    const companyName = company.name || 'Company Name Not Found';
    const documentNumber = totalControlPlans + 1;
    
    // Replace company name in executing party
    htmlTemplate = htmlTemplate.replace(
      'Executing party: _________________________',
      `Executing party: ${companyName}`
    );
    
    // Replace Document ID B3 with dynamic number
    htmlTemplate = htmlTemplate.replace(
      'Document ID: B3.',
      `Document ID: ${documentNumber}.`
    );
    
    // Replace company logo placeholder with actual logo if available
    if (company.logo || company.picture) {
      const logoPath = company.logo || company.picture;
      const logoHtml = `<img src="/uploads/${logoPath}" alt="Company Logo" style="width: 80px; height: 60px; object-fit: contain; border-radius: 4px;" />`;
      
      console.log('=== LOGO REPLACEMENT DEBUG ===');
      console.log('Logo path:', logoPath);
      console.log('Logo HTML:', logoHtml);
      
      // Replace the entire company-logo-placeholder div with the image
      htmlTemplate = htmlTemplate.replace(
        /<div class="company-logo-placeholder">[\s\S]*?<\/div>/,
        logoHtml
      );
      
      console.log('Logo replacement completed');
    }

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlTemplate);

  } catch (error) {
    console.error("Error generating static report template:", error);
    res.status(500).json({ 
      error: "Failed to generate static report template",
      details: error.message 
    });
  }
};

// API endpoint to get static inspection report data
const getStaticInspectionReportData = async (req, res) => {
  try {
    const { companyId, projectId, professionSubjectMatterId } = req.query;
    
    if (!companyId || !projectId || !professionSubjectMatterId) {
      return res.status(400).json({ 
        error: "Missing required parameters: companyId, projectId, and professionSubjectMatterId" 
      });
    }

    console.log('=== GETTING STATIC INSPECTION REPORT DATA ===');
    console.log('Company ID:', companyId);
    console.log('Project ID:', projectId);
    console.log('Profession Subject Matter ID:', professionSubjectMatterId);

    // Get database connection from the request
    const db = req.db;
    
    if (!db) {
      return res.status(500).json({ 
        error: "Database connection not available" 
      });
    }

    // Fetch project details
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId)
    });

    if (!project) {
      return res.status(404).json({ 
        error: "Project not found" 
      });
    }

    // Fetch company details
    const company = await db.collection("companies").findOne({
      _id: new ObjectId(companyId)
    });

    if (!company) {
      return res.status(404).json({ 
        error: "Company not found" 
      });
    }

    // Fetch the latest static control plan from gammas collection
    const latestStaticControlPlan = await db.collection("gammas")
      .find({
        companyId: companyId,
        projectsId: { $in: [projectId] },
        "profession.SubjectMatterId": professionSubjectMatterId
      })
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(1)
      .toArray();

    // Fetch signatures for this company, project, and profession
    console.log('DEBUG: Signature query params:', { companyId, projectId, professionSubjectMatterId });
    const signatures = await db.collection("signatures")
      .find({
        companyId: companyId,
        projectsId: { $in: [projectId] },
        professionSubjectMatterId: professionSubjectMatterId
      })
      .sort({ createdAt: -1 }) // Sort by newest first
      .toArray();
    console.log('DEBUG: Found signatures:', signatures.length);

    // Prepare response data
    const responseData = {
      project: {
        id: project._id,
        name: project.name || 'Project Name Not Found',
        address: project.address || 'Address Not Found',
        postalCode: project.postalCode || 'Postal Code Not Found',
        city: project.city || 'City Not Found',
        contactPerson: project.contactPerson || 'Contact Person Not Found',
        startDate: project.startDate || 'Start Date Not Found'
      },
      company: {
        id: company._id,
        name: company.name || 'Company Name Not Found',
        address: company.address || 'Address Not Found',
        postalCode: company.postalCode || 'Postal Code Not Found',
        city: company.city || 'City Not Found',
        cvr: company.cvr || 'CVR Not Found',
        email: company.email || 'Email Not Found',
        contact: company.contact || 'Contact Not Found'
      },
      staticControlPlan: {
        latest: latestStaticControlPlan.length > 0 ? latestStaticControlPlan[0] : null,
        constructionClass: latestStaticControlPlan.length > 0 ? latestStaticControlPlan[0].cc : null,
        excClass: latestStaticControlPlan.length > 0 ? latestStaticControlPlan[0].exc : null,
        profession: latestStaticControlPlan.length > 0 ? latestStaticControlPlan[0].profession : null
      },
      signatures: {
        latest: signatures.length > 0 ? signatures[0] : null,
        all: signatures
      }
    };

    console.log('Response data:', {
      projectName: responseData.project.name,
      companyName: responseData.company.name,
      hasStaticControlPlan: !!responseData.staticControlPlan.latest,
      constructionClass: responseData.staticControlPlan.constructionClass,
      excClass: responseData.staticControlPlan.excClass
    });

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error("Error fetching static inspection report data:", error);
    res.status(500).json({ 
      error: "Failed to fetch static inspection report data",
      details: error.message 
    });
  }
};

// API endpoint to get static inspection report template with dynamic data
const getStaticInspectionReportTemplate = async (req, res) => {
  try {
    console.log('=== INSPECTION TEMPLATE API CALLED ===');
    const { companyId, projectId, professionSubjectMatterId } = req.query;
    
    if (!companyId || !projectId || !professionSubjectMatterId) {
      return res.status(400).json({ 
        error: "Missing required parameters: companyId, projectId, and professionSubjectMatterId" 
      });
    }

    // Get database connection from the request
    const db = req.db;
    
    if (!db) {
      return res.status(500).json({ 
        error: "Database connection not available" 
      });
    }

    // Fetch project details
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId)
    });

    if (!project) {
      return res.status(404).json({ 
        error: "Project not found" 
      });
    }

    // Fetch company details
    const company = await db.collection("companies").findOne({
      _id: new ObjectId(companyId)
    });

    if (!company) {
      return res.status(404).json({ 
        error: "Company not found" 
      });
    }

    // Fetch the latest static control plan from gammas collection
    const latestStaticControlPlan = await db.collection("gammas")
      .find({
        companyId: companyId,
        projectsId: { $in: [projectId] },
        "profession.SubjectMatterId": professionSubjectMatterId
      })
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(1)
      .toArray();

    // Fetch signatures for this company, project, and profession
    console.log('DEBUG: Signature query params:', { companyId, projectId, professionSubjectMatterId });
    const signatures = await db.collection("signatures")
      .find({
        companyId: companyId,
        projectsId: { $in: [projectId] },
        professionSubjectMatterId: professionSubjectMatterId
      })
      .sort({ createdAt: -1 }) // Sort by newest first
      .toArray();
    console.log('DEBUG: Found signatures:', signatures.length);

    // Read the HTML template
    const fs = require('fs');
    const path = require('path');
    const templatePath = path.join(__dirname, 'static-report-templates', 'static-inspection-report.html');
    
    console.log('Template path:', templatePath);
    console.log('Template file exists:', fs.existsSync(templatePath));
    
    let htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    console.log('Template loaded, length:', htmlTemplate.length);
    
    // Replace placeholders with dynamic data
    const projectName = project.name || 'Project Name Not Found';
    const projectIdShort = projectId.substring(0, 8) + '...';
    const projectAddress = project.address || 'Address Not Found';
    const projectPostal = `${project.postalCode || '0000'} ${project.city || 'City'}`;
    const projectContact = project.contactPerson || 'Contact Person Not Found';
    const projectStartup = project.startDate || '[Select Date]';
    
    const companyName = company.name || 'Company Name Not Found';
    const companyAddress = company.address || 'Address Not Found';
    const companyPostal = `${company.postalCode || '0000'} ${company.city || 'City'}`;
    const companyCvr = company.cvr || 'CVR Not Found';
    const companyEmail = company.email || 'Email Not Found';
    const companyContact = company.contact || 'Contact Not Found';
    
    const constructionClass = latestStaticControlPlan.length > 0 ? latestStaticControlPlan[0].cc : 'KK3';
    
    // Get current date for signatures
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
    
    // Get latest signature data
    const latestSignature = signatures.length > 0 ? signatures[0] : null;
    
    console.log('DEBUG: Found signatures count:', signatures.length);
    if (signatures.length > 0) {
      console.log('DEBUG: Latest signature:', JSON.stringify(latestSignature, null, 2));
    }
    
    // Replace project data
    htmlTemplate = htmlTemplate.replace('id="project-name">_________________________', `id="project-name">${projectName}`);
    htmlTemplate = htmlTemplate.replace('id="project-id">_________________________', `id="project-id">${projectIdShort}`);
    htmlTemplate = htmlTemplate.replace('id="project-full-name">_________________________', `id="project-full-name">${projectName}`);
    htmlTemplate = htmlTemplate.replace('id="project-address">_________________________', `id="project-address">${projectAddress}`);
    htmlTemplate = htmlTemplate.replace('id="project-postal">_________________________', `id="project-postal">${projectPostal}`);
    htmlTemplate = htmlTemplate.replace('id="project-contact">_________________________', `id="project-contact">${projectContact}`);
    htmlTemplate = htmlTemplate.replace('id="project-startup">[Select Date]', `id="project-startup">${projectStartup}`);
    
    // Replace company data
    htmlTemplate = htmlTemplate.replace('id="company-name">_________________________', `id="company-name">${companyName}`);
    htmlTemplate = htmlTemplate.replace('id="company-full-name">_________________________', `id="company-full-name">${companyName}`);
    htmlTemplate = htmlTemplate.replace('id="company-address">_________________________', `id="company-address">${companyAddress}`);
    htmlTemplate = htmlTemplate.replace('id="company-postal">_________________________', `id="company-postal">${companyPostal}`);
    htmlTemplate = htmlTemplate.replace('id="company-cvr">_________________________', `id="company-cvr">${companyCvr}`);
    htmlTemplate = htmlTemplate.replace('id="company-email">_________________________', `id="company-email">${companyEmail}`);
    htmlTemplate = htmlTemplate.replace('id="company-contact">_________________________', `id="company-contact">${companyContact}`);
    
    // Replace construction cluster
    htmlTemplate = htmlTemplate.replace('<td>KK3</td>', `<td>${constructionClass}</td>`);
    
    // Replace signature data
    if (latestSignature) {
      // Person 1
      if (latestSignature.person1Name) {
        htmlTemplate = htmlTemplate.replace('id="person1-name">Enterprise', `id="person1-name">${latestSignature.person1Name}`);
      }
      if (latestSignature.signature1) {
        htmlTemplate = htmlTemplate.replace(
          'id="signature1-image" class="signature-image" style="display: none;"',
          `id="signature1-image" class="signature-image" src="/uploads/${latestSignature.signature1}" style="display: block;"`
        );
      }
      htmlTemplate = htmlTemplate.replace('data-date="" id="date1"', `data-date="${currentDate}" id="date1"`);
      
      // Person 2
      if (latestSignature.person2Name) {
        htmlTemplate = htmlTemplate.replace('id="person2-name">Enterprise', `id="person2-name">${latestSignature.person2Name}`);
      }
      if (latestSignature.signature2) {
        htmlTemplate = htmlTemplate.replace(
          'id="signature2-image" class="signature-image" style="display: none;"',
          `id="signature2-image" class="signature-image" src="/uploads/${latestSignature.signature2}" style="display: block;"`
        );
      }
      htmlTemplate = htmlTemplate.replace('data-date="" id="date2"', `data-date="${currentDate}" id="date2"`);
      
      // Person 3
      if (latestSignature.person3Name) {
        htmlTemplate = htmlTemplate.replace('id="person3-name">Enterprise', `id="person3-name">${latestSignature.person3Name}`);
      }
      if (latestSignature.signature3) {
        htmlTemplate = htmlTemplate.replace(
          'id="signature3-image" class="signature-image" style="display: none;"',
          `id="signature3-image" class="signature-image" src="/uploads/${latestSignature.signature3}" style="display: block;"`
        );
      }
      htmlTemplate = htmlTemplate.replace('data-date="" id="date3"', `data-date="${currentDate}" id="date3"`);
    }
    
    // Always set current date for all signature blocks (whether signatures exist or not)
    htmlTemplate = htmlTemplate.replace(/data-date="" id="date1"/g, `data-date="${currentDate}" id="date1"`);
    htmlTemplate = htmlTemplate.replace(/data-date="" id="date2"/g, `data-date="${currentDate}" id="date2"`);
    htmlTemplate = htmlTemplate.replace(/data-date="" id="date3"/g, `data-date="${currentDate}" id="date3"`);
    
    console.log('Template populated with data');
    console.log('Project:', projectName);
    console.log('Company:', companyName);
    console.log('Construction Class:', constructionClass);
    console.log('Has Signatures:', !!latestSignature);
    console.log('Current Date:', currentDate);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlTemplate);

  } catch (error) {
    console.error("Error generating static inspection report template:", error);
    res.status(500).json({ 
      error: "Failed to generate static inspection report template",
      details: error.message 
    });
  }
};

module.exports = {
  getStaticReportCoverData,
  getStaticReportTemplate,
  getStaticInspectionReportData,
  getStaticInspectionReportTemplate
};
