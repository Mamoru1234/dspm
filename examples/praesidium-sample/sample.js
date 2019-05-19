const bcrypt = require('bcrypt');

console.log(bcrypt.genSaltSync(10, 'a'));
