export interface Tenant {
  id: string;
  owner_user_id: string;
  name: string;
  subdomain: string;
  timezone: string;
  locale: string;
  branding?: {
    logo_url?: string;
    primary_color?: string;
  };
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  role: 'owner' | 'manager' | 'staff';
  display_name: string;
  created_at: Date;
}

export interface Menu {
  id: string;
  tenant_id: string;
  title: string;
  published: boolean;
  slug: string;
  public_url: string;
  created_at: Date;
  updated_at: Date;
  translations?: MenuTranslation[];
}

export interface MenuTranslation {
  id: string;
  menu_id: string;
  locale: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  menu_id: string;
  tenant_id: string;
  name: string;
  position: number;
  created_at: Date;
  updated_at: Date;
  translations?: CategoryTranslation[];
}

export interface CategoryTranslation {
  id: string;
  category_id: string;
  locale: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Item {
  id: string;
  menu_id: string;
  category_id: string;
  tenant_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  photos: string[];
  tags: string[];
  sku?: string;
  dietary_flags: string[];
  created_at: Date;
  updated_at: Date;
  translations?: ItemTranslation[];
}

export interface ItemTranslation {
  id: string;
  item_id: string;
  locale: string;
  title: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TableSession {
  session_id: string;
  menu_id: string;
  tenant_id: string;
  table_id?: string;
  created_at: Date;
  last_activity: Date;
  expires_at: Date;
}

export interface CartItem {
  item_id: string;
  quantity: number;
  selected_modifiers?: string[];
  unit_price: number;
  computed_price: number;
}

export interface Cart {
  session_id: string;
  items: CartItem[];
  total: number;
}

export type OrderStatus = 'new' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  tenant_id: string;
  menu_id: string;
  session_id: string;
  order_token: string;
  items: CartItem[];
  total_amount: number;
  currency: string;
  status: OrderStatus;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  waiter_ack_user_id?: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  actor_id: string;
  action: string;
  details: Record<string, any>;
  created_at: Date;
}

export interface Upload {
  id: string;
  tenant_id: string;
  original_filename: string;
  storage_url: string;
  width?: number;
  height?: number;
  mime_type: string;
  created_at: Date;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    display_name: string;
    role: string;
    tenant_id: string;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface CreateMenuRequest {
  title: string;
  slug?: string;
}

export interface CreateCategoryRequest {
  name: string;
  position?: number;
}

export interface CreateItemRequest {
  category_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  photos?: string[];
  tags?: string[];
  sku?: string;
  dietary_flags?: string[];
}

export interface CreateOrderRequest {
  session_id: string;
  items: CartItem[];
  notes?: string;
}

export interface PresignedUploadRequest {
  filename: string;
  mime_type: string;
  intended_use: string;
}

export interface PresignedUploadResponse {
  upload_url: string;
  object_key: string;
  public_url: string;
}
