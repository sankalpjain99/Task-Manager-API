const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const User = require("../models/user");
const auth = require("../middleware/auth");
const router = new express.Router();

// EndPoint to create User 
router.post('/users', async (req, res)=> {
    const user = new User(req.body);
    try {
        await user.save()
        const token = await user.generateAuthToken();
        res.status(201).send({user,token});
    } catch (e) {
        res.status(400).send(e);
    }
})



// EndPoint for User Login 
router.post('/users/login', async (req,res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password);
        const token = await user.generateAuthToken()
        res.send({user, token});
    } catch (e) {
        res.status(400).send();
    }
})



// Endpoint for User LogOut for one Session
router.post('/users/logout', auth, async (req,res) => {
    try {
        req.user.tokens = req.user.tokens.filter( (token) => {
            return token.token != req.token
        })
        await req.user.save();
        res.send()
    } catch (e) {
        res.status(500).send();
    }
})



// Endpoint for user logout for all sessions 
router.post('/users/logoutAll', auth, async (req,res) => {
    try {
        req.user.tokens = [];
        await req.user.save();
        res.send();
    } catch (e) {
        res.status(500).send();
    }
})



// EndPoint to read profile of logged in user. 
router.get('/users/me', auth, async (req,res) => {
    res.send(req.user);
})



// Endpoint to Update User Detail 
router.patch('/users/me', auth, async (req,res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'age', 'email', 'password'];
    const isValid = updates.every( (update)=>allowedUpdates.includes(update))
    if(!isValid)
        return res.status(400).send({Error: "Invalid Updates"});
    try {
        updates.forEach((update) => req.user[update]=req.body[update]);
        await req.user.save();
        res.send(req.user);
    } catch (e) {
        res.status(400).send(e);
    }
})



// Enpoint to delete a user 
router.delete('/users/me', auth, async (req,res) => {
    try {
        await req.user.remove();
        res.send(req.user);
    } catch (e) {
        res.status(500).send();
    }
})



// EndPoint to Upload Image 
const upload = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req,file,cb){
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/))
            return cb(new Error("Pls Upload an image"));
        cb(undefined, true);
    }
})
router.post('/users/me/avatar', auth, upload.single('avatar'), async (req,res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer();
    req.user.avatar = buffer;
    await req.user.save();
    res.send();
}, (error, req, res, next) => {
    res.status(400).send({error: error.message});
})



// EndPoint to Delete Image 
router.delete('/users/me/avatar', auth, async (req,res) => {
    req.user.avatar = undefined;
    await req.user.save();
    res.send();
})



// Route to fetch User Avatar for Client (Not a Endpoint)
router.get('/users/:id/avatar', async (req,res) => {
    try {
        const user = await User.findById(req.params.id);
        if(!user || !user.avatar)
            throw new Error();
        res.set('Content-Type', 'image/png');
        res.send(user.avatar);
    } catch (e) {
        res.status(400).send();
    }
})


module.exports = router;  