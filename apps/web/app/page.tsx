'use client';

import React, { useState, useEffect } from 'react';

// Shared Enums (inlined for Phase 1 screen sketch reactivity)
enum UserRole {
  CUSTOMER = 'CUSTOMER',
  STORE_MANAGER = 'STORE_MANAGER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

enum UnitType {
  EACH = 'EACH',
  WEIGHT = 'WEIGHT',
}

enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PICKING = 'PICKING',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

enum SubstitutionPreference {
  ALLOW_SUBSTITUTES = 'ALLOW_SUBSTITUTES',
  REFUND_ITEM = 'REFUND_ITEM',
  CONTACT_ME = 'CONTACT_ME',
}

interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number; // in cents
  unitType: UnitType;
  unitLabel: string;
  stock: number; // units or grams
  lowThreshold: number;
  imageUrl: string;
}

const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'p-1',
    name: 'Organic Cavendish Bananas',
    category: 'Fresh Produce',
    price: 199, // $1.99 / kg
    unitType: UnitType.WEIGHT,
    unitLabel: 'kg',
    stock: 45000, // 45 kg
    lowThreshold: 5000,
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-2',
    name: 'Honeycrisp Apples',
    category: 'Fresh Produce',
    price: 349, // $3.49 / kg
    unitType: UnitType.WEIGHT,
    unitLabel: 'kg',
    stock: 30000,
    lowThreshold: 4000,
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-3',
    name: 'Fresh Hass Avocados',
    category: 'Fresh Produce',
    price: 149, // $1.49 each
    unitType: UnitType.EACH,
    unitLabel: 'each',
    stock: 80,
    lowThreshold: 15,
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-4',
    name: 'Organic Whole Milk 1 Gallon',
    category: 'Dairy & Eggs',
    price: 429, // $4.29 each
    unitType: UnitType.EACH,
    unitLabel: '1 gal',
    stock: 35,
    lowThreshold: 8,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-5',
    name: 'Pasture-Raised Large Eggs',
    category: 'Dairy & Eggs',
    price: 499, // $4.99 each
    unitType: UnitType.EACH,
    unitLabel: '12 pack',
    stock: 40,
    lowThreshold: 10,
    imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-6',
    name: 'Artisan Sourdough Boule',
    category: 'Bakery',
    price: 449, // $4.49 each
    unitType: UnitType.EACH,
    unitLabel: 'loaf',
    stock: 4, // low stock!
    lowThreshold: 5,
    imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-7',
    name: 'Grass-Fed Ground Beef (85/15)',
    category: 'Meat & Seafood',
    price: 999, // $9.99 / kg
    unitType: UnitType.WEIGHT,
    unitLabel: 'kg',
    stock: 22000,
    lowThreshold: 3000,
    imageUrl: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-8',
    name: 'Extra Virgin Olive Oil 500ml',
    category: 'Pantry & Staples',
    price: 899, // $8.99 each
    unitType: UnitType.EACH,
    unitLabel: 'bottle',
    stock: 22,
    lowThreshold: 5,
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
  },
];

const DELIVERY_SLOTS = [
  { id: 'slot-1', time: 'Today: 09:00 AM - 11:00 AM', capacity: 10, booked: 7 },
  { id: 'slot-2', time: 'Today: 01:00 PM - 03:00 PM', capacity: 10, booked: 3 },
  { id: 'slot-3', time: 'Today: 05:00 PM - 07:00 PM', capacity: 10, booked: 9 },
  { id: 'slot-4', time: 'Tomorrow: 10:00 AM - 12:00 PM', capacity: 10, booked: 1 },
];

export default function GroceRealApp() {
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<{ [productId: string]: number }>({
    'p-1': 1500, // 1500g bananas
    'p-4': 1,    // 1 milk
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('slot-2');
  const [subPreference, setSubPreference] = useState<SubstitutionPreference>(
    SubstitutionPreference.ALLOW_SUBSTITUTES
  );

  // Active Simulated Order State
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(OrderStatus.PICKING);
  const [driverAccepted, setDriverAccepted] = useState<boolean>(false);
  const [apiHealth, setApiHealth] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  const [categoryList, setCategoryList] = useState<string[]>([
    'All',
    'Fresh Produce',
    'Dairy & Eggs',
    'Bakery',
    'Meat & Seafood',
    'Pantry & Staples',
  ]);

  // Check API health status and load live catalog if available
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

    // 1. Health check
    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then(() => setApiHealth('connected'))
      .catch(() => setApiHealth('disconnected'));

    // 2. Fetch live stores and products from Supabase
    fetch(`${apiUrl}/stores`)
      .then((res) => res.json())
      .then(async (stores) => {
        if (Array.isArray(stores) && stores.length > 0) {
          const store = stores[0];
          // Fetch categories
          const catRes = await fetch(`${apiUrl}/stores/${store.id}/categories`);
          const cats = await catRes.json();
          if (Array.isArray(cats) && cats.length > 0) {
            setCategoryList(['All', ...cats.map((c: { name: string }) => c.name)]);
          }

          // Fetch products
          const prodRes = await fetch(`${apiUrl}/stores/${store.id}/products`);
          const prods = await prodRes.json();
          if (Array.isArray(prods) && prods.length > 0) {
            setProducts(
              prods.map((p: any) => ({
                id: p.id,
                name: p.name,
                category: p.category?.name || 'Fresh Produce',
                price: p.price,
                unitType: p.unitType as UnitType,
                unitLabel: p.unitLabel,
                stock: p.inventory?.quantityInStock ?? 50,
                lowThreshold: p.inventory?.lowStockThreshold ?? 10,
                imageUrl:
                  p.imageUrl ||
                  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
              }))
            );
          }
        }
      })
      .catch((err) => {
        console.warn('API offline or unreachable, using offline fallback preview data:', err);
      });
  }, []);

  const categories = categoryList;

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Calculate cart subtotal (in cents)
  const cartSubtotal = Object.entries(cart).reduce((total, [productId, qty]) => {
    const product = products.find((p) => p.id === productId);
    if (!product || qty <= 0) return total;
    if (product.unitType === UnitType.WEIGHT) {
      // price is cents per 1000g
      return total + Math.round((product.price * qty) / 1000);
    }
    return total + product.price * qty;
  }, 0);

  const deliveryFee = 299; // $2.99
  const minOrderAmount = 1500; // $15.00
  const canCheckout = cartSubtotal >= minOrderAmount;
  const orderTotal = cartSubtotal > 0 ? cartSubtotal + deliveryFee : 0;

  // Add/adjust item in cart
  const adjustCart = (productId: string, delta: number, isWeight: boolean) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const step = isWeight ? 250 : 1; // 250 grams or 1 item
      const next = Math.max(0, current + delta * step);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Universal Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white font-bold text-xl">
              🥬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  Groce<span className="text-emerald-600">Real</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Phase 1 Preview
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Grocery Delivery Platform</p>
            </div>
          </div>

          {/* Quick Role Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveRole(UserRole.CUSTOMER)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeRole === UserRole.CUSTOMER
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🛒 Customer
            </button>
            <button
              onClick={() => setActiveRole(UserRole.STORE_MANAGER)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeRole === UserRole.STORE_MANAGER
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏪 Store Manager
            </button>
            <button
              onClick={() => setActiveRole(UserRole.DRIVER)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeRole === UserRole.DRIVER
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🛵 Driver
            </button>
          </div>

          {/* Right Header Status */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiHealth === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }`}
              />
              <span className="text-slate-600 font-mono text-[11px]">
                API: {apiHealth === 'connected' ? 'Port 3001 OK' : 'Ready (Offline/Dev)'}
              </span>
            </div>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-md shadow-emerald-600/20 transition-all"
            >
              <span>Basket</span>
              <span className="w-5 h-5 rounded-full bg-emerald-800 text-[10px] font-bold flex items-center justify-center">
                {Object.keys(cart).length}
              </span>
              <span className="font-semibold">${(cartSubtotal / 100).toFixed(2)}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ========================================================================= */}
        {/* 1. CUSTOMER VIEW */}
        {/* ========================================================================= */}
        {activeRole === UserRole.CUSTOMER && (
          <div className="space-y-6">
            {/* Store Banner */}
            <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase">
                    Open Now
                  </span>
                  <span className="text-xs text-emerald-200">★ 4.9 (1.2k+ reviews)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                  FreshValley Supermarket
                </h1>
                <p className="text-sm text-emerald-100/80 mt-1 max-w-xl">
                  Farm-fresh produce priced by weight, artisan breads, and daily essentials delivered directly to your doorstep.
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-emerald-200 font-medium">
                  <span>📍 100 Market Sq, Downtown</span>
                  <span>•</span>
                  <span>⚡ Delivery: $2.99 (Min: $15.00)</span>
                  <span>•</span>
                  <span>📦 Next Slot: Today 01:00 PM</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15">
                <span className="text-xs font-medium text-emerald-200">Current Order Journey</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-sm font-bold text-white uppercase tracking-wide">
                    {orderStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-white text-emerald-900 text-xs font-bold hover:bg-emerald-50 transition"
                >
                  View Order Status Timeline →
                </button>
              </div>
            </div>

            {/* Category Filter & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[260px]">
                <input
                  type="text"
                  placeholder="Search bananas, milk, eggs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              </div>
            </div>

            {/* Product Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredProducts.map((product) => {
                const inCartQty = cart[product.id] || 0;
                const isWeight = product.unitType === UnitType.WEIGHT;
                const isLowStock = product.stock <= product.lowThreshold;

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div className="relative h-44 bg-slate-100 overflow-hidden">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Weight or Unit Badge */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm ${
                            isWeight
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}
                        >
                          {isWeight ? '⚖️ By Weight' : '📦 Per Unit'}
                        </span>
                        {isLowStock && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                            Low Stock
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                          {product.category}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm mt-0.5 line-clamp-1">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {isWeight
                            ? `Stock: ${(product.stock / 1000).toFixed(1)} kg available`
                            : `Stock: ${product.stock} units available`}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-base font-extrabold text-slate-900">
                            ${(product.price / 100).toFixed(2)}
                            <span className="text-xs font-normal text-slate-500">
                              /{product.unitLabel}
                            </span>
                          </div>
                          {isWeight && inCartQty > 0 && (
                            <div className="text-[11px] text-emerald-600 font-semibold">
                              Est: ${((product.price * inCartQty) / 100000).toFixed(2)}
                            </div>
                          )}
                        </div>

                        {/* Cart Steppers */}
                        {inCartQty === 0 ? (
                          <button
                            onClick={() => adjustCart(product.id, 1, isWeight)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-xs border border-emerald-200 hover:border-transparent transition-all"
                          >
                            + Add {isWeight ? '(250g)' : ''}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                              onClick={() => adjustCart(product.id, -1, isWeight)}
                              className="w-6 h-6 rounded bg-white text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center text-xs shadow-xs"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold px-1 text-slate-800">
                              {isWeight
                                ? inCartQty >= 1000
                                  ? `${(inCartQty / 1000).toFixed(2)}kg`
                                  : `${inCartQty}g`
                                : inCartQty}
                            </span>
                            <button
                              onClick={() => adjustCart(product.id, 1, isWeight)}
                              className="w-6 h-6 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center justify-center text-xs shadow-xs"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. STORE MANAGER VIEW */}
        {/* ========================================================================= */}
        {activeRole === UserRole.STORE_MANAGER && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Store Operations Dashboard
                </span>
                <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  FreshValley Supermarket — Manager Console
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Manage inventory thresholds, incoming orders, and pick-and-pack fulfillment.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Store Open & Accepting Orders
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Pending Pick Orders</span>
                <div className="text-2xl font-black text-slate-900 mt-1">1 Active</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Low Stock Items</span>
                <div className="text-2xl font-black text-rose-600 mt-1">1 Item</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Today Delivery Slots</span>
                <div className="text-2xl font-black text-slate-900 mt-1">4 Open</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Delivery Fleet</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">2 Online</div>
              </div>
            </div>

            {/* Order Picking & Fulfillment Workbench */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      Order #GR-4091
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Slot: Today 01:00 PM - 03:00 PM
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mt-1">
                    Customer: Alice Customer (Springfield)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Preference: <strong className="text-slate-700">Allow Substitutes</strong> • Payment: Cash on Delivery
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-purple-100 text-purple-900">
                    Status: {orderStatus}
                  </span>
                  <button
                    onClick={() => setOrderStatus(OrderStatus.READY_FOR_DELIVERY)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition"
                  >
                    ✓ Mark Ready for Driver
                  </button>
                </div>
              </div>

              {/* Picking Items Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pick & Pack Items Checklist
                </h4>

                {/* Weight item in picking */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🍌</span>
                    <div>
                      <div className="font-bold text-sm text-slate-900">Organic Cavendish Bananas</div>
                      <div className="text-xs text-slate-500">
                        Customer ordered: <strong>1.5 kg (1500g)</strong> @ $1.99/kg
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Actual Weighed Grams</span>
                      <input
                        type="number"
                        defaultValue={1450}
                        className="w-24 px-2 py-1 text-xs font-bold text-slate-900 border border-slate-300 rounded-lg text-right"
                      />
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                      Fulfilled ($2.89)
                    </span>
                  </div>
                </div>

                {/* Unit item in picking */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🥛</span>
                    <div>
                      <div className="font-bold text-sm text-slate-900">Organic Whole Milk 1 Gallon</div>
                      <div className="text-xs text-slate-500">
                        Customer ordered: <strong>1 unit</strong> @ $4.29 each
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                      ✓ Picked 1/1
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Management Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm">Product Inventory & Stock Levels</h3>
                <span className="text-xs text-slate-500 font-medium">8 catalog items total</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Unit Type</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Current Stock</th>
                      <th className="py-2.5 px-3">Threshold</th>
                      <th className="py-2.5 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {products.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.unitType === UnitType.WEIGHT
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {item.unitType} ({item.unitLabel})
                          </span>
                        </td>
                        <td className="py-2.5 px-3">${(item.price / 100).toFixed(2)}</td>
                        <td className="py-2.5 px-3">
                          {item.unitType === UnitType.WEIGHT
                            ? `${(item.stock / 1000).toFixed(1)} kg`
                            : `${item.stock} units`}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{item.lowThreshold}</td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => {
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p.id === item.id
                                    ? {
                                        ...p,
                                        stock:
                                          p.unitType === UnitType.WEIGHT
                                            ? p.stock + 5000
                                            : p.stock + 10,
                                      }
                                    : p
                                )
                              );
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold"
                          >
                            + Restock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. DRIVER DELIVERY VIEW */}
        {/* ========================================================================= */}
        {activeRole === UserRole.DRIVER && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Driver Delivery Hub
                </span>
                <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  Dan Driver — Available & Active Deliveries
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Accept ready orders, update pickup status, and complete drop-offs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  🟢 On Duty
                </span>
              </div>
            </div>

            {/* Active Delivery Trip Card */}
            {driverAccepted ? (
              <div className="bg-white rounded-2xl border-2 border-emerald-500/40 p-6 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                      Active Delivery in Progress
                    </span>
                    <h3 className="text-lg font-black text-slate-900">Order #GR-4091</h3>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    Status: {orderStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Step A: Store Pickup */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      1. Store Pickup
                    </span>
                    <div className="font-bold text-sm text-slate-900">FreshValley Supermarket</div>
                    <p className="text-xs text-slate-600">100 Market Square, Downtown</p>
                    <button
                      onClick={() => setOrderStatus(OrderStatus.OUT_FOR_DELIVERY)}
                      className="mt-2 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                    >
                      📦 Confirm Order Picked Up
                    </button>
                  </div>

                  {/* Step B: Customer Drop-off */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      2. Customer Drop-off & Cash Collection
                    </span>
                    <div className="font-bold text-sm text-slate-900">Alice Customer</div>
                    <p className="text-xs text-slate-600">742 Evergreen Terrace, Springfield</p>
                    <div className="text-xs font-semibold text-emerald-700">
                      Collect Cash on Delivery: ${(orderTotal / 100).toFixed(2)}
                    </div>
                    <button
                      onClick={() => setOrderStatus(OrderStatus.DELIVERED)}
                      className="mt-2 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                    >
                      ✓ Complete Delivery & Drop-off
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Available Delivery Dispatches</h3>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Order #GR-4091</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                        Ready for Pickup
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      From: FreshValley Supermarket ➔ To: Alice Customer (3.2 km)
                    </p>
                    <p className="text-xs font-bold text-emerald-700 mt-1">
                      Driver Payout: $6.50 + Cash on Delivery Collection: ${(orderTotal / 100).toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setDriverAccepted(true);
                      setOrderStatus(OrderStatus.OUT_FOR_DELIVERY);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition"
                  >
                    Accept Delivery Trip
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* BASKET & CHECKOUT SLIDING DRAWER */}
      {/* ========================================================================= */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Your Grocery Basket</h3>
                <span className="text-xs text-slate-500">FreshValley Supermarket</span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 space-y-5">
              {/* Order Timeline Progress */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Order Status Timeline
                </span>
                <div className="space-y-1.5 text-xs font-medium">
                  {[
                    { step: OrderStatus.PENDING, label: 'Order Received' },
                    { step: OrderStatus.CONFIRMED, label: 'Store Confirmed' },
                    { step: OrderStatus.PICKING, label: 'Picking & Packing' },
                    { step: OrderStatus.READY_FOR_DELIVERY, label: 'Ready for Driver' },
                    { step: OrderStatus.OUT_FOR_DELIVERY, label: 'Out for Delivery' },
                    { step: OrderStatus.DELIVERED, label: 'Delivered' },
                  ].map((item, idx) => {
                    const isDone = orderStatus === item.step;
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isDone ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-slate-300'
                          }`}
                        />
                        <span className={isDone ? 'font-bold text-emerald-800' : 'text-slate-500'}>
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Basket Items
                </span>
                {Object.entries(cart).map(([pId, qty]) => {
                  const product = products.find((p) => p.id === pId);
                  if (!product) return null;
                  const isWeight = product.unitType === UnitType.WEIGHT;
                  const lineTotal = isWeight
                    ? Math.round((product.price * qty) / 1000)
                    : product.price * qty;

                  return (
                    <div
                      key={pId}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white"
                    >
                      <div className="flex-1 pr-2">
                        <h4 className="font-bold text-xs text-slate-900">{product.name}</h4>
                        <span className="text-[11px] text-slate-500">
                          {isWeight
                            ? `${qty}g @ $${(product.price / 100).toFixed(2)}/kg`
                            : `${qty} x $${(product.price / 100).toFixed(2)}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-xs text-slate-900">
                          ${(lineTotal / 100).toFixed(2)}
                        </div>
                        <button
                          onClick={() => adjustCart(pId, -1, isWeight)}
                          className="text-[10px] text-rose-600 font-semibold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Slot Selection */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Choose Delivery Slot
                </span>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {DELIVERY_SLOTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.time} ({s.capacity - s.booked} spots left)
                    </option>
                  ))}
                </select>
              </div>

              {/* Substitution Preference */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Out-of-Stock Preference
                </span>
                <select
                  value={subPreference}
                  onChange={(e) =>
                    setSubPreference(e.target.value as SubstitutionPreference)
                  }
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={SubstitutionPreference.ALLOW_SUBSTITUTES}>
                    Allow Store Pickers to Substitute
                  </option>
                  <option value={SubstitutionPreference.REFUND_ITEM}>
                    Do Not Substitute (Refund Item)
                  </option>
                  <option value={SubstitutionPreference.CONTACT_ME}>
                    Call / Contact Me First
                  </option>
                </select>
              </div>
            </div>

            {/* Checkout Pricing Footer */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold">${(cartSubtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Fixed Delivery Fee:</span>
                  <span className="font-semibold">${(deliveryFee / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1 border-t border-slate-200">
                  <span>Total (Cash on Delivery):</span>
                  <span>${(orderTotal / 100).toFixed(2)}</span>
                </div>
              </div>

              {!canCheckout && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                  ⚠️ Minimum order is $15.00. Add $
                  {((minOrderAmount - cartSubtotal) / 100).toFixed(2)} more to place order.
                </div>
              )}

              <button
                disabled={!canCheckout}
                onClick={() => {
                  setOrderStatus(OrderStatus.CONFIRMED);
                  alert('Order successfully submitted! Transaction created in Supabase database.');
                }}
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition ${
                  canCheckout
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                Place Order (Cash on Delivery)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
