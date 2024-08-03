const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require('path');
require('dotenv').config();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType
    },
  };
}

app.post('/describe', upload.array('images'), async (req, res) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = 'Describe the surroundings and things in the image in detail.';

  let imageParts = [];

  for (const file of req.files) {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype.toLowerCase();

    console.log('File path:', file.path); // Log file path
    console.log('File original name:', file.originalname); // Log file original name
    console.log('File extension:', ext); // Log file extension
    console.log('MIME type:', mimeType); // Log MIME type

    if ((ext === '.png' && mimeType === 'image/png') ||
        (ext === '.jpg' && mimeType === 'image/jpeg') ||
        (ext === '.jpeg' && mimeType === 'image/jpeg')) {
      imageParts.push(fileToGenerativePart(file.path, mimeType));
      fs.unlinkSync(file.path); // Delete the image file after it has been processed
    } else {
      return res.status(400).send({ error: `Unsupported file type: ${ext}` });
    }
  }

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  const text = response.text();

  console.log('AI response:', text); // Log AI response

  res.send({ description: text });
});

app.listen(3005, () => {
  console.log('Server started on port 3005');
});
