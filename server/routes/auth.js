const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

module.exports = function(db) {
    const User = require('../models/user');
    const userModel = new User(db);

    // Register new user
    router.post('/register', async (req, res) => {
        try {
            const { username, password } = req.body;
            
            // Check if user already exists
            const existingUser = await userModel.findByUsername(username);
            if (existingUser) {
                return res.status(400).json({ message: 'Username already exists' });
            }

            // Create new user
            const user = await userModel.create(username, password);
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
            
            res.status(201).json({ token, username: user.username });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Error registering user' });
        }
    });

    // Login user
    router.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            
            // Find user
            const user = await userModel.findByUsername(username);
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Validate password
            const isValid = await userModel.validatePassword(user, password);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Generate token
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
            
            res.json({ token, username: user.username });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Error logging in' });
        }
    });

    return router;
};
