const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Utility function to render HTML to PDF buffer
async function renderHTMLToPDF(html, options = {}) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-javascript', // Completely disable JavaScript
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const page = await browser.newPage();
    
    // Disable JavaScript completely
    await page.setJavaScriptEnabled(false);
    
    // Allow images to load but block other resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'script' || resourceType === 'media' || resourceType === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    // Simple configuration
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    
    // Wait for images to load
    await page.waitForTimeout(3000);
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });

    return pdfBuffer;
  } catch (error) {
    console.error('Puppeteer error:', error.message);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError.message);
      }
    }
  }
}

// Function to fetch data from APIs
async function fetchDynamicData(companyId, projectId, subjectMatterId, baseUrl) {
  try {
    console.log('🔄 Fetching dynamic data...');
    
    // Fetch company details
    const companyResponse = await fetch(`${baseUrl}/get-company-detail/${companyId}`);
    const company = await companyResponse.json();
    console.log('✅ Company data fetched');

    // Fetch project details
    const projectResponse = await fetch(`${baseUrl}/get-project-detail/${projectId}`);
    const project = await projectResponse.json();
    console.log('✅ Project data fetched');

    // Fetch special text
    const specialTextResponse = await fetch(`${baseUrl}/get-project-special-text?projectId=${projectId}`);
    const specialTextData = await specialTextResponse.json();
    console.log('✅ Special text fetched');

    // Fetch signatures
    const signaturesResponse = await fetch(`${baseUrl}/get-static-report-signatures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, projectId,subjectMatterId })
    });
    const signatures = await signaturesResponse.json();
    console.log('✅ Signatures fetched');

    return {
      company,
      project,
      specialText: specialTextData,
      signatures: signatures.filter(sig => sig.subjectMatterId === subjectMatterId)
    };
  } catch (error) {
    console.error('❌ Error fetching dynamic data:', error);
    return {
      company: { name: 'Company Name', address: 'Address', cvr: 'CVR', email: 'email@company.com', contactPerson: 'Contact Person' },
      project: { name: 'Project Name', address: 'Project Address', postalCode: '1234', city: 'City', contactPerson: 'Contact Person', startDate: new Date().toISOString() },
      specialText: { success: false, data: { specialText: '' } },
      signatures: []
    };
  }
}

// Function to load and process HTML templates with server-side data injection
async function loadHTMLTemplates(page1Path, page2Path, dynamicData = {}) {
  try {
    // Fetch dynamic data from APIs
    const apiData = await fetchDynamicData(
      dynamicData.companyId, 
      dynamicData.projectId, 
      dynamicData.subjectMatterId, 
      dynamicData.baseUrl
    );

    // Read both HTML files
    const page1HTML = fs.readFileSync(page1Path, 'utf8');
    const page2HTML = fs.readFileSync(page2Path, 'utf8');

    // Remove ALL JavaScript to prevent navigation issues
    const cleanPage1 = page1HTML.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/onload="[^"]*"/gi, '').replace(/onclick="[^"]*"/gi, '');
    const cleanPage2 = page2HTML.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/onload="[^"]*"/gi, '').replace(/onclick="[^"]*"/gi, '');

    // Extract body content from both pages
    const page1Body = extractBodyContent(cleanPage1);
    const page2Body = extractBodyContent(cleanPage2);

    // Extract head content (styles only, no scripts)
    const page1Head = extractHeadContent(cleanPage1);
    const page2Head = extractHeadContent(cleanPage2);

    // Combine head content (avoid duplicates)
    const combinedHead = combineHeadContent(page1Head, page2Head);

    // Inject server-side data into templates
    const processedPage1 = injectServerData(page1Body, apiData);
    const processedPage2 = injectServerData(page2Body, apiData);

    // Create combined HTML with injected data
    const combinedHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Combined Quality Report</title>
        ${combinedHead}
        <style>
          /* Additional styles for PDF generation */
          @media print { 
            .page-break { 
              page-break-before: always; 
            }
            body { 
              background: #fff !important; 
            }
            .page { 
              box-shadow: none !important; 
              margin: 0 !important; 
            }
          }
          
          /* Ensure proper page breaks */
          .page-container {
            page-break-inside: avoid;
          }
          
          .page-container + .page-container {
            page-break-before: always;
          }
          
          /* Signature image styles */
          .signature-image {
            max-width: 150px;
            max-height: 60px;
            border: 1px solid #c3cfdd;
            padding: 4px;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          ${processedPage1}
        </div>
        <div class="page-container page-break">
          ${processedPage2}
        </div>
      </body>
      </html>
    `;

    return combinedHTML;
  } catch (error) {
    console.error('Error loading HTML templates:', error);
    throw error;
  }
}

// Function to inject server-side data into HTML
function injectServerData(html, data) {
  let processedHTML = html;

  // Inject company data
  if (data.company) {
    processedHTML = processedHTML.replace(/id="company-name"[^>]*><\/[^>]*>/gi, `id="company-name">${data.company.name || ''}</div>`);
    processedHTML = processedHTML.replace(/id="company-name-full"[^>]*><\/[^>]*>/gi, `id="company-name-full">${data.company.name || ''}</div>`);
    processedHTML = processedHTML.replace(/id="company-address"[^>]*><\/[^>]*>/gi, `id="company-address">${data.company.address || ''}</div>`);
    processedHTML = processedHTML.replace(/id="company-post"[^>]*><\/[^>]*>/gi, `id="company-post">${data.company.postalCode || ''} ${data.company.city || ''}</div>`);
    processedHTML = processedHTML.replace(/id="company-cvr"[^>]*><\/[^>]*>/gi, `id="company-cvr">${data.company.cvr || ''}</div>`);
    processedHTML = processedHTML.replace(/id="company-email"[^>]*><\/[^>]*>/gi, `id="company-email">${data.company.email || ''}</div>`);
    processedHTML = processedHTML.replace(/id="company-contact"[^>]*><\/[^>]*>/gi, `id="company-contact">${data.company.contactPerson || ''}</div>`);
    
    // Inject company logo
    if (data.company.picture) {
      let logoUrl = '';
      if (data.company.picture.s3Location) {
        logoUrl = data.company.picture.s3Location;
      } else if (data.company.picture.filename) {
        logoUrl = `http://localhost:3000/uploads/${data.company.picture.filename}`;
      }
      
      if (logoUrl) {
        // Replace company logo containers with actual images
        processedHTML = processedHTML.replace(
          /<div class="company-logo-sm"[^>]*>Company logo<\/div>/gi,
          `<div class="company-logo-sm"><img src="${logoUrl}" style="max-width: 140px; max-height: 60px; object-fit: contain; border: 1px solid #c3cfdd; border-radius: 4px;" /></div>`
        );
        processedHTML = processedHTML.replace(
          /<div class="company-logo"[^>]*>Company logo<\/div>/gi,
          `<div class="company-logo"><img src="${logoUrl}" style="max-width: 140px; max-height: 32px; object-fit: contain; border: 1px solid #c3cfdd; border-radius: 4px;" /></div>`
        );
      }
    }
  }

  // Inject project data
  if (data.project) {
    processedHTML = processedHTML.replace(/id="project-name"[^>]*><\/[^>]*>/gi, `id="project-name">${data.project.name || ''}</div>`);
    processedHTML = processedHTML.replace(/id="project-id"[^>]*><\/[^>]*>/gi, `id="project-id">${data.project._id || ''}</div>`);
    processedHTML = processedHTML.replace(/id="project-name-full"[^>]*><\/[^>]*>/gi, `id="project-name-full">${data.project.name || ''}</div>`);
    processedHTML = processedHTML.replace(/id="project-address"[^>]*><\/[^>]*>/gi, `id="project-address">${data.project.address || ''}</div>`);
    processedHTML = processedHTML.replace(/id="project-post"[^>]*><\/[^>]*>/gi, `id="project-post">${data.project.postalCode || ''} ${data.project.city || ''}</div>`);
    processedHTML = processedHTML.replace(/id="project-contact"[^>]*><\/[^>]*>/gi, `id="project-contact">${data.project.contactPerson || ''}</div>`);
    processedHTML = processedHTML.replace(/id="project-startup"[^>]*><\/[^>]*>/gi, `id="project-startup">${data.project.startDate ? new Date(data.project.startDate).toLocaleDateString() : ''}</div>`);
  }

  // Inject special text
  if (data.specialText && data.specialText.success && data.specialText.data && data.specialText.data.specialText) {
    processedHTML = processedHTML.replace(/id="document-id"[^>]*>B3\.<\/[^>]*>/gi, `id="document-id">B3. ${data.specialText.data.specialText}</div>`);
  }

  // Inject signatures
  if (data.signatures && data.signatures.length > 0) {
    data.signatures.forEach(sig => {
      if (sig.signatureType === 1) {
        processedHTML = processedHTML.replace(/id="sig1-name"[^>]*><\/[^>]*>/gi, `id="sig1-name">${sig.name || ''}</div>`);
        processedHTML = processedHTML.replace(/id="sig1-date"[^>]*><\/[^>]*>/gi, `id="sig1-date">${sig.signatureDate ? new Date(sig.signatureDate).toLocaleDateString() : ''}</div>`);
        if (sig.signature) {
          processedHTML = processedHTML.replace(
            /<div id="sig1-signature"[^>]*><\/div>/gi,
            `<div id="sig1-signature"><img src="${sig.signature}" class="signature-image" /></div>`
          );
        }
      } else if (sig.signatureType === 2) {
        processedHTML = processedHTML.replace(/id="sig2-name"[^>]*><\/[^>]*>/gi, `id="sig2-name">${sig.name || ''}</div>`);
        processedHTML = processedHTML.replace(/id="sig2-date"[^>]*><\/[^>]*>/gi, `id="sig2-date">${sig.signatureDate ? new Date(sig.signatureDate).toLocaleDateString() : ''}</div>`);
        if (sig.signature) {
          processedHTML = processedHTML.replace(
            /<div id="sig2-signature"[^>]*><\/div>/gi,
            `<div id="sig2-signature"><img src="${sig.signature}" class="signature-image" /></div>`
          );
        }
      } else if (sig.signatureType === 3) {
        processedHTML = processedHTML.replace(/id="sig3-name"[^>]*><\/[^>]*>/gi, `id="sig3-name">${sig.name || ''}</div>`);
        processedHTML = processedHTML.replace(/id="sig3-date"[^>]*><\/[^>]*>/gi, `id="sig3-date">${sig.signatureDate ? new Date(sig.signatureDate).toLocaleDateString() : ''}</div>`);
        if (sig.signature) {
          processedHTML = processedHTML.replace(
            /<div id="sig3-signature"[^>]*><\/div>/gi,
            `<div id="sig3-signature"><img src="${sig.signature}" class="signature-image" /></div>`
          );
        }
      }
    });
  }

  // Inject Assurement logo
  processedHTML = processedHTML.replace(
    /<img src="logo\.png"[^>]*>/gi,
    `<img src="http://localhost:3000/final_static/logo.png" alt="Assurement Logo" style="width: 100%; height: 100%; object-fit: contain;" />`
  );

  return processedHTML;
}

// Helper function to extract body content
function extractBodyContent(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

// Helper function to extract head content
function extractHeadContent(html) {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return headMatch ? headMatch[1] : '';
}

// Helper function to combine head content (avoid duplicates)
function combineHeadContent(head1, head2) {
  // Simple approach: combine both heads
  // In a more sophisticated implementation, you could parse and deduplicate
  return head1 + '\n' + head2;
}

// Helper function to replace dynamic data
function replaceDynamicData(html, data) {
  let processedHTML = html;
  
  // Replace common placeholders
  Object.keys(data).forEach(key => {
    const placeholder = `{{${key.toUpperCase()}}}`;
    processedHTML = processedHTML.replace(new RegExp(placeholder, 'g'), data[key] || '');
  });
  
  return processedHTML;
}

// Main endpoint for generating combined PDF
router.post('/generate-combined-pdf', async (req, res) => {
  const startTime = Date.now();
  console.log('🚀 Starting PDF generation...');
  
  try {
    const { 
      companyId, 
      projectId, 
      subjectMatterId = 'KP13',
      baseUrl = 'http://localhost:3000',
      filename = 'combined-quality-report.pdf'
    } = req.body;

    console.log('📋 PDF Generation Parameters:', { companyId, projectId, subjectMatterId, filename });

    // Define paths to HTML templates
    const page1Path = path.join(__dirname, '../../final_static/second_page.html');
    const page2Path = path.join(__dirname, '../../final_static/signatures_page.html');

    // Check if files exist
    if (!fs.existsSync(page1Path)) {
      console.error('❌ Page 1 template not found:', page1Path);
      return res.status(404).json({ 
        success: false, 
        message: `Page 1 template not found: ${page1Path}` 
      });
    }

    if (!fs.existsSync(page2Path)) {
      console.error('❌ Page 2 template not found:', page2Path);
      return res.status(404).json({ 
        success: false, 
        message: `Page 2 template not found: ${page2Path}` 
      });
    }

    console.log('✅ Templates found, loading HTML...');

    // Prepare dynamic data
    const dynamicData = {
      companyId: companyId || '68f76ce994e7d41efe754dc4',
      projectId: projectId || '68fa70ccee0ab59dfc5f591a',
      subjectMatterId: subjectMatterId,
      baseUrl: baseUrl
    };

    // Load and combine HTML templates
    console.log('🔄 Loading and combining HTML templates...');
    const combinedHTML = await loadHTMLTemplates(page1Path, page2Path, dynamicData);

    console.log('🎨 Rendering HTML to PDF...');
    const renderStartTime = Date.now();

    // Render to PDF
    const pdfBuffer = await renderHTMLToPDF(combinedHTML);

    const renderTime = Date.now() - renderStartTime;
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ PDF generated successfully!`);
    console.log(`📊 Stats: Size: ${pdfBuffer.length} bytes, Render time: ${renderTime}ms, Total time: ${totalTime}ms`);

    // Return PDF as file
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
      'X-Generation-Time': totalTime.toString(),
      'X-PDF-Size': pdfBuffer.length.toString()
    });
    
    res.send(pdfBuffer);

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Error generating PDF:', error.message);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.stack,
      generationTime: totalTime
    });
  }
});

// Alternative endpoint that saves PDF to file
router.post('/generate-combined-pdf-save', async (req, res) => {
  try {
    const { 
      companyId, 
      projectId, 
      subjectMatterId = 'KP13',
      baseUrl = 'http://localhost:3000',
      filename = 'combined-quality-report.pdf',
      savePath = './uploads'
    } = req.body;

    // Define paths to HTML templates
    const page1Path = path.join(__dirname, '../../final_static/second_page.html');
    const page2Path = path.join(__dirname, '../../final_static/signatures_page.html');

    // Check if files exist
    if (!fs.existsSync(page1Path)) {
      return res.status(404).json({ 
        success: false, 
        message: `Page 1 template not found: ${page1Path}` 
      });
    }

    if (!fs.existsSync(page2Path)) {
      return res.status(404).json({ 
        success: false, 
        message: `Page 2 template not found: ${page2Path}` 
      });
    }

    // Prepare dynamic data
    const dynamicData = {
      companyId: companyId || '68f76ce994e7d41efe754dc4',
      projectId: projectId || '68fa70ccee0ab59dfc5f591a',
      subjectMatterId: subjectMatterId,
      baseUrl: baseUrl
    };

    // Load and combine HTML templates
    const combinedHTML = await loadHTMLTemplates(page1Path, page2Path, dynamicData);

    // Render to PDF
    const pdfBuffer = await renderHTMLToPDF(combinedHTML);

    // Ensure save directory exists
    const fullSavePath = path.resolve(savePath);
    if (!fs.existsSync(fullSavePath)) {
      fs.mkdirSync(fullSavePath, { recursive: true });
    }

    // Save PDF to file
    const filePath = path.join(fullSavePath, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    console.log(`PDF saved to: ${filePath}`);

    res.json({ 
      success: true, 
      message: 'PDF generated and saved successfully',
      filePath: filePath,
      filename: filename,
      size: pdfBuffer.length
    });

  } catch (error) {
    console.error('Error generating and saving PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.stack 
    });
  }
});

// Health check endpoint
router.get('/pdf-generator-health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'PDF Generator service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
