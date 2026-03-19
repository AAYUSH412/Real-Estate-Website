import express from 'express';
import { submitNewsletter } from '../controller/newsController.js';

const newsrouter = express.Router();

newsrouter.post('/newsdata', submitNewsletter);

export default newsrouter;