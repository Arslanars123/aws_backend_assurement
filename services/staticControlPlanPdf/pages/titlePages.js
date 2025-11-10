const { euroCodeNames } = require('../constants');

function renderTitleAndIntro(doc, data, context) {
  const {
    margin,
    pageWidth,
    pageHeight,
    safeRight,
    contentWidth,
    colors: { primary, footerText },
  } = context;

  const safeRightText = (text, y, options = {}) => {
    doc.text(text, safeRight, y, { align: 'right', ...options });
  };

  // Page 1: Title Page
  // -----------------

  // Header - Logo and Company Name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Assurement', margin, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Report system', margin, 26);

  // Main Title Box with Dashed Border
  const boxY = 40;
  const boxHeight = 60;
  doc.setDrawColor(100, 100, 100);
  doc.setLineDash([3, 3]);
  doc.rect(margin, boxY, contentWidth, boxHeight);
  doc.setLineDash([]); // Reset to solid line

  // Company Name inside box
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.company.name || '[Company Name]', margin + 5, boxY + 8);

  // Main Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Statisk Kontrolplan', margin + contentWidth / 2, boxY + 25, { align: 'center' });

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('For udførende indenfor konstruktionsafsnit', margin + contentWidth / 2, boxY + 33, {
    align: 'center',
  });

  // Horizontal line
  doc.setDrawColor(0, 0, 0);
  doc.line(margin + 5, boxY + 38, safeRight - 5, boxY + 38);

  // B3. (X-number) and Special Text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const xValue = data.gamma.x || '';
  const specialText = data.project.specialText || ''; // Get special text from PROJECT

  // B3. X-number
  doc.text(`B3. ${xValue}`, margin + 5, boxY + 48);

  // Special text on new line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (specialText) {
    doc.text(`"${specialText}"`, margin + 5, boxY + 55);
  } else {
    doc.text('"Special text"', margin + 5, boxY + 55);
  }

  // STATIC DOCUMENTATION Section
  const sectionY = boxY + boxHeight + 20;

  // Blue bar with heading
  doc.setFillColor(...primary);
  doc.rect(margin, sectionY, contentWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('STATIC DOCUMENTATION', margin + 5, sectionY + 7);

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Introductory text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('For load-bearing structures according to DS1140 applicable for:', margin, sectionY + 20);

  // Eurocode label
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Eurocode:', margin, sectionY + 30);

  // Display special text below Eurocode label
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  const displayText = specialText || 'Special text';
  doc.text(displayText, margin, sectionY + 37);

  // Applicable EU standards heading (right aligned)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  safeRightText('Applicable EU standards 2024', sectionY + 20);

  // EuroCode List (Bullet points)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let listY = sectionY + 50;
  const lineHeight = 5;

  // Get selected EuroCodes
  const selectedEuroCodes = data.euroCodes || [];

  // Create list of EuroCodes to display
  const euroCodeList = [];

  if (selectedEuroCodes.length > 0) {
    // Show only selected EuroCodes
    selectedEuroCodes.forEach((code) => {
      const euroCodeName = euroCodeNames[String(code)] || `Eurocode ${code}`;
      euroCodeList.push(euroCodeName);
    });
  } else {
    // Show all EuroCodes if none selected
    Object.values(euroCodeNames).forEach((name) => {
      euroCodeList.push(name);
    });
  }

  // Display EuroCode list
  euroCodeList.forEach((euroCodeName) => {
    // Check if we need a new page
    if (listY > pageHeight - 30) {
      doc.addPage();
      listY = 20;
    }

    safeRightText('•', listY);
    safeRightText(euroCodeName, listY);
    listY += lineHeight;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(...footerText);
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10);
  safeRightText('Page 1', pageHeight - 10);

  // Page 2: Construction Case
  // -------------------------
  doc.addPage();
  doc.setTextColor(0, 0, 0);

  // Header - CONSTRUCTION CASE
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageWidth, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSTRUCTION CASE:', margin, 10);
  doc.setTextColor(0, 0, 0);

  // Main section with dashed border
  const boxStartY = 25;
  const box2Height = 50; // Renamed to avoid conflict with Page 1 boxHeight
  doc.setDrawColor(100, 100, 100);
  doc.setLineDash([3, 3]);
  doc.rect(margin, boxStartY, contentWidth, box2Height);
  doc.setLineDash([]);

  // Three columns inside the box
  const col1Width = 50;
  const col2Width = 70;
  const col3Width = contentWidth - col1Width - col2Width;

  // Column 1: Created
  let currentX = margin + 5;
  let currentY = boxStartY + 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Created', currentX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const createdDate = data.project.createdAt || data.gamma.createdAt || new Date().toLocaleDateString('en-GB');
  doc.text(createdDate, currentX, currentY + 5);

  // Column 2: Project name/ID
  currentX += col1Width;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Project name/ID', currentX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Name:', currentX, currentY + 6);
  doc.text(data.project.name || 'N/A', currentX + 15, currentY + 6);
  doc.text('Case no.:', currentX, currentY + 11);
  doc.text(data.project.caseNumber || data.project.projectNumber || 'N/A', currentX + 15, currentY + 11);
  doc.text('Address:', currentX, currentY + 16);
  const address = data.project.address || 'N/A';
  const addressLines = doc.splitTextToSize(address, col2Width - 15);
  doc.text(addressLines, currentX + 15, currentY + 16);

  // Column 3: Prepared by: company
  currentX += col2Width;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Prepared by: company', currentX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Company name:', currentX, currentY + 6);
  doc.text(data.company.name || 'N/A', currentX + 25, currentY + 6);
  doc.text('Address:', currentX, currentY + 11);
  doc.text(data.company.address || 'N/A', currentX + 25, currentY + 11);
  doc.text('Postal code:', currentX, currentY + 16);
  doc.text(data.company.postalCode || 'N/A', currentX + 25, currentY + 16);
  doc.text('CVR no.:', currentX, currentY + 21);
  doc.text(data.company.cvr || data.company.cvrNumber || 'N/A', currentX + 25, currentY + 21);
  doc.text('Email:', currentX, currentY + 26);
  doc.text(data.company.email || 'N/A', currentX + 25, currentY + 26);
  doc.text('Contact person:', currentX, currentY + 31);
  doc.text(data.company.contactPerson || 'N/A', currentX + 25, currentY + 31);

  // Construction Section for Execution
  const sectionY2 = boxStartY + box2Height + 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSTRUCTION SECTION FOR EXECUTION:', margin, sectionY2);

  // B2. box with yellow highlight
  const b2BoxY = sectionY2 + 8;
  doc.setFillColor(255, 255, 200); // Light yellow
  doc.rect(margin, b2BoxY, 120, 10, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, b2BoxY, 120, 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const b2Text = `B2. ${data.gamma.x || ''} ${data.project.specialText || ''}`;
  doc.text(b2Text, margin + 2, b2BoxY + 7);

  // Version and Construction CL box
  const versionBoxX = margin + 125;
  doc.setFillColor(255, 255, 200);
  doc.rect(versionBoxX, b2BoxY, 50, 5, 'F');
  doc.rect(versionBoxX, b2BoxY, 50, 5);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('VERSION', versionBoxX + 2, b2BoxY + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`v${data.gamma.currentVersion || 1}`, versionBoxX + 35, b2BoxY + 3.5);

  doc.setFillColor(255, 255, 200);
  doc.rect(versionBoxX, b2BoxY + 5, 50, 5, 'F');
  doc.rect(versionBoxX, b2BoxY + 5, 50, 5);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSTRUCTION CL.', versionBoxX + 2, b2BoxY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.gamma.cc || 'KK3', versionBoxX + 35, b2BoxY + 8.5);

  // Signature sections
  const sigY = b2BoxY + 25;
  const sigHeight = 20;
  const roles = [
    { label: 'Prepared by:', value: 'Select an element.' },
    { label: 'Self-control (EK)', value: '' },
    { label: 'Independent controller (EK)', value: '' },
  ];

  // Map signature data to roles based on signatureType
  // signatureType: 1 = Prepared by, 2 = Self-control, 3 = Independent controller
  const signatures = data.signatures || [];
  signatures.forEach((sig) => {
    const sigType = sig.signatureType || 1;
    const roleIndex = sigType - 1; // Convert to 0-based index
    if (roleIndex >= 0 && roleIndex < roles.length) {
      roles[roleIndex] = {
        ...roles[roleIndex],
        signature: sig,
        name: sig.name || '',
        description: sig.description || '',
        signatureDate: sig.signatureDate || '',
        signatureImage: sig.signature || '',
      };
    }
  });

  roles.forEach((role, index) => {
    const startY = sigY + index * sigHeight;

    // Dashed border for each section
    doc.setDrawColor(100, 100, 100);
    doc.setLineDash([3, 3]);
    doc.rect(margin, startY, contentWidth, sigHeight - 2);
    doc.setLineDash([]);

    // Signed column
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Signed', margin + 5, startY + 5);
    doc.setFont('helvetica', 'normal');

    // Display signature date if available
    if (role.signatureDate) {
      try {
        const date = new Date(role.signatureDate);
        const formattedDate = date.toLocaleDateString('en-GB');
        doc.text(formattedDate, margin + 5, startY + 10);
      } catch (e) {
        doc.text('[Select date]', margin + 5, startY + 10);
      }
    } else {
      doc.text('[Select date]', margin + 5, startY + 10);
    }

    // Role column
    doc.setFont('helvetica', 'bold');
    doc.text(role.label, margin + 45, startY + 5);
    doc.setFont('helvetica', 'normal');

    // Display name and description from signature data
    if (role.name) {
      doc.text(role.name, margin + 45, startY + 10);
      if (role.description) {
        doc.setFontSize(7);
        doc.text(role.description, margin + 45, startY + 15);
        doc.setFontSize(8);
      }
    } else if (role.value) {
      doc.text(role.value, margin + 45, startY + 10);
    }

    // Signature image column (if available)
    if (role.signatureImage && role.signatureImage.startsWith('data:image')) {
      try {
        // Extract base64 data and format
        const base64Match = role.signatureImage.match(/^data:image\/(\w+);base64,(.+)$/);
        if (base64Match) {
          const imageFormat = base64Match[1].toUpperCase();
          const base64Data = base64Match[2];

          // Add signature image to the right side
          const sigImageWidth = 30;
          const sigImageHeight = 12;
          const sigImageX = safeRight - sigImageWidth - 5;
          const sigImageY = startY + 2;

          doc.addImage(base64Data, imageFormat, sigImageX, sigImageY, sigImageWidth, sigImageHeight);
        }
      } catch (e) {
        console.error('Error adding signature image:', e);
      }
    }

    // Company column
    doc.setFont('helvetica', 'bold');
    doc.text('Company', margin + 110, startY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text('CONTRACTOR', margin + 110, startY + 10);
  });

  // Footer Page 2
  doc.setFontSize(8);
  doc.setTextColor(...footerText);
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10);
  safeRightText('Page 2', pageHeight - 10);

  renderStatusPage(doc, data, context);
  renderTableOfContents(doc, data, context);
}

function renderStatusPage(doc, data, context) {
  const {
    margin,
    pageWidth,
    pageHeight,
    safeRight,
    contentWidth,
    colors: { primary, footerText },
  } = context;

  const safeRightText = (text, y, options = {}) =>
    doc.text(text, safeRight, y, { align: 'right', ...options });

  // Page 3: Status of document completion
  // ---------------------------------------
  doc.addPage();
  doc.setTextColor(0, 0, 0);

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Status of document completion', margin + contentWidth / 2, 20, { align: 'center' });

  // Left side - Workflow diagram
  const leftColX = margin;
  const leftColWidth = 80;
  let workflowY = 35;

  const phases = [
    { name: 'UDARBEJDELSESFASE', status: 'Under udarbejdelse' },
    { name: 'GODKENDELSESFASE', status: 'Under kontrol' },
    { name: 'UDGIVELSESFASE', status: 'Godkendt' },
    { name: 'AKTIVFASE', status: 'Udgivet' },
    { name: 'REVISIONSPASE', status: 'Under revision' },
    { name: 'ARKIVERINGSFASE', status: 'Enkelt / arkiveret' },
  ];

  doc.setFontSize(9);
  phases.forEach((phase, index) => {
    doc.setFont('helvetica', 'bold');
    doc.text(phase.name, leftColX, workflowY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Status: ${phase.status}`, leftColX, workflowY + 4);

    // Arrow to next phase
    if (index < phases.length - 1) {
      doc.line(leftColX + 5, workflowY + 6, leftColX + 5, workflowY + 12);
      doc.line(leftColX + 5, workflowY + 12, leftColX + 3, workflowY + 10);
      doc.line(leftColX + 5, workflowY + 12, leftColX + 7, workflowY + 10);
    }

    workflowY += 15;
    doc.setFontSize(9);
  });

  // Right side - Explanatory text
  const rightColX = leftColX + leftColWidth + 10;
  const rightColWidth = pageWidth - margin - rightColX - context.safeRightOffset;
  let textY = 35;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const explanatoryText = [
    'The figure to the right indicates which phase you are in regarding your document submissions, and should also assist both the contractor and the advisor in proactively communicating back and forth regarding any potential corrections.',
    '',
    'The document is signed when it is approved by the project engineer of the structure; until then, the document is a dynamic document.',
    '',
    'Expected approval time is 14 days; thereafter, the content of the document is considered approved.',
  ];

  explanatoryText.forEach((text) => {
    if (text === '') {
      textY += 5;
    } else {
      const lines = doc.splitTextToSize(text, rightColWidth);
      doc.text(lines, rightColX, textY);
      textY += lines.length * 5;
    }
  });

  // Table section
  const tableY = workflowY + 10;
  const tableWidth = contentWidth;
  const rowHeight = 12;
  const col1WidthTable = 60;
  const col2WidthTable = 40;
  const col3WidthTable = tableWidth - col1WidthTable - col2WidthTable;

  // Table header with dashed border
  doc.setDrawColor(100, 100, 100);
  doc.setLineDash([3, 3]);
  doc.rect(margin, tableY, tableWidth, rowHeight);
  doc.setLineDash([]);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Status indication:', margin + 5, tableY + 8);
  doc.text('Version', margin + col1WidthTable + 5, tableY + 8);
  doc.text('Approval', margin + col1WidthTable + col2WidthTable + 5, tableY + 8);

  // Vertical lines in header
  doc.line(margin + col1WidthTable, tableY, margin + col1WidthTable, tableY + rowHeight);
  doc.line(margin + col1WidthTable + col2WidthTable, tableY, margin + col1WidthTable + col2WidthTable, tableY + rowHeight);

  // Table row (single row)
  const projectCreatedDate = data.project.createdAt || new Date().toLocaleDateString('en-GB');
  const currentVersion = `v${data.gamma.currentVersion || 1}`;

  const rowY = tableY + rowHeight;

  // Row border
  doc.setLineDash([3, 3]);
  doc.rect(margin, rowY, tableWidth, rowHeight);
  doc.setLineDash([]);

  // Vertical lines
  doc.line(margin + col1WidthTable, rowY, margin + col1WidthTable, rowY + rowHeight);
  doc.line(margin + col1WidthTable + col2WidthTable, rowY, margin + col1WidthTable + col2WidthTable, rowY + rowHeight);

  // Content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  // Status indication (project created date)
  doc.text(projectCreatedDate, margin + 5, rowY + 8);

  // Version
  doc.text(currentVersion, margin + col1WidthTable + 5, rowY + 8);

  // Footer Page 3
  doc.setFontSize(8);
  doc.setTextColor(...footerText);
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10);
  safeRightText('Page 3', pageHeight - 10);
}

function renderTableOfContents(doc, data, context) {
  const {
    margin,
    pageWidth,
    pageHeight,
    safeRight,
    contentWidth,
    colors: { primary, footerText },
  } = context;

  const safeRightText = (text, y, options = {}) =>
    doc.text(text, safeRight, y, { align: 'right', ...options });

  // Page 4: Table of Contents
  // --------------------------
  try {
    doc.addPage();
    doc.setTextColor(0, 0, 0);
    console.log('📄 Creating Page 4 - Table of Contents');
    console.log('   Current page count:', doc.internal.getNumberOfPages());

    let tocY = 20;

    // Helper function to add TOC entry
    const addTocEntry = (text, pageNum, indent = 0) => {
      try {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const xPos = margin + indent;
        doc.text(text, xPos, tocY);

        // Dotted line
        const textWidth = doc.getTextWidth(text);
        const dotsStart = xPos + textWidth + 2;
        const dotsEnd = safeRight - 15;
        doc.setFontSize(8);
        doc.text('.'.repeat(Math.max(0, Math.floor((dotsEnd - dotsStart) / 2))), dotsStart, tocY);

        // Page number
        doc.setFontSize(10);
        safeRightText(String(pageNum), tocY);
        tocY += 6;
      } catch (err) {
        console.error('❌ Error in addTocEntry:', err);
      }
    };

    // Top section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Static documentation', margin, tocY);
    safeRightText('1', tocY);
    tocY += 6;

    // Eurocode section with actual codes listed below
    doc.setFillColor(255, 255, 200); // Yellow highlight
    doc.rect(margin, tocY - 4, contentWidth, 5, 'F');
    doc.text('Eurocode:', margin, tocY);
    safeRightText('1', tocY);
    tocY += 6;

    // List actual EuroCodes below the Eurocode heading
    const selectedEuroCodes = data.euroCodes || [];
    if (selectedEuroCodes.length > 0) {
      doc.setFontSize(9);
      selectedEuroCodes.forEach((code) => {
        const euroCodeName = euroCodeNames[String(code)] || `Eurocode ${code}`;
        doc.text(`  • ${euroCodeName}`, margin + 5, tocY);
        tocY += 5;
      });
      tocY += 2; // Extra space after eurocode list
    }

    // Continue with rest of TOC
    doc.setFontSize(10);
    addTocEntry('Construction case:', 1, 0);
    addTocEntry('Construction section for execution:', 1, 0);

    tocY += 3; // Section spacing

    // Main sections
    doc.setFont('helvetica', 'bold');
    addTocEntry('1. General', 4, 0);
    doc.setFont('helvetica', 'normal');
    addTocEntry('1.1 Description of the Control Work', 4, 5);
    addTocEntry('1.2 Types of control', 4, 5);
    addTocEntry('1.3 Controllevel', 5, 5);
    addTocEntry('1.4 Organization of control work', 5, 5);
    addTocEntry('1.5 Controllers', 6, 5);
    addTocEntry('1.6 Use of assistance', 6, 5);
    addTocEntry('1.7 Follow-up on deviations', 6, 5);

    tocY += 2;
    doc.setFont('helvetica', 'bold');
    addTocEntry('2. General controls', 7, 0);
    doc.setFont('helvetica', 'normal');
    addTocEntry('2.1 General', 7, 5);
    addTocEntry('2.3 Controlsection', 7, 5);
    addTocEntry('2.4 Explanation of the selection of controls', 8, 5);
    addTocEntry('2.5 Controlpoints', 8, 5);

    tocY += 2;
    doc.setFont('helvetica', 'bold');
    addTocEntry('3. Special controls', 8, 0);
    doc.setFont('helvetica', 'normal');
    addTocEntry('3.1 General', 8, 5);
    addTocEntry('3.2 Special control points', 8, 5);

    tocY += 2;
    doc.setFont('helvetica', 'bold');
    addTocEntry('4. Documentation', 8, 0);
    doc.setFont('helvetica', 'normal');
    addTocEntry('4.1 General description of documentation', 8, 5);
    addTocEntry('4.2 Documentation of general controls', 9, 5);
    addTocEntry('4.3 Documentation of special controls', 9, 5);
    addTocEntry('4.4 Documentation for deviations and follow-up', 9, 5);
    addTocEntry('4.5 Control of Control Documentation', 9, 5);

    tocY += 2;
    doc.setFont('helvetica', 'normal');
    addTocEntry('5.1 registers', 9, 0);
    addTocEntry('5.2 Scope of control', 9, 0);

    tocY += 2;
    doc.setFont('helvetica', 'bold');
    addTocEntry('6. Selected control locations', 10, 0);

    tocY += 2;
    addTocEntry('7. Static control (table)', 11, 0);
    doc.setFont('helvetica', 'normal');
    addTocEntry('7.0 Static Control Plan table for', 11, 5);
    addTocEntry('7.3 Control of Documentation of Materials and Products', 14, 5);
    addTocEntry('7.4 RECEIVING CONTROL DELIVERIES', 16, 5);
    addTocEntry('7.5 CONTROL OF EXECUTION', 17, 5);
    addTocEntry('7.6 FINAL CONTROL', 18, 5);

    // Footer Page 4
    doc.setFontSize(8);
    doc.setTextColor(...footerText);
    doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10);
    safeRightText('Page 4 of 21', pageHeight - 10);

    console.log('✅ Page 4 completed');
    console.log('   Final page count:', doc.internal.getNumberOfPages());
  } catch (error) {
    console.error('❌ Error creating Page 4:', error);
  }
}

module.exports = {
  renderTitleAndIntro,
};

