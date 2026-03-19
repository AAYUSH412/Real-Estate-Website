import express from 'express';
import { login, register, forgotpassword,adminlogin,resetpassword,getname } from '../controller/userController.js';
import authMiddleware from '../middleware/authMiddleware.js';


const userrouter = express.Router();

userrouter.post('/login', login);
userrouter.post('/register', register);
userrouter.post('/forgot', forgotpassword);
userrouter.post('/reset/:token', resetpassword);
userrouter.post('/admin', adminlogin);
userrouter.get('/me', authMiddleware, getname);

export default userrouter;