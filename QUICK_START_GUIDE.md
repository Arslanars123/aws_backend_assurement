# 🚀 PDF Generator - Quick Start Guide

## What's Been Created

✅ **PDF Generator API** (`pdf-generator.js`) - Combines your two HTML templates into a single PDF
✅ **Integration** - Added to your main Express app at `/api/pdf/` endpoints  
✅ **Documentation** - Complete usage guide in `PDF_GENERATOR_DOCUMENTATION.md`
✅ **Test Script** - Ready-to-run test in `test-pdf-generator.js`

## 🎯 Your Two HTML Templates

1. **`final_static/second_page.html`** - Quality Assurance Report (Page 1)
2. **`final_static/signatures_page.html`** - Static Inspection Report (Page 2)

## 🚀 How to Use Right Now

### 1. Start Your Server
```bash
cd backend/aws_backend_assurement
npm start
# or
npm run dev
```

### 2. Test the API
```bash
# Run the test script
node test-pdf-generator.js
```

### 3. Generate PDF via API

**Option A: Download PDF directly**
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

**Option B: Save PDF to server**
```bash
curl -X POST http://localhost:3000/api/pdf/generate-combined-pdf-save \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "68f76ce994e7d41efe754dc4",
    "projectId": "68fa70ccee0ab59dfc5f591a",
    "filename": "quality-report.pdf"
  }'
```

## 🎨 Frontend Integration

Add this to your frontend to generate PDFs:

```javascript
async function generateQualityReport() {
  try {
    const response = await fetch('/api/pdf/generate-combined-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      a.click();
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}
```

## 📋 Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pdf/generate-combined-pdf` | POST | Generate PDF and download |
| `/api/pdf/generate-combined-pdf-save` | POST | Generate PDF and save to server |
| `/api/pdf/pdf-generator-health` | GET | Health check |

## 🔧 How It Works

1. **Loads** both HTML templates from `final_static/` directory
2. **Combines** them with proper page breaks
3. **Renders** using Puppeteer to create a single PDF
4. **Returns** the PDF as download or saves to server

## 🎯 Key Features

- ✅ **Automatic page breaks** between templates
- ✅ **Dynamic data injection** (company ID, project ID, etc.)
- ✅ **A4 format** with proper margins
- ✅ **Background printing** (includes CSS backgrounds)
- ✅ **Error handling** and validation
- ✅ **Health monitoring**

## 🐛 Troubleshooting

**Server won't start?**
- Check if Puppeteer is installed: `npm list puppeteer`
- Install if missing: `npm install puppeteer`

**PDF generation fails?**
- Check server logs for error messages
- Verify HTML templates exist in `final_static/` directory
- Test health endpoint: `GET /api/pdf/pdf-generator-health`

**Templates not loading?**
- Ensure `second_page.html` and `signatures_page.html` exist
- Check file permissions

## 🎉 You're Ready!

Your PDF generator is now fully integrated and ready to use. The API will:

1. Load your Quality Assurance Report (second_page.html)
2. Load your Static Inspection Report (signatures_page.html)  
3. Combine them into a single PDF with proper page breaks
4. Return or save the combined PDF

**Next Steps:**
- Test with the provided test script
- Integrate into your frontend application
- Customize the templates as needed
- Deploy to production when ready

---

**Need help?** Check the full documentation in `PDF_GENERATOR_DOCUMENTATION.md`
