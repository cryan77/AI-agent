import type { Order } from "../types";

const CATEGORIES = [
  "Electronics",
  "Home & Kitchen",
  "Apparel",
  "Sports & Outdoors",
  "Office Supplies",
  "Accessories",
];

const PAYMENT_METHODS = [
  "Visa ending in 4242",
  "Mastercard ending in 8910",
  "Walmart Pay",
  "Debit ending in 3312",
];

const SHIPPING_METHODS = ["Standard delivery", "Express delivery", "Store pickup"];

export interface OrderMeta {
  sku: string;
  category: string;
  quantity: number;
  paymentMethod: string;
  shippingMethod: string;
  returnWindowDays: number;
  daysSincePurchase: number;
  refundEligible: boolean;
  imageHue: number;
}

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getOrderMeta(order: Order): OrderMeta {
  const hash = hashCode(order.order_id + order.item_name);
  const purchaseDate = new Date(`${order.purchase_date}T12:00:00`);
  const daysSincePurchase = Math.max(
    0,
    Math.floor((Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const returnWindowDays = order.final_sale ? 0 : 30;

  return {
    sku: `WM-${order.order_id.replace(/^O/, "")}-${order.customer_id}`,
    category: CATEGORIES[hash % CATEGORIES.length],
    quantity: 1,
    paymentMethod: PAYMENT_METHODS[hash % PAYMENT_METHODS.length],
    shippingMethod: SHIPPING_METHODS[hash % SHIPPING_METHODS.length],
    returnWindowDays,
    daysSincePurchase,
    refundEligible: !order.final_sale && daysSincePurchase <= returnWindowDays,
    imageHue: hash % 360,
  };
}

export function formatPurchaseDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateStr}T12:00:00`));
}
