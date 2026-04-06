import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Edit, Upload, X, Check } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Color options
const COLOR_OPTIONS = [
  { name: "Yellow Gold", value: "yellow-gold" },
  { name: "White Gold", value: "white-gold" },
  { name: "Rose Gold", value: "rose-gold" },
];

// Karat options
const KARAT_OPTIONS = ["14K", "18K", "22K"];

// Default values
const DEFAULT_WIDTH_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

// Product Form Component
const ProductForm = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    modelCode: product?.modelCode || "",
    karatOptions: product?.karatOptions || [],
    widthOptions: product?.widthOptions || [...DEFAULT_WIDTH_OPTIONS],
    gramData: product?.gramData || [],
    colors: product?.colors || [],
    karatImages: product?.karatImages || {},
  });
  const [uploading, setUploading] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedKaratForImage, setSelectedKaratForImage] = useState("");

  // Handle file upload to Cloudinary for Karat-based images
  const handleKaratImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedKaratForImage) {
      toast.error("Önce bir ayar seçin");
      return;
    }

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of files) {
        const sigResponse = await axios.get(`${API}/cloudinary/signature?folder=products`);
        const sig = sigResponse.data;

        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        formDataUpload.append("api_key", sig.api_key);
        formDataUpload.append("timestamp", sig.timestamp);
        formDataUpload.append("signature", sig.signature);
        formDataUpload.append("folder", sig.folder);

        const cloudinaryResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
          { method: "POST", body: formDataUpload }
        );

        const result = await cloudinaryResponse.json();
        
        if (result.secure_url) {
          uploadedUrls.push(result.secure_url);
        }
      }

      // Add images to selected karat
      if (uploadedUrls.length > 0) {
        const updatedKaratImages = { ...formData.karatImages };
        if (!updatedKaratImages[selectedKaratForImage]) {
          updatedKaratImages[selectedKaratForImage] = [];
        }
        updatedKaratImages[selectedKaratForImage] = [
          ...updatedKaratImages[selectedKaratForImage],
          ...uploadedUrls,
        ];
        setFormData({ ...formData, karatImages: updatedKaratImages });
      }

      toast.success(`${uploadedUrls.length} görsel yüklendi (${selectedKaratForImage})`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Görsel yüklenemedi");
    } finally {
      setUploading(false);
    }
  };

  // Handle file upload to Cloudinary for Color-based images (legacy)
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of files) {
        // Get signature from backend
        const sigResponse = await axios.get(`${API}/cloudinary/signature?folder=products`);
        const sig = sigResponse.data;

        // Upload directly to Cloudinary
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        formDataUpload.append("api_key", sig.api_key);
        formDataUpload.append("timestamp", sig.timestamp);
        formDataUpload.append("signature", sig.signature);
        formDataUpload.append("folder", sig.folder);

        const cloudinaryResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
          { method: "POST", body: formDataUpload }
        );

        const result = await cloudinaryResponse.json();
        
        if (result.secure_url) {
          uploadedUrls.push(result.secure_url);
        }
      }

      // Add images to selected color
      if (formData.colors.length > 0 && uploadedUrls.length > 0) {
        const updatedColors = [...formData.colors];
        updatedColors[selectedColorIndex].images = [
          ...updatedColors[selectedColorIndex].images,
          ...uploadedUrls,
        ];
        setFormData({ ...formData, colors: updatedColors });
      }

      toast.success(`${uploadedUrls.length} görsel yüklendi`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Görsel yüklenemedi");
    } finally {
      setUploading(false);
    }
  };

  // Add color
  const addColor = (colorName) => {
    if (formData.colors.find((c) => c.name === colorName)) {
      toast.error("Bu renk zaten ekli");
      return;
    }
    setFormData({
      ...formData,
      colors: [...formData.colors, { name: colorName, images: [] }],
    });
    setSelectedColorIndex(formData.colors.length);
  };

  // Remove color
  const removeColor = (index) => {
    const updatedColors = formData.colors.filter((_, i) => i !== index);
    setFormData({ ...formData, colors: updatedColors });
    if (selectedColorIndex >= updatedColors.length) {
      setSelectedColorIndex(Math.max(0, updatedColors.length - 1));
    }
  };

  // Remove image from color
  const removeImage = (colorIndex, imageIndex) => {
    const updatedColors = [...formData.colors];
    updatedColors[colorIndex].images = updatedColors[colorIndex].images.filter(
      (_, i) => i !== imageIndex
    );
    setFormData({ ...formData, colors: updatedColors });
  };

  // Remove image from karat
  const removeKaratImage = (karat, imageIndex) => {
    const updatedKaratImages = { ...formData.karatImages };
    updatedKaratImages[karat] = updatedKaratImages[karat].filter(
      (_, i) => i !== imageIndex
    );
    setFormData({ ...formData, karatImages: updatedKaratImages });
  };

  // Toggle karat selection
  const toggleKarat = (karat) => {
    const currentKarats = formData.karatOptions || [];
    if (currentKarats.includes(karat)) {
      setFormData({
        ...formData,
        karatOptions: currentKarats.filter(k => k !== karat)
      });
    } else {
      setFormData({
        ...formData,
        karatOptions: [...currentKarats, karat].sort()
      });
    }
  };

  // Add gram data
  const addGramData = () => {
    setFormData({
      ...formData,
      gramData: [
        ...formData.gramData,
        { karat: "14K", width: 4, gram: 3.5 },
      ],
    });
  };

  // Update gram data
  const updateGramData = (index, field, value) => {
    const updated = [...formData.gramData];
    updated[index][field] = field === "gram" || field === "width" ? parseFloat(value) : value;
    setFormData({ ...formData, gramData: updated });
  };

  // Remove gram data
  const removeGramData = (index) => {
    setFormData({
      ...formData,
      gramData: formData.gramData.filter((_, i) => i !== index),
    });
  };

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.modelCode.trim()) {
      toast.error("Model kodu gerekli");
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Model Code */}
      <div>
        <Label htmlFor="modelCode" className="text-text-primary font-inter">
          Model Kodu *
        </Label>
        <Input
          id="modelCode"
          data-testid="model-code-input"
          value={formData.modelCode}
          onChange={(e) =>
            setFormData({ ...formData, modelCode: e.target.value })
          }
          placeholder="Örn: TNY0130, AS0045, ULT0012"
          className="mt-1"
        />
        <p className="text-xs text-text-muted mt-1 font-inter">
          Katalog, kod önekine göre otomatik belirlenir (TNY, AS, ULT, ALY)
        </p>
      </div>

      {/* Karat Selection */}
      <div>
        <Label className="text-text-primary font-inter">Ayar Seçimi *</Label>
        <p className="text-xs text-text-muted mb-2 font-inter">
          Bu ürün için geçerli ayarları seçin
        </p>
        <div className="flex flex-wrap gap-2">
          {KARAT_OPTIONS.map((karat) => (
            <button
              key={karat}
              type="button"
              onClick={() => toggleKarat(karat)}
              className={`px-4 py-2 rounded border text-sm font-inter transition-all ${
                formData.karatOptions?.includes(karat)
                  ? "border-gold bg-gold text-white"
                  : "border-ivory-300 bg-white text-text-secondary hover:border-gold"
              }`}
              data-testid={`karat-toggle-${karat.toLowerCase()}`}
            >
              {karat}
            </button>
          ))}
        </div>
      </div>

      {/* Karat-based Image Upload */}
      {formData.karatOptions?.length > 0 && (
        <div>
          <Label className="text-text-primary font-inter">Ayar Görselleri</Label>
          <p className="text-xs text-text-muted mb-2 font-inter">
            Her ayar için ayrı görsel yükleyebilirsiniz
          </p>
          
          {/* Karat selector for images */}
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.karatOptions.map((karat) => (
              <button
                key={karat}
                type="button"
                onClick={() => setSelectedKaratForImage(karat)}
                className={`px-3 py-1 rounded border text-sm font-inter ${
                  selectedKaratForImage === karat
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-ivory-300 text-text-secondary"
                }`}
              >
                {karat} ({formData.karatImages?.[karat]?.length || 0} görsel)
              </button>
            ))}
          </div>

          {/* Show images for selected karat */}
          {selectedKaratForImage && (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.karatImages?.[selectedKaratForImage]?.map((imgUrl, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={imgUrl}
                      alt={`${selectedKaratForImage} ${idx}`}
                      className="w-20 h-20 object-cover rounded border border-ivory-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeKaratImage(selectedKaratForImage, idx)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Upload zone for karat images */}
              <label className={`upload-zone block ${uploading ? "opacity-50" : ""}`}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleKaratImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Upload className="mx-auto text-gold mb-2" size={24} />
                <p className="text-sm text-text-secondary font-inter">
                  {uploading ? "Yükleniyor..." : `${selectedKaratForImage} için görsel yükle`}
                </p>
              </label>
            </>
          )}
        </div>
      )}

      {/* Colors Section */}
      <div>
        <Label className="text-text-primary font-inter">Renkler</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {formData.colors.map((color, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 px-3 py-1 rounded border ${
                selectedColorIndex === idx
                  ? "border-gold bg-gold/10"
                  : "border-ivory-300"
              } cursor-pointer`}
              onClick={() => setSelectedColorIndex(idx)}
            >
              <div
                className={`w-4 h-4 rounded-full ${
                  color.name.toLowerCase().includes("yellow")
                    ? "color-yellow-gold"
                    : color.name.toLowerCase().includes("white")
                    ? "color-white-gold"
                    : "color-rose-gold"
                }`}
              />
              <span className="text-sm font-inter">{color.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeColor(idx);
                }}
                className="text-red-500 hover:text-red-700"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <Select onValueChange={addColor}>
          <SelectTrigger
            className="mt-2 w-48"
            data-testid="add-color-select"
          >
            <SelectValue placeholder="Renk Ekle" />
          </SelectTrigger>
          <SelectContent>
            {COLOR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.name}>
                {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Image Upload */}
      {formData.colors.length > 0 && (
        <div>
          <Label className="text-text-primary font-inter">
            Görseller ({formData.colors[selectedColorIndex]?.name})
          </Label>
          
          {/* Current Images */}
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.colors[selectedColorIndex]?.images.map((imgUrl, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={imgUrl.startsWith('http') ? imgUrl : `${API}/images/${imgUrl}`}
                  alt={`Product ${idx}`}
                  className="w-20 h-20 object-cover rounded border border-ivory-300"
                />
                <button
                  type="button"
                  onClick={() => removeImage(selectedColorIndex, idx)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Upload Zone */}
          <label
            className={`upload-zone mt-3 block ${uploading ? "opacity-50" : ""}`}
            data-testid="image-upload-zone"
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <Upload className="mx-auto text-gold mb-2" size={24} />
            <p className="text-sm text-text-secondary font-inter">
              {uploading ? "Yükleniyor..." : "Görsel yüklemek için tıklayın"}
            </p>
          </label>
        </div>
      )}

      {/* Gram Data */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-text-primary font-inter">Gram Verileri</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addGramData}
            data-testid="add-gram-data-btn"
          >
            <Plus size={14} className="mr-1" /> Ekle
          </Button>
        </div>
        
        {formData.gramData.length > 0 ? (
          <div className="space-y-2">
            {formData.gramData.map((gd, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={gd.karat}
                  onValueChange={(v) => updateGramData(idx, "karat", v)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_KARAT_OPTIONS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={gd.width}
                  onChange={(e) => updateGramData(idx, "width", e.target.value)}
                  placeholder="Genişlik (mm)"
                  className="w-24"
                  min="2"
                  max="10"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={gd.gram}
                  onChange={(e) => updateGramData(idx, "gram", e.target.value)}
                  placeholder="Gram"
                  className="w-24"
                />
                <button
                  type="button"
                  onClick={() => removeGramData(idx)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted font-inter">
            Gram verisi eklenmedi. Sistem tahmini değer kullanacak.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-ivory-300">
        <Button type="button" variant="outline" onClick={onCancel}>
          İptal
        </Button>
        <Button
          type="submit"
          className="btn-gold"
          data-testid="save-product-btn"
        >
          <Check size={16} className="mr-1" />
          Kaydet
        </Button>
      </div>
    </form>
  );
};

// Main Admin Page
export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filterCatalog, setFilterCatalog] = useState("all");

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const catalogParam = filterCatalog !== "all" ? `?catalog=${filterCatalog}` : "";
      const [productsRes, catalogsRes] = await Promise.all([
        axios.get(`${API}/products${catalogParam}`),
        axios.get(`${API}/catalogs`),
      ]);
      setProducts(productsRes.data);
      setCatalogs(catalogsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [filterCatalog]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle save
  const handleSave = async (formData) => {
    try {
      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, formData);
        toast.success("Ürün güncellendi");
      } else {
        await axios.post(`${API}/products`, formData);
        toast.success("Ürün eklendi");
      }
      setDialogOpen(false);
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Kaydetme hatası");
    }
  };

  // Handle delete
  const handleDelete = async (productId) => {
    if (!window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) return;
    
    try {
      await axios.delete(`${API}/products/${productId}`);
      toast.success("Ürün silindi");
      fetchData();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Silme hatası");
    }
  };

  return (
    <div className="min-h-screen bg-ivory-50" data-testid="admin-page">
      {/* Header */}
      <header className="bg-ivory-100 border-b border-ivory-300">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-text-secondary hover:text-gold transition-colors"
              data-testid="back-to-catalog-link"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="font-playfair text-2xl text-text-primary">
                Yönetim Paneli
              </h1>
              <p className="text-xs tracking-[0.15em] uppercase text-text-muted font-inter">
                Ürün Yönetimi
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingProduct(null);
              setDialogOpen(true);
            }}
            className="btn-gold"
            data-testid="add-product-btn"
          >
            <Plus size={16} className="mr-1" />
            Ürün Ekle
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-ivory-100 border-b border-ivory-300">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <span className="text-sm text-text-muted font-inter">Filtre:</span>
          <Select value={filterCatalog} onValueChange={setFilterCatalog}>
            <SelectTrigger className="w-40" data-testid="catalog-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kataloglar</SelectItem>
              {catalogs.map((cat) => (
                <SelectItem key={cat.name} value={cat.name}>
                  {cat.name} ({cat.productCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 rounded"></div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="bg-white rounded-lg border border-ivory-300 overflow-hidden">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Model Kodu</th>
                  <th>Katalog</th>
                  <th>Ayar</th>
                  <th>Renkler</th>
                  <th>Görseller</th>
                  <th className="text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} data-testid={`product-row-${product.modelCode}`}>
                    <td className="font-playfair font-semibold">
                      {product.modelCode}
                    </td>
                    <td>
                      <span className="inline-block px-2 py-1 bg-gold/10 text-gold text-xs rounded">
                        {product.catalog}
                      </span>
                    </td>
                    <td className="text-sm text-text-secondary">
                      {product.karatOptions?.join(", ")}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {product.colors?.map((c, i) => (
                          <div
                            key={i}
                            className={`w-5 h-5 rounded-full border border-ivory-300 ${
                              c.name.toLowerCase().includes("yellow")
                                ? "color-yellow-gold"
                                : c.name.toLowerCase().includes("white")
                                ? "color-white-gold"
                                : "color-rose-gold"
                            }`}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="text-sm text-text-muted">
                      {product.colors?.reduce(
                        (sum, c) => sum + (c.images?.length || 0),
                        0
                      )}{" "}
                      görsel
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setDialogOpen(true);
                          }}
                          className="p-2 hover:bg-ivory-200 rounded transition-colors"
                          data-testid={`edit-btn-${product.modelCode}`}
                        >
                          <Edit size={16} className="text-text-secondary" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-red-50 rounded transition-colors"
                          data-testid={`delete-btn-${product.modelCode}`}
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="font-playfair text-xl text-text-secondary mb-2">
              Henüz Ürün Yok
            </h3>
            <p className="text-sm text-text-muted font-inter mb-4">
              İlk ürününüzü ekleyerek başlayın
            </p>
            <Button
              onClick={() => {
                setEditingProduct(null);
                setDialogOpen(true);
              }}
              className="btn-gold"
            >
              <Plus size={16} className="mr-1" />
              Ürün Ekle
            </Button>
          </div>
        )}
      </main>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-playfair text-xl">
              {editingProduct ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            onSave={handleSave}
            onCancel={() => {
              setDialogOpen(false);
              setEditingProduct(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
