// import pdf from 'html-pdf';
// import { letterTemplate } from '../templates/letterTemplate.js'; // You'll need to create this

// export const generatePDF = async (letterData) => {
//     return new Promise((resolve, reject) => {
//         // Generate HTML from template with letterData
//         const html = letterTemplate(letterData);
        
//         const options = {
//             format: 'A4',
//             border: {
//                 top: '0.5in',
//                 right: '0.5in',
//                 bottom: '0.5in',
//                 left: '0.5in'
//             }
//         };

//         pdf.create(html, options).toBuffer((err, buffer) => {
//             if (err) {
//                 reject(err);
//             } else {
//                 resolve(buffer);
//             }
//         });
//     });
// };