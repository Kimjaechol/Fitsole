export interface CartItem {
  id: string;                    // unique cart item ID (crypto.randomUUID)
  productId: string;             // Payload product ID
  productName: string;           // display name
  productSlug: string;           // for linking back to product page
  productImageUrl: string | null; // first product image URL
  size: number;                  // selected shoe size (mm)
  price: number;                 // shoe base price (KRW)
  bundleInsolePrice: number;     // insole add-on price (KRW)
  includesInsole: boolean;       // whether bundle includes custom insole
  designId: string | null;       // InsoleDesign.id from Phase 3
  designSource: 'general' | 'professional' | null; // per D-04: Line 1 vs Line 2
  quantity: number;              // per D-02
}

export interface Cart {
  items: CartItem[];
}
