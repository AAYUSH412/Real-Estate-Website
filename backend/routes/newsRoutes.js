import express from 'express';
import { submitNewsletter, unsubscribeNewsletter } from '../controller/newsController.js';

const newsrouter = express.Router();

newsrouter.post('/newsdata', submitNewsletter);
newsrouter.post('/unsubscribe', unsubscribeNewsletter);

export default newsrouter;