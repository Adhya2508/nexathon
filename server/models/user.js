const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

class User {
    constructor(db) {
        this.collection = db.collection('users');
    }

    async create(username, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = {
            username,
            password: hashedPassword,
            createdAt: new Date()
        };
        
        const result = await this.collection.insertOne(user);
        return { ...user, _id: result.insertedId };
    }

    async findByUsername(username) {
        return await this.collection.findOne({ username });
    }

    async validatePassword(user, password) {
        return await bcrypt.compare(password, user.password);
    }
}

module.exports = User;
