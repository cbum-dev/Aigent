"""
Sales Database Seeder
Generates 100K+ realistic records for testing the analytics platform
"""

import psycopg2
from psycopg2.extras import execute_batch
from faker import Faker
import random
from datetime import datetime, timedelta
import uuid

fake = Faker()
Faker.seed(42)  # Reproducible data

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'database': 'analytics_dev1',
    'user': 'postgres',
    'password': 'postgres',
    'port': 5432
}

# Realistic data pools
PRODUCT_CATEGORIES = [
    'Electronics', 'Clothing', 'Home & Garden', 'Sports & Outdoors',
    'Books', 'Toys & Games', 'Beauty & Personal Care', 'Food & Beverages',
    'Automotive', 'Health & Wellness'
]

PRODUCT_NAMES = {
    'Electronics': ['Laptop Pro', 'Wireless Headphones', 'Smartphone X', '4K Monitor', 'Tablet Ultra', 'Smart Watch'],
    'Clothing': ['Cotton T-Shirt', 'Denim Jeans', 'Winter Jacket', 'Running Shoes', 'Hoodie', 'Summer Dress'],
    'Home & Garden': ['Coffee Maker', 'Vacuum Cleaner', 'Garden Tools Set', 'Bed Sheets', 'Kitchen Knife Set'],
    'Sports & Outdoors': ['Yoga Mat', 'Dumbbell Set', 'Camping Tent', 'Running Shoes Pro', 'Bicycle'],
    'Books': ['Python Programming', 'Fiction Novel', 'Cookbook', 'Self-Help Book', 'Biography'],
    'Toys & Games': ['LEGO Set', 'Board Game', 'Action Figure', 'Puzzle 1000pc', 'RC Car'],
    'Beauty & Personal Care': ['Moisturizer', 'Shampoo', 'Perfume', 'Makeup Kit', 'Hair Dryer'],
    'Food & Beverages': ['Organic Coffee', 'Green Tea', 'Protein Bar Box', 'Olive Oil', 'Dark Chocolate'],
    'Automotive': ['Car Phone Holder', 'Dash Cam', 'Car Vacuum', 'Tire Pressure Gauge'],
    'Health & Wellness': ['Vitamins', 'Fitness Tracker', 'Massage Gun', 'Essential Oils Set']
}

CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 
          'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Seattle']

STATES = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'WA', 'FL', 'OH', 'MI']

ORDER_STATUSES = ['completed', 'completed', 'completed', 'completed', 'pending', 'cancelled', 'refunded']
PAYMENT_METHODS = ['credit_card', 'credit_card', 'credit_card', 'paypal', 'bank_transfer']

TICKET_SUBJECTS = [
    'Product not delivered', 'Damaged item received', 'Wrong size/color',
    'Refund request', 'Product question', 'Account issue',
    'Payment problem', 'Shipping delay', 'Product defect'
]

CAMPAIGN_CHANNELS = ['email', 'social_media', 'google_ads', 'influencer', 'seo', 'affiliate']


def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(**DB_CONFIG)


def seed_companies(conn, num_companies=1):
    """Seed companies table"""
    print(f"🏢 Seeding {num_companies} companies...")
    
    cursor = conn.cursor()
    companies = []
    
    for i in range(num_companies):
        company_id = str(uuid.uuid4())
        companies.append((
            company_id,
            f"Demo E-commerce Store {i+1}",
            'E-commerce'
        ))
    
    execute_batch(cursor, """
        INSERT INTO companies (id, name, industry)
        VALUES (%s, %s, %s)
    """, companies)
    
    conn.commit()
    cursor.close()
    
    print(f"✅ Created {num_companies} companies")
    return [c[0] for c in companies]


def seed_products(conn, company_ids, num_products=1000):
    """Seed products table"""
    print(f"📦 Seeding {num_products} products...")
    
    cursor = conn.cursor()
    products = []
    
    for _ in range(num_products):
        category = random.choice(PRODUCT_CATEGORIES)
        product_name = random.choice(PRODUCT_NAMES[category])
        price = round(random.uniform(9.99, 999.99), 2)
        cost = round(price * random.uniform(0.3, 0.7), 2)  # 30-70% margin
        
        products.append((
            str(uuid.uuid4()),
            random.choice(company_ids),
            f"{product_name} - {fake.word().title()}",
            category,
            price,
            cost,
            random.randint(0, 500)
        ))
    
    execute_batch(cursor, """
        INSERT INTO products (id, company_id, name, category, price, cost, stock_quantity)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, products)
    
    conn.commit()
    cursor.close()
    
    print(f"✅ Created {num_products} products")
    return [p[0] for p in products]


def seed_customers(conn, company_ids, num_customers=10000):
    """Seed customers table"""
    print(f"👥 Seeding {num_customers} customers...")
    
    cursor = conn.cursor()
    customers = []
    
    # Generate customers over 3 years
    start_date = datetime.now() - timedelta(days=3*365)
    
    for _ in range(num_customers):
        customer_since = fake.date_between(start_date=start_date, end_date='today')
        
        customers.append((
            str(uuid.uuid4()),
            random.choice(company_ids),
            fake.name(),
            fake.email(),
            fake.phone_number(),
            random.choice(CITIES),
            random.choice(STATES),
            'USA',
            customer_since
        ))
    
    execute_batch(cursor, """
        INSERT INTO customers (id, company_id, name, email, phone, city, state, country, customer_since)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, customers)
    
    conn.commit()
    cursor.close()
    
    print(f"✅ Created {num_customers} customers")
    return [c[0] for c in customers]


def seed_orders_and_items(conn, company_ids, customer_ids, product_ids, num_orders=50000):
    """Seed orders and order_items tables"""
    print(f"🛒 Seeding {num_orders} orders with items...")
    
    cursor = conn.cursor()
    
    # Generate orders over 2 years with realistic patterns
    start_date = datetime.now() - timedelta(days=2*365)
    orders = []
    order_items = []
    order_counter = 1
    
    # Get product prices - CONVERT TO FLOAT
    cursor.execute("SELECT id, price FROM products")
    product_prices = {str(pid): float(price) for pid, price in cursor.fetchall()}
    
    for _ in range(num_orders):
        order_id = str(uuid.uuid4())
        company_id = random.choice(company_ids)
        customer_id = random.choice(customer_ids)
        
        # Realistic date distribution (more recent = more orders)
        days_ago = int(random.expovariate(1/180))  # Exponential distribution
        days_ago = min(days_ago, 730)  # Cap at 2 years
        order_date = datetime.now() - timedelta(days=days_ago)
        
        # Add seasonal spikes (Black Friday, Christmas)
        if order_date.month == 11 and order_date.day in range(25, 30):
            # Black Friday - 3x more orders (skip some to simulate spike)
            if random.random() > 0.66:
                continue
        elif order_date.month == 12 and order_date.day < 25:
            # Christmas season - 2x more orders
            if random.random() > 0.5:
                continue
        
        # Order details
        num_items = random.choices([1, 2, 3, 4, 5], weights=[40, 30, 15, 10, 5])[0]
        selected_products = random.sample(product_ids, min(num_items, len(product_ids)))
        
        total_amount = 0.0  # Use float
        items = []
        
        for product_id in selected_products:
            quantity = random.choices([1, 2, 3], weights=[70, 20, 10])[0]
            unit_price = product_prices.get(str(product_id), 50.0)  # Already float
            discount = round(random.uniform(0, unit_price * 0.2), 2) if random.random() > 0.7 else 0.0
            
            item_total = (unit_price * quantity) - discount
            total_amount += item_total
            
            items.append((
                str(uuid.uuid4()),
                order_id,
                product_id,
                quantity,
                unit_price,
                discount
            ))
        
        shipping_cost = round(random.uniform(5, 25), 2) if total_amount < 100 else 0.0
        discount_amount = round(total_amount * random.uniform(0, 0.15), 2) if random.random() > 0.8 else 0.0
        
        final_amount = total_amount + shipping_cost - discount_amount
        
        orders.append((
            order_id,
            company_id,
            customer_id,
            f"ORD-{order_counter:08d}",
            order_date,
            random.choice(ORDER_STATUSES),
            round(final_amount, 2),
            round(discount_amount, 2),
            round(shipping_cost, 2),
            random.choice(PAYMENT_METHODS)
        ))
        
        order_items.extend(items)
        order_counter += 1
        
        # Batch insert every 5000 records
        if len(orders) >= 5000:
            execute_batch(cursor, """
                INSERT INTO orders (id, company_id, customer_id, order_number, order_date, 
                                    status, total_amount, discount_amount, shipping_cost, payment_method)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, orders)
            
            execute_batch(cursor, """
                INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, order_items)
            
            conn.commit()
            print(f"   💾 Inserted {len(orders)} orders with {len(order_items)} items")
            orders = []
            order_items = []
    
    # Insert remaining
    if orders:
        execute_batch(cursor, """
            INSERT INTO orders (id, company_id, customer_id, order_number, order_date, 
                                status, total_amount, discount_amount, shipping_cost, payment_method)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, orders)
        
        execute_batch(cursor, """
            INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, order_items)
        
        conn.commit()
        print(f"   💾 Inserted {len(orders)} orders with {len(order_items)} items")
    
    cursor.close()
    print(f"✅ Created {num_orders} orders with order items")
    
    # Get actual order IDs for tickets
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM orders LIMIT 5000")
    order_ids = [str(oid[0]) for oid in cursor.fetchall()]
    cursor.close()
    
    return order_ids

def seed_support_tickets(conn, company_ids, customer_ids, order_ids, num_tickets=5000):
    """Seed support tickets"""
    print(f"🎫 Seeding {num_tickets} support tickets...")
    
    cursor = conn.cursor()
    tickets = []
    
    start_date = datetime.now() - timedelta(days=365)
    
    for _ in range(num_tickets):
        created_at = fake.date_time_between(start_date=start_date, end_date='now')
        status = random.choice(['open', 'in_progress', 'resolved', 'resolved', 'closed'])
        
        resolved_at = None
        if status in ['resolved', 'closed']:
            resolved_at = created_at + timedelta(hours=random.randint(1, 72))
        
        tickets.append((
            str(uuid.uuid4()),
            random.choice(company_ids),
            random.choice(customer_ids),
            random.choice(order_ids) if random.random() > 0.3 else None,
            random.choice(TICKET_SUBJECTS),
            status,
            random.choice(['low', 'medium', 'high', 'urgent']),
            created_at,
            resolved_at
        ))
    
    execute_batch(cursor, """
        INSERT INTO support_tickets (id, company_id, customer_id, order_id, subject, 
                                      status, priority, created_at, resolved_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, tickets)
    
    conn.commit()
    cursor.close()
    print(f"✅ Created {num_tickets} support tickets")


def seed_marketing_campaigns(conn, company_ids, num_campaigns=50):
    """Seed marketing campaigns"""
    print(f"📢 Seeding {num_campaigns} marketing campaigns...")
    
    cursor = conn.cursor()
    campaigns = []
    
    start_date = datetime.now() - timedelta(days=365)
    
    for i in range(num_campaigns):
        campaign_start = fake.date_between(start_date=start_date, end_date='today')
        campaign_end = campaign_start + timedelta(days=random.randint(7, 60))
        budget = round(random.uniform(1000, 50000), 2)
        roi = random.uniform(0.5, 5.0)  # 0.5x to 5x return
        revenue = round(budget * roi, 2)
        
        campaigns.append((
            str(uuid.uuid4()),
            random.choice(company_ids),
            f"{random.choice(['Spring', 'Summer', 'Fall', 'Winter', 'Black Friday', 'Holiday'])} Campaign {i+1}",
            random.choice(CAMPAIGN_CHANNELS),
            campaign_start,
            campaign_end,
            budget,
            revenue
        ))
    
    execute_batch(cursor, """
        INSERT INTO marketing_campaigns (id, company_id, name, channel, start_date, 
                                          end_date, budget, revenue_generated)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, campaigns)
    
    conn.commit()
    cursor.close()
    print(f"✅ Created {num_campaigns} marketing campaigns")


def seed_website_traffic(conn, company_ids, num_days=730):
    """Seed website traffic data"""
    print(f"📈 Seeding {num_days} days of website traffic...")
    
    cursor = conn.cursor()
    traffic = []
    
    start_date = datetime.now() - timedelta(days=num_days)
    
    for day in range(num_days):
        date = start_date + timedelta(days=day)
        
        # Realistic traffic patterns
        base_visitors = random.randint(1000, 5000)
        
        # Weekend traffic lower
        if date.weekday() >= 5:
            base_visitors = int(base_visitors * 0.7)
        
        # Holiday spikes
        if date.month == 11 and date.day in range(25, 30):
            base_visitors = int(base_visitors * 3)
        elif date.month == 12:
            base_visitors = int(base_visitors * 1.5)
        
        page_views = base_visitors * random.randint(2, 5)
        bounce_rate = round(random.uniform(30, 70), 2)
        avg_session = random.randint(120, 600)
        conversion_rate = round(random.uniform(1, 5), 2)
        
        traffic.append((
            str(uuid.uuid4()),
            random.choice(company_ids),
            date.date(),
            page_views,
            base_visitors,
            bounce_rate,
            avg_session,
            conversion_rate
        ))
    
    execute_batch(cursor, """
        INSERT INTO website_traffic (id, company_id, date, page_views, unique_visitors,
                                      bounce_rate, avg_session_duration, conversion_rate)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, traffic)
    
    conn.commit()
    cursor.close()
    print(f"✅ Created {num_days} days of traffic data")


def main():
    """Main seeder function"""
    print("\n" + "="*60)
    print("🌱 SALES DATABASE SEEDER")
    print("="*60 + "\n")
    
    conn = get_db_connection()
    
    try:
        # Seed data in order
        company_ids = seed_companies(conn, num_companies=1)
        product_ids = seed_products(conn, company_ids, num_products=1000)
        customer_ids = seed_customers(conn, company_ids, num_customers=10000)
        order_ids = seed_orders_and_items(conn, company_ids, customer_ids, product_ids, num_orders=50000)
        seed_support_tickets(conn, company_ids, customer_ids, order_ids, num_tickets=5000)
        seed_marketing_campaigns(conn, company_ids, num_campaigns=50)
        seed_website_traffic(conn, company_ids, num_days=730)
        
        print("\n" + "="*60)
        print("✅ DATABASE SEEDING COMPLETE!")
        print("="*60)
        print("\n📊 Summary:")
        print(f"   • 1 Company")
        print(f"   • 1,000 Products")
        print(f"   • 10,000 Customers")
        print(f"   • 50,000 Orders (~150,000 order items)")
        print(f"   • 5,000 Support Tickets")
        print(f"   • 50 Marketing Campaigns")
        print(f"   • 730 Days of Website Traffic")
        print(f"\n   Total Records: ~170,000+")
        print("\n🎯 You can now test complex queries like:")
        print("   • 'Show me monthly revenue trends'")
        print("   • 'Which products sell best in winter?'")
        print("   • 'What's our customer churn rate?'")
        print("   • 'ROI by marketing channel'")
        print("   • 'Average order value by customer segment'")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    main()