const fs = require('fs');
const path = require('path');

const frontendSrcPath = path.join(__dirname, '../frontend/src');

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (let file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.js')) {
            let originalContent = fs.readFileSync(fullPath, 'utf8');
            let content = originalContent;

            // Scenario 1: Inside quotes (single or double) -> Convert to template literal
            // e.g. "http://localhost:5000/api/products" -> `http://${window.location.hostname}:5000/api/products`
            content = content.replace(/(['"])http:\/\/localhost:5000([^'"]*)\1/g, '`http://${window.location.hostname}:5000$2`');

            // Scenario 2: Inside an existing template literal
            // e.g. `http://localhost:5000/api/products/${id}` -> `http://${window.location.hostname}:5000/api/products/${id}`
            // OR `http://localhost:5000${product.image}` -> `http://${window.location.hostname}:5000${product.image}`
            content = content.replace(/http:\/\/localhost:5000/g, 'http://${window.location.hostname}:5000');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log(`✅ Fixed hardcoded localhost in: ${file}`);
            }
        }
    }
}

try {
    processDirectory(frontendSrcPath);
    console.log("🎉 Successfully updated all frontend URLs to be dynamic for multi-device support!");
} catch (e) {
    console.error("Error:", e);
}
