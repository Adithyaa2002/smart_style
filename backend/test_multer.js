const express = require('express');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

const storage = new GridFsStorage({
    url: process.env.MONGODB_URI,
    options: { }
});
const upload = multer({ storage });

app.put('/test/:id', upload.fields([{ name: 'image', maxCount: 1 }]), (req, res) => {
    console.log("Body:", req.body);
    console.log("Files:", req.files);
    res.json({ ok: true });
});

app.listen(5001, () => {
    console.log("Test server on 5001");
});
