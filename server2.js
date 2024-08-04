const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const { User } = require('./database');
require('dotenv').config();

const app = express();
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Function to run the Python script and capture its output
function runPythonScript(photoPath) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', ['process_photo.py', photoPath]);
    let pythonOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      pythonOutput += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python script exited with code ${code}`));
      }
      try {
        const scores = JSON.parse(pythonOutput);
        resolve(scores);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}


app.post('/upload-photo/:username/:emergencyId', upload.single('photo'), async (req, res) => {
  try {
    const { username, emergencyId } = req.params;
    const photoPath = req.file.path;

    console.log(`Photo path: ${photoPath}`);

    if (!fs.existsSync(photoPath)) {
      console.error(`Photo file does not exist: ${photoPath}`);
      return res.status(400).send('Photo file does not exist');
    }

    const scores = await runPythonScript(photoPath);
    console.log('Scores from Python script:', scores);

    // Ensure scores match the schema
    const validatedScores = {
      aggression: scores.aggression || 0,
      hostility: scores.hostility || 0,
      frustration: scores.frustration || 0
    };

    console.log('Validated scores:', validatedScores);

    const user = await User.findOneAndUpdate(
      { 
        username, 
        'emergency_data._id': new mongoose.Types.ObjectId(emergencyId) 
      },
      { 
        $set: { 'emergency_data.$.emotions': validatedScores },
        $push: { 
          'emergency_data.$.images': { 
            data: fs.readFileSync(photoPath), 
            contentType: 'image/jpeg' 
          } 
        }
      },
      { new: true }
    );

    if (!user) {
      console.error('User or emergency event not found');
      return res.status(404).send('User or emergency event not found');
    }

    console.log('Updated user:', JSON.stringify(user, null, 2));

    // Clean up the uploaded photo
    fs.unlinkSync(photoPath);

    res.status(200).json({ message: 'Photo processed and scores updated successfully', scores: validatedScores });
  } catch (error) {
    console.error('Error processing photo:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).send('Error processing photo');
  }
});

const port = 3007;
app.listen(port, () => {
  console.log(`Hume AI Server started on port ${port}`);
});