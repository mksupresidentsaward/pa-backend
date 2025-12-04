# Troubleshooting Backend Connection Issues

## Error: "Failed to fetch" or "ERR_CONNECTION_REFUSED"

### Step 1: Verify Backend Server is Running

1. **Check if the server is running:**
   ```bash
   cd backend
   npm start
   ```

2. **You should see:**
   ```
   MongoDB Connected...
   ✅ All routes loaded successfully
   ✅ Server running on port 4000
   🌐 API available at http://localhost:4000
   ```

3. **Test the backend directly:**
   - Open your browser and go to: `http://localhost:4000`
   - You should see: `{"message":"President's Award Club API is running...","status":"ok",...}`

### Step 2: Check Port Conflicts

If port 4000 is already in use:

**Windows:**
```bash
netstat -ano | findstr :4000
```

**Mac/Linux:**
```bash
lsof -i :4000
```

**Solution:** Kill the process or change the port in `.env`:
```
PORT=4001
```

### Step 3: Check CORS Issues

The backend now allows:
- All localhost origins
- File:// protocol (when opening HTML directly)
- Development mode is permissive

If you still get CORS errors, check the browser console for the exact error message.

### Step 4: Verify Frontend Configuration

1. **Open browser console (F12)**
2. **Check the connection info:**
   ```
   🚀 Admin Dashboard Initializing...
   📍 Frontend: http://...
   🌐 Backend: http://localhost:4000
   🔗 API: http://localhost:4000/api
   ```

3. **Run connection test:**
   ```javascript
   testBackendConnection()
   ```

### Step 5: Common Issues

**Issue: Backend shows "MongoDB Connected" but server doesn't start**
- Check for errors after "MongoDB Connected"
- Look for route loading errors
- Check if all dependencies are installed: `npm install`

**Issue: Frontend opens from file:// protocol**
- The backend now supports this, but it's better to use a local server
- Use VS Code Live Server extension
- Or use Python: `python -m http.server 8000` in frontend folder

**Issue: Firewall blocking connection**
- Windows Firewall may block Node.js
- Add exception for Node.js in Windows Firewall settings

### Step 6: Quick Test

1. **Backend test:**
   ```bash
   curl http://localhost:4000
   ```
   Should return: `{"message":"President's Award Club API is running...",...}`

2. **Frontend test:**
   - Open browser console
   - Run: `testBackendConnection()`
   - Check results

### Still Having Issues?

1. Check backend terminal for error messages
2. Check browser console (F12) for detailed errors
3. Verify MongoDB is running
4. Verify `.env` file exists with correct `MONGO_URI`
5. Try restarting both backend and frontend






