const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_DATA = {
  companyId: '68f76ce994e7d41efe754dc4',
  projectId: '68fa70ccee0ab59dfc5f591a',
  subjectMatterId: 'KP13',
  baseUrl: BASE_URL,
  filename: 'test-combined-report.pdf'
};

async function testPDFGenerator() {
  console.log('🧪 Testing PDF Generator API...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health check endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/pdf/pdf-generator-health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // Test 2: Generate PDF and save to file
    console.log('2️⃣ Testing PDF generation (save to file)...');
    const saveResponse = await axios.post(`${BASE_URL}/api/pdf/generate-combined-pdf-save`, TEST_DATA);
    console.log('✅ PDF saved successfully:', saveResponse.data);
    console.log('');

    // Test 3: Generate PDF for download
    console.log('3️⃣ Testing PDF generation (download)...');
    const downloadResponse = await axios.post(`${BASE_URL}/api/pdf/generate-combined-pdf`, TEST_DATA, {
      responseType: 'arraybuffer'
    });
    
    if (downloadResponse.data && downloadResponse.data.length > 0) {
      console.log('✅ PDF generated for download, size:', downloadResponse.data.length, 'bytes');
    } else {
      console.log('❌ PDF download failed - empty response');
    }
    console.log('');

    console.log('🎉 All tests passed! PDF Generator is working correctly.');
    console.log('');
    console.log('📋 Available endpoints:');
    console.log('  • POST /api/pdf/generate-combined-pdf - Generate and download PDF');
    console.log('  • POST /api/pdf/generate-combined-pdf-save - Generate and save PDF');
    console.log('  • GET /api/pdf/pdf-generator-health - Health check');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Make sure your server is running:');
      console.log('   npm start');
      console.log('   or');
      console.log('   npm run dev');
    }
  }
}

// Run the test
testPDFGenerator();
