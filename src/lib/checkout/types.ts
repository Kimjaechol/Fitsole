export interface ShippingInfo {
  name: string;
  phone: string;
  zipcode: string;
  address: string; // 기본 주소 (from Daum API)
  detailAddress: string; // 상세 주소 (user input)
}

export type CheckoutStep = 'shipping' | 'payment' | 'confirmation';

export interface CheckoutState {
  step: CheckoutStep;
  shipping: ShippingInfo | null;
  orderId: string | null;
}
