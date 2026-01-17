import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js"
import { getUserProfile, syncUser, updateProfile, getCurrentUser, followUser} from "../controllers/user.control.js"

const router = express.Router();

//public route
router.get("/profile/:username", getUserProfile);

//protected routes
router.post("/sync", protectRoute,syncUser);
router.post("/me", protectRoute,getCurrentUser);
router.put("/profile",protectRoute, updateProfile);
router.post("/follow/:targetUserId", protectRoute,followUser);


export default router;