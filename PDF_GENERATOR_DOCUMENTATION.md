# PDF Generator API Documentation

This API combines two HTML templates into a single PDF using Puppeteer. It loads your Quality Assurance Report (second_page.html) and Static Inspection Report (signatures_page.html) and combines them into one PDF document.

## 🚀 Quick Start

The PDF generator is now integrated into your Express app and available at `/api/pdf/` endpoints.

## 📋 Available Endpoints

### 1. Generate PDF (Download)
**POST** `/api/pdf/generate-combined-pdf`

Generates a combined PDF and returns it as a downloadable file.

**Request Body:**
```json
{
  "companyId": "68f76ce994e7d41efe754dc4",
  "projectId": "68fa70ccee0ab59dfc5f591a",
  "subjectMatterId": "KP13",
  "baseUrl": "http://localhost:3000",
  "filename": "combined-quality-report.pdf"
}
```

**Response:** PDF file download

### 2. Generate PDF (Save to File)
**POST** `/api/pdf/generate-combined-pdf-save`

Generates a combined PDF and saves it to the server's uploads directory.

**Request Body:**
```json
{
  "companyId": "68f76ce994e7d41efe754dc4",
  "projectId": "68fa70ccee0ab59dfc5f591a",
  "subjectMatterId": "KP13",
  "baseUrl": "http://localhost:3000",
  "filename": "combined-quality-report.pdf",
  "savePath": "./uploads"
}
```

**Response:**
```json
{
  "success": true,
  "message": "PDF generated and saved successfully",
  "filePath": "/path/to/uploads/combined-quality-report.pdf",
  "filename": "combined-quality-report.pdf",
  "size": 1234567
}
```

### 3. Health Check
**GET** `/api/pdf/pdf-generator-health`

Check if the PDF generator service is running.

**Response:**
```json
{
  "success": true,
  "message": "PDF Generator service is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔧 Usage Examples

### Example 1: Generate PDF with cURL
```bash
curl -X POST http://localhost:3000/api/pdf/generate-combined-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "68f76ce994e7d41efe754dc4",
    "projectId": "68fa70ccee0ab59dfc5f591a",
    "filename": "my-quality-report.pdf"
  }' \
  --output combined-report.pdf
```

### Example 2: Generate PDF with JavaScript (Frontend)
```javascript
async function generatePDF() {
  try {
    const response = await fetch('/api/pdf/generate-combined-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId: '68f76ce994e7d41efe754dc4',
        projectId: '68fa70ccee0ab59dfc5f591a',
        filename: 'quality-report.pdf'
      })
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'quality-report.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      console.error('Failed to generate PDF');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Example 3: Generate PDF with Node.js (Backend)
```javascript
const axios = require('axios');
const fs = require('fs');

async function generatePDF() {
  try {
    const response = await axios.post('http://localhost:3000/api/pdf/generate-combined-pdf-save', {
      companyId: '68f76ce994e7d41efe754dc4',
      projectId: '68fa70ccee0ab59dfc5f591a',
      filename: 'quality-report.pdf'
    }, {
      responseType: 'json'
    });

    console.log('PDF generated successfully:', response.data);
    console.log('File saved to:', response.data.filePath);
  } catch (error) {
    console.error('Error generating PDF:', error.response?.data || error.message);
  }
}
```

## 📁 File Structure

```
backend/aws_backend_assurement/
├── pdf-generator.js          # Main PDF generator module
├── final_static/
│   ├── second_page.html     # Quality Assurance Report (Page 1)
│   └── signatures_page.html # Static Inspection Report (Page 2)
└── uploads/                  # Where PDFs are saved (if using save endpoint)
```

## 🎯 How It Works

1. **Template Loading**: The API loads both HTML templates from the `final_static` directory
2. **Dynamic Data**: Replaces placeholders with actual data (company ID, project ID, etc.)
3. **HTML Combination**: Combines both templates with proper page breaks
4. **PDF Rendering**: Uses Puppeteer to render the combined HTML to PDF
5. **Output**: Returns the PDF as a download or saves it to the server

## 🔍 Template Processing

The API processes your HTML templates by:

- Extracting body content from both HTML files
- Combining CSS styles and scripts
- Adding page break CSS for proper PDF pagination
- Replacing dynamic placeholders with actual data
- Ensuring proper A4 page formatting

## ⚙️ Configuration Options

### PDF Generation Options
- **Format**: A4 (default)
- **Margins**: 10mm on all sides
- **Background**: Printed (includes CSS backgrounds)
- **Page Breaks**: Automatic between templates

### Puppeteer Options
- **Headless**: true (runs without GUI)
- **Sandbox**: Disabled for server environments
- **Timeout**: 30 seconds for page loading
- **Wait Strategy**: Network idle (waits for all requests to complete)

## 🐛 Troubleshooting

### Common Issues

1. **Template Not Found**
   - Ensure `second_page.html` and `signatures_page.html` exist in `final_static/` directory
   - Check file permissions

2. **Puppeteer Launch Errors**
   - Install required dependencies: `npm install puppeteer`
   - For Linux servers, install additional packages:
     ```bash
     sudo apt-get update
     sudo apt-get install -y wget gnupg
     sudo apt-get install -y libxss1 libgconf-2-4 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libcairo-gobject2 libgtk-3-0 libgdk-pixbuf2.0-0
     ```

3. **Dynamic Content Not Loading**
   - Ensure your `baseUrl` is correct and accessible
   - Check that API endpoints return valid data
   - Verify network connectivity from server

4. **PDF Generation Timeout**
   - Increase timeout in `renderHTMLToPDF` function
   - Check for slow-loading external resources
   - Ensure database connections are fast

### Debug Mode

To enable debug logging, modify the PDF generator to include more console.log statements:

```javascript
// Add this to pdf-generator.js for debugging
console.log('Combined HTML length:', combinedHTML.length);
console.log('PDF buffer size:', pdfBuffer.length);
```

## 🔒 Security Considerations

- Validate input parameters before processing
- Sanitize dynamic data to prevent XSS
- Limit file size and processing time
- Use proper authentication for production endpoints
- Consider rate limiting for PDF generation endpoints

## 📈 Performance Tips

1. **Caching**: Cache generated PDFs for identical requests
2. **Resource Optimization**: Optimize images and CSS in HTML templates
3. **Concurrent Processing**: Limit concurrent PDF generations
4. **Memory Management**: Close browser instances properly

## 🚀 Production Deployment

For production deployment:

1. **Environment Variables**: Set proper `BASE_URL` and database connections
2. **Error Handling**: Implement comprehensive error handling
3. **Logging**: Add proper logging for monitoring
4. **Monitoring**: Monitor PDF generation success rates and performance
5. **Backup**: Ensure HTML templates are backed up

## 📞 Support

If you encounter issues:

1. Check the health endpoint: `GET /api/pdf/pdf-generator-health`
2. Review server logs for error messages
3. Verify HTML template syntax and file paths
4. Test with minimal data first

---

**Note**: This API requires Puppeteer to be installed. If you're deploying to a server, ensure all Puppeteer dependencies are available.
