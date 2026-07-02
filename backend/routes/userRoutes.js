import express from 'express';
import { login, register, forgotpassword, adminlogin, adminRefresh, adminLogout, resetpassword, getname, verifyEmail, updateProfile } from '../controller/userController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { registrationLimiter, loginLimiter, passwordResetLimiter, passwordResetVerifyLimiter } from '../middleware/rateLimitMiddleware.js';


const userrouter = express.Router();

userrouter.post('/login', loginLimiter, login);
userrouter.post('/register', registrationLimiter, register);
userrouter.get('/verify/:token', verifyEmail);  // Email verification endpoint
userrouter.post('/forgot', passwordResetLimiter, forgotpassword);
userrouter.post('/reset/:token', passwordResetVerifyLimiter, resetpassword);
userrouter.post('/admin', loginLimiter, adminlogin);
userrouter.post('/admin/refresh', adminRefresh);
userrouter.post('/admin/logout', adminLogout);
userrouter.get('/me', authMiddleware, getname);
userrouter.put('/me', authMiddleware, updateProfile);

export default userrouter;