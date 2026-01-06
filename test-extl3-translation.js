/**
 * Test script to verify extl3.js translation functionality
 * Run with: node test-extl3-translation.js
 */

const axios = require('axios');

// Test the translation API directly
async function testTranslationAPI() {
  console.log('\n🧪 Testing Translation API...\n');
  
  const testTexts = [
    "Static Control Report:",
    "Executing party:",
    "Page",
    "Construction part",
    "Project name/ID"
  ];
  
  try {
    console.log('📤 Sending texts to translate:', testTexts);
    console.log('🌐 Target language: DA (Danish)');
    
    const response = await axios.post("http://localhost:3000/translate", {
      texts: testTexts,
      target_lang: "DA",
      source_lang: "EN",
    });
    
    console.log('\n✅ Translation API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`\n✅ Successfully translated ${response.data.length} texts`);
      response.data.forEach((item, index) => {
        if (item && item.original && item.translated) {
          console.log(`  ${index + 1}. "${item.original}" → "${item.translated}"`);
        }
      });
    } else {
      console.log('\n❌ Invalid response format');
    }
  } catch (error) {
    console.error('\n❌ Translation API Error:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    } else if (error.request) {
      console.error('  No response received. Is the server running on localhost:3000?');
      console.error('  Error:', error.message);
    } else {
      console.error('  Error:', error.message);
    }
  }
}

// Test the generateStaticControlReport function
async function testGenerateFunction() {
  console.log('\n\n🧪 Testing generateStaticControlReport function...\n');
  
  try {
    // Import the function
    const { generateStaticControlReport } = require('./extl3');
    
    // Create a mock output stream
    const mockOutputStream = {
      write: (chunk) => {
        // Just count bytes, don't actually write
        if (!mockOutputStream.bytesWritten) {
          mockOutputStream.bytesWritten = 0;
        }
        mockOutputStream.bytesWritten += chunk.length;
      },
      end: () => {
        console.log(`✅ PDF generation completed. Total bytes: ${mockOutputStream.bytesWritten}`);
      }
    };
    
    // Mock dynamic data
    const mockDynamic = {
      company: {
        name: "Test Company",
        address: "123 Test St",
        cvr: "12345678"
      },
      project: {
        name: "Test Project"
      },
      projectName: "Test Project",
      constructionPart: "Test Construction Part",
      specialText: "Test Special Text"
    };
    
    console.log('📝 Calling generateStaticControlReport with targetLang="DA"...');
    console.log('📝 Mock data:', JSON.stringify(mockDynamic, null, 2));
    
    await generateStaticControlReport(mockDynamic, mockOutputStream, "DA");
    
    console.log('\n✅ Function executed successfully!');
    
  } catch (error) {
    console.error('\n❌ Function Error:');
    console.error('  Error:', error.message);
    console.error('  Stack:', error.stack);
  }
}

// Test the endpoint directly
async function testEndpoint() {
  console.log('\n\n🧪 Testing /generate-static-control-report endpoint...\n');
  
  const testUrl = 'http://localhost:3000/generate-static-control-report?subjectMatterId=KP06&projectId=6958a8ea472a42a492375284&companyId=6941e71313984ac714a3c08b&target_lang=DA';
  
  try {
    console.log('📤 Making GET request to:', testUrl);
    console.log('⏳ This may take a while...\n');
    
    const response = await axios.get(testUrl, {
      responseType: 'stream',
      timeout: 60000 // 60 second timeout
    });
    
    let dataLength = 0;
    response.data.on('data', (chunk) => {
      dataLength += chunk.length;
    });
    
    response.data.on('end', () => {
      console.log(`\n✅ Endpoint responded successfully!`);
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   PDF size: ${dataLength} bytes`);
      console.log(`\n✅ Translation test completed! Check the server logs for translation details.`);
    });
    
    response.data.on('error', (error) => {
      console.error('\n❌ Stream Error:', error.message);
    });
    
  } catch (error) {
    console.error('\n❌ Endpoint Error:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Headers:', error.response.headers);
      if (error.response.data) {
        let errorData = '';
        error.response.data.on('data', (chunk) => {
          errorData += chunk.toString();
        });
        error.response.data.on('end', () => {
          console.error('  Error Data:', errorData);
        });
      }
    } else if (error.request) {
      console.error('  No response received. Is the server running?');
      console.error('  Error:', error.message);
    } else {
      console.error('  Error:', error.message);
    }
  }
}

// Main test function
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  EXT3 Translation Test Suite');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Test 1: Translation API
  await testTranslationAPI();
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Generate function (commented out as it requires full setup)
  // await testGenerateFunction();
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Endpoint test
  console.log('\n⚠️  Note: Endpoint test requires valid database connection.');
  console.log('   Skipping endpoint test. Run manually if needed.\n');
  // await testEndpoint();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Tests completed!');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run tests
runTests().catch(console.error);

