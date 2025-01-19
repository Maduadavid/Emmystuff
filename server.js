const express = require('express');
const fileUpload = require('express-fileupload');
const unzipper = require('unzipper');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable file upload
app.use(fileUpload());

// Serve static files
app.use(express.static('public'));

// Route: Home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route: Upload ZIP file
app.post('/upload', async (req, res) => {
  if (!req.files || !req.files.zipFile) {
    return res.status(400).send('No ZIP file uploaded.');
  }

  const zipFile = req.files.zipFile;
  const uploadPath = path.join(__dirname, 'uploads', zipFile.name);

  // Save the ZIP file
  zipFile.mv(uploadPath, async (err) => {
    if (err) return res.status(500).send(err);

    // Extract the ZIP file
    const extractPath = path.join(__dirname, 'deployed');
    fs.mkdirSync(extractPath, { recursive: true });
    fs.createReadStream(uploadPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .on('close', () => {
        res.send('ZIP file uploaded and extracted successfully.');
      })
      .on('error', (error) => {
        res.status(500).send('Error extracting ZIP file.');
      });
  });
});

// Route: Clone GitHub Repo
app.post('/clone', (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) return res.status(400).send('No repository URL provided.');

  const clonePath = path.join(__dirname, 'deployed');
  fs.mkdirSync(clonePath, { recursive: true });

  // Clone the repo
  exec(`git clone ${repoUrl} ${clonePath}`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send(`Error cloning repo: ${stderr}`);
    }
    res.send(`Repository cloned successfully.\n${stdout}`);
  });
});

// Route: Deploy Bot (runs npm install and npm start)
app.post('/deploy', (req, res) => {
  const deployPath = path.join(__dirname, 'deployed');

  if (!fs.existsSync(deployPath)) {
    return res.status(400).send('No bot code found. Upload or clone a bot first.');
  }

  // Install dependencies and start the bot
  exec(
    `cd ${deployPath} && npm install && npm start`,
    (error, stdout, stderr) => {
      if (error) {
        return res.status(500).send(`Error deploying bot: ${stderr}`);
      }
      res.send(`Bot deployed successfully.\n${stdout}`);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});