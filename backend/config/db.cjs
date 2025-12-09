require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {

  try {

    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!MONGO_URI) {

      throw new Error('MONGO_URI or MONGODB_URI environment variable is not defined');
    }

    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};



module.exports = connectDB;

