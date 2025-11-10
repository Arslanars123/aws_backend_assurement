function renderGeneralControls(doc, data, context) {
  const {
    margin,
    pageWidth,
    pageHeight,
    contentWidth,
    safeRight,
    colors: { primary: primaryColor, lightGray, footerText },
  } = context;

  const safeRightText = (text, y, options = {}) =>
    doc.text(text, safeRight, y, { align: 'right', ...options });

  // Page 5: 1. GENERAL - 1.1 Description of the Control Work
  // ---------------------------------------------------------
  doc.addPage();
  doc.setTextColor(0, 0, 0);
  console.log('📄 Creating Page 5 - 1. GENERAL');

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('1. GENERAL', margin, 25);

  doc.setFontSize(12);
  doc.text('1.1 Description of the Control Work', margin, 35);

  let contentY = 45;

  // Paragraph 1
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const para1 =
    "The static control plan covers the execution of construction and related works, carried out in accordance with the building project's designer. The control focuses on examining materials and execution, with particular attention to material dimensions, placement, and compliance with tolerances.";
  const para1Lines = doc.splitTextToSize(para1, contentWidth);
  doc.text(para1Lines, margin, contentY);
  contentY += para1Lines.length * 5 + 5;

  // Bullet List 1: Basis for control
  doc.setFont('helvetica', 'bold');
  doc.text('Basis for the control performed:', margin, contentY);
  contentY += 6;

  doc.setFont('helvetica', 'normal');
  const basisList = [
    'Building Regulations 2018',
    "SBi271 'Documentation and Control of Load-Bearing Structures'",
    'DS/EN 1990 DK NA:2021, Annex B5',
    "DS 1140:2019 'Execution of Load-Bearing Structures - General Control'",
    "DS/INF 1140:2022 'Guidance for DS 1140'",
  ];

  basisList.forEach((item) => {
    doc.text(`• ${item}`, margin + 5, contentY);
    contentY += 5;
  });

  contentY += 3;

  // Supplementary text
  doc.setFontSize(9);
  doc.text('Supplementary rules and regulations according to the mentioned euro code.', margin, contentY);
  contentY += 5;
  doc.text('Rules and reg form eurocode details. Later version.', margin, contentY);
  contentY += 8;

  // Quality Assurance paragraph
  doc.setFontSize(10);
  doc.text(
    "Control is also based on the executor's documented quality assurance system, which is periodically reviewed.",
    margin,
    contentY,
  );
  contentY += 8;

  // Bullet List 2: Quality assurance system
  doc.setFont('helvetica', 'bold');
  doc.text('Quality assurance system includes:', margin, contentY);
  contentY += 6;

  doc.setFont('helvetica', 'normal');
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
  ];

  qaList.forEach((item) => {
    doc.text(`• ${item}`, margin + 5, contentY);
    contentY += 5;
  });

  contentY += 5;

  // Independent Control paragraph
  doc.setFontSize(10);
  doc.text(
    "Independent control is carried out by the executing party, with exceptions for special control points where it's performed by the design organization.",
    margin,
    contentY,
  );
  contentY += 15;

  // Table
  const table2Y = contentY; // Renamed to avoid conflict with Page 3 tableY
  const table2Width = contentWidth;
  const table2RowHeight = 12;
  const table2Col1Width = 50;
  const table2Col2Width = 80;
  const table2Col3Width = table2Width - table2Col1Width - table2Col2Width;

  // Table header
  doc.setFillColor(...primaryColor);
  doc.rect(margin, table2Y, table2Width, table2RowHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ID', margin + 5, table2Y + 8);
  doc.text('DOCUMENT', margin + table2Col1Width + 5, table2Y + 8);
  doc.text('CONSTRUCTION SECTION: EXECUTION', margin + table2Col1Width + table2Col2Width + 5, table2Y + 8);
  doc.setTextColor(0, 0, 0);

  // Vertical lines in header
  doc.setDrawColor(255, 255, 255);
  doc.line(margin + table2Col1Width, table2Y, margin + table2Col1Width, table2Y + table2RowHeight);
  doc.line(
    margin + table2Col1Width + table2Col2Width,
    table2Y,
    margin + table2Col1Width + table2Col2Width,
    table2Y + table2RowHeight,
  );

  // Table row
  const row2Y = table2Y + table2RowHeight;
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, row2Y, table2Width, table2RowHeight);

  // Vertical lines
  doc.line(margin + table2Col1Width, row2Y, margin + table2Col1Width, row2Y + table2RowHeight);
  doc.line(
    margin + table2Col1Width + table2Col2Width,
    row2Y,
    margin + table2Col1Width + table2Col2Width,
    row2Y + table2RowHeight,
  );

  // Row content
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const xNumber = data.gamma.x || '';
  const specialText2 = data.project.specialText || 'Special text';

  doc.text(`B.2. ${xNumber}`, margin + 5, row2Y + 8);
  doc.text('Static Control Plan', margin + table2Col1Width + 5, row2Y + 8);
  doc.text(specialText2, margin + table2Col1Width + table2Col2Width + 5, row2Y + 8);

  // Footer Page 5
  doc.setFontSize(8);
  doc.setTextColor(...footerText);
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10);
  safeRightText('Page 4', pageHeight - 10);

  console.log('✅ Page 5 completed');

  // Page 6: 1.2 Types of control & 1.3 Control level
  // -------------------------------------------------
  doc.addPage();
  doc.setTextColor(0, 0, 0);
  console.log('📄 Creating Page 6 - 1.2 Types of control');

  // Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1.2 Types of control', margin, 25);

  let pageContentY = 35;

  // Introduction with CCX/KKX values
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const excValue = data.gamma.exc || 'CCX';
  const ccValue = data.gamma.cc || 'KKX';

  // First paragraph with highlighted values
  const intro1 = `The structure is classified into construction class `;
  doc.text(intro1, margin, pageContentY);
  const intro1Width = doc.getTextWidth(intro1);

  // Yellow highlight for CCX/KKX
  doc.setFillColor(255, 255, 200);
  const classText = `${excValue} / ${ccValue} no.`;
  const classTextWidth = doc.getTextWidth(classText);
  doc.rect(margin + intro1Width, pageContentY - 3, classTextWidth + 2, 5, 'F');
  doc.text(classText, margin + intro1Width, pageContentY);

  pageContentY += 7;
  doc.text('Self-control and independent control of the executed works are carried out.', margin, pageContentY);
  pageContentY += 5;
  doc.text('There is no requirement for third-party control.', margin, pageContentY);
  pageContentY += 10;

  // Self-control section
  doc.setFont('helvetica', 'bold');
  doc.text('Self-control:', margin, pageContentY);
  pageContentY += 6;

  doc.setFont('helvetica', 'normal');
  const selfControlParas = [
    'Self-control is carried out by the person who performed the construction upon completion of parts or the whole. Self-control is performed during execution for concealed parts.',
    '',
    'Self-control includes assessment of whether:',
  ];

  selfControlParas.forEach((para) => {
    if (para === '') {
      pageContentY += 3;
    } else {
      const lines = doc.splitTextToSize(para, contentWidth);
      doc.text(lines, margin, pageContentY);
      pageContentY += lines.length * 5 + 2;
    }
  });

  // Self-control criteria bullets
  const selfControlCriteria = [
    'The entire construction and its parts have been executed.',
    'The construction has been executed correctly based on craftsmanship and good building practice.',
    'The construction aligns with the execution basis and agreements with the designer/construction management.',
    'Tolerances during execution adhere to relevant standards, good practices, and project-specific tolerances.',
    'Documentation of execution has been carried out, collected, and systematized according to SBi 271 section 2.6.',
  ];

  selfControlCriteria.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 5);
    doc.text(lines, margin + 5, pageContentY);
    pageContentY += lines.length * 5;
  });

  pageContentY += 3;
  doc.text('Self-control is always performed and documented in a control report.', margin, pageContentY);
  pageContentY += 10;

  // Independent control section
  doc.setFont('helvetica', 'bold');
  doc.text('Independent control:', margin, pageContentY);
  pageContentY += 6;

  doc.setFont('helvetica', 'normal');
  const indControlParas = [
    'Independent control is carried out by individuals who did not directly participate in the execution of the relevant control section. All independent controls within a section are performed by the same person and not by the work team leader.',
    '',
    'Independent control is carried out after self-control has been performed and reported.',
    '',
    'The independent control is performed in accordance with the project-specific static control plan for execution.',
  ];

  indControlParas.forEach((para) => {
    if (para === '') {
      pageContentY += 3;
    } else {
      const lines = doc.splitTextToSize(para, contentWidth);
      doc.text(lines, margin, pageContentY);
      pageContentY += lines.length * 5 + 2;
    }
  });

  pageContentY += 5;

  // 1.3 Control level
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1.3 Control level', margin, pageContentY);
  pageContentY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const controlLevelText =
    'The control level for general control is governed by the selected execution classes, cf. DS/EN 1990 DK NA, Annex B5.';
  const controlLevelLines = doc.splitTextToSize(controlLevelText, contentWidth);
  doc.text(controlLevelLines, margin, pageContentY);

  // Footer Page 6
  doc.setFontSize(8);
  doc.setTextColor(...footerText);
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10);
  safeRightText('Page 5', pageHeight - 10);

  console.log('✅ Page 6 completed');

  // Page 7: Execution Classes & Organization
  // -----------------------------------------
  doc.addPage();
  doc.setTextColor(0, 0, 0);
  console.log('📄 Creating Page 7 - Execution Classes');

  let page7Y = 25;

  // Introduction with EXC value from static control plan
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const excNo = data.gamma.exc || 'EXC';

  const intro = `The execution class is ${excNo} and self-control is performed as a maximum control. The independent control is performed as a sample control and maximum control.`;
  const introLines = doc.splitTextToSize(intro, contentWidth);
  doc.text(introLines, margin, page7Y);
  page7Y += introLines.length * 5 + 8;

  // Execution classes definition
  const execClassIntro =
    'Execution classes are indicators of the significance of the execution for the safety of a load-bearing structure.';
  const execIntroLines = doc.splitTextToSize(execClassIntro, contentWidth);
  doc.text(execIntroLines, margin, page7Y);
  page7Y += execIntroLines.length * 5 + 6;

  // EXC definitions
  const excDefinitions = [
    { class: 'EXC1', desc: 'The execution has limited significance for the safety of a load-bearing structure.' },
    { class: 'EXC2', desc: 'The execution has significance for the safety of a load-bearing structure.' },
    { class: 'EXC3', desc: 'The execution has great significance for the safety of a load-bearing structure.' },
  ];

  excDefinitions.forEach((item) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.class}:`, margin + 5, page7Y);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(item.desc, contentWidth - 20);
    doc.text(descLines, margin + 20, page7Y);
    page7Y += Math.max(descLines.length * 5, 6);
  });

  page7Y += 8;

  // 1.4 Organization of control work
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1.4 Organization of control work', margin, page7Y);
  page7Y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const orgParas = [
    'One and only one controller must be assigned per control section, and they must not have participated in the execution of that section.',
    '',
    'The executing party or their representative has prepared the control plan and will act as the lead controller for selecting controllers and verifying the control report.',
    '',
    'The goal is for the lead controller to perform on-site control to simplify the work.',
  ];

  orgParas.forEach((para) => {
    if (para === '') {
      page7Y += 3;
    } else {
      const lines = doc.splitTextToSize(para, contentWidth);
      doc.text(lines, margin, page7Y);
      page7Y += lines.length * 5 + 2;
    }
  });

  page7Y += 8;

  // 1.5 Controllers
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1.5 Controllers', margin, page7Y);
  page7Y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const controllerParas = [
    'Independent control is carried out by an actor who has not acted as the executing party on site.',
    '',
    'Control is handled by the same organization as the executing party.',
    '',
    'Controllers must have the right and necessary competencies for performing control, acquired through education and experience.',
  ];

  controllerParas.forEach((para) => {
    if (para === '') {
      page7Y += 3;
    } else {
      const lines = doc.splitTextToSize(para, contentWidth);
      doc.text(lines, margin, page7Y);
      page7Y += lines.length * 5 + 2;
    }
  });

  page7Y += 5;

  // Minimum requirements bullet list
  doc.setFont('helvetica', 'bold');
  doc.text('Minimum requirements for controllers:', margin, page7Y);
  page7Y += 6;

  doc.setFont('helvetica', 'normal');
  const requirements = [
    'Familiarity with best practices for executing construction parts and sections.',
    'Ability to create an overview and wonder.',
    'Knowledge of their own limitations and use of professional experts.',
    'Competencies at least equivalent to the person who performed the work.',
    'Professional qualifications and competencies for construction work.',
    'Ability to understand standards, control plans, and good craftsmanship.',
    'Capability of familiarizing oneself with documents forming the basis for execution.',
  ];

  requirements.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 5);
    doc.text(lines, margin + 5, page7Y);
    page7Y += lines.length * 5;
  });

  page7Y += 5;
  const cvText = "The inspector's qualifications and competencies should be documented in the control report, e.g., by their CV.";
  const cvLines = doc.splitTextToSize(cvText, contentWidth);
  doc.text(cvLines, margin, page7Y);
  page7Y += cvLines.length * 5 + 8;

  // 1.6 Use of assistance
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1.6 Use of assistance', margin, page7Y);
  page7Y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const assistanceParas = [
    'Assisting inspectors must have at least the competencies described in section 1.3.',
    '',
    'The ultimate responsibility for the inspection at all times rests with the inspector and is therefore not transferred to the assisting inspector.',
    '',
    'The inspector must follow up on inspections by assistants, ensure reasonable conduct, and sign the documentation.',
  ];

  assistanceParas.forEach((para) => {
    if (para === '') {
      page7Y += 3;
    } else {
      const lines = doc.splitTextToSize(para, contentWidth);
      doc.text(lines, margin, page7Y);
      page7Y += lines.length * 5 + 2;
    }
  });

  // Footer Page 7
  doc.setFontSize(8);
  doc.setTextColor(...footerText);
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10);
  safeRightText('Page 6', pageHeight - 10);

  console.log('✅ Page 7 completed');

  // Page 8: 1.7 Follow-up on deviations & 2. GENERAL CONTROLS
  // ---------------------------------------------------------
  doc.addPage();
  doc.setTextColor(0, 0, 0);
  console.log('📄 Creating Page 8 - Follow-up on deviations');

  let page8Y = 25;

  // 1.7 Follow-up on deviations
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1.7 Follow-up on deviations', margin, page8Y);
  page8Y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('If deviations are found during the inspection, the following procedure is applied:', margin, page8Y);
  page8Y += 8;

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
  ];

  deviationProcedure.forEach((item) => {
    const lines = doc.splitTextToSize(`○ ${item}`, contentWidth - 5);
    doc.text(lines, margin + 3, page8Y);
    page8Y += lines.length * 5;
  });

  page8Y += 5;
  const seriousErrorText =
    'If there are serious or multiple repeated errors at a control point, the inspection may be extended to a maximum inspection of the current control point and/or the structural designer may be involved in the assessment of the deviation.';
  const seriousLines = doc.splitTextToSize(seriousErrorText, contentWidth);
  doc.text(seriousLines, margin, page8Y);
  page8Y += seriousLines.length * 5 + 10;

  // 2. GENERAL CONTROLS
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. GENERAL CONTROLS', margin, page8Y);
  page8Y += 10;

  // 2.1 General
  doc.setFontSize(12);
  doc.text('2.1 General', margin, page8Y);
  page8Y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const generalControlText =
    'The general control is performed in accordance with DS 1140. In addition, the general control is carried out in accordance with the rules in DS/EN 1992-DS/EN 1999, including the associated national annexes and in accordance with the rules in the related execution standards, including the associated national application documents. The general control is carried out based on the division in DS 1140, annex B.';
  const generalLines = doc.splitTextToSize(generalControlText, contentWidth);
  doc.text(generalLines, margin, page8Y);
  page8Y += generalLines.length * 5 + 8;

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
  ];

  const table3Y = page8Y;
  const table3RowHeight = 8;
  const table3Width = contentWidth;

  // Table header
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, table3Y, table3Width, table3RowHeight, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Control item', margin + 5, table3Y + 6);

  // Table rows
  controlItems.forEach((item, index) => {
    const rowYPos = table3Y + table3RowHeight * (index + 1);
    doc.setDrawColor(0, 0, 0);
    doc.rect(margin, rowYPos, table3Width, table3RowHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(item, margin + 5, rowYPos + 6);
  });

  page8Y = table3Y + table3RowHeight * (controlItems.length + 1) + 8;

  // Text after table
  doc.setFontSize(10);
  doc.text('The independent control of whether the self-control has been performed is always carried out as a maximum control.', margin, page8Y);
  page8Y += 10;

  // Explanation for B.5.2 to B.5.4
  doc.setFont('helvetica', 'bold');
  doc.text('Explanation for B.5.2 to B.5.4:', margin, page8Y);
  page8Y += 6;

  doc.setFont('helvetica', 'normal');
  const explanationText =
    'When executing constructions that are critically important for the operation and integrity of the structure, it must control points be fully checked (maximum) for:';
  const explanationLines = doc.splitTextToSize(explanationText, contentWidth);
  doc.text(explanationLines, margin, page8Y);
  page8Y += explanationLines.length * 5 + 5;

  doc.text('○ Presence of construction components', margin + 5, page8Y);

  // Footer Page 8
  doc.setFontSize(8);
  doc.setTextColor(...footerText);
  doc.text(`Static Control Plan - Version ${data.gamma.currentVersion || 1}`, margin, pageHeight - 10);
  safeRightText('Page 7 of 21', pageHeight - 10);

  console.log('✅ Page 8 completed');
}

module.exports = {
  renderGeneralControls,
};

