const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  enrollmentNumber: {
    type: String,
    required: true,
    unique: true
  },
  semester: {
    type: Number,
    required: function() { return this.role === 'student'; }
  },
  degree: {
    type: String,
    required: function() { return this.role === 'student' || this.role === 'admin'; }
  },
  branch: {
    type: String,
    required: function() { return this.role === 'student' || this.role === 'admin'; }
  },
  degreeBranch: {
    type: String,
    required: false // keeping for backward compatibility
  },
  bloodGroup: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'security'],
    default: 'student'
  },
  qrCode: {
    type: String
  },
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image'
  },
  faceMismatchAlerts: [{
    timestamp: { type: Date, default: Date.now },
    detectedFaceConfidence: { type: Number },
    attempts: { type: Number, default: 1 }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);

