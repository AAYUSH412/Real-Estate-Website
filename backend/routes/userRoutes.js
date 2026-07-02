import express from 'express';
import { login, register, forgotpassword, adminlogin, adminRefresh, adminLogout, resetpassword, getname, verifyEmail } from '../controller/userController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { registrationLimiter, loginLimiter, passwordResetLimiter } from '../middleware/rateLimitMiddleware.js';


const userrouter = express.Router();

userrouter.post('/login', loginLimiter, login);
userrouter.post('/register', registrationLimiter, register);
userrouter.get('/verify/:token', verifyEmail);  // Email verification endpoint
userrouter.post('/forgot', passwordResetLimiter, forgotpassword);
userrouter.post('/reset/:token', resetpassword);
userrouter.post('/admin', loginLimiter, adminlogin);
userrouter.post('/admin/refresh', adminRefresh);
userrouter.post('/admin/logout', adminLogout);
userrouter.get('/me', authMiddleware, getname);

export default userrouter;