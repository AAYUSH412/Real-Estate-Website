import News from "../models/newsModel.js";
import dotenv from "dotenv";
import emailService from "../services/emailService.js";

const submitNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required',
        success: false 
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Please provide a valid email address',
        success: false 
      });
    }

    // Check if email already exists
    const existingSubscription = await News.findOne({ email: email.toLowerCase().trim() });
    if (existingSubscription) {
      return res.status(400).json({ 
        message: 'Email already subscribed to newsletter',
        success: false 
      });
    }

    const newNewsletter = new News({
      email: email.toLowerCase().trim(),
    });

    const savedNewsletter = await newNewsletter.save();

    // Send newsletter welcome email
    try {
      await emailService.sendNewsletterWelcome(email);
    } catch (emailError) {
      console.error('Failed to send newsletter welcome email:', emailError);
      // Don't fail the subscription if email fails
    }

    res.json({
      message: "Newsletter subscribed successfully",
      success: true
    });
  } catch (error) {
    console.error("Error saving newsletter data:", error);
    res.status(500).json({ 
      message: "Server error",
      success: false 
    });
  }
};

const unsubscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required', success: false });
    }
    await News.deleteOne({ email: email.toLowerCase().trim() });
    // Generic response regardless of whether email was subscribed
    return res.status(200).json({ message: 'You have been unsubscribed.', success: true });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return res.status(500).json({ message: 'Server error', success: false });
  }
};

export { submitNewsletter, unsubscribeNewsletter };
