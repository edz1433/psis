const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const wayfinderPath = path.join(root, "resources/js/wayfinder/index.ts");
const generatedDirs = [
    path.join(root, "resources/js/routes"),
    path.join(root, "resources/js/actions"),
];

const baseHelper = `
const normalizeBasePath = (basePath: string | undefined) => {
    if (!basePath) {
        return "";
    }

    const normalized = basePath.trim().replace(/^\\/?/, "/").replace(/\\/+$/, "");

    return normalized === "/" ? "" : normalized;
};

const appBasePath = normalizeBasePath(import.meta.env.VITE_APP_BASE_PATH);
`;

const urlWithBaseHelper = `
export const urlWithBase = (url: string) => {
    if (!appBasePath || !url.startsWith("/")) {
        return url;
    }

    return \`\${appBasePath}\${url}\`;
};
`;

const walkTsFiles = (dir) => {
    if (!fs.existsSync(dir)) {
        return [];
    }

    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            return walkTsFiles(fullPath);
        }

        return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
    });
};

const writeIfChanged = (file, content) => {
    const current = fs.readFileSync(file, "utf8");

    if (current !== content) {
        fs.writeFileSync(file, content);
    }
};

if (fs.existsSync(wayfinderPath)) {
    let wayfinder = fs.readFileSync(wayfinderPath, "utf8");

    if (!wayfinder.includes("const normalizeBasePath =")) {
        wayfinder = wayfinder.replace(
            /let urlDefaults: \(\) => UrlDefaults = \(\) => \(\{\}\);\r?\n/,
            (match) => `${match}${baseHelper}`,
        );
    }

    if (!wayfinder.includes("export const urlWithBase =")) {
        wayfinder = wayfinder.replace(
            /export const setUrlDefaults =/,
            `${urlWithBaseHelper}\nexport const setUrlDefaults =`,
        );
    }

    writeIfChanged(wayfinderPath, wayfinder);
}

for (const file of generatedDirs.flatMap(walkTsFiles)) {
    let content = fs.readFileSync(file, "utf8");

    if (!content.includes("urlWithBase")) {
        content = content.replace(
            /import \{ queryParams,/,
            "import { queryParams, urlWithBase,",
        );
    }

    content = content.replace(
        /return ([A-Za-z_$][\w$]*)\.definition\.url \+ queryParams\(options\)/g,
        "return urlWithBase($1.definition.url) + queryParams(options)",
    );

    content = content.replace(
        /return ([A-Za-z_$][\w$]*)\.definition\.url(\r?\n\s*\.replace)/g,
        "return urlWithBase($1.definition.url$2",
    );

    content = content.replace(
        /\.replace\(\/\\\/\+\$\/, ''\) \+ queryParams\(options\)/g,
        ".replace(/\\/+\$/, '')) + queryParams(options)",
    );

    writeIfChanged(file, content);
}
