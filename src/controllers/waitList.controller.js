// controllers/waitlistController.js
const nodemailer = require('nodemailer');
const Waitlist =require("../models/waitList.model");
// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});
// Add to waitlist function
exports.addToWaitlist = async (req, res) => {
  try {
    const { name, email } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and email are required' 
      });
    }

    // Email to admin
    // const adminMailOptions = {
    //   from: process.env.EMAIL_USER,
    //   to: process.env.ADMIN_EMAIL,
    //   subject: 'New Waitlist Registration',
    //   html: `
    //     <h2>New Waitlist</h2>
    //     <p><strong>Name:</strong> ${name}</p>
    //     <p><strong>Email:</strong> ${email}</p>
    //     <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    //   `
    // };

    // // Email to user
    // const userMailOptions = {
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: 'Welcome to Pixolabs Waitlist!',
    //   html: `
    //     <h2>Thank you for joining our waitlist!</h2>
    //     <p>Dear ${name},</p>
    //     <p>We're excited to have you join the Pixolabs waitlist. We'll keep you updated 
    //        on our progress and notify you as soon as we launch.</p>
    //     <br>
    //     <p>Best regards,<br>The Pixolabs Team</p>
    //   `
    // };

    // // Send both emails
    // await Promise.all([
    //   transporter.sendMail(adminMailOptions),
    //   transporter.sendMail(userMailOptions)
    // ]);

    await Waitlist.create({ name, email });

    res.status(200).json({
      success: true,
      message: 'Successfully joined waitlist'
    });
  } catch (error) {
    console.error('Waitlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process waitlist registration'
    });
  }
};

// Get waitlist entries function
exports.getWaitlistEntries = async (req, res) => {
  try {
    // If you're using a database, fetch entries here
    // const entries = await WaitlistModel.find();
    
    res.status(200).json({
      success: true,
      data: entries
    });
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch waitlist entries'
    });
  }
};

// Delete waitlist entry function
exports.deleteWaitlistEntry = async (req, res) => {
  try {
    const { id } = req.params;
    
    // If using a database:
    // await WaitlistModel.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Waitlist entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting waitlist entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete waitlist entry'
    });
  }
};

// Update waitlist entry status
exports.updateWaitlistStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // If using a database:
    // const updatedEntry = await WaitlistModel.findByIdAndUpdate(
    //   id,
    //   { status },
    //   { new: true }
    // );
    
    res.status(200).json({
      success: true,
      message: 'Waitlist status updated successfully',
      // data: updatedEntry
    });
  } catch (error) {
    console.error('Error updating waitlist status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update waitlist status'
    });
  }
};