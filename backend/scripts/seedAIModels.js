// Explicit initial setup only. Public requests never recreate deleted models.
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config({ path: './.env.local' });
dotenv.config();

try {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  const { seedDefaultModels } = await import('../controller/aiModelController.js');
  await mongoose.connect(process.env.MONGO_URI);
  await seedDefaultModels();
} catch (error) {
  console.error('AI model setup failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
