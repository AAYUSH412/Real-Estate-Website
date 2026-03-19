import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/userModel.js';

// Load environment variables
dotenv.config({ path: './.env.local' });
dotenv.config();

/**
 * Migration script to add status fields to existing users
 * Run this once after deploying the updated User model
 *
 * Usage: node backend/scripts/migrateUserStatus.js
 */
async function migrateUserStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Connected to MongoDB');

    // Update all users that don't have status field
    const result = await User.updateMany(
      { status: { $exists: false } },
      {
        $set: {
          status: 'active',
          lastActive: new Date()
        }
      }
    );

    console.log(`✅ Migration complete: ${result.modifiedCount} user(s) updated with status='active'`);

    // Disconnect
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateUserStatus();
