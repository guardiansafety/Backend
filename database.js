const mongoose = require('mongoose');

// MongoDB connection URI
const uri = 'mongodb+srv://ht6usernaeme:Ht6PasswordSecurity!@ht6cluster.rmjdwzv.mongodb.net/myDatabase';

// Connect to MongoDB
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// Define schema for emergency data
const emergencyDataSchema = new mongoose.Schema({
  location: String,
  description: String,
  images: [{
    data: Buffer,
    contentType: String
  }],
  audio: {
    data: Buffer,
    contentType: String
  },
  timestamp: { type: Date, default: Date.now } // Add timestamp field
});

// Define schema for users
const userSchema = new mongoose.Schema({
  auth0Id: { type: String, required: true },
  username: { type: String },
  email: { type: String },
  emergency_data: [emergencyDataSchema]
});

// Create a model for users
const User = mongoose.model('User', userSchema);

module.exports = { User };
