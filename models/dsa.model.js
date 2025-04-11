const { model, Schema } = require("mongoose");

const dsaSchema = new Schema(
    {
        name: { type: String, trim: true },
        refferal_id: { type: String, trim: true, unique: true },
        aadhar: { type: String, trim: true },
        pan: { type: String, trim: true },
        link: { type: String, trim: true },
    },
    { timestamps: true },
);

module.exports = model("Dsa", dsaSchema);
