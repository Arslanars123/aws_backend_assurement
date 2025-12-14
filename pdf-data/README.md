# RP1 PDF Data

This directory contains extracted data from `rp1.pdf`.

## Files

- `rp1-extracted-data.json` - Extracted text, positions, and styling information from the PDF

## Usage

### Extract PDF Data

**Via API:**
```bash
POST /extract-rp1-pdf
Body: { "force": false }  # Set force: true to re-extract
```

**Via Script:**
```bash
node scripts/extract-rp1-pdf.js
```

### Generate PDF

**Via API:**
```bash
POST /generate-rp1-pdf
Body: {
  "dynamicData": {
    "field_0": "Value 1",
    "field_1": "Value 2"
  },
  "filename": "output.pdf"
}
```

### Download PDF

**Via API:**
```bash
GET /download-pdf/rp1.pdf
```

## Data Structure

The extracted JSON contains:
- `metadata`: PDF metadata (pages, dimensions, etc.)
- `staticText`: Array of static text entries with positions and styling
- `dynamicText`: Array of dynamic (red) text entries with placeholders
- `layout`: Layout information (margins, fonts, etc.)

## Notes

- Red text in the original PDF is marked as dynamic
- Text positions are approximate and may need manual adjustment
- You can manually edit the JSON file to refine text positions and identify dynamic fields

