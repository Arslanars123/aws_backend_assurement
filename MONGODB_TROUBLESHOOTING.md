# MongoDB Connection Troubleshooting Guide

## Issue: DNS Timeout Error
```
Error connecting to MongoDB: Error: queryTxt ETIMEOUT cluster0.nfgli.mongodb.net
```

## Solutions

### 1. Test DNS Resolution
Run the DNS test script to diagnose the issue:
```bash
node test-dns.js
```

### 2. Use Environment Variables
Copy the example environment file and configure your MongoDB connection:
```bash
cp env.example .env
```

Edit `.env` file with your actual MongoDB credentials:
```env
MONGODB_BASE_URI=mongodb+srv://your_username:your_password@cluster0.nfgli.mongodb.net/construction_db?retryWrites=true&w=majority&appName=Cluster0
```

### 3. Network Solutions

#### Option A: Use Different DNS Servers
The application now tries multiple DNS servers automatically. If you want to manually specify:
- Google DNS: 8.8.8.8, 8.8.4.4
- Cloudflare DNS: 1.1.1.1, 1.0.0.1

#### Option B: Check Firewall/Proxy
- Ensure port 27017 is not blocked
- Check if you're behind a corporate firewall
- Try using a VPN if necessary

#### Option C: Use Local MongoDB
If cloud MongoDB is not accessible, the application will automatically fallback to local MongoDB:
```bash
# Install MongoDB locally
# macOS: brew install mongodb-community
# Ubuntu: sudo apt install mongodb
# Windows: Download from mongodb.com

# Start MongoDB service
# macOS: brew services start mongodb-community
# Ubuntu: sudo systemctl start mongodb
# Windows: Start MongoDB service
```

### 4. Connection String Issues

#### Check Credentials
- Verify username and password are correct
- Ensure the user has proper permissions
- Check if the cluster is active

#### Connection String Format
```javascript
// Correct format
mongodb+srv://username:password@cluster0.nfgli.mongodb.net/database_name?retryWrites=true&w=majority&appName=Cluster0

// Common issues:
// - Special characters in password need URL encoding
// - Missing database name
// - Incorrect cluster name
```

### 5. MongoDB Atlas Specific Issues

#### Network Access
- Check if your IP is whitelisted in MongoDB Atlas
- Add `0.0.0.0/0` to allow all IPs (not recommended for production)

#### Cluster Status
- Ensure the cluster is active and not paused
- Check if you're within the free tier limits

### 6. Application-Level Solutions

The updated code includes:
- Automatic retry logic with exponential backoff
- Fallback to local MongoDB
- Better error handling and logging
- Increased connection timeouts

### 7. Quick Fixes

#### Immediate Solutions:
1. **Restart the application**: `npm start`
2. **Check internet connection**: `ping google.com`
3. **Test DNS**: `nslookup cluster0.nfgli.mongodb.net`
4. **Use local MongoDB**: Comment out cloud URI, uncomment local URI

#### If using local MongoDB:
```javascript
// In index.js, change this line:
const uri = "mongodb://localhost:27017/construction_db";
```

### 8. Production Considerations

For production environments:
- Use environment variables for sensitive data
- Implement proper connection pooling
- Set up monitoring and alerting
- Use MongoDB Atlas with proper security settings
- Consider using MongoDB connection string with replica sets

### 9. Debug Information

The application now provides detailed logging:
- Connection attempts and retries
- DNS resolution status
- Fallback attempts
- Error details

### 10. Still Having Issues?

1. Check MongoDB Atlas dashboard for cluster status
2. Verify network connectivity
3. Test with MongoDB Compass or similar tool
4. Check application logs for detailed error messages
5. Consider using a different MongoDB provider

## Quick Start Commands

```bash
# Test DNS resolution
node test-dns.js

# Start with environment variables
cp env.example .env
# Edit .env with your credentials
npm start

# Start with local MongoDB fallback
npm start
```

The application will automatically try cloud MongoDB first, then fallback to local MongoDB if needed. 