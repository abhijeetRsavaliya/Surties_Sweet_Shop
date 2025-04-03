const mongoose = require('mongoose');

const sweetSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true,
        enum: ['kg', 'piece'], // Only allow kg or piece as units
        default: 'kg'
    },
    category: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    discount: {
        percentage: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: false
        }
    },
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        },
        votes: [{
            userId: String,
            rating: Number,
            date: {
                type: Date,
                default: Date.now
            }
        }]
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Sweet', sweetSchema);
