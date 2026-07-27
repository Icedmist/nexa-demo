import type { Category, Supplier, Location } from "@/types/inventory";

const ts = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

export const getBaseForSector = (sector: string) => {
  switch (sector) {
    case "retail":
      return {
        categories: [
          { id: "electronics", name: "Electronics", description: "Mobile, Laptops, Gadgets", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box"] },
          { id: "fashion", name: "Fashion & Clothing", description: "Apparel and accessories", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box"] },
          { id: "groceries", name: "Groceries", description: "Daily essentials and food", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "g", "ltr", "ml", "pack", "box", "bag", "bottle", "cup", "mudu", "paint"] },
          { id: "beauty", name: "Beauty & Health", description: "Skincare and wellness", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "ltr", "ml", "pack", "box", "bottle", "vial"] },
          { id: "home", name: "Home & Living", description: "Furniture and decor", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "box", "m", "cm", "in", "ft", "yard"] },
          { id: "sports", name: "Sports & Fitness", description: "Gym and outdoor gear", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "bag"] },
        ],
        suppliers: [
          { id: "sup-rt-01", name: "Mega Retail Hub", contactName: "John Doe", email: "sales@megaretail.com", phone: "08011223344", address: "Trade Fair Complex", leadTimeDays: 4, rating: 4.2, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
        ],
        locations: [
          { id: "loc-rt-01", name: "Retail Storefront", type: "warehouse", parentId: null, description: "Main display area", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
        ]
      };
    case "textile":
      return {
        categories: [
          { id: "cotton", name: "Cotton & Linens", description: "Breathable fabrics", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["m", "cm", "in", "ft", "yard", "pcs", "bundle"] },
          { id: "laces", name: "Laces & Embroidery", description: "Decorative textiles", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["m", "cm", "in", "ft", "yard", "pcs", "bundle"] },
          { id: "silk", name: "Silk & Luxury", description: "Premium materials", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["m", "cm", "in", "ft", "yard", "pcs", "bundle"] },
          { id: "sewing", name: "Sewing Essentials", description: "Threads and needles", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "bag", "bundle"] },
          { id: "traditional", name: "Traditional Attire", description: "Cultural clothing", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "bag", "bundle"] },
          { id: "prints", name: "African Prints (Ankara)", description: "Vibrant patterns", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["m", "cm", "in", "ft", "yard", "pcs", "bundle"] },
        ],
        suppliers: [
          { id: "sup-tx-01", name: "Yaba Textile Markets", contactName: "Ibrahim", email: "yaba@textiles.ng", phone: "08055443322", address: "Yaba, Lagos", leadTimeDays: 2, rating: 4.8, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
        ],
        locations: [
          { id: "loc-tx-01", name: "Fabric Warehouse", type: "warehouse", parentId: null, description: "Storage for rolls", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
        ]
      };
    case "boutique":
      return {
        categories: [
          { id: "shoes", name: "Shoes", description: "Footwear & Boots", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pair", "pcs", "pack"] },
          { id: "tops", name: "Tops", description: "Shirts, T-shirts, Blouses", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack"] },
          { id: "bottoms", name: "Bottoms", description: "Trousers, Jeans, Skirts", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack"] },
          { id: "dresses", name: "Dresses", description: "Gowns and One-pieces", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack"] },
          { id: "accessories", name: "Accessories", description: "Bags, Belts, Jewelry", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "pair"] },
        ],
        suppliers: [
          { id: "sup-bt-01", name: "Balogun Apparel Wholesalers", contactName: "Alhaji Kola", email: "balogun@apparel.com", phone: "08033221100", address: "Balogun Market, Lagos", leadTimeDays: 2, rating: 4.6, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
        ],
        locations: [
          { id: "loc-bt-01", name: "Main Boutique Showroom", type: "warehouse", parentId: null, description: "Display racks & hanger area", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
        ]
      };
    case "wholesale":
      return {
        categories: [
          { id: "fmcg", name: "FMCG", description: "Fast moving consumer goods", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "bag", "bottle", "vial"] },
          { id: "building", name: "Building Materials", description: "Construction supplies", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "g", "m", "cm", "in", "ft", "yard", "bag", "bundle"] },
          { id: "agro", name: "Agro & Farm", description: "Wholesale agricultural products", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "g", "ltr", "ml", "bag", "bundle", "bottle", "mudu", "paint"] },
          { id: "industrial", name: "Industrial Supplies", description: "Machinery and parts", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "bag"] },
          { id: "textiles", name: "Textiles", description: "Bulk fabric sales", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "m", "yard", "bundle"] },
          { id: "chemicals", name: "Chemicals", description: "Laboratory and industrial chems", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["kg", "g", "ltr", "ml", "bottle", "vial"] },
        ],
        suppliers: [
          { id: "sup-ws-01", name: "Global Logistics Ltd", contactName: "Mr. Wong", email: "global@logistics.com", phone: "09000112233", address: "Apapa Wharf", leadTimeDays: 14, rating: 4.5, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
        ],
        locations: [
          { id: "loc-ws-01", name: "Central Depot", type: "warehouse", parentId: null, description: "Bulk storage", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
        ]
      };
    case "social_commerce":
      return {
        categories: [
          { id: "fashion", name: "Fashion & Outfits", description: "Trending apparel & streetwear", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box"] },
          { id: "beauty", name: "Beauty & Skincare", description: "Cosmetics & lip kits", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "bottle", "vial"] },
          { id: "accessories", name: "Bags & Accessories", description: "Bags, watches, sunglasses", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pair", "box"] },
          { id: "electronics", name: "Gadgets & Tech", description: "Wireless earbuds, chargers", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box"] },
          { id: "home", name: "Home & Lifestyle", description: "Decor & aesthetic items", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack"] },
          { id: "misc", name: "Trending Deals", description: "Flash sales & promo items", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs"] },
        ],
        suppliers: [
          { id: "sup-sc-01", name: "Global Trendy Imports", contactName: "Grace Chen", email: "grace@trendyimports.com", phone: "08099112233", address: "Trade Fair Complex, Lagos", leadTimeDays: 3, rating: 4.8, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
        ],
        locations: [
          { id: "loc-sc-01", name: "Social Vendor Studio", type: "warehouse", parentId: null, description: "Main fulfillment center", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
        ]
      };
    case "pharmacy":
      return {
        categories: [
          { id: "pharmaceuticals", name: "Pharmaceuticals & Prescription", description: "Prescription and clinical drugs", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "bottle", "vial"] },
          { id: "otc_medicines", name: "OTC Pain & Cold Relief", description: "Over the counter everyday meds", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "bottle"] },
          { id: "supplements", name: "Vitamins & Supplements", description: "Wellness and health boosters", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "bottle"] },
          { id: "first_aid", name: "First Aid & Clinical", description: "Bandages, antiseptics, gloves", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "bottle"] },
          { id: "baby_maternal", name: "Baby & Maternal Care", description: "Infant nutrition and mother care", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "can"] },
        ],
        suppliers: [
          { id: "sup-ph-01", name: "Fidson Healthcare Distributors", contactName: "Dr. Kemi", email: "orders@fidson.com", phone: "08022334455", address: "Ikeja Industrial Estate", leadTimeDays: 2, rating: 4.8, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
          { id: "sup-ph-02", name: "GSK Pharma Wholesalers", contactName: "Emmanuel", email: "supply@gskwholesalers.ng", phone: "08033445566", address: "Apapa Lagos", leadTimeDays: 3, rating: 4.7, isActive: true, createdAt: ts(100), updatedAt: ts(5) },
        ],
        locations: [
          { id: "loc-ph-01", name: "Main Counter Dispensary", type: "warehouse", parentId: null, description: "Active shelf dispensary", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
          { id: "loc-ph-02", name: "Clinical Cold Storage", type: "warehouse", parentId: null, description: "Refrigerated vaccines & syrups", address: "", isActive: true, createdAt: ts(100), updatedAt: ts(10) },
        ]
      };
    case "electronics":
      return {
        categories: [
          { id: "smartphones", name: "Smartphones & Mobile Devices", description: "iPhones, Samsung, Androids", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "box"] },
          { id: "phone_accessories", name: "Chargers, Cables & Accessories", description: "Fast chargers, MagSafe, USB-C cables", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box"] },
          { id: "audio_tech", name: "Headphones & Audio", description: "AirPods, Bluetooth speakers, TWS", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "box"] },
          { id: "powerbanks", name: "Power Banks & Protection", description: "High-capacity powerbanks, screen protectors", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack"] },
          { id: "computers", name: "Laptops & Computing", description: "MacBooks, Windows laptops, SSDs", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "box"] },
        ],
        suppliers: [
          { id: "sup-el-01", name: "Computer Village Direct", contactName: "Chidi Electronics", email: "chidi@computervillage.ng", phone: "08066778899", address: "Ikeja Computer Village", leadTimeDays: 1, rating: 4.9, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
        ],
        locations: [
          { id: "loc-el-01", name: "Gadget Storefront Display", type: "warehouse", parentId: null, description: "Main counter & display cases", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
        ]
      };
    case "manufacturing":
      return {
        categories: [
          { id: "raw_mats", name: "Raw Materials", description: "Chemicals, polymers, steel, alloys", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["kg", "ton", "ltr", "pcs"] },
          { id: "packaging_mfg", name: "Packaging Supplies", description: "Cartons, wraps, bottles, labels", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "roll"] },
          { id: "finished_goods", name: "Finished Product Line", description: "Manufactured goods ready for dispatch", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "carton", "box", "pallet"] },
          { id: "spares_mfg", name: "Plant Spare Parts & Tools", description: "Industrial machine parts & lubricants", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "set", "keg"] },
        ],
        suppliers: [
          { id: "sup-mf-01", name: "Industrial Polymers & Metals Ltd", contactName: "Engr. Nnamdi", email: "sales@industrialpolymers.ng", phone: "08033224411", address: "Ilupeju Industrial Estate", leadTimeDays: 5, rating: 4.6, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
        ],
        locations: [
          { id: "loc-mf-01", name: "Factory Floor Stockroom", type: "warehouse", parentId: null, description: "Assembly line supply bay", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
        ]
      };
    case "general":
    default:
      return {
        categories: [
          { id: "office", name: "Office Supplies", description: "Daily office needs", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box"] },
          { id: "tools", name: "Tools & Hardware", description: "Maintenance equipment", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box"] },
          { id: "it", name: "IT & Equipment", description: "Computers and networking", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box"] },
          { id: "packaging", name: "Packaging & Shipping", description: "Boxes, tape, and mailers", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "box", "roll"] },
          { id: "cleaning", name: "Cleaning Products", description: "Janitorial supplies", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack", "bottle", "ltr", "ml"] },
          { id: "misc", name: "Miscellaneous", description: "Uncategorized items", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs"] },
        ],
        suppliers: [
          { id: "sup-01", name: "Acme Supply Co", contactName: "John Carter", email: "john@acmesupply.com", phone: "555-0101", address: "123 Industrial Ave", leadTimeDays: 5, rating: 4.5, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
        ],
        locations: [
          { id: "loc-01", name: "Main Warehouse", type: "warehouse", parentId: null, description: "Primary storage", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
        ]
      };
    case "agriculture":
      return {
        categories: [
          { id: "grains_bulk", name: "Grains (Bags)", description: "Primary field produce", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["bag", "kg", "mudu", "paint"] },
          { id: "tubers", name: "Tubers & Starch", description: "Root crops and tubers", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "bundle"] },
          { id: "livestock", name: "Livestock & Poultry", description: "Animal products", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg"] },
          { id: "seeds", name: "Seeds & Saplings", description: "Planting materials", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "g", "pack", "bag", "bundle"] },
          { id: "fertilizers", name: "Fertilizers & Chemicals", description: "Growth enhancers", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "g", "ltr", "ml", "bag", "bottle"] },
          { id: "tools_agri", name: "Agricultural Tools", description: "Farm machinery", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "pack"] },
        ],
        suppliers: [
          { id: "sup-ag-01", name: "Green Agro Solutions", contactName: "Musa Aliyu", email: "sales@greenagro.com", phone: "08012345678", address: "Kaduna Farm Road", leadTimeDays: 7, rating: 4.5, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
          { id: "sup-ag-02", name: "Local Seed Bank", contactName: "Sarah Bitrus", email: "info@seeds.ng", phone: "08087654321", address: "Jos North", leadTimeDays: 3, rating: 4.8, isActive: true, createdAt: ts(100), updatedAt: ts(5) },
        ],
        locations: [
          { id: "loc-ag-01", name: "Main Field", type: "warehouse", parentId: null, description: "Primary planting zone", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
          { id: "loc-ag-02", name: "Cold Storage", type: "warehouse", parentId: null, description: "Stored produce", address: "", isActive: true, createdAt: ts(100), updatedAt: ts(10) },
        ]
      };
    case "restaurant":
      return {
        categories: [
          { id: "proteins", name: "Proteins & Meat", description: "Beef, Chicken, Fish", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["kg", "g", "portion", "plate", "bowl"] },
          { id: "grains", name: "Grains & Staples", description: "Rice, Beans, Flour", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["kg", "g", "bag", "bowl", "cup", "mudu", "paint"] },
          { id: "vegetables", name: "Vegetables & Fruits", description: "Fresh produce", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "kg", "g", "portion", "plate", "bowl", "bundle"] },
          { id: "drinks", name: "Drinks & Beverages", description: "Juice, Water, Soda", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["ltr", "ml", "bottle", "cup"] },
          { id: "spices", name: "Spices & Seasonings", description: "Flavor enhancers", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["g", "pack", "bottle", "cup"] },
          { id: "bakery", name: "Bakery & Pastry", description: "Breads and cakes", parentId: null, createdAt: ts(90), updatedAt: ts(90), supportedUnits: ["pcs", "portion", "plate", "loaf", "pack"] },
        ],
        suppliers: [
          { id: "sup-rs-01", name: "Fresh Market Direct", contactName: "Baba Jide", email: "orders@freshmarket.ng", phone: "0706543210", address: "Oyingbo Market", leadTimeDays: 1, rating: 4.7, isActive: true, createdAt: ts(120), updatedAt: ts(10) },
          { id: "sup-rs-02", name: "Foodie Wholesalers", contactName: "Ngozi", email: "info@foodie.ng", phone: "08099887766", address: "Victoria Island", leadTimeDays: 2, rating: 4.3, isActive: true, createdAt: ts(100), updatedAt: ts(5) },
        ],
        locations: [
          { id: "loc-rs-01", name: "Kitchen Pantry", type: "warehouse", parentId: null, description: "Raw ingredients", address: "", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
          { id: "loc-rs-02", name: "Ready Server", type: "warehouse", parentId: null, description: "Prepared food station", address: "", isActive: true, createdAt: ts(100), updatedAt: ts(10) },
        ]
      };
  }
};

// Keep existing exports for compatibility during transition
export const categories: Category[] = getBaseForSector("general").categories;
export const suppliers: Supplier[] = getBaseForSector("general").suppliers;
export const locations: Location[] = getBaseForSector("general").locations;
