require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h',
    });
};

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const user = await User.findOne({ email: 'mksupresidentsaward@gmail.com' });
        console.log('User found:', user ? user.email : 'No user');

        if (user) {
            console.log('Password field:', user.password);
            try {
                const isMatch = await user.matchPassword('mksu@2025');
                console.log('Password match result:', isMatch);

                user.lastActiveAt = new Date();
                await user.save({ validateBeforeSave: false });
                console.log('User save successful');

                const token = generateToken(user._id);
                console.log('Token generated:', token);
            } catch (e) {
                console.error('Operation error:', e);
            }
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

connectDB();
