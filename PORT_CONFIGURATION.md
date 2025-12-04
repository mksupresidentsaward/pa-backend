# Port Configuration

## Frontend Configuration
All frontend API calls are now configured to use **port 4000**:
- `http://localhost:4000/api` - API endpoint
- `http://localhost:4000` - Server URL

## Backend Configuration
The backend server uses the `PORT` environment variable or defaults to 4000.

### To ensure backend runs on port 4000:

**Option 1: Set environment variable**
```bash
# Windows (PowerShell)
$env:PORT=4000
npm start

# Windows (CMD)
set PORT=4000
npm start

# Mac/Linux
PORT=4000 npm start
```

**Option 2: Create/update `.env` file in backend folder**
```
PORT=4000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

**Option 3: Update server.js default**
The server.js already defaults to 4000 if PORT is not set:
```javascript
const PORT = process.env.PORT || 4000;
```

## Verification
1. Start backend: `cd backend && npm start`
2. Check terminal output: Should show "Server running on port 4000"
3. Test: Open `http://localhost:4000` in browser
4. Frontend should now connect successfully






