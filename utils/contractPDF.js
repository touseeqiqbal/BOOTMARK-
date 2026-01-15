// Enhanced PDF Generation for Contracts
// Generates professional PDF contracts with proper formatting

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a professional contract PDF
 * @param {Object} contract - Contract data
 * @param {Object} client - Client data
 * @param {Object} business - Business data
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateContractPDF(contract, client, business) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'LETTER',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Header with business logo/name
            doc.fontSize(20)
                .fillColor('#1e3a8a')
                .text(business.name || 'Contract', { align: 'center' });

            doc.moveDown(0.5);
            doc.fontSize(16)
                .fillColor('#4b5563')
                .text(contract.title || 'Service Agreement', { align: 'center' });

            doc.moveDown(1);

            // Contract metadata
            doc.fontSize(10)
                .fillColor('#6b7280')
                .text(`Contract #: ${contract.id}`, 50, doc.y);
            doc.text(`Date: ${new Date(contract.createdAt).toLocaleDateString()}`, { align: 'right' });

            doc.moveDown(1);
            doc.strokeColor('#e5e7eb').lineWidth(1);
            doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
            doc.moveDown(1);

            // Parties section
            doc.fontSize(12)
                .fillColor('#111827')
                .text('PARTIES', { underline: true });
            doc.moveDown(0.5);

            doc.fontSize(10)
                .fillColor('#374151')
                .text('Service Provider:', { continued: true })
                .fillColor('#111827')
                .text(` ${business.name || '[Business Name]'}`);

            if (business.address) {
                doc.fillColor('#6b7280')
                    .fontSize(9)
                    .text(business.address, { indent: 20 });
            }

            doc.moveDown(0.5);
            doc.fillColor('#374151')
                .fontSize(10)
                .text('Client:', { continued: true })
                .fillColor('#111827')
                .text(` ${client.name || '[Client Name]'}`);

            if (client.email) {
                doc.fillColor('#6b7280')
                    .fontSize(9)
                    .text(client.email, { indent: 20 });
            }
            if (client.phone) {
                doc.text(client.phone, { indent: 20 });
            }

            doc.moveDown(1);

            // Contract details
            doc.fontSize(12)
                .fillColor('#111827')
                .text('CONTRACT DETAILS', { underline: true });
            doc.moveDown(0.5);

            const details = [
                ['Start Date', new Date(contract.startDate).toLocaleDateString()],
                ['End Date', new Date(contract.endDate).toLocaleDateString()],
                ['Total Value', `$${parseFloat(contract.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
                ['Billing Frequency', (contract.billingFrequency || 'monthly').charAt(0).toUpperCase() + (contract.billingFrequency || 'monthly').slice(1)],
                ['Status', (contract.status || 'draft').charAt(0).toUpperCase() + (contract.status || 'draft').slice(1)],
                ['Auto-Renewal', contract.autoRenewal ? 'Yes' : 'No']
            ];

            details.forEach(([label, value]) => {
                doc.fontSize(10)
                    .fillColor('#374151')
                    .text(label + ':', 50, doc.y, { continued: true, width: 150 })
                    .fillColor('#111827')
                    .text(value, { width: 350 });
            });

            doc.moveDown(1);

            // Payment Schedule
            if (contract.paymentSchedule && contract.paymentSchedule.length > 0) {
                doc.fontSize(12)
                    .fillColor('#111827')
                    .text('PAYMENT SCHEDULE', { underline: true });
                doc.moveDown(0.5);

                contract.paymentSchedule.forEach((milestone, index) => {
                    doc.fontSize(10)
                        .fillColor('#374151')
                        .text(`${index + 1}. ${milestone.description || 'Payment'}`, 50, doc.y);
                    doc.fillColor('#6b7280')
                        .fontSize(9)
                        .text(`   Amount: $${parseFloat(milestone.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { indent: 20 });
                    doc.text(`   Due Date: ${milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : 'TBD'}`, { indent: 20 });
                    doc.moveDown(0.3);
                });

                doc.moveDown(0.5);
            }

            // Service Scope
            if (contract.serviceScope) {
                doc.fontSize(12)
                    .fillColor('#111827')
                    .text('SERVICE SCOPE', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(10)
                    .fillColor('#374151')
                    .text(contract.serviceScope, { align: 'justify' });
                doc.moveDown(1);
            }

            // Deliverables
            if (contract.deliverables) {
                doc.fontSize(12)
                    .fillColor('#111827')
                    .text('DELIVERABLES', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(10)
                    .fillColor('#374151')
                    .text(contract.deliverables, { align: 'justify' });
                doc.moveDown(1);
            }

            // Terms and Conditions
            if (contract.terms) {
                doc.addPage();
                doc.fontSize(14)
                    .fillColor('#111827')
                    .text('TERMS AND CONDITIONS', { align: 'center', underline: true });
                doc.moveDown(1);

                doc.fontSize(9)
                    .fillColor('#374151')
                    .text(contract.terms, { align: 'justify', lineGap: 2 });
            }

            // Signature section
            doc.addPage();
            doc.fontSize(12)
                .fillColor('#111827')
                .text('SIGNATURES', { underline: true });
            doc.moveDown(2);

            // Service Provider signature
            doc.fontSize(10)
                .fillColor('#374151')
                .text('Service Provider:', 50, doc.y);
            doc.moveDown(2);
            doc.strokeColor('#000000').lineWidth(1);
            doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
            doc.moveDown(0.3);
            doc.fontSize(9)
                .fillColor('#6b7280')
                .text('Signature', 50, doc.y);
            doc.moveDown(0.5);
            doc.strokeColor('#000000').lineWidth(1);
            doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
            doc.moveDown(0.3);
            doc.text('Date', 50, doc.y);

            // Client signature
            doc.fontSize(10)
                .fillColor('#374151')
                .text('Client:', 312, doc.y - 80);
            doc.moveDown(2);
            doc.strokeColor('#000000').lineWidth(1);
            doc.moveTo(312, doc.y).lineTo(512, doc.y).stroke();
            doc.moveDown(0.3);
            doc.fontSize(9)
                .fillColor('#6b7280')
                .text('Signature', 312, doc.y);
            doc.moveDown(0.5);
            doc.strokeColor('#000000').lineWidth(1);
            doc.moveTo(312, doc.y).lineTo(512, doc.y).stroke();
            doc.moveDown(0.3);
            doc.text('Date', 312, doc.y);

            // Footer
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                doc.fontSize(8)
                    .fillColor('#9ca3af')
                    .text(
                        `Page ${i + 1} of ${pageCount} | ${business.name || 'Contract'} | Generated ${new Date().toLocaleDateString()}`,
                        50,
                        doc.page.height - 50,
                        { align: 'center' }
                    );
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    generateContractPDF
};
