const express = require('express');
const cors = require('cors');
const session = require('express-session');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// In-memory storage (temporary, replace with MongoDB later)
const users = [];
const deals = [
    {
        _id: '1',
        name: "50% Off Pizza",
        businessName: "Pizza Palace",
        discount: 50,
        description: "Get 50% off on any large pizza. Valid for dine-in and takeaway. Cannot be combined with other offers.",
        expiryDate: "2025-03-10",
        location: {
            coordinates: [-73.935242, 40.730610], // Example coordinates
            type: "Point"
        },
        category: "Food & Drinks",
        terms: "Valid on large pizzas only. One coupon per customer.",
        userId: null,
        createdAt: new Date("2025-02-01")
    },
    {
        _id: '2',
        name: "Buy 1 Get 1 Coffee",
        businessName: "Star Cafe",
        discount: 100,
        description: "Buy any coffee and get another one of equal or lesser value absolutely free! Perfect for coffee dates.",
        expiryDate: "2025-03-15",
        location: {
            coordinates: [-73.935242, 40.730610],
            type: "Point"
        },
        category: "Food & Drinks",
        terms: "Valid on all coffee drinks. Second drink must be of equal or lesser value.",
        userId: null,
        createdAt: new Date("2025-02-05")
    },
    {
        _id: '3',
        name: "30% Off Gym Membership",
        businessName: "FitZone Gym",
        discount: 30,
        description: "Get 30% off on our annual membership plan. Includes access to all equipment and group classes.",
        expiryDate: "2025-04-01",
        location: {
            coordinates: [-73.935242, 40.730610],
            type: "Point"
        },
        category: "Fitness",
        terms: "New members only. 12-month commitment required.",
        userId: null,
        createdAt: new Date("2025-02-08")
    }
];

// Authentication middleware
const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-key');
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, businessName } = req.body;
        
        // Check if user exists
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Create new user
        const user = {
            id: users.length + 1,
            username,
            password, // In production, hash the password!
            businessName
        };
        users.push(user);

        // Generate token
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'your-super-secret-key', { expiresIn: '24h' });
        res.status(201).json({ token, username: user.username, businessName: user.businessName });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'your-super-secret-key', { expiresIn: '24h' });
        res.json({ token, username: user.username, businessName: user.businessName });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Deal routes
app.get('/api/deals', (req, res) => {
    res.json(deals);
});

app.get('/api/deals/business', authMiddleware, (req, res) => {
    const businessDeals = deals.filter(deal => deal.userId === req.userId);
    res.json(businessDeals);
});

app.post('/api/deals', authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const newDeal = {
        _id: (deals.length + 1).toString(),
        ...req.body,
        businessName: user.businessName,
        userId: req.userId,
        createdAt: new Date(),
        location: {
            coordinates: [-73.935242, 40.730610], // Example coordinates
            type: "Point"
        }
    };
    deals.push(newDeal);
    res.status(201).json(newDeal);
});

app.post('/api/deals/:id/claim', authMiddleware, (req, res) => {
    const deal = deals.find(d => d._id === req.params.id);
    if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
    }
    
    // In a real app, we would create a claim record and generate a voucher
    res.json({ 
        message: 'Deal claimed successfully',
        voucher: {
            code: Math.random().toString(36).substring(7).toUpperCase(),
            dealId: deal._id,
            userId: req.userId,
            claimedAt: new Date()
        }
    });
});

app.delete('/api/deals/:id', authMiddleware, (req, res) => {
    const dealIndex = deals.findIndex(d => d._id === req.params.id && d.userId === req.userId);
    if (dealIndex === -1) {
        return res.status(404).json({ message: 'Deal not found or unauthorized' });
    }
    
    deals.splice(dealIndex, 1);
    res.json({ message: 'Deal deleted successfully' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
