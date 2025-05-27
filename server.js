const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ Correct: Just define the path separately
const DIST_FOLDER = path.join(__dirname, 'dist/angular-projet1/browser');

// ✅ Use the static middleware
app.use(express.static(DIST_FOLDER));

// ✅ Fallback route to index.html for Angular routing
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_FOLDER, 'index.csr.html'));
});

const interfaces = os.networkInterfaces();
let localIp = 'localhost'; // fallback

// Find the first IPv4 non-internal IP (typical local network IP)
for (const iface of Object.values(interfaces)) {
  for (const config of iface) {
    if (config.family === 'IPv4' && !config.internal) {
      localIp = config.address;
      break;
    }
  }
}

app.listen(PORT, () => {
  console.log(`App running on:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  http://${localIp}:${PORT} (local network IP)`);
});
