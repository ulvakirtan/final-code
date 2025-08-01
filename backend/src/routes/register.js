const express = require('express');
const bcrypt = require('bcryptjs');
const Student = require('../models/student');
const Image = require('../models/image');
const { generateQRCode } = require('../utils/qrGenerator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use enrollment number to make truly unique as well
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Unified registration endpoint: user info + reference image (multipart/form-data)
router.post('/register', upload.single('image'), async (req, res) => {
  try {
    // User fields in req.body
    const { 
      name, 
      enrollmentNumber, 
      semester, 
      degree, 
      branch, 
      degreeBranch, // backward compatibility
      bloodGroup, 
      email, 
      password, 
      role 
    } = req.body;
    
    // Basic validation
    if (!name || !enrollmentNumber || !bloodGroup || !email || !password || !req.file) {
      return res.status(400).json({ msg: 'Name, enrollment number, blood group, email, password, and reference image are required.' });
    }
    
    // Role-specific validation
    const userRole = role || 'student';
    if (!['student', 'admin', 'security'].includes(userRole)) {
      return res.status(400).json({ msg: 'Invalid role specified.' });
    }
    
    // For students, require semester
    if (userRole === 'student' && !semester) {
      return res.status(400).json({ msg: 'Semester is required for students.' });
    }
    
    // For students and admins, degree and branch are required
    if ((userRole === 'student' || userRole === 'admin')) {
      if (!degree && !degreeBranch) {
        return res.status(400).json({ msg: 'Degree information is required.' });
      }
      if (!branch && !degreeBranch) {
        return res.status(400).json({ msg: 'Branch information is required.' });
      }
    }
    
    // Check for existing user
    let existing = await Student.findOne({ 
      $or: [{ email }, { enrollmentNumber }] 
    });
    if (existing) {
      return res.status(409).json({ msg: 'User with this email or enrollment number already exists.' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create uploads/profiles directory if it doesn't exist
    const profileDir = path.join(__dirname, '../../uploads/profiles');
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }
    
    // Move uploaded file to profiles directory
    const newImagePath = path.join(profileDir, `${enrollmentNumber}-${Date.now()}${path.extname(req.file.originalname)}`);
    fs.renameSync(req.file.path, newImagePath);
    
    // Save image record
    const imgDoc = new Image({
      imgPath: newImagePath
    });
    await imgDoc.save();
    
    // Create user record
    const userData = {
      name,
      enrollmentNumber,
      bloodGroup,
      email,
      passwordHash,
      imageId: imgDoc._id,
      role: userRole
    };
    
    // Add role-specific fields
    if (userRole === 'student') {
      userData.semester = parseInt(semester);
    }
    
    if (userRole === 'student' || userRole === 'admin') {
      userData.degree = degree || degreeBranch;
      userData.branch = branch || degreeBranch;
      userData.degreeBranch = degreeBranch || `${degree} - ${branch}`; // backward compatibility
    }
    
    const user = new Student(userData);
    await user.save();
    
    // Update image record with user ID
    imgDoc.studentId = user._id;
    await imgDoc.save();
    
    // Generate unique QR code
    const qrData = { 
      type: 'campus_entry',
      userId: user._id,
      enrollmentNumber: user.enrollmentNumber,
      role: user.role,
      timestamp: Date.now()
    };
    const qrString = JSON.stringify(qrData);
    const qrUrl = await generateQRCode(qrString);
    
    user.qrCode = qrString;
    await user.save();
    
    res.status(201).json({ 
      msg: 'Registration successful.',
      user: {
        id: user._id,
        name: user.name,
        enrollmentNumber: user.enrollmentNumber,
        email: user.email,
        role: user.role,
        degree: user.degree,
        branch: user.branch,
        semester: user.semester
      },
      qr: qrUrl
    });
    
  } catch (err) {
    console.error('Registration error:', err);
    
    // Clean up uploaded file if registration fails
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
    
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;

