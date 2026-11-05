// Fills an empty local database with an admin, a verified demo user and sample listings.
// Refuses production, refuses remote databases unless --allow-remote is passed,
// and never changes a database that already has listings or users.
import '../config/environment.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Property from '../models/propertyModel.js';
import User, { Admin } from '../models/userModel.js';

export const DEMO_USER = { name: 'Demo User', email: 'demo@example.com', password: 'Demo12345!' };

const stopWith = message => {
  console.error(message);
  process.exit(1);
};

function isLocalUri(uri) {
  const hosts = uri.match(/^mongodb:\/\/(?:[^@/]*@)?([^/?]+)/)?.[1];
  return !!hosts && hosts.split(',').every(host => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host));
}

const uri = process.env.MONGO_URI;
if (process.env.NODE_ENV === 'production') stopWith('Refusing to seed: NODE_ENV is production.');
if (!uri) stopWith('MONGO_URI is not set. Run "npm run setup" from the repository root first.');
if (!isLocalUri(uri) && !process.argv.includes('--allow-remote')) {
  stopWith('Refusing to seed: MONGO_URI is not a local database. If this is your own empty database, run again with --allow-remote.');
}
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) stopWith('Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env.local first.');

const website = (process.env.WEBSITE_URL || 'http://localhost:5173').replace(/\/$/, '');
const photo = number => `${website}/demo-listings/home-${number}.jpg`;
const listing = (photoNumber, fields) => ({
  ...fields,
  image: [photo(photoNumber)],
  purpose: fields.availability,
  description: `${fields.title}. Sample listing created by the demo seed script.`,
  phone: '+91 90000 00000',
  status: 'active',
  publishedAt: new Date(),
});

const LISTINGS = [
  listing(1, { title: 'Coastal Retreat, 3BHK Sea-Facing Flat', location: 'Marine Drive, Mumbai, Maharashtra', price: 42500000, beds: 3, baths: 3, sqft: 1900, type: 'Flat', availability: 'sale', amenities: ['Sea view', 'Parking', 'Gym'] }),
  listing(2, { title: 'Desert Oasis, 4BHK Villa', location: 'Vastrapur, Ahmedabad, Gujarat', price: 27500000, beds: 4, baths: 4, sqft: 3200, type: 'Villa', availability: 'sale', amenities: ['Garden', 'Parking', 'Security'] }),
  listing(3, { title: 'The Glass Pavilion, 5BHK House', location: 'Whitefield, Bangalore, Karnataka', price: 61000000, beds: 5, baths: 5, sqft: 4800, type: 'House', availability: 'sale', amenities: ['Pool', 'Garden', 'Home office'] }),
  listing(4, { title: 'Skyline Penthouse with City Views', location: 'Banjara Hills, Hyderabad, Telangana', price: 185000, beds: 4, baths: 4, sqft: 3600, type: 'Penthouse', availability: 'rent', amenities: ['Terrace', 'Gym', 'Concierge'] }),
  listing(5, { title: 'Heritage Bungalow, 6BHK', location: 'Boat Club Road, Chennai, Tamil Nadu', price: 45000000, beds: 6, baths: 6, sqft: 5500, type: 'House', availability: 'sale', amenities: ['Courtyard', 'Parking', 'Garden'] }),
  listing(6, { title: 'Bright 2BHK Family Flat', location: 'Koregaon Park, Pune, Maharashtra', price: 42000, beds: 2, baths: 2, sqft: 1050, type: 'Flat', availability: 'rent', amenities: ['Lift', 'Parking', 'Power backup'] }),
  listing(7, { title: 'Modern Studio near Metro', location: 'Saket, New Delhi, Delhi', price: 28000, beds: 1, baths: 1, sqft: 520, type: 'Studio', availability: 'rent', amenities: ['Furnished', 'Metro nearby', 'Security'] }),
];

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const [listings, users] = await Promise.all([Property.countDocuments(), User.countDocuments()]);
  if (listings || users) {
    console.log('This database already has data, so nothing was changed.');
  } else {
    if (!await Admin.exists({ email: process.env.ADMIN_EMAIL })) {
      await new Admin({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }).save();
    }
    await User.create({ name: DEMO_USER.name, email: DEMO_USER.email, password: await bcrypt.hash(DEMO_USER.password, 12), isEmailVerified: true });
    await Property.create(LISTINGS);
    const { seedDefaultModels } = await import('../controller/aiModelController.js');
    await seedDefaultModels().catch(error => console.log(`AI models left unchanged: ${error.message}`));
    console.log(`Added ${LISTINGS.length} sample listings, a demo user and the admin account.`);
    console.log(`  Admin login: ${process.env.ADMIN_EMAIL} (password is ADMIN_PASSWORD in backend/.env.local)`);
    console.log(`  Demo user:   ${DEMO_USER.email} / ${DEMO_USER.password}`);
  }
} catch (error) {
  console.error(`Seeding failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
