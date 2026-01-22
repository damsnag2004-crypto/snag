const crypto = require('crypto');
const axios = require('axios');

const MOMO_CONFIG = {
  endpoint: "https://test-payment.momo.vn/v2/gateway/api/create",
  partnerCode: "MOMO",
  accessKey: "F8BBA842ECF85",
  secretKey: "K951B6PE1waDMi640xX08PD3vg6EkVlz",
  redirectUrl: "https://google.com",
  ipnUrl: "http://your-server-ip/api/payments/webhook",
};

class MomoService {
  static async createQR({ amount, orderId }) {
    const requestId = orderId;
    const rawSignature =
      `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=&ipnUrl=${MOMO_CONFIG.ipnUrl}&orderId=${orderId}` +
      `&orderInfo=Deposit Payment&partnerCode=${MOMO_CONFIG.partnerCode}&requestId=${requestId}&requestType=captureWallet`;

    const signature = crypto
      .createHmac("sha256", MOMO_CONFIG.secretKey)
      .update(rawSignature)
      .digest("hex");

    const body = {
      partnerCode: MOMO_CONFIG.partnerCode,
      accessKey: MOMO_CONFIG.accessKey,
      requestId,
      amount,
      orderId,
      orderInfo: "Deposit Payment",
      redirectUrl: MOMO_CONFIG.redirectUrl,
      ipnUrl: MOMO_CONFIG.ipnUrl,
      requestType: "captureWallet",
      signature,
      lang: "vi",
    };

    const response = await axios.post(MOMO_CONFIG.endpoint, body);

    return {
      qrUrl: response.data.payUrl,
      orderId
    };
  }
}

module.exports = MomoService;
