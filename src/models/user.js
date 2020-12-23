const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Task = require("./task");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    }, 
    age: {
        type: Number,
        default: 0,
        validate(value){
            if(value < 0)
                throw new Error("Age must be greater than 0!");
        }
    },
    email:{
        type: String,
        required: true,
        unique: true,
        trim:true, 
        lowercase:true,
        validate(value){
            if(!validator.isEmail(value))
                throw new Error("Email is invalid!");
        }
    },
    password: {
        type: String,
        required: true,
        minLength: 7,
        trim: true,
        validate(value){
            if(value.includes("password"))
                throw new Error("password cannot contain the word 'Password'");
        }
    },
    tokens: [{
        token:{
            type: String,
            required:true
        }
    }],
    avatar: {
        type: Buffer
    }
}, {
    timestamps: true
})

userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
})

userSchema.methods.generateAuthToken = async function(){
    const user = this;
    const token = jwt.sign({_id:user._id.toString()}, process.env.JWT_SECRET);
    user.tokens = user.tokens.concat({token});
    await user.save();
    return token;
}

userSchema.methods.toJSON = function() {
    const user = this;
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.tokens;
    delete userObject.avatar;
    return userObject;
}

userSchema.statics.findByCredentials = async (email,password) => {
    const user = await User.findOne({email});
    if(!user)
        throw new Error("Unable to log in");
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch)
        throw new Error("Unable to log in");
    return user;
}

// Hash Password 
userSchema.pre('save', async function(next) {
    const user = this;
    if(user.isModified('password')){
        user.password = await bcrypt.hash(user.password, 8);
    }
    next();
})

// Delete User task when user is removed 
userSchema.pre('remove', async function(next) {
    const user = this;
    await Task.deleteMany({owner: user._id});
    next();
})

const User = mongoose.model('User', userSchema);
module.exports = User;