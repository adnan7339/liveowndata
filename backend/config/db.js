const mongoose = require('mongoose');

let isConnected = false;
let lastError = null;
let connectedAt = null;

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    lastError = 'MONGODB_URI not set in environment';
    console.error('❌ MONGODB_URI is missing. Set it in your .env file.');
    return;
  }
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    isConnected = true;
    connectedAt = new Date();
    lastError = null;
    console.log('✅ MongoDB connected:', mongoose.connection.name);
  } catch (err) {
    isConnected = false;
    lastError = err.message;
    console.error('❌ MongoDB connection error:', err.message);
  }

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️  MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    connectedAt = new Date();
  });
}

function getDbStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    connected: isConnected,
    state: states[mongoose.connection.readyState] || 'unknown',
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
    connectedAt,
    lastError
  };
}

module.exports = { connectDB, getDbStatus };
