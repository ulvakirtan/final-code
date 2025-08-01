const express = require('express');
const Student = require('../models/student');
const Image = require('../models/image');
const Complaint = require('../models/complaint');
const Alert = require('../models/alert');
const auth = require('../middlewares/auth');
const fs = require('fs');
const router = express.Router();

// Get current user's profile
router.get('/profile', auth(), async (req, res) => {
  try {
    const user = await Student.findById(req.user.id)
      .select('-passwordHash')
      .populate('imageId', 'imgPath');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/profile', auth(), async (req, res) => {
  try {
    const { name, email, bloodGroup, degree, branch, semester } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (bloodGroup) updateData.bloodGroup = bloodGroup;
    if (degree) updateData.degree = degree;
    if (branch) updateData.branch = branch;
    if (semester && req.user.role === 'student') updateData.semester = semester;
    
    const user = await Student.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json({ msg: 'Profile updated successfully', user });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Delete user account
router.delete('/profile', auth(), async (req, res) => {
  try {
    const user = await Student.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Clean up related data
    
    // Delete profile image if exists
    if (user.imageId) {
      const image = await Image.findById(user.imageId);
      if (image && image.imgPath) {
        try {
          fs.unlinkSync(image.imgPath);
        } catch (fsError) {
          console.error('Error deleting image file:', fsError);
        }
      }
      await Image.findByIdAndDelete(user.imageId);
    }
    
    // Delete user's complaints
    await Complaint.deleteMany({ studentId: req.user.id });
    
    // Delete user's alerts
    await Alert.deleteMany({ senderId: req.user.id });
    
    // Delete the user account
    await Student.findByIdAndDelete(req.user.id);
    
    res.json({ msg: 'Account deleted successfully' });
    
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Get current student's profile (backward compatibility)
router.get('/me', auth(), async (req, res) => {
  const user = await Student.findById(req.user.id).select('-passwordHash');
  if (!user) return res.status(404).json({ msg: 'User not found' });
  res.json(user);
});

// List all admin users (for frontend to enable admin targeting in complaints) 
router.get('/admins', auth(), async (req, res) => {
  const admins = await Student.find({ role: 'admin' }).select('_id name email enrollmentNumber');
  res.json(admins);
});

// Get students with filtering (admin only)
router.get('/', auth(['admin']), async (req, res) => {
  try {
    const { role, degree, branch, semester, limit = 50 } = req.query;
    
    let query = {};
    
    if (role) query.role = role;
    if (degree) query.degree = degree;
    if (branch) query.branch = branch;
    if (semester) query.semester = parseInt(semester);
    
    const students = await Student.find(query)
      .select('-passwordHash')
      .sort({ name: 1 })
      .limit(parseInt(limit));
    
    res.json(students);
    
  } catch (error) {
    console.error('Students fetch error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Get student by enrollmentNumber (admin only)
router.get('/:enrollmentNumber', auth('admin'), async (req, res) => {
  const student = await Student.findOne({ enrollmentNumber: req.params.enrollmentNumber }).select('-passwordHash');
  if (!student) return res.status(404).json({ msg: 'Student not found' });
  res.json(student);
});

module.exports = router;

