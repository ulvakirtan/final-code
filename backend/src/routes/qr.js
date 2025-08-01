const express = require('express');
const auth = require('../middlewares/auth');
const Student = require('../models/student');
const { generateQRCode } = require('../utils/qrGenerator');
const router = express.Router();

// Generate QR code for authenticated user
router.post('/generate', auth(), async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ msg: 'Student not found' });
    }

    const qrData = {
      type: 'campus_entry',
      userId: student._id,
      enrollmentNumber: student.enrollmentNumber,
      role: student.role,
      timestamp: Date.now()
    };
    
    const qrString = JSON.stringify(qrData);
    const qrUrl = await generateQRCode(qrString);
    
    // Update student record with QR code
    student.qrCode = qrString;
    await student.save();
    
    res.json({ 
      qr: qrUrl,
      qrData: qrString,
      studentInfo: {
        name: student.name,
        enrollmentNumber: student.enrollmentNumber,
        role: student.role
      }
    });
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Get QR code for logged-in student (contains enrollment number for demo)
router.get('/me', auth(), async (req, res) => {
  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ msg: 'Student not found' });
  const qrData = { id: student._id, enrollmentNumber: student.enrollmentNumber };
  const qrString = JSON.stringify(qrData);
  const qrUrl = await generateQRCode(qrString);
  res.json({ qr: qrUrl });
});

// Scan QR code (for security personnel)
router.post('/scan', auth(['security', 'admin']), async (req, res) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({ msg: 'QR data required' });
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({ msg: 'Invalid QR code format' });
    }
    
    const { enrollmentNumber, userId } = parsedData;
    
    if (!enrollmentNumber && !userId) {
      return res.status(400).json({ msg: 'Invalid QR code data' });
    }
    
    // Find student by enrollment number or ID
    const student = await Student.findOne({
      $or: [
        { enrollmentNumber },
        { _id: userId }
      ]
    });
    
    if (!student) {
      return res.status(404).json({ msg: 'Student not found' });
    }
    
    res.json({
      success: true,
      student: {
        _id: student._id,
        name: student.name,
        enrollmentNumber: student.enrollmentNumber,
        degree: student.degree,
        branch: student.branch,
        semester: student.semester,
        bloodGroup: student.bloodGroup,
        email: student.email,
        role: student.role,
        imageId: student.imageId
      },
      scanTime: new Date(),
      scannedBy: req.user.name
    });
    
  } catch (error) {
    console.error('QR scan error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Admin: get QR for a student by enrollment number
router.get('/:enrollmentNumber', auth('admin'), async (req, res) => {
  const student = await Student.findOne({ enrollmentNumber: req.params.enrollmentNumber });
  if (!student) return res.status(404).json({ msg: 'Student not found' });
  const qrData = { id: student._id, enrollmentNumber: student.enrollmentNumber };
  const qrString = JSON.stringify(qrData);
  const qrUrl = await generateQRCode(qrString);
  res.json({ qr: qrUrl });
});

router.get('/me/download', auth(), async (req, res) => {
  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ msg: 'User not found' });

  // Always generate the QR fresh for max security if needed
  const qrData = { type: student.role, id: student._id };
  const qrString = JSON.stringify(qrData);
  const qrUrl = await generateQRCode(qrString);

  const matches = qrUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3)
    return res.status(500).json({ msg: 'QR code format error' });

  const buffer = Buffer.from(matches[2], 'base64');
  res.setHeader('Content-Disposition', 'attachment; filename="my-campus-qr.png"');
  res.setHeader('Content-Type', 'image/png');
  res.send(buffer);
});

module.exports = router;

