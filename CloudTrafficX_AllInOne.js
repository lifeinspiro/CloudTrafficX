// =========================
// server/index.js
// =========================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const trafficRoutes = require('./routes/traffic');

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/traffic', trafficRoutes);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error(err));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(process.env.PORT || 5000, () => {
  console.log('Server running on port 5000');
});

// =========================
// server/routes/auth.js
// =========================
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

// =========================
// client/src/App.jsx
// =========================
import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const earnCredit = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/traffic/earn`, {
        userId: localStorage.getItem('userId'),
      });
      setCredits(res.data.credits);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const spendCredit = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/traffic/spend`, {
        userId: localStorage.getItem('userId'),
      });
      setCredits(res.data.credits);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">CloudTrafficX</h1>
      <p>Credits: {credits}</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={earnCredit} disabled={loading}>
        {loading ? 'Loading...' : 'Earn'}
      </button>
      <button onClick={spendCredit} disabled={loading}>
        {loading ? 'Loading...' : 'Spend'}
      </button>
    </div>
  );
}

export default App;