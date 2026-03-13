const bcrypt = require('bcrypt');
var express = require("express");
var router = express.Router();
let { checkLogin } = require('../utils/authHandler');
let { 
    userCreateValidator, 
    userUpdateValidator, 
    handleResultValidator 
} = require('../utils/validatorHandler');

let userController = require("../controllers/users");
// QUAN TRỌNG: Bạn quên import userModel, mình đã thêm vào giúp bạn
let userModel = require('../schemas/users');
// 1. GET ALL
router.get("/", checkLogin, async function (req, res, next) {
    let users = await userController.GetAllUser();
    res.send(users);
});

// 2. CHANGE PASSWORD (Bắt buộc đặt trên các route /:id)
// URL: PUT /api/v1/users/change-password
router.put("/change-password", checkLogin, async function (req, res, next) {
    try {
        const { oldPassword, newPassword } = req.body;

        // --- Validate đầu vào ---
        if (!oldPassword || !newPassword) {
            return res.status(400).send({ message: "Vui lòng nhập đầy đủ oldPassword và newPassword." });
        }

        if (newPassword.length < 6) {
            return res.status(400).send({ message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
        }

        if (oldPassword === newPassword) {
            return res.status(400).send({ message: "Mật khẩu mới không được trùng với mật khẩu cũ." });
        }

        // --- Lấy thông tin user từ token ---
        // Biến req.user có được là nhờ middleware checkLogin truyền sang
        let userId = req.user._id || req.user.id; 
        let user = await userModel.findById(userId);

        if (!user || user.isDeleted) {
            return res.status(404).send({ message: "Không tìm thấy người dùng." });
        }
        console.log("Mật khẩu trong DB đang lưu là: ", user.password);
        console.log("Mật khẩu cũ bạn gửi lên là: ", oldPassword);
        // --- Kiểm tra mật khẩu cũ ---
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
        return res.status(400).send({ message: "Mật khẩu cũ không chính xác." });
}

        // --- Cập nhật mật khẩu mới ---
        user.password = newPassword;
        await user.save();

        res.status(200).send({ message: "Đổi mật khẩu thành công!" });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// 3. GET BY ID
router.get("/:id", async function (req, res, next) {
    try {
        let result = await userModel.find({ _id: req.params.id, isDeleted: false });
        if (result.length > 0) {
            res.send(result);
        } else {
            res.status(404).send({ message: "id not found" });
        }
    } catch (error) {
        res.status(404).send({ message: "id not found" });
    }
});

// 4. CREATE
router.post("/", userCreateValidator, handleResultValidator, async function (req, res, next) {
    try {
        let newItem = userController.CreateAnUser(
            req.body.username,
            req.body.password, req.body.email, req.body.fullName,
            req.body.avatarUrl, req.body.role, req.body.status, req.body.loginCount
        );
        await newItem.save();

        let saved = await userModel.findById(newItem._id);
        res.send(saved);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// 5. UPDATE
router.put("/:id", userUpdateValidator, handleResultValidator, async function (req, res, next) {
    try {
        let id = req.params.id;
        let updatedItem = await userModel.findByIdAndUpdate(id, req.body, { new: true });

        if (!updatedItem) return res.status(404).send({ message: "id not found" });

        let populated = await userModel.findById(updatedItem._id);
        res.send(populated);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// 6. DELETE (Soft delete)
router.delete("/:id", async function (req, res, next) {
    try {
        let id = req.params.id;
        let updatedItem = await userModel.findByIdAndUpdate(
            id,
            { isDeleted: true },
            { new: true }
        );
        if (!updatedItem) {
            return res.status(404).send({ message: "id not found" });
        }
        res.send(updatedItem);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

module.exports = router;