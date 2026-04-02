# Altınay Alyans - Digital Catalog System PRD

## Original Problem Statement
Create a full-stack digital catalog system for "Altınay Alyans" jewelry brand with:
- Real flipbook (book-style catalog) with 3D page flip animation
- Page flip sound (toggleable)
- MongoDB GridFS image storage
- 3 catalogs: TNY, AS, ULT (auto-assigned by model code prefix)
- Admin system (no login) for CRUD operations
- NO card UI - only flipbook pages

## User Choices
- Library: react-pageflip
- Sound: Default subtle paper sound
- Storage: MongoDB GridFS
- Theme: Elegant gold & ivory (luxury jewelry style)
- Database: katalog

## Architecture
- **Frontend**: React + react-pageflip + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Motor (async MongoDB) + GridFS
- **Database**: MongoDB (local)

## Core Requirements (Static)
1. Flipbook UI with 3D page flip animation
2. GridFS image upload/storage
3. 3 catalogs (TNY, AS, ULT) with auto-assignment
4. Product CRUD without authentication
5. Karat/Width/Color selectors per product
6. Dynamic gram calculation

## What's Been Implemented
### Date: 2026-04-02
- ✅ Flipbook catalog with react-pageflip (3D animation)
- ✅ Page flip sound toggle
- ✅ MongoDB GridFS image upload/retrieval
- ✅ 3 catalogs with auto-assignment by model code prefix
- ✅ Product CRUD API endpoints
- ✅ Admin panel with product management
- ✅ Gold & ivory luxury theme with Playfair Display + Inter fonts
- ✅ Karat selector (14K, 18K, 22K)
- ✅ Width slider (2-10mm)
- ✅ Color swatches (Yellow/White/Rose Gold)
- ✅ Dynamic gram display

## API Endpoints
- POST /api/products - Create product
- GET /api/products - List products (with ?catalog= filter)
- GET /api/products/:id - Get single product
- PUT /api/products/:id - Update product
- DELETE /api/products/:id - Delete product
- POST /api/upload - Upload image to GridFS
- GET /api/images/:id - Retrieve image from GridFS
- GET /api/catalogs - List catalogs with counts

## Database Schema
```
Product {
  id: string (UUID)
  modelCode: string
  catalog: string (TNY|AS|ULT)
  karatOptions: string[]
  widthOptions: number[]
  gramData: [{karat, width, gram}]
  colors: [{name, images[]}]
  createdAt: datetime
  updatedAt: datetime
}
```

## Prioritized Backlog
### P0 (Critical) - DONE
- Flipbook UI ✅
- GridFS image storage ✅
- Product CRUD ✅

### P1 (High) - Future
- Add more page flip sound options
- Bulk image upload
- Product ordering/sorting

### P2 (Medium) - Future
- Print catalog view
- Product search
- Image optimization/compression

## Next Tasks
1. Configure MongoDB Atlas SSL (user's Atlas connection has SSL issues)
2. Add more sample products
3. Implement product ordering within catalog
