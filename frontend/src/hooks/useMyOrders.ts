import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../lib/auth";
import type { Customer, Order } from "../types";

export function useMyOrders() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    authFetch("/api/orders/me")
      .then((res) => {
        if (res.status === 401) throw new Error("Session expired. Please sign in again.");
        if (!res.ok) throw new Error("Failed to load orders");
        return res.json();
      })
      .then((data) => {
        setCustomer(data.customer);
        setOrders(data.orders);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user?.customer_id]);

  return { customer, orders, loading, error };
}
