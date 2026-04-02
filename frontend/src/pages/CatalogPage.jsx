import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import HTMLFlipBook from "react-pageflip";
import { Volume2, VolumeX, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Cover images for each catalog
const CATALOG_COVERS = {
  TNY: "https://static.prod-images.emergentagent.com/jobs/8f922a97-2dcb-4321-8dab-48b30c07b7de/images/d2d2d3b8d7b57477606e574646b8bb28d0e697b5ee7c4db58919f0e81a407065.png",
  AS: "https://static.prod-images.emergentagent.com/jobs/8f922a97-2dcb-4321-8dab-48b30c07b7de/images/e692e116605292aac38d054b2e77868afad8f12cfbb8a0bf19147edb4f76711a.png",
  ULT: "https://static.prod-images.emergentagent.com/jobs/8f922a97-2dcb-4321-8dab-48b30c07b7de/images/6907b0937868d271e1aa98306c83a90d7b77395dd6db70cec18e8a1e4d0736e0.png",
};

// Page flip sound (base64 encoded short sound)
const PAGE_FLIP_SOUND = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYV+f9RAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYV+f9RAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

// Single Page Component
const Page = ({ children, className = "", isLeft = false }) => {
  return (
    <div 
      className={`page w-full h-full ${isLeft ? 'page-left' : 'page-right'} ${className}`}
      style={{ backgroundColor: '#FDFBF7' }}
    >
      {children}
    </div>
  );
};

// Cover Page Component
const CoverPage = ({ catalog, isBack = false }) => {
  return (
    <Page className="cover-page">
      <div className="w-full h-full flex flex-col items-center justify-center p-8 relative">
        <img 
          src={CATALOG_COVERS[catalog]} 
          alt={`${catalog} Catalog Cover`}
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="relative z-10 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-text-muted mb-4 font-inter">
            {isBack ? "" : "Altınay Alyans"}
          </p>
          <h1 className="font-playfair text-5xl sm:text-6xl text-text-primary mb-4">
            {isBack ? "Teşekkürler" : catalog}
          </h1>
          <p className="text-sm tracking-[0.2em] uppercase text-gold font-inter">
            {isBack ? "www.altinayalyans.com" : "Koleksiyon"}
          </p>
        </div>
      </div>
    </Page>
  );
};

// Product Page Component
const ProductPage = ({ product, isLeft }) => {
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedKarat, setSelectedKarat] = useState(product.karatOptions?.[0] || "14K");
  const [selectedWidth, setSelectedWidth] = useState(product.widthOptions?.[0] || 4);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Calculate gram based on karat and width
  const getGram = () => {
    const gramEntry = product.gramData?.find(
      g => g.karat === selectedKarat && g.width === selectedWidth
    );
    return gramEntry?.gram || calculateEstimatedGram(selectedKarat, selectedWidth);
  };

  // Estimated gram calculation if no data
  const calculateEstimatedGram = (karat, width) => {
    const baseGram = 2.5;
    const karatMultiplier = karat === "22K" ? 1.3 : karat === "18K" ? 1.15 : 1;
    const widthMultiplier = width / 4;
    return (baseGram * karatMultiplier * widthMultiplier).toFixed(2);
  };

  // Get current image
  const getCurrentImage = () => {
    const color = product.colors?.[selectedColor];
    if (color && color.images && color.images.length > 0) {
      return `${API}/images/${color.images[0]}`;
    }
    return "https://images.unsplash.com/photo-1662199295236-a7d1a0129867?w=600";
  };

  return (
    <Page isLeft={isLeft}>
      <div className="w-full h-full flex flex-col p-6 sm:p-10">
        {/* Header */}
        <div className="mb-4">
          <p className="text-xs tracking-[0.2em] uppercase text-text-muted font-inter mb-1">
            Model
          </p>
          <h2 className="font-playfair text-3xl sm:text-4xl text-text-primary">
            {product.modelCode}
          </h2>
        </div>

        {/* Product Image */}
        <div className="flex-1 flex items-center justify-center mb-6 relative min-h-[200px]">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="skeleton w-48 h-48 rounded-lg"></div>
            </div>
          )}
          <img
            src={getCurrentImage()}
            alt={product.modelCode}
            className={`product-image max-h-[280px] transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1662199295236-a7d1a0129867?w=600";
              setImageLoaded(true);
            }}
          />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Color Selector */}
          {product.colors && product.colors.length > 0 && (
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-text-muted font-inter mb-2">
                Renk
              </p>
              <div className="flex gap-3">
                {product.colors.map((color, idx) => (
                  <button
                    key={idx}
                    data-testid={`color-swatch-${color.name.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => {
                      setSelectedColor(idx);
                      setImageLoaded(false);
                    }}
                    className={`color-swatch ${
                      color.name.toLowerCase().includes('yellow') ? 'color-yellow-gold' :
                      color.name.toLowerCase().includes('white') ? 'color-white-gold' :
                      color.name.toLowerCase().includes('rose') ? 'color-rose-gold' :
                      'color-yellow-gold'
                    } ${selectedColor === idx ? 'active' : ''}`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Karat Selector */}
          <div>
            <p className="text-xs tracking-[0.15em] uppercase text-text-muted font-inter mb-2">
              Ayar
            </p>
            <div className="flex gap-2">
              {product.karatOptions?.map((karat) => (
                <button
                  key={karat}
                  data-testid={`karat-selector-${karat.toLowerCase()}`}
                  onClick={() => setSelectedKarat(karat)}
                  className={`karat-btn text-sm font-inter ${selectedKarat === karat ? 'active' : ''}`}
                >
                  {karat}
                </button>
              ))}
            </div>
          </div>

          {/* Width Selector */}
          <div>
            <p className="text-xs tracking-[0.15em] uppercase text-text-muted font-inter mb-2">
              Genişlik: <span className="text-gold font-semibold">{selectedWidth}mm</span>
            </p>
            <input
              type="range"
              data-testid="width-slider"
              min={Math.min(...(product.widthOptions || [2]))}
              max={Math.max(...(product.widthOptions || [10]))}
              step="1"
              value={selectedWidth}
              onChange={(e) => setSelectedWidth(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1 font-inter">
              <span>{Math.min(...(product.widthOptions || [2]))}mm</span>
              <span>{Math.max(...(product.widthOptions || [10]))}mm</span>
            </div>
          </div>

          {/* Gram Display */}
          <div className="pt-2 border-t border-ivory-300">
            <p className="text-xs tracking-[0.15em] uppercase text-text-muted font-inter mb-1">
              Gram
            </p>
            <p className="font-playfair text-2xl text-gold">
              {getGram()} gr
            </p>
          </div>
        </div>
      </div>
    </Page>
  );
};

// Empty State Page
const EmptyPage = ({ catalog }) => (
  <Page>
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      <div className="empty-state">
        <h3 className="font-playfair text-2xl text-text-secondary mb-2">
          Ürün Bulunamadı
        </h3>
        <p className="text-sm text-text-muted font-inter mb-4">
          {catalog} kataloğunda henüz ürün yok.
        </p>
        <Link 
          to="/admin"
          className="btn-gold px-6 py-2 rounded text-sm font-inter"
          data-testid="add-product-link"
        >
          Ürün Ekle
        </Link>
      </div>
    </div>
  </Page>
);

// Main Catalog Page
export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [activeCatalog, setActiveCatalog] = useState("TNY");
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const bookRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(PAGE_FLIP_SOUND);
    audioRef.current.volume = 0.3;
  }, []);

  // Fetch products and catalogs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, catalogsRes] = await Promise.all([
          axios.get(`${API}/products?catalog=${activeCatalog}`),
          axios.get(`${API}/catalogs`)
        ]);
        setProducts(productsRes.data);
        setCatalogs(catalogsRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeCatalog]);

  // Handle page flip
  const onFlip = useCallback((e) => {
    setCurrentPage(e.data);
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Navigation
  const goToPrevPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipPrev();
    }
  };

  const goToNextPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipNext();
    }
  };

  // Total pages (cover + products + back cover)
  const totalPages = products.length > 0 ? products.length + 2 : 3;

  return (
    <div className="min-h-screen bg-ivory-50" data-testid="catalog-page">
      {/* Header */}
      <header className="bg-ivory-100 border-b border-ivory-300">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-playfair text-2xl text-text-primary">
              Altınay Alyans
            </h1>
            <p className="text-xs tracking-[0.15em] uppercase text-text-muted font-inter">
              Dijital Katalog
            </p>
          </div>
          <Link 
            to="/admin" 
            className="flex items-center gap-2 text-text-secondary hover:text-gold transition-colors"
            data-testid="admin-link"
          >
            <Settings size={18} />
            <span className="font-inter text-sm">Yönetim</span>
          </Link>
        </div>
      </header>

      {/* Catalog Tabs */}
      <div className="bg-ivory-100 border-b border-ivory-300">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto">
          {["TNY", "AS", "ULT"].map((cat) => {
            const catalogInfo = catalogs.find(c => c.name === cat);
            return (
              <button
                key={cat}
                data-testid={`catalog-tab-${cat.toLowerCase()}`}
                onClick={() => {
                  setActiveCatalog(cat);
                  setCurrentPage(0);
                }}
                className={`catalog-tab ${activeCatalog === cat ? 'active' : ''}`}
              >
                {cat}
                {catalogInfo && (
                  <span className="ml-2 text-xs opacity-70">
                    ({catalogInfo.productCount})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Flipbook Area */}
      <main className="flex-1 flex items-center justify-center py-8 px-4 min-h-[calc(100vh-160px)]">
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="skeleton w-[600px] h-[500px] rounded-lg"></div>
          </div>
        ) : (
          <div className="flipbook-container relative w-full max-w-[900px]">
            {/* Book Spine Effect */}
            <div className="book-spine hidden sm:block"></div>
            
            {/* Navigation Buttons */}
            <button
              data-testid="prev-page-button"
              onClick={goToPrevPage}
              className="page-nav-btn prev"
              disabled={currentPage === 0}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              data-testid="next-page-button"
              onClick={goToNextPage}
              className="page-nav-btn next"
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRight size={20} />
            </button>

            {/* Flipbook */}
            <HTMLFlipBook
              ref={bookRef}
              width={400}
              height={550}
              size="stretch"
              minWidth={300}
              maxWidth={500}
              minHeight={400}
              maxHeight={600}
              showCover={true}
              mobileScrollSupport={true}
              onFlip={onFlip}
              className="flipbook mx-auto"
              style={{ margin: '0 auto' }}
              flippingTime={600}
              usePortrait={true}
              startZIndex={0}
              autoSize={true}
              maxShadowOpacity={0.3}
              drawShadow={true}
              useMouseEvents={true}
            >
              {/* Front Cover */}
              <div data-testid="cover-page">
                <CoverPage catalog={activeCatalog} />
              </div>

              {/* Product Pages */}
              {products.length > 0 ? (
                products.map((product, idx) => (
                  <div key={product.id} data-testid={`product-page-${product.modelCode}`}>
                    <ProductPage 
                      product={product} 
                      isLeft={idx % 2 === 0}
                    />
                  </div>
                ))
              ) : (
                <div data-testid="empty-page">
                  <EmptyPage catalog={activeCatalog} />
                </div>
              )}

              {/* Back Cover */}
              <div data-testid="back-cover">
                <CoverPage catalog={activeCatalog} isBack={true} />
              </div>
            </HTMLFlipBook>

            {/* Page Counter */}
            <div className="text-center mt-4">
              <p className="text-sm text-text-muted font-inter">
                Sayfa {currentPage + 1} / {totalPages}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Sound Toggle */}
      <button
        data-testid="sound-toggle"
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="sound-toggle"
        title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
      >
        {soundEnabled ? <Volume2 size={20} className="text-gold" /> : <VolumeX size={20} className="text-text-muted" />}
      </button>
    </div>
  );
}
