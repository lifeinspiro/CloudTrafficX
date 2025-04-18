// AutoTraffic Pro - Full Stack in One File
const express = require('express');
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ===================== Security Middleware =========================
app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// ===================== MongoDB Setup =========================
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost/autotrafficpro';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const TrafficSchema = new mongoose.Schema({
  platform: String,
  blogUrl: String,
  timestamp: { type: Date, default: Date.now },
});
const TrafficLog = mongoose.model('TrafficLog', TrafficSchema);

// ===================== Middleware ============================
app.use(bodyParser.json());

// Validate user input
function validateInput(platform, blogUrl) {
  if (!platform || !blogUrl) {
    throw new Error('Platform and Blog URL are required');
  }
  if (!['youtube', 'quora', 'facebook'].includes(platform)) {
    throw new Error('Unsupported platform');
  }
  try {
    new URL(blogUrl);
  } catch {
    throw new Error('Invalid Blog URL');
  }
}

// ===================== Frontend ==============================
app.get('/', (req, res) => {
  res.send(\`
    <!DOCTYPE html>
    <html>
    <head>
      <title>AutoTraffic Pro</title>
      <style>
        body { font-family: Arial; padding: 30px; background: #f7f7f7; }
        h2 { color: #333; }
        form { margin-top: 20px; }
        label, select, input { display: block; margin: 10px 0; }
        button { padding: 10px 15px; background: #28a745; color: white; border: none; cursor: pointer; }
        #result { margin-top: 20px; font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>AutoTraffic Pro</h2>
      <form id="trafficForm">
        <label for="platform">Select Platform:</label>
        <select id="platform" name="platform">
          <option value="youtube">YouTube</option>
          <option value="quora">Quora</option>
          <option value="facebook">Facebook</option>
        </select>
        <label for="blogUrl">Your Blog URL:</label>
        <input type="text" id="blogUrl" name="blogUrl" required />
        <button type="submit">Generate Traffic</button>
      </form>
      <div id="result"></div>
      <script>
        document.getElementById('trafficForm').addEventListener('submit', async function(e) {
          e.preventDefault();
          const platform = document.getElementById('platform').value;
          const blogUrl = document.getElementById('blogUrl').value;
          try {
            const response = await fetch('/generate-traffic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ platform, blogUrl }),
            });
            const result = await response.json();
            document.getElementById('result').innerText = result.message;
          } catch (error) {
            document.getElementById('result').innerText = 'Error: ' + error.message;
          }
        });
      </script>
    </body>
    </html>
  \`);
});

// ===================== API Route =============================
app.post('/generate-traffic', async (req, res) => {
  try {
    const { platform, blogUrl } = req.body;
    validateInput(platform, blogUrl);

    if (platform === 'youtube') {
      await simulateYouTubeTraffic(blogUrl);
    } else if (platform === 'quora') {
      await simulateQuoraTraffic(blogUrl);
    } else if (platform === 'facebook') {
      await simulateFacebookTraffic(blogUrl);
    }

    await TrafficLog.create({ platform, blogUrl });
    res.json({ success: true, message: \`Traffic sent via \${platform}\` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== Traffic Simulations ===================
async function simulateYouTubeTraffic(