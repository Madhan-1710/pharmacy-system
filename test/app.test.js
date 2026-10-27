
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("package.json defines the start and test scripts", () => {
    const pkg = JSON.parse(
        fs.readFileSync(path.join(root, "package.json"), "utf8")
    );

    assert.equal(pkg.scripts.start, "node server.js");
    assert.equal(pkg.scripts.test, "node --test");
});

test("server and frontend files exist", () => {
    assert.ok(fs.existsSync(path.join(root, "server.js")));
    assert.ok(fs.existsSync(path.join(root, "public", "index.html")));
    assert.ok(fs.existsSync(path.join(root, "public", "style.css")));
});

test("application implements required API routes", () => {
    const server = fs.readFileSync(
        path.join(root, "server.js"), "utf8"
    );

    assert.match(server, /\/api\/health/);
    assert.match(server, /\/api\/version/);
    assert.match(server, /\/api\/medicines/);
    assert.match(server, /\/api\/bills/);
});
