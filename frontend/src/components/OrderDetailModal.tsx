import { useEffect } from "react";
import { formatPurchaseDate, getOrderMeta } from "../lib/orderMeta";
import type { Customer, Order } from "../types";

interface Props {
  order: Order;
  customer?: Customer | null;
  onClose: () => void;
}

function ProductImage({ name, hue }: { name: string; hue: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className="order-detail-image"
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 42% 88%) 0%, hsl(${hue} 28% 78%) 100%)`,
      }}
      aria-hidden="true"
    >
      <div className="order-detail-image-inner">
        <span className="order-detail-image-icon">{initials || "WM"}</span>
        <span className="order-detail-image-label">Product preview</span>
      </div>
    </div>
  );
}

export default function OrderDetailModal({ order, customer, onClose }: Props) {
  const meta = getOrderMeta(order);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-panel order-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="order-detail-title">Order details</h2>
            <p className="order-detail-subtitle">{order.order_id}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="order-detail-body">
          <ProductImage name={order.item_name} hue={meta.imageHue} />

          <div className="order-detail-content">
            <h3 className="order-detail-item-name">{order.item_name}</h3>

            <dl className="order-detail-grid">
              <div className="order-detail-row">
                <dt>Price</dt>
                <dd>${order.price.toFixed(2)}</dd>
              </div>
              <div className="order-detail-row">
                <dt>Purchase date</dt>
                <dd>{formatPurchaseDate(order.purchase_date)}</dd>
              </div>
              <div className="order-detail-row">
                <dt>Status</dt>
                <dd>
                  <span className={`order-status-tag status-${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </dd>
              </div>
              <div className="order-detail-row">
                <dt>Final sale</dt>
                <dd>
                  <span className={`order-flag-tag ${order.final_sale ? "flag-yes" : "flag-no"}`}>
                    {order.final_sale ? "Yes — non-returnable" : "No — return eligible"}
                  </span>
                </dd>
              </div>
              <div className="order-detail-row">
                <dt>SKU</dt>
                <dd>{meta.sku}</dd>
              </div>
              <div className="order-detail-row">
                <dt>Category</dt>
                <dd>{meta.category}</dd>
              </div>
              <div className="order-detail-row">
                <dt>Quantity</dt>
                <dd>{meta.quantity}</dd>
              </div>
              <div className="order-detail-row">
                <dt>Payment</dt>
                <dd>{meta.paymentMethod}</dd>
              </div>
              <div className="order-detail-row">
                <dt>Shipping</dt>
                <dd>{meta.shippingMethod}</dd>
              </div>
              <div className="order-detail-row">
                <dt>Return window</dt>
                <dd>
                  {meta.returnWindowDays > 0
                    ? `${meta.returnWindowDays} days (${meta.daysSincePurchase} days ago)`
                    : "Not eligible — final sale item"}
                </dd>
              </div>
              {customer && (
                <div className="order-detail-row">
                  <dt>Customer</dt>
                  <dd>
                    {customer.name} · {customer.customer_id}
                  </dd>
                </div>
              )}
            </dl>

            <div
              className={`order-detail-refund-hint ${meta.refundEligible ? "hint-eligible" : "hint-ineligible"}`}
            >
              {meta.refundEligible
                ? "This item may qualify for a refund under standard return policy. Ask the Refund Assistant to start a request."
                : order.final_sale
                  ? "Final sale items cannot be returned or refunded per store policy."
                  : "The standard 30-day return window has passed for this order."}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
