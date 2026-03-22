const products = [
    { name: "Baby Girls Poly Silk Party Dress...", category: "clothing", model3D: null },
    { name: "Red bodycon", category: "clothing", model3D: "/api/products/file/1773480705127-reddress.glb" },
    { name: "Bodycon dress Kneelength", category: "clothing", model3D: "/api/products/file/1770056618072-dress1.glb" },
    { name: "short dress", category: "clothing", model3D: "/api/products/file/1772613706314-1nonfinal.glb" },
    { name: "gown", category: "clothing", model3D: "/api/products/file/1773480650517-reddress.glb" }
];

function detect(name, category, url) {
    const combinedCat = (category + " " + (url || "") + " " + (name || "")).toLowerCase();
    const isFull = combinedCat.includes("dress") || combinedCat.includes("frock") || combinedCat.includes("full") || combinedCat.includes("suit") || combinedCat.includes("gown") || combinedCat.includes("body");
    const isBottom = !isFull && (combinedCat.includes("pant") || combinedCat.includes("trouser") || combinedCat.includes("bottom") || combinedCat.includes("short") || combinedCat.includes("jeans") || combinedCat.includes("lower"));
    const isTop = !isFull && !isBottom && (combinedCat.includes("top") || combinedCat.includes("shirt") || combinedCat.includes("tshirt") || combinedCat.includes("jacket") || combinedCat.includes("upper") || combinedCat.includes("vest"));

    if (isFull) return "FullBody";
    if (isBottom) return "Bottom";
    if (isTop) return "Topwear";
    return "Unknown";
}

products.forEach(p => {
    console.log(`Product: ${p.name} | Detected: ${detect(p.name, p.category, p.model3D)}`);
});
