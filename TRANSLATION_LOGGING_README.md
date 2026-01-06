# Extl3 Translation Logging System

## Overview
Translation logs are now written to a file instead of cluttering the console. This makes it easy to track translation activity without scrolling through thousands of console lines.

## Log File Location
- **File:** `extl3-translation.log` (in the same directory as `extl3.js`)
- **Format:** One log entry per line with timestamp

## Viewing Translation Logs

### Option 1: Web Interface (Recommended)
Open in your browser:
```
http://localhost:3000/translation-status?format=html
```

This shows:
- Recent translation logs (last 50 entries)
- Color-coded entries (green=success, red=error, yellow=warning)
- Auto-refreshes every 5 seconds
- Easy to read format

### Option 2: JSON API
Get logs as JSON:
```
http://localhost:3000/translation-status
```

Returns:
```json
{
  "success": true,
  "logFile": "/path/to/extl3-translation.log",
  "recentLogs": [...],
  "fullLogs": [...],
  "totalLogs": 100
}
```

### Option 3: Read Log File Directly
```bash
tail -f extl3-translation.log
# or
cat extl3-translation.log
```

## Log Entry Format
Each log entry contains:
- **Timestamp:** ISO format (e.g., `2024-01-15T10:30:45.123Z`)
- **Message:** Action type (e.g., `ENDPOINT_CALLED`, `TRANSLATE_SUCCESS`)
- **Data:** Optional JSON object with details

Example:
```
[2024-01-15T10:30:45.123Z] ENDPOINT_CALLED {"endpoint":"/generate-static-control-report","targetLang":"DA"}
```

## Log Message Types

### Endpoint Logs
- `ENDPOINT_CALLED` - When endpoint is accessed
- `PARAMS_RECEIVED` - Parameters received from request
- `CALLING_GENERATE_FUNCTION` - About to generate PDF
- `GENERATE_FUNCTION_COMPLETED` - PDF generation finished

### Translation Logs
- `TRANSLATION_REQUESTED` - Translation requested for a language
- `TEXTS_COLLECTED` - Texts collected for translation
- `TRANSLATE_START` - Starting translation API call
- `TRANSLATE_SUCCESS` - Translation completed successfully
- `TRANSLATE_ERROR` - Translation failed
- `TRANSLATE_SKIPPED` - Translation skipped (no targetLang)
- `TRANSLATION_COMPLETED` - Translation map created
- `NO_TRANSLATION` - No translation needed

## Testing Translation

1. **Generate a PDF with translation:**
   ```
   http://localhost:3000/generate-static-control-report?subjectMatterId=KP06&projectId=6958a8ea472a42a492375284&companyId=6941e71313984ac714a3c08b&target_lang=DA
   ```

2. **Check the logs:**
   ```
   http://localhost:3000/translation-status?format=html
   ```

3. **Look for:**
   - `ENDPOINT_CALLED` with `targetLang: "DA"`
   - `TRANSLATION_REQUESTED`
   - `TRANSLATE_SUCCESS` with sample translations
   - `TRANSLATION_COMPLETED` showing how many texts were translated

## Troubleshooting

### No logs appearing?
- Make sure the server has write permissions to create `extl3-translation.log`
- Check that the endpoint is being called (look for `ENDPOINT_CALLED`)

### Translation not working?
- Check for `TRANSLATE_ERROR` entries
- Verify translation API is running on `http://localhost:3000/translate`
- Look for `TRANSLATE_SUCCESS` to see if API responded

### Logs too verbose?
- The log file automatically keeps only the last 100 entries in memory
- Old entries remain in the file but aren't shown in the web interface
- You can clear the log file if needed: `> extl3-translation.log`

## Benefits
✅ No console clutter - all translation logs in one place  
✅ Easy to view - web interface with auto-refresh  
✅ Persistent - logs saved to file  
✅ Searchable - can grep the log file  
✅ Color-coded - easy to spot errors vs successes

