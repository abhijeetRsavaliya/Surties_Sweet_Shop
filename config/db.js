const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Log connection attempt
        console.log('Attempting to connect to MongoDB...');
        
        const conn = await mongoose.connect('mongodb+srv://bookyourshow665:archidi123@cluster0.clhx7ad.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
            serverSelectionTimeoutMS: 5000
        });
        
        console.log('\x1b[32m%s\x1b[0m', 'YES - MongoDB Connected Successfully! ✅');
        console.log('Connected to:', conn.connection.host);
        return conn;
    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', 'NO - MongoDB Connection Failed! ❌');
        console.error('Error:', error.message);
        throw error;
    }
};

module.exports = connectDB;
