const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const { body, validationResult } = require("express-validator");
const xss = require("xss");
require("dotenv").config();

const app = express();
app.use(cors({
   origin: [
    "http://localhost:8080",        // local dev
    "https://sunnyridgesolutions.com", // production frontend URL
  ],
}));
app.use(express.json());

// ✅ Validation & Sanitization Rules
const contactFormValidators = [
  body("firstName")
    .trim()
    .notEmpty().withMessage("First name is required")
    .isLength({ max: 50 }).withMessage("First name too long")
    .matches(/^[a-zA-Z\s'-]+$/).withMessage("First name contains invalid characters"),

  body("lastName")
    .trim()
    .notEmpty().withMessage("Last name is required")
    .isLength({ max: 50 }).withMessage("Last name too long")
    .matches(/^[a-zA-Z\s'-]+$/).withMessage("Last name contains invalid characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email address")
    .normalizeEmail(),

  body("company")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("Company name too long")
    .matches(/^[a-zA-Z0-9\s.,&'-]+$/).withMessage("Company name contains invalid characters"),

  
];

// ✅ POST API
app.post("/send-email", contactFormValidators, async (req, res) => {
  // 🔴 Return validation errors if any
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // ✅ Sanitize all fields with XSS library after express-validator has trimmed them
    const firstName = xss(req.body.firstName);
    const lastName  = xss(req.body.lastName);
    const email     = xss(req.body.email);
    const company   = xss(req.body.company || "N/A");
    const message   = xss(req.body.message);

    // ✅ Transporter (Gmail)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // ✅ Email content
    const mailOptions = {
      from: `"Sunnyridge Solutions Contact" <${process.env.EMAIL_USER}>`,
      to: "contact@sunnyridgesolutions.com",
      subject: "New Contact Form Submission",
      html: `
        <h2>New Contact Message</h2>
        <p><strong>First Name:</strong> ${firstName}</p>
        <p><strong>Last Name:</strong> ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "Email sent" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ✅ Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
