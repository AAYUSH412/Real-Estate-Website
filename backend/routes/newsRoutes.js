import { subscriberInput } from '../middleware/contracts.js';
import express from 'express';
import { submitNewsletter, unsubscribeNewsletter } from '../controller/newsController.js';

const newsrouter = express.Router();

newsrouter.post('/newsdata', subscriberInput, submitNewsletter);
newsrouter.post('/unsubscribe', subscriberInput, unsubscribeNewsletter);

export default newsrouter;