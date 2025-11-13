import axios from 'axios';
import * as readline from 'readline';

const API_URL = process.env.API_URL || 'http://localhost:3001';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

interface SeedData {
  restaurant: {
    email: string;
    password: string;
    name: string;
    subdomain: string;
  };
  menu: {
    title: string;
    categories: Array<{
      name: string;
      items: Array<{
        title: string;
        description: string;
        price: number;
        dietary_flags?: string[];
      }>;
    }>;
  };
}

const sampleData: SeedData = {
  restaurant: {
    email: 'demo@restaurant.com',
    password: 'Demo123!',
    name: 'Bonjour Bistro',
    subdomain: 'bonjour',
  },
  menu: {
    title: 'Main Menu',
    categories: [
      {
        name: 'Appetizers',
        items: [
          {
            title: 'French Onion Soup',
            description: 'Classic soup with caramelized onions, beef broth, and melted Gruyère cheese',
            price: 8.50,
          },
          {
            title: 'Escargots de Bourgogne',
            description: 'Burgundy snails baked with garlic, parsley butter, and white wine',
            price: 12.00,
          },
          {
            title: 'Charcuterie Board',
            description: 'Selection of French cheeses, cured meats, cornichons, and baguette',
            price: 16.00,
          },
          {
            title: 'Caprese Salad',
            description: 'Fresh mozzarella, tomatoes, basil, and balsamic glaze',
            price: 9.50,
            dietary_flags: ['vegetarian'],
          },
        ],
      },
      {
        name: 'Main Courses',
        items: [
          {
            title: 'Coq au Vin',
            description: 'Braised chicken in red wine with mushrooms, pearl onions, and bacon',
            price: 24.00,
          },
          {
            title: 'Beef Bourguignon',
            description: 'Slow-cooked beef stew in red wine with carrots, onions, and mushrooms',
            price: 28.00,
          },
          {
            title: 'Salmon en Papillote',
            description: 'Atlantic salmon baked in parchment with vegetables and herbs',
            price: 26.00,
          },
          {
            title: 'Ratatouille',
            description: 'Traditional Provençal vegetable stew with eggplant, zucchini, and bell peppers',
            price: 18.00,
            dietary_flags: ['vegan', 'gluten-free'],
          },
          {
            title: 'Duck Confit',
            description: 'Crispy duck leg with garlic potatoes and seasonal vegetables',
            price: 29.00,
          },
          {
            title: 'Steak Frites',
            description: '8oz ribeye with herb butter and hand-cut fries',
            price: 32.00,
          },
        ],
      },
      {
        name: 'Pasta & Risotto',
        items: [
          {
            title: 'Linguine aux Fruits de Mer',
            description: 'Linguine with mixed seafood, white wine, garlic, and fresh herbs',
            price: 25.00,
          },
          {
            title: 'Mushroom Risotto',
            description: 'Creamy Arborio rice with wild mushrooms, parmesan, and truffle oil',
            price: 22.00,
            dietary_flags: ['vegetarian'],
          },
        ],
      },
      {
        name: 'Desserts',
        items: [
          {
            title: 'Crème Brûlée',
            description: 'Classic vanilla custard with caramelized sugar crust',
            price: 8.00,
            dietary_flags: ['vegetarian'],
          },
          {
            title: 'Chocolate Mousse',
            description: 'Rich dark chocolate mousse with whipped cream',
            price: 7.50,
            dietary_flags: ['vegetarian'],
          },
          {
            title: 'Tarte Tatin',
            description: 'Upside-down caramelized apple tart served with vanilla ice cream',
            price: 9.00,
            dietary_flags: ['vegetarian'],
          },
          {
            title: 'Profiteroles',
            description: 'Cream puffs filled with vanilla ice cream and topped with chocolate sauce',
            price: 8.50,
            dietary_flags: ['vegetarian'],
          },
        ],
      },
      {
        name: 'Beverages',
        items: [
          {
            title: 'Espresso',
            description: 'Double shot of rich Italian espresso',
            price: 3.50,
            dietary_flags: ['vegan'],
          },
          {
            title: 'Cappuccino',
            description: 'Espresso with steamed milk and foam',
            price: 4.50,
            dietary_flags: ['vegetarian'],
          },
          {
            title: 'Fresh Orange Juice',
            description: 'Freshly squeezed orange juice',
            price: 5.00,
            dietary_flags: ['vegan', 'gluten-free'],
          },
          {
            title: 'Sparkling Water',
            description: 'Perrier or San Pellegrino',
            price: 4.00,
            dietary_flags: ['vegan', 'gluten-free'],
          },
        ],
      },
    ],
  },
};

async function seedDatabase() {
  console.log('\n🌱 QR Menu SaaS - Database Seeder\n');
  console.log('This script will create a sample restaurant with a full menu.\n');

  const useDefault = await question('Use default sample data (Bonjour Bistro)? (Y/n): ');

  const data = useDefault.toLowerCase() === 'n' ? await promptCustomData() : sampleData;

  try {
    console.log('\n📝 Creating restaurant account...');
    const authResponse = await axios.post(`${API_URL}/api/v1/auth/signup`, {
      email: data.restaurant.email,
      password: data.restaurant.password,
      restaurant_name: data.restaurant.name,
      subdomain: data.restaurant.subdomain,
    });

    const { access_token } = authResponse.data;
    console.log('✅ Restaurant account created!');
    console.log(`   Email: ${data.restaurant.email}`);
    console.log(`   Password: ${data.restaurant.password}`);

    const api = axios.create({
      baseURL: `${API_URL}/api/v1`,
      headers: { Authorization: `Bearer ${access_token}` },
    });

    console.log('\n📋 Creating menu...');
    const menuResponse = await api.post('/menus', { title: data.menu.title });
    const menuId = menuResponse.data.id;
    console.log(`✅ Menu "${data.menu.title}" created!`);

    console.log('\n🗂️  Creating categories and items...');
    for (const category of data.menu.categories) {
      const categoryResponse = await api.post(`/menus/${menuId}/categories`, {
        name: category.name,
      });
      const categoryId = categoryResponse.data.id;
      console.log(`  ✓ Category: ${category.name}`);

      for (const item of category.items) {
        await api.post(`/menus/${menuId}/items`, {
          category_id: categoryId,
          title: item.title,
          description: item.description,
          price: Math.round(item.price * 100),
          currency: 'USD',
          dietary_flags: item.dietary_flags || [],
        });
        console.log(`    • ${item.title} - $${item.price.toFixed(2)}`);
      }
    }

    console.log('\n📢 Publishing menu...');
    const publishResponse = await api.post(`/menus/${menuId}/publish`);
    const publicUrl = publishResponse.data.public_url;
    console.log('✅ Menu published!');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS! Your sample restaurant is ready!\n');
    console.log('📱 Dashboard Login:');
    console.log(`   URL: http://localhost:3000`);
    console.log(`   Email: ${data.restaurant.email}`);
    console.log(`   Password: ${data.restaurant.password}\n`);
    console.log('🍽️  Public Menu:');
    console.log(`   URL: ${publicUrl}\n`);
    console.log('💡 Tip: Open the public menu URL on your phone to see the diner experience!');
    console.log('='.repeat(60) + '\n');
  } catch (error: any) {
    console.error('\n❌ Error seeding database:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data.message || error.response.data.error);
      if (error.response.data.errors) {
        console.error('   Details:', error.response.data.errors);
      }
    } else {
      console.error('   ', error.message);
    }
    console.error('\n💡 Make sure the API server is running: npm run dev:api\n');
  } finally {
    rl.close();
  }
}

async function promptCustomData(): Promise<SeedData> {
  console.log('\n📝 Enter custom restaurant details:\n');

  const email = await question('Email: ');
  const password = await question('Password: ');
  const name = await question('Restaurant Name: ');
  const subdomain = await question('Subdomain: ');

  return {
    restaurant: { email, password, name, subdomain },
    menu: sampleData.menu, // Still use sample menu structure
  };
}

seedDatabase();
