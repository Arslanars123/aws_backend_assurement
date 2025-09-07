const jsPDF = require('jspdf');
require('jspdf-autotable');

class PDFGenerator {
    constructor() {
        this.doc = null;
        this.currentY = 20;
        this.pageHeight = 280; // A4 page height in mm
        this.margin = 20;
    }

    // Initialize new PDF document
    initDocument(title = 'Static Report') {
        this.doc = new jsPDF();
        this.currentY = 20;
        
        // Add title
        this.doc.setFontSize(18);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(title, this.margin, this.currentY);
        this.currentY += 15;
        
        // Add line separator
        this.doc.setLineWidth(0.5);
        this.doc.line(this.margin, this.currentY, 190, this.currentY);
        this.currentY += 10;
    }

    // Add section header
    addSectionHeader(text, fontSize = 14) {
        this.checkPageBreak(15);
        
        this.doc.setFontSize(fontSize);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(text, this.margin, this.currentY);
        this.currentY += 10;
    }

    // Add subsection header
    addSubsectionHeader(text, fontSize = 12) {
        this.checkPageBreak(10);
        
        this.doc.setFontSize(fontSize);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(text, this.margin + 5, this.currentY);
        this.currentY += 8;
    }

    // Add table with data
    addTable(headers, data, options = {}) {
        const tableHeight = this.calculateTableHeight(data.length);
        this.checkPageBreak(tableHeight);
        
        this.doc.autoTable({
            head: [headers],
            body: data,
            startY: this.currentY,
            margin: { left: this.margin, right: this.margin },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                overflow: 'linebreak',
                halign: 'left'
            },
            headStyles: {
                fillColor: [30, 58, 138], // Blue color
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Light gray
            },
            ...options
        });
        
        this.currentY = this.doc.lastAutoTable.finalY + 10;
    }

    // Add text content
    addText(text, fontSize = 10, style = 'normal') {
        this.checkPageBreak(10);
        
        this.doc.setFontSize(fontSize);
        this.doc.setFont('helvetica', style);
        
        const lines = this.doc.splitTextToSize(text, 170 - this.margin * 2);
        this.doc.text(lines, this.margin, this.currentY);
        this.currentY += lines.length * (fontSize * 0.35) + 5;
    }

    // Add image (if needed)
    addImage(imageData, x, y, width, height) {
        this.checkPageBreak(height + 10);
        
        try {
            this.doc.addImage(imageData, 'JPEG', x, y, width, height);
            this.currentY = y + height + 10;
        } catch (error) {
            console.error('Error adding image:', error);
            this.addText('Image could not be loaded', 8, 'italic');
        }
    }

    // Check if we need a new page
    checkPageBreak(requiredSpace) {
        if (this.currentY + requiredSpace > this.pageHeight) {
            this.doc.addPage();
            this.currentY = 20;
        }
    }

    // Calculate approximate table height
    calculateTableHeight(rowCount) {
        const headerHeight = 8;
        const rowHeight = 6;
        const padding = 10;
        return headerHeight + (rowCount * rowHeight) + padding;
    }

    // Format date
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Get status with color
    getStatusInfo(item) {
        if (item.approvedDate) {
            return { text: 'Approved', color: [34, 197, 94] }; // Green
        } else if (item.submittedDate) {
            return { text: 'Submitted', color: [59, 130, 246] }; // Blue
        } else {
            return { text: 'Pending', color: [239, 68, 68] }; // Red
        }
    }

    // Generate static document checklist PDF
    async generateStaticDocumentChecklistPDF(companyId, projectId, professionSubjectMatterId) {
        try {
            // Fetch data from API
            const response = await fetch(`http://localhost:3000/get-static-document-checklist-with-status?companyId=${companyId}&projectId=${projectId}&professionSubjectMatterId=${professionSubjectMatterId}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch data');
            }

            this.initDocument('Static Document Checklist Report');
            
            // Add project info
            this.addText(`Project ID: ${projectId}`, 10, 'bold');
            this.addText(`Company ID: ${companyId}`, 10, 'bold');
            this.addText(`Profession: ${professionSubjectMatterId}`, 10, 'bold');
            this.currentY += 10;

            const checklistItems = data.checklistItems || [];
            
            // Group items by section
            const sections = {
                'B1': checklistItems.filter(item => item.section === 'B1'),
                'B2': checklistItems.filter(item => item.section === 'B2'),
                'B3': checklistItems.filter(item => item.section === 'B3')
            };

            // Generate sections
            for (const [sectionName, items] of Object.entries(sections)) {
                if (items.length > 0) {
                    this.addSectionHeader(`Section ${sectionName} - ${this.getSectionTitle(sectionName)}`);
                    
                    const headers = ['Item', 'Description', 'Status', 'Submitted Date', 'Approved Date', 'Independent Controller'];
                    const tableData = items.map(item => {
                        const statusInfo = this.getStatusInfo(item);
                        return [
                            item.itemNumber || 'N/A',
                            item.description || 'N/A',
                            statusInfo.text,
                            this.formatDate(item.submittedDate),
                            this.formatDate(item.approvedDate),
                            item.independentControllerName || 'N/A'
                        ];
                    });
                    
                    this.addTable(headers, tableData);
                }
            }

            return this.doc.output('datauristring');
        } catch (error) {
            console.error('Error generating static document checklist PDF:', error);
            throw error;
        }
    }

    // Generate static report registration entries PDF
    async generateStaticReportRegistrationEntriesPDF(companyId, projectId, professionSubjectMatterId) {
        try {
            // Fetch data from API
            const response = await fetch(`http://localhost:3000/get-static-report-registration-entries?companyId=${companyId}&projectId=${projectId}&professionSubjectMatterId=${professionSubjectMatterId}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch data');
            }

            this.initDocument('Static Report Registration Entries');
            
            // Add project info
            this.addText(`Project ID: ${projectId}`, 10, 'bold');
            this.addText(`Company ID: ${companyId}`, 10, 'bold');
            this.addText(`Profession: ${professionSubjectMatterId}`, 10, 'bold');
            this.currentY += 10;

            const entries = data.entries || [];
            
            // Group entries by section
            const sections = {
                'B4': entries.filter(entry => entry.dsGroup === 'B4'),
                'B5': entries.filter(entry => entry.dsGroup === 'B5'),
                'B6': entries.filter(entry => entry.dsGroup === 'B6')
            };

            // Generate sections
            for (const [sectionName, sectionEntries] of Object.entries(sections)) {
                if (sectionEntries.length > 0) {
                    this.addSectionHeader(`Section ${sectionName} - ${this.getSectionTitle(sectionName)}`);
                    
                    const headers = ['Registration Date', 'Registration ID', 'Control Type', 'Subject', 'User', 'Media Files'];
                    const tableData = sectionEntries.map(entry => {
                        const userInfo = entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'No user assigned';
                        const mediaCount = this.getMediaCount(entry);
                        
                        return [
                            this.formatDate(entry.registrationDate),
                            entry.registrationId || 'N/A',
                            entry.controlType || 'N/A',
                            entry.subject || 'N/A',
                            userInfo,
                            mediaCount
                        ];
                    });
                    
                    this.addTable(headers, tableData);
                }
            }

            return this.doc.output('datauristring');
        } catch (error) {
            console.error('Error generating static report registration entries PDF:', error);
            throw error;
        }
    }

    // Generate complete static report PDF
    async generateCompleteStaticReportPDF(companyId, projectId, professionSubjectMatterId) {
        try {
            this.initDocument('Complete Static Report');
            
            // Add project info
            this.addText(`Project ID: ${projectId}`, 10, 'bold');
            this.addText(`Company ID: ${companyId}`, 10, 'bold');
            this.addText(`Profession: ${professionSubjectMatterId}`, 10, 'bold');
            this.addText(`Generated on: ${new Date().toLocaleDateString()}`, 10, 'bold');
            this.currentY += 15;

            // Table of Contents
            this.addSectionHeader('Table of Contents');
            const tocItems = [
                '1. Construction Execution Classes',
                '2. Control Points Selected',
                '3. Document Completion Status',
                '4. Construction Execution Classes (Detailed)',
                '5. Control Points Selected (Detailed)',
                '6. Document Completion Status (Detailed)',
                '7. Static Document Checklist',
                '8. Static Report Registration Entries'
            ];
            
            tocItems.forEach((item, index) => {
                this.addText(`${item} ......................... ${index + 1}`, 10);
            });
            
            this.currentY += 20;

            // Generate Static Document Checklist section
            this.addSectionHeader('7. Static Document Checklist');
            await this.generateStaticDocumentChecklistContent(companyId, projectId, professionSubjectMatterId);
            
            // Generate Static Report Registration Entries section
            this.addSectionHeader('8. Static Report Registration Entries');
            await this.generateStaticReportRegistrationEntriesContent(companyId, projectId, professionSubjectMatterId);

            return this.doc.output('datauristring');
        } catch (error) {
            console.error('Error generating complete static report PDF:', error);
            throw error;
        }
    }

    // Helper methods
    getSectionTitle(section) {
        const titles = {
            'B1': 'Foundation and Structure',
            'B2': 'Building Services',
            'B3': 'Finishing Works',
            'B4': 'Registration Entries',
            'B5': 'Control Entries',
            'B6': 'Documentation Entries'
        };
        return titles[section] || section;
    }

    getMediaCount(entry) {
        let count = 0;
        if (entry.annotatedPdfImages) count += entry.annotatedPdfImages.length;
        if (entry.mainPictures) count += entry.mainPictures.length;
        if (entry.markPictures) count += entry.markPictures.length;
        return count > 0 ? `${count} files` : 'No files';
    }

    // Content generation methods for complete report
    async generateStaticDocumentChecklistContent(companyId, projectId, professionSubjectMatterId) {
        try {
            const response = await fetch(`http://localhost:3000/get-static-document-checklist-with-status?companyId=${companyId}&projectId=${projectId}&professionSubjectMatterId=${professionSubjectMatterId}`);
            const data = await response.json();
            
            if (data.success && data.checklistItems) {
                const checklistItems = data.checklistItems;
                
                const sections = {
                    'B1': checklistItems.filter(item => item.section === 'B1'),
                    'B2': checklistItems.filter(item => item.section === 'B2'),
                    'B3': checklistItems.filter(item => item.section === 'B3')
                };

                for (const [sectionName, items] of Object.entries(sections)) {
                    if (items.length > 0) {
                        this.addSubsectionHeader(`7.${sectionName} ${this.getSectionTitle(sectionName)}`);
                        
                        const headers = ['Item', 'Description', 'Status', 'Submitted Date', 'Approved Date'];
                        const tableData = items.map(item => {
                            const statusInfo = this.getStatusInfo(item);
                            return [
                                item.itemNumber || 'N/A',
                                item.description || 'N/A',
                                statusInfo.text,
                                this.formatDate(item.submittedDate),
                                this.formatDate(item.approvedDate)
                            ];
                        });
                        
                        this.addTable(headers, tableData);
                    }
                }
            }
        } catch (error) {
            console.error('Error generating static document checklist content:', error);
            this.addText('Error loading static document checklist data', 10, 'italic');
        }
    }

    async generateStaticReportRegistrationEntriesContent(companyId, projectId, professionSubjectMatterId) {
        try {
            const response = await fetch(`http://localhost:3000/get-static-report-registration-entries?companyId=${companyId}&projectId=${projectId}&professionSubjectMatterId=${professionSubjectMatterId}`);
            const data = await response.json();
            
            if (data.success && data.entries) {
                const entries = data.entries;
                
                const sections = {
                    'B4': entries.filter(entry => entry.dsGroup === 'B4'),
                    'B5': entries.filter(entry => entry.dsGroup === 'B5'),
                    'B6': entries.filter(entry => entry.dsGroup === 'B6')
                };

                for (const [sectionName, sectionEntries] of Object.entries(sections)) {
                    if (sectionEntries.length > 0) {
                        this.addSubsectionHeader(`8.${sectionName} ${this.getSectionTitle(sectionName)}`);
                        
                        const headers = ['Registration Date', 'Registration ID', 'Control Type', 'Subject', 'User'];
                        const tableData = sectionEntries.map(entry => {
                            const userInfo = entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'No user assigned';
                            
                            return [
                                this.formatDate(entry.registrationDate),
                                entry.registrationId || 'N/A',
                                entry.controlType || 'N/A',
                                entry.subject || 'N/A',
                                userInfo
                            ];
                        });
                        
                        this.addTable(headers, tableData);
                    }
                }
            }
        } catch (error) {
            console.error('Error generating static report registration entries content:', error);
            this.addText('Error loading static report registration entries data', 10, 'italic');
        }
    }
}

module.exports = PDFGenerator;


