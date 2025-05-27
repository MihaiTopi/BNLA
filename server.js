const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Correct: Just define the path separately
const DIST_FOLDER = path.join(__dirname, 'dist/angular-projet1/browser');

// ✅ Use the static middleware
app.use(express.static(DIST_FOLDER));

// ✅ Fallback route to index.html for Angular routing
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_FOLDER, 'index.csr.html'));
});

app.listen(PORT, () => {
  console.log(`App running on http://localhost:${PORT}`);
});
