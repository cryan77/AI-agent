from datetime import date, datetime
from pathlib import Path

from app.models.schemas import Customer, Order
from app.services.database import get_connection, init_database

DATA_DIR = Path(__file__).resolve().parents[3] / "data"
REFUND_WINDOW_DAYS = 30
HIGH_VALUE_THRESHOLD = 500.0
CURRENT_DATE = date(2026, 6, 17)


class DataStore:
    def __init__(self) -> None:
        init_database()
        self._policy = (DATA_DIR / "refund_policy.md").read_text(encoding="utf-8")

    def list_customers(self) -> list[Customer]:
        conn = get_connection()
        try:
            rows = conn.execute(
                "SELECT customer_id, name, email, vip FROM customers ORDER BY customer_id"
            ).fetchall()
        finally:
            conn.close()
        return [
            Customer(
                customer_id=row["customer_id"],
                name=row["name"],
                email=row["email"],
                vip=bool(row["vip"]),
            )
            for row in rows
        ]

    def get_customer(self, customer_id: str) -> Customer | None:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT customer_id, name, email, vip FROM customers WHERE customer_id = ?",
                (customer_id.upper(),),
            ).fetchone()
        finally:
            conn.close()
        if not row:
            return None
        return Customer(
            customer_id=row["customer_id"],
            name=row["name"],
            email=row["email"],
            vip=bool(row["vip"]),
        )

    def get_order(self, order_id: str) -> Order | None:
        conn = get_connection()
        try:
            row = conn.execute(
                """SELECT order_id, customer_id, item_name, price, purchase_date, status, final_sale
                   FROM orders WHERE order_id = ?""",
                (order_id.upper(),),
            ).fetchone()
        finally:
            conn.close()
        if not row:
            return None
        return Order(
            order_id=row["order_id"],
            customer_id=row["customer_id"],
            item_name=row["item_name"],
            price=row["price"],
            purchase_date=row["purchase_date"],
            status=row["status"],
            final_sale=bool(row["final_sale"]),
        )

    def get_refund_policy(self) -> str:
        return self._policy

    def get_orders_by_customer(self, customer_id: str) -> list[Order]:
        conn = get_connection()
        try:
            rows = conn.execute(
                """SELECT order_id, customer_id, item_name, price, purchase_date, status, final_sale
                   FROM orders WHERE customer_id = ? ORDER BY purchase_date DESC""",
                (customer_id.upper(),),
            ).fetchall()
        finally:
            conn.close()
        return [
            Order(
                order_id=row["order_id"],
                customer_id=row["customer_id"],
                item_name=row["item_name"],
                price=row["price"],
                purchase_date=row["purchase_date"],
                status=row["status"],
                final_sale=bool(row["final_sale"]),
            )
            for row in rows
        ]

    def get_customer_orders_summary(self, customer_id: str) -> dict | None:
        customer = self.get_customer(customer_id)
        if not customer:
            return None
        orders = self.get_orders_by_customer(customer_id)
        return {
            "customer": customer.model_dump(),
            "orders": [o.model_dump() for o in orders],
        }

    def list_all_customers_with_orders(self) -> list[dict]:
        customers = self.list_customers()
        orders_by_customer: dict[str, list[dict]] = {c.customer_id: [] for c in customers}
        conn = get_connection()
        try:
            rows = conn.execute(
                """SELECT order_id, customer_id, item_name, price, purchase_date, status, final_sale
                   FROM orders ORDER BY customer_id, purchase_date DESC"""
            ).fetchall()
        finally:
            conn.close()
        for row in rows:
            cid = row["customer_id"]
            if cid in orders_by_customer:
                orders_by_customer[cid].append(
                    Order(
                        order_id=row["order_id"],
                        customer_id=row["customer_id"],
                        item_name=row["item_name"],
                        price=row["price"],
                        purchase_date=row["purchase_date"],
                        status=row["status"],
                        final_sale=bool(row["final_sale"]),
                    ).model_dump()
                )
        return [
            {"customer": c.model_dump(), "orders": orders_by_customer[c.customer_id]}
            for c in customers
        ]

    def evaluate_refund(self, order_id: str) -> dict:
        order = self.get_order(order_id)
        if not order:
            return {"eligible": False, "decision": "denied", "reason": f"Order {order_id} not found."}

        purchase = datetime.strptime(order.purchase_date, "%Y-%m-%d").date()
        days_since = (CURRENT_DATE - purchase).days

        if order.final_sale:
            return {
                "eligible": False,
                "decision": "denied",
                "reason": "Final sale items cannot be refunded.",
                "order": order.model_dump(),
            }

        if order.status == "Lost":
            return {
                "eligible": False,
                "decision": "escalated",
                "reason": "Lost or missing packages require review by a support agent.",
                "order": order.model_dump(),
            }

        if order.status != "Delivered":
            return {
                "eligible": False,
                "decision": "denied",
                "reason": f"Refunds are only available for delivered orders. Current status: {order.status}.",
                "order": order.model_dump(),
            }

        if order.price > HIGH_VALUE_THRESHOLD:
            return {
                "eligible": False,
                "decision": "escalated",
                "reason": f"Orders over ${HIGH_VALUE_THRESHOLD:.0f} require review by a support agent.",
                "order": order.model_dump(),
            }

        if days_since > REFUND_WINDOW_DAYS:
            return {
                "eligible": False,
                "decision": "denied",
                "reason": f"Refunds must be requested within {REFUND_WINDOW_DAYS} days of purchase. This order is {days_since} days old.",
                "order": order.model_dump(),
            }

        return {
            "eligible": True,
            "decision": "approved",
            "reason": f"Order is within the {REFUND_WINDOW_DAYS}-day refund window, delivered, not final sale, and under ${HIGH_VALUE_THRESHOLD:.0f}.",
            "order": order.model_dump(),
        }


data_store = DataStore()
