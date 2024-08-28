const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

require('dotenv').config();

const uri = process.env.MONGODB_URI;

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

const emergencyDataSchema = new mongoose.Schema({
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  description: String,
  images: [{
    data: Buffer,
    contentType: String
  }],
  audio: {
    data: Buffer,
    contentType: String
  },
  timestamp: { type: Date, default: Date.now },
  emotions: {
    aggression: { type: Number, default: 0 },
    hostility: { type: Number, default: 0 },
    frustration: { type: Number, default: 0 }
  }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  emergency_data: [emergencyDataSchema]
});
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);



module.exports = { User };
