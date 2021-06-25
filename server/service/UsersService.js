"use strict";

const bcrypt = require("bcrypt");
const db = require("../components/db");
const User = require("../components/user");

/**
 *
 * Functions to retrieve users from the database
 *
 */
exports.getUserByEmail = function (email) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM users WHERE email = ?";
        db.all(sql, [email], (err, rows) => {
            if (err) reject(err);
            else if (rows.length === 0) resolve(undefined);
            else {
                const user = createUser(rows[0]);
                resolve(user);
            }
        });
    });
};

exports.existsUserById = function (id) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)";
        db.all(sql, [id], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

exports.existsUserByEmail = function (email) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)";
        db.all(sql, [email], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

exports.getUserById = function (id) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM users WHERE id = ?";
        db.all(sql, [id], (err, rows) => {
            if (err) reject(err);
            else if (rows.length === 0) resolve(undefined);
            else {
                const user = createUser(rows[0]);
                resolve(user);
            }
        });
    });
};

exports.getUsers = function () {
    return new Promise((resolve, reject) => {
        const sql = "SELECT id, name, email FROM users";
        db.all(sql, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                let users = rows.map((row) => createUser(row));
                resolve(users);
            }
        });
    });
};

exports.getSingleUser = function (userId) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT id, name, email FROM users where id = ?";
        db.all(sql, [userId], (err, rows) => {
            if (err) reject(err);
            else if (rows.length === 0) resolve(undefined);
            else {
                const user = createUser(rows[0]);
                resolve(user);
            }
        });
    });
};

exports.getActiveTaskUser = function (userId) {
    return new Promise((resolve, reject) => {
        const sql =
            "SELECT t.id, t.description FROM tasks as t, assignments as a WHERE a.user = ? AND a.task = t.id AND a.active = 1";
        db.all(sql, [userId], (err, rows) => {
            if (err) reject(err);
            else if (rows.length === 0) resolve(undefined);
            else {
                resolve(rows[0]);
            }
        });
    });
};

/**
 * Utility functions
 */
const createUser = function (row) {
    const id = row.id;
    const name = row.name;
    const email = row.email;
    const hash = row.hash;
    return new User(id, name, email, hash);
};

exports.checkPassword = function (user, password) {
    console.log("hash of: " + password);
    let hash = bcrypt.hashSync(password, 10);
    console.log(hash);
    console.log("DONE");
    return bcrypt.compareSync(password, user.hash);
};
