const express = require('express');
const multer = require('multer');
const { User } = require('./database');
const cors = require('cors');
const mongoose = require('mongoose'); // Add mongoose

const app = express();
const upload = multer(); // Initialize multer for handling file uploads

app.use(express.json());
app.use(cors()); // Enable CORS

// Route to create a new emergency event
app.post('/create-emergency-event/:userId', upload.single('audio'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { location, description } = req.body;

    let emergencyData = {
      _id: new mongoose.Types.ObjectId(), // Generate a new ObjectId for this emergency event
      location,
      description,
      images: [],
      audio: null,
      timestamp: new Date() // Add timestamp
    };

    // Process audio file if present
    if (req.file) {
      emergencyData.audio = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }

    // Find the user and add the new emergency data
    const user = await User.findOneAndUpdate(
      { auth0Id: userId },
      { $push: { emergency_data: emergencyData } },
      { new: true, upsert: true }
    );

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.status(200).json({ 
      message: 'Emergency event created successfully', 
      emergencyId: emergencyData._id 
    });
  } catch (error) {
    console.error('Error creating emergency event:', error);
    res.status(500).send('Error creating emergency event');
  }
});

// Route to add an image to an existing emergency event
app.post('/add-emergency-image/:userId/:emergencyId', upload.single('image'), async (req, res) => {
  try {
    const { userId, emergencyId } = req.params;

    if (!req.file) {
      return res.status(400).send('No image file uploaded');
    }

    const imageData = {
      data: req.file.buffer,
      contentType: req.file.mimetype
    };

    // Find the user and add the image to the specific emergency event
    const user = await User.findOneAndUpdate(
      { 
        auth0Id: userId, 
        'emergency_data._id': mongoose.Types.ObjectId(emergencyId) 
      },
      { 
        $push: { 'emergency_data.$.images': imageData } 
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).send('User or emergency event not found');
    }

    res.status(200).json({ message: 'Image added successfully to the emergency event' });
  } catch (error) {
    console.error('Error adding image to emergency event:', error);
    res.status(500).send('Error adding image to emergency event');
  }
});

// Endpoint to get user profile data
app.get('/profile', async (req, res) => {
  try {
    const userId = req.query.userId; // Assume userId is passed as a query parameter
    const user = await User.findOne({ auth0Id: userId });

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.json(user); // Ensure we send JSON response
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).send('Error fetching profile');
  }
});

// Endpoint to update emergency data
app.post('/emergency-data', async (req, res) => {
  try {
    const userId = req.body.auth0Id; // Assume auth0Id is passed in the body
    const { emergency_data } = req.body;

    const user = await User.findOneAndUpdate(
      { auth0Id: userId },
      { $set: { emergency_data } },
      { new: true, upsert: true }
    );

    res.status(200).send(user);
  } catch (error) {
    console.error('Error updating emergency data:', error);
    res.status(500).send('Error updating emergency data');
  }
});

// Endpoint to create or update user
app.post('/api/users', async (req, res) => {
  try {
    const { auth0Id, username, email, emergency_data } = req.body;

    const user = await User.findOneAndUpdate(
      { auth0Id },
      { username, email, emergency_data },
      { new: true, upsert: true }
    );

    res.status(200).send(user);
  } catch (error) {
    console.error('Error creating or updating user:', error);
    res.status(500).send('Error creating or updating user');
  }
});

// Endpoint to update username and email in MongoDB
app.put('/api/update-user', async (req, res) => {
  try {
    const userId = req.body.auth0Id; // Assume auth0Id is passed in the body
    const { email, username } = req.body;

    // Update user in MongoDB
    const updatedUser = await User.findOneAndUpdate(
      { auth0Id: userId },
      { email, username },
      { new: true }
    );

    res.status(200).send(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).send('Error updating user');
  }
});

const port = 3006;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
