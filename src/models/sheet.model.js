import mongoose from 'mongoose';
const { Schema } = mongoose;
const sheetSchema = new Schema({
    filename:{
        type:String,
        required: true,
    },
    s3url:{
        type: String,
        required: true,
    },
    uploadedBy:{
        type:Schema.Types.ObjectId,
        ref: 'Admin',
        // required: true,
    },
    assignedTo:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    canEdit:{
        type:Boolean,
        default: false,
    },
    version:{
        type:Number,
        default: 1,
    },
    lastUpdatedBy:{
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    uploadedAt:{
        type:Date,
        default: Date.now
    }
})
const Sheet = mongoose.model('Sheet', sheetSchema);

export default Sheet;