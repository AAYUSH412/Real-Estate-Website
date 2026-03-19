import fs from "fs";
import imagekit from "../config/imagekit.js";
import Property from "../models/propertyModel.js";

const addproperty = async (req, res) => {
    try {
        const { title, location, price, beds, baths, sqft, type, availability, description, amenities, phone, googleMapLink } = req.body;

        const image1 = req.files.image1 && req.files.image1[0];
        const image2 = req.files.image2 && req.files.image2[0];
        const image3 = req.files.image3 && req.files.image3[0];
        const image4 = req.files.image4 && req.files.image4[0];

        const images = [image1, image2, image3, image4].filter((item) => item !== undefined);

        // Upload images to ImageKit and delete after upload
        const imageUrls = await Promise.all(
            images.map(async (item) => {
                const result = await imagekit.upload({
                    file: fs.readFileSync(item.path),
                    fileName: item.originalname,
                    folder: "Property",
                });
                fs.unlink(item.path, (err) => {
                    if (err) console.log("Error deleting the file: ", err);
                });
                return result.url;
            })
        );

        // Create a new product
        const product = new Property({
            title,
            location,
            price,
            beds,
            baths,
            sqft,
            type,
            availability,
            description,
            amenities,
            image: imageUrls,
            phone,
            googleMapLink: googleMapLink || ''
        });

        // Save the product to the database
        await product.save();

        res.json({ message: "Product added successfully", success: true });
    } catch (error) {
        console.log("Error adding product: ", error);
        res.status(500).json({ message: "Server Error", success: false });
    }
};

const listproperty = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; // Default 20 per page
        const skip = (page - 1) * limit;

        // Only return active properties publicly.
        // Legacy admin-added documents that pre-date the status field are also
        // included via the $exists check so they are not accidentally hidden.
        const query = {
            $or: [{ status: 'active' }, { status: { $exists: false } }],
        };

        // Get total count for pagination metadata
        const totalProperties = await Property.countDocuments(query);
        const totalPages = Math.ceil(totalProperties / limit);

        // Get properties with pagination
        const property = await Property.find(query)
            .sort({ createdAt: -1 }) // Most recent first
            .limit(limit)
            .skip(skip);

        res.json({
            property,
            success: true,
            pagination: {
                currentPage: page,
                totalPages,
                totalProperties,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
                limit
            }
        });
    } catch (error) {
        console.log("Error listing products: ", error);
        res.status(500).json({ message: "Server Error", success: false });
    }
};

const removeproperty = async (req, res) => {
    try {
        const property = await Property.findByIdAndDelete(req.body.id);
        if (!property) {
            return res.status(404).json({ message: "Property not found", success: false });
        }
        return res.json({ message: "Property removed successfully", success: true });
    } catch (error) {
        console.log("Error removing product: ", error);
        return res.status(500).json({ message: "Server Error", success: false });
    }
};

const updateproperty = async (req, res) => {
    try {
        const { id, title, location, price, beds, baths, sqft, type, availability, description, amenities, phone, googleMapLink } = req.body;

        const property = await Property.findById(id);
        if (!property) {
            console.log("Property not found with ID:", id); // Debugging line
            return res.status(404).json({ message: "Property not found", success: false });
        }

        if (!req.files) {
            // No new images provided
            property.title = title;
            property.location = location;
            property.price = price;
            property.beds = beds;
            property.baths = baths;
            property.sqft = sqft;
            property.type = type;
            property.availability = availability;
            property.description = description;
            property.amenities = amenities;
            property.phone = phone;
            property.googleMapLink = googleMapLink || '';
            // Keep existing images
            await property.save();
            return res.json({ message: "Property updated successfully", success: true });
        }

        const image1 = req.files.image1 && req.files.image1[0];
        const image2 = req.files.image2 && req.files.image2[0];
        const image3 = req.files.image3 && req.files.image3[0];
        const image4 = req.files.image4 && req.files.image4[0];

        const images = [image1, image2, image3, image4].filter((item) => item !== undefined);

        // Upload images to ImageKit and delete after upload
        const imageUrls = await Promise.all(
            images.map(async (item) => {
                const result = await imagekit.upload({
                    file: fs.readFileSync(item.path),
                    fileName: item.originalname,
                    folder: "Property",
                });
                fs.unlink(item.path, (err) => {
                    if (err) console.log("Error deleting the file: ", err);
                });
                return result.url;
            })
        );

        property.title = title;
        property.location = location;
        property.price = price;
        property.beds = beds;
        property.baths = baths;
        property.sqft = sqft;
        property.type = type;
        property.availability = availability;
        property.description = description;
        property.amenities = amenities;
        property.image = imageUrls;
        property.phone = phone;
        property.googleMapLink = googleMapLink || '';

        await property.save();
        res.json({ message: "Property updated successfully", success: true });
    } catch (error) {
        console.log("Error updating product: ", error);
        res.status(500).json({ message: "Server Error", success: false });
    }
};

const singleproperty = async (req, res) => {
    try {
        const { id } = req.params;
        const property = await Property.findById(id);
        if (!property) {
            return res.status(404).json({ message: "Property not found", success: false });
        }
        // Block public access to listings that are not yet approved or have been
        // rejected/expired. Legacy docs without a status field are always visible.
        if (property.status && property.status !== 'active') {
            return res.status(404).json({ message: "Property not found", success: false });
        }
        res.json({ property, success: true });
    } catch (error) {
        console.log("Error fetching property:", error);
        res.status(500).json({ message: "Server Error", success: false });
    }
};

export { addproperty, listproperty, removeproperty, updateproperty , singleproperty};