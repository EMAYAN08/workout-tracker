const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login / Auto-register
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    let user = await User.findOne({ username });
    
    if (!user) {
      // Auto-register
      user = new User({ username, password });
      await user.save();
      return res.json({ message: 'User created and logged in', username: user.username });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    res.json({ message: 'Logged in successfully', username: user.username });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
