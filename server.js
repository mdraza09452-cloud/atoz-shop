const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "database.json");
const HTML = path.join(__dirname, "index.html");

// Create database automatically
if (!fs.existsSync(DB)) {
  const initialData = {
    products: [
      { id: 1, name: "Cricket Bat", price: 799, icon: "🏏" },
      { id: 2, name: "Football", price: 599, icon: "⚽" },
      { id: 3, name: "Sports Shoes", price: 999, icon: "👟" },
      { id: 4, name: "Cricket Ball", price: 150, icon: "🔴" },
      { id: 5, name: "Badminton", price: 450, icon: "🏸" },
      { id: 6, name: "Basketball", price: 650, icon: "🏀" }
    ],
    orders: []
  };

  fs.writeFileSync(DB, JSON.stringify(initialData, null, 2));
}

// Read database
function readDB() {
  return JSON.parse(fs.readFileSync(DB, "utf8"));
}

// Save database
function saveDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// Send JSON response
function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });

  res.end(JSON.stringify(data));
}

// Create server
const server = http.createServer((req, res) => {
  const pathname = new URL(
    req.url,
    "http://localhost"
  ).pathname;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // Homepage
  if (req.method === "GET" && pathname === "/") {
    if (!fs.existsSync(HTML)) {
      res.writeHead(500, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      return res.end("Error: index.html file not found!");
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });

    return fs.createReadStream(HTML).pipe(res);
  }

  // Get products
  if (req.method === "GET" && pathname === "/api/products") {
    try {
      return sendJSON(res, 200, readDB().products);
    } catch (error) {
      return sendJSON(res, 500, {
        error: "Could not load products."
      });
    }
  }

  // Get orders
  if (req.method === "GET" && pathname === "/api/orders") {
    try {
      return sendJSON(res, 200, readDB().orders);
    } catch (error) {
      return sendJSON(res, 500, {
        error: "Could not load orders."
      });
    }
  }

  // Save order
  if (req.method === "POST" && pathname === "/api/orders") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      if (body.length > 100000) {
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const db = readDB();

        const name = String(data.name || "").trim();
        const phone = String(data.phone || "").trim();
        const address = String(data.address || "").trim();

        if (
          !name ||
          !/^[0-9]{10}$/.test(phone) ||
          address.length < 5
        ) {
          return sendJSON(res, 400, {
            error: "Please enter valid details."
          });
        }

        let orderItems = [];

        // Support cart items
        if (Array.isArray(data.items) && data.items.length > 0) {
          for (const item of data.items) {
            const product = db.products.find(
              p => p.id === Number(item.id)
            );

            const qty = Math.floor(Number(item.qty));

            if (!product || !Number.isFinite(qty) || qty < 1) {
              return sendJSON(res, 400, {
                error: "Invalid product or quantity."
              });
            }

            orderItems.push({
              id: product.id,
              name: product.name,
              price: product.price,
              qty: qty
            });
          }
        } else {
          // Support single product orders
          const product = db.products.find(
            p => p.id === Number(data.productId)
          );

          if (!product) {
            return sendJSON(res, 400, {
              error: "Product not found."
            });
          }

          orderItems.push({
            id: product.id,
            name: product.name,
            price: product.price,
            qty: 1
          });
        }

        const total = orderItems.reduce(
          (sum, item) => sum + item.price * item.qty,
          0
        );

        const order = {
          id: Date.now(),
          name: name,
          phone: phone,
          address: address,
          items: orderItems,
          total: total,
          date: new Date().toLocaleString()
        };

        db.orders.push(order);
        saveDB(db);

        return sendJSON(res, 201, {
          message: "Order saved successfully!",
          order: order
        });

      } catch (error) {
        return sendJSON(res, 400, {
          error: "Invalid order data."
        });
      }
    });

    return;
  }

  // Page not found
  return sendJSON(res, 404, {
    error: "Page not found"
  });
});

// Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log("A to Z Sports Shop Started!");
  console.log("Server running on port " + PORT);
});
