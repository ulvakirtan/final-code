const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Connect to MongoDB
connectDB();

// Test route
app.get('/', (req, res) => {
  res.json({ msg: 'Campus Safety Alert System API' });
});

// API routes
app.use('/api/register', require('./routes/register'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/student'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/qr', require('./routes/qr'));
app.use('/api/images', require('./routes/image'));
app.use('/api/face', require('./routes/face'));
app.use('/api/alerts', require('./routes/alerts'));

module.exports = app;

