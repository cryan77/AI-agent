import json
from datetime import date, datetime
from pathlib import Path

from app.models.schemas import Customer, Order

DATA_DIR = Path(__file__).resolve().parents[3] / "data"
REFUND_WINDOW_DAYS = 30
HIGH_VALUE_THRESHOLD = 500.0
CURRENT_DATE = date(2026, 6, 17)


class DataStore:
    def __init__(self) -> None:
        self._customers: dict[str, Customer] = {}
        self._orders: dict[str, Order] = {}
        self._policy: str = ""
        self._load()

    def _load(self) -> None:
        with open(DATA_DIR / "customers.json", encoding="utf-8") as f:
            for row in json.load(f):
                customer = Customer(**row)
                self._customers[customer.customer_id] = customer

        with open(DATA_DIR / "orders.json", encoding="utf-8") as f:
            for row in json.load(f):
                order = Order(**row)
                self._orders[order.order_id] = order

        self._policy = (DATA_DIR / "refund_policy.md").read_text(encoding="utf-8")

    def get_customer(self, customer_id: str) -> Customer | None:
        return self._customers.get(customer_id.upper())

    def get_order(self, order_id: str) -> Order | None:
        return self._orders.get(order_id.upper())

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
