#!/bin/bash

# GeoCrypt Startup Script

echo "===================="
echo "🚀 GeoCrypt Startup"
echo "===================="
echo ""

# Start MongoDB
echo "1️⃣  Starting MongoDB..."
mkdir -p /tmp/mongodb
pkill mongod 2>/dev/null
sleep 1
mongod --dbpath /tmp/mongodb --logpath /tmp/mongodb.log &
sleep 3

echo "✅ MongoDB started on port 27017"
echo ""

# Start Backend
echo "2️⃣  Starting Backend API..."
cd /home/kali/Downloads/Main-Project-main/backend
source venv/bin/activate
python run.py > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
sleep 3

echo "✅ Backend API started (PID: $BACKEND_PID) on http://localhost:8000"
echo ""

# Start Frontend  
echo "3️⃣  Starting Frontend (React)..."
cd /home/kali/Downloads/Main-Project-main/frontend
npm start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 5

echo "✅ Frontend started (PID: $FRONTEND_PID) on http://localhost:3000"
echo ""

echo "===================="
echo "✅ All services running!"
echo "===================="
echo ""
echo "📱 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:8000"
echo "🗄️  MongoDB:   localhost:27017"
echo ""
echo "📝 Test Credentials:"
echo "   Admin:    ananthakrishnan272004@gmail.com / admin"
echo "   Employee: pta22cc016@cek.ac.in / ananthan"
echo ""
echo "📊 API Docs: http://localhost:8000/docs"
echo ""
echo "To stop all services, run: pkill -f 'mongod|python run.py|npm start'"
echo ""
