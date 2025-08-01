const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ulvakirtan:VQcPRxnWCF3wbWIE@ulvakirtan.9x9efnh.mongodb.net/campus_safety?retryWrites=true&w=majority&appName=UlvaKirtan';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Server will continue running without database connection.');
    console.log('Please check your MongoDB Atlas configuration and IP whitelist.');
    // Don't exit process, just log the error
  }
};

module.exports = connectDB;

