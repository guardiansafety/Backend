const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const moment = require('moment-timezone');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { User } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: fs.readFileSync(filePath).toString('base64'),
      mimeType
    },
  };
}



// Registration endpoint
app.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    console.log('Attempting to register user:', username);
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      console.log('Registration failed: User already exists');
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    console.log('Creating new user...');
    const user = new User({ username, email, password });
    await user.save();

    console.log('User created successfully. Generating token...');
    const token = jwt.sign({ userId: user._id }, process.env.VITE_JWT_SECRET, { expiresIn: '7d' });
    
    console.log('Registration successful');
    res.status(201).json({ message: 'User registered successfully', token, username: user.username });
  } catch (error) {
    console.error('Detailed registration error:', error);
    res.status(500).json({ error: 'Error registering user. Please try again.', details: error.message });
  }
});


// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.VITE_JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});


// Verify token endpoint
app.post('/verify-token', async (req, res) => {
  const token = req.body.token;
  if (!token) return res.status(400).json({ isValid: false });
  
  try {
    const decoded = jwt.verify(token, process.env.VITE_JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.json({ isValid: false });
    res.json({ isValid: true, username: user.username });
  } catch (error) {
    res.json({ isValid: false });
  }
});


app.post('/create-emergency-event/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { location, description } = req.body;

    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).send('Invalid location data');
    }

    const timestamp = moment().tz("America/Toronto").toDate();

    const emergencyData = {
      _id: new mongoose.Types.ObjectId(),
      location: {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
      },
      description: description || 'Pending AI analysis', // Use a placeholder if description is empty
      images: [],
      audio: null,
      timestamp,
    };

    let user = await User.findOne({ username });

    if (user) {
      user = await User.findOneAndUpdate(
        { username },
        { $push: { emergency_data: emergencyData } },
        { new: true }
      );
    } else {
      user = new User({ 
        username, 
        emergency_data: [emergencyData] 
      });
      await user.save();
    }

    res.status(200).json({
      message: 'Emergency event created successfully',
      emergencyId: emergencyData._id,
    });
  } catch (error) {
    console.error('Error creating emergency event:', error);
    res.status(500).send('Error creating emergency event');
  }
});


app.post('/add-emergency-image/:username/:emergencyId', upload.array('images'), async (req, res) => {
  try {
    const { username, emergencyId } = req.params;

    if (!req.files || req.files.length === 0) {
      console.error('No image files uploaded');
      return res.status(400).send('No image files uploaded');
    }

    const model = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const imageParts = req.files.map(file => fileToGenerativePart(file.path, file.mimetype));

    const prompt = `Analyze the following ${req.files.length} images as a sequence of events. 
    Provide a comprehensive description of the scene, focusing on:
    1. The main subject or subjects across all images
    2. Any changes or progression you observe from one image to the next
    3. Key details about the environment or setting
    4. Any notable actions or events taking place
    Limit your response to about 100 words.`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const description = response.text();

    const user = await User.findOneAndUpdate(
      {
        username,
        'emergency_data._id': new mongoose.Types.ObjectId(emergencyId),
      },
      {
        $set: { 'emergency_data.$.description': description },
        $push: { 'emergency_data.$.images': req.files.map(file => ({ data: file.buffer, contentType: file.mimetype })) }
      },
      { new: true }
    );

    if (!user) {
      console.error('User or emergency event not found');
      return res.status(404).send('User or emergency event not found');
    }

    res.status(200).json({ message: 'Images added and description updated successfully', description });
  } catch (error) {
    console.error('Error adding images to emergency event:', error);
    res.status(500).send('Error adding images to emergency event');
  } finally {
    // Ensure all uploaded files are deleted after analysis and use
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        fs.unlink(file.path, err => {
          if (err) {
            console.error(`Failed to delete file: ${file.path}`, err);
          }
        });
      });
    }
  }
});


// Endpoint to get user profile data
app.get('/profile', async (req, res) => {
  try {
    const auth0Id = req.query.auth0Id;
    console.log('Fetching profile for auth0Id:', auth0Id);
    const user = await User.findOne({ auth0Id });

    if (!user) {
      console.log('User not found for auth0Id:', auth0Id);
      return res.status(404).send('User not found');
    }

    console.log('User found:', user);
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).send('Error fetching profile');
  }
});


// geting all emergency data
app.get('/get-all-emergencies', async (req, res) => {
  try {
    const users = await User.find({}, 'username emergency_data');
    const emergencies = users.flatMap(user => 
      user.emergency_data.map(event => ({ ...event.toObject(), username: user.username }))
    );

    res.json(emergencies);
  } catch (error) {
    console.error('Error fetching emergency events:', error);
    res.status(500).send('Error fetching emergency events');
  }
});



app.post('/logout', (req, res) => {
  // invalidate the token
  // For a simple implementation, you can just send a success response
  res.json({ message: 'Logged out successfully' });
});

app.post('/create-or-update-user', async (req, res) => {
  try {
    console.log('Received request to create or update user:', req.body);
    const { auth0Id, username, email } = req.body;

    if (!auth0Id || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let user = await User.findOne({ auth0Id });
    
    if (user) {
      console.log('Updating existing user:', user);
      user.username = username;
      if (email) user.email = email;
      await user.save();
    } else {
      console.log('Creating new user');
      user = new User({ auth0Id, username, email, emergency_data: [] });
      await user.save();
    }
    
    console.log('User created or updated successfully:', user);
    res.status(200).json({ message: 'User created or updated successfully', user });
  } catch (error) {
    console.error('Detailed error in create-or-update-user:', error);
    res.status(500).json({ error: 'Error creating or updating user', details: error.message });
  }
});



app.get('/most-recent-emergencies', async (req, res) => {
  try {
    const recentEmergencies = await User.aggregate([
      { $unwind: "$emergency_data" },
      { $sort: { "emergency_data.timestamp": -1 } },
      { $limit: 5 },
      { 
        $project: {
          username: 1,
          "emergency_data.description": 1,
          "emergency_data.timestamp": 1,
          "emergency_data.location": 1
        }
      }
    ]);

    const formattedEmergencies = recentEmergencies.map(e => ({
      username: e.username,
      description: e.emergency_data.description,
      timestamp: e.emergency_data.timestamp,
      location: e.emergency_data.location
    }));

    res.json(formattedEmergencies);
  } catch (error) {
    console.error('Error fetching most recent emergencies:', error);
    res.status(500).send('Error fetching most recent emergencies');
  }
});



const port = 3006;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});