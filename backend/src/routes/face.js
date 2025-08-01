const express = require('express');
const auth = require('../middlewares/auth');
const Student = require('../models/student');
const Image = require('../models/image');
const Alert = require('../models/alert');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { compareFaces, analyzeFailedAttempts } = require('../utils/faceRecognition');

const router = express.Router();

// Set up temporary storage for live images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/live'));
  },
  filename: function (req, file, cb) {
    cb(null, req.user.id + '-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// POST /api/face/verify - Enhanced face verification with mismatch detection
router.post('/verify', auth(), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No live image provided.' });
    }

    const student = await Student.findById(req.user.id);
    if (!student || !student.imageId) {
      return res.status(400).json({ msg: 'Profile image not found.' });
    }

    const refImage = await Image.findById(student.imageId);
    if (!refImage) {
      return res.status(400).json({ msg: 'Reference image missing.' });
    }

    // Perform face comparison
    const result = await compareFaces(refImage.imgPath, req.file.path);
    
    // Handle face mismatch
    if (result.success && !result.match) {
      // Add mismatch alert to student record
      student.faceMismatchAlerts.push({
        timestamp: new Date(),
        detectedFaceConfidence: result.confidence,
        attempts: 1
      });
      
      await student.save();
      
      // Analyze if this is suspicious behavior
      const analysis = await analyzeFailedAttempts(student._id, student.faceMismatchAlerts);
      
      if (analysis.isSuspicious) {
        // Create alert for administrators
        const alert = new Alert({
          senderId: student._id,
          title: 'Face Recognition Mismatch Alert',
          message: `Multiple failed face recognition attempts detected for student ${student.name} (${student.enrollmentNumber}). ${analysis.attemptCount} attempts in the last ${analysis.timeWindow} minutes.`,
          alertType: 'face_mismatch',
          target: 'admins',
          targetFilters: {
            roles: ['admin']
          },
          priority: 'high'
        });
        
        await alert.save();
        
        // TODO: Send real-time notification to admins via WebSocket
        console.log(`Face mismatch alert created for student ${student.enrollmentNumber}`);
      }
    }
    
    // Clean up live image after processing
    setTimeout(() => {
      try {
        fs.unlinkSync(req.file.path);
      } catch (error) {
        console.error('Error deleting temporary image:', error);
      }
    }, 10000);
    
    res.json({
      ...result,
      enrollmentNumber: student.enrollmentNumber,
      studentName: student.name
    });
    
  } catch (err) {
    console.error('Face verification error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// POST /api/face/verify-qr - Face verification triggered by QR scan (for security personnel)
router.post('/verify-qr', auth(['security', 'admin']), upload.single('liveImage'), async (req, res) => {
  try {
    const { enrollmentNumber } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ msg: 'No live image provided.' });
    }
    
    if (!enrollmentNumber) {
      return res.status(400).json({ msg: 'Enrollment number required.' });
    }
    
    // Find student by enrollment number
    const student = await Student.findOne({ enrollmentNumber });
    if (!student) {
      return res.status(404).json({ msg: 'Student not found.' });
    }
    
    if (!student.imageId) {
      return res.status(400).json({ msg: 'Student profile image not found.' });
    }
    
    const refImage = await Image.findById(student.imageId);
    if (!refImage) {
      return res.status(400).json({ msg: 'Reference image missing.' });
    }
    
    // Perform face comparison
    const result = await compareFaces(refImage.imgPath, req.file.path);
    
    // Log the verification attempt
    console.log(`QR-triggered face verification for ${student.enrollmentNumber}: ${result.match ? 'MATCH' : 'MISMATCH'}`);
    
    // Clean up live image
    setTimeout(() => {
      try {
        fs.unlinkSync(req.file.path);
      } catch (error) {
        console.error('Error deleting temporary image:', error);
      }
    }, 5000);
    
    res.json({
      ...result,
      student: {
        name: student.name,
        enrollmentNumber: student.enrollmentNumber,
        degree: student.degree,
        branch: student.branch,
        semester: student.semester
      },
      verifiedBy: req.user.name,
      verificationTime: new Date()
    });
    
  } catch (err) {
    console.error('QR face verification error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// GET /api/face/mismatch-alerts - Get face mismatch alerts for admins
router.get('/mismatch-alerts', auth(['admin']), async (req, res) => {
  try {
    const alerts = await Alert.find({ alertType: 'face_mismatch' })
      .populate('senderId', 'name enrollmentNumber email')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(alerts);
    
  } catch (err) {
    console.error('Error fetching mismatch alerts:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;

