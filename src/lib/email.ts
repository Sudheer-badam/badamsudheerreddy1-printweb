import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendOrderStatusEmail = async (
  to: string,
  customerName: string,
  orderNumber: string,
  status: string,
  fileName: string
) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Gmail credentials not configured. Skipping email send.");
    return;
  }

  const subject = `Update on your Print Docker Order #${orderNumber}`;
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://badamsudheerreddy-printerweb.vercel.app'}/logo.png`;

  let statusMessage = `We are processing your order for "${fileName}".`;
  switch (status) {
    case "ACCEPTED":
      statusMessage = `We have accepted your order for "${fileName}" and will begin processing it soon.`;
      break;
    case "PRINTING":
      statusMessage = `Your order for "${fileName}" is currently being printed.`;
      break;
    case "PRINTED":
      statusMessage = `Good news! Your order for "${fileName}" has been printed successfully.`;
      break;
    case "READY_FOR_PICKUP":
      statusMessage = `Your order for "${fileName}" is now ready for pickup! Please visit our store to collect it.`;
      break;
    case "DELIVERED":
      statusMessage = `Your order for "${fileName}" has been delivered. Thank you for choosing Print Docker!`;
      break;
    case "CANCELLED":
      statusMessage = `We regret to inform you that your order for "${fileName}" has been cancelled. Please contact us for more details.`;
      break;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoUrl}" alt="Print Docker Logo" style="max-height: 80px; width: auto;" />
      </div>
      
      <h2 style="color: #0B1D3A; margin-bottom: 20px;">Order Status Update</h2>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.5;">Hello <strong>${customerName}</strong>,</p>
      
      <div style="background-color: #f3f4f6; border-left: 4px solid #2D63FF; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #1f2937; margin: 0; font-size: 16px; line-height: 1.5;">${statusMessage}</p>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.5;">
        If you have any questions about your order, please don't hesitate to contact us.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      
      <div style="text-align: center; color: #9ca3af; font-size: 12px;">
        <p>Thank you for choosing Print Docker!</p>
        <p>&copy; ${new Date().getFullYear()} Print Docker. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Print Docker" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to} for order ${orderNumber}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
