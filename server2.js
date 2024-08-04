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


// Function to run the Python script
function runPythonScript(photoPath, outputJsonPath, callback) {
  exec(`python process_photo.py ${photoPath} ${outputJsonPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return callback(error);
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    callback(null, outputJsonPath);
  });
}

app.post('/upload-photo/:username/:emergencyId', upload.single('photo'), async (req, res) => {
  try {
    const { username, emergencyId } = req.params;
    const photoPath = req.file.path;
    const outputJsonPath = path.join(__dirname, 'output_scores.json');

    // Run the Python script to process the photo and generate scores
    runPythonScript(photoPath, outputJsonPath, async (error) => {
      if (error) {
        return res.status(500).send('Error processing photo');
      }

      // Read the JSON output
      const scores = JSON.parse(fs.readFileSync(outputJsonPath, 'utf8'));

      // Update the user and emergency schemas with the generated scores
      const user = await User.findOneAndUpdate(
        { username },
        { $set: { emotions: scores } },
        { new: true }
      );

      if (!user) {
        return res.status(404).send('User not found');
      }

      const emergencyDataIndex = user.emergency_data.findIndex(emergency => emergency._id.toString() === emergencyId);
      if (emergencyDataIndex !== -1) {
        user.emergency_data[emergencyDataIndex].emotions = scores;
        await user.save();
      } else {
        return res.status(404).send('Emergency event not found');
      }

      // Clean up the uploaded photo and output JSON file
      fs.unlinkSync(photoPath);
      fs.unlinkSync(outputJsonPath);

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
