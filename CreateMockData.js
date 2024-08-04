const mongoose = require('mongoose');
const moment = require('moment-timezone');
require('dotenv').config();

const { User } = require('./database'); // Make sure this path is correct

const uri = process.env.MONGODB_URI;

// Connect to MongoDB
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// Array of possible emergency descriptions
const descriptions = [
  'Car accident at intersection',
  'Fire reported in high-rise building',
  'Medical emergency in subway station',
  'Robbery at downtown convenience store',
  'Suspicious package found near financial district',
  'Power outage affecting several blocks',
  'Gas leak reported in residential building',
  'Traffic incident on major arterial road',
  'Protest gathering at Nathan Phillips Square',
  'Water main break causing street flooding',
  'Structural damage to construction site',
  'Pedestrian struck by vehicle',
  'Hazardous material spill from truck',
  'Elevator malfunction in office tower',
  'Lost child reported in shopping center'
];

// Function to generate a random coordinate within Toronto
const generateRandomTorontoCoordinates = () => {
  const minLatitude = 43.5810;
  const maxLatitude = 43.8555;
  const minLongitude = -79.6393;
  const maxLongitude = -79.1157;

  const randomLatitude = Math.random() * (maxLatitude - minLatitude) + minLatitude;
  const randomLongitude = Math.random() * (maxLongitude - minLongitude) + minLongitude;

  return { latitude: randomLatitude, longitude: randomLongitude };
};

// Function to generate a random number within a specified range
const generateRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Function to create random emergency data for a user
const createRandomEmergencyData = (username, numEvents) => {
  const events = [];
  for (let i = 0; i < numEvents; i++) {
    // Generate random coordinates within Toronto
    const { latitude, longitude } = generateRandomTorontoCoordinates();
    
    // Select a random description
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    // Generate a random timestamp within the last 2 months
    const timestamp = moment().subtract(generateRandomNumber(1, 60), 'days').tz("America/Toronto").toDate();

    // Generate random emotion scores
    const emotions = {
      aggression: Math.random()*10,
      hostility: Math.random()*10,
      frustration: Math.random()*10
    };

    // Create a mock image (in reality, this would be actual image data)
    const mockImage = {
      data: Buffer.from('mock image data'),
      contentType: 'image/jpeg'
    };

    // Create a mock audio (in reality, this would be actual audio data)
    const mockAudio = {
      data: Buffer.from('mock audio data'),
      contentType: 'audio/mpeg'
    };

    events.push({
      _id: new mongoose.Types.ObjectId(),
      location: { latitude, longitude },
      description: `${description} reported by ${username}`,
      images: [mockImage],
      audio: mockAudio,
      timestamp,
      emotions
    });
  }
  return events;
};

// Function to insert mock data for all users
const insertMockData = async () => {
  const users = [
    { username: 'hackthe6ix2024', auth0Id: 'google-oauth2|103064479538676048453', email: 'hackthe6ix2024@gmail.com' },
    { username: 'danielh.toronto', auth0Id: 'google-oauth2|104010459411486648587', email: 'danielh.toronto@gmail.com' },
    { username: 'danielh.uoft', auth0Id: 'google-oauth2|116417610844823498590', email: 'danielh.uoft@gmail.com' },
    { username: 'danielhong.ducks', auth0Id: 'google-oauth2|115248423086229429539', email: 'danielhong.ducks@gmail.com' },
    { username: 'brian.w.zhang', auth0Id: 'google-oauth2|114983327509198399027', email: 'brian.w.zhang@gmail.com' }
  ];

  for (const user of users) {
    // Generate between 5 and 15 events for each user
    const eventCount = generateRandomNumber(0, 3);
    const userEvents = createRandomEmergencyData(user.username, eventCount);

    // Update or create the user with the new emergency data
    await User.findOneAndUpdate(
      { username: user.username, auth0Id: user.auth0Id },
      { 
        $set: { auth0Id: user.auth0Id, username: user.username, email: user.email },
        $push: { emergency_data: { $each: userEvents } }
      },
      { new: true, upsert: true }
    );

    console.log(`Inserted ${eventCount} events for user ${user.username}`);
  }

  console.log('Mock data insertion completed successfully');
};

// Run the mock data insertion
insertMockData().then(() => {
  console.log('All mock data inserted. Closing database connection.');
  mongoose.disconnect();
}).catch(error => {
  console.error('Error inserting mock data:', error);
  mongoose.disconnect();
});
