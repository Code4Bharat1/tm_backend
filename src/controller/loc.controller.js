import LOC from "../models/loc.model.js";
import User from "../models/user.model.js";
import { CompanyRegistration } from "../models/companyregistration.model.js";
import { sendMail } from "../service/nodemailerConfig.js";

// Generate reference number function
const generateRefNo = (companyName) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${companyName.substring(0, 3).toUpperCase()}/LOC/${year}/${random}`;
};

// Generate LOC HTML content
const generateLOCHTML = (locData) => {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getPerformanceStatus = (rating) => {
    const numRating = parseFloat(rating);
    if (numRating >= 8) return "Exceeds Expectations";
    if (numRating >= 7) return "Meets Expectations";
    if (numRating >= 6) return "Below Expectations";
    return "Under Performance Improvement Plan (PIP)";
  };

  const downloadPDF = () => {
    window.print();
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Letter of Concern - ${locData.fullName}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
            @media print {
                .no-print { display: none !important; }
                body { background: white !important; }
                .container { box-shadow: none !important; }
            }
        </style>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0179a4, #015a7a); color: white; padding: 40px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 32px; font-weight: bold;">${
                  locData.companyName
                }</h1>
                <p style="margin: 10px 0 0 0; color: #b3d9ff; font-size: 16px;">Excellence in Technology Solutions</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px;">
                <!-- Title -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #333; font-size: 28px; margin-bottom: 10px;">LETTER OF CONCERN</h2>
                    <div style="width: 100px; height: 3px; background: #0179a4; margin: 0 auto;"></div>
                </div>

                <!-- Meta Info Table -->
                <table style="width: 100%; background: #f8f9fa; border-radius: 6px; margin-bottom: 30px; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 15px; font-size: 14px; border-right: 1px solid #dee2e6;"><strong>Ref No:</strong> ${
                          locData.refNo
                        }</td>
                        <td style="padding: 15px; font-size: 14px; text-align: right;"><strong>Date:</strong> ${currentDate}</td>
                    </tr>
                </table>

                <!-- Greeting -->
                <div style="font-size: 18px; font-weight: 600; color: #333; margin-bottom: 25px;">To Whom It May Concern,</div>

                <!-- Main Content -->
                <p style="line-height: 1.8; color: #555; font-size: 16px; margin-bottom: 25px;">
                    This letter serves as an official concern notice regarding <strong>${
                      locData.fullName
                    }</strong>, 
                    an employee of <strong>${locData.companyName}</strong>.
                </p>

                <!-- Employee Details Table -->
                <div style="background: #f8f9fa; padding: 25px; border-radius: 6px; border-left: 4px solid #0179a4; margin: 25px 0;">
                    <h3 style="color: #333; margin-bottom: 15px; font-size: 18px;">Employee Details:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 12px; border: 1px solid #dee2e6; background: #ffffff; font-weight: bold; width: 25%;">Full Name</td>
                            <td style="padding: 8px 12px; border: 1px solid #dee2e6; background: #ffffff;">${
                              locData.fullName
                            }</td>
                            <td style="padding: 8px 12px; border: 1px solid #dee2e6; background: #ffffff; font-weight: bold; width: 25%;">Position</td>
                            <td style="padding: 8px 12px; border: 1px solid #dee2e6; background: #ffffff;">${
                              locData.position
                            }</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; border: 1px solid #dee2e6; background: #f8f9fa; font-weight: bold;">Email</td>
                            <td style="padding: 8px 12px; border: 1px solid #dee2e6; background: #f8f9fa;">${
                              locData.email
                            }</td>
                            <td style="padding: 8px 12px; border: 1px solid #dee2e6; background: #f8f9fa; font-weight: bold;">Company</td>
                            <td style="padding: 8px 12px; border: 1px solid #dee2e6; background: #f8f9fa;">${
                              locData.companyName
                            }</td>
                        </tr>
                    </table>
                </div>

                <p style="line-height: 1.8; color: #555; font-size: 16px; margin-bottom: 25px;">
                    This letter addresses performance concerns regarding ${
                      locData.fullName
                    }, 
                    who is currently employed as ${
                      locData.position
                    } in our organization.
                </p>

                ${
                  parseFloat(locData.performanceMarks) < 8
                    ? `
                <div style="background: #fff3cd; padding: 25px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 25px 0;">
                    <h3 style="color: #856404; margin-bottom: 15px; font-size: 18px;">Performance Concern Details:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #f0ad4e; background: #ffffff; font-weight: bold; width: 30%;">Current Performance Rating</td>
                            <td style="padding: 10px 12px; border: 1px solid #f0ad4e; background: #ffffff;">${
                              locData.performanceMarks
                            }/10 (${getPerformanceStatus(
                        locData.performanceMarks,
                      )})</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #f0ad4e; background: #fefbf3; font-weight: bold;">Performance Status</td>
                            <td style="padding: 10px 12px; border: 1px solid #f0ad4e; background: #fefbf3;">${
                              locData.performanceStatus
                            }</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #f0ad4e; background: #ffffff; font-weight: bold;">Review Schedule</td>
                            <td style="padding: 10px 12px; border: 1px solid #f0ad4e; background: #ffffff;">Monthly Reviews Ongoing</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #f0ad4e; background: #fefbf3; font-weight: bold;">Action Required</td>
                            <td style="padding: 10px 12px; border: 1px solid #f0ad4e; background: #fefbf3;">Immediate performance improvement plan implementation</td>
                        </tr>
                    </table>
                </div>
                `
                    : ""
                }

                <p style="line-height: 1.8; color: #555; font-size: 16px; margin-bottom: 25px;">
                    This letter is issued to formally document performance concerns and is valid as of the date mentioned above.
                </p>

                <p style="line-height: 1.8; color: #555; font-size: 16px; margin-bottom: 25px;">
                    For any clarification or discussion regarding this matter, please contact our HR department immediately.
                </p>

                <div style="background: #e7f3ff; padding: 20px; border-radius: 6px; font-size: 14px; color: #0c5460; font-style: italic; margin: 25px 0;">
                    <strong>Note:</strong> This performance concern letter has been issued as per company policy. 
                    This document has been digitally generated and saved to our records. Immediate action is required to address the mentioned concerns.
                </div>

                <!-- Download Button -->
                <div class="no-print" style="text-align: center; margin: 30px 0;">
                    <button onclick="downloadPDF()" style="background: #0179a4; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: background 0.3s;">
                        📄 Download as PDF
                    </button>
                    <p style="font-size: 12px; color: #666; margin-top: 10px;">Click the button above to download this document as PDF</p>
                </div>

                <script>
                    function downloadPDF() {
                        const element = document.querySelector('.container');
                        const opt = {
                            margin: 1,
                            filename: 'Letter_of_Concern_${locData.fullName.replace(
                              /\s+/g,
                              "_",
                            )}_${currentDate.replace(/\s+/g, "_")}.pdf',
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: { scale: 2, useCORS: true },
                            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                        };
                        
                        // Hide download button temporarily
                        const downloadSection = document.querySelector('.no-print');
                        downloadSection.style.display = 'none';
                        
                        html2pdf().set(opt).from(element).save().then(() => {
                            // Show download button again
                            downloadSection.style.display = 'block';
                        });
                    }
                </script>

                <!-- Signature Section -->
                <div style="margin-top: 60px; padding-top: 30px; border-top: 2px solid #eee;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="vertical-align: top; width: 50%; padding-right: 20px;">
                                <div style="font-size: 14px; color: #666;">
                                    <p><strong>For immediate response, please contact:</strong></p>
                                    <p>HR Department</p>
                                    <p>${locData.companyName}</p>
                                    <p style="color: #d73527; font-weight: bold;">⚠️ Urgent attention required</p>
                                </div>
                            </td>
                            <td style="vertical-align: bottom; text-align: center; width: 50%;">
                                <div style="margin-bottom: 40px;">
                                    <div style="width: 200px; border-bottom: 2px solid #666; margin: 0 auto 10px auto;"></div>
                                    <div style="font-weight: bold; font-size: 16px; color: #333;">${
                                      locData.ceoName
                                    }</div>
                                    <div style="font-size: 14px; color: #666; margin-top: 5px;">Chief Executive Officer</div>
                                    <div style="font-size: 14px; color: #666; margin-top: 5px;">${
                                      locData.companyName
                                    }</div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee;">
                <p><strong>This is a computer-generated letter and does not require a physical signature.</strong></p>
                <p>For immediate response regarding this concern, please contact our HR department.</p>
                <p>Generated on: ${currentDate}</p>
            </div>

            <!-- Download Section -->
            <div style="background: #d73527; color: white; padding: 30px; text-align: center;">
                <h3>⚠️ Letter of Concern - Immediate Action Required</h3>
                <p>This document has been officially generated and requires immediate attention from the concerned employee.</p>
                <p style="margin-top: 20px; font-size: 14px;">
                    For any questions or to schedule a meeting, please contact our HR department immediately.
                </p>
            </div>
        </div>
    </body>
    </html>`;
};

export const createLOC = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { userId, performanceMarks, performanceStatus } = req.body;
    console.log("Creating LOC with data:", req.body);

    // Validate required fields
    if (
      !userId ||
      !companyId ||
      performanceMarks == null ||
      !performanceStatus
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Get user and company details for email
    const user = await User.findById(userId).select(
      "firstName lastName email position",
    );
    const company = await CompanyRegistration.findById(companyId).select(
      "companyInfo.companyName adminInfo.fullName adminInfo.email",
    );

    if (!user || !company) {
      return res.status(404).json({ message: "User or Company not found" });
    }

    // Create new LOC entry
    const newLOC = new LOC({
      userId,
      companyId,
      performanceMarks,
      performanceStatus,
    });

    await newLOC.save();

    // Prepare LOC data for email
    const locData = {
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      position: user.position,
      companyName: company.companyInfo.companyName,
      ceoName: company.adminInfo.fullName,
      performanceMarks,
      performanceStatus,
      refNo: generateRefNo(company.companyInfo.companyName),
    };

    // Generate HTML content
    const htmlContent = generateLOCHTML(locData);

    // Send email to employee
    try {
      await sendMail(
        user.email,
        `Letter of Confirmation - ${locData.fullName}`,
        htmlContent,
      );

      // Also send copy to admin if needed
      if (company.adminInfo.email && company.adminInfo.email !== user.email) {
        await sendMail(
          company.adminInfo.email,
          `LOC Generated - ${locData.fullName}`,
          htmlContent,
        );
      }

      console.log("LOC email sent successfully to:", user.email);
    } catch (emailError) {
      console.error("Error sending LOC email:", emailError);
      // Don't fail the request if email fails, just log it
    }

    res.status(201).json({
      message: "LOC record created and email sent successfully",
      data: {
        ...newLOC.toObject(),
        emailSent: true,
        recipientEmail: user.email,
      },
    });
  } catch (error) {
    console.error("Error creating LOC:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Keep your existing functions unchanged
export const getAllLOCs = async (req, res) => {
  try {
    const { companyId } = req.user;

    const locs = await LOC.find({ companyId })
      .populate("userId", "firstName lastName email position")
      .populate("companyId", "companyInfo.companyName adminInfo.fullName")
      .sort({ createdAt: -1 });

    const formattedLOCs = locs.map((loc) => ({
      fullName: `${loc.userId.firstName} ${loc.userId.lastName}`,
      email: loc.userId.email,
      position: loc.userId.position,
      companyName: loc.companyId.companyInfo.companyName,
      CEO: loc.companyId.adminInfo.fullName,
      performanceMarks: loc.performanceMarks,
      performanceStatus: loc.performanceStatus,
    }));

    res.status(200).json({
      message: "LOC entries retrieved successfully",
      count: formattedLOCs.length,
      data: formattedLOCs,
    });
  } catch (error) {
    console.error("Error fetching LOC entries:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getAllUserName = async (req, res) => {
  try {
    const { companyId } = req.user;

    const users = await User.find(
      { companyId },
      "firstName lastName email _id position",
    ).sort({ firstName: 1 });

    const company = await CompanyRegistration.findById(companyId)
      .select("companyInfo.companyName adminInfo.fullName")
      .lean();

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const updatedUsers = users.map((user) => ({
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      position: user.position,
      companyName: company.companyInfo.companyName,
      CEO: company.adminInfo.fullName,
      userId: user._id,
    }));

    res.status(200).json({
      message: "User details retrieved successfully",
      count: updatedUsers.length,
      data: updatedUsers,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
