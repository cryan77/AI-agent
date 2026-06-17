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
                "reason": "Final sale items cannot be refunded (Policy Rule 2).",
                "order": order.model_dump(),
            }

        if order.status == "Lost":
            return {
                "eligible": False,
                "decision": "escalated",
                "reason": "Lost orders require human escalation (Policy Rule 5).",
                "order": order.model_dump(),
            }

        if order.status != "Delivered":
            return {
                "eligible": False,
                "decision": "denied",
                "reason": f"Only delivered orders are eligible. Current status: {order.status} (Policy Rule 4).",
                "order": order.model_dump(),
            }

        if order.price > HIGH_VALUE_THRESHOLD:
            return {
                "eligible": False,
                "decision": "escalated",
                "reason": f"Refunds over ${HIGH_VALUE_THRESHOLD:.0f} require human escalation (Policy Rule 3).",
                "order": order.model_dump(),
            }

        if days_since > REFUND_WINDOW_DAYS:
            return {
                "eligible": False,
                "decision": "denied",
                "reason": f"Refund window is {REFUND_WINDOW_DAYS} days. Purchase was {days_since} days ago (Policy Rule 1).",
                "order": order.model_dump(),
            }

        return {
            "eligible": True,
            "decision": "approved",
            "reason": f"Order is within {REFUND_WINDOW_DAYS}-day refund window, delivered, not final sale, and under ${HIGH_VALUE_THRESHOLD:.0f}.",
            "order": order.model_dump(),
        }


data_store = DataStore()
