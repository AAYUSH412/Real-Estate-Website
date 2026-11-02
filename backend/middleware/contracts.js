import { ContractError, id, object, parsePage, keys, text, number, email, password, phone } from '@buildestate/contracts';
import { respondError } from '../utils/httpErrors.js';

export const validate = fn => (req, res, next) => { try { fn(req); next(); } catch (error) { respondError(res, error); } };
export const validId = (req, res, next, value) => { try { id(value); next(); } catch (error) { respondError(res, error); } };
export const validateBody = validate(req => object(req.body));
export const validatePage = validate(req => parsePage(req.query));
export const bodyId = field => validate(req => id(req.body[field], field));

export function authInput(kind) {
  return validate(req => {
    const allowed = { login: ['email', 'password', 'rememberMe'], register: ['name', 'email', 'password'], email: ['email'], reset: ['password'], profile: ['name', 'currentPassword', 'newPassword'] }[kind];
    keys(req.body, allowed);
    if (['login', 'register', 'email'].includes(kind)) req.body.email = email(req.body.email);
    if (kind === 'login') {
      text(req.body.password, 'password', { max: 1024 });
      if (req.body.rememberMe !== undefined && typeof req.body.rememberMe !== 'boolean') throw new ContractError('rememberMe must be boolean', 'rememberMe');
    }
    if (['register', 'reset'].includes(kind)) password(req.body.password);
    if (kind === 'register' || (kind === 'profile' && req.body.name !== undefined)) req.body.name = text(req.body.name, 'name', { max: 120 });
    if (kind === 'profile' && req.body.newPassword !== undefined) {
      password(req.body.newPassword, 'newPassword'); text(req.body.currentPassword, 'currentPassword', { max: 1024 });
    }
  });
}

export const contactInput = validate(req => {
  keys(req.body, ['name', 'email', 'phone', 'message']);
  req.body = { name: text(req.body.name, 'name', { max: 120 }), email: email(req.body.email), phone: phone(req.body.phone, true), message: text(req.body.message, 'message', { max: 5000 }) };
});
export const subscriberInput = validate(req => {
  keys(req.body, ['email']); req.body.email = email(req.body.email);
});
export const aiInput = frontend => validate(req => {
  const fields = frontend ? ['city', 'locality', 'bhk', 'possession', 'price', 'type', 'category', 'model', 'limit'] : ['city', 'locality', 'bhk', 'possession', 'minPrice', 'maxPrice', 'propertyType', 'propertyCategory', 'model', 'limit'];
  keys(req.body, fields);
  for (const field of ['city', 'locality', 'bhk', 'possession', 'type', 'category', 'propertyType', 'propertyCategory', 'model']) if (req.body[field] !== undefined && req.body[field] !== null) req.body[field] = text(req.body[field], field, { min: ['locality', 'city'].includes(field) ? 0 : 1, max: 120 });
  if (req.body.limit !== undefined) req.body.limit = number(req.body.limit, 'limit', { min: 1, max: 20, integer: true });
  if (frontend && req.body.price !== undefined) {
    keys(req.body.price, ['min', 'max']);
    for (const field of ['min', 'max']) if (req.body.price[field] !== undefined) req.body.price[field] = number(req.body.price[field], `price.${field}`);
    if (req.body.price.min > req.body.price.max) throw new ContractError('Invalid price range', 'price');
  }
  for (const field of ['minPrice', 'maxPrice']) if (req.body[field] !== undefined) req.body[field] = number(req.body[field], field, { max: 100000 });
  if (req.body.minPrice > req.body.maxPrice) throw new ContractError('Invalid price range', 'minPrice');
});
