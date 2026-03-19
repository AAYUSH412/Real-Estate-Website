import Form from '../models/formModel.js';

export const submitForm = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body; // Debugging log

    const newForm = new Form({
      name,
      email,
      phone,
      message,
    });

    const savedForm = await newForm.save();
    

    res.json({ message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error saving form data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};