const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Deal name is required'],
        trim: true
    },
    businessName: {
        type: String,
        required: [true, 'Business name is required'],
        trim: true
    },
    discount: {
        type: Number,
        required: [true, 'Discount percentage is required'],
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%']
    },
    description: {
        type: String,
        required: [true, 'Deal description is required'],
        trim: true
    },
    location: {
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    expiryDate: {
        type: Date,
        required: [true, 'Expiry date is required']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

dealSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Deal', dealSchema);
