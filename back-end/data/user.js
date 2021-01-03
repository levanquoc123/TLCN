import bcrypt from "bcryptjs";

const users = [
   {
    name: "quoc",
    email: "quocle@gmail.com",
    password: bcrypt.hashSync("12345", 10),
  },
  {
    name: "quoc",
    email: "quoc@gmail.com",
    password: bcrypt.hashSync("12345", 10),
  },
];

export default users;
