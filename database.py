import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'stock.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    
    # Create products table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ssd_type TEXT NOT NULL,
            brand TEXT NOT NULL,
            size TEXT,
            quantity INTEGER DEFAULT 0,
            total_exited INTEGER DEFAULT 0,
            UNIQUE(ssd_type, brand, size)
        )
    ''')
    
    # Create entries table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_date TEXT NOT NULL,
            ssd_type TEXT NOT NULL,
            brand TEXT NOT NULL,
            size TEXT,
            quantity INTEGER NOT NULL,
            supplier TEXT NOT NULL,
            price REAL NOT NULL
        )
    ''')
    
    # Create exits table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS exits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exit_date TEXT NOT NULL,
            ssd_type TEXT NOT NULL,
            brand TEXT NOT NULL,
            size TEXT,
            quantity INTEGER NOT NULL,
            supplier TEXT NOT NULL,
            client TEXT NOT NULL
        )
    ''')
    
    # Check if admin user exists, if not create it
    cursor.execute("SELECT * FROM users WHERE username = 'admin'")
    admin = cursor.fetchone()
    if not admin:
        hashed_password = generate_password_hash('admin')
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", ('admin', hashed_password))
        print("Usuário 'admin' criado com sucesso.")
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Banco de dados inicializado.")
