# Source inventory

Date: 2026-11-02. Inventory and static scans cover the listed application files. Backend routes, controllers, schemas, middleware and services were examined by module; admin pages were traced against API calls. Generated UI primitives received import/type checks. This inventory is not a claim of manual line-by-line verification of every presentation file.

| File | Lines | Review focus |
|---|---:|---|
| `admin/src/App.jsx` | 129 | Static import/pattern scan; presentation and supporting code |
| `admin/src/components/ActivityLogDetailModal.jsx` | 210 | Static import/pattern scan; presentation and supporting code |
| `admin/src/components/BanUserModal.jsx` | 169 | Static import/pattern scan; presentation and supporting code |
| `admin/src/components/BulkActionBar.jsx` | 150 | Static import/pattern scan; presentation and supporting code |
| `admin/src/components/ErrorFallback.jsx` | 31 | Static import/pattern scan; presentation and supporting code |
| `admin/src/components/Navbar.jsx` | 347 | Static import/pattern scan; presentation and supporting code |
| `admin/src/components/ProtectedRoute.jsx` | 17 | Static import/pattern scan; presentation and supporting code |
| `admin/src/components/Sidebar.jsx` | 273 | Static import/pattern scan; presentation and supporting code |
| `admin/src/components/SuspendUserModal.jsx` | 174 | Static import/pattern scan; presentation and supporting code |
| `admin/src/components/UserStatusBadge.jsx` | 42 | Static import/pattern scan; presentation and supporting code |
| `admin/src/components/login.jsx` | 241 | Static import/pattern scan; presentation and supporting code |
| `admin/src/config/constants.js` | 18 | Static import/pattern scan; presentation and supporting code |
| `admin/src/constants/amenities.js` | 54 | Static import/pattern scan; presentation and supporting code |
| `admin/src/contexts/AuthContext.jsx` | 75 | Route, workflow, state and API integration review |
| `admin/src/hooks/useAuth.js` | 10 | Static import/pattern scan; presentation and supporting code |
| `admin/src/index.css` | 86 | Static import/pattern scan; presentation and supporting code |
| `admin/src/lib/utils.js` | 44 | Static import/pattern scan; presentation and supporting code |
| `admin/src/main.jsx` | 13 | Static import/pattern scan; presentation and supporting code |
| `admin/src/pages/AIModels.jsx` | 476 | Route, workflow, state and API integration review |
| `admin/src/pages/ActivityLogs.jsx` | 526 | Route, workflow, state and API integration review |
| `admin/src/pages/Add.jsx` | 372 | Route, workflow, state and API integration review |
| `admin/src/pages/Appointments.jsx` | 331 | Route, workflow, state and API integration review |
| `admin/src/pages/Dashboard.jsx` | 614 | Route, workflow, state and API integration review |
| `admin/src/pages/List.jsx` | 377 | Route, workflow, state and API integration review |
| `admin/src/pages/PendingListings.jsx` | 559 | Route, workflow, state and API integration review |
| `admin/src/pages/Update.jsx` | 350 | Route, workflow, state and API integration review |
| `admin/src/pages/UserDetails.jsx` | 500 | Route, workflow, state and API integration review |
| `admin/src/pages/Users.jsx` | 607 | Route, workflow, state and API integration review |
| `admin/src/services/apiClient.js` | 72 | Route, workflow, state and API integration review |
| `backend/.rate-limit-store/12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0.json` | 1 | Backend module / configuration review |
| `backend/config/config.js` | 10 | Backend module / configuration review |
| `backend/config/imagekit.js` | 24 | Backend module / configuration review |
| `backend/config/mongodb.js` | 60 | Backend module / configuration review |
| `backend/config/nodemailer.js` | 66 | Backend module / configuration review |
| `backend/controller/adminController.js` | 1570 | Backend module / configuration review |
| `backend/controller/aiModelController.js` | 235 | Backend module / configuration review |
| `backend/controller/appointmentController.js` | 496 | Backend module / configuration review |
| `backend/controller/formController.js` | 35 | Backend module / configuration review |
| `backend/controller/newsController.js` | 77 | Backend module / configuration review |
| `backend/controller/productController.js` | 205 | Backend module / configuration review |
| `backend/controller/propertyController.js` | 833 | Backend module / configuration review |
| `backend/controller/userController.js` | 571 | Backend module / configuration review |
| `backend/docker-compose.yml` | 11 | Backend module / configuration review |
| `backend/email.js` | 368 | Backend module / configuration review |
| `backend/middleware/authMiddleware.js` | 97 | Backend module / configuration review |
| `backend/middleware/multer.js` | 75 | Backend module / configuration review |
| `backend/middleware/rateLimitMiddleware.js` | 123 | Backend module / configuration review |
| `backend/middleware/requestIdMiddleware.js` | 40 | Backend module / configuration review |
| `backend/middleware/statsMiddleware.js` | 25 | Backend module / configuration review |
| `backend/middleware/transformRequest.js` | 44 | Backend module / configuration review |
| `backend/models/adminActivityLogModel.js` | 69 | Backend module / configuration review |
| `backend/models/aiModelModel.js` | 26 | Backend module / configuration review |
| `backend/models/appointmentModel.js` | 70 | Backend module / configuration review |
| `backend/models/formModel.js` | 25 | Backend module / configuration review |
| `backend/models/newsModel.js` | 12 | Backend module / configuration review |
| `backend/models/propertyModel.js` | 112 | Backend module / configuration review |
| `backend/models/searchCacheModel.js` | 25 | Backend module / configuration review |
| `backend/models/statsModel.js` | 34 | Backend module / configuration review |
| `backend/models/trendsCacheModel.js` | 25 | Backend module / configuration review |
| `backend/models/userModel.js` | 75 | Backend module / configuration review |
| `backend/package.json` | 48 | Backend module / configuration review |
| `backend/render.yaml` | 13 | Backend module / configuration review |
| `backend/routes/adminRoutes.js` | 99 | Backend module / configuration review |
| `backend/routes/appointmentRoutes.js` | 32 | Backend module / configuration review |
| `backend/routes/formRoutes.js` | 8 | Backend module / configuration review |
| `backend/routes/healthRoutes.js` | 108 | Backend module / configuration review |
| `backend/routes/newsRoutes.js` | 9 | Backend module / configuration review |
| `backend/routes/productRoutes.js` | 25 | Backend module / configuration review |
| `backend/routes/propertyRoutes.js` | 93 | Backend module / configuration review |
| `backend/routes/userRoutes.js` | 23 | Backend module / configuration review |
| `backend/scripts/createAdmin.js` | 48 | Backend module / configuration review |
| `backend/scripts/migrateAIModels.js` | 166 | Backend module / configuration review |
| `backend/scripts/migrateUserStatus.js` | 46 | Backend module / configuration review |
| `backend/server.js` | 306 | Backend module / configuration review |
| `backend/serverweb.js` | 148 | Backend module / configuration review |
| `backend/services/aiService.js` | 360 | Backend module / configuration review |
| `backend/services/emailService.js` | 275 | Backend module / configuration review |
| `backend/services/firecrawlService.js` | 914 | Backend module / configuration review |
| `backend/services/llm/GitHubModelsProvider.js` | 143 | Backend module / configuration review |
| `backend/services/llm/LLMProvider.js` | 17 | Backend module / configuration review |
| `backend/services/llm/LLMRouter.js` | 48 | Backend module / configuration review |
| `backend/services/llm/NvidiaNimProvider.js` | 169 | Backend module / configuration review |
| `backend/setup.sh` | 270 | Backend module / configuration review |
| `backend/test-import.mjs` | 3 | Backend module / configuration review |
| `backend/utils/activityLogger.js` | 41 | Backend module / configuration review |
| `backend/utils/autoUnsuspend.js` | 73 | Backend module / configuration review |
| `backend/utils/banner.js` | 53 | Backend module / configuration review |
| `backend/utils/circuitBreaker.js` | 215 | Backend module / configuration review |
| `backend/utils/distributedRateLimiter.js` | 240 | Backend module / configuration review |
| `backend/utils/emailValidation.js` | 118 | Backend module / configuration review |
| `backend/utils/expireListings.js` | 31 | Backend module / configuration review |
| `backend/utils/logger.js` | 87 | Backend module / configuration review |
| `backend/utils/requestCoalescer.js` | 53 | Backend module / configuration review |
| `backend/utils/validateAIResponse.js` | 336 | Backend module / configuration review |
| `backend/vercel.json` | 30 | Backend module / configuration review |
| `frontend/api/sitemap.js` | 69 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/App.tsx` | 91 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/about/AboutAISection.tsx` | 114 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/about/AboutCTASection.tsx` | 37 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/about/AboutHeritageSection.tsx` | 92 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/about/AboutHeroSection.tsx` | 40 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/about/AboutStatsSection.tsx` | 56 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/about/AboutValuesSection.tsx` | 65 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/ai-hub/AIAnalysisPanel.tsx` | 170 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/ai-hub/AIApiKeyModal.tsx` | 190 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/ai-hub/AICTASection.tsx` | 42 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/ai-hub/AIDeepDiveSection.tsx` | 202 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/ai-hub/AIHeroSection.tsx` | 724 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/ai-hub/AIInsightsSection.tsx` | 70 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/ai-hub/AILocationTrends.tsx` | 305 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/ai-hub/AISearchResults.tsx` | 765 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/ai-hub/AITopMatchesSection.tsx` | 150 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/auth/AuthHeader.tsx` | 15 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/auth/SignInForm.tsx` | 110 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/auth/SignUpForm.tsx` | 189 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/auth/SocialLoginButtons.tsx` | 47 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/common/Footer.tsx` | 194 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/common/LoadingSpinner.tsx` | 18 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/common/LoadingState.tsx` | 18 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/common/Navbar.tsx` | 248 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/common/PageTransition.tsx` | 25 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/common/ScrollReveal.tsx` | 24 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/common/ScrollToTop.tsx` | 14 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/common/SimpleFooter.tsx` | 24 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/common/StructuredData.tsx` | 185 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/contact/ContactFormCard.tsx` | 182 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/contact/ContactHeroSection.tsx` | 31 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/contact/ContactInfoCards.tsx` | 107 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/contact/ContactMapSection.tsx` | 43 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/contact/FAQSection.tsx` | 119 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/contact/NewsletterBanner.tsx` | 77 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/contact/OtherWaysSection.tsx` | 97 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/figma/ImageWithFallback.tsx` | 27 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/home/AIIntelligenceSection.tsx` | 60 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/home/CTASection.tsx` | 38 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/home/CuratedListingsSection.tsx` | 140 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/home/HeroSection.tsx` | 171 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/home/ProcessSection.tsx` | 106 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/home/StatsSection.tsx` | 30 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/home/TestimonialsSection.tsx` | 79 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/home/TrustSignalsSection.tsx` | 83 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/properties/FilterBar.tsx` | 366 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/properties/FilterSidebar.tsx` | 323 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/properties/PropertiesGrid.tsx` | 141 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/properties/PropertiesHeader.tsx` | 97 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/properties/PropertyCard.tsx` | 109 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/property/PropertyCard.tsx` | 72 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/property-details/PropertyAbout.tsx` | 37 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/property-details/PropertyAmenities.tsx` | 117 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/property-details/PropertyBreadcrumb.tsx` | 61 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/property-details/PropertyHeader.tsx` | 76 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/property-details/PropertyHeroImage.tsx` | 258 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/property-details/PropertyLocation.tsx` | 134 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/property-details/ScheduleViewingCard.tsx` | 162 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/components/ui/accordion.tsx` | 66 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/alert-dialog.tsx` | 157 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/alert.tsx` | 66 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/aspect-ratio.tsx` | 11 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/avatar.tsx` | 53 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/badge.tsx` | 46 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/breadcrumb.tsx` | 109 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/button.tsx` | 58 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/calendar.tsx` | 75 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/card.tsx` | 92 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/carousel.tsx` | 241 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/chart.tsx` | 353 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/checkbox.tsx` | 32 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/collapsible.tsx` | 33 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/command.tsx` | 177 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/context-menu.tsx` | 252 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/dialog.tsx` | 135 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/drawer.tsx` | 132 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/dropdown-menu.tsx` | 257 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/form.tsx` | 168 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/hover-card.tsx` | 44 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/input-otp.tsx` | 77 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/input.tsx` | 21 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/label.tsx` | 24 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/menubar.tsx` | 276 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/navigation-menu.tsx` | 168 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/pagination.tsx` | 127 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/popover.tsx` | 48 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/progress.tsx` | 31 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/radio-group.tsx` | 45 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/resizable.tsx` | 56 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/scroll-area.tsx` | 58 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/select.tsx` | 189 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/separator.tsx` | 28 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/sheet.tsx` | 139 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/sidebar.tsx` | 726 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/skeleton.tsx` | 13 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/slider.tsx` | 63 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/sonner.tsx` | 25 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/switch.tsx` | 31 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/table.tsx` | 116 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/tabs.tsx` | 66 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/textarea.tsx` | 18 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/toggle-group.tsx` | 73 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/toggle.tsx` | 47 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/tooltip.tsx` | 61 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/use-mobile.ts` | 21 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/components/ui/utils.ts` | 6 | UI primitive: import/dependency and TypeScript checks |
| `frontend/src/contexts/AuthContext.tsx` | 115 | Route, workflow, state and API integration review |
| `frontend/src/hooks/useSEO.ts` | 88 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/main.tsx` | 11 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/pages/AIPropertyHubPage.tsx` | 584 | Route, workflow, state and API integration review |
| `frontend/src/pages/AboutUsPage.tsx` | 51 | Route, workflow, state and API integration review |
| `frontend/src/pages/AddPropertyPage.tsx` | 514 | Route, workflow, state and API integration review |
| `frontend/src/pages/ContactPage.tsx` | 85 | Route, workflow, state and API integration review |
| `frontend/src/pages/DashboardPage.tsx` | 500 | Route, workflow, state and API integration review |
| `frontend/src/pages/ForgotPasswordPage.tsx` | 148 | Route, workflow, state and API integration review |
| `frontend/src/pages/HomePage.tsx` | 75 | Route, workflow, state and API integration review |
| `frontend/src/pages/MyListingsPage.tsx` | 416 | Route, workflow, state and API integration review |
| `frontend/src/pages/PropertiesPage.tsx` | 172 | Route, workflow, state and API integration review |
| `frontend/src/pages/PropertyDetailsPage.tsx` | 231 | Route, workflow, state and API integration review |
| `frontend/src/pages/ResetPasswordPage.tsx` | 266 | Route, workflow, state and API integration review |
| `frontend/src/pages/SignInPage.tsx` | 77 | Route, workflow, state and API integration review |
| `frontend/src/pages/SignUpPage.tsx` | 124 | Route, workflow, state and API integration review |
| `frontend/src/pages/VerifyEmailPage.tsx` | 140 | Route, workflow, state and API integration review |
| `frontend/src/services/api.ts` | 327 | Route, workflow, state and API integration review |
| `frontend/src/styles/fonts.css` | 4 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/styles/index.css` | 3 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/styles/tailwind.css` | 4 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/styles/theme.css` | 275 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/utils/formatPrice.ts` | 20 | Static import/pattern scan; presentation and supporting code |
| `frontend/src/vite-env.d.ts` | 10 | Static import/pattern scan; presentation and supporting code |
| `shared/utils/formatPrice.ts` | 20 | Static import/pattern scan; presentation and supporting code |
| `shared/utils/index.ts` | 10 | Static import/pattern scan; presentation and supporting code |
