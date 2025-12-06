require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/db');
const initSuperAdmin = require('./scripts/initSuperAdmin');

const app = express();
const server = http.createServer(app);

// Connect to Database and Initialize Super Admin (non-blocking)
(async () => {
  try {
    // Connect to database first
    await connectDB();

    // Initialize Super Admin from environment variables
    await initSuperAdmin();
  } catch (err) {
    console.error('Failed to initialize database or super admin:', err);
    // Don't exit - let the server try to start anyway
  }
})();


const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'https://presidentsawardmksu.netlify.app',
  'http://localhost:3000', // Allow file:// protocol (browsers send 'null' as origin)
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or file:// protocol)
    if (!origin || origin === 'null') {
      console.log('✅ CORS: Allowing request with no origin (file:// or direct access)');
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ CORS: Allowing origin: ${origin}`);
      return callback(null, true);
    }

    // Allow Vercel preview deployments
    if (origin.endsWith('.vercel.app')) {
      console.log(`✅ CORS: Allowing Vercel origin: ${origin}`);
      return callback(null, true);
    }

    // In development, be more permissive
    if (process.env.NODE_ENV !== 'production') {
      console.log(`⚠️  CORS: Development mode - allowing origin: ${origin}`);
      return callback(null, true);
    }

    console.log(`❌ CORS: Blocked origin: ${origin}`);
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Initialize Socket.IO
const io = new Server(server, {
  cors: corsOptions,
});

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// FIX: Configure Helmet to allow cross-origin resource loading (images)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(express.json()); // ✅ parses JSON bodies
app.use(express.urlencoded({ extended: false })); // ✅ parses form data

// Serve static files from uploads directory
// Ensure the path resolves correctly relative to the project root
const UPLOADS_PATH = process.env.UPLOADS_PATH || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(UPLOADS_PATH));

// Make io accessible to our routes
app.set('io', io);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  socket.on('joinAdminRoom', () => {
    console.log(`Socket ${socket.id} joined admin room`);
    socket.join('adminRoom');
  });
});

// API Routes
app.get('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins for health check
  res.json({ 
    message: "President's Award Club API is running...",
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Load routes with error handling
try {
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/events', require('./routes/eventRoutes'));
  app.use('/api/applications', require('./routes/applicationRoutes'));
  app.use('/api/contact', require('./routes/contactRoutes'));
  app.use('/api/documents', require('./routes/documentRoutes'));
  app.use('/api/gallery', require('./routes/galleryRoutes'));
  app.use('/api/admin/content', require('./routes/contentRoutes'));
  app.use('/api/users', require('./routes/userRoutes'));
  app.use('/api/notifications', require('./routes/notificationRoutes'));
  console.log('✅ All routes loaded successfully');
} catch (err) {
  console.error('❌ Error loading routes:', err);
  // Continue anyway - at least the health check endpoint will work
}

// 404 handler for unmatched routes
app.use((req, res, next) => {
  if (res.headersSent) {
    return next();
  }
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack || err.message || err);

  // Handle Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeds maximum allowed' });
    }
    return res.status(400).json({ message: err.message || 'File upload error' });
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: statusCode === 500 ? 'Server error' : err.message || 'Server error',
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Start Server
const PORT = process.env.PORT || 4000;

// Start server with error handling
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 API available at http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please use a different port or stop the other process.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});