const mongoose = require('mongoose');

const connectDb = async () => {
    try {
        // Try remote MongoDB Atlas first with better configuration
        const mongoOptions = {
            retryWrites: true,
            w: 'majority',
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };
        
        await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
        console.log('✅ MongoDB connected (Atlas)');
    } catch (error) {
        console.error('❌ Atlas MongoDB connection error:', error.message);
        
        // Fallback to local MongoDB
        try {
            await mongoose.connect('mongodb://127.0.0.1:27017/whatsapp_clone', {
                connectTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            console.log('✅ MongoDB connected (Local)');
        } catch (localError) {
            console.error('❌ Local MongoDB connection error:', localError.message);
            
            // Try with default local connection
            try {
                await mongoose.connect('mongodb://localhost:27017/whatsapp_clone');
                console.log('✅ MongoDB connected (localhost)');
            } catch (fallbackError) {
                console.error('❌ All MongoDB connections failed');
                console.log('📝 Continuing without database connection...');
                console.log('📝 Install MongoDB locally or check Atlas connection');
            }
        }
    }
};

module.exports = connectDb;
