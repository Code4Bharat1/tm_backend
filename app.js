// server.js or app.js
import express from 'express';
import connectDB from './src/init/dbConnection.js';

const app = express();

// Connect to MongoDB
connectDB();

// Your middleware and routes
app.use(express.json());

app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});
