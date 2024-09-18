const express = require('express');
const router = express.Router();
const zod = require("zod");
const bcrypt = require('bcrypt'); // Add bcrypt for password hashing
const jwt = require("jsonwebtoken");
const { User, Account } = require("../db");
const { JWT_SECRET } = require("../config");
const { authMiddleware } = require("../middleware");

const signupBody = zod.object({
    username: zod.string().email(),
    firstName: zod.string(),
    lastName: zod.string(),
    password: zod.string().min(6) // Ensure password has minimum length
});

router.post("/signup", async (req, res) => {
    const { success, error } = signupBody.safeParse(req.body);
    if (!success) {
        return res.status(400).json({ message: "Invalid input", error });
    }

    const existingUser = await User.findOne({ username: req.body.username });

    if (existingUser) {
        return res.status(400).json({ message: "Email already taken" });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const user = await User.create({
        username: req.body.username,
        password: hashedPassword,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
    });
    const userId = user._id;

    await Account.create({
        userId,
        balance: 1 + Math.random() * 10000
    });

    const token = jwt.sign({ userId }, JWT_SECRET);

    res.json({ message: "User created successfully", token });
});

const signinBody = zod.object({
    username: zod.string().email(),
    password: zod.string()
});

router.post("/signin", async (req, res) => {
    const { success, error } = signinBody.safeParse(req.body);
    if (!success) {
        return res.status(400).json({ message: "Invalid input", error });
    }

    const user = await User.findOne({ username: req.body.username });
    
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        const token = jwt.sign({ userId: user._id }, JWT_SECRET);
        res.json({ token });
    } else {
        res.status(401).json({ message: "Invalid credentials" });
    }
});

const updateBody = zod.object({
    password: zod.string().optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional(),
});

router.put("/", authMiddleware, async (req, res) => {
    const { success, error } = updateBody.safeParse(req.body);
    if (!success) {
        return res.status(400).json({ message: "Invalid input", error });
    }

    const updateData = { ...req.body };
    if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    await User.updateOne({ _id: req.userId }, updateData);

    res.json({ message: "Updated successfully" });
});

router.get("/bulk", async (req, res) => {
    const filter = req.query.filter || "";

    try {
        const users = await User.find({
            $or: [
                { firstName: { "$regex": filter, "$options": "i" } },
                { lastName: { "$regex": filter, "$options": "i" } }
            ]
        });

        res.json({
            user: users.map(user => ({
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                _id: user._id
            }))
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error });
    }
});

module.exports = router;
