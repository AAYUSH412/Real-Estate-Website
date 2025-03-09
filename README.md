# 🏡 BuildEstate - Premium Real Estate Platform


![BuildEstate Banner](https://via.placeholder.com/1200x300)

Welcome to BuildEstate, a modern and comprehensive real estate platform built using the MERN stack (MongoDB, Express, React, Node.js). This full-featured application allows users to browse, list, and manage rental and sale properties with an AI-powered recommendation system.

[![GitHub stars](https://img.shields.io/github/stars/AAYUSH412/Real-Estate-Website?style=social)](https://github.com/AAYUSH412/buildEstate/stargazers)
[![GitHub license](https://img.shields.io/github/license/AAYUSH412/Real-Estate-Website)](https://github.com/AAYUSH412/buildEstate/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/AAYUSH412/Real-Estate-Website)](https://github.com/AAYUSH412/buildEstate/issues)
[![GitHub forks](https://img.shields.io/github/forks/AAYUSH412/Real-Estate-Website?style=social)](https://github.com/AAYUSH412/buildEstate/network/members)

## 🚀 Demo

| Platform | Link |
|----------|------|
| Frontend Website | [Visit BuildEstate](https://real-estate-website-sepia-two.vercel.app) |

## ✨ Showcase

<p align="center">
  <img src="https://ik.imagekit.io/xh3awoalr/Property/github/Screenshot%202025-03-07%20at%2011.28.47%E2%80%AFAM.png" alt="Homepage" width="100%">
</p>
<p align="center">
  <img src="https://ik.imagekit.io/xh3awoalr/Property/github/Screenshot%202025-03-07%20at%2011.28.54%E2%80%AFAM.png" alt="Property Listing" width="100%">
</p>
<p align="center">
  <img src="https://ik.imagekit.io/xh3awoalr/Property/github/Screenshot%202025-03-07%20at%2011.29.18%E2%80%AFAM.png" alt="AI agent" width="100%">
</p>


## 🌟 Key Features

### 🔑 User Features
- **Advanced Property Search**: Filter by location, price, amenities, property type, and more
- **Detailed Property Listings**: High-quality images, comprehensive property information, and contact details
- **User Authentication**: Secure registration and login system with JWT authentication
- **Appointment Scheduling**: Book property viewings with integrated calendar
- **Responsive Design**: Fully optimized experience across all devices
- **Favorites System**: Save properties for later viewing
- **User Reviews**: Leave and view property reviews

### 🤖 AI-Powered Features
- **AI Property Recommendations**: Get personalized property suggestions based on preferences
- **Location Trend Analysis**: View market trends, rental yields, and property appreciation rates
- **Investment Insights**: Receive AI-generated investment recommendations for different areas
- **Natural Language Search**: Find properties using conversational queries
- **Price Prediction**: AI-powered price estimation for both buyers and sellers

### 👑 Admin Features
- **Property Management**: Add, edit, and delete property listings with ease
- **Dashboard Analytics**: Comprehensive statistics on properties, users, and views
- **Appointment Management**: Handle viewing requests and update appointment status
- **User Management**: Track user registrations and activities
- **Performance Metrics**: Analyze platform usage and performance trends

## 🛠️ Technology Stack

### Frontend
- **React 18** with functional components and hooks
- **TailwindCSS** for modern, responsive UI design
- **Framer Motion** for smooth animations and transitions
- **React Router v6** for seamless navigation
- **Axios** for API communication
- **React Query** for efficient data fetching
- **React Hook Form** with Yup for form validation

### Backend
- **Node.js & Express** for robust API development
- **MongoDB** with Mongoose for database management
- **JWT** for secure authentication
- **ImageKit** for optimized image storage and delivery
- **Nodemailer** for email notifications
- **Hugging Face** for AI model integration

### AI Integration
- **Hugging Face AI Models** for property and location analysis
- **FirecrawlJS** for real estate data extraction and processing
- **TensorFlow.js** for client-side machine learning capabilities

### DevOps
- **Vercel** for frontend deployment
- **Render** for backend deployment
- **MongoDB Atlas** for database hosting
- **GitHub Actions** for CI/CD pipeline

## 📋 Installation Guide

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- ImageKit account
- Hugging Face account (for AI features)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/AAYUSH412/Real-Estate-Website.git
   cd buildEstate
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install

   # Install admin dependencies
   cd ../admin
   npm install
   ```

3. **Environment Setup**

   **Backend `.env.local`:**
   ```
   PORT=4000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=30d
   EMAIL_SERVICE=your_email_service
   EMAIL_USERNAME=your_email_username
   EMAIL_PASSWORD=your_email_password
   EMAIL_FROM=noreply@buildEstate.com
   IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
   IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
   IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
   HF_API_TOKEN=your_hugging_face_api_token
   ```

   **Frontend `.env.local`:**
   ```
   REACT_APP_API_URL=http://localhost:4000/api
   REACT_APP_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
   REACT_APP_IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
   REACT_APP_MAPS_API_KEY=your_google_maps_api_key
   ```

   **Admin `.env.local`:**
   ```
   REACT_APP_API_URL=http://localhost:4000/api
   REACT_APP_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
   REACT_APP_IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
   REACT_APP_ADMIN_TOKEN=your_admin_token
   ```

4. **Start the application**
   ```bash
   # Start backend server
   cd backend
   npm run dev

   # Start frontend application (in a new terminal)
   cd frontend
   npm start

   # Start admin dashboard (in a new terminal)
   cd admin
   npm start
   ```

5. **Access the applications**
   - Frontend: http://localhost:5173
   - Admin: http://localhost:5174
   - Backend API: http://localhost:4000

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `POST /api/users/forgot-password` - Password reset request
- `POST /api/users/reset-password/:token` - Reset password with token
- `GET /api/users/profile` - Get user profile (requires auth)
- `PUT /api/users/profile` - Update user profile (requires auth)

### Property Endpoints
- `GET /api/products` - List all properties
- `GET /api/products/single/:id` - Get single property details
- `POST /api/products` - Add new property (requires auth)
- `PUT /api/products/:id` - Update property (requires auth)
- `DELETE /api/products/:id` - Delete property (requires auth)
- `POST /api/products/:id/favorite` - Add property to favorites (requires auth)
- `DELETE /api/products/:id/favorite` - Remove property from favorites (requires auth)
- `GET /api/products/favorites` - Get user's favorite properties (requires auth)

### Appointment Endpoints
- `POST /api/appointments` - Schedule property viewing
- `GET /api/appointments/:userId` - Get user appointments
- `PUT /api/appointments/:id` - Update appointment status (requires admin)
- `DELETE /api/appointments/:id` - Cancel appointment (requires auth)

### AI Property Endpoints
- `POST /api/search-properties` - Search properties with AI analysis
- `GET /api/location-trends/:city` - Get location trends and analysis
- `POST /api/property-value-prediction` - Get AI-based property value prediction
- `GET /api/investment-insights/:location` - Get investment insights for location

## 📦 Project Structure

```
buildEstate/
├── backend/               # Node.js and Express backend
│   ├── config/            # Configuration files
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Custom middleware
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   └── server.js          # Entry point
├── frontend/              # React frontend
│   ├── public/            # Static files
│   └── src/
│       ├── assets/        # Images, fonts, etc.
│       ├── components/    # Reusable components
│       ├── context/       # React context
│       ├── hooks/         # Custom hooks
│       ├── pages/         # Page components
│       ├── services/      # API services
│       ├── utils/         # Utility functions
│       └── App.js         # Main component
├── admin/                 # Admin dashboard
│   ├── public/            # Static files
│   └── src/
│       ├── assets/        # Admin assets
│       ├── components/    # Admin components
│       ├── pages/         # Admin pages
│       ├── services/      # Admin services
│       └── App.js         # Main admin component
└── README.md              # Project documentation
```

## 🤝 How to Contribute

We welcome contributions to BuildEstate! Here's how you can help:

1. **Fork the repository**
2. **Create a new branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Commit your changes**:
   ```bash
   git commit -m 'Add some amazing feature'
   ```
5. **Push to the branch**:
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

Please ensure your code follows our coding standards and includes appropriate tests.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔮 Future Enhancements

- **Mobile Application**: Native experience using React Native
- **Virtual Property Tours**: Interactive 360° property walkthroughs
- **Payment Integration**: Secure payment system for rental deposits and purchases
- **Enhanced AI Capabilities**: More accurate property valuation and recommendations
- **Multilingual Support**: Expand platform to support multiple languages
- **Real-time Chat**: Direct communication between users and property owners
- **Blockchain Integration**: Property verification and smart contracts

## 👨‍💻 Author

<p align="center">
  <a href="https://github.com/AAYUSH412">
  </a>
</p>
<p align="center">
  <b>Aayush Vaghela</b>
</p>
<p align="center">
  <a href="https://github.com/AAYUSH412">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://linkedin.com/in/AAYUSH412">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
  </a>
</p>

<p align="center">Made with ❤️ by Aayush Vaghela</p>
