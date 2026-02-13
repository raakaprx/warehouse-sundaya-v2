const express = require('express');
const router = express.Router();
const { login, updateProfile, changePassword, getUsers, updateUser, createUser } = require('../controllers/authController');
const { body } = require('express-validator');
const validate = require('../middleware/validateMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', validate([
  body('username').trim().notEmpty().withMessage('Username wajib diisi'),
  body('password').notEmpty().withMessage('Password wajib diisi'),
]), login);

router.put('/profile', authMiddleware(), validate([
  body('email').optional().isEmail().withMessage('Email tidak valid'),
  body('phone').optional().isString().withMessage('Nomor telepon tidak valid')
]), updateProfile);
router.put('/change-password', authMiddleware(), validate([
  body('currentPassword').notEmpty().withMessage('Password saat ini wajib diisi'),
  body('newPassword').notEmpty().withMessage('Password baru wajib diisi')
]), changePassword);

// User Management Routes (PROGRAMMER only)
router.get('/users', authMiddleware(['PROGRAMMER']), getUsers);
router.put('/users/:id', authMiddleware(['PROGRAMMER']), updateUser);
router.post('/register', authMiddleware(['PROGRAMMER']), validate([
  body('username').trim().notEmpty().withMessage('Username wajib diisi'),
  body('password').notEmpty().withMessage('Password wajib diisi'),
  body('role').isIn(['NOC', 'GM', 'OM', 'PROGRAMMER']).withMessage('Role tidak valid')
]), createUser);

module.exports = router;
