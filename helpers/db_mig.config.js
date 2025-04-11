const migrationConfig = {
    Fibe: {
        lenderName: "name",
        loanId: "id",
        status: "status",
        loanAmount: "loanAmount",
        data: "res",
    },
    LendingKart: {
        lenderName: "name",
        loanId: "applicationId",
        status: "message",
        loanAmount: "req.loanAmount",
        data: "res",
    },
    Upwards: {
        lenderName: "name",
        loanId: "loan_data.loan_id",
        status: "status",
        loanAmount: "sent.salary",
        data: "res.meta",
    },
};

const lender = account.name;
const config = migrationConfig[lender];

const loanAppData = {
    user: user._id,
    phone: user.phone,
    lenderName: account[config.lenderName],
    loanId: account[config.loanId],
    status: account[config.status],
    loanAmount: account[config.loanAmount],
    data: account[config.data],
    createdAt: user.updatedAt,
};

const loanApp = new LoanApplication(loanAppData);
await loanApp.save();
