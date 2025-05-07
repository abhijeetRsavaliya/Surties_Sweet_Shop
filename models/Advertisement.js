const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    originalPrice: {
        type: Number,
        required: true
    },
    offerPrice: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    validUntil: {
        type: Date,
        required: true,
        validate: {
            validator: function(date) {
                return date > new Date();
            },
            message: 'Validity date must be in the future'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add a virtual for image URL
advertisementSchema.virtual('imageUrl').get(function() {
    if (!this.image) return '';
    return `/uploads/${this.image}`;
});

// Enable virtuals when converting to JSON
advertisementSchema.set('toJSON', { virtuals: true });
advertisementSchema.set('toObject', { virtuals: true });

// Add a method to check if advertisement is valid
advertisementSchema.methods.isValid = function() {
    return this.isActive && new Date() < this.validUntil;
};

// Add an index on validUntil for better query performance
advertisementSchema.index({ validUntil: 1 });

module.exports = mongoose.model('Advertisement', advertisementSchema);
