# API Reference - Complete Endpoint List

## Authentication (`/api/auth`)
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Register new admin (protected after first admin)
- `GET /api/auth/admin-status` - Get admin registration status
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/ping` - Session keepalive (protected)
- `GET /api/auth/admins` - Get all admins (protected)
- `DELETE /api/auth/admins/:id` - Delete admin (super admin only)

## Events (`/api/events`)
- `GET /api/events` - Get all events (public)
- `POST /api/events` - Create event (admin)
- `PUT /api/events/:id` - Update event (admin)
- `DELETE /api/events/:id` - Delete event (admin)
- `POST /api/events/:id/register` - Register for event (public)

## Applications (`/api/applications`)
- `POST /api/applications` - Submit application (public)
- `GET /api/applications` - Get all applications (admin)
- `PUT /api/applications/:id/status` - Update application status (admin)

## Contact (`/api/contact`)
- `POST /api/contact` - Submit contact message (public)
- `GET /api/contact` - Get all messages (admin)
- `PUT /api/contact/:id/respond` - Respond to message (admin)

## Documents (`/api/documents`)
- `GET /api/documents` - Get all documents (public)
- `POST /api/documents/upload` - Upload document (admin)
- `DELETE /api/documents/:id` - Delete document (admin)

## Gallery (`/api/gallery`)
- `GET /api/gallery` - Get gallery images (public, paginated)
- `GET /api/gallery/latest` - Get latest images (public)
- `GET /api/gallery/upload-limit` - Get upload limit status (admin)
- `POST /api/gallery/upload` - Upload image (admin)
- `DELETE /api/gallery/:id` - Delete image (admin)

## Notifications (`/api/notifications`)
- `GET /api/notifications` - Get active notifications (public)
- `GET /api/notifications/all` - Get all notifications (admin)
- `POST /api/notifications` - Create notification (admin)
- `PUT /api/notifications/:id` - Update notification (admin)
- `DELETE /api/notifications/:id` - Delete notification (admin)

## Users (`/api/users`)
- `GET /api/users` - Get all admins (super admin)
- `DELETE /api/users/:id` - Delete admin (super admin)
- `GET /api/users/me` - Get current user profile (admin)
- `PUT /api/users/me/profile` - Update profile (admin)
- `PUT /api/users/me/avatar` - Upload avatar (admin)
- `DELETE /api/users/me/avatar` - Delete avatar (admin)

## Content (`/api/admin/content`)
- `GET /api/admin/content` - Get all content blocks (public)
- `GET /api/admin/content/:key` - Get specific content (public)
- `PUT /api/admin/content/:key` - Update content (admin)






