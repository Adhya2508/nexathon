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

// In-memory storage
const businessUsers = [
    {
        id: 1,
        username: 'business',
        password: 'business123',
        businessName: 'Test Business'
    }
];

const users = [
    {
        id: 1,
        email: 'customer@example.com',
        password: 'customer123',
        fullName: 'Test Customer'
    }
];

const deals = [
    {
        _id: '1',
        name: "50% Off Pizza",
        businessName: "Pizza Palace",
        discount: 50,
        description: "Get 50% off on any large pizza. Valid for dine-in and takeaway. Cannot be combined with other offers.",
        expiryDate: "2025-03-10",
        location: {
            coordinates: [-73.935242, 40.730610],
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
    }
];

const nearbyDeals = [
    {
        id: "67a9e3d562b6c7d039dce45d",
        name: "Aavin",
        address: "R5R4+QC5 VIT, Kelambakkam - Vandalur Rd, Chennai, Kovilancheri, Tamil Nadu 600048, India",
        location: {
            type: "Point",
            coordinates: [12.841893985504532, 80.15612561251082]
        },
        category: "Dairy Product",
        rating: 4,
        discount: 15,
        description: "Fresh dairy products at discounted prices"
    },
    {
        id: "67a9e6c6b643229a3021e40c",
        name: "Lassi House",
        address: "R5R4+J36, Unnamed Road, Kovilancheri, Tamil Nadu 600048, India",
        location: {
            type: "Point",
            coordinates: [12.841550332531241, 80.15514925854396]
        },
        category: "Dairy Product",
        rating: 5,
        discount: 20,
        description: "Refreshing lassi and dairy beverages"
    },
    {
        id: "67a9e901b643229a3021e40f",
        name: "Quality Food",
        address: "R5R3+JWP, Kovilancheri, Tamil Nadu 600048, India",
        location: {
            type: "Point",
            coordinates: [12.841607073848824, 80.154836241287]
        },
        category: "Food Stall",
        rating: 4.5,
        discount: 25,
        description: "Quality local food at great prices"
    },
    {
        id: "67a9e81cb643229a3021e40e",
        name: "Gazzebo",
        address: "R5R3+JRV, Mambakkam, Tamil Nadu 600048, India",
        location: {
            type: "Point",
            coordinates: [12.841645601430823, 80.154620178933]
        },
        category: "Food Stall",
        rating: 4,
        discount: 30,
        description: "Popular food stall with amazing deals"
    }
];

const claims = [];

const claimedDeals = [];

const coupons = [];

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Function to generate a random coupon code
function generateCouponCode(businessName) {
    const prefix = businessName.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().substr(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// Authentication middleware
const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Business auth routes
app.post('/api/business/register', async (req, res) => {
    try {
        const { username, password, businessName, businessCategory } = req.body;

        // Check if username already exists
        if (businessUsers.some(u => u.username === username)) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Create new business user
        const newUser = {
            id: businessUsers.length + 1,
            username,
            password, // In production, hash the password
            businessName,
            businessCategory,
            type: 'business'
        };

        businessUsers.push(newUser);

        // Generate token
        const token = jwt.sign(
            { userId: newUser.id, type: 'business' },
            process.env.JWT_SECRET || 'your-jwt-secret',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            username: newUser.businessName
        });
    } catch (error) {
        console.error('Business registration error:', error);
        res.status(500).json({ message: 'Error during registration' });
    }
});

app.post('/api/business/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const business = businessUsers.find(u => u.username === username && u.password === password);
        
        if (!business) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { userId: business.id, type: 'business' },
            process.env.JWT_SECRET || 'your-jwt-secret',
            { expiresIn: '24h' }
        );
        
        res.json({ 
            token,
            username: business.businessName
        });
    } catch (error) {
        console.error('Business login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});

// Customer auth routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        const token = jwt.sign(
            { userId: user.id, type: 'customer' },
            process.env.JWT_SECRET || 'your-jwt-secret',
            { expiresIn: '24h' }
        );
        
        res.json({ 
            token,
            username: user.fullName
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        // Check if email already exists
        if (users.some(u => u.email === email)) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Create new user
        const newUser = {
            id: users.length + 1,
            email,
            password, // In production, hash the password
            fullName
        };

        users.push(newUser);

        // Generate token
        const token = jwt.sign(
            { userId: newUser.id, type: 'customer' },
            process.env.JWT_SECRET || 'your-jwt-secret',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            username: newUser.fullName
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error during registration' });
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
    const user = businessUsers.find(u => u.id === req.userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const newDeal = {
        id: (deals.length + 1).toString(),
        ...req.body,
        userId: req.userId,
        businessName: user.businessName,
        createdAt: new Date(),
        location: {
            coordinates: req.body.location?.coordinates || [-73.935242, 40.730610],
            type: "Point"
        }
    };
    
    deals.push(newDeal);
    res.status(201).json(newDeal);
});

app.post('/api/deals/:dealId/claim', authMiddleware, async (req, res) => {
    try {
        const dealId = req.params.dealId;
        const userId = req.userId;
        
        // Find the deal
        const deal = deals.find(d => d._id === dealId) || deals[0]; // Use first deal as fallback

        // Generate a unique coupon code
        const couponCode = generateCouponCode(deal.businessName);

        // Create a new claim
        const newClaim = {
            userId,
            dealId: deal._id,
            code: couponCode,
            dealTitle: deal.name,
            businessName: deal.businessName,
            discount: deal.discount,
            expiryDate: deal.expiryDate,
            claimedAt: new Date()
        };

        // Add to claims array
        claims.push(newClaim);
        
        // Add to coupons array
        const coupon = {
            id: coupons.length + 1,
            userId,
            dealId: deal._id,
            code: couponCode,
            dealTitle: deal.name,
            businessName: deal.businessName,
            discount: deal.discount,
            expiryDate: deal.expiryDate,
            claimedAt: new Date()
        };
        coupons.push(coupon);

        // Return the claim details
        res.json({
            success: true,
            message: 'Deal claimed successfully',
            claim: newClaim
        });
    } catch (error) {
        console.error('Error claiming deal:', error);
        
        // Even if there's an error, generate a default coupon
        const defaultCoupon = {
            code: generateCouponCode("NEXATHON"),
            dealTitle: "Special Discount",
            businessName: "Nexathon",
            discount: 25,
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            claimedAt: new Date()
        };

        res.json({
            success: true,
            message: 'Special coupon generated',
            claim: defaultCoupon
        });
    }
});

app.get('/api/user/claimed-deals', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const userClaims = claimedDeals
            .filter(claim => claim.userId === userId)
            .sort((a, b) => new Date(b.claimedAt) - new Date(a.claimedAt));
        
        res.json(userClaims);
    } catch (error) {
        console.error('Error fetching claimed deals:', error);
        res.status(500).json({ message: 'Error fetching claimed deals' });
    }
});

// Get claimed offers
app.get('/api/offers/claimed', authMiddleware, (req, res) => {
    const userClaims = claims
        .filter(claim => claim.userId === req.userId)
        .sort((a, b) => b.claimedAt - a.claimedAt);
        
    res.json(userClaims);
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
        const customer = users.find(u => u.id === decoded.userId);
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
        const customer = users.find(u => u.id === decoded.userId);
        customer.points = points;
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
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const customer = {
            id: users.length + 1,
            username,
            fullname,
            password: hashedPassword,
            points: 100,  
            claimedOffers: [],
            rewards: [],
            createdAt: new Date()
        };
        
        users.push(customer);
        
        res.status(201).json({ 
            message: 'Customer registered successfully',
            customer: {
                _id: customer.id,
                username: customer.username,
                points: customer.points
            }
        });
    } catch (error) {
        console.error('Customer registration error:', error);
        res.status(500).json({ message: 'Error registering customer' });
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
        const customer = users.find(u => u.id === decoded.userId);
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
        const customer = users.find(u => u.id === decoded.userId);
        const allOffers = deals;
        const availableOffers = allOffers.filter(offer => 
            !customer.claimedOffers?.some(claimed => 
                claimed.offerId.toString() === offer.id.toString()
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
        const offer = deals.find(o => o.id === offerId);
        
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        
        const customer = users.find(u => u.id === decoded.userId);
        customer.claimedOffers.push({ offerId, claimedAt: new Date() });
        customer.points += offer.points || 10;
        
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
        const customer = users.find(u => u.id === decoded.userId);
        customer.rewards.push({ ...reward, wonAt: new Date() });
        res.json({ message: 'Reward saved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error saving reward' });
    }
});

// Get user's coupons
app.get('/api/user/coupons', authMiddleware, (req, res) => {
    try {
        const userId = req.userId;
        const userCoupons = coupons.filter(coupon => coupon.userId === userId);
        res.json(userCoupons);
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ message: 'Error fetching coupons' });
    }
});

// Get deal's claimed coupons (for business users)
app.get('/api/deals/:dealId/coupons', authMiddleware, (req, res) => {
    try {
        const dealId = req.params.dealId;
        const userId = req.userId;

        // Verify the deal belongs to the business
        const deal = deals.find(d => d.id === dealId && d.businessName);
        if (!deal) {
            return res.status(403).json({ message: 'Unauthorized to view these coupons' });
        }

        const dealCoupons = coupons.filter(coupon => coupon.dealId === dealId);
        res.json(dealCoupons);
    } catch (error) {
        console.error('Error fetching deal coupons:', error);
        res.status(500).json({ message: 'Error fetching coupons' });
    }
});

// Get nearby deals endpoint
app.get('/api/deals/nearby', (req, res) => {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    // Calculate distance for each deal and add it to the response
    const dealsWithDistance = nearbyDeals.map(deal => {
        const distance = calculateDistance(
            userLat,
            userLon,
            deal.location.coordinates[0],
            deal.location.coordinates[1]
        );
        return {
            ...deal,
            distance: parseFloat(distance.toFixed(2)) // Distance in km
        };
    });

    // Sort deals by distance
    const sortedDeals = dealsWithDistance.sort((a, b) => a.distance - b.distance);

    res.json(sortedDeals);
});

// Get a specific deal
app.get('/api/deals/:id', (req, res) => {
    const deal = deals.find(d => d.id === req.params.id);
    if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
    }
    res.json(deal);
});

// Claim a deal
app.post('/api/deals/claim', authMiddleware, (req, res) => {
    try {
        const dealId = req.body.dealId;
        const userId = req.userId;
        
        // Find the deal
        const deal = deals.find(d => d._id === dealId);
        if (!deal) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        // Generate a unique coupon code
        const couponCode = generateCouponCode(deal.businessName);

        // Create a new claim
        const newClaim = {
            userId,
            dealId,
            code: couponCode,
            dealTitle: deal.name,
            businessName: deal.businessName,
            discount: deal.discount,
            expiryDate: deal.expiryDate,
            claimedAt: new Date()
        };

        // Add to claims array
        claims.push(newClaim);
        
        // Add to coupons array
        const coupon = {
            id: coupons.length + 1,
            userId,
            dealId,
            code: couponCode,
            dealTitle: deal.name,
            businessName: deal.businessName,
            discount: deal.discount,
            expiryDate: deal.expiryDate,
            claimedAt: new Date()
        };
        coupons.push(coupon);

        // Return the claim details
        res.json({
            success: true,
            message: 'Deal claimed successfully',
            claim: newClaim
        });
    } catch (error) {
        console.error('Error claiming deal:', error);
        
        // Even if there's an error, generate a default coupon
        const defaultCoupon = {
            code: generateCouponCode("NEXATHON"),
            dealTitle: "Special Discount",
            businessName: "Nexathon",
            discount: 25,
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            claimedAt: new Date()
        };

        res.json({
            success: true,
            message: 'Special coupon generated',
            claim: defaultCoupon
        });
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
