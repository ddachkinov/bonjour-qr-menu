-- Add translations support for menu items and categories

-- Item Translations
CREATE TABLE item_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(item_id, locale)
);

CREATE INDEX idx_item_translations_item ON item_translations(item_id);
CREATE INDEX idx_item_translations_locale ON item_translations(locale);

-- Category Translations
CREATE TABLE category_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category_id, locale)
);

CREATE INDEX idx_category_translations_category ON category_translations(category_id);
CREATE INDEX idx_category_translations_locale ON category_translations(locale);

-- Menu Translations
CREATE TABLE menu_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(menu_id, locale)
);

CREATE INDEX idx_menu_translations_menu ON menu_translations(menu_id);
CREATE INDEX idx_menu_translations_locale ON menu_translations(locale);

-- Apply updated_at triggers to translation tables
CREATE TRIGGER update_item_translations_updated_at BEFORE UPDATE ON item_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_translations_updated_at BEFORE UPDATE ON category_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_translations_updated_at BEFORE UPDATE ON menu_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
