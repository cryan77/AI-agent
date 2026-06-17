import { useEffect, useState } from "react";
import { authFetch } from "../lib/auth";
import type { CustomerWithOrders } from "../types";

interface Props {
  fullPage?: boolean;
}

export default function AdminCustomerPanel({ fullPage = false }: Props) {
  const [customers, setCustomers] = useState<CustomerWithOrders[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/api/admin/customers")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load customers");
        return res.json();
      })
      .then((data: { customers: CustomerWithOrders[] }) => {
        setCustomers(data.customers);
        if (data.customers.length > 0) {
          setExpandedId(data.customers[0].customer.customer_id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleCustomer = (customerId: string) => {
    setExpandedId((prev) => (prev === customerId ? null : customerId));
  };

  return (
    <section className={`panel admin-customers-panel${fullPage ? " admin-customers-panel-full" : ""}`}>
      <div className="panel-header">
        <h2>Customers</h2>
        <span className="panel-tag">CRM</span>
      </div>

      <div className="admin-customer-list">
        {loading && <p className="trace-empty">Loading customers…</p>}
        {error && <p className="lookup-error">{error}</p>}
        {!loading && !error && customers.length === 0 && (
          <p className="trace-empty">No customers found.</p>
        )}

        {!loading &&
          !error &&
          customers.map(({ customer, orders }) => {
            const expanded = expandedId === customer.customer_id;
            return (
              <div key={customer.customer_id} className="admin-customer-block">
                <button
                  type="button"
                  className={`admin-customer-row ${expanded ? "expanded" : ""}`}
                  onClick={() => toggleCustomer(customer.customer_id)}
                  aria-expanded={expanded}
                >
                  <span className="admin-customer-chevron">{expanded ? "▾" : "▸"}</span>
                  <span className="admin-customer-name">{customer.name}</span>
                  <span className="admin-customer-id">{customer.customer_id}</span>
                  {customer.vip && <span className="vip-badge">VIP</span>}
                  <span className="admin-customer-order-count">
                    {orders.length} order{orders.length === 1 ? "" : "s"}
                  </span>
                </button>

                {expanded && (
                  <div className="admin-customer-orders">
                    <p className="admin-customer-email">{customer.email}</p>
                    {orders.length === 0 ? (
                      <p className="orders-empty">No orders for this customer.</p>
                    ) : (
                      <table className="orders-table admin-orders-table">
                        <thead>
                          <tr>
                            <th>Order</th>
                            <th>Item</th>
                            <th>Price</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Final Sale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => (
                            <tr key={order.order_id}>
                              <td>{order.order_id}</td>
                              <td>{order.item_name}</td>
                              <td>${order.price.toFixed(2)}</td>
                              <td>{order.purchase_date}</td>
                              <td>{order.status}</td>
                              <td>{order.final_sale ? "Yes" : "No"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </section>
  );
}
