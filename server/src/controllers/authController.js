const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Site, AuditLog } = require('../models');

const SECRET_KEY = process.env.JWT_SECRET;

exports.login = async (req, res) => {
  try {
    if (!SECRET_KEY) {
      return res.status(500).json({ success: false, message: 'JWT secret belum dikonfigurasi' });
    }
    const { username, password } = req.body;

    
    //console.log('Login Attempt:', { email: req.body.email, timestamp: new Date() });

    const user = await User.findOne({ 
      where: { username },
      include: [{ model: Site }]
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kredensial tidak valid.' 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kredensial tidak valid.' 
      });
    }

    // Log the login activity
    await AuditLog.create({
      userId: user.id,
      action: 'LOGIN',
      module: 'AUTH',
      details: `User ${user.username} (${user.role}) login ke sistem`
    });

    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        username: user.username, 
        site: user.Site ? user.Site.name : 'Pusat' 
      }, 
      SECRET_KEY, 
      { expiresIn: '30m' }
    );

    res.json({ 
      success: true,
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        site: user.Site ? user.Site.name : 'Pusat'
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { email, phone } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await user.update({ email, phone });
    res.json({ success: true, message: 'Profil berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'phone', 'role', 'siteId'],
      include: [{ model: Site, attributes: ['id', 'name'] }],
      order: [['username', 'ASC']]
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, siteId, username, email, phone, password } = req.body;
    
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const updates = {};
    if (role) updates.role = role;
    if (siteId !== undefined) updates.siteId = siteId || null; // Allow setting to null
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (password && password.trim() !== '') {
       updates.password = await bcrypt.hash(password, 10);
    }

    await user.update(updates);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { username, password, role, siteId, email, phone } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) return res.status(400).json({ success: false, message: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role,
      siteId: siteId || null,
      email,
      phone
    });

    res.json({ success: true, message: 'User created successfully', data: newUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Password saat ini salah' });

    const hashedPw = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPw });
    res.json({ success: true, message: 'Password berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
