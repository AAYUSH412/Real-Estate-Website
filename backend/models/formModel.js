import mongoose from 'mongoose';

const formSchema = new mongoose.Schema({
  status: { type: String, enum: ['new', 'in_progress', 'resolved'], default: 'new' },
  adminNote: { type: String, default: '' },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  },
  message: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

formSchema.index({ status: 1, createdAt: -1, _id: -1 });
const Form = mongoose.model('Form', formSchema);

export default Form;