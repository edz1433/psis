const { spawnSync } = require("node:child_process");

const artisan = spawnSync(
    process.platform === "win32" ? "php.exe" : "php",
    ["artisan", "wayfinder:generate", ...process.argv.slice(2)],
    { stdio: "inherit" },
);

if (artisan.status !== 0) {
    process.exit(artisan.status ?? 1);
}

require("./prefix-wayfinder-routes.cjs");
