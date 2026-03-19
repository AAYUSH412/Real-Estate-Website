import mongoose from "mongoose";

const newsSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
});

const News = mongoose.model('News', newsSchema);

export default News;