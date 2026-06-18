import { useState } from "react";
import OrderDetailModal from "./OrderDetailModal";
import type { Customer, Order } from "../types";

interface Props {
  compact?: boolean;
  customer?: Customer | null;
  orders?: Order[];
  loading?: boolean;
  error?: string | null;
}

export default function OrderHistoryPanel({
  compact = false,
  customer = null,
  orders = [],
  loading = false,
  error = null,
}: Props) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  return (
    <>
      <section className={`panel anim-panel-in ${compact ? "order-panel-compact" : "order-panel"}`}>
        <div className="panel-header">
          <div>
            <h2>My Orders</h2>
            {!loading && orders.length > 0 && (
              <p className="panel-subtitle">Click an order to view details</p>
            )}
          </div>
        </div>

        {customer && (
          <div className="customer-info">
            <strong>{customer.name}</strong>
            <span>{customer.customer_id}</span>
            <span>{customer.email}</span>
            {customer.vip && <span className="vip-badge">VIP</span>}
          </div>
        )}

        {error && <p className="lookup-error">{error}</p>}

        <div className="orders-table-wrap">
          {loading && <p className="orders-empty">Loading orders…</p>}
          {!loading && orders.length === 0 && !error && (
            <p className="orders-empty">No orders found.</p>
          )}
          {!loading && orders.length > 0 && (
            <table className="orders-table">
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
                  <tr
                    key={order.order_id}
                    className="order-row-clickable"
                    onClick={() => setSelectedOrder(order)}
                  >
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
      </section>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          customer={customer}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  );
}
