const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student', // May be admin or security
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  alertType: {
    type: String,
    enum: ['general', 'emergency', 'sos', 'face_mismatch'],
    default: 'general'
  },
  target: {
    type: String, // 'all', 'students', 'admins', or comma-separated enrollmentNumbers/userIds
    default: 'all'
  },
  targetFilters: {
    degree: [String], // Filter by degree(s)
    branch: [String], // Filter by branch(es)
    semester: [Number], // Filter by semester(s)
    roles: [String] // Filter by roles
  },
  location: {
    type: String // For SOS alerts
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Alert', AlertSchema);

