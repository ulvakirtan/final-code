const express = require('express');
const auth = require('../middlewares/auth');
const Alert = require('../models/alert');
const Student = require('../models/student');
const router = express.Router();

// Admin/Security: create alert with advanced targeting
router.post('/', auth(['admin', 'security']), async (req, res) => {
  try {
    const { 
      title, 
      message, 
      target, 
      targetFilters, 
      alertType, 
      priority, 
      location 
    } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ msg: 'Title and message required.' });
    }
    
    const alert = new Alert({
      senderId: req.user.id,
      title,
      message,
      target: target || 'all',
      targetFilters: targetFilters || {},
      alertType: alertType || 'general',
      priority: priority || 'medium',
      location
    });
    
    await alert.save();
    
    // TODO: Send real-time notifications via WebSocket
    console.log(`Alert created: ${alertType} - ${priority} priority`);
    
    res.status(201).json({ 
      msg: 'Alert sent successfully.', 
      alert: {
        _id: alert._id,
        title: alert.title,
        message: alert.message,
        alertType: alert.alertType,
        priority: alert.priority,
        createdAt: alert.createdAt
      }
    });
    
  } catch (error) {
    console.error('Alert creation error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Student: Send SOS alert
router.post('/sos', auth(['student']), async (req, res) => {
  try {
    const { title, message, location, adminIds } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ msg: 'Title and message required for SOS.' });
    }
    
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ msg: 'Student not found.' });
    }
    
    let targetFilter = { roles: ['admin'] };
    
    // If specific admin IDs provided, target them specifically
    if (adminIds && Array.isArray(adminIds) && adminIds.length > 0) {
      targetFilter = { specificIds: adminIds };
    }
    
    const sosAlert = new Alert({
      senderId: req.user.id,
      title: `SOS: ${title}`,
      message: `EMERGENCY from ${student.name} (${student.enrollmentNumber}): ${message}`,
      target: 'admins',
      targetFilters: targetFilter,
      alertType: 'sos',
      priority: 'critical',
      location: location || 'Location not provided'
    });
    
    await sosAlert.save();
    
    // TODO: Send immediate real-time notifications
    console.log(`SOS Alert sent by ${student.enrollmentNumber}`);
    
    res.status(201).json({ 
      msg: 'SOS alert sent to administrators.',
      alert: {
        _id: sosAlert._id,
        title: sosAlert.title,
        priority: sosAlert.priority,
        location: sosAlert.location,
        createdAt: sosAlert.createdAt
      }
    });
    
  } catch (error) {
    console.error('SOS alert error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Get alerts for current user (filtered by role and targeting)
router.get('/', auth(), async (req, res) => {
  try {
    const user = await Student.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }
    
    let query = {
      $or: [
        { target: 'all' },
        { target: user.role === 'student' ? 'students' : 'admins' },
        { 'targetFilters.roles': user.role }
      ]
    };
    
    // Add filtering by degree, branch, semester for students
    if (user.role === 'student') {
      query.$or.push(
        { 'targetFilters.degree': user.degree },
        { 'targetFilters.branch': user.branch },
        { 'targetFilters.semester': user.semester }
      );
    }
    
    const alerts = await Alert.find(query)
      .populate('senderId', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(alerts);
    
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Admin: Get all alerts with filtering
router.get('/all', auth(['admin']), async (req, res) => {
  try {
    const { alertType, priority, limit = 100 } = req.query;
    
    let query = {};
    
    if (alertType) {
      query.alertType = alertType;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    const alerts = await Alert.find(query)
      .populate('senderId', 'name enrollmentNumber role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json(alerts);
    
  } catch (error) {
    console.error('Error fetching all alerts:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Get students for targeting (admin only)
router.get('/target-students', auth(['admin']), async (req, res) => {
  try {
    const { degree, branch, semester } = req.query;
    
    let query = { role: 'student' };
    
    if (degree) query.degree = degree;
    if (branch) query.branch = branch;
    if (semester) query.semester = parseInt(semester);
    
    const students = await Student.find(query)
      .select('name enrollmentNumber degree branch semester')
      .sort({ name: 1 });
    
    res.json(students);
    
  } catch (error) {
    console.error('Error fetching target students:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

module.exports = router;

