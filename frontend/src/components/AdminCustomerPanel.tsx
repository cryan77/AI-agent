import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../lib/auth";
import type { CustomerWithOrders, Order } from "../types";

interface RefundEligibility {
  order_id: string;
  eligible: boolean;
  decision: "approved" | "denied" | "escalated";
  reason: string;
  order?: Order;
}

const decisionBadge: Record<string, string> = {
  approved: "badge-approved",
  denied: "badge-denied",
  escalated: "badge-escalated",
};

export default function AdminCustomerPanel() {
  const [customers, setCustomers] = useState<CustomerWithOrders[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [refundCheck, setRefundCheck] = useState<RefundEligibility | null>(null);
  const [checkingRefund, setCheckingRefund] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    authFetch("/api/admin/customers")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load customers");
        return res.json();
      })
      .then((data: { customers: CustomerWithOrders[] }) => {
        setCustomers(data.customers);
        if (data.customers.length > 0) {
          setSelectedId(data.customers[0].customer.customer_id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selected = customers.find((c) => c.customer.customer_id === selectedId) ?? null;

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(({ customer }) => {
      const haystack = [
        customer.customer_id,
        customer.name,
        customer.email,
        customer.vip ? "vip" : "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [customers, searchQuery]);

  const selectCustomer = (customerId: string) => {
    setSelectedId(customerId);
    setSelectedOrderId(null);
    setRefundCheck(null);
    setActionMessage(null);
  };

  const selectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setRefundCheck(null);
    setActionMessage(null);
  };

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setActionMessage(`${label} copied to clipboard.`);
    } catch {
      setActionMessage(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const checkRefundEligibility = async (orderId: string) => {
    setCheckingRefund(true);
    setActionMessage(null);
    try {
      const res = await authFetch(`/api/admin/orders/${orderId}/refund-eligibility`);
      if (!res.ok) throw new Error("Refund check failed");
      const data: RefundEligibility = await res.json();
      setRefundCheck(data);
      setSelectedOrderId(orderId);
    } catch {
      setActionMessage("Could not check refund eligibility.");
      setRefundCheck(null);
    } finally {
      setCheckingRefund(false);
    }
  };

  return (
    <>
      <section className="panel customers-list-panel anim-panel-in">
        <div className="panel-header">
          <h2>Customers</h2>
          <span className="panel-tag">CRM</span>
        </div>

        <div className="customers-search">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or ID…"
            disabled={loading}
            aria-label="Search customers"
          />
        </div>

        <div className="customers-list">
          {loading && <p className="trace-empty">Loading customers…</p>}
          {error && <p className="lookup-error">{error}</p>}
          {!loading && !error && customers.length === 0 && (
            <p className="trace-empty">No customers found.</p>
          )}
          {!loading && !error && customers.length > 0 && filteredCustomers.length === 0 && (
            <p className="trace-empty">No customers match your search.</p>
          )}

          {!loading &&
            !error &&
            filteredCustomers.map(({ customer, orders }) => (
              <button
                key={customer.customer_id}
                type="button"
                className={`customer-list-item ${selectedId === customer.customer_id ? "selected" : ""}`}
                onClick={() => selectCustomer(customer.customer_id)}
              >
                <span className="customer-list-name">{customer.name}</span>
                <span className="customer-list-meta">
                  {customer.customer_id}
                  {customer.vip && <span className="vip-badge">VIP</span>}
                  · {orders.length} order{orders.length === 1 ? "" : "s"}
                </span>
              </button>
            ))}
        </div>
      </section>

      <section className="panel customers-detail-panel anim-panel-in">
        {!selected ? (
          <div className="customers-detail-empty">
            <p>Select a customer to view orders and actions.</p>
          </div>
        ) : (
          <>
            <div className="panel-header customers-detail-header">
              <div>
                <h2>{selected.customer.name}</h2>
                <p className="customers-detail-subtitle">
                  {selected.customer.customer_id} · {selected.customer.email}
                  {selected.customer.vip && <span className="vip-badge">VIP</span>}
                </p>
              </div>
            </div>

            <div className="customers-actions">
              <span className="quick-label">Actions:</span>
              <button
                type="button"
                className="quick-btn"
                onClick={() => copyText("Email", selected.customer.email)}
              >
                Copy email
              </button>
              <button
                type="button"
                className="quick-btn"
                onClick={() => copyText("Customer ID", selected.customer.customer_id)}
              >
                Copy customer ID
              </button>
              {selectedOrderId && (
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => copyText("Order ID", selectedOrderId)}
                >
                  Copy order ID
                </button>
              )}
              {selectedOrderId && (
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => checkRefundEligibility(selectedOrderId)}
                  disabled={checkingRefund}
                >
                  {checkingRefund ? "Checking…" : "Check refund eligibility"}
                </button>
              )}
            </div>

            {actionMessage && <p className="customers-action-message">{actionMessage}</p>}

            <div className="customers-orders-wrap">
              {selected.orders.length === 0 ? (
                <p className="orders-empty">No orders for this customer.</p>
              ) : (
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Item</th>
                      <th>Price</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Final Sale</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.orders.map((order) => (
                      <tr
                        key={order.order_id}
                        className={selectedOrderId === order.order_id ? "selected-row" : ""}
                        onClick={() => selectOrder(order.order_id)}
                      >
                        <td>{order.order_id}</td>
                        <td>{order.item_name}</td>
                        <td>${order.price.toFixed(2)}</td>
                        <td>{order.purchase_date}</td>
                        <td>{order.status}</td>
                        <td>{order.final_sale ? "Yes" : "No"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              checkRefundEligibility(order.order_id);
                            }}
                            disabled={checkingRefund}
                          >
                            Check
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {refundCheck && (
              <div className="refund-check-result">
                <div className="refund-check-header">
                  <strong>Refund check — {refundCheck.order_id}</strong>
                  <span className={`badge ${decisionBadge[refundCheck.decision]}`}>
                    {refundCheck.decision.toUpperCase()}
                  </span>
                </div>
                <p>{refundCheck.reason}</p>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
