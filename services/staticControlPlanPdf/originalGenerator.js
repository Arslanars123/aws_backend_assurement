// EuroCode mapping
const euroCodeNames = {
  0: 'Eurocode 0: Basis of design for structures',
  1: 'Eurocode 1: Actions on structures',
  2: 'Eurocode 2: Concrete structures',
  3: 'Eurocode 3: Steel structures',
  4: 'Eurocode 4: Composite structures',
  5: 'Eurocode 5: Timber structures',
  6: 'Eurocode 6: Masonry structures',
  7: 'Eurocode 7: Geotechnical design',
  8: 'Eurocode 8: Design of structures for earthquake resistance',
  9: 'Eurocode 9: Aluminium structures',
  1520: 'EN 1520: Lightweight concrete with porous aggregates',
  12602: 'EN 12602: Cellular concrete',
}

const renderStaticControlPlan = (doc, data) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  // Colors
  const primaryColor = [0, 102, 153] // Dark blue
  const lightGray = [240, 240, 240]

  // Page 1: Title Page
  // -----------------

  // Header - Logo and Company Name
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Assurement', margin, 20)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Report system', margin, 26)

  // Main Title Box with Dashed Border
  const boxY = 40
  const boxHeight = 60
  doc.setDrawColor(100, 100, 100)
  doc.setLineDash([3, 3])
  doc.rect(margin, boxY, pageWidth - 2 * margin, boxHeight)
  doc.setLineDash([]) // Reset to solid line

  // Company Name inside box
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(data.company.name || '[Company Name]', margin + 5, boxY + 8)

  // Main Title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Statisk Kontrolplan', pageWidth / 2, boxY + 25, { align: 'center' })

  // Subtitle
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('For udførende indenfor konstruktionsafsnit', pageWidth / 2, boxY + 33, { align: 'center' })

  // Horizontal line
  doc.setDrawColor(0, 0, 0)
  doc.line(margin + 5, boxY + 38, pageWidth - margin - 5, boxY + 38)

  // B3. (X-number) and Special Text
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  const xValue = data.gamma.x || ''
  const specialText = data.project.specialText || '' // Get special text from PROJECT

  // B3. X-number
  doc.text(`B3. ${xValue}`, margin + 5, boxY + 48)

  // Special text on new line
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  if (specialText) {
    doc.text(`"${specialText}"`, margin + 5, boxY + 55)
  } else {
    doc.text('"Special text"', margin + 5, boxY + 55)
  }

  // STATIC DOCUMENTATION Section
  const sectionY = boxY + boxHeight + 20

  // Blue bar with heading
  doc.setFillColor(...primaryColor)
  doc.rect(margin, sectionY, pageWidth - 2 * margin, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('STATIC DOCUMENTATION', margin + 5, sectionY + 7)

  // Reset text color
  doc.setTextColor(0, 0, 0)

  // Introductory text
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('For load-bearing structures according to DS1140 applicable for:', margin, sectionY + 20)

  // Eurocode label
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Eurocode:', margin, sectionY + 30)

  // Display special text below Eurocode label
  doc.setFontSize(10)
  doc.setFont('helvetica', 'italic')
  const displayText = specialText || 'Special text'
  doc.text(displayText, margin, sectionY + 37)

  // Applicable EU standards heading (right aligned)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Applicable EU standards 2024', pageWidth - margin, sectionY + 20, { align: 'right' })

  // EuroCode List (Bullet points)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  let listY = sectionY + 50
  const lineHeight = 5

  // Get selected EuroCodes
  const selectedEuroCodes = data.euroCodes || []

  // Create list of EuroCodes to display
  const euroCodeList = []

  if (selectedEuroCodes.length > 0) {
    // Show only selected EuroCodes
    selectedEuroCodes.forEach((code) => {
      const euroCodeName = euroCodeNames[String(code)] || `Eurocode ${code}`
      euroCodeList.push(euroCodeName)
    })
  } else {
    // Show all EuroCodes if none selected
    Object.values(euroCodeNames).forEach((name) => {
      euroCodeList.push(name)
    })
  }

  // Display EuroCode list
  euroCodeList.forEach((euroCodeName, index) => {
    // Check if we need a new page
    if (listY > pageHeight - 30) {
      doc.addPage()
      listY = 20
    }

    doc.text('•', pageWidth - margin - 5, listY, { align: 'right' })
    doc.text(euroCodeName, pageWidth - margin, listY, { align: 'right' })
    listY += lineHeight
  })

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10)
  doc.text(`Page 1`, pageWidth - margin, pageHeight - 10, { align: 'right' })

  // Page 2: Construction Case
  // -------------------------
  doc.addPage()
  doc.setTextColor(0, 0, 0)

  // Header - CONSTRUCTION CASE
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, pageWidth, 15, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('CONSTRUCTION CASE:', margin, 10)
  doc.setTextColor(0, 0, 0)

  // Main section with dashed border
  const boxStartY = 25
  const box2Height = 50 // Renamed to avoid conflict with Page 1 boxHeight
  doc.setDrawColor(100, 100, 100)
  doc.setLineDash([3, 3])
  doc.rect(margin, boxStartY, pageWidth - 2 * margin, box2Height)
  doc.setLineDash([])

  // Three columns inside the box
  const col1Width = 50
  const col2Width = 70
  const col3Width = pageWidth - 2 * margin - col1Width - col2Width

  // Column 1: Created
  let currentX = margin + 5
  let currentY = boxStartY + 8
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Created', currentX, currentY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const createdDate = data.project.createdAt || data.gamma.createdAt || new Date().toLocaleDateString('en-GB')
  doc.text(createdDate, currentX, currentY + 5)

  // Column 2: Project name/ID
  currentX += col1Width
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Project name/ID', currentX, currentY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Name:', currentX, currentY + 6)
  doc.text(data.project.name || 'N/A', currentX + 15, currentY + 6)
  doc.text('Case no.:', currentX, currentY + 11)
  doc.text(data.project.caseNumber || data.project.projectNumber || 'N/A', currentX + 15, currentY + 11)
  doc.text('Address:', currentX, currentY + 16)
  const address = data.project.address || 'N/A'
  const addressLines = doc.splitTextToSize(address, 55)
  doc.text(addressLines, currentX + 15, currentY + 16)

  // Column 3: Prepared by: company
  currentX += col2Width
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Prepared by: company', currentX, currentY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Company name:', currentX, currentY + 6)
  doc.text(data.company.name || 'N/A', currentX + 25, currentY + 6)
  doc.text('Address:', currentX, currentY + 11)
  doc.text(data.company.address || 'N/A', currentX + 25, currentY + 11)
  doc.text('Postal code:', currentX, currentY + 16)
  doc.text(data.company.postalCode || 'N/A', currentX + 25, currentY + 16)
  doc.text('CVR no.:', currentX, currentY + 21)
  doc.text(data.company.cvr || data.company.cvrNumber || 'N/A', currentX + 25, currentY + 21)
  doc.text('Email:', currentX, currentY + 26)
  doc.text(data.company.email || 'N/A', currentX + 25, currentY + 26)
  doc.text('Contact person:', currentX, currentY + 31)
  doc.text(data.company.contactPerson || 'N/A', currentX + 25, currentY + 31)

  // Construction Section for Execution
  const sectionY2 = boxStartY + box2Height + 15
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('CONSTRUCTION SECTION FOR EXECUTION:', margin, sectionY2)

  // B2. box with yellow highlight
  const b2BoxY = sectionY2 + 8
  doc.setFillColor(255, 255, 200) // Light yellow
  doc.rect(margin, b2BoxY, 120, 10, 'F')
  doc.setDrawColor(0, 0, 0)
  doc.rect(margin, b2BoxY, 120, 10)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const b2Text = `B2. ${data.gamma.x || ''} ${data.project.specialText || ''}`
  doc.text(b2Text, margin + 2, b2BoxY + 7)

  // Version and Construction CL box
  const versionBoxX = margin + 125
  doc.setFillColor(255, 255, 200)
  doc.rect(versionBoxX, b2BoxY, 50, 5, 'F')
  doc.rect(versionBoxX, b2BoxY, 50, 5)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('VERSION', versionBoxX + 2, b2BoxY + 3.5)
  doc.setFont('helvetica', 'normal')
  doc.text(`v${data.gamma.currentVersion || 1}`, versionBoxX + 35, b2BoxY + 3.5)

  doc.setFillColor(255, 255, 200)
  doc.rect(versionBoxX, b2BoxY + 5, 50, 5, 'F')
  doc.rect(versionBoxX, b2BoxY + 5, 50, 5)
  doc.setFont('helvetica', 'bold')
  doc.text('CONSTRUCTION CL.', versionBoxX + 2, b2BoxY + 8.5)
  doc.setFont('helvetica', 'normal')
  doc.text(data.gamma.cc || 'KK3', versionBoxX + 35, b2BoxY + 8.5)

  // Signature sections
  const sigY = b2BoxY + 25
  const sigHeight = 20
  const roles = [
    { label: 'Prepared by:', value: 'Select an element.' },
    { label: 'Self-control (EK)', value: '' },
    { label: 'Independent controller (EK)', value: '' },
  ]

  // Map signature data to roles based on signatureType
  // signatureType: 1 = Prepared by, 2 = Self-control, 3 = Independent controller
  const signatures = data.signatures || []
  signatures.forEach((sig) => {
    const sigType = sig.signatureType || 1
    const roleIndex = sigType - 1 // Convert to 0-based index
    if (roleIndex >= 0 && roleIndex < roles.length) {
      roles[roleIndex] = {
        ...roles[roleIndex],
        signature: sig,
        name: sig.name || '',
        description: sig.description || '',
        signatureDate: sig.signatureDate || '',
        signatureImage: sig.signature || '',
      }
    }
  })

  roles.forEach((role, index) => {
    const startY = sigY + index * sigHeight

    // Dashed border for each section
    doc.setDrawColor(100, 100, 100)
    doc.setLineDash([3, 3])
    doc.rect(margin, startY, pageWidth - 2 * margin, sigHeight - 2)
    doc.setLineDash([])

    // Signed column
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Signed', margin + 5, startY + 5)
    doc.setFont('helvetica', 'normal')

    // Display signature date if available
    if (role.signatureDate) {
      try {
        const date = new Date(role.signatureDate)
        const formattedDate = date.toLocaleDateString('en-GB')
        doc.text(formattedDate, margin + 5, startY + 10)
      } catch (e) {
        doc.text('[Select date]', margin + 5, startY + 10)
      }
    } else {
      doc.text('[Select date]', margin + 5, startY + 10)
    }

    // Role column
    doc.setFont('helvetica', 'bold')
    doc.text(role.label, margin + 45, startY + 5)
    doc.setFont('helvetica', 'normal')

    // Display name and description from signature data
    if (role.name) {
      doc.text(role.name, margin + 45, startY + 10)
      if (role.description) {
        doc.setFontSize(7)
        doc.text(role.description, margin + 45, startY + 15)
        doc.setFontSize(8)
      }
    } else if (role.value) {
      doc.text(role.value, margin + 45, startY + 10)
    }

    // Signature image column (if available)
    if (role.signatureImage && role.signatureImage.startsWith('data:image')) {
      try {
        // Extract base64 data and format
        const base64Match = role.signatureImage.match(/^data:image\/(\w+);base64,(.+)$/)
        if (base64Match) {
          const imageFormat = base64Match[1].toUpperCase()
          const base64Data = base64Match[2]

          // Add signature image to the right side
          const sigImageWidth = 30
          const sigImageHeight = 12
          const sigImageX = pageWidth - margin - sigImageWidth - 5
          const sigImageY = startY + 2

          doc.addImage(base64Data, imageFormat, sigImageX, sigImageY, sigImageWidth, sigImageHeight)
        }
      } catch (e) {
        console.error('Error adding signature image:', e)
      }
    }

    // Company column
    doc.setFont('helvetica', 'bold')
    doc.text('Company', margin + 110, startY + 5)
    doc.setFont('helvetica', 'normal')
    doc.text('CONTRACTOR', margin + 110, startY + 10)
  })

  // Footer Page 2
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10)
  doc.text(`Page 2`, pageWidth - margin, pageHeight - 10, { align: 'right' })

  // Page 3: Status of document completion
  // ---------------------------------------
  doc.addPage()
  doc.setTextColor(0, 0, 0)

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Status of document completion', pageWidth / 2, 20, { align: 'center' })

  // Left side - Workflow diagram
  const leftColX = margin
  const leftColWidth = 80
  let workflowY = 35

  const phases = [
    { name: 'UDARBEJDELSESFASE', status: 'Under udarbejdelse' },
    { name: 'GODKENDELSESFASE', status: 'Under kontrol' },
    { name: 'UDGIVELSESFASE', status: 'Godkendt' },
    { name: 'AKTIVFASE', status: 'Udgivet' },
    { name: 'REVISIONSPASE', status: 'Under revision' },
    { name: 'ARKIVERINGSFASE', status: 'Enkelt / arkiveret' },
  ]

  doc.setFontSize(9)
  phases.forEach((phase, index) => {
    doc.setFont('helvetica', 'bold')
    doc.text(phase.name, leftColX, workflowY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Status: ${phase.status}`, leftColX, workflowY + 4)

    // Arrow to next phase
    if (index < phases.length - 1) {
      doc.line(leftColX + 5, workflowY + 6, leftColX + 5, workflowY + 12)
      doc.line(leftColX + 5, workflowY + 12, leftColX + 3, workflowY + 10)
      doc.line(leftColX + 5, workflowY + 12, leftColX + 7, workflowY + 10)
    }

    workflowY += 15
    doc.setFontSize(9)
  })

  // Right side - Explanatory text
  const rightColX = leftColX + leftColWidth + 10
  const rightColWidth = pageWidth - margin - rightColX
  let textY = 35

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  const explanatoryText = [
    'The figure to the right indicates which phase you are in regarding your document submissions, and should also assist both the contractor and the advisor in proactively communicating back and forth regarding any potential corrections.',
    '',
    'The document is signed when it is approved by the project engineer of the structure; until then, the document is a dynamic document.',
    '',
    'Expected approval time is 14 days; thereafter, the content of the document is considered approved.',
  ]

  explanatoryText.forEach((text) => {
    if (text === '') {
      textY += 5
    } else {
      const lines = doc.splitTextToSize(text, rightColWidth)
      doc.text(lines, rightColX, textY)
      textY += lines.length * 5
    }
  })

  // Table section
  const tableY = workflowY + 10
  const tableWidth = pageWidth - 2 * margin
  const rowHeight = 12
  const col1WidthTable = 60
  const col2WidthTable = 40
  const col3WidthTable = tableWidth - col1WidthTable - col2WidthTable

  // Table header with dashed border
  doc.setDrawColor(100, 100, 100)
  doc.setLineDash([3, 3])
  doc.rect(margin, tableY, tableWidth, rowHeight)
  doc.setLineDash([])

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Status indication:', margin + 5, tableY + 8)
  doc.text('Version', margin + col1WidthTable + 5, tableY + 8)
  doc.text('Approval', margin + col1WidthTable + col2WidthTable + 5, tableY + 8)

  // Vertical lines in header
  doc.line(margin + col1WidthTable, tableY, margin + col1WidthTable, tableY + rowHeight)
  doc.line(margin + col1WidthTable + col2WidthTable, tableY, margin + col1WidthTable + col2WidthTable, tableY + rowHeight)

  // Table row (single row)
  const projectCreatedDate = data.project.createdAt || new Date().toLocaleDateString('en-GB')
  const currentVersion = `v${data.gamma.currentVersion || 1}`

  const rowY = tableY + rowHeight

  // Row border
  doc.setLineDash([3, 3])
  doc.rect(margin, rowY, tableWidth, rowHeight)
  doc.setLineDash([])

  // Vertical lines
  doc.line(margin + col1WidthTable, rowY, margin + col1WidthTable, rowY + rowHeight)
  doc.line(margin + col1WidthTable + col2WidthTable, rowY, margin + col1WidthTable + col2WidthTable, rowY + rowHeight)

  // Content
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  // Status indication (project created date)
  doc.text(projectCreatedDate, margin + 5, rowY + 8)

  // Version
  doc.text(currentVersion, margin + col1WidthTable + 5, rowY + 8)

  // Approval column - leave empty as requested

  // Footer Page 3
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10)
  doc.text(`Page 3`, pageWidth - margin, pageHeight - 10, { align: 'right' })

  // Page 4: Table of Contents
  // --------------------------
  try {
    doc.addPage()
    doc.setTextColor(0, 0, 0)
    console.log('📄 Creating Page 4 - Table of Contents')
    console.log('   Current page count:', doc.internal.getNumberOfPages())

    let tocY = 20

    // Helper function to add TOC entry
    const addTocEntry = (text, pageNum, indent = 0) => {
      try {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const xPos = margin + indent
        doc.text(text, xPos, tocY)

        // Dotted line
        const textWidth = doc.getTextWidth(text)
        const dotsStart = xPos + textWidth + 2
        const dotsEnd = pageWidth - margin - 15
        doc.setFontSize(8)
        doc.text('.'.repeat(Math.floor((dotsEnd - dotsStart) / 2)), dotsStart, tocY)

        // Page number
        doc.setFontSize(10)
        doc.text(String(pageNum), pageWidth - margin - 10, tocY, { align: 'right' })
        tocY += 6
      } catch (err) {
        console.error('❌ Error in addTocEntry:', err)
      }
    }

    // Top section
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Static documentation', margin, tocY)
    doc.text('1', pageWidth - margin - 10, tocY, { align: 'right' })
    tocY += 6

    // Eurocode section with actual codes listed below
    doc.setFillColor(255, 255, 200) // Yellow highlight
    doc.rect(margin, tocY - 4, pageWidth - 2 * margin, 5, 'F')
    doc.text('Eurocode:', margin, tocY)
    doc.text('1', pageWidth - margin - 10, tocY, { align: 'right' })
    tocY += 6

    // List actual EuroCodes below the Eurocode heading
    const selectedEuroCodes = data.euroCodes || []
    if (selectedEuroCodes.length > 0) {
      doc.setFontSize(9)
      selectedEuroCodes.forEach((code) => {
        const euroCodeName = euroCodeNames[String(code)] || `Eurocode ${code}`
        doc.text(`  • ${euroCodeName}`, margin + 5, tocY)
        tocY += 5
      })
      tocY += 2 // Extra space after eurocode list
    }

    // Continue with rest of TOC
    doc.setFontSize(10)
    addTocEntry('Construction case:', 1, 0)
    addTocEntry('Construction section for execution:', 1, 0)

    tocY += 3 // Section spacing

    // Main sections
    doc.setFont('helvetica', 'bold')
    addTocEntry('1. General', 4, 0)
    doc.setFont('helvetica', 'normal')
    addTocEntry('1.1 Description of the Control Work', 4, 5)
    addTocEntry('1.2 Types of control', 4, 5)
    addTocEntry('1.3 Controllevel', 5, 5)
    addTocEntry('1.4 Organization of control work', 5, 5)
    addTocEntry('1.5 Controllers', 6, 5)
    addTocEntry('1.6 Use of assistance', 6, 5)
    addTocEntry('1.7 Follow-up on deviations', 6, 5)

    tocY += 2
    doc.setFont('helvetica', 'bold')
    addTocEntry('2. General controls', 7, 0)
    doc.setFont('helvetica', 'normal')
    addTocEntry('2.1 General', 7, 5)
    addTocEntry('2.3 Controlsection', 7, 5)
    addTocEntry('2.4 Explanation of the selection of controls', 8, 5)
    addTocEntry('2.5 Controlpoints', 8, 5)

    tocY += 2
    doc.setFont('helvetica', 'bold')
    addTocEntry('3. Special controls', 8, 0)
    doc.setFont('helvetica', 'normal')
    addTocEntry('3.1 General', 8, 5)
    addTocEntry('3.2 Special control points', 8, 5)

    tocY += 2
    doc.setFont('helvetica', 'bold')
    addTocEntry('4. Documentation', 8, 0)
    doc.setFont('helvetica', 'normal')
    addTocEntry('4.1 General description of documentation', 8, 5)
    addTocEntry('4.2 Documentation of general controls', 9, 5)
    addTocEntry('4.3 Documentation of special controls', 9, 5)
    addTocEntry('4.4 Documentation for deviations and follow-up', 9, 5)
    addTocEntry('4.5 Control of Control Documentation', 9, 5)

    tocY += 2
    doc.setFont('helvetica', 'normal')
    addTocEntry('5.1 registers', 9, 0)
    addTocEntry('5.2 Scope of control', 9, 0)

    tocY += 2
    doc.setFont('helvetica', 'bold')
    addTocEntry('6. Selected control locations', 10, 0)

    tocY += 2
    addTocEntry('7. Static control (table)', 11, 0)
    doc.setFont('helvetica', 'normal')
    addTocEntry('7.0 Static Control Plan table for', 11, 5)
    addTocEntry('7.3 Control of Documentation of Materials and Products', 14, 5)
    addTocEntry('7.4 RECEIVING CONTROL DELIVERIES', 16, 5)
    addTocEntry('7.5 CONTROL OF EXECUTION', 17, 5)
    addTocEntry('7.6 FINAL CONTROL', 18, 5)

    // Footer Page 4
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10)
    doc.text(`Page 4 of 21`, pageWidth - margin, pageHeight - 10, { align: 'right' })

    console.log('✅ Page 4 completed')
    console.log('   Final page count:', doc.internal.getNumberOfPages())
  } catch (error) {
    console.error('❌ Error creating Page 4:', error)
  }

  // Page 5: 1. GENERAL - 1.1 Description of the Control Work
  // ---------------------------------------------------------
  doc.addPage()
  doc.setTextColor(0, 0, 0)
  console.log('📄 Creating Page 5 - 1. GENERAL')

  // Title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('1. GENERAL', margin, 25)

  doc.setFontSize(12)
  doc.text('1.1 Description of the Control Work', margin, 35)

  let contentY = 45

  // Paragraph 1
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const para1 =
    "The static control plan covers the execution of construction and related works, carried out in accordance with the building project's designer. The control focuses on examining materials and execution, with particular attention to material dimensions, placement, and compliance with tolerances."
  const para1Lines = doc.splitTextToSize(para1, pageWidth - 2 * margin)
  doc.text(para1Lines, margin, contentY)
  contentY += para1Lines.length * 5 + 5

  // Bullet List 1: Basis for control
  doc.setFont('helvetica', 'bold')
  doc.text('Basis for the control performed:', margin, contentY)
  contentY += 6

  doc.setFont('helvetica', 'normal')
  const basisList = [
    'Building Regulations 2018',
    "SBi271 'Documentation and Control of Load-Bearing Structures'",
    'DS/EN 1990 DK NA:2021, Annex B5',
    "DS 1140:2019 'Execution of Load-Bearing Structures - General Control'",
    "DS/INF 1140:2022 'Guidance for DS 1140'",
  ]

  basisList.forEach((item) => {
    doc.text(`• ${item}`, margin + 5, contentY)
    contentY += 5
  })

  contentY += 3

  // Supplementary text
  doc.setFontSize(9)
  doc.text('Supplementary rules and regulations according to the mentioned euro code.', margin, contentY)
  contentY += 5
  doc.text('Rules and reg form eurocode details. Later version.', margin, contentY)
  contentY += 8

  // Quality Assurance paragraph
  doc.setFontSize(10)
  doc.text("Control is also based on the executor's documented quality assurance system, which is periodically reviewed.", margin, contentY)
  contentY += 8

  // Bullet List 2: Quality assurance system
  doc.setFont('helvetica', 'bold')
  doc.text('Quality assurance system includes:', margin, contentY)
  contentY += 6

  doc.setFont('helvetica', 'normal')
  const qaList = [
    'System updates and approval by management',
    'Procedures followed',
    'Review of execution basis from design phase',
    'Materials in accordance with execution basis',
    'Execution basis controlled/approved',
    'Execution basis from the design phase',
    'Employee qualifications',
    'Self-control and independent control described in plans',
    'Controls documented in reports',
    'Deviations handled by procedure',
    'Documentation of construction as executed',
  ]

  qaList.forEach((item) => {
    doc.text(`• ${item}`, margin + 5, contentY)
    contentY += 5
  })

  contentY += 5

  // Independent Control paragraph
  doc.setFontSize(10)
  doc.text(
    "Independent control is carried out by the executing party, with exceptions for special control points where it's performed by the design organization.",
    margin,
    contentY,
  )
  contentY += 15

  // Table
  const table2Y = contentY // Renamed to avoid conflict with Page 3 tableY
  const table2Width = pageWidth - 2 * margin
  const table2RowHeight = 12
  const table2Col1Width = 50
  const table2Col2Width = 80
  const table2Col3Width = table2Width - table2Col1Width - table2Col2Width

  // Table header
  doc.setFillColor(...primaryColor)
  doc.rect(margin, table2Y, table2Width, table2RowHeight, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('ID', margin + 5, table2Y + 8)
  doc.text('DOCUMENT', margin + table2Col1Width + 5, table2Y + 8)
  doc.text('CONSTRUCTION SECTION: EXECUTION', margin + table2Col1Width + table2Col2Width + 5, table2Y + 8)
  doc.setTextColor(0, 0, 0)

  // Vertical lines in header
  doc.setDrawColor(255, 255, 255)
  doc.line(margin + table2Col1Width, table2Y, margin + table2Col1Width, table2Y + table2RowHeight)
  doc.line(margin + table2Col1Width + table2Col2Width, table2Y, margin + table2Col1Width + table2Col2Width, table2Y + table2RowHeight)

  // Table row
  const row2Y = table2Y + table2RowHeight
  doc.setDrawColor(0, 0, 0)
  doc.rect(margin, row2Y, table2Width, table2RowHeight)

  // Vertical lines
  doc.line(margin + table2Col1Width, row2Y, margin + table2Col1Width, row2Y + table2RowHeight)
  doc.line(margin + table2Col1Width + table2Col2Width, row2Y, margin + table2Col1Width + table2Col2Width, row2Y + table2RowHeight)

  // Row content
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const xNumber = data.gamma.x || ''
  const specialText2 = data.project.specialText || 'Special text'

  doc.text(`B.2. ${xNumber}`, margin + 5, row2Y + 8)
  doc.text('Static Control Plan', margin + table2Col1Width + 5, row2Y + 8)
  doc.text(specialText2, margin + table2Col1Width + table2Col2Width + 5, row2Y + 8)

  // Footer Page 5
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10)
  doc.text(`Page 4`, pageWidth - margin, pageHeight - 10, { align: 'right' })

  console.log('✅ Page 5 completed')

  // Page 6: 1.2 Types of control & 1.3 Control level
  // -------------------------------------------------
  doc.addPage()
  doc.setTextColor(0, 0, 0)
  console.log('📄 Creating Page 6 - 1.2 Types of control')

  // Title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('1.2 Types of control', margin, 25)

  let pageContentY = 35

  // Introduction with CCX/KKX values
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const excValue = data.gamma.exc || 'CCX'
  const ccValue = data.gamma.cc || 'KKX'

  // First paragraph with highlighted values
  const intro1 = `The structure is classified into construction class `
  doc.text(intro1, margin, pageContentY)
  const intro1Width = doc.getTextWidth(intro1)

  // Yellow highlight for CCX/KKX
  doc.setFillColor(255, 255, 200)
  const classText = `${excValue} / ${ccValue} no.`
  const classTextWidth = doc.getTextWidth(classText)
  doc.rect(margin + intro1Width, pageContentY - 3, classTextWidth + 2, 5, 'F')
  doc.text(classText, margin + intro1Width, pageContentY)

  pageContentY += 7
  doc.text('Self-control and independent control of the executed works are carried out.', margin, pageContentY)
  pageContentY += 5
  doc.text('There is no requirement for third-party control.', margin, pageContentY)
  pageContentY += 10

  // Self-control section
  doc.setFont('helvetica', 'bold')
  doc.text('Self-control:', margin, pageContentY)
  pageContentY += 6

  doc.setFont('helvetica', 'normal')
  const selfControlParas = [
    'Self-control is carried out by the person who performed the construction upon completion of parts or the whole. Self-control is performed during execution for concealed parts.',
    '',
    'Self-control includes assessment of whether:',
  ]

  selfControlParas.forEach((para) => {
    if (para === '') {
      pageContentY += 3
    } else {
      const lines = doc.splitTextToSize(para, pageWidth - 2 * margin)
      doc.text(lines, margin, pageContentY)
      pageContentY += lines.length * 5 + 2
    }
  })

  // Self-control criteria bullets
  const selfControlCriteria = [
    'The entire construction and its parts have been executed.',
    'The construction has been executed correctly based on craftsmanship and good building practice.',
    'The construction aligns with the execution basis and agreements with the designer/construction management.',
    'Tolerances during execution adhere to relevant standards, good practices, and project-specific tolerances.',
    'Documentation of execution has been carried out, collected, and systematized according to SBi 271 section 2.6.',
  ]

  selfControlCriteria.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, pageWidth - 2 * margin - 5)
    doc.text(lines, margin + 5, pageContentY)
    pageContentY += lines.length * 5
  })

  pageContentY += 3
  doc.text('Self-control is always performed and documented in a control report.', margin, pageContentY)
  pageContentY += 10

  // Independent control section
  doc.setFont('helvetica', 'bold')
  doc.text('Independent control:', margin, pageContentY)
  pageContentY += 6

  doc.setFont('helvetica', 'normal')
  const indControlParas = [
    'Independent control is carried out by individuals who did not directly participate in the execution of the relevant control section. All independent controls within a section are performed by the same person and not by the work team leader.',
    '',
    'Independent control is carried out after self-control has been performed and reported.',
    '',
    'The independent control is performed in accordance with the project-specific static control plan for execution.',
  ]

  indControlParas.forEach((para) => {
    if (para === '') {
      pageContentY += 3
    } else {
      const lines = doc.splitTextToSize(para, pageWidth - 2 * margin)
      doc.text(lines, margin, pageContentY)
      pageContentY += lines.length * 5 + 2
    }
  })

  pageContentY += 5

  // 1.3 Control level
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('1.3 Control level', margin, pageContentY)
  pageContentY += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const controlLevelText = 'The control level for general control is governed by the selected execution classes, cf. DS/EN 1990 DK NA, Annex B5.'
  const controlLevelLines = doc.splitTextToSize(controlLevelText, pageWidth - 2 * margin)
  doc.text(controlLevelLines, margin, pageContentY)

  // Footer Page 6
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10)
  doc.text(`Page 5`, pageWidth - margin, pageHeight - 10, { align: 'right' })

  console.log('✅ Page 6 completed')

  // Page 7: Execution Classes & Organization
  // -----------------------------------------
  doc.addPage()
  doc.setTextColor(0, 0, 0)
  console.log('📄 Creating Page 7 - Execution Classes')

  let page7Y = 25

  // Introduction with EXC value from static control plan
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const excNo = data.gamma.exc || 'EXC'

  const intro = `The execution class is ${excNo} and self-control is performed as a maximum control. The independent control is performed as a sample control and maximum control.`
  const introLines = doc.splitTextToSize(intro, pageWidth - 2 * margin)
  doc.text(introLines, margin, page7Y)
  page7Y += introLines.length * 5 + 8

  // Execution classes definition
  const execClassIntro = 'Execution classes are indicators of the significance of the execution for the safety of a load-bearing structure.'
  const execIntroLines = doc.splitTextToSize(execClassIntro, pageWidth - 2 * margin)
  doc.text(execIntroLines, margin, page7Y)
  page7Y += execIntroLines.length * 5 + 6

  // EXC definitions
  const excDefinitions = [
    { class: 'EXC1', desc: 'The execution has limited significance for the safety of a load-bearing structure.' },
    { class: 'EXC2', desc: 'The execution has significance for the safety of a load-bearing structure.' },
    { class: 'EXC3', desc: 'The execution has great significance for the safety of a load-bearing structure.' },
  ]

  excDefinitions.forEach((item) => {
    doc.setFont('helvetica', 'bold')
    doc.text(`${item.class}:`, margin + 5, page7Y)
    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(item.desc, pageWidth - 2 * margin - 20)
    doc.text(descLines, margin + 20, page7Y)
    page7Y += Math.max(descLines.length * 5, 6)
  })

  page7Y += 8

  // 1.4 Organization of control work
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('1.4 Organization of control work', margin, page7Y)
  page7Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const orgParas = [
    'One and only one controller must be assigned per control section, and they must not have participated in the execution of that section.',
    '',
    'The executing party or their representative has prepared the control plan and will act as the lead controller for selecting controllers and verifying the control report.',
    '',
    'The goal is for the lead controller to perform on-site control to simplify the work.',
  ]

  orgParas.forEach((para) => {
    if (para === '') {
      page7Y += 3
    } else {
      const lines = doc.splitTextToSize(para, pageWidth - 2 * margin)
      doc.text(lines, margin, page7Y)
      page7Y += lines.length * 5 + 2
    }
  })

  page7Y += 8

  // 1.5 Controllers
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('1.5 Controllers', margin, page7Y)
  page7Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const controllerParas = [
    'Independent control is carried out by an actor who has not acted as the executing party on site.',
    '',
    'Control is handled by the same organization as the executing party.',
    '',
    'Controllers must have the right and necessary competencies for performing control, acquired through education and experience.',
  ]

  controllerParas.forEach((para) => {
    if (para === '') {
      page7Y += 3
    } else {
      const lines = doc.splitTextToSize(para, pageWidth - 2 * margin)
      doc.text(lines, margin, page7Y)
      page7Y += lines.length * 5 + 2
    }
  })

  page7Y += 5

  // Minimum requirements bullet list
  doc.setFont('helvetica', 'bold')
  doc.text('Minimum requirements for controllers:', margin, page7Y)
  page7Y += 6

  doc.setFont('helvetica', 'normal')
  const requirements = [
    'Familiarity with best practices for executing construction parts and sections.',
    'Ability to create an overview and wonder.',
    'Knowledge of their own limitations and use of professional experts.',
    'Competencies at least equivalent to the person who performed the work.',
    'Professional qualifications and competencies for construction work.',
    'Ability to understand standards, control plans, and good craftsmanship.',
    'Capability of familiarizing oneself with documents forming the basis for execution.',
  ]

  requirements.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, pageWidth - 2 * margin - 5)
    doc.text(lines, margin + 5, page7Y)
    page7Y += lines.length * 5
  })

  page7Y += 5
  const cvText = "The inspector's qualifications and competencies should be documented in the control report, e.g., by their CV."
  const cvLines = doc.splitTextToSize(cvText, pageWidth - 2 * margin)
  doc.text(cvLines, margin, page7Y)
  page7Y += cvLines.length * 5 + 8

  // 1.6 Use of assistance
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('1.6 Use of assistance', margin, page7Y)
  page7Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const assistanceParas = [
    'Assisting inspectors must have at least the competencies described in section 1.3.',
    '',
    'The ultimate responsibility for the inspection at all times rests with the inspector and is therefore not transferred to the assisting inspector.',
    '',
    'The inspector must follow up on inspections by assistants, ensure reasonable conduct, and sign the documentation.',
  ]

  assistanceParas.forEach((para) => {
    if (para === '') {
      page7Y += 3
    } else {
      const lines = doc.splitTextToSize(para, pageWidth - 2 * margin)
      doc.text(lines, margin, page7Y)
      page7Y += lines.length * 5 + 2
    }
  })

  // Footer Page 7
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10)
  doc.text(`Page 6`, pageWidth - margin, pageHeight - 10, { align: 'right' })

  console.log('✅ Page 7 completed')

  // Page 8: 1.7 Follow-up on deviations & 2. GENERAL CONTROLS
  // ---------------------------------------------------------
  doc.addPage()
  doc.setTextColor(0, 0, 0)
  console.log('📄 Creating Page 8 - Follow-up on deviations')

  let page8Y = 25

  // 1.7 Follow-up on deviations
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('1.7 Follow-up on deviations', margin, page8Y)
  page8Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('If deviations are found during the inspection, the following procedure is applied:', margin, page8Y)
  page8Y += 8

  // Deviation procedure bullets
  const deviationProcedure = [
    'Work on the construction part is halted and may not continue until the deviation is corrected.',
    'The inspector prepares a deviation report that may include illustrations of the deviation and proposed solutions.',
    'The controller assesses together with the executors whether the defect has a nature that necessitates a reassessment of the working basis for execution and the associated controls.',
    'The controller assesses together with the executors the implications of the deviation for the further execution and suitability in relation to the intended purpose in the design.',
    'The controller assesses together with the executors the necessary measures to make the component acceptable.',
    'The controller assesses together with the executors the necessity of rejection and replacement of the non-repairable building part.',
    'After rectifying the deviation, this is checked again and the result is documented.',
    'If it is not possible to correct the deviation, the structural designer must approve the deviation.',
  ]

  deviationProcedure.forEach((item) => {
    const lines = doc.splitTextToSize(`○ ${item}`, pageWidth - 2 * margin - 5)
    doc.text(lines, margin + 3, page8Y)
    page8Y += lines.length * 5
  })

  page8Y += 5
  const seriousErrorText =
    'If there are serious or multiple repeated errors at a control point, the inspection may be extended to a maximum inspection of the current control point and/or the structural designer may be involved in the assessment of the deviation.'
  const seriousLines = doc.splitTextToSize(seriousErrorText, pageWidth - 2 * margin)
  doc.text(seriousLines, margin, page8Y)
  page8Y += seriousLines.length * 5 + 10

  // 2. GENERAL CONTROLS
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('2. GENERAL CONTROLS', margin, page8Y)
  page8Y += 10

  // 2.1 General
  doc.setFontSize(12)
  doc.text('2.1 General', margin, page8Y)
  page8Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const generalControlText =
    'The general control is performed in accordance with DS 1140. In addition, the general control is carried out in accordance with the rules in DS/EN 1992-DS/EN 1999, including the associated national annexes and in accordance with the rules in the related execution standards, including the associated national application documents. The general control is carried out based on the division in DS 1140, annex B.'
  const generalLines = doc.splitTextToSize(generalControlText, pageWidth - 2 * margin)
  doc.text(generalLines, margin, page8Y)
  page8Y += generalLines.length * 5 + 8

  // Control item table
  const controlItems = [
    'B.1 Execution basis from design',
    'B.2 Execution basis for the work',
    'B.3 Materials and products',
    'B.4 Receiving control',
    'B.5 Execution',
    'B.5.1 Transport and storage on site',
    'B.5.2 Previously executed construction',
    'B.5.3 Assembly of prefabricated construction components',
    'B.5.4 Execution of non-certified construction components',
    'B.6 Final control',
  ]

  const table3Y = page8Y
  const table3RowHeight = 8
  const table3Width = pageWidth - 2 * margin

  // Table header
  doc.setFillColor(220, 220, 220)
  doc.rect(margin, table3Y, table3Width, table3RowHeight, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Control item', margin + 5, table3Y + 6)

  // Table rows
  controlItems.forEach((item, index) => {
    const rowYPos = table3Y + table3RowHeight * (index + 1)
    doc.setDrawColor(0, 0, 0)
    doc.rect(margin, rowYPos, table3Width, table3RowHeight)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(item, margin + 5, rowYPos + 6)
  })

  page8Y = table3Y + table3RowHeight * (controlItems.length + 1) + 8

  // Text after table
  doc.setFontSize(10)
  doc.text('The independent control of whether the self-control has been performed is always carried out as a maximum control.', margin, page8Y)
  page8Y += 10

  // Explanation for B.5.2 to B.5.4
  doc.setFont('helvetica', 'bold')
  doc.text('Explanation for B.5.2 to B.5.4:', margin, page8Y)
  page8Y += 6

  doc.setFont('helvetica', 'normal')
  const explanationText =
    'When executing constructions that are critically important for the operation and integrity of the structure, it must control points be fully checked (maximum) for:'
  const explanationLines = doc.splitTextToSize(explanationText, pageWidth - 2 * margin)
  doc.text(explanationLines, margin, page8Y)
  page8Y += explanationLines.length * 5 + 5

  doc.text('○ Presence of construction components', margin + 5, page8Y)

  // Footer Page 8
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10)
  doc.text(`Page 7 of 21`, pageWidth - margin, pageHeight - 10, { align: 'right' })

  console.log('✅ Page 8 completed')

  // Page 9: 2.3 Control section, 2.5 Control plan, 3. Special Controls
  // -------------------------------------------------------------------
  doc.addPage()
  doc.setTextColor(0, 0, 0)
  console.log('📄 Creating Page 9 - Control section & Special controls')

  let page9Y = 25

  // Top bullet points (continued from previous page)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const topBullets = [
    'Presence of assembly components',
    'Bearing depths during the assembly of prefabricated construction components',
    'The subsoil for geotechnical constructions regarding whether the soil is as assumed in the execution basis from the design.',
  ]

  topBullets.forEach((item) => {
    doc.text(`○ ${item}`, margin + 5, page9Y)
    page9Y += 5
  })

  page9Y += 10

  // Define variables for Page 9
  const xNum = data.gamma.x || 'x number'
  const specText = data.project.specialText || 'Special text'
  const ccValuePage9 = data.gamma.cc || 'KK'

  // 2.3 Control section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('2.3 Control section', margin, page9Y)
  page9Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const controlSectionText =
    'A construction section is subdivided into control sections based on factors like construction types, scope, or execution timing. Control sections must be well-defined, delineated, and bounded by a production period of a maximum of 4 weeks. The execution of the construction section is divided according to the tender control plan for the following control sections.'
  const controlSectionLines = doc.splitTextToSize(controlSectionText, pageWidth - 2 * margin)
  doc.text(controlSectionLines, margin, page9Y)
  page9Y += controlSectionLines.length * 5 + 8

  // Table for 2.3
  const createControlTable = (startY, xNumParam, specTextParam) => {
    const tWidth = pageWidth - 2 * margin
    const tRowHeight = 12
    const tCol1 = 50
    const tCol2 = 80
    const tCol3 = tWidth - tCol1 - tCol2

    // Table header
    doc.setFillColor(...primaryColor)
    doc.rect(margin, startY, tWidth, tRowHeight, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('ID', margin + 5, startY + 8)
    doc.text('DOCUMENT', margin + tCol1 + 5, startY + 8)
    doc.text('CONSTRUCTION SECTION: EXECUTION', margin + tCol1 + tCol2 + 5, startY + 8)
    doc.setTextColor(0, 0, 0)

    // Vertical lines in header
    doc.setDrawColor(255, 255, 255)
    doc.line(margin + tCol1, startY, margin + tCol1, startY + tRowHeight)
    doc.line(margin + tCol1 + tCol2, startY, margin + tCol1 + tCol2, startY + tRowHeight)

    // Table row
    const tRowY = startY + tRowHeight
    doc.setDrawColor(0, 0, 0)
    doc.rect(margin, tRowY, tWidth, tRowHeight)
    doc.line(margin + tCol1, tRowY, margin + tCol1, tRowY + tRowHeight)
    doc.line(margin + tCol1 + tCol2, tRowY, margin + tCol1 + tCol2, tRowY + tRowHeight)

    // Row content with yellow highlight
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    // Yellow highlight for x number
    doc.setFillColor(255, 255, 200)
    doc.rect(margin + 2, tRowY + 2, 40, 8, 'F')
    doc.text(`B2. ${xNumParam}`, margin + 5, tRowY + 8)

    doc.text('Static Control Plan', margin + tCol1 + 5, tRowY + 8)

    // Yellow highlight for special text
    doc.setFillColor(255, 255, 200)
    doc.rect(margin + tCol1 + tCol2 + 2, tRowY + 2, 60, 8, 'F')
    doc.text(specTextParam, margin + tCol1 + tCol2 + 5, tRowY + 8)

    return startY + tRowHeight * 2
  }

  page9Y = createControlTable(page9Y, xNum, specText) + 10

  // 2.4 Explanation of the selection of controls
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('2.4 Explanation of the selection of controls', margin, page9Y)
  page9Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const controlSelectionText = `Since the present construction section is classified in construction class ${ccValuePage9}, an explanation of the selected control points must be provided, which is done in connection with the control report.`
  const controlSelectionLines = doc.splitTextToSize(controlSelectionText, pageWidth - 2 * margin)
  doc.text(controlSelectionLines, margin, page9Y)
  page9Y += controlSelectionLines.length * 5 + 10

  // 2.5 Control plan
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('2.5 Control plan', margin, page9Y)
  page9Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Control points are specified in the control plan prepared by the executing Contractor.', margin, page9Y)
  page9Y += 8

  // Same table for 2.5
  page9Y = createControlTable(page9Y, xNum, specText) + 15

  // 3. SPECIAL CONTROLS
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('3. SPECIAL CONTROLS', margin, page9Y)
  page9Y += 10

  // 3.1 General
  doc.setFontSize(12)
  doc.text('3.1 General', margin, page9Y)
  page9Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const specialControlGeneral =
    'There are no special controls indicated by the building project designers according to the present construction section. If there are special controls, they will be listed under section 3.2.'
  const specialLines = doc.splitTextToSize(specialControlGeneral, pageWidth - 2 * margin)
  doc.text(specialLines, margin, page9Y)
  page9Y += specialLines.length * 5 + 10

  // 3.2 Special control points
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('3.2 Special control points', margin, page9Y)
  page9Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const specialControlNote =
    'According to section 3.1, no requirements for special controls have been set. If there are special controls, they will be indicated below in the table; otherwise, none exist.'
  const specialNoteLines = doc.splitTextToSize(specialControlNote, pageWidth - 2 * margin)
  doc.text(specialNoteLines, margin, page9Y)
  page9Y += specialNoteLines.length * 5 + 8

  // Special control table with DESCRIPTION column
  const specialTableY = page9Y
  const specialTableWidth = pageWidth - 2 * margin
  const specialRowHeight = 12
  const specialCol1Width = 50
  const specialCol2Width = 70
  const specialCol3Width = specialTableWidth - specialCol1Width - specialCol2Width

  // Table header
  doc.setFillColor(...primaryColor)
  doc.rect(margin, specialTableY, specialTableWidth, specialRowHeight, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('ID', margin + 5, specialTableY + 8)
  doc.text('DOCUMENT', margin + specialCol1Width + 5, specialTableY + 8)
  doc.text('DESCRIPTION', margin + specialCol1Width + specialCol2Width + 5, specialTableY + 8)
  doc.setTextColor(0, 0, 0)

  // Vertical lines in header
  doc.setDrawColor(255, 255, 255)
  doc.line(margin + specialCol1Width, specialTableY, margin + specialCol1Width, specialTableY + specialRowHeight)
  doc.line(
    margin + specialCol1Width + specialCol2Width,
    specialTableY,
    margin + specialCol1Width + specialCol2Width,
    specialTableY + specialRowHeight,
  )

  // Table row
  const specialRowY = specialTableY + specialRowHeight
  doc.setDrawColor(0, 0, 0)
  doc.rect(margin, specialRowY, specialTableWidth, specialRowHeight)
  doc.line(margin + specialCol1Width, specialRowY, margin + specialCol1Width, specialRowY + specialRowHeight)
  doc.line(margin + specialCol1Width + specialCol2Width, specialRowY, margin + specialCol1Width + specialCol2Width, specialRowY + specialRowHeight)

  // Row content with yellow highlights
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  // Yellow highlight for special control id
  const specialControlId = data.gamma._id ? String(data.gamma._id) : 'Special control id'
  doc.setFillColor(255, 255, 200)
  doc.rect(margin + 2, specialRowY + 2, 45, 8, 'F')
  doc.text(specialControlId, margin + 5, specialRowY + 8)

  doc.text('Special control', margin + specialCol1Width + 5, specialRowY + 8)

  // Yellow highlight for description
  const description = data.gamma.description || data.gamma.note || 'Note form note'
  doc.setFillColor(255, 255, 200)
  doc.rect(margin + specialCol1Width + specialCol2Width + 2, specialRowY + 2, 50, 8, 'F')
  doc.text(description, margin + specialCol1Width + specialCol2Width + 5, specialRowY + 8)

  // Footer Page 9
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10)
  doc.text(`Page 8`, pageWidth - margin, pageHeight - 10, { align: 'right' })

  console.log('✅ Page 9 completed')

  // Page 10: 4. DOCUMENTATION
  // --------------------------
  doc.addPage()
  doc.setTextColor(0, 0, 0)
  console.log('📄 Creating Page 10 - 4. DOCUMENTATION')

  let page10Y = 25

  // Main title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('4. DOCUMENTATION', margin, page10Y)
  page10Y += 12

  // 4.1 General description of documentation
  doc.setFontSize(12)
  doc.text('4.1 General description of documentation', margin, page10Y)
  page10Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const docIntro =
    'Documentation for the current construction section includes a control plan, associated appendices, control reports, and their appendices.'
  const docIntroLines = doc.splitTextToSize(docIntro, pageWidth - 2 * margin)
  doc.text(docIntroLines, margin, page10Y)
  page10Y += docIntroLines.length * 5 + 8

  // Document table
  const docTableY = page10Y
  const docTableWidth = pageWidth - 2 * margin
  const docTableRowHeight = 12
  const docCol1Width = 50
  const docCol2Width = 70
  const docCol3Width = docTableWidth - docCol1Width - docCol2Width

  // Table header
  doc.setFillColor(...primaryColor)
  doc.rect(margin, docTableY, docTableWidth, docTableRowHeight, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('ID', margin + 5, docTableY + 8)
  doc.text('DESCRIPTION', margin + docCol1Width + 5, docTableY + 8)
  doc.text('CONSTRUCTION SECTION: EXECUTION', margin + docCol1Width + docCol2Width + 5, docTableY + 8)
  doc.setTextColor(0, 0, 0)

  // Vertical lines in header
  doc.setDrawColor(255, 255, 255)
  doc.line(margin + docCol1Width, docTableY, margin + docCol1Width, docTableY + docTableRowHeight)
  doc.line(margin + docCol1Width + docCol2Width, docTableY, margin + docCol1Width + docCol2Width, docTableY + docTableRowHeight)

  // Get values
  const xNumPage10 = data.gamma.x || 'x number'
  const specTextPage10 = data.project.specialText || 'Special text'

  // Table Row 1: B3
  const docRow1Y = docTableY + docTableRowHeight
  doc.setDrawColor(0, 0, 0)
  doc.rect(margin, docRow1Y, docTableWidth, docTableRowHeight)
  doc.line(margin + docCol1Width, docRow1Y, margin + docCol1Width, docRow1Y + docTableRowHeight)
  doc.line(margin + docCol1Width + docCol2Width, docRow1Y, margin + docCol1Width + docCol2Width, docRow1Y + docTableRowHeight)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  // Yellow highlight for B3 x number
  doc.setFillColor(255, 255, 200)
  doc.rect(margin + 2, docRow1Y + 2, 35, 8, 'F')
  doc.text(`B3. ${xNumPage10}`, margin + 5, docRow1Y + 8)

  doc.text('Static Control Report', margin + docCol1Width + 5, docRow1Y + 8)

  // Yellow highlight for special text
  doc.setFillColor(255, 255, 200)
  doc.rect(margin + docCol1Width + docCol2Width + 2, docRow1Y + 2, 50, 8, 'F')
  doc.text(specTextPage10, margin + docCol1Width + docCol2Width + 5, docRow1Y + 8)

  // Table Row 2: A5
  const docRow2Y = docRow1Y + docTableRowHeight
  doc.rect(margin, docRow2Y, docTableWidth, docTableRowHeight)
  doc.line(margin + docCol1Width, docRow2Y, margin + docCol1Width, docRow2Y + docTableRowHeight)
  doc.line(margin + docCol1Width + docCol2Width, docRow2Y, margin + docCol1Width + docCol2Width, docRow2Y + docTableRowHeight)

  // Yellow highlight for A5 x number
  doc.setFillColor(255, 255, 200)
  doc.rect(margin + 2, docRow2Y + 2, 35, 8, 'F')
  doc.text(`A5. ${xNumPage10}`, margin + 5, docRow2Y + 8)

  doc.text('A5 as performed', margin + docCol1Width + 5, docRow2Y + 8)

  // Yellow highlight for special text
  doc.setFillColor(255, 255, 200)
  doc.rect(margin + docCol1Width + docCol2Width + 2, docRow2Y + 2, 50, 8, 'F')
  doc.text(specTextPage10, margin + docCol1Width + docCol2Width + 5, docRow2Y + 8)

  page10Y = docRow2Y + docTableRowHeight + 8

  // Text after table
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('The above is updated each time a change occurs regarding the execution.', margin, page10Y)
  page10Y += 8

  const docRequirement = 'Documentation must include actual control results and a follow-up on comments.'
  const docReqLines = doc.splitTextToSize(docRequirement, pageWidth - 2 * margin)
  doc.text(docReqLines, margin, page10Y)
  page10Y += docReqLines.length * 5 + 10

  // 4.2 Documentation of general controls
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('4.2 Documentation of general controls', margin, page10Y)
  page10Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const genControlDoc =
    'Documentation of general controls includes a completed control report, clarification of all points, approval and signing by the controller, and documentation of deviations. Documentation must be retained for at least 5 years.'
  const genControlLines = doc.splitTextToSize(genControlDoc, pageWidth - 2 * margin)
  doc.text(genControlLines, margin, page10Y)
  page10Y += genControlLines.length * 5 + 10

  // 4.3 Documentation of special controls
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('4.3 Documentation of special controls', margin, page10Y)
  page10Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('The structural designer has not specified requirements for special controls in their documentation.', margin, page10Y)
  page10Y += 10

  // 4.4 Documentation for deviations and follow-up
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('4.4 Documentation for deviations and follow-up', margin, page10Y)
  page10Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const deviationDoc =
    'Deviations are recorded and deviation reports are created as appendices to control reports. The building designer is involved if remedies deviate from the execution basis.'
  const deviationDocLines = doc.splitTextToSize(deviationDoc, pageWidth - 2 * margin)
  doc.text(deviationDocLines, margin, page10Y)
  page10Y += deviationDocLines.length * 5 + 10

  // 4.5 Control of Control Documentation
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('4.5 Control of Control Documentation', margin, page10Y)
  page10Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const controlOfDoc =
    'Control documentation is collected and reviewed by the controller to ensure all documents are present, and all controls are completed, dated, and signed.'
  const controlOfDocLines = doc.splitTextToSize(controlOfDoc, pageWidth - 2 * margin)
  doc.text(controlOfDocLines, margin, page10Y)

  // Footer Page 10
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10)
  doc.text(`Page 9`, pageWidth - margin, pageHeight - 10, { align: 'right' })

  console.log('✅ Page 10 completed')

  // Page 11: 5.1 REGISTERS & 5.2 Scope of control
  // ----------------------------------------------
  doc.addPage()
  doc.setTextColor(0, 0, 0)
  console.log('📄 Creating Page 11 - 5.1 REGISTERS')

  let page11Y = 25

  // 5.1 REGISTERS with blue header
  doc.setFillColor(...primaryColor)
  doc.rect(margin, page11Y, pageWidth - 2 * margin, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('5.1 REGISTERS', margin + 5, page11Y + 7)
  doc.setTextColor(0, 0, 0)

  page11Y += 15

  // Registers table with dashed border
  const regTableY = page11Y
  const regTableWidth = pageWidth - 2 * margin
  const regTableRowHeight = 12
  const regCol1Width = 50
  const regCol2Width = 70
  const regCol3Width = regTableWidth - regCol1Width - regCol2Width

  // Table border (dashed)
  doc.setDrawColor(100, 100, 100)
  doc.setLineDash([3, 3])
  const totalTableHeight = regTableRowHeight * 4 // Header + 3 rows
  doc.rect(margin, regTableY, regTableWidth, totalTableHeight)
  doc.setLineDash([])

  // Table header
  doc.setFillColor(220, 220, 220)
  doc.rect(margin, regTableY, regTableWidth, regTableRowHeight, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('ID', margin + 5, regTableY + 8)
  doc.text('DESCRIPTION', margin + regCol1Width + 5, regTableY + 8)
  doc.text('CONSTRUCTION SECTION: EXECUTION', margin + regCol1Width + regCol2Width + 5, regTableY + 8)

  // Vertical lines in header
  doc.setDrawColor(0, 0, 0)
  doc.line(margin + regCol1Width, regTableY, margin + regCol1Width, regTableY + regTableRowHeight)
  doc.line(margin + regCol1Width + regCol2Width, regTableY, margin + regCol1Width + regCol2Width, regTableY + regTableRowHeight)

  // Get values
  const xNumPage11 = data.gamma.x || 'x number'
  const specTextPage11 = data.project.specialText || 'Special text'

  // Define table rows
  const registerRows = [
    { id: `B2. ${xNumPage11}`, desc: 'Static control plan', execution: specTextPage11 },
    { id: `B3. ${xNumPage11}`, desc: 'Static Control Report', execution: specTextPage11 },
    { id: `A5. ${xNumPage11}`, desc: 'A5 as performed', execution: specTextPage11 },
  ]

  // Table rows
  registerRows.forEach((row, index) => {
    const rowYPos = regTableY + regTableRowHeight * (index + 1)

    // Row border
    doc.rect(margin, rowYPos, regTableWidth, regTableRowHeight)
    doc.line(margin + regCol1Width, rowYPos, margin + regCol1Width, rowYPos + regTableRowHeight)
    doc.line(margin + regCol1Width + regCol2Width, rowYPos, margin + regCol1Width + regCol2Width, rowYPos + regTableRowHeight)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    // Yellow highlight for ID (x number)
    doc.setFillColor(255, 255, 200)
    doc.rect(margin + 2, rowYPos + 2, 35, 8, 'F')
    doc.text(row.id, margin + 5, rowYPos + 8)

    doc.text(row.desc, margin + regCol1Width + 5, rowYPos + 8)

    // Yellow highlight for special text
    doc.setFillColor(255, 255, 200)
    doc.rect(margin + regCol1Width + regCol2Width + 2, rowYPos + 2, 50, 8, 'F')
    doc.text(row.execution, margin + regCol1Width + regCol2Width + 5, rowYPos + 8)
  })

  page11Y = regTableY + totalTableHeight + 8

  // Text after registers table
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const namingText = 'The naming of the documents above is determined by the building designer.'
  doc.text(namingText, margin, page11Y)
  page11Y += 7

  const documentationText =
    'The aforementioned documents will be part of the overall static documentation for the current construction section when the work is completed.'
  const docTextLines = doc.splitTextToSize(documentationText, pageWidth - 2 * margin)
  doc.text(docTextLines, margin, page11Y)
  page11Y += docTextLines.length * 5 + 5

  doc.text('See also the table further down in the control plan under item 7.1', margin, page11Y)
  page11Y += 15

  // 5.2 Scope of control
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('5.2 Scope of control', margin, page11Y)
  page11Y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const scopeText =
    'The scope of controls is indicated in the tables under item 7.1 and is determined based on which (classes) the Building Project Designers have specified in the project materials.'
  const scopeLines = doc.splitTextToSize(scopeText, pageWidth - 2 * margin)
  doc.text(scopeLines, margin, page11Y)

  // Footer Page 11
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10)
  doc.text(`Page 10`, pageWidth - margin, pageHeight - 10, { align: 'right' })

  console.log('✅ Page 11 completed')

  // Page 12: 6. SELECTED CONTROL LOCATIONS
  // ----------------------------------------
  doc.addPage()
  doc.setTextColor(0, 0, 0)
  console.log('📄 Creating Page 12 - 6. SELECTED CONTROL LOCATIONS')

  let page12Y = 25

  // Blue header bar
  doc.setFillColor(...primaryColor)
  doc.rect(margin, page12Y, pageWidth - 2 * margin, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('6. SELECTED CONTROL LOCATIONS', margin + 5, page12Y + 7)
  doc.setTextColor(0, 0, 0)

  page12Y += 15

  // OVERVIEW field
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('OVERVIEW:', margin, page12Y)
  page12Y += 8

  // UPLOADED DRAWINGS field
  doc.text('UPLOADED DRAWINGS:', margin, page12Y)
  page12Y += 6

  // List drawings names if available
  const drawings = data.drawings || []
  if (drawings.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    drawings.forEach((drawing, index) => {
      doc.text(`• ${drawing.name || `Drawing ${index + 1}`}`, margin + 5, page12Y)
      page12Y += 5
    })
    page12Y += 5
  } else {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('No drawings uploaded', margin + 5, page12Y)
    page12Y += 10
  }

  // Red text notice
  doc.setTextColor(255, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Control locations are selected below on the drawing.', margin, page12Y)
  doc.setTextColor(0, 0, 0)
  page12Y += 8

  // Marked main drawing label
  doc.setFont('helvetica', 'bold')
  doc.text('Marked main drawing.', margin, page12Y)
  page12Y += 10

  // Drawing preview area (dashed border)
  const drawingBoxY = page12Y
  const drawingBoxHeight = 120
  doc.setDrawColor(150, 150, 150)
  doc.setLineDash([3, 3])
  doc.rect(margin, drawingBoxY, pageWidth - 2 * margin, drawingBoxHeight)
  doc.setLineDash([])

  // Note: jsPDF can embed images, but since we're working with URLs/paths
  // we'd need to convert them first. For now, showing placeholder.
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text('[Drawing preview area]', pageWidth / 2, drawingBoxY + drawingBoxHeight / 2, { align: 'center' })

  if (drawings.length > 0 && drawings[0].name) {
    doc.text(drawings[0].name, pageWidth / 2, drawingBoxY + drawingBoxHeight / 2 + 5, { align: 'center' })
  }

  doc.setTextColor(0, 0, 0)

  page12Y = drawingBoxY + drawingBoxHeight + 8

  // Text below drawing
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const controlPointsText = 'There are points indicated above where the executive party intends to perform control.'
  doc.text(controlPointsText, margin, page12Y)

  // Footer Page 12
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10)
  doc.text(`Page 11`, pageWidth - margin, pageHeight - 10, { align: 'right' })

  console.log('✅ Page 12 completed')
  console.log('   Drawings included:', drawings.length)

  // Page 13: 7. STATIC CONTROL (TABLE)
  // -----------------------------------
  doc.addPage()
  doc.setTextColor(0, 0, 0)
  console.log('📄 Creating Page 13 - 7. STATIC CONTROL (TABLE)')

  let page13Y = 25

  // Main header - 7. STATIC CONTROL (TABLE)
  doc.setFillColor(...primaryColor)
  doc.rect(margin, page13Y, pageWidth - 2 * margin, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('7. STATIC CONTROL (TABLE)', margin + 5, page13Y + 7)
  doc.setTextColor(0, 0, 0)

  page13Y += 15

  // Sub-header - 7.0 Static Control Plan table for
  doc.setFillColor(...primaryColor)
  doc.rect(margin, page13Y, pageWidth - 2 * margin, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('7.0 Static Control Plan table for', margin + 5, page13Y + 6)
  doc.setTextColor(0, 0, 0)

  page13Y += 12

  // Table with dashed border
  const staticTableY = page13Y
  const staticTableWidth = pageWidth - 2 * margin
  const staticTableRowHeight = 12
  const staticCol1Width = 50
  const staticCol2Width = 70
  const staticCol3Width = staticTableWidth - staticCol1Width - staticCol2Width

  // Dashed border around table section
  doc.setDrawColor(100, 100, 100)
  doc.setLineDash([3, 3])
  const staticTableTotalHeight = staticTableRowHeight * 2 // Header + 1 row
  doc.rect(margin, staticTableY, staticTableWidth, staticTableTotalHeight)
  doc.setLineDash([])

  // Table header
  doc.setFillColor(220, 220, 220)
  doc.rect(margin, staticTableY, staticTableWidth, staticTableRowHeight, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setDrawColor(0, 0, 0)
  doc.text('B2. x number.', margin + 5, staticTableY + 8)
  doc.text('Static Control plan', margin + staticCol1Width + 5, staticTableY + 8)
  doc.text('Special text', margin + staticCol1Width + staticCol2Width + 5, staticTableY + 8)

  // Vertical lines in header
  doc.line(margin + staticCol1Width, staticTableY, margin + staticCol1Width, staticTableY + staticTableRowHeight)
  doc.line(margin + staticCol1Width + staticCol2Width, staticTableY, margin + staticCol1Width + staticCol2Width, staticTableY + staticTableRowHeight)

  // Table row with actual values
  const staticRowY = staticTableY + staticTableRowHeight
  doc.rect(margin, staticRowY, staticTableWidth, staticTableRowHeight)
  doc.line(margin + staticCol1Width, staticRowY, margin + staticCol1Width, staticRowY + staticTableRowHeight)
  doc.line(margin + staticCol1Width + staticCol2Width, staticRowY, margin + staticCol1Width + staticCol2Width, staticRowY + staticTableRowHeight)

  const xNumPage13 = data.gamma.x || 'x number'
  const specTextPage13 = data.project.specialText || 'Special text'

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  // Yellow highlight for x number
  doc.setFillColor(255, 255, 200)
  doc.rect(margin + 2, staticRowY + 2, 35, 8, 'F')
  doc.text(`B2. ${xNumPage13}`, margin + 5, staticRowY + 8)

  doc.text('Static Control plan', margin + staticCol1Width + 5, staticRowY + 8)

  // Yellow highlight for special text
  doc.setFillColor(255, 255, 200)
  doc.rect(margin + staticCol1Width + staticCol2Width + 2, staticRowY + 2, 50, 8, 'F')
  doc.text(specTextPage13, margin + staticCol1Width + staticCol2Width + 5, staticRowY + 8)

  page13Y = staticTableY + staticTableTotalHeight + 10

  // Text below table
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const tableExplanation =
    'In the table below, control of the project materials provided at the submission of prices has been carried out, forming the basis for the intended and executed work, which is a dynamic process until design approval.'
  const tableExplLines = doc.splitTextToSize(tableExplanation, pageWidth - 2 * margin)
  doc.text(tableExplLines, margin, page13Y)

  // Footer Page 13
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10)
  doc.text(`Page 12`, pageWidth - margin, pageHeight - 10, { align: 'right' })

  console.log('✅ Page 13 completed')

  // Control Sheet Pages (7.1, 7.2, 7.3 entries)
  // -------------------------------------------
  try {
    console.log('📊 Starting control sheet generation...')
    console.log('   Raw data.checklistEntries:', data.checklistEntries)

    const checklistEntries = data.checklistEntries || []
    const specialTextForTable = data.project.specialText || 'Special text'

    console.log('   Total checklist entries:', checklistEntries.length)
    console.log('   Special text for table:', specialTextForTable)

    if (checklistEntries.length === 0) {
      console.error('❌ No checklist entries found in data!')
      console.log('   Full data object keys:', Object.keys(data))
    }

    // Log all unique pos values to see what we have
    const allPosValues = [...new Set(checklistEntries.map((e) => e.pos).filter(Boolean))]
    console.log('🔍 All unique POS values found:', allPosValues)

    // Group entries by section
    const entries71 = checklistEntries.filter((e) => e.pos && e.pos.startsWith('7.1'))
    const entries72 = checklistEntries.filter((e) => e.pos && e.pos.startsWith('7.2'))
    const entries73 = checklistEntries.filter((e) => e.pos && e.pos.startsWith('7.3'))
    const entries74 = checklistEntries.filter((e) => e.pos && e.pos.startsWith('7.4'))
    const entries75 = checklistEntries.filter((e) => e.pos && e.pos.startsWith('7.5'))
    const entries76 = checklistEntries.filter((e) => e.pos && e.pos.startsWith('7.6'))

    console.log(`📊 Control Sheet Entries:`)
    console.log(`   7.1 entries: ${entries71.length}`, entries71.length > 0 ? `Sample: ${entries71[0].pos}` : '')
    console.log(`   7.2 entries: ${entries72.length}`, entries72.length > 0 ? `Sample: ${entries72[0].pos}` : '')
    console.log(`   7.3 entries: ${entries73.length}`, entries73.length > 0 ? `Sample: ${entries73[0].pos}` : '')
    console.log(`   7.4 entries: ${entries74.length}`, entries74.length > 0 ? `Sample: ${entries74[0].pos}` : '')
    console.log(`   7.5 entries: ${entries75.length}`, entries75.length > 0 ? `Sample: ${entries75[0].pos}` : '')
    console.log(`   7.6 entries: ${entries76.length}`, entries76.length > 0 ? `Sample: ${entries76[0].pos}` : '')

    // Function to create control sheet table
    const createControlSheetTable = (entries, sectionTitle, startPage) => {
      try {
        if (entries.length === 0) {
          console.log(`⚠️ No entries for ${sectionTitle}`)
          return startPage
        }

        console.log(`Creating control sheet for: ${sectionTitle}`)
        console.log(`   Entries count: ${entries.length}`)

        doc.addPage()
        doc.setTextColor(0, 0, 0)

        let pageNum = startPage
        let tableY = 25

        // Section header
        doc.setFillColor(...primaryColor)
        doc.rect(0, 15, pageWidth, 8, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(sectionTitle, pageWidth / 2, 21, { align: 'center' })
        doc.setTextColor(0, 0, 0)

        // Prepare table data
        const tableData = entries.map((entry, index) => {
          const controlOfValue = entry.checkingThe || entry.controlOf || ''

          // Log what we're using for CONTROL OF column
          if (index < 3) {
            // Log first 3 entries
            console.log(`   Entry ${index + 1} - pos: "${entry.pos}"`)
            console.log(`      checkingThe: "${entry.checkingThe}"`)
            console.log(`      controlOf: "${entry.controlOf}"`)
            console.log(`      → Using for CONTROL OF: "${controlOfValue}"`)
          }

          return [
            entry.pos || '',
            controlOfValue, // CONTROL OF column
            entry.subject || '',
            specialTextForTable, // Replace construction part with special text
            entry.basis || '',
            entry.controlMethod || '',
            entry.scope || entry.circumference || '', // Use scope or circumference
            entry.acceptanceCriteria || '',
            entry.time || '',
          ]
        })

        console.log(`   Table data prepared: ${tableData.length} rows`)
        console.log('   First row - POS:', tableData[0][0], '| CONTROL OF:', tableData[0][1])

        // Store current version outside callback
        const currentVersion = data.gamma.currentVersion || 1

        console.log('   Drawing manual table...')

        // Define column widths (total should be close to page width - margins)
        const colWidths = [12, 22, 32, 22, 22, 22, 12, 32, 24]
        const rowHeight = 15
        let currentY = tableY

        // Draw table header
        doc.setFillColor(...primaryColor)
        doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')

        const headers = ['POS', 'CONTROL OF', 'SUBJECT', 'CONSTRUCTION PART', 'BASIS', 'CONTROL METHOD', 'SCOPE', 'ACCEPTANCE CRITERIA', 'TIME']
        let xPos = margin
        headers.forEach((header, i) => {
          doc.text(header, xPos + 2, currentY + 5)
          xPos += colWidths[i]
        })

        currentY += rowHeight
        doc.setTextColor(0, 0, 0)

        // Draw table rows
        tableData.forEach((row, rowIndex) => {
          // Check if we need a new page
          if (currentY + rowHeight > pageHeight - 30) {
            // Add footer before new page
            doc.setFontSize(8)
            doc.setTextColor(150, 150, 150)
            doc.text(`Static Control Plan - Version ${currentVersion}`, margin, pageHeight - 10)
            doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: 'right' })

            doc.addPage()
            pageNum++
            currentY = 25
            doc.setTextColor(0, 0, 0)
          }

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6)

          xPos = margin
          row.forEach((cell, cellIndex) => {
            // Yellow background for CONSTRUCTION PART column
            if (cellIndex === 3) {
              doc.setFillColor(255, 255, 200)
              doc.rect(xPos, currentY, colWidths[cellIndex], rowHeight, 'F')
            }

            // Draw cell border
            doc.setDrawColor(0, 0, 0)
            doc.rect(xPos, currentY, colWidths[cellIndex], rowHeight)

            // Draw cell text (with word wrap)
            const cellText = String(cell || '')
            const lines = doc.splitTextToSize(cellText, colWidths[cellIndex] - 2)
            doc.text(lines.slice(0, 2), xPos + 1, currentY + 4) // Max 2 lines per cell

            xPos += colWidths[cellIndex]
          })

          currentY += rowHeight
        })

        // Add footer to last page
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(`Static Control Plan - Version ${currentVersion}`, margin, pageHeight - 10)
        doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
        pageNum++

        console.log(`✅ Manual table completed for ${sectionTitle}`)
        console.log(`   Final pageNum: ${pageNum}`)
        return pageNum
      } catch (error) {
        console.error(`❌ Error creating table for ${sectionTitle}:`, error)
        return startPage
      }
    }

    // Create control sheet tables
    let currentPage = 13

    if (entries71.length > 0) {
      currentPage = createControlSheetTable(entries71, '7.1 Execution basis from design', currentPage)
      console.log(`✅ 7.1 Control sheet created`)
    }

    if (entries72.length > 0) {
      currentPage = createControlSheetTable(entries72, '7.2 Execution basis for the work', currentPage)
      console.log(`✅ 7.2 Control sheet created`)
    }

    if (entries73.length > 0) {
      currentPage = createControlSheetTable(entries73, '7.3 Control of Documentation of Materials and Products', currentPage)
      console.log(`✅ 7.3 Control sheet created`)
    }

    console.log('🔄 Attempting to create 7.4 page...')
    if (entries74.length > 0) {
      console.log(`   ✅ Found ${entries74.length} entries for 7.4`)
      console.log(`   Sample entry:`, entries74[0])
      currentPage = createControlSheetTable(entries74, '7.4 Reception control', currentPage)
      console.log(`✅ 7.4 Control sheet created, new page: ${currentPage}`)
    } else {
      console.log(`   ❌ No entries found for 7.4`)
    }

    console.log('🔄 Attempting to create 7.5 page...')
    if (entries75.length > 0) {
      console.log(`   ✅ Found ${entries75.length} entries for 7.5`)
      console.log(`   Sample entry:`, entries75[0])
      currentPage = createControlSheetTable(entries75, '7.5 Work in progress', currentPage)
      console.log(`✅ 7.5 Control sheet created, new page: ${currentPage}`)
    } else {
      console.log(`   ❌ No entries found for 7.5`)
    }

    console.log('🔄 Attempting to create 7.6 page...')
    if (entries76.length > 0) {
      console.log(`   ✅ Found ${entries76.length} entries for 7.6`)
      console.log(`   Sample entry:`, entries76[0])
      currentPage = createControlSheetTable(entries76, '7.6 Completion of the work', currentPage)
      console.log(`✅ 7.6 Control sheet created, new page: ${currentPage}`)
    } else {
      console.log(`   ❌ No entries found for 7.6`)
    }

    console.log(`✅ All control sheets completed. Total pages: ${doc.internal.getNumberOfPages()}`)
  } catch (error) {
    console.error('❌ Error creating control sheets:', error)
  }

}

module.exports = {
  renderStaticControlPlan,
}
