import Sheet from "../models/sheet.model.js";
import User from "../models/user.model.js";
import {uploadFileToS3,getSignedUrl,deleteFilesFromS3} from "../utils/s3.utils.js";


const createSheet =async (req,res) =>{
    try {
        const {assignedTo, canEdit,userId}= req.body;
        const file =req.file;
        console.log("HII:", req.body);
        console.log("YO:", req.file);

        if (!file) 
            return res.status(400).json({message:"No file uploaded"});

           // Step 1: Get actual uploader ObjectId using custom userId (e.g. "ISR183231")
    const user = await User.findOne({ userId });
    if (!user)
      return res.status(404).json({ message: "Uploader user not found" });

    const uploaderId = user._id; // actual ObjectId
      // Step 2: Validate assignedTo user exists
        const assignedUser = await User.findOne({ _id: assignedTo });
        if (!assignedUser)
            return res.status(404).json({ message: "Assigned user not found" });

        const assignedUserId = assignedUser._id;

         const s3Result = await uploadFileToS3(file); // returns { Location, Key }

         const newSheet =new Sheet({
            filename:file.originalname,
            s3url:s3Result.Location,
            uploadedBy:uploaderId,
            assignedTo: assignedUserId,
            canEdit: canEdit === 'true', // Convert to boolean
            lastUpdatedBy:uploaderId,
         });

         await newSheet.save();
         res.status (201).json({
            message:"Sheet Created Successfully",
            sheet:newSheet
         });
        }
        catch (error){
            console.error("Sheet creation error:", error);
            res.status(500).json({
                message:"Failed to upload sheet"||error.message,
            });
        }

    };

const getAllSheetsByUser =async (req,res) => {
        try{
            const userId = req.user._id;
            const uploadSheets=await Sheet.find({uploadedBy:userId}).populate('assignedTo', 'firstName email')
            const assignedSheets = await Sheet.find({ assignedTo: userId }).populate('uploadedBy', 'firstName email');

            res.status(200).json({
                uploadedSheets,assignedSheets
            });
        }
        catch(err){
            res.status(500).json({
                message: "Failed to fetch sheets",
                error: err.message
            });
        }
    };

const updateSheet = async (req, res) => {
    try {
        const { sheetId } = req.params;
        const { canEdit } = req.body;

        const sheet = await Sheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: 'Sheet not found' });

        // Only allow update if current user is allowed
        if (String(sheet.assignedTo) !== String(req.user._id) && String(sheet.uploadedBy) !== String(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized to update this sheet' });
        }

        sheet.canEdit = canEdit || sheet.canEdit;
        sheet.version += 1;
        sheet.lastUpdatedBy = req.user._id;
        await sheet.save();

        res.status(200).json({ message: 'Sheet updated', sheet });
    } catch (err) {
        res.status(500).json({ message: 'Error updating sheet' });
    }
};

const deleteSheet = async (req, res) => {
    try{
        const {sheetId} =req.params;
        const sheet =await Sheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: 'Sheet not found' });

        await deleteFilesFromS3(sheet.s3url);
        await sheet.remove();
        res.status(200).json({
            message:'Sheet Deleted Successfully',
        });

    }
    catch (err) {
        res.status(500).json({ message: 'Failed deleting sheet' });
    }
};
const shareSheetwithEmployee = async (req, res) => {
    try{
        const {sheetId,employeeId,canEdit} = req.body;
        const sheet = await Sheet.findById(sheetId);
        if (!sheet) return res.status(404).json({message:'Sheet not found'});

        sheet.assignedTo=employeeId;
        sheet.canEdit = canEdit;
        await sheet.save();
        res.status(200).json({
            message: 'Sheet shared successfully',
            sheet
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to share sheet' });
    }
};
const downloadSheet = async (req, res) => {
    try {
        const {sheetId}= req.params;
        const sheet = await Sheet.findById(sheetId);
        if (!sheet) return res.status(404).json({
            message: 'Sheet not found'
        })
        const signedUrl = await getSignedUrl(sheet.s3url);
        res.status(200).json({
            url:signedUrl
        });
    }
    catch (err) {
        res.status(500).json({
            message:'Failed to download sheet',
        })
    }
};
export {
    createSheet,
    getAllSheetsByUser,
    updateSheet,
    deleteSheet,
    shareSheetwithEmployee,
    downloadSheet
};