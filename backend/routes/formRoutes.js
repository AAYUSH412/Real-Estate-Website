import { contactInput } from '../middleware/contracts.js';
import express from 'express';
import { submitForm } from '../controller/formController.js';

const router = express.Router();

router.post('/submit', contactInput, submitForm);

export default router;