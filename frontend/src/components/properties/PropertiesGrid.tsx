import React from 'react';
import { motion } from 'framer-motion';
import PropertyCard from './PropertyCard';
import type { Property } from '../../pages/PropertiesPage';
import { formatPrice } from '../../utils/formatPrice';

interface PropertiesGridProps {
  properties: Property[];
  viewMode?: 'grid' | 'list';
}

const fallbackImages = [
  "https://images.unsplash.com/photo-1622015663381-d2e05ae91b72?w=800",
  "https://images.unsplash.com/photo-1695067440629-b5e513976100?w=800",
  "https://images.unsplash.com/photo-1738168279272-c08d6dd22002?w=800",
  "https://images.unsplash.com/photo-1769428003672-296f923d19b2?w=800",
  "https://images.unsplash.com/photo-1761509386107-9baefe0073f2?w=800",
  "https://images.unsplash.com/photo-1762732793012-8bdab3af00b4?w=800",
];

const PropertiesGrid: React.FC<PropertiesGridProps> = ({ properties, viewMode = 'grid' }) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex-1 p-8">
      {/* Properties Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12'
            : 'flex flex-col gap-6 mb-12'
        }
      >
        {properties.map((property, index) => (
          <motion.div key={property._id} variants={item}>
            <PropertyCard
              id={property._id}
              image={property.image?.[0] || fallbackImages[index % fallbackImages.length]}
              name={property.title}
              price={formatPrice(property.price)}
              location={property.location}
              beds={property.beds}
              baths={property.baths}
              sqft={property.sqft}
              badge={
                property.availability === 'sold' ? 'SOLD' :
                property.availability === 'rent' ? 'FOR RENT' :
                property.availability === 'sale' ? 'FOR SALE' :
                property.availability?.toUpperCase()
              }
              tags={property.type ? [property.type] : []}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default PropertiesGrid;