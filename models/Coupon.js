const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    discountPercent: {
        type: Number,
        required: true,
        min: 1,
        max: 99
    },
    validUntil: {
        type: Date,
        required: true
    },
    maxUses: {
        type: Number,
        default: 1
    },
    currentUses: {
        type: Number,
        default: 0
    },
    isRevealed: {
        type: Boolean,
        default: false
    },
    orderId: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Coupon', couponSchema);
