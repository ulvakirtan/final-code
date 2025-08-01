const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/student');
const router = express.Router();

// (Registration now handled by /api/register/register)

// Login student or admin
router.post('/login', async (req, res) => {
  const { enrollmentNumber, email, password } = req.body;
  if (!(enrollmentNumber || email) || !password) {
    return res.status(400).json({ msg: 'Provide enrollment number or email and password.' });
  }
  let query = enrollmentNumber ? { enrollmentNumber } : { email };
  const user = await Student.findOne(query);
  if (!user) return res.status(404).json({ msg: 'User not found.' });
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) return res.status(401).json({ msg: 'Invalid credentials.' });
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'campussecret',
    { expiresIn: '12h' }
  );
  res.json({ token, user: {
    id: user._id,
    name: user.name,
    enrollmentNumber: user.enrollmentNumber,
    email: user.email,
    role: user.role,
    semester: user.semester,
    degreeBranch: user.degreeBranch,
    bloodGroup: user.bloodGroup
  }});
});

module.exports = router;

