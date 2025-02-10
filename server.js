const express = require('express');
const cors = require('cors');
const session = require('express-session');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const bcrypt = require('bcrypt');
const { MongoClient, ObjectId } = require('mongodb');

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

// MongoDB Connection
const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsNearby';
let db;

async function connectToMongo() {
    try {
        const client = await MongoClient.connect(mongoUrl);
        db = client.db();
        console.log('Connected to MongoDB successfully');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
    }
}

connectToMongo();

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

// Customer Routes
app.get('/api/customer/data', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
        if (decoded.type !== 'customer') {
            return res.status(403).json({ message: 'Not authorized as customer' });
        }
        const customer = await db.collection('customers').findOne(
            { _id: new ObjectId(decoded.id) },
            { projection: { password: 0 } }
        );
        res.json(customer);
    } catch (error) {
        console.error('Error fetching customer data:', error);
        res.status(500).json({ message: 'Error fetching customer data' });
    }
});

app.post('/api/customer/points', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
        if (decoded.type !== 'customer') {
            return res.status(403).json({ message: 'Not authorized as customer' });
        }
        const { points } = req.body;
        await db.collection('customers').updateOne(
            { _id: new ObjectId(decoded.id) },
            { $set: { points: points } }
        );
        res.json({ message: 'Points updated successfully' });
    } catch (error) {
        console.error('Error updating points:', error);
        res.status(500).json({ message: 'Error updating points' });
    }
});

app.post('/api/customer/register', async (req, res) => {
    try {
        const { username, password, fullname } = req.body;
        
        // Check if username already exists
        const existingUser = await db.collection('customers').findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const customer = {
            username,
            fullname,
            password: hashedPassword,
            points: 100,  
            claimedOffers: [],
            rewards: [],
            createdAt: new Date()
        };
        
        const result = await db.collection('customers').insertOne(customer);
        res.status(201).json({ 
            message: 'Customer registered successfully',
            customer: {
                _id: result.insertedId,
                username: customer.username,
                points: customer.points
            }
        });
    } catch (error) {
        console.error('Customer registration error:', error);
        res.status(500).json({ message: 'Error registering customer' });
    }
});

app.post('/api/customer/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const customer = await db.collection('customers').findOne({ username });
        
        if (!customer || !(await bcrypt.compare(password, customer.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: customer._id, username: customer.username, type: 'customer' },
            process.env.JWT_SECRET || 'your-jwt-secret',
            { expiresIn: '24h' }
        );
        
        res.json({ 
            token,
            customer: {
                _id: customer._id,
                username: customer.username,
                points: customer.points
            }
        });
    } catch (error) {
        console.error('Customer login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});

app.get('/api/customer/claimed-offers', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
        if (decoded.type !== 'customer') {
            return res.status(403).json({ message: 'Not authorized as customer' });
        }
        const customer = await db.collection('customers').findOne(
            { _id: new ObjectId(decoded.id) }
        );
        res.json(customer.claimedOffers || []);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching claimed offers' });
    }
});

app.get('/api/customer/available-offers', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
        if (decoded.type !== 'customer') {
            return res.status(403).json({ message: 'Not authorized as customer' });
        }
        const customer = await db.collection('customers').findOne(
            { _id: new ObjectId(decoded.id) }
        );
        const allOffers = await db.collection('offers').find({}).toArray();
        const availableOffers = allOffers.filter(offer => 
            !customer.claimedOffers?.some(claimed => 
                claimed.offerId.toString() === offer._id.toString()
            )
        );
        res.json(availableOffers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching available offers' });
    }
});

app.post('/api/customer/claim-offer', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
        if (decoded.type !== 'customer') {
            return res.status(403).json({ message: 'Not authorized as customer' });
        }
        const { offerId } = req.body;
        const offer = await db.collection('offers').findOne({ _id: new ObjectId(offerId) });
        
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        
        await db.collection('customers').updateOne(
            { _id: new ObjectId(decoded.id) },
            { 
                $push: { claimedOffers: { ...offer, claimedAt: new Date() } },
                $inc: { points: offer.points || 10 }
            }
        );
        
        res.json({ message: 'Offer claimed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error claiming offer' });
    }
});

app.post('/api/customer/rewards', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
        if (decoded.type !== 'customer') {
            return res.status(403).json({ message: 'Not authorized as customer' });
        }
        const { reward } = req.body;
        await db.collection('customers').updateOne(
            { _id: new ObjectId(decoded.id) },
            { 
                $push: { rewards: { ...reward, wonAt: new Date() } }
            }
        );
        res.json({ message: 'Reward saved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error saving reward' });
    }
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
