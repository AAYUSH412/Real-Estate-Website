import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseListing, parsePage, password, safeUrl, bookingInstant, email, reviewCommand } from '@buildestate/contracts';

test('shared contracts reject lossy numbers, malformed URLs and bcrypt truncation', () => {
  for (const limit of [[], {}, '1junk', 1.2, 0, -1, Infinity, 101]) assert.throws(() => parsePage({ limit }));
  assert.deepEqual(parsePage({ page: '2', limit: '20' }), { page: 2, limit: 20, skip: 20 });
  assert.throws(() => password('😀'.repeat(19)));
  assert.throws(() => safeUrl('javascript:alert(1)', 'meetingLink'));
  assert.throws(() => safeUrl('https://maps.google.com.evil.test/', 'googleMapLink', true));
  assert.throws(() => safeUrl('https://user:secret@google.com', 'googleMapLink', true));
  assert.throws(() => bookingInstant('2026-02-30', '10:00'));
  assert.throws(() => bookingInstant('2026-12-01', '10:00 AM'));
  assert.equal(email(' OWNER@EXAMPLE.COM '), 'owner@example.com');
  assert.deepEqual(reviewCommand({ version: 3 }, ' Fix photos '), { expectedVersion: 3, reason: 'Fix photos' });
});

test('listing contracts normalize aliases and keep purpose separate from market state', () => {
  const input = { title: 'Home', location: 'Pune', price: '100', beds: '2', baths: '1', sqft: '1000', type: 'Apartment', availability: 'buy', description: 'Home for sale', phone: '+919999999999', amenities: '["Gym","Gym"]' };
  const result = parseListing(input);
  assert.equal(result.type, 'Flat'); assert.equal(result.purpose, 'sale'); assert.equal(result.price, 100); assert.deepEqual(result.amenities, ['Gym']);
  for (const body of [{ ...input, status: 'active' }, { ...input, price: '1e5' }, { ...input, price: true }, { ...input, beds: 1.5 }, { ...input, purpose: 'rent' }, { ...input, type: 'Castle' }]) assert.throws(() => parseListing(body));
});
