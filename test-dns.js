const dns = require('dns');
const { promisify } = require('util');

const resolve4 = promisify(dns.resolve4);
const resolveTxt = promisify(dns.resolveTxt);

async function testDNS() {
  const hostname = 'cluster0.nfgli.mongodb.net';
  
  console.log(`Testing DNS resolution for: ${hostname}`);
  console.log('=====================================');
  
  try {
    // Test A record resolution
    console.log('Testing A record resolution...');
    const addresses = await resolve4(hostname);
    console.log('✅ A records found:', addresses);
    
    // Test TXT record resolution
    console.log('\nTesting TXT record resolution...');
    const txtRecords = await resolveTxt(hostname);
    console.log('✅ TXT records found:', txtRecords);
    
    console.log('\n✅ DNS resolution successful!');
    return true;
  } catch (error) {
    console.error('❌ DNS resolution failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check your internet connection');
    console.log('2. Try using a different DNS server (8.8.8.8 or 1.1.1.1)');
    console.log('3. Check if the MongoDB cluster is accessible');
    console.log('4. Try using a VPN if you\'re behind a firewall');
    return false;
  }
}

// Test with different DNS servers
async function testWithCustomDNS() {
  console.log('\nTesting with custom DNS servers...');
  console.log('=====================================');
  
  const dnsServers = ['8.8.8.8', '1.1.1.1', '8.8.4.4'];
  
  for (const dnsServer of dnsServers) {
    try {
      console.log(`\nTesting with DNS server: ${dnsServer}`);
      dns.setServers([dnsServer]);
      
      const success = await testDNS();
      if (success) {
        console.log(`✅ DNS server ${dnsServer} works!`);
        return dnsServer;
      }
    } catch (error) {
      console.error(`❌ DNS server ${dnsServer} failed:`, error.message);
    }
  }
  
  return null;
}

// Run the tests
async function runTests() {
  console.log('MongoDB DNS Resolution Test');
  console.log('===========================\n');
  
  // Test with default DNS
  const defaultSuccess = await testDNS();
  
  if (!defaultSuccess) {
    // Test with custom DNS servers
    const workingDNS = await testWithCustomDNS();
    if (workingDNS) {
      console.log(`\n💡 Recommendation: Use DNS server ${workingDNS} in your MongoDB connection string`);
    }
  }
}

runTests().catch(console.error); 