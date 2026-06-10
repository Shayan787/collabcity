const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'CollabCity <noreply@collabcity.app>';

const sendOTPEmail = async ({ to, otp, name }) => {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'skip') {
    console.log(`[Email OTP skipped] ${otp} → ${to}`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${otp} is your CollabCity verification code`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 16px;">
    <div style="font-size:22px;font-weight:800;color:white;margin-bottom:24px;">
      collab<span style="color:#818cf8;">city</span>
    </div>
    <div style="background:#18181f;border:1px solid #2a2a35;border-radius:16px;padding:32px;">
      <h2 style="color:white;font-size:20px;font-weight:700;margin:0 0 8px 0;">
        Verify your email 📧
      </h2>
      <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 28px 0;">
        Hi ${name || 'there'}! Enter this code to verify your email and join CollabCity.
      </p>
      <div style="background:#0f0f13;border:2px dashed #6366f1;border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:2px;">Your verification code</p>
        <p style="color:white;font-size:40px;font-weight:800;letter-spacing:12px;margin:0;font-family:monospace;">${otp}</p>
      </div>
      <p style="color:#6b7280;font-size:13px;margin:0;text-align:center;">
        This code expires in <strong style="color:#9ca3af;">10 minutes</strong>.<br>
        If you didn't request this, ignore this email.
      </p>
    </div>
    <p style="color:#4b5563;font-size:12px;margin-top:24px;text-align:center;">
      CollabCity — Find your people. Get paid together. 🇵🇰
    </p>
  </div>
</body>
</html>
      `,
    });
    console.log(`[OTP sent] ${otp} → ${to}`);
  } catch (err) {
    console.error(`[OTP failed] → ${to}:`, err.message);
    throw err;
  }
};

module.exports = { sendOTPEmail };
