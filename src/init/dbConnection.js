import mongoose from 'mongoose';
import config from 'config';

const mongoConfig = config.get('mongodb');

const mongoURI = mongoConfig.uri || `mongodb://${mongoConfig.host}:${mongoConfig.port}/${mongoConfig.database}`;

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connection established successfully'))
    .catch((err) => console.error('Unable to connect to MongoDB:', err.message));

export default mongoose;
