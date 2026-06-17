"""SQLite CRM database — seeded from synthetic JSON data on first run."""

import hashlib
import json
import sqlite3
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[3] / "data"
DB_PATH = DATA_DIR / "crm.db"
DEFAULT_PASSWORD = "123456"
ADMIN_EMAIL = "admin@email.com"

SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    vip INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    price REAL NOT NULL,
    purchase_date TEXT NOT NULL,
    status TEXT NOT NULL,
    final_sale INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    customer_id TEXT,
    name TEXT NOT NULL,
    vip INTEGER NOT NULL DEFAULT 0
);
"""


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database() -> None:
    """Create tables and seed from JSON if the database is empty."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = get_connection()
    try:
        conn.executescript(SCHEMA)
        count = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
        if count == 0:
            _seed_from_json(conn)
        user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if user_count == 0:
            _seed_users(conn)
        conn.commit()
    finally:
        conn.close()


def _seed_from_json(conn: sqlite3.Connection) -> None:
    customers_path = DATA_DIR / "customers.json"
    orders_path = DATA_DIR / "orders.json"

    with open(customers_path, encoding="utf-8") as f:
        for row in json.load(f):
            conn.execute(
                "INSERT INTO customers (customer_id, name, email, vip) VALUES (?, ?, ?, ?)",
                (row["customer_id"], row["name"], row["email"], int(row["vip"])),
            )

    with open(orders_path, encoding="utf-8") as f:
        for row in json.load(f):
            conn.execute(
                """INSERT INTO orders
                   (order_id, customer_id, item_name, price, purchase_date, status, final_sale)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    row["order_id"],
                    row["customer_id"],
                    row["item_name"],
                    row["price"],
                    row["purchase_date"],
                    row["status"],
                    int(row["final_sale"]),
                ),
            )


def _seed_users(conn: sqlite3.Connection) -> None:
    password_hash = hash_password(DEFAULT_PASSWORD)
    rows = conn.execute("SELECT customer_id, name, email, vip FROM customers").fetchall()
    for row in rows:
        conn.execute(
            """INSERT INTO users (email, password_hash, role, customer_id, name, vip)
               VALUES (?, ?, 'customer', ?, ?, ?)""",
            (row["email"].lower(), password_hash, row["customer_id"], row["name"], int(row["vip"])),
        )
    conn.execute(
        """INSERT INTO users (email, password_hash, role, customer_id, name, vip)
           VALUES (?, ?, 'admin', NULL, 'Admin', 0)""",
        (ADMIN_EMAIL.lower(), password_hash),
    )
