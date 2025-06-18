import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true },
    documents: [{ type: String }],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isCompleted:{type:Boolean,default:false,required:true},
    createdAt: { type: Date, default: Date.now },
});

const Reminder = mongoose.model('Reminder', reminderSchema);
export default Reminder;
