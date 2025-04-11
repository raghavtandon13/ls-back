const multer = require("multer");

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, "uploads/");
            console.log("reached");
        },
        filename: (_req, file, cb) => {
            cb(null, Date.now() + "-" + file.originalname);
        },
    }),
});

module.exports = upload;
