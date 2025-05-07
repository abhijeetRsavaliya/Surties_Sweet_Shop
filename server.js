require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const multer = require('multer');
const path = require('path');
const Sweet = require('./models/Sweet');
const fs = require('fs');
const Order = require('./models/Order');
const HelpRequest = require('./models/HelpRequest');
const Advertisement = require('./models/Advertisement');
const session = require('express-session');
const { sendHelpRequestEmail } = require('./services/mailService');
const fsPromises = require('fs').promises;
const WebSocket = require('ws');
const axios = require('axios');
const nodemailer = require('nodemailer');

const app = express();
const wss = new WebSocket.Server({ port: 8080 });

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'help.infosurties@gmail.com',
        pass: 'dgqa uetp eflb smmn'
    }
});

// Update the server startup code
const startServer = async (retries = 0) => {
    const maxRetries = 3;
    const ports = [5000, 5001, 5002, 5003]; // Alternative ports
    
    try {
        const PORT = process.env.PORT || ports[retries];
        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.log(`Port ${PORT} is busy, trying next port...`);
                if (retries < maxRetries) {
                    server.close();
                    startServer(retries + 1);
                } else {
                    console.error('No available ports found after maximum retries');
                    process.exit(1);
                }
            } else {
                console.error('Server error:', error);
                process.exit(1);
            }
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

// Update MongoDB connection code
connectDB()
    .then(() => {
        startServer();
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    });

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    next();
});

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use(express.static('public'));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// Configure session middleware with more secure settings
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Add auth check endpoint
app.get('/admin-auth-check', (req, res) => {
    if (req.session && req.session.isAdminAuthenticated) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// Update admin authentication middleware
const adminAuth = (req, res, next) => {
    if (req.session && req.session.isAdminAuthenticated) {
        next();
    } else {
        res.redirect('/admin-login');
    }
};

// Update admin routes
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.post('/admin-auth', express.json(), (req, res) => {
    const { adminId, adminPass } = req.body;
    if (adminId === 'admin' && adminPass === 'admin@#123') {
        req.session.isAdminAuthenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

app.get('/admin', adminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin-logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin-login');
});

app.post('/api/sweets', adminAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image file uploaded' });
        }

        if (!req.body.name || !req.body.description || !req.body.price || !req.body.category) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        const newSweet = new Sweet({
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            category: req.body.category,
            image: `/uploads/${req.file.filename}`,
            discount: {
                percentage: req.body.discountPercentage || 0,
                isActive: req.body.discountActive === 'true'
            }
        });

        const sweet = await newSweet.save();
        res.status(200).json({ success: true, data: sweet });
    } catch (error) {
        console.error('Error saving sweet:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update the discount endpoint to handle errors better
app.put('/api/sweets/:id/discount', adminAuth, async (req, res) => {
    try {
        const discountPercentage = Number(req.body.percentage);
        const isActive = Boolean(req.body.isActive);

        if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid discount percentage' 
            });
        }

        const updatedSweet = await Sweet.findByIdAndUpdate(
            req.params.id,
            { 
                discount: { 
                    percentage: discountPercentage, 
                    isActive: isActive 
                } 
            },
            { new: true }
        );

        if (!updatedSweet) {
            return res.status(404).json({ 
                success: false, 
                error: 'Sweet not found' 
            });
        }

        res.json({ success: true, data: updatedSweet });

    } catch (error) {
        console.error('Discount update error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Add new rating update endpoint
app.put('/api/sweets/:id/rate', async (req, res) => {
    try {
        const { userId, rating } = req.body;
        const sweetId = req.params.id;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, error: 'Invalid rating' });
        }

        const sweet = await Sweet.findById(sweetId);
        if (!sweet) {
            return res.status(404).json({ success: false, error: 'Sweet not found' });
        }

        // Check if user already rated
        const existingVote = sweet.ratings.votes.find(v => v.userId === userId);
        if (existingVote) {
            existingVote.rating = rating;
            existingVote.date = new Date();
        } else {
            sweet.ratings.votes.push({ userId, rating });
        }

        // Update average rating
        const totalRating = sweet.ratings.votes.reduce((sum, vote) => sum + vote.rating, 0);
        sweet.ratings.average = totalRating / sweet.ratings.votes.length;
        sweet.ratings.count = sweet.ratings.votes.length;

        await sweet.save();
        res.json({ success: true, data: sweet });

    } catch (error) {
        console.error('Rating update error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Update order endpoint
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        
        // Create new order
        const newOrder = new Order({
            ...orderData,
            orderDate: new Date(),
            status: orderData.paymentMethod === 'cod' ? 'pending' : 'confirmed'
        });

        const savedOrder = await newOrder.save();
        
        res.status(201).json({
            success: true,
            data: savedOrder
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const status = req.query.status;
        let query = {};
        
        if (status === 'active') {
            query.status = { $ne: 'delivered' };
        } else if (status === 'delivered') {
            query.status = 'delivered';
        }
        
        const orders = await Order.find(query)
            .sort({ orderDate: -1 })
            .catch(err => {
                console.error('Database query error:', err);
                throw new Error('Failed to fetch orders');
            });

        res.json(orders);
    } catch (error) {
        console.error('Error in /api/orders:', error);
        res.status(500).json({ 
            error: error.message || 'Internal server error',
            success: false
        });
    }
});

// Update order status endpoint with email notification
app.put('/api/orders/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        order.status = status;
        await order.save();

        // Send email notification
        if (order.customerDetails?.email) {
            let emailSubject = 'Order Status Update - Surties Sweet Shop';
            let emailText = '';

            switch (status) {
                case 'processing':
                    emailText = 'Your order is in process, HAPPY CUSTOMER BY SURTIES SWEET.';
                    break;
                case 'shipped':
                    emailText = 'Your order has been shipped, HAPPY CUSTOMER BY SURTIES SWEET.';
                    break;
                case 'delivered':
                    emailText = 'Your order has been delivered, HAPPY CUSTOMER BY SURTIES SWEET.';
                    break;
            }

            if (emailText) {
                await transporter.sendMail({
                    from: 'help.infosurties@gmail.com',
                    to: order.customerDetails.email,
                    subject: emailSubject,
                    text: emailText,
                    html: `
                        <div style="padding: 20px; background-color: #f8f9fa; border-radius: 10px;">
                            <h2 style="color: #ff4757;">Surties Sweet Shop</h2>
                            <p style="font-size: 16px; color: #2d3436;">${emailText}</p>
                            <p style="margin-top: 20px;">Order ID: ${order.orderId}</p>
                            <hr style="border-color: #dfe6e9;">
                            <p style="font-size: 14px; color: #636e72;">Thank you for shopping with us!</p>
                        </div>
                    `
                });
            }
        }

        res.json({ 
            success: true, 
            message: 'Order status updated successfully'
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, error: 'Failed to update order status' });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update order tracking endpoint
app.get('/api/orders/:id', async (req, res) => {
    try {
        const trackingId = req.params.id;
        
        // Get current date and 7 days ago date
        const currentDate = new Date();
        const sevenDaysAgo = new Date(currentDate.getTime() - (7 * 24 * 60 * 60 * 1000));

        // Find order by either order ID or payment ID
        const order = await Order.findOne({
            $or: [
                { orderId: trackingId },
                { paymentId: trackingId }
            ]
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Check if order is within 7 days
        if (order.orderDate < sevenDaysAgo) {
            return res.status(400).json({
                success: false,
                error: 'Tracking expired'
            });
        }

        res.json({
            success: true,
            order: {
                orderId: order.orderId,
                paymentId: order.paymentId,
                orderDate: order.orderDate,
                status: order.status || 'pending',
                paymentMethod: order.paymentMethod,
                validUntil: new Date(order.orderDate.getTime() + (7 * 24 * 60 * 60 * 1000))
            }
        });

    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order details'
        });
    }
});

app.get('/api/sweets', async (req, res) => {
    try {
        const sweets = await Sweet.find({});
        res.json(sweets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/sweets/:id', adminAuth, async (req, res) => {
    try {
        // Find the sweet first to get the image path
        const sweet = await Sweet.findById(req.params.id);
        if (!sweet) {
            return res.status(404).json({ error: 'Sweet not found' });
        }

        // Remove the image file
        const imagePath = path.join(__dirname, 'public', sweet.image);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        // Delete from database
        await Sweet.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Sweet deleted successfully' });
    } catch (error) {
        console.error('Error deleting sweet:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

// Add new route for tracking page
app.get('/tracking', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tracking.html'));
});

// Update routes for About and Contact pages
app.get('/about.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// Add new route for favorites page
app.get('/favorites.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favorites.html'));
});

// Add new route for offers page
app.get('/offers', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'offers.html'));
});

// Add new route for offers page
app.get('/offers-page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'offers-page.html'));
});

// Create help requests directory if it doesn't exist
const helpRequestsDir = path.join(__dirname, 'data');
const helpRequestsFile = path.join(helpRequestsDir, 'help-requests.json');

async function initializeHelpRequests() {
    try {
        await fs.promises.mkdir(helpRequestsDir, { recursive: true });
        try {
            await fs.promises.access(helpRequestsFile);
        } catch {
            await fs.promises.writeFile(helpRequestsFile, '[]');
        }
    } catch (error) {
        console.error('Error initializing help requests:', error);
    }
}

initializeHelpRequests();

// Update help request endpoint
app.post('/api/help-request', async (req, res) => {
    console.log('Received help request at:', new Date().toISOString());
    console.log('Request body:', req.body);

    try {
        const helpData = {
            ...req.body,
            timestamp: new Date().toISOString()
        };
        
        // Validate required fields
        if (!helpData.name || !helpData.email || !helpData.message) {
            console.error('Missing required fields in help request');
            throw new Error('Name, email, and message are required');
        }

        // First try to send email
        console.log('Attempting to send email...');
        const emailResult = await sendHelpRequestEmail(helpData);
        console.log('Email send result:', emailResult);

        if (!emailResult.success) {
            throw new Error(emailResult.error || 'Failed to send email');
        }

        // Then save to JSON file
        try {
            console.log('Saving help request to file...');
            const helpRequestsFile = path.join(__dirname, 'data', 'help-requests.json');
            let existingRequests = [];
            
            if (fs.existsSync(helpRequestsFile)) {
                existingRequests = JSON.parse(await fsPromises.readFile(helpRequestsFile, 'utf8'));
            }
            
            existingRequests.push(helpData);
            await fsPromises.writeFile(helpRequestsFile, JSON.stringify(existingRequests, null, 2));
            console.log('Help request saved to file successfully');
        } catch (fileError) {
            console.error('Error saving to file:', fileError);
            // Continue even if file save fails
        }

        res.json({ 
            success: true, 
            message: 'Help request received and email sent successfully',
            emailId: emailResult.messageId
        });
    } catch (error) {
        console.error('Help request error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to process help request' 
        });
    }
});

// Get help requests endpoint - Remove adminAuth middleware temporarily for testing
app.get('/api/help-requests', async (req, res) => {
    try {
        const requests = await HelpRequest.find().sort({ createdAt: -1 });
        console.log('Retrieved help requests:', requests);
        res.json(requests);
    } catch (error) {
        console.error('Error fetching help requests:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch help requests' });
    }
});

// Update help request status endpoint
app.put('/api/help-requests/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedRequest = await HelpRequest.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedRequest) {
            return res.status(404).json({
                success: false,
                error: 'Help request not found'
            });
        }

        res.json({
            success: true,
            data: updatedRequest
        });

    } catch (error) {
        console.error('Error updating help request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update help request'
        });
    }
});

// Add response endpoint
app.post('/api/help-requests/:id/respond', async (req, res) => {
    try {
        const { id } = req.params;
        const { response } = req.body;

        const helpRequest = await HelpRequest.findByIdAndUpdate(
            id,
            {
                response,
                responseDate: new Date(),
                status: 'resolved'
            },
            { new: true }
        );

        if (!helpRequest) {
            return res.status(404).json({
                success: false,
                error: 'Help request not found'
            });
        }

        res.json({
            success: true,
            data: helpRequest
        });

    } catch (error) {
        console.error('Error updating help request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update help request'
        });
    }
});

// Add endpoint to delete help request
app.delete('/api/help-requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await HelpRequest.findByIdAndDelete(id);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Help request not found'
            });
        }

        res.json({
            success: true,
            message: 'Help request deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting help request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete help request'
        });
    }
});

// Add endpoint for refund processing
app.post('/api/refund/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Add your refund logic here based on payment gateway
        // For Razorpay, you would call their refund API

        order.status = 'refunded';
        await order.save();

        res.json({ success: true, message: 'Refund processed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update advertisement routes with better error handling
app.get('/api/advertisements', async (req, res) => {
    try {
        const now = new Date();
        
        // Find and delete expired advertisements
        await Advertisement.deleteMany({ validUntil: { $lt: now } });

        // Get remaining active advertisements
        const advertisements = await Advertisement.find({ 
            validUntil: { $gte: now },
            isActive: true 
        });

        res.json({ success: true, data: advertisements });
    } catch (error) {
        console.error('Error fetching advertisements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch advertisements'
        });
    }
});

app.post('/api/advertisements', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Image is required' });
        }

        const advertisement = new Advertisement({
            title: req.body.title,
            description: req.body.description,
            originalPrice: req.body.originalPrice,
            offerPrice: req.body.offerPrice,
            validUntil: req.body.validUntil,
            image: req.file.filename // Save just the filename
        });

        await advertisement.save();
        res.json({ success: true, data: advertisement });
    } catch (error) {
        console.error('Error creating advertisement:', error);
        res.status(500).json({ success: false, error: 'Failed to create advertisement' });
    }
});

app.delete('/api/advertisements/:id', adminAuth, async (req, res) => {
    try {
        const ad = await Advertisement.findById(req.params.id);
        if (!ad) {
            return res.status(404).json({ success: false, error: 'Advertisement not found' });
        }

        const imagePath = path.join(__dirname, 'public', ad.image);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        await Advertisement.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Advertisement deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});
