import { subscriberInput } from '../middleware/contracts.js';
import express from 'express';
import { submitNewsletter, unsubscribeNewsletter, confirmNewsletter } from '../controller/newsController.js';
import { emailResendLimiter } from '../middleware/rateLimitMiddleware.js';
const router = express.Router();
router.post('/newsdata', emailResendLimiter, subscriberInput, submitNewsletter);
router.post('/confirm', confirmNewsletter);
router.post('/unsubscribe', unsubscribeNewsletter);
export default router;
