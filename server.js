const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const DB = path.join(__dirname, "database.json");

// Create database automatically
if (!fs.existsSync(DB)) {
  fs.writeFileSync(DB, JSON.stringify({
    products: [
      {id:1, name:"Cricket Bat", price:799, icon:"🏏"},
      {id:2, name:"Football", price:599, icon:"⚽"},
      {id:3, name:"Sports Shoes", price:999, icon:"👟"},
      {id:4, name:"Cricket Ball", price:150, icon:"🔴"},
      {id:5, name:"Badminton", price:450, icon:"🏸"},
      {id:6, name:"Basketball", price:650, icon:"🏀"}
    ],
    orders: []
  }, null, 2));
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && req.url === "/api/products") {
    return res.end(JSON.stringify(readDB().products));
  }

  if (req.method === "POST" && req.url === "/api/orders") {
    let body = "";

    req.on("data", chunk => body += chunk);

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const db = readDB();

        const name = String(data.name || "").trim();
        const phone = String(data.phone || "").trim();
        const address = String(data.address || "").trim();
        const productId = Number(data.productId);

        const product = db.products.find(p => p.id === productId);

        if (!name || !/^[0-9]{10}$/.test(phone) ||
            address.length < 5 || !product) {
          res.statusCode = 400;
          return res.end(JSON.stringify({
            error: "Please enter valid details."
          }));
        }

        const order = {
          id: Date.now(),
          name,
          phone,
          address,
          product: product.name,
          price: product.price,
          date: new Date().toLocaleString()
        };

        db.orders.push(order);
        saveDB(db);

        res.statusCode = 201;
        res.end(JSON.stringify({
          message: "Order saved successfully!",
          order
        }));

      } catch (error) {
        res.statusCode = 400;
        res.end(JSON.stringify({error:"Invalid order data."}));
      }
    });

    return;
  }

  if (req.method === "GET" && req.url === "/api/orders") {
    return res.end(JSON.stringify(readDB().orders));
  }

  if (req.method === "GET" && req.url === "/") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return fs.createReadStream(
      path.join(__dirname, "index.html")
    ).pipe(res);
  }

  res.statusCode = 404;
  res.end(JSON.stringify({error:"Page not found"}));
});

server.listen(PORT, () => {
  console.log("A to Z Sports Shop Started!");
  console.log("http://localhost:3000");
});