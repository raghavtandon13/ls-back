// Imports
const router = require("express").Router();
const axios = require("axios");
const { createUser, addToUser, updateUser } = require("../../middlewares/createUser");

router.post("/create", async (req, res) => {
    let user;
    try {
        const data = req.body;
        user = await createUser(data.mobile);
        const response = await axios.post(
            "https://www.ramfincorp.com/loanapply/ramfincorp_api/lead_gen/api/v1/create_lead",
            data,
            {
                headers: {
                    Authorization:
                        "Basic cmFtZmluXzM2OGFjZDc1YTEyZjZjMDM1ZTdhOGYzMmFhMzczODQ0OjRlNDNiZjFiNzNjYmFkNmQwMDA3ZGNlMDc4ODkxOWJmMzVkM2M3Y2Y=",
                },
            },
        );

        await addToUser(user, {
            name: "RamFin",
            status: response.data.status === "1" ? "success" : "failure",
            msg: response.data.message,
            resp_date: new Date(),
        });
        res.json(response.data);
    } catch (error) {
        const errorMessage = error?.response?.data?.message || "An unexpected error occurred";
        if (errorMessage === "User already associated with us.") {
            await addToUser(user, { name: "RamFin", status: "Dedupe", resp_date: new Date() });
        }
        if (errorMessage === "Eligibility criteria failed.") {
            await addToUser(user, { name: "RamFin", status: "Ineligible", resp_date: new Date() });
        }
        console.error("Error:", errorMessage);
        res.status(200).json({ msg: errorMessage });
    }
});
router.post("/status", async (req, res) => {
    const data = req.body;
    const user = await createUser(data.mobile);
    try {
        const response = await axios.post(
            "https://www.ramfincorp.com/loanapply/ramfincorp_api/lead_gen/api/v1/check_lead_status",
            data,
            {
                headers: {
                    Authorization:
                        "Basic cmFtZmluXzFiMjBiMjJjMDVhYzUyNmMxMjBkOGNjZTRiOTg5MzBhOjBiNzIzMWE3YzA3NDZlZGIyMzMwOWQ0MWM3NTZiMGM1ZDA5OWRlNWY=",
                },
            },
        );
        await updateUser(user, {
            name: "RamFin",
            lead_status: response.data.lead_status,
            updated_status: response.data,
            status_date: new Date(),
            ...response.data,
        });
        res.json(response.data);
    } catch (error) {
        await updateUser(user, { name: "RamFin", updated_status: error.response.data, status_date: new Date() });
        const errorMessage = error?.response?.data?.message || "An unexpected error occurred";
        console.error("Error:", errorMessage);
        res.status(500).json({ msg: errorMessage });
    }
});

module.exports = router;
