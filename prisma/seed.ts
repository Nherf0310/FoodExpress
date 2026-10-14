import { PrismaClient, UserRole, UnitType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting GroceReal seed...');

  // 1. Create Demo Users
  // In production/Phase 3, we'll hash passwords using bcrypt
  const plainPasswordHash = 'mock_hashed_password_123';

  const customer = await prisma.user.upsert({
    where: { email: 'customer@grocereal.com' },
    update: {},
    create: {
      name: 'Alice Customer',
      email: 'customer@grocereal.com',
      passwordHash: plainPasswordHash,
      phone: '+1-555-0101',
      role: UserRole.CUSTOMER,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@grocereal.com' },
    update: {},
    create: {
      name: 'Bob Manager',
      email: 'manager@grocereal.com',
      passwordHash: plainPasswordHash,
      phone: '+1-555-0102',
      role: UserRole.STORE_MANAGER,
    },
  });

  const driver = await prisma.user.upsert({
    where: { email: 'driver@grocereal.com' },
    update: {},
    create: {
      name: 'Dan Driver',
      email: 'driver@grocereal.com',
      passwordHash: plainPasswordHash,
      phone: '+1-555-0103',
      role: UserRole.DRIVER,
    },
  });

  // 2. Customer Default Address
  await prisma.address.create({
    data: {
      userId: customer.id,
      label: 'Home',
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      postalCode: '97477',
      isDefault: true,
    },
  });

  // 3. Sample Store
  let store = await prisma.store.findFirst({
    where: { managerId: manager.id },
  });

  if (!store) {
    store = await prisma.store.create({
      data: {
        managerId: manager.id,
        name: 'FreshValley Supermarket',
        description: 'Locally sourced fresh produce, artisan bakery, premium dairy and meats.',
        address: '100 Market Square, Downtown',
        phone: '+1-555-0900',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
        isOpen: true,
        isApproved: true,
        minOrderAmount: 1500, // $15.00
        deliveryFee: 299,     // $2.99
      },
    });
  }

  // 4. Categories
  const categoriesData = [
    { name: 'Fresh Produce', sortOrder: 1 },
    { name: 'Dairy & Eggs', sortOrder: 2 },
    { name: 'Bakery', sortOrder: 3 },
    { name: 'Meat & Seafood', sortOrder: 4 },
    { name: 'Pantry & Staples', sortOrder: 5 },
    { name: 'Beverages', sortOrder: 6 },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    let category = await prisma.category.findFirst({
      where: { storeId: store.id, name: cat.name },
    });
    if (!category) {
      category = await prisma.category.create({
        data: {
          storeId: store.id,
          name: cat.name,
          sortOrder: cat.sortOrder,
        },
      });
    }
    categoryMap.set(cat.name, category.id);
  }

  // 5. Products & Inventory
  const productsData = [
    {
      category: 'Fresh Produce',
      name: 'Organic Cavendish Bananas',
      description: 'Sweet, organic ripe bananas, rich in potassium.',
      brand: 'Dole Organic',
      price: 199, // $1.99 per kg
      unitType: UnitType.WEIGHT,
      unitLabel: 'kg',
      imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=500&q=80',
      stock: 45000, // 45 kg
      threshold: 5000,
    },
    {
      category: 'Fresh Produce',
      name: 'Honeycrisp Apples',
      description: 'Crisp, sweet, and juicy locally harvested apples.',
      brand: 'Orchard Select',
      price: 349, // $3.49 per kg
      unitType: UnitType.WEIGHT,
      unitLabel: 'kg',
      imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=500&q=80',
      stock: 30000, // 30 kg
      threshold: 4000,
    },
    {
      category: 'Fresh Produce',
      name: 'Fresh Hass Avocados',
      description: 'Creamy and ready to eat avocados.',
      brand: 'GreenGold',
      price: 149, // $1.49 each
      unitType: UnitType.EACH,
      unitLabel: 'each',
      imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=500&q=80',
      stock: 80,
      threshold: 15,
    },
    {
      category: 'Dairy & Eggs',
      name: 'Organic Whole Milk 1 Gallon',
      description: 'Grade A pasteurized whole milk with vitamin D.',
      brand: 'Valley Farms',
      price: 429, // $4.29 each
      unitType: UnitType.EACH,
      unitLabel: '1 gal',
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=80',
      stock: 35,
      threshold: 8,
    },
    {
      category: 'Dairy & Eggs',
      name: 'Pasture-Raised Large Brown Eggs',
      description: 'Carton of 12 pasture-raised brown eggs.',
      brand: 'Vital Farms',
      price: 499, // $4.99 each
      unitType: UnitType.EACH,
      unitLabel: '12 pack',
      imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=500&q=80',
      stock: 40,
      threshold: 10,
    },
    {
      category: 'Bakery',
      name: 'Artisan Sourdough Boule',
      description: 'Slow-fermented crusty artisan sourdough bread baked fresh daily.',
      brand: 'Village Bakery',
      price: 449, // $4.49 each
      unitType: UnitType.EACH,
      unitLabel: 'loaf',
      imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=500&q=80',
      stock: 18,
      threshold: 5,
    },
    {
      category: 'Meat & Seafood',
      name: 'Grass-Fed Ground Beef (85/15)',
      description: 'Fresh 100% grass-fed ground beef, perfect for burgers and bolognese.',
      brand: 'Pasture Prime',
      price: 999, // $9.99 per kg
      unitType: UnitType.WEIGHT,
      unitLabel: 'kg',
      imageUrl: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=500&q=80',
      stock: 25000, // 25 kg
      threshold: 3000,
    },
    {
      category: 'Pantry & Staples',
      name: 'Extra Virgin Olive Oil 500ml',
      description: 'Cold-pressed extra virgin olive oil from Mediterranean olives.',
      brand: 'Terra Nostra',
      price: 899, // $8.99 each
      unitType: UnitType.EACH,
      unitLabel: 'bottle',
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
      stock: 22,
      threshold: 5,
    },
  ];

  for (const item of productsData) {
    const categoryId = categoryMap.get(item.category);
    if (!categoryId) continue;

    const existingProduct = await prisma.product.findFirst({
      where: { storeId: store.id, name: item.name },
    });

    if (!existingProduct) {
      await prisma.product.create({
        data: {
          storeId: store.id,
          categoryId,
          name: item.name,
          description: item.description,
          brand: item.brand,
          price: item.price,
          unitType: item.unitType,
          unitLabel: item.unitLabel,
          imageUrl: item.imageUrl,
          inventory: {
            create: {
              quantityInStock: item.stock,
              lowStockThreshold: item.threshold,
            },
          },
        },
      });
    }
  }

  // 6. Delivery Slots for Today and Tomorrow
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const slotTimes = [
    { startTime: '09:00', endTime: '11:00' },
    { startTime: '11:00', endTime: '13:00' },
    { startTime: '14:00', endTime: '16:00' },
    { startTime: '17:00', endTime: '19:00' },
  ];

  for (const date of [today, tomorrow]) {
    for (const slot of slotTimes) {
      const existing = await prisma.deliverySlot.findFirst({
        where: {
          storeId: store.id,
          date,
          startTime: slot.startTime,
        },
      });

      if (!existing) {
        await prisma.deliverySlot.create({
          data: {
            storeId: store.id,
            date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            capacity: 10,
            bookedCount: 0,
          },
        });
      }
    }
  }

  console.log('✅ GroceReal seed finished successfully!');
  console.log('   Customer:', customer.email);
  console.log('   Store Manager:', manager.email);
  console.log('   Driver:', driver.email);
  console.log('   Store:', store.name);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
