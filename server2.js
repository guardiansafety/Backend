const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const mongoose = require('mongoose');
const { User } = require('./database');
require('dotenv').config();

const app = express();
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const uri = process.env.MONGODB_URI;

// Function to run the Python script and capture its output
function runPythonScript(photoPath, callback) {
  const command = `python process_photo.py "${photoPath}"`;
  console.log(`Executing command: ${command}`);  // Log the command being executed
  exec(command, (error, stdout, stderr) => {
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    if (error) {
      console.error(`exec error: ${error}`);
      return callback(error);
    }
    try {
      const scores = JSON.parse(stdout);  // Parse the JSON output from the Python script
      callback(null, scores);
    } catch (parseError) {
      callback(parseError);
    }
  });
}

app.post('/upload-photo/:username/:emergencyId', upload.single('photo'), async (req, res) => {
  try {
    const { username, emergencyId } = req.params;
    const photoPath = req.file.path;

    // Log paths
    console.log(`Photo path: ${photoPath}`);

    // Check if photo exists
    if (!fs.existsSync(photoPath)) {
      console.error(`Photo file does not exist: ${photoPath}`);
      return res.status(400).send('Photo file does not exist');
    }

    // Run the Python script to process the photo and generate scores
    runPythonScript(photoPath, async (error, scores) => {
      if (error) {
        return res.status(500).send('Error processing photo');
      }

      // Update the emergency_data for the specific emergency event with the generated scores
      const user = await User.findOneAndUpdate(
        { username, 'emergency_data._id': mongoose.Types.ObjectId(emergencyId) },
        { $set: { 'emergency_data.$.emotions': scores } },
        { new: true }
      );

      if (!user) {
        return res.status(404).send('User or emergency event not found');
      }

      // Clean up the uploaded photo
      fs.unlinkSync(photoPath);

      res.status(200).json({ message: 'Photo processed and scores updated successfully', scores });
    });
  } catch (error) {
    console.error('Error processing photo:', error);
    res.status(500).send('Error processing photo');
  }
});

const port = 3007;
app.listen(port, () => {
  console.log(`Hume AI Server started on port ${port}`);
});
