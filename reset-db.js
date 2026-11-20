// Возвращает базу к исходным данным: копирует db.initial.json в db.json
const fs = require('fs');
fs.copyFileSync(__dirname + '/db.initial.json', __dirname + '/db.json');
console.log('База восстановлена из db.initial.json');
