import { listSessions, revokeSession } from '../controller/sessionController.js';
import { validId } from '../middleware/contracts.js';
import { authInput } from '../middleware/contracts.js';
import express from 'express';
import { login, register, forgotpassword, adminlogin, adminRefresh, adminLogout, resetpassword, getname, verifyEmail, updateProfile, userRefresh, logout, resendVerification } from '../controller/userController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { registrationLimiter, loginLimiter, passwordResetLimiter, passwordResetVerifyLimiter, emailResendLimiter } from '../middleware/rateLimitMiddleware.js';


const userrouter = express.Router();
userrouter.param('id', validId);
userrouter.param('token', (req, res, next, token) => /^[a-f\d]{64}$/i.test(token) ? next() : res.status(400).json({ success: false, code: 'INVALID_INPUT', message: 'Invalid token' }));
userrouter.get('/sessions', authMiddleware, listSessions);
userrouter.delete('/sessions/:id', authMiddleware, revokeSession);

userrouter.post('/login', loginLimiter, authInput('login'), login);
userrouter.post('/register', registrationLimiter, authInput('register'), register);
userrouter.get('/verify/:token', verifyEmail);
userrouter.post('/resend-verification', emailResendLimiter, authInput('email'), resendVerification);
userrouter.post('/forgot', passwordResetLimiter, authInput('email'), forgotpassword);
userrouter.post('/reset/:token', passwordResetVerifyLimiter, authInput('reset'), resetpassword);
userrouter.post('/admin', loginLimiter, authInput('login'), adminlogin);
userrouter.post('/admin/refresh', adminRefresh);
userrouter.post('/admin/logout', adminLogout);
userrouter.post('/refresh', userRefresh);
userrouter.post('/logout', logout);
userrouter.get('/me', authMiddleware, getname);
userrouter.put('/me', authMiddleware, authInput('profile'), updateProfile);

export default userrouter;