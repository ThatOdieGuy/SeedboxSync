import express = require('express');
const router = express.Router();

const downloader = require('./Downloader');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('status', { title: 'SeedboxSync Status Page' });
});

router.get('/ui', function (req, res, next) {
    res.json(downloader.status());
});

module.exports = router;
