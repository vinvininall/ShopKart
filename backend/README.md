# ShopKart backend setup

Install dependencies with `npm install`, copy `.env.example` to `.env`, then set
the MongoDB connection, JWT secret, and Razorpay **Test Mode** credentials from
your Razorpay dashboard. Never expose `RAZORPAY_KEY_SECRET` to the frontend.
The backend ignores `.env` in Git.

Start the API with `npm run dev`. The React application should use the backend
origin through `VITE_API_BASE_URL` (for example, `http://localhost:5000`).

## Order API

All order endpoints require the existing authenticated `token` cookie:

- `POST /orders/create-payment-order` with `{ "shippingAddress": { "fullName", "phone", "addressLine1", "city", "state", "pincode" } }`
- `POST /orders/verify-payment` with `shopKartOrderId`, `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`
- `GET /orders` for the signed-in customer's orders
- `GET /orders/:id` for an owned order

The server calculates totals from current product records. A payment is marked
paid only after the signature is valid and Razorpay reports the exact-amount
payment as captured. Checkout testing must use Razorpay Test Mode.
