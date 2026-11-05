# API reference

Base address: `http://localhost:4000` locally. All responses are JSON, except the AI search stream and CSV export.

**Access** means:

- **Public:** no login needed
- **User:** needs `Authorization: Bearer <token>` from a user login
- **Admin:** needs the same header with a token from an admin login

Admin request and response details are in the [admin API contracts](../backend/docs/admin-api-contracts.md).

## Health

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Is the server running? |
| GET | `/health/ready` | Public | Is the database connected? |

## Users: `/api/users`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/register` | Public | Create an account |
| GET | `/verify/:token` | Public | Verify an email address |
| POST | `/resend-verification` | Public | Send a new verification link |
| POST | `/login` | Public | Sign in |
| POST | `/refresh` | Cookie | Get a new access token |
| POST | `/logout` | Public | Sign out |
| GET | `/me` | User | Read your profile |
| PUT | `/me` | User | Update your profile |
| GET | `/sessions` | User | List your signed-in devices |
| DELETE | `/sessions/:id` | User | Sign out a device |
| POST | `/forgot` | Public | Request a password reset |
| POST | `/reset/:token` | Public | Set a new password |
| POST | `/admin` | Public | Admin sign in |
| POST | `/admin/refresh` | Cookie | Get a new admin token |
| POST | `/admin/logout` | Cookie | Admin sign out |

## Properties: `/api/products`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/list` | Public | List listings |
| GET | `/single/:id` | Public | Read one listing |
| POST | `/add` | Admin | Create a listing with photos |
| POST | `/update` | Admin | Update a listing |
| POST | `/remove` | Admin | Remove a listing |

## Your listings: `/api/user/properties`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/` | User | Submit a listing for review (up to 4 photos) |
| GET | `/` | User | List your listings |
| GET | `/:id` | User | Read one of your listings |
| PUT | `/:id` | User | Edit your listing |
| DELETE | `/:id` | User | Delete your listing |

## Appointments: `/api/appointments`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/schedule` | Public | Request a viewing as a guest |
| POST | `/schedule/auth` | User | Request a viewing while signed in |
| GET | `/user` | User | List your appointments |
| GET | `/upcoming` | User | List your upcoming appointments |
| PUT | `/cancel/:id` | User | Cancel an appointment |
| PUT | `/feedback/:id` | User | Leave feedback |
| GET | `/all` | Admin | List all appointments |
| GET | `/stats` | Admin | Appointment numbers |
| PUT | `/status` | Admin | Change a status |
| PUT | `/update-meeting` | Admin | Set a meeting link |

## AI and locations: `/api`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/ai/models` | Public | List active AI models |
| POST | `/ai/validate-keys` | Public | Check a user's API key |
| POST | `/ai/search` | Firecrawl key | AI search, streamed with Server-Sent Events |
| POST | `/properties/search` | Firecrawl key | AI search, single response |
| GET | `/ai/localities` | Public | Suggest localities |
| GET | `/locations/:city/trends` | Firecrawl key | Price trends for a city |

Send the Firecrawl key in the `X-Firecrawl-Key` header.

## Contact and newsletter

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/forms/submit` | Public | Send a contact message |
| POST | `/api/news/newsdata` | Public | Subscribe to the newsletter |
| POST | `/api/news/confirm` | Public | Confirm a subscription |
| POST | `/api/news/unsubscribe` | Public | Unsubscribe |

## Admin: `/api/admin`

Everything here requires an admin token.

| Area | Endpoints |
| --- | --- |
| **Session** | `GET /session` |
| **Dashboard** | `GET /stats`, `GET /stats/users`, `GET /stats/properties`, `GET /stats/overview` |
| **Properties** | `GET /properties`, `GET /properties/pending`, `GET /properties/:id`, `PUT /properties/:id/approve`, `PUT /properties/:id/reject`, `POST /properties/bulk-approve`, `POST /properties/bulk-reject`, `POST /properties/bulk-delete` |
| **Users** | `GET /users`, `GET /users/:id`, `PUT /users/:id/suspend`, `PUT /users/:id/ban`, `PUT /users/:id/unban`, `DELETE /users/:id`, `POST /users/bulk-suspend`, `POST /users/bulk-ban` |
| **Appointments** | `GET /appointments`, `GET /appointments/:id`, `PUT /appointments/status` |
| **Contact inbox** | `GET /leads`, `GET /leads/:id`, `PUT /leads/:id` |
| **Subscribers** | `GET /subscribers`, `PUT /subscribers/:id/suppress` |
| **Activity** | `GET /activity-logs`, `GET /activity-logs/export` |
| **AI models** | `GET /ai-models`, `POST /ai-models`, `PUT /ai-models/:id`, `DELETE /ai-models/:id`, `POST /ai-models/reorder`, `POST /ai-models/:id/test` |
| **Diagnostics** | `GET /circuit-breakers` |

Two more admin-only diagnostics are at `GET /api/rate-limit/stats` and `GET /api/cache/stats`.

## Errors

Errors return a status code and a safe message:

```json
{ "success": false, "code": "STATE_CONFLICT", "message": "This record changed. Refresh and try again." }
```

| Status | Meaning |
| --- | --- |
| 400 | Invalid input |
| 401 | Not signed in, or the session expired |
| 403 | Signed in, but not allowed |
| 404 | Not found |
| 409 | Conflict, such as editing an old version of a record |
| 429 | Too many requests |
| 5xx | Server or upstream service problem |
