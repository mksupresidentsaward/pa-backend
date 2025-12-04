/**
 * Quick test to see if the server can start
 * Run: node test-server.js
 */

require('dotenv').config();
const express = require('express');
const http = require('http');

console.log('Testing server startup...');
console.log('PORT:', process.env.PORT || 4000);

const app = express();
const server = http.createServer(app);

app.get('/', (req, res) => {
  res.send("Test server is running!");
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use!`);
      console.error('Try: netstat -ano | findstr :4000 (Windows)');
      console.error('Or: lsof -i :4000 (Mac/Linux)');
    }
    process.exit(1);
  }
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`🌐 Test: http://localhost:${PORT}`);
  console.log('\nIf this works, the issue is with route loading or database connection.');
  console.log('Press Ctrl+C to stop.');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});






