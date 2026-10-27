
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const VERSION = process.env.APP_VERSION || "v1";

let nextBillId = 1;

const medicines = [
    { id: 1, name: "Paracetamol", price: 10, stock: 100 },
    { id: 2, name: "Cetirizine", price: 5, stock: 50 }
];

const bills = [];

const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
    }

    const sendJSON = (status, data) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
    };

    const readBody = (callback) => {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            try {
                callback(JSON.parse(body || "{}"));
            } catch {
                sendJSON(400, { error: "Invalid JSON request" });
            }
        });
    };

    if (req.url === "/api/health" && req.method === "GET") {
        return sendJSON(200, { status: "ok", version: VERSION });
    }

    if (req.url === "/api/version" && req.method === "GET") {
        return sendJSON(200, { version: VERSION });
    }

    if (req.url === "/api/medicines" && req.method === "GET") {
        return sendJSON(200, medicines);
    }

    if (req.url === "/api/medicines" && req.method === "POST") {
        return readBody(data => {
            const name = String(data.name || "").trim();
            const price = Number(data.price);
            const stock = Number(data.stock);

            if (!name || !Number.isFinite(price) || price <= 0 ||
                !Number.isInteger(stock) || stock < 0) {
                return sendJSON(400, {
                    error: "Enter a name, positive price, and valid stock quantity"
                });
            }

            const medicine = {
                id: Math.max(0, ...medicines.map(m => m.id)) + 1,
                name,
                price,
                stock
            };

            medicines.push(medicine);
            sendJSON(201, { message: "Medicine added", medicine });
        });
    }

    if (req.url === "/api/bills" && req.method === "POST") {
        return readBody(data => {
            if (!Array.isArray(data.items) || data.items.length === 0) {
                return sendJSON(400, { error: "Add at least one medicine" });
            }

            const items = [];

            for (const requested of data.items) {
                const medicine = medicines.find(
                    m => m.id === Number(requested.medicineId)
                );
                const quantity = Number(requested.quantity);

                if (!medicine || !Number.isInteger(quantity) || quantity <= 0) {
                    return sendJSON(400, { error: "Invalid medicine or quantity" });
                }

                if (medicine.stock < quantity) {
                    return sendJSON(400, {
                        error: `Insufficient stock for ${medicine.name}`
                    });
                }

                items.push({
                    medicineId: medicine.id,
                    name: medicine.name,
                    price: medicine.price,
                    quantity,
                    subtotal: Number((medicine.price * quantity).toFixed(2))
                });
            }

            const quantities = new Map();
            for (const item of items) {
                quantities.set(
                    item.medicineId,
                    (quantities.get(item.medicineId) || 0) + item.quantity
                );
            }

            for (const [id, quantity] of quantities) {
                const medicine = medicines.find(m => m.id === id);
                if (medicine.stock < quantity) {
                    return sendJSON(400, {
                        error: `Insufficient stock for ${medicine.name}`
                    });
                }
            }

            for (const [id, quantity] of quantities) {
                medicines.find(m => m.id === id).stock -= quantity;
            }

            const bill = {
                id: nextBillId++,
                date: new Date().toISOString(),
                items,
                total: Number(items.reduce((sum, item) =>
                    sum + item.subtotal, 0).toFixed(2))
            };

            bills.push(bill);
            return sendJSON(201, { message: "Bill generated", bill });
        });
    }

    if (req.url === "/api/bills" && req.method === "GET") {
        return sendJSON(200, bills);
    }

    const billMatch = req.url.match(/^\/api\/bills\/(\d+)$/);
    if (billMatch && req.method === "GET") {
        const bill = bills.find(b => b.id === Number(billMatch[1]));
        return bill
            ? sendJSON(200, bill)
            : sendJSON(404, { error: "Bill not found" });
    }

    const requestedPath = req.url.split("?")[0];
    const relativePath = requestedPath === "/"
        ? "index.html"
        : requestedPath.replace(/^\/+/, "");

    const filePath = path.resolve(__dirname, "public", relativePath);
    const publicDir = path.resolve(__dirname, "public");

    if (!filePath.startsWith(publicDir + path.sep)) {
        res.writeHead(403);
        return res.end("Forbidden");
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            return res.end("Not found");
        }

        const ext = path.extname(filePath);
        const contentTypes = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "text/javascript; charset=utf-8"
        };

        res.writeHead(200, {
            "Content-Type": contentTypes[ext] || "application/octet-stream"
        });
        res.end(content);
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Pharmacy Management System ${VERSION} running on port ${PORT}`);
});
