from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Response, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from bson import ObjectId
import io
import time
import cloudinary
import cloudinary.utils
import cloudinary.uploader

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# GridFS bucket for images (kept for backward compatibility)
fs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="images")

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ================== MODELS ==================

class GramData(BaseModel):
    karat: str
    width: float
    gram: float

class ColorOption(BaseModel):
    name: str
    images: List[str] = []  # Store Cloudinary URLs or GridFS IDs

class ProductBase(BaseModel):
    modelCode: str
    catalog: Optional[str] = None
    karatOptions: List[str] = ["14K", "18K", "22K"]
    widthOptions: List[float] = [2, 3, 4, 5, 6, 7, 8, 9, 10]
    gramData: List[GramData] = []
    colors: List[ColorOption] = []

class ProductCreate(ProductBase):
    @classmethod
    def validate_model_code(cls, v):
        if not v or not v.strip():
            raise ValueError("Model code is required")
        return v.strip().upper()

class ProductUpdate(BaseModel):
    modelCode: Optional[str] = None
    catalog: Optional[str] = None
    karatOptions: Optional[List[str]] = None
    widthOptions: Optional[List[float]] = None
    gramData: Optional[List[GramData]] = None
    colors: Optional[List[ColorOption]] = None

class Product(ProductBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ================== HELPER FUNCTIONS ==================

def determine_catalog(model_code: str) -> str:
    """Auto-assign catalog based on model code prefix"""
    upper_code = model_code.upper()
    if upper_code.startswith("TNY"):
        return "TNY"
    elif upper_code.startswith("AS"):
        return "AS"
    elif upper_code.startswith("ULT"):
        return "ULT"
    return "TNY"  # Default to TNY


# ================== ROUTES ==================

@api_router.get("/")
async def root():
    return {"message": "Altınay Alyans Catalog API"}


# ================== CLOUDINARY ROUTES ==================

@api_router.get("/cloudinary/signature")
async def get_cloudinary_signature(
    folder: str = Query(default="products", description="Upload folder")
):
    """Generate signed upload params for Cloudinary"""
    try:
        timestamp = int(time.time())
        
        # Allowed folders
        allowed_folders = ("products", "catalog", "uploads")
        if folder not in allowed_folders:
            folder = "products"
        
        params = {
            "timestamp": timestamp,
            "folder": f"altinay/{folder}",
        }
        
        signature = cloudinary.utils.api_sign_request(
            params,
            os.getenv("CLOUDINARY_API_SECRET")
        )
        
        return {
            "signature": signature,
            "timestamp": timestamp,
            "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME"),
            "api_key": os.getenv("CLOUDINARY_API_KEY"),
            "folder": f"altinay/{folder}"
        }
    except Exception as e:
        logger.error(f"Cloudinary signature error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/cloudinary/{public_id:path}")
async def delete_cloudinary_image(public_id: str):
    """Delete image from Cloudinary"""
    try:
        result = cloudinary.uploader.destroy(public_id, invalidate=True)
        return {"result": result}
    except Exception as e:
        logger.error(f"Cloudinary delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ================== LEGACY GRIDFS IMAGE ROUTES (for backward compatibility) ==================

@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload image to GridFS and return file ID (Legacy - use Cloudinary instead)"""
    try:
        contents = await file.read()
        
        # Store in GridFS
        file_id = await fs_bucket.upload_from_stream(
            file.filename or "image",
            io.BytesIO(contents),
            metadata={
                "content_type": file.content_type,
                "original_filename": file.filename,
                "uploaded_at": datetime.now(timezone.utc).isoformat()
            }
        )
        
        return {"id": str(file_id), "filename": file.filename}
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/images/{file_id}")
async def get_image(file_id: str):
    """Retrieve image from GridFS by ID"""
    try:
        object_id = ObjectId(file_id)
        
        # Get file info
        grid_out = await fs_bucket.open_download_stream(object_id)
        
        # Read content
        contents = await grid_out.read()
        
        # Get content type from metadata
        content_type = "image/jpeg"
        if grid_out.metadata and "content_type" in grid_out.metadata:
            content_type = grid_out.metadata["content_type"]
        
        return Response(
            content=contents,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000",
                "Content-Disposition": f"inline; filename={grid_out.filename}"
            }
        )
    except Exception as e:
        logger.error(f"Image retrieval error: {e}")
        raise HTTPException(status_code=404, detail="Image not found")


# ================== PRODUCT ROUTES ==================

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate):
    """Create a new product"""
    # Validate model code
    if not product.modelCode or not product.modelCode.strip():
        raise HTTPException(status_code=422, detail="Model code is required")
    
    product.modelCode = product.modelCode.strip().upper()
    
    # Auto-assign catalog if not provided
    catalog = product.catalog or determine_catalog(product.modelCode)
    
    product_dict = product.model_dump()
    product_dict["catalog"] = catalog
    product_dict["id"] = str(uuid.uuid4())
    product_dict["createdAt"] = datetime.now(timezone.utc).isoformat()
    product_dict["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.products.insert_one(product_dict)
    
    # Convert back for response
    product_dict["createdAt"] = datetime.fromisoformat(product_dict["createdAt"])
    product_dict["updatedAt"] = datetime.fromisoformat(product_dict["updatedAt"])
    
    return product_dict


@api_router.get("/products", response_model=List[Product])
async def get_products(catalog: Optional[str] = None):
    """Get all products, optionally filtered by catalog"""
    query = {}
    if catalog:
        query["catalog"] = catalog.upper()
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    
    # Convert ISO strings to datetime
    for p in products:
        if isinstance(p.get("createdAt"), str):
            p["createdAt"] = datetime.fromisoformat(p["createdAt"])
        if isinstance(p.get("updatedAt"), str):
            p["updatedAt"] = datetime.fromisoformat(p["updatedAt"])
    
    return products


@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    """Get a single product by ID"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if isinstance(product.get("createdAt"), str):
        product["createdAt"] = datetime.fromisoformat(product["createdAt"])
    if isinstance(product.get("updatedAt"), str):
        product["updatedAt"] = datetime.fromisoformat(product["updatedAt"])
    
    return product


@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_update: ProductUpdate):
    """Update a product"""
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in product_update.model_dump().items() if v is not None}
    
    # Re-calculate catalog if modelCode changed
    if "modelCode" in update_data:
        update_data["catalog"] = determine_catalog(update_data["modelCode"])
    
    # Convert gramData and colors to dict format
    if "gramData" in update_data:
        update_data["gramData"] = [g.model_dump() if hasattr(g, 'model_dump') else g for g in update_data["gramData"]]
    if "colors" in update_data:
        update_data["colors"] = [c.model_dump() if hasattr(c, 'model_dump') else c for c in update_data["colors"]]
    
    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.products.update_one(
        {"id": product_id},
        {"$set": update_data}
    )
    
    # Return updated product
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(updated.get("createdAt"), str):
        updated["createdAt"] = datetime.fromisoformat(updated["createdAt"])
    if isinstance(updated.get("updatedAt"), str):
        updated["updatedAt"] = datetime.fromisoformat(updated["updatedAt"])
    
    return updated


@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    """Delete a product"""
    result = await db.products.delete_one({"id": product_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted successfully"}


# ================== CATALOG ROUTES ==================

@api_router.get("/catalogs")
async def get_catalogs():
    """Get catalog info with product counts"""
    catalogs = ["TNY", "AS", "ULT"]
    result = []
    
    for cat in catalogs:
        count = await db.products.count_documents({"catalog": cat})
        result.append({
            "name": cat,
            "productCount": count
        })
    
    return result


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
