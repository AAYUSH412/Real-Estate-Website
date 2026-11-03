import products from './productRoutes.js';
import users from './userRoutes.js';
import forms from './formRoutes.js';
import news from './newsRoutes.js';
import appointments from './appointmentRoutes.js';
import admin from './adminRoutes.js';
import properties from './propertyRoutes.js';

// Shared with isolated HTTP tests so production paths cannot silently drift.
export function mountApiRoutes(app) {
  for (const [path, router] of [
    ['/api/products', products], ['/api/users', users], ['/api/forms', forms],
    ['/api/news', news], ['/api/appointments', appointments], ['/api/admin', admin], ['/api', properties],
  ]) app.use(path, router);
}
