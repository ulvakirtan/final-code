const express = require('express');
const Complaint = require('../models/complaint');
const auth = require('../middlewares/auth');
const router = express.Router();

// Student: submit a complaint, can send to one or more admins
router.post('/', auth(), async (req, res) => {
  try {
    const { title, description, adminIds } = req.body;
    if (!title || !description || !Array.isArray(adminIds) || adminIds.length === 0) {
      return res.status(400).json({ msg: 'Title, description, and admin(s) required.' });
    }
    const complaint = new Complaint({
      studentId: req.user.id,
      title,
      description,
      admins: adminIds // this should be an array of admin ObjectId(s)
    });
    await complaint.save();
    res.status(201).json({ msg: 'Complaint submitted.', complaint });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Student: get own complaints (populate admins' names and replies)
router.get('/my', auth(), async (req, res) => {
  const complaints = await Complaint.find({ studentId: req.user.id })
    .populate('admins', 'name email')
    .populate('replies.adminId', 'name email');
  res.json(complaints);
});

// Admin: get all complaints
router.get('/', auth('admin'), async (req, res) => {
  const complaints = await Complaint.find().populate('studentId', 'name enrollmentNumber email');
  res.json(complaints);
});

// Admin: reply to a complaint (if targeted admin)
router.post('/:id/reply', auth('admin'), async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ msg: 'Message required.' });
  // Only allow reply if admin is targeted
  const complaint = await Complaint.findOne({
    _id: req.params.id,
    admins: req.user.id
  });
  if (!complaint) return res.status(404).json({ msg: 'Complaint not found or not assigned to you.' });
  complaint.replies.push({ adminId: req.user.id, message });
  await complaint.save();
  res.json({ msg: 'Reply sent.', replies: complaint.replies });
});

// Admin: update complaint status
router.patch('/:id/status', auth('admin'), async (req, res) => {
  const { status } = req.body;
  const allowed = ['Pending', 'In Progress', 'Resolved'];
  if (!allowed.includes(status)) return res.status(400).json({ msg: 'Invalid status.' });
  const complaint = await Complaint.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  if (!complaint) return res.status(404).json({ msg: 'Complaint not found.' });
  res.json(complaint);
});

module.exports = router;

