const express = require('express');
const router = express.Router();
const Deal = require('../models/deal');
const TranslationService = require('../services/translationService');
// const ChatbotService = require('../services/chatbotService');

// Get nearby deals with translation
router.get('/nearby', async (req, res) => {
    const { lat, lng, radius = 5000, lang = 'en' } = req.query;
    
    try {
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        const deals = await Deal.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseInt(radius)
                }
            },
            expiryDate: { $gt: new Date() }
        }).sort('-createdAt');

        // Translate deals if language is not English
        if (lang !== 'en') {
            const translatedDeals = await Promise.all(
                deals.map(deal => TranslationService.translateDeal(deal.toObject(), lang))
            );
            res.json(translatedDeals);
        } else {
            res.json(deals);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all deals
router.get('/', async (req, res) => {
    try {
        const deals = await Deal.find({ expiryDate: { $gt: new Date() } })
            .sort('-createdAt');
        res.json(deals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new deal
router.post('/', async (req, res) => {
    try {
        const deal = new Deal(req.body);
        await deal.save();
        res.status(201).json(deal);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Chat endpoint
router.post('/chat', async (req, res) => {
    const { query, lang = 'en' } = req.body;
    try {
        const response = await ChatbotService.processQuery(query, lang);
        res.json({ response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
