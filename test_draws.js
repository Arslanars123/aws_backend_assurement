const fetch = require('node-fetch');

async function testGetDraws() {
  try {
    const response = await fetch('http://localhost:3000/get-draws?companyId=68f76ce994e7d41efe754dc4&projectId=68fa70ccee0ab59dfc5f591a');
    const data = await response.json();
    console.log('API Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\nNumber of drawings:', data.length);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGetDraws();

