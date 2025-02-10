const express = require('express');
const router = express.Router();
const Deal = require('../models/deal');

// Get business deals
router.get('/deals', async (req, res) => {
    try {
        const { businessName } = req.query;
        if (!businessName) {
            return res.status(400).json({ error: 'Business name is required' });
        }

        const deals = await Deal.find({ 
            businessName,
            expiryDate: { $gt: new Date() }
        }).sort('-createdAt');
        
        res.json(deals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update deal
router.put('/deals/:id', async (req, res) => {
    try {
        const deal = await Deal.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        res.json(deal);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
