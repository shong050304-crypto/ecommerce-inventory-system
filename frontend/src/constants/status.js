export const PAYMENT_STATUS = {
  unpaid: { label: '未付款', variant: 'danger' },
  paid: { label: '已付款', variant: 'success' },
  failed: { label: '付款失敗', variant: 'neutral' },
};

export const ORDER_STATUS = {
  processing: { label: '處理中', variant: 'warning' },
  shipped: { label: '已出貨', variant: 'primary' },
  completed: { label: '已完成', variant: 'success' },
  cancel_requested: { label: '申請取消', variant: 'danger' },
  cancelled: { label: '已取消', variant: 'neutral' },
};
