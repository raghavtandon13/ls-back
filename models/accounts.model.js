const { model, Schema } = require("mongoose");

const loanApplicationSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        phone: { type: String, required: true, trim: true },
        lenderName: { type: String, trim: true, required: true },
        loanId: { type: String, trim: true },
        status: { type: String, trim: true }, 
        message: { type: String, trim: true },
        url: { type: String, trim: true },
        loanAmount: { type: Number },
        data: { type: Schema.Types.Mixed },
        statusHistory: [
            {
                status: { type: String, trim: true },
                message: { type: String, trim: true },
                date: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true },
);

module.exports = model("LoanApplication", loanApplicationSchema);
