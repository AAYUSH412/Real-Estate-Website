import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import apiClient from '../services/apiClient';
import { Upload, X, Plus, Home, MapPin, Phone, DollarSign, BedDouble, Bath, Maximize, Link as LinkIcon, CheckSquare, Square } from 'lucide-react';
import { AMENITIES_LIST } from '../constants/amenities';
import { cn } from '../lib/utils';

const PROPERTY_TYPES = ['House', 'Apartment', 'Office', 'Villa'];
const AVAILABILITY_TYPES = ['rent', 'buy'];

const inputClass = "w-full px-4 py-3 bg-white border border-[#E6D5C3] rounded-xl text-[#1C1B1A] placeholder-[#9CA3AF] text-sm transition-all duration-200 outline-none focus:border-[#D4755B] focus:ring-2 focus:ring-[#D4755B]/15";
const labelClass = "block text-sm font-semibold text-[#1C1B1A] mb-2";

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-9 h-9 bg-[#D4755B]/10 rounded-xl flex items-center justify-center">
      <Icon className="w-4.5 h-4.5 text-[#D4755B]" />
    </div>
    <div>
      <h3 className="text-base font-bold text-[#1C1B1A]">{title}</h3>
      {subtitle && <p className="text-xs text-[#9CA3AF]">{subtitle}</p>}
    </div>
  </div>
);

const PropertyForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    price: '',
    location: '',
    description: '',
    beds: '',
    baths: '',
    sqft: '',
    phone: '',
    availability: '',
    amenities: [],
    googleMapLink: '',
    images: [],
  });

  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newAmenity, setNewAmenity] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAmenityToggle = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + previewUrls.length > 4) {
      toast.error('Maximum 4 images allowed');
      return;
    }
    const newPreviewUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    setFormData((prev) => ({ ...prev, images: [...prev.images, ...files] }));
  };

  const removeImage = (index) => {
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleAddAmenity = () => {
    if (newAmenity && !formData.amenities.includes(newAmenity)) {
      setFormData((prev) => ({ ...prev, amenities: [...prev.amenities, newAmenity] }));
      setNewAmenity('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formdata = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'amenities') {
          value.forEach((amenity, i) => formdata.append(`amenities[${i}]`, amenity));
        } else if (key === 'images') {
          value.forEach((image, i) => formdata.append(`image${i + 1}`, image));
        } else {
          formdata.append(key, value);
        }
      });

      const response = await apiClient.post('/api/products/add', formdata, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        toast.success('Property added successfully!');
        setFormData({
          title: '', type: '', price: '', location: '', description: '',
          beds: '', baths: '', sqft: '', phone: '', availability: '',
          amenities: [], googleMapLink: '', images: [],
        });
        setPreviewUrls([]);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error adding property:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-8 pb-12 px-4 bg-[#FAF8F4]">
      <div className="max-w-3xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[#1C1B1A] mb-1">Add New Property</h1>
          <p className="text-[#5A5856]">Fill in the details to list a new property on BuildEstate</p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Basic Information */}
          <div className="bg-white rounded-2xl p-6 border border-[#E6D5C3] shadow-card">
            <SectionHeader icon={Home} title="Basic Information" subtitle="Core property details" />
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className={labelClass}>Property Title</label>
                <input type="text" id="title" name="title" required value={formData.title}
                  onChange={handleInputChange} placeholder="e.g. Modern 3BHK Apartment in Bandra"
                  className={inputClass} />
              </div>

              <div>
                <label htmlFor="description" className={labelClass}>Description</label>
                <textarea id="description" name="description" required value={formData.description}
                  onChange={handleInputChange} rows={4}
                  placeholder="Describe the property, its features, and surroundings..."
                  className={cn(inputClass, 'resize-none')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="type" className={labelClass}>Property Type</label>
                  <select id="type" name="type" required value={formData.type}
                    onChange={handleInputChange} className={inputClass}>
                    <option value="">Select Type</option>
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="availability" className={labelClass}>Availability</label>
                  <select id="availability" name="availability" required value={formData.availability}
                    onChange={handleInputChange} className={inputClass}>
                    <option value="">Select Availability</option>
                    {AVAILABILITY_TYPES.map((type) => (
                      <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Location & Pricing */}
          <div className="bg-white rounded-2xl p-6 border border-[#E6D5C3] shadow-card">
            <SectionHeader icon={MapPin} title="Location & Pricing" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className={labelClass}>Price (₹)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input type="number" id="price" name="price" required min="0"
                    value={formData.price} onChange={handleInputChange}
                    placeholder="e.g. 5000000" className={cn(inputClass, 'pl-10')} />
                </div>
              </div>
              <div>
                <label htmlFor="location" className={labelClass}>Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input type="text" id="location" name="location" required
                    value={formData.location} onChange={handleInputChange}
                    placeholder="e.g. Bandra West, Mumbai" className={cn(inputClass, 'pl-10')} />
                </div>
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input type="tel" id="phone" name="phone" required
                    value={formData.phone} onChange={handleInputChange}
                    placeholder="+91 98765 43210" className={cn(inputClass, 'pl-10')} />
                </div>
              </div>
              <div>
                <label htmlFor="googleMapLink" className={labelClass}>
                  Google Maps Link <span className="text-[#9CA3AF] font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input type="url" id="googleMapLink" name="googleMapLink"
                    value={formData.googleMapLink} onChange={handleInputChange}
                    placeholder="https://maps.google.com/..." className={cn(inputClass, 'pl-10')} />
                </div>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-2xl p-6 border border-[#E6D5C3] shadow-card">
            <SectionHeader icon={Maximize} title="Property Details" subtitle="Size and specifications" />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="beds" className={labelClass}>Bedrooms</label>
                <div className="relative">
                  <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input type="number" id="beds" name="beds" required min="0"
                    value={formData.beds} onChange={handleInputChange}
                    placeholder="3" className={cn(inputClass, 'pl-10')} />
                </div>
              </div>
              <div>
                <label htmlFor="baths" className={labelClass}>Bathrooms</label>
                <div className="relative">
                  <Bath className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input type="number" id="baths" name="baths" required min="0"
                    value={formData.baths} onChange={handleInputChange}
                    placeholder="2" className={cn(inputClass, 'pl-10')} />
                </div>
              </div>
              <div>
                <label htmlFor="sqft" className={labelClass}>Square Feet</label>
                <div className="relative">
                  <Maximize className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input type="number" id="sqft" name="sqft" required min="0"
                    value={formData.sqft} onChange={handleInputChange}
                    placeholder="1200" className={cn(inputClass, 'pl-10')} />
                </div>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-white rounded-2xl p-6 border border-[#E6D5C3] shadow-card">
            <SectionHeader icon={CheckSquare} title="Amenities" subtitle="Select all that apply" />
            <div className="flex flex-wrap gap-2 mb-4">
              {AMENITIES_LIST.map((amenity) => {
                const selected = formData.amenities.includes(amenity);
                return (
                  <button key={amenity} type="button" onClick={() => handleAmenityToggle(amenity)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                      selected
                        ? 'bg-[#D4755B] text-white shadow-sm'
                        : 'bg-[#FAF8F4] text-[#5A5856] border border-[#E6D5C3] hover:border-[#D4755B] hover:text-[#D4755B]'
                    )}
                  >
                    {selected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {amenity}
                  </button>
                );
              })}
            </div>

            {/* Custom amenity */}
            <div className="flex gap-2">
              <input type="text" value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAmenity())}
                placeholder="Add custom amenity..."
                className={cn(inputClass, 'flex-1')} />
              <button type="button" onClick={handleAddAmenity}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1C1B1A] text-white rounded-xl text-sm font-medium hover:bg-[#D4755B] transition-colors">
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Custom amenities list */}
            {formData.amenities.filter((a) => !AMENITIES_LIST.includes(a)).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {formData.amenities.filter((a) => !AMENITIES_LIST.includes(a)).map((amenity) => (
                  <span key={amenity}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4755B]/10 text-[#D4755B] rounded-full text-sm font-medium">
                    {amenity}
                    <button type="button" onClick={() => handleAmenityToggle(amenity)}
                      className="hover:text-[#C05E44] transition-colors">
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div className="bg-white rounded-2xl p-6 border border-[#E6D5C3] shadow-card">
            <SectionHeader icon={Upload} title="Property Images" subtitle={`${previewUrls.length}/4 images uploaded`} />

            {previewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group rounded-xl overflow-hidden aspect-square">
                    <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => removeImage(index)}
                        className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-md">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {previewUrls.length < 4 && (
              <label htmlFor="images"
                className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-[#E6D5C3] rounded-xl cursor-pointer bg-[#FAF8F4] hover:border-[#D4755B] hover:bg-[#D4755B]/5 transition-all duration-200 group">
                <Upload className="w-8 h-8 text-[#9CA3AF] group-hover:text-[#D4755B] mb-2 transition-colors" />
                <span className="text-sm font-medium text-[#5A5856] group-hover:text-[#D4755B] transition-colors">
                  Click to upload images
                </span>
                <span className="text-xs text-[#9CA3AF] mt-1">PNG, JPG up to 10MB each</span>
                <input id="images" name="images" type="file" multiple accept="image/*"
                  onChange={handleImageChange} className="sr-only" />
              </label>
            )}
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.99 }}
            className="w-full py-4 bg-[#1C1B1A] hover:bg-[#D4755B] text-[#FAF8F4] rounded-xl font-semibold text-base transition-all duration-300 shadow-lg hover:shadow-terracotta disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding Property...' : 'Add Property'}
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
};

export default PropertyForm;